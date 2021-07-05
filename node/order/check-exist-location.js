const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const checkLocationExist = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var bay = req.params.bay;

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

			await conn.connect();
			var resultados = await conn.query('SELECT COUNT(id) as resultado FROM locationstype WHERE bay='+conn.connection.escape(bay));
			var result = JSON.stringify(resultados[0].resultado);
			if (result == 0 || result === null || result == '0'){
				httpStatus = 200;
				output.return = false;
				output.result = 'No location found.';
			} 
			else{
			output.return = true;
			output.result = 'success';
			httpStatus = 200;
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

module.exports = checkLocationExist;