const {Config} = require('./config');
const request = require('request');

const markOrdersSentCatch = async function(storeID, orders) {
	// Prepare data
	let data = [];
	for (let orderEntry of orders) {
		const options = {
		  url: Config.STORES[storeID].url + '/api/orders/' + orderEntry.orderID + '/ship',
		  headers: {
			'Content-Type': 'application/json',
			'Authorization': Config.STORES[storeID].apiKey,
		  }
		};
	
		data.push(request.put(options)); 
	}

	// Update the orders
	await Promise.all(data);
}

module.exports = markOrdersSentCatch;