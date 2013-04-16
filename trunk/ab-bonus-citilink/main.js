﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает бонусы для федерального электронного дискаунтера citilink 

Operator site: http://www.citilink.ru
Личный кабинет: http://www.citilink.ru/profile/
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
    var baseurl = "http://www.citilink.ru/";

    AnyBalance.setDefaultCharset('windows-1251'); 

    var html = AnyBalance.requestPost(baseurl + 'login/', {
	fromPage:'',
	login:prefs.login,
	password:prefs.password,
	passOk:false
    }, addHeaders({Referer: baseurl})); 

    if(!/\/logout\//i.test(html)){
        var error = getParam(html, null, null, /<p[^>]+class="red"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'profile/', g_headers);

    if(!/<h2[^>]*>Закрома/i.test(html))
        throw new AnyBalance.Error('Для пользования этим провайдером прикрепите бонусную карту к личному кабинету.');

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'balance', /<h2[^>]*>Закрома<\/h2>(?:[\s\S](?!<\/td>))*?<p[^>]*>\s*(\d+)\s*бонус/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'new', /ожидают начисления([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'num', /(\d+)\s*товар\S* на сумму/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'sum', /\d+\s*товар\S* на сумму([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Статус &laquo;([\s\S]*?)&raquo;? в следующем квартале будет сохранен/i, replaceTagsAndSpaces, html_entity_decode);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
