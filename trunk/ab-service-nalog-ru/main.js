﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
	'Origin':'https://vg.vainahtelecom.ru'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://service.nalog.ru/';
	
	var html = AnyBalance.requestGet(baseurl + 'debt/req.do?');
	var session = getParam(html, null, null, /name="PHPSESSID"[^>]*value="([^"]*)/i);
	
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		AnyBalance.setDefaultCharset('base64');
		var captcha = AnyBalance.requestGet(baseurl+ 'debt/req.do?captcha=1');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
    AnyBalance.setDefaultCharset('utf-8');
	html = AnyBalance.requestPost(baseurl + 'debt/req.do?', {
	    cmd:'find',
		inn:prefs.inn,
		fam:prefs.surname,
		nam:prefs.name,
		otch:'',
		cap:captchaa
    }, addHeaders({Referer: baseurl + 'debt/req.do?'})); 
	
    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, [/<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, /div[^>]*"field-error"(?:[^>]*>){2}([\s\S]*?)<\//i], replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось получить информацию. Сайт изменен?');
    }
	var result = {success: true, balance:0, all:''};
	
	var errString = 'Не найдена информация по задолженности с данными: ИНН: '+ prefs.inn + ', ФИО: ' + prefs.surname + ' ' + prefs.name + '. Пожалуйста, проверьте правильность ввода. ';
	var jsonVar = getParam(html, null, null, /var\s*DEBT\s*=\s*([\s\S]*?\});/i);
	if(!jsonVar)
		throw new AnyBalance.Error(errString);

	var json = getJson(jsonVar);
	
	var len = json.regions.length;
	for(i = 0; i < len; i++){
		var curr = json.regions[i];
		var sum = (curr.pds ? curr.pds[0].sum : '');
		if(curr.message == 'По вашему запросу информация не найдена') {
			result.all = errString;
		} else {
			result.all += curr.code+ ' '+curr.name+'\n'+ 
				(sum ? curr.pds[0].ifnsName+': '+ curr.pds[0].taxName +'-'+  curr.pds[0].taxKind+ ': ' + sum  : (curr.message ? curr.message : 'Нет задолженности')) + '\n\n';

			sumParam(sum, result, 'balance', /([\s\S]*)/i, null, parseBalance, aggregate_sum);		
		}
	}
	
    AnyBalance.setResult(result);
}