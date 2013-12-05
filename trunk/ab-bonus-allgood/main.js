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
	var baseurl = 'http://corp.ol-gud.ru/';
	AnyBalance.setOptions({forceCharset: 'koi8-r'});

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'personal.php', g_headers);

	html = AnyBalance.requestPost(baseurl + 'personal.php', {
		'action': 'login',
		login: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl + 'personal.php'}));

	if (!/<h4>Номер карты<\/h4>/i.test(html)) {
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'cardNum', /Номер карты(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Владелец&nbsp;карты(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Накопленная сумма покупок(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'discount', /Скидка по данной карте составляет(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'count', /Количество покупок(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'lastDate', /Дата последней покупки(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'status', /Статус карты(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'type', /Тип карты(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}