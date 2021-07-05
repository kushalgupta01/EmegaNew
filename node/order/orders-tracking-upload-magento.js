const {Config} = require('./config');
const request = require('request');

const uploadTrackingMagento = async function(storeID, orders) {
	let trackingList = [];
	for (let orderEntry of orders) {
		const options = {
		  url: Config.STORES[storeID].url + '/rest/V1/order/'+orderEntry.orderID+'/ship',
		  headers: {
		    'Content-Type': 'application/json',
		    'Authorization': 'Bearer ' + Config.STORES[storeID].AccessToken,
		  },
		  body: JSON.stringify({
		  	"tracks": [{
				"track_number": orderEntry.trackingID,
				"title": orderEntry.postageCourier,
				"carrier_code": orderEntry.postageCourier
			}]
		  })
		};
	
		trackingList.push(request.post(options)); 
	}

	await Promise.all(trackingList);
}

module.exports = uploadTrackingMagento;