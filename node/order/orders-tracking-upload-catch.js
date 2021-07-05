const {Config} = require('./config');
const request = require('request');

const uploadTrackingCatch = async function(storeID, orders) {
	let trackingList = [];

	for (let orderEntry of orders) {
		let carrierCode = "";
		if(orderEntry.postageCourier == "Fastway Couriers"){
			carrierCode = "FC";
		} else {
			carrierCode = "AUSPOST";
		}

		const options = {
		  url: Config.STORES[storeID].url + '/api/orders/'+orderEntry.orderID+'/tracking',
		  headers: {
			'Content-Type': 'application/json',
			'Authorization': Config.STORES[storeID].apiKey,
		  },
		  body: JSON.stringify({
			"carrier_code": carrierCode,
			"carrier_name": orderEntry.postageCourier,
			"tracking_number": orderEntry.trackingID
		  })
		};
	
		trackingList.push(request.put(options)); 
	}

	await Promise.all(trackingList);
}

module.exports = uploadTrackingCatch;