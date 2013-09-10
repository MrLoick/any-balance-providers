﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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
    var baseurl = 'https://parkingcab.mos.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
    html = AnyBalance.requestPost(baseurl + 'local/MPGU.php', {
		module:'',
		login:'Войти в личный кабинет',
		_reqNo:0		
	}, g_headers);
	
	AnyBalance.trace(html);
	html = AnyBalance.requestPost('https://login.mos.ru/eaidit/eaiditweb/outerlogin.do', {
        username:prefs.login,
        password:prefs.password,
    }, addHeaders({Referer: 'https://login.mos.ru/eaidit/eaiditweb/openouterlogin.do'})); 
	
	AnyBalance.trace(html);
    if(!/logout/i.test(html)){
        /*var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);*/
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
    getParam(html, result, 'balance', /Текущий баланс[^>]*>[^>]*>[^>]*>[^>]*>[^>]*balance">([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	
	getParam(html, result, 'fio', /Имя(?:\s|&nbsp;)*абонента:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /Номер:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    
    getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}