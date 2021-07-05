//  Discount Chemist
//  Order System

import './config.js';
import {createInvoice} from './create-invoice.js';
import {createLabelPDF} from './create-label-pdf.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, addListener, removeListener, checkLogin} from '/common/tools.js';

// Temporary
/*window.SKIN_AUSTRALIA = 3;
stores[SKIN_AUSTRALIA] = {
	id: 'skinaustralia',
	name: 'Skin Australia',
	storeID: 'SA',
	recID: 'SA-',
	filename: 'skinaus',
	hasProductFields: false,
};*/

export function num(){
	return 2;
}

window.page = {
	type: null,
	els: {
		username: null,
	},
	notification: new NotificationBar({positionFixed: true}),
	user: {
		id: '',
		username: '',
		firstname: '',
		lastname: '',
		type: '',
		supplier: '',
	},
	userToken: localStorage.getItem('usertoken') || '',
	local: window.location.hostname.startsWith('192.168'),
	transactions: {},
}

window.loadedRecordData = null;
window.selectedRecordData = null;
window.selectedRecord = null;
window.countryCodes = {};

window.EMAIL_INVOICE = 'invoice';
window.EMAIL_TRACKING = 'tracking';

window.reDigits = /^\d+$/;

if (page.local) {
	apiServer = apiServerLocal;
}


document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	// Page type
	var pageTypeName = document.getElementById('container');
	if (pageTypeName) pageTypeName = pageTypeName.dataset.pageType;

	for (let pageType in PAGE_TYPE) {
		if (PAGE_INFO[PAGE_TYPE[pageType]].name == pageTypeName) {
			page.type = PAGE_TYPE[pageType];
			break;
		}
	}

	if (!page.type) {
		console.log('Error: Invalid page type', {hide: false});
		return;
	}

	switch (page.type) {
		case PAGE_TYPE.MANAGE:
			let loginSuccess = false;
			if (page.userToken) {
				// Check login
				let formData = new FormData();

				let response = await fetch(apiServer+'users/login', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (response.ok && data.result == 'success') { //&& data.user.type == USER_TYPE.ADMIN
					loginSuccess = true;
					page.user = data.user;
					document.getElementById('username').textContent = page.user.firstname ;
					// + (page.user.lastname ? ' '+page.user.lastname : '');
				}
			}

			if (!loginSuccess) {
				// Not logged in
				window.location.href = '/';
				return;
			}

			loadStoreLists();
			loadCountryCodes(); // Load country code data
			break;
	}

	let button = document.querySelector('#li-pendingorders');
    let supplier = window.page.user.supplier;
    
    if (button.classList.contains(SUPPLIER_INFO[supplier].id)) {
        button.classList.remove('hide');
    } else {
        button.classList.add('hide');
    }
      
    let button2 = document.querySelector('#li-packorders');
    let supplier2 = window.page.user.supplier;
    
    if (button2.classList.contains(SUPPLIER_INFO[supplier2].id)) {
        button2.classList.remove('hide');
    } else {
        button2.classList.add('hide');
    }

    let button3 = document.querySelector('#li-manageinventory');
    let supplier3 = window.page.user.supplier;
    
    if (button3.classList.contains(SUPPLIER_INFO[supplier3].id)) {
        button3.classList.remove('hide');
    } else {
        button3.classList.add('hide');
    }
	
	var pageInfo = PAGE_INFO[page.type];

	// Title, header
	document.title = pageInfo.title;
	var header = document.getElementById('header'), headerTitle = header.querySelector('.title');
	headerTitle.textContent = pageInfo.heading || pageInfo.title;
	if (pageInfo.position) {
		headerTitle.classList.add(pageInfo.position);
	}

	// Header colour
	if (window.location.hostname.startsWith('local.')) {
		document.getElementById('header').classList.add('local');
	}

	if (page.user.type == USER_TYPE['USER']) {
		let btns = document.querySelectorAll('#record-details .action-btn, #record-details-btns .action-btn');
		for (let btn of btns) {
			btn.disabled = true;
		}
	}

	document.getElementById('record-logout').addEventListener('click', function() {
		localStorage.removeItem('username');
		localStorage.removeItem('usertoken');
		window.location.href = '/';
	});

	document.getElementById('back-to-menu').addEventListener('click', function() {
		window.location.href = '/client/index.html';
	}, false);

	// Ability to press enter to get the record
	document.getElementById('record-num-input').addEventListener('keyup', function(e) {
		if (e.key == 'Enter' || e.key == '↵') {
			loadRecord('record');
		}
	});

	document.getElementById('record-load-dbid').addEventListener('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		loadRecord('dbid');
	});

	document.getElementById('record-load-record').addEventListener('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		loadRecord('record');
	});

	document.getElementById('record-load-buyerid').addEventListener('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		loadRecord('buyerid');
	});

	document.getElementById('record-load-orderid').addEventListener('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		loadRecord('orderid');
	});

	document.getElementById('record-combined-list').addEventListener('click', function(e) {
		if (!e.target.dataset.id) return;
		e.preventDefault();
		e.stopPropagation();

		for (let record of loadedRecordData) {
			if (record.DatabaseID == e.target.dataset.id) {
				showRecord(record);
				break;
			}
		}
	});

	document.getElementById('manage-replaceStock').addEventListener('click', function() {
		// console.log('11');
		showReplacementItemBox();
	});

	document.getElementById('manage-alternativeStock').addEventListener('click', function() {
		// console.log('11');
		showAlternativeItemBox();
	});

	document.getElementById('record-buyer-save').addEventListener('click', saveBuyerDetails);

	// Mark order as changed
	addListener('#record-buyer-details tbody td', 'input', function(e) {
		if (e.target.innerHTML == '<br>') e.target.textContent = ''; // Remove empty line if needed
		e.target.closest('table').dataset.changed = 1;
	});


	addListener('#manage-reset, #manage-close', 'click', function(e) {
		window.location.reload();
	});

	document.getElementById('manage-save').addEventListener('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		saveRecord();
	});


	// Create label details
	document.getElementById('manage-create-label').addEventListener('click', function() {
		manageCreateLabel();
	});

	//logs
	document.getElementById('order-logs').addEventListener('click', function() {
		// console.log('11');
		showOrderTransLogs();
	});

	async function manageCreateLabel() {
		var order = JSON.parse(JSON.stringify(selectedRecord));
		order.SenderDetails = Object.assign(Object.assign({}, storeAddress), {
			name: stores[selectedRecord.StoreID].name,
			storeID: selectedRecord.StoreID
		});

		var labelPDF = await createLabelPDF([order]);
		saveAs(labelPDF.docStream.toBlob('application/pdf'), 'label-'+order.DatabaseID.toString()+'.pdf', true);
		//window.open(labelPDF.docStream.toBlobURL('application/pdf'));
	}

	// Copy to excel customer support
	document.getElementById('manage-copy-excel-customer-support').addEventListener('click', function() {
		var items = [];
		for (let item of selectedRecord.Items) {
			items.push(item.ItemTitle);
		}

		var data = [selectedRecord.UserID, selectedRecord.BuyerFullName, '', '', '', items.join(', '), '', selectedRecord.DatabaseID.toString()+(selectedRecordData.Packer ? ' / '+selectedRecordData.Packer : '')];
		copyToClipboard(data.join('\t'));
		page.notification.show('Order info has been copied to the clipboard.', {background: 'bg-lgreen'});
	});

	// Tracking details
	document.getElementById('manage-open-tracking').addEventListener('click', function(e) {
		var trackingNum = document.getElementById('record-tracking').value.trim().split('\n').slice(-1)[0];
		if (!trackingNum) {
			page.notification.show('Tracking number is blank.');
			return;
		}

		var trackingUrl = null;
		if (trackingNum.startsWith('NZ') || trackingNum.startsWith('IZ') || trackingNum.startsWith('BN') || trackingNum.startsWith('MP') || trackingNum.startsWith('QX') || trackingNum.startsWith('QC')) {
			// Fastway Couriers
			trackingUrl = 'https://www.fastway.com.au/tools/track/?l='+trackingNum;
		}
		else if (trackingNum.startsWith('CH') || trackingNum.startsWith('ET') || trackingNum.startsWith('LH')) {
			// 17track
			trackingUrl = 'https://t.17track.net/#nums='+trackingNum;
		}
		else {
			// Australia Post
			trackingUrl = 'https://auspost.com.au/parcels-mail/track.html#/track?id='+trackingNum;
		}
		window.open(trackingUrl, '_blank');
	});


	// Open invoice/tracking box
	addListener('#manage-send-invoice, #manage-send-tracking', 'click', function(e) {
		var type;
		if (this.id == 'manage-send-invoice') {
			type = EMAIL_INVOICE;
		}
		else if (this.id == 'manage-send-tracking') {
			type = EMAIL_TRACKING;
			var orderType = document.getElementById('record-type');
			orderType = orderType.options[orderType.selectedIndex].value;
			if (orderType == '-1') {
				page.notification.show("Cannot send tracking information for order type 'blank'.");
				return;
			}

			if (!document.getElementById('record-tracking').value) {
				page.notification.show('Please enter a tracking number before sending the tracking information.');
				return;
			}
		}
		else {
			return false;
		}

		showConfirmBox(type);
	});

	function showConfirmBox(type) {
		var text;
		if (type == EMAIL_INVOICE) {
			text = 'Are you sure you want to send a tax invoice to '+selectedRecord.Email+'?';
		}
		else if (type == EMAIL_TRACKING) {
			text = 'Are you sure you want to send order tracking information to '+selectedRecord.Email+'?';
		}

		var sendInvoiceBox = document.getElementById('send-invoice-box');
		var title = document.getElementById('send-invoice-text');
		sendInvoiceBox.dataset.type = type;
		title.textContent = text;
		title.classList.remove('green', 'red');
		document.getElementById('box-outer').classList.add('flex');
		document.getElementById('send-invoice-send').disabled = false;
		sendInvoiceBox.classList.remove('hide');
	}


	// Save invoice
	document.getElementById('manage-save-invoice').addEventListener('click', function() {
		saveInvoice();
	});

	function saveInvoice() {
		var senderDetails = Object.assign(Object.assign({}, invoiceSenderAddress), {name: stores[1].name, storeID: stores[1].storeID});
		createInvoice(selectedRecord, senderDetails, true, document.getElementById('record-show-abn').checked);
	}


	// Send invoice
	document.getElementById('send-invoice-send').addEventListener('click', async function() {
		this.disabled = true;
		var sendInvoiceBox = document.getElementById('send-invoice-box');
		var emailType = sendInvoiceBox.dataset.type;
		var senderDetails = Object.assign(Object.assign({}, invoiceSenderAddress), {name: stores[1].name, storeID: stores[1].storeID});
		var invoiceBlob = await createInvoice(selectedRecord, senderDetails, false, document.getElementById('record-show-abn').checked);
		var orderType = document.getElementById('record-type');
		orderType = orderType.options[orderType.selectedIndex].value;

		// Upload PDF
		let formData = new FormData();
		formData.append('type', emailType);
		formData.append('recipients', JSON.stringify([{
			name: selectedRecord.BuyerFullName.trim(),
			email: selectedRecord.Email.trim(),
			store: selectedRecord.StoreID,
			order: selectedRecord.DatabaseID,
			courier: ORDER_TYPE_NAME[orderType],
			trackingNum: document.getElementById('record-tracking').value.trim().split('\n').slice(-1)[0],
		}]));
		if (emailType == EMAIL_INVOICE) formData.append('pdf', invoiceBlob, 'invoice-'+selectedRecord.DatabaseID.toString()+'.pdf');

		try {
			let response = await fetch(apiServer+'email-sender', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
			let data = await response.json();
	
			if (response.ok && data.result == 'success') {
				let title = document.getElementById('send-invoice-text');
				title.classList.remove('red');
				title.classList.add('green');
				if (emailType == EMAIL_INVOICE) {
					title.textContent = 'Tax invoice sent to '+selectedRecord.Email;
				}
				else if (emailType == EMAIL_TRACKING) {
					title.textContent = 'Tracking information sent to '+selectedRecord.Email;
				}
			}
			else {
				let title = document.getElementById('send-invoice-text');
				title.classList.remove('green');
				title.classList.add('red');
				if (emailType == EMAIL_INVOICE) {
					title.textContent = 'Tax invoice could not be sent. Please try again.';
				}
				else if (emailType == EMAIL_TRACKING) {
					title.textContent = 'Tracking information could not be sent. Please try again.';
				}
				document.getElementById('send-invoice-send').disabled = false;
			}
		}
		catch (e) {
			page.notification.show('Error: Could not connect to the server.');
		}
	});

	// Cancel invoice
	document.getElementById('send-invoice-cancel').addEventListener('click', closeBox);


	// Close popup box
	addListener('#box-container .close', 'click', closeBox);

	// Don't close the popup box when it's clicked
	addListener('#box-container > div', 'click mousedown', function(e) {
		e.stopPropagation();
	});
});


// Load the list of stores
function loadStoreLists() {
	var itemEl, optionEl, items;

	// Stores
	itemEl = document.getElementById('record-store-input'), items = Object.keys(stores);
	for (let item of items) {
		if (['3','21','30','34'].includes(item)) continue;
		let supplierStores = SUPPLIER_INFO[page.user.supplier].stores;
		if (supplierStores && !supplierStores.includes(item)) continue;
		optionEl = document.createElement('option');
		optionEl.value = item;
		optionEl.textContent = stores[item].name;
		itemEl.appendChild(optionEl);
	}

	// Order type
	itemEl = document.getElementById('record-type'), items = Object.keys(ORDER_TYPE_NAME).sort();
	optionEl = document.createElement('option');
	optionEl.value = -1;
	optionEl.textContent = 'Blank';
	optionEl.selected = true;
	itemEl.appendChild(optionEl);

	for (let item of items) {
		optionEl = document.createElement('option');
		optionEl.value = item;
		optionEl.textContent = ORDER_TYPE_NAME[item];
		itemEl.appendChild(optionEl);
	}

	// Order status
	itemEl = document.getElementById('record-status'), items = Object.keys(ORDER_STATUS_NAME).sort();
	optionEl = document.createElement('option');
	optionEl.value = -1;
	optionEl.textContent = 'Blank';
	optionEl.selected = true;
	itemEl.appendChild(optionEl);

	for (let item of items) {
		optionEl = document.createElement('option');
		optionEl.value = item;
		optionEl.textContent = ORDER_STATUS_NAME[item];
		itemEl.appendChild(optionEl);
	}
}

// Load country code data
async function loadCountryCodes() {
	try {
		countryCodes = await (await fetch('country-codes-2.json')).json();
	}
	catch (e) {
		page.notification.show('Error: Could not load country code data.', {hide: false});
	}
}


// Load a specific record from the database
async function loadRecord(recordNumType) {
	var store = document.getElementById('record-store-input');
	store = store.options[store.selectedIndex].value;

	var recordNum = document.getElementById('record-num-input').value;
	if (!recordNum) return;
	recordNum = recordNum.trim();

	// Check store and record number
	if (recordNum && recordNumType != 'orderid') {
		let dashIndex = recordNum.indexOf('-');
		if (dashIndex != -1) {
			// Record parts - [store, record number]
			let recordParts = [recordNum.slice(0, dashIndex), recordNum.slice(dashIndex + 1)];

			if (reDigits.test(recordParts[0])) {
				// Database ID
				store = recordParts[0];
				recordNum = recordParts[1];
				recordNumType = 'dbid';
			}
			else {
				// Record number
				let inputStore = recordParts[0].toLowerCase();
				for (let id in stores) {
					if (stores[id].storeID.toLowerCase() == inputStore) {
						store = id;
						recordNum = recordParts[1];
						recordNumType = 'record';
						break;
					}
				}
			}
		}
	}

	var responseData = null;

	try {
		let response = await fetch(apiServer+'orders/manage?'+(recordNumType == 'dbid' ? 'id=' : (recordNumType == 'record' ? 'record=' : (recordNumType == 'buyerid' ? 'buyerid=' : 'orderid=')))+recordNum+'&store='+store, {headers: {'DC-Access-Token': page.userToken}});
		responseData = await response.json(response);

		if (!response.ok) {
			page.notification.show(responseData.result);
			return;
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	var searchedDBID = responseData.records[0].DatabaseID;
	var searchedRecordIndex = null;

	// Sort records
	responseData.records.sort((a, b) => b.DatabaseID - a.DatabaseID);

	// Clear combined records list
	var recordCombinedList = document.getElementById('record-combined-list');
	while (recordCombinedList.firstChild && !recordCombinedList.firstChild.remove());

	// Add all database IDs to the combined records list
	for (let i = 0; i < responseData.records.length; i++) {
		let record = responseData.records[i];
		let div = document.createElement('div');
		div.textContent = 'DB ID '+record.DatabaseID;
		div.dataset.id = record.DatabaseID;
		recordCombinedList.appendChild(div);
		if (record.DatabaseID == searchedDBID) searchedRecordIndex = i;
	}

	// Load order details
	loadedRecordData = responseData.records;

	// Set record store
	document.querySelector('#record-store-input [value="'+loadedRecordData[searchedRecordIndex].StoreID+'"]').selected = true;

	showRecord(loadedRecordData[searchedRecordIndex]);
}

function showRecord(record) {
	// Order data
	selectedRecordData = record;
	selectedRecord = selectedRecordData.RecordData;
	selectedRecord.StoreID = selectedRecordData.StoreID;
	// Select order entry
	var recordCombinedList = document.querySelector('#record-combined-list div.selected');
	if (recordCombinedList) recordCombinedList.classList.remove('selected');
	document.querySelector('#record-combined-list div[data-id="'+record.DatabaseID+'"]').classList.add('selected');

	// Load order details
	var recordBuyerDetails = document.getElementById('record-buyer-details');
	recordBuyerDetails.dataset.id = record.DatabaseID;
	recordBuyerDetails.removeAttribute('data-changed');
	
	recordBuyerDetails.querySelector('.buyer-name').textContent = record.Buyer.FullName || '';
	recordBuyerDetails.querySelector('.buyer-address1').textContent = record.Buyer.AddressLine1 || '';
	recordBuyerDetails.querySelector('.buyer-address2').textContent = record.Buyer.AddressLine2 || '';
	recordBuyerDetails.querySelector('.buyer-city').textContent = record.Buyer.City || '';
	recordBuyerDetails.querySelector('.buyer-state').textContent = record.Buyer.State || '';
	recordBuyerDetails.querySelector('.buyer-postcode').textContent = record.Buyer.Postcode || '';
	recordBuyerDetails.querySelector('.buyer-country').textContent = record.Buyer.Country || '';
	recordBuyerDetails.querySelector('.buyer-phone').textContent = record.Buyer.Phone || '';
	recordBuyerDetails.querySelector('.record-delivery-note').textContent = record.Buyer.DeliveryNote || '';

	var timezone = (new Date()).toLocaleString(homeLocale, {timeZoneName:'short'}).split(' ').pop();
	document.getElementById('record-db-id').textContent = record.DatabaseID;

	var recordIDEl = document.getElementById('record-id');
	if (record.SalesRecordID) recordIDEl.textContent = record.SalesRecordID;
	recordIDEl.parentNode.classList[record.SalesRecordID ? 'remove' : 'add']('hide');

	document.getElementById('record-order-id').textContent = record.RecordNum;
	document.getElementById('record-buyer-id').textContent = typeof record.Buyer.ID == 'string' ? record.Buyer.ID.trim() : record.Buyer.ID;
	document.getElementById('buyer-email').textContent = record.RecordData.Email ? record.RecordData.Email.trim() : "";
	document.getElementById('record-order-purchase-date').textContent = record.RecordData.SaleDate;
	document.querySelector('#record-type option[value="'+(record.OrderType != null ? record.OrderType : '-1')+'"]').selected = true;
	document.querySelector('#record-status option[value="'+(record.OrderStatus != null ? record.OrderStatus : '-1')+'"]').selected = true;
	document.getElementById('record-collector').textContent = record.Collector || 'No one';
	document.getElementById('record-collected-time').textContent = record.Collected ? mysqlToDate(record.Collected).toLocaleString()+' '+timezone : 'N/A';
	document.getElementById('record-packer').textContent = record.Packer || 'No one';
	document.getElementById('record-packed-time').textContent = record.PackedTime ? mysqlToDate(record.PackedTime).toLocaleString()+' '+timezone : 'N/A';
	document.getElementById('record-notes').value = record.Notes || '';
	document.getElementById('record-tracking').value = record.TrackingID ? record.TrackingID.join('\n') : '';
	document.getElementById('record-groupnum').textContent = record.GroupID || '';
	document.getElementById('record-weight').textContent = record.Weight || '';
	document.getElementById('record-details').classList.remove('hide');
	document.getElementById('record-details-btns').classList.remove('hide');
	document.getElementById('send-invoice-send').disabled = false;
	document.getElementById('record-pre-packed-time').value = record.PackedData ? record.PackedData.join('\n') : '';

	// Create item table
	let cols = ['ItemNum', 'SKU', 'ItemTitle', 'Quantity', 'SalePrice'];
	let itemtbody =  document.querySelector('#itemTable tbody');
	while (itemtbody.firstChild) {
	    itemtbody.removeChild(itemtbody.firstChild);
	}
	for (let item of record.RecordData.Items) {
		let tr = document.createElement('tr');
		tr.dataset.lineitemid = item.LineItemID
		for (let col of cols) {
			let td = document.createElement('td');								
			if (col == 'SalePrice') {
				td.textContent = parseFloat(item[col]).toFixed(2);
			} else {
				td.textContent = item[col];
			}
			tr.appendChild(td);
		}
		itemtbody.appendChild(tr);
	}

	//alternative items table
	let cols1 = ['ItemNum', 'SKU', 'ItemTitle', 'Quantity', 'SalePrice', 'Alternative Item'];
	let alterItemtbody =  document.querySelector('#alterItemTable tbody');
	while (alterItemtbody.firstChild) {
	    alterItemtbody.removeChild(alterItemtbody.firstChild);

	}
		for (let items of record.RecordData.Items) {
			// console.log(items.AlterItem);
			let item = items.AlterItem;
			if (item) {
				document.querySelector('#alterItemTable').classList.remove('hide');
				let tr = document.createElement('tr');
				for (let col of cols1) {
					let td = document.createElement('td');

					if (col == 'ItemNum') {
						td.textContent = item.itemID;
					} 
					else if (col == 'SKU') {
						td.textContent = item.sku;
					} 
					else if (col == 'ItemTitle') {
						td.textContent = item.name;
					} 
					else if (col == 'Quantity') {
						td.textContent = item.quantity;
					} 
					else if (col == 'SalePrice') {
						td.textContent = parseFloat(item.price).toFixed(2);
					}
					else if (col == 'Alternative Item') {
						td.textContent = items.ItemTitle + ' SKU:'+  items.SKU + ' Qty:'+ items.Quantity;
					}
					
					tr.appendChild(td);
				}
				alterItemtbody.appendChild(tr);
			} 
			else {
				document.querySelector('#alterItemTable').classList.add('hide');
			}
		}

	//Replaced items table
	let cols2 = ['ItemNum', 'SKU', 'ItemTitle', 'Quantity', 'SalePrice'];
	let replaceItemtbody =  document.querySelector('#replaceItemTable tbody');
	while (replaceItemtbody.firstChild) {
	    replaceItemtbody.removeChild(replaceItemtbody.firstChild);

	}

	let hasReplacement = false;
	for (let items of record.RecordData.Items) {
		// console.log(items.AlterItem);
		let item = items.ReplacedItem;
		let lineitemid = items.LineItemID;
		if (lineitemid) {
			if (item) {
				hasReplacement = true;
				let tr = document.createElement('tr');
				for (let col of cols2) {
					let td = document.createElement('td');

					if (col == 'ItemNum') {
						td.textContent = item.itemID;
					} 
					else if (col == 'SKU') {
						td.textContent = item.sku;
					} 
					else if (col == 'ItemTitle') {
						td.textContent = item.name;
					} 
					else if (col == 'Quantity') {
						td.textContent = item.quantity;
					} 
					else if (col == 'SalePrice') {
						td.textContent = parseFloat(item.price).toFixed(2);
					}
					
					tr.appendChild(td);
				}
				replaceItemtbody.appendChild(tr);
			} 
		}
	}

	if (hasReplacement) {
		document.querySelector('#replaceItemTable').classList.remove('hide');
	} else {
		document.querySelector('#replaceItemTable').classList.add('hide');
	}

	//box table 
	let cols3 = ['boxNo', 'weight', 'tracking'];
	let boxTablebody = document.querySelector('#box-table tbody');
	while(boxTablebody.firstChild) {
		boxTablebody.removeChild(boxTablebody.firstChild);
	}

	if (record.boxDetails) {
		// console.log(record.boxDetails);
		for (let bd of JSON.parse(record.boxDetails)) {
			let tr = document.createElement('tr');
			// tr.dataset.boxDetails = bd;
			for (let col of cols3) {
				let td = document.createElement('td');
				
				if (col == 'boxNo') {
					td.textContent = bd[0];
					td.contentEditable = true;
					td.setAttribute('class','boxNo');  
				} else if (col == 'weight') {
					td.textContent = bd[1] + 'kg';
					td.contentEditable = true;
					td.setAttribute('class','weight');        
				} else if (col == 'tracking') {
					td.textContent = bd[2];
					td.contentEditable = true;
					td.setAttribute('class','tracking');        
				} 											
				tr.appendChild(td);
			}
			boxTablebody.appendChild(tr);
		}
	}
}

	async function showReplacementItemBox() {
		document.getElementById('box-outer').classList.add('flex');
	  	document.getElementById('item-replace-box').classList.remove('hide');

	  	let cols3 = ['check', 'store', 'ItemTitle', 'SKU', 'ItemNum', 'SalePrice', 'Quantity'];
	  	
	  	let replaceItemBox = document.querySelector('#item-replace-box');
	  	replaceItemBox.dataset.id = selectedRecord.DatabaseID;
	  	replaceItemBox.dataset.store = selectedRecord.StoreID;

	  	let replaceItemBoxtbody = document.querySelector('#item-replace-table-body');

	  	while(replaceItemBoxtbody.firstChild){
	  		replaceItemBoxtbody.removeChild(replaceItemBoxtbody.firstChild);
	  	}


	  	for (let item of selectedRecord.Items) {
	  			let tr = document.createElement('tr');
				tr.dataset.store = selectedRecord.StoreID;
				tr.dataset.name = item.ItemTitle;
				tr.dataset.sku = item.SKU;
	      		tr.dataset.itemNo = item.ItemNum;
	      		tr.dataset.lineitemid = item.LineItemID;
	      		tr.dataset.qty = item.Quantity;
	      		tr.dataset.price = item.SalePrice;
		        tr.dataset.replaceStore = selectedRecord.StoreID;
		        tr.dataset.replaceSku = item.SKU;
		        tr.dataset.replaceName = item.ItemTitle;
		        tr.dataset.replaceItemNo = item.ItemNum;
		        tr.dataset.replacePrice = item.SalePrice;
		        tr.dataset.replaceQty = item.Quantity;

				for (let col of cols3) {
					let td = document.createElement('td');	
					td.dataset.col = col;	
							// record.StoreID.name;					
					if (col  == 'store') {
						td.textContent = stores[selectedRecord.StoreID].name;
					} else if (col == 'check') {
						let input = document.createElement('input');
						td.className = 'selected';
					    input.type = 'checkbox';
					    input.autocomplete = 'off';
					    td.appendChild(input);
					}
				    else {
						td.textContent = item[col];
					}

					if (col  == 'Quantity') {
						td.contentEditable = true;
					}

					tr.appendChild(td);
				}
				replaceItemBoxtbody.appendChild(tr);
				
				
		}

		document.getElementById('replace-items-add-items').addEventListener('click', function() {
			addReplacementItems();
		});

		document.getElementById('replace-items-close').addEventListener('click', function () { 
			// console.log('11');
			closeReplaceItemBox();
		});

	}

	async function showAlternativeItemBox() {
		document.getElementById('box-outer').classList.add('flex');
	  	document.getElementById('item-alternative-box').classList.remove('hide');

	  	let cols3 = ['check','store', 'ItemTitle', 'SKU', 'ItemNum', 'SalePrice', 'Quantity'];

	  	let alternativeItemBoxtbody = document.querySelector('#item-alternative-table-body');
	  	let alterItemBox = document.querySelector('#item-alternative-box');
	  	alterItemBox.dataset.id = selectedRecord.DatabaseID;
	  	alterItemBox.dataset.store = selectedRecord.StoreID;

	  	while(alternativeItemBoxtbody.firstChild){
	  		alternativeItemBoxtbody.removeChild(alternativeItemBoxtbody.firstChild);
	  	}


	  	for (let item of selectedRecord.Items) {
			let tr = document.createElement('tr');
			tr.dataset.itemNo = item.ItemNum;
			tr.dataset.store = selectedRecord.StoreID;
			tr.dataset.name = item.ItemTitle;
		    tr.dataset.sku = item.SKU;
		    tr.dataset.price = item.SalePrice;
		    tr.dataset.qty = item.Quantity;
		    tr.dataset.lineitemid = item.LineItemID;

			for (let col of cols3) {
				let td = document.createElement('td');	
		
				if (col  == 'store') {
					td.textContent = stores[selectedRecord.StoreID].name;
				} else {
					td.textContent = item[col];
				}

				// if (col  == 'Quantity') {
				// 	td.contentEditable = true;
				// }

				if (col == 'check') {
					let input = document.createElement('input');
					td.className = 'selected';
				    input.type = 'checkbox';
				    input.autocomplete = 'off';
				    td.appendChild(input);
				}

				tr.appendChild(td);
			}
			alternativeItemBoxtbody.appendChild(tr);
		}

		let alterItemEl = document.getElementById('alternative-item-searchfield-stores'), items = Object.keys(stores);
		// for (let item of items) {
		// 	if (['3','21','30','34'].includes(item)) continue;
		// 	let supplierStores = SUPPLIER_INFO[page.user.supplier].stores;
		// 	if (supplierStores && !supplierStores.includes(item)) continue;
			let optionEl = document.createElement('option');
			optionEl.value = selectedRecord.StoreID;
			optionEl.textContent = stores[selectedRecord.StoreID].name;
			alterItemEl.appendChild(optionEl);
		// }
		document.querySelector('#alternative-item-searchbar input').value = '';
		let searchTableBody = document.querySelector('#alternative-items-search tbody');
	  	while (searchTableBody.firstChild) {
	    	searchTableBody.removeChild(searchTableBody.firstChild);
	  	}

	  	let selectTableBody = document.querySelector('#alternative-items-selected tbody');
	  	while (selectTableBody.firstChild) {
	    	selectTableBody.removeChild(selectTableBody.firstChild);
	  	}

		document.getElementById('alternative-item-search').addEventListener('click', async function() {
			// console.log('11');
			searchAlternativeItems();
		});

		document.getElementById('alternative-items-select-item').addEventListener('click', async function() {
			// console.log('11');
			selectAlternativeItem();
		});

		document.getElementById('alternative-items-close').addEventListener('click', function () { 
			// console.log('11');
			closeAlternativeItemBox();
		});

		document.getElementById('alternative-items-add-items').addEventListener('click', function() {
			addAlternativeItems();
		});

		document.getElementById('alternative-items-remove-items').addEventListener('click', function() {
			// console.log('11');
			removeAlternativeItems();
		});

  	}

// Close popup box
function closeAlternativeItemBox() {
	document.getElementById('box-outer').classList.remove('flex');
	setTimeout(function() {
		for (let el of document.querySelectorAll('#box-container > div:not(.close)')) {
			el.classList.add('hide');
		}
	}, 400);
}

function closeReplaceItemBox() {
	document.getElementById('box-outer').classList.remove('flex');
	setTimeout(function() {
		for (let el of document.querySelectorAll('#box-container > div:not(.close)')) {
			el.classList.add('hide');
		}
	}, 400);
}

function removeAlternativeItems() {
  let itemTableBody = document.querySelector('#alternative-items-selected tbody');
  let itemTrs = document.querySelectorAll('#alternative-items-selected tbody tr');

  if (itemTrs.length <= 0) {
    page.notification.show('Please select items.');
  } else {
    for (let tr_i = 0; tr_i < itemTrs.length; tr_i++) {
      let tr = itemTrs[tr_i];
      let selectedInput = tr.firstChild.querySelector('input');
      if (selectedInput && selectedInput.checked) {
        itemTableBody.removeChild(tr);
      } else {
        page.notification.show('Please select items.');
      }
    }
  }
}


async function searchAlternativeItems() {
	let name = '';
	let sku = '';
	let itemNo = '';

	var keywords = document.querySelector('#alternative-item-searchbar input').value.toLowerCase();
	if(keywords == '') {
		page.notification.show('Please fill up Item No, Name or SKU');
	} else {
		var field = document.querySelector('#alternative-item-searchbar input[name="alternative-item-searchfield"]:checked').value;
		// console.log(field);
		if (field == 'itemno') {
	    	itemNo = keywords;
	  	} else if (field == 'sku') {
	    	sku = keywords;
	  	} else if (field == 'itemname') {
	    	name = keywords;
	  	}

		var store =  document.querySelector('#alternative-item-searchfield-stores').value;
		let formData = new FormData();
		formData.append('store', store);
	  	formData.append('name', name);
	  	formData.append('sku', sku);
	  	formData.append('itemNo', itemNo);

	  	let cols = ['store','name','sku','itemNo','price'];
	  	let response = await fetch(apiServer + 'searchitem', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
	  	let itemData = await response.json();
	  	let searchTableBody = document.querySelector('#alternative-items-search tbody');
	  	while (searchTableBody.firstChild) {
	    	searchTableBody.removeChild(searchTableBody.firstChild);
	  	}

	  	if (response.ok && itemData.result == 'success') {
	  		let items = itemData.items;
		    for (let item of items) {
		      	let tr = document.createElement('tr');
		      	// tr.dataset.id = item.id;
		      	tr.dataset.store = item.store;
		      	tr.dataset.sku = item.sku;
		      	tr.dataset.name = item.name;
		      	tr.dataset.itemNo = item.num;
		      	tr.dataset.price = item.price;
		      
		      	let td = document.createElement('td'), input = document.createElement('input');
		      	td.className = 'selected';
		      	input.type = 'checkbox';
		      	input.autocomplete = 'off';
		      	td.appendChild(input);
		      	tr.appendChild(td);

		      	for (let col of cols) {
		        	let td = document.createElement('td');
		        	td.dataset.col = col;

		        	let text = '';
		        	switch (col) {
		          		case 'id':
		            	text = item.id;
		            	break;
		          	case 'sku':
		            	text = item.sku;
		            	break;
		          	case 'name':
		            	text = item.name;
		            	break;
		         	case 'itemNo':
		            	text = item.num;
		            	break;
		          	case 'store':
		            	text = stores[item.store].name;
		           		break;
		           	case 'price':
		           		text = item.price;
		           		break;
		          	default:
		            	text = '';
		        	}

			        td.textContent = text || '';
			        tr.appendChild(td);
			    }
		      	searchTableBody.appendChild(tr);
			}
		
			let itemTableSearchBody = $('#alternative-items-search');
			let inputCheckBox = itemTableSearchBody.find('input[type="checkbox"]');

			inputCheckBox.on('change', function(){
				if(this.checked) {
					inputCheckBox.prop('checked', false);
					$(this).prop('checked', true);
				}
			})
		}
	  	else {
	    	page.notification.show(itemData.result);
		}

	}	
}

function selectAlternativeItem() {
	let selectedItemTable = document.querySelector('#item-alternative-table tbody');
	let selectedItemTrs = selectedItemTable.querySelectorAll('tr');
	let selectedItem = undefined;
	console.log(selectedItemTrs);
	for (let tr_i=0; tr_i < selectedItemTrs.length; tr_i++) {
		let tr = selectedItemTrs[tr_i];
		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput && selectedInput.checked) {
			selectedItem = {
				lineitemid: tr.dataset.lineitemid,
				store: tr.dataset.store,
				sku: tr.dataset.sku,
				name: tr.dataset.name,
				itemNo: tr.dataset.itemNo,
				price: tr.dataset.price,
				quantity: tr.dataset.qty,
			}
		}
	}
	let searchTableBody = document.querySelector('#alternative-items-search tbody');
	let itemTableBody = document.querySelector('#alternative-items-selected tbody');
	let itemTrs = searchTableBody.querySelectorAll('tr');

	while (itemTableBody.firstChild) {
	    	itemTableBody.removeChild(itemTableBody.firstChild);
	  	}

	console.log(itemTrs);
	let cols = ['store', 'name', 'sku', 'itemNo', 'quantity', 'price', 'alternativeItem'];
	for (let tr_i = 0; tr_i < itemTrs.length; tr_i++) {
    	let tr = itemTrs[tr_i];
		let selectedInput = tr.firstChild.querySelector('input');
		if(selectedInput && selectedInput.checked && selectedItem !== undefined) {
			let alternativeItem = selectedItem.name + ' | Sku: ' + selectedItem.sku + (' | Item #: ' + selectedItem.itemNo );
      		let tr2 = document.createElement('tr');
      		tr2.dataset.store = tr.dataset.store;
      		tr2.dataset.name = tr.dataset.name;
      		tr2.dataset.sku = tr.dataset.sku;
      		tr2.dataset.itemNo = tr.dataset.itemNo;
      		tr2.dataset.lineitemid = selectedItem.lineitemid;
	        tr2.dataset.alterStore = selectedItem.store;
	        tr2.dataset.alterSku = selectedItem.sku;
	        tr2.dataset.alterName = selectedItem.name;
	        tr2.dataset.alterItemNo = selectedItem.itemNo;
	        tr2.dataset.alterPrice = selectedItem.price;
	        tr2.dataset.alterQty = selectedItem.quantity;
	        let td2 = document.createElement('td'), input2 = document.createElement('input');
            td2.className = 'selected';
            input2.type = 'checkbox';
            input2.autocomplete = 'off';
            td2.appendChild(input2);
            tr2.appendChild(td2);
            for (let col of cols) {
	            let td2 = document.createElement('td');
	            td2.dataset.col = col;
			    if (col == 'quantity') td2.contentEditable = true;
			    if (col == 'price') td2.contentEditable = true;
	            let text = '';
	            switch (col) {
	              	case 'sku':
	                	text = tr.dataset.sku;
	                	break;
	              	case 'name':
	                	text = tr.dataset.name;
	                	break;
	              	case 'itemNo':
	                	text = tr.dataset.itemNo;
	                	break;
	              	case 'store':
	                	text = stores[tr.dataset.store].name;
	                	break;
	              	case 'quantity':
	                	text = selectedItem.quantity;
				    	break;
			      	case 'price':
				    	text = tr.dataset.price;
				    	break;
			      case 'alternativeItem':
				    	text = alternativeItem;
				    	break;
	              	default:
	                	text = '';
	                	break;
	            }
				td2.textContent = text || '';
		        tr2.appendChild(td2);
		      }
	      itemTableBody.appendChild(tr2);
    } else {
		page.notification.show('Please select alternative item');
	}
  }
}

async function addAlternativeItems() {
	let alterItemBox = document.querySelector('#item-alternative-box');
	let recordID = alterItemBox.dataset.id;
	let storeID = alterItemBox.dataset.store;

	let send = true;
	try {

		let formData = new FormData();
		formData.append('store',storeID);
		formData.append('record',recordID);

		let items = [];
		let itemTrs = document.querySelector('#alternative-items-selected tbody').querySelectorAll('tr');

		if (itemTrs.length == 0) {
			send = false;
		}

		let hasQuantity = true;
		for (let itemTr of itemTrs) {
			let item = {};
			item.sku = itemTr.dataset.sku;
			item.itemNo = itemTr.dataset.itemNo;
			item.name = itemTr.dataset.name;
			item.store = itemTr.dataset.store;
			item.lineitemid = itemTr.dataset.lineitemid;
			let quantity =  itemTr.dataset.alterQty;
			let newQty = itemTr.querySelector('[data-col="quantity"]').textContent;
		
			if (newQty > quantity) {
				page.notification.show('Quantity cannot be more than ' + quantity + '..');
				return;
			}
			if (newQty == '' || isNaN(newQty) || newQty <=0) {
				hasQuantity =false;
			}
			item.quantity = newQty;

			let price = itemTr.querySelector('[data-col="price"]').textContent;
			/*if (price == '' || isNaN(price) || price <= 0) {
		    	hasQuantity = false;
		    }*/
		    item.price = price;
		    item.alterStore = itemTr.dataset.alterStore;
	        item.alterSku = itemTr.dataset.alterSku;
	        item.alterName = itemTr.dataset.alterName;
	        item.alterItemNo = itemTr.dataset.alterItemNo;
	        item.alterPrice = itemTr.dataset.alterPrice;
	        item.alterQty = itemTr.dataset.alterQty;

	        items.push(item);

			if (!hasQuantity) {
				send = false;
			}

			let transacs = [];
			let oldItemTitle = itemTr.dataset.alterName;
			let oldItemQty = itemTr.dataset.alterQty;
			let newItemTitle = itemTr.dataset.name;
			let newItemQty = newQty;

			let field = 'Alternative';
			let oldValue = ('Name: '+ oldItemTitle + ', ' + 'Qty: ' + oldItemQty);
			let newValue = ('Name: '+ newItemTitle + ', ' + 'Qty: ' + newItemQty);

			if (newValue != oldValue) {
				transacs.push({
					'field': field,
					'oldValue': oldValue,
					'newValue': newValue,
				})
			}

			console.log(transacs);

			formData.append('items', JSON.stringify(items));
			formData.append('transaction', JSON.stringify(transacs));

			if (!send) {
				page.notification.show('Please select item and input valid quantity.');
				return;
			} else {
				let alterItemTableBody = document.querySelector('#item-alternative-table tbody');
			    while (alterItemTableBody.firstChild) {
			        alterItemTableBody.removeChild(alterItemTableBody.firstChild);
			    }
			}
			 //console.log(formData.get('data'));
	        let response = await fetch(apiServer + 'order/updatealternativeitems', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
		    let addOrderData = await response.json();

		    if (response.ok && addOrderData.result == 'success') {
				closeAlternativeItemBox();

			 
		    	page.notification.show("This order has been successfully alternatived.");
		    }
		    else {
		    	page.notification.show(addOrderData.result);
		    }
		}
	} 
	catch (e) {
	    console.log(e);
	}
}

async function addReplacementItems () {
	// console.log('11');
	let replaceItemBox = document.querySelector('#item-replace-box');	
	let recordID = replaceItemBox.dataset.id;
	let storeID = replaceItemBox.dataset.store;
	let send = true;
	let replaceItemtbodyTrs = document.querySelectorAll('#item-replace-table-body tr');
	let items = [];

	if (replaceItemtbodyTrs.length == 0) {
		send = false;
	}

	try {

		let formData = new FormData();
		formData.append('store',storeID);
		formData.append('record',recordID);

		for (let tr_i = 0; tr_i < replaceItemtbodyTrs.length; tr_i++) {
			let tr = replaceItemtbodyTrs[tr_i];
			let selectedInput = tr.firstChild.querySelector('input');
			if (selectedInput && selectedInput.checked) {
				// console.log(selectedInput);
				let hasQuantity = true;

				let item = {};
				item.lineitemid = tr.dataset.lineitemid;
				// console.log(tr.dataset.lineitemid);
				item.store = tr.dataset.store;
				item.itemNo = tr.dataset.itemNo;
				item.sku = tr.dataset.sku;
				item.name = tr.dataset.name;
				item.price = tr.dataset.price;
				item.quantity = tr.dataset.qty;
			
				item.replaceStore = tr.dataset.replaceStore;
		        item.replaceSku = tr.dataset.replaceSku;
		        item.replaceName = tr.dataset.replaceName;
		        item.replaceItemNo = tr.dataset.replaceItemNo;
		        item.replacePrice = tr.dataset.replacePrice;

		        let quantity = tr.dataset.qty;
		        let newQty = tr.querySelector('[data-col="Quantity"]').textContent;

		        if (quantity < newQty) {
					page.notification.show('Quantity cannot be more than ' + quantity + '..');
					return;
				}
				else if (newQty == '' || isNaN(newQty) || newQty <=0) {
					hasQuantity = false;
				}

		        item.replaceQty = newQty;

		        items.push(item);


				if (!hasQuantity) {
					send = false;
				}

				let transacs = [];
				let oldItemTitle = tr.dataset.name;
				let oldItemQty = tr.dataset.qty;
				let newItemTitle = tr.dataset.replaceName;
				let newItemQty = newQty;

				let field = 'Replacement';
				let oldValue = ('Name: '+ oldItemTitle + ', ' + 'Qty: ' + oldItemQty);
				let newValue = ('Name: '+ newItemTitle + ', ' + 'Qty: ' + newItemQty);

				transacs.push({
					'field': field,
					'oldValue': oldValue,
					'newValue': newValue,
				})

				console.log(transacs);

				formData.append('items', JSON.stringify(items));
				formData.append('transaction', JSON.stringify(transacs));

				if (!send) {
					page.notification.show('Please select item and input valid quantity.');
					return;
				} else {
					let replaceItemTableBody = document.querySelector('#replaceItemTable tbody');
				    while (replaceItemTableBody.firstChild) {
				        replaceItemTableBody.removeChild(replaceItemTableBody.firstChild);
				    }
				}

				let response = await fetch(apiServer + 'order/updatereplacementitems', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
			    let addOrderData = await response.json();

			    if (response.ok && addOrderData.result == 'success') {
			    	// console.log(addOrderData.result);
					closeReplaceItemBox();
				 
			    	page.notification.show("This order has been successfully replaced.");
			    }
			    else {
			    	page.notification.show(addOrderData.result);
			    }

			}
			else {
				page.notification.show('PLease select replacememnt item..');
			}
		}
	}
	catch (e) {
	    console.log(e);
	}
}

async function saveBuyerDetails(e) {
	var recordBuyerDetails = document.getElementById('record-buyer-details');
	var recordBuyerSaveBtn = e.target;

	if (!recordBuyerDetails.dataset.changed) {
		page.notification.show('You have not made any changes to the buyer details.');
		return;
	}

	var buyer = {
		rowID: recordBuyerDetails.dataset.id,
		name: recordBuyerDetails.querySelector('.buyer-name').textContent,
		address1: recordBuyerDetails.querySelector('.buyer-address1').textContent,
		address2: recordBuyerDetails.querySelector('.buyer-address2').textContent,
		city: recordBuyerDetails.querySelector('.buyer-city').textContent,
		state: recordBuyerDetails.querySelector('.buyer-state').textContent,
		postcode: recordBuyerDetails.querySelector('.buyer-postcode').textContent,
		country: recordBuyerDetails.querySelector('.buyer-country').textContent,
		phone: recordBuyerDetails.querySelector('.buyer-phone').textContent,
		email: recordBuyerDetails.querySelector('#buyer-email').textContent,
		deliveryNote: recordBuyerDetails.querySelector('.record-delivery-note').textContent,
	};

	const buyerConvert = {
		//'rowID': 'OrderID',
		'name': 'FullName',
		'address1': 'AddressLine1',
		'address2': 'AddressLine2',
		'city': 'City',
		'state': 'State',
		'postcode': 'Postcode',
		'country': 'Country',
		'phone': 'Phone',
		'email': 'Email',
		'deliveryNote': 'DeliveryNote',
	}

	let oldBuyerData = selectedRecordData.Buyer;

	let transacs = [];

	for (let attr in buyer) {
		if (attr=='rowID') continue;
		let oldValue = oldBuyerData[buyerConvert[attr]];
		let newValue = buyer[attr];
		if (!oldValue && newValue=="") continue;
		if (newValue != oldValue){
			transacs.push({
				'field': attr,
				'oldValue': oldValue,
				'newValue': newValue,
			}) 
		}
	}
	console.log(transacs);

	recordBuyerSaveBtn.disabled = true;

	try {
		let formData = new FormData();
		formData.append('buyerinfo', JSON.stringify(buyer));
		formData.append('transaction', JSON.stringify(transacs));

		let response = await fetch(apiServer+'orders/manage/buyerinfo', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let data = await response.json();

		if (response.ok && data.result == 'success') {
			recordBuyerDetails.removeAttribute('data-changed');
			page.notification.show('Buyer details were updated in the database.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(data.result);
			//page.notification.show('Error: Something happened while trying to update the database.');
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	recordBuyerSaveBtn.disabled = false;
}

async function saveRecord() {

	let oldRecordData = selectedRecordData;
	// console.log(oldRecordData);

	var recordDBID = document.getElementById('record-buyer-details').dataset.id;
	var store = document.getElementById('record-store-input');
	store = store.options[store.selectedIndex].value;
	var recordNum = document.getElementById('record-num-input').value;
	var type = document.getElementById('record-type');
	type = type.options[type.selectedIndex].value;
	var statusCollected = document.getElementById('record-status');
	statusCollected = statusCollected.options[statusCollected.selectedIndex].value;
	var notes = document.getElementById('record-notes').value;
	console.log(notes);
	var tracking = document.getElementById('record-tracking').value;
	var group = document.getElementById('record-groupnum').textContent;
	var weight = document.getElementById('record-weight').textContent;


	var trs = document.querySelectorAll('#box-table tbody tr');
	let boxDetails = [];
	var boxNo, boxWeight, boxTracking;

    for(let tr of trs) {

        boxNo = tr.querySelector('.boxNo').textContent;
	    boxWeight = tr.querySelector('.weight').textContent.replace('kg','');
	    boxTracking = tr. querySelector('.tracking').textContent;

	    boxDetails.push([boxNo,boxWeight,boxTracking]);         
    }

    var recordData = {
		recordDBID: recordDBID,
		store: store,
		type: type,
		// status: ORDER_STATUS_NAME[statusCollected],
		status: statusCollected,
		notes: notes,
		tracking: tracking,
		group: group,
		weight: weight,
		boxDetails: JSON.stringify(boxDetails),  
	};

	const recordDataConvert = {
		'recordDBID': 'id',
		'type': 'OrderType',
		'status': 'OrderStatus',
		'notes': 'Notes',
		'group': 'GroupID',
		'weight': 'Weight',
		'boxDetails': 'boxDetails',
	}

	let transacs = [];

	for (let attr in recordData) {
		if (attr == 'recordDBID' || attr == 'recordNum' || attr == 'store') continue;

		let oldValue = oldRecordData[recordDataConvert[attr]];
		let newValue = recordData[attr];
		// if (attr=='boxDetails') oldValue = JSON.stringify(JSON.parse(oldValue));		
		if (attr=='boxDetails') continue;
		if (attr == 'status') {
			oldValue = ORDER_STATUS_NAME[oldRecordData.OrderStatus];
			newValue = ORDER_STATUS_NAME[statusCollected];
		}

		if (attr == 'type') {
			oldValue = ORDER_TYPE_NAME[oldRecordData.OrderType];
			newValue = ORDER_TYPE_NAME[type];
		}
		if (!oldValue && newValue=="") continue;
		if (newValue != oldValue){
			transacs.push({
				'field': attr,
				'oldValue': oldValue,
				'newValue': newValue,
			}) 
		}
	}
	console.log(transacs);

	if (!statusCollected || statusCollected < 0) {
		page.notification.show('Error: Status cannot be blank.');
		return;
	}
	
	if (tracking) {
		let trackingIDs = tracking.trim().split('\n');
		let trackingData = [];
		for (let trackingNum of trackingIDs) {
			let value = trackingNum.trim();
			if (!value) continue;
			trackingData.push(value);
		}
		tracking = JSON.stringify(trackingData);
	}

	try {
		let formData = new FormData();
		formData.append('id', recordDBID);
		formData.append('type', type);
		formData.append('status', statusCollected);
		formData.append('notes', notes);
		formData.append('tracking', tracking);
		formData.append('group', group);
		formData.append('weight', weight);
		formData.append('boxDetails', JSON.stringify(boxDetails));
		formData.append('transaction', JSON.stringify(transacs));

		let response = await fetch(apiServer+'orders/manage/record', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let data = await response.json();

		if (response.ok && data.result == 'success') {
			page.notification.show('Record '+recordNum+' in '+stores[store].name+' has been updated.', {background: 'bg-lgreen', hide: 2500});
		}
		else {
			page.notification.show('Error: Could not load this record.');
			//page.notification.show(data.result);
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}
}

function mysqlToDate(msDate) {
	return new Date(msDate.replace(' ', 'T') + '.000Z');
}

// Close popup box
function closeBox() {
	document.getElementById('box-outer').classList.remove('flex');
	var divs = document.querySelectorAll('#box-container > div:not(.close)');
	for (let div of divs) {
		div.classList.add('hide');
	}
}

async function showOrderTransLogs(e) {
	// transactions = {};
	document.getElementById('box-outer').classList.add('flex');
  	document.getElementById('order-transLogs').classList.remove('hide');

  	document.querySelector('.record-id').textContent = selectedRecord.SalesRecordID;
  	document.querySelector('.record-buyer-name').textContent = selectedRecordData.Buyer.FullName;
  	document.getElementById('order-transLogs').dataset.id = selectedRecord.DatabaseID;
  	document.getElementById('order-transLogs').dataset.recordId = selectedRecord.SalesRecordID;

	let orderId = selectedRecord.DatabaseID;

	let formData = new FormData();
	formData.append('orderId', orderId);

  	let response = await fetch(apiServer + 'orders/manage/translogs/load', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let data = await response.json();
    // console.log(data);

	if (response.ok && data.result == 'success') {	
	    let transactiontbody = document.querySelector('#order-transLogs-table tbody');	
	    while (transactiontbody.firstChild) {
 			transactiontbody.removeChild(transactiontbody.firstChild);
 		}
		for (let transaction of data.transactions) {
		 	page.transactions[transaction.id] = transaction;

	 		let cols = ['field', 'oldValue', 'newValue', 'actionBy', 'actionTime'];
	 		let tr = document.createElement('tr');
	 		tr.dataset.id = transaction.id;
	 		for (let col of cols) {
	 		let td = document.createElement('td');
 				if(col == 'field') {
 					td.textContent = transaction.field;
 				} else if(col == 'oldValue') {
 					td.textContent = transaction.oldValue;
 				} else if(col == 'newValue') {
 					td.textContent = transaction.newValue;
 				} else if(col == 'actionBy') {
 					td.textContent = transaction.actionBy;
 				} else if(col == 'actionTime') {
 					td.textContent = transaction.actionTime;
 				}
 				tr.appendChild(td);
	 		}
	 		transactiontbody.appendChild(tr);
		}		
	}
	else {
		page.notification.show(data.result);
		document.getElementById('box-outer').classList.remove('flex');
 		document.getElementById('order-transLogs').classList.add('hide');
 		page.notification.show('No transactions found..');
	}
}