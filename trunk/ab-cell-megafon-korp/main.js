﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.setDefaultCharset('utf-8');
	var baseurl = 'https://' + (prefs.region || 'ural') + '.b2blk.megafon.ru/';
	
	var html = AnyBalance.requestGet(baseurl + 'sc_cp_apps/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'sc_cp_apps/loginProcess', {
		j_username: prefs.login,
		j_password: prefs.password,
	}, addHeaders({Referer: baseurl + 'sc_cp_apps/login'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /"error\.message"\s*:\s*"([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Вы ввели неправильный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<dt>Текущий баланс[^]*?class="money[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'abonCount', /<dt>Абонентов[^]*?class="span28[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /accountInfo_name[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	var href = getParam(html, null, null, /sc_cp_apps\/expenses\/account\/[^"']+/i);
	if(!href) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку на детализацию, сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + href + '/list?from=0&size=128', addHeaders({'X-Requested-With':'XMLHttpRequest'}));
	
	try {
		var json = getJson(html);
		
		var account;
		for(var i = 0; i < json.expenses.length; i++) {
			var curr = json.expenses[i];
			if(!prefs.phone) {
				account = curr;
				AnyBalance.trace('Номер в настройках не задан, возьмем первый: ' + curr.msisdn);
				break;				
			}
			
			if(endsWith(curr.msisdn, prefs.phone)) {
				account = curr;
				AnyBalance.trace('Нашли нужный номер: ' + curr.msisdn);
				break;
			}
		}
		
		if(!account) {
			AnyBalance.trace(JSON.stringify(json));
			throw new AnyBalance.Error('Не удалось найти ' + (prefs.phone ? 'номер телефона с последними цифрами ' + prefs.phone : 'ни одного номера телефона!'));
		}
		
		AnyBalance.trace('Успешно получили данные по номеру: ' + curr.msisdn);
		AnyBalance.trace(JSON.stringify(account));
		
		getParam(account.amountTotal + '', result, 'amountTotal', null, replaceTagsAndSpaces, parseBalance);
		getParam(account.amountLocal + '', result, 'amountLocal', null, replaceTagsAndSpaces, parseBalance);
		getParam(account.charges + '', result, 'charges', null, replaceTagsAndSpaces, parseBalance);
		
		sumParam(account.monthChargeRTPL + '', result, 'abon', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		sumParam(account.monthChargeSRLS + '', result, 'abon', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		
		getParam(account.msisdn, result, 'phone_name', null, replaceTagsAndSpaces);
		getParam(account.name, result, 'name_name', null, replaceTagsAndSpaces);
	} catch (e) {
		AnyBalance.trace(e.message);
		AnyBalance.trace('Не удалось получить данные по номеру телефона, свяжитесь, пожалуйста, с разработчиками.');
	}
	
	AnyBalance.setResult(result);
}