// Mark BigCommerce orders as completed

const {Config} = require('./config');
const BigCommerce = require('node-bigcommerce');

const markOrdersSentBigCommerce = async function(storeID, orders) {
	// Prepare data
	let data = [];
	let bigCommerce = await new BigCommerce({
		clientId: Config.STORES[storeID].clientId,
		accessToken: Config.STORES[storeID].accessToken,
		storeHash: Config.STORES[storeID].storeHash,
		responseType: 'json'
	});
	for (let orderEntry of orders) {
		data.push(bigCommerce.put('/orders/'+orderEntry.orderID, {"status_id": 2})); 
	}

	// Update the orders
	await Promise.all(data);
}

module.exports = markOrdersSentBigCommerce;