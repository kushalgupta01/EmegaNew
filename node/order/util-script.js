//  Discount Chemist
//  Order System

// Load records from the database
const Database = require('./connection');

const runScript = async function(req, res, next) {
	var conn = new Database(dbconn);
	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			await conn.connect();

			// Get orders
			var orders = await conn.query('SELECT * FROM orders');

			if (!orders.length) {
				httpStatus = 404;
				output.result = 'Could not load orders.';
				break;
			}


			var transactionResult = await conn.transaction(async function() {
				var errorOccurred = null;

				// Update orders in the database
				for (let order of orders) {
					var orderData = null;
					var replaceData = [];

					try {
						orderData = JSON.parse(order.data);
					} catch (e) {
						console.log('Could not parse order data for id: '+order.id);
						continue;
					}


					// Payment method
					if (!orderData.paymentMethod) continue;
					//console.log('Will change: '+order.id);
					//continue;

					/*if (!errorOccurred) {
						await conn.query('UPDATE orders SET data = JSON_REMOVE(data, \'$.paymentMethod\') WHERE id = '+conn.connection.escape(order.id))
						.catch(err => {
							errorOccurred = err;
						});
					}

					if (!errorOccurred) {
						await conn.query('UPDATE orders SET data = JSON_INSERT(data, \'$.PaymentMethod\', '+conn.connection.escape(orderData.paymentMethod)+') WHERE id = '+conn.connection.escape(order.id))
						.catch(err => {
							errorOccurred = err;
						});
					}*/

					// Record number
					//if (!orderData.recordNum) continue;
					//console.log('Will change: '+order.id);
					//continue;

					/*if (!errorOccurred) {
						await conn.query('UPDATE orders SET data = JSON_REMOVE(data, \'$.recordNum\') WHERE id = '+conn.connection.escape(order.id))
						.catch(err => {
							errorOccurred = err;
						});
					}

					if (!errorOccurred) {
						await conn.query('UPDATE orders SET data = JSON_INSERT(data, \'$.SalesRecordID\', '+conn.connection.escape(orderData.recordNum)+') WHERE id = '+conn.connection.escape(order.id))
						.catch(err => {
							errorOccurred = err;
						});
					}*/

					if (errorOccurred) {
						httpStatus = 503;
						output.result = errorOccurred;
						conn.rollback(errorOccurred);
						return false;
					}
				}

				var commitResult = await conn.commit();
				if (!commitResult) {
					httpStatus = 503;
					output.result = 'Could not commit transaction.';
					return false;
				}
				return true;
			});

			if (transactionResult) {
				httpStatus = 200;
				output.result = 'success';
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

module.exports = runScript;
