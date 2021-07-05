import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener, checkLogin} from '/common/tools.js';
import {getItemDetails} from '../order-collect/js/item-details.js';

window.page = {
	//liveMessages: new LiveMessages(wsServer),
	notification: new NotificationBar(),
	// orders: {},
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


window.convert = {"name": "Name"};
window.header = ['Store', 'Packer', 'Title', 'Tracking', 'Post Service', 'Status', 'Packed Time'];
window.saleRecords = {};

if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});

	document.querySelector('#content-packer-summary #content-packer-search').addEventListener('click', searchPackers, false);
	document.querySelector('#content-packer-summary #content-packer-filter #datefrom').addEventListener('change', filterFrom, false);
	document.querySelector('#content-packer-summary #content-packer-filter #dateto').addEventListener('change', filterTo, false);
});

	  	// 	}
   function countRow() {
   	  
	  	var rows = document.querySelectorAll('.content-table tbody tr');
	  	var rowCount = 0;
	  	for (let row of rows) {
	  		if(!row.classList.contains('hide')) {
	  			rowCount++;
	  		}
	  	}

	  	return rowCount;
 	}



async function searchPackers() {
	//Load packers
	var pageUrl = apiServer+'packers/search';
	let formData = new FormData();
	let keywords = document.querySelector('#content-packer-searchbar input').value.toLowerCase();
	let field = document.querySelector('#content-packer-searchfield input[name="searchfield"]:checked').value;

	if(!keywords) {
		page.notification.show("Please enter keywords in the search bar.");
		return;
	}

	formData.append('keywords', keywords);
	formData.append('field', field);

	let response,data;
	try {
		response = await fetch(pageUrl, {method: 'post', body: formData});
		data = await response.json();
		//console.log(data);
	}
	catch(e) {
		page.notification.show('Error: Could not connect to the server.');
		return;
	}

	if (response.ok) {
		if(data.result != 'success') {
			page.notification.show(data.result, {hide:false});
			return;
		}

		if (data.orders) {
			// console.log(data.orders);
			// Get the data
			for (let store in data.orders) {
				saleRecords[store] = data.orders[store];
			}
			let cols = window.header;
			let colsEditable = {
				
			};

			var tableBody = document.querySelector('#content-packer-summary table tbody');

			while (tableBody.firstChild) {
				tableBody.removeChild(tableBody.firstChild);
			}

			for (let storeID in saleRecords) {
				let orders = saleRecords[storeID];
				for (let order of orders) {
					let items = order.data.Items;
					for (let item of items) {
						// if (field == 'name' && item[convert[field]].toLowerCase().includes(keywords)) continue;
						let tr = document.createElement('tr');
						let td = document.createElement('td'), input = document.createElement('input');
						// td.className = 'selected';
						// input.type = 'checkbox';
						// input.autocomplete = 'off';
						// td.appendChild(input);
						// tr.appendChild(td);

						for (let col of cols) {
							let td = document.createElement('td');
							td.dataset.col = col;
							if (colsEditable.hasOwnProperty(col)) td.contentEditable = true;

							let text = '';
							switch (col) {
								case 'Store':
									text = stores[storeID].name;
									break;
								case 'Packer':
									text = order.packer;
									break;
								case 'Title':
									text = item.ItemTitle;
									break;
								case 'Status':
									text = ORDER_STATUS_NAME[order.status];
									break;
								case 'Tracking':
									text = order.trackingID ? JSON.parse(order.trackingID) : order.trackingID;
									break;
								case 'Post Service':
									text = ORDER_TYPE_NAME[order.type];
									break;
								case 'Packed Time':
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
			  document.querySelector('#totalParcelPacked').textContent = countRow();
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

function filterFrom() {
	let datefrom = document.querySelector('#datefrom').value;
	let dateto = document.querySelector('#dateto').value;
	datefrom = datefrom ? new Date(datefrom + ' 00:00:00') : null;
	dateto = dateto ? new Date(dateto + ' 23:59:59') : null;
	console.log(datefrom);
	var trs = document.querySelectorAll('#content-packer-summary table tbody tr');
	console.log(trs);
	for (let tr of trs) {
		tr.classList.add('hide');
		let tds = tr.childNodes;
		console.log(tds);
		for (let td of tds) {
			if (td.dataset.col == 'Packed Time') {
				let packedtime = new Date(td.textContent);
				console.log(packedtime);
				if ((datefrom && dateto && packedtime>datefrom && packedtime<dateto)
					|| (datefrom && !dateto && packedtime>datefrom) 
					|| (!datefrom && dateto && packedtime<dateto)
					|| (!datefrom && !dateto)) tr.classList.remove('hide');
			}
		}
	}
	 document.querySelector('#totalParcelPacked').textContent = countRow();
}

function filterTo() {
	let datefrom = document.querySelector('#datefrom').value;
	let dateto = document.querySelector('#dateto').value;
	datefrom = datefrom ? new Date(datefrom + ' 00:00:00') : null;
	dateto = dateto ? new Date(dateto + ' 23:59:59') : null;
	console.log(datefrom);
	var trs = document.querySelectorAll('#content-packer-summary table tbody tr');
	for (let tr of trs) {
		tr.classList.add('hide');
		let tds = tr.childNodes;
		for (let td of tds) {
			if (td.dataset.col == 'Packed Time') {
				let packedtime = new Date(td.textContent);
				if ((datefrom && dateto && packedtime>datefrom && packedtime<dateto)
					|| (datefrom && !dateto && packedtime>datefrom) 
					|| (!datefrom && dateto && packedtime<dateto)
					|| (!datefrom && !dateto)) tr.classList.remove('hide');
			}
		}
	}
	 document.querySelector('#totalParcelPacked').textContent = countRow();
}