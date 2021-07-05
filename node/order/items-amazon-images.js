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

const downloadProductsImagesAmazon = async function(req, res, next) {
	var conn = new Database(dbconn);

	var store = req.params.store || null;
	store = 41;
	var storeAll = false;

	/*var output = {result: null};
	var httpStatus = 400;*/

	var output = {result: "success"};
	var httpStatus = 200;

	do {

		if (store == 'all') {
			storeAll = true;
		}

		res.set({
			'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
			'Pragma': 'no-cache',
		});
		res.json(httpStatus, output);

		await conn.connect();


		/*await (async () => {*/
			try {
				var sql = 'SELECT sku FROM items WHERE itemStore = '+store+' AND itemPhoto = ' + conn.connection.escape('https://via.placeholder.com/800'); 
			    let results = await conn.query(sql);

			    if (results.length==0) {
			    	httpStatus = 200;
					output.result = 'Images have already been updated.';
					console.log('Images have already been updated.')
			    }
				
				for (let item of results) {
					var reportResponse = await getMatchingProductForId({
						'MarketplaceId': 'A39IBJ37TRP1C6',
						'IdType': 'SellerSKU',
						'IdList.Id.1': item.sku
					});
					//console.log(JSON.stringify(reportResponse));
					let imageUrl = reportResponse.GetMatchingProductForIdResponse.GetMatchingProductForIdResult[0].Products[0].Product[0].AttributeSets[0]['ns2:ItemAttributes'][0]['ns2:SmallImage'][0]['ns2:URL'][0].replace('_SL75_.','');
					
					let sql2 = 'UPDATE items SET itemPhoto = ' + conn.connection.escape(imageUrl) + ' WHERE itemStore = ' + store + ' AND sku = ' + conn.connection.escape(item.sku);
					
					let result2 = await conn.query(sql2);
					
					if (results.affectedRow > 0) {
						httpStatus = 200;
						output.result = 'success';
						console.log('Item ' + item.sku + ' url updated.')
					} else {
						output.result = 'failed';
					}
				}
				
						
			}
			catch (e) {
				// Error
				httpStatus = 503;
				output.result = e;
				console.log(e);
			}
	    /*})();*/
	} while(0);

	if (conn.connected) conn.release();


	// Output
	/*res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);*/
	next();
}

async function getMatchingProductForId(params) {
	var validParams = { // true; required. false; not required.
		MarketplaceId: true,
		IdType: true,
		'IdList.Id.1': true
	};
	if (!hasValidParams(params, validParams)) {
		return new Error('GetMatchingProductForId: Invalid Parameters.');
	}
	return await amazonRequest(
		'GetMatchingProductForId',
		'/Products/2011-10-01',
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
		SellerId: 'A190DTMI0Z4PM8',
		SignatureMethod: 'HmacSHA256',
		SignatureVersion: '2',
		Timestamp: new Date().toISOString().substring(0,19)+'Z',
		Version: '2011-10-01'
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

/*async function amazonRequest(action, path, options) {
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
}*/

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
	qs = qs.replace(/\(/,'%28').replace(/\)/,'%29');
	//console.log(qs);

	hmac.update(qs);

	return hmac.digest('base64');
}

module.exports = downloadProductsImagesAmazon;