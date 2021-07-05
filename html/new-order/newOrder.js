import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener, checkLogin} from '/common/tools.js';
import {getItemDetails} from '../order-collect/js/item-details.js';


window.page = {
	//liveMessages: new LiveMessages(wsServer),
	els: {},
	notification: new NotificationBar(),
	orders: {},
	type: 'New Orders',
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


if (page.local) {
	apiServer = apiServerLocal;
}


document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	// Download

	document.querySelector('#orderID').addEventListener('click', function() {
		sortTable(2);
	});
	document.querySelector('#sku').addEventListener('click', function() {
		sortTable(3);
	});
	document.querySelector('#title').addEventListener('click', function() {
		sortTable(4);
	});
	document.querySelector('#itemQty').addEventListener('click', function() {
		sortTable(5);
	});
	

	page.els.downloadNewOrdersForm = document.querySelector('#content-download-new-orders form');
	page.els.downloadNewOrdersBtn = document.querySelector('#download-new-orders-btn');


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

	{
		// Load store list, order type list
		let forms = [
			{el: page.els.downloadNewOrdersForm, type: 'new', radioName: 'nos', radioID: 'nos'},
		];

		for (let form of forms) {
			let radio = document.createElement('input'), label = document.createElement('label'), span = document.createElement('span');
			radio.type = 'radio';
			radio.name = form.radioName;
			radio.id = form.radioID;

			

			let radioOptions = [];
			if (form.type == 'stores') {
				// Add entry for each store
				let storeIDs = Object.keys(stores).sort();
				let dataset = form.hasOwnProperty('filter') ? {filter: form.filter} : {};

				for (let id of storeIDs) {
					let store = stores[id];
					radioOptions.push({
						id: id,
						value: id,
						text: store.name,
						dataset: Object.assign({service: store.service}, dataset),
					});
				}
			}			
			
			else if (form.type == 'new') {
				// Add entry for order type
				let newType = {'B2BWholesale':81, 'B2BTransfer':82};
				let dataset = form.hasOwnProperty('filter') ? {filter: form.filter} : null;

				for (let type in newType) {
					radioOptions.push({
						id: type,
						value: newType[type],
						text: type,
						dataset: dataset,
					});
				}
			}

			for (let option of radioOptions) {
				let radioItem = radio.cloneNode(true), labelItem = label.cloneNode(true), spanItem = span.cloneNode(true);
				radioItem.id += '-'+option.id;
				radioItem.value = option.value;
				if (option.dataset) {
					for (let entry in option.dataset) radioItem.dataset[entry] = option.dataset[entry];
				}
				labelItem.setAttribute('for', radioItem.id);
				spanItem.textContent = option.text;
				labelItem.appendChild(spanItem);
				form.el.appendChild(radioItem);
				form.el.appendChild(labelItem);
			}

			// Select the first option
			if (form.radioID != 'uts') {
				if (form.el.querySelectorAll('input')[0]) {
				    form.el.querySelectorAll('input')[0].checked = true;
				}
			}

		}
	}
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});


	{
		page.els.downloadNewOrdersBtn.addEventListener('click', downloadNewOrders, false);
	}
}, false);


async function downloadNewOrders(perpage,pageNumber) {
	
	let datefrom = document.querySelector('#content-download-new-orders #datefrom').value;
	let dateto = document.querySelector('#content-download-new-orders #dateto').value;


	var store;
	try {
		store = page.els.downloadNewOrdersForm.elements['nos'].value;
	} catch (e) {}

	page.els.downloadNewOrdersBtn.disabled = true;
	page.els.downloadNewOrdersBtn.textContent = 'Downloading new orders, please wait...';

	try {
		let response = await fetch(apiServer+'downloadNewOrders/' + store + '?datefrom=' + datefrom + '&dateto=' + dateto);
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download new orders.', {hide: false});
			}
		}

		if (data.result == 'success') {
			let table = document.querySelector('#new-order-details');
			table.classList.remove('hide');

			let tBody = document.querySelector('#new-order-details tbody');
			while (tBody.firstChild) {
				tBody.removeChild(tBody.firstChild);
			}

			let tHead = document.querySelector('#new-order-details thead tr');
			while (tHead.lastChild.textContent.startsWith('Loc') || tHead.lastChild.textContent.startsWith('Qty')) {
				tHead.removeChild(tHead.lastChild);
			}
		    var cols = ['actions', 'notes', 'orderID', 'sku', 'title', 'itemQty'];

		    let newOrders = data.data;
		    let inventorys = data.inventory;
		    // console.log(inventorys);

		    let totalNewOrders = Object.keys(newOrders).length;
		    // console.log(totalNewOrders);
			let totalPage = Math.ceil(totalNewOrders/perpage);
			let newOrdersShow = Object.keys(newOrders).slice((pageNumber-1)*perpage, (pageNumber*perpage > totalNewOrders ? totalNewOrders :pageNumber*perpage));
	
			
		    for (let sr of newOrders) {
		     	// console.log(sr);
		     	let orderData = JSON.parse(sr.data);
		     	for (let item of orderData.items) {

		  			let tr = document.createElement('tr');
		  			tr.dataset.id = sr.id;
		  			tr.dataset.sku = item.sku;
		  			tr.dataset.lineItemID = item.lineItemID;

		     		let log = inventorys[item.sku] ? inventorys[item.sku].locations : [];
		     		// console.log(log);
					for (let i=0; i<log.length; i++) {
						let checkCols = cols.length;
						let icomparison = 6+(i*2);		
 						// console.log(icomparison);
						if (checkCols == icomparison){
							cols.push('Loc'+(i+1));
							cols.push('Qty'+(i+1));
							let header = document.querySelector('#new-order-details .tr-header');
							let newTD = document.createElement('th');
							newTD.innerHTML = 'Loc'+(i+1);
							newTD.addEventListener('click', function() {
								sortTable(6+i);
							});
							let newTD2 = document.createElement('th');
							newTD2.innerHTML = 'Qty'+(i+1);
							newTD2.addEventListener('click', function() {
								sortTable(6+i+1);
							});
							header.appendChild(newTD);
							header.appendChild(newTD2);
						}	
					} 

		     		for (let col of cols) {
		     			let td = document.createElement('td');
		     			td.classList.add(col);
		     			if (col == 'actions') {
					     	var savebtn = document.createElement('input');
			        		savebtn.setAttribute('type','button');
			        		savebtn.setAttribute('class','saveDetails action-btn btn-lightseagreen');
			        		// savebtn.setAttribute("style", "border-radius: 50%;");
			        		savebtn.value = "Save";
			        		td.appendChild(savebtn);

			        		savebtn.addEventListener("click", function(e){
			        			// console.log('11');
			        			saveSelectedOrderDetails(e);	
			        		});
		     			}
		     			else if (col == 'notes') {
		     				var input = document.createElement('TEXTAREA');
							input.setAttribute('name', 'orderNotes');
							// input.setAttribute('maxlength', 50);
							input.setAttribute('cols',25);
							input.setAttribute('rows',2);

							let ln = JSON.parse(sr.locationNotes);
							console.log(ln);
							let lineItemID = tr.dataset.lineItemID;

							input.value = ln ? (ln[lineItemID] ? ln[lineItemID][0].notes : '') : '';

							td.appendChild(input);
		     			}
		     			else if (col == 'orderID') {
		     				td.textContent = sr.salesRecordID;
		     			}
		     			else if (col == 'sku') {
		     				td.textContent = item.sku;
		     			}
		     			else if (col == 'title') {
		     				td.textContent = item.title;
		     			}
		     			else if (col == 'itemQty') {
		     				td.textContent = item.quantity;
		     			}

		     			for (let i=0; i<log.length; i++) {
		     				// console.log(log);
		     				if (col == ('Loc'+(i+1))){
		     					let bay = (log[i].bay).replace("EMG-", "");
								td.textContent = bay;
								// console.log(log[i].bay);
							}
							if (col == ('Qty'+(i+1))){
								let indivQty = log[i].indivQty;
								td.textContent = indivQty;
								// console.log(log[i].indivQty);
							}
		     			}
		     			tr.appendChild(td);
		     		}	
		     		tBody.appendChild(tr);
		     	}
		    }
			// page.notification.show('The new orders have been downloaded.', {background: 'bg-lgreen'});
			/*let pageEl = document.querySelector('#pages');
			while (pageEl.firstChild) {
				pageEl.removeChild(pageEl.firstChild);
			}

			if (pageNumber > 1) {
				let pre = document.createElement('a');
				pre.dataset.perpage = perpage;
				pre.dataset.store = store;
				pre.dataset.page = pageNumber - 1;
				pre.textContent = 'pre';
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

			addListener('#pages a', 'click', changePage);*/


		}
		else {
			page.notification.show('No orders found', {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadNewOrdersBtn.textContent = 'Download New Orders';
	page.els.downloadNewOrdersBtn.disabled = false;
}

async function saveSelectedOrderDetails(e) {
	//let trs = e.target.closest('#new-order-details').querySelector('tbody tr');
	let trs = e.target.closest('tr');
	// console.log(trs);
	let orderDetails = {};
	let lineItemID = trs.dataset.lineItemID;
	let notes = trs.querySelector('.notes').firstChild.value;
	// console.log(notes);
	let dbID = trs.dataset.id;

	let orderDetail = [];
	let od = {};
	od.id = trs.dataset.id;
	od.customSku = trs.dataset.sku;
	od.notes = notes;

	orderDetail.push(od);

	orderDetails[lineItemID] = orderDetail;
	console.log(orderDetails);

	let formData = new FormData();
	formData.append('orderID', dbID);
	formData.append('locationNotes', JSON.stringify(orderDetails));

	let response = await fetch(apiServer+'order/saveLocationSelected', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let data = await response.json();

	if (!response.ok) {
		page.notification.show('Error: '+data.result, {hide: false});
	} else {
		page.notification.show('updated');
	}
}

// function sortTable(n) {
// 	let i, x, y, shouldSort, sortCount = 0;
//   	let table = document.getElementById("new-order-details");

//  	let sorted = true;
//  	let dir = "asc"; 
//  	while (sorted) {
// 	    sorted = false;
// 	    let rows = table.rows;

//     	for (i = 1; i < (rows.length - 1); i++) {
//      		shouldSort = false;
//       		x = rows[i].getElementsByTagName("td")[n];
//       		y = rows[i + 1].getElementsByTagName("td")[n];
      
//       		if (dir == "asc") {
//       			//console.log(x.innerHTML.toLowerCase() + ' ' + y.innerHTML.toLowerCase() + ' ' + (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()));
//        			if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
//           			shouldSort= true;
//           			var cols = ['orderID', 'sku', 'title', 'itemQty'];
// 				  	let header = document.querySelector('#new-order-details .tr-header');
// 				  	let th = document.getElementsByTagName("th");

//           			// for (let col of cols) {
//           				if (n = 0) {
//           					th.innerHTML = "OrderID" + '🠭';   
//           					console.log(th.innerHTML);    
//           					header.appendChild(th);					
//           				}
          				
//           			// }
//           			break;
//        			}
//       		} else if (dir == "desc") {
//        			if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
//           			shouldSort = true;
//           // 			if (col == 'orderID') {
//       				// 	th.innerHTML = "OrderID" + '🠯';   
//       				// 	console.log(th.innerHTML);    
//       				// 	header.appendChild(th);					
//       				// }
//          			break;
//       			}
//       		}
//     	}
//     	if (shouldSort) {
//       		rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
//       		sorted = true;
//       		sortCount ++;      
//     	} else {
//       		if (sortCount == 0 && dir == "asc") {
//         		dir = "desc";
//         		sorted = true;
//       		}
//     	}
//  	}
// }

function sortTable(n) {
  	
  	let tbody = document.querySelector("#new-order-details tbody");
  	let rowsData = [];
 	let locationList = [];
 	let sortedRowsData = [];
 	
 	let rows = tbody.querySelectorAll('tr');
	for (let i = 0; i < rows.length; i++) {
		let tds = rows[i].getElementsByTagName("td");
		/*let rowdata = [];
		for (let td of tds) {
			rowdata.push(td);
		}*/
		rowsData.push(rows[i]);
  		let bay = tds[n].textContent;
  		if (!locationList.includes(bay)) {
  			locationList.push(bay);
  		}
	}
	
	locationList.sort(function(a,b){
	    return a.localeCompare(b);
	});
	for (let loc of locationList) {
		for (let i = 0; i < rowsData.length; i++) {
			if (rowsData[i] == undefined) continue;
	  		let bay = rowsData[i].getElementsByTagName("td")[n].textContent;
	  		if (bay == loc) {
	  			sortedRowsData.push(rowsData[i]);
	  			// console.log(i);
	  			// console.log('222222' + '-' + i);
	  			delete rowsData[i];
	  			// console.log('33333'+ '-' + i);
	  		}
		}
	}
	for (let i = 0; i < rowsData.length; i++) {
		if (rowsData[i] == undefined) continue;
		// console.log('444444'+ '-' + i);
		sortedRowsData.push(rowsData[i]);
	}
	while (tbody.firstChild) {
		tbody.removeChild(tbody.firstChild);
	}
	for (let rowData of sortedRowsData) {
		/*let tr = document.createElement('tr');
		for (let ele of rowData) {
 			tr.appendChild(ele);
 		}	*/
 		tbody.appendChild(rowData);
	}
}