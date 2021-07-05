const {Config} = require('./config');
const Database = require('./connection');


const downloadTracking = async function(req, res, next) {
	conn = new Database(dbconn);

	var store = req.params.store || null;
	var substore = req.params.substore || null;
	var datefrom = req.query.datefrom || null;
	var dateto = req.query.dateto || null;

	var total;

	var output = {result: null};
	var httpStatus = 400;

	do {
		if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store))) {
			output.result = 'Invalid store.';
			break;
		}
		
		try{
			await conn.connect();
			let sql;

			if (datefrom && dateto) {
				if (store==30) {
					sql = 'SELECT o.store, o.orderID, o.salesRecordID, JSON_EXTRACT(JSON_EXTRACT(o.data, "$.billing_address"), "$.first_name") as firstname, '
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.billing_address"), "$.last_name") as lastname,'
					+ ' c.trackingID, c.type, o.createdDate, c.packedTime, c.status FROM orders o, collecting c WHERE o.id = c.orderID ' 
					+ 'and (o.store = 31 or o.store = 32 or o.store = 33) ' + ' AND ( o.createdDate between "' + datefrom + '" AND "' + dateto + '") ORDER BY salesRecordID, store ' ;
				} else {
					sql = 'SELECT o.salesRecordID, o.orderID, JSON_EXTRACT(o.data, "$.finalDestinationAddressName") as name, '
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationAddressLine1") as addr1,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationAddressLine2") as addr2,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationCity") as city,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationStateOrProvince") as state,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationPostalCode") as postcode,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationCountry") as country,'
					+ 'JSON_EXTRACT(o.data, "$.buyerEmail") as email,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationAddressPhone") as phone,'
					+ ' JSON_EXTRACT(o.data, "$.items") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status FROM orders o, collecting c WHERE o.id = c.orderID and o.store = ' 
					+ store + ' AND ( o.createdDate between "' + datefrom + '" AND "' + dateto + '") ORDER BY name' ;
				}
					
			} else {
				if (store==30) {
					sql = 'SELECT o.store, o.salesRecordID, o.orderID, JSON_EXTRACT(JSON_EXTRACT(o.data, "$.billing_address"), "$.first_name") as firstname, '
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.billing_address"), "$.last_name") as lastname,'
					+ ' c.trackingID, c.type, o.createdDate, c.packedTime, c.status FROM orders o, collecting c WHERE o.id = c.orderID ' 
					+ 'and (o.store = 31 or o.store = 32 or o.store = 33) ' + ' ORDER BY salesRecordID, store ' ;
				}
				sql = 'SELECT o.salesRecordID, o.orderID, JSON_EXTRACT(o.data, "$.finalDestinationAddressName") as name, '
				+ 'JSON_EXTRACT(o.data, "$.finalDestinationAddressLine1") as addr1,'
				+ 'JSON_EXTRACT(o.data, "$.finalDestinationAddressLine2") as addr2,'
				+ 'JSON_EXTRACT(o.data, "$.finalDestinationCity") as city,'
				+ 'JSON_EXTRACT(o.data, "$.finalDestinationStateOrProvince") as state,'
				+ 'JSON_EXTRACT(o.data, "$.finalDestinationPostalCode") as postcode,'
				+ 'JSON_EXTRACT(o.data, "$.finalDestinationCountry") as country,'
				+ 'JSON_EXTRACT(o.data, "$.buyerEmail") as email,'
				+ 'JSON_EXTRACT(o.data, "$.finalDestinationAddressPhone") as phone,'
				+ ' JSON_EXTRACT(o.data, "$.items") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status FROM orders o, collecting c WHERE o.id = c.orderID and o.store = ' 
				+ store + ' ORDER BY name' ;
			}
			
			let result = await conn.query(sql);
			if (result.length == 0) {
				output.result = 'No trackings found';
				httpStatus = 404;
			} else if (result.length > 0) {
				output.result = 'success';
				let sql2 = 'SELECT * FROM items WHERE itemStore = ' + store;
				let results2 = await conn.query(sql2);
				let itemDetails = {}
				for (let item of results2) {
					let newitem = {};
					for (let att in item) {
						newitem[att] = item[att]
					}
					itemDetails[item.itemNo] = newitem;
				}
				if (substore != 'all') {
					let newResult = [];
					if (store == 4) {
						if (substore == 1) {
							for (let order of result) {
								let items = JSON.parse(order.items);
								let factory = false;
								let intertrading = false;
								for (let item of items) {
									//let factory = await conn.query('SELECT factory FROM items WHERE itemNo = ' + item.itemID + ' AND sku = ' + conn.connection.escape(item.sku) + ' AND itemStore = ' + store);
									//console.log(factory);
									let sku = item.sku;
									let name = item.title;
									let itemNo = item.itemID;
									if ((sku.startsWith('AI') || sku.startsWith('IA')) || !isNaN(name.split('x')[0])) {
										intertrading = true;
									}
									if (!sku.startsWith('AI') && !sku.startsWith('IA') && isNaN(name.split('x')[0])) {
										factory = true;
									}
									if (itemDetails[itemNo]) {
										if (itemDetails[itemNo].sku == sku) {
											item['weight'] = parseFloat(itemDetails[itemNo].itemWeight)*parseInt(item.quantity);
										}
									}
								}

								if (intertrading && !factory) {
									newResult.push(order);
								}
							}
						} else if (substore == 2) {
							for (let order of result) {
								let items = JSON.parse(order.items);
								let factory = false;
								let intertrading = false;
								for (let item of items) {
									//let factory = await conn.query('SELECT factory FROM items WHERE itemNo = ' + item.itemID + ' AND sku = ' + conn.connection.escape(item.sku) + ' AND itemStore = ' + store);
									let sku = item.sku;
									let name = item.title;
									let itemNo = item.itemID;
									if ((sku.startsWith('AI') || sku.startsWith('IA')) || !isNaN(name.split('x')[0])) {
										intertrading = true;
									}
									if (!sku.startsWith('AI') && !sku.startsWith('IA') && isNaN(name.split('x')[0])) {
										factory = true;
									}
									if (itemDetails[itemNo]) {
										if (itemDetails[itemNo].sku == sku) {
											item['weight'] = parseFloat(itemDetails[itemNo].itemWeight)*parseInt(item.quantity);
										}
									}
								}
								if (factory) {
									newResult.push(order);
								}
							}
						}
					}
					output.data = newResult;
					httpStatus = 200;
				} else {
					if (store==4) {

						
						//console.log(itemDetails);

						let newResult = [];
						for (let order of result) {	
							let neworder = {};
							for (let att in order) {
								neworder[att] = order[att];
							}

							let items = JSON.parse(order.items);
							let factory = false;
							let intertrading = false;

							let newitems = []
							for (let item of items) {
								let newitem = item;
								let itemNo = item.itemID;
								let sku = item.sku;
								if (itemDetails[itemNo] && itemDetails[itemNo].factory) {
									factory = true;
								} 
								if (itemDetails[itemNo] && !itemDetails[itemNo].factory) {
									intertrading = true;
								}
								/*let sku = item.sku;
								let name = item.title;
								if ((sku.startsWith('AI') || sku.startsWith('IA')) || !isNaN(name.split('x')[0])) {
									intertrading = true;
								}
								if (!sku.startsWith('AI') && !sku.startsWith('IA') && isNaN(name.split('x')[0])) {
									factory = true;
								}*/
								if (factory) newitem['type'] = 'factory';
								if (intertrading) newitem['type'] = 'intertrading';
								if (itemDetails[itemNo]) {
									if (itemDetails[itemNo].sku == sku) {
										newitem['weight'] = parseFloat(itemDetails[itemNo].itemWeight)*parseInt(item.quantity);
									}
								}
								
								newitems.push(newitem);
							}
							neworder['items'] = newitems;
							newResult.push(neworder);
							
						}
						result = newResult;
					}
					output.data = result;
					httpStatus = 200;
				}
				
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




module.exports = downloadTracking;