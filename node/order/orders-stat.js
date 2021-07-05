// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const {userCheckToken} = require('./users-token');
const {commonData, getConversionData} = require('./order-convert');
const moment = require('moment-timezone');

const getOrders = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();
	var clientId = req.params.client || null;

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var output = {result: null};
	var httpStatus = 400;

	//startday.setDate(startday.getDate() - 75);

	var endday = getDateValue(new Date());
	var startday = getDateValue(new Date());
	var start75day = new Date();
	start75day.setDate(start75day.getDate() - 75);
	start75day = getDateValue(start75day);
	
	var store2 = req.params.store;

	startday = moment.tz(startday, 'YYYYMMDD', Config.TIMEZONE).tz('Australia/Sydney').format('YYYY-MM-DD')+' 00:00:00';
	endday = moment.tz(endday, 'YYYYMMDD HH:mm:ss', Config.TIMEZONE).tz('Australia/Sydney').format('YYYY-MM-DD')+' 23:59:59';
	var desiredFormate = "YYYY-MM-DD HH:mm:ss";
	var zone = 'Australia/Sydney';
	var m = moment.tz(startday, desiredFormate, zone);
	var n = moment.tz(endday, desiredFormate, zone);
	m.utc();
	n.utc();
	startday = m.format(desiredFormate);
	endday = n.format(desiredFormate);

	start75day = moment.tz(start75day, 'YYYYMMDD', Config.TIMEZONE).tz('Australia/Sydney').format('YYYY-MM-DD')+' 00:00:00';

	try {
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}
			if (method == 'get') {

				await conn.connect();

				let limit = 50;
				let sql_store = "";
				if (store2 != 0){
					sql_store = "orders.store = "+store2+" AND ";
				}
				let stores = Object.values(Config.STORE_IDS);

				let a3 = stores.map(store => Object.assign({ store }, store));

				// Get orders from the database

				/*let latests_orders = await conn.query('SELECT o.id, o.store, o.data, o.deliveryNote FROM orders o WHERE o.sent = 0 AND o.cancelled = 0'
					+ ' AND o.id NOT IN (SELECT c.orderID FROM collecting c) order by o.id desc'
				);*/
				//orders waiting in Download Orders Page
				/*let total_new_orders = await conn.query('SELECT count(o.id) total FROM orders o WHERE o.sent = 0 AND o.cancelled = 0'
					+ ' AND o.id NOT IN (SELECT c.orderID FROM collecting c)'
				);*/
				//count all orders that still has status = 0 over last 75 days
				let total_new_orders = await conn.query('SELECT count(collecting.id) total FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' collecting.status in (0,18) AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.cancelled=0 ');
				let total_new_orders_by_store = await conn.query('SELECT store, count(*) as new_order FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' collecting.status in (0,18) AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.cancelled=0 GROUP BY store');
				/*let total_new_orders_test = await conn.query('SELECT store, orders.orderID as orderID FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' collecting.status in (0,18) AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.cancelled=0 ');
				for (let i=0; i<total_new_orders_test.length;i++){
					//console.log(total_new_orders_test[i].orderID);
				}*/
				total_new_orders_by_store = total_new_orders_by_store.map(v => Object.assign({}, v));
				if (total_new_orders_by_store.length > 0) {
					a3 = a3.map(t1 => ({...t1, ...total_new_orders_by_store.find(t2 => t2.store === t1.store)}));
					/*if (a3){
						a3 = a3.map(t1 => ({...t1, ...total_new_orders_by_store.find(t2 => t2.store === t1.store)}));
					}
					else {
						a3 = total_new_orders_by_store;
					}*/

				}
			
				let total_partial_collect_orders = await conn.query('SELECT count(collecting.id) total FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' collecting.status=17 AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.sent=0 AND orders.cancelled=0');
				let total_partial_collect_orders_by_store = await conn.query('SELECT store, count(*) as partial_order FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' collecting.status=17 AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.sent=0 AND orders.cancelled=0 GROUP BY store');
				total_partial_collect_orders_by_store = total_partial_collect_orders_by_store.map(v => Object.assign({}, v));
				if (total_partial_collect_orders_by_store.length > 0){
					a3 = a3.map(t1 => ({...t1, ...total_partial_collect_orders_by_store.find(t2 => t2.store === t1.store)}));
					/*if (a3){
						a3 = a3.map(t1 => ({...t1, ...total_partial_collect_orders_by_store.find(t2 => t2.store === t1.store)}));
					}
					else {
						a3 = total_partial_collect_orders_by_store;
					}*/
				}
				//let total_warehouse_collect_orders = await conn.query('SELECT count(collecting.id) total FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' collecting.status=18 AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.sent=0 AND orders.cancelled=0');
				//console.log('store'+store);
				let total_warehouse_collect_orders = await conn.query('SELECT count(collecting.id) total,orders.orderID as orderID FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' ((collecting.page="warehousecollect" and collecting.status in (0,18)) AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.cancelled=0) OR '+ sql_store +' ((collecting.page is NULL and collecting.status=18) AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.cancelled=0)');
				let total_warehouse_orderID = [];
				let total_warehouse_collect_orders_test = await conn.query('SELECT orders.orderID as orderID FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' ((collecting.page="warehousecollect" and collecting.status in (0,18)) AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.cancelled=0) OR '+ sql_store +' ((collecting.page is NULL and collecting.status=18) AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.cancelled=0)');
				for (let i=0; i<total_warehouse_collect_orders_test.length;i++){
					//console.log(total_warehouse_collect_orders_test[i].orderID);
					total_warehouse_orderID.push(total_warehouse_collect_orders_test[i].orderID);
				}
				let resultData = await conn.query('SELECT orders.data, orders.store FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' store in (8,71,91,74) and (collecting.page is NULL and collecting.status=0) AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.cancelled=0 ORDER BY `collecting`.`status` ASC ') 
				if (resultData.length > 0) {
					let count = 0;
					for ( let i=0; i<resultData.length; i++){
						let stoID = resultData[i].store;
						let warehouseOrder = true;
						let data = JSON.parse(resultData[i].data);
						let convertData = getConversionData(stoID);
						let itemConvert = convertData.ItemData;
						let lineItems = data[convertData.Items];
						if(lineItems != undefined) {
							let orderType = await checkOrderType(lineItems,stoID);
							if (orderType == 'not warehouse' || orderType == 'not supplier'){
								for (let i=0; i<lineItems.length; i++) {
									let lineItem = lineItems[i];
									let sku = lineItem[itemConvert.SKU];
									let quantity = lineItem[itemConvert.Quantity];
									let checkSku = await conn.query('SELECT us.sku,sum(u.indivQty) as stockOnHand FROM inventorylocation u LEFT JOIN stockinventory us ON u.invID = us.id WHERE store in (8,71,91,74) and us.sku='+conn.connection.escape(sku)+' and u.bay LIKE "EMG-%" GROUP BY us.id');
									if (checkSku.length > 0) {
										let stockQuantity = checkSku[0].stockOnHand;
										if (quantity > parseInt(stockQuantity)){
											//console.log('rejected1 ='+data[convertData.OrderID]);
											warehouseOrder = false;
											break;
										}
									}
									else{
										//console.log('rejected2 ='+data[convertData.OrderID]);
										warehouseOrder = false;
										break;
									}
								}
								if (warehouseOrder == true){
									//console.log(data[convertData.OrderID]);
									total_warehouse_orderID.push(data[convertData.OrderID]);
									count++;
								}
							}
							else if (orderType == 'is supplier'){
								//console.log(data[convertData.OrderID]);
								total_warehouse_orderID.push(data[convertData.OrderID]);
								count++;
							}
							else{
								console.log('error');
							}
						}
					}                  
					
					
					//console.log('count: '+count)
					total_warehouse_collect_orders[0].total = total_warehouse_collect_orders[0].total+count;
					//console.log('total warehouse = '+total_warehouse_collect_orders[0].total);
					total_new_orders[0].total = total_new_orders[0].total-total_warehouse_collect_orders[0].total;
					//console.log('total new orders = '+total_new_orders[0].total);
				}
				var quotedAndCommaSeparated = "'" + total_warehouse_orderID.join("','") + "'";
				let total_warehouse_collect_orders_by_store = await conn.query('SELECT store, count(*) as warehouse_order FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' orders.orderID in ('+quotedAndCommaSeparated+') GROUP BY store');
				total_warehouse_collect_orders_by_store = total_warehouse_collect_orders_by_store.map(v => Object.assign({}, v));
				if (total_warehouse_collect_orders_by_store.length > 0){
					a3 = a3.map(t1 => ({...t1, ...total_warehouse_collect_orders_by_store.find(t2 => t2.store === t1.store)}));
					a3.forEach(item1 => {
				     		var itemFromWarehouse = total_warehouse_collect_orders_by_store.find(item2 => item2.store == item1.store);
						if (itemFromWarehouse) {
				         		item1.new_order = item1.new_order-itemFromWarehouse.warehouse_order;
				         		if (item1.new_order == 0){
				         			delete item1.new_order;
				         		}
				      		}
				   	});
					/*if (a3){
						a3 = a3.map(t1 => ({...t1, ...total_warehouse_collect_orders_by_store.find(t2 => t2.store === t1.store)}));
						a3.forEach(item1 => {
						      var itemFromWarehouse = total_warehouse_collect_orders_by_store.find(item2 => item2.store == item1.store);

						      if (itemFromWarehouse) {
						         item1.new_order = item1.new_order-itemFromWarehouse.warehouse_order;
						      }
						   }
						)
					}
					else {
						a3 = total_warehouse_collect_orders_by_store;
					}*/
					//console.log(a3);
				}

				let total_collected_orders = await conn.query('SELECT count(collecting.id) total FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' collecting.status in (1,12,19,20) AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.cancelled=0');
				let total_collected_orders_by_store = await conn.query('SELECT store, count(*) as collected_order FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' collecting.status in (1,12,19,20) AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.cancelled=0');
				total_collected_orders_by_store = total_collected_orders_by_store.map(v => Object.assign({}, v));
				if (total_collected_orders_by_store.length > 0){
					a3 = a3.map(t1 => ({...t1, ...total_collected_orders_by_store.find(t2 => t2.store === t1.store)}));
					/*if (a3){
						a3 = a3.map(t1 => ({...t1, ...total_collected_orders_by_store.find(t2 => t2.store === t1.store)}));
					}
					else {
						a3 = total_collected_orders_by_store;
					}*/
				}

				let total_ready_to_pack_orders = await conn.query('SELECT count(collecting.id) total FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' collecting.status in (2,9,10) AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.sent=0 AND orders.cancelled=0');
				let total_ready_to_pack_orders_by_store = await conn.query('SELECT store, count(*) as ready_to_pack_order FROM collecting LEFT JOIN orders ON orders.id = collecting.orderID WHERE '+ sql_store +' collecting.status in (2,9,10) AND orders.addedDate >= ' + conn.connection.escape(start75day) + ' AND orders.sent=0 AND orders.cancelled=0 GROUP BY store');
				total_ready_to_pack_orders_by_store = total_ready_to_pack_orders_by_store.map(v => Object.assign({}, v));
				if (total_ready_to_pack_orders_by_store.length > 0){
					a3 = a3.map(t1 => ({...t1, ...total_ready_to_pack_orders_by_store.find(t2 => t2.store === t1.store)}));
					/*if (a3){
						a3 = a3.map(t1 => ({...t1, ...total_ready_to_pack_orders_by_store.find(t2 => t2.store === t1.store)}));
					}
					else {
						a3 = total_ready_to_pack_orders_by_store;
					}*/
				}

				let total_packed_orders = await conn.query('SELECT count(orders.id) total FROM orders inner join collecting c on orders.id = c.orderID WHERE '+ sql_store +' orders.cancelled = 0'
					+ ' AND c.status in (3,8) AND c.packedTime >= ' + conn.connection.escape(startday) + ' AND c.packedTime <= ' + conn.connection.escape(endday)
				);
				let total_packed_orders_by_store = await conn.query('SELECT store, count(*) as packed_total_qty_day FROM orders inner join collecting c on orders.id = c.orderID WHERE '+ sql_store +' orders.cancelled = 0'
					+ ' AND c.status in (3,8) AND c.packedTime >= ' + conn.connection.escape(startday) + ' AND c.packedTime <= ' + conn.connection.escape(endday) + 'GROUP BY store'
				);
				total_packed_orders_by_store = total_packed_orders_by_store.map(v => Object.assign({}, v));
				if (total_packed_orders_by_store.length > 0 ) {
					a3 = a3.map(t1 => ({...t1, ...total_packed_orders_by_store.find(t2 => t2.store === t1.store)}));
					/*if (a3){
						a3 = a3.map(t1 => ({...t1, ...total_packed_orders_by_store.find(t2 => t2.store === t1.store)}));
					}
					else {
						a3 = total_packed_orders_by_store;
					}*/
				}

				

				/*let latest_collected_orders = await conn.query('SELECT o.id, o.store, o.data, o.deliveryNote FROM orders o inner join collecting c on o.id = c.orderID WHERE  o.cancelled = 0'
					+ ' AND c.status=0 AND o.addedDate >= ' + conn.connection.escape(startday) + ' AND o.addedDate <= ' + conn.connection.escape(endday)
					+ 'order by c.id desc'
				);

				let total_collected_orders = await conn.query('SELECT count(o.id) total FROM orders o inner join collecting c on o.id = c.orderID WHERE o.cancelled = 0'
					+ ' AND c.status=0 AND o.addedDate >= ' + conn.connection.escape(startday) + ' AND o.addedDate <= ' + conn.connection.escape(endday)
				);

				let latestOrderData = {};

				for (let order of latests_orders) {
					if (!latestOrderData.hasOwnProperty(order.store)) latestOrderData[order.store] = [];
					latestOrderData[order.store].push({
						id: order.id,
						data: commonData(order.data, order.store),
						deliveryNote: order.deliveryNote,
					});
				}

				latestCollectedOrderData = {};

				for (let order of latest_collected_orders) {
					if (!latestCollectedOrderData.hasOwnProperty(order.store)) latestCollectedOrderData[order.store] = [];
					latestCollectedOrderData[order.store].push({
						id: order.id,
						data: commonData(order.data, order.store),
						deliveryNote: order.deliveryNote,
					});
				}*/
				a3 = a3.filter(function(el) { return Object.keys(el).length > 1; });

				output.total_new_orders = total_new_orders[0].total;
				output.total_partial_collect_orders = total_partial_collect_orders[0].total;
				output.total_warehouse_collect_orders = total_warehouse_collect_orders[0].total;
				output.total_collected_orders = total_collected_orders[0].total;
				output.total_ready_to_pack_orders = total_ready_to_pack_orders[0].total;
				output.total_packed_orders = total_packed_orders[0].total;
				output.total_by_store = a3;
				/*output.total_new_orders_by_store = total_new_orders_by_store;
				output.total_partial_collect_orders_by_store = total_partial_collect_orders_by_store;
				output.total_warehouse_collect_orders_by_store = total_warehouse_collect_orders_by_store;
				output.total_ready_to_pack_orders_by_store = total_ready_to_pack_orders_by_store;
				output.total_packed_orders_by_store = total_packed_orders_by_store;*/
				//output.latest_orders = latestOrderData;
				//output.latest_collected_orders = latestCollectedOrderData;
				output.result = 'success';
				httpStatus = 200;
			}
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = JSON.stringify(e);
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

function getDateValue(date) {
	return date.getFullYear().toString()+('00'+(date.getMonth()+1)).slice(-2)+('00'+date.getDate()).slice(-2);
}

async function checkOrderType(lineItems,storeID){
	let isSupplier = true;
	for (let i=0; i<lineItems.length; i++) {
		let lineItem = lineItems[i];
		let convertData = getConversionData(storeID);
		let itemConvert = convertData.ItemData;
		let sku = lineItem[itemConvert.SKU];
		let quantity = lineItem[itemConvert.Quantity];
		if (Config.SUPPLIERS[Config.SUPPLIER_IDS.HOBBYCO].stores.includes(storeID.toString()) && !sku.startsWith('WV-') && !sku.startsWith('ME-') && !sku.startsWith('LPG-')) {
			isSupplier = false;
			return 'not supplier';
		}
		if (sku) {
			if (parseInt(quantity) <= 0) {
				if (isSupplier == false){
					return 'not warehouse';
				}
			}
		} else {
			return 'not warehouse';
		}
	}
	return 'is supplier';
}

module.exports = getOrders;
