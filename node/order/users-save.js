// Discount Chemist
// Order System

// Add/update users in the database

const {Config} = require('./config');
const Database = require('./connection');

const userSave = async function(req, res, next) {
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

			try {
				userData = JSON.parse(userData);
			}
			catch (e) {
				userData = null;
			}

			if (!userData || !userData.length) {
				output.result = 'Invalid user data';
				break;
			}


			await conn.connect();

			// Add/update users
			var transactionResult = await conn.transaction(async function() {
				var errorOccurred = false;

				for (let user of userData) {
					// Check data
					if (!user.username || !user.firstname) {
						errorOccurred = 'Username and/or first name is missing for one or more users.';
						conn.rollback(errorOccurred);
						break;
					}

					user.username = user.username.toLowerCase();

					if (!user.id) {
						// Add new user
						if (user.hasOwnProperty('id')) delete user.id;
						let cols = [];
						let values = [];

						for (let col in user) {
							if (!user.hasOwnProperty(col)) continue;
							cols.push(conn.connection.escapeId(col));
							values.push(conn.connection.escape(user[col].trim()));
						}

						await conn.query('INSERT INTO users ('+cols.join(',')+') VALUES ('+values.join(',')+')')
						.catch(err => {
							errorOccurred = err;
						});
					}
					else {
						// Update existing user
						let userID = user.id;
						delete user.id;

						let data = [];
						for (let col in user) {
							if (!user.hasOwnProperty(col)) continue;
							data.push(conn.connection.escapeId(col)+' = '+conn.connection.escape(user[col].trim()));
						}

						await conn.query('UPDATE users SET '+data.join(',')+' WHERE id = '+conn.connection.escape(userID))
						.catch(err => {
							errorOccurred = err;
						});
					}

					if (errorOccurred) {
						httpStatus = 503;
						output.result = 'Could not add entry to database.';
						conn.rollback(errorOccurred);
						break;
					}
				}
				if (errorOccurred) return false;

				var commitResult = await conn.commit();
				if (!commitResult) {
					httpStatus = 503;
					output.result = 'Could not commit transaction.';
					return false;
				}
				return true;
			});

			if (transactionResult) {
				httpStatus = 200;
				output.result = 'success';
			}
			else {
				httpStatus = 500;
				output.result = 'Could not add/update users in the database.';
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

module.exports = userSave;
