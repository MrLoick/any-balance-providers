/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает курсы валют в белорусских банках с сайта http://select.by/kurs

Сайт: http://select.by
Личный кабинет: http://select.by/kurs/
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

function getKurs($row, result, counter, idx, bank){
	if(AnyBalance.isAvailable(counter)){
		var text = $row.find(bank ? 'td:nth-child('+idx+')' : 'th:nth-child('+idx+')>b').text();
		if(text){
			var price = parseFloat(text);
			result[counter] = price;
			return price;
		}
	}
}

function getNBKurs($table, result, counter, curr){
	if(AnyBalance.isAvailable(counter)){
		var text = $table.find('tr:contains("'+curr+'")>td:nth-child(3)').text();
		if(text){
			var price = parseFloat(text);
			result[counter] = price;
			return price;
		}
	}
}

function getText($row, result, counter, idx, bank){
	if(AnyBalance.isAvailable(counter)){
		var text = $row.find(bank ? 'td:nth-child('+idx+')' : 'th:nth-child('+idx+')>b').text();
		result[counter] = text;
		return text;
	}
}


function main(){
	AnyBalance.trace('Connecting to select.by...');
	var prefs = AnyBalance.getPreferences();
    var city = prefs.city;
	var info = AnyBalance.requestGet('http://select.by/kurs/' + city + '/');
	var bank = prefs.bank;
	
	var result = {success: true};

        if(bank != 'nbrb'){
            var table = getParam(info, null, null, /(<table[^>]*class="tablesorter"[^>]*>[\s\S]*?<\/table>)/i);
		if(!table)
			throw new AnyBalance.Error('Не удаётся найти таблицу курсов!');
	    
		var $table = $(table);
        var $row;
	    
		if(bank){
			bank = bank.toUpperCase();
			$row = $table.find('tr>td>a').filter(
				function(){
					return $.trim($(this).text().toUpperCase()) == bank;
				}
			).parent().parent();
		}else{
			$row = $table.find('tr>th:contains("Лучшие курсы")').parent();
		}
	               
        
		if($row.size() == 0)
			throw new AnyBalance.Error('Не удаётся найти строку ' + prefs.bank);
	    
            getKurs($row, result, 'usdpok', 2, bank);
            getKurs($row, result, 'usdprod', 3, bank);
            getKurs($row, result, 'eurpok', 4, bank);
            getKurs($row, result, 'eurprod', 5, bank);
            getKurs($row, result, 'rurpok', 6, bank);
            getKurs($row, result, 'rurprod', 7, bank);
            getKurs($row, result, 'uepok', 8, bank);
            getKurs($row, result, 'ueprod', 9, bank);
            getText($row, result, 'tel', 10, bank);
		if(AnyBalance.isAvailable('bank'))
			result.bank = prefs.bank || 'Лучшие курсы';
		result.__tariff = prefs.bank || 'Лучшие курсы';
        }else{
                var table = getParam(info, null, null, /Курсы валют НБ РБ[\s\S]*?(<table[^>]*>[\s\S]*?<\/table>)/i);
		if(!table)
			throw new AnyBalance.Error('Не удаётся найти таблицу НБ РБ!');
		var $table = $(table);
                var date = $table.find('tr:nth-child(1)>td:nth-child(3)').text();
		result.__tariff = 'НБ РБ на ' + date;
		if(AnyBalance.isAvailable('bank'))
			result.bank = result.__tariff;
                getNBKurs($table, result, 'usdpok', 'USD');
                getNBKurs($table, result, 'usdprod', 'USD');
                getNBKurs($table, result, 'eurpok', 'EUR');
                getNBKurs($table, result, 'eurprod', 'EUR');
                getNBKurs($table, result, 'rurpok', 'RUB');
                getNBKurs($table, result, 'rurprod', 'RUB');
                if(AnyBalance.isAvailable('tel'))
                    result.tel = date; //В случае нац. банка вместо телефона кладем дату курса
        }

	AnyBalance.setResult(result);
}
