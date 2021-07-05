//  Discount Chemist
//  Order System

const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const addOrder = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			if (method == 'post') {
				var data = req.body.data;
				var store = req.body.store;
			}

			var dataObj = JSON.parse(data);
			var salesRecordID = dataObj.SalesRecordID;

			await conn.connect();

			let result = await conn.query('select 1 from orders where store=' + conn.connection.escape(store) + ' and salesRecordID=' +
				conn.connection.escape(salesRecordID));

			if (result.length > 0) {
				output.result = 'Order exists.';
				break;
			}
			
			await conn.query('INSERT INTO orders (store, data, addedDate) values (' + conn.connection.escape(store) + ', ' + conn.connection.escape(data) + ', ' + conn.connection.escape(dateToSql()) + ')');
				
			//**********************************Customer Table********************************************
		  	// Updating customer table
		  	/*console.log("Updating customer table...");
		  	await (async function() {

		  		try{
		  			let attributesName = Config.attributesName;
		  			let day = moment().format('YYYYMMDD');
		  			let startDay = moment.tz(day, 'YYYYMMDD', Config.TIMEZONE).tz('UTC').format('YYYY-MM-DD')+' 00:00:00';
		  			let orders = await conn.query('SELECT * FROM orders WHERE store=21 AND addedDate>' + conn.connection.escape(startDay));
					for (let order of orders) {
						let data = JSON.parse(order.data);
						//console.log(order.data);
						let customerID = conn.connection.escape(order.buyerID);
						let store = order.store;
						let date = moment.tz(order.addedDate, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('DD-MMM-YY');
						let orderID = order.id;
						let salesRecordID = order.salesRecordID;
						let service = Config.STORE[store].service;
						
						let fullname = '';
						let address1 = '';
						let address2 = '';
						let suburb = '';
						let state = '';
						let postcode = '';
						let country = '';
						let phone = '';
						let email = '';

						if (store == 21) {
							fullname = data[attributesName[service]['fullName']];
							address1 = data[attributesName[service]['address1']];
							address2 = data[attributesName[service]['address2']];
							suburb = data[attributesName[service]['suburb']];
							state = data[attributesName[service]['state']];
							postcode = data[attributesName[service]['postcode']];
							country = data[attributesName[service]['country']];
							phone = data[attributesName[service]['phone']];
							email = data[attributesName[service]['email']];
						} 

						
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

						let existCustomer = await conn.query('SELECT orders FROM customers WHERE store = ' + conn.connection.escape(store) + ' AND customerID = ' + customerID)
						if (existCustomer.length==1){
							let orderIDs = JSON.parse(existCustomer[0].orders);
							if (orderIDs.hasOwnProperty(orderID)) {
								continue;
							}else{
								let newOrderID = {};
								newOrderID[orderID] = {'date': date, 'srn': salesRecordID};
								orderIDs = Object.assign(orderIDs, newOrderID);
								await conn.query(`UPDATE customers set orders = ${conn.connection.escape(JSON.stringify(orderIDs))} WHERE store = ${conn.connection.escape(store)} AND customerID = ${customerID}`);

								if (fullname != '' && address1 != '') {
									await conn.query(`UPDATE customers set fullname = ${fullname}, address1 = ${address1}, address2 = ${address2},`+
										`suburb = ${suburb}, state = ${state}, postcode = ${postcode}, country = ${country}, phone = ${phone}, email = ${email}`+
										` WHERE store = ${conn.connection.escape(store)} AND customerID = ${customerID}`);
								}

								console.log(`Customer ${customerID} updated`);
							}
						}else if (existCustomer.length==0){
							
							let orderIDs = {};
							orderIDs[orderID] = {'date': date, 'srn': salesRecordID};

							await conn.query(`INSERT INTO customers (customerID, store, orders, fullname, address1, address2, suburb, state, postcode, country, phone, email)  VALUES ` +  
							   `(${customerID}, ${store}, ${conn.connection.escape(JSON.stringify(orderIDs))}, ${fullname}, ${address1}, ${address2}, ${suburb}, ${state} ,${postcode}, ${country}, ${phone}, ${email})`);
							console.log(`Customer ${customerID} inserted`);
						}
					}
				}catch(e){
					console.log(e);
				}
				
			})();*/

			output.result = 'success';
			httpStatus = 200;
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
		console.log(e);
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

function dateToSql2() {
	let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    let localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
	return localISOTime.replace('T', ' ').replace('Z', '').slice(0, -4);
}

function dateToSql() {
	return (new Date()).toISOString().replace('T', ' ').replace('Z', '').slice(0, -4);
}

module.exports = addOrder;