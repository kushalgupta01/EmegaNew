
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
 
const orderType = async function(req, res, next) {
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
					orderData = await conn.query('SELECT o.data -> "$.OrderID" orderId, c.type FROM orders o, collecting c WHERE o.orderID = '+conn.connection.escape(orderid)+' AND o.id = c.orderID');
					if(orderData != null){
						output.result = "success";
						httpStatus = 200;
						let orderType ="";let orderID="";
						if(orderData[0].orderId != null){
							orderId = orderData[0].orderId.replace(/\"/g, "");
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
						
						output.orderData = {
							orderType : orderType,
							orderId : orderId
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

module.exports = orderType;