const {Config} = require('./config');
const Database = require('./connection');
const {commonData} = require('./order-convert');

const getTracking = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (method == 'post') {
				// Get orders
				var store = req.body.store || null;
				var records = req.body.records || null;
				var databaseID = req.body.databaseID || null;
				records = JSON.parse(records);

				if (!store || !Config.STORES.hasOwnProperty(store)) {
					if (store != 'all') {
						output.result = 'Invalid store.';
						break;	
					}
					
				}

				// Get orders from the database
				await conn.connect();
				var data = [];
				if (records.length) {
					if (databaseID) {
						data = await conn.query('SELECT orderID, trackingID FROM collecting WHERE ' + records.map(x => 'orderID = ' + conn.connection.escape(x)).join(' or ') );
					}else{
					    data = await conn.query('SELECT o.salesRecordID, c.trackingID FROM collecting c, orders o WHERE o.id = c.orderID and o.store = '+ conn.connection.escape(store) +' and ( ' 
						 + records.map(x => 'o.salesRecordID = ' + conn.connection.escape(x)).join(' or ') + ' )');
					}
				}

				if (!data.length) {
					httpStatus = 200;
					output.result = 'No trackings.';
					output.orders = null;
					break;
				}

				output.trackings = data;
				output.result = 'success';
				httpStatus = 200;
			}
			  else {
				output.result = 'wrong method';
			}
		} while(0);
	}
	catch (e) {
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

module.exports = getTracking;