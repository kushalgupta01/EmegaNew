// Discount Chemist
// Order System

import '/order-collect/js/config.js';
import {formatOrder} from './format-orders.js';
import {createTemplateEparcels, createTemplateFastway, createTemplateEparcelsCSV, createTemplateInternationalEparcelsCSV, createTemplateDelivere} from './template-output.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getCaretPosition, getDateValue, selectElement, addListener, removeListener, checkLogin} from '/common/tools.js';
import {getItemDetails} from '/order-collect/js/item-details.js';

window.page = {
	buyerNameMaxLen: 30,
	MaxWeight: 3,
	els: {},
	notification: new NotificationBar(),
	//ordersLoaded: false,
	selectedPanel: null,
	user: {
		id: '',
		username: '',
		firstname: '',
		lastname: '',
	},
	userToken: localStorage.getItem('usertoken') || '',
	local: window.location.hostname.startsWith('192.168'),
}

window.saleRecords = {}; // Holds the sales records for each store
window.bundleItems = {}; // Holds the variations and other details for each item number
window.itemDetails = {};
window.postData = {
	postcodes: {},
	states: {},
}

window.dealConvert = {
	"deal_HUGGIESBABYWIPES": "B",
	"deal_FINISH_LEMON_110PACK": "F",
	"deal_ORALB_ELECTRIC_MEDIUM": "T",
};

window.fastwayMetroCodes = [];

window.reDigits = /^\d+$/;
//window.rePunctuation = /\-/g;
//window.reSymbols = /['"\.,\/#!\$%\^&\*;:{}=\-]/g;

if (page.local) {
	apiServer = apiServerLocal;
}


document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	page.els.menuList = document.querySelector('#menu-list ul');
	page.els.getOrderDiv = document.querySelector('#content-get-order');
	page.els.getOrderForm = page.els.getOrderDiv.querySelector('form');
	page.els.getOrderInput = document.getElementById('content-get-order-input');
	page.els.getOrderID = document.getElementById('content-get-order-id');
	page.els.getOrderDBID = document.getElementById('content-get-order-dbid');
	page.els.addRow = document.getElementById('content-add-row');
	page.els.actionButtons = document.getElementById('content-action-btns');

	page.els.ordersDuplicate = document.getElementById('content-orders-duplicate');
	page.els.ordersSave = document.getElementById('content-orders-save');
	page.els.ordersTracking = document.getElementById('content-orders-tracking');
	page.els.ordersRemove = document.getElementById('content-orders-remove');
	page.els.ordersCheck3p = document.getElementById('check-orders-3p');
	page.els.ordersCheckedSave = document.getElementById('orders-checked-save');
	page.els.ordersRemoveConfirm = document.getElementById('box-orders-remove-confirm');
	page.els.ordersRemoveCancel = document.getElementById('box-orders-remove-cancel');
	//page.els.ordersReset = document.getElementById('content-orders-reset');

	// Header colour
	if (page.local) {
		document.getElementById('header').classList.add('local');
	}

	// Check login
	{
		let loginSuccess = false;
		if (page.userToken) {
			let formData = new FormData();

			let response = await fetch(apiServer+'users/login', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
			let data = await response.json();

			if (response.ok && data.result == 'success') {
				loginSuccess = true;
				page.user = data.user;
			}
		}

		if (!loginSuccess) {
			// Not logged in
			window.location.href = '/';
			return;
		}
	}

	// Load panels
	for (let panelType in PANEL_TYPE) {
		let panelID = PANEL_TYPE[panelType];
		let li = document.createElement('li');
		li.dataset.panel = PANEL_INFO[panelID].id;
		li.textContent = PANEL_INFO[panelID].name;
		page.els.menuList.appendChild(li);
	}

	showPanel();


	// Menu list
	addListener('#menu-list li', 'click', function(e) {
		e.preventDefault();
		showPanel({id: this.dataset.panel});
	});


	// Load store list
	var storeIDs = Object.keys(stores).sort();
	for (let storeID of storeIDs) {
		// Add entry for each store
		var store = stores[storeID];
		let radio = document.createElement('input'), label = document.createElement('label'), span = document.createElement('span');

		radio.type = 'radio';
		radio.name = 'label-store';
		radio.id = 'label-store-'+storeID;
		radio.value = storeID;

		label.setAttribute('for', radio.id);
		span.textContent = store.name;
		label.appendChild(span);
		page.els.getOrderForm.appendChild(radio);
		page.els.getOrderForm.appendChild(label);

		// Button to add order row
		let button = document.createElement('button');
		button.className = 'add-row-store action-btn';
		button.dataset.id = storeID;
		button.textContent = 'Add '+store.name;
		page.els.getOrderDiv.appendChild(button);
	}

	// Select the first option
	page.els.getOrderForm.querySelectorAll('input')[0].checked = true;

	// Store order buttons
	addListener('#content-get-order .add-row-store', 'click', function() {
		let data = {
			BuyerFullName: stores[this.dataset.id].name,
			BuyerAddress1: storeAddress.address1,
			BuyerCity: storeAddress.city,
			BuyerState: storeAddress.state,
			BuyerPostCode: storeAddress.postcode,
		};

		addOrder(page.selectedPanel, data, {addStore: true});
	});

	// Load postal data
	loadPostcodes();
	loadStates();
	loadFastwayMetroCodes();
	await loadCollectedOrders();
	await loadItemDetails();

	

	




	// Get order
	page.els.getOrderID.addEventListener('click', () => getOrder(), false);
	page.els.getOrderDBID.addEventListener('click', () => getOrder(true), false);

	// Show orders
	page.els.addRow.addEventListener('click', () => addTableRows(), false);

	// Select/de-select all orders
	addListener('.content-page table thead th.select-all', 'click', selectAllOrders);
	addListener('.content-page table thead th.select-all input', 'change', selectAllOrders);

	// Duplicate order
	page.els.ordersDuplicate.addEventListener('click', duplicateOrder, false);

	// Save orders
	page.els.ordersSave.addEventListener('click', saveDocument, false);

	// Get tracking links for orders
	page.els.ordersTracking.addEventListener('click', orderTrackingLinks, false);

	// Remove orders
	page.els.ordersRemove.addEventListener('click', removeOrders, false);
	page.els.ordersRemoveConfirm.addEventListener('click', removeOrdersConfirm, false);
	page.els.ordersRemoveCancel.addEventListener('click', closeBox, false);

	page.els.ordersCheck3p.addEventListener('click', check3kgPlusOrders, false);
	page.els.ordersCheckedSave.addEventListener('click', saveSelectedOrders, false);

	// Focus order number box
	addListener('#content-get-order form input[name="label-store"]', 'click', clearRecordNum);

	function clearRecordNum() {
		page.els.getOrderInput.value = '';
		page.els.getOrderInput.focus();
	}

	// Ability to press enter to get the order
	page.els.getOrderInput.addEventListener('keyup', function(e) {
		if (e.key == 'Enter' || e.key == '↵') {
			getOrder();
		}
	}, false);


	// Close popup box
	addListener('#box-container .close', 'click', closeBox);

	// Don't close the popup box when it's clicked
	/*addListener('#box-container > div', 'click mousedown', function(e) {
		e.stopPropagation();
	});*/

	window.onbeforeunload = function(e) {
		return 'Are you sure you want to leave this page? All data will be lost.';
	};
});


window.addEventListener('keydown', function(e) {
	if (!page.selectedPanel || e.target.tagName.toLowerCase() == 'input') return;

	// Disable content editing
	if (e.ctrlKey && e.shiftKey) {
		let tds = document.querySelectorAll('.content-page table tbody td');
		for (let td of tds) {
			td.contentEditable = false;
		}
	}

	// Switch stores using keys
	/*if (e.keyCode >= 97 && e.keyCode <= 105) {
		let storeEl = document.getElementById('label-store-'+(e.keyCode % 96));
		if (storeEl) {
			storeEl.checked = true;
			clearRecordNum();
			e.preventDefault();
			return false;
		}
	}*/
});

window.addEventListener('keyup', function(e) {
	// Enable content editing
	if (!e.ctrlKey || !e.shiftKey) {
		var table = document.querySelector('.content-page:not(.hide) table');
		if (!table) return;
		var tableHeaderTh = table.querySelectorAll('thead th');
		var tableBodyTrs = table.querySelectorAll('tbody tr');
	
		for (let tr of tableBodyTrs) {
			let tds = tr.querySelectorAll('td');
			for (let i = 0; i < tds.length; i++) {
				if (tableHeaderTh[i].dataset.name) {
					tds[i].contentEditable = true;
				}
			}
		}
	}
});

// Paste order data
window.addEventListener('paste', function(e) {
	if (!page.selectedPanel) return;

	// Get clipboard contents
	try {
		let orderData = JSON.parse(e.clipboardData.getData('text'));

		if (typeof orderData !== 'object') return;

		e.preventDefault();

		// Add orders to the table
		addOrders(page.selectedPanel, orderData);
	}
	catch(e) {}
});


// Change template screen and add order data
window.addEventListener('message', async function(e) {
	if (typeof e.data != 'object') return;
	await Promise.all([loadPostcodes(), loadStates(), loadFastwayMetroCodes(), loadCollectedOrders()]);
	await loadItemDetails();
	//console.log(e.data);
	if (e.data.repeat == 1) {
		showPanel({id: 'template-repeatcustomer'});
		addOrders(PANEL_TYPE['REPEATCUSTOMER'], e.data.data, e.data.type);
		return;
	}

	for (let panelType in PANEL_INFO) {
		if (PANEL_INFO[panelType].types.includes(e.data.type)) {
			showPanel({id: PANEL_INFO[panelType].id});
			addOrders(panelType, e.data.data, e.data.type);
			break;
		}
	}
});


// Save document using Ctrl+S
window.addEventListener('keydown', function(e) {
	if (page.selectedPanel && e.ctrlKey && e.key == 's') {
		saveDocument();
		e.preventDefault();
		e.stopPropagation();
	}
});

addListener('#header .menu', 'click', function(e) {
	window.location.href = '/';
});


// Load postcode data
async function loadPostcodes() {
	if (Object.keys(postData.postcodes).length) return;

	let response;
	try {
		response = await fetch('australia-postcodes.json');
		//response = await fetch('australia-postcodes-raw.json');
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	if (response.ok) {
		postData.postcodes = await response.json();
	}
	else {
		page.notification.show('Error: '+data.result);
	}
}

// Load states data
async function loadStates() {
	if (Object.keys(postData.states).length) return;

	let response;
	try {
		response = await fetch('australia-states.json');
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	if (response.ok) {
		postData.states = await response.json();
	}
	else {
		page.notification.show('Error: '+data.result);
	}
}

// Load Fastway Metro
async function loadFastwayMetroCodes() {
	try {
		fastwayMetroCodes = await (await fetch('../../order-collect/fastway-metro-list.json')).json();
	}
	catch (e) {
		page.notification.show('Error: Could not load fastway metro code data.', {hide: false});
	}
}

// Load item details
async function loadItemDetails() {
	let recordList = [];
	for (let store in saleRecords) {
		for (let record in saleRecords[store].today){
			recordList.push([store, record]);
		}
	}
	//console.log(recordList);
	await getItemDetails(recordList);
}

// Load collected orders
async function loadCollectedOrders() {
	let pageUrl = apiServer+'orders/load?store=all&day=all&status=12';
	try {
		var response = await fetch(pageUrl, {headers: {'DC-Access-Token': page.userToken}});
		var data = await response.json();
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
		return;
	}

	if (response.ok) {
		if (data.result != 'success') {
			page.notification.show(data.result, {hide: false});
			return;
		}

		if (data.orders) {
			saleRecords = data.orders;
		}

	}
}

// Load order data from the server
async function loadOrders() {
	var startDate = new Date(), today = new Date();
	startDate.setDate(startDate.getDate() - 120); // 4 months ago

	try {
		let response = await fetch(apiServer+'orders/load?store=all&day='+getDateValue(startDate)+'&endday='+getDateValue(today)+'&noconnected=1&keepallrecords=1', {headers: {'DC-Access-Token': page.userToken}});
		let data = await response.json();

		if (!response.ok) {
			page.notification.show('Error: '+data.result);
		}

		if (data.result == 'success') {
			saleRecords = data.orders;
			//page.notification.show('Sales records loaded.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(data.result);
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}
}


// Get order from database using database ID or store, record number
async function getOrder(isDBID = false) {
	var store = page.els.getOrderForm.querySelector('input[name="label-store"]:checked').value;
	var orderInputID = page.els.getOrderInput.value.trim();
	var gotStore = false;

	page.els.getOrderID.disabled = true;
	page.els.getOrderDBID.disabled = true;

	do {
		if (!Object.keys(saleRecords).length) {
			await loadOrders();
		}

		// Check order value
		if (orderInputID) {
			let dashIndex = orderInputID.indexOf('-');
			if (dashIndex != -1) {
				// Record parts - [store, record number]
				let recordParts = [orderInputID.slice(0, dashIndex), orderInputID.slice(dashIndex + 1)];

				if (reDigits.test(recordParts[0])) {
					// Database ID
					store = recordParts[0];
					orderInputID = recordParts[1];
					isDBID = true;
					gotStore = true;
				}
				else {
					// Record number
					let inputStore = recordParts[0].toLowerCase();
					for (let id in stores) {
						if (stores[id].storeID.toLowerCase() == inputStore) {
							store = id;
							orderInputID = recordParts[1];
							isDBID = false;
							gotStore = true;
							break;
						}
					}
				}
			}
		}

		if (!orderInputID) {
			page.notification.show('Please enter an order number.');
			break;
		}

		// Check if the record is in current sales records
		let orderData = null;
		if (isDBID) {
			// Database ID
			if (!gotStore) {
				for (let storeID in saleRecords) {
					if (saleRecords[storeID].records[orderInputID]) {
						store = storeID;
						break;
					}
				}
			}

			if (saleRecords.hasOwnProperty(store) && saleRecords[store].records.hasOwnProperty(orderInputID)) {
				orderData = saleRecords[store].records[orderInputID];
			}
		}
		else {
			// Record number
			if (saleRecords[store]) {
				for (let orderID in saleRecords[store].records) {
					let rowData = saleRecords[store].records[orderID];
					if (rowData.SalesRecordID == orderInputID || rowData.OrderID == orderInputID) {
						orderData = rowData;
						break;
					}
				}
			}
				
		}

		if (orderData) {
			addOrder(page.selectedPanel, orderData);
			page.notification.show('Order '+(orderData.SalesRecordID || orderInputID)+' has been added.', {background: 'bg-lgreen'});
			page.els.getOrderInput.focus();
		}
		else {
			let formData = new FormData();
			if (isDBID) {
				formData.append('store', store);
				formData.append('dataBaseID', orderInputID);
			}else{
				formData.append('store', store);
				formData.append('salesRecordID', orderInputID);
			}

			let ordersResponse = await fetch(apiServer+'order/get', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
			let ordersData = await ordersResponse.json();
			
			if (ordersData.result == 'success') {
				let order = JSON.parse(JSON.stringify(ordersData.order));
				addOrder(page.selectedPanel, order);
				page.notification.show('Order '+(order.SalesRecordID || orderInputID)+' has been added.', {background: 'bg-lgreen'});
			}else{
				page.notification.show('Order number does not exist.');
			}
			
		}
	} while(0)

	page.els.getOrderID.disabled = false;
	page.els.getOrderDBID.disabled = false;
}


// Add orders to table
function addOrder(type, rowData, options = null) {
	addTableRows([formatOrder(type, rowData, options)]);
}

function addOrders(type, rowData, orderType) {
	let tableRowData = [];
	for (let row of rowData) {
		tableRowData.push(formatOrder(type, row, {prepared: true}, orderType));
	}
	addTableRows(tableRowData);
}

// Add rows to table
function addTableRows(data = null) {
	var table = document.querySelector('#content-container .content-page:not(.hide) table');
	if (!table) return;
	var tableBody = table.querySelector('tbody');
	var tableHeaderTh = table.querySelectorAll('thead th[data-name]');
	var hiddenCols = {};

	// Get indices of columns that should be hidden
	for (let i = 0; i < tableHeaderTh.length; i++) {
		if (tableHeaderTh[i].classList.contains('hide')) {
			hiddenCols[i] = true;
		}
	}

	if (data) {
		// Add each data row
		for (let row of data) {
			//console.log(row);
			let tr = document.createElement('tr'), td = document.createElement('td');
			td.className = 'selected';
			td.appendChild(createCheckbox());
			tr.appendChild(td);

			for (let i = 0; i < row.length; i++) {
				let td = document.createElement('td');
				td.contentEditable = true;
				if (tableHeaderTh[i].dataset.id) td.dataset.id = tableHeaderTh[i].dataset.id;
				if (row[i] && td.dataset.id != 'pre_orders') td.textContent = row[i];
				if (hiddenCols[i]) td.className = 'hide';

				// Convert to lowercase and capitalise first letter
				if (td.dataset.id == 'item_name' && td.textContent) td.textContent = td.textContent[0].toUpperCase() + td.textContent.slice(1).toLowerCase();
				if (td.dataset.id == 'pre_orders') {
					let orders = row[i].split('|');
					for (let order of orders) {
						let pre = document.createElement('pre');
						pre.textContent = order;
						td.appendChild(pre);
					}
				}

				tr.appendChild(td);
			}
			tableBody.appendChild(tr);
		}
	}
	else {
		// Add an empty row
		let tr = document.createElement('tr'), td = document.createElement('td');
		td.className = 'selected';
		td.appendChild(createCheckbox());
		tr.appendChild(td);

		for (let th_i = 0; th_i < tableHeaderTh.length; th_i++) {
			let td = document.createElement('td');
			td.contentEditable = true;
			if (tableHeaderTh[th_i].dataset.id) td.dataset.id = tableHeaderTh[th_i].dataset.id;
			if (tableHeaderTh[th_i].dataset.default) td.textContent = tableHeaderTh[th_i].dataset.default;
			if (hiddenCols[th_i]) td.classList.add('hide');
			tr.appendChild(td);
		}
		tableBody.appendChild(tr);
	}

	updateOrderListeners(true);
}

function createCheckbox() {
	var checkbox = document.createElement('input');
	checkbox.type = 'checkbox';
	checkbox.setAttribute('autocomplete', 'off');
	return checkbox;
}


// Select order
function selectOrder(e) {
	if (e.target.tagName.toLowerCase() == 'input') return;
	e.target.firstChild.checked = !e.target.firstChild.checked;
}

// Select all orders
function selectAllOrders(e) {
	var tagIsInput = e.target.tagName.toLowerCase() == 'input';
	if (!tagIsInput) e.target.firstChild.checked = !e.target.firstChild.checked;

	var checked = tagIsInput ? e.target.checked : e.target.firstChild.checked;

	if (checked) {
		// Select
		var tableBodyTrs = e.target.closest('table').querySelectorAll('tbody tr:not(.hide)');
		for (let tr of tableBodyTrs) {
			tr.firstChild.firstChild.checked = true;
		}
	}
	else {
		// De-select
		var tableBodyTrs = e.target.closest('table').querySelectorAll('table tbody tr');
		for (let tr of tableBodyTrs) {
			tr.firstChild.firstChild.checked = false;
		}
	}
}

function check3kgPlusOrders() {
	var table = document.querySelector('#content-container .content-page:not(.hide) table');
	var tableBodyTrs = table.querySelectorAll('tbody tr:not(.hide)');
	for (let tr of tableBodyTrs) {
		let tds = tr.childNodes;
		if (tds[1].textContent != '') {
			if (parseFloat(tds[1].textContent) > 3) {
				tds[0].firstChild.checked = true;
			}
		}
	}
}

// Update order listeners
function updateOrderListeners(doCheckOrders = false) {
	// Order select/de-select changes
	var orderTdSelected = '.content-page:not(.hide) table tbody td.selected';
	removeListener(orderTdSelected, 'click', selectOrder);
	addListener(orderTdSelected, 'click', selectOrder);

	// Check order details
	var orderTr = '.content-page table tbody tr';
	removeListener(orderTr, 'input', checkOrders);
	addListener(orderTr, 'input', checkOrders);

	// Colour rows
	colourRows(document.querySelector('#content-container .content-page:not(.hide) table tbody'));

	// Move between cells
	var orderTd = '.content-page:not(.hide) table tbody td';
	removeListener(orderTd, 'keypress', changeCurrentCell);
	addListener(orderTd, 'keypress', changeCurrentCell);

	//page.els.filterForm.querySelectorAll('input')[0].checked = true;
	//filterOrders({target: {value : 'all'}});

	if (doCheckOrders) checkOrders();
}


// Check order details
function checkOrders() {
	var table = document.querySelector('#content-container .content-page:not(.hide) table');
	if (!table) return;
	var tableHeaderTh = table.querySelectorAll('thead th');
	var tableBody = table.querySelector('tbody');
	var tableBodyTrs = tableBody.querySelectorAll('tr');
	//var orderRowsValid = true;

	// Column ID numbers
	var cols = {
		city: null,
		state: null,
		postcode: null,
	};

	// Get indices of the required columns
	for (let i = 0; i < tableHeaderTh.length; i++) {
		switch (tableHeaderTh[i].dataset.id) {
			case 'recipient_city':
				cols.city = i;
				break;
			case 'recipient_state':
				cols.state = i;
				break;
			case 'recipient_postcode':
				cols.postcode = i;
				break;
		}
	}

	for (let col in cols) {
		if (cols[col] == null) {
			page.notification.show('Error: City/state/postcode columns are missing.');
			return;
		}
	}


	// Check each order's details
	for (let tableRow of tableBodyTrs) {
		try {
			// Check if the suburb and postcode match
			let city = tableRow.children[cols.city].textContent.trim().toLowerCase();
			let state = tableRow.children[cols.state].textContent.trim().toLowerCase();
			let postcode = parseInt(tableRow.children[cols.postcode].textContent.trim(), 10).toString();

			if (!postcode || !city || !state || !postData.postcodes[postcode] || !postData.postcodes[postcode][city] || !postData.states[state] || city.includes('  ') || state.includes('  ')) {
				throw 'Error';
			}
			else {
				// Unhighlight row
				tableRow.classList.remove('bg-orange');
			}
		}
		catch (e) {
			// Possible error so highlight the row
			tableRow.classList.add('bg-orange');
			//orderRowsValid = false;
		}
	}

	/*if (!orderRowsValid) {
		page.notification.show('Possible suburb/postcode errors at the highlighted row(s)');
	}*/
}


// Save document for upload
function saveDocument() {
	var table = document.querySelector('#content-container .content-page:not(.hide) table');
	var tableBody = table.querySelector('tbody');
	var tableBodyTr = tableBody.querySelectorAll('tr');
	var tableHeaderTh = table.querySelectorAll('thead th');
	var orderRows = [];
	var headerRow = [];
	var requiredCols = {};
	var excludedCols = {};
	var orderRequiredCols = {};
	var orderNamesValid = true;
	var weightValid = true;
	let lengthIndex = null;
	let widthIndex = null;
	let heightIndex = null;
	let i;

	// Get indices of columns that should be excluded
	{
		let orderRow = [];
		for (i = 1; i < tableHeaderTh.length; i++) {
			headerRow.push(tableHeaderTh[i].dataset.name);
			if (tableHeaderTh[i].dataset.required) {
				requiredCols[i] = tableHeaderTh[i].textContent;
			}

			if (tableHeaderTh[i].dataset.exclude) {
				excludedCols[i] = true;
			}
			else {
				orderRow.push(tableHeaderTh[i].dataset.name);
			}

			if (tableHeaderTh[i].dataset.name=="A_LENGTH") {
				lengthIndex = i;
				// console.log(i);
			} 
			if (tableHeaderTh[i].dataset.name=="A_WIDTH") {
				widthIndex = i;
				// console.log(i);
			}
			if (tableHeaderTh[i].dataset.name=="A_HEIGHT") {
				heightIndex = i;
				// console.log(i);
			}
		}
		orderRows.push(orderRow);
	}

	if (!tableBodyTr.length) {
		page.notification.show('No order have been added.');
		return;
	}

	// Get each row's data
	for (let tr_i = 0; tr_i < tableBodyTr.length; tr_i++) {
		let tableRow = tableBodyTr[tr_i];
		let tds = tableRow.querySelectorAll('td');
		let orderRow = [];

		tableRow.classList.remove('bg-red');

		let weight = tds[1].textContent;
		// console.log(weight);
		let length, width, height ;


		if (weight > 0 && weight <= 1) {
			length = 10;
			width = 10;
			height = 20;
		}
		else if (weight > 1 && weight <= 1.5) {
			length = 20;
			width = 10;
			height = 20;
		} 
		else if (weight > 1.5 && weight <= 2) {
			length = 20;
			width = 20;
			height = 15;
		} 
		else if (weight > 2 && weight <= 2.5) {
			length = 20;
			width = 20;
			height = 20;
		}
		else if (weight > 2.5 && weight <= 3) {
			length = 25;
			width = 20;
			height = 20;
		} 
		else if (weight > 3 && weight <= 3.5) {
			length = 20;
			width = 30;
			height = 20;
		}
		else if (weight > 3.5 && weight <= 4) {
			length = 10;
			width = 35;
			height = 40;
		} 
		else if (weight > 4 && weight <= 4.5) {
			length = 40;
			width = 40;
			height = 10;
		}
		else if (weight > 4.5 && weight <= 5) {
			length = 20;
			width = 45;
			height = 20;
		} 
		else if (weight > 5 && weight <= 5.5) {
			length = 50;
			width = 20;
			height = 20;
		}
		else if (weight > 5.5 && weight <= 6) {
			length = 20;
			width = 20;
			height = 55;
		} 
		else if (weight > 6 && weight <= 6.5) {
			length = 40;
			width = 15;
			height = 40;
		}
		else if (weight > 6.5 && weight <= 7) {
			length = 20;
			width = 20;
			height = 65;
		} 
		else if (weight > 7 && weight <= 7.5) {
			length = 70;
			width = 20;
			height = 20;
		}
		else if (weight > 7.5 && weight <= 8) {
			length = 20;
			width = 75;
			height = 20;
		} 
		else if (weight > 8 && weight <= 8.5) {
			length = 40;
			width = 20;
			height = 40;
		}
		else if (weight > 8.5 && weight <= 9) {
			length = 40;
			width = 17;
			height = 50;
		} 
		else if (weight > 9 && weight <= 9.5) {
			length = 50;
			width = 18;
			height = 40;
		}
		else if (weight > 9.5 && weight <= 10) {
			length = 20;
			width = 38;
			height = 50;
		} 
		else if (weight > 10 && weight <= 10.5) {
			length = 40;
			width = 20;
			height = 50;
		}
		else if (weight > 10.5 && weight <= 11) {
			length = 20;
			width = 42;
			height = 50;
		} 
		else if (weight > 11 && weight <= 11.5) {
			length = 50;
			width = 22;
			height = 40;
		}
		else if (weight > 11.5 && weight <= 12) {
			length = 50;
			width = 40;
			height = 23;
		} 
		else if (weight > 12 && weight <= 12.5) {
			length = 20;
			width = 40;
			height = 60;
		}
		else if (weight > 12.5 && weight <= 13) {
			length = 20;
			width = 50;
			height = 50;
		} 
		else if (weight > 13 && weight <= 13.5) {
			length = 20;
			width = 52;
			height = 50;
		}
		else if (weight > 13.5 && weight <= 14) {
			length = 30;
			width = 60;
			height = 30;
		} 
		else if (weight > 14 && weight <= 14.5) {
			length = 28;
			width = 40;
			height = 50;
		}
		else if (weight > 14.5 && weight <= 15) {
			length = 20;
			width = 58;
			height = 50;
		} 
		else if (weight > 15 && weight <= 15.5) {
			length = 30;
			width = 40;
			height = 50;
		}
		else if (weight > 15.5 && weight <= 16) {
			length = 20;
			width = 62;
			height = 50;
		} 
		else if (weight > 16 && weight <= 16.5) {
			length = 50;
			width = 20;
			height = 64;
		}
		else if (weight > 16.5 && weight <= 17) {
			length = 20;
			width = 50;
			height = 66;
		} 
		else if (weight > 17 && weight <= 17.5) {
			length = 68;
			width = 20;
			height = 50;
		}
		else if (weight > 17.5 && weight <= 18) {
			length = 20;
			width = 70;
			height = 50;
		} 
		else if (weight > 18 && weight <= 18.5) {
			length = 45;
			width = 40;
			height = 40;
		}
		else if (weight > 18.5 && weight <= 19) {
			length = 40;
			width = 50;
			height = 37;
		} 
		else if (weight > 19 && weight <= 19.5) {
			length = 40;
			width = 38;
			height = 50;
		}
		else if (weight > 19.5 && weight <= 20) {
			length = 60;
			width = 26;
			height = 50;
		} 
		else if (weight > 20 && weight <= 20.5) {
			length = 50;
			width = 40;
			height = 40;
		}
		else if (weight > 20.5 && weight <= 21) {
			length = 40;
			width = 41;
			height = 50;
		} 
		else if (weight > 21 && weight <= 21.5) {
			length = 50;
			width = 60;
			height = 28;
		}
		else if (weight > 21.5 && weight <= 22) {
			length = 40;
			width = 43;
			height = 50;
		} 

		// Save each value
		for (let td_i = 1; td_i < tds.length; td_i++) {
			if (excludedCols[td_i]) continue;
			let td = tds[td_i];
			let entryName = headerRow[td_i - 1];
			let entryValue = td.textContent;

			// Check required columns
			if (requiredCols[td_i] && entryValue === '') {
				// Highlight the row
				tableRow.classList.add('bg-red');
				orderRequiredCols[requiredCols[td_i]] = true;
			}

			// Check the length of the buyer's name
			if (page.selectedPanel == PANEL_TYPE.AUSPOST || page.selectedPanel == PANEL_TYPE.EXPRESS || page.selectedPanel == PANEL_TYPE.INTERNATIONAL) {
				if (entryName == 'C_CONSIGNEE_NAME' && entryValue.length > page.buyerNameMaxLen) {
					// Highlight the row
					tableRow.classList.add('bg-red');
					orderNamesValid = false;
				}
				else if (entryName == 'ebay_item_number' || entryName == 'ebay_transaction_id') {
					// Don't save multiple item/transaction ID entries
					if (entryValue.includes('|')) {
						entryValue = '';
					}
				}
			}

			if (page.selectedPanel == PANEL_TYPE.AUSPOST) {
				if (entryName == 'A_ACTUAL_CUBIC_WEIGHT' && parseFloat(entryValue) > page.MaxWeight) {
					// Highlight the row
					tableRow.classList.add('bg-red');
					weightValid = false;
				}
			}

			/*if (td_i==lengthIndex) {
				// console.log(i==lengthIndex);
				entryValue = length;
			} 
			if (td_i==widthIndex) {
				// console.log(i==lengthIndex);
				entryValue = width;
			}
			if (td_i==heightIndex) {
				// console.log(i==lengthIndex);
				entryValue = height;
			}*/

			orderRow.push(entryValue);
		}

		// Save the row
		orderRows.push(orderRow);
	}

	if (Object.keys(orderRequiredCols).length) {
		page.notification.show('The following columns at the highlighted row(s) cannot be blank: '+Object.keys(orderRequiredCols).join(', '));
		return;
	}
	else if (!orderNamesValid) {
		page.notification.show('The buyer name(s) at the highlighted row(s) cannot be longer than '+page.buyerNameMaxLen+' characters.');
		return;
	}
	else if (!weightValid) {
		page.notification.show('The weight(s) at the highlighted row(s) cannot be greater than '+page.MaxWeight+' kgs.');
		//return;
	}

	// Create document for upload
	switch (parseInt(page.selectedPanel || '-1', 10)) {
		case PANEL_TYPE.AUSPOST:
			createTemplateEparcelsCSV(orderRows);
			break;
		case PANEL_TYPE.REPEATCUSTOMER:
			createTemplateEparcels(orderRows);
			break;
		case PANEL_TYPE.FASTWAY:
			// Excldue the the header row
			createTemplateFastway(orderRows.slice(1));
			break;
		case PANEL_TYPE.FWFP:
			createTemplateEparcels(orderRows);
			break;
		case PANEL_TYPE.EXPRESS:
			createTemplateEparcelsCSV(orderRows);
			break;
		case PANEL_TYPE.INTERNATIONAL:
			createTemplateInternationalEparcelsCSV(orderRows);
			break;
		case PANEL_TYPE.DELIVERE:
			createTemplateDelivere(orderRows.slice(1));
			break;
		default:
			page.notification.show('Unknown document type.');
	}
}


// Save selected orders
function saveSelectedOrders() {
	var table = document.querySelector('#content-container .content-page:not(.hide) table');
	var tableBody = table.querySelector('tbody');
	var tableBodyTr = tableBody.querySelectorAll('tr');
	var tableHeaderTh = table.querySelectorAll('thead th');
	var orderRows = [];
	var headerRow = [];
	var requiredCols = {};
	var excludedCols = {};
	var orderRequiredCols = {};
	var orderNamesValid = true;

	// Get indices of columns that should be excluded
	{
		let orderRow = [];
		for (let i = 1; i < tableHeaderTh.length; i++) {
			headerRow.push(tableHeaderTh[i].dataset.name);
			if (tableHeaderTh[i].dataset.required) {
				requiredCols[i] = tableHeaderTh[i].textContent;
			}

			if (tableHeaderTh[i].dataset.exclude) {
				excludedCols[i] = true;
			}
			else {
				orderRow.push(tableHeaderTh[i].dataset.name);
			}
		}
		orderRows.push(orderRow);
	}

	if (!tableBodyTr.length) {
		page.notification.show('No order have been added.');
		return;
	}

	// Get each row's data
	for (let tr_i = 0; tr_i < tableBodyTr.length; tr_i++) {
		let tableRow = tableBodyTr[tr_i];
		let tds = tableRow.querySelectorAll('td');
		let orderRow = [];

		tableRow.classList.remove('bg-red');

		// Save each value
		if (tds[0].firstChild.checked == true) {
			for (let td_i = 1; td_i < tds.length; td_i++) {
				if (excludedCols[td_i]) continue;
				let td = tds[td_i];
				let entryName = headerRow[td_i - 1];
				let entryValue = td.textContent;

				orderRow.push(entryValue);
			}
			// Save the row
			orderRows.push(orderRow);
		}
		
	}


	// Create document for upload
	switch (parseInt(page.selectedPanel || '-1', 10)) {
		case PANEL_TYPE.AUSPOST:
			createTemplateEparcelsCSV(orderRows);
			break;
		case PANEL_TYPE.REPEATCUSTOMER:
			createTemplateEparcels(orderRows);
			break;
		case PANEL_TYPE.FASTWAY:
			// Excldue the the header row
			createTemplateFastway(orderRows.slice(1));
			break;
		case PANEL_TYPE.FWFP:
			createTemplateEparcels(orderRows);
			break;
		case PANEL_TYPE.EXPRESS:
			createTemplateEparcelsCSV(orderRows);
			break;
		case PANEL_TYPE.INTERNATIONAL:
			createTemplateInternationalEparcelsCSV(orderRows);
			break;
		default:
			page.notification.show('Unknown document type.');
	}
}


// Duplicate the selected order row
function duplicateOrder() {
	// Find selected row
	var tableBodyTrs = document.querySelectorAll('#content-container .content-page:not(.hide) tbody tr');
	var selectedRows = [];

	for (let tr of tableBodyTrs) {
		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput && selectedInput.checked) {
			selectedRows.push(tr);
		}
	}

	if (selectedRows.length) {
		if (selectedRows.length == 1) {
			let tr = selectedRows[0];

			// De-select the row
			tr.firstChild.querySelector('input').checked = false;

			// Duplicate the row
			let trClone = tr.cloneNode(true);
			if (tr.nextSibling) {
				tr.parentNode.insertBefore(trClone, tr.nextSibling);
			}
			else {
				tr.parentNode.appendChild(trClone);
			}

			updateOrderListeners(true);
		}
		else {
			page.notification.show('Only one order can be duplicated at a time.');
		}
	}
	else {
		page.notification.show('No orders selected.');
	}
}


// Create tracking links for the orders of each store
function orderTrackingLinks() {
	var table = document.querySelector('#content-container .content-page:not(.hide) table');
	var tableHeaderTh = table.querySelectorAll('thead th');
	var tableBodyTr = table.querySelectorAll('tbody tr');
	var trackingLinkData = ['http://payments.ebay.com.au/ws/eBayISAPI.dll?AddTrackingNumber2', '&flow=2&from=1&cm=&pg=&islpvcode=&ru='];
	var trackingData = {}, trackingCols = {}, trackingLinks = [];

	for (let store in stores) {
		trackingData[store] = [];
	}

	// Get indices of item number and transaction ID columns
	for (let i = 1; i < tableHeaderTh.length; i++) {
		switch (tableHeaderTh[i].dataset.id) {
			case 'order_reference':
				trackingCols['order_reference'] = i;
				break;
			case 'ebay_item_number':
				trackingCols['ebay_item_number'] = i;
				break;
			case 'ebay_transaction_id':
				trackingCols['ebay_transaction_id'] = i;
				break;
		}
	}

	// Get each row's data
	try {
		for (let tableRow of tableBodyTr) {
			let tds = tableRow.querySelectorAll('td');
			//console.log(tds);
			//console.log(trackingCols['ebay_item_number']);
			let orderReference = tds[trackingCols['order_reference']].textContent;
			let itemID = tds[trackingCols['ebay_item_number']].textContent;
			let transactionID = tds[trackingCols['ebay_transaction_id']].textContent;
			let currentStore = null;

			// Find current store
			for (let store in stores) {
				if (orderReference.indexOf(stores[store].recID) == 0) {
					// Save the records
					currentStore = store;
					break;
				}
			}
			if (!currentStore) {
				page.notification.show('Invalid store for order ' + orderReference);
				return;
			}

			// Check for and save multiple item/transaction IDs
			let itemIDParts = itemID.split('|');
			let transactionIDParts = transactionID.split('|');
			for (let i = 0; i < itemIDParts.length; i++) {
				if (!itemIDParts[i] || !transactionIDParts[i]) continue;
				trackingData[currentStore].push(itemIDParts[i] + '_' + transactionIDParts[i]);
			}
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Invalid or incorrect order data.');
		return;
	}
	
	// Add tracking page links for each store
	for (let store in trackingData) {
		if (!trackingData[store].length) continue;
		let trackingLineStr = '';

		for (let trackingDataLink of trackingData[store]) {
			trackingLineStr += '&LineID='+trackingDataLink;
		}

		// Save tracking link
		trackingLinks.push(stores[store].name + ': ' + trackingLinkData[0] + trackingLineStr.trim() + trackingLinkData[1]);
	}

	// Copy tracking links to clipboard
	if (trackingLinks.length) {
		copyToClipboard(trackingLinks.join('\n')+'\n');
		page.notification.show('Tracking links have been copied to the clipboard.', {background: 'bg-lgreen'});
	}
	else {
		page.notification.show('There was nothing to copy to the clipboard.', {background: 'bg-orange'});
	}
}


// Colour rows
function colourRows(tableBody) {
	var trs = tableBody.querySelectorAll('tr:not(.hide)');
	var coloured = false;

	for (let tr of trs) {
		tr.classList[coloured ? 'add' : 'remove']('colour');
		if (!tr.classList.contains('msg1')) coloured = !coloured;
	}
}

// Move between table cells using arrow buttons
function changeCurrentCell(e) {
	var td = e.target;
	var sibling = null;
	var caretPosition = getCaretPosition(td);

	switch (e.key) {
		case 'ArrowLeft':
			if (caretPosition == 0) sibling = previousVisibleSibling(td, true);
			break;
		case 'ArrowRight':
			if (caretPosition == td.textContent.length) sibling = nextVisibleSibling(td, true);
			break;
		case 'ArrowUp':
			let previousRow = previousVisibleSibling(td.parentNode);
			if (previousRow) sibling = previousRow.children[td.cellIndex];
			break;
		case 'ArrowDown':
			let nextRow = nextVisibleSibling(td.parentNode);
			if (nextRow) sibling = nextRow.children[td.cellIndex];
			break;
	}

	if (sibling) selectElement(sibling);
}

function previousVisibleSibling(el, editable = false) {
	while (el.previousElementSibling) {
		if (!el.previousElementSibling.classList.contains('hide') && (!editable || el.previousElementSibling.isContentEditable)) {
			return el.previousElementSibling;
		}
		el = el.previousElementSibling;
	}
	return null;
}
function nextVisibleSibling(el, editable = false) {
	while (el.nextElementSibling) {
		if (!el.nextElementSibling.classList.contains('hide') && (!editable || el.nextElementSibling.isContentEditable)) {
			return el.nextElementSibling;
		}
		el = el.nextElementSibling;
	}
	return null;
}


// Show confirmation box for deleting orders
function removeOrders() {
	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('box-orders-remove').classList.remove('hide');
}

// Remove orders
function removeOrdersConfirm() {
	closeBox();

	var tableBody = document.querySelector('#content-container .content-page:not(.hide) tbody');
	var tableBodyTrs = tableBody.querySelectorAll('tr');
	var removed = false;

	for (let tr_i = tableBodyTrs.length - 1; tr_i >= 0; tr_i--) {
		let tr = tableBodyTrs[tr_i];
		let selectedInput = tr.firstChild.querySelector('input');

		if (selectedInput && selectedInput.checked) {
			tableBody.removeChild(tr);
			removed = true;
		}
	}

	if (!removed) {
		page.notification.show('No orders selected.');
		return;
	}

	updateOrderListeners();
}


function showPanel(data = {}) {
	var menuListUl = document.querySelector('#menu-list ul');
	var tabId = data.id;

	// Select menu item
	var menuItem = tabId ? menuListUl.querySelector('li[data-panel="'+tabId+'"]') : menuListUl.children[0];
	if (!tabId) tabId = menuItem.dataset.panel;
	if (!tabId) return;

	var selected = menuListUl.querySelector('.selected');
	if (selected) selected.classList.remove('selected');
	menuItem.classList.add('selected');

	// Show panel
	var contentPanels = document.querySelectorAll('#content-container > .content-page');
	for (var i = 0; i < contentPanels.length; ++i) {
		contentPanels[i].classList.add('hide');
	}

	document.getElementById(tabId).classList.remove('hide');

	// Set selected panel
	page.selectedPanel = null;
	for (let panelType in PANEL_INFO) {
		if (PANEL_INFO[panelType].id == tabId) {
			page.selectedPanel = panelType;
			break;
		}
	}

	var action = page.selectedPanel == null ? 'add' : 'remove';
	page.els.getOrderDiv.classList[action]('hide');
	page.els.actionButtons.classList[action]('hide');

	/*console.log(page.selectedPanel);
	console.log(PANEL_TYPE['AUSPOST']);*/
	if (page.selectedPanel && page.selectedPanel == PANEL_TYPE['AUSPOST']) {
		page.els.ordersCheck3p.classList.remove('hide');
		page.els.ordersCheckedSave.classList.remove('hide');
	} else {
		page.els.ordersCheck3p.classList.add('hide');
		page.els.ordersCheckedSave.classList.add('hide');
	}

	/*if (tabId == 'content-show-orders') {
		if (!page.ordersLoaded) getOrders();
	}*/
}


// Close popup box
function closeBox() {
	document.getElementById('box-outer').classList.remove('flex');
	var divs = document.querySelectorAll('#box-container > div:not(.close)');
	for (let div of divs) {
		div.classList.add('hide');
	}
}
