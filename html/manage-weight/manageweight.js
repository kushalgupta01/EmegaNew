import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener, checkLogin} from '/common/tools.js';
import {getItemDetails} from '../order-collect/js/item-details.js';


window.page = {
	//liveMessages: new LiveMessages(wsServer),
	notification: new NotificationBar(),
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

window.perpages = [20, 50, 100]; 

window.itemDetails = {}; 
window.totalPage = 0;

if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});

	let pageNumber = parseInt(getQueryValue('page') || 1);
	let perpage =  parseInt(getQueryValue('perpage') || 20);
	let store =  parseInt(getQueryValue('store') || 1);

	let storeFilterForm = document.querySelector('#content-item-stores form');
	let perpageFilterForm = document.querySelector('#content-item-perpage form');
	let pageEl = document.querySelector('#pages');

	for (let storeID in stores) {
		let input = document.createElement('input');
		input.setAttribute('type', 'radio');
		input.setAttribute('name', 'store');
		input.setAttribute('id', 'store-'+storeID);
		input.setAttribute('value', storeID);
		if (storeID == store) input.checked = true;
		storeFilterForm.appendChild(input);

		let label = document.createElement('label');
		label.setAttribute('for', 'store-'+storeID);
		
		let span = document.createElement('span');
		span.textContent = stores[storeID].name;
		label.appendChild(span);

		storeFilterForm.appendChild(label);

	}

	
	for (let pg of perpages) {
		let input = document.createElement('input');
		input.setAttribute('type', 'radio');
		input.setAttribute('name', 'perpage');
		input.setAttribute('id', 'perpage-'+pg);
		input.setAttribute('value', pg);
		if (pg == perpage) input.checked = true;
		perpageFilterForm.appendChild(input);

		let label = document.createElement('label');
		label.setAttribute('for', 'perpage-'+pg);
		
		let span = document.createElement('span');
		span.textContent = pg;
		label.appendChild(span);

		perpageFilterForm.appendChild(label);

	}

	try {
		let formData = new FormData();

		formData.append('store', storeFilterForm.elements['store'].value);
		formData.append('perpage', perpageFilterForm.elements['perpage'].value);
		formData.append('page', pageNumber);

		let response = await fetch(apiServer+'weight/get', {method: 'post', body: formData});
		let data = await response.json();

		if (!response.ok) {
			page.notification.show('Error: '+data.result);
		}

		if (data.result == 'success') {
			itemDetails = data.items;
			totalPage = data.totalPage;
		}
		else {
			page.notification.show(JSON.stringify(data.result));
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	let cols = [
		'Image', 'Item Title', 'Sku', 'Item Number', 'Weight'
		
	];
	let colsEditable = {
		'Weight': 1
	};

	var tableBody = document.querySelector('#content-item-summary table tbody');
	//console.log(JSON.stringify(sumItems));

	for (let itemID in itemDetails) {
		let item = itemDetails[itemID];
		let tr = document.createElement('tr');
		tr.dataset.id = itemID;
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
				case 'Item Title':
					text = item.itemName;
					break;
				case 'Sku':
					text = item.sku;
					break;
				case 'Item Number':
					text = item.itemNo;
					break;
				case 'Weight':
					text = item.itemWeight;
					break;
				default:
					text = '';
			}

			td.textContent = text || '';

			if (col == 'Image') {
				let img = document.createElement('img');
				img.src = item.itemPhoto;
				td.appendChild(img);
			}
			tr.appendChild(td);
		}

		tableBody.appendChild(tr);
	}

	perpage = parseInt(perpageFilterForm.elements['perpage'].value);
	store = parseInt(storeFilterForm.elements['store'].value);
	
	if (pageNumber > 1) {
		let pre = document.createElement('a');
		pre.dataset.perpage = perpage;
		pre.dataset.store = store;
		pre.dataset.page = pageNumber - 1;
		pre.textContent = 'Pre';
		pageEl.appendChild(pre);
	}
	
	if (totalPage <= 10) {
		for (let i=1; i<=totalPage; i++) {
			let a = document.createElement('a');
			a.dataset.perpage = perpage;
			a.dataset.store = store;
			a.dataset.page = i;
			a.textContent = i;
			if (i==pageNumber) a.classList.add('currentPage');
			pageEl.appendChild(a);
		}
	} else {
		if (pageNumber-5<=0) {
			if (pageNumber+9<=totalPage) {
				for (let i=1; i<=pageNumber+9; i++) {
					let a = document.createElement('a');
					a.dataset.perpage = perpage;
					a.dataset.store = store;
					a.dataset.page = i;
					a.textContent = i;
					if (i==pageNumber) a.classList.add('currentPage');
					pageEl.appendChild(a);
				}
			} else {
				for (let i=totalPage-9; i<=totalPage; i++) {
					let a = document.createElement('a');
					a.dataset.perpage = perpage;
					a.dataset.store = store;
					a.dataset.page = i;
					a.textContent = i;
					if (i==pageNumber) a.classList.add('currentPage');
					pageEl.appendChild(a);
				}
			}
				
		} else {
			if (pageNumber+4<=totalPage) {
				for (let i=pageNumber-5; i<=pageNumber+4; i++) {
					let a = document.createElement('a');
					a.dataset.perpage = perpage;
					a.dataset.store = store;
					a.dataset.page = i;
					a.textContent = i;
					if (i==pageNumber) a.classList.add('currentPage');
					pageEl.appendChild(a);
				}
			} else {
				for (let i=totalPage-9; i<=totalPage; i++) {
					let a = document.createElement('a');
					a.dataset.perpage = perpage;
					a.dataset.store = store;
					a.dataset.page = i;
					a.textContent = i;
					if (i==pageNumber) a.classList.add('currentPage');
					pageEl.appendChild(a);
				}
			}
		}
	}
	if (pageNumber < totalPage) {
		let next = document.createElement('a');
		next.dataset.perpage = perpage;
		next.dataset.store = store;
		next.dataset.page = pageNumber + 1;
		next.textContent = 'Next';
		pageEl.appendChild(next);
	}

	document.querySelector('#content-item-summary table thead th.selected-all').addEventListener('click', selectAllOrders, false);
	document.querySelector('#content-item-summary table thead th.selected-all input').addEventListener('change', selectAllOrders, false);
	//document.getElementById('content-item-save').addEventListener('click', saveDocument, false);
	//document.getElementById('content-item-selected-save').addEventListener('click', saveDocumentSelected, false);
	addListener('#content-item-stores form input', 'change', changeStore);
	addListener('#content-item-perpage form input', 'change', changePerpage);
	addListener('#pages a', 'click', changePage);
	addListener('.content-table tbody tr td[data-col="Weight"]', 'blur', updateWeight);

	
});

// Load the sales records from the server
async function loadRecords(startDate = 'all', endDate = null) {
	// Load orders
	var pageUrl = apiServer+'orders/load?store=all&day='+startDate;
	if (endDate) pageUrl += '&endday='+endDate+'&status=0';
	var statusValue = null;
	/*switch (page.type) {
		case PAGE_TYPE.COLLECT:
			statusValue = ORDER_STATUS.NONE;
			break;
		case PAGE_TYPE.LABELS:
			statusValue = ORDER_STATUS.COLLECTED;
			break;
		case PAGE_TYPE.STOCK:
			statusValue = ORDER_STATUS.OUTOFSTOCK;
			break;
		case PAGE_TYPE.REFUNDS:
			pageUrl += '&status[]='+ORDER_STATUS.CANCELLED.OUTOFSTOCK+'&status[]='+ORDER_STATUS.CANCELLED.DISCONTINUED;
			break;
	}
	if (statusValue !== null) pageUrl += '&status='+statusValue;*/

	let response, data;
	try {
		response = await fetch(pageUrl, {headers: {'DC-Access-Token': page.userToken}});
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
			// Get the data
			for (let store in data.orders) {
				saleRecords[store] = data.orders[store];
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
		if (page.type == 'DO') {
			headerRow = ['Item Name', 'Item Code', 'Quantity', 'Inner'];
		}else if (page.type == 'VR' || page.type == 'INT') {
			headerRow = ['Item Name', 'Item Code', 'Quantity'];
		}
		
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
			if (page.type == 'DO' && (td_i == 3 || td_i == 4)) continue;
			if ((page.type == 'VR' || page.type == 'INT') && (td_i == 3 || td_i == 4 || td_i == 6)) continue;
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
		if (page.type == 'DO') {
			headerRow = ['Item Name', 'Item Code', 'Quantity', 'Inner'];
		}else if (page.type == 'VR') {
			headerRow = ['Item Name', 'Item Code', 'Quantity'];
		}
		
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
				if (td_i == 3 || td_i == 4) continue;
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

function changeStore(e) {
	var checkedItem = e.target.closest('.options').querySelector('form input:checked');
	var store = checkedItem.value;

	let perpage = parseInt(document.querySelector('#content-item-perpage form').elements['perpage'].value);

	window.location.href = '/manage-weight/manageweight.html?page=1&perpage=' + perpage + '&store=' + store;

}

function changePerpage(e) {
	var checkedItem = e.target.closest('.options').querySelector('form input:checked');
	var perpage = checkedItem.value;

	let store = parseInt(document.querySelector('#content-item-stores form').elements['store'].value);

	window.location.href = '/manage-weight/manageweight.html?page=1&perpage=' + perpage + '&store=' + store;

}

function changePage(e) {
	let a = e.target;
	let page = a.dataset.page;
	let perpage = a.dataset.perpage;
	let store = a.dataset.store;
	window.location.href = '/manage-weight/manageweight.html?page=' + page + '&perpage=' + perpage + '&store=' + store;
}

async function updateWeight(e) {
	try {
		let td = e.target;
		let formData = new FormData();

		formData.append('weight', td.textContent);
		formData.append('itemID', td.parentNode.dataset.id);

		let response = await fetch(apiServer+'weight/update', {method: 'post', body: formData});
		let data = await response.json();

		if (!response.ok) {
			td.classList.add('Error');
			page.notification.show('Error: '+data.result);
		}

		if (data.result == 'success') {
			td.classList.add('Done');
		}
		else {
			td.classList.add('Error');
			page.notification.show(JSON.stringify(data.result));
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}
}