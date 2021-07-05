// Download products

const {Config} = require('./config');
const Database = require('./connection');
const crypto = require('crypto');
const request = require('request');
var parseString = require('xml2js').parseString;
const querystring = require('querystring');
const csv = require('csv-streamify');
const fs = require('fs');
const glob = require('glob');
const {getDateValue} = require('./utils');

const requestProductsReportAmazon = async function(req, res, next) {
	var conn = new Database(dbconn);

	var store = req.params.store || null;
	var storeAll = false;

	var output = {result: null};
	var httpStatus = 400;

	do {

		if (store == 'all') {
			storeAll = true;
		}

		try {
				
			var reportResponse = await requestReport({
				'ReportType': '_GET_MERCHANT_LISTINGS_DATA_'

			});
			//console.log(JSON.stringify(reportResponse));
			let reportRequestId = reportResponse.RequestReportResponse.RequestReportResult[0].ReportRequestInfo[0].ReportRequestId[0];
			//console.log(reportRequestId);
			if (reportRequestId) {
				httpStatus = 200;
				output.result = 'success';
				output.id = reportRequestId;
			} else {
				output.result = 'failed';
			}
					
		}
		catch (e) {
			// Error
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

}

/*async function amazonRequest(action, path, options) {
	// Variables temporarily hardcoded till fully functioning
	var requestMethod = 'POST';
	var host = 'mws.amazonservices.com.au';
	var AWSAccessKeyId = 'AKIAIAFIEGE6EJM5VQ4Q';
	var requestParams = { // Alphabetical order for signing
		Action: action,
		MWSAuthToken: 'amzn.mws.1ab55e1c-9410-74cb-6065-24c3787c9558',
		SellerId: 'A190DTMI0Z4PM8',
		SignatureMethod: 'HmacSHA256',
		SignatureVersion: '2',
		Timestamp: new Date().toISOString().substring(0,19)+'Z',
		Version: '2013-09-01'
	};
	var secretKey = 'iWjgm2Wh6mKu7KySa+ikKZHIZi7ioJM/Vm5YWzHS';

	for (let key in options) {
		requestParams[key] = options[key];
	}
	requestParams.Signature = signHmacSHA25664(requestMethod, host, path, secretKey, AWSAccessKeyId, requestParams);
	//console.log(requestParams.Signature);
	requestParams['AWSAccessKeyId'] = AWSAccessKeyId;
	return await doRequest(requestMethod, host, path, requestParams);
}*/

async function amazonRequest(action, path, options) {
	// Variables temporarily hardcoded till fully functioning
	var requestMethod = 'POST';
	var host = 'mws.amazonservices.com.au';
	var AWSAccessKeyId = 'AKIAIAFIEGE6EJM5VQ4Q';
	var requestParams = { // Alphabetical order for signing
		Action: action,
		MWSAuthToken: 'amzn.mws.1ab55e1c-9410-74cb-6065-24c3787c9558',
		Merchant: 'A190DTMI0Z4PM8',
		SignatureMethod: 'HmacSHA256',
		SignatureVersion: '2',
		Timestamp: new Date().toISOString().substring(0,19)+'Z',
		Version: '2009-01-01'
	};
	var secretKey = 'iWjgm2Wh6mKu7KySa+ikKZHIZi7ioJM/Vm5YWzHS';

	for (let key in options) {
		requestParams[key] = options[key];
	}
	requestParams.Signature = signHmacSHA25664(requestMethod, host, path, secretKey, AWSAccessKeyId, requestParams);
	//console.log(requestParams.Signature);
	requestParams['AWSAccessKeyId'] = AWSAccessKeyId;
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

function signHmacSHA25664(method, host, path, secret, AWSAccessKeyId, params) {
	var hmac = crypto.createHmac('sha256', secret);
	hmac.update(method + '\n');
	hmac.update(host + '\n');
	hmac.update(path + '\n');
	
	var keys = Object.keys(params).sort();
	var qs = 'AWSAccessKeyId=' + querystring.escape(AWSAccessKeyId);

	for (var i = 0; i < keys.length; i++) {
		qs += '&' + keys[i] + '=' + querystring.escape(params[keys[i]]);
		/*if (i !== (keys.length - 1)) {
			qs += '&';
		}*/
	}
	//console.log(qs);

	hmac.update(qs);

	return hmac.digest('base64');
}

module.exports = requestProductsReportAmazon;