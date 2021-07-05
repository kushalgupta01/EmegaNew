// Discount Chemist
// Order System

// Upload order tracking details to WooCommerce

const {Config} = require('./config');
const WooCommerceClient = require('./woocommerce-client');

const uploadTrackingWooCommerce = async function(storeID, orders) {
	let WooCommerce = new WooCommerceClient({
		url: Config.STORES[storeID].url,
		consumerKey: Config.STORES[storeID].consumerKey,
		consumerSecret: Config.STORES[storeID].consumerSecret,
		wpAPI: true,
		version: 'wc/v2'
	});

	let trackingList = [];
	for (let orderEntry of orders) {
		trackingList.push(WooCommerce.post('orders/'+orderEntry.orderID+'/shipment-trackings', {tracking_provider: orderEntry.postageCourier, tracking_number: orderEntry.trackingID}));
	}
	await Promise.all(trackingList);
}

module.exports = uploadTrackingWooCommerce;
