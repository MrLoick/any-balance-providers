﻿/**
Провайдер Домашний телеком (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для интернет провайдера Домашний телеком (http://www.domtele.com/)

Operator site: http://www.domtele.com
Личный кабинет: http://my.domtele.com
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var error;
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://my.domtele.com/";

    AnyBalance.setDefaultCharset('windows-1251'); 

    AnyBalance.requestGet(baseurl, g_headers);
    
    var html = requestPostMultipart(baseurl, {
        l_posted: 1,
        login:prefs.login,
        password:prefs.password,
        submit: "Âîéòè"
    }, addHeaders()); 


    if (/<form[^>]*>[\s\S]*<\/form>\s*<div[^>]*>\s*<div[^>]*>/i.test(html)) {
        error = getParam(html, null, null, /<form[^>]*>[\s\S]*<\/form>\s*<div[^>]*><div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
    }

    html = AnyBalance.requestPost(baseurl, {
        where_to: 1
    }, addHeaders({Referer: baseurl})); 
    
    var result = {success: true};
    getParam(html, result, 'fio', /Абонент:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'number', /Номер договора:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'account', /Лицевой Счет:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
