//  Discount Chemist
//  Order System

// Get items from the database
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const updateOrder = async function(req, res, next) {
	var conn = new Database(dbconn);
	var recordIDs = req.body.record;
	var orderType = req.body.type;
	var orderStatus = req.body.status;
	var group = req.body.group;
	var notes = req.body.notes;
	var dailyorder = req.body.dailyorder == 0 ? 0 : (req.body.dailyorder|| undefined);
	var fgb = req.body.fgb || undefined;
	var morlife = req.body.morlife || undefined;
	var spwarehouse = req.body.spwarehouse || undefined;
	var orbit = req.body.orbit || undefined;
	var wv = req.body.wv || undefined;
	var scholastic = req.body.scholastic || undefined;
	var korimco = req.body.korimco || undefined;
	var hyclor = req.body.hyclor || undefined;
	var splosh = req.body.splosh || undefined;
	var sigma = req.body.sigma || undefined;
	var misc = req.body.misc || undefined;
	var intertrading = req.body.intertrading || undefined;
	var factory =  req.body.factory || undefined;
	var kobayashi = req.body.kobayashi || undefined;
	var tprolls = req.body.tprolls || undefined ;
	var resendRts = req.body.resendRts || undefined;
	var rts = req.body.rts || undefined;
	var weight = req.body.weight || undefined;
	var addBackToInventory = req.body.addBackToInventory || undefined;
	var parcelWeights = req.body.parcelWeights || undefined;
	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var saveAdminUsername = !req.body.dontsaveadmin;

	var output = {result: null};
	var httpStatus = 400;

	do {
		try {
			// Check token
			let user = await userCheckToken(token, true);

			if (!user) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}


			await conn.connect();

			// Update rows
			let sqlSetData = [];

			// Type
			/*if (orderType) {
				if (isNaN(parseInt(orderType, 10))) {
					output.result = 'Order type is invalid.';
					break;
				}
				sqlSetData.push('type = '+conn.connection.escape(orderType));
			}
			*/
			/*if (orderStatus != -1) {
				sqlSetData.push('status = '+conn.connection.escape(orderStatus));
		
				if (orderStatus == 1) {
					// Status is 'collected' so update the collected time
					if (addUsername) sqlSetData.push('collector = '+conn.connection.escape(user.username));
					sqlSetData.push('collected = UTC_TIMESTAMP()');
				}
				else if (orderStatus == 0) {
					// Status is 'none' so clear the collected time
					sqlSetData.push('collector = NULL');
					sqlSetData.push('collected = NULL');
				}
			}*/

			/*if (group) {
				sqlSetData.push('groupID = '+(group ? conn.connection.escape(group) : 'NULL'));
			}*/
			
			if (dailyorder != undefined) {
				sqlSetData.push('dailyorder = '+ conn.connection.escape(dailyorder));
			}
			if (fgb != undefined) {
				sqlSetData.push('fgb = '+ conn.connection.escape(fgb));
			}
			if (morlife != undefined) {
				sqlSetData.push('morlife = '+ conn.connection.escape(morlife));
			}
			if(spwarehouse != undefined) {
				sqlSetData.push('spwarehouse = '+ conn.connection.escape(spwarehouse));
			}
			if(orbit != undefined) {
				sqlSetData.push('orbit = '+ conn.connection.escape(orbit));
			}
			if(wv != undefined) {
				sqlSetData.push('wv = '+ conn.connection.escape(wv));
			}
			if(scholastic != undefined) {
				sqlSetData.push('scholastic = '+ conn.connection.escape(scholastic));
			}
			if(korimco != undefined) {
				sqlSetData.push('korimco = '+ conn.connection.escape(korimco));
			}

			if (hyclor != undefined) {
				sqlSetData.push('hyclor = '+ conn.connection.escape(hyclor));
			}

			if (splosh != undefined) {
				sqlSetData.push('splosh = '+ conn.connection.escape(splosh));
			}

			if (sigma != undefined) {
				sqlSetData.push('sigma = '+ conn.connection.escape(sigma));
			}

			if (misc != undefined) {
				sqlSetData.push('misc = '+ conn.connection.escape(misc));
			}

			if (intertrading != undefined) {
				sqlSetData.push('intertrading = '+ conn.connection.escape(intertrading));
			}

			if (factory != undefined) {
				sqlSetData.push('factory = '+ conn.connection.escape(factory));
			}

			if (weight != undefined) {
				sqlSetData.push('weight = '+ conn.connection.escape(weight));
			}

			// if (sixpack != undefined) {
			// 	sqlSetData.push('sixpack = '+ conn.connection.escape(sixpack));
			// }

			// if (tenpack != undefined) {
			// 	sqlSetData.push('tenpack = '+ conn.connection.escape(tenpack));
			// }

			// if (twentypack != undefined) {
			// 	sqlSetData.push('twentypack = '+ conn.connection.escape(twentypack));
			// }

			// if (thirtypack != undefined) {
			// 	sqlSetData.push('thirtypack = '+ conn.connection.escape(thirtypack));
			// }

			// if (sixtypack != undefined) {
			// 	sqlSetData.push('sixtypack = '+ conn.connection.escape(sixtypack));
			// }

			// if (gucci != undefined) {
			// 	sqlSetData.push('gucci = '+ conn.connection.escape(gucci));
			// }

			if (kobayashi != undefined) {
				sqlSetData.push('kobayashi = '+ conn.connection.escape(kobayashi));
			}

			if (tprolls != undefined) {
				sqlSetData.push('tprolls = ' + conn.connection.escape(tprolls));
			}
			
			if (resendRts != undefined) {
				sqlSetData.push('resendRts = '+ conn.connection.escape(resendRts));

				let packedDatas = await conn.query('SELECT packedData FROM collecting WHERE orderID = '+conn.connection.escape(recordID));
    			let packedData = packedDatas[0].packedData;
    			let date = new Date();
				let date2 = moment.tz(date, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');

    			if (!packedData) {
							packedData = [user.username + ' - ' + date2 + ' - ' +  'Resend RTS'];
						} else {
							packedData = JSON.parse(packedData);
							packedData.push(user.username + ' - ' + date2 + ' - ' +  'Resend RTS');	
						}

						await conn.query('UPDATE collecting SET packedData = '+ conn.connection.escape(JSON.stringify(packedData)) +' WHERE orderID = '+conn.connection.escape(recordID));
						
			}

			if (rts != undefined) {
				sqlSetData.push('rts = '+ conn.connection.escape(rts));
			}

			if (addBackToInventory != undefined) {
				sqlSetData.push('addBackToInventory = '+ conn.connection.escape(addBackToInventory));

				let packedDatas = await conn.query('SELECT packedData FROM collecting WHERE orderID = '+conn.connection.escape(recordID));
    			let packedData = packedDatas[0].packedData;
    			let date = new Date();
				let date2 = moment.tz(date, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');

    			if (!packedData) {
							packedData = [user.username + ' - ' + date2 + ' - ' +  'Add Back To Inventory'];
						} else {
							packedData = JSON.parse(packedData);
							packedData.push(user.username + ' - ' + date2 + ' - ' +  'Add Back To Inventory');	
						}

						await conn.query('UPDATE collecting SET packedData = '+ conn.connection.escape(JSON.stringify(packedData)) +' WHERE orderID = '+conn.connection.escape(recordID));
			} 

			let orderIDs = JSON.parse(recordIDs);

			if (parcelWeights != undefined) {
				sqlSetData.push('parcelWeights = ' + conn.connection.escape(JSON.stringify(JSON.parse(parcelWeights))));
			}

			

			let whereSQL = [];

			for (let orderID of orderIDs) {
				whereSQL.push('orderID='+conn.connection.escape(orderID));
			}
			
			let result = await conn.query('UPDATE collecting SET '+sqlSetData.join(',')+' WHERE '+whereSQL.join(' OR '));

			if (result.affectedRows > 0) {
				httpStatus = 200;
				output.result = 'success';
			}
			else {
				httpStatus = 202;
				output.result = 'No changes made.';
			}
		}
		catch (e) {
			// Error
			httpStatus = 503;
			output.result = e;
			console.log(e);
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

module.exports = updateOrder;
