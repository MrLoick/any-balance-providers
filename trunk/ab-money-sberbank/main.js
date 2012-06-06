﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт Сбербанка, используя систему Сбербанк-онлайн.

Сайт оператора: http://sbrf.ru/
Личный кабинет: https://esk.sbrf.ru/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /-?\d[\d\s.,]*(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://esk.sbrf.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    if(!prefs.login)
        throw new AnyBalance.Error("Пожалуйста, укажите логин для входа в Сбербанк-Онлайн!");
    if(!prefs.password)
        throw new AnyBalance.Error("Пожалуйста, укажите пароль для входа в Сбербанк-Онлайн!");
    if(prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits))
        throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего");
      
    var html = AnyBalance.requestGet(baseurl + 'esClient/_logon/LogonContent.aspx');
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);

    html = AnyBalance.requestPost(baseurl + 'esClient/_logon/LogonContent.aspx', {
      __EVENTTARGET:'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$btnLogin',
      __EVENTARGUMENT:'',
      __VIEWSTATE:viewstate,
      'ctl00$ctl00$tbSbmt':'',
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$tbLogin':prefs.login,
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$tbPassword':'********',
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$hPw':prefs.password,
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$tbAlias':'',
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$tbAliasAgain':'',
      'ctl00$ctl00$BaseContentPlaceHolder$ctl01$ContentUpdatePanelParam':'',
      'ctl00$ctl00$BaseContentPlaceHolder$ctl01$ctl04$userManual2Region$ddlRegions':''
    });

    var error = getParam(html, null, null, /в связи с ошибкой в работе системы[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var page = getParam(html, null, null, /top\.location\.href = '(https:[^'"]*?AuthToken=[^'"]*)/i);
    if(!page)
        throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по картам. Пожалуйста, обратитесь к автору провайдера для исправления ситуации.");
    
    if(/esk.zubsb.ru/.test(page)) //Пока только это поддерживается
        doOldAccount(page);
    else if(/online.sberbank.ru\/PhizIC/.test(page))
        doNewAccountPhysic(page);
    else
        throw new AnyBalance.Error("К сожалению, ваш вариант Сбербанка-онлайн пока не поддерживается. Пожалуйста, обратитесь к автору провайдера для исправления ситуации.");

}

function doOldAccount(page){
    var html = AnyBalance.requestGet(page);
    var prefs = AnyBalance.getPreferences();

    var newpage = getParam(html, null, null, /"redirectForm"\s\S*?action="([^"]*)"/i);
    var submitparam = getParam(html, null, null, /<input type="hidden"[^>]*name="([^"]*)"/i);
    var params = {};
    params[submitparam] = '';
    html = AnyBalance.requestPost('https://esk.zubsb.ru/pay/sbrf/Preload'+newpage, params);
    
    var lastdigits = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
    
    var baseFind = 'Мои банковские карты[\\s\\S]*?<a\\s[^>]*href="[^"]{6,}"[^>]*>[^<]*?';
    var reCard = new RegExp('Мои банковские карты[\\s\\S]*?<a\\s[^>]*href="([^"]{6,})"[^>]*>[^<]*?\\*\\*\\*' + lastdigits, 'i');
    var reCardNumber = new RegExp(baseFind + '(\\d+\\*\\*\\*' + lastdigits + ')', 'i');
    var reOwner = new RegExp(baseFind + '\\*\\*\\*' + lastdigits + '[\\s\\S]*?Владелец счета:([^<]*)', 'i');
    var reEngOwner = new RegExp(baseFind + '\\*\\*\\*' + lastdigits + '[\\s\\S]*?Клиент:([^<]*)', 'i');
    var reBalanceContainer = new RegExp(baseFind + '\\*\\*\\*' + lastdigits + '[\\s\\S]*?<td[^>]*>([\\S\\s]*?)<\\/td>', 'i');
    var cardref = getParam(html, null, null, reCard);
    if(!cardref)
        if(prefs.lastdigits)
          throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по карте с последними цифрами " + prefs.lastdigits);
        else
          throw new AnyBalance.Error("Не удаётся найти ни одной карты");
        
    var result = {success: true};
    getParam(html, result, 'cardNumber', reCardNumber);
    getParam(html, result, 'userName', reOwner, replaceTagsAndSpaces);
    getParam(html, result, 'cardName', reEngOwner, replaceTagsAndSpaces);
    getParam(html, result, 'balance', reBalanceContainer, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', reBalanceContainer, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, '__tariff', reCardNumber, replaceTagsAndSpaces);
    
    if(AnyBalance.isAvailable('till','status','cash','debt','minpay','electrocash','maxcredit')){
      html = AnyBalance.requestGet('https://esk.zubsb.ru/pay/sbrf/'+cardref);
      getParam(html, result, 'till', /Срок действия:[\s\S]*?<td[^>]*>.*?по ([^<]*)/i, replaceTagsAndSpaces);
      getParam(html, result, 'status', /Статус:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
      getParam(html, result, 'cash', /Доступно наличных[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'debt', /Сумма задолженности[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'minpay', /Сумма минимального платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'electrocash', /Доступно для покупок[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'maxcredit', /Лимит кредита[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}

function doNewAccountPhysic(page){
    var html = AnyBalance.requestGet(page);
    if(/confirmTitle/.test(html))
          throw new AnyBalance.Error("Ваш личный кабинет требует одноразовых паролей для входа. Пожалуйста, отмените в настройках кабинета требование одноразовых паролей при входе. Это безопасно: для совершения денежных операций требование одноразового пароля всё равно останется.");

    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://online.sberbank.ru";

    html = AnyBalance.requestGet(baseurl + '/PhizIC/private/cards/list.do');

    var lastdigits = prefs.lastdigits ? prefs.lastdigits.replace(/(\d)/g, '$1\\s*') : '(?:\\d\\s*){3}\\d';
    
    var reCardId = new RegExp('<a\\s+href="([^"]*id=\\d+)"\\s*class="accountNumber\\b[^"]*">[^<]*' + lastdigits + '<');
    var cardHref = getParam(html, null, null, reCardId);
    
    if(!cardHref)
        if(prefs.lastdigits)
          throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по карте с последними цифрами " + prefs.lastdigits);
        else
          throw new AnyBalance.Error("Не удаётся найти ни одной карты");
      
    var cardId = getParam(html, null, null, /id=(\d+)/i);
      
    var baseFind = '<a\\s+href="[^"]*"\\s*class="accountNumber\\b[^"]*">[^<]*' + lastdigits + '<';
    var reCardNumber = new RegExp('<a\\s+href="[^"]*"\\s*class="accountNumber\\b[^"]*">\s*([^<]*' + lastdigits + ')<', 'i');
    var reBalance = new RegExp(baseFind + '[\\s\\S]*?<span class="data[^>]*>([^<]*)', 'i');
    
    var result = {success: true};
    getParam(html, result, 'balance', reBalance, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cardNumber', reCardNumber, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', reCardNumber, replaceTagsAndSpaces);
    getParam(html, result, 'currency', reBalance, replaceTagsAndSpaces, parseCurrency);
    
    if(AnyBalance.isAvailable('userName', 'till', 'cash', 'electrocash')){
        html = AnyBalance.requestGet(baseurl + '/PhizIC/private/cards/detail.do?id=' + cardId);
        getParam(html, result, 'userName', /ФИО Держателя карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces);
        getParam(html, result, 'till', /Срок действия до:[\s\S]*?(\d\d\/\d{4})/, replaceTagsAndSpaces);
        getParam(html, result, 'cash', /для снятия наличных:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'electrocash', /для покупок:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

