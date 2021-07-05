// Discount Chemist
// Order System

// Load orders

const Database = require('./connection');
const fs = require('fs');
const glob = require('glob');
const md5 = require('md5');
const {getConnectedOrders} = require('./processrecords');
const {Config, DBConfig} = require('./config');
const {orderToRecord} = require('./order-convert');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

//const { performance } = require('perf_hooks');

moment.tz.setDefault(Config.TIMEZONE);

const loadOrders = async function(req, res, next) {
	//var loadTime = performance.now();
	//console.info('start');
	var conn = new Database(dbconn);

	var store = req.query.store || null;
	var day = req.query.day || null;
	var endday = req.query.endday || null;
	var orderStatus = req.query.status || null;
	var morelabel = req.query.morelabel || null;
	var partialrefund = req.query.partialrefund || null;
	var supplier = req.query.supplier || null;

	//console.log(orderStatus.toString());

	var donGetConnectedOrders = !!req.query.noconnected;
	var onlyKeepTodayRecords = !req.query.keepallrecords;
	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	var storeAll = false;
	var useCache = false;
	var cacheFile = '';
	var hashFile = '';
	var filesHashNew = '';

	var orderData = {
		saleRecords: {},
		orderIDs: {},
		errorList: [],
	};

	var output = {result: null};
	var httpStatus = 400;


	do {
		// Check token and get user details
		if (!await userCheckToken(token)) {
			httpStatus = 401;
			output.result = 'Not logged in.';
			break;
		}

		if (!store || (day !== null && day != 'all' && day != 'today' && isNaN(parseInt(day, 10)))) {
			output.result = 'Invalid data.';
			break;
		}
		else if (endday !== null && isNaN(parseInt(endday, 10))) {
			output.result = 'Invalid end day.';
			break;
		}

		// Check order status(es) and convert it/them to integers
		var orderStatusValid = true;
		if (orderStatus !== null) {
			if (Array.isArray(orderStatus)) {
				for (let os_i = 0; os_i < orderStatus.length; os_i++) {
					let orderStatusTemp = parseInt(orderStatus[os_i], 10);
					if (!isNaN(orderStatusTemp)) {
						orderStatus[os_i] = orderStatusTemp;
					}
					else {
						orderStatusValid = false;
						break;
					}
				}
			}
			else {
				orderStatus = parseInt(orderStatus, 10);
				if (!isNaN(orderStatus)) {
					orderStatus = [orderStatus];
				}
				else {
					orderStatusValid = false;
				}
			}
		}

		if (!orderStatusValid) {
			output.result = 'Invalid order status.';
			break;
		}


		await conn.connect();

		// Store
		if (store == 'all') {
			storeAll = true;
		}

		// Day
		switch (day) {
			case 'all':
				day = null;
				break;
			case 'today':
				day = moment().format('YYYYMMDD');
				break;
		}


		// Get table last updated times from the database (for cache use)
		var dbName = conn.connection.escape(DBConfig.database);
		var recordCountsTables = ['orders', 'collecting'];
		var recordCountsSqlWhere = [];

		for (let table of recordCountsTables) {
			recordCountsSqlWhere.push("TABLE_NAME = '"+table+"'");
		}

		var recordCountData = await conn.query("SELECT UPDATE_TIME FROM information_schema.tables WHERE TABLE_SCHEMA = "+dbName+" AND ("+recordCountsSqlWhere.join(' OR ')+")");


		// Initialise data
		let dateList = {start: null, end: null};
		let cacheID = '';

		// Date range
		if (day) {
			dateList.start = moment.tz(day, 'YYYYMMDD', Config.TIMEZONE).tz('UTC').format('YYYY-MM-DD')+' 00:00:00';
			cacheID += '-'+day;
		}
		if (endday) {
			dateList.end = moment.tz(endday+' 23:59:59', 'YYYYMMDD HH:mm:ss', Config.TIMEZONE).format('YYYY-MM-DD')+' 23:59:59';
			cacheID += '-'+endday;
		}


		// Cache
		if (!fs.existsSync(__dirname+'/cache/')) fs.mkdirSync(__dirname+'/cache', '2775');
		cacheFile = __dirname+'/cache/cache-'+store+cacheID+'-s'+(orderStatus !== null ? orderStatus : '')+(donGetConnectedOrders ? '-nc' : '')+(!onlyKeepTodayRecords ? '-ka' : '')+'.txt';
		hashFile = __dirname+'/cache/hash-'+store+cacheID+'-s'+(orderStatus !== null ? orderStatus : '')+(donGetConnectedOrders ? '-nc' : '')+(!onlyKeepTodayRecords ? '-ka' : '')+'.txt';

		let filesHash = fs.existsSync(hashFile) ? fs.readFileSync(hashFile, 'utf8') : null;
		filesHashNew = md5('recordcounts='+JSON.stringify(recordCountData)+',status='+(orderStatus !== null ? orderStatus.toString() : ''));

		/*if (filesHash == filesHashNew && fs.existsSync(cacheFile)) {
			// Use cached file
			useCache = true;
			httpStatus = 200;
			output = null;
			//console.info('use cache - db: \t\t', performance.now() - loadTime);
			break;
		}*/


		// Load records with provided status(es) from the database
		let sqlWhere = '';
		let collectPage = null;
		if (orderStatus !== null) {
			let sqlWhereItems = [];
			let status = [];
			for (let item of orderStatus) {
				status.push(item);
				
			}
			if (orderStatus.length == 1) {
				if (orderStatus[0]==0) {
					status.push(18);
					collectPage = 'collect';
				} else if (orderStatus[0]==18) {
					status.push(0);
					collectPage = 'warehousecollect';
				}
			}

			sqlWhereItems.push('status IN ('+status.join(',') + ')');

			if (partialrefund=='true') sqlWhereItems.push('c.partialrefund = 1');
			sqlWhere = '('+sqlWhereItems.join(' OR ')+') ';
		}

		let sql = `SELECT
		c.orderID, c.type, c.status, c.groupID, c.notes, c.dailyorder, c.lpg, c.morlife, c.spwarehouse, c.orbit, c.wv, c.me, c.scholastic, c.korimco, c.hyclor, c.splosh, c.sigma, c.misc, c.intertrading, c.factory, c.jv, c.kobayashi, c.tprolls, c.trackingID, c.collector, c.collected, c.packer, c.packedTime, c.packedData, c.rts, c.damagedRts, c.resendRts, c.addBackToInventory, c.morelabel, c.partialrefund, c.locationselected, c.boxDetails, c.page, c.scanned, c.parcelWeights,
		o.store,
		o.orderID AS ordersOrderID 
		FROM
		collecting c inner join orders o on c.orderID = o.id
		WHERE ` + sqlWhere;
		if (morelabel=='true') sql = sql + ' AND c.morelabel > 0';
		if (supplier==13) sql = sql + ' AND (o.store = 102 OR (o.store = 1 AND LOWER(JSON_EXTRACT(JSON_EXTRACT(o.data,"$.items"),"$[*].sku")) like "%rrv_%"))';
		if (supplier==16) sql = sql + ' AND (o.store = 1 AND LOWER(JSON_EXTRACT(JSON_EXTRACT(o.data,"$.items"),"$[*].sku")) like "%pj_%")';
		//if (partialrefund=='true') sql = sql + ' OR collecting.partialrefund = 1';
		sql = sql + ' AND o.store IN (' ;
		for (const [key] of Object.entries(Config.STORES)) {
			sql = sql + key + ',';
		}

		sql = sql.substr(0, sql.length - 1);
		sql = sql + ')';

		let recordsDB = await conn.query(sql);

		// Add each record number and its content to each store's today list
		for (let recordDB of recordsDB) {
			// if (!Config.STORES[recordDB.store]) continue; // Skip orders that are not in the configured stores
			if (supplier && supplier != Config.SUPPLIER_IDS.NonSupplier) {
				//console.log(supplier);
				if (!Config.SUPPLIERS[supplier].stores.includes(recordDB.store.toString())) continue;
			}
			if (!orderData.saleRecords.hasOwnProperty(recordDB.store)) {
				orderData.saleRecords[recordDB.store] = {
					records: {},
					today: {},
				};
			}

			orderData.saleRecords[recordDB.store].today[recordDB.orderID] = {
				//'StoreID': recordDB.store,
				//'RecordNum': recordDB.ordersOrderID,
				'OrderType': recordDB.type,
				'OrderStatus': recordDB.status,
				'GroupID': recordDB.groupID,
				'Notes': recordDB.notes,
				'DailyOrder': recordDB.dailyorder,
				'LPG': recordDB.lpg,
				'MORLIFE': recordDB.morlife,
				'SPWAREHOUSE': recordDB.spwarehouse,
				'ORBIT': recordDB.orbit,
				'WV': recordDB.wv,
				'ME': recordDB.me,
				'SCHOLASTIC': recordDB.scholastic,
				'KORIMCO': recordDB.korimco,
				'HYCLOR': recordDB.hyclor,
				'SPLOSH': recordDB.splosh,
				'SIGMA': recordDB.sigma,
				'MISC': recordDB.misc,
				'INTERTRADING': recordDB.intertrading,
				'FACTORY': recordDB.factory,
				'JV': recordDB.jv,
				// 'SIXPACK': recordDB.sixpack,
				// 'TENPACK': recordDB.tenpack,
				// 'TWENTYPACK': recordDB.twentypack,
				// 'THIRTYPACK': recordDB.thirtypack,
				// 'SIXTYPACK': recordDB.sixtypack,
				// 'GUCCI': recordDB.gucci,
				'KOBAYASHI': recordDB.kobayashi,
				'TPROLLS': recordDB.tprolls,
				'Tracking': recordDB.trackingID,
				'Collector': recordDB.collector,
				'Collected time': recordDB.collected,
				'Packer': recordDB.packer,
				'Packed time': recordDB.packedTime,
				'Previous Packed time': recordDB.packedData,
				'rts': recordDB.rts,
				'damagedRts': recordDB.damagedRts,
				'resendRts': recordDB.resendRts,
				'addBackToInventory': recordDB.addBackToInventory,
				'morelabel': recordDB.morelabel,
				'partialrefund': recordDB.partialrefund,
				'locationselected': recordDB.locationselected,
				'boxDetails': recordDB.boxDetails,
				'page': recordDB.page,
				'scanned': recordDB.scanned,
				'parcelWeights': recordDB.parcelWeights,
			};
		}
		//console.info('db orders using status: \t', performance.now() - loadTime);


		// Load orders from the database
		try {
			// Get all rows
			// var orders = await conn.query('SELECT o.* FROM orders o, collecting c WHERE '+(dateList.start ? 'o.addedDate '+(dateList.end ? '>=' : '=')+' '+conn.connection.escape(dateList.start)+' AND ' : '')+(dateList.end ? 'o.addedDate <= '+conn.connection.escape(dateList.end)+' AND ' : '')+'o.cancelled = 0 AND o.id = c.orderID');
			let sql = 'SELECT o.id, o.store, o.data, o.deliveryNote FROM orders o inner join collecting c on o.id = c.orderID WHERE ' + (dateList.start ? 'o.addedDate ' + (dateList.end ? '>=' : '=') + ' '
				+ conn.connection.escape(dateList.start) + ' AND ' : '') + (dateList.end ? 'o.addedDate <= ' + conn.connection.escape(dateList.end)+' AND ': '')+'o.cancelled = 0';
			
			//Check store
			if(storeAll) {
				sql = sql + ' AND o.store IN (' ;
				for (const [key] of Object.entries(Config.STORES)) {
					sql = sql + key + ',';
				}
				sql = sql.substr(0, sql.length - 1);
				sql = sql + ')';
			} else {
				sql = sql + ' AND o.store IN (' + store + ')';
			}

			var orders = await conn.query(sql);

			let skulist = [];
			for (let orderRow of orders) {
				// Check store
				if ((storeAll && !Config.STORES[orderRow.store]) || (!storeAll && orderRow.store != store)) {
					continue;
				}
				else if (onlyKeepTodayRecords && (!orderData.saleRecords[orderRow.store] || !orderData.saleRecords[orderRow.store].today[orderRow.id])) {
					// Don't get the order data if it isn't needed
					continue;
				}
				else if (!orderData.saleRecords[orderRow.store]) {
					orderData.saleRecords[orderRow.store] = {
						records: {},
						today: {},
					};
				}

				// Get record entry
				let recordData = orderToRecord(orderRow);
				//if (orderRow.id == 15589) console.log(JSON.stringify(recordData));
				if (collectPage != null) {
					if (Config.SUPPLIERS[Config.SUPPLIER_IDS.HOBBYCO].stores.includes(orderRow.store.toString())) {
						let items = recordData.Items;
						for (let item of items) {
							let sku = item.SKU
							if (!sku.startsWith('WV-') && !sku.startsWith('ME-') && !sku.startsWith('LPG-')) {
								skulist.push(conn.connection.escape(sku));
							}
						}
					}
				}


				if (recordData.BuyerAddress1.startsWith('ebay:')) {
					recordData['BuyerAddress3'] = recordData.BuyerAddress1;
					recordData['BuyerAddress1'] = recordData.BuyerAddress2;
					recordData['BuyerAddress2'] = "";
				}

				// Save order
				orderData.saleRecords[orderRow.store].records[orderRow.id] = recordData;
			}


			if (collectPage != null && skulist.length>0) {
				let stockData = {};
				let sql2 = 'SELECT s.customSku, sum(i.indivQty) as total FROM stockinventory s, inventorylocation i WHERE s.id = i.invID AND s.store = 8 AND s.customSku in ('+skulist.join(',')+') AND i.bay like "EMG%" GROUP BY i.invID';
				let stocks = await conn.query(sql2);
				for (let stock of stocks) {
					let customSku = stock.customSku;
					let total = stock.total;
					stockData[customSku] = total;
				}

				for (let storeID in orderData.saleRecords) {
					
					for (let orderID in orderData.saleRecords[storeID].records) {
						let warehousecollect = true;
						let isSupplier = true;
						for (let item of orderData.saleRecords[storeID].records[orderID].Items) {
							if (stockData.hasOwnProperty(item.SKU)) {
								if (stockData[item.SKU] <= 0) {
									warehousecollect = false;
								}
							} else {
								warehousecollect = false;
							}

							if (Config.SUPPLIERS[Config.SUPPLIER_IDS.HOBBYCO].stores.includes(storeID.toString()) && !item.SKU.startsWith('WV-') && !item.SKU.startsWith('ME-') && !item.SKU.startsWith('LPG-')) {
								isSupplier = false;
							}
						}
						
						if (!Config.SUPPLIERS[Config.SUPPLIER_IDS.HOBBYCO].stores.includes(storeID.toString())) warehousecollect = false;
						if (Config.SUPPLIERS[Config.SUPPLIER_IDS.HOBBYCO].stores.includes(storeID.toString()) && isSupplier) warehousecollect = true;
						if (orderData.saleRecords[storeID].today[orderID].page == 'collect') warehousecollect = false;
						if (orderData.saleRecords[storeID].today[orderID].page == 'warehousecollect') warehousecollect = true;
						
						if (warehousecollect) {
							// console.log('aaaaaa');
							if (collectPage=='collect') {
								delete orderData.saleRecords[storeID].records[orderID];
								delete orderData.saleRecords[storeID].today[orderID];
								// console.log('111111');
							} 
						} else {
							// console.log('bbbbbb');
							if (collectPage=='warehousecollect') {
								delete orderData.saleRecords[storeID].records[orderID];
								delete orderData.saleRecords[storeID].today[orderID];
								// console.log('222222');
							}
						}
					}
				}
			}


			
		}
		catch (e) {
			// Error
			httpStatus = 503;
			output.result = e;
			console.log(e);
			break;
		}
		//console.info('order data: \t\t', performance.now() - loadTime);


		// Check if any of the orders in the today lists don't have order data loaded
		if (onlyKeepTodayRecords) {
			for (let storeID in orderData.saleRecords) {
				let saleRecordStore = orderData.saleRecords[storeID];
				let orderIDs = Object.keys(saleRecordStore.today);
		
				for (let orderID of orderIDs) {
					if (!saleRecordStore.records[orderID]) {
						orderData.errorList.push([storeID, orderID]);
					}
				}
			}
		}

		// Find all other orders with the same buyer name/address (aka duplicate/connected orders)
		if (!donGetConnectedOrders) getConnectedOrders(orderData.saleRecords);
		//console.info('connected orders: \t\t', performance.now() - loadTime);

		output.orders = orderData.saleRecords;
		output.errors = orderData.errorList;
		output.result = 'success';
		httpStatus = 200;
	} while(0);

	if (conn.connected) conn.release();
	//console.info('processing done: \t\t', performance.now() - loadTime);


	if (useCache) {
		// Delete old cache/hash files older than 2 days
		glob(__dirname+'/cache/+(cache|hash)-*', (err, files) => {
			for (let file of files) {
				let stats = fs.statSync(file);
				if (new Date() - new Date(stats.mtime) > 86400000) {
					fs.unlink(file, ()=>{});
				}
			}
		});
	}
	else {
		// Update hash file
		fs.writeFile(hashFile, filesHashNew, ()=>{});
	}


	// Output
	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});

	if (output !== null) {
		//console.info('data sending: \t\t', performance.now() - loadTime);
		res.send(httpStatus, output);
		//console.info('data sent: \t\t', performance.now() - loadTime);

		if (output.result == 'success') {
			// Save the output data
			var outputJson = JSON.stringify(output);
			fs.writeFile(cacheFile, outputJson, ()=>{
				fs.chmodSync(cacheFile, 0664);
				//console.info('data saved: \t\t', performance.now() - loadTime);
			});
		}
		return next();
	}
	else {
		fs.readFile(cacheFile, 'utf8', function(err, file) {
			if (err) {
				res.send(500);
				return next();
			}

			res.writeHead(httpStatus, {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(file)
			});
			res.write(file);
			res.end();
			return next();
		});
	}
}

module.exports = loadOrders;
