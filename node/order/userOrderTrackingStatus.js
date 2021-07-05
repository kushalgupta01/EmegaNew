
const Database = require('./connection');
const { getFastwayStatus, getAusPostStatus } = require('./orders-tracking-status');
const ORDER_TYPE = {
	Fastway: 1,
	AustraliaPost: 2,
	International: 4,
	Express: 5
};
const userOrderTrackingStatus = async function (req, res, next) {
	let conn = new Database(dbconn);
	let orderid = req.query.orderNo || null;
	let output = { result: null };
	let httpStatus = 400;
	try {
		do {
			if (orderid != null) {
				let orderData = null;
				await conn.connect();
				let method = req.method.toLowerCase();
				if (method == 'get') {
					orderData = await conn.query("SELECT  c.status,c.trackingID,c.type,o.orderID FROM collecting c JOIN orders o  ON c.orderID = o.id where c.orderID='" + orderid + "'");
					if (orderData != null) {
						output.result = "success";
						httpStatus = 200;
						let orderStatus = ""; let trackingId = "";let orderNumber="";
						if (orderData[0].status != null) {
							switch (orderData[0].status) {
								case 0: orderStatus = "New Order"; break;
								case 1: orderStatus = "COLLECTED"; break;
								case 2: orderStatus = "COLLECTED"; break;
								case 3: orderStatus = "PACKED"; break;
								case 4: orderStatus = "PACKED"; break;
								case 5: orderStatus = "PACKED"; break;
								case 6: orderStatus = "PACKED"; break;
								case 7: orderStatus = "PACKED"; break;
								case 8: orderStatus = "OVERRIDE"; break;
							}
						}
						if (orderData[0].trackingID != null) {
							trackingId = orderData[0].trackingID.replace(/\"/g, "").replace(/[\[\]']+/g, "");
						}
						if(orderData[0].orderID != null){
							orderNumber=orderData[0].orderID;
						}
						if (["PACKED", "OVERRIDE"].includes(orderStatus)) {

							let trackingStatus = [];
							type = parseInt(orderData[0].type);
							if (type) {
								if ([ORDER_TYPE.Fastway].indexOf(type) >= 0) {
									trackingStatus = await getFastwayStatus(trackingId)
								} else if ([ORDER_TYPE.International, ORDER_TYPE.AustraliaPost, ORDER_TYPE.Express].indexOf(type) >= 0) {
									trackingStatus = await getAusPostStatus(trackingId);
								}


								if (trackingStatus && trackingStatus.length > 0) {
									if (trackingStatus[0].description.includes("Delivered") || trackingStatus[0].description.includes("Authority to Leave")) {
										orderStatus = "Delivered";
									} else if (trackingStatus.length > 0) {
										orderStatus = "On the Way";
									}



								}else{
									orderStatus = "On the Way";
								}
							}
						}
						output.orderData = {
							orderStatus: orderStatus,
							trackingId: trackingId,
							orderNumber : orderNumber
						};
					} else {
						output.result = 'No data for order id : ' + orderid;
						output.status = 204;
					}
				} else {
					output.result = 'Method not allowed';
					output.status = 405;
					httpStatus = 405;
				}
			} else {
				output.result = 'Invalid data.';
			}
		} while (0);
	} catch (e) {
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