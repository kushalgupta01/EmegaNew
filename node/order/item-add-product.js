//  Discount Chemist
//  Order System

const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const addProduct = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			if (method == 'post') {
				var store = req.body.store;
				var itemNo = req.body.itemNo;
				var itemName = req.body.itemName;
				var sku = req.body.sku;
				var customSku = req.body.customSku;
				var itemBarcode = (req.body.itemBarcode == 'null' || req.body.itemBarcode == '')? null : req.body.itemBarcode;
				var cartonBarcode = (req.body.cartonBarcode == 'null' || req.body.cartonBarcode == '')? null : req.body.cartonBarcode;
				var stockInHand = req.body.stockInHand || 0;
				var indivQty = req.body.indivQty || 0;
				var cartonQty = req.body.cartonQty || 0;
				var innerQty = req.body.innerQty || 0;
				var quantityPerCarton = (req.body.quantityPerCarton == 'null' || req.body.quantityPerCarton == '')? null : req.body.quantityPerCarton;
				var reservedQuantity = req.body.reservedQuantity || 0;
				var damagedQty = req.body.damagedQty || 0;
				var stockReceived = (req.body.stockReceived == 'null' || req.body.stockReceived == '') ? null : req.body.stockReceived;
				var stockSent = req.body.stockSent || 0;
				var weight = req.body.weight || 0;
				var bay = (req.body.bay == 'null' || req.body.bay == ''  )? null :req.body.bay;
				var expiry = req.body.expiry;
				var coreCloseout = req.body.coreCloseout;
				var clearance = req.body.clearance;
				var supplier = req.body.supplier;
				var price = req.body.price;
				var image = req.body.image;
				var packsize = req.body.packsize;
			}


			await conn.connect();

			let result = await conn.query('select 1 from stockinventory where itemBarcode=' + conn.connection.escape(itemBarcode));

			if (result.length > 0) {
				httpStatus = 200;
				output.result = 'Item exists.';
				break;
			}
			
			await conn.query('INSERT INTO stockinventory (itemNo, itemName, sku, customSku, itemBarcode, cartonBarcode, stockInHand, indivQty, cartonQty, quantityPerCarton, innerQty, weight, stockReceived, stockSent, bay, expiry, coreCloseout, clearance, supplier, price, image, packsize, store, damagedQty) VALUES (' + 
				conn.connection.escape(itemNo) + ', ' + conn.connection.escape(itemName) + ', ' + conn.connection.escape(sku) + ', ' 
				+ conn.connection.escape(customSku) + ' , '+ conn.connection.escape(itemBarcode) + ', ' + conn.connection.escape(cartonBarcode) + ', ' 
				+ conn.connection.escape(stockInHand) + ' , ' + conn.connection.escape(indivQty) + ' , '+ conn.connection.escape(cartonQty) + ' , '
				+ conn.connection.escape(quantityPerCarton) + ', ' + conn.connection.escape(innerQty) + ', '+ conn.connection.escape(weight) + ', '
				+ ' NULL ' + ', '+ conn.connection.escape(stockSent) + ', ' + conn.connection.escape(bay) + ', ' 
				+ conn.connection.escape(expiry) +', ' + conn.connection.escape(coreCloseout) + ', ' + conn.connection.escape(clearance) + ', ' 
				+ conn.connection.escape(supplier) + ', ' + conn.connection.escape(price) + ', ' + conn.connection.escape(image)+', ' 
				+ conn.connection.escape(packsize)+', ' + conn.connection.escape(store) +', ' + conn.connection.escape(damagedQty) +')');
				
			output.result = 'success';
			httpStatus = 200;
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

function dateToSql() {
	let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    let localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
	return localISOTime.replace('T', ' ').replace('Z', '').slice(0, -4);
}

module.exports = addProduct;