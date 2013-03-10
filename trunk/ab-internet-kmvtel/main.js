﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плате для оператора интернет КМВТелеком

Operator site: http://www.kmvtelecom.ru
Личный кабинет: http://stat.kmvtelecom.ru
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
    var baseurl = "http://stat.kmvtelecom.ru/main.php";

    AnyBalance.setDefaultCharset('windows-1251'); 

    var html = AnyBalance.requestPost(baseurl, {
        UserName:prefs.login,
        PWDD:prefs.password
    }, addHeaders({Referer: baseurl})); 

    if(!/\?parm=exit/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<tr[^>]+bgcolor="#f0f1f3"[^>]*class="page"[^>]*>([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var trAcc = getParam(html, null, null, /<tr[^>]*>(?:[\s\S](?!<\/tr>))*?<a[^>]+href="\?parm=1&ParentID=\d+[\s\S]*?<\/tr>/i);
    if(!trAcc)
        throw new AnyBalance.Error('Не удалось найти ни одного счета!');

    var result = {success: true};

    getParam(trAcc, result, 'licschet', /<a[^>]+href="\?parm=1&ParentID=[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(trAcc, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(trAcc, result, 'paid', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(trAcc, result, 'credit', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    var accid = getParam(trAcc, null, null, /<a[^>]+href="\?parm=1&ParentID=(\d+)/i);

    if(true || AnyBalance.isAvailable('status', 'limit')){
        html = AnyBalance.requestGet(baseurl + '?parm=1&ParentID=' + accid);

        var re = new RegExp('<tr[^>]*>(?:[\\s\\S](?!</tr>))*?<a[^>]+href="\\?parm=4&cardid=\\d+[^>]*>' + prefs.login + '<[\\s\\S]*?</tr>', 'i');
        var tr = getParam(html, null, null, re);
        if(tr){
             getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
             getParam(tr, result, 'status', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
             getParam(tr, result, 'limit', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
             getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        }else{
             AnyBalance.trace('Не удалось найти карту ' + prefs.login);
        }
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
