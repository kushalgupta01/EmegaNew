//  Discount Chemist
//  Order System


const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const updateStockQuantity = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var quantity = req.body.quantity;
	var stockID = req.body.stockID;


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
			await conn.connect();
			
			let sql = 'UPDATE stock SET quantity = ' + quantity + ' WHERE id = ' + stockID;
			await conn.query(sql);
			
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

module.exports = updateStockQuantity;