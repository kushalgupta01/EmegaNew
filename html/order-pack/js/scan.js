// Barcode Scanner

import {getTrackingBarcodes, getRecordData} from './load-data.js';
import {nextOrder} from './packing-buttons.js';
import {checkDone, enableNext} from './utils.js';

// Detect barcode being entered
var barcodeScanner = {
    value: '',
    startTime: null,
    timer: null,
    timeLimit: 600,
};

// Listen for barcode input
document.addEventListener('keypress', function(e) {
    if (e.charCode == 13 || e.charCode == 0) { // 13, 0; Enter key
        e.preventDefault();
        e.stopPropagation();

        clearTimeout(barcodeScanner.timer);
        barcodeScanner.timer = null;
        if (scanFlatTrack) {
            let trBtn = document.querySelector('.save-track');
            trBtn.disabled = false;
            if (trBtn.textContent == 'Awaiting scan...') {
                trBtn.textContent = barcodeScanner.value.substring(4);
            }else{
                trBtn.textContent = trBtn.textContent + ' ' + barcodeScanner.value.substring(4);
            }
            

        }else if (checkLabelBarcode()) {
            if (checkDone()) {
                /*if (weightDone) {
                    nextOrder(getRecordData());
                } else {
                    notification.show('Save weight before moving to next order.');
                }*/
                nextOrder(getRecordData());
            } else {
                notification.show('Scan all items before moving to' +
                    ' next order.');
            }
        } else if (barcodeScanner.value == OVERRIDE_BARCODE) {
            enableOverride();
        } else { // Check if it matches any items
            itemScanned();
        }

        barcodeScanner.value = ''; // Reset barcode scanner value
    } else {
        // Save the character
        barcodeScanner.value += e.key.toString();

        if (!barcodeScanner.timer) {
            // Reset scanner value if timeout
            barcodeScanner.timer = setTimeout(function () {
                barcodeScanner.timer = null;
                //barcodeScanner.value = '';
            }, barcodeScanner.timeLimit);
        }
    }

    console.log(barcodeScanner.value);
});

// Check tracking barcode
function checkLabelBarcode() {
    return checkGeneralTracking()
        || checkAuspostTracking()
        || checkFlatpackBarcode()
        || checkEBayTracking()
        || checkAuspostExpressTracking();
}

// Check every other tracking barcode; { Fastway }
function checkGeneralTracking() {
    var trackingBarcodes = getTrackingBarcodes();
    if (!trackingBarcodes) return false;
    trackingBarcodes = JSON.parse(trackingBarcodes);
    return barcodeScanner.value == 
        trackingBarcodes[trackingBarcodes.length - 1];
}

// Check Australia Post tracking barcode
function checkAuspostTracking() {
    var trackingBarcodes = getTrackingBarcodes();
    if (!trackingBarcodes) return false;
    trackingBarcodes = JSON.parse(trackingBarcodes);
    return (barcodeScanner.value.substring(0,12) == 
        trackingBarcodes[trackingBarcodes.length - 1] &&
        barcodeScanner.value.substring(0,12) != "");
}

// Check Flatpack Label barcode
function checkFlatpackBarcode() {
    var success = false;
    if (pageType == 3) {
        var recordData = JSON.parse(getRecordData());
        
        for (let i = 0; i < recordData.length; i++) {
            // recordData index: 0; StoreID, 1; RecordNumber.
            // var labelBarcode = recordData[i][0] + "-" + recordData[i][1];
            var labelBarcode = recordData[i][1];
            if (barcodeScanner.value == labelBarcode) {
                success = true;
            }
        }
    }

    return success;
}

function checkAuspostExpressTracking() {
    var trackingBarcodes = getTrackingBarcodes();
    if (!trackingBarcodes) return false;
    trackingBarcodes = JSON.parse(trackingBarcodes);
    return (barcodeScanner.value.substring(18, 30) == 
        trackingBarcodes[trackingBarcodes.length - 1] &&
        barcodeScanner.value.substring(18, 30) != "");
}

function checkEBayTracking() {
    var trackingBarcodes = getTrackingBarcodes();
    if (!trackingBarcodes) return false;
    trackingBarcodes = JSON.parse(trackingBarcodes);
    return (barcodeScanner.value.substring(18, 41) == 
        trackingBarcodes[trackingBarcodes.length - 1] &&
        barcodeScanner.value.substring(18, 41) != "");
}

// Check if scanned barcode matches any items
function itemScanned(store, recordNum) {
	try {
	    var recordEntries =
	        document.querySelectorAll('#record-container .record-entry'),
	        wrongItem = true; // true; Assume item scanned is wrong  
	    for (var recordEntry of recordEntries) {
	        var recordItems =
	            recordEntry.querySelectorAll('.record-items tbody tr');
	        for (var recordItem of recordItems) { // Loop each item in item table
                if (recordItem.dataset.factory == 1) {
                    if (!warnDone) {
                        let res = confirm("Please check the item before pack");
                        if (res == true) {
                            warnDone = true;
                        } else {
                            return false;
                        }
                    }
                }
	            // If the item has a To be scanned value.
	            // Items with no barcode have no To be scanned value
	            if (recordItem.querySelector('.current') != null || recordItem.querySelector('.indivcurrent') != null) { //

	                //console.log('2 ', wrongItem);

	                var toBeScanned = recordItem.querySelector('.current') ? recordItem.querySelector('.current').innerHTML : '',
	                    barcode = recordItem.dataset.barcode,
	                    toBeScannedIndividual = recordItem.querySelector('.indivcurrent') ? recordItem.querySelector('.indivcurrent').innerHTML : '',
	                    singleItemBarcode = recordItem.dataset.singleItemBarcode;
	                if (barcode == barcodeScanner.value || singleItemBarcode == barcodeScanner.value) { //
	                    // Check if finished scanning for the item or not
	                    if (recordItem.dataset.scanDone != 'true') {
	                        // Update To Be Scanned
	                        if (barcode == barcodeScanner.value && toBeScanned > 0) {
	                            recordItem.querySelector('.current').innerHTML =
	                            toBeScanned - 1;
                                saveScanned(recordItem.dataset.orderid, recordItem.dataset.lineitemid, toBeScanned - 1, 'carton');
	                        }
	                        else if (singleItemBarcode == barcodeScanner.value && toBeScannedIndividual > 0) {
	                            recordItem.querySelector('.indivcurrent').innerHTML =
	                            toBeScannedIndividual - 1;
                                saveScanned(recordItem.dataset.orderid, recordItem.dataset.lineitemid, toBeScannedIndividual - 1, 'singleItem');
	                        }
	                        // else {
	                        //     wrongItem = true;
	                        // }
	                        // Update scanDone if finished scanning for the item
	                        if (toBeScanned -1 <= 0 && toBeScannedIndividual -1 <= 0 && (toBeScanned != 1 || toBeScannedIndividual != 1)) {//
	                            recordItem.dataset.scanDone = true;
                                recordItem.dataset.finish = true; 
	                            notification.show('Done scanning for this item.');
	                        }

	                        wrongItem = false;
	                        
	                    
	                    } else {
                            wrongItem = false;
                            notification.show('Done scanning for this item.');
                            continue;
                        }
                        break;
                        
	                } 

	                //console.log('7 ', wrongItem);

	                if (wrongItem == true) {
	                    notification.show('Scanned wrong item/label barcode.');
	                }
	                

	            }
                    
	        }
	    }

	    // if (wrongItem) {
	    //     notification.show('Scanned wrong item/label barcode.');
	    // }
	    // Check if all items are scanned and enable buttons if so
	    enableNext(checkDone());
	}catch(e){
		console.log(e);
	}
}

async function saveScanned(orderID, lineitemid, qty, type) {
    try {
        let formData = new FormData();
        formData.append('orderID', orderID);
        formData.append('lineitemid', lineitemid);
        formData.append('qty', qty);
        formData.append('type', type);
        let response = await fetch(apiServer+'savePackScanned', {method: 'post', headers: {'DC-Access-Token': userDetails.usertoken}, body: formData});
        let data = await response.json();
        if (!response.ok) {
            notification.show(data.result, {hide: false});
            console.log('Error: '+data.result);
        }

        if (data.result == 'success') {
            
        }
        else {
            notification.show(data.result, {hide: false});
            console.log(data.result);
        }
    } catch (e) {
        notification.show(e);
        console.log(e);
    }
        
}

// Enable the Override button
function enableOverride() {
    document.querySelector('.record-actions .override').disabled = false;
}