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
    var baseurl = 'http://krasinform.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	//AnyBalance.requestGet(baseurl);
	
    var html = AnyBalance.requestPost(baseurl, {
		'id':'balance_tt',
		'nsc':prefs.login,
		'ok':' ок '
    }, g_headers); 

    if(/Неверный номер социальной карты/i.test(html)){
        throw new AnyBalance.Error('Не удалось получить информацию по карте '+prefs.login);
    }
	var result = {success: true};
	result.__tariff = prefs.login;
	getParam(html, result, 'total_base', /Количество базовых поездок на данный период(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'used_base', /Количество использованных базовых поездок(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'unused_base', /Количество не использованных базовых поездок(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'purchased_addon', /Количество приобретенных дополнительных поездок(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'used_addon', /Количество использованных дополнительных поездок(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /Всего использованных поездок(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}