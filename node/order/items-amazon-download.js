// Download orders

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

const downloadProductsAmazon = async function(req, res, next) {
	var conn = new Database(dbconn);

	//var store = req.params.store || null;
	let storeID = 41;
	var ReportRequestId = req.body.ReportRequestId || false;
	//ReportRequestId = 50073018064;
	var reportId = null;

	var output = {result: null};
	var httpStatus = 400;

	do {

		try {
			var itemDatas = {};
			var reportResponse = await getReportList({});
			//console.log(JSON.stringify(reportResponse));
			let ReportInfos = reportResponse.GetReportListResponse.GetReportListResult[0].ReportInfo;
			for (let reportInfo of ReportInfos) {
				if (reportInfo.ReportRequestId[0] == ReportRequestId) {
					reportId = reportInfo.ReportId[0];
					break;
				}
			}

			if (reportId != null) {
				var reportResponse2 = await getReport({
					ReportId: reportId
				});

				let reportResponse3 = reportResponse2.replace(/\t\t\t\t\t\t/g,'\t').replace(/\t\t\t\t/g,'\t').replace(/\t\t\t/g,'\t').replace(/\t\t/g,'\t');
				
				let items = reportResponse2.split('\n');

				let cols = items[0].split('\t');
				for (let i=1; i<items.length; i++) {
					let cellValues = items[i].split('\t');
					if (cellValues[0] == '') continue;
					let itemData = {};
					for (let j=0; j<cellValues.length; j++) {
						itemData[cols[j]] = cellValues[j];
					}
				
					//console.log(itemData);
					if (!itemDatas.hasOwnProperty(itemData['seller-sku'])) {
						itemDatas[itemData['seller-sku']] = itemData;
					}
				}

				//console.log(itemDatas);

				await conn.connect();
				// Check if orders exist in the database
				var itemsInDBWhere = [];
				let storeMS = conn.connection.escape(storeID);
				for (let itemSku in itemDatas) {
					itemsInDBWhere.push('(itemStore = '+storeMS+' AND sku = '+conn.connection.escape(itemSku)+')');
				}
				

				//console.log(orderDataNew);

				var itemsInDB = await conn.query('SELECT sku FROM items'+(itemsInDBWhere.length ? ' WHERE '+itemsInDBWhere.join(' OR ') : ''));
				var itemListDB = {};

				for (let item of itemsInDB) {
					itemListDB[item.sku] = 1;
				}


				// Save orders into the database
				var transactionResult = await conn.transaction(async function() {
					var errorOccurred = false;

					saveOrdersLoop:
					
					for (let itemSku in itemDatas) {
						//console.log(order.data);
						// Check if the order already exists in the database
						if (!itemListDB.hasOwnProperty(itemSku)){
							let item = itemDatas[itemSku];
							let result = await conn.query('INSERT IGNORE INTO items (itemStore, itemNo, sku, itemName) VALUES ('+conn.connection.escape(storeID)+','+conn.connection.escape(item['product-id'])+','+conn.connection.escape(item['seller-sku'])+','+conn.connection.escape(item['item-name'])+');')
							.catch(err => {
								errorOccurred = err;
							});
						}
	
						if (errorOccurred) {
							httpStatus = 503;
							output.result = 'Could not add entry to database.';
							conn.rollback(errorOccurred);
							break saveOrdersLoop;
						}
					}
					
					if (errorOccurred) return false;

					var commitResult = await conn.commit();
					if (!commitResult) {
						httpStatus = 503;
						output.result = 'Could not commit transaction';
						return false;
					}
					return true;
				});

				if (transactionResult) {
					httpStatus = 200;
					output.result = 'success';
				}
				else {
					httpStatus = 500;
					output.result = 'Could not add data into the database';
				}


			} else {
				httpStatus = 400;
				output.result = 'Report Not Found.';
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

async function getReport(params) {
	var validParams = {
		ReportId: true
	}
	if (!hasValidParams(params, validParams)) {
		return new Error('getReport: Invalid Parameters.');
	}
	return await amazonRequest(
		'GetReport',
		'/Reports/2009-01-01',
		params
	);

}

async function listOrders(params) {
	
	return await amazonRequest(
		'ListOrders',
		'/Orders/2013-09-01',
		params
	);
}


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

	hmac.update(qs);

	return hmac.digest('base64');
}

module.exports = downloadProductsAmazon;