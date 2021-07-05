// Discount Chemist
// Order System

// Mark orders as sent

const Database = require('./connection');
const {getConversionData, getField} = require('./order-convert');
const {Config} = require('./config');

const addOrdersCollect = async function(req, res, next) {
	var conn = new Database(dbconn);
	var orderListData = req.body.orders || null;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			await conn.connect();
			
			let orderList = {};
			let orderListArray = [];
			let orderListStr;
			

			try {
				orderListData = JSON.parse(orderListData);
				for (let entry of orderListData) {
					orderList[entry] = true;
					orderListArray.push(conn.connection.escape(entry));
				}
			}
			catch (e) {
				output.result = 'Invalid order data.';
				break;
			}

			orderListStr = orderListArray.join(',');


			// Get orders from the database
			let orders = await conn.query('SELECT o.id, o.store, data FROM orders o WHERE o.id IN ('+orderListStr+') AND o.sent = 0 AND o.cancelled = 0 AND o.id NOT IN (SELECT c.orderID FROM collecting c)');

			if (!orders.length) {
				httpStatus = 200;
				output.result = 'No orders.';
				break;
			}

			// Check if buyer details are present
			let buyerDetailsValid = true;
			try {
				for (let orderEntry of orders) {
					let store = orderEntry.store.toString();

					let sigma = 0;
					let hyclor = 0;

					let wv = 0;
					let me = 0;
					let lpg = 0;
					let hob = 0;

					let warehousecollect = 0;
					if (Config.SUPPLIERS[Config.SUPPLIER_IDS.HOBBYCO].stores.includes(store) && store != 81 && store != 82) warehousecollect = 1;
					
					let orderData = JSON.parse(orderEntry.data);
					let CD = getConversionData(orderEntry.store);
					//console.log(CD);
					let items = getField(orderData, CD.Items);
					for (let item of items) {
						//console.log(item);
						let sku = item[CD.ItemData.SKU];
						if (store==1 || store==51) {
							if (sku.startsWith('SI-')) {
								sigma = 1;
							} else if (sku.startsWith('HYCH_')) {
								hyclor = 1;
							}
						}

						if (Config.SUPPLIERS[Config.SUPPLIER_IDS.HOBBYCO].stores.includes(store)) {
							if (sku.startsWith('WV-')) {
								wv = 1;
							} else if (sku.startsWith('ME-')) {
								me = 1;
							} else if (sku.startsWith('LPG-')) {
								lpg = 1;
							} else {
								hob = 1;
							} 
					    }

					    if (Config.SUPPLIERS[Config.SUPPLIER_IDS.HOBBYCO].stores.includes(store)) {
					    	let pickQty =  await conn.query('SELECT pickQty FROM stockinventory WHERE sku = ' + conn.connection.escape(sku) + ' AND store = 8');

					    	if (!pickQty || pickQty.length==0) {
					    		warehousecollect = 0;
					    	} else {
					    		pickQty = pickQty[0].pickQty;

						    	if (pickQty <= 0) {
						    		warehousecollect = 0;
						    	}	
					    	}
						    		    
					    }
					}

					if (hob==1) {
						orderEntry['wv'] = 0;
						orderEntry['me'] = 0;
						orderEntry['lpg'] = 0;
						orderEntry['status'] = 0;
					} else if (wv==1 && me==0 && lpg==0) {
						orderEntry['wv'] = 1;
						orderEntry['me'] = 0;
						orderEntry['lpg'] = 0;
						orderEntry['status'] = 18;
					} else if (wv==0 && me==1 && lpg==0) {
						orderEntry['wv'] = 0;
						orderEntry['me'] = 1;
						orderEntry['lpg'] = 0;
						orderEntry['status'] = 18;
					} else if (wv==0 && me==0 && lpg==1) {
						orderEntry['wv'] = 0;
						orderEntry['me'] = 0;
						orderEntry['lpg'] = 1;
						orderEntry['status'] = 18;
					} else if (wv==0 && me==0 && lpg==0) {
						orderEntry['wv'] = 0;
						orderEntry['me'] = 0;
						orderEntry['lpg'] = 0;
						orderEntry['status'] = 0;
					} else {
						orderEntry['wv'] = 0;
						orderEntry['me'] = 0;
						orderEntry['lpg'] = 0;
						orderEntry['status'] = 18;
					}  

					if (warehousecollect==1) {
						orderEntry['status'] = 18;
					}

					if (sigma==1 && hyclor==0) {
						orderEntry['sigma'] = 1;
						orderEntry['hyclor'] = 0;
					} else if (sigma==0 && hyclor==1) {
						orderEntry['sigma'] = 0;
						orderEntry['hyclor'] = 1;
					} else {
						orderEntry['sigma'] = 0;
						orderEntry['hyclor'] = 0;
					}

					if (store==81) {
						orderEntry['type'] = 13;
					} else if (store==82) {
						orderEntry['type'] = 14;
					} else {
						orderEntry['type'] = null;
					}
					
					if (!CD || !getField(orderData, CD.BuyerFullName) || !getField(orderData, CD.BuyerAddress1) || !getField(orderData, CD.BuyerCountry)) {
						buyerDetailsValid = false;
						break;
					}
				}
			}
			catch (e) {
				buyerDetailsValid = false;
				console.log(e);
			}

			if (!buyerDetailsValid) {
				output.result = 'One or more orders has missing address details. Please make sure to save any changes you have made.';
				break;
			}


			// Add orders to the collecting table
			let transactionResult = await conn.transaction(async function() {
				var errorOccurred = false;

				for (let orderEntry of orders) {
					await conn.query('INSERT INTO collecting (orderID,sigma,wv,me,hyclor,lpg,status,type) VALUES ('+conn.connection.escape(orderEntry.id)+','+orderEntry['sigma']+','+orderEntry['wv']+','+orderEntry['me']+','+orderEntry['hyclor']+','+orderEntry['lpg']+','+orderEntry['status']+','+orderEntry['type']+');')
					.catch(err => {
						errorOccurred = true;
					});

					if (errorOccurred) {
						httpStatus = 500;
						output.result = 'Could not add orders to the collecting table in the database.';
						conn.rollback(errorOccurred);
						return false;
					}
				}

				var commitResult = await conn.commit();
				if (!commitResult) {
					httpStatus = 500;
					output.result = 'Could not commit database transaction.';
					return false;
				}
				return true;
			});

			if (transactionResult) {
				httpStatus = 200;
				output.result = 'success';
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

module.exports = addOrdersCollect;
