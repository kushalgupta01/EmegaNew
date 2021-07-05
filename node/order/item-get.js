// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData} = require('./order-convert');

const getItem = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (method == 'get') {
				// Get orders
				let itemID = req.params.itemID || null;
				
				if (!itemID) {
					output.result = 'Invalid Sales Record Number.';
					break;
				}



				// Get order from the database
				await conn.connect();
				let item = await conn.query('SELECT * FROM items  WHERE itemNo = '+ itemID);

				if (!item) {
					httpStatus = 200;
					output.result = 'Item not found';
					output.orders = null;
					break;
				}
				

				output.item = item;
				output.result = 'success';
				httpStatus = 200;
			}
			
			else {
				output.result = 'wrong method';
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

module.exports = getItem;