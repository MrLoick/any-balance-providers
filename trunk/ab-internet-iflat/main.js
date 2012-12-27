﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для дагестанского интернет-провайдера Эрлайн.

Сайт оператора: http://dream-net.ru/
Личный кабинет: https://billing.dream-net.ru/cgi-bin/utm5/aaa5
*/

function parseTrafficGb(str){
  var val = parseBalance(str);
  if(isset(val))
      return Math.round(val/1024*100)/100;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('UTF-8');

    var baseurl = "https://billing.dream-net.ru/cgi-bin/utm5/";

    html = AnyBalance.requestPost(baseurl + 'aaa5', {
        login:prefs.login,
        password:prefs.password,
        cmd:'login'
    });

    //AnyBalance.trace(html);
    if(!/cmd=logout/i.test(html)){
        var error = getParam(html, null, null, /<BR[^>]*>\s*Ошибка:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс основного счета[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Основной счет[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'credit', /Кредит основного счета[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Блокировка[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var skey = getParam(html, null, null, /skey=([0-9a-f]{32})/i);

    html = AnyBalance.requestGet(baseurl + "user5?cmd=user_services_list&skey=" + skey);
    getParam(html, result, '__tariff', /Тарифный план(?:[\S\s]*?<td[^>]*>){7}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        var now = new Date();
        var begin = new Date(now.getFullYear(), now.getMonth(), 1);
        html = AnyBalance.requestGet(baseurl + "user5?s_hour=0&s_min=0&s_mday=1&s_mon=" + begin.getMonth() + "&s_year=" + begin.getFullYear() + 
                      "&e_hour=23&e_min=59&e_mday=" + now.getDate() + "&e_mon=" + now.getMonth() + "&e_year=" + now.getFullYear() + "&cmd=user_reports_traffic&skey=" + skey);

       getParam(html, result, 'trafficIn', /Входящий[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
       getParam(html, result, 'trafficOut', /Исходящий[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
    }
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

