const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const updateBayType = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	
	let date = new Date();
	let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');
	var origin = req.body.origin;
	var destination = req.body.destination;
	var taipe = req.body.type;
	var ids = JSON.parse(req.body.ids);
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

			let secondids = [];
		if (ids[0].id){
			if (destination == origin) {
				break;
			}
			
			for (let id of ids) {
				let cod = id.id;
				let results = await conn.query('SELECT * FROM inventorylocation WHERE id='+cod);
				let invID = results[0].invID;
				let indivQty = results[0].indivQty;
				let oldBay = results[0].bay;
				let secondid = {};
				
				//UPDATE EXISTING LOCATION
				var resultados = await conn.query('SELECT COUNT(id) as resultado FROM inventorylocation WHERE invID='+invID+' AND bay='+conn.connection.escape(destination));
				var result = JSON.stringify(resultados[0].resultado);
				if (result == 1){
					// console.log('ONE existed entry FOUND for item ('+results[0].customSku+') at bay: ('+destination+')');
						await conn.query('UPDATE inventorylocation SET indivQty=indivQty+'+indivQty+' WHERE invID='+invID+' AND bay='+conn.connection.escape(destination));
						// console.log('UPDATE inventorylocation SET indivQty=indivQty+'+indivQty+' WHERE invID='+invID+' AND bay='+conn.connection.escape(destination));
						var selids = await conn.query('SELECT * FROM inventorylocation WHERE invID='+invID+' AND bay='+conn.connection.escape(destination));
						secondid.id = selids[0].id;
						secondids.push(secondid);
					await conn.query('DELETE FROM inventorylocation WHERE id='+cod);
				}
				else {
					// console.log('did NOT find entry for item ('+results[0].customSku+') at bay: ('+destination);
					await conn.query('UPDATE inventorylocation SET bay='+conn.connection.escape(destination)+' WHERE id='+cod);
					if (destination.startsWith('stage') || destination.startsWith('STAGE') || destination.startsWith('Stage'))
						{await conn.query('UPDATE inventorylocation SET bay = UPPER(bay) WHERE id='+cod)};
					// console.log('UPDATE inventorylocation SET bay='+conn.connection.escape(destination)+' WHERE id='+cod);
				}
				let oldType;
				let teste="";
				let oldrow = await conn.query('SELECT * FROM locationstype WHERE bay='+conn.connection.escape(origin));
				if (oldrow.length==1){oldType = oldrow[0].type; teste=origin;}
				else{
					teste = oldBay;
					var por = await conn.query('SELECT * FROM locationstype WHERE bay='+conn.connection.escape(oldBay));
					if (por.length>0) {
						oldType = por[0].type;
					} else {
						oldType = 0;
					}
						
				}
				let newrow = await conn.query('SELECT * FROM locationstype WHERE bay='+conn.connection.escape(destination));
				let type = 0
				if (newrow.length>0) {
					type = newrow[0].type;
				} 
				await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
					                              + invID + ', '
					                              + conn.connection.escape(teste) + ', '
					                              + indivQty + ', '
					                              + conn.connection.escape(destination) + ', '
					                              + indivQty + ", '" 
					                              + date2 + "', "
					                              + conn.connection.escape(user.username) + ', '
									              + "'Transfer', " 
									              + oldType + ', '
									              + type +')');

			}
			for (let secondid of secondids) {
				let obj = {};
				obj.id = String(secondid.id);
				ids.push(obj);
			}
			output.ids = ids;
		}
		else{
			for (let id of ids) {
				let secondid = {};
				let cod = id.invID;
				let sku = id.sku;
				let indivQty = id.indivQty;
				await conn.query('INSERT INTO inventorylocation (invID, customSku, indivQty, cartonQty, bay, type) VALUES ('+cod+','+conn.connection.escape(sku)+','+indivQty+','+0+','+conn.connection.escape(destination)+','+null+')');
				var selids = await conn.query('SELECT * FROM inventorylocation WHERE invID='+cod+' AND bay='+conn.connection.escape(destination));
				secondid.id = selids[0].id;
				secondids.push(secondid);
				await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
		                              + cod + ', '
		                              + null + ', '
		                              + null + ', '
		                              + conn.connection.escape(destination) + ', '
		                              + indivQty + ", '" 
		                              + date2 + "', "
		                              + conn.connection.escape(user.username) + ', '
						              + "'New', " 
						              + null + ', '
						              + null +')');
			}
			await conn.query('INSERT INTO locationstype (bay, type) VALUES ('+conn.connection.escape(destination)+',0) ON DUPLICATE KEY UPDATE bay=bay');

			for (let secondid of secondids) {
				let obj = {};
				obj.id = String(secondid.id);
				ids.push(obj);
			}
			output.ids = ids;
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
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = updateBayType;