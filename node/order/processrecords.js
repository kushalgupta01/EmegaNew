// Discount Chemist
// Order System

// Process orders
const Database = require('./connection');
const {getConversionData} = require('./order-convert');

// Find all orders in the database with the same buyer name/address as a given order
const findConnectedOrders = async function(order) {
	var conn = new Database(dbconn);
	var orderList = [];

	await conn.connect();

	try {
		let CD = getConversionData(order.StoreID);
		let sqlWhere = [];
		let addressEntries = [
			[CD.BuyerFullName, order.Buyer.FullName],
			[CD.BuyerAddress1, order.Buyer.AddressLine1],
			[CD.BuyerAddress2, order.Buyer.AddressLine2],
			[CD.BuyerCity, order.Buyer.City],
			[CD.BuyerCountry, order.Buyer.Country],
		];

		for (let entry of addressEntries) {
			sqlWhere.push("JSON_EXTRACT(data, '$."+(Array.isArray(entry[0]) ? entry[0].join('.') : entry[0])+"') = "+conn.connection.escape(entry[1]));
		}

		//orderList = await conn.query('SELECT * FROM orders WHERE '+sqlWhere.join(' AND ')+' AND sent = 1 AND id != '+conn.connection.escape(order.DatabaseID));
		orderList = await conn.query('SELECT * FROM orders WHERE '+sqlWhere.join(' AND ')+' AND id != '+conn.connection.escape(order.DatabaseID));
	} catch (e) {}

	if (conn.connected) conn.release();

	return orderList;
}

// Find all orders with the same buyer name/address in a given list of records
const getConnectedOrders = function(saleRecords) {
	/*var refRecords = {}; // Reference records
	for (let storeID in saleRecords) {
		refRecords[storeID] = {};
	}*/
	var refBuyerInfo = {}; // Reference records
	var recordNames = {};

	for (let storeID in saleRecords) {
		refBuyerInfo[storeID] = {};
	}

	// Save the first letter of each buyer's name
	for (let storeID in saleRecords) {
		let saleRecordStore = saleRecords[storeID];
		let recordNums = Object.keys(saleRecordStore.today).sort(); // Record numbers sorted in order

		for (let recordNum of recordNums) {
			let mainRecord = saleRecordStore.records[recordNum];
			if (!mainRecord) continue;

			// Save the store and record
			let firstLetter = mainRecord.BuyerFullName.trim().toLowerCase()[0];
			if (!recordNames[firstLetter]) recordNames[firstLetter] = [];
			recordNames[firstLetter].push([storeID, recordNum]);
		}
	}

	for (let storeID in saleRecords) {
		let saleRecordStore = saleRecords[storeID];
		if (!saleRecordStore.connected) saleRecordStore.connected = {};
		let recordNums = Object.keys(saleRecordStore.today).sort(); // Record numbers sorted in order

		for (let recordNum of recordNums) {
			let mainRecord = saleRecordStore.records[recordNum];
			if (!mainRecord) continue; // Record not found
			let mainTrackings = saleRecordStore.today[recordNum].Tracking;
			let mainLatestTracking = null;
			if (mainTrackings != null) {
				mainTrackings = JSON.parse(mainTrackings);
				if (mainTrackings.length>0) {
					mainLatestTracking = mainTrackings.slice(-1)[0];
				}
			}
			saleRecordStore.connected[recordNum] = [[storeID, recordNum]];

			let mainRecordInfo = refBuyerInfo[storeID][recordNum];
			if (!mainRecordInfo) {
				// Get buyer's details
				refBuyerInfo[storeID][recordNum] = prepareBuyerDetails(mainRecord);
				mainRecordInfo = refBuyerInfo[storeID][recordNum];
			}

			/*let refRecord = refRecords[storeID][recordNum];
			if (refRecord) {
				// Use the saved reference
				saleRecordStore.connected[recordNum] = saleRecords[refRecord[0]].connected[refRecord[1]].slice(0);
				continue;
			}*/

			// Find records with the same buyer's name and address
			let recordMatches = recordNames[mainRecordInfo.name[0]];
			if (!recordMatches || storeID == 81 || storeID == 82) continue;

			for (let recordMatch of recordMatches) {
				// Get record if it has the same buyer's name and address and is not the current record
				let recordMatchStore = recordMatch[0], recordMatchNum = recordMatch[1];
				let rowData = saleRecords[recordMatchStore].records[recordMatchNum];
				if (!rowData) continue; // Record not found

				let matchTrackings = saleRecords[recordMatchStore].today[recordMatchNum].Tracking;
				let matchLatestTracking = null;
				if (matchTrackings != null) {
					matchTrackings = JSON.parse(matchTrackings);
					if (matchTrackings.length>0) {
						matchLatestTracking = matchTrackings.slice(-1)[0];
					}
				}

				let rowRecordInfo = refBuyerInfo[recordMatchStore][recordMatchNum];

				if (!rowRecordInfo) {
					// Get buyer's details
					refBuyerInfo[recordMatchStore][recordMatchNum] = prepareBuyerDetails(rowData);
					rowRecordInfo = refBuyerInfo[recordMatchStore][recordMatchNum];
				}

				if (rowRecordInfo.name && rowRecordInfo.name == mainRecordInfo.name &&
					rowRecordInfo.address1 && rowRecordInfo.address1 == mainRecordInfo.address1 &&
					rowRecordInfo.address2 == mainRecordInfo.address2 &&
					mainRecordInfo.city && recordMatchStore == storeID && recordMatchNum != recordNum
					&& matchLatestTracking == mainLatestTracking
					) {
					// Save the store and record number
					saleRecordStore.connected[recordNum].push([recordMatchStore, recordMatchNum]);
					//refRecords[recordMatchStore][recordMatchNum] = [storeID, recordNum]; // Save a reference to the main record
				}
			}

			// Sort the records in ascending order
			saleRecordStore.connected[recordNum].sort(function(a, b) {
				return a[1] == b[1] ? 0 : (a[1] < b[1] ? -1 : 1);
			});
		}
	}
}

// Prepare buyer's details for a given record
const prepareBuyerDetails = function(record) {
	return {
		name: record.BuyerFullName.trim().toLowerCase(),
		address1: record.BuyerAddress1.trim().toLowerCase(),
		address2: record.BuyerAddress2 ? record.BuyerAddress2.trim().toLowerCase() : '',
		city: record.BuyerCity ? record.BuyerCity.trim().toLowerCase() : ''
	};
}

module.exports = {findConnectedOrders, getConnectedOrders};
