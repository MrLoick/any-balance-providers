﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://cabinet.jde.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	
	html = AnyBalance.requestPost(baseurl, {
		ttn: prefs.login,
		pin: prefs.password,
	}, addHeaders({Referer: baseurl}));
	
	if (!/<h3>Информация по ТТН/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /<h3>Информация по ТТН[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'date_', /<h4>Статус грузоперевозки:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'place', /<h4>Статус грузоперевозки:(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /<h4>Статус грузоперевозки:(?:[^>]*>){5}([^<]+)/i, [/-/ig, '', replaceTagsAndSpaces], html_entity_decode);
	
	AnyBalance.setResult(result);
}