/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у интернет провайдера Инетком (Москва).

https://stat.inetcom.ru/cabinet

*/

function main(){

    AnyBalance.setDefaultCharset('utf-8');

    var prefs = AnyBalance.getPreferences();
   
    if(!prefs.login)
	    throw new AnyBalance.Error('Вы не ввели логин');
    if(!prefs.password)
	    throw new AnyBalance.Error('Вы не ввели пароль');

    var baseurl = "https://stat.inetcom.ru/cabinet/";

    sessID = Math.random().toString().substr(2);
    if (sessID.substr(0,1) == '0') {
	  sessID = '1'+sessID	
	}
    var html = AnyBalance.requestPost(baseurl + 'index.php', {
        ICSess: sessID,
        url:    '',
        login: prefs.login,
        password: prefs.password
    });
    
    //AnyBalance.trace('got  ' + html);
    
    var p1 = html.lastIndexOf('<div id="infotitle">');
    if (p1 < 0)
        throw new AnyBalance.Error('Неверный логин или пароль.');

    html = html.substr(p1 + '<div id="infotitle">'.length);
 
    var p2 = html.indexOf('<div id="infobbg">');
    if (p2 < 0)
        throw new AnyBalance.Error('Не удаётся найти данные. Сайт изменен?');

    html = html.substr(0, p2);
 
    var result = {success: true};
    //getParam(html, result, 'id', /Номер договора[^>]*>(.*?)<\/b/i,  replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'userName', /Здравствуйте, [^>]*>(.*?)<\/span>/i,  replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Состояние Вашего лицевого счета[^>]*>(.*?)<\/span>/i,  replaceTagsAndSpaces, parseBalance);
    //getParam(html, result, 'abplate', /Абонентская плата за расчетный период[^>]*>(.*?)<\/span>/i,  replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic', /Входящий трафик в расчетном периоде[^>]*>(.*?)<\/span>/i,  replaceTagsAndSpaces, parseBalance);
    
    var ps = "";
    if(matches = html.match(/Расчетный период c[^>]*>(.*?)</)){
        ps = matches[1];
    }
    var pe = "";
    if(matches = html.match(/span> по [^>]*>(.*?)</)){
        pe = matches[1];
    }
    if (ps != "" && pe != "") {
        period = ps+' по '+pe
        result['period'] = period;
    }

    AnyBalance.setResult(result);
}

