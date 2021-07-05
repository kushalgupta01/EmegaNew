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
					document.getElementById('username').textContent = page.user.firstname + (page.user.lastname ? ' '+page.user.lastname : '');
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
		let btns = document.querySelectorAll('#record-details .action-btn');
		for (let btn of btns) {
			btn.disabled = true;
		}
	}

	document.getElementById('record-logout').addEventListener('click', function() {
		localStorage.removeItem('username');
		localStorage.removeItem('usertoken');
		window.location.href = '/';
	});

	document.getElementById('back-to-home').addEventListener('click', function() {
		window.location.href = '/';
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
	document.getElementById('record-email').textContent = record.RecordData.Email ? record.RecordData.Email.trim() : "";
	document.getElementById('record-order-purchase-date').textContent = record.RecordData.SaleDate;
	document.querySelector('#record-type option[value="'+(record.OrderType != null ? record.OrderType : '-1')+'"]').selected = true;
	document.querySelector('#record-status option[value="'+(record.OrderStatus != null ? record.OrderStatus : '-1')+'"]').selected = true;
	document.getElementById('record-collector').textContent = record.Collector || 'No one';
	document.getElementById('record-collected-time').textContent = record.Collected ? mysqlToDate(record.Collected).toLocaleString()+' '+timezone : 'N/A';
	document.getElementById('record-packer').textContent = record.Packer || 'No one';
	document.getElementById('record-packed-time').textContent = record.PackedTime ? mysqlToDate(record.PackedTime).toLocaleString()+' '+timezone : 'N/A';
	document.getElementById('record-notes').value = record.Notes || '';
	document.getElementById('record-tracking').value = record.TrackingID ? record.TrackingID.join('\n') : '';
	document.getElementById('record-groupnum').value = record.GroupID || '';
	document.getElementById('record-weight').value = record.Weight || '';
	document.getElementById('record-details').classList.remove('hide');
	document.getElementById('send-invoice-send').disabled = false;
	document.getElementById('record-pre-packed-time').value = record.PackedData ? record.PackedData.join('\n') : '';

	// Create item table
	let cols = ['ItemNum', 'SKU', 'ItemTitle', 'Quantity'];
	let itemtbody =  document.querySelector('#itemTable tbody');
	while (itemtbody.firstChild) {
	    itemtbody.removeChild(itemtbody.firstChild);
	}
	for (let item of record.RecordData.Items) {
		let tr = document.createElement('tr');
		for (let col of cols) {
			let td = document.createElement('td');
			if (SUPPLIER_INFO[SUPPLIER.CombinedGroup].stores.includes(selectedRecord.StoreID.toString()) && col=='ItemTitle' && item.VariationDetails) {
				td.innerHTML = item[col] + '<br><strong>' + item.VariationDetails.map(vari=>(vari.display_name+': '+vari.display_value+ '<span class="gap10"></span>')).join('<br>')
                + '</strong>';
			} else {
				td.textContent = item[col];
			}
			
			tr.appendChild(td);
		}
		itemtbody.appendChild(tr);
	}

	//create original order table
	let cols1 = ['ItemNum', 'SKU', 'ItemTitle', 'Quantity', 'Action'];
	let originalItemtbody =  document.querySelector('#originalItemTable tbody');
	while (originalItemtbody.firstChild) {
	    originalItemtbody.removeChild(originalItemtbody.firstChild);
	}

	if (record.OriginalItems) {
		for (let item of record.OriginalItems) {
			let tr1 = document.createElement('tr');
			for (let col of cols1) {
				let td1 = document.createElement('td');
				td1.textContent = item[col];
				tr1.appendChild(td1);
			}
			originalItemtbody.appendChild(tr1);
		}
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
		deliveryNote: recordBuyerDetails.querySelector('.record-delivery-note').textContent,
	};

	recordBuyerSaveBtn.disabled = true;

	try {
		let formData = new FormData();
		formData.append('buyerinfo', JSON.stringify(buyer));

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
	var recordDBID = document.getElementById('record-buyer-details').dataset.id;
	var store = document.getElementById('record-store-input');
	store = store.options[store.selectedIndex].value;
	var recordNum = document.getElementById('record-num-input').value;
	var type = document.getElementById('record-type');
	type = type.options[type.selectedIndex].value;
	var statusCollected = document.getElementById('record-status');
	statusCollected = statusCollected.options[statusCollected.selectedIndex].value;
	var notes = document.getElementById('record-notes').value;
	var tracking = document.getElementById('record-tracking').value;
	var group = document.getElementById('record-groupnum').value;
	var weight = document.getElementById('record-weight').value;

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
