
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
 
const fullfillDetails = async function(req, res, next) {
	var conn = new Database(dbconn);
	var token = req.header(Config.ACCESS_TOKEN_HEADER) || null;
	var output = {result: null};
	var httpStatus = 400;
	let page = 1;
	let totalRecords = 10;
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
			
			if(req.query.page)
				page = req.query.page;				
				
			if(req.query.limit)
				totalRecords = req.query.limit;		
			
			
			
			if(req.query.store && req.query.fromdate){
				let date = new Date();				
				if(req.query.todate)
					toDate = req.query.todate;
				else 
					toDate = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate();
				
				let offset = (page - 1) * totalRecords;
				let storeVal = null;
				let fromDate = req.query.fromdate;
				switch(req.query.store){
					case "OzPlaza" :  storeVal = 1; break;
					case "SOSHydration" :  storeVal = 2; break;
					case "Scrub Daddy" :  storeVal = 3; break;
					case "Idirect" :  storeVal = 4; break;
					case "SP Warehouse" :  storeVal = 6; break;
					case "Hobbyco" :  storeVal = 8; break;
					case "Kobayashi" :  storeVal = 7; break;
					case "Habitania eBay" :  storeVal = 9; break;
					case "Catwalk" :  storeVal = 15; break;
					case "Sons of Amazon" :  storeVal = 16; break;
					case "New Store" :  storeVal = 21; break;
					case "Combined Group" :  storeVal = 30; break;
					case "Kitncaboodle" :  storeVal = 31; break;
					case "Packing Sorted" :  storeVal = 32; break;
					case "RoofStuff" :  storeVal = 33; break;
					case "ANKAMe" :  storeVal = 34; break;
					case "CleanHQ" :  storeVal = 35; break;
					case "Evo Build" :  storeVal = 36; break;
					case "BH&G" :  storeVal = 37; break;
					case "Amazon" :  storeVal = 41; break;
					case "Emega-Magento" :  storeVal = 51; break;
					case "CharliChair" :  storeVal = 61; break;
					case "Waterwipes" :  storeVal = 62; break;
					case "Habitania" :  storeVal = 63; break;
					case "SonsOfAmazonShopify" :  storeVal = 64; break;
					case "TrinityconnectShopify" :  storeVal = 65; break;
					case "Hobbyco Website" :  storeVal = 71; break;
					case "B2B-Wholesale" :  storeVal = 81; break;
					case "B2B-Transfer" :  storeVal = 82; break;
					case "Hobbyco Catch" :  storeVal = 91; break;
					case "Trinityconnect Catch" :  storeVal = 92; break;
					case "Emega Catch" :  storeVal = 93; break;
					case "Hobbyco Kogan" :  storeVal = 74; break;
					case "Trinityconnect Kogan" :  storeVal = 75; break;
					case "Autowell" :  storeVal = 101; break;
					case "Circular2nds" :  storeVal = 102; break;
					case "fiestaelectronics" :  storeVal = 103; break;
					case "eliabathrooms" :  storeVal = 104; break;
					case "Spartan" :  storeVal = 105; break;
					case "At Pack" :  storeVal = 106; break;
				}
				let orderData = null;
				await conn.connect();
				let method = req.method.toLowerCase();
				if (method == 'get') {
					orderData = await conn.query('SELECT o.id, o.data -> "$.SalesRecordID" recordId, o.data -> "$.OrderID" orderId, o.data -> "$.SalesChannel" channels,o.data -> "$.DateInvoiced" purchaseDate, c.type, c.status, c.trackingID, c.packedData FROM orders o, collecting c WHERE o.store = '+storeVal+' AND (c.status = 3 OR c.status =8) AND c.packedTime BETWEEN date('+conn.connection.escape(fromDate)+') AND date('+conn.connection.escape(toDate)+') ORDER BY c.packedTime LIMIT '+totalRecords+' OFFSET '+offset);
					if(orderData != null){
						output.result = "success";
						httpStatus = 200;
						let arr = [];
						output.fromDate = fromDate;
						output.toDate = toDate;
						for(let i=0; i<orderData.length; i++){
							let id = ""; let recordId=""; let orderId=""; let channel=""; let purchaseDate = null; let trackingId="";let orderType ="";
							let orderStatus=""; let packedData="";							
							if(orderData[i].id != null){
								id = orderData[i].id;
							}
							if(orderData[i].recordId != null){
								recordId = orderData[i].recordId.replace(/\"/g, "");
							}
							if(orderData[i].orderId != null){
								orderId = orderData[i].orderId.replace(/\"/g, "");
							}						
							if(orderData[i].channels != null){
								channel = orderData[i].channels.replace(/\"/g, "");
							}
							if(orderData[i].purchaseDate != null){
								purchaseDate = orderData[i].purchaseDate.replace(/\"/g, "");
							}						
							if(orderData[i].type != null){	
								switch(orderData[i].type){
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
							if(orderData[i].status != null){
								switch(orderData[i].status){
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
							if(orderData[i].trackingID != null){
								trackingId = orderData[i].trackingID.replace(/\"/g, "").replace(/[\[\]']+/g, "");
							}
							if(orderData[i].packedData != null){
								packedData = orderData[i].packedData;
							}
							arr.push({
								databaseId : id,
								salesRecordID : recordId,
								orderId : orderId,
								channel : channel,
								purchaseDate : purchaseDate,
								orderType : orderType,
								orderStatus : orderStatus,
								trackingId : trackingId,
								packedData : packedData
							});
						}
						output.orderData = arr;
					}else{
						output.result = 'No data found';
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

module.exports = fullfillDetails;