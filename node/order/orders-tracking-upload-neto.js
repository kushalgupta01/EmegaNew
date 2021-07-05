const {Config} = require('./config');
const { NetoAPI } = require("neto-api");

const uploadTrackingNeto = async function(storeID, orders) {

	const mySite = new NetoAPI({
	    url: "https://www.hobbyco.com.au/",
	    key: Config.STORES[storeID].apiKey,
	});

	let trackingList = [];
	for (let orderEntry of orders) {

        let skus = orderEntry.skus;

		let orderlines = [];

		for (let sku of skus) {
			let orderline = {};
			orderline['SKU'] = sku;
			orderline['TrackingDetails'] = {};
			orderline['TrackingDetails']['ShippingMethod'] = orderEntry.postageCourier;
			orderline['TrackingDetails']['TrackingNumber'] = orderEntry.trackingID;

			orderlines.push(orderline);
		}
		
		trackingList.push(mySite.order
		  .update({ Order: 
		  	         
						 {
						  	 "OrderID": orderEntry.orderID,
							 "OrderStatus": "Dispatched",
							 "OrderLine": orderlines,
					     }
					
		   })
		  .exec()
		  .then(response => {
		    console.log(response);
		  })
		  .catch(err => {
		  	console.log(err);
		  }));
	}
	await Promise.all(trackingList);
}

module.exports = uploadTrackingNeto;