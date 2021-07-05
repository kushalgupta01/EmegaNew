
const Database = require('./connection');
 
const userOrderTrackingStatus = async function(req, res, next) {
	let conn = new Database(dbconn);
	let orderid = req.query.orderNo || null;
	let output = {result: null};
	let httpStatus = 400;
	try {
		do{
			if(orderid != null){			
				let orderData = null;
				await conn.connect();
				let method = req.method.toLowerCase();
				if (method == 'get') {
					orderData = await conn.query("SELECT status, trackingID FROM collecting WHERE orderID='"+orderid+"'");
					if(orderData != null){
						output.result = "success";
						httpStatus = 200;
						let orderStatus="";	let trackingId="";			
						if(orderData[0].status != null){
							switch(orderData[0].status){									
								case 0 : orderStatus = "New Order"; break;
								case 1 : orderStatus = "COLLECTED"; break;
								case 2 : orderStatus = "COLLECTED"; break;
								case 3 : orderStatus = "PACKED"; break;
								case 4 : orderStatus = "PACKED"; break;
								case 5 : orderStatus = "PACKED"; break;
								case 6 : orderStatus = "PACKED"; break;
								case 7 : orderStatus = "PACKED"; break;
								case 8 : orderStatus = "OVERRIDE"; break;
							}
						}					
						if(orderData[0].trackingID != null){
							trackingId = orderData[0].trackingID.replace(/\"/g, "").replace(/[\[\]']+/g, "");
						}						
						output.orderData = {
							orderStatus : orderStatus,
							trackingId : trackingId
						}; 
					}else{
							output.result = 'No data for order id : '+orderid;
							output.status = 204;
						}
				}else{
					output.result = 'Method not allowed';
					output.status = 405;
					httpStatus = 405;
				}
			}else{
				output.result = 'Invalid data.';
			}
		}while(0);
	}catch(e){
		// Error
		httpStatus = 503;
		output.result = e;
		console.log(e);
	}
	
	if (conn.connected) conn.release();
	
	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = userOrderTrackingStatus;