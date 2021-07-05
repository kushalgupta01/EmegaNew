import '/order-collect/js/config.js';
import '/common/stores.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener, checkLogin} from '/common/tools.js';
//import {getItemDetails} from '../order-collect/js/item-details.js';



window.page = {
	//liveMessages: new LiveMessages(wsServer),
	els: {},
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
	localUser: !!localStorage.getItem('local')
	
};

window.stocks = {};


if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});

	await loadInventory();
	await createTable();

	
	//$('#item-table').DataTable();
	const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

	const comparer = (idx, asc) => (a, b) => ((v1, v2) => 
	    v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
	    )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));

	// do the work...
	document.querySelectorAll('th').forEach(th => th.addEventListener('click', (() => {
	    const tbody = document.querySelector('#item-table-body');
	    Array.from(tbody.querySelectorAll('tr'))
	        .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
	        .forEach(tr => tbody.appendChild(tr) );
	})));

	document.querySelector('#updateItemTable').addEventListener('click', updateItemTable);

	addListener('#quantity', 'click', (e) => {
		e.stopPropagation();
		let td = e.target;
		td.contentEditable  = true;
		td.classList.add('focus');
	});

	addListener('#quantity', 'blur', async (e) => {
		e.stopPropagation();
		e.target.contentEditable  = false;

		let q = e.target.textContent;
		let stockID = e.target.parentNode.dataset.id;
		let formData = new FormData();
		formData.append('quantity', q);
		formData.append('stockID', stockID);

		let response = await fetch(apiServer+'stock/updatequantity', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let responseData = await response.json();

		if (!response.ok || responseData.result != 'success') {		
			page.notification.show(responseData.result);
		}

	});

	
});

async function loadInventory() {
	let response = await fetch(apiServer+'stock/get', {headers: {'DC-Access-Token': page.userToken}});
	let stockData = await response.json();

	if (response.ok && stockData.result == 'success') {		
		stocks = stockData.stocks;
	}
	else {
		page.notification.show(stockData.result);
	}

}

async function createTable() {
	var tBody = document.querySelector('#item-table-body');
	let cols = ['id', 'sku', 'name', 'quantity'];
	for (let item in stocks) {
		var tr = document.createElement('tr');
		var stock = stocks[item];
		tr.dataset.id = stock.id;
        for (let col of cols) {
        	var td = document.createElement('td');
        	td.textContent = stock[col];
        	if (col=='quantity') {
        		td.id = 'quantity';
        	}
        	tr.appendChild(td);
        }
        tBody.appendChild(tr);
	}
	var tr = document.createElement('tr');
	tr.dataset.id = '123';
	tBody.appendChild(tr);
}

async function updateItemTable() {
	var response = await fetch(apiServer+'stock/updateitemtable', {headers: {'DC-Access-Token': page.userToken}});
	let responseData = await response.json();

	if (responseData.result == 'success') {
		page.notification.show('Database updated successfully.');
	} else {
		page.notification.show(responseData.result);
	}
}