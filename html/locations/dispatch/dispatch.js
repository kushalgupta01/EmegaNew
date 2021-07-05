//import '/common/stores.js';
import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener} from '/common/tools.js';


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

window.locations = {};
window.stocks = {};
window.stocks2 = {};

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

	// back to menu button
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/inventory/inventorymanagement.html';
	});

	// Close popup box
	document.querySelector('#box-container .close').addEventListener('click', closeBox);

	await loadBay();
	await bayTable();

	var barcodeScanner = {
        value: '',
        startTime: null,
        timer: null,
        timeLimit: 600,
	};

});


async function loadBay() {
	let type=3;
	let response = await fetch(apiServer+'transactionlogsBay/load/'+type, {headers: {'DC-Access-Token': page.userToken}});
	let locationData = await response.json();

	if (response.ok && locationData.result == 'success') {
		locations = locationData.locations;
	}
	else {
		page.notification.show(locationData.result);
	}
}

async function loadBayInventory(e) {

	stocks = {};
	stocks2 = {};
	var tr = e.target.parentNode.parentNode;
	var bay = tr.dataset.bay;

	let response = await fetch(apiServer+'logBayDetails/load/'+ bay, {headers: {'DC-Access-Token': page.userToken}});
	let stockData = await response.json();

	if (response.ok && stockData.result == 'success') {		
		stocks = stockData.stocks;
		stocks2 = stockData.stocks2;
	}
	else {
		//page.notification.show(stockData.result);
		swal(bay+' not found!','','error');
	}
	showBayInventory(bay);
}

async function bayTable() {
	var locTBody = document.querySelector('#location-table-body');

	while (locTBody.firstChild) {
		locTBody.removeChild(locTBody.firstChild);
	}

	let cols = ['locations'];
	var firstTr = document.createElement('tr');
	for (let col of cols) {
	    var firstTd = document.createElement('td');
		if (col == 'locations') {
			let searchPallet = document.createElement('input');
			searchPallet.setAttribute('class','input-search-pallet');
			searchPallet.style.fontSize = '21px';
			searchPallet.style.maxWidth = '150px';
			firstTd.appendChild(searchPallet);
			searchPallet.addEventListener('keypress', async function(e){
				if (e.key === 'Enter'){
					stocks = {};
					stocks2 = {};
					var tr = e.target.parentNode.parentNode;
					var bay = document.querySelector('.input-search-pallet').value;

					let response = await fetch(apiServer+'logBayDetails/load/'+ bay, {headers: {'DC-Access-Token': page.userToken}});
					let stockData = await response.json();

					if (response.ok && stockData.result == 'success') {		
						stocks = stockData.stocks;
						stocks2 = stockData.stocks2;
						swal('Pallet/Location loaded successfully!','','success');
					}
					else {
						//page.notification.show(stockData.result);
						swal(bay+' not found!','','error');
					}
					let searchInput = document.querySelector('.input-search-pallet').value;
					showBayInventory(searchInput);
				}
			});
		}
	}
	firstTr.appendChild(firstTd);	
	locTBody.appendChild(firstTr);	
	
	for (let location of locations) {
		var tr = document.createElement('tr');
		
	 	for (let col of cols) {
        	var td = document.createElement('td');
        	td.dataset.col = col;
        	tr.dataset.bay = location.newBay;

        	if (col == 'locations') {
        		let viewBtn = document.createElement('input');
				viewBtn.setAttribute('type', 'button');
            	viewBtn.setAttribute('value', location.newBay);
            	viewBtn.setAttribute('class','viewstock action-btn btn-grey');
            	td.appendChild(viewBtn);      

            	viewBtn.addEventListener("click", async function(e){
            		// console.log('11');
            		await loadBayInventory(e);               		
            	});	       		
        	}  
        
        	tr.appendChild(td);
        }
	    locTBody.appendChild(tr);		
	}
}

function showBayInventory(bay){
	document.querySelector('#locat-det span').textContent = bay;
	var itemTBody = document.querySelector('#item-table-body');

	while (itemTBody.firstChild) {
		itemTBody.removeChild(itemTBody.firstChild);
	}
	
	// document.querySelector('#bay span').textContent = itemTBody.dataset.bay;

	let cols = ['store', 'itemName', 'sku', 'total Qty',/* 'actionBy',*/ 'actionTime'];
	// let colsEditable = ['indivQty', 'cartonQty', 'type', 'quantityPerCarton'];

	for (let item in stocks) {
		var tr = document.createElement('tr');
		var stock = stocks[item];

		tr.dataset.id = stock['id'];
		tr.dataset.invID = stock['invID'];
		tr.dataset.itemName = stock['itemName'];
		tr.dataset.sku = stock['sku'];
		tr.style.cursor = 'pointer';

		for (let col of cols) {
			let td = document.createElement('td');

			if (col == 'store') {
				td.textContent = stores[stock[col]] ? stores[stock[col]].name : '';
			} 	
			else if (col == 'total Qty') {
					td.textContent = stock['TotalAdded'];
					
			} 				 
			else if (col == 'imagedisplay') {
				let img = document.createElement('img');
				img.src =  stock['image'];
				img.style.width = '100px';
				td.appendChild(img);
			} 
			else {
        		td.textContent = stock[col] ;       		
        	}			
			tr.appendChild(td);
		}
		itemTBody.appendChild(tr);
		tr.addEventListener("click", async function(e){
        			var full = document.querySelector('#fullbody');
			while (full.firstChild) {
				full.removeChild(full.firstChild);
			}
			let kols = ['minusplus','oldBay', 'oldQty', /*'oldType', */'seta', 'newBay', 'newQty',/* 'newType',*/ 'actionBy', 'actionTime', 'actionType'];
			let logs={};
			// console.log('11');
			let actionType = 1;
			let invID = e.target.closest('tr').dataset.id;
			let itemName = e.target.closest('tr').dataset.itemName;
			let sku = e.target.closest('tr').dataset.sku;
			let response = await fetch(apiServer+'transferlogs-baydetails/'+bay+'?actionType=' + actionType + '&invID=' + invID, {headers: {'DC-Access-Token': page.userToken}});
	    	let stockData = await response.json();

	    	if (response.ok && stockData.result == 'success') {
	    			logs = stockData.logs;
	    			//console.log(logs);
	    			for (let log of logs) {
	    				var tr = document.createElement('tr');
	    				for (let kol of kols) {
	    					let td = document.createElement('td');
	    					if (kol == 'minusplus'){
	    						td.setAttribute('class','minusplus');
	    						td.style.fontWeight = '700';
	    						td.style.fontSize = '14px';
	    						td.style.textAlign = 'center';
	    						if (log['newBay'] == log['oldBay'] && log['newQty'] == log['oldQty']){
	    							td.innerHTML = '<div style="color:green">+'+log['newQty']+'</div><div style="color:red">-'+log['oldQty'];
	    						}
	    						else if (log['newBay'].toLowerCase() == bay.toLowerCase()){
	    							if (log['actionType'] == 'Transfer' || log['actionType'] == 'Addition' || log['actionType'] == 'New'){
	    								td.textContent = '+'+log['newQty'];
	    								td.style.color = 'green';	
	    							}
	    							else if (log['actionType'] == 'Deduction'){
	    								td.textContent = log['newQty'];
	    								td.style.color = 'red';
	    							}

	    						}
	    						else if (log['oldBay'].toLowerCase() == bay.toLowerCase()){
	    							if (log['actionType'] == 'Transfer'){
	    								td.textContent = '-'+log['newQty'];
	    								td.style.color = 'red';
	    							}
	    							else if (log['actionType'] == 'Delete'){
	    								td.textContent = '-'+log['oldQty'];
	    								td.style.color = 'red';
	    							}
	    						}
	    					}
	    					else if (kol == 'seta'){
	    						td.textContent = '=>';
	    					}
	    					else {
				        		td.textContent = log[kol] ;       		
				        	}			
							tr.appendChild(td);
							
	    				}
	    				if (log['actionType'] !== 'Update'){full.appendChild(tr)}
	    			}
	    			document.getElementById('box-outer').classList.add('flex');
					document.getElementById('transactionLogs').classList.remove('hide');
					document.querySelector('.item-name').textContent = itemName;
					document.querySelector('.item-sku').textContent = sku;
			}
			else {
				page.notification.show(stockData.result);
			}                 		
        });
	}

	var itemTBody2 = document.querySelector('#item-table-body2');

	while (itemTBody2.firstChild) {
		itemTBody2.removeChild(itemTBody2.firstChild);
	}
	
	// document.querySelector('#bay span').textContent = itemTBody.dataset.bay;

	let cols2 = ['store', 'itemName', 'sku', 'total Qty',/* 'actionBy',*/ 'actionTime'];
	// let colsEditable = ['indivQty', 'cartonQty', 'type', 'quantityPerCarton'];

	for (let item in stocks2) {
		var tr = document.createElement('tr');
		var stock2 = stocks2[item];

		tr.dataset.id = stock2['id'];
		tr.dataset.invID = stock2['invID'];
		tr.dataset.itemName = stock2['itemName'];
		tr.dataset.sku = stock2['sku'];
		tr.style.cursor = 'pointer';

		for (let col of cols) {
			let td = document.createElement('td');

			if (col == 'store') {
				td.textContent = stores[stock2[col]] ? stores[stock2[col]].name : '';
			} 	
			else if (col == 'total Qty') {
					td.textContent = '-'+stock2['TotalRemoved'];
					
			} 				 
			else if (col == 'imagedisplay') {
				let img = document.createElement('img');
				img.src =  stock2['image'];
				img.style.width = '100px';
				td.appendChild(img);
			} 
			else {
        		td.textContent = stock2[col] ;       		
        	}			
			tr.appendChild(td);
		}
		itemTBody2.appendChild(tr);
		tr.addEventListener("click", async function(e){
			var full = document.querySelector('#fullbody');
			while (full.firstChild) {
				full.removeChild(full.firstChild);
			}
			let kols = ['minusplus','oldBay', 'oldQty', /*'oldType', */'seta', 'newBay', 'newQty',/* 'newType',*/ 'actionBy', 'actionTime', 'actionType'];
			let logs={};
			// console.log('11');
			let actionType = 1;
			let invID = e.target.closest('tr').dataset.id;
			let itemName = e.target.closest('tr').dataset.itemName;
			// console.log(itemName);
			let sku = e.target.closest('tr').dataset.sku;
			// console.log(sku);
			let response = await fetch(apiServer+'transferlogs-baydetails/'+bay+'?actionType=' + actionType + '&invID=' + invID, {headers: {'DC-Access-Token': page.userToken}});
	    	let stockData = await response.json();

	    	if (response.ok && stockData.result == 'success') {
	    			logs = stockData.logs;
	    			//console.log(logs);
	    			for (let log of logs) {
	    				var tr = document.createElement('tr');
	    				for (let kol of kols) {
	    					let td = document.createElement('td');
	    					if (kol == 'minusplus'){
	    						td.style.fontWeight = '700';
	    						td.style.fontSize = '14px';
	    						td.style.textAlign = 'center';
	    						if (log['newBay'] == log['oldBay'] && log['newQty'] == log['oldQty']){
	    							td.innerHTML = '<div style="color:green">+'+log['newQty']+'</div><div style="color:red">-'+log['oldQty'];
	    						}
	    						else if (log['newBay'].toLowerCase() == bay.toLowerCase()){
	    							if (log['actionType'] == 'Transfer' || log['actionType'] == 'Addition' || log['actionType'] == 'New'){
	    								td.textContent = '+'+log['newQty'];
	    								td.style.color = 'green';	
	    							}
	    							else if (log['actionType'] == 'Deduction'){
	    								td.textContent = log['newQty'];
	    								td.style.color = 'red';
	    							}

	    						}
	    						else if (log['oldBay'].toLowerCase() == bay.toLowerCase()){
	    							if (log['actionType'] == 'Transfer'){
	    								td.textContent = '-'+log['newQty'];
	    								td.style.color = 'red';
	    							}
	    							else if (log['actionType'] == 'Delete'){
	    								td.textContent = '-'+log['oldQty'];
	    								td.style.color = 'red';
	    							}
	    						}
	    					}
	    					else if (kol == 'seta'){
	    						td.textContent = '=>';
	    					}
	    					else {
				        		td.textContent = log[kol] ;       		
				        	}			
							tr.appendChild(td);
							
	    				}
	    				if (log['actionType'] == 'Update'){}
	    				else{full.appendChild(tr);}
	    				
	    			}
	    			document.getElementById('box-outer').classList.add('flex');
					document.getElementById('transactionLogs').classList.remove('hide');
					document.querySelector('.item-name').textContent = itemName;
					document.querySelector('.item-sku').textContent = sku;
			}
			else {
				page.notification.show(stockData.result);
			}                		
        });
	}
}

function closeBox() {
	document.getElementById('box-outer').classList.remove('flex');
	setTimeout(function() {
		for (let el of document.querySelectorAll('#box-container > div:not(.close)')) {
			el.classList.add('hide');
		}
	}, 400);
}