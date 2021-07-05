
//  Discount Chemist
//  Order System - Sort brands
import {getDateValue} from '/common/tools.js';
// Sort record list by brand, recordList = [[store, record number, other data, ...]]
function sortRecordsByBrand(recordList, brands) {
	var newRecordList = [];
	for (var b_i = 0; b_i < brands.length; b_i++) {
		// Compare each brand to each item in each order
		var brand = brands[b_i];

		for (var num = 0; num < recordList.length; num++) {
			if (recordList[num] === undefined) continue;
			var store = recordList[num][0], recordNum = recordList[num][1];
			var rowData = saleRecords[store].records[recordNum];
			var addRecord = false;

			// Check order items
			for (var in_i = 0; in_i < rowData.Items.length; in_i++) {
				if (rowData.Items[in_i].ItemTitle.replace(reBrands, '').toLowerCase().includes(brand)) {
					// Save record
					addRecord = true;
					break;
				}
			}

			if (addRecord) {
				// Save the record
				newRecordList.push(recordList[num]);
				delete recordList[num];
			}
		}
	}

	// Save remaining records
	for (var num = 0; num < recordList.length; num++) {
		if (recordList[num] === undefined) continue;
		newRecordList.push(recordList[num]);
	}

	return newRecordList;
}

// Sort record list by type, recordList = [[store, record number, other data, ...]]
function sortRecordsByType(recordList, sortTypesOrder) {
	var newRecordList = [];
	for (var s_i = 0; s_i < sortTypesOrder.length; s_i++) {
		// Compare each type to each item in each order
		var sortType = sortTypesOrder[s_i];

		for (var num = 0; num < recordList.length; num++) {
			if (recordList[num] === undefined) continue;
			var store = recordList[num][0], recordNum = recordList[num][1];
			var rowDataToday = saleRecords[store].today[recordNum];

			// Check order type
			if (rowDataToday && rowDataToday.OrderType == sortType) {
				// Save the record
				newRecordList.push(recordList[num]);
				delete recordList[num];
			}
		}
	}

	// Save remaining records
	for (var num = 0; num < recordList.length; num++) {
		if (recordList[num] === undefined) continue;
		newRecordList.push(recordList[num]);
	}

	return newRecordList;
}

// Sort record list by group ID
function sortRecordsByGroup(recordList) {
	var newRecordList = [];
	for (var id = 0; id <= page.buckets; id++) {
		for (var num = 0; num < recordList.length; num++) {
			if (recordList[num] === undefined) continue;
			var store = recordList[num][0], recordNum = recordList[num][1];
			var rowDataToday = saleRecords[store].today[recordNum];

			// Check order type
			if (rowDataToday && rowDataToday.GroupID == id) {
				// Save the record
				newRecordList.push(recordList[num]);
				delete recordList[num];
			}
		}
	}

	// Save remaining records
	for (var num = 0; num < recordList.length; num++) {
		if (recordList[num] === undefined) continue;
		newRecordList.push(recordList[num]);
	}

	return newRecordList;
}

// Sort record list by date
function sortRecordsByDate(recordList, sortOrder) {
	// Separate records by date
	var newRecordList = [];
	var recordsByDate = {};
	var reDash = /-/g;

	for (var num = 0; num < recordList.length; num++) {
		if (recordList[num] === undefined) continue;
		var store = recordList[num][0], recordNum = recordList[num][1];
		var rowData = saleRecords[store].records[recordNum];

		// Get paid date
		let paidDates = rowData.PaidDate.split('-');
		paidDates[2] = '20' + paidDates[2];
		var paidDate = getDateValue(new Date(Date.parse(paidDates.join('/'))));
		if (!recordsByDate.hasOwnProperty(paidDate)) recordsByDate[paidDate] = [];
		recordsByDate[paidDate].push(recordList[num]);
	}

	// Sort the records by their date
	var recordDates = Object.keys(recordsByDate).sort();
	for (var di = 0; di < recordDates.length; di++) {
		var recordEntries = recordsByDate[recordDates[sortOrder == 'asc' ? di : recordDates.length - 1 - di]];
		for (var num = 0; num < recordEntries.length; num++) {
			if (recordEntries[num] === undefined) continue;
			newRecordList.push(recordEntries[num]);
		}
	}

	return newRecordList;
}

// Sort record list by bay No
function sortRecordsByBay(recordList) {
	//console.log(recordList);
	var newRecordList = [];
	for (var id = 0; id <= page.bays; id++) {
		for (var num = 0; num < recordList.length; num++) {
			if (recordList[num] === undefined) continue;
			var store = recordList[num][0], recordNum = recordList[num][1];
			var rowData = saleRecords[store].records[recordNum];
			var itemNum = rowData.Items[0].ItemNum;
			var itemSku = rowData.Items[0].SKU;
			var itemName = rowData.Items[0].ItemTitle;
			var items = itemDetails[itemNum || itemSku];
			if (items) {
				for (let item of items) {
					if (item.storeID != store) continue;
					if ((itemNum && itemSku && item.num == itemNum && item.sku == itemSku) ||
						(itemNum && !itemSku && item.num == itemNum && item.name == itemName) ||
						(!itemNum && itemSku && item.sku == itemSku && item.name == itemName)){
						var bayNo = item.bay;
						// Check order type
						if (bayNo != null && bayNo == id) {
							// Save the record
							newRecordList.push(recordList[num]);
							delete recordList[num];
							break;
						}
					}
				}
				
			}
		}
	}

	// Save remaining records
	for (var num = 0; num < recordList.length; num++) {
		if (recordList[num] === undefined) continue;
		newRecordList.push(recordList[num]);
	}

	return newRecordList;
}

// Sort record list by sku
function sortRecordsBySku(recordList, storeIDs) {
	var newRecordList = [];
	var skuRecordList = {};
	
	for (var num = 0; num < recordList.length; num++) {
		if (recordList[num] === undefined) continue;
		var store = recordList[num][0], recordNum = recordList[num][1];
		if (!storeIDs.includes(store)) {
			newRecordList.push(recordList[num]);
		} else {
			var rowData = saleRecords[store].records[recordNum];
			var sku = rowData.Items[0].SKU;
			if (skuRecordList.hasOwnProperty(sku)) {
				skuRecordList[sku].push(recordList[num]);
			} else {
				let tempList = [];
				tempList.push(recordList[num])
				skuRecordList[sku] = tempList;
			}
		}
		
	}

	// Sort the records by their date
	var recordSkus = Object.keys(skuRecordList).sort();
	//console.log(recordSkus);
	for (var i = 0; i < recordSkus.length; i++) {
		let records = skuRecordList[recordSkus[i]];
		for (let rec of records) {
			newRecordList.push(rec);
		}
	}

	return newRecordList;
}

export {sortRecordsByBrand, sortRecordsByType, sortRecordsByGroup, sortRecordsByDate, sortRecordsByBay, sortRecordsBySku};
