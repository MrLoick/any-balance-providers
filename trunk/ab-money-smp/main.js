/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация о карте в банке "СМП банк".

Сайт: http://smpbank.ru
ЛК: https://smponbank.ru/Account/LogOn
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://smponbank.ru/';

    var html = AnyBalance.requestPost(baseurl + 'Account/LogOn', {
        UserName:prefs.login,
        Password:prefs.password
    }, g_headers);

    if(!/Account\/Logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+validation-summary-errors[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
    }

    html = AnyBalance.requestPost(baseurl + 'Update/RunCustomerUpdate', addHeaders({
        Accept:'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With':'XMLHttpRequest'
    }));

    try{
        AnyBalance.trace('Обновляем данные...');
        var json = getJson(html);
        if(!json.isSuccessful)
            throw new AnyBalance.Error(html);
        AnyBalance.trace('Обновление данных произведено успешно!');
    }catch(e){
        AnyBalance.trace('Обновление данных не удалось: ' + e.message);
    }

    AnyBalance.trace('Получаем все счета...');
    html = AnyBalance.requestGet(baseurl + 'Ib/ViewAccounts', g_headers);

    if(prefs.type == 'card')
        fetchCard(baseurl, html);
    else if(prefs.type == 'acc')
        fetchAccount(baseurl, html);
    else
        fetchCard(baseurl, html); //По умолчанию карта
}

function fetchAccount(baseurl, html){
    throw new AnyBalance.Error('Получение счетов пока не поддерживается. Пожалуйста, обратитесь к автору провайдера.');

    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4,20}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');

    if(!/w_cr\.inf_accounts/.test(html))
        html = AnyBalance.requestGet(baseurl + 'w_cr.inf_accounts?p_cur_sid=' + getSid(html));

    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.contract || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var result = {success: true};

    var re = new RegExp('(<tr[^>]*onClick="fTableClick(?:[\\s\\S](?!<tr))*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '\\s*<[\\s\\S]*?</tr>)', 'i');

    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'счет с ID ' + prefs.contract : 'ни одного счета'));
    
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /Имя клиента:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function fetchCard(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    if(prefs.contract && !/^\d{4}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите 4 последние цифр номера карты, по которой вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первой карте.');

    var table = getParam(html, null, null, /<div[^>]+id="blckListCard"[^>]*>\s*<table[^>]*>([\s\S]*?)<\/table>/i);
    if(!table)
        throw new AnyBalance.Error('Не удалось найти список карт. Сайт изменен?');

    var re = new RegExp('<tr(?:[\\s\\S](?!</tr))*?\\*{4}' + (prefs.contract || '\\d{4}') + '[\\s\\S]*?</tr>', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'карту с последними цифрами ' + prefs.contract : 'ни одной карты'));

    var result = {success: true};
    
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)(?:<br|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<\/td>|<br)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'fio', /<li[^>]+class="userIndication"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('cardname')){
        var cn = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i);
        getParam(cn || '', result, 'cardname', /<span[^>]+class="[^"]*editLinkWrapper[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(result.cardname == 'Добавить название')
            getParam(tr, result, 'cardname', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<\/td>|<br)/i, replaceTagsAndSpaces, html_entity_decode);
    }

    if(AnyBalance.isAvailable('till','bonus','payNext','payTill','blocked','type')){
        var id = getParam(tr, null, null, /Ib\/GetCardDetail\?cardId=(\d+)/i);
        if(!id){
            AnyBalance.trace('Не удалось найти ссылку на дополнительную информацию по карте. Сайт изменен?');
        }else{
            html = AnyBalance.requestGet(baseurl + 'Ib/GetCardDetail?cardId=' + id, g_headers);
            getParam(html, result, 'bonus', /<i[^>]*>СМП Трансаэро Бонус(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'payNext', /Сумма минимального платежа(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'payTill', /Минимальный платёж необходимо внести до(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'blocked', /Зарезервированные суммы по расходным операциям(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'till', /Срок действия(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'type', /Тип карты(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        }
    }

    AnyBalance.setResult(result);
    
}
