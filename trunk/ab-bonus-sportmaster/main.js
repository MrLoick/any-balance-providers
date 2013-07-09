﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по бонусной карте Спортмастер

Сайт оператора: http://sportmaster.ru/
Личный кабинет: http://www.sportmaster.ru/personal/bonus.php
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    if(prefs.password){
        AnyBalance.trace('Введен пароль - получаем данные из личного кабинета');

        var baseurl = "http://www.sportmaster.ru/personal/bonus.php?login=yes";
        var html = AnyBalance.requestPost(baseurl, {
            AUTH_FORM:'Y',
            TYPE:'AUTH',
            backurl:'/personal/bonus.php',
            USER_LOGIN:prefs.login,
            USER_PASSWORD:prefs.password
        });
        
        var error = getParam(html, null, null, /<font[^>]*class=['"]errortext['"][^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        var result = {success: true};
        
        getParam(html, result, 'cardnum', /Номер бонусной карты:[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, '__tariff', /Номер бонусной карты:[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'balance', /Доступно средств:[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    }else{
        AnyBalance.trace('Пароль не введен - получаем данные по номеру карты');

        var baseurl = "http://www.sportmaster.ru/club-program/";
        var types = {
            '300': 'Синяя карта',
            '301': 'Серебряная карта',
            '302': 'Золотая карта',
        };
        var status;

        for(var type in types){
            if(types[prefs.type] && type != prefs.type)
                continue; //Если у нас задан тип, то получаем сразу его

            var html = AnyBalance.requestPost(baseurl, {
                card_type:type,
                card_id:prefs.login,
                check_bonus:''
            });
            status = getParam(html, null, null, /card_bonus\s*=\s*'([^']*)/, replaceSlashes);
            if(/Доступно средств:/i.test(status))
                break;
        }

        if(!/Доступно средств:([^']*)/i.test(html)){
            if(status)
                throw new AnyBalance.Error(status);
            throw new AnyBalance.Error("Не удалось получить баланс. Неверный номер карты или сайт изменен?");
        }

        var result = {success: true};
        
        result.__tariff = types[type];
        if(AnyBalance.isAvailable('cardnum'))
            result.cardnum = prefs.login;
        getParam(html, result, 'balance', /Доступно средств:([^']*)/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
