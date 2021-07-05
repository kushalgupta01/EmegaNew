const fs = require('fs');
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const upload = async function(req, res, next) {
	var conn = new Database(dbconn);
	var file = req.files.file;
	var name = req.body.name;

	var token = req.header(Config.ACCESS_TOKEN_HEADER);

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
			else if (user.type != Config.USER_TYPE.ADMIN && user.type != Config.USER_TYPE.USER) {
				httpStatus = 403;
				output.result = 'Action not allowed.';
				break;
			}
			let filePath = '../pictures/'+ name;
			fs.renameSync(file.path, filePath);
			if (fs.existsSync(filePath)) {
				httpStatus = 200;
				output.result = 'success';
			}
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

module.exports = upload;