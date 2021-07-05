
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
					orderData = await conn.query('SELECT o.salesRecordID salesRecordID, o.orderID orderId, o.data -> "$.buyerID" buyerId, o.data -> "$.ShipFullName" fullName, o.data -> "$.ShipStreetLine1" address1, o.data -> "$.ShipStreetLine2" address2, o.data -> "$.ShipCity" city, o.data -> "$.BillState" state, o.data -> "$.ShipPostCode" postCode, o.data -> "$.ShipCountry" country, o.data -> "$.BillPhone" phone, o.data -> "$.Email" email  FROM orders o WHERE o.orderID = '+conn.connection.escape(orderid)+'');
					if(orderData != null){
						output.result = "success";
						httpStatus = 200;
						let address2 = ""; let buyerId="";let fullName="";let address1="";let city="";let state="";let country="";
						let postCode=""; let phone=""; let email="";
						if(orderData[0].buyerId != null){
							buyerID = orderData[0].buyerId.replace(/\"/g, '');
						}
						if(orderData[0].fullName != null){
							fullName = orderData[0].fullName.replace(/\"/g, '');
						}
						if(orderData[0].address1 != null){
							address1 = orderData[0].address1.replace(/\"/g, '');
						}
						if(orderData[0].address2 != null){
							address2 = orderData[0].address2.replace(/\"/g, '');
						}
						if(orderData[0].city != null){
							city = orderData[0].city.replace(/\"/g, '');
						}
						if(orderData[0].state != null){
							state = orderData[0].state.replace(/\"/g, '') ;
						}
						if(orderData[0].country != null){
							country = orderData[0].country.replace(/\"/g, '');
						}
						if(orderData[0].postCode != null){
							postCode = orderData[0].postCode.replace(/\"/g, '');
						}
						if(orderData[0].phone != null){
							phone = orderData[0].phone.replace(/\"/g, '');
						}
						if(orderData[0].email != null){
							email = orderData[0].email.replace(/\"/g, '');
						}
						output.buyerData = {
							buyerID :  buyerID,
							fullName :  fullName,
							address1 :  address1,
							address2 :  address2,
							city :  city,
							state :  state,
							country :  country,
							postCode : postCode,
							phone : phone,
							email :  email,
							salesRecordID : orderData[0].salesRecordID.replace(/\"/g, '') ? orderData[0].salesRecordID.replace(/\"/g, '') : "",
							orderId : orderData[0].orderId.replace(/\"/g, '') ? orderData[0].orderId.replace(/\"/g, '') : "",
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