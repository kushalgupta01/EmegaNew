// Show orders

import {getItemDetails, loadItemDetails} from './item-details.js';
import {clearRecords} from './order-list.js';
import {sortRecordsByBrand, sortRecordsByType, sortRecordsByGroup, sortRecordsByDate, sortRecordsByBay} from './sort-records.js';
import {round2, weightedRandom} from '/common/tools.js';

function showOrders(recordStore, recordNum) {
	var getItems = (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.STOCK || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.AWAITINGLIST || page.type == PAGE_TYPE.RTS);
	var connectedRecords = saleRecords[recordStore].connected[recordNum], connectedRecordsLen = connectedRecords ? connectedRecords.length : 0;
	var connectedRecordsCount = connectedRecordsLen;
	var appendEntry = false;

	if (!connectedRecordsLen) {
		// Remove all currently shown record entries
		clearRecords();
		return;
	}

	document.querySelector('#record-entries').classList.remove('done');
	toggleGroups(true);

	for (var i = 0; i < connectedRecordsLen; i++) {
		var rowDataToday = saleRecords[connectedRecords[i][0]].today[connectedRecords[i][1]];
		if (!rowDataToday || rowDataToday.constructor != Object) {
			connectedRecordsCount--;
			continue;
		}
		showRecord(connectedRecords[i][0], connectedRecords[i][1], getItems, appendEntry, connectedRecordsCount > 1);
		appendEntry = true;
	}

	var combinedEls = document.querySelectorAll('#record-entries .record-combined');
	if (combinedEls.length == 1) {
		// Hide combined orders tab
		combinedEls[0].classList.add('hide');
	}


	var BaySelections = document.querySelectorAll("#record-entries .record-entry #baySelect #bay");
	//console.log(BaySelections);
	for (let BaySelection of BaySelections) {
		//console.log(BaySelection);
		for (let i = 0; i <= page.bays; i++) {
			var option = document.createElement('option');
			option.value = i;
			option.textContent = i;
			BaySelection.appendChild(option);
		}
	}
}

// Show selected record
async function showRecord(store, recordNum, getItems, appendEntry = false, combined = false) {
	if (!saleRecords.hasOwnProperty(store) || !saleRecords[store].records.hasOwnProperty(recordNum)) return;
	var rowData = saleRecords[store].records[recordNum];
	//console.log(rowData.Items);
	var rowDataToday = saleRecords[store].today[recordNum];
	var recordGroup = document.querySelector('#record-group');
	var recordEntries = document.querySelector('#record-entries');
	var recordTemplate = document.querySelector('#record-entry-template').content;
	var tableBody = recordTemplate.querySelector('.record-items tbody');
	var orderType = null;
	//console.log(rowData);

	// Remove existing record entries
	if (!appendEntry) {
		clearRecords();
		toggleGroups(true);
	}

	// Remove existing table entries
	while (tableBody.firstChild) {
		tableBody.removeChild(tableBody.firstChild);
	}

	// Update order details using data from the database
	var orderInfo = getRecordOrderInfo(store, recordNum);
	orderType = parseInt(orderInfo.OrderType, 10);
	delete orderInfo.OrderType;
	rowData.OrderType = orderType;

	if (rowDataToday.constructor === Object) {
		rowData.OrderStatus = rowDataToday.OrderStatus;
		rowData.GroupID = rowDataToday.GroupID;
		rowDataToday.Data = orderInfo;
	}

	// Select group
	if (recordGroup && recordGroup.querySelector('input')) {
		if (rowData.GroupID) {
			let selectedGroup = recordGroup.querySelector('input[name="rg"]:checked');
			if (selectedGroup) selectedGroup.checked = false;
			recordGroup.querySelector('input[name="rg"][value="'+rowData.GroupID+'"]').checked = true;
		}
		else if (page.type == PAGE_TYPE.LABELS) {
			// Select first group as default
			recordGroup.querySelector('#rg1').checked = true;
		}
	}

	// Add general details
	recordTemplate.querySelector('.record-title .record-buyer-name').textContent = rowData.BuyerFullName;
	recordTemplate.querySelector('.record-title .record-buyer-id').textContent = rowData.UserID;
	recordTemplate.querySelector('.record-title .record-date').textContent = rowData.PaidDate;
	recordTemplate.querySelector('.record-title .record-store').textContent = stores[store].name;
	recordTemplate.querySelector('.record-title .record-num').textContent = rowData.SalesRecordID || rowData.RecordNum;
	recordTemplate.querySelector('.record-title .record-db-id').textContent = rowData.DatabaseID;

	// Buyer country
	let recordBuyerCountry = recordTemplate.querySelector('.record-title .record-buyer-country');
	if (orderType == ORDER_TYPE.INTERNATIONAL && page.type == PAGE_TYPE.COLLECT && rowData.BuyerCountry && countryCodes[rowData.BuyerCountry]) {
		recordBuyerCountry.textContent = countryCodes[rowData.BuyerCountry];
		recordBuyerCountry.parentNode.classList.remove('hide');
	}
	else {
		recordBuyerCountry.parentNode.classList.add('hide');
	}

	// Order status
	var recordOrderStatus = recordTemplate.querySelector('.record-title .record-status');
	if (rowData.OrderStatus) recordOrderStatus.textContent = ORDER_STATUS_NAME[rowData.OrderStatus];
	recordOrderStatus.parentNode.classList[page.type == PAGE_TYPE.REFUNDS && rowData.OrderStatus ? 'remove' : 'add']('hide');

	// International
	var postInternational = recordTemplate.querySelector('.record-international');
	postInternational.classList[rowData.BuyerCountry.toUpperCase() == 'AU' ? 'add' : 'remove']('hide');
	//postInternational.classList[orderType == ORDER_TYPE.INTERNATIONAL ? 'remove' : 'add']('hide');

	// Express
	var postExpress = recordTemplate.querySelector('.record-express');
	if (rowData.PostService) {
		postExpress.classList[rowData.PostService.toLowerCase().includes('express') ? 'remove' : 'add']('hide');
	}else{
		postExpress.classList['add']('hide');
	}

	//postExpress.classList[orderType == ORDER_TYPE.EXPRESS ? 'remove' : 'add']('hide');

	// Combined order
	var combinedOrder = recordTemplate.querySelector('.record-combined');
	combinedOrder.classList[combined ? 'remove' : 'add']('hide');
	
	// Hide all postage services
	var postservices = recordTemplate.querySelectorAll('.record-postservice, .record-postservice span');
	for (let i = 0; i < postservices.length; i++) {
        postservices[i].classList.add('hide');
    }

    //Hide all pack status
    recordTemplate.querySelector('.pack-status').classList.add('hide');
    var packstatus = recordTemplate.querySelectorAll('.pack-status span');
	for (let i = 0; i < packstatus.length; i++) {
        packstatus[i].classList.add('hide');
    }
	
	let orderStatus = rowDataToday.OrderStatus;
	
	for (let i = 0; i < packstatus.length; i++) {
        if (ORDER_STATUS[packstatus[i].dataset.status] == orderStatus) {
        	packstatus[i].classList.remove('hide');
        	recordTemplate.querySelector('.pack-status').classList.remove('hide');
        }
    }

    //Hide all pack status for RTS
    recordTemplate.querySelector('.pack-rts').classList.add('hide');
    var packrts = recordTemplate.querySelectorAll('.pack-rts span');
	for (let i = 0; i < packrts.length; i++) {
        packrts[i].classList.add('hide');
    }
	
	let rts = rowDataToday.rts;
	let damagedrts = rowDataToday.damagedrts;
	
	for (let i = 0; i < packrts.length; i++) {
        if (packrts[i].dataset.status == 'RTS') {
        	if (rts) {
        		packrts[i].classList.remove('hide');
	        	recordTemplate.querySelector('.pack-rts').classList.remove('hide');
        	}	
        }
        if (packrts[i].dataset.status == 'DAMAGEDRTS') {
        	if (damagedrts) {
        		packrts[i].classList.remove('hide');
	        	recordTemplate.querySelector('.pack-rts').classList.remove('hide');
        	}	
        }
    }

    for (let item of rowData.Items) {
    	let itemNum = item.ItemNum;
    	let itemSku = item.SKU;
    	if (!itemDetails[itemNum||itemSku]) {
    		await getItemDetails([[store, recordNum]]);
    		break;
    	}
	}

    if (!rowData.split) {

	    var newItems = [];

	    //console.log(rowData.Items);

	    for (let item of rowData.Items) {
	    	let foundItem = false;
	    	let itemNum = item.ItemNum;
	    	let itemSku = item.SKU;
	    	let itemName = item.ItemTitle;
	    	let qty = parseInt(item.Quantity);
	    	let price = parseFloat(item.SalePrice);
	    	if (itemDetails[itemNum]) {
	    		let itemDatas = itemDetails[itemNum];
	    		for (let itemData of itemDatas) {
	    			if (itemData.sku == itemSku) {
	    				foundItem = true;
	    				if (itemData.bundle) {
	    					let bundle = JSON.parse(itemData.bundle);
	    					let num = Object.values(bundle).reduce((a,b) => a+b);
	    					let count = Object.values(bundle).length;
	    					let i = 1;
	    					for (let ite in bundle) {
	    						let bundleData = JSON.parse(JSON.stringify(bundleItems[ite]));
	    						bundleData['Quantity'] = qty*parseInt(bundle[ite]);
	    						bundleData['SalePrice'] = price/num;
	    						bundleData['Parts'] = itemSku+' ' + i + '/'+count;
	    						i++;
	    						newItems.push(bundleData);

	    					}
	    					
	    				}else{
	    					newItems.push(item);
	    				}
	    				break;
	    			}
	    		}
	    	}else if (itemDetails[itemSku]) {
	    		let itemDatas = itemDetails[itemSku];
	    		for (let itemData of itemDatas) {
	    			if (itemData.name == itemName) {
	    				foundItem = true;
	    				if (itemData.bundle) {
	    					let bundle = JSON.parse(itemData.bundle);
	    					let num = Object.values(bundle).reduce((a,b) => a+b);
	    					let count = Object.values(bundle).length;
	    					let i = 1;
	    					for (let ite in bundle) {
	    						let bundleData = JSON.parse(JSON.stringify(bundleItems[ite]));
	    						bundleData['Quantity'] = qty*parseInt(bundle[ite]);
	    						bundleData['SalePrice'] = price/num;
	    						bundleData['Parts'] = itemSku+' ' + i + '/'+count;
	    						i++;
	    						newItems.push(bundleData);
	    					}
	    				} else{
	    					newItems.push(item);
	    				}
	    				break;
	    			}
	    		}
	    	}
	    	if (!foundItem) newItems.push(item);
	    }
	    //console.log(newItems);
	    if (newItems.length != 0 ) rowData.Items = newItems;
	    rowData['split'] = true;

	}


	// Add items to table
	var completeSubtotal = 0;
	var isAlternative = false;
	for (let i = 0; i < rowData.Items.length; i++) {
		if(rowData.Items[i].AlterItem) {
			isAlternative = true;
		}
	}
	for (let i = 0; i < rowData.Items.length; i++) {
		// Create row
		//console.log(rowData.Items[i]);
		let tr = document.createElement('tr');
		let itemQuantity = parseInt(rowData.Items[i].Quantity, 10);
		if ((page.user.type == USER_TYPE.ADMIN || page.user.type == USER_TYPE.USER || page.user.type == USER_TYPE.SUPPLIER) && getItems){
			tr.classList.add('clickable');
			//if (rowData.Items[i].SKU) tr.classList.add('no-edit');
		}
		if (rowData.Items[i].SKU) tr.dataset.sku = rowData.Items[i].SKU;
		if (rowData.Items[i].ItemNum) tr.dataset.itemNum = rowData.Items[i].ItemNum;
		tr.dataset.itemTitle = rowData.Items[i].Parts ? rowData.Items[i].ItemTitle + ' (bundle ' + rowData.Items[i].Parts + ')' : rowData.Items[i].ItemTitle;
		tr.dataset.itemQuantity = itemQuantity;
		tr.dataset.store = store;
		tr.dataset.price = rowData.Items[i].SalePrice;
		tr.dataset.partialrefund = rowData.Items[i].partialrefund==undefined ? 0 : rowData.Items[i].partialrefund;
		if (rowData.Items[i].partialrefund=="1") tr.classList.add('bg-tan');
		if (rowData.Items[i].LineItemID) tr.dataset.lineitemid = rowData.Items[i].LineItemID;
		let subtotal = parseFloat(rowData.Items[i].SalePrice) * itemQuantity;
		completeSubtotal += subtotal;

		// Change any flat pack symbols
		for (let fpSymbol in fpSymbolsConv) {
			if (rowData.Items[i].ItemTitle[0] == fpSymbol) {
				rowData.Items[i].ItemTitle = fpSymbolsConv[fpSymbol]+rowData.Items[i].ItemTitle.substring(1);
			}
		}

		// Get item variation if present
		if (store==51) {
			let sku = rowData.Items[i].SKU;
			let itemSKUDetails = itemDetails[sku];
			if (itemSKUDetails) {
				for (let isd of itemSKUDetails) {
					if (isd.storeID==51) {
						rowData.Items[i].ItemTitle = isd.name;
					}
				}
			}
		}
		let variationDetails = getVariationDetails(rowData.Items[i]);
		let itemTitleValue = variationDetails.itemNameFull;

		if (variationDetails.variations) {
			// Save variation names/types and change item name
			tr.dataset.variationTypes = JSON.stringify(variationDetails.variations.map(x => x.name));
			itemTitleValue = variationDetails.itemName + '<br><strong>' + variationDetails.variations.map(x => (x.name || 'Variation')+':<span class="gap10"></span>'+x.value).join('<br>') + '</strong>';
		}

		let VariationDetails = rowData.Items[i].VariationDetails;
		if (store==2 && VariationDetails._tmcartepo_data) {
			// Save variation names/types and change item name
			tr.dataset.variationTypes = JSON.stringify(VariationDetails._tmcartepo_data.map(x => x.value));
			itemTitleValue = rowData.Items[i].ItemTitle + '<br><strong>' + VariationDetails._tmcartepo_data.map(x => (x.value || 'Variation')+':<span class="gap10"></span>'+x.quantity).join('<br>') + '</strong>';
		}

		// Prepare row data
		let tdData = [
			// Item value, data value
			[rowData.Items[i].Quantity, 'centre'],
			[rowData.Items[i].ItemNum, null],
			[rowData.Items[i].SKU || '-', 'centre'],
			[itemTitleValue, null],
			[parseFloat(rowData.Items[i].SalePrice).toFixed(2), null], // Price
			[subtotal.toFixed(2), null], // Subtotal
		];

		let tableThScanned = recordTemplate.querySelector('.record-items thead th[data-name="scanned"]');
		let tableThIndivScanned = recordTemplate.querySelector('.record-items thead th[data-name="indivScanned"]');
		let tableThCurrentInventory = recordTemplate.querySelector('.record-items thead th[data-name="current-inventory"]');
		let tableThImage = recordTemplate.querySelector('.record-items thead th[data-name="image"]');
		let tableThBaySat = recordTemplate.querySelector('.record-items thead th[data-name="baySat"]');
		let tableThReport = recordTemplate.querySelector('.record-items thead th[data-name="report"]');
		let tableThAlterItem = recordTemplate.querySelector('.record-items thead th[data-name="alternativeItem"]');

		if (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.STOCK || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.AWAITINGLIST || page.type == PAGE_TYPE.RTS) {
			tableThAlterItem.classList.add('hide');
			tableThScanned.classList.remove('hide');
			tableThIndivScanned.classList.remove('hide');
			tableThCurrentInventory.classList.remove('hide');
			tableThImage.classList.remove('hide');

			if(isAlternative) {
				tableThAlterItem.classList.remove('hide');
				let alterItem = '';
				if(rowData.Items[i].AlterItem) {
					alterItem = alterItem + '<button class="alternative-item-show action-btn btn-grey">Show item</button>';
					alterItem = alterItem + '<div class="alternative-item-content hide">';
					alterItem = alterItem + 'Item Name: ' + rowData.Items[i].AlterItem.name + '<br/>';
					if (rowData.Items[i].AlterItem.itemNo) alterItem = alterItem + 'Item #: ' + rowData.Items[i].AlterItem.itemNo + '<br/>';
					alterItem = alterItem + 'SKU: ' + rowData.Items[i].AlterItem.sku + '<br/>';
					alterItem = alterItem + 'Item Price: ' + rowData.Items[i].AlterItem.price + '<br/>';
					alterItem = alterItem + 'Quantity: ' + rowData.Items[i].AlterItem.quantity + '<br/>';
					alterItem = alterItem + '</div>';
				}

				tdData.push([alterItem, 'left']);
			}

			tdData.push(['-', 'item-scan centre']); // Number of items to be scanned (initially blank)
			tdData.push(['-', 'indiv-item-scan centre']); // Number of items to be scanned (initially blank)
			tdData.push(['', 'item-inventory left ']);
			tdData.push(['', 'item-img centre']); // Image
		}
		else {
			// Hide columns
			tableThAlterItem.classList.add('hide');
			tableThScanned.classList.add('hide');
			tableThIndivScanned.classList.add('hide');
			tableThCurrentInventory.classList.add('hide');
			tableThImage.classList.add('hide');

			if(page.tab == PAGE_TAB.ALTERNATIVE){
				tableThAlterItem.classList.remove('hide');
				let alterItem = '';
				if(rowData.Items[i].AlterItem) {
					alterItem = alterItem + '<button class="alternative-item-show action-btn btn-grey">Show item</button>';
					alterItem = alterItem + '<div class="alternative-item-content hide">';
					alterItem = alterItem + 'Item Name: ' + rowData.Items[i].AlterItem.name + '<br/>';
					if (rowData.Items[i].AlterItem.itemNo) alterItem = alterItem + 'Item #: ' + rowData.Items[i].AlterItem.itemNo + '<br/>';
					alterItem = alterItem + 'SKU: ' + rowData.Items[i].AlterItem.sku + '<br/>';
					alterItem = alterItem + 'Item Price: ' + rowData.Items[i].AlterItem.price + '<br/>';
					alterItem = alterItem + 'Quantity: ' + rowData.Items[i].AlterItem.quantity + '<br/>';
					alterItem = alterItem + '</div>';
				}
				tdData.push([alterItem, 'left']);
			}
		}

		if (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) {

			if (page.tab == PAGE_TAB.HOBBYCO) {
				tableThBaySat.classList.add('hide');
				tdData.push(['<button class="item-report action-btn btn-grey">Report</button>'
				+ '<button id="downloadItem" class="item-download action-btn" data-type="downloaditem">Download</button>'
				+ '<button id="markparref" class="item-mark-partialrefund action-btn" data-type="markparref">Partial refund</button>'
				+ '<button id="markmodify" class="item-mark-modify action-btn" data-type="markmodify">Alternative</button>'
				+ '<button id="markadd" class="item-mark-add action-btn" data-type="markadd">Add</button>'
				, 'button centre']); // Item buttons

			} else {
				tableThBaySat.classList.remove('hide');
				tableThReport.classList.remove('hide');
				tdData.push(['', 'bay_sat centre']); // Bay
				tdData.push(['<button class="item-report action-btn btn-grey">Report</button>'
				+'<button id="add-inven" class="order-inventory action-btn">Add to Inventory</button>' 
				+ '<button id="markfp" class="item-mark-flatpack action-btn" data-type="markfp">Flatpack</button>'
				+ '<button id="markvr" class="item-mark-vr action-btn" data-type="markvr">VR</button>'
				//+ '<button id="markfwfp" class="item-mark-fastwayflatpack action-btn" data-type="markfwfp">FWFP</button>'
				//+ '<button id="markfwfp1kg" class="item-mark-fastwayflatpack1kg action-btn" data-type="markfwfp1kg">FWFP1KG</button>'
				+ '<button id="markfactory" class="item-mark-factory action-btn" data-type="markfac">Factory</button>'
				+ '<button id="markcostco" class="item-mark-costco action-btn" data-type="markcos">Costco</button>'
				+ '<button id="downloadItem" class="item-download action-btn" data-type="downloaditem">Download</button>'
				+ '<button id="markadd" class="item-mark-add action-btn" data-type="markadd">Add</button>'
				//+ '<button id="markmodify" class="item-mark-modify action-btn" data-type="markmodify">Alternative</button>'
				// + '<button id="markreplace" class="item-mark-replace action-btn" data-type="markreplace">Replacement</button>'
				// + '<button id="markfgb" class="item-mark-fgb action-btn" data-type="markfgb">FGB</button>'
				// + '<button id="markmorlife" class="item-mark-morlife action-btn" data-type="markmor">MORLIFE</button>'
				, 'button centre']); // Item buttons
				}
		}
		else {
			tableThBaySat.classList.add('hide');
			tableThReport.classList.add('hide');
		}

		// Add row contents
		for (let td_i = 0; td_i < tdData.length; td_i++) {
			let td = document.createElement('td');
			td.innerHTML = tdData[td_i][0];
			if (tdData[td_i][1]) td.className = tdData[td_i][1];
			tr.appendChild(td);
		}
		tableBody.appendChild(tr);
	}

	// Scan status
	var scanStatus = recordTemplate.querySelector('tfoot .scan-status');
	if (scanStatus) {
		if (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) {
			scanStatus.classList.remove('hidden');
			changeScanStatus(store, recordNum, rowDataToday.ScanDone ? SCAN_ACTIONS.DONE : SCAN_ACTIONS.WAITING, scanStatus);
		}
		else {
			scanStatus.classList.add('hidden');
		}
	}


	// Subtotal, postage, total
	recordTemplate.querySelector('.record-prices').innerHTML = '$'+round2(completeSubtotal)+'<br>$'+round2(rowData.Postage)+'<br>$'+round2(rowData.TotalPrice);


	// Postage service
	var showPostService = false;
	switch (orderType) {
		case ORDER_TYPE.FLATPACK:
			recordTemplate.querySelector('.record-postservice .flatpacked').classList.remove('hide');
			showPostService = true;
			break;
		case ORDER_TYPE.FASTWAY:
			recordTemplate.querySelector('.record-postservice .fastway').classList.remove('hide');
			showPostService = true;
			break;
		/*case ORDER_TYPE.FASTWAYBROWN:
			recordTemplate.querySelector('.record-postservice .fastwaybrown').classList.remove('hide');
			showPostService = true;
			break;*/
		case ORDER_TYPE.AUSPOST:
			recordTemplate.querySelector('.record-postservice .auspost').classList.remove('hide');
			showPostService = true;
			break;
		case ORDER_TYPE.FASTWAYFLATPACK:
			recordTemplate.querySelector('.record-postservice .fastwayflatpack').classList.remove('hide');
			showPostService = true;
			break;
		case ORDER_TYPE.FASTWAYFLATPACK1KG:
			recordTemplate.querySelector('.record-postservice .fastwayflatpack1kg').classList.remove('hide');
			showPostService = true;
			break;
		case ORDER_TYPE.FASTWAYFLATPACK5KG:
			recordTemplate.querySelector('.record-postservice .fastwayflatpack5kg').classList.remove('hide');
			showPostService = true;
			break;
	}

	if (showPostService) recordTemplate.querySelector('.record-postservice').classList.remove('hide');


	// Message from buyer
	var buyerMessage = recordTemplate.querySelector('.record-buyer-message');
	if (buyerMessage) {
		if (rowData.NotesToSelf) {
			buyerMessage.querySelector('span').textContent = rowData.NotesToSelf;
			buyerMessage.classList.remove('hide');
		}
		else {
			buyerMessage.classList.add('hide');
			buyerMessage.querySelector('span').textContent = '';
		}
	}

	// Order notes
	var recordNotes = recordTemplate.querySelector('.record-notes');
	if (recordNotes) {
		let rowDataToday = saleRecords[store].today[recordNum];
		if (rowDataToday.Notes) {
			let notesValue = null;

			try {
				let notesData = JSON.parse(rowDataToday.Notes);
				let notesOther = null;

				// Save and remove the 'other' value if it exists
				if (notesData.hasOwnProperty('other')) {
					notesOther = notesData['other'];
					delete notesData['other'];
				}

				// Get the notes
				let notesItems = Object.keys(notesData);
				if (notesItems.length || notesOther) {
					notesValue = '<strong>Problems with order:</strong> ';
				}

				if (notesItems.length) notesValue += notesItems.join(', ');
				if (notesOther) {
					if (notesItems.length) notesValue += ', ';
					notesValue += '<span class="underlined">other</span>: '+notesOther;
				}
				if (!notesValue) notesValue = notesData;
			}
			catch (e) {
				notesValue = rowDataToday.Notes;
			}

			if (notesValue) {
				recordNotes.querySelector('span').innerHTML = notesValue;
				recordNotes.classList.remove('hide');
			}
		}
		else {
			recordNotes.classList.add('hide');
			recordNotes.querySelector('span').textContent = '';
		}
	}

	//Oder type & order status only on Awaiting list
	if (page.type == PAGE_TYPE.AWAITINGLIST) {
		recordTemplate.getElementById('record-details').classList.remove('hide');
		// Order type
		var itemEl = recordTemplate.getElementById('record-type'), items = Object.keys(ORDER_TYPE_NAME).sort();
		/*var optionEl = document.createElement('option');
		optionEl.value = -1;
		optionEl.textContent = 'Blank';
		optionEl.selected = true;
		itemEl.appendChild(optionEl);*/

		while (itemEl.firstChild) {
			itemEl.removeChild(itemEl.firstChild);
		}

		for (let item of items) {
			var optionEl = document.createElement('option');
			optionEl.value = item;
			optionEl.textContent = ORDER_TYPE_NAME[item];
			if (item == rowDataToday.OrderType) optionEl.setAttribute('selected', 'selected');;
			itemEl.appendChild(optionEl);
		}
		//console.log(itemEl.value);

		//itemEl.value = '1'; //rowDataToday.OrderType;

		// Order status
		itemEl = recordTemplate.getElementById('record-status'), items = Object.keys(ORDER_STATUS_NAME).sort();
		/*optionEl = document.createElement('option');
		optionEl.value = -1;
		optionEl.textContent = 'Blank';
		optionEl.selected = true;
		itemEl.appendChild(optionEl);*/

		while (itemEl.firstChild) {
			itemEl.removeChild(itemEl.firstChild);
		}

		for (let item of items) {
			var optionEl = document.createElement('option');
			optionEl.value = item;
			optionEl.textContent = ORDER_STATUS_NAME[item];
			if (item == rowDataToday.OrderStatus) optionEl.setAttribute('selected', 'selected');
			itemEl.appendChild(optionEl);
		}
		//console.log(itemEl.value);

		recordTemplate.getElementById('record-collector').textContent = rowDataToday['Collector'];
		recordTemplate.getElementById('record-collected-time').textContent = rowDataToday['Collected time'];
	    recordTemplate.getElementById('record-packer').textContent = rowDataToday['Packer'];
		recordTemplate.getElementById('record-packed-time').textContent = rowDataToday['Packed time'];
	}

	if (page.type == PAGE_TYPE.STOCK) {
		recordTemplate.getElementById('content-container').classList.remove('hide');
	}
	
	// Show the relevant buttons
	var recordActions = recordTemplate.querySelectorAll('.record-actions'), pageName = PAGE_INFO[page.type].name;
	for (let el of recordActions) {
		el.classList[el.classList.contains(pageName) ? 'remove' : 'add']('hide');
	}

	// Enable/disable buttons
	if (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) {
		let recordBtns = recordTemplate.querySelectorAll('.record-actions button[class^="order-ready"][data-type], .record-actions button[class^="item-mark-flatpack"]');
		if (page.tab == PAGE_TAB.EXPRESS) changeButtonStatus(recordBtns, '*'); //ORDER_TYPE.EXPRESS
		else if (page.tab == PAGE_TAB.MNB || page.tab == PAGE_TAB.VR || page.tab == PAGE_TAB.DO || page.tab == PAGE_TAB.FGB || page.tab == PAGE_TAB.MOR || page.tab == PAGE_TAB.INTERTRADING || page.tab == PAGE_TAB.FACTORY) changeButtonStatus(recordBtns, '*');
		else changeButtonStatus(recordBtns, orderType);
	
		let buttons = recordTemplate.querySelectorAll('.record-actions button[class^="item-mark"], .record-actions button[class^="order-change"],'
			        + ' .record-actions .order-notes, .record-actions .order-scan-bypass, .record-actions .markAll-order-change-status, .record-actions .order-select-all');
		for (let btn of buttons) {
			if (page.user.type == USER_TYPE['SUPPLIER']) {
				if (btn.classList.contains('order-notes') || btn.classList.contains('order-scan-bypass') || btn.dataset.status == 'outofstock' || btn.dataset.status == 'none' || btn.dataset.status == 'cancelledoos') continue;
				if (!btn.classList.contains(SUPPLIER_INFO[page.user.supplier].id)) {
					btn.disabled = true;
					btn.classList.add('hide');
				} else {
					btn.disabled = false;
					btn.classList.remove('hide');
				}
			} else {
				if (btn.dataset.sup == 'true') {
					btn.disabled = true;
					btn.classList.add('hide');
				} else {
					btn.disabled = false;
					btn.classList.remove('hide');
				}
			}
			
		}

		let dailyorder = rowDataToday.DailyOrder;
		//console.log(dailyorder);
		// let DoBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markdo');
		// if (dailyorder==1) {
		// 	 DoBtn.textContent = 'UnDO';
		// } else {
		// 	DoBtn.textContent = 'Daily Order';
		// }

		// let fgb = rowDataToday.FGB;
		// //console.log(fgb);
		// let FGBBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markfgb');
		// if (fgb==1) {
		// 	FGBBtn.textContent = 'UnFGB';
		// } else {
		// 	FGBBtn.textContent = 'FGB Order';
		// }

		// let morlife = rowDataToday.MORLIFE;
		// //console.log(morlife);
		// let MorlifeBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markmor');
		// if (morlife==1) {
		// 	MorlifeBtn.textContent = 'UnMORLIFE';
		// } else {
		// 	MorlifeBtn.textContent = 'MORLIFE Order';
		// }

		// let spwarehouse = rowDataToday.SPWAREHOUSE;
		// //console.log(spwarehouse);
		// let SPWBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markspw');
		// if (spwarehouse==1) {
		// 	SPWBtn.textContent = 'UnSPWAREHOUSE';
		// } else {
		// 	SPWBtn.textContent = 'SP WAREHOUSE';
		// }

		// let orbit = rowDataToday.ORBIT;
		// //console.log(orbit);
		// let OrbBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markorb');
		// if (orbit==1) {
		// 	OrbBtn.textContent = 'UnORBIT';
		// } else {
		// 	OrbBtn.textContent = 'ORBIT';
		// }

		// let wv = rowDataToday.WV;
		// //console.log(wv);
		// let WVBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markwv');
		// if (wv==1) {
		// 	WVBtn.textContent = 'UnWV';
		// } else {
		// 	WVBtn.textContent = 'WV';
		// }

		// let scholastic = rowDataToday.SCHOLASTIC;
		// //console.log(scholastic);
		// let SchoBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markscho');
		// if (scholastic==1) {
		// 	SchoBtn.textContent = 'UnSCHOLASTIC';
		// } else {
		// 	SchoBtn.textContent = 'SCHOLASTIC';
		// }

		// let korimco = rowDataToday.KORIMCO;
		// //console.log(korimco);
		// let KorBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markkor');
		// if (korimco==1) {
		// 	KorBtn.textContent = 'UnKORIMCO';
		// } else {
		// 	KorBtn.textContent = 'KORIMCO';
		// }

		// let hyclor = rowDataToday.HYCLOR;
		// //console.log(hyclor);
		// let HycBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markhyc');
		// if (hyclor==1) {
		// 	HycBtn.textContent = 'UnHY-CLOR';
		// } else {
		// 	HycBtn.textContent = 'HY-CLOR';
		// }

		// let splosh = rowDataToday.SPLOSH;
		// //console.log(splosh);
		// let SploBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #marksplo');
		// if (splosh==1) {
		// 	SploBtn.textContent = 'UnSPLOSH';
		// } else {
		// 	SploBtn.textContent = 'SPLOSH';
		// }

		// let sigma = rowDataToday.SIGMA;
		// //console.log(sigma);
		// let SigBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #marksig');
		// if (sigma==1) {
		// 	SigBtn.textContent = 'UnSIGMA';
		// } else {
		// 	SigBtn.textContent = 'SIGMA';
		// }

		// let misc = rowDataToday.MISC;
		// //console.log(sigma);
		// let MiscBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' .item-mark-misc');
		// if (misc==1) {
		// 	MiscBtn.textContent = 'UnMISC';
		// } else {
		// 	MiscBtn.textContent = 'MISC';
		// }

		// let intertrading = rowDataToday.INTERTRADING;
		// //console.log(intertrading);
		// let ItBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markit');
		// if (intertrading==1) {
		// 	ItBtn.textContent = 'UnINTERTRADING';
		// } else {
		// 	ItBtn.textContent = 'INTERTRADING';
		// }

		// let factory = rowDataToday.FACTORY;
		// //console.log(factory);
		// let FacBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markfac');

		// if (factory==1) {
		// 	FacBtn.textContent = 'UnFACTORY';
		// } else {
		// 	FacBtn.textContent = 'FACTORY';
		// }

		// let sixpack = rowDataToday.SIXPACK;
		// //console.log(sixpack);
		// let sixpBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #marksix');
		// if (sixpack==1) {
		// 	sixpBtn.textContent = 'Un6 Pack';
		// } else {
		// 	sixpBtn.textContent = '6 Pack';
		// }

		// let tenpack = rowDataToday.TENPACK;
		// //console.log(tenpack);
		// let tenpBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markten');
		// if (tenpack==1) {
		// 	tenpBtn.textContent = 'Un12 Pack';
		// } else {
		// 	tenpBtn.textContent = '12 Pack';
		// }

		// let twentypack = rowDataToday.TWENTYPACK;
		// //console.log(twentypack);
		// let twentypBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #marktwenty');
		// if (twentypack==1) {
		// 	twentypBtn.textContent = 'Un24 Pack';
		// } else {
		// 	twentypBtn.textContent = '24 Pack';
		// }

		// let thirtypack = rowDataToday.THIRTYPACK;
		// //console.log(thirtypack);
		// let thirtypBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markthirty');
		// if (thirtypack==1) {
		// 	thirtypBtn.textContent = 'Un30 Pack';
		// } else {
		// 	thirtypBtn.textContent = '30 Pack';
		// }

		// let sixtypack = rowDataToday.SIXTYPACK;
		// //console.log(sixtypack);
		// let sixtypBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #marksixty');
		// if (sixtypack==1) {
		// 	sixtypBtn.textContent = 'Un60 Pack';
		// } else {
		// 	sixtypBtn.textContent = '60 Pack';
		// }

		// let gucci = rowDataToday.GUCCI;
		// //console.log(gucci);
		// let gucciBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markgucci');
		// if (gucci==1) {
		// 	gucciBtn.textContent = 'UnGUCCI';
		// } else {
		// 	gucciBtn.textContent = 'GUCCI';
		// }

		// let kobayashi = rowDataToday.KOBAYASHI;
		// let kobBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #markkob');
		// if (kobayashi==1) {
		// 	kobBtn.textContent = 'UnKobayashi';
		// } else {
		// 	kobBtn.textContent = 'Kobayashi';
		// }

		// let tprolls = rowDataToday.TPROLLS;
		// let tprBtn = recordTemplate.querySelector('.' + PAGE_INFO[page.type].name + ' #marktprolls');
		// if (tprolls==1) {
		// 	tprBtn.textContent = 'UnToilet paper';
		// } else {
		// 	tprBtn.textContent = 'Toilet Paper';
		// }
	}

	if (page.type == PAGE_TYPE.AWAITINGLIST) {
		let trackingEl = recordTemplate.querySelector('.record-trackingid span');
		trackingEl.textContent = rowDataToday.Tracking ? JSON.parse(rowDataToday.Tracking) : '';
		trackingEl.contentEditable = true;
		trackingEl.classList.add('editable');
		let notesEl = recordTemplate.querySelector('.record-notes span');
		notesEl.contentEditable = true;
		notesEl.classList.add('editable');
	} else {
		recordTemplate.querySelector('.record-trackingid').classList.add('hide');
	}

	// disable buttons for RTS page
	if (page.type == PAGE_TYPE.RTS) {
		let addBackToInventory = rowDataToday.addBackToInventory;
		let abtiBtn = recordTemplate.querySelector('.order-backtoinventory');
		let resendBtn = recordTemplate.querySelector('.order-rts-resend');
		
		if (addBackToInventory == 1) {
			abtiBtn.disabled = true;
			resendBtn.disabled = true;
		} else {
			abtiBtn.disabled = false;
			resendBtn.disabled = false;
		}
	}

	if (page.type == PAGE_TYPE.RTS && page.tab == PAGE_TAB.DAMAGEDRTS) {
		
		recordTemplate.querySelector('.order-backtoinventory').disabled = true;
		recordTemplate.querySelector('.order-rts-resend').disabled = true;
		
	}

	
	// Save store ID, record number and order type
	var recordEntry = recordTemplate.querySelector('.record-entry');
	recordEntry.dataset.store = store;
	recordEntry.dataset.recordNum = recordNum;
	recordEntry.dataset.orderType = orderType;
	if (combined) {
		recordEntry.dataset.combined = 'true';
	}
	else {
		recordEntry.removeAttribute('data-combined');
	}

	// Add the record entry to the page
	recordEntries.appendChild(document.importNode(recordTemplate, true));

	// Load item details from database
	if (getItems) loadItemDetails(store, recordNum, recordEntries.lastElementChild.querySelector('.record-items tbody'));

	
	// Cancellation box
	var orderCancelItems = document.getElementById('order-cancel-items');
	if (!getItems && orderCancelItems) {
		// Remove existing entries
		while (orderCancelItems.firstChild) {
			orderCancelItems.removeChild(orderCancelItems.firstChild);
		}

		// Add new entries
		for (let i = 0; i < rowData.Items.length; i++) {
			// Create input
			let input = document.createElement('input');
			let inputID = 'oci'+(i+1);
			input.type = 'checkbox';
			input.checked = true;
			input.id = inputID;
			input.name = 'oci';
			input.value = rowData.Items[i].ItemTitle;
			input.dataset.itemNum = rowData.Items[i].ItemNum;
			input.dataset.itemTitle = rowData.Items[i].ItemTitle;

			// Create label
			let label = document.createElement('label');
			label.setAttribute('for', inputID);
			label.textContent = rowData.Items[i].ItemTitle;

			orderCancelItems.appendChild(input);
			orderCancelItems.appendChild(label);
		}
	}

	if($('.alternative-item-show').length) {
		$('.alternative-item-show').unbind('click');
		$('.alternative-item-show').on('click', function(e){
			e.preventDefault();
			$(this).hide();
			$(this).parent().find('.alternative-item-content').removeClass('hide');
		})
	}

	if(page.tab == PAGE_TAB.ALTERNATIVE) {
		$('.order-cancel-done').hide();
		$('.order-mark-confirm').show();
	} else {
		$('.order-cancel-done').show();
		$('.order-mark-confirm').hide();
	}	
}

// Delete a record
function deleteRecord(store, num) {
	var saleRecordStore = saleRecords[store];
	if (saleRecordStore) {
		delete saleRecordStore.records[num];
		delete saleRecordStore.today[num];
		
		let connectedRecords = saleRecordStore.connected[num];
		if (connectedRecords) {
			for (let cr_i = 0; cr_i < connectedRecords.length; cr_i++) {
				if (connectedRecords[cr_i][0] == store && connectedRecords[cr_i][1] == num) continue;

				// Delete the current record from it's connected records' lists of connected records
				let connectedConnectedRecords = saleRecords[connectedRecords[cr_i][0]].connected[connectedRecords[cr_i][1]];
				for (let ccr_i = 0; ccr_i < connectedConnectedRecords.length; ccr_i++) {
					if (connectedConnectedRecords[ccr_i] && connectedConnectedRecords[ccr_i][0] == store && connectedConnectedRecords[ccr_i][1] == num) {
						saleRecords[connectedRecords[cr_i][0]].connected[connectedRecords[cr_i][1]].splice(ccr_i, 1);
					}
				}
			}
		}

		// Delete the current record's connected records list
		delete saleRecordStore.connected[num];
	}
}


function changeButtonStatus(recordBtns, orderType) {
	var orderTypeParcel = [ORDER_TYPE.AUSPOST, ORDER_TYPE.FASTWAY, ORDER_TYPE.FLATPACK, ORDER_TYPE.PARCEL, ORDER_TYPE.FASTWAYFLATPACK, ORDER_TYPE.FASTWAYFLATPACK1KG, ORDER_TYPE.FASTWAYFLATPACK5KG];
	var orderTypeFP = [ORDER_TYPE.AUSPOST, ORDER_TYPE.FASTWAY, ORDER_TYPE.FLATPACK, ORDER_TYPE.PARCEL, ORDER_TYPE.FASTWAYFLATPACK, ORDER_TYPE.FASTWAYFLATPACK1KG, ORDER_TYPE.FASTWAYFLATPACK5KG];

	for (let recordBtn of recordBtns) {
		let recordBtnType = ORDER_TYPE_DATASET[recordBtn.dataset.type];
		/*if (recordBtn.dataset.type == 'markfp') {
			recordBtnType = 'markfp';
		}*/
		if (orderType == '*' || (orderType == ORDER_TYPE.INTERNATIONAL && recordBtnType == ORDER_TYPE.INTERNATIONAL)
			|| (orderType == ORDER_TYPE.EXPRESS && recordBtnType == ORDER_TYPE.EXPRESS)
			|| (orderTypeParcel.includes(orderType) && orderTypeParcel.includes(recordBtnType))
			|| (orderType == ORDER_TYPE.FLATPACK && orderTypeFP.includes(recordBtnType))) {     //|| ([ORDER_TYPE.AUSPOST, ORDER_TYPE.FASTWAY].includes(orderType) && recordBtnType == "markfp")
			recordBtn.disabled = false;
			recordBtn.classList.remove('hide');
		}
		else {
			recordBtn.disabled = true;
			recordBtn.classList.add('hide');
		}
	}
}

function changeScanStatus(store, recordNum, scanAction, scanStatusEl = null) {
	var scanStatusBox = scanStatusEl || document.querySelector('#record-entries .record-entry[data-store="'+store+'"][data-record-num="'+recordNum+'"] .record-items .scan-status');
	var scanWaitingBox = scanStatusBox.querySelector('.scan-waiting'), scanDoneBox = scanStatusBox.querySelector('.scan-done');
	if (scanAction == SCAN_ACTIONS.WAITING || scanAction == SCAN_ACTIONS.DONE) {
		var scanDone = (scanAction == SCAN_ACTIONS.DONE);
		scanWaitingBox.classList[scanDone ? 'add' : 'remove']('hide');
		scanDoneBox.classList[scanDone ? 'remove' : 'add']('hide');
	}
	else if (scanAction == SCAN_ACTIONS.WAITING_FLASH) {
		// Flash the scan waiting box
		var recordDataToday = saleRecords[store].today[recordNum];
		scanWaitingBox.classList.add('flash');

		// Remove the flash after 3 seconds
		if (recordDataToday.ScanTimer) clearTimeout(recordDataToday.ScanTimer);
		recordDataToday.ScanTimer = setTimeout(function() {
			scanWaitingBox.classList.remove('flash');
			recordDataToday.ScanTimer = null;
		}, 2400);
	}
}

function checkOrderCategory(store, recordNum) {
	if (!saleRecords.hasOwnProperty(store) || !saleRecords[store].records.hasOwnProperty(recordNum)) return;
	var connectedRecords = saleRecords[store].connected[recordNum];
	var orderCategory = {};

	// Check for category symbol in each order item for all of the connected orders
	for (var cr_i = 0; cr_i < connectedRecords.length; cr_i++) {
		var connectedRecord = connectedRecords[cr_i];
		var connectedRowData = saleRecords[connectedRecord[0]].records[connectedRecord[1]];
		var connectedRowDataToday = saleRecords[connectedRecord[0]].today[connectedRecord[1]];
		if (!connectedRowData) continue;
		if (!connectedRowData) continue;

		// Check if each item has a category symbol
		for (var i = 0; i < connectedRowData.Items.length; i++) {
			/*if (connectedRowData.Items[i].ItemTitle[0] == mnbSymbol || connectedRowData.Items[i].ItemTitle[2] == mnbSymbol) {*/
			if (page.type == PAGE_TYPE.AWAITINGLIST) {
				 if ((!connectedRowDataToday.Tracking || connectedRowDataToday.Tracking == '[]' || connectedRowDataToday.Tracking == '["No services available for this Suburb / Postcode"]') && connectedRowDataToday.OrderType != 3) {
				 	 orderCategory[ORDER_DATA.NOTRACKING] = true;
				 	 continue;
				 }
				 
			} 

			if (connectedRowDataToday.OrderStatus == 13 && page.type == PAGE_TYPE.RTS) {
				orderCategory[ORDER_DATA.RTS] = true;
				continue;
			}

			if (connectedRowDataToday.OrderStatus == 14 && page.type == PAGE_TYPE.RTS) {
				orderCategory[ORDER_DATA.DAMAGEDRTS] = true;
				continue;
			}

			if (connectedRowDataToday.OrderStatus == 16 && page.type == PAGE_TYPE.REFUNDS) {
				orderCategory[ORDER_DATA.ALTERNATIVE] = true;
				continue;
			}

			if (connectedRowDataToday.OrderStatus == 5 && page.type == PAGE_TYPE.REFUNDS) {
				orderCategory[ORDER_DATA.PENDINGREFUND] = true;
				continue;
			}

			if (connectedRowDataToday.OrderStatus == 7 && page.type == PAGE_TYPE.REFUNDS) {
				orderCategory[ORDER_DATA.REFUNDDONE] = true;
				continue;
			}

			if (connectedRowDataToday.partialrefund == 1 && page.type == PAGE_TYPE.REFUNDS) {
				orderCategory[ORDER_DATA.PARTIALREFUND] = true;
			}

			if (connectedRowDataToday.DailyOrder && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.DO] = true;
			} 
			if (connectedRowDataToday.FGB && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.FGB] = true;
			} 
			if (connectedRowDataToday.MORLIFE && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.MORLIFE] = true;
			} 
			if (connectedRowDataToday.SPWAREHOUSE && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.SPWAREHOUSE] = true;
			} 
			if (connectedRowDataToday.ORBIT && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.ORBIT] = true;
			}
			if (connectedRowDataToday.WV && page.type != PAGE_TYPE.AWAITINGLIST){
				orderCategory[ORDER_DATA.WV] = true;
			}
			if (connectedRowDataToday.SCHOLASTIC && page.type != PAGE_TYPE.AWAITINGLIST){
				orderCategory[ORDER_DATA.SCHOLASTIC] = true;
			}
			if (connectedRowDataToday.KORIMCO && page.type != PAGE_TYPE.AWAITINGLIST){
				orderCategory[ORDER_DATA.KORIMCO] = true;
			}
			if (connectedRowDataToday.HYCLOR && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.HYCLOR] = true;
			}
			if (connectedRowDataToday.SPLOSH && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.SPLOSH] = true;
			}
			if (connectedRowDataToday.SIGMA && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.SIGMA] = true;
			}
			if (connectedRowDataToday.MISC && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.MISC] = true;
			}
			if (connectedRowDataToday.INTERTRADING) {
				orderCategory[ORDER_DATA.INTERTRADING] = true;
			}
			if (connectedRowDataToday.FACTORY) {
				orderCategory[ORDER_DATA.FACTORY] = true;	
			} 
			// if (connectedRowDataToday.SIXPACK && page.type != PAGE_TYPE.AWAITINGLIST) {
			// 	orderCategory[ORDER_DATA.SIXPACK] = true;
			// } 
			// if (connectedRowDataToday.TENPACK && page.type != PAGE_TYPE.AWAITINGLIST) {
			// 	orderCategory[ORDER_DATA.TENPACK] = true;	
			// }
			// if (connectedRowDataToday.TWENTYPACK && page.type != PAGE_TYPE.AWAITINGLIST) {
			// 	orderCategory[ORDER_DATA.TWENTYPACK] = true;	
			// }
			// if (connectedRowDataToday.THIRTYPACK && page.type != PAGE_TYPE.AWAITINGLIST) {
			// 	orderCategory[ORDER_DATA.THIRTYPACK] = true;	
			// }
			// if (connectedRowDataToday.SIXTYPACK && page.type != PAGE_TYPE.AWAITINGLIST) {
			// 	orderCategory[ORDER_DATA.SIXTYPACK] = true;					
			// }
			// if (connectedRowDataToday.GUCCI && page.type != PAGE_TYPE.AWAITINGLIST) {
			// 	orderCategory[ORDER_DATA.GUCCI] = true;	
			// } 
			if (connectedRowDataToday.KOBAYASHI && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.KOBAYASHI] = true;	
			} 
			if (connectedRowDataToday.TPROLLS && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.TPROLLS] = true;	
			} 
			if (store == 41 && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.AMAZON] = true;
			}
			if (store == 51 && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.MAGENTO] = true;
			}
			if (store == 2 && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.SOS] = true;
			}
			if (store == 7 && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.KOBAYASHI] = true;
			}
			if (store == 8 || store == 71) {
				orderCategory[ORDER_DATA.HOBBYCO] = true;
			}
			if (store == 61 && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.CHARLICHAIR] = true;
			}
			if ((store == 31 || store == 32 || store == 33 || store == 34) && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.CG] = true;
			}
			if (store == 5 && page.type != PAGE_TYPE.AWAITINGLIST) {
				orderCategory[ORDER_DATA.MICROSOFT] = true;
			}/*else if (store == 6) {
				orderCategory = ORDER_DATA.SPWAREHOUSE;
			}*/ 
			
			let item = connectedRowData.Items[i];
			if (item.ItemNum) {
				if (itemDetails[item.ItemNum]) {
					let itemDatas = itemDetails[item.ItemNum];
					for (let itemData of itemDatas) {
						if (itemData.sku == item.SKU) {
							if (itemData.vr && page.type != PAGE_TYPE.AWAITINGLIST) {
								orderCategory[ORDER_DATA.VR] = true;
							}
							if (itemData.factory  && store == 4) {
								orderCategory[ORDER_DATA.FACTORY] = true;
							}
							if (!itemData.factory && store == 4) {
								orderCategory[ORDER_DATA.INTERTRADING] = true;
							}
							if (itemData.costco && page.type != PAGE_TYPE.AWAITINGLIST) {
								orderCategory[ORDER_DATA.COSTCO] = true;
							}
							
							/*if (itemData.fgb) {
								orderCategory[ORDER_DATA.FGB] = true;
							}
							if (itemData.morlife) {
								orderCategory[ORDER_DATA.MORLIFE] = true;
							}
							if (itemData.spwarehouse) {
								orderCategory[ORDER_DATA.SPWAREHOUSE] = true;
							}
							if (itemData.orbit) {
								orderCategory[ORDER_DATA.ORBIT] = true;
							}
							if(itemData.wv){
								orderCategory[ORDER_DATA.WV] = true;
							}
							if(itemData.scholastic){
								orderCategory[ORDER_DATA.SCHOLASTIC] = true;
							}
							if(itemData.korimco){
								orderCategory[ORDER_DATA.KORIMCO] = true;
							}
							if(itemData.hyclor) {
								orderCategory[ORDER_DATA.HYCLOR] = true;
							}
							if(itemData.splosh) {
								orderCategory[ORDER_DATA.SPLOSH] = true;
							}*/
							/*if(item.SKU.startsWith('SI-') && page.type != PAGE_TYPE.AWAITINGLIST) {
								orderCategory[ORDER_DATA.SIGMA] = true;
							}*/
							/*if(itemData.misc) {
								orderCategory[ORDER_DATA.MISC] = true;
							}
							if(itemData.intertrading) {
								orderCategory[ORDER_DATA.INTERTRADING] = true;
							}
							if(itemData.factory) {
								orderCategory[ORDER_DATA.FACTORY] = true;
							}
							if(itemData.sixpack) {
								orderCategory[ORDER_DATA.SIXPACK] = true;
							}
							if(itemData.tenpack) {
								orderCategory[ORDER_DATA.TENPACK] = true;
							}
							if(itemData.twentypack) {
								orderCategory[ORDER_DATA.TWENTYPACK] = true;
							}
							if(itemData.thirtypack) {
								orderCategory[ORDER_DATA.THIRTYPACK] = true;
							}
							if(itemData.sixtypack) {
								orderCategory[ORDER_DATA.SIXTYPACK] = true;
							}
							if(itemData.gucci) {
								orderCategory[ORDER_DATA.GUCCI] = true;
							}*/
						}
					}

				}
			} else if (item.SKU) {
				if (itemDetails[item.SKU]) {
					let itemDatas = itemDetails[item.SKU];
					for (let itemData of itemDatas) {
						if (itemData.name == item.ItemTitle) {
							if (itemData.vr && page.type != PAGE_TYPE.AWAITINGLIST) {
								orderCategory[ORDER_DATA.VR] = true;
							}
							if (itemData.factory  && store == 4) {
								orderCategory[ORDER_DATA.FACTORY] = true;
							}
							if (!itemData.factory && store == 4) {
								orderCategory[ORDER_DATA.INTERTRADING] = true;
							}
							if (itemData.costco && page.type != PAGE_TYPE.AWAITINGLIST) {
								orderCategory[ORDER_DATA.COSTCO] = true;
							}
							
							/*if (itemData.fgb) {
								orderCategory[ORDER_DATA.FGB] = true;
							}
							if (itemData.morlife) {
								orderCategory[ORDER_DATA.MORLIFE] = true;
							}
							if (itemData.spwarehouse) {
								orderCategory[ORDER_DATA.SPWAREHOUSE] = true;
							}
							if (itemData.orbit) {
								orderCategory[ORDER_DATA.ORBIT] = true;
							}
							if(itemData.wv){
								orderCategory[ORDER_DATA.WV] = true;
							}
							if(itemData.scholastic){
								orderCategory[ORDER_DATA.SCHOLASTIC] = true;
							}
							if(itemData.korimco){
								orderCategory[ORDER_DATA.KORIMCO] = true;
							}
							if(itemData.hyclor) {
								orderCategory[ORDER_DATA.HYCLOR] = true;
							}
							if(itemData.splosh) {
								orderCategory[ORDER_DATA.SPLOSH] = true;
							}*/
							/*if(item.SKU.startsWith('SI-') && page.type != PAGE_TYPE.AWAITINGLIST) {
								orderCategory[ORDER_DATA.SIGMA] = true;
							}*/
							/*if(itemData.misc) {
								orderCategory[ORDER_DATA.MISC] = true;
							}
							if(itemData.intertrading) {
								orderCategory[ORDER_DATA.INTERTRADING] = true;
							}
							if(itemData.factory) {
								orderCategory[ORDER_DATA.FACTORY] = true;
							}
							if(itemData.sixpack) {
								orderCategory[ORDER_DATA.SIXPACK] = true;
							}
							if(itemData.tenpack) {
								orderCategory[ORDER_DATA.TENPACK] = true;
							}
							if(itemData.twentypack) {
								orderCategory[ORDER_DATA.TWENTYPACK] = true;
							}
							if(itemData.thirtypack) {
								orderCategory[ORDER_DATA.THIRTYPACK] = true;
							}
							if(itemData.sixtypack) {
								orderCategory[ORDER_DATA.SIXTYPACK] = true;
							}
							if(itemData.gucci) {
								orderCategory[ORDER_DATA.GUCCI] = true;
							}*/
						}
					}

				}
			}
			
		}
	}

	return orderCategory;
}

// Get selected record's order info e.g. order type
function getRecordOrderInfo(store, recordNum) {
	if (!saleRecords.hasOwnProperty(store) || !saleRecords[store].records.hasOwnProperty(recordNum)) return;
	var rowData = saleRecords[store].records[recordNum];
	var rowDataToday = saleRecords[store].today[recordNum];
	var connectedRecords = saleRecords[store].connected[recordNum];
	var info = {OrderType: null};
	var flatpacked = false;
	var rowUpdated = false;
	var vr = false;
	var fwfp = false;
	var factory = false;
	var costco = false;
	var fwfp1kg = false;
	var spwarehouse = false;
	var orbit = false;
	var wv = false;
	var scholastic = false;
	var korimco = false;
	var hyclor = false;
	var splosh = false;
	var sigma = false;
	var misc = false;
	var intertrading = false;
	var factory = false;
	var notracking = false;
	var rts = false;
	var damrts = false;
	// var sixpack = false;
	// var tenpack = false;
	// var twentypack = false;
	// var thirtypack = false;
	// var sixtypack = false;
	// var gucci = false;
	var kobayashi = false;
	var pendingrefund = false;
	var refunddone = false;
	var partialrefund = false;
	var tprolls = false;
	var alternative = false;

	// Update order details using data from the database
	if (rowDataToday.constructor === Object) {
		//console.log(recordNum);
		info.OrderType = rowDataToday.OrderType;
		rowData.OrderType = rowDataToday.OrderType;
		rowData.OrderStatus = rowDataToday.OrderStatus;
		rowUpdated = true;
	}

	if ((!rowDataToday.Tracking || rowDataToday.Tracking == '[]' || rowDataToday.Tracking == '["No services available for this Suburb / Postcode"]') && rowDataToday.OrderType != 3) {
		notracking = true;
	}

	if (rowDataToday.OrderStatus == 13) {
		rts = true;
	}

	if (rowDataToday.OrderStatus == 14) {
		damrts = true;
	}

	if (rowDataToday.OrderStatus == 5) {
		pendingrefund = true;
	}

	if (rowDataToday.OrderStatus == 7) {
		refunddone = true;
	}

	if (rowDataToday.partialrefund == 1) {
		partialrefund = true;
	}

	if (rowDataToday.OrderStatus == 16) {
		alternative = true;
	}

	if (!rowUpdated || !info.OrderType) {
		// Check postage service
		let postServiceValue = rowData.PostService ? rowData.PostService.toLowerCase() : '';
		let privateFieldValue = rowData.PrivateField ? rowData.PrivateField.toLowerCase() : '';
		//if (postServiceValue.includes('international') || privateFieldValue.includes('international')) {
		if (rowData.BuyerCountry && !rowData.BuyerCountry.toLowerCase().includes(homeCountry.name) && rowData.BuyerCountry.toLowerCase() != homeCountry.code) {
			info.OrderType = ORDER_TYPE.INTERNATIONAL;
		}
		else if (postServiceValue.includes('express') || privateFieldValue.includes('express')) {
			info.OrderType = ORDER_TYPE.EXPRESS;
		}
	}

	for (let cr_i = 0; cr_i < connectedRecords.length; cr_i++) {
		let connectedRecord = connectedRecords[cr_i];
		let connectedRowData = saleRecords[connectedRecord[0]].records[connectedRecord[1]];
		if (!connectedRowData) continue;

		//if (recordNum==68717) console.log(connectedRowData.Items);
		for (let connectedRowItem of connectedRowData.Items) {
			if (connectedRowItem.ItemNum && itemDetails[connectedRowItem.ItemNum]) {
				for (let entry of itemDetails[connectedRowItem.ItemNum]) {
					if (entry.vr) {
						vr = true;
					}

					if (connectedRowItem.SKU && connectedRowItem.SKU == entry.sku) {
						if (entry.fwfp) fwfp = entry.fwfp;
						if (entry.factory) factory = entry.factory;
						if (entry.costco) costco = entry.costco;
						//if (connectedRowItem.SKU.startsWith('SI-')) sigma = true;
						// if (entry.fgb) fgb = entry.fgb;
						// if (entry.morlife) morlife = entry.morlife;
						break;
					} else if (connectedRowItem.ItemTitle && connectedRowItem.ItemTitle == entry.name) {
						if (entry.fwfp) fwfp = entry.fwfp;
						if (entry.factory) factory = entry.factory;
						if (entry.costco) costco = entry.costco;
						// if (entry.fgb) fgb = entry.fgb;
						// if (entry.morlife) morlife = entry.morlife;
						break;
					}

				}
			}else if (connectedRowItem.SKU && itemDetails[connectedRowItem.SKU]) {
				for (let entry of itemDetails[connectedRowItem.SKU]) {
					if (connectedRowItem.ItemTitle && connectedRowItem.ItemTitle == entry.name) {
						if (entry.fwfp) fwfp = entry.fwfp;
						if (entry.factory) factory = entry.factory;
						if (entry.costco) costco = entry.costco;
						// if (entry.fgb) fgb = entry.fgb;
						// if (entry.morlife) morlife = entry.morlife;
						break;
					}
				}
			}

		}

	}

	if (vr && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.VR] = true;
	}

	if (rowDataToday.DailyOrder && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.DO] = true;
	}

	if (rowDataToday.FGB && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.FGB] = true;
	}

	if (rowDataToday.MORLIFE && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.MORLIFE] = true;
	}

	if (rowDataToday.SPWAREHOUSE && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.SPWAREHOUSE] = true;
	}

	if (rowDataToday.ORBIT && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.ORBIT] = true;
	}

	if (rowDataToday.WV && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.WV] = true;
	}

	if(rowDataToday.SCHOLASTIC && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.SCHOLASTIC] = true;
	}

	if(rowDataToday.KORIMCO && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.KORIMCO] = true;
	}

	if(rowDataToday.HYCLOR && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.HYCLOR] = true;
	}

	if(rowDataToday.SPLOSH && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.SPLOSH] = true;
	}

	if(rowDataToday.SIGMA && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.SIGMA] = true;
	}

	if(rowDataToday.MISC && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.MISC] = true;
	}

	if(rowDataToday.INTERTRADING && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.AWAITINGLIST)) {
		info[ORDER_DATA.INTERTRADING] = true;
	}

	if(rowDataToday.FACTORY && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.AWAITINGLIST)) {
		info[ORDER_DATA.FACTORY] = true;
	}

	// if(rowDataToday.SIXPACK && page.type == PAGE_TYPE.COLLECT) {
	// 	info[ORDER_DATA.SIXPACK] = true;
	// }

	// if(rowDataToday.TENPACK && page.type == PAGE_TYPE.COLLECT) {
	// 	info[ORDER_DATA.TENPACK] = true;
	// }

	// if(rowDataToday.TWENTYPACK && page.type == PAGE_TYPE.COLLECT) {
	// 	info[ORDER_DATA.TWENTYPACK] = true;
	// }

	// if(rowDataToday.THIRTYPACK && page.type == PAGE_TYPE.COLLECT) {
	// 	info[ORDER_DATA.THIRTYPACK] = true;
	// }

	// if(rowDataToday.SIXTYPACK && page.type == PAGE_TYPE.COLLECT) {
	// 	info[ORDER_DATA.SIXTYPACK] = true;
	// }

	// if(rowDataToday.GUCCI && page.type == PAGE_TYPE.COLLECT) {
	// 	info[ORDER_DATA.GUCCI] = true;
	// }

	if(rowDataToday.KOBAYASHI && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.KOBAYASHI] = true;
	}

	if (rowDataToday.TPROLLS && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED)) {
		info[ORDER_DATA.TPROLLS] = true;
	}

	if ((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 11 || store == 12)) {
		// MNB
		info[ORDER_DATA.MNB] = true;
	}
	if ((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && store == 51) {
		// MNB
		info[ORDER_DATA.MAGENTO] = true;
	}

	if ((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 31 || store == 32 || store == 33 || store == 34)) {
		info[ORDER_DATA.CG] = true;
	}

	if ((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && store == 2 ) {
		info[ORDER_DATA.SOS] = true;
	}

	if ((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && store == 7 ) {
		info[ORDER_DATA.KOBAYASHI] = true;
	}

	if ((page.type == PAGE_TYPE.COLLECT  || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.AWAITINGLIST) && (store == 8 || store == 71) ) {
		info[ORDER_DATA.HOBBYCO] = true;
	}

	if ((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && store == 41) {
		info[ORDER_DATA.AMAZON] = true;
	}

	if ((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && store == 61) {
		info[ORDER_DATA.CHARLICHAIR] = true;
	}

	if ((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && store == 5) {
		info[ORDER_DATA.MICROSOFT] = true;
	}

	/*if (page.type == PAGE_TYPE.COLLECT && store == 6 ) {
		info[ORDER_DATA.SPWAREHOUSE] = true;
	}*/

	if ((page.type == PAGE_TYPE.COLLECT  || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.AWAITINGLIST) && store == 4 && !factory) {
		info[ORDER_DATA.INTERTRADING] = true;
	}

	if ((page.type == PAGE_TYPE.COLLECT  || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.AWAITINGLIST) && store == 4 && factory) {
		info[ORDER_DATA.FACTORY] = true;
	}

	if ((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 1 || store == 6) && costco) {
		info[ORDER_DATA.COSTCO] = true;
	}

	if ((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 1 || store == 6) && spwarehouse ) {
		info[ORDER_DATA.SPWAREHOUSE] = true;
	}

	if ((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 1 || store == 6) && orbit ) {
		info[ORDER_DATA.ORBIT] = true;
	}

	if((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 1 || store == 6) && wv) {
		info[ORDER_DATA.WV]  = true;
	}

	if((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 1 || store == 6) && scholastic){
		info[ORDER_DATA.SCHOLASTIC] = true;
	}
	
	if((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 1 || store == 6) && korimco){
		info[ORDER_DATA.KORIMCO] = true;
	}

	if((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 1 || store == 6) && hyclor) {
		info[ORDER_DATA.HYCLOR] = true;
	}

	if((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 1 || store == 6) && splosh) {
		info[ORDER_DATA.SPLOSH] = true;
	}

	if((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 1 || store == 6 || store == 51) && sigma) {
		info[ORDER_DATA.SIGMA] = true;
	}

	if((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 1 || store == 6) && misc) {
		info[ORDER_DATA.MISC] = true;
	}

	if((page.type == PAGE_TYPE.COLLECT  || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.AWAITINGLIST) && (store == 1 || store == 4 || store == 51) && intertrading) {
		info[ORDER_DATA.INTERTRADING] = true;
	}

	if((page.type == PAGE_TYPE.COLLECT  || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.AWAITINGLIST) && (store == 1 || store == 4 || store == 51) && factory) {
		info[ORDER_DATA.FACTORY] = true;
	}

	// if(page.type == PAGE_TYPE.COLLECT && (store == 1 || store == 6 || store == 51) && sixpack) {
	// 	info[ORDER_DATA.SIXPACK] = true;
	// }

	// if(page.type == PAGE_TYPE.COLLECT && (store == 1 || store == 6 || store == 51) && tenpack) {
	// 	info[ORDER_DATA.TENPACK] = true;
	// }

	// if(page.type == PAGE_TYPE.COLLECT && (store == 1 || store == 6 || store == 51) && twentypack) {
	// 	info[ORDER_DATA.TWENTYPACK] = true;
	// }

	// if(page.type == PAGE_TYPE.COLLECT && (store == 1 || store == 6 || store == 51) && thirtypack) {
	// 	info[ORDER_DATA.THIRTYPACK] = true;
	// }

	// if(page.type == PAGE_TYPE.COLLECT && (store == 1 || store == 6 || store == 51) && sixtypack) {
	// 	info[ORDER_DATA.SIXTYPACK] = true;
	// }

	// if(page.type == PAGE_TYPE.COLLECT && (store == 1 || store == 6 || store == 51) && gucci) {
	// 	info[ORDER_DATA.GUCCI] = true;
	// }

	if((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 1 || store == 6 || store == 51) && kobayashi) {
		info[ORDER_DATA.KOBAYASHI] = true;
	}

	if((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) && (store == 1 || store == 6 || store == 51) && tprolls) {
		info[ORDER_DATA.TPROLLS] = true;
	}
	
	if(page.type == PAGE_TYPE.AWAITINGLIST && notracking) {
		info[ORDER_DATA.NOTRACKING] = true;
	}

	if (page.type == PAGE_TYPE.RTS && rts) {
		info[ORDER_DATA.RTS] = true;
	}
	if (page.type == PAGE_TYPE.RTS && damrts) {
		info[ORDER_DATA.DAMAGEDRTS] = true;
	}

	if (page.type == PAGE_TYPE.REFUNDS && pendingrefund){
		info[ORDER_DATA.PENDINGREFUND] = true;
	}
	if (page.type == PAGE_TYPE.REFUNDS && refunddone){
		info[ORDER_DATA.REFUNDDONE] = true;
	}
	if (page.type == PAGE_TYPE.REFUNDS && partialrefund){
		info[ORDER_DATA.PARTIALREFUND] = true;
	}
	if (page.type == PAGE_TYPE.REFUNDS && alternative){
		info[ORDER_DATA.ALTERNATIVE] = true;
	}

	// Check the total price and whether to flat-pack each item for all of the connected orders
	if (info.OrderType === null) {
		let totalWeight = 0, totalPrice = 0, flatpackSet = false;

		getRecordOrderType_CRLoop:
		for (let cr_i = 0; cr_i < connectedRecords.length; cr_i++) {
			let connectedRecord = connectedRecords[cr_i];
			let connectedRowData = saleRecords[connectedRecord[0]].records[connectedRecord[1]];
			if (!connectedRowData) continue;

			totalPrice += parseFloat(connectedRowData.TotalPrice);

			// Check if each item is to be flat-packed
			for (let connectedRowItem of connectedRowData.Items) {
				/*if (page.type == PAGE_TYPE.COLLECT && (connectedRowItem.ItemTitle[0] == mnbSymbol || connectedRowItem.ItemTitle[2] == mnbSymbol)) {*/
				/*if (page.type == PAGE_TYPE.COLLECT && (store == 11 || store == 12)) {
					// MNB
					info[ORDER_DATA.MNB] = true;
				}*/

				//if (fpSymbols.hasOwnProperty(connectedRowItem.ItemTitle[0])) {
				
				if (connectedRowItem.ItemNum && itemDetails[connectedRowItem.ItemNum]) {
					let isFlatpack = false;
					for (let entry of itemDetails[connectedRowItem.ItemNum]) {
						if (entry.sku == connectedRowItem.SKU && entry.flatpack) {
							// Flat-pack
							isFlatpack = true;
							break;
						}
					}

					if (isFlatpack) {
						flatpackSet = true;
					}
					else {
						flatpackSet = false;
						break getRecordOrderType_CRLoop;
					}
				}
				else {
					flatpackSet = false;
					break getRecordOrderType_CRLoop;
				}

				// Weight
				let itemEntries = itemDetails[connectedRowItem.SKU];
				let itemEntriesIN = itemDetails[connectedRowItem.ItemNum];
				if (itemEntries) {
					// All entries should have the same quantity and weight
					totalWeight += itemEntries[0].weight * connectedRowItem.Quantity;
				}
				else if (itemEntriesIN) {
					let itemName = connectedRowItem.ItemTitle.trim();

					// Remove any flat pack symbols
					for (let fpSymbol in fpSymbols) {
						if (itemName[0] == fpSymbol) {
							itemName = itemName.substring(1).trim();
						}
					}

					for (let item of itemEntriesIN) {
						let itemDetailName = item.name.trim();

						// Remove any flat pack symbols
						for (let fpSymbol in fpSymbols) {
							if (itemDetailName[0] == fpSymbol) {
								itemDetailName = itemDetailName.substring(1).trim();
							}
						}

						if (itemName == itemDetailName) {
							totalWeight += item.weight * connectedRowItem.Quantity;
							break;
						}
					}
				}
			}
		}

		/*console.log('totalPrice: '+ totalPrice);
		console.log('totalWeight: '+ totalWeight);*/

		if ((totalPrice < 99 || isNaN(totalPrice))  && totalWeight <= 1500  && flatpackSet) {
			// Flat-packed
			flatpacked = true;
		}
	}
	else if (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.AWAITINGLIST) {
		// Check for category symbol in each order item for all of the connected orders
		let orderCategorys = checkOrderCategory(store, recordNum);
		if (orderCategorys) {
			for (let orderCategory in orderCategorys) {
				info[orderCategory] = true;
			}
		}
	}

	// Postage service
	if (info.OrderType === null) {
		if (flatpacked || info.OrderType == ORDER_TYPE.FLATPACK) {
			info.OrderType = ORDER_TYPE.FLATPACK;
		}
		else if (info.OrderType != ORDER_TYPE.EXPRESS) {
			let fastway;
			//console.log(rowData.BuyerCity);
			if (!rowUpdated || !info.OrderType) {
				// Check if the postcode and suburb are in the TSS range
				fastway = false;
				if (tssData.hasOwnProperty(rowData.BuyerPostCode)) {
					let buyerCity = rowData.BuyerCity.toLowerCase();
					for (let i = 0; i < tssSuburbs.length; i++) {
						if (buyerCity.includes(tssSuburbs[i])) {
							fastway = true;
							break;
						}
					}
					//console.log(buyerCity);
					fastway = true;
				}

				// Check if the destination is a PO Box, parcel locker, locked bag or post office
				if (fastway) {
					let address = rowData.BuyerFullName+' '+rowData.BuyerAddress1+' '+rowData.BuyerAddress2;
					let regexes = [rePOBox, reParcelLocker, reLockedBag, rePostOffice];
					for (let re of regexes) {
						if (re.test(address)) {
							//console.log(address + ": " + re );
							fastway = false;
							break;
						}
					}
				}

				// Change Fastway orders that are in the Australia Post brown list into Australia Post
				/*if (fastway && APBrownPostcodes.hasOwnProperty(parseInt(rowData.BuyerPostCode, 10))) {
					fastway = false;
				}*/
			}
			else {
				//console.log(rowData.BuyerCity);
				fastway = (rowData.OrderType == ORDER_TYPE.FASTWAY || info.OrderType == ORDER_TYPE.FASTWAY);
			}

			for (let name of auspostCustomers) {
				if (name.toLowerCase() == rowData.BuyerFullName.toLowerCase()) {
					fastway = false;
					break;
				}
			}

			if (fastway) {
				// Fastway Couriers
				info.OrderType = ORDER_TYPE.FASTWAY;
				/*if (fastwayMetroCodes.includes(rowData.BuyerPostCode)) {
					info.OrderType = ORDER_TYPE.FASTWAYFLATPACK;
				}*/
				if (fwfp && page.type == PAGE_TYPE.COLLECT) {
					if (fwfp == '0.3') {
						info.OrderType = ORDER_TYPE.FASTWAYFLATPACK;
					} else if (fwfp == '1') {
						info.OrderType = ORDER_TYPE.FASTWAYFLATPACK1KG;
					} else if (fwfp == '5+') {
						info.OrderType = ORDER_TYPE.FASTWAYFLATPACK5KG;
					} 
					
				}
			}
			else {
				// Australia Post
				info.OrderType = ORDER_TYPE.AUSPOST;
			}
		}
	}

	return info;
}

// Get record list for order type
function getRecordsOfType(storeID, type = null, sort = false, connectedRecordsTogether = false, morelabel) {
	// Create list of records
	var recordList = [];
	var combinedGroupStores = ['31','32','33','34'];

	if (storeID == 'tp') {
		for (let store of ['1','51']) {
			var saleRecordStore = saleRecords[store];
			if (!saleRecordStore || !saleRecordStore.today) continue;
			var recordNums = Object.keys(saleRecordStore.today).sort(); // Record numbers sorted in order

			for (var num = 0; num < recordNums.length; num++) {
				// Check order type if specified
				var rowDataToday = saleRecordStore.today[recordNums[num]];
				if (type && rowDataToday.OrderType != type) continue; // Skip record

				let rowData = saleRecordStore.records[recordNums[num]];
				let items = rowData.Items;
				let tp = false;
				for (let item of items) {
					let sku = item.SKU.toLowerCase();
					if (sku.includes('quilton') || sku.includes('0-823003n') || sku.includes('0-810300n')) tp = true;
				}
				if (!tp) continue;

				// Add store and record number to the record list
				recordList.push([store, recordNums[num], rowDataToday.OrderType]);
				/*if (rowDataToday.morelabel>1) {
					for (let i=0; i<rowDataToday.morelabel-1; i++) {
						recordList.push([store, recordNums[num], rowDataToday.OrderType]);
					}
				}*/
			}
		}
	} else {
		for (var store in stores) {
			
			if (storeID != 'all' && storeID != store && storeID != 30) continue;
			if (!combinedGroupStores.includes(store) && storeID == 30) continue;
			
			var saleRecordStore = saleRecords[store];
			if (!saleRecordStore || !saleRecordStore.today) continue;
			var recordNums = Object.keys(saleRecordStore.today).sort(); // Record numbers sorted in order

			for (var num = 0; num < recordNums.length; num++) {
				// Check order type if specified
				//var rowData = saleRecordStore.today[recordNums[num]];
				var rowDataToday = saleRecordStore.today[recordNums[num]];
				if (type && rowDataToday.OrderType != type) continue; // Skip record

				// Add store and record number to the record list
				recordList.push([store, recordNums[num], rowDataToday.OrderType]);
				/*if (rowDataToday.morelabel>1) {
					for (let i=0; i<rowDataToday.morelabel-1; i++) {
						recordList.push([store, recordNums[num], rowDataToday.OrderType]);
					}
				}*/
			}
		}
	}
		

	// Sort records
	if (sort.constructor === Object) {

		//if (sort.date) recordList = sortRecordsByDate(recordList, 'asc');
		if (sort.brands) recordList = sortRecordsByBrand(recordList, brands);
		if (sort.type) recordList = sortRecordsByType(recordList, [ORDER_TYPE.FASTWAY, ORDER_TYPE.AUSPOST]);
		if (sort.group) recordList = sortRecordsByGroup(recordList);
	}
	else if (sort) {
		recordList = sortRecordsByBrand(recordList, brands);
		recordList = sortRecordsByType(recordList, [ORDER_TYPE.FASTWAY, ORDER_TYPE.AUSPOST]);
		recordList = sortRecordsByGroup(recordList);
		recordList = sortRecordsByBay(recordList);
	}

	// Place the connected records together one after the other if needed
	if (connectedRecordsTogether) {
		var newRecordList = [];
		var connectedRecordsDone = [];

		for (var num = 0; num < recordList.length; num++) {
			if (recordList[num] === undefined) continue;
			var store = recordList[num][0], recordNum = recordList[num][1];
			var connectedRecords = saleRecords[store].connected[recordNum];

			// Skip connected records that are already done
			var skipRecord = false;
			for (var co_i = 0; co_i < connectedRecordsDone.length; co_i++) {
				if (connectedRecordsDone[co_i][0] == store && connectedRecordsDone[co_i][1] == recordNum) {
					skipRecord = true;
					break;
				}
			}
			if (skipRecord) continue;

			// Add any connected records to the done list
			if (connectedRecords.length > 1) {
				Array.prototype.push.apply(connectedRecordsDone, connectedRecords);
			}

			// Place the connected records together one after the other
			for (var co_i = 0; co_i < connectedRecords.length; co_i++) {
				var connectedRecord = connectedRecords[co_i];
				var connectedRowDataToday = saleRecords[connectedRecord[0]].today[connectedRecord[1]];
				if (type && connectedRowDataToday.OrderType != type) continue; // Skip record

				newRecordList.push([connectedRecord[0], connectedRecord[1], connectedRowDataToday.OrderType]);
			}
		}

		recordList = newRecordList;
	}

	return recordList;
}

// Get variation details
function getVariationDetails(item) {
	let itemTitleValue = item.Parts ? item.ItemTitle.trim() + ' (Bundle ' + item.Parts + ')' : item.ItemTitle.trim();
	let itemVariation = itemTitleValue.match(reVariation);
	let variationDetails = {
		itemNameFull: itemTitleValue,
		itemName: itemVariation ? itemTitleValue.replace(itemVariation[0], '') : itemTitleValue,
		variations: null,
	};

	// Get variation names and values
	let variationData = null;
	if (item.VariationDetails) {
		variationData = item.VariationDetails;
	}
	else if (itemVariation) {
		variationData = itemVariation[0];
	}

	if (variationData && typeof variationData == 'string') {
		let parts = variationData.replace(/\[|\]/g, '').split(',');
		let entries = [];

		for (let part of parts) {
			let lastColon = part.lastIndexOf(':');
			entries.push({
				name: part.substr(0, lastColon),
				value: part.substr(lastColon + 1)
			});
		}
		if (entries.length) variationDetails.variations = entries;
	}

	return variationDetails;
}

// Show done screen
function showDoneScreen() {
	var recordEntries = document.querySelector('#record-entries');
	var recordTemplate = document.querySelector('#record-done-template').content;
	var img = recordTemplate.querySelector('img');

	// Set the action verb
	var pageAction = PAGE_INFO[page.type].action;
	if (pageAction) recordTemplate.querySelector('.action').textContent = pageAction;

	// Add random image to the done screen
	var imgData = weightedRandom(doneScreenImages);
	if (imgData) {
		if (imgData[1]) {
			img.setAttribute('title', imgData[1]);
		}
		else {
			img.removeAttribute('title');
		}
		img.setAttribute('src', imgData[0]);
	}
	else {
		img.removeAttribute('src');
		img.removeAttribute('title');
	}

	// Add the record entry to the page
	toggleGroups(false);
	recordEntries.appendChild(document.importNode(recordTemplate, true));
	recordEntries.classList.add('done');
}

function toggleGroups(show) {
	var recordGroup = document.getElementById('record-group');
	if (recordGroup) recordGroup.classList[show ? 'remove' : 'add']('hide');
}

function getRepeatCustomerRecordList(recordList, repeat) {
	// Process repeat customers
	let newRecordList = recordList;
	let recordListRepeat = [];
	let recordListNonRepeat = [];
	for (let record of recordList) {
		let store = record[0], recordID = record[1];
		if (repeatCustomersToday[store]) {
			if (!repeatCustomersToday[store][recordID]) {
				recordListNonRepeat.push(record);
			}else if (repeatCustomersToday[store][recordID]) {
				recordListRepeat.push(record);
			}
		}else{
			recordListNonRepeat.push(record);
		}	
	}

	if (repeat==0) {
		newRecordList = recordListNonRepeat;
	}else if (repeat==1) {
		newRecordList = recordListRepeat;
	}

	return newRecordList;
}

function showAlternativeItemContent() {
	$(this).hide();
	$(this).parent().find('.alternative-item-content').removeClass('hide');
}

export {showOrders, deleteRecord, changeScanStatus, checkOrderCategory, getRecordOrderInfo, getRecordsOfType, getVariationDetails, showDoneScreen, getRepeatCustomerRecordList};
