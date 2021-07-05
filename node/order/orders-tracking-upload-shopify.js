const {Config} = require('./config');
const rp = require('request-promise');

const uploadTrackingShopify = async function(storeID, orders) {

	var options = {
		method: 'POST',
	    auth: {
	       'user': Config.STORES[storeID].apiKey,
	       'pass': Config.STORES[storeID].password
	    },
	    headers: {
	        'User-Agent': 'Request-Promise',
	        'Content-Type': 'application/json'
	    },
	    json: true 
	};
	

	for (let orderEntry of orders) {
		
		options['uri'] = 'https://'+Config.STORES[storeID].shopName+'.myshopify.com/admin/api/2020-10/orders/'+ orderEntry.orderID +'/fulfillments.json';
		
		options['body'] = {
			"fulfillment": {
			    "location_id": Config.STORES[storeID].locationID,
			    "service": "manual",
			    "tracking_number": orderEntry.trackingID,
			    "tracking_company": orderEntry.postageCourier
			 }
		};
		
		await rp(options).catch(err=> console.log(err));
	}
	
}

module.exports = uploadTrackingShopify;