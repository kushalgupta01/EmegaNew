const {Config} = require('./config');
const Database = require('./connection');


const downloadB2BNewOrders = async function(req, res, next) {
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
			var allStores = [81,82];
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
				sql = 'SELECT o.id, o.store, o.data, o.deliveryNote, o.salesRecordID, o.createdDate, c.trackingID, c.notes, c.status, c.locationNotes, c.locationselected FROM orders o, collecting c WHERE (c.status = 0 or c.status = 18) AND c.orderID = o.id AND ( ' + storeSQL.join(' OR ') + ' ) AND (o.createdDate between "' + datefrom + '" AND "' + dateto + '")';
			} else {
				sql = 'SELECT o.id, o.store, o.data, o.deliveryNote, o.salesRecordID, o.createdDate, c.trackingID, c.notes, c.status, c.locationNotes, c.locationselected FROM orders o, collecting c WHERE (c.status = 0 or c.status = 18) AND c.orderID = o.id AND ( ' + storeSQL.join(' OR ') + ' )';
			}
			let result = await conn.query(sql);
			//console.log(result);
			if (result.length == 0) {
				output.result = 'No orders found';
				httpStatus = 404;
			} 

			let skuSQL = [];
			let orders = [];
			for (let res of result) {
				let order = {};
				order.id = res.id;
				let invenData = JSON.parse(res.data);
				order.orderID = invenData.orderID;
				let  invenItems = invenData.items;
				let skuList = []
				for (let invItem of invenItems) {
					let lineItemID = invItem.lineItemID;
					let sku = invItem.sku;
					let qty = parseInt(invItem.quantity);
					if (sku) {
						let collectedQty = 0;
						skuSQL.push(conn.connection.escape(sku));
						if (res.locationselected != null){
							let locsel = JSON.parse(res.locationselected)[lineItemID];
							if (locsel) {
		     						for (let loc of locsel) {
		     							if (loc.customSku == sku) {
		     								collectedQty = collectedQty + parseInt(loc.indivQty);
		     							}
		     						}
		     					}
						}
						let sorted;
						if (res.locationNotes != null){
							let locnotes = JSON.parse(res.locationNotes)[lineItemID];
							if (locnotes) {
								if (locnotes[0].sorted == 'true' && qty == collectedQty){
									sorted = true;
								}
								else {
									sorted = false;
								}
							}
						}
						let itemSku = {
							sku: sku,
							qty: qty,
							collected: collectedQty,
							sorted: sorted
						}
						skuList.push(itemSku);
					}
				}
				order.skus = skuList;
				orders.push(order);
			}
			

			let sql2 = 'SELECT id, sku, itemBarcode, image FROM stockinventory where customSku in ('+ skuSQL.join(',') +')';			
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
				// inventory['locations'] = await conn.query("SELECT id, invID, customSku, bay, type, MAX(indivQty) AS indivQty1 FROM inventorylocation WHERE bay like 'EMG-%' AND invID =" + inventory.id);
				inventoryData[inventory.sku] = inventory;
				// console.log(inventoryData);
			}


			if (result.length > 0) {
				output.result = 'success';
				output.inventory = inventoryData;
				output.orders = orders;
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




module.exports = downloadB2BNewOrders;