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
	local: window.location.hostname.startsWith('1'),
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

	document.querySelector('#packed-date #packers-search').addEventListener('click', searchPackers, false);

});


async function searchPackers() {
	document.getElementById('loading').style.display = 'block';
	let ths = document.querySelectorAll('.tr-header th');
	for (let th of ths ){
		th.remove();
	}
	//let searchType = displayRadioValue(); //name, items and weight
	let cols = ['User','Total Orders Packed','Total Items Packed','Total Weight Packed'];
	/*if (searchType == 'name'){
		cols.push('Total Orders Packed');
	}
	else if (searchType == 'items'){
		cols.push('Total Items Packed');
	}
	else if (searchType == 'weight'){
		cols.push('Total Weight Packed');
	}*/
	
	for (let col of cols){
		let header = document.querySelector('#packed-total-day .tr-header');
		let th = document.createElement('th');
		th.innerHTML = col;
		header.appendChild(th);
	}

	var locTBody = document.querySelector('#packedByDay');
	while (locTBody.firstChild) {
		locTBody.removeChild(locTBody.firstChild);
	}
	var locTFoot = document.querySelector('#total');
	while (locTFoot.firstChild) {
		locTFoot.removeChild(locTFoot.firstChild);
	}

	let date = document.querySelector('#dateby').value;

	let response = await fetch(apiServer+'totalpacked/'+date, {method: 'post', headers: {'DC-Access-Token': page.userToken}});
	let data = await response.json();
	
	if (response.ok) {
		if(data.result != 'success') {
			page.notification.show(data.result, {hide:false});
			return;
		}

		if (data.locations) {
			
		
			let packings = data.locations;
			//onsole.log(packings);
			for (let j=0 ; j<packings.length ; j++) {
				if(packings[j].packed_total>0){
					let tr = document.createElement('tr');
						for (let col of cols){
							let td1 = document.createElement('td');
							//let td2 = document.createElement('td');
							if (col == 'User'){
								td1.textContent = packings[j].packer;
							}
							if (col == 'Total Orders Packed'){
								td1.textContent = packings[j].packed_total;
								td1.classList.add('totalorderspacked');
								td1.style.textAlign = 'center';
							}
							if (col == 'Total Items Packed'){
								td1.textContent = packings[j].packed_total_quantity;
								td1.classList.add('packedtotalquantity');
								td1.style.textAlign = 'center';
							}
							if (col == 'Total Weight Packed'){
								//let num = 
								td1.textContent = packings[j].packed_total_weight?.toFixed(3);
								td1.classList.add('totalweightpacked');
								td1.style.textAlign = 'center';
							}
							//td2.textContent = packings[j].packed_total;
							tr.appendChild(td1);
						}
						//tr.appendChild(td2);	
					locTBody.appendChild(tr);
				}
				//console.log(locations[location]);
				// let locations[location].location2 = 'test1';
			}
		/*let cols = ['store', 'itemName', 'sku', 'stockreceived', 'emegaQty'];
		for (let location in locations) {
			var tr = document.createElement('tr');
			var log = locations[location];
			
			for (let i=0; i<log.locations.length; i++) {
				let checkCols = cols.length;
				let icomparison = 5+(i*2);
				//console.log('icomparison='+icomparison);
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

			//console.log(cols);
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
		}*/
		}


	}
	else {
		page.notification.show('Error: '+data.result);

	}
	document.getElementById('loading').style.display = 'none';
	let tfoot = document.querySelector('#total');
	for (let col of cols){
		let total = 0;
		let td = document.createElement('td');
		if (col == 'User'){
			td.textContent = 'TOTAL:';
		}
		if (col == 'Total Orders Packed'){
			locTBody.querySelectorAll('.totalorderspacked').forEach(el=>total+=+parseInt(el.textContent));
			td.textContent = total;
			td.style.textAlign = 'center';
		}
		if (col == 'Total Items Packed'){
			locTBody.querySelectorAll('.packedtotalquantity').forEach(el=>total+=+parseInt(el.textContent));
			td.textContent = total;
			td.style.textAlign = 'center';
		}
		if (col == 'Total Weight Packed'){
			//let num = 
			locTBody.querySelectorAll('.totalweightpacked').forEach(el=>total+=+parseFloat(el.textContent));
			td.textContent = total.toFixed(3);
			td.style.textAlign = 'center';
		}
		tfoot.appendChild(td);
	}
}

/*function displayRadioValue() {
	var ele = document.getElementsByName('searchfield');
      
    	for(let i = 0; i < ele.length; i++) {
        	if(ele[i].checked)
        	return ele[i].value;
    	}
}*/