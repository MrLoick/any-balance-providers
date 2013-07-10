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
    var baseurl = "https://my.domonet.ua/";
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestPost(baseurl, {
        UserName:prefs.login,
        Password:prefs.password,
        login:'Ok'
    }, addHeaders({Referer: baseurl})); 
	
	var result = {success: true};
	// Иногда в кабинете всплывают уведомления, чтобы их пропустить запросим страницу кабинета еще разок
    if(/Продовжити/i.test(html))
	{
		getParam(html, result, 'balance', /You've got([\s\S]*?)on your account/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'days', /Only([\s\S]*?)day\(s\)/i, replaceTagsAndSpaces, parseBalance);
		/*html = AnyBalance.requestPost(baseurl, 
		{
			UserName:prefs.login,
			Password:prefs.password,
			poll_answered:'Продовжити'
		}, addHeaders({Referer: baseurl})); */
    }
	else if(/\/logout/i.test(html))
	{
		getParam(html, result, 'balance', /(?:Ваш баланс становить|Ваш баланс составляет|Your balance is)([\s\S]*?)(?:грн|uah)/i, replaceTagsAndSpaces, parseBalance);
	}
	else
	{
	    var error = getParam(html, null, null, /<div class="error">([\s\S]*?).<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    AnyBalance.setResult(result);
}