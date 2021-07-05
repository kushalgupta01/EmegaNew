const Database = require('./connection');
const {Config} = require('./config');

const {userCheckToken} = require('./users-token');


const updateAwait = async function(req, res, next) {
	var conn = new Database(dbconn);
	var token = req.header(Config.ACCESS_TOKEN_HEADER) || null;

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
			else if (user.type != Config.USER_TYPE.ADMIN) {
				httpStatus = 403;
				output.result = 'Action not allowed.';
				break;
			}

			// Get parameters
			let orderType, orderStatus;
			let buyerInfo = null;

			if (req.body && Object.keys(req.body).length) {
				
				if (req.body.id) {
					recordNum = req.body.id;
				}
				orderType = req.body.type;
				orderStatus = req.body.status;
				trackID = req.body.trackingID;
				notes = req.body.notes;
			}
			else {
				output.result = 'Invalid data.';
				break;
			}


			await conn.connect();
			let method = req.method.toLowerCase();

			if (method == 'post') {

				// Check order ID
				let orderIDMS = conn.connection.escape(recordNum);
				let orderData = await conn.query('SELECT * FROM orders WHERE id = '+orderIDMS);

				if (!orderData.length) {
					httpStatus = 404;
					output.result = 'Cannot find the specified ID in the database.';
					break;
				}

				// Update record data
				let orderTypeMS = (orderType != -1) ? conn.connection.escape(orderType) : 'NULL';
				let orderStatusMS = conn.connection.escape(orderStatus);
				let trackingData = [];
				let tracking = trackID.split(',');
				for (let entry of tracking) {
					let value = entry.trim();
					if (!value) continue;
					trackingData.push(value);
				}
				let trackIDMS = conn.connection.escape(JSON.stringify(trackingData));
				let notesMS = conn.connection.escape(notes);

				// Update the collecting table
				await conn.query('UPDATE collecting SET type = '+orderTypeMS+', status = '+orderStatusMS+', trackingID = '+trackIDMS+', notes = '+notesMS+' WHERE orderID = '+orderIDMS);

				output.result = 'success';
				httpStatus = 200;
				
				
				
			}
			else {
				output.result = 'Unsupported method.';
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



module.exports = updateAwait;