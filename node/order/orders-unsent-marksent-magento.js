const {Config} = require('./config');
const request = require('request');

const markOrdersSentMagento = async function(storeID, orders) {
	// Prepare data
	let data = [];
	for (let orderEntry of orders) {
		const options = {
		  url: Config.STORES[storeID].url + '/rest/V1/orders',
		  headers: {
		    'Content-Type': 'application/json',
		    'Authorization': 'Bearer ' + Config.STORES[storeID].AccessToken,
		  },
		  body: JSON.stringify({
		  	"entity": {
				"entity_id": getEntityID(orderEntry.orderID),
				"status": "complete",
				"increment_id": orderEntry.orderID
			}
		  })
		};
	
		data.push(request.post(options)); 
	}

	// Update the orders
	await Promise.all(data);
}

function getEntityID(id) {
	let start = 0;
	for (let i=0; i<id.length; i++) {
		if (id[i] != '0') {
			return id.substring(i);
		}
	}
}

module.exports = markOrdersSentMagento;