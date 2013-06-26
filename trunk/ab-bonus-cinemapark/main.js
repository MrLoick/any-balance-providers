﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
'Accept-Encoding': 'gzip, deflate',
'Connection':'keep-alive',
};

function main(){
    var prefs = AnyBalance.getPreferences();
	// Необходимо для не английских и спец символов
	var encodedPass = encodeURIComponent(prefs.password)

    var url = 'https://cinemapark.ru/api/login/?loyalty_card_number='+ prefs.login +'&loyalty_card_codeword=' + encodedPass + '&is_persistent=0&_=';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(url);
	// надо достать куку
	var cookie = getParam(html, null, null, /<session_cookie>([\s\S]*?)<\//i, null, html_entity_decode);
	if(!cookie)
		throw new AnyBalance.Error('Не удалось найти токен авторизации, сайт либо недоступен, либо изменен');
	// ставим куку руками
	AnyBalance.setCookie('cinemapark.ru', 'session_cookie', cookie, null);
	// инфрмация по карте
	html = AnyBalance.requestGet('https://cinemapark.ru/card_info/');
	
    if(!/logout\(\)/i.test(html))
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте правильность ввода логина и пароля!');

    var result = {success: true};
    
	getParam(html, result, 'status', /Состояние[\s\S]*?>[\s\S]*?>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баллов[\s\S]*?>[\s\S]*?>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
