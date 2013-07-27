﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора МТС (Украина). Вход через PDA-версию.

Сайт оператора: http://mts.com.ua/
Личный кабинет: https://ihelper-prp.mts.com.ua/SelfCarePda/
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    if(prefs.phone && !/^\d+$/.test(prefs.phone)){
	throw new AnyBalance.Error('В качестве номера необходимо ввести 9 цифр номера, например, 501234567, или не вводить ничего, чтобы получить информацию по основному номеру.');
    }

    var baseurl = 'https://ihelper-prp.mts.com.ua/SelfCarePda/';

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + "Security.mvc/LogOn", {
    	username: prefs.login,
        password: prefs.password
    });
    
    if(prefs.phone && prefs.phone != prefs.login){
        html = AnyBalance.requestGet(baseurl + "MyPhoneNumbers.mvc");
        html = AnyBalance.requestGet(baseurl + "MyPhoneNumbers.mvc/Change?phoneNumber=380"+prefs.phone);
	if(!html)
		throw new AnyBalance.Error(prefs.phone + ": номер, возможно, неправильный или у вас нет к нему доступа"); 
	var error = getParam(html, null, null, /<ul class="operation-results-error">([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
	if(error)
		throw new AnyBalance.Error(prefs.phone + ": " + error); 
    }

    var regexp=/<ul class="operation-results-error"><li>(.*?)<\/li>/;
    if (res=regexp.exec(html)){
        throw new AnyBalance.Error(res[1]);
    }
    
    regexp=/<title>Произошла ошибка<\/title>/;
    if(regexp.exec(html)){
        throw new AnyBalance.Error("Интернет-помощник временно недоступен");
    }

    regexp=/<TITLE>The page cannot be found<\/TITLE>/;
    if(regexp.exec(html)){
        throw new AnyBalance.Error("Интернет-помощник отсутствует по адресу " + baseurl);
    }

    var error = getParam(html, null, null, /<h1>\s*Ошибка\s*<\/h1>\s*<p>(.*?)<\/p>/i);
    if(error){
        throw new AnyBalance.Error(error);
    }

    var result = {success: true};
    
    var min_all_60_isp;

    regexp = /Security\.mvc\/LogOff/;
    if(!regexp.test(html))
    	throw new AnyBalance.Error("Не удалось войти в мобильный интернет-помощник. Проблемы на сайте?");
    	AnyBalance.trace("It looks like we are in selfcare (found logOff)...");

    // Тарифный план
    regexp=/(?:Тарифн[ыи]й план|tariff plan):.*?>(.*?)</;
    if (res=regexp.exec(html)){
        result.__tariff=res[1];
    }

    // Баланс
    getParam (html, result, 'balance', /(?:Баланс|balance):.*?<strong>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    // Телефон
    getParam (html, result, 'phone', /(?:Ваш телефон|phone):.*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.trace("Fetching status...");

    html = AnyBalance.requestGet(baseurl + "Account.mvc/Status");

    AnyBalance.trace("Parsing status...");
    
    //Срок действия (баланса) номера (!!!пропал из интернет помощника)
    getParam (html, result, 'termin', /Термін життя балансу:([^<]*)/i, replaceTagsAndSpaces, parseDate);

    //Денежный бонусный счет.
    getParam (html, result, 'bonus_balance', /<li>Денежный бонусный счет:[^<]*осталось\s*([\d\.,]+)\s*грн. Срок действия до[^<]*<\/li>/i, replaceTagsAndSpaces, parseBalance);
    //Срок бонусного счета
    getParam (html, result, 'termin_bonus_balance', /<li>Денежный бонусный счет:[^<]*осталось\s*[^<]*\s*грн. Срок действия до ([^<]*)<\/li>/i, replaceTagsAndSpaces, parseDate);

    // Пакет бесплатных минут для внутрисетевых звонков
    sumParam (html, result, 'min_paket', /<li>Осталось ([\d\.,]+) бесплатных секунд\.? до[^<]*<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Срок Пакет бесплатных минут для внутрисетевых звонков
    sumParam (html, result, 'termin_min_paket', /<li>Осталось[^<]*бесплатных секунд\.? до ([^<]*)<\/li>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);

    // 70 минут в день для внутрисетевых звонков
    sumParam (html, result, 'min_net_70', /<li>70 минут в день для внутрисетевых звонков:[^<]*осталось\s*([\d\.,]+) бесплатных секунд<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    // 30 минут в день для внутрисетевых звонков
    sumParam (html, result, 'min_net_30', /<li>30 минут в день для внутрисетевых звонков:[^<]*осталось\s*([\d\.,]+) бесплатных секунд<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam (html, result, 'min_net_30', /<li>Осталось\s*([\d\.,]+)\s*минут<\/li>/ig, replaceTagsAndSpaces, parseBalance, function(str){return 60*parseFloat(str)}, aggregate_sum);
    
    // 30/33 минуты в день для внутрисетевых звонков во всех областях
    sumParam (html, result, 'min_net_all_33', /<li>33 минуты в день для внутрисетевых звонков во всех областях:[^<]*осталось\s*([\d\.,]+) бесплатных секунд[^<]*<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam (html, result, 'min_net_all_33', /<li>30 минут в день для внутрисетевых звонков во всех областях:[^<]*осталось\s*([\d\.,]+) бесплатных секунд[^<]*<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    // Срок дейcтвия 30/33 минуты в день для внутрисетевых звонков во всех областях
    sumParam (html, result, 'termin_min_net_all_33', /<li>33 минуты в день для внутрисетевых звонков во всех областях:[^<]*осталось\s*[\d\.,]+ бесплатных секунд. До ([^<]*)<\/li>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    sumParam (html, result, 'termin_min_net_all_33', /<li>30 минут в день для внутрисетевых звонков во всех областях:[^<]*осталось\s*[\d\.,]+ бесплатных секунд. До ([^<]*)<\/li>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);    

    // 100/200 минут в день на внутрисетевое направление (тут вообще путаница, в одном тарифе поменяли количество минут, добавили новую строку, а старую не убрали. Пришлось разделить счетчики…)
    // 100 минут в день на внутрисетевое направление
    sumParam (html, result, 'min_net_100', /<li>100 минут в день на внутрисетевое направление:[^<]*осталось\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam (html, result, 'min_net_100', /<li>200 минут в день на внутрисетевое направление:[^<]*осталось\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam (html, result, 'min_net_100', /<li>Осталось ([\d\.,]+) бесплатных секундДо [^<]*<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Срок действия 100/200 минут в день на внутрисетевое направление
    sumParam (html, result, 'termin_min_net_100', /<li>Осталось [\d\.,]+ бесплатных секундДо ([^<]*)<\/li>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    // 200 минут в день на внутрисетевое направление
    sumParam (html, result, 'min_net_200', /<li>залишилось\s*([\d\.,]+)\s*безкоштовних хвилин<\/li>/ig, replaceTagsAndSpaces, parseBalance, function(str){return 60*parseFloat(str)}, aggregate_sum);

    // 3000 региональных минут в сети
    sumParam (html, result, 'min_reg_3000', /<li>3000 региональных минут в сети:[^<]*осталось\s*([^<]*)/ig, replaceTagsAndSpaces, parseBalance, function(str){return 60*parseFloat(str)}, aggregate_sum);

    // Пакет СМС
    sumParam (html, result, 'sms_paket', /<li>100 бесплатных смс по Украине:[^<]*осталось\s*(\d+) смс. Срок действия до[^<]*<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Срок Пакета СМС
    sumParam (html, result, 'termin_sms_paket', /<li>100 бесплатных смс по Украине:[^<]*осталось\s*[^<]* смс. Срок действия до([^<]*)<\/li>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);

    // Пакет ММС
    sumParam (html, result, 'mms_paket', /<li>20 бесплатных MMS:[^<]*осталось:[^\d]*?(\d+) ммс. Срок действия до[^<]*<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Срок Пакета ММС
    sumParam (html, result, 'termin_mms_paket', /<li>20 бесплатных MMS:[^<]*осталось:[^\d]*?[^<]* ммс. Срок действия до([^<]*)<\/li>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);

    // Пакет интернета
    sumParam (html, result, 'traffic_paket_mb', /<li>20MB_GPRS_Internet:[^<]*осталось[^\d]*?(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes)). Срок действия до[^<]*<\/li>/ig, null, parseTraffic, aggregate_sum);
    //Срок Пакета интернета
    sumParam (html, result, 'termin_traffic_paket_mb', /<li>20MB_GPRS_Internet:[^<]*осталось[^\d]*?[^<]*. Срок действия до([^<]*)<\/li>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);

    // Интернет за копейку (новый) региональный и общенациональный
    // Проверен на пакете 1000 Мб за 10 грн. (если не будут распознаваться пакеты 1500 Мб за 15 грн и 2000 Мб за 20 грн, то добавить их распознавание в этот счетчик traffic_reg_kop_mb)
    sumParam (html, result, 'traffic_reg_kop_mb', /<li>GPRS_Internet:[^<]*осталось[^\d]*?(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes)). Срок действия до[^<]*<\/li>/ig, null, parseTraffic, aggregate_sum);
    //Срок Интернет за копейку (новый) региональный и общенациональный
    sumParam (html, result, 'termin_traffic_reg_kop_mb', /<li>GPRS_Internet:[^<]*осталось[^\d]*?[^<]*. Срок действия до([^<]*)<\/li>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);

    // Интернет за копейку (старый) и другие ежедневные пакеты
    sumParam (html, result, 'traffic_kop_mb', /<li>Осталось[^\d]*?(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes)).<\/li>/ig, null, parseTraffic, aggregate_sum);

    //К-во Кб загруженных по АПН hyper.net
    sumParam (html, result, 'traffic_hyper_mb', /<li>К-во Кб загруженных по АПН hyper.net:[^<]*Использовано[^\d]*?(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes))<\/li>/ig, null, parseTraffic, aggregate_sum);

    //К-во Кб загруженных по АПН opera
    sumParam (html, result, 'traffic_opera_mb', /<li>К-во Кб загруженных по АПН opera:[^<]*Использовано[^\d]*?(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes))<\/li>/ig, null, parseTraffic, aggregate_sum);

    // Интернет Max Energy (интересно у них единица измерения прописана)
    sumParam (html, result, 'traffic_maxenergy_mb', /<li>Осталось: (\d+,?\d* *(kб|bytes)).<\/li>/ig, null, parseTraffic, aggregate_sum);

    // СМС в сети МТС
    sumParam (html, result, 'sms_net', /<li>Осталось (\d+) смс.[^<]*<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Срок Срок действия СМС в сети МТС
    sumParam (html, result, 'termin_sms_net', /<li>Осталось \d+ смс. До ([^<]*)<\/li>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);

    // Минуты в сети МТС
    sumParam (html, result, 'min_net_maxenergy', /<li>Осталось ([\d\.,]+) бесплатных секунд.\s?<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    // 100 минут абонентам по Украине
    sumParam (html, result, 'min_all_100', /<li>Осталось ([\d\.,]+) секунд на все сети<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    // Минуты с услугой «Супер без пополнения» в сети МТС
    sumParam (html, result, 'min_net', /<li>Осталось ([\d\.,]+) бесплатных секунд<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    // 25 минут на другие сети
    sumParam (html, result, 'min_all_25', /<li>Осталось ([\d\.,]+) секунд на другие сети<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    //2500 минут в сети МТС
    sumParam (html, result, 'min_net_2500', /<li>Осталось ([\d\.,]+) секунд внутри сети<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    
    // Расход минут на Любимые Номера
    sumParam (html, result, 'min_ln', /<li>К-во бесплатных минут для звонков на ЛН:[^<]*Израсходовано\s*([\d\.,]+) сек.<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    // Бесплатные смс для отправки на номера в пределах Украины
    sumParam (html, result, 'sms_100', /<li>Бесплатные смс для отправки на номера в пределах Украины:[^<]*Осталось[^\d]*?(\d+) смс. Срок действия до[^<]*<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Срок Бесплатные смс для отправки на номера в пределах Украины
    sumParam (html, result, 'termin_sms_100', /<li>Бесплатные смс для отправки на номера в пределах Украины:[^<]*Осталось[^\d]*?[^<]* смс. Срок действия до([^<]*)<\/li>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);

    //60 минут на все сети за 5 коп
    if(AnyBalance.isAvailable('min_all_60', 'min_all_60_isp')){
        var min_all_60_isp = sumParam (html, null, null, /<li>К-во бесплатных минут для звонков по Украине:[^<]*Израсходовано[^\d]*?([\d\.,]+) сек.<\/li>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        if(typeof(min_all_60_isp) != 'undefined'){ //Только если этот параметр найден в html
            if(AnyBalance.isAvailable('min_all_60_isp'))
                result.min_all_60_isp = min_all_60_isp;
            if(AnyBalance.isAvailable('min_all_60'))
                result.min_all_60 = 3600 - min_all_60_isp;
        }
    }

    // Бесплатный интернет
    sumParam (html, result, 'traffic_free_mb', /<li>К-во Кб на GPRS-Internet:[^<]*Осталось[^\d]*?(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes)).<\/li>/ig, null, parseTraffic, aggregate_sum);

    // Лицевой счет
    getParam (html, result, 'license', /№ (.*?):/, replaceTagsAndSpaces, html_entity_decode);

    // Расход за этот месяц
    getParam (html, result, 'usedinthismonth', /Витрачено по номеру[^<]*<strong>([\s\S]*?)<\/strong>[^<]*грн/i, replaceTagsAndSpaces, parseBalance);

    
    // Израсходовано: 3 смс
    sumParam (html, result, 'sms_used', /<li>Израсходовано:\s*(\d+)\s*(?:sms|смс)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    if (AnyBalance.isAvailable ('usedinprevmonth')) {

        AnyBalance.trace("Fetching history...");

        html = AnyBalance.requestPost (baseurl + 'Account.mvc/History', {periodIndex: 0});

        AnyBalance.trace("Parsing history...");

        // Расход за прошлый месяц
        getParam (html, result, 'usedinprevmonth', /За период израсходовано .*?([\d\.,]+)/i, replaceTagsAndSpaces, parseBalance);
    }


    if (AnyBalance.isAvailable ('monthlypay')) {

        AnyBalance.trace("Fetching traffic info...");

        html = AnyBalance.requestGet (baseurl + 'TariffChange.mvc');

        AnyBalance.trace("Parsing traffic info...");

        // Ежемесячная плата
        getParam (html, result, 'monthlypay', /Абонентська плата:[^\d]*?([\d\.,]+)/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);

}
