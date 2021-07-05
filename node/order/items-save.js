//  Discount Chemist
//  Order System

// Save items into the database
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const saveItem = async function(req, res, next) {
	var conn = new Database(dbconn);
	var itemID = req.body.id;
	var barcode = req.body.barcode || null;
	var quantity = req.body.quantity || null;
	var notes = req.body.notes || null;
	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var singleItemBarcode = req.body.singleItemBarcode || null;
	var singleItemMultiple = req.body.singleItemMultiple || null;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Check token
			let user = await userCheckToken(token, true);

			if (!user) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}
			else if (user.type != Config.USER_TYPE.ADMIN && user.type != Config.USER_TYPE.USER && user.type != Config.USER_TYPE.SUPPLIER && user.type != Config.USER_TYPE.CLIENT) {
				httpStatus = 403;
				output.result = 'Action not allowed.';
				break;
			}

			var action = null;
			const ACTION_BARCODE = 1;
			const ACTION_NOTES = 2;
			const reAlphaNum = /^[a-z0-9]+$/i;

			if (!itemID || !reAlphaNum.test(itemID)) {
				output.result = 'You must enter an item ID, which can only contain letters and numbers.';
				break;
			}
			else if (barcode || quantity || singleItemBarcode || singleItemMultiple) {
				if ((barcode && reAlphaNum.test(barcode) && quantity && reAlphaNum.test(quantity)) || 
					(singleItemBarcode && reAlphaNum.test(singleItemBarcode) && singleItemMultiple && reAlphaNum.test(singleItemMultiple))) {
					action = ACTION_BARCODE;
				}
				else {
					output.result = 'You must enter a barcode and quantity, and each can only contain letters and numbers.';
					break;
				}
			}
			else if (notes) {
				var notesJson = null;
				try {
					notesJson = JSON.parse(notes);
				} catch(e) {}

				if (notesJson) {
					action = ACTION_NOTES;
				}
				else {
					output.result = 'The notes data must be in JSON format.';
					break;
				}
			}


			await conn.connect();

			// Update rows
			var sql = '';
			if (action == ACTION_BARCODE) {
				sql = "UPDATE items SET itemBarcode = "+conn.connection.escape(barcode)
				+", itemMultiple = "+conn.connection.escape(quantity)
				+", singleItemBarcode = "+conn.connection.escape(singleItemBarcode)
				+", singleItemMultiple = "+conn.connection.escape(singleItemMultiple)
				+" WHERE itemID = "+conn.connection.escape(itemID);
			}
			else if (action == ACTION_NOTES) {
				sql = "UPDATE items SET itemNotes = "+conn.connection.escape(notes)+" WHERE itemID = "+conn.connection.escape(itemID);
			}

			if (sql) {
				var result = await conn.query(sql);
				if (result.affectedRows > 0) {
					httpStatus = 200;
					output.result = 'success';
				}
				else {
					httpStatus = 202;
					output.result = 'No changes made.';
				}
			}
			else {
				output.result = 'Data is not valid.';
			}
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = saveItem;
