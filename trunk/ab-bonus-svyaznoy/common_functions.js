﻿function getParam (html, result, param, regexp, replaces, parser) {
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


function getParamFind (result, param, obj, search_str, regexp, replaces, parser)
{
    if (!AnyBalance.isAvailable (param))
        return;

    var value = obj.find (search_str).text();
    if (!value)
        return;

    if (regexp) {
        if (regexp.test (value))
            value = regexp.exec (value)[0];
        else
            return;
    }

    if (replaces) {
        for (var i = 0; i < replaces.length; i += 2) {
            value = value.replace (replaces[i], replaces[i+1]);
        }
    }

    if (parser)
        value = parser (value);

    result[param] = value;
}


function checkEmpty (param, error) {
    if (!param || param == '')
        throw new AnyBalance.Error (error);
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

