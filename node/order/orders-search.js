// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData, orderToRecord, getConversionDataByService} = require('./order-convert');
const moment = require('moment-timezone');

const searchOrders = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Get orders
			let keywords = req.body.keywords || null;
			let field = req.body.field;

			// Get orders from the database
			await conn.connect();

			let convertData = [];

			for (let serviceID in Config.SERVICES) {
				convertData.push(getConversionDataByService(serviceID));
			}
			let orders;
			if (field=='name') {
				let sqlWhere = [];
				for (let conD of convertData) {
					let attributesNames = conD.BuyerFullName;
					if (Array.isArray(attributesNames)) {
						sqlWhere.push(`LOWER(JSON_EXTRACT(JSON_EXTRACT(o.data, '$.`+attributesNames[0]+`'), '$.`+attributesNames[1]+`')) like "%`+keywords+`%"`);
					} else {
						sqlWhere.push(`LOWER(JSON_EXTRACT(o.data,'$.`+attributesNames+`')) like "%`+keywords+`%"`);
					}
				}
				orders = await conn.query(`SELECT o.*, c.packedTime, c.status, c.trackingID FROM orders o, collecting c WHERE o.id = c.orderID AND (`+sqlWhere.join(' OR ')+`)`);
			}
			else if (field == 'tracking') {
				orders = await conn.query(`SELECT o.*, c.packedTime, c.status, c.trackingID FROM orders o, collecting c WHERE o.id = c.orderID AND JSON_CONTAINS(LOWER(c.trackingID),'"` + keywords + `"')`);
			}
			else if (field=='title') {
				let sqlWhere = [];
				for (let conD of convertData) {
					let itemsName = conD.Items;
					let titleName = conD.ItemData.Name;
					
					sqlWhere.push(`LOWER(JSON_EXTRACT(JSON_EXTRACT(o.data, '$.`+itemsName+`'), '$[*].`+titleName+`')) like "%`+keywords+`%"`);
					
				}

				let sql = `SELECT o.*, c.packedTime, c.status, c.trackingID FROM orders o, collecting c WHERE o.id = c.orderID AND (`+sqlWhere.join(' OR ')+`)`;
				//console.log(sql);
				orders = await conn.query(sql);
			}
			else if (field=='sku') {
				let sqlWhere = [];
				for (let conD of convertData) {
					let itemsName = conD.Items;
					let skuName = conD.ItemData.SKU;
					
					sqlWhere.push(`LOWER(JSON_EXTRACT(JSON_EXTRACT(o.data, '$.`+itemsName+`'), '$[*].`+skuName+`')) like "%`+keywords+`%"`);
					
				}
				orders = await conn.query(`SELECT o.*, c.packedTime, c.status, c.trackingID FROM orders o, collecting c WHERE o.id = c.orderID AND (`+sqlWhere.join(' OR ')+`)`);
			}
			/*else {
			    orders = await conn.query(`SELECT o.*, c.packedTime, c.status, c.trackingID FROM orders o, collecting c WHERE o.id = c.orderID AND LOWER(JSON_EXTRACT(JSON_EXTRACT(o.data,'$.items'),'$[*].`+field+`')) like "%`+keywords+`%"`);
			
		    }*/
		    
			if (!orders.length) {
				httpStatus = 200;
				output.result = 'No orders.';
				output.orders = null;
				break;
			}	
			let orderData = {};


			for (let order of orders) {
				if (!orderData.hasOwnProperty(order.store)) orderData[order.store] = [];
				orderData[order.store].push({
					id: order.id,
					data: orderToRecord(order),
					packtime: dateSqlToEbay(order.packedTime, 'Australia/Sydney'),
					status: order.status,
					trackingID: order.trackingID
				});
			}

			output.orders = orderData;
			output.result = 'success';
			httpStatus = 200;
			
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

const dateSqlToEbay = function(date, toTimezone) {
	return moment.tz(date, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz(toTimezone).format('YYYY-MM-DD HH:mm:ss');
}

module.exports = searchOrders;