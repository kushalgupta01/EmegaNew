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
                nextOrder(getRecordData());
            } else {
                notification.show('Scan all items before moving to' +
                    ' next order.');
            }
        } else if (barcodeScanner.value.toLowerCase() == OVERRIDE_BARCODE) {
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
    return (barcodeScanner.value.substring(18) == 
        trackingBarcodes[trackingBarcodes.length - 1] &&
        barcodeScanner.value.substring(18) != "");
}

// Check Flatpack Label barcode
function checkFlatpackBarcode() {
    var success = false;
    if (pageType == 3) {
        var recordData = JSON.parse(getRecordData());
        
        for (let i = 0; i < recordData.length; i++) {
            // recordData index: 0; StoreID, 1; RecordNumber.
            var labelBarcode = recordData[i][0] + "-" +
                    recordData[i][1];
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

// Check if scanned barcode matches any items
function itemScanned() {
    var recordEntries =
        document.querySelectorAll('#record-container .record-entry'),
        wrongItem = true; // true; Assume item scanned is wrong  
    for (var recordEntry of recordEntries) {
        var recordItems =
            recordEntry.querySelectorAll('.record-items tbody tr');
        for (var recordItem of recordItems) { // Loop each item in item table
            // If the item has a To be scanned value.
            // Items with no barcode have no To be scanned value
            if (recordItem.querySelectorAll('.current')[0] != null) {
                var toBeScanned =
                    recordItem.querySelectorAll('.current')[0].innerHTML,
                    barcode = recordItem.dataset.barcode;
                if (barcode == barcodeScanner.value) {
                    // Check if finished scanning for the item or not
                    if (recordItem.dataset.scanDone != 'true') {
                        // Update To Be Scanned
                        recordItem.querySelectorAll('.current')[0].innerHTML =
                            toBeScanned - 1;
                        wrongItem = false;
                        // Update scanDone if finished scanning for the item
                        if (toBeScanned - 1 <= 0) {
                            recordItem.dataset.scanDone = true; 
                            notification.show('Done scanning for this item.');
                        }
                        //break;
                    } else {
                        wrongItem = false;
                        continue;
                        //notification.show('Already finished scanning this item.');
                    }
                    break;
                }
            }
            
        }
    }

    if (wrongItem) {
        notification.show('Scanned wrong item/label barcode.');
    }
    // Check if all items are scanned and enable buttons if so
    enableNext(checkDone());
}

// Enable the Override button
function enableOverride() {
    document.querySelector('.record-actions .override').disabled = false;
}