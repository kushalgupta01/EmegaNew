const {Config} = require('./config');
const Database = require('./connection');


const downloadB2BWeights = async function(req, res, next) {
	conn = new Database(dbconn);

	var store = req.params.store || null;
	var datefrom = req.query.datefrom || null;
	var dateto = req.query.dateto || null;
	var output = {result: null};
	var httpStatus = 400;

	do {
		/*if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store) && store != 30)) {
			output.result = 'Invalid store.';
			break;
		}*/
		
		try{
			var allStores = [81,82]
			await conn.connect();
			let storeSQL = [];
			if (store=='all') {
				for (let storeID of allStores) {
					storeSQL.push('store = ' + storeID);
				}
			} else {
				storeSQL.push('store = ' + store);
			}

			let sql = '';
			if (datefrom && dateto) {
				datefrom = new Date(datefrom + " 00:00:00");
				dateto = new Date(dateto + " 00:00:00");

				datefrom = dateToSQL(datefrom);
				dateto = dateToSQL(dateto);
				sql = 'SELECT o.id, o.store, o.salesRecordID, o.createdDate, c.status, c.boxDetails, c.trackingID, c.parcelWeights FROM orders o, collecting c WHERE c.orderID = o.id AND ( ' + storeSQL.join(' OR ') + ' ) AND (o.createdDate between "' + datefrom + '" AND "' + dateto + '")';
			} else {
				sql = 'SELECT o.id, o.store, o.salesRecordID, o.createdDate, c.status, c.boxDetails, c.trackingID, c.parcelWeights FROM orders o, collecting c WHERE c.orderID = o.id AND ( ' + storeSQL.join(' OR ') + ' )';
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

function dateToSQL(date) {
	return date.getUTCFullYear()+'-'+(date.getUTCMonth()+1)+'-'+date.getUTCDate()+' '+date.getUTCHours()+':'+date.getUTCMinutes()+':'+date.getUTCSeconds();
}




module.exports = downloadB2BWeights;