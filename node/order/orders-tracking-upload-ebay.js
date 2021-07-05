// Discount Chemist
// Order System

// Upload order tracking details to eBay

const {Config} = require('./config');
const csvStringify = require('csv-stringify');
const SSHClient = require('ssh2-promise');
const fs = require('fs');
const intoStream = require('into-stream');


const uploadTrackingEbay = async function(storeID, orders) {
	let headerRow = ['Order ID', 'Line Item ID', 'Logistics Status', 'Shipment Carrier', 'Shipment Tracking'];

	// Create CSV file with the order fulfillment data
	let data = [headerRow];
	for (let orderEntry of orders) {
		data.push([orderEntry.orderID, '', 'SHIPPED', orderEntry.postageCourier, orderEntry.trackingID]);
	}

	// Save CSV file
	let csvFilename = 'ofd-t-'+storeID+'-'+Date.now()+'.csv';
	let csvFilePath = '../srv/order-data/'+csvFilename;

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

	await sftp.fastPut(csvFilePath, '/store/orderfulfillment/'+csvFilename);
	await ssh.close();
}

module.exports = uploadTrackingEbay;
