
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
 
const buyerDetails = async function(req, res, next) {
	var conn = new Database(dbconn);
	var token = req.header(Config.ACCESS_TOKEN_HEADER) || null;
	var output = {result: null};
	var httpStatus = 400;
	let orderid = null;
	try {
		do {
			let user = await userCheckToken(token, true);
			
			if (!user) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}
			else if (user.type != Config.USER_TYPE.ADMIN && user.type != Config.USER_TYPE.USER && user.type != Config.USER_TYPE.SUPPLIER && user.type != Config.USER_TYPE.CLIENT) {
				httpStatus = 403;
				output.result = 'Action not allowed.';
				break;
			}
			
			orderid = req.query.orderid;
			
			if(orderid){
				let orderData = null;
				await conn.connect();
				let method = req.method.toLowerCase();
				if (method == 'get') {
					orderData = await conn.query('SELECT o.id, o.data -> "$.SalesRecordID" recordId, o.data -> "$.OrderID" orderId, o.data -> "$.SalesChannel" channel, o.data -> "$.DateInvoiced" purchaseDate, c.type, c.status, c.trackingID FROM orders o, collecting c WHERE o.orderID = '+conn.connection.escape(orderid)+' AND o.id = c.orderID');
					if(orderData != null){
						output.result = "success";
						httpStatus = 200;
						let id = ""; let recordId=""; let orderID=""; let channel=""; let purchaseDate = null; let trackingId="";let orderType ="";
						let orderStatus="";
						if(orderData[0].id != null){
							id = orderData[0].id;
						}
						if(orderData[0].recordId != null){
							recordId = orderData[0].recordId.replace(/\"/g, "");
						}
						if(orderData[0].orderId != null){
							orderId = orderData[0].orderId.replace(/\"/g, "");
						}						
						if(orderData[0].channel != null){
							channel = orderData[0].channel.replace(/\"/g, "");
						}
						if(orderData[0].purchaseDate != null){
							purchaseDate = orderData[0].purchaseDate.replace(/\"/g, "");
						}						
						if(orderData[0].type != null){	
							switch(orderData[0].type){
									case 1 : orderType = "Fastway"; break;
									case 2 : orderType = "Australia Post"; break;
									case 3 : orderType = "Flat-pack"; break;
									case 4 : orderType = "International"; break;
									case 5 : orderType = "Express"; break;
									case 6 : orderType = "VR"; break;
									case 8 : orderType = "Fastway Flatpack"; break;
									case 9 : orderType = "Fastway Flatpack 1kg"; break;
									case 12 : orderType = "Fastway Medium"; break;
									case 13 : orderType = "Direct Freight"; break;
									case 14 : orderType = "Local Delivery"; break;
									case 15 : orderType = "DeliverE"; break;
								}
						}						
						if(orderData[0].status != null){
							switch(orderData[0].status){
									case -1 : orderStatus = "UNKNOWN"; break;
									case 0 : orderStatus = "NONE"; break;
									case 1 : orderStatus = "COLLECTED"; break;
									case 2 : orderStatus = "PROGRESS"; break;
									case 3 : orderStatus = "PACKED"; break;
									case 4 : orderStatus = "OUTOFSTOCK"; break;
									case 5 : orderStatus = "OUTOFSTOCK"; break;
									case 6 : orderStatus = "DISCONTINUED"; break;
									case 7 : orderStatus = "DONE"; break;
									case 8 : orderStatus = "OVERRIDE"; break;
									case 9 : orderStatus = "LATER"; break;
									case 10 : orderStatus = "READYTOPACK"; break;
									case 11 : orderStatus = "ORDERED"; break;
									case 12 : orderStatus = "READYTOPRINT"; break;
									case 13 : orderStatus = "RTS"; break;
									case 14 : orderStatus = "DAMAGEDRTS"; break;
									case 15 : orderStatus = "RESENDRTS"; break;
									case 16 : orderStatus = "PENDINGREVIEW"; break;
									case 17 : orderStatus = "PARTIALCOLLECT"; break;
									case 18 : orderStatus = "WAREHOUSECOLLECT"; break;
									case 19 : orderStatus = "WAREHOUSECOLLECTED"; break;
									case 20 : orderStatus = "PARTIALCOLLECTED"; break;
									case 21 : orderStatus = "PARTIALLYPICKED"; break;
									case 22 : orderStatus = "FULLYPICKED"; break;
									case 23 : orderStatus = "DELIVERED"; break;
								}
						}						
						if(orderData[0].trackingID != null){
							trackingId = orderData[0].trackingID.replace(/\"/g, "").replace(/[\[\]']+/g, "");
						}
						
						output.orderData = {
							databaseId : id,
							salesRecordID : recordId,
							orderId : orderId,
							channel : channel,
							purchaseDate : purchaseDate,
							orderType : orderType,
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
				break;
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

module.exports = buyerDetails;