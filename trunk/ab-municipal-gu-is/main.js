﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает сумму счета за последний месяц в ЕИРЦ с сайта http://www.gu-is.ru/pay

Для пользования провайдером требуется знать только код плательщика, который можно прочитать на квитанции: 

Личный кабинет: http://www.gu-is.ru/pay
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var matches = regexp.exec (html), value;
	if (matches) {
		value = matches[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
	}
   return value
}

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://gu-is.acquiropay.ru/site/payform";

    var dt = new Date();
    try{
        findBill(baseurl, dt);
    }catch(e){
        AnyBalance.trace('Запрос за период ' + (dt.getMonth()+1) + '-' + dt.getFullYear() + ' вернул ошибку: ' + e.message + '\nПробуем предыдущий период...');
        dt = new Date(dt.getFullYear(), dt.getMonth()-1, 1);
        findBill(baseurl, dt);
    }
}

function findBill(baseurl, dt){
    var prefs = AnyBalance.getPreferences();

    var month = '' + (dt.getMonth() + 1);
    if(month.length < 2) month = '0' + month;

    var html = AnyBalance.requestPost(baseurl, {
        account:prefs.login,
        period: month + '-' + dt.getFullYear(),
        paymethod:1,
        yt0:'Далее'
    });


    var result = {success: true};

    if(!/период:\s*(?:<[^>]*>\s*)*<b[^>]*>([^<]*)/i.test(html)){
        if(AnyBalance.isAvailable('period'))
            result.period = month + '-' + dt.getFullYear();
        result.__tariff = prefs.login + ', ' + month + '-' + dt.getFullYear();

        var error = getParam(html, null, null, /<div[^>]+class="post-body"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error){
            //Счет может быть уже просто оплачен...
            if(/нет неоплаченных счетов/i.test(error)){
                //Если счет просто оплачен, то не будем возвращать ошибку
                if(AnyBalance.isAvailable('status'))
                    result.status = error;
                AnyBalance.setResult(result);
                return; //Всё в порядке, просто нет оплаченных счетов
            }
            throw new AnyBalance.Error(error);
        }
        throw new AnyBalance.Error('Не удаётся найти последний счет. Сайт изменен?');
    }

    getParam(html, result, '__tariff', /период:\s*(?:<[^>]*>\s*)*<b[^>]*>([^<]*)/i, replaceTagsAndSpaces, function(str){return prefs.login + ', ' + str});
    //Если у нас пара документов
    getParam(html, result, 'balance', /сумма в документе:\s*([\-\d\.]*)\s*без страх/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance_strah', /сумма в документе:.*?([\-\d\.]*)\s*со? страх/i, replaceTagsAndSpaces, parseBalance);
    //Если у нас один документ
    getParam(html, result, 'balance', /<span[^>]+class="sum"[^>]*>([^<]*)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance_strah', /<span[^>]+class="sum_with_insurance"[^>]*>([^<]*)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'period', /период:\s*(?:<[^>]*>\s*)*<b[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    if(AnyBalance.isAvailable('status'))
        result.status = 'OK';
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

