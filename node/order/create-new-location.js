const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const createNewBay = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var origin = req.params.origin;
	var bay = req.params.destination;
	var lowerBay = bay.toLowerCase();
	var type = req.params.type;
	var numRows = 0;
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

			if (typeof type === 'undefined'){type=0};

			let originTypeQ = await conn.query('SELECT type FROM locationstype WHERE bay='+conn.connection.escape(origin));
			numRows = originTypeQ.length;
			let originType = 0;
			if (numRows > 0) {
				
				originType = originTypeQ[0].type;
			
			}
			let destTypeQ = await conn.query('SELECT * FROM locationstype WHERE bay='+conn.connection.escape(bay));
			numRows = destTypeQ.length;
			if (numRows > 0) {
				
				var destType = destTypeQ[0].type;
			
			}
			else{
				if (lowerBay.startsWith('stage') == true){
					await conn.query('INSERT INTO locationstype (bay,type) VALUES ('+conn.connection.escape(bay)+',2)');
				}
				else{
					if (lowerBay.startsWith('pallet') == true || type == 3){ 
						await conn.query('INSERT INTO locationstype (bay,type) VALUES ('+conn.connection.escape(bay)+',3)');
					}
					else{
						if (originType == 2 || originType == 3) { await conn.query('INSERT INTO locationstype (bay,type) VALUES ('+conn.connection.escape(bay)+',0)')}
						else {await conn.query('INSERT INTO locationstype (bay,type) VALUES ('+conn.connection.escape(bay)+','+originType+')')}
					}
				}
			}
			
			output.result = 'success';
			httpStatus = 200;
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
		console.log(e);
		//break;
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = createNewBay;