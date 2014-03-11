/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function numSize(num, size) {
    var str = num + '';
    if (str.length < size) {
        for (var i = str.length; i < size; ++i) {
            str = '0' + str;
        }
    }
    return str;
}

function getDateString(dt) {
    if (typeof dt != 'object') dt = new Date(dt);
    return numSize(dt.getDate(), 2) + '/' + numSize(dt.getMonth() + 1, 2) + '/' + dt.getFullYear() + " " + dt.getHours() + ':' + dt.getMinutes();
}

function main(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.track_id, 'Введите номер почтового отправления!');
	
	var baseurl = "http://gdeposylka.ru/";
	var html = AnyBalance.requestGet(baseurl + prefs.track_id);
	
	var error = getParam(html, null, null, [/<div class="errorBox"[^>]*>([\s\S]*?)<\/div>/i, /<span class="error"[^>]*>([\s\S]*?)<\/span>/i], replaceTagsAndSpaces);
	if(error)
		throw new AnyBalance.Error(error);
	
	var result = {success: true};
	var days = getParam(html, null, null, /"parcelin-days"(?:[^>]*>){1}([^<\|]*)/i, replaceTagsAndSpaces, parseBalance);
	
	var table = getParam(html, null, null, /class="parcelin-table"([\s\S]*?)<\/table>/i);
	if(!table)
		throw new AnyBalance.Error("Не удалось найти статус посылки, возможно, из-за изменений на сайте");
	
	getParam(table, result, 'geo', /class="city"[^>]*>([\s\S]*?)<\/div>/i, [/Неизвестное местоположение/i, '', replaceTagsAndSpaces]);
	
	var status = getParam(table, null, null, /parcel-info_mod"[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	var date = getParam(table, null, null, /parcelin-received-date"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseDateWord);
	
	getParam(status, result, 'status');
	getParam(date, result, 'date');
	getParam(days, result, 'days');
	
	// Фисксим <b>undefined</b><br/>\n<small>NaN/NaN/NaN NaN:NaN</small>: в пути 0 дн.
	if(AnyBalance.isAvailable('fulltext')){
		if(status && date && (days > 0)) {
			result.fulltext = '<b>' + status + '</b><br/>\n' + '<small>' + getDateString(date) + '</small>: в пути ' + days + ' дн.';
		} else {
			result.fulltext = 'Информация недоступна.'
		}
	}
	
	AnyBalance.setResult(result);
}