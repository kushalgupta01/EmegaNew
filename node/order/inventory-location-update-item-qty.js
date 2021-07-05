const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const updateQtyinBay = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	
	var id = req.body.id;
	var qty = req.body.qty;
	//console.log('id '+id+' qty '+qty);
	var type = req.body.type;
	var reason = (req.body.reason == 'null' || req.body.reason == '') ? null : req.body.reason;
	var pageType = (req.body.pageType == 'null' || req.body.pageType == '') ? null : req.body.pageType;
	var store = (req.body.store == 'null' || req.body.store == '') ? null : req.body.store;
	let date = new Date();
	let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');
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
			let user = await userCheckToken(token, true);
			var rowselected = await conn.query('SELECT * FROM inventorylocation WHERE id = ' + id);
			let oldQty = rowselected[0].indivQty;
			let invID = rowselected[0].invID;
			let bay = rowselected[0].bay;
			let actionType = "";
			let balance = parseInt(qty) - parseInt(oldQty);
			if (parseInt(qty) !== parseInt(oldQty)) {
			if (balance > 0){
				//addition
				actionType='Addition';
			}
			else if (balance < 0){
				//deduction
				actionType='Deduction';
			}
			let sql = 'UPDATE inventorylocation SET indivQty = ' + qty + ' WHERE id = ' + id;
			await conn.query(sql);

			if(pageType == 'Receive Stock' && (store != 8 && typeof store !== 'undefined')) {actionType='ReceiveStock';};
			await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType, reason) VALUES (' 
					                              + invID + ', '
					                              + conn.connection.escape(bay) + ', '
					                              + oldQty + ', '
					                              + conn.connection.escape(bay) + ', '
					                              + balance + ", '" 
					                              + date2 + "', "
					                              + conn.connection.escape(user.username) + ", '"
									              + actionType + "', " 
									              + type + ', '
									              + type +', '
									              + conn.connection.escape(reason) +')');
			output.equal = false;
			}
			else {
				output.equal = true;
			}
			output.result = 'success';
			httpStatus = 200;
		} while(0);
	}
	catch (e) {
		//console.log('test');
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

module.exports = updateQtyinBay;