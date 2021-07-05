// Discount Chemist
// Order System

// Delete users from the database

const {Config} = require('./config');
const Database = require('./connection');

const userRemove = async function(req, res, next) {
	var conn = new Database(dbconn);
	var password = req.body.pw || null;
	var userData = req.body.users || null;

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

			await conn.connect();

			let userArray = [];

			try {
				userData = JSON.parse(userData);

				if (userData.length != 1) {
					output.result = 'Only one user can be removed at a time.';
					break;
				}
				else if (!userData[0]) {
					output.result = 'No user IDs supplied.';
					break;
				}

				userArray.push(conn.connection.escape(userData[0]));

				/*for (let entry of userData) {
					userArray.push(conn.connection.escape(entry));
				}*/
			}
			catch (e) {
				output.result = 'Invalid user data.';
				break;
			}


			// Delete users from the database
			let result = await conn.query('DELETE FROM users WHERE id IN ('+userArray.join(',')+')');

			if (result.affectedRows > 0) {
				httpStatus = 200;
				output.result = 'success';
			}
			else {
				httpStatus = 503;
				output.result = 'User does not exist in the database or has already been deleted.';
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

module.exports = userRemove;
