// Discount Chemist
// Order System

// Download orders
var amazonMws = require('amazon-mws')('AKIAIAFIEGE6EJM5VQ4Q', 'iWjgm2Wh6mKu7KySa+ikKZHIZi7ioJM/Vm5YWzHS');
const {Config} = require('./config');
const Database = require('./connection');
// const SSHClient = require('ssh2-promise');
const crypto = require('crypto');
const request = require('request');
var parseString = require('xml2js').parseString;
const querystring = require('querystring');
const csv = require('csv-streamify');
const fs = require('fs');
const glob = require('glob');
const {getDateValue} = require('./utils');

const downloadOrdersAmazon = async function(req, res, next) {
	var conn = new Database(dbconn);

	var store = req.params.store || null;
	var saveToDBOnly = req.query.savedbonly || false;
	var processAllFiles = req.query.saveall || false;

	var storeAll = false;

	var output = {result: null};
	var httpStatus = 400;

	do {
		if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store))) {
			output.result = 'Invalid store.';
			break;
		}

		if (store == 'all') {
			storeAll = true;
		}

		try {
				// Download latest orders from ebay
				//console.log('downloading');
			var orderFiles = {};

			if (!saveToDBOnly) {
				// -------------- TEMP TEST START -----------------------
				console.log('-------------- TEMP TEST START --------------');

				amazonMws.orders.search({
			        'Version': '2013-09-01',
			        'Action': 'ListOrders',
			        'SellerId': 'A190DTMI0Z4PM8',
			        'MWSAuthToken': 'amzn.mws.1ab55e1c-9410-74cb-6065-24c3787c9558',
			        'MarketplaceId.Id.1': 'A39IBJ37TRP1C6',
			        'LastUpdatedAfter': '2019-05-01T00:00:00'
			    }, function (error, response) {
			        if (error) {
			            console.log('error ', error);
			            return;
			        }
			        console.log('response', response);
			    });
				console.log('-------------- TEMP TEST END ----------------');
			}
		}
		catch (e) {
			// Error
			console.log('-----------------------ERROR 503--------------------------');
			httpStatus = 503;
			output.result = e;
			console.log(e);
		}
	} while(0);

	if (conn.connected) conn.release();


	// Output
	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

async function requestReport(params) {
	var validParams = { // true; required. false; not required.
		ReportType: true,
		StartDate: false,
		EndDate: false,
		ReportOptions: false
	};
	if (!hasValidParams(params, validParams)) {
		return new Error('RequestReport: Invalid Parameters.');
	}
	return await amazonRequest(
		'RequestReport',
		'/Reports/2009-01-01',
		params
	);

	// var response = await amazonRequest(
	// 	'RequestReport',
	// 	'/Reports/2009-01-01',
	// 	{ 'ReportType': '_GET_FLAT_FILE_ACTIONABLE_ORDER_DATA_' }
	// );

	// console.log('requestReport response:\n', JSON.stringify(response));
	// if (!response.RequestReportResponse.RequestReportResult[0]
	// 		.ReportRequestInfo[0].ReportRequestId[0]) {
	// 	return new Error(
	// 		'RequestReport: Could not find ReportRequestId in response.');
	// }
	// return response.RequestReportResponse.RequestReportResult[0]
	// 	.ReportRequestInfo[0].ReportRequestId[0];
}

async function getReportRequestList(params) {
	var validParams = { // true; required. false; not required.
		ReportRequestIdList: false,
		ReportTypeList: false,
		ReportProcessingStatusList: false,
		MaxCount: false,
		RequestedFromDate: false,
		RequestedToDate: false
	};
	if (!hasValidParams(params, validParams)) {
		return new Error('getReportRequestList: Invalid Parameters.');
	}
	return await amazonRequest(
		'GetReportRequestList',
		'/',
		params
	);

	// var response = await amazonRequest(
	// 	'GetReportRequestList',
	// 	'/Reports/2009-01-01',
	// 	params
	// );

	// var reportRequestInfo = response.GetReportRequestListResponse
	// 	.GetReportRequestListResult[0].ReportRequestInfo[0];
	// console.log('reportRequestInfo: ', reportRequestInfo)
	// if (reportRequestInfo.ReportProcessingStatus == '_DONE_') {
	// 	if (reportRequestInfo.GeneratedReportId) {
	// 		return ReportRequestInfo.GeneratedReportId;
	// 	} else {
	// 		return await getReportList(reportRequestInfo.ReportRequestId[0]);
	// 	}
	// } else if (reportRequestInfo.ReportProcessingStatus == '_DONE_NO_DATA_') {
	// 	return new Error('GetReportRequestList: No Amazon Orders');
	// } else if (reportRequestInfo.ReportProcessingStatus == '_SUBMITTED_') {
	// 	return await getReportList(reportRequestInfo.ReportRequestId[0]);
	// } else if (reportRequestInfo.ReportProcessingStatus == '_IN_PROGRESS_') {
	// 	return new Error(
	// 		'GetReportRequestList: ReportProcessingStatus: In Progress.');
	// } else if (reportRequestInfo.ReportProcessingStatus == '_CANCELLED_') {
	// 	return new Error(
	// 		'GetReportRequestList: ReportProcessingStatus: Cancelled.');
	// }
	// return new Error(
	// 	'GetReportRequestList: Could not find reportRequestId in response.');
}

async function getReportList(params) {
	var validParams = { // true; required. false; not required.
		MaxCount: false,
		ReportTypeList: false,
		Acknowledged: false,
		ReportRequestIdList: false,
		AvailableFromDate: false,
		AvailableToDate: false
	};
	if (!hasValidParams(params, validParams)) {
		return new Error('getReportList: Invalid Parameters.');
	}
	return await amazonRequest(
		'GetReportList',
		'/Reports/2009-01-01',
		params
	);

	// var response = await amazonRequest(
	// 	'GetReportList',
	// 	'/Reports/2009-01-01',
	// 	{ 'ReportRequestIdList.Id.1': reportRequestId }
	// );
	// console.log(JSON.stringify(response));

	// var ReportInfo;
	// if (response.GetReportListResponse.GetReportListResult[0].ReportInfo) {
	// 	ReportInfo = response.getReportListResponse.GetReportListResult[0].ReportInfo[0];
	// } else {
	// 	return new Error('getReportList: Unable to retrieve reportInfo');
	// }
	// if (ReportInfo.reportId[0]) {
	// 	return ReportInfo.reportId[0];
	// } else {
	// 	return new Error('getReportList: ReportId for ReportRequestId: ' +
	// 		ReportRequestId + ' does not exist.');
	// }
}

async function getReport(params) {
	var validParams = {
		ReportId: false
	}
	if (!hasValidParams(params, validParams)) {
		return new Error('getReport: Invalid Parameters.');
	}
	return await amazonRequest(
		'GetReport',
		'/Reports/2009-01-01',
		params
	);

	// var response = await amazonRequest(
	// 		'GetReport',
	// 		'/Reports/2009-01-01',
	// 		{ 'ReportId': reportId }
	// );
	// var response = "order-id\torder-item-id\tpurchase-date\tpayments-date\treporting-date\tpromise-date\tdays-past-promise\tbuyer-email\tbuyer-name\tbuyer-phone-number\tsku\tproduct-name\tquantity-purchased\tquantity-shipped\tquantity-to-ship\tship-service-level\trecipient-name\tship-address-1\tship-address-2\tship-address-3\tship-city\tship-state\tship-postal-code\tship-country\r\n250-9266983-3426220\t41483244219702\t2018-07-24T23:36:18+00:00\t2018-07-24T23:36:18+00:00\t2018-07-24T23:39:36+00:00\t2018-07-27T13:59:59+00:00\t-2\tq77l6xlf2zr6rzq@marketplace.amazon.com.au\tJohn Burstow\t0449704054\t1122\tNew 1KG Vital Greens Food Supplement Nutrient Superfood Organic Antioxidant\t3\t0\t3\tStandard\tJohn Burstow\t4 Howard St\t\t\tMORNINGSIDE\tQLD\t4170\tAU\r\n";

	// return parseTabDelimitedFlatFile(response);
	// return response;
}

async function listOrders(params) {
	/*var validParams = {
		LastUpdatedAfter: false
	}
	if (!hasValidParams(params, validParams)) {
		return new Error('listOrders: Invalid Parameters.');
	}*/
	return await amazonRequest(
		'ListOrders',
		'/Orders/2013-09-01',
		params
	);

	// var response = await amazonRequest(
	// 		'GetReport',
	// 		'/Reports/2009-01-01',
	// 		{ 'ReportId': reportId }
	// );
	// var response = "order-id\torder-item-id\tpurchase-date\tpayments-date\treporting-date\tpromise-date\tdays-past-promise\tbuyer-email\tbuyer-name\tbuyer-phone-number\tsku\tproduct-name\tquantity-purchased\tquantity-shipped\tquantity-to-ship\tship-service-level\trecipient-name\tship-address-1\tship-address-2\tship-address-3\tship-city\tship-state\tship-postal-code\tship-country\r\n250-9266983-3426220\t41483244219702\t2018-07-24T23:36:18+00:00\t2018-07-24T23:36:18+00:00\t2018-07-24T23:39:36+00:00\t2018-07-27T13:59:59+00:00\t-2\tq77l6xlf2zr6rzq@marketplace.amazon.com.au\tJohn Burstow\t0449704054\t1122\tNew 1KG Vital Greens Food Supplement Nutrient Superfood Organic Antioxidant\t3\t0\t3\tStandard\tJohn Burstow\t4 Howard St\t\t\tMORNINGSIDE\tQLD\t4170\tAU\r\n";

	// return parseTabDelimitedFlatFile(response);
	// return response;
}

async function amazonRequest(action, path, options) {
	// Variables temporarily hardcoded till fully functioning
	var requestMethod = 'POST';
	var host = 'mws.amazonservices.com.au';
	var requestParams = { // Alphabetical order for signing
		AWSAccessKeyId: 'AKIAIB4QMAZP5QLNYGWQ',
		MWSAuthToken: 'amzn.mws.8ab1ebc1-3600-c886-a1e5-b5cbea6462fe',
		SellerId: 'A2BQT5PTOSA3P7',
		SignatureMethod: 'HmacSHA256',
		SignatureVersion: '2',
		Timestamp: new Date().toISOString(),
		Version: '2013-09-01'
	};
	var secretKey = 'A1eGMPBg1BtIThh5LfWd0qBv62ee59+CJeTylVwk';

	requestParams.Action = action;
	for (let key in options) {
		requestParams[key] = options[key];
	}
	requestParams.Signature = signHmacSHA25664(requestMethod, host, path, secretKey, requestParams);
	console.log(requestParams.Signature);
	
	return await doRequest(requestMethod, host, path, requestParams);
}

async function doRequest(requestMethod, host, path, requestParams) {
	return new Promise(function (resolve, reject) {
		request[requestMethod.toLowerCase()]({
			url: 'https://' + host + path,
			form: requestParams
		}, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				if (body.slice(0, 5) == '<?xml') { // If response is in xml format
					parseString(body, function (err, result) {
						if (err) {
							reject(new Error('parseString: failed to parse response.'));
						} else {
							resolve(result);
						}
					});
				} else { // If response is not in xml format
					resolve(body);
				}
			} else {
				if (body.slice(0, 5) == '<?xml') { // If response is in xml format
					parseString(body, function (err, result) {
						if (err) {
							reject(new Error('parseString: failed to parse response.'));
						} else {
							if (result.ErrorResponse) {
								reject(new Error(
									'AMZN Error Type: ' + result.ErrorResponse.Error[0].Type + '\n' +
									'AMZN Error Code: ' + result.ErrorResponse.Error[0].Code + '\n' +
									'AMZN Error Message: ' + result.ErrorResponse.Error[0].Message
								));
							} else {
								reject(new Error(
									'Request Error: ' + error + '\n' +
									'Status Code: ' + response.statusCode
								));
							}
						}
					});
				}
			}
		});
	});
}

function hasValidParams(params, validParams) {
	// Check to see if keys in params exist in validParams
	for (let key in params) {
		if (!validParams.hasOwnProperty(key)) {
			return false;
		}
	}
	// Check if required keys in validParams exist in params
	for (let key in validParams) {
		if (validParams[key] === true) {
			if (params[key] === null || params[key] === 'undefined') {
				return false;
			}
		}
	}
	return true;
}

function parseTabDelimitedFlatFile(tdff) {
	var orders = tdff.split('\r\n');
	for (let i = 0; i < orders.length; i++) {
		orders[i] = orders[i].split('\t');
	}
	var ordersJSON = ordersToJson(orders);
	console.log(ordersJSON);

	return ordersJSON;
}

function ordersToJson(orders) {
	var ordersJSON = [];
	for (let i = 1; i < orders.length; i++) {
		var order = {};
		for (let j = 0; j < orders[i].length; j++) {
			order[orders[0][j].toString()] = orders[i][j].toString();
		}
		ordersJSON.push(order);
	}
	return ordersJSON;
}

function dateToSql() {
	return (new Date()).toISOString().replace('T', ' ').replace('Z', '').slice(0, -4);
}

function signHmacSHA25664(method, host, path, secret, params) {
	var hmac = crypto.createHmac('sha256', secret);
	hmac.update(method + '\n');
	hmac.update(host + '\n');
	hmac.update(path + '\n');
	
	var keys = Object.keys(params).sort();
	var qs = '';
	for (var i = 0; i < keys.length; i++) {
		qs += keys[i] + '=' + querystring.escape(params[keys[i]]);
		if (i !== (keys.length - 1)) {
			qs += '&';
		}
	}

	hmac.update(qs);

	return hmac.digest('base64');
}

module.exports = downloadOrdersAmazon;
