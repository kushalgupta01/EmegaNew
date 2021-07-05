const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const addOrderOriginalItem = async function(req, res, next) {
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
				var dbID = req.body.dbID;
				var items = JSON.parse(req.body.items);
			}


			await conn.connect();

			let result = await conn.query('select originalItems from collecting where orderID=' + dbID);

			if (result.length == 0) {
				output.result = 'Order not exist.';
				break;
			} else if (result[0].originalItems) {
				output.result = 'Original Items exist.';
				break;
			}
			
			await conn.query('UPDATE collecting set originalItems = ' + conn.connection.escape(JSON.stringify(items)) + ' WHERE orderID = ' + dbID);		

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

module.exports = addOrderOriginalItem;