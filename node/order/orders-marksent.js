// Discount Chemist
// Order System

// Mark orders as sent

const {Config} = require('./config');
const Database = require('./connection');
const csvStringify = require('csv-stringify');
const SSHClient = require('ssh2-promise');
const fs = require('fs');
const intoStream = require('into-stream');
const {getDateValue} = require('./utils');


const markOrdersSent = async function(req, res, next) {
	var conn = new Database(dbconn);

	//var store = req.params.store || null;
	var orderListData = req.body.orders || null;
	var updateDBOnly = !!req.body.dbonly;
	//var storeAll = false;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			await conn.connect();

			/*if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store))) {
				output.result = 'Invalid store.';
				break;
			}
	
			if (store == 'all') {
				storeAll = true;
			}*/
			
			var orderList = {};
			var orderListArray = [];
			var orderListStr;

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
			var orders = await conn.query('SELECT id, store, orderID, data FROM orders WHERE id IN ('+orderListStr+') AND sent = 0 AND cancelled = 0');
			//var orders = await conn.query('SELECT id, store, data FROM orders WHERE sent = 0 AND cancelled = 0'+(!storeAll ? ' AND store = '+conn.connection.escape(store) : ''));

			if (!orders.length) {
				httpStatus = 200;
				output.result = 'No orders.';
				break;
			}

			// Check if buyer details are present
			var buyerDetailsValid = true;
			try {
				for (let orderEntry of orders) {
					let orderData = JSON.parse(orderEntry.data);
					if (!orderData.finalDestinationAddressName || !orderData.finalDestinationAddressLine1 || !orderData.finalDestinationCountry) {
						buyerDetailsValid = false;
						break;
					}
				}
			}
			catch (e) {
				buyerDetailsValid = false;
			}

			if (!buyerDetailsValid) {
				output.result = 'One or more orders has missing address details. Please make sure to save any changes you have made.';
				break;
			}


			if (!updateDBOnly) {
				let headerRow = ['Order ID', 'Line Item ID', 'Logistics Status', 'Shipment Carrier', 'Shipment Tracking'];
				let sshData = {
					ssh: [],
					queue: [],
					close: [],
				};

				for (let storeID in Config.STORES) {
					//if (!storeAll && storeID != store) continue;

					// Create CSV file with the order fulfillment data
					let data = [headerRow], skip = false;

					for (let orderEntry of orders) {
						// Skip if order is from a different store or is not in the supplied order list
						if (orderEntry.store != storeID || !orderList[orderEntry.id]) continue;
						data.push([orderEntry.orderID, '', 'SHIPPED', '', '']);
						//let order = JSON.parse(orderEntry.data);
						//data.push([order.orderID, '', 'SHIPPED', '', '']);
					}

					if (data.length <= 1) continue;


					// Save CSV file
					let csvFilename = 'ofd-'+storeID+'-'+Date.now()+'.csv';
					let csvFilePath = '/srv/order-data/'+csvFilename;

					await new Promise((resolve, reject) => {
						var csvStringifier = csvStringify({rowDelimiter: 'windows'});
						var writeStream = fs.createWriteStream(csvFilePath);

						writeStream.on('finish', () => {
							resolve(true);
						})
						.on('error', (err) => {
							writeStream.end();
							reject(err);
						});

						intoStream.obj(data).pipe(csvStringifier).pipe(writeStream);
					});


					// Upload the order fulfillment data
					let sshSettings = {
						host: Config.EBAY_MIP_SETTINGS.host,
						port: Config.EBAY_MIP_SETTINGS.port,
						username: Config.STORES[storeID].id,
						password: Config.STORES[storeID].mipPassword,
					}

					let ssh = new SSHClient(sshSettings);
					let sftp = new SSHClient.SFTP(ssh);

					sshData.ssh.push(ssh);
					sshData.queue.push(sftp.fastPut(csvFilePath, '/store/orderfulfillment/'+csvFilename));
				}

				// Wait for queue to finish
				await Promise.all(sshData.queue);

				// Close connections
				for (let ssh of sshData.ssh) {
					sshData.close.push(ssh.close());
				}
				await Promise.all(sshData.close);
			}

			// Set orders as sent in the database and add them to the collecting table
			var transactionResult = await conn.transaction(async function() {
				var errorOccurred = false;
				
				// Set orders as sent
				var result = await conn.query('UPDATE orders SET sent = 1 WHERE id IN ('+orderListStr+') AND sent = 0 AND cancelled = 0')
				.catch(err => {
					errorOccurred = true;
				});

				if (result.affectedRows == 0) {
					httpStatus = 500;
					output.result = 'Orders could not be marked as sent in the database';
					conn.rollback(errorOccurred);
					return false;
				}

				// Add to collecting table
				for (let orderEntry of orders) {
					await conn.query("INSERT INTO collecting (orderID, recordNo, store) VALUES ("+conn.connection.escape(orderEntry.id)+", "+conn.connection.escape(orderEntry.orderID)+", "+conn.connection.escape(orderEntry.store)+");")
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

module.exports = markOrdersSent;
