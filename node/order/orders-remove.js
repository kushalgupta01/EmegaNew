// Discount Chemist
// Order System

// Cancel/delete orders from database

const Database = require('./connection');

const removeOrders = async function(req, res, next) {
	var conn = new Database(dbconn);
	var orderListData = req.body.orders || null;
	var deleteOrders = false; // !!req.query.delete

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			await conn.connect();
			
			let orderListArray = [];

			try {
				orderListData = JSON.parse(orderListData);
				for (let entry of orderListData) {
					orderListArray.push(conn.connection.escape(entry));
				}
			}
			catch (e) {
				output.result = 'Invalid order data.';
				break;
			}


			let result = null;
			if (deleteOrders) {
				// Delete orders from the database
				result = await conn.query('DELETE FROM orders WHERE id IN ('+orderListArray.join(',')+') AND sent = 0');
			}
			else {
				// Mark orders as cancelled in the database
				result = await conn.query('UPDATE orders SET cancelled = 1 WHERE id IN ('+orderListArray.join(',')+') AND sent = 0 AND cancelled = 0');
			}

			if (result.affectedRows > 0) {
				httpStatus = 200;
				output.result = 'success';
			}
			else {
				httpStatus = 503;
				output.result = 'Orders do not exist in the database or have already been deleted.';
			}
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = removeOrders;
