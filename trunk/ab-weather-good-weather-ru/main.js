﻿function main(){

var WeatherJsonString;
var WeatherJsonObject;
var prefs = AnyBalance.getPreferences();
var result = {success: true};
var listCityIndex = prefs.listCityIndex;

if (!listCityIndex || listCityIndex == 'Город') {
		WeatherJsonString = AnyBalance.requestGet('http://good-weather.ru/current?ref=a&type=json');
		WeatherJsonObject = jQuery.parseJSON(WeatherJsonString);
		AnyBalance.trace('Запрошена погода для текущего места. Для получения погоды для определенного города, выберите нужный город в настройках', null);
	} 
	else {
		WeatherJsonString = AnyBalance.requestGet('http://good-weather.ru/current/'+listCityIndex+'?ref=a&type=json');
		WeatherJsonObject = jQuery.parseJSON(WeatherJsonString);
		AnyBalance.trace('Запрошена погода для города ' + WeatherJsonObject.name, null);
	}

result.name = WeatherJsonObject.name;
result.temp = WeatherJsonObject.temp;
result.pressure = WeatherJsonObject.pressure;
result.humidity = WeatherJsonObject.humidity;
result.wind = WeatherJsonObject.wind;
result.clouds = WeatherJsonObject.clouds;
AnyBalance.setResult(result);
}