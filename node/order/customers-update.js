const moment = require('moment-timezone');
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const UpdateCustomers = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	var output = {result: null};
	var httpStatus = 400;

	var attributesName = Config.attributesName;

	try {
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			await conn.connect();

			let orders = await conn.query('SELECT o.* FROM orders o, collecting c where o.id=c.orderID and c.status != 5 and c.status != 6 and c.status != 7');
			for (let order of orders) {
				let data = JSON.parse(order.data);
				//console.log(order.data);
				let customerID = conn.connection.escape(order.buyerID);

				let store = order.store;
				let service = Config.STORES[store].service;
				/*if (service==8 && customerID.slice(3,4)=="0") {
					continue;
				}*/
				let date = moment.tz(order.addedDate, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('DD-MMM-YY');
				let orderID = order.id;
				let salesRecordID = order.salesRecordID;
			
				
				let fullname = '';
				let address1 = '';
				let address2 = '';
				let suburb = '';
				let state = '';
				let postcode = '';
				let country = '';
				let phone = '';
				let email = '';

				if (service != 3 && service != 8 && service != 9 && service != 10) {
					fullname = data[attributesName[service]['fullName']];
					address1 = data[attributesName[service]['address1']];
					address2 = data[attributesName[service]['address2']];
					suburb = data[attributesName[service]['suburb']];
					state = data[attributesName[service]['state']];
					postcode = data[attributesName[service]['postcode']];
					country = data[attributesName[service]['country']];
					phone = data[attributesName[service]['phone']];
					email = data[attributesName[service]['email']];
					paymentStatus = data[attributesName[service]['PaymentStatus']];
				} else if (service == 3) {
					let shipping = data['shipping'];
					let billing = data['billing'];
					fullname = shipping[attributesName[service]['fullName']];
					address1 = shipping[attributesName[service]['address1']];
					address2 = shipping[attributesName[service]['address2']];
					suburb = shipping[attributesName[service]['suburb']];
					state = shipping[attributesName[service]['state']];
					postcode = shipping[attributesName[service]['postcode']];
					country = shipping[attributesName[service]['country']];
					phone = billing[attributesName[service]['phone']];
					email = billing[attributesName[service]['email']];
				} else if (service == 8) {
					let shipping = data['shipping_address'];
					fullname = shipping[attributesName[service]['fullName']];
					address1 = shipping[attributesName[service]['address1']];
					address2 = shipping[attributesName[service]['address2']];
					suburb = shipping[attributesName[service]['suburb']];
					state = shipping[attributesName[service]['state']];
					postcode = shipping[attributesName[service]['postcode']];
					country = shipping[attributesName[service]['country']];
					phone = shipping[attributesName[service]['phone']];
					email = shipping[attributesName[service]['email']];
				} else if (service == 9) {
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
				} else if (service == 10) {
					let shipping = data['shippingAddress'];
					fullname = shipping[attributesName[service]['fullName']];
					address1 = shipping[attributesName[service]['address1']];
					address2 = shipping[attributesName[service]['address2']];
					suburb = shipping[attributesName[service]['suburb']];
					state = shipping[attributesName[service]['state']];
					postcode = shipping[attributesName[service]['postcode']];
					country = shipping[attributesName[service]['country']];
					phone = shipping[attributesName[service]['phone']];
					email = shipping[attributesName[service]['email']];
				}

				
				if (fullname == '' && address1 == '') continue;
				//console.log(paymentStatus);
				if (store==1 && paymentStatus != 'PAID') continue;

				fullname = conn.connection.escape(fullname);
				address1 = conn.connection.escape(address1);
				address2 = conn.connection.escape(address2);
				suburb = conn.connection.escape(suburb);
				state = conn.connection.escape(state);
				postcode = conn.connection.escape(postcode);
				country = conn.connection.escape(country);
				phone = conn.connection.escape(phone);
				email = conn.connection.escape(email);

				let existCustomer = await conn.query('SELECT id, orders FROM customers WHERE store = ' + store + ' AND customerID = ' + customerID + ' AND address1 = ' + address1 + ' AND address2 = ' + address2);
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

						/*if (fullname != '' && address1 != '') {
							await conn.query(`UPDATE customers set fullname = ${fullname}, address1 = ${address1}, address2 = ${address2},`+
								`suburb = ${suburb}, state = ${state}, postcode = ${postcode}, country = ${country}, phone = ${phone}, email = ${email}`+
								` WHERE id = ${id}`);
						}*/

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


module.exports = UpdateCustomers;