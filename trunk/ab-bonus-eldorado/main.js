﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по бонусной карте Eldorado

Сайт оператора: http://eldorado.ru/
Личный кабинет: http://www.club.eldorado.ru/enter.php
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

function parseBalance(text){
    var _text = text.replace(/\s+/, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    var prefs = AnyBalance.getPreferences();
    
    var baseurl = "http://club.eldorado.ru/enter.php";

    var headers = {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11',
    };

    var html = AnyBalance.requestGet(baseurl, headers); //Установим сессию

    headers.Referer = baseurl;

    html = AnyBalance.requestPost(baseurl, {
        pan: prefs.login,
        pin: prefs.password,
        x: 49,
        y: 12,
        action: 'save'
    }, headers);

    var error = getParam(html, null, null, /<div[^>]*class=['"]red['"][^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    if(!getParam(html, null, null, /(personal_silver_top)/i))
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Проверьте, что вам удаётся зайти в него из браузера с указанными номером карты и ПИНом.");

    var result = {success: true};

    getParam(html, result, 'cardnum', /Номер карты:[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'level', /Статус участия:[\s\S]*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'type', /Тип участия:[\s\S]*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Статус карты:[\s\S]*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'userName', /ФИО владельца:[\s\S]*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Статус карты:[\s\S]*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /Телефон:[\s\S]*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Активная сумма:[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'reserv', /Резервная сумма:[\s\S]*?>([^<]*)/i, replaceFloat, parseBalance);
    getParam(html, result, '__tariff', /Статус участия:[\s\S]*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

