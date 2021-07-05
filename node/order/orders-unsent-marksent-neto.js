const {Config} = require('./config');
const { NetoAPI } = require("neto-api");

const markOrdersSentNeto = async function(storeID, orders) {
	// Prepare data
	let data = [];

	const mySite = new NetoAPI({
	  url: "https://www.hobbyco.com.au/",
	  key: Config.STORES[storeID].apiKey,
	  //user: "user" // optional
	});

	for (let orderEntry of orders) {
		data.push(mySite.order
		  .update({ Order: 
		  	         
						 {
						  	 "OrderID": orderEntry.orderID,
							 "OrderStatus": "Dispatched", 
					     }
					
		   })
		  .exec()
		  .then(response => {
		    return response.Order;
		  })
		  .catch(err => {
		  	console.log(err);
		  })
		);
	}
		
	// Update the orders
	await Promise.all(data);
}

module.exports = markOrdersSentNeto;