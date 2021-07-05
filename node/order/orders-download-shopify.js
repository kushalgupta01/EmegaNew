const {Config} = require('./config');
const Database = require('./connection');
const Shopify = require('shopify-api-node');
const moment = require('moment-timezone');

const downloadOrdersShopify = async function(req, res, next) {
	var conn = new Database(dbconn);

	var service = req.params.service;
	var store = req.params.store || null;
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
			// Download latest orders
			let orderStores = [];
			let orderData = [];

			for (let storeID in Config.STORES) {
				if ((!storeAll && storeID != store) || Config.STORES[storeID].service != service) continue;

				const shopify = new Shopify({
				    shopName: Config.STORES[storeID].shopName,
				    apiKey: Config.STORES[storeID].apiKey,
				    password: Config.STORES[storeID].password
				});

				orderStores.push(storeID);
				
				let d = new Date();
				d.setDate(d.getDate()-31);

				var date = d.getDate();
				if (date < 10) {
					date = "0" + date;
				}

				var mon = d.getMonth()+1;
				if (mon < 10) {
					mon = "0" + mon;
				}

				var year = d.getFullYear();

				let dateStr = year + '-' + mon + '-' + date + 'T00:00:00-00:00'
				
				orderData.push(shopify.order.list({
					status: 'open',
					financial_status: 'paid',
					fulfillment_status: 'unshipped',
					updated_at_min: dateStr,
					limit: 250,
				}));
			}

			// Wait for order data to be retrieved
			orderData = await Promise.all(orderData);
			//console.log(orderData);
			let noOrder = true;
			for (let storeOrders of orderData) {
				if (storeOrders.length != 0) {
					noOrder = false;
				}
			}

			if (noOrder) {
				output = {result: 'No Orders'};
				httpStatus = 404;
				break;
			}

			// Process orders
			let orderDataNew = {};

			for (let i = 0; i < orderStores.length; i++) {
				orderDataNew[orderStores[i]] = [];
				for (let order of orderData[i]) {
					// Add required extra details
					order.orderID = order.id;
					order.SalesRecordID = order.order_number;
					order.buyerID = order.customer.id;
					order.createdDate = order.created_at.replace('+11:00','.000Z');
					order.postage = 0;
					order.postage_service = order.shipping_lines[0] ? order.shipping_lines[0].code : '';
					orderDataNew[orderStores[i]].push(order);
				}
			}


			await conn.connect();

			// Check if orders exist in the database
			let ordersInDBWhere = [];
			for (let storeID in orderDataNew) {
				let storeMS = conn.connection.escape(storeID);
				for (let order of orderDataNew[storeID]) {
					ordersInDBWhere.push('(store = '+storeMS+' AND orderID = '+conn.connection.escape(order.orderID)+')');
				}
			}

			let ordersInDB = await conn.query('SELECT id, store, orderID, data FROM orders'+(ordersInDBWhere ? ' WHERE '+ordersInDBWhere.join(' OR ') : ''));
			let orderListDB = {};

			for (let order of ordersInDB) {
				if (!orderListDB[order.store]) orderListDB[order.store] = {};
				orderListDB[order.store][order.orderID] = order.id;
			}


			// Save orders into the database
			let transactionResult = await conn.transaction(async function() {
				var errorOccurred = false;

				saveOrdersLoop:
				for (let storeID in orderDataNew) {
					for (let order of orderDataNew[storeID]) {
						// Check if the order already exists in the database, so not to waste a row ID in the database
						if (!orderListDB[storeID] || !orderListDB[storeID].hasOwnProperty(order.orderID)) {
							let result = await conn.query('INSERT IGNORE INTO orders (store, data, addedDate) VALUES ('+conn.connection.escape(storeID)+','+conn.connection.escape(JSON.stringify(order))+','+conn.connection.escape(dateToSql())+');')
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
		catch (e) {
			// Error
			httpStatus = 503;
			output.result = e;
			console.log(e);
		}

		//**********************************Customer Table********************************************
	  	// Updating customer table
	  	//console.log("Updating customer table...");
	  	/*await (async function() {

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

					
					let shipping = data['shipping_address'];
					fullname = shipping[attributesName[service]['fullName']];
					address1 = shipping[attributesName[service]['address1']];
					address2 = shipping[attributesName[service]['address2']];
					suburb = shipping[attributesName[service]['suburb']];
					state = shipping[attributesName[service]['state']];
					postcode = shipping[attributesName[service]['postcode']];
					country = shipping[attributesName[service]['country']];
					phone = shipping[attributesName[service]['phone']];
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
			
		})();*/
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

function dateToSql() {
	return (new Date()).toISOString().replace('T', ' ').replace('Z', '').slice(0, -4);
}

module.exports = downloadOrdersShopify;