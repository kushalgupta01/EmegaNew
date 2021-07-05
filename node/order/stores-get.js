// Discount Chemist
// Order System

// Get store list

const {Config} = require('./config');

const storesGet = async function(req, res, next) {
	var output = {result: null};
	var httpStatus = 400;
	var storeList = {};

	for (let storeID in Config.STORES) {
		storeList[storeID] = {
			id: Config.STORES[storeID].id,
			name: Config.STORES[storeID].name,
			storeID: Config.STORES[storeID].storeID,
			service: Config.STORES[storeID].service,
		}
	}

	httpStatus = 200;
	output.result = storeList;

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = storesGet;
