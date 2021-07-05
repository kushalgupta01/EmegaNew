// Download orders

const {Config} = require('./config');
const Database = require('./connection');
// const SSHClient = require('ssh2-promise');
const crypto = require('crypto');
const request = require('request');
const moment = require('moment-timezone');
var parseString = require('xml2js').parseString;
const querystring = require('querystring');
const csv = require('csv-streamify');
const fs = require('fs');
const glob = require('glob');
const {getDateValue} = require('./utils');

const downloadOrdersAmazon = async function(req, res, next) {
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
			var orderDatas = {};
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
				//let data = reportResponse2.replace(/\t/g, ',').replace(/\r\n/g,'\n');
				fs.writeFile('../srv/amazon/'+reportId+'.txt', reportResponse2, (err) => {
					if (err) throw err;
					console.log('Report Saved.');
				});
				let orders = reportResponse2.split('\r\n');
				let rawcols = orders[0].split('\t');
				let cols = [];
				for (let rawcol of rawcols) {
					let col = rawcol.replace(/-/g,'_');
					cols.push(col);
				}
				for (let i=1; i<orders.length; i++) {
					let cellValues = orders[i].split('\t');
					if (cellValues[0] == '') continue;
					let orderData = {};
					for (let j=0; j<cellValues.length; j++) {
						orderData[cols[j]] = cellValues[j];
					}

					orderData['store'] = storeID;
					orderData['orderID'] = orderData['order_id'];
					orderData['SalesRecordID'] = orderData['order_id'].split('-')[2];
					orderData['buyerID'] = orderData['buyer_name'].split(' ').join('_');
					orderData['createDate'] = orderData['purchase_date'];

					let items = [];
					let item = {};
					item['sku'] = orderData['sku'];
					item['product_name'] = orderData['product_name'];
					item['quantity_purchased'] = orderData['quantity_purchased'];
					item['item_price'] = orderData['item_price'];
					item['shipping_price'] = orderData['shipping_price'];
					items.push(item);
					orderData['item_list'] = items;


					delete orderData['sku'];
					delete orderData['product_name'];
					delete orderData['quantity_purchased'];
				

					if (!orderDatas.hasOwnProperty(orderData['order_id'])) {
						orderDatas[orderData['order_id']] = orderData;
					}else{
						orderDatas[orderData['order_id']]['item_list'] = orderDatas[orderData['order_id']]['item_list'].concat(orderData['item_list']);
						orderDatas[orderData['order_id']]['item_price'] = parseFloat(orderDatas[orderData['order_id']]['item_price']) + parseFloat(orderData['item_price']);

						let totalPostage = parseFloat(orderDatas[orderData['order_id']]['shipping_price']) + parseFloat(orderData['shipping_price']);
						orderDatas[orderData['order_id']]['shipping_price'] = totalPostage;
					}
				}

				await conn.connect();
				// Check if orders exist in the database
				var ordersInDBWhere = [];
				let storeMS = conn.connection.escape(storeID);
				for (let orderID in orderDatas) {
					ordersInDBWhere.push('(store = '+storeMS+' AND orderID = '+conn.connection.escape(orderDatas[orderID].orderID)+')');
				}
				

				//console.log(orderDataNew);

				var ordersInDB = await conn.query('SELECT id, store, orderID, data FROM orders'+(ordersInDBWhere.length ? ' WHERE '+ordersInDBWhere.join(' OR ') : ''));
				var orderListDB = {};

				for (let order of ordersInDB) {
					orderListDB[order.orderID] = order.id;
				}


				// Save orders into the database
				var transactionResult = await conn.transaction(async function() {
					var errorOccurred = false;

					saveOrdersLoop:
					
					for (let orderID in orderDatas) {
						//console.log(order.data);
						// Check if the order already exists in the database
						if (!orderListDB.hasOwnProperty(orderID)){
							let order = orderDatas[orderID];
							let result = await conn.query('INSERT IGNORE INTO orders (store, data, addedDate) VALUES ('+conn.connection.escape(order.store)+','+conn.connection.escape(JSON.stringify(order))+','+conn.connection.escape(dateToSql())+');')
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

		//**********************************Customer Table********************************************
	  	// Updating customer table
	  	console.log("Updating customer table...");
	  	await (async function() {

	  		try{
	  			let attributesName = Config.attributesName;
	  			let day = moment().format('YYYYMMDD');
	  			let startDay = moment.tz(day, 'YYYYMMDD', Config.TIMEZONE).tz('UTC').format('YYYY-MM-DD')+' 00:00:00';
	  			let storeWHERE = ' store=' + store;
	  			
	  			let orders = await conn.query('SELECT * FROM orders WHERE ' + storeWHERE + ' AND addedDate>' + conn.connection.escape(startDay));
				for (let order of orders) {
					let data = JSON.parse(order.data);
					//console.log(order.data);
					let customerID = conn.connection.escape(order.buyerID);
					let store = order.store;
					let date = moment.tz(order.addedDate, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('DD-MMM-YY');
					let orderID = order.id;
					let salesRecordID = order.salesRecordID;
					let service = Config.STORES[store].service;
					
					let fullname = '';
					let address1 = '';
					let address2 = '';
					let suburb = '';
					let state = '';
					let postcode = '';
					let country = '';
					let phone = '';
					let email = '';

					
					fullname = data[attributesName[service]['fullName']];
					address1 = data[attributesName[service]['address1']];
					address2 = data[attributesName[service]['address2']];
					suburb = data[attributesName[service]['suburb']];
					state = data[attributesName[service]['state']];
					postcode = data[attributesName[service]['postcode']];
					country = data[attributesName[service]['country']];
					phone = data[attributesName[service]['phone']];
					email = data[attributesName[service]['email']];
					

					
					if (fullname == '' && address1 == '') continue;

					fullname = conn.connection.escape(fullname);
					address1 = conn.connection.escape(address1);
					address2 = conn.connection.escape(address2);
					suburb = conn.connection.escape(suburb);
					state = conn.connection.escape(state);
					postcode = conn.connection.escape(postcode);
					country = conn.connection.escape(country);
					phone = conn.connection.escape(phone);
					email = conn.connection.escape(email);

					let existCustomer = await conn.query('SELECT id, orders FROM customers WHERE store = ' + conn.connection.escape(store) + ' AND customerID = ' + customerID + ' AND address1 = ' + address1 + ' AND address2 = ' + address2)
					if (existCustomer.length==1){
						let orderIDs = JSON.parse(existCustomer[0].orders);
						let customerDBID = existCustomer[0].id;
						if (orderIDs.hasOwnProperty(orderID)) {
							continue;
						}else{
							let newOrderID = {};
							newOrderID[orderID] = {'date': date, 'srn': Config.STORES[store].recID + salesRecordID};
							orderIDs = Object.assign(orderIDs, newOrderID);
							await conn.query(`UPDATE customers set orders = ${conn.connection.escape(JSON.stringify(orderIDs))} WHERE id = ${customerDBID}`);

							if (fullname != '' && address1 != '') {
								await conn.query(`UPDATE customers set fullname = ${fullname}, address1 = ${address1}, address2 = ${address2},`+
									`suburb = ${suburb}, state = ${state}, postcode = ${postcode}, country = ${country}, phone = ${phone}, email = ${email}`+
									` WHERE store = ${conn.connection.escape(store)} AND customerID = ${customerID}`);
							}

							console.log(`Customer ${customerID} updated`);
						}
					}else if (existCustomer.length==0){
						
						let orderIDs = {};
						orderIDs[orderID] = {'date': date, 'srn': Config.STORES[store].recID + salesRecordID};

						await conn.query(`INSERT INTO customers (customerID, store, orders, fullname, address1, address2, suburb, state, postcode, country, phone, email)  VALUES ` +  
						   `(${customerID}, ${store}, ${conn.connection.escape(JSON.stringify(orderIDs))}, ${fullname}, ${address1}, ${address2}, ${suburb}, ${state} ,${postcode}, ${country}, ${phone}, ${email})`);
						console.log(`Customer ${customerID} inserted`);
					}
				}
			}catch(e){
				console.log(e);
			}
			
		})();
			
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

module.exports = downloadOrdersAmazon;