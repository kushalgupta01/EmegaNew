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
	local: window.location.hostname.startsWith('1'),
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
	document.getElementById('username').textContent = localStorage.getItem('username');
	if (localStorage.getItem('username')!= 'waterwipes') $('#li-orderdownload').removeClass('hide');
	if (localStorage.getItem('username') == 'waterwipes') $('#li-addneworder').removeClass('hide');
	
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
				}
			}

			if (!loginSuccess) {
				// Not logged in
				window.location.href = '/';
				return;
			}

			await loadStoreLists();
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

	// Ability to press enter to get the record
	document.getElementById('record-num-input').addEventListener('keyup', function(e) {
		if (e.key == 'Enter' || e.key == '↵') {
			loadRecord('record');
		}
	});

	document.getElementById('record-load-record').addEventListener('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		loadRecord('record');
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

	// Mark order as changed
	addListener('#record-buyer-details tbody td', 'input', function(e) {
		if (e.target.innerHTML == '<br>') e.target.textContent = ''; // Remove empty line if needed
		e.target.closest('table').dataset.changed = 1;
	});

	addListener('#manage-reset, #manage-close', 'click', function(e) {
		window.location.reload();
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

	document.getElementById('manage-save').addEventListener('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		saveRecord();
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

document.getElementById('logout_link').addEventListener('click', function () {
	localStorage.removeItem('username');
	localStorage.removeItem('usertoken');
	window.location.href = '/login.html';
});


// Load the list of stores
async function loadStoreLists() {
	var itemEl, optionEl, items;

	let response, data;
	let clientId = page.user.id;
	try {
		response = await fetch(apiServer + "stores/" + clientId);
		data = await response.json();

		if (!response.ok) {
			page.notification.show("Error: " + data.result);
		} else {
			// Stores
			itemEl = document.getElementById('record-store-input')
			for (let item of data.result) {
				optionEl = document.createElement('option');
				optionEl.value = item.id;
				optionEl.textContent = item.name;;
				itemEl.appendChild(optionEl);

				if (item.id == 'waterwipes') {
					$('#li-addneworder').removeClass('hide');
				}
			}
		}
	} catch (e) {
		page.notification.show("Error: Could not connect to the server.");
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
	optionEl.disabled = true;
	itemEl.appendChild(optionEl);

	for (let item of items) {
		optionEl = document.createElement('option');
		optionEl.value = item;
		optionEl.textContent = ORDER_STATUS_NAME[item];
		if (item != 0) optionEl.disabled = true;
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
			td.textContent = item[col];
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
