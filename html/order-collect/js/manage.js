//  Discount Chemist
//  Order System

import './config.js';
import {createInvoice} from './create-invoice.js';
import {createLabelPDF} from './create-label-pdf.js';
import {NotificationBar} from '/common/notification.js';
import {getItemDetails, loadItemDetails, getInventoryDetails} from './item-details.js';
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

window.loadedItemData = null;
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
	
	var pageInfo = PAGE_INFO[page.type];

	// Title, header
	document.title = pageInfo.title;
	// var header = document.getElementById('header'), headerTitle = header.querySelector('.title');
	// headerTitle.textContent = pageInfo.heading || pageInfo.title;
	// if (pageInfo.position) {
		// headerTitle.classList.add(pageInfo.position);
	// }

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

	document.getElementById('record-load-poid').addEventListener('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		loadRecord('poid');
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

	document.getElementById('manage-edit').addEventListener('click', function () {
		var store = document.querySelector('#record-store-input');
		var dbID = document.querySelector('#record-buyer-details').dataset.id;
		showEditItemBox(dbID, store.value);
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

	//collect-logs
	document.getElementById('collect-logs').addEventListener('click', function() {
		// console.log('11');
		showCollectLogs();
	});

	addListener('#box-table .rows-add', 'click', function(e) {
		//console.log('11');
		addRow();
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
		else if (trackingNum.startsWith('EMG')) {
			trackingUrl = 'https://delivere.com.au/track/'+trackingNum.split('-').slice(0,-1).join('-');
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

	// mark order invoiced
	document.getElementById('manage-mark-invoiced').addEventListener('click', function (e) {
		showMarkInvoicedBox();
	});

	// manage-order-tracking-status
	document.getElementById('manage-order-tracking-status').addEventListener('click', function (e) {
		showOrderTrackingStatusBox();
	});

	document.getElementById('record-tracking').addEventListener('change', function (e) {
		updateTableTrackingWeight();
	});

	document.getElementById('manage-invoice').addEventListener('click', function () {
		// console.log('11');
		document.getElementById('box-outer').classList.add('flex');
		document.querySelector('#box-container #rec-details').classList.remove('hide');
    });

	document.getElementById('btn-mark-invoiced').addEventListener('click', async function (e) {

		var trackingNumbers = $(".chkMarkInvoiced:checked").toArray().map(item => $(item).data('trackingnumber'));

		if (!trackingNumbers.length) {
			page.notification.show('Please select tracking numbers.');
			return;
		}

		var orderId = $('#record-db-id').text().trim();

		if (!orderId) {
			page.notification.show('Order Id is blank.');
			return;
		}

		let formData = new FormData();
		formData.append('orderId', orderId);
		formData.append('trackingNumbers', JSON.stringify(trackingNumbers));

		try {
			let response = await fetch(apiServer + 'invoices/markinvoiced', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
			let data = await response.json();

			
			if (data.result == 'success') {
				if (data.invoices && data.invoices.length) {
					let invoiceBodyHtml = [];

					for (var i = 0; i < data.invoices.length; ++i) {
						let invoice = data.invoices[i];

						invoiceBodyHtml.push([
							'<tr>',
							'<td>' + (invoice.orderId || '') + '</td>',
							'<td>' + invoice.trackingNumber + '</td>',
							'<td>' + (invoice.totalCost || '') + '</td>',
							'<td>' + (invoice.invoicedBy || '') + '</td>',
							'<td>' + (invoice.invoicedTime || '') + '</td>',
							'<td>' + (invoice.invoicedTime ? '<span>closed' : 'open') + '</td>',
							'</tr>'
						].join(''));

						$("#invoicesTable td:contains('" + invoice.trackingNumber + "')").each(function (index, item) { $(item).parent().remove() });

					}

					$('#invoicesTable tbody').append(invoiceBodyHtml.join(''));
				}

				page.notification.show('Success: Order invoiced.');
			} else {
				page.notification.show(data.result);
			}
		}
		catch (e) {
			console.log(e)
			page.notification.show('Error: Could not connect to the server.');
		}

	});
	function updateTableTrackingWeight() {
		let trackingNumbers = $('#record-tracking').val().trim().split('\n');

		let trackingWeightsCount = $("#tblTrackingWeight").find('tr').length - 1;
		
		if (trackingNumbers.length > trackingWeightsCount) {
			let html = [];
			let isReplacement = $("#replaceItemTable tr").length >= 3;
			
			for (let i = trackingWeightsCount; i < trackingNumbers.length; ++i) {
				let trackingNumber = trackingNumbers[i];
				html.push([
					'<tr>',
					'<td style="border:solid 1px #eee"><label>' + trackingNumber + '</label></td>',
					'<td style="border:solid 1px #eee" class="record-parcelWeights" contenteditable="true"></td>',
					'<td style="border:solid 1px #eee"><input style="width:50px;" type="checkbox" class="isReplacement" ' + (isReplacement ? 'checked' : '') + ' /></td>',
					'</tr>',
				].join(''));
			}

			$("#tblTrackingWeight").append(html.join(''));
		}
		
	}
	
	function showMarkInvoicedBox() {
		$('#box-outer').addClass('flex');

		let html = [];
		html.push([
			'<tr>',
				'<td style="border:solid 1px #eee"><label>Tracking Number</label></td>',
				'<td style="border:solid 1px #eee"><label>Weight</label></td>',
				'<td style="border:solid 1px #eee"><label>Replacement</label></td>',
				'<td style="border:solid 1px #eee"><label>Invoice</label></td>',
			'</tr>',
		].join(''));

		$("#tblTrackingWeight").find('tr').each(function (index, item) {
			if (index > 0) {
				var tds = $(item).find('td');
				var isReplacement = $(item).find("input[type=checkbox]").first().prop('checked');

				html.push([
					'<tr>',
					'<td style="border:solid 1px #eee" class="chkMarkInvoicedTrackingNumber">' + $(tds[0]).text() + '</td>',
					'<td style="border:solid 1px #eee" class="markInvoicedWeight">' + $(tds[1]).text() + '</td>',
					'<td style="border:solid 1px #eee"><input style="width:50px;" disabled="disabled" type="checkbox" ' + (isReplacement ? 'checked' : '') + ' /></td>',
					'<td style="border:solid 1px #eee"><input data-trackingNumber="' + $(tds[0]).text() + '" style="width:50px;" type="checkbox" class="chkMarkInvoiced" /></td>',
					'</tr>',
				].join(''));
			}
		});
		$("#mark-invoiced-table").html(html.join(''));
		$('#mark-invoiced-box').removeClass('hide');
	}

	function showOrderTrackingStatusBox() {
		$('#box-outer').addClass('flex');
		let trackingNumbersHtml = [];
		let firstTrackingNumber = null;

		let trackingWeighRows = $("#tblTrackingWeight").find('tr');

		trackingWeighRows.each(function (index, item) {
			if (index > 0) {
				var tds = $(item).find('td');
				trackingNumbersHtml.push([
					'<input type="radio" name="trackingNumber" class="trackingNumber" id="trackingNumber_' + index + '" value="' + $(tds[0]).text() + '" ' + ( index == 1 ? "checked" : '')+' />',
					'<label for="trackingNumber_' + index + '">' + $(tds[0]).text() + '</label>',
				].join(''));
			}
		});

		if (trackingWeighRows.length >= 2) {
			firstTrackingNumber = $($(trackingWeighRows[1]).find('td')).first().text();
			showOrderTrackingStatus(firstTrackingNumber);
		}

		$("#trackingNumbers").html(trackingNumbersHtml.join(''));
		$('#order-tracking-status-box').removeClass('hide');

		$(".trackingNumber").on('change', async function () {
			await showOrderTrackingStatus($(".trackingNumber:checked").val());
		});
	}

	async function showOrderTrackingStatus(trackingNumber) {
		let headerHtml = [
			'<tr>',
				'<td style="border:solid 1px #eee"><label>Status</label></td>',
				'<td style="border:solid 1px #eee"><label>Depot</label></td>',
				'<td style="border:solid 1px #eee"><label>Date/time</label></td>',
			'</tr>',
		].join('');

		$("#order-tracking-status-table").html([
			headerHtml,
			'<tr><td cols="3"><label>Loading</label></td></tr>'
		].join(''));

		let html = [headerHtml];

		let formData = new FormData();
		formData.append('type', $("#record-type").val());
		formData.append('trackingNumber', trackingNumber);

		let response = await fetch(apiServer + 'orders/trackingstatus', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
		let data = await response.json();

		if (data.result == 'success') {
			for (let row of data.trackingStatus) {
				html.push([
					'<tr>',
					'<td>' + ['<strong>' + (row.description || '') + '</strong>', (row.statusDescription || '')].join('<br/>') + '</td>',
						'<td>' + (row.depot || '') + '</td>',
						'<td>' + (row.time || '') + '</td>',
					'</tr>',
				].join(''));
			}
		}

		$("#order-tracking-status-table").html(html.join(''));
	}

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

	document.getElementById('edit-item-search').addEventListener('click', async function () {
		searchEditItems();
	});

	document.getElementById('edit-items-select-item').addEventListener('click', selectEditItem);
	document.getElementById('edit-items-remove-items').addEventListener('click', removeEditItems);
	document.getElementById('edit-items-add-items').addEventListener('click', addEditItems);
	document.getElementById('edit-items-delete-items').addEventListener('click', deleteEditItems);
	document.getElementById('edit-items-update-items').addEventListener('click', updateEditItems);

	document.getElementById('replace-items-add-items').addEventListener('click', function() {
		addReplacementItems();
	});

	document.getElementById('replace-items-close').addEventListener('click', function () { 
		// console.log('11');
		closeReplaceItemBox();
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
		if (SUPPLIER_INFO[page.user.supplier].id == 'hobbyco') {
			supplierStores.push('81');
			supplierStores.push('82');
		}
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
	if (recordNum && recordNumType != 'orderid' && recordNumType != 'poid') {
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
		let response = await fetch(apiServer+'orders/manage?'+(recordNumType == 'dbid' ? 'id=' : (recordNumType + '='))+recordNum+'&store='+store, {headers: {'DC-Access-Token': page.userToken}});
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
	loadedItemData = responseData.items;

	// Set record store
	document.querySelector('#record-store-input [value="'+loadedRecordData[searchedRecordIndex].StoreID+'"]').selected = true;

	showRecord(loadedRecordData[searchedRecordIndex]);
}

function showRecord(record) {
	document.querySelector('#leg').style.display = 'none';
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
	if (record.RecordData.PurchaseOrderID) {
		let td = document.getElementById('record-order-poid');
		td.textContent = record.RecordData.PurchaseOrderID;
		td.parentNode.classList.remove('hide');
	} else {
		let td = document.getElementById('record-order-poid');
		td.textContent = '';
		td.parentNode.classList.add('hide');
	}
	if (record.RecordData.SalesChannel) {
		let td = document.getElementById('record-order-channel');
		td.textContent = record.RecordData.SalesChannel;
		td.parentNode.classList.remove('hide');
	} else {
		let td = document.getElementById('record-order-channel');
		td.textContent = '';
		td.parentNode.classList.add('hide');
	}
	if (record.page) {
		let td = document.getElementById('record-order-page');
		td.textContent = record.page;
		td.parentNode.classList.remove('hide');
	} else {
		let td = document.getElementById('record-order-page');
		td.textContent = '';
		td.parentNode.classList.add('hide');
	}
	if (record.RecordData.CouponCode) {
		let td = document.getElementById('record-order-couponcode');
		td.textContent = record.RecordData.CouponCode;
		td.parentNode.classList.remove('hide');
	} else {
		let td = document.getElementById('record-order-couponcode');
		td.textContent = '';
		td.parentNode.classList.add('hide');
	}
	
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
	// document.getElementById('record-weight').textContent = record.Weight || '';
	document.getElementById('record-details').classList.remove('hide');
	document.getElementById('record-details-btns').classList.remove('hide');
	document.getElementById('send-invoice-send').disabled = false;
	document.getElementById('record-pre-packed-time').value = record.PackedData ? record.PackedData.join('\n') : '';

	if (page.user.supplier == 1) {
		document.getElementById('manage-invoice').classList.remove('hide');
	}

	//Check if new th was inserted before and if store is not B2B then remove.
	let ths = document.getElementById('itemTable').tHead.children[1].children;
	if (ths.length > 5) {
		let itemthead = document.getElementById('itemTable').tHead.children[1];
		itemthead.removeChild(itemthead.children[4]);
	}

	// Create item table
	let cols = ['ItemNum', 'SKU', 'ItemTitle', 'Quantity', 'SalePrice'];
	let itemtbody =  document.querySelector('#itemTable tbody');
	while (itemtbody.firstChild) {
	    itemtbody.removeChild(itemtbody.firstChild);
	}
	//insert new th (Missing Quantity) for B2B-Wholesale and B2B-Transfers.
	if (record.StoreID == 81 || record.StoreID == 82) {
		var itemthead = document.getElementById('itemTable').tHead.children[1],
    	th = document.createElement('th');
		th.innerHTML = "Missing Quantity";
		itemthead.insertBefore(th, itemthead.children[4]);
		cols.splice(4, 0, "MissingQty");
	}

	let itemsData = window.loadedItemData;
	// console.log(itemsData);
	var newItems = [];

	for (let item of record.RecordData.Items) {
		let found = false;
		for (let id in itemsData) {
			if (item.SKU==itemsData[id].sku) {
				if (itemsData[id].bundle) {
					let bundle = JSON.parse(itemsData[id].bundle);
					let totalNum = Object.keys(bundle).length;
					let i = 1;
					for (let itemID in bundle) {
						if (itemsData.hasOwnProperty(itemID)) {
							let bid = itemsData[itemID]
							let newItem = {
								ItemNum: bid.itemNo,
								ItemTitle: bid.itemName + ' (' + 'Bundle ' + item.SKU + ' ' + i +'/' + totalNum + ')',
								LineItemID: item.LineItemID,
								Quantity: parseInt(bundle[itemID])*parseInt(item.Quantity),
								SKU: bid.sku,
								SalePrice: 0,
								TransID: null,
								VariationDetails: "",
							}

							//if (item.AlterItem) newItem['AlterItem'] = item.AlterItem;
							newItems.push(newItem);
						}
						i = i + 1;	
					}
				} else {
					newItems.push(item);
				}
				found = true;
				break;
			}
		}

		if (!found) newItems.push(item);
	}

	// console.log(newItems);
	for (let item of newItems) {
		/*if(item.AlterItem) {
			item.Quantity = item.AlterItem.quantity;
			item.SKU = item.AlterItem.sku;
			item.ItemTitle = item.AlterItem.name;
			item.SalePrice = item.AlterItem.price;
			item.ItemNum = item.AlterItem.itemID;
		};*/
		let tr = document.createElement('tr');
		tr.dataset.lineitemid = item.LineItemID;
		tr.dataset.itemQuantity = item['Quantity'];
		tr.dataset.sku = item['SKU'];
		tr.dataset.itemTitle = item['ItemTitle'];
		tr.dataset.price = item['SalePrice'];
		tr.dataset.itemNo = item['ItemNum'];
		for (let col of cols) {
			let td = document.createElement('td');								
			if (col == 'SalePrice') {
				td.textContent = parseFloat(item[col]).toFixed(2);
			} 
			else if (col == 'MissingQty') {
				if (item['scannedQty']) {
					if (item['scannedQty'][1] < tr.dataset.itemQuantity) {
						item['scannedQty'][1] = parseInt( item['scannedQty'][1] ) + ( parseInt(tr.dataset.itemQuantity) - parseInt(item['scannedQty'][1]) );
					}
					if (item['scannedQty'][1] > tr.dataset.itemQuantity) {
						item['scannedQty'][1] = parseInt( item['scannedQty'][1] ) - ( parseInt(item['scannedQty'][1]) - parseInt(tr.dataset.itemQuantity) );
					}
					if (item['scannedQty'][0] != item['scannedQty'][1]) {
						tr.classList.add('bg-partiallypicked');
					}
					td.textContent = parseInt(item['scannedQty'][1])-parseInt(item['scannedQty'][0]);
				}
				else {
					td.textContent = 'Not scanned';
				}
				td.classList.add('centre');
			}
			else if (col == 'Quantity') {
				td.textContent = item[col];
				td.classList.add('centre');
			}
			/*else if (col == 'edit'){
				var btn = document.createElement("button");
				btn.className = "item-edit action-btn";
				btn.id = "editItem";
				btn.dataset.type = "itemedit";
				btn.textContent = "Edit";
				td.appendChild(btn);
				//innerHTML='<button id="editItem" class="item-edit action-btn" data-type="itemedit">Edit</button>';
				btn.addEventListener('click', async function () {
					var store = document.querySelector('#record-store-input');
					var dbID = document.querySelector('#record-buyer-details').dataset.id;
					
					showEditItemBox(dbID, store.value);

				});
			}*/
			else {
				td.textContent = item[col];
			}
			tr.appendChild(td);
		}
		itemtbody.appendChild(tr);
	}

	// Create item table
	$('#invoicesTable tbody').html('');
	if (record.Invoices) {
		let invoiceBodyHtml = [];
		for (let invoice of record.Invoices) {
			invoiceBodyHtml.push([
				'<tr>',
					'<td>' + (invoice.orderId || '') + '</td>',
					'<td>' + invoice.trackingNumber + '</td>',
					'<td>' + (invoice.totalCost || '') + '</td>',
					'<td>' + (invoice.invoicedBy || '') + '</td>',
					'<td>' + (invoice.invoicedTime || '') + '</td>',
					'<td>' + (invoice.invoicedTime ? '<span style="color:red;">closed</span>' : '<span style="color:#00C59F">open</span>') + '</td>',
				'</tr>'
			].join(''));
		}
		$('#invoicesTable tbody').html(invoiceBodyHtml.join(''));
	}

	//alternative items table
	let cols1 = ['ItemNum', 'SKU', 'ItemTitle', 'Quantity', 'SalePrice', 'Alternative Item'];
	let alterItemtbody =  document.querySelector('#alterItemTable tbody');
	while (alterItemtbody.firstChild) {
	    alterItemtbody.removeChild(alterItemtbody.firstChild);

	}

	let isAlternative = false;
	for (let items of record.RecordData.Items) {
		// console.log(items.AlterItem);
		let item = items.AlterItem;
		if (item) {
			isAlternative = true;
			//document.querySelector('#alterItemTable').classList.remove('hide');
			let tr = document.createElement('tr');
			for (let col of cols1) {
				let td = document.createElement('td');

				if (col == 'ItemNum') {
					td.textContent = items.itemID;
				} 
				else if (col == 'SKU') {
					td.textContent = items.SKU;
				} 
				else if (col == 'ItemTitle') {
					td.textContent = items.ItemTitle;
				} 
				else if (col == 'Quantity') {
					td.textContent = items.Quantity;
				} 
				else if (col == 'SalePrice') {
					td.textContent = parseFloat(items.price).toFixed(2);
				}
				else if (col == 'Alternative Item') {
					td.textContent = item.name + ' SKU:'+  item.sku + ' Qty:'+ item.quantity;
				}
				
				tr.appendChild(td);
			}
			alterItemtbody.appendChild(tr);
		} 
		// else {
		// 	document.querySelector('#alterItemTable').classList.add('hide');
		// }
	}
	if (isAlternative) {
		document.querySelector('#alterItemTable').classList.remove('hide');
	} else {
		document.querySelector('#alterItemTable').classList.add('hide');
	}


	//Replaced items table
	let cols2 = ['ItemNum', 'SKU', 'ItemTitle', 'Quantity', 'SalePrice', 'actions'];
	let replaceItemtbody =  document.querySelector('#replaceItemTable tbody');
	while (replaceItemtbody.firstChild) {
	    replaceItemtbody.removeChild(replaceItemtbody.firstChild);

	}

	let replaceItemTable = document.querySelector('#replaceItemTable');
  	replaceItemTable.dataset.id = selectedRecord.DatabaseID;
  	replaceItemTable.dataset.store = selectedRecord.StoreID;

	let hasReplacement = false;
	for (let items of record.RecordData.Items) {
		// console.log(items.AlterItem);
		let item = items.ReplacedItem;
		let lineitemid = items.LineItemID;
		if (lineitemid) {
			if (item) {
				// console.log(item);
				hasReplacement = true;
				let tr = document.createElement('tr');
				tr.dataset.itemID = item.itemID;
				tr.dataset.sku = item.sku;
				tr.dataset.lineItemID = lineitemid;
				tr.dataset.name = item.name;
				tr.dataset.quantity = item.quantity;

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
					else if (col == 'actions') {
						let replaceBtn = document.createElement('input');
			            replaceBtn.setAttribute('type', 'button');
			            replaceBtn.setAttribute('value', 'x'); 
			            replaceBtn.setAttribute('class','removeReplacedItem btn-red'); 
						replaceBtn.style.width = "38px";
						replaceBtn.style.height = "38px";      
						replaceBtn.style.fontSize = "25px";

		                replaceBtn.addEventListener("click", function(e){                
		                    // console.log('11');       
		                    removeReplacedItems(e);  
		                });

			            td.appendChild(replaceBtn);
			            td.setAttribute('class','Actions'); 
					}
					
					tr.appendChild(td);
				}
				replaceItemtbody.appendChild(tr);
			} 
		}
	}

	$('#tblTrackingWeight').html('');

	if (record.TrackingID && record.TrackingID.length) {
		let trackingWeightHtml = [];
		trackingWeightHtml.push([
			'<tr>',
				'<td style="border:solid 1px #eee"><label>Tracking Number</label></td>',
				'<td style="border:solid 1px #eee"><label>Weight</label></td>',
				'<td style="border:solid 1px #eee"><label>Replacement</label></td>',
			'</tr>',
		].join(''));

		for (let trackingNumber of record.TrackingID) {
			let checkWeight = record.parcelWeights && record.parcelWeights.find(p => p.trackingNumber == trackingNumber);

			let weight = 0;

			if (checkWeight) {
				weight = checkWeight.weight;
			} else {
				if (record.TrackingID[0] == trackingNumber) {
					weight = record.Weight;
				}
			}

			trackingWeightHtml.push([
				'<tr>',
				'<td style="border:solid 1px #eee"><label>' + trackingNumber + '</label></td>',
				'<td style="border:solid 1px #eee" class="record-parcelWeights" contentEditable="true">'
				+ (weight || '0')
				+ '</td>',
				'<td style="border:solid 1px #eee"><input style="width:50px;" type="checkbox" class="isReplacement" ' + (checkWeight && checkWeight.type == 1 ? 'checked' : '') + ' /></td>',
				'</tr>',
			].join(''));
		}

		$('#tblTrackingWeight').append(trackingWeightHtml.join(''));
	}

	if (hasReplacement) {
		document.querySelector('#replaceItemTable').classList.remove('hide');
	} else {
		document.querySelector('#replaceItemTable').classList.add('hide');
	}

	//box table 
	let cols3 = ['actions', 'boxNo', 'weight', 'tracking'];
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
				
				if (col == 'actions') {
					let reBtn = document.createElement('input');
		            reBtn.setAttribute('type', 'button');
		            reBtn.setAttribute('value', 'x'); 
		            reBtn.setAttribute('class','removeRow btn-red'); 
					reBtn.style.width = "38px";
					reBtn.style.height = "38px";      
					reBtn.style.fontSize = "25px";

		                reBtn.addEventListener("click", function(e){                
		                    removeRows(e);                  
		                });

		            td.appendChild(reBtn);
		            td.setAttribute('class','Actions');  
				}
				else if (col == 'boxNo') {
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

	function addRow() {
	    let boxTab = document.getElementById('box-table-body');
	    let numOfBoxes =  boxTab.lastChild ? boxTab.lastChild.querySelector('.boxNo').textContent : 0;   
	    let rowCnt = boxTab.rows.length;
	    let tr = boxTab.insertRow(rowCnt);
	    let cols = ['actions','boxNo', 'weight', 'tracking'];
	    let colsEditable = ['boxNo', 'weight'];
	    

	    for (let c = 0; c < cols.length; c++) {
	        let td = document.createElement('td'); 
	        td = tr.insertCell(c);   
	        td.contentEditable = true;        

	        if (c == 0) {  
	            let reBtn = document.createElement('input');
	            reBtn.setAttribute('type', 'button');
	            reBtn.setAttribute('value', 'x');  

	            reBtn.setAttribute('class','removeRow btn-red');
	            reBtn.style.width = "35px";
				reBtn.style.height = "35px";      
				reBtn.style.fontSize = "25px";  

	                reBtn.addEventListener("click", function(e){                
	                    removeRows(e);                  
	                });

	            td.appendChild(reBtn);
	            td.setAttribute('class','Actions');           
	        }
	        else if (c == 1) {            
	            td.setAttribute('class','boxNo');  
	            td.textContent = parseInt(numOfBoxes) + 1;
	        } 
	        else if (c == 2) {           
	            td.setAttribute('class','weight');           
	        } 
	        else if (c == 3) {
	        	td.setAttribute('class','tracking');
	        }
	    }
	}

	function removeRows(e) {
	    let boxTab = document.getElementById('box-table-body');  
	    let tr = e.target.parentNode.parentNode;
	    boxTab.removeChild(tr); 
	}

	async function removeReplacedItems(e) {

		let replaceItemTableBody = document.querySelector('#replaceItemTable tbody');
		let tr = e.target.parentNode.parentNode;
		let sku = tr.dataset.sku;
		let replaceItemTable = document.querySelector('#replaceItemTable');	
		let recordID = replaceItemTable.dataset.id;
		let storeID = replaceItemTable.dataset.store;
		let formData = new FormData();

		for (let items of selectedRecord.Items) {
			// console.log(items.AlterItem);
			let item = items.ReplacedItem;

			if (item && sku == item.sku) {
				// let sku = tr.dataset.sku;
				let lineItemID = tr.dataset.lineItemID;

				let transacs = [];
				let oldItemTitle = tr.dataset.name;
				let oldItemQty = tr.dataset.quantity;


				let field = 'Delete Replacement';
				let oldValue = ('Name: '+ oldItemTitle + ', ' + 'Qty: ' + oldItemQty);

				transacs.push({
					'field': field,
					'oldValue': oldValue,
					'newValue': '',
				})

				console.log(transacs);

				formData.append('store',storeID);
				formData.append('record',recordID);
				formData.append('sku', sku);
				formData.append('lineItemID', lineItemID);
				formData.append('transaction', JSON.stringify(transacs));

				let response = await fetch(apiServer + 'order/deletereplacementitems', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
			    let delOrderData = await response.json();

			    if (response.ok && delOrderData.result == 'success') {
			    	// console.log(addOrderData.result);				 
			    	page.notification.show("This item has been removed.");
			    }
			    else {
			    	page.notification.show(delOrderData.result);
			    }

			}
		}

		// console.log(tr);
	}

	async function showReplacementItemBox() {
		document.getElementById('box-outer').classList.add('flex');
	  	document.getElementById('item-replace-box').classList.remove('hide');

	  	let trs = document.querySelectorAll('#itemTable>tbody>tr'); 
	  	let cols3 = ['check', 'store', 'ItemTitle', 'SKU', 'ItemNum', 'SalePrice', 'Quantity'];
	  	
	  	let replaceItemBox = document.querySelector('#item-replace-box');
	  	replaceItemBox.dataset.id = selectedRecord.DatabaseID;
	  	replaceItemBox.dataset.store = selectedRecord.StoreID;

	  	let replaceItemBoxtbody = document.querySelector('#item-replace-table-body');

	  	while(replaceItemBoxtbody.firstChild){
	  		replaceItemBoxtbody.removeChild(replaceItemBoxtbody.firstChild);
	  	}

	  	for (let item of trs) {
	  		// console.log(item);
	  		let tr = document.createElement('tr');
	  		tr.dataset.store = selectedRecord.StoreID;
	  		tr.dataset.name = item.dataset.itemTitle;
			tr.dataset.sku = item.dataset.sku;
			tr.dataset.price = item.dataset.price;
			tr.dataset.qty = item.dataset.itemQuantity;
			tr.dataset.lineitemid = item.dataset.lineitemid;
			tr.dataset.itemNo = item.dataset.itemNo;

			for (let col of cols3) {
				let td = document.createElement('td');
				td.dataset.col = col;
				if(col == 'quantity' || col == 'price') td.contentEditable = true;

				if (col == 'check') {
					let input = document.createElement('input');
					td.className = 'selected';
				    input.type = 'checkbox';
				    input.autocomplete = 'off';
				    td.appendChild(input);
				}
				else if (col == 'store') {
					td.textContent = stores[selectedRecord.StoreID].name;
				} 
				else if (col == 'ItemTitle') {
					td.textContent = item.dataset.itemTitle;
				}
				else if (col == 'SKU') {
					td.textContent = item.dataset.sku;	
				}
				else if (col == 'ItemNum') {
					td.textContent = item.dataset.itemNo;
				}
				else if (col == 'SalePrice') {
					td.textContent = item.dataset.price;
				}
				else if (col == 'Quantity') {
					td.contentEditable = true;
					td.textContent = item.dataset.itemQuantity;
				}
				tr.appendChild(td);
			}
			replaceItemBoxtbody.appendChild(tr);
		}

		
	}

	async function showAlternativeItemBox() {
		document.getElementById('box-outer').classList.add('flex');
	  	document.getElementById('item-alternative-box').classList.remove('hide');

	  	let trs = document.querySelectorAll('#itemTable>tbody>tr'); 
	  	let cols3 = ['check','store', 'ItemTitle', 'SKU', 'ItemNum', 'SalePrice', 'Quantity'];

	  	let alternativeItemBoxtbody = document.querySelector('#item-alternative-table-body');
	  	let alterItemBox = document.querySelector('#item-alternative-box');
	  	alterItemBox.dataset.id = selectedRecord.DatabaseID;
	  	alterItemBox.dataset.store = selectedRecord.StoreID;

	  	while(alternativeItemBoxtbody.firstChild){
	  		alternativeItemBoxtbody.removeChild(alternativeItemBoxtbody.firstChild);
	  	}


	 //  	for (let item of selectedRecord.Items) {
		// 	let tr = document.createElement('tr');
		// 	tr.dataset.itemNo = item.ItemNum;
		// 	tr.dataset.store = selectedRecord.StoreID;
		// 	tr.dataset.name = item.ItemTitle;
		//     tr.dataset.sku = item.SKU;
		//     tr.dataset.price = item.SalePrice;
		//     tr.dataset.qty = item.Quantity;
		//     tr.dataset.lineitemid = item.LineItemID;

		// 	for (let col of cols3) {
		// 		let td = document.createElement('td');	
		
		// 		if (col  == 'store') {
		// 			td.textContent = stores[selectedRecord.StoreID].name;
		// 		} else {
		// 			td.textContent = item[col];
		// 		}

		// 		// if (col  == 'Quantity') {
		// 		// 	td.contentEditable = true;
		// 		// }

		// 		if (col == 'check') {
		// 			let input = document.createElement('input');
		// 			td.className = 'selected';
		// 		    input.type = 'checkbox';
		// 		    input.autocomplete = 'off';
		// 		    td.appendChild(input);
		// 		}

		// 		tr.appendChild(td);
		// 	}
		// 	alternativeItemBoxtbody.appendChild(tr);
		// }

		for (let item of trs) {
	  		let tr = document.createElement('tr');
	  		tr.dataset.store = selectedRecord.StoreID;
	  		tr.dataset.name = item.dataset.itemTitle;
			tr.dataset.sku = item.dataset.sku;
			tr.dataset.price = item.dataset.price;
			tr.dataset.qty = item.dataset.itemQuantity;
			tr.dataset.lineitemid = item.dataset.lineitemid;
			tr.dataset.itemNo = item.dataset.itemNo;

			for (let col of cols3) {
				let td = document.createElement('td');
				td.dataset.col = col;
				if(col == 'quantity' || col == 'price') td.contentEditable = true;

				if (col == 'check') {
					let input = document.createElement('input');
					td.className = 'selected';
				    input.type = 'checkbox';
				    input.autocomplete = 'off';
				    td.appendChild(input);
				}
				else if (col == 'store') {
					td.textContent = stores[selectedRecord.StoreID].name;
				} 
				else if (col == 'ItemTitle') {
					td.textContent = item.dataset.itemTitle;
				}
				else if (col == 'SKU') {
					td.textContent = item.dataset.sku;	
				}
				else if (col == 'ItemNum') {
					td.textContent = item.dataset.itemNo;
				}
				else if (col == 'SalePrice') {
					td.textContent = item.dataset.price;
				}
				else if (col == 'Quantity') {
					td.contentEditable = true;
					td.textContent = item.dataset.itemQuantity;
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
			// if (price == '' || isNaN(price) || price <= 0) {
		 //    	hasQuantity = false;
		 //    }
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

		let isChecked = false;
		
		for (let tr_i = 0; tr_i < replaceItemtbodyTrs.length; tr_i++) {
			let tr = replaceItemtbodyTrs[tr_i];
			let selectedInput = tr.firstChild.querySelector('input');

			if (selectedInput && selectedInput.checked) {
				// console.log(selectedInput);
				isChecked = true;
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
			
				// item.replaceStore = tr.dataset.replaceStore;
		  //       item.replaceSku = tr.dataset.replaceSku;
		  //       item.replaceName = tr.dataset.replaceName;
		  //       item.replaceItemNo = tr.dataset.replaceItemNo;
		  //       item.replacePrice = tr.dataset.replacePrice;

		        item.replaceStore = tr.querySelector('[data-col="store"]').textContent;
		        item.replaceSku = tr.querySelector('[data-col="SKU"]').textContent;
		        item.replaceName = tr.querySelector('[data-col="ItemTitle"]').textContent;
		        item.replaceItemNo = tr.querySelector('[data-col="ItemNum"]').textContent;
		        item.replacePrice = tr.querySelector('[data-col="SalePrice"]').textContent;

		        let quantity = tr.dataset.qty;
		        let newQty = tr.querySelector('[data-col="Quantity"]').textContent;

		        if (parseInt(quantity) < parseInt(newQty)) {
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
				let newItemTitle = item.replaceName;
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
			/*else {
				page.notification.show('PLease select replacememnt item..');
			}*/
		}

		if (!isChecked) {
			page.notification.show('Please select replacememnt item..');
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
	// console.log(notes);
	var tracking = document.getElementById('record-tracking').value;
	var group = document.getElementById('record-groupnum').textContent;
	// var weight = document.getElementById('record-weight').textContent;

	var parcelWeights = [];
	$(".record-parcelWeights").each(function (index, item) {
		var trackingNumber = $(item).parent().find('td').first().text();
		var weight = $(item).text().trim();
		var checked = $($('.isReplacement')[index]).prop('checked');
		
		if (weight != '') {
			parcelWeights.push({
				trackingNumber: trackingNumber,
				weight: weight,
				type: checked ? 1 : 0
			});
		} else {
			page.notification.show('Error: replaced item weight cannot be blank.');
			return;
		}
	});		

	var salesRecordID = document.getElementById('record-id').textContent;

	var trs = document.querySelectorAll('#box-table tbody tr');
	let boxDetails = [];
	var boxNo, boxWeight, boxTracking;

	let inventoryBack = false;

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
		// weight: weight,
		boxDetails: JSON.stringify(boxDetails),  
	};

	const recordDataConvert = {
		'recordDBID': 'id',
		'type': 'OrderType',
		'status': 'OrderStatus',
		'notes': 'Notes',
		'tracking': 'TrackingID',
		'group': 'GroupID',
		// 'weight': 'Weight',
		'boxDetails': 'boxDetails',
	}

	let transacs = [];

	for (let attr in recordData) {
		if (attr == 'recordDBID' || attr == 'recordNum' || attr == 'store') continue;

		let oldValue = oldRecordData[recordDataConvert[attr]];
		let newValue = recordData[attr];
		if (attr=='boxDetails') {
			oldValue = oldValue ? oldValue.replace(/, /g, ',') : JSON.stringify([]);
		};		
		if (attr == 'status') {
			oldValue = ORDER_STATUS_NAME[oldRecordData.OrderStatus];
			newValue = ORDER_STATUS_NAME[statusCollected];

			if (checkInclude([ORDER_STATUS.COLLECTED, ORDER_STATUS.WAREHOUSECOLLECTED, ORDER_STATUS.PARTIALCOLLECTED, ORDER_STATUS.READYTOPRINT,
				 ORDER_STATUS.READYTOPACK, ORDER_STATUS.LATER],oldRecordData.OrderStatus) 
				&& checkInclude([ORDER_STATUS.CANCELLED.OUTOFSTOCK, ORDER_STATUS.OUTOFSTOCK, ORDER_STATUS.CANCELLED.DONE],statusCollected)) {
				inventoryBack = true;
			}
		}

		if (attr == 'type') {
			oldValue = ORDER_TYPE_NAME[oldRecordData.OrderType];
			newValue = ORDER_TYPE_NAME[type];
		}

		if (attr=='tracking') {
			newValue = newValue.trim().split('\n').join(' ');
			oldValue = oldValue ? oldValue.join(' ') : oldValue;
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
		// formData.append('weight', weight);
		formData.append('boxDetails', JSON.stringify(boxDetails));
		formData.append('transaction', JSON.stringify(transacs));
		formData.append('parcelWeights', JSON.stringify(parcelWeights));
		formData.append('inventoryBack', inventoryBack);
		formData.append('salesRecordID', salesRecordID);

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

async function showCollectLogs(e) {
	// transactions = {};
	document.getElementById('box-outer').classList.add('flex');
  	document.getElementById('collect-transLogs').classList.remove('hide');
  	document.querySelector('#box-container #rec-details').classList.add('hide');

  	document.querySelector('.record-id2').textContent = selectedRecord.SalesRecordID;
  	document.querySelector('.record-buyer-name2').textContent = selectedRecordData.Buyer.FullName;
  	document.getElementById('collect-transLogs').dataset.id = selectedRecord.DatabaseID;
  	document.getElementById('collect-transLogs').dataset.recordId = selectedRecord.SalesRecordID;

	let orderId = selectedRecord.OrderID;

	let formData = new FormData();
	formData.append('orderId', orderId);

  	let response = await fetch(apiServer + 'orders/manage/collectlogs/load', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let data = await response.json();
    // console.log(data);

	if (response.ok && data.result == 'success') {	
	    let transactiontbody = document.querySelector('#order-collectLogs-table tbody');	
	    while (transactiontbody.firstChild) {
 			transactiontbody.removeChild(transactiontbody.firstChild);
 		}

		for (let transaction of data.transactions) {
		 	//page.transactions[transaction.id] = transaction;

	 		let cols = ['pageType', 'sku', 'itemName', 'quantity', 'location', 'actionBy', 'actionTime'];
	 		let tr = document.createElement('tr');
	 		tr.dataset.id = transaction.id;
	 		for (let col of cols) {
	 		let td = document.createElement('td');
 				if(col == 'pageType') {
 					td.textContent = transaction.pageType;
 				} else if(col == 'sku') {
 					td.textContent = transaction.sku;
 				} else if(col == 'itemName') {
 					td.textContent = transaction.itemName;
 				} else if(col == 'quantity') {
 					td.textContent = transaction.pickedQty;
 				} else if(col == 'location') {
 					td.textContent = transaction.oldBay;
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
 		document.getElementById('collect-transLogs').classList.add('hide');
 		page.notification.show('No transactions found..');
	}
}

function checkInclude(list, target) {
	let isInclude = false;
	for (let element of list) {
		if (element==target) {
			isInclude = true;
			break;
		}
	}
	return isInclude;
}

async function showEditItemBox(dbID, store=null) {

	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('item-edit-box').classList.remove('hide');
	document.querySelector('#box-container #rec-details').classList.add('hide');

	let itemTableBody = document.querySelector('#item-edit-box #item-table-body');
	let edititembox = document.querySelector('#item-edit-box');
	edititembox.dataset.id = dbID;
	edititembox.dataset.store = store;
	let salesRecordID = document.querySelector('#record-order-details tbody');
	edititembox.dataset.salesrecord = salesRecordID.querySelector('#record-id').textContent;
	
	while (itemTableBody.firstChild) {
	    itemTableBody.removeChild(itemTableBody.firstChild);
	}
	
	let trs = document.querySelectorAll('#itemTable>tbody>tr'); 

	let cols = ['id', 'store', 'name', 'sku', 'itemNo', 'price' ,'quantity'];

	for (let item of trs) {
		let tr = document.createElement('tr');
			let formData = new FormData();
			formData.append('store', store);
			formData.append('sku', item.dataset.sku);
			formData.append('name', item.dataset.itemTitle);
			formData.append('price', item.dataset.price);
	  		let response = await fetch(apiServer + 'searchitem', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
	  		let itemData = await response.json();
	  		let items = itemData.items;
	  		if (response.ok && itemData.result == 'success' && items.length == 1) {
		  		for (let it of items) {
		  			tr.dataset.id = it.id;
		  			tr.dataset.itemNum = it.num;
		  		}
		  	}
		tr.dataset.store = store;
		tr.dataset.name = item.dataset.itemTitle;
		tr.dataset.sku = item.dataset.sku;
		tr.dataset.price = item.dataset.price;
		tr.dataset.qty = item.dataset.itemQuantity;
		tr.dataset.lineitemid = item.dataset.lineitemid;

		let td = document.createElement('td'), input = document.createElement('input');
			td.className = 'selected';
			input.type = 'checkbox';
			input.autocomplete = 'off';
			td.appendChild(input);
			tr.appendChild(td);

		for(let col of cols) {
			let td1 = document.createElement('td');
			td1.dataset.col = col;
			if(col == 'quantity' || col == 'price') td1.contentEditable = true;

			let text = '';
			switch (col) {
				case 'id':
					text = tr.dataset.id;
					break;
				case 'store':
					text = stores[store].name;
					break;
				case 'name':
					text = item.dataset.itemTitle;
					break;
				case 'sku':
					text = item.dataset.sku;
					break;
				case 'itemNo':
					text = tr.dataset.itemNum;
					break;
				case 'price':
					text = item.dataset.price;
					break;
				case 'quantity':
					text = item.dataset.itemQuantity;
					break;
				default:
					text = '';
			}

			td1.textContent = text || '';
			tr.appendChild(td1);
		}

		itemTableBody.appendChild(tr);
	}

	let editItemStoreSelect = document.querySelector("#edit-item-searchfield-stores");
	while (editItemStoreSelect.firstChild) {
	    editItemStoreSelect.removeChild(editItemStoreSelect.firstChild);
	}

	if (store != 81 && store != 82) {
		for (let storeID in stores) {
			let option = document.createElement('option');
			option.value = store;
			option.textContent = stores[store].name;
			editItemStoreSelect.appendChild(option);
		}
	} else {
		store = 71;
		let option = document.createElement('option');
		option.value = store;
		option.textContent = stores[store].name;
		editItemStoreSelect.appendChild(option);

	}
		
	let searchTableBody = document.querySelector('#edit-items-search tbody');
	searchTableBody.innerHTML = "";
	let seletectedTableBody = document.querySelector('#edit-items-selected tbody');
	seletectedTableBody.innerHTML = "";
	document.querySelector('#edit-item-keyword').value = "";
	
}

async function searchEditItems() {
  let id = '';
  let name = '';
  let sku = '';
  let itemNo = '';

  var keywords = document.querySelector('#edit-item-searchbar input').value.toLowerCase();
  var field = document.querySelector('#edit-item-searchbar input[name="edit-item-searchfield"]:checked').value;

  if (field == 'id') {
    id = keywords;
  } else if (field == 'itemno') {
    itemNo = keywords;
  } else if (field == 'sku') {
    sku = keywords;
  } else if (field == 'itemname') {
    name = keywords;
  }

  var store = document.querySelector('#edit-item-searchfield-stores').value;
  let formData = new FormData();
  formData.append('store', store);
  formData.append('id', id);
  formData.append('name', name);
  formData.append('sku', sku);
  formData.append('itemNo', itemNo);
  
  let cols = ['id', 'store', 'name', 'sku', 'itemNo'];
  let response = await fetch(apiServer + 'searchitem', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
  let itemData = await response.json();
  let searchTableBody = document.querySelector('#edit-items-search tbody');
  while (searchTableBody.firstChild) {
    searchTableBody.removeChild(searchTableBody.firstChild);
  }

  if (response.ok && itemData.result == 'success') {
    // Enable tracking buttons
    //page.notification.show('Records have been marked as ready to be packed.');
    let items = itemData.items;
    for (let item of items) {
      let tr = document.createElement('tr');
      tr.dataset.id = item.id;
      tr.dataset.store = item.store;
      tr.dataset.sku = item.sku;
      tr.dataset.name = item.name;
      tr.dataset.num = item.num;
      
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
          default:
            text = '';
        }

        td.textContent = text || '';
        tr.appendChild(td);
      }

      searchTableBody.appendChild(tr);
	}
	
	let itemTableSearchBody = $('#edit-items-search');
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

function selectEditItem() {
  let searchTableBody = document.querySelector('#edit-items-search tbody');
  let itemTableBody = document.querySelector('#edit-items-selected tbody');
  let itemTrs = searchTableBody.querySelectorAll('tr');

  let cols = ['id', 'store', 'name', 'sku', 'itemNo', 'quantity', 'price'];

  for (let tr_i=0; tr_i<itemTrs.length;tr_i++) {
		let tr = itemTrs[tr_i];
		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput && selectedInput.checked) {
			let tr2 = document.createElement('tr');
			tr2.dataset.id = tr.dataset.id;
			tr2.dataset.store = tr.dataset.store;
			tr2.dataset.sku = tr.dataset.sku;
			tr2.dataset.name = tr.dataset.name;
			tr2.dataset.num = tr.dataset.num;

			let td2 = document.createElement('td'), input2 = document.createElement('input');
			td2.className = 'selected';
			input2.type = 'checkbox';
			input2.autocomplete = 'off';
			td2.appendChild(input2);
			tr2.appendChild(td2);

			for (let col of cols) {
				let td2 = document.createElement('td');
				td2.dataset.col = col;
				if (col == 'quantity' || col == 'price') td2.contentEditable = true;
				
				let text = '';
				switch (col) {
					case 'id':
						text = tr.dataset.id;
						break;
					case 'sku':
						text = tr.dataset.sku;
						break;
					case 'name':
						text = tr.dataset.name;
						break;
					case 'itemNo':
						text = tr.dataset.num;
						break;
					case 'store':
						text = stores[tr.dataset.store].name;
						break;
					case 'quantity':
						text = 1;
						break;
					case 'price':
						text = '0';
						break;
					default:
						text = '';
				}

				td2.textContent = text || '';
				tr2.appendChild(td2);
			}

			itemTableBody.appendChild(tr2);

		}
	}
}

function removeEditItems() {
  let itemTableBody = document.querySelector('#edit-items-selected tbody');
  let itemTrs = document.querySelectorAll('#edit-items-selected tbody tr');

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

async function addEditItems(e) {
	
	let dbID = e.target.parentNode.parentNode.parentNode.dataset.id;
	let store = e.target.closest('#item-edit-box').dataset.store;
	let salesrecord = e.target.closest('#item-edit-box').dataset.salesrecord;
	let send = true;
	try {

		let formData = new FormData();
		formData.append('dbID', dbID);
		formData.append('store', store);
		formData.append('salesrecord', salesrecord);
		let items = [];
		let itemTrs = e.target.closest('#item-edit-box').querySelectorAll('#edit-items-selected tbody tr');

		if (itemTrs.length == 0) {
			send = false;
			page.notification.show("Please select items.");
			return;
		}

		let hasQuantity = true;
		for (let itemTr of itemTrs) {
			let item = {};
			item.sku = itemTr.dataset.sku;
			item.itemID = itemTr.dataset.num;
			item.title = itemTr.dataset.name;
			let quantity = itemTr.querySelector('[data-col="quantity"]').textContent;
			//console.log(quantity);
			if (quantity == '' || isNaN(quantity) || quantity <= 0) {
				hasQuantity = false;
			}
			item.quantity = quantity;
			item.unitPrice = itemTr.querySelector('[data-col="price"]').textContent;
			// item.currency = 'AUD';
			items.push(item);
		}
		
		if (!hasQuantity) {
			send = false;
		
		} 

		formData.append('items', JSON.stringify(items));

		if (!send) {
			page.notification.show("Please complete the form.");
			return;
		}
		//console.log(formData.get('data'));
		let response = await fetch(apiServer+'order/additem', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let addOrderData = await response.json();

		if (response.ok && addOrderData.result == 'success') {
			document.querySelector('#edit-items-selected tbody').innerHTML = "";		
			page.notification.show("Order added successfully.");
		}
		else {
			page.notification.show(addOrderData.result);
		}	
	} catch(e) {
		console.log(e);
	}

}

async function deleteEditItems() {
	var box = document.querySelector('#item-edit-box');
	let orderNo = box.dataset.id;
	let storeNo = box.dataset.store;

	let tbody = document.querySelector('#item-edit-box #item-table tbody');
	let trs = tbody.querySelectorAll('tr');

	let deleteItems = [];

	for (let tr of trs) {
		let deleteItem = [];
		if (tr.firstChild.firstChild.checked == true) {
			deleteItem = [tr.dataset.lineitemid, tr.dataset.sku];    //[lineitemid, sku]
			deleteItems.push(deleteItem);
		}
	}
	
	if (deleteItems.length == 0) {
		page.notification.show('No item selected.');
		return;
	}
	
	let deleteItemConfirm = confirm("Please confirm to delete item " + deleteItems.map(([x,y]) => [y]).join(',') + ".");

	if (deleteItemConfirm == false) return;
	
	
	try {
		let formData = new FormData();
		formData.append('record', orderNo);
		formData.append('store', storeNo);
		formData.append('deleteItems', JSON.stringify(deleteItems));

		let response = await fetch(apiServer+'order/itemdelete', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let data = await response.json();

		if (!response.ok) {
			console.log('Error: '+data.result);
		}

		if (data.result == 'success') {
			/*let recordData = saleRecords[storeNo].records[orderNo];
			let items = recordData.Items;
			for (let deleteItem of deleteItems) {
				let lineItemID = deleteItem[0];
				let sku = deleteItem[1];
				for (let i=0; i< items.length; i++) {
					let item = items[i];
					if (item.LineItemID==lineItemID && item.SKU==sku) {
						items.splice(i,1);
						break;
					}
				}

				for (let tr of trs) {
					if (tr.dataset.lineitemid == lineItemID) {
						tbody.removeChild(tr);
						break;
					}
				}
			}
				
			document.querySelector('#record-list ul .selected').click();*/
			page.notification.show('Items have been deleted.', {background: 'bg-lgreen'});
		}
		else {
			console.log(data.result);
		}
	}
	catch (e) {
		console.log(e);
		console.log('Error: Could not connect to the server.');
	}

}

async function updateEditItems() {
	var box = document.querySelector('#item-edit-box');
	let orderNo = box.dataset.id;
	let storeNo = box.dataset.store;

	let tbody = document.querySelector('#item-edit-box #item-table tbody');
	let trs = tbody.querySelectorAll('tr');

	let updateItems = [];

	let validData = true; 
	for (let tr of trs) {
		let updateItem = [];
		if (tr.firstChild.firstChild.checked == true) {

			let quantity = tr.querySelector('[data-col="quantity"]').textContent;
			
			if (quantity == '' || isNaN(quantity) || parseInt(quantity) <= 0) {
				validData = false;
			}
			let price = tr.querySelector('[data-col="price"]').textContent;

			if (price == '' || isNaN(price)) {
				validData = false;
			}

			updateItem = [tr.dataset.lineitemid, tr.dataset.sku, price, quantity];    //[lineitemid, sku]
			updateItems.push(updateItem);
		}
	}
	
	if (updateItems.length == 0) {
		page.notification.show('No item selected.');
		return;
	}

	if (!validData) {
		page.notification.show('Please check price and quantity.');
		return;
	}
	
	
	try {
		let formData = new FormData();
		formData.append('record', orderNo);
		formData.append('store', storeNo);
		formData.append('updateItems', JSON.stringify(updateItems));

		let response = await fetch(apiServer+'order/itemupdate', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let data = await response.json();

		if (!response.ok) {
			console.log('Error: '+data.result);
		}

		if (data.result == 'success') {
			/*let recordData = saleRecords[storeNo].records[orderNo];
			let items = recordData.Items;
			for (let updateItem of updateItems) {
				let lineItemID = updateItem[0];
				let sku = updateItem[1];
				for (let i=0; i< items.length; i++) {
					let item = items[i];
					if (item.LineItemID==lineItemID && item.SKU==sku) {
						item.SalePrice = updateItem[2];
						item.Quantity = updateItem[3];
						break;
					}
				}

			}
				
			document.querySelector('#record-list ul .selected').click();*/
			page.notification.show('Items have been updated.', {background: 'bg-lgreen'});
		}
		else {
			console.log(data.result);
		}
	}
	catch (e) {
		console.log(e);
		console.log('Error: Could not connect to the server.');
	}
}