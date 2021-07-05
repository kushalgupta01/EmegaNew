// Discount Chemist
// Order System

// Get users from the database

const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken, createToken} = require('./users-token');

const userLogin = async function(req, res, next) {
	var conn = new Database(dbconn);
	var username = req.body.username || null;
	var password = req.body.password || null;
	var token = req.header(Config.ACCESS_TOKEN_HEADER) || null;

	var output = {result: null};
	var httpStatus = 400;

	do {
		let user = null;

		if (token) {
			user = await userCheckToken(token, true);
			if (!user) {
				httpStatus = 403;
				output.result = 'Invalid user token.';
				break;
			}
		}
		else if (username && password) {
			try {
				// Get users from the database
				await conn.connect();

				let users = await conn.query('SELECT * FROM users WHERE username = '+conn.connection.escape(username.toLowerCase())+' AND password = '+conn.connection.escape(password)+' AND type != '+conn.connection.escape(Config.USER_TYPE.DISABLED));

				if (!users.length) {
					httpStatus = 404;
					output.result = 'The specified user does not exist.';
					break;
				}

				user = users[0];
			}
			catch (e) {
				// Error
				httpStatus = 503;
				output.result = 'k';
				break;
			}
		}
		else {
			output.result = 'Missing input data.';
			break;
		}

		if (user) {
			output.user = {
				id: user.id,
				username: user.username,
				password: user.password,
				firstname: user.firstname,
				lastname: user.lastname,
				type: user.type,
				supplier: user.supplier,
				token: createToken(user),
			};
			output.result = 'success';
			httpStatus = 200;
		}
	} while(0);
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = userLogin;
