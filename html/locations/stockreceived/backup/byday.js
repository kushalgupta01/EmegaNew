import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener, checkLogin} from '/common/tools.js';

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

window.locations = {};

if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	
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

	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});

	document.querySelector('#stock-received-date #stock-received-search').addEventListener('click', searchStockReceived, false);
	document.querySelector('#stock-received-date #export-to-excel').addEventListener('click', exportTableToExcel, false);

});


async function searchStockReceived() {
	document.getElementById('loading').style.display = 'block';
	let ths = document.querySelectorAll('.tr-header th');
	for (let th of ths ){
		if (th.innerHTML.startsWith("Location") || th.innerHTML.startsWith("Qty")){
			th.remove();
		}
	}
	var locTBody = document.querySelector('#logsByDay');
			while (locTBody.firstChild) {
				locTBody.removeChild(locTBody.firstChild);
	}

	let date = document.querySelector('#dateby').value;

	let response = await fetch(apiServer+'stockreceived/byday/'+date, {method: 'post', headers: {'DC-Access-Token': page.userToken}});
	let data = await response.json();
	
	if (response.ok) {
		if(data.result != 'success') {
			page.notification.show(data.result, {hide:false});
			return;
		}

		if (data.locations) {
			locations = data.locations;
			for (let location in locations) {
				// console.log(locations[location]);
				// let locations[location].location2 = 'test1';
			}
			let cols = ['store', 'itemName', 'sku', 'stockreceived', 'emegaQty'];
			for (let location in locations) {
				var tr = document.createElement('tr');
				var log = locations[location];
				
				for (let i=0; i<log.locations.length; i++) {
					let checkCols = cols.length;
					let icomparison = 5+(i*2);
					// console.log('icomparison='+icomparison);
							if (checkCols == icomparison){
									cols.push('location'+i);
									cols.push('qty'+i);
									let header = document.querySelector('#stock-received-day .tr-header');
									let newTD = document.createElement('th');
									newTD.innerHTML = 'Location '+(i+1);
									let newTD2 = document.createElement('th');
									newTD2.innerHTML = 'Qty '+(i+1);
									header.appendChild(newTD);
									header.appendChild(newTD2);
								}
							
							// let bay = log[col][i].bay;
							// let qty = log[col][i].indivQty;
							// content.push(' '+bay+': '+qty);
						}

				// console.log(cols);
				for (let col of cols) {
					let td = document.createElement('td');
					if (col == 'store') {
						td.textContent = stores[log[col]] ? stores[log[col]].name : '';
					}
					if (col == 'itemName' || col == 'sku' || col == 'stockreceived' || col == 'emegaQty'){
						td.textContent = log[col]
					}
					for (let i=0; i<log.locations.length; i++) {
						if (col == ('location'+i)){
							let bay = log.locations[i].bay;
							td.textContent = bay;
						}
						if (col == ('qty'+i)){
							let qty = log.locations[i].indivQty;
							td.textContent = qty;
						}
					}
					// if (col == 'locations'){
					// 	// console.log(log[col][0].bay);
					// 	let content =[];
					// 	let checkCols = cols.length;
					// 	console.log(cols[0]);
					// 	console.log(checkCols);
						

					// 	td.textContent = content;

					// }
					tr.appendChild(td);
				}
			locTBody.appendChild(tr);
			}
		}


	}
	else {
		page.notification.show('Error: '+data.result);

	}
	document.getElementById('loading').style.display = 'none';
}

function exportTableToExcel() {
	let date = document.querySelector('#dateby').value;
    // get table
	var table = document.getElementById('stock-received-day');
	// convert table to excel sheet
	var wb = XLSX.utils.table_to_book(table, {sheet:"Customer Report"});
	// write sheet to blob
	var blob = new Blob([s2ab(XLSX.write(wb, {bookType:'xlsx', type:'binary'}))], {
	    type: "application/octet-stream"
	});
    // return sheet file
    return saveAs(blob, "StockReceived-Emega-"+date+".xlsx");
}

function s2ab(s) {
    var buf = new ArrayBuffer(s.length);
    var view = new Uint8Array(buf);
    for (var i=0; i<s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
}