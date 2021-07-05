// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const getInventoryDetail = async function(req, res, next) {
	var conn = new Database(dbconn);

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			let store = req.query.store || null;
			let sku = req.query.sku || null;
			await conn.connect();
			let inventory = await conn.query("select * from stockinventory where store = " + conn.connection.escape(store) + " and sku = " + conn.connection.escape(sku));

			if (inventory) {
				inventory[0].stockData = await conn.query("select * from stockinventory where sku = " + conn.connection.escape(sku));
			}
			for (let inv of inventory[0].stockData) {
				inv['locations'] = await conn.query('SELECT * FROM inventorylocation WHERE invID=' + inv.id);
			}
			
			output.inventory = inventory[0];
			output.result = 'success';

			httpStatus = 200;
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = JSON.stringify(e);
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

module.exports = getInventoryDetail;
