const {Config} = require('./config');
const request = require('request');
const moment = require('moment-timezone');

const uploadTrackingKogan = async function(storeID, orders) {
	let trackingList = [];

	for (let orderEntry of orders) {
		let itemsData = orderEntry.itemsData;
		const now = Date.now();
		let items = [];

		var i = 0;
		for (let data of itemsData) {
			let item = {};
			item['OrderItemID'] = i;
			item['SellerSku'] = data.sku;
			item['Quantity'] = data.quantity;
			item['ShippedDateUtc'] = moment.tz(now, 'UTC').format();
			item['TrackingNumber'] = orderEntry.trackingID;
			item['ShippingCarrier'] = orderEntry.postageCourier;
			item['ShippingClass'] = '';

			items.push(item);
			i++;
		}

		const options = {
			url: Config.STORES[storeID].url + '/api/marketplace/orders/fulfill',
			headers: {
			  'Content-Type': 'application/json',
			  'SellerID': Config.STORES[storeID].username,
			  'SellerToken': Config.STORES[storeID].password,
			},
			body: JSON.stringify([{
				"ID": orderEntry.orderID,
				"Items": items
			}])
		};
	
		trackingList.push(request.post(options), function optionalCallback(err, httpResponse, body) {
			console.log(body);
		}); 
	}

	await Promise.all(trackingList);
}

module.exports = uploadTrackingKogan;