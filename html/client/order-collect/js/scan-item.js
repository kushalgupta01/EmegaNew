
// Detect barcode being entered

import {changeScanStatus} from './orders.js';

var barcodeScanner = {
	value: '',
	startTime: null,
	timer: null,
	timeLimit: 2000,
}

document.addEventListener('keypress', function(e) {
	var targetTag = e.target.tagName.toLowerCase();
	if (targetTag == 'textarea' || targetTag == 'input') return true;

	// Check the entered character
	if (e.key == 'Enter' || e.key == '↵') {
		// Enter pressed
		e.preventDefault();
		e.stopPropagation();

		// Stop the timer and check the barcode
		clearTimeout(barcodeScanner.timer);
		barcodeScanner.timer = null;

		let recordEntries = document.querySelectorAll('#record-entries .record-entry');
		for (let recordEntry of recordEntries) {
			let recordItems = recordEntry.querySelectorAll('.record-items>tbody>tr');
			for (let recordItem of recordItems) {
				//console.log("scanDone:" + recordItem.dataset.scanDone);
				if (recordItem.dataset.scanDone == 'false') {
					// Get the item's barcode
					let item = {
						sku: recordItem.dataset.sku || null,
						num: recordItem.dataset.itemNum,
						id: recordItem.dataset.id,
						barcode: null,
						singleItemBarcode: null,
					};

					//console.log(itemDetails);
					let itemDetailEntries = itemDetails[item.num || item.sku];
					//console.log(itemDetailEntries);

					for (let itemDetailEntry of itemDetailEntries) {
						if (itemDetailEntry.id == item.id) {
							// Item found
							item.barcode = itemDetailEntry.upc || itemDetailEntry.barcode;
							item.singleItemBarcode = itemDetailEntry.upc || itemDetailEntry.singleItemBarcode;
							break;
						}
					}

					console.log(item.barcode + " == " + barcodeScanner.value);
					console.log(item.singleItemBarcode + " == " + barcodeScanner.value);

					if (item.barcode == barcodeScanner.value || item.singleItemBarcode == barcodeScanner.value) {
						// Increment the item's scanned count
						let itemScan = recordItem.querySelector('.item-scan');
						let itemScanCurrent = itemScan.querySelector('.current'), itemScanTotal = itemScan.querySelector('.total');
						let newScanCurrent = itemScanCurrent ? parseInt(itemScanCurrent.textContent, 10) : 0;

						// Increment the item's scanned count
						let itemScanI = recordItem.querySelector('.indiv-item-scan');
						let itemScanCurrentI = itemScanI.querySelector('.indivCurrent'), itemScanTotalI = itemScanI.querySelector('.indivTotal');
						let newScanCurrentI = itemScanCurrentI ? parseInt(itemScanCurrentI.textContent, 10) : 0;

						if (item.barcode == barcodeScanner.value && newScanCurrent < parseInt(itemScanTotal.textContent, 0)) {
							newScanCurrent++;
							itemScanCurrent.textContent = newScanCurrent;
						} else if (item.singleItemBarcode == barcodeScanner.value && newScanCurrentI < parseInt(itemScanTotalI.textContent, 10)) {
							newScanCurrentI++;
							itemScanCurrentI.textContent = newScanCurrentI;
						}

						if ((itemScanTotal && !itemScanTotalI && newScanCurrent == parseInt(itemScanTotal.textContent, 10)) || 
							(itemScanTotalI && !itemScanTotal && newScanCurrentI == parseInt(itemScanTotalI.textContent, 10)) ||
							(itemScanTotalI && itemScanTotal && newScanCurrentI == parseInt(itemScanTotalI.textContent, 10) && newScanCurrent == parseInt(itemScanTotal.textContent, 10))) {
							// Required quantity has been reached
							recordItem.setAttribute('data-scan-done', 'true');
						}

						barcodeScanner.value = '';
						break;
		
					}
				}
				
			}

			
			
			// Check if all the items in the order have been scanned
			let allScanned = true;
			if (recordItems.length) {
				for (let recordItem of recordItems) {
					if (!recordItem.dataset.scanDone || recordItem.dataset.scanDone != 'true') {
						allScanned = false;
						break;
					}
				}
			}
			else {
				allScanned = false;
			}

			if (allScanned) {
				// Mark the record as scanned
				let recordDataToday = saleRecords[recordEntry.dataset.store].today[recordEntry.dataset.recordNum];
				recordDataToday.ScanDone = true;
				changeScanStatus(recordEntry.dataset.store, recordEntry.dataset.recordNum, SCAN_ACTIONS.DONE, recordEntry.querySelector('.record-items tfoot .scan-status'));
			}
		}


		barcodeScanner.value = '';
	}
	else {
		// Save the character
		barcodeScanner.value += e.key.toString();

		console.log(barcodeScanner.value);

		if (!barcodeScanner.timer) {
			// Start timer
			barcodeScanner.timer = setTimeout(function() {
				barcodeScanner.timer = null;
				barcodeScanner.value = '';
			}, barcodeScanner.timeLimit);
		}
	}
}, false);
