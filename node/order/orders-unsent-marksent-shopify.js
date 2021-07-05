const {Config} = require('./config');
const Shopify = require('shopify-api-node');

const markOrdersSentShopify = async function(storeID, orders) {
	// Prepare data
	let data = [];
	const shopify = new Shopify({
	    shopName: Config.STORES[storeID].shopName,
	    apiKey: Config.STORES[storeID].apiKey,
	    password: Config.STORES[storeID].password
	});
	for (let orderEntry of orders) {
		data.push(shopify.order.update(orderEntry.orderID, {"fulfillment_status": "fulfilled"}));
	}

	// Update the orders
	await Promise.all(data);
}

module.exports = markOrdersSentShopify;