import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener, checkLogin} from '/common/tools.js';
import {getItemDetails} from '../order-collect/js/item-details.js';


window.page = {
	//liveMessages: new LiveMessages(wsServer),
	notification: new NotificationBar(),
	orders: {},
	type: 'Search',
	tab: null,
	user: {
		id: '',
		username: '',
		firstname: '',
		lastname: '',
		type: '',
	},
	userToken: localStorage.getItem('usertoken') || '',
	local: window.location.hostname.startsWith('192.168'),
	localUser: !!localStorage.getItem('local'),
	loadTime: 0,
};

window.convert = {"title": "ItemTitle", "sku": "SKU", "name": "Name", "tracking": "trackingID"};
window.saleRecords = {};
window.header = ['Store', 'Name', 'Sales Record', 'Title', 'Sku', 'Quantity', 'Status', 'Tracking', 'Paid Date', 'Packed time'];

if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});

	document.querySelector('#content-order-summary #content-orders-search').addEventListener('click', searchOrders, false);
	document.querySelector('#content-order-summary #content-orders-filter #datefrom').addEventListener('change', filterFrom, false);
	document.querySelector('#content-order-summary #content-orders-filter #dateto').addEventListener('change', filterTo, false);
	document.querySelector('#content-order-summary table thead th.selected-all').addEventListener('click', selectAllOrders, false);
	document.querySelector('#content-order-summary table thead th.selected-all input').addEventListener('change', selectAllOrders, false);
	document.getElementById('content-orders-save').addEventListener('click', saveDocument, false);
	document.getElementById('content-orders-selected-save').addEventListener('click', saveDocumentSelected, false);
	
});

// Load the sales records from the server
async function searchOrders() {
	// Load orders
	var pageUrl = apiServer+'orders/search';
	let formData = new FormData();
	let keywords = document.querySelector('#content-orders-searchbar input').value.toLowerCase();
	let field = document.querySelector('#content-orders-searchfield input[name="searchfield"]:checked').value;

	//console.log(field);

	if (!keywords)  {
		page.notification.show('Please enter keywords in the search bar.');
		return;
	}

	formData.append('keywords', keywords);
	formData.append('field', field);

	let response, data;
	try {
		response = await fetch(pageUrl, {method: 'post', body: formData});
		data = await response.json();
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
			//console.log(data.orders);
			// Get the data
			for (let store in data.orders) {
				saleRecords[store] = data.orders[store];
			}
			let cols = window.header;
			let colsEditable = {
				
			};

			var tableBody = document.querySelector('#content-order-summary table tbody');

			while (tableBody.firstChild) {
				tableBody.removeChild(tableBody.firstChild);
			}

			for (let storeID in saleRecords) {
				let orders = saleRecords[storeID];
				for (let order of orders) {
					let items = order.data.Items;
					for (let item of items) {
						if ((field == 'title' || field == 'sku') && !item[convert[field]].toLowerCase().includes(keywords)) continue;
						let tr = document.createElement('tr');
						let td = document.createElement('td'), input = document.createElement('input');
						td.className = 'selected';
						input.type = 'checkbox';
						input.autocomplete = 'off';
						td.appendChild(input);
						tr.appendChild(td);

						for (let col of cols) {
							let td = document.createElement('td');
							td.dataset.col = col;
							if (colsEditable.hasOwnProperty(col)) td.contentEditable = true;

							let text = '';
							switch (col) {
								case 'Store':
									text = stores[storeID].name;
									break;
								case 'Name':
									text = order.data.BuyerFullName;
									break;
								case 'Sales Record':
									text = order.data.SalesRecordID;
									break;
								case 'Title':
									text = item.ItemTitle;
									break;
								case 'Sku':
									text = item.SKU;
									break;
								case 'Quantity':
									text = item.Quantity;
									break;
								case 'Status':
									text = ORDER_STATUS_NAME[order.status];
									break;
								case 'Tracking':
									text = order.trackingID ? JSON.parse(order.trackingID) : order.trackingID;
									break;
								case 'Paid Date':
									text = order.data.PaidDate;
									break;
								case 'Packed time':
									text = order.packtime;
									break;
								default:
									text = '';
							}

							td.textContent = text || '';
							tr.appendChild(td);
						}

						tableBody.appendChild(tr);
					}
						
				}
					
			}
			

		}

		if (data.errors && Array.isArray(data.errors) && data.errors.length) {
			page.notification.show('Warning: Sale record data could not be loaded for one or more records. These records might be older than the loaded date range, might have been deleted or might not exist in the system.', {background: 'bg-orange', hide: false, dontOverlap: true});
			for (let item of data.errors) {
				console.warn('Warning: Could not load sale record data for record ['+item[0]+', '+item[1]+']');
			}
		}
	}
	else {
		page.notification.show('Error: '+data.result);
	}
}

function selectAllOrders(e) {
	var tagIsInput = e.target.tagName.toLowerCase() == 'input';
	if (!tagIsInput) e.target.firstChild.checked = !e.target.firstChild.checked;

	var checked = tagIsInput ? e.target.checked : e.target.firstChild.checked;

	if (checked) {
		// Select
		let tableBodyTrs = e.target.closest('.content-page').querySelectorAll('table tbody tr:not(.hide)');
		for (let tr of tableBodyTrs) {
			tr.firstChild.firstChild.checked = true;
		}
	}
	else {
		// De-select
		let tableBodyTrs = e.target.closest('.content-page').querySelectorAll('table tbody tr');
		for (let tr of tableBodyTrs) {
			tr.firstChild.firstChild.checked = false;
		}
	}
}

// Unselect all orders
function unselectAllOrders(el) {
	let page = el.closest('.content-page');
	let selectAllInput = page.querySelector('table thead th.selected-all input');
	let trs = page.querySelectorAll('table tbody tr');

	if (selectAllInput) selectAllInput.checked = false;
	for (let tr of trs) {
		let input = tr.firstChild.firstChild;
		if (input) input.checked = false;
	}
}

// Select all orders with tracking numbers
async function selectOrdersOutOfStock() {
	var trs = document.querySelectorAll('#content-order-summary table tbody tr:not(.hide)');
	for (let tr of trs) {
		let trackingID = tr.querySelector('td[data-col="Quantity Order"]');
		if (!trackingID || !trackingID.textContent) continue;

		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput) selectedInput.checked = true;
	}
}

// Save document for upload
function saveDocument() {
	var table = document.querySelector('#content-container .content-page:not(.hide) table');
	var tableBody = table.querySelector('tbody');
	var tableBodyTr = tableBody.querySelectorAll('tr:not(.hide)');
	var tableHeaderTh = table.querySelectorAll('thead th');
	var orderRows = [];
	var headerRow = [];
	var requiredCols = {};
	var excludedCols = {};
	var orderRequiredCols = {};
	var orderNamesValid = true;

	// Get indices of columns that should be excluded
	{
		
		headerRow = window.header;
		orderRows.push(headerRow);
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

		// Save each value
		for (let td_i = 1; td_i < tds.length; td_i++) {
			let td = tds[td_i];

			orderRow.push(td.textContent);
		}

		// Save the row
		orderRows.push(orderRow);
	}


	// Create document for upload
	createTemplate(orderRows);
		
	
}

function createTemplate(orderRows) {
	var workbook = XLSX.utils.book_new();
	var worksheet = XLSX.utils.aoa_to_sheet(orderRows);
	XLSX.utils.book_append_sheet(workbook, worksheet, page.type + '_template');
	XLSX.writeFile(workbook, page.type+'-'+getDateValue(new Date())+'.xlsx');
}


async function saveDocumentSelected() {

	var table = document.querySelector('#content-container .content-page:not(.hide) table');
	var tableBody = table.querySelector('tbody');
	var tableBodyTr = tableBody.querySelectorAll('tr:not(.hide)');
	//var tableHeaderTh = table.querySelectorAll('thead th');
	var orderRows = [];
	var headerRow = [];
	var requiredCols = {};
	var excludedCols = {};
	var orderRequiredCols = {};
	var orderNamesValid = true;

	// Get indices of columns that should be excluded
	{
		headerRow = window.header;
		orderRows.push(headerRow);
	}

	if (!tableBodyTr.length) {
		page.notification.show('No orders has been added.');
		return;
	}

	// Get each row's data
	for (let tr_i = 0; tr_i < tableBodyTr.length; tr_i++) {

		let selectedInput = tableBodyTr[tr_i].firstChild.querySelector('input');
		if (selectedInput && selectedInput.checked) {
			let tableRow = tableBodyTr[tr_i];
			let tds = tableRow.querySelectorAll('td');
			let orderRow = [];

			// Save each value
			for (let td_i = 1; td_i < tds.length; td_i++) {
				let td = tds[td_i];
				orderRow.push(td.textContent);
			}

			// Save the row
			orderRows.push(orderRow);
		}
		
	}

	if (orderRows.length <= 1) {
		page.notification.show('No orders has been selected.');
		return;
	}


	// Create document for upload
	createTemplate(orderRows);
		
}

// Filter orders
function filterOrders(e) {
	var tableBody = e.target.closest('.content-page').querySelector('table tbody');
	var tableBodyTrs = tableBody.querySelectorAll('tr');
	var checkedItem = e.target.closest('.options').querySelector('form input:checked');
	var filter = checkedItem.value;
	window.page.type = filter;

	for (let tr of tableBodyTrs) {
		// Check filters
		let showOrder = true;
		

		if (filter != tr.dataset.type) {
			showOrder = false;
		}
		

		if (showOrder) {
			// Show order
			tr.classList.remove('hide');
		}
		else {
			// Hide order
			tr.classList.add('hide');
		}
	}

}

function filterFrom() {
	let datefrom = document.querySelector('#datefrom').value;
	let dateto = document.querySelector('#dateto').value;
	datefrom = datefrom ? new Date(datefrom + ' 00:00:00') : null;
	dateto = dateto ? new Date(dateto + ' 23:59:59') : null;
	console.log(datefrom);
	var trs = document.querySelectorAll('#content-order-summary table tbody tr');
	console.log(trs);
	for (let tr of trs) {
		tr.classList.add('hide');
		let tds = tr.childNodes;
		console.log(tds);
		for (let td of tds) {
			if (td.dataset.col == 'Packed time') {
				let packedtime = new Date(td.textContent);
				console.log(packedtime);
				if ((datefrom && dateto && packedtime>datefrom && packedtime<dateto)
					|| (datefrom && !dateto && packedtime>datefrom) 
					|| (!datefrom && dateto && packedtime<dateto)
					|| (!datefrom && !dateto)) tr.classList.remove('hide');
			}
		}
	}
}

function filterTo() {
	let datefrom = document.querySelector('#datefrom').value;
	let dateto = document.querySelector('#dateto').value;
	datefrom = datefrom ? new Date(datefrom + ' 00:00:00') : null;
	dateto = dateto ? new Date(dateto + ' 23:59:59') : null;
	console.log(datefrom);
	var trs = document.querySelectorAll('#content-order-summary table tbody tr');
	for (let tr of trs) {
		tr.classList.add('hide');
		let tds = tr.childNodes;
		for (let td of tds) {
			if (td.dataset.col == 'Packed time') {
				let packedtime = new Date(td.textContent);
				if ((datefrom && dateto && packedtime>datefrom && packedtime<dateto)
					|| (datefrom && !dateto && packedtime>datefrom) 
					|| (!datefrom && dateto && packedtime<dateto)
					|| (!datefrom && !dateto)) tr.classList.remove('hide');
			}
		}
	}
}