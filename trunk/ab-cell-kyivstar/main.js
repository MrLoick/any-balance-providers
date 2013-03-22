/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Киевстар
Сайт оператора: http://www.kyivstar.ua/
Личный кабинет: https://my.kyivstar.ua/
*/

function parseMinutes(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d.,]*)/, replaceFloat, parseFloat);
  if(typeof(val) != 'undefined'){
     val *= 60; //Переводим в секунды
     AnyBalance.trace('Parsed ' + val + ' seconds from value: ' + str);
  }
  return val; 
}

//------------------------------------------------------------------------------

function main(){
  var prefs = AnyBalance.getPreferences();
  var baseurl = "https://my.kyivstar.ua/";
  var headers = {
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
    Connection: 'keep-alive'
  };

  AnyBalance.trace('Connecting to ' + baseurl);

  var html = AnyBalance.requestGet(baseurl + 'tbmb/login/show.do', headers);
  var token = /name="org.apache.struts.taglib.html.TOKEN" value="([\s\S]*?)">/.exec(html);
  if(!token)
      throw new AnyBalance.Error("Не удаётся найти код безопасности для входа. Проблемы или изменения на сайте?");

  AnyBalance.trace('Token = ' + token[1]);

  var html = AnyBalance.requestPost(baseurl + "tbmb/login/perform.do", {
    isSubmitted: "true",
    "org.apache.struts.taglib.html.TOKEN": token[1],
    user: prefs.login,
    password: prefs.password
  }, headers);
  
  if(!/\/tbmb\/logout\/perform/i.test(html)){
      var matches = html.match(/<td class="redError">([\s\S]*?)<\/td>/i);
      if(matches){
          throw new AnyBalance.Error(matches[1]);
      }
      throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
  }

  if(!/\/tbmb\/payment\/activity\//i.test(html)){
      //Не нашли ссылку на платежи. Очень вероятно, что это корпоративный аккаунт
      throw new AnyBalance.Error("Похоже, у вас корпоративный личный кабинет. Пожалуйста, воспользуйтесь провайдером Киевстар для корпоративных тарифов");
  }
  
  AnyBalance.trace('Successfully connected');
  
  var result = {success: true};
  var str_tmp;
  
  //Тарифный план
  getParam(html, result, '__tariff', /(?:Тарифний план:|Тарифный план:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
  
  // Баланс
  getParam(html, result, 'balance', /(?:Залишок на рахунку:|Остаток на счету:|Поточний баланс:|Текущий баланс:)[\s\S]*?<b>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
  
  //Бонусные минуты (1)
  sumParam(html, result, 'bonus_mins_1', /(?:Кількість хвилин для дзвінків|Количество минут для звонков)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  sumParam(html, result, 'bonus_mins_1', /(?:Хвилини всередині мережі "?Ки.встар"?:|Минуты внутри сети "?Ки.встар"?:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  sumParam(html, result, 'bonus_mins_1', /(?:Єдина абонентська група:|Единая абонентская группа:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  sumParam(html, result, 'bonus_mins_1', /(?:Залишок хвилин для дзвінків на Ки.встар:|Остаток минут для звонков на Ки.встар:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  sumParam(html, result, 'bonus_mins_1', /(?:Залишок хвилин для дзвінків абонентам Ки.встар та Beeline:|Остаток минут для звонков абонентам Ки.встар и Beeline:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);

  //Бонусные минуты (2)
  sumParam(html, result, 'bonus_mins_2', /(?:Залишок хвилин для дзвінків абонентам Ки.встар та DJUICE:|Остаток минут для звонков абонентам Ки.встар и DJUICE:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  sumParam(html, result, 'bonus_mins_2', /(?:Залишок Хвилини на КС 500 хв:|Остаток Минуты на КС 500 мин:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  sumParam(html, result, 'bonus_mins_2', /(?:Залишок тарифних хвилин для дзвінків в межах України:|Остаток тарифних минут для звонков в пределах Украин[иы]\s*:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  sumParam(html, result, 'bonus_mins_2', /(?:Залишок хвилин для дзвінків в межах України:|Остаток минут для звонков в пределах Украини :)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  sumParam(html, result, 'bonus_mins_2', /(?:Залишок хвилин для дзвінків по Україні:|Остаток минут для звонков по Украине:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);

  //Тарифные минуты:
  sumParam(html, result, 'mins_tariff', /(?:Тарифні хвилини:|Тарифные минуты:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  
  //Доплата за входящие:
  sumParam(html, result, 'inc_pay', /(?:Доплата за входящие звонки:|Доплата за входящие звонки:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

  //MMS
  sumParam(html, result, 'mms', />(?:Бонусні MMS:|Бонусные MMS:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  sumParam(html, result, 'mms', />MMS:[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  
  //SMS
  sumParam(html, result, 'sms', />(?:Бонусні SMS:|Бонусные SMS:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  sumParam(html, result, 'sms', />SMS:[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  sumParam(html, result, 'sms', /(?:Остаток текстових сообщений для отправки абонентам Киевстар и Beeline|Залишок текстових повідомлень для відправки абонентам Київстар та Beeline):[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  
  //Бонусные средства 
  sumParam(html, result, 'bonus_money', /(?:Бонусні кошти:|Бонусные средства:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  sumParam(html, result, 'bonus_money', /(?:Бонуси за умовами тарифного плану "Єдина ціна":|Бонусы по условиям тарифного плана "Единая цена":)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  sumParam(html, result, 'bonus_money', /(?:Кошти по послузі "Екстра кошти"|Средства по услуге "Экстра деньги"):[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

  sumParam(html, result, 'bonus_money_till', /(?:Бонусні кошти:|Бонусные средства:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
  sumParam(html, result, 'bonus_money_till', /(?:Бонуси за умовами тарифного плану "Єдина ціна":|Бонусы по условиям тарифного плана "Единая цена":)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
  sumParam(html, result, 'bonus_money_till', /(?:Кошти по послузі "Екстра кошти"|Средства по услуге "Экстра деньги"):(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
  
  //Остаток бонусов
  sumParam(html, result, 'bonus_left', /(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  sumParam(html, result, 'bonus_left', /(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  
  sumParam(html, result, 'bonus_money_till', /(?:Залишок бонусів:|Остаток бонусов:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
  sumParam(html, result, 'bonus_money_till', /(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?(?:Залишок бонусів:|Остаток бонусов:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
  
  //Интернет
  sumParam(html, result, 'internet', /(?:Залишок бонусного об\'єму даних:|Остаток бонусного объема данных:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
  sumParam(html, result, 'internet', /(?:Залишок байт для користування послугою Інтернет GPRS\s*:|Остаток байт для пользования услугой Интернет GPRS\s*:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
  sumParam(html, result, 'internet', /(?:Остаток GPRS Internet\s*:|Залишок GPRS Internet\s*:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
  sumParam(html, result, 'internet', /(?:Остаток Мб для пользования услугой Интернет GPRS\s*:|Залишок Мб для користування послугою Інтернет GPRS\s*:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
  
  //Домашний Интернет
  sumParam(html, result, 'home_internet', /(?:Від послуги "Домашній Інтернет"|От услуги "Домашний Интернет"|Бонусні кошти послуги "Домашній Інтернет"|Бонусные средства услуги "Домашний Интернет"):[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  
  //Порог отключения
  sumParam(html, result, 'limit', /(?:Поріг відключення:|Порог отключения:)[\s\S]*?<b>([^<]*)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  
  //Срок действия номера
  sumParam(html, result, 'till', /(?:Номер діє до:|Номер действует до:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_sum);

  getParam(html, result, 'phone', /(?:Номер|Номер):[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
  
  //Срок действия услуги Комфортный переход
  if(AnyBalance.isAvailable('comfort_till')){
      html = AnyBalance.requestGet(baseurl + "tbmb/tsm/overview.do", headers);
      if(/show.do\?featureId=99&amp;in=1/i.test(html)){
          html = AnyBalance.requestGet(baseurl + "tbmb/tsm/complexFeature/show.do?featureId=99&in=1", headers);
          sumParam(html, result, 'comfort_till', /(?:Послуга буде автоматично відключена&nbsp;|Услуга будет автоматически отключена&nbsp;)([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
      }
  }
  
  AnyBalance.setResult(result);
}
