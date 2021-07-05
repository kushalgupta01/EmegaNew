const {Config} = require('./config');
const Database = require('./connection');


const downloadNewOrders = async function(req, res, next) {
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
				sql = 'SELECT o.id, o.store, o.data, o.deliveryNote, o.salesRecordID, o.createdDate, c.trackingID, c.notes, c.status, c.locationNotes FROM orders o, collecting c WHERE c.status = 0 AND c.orderID = o.id AND o.store = ' + conn.connection.escape(store) + ' AND (o.createdDate between "' + datefrom + '" AND "' + dateto + '")';
			} else {
				sql = 'SELECT o.id, o.store, o.data, o.deliveryNote, o.salesRecordID, o.createdDate, c.trackingID, c.notes, c.status, c.locationNotes FROM orders o, collecting c WHERE c.status = 0 AND c.orderID = o.id AND o.store = ' + conn.connection.escape(store);
			}
			let result = await conn.query(sql);
			//console.log(result);
			if (result.length == 0) {
				output.result = 'No orders found';
				httpStatus = 404;
			} 

			let skuSQL = [];
			for (let res of result) {
				let invenData = JSON.parse(res.data);
				let  invenItems = invenData.items;
				for (let invItem of invenItems) {
					let sku = invItem.sku;
					// console.log(sku);
					if (sku) {
						skuSQL.push(conn.connection.escape(sku));
					}
				}
			}

			let sql2 = 'SELECT id, sku, itemBarcode FROM stockinventory where customSku in ('+ skuSQL.join(',') +')';			
			var inventorys =  await conn.query(sql2);
			// console.log(inventorys);
			if (inventorys.length==0) {
				httpStatus = 404;
				output.result = 'Not inventory found.';
				break;
			}

			var inventoryData = {};
			for (let inventory of inventorys) {
				inventory['locations'] = await conn.query("SELECT * FROM inventorylocation WHERE indivQty > 0 AND bay like 'EMG-%' AND invID =" + inventory.id);
				inventoryData[inventory.sku] = inventory;
			}

			
			if (result.length > 0) {
				output.result = 'success';
				output.inventory = inventoryData;
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




module.exports = downloadNewOrders;