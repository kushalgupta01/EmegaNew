const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');
const {commonData, getConversionData} = require('./order-convert');

const ordersPackedByUser = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();
	var date = req.params.date;
	var searchType = req.params.searchType;

	var startday = getDateValue(new Date());
	var endday = getDateValue(new Date());
		startday = date +' 00:00:00';
		endday = date +' 23:59:59';
		var desiredFormate = "YYYY-MM-DD HH:mm:ss";
		var zone = 'Australia/Sydney';
		var m = moment.tz(startday, desiredFormate, zone);
		var n = moment.tz(endday, desiredFormate, zone);
		m.utc();
		n.utc();
	startday = m.format(desiredFormate);
	endday = n.format(desiredFormate);

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	// var store = req.params.store;
	var output = {result: null};res
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

			//if (searchType == 'name'){
				var sql = 'SELECT packer, count(*) as packed_total FROM orders inner join collecting c on orders.id = c.orderID WHERE packedData is not null AND orders.cancelled = 0 AND (c.packedData LIKE "%OVERRIDE%" or c.packedData LIKE "%PACKED%") AND c.packedData LIKE "%'+date+'%" GROUP BY packer ORDER BY `packed_total` DESC';
				'SELECT * FROM orders inner join collecting c on orders.id = c.orderID WHERE packedData is not null AND orders.cancelled = 0 AND c.status in (3,8) AND c.packedData LIKE "%2021-02-26%"'
				//var sql = 'SELECT packer, count(*) as packed_total FROM orders inner join collecting c on orders.id = c.orderID WHERE packedData is not null AND orders.cancelled = 0 AND c.status in (3,8) AND c.packedTime >= ' + conn.connection.escape(startday) + ' AND c.packedTime <= ' + conn.connection.escape(endday) + ' GROUP BY packer ORDER BY `packed_total` DESC';
				var locations = await conn.query(sql);
				var sql2 = 'SELECT packer, orders.data, orders.store, packedTime, packedData, orders.id FROM orders inner join collecting c on orders.id = c.orderID WHERE packedData is not null AND orders.cancelled = 0 AND (c.packedData LIKE "%OVERRIDE%" or c.packedData LIKE "%PACKED%") AND c.packedData LIKE "%'+date+'%"';
				//var sql2 = 'SELECT packer, orders.data, orders.store, packedTime, packedData, orders.id FROM orders inner join collecting c on orders.id = c.orderID WHERE packedData is not null AND orders.cancelled = 0 AND c.status in (3,8) AND c.packedTime >= ' + conn.connection.escape(startday) + ' AND c.packedTime <= ' + conn.connection.escape(endday);
				var locations2 = await conn.query(sql2);
				for (let i=0 ; i<locations2.length; i++){
					let location = locations2[i];
					//console.log(location.store);
					//console.log(location.packedData);
					let someStr = location.packedData.toString();
					//someStr = someStr.slice(1, -1);
					//someStr = someStr.split('"').join('');
					//console.log(someStr);
					if (someStr.includes('PACKED') == false && someStr.includes('OVERRIDE') == false){


						locations.forEach(item1 => {
						if (item1.packer == location.packer) {
				         		item1.packed_total = parseInt(item1.packed_total)-1;
				      		}
				   		});

						/*someStr = someStr.slice(1, -1);
						someStr = someStr.split('"').join('');
						someStr = parse(someStr);
						console.log(someStr);*/
					}
					else {
						someStr = someStr.slice(1, -1);
						someStr = someStr.split('"').join('');
						someStr = parse(someStr);
						if (someStr.length > 1){
							let userPacker = location.packer;
							let count = 0;
							for(var j = 0; j < someStr.length; j++){
								if(someStr[j].Action == 'PACKED' || someStr[j].Action == 'OVERRIDE'){
									count++;
								}	
							}
							if (count > 1 ){
								let samePrevPacker = 0;
								for(var j = 0; j < someStr.length; j++){
									if (userPacker != someStr[j].User && date == someStr[j].Time.slice(0,10)){
										locations.forEach(item1 => {
										if (item1.packer == someStr[j].User) { 
								         		item1.packed_total = parseInt(item1.packed_total)+1; //adding one more if packer is different from packer and same date
								      		}
								   		});
									}
									else if (userPacker == someStr[j].User ){
										samePrevPacker ++;
									}
								}
								if (samePrevPacker > 0){
									let sum = 0;
									for(var j = 0; j < someStr.length; j++){
										if (userPacker == someStr[j].User && date == someStr[j].Time.slice(0,10)){
											sum++;
										}
									}
									if (sum > 1){
										locations.forEach(item1 => {
										if (item1.packer == userPacker) {
								         		item1.packed_total = parseInt(item1.packed_total)+(sum-1);
								      		}
								   		});
									}
									else if (sum == 0){
										locations.forEach(item1 => {
										if (item1.packer == userPacker) {
								         		item1.packed_total = parseInt(item1.packed_total)-1;
								      		}
								   		});
									}
								}
							}
							else if (count == 1 ){
								for(var j = 0; j < someStr.length; j++){
									if (someStr[j].Action == 'PACKED' || someStr[j].Action == 'OVERRIDE'){
										if (date != someStr[j].Time.slice(0,10)){
											locations.forEach(item1 => {
											if (item1.packer == userPacker) {
									         		item1.packed_total = parseInt(item1.packed_total)-1;
									      		}
									   		});
										}
									}
								}
							}

							/*else if (count > 1 && count2 < 2){

							}*/
							
						}
						else if (someStr.length == 1 && someStr[0].User != location.packer){
							if(someStr[0].Action == 'PACKED' || someStr[j].Action == 'OVERRIDE'){
								locations.forEach(item1 => {
									if (item1.packer == someStr[0].User) { 
							         		item1.packed_total = parseInt(item1.packed_total)+1; //adding one more if packer is different from packer and same date
							      		}
							   		});
							}
							locations.forEach(item1 => {
							if (item1.packer == location.packer) {
					         		item1.packed_total = parseInt(item1.packed_total)-1;
					      		}
					   		});
						}
					}
					/*var obj = JSON.parse(location.packedData);
					console.log(location.packedTime);
					console.log(obj);*/

					/*for (let j=0; j<location.packedData.length; j++){
						console.log(location.packedData[j]);
					}*/
				}
				
			//}
			//else if (searchType == 'items'){
				//SELECT * FROM orders inner join collecting c on orders.id = c.orderID WHERE packedData is not null AND orders.cancelled = 0 AND c.status in (3,8) AND c.packedTime >= '2021-02-25 13:00:00' AND c.packedTime <= '2021-02-26 12:59:59' 
				var sql3 = 'SELECT packer, orders.data, orders.store, locationselected, packedData,weight as packed_total_weight FROM orders inner join collecting c on orders.id = c.orderID WHERE packedData is not null AND orders.cancelled = 0 AND (c.packedData LIKE "%OVERRIDE%" or c.packedData LIKE "%PACKED%") AND c.packedData LIKE "%'+date+'%"'; ;
				//var sql3 = 'SELECT packer, orders.data, orders.store, locationselected FROM orders inner join collecting c on orders.id = c.orderID WHERE packedData is not null AND orders.cancelled = 0 AND c.status in (3,8) AND c.packedTime >= ' + conn.connection.escape(startday) + ' AND c.packedTime <= ' + conn.connection.escape(endday) ;
				var locations3 = await conn.query(sql3);
				if (locations3.length > 0){
					let locationsTemp = [];
					//let hobbyco = Config.SUPPLIERS['7'].stores;delete locations3[i].packedData;
					for (let i=0 ; i<locations3.length; i++){
						checkNumPackers = 0;
						let location = locations3[i];
						//console.log(location);
						let someStr = location.packedData.toString();
						someStr = someStr.slice(1, -1);
						someStr = someStr.split('"').join('');
						someStr = parse(someStr);
						let data = JSON.parse(locations3[i].data);
						let convertData = getConversionData(locations3[i].store);//get conversiondata for that store
						let itemConvert = convertData.ItemData; //get convertItem for that store
						let lineItems = data[convertData.Items]; //convert items for that store
						

						let checkWeight = locations3[i].packed_total_weight;

						if (checkWeight == 0 /*|| checkWeight > 1000*/){
							//console.log('OrderID'+data[convertData.OrderID]);
							let totalWeight = 0;
							for (let i=0; i<lineItems.length; i++) {
								let lineItem = lineItems[i];
								let quantity = parseFloat(lineItem[itemConvert.Quantity]);
								let sku = lineItem[itemConvert.SKU];
								
								let itemNo = lineItem[itemConvert.ItemID];
								let weightSql;
								if(typeof itemNo === 'undefined') {
									weightSql = await conn.query('SELECT itemWeight FROM items WHERE sku ='+conn.connection.escape(sku)+' AND itemStore='+location.store+' ORDER BY `items`.`itemWeight` DESC');
								}
								else {
									weightSql = await conn.query('SELECT itemWeight FROM items WHERE sku ='+conn.connection.escape(sku)+' AND itemStore='+location.store+' AND itemNo='+conn.connection.escape(itemNo)+' ORDER BY `items`.`itemWeight` DESC');
								}
								if (weightSql.length == 0){
									weightSql = await conn.query('SELECT itemWeight FROM items WHERE sku ='+conn.connection.escape(sku)+' ORDER BY `items`.`itemWeight` DESC');
								}
								let itemWeight;
								if (weightSql.length > 0){
									itemWeight = parseFloat(weightSql[0].itemWeight);
								}
								else {
									itemWeight = 0;
								}
								totalWeight = totalWeight + (quantity*itemWeight);
							}
							locations3[i].packed_total_weight = totalWeight;
						}


						if (someStr.length > 1){
							let userPacker = location.packer;
							let count = 0;
							for(var j = 0; j < someStr.length; j++){
								if(someStr[j].Action == 'PACKED' || someStr[j].Action == 'OVERRIDE'){
									count++;
								}	
							}
							if (count > 1 ){
								let samePrevPacker = 0;
								for(var j = 0; j < someStr.length; j++){
									if (userPacker != someStr[j].User && date == someStr[j].Time.slice(0,10)){
										//console.log(locations3);
										let totalQuantity = 0
										for (let i=0; i<lineItems.length; i++) {
											let lineItem = lineItems[i];
											if (lineItem['partialrefund'] != 1){
												totalQuantity = totalQuantity + parseInt(lineItem[itemConvert.Quantity]);
											}
										}
										let newRow = {
											packer: someStr[j].User,
											packed_total_quantity: totalQuantity,
											packed_total_weight: location.packed_total_weight
										}
										locationsTemp.push(newRow);
									}
									else if (userPacker == someStr[j].User ){
										samePrevPacker ++;
									}
								}
								if (samePrevPacker > 0){
									let sum = 0;
									for(var j = 0; j < someStr.length; j++){
										if (userPacker == someStr[j].User && date == someStr[j].Time.slice(0,10)){
											sum++;
										}
									}
									let totalQuantity = 0
									for (let i=0; i<lineItems.length; i++) {
										let lineItem = lineItems[i];
										if (lineItem['partialrefund'] != 1){
											totalQuantity = totalQuantity + parseInt(lineItem[itemConvert.Quantity]);
										}
									}
									totalQuantity = parseInt(totalQuantity)*sum;
									
									if (totalQuantity > 0){
										delete locations3[i].data;
										delete locations3[i].store;
										delete locations3[i].locationselected;
										delete locations3[i].packedData;
										locations3[i].packed_total_quantity = totalQuantity;
									}
									else {																			
										delete locations3[i];
									}

								}
							}
							else if (count == 1 ){
								for(var j = 0; j < someStr.length; j++){
									if (someStr[j].Action == 'PACKED' || someStr[j].Action == 'OVERRIDE'){
										if (date != someStr[j].Time.slice(0,10)){
											delete locations3[i];
										}
										else {
											let totalQuantity = 0
											for (let i=0; i<lineItems.length; i++) {
												let lineItem = lineItems[i];
												if (lineItem['partialrefund'] != 1){
													totalQuantity = totalQuantity + parseInt(lineItem[itemConvert.Quantity]);
												}
											}
											delete locations3[i].data;
											delete locations3[i].store;
											delete locations3[i].locationselected;
											delete locations3[i].packedData;
											locations3[i].packer = someStr[j].User;
											locations3[i].packed_total_quantity = totalQuantity;
										}
									}
								}
							}
							/*else{
								console.log('fatal error');
							}*/

						}
						else if (someStr.length == 1){
							if(someStr[0].Action == 'PACKED' || someStr[0].Action == 'OVERRIDE'){
								if (someStr[0].User != location.packer){
									locations3[i].packer = someStr[0].User;
								}
								//if (hobbyco.includes(locations3[i].store.toString()) == true){
									/*if (locations3[i].locationselected){
										let lineLocations = locations3[i].locationselected;
										console.log(data[convertData.OrderID]+' store'+locations3[i].store);
										console.log(lineLocations);
									}*/
								//}
								let totalQuantity = 0
								for (let i=0; i<lineItems.length; i++) {
									let lineItem = lineItems[i];
									
									if (lineItem['partialrefund'] != 1){
										totalQuantity = totalQuantity + parseInt(lineItem[itemConvert.Quantity]);
									}

								}
								delete locations3[i].data;
								delete locations3[i].store;
								delete locations3[i].locationselected;
								delete locations3[i].packedData;
								locations3[i].packed_total_quantity = totalQuantity;
							}
							/*else{
								console.log('fatal error3');
							}*/
						}
						/*else{
							console.log('fatal error2');
						}*/
						
						
					}
					for (let locationTemp of locationsTemp){
						locations3.push(locationTemp);
					}
					var result = [];
					locations3.forEach(function(obj) {
						if (obj){
							var packer = obj.packer;
						  	if(!this[packer]) result.push(this[packer] = obj);
						  	else {
						  		this[packer].packed_total_quantity += obj.packed_total_quantity;
						  		this[packer].packed_total_weight += obj.packed_total_weight;
						  	}
					  	}
					}, Object.create(null));
					result.sort(function(a, b) { 
						return b.packed_total_quantity- a.packed_total_quantity;
					})
					locations3 = result;
					//console.log(locations3);
				}
				locations = locations.map(t1 => ({...t1, ...locations3.find(t2 => t2.packer === t1.packer)}));
				/*if ( orderID.startsWith('B2B') ) {
					let sumItems = 0;
					for (let item of order.Items){
						sumItems = sumItems + parseInt(item.Quantity);
					}
					text = sumItems;
				}*/
			//}
			//else if (searchType == 'weight'){
				//var sql4 = 'SELECT packer, sum(weight) as packed_total_weight FROM orders inner join collecting c on orders.id = c.orderID WHERE packedData is not null AND orders.cancelled = 0 AND c.status in (3,8) AND c.packedTime >= ' + conn.connection.escape(startday) + ' AND c.packedTime <= ' + conn.connection.escape(endday) + ' GROUP BY packer ORDER BY `packed_total_weight` DESC';
				//var locations4 = await conn.query(sql4);
				//console.log(locations4);
				//locations = locations.map(t1 => ({...t1, ...locations4.find(t2 => t2.packer === t1.packer)}));
			//}
			//var sql = "SELECT store,itemName,sku,newBay,newQty,actionTime,actionBy,actionType FROM `transferlogs` tl LEFT JOIN stockinventory si ON tl.invID = si.id WHERE (newBay LIKE 'emg-%' or newBay LIKE 'a%') AND actionTime >= '"+date+" 00:00:00' AND actionTime < '"+date+" 23:59:59' ORDER BY `tl`.`newBay` ASC ";
			
			//console.log(locations);

			if (locations.length==0) {
				httpStatus = 404;
				output.result = 'No records.';
				break;
			}
			
			output.locations = locations;
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

function getDateValue(date) {
	return date.getFullYear().toString()+('00'+(date.getMonth()+1)).slice(-2)+('00'+date.getDate()).slice(-2);
}

function parse(str) {
	const extractPart = str.split(",").map(s => s.trim());
	return extractPart.map(splitEachPart);
}

function splitEachPart(str) {
    const [user, time, packed] = str.split(" - ");
 
		return {
			User: user,
		        Time: time,
		        Action: packed
    		}
	
}

function isPacked(fruit) {
	return fruit.Action === 'PACKED'
}

module.exports = ordersPackedByUser;