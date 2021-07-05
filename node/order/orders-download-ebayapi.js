const {Config} = require('./config');
const Database = require('./connection');
const DBConnection = require('./dbconnection');
const eBaySession = require('./eBaySession');
const parseString = require('xml2js').parseString;
const ebay = require('ebay-api');
const mysql = require('mysql');


const downloadOrdersEbayApi = async function(req, res, next) {

	const dbconn = new DBConnection();
	var conn = new Database(dbconn);

	var service = req.params.service;
	var store = req.params.store || null;
	var storeAll = false;

	var output = {result: "success"};
	var httpStatus = 200;
	var tokens = Config.ebayAPI.tokens;


	do {
		if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store))) {
			output.result = 'Invalid store.';
			break;
		}

		if (store == 'all') {
			storeAll = true;
		}

		/*if (!tokens.hasOwnProperty(store)) {
			output.result = 'Invalid store.';
			break;
		}*/


		await conn.connect();

		for (let storeID in Config.STORES) {

			if ((!storeAll && storeID != store) || Config.STORES[storeID].service != service) continue;
		
			try{
				// Get selling manager listing
				var apiCall = 'GetOrders';
				var requestBody = '<?xml version="1.0" encoding="utf-8" ?>\
				<GetOrdersRequest xmlns="urn:ebay:apis:eBLBaseComponents">\
				<RequesterCredentials><eBayAuthToken>'+tokens[storeID]+'</eBayAuthToken></RequesterCredentials>\
				<Pagination><EntriesPerPage>200</EntriesPerPage><PageNumber>1</PageNumber></Pagination>\
				<NumberOfDays>30</NumberOfDays><OrderRole>Seller</OrderRole><OrderStatus>Completed</OrderStatus>\
				<ErrorLanguage>en_AU</ErrorLanguage><WarningLevel>High</WarningLevel>\
				</GetOrdersRequest>';

				// Create eBay session
				var session = new eBaySession(Config.ebayAPI.devID, Config.ebayAPI.appID, Config.ebayAPI.certID, Config.ebayAPI.siteID);
				var responseXml = await session.sendHttpRequest(apiCall, requestBody);

				// Get sales record response
				if (!responseXml || responseXml.toUpperCase().includes('HTTP 404')) {
					output.result = 'Error sending request';
					break;
				}

				var responseJson = await new Promise((resolve, reject) => {
					parseString(responseXml, function (err, result) {
						//console.log(result.GetOrdersResponse);
						if (err) reject(err);
						resolve(result);
					});
				});

				if (responseJson.GetOrdersResponse.Errors) {
					for (let err of responseJson.GetOrdersResponse.Errors) {
						console.log(err.LongMessage);
					}
					
				}

				const totalNumOfItems = responseJson.GetOrdersResponse.ReturnedOrderCountActual[0];
				const totalNumOfPages = Math.ceil(totalNumOfItems/200);
				console.log("totalNumOfPages: " + totalNumOfPages);
			

			
				
				await conn.connect();
				await (async function() {
					for (let j=1; j<=totalNumOfPages; j++){
						console.log("Page Number: " + j);
					    // Get selling manager listing
					    var apiCall = 'GetOrders';
						var requestBody = '<?xml version="1.0" encoding="utf-8" ?>'+
						'<GetOrdersRequest xmlns="urn:ebay:apis:eBLBaseComponents">'+
						'<RequesterCredentials><eBayAuthToken>'+tokens[storeID]+'</eBayAuthToken></RequesterCredentials>'+
						'<Pagination><EntriesPerPage>100</EntriesPerPage><PageNumber>'+j+'</PageNumber></Pagination>'+
						'<NumberOfDays>30</NumberOfDays>'+
						'<OrderRole>Seller</OrderRole><OrderStatus>Completed</OrderStatus>'+              
						'<ErrorLanguage>en_AU</ErrorLanguage><WarningLevel>High</WarningLevel><DetailLevel>ReturnAll</DetailLevel>'+
						'</GetOrdersRequest>';
						
						//<NumberOfDays>30</NumberOfDays>
						//<CreateTimeFrom>2019-02-01T20:34:44.000Z</CreateTimeFrom><CreateTimeTo>2019-04-15T00:34:44.000Z</CreateTimeTo>

						// Create eBay session
						var session = new eBaySession(Config.ebayAPI.devID, Config.ebayAPI.appID, Config.ebayAPI.certID, Config.ebayAPI.siteID);
						var responseXml = await session.sendHttpRequest(apiCall, requestBody);

						// Get sales record response
						if (!responseXml || responseXml.toUpperCase().includes('HTTP 404')) {
							output.result = 'Error sending request';
							break;
						}

						var responseJson = await new Promise((resolve, reject) => {
							parseString(responseXml, function (err, result) {
								//console.log(result);
								if (err) reject(err);
								resolve(result);
							});
						});

						if (responseJson.GetOrdersResponse.Errors) {
							for (let err of responseJson.GetOrdersResponse.Errors) {
								console.log(err.LongMessage);
							}
							
						}
						//console.log(responseJson.GetOrdersResponse);
						var orders = responseJson.GetOrdersResponse.OrderArray ? responseJson.GetOrdersResponse.OrderArray[0].Order : [];
						
						try{
							let newOrders = [];
						   for (let order of orders) {
						   	   //console.log(order.ShippingDetails[0].SellingManagerSalesRecordNumber[0]);
						   	   /*if (order.ShippingDetails[0].SellingManagerSalesRecordNumber[0] == '3266') {
						   	   		console.log(JSON.stringify(order));
						   	   }*/
						   	   if (!order.ShippedTime) {
						   	   		newOrders.push(order);
						   	   }
						   }
						   let orderDataNew = {};
						   orderDataNew[storeID] = [];
					       for (let order of  newOrders) {
					       	  let entry = {};

					       	  let shipAddress = order.ShippingAddress[0];
					       	  let transactions = order.TransactionArray[0].Transaction;
					       	  let shipDetails = order.ShippingDetails[0];

					       	  entry.orderID = order.OrderID[0];
					       	  entry.SalesRecordID = shipDetails.SellingManagerSalesRecordNumber[0];
					       	  entry.buyerID = order.BuyerUserID[0];
					       	  entry.createdDate = order.CreatedTime[0];
					       	  entry.finalDestinationAddressName = shipAddress.Name[0];
					       	  entry.buyerFirstName = transactions[0].Buyer[0].UserFirstName[0];
					       	  entry.buyerLastName = transactions[0].Buyer[0].UserLastName[0];
					       	  entry.finalDestinationAddressPhone = shipAddress.Phone[0];
					       	  entry.buyerEmail = transactions[0].Buyer[0].Email[0];
					       	  entry.finalDestinationAddressLine1 = shipAddress.Street1[0];
					       	  entry.finalDestinationAddressLine2 = shipAddress.Street2[0];
					       	  entry.finalDestinationCity = shipAddress.CityName[0];
					       	  entry.finalDestinationStateOrProvince = shipAddress.StateOrProvince[0];
					       	  entry.finalDestinationPostalCode = shipAddress.PostalCode[0];
					       	  entry.finalDestinationCountry = shipAddress.Country[0];

					       	  entry.lineItemSumTotal = order.Subtotal[0]._;
					       	  entry.orderSumTotal = order.Total[0]._;
					       	  entry.orderSumTotalCurrency = order.Total[0].$;
					       	  entry.orderShippingPrice = order.ShippingServiceSelected[0].ShippingServiceCost[0]._;
					       	  entry.shippingMethod = order.ShippingServiceSelected[0].ShippingService[0];
					       	  entry.checkoutDate = order.CheckoutStatus[0].LastModifiedTime[0];
					       	  entry.saleDate = order.CreatedTime[0];
					       	  entry.paidDate = order.PaidTime[0];
					       	  entry.PaymentMethod = order.PaymentMethods[0];
					       	  entry.orderPaymentStatus = order.PaidTime ? 'PAID' : 'PENDING';
					       	  entry.paymentID = order.PaidTime ? order.MonetaryDetails[0].Payments[0].Payment[0].ReferenceID[0]._ : '';
					       	  entry.clickCollect = shipAddress.AddressAttribute ? 'YES' : 'NO';
					       	  entry.clickCollectRefNum = shipAddress.AddressAttribute ? shipAddress.AddressAttribute[0]._ : '';
					       	  entry.note = order.BuyerCheckoutMessage ? order.BuyerCheckoutMessage[0] : '';

					       	  let items = [];
					       	  
				       	  	  for (let transaction of transactions) {
				       	  	  	    let item = transaction.Item[0];
				       	  	  		let itemData = {
										'title': item.Title[0],
										'quantity': parseInt(transaction.QuantityPurchased[0], 10),
										'itemID': item.ItemID[0],
										'lineItemID': transaction.OrderLineItemID[0],
										'transactionID': transaction.TransactionID[0],
										'unitPrice': parseFloat(transaction.TransactionPrice[0]._),
										'currency': transaction.TransactionPrice[0].$,
										'sku': transaction.Variation ? transaction.Variation[0].SKU[0] : item.SKU[0],
										'shippingPrice': parseFloat(shipDetails.ShippingServiceOptions[0].ShippingServiceCost[0]._)
									};
									items.push(itemData);
				       	  	  }
				       	  	  entry.items = items;
					       	 
				       	  	  orderDataNew[storeID].push({store: storeID, data: entry});

				       	  	  var ordersInDBWhere = [];
								for (let storeID in orderDataNew) {
									let storeMS = conn.connection.escape(storeID);
									for (let order of orderDataNew[storeID]) {
										ordersInDBWhere.push('(store = '+storeMS+' AND orderID = '+conn.connection.escape(order.data.orderID)+')');
									}
								}

								//console.log(orderDataNew);

								var ordersInDB = await conn.query('SELECT id, store, orderID, data FROM orders'+(ordersInDBWhere.length ? ' WHERE '+ordersInDBWhere.join(' OR ') : ''));
								var orderListDB = {};

								for (let order of ordersInDB) {
									if (!orderListDB[order.store]) orderListDB[order.store] = {};
									orderListDB[order.store][order.orderID] = [order.id, JSON.parse(order.data)];
								}


								// Save orders into the database
								var transactionResult = await conn.transaction(async function() {
									var errorOccurred = false;

									saveOrdersLoop:
									for (let storeID in orderDataNew) {
										for (let order of orderDataNew[storeID]) {
											//console.log(order.data);
											// Check if the order already exists in the database
											if (orderListDB[order.store] && orderListDB[order.store][order.data.orderID]) {
												let orderListDBEntry = orderListDB[order.store][order.data.orderID];
												if (orderListDBEntry[1].orderPaymentStatus.toUpperCase() != 'PAID' && order.data.orderPaymentStatus.toUpperCase() == 'PAID') {
													// Order is now paid so update it
													let result = await conn.query('UPDATE orders SET data = '+conn.connection.escape(JSON.stringify(order.data))+' WHERE id = '+conn.connection.escape(orderListDBEntry[0])+';')
													.catch(err => {
														errorOccurred = err;
													});
												}
												else {
													// Skip the order so that it doesn't waste a row ID in the database
													continue;
												}
											}
											else {
												let result = await conn.query('INSERT IGNORE INTO orders (store, data, addedDate) VALUES ('+conn.connection.escape(order.store)+','+conn.connection.escape(JSON.stringify(order.data))+','+conn.connection.escape(dateToSql())+');')
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
					       	  
					       }

					       httpStatus = 200;
						   output.result = "success";
					   }catch(e){
					   		console.log(e);
					   }
					
					}
				})();		
		
			}catch (e) {
				// Error
				httpStatus = 503;
				output.result = e;
				console.log(e);
			}
		}

		//**********************************Customer Table********************************************
	  	// Updating customer table
	  	console.log("Updating customer table...");
	  	await (async function() {

	  		try{
	  			let attributesName = Config.attributesName;
	  			let day = moment().format('YYYYMMDD');
	  			let startDay = moment.tz(day, 'YYYYMMDD', Config.TIMEZONE).tz('UTC').format('YYYY-MM-DD')+' 00:00:00';
	  			let storeWHERE = '';
	  			if (store != 'all') {
	  				storeWHERE = ' store=' + store;
	  			} else {
	  				let stores = [];
	  				for (let storeID in Config.STORES) {
	  					if (Config.STORES[storeID].service == service) stores.push(storeID);
	  				}
	  				storeWHERE = '(' + stores.map(storeID => 'store=' + storeID).join(' OR ') + ')'
	  			}
	  			let orders = await conn.query('SELECT * FROM orders WHERE ' + storeWHERE + ' AND addedDate>' + conn.connection.escape(startDay));
				for (let order of orders) {
					let data = JSON.parse(order.data);
					//console.log(order.data);
					let customerID = conn.connection.escape(order.buyerID);
					let store = order.store;
					let date = moment.tz(order.addedDate, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('DD-MMM-YY');
					let orderID = order.id;
					let salesRecordID = order.salesRecordID;
					//let service = Config.STORES[store].service;
					
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
	

};

function dateToSql() {
	return (new Date()).toISOString().replace('T', ' ').replace('Z', '').slice(0, -4);
}

module.exports = downloadOrdersEbayApi;