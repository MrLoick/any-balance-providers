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

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://malina.ru/';

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');	

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
	
	try {
		var html = AnyBalance.requestGet (baseurl + 'msk/', g_headers);  // Запрос необходим для формирования cookie с регионом MSK
		
		html = AnyBalance.requestPost(baseurl + 'msk/pp/login/', {
			csrfmiddlewaretoken:getParam(html, null, null, /csrfmiddlewaretoken[^>]*value=["']([^"']+)["']/i),
			contact: prefs.login,
			password: prefs.password,
			'next': ''
		}, addHeaders({'X-Requested-With':'XMLHttpRequest'}));
		
		// Проверка на корректный вход
		if(!/"status"\s*:\s*"ok"/i.test(html)){
			// Проверка неправильной пары логин/пароль
			var error = getParam(html, null, null, /<div[^>]+id="alert"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Не удалось зайти на персональную страницу. Сайт изменен?');
		}	
	} catch(e) {
		
	}
	
	html = AnyBalance.requestGet (baseurl + 'pp/', g_headers);
	
    AnyBalance.trace ('It looks like we are in selfcare...');
	
    if (!/class="acc-points"/i.test(html))
        throw new AnyBalance.Error ('Невозможно найти информацию об аккаунте, свяжитесь с разработчиками!');
	
	AnyBalance.trace ('Parsing data...');
	
    var result = {success: true};
	
	getParam (html, result, 'balance', /"acc-points"(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam (html, result, 'accountNumber', /Номер счета(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam (html, result, 'customer', /Владелец счета(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam (html, result, 'status', /Статус счета(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam (html, result, 'availableForPay', /Доступно к обмену на товары и услуги(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
    // Накоплено основных баллов
    //getParam (html, result, 'mainPoints', /<th[^>]*>Владелец счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    // Накоплено EXPRESS-баллов
    //getParam (html, result, 'expressPoints', $table, 'tr:contains("EXPRESS") td', parseBalance);
    // Израсходовано баллов
    //getParam (html, result, 'gonePoints', $table, 'tr:contains("Израсходовано баллов") td', parseBalance);
    // Сгорело баллов
    //getParamFind (result, 'burnPoints', $table, 'tr:contains("Сгорело баллов") td', parseBalance);
	
    if (AnyBalance.isAvailable ('burnInThisMonth')) {
        html = AnyBalance.requestGet (baseurl + 'pp/forecast/');

        getParam(html, result, 'burnInThisMonth', /Баллов, которые сгорят в ближайшие месяцы([^<]+)/i, null, parseBalance);
    }
	
    AnyBalance.setResult (result);
}