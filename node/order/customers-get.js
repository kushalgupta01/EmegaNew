//  Discount Chemist
//  Order System

// Get customers from the database
const Database = require('./connection');
const {Config} = require('./config');
const moment = require('moment-timezone');
const {userCheckToken} = require('./users-token');

const getCustomers = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var repeat = false;
	var today = false;
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
				repeat = req.body.repeat || '';
				today = req.body.today || '';
				srn = req.body.srn || '';
			}

			await conn.connect();

			let todayDate = getTodayDate();

			if (repeat) {
				customers = await conn.query('SELECT * FROM customers WHERE JSON_LENGTH(orders) > 1');
			} else {
				customers = await conn.query('SELECT * FROM customers');	
			}


			let customersToday = [];
			if (today) {
				for (let customer of customers) {
					let orderDates =JSON.parse(customer.orders);
					//console.log(orderDates);
					let isToday = false;
					let d = new Date(getTodayDate());
					let five_days_ago = d.setDate(d.getDate()-5);;
					for (let orderDate in orderDates) {
						let date = new Date(orderDates[orderDate].date);
						if (date > five_days_ago) {
							isToday = true;
							/*console.log(date+'  '+five_days_ago);
							console.log(date>five_days_ago);*/
							break;
						}
						
					}
					if (isToday) customersToday.push(customer);
				}
			}else{
				customersToday = customers;
			}

			//console.log(customersToday);

			// Remove duplicate orders
			let newCustomers = [];
			for (let customer of customersToday) {
				let orderDates = Object.values(JSON.parse(customer.orders));
				let duplicate = true;
				let firstdate = orderDates[0]['date'];
				for (let i=1; i<orderDates.length; i++) {
					if (orderDates[i]['date'] != firstdate) duplicate = false;
				}
				if (!duplicate) newCustomers.push(customer);
			}

			//console.log(newCustomers);

				

			//console.log(itemRows);
			if (!newCustomers.length) {
				httpStatus = 404;
				output.result = 'No cutomers found.';
				break;
			}
			

			output.data = newCustomers;
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

function getTodayDate() {
	let today = new Date();
	let Mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	let todayDate = (today.getDate() < 10 ? '0'+ today.getDate() : today.getDate()) + '-' + Mon[today.getMonth()] + '-' + (today.getFullYear()-2000);
	return todayDate;
}

module.exports = getCustomers;
