﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://wk.rcurala.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + 'login.aspx', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if(name == 'Login1$UserName')
			return prefs.login;
		else if(name == 'Login1$Password')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login.aspx', params, addHeaders({Referer: baseurl + 'login.aspx'}));
	
	if(!/Выход/i.test(html)) {
		var error = getParam(html, null, null, /<td[^>]*color:Red[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error && /Неудачная попытка входа/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	getParam(html, result, 'fio', /ФИО(?:[^>]*>){1,4}[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /Лицевой счет(?:[^>]*>){1,4}[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	html = AnyBalance.requestGet(baseurl + 'FL/historyOfPayment.aspx', g_headers);
	
	var table = getParam(html, null, null, /(<table[^>]*id="ctl00_ContentPlaceHolder1_gvSel"[\s\S]*?<\/table>)/i);
	checkEmpty(table, 'Нет данных о последних платежах за текущий период', true);
	
	getParam(table, result, 'balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}