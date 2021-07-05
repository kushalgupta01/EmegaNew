// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const { userCheckToken } = require('./users-token');

const getInventory = async function(req, res, next) {
	var conn = new Database(dbconn);
	var token = req.header(Config.ACCESS_TOKEN_HEADER) || null;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Check token
			let user = await userCheckToken(token, true);

			if (!user) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			await conn.connect();
			let sqlStores = "select * from store_clients where client_id = " + user.id;
			console.log(sqlStores);
			let rsStores = await conn.query(sqlStores);
			let store_ids = [];

			for (let store of rsStores) {
				store_ids.push(store.store_id);
			}

			let sqlInventory = "select * from stockinventory where store in (" + store_ids.join(',') + ")";
			console.log(sqlInventory);

			let inventory = await conn.query(sqlInventory);

			for (let inv of inventory) {
				inv['locations'] = await conn.query('SELECT * FROM inventorylocation WHERE invID=' + inv.id);
			}

			output.inventory = inventory;
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

module.exports = getInventory;
