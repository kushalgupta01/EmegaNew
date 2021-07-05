const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const UpdateItem = async function(req, res, next) {
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
				var id = req.body.id;
				var store = req.body.store || '';
				var itemNo = req.body.itemNo || '';
				var sku = req.body.sku || '';
				var itemTitle = req.body.itemTitle || '';
				var itemMultiple = req.body.itemMultiple || '';
				var singleitemMultiple = req.body.singleitemMultiple || '';
				var itemWeight = req.body.itemWeight || '';
				var cartonBarcode = req.body.cartonBarcode || '';
				var indivBarcode = req.body.indivBarcode || '';
				var itemPhoto = req.body.itemPhoto || '';

				var bay = req.body.bay;
				var satchel = req.body.satchel;
				var flatpack = req.body.flatpack || '';
				var fastwayflatpack = req.body.fastwayflatpack || '';
				var vr = req.body.vr || '';

				var bundle = req.body.bundle;
			}

			/*console.log('bay: '+bay);
			console.log('satchel: '+satchel);
			console.log('vr: '+vr);
			console.log('flatpack: '+flatpack);
			console.log('fastwayflatpack: '+fastwayflatpack);*/


			await conn.connect();

			if (store != '') {
				await conn.query('UPDATE items SET itemStore = ' + conn.connection.escape(store) + ' WHERE itemID = ' + id);
			}

			if (itemNo != '') {
				await conn.query('UPDATE items SET itemNo = ' + conn.connection.escape(itemNo) + ' WHERE itemID = ' + id);
			} 

			if (sku != '') {
				await conn.query('UPDATE items SET sku = ' + conn.connection.escape(sku) + ' WHERE itemID = ' + id);
			} 

			if (cartonBarcode != '') {
				await conn.query('UPDATE items SET itemBarcode = ' + conn.connection.escape(cartonBarcode) + ' WHERE itemID = ' + id);
			} 

			if (indivBarcode != '') {
				await conn.query('UPDATE items SET singleItemBarcode = ' + conn.connection.escape(indivBarcode) + ' WHERE itemID = ' + id);
			}

			if (itemTitle != '') {
				await conn.query('UPDATE items SET itemName = ' + conn.connection.escape(itemTitle) + ' WHERE itemID = ' + id);
			} 

			if (itemMultiple != '') {
				await conn.query('UPDATE items SET itemMultiple = ' + conn.connection.escape(itemMultiple) + ' WHERE itemID = ' + id);
			}

			if (singleitemMultiple != '') {
				await conn.query('UPDATE items SET singleItemMultiple = ' + conn.connection.escape(singleitemMultiple) + ' WHERE itemID = ' + id);
			}

			if (itemWeight != '') {
				await conn.query('UPDATE items SET itemWeight = ' + conn.connection.escape(itemWeight) + ' WHERE itemID = ' + id);
			}

			if (itemPhoto != '') {
				await conn.query('UPDATE items SET itemPhoto = ' + conn.connection.escape(itemPhoto) + ' WHERE itemID = ' + id);
			}

			if (bay != 'null') {
				await conn.query('UPDATE items SET bay = ' + conn.connection.escape(bay) + ' WHERE itemID = ' + id);
			}

			if (satchel != 'null') {
				await conn.query('UPDATE items SET satchel = ' + conn.connection.escape(satchel) + ' WHERE itemID = ' + id);
			}

			if (flatpack != '') {
				await conn.query('UPDATE items SET flatpack = ' + conn.connection.escape(flatpack) + ' WHERE itemID = ' + id);
			}

			if (vr != '') {
				await conn.query('UPDATE items SET vr = ' + conn.connection.escape(vr) + ' WHERE itemID = ' + id);
			}

			if (fastwayflatpack != '') {
				await conn.query('UPDATE items SET fastwayflatpack = ' + conn.connection.escape(fastwayflatpack) + ' WHERE itemID = ' + id);
			}

			if (bundle) {
				let validComboItems = JSON.parse(bundle);

				if (validComboItems) {
					await conn.query('UPDATE items SET bundle = ' + conn.connection.escape(JSON.stringify(validComboItems)) + ' WHERE itemID = ' + id);
				} else {
					await conn.query('UPDATE items SET bundle = null WHERE itemID = ' + id);
				}
				
			}	

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


module.exports = UpdateItem;