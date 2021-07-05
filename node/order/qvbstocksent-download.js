const {Config} = require('./config');
const Database = require('./connection');
const { getConversionData } = require('./order-convert');


const downloadQVBStockSent = async function(req, res, next) {
	conn = new Database(dbconn);
	var datefrom = req.query.datefrom || null;
	var dateto = req.query.dateto || null;
	var stores = Config.SUPPLIERS[Config.SUPPLIER_IDS['HOBBYCO']].stores;

	

	var output = {result: null};
	var httpStatus = 400;

	do {
		
		try{
			await conn.connect();
			let storeSQL = stores.map(s => 'store=' + s);
			let sql;

			if (datefrom && dateto) {
					datefrom = new Date(datefrom + " 00:00:00");
					dateto = new Date(dateto + " 00:00:00");

					datefrom = dateToSQL(datefrom);
					dateto = dateToSQL(dateto);
					sql = 'SELECT o.store, o.salesRecordID, o.orderID, c.collector,'
					+ ' JSON_EXTRACT(o.data, "$.OrderLine") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight, c.locationselected FROM orders o, collecting c WHERE o.id = c.orderID and (' 
					+ storeSQL.join(' OR ') + ') AND (c.collected between "' + datefrom + '" AND "' + dateto + '")' ;
			} else {				
					sql = 'SELECT o.store, o.salesRecordID, o.orderID, c.collector,'
					+ ' JSON_EXTRACT(o.data, "$.OrderLine") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight, c.locationselected FROM orders o, collecting c WHERE o.id = c.orderID and (' 
					+ storeSQL.join(' OR ') + ')';
			}
			
			let result = await conn.query(sql);
			//console.log(result);
			if (result.length == 0) {
				output.result = 'No orders found';
				httpStatus = 404;
			} else if (result.length > 0) {
				output.result = 'success';
				output.data = result;
			    httpStatus = 200;
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

function dateToSQL(date) {
	return date.getUTCFullYear()+'-'+(date.getUTCMonth()+1)+'-'+date.getUTCDate()+' '+date.getUTCHours()+':'+date.getUTCMinutes()+':'+date.getUTCSeconds();
}



module.exports = downloadQVBStockSent;