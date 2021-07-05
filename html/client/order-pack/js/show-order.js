// Show Orders
import {loaddata} from './load-data.js';
import {checkItemBarcode} from './utils.js';

async function showOrder(orderDetails, tracking) {
    window.warnDone = false;
    var recordContainer = document.querySelector('#record-container');
    var recordTemplate =
            document.querySelector('#record-entry-template').content;
    var tableBody = recordTemplate.querySelector('.record-items tbody');

    clearHtml(recordContainer, tableBody);

    // Show "Combined Order" tab if more than one order
    if (orderDetails.orderCount > 1) {
        showCombinedTab(recordTemplate, true);
    } else {
        showCombinedTab(recordTemplate, false);
    }

    showTitle(recordTemplate, orderDetails);
    showItems(orderDetails, tableBody);
    showMessages(recordTemplate, orderDetails.NotesToSelf,
        orderDetails.manualMessages);
    //trackingNumber(recordTemplate);

    recordContainer.appendChild(document.importNode(recordTemplate, true));
    showTracking();
    document.querySelector('.record-trackingid span').textContent = tracking ? JSON.parse(tracking).join(', ') : '';
    if (pageType != 3) {
        let nextBtn = document.querySelector('.next');
        nextBtn.style.display = 'none';
    }
}

function showErrorOrder(entireOrder) {
    var recordContainer = document.querySelector('#record-container');
    var recordTemplate =
            document.querySelector('#record-error-template').content;
    var tableBody = recordTemplate.querySelector('.record-items tbody');

    clearHtml(recordContainer, tableBody);

    var dbIds = '';
    for (let i = 0; i < entireOrder.length; i++) {
        dbIds += entireOrder[i].orderID;
    }

    showError(recordTemplate, dbIds);
    recordContainer.appendChild(document.importNode(recordTemplate, true));
}

// Clears html elements
function clearHtml(recordContainer, tableBody) {
    if (recordContainer) {
        while (recordContainer.firstChild) { // Title
            recordContainer.removeChild(recordContainer.firstChild);
        }
    }
    if (tableBody) {
        while (tableBody.firstChild) { // Items table
            tableBody.removeChild(tableBody.firstChild);
        }
    }
}

function showError(recordTemplate, dbIds) {
    recordTemplate.querySelector('.record-error-msg').textContent = 
        'An error has occurred with Order IDs: ' + dbIds +
        '. Please note down the Order IDs for IT Support and move ' +
        'to the next order.';
}

// Only show tabs for respective type
function showCombinedTab(recordTemplate, check) {
    if (check) {
        recordTemplate.querySelector('.record-duplicate').classList
            .remove('hide');
    } else {
        recordTemplate.querySelector('.record-duplicate').classList
            .add('hide');
    }
}

function showTitle(recordTemplate, orderDetails) {
    let records = orderDetails.SalesRecordID;
    let dbrecords = orderDetails.DatabaseID;
    let recordsStrs = [];
    for (let i=0; i<records.length; i++) {
        recordsStrs.push([records[i][0], dbrecords[i]]);
    }
    recordTemplate.querySelector('.record-title').dataset.records = JSON.stringify(recordsStrs);
    recordTemplate.querySelector('.record-title .record-num')
        .textContent = getAllRecordIDs(orderDetails) || null; // Record #
    recordTemplate.querySelector('.record-title .bucket-num')
        .textContent = orderDetails.bucketNumbers.join(", ") || null; // Bucket
    recordTemplate.querySelector('.record-title .record-buyer-name')
        .textContent = orderDetails.BuyerFullName || null; // Name
    recordTemplate.querySelector('.record-title .record-date')
        .textContent = orderDetails.PaidDate || null; // Date
    recordTemplate.querySelector('.record-title .record-user-id')
        .textContent = orderDetails.UserID || null; // User ID
    recordTemplate.querySelector('.record-title .record-db-id')
        .textContent = orderDetails.DatabaseID.join(", ") || null; // DB ID
}

// Show items in table
function showItems(orderDetails, tableBody) {
    //console.log(orderDetails);
    let isReplacement = false;
    for (let item of orderDetails.Items) {
        if (item.ReplacedItem) isReplacement = true;
        break;
    }
    let weightSaveDone = true;
    for (var i = 0; i < orderDetails.Items.length; i++) {
        if (isReplacement && !orderDetails.Items[i].ReplacedItem) continue;
        if (!orderDetails.Items[i].weight) weightSaveDone = false;
        var tr = document.createElement('tr');
        var barcodeCheck = checkItemBarcode(orderDetails.Items[i].barcode, orderDetails.Items[i].singleItemBarcode);
        var tdData = [
            orderDetails.Items[i].Quantity || null, // Quantity
            //orderDetails.SalesRecordID[0][0]==11 || orderDetails.SalesRecordID[0][0]==12 ? orderDetails.Items[i].SKU : orderDetails.Items[i].ItemNum || null, // Item #
            orderDetails.Items[i].ItemNum || null,
            orderDetails.Items[i].SKU || null,
            prepareItemTitle(orderDetails.Items[i].VariationDetails,
                orderDetails.Items[i].Variations, 
                orderDetails.Items[i].ItemTitle, orderDetails.Items[i].Parts) || null, // Item Name
            orderDetails.Items[i].SalePrice || null,
            orderDetails.Items[i].partialrefund == "1" ? null : (calcTtbs(orderDetails.Items[i].Quantity, orderDetails.Items[i].multiple) || null), // To be scanned
            orderDetails.Items[i].partialrefund == "1" ? null : (calcTtbs(orderDetails.Items[i].Quantity, orderDetails.Items[i].singleItemMultiple) || null),
            prepareImage(orderDetails.Items[i].imageUrl) || null, // Image
            orderDetails.Items[i].weight || null,
        ];
        
        // Table row datasets
        tr.dataset.itemnum = orderDetails.Items[i].ItemNum || null;
        tr.dataset.barcode = orderDetails.Items[i].barcode || null;
        tr.dataset.singleItemBarcode = orderDetails.Items[i].singleItemBarcode || null;
        tr.dataset.factory = orderDetails.Items[i].factory || null;
        tr.dataset.id = orderDetails.Items[i].id || null;
        tr.dataset.weight = orderDetails.Items[i].weight || null;
        tr.dataset.quantity = orderDetails.Items[i].Quantity || null;
        // If no item barcode, assume this particular item is scanned
        if (barcodeCheck) {
            tr.dataset.scanDone = false;
        } else {
            tr.dataset.scanDone = true;
        }
        if (orderDetails.Items[i].partialrefund == "1") {
            tr.dataset.scanDone = true;
        }

        // Append data to table
        for (var td_i = 0; td_i < tdData.length; td_i++) {
            var td = document.createElement('td');
            // Add value to ttbs for times to be scanned "eg 1/3"
            if (td_i == 5) { // To be scanned cell
                if (tdData[td_i] != null && barcodeCheck) {
                    var currentSpan = document.createElement('span');
                    var totalSpan = document.createElement('span');

                    // "current / total" for To be scanned
                    currentSpan.className = "current";
                    totalSpan.className = "total";
                    currentSpan.innerHTML = tdData[td_i];
                    totalSpan.innerHTML = tdData[td_i];
                    td.className = "item-scan";
                    td.appendChild(currentSpan);
                    td.innerHTML = td.innerHTML + "/";
                    td.appendChild(totalSpan);
                } else {
                    td.innerHTML = "-"; // If no item barcode to scan
                }
            } else if (td_i == 6) { // Individual Item to be scanned cell
                if (tdData[td_i] != null && barcodeCheck) {
                    var currentSpan = document.createElement('span');
                    var totalSpan = document.createElement('span');

                    // "current / total" for Individual item to be scanned
                    currentSpan.className = "indivcurrent";
                    totalSpan.className = "indivtotal";
                    currentSpan.innerHTML = tdData[td_i];
                    totalSpan.innerHTML = tdData[td_i];
                    td.className = "item-scan";
                    td.appendChild(currentSpan);
                    td.innerHTML = td.innerHTML + "/";
                    td.appendChild(totalSpan);
                } else {
                    td.innerHTML = "-"; // If no item barcode to scan
                }
            } else if (typeof tdData[td_i] != "object") { // Text
                td.innerHTML = tdData[td_i];
            } else if (td_i == 7){ // Everything else (image)
                if (tdData[td_i]) {
                    td.appendChild(tdData[td_i]);
                } else {
                    td.innerHTML = "No image available";
                }
            }
            tr.appendChild(td);
        }
        tableBody.appendChild(tr);
    }
    window.weightDone = weightSaveDone;
}

function showTracking() {
    if (pageType==3) {
        let saveTrackBtn = document.querySelector('button.save-track');
        saveTrackBtn.classList.remove('hide');
        saveTrackBtn.textContent = 'Scan Tracking';
        scanFlatTrack = false;
    }
}

// Seperates variation data from item title and formats it
function prepareItemTitle(variationDetails, itemVariations, itemTitleValue, Parts) {
    var variationData = null;
    // Remove brackets and contents inside
    var itemTitle = itemTitleValue.replace(/ *\[[^)]*\] */g, '');
    if (Parts) itemTitle = itemTitle + ' (Bundle ' + Parts + ')';

    if (variationDetails) {
        variationData = variationDetails;
    } else if (itemVariations) {
        variationData = itemVariations;
    } else {
        variationData = null;
    }

    if (variationData) {
        // Get variation parts and prepare title parts 
        var parts = variationData;
        var variationStrParts = [];

        if (combinedgroupstores.includes(packStore)) {
            for (let p_i = 0; p_i < parts.length; p_i++) {
                // Save parts
                variationStrParts.push(parts[p_i].display_name + ": " + parts[p_i].display_value
                    + '<span class="gap10"></span>');
            }
            // Make item title value
            itemTitle = itemTitle + '<br><strong>' + variationStrParts.join('<br>')
                + '</strong>';
        } else {
            for (let p_i = 0; p_i < parts.length; p_i++) {
                // Save parts
                variationStrParts.push("Variation: " + parts[p_i]
                    + '<span class="gap10"></span>');
            }
            // Make item title value
            itemTitle = itemTitle + '<br><strong>' + variationStrParts.join('<br>')
                + '</strong>';
        }
            
        return itemTitle;
    } else {
        return itemTitle;
    }
}

// Calculate times to be scanned
function calcTtbs(quantity, multiple) {
    if (quantity * multiple) {
        return quantity * multiple;
    } else {
        return null;
    }
}

// Prepares the image of product to be put into table
function prepareImage(imageUrl) {
    if (imageUrl) {
        var image = document.createElement('img');
        var imageLink = document.createElement('a');

        image.src = imageUrl.substring(0,3)=='img' ? apiUrls.pictureUrl + imageUrl : imageUrl;
        image.style = "width:150px;height:auto";
        imageLink.href = image.src;
        imageLink.target = "_blank";
        imageLink.appendChild(image);

        return imageLink;
    } else {
        return null;
    }
}

/*function trackingNumber(recordTemplate) {
    var trackingId = recordTemplate.querySelector('.tracking-number');
    if (window.track == null)
        trackingId.querySelector('span').innerHTML = "Has not been uploaded.";
    else 
        trackingId.querySelector('span').innerHTML = window.track;
}*/

// Show notes to self and manual messages
function showMessages(recordTemplate, NotesToSelf, manualMessages) {
    var buyerMessage = recordTemplate.querySelector('.record-buyer-message');
    var manualMessage = recordTemplate.querySelector('.manual-message');
    
    if (hasMessages(NotesToSelf)) {
        // Show each message on a new line
        var NotesToSelfS = '<br>' + NotesToSelf.join("</br><br>") + '</br>';
        buyerMessage.querySelector('span').innerHTML = NotesToSelfS;
        buyerMessage.classList.remove('hide'); // Unhide manual messages
    } else {
        buyerMessage.classList.add('hide'); // Hide buyer messages
    }
    
    if (hasMessages(manualMessages)) {
        // Show each message on a new line
        var manualMessagesS = '<br>' + manualMessages.join("</br><br>")
            + '</br>';
        manualMessage.querySelector('span').innerHTML = manualMessagesS;
        manualMessage.classList.remove('hide'); // Unhide manual messages
    } else {
        manualMessage.classList.add('hide'); // Hide manual messages
    }
}

// Checks if there are any messages in manual messages array
function hasMessages(messages) {
    var count = 0;

    for (var i = 0; i < messages.length; i++) {
        if (messages[i] != "" && messages[i] != null) {
            count++;
        }
    }

    if (count > 0) {
        return true;
    } else {
        return false;
    }
}

// Returns a string with all the Record IDs (eg. DC-000000, DP-00000)
// stores variable in config file
function getAllRecordIDs(orderDetails) {
    var allRecordIDs = [],
        recIDsString = "";
    var salesRecordID = orderDetails.SalesRecordID;

    for (var i = 0; i < salesRecordID.length; i++) {
        allRecordIDs.push(stores[salesRecordID[i][0]].recID
            + salesRecordID[i][1]);
    }
    recIDsString = allRecordIDs.join(", ");

    return recIDsString;
}

export {
    showOrder,
    showErrorOrder,
    clearHtml,
    showTracking
}