// Discount Chemist
// Order System

// Get users from the database

const {Config} = require('./config');
const Database = require('./connection');

const userGet = async function(req, res, next) {
	var conn = new Database(dbconn);
	var password = req.query.pw || null;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (!password) {
				httpStatus = 401;
				output.result = 'Password was not provided.';
				break;
			}
			else if (password != Config.USER_MANAGEMENT_PW) {
				httpStatus = 403;
				output.result = 'Incorrect password.';
				break;
			}

			// Get users from the database
			await conn.connect();
			let users = await conn.query('SELECT * FROM users');

			if (!users.length) {
				httpStatus = 200;
				output.result = 'No users.';
				output.users = null;
				break;
			}

			output.users = users;
			output.result = 'success';
			httpStatus = 200;
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

module.exports = userGet;
