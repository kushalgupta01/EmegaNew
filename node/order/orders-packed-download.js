const {Config} = require('./config');
const Database = require('./connection');


const downloadPackedOrders = async function(req, res, next) {
	conn = new Database(dbconn);

	var store = req.params.store || null;
	var datefrom = req.query.datefrom || null;
	var dateto = req.query.dateto || null;
	//console.log(store);
	var output = {result: null};
	var httpStatus = 400;

	do {
		/*if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store) && store != 30)) {
			output.result = 'Invalid store.';
			break;
		}*/
		
		try{
			await conn.connect();
			let sql = '';
			if (datefrom && dateto) {
				sql = 'SELECT o.id, o.store, o.data, o.deliveryNote, o.salesRecordID, c.trackingID, c.notes, c.type, c.status, c.collected, c.collector FROM orders o, collecting c WHERE (c.status = 21 or c.status = 22 or c.status = 3 or c.status = 23) AND c.orderID = o.id AND o.store = ' + conn.connection.escape(store) + ' AND (c.collected between "' + datefrom + '" AND "' + dateto + '")';
			} else {
				sql = 'SELECT o.id, o.store, o.data, o.deliveryNote, o.salesRecordID, c.trackingID, c.notes, c.type, c.status, c.collected, c.collector FROM orders o, collecting c WHERE (c.status = 21 or c.status = 22 or c.status = 3 or c.status = 23) AND c.orderID = o.id AND o.store = ' + conn.connection.escape(store);
			}
			let result = await conn.query(sql);
			//console.log(result);
			if (result.length == 0) {
				output.result = 'No orders found';
				httpStatus = 404;
			} else if (result.length > 0) {
				output.result = 'success';
				output.data = result;
				httpStatus = 404;
			}
	
		}catch (e) {
			// Error
			httpStatus = 503;
			output.result = e;
			console.log(e);
		}
	} while(0);

	if (conn.connected) conn.release();


	// Output
	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}




module.exports = downloadPackedOrders;