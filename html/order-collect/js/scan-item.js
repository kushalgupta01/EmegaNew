
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
				recordItem.classList.remove('scanned');
				recordItem.querySelector('.indivCurrent').classList.remove('font30');
			}
			for (let recordItem of recordItems) {
				//console.log("scanDone:" + recordItem.dataset.scanDone);

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

				if (recordItem.dataset.scanDone == 'false') {
					

					if (item.barcode == barcodeScanner.value || item.singleItemBarcode == barcodeScanner.value) {
						// Increment the item's scanned count
						let itemScan = recordItem.querySelector('.item-scan');
						let itemScanCurrent = itemScan.querySelector('.current'), itemScanTotal = itemScan.querySelector('.total');
						let newScanCurrent = itemScanCurrent ? parseInt(itemScanCurrent.textContent, 10) : 0;

						// Increment the item's scanned count
						let itemScanI = recordItem.querySelector('.indiv-item-scan');
						let itemScanCurrentI = itemScanI.querySelector('.indivCurrent'), itemScanTotalI = itemScanI.querySelector('.indivTotal');
						let newScanCurrentI = itemScanCurrentI ? parseInt(itemScanCurrentI.textContent, 10) : 0;

						let sumSelected = 0;
						let trs = recordItem.querySelectorAll('#location-select-table>tbody>tr');
						for (let tr of trs){
							sumSelected = sumSelected + parseInt(tr.querySelector('td[data-col="indivQty"]')?.textContent);
						}

						if (item.barcode == barcodeScanner.value && newScanCurrent < parseInt(itemScanTotal.textContent, 0)) {
							newScanCurrent++;
							itemScanCurrent.textContent = newScanCurrent;
							itemScan.scrollIntoView(true);
							highlight(recordItem);
							saveScanned(recordEntry.dataset.recordNum, recordItem.dataset.lineitemid, newScanCurrent, 'carton');
						} else if (item.singleItemBarcode == barcodeScanner.value && newScanCurrentI < parseInt(itemScanTotalI.textContent, 10)) {
							if (newScanCurrentI < sumSelected){
								newScanCurrentI++;
								itemScanCurrentI.textContent = newScanCurrentI;
								itemScanI.scrollIntoView(true);
								highlight(recordItem);
								saveScanned(recordEntry.dataset.recordNum, recordItem.dataset.lineitemid, newScanCurrentI, 'singleItem')
							}
							else {
								itemScanI.scrollIntoView(true);
								page.notification.show('Item unavailable to scan while one or multiple locations are not selected.');
							}
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
				else if (recordItem.dataset.scanDone == 'true'){
					if (item.barcode == barcodeScanner.value || item.singleItemBarcode == barcodeScanner.value) {
						recordItem.scrollIntoView(true);
						var content = document.createElement('div');
	    				content.innerHTML = 'Item <strong>'+recordItem.dataset.sku+'</strong> was scanned more than <strong>'+recordItem.dataset.itemQuantity+'</strong> time(s).';
						swal({
	                            title: "Warning!",
	                            content: content,
	                            icon: "warning",
	                            dangerMode: true,
	                            allowOutsideClick: false,
	                        });
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

async function highlight(div){
   div.classList.add('scanned');
   div.querySelector('.indivCurrent').classList.add('font30');
   setTimeout(function(){
        div.classList.remove('scanned');
        div.querySelector('.indivCurrent').classList.remove('font30');
   }, 60000);
}

async function saveScanned(orderID, lineitemid, qty, type) {
	try {
		let formData = new FormData();
		formData.append('orderID', orderID);
		formData.append('lineitemid', lineitemid);
		formData.append('qty', qty);
		formData.append('type', type);
		let response = await fetch(apiServer+'saveScanned', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let data = await response.json();
		if (!response.ok) {
			page.notification.show(data.result, {hide: false});
			console.log('Error: '+data.result);
		}

		if (data.result == 'success') {

		}
		else {
			page.notification.show(data.result, {hide: false});
			console.log(data.result);
		}
	} catch (e) {
		page.notification.show(e);
		console.log(e);
	}
		
}

export {saveScanned};