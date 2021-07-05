// Add records to record list

import {checkOrderCategory, getRecordOrderInfo, showDoneScreen} from './orders.js';
import {getItemDetails} from './item-details.js';
import {sortRecordsByBrand, sortRecordsByType, sortRecordsByBay, sortRecordsByDate, sortRecordsBySku} from './sort-records.js';
import {showTab} from './page-actions.js';

async function createRecordList() {
	var recordList = [];
	var navUL = document.querySelector('#record-list ul');
	/*var recordsOrdered = (page.type == PAGE_TYPE.STOCK) ? JSON.parse(localStorage.recordsOrdered) : {};
	var recordsMessed = (page.type == PAGE_TYPE.STOCK) ? JSON.parse(localStorage.recordsMessed) : {};*/
	var recordsOrdered = JSON.parse(localStorage.recordsOrdered);
	var recordsMessed = JSON.parse(localStorage.recordsMessed);

	// Get item data for each order
	let orderList = [];
	for (let store in stores) {
		if (!saleRecords.hasOwnProperty(store)) continue;
		for (let recordNum in saleRecords[store].today) {
			orderList.push([store, recordNum]);
		}
	}
	await getItemDetails(orderList, true);

	for (let store in stores) {
		if (!saleRecords.hasOwnProperty(store)) continue;
		let saleRecordStore = saleRecords[store];
		let recordNums = Object.keys(saleRecordStore.today).sort(); // Record numbers sorted in order

		for (let recordNum of recordNums) {
			let rowData = saleRecordStore.records[recordNum];
			let rowDataToday = saleRecordStore.today[recordNum];
			if (!rowData) continue;

			// Load the record's order type
			if (rowDataToday.constructor == Object) {
				if (!rowDataToday.OrderType) {
					let orderInfo = getRecordOrderInfo(store, rowData.DatabaseID);
					//if (recordNum==116703) console.log(orderInfo);
					rowDataToday.OrderType = parseInt(orderInfo.OrderType, 10);
					delete orderInfo.OrderType;
					rowDataToday.Data = orderInfo;
				}
				else if (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.AWAITINGLIST || page.type == PAGE_TYPE.RTS || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.REFUNDS) {
					let orderCategorys = checkOrderCategory(store, rowData.DatabaseID);
					if (recordNum==116703) console.log(orderCategorys);
					if (orderCategorys) {
						if (!rowDataToday.Data) {
							rowDataToday.Data = {};
						}
						for (let orderCategory in orderCategorys) {
							rowDataToday.Data[orderCategory] = true;
						}
					}
				}
			}

			// Save record
			recordList.push([store, recordNum]);
		}
	}

	//console.log(JSON.stringify(recordList));

	// Sort records
	if (page.type == PAGE_TYPE.COLLECT) {
		recordList = sortRecordsByBrand(recordList, brands); // [[store, record number]]
		recordList = sortRecordsByType(recordList, [ORDER_TYPE.FASTWAY, ORDER_TYPE.AUSPOST, ORDER_TYPE.FASTWAYFLATPACK, ORDER_TYPE.FASTWAYFLATPACK1KG, ORDER_TYPE.FASTWAYFLATPACK5KG]);
		recordList = sortRecordsByBay(recordList);
		recordList = sortRecordsBySku(recordList, ['8']);
	}

	if (page.type == PAGE_TYPE.AWAITINGLIST) {
		recordList = sortRecordsByBrand(recordList, brands); // [[store, record number]]
		recordList = sortRecordsByType(recordList, [ORDER_TYPE.FASTWAY, ORDER_TYPE.AUSPOST, ORDER_TYPE.FASTWAYFLATPACK, ORDER_TYPE.FASTWAYFLATPACK1KG, ORDER_TYPE.FASTWAYFLATPACK5KG]);
		recordList = sortRecordsByDate(recordList, 'asc');
	}

	// Remove existing entries
	while (navUL.firstChild) {
		navUL.removeChild(navUL.firstChild);
	}
	//console.log(recordList);
	// Add records to the record list
	let navULFragment = document.createDocumentFragment();
	for (let i = 0; i < recordList.length; i++) {
		let store = recordList[i][0], recordNum = recordList[i][1];
		let rowData = saleRecords[store].records[recordNum];

		if (page.user.type==USER_TYPE['SUPPLIER']) {
			if (SUPPLIER_INFO[page.user.supplier].stores && !SUPPLIER_INFO[page.user.supplier].stores.includes(store)) {
				continue;
			}
		}
		
		let li = document.createElement('li');

		// Use database ID for orders from MIP or record number for older olders
		li.textContent = rowData.SalesRecordID ? stores[store].storeID+' '+rowData.SalesRecordID : store+'-'+rowData.DatabaseID;

		li.dataset.store = store;
		li.dataset.record = recordNum;

		if (page.type == PAGE_TYPE.COLLECT) {
			let input = document.createElement('input');
			input.type = 'checkbox';
			li.appendChild(input);
		}

		if (page.type == PAGE_TYPE.AWAITINGLIST) {
			li.classList.add(getOrderAgeColor(rowData.PaidDate));
		}

		if (saleRecords[store] && saleRecords[store].today[recordNum]) {
			let rowDataToday = saleRecords[store].today[recordNum];
			if (rowDataToday.Data && Object.keys(rowDataToday.Data).length) li.dataset.extra = JSON.stringify(rowDataToday.Data);
			//if (recordNum==124749) console.log(rowDataToday.Data);
		}

		let recordsOrderedID = store.toString()+'|'+recordNum.toString();
		if (recordsOrdered[recordsOrderedID] === true) {
			// Change background to indicate that it's ordered
			li.classList.add('done');
		}

		let recordsMessedID = store.toString()+'|'+recordNum.toString();
		if (recordsMessed[recordsMessedID] === true) {
			// Change background to indicate that it's Messed
			li.classList.add('mess');
		}

		// Username box
		let userDiv = document.createElement('div');
		userDiv.className = 'user hide';

		li.appendChild(userDiv);
		navULFragment.appendChild(li);
	}
	navUL.appendChild(navULFragment);


	// Remove entries that are marked as ordered but aren't in the list
	if (page.type == PAGE_TYPE.STOCK) {
		let recordListEl = document.querySelector('#record-list ul');
		for (let recordsOrderedID in recordsOrdered) {
			let recordData = recordsOrderedID.split('|');
			if (!recordListEl.querySelector('li[data-store="'+recordData[0]+'"][data-record="'+recordData[1]+'"]')) {
				delete recordsOrdered[recordsOrderedID];
			}
		}
		localStorage.recordsOrdered = JSON.stringify(recordsOrdered);

		/*for (let recordsMessedID in recordsMessed) {
			let recordData = recordsMessedID.split('|');
			if (!recordListEl.querySelector('li[data-store="'+recordData[0]+'"][data-record="'+recordData[1]+'"]')) {
				delete recordsMessed[recordsMessedID];
			}
		}
		localStorage.recordsMessed = JSON.stringify(recordsMessed);*/
	}

	if (navUL.children.length) {
		// Show the selected tab
		//console.log(window.location.hash);
		showTab({href: window.location.hash});
	}
	else {
		// Add a blank entry
		let li = document.createElement('li');
		li.textContent = 'No records';
		navUL.appendChild(li);

		// Remove all currently shown record entries and show done screen
		clearRecords();
		showDoneScreen();
	}

	page.loadTime = performance.now() - page.loadTime;
	if (page.local || page.localUser) console.info('Load time:', page.loadTime);
}


function showPrevRecord(getOnly = false) {
	var currentRecord = document.querySelector('#record-list ul li.selected');
	var prevRecord = null;

	while (currentRecord = currentRecord.previousElementSibling) {
		if (!currentRecord.classList.contains('disabled') && !currentRecord.classList.contains('hide')) {
			prevRecord = currentRecord;
			break;
		}
	}

	if (getOnly) return prevRecord;
	if (prevRecord) prevRecord.click();
}

function showNextRecord(getOnly = false) {
	var currentRecord = document.querySelector('#record-list ul li.selected');
	var nextRecord = null;

	while (currentRecord = currentRecord.nextElementSibling) {
		if (!currentRecord.classList.contains('disabled') && !currentRecord.classList.contains('hide')) {
			nextRecord = currentRecord;
			break;
		}
	}

	if (getOnly) return nextRecord;
	if (nextRecord) {
		nextRecord.click();
	}
	else {
		// Check if all the orders for the current tab have been processed
		let ordersLeft = document.querySelectorAll('#record-list ul li:not(.disabled):not(.done):not(.outofstock)');
		if (!ordersLeft.length) {
			// Clear records and show done screen
			clearRecords();
			showDoneScreen();
		}
	}
}

function getOrderAgeColor(PaidDate) {
    let  ORDER_URGENCY  = {
		/*MEDIUM: 259200, // 3 days
		HIGH: 604800, // 7 days*/
		MEDIUM: 172800, // 2 days
		HIGH: 345600, // 4 days
	};
	let PaidDates = PaidDate.split('-');
	PaidDates[2] = '20' + PaidDates[2];
	PaidDate = PaidDates.join('/');
    PaidDate = Date.parse(PaidDate);
    let currentDate = Date();
    currentDate = Date.parse(currentDate);
    let dateDiff = (currentDate - PaidDate)/1000; // Convert to seconds
    if (dateDiff > ORDER_URGENCY.HIGH) {
        return 'urgent-red';
    } else if (dateDiff > ORDER_URGENCY.MEDIUM) {
        return 'urgent-orange';
    } else {
        return 'urgent-none';
    }
} 

// Remove all of the currently shown record entries
function clearRecords() {
	var recordEntries = document.getElementById('record-entries');
	while (recordEntries.firstChild) {
		recordEntries.removeChild(recordEntries.firstChild);
	}
}

export {createRecordList, showPrevRecord, showNextRecord, clearRecords};
