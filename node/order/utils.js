// Discount Chemist
// Order System

// Utilities

var moment = require('moment-timezone');

const postageServices = {
	'AU_StandardDelivery': 'Standard delivery',
	'AU_Express': 'Express',
	'AU_ExpressCourierInternational': 'Express Courier International',
	'AU_ExpressDelivery': 'Express delivery',
	'AU_AusPostRegisteredPostInternationalParcel': 'AusPost Registered Post International Parcel',
	'AU_AusPostRegisteredPostInternationalPaddedBag1kg': 'AusPost Registered Post International Padded Bag 1 kg',
	'AU_AusPostRegisteredPostInternationalPaddedBag500g': 'AusPost Registered Post International Padded Bag 500 g',
	'AU_Registered': 'Registered',
	'AU_RegisteredParcelPost': 'Registered Parcel Post',
	'AU_RegisteredSmallParcel': 'Registered Small Parcel',
};

const postageServiceName = function(postageService) {
	return postageServices[postageService] || null;
}

const postageServiceID = function(postageService) {
	for (id in postageServices) {
		if (postageService.toLowerCase() == postageServices[id].toLowerCase()) return id;
	}
	return null;
}

const dateEbayToSql = function(date, fromTimezone) {
	// Set time to 12 pm
	return moment.tz(date+' 12:00:00', 'DD-MMM-YY HH:mm:ss', fromTimezone).tz('UTC').format('YYYY-MM-DD HH:mm:ss');
}

const dateSqlToEbay = function(date, toTimezone) {
	return moment.tz(date, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz(toTimezone).format('DD-MMM-YY');
}

const dateIsoToEbay = function(date, toTimezone) {
	return moment.tz(date, 'UTC').tz(toTimezone).format('DD-MMM-YY');
}

const getDateValue = (date, time = false, timezone = false) => {
	return date.getFullYear().toString()+('00'+(date.getMonth()+1)).slice(-2)+('00'+date.getDate()).slice(-2) + (time ? '-'+('00'+date.getHours()).slice(-2)+('00'+date.getMinutes()).slice(-2)+('00'+date.getSeconds()).slice(-2) : '') + (timezone ? date.getTimezoneOffset() : '');
}

const dateSqlToJsDate = function(date) {
	var dateTime = date.split(' ');
	var dateArr = dateTime[0].split('-');
	var timeArr = dateTime[1].split(':');
	return new Date(Date.UTC(
		parseInt(dateArr[0], 10),
		parseInt(dateArr[1], 10) - 1,
		parseInt(dateArr[2], 10),
		parseInt(timeArr[0], 10),
		parseInt(timeArr[1], 10),
		parseInt(timeArr[2], 10)
	));
}

module.exports = {postageServices, postageServiceName, postageServiceID, dateEbayToSql, dateSqlToEbay, dateIsoToEbay, getDateValue, dateSqlToJsDate};
