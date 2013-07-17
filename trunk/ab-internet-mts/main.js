/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    Connection:'keep-alive',
	'X-Requested-With':'XMLHttpRequest',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

var regions = {
   moscow: getMoscow,
   rostov: getRostov,
   nsk: getNsk,
   prm: getPrm,
   ekt: getPrm,
   krv: getKrv,
   nnov: getNnov,
   sdv: getSdv,
   vlgd: getVologda,
   izh: getIzhevsk,
   pnz: getPnz,
   kms: getKomsomolsk,
   tula: getTula,
   bal: getBalakovo,
   uln: getUln,
   nor: getNorilsk,
   mag: getMagnit,
   miass: getMiass,
   kurgan: getKurgan,
   barnaul: getBarnaul,
   belgorod: getBelgorod,
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var region = prefs.region;
    if(!region || !regions[region])
      region = 'moscow';

    var func = regions[region];
    AnyBalance.trace('Регион: ' + region);
    func();
}

function getRostov(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://lk.ug.mts.ru/';

    // Заходим на главную страницу
    var info = AnyBalance.requestPost(baseurl + "cgi-bin/billing_auth.pl", {
        'new': 1,
    	login: prefs.login,
        password: prefs.password
    });

    var error = getParam(info, null, null, /"auth_error"[\s\S]*?"([^"]*)"/i);
    if(error)
        throw new AnyBalance.Error(error);

    var html = AnyBalance.requestGet(baseurl);

    var result = {success: true};

    if(AnyBalance.isAvailable('username')){
       var $parse = $(html);
       result.username = $parse.find('td.sidebar h3').text();
    }

    getParam(html, result, 'agreement', /Договор №(.*?)от/i, replaceTagsAndSpaces);
    getParam(html, result, 'license', /Номер лицевого счета:(.*?)<\/li>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Баланс:\s*<[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, parseFloat);

    html = AnyBalance.requestGet(baseurl + 'account/resources');
    getParam(html, result, '__tariff', /"with-border">(?:[\s\S]*?<td[^>]*>){3}(.*?)<\/td>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('abon')){
        html = AnyBalance.requestGet(baseurl + 'account/stat');
        getParam(html, result, 'abon', /Абон[а-я\.]* плата(?:[\s\S]*?<td[^>]*>){2}\s*(-?\d[\d\s\.,]*)/i, replaceFloat, parseFloat);
    }

    AnyBalance.setResult(result);
}

function getMoscow(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://kabinet.mts.ru/zservice/';
    var baseloginurl = "https://login.mts.ru/amserver/UI/Login?service=stream&arg=newsession&goto=http%3A%2F%2Fkabinet.mts.ru%3A80%2Fzservice%2Fgo";
    
    if(!prefs.__dbg){
        var info = AnyBalance.requestGet(baseloginurl);
        
        var form = getParam(info, null, null, /<form[^>]+name="Login"[^>]*>([\s\S]*?)<\/form>/i);
        if(!form)
            throw new AnyBalance.Error("Не удаётся найти форму входа!");
        
        var params = createFormParams(form, function(params, input, name, value){
            var undef;
            if(name == 'IDToken1')
                value = prefs.login;
            else if(name == 'IDToken2')
                value = prefs.password;
            else if(name == 'noscript')
                value = undef; //Снимаем галочку
            else if(name == 'IDButton')
                value = 'Submit';
           
            return value;
        });
        
        // Заходим на главную страницу
        info = AnyBalance.requestPost(baseloginurl, params, addHeaders({Referer: baseloginurl}));
    }else{
        var info = AnyBalance.requestGet(baseurl);
    }

    $parse = $(info);

    if(!/src=exit/i.test(info)){
        var error = $.trim($parse.find('div.logon-result-block>p').text());
        if(!error)
            error = getParam(info, null, null, /<label[^>]+validate="IDToken1"[^>]*>([\s\S]*?)<\/label>/i, replaceTagsAndSpaces);
        if(!error)
            error = getParam(info, null, null, /<label[^>]+validate="IDToken2"[^>]*>([\s\S]*?)<\/label>/i, replaceTagsAndSpaces);

        if(error)
            throw new AnyBalance.Error(error);

        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Неверный логин-пароль, регион или сайт изменен.");
    }

//    info = AnyBalance.requestGet(baseurl);


//    AnyBalance.trace(info);
    
    // Находим ссылку "Счетчики услуг"
    var $url=$parse.find("A:contains('Счетчики услуг')").first();
    if ($url.length!=1)
    	throw new AnyBalance.Error("Невозможно найти ссылку на счетчики услуг");
    
    var html = AnyBalance.requestGet(baseurl + $url.attr('href'));
    var result = {success: true};

    var matches;
    
    //Тарифный план
    if (matches=/Тарифный план:[\s\S]*?>(.*?)</.exec(html)){
    	result.__tariff=matches[1];
    }

    getParam(html, result, 'daysleft', /(\d+) дн\S+ до списания абонентской платы/i, null, parseBalance3);
    
    // Баланс
    if(AnyBalance.isAvailable('balance')){
	    if (matches=/customer-info-balance"><strong>\s*(.*?)\s/.exec(html)){
	        var tmpBalance=matches[1].replace(/ |\xA0/, ""); // Удаляем пробелы
	        tmpBalance=tmpBalance.replace(",", "."); // Заменяем запятую на точку
	        result.balance=parseFloat(tmpBalance);
	    }
    }

    // Лицевой счет
    if(AnyBalance.isAvailable('license')){
	    if (matches=/Лицевой счет:[\s\S]*?>(.*?)</.exec(html)){
	    	result.license=matches[1];
	    }
    }

    // Номер договора
    if(AnyBalance.isAvailable('agreement')){
	    if (matches=/Договор:[\s\S]*?>(.*?)</.exec(html)){
	    	result.agreement=matches[1];
	    }
    }

    // ФИО
    if(AnyBalance.isAvailable('username')){
	    if (matches=/<h3>([^<]*)<\/h3>/i.exec(html)){
	        result.username=matches[1];
	    }
    }
    
    if(AnyBalance.isAvailable('internet_cur')){
        // Находим ссылку "Счетчики услуг"
        matches = html.match(/<div class="gridium sg">\s*(<table>[\s\S]*?<\/table>)/i);
        if(matches){
        	var counter = $(matches[1]).find("tr.gm-row-item:contains('трафик')").find('td:nth-child(3)').first().text();
        	if(counter)
            	counter = $.trim(counter);
        	if(counter)
        		result.internet_cur = parseFloat(counter);
        }
    }
    
    if(AnyBalance.isAvailable('abon')){
        // Находим ссылку "Расход средств"
        var $url=$parse.find("A:contains('Расход средств')").first();
        if ($url.length!=1)
        	throw new AnyBalance.Error("Невозможно найти ссылку на Расход средств");
        
        var html = AnyBalance.requestGet(baseurl + $url.attr('href'));
        getParam(html, result, 'abon', /Абон[а-я\.]*плата[\s\S]*?<span[^>]*>\s*(-?\d[\d\s\.,]*)/i, replaceFloat, parseFloat);
    }

    
    AnyBalance.setResult(result);
}

function getNsk(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://my.citynsk.ru/csp/rkc/';

    var html = AnyBalance.requestGet(baseurl + 'index.csp');
    var href = getParam(html, null, null, /<form[^>]*action="(login[^"]*)"/i);
    if(!href)
        throw new AnyBalance.Error("Не удалось найти форму входа. Сайт изменен или проблемы на сайте");

    html = AnyBalance.requestPost(baseurl + href, {
        login:prefs.login,
        passwd:prefs.password
    });

    if(!getParam(html, null, null, /<input[^>]*type=["']submit["'][^>]*value=["'](Выход)["']/i)){
        var error = getParam(html, null, null, /FormFocus\s*\(\s*['"]([^'"]*)/i);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет");
    }

    href = getParam(html, null, null, /<iframe[^>]*name="PM"[^>]*src=['"]([^'"]*)/i);
    if(!href)
        throw new AnyBalance.Error("Не удаётся найти очередную ссылку (portmonetmain). Cайт изменен?");

    html = AnyBalance.requestGet(baseurl + href);
    href = getParam(html, null, null, /<iframe[^>]*name="PMUP"[^>]*src=['"]([^'"]*)/i);
    if(!href)
        throw new AnyBalance.Error("Не удаётся найти очередную ссылку (pmroles). Cайт изменен?");

    html = AnyBalance.requestGet(baseurl + href);
    href = getParam(html, null, null, /<A[^>]*href=['"](pmrolesmaincontract[^'"]*)/i);
    if(!href)
        throw new AnyBalance.Error("Не удаётся найти очередную ссылку (pmrolesmaincontract). Cайт изменен?");

    html = AnyBalance.requestGet(baseurl + href);
    href = getParam(html, null, null, /<iframe[^>]*name="PMMENU"[^>]*src=['"]([^'"]*)/i);
    if(!href)
        throw new AnyBalance.Error("Не удаётся найти очередную ссылку (pmmenucontract). Cайт изменен?");

    html = AnyBalance.requestGet(baseurl + href);
    var hrefs = sumParam(html, null, null, /<a[^>]*href=['"](contractinfo[^'"]*)/ig);
    if(!hrefs.length)
        throw new AnyBalance.Error("Не удаётся найти очередную ссылку (contractinfo). Cайт изменен?");
    href = hrefs[0];

    html = AnyBalance.requestGet(baseurl + href);
    href = getParam(html, null, null, /<iframe[^>]*name="frmContent"[^>]*src=['"]([^'"]*)/i);
    if(!href)
        throw new AnyBalance.Error("Не удаётся найти очередную ссылку (contractinfonew). Cайт изменен?");

    var hrefipstat = getParam(html, null, null, /<a[^>]*href=['"](ipstat[^'"]*)/i);

    html = AnyBalance.requestGet(baseurl + href); //Совсем охренели так лк писать... Наконец-то добрались до баланса
    
    var result = {success: true};
                                                   
    getParam(html, result, 'agreement', /Договор[\s\S]*?<td[^>]*>([\s\S]*?)(?:от|<\/td>)/i, replaceTagsAndSpaces);
    getParam(html, result, 'license', /Номер (?:связанного )?л[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Остаток на л[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance3);
    getParam(html, result, '__tariff', /Текущий тариф[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces);
    getParam(html, result, 'abon', />(?:\s|&nbsp;)*АП(?:\s|&nbsp;)+([\d\.]+)/i, replaceTagsAndSpaces, parseBalance3);

    if(AnyBalance.isAvailable('balance_tv') && hrefs.length >= 2){
        href = hrefs[1];

        html = AnyBalance.requestGet(baseurl + href);
        href = getParam(html, null, null, /<iframe[^>]*name="frmContent"[^>]*src=['"]([^'"]*)/i);
        if(!href)
            throw new AnyBalance.Error("Не удаётся найти очередную ссылку (contractinfonew). Cайт изменен?");
        
        html = AnyBalance.requestGet(baseurl + href); //Совсем охренели так лк писать... Наконец-то добрались до баланса
        
        getParam(html, result, 'balance_tv', /Остаток на л[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance3);
    }

    if(AnyBalance.isAvailable('internet_cur')){
        if(!hrefipstat){
            AnyBalance.trace("Не найдена ссылка на трафик!");
        }else{
            html = AnyBalance.requestGet(baseurl + hrefipstat);
            getParam(html, result, 'internet_cur', /Итого[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, [/,/g, '', replaceTagsAndSpaces], parseTrafficBytes);
        }
    }

    AnyBalance.setResult(result);
}

function getPrmOld(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('koi8-r');

    var baseurl = 'https://bill.utk.ru/uportf/arm.pl';

    var html = AnyBalance.requestPost(baseurl, {
        do_login:1,
        id_menu:1,
        login:prefs.login,
        passwd:prefs.password,
        ctl00$MainContent$btnEnter:'Войти'
    });

    if(!getParam(html, null, null, /(do_logout=1)/i)){
        var error = getParam(html, null, null, /<div[^>]*class="b_warning[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет");
    }

    var result = {success: true};

    getParam(html, result, 'agreement', /Номер договора:([\s\S]*?)(?:\(|<\/li>)/i, replaceTagsAndSpaces);
    getParam(html, result, 'license', /Код лицевого счета:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Баланс:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance3);
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<br[^>]*>([\s\S]*?)<br[^>]*>/i, replaceTagsAndSpaces);
    getParam(html, result, 'abon', /абон\. плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance3);
    getParam(html, result, 'username', /class="customer-info"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces);


    if(AnyBalance.isAvailable('internet_cur')){
        var href = getParam(html, null, null, /<a[^>]*href="arm.pl([^"]*)"[^>]*>Отчет по трафику/i);
        if(!href){
            AnyBalance.trace("Не найдена ссылка на трафик!");
        }else{
            html = AnyBalance.requestGet(baseurl + href);
            getParam(html, result, 'internet_cur', /ИТОГО[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficPerm);
        }
    }

    if(AnyBalance.isAvailable('balance_tv')){
        if(AnyBalance.getLevel() < 4){
            AnyBalance.trace('Для получения баланса ТВ необходима версия AnyBalance 2.8+');
        }else{
            AnyBalance.setCookie('bill.utk.ru', 'service', 2);
            html = AnyBalance.requestGet(baseurl);
            getParam(html, result, 'balance_tv', /Баланс:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance3);
        }
    }

    AnyBalance.setResult(result);
}

function parseBalanceRK(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)руб/i, replaceFloat, parseFloat) || 0;
    var kop = getParam(text, null, null, /(-?\d[\d\.,]*)коп/i, replaceFloat, parseFloat) || 0;
    var val = rub+kop/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}

function getPrm(){
    //Взято из комстар регионы (сибирь)
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://lka.ural.mts.ru/";

    var city2num = {bug: 26, buz: 26, kem: 29, nef: 2, nizv: 16, novk: 30, novt: 26, noy: 7, nyg: 4, orn: 26, prm: 26, prg: 26, pyh: 2, rad: 8, sor: 26, sur: 5, tob: 28, tum: 26} 

    var type = prefs.type || 0;
    if(type != 0 && type != 500 && type != 550 && !prefs.city)
        throw new AnyBalance.Error('Для выбранного типа подключения необходимо явно указать ваш город.');


/*    AnyBalance.trace(JSON.stringify({
        extDvc:prefs.type,
        authCity:(prefs.city && city2num[prefs.city]) || 26,
        authLogin:prefs.login,
        authPassword:prefs.password,
        userAction:'auth'
    }));
*/

    var html = AnyBalance.requestPost(baseurl, {
        extDvc:type,
        authCity:(prefs.city && city2num[prefs.city]) || 26,
        authLogin:prefs.login,
        authPassword:prefs.password,
        userAction:'auth'
    });

    if(!/\/index\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*background-color:\s*Maroon[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalanceRK);
    getParam(html, result, 'status', /Статус:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Лицевой счёт:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function getKrv(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://lk.kirovnet.net/';

    if(!prefs.__dbg){
        var html = AnyBalance.requestPost(baseurl + '?r=site/login&0=site%2Flogin', {
            'LoginForm[login]':prefs.login,
            yt0: 'Войти',
            'LoginForm[password]':prefs.password
        });
    }else{
        var html = AnyBalance.requestGet(baseurl + '?r=account/index');
    }

    if(!/\?r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};

    getParam(html, result, 'agreement', /Номер договора:([\s\S]*?)<a/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Текущий баланс:([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance2);

    //Тут услуги в таблице, пройдемся по ней и возьмем тарифные планы
    var services = sumParam(html, null, null, /(<tr[^>]*>\s*<td[^>]+class="first_col"[^>]*>(?:[\s\S](?!\/tr))*<\/tr>)/ig);
    var tariffs = [];
    for(var i=0; i<services.length; ++i){
        var tariff = getParam(services[i], null, null, /(?:[\s\S]*?<td[^>]*>){2}\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        if(tariff == 'Услуги')
            continue;
        tariffs[tariffs.length] = tariff;
        getParam(services[i], result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    }
    
    if(tariffs.length > 0)
        result.__tariff = tariffs.join(', ');

    getParam(html, result, '__tariff', /Текущий тарифный план:([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'username', /Общая информация\s+\/([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function getPnz(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://client.lanbilling.ptcomm.ru/index.php?";

    var html = AnyBalance.requestPost(baseurl + 'r=site/login', {
        'LoginForm[login]':prefs.login,
        yt0:'Войти',
        'LoginForm[password]':prefs.password
    });

    //AnyBalance.trace(html);

    if(!/\?r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};

    getParam(html, result, 'agreement', /Номер договора:([\s\S]*?)<a/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Текущий баланс:([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance2);

    //Тут услуги в таблице, пройдемся по ней и возьмем тарифные планы
    var services = sumParam(html, null, null, /(<tr[^>]*>\s*<td[^>]+class="first_col"[^>]*>(?:[\s\S](?!\/tr))*<\/tr>)/ig);
    var tariffs = [];
    for(var i=0; i<services.length; ++i){
        var tariff = getParam(services[i], null, null, /(?:[\s\S]*?<td[^>]*>){2}\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        if(tariff == 'Услуги')
            continue;
        tariffs[tariffs.length] = tariff;
        getParam(services[i], result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
//        getParam(services[i], result, 'status', /Состояние:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    }
    
    if(tariffs.length > 0)
        result.__tariff = tariffs.join(', ');

    getParam(html, result, '__tariff', /Текущий тарифный план:([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'username', /Общая информация\s+\/([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function getNnov(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = 'http://stat.nnov.comstar-r.ru';
    AnyBalance.setAuthentication(prefs.login, prefs.password);

    var html = AnyBalance.requestGet(baseurl);

    if(!/Текущий остаток:/i.test(html))
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильные логин, пароль?");

    var result = {success: true};

    getParam(html, result, 'license', /Лицевой счёт([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий остаток:([\s\S]*?)<br[^>]*>/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, '__tariff', /Текущий тарифный план:([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'abon', /Абонентcкая плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'username', /Лицевой счёт[^<]*(?:<[^>]*>\s*)*([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'daysleft', /Этой суммы вам хватит[\s\S]*?<span[^>]+class="imp"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance2);

    var url = getParam(html, null, null, /<a[^>]+href="([^"]*)"[^>]*>Информация об услугах/i, null, html_entity_decode);
    if(!url){
        AnyBalance.trace("Не удалось найти ссылку на информацию об услугах.");
    }else{
        html = AnyBalance.requestGet(baseurl + url);
        var tr = getParam(html, null, null, /Активные услуги(?:[\s\S](?!<\/table>))*?<tr[^>]*>\s*(<td[^>]*>\s*<a[\s\S]*?)<\/tr>/i);
        if(!tr){
            AnyBalance.trace("Не удалось найти ссылку на информацию об интернет.");
        }else{
            url = getParam(tr, null, null, /<a[^>]+href="([^"]*)/i, null, html_entity_decode);
            html = AnyBalance.requestGet(baseurl + url);
            getParam(html, result, 'agreement', /Договор:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            getParam(html, result, '__tariff', /Описание услуги:[\s\S]*?<td[^>]*>(?:\s*<b[^>]*>[^<]*<\/b>)?([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            getParam(html, result, 'internet_cur', /IP трафик[\s\S]*?<small[^>]*>([\s\S]*?)<\/small>/i, replaceTagsAndSpaces, parseBalance2);
        }
    }


    AnyBalance.setResult(result);
}

function getSdv(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'http://severodvinsk.stream-info.ru/client2/';

    var html = AnyBalance.requestPost(baseurl + 'index.php?r=site/login', {
        'LoginForm[login]':prefs.login,
        'yt0':'Войти',
        'LoginForm[password]':prefs.password
    });

    if(!/r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};

    getParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, '__tariff', /<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'username', /Мои аккаунты\s*\/([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);

    AnyBalance.setResult(result);
}

function getVologda(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://lk.vologda.mts.ru/';

    if(!prefs.__dbg){
        var html = AnyBalance.requestPost(baseurl + 'index.php?r=site/login', {
            'LoginForm[login]':prefs.login,
            'LoginForm[password]':prefs.password,
            'yt0':'Войти'
        });
    }else{
        var html = AnyBalance.requestGet(baseurl + 'index.php?r=account/index');
    }

    if(!/r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};

    //Вначале попытаемся найти активный тариф
    var tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
    if(!tr)
        tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>([\s\S]*?)<\/tr>/i);

    if(tr){
        getParam(tr, result, '__tariff', /<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
        getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    }

    getParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'username', /<div[^>]+class="content-aside"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function getIzhevsk(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://lk.izhnt.ru/';

    var html = AnyBalance.requestPost(baseurl + 'index.php?r=site/login', {
        'LoginForm[login]':prefs.login,
        'yt0':'Войти',
        'LoginForm[password]':prefs.password
    });

    if(!/r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};

    //Вначале попытаемся найти активный тариф
    var tr = getParam(html, null, null, /<tr[^>]+class="account"[^>]*>((?:[\s\S](?!<\/tr))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
    if(!tr)
        tr = getParam(html, null, null, /<tr[^>]+class="account"[^>]*>([\s\S]*?)<\/tr>/i);

    if(tr){
        getParam(tr, result, '__tariff', /<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
        getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    }

    getParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'username', /Мои аккаунты\s*\/([^<]*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function getKomsomolsk(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'http://issa.kms.multinex.ru/';

    var html = AnyBalance.requestPost(baseurl + 'index.php?r=site/login', {
        'LoginForm[login]':prefs.login,
        'LoginForm[password]':prefs.password,
        'yt0':'Войти'
    });

    if(!/r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};

    //Вначале попытаемся найти активный тариф
    var tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
    if(!tr)
        tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>([\s\S]*?)<\/tr>/i);

    if(tr){
        getParam(tr, result, '__tariff', /<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
        getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    }

    getParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'username', /Мои аккаунты\s*\/([^<]*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function getTula(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://kabinet.tula.mts.ru/";

    if(!prefs.__dbg){
        var html = AnyBalance.requestPost(baseurl + 'client2/index.php?r=site/login', {
            'LoginForm[login]':prefs.login,
            'LoginForm[password]':prefs.password,
            'yt0':'Войти'
        });
    }else{
        var html = AnyBalance.requestGet(baseurl + 'client2/index.php?r=account/index');
    }

    if(!/r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};

    //Вначале попытаемся найти активный тариф
    var tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
    if(!tr)
        tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>([\s\S]*?)<\/tr>/i);

    if(tr){
        getParam(tr, result, '__tariff', /<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
        getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    }

    getParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'username', /Мои аккаунты\s*\/([^<]*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function getBalakovo(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://stat.balakovo.comstar-r.ru/";

    var html = AnyBalance.requestPost(baseurl + 'client2/index.php?r=site/login', {
        'LoginForm[login]':prefs.login,
        'LoginForm[password]':prefs.password,
        'yt0':'Войти'
    });

    if(!/r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};

    //Вначале попытаемся найти интернет лиц. счет
    var accTv = {}, accInet = {};
    var accs = sumParam(html, null, null, /Номер договора:[\s\S]*?<\/table>/ig);
    for(var i=0; i<accs.length; ++i){
        var act = /Состояние:\s+актив/i.test(accs[i]) ? 'active' : 'inactive';
        if(accs[i].indexOf('Израсходовано:') >= 0){
            if(!isset(accInet[act]))
                accInet[act] = accs[i];
        }else{
            if(!isset(accTv[act]))
                accTv[act] = accs[i];
        }
    }

    function readAcc(html, isInet){
        if(html){
            var tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
            if(!tr)
                tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>([\s\S]*?)<\/tr>/i);
            
            if(tr){
                sumParam(tr, result, '__tariff', /<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
                if(isInet){
                    getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
                    getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
                }
            }
            
            sumParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
            getParam(html, result, isInet ? 'balance' : 'balance_tv', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
            getParam(html, result, 'username', /Мои аккаунты\s*\/([^<]*)/i, replaceTagsAndSpaces);
        }
    }

    readAcc(accInet.active || accInet.inactive, true);
    readAcc(accTv.active || accTv.inactive);

    AnyBalance.setResult(result);
}

function parseBalance3(text){
    var val = parseBalance(text.replace(/,/g, ''));
    if(isset(val))
        val = Math.round(val*100)/100;
    return val;
}

function parseBalance2(text){
    var val = parseBalance(text);
    if(isset(val))
        val = Math.round(val*100)/100;
    return val;
}

function parseTrafficBytes(text){
    return parseTraffic(text, 'b');
}

function parseTrafficPerm(text){
    return parseTraffic(text, 'mb');
}

function getUln(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://ess.netroad.ru/";

    if(!prefs.__dbg){
        var html = AnyBalance.requestPost(baseurl + 'index.php?r=site/login', {
            'LoginForm[login]':prefs.login,
            'LoginForm[password]':prefs.password,
            'yt0':'Войти'
        });
    }else{
        var html = AnyBalance.requestGet(baseurl + 'index.php?r=account/index');
    }

    if(!/r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};

    //Вначале попытаемся найти активный тариф
    var tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
    if(!tr)
        tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>([\s\S]*?)<\/tr>/i);

    if(tr){
        getParam(tr, result, '__tariff', /<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
        getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    }

    getParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'username', /<div[^>]+class="content-aside"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function getNorilsk(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://kabinet.norilsk.mts.ru/";

    var html = AnyBalance.requestPost(baseurl, {
        extDvc:0,
        authLogin:prefs.login,
        authPassword:prefs.password,
        userAction:'auth'
    });

    if(!/\/index\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*background-color:\s*Maroon[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalanceRK);
    getParam(html, result, 'status', /Статус:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Лицевой счёт:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}


function getMagnit(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://stat.magnitogorsk.multinex.ru/client/";

    if(!prefs.__dbg){
        var html = AnyBalance.requestPost(baseurl + 'index.php?r=site/login', {
            'LoginForm[login]':prefs.login,
            'LoginForm[password]':prefs.password,
            'yt0':'Войти'
        });
    }else{
        var html = AnyBalance.requestGet(baseurl + 'index.php?r=account/index');
    }

    if(!/r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};

    //Вначале попытаемся найти активный тариф
    var tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
    if(!tr)
        tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>([\s\S]*?)<\/tr>/i);

    if(tr){
        getParam(tr, result, '__tariff', /<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
        getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    }

    getParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'username', /<div[^>]+class="content-aside"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}


function getMiass(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://stat.miass.multinex.ru/";

    if(!prefs.__dbg){
        var html = AnyBalance.requestPost(baseurl + 'client2/index.php?r=site/login', {
            'LoginForm[login]':prefs.login,
            'LoginForm[password]':prefs.password,
            'yt0':'Войти'
        });
    }else{
        var html = AnyBalance.requestGet(baseurl + 'client2/index.php?r=account/index');
    }

    if(!/r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};

    //Вначале попытаемся найти активный тариф
    var tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
    if(!tr)
        tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>([\s\S]*?)<\/tr>/i);

    if(tr){
        getParam(tr, result, '__tariff', /<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
        getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    }

    getParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'username', /Мои аккаунты\s*\/([^<]*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function getKurgan(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://infocentr.ru/';

    if(!prefs.__dbg){
        var html = AnyBalance.requestPost(baseurl + 'lk/index.php?r=site/login', {
            'LoginForm[login]':prefs.login,
            'LoginForm[password]':prefs.password,
            'yt0':'Войти'
        });
    }else{
        var html = AnyBalance.requestGet(baseurl + 'lk/index.php?r=site/login');
    }

    if(!/r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};
    //Вначале попытаемся найти активный тариф
    var tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
    if(!tr)
        tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>([\s\S]*?)<\/tr>/i);

    if(tr){
        getParam(tr, result, '__tariff', /<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
        getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    }

    getParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'username', /Мои аккаунты[\s\S]{1,150}<strong>([\s\S]*?)<\/strong>/i, null);

    AnyBalance.setResult(result);
}

function getBarnaul(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://kabinet.barnaul.mts.ru/';

    var html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=Login', {
		BasicAuth:true,
		'Client':'mts',
		'Data[Login]':prefs.login,
        'Data[Passwd]':prefs.password,
        'Service':'API.User.Service'
	});
    
	var json = getJson(html);
	
    if(json.Error == true){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }
	var token = json.Result.Result.Token[0];
	html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=GetContainerByPath', {
		'AccessToken':token,
		'Client':'mts',
        'Service':'API.Interface.Service'
	});
	json = getJson(html);
	html = JSON.stringify(json);
    var result = {success: true};
    //Вначале попытаемся найти активный тариф
    getParam(html, result, '__tariff', /Name[\s\S]{1,20}Тариф\s*'([\s\S]*?)'/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /ClientId":"","Name":"[\s\S]*?(-?\d[\d\s]*[.,]?\d*[.,]?\d*)\s*руб/i, replaceTagsAndSpaces, parseBalance2);

/*	getParam(html, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'username', /Мои аккаунты[\s\S]{1,150}<strong>([\s\S]*?)<\/strong>/i, null);
*/
    AnyBalance.setResult(result);
}

function getBelgorod(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'http://stat.belgorod-net.ru/';

    if(!prefs.__dbg){
        var html = AnyBalance.requestPost(baseurl + 'index.php?r=site/login', {
            'LoginForm[login]':prefs.login,
            'LoginForm[password]':prefs.password,
            'yt0':'Войти'
        });
    }else{
        var html = AnyBalance.requestGet(baseurl + 'index.php?r=site/login');
    }

    if(!/\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};
    //Вначале попытаемся найти активный тариф
    var tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
    if(!tr)
        tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>([\s\S]*?)<\/tr>/i);

    if(tr){
        getParam(tr, result, '__tariff', /<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
        getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    }

    getParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'username', /Мои аккаунты[\s\S]{1,150}<strong>([\s\S]*?)<\/strong>/i, null);

    AnyBalance.setResult(result);
}