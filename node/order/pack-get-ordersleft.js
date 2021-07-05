//  Discount Chemist
//  Order System


const Database = require('./connection');
const {Config} = require('./config');
const orderTypes = [1, 2, 8, 9, 12, 3, 4, 5, 15];

const getOrdersLeft = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();


	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			let ordersLeft = {};
			await conn.connect();
			for (let store in Config.STORES) {
				ordersLeft[store] = {};
				for (let orderType of orderTypes) {
					let sql = 'SELECT COUNT(*) FROM collecting c, orders o WHERE c.orderID = o.id AND ( c.status = 2 OR c.status = 9 OR c.status = 10) AND o.store = ' + store + ' AND c.type = ' + orderType;
					let count = await conn.query(sql);
					ordersLeft[store][orderType] = count[0]['COUNT(*)'];
				}
			}

			output.ordersLeft = ordersLeft;
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

module.exports = getOrdersLeft;