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
	var baseurl = 'https://pc.europf.com/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html /*= AnyBalance.requestGet(baseurl + 'europf-login-lk', g_headers)*/;

	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ 'ipension/code.php');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	html = AnyBalance.requestPost(baseurl + 'ipension/fiz/login.php', {
		'type':'fiz',
		'kod':prefs.login,
		'pass':prefs.password,
		'code':captchaa,
		'LOGIN':'Войти'
	}, addHeaders({Referer: baseurl + 'europf-login-lk'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Ошибка!([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'acc_num', /Номер счета(?:[\s\S]*?<td[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Состояние счета(?:[\s\S]*?<td[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}