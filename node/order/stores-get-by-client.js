// Discount Chemist
// Order System

// Get store list

const { Config } = require('./config');
const Database = require('./connection');

const storesGetByClient = async function (req, res, next) {
	var conn = new Database(dbconn);

	var output = {result: null};
	var httpStatus = 400;
	var clientId = req.params.client || null;

	if (!clientId) {
		httpStatus = 500;
		output.result = 'Could not update orders in the database';
	} else {
		await conn.connect();

		let sqlStores = "select * from store_clients where client_id = " + clientId;
		let rsStores = await conn.query(sqlStores);

		var stores = [];

		for(let store of rsStores) {
			const storeID = store.store_id;
			if (Config.STORES.hasOwnProperty(storeID)) {
				stores.push({
					id: storeID,
					name: Config.STORES[storeID].name,
					storeID: Config.STORES[storeID].storeID,
					service: Config.STORES[storeID].service,
				});
			}
		}

		httpStatus = 200;
		output.result = stores;

		res.set({
			'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
			'Pragma': 'no-cache',
		});
	}

	res.json(httpStatus, output);
	next();
}

module.exports = storesGetByClient;
