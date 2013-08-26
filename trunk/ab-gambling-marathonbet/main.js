﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о балансе для букмекерской фирмы Марафон 

Operator site: https://www.marathonbet.com
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8'); 
    var baseurl = "https://www.marathonbet.com/";

    if (!/^(?:[0-9]{6,7}|[a-z0-9\-_\.\%\+]+@([a-z0-9\-_]+\.)+[a-z]{2,4})$/i.test(prefs.login)) {
        throw new AnyBalance.Error("В логине должно быть от 6 до 7 цифр. Можно также ввести Ваш электронный адрес, указанный при регистрации.");        
    }
    if (!/^.{6,}$/i.test(prefs.password)) {
        throw new AnyBalance.Error("В пароле должно быть от 6 до 100 символов.");        
    }
    var html = AnyBalance.requestPost(baseurl + 'ru/login.htm', {
        login:prefs.login, 
        login_password:prefs.password
    }, addHeaders({Referer: baseurl + 'ru/home.htm'})); 

    var errorHtm = AnyBalance.requestGet(baseurl + 'ru/pagemessages.htm', g_headers);

    if(/showMessage\(\"errorMessage\"/i.test(errorHtm)){
        var error = getParam(errorHtm, null, null, /,\s*\"([\s\S]*?)\"\)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]+class="auth"[^>]*>[\s\S]*?,\s*([\s\S]*?)!/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /id='balance'[^>]*>([\s\S]*?)</i, [/,/g, '', replaceTagsAndSpaces], parseBalance);
    getParam(html, result, ['currency', 'balance'], /id='balance'[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, parseMyCurrency);

    if(AnyBalance.isAvailable('ns'/*, 'out'*/)){
        html = AnyBalance.requestPost(baseurl + 'ru/myaccount/getunsettledbetssumm.htm', '', g_headers);
        //Нерассчитанные ставки
        getParam(html, result, 'ns', /"ubs":"([\s\S]*?)"/i, null, parseBalance);
        //Запрошено на выплату
        //getParam(html, result, 'out', /<td[^>]+class="value"(?:[\s\S]*?<span[^>]+class=['"]balance-value[^>]*>|[\s\S]*?<b>){3}([\s\S]*?)</i, [/,/g, '', replaceTagsAndSpaces], parseBalance);
    }

    AnyBalance.setResult(result);
}

function parseMyCurrency(text){
    var val = getParam(html_entity_decode(text), null, null, null, [/\s+/g, '', /[\d\.,\-]/g, '']);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}
