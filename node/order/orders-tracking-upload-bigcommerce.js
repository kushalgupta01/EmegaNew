// Discount Chemist
// Order System

// Upload order tracking details to WooCommerce

const {Config} = require('./config');
const BigCommerce = require('node-bigcommerce');

const uploadTrackingBigCommerce = async function(storeID, orders) {

	let bigCommerce = await new BigCommerce({
		clientId: Config.STORES[storeID].clientId,
		accessToken: Config.STORES[storeID].accessToken,
		storeHash: Config.STORES[storeID].storeHash,
		responseType: 'json'
	});

	let trackingList = [];
	for (let orderEntry of orders) {
		let data = {};
		data["tracking_number"] = orderEntry.trackingID;
		data["shipping_provider"] =  orderEntry.postageCourier;
		data["order_address_id"] = orderEntry.shipping_address_id;
		data["items"] = orderEntry.itemsData;
		//console.log(JSON.stringify(data));
		trackingList.push(bigCommerce.post('/orders/'+orderEntry.orderID+'/shipments', data));
	}
	await Promise.all(trackingList);
}

module.exports = uploadTrackingBigCommerce;