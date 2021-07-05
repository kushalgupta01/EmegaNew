// Discount Chemist
// Order System

// Mark WooCommerce orders as completed

const {Config} = require('./config');
const WooCommerceClient = require('./woocommerce-client');

const markOrdersSentWooCommerce = async function(storeID, orders) {
	// Prepare data
	let data = [];
	for (let orderEntry of orders) {
		data.push({id: orderEntry.orderID, status: 'completed'}); //orderEntry.trackingID
	}

	// Update the orders
	let WooCommerce = new WooCommerceClient({
		url: Config.STORES[storeID].url,
		consumerKey: Config.STORES[storeID].consumerKey,
		consumerSecret: Config.STORES[storeID].consumerSecret,
		wpAPI: true,
		version: 'wc/v2'
	});

	await WooCommerce.post('orders/batch', {update: data});
}

module.exports = markOrdersSentWooCommerce;
