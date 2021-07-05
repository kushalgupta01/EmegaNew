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
	scanned: false,
	userToken: localStorage.getItem('usertoken') || '',
	local: window.location.hostname.startsWith('192.168'),
	localUser: !!localStorage.getItem('local'),
	loadTime: 0,
};

//reload page every 10 minutes
window.setTimeout(function () {
  window.location.reload();
}, 600000);


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
	
	document.querySelector('#box-container .close').addEventListener('click', closeBox);

	page.els.downloadNewOrdersForm = document.querySelector('#content-download-new-orders form');
	page.els.downloadNewOrdersBtn = document.querySelector('#download-new-orders-btn');
	page.els.downloadCollectedOrdersBtn = document.querySelector('#download-collected-orders-btn');
	page.els.downloadSortNewOrdersBtn = document.querySelector('#sorted-new-orders-btn');

	var barcodeScanner = {
        value: '',
        startTime: null,
        timer: null,
        timeLimit: 600,
    };

    	document.addEventListener('keypress', async function scanning(e) {
        if (e.charCode == 13 || e.charCode == 0) { // 13, 0; Enter key
            e.preventDefault();
            e.stopPropagation();

            clearTimeout(barcodeScanner.timer);
            barcodeScanner.timer = null;
            console.log(barcodeScanner.value);

           if (document.querySelector('#new-order-details').classList.contains('hide') == false) {
           
           let orderTable = document.querySelector('#new-order-details tbody');
           let trs = orderTable.querySelectorAll('tr');
           let count=0;
           let selected = false;

           for (let tr of trs) {
           		// console.log(tr.dataset.barcode);
				let pickQtyTds = tr.querySelectorAll('td[class^="picked"] input');

           		if (barcodeScanner.value == tr.dataset.barcode) {

           			if (selected == false && tr.dataset.selected != 'true') {
           				// sortTable(3);
           				selected = true;
           				tr.scrollIntoView(true);
           				tr.dataset.selected = true;
           			}
           			tr.classList.add('bg-red');
          	
					for (let pickQtyTd of pickQtyTds) {
						//console.log(pickQtyTd);
						// pickQtyTd.removeAttribute('readonly');
						pickQtyTd.disabled = false;
						// console.log(pickQtyTd);
					}
					count++;
           		} 
           		else {
           			tr.classList.remove('bg-red');
           			for (let pickQtyTd of pickQtyTds) {
						//console.log(pickQtyTd);
						// pickQtyTd.setAttribute('readonly',true);
						pickQtyTd.disabled = true;
						// console.log(pickQtyTd);
					}
					window.page.scanned = false;
           		}
           }
           if (selected == false && count > 0){
           		for (let t of trs){
           			t.dataset.selected = false;
           		}
           		scanning(e);
           	}

        	if (count == 0){
    			// console.log('11');
        		window.page.scanned = true;
        		swal('Item not found!','','error');
           	}

            barcodeScanner.value = ''; // Reset barcode scanner value

        } 
        else if (document.querySelector('#sorted-new-orders').classList.contains('hide') == false){
        		
        		let orderTable = document.querySelector('#sorted-new-orders tbody');
	           	let trs = orderTable.querySelectorAll('tr');
	           	let count=0;
	           	for (let tr of trs) {
	           		
				let pickQtyTd = tr.querySelector('.checkSorted input');

	           		if (barcodeScanner.value == tr.dataset.barcode) {

	           			if (count == 0) {
	           				sortTable(1);
	           				tr.scrollIntoView(true);
	           			}
	           			tr.classList.add('bg-red');
	          			
	          			pickQtyTd.disabled = false;
					
					count++;
	           		} 
	           		else {
	           			tr.classList.remove('bg-red');
	           			
					pickQtyTd.disabled = true;
					
					
					window.page.scanned = false;
	           		}
	           	}
	        	
	        	if (count == 0){
	    			// console.log('11');
	        		window.page.scanned = true;
	        		swal('Item not found!','','error');
	           	}

        		barcodeScanner.value = ''; // Reset barcode scanner value
        	}
        	else{
        	        barcodeScanner.value = '';// Reset barcode scanner value
           		return;
           	}
        } 

        else {
            // Save the character
            barcodeScanner.value += e.key.toString();

            if (!barcodeScanner.timer) {
                // Reset scanner value if timeout
                barcodeScanner.timer = setTimeout(function () {
                    barcodeScanner.timer = null;
                    //barcodeScanner.value = '';
                }, barcodeScanner.timeLimit);
            }
        }

        console.log(barcodeScanner.value);
    });

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
				let newType = {'B2BOrders': 'all'} /*, 'B2BWholesale':81, 'B2BTransfer':82};*/
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
		page.els.downloadCollectedOrdersBtn.addEventListener('click', collectedOrders, false);
		page.els.downloadSortNewOrdersBtn.addEventListener('click', sortedOrders, false);
	}
}, false);


async function downloadNewOrders() {
	
	let datefrom = document.querySelector('#content-download-new-orders #datefrom').value;
	let dateto = document.querySelector('#content-download-new-orders #dateto').value;


	var store;
	try {
		store = page.els.downloadNewOrdersForm.elements['nos'].value;
	} catch (e) {}

	page.els.downloadNewOrdersBtn.disabled = true;
	page.els.downloadNewOrdersBtn.textContent = 'Downloading new orders, please wait...';

	try {
		let response = await fetch(apiServer+'downloadB2BNewOrders/' + store + '?datefrom=' + datefrom + '&dateto=' + dateto);
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

			let table2 = document.querySelector('#collected-new-orders');
			table2.classList.add('hide');

			let table3 = document.querySelector('#sorted-new-orders');
			table3.classList.add('hide');

			let tBody = document.querySelector('#new-order-details tbody');
			while (tBody.firstChild) {
				tBody.removeChild(tBody.firstChild);
			}

			let tHead = document.querySelector('#new-order-details thead tr');
			while (tHead.lastChild.textContent.startsWith('Loc') || tHead.lastChild.textContent.startsWith('Qty')  || tHead.lastChild.textContent.startsWith('Picked')) {
				tHead.removeChild(tHead.lastChild);
			}
		    var cols = ['actions', 'notes', 'orderID', 'sku', 'title', 'itemQty', 'checkPF' /*'itemPickedQty'*/];

		    let newOrders = data.data;
		    let inventorys = data.inventory;

		 //    let totalNewOrders = Object.keys(newOrders).length;
		 //    // console.log(totalNewOrders);
			// let totalPage = Math.ceil(totalNewOrders/perpage);
			// let newOrdersShow = Object.keys(newOrders).slice((pageNumber-1)*perpage, (pageNumber*perpage > totalNewOrders ? totalNewOrders :pageNumber*perpage));
	
			
		    for (let sr of newOrders) {
		     	// console.log(sr);
		     	let orderData = JSON.parse(sr.data);
		     	for (let item of orderData.items) {
		     		// console.log(item);
		  			let tr = document.createElement('tr');
		  			tr.dataset.id = sr.id;
		  			tr.dataset.sku = item.sku;
		  			tr.dataset.lineItemID = item.lineItemID;
		  			tr.dataset.barcode = inventorys[item.sku] ? inventorys[item.sku].itemBarcode.replace(/\s+/g, '') : null;
		  			tr.dataset.image = inventorys[item.sku] ? inventorys[item.sku].image : null;

		  			let locselected = (sr.locationselected);
		  			//console.log(locselected);
		  			if (locselected) {
		  				tr.dataset.locationselected = locselected;
		  			}	

		     		let log = inventorys[item.sku] ? inventorys[item.sku].locations : [];
		     		// console.log(log);
		     		log = log.slice(0,4);
					for (let i=0; i<log.length; i++) {
						let checkCols = cols.length;
						let icomparison = 7+(i*3);		
 						// console.log(icomparison);
						if (checkCols == icomparison){
							cols.push('loc'+(i+1));
							cols.push('qty'+(i+1));
							cols.push('picked'+(i+1));

							let header = document.querySelector('#new-order-details .tr-header');
							let newTD = document.createElement('th');
							newTD.innerHTML = 'Loc'+(i+1);
							// newTD.id = 'loc'+(i+1);
							newTD.addEventListener('click', function() {
								let n = 7+(i*3);
								sortTable(n);
							});

							let newTD2 = document.createElement('th');
							newTD2.innerHTML = 'Qty'+(i+1);
							// newTD2.id = 'qty'+(i+1);
							newTD2.addEventListener('click', function() {
								sortTable(7+i+1);
							});

							let newTD3 = document.createElement('th');		     
		            		newTD3.innerHTML = 'Picked'+(i+1);	
		            		newTD3.setAttribute('style','font-size:20px;');
		            		// newTD3.id = 'itemPickedQty';       		            		

							header.appendChild(newTD);
							header.appendChild(newTD2);		
							header.appendChild(newTD3);					

						}	
					} 

		     		for (let col of cols) {
		     			let td = document.createElement('td');
		     			td.classList.add(col);
		     			if (col == 'actions') {
		     				var div = document.createElement('div');
		     				div.setAttribute('class','btn-group');

		     				// var donebtn = document.createElement('button');
			        // 		donebtn.setAttribute('id','doneDetails');
			        // 		// savebtn.setAttribute("style", "border-radius: 50%;");
			        // 		donebtn.innerHTML = '<i class="icon-check"></i>';
			        // 		donebtn.style.fontSize = '30px';
			        // 		div.appendChild(donebtn);
			        // 		td.appendChild(div);
			        	

					     	var savebtn = document.createElement('button');
			        		savebtn.setAttribute('id','saveDetails');
			        		savebtn.innerHTML = '<i class="icon-save"></i>';
			        		div.appendChild(savebtn);
			        		td.appendChild(div);
			  

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
							// console.log(ln);
							let lineItemID = tr.dataset.lineItemID;

							input.value = ln ? (ln[lineItemID] ? ln[lineItemID][0].notes : '') : '';

							td.appendChild(input);
		     			}
		     			else if (col == 'orderID') {
		     				td.textContent = sr.salesRecordID;
		     			}
		     			else if (col == 'sku') {

		     				var linkEl = document.createElement('a');
							linkEl.innerHTML = item.sku;
							linkEl.href = "#";
							td.appendChild(linkEl);

							linkEl.addEventListener("click", function(e){

								// console.log(window.page.scanned);

			        			document.getElementById('box-outer').classList.add('flex');
								document.getElementById('item-Details').classList.remove('hide');	
								if (window.page.scanned == false){
									document.getElementById('bypass').style.display = 'none';
								}
								else {
									document.getElementById('bypass').style.display = 'block';
								}

								let sku = e.target.closest('tr').dataset.sku;
								let barcode = e.target.closest('tr').dataset.barcode;
								let image = e.target.closest('tr').dataset.image;								

								let lineItemID = e.target.closest('tr').dataset.lineItemID;
								let itemDetails = document.getElementById('item-Details-table');
								// while (itemDetails.firstChild) {
								//     itemDetails.removeChild(itemDetails.firstChild);
								// }

								itemDetails.querySelector('.itemSku').textContent = sku;
								itemDetails.querySelector('.itemBarcode').textContent = barcode;

								let img = document.createElement('img');
								img.src =  image;
								img.style.width = '100px';
								let itemImage = document.querySelector('.itemImage');
								
								while (itemImage.firstChild) {
								    itemImage.removeChild(itemImage.firstChild);
								}
								itemImage.appendChild(img);

								async function updateBarcode(event){
									let tr = e.target.closest('tr'); 
									// console.log(tr);
									let table = document.querySelector('#item-Details-table');
									let customSku = table.querySelector('.itemSku').textContent;
									let itemBarcode = table.querySelector('.itemBarcode').textContent;

									let formData = new FormData();
									formData.append('customSku', customSku);
									formData.append('itemBarcode', itemBarcode);

									let response = await fetch(apiServer+'stockInventory/update', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
									let responseData = await response.json();

									if (!response.ok || responseData.result != 'success') {		
										page.notification.show(responseData.result);
									} else {
										page.notification.show('Item Barcode update successs.');
										tr.dataset.barcode = itemBarcode;
										closeBox();
										//console.log(e.target.closest('tr'));
									}

								}

								function bypass(event){
									let tr = e.target.closest('tr');
									// console.log(tr);
									tr.classList.add('bg-red');

				           			let pickQtyTds = tr.querySelectorAll('td[class^="picked"] input');
				           			// console.log(pickQtyTds);
				           			//locations
									for (let pickQtyTd of pickQtyTds) {
										// console.log(pickQtyTd);
										// pickQtyTd.removeAttribute('readonly');
										pickQtyTd.disabled = false;
										// console.log(pickQtyTd);
									}
									closeBox();
								}

								let button = document.querySelector('#bypass');
								button.addEventListener("click", bypass);

								let updateButton = document.querySelector('#barcode-save');
								updateButton.addEventListener("click", updateBarcode);

								document.querySelector('#box-outer #box-container .close').addEventListener('click', ()=>{
									document.getElementById('bypass').removeEventListener('click', bypass);
									document.getElementById('barcode-save').removeEventListener('click', updateBarcode);
								});		

			        		});
		     			}
		     			else if (col == 'title') {
		     				td.textContent = item.title;
		     			}
		     			else if (col == 'itemQty') {
		     				td.textContent = item.quantity;
		     			}
		     			else if (col == 'checkPF') {
		     				let togglebtn = document.createElement("label");
							    togglebtn.classList.add("switch");
							    //style="display: none"
							    togglebtn.innerHTML = '<input type="checkbox" id="togBtn" disabled="disabled"><div class="slider round"></div>';
							    td.append(togglebtn);
		     				}

		     			for (let i=0; i<log.length; i++) {
		     				// console.log(log);
		     				if (col == ('loc'+(i+1))){
		     					let bay = (log[i].bay).replace("EMG-", "");
								td.textContent = bay;
								// console.log(log[i].bay);
							}
							if (col == ('qty'+(i+1))){
								let indivQty = log[i].indivQty;
								td.textContent = indivQty;
								// console.log(log[i].indivQty);
							}
							if (col == ('picked'+(i+1))) {
								let ele = document.createElement('input');
			            		ele.setAttribute('type', 'text');
			            		ele.setAttribute('value', '');
			            		ele.setAttribute('id', 'pickedQty'+(i+1));
			            		ele.style.width = "40px";
		            			ele.style.height = "30px";	
		            			ele.style.fontSize = "20px";
		            			ele.style.textAlign = "center";
		            			// ele.setAttribute('readOnly',true);
		            			ele.disabled = true;

		            			ele.dataset.id = log[i].id;
		            			ele.dataset.bay = log[i].bay; 
		            			ele.dataset.invID = log[i].invID;

		            			ele.addEventListener("blur", function(e){
		            				if (tr.classList.contains('bg-red')) {
			            				e.preventDefault();
	                        			e.stopPropagation();
	                        			let qty = ele.value;
	                        			let classeNome = 'qty'+e.target.closest('td').className.slice(6);
	                        			let qtyInLocation = e.target.closest('tr').querySelector('.'+classeNome).textContent;

	                        			var testObj = (tr.dataset.locationselected) ? JSON.parse(tr.dataset.locationselected) : '';
	                        			var testKeyCount = Object.keys(testObj).length;
	                        			let testCount = 0;
	                        			//check if qty is different otherwise do not need to update
	                        			for (let c = 0; c < testKeyCount; c++) { //different items in a order
	                        				if (tr.dataset.lineItemID == Object.keys(testObj)[c]) {
	                        					for( let d = 0; d < testObj[Object.keys(testObj)[c]].length; d++){ //different locationss for a specific item
	                        						if (testObj[Object.keys(testObj)[c]][d].id == ele.dataset.id){
	                        							if(testObj[Object.keys(testObj)[c]][d].indivQty == qty) {
	                        								return;
	                        							}
	                        						}
	                        					}
	                        				}
	                        			}
	                        			function returnOldValues(){
	                    					var obj = (tr.dataset.locationselected) ? JSON.parse(tr.dataset.locationselected) : '';
									 		var keyCount = Object.keys(obj).length;
									 		let count = 0;
									 		for ( let a = 0; a < keyCount; a++) {
										 		if (tr.dataset.lineItemID == Object.keys(obj)[a]) {
										 			for( let b = 0; b < obj[Object.keys(obj)[a]].length; b++){
										 				if (obj[Object.keys(obj)[a]][b].id == ele.dataset.id){
															ele.value=obj[Object.keys(obj)[a]][b].indivQty;
															count++;				 					
										 				}
										 			}
										 		}
										 	}
										 	if (count == 0) { ele.value = "" };
		     								return;	
	                        			}

		     							if (qty == null || qty == "" || qty == 0){
											ele.value = null;
											//returnOldValues();
											saveSelectedOrderDetails(e);
											checkFullyPicked(e);
											return;
										}
			     						if (parseInt(qty) > 0 && isNaN(qty) == false){
			     							let tds = e.target.closest('tr').querySelectorAll('td[class^="picked"]');
			     							let sum = 0;
			     							for (let td of tds){
			     								let colPicked = td.querySelector('input')?.value;
			     								if (colPicked) {
			     									sum = sum + parseInt(colPicked);
			     								}
			     							}
			     							if (sum > parseInt(e.target.closest('tr').querySelector('.itemQty').textContent)) {
			     								swal('Maximum Quantity: '+e.target.closest('tr').querySelector('.itemQty').textContent,'','error');
			   								returnOldValues();
			     							}
			     							else if (parseInt(qty) > parseInt(qtyInLocation)){
			     								swal('Quantity Exceeded at this location : '+e.target.closest('tr').querySelector('.itemQty').textContent,'','error');
			   									returnOldValues();
			     							}
			     							else{
			     								saveSelectedOrderDetails(e);
			     							}

			     						}
			     						else {
			     							swal(qty+' is not a valid number','','error');
			     							returnOldValues();
		                            		return;
			     						}
			     						checkFullyPicked(e);
		     						}
		     					}, false);
	     						
		            			if (tr.dataset.locationselected){
		     						let lineItemID = tr.dataset.lineItemID;
		     						let locsel = JSON.parse(locselected)[lineItemID];
		     						if (locsel) {
		     							for (let loc of locsel) {
		     								// console.log(loc);
		     								if (loc.id == ele.dataset.id) {
		     									ele.value = loc.indivQty;
		     								}
		     							}
		     						}
		     					}

		      //       			var pQty = table.querySelectorAll('tr input[id^="pickedQty"]');
		      //       			console.log(pQty);   
		      //       			let pLoc = table.querySelectorAll('tr td[class^="loc"]');
								// console.log(pLoc);     

								// let lineItemID = tr.dataset.lineItemID;
								// let locsav = locSave ? locSave[lineItemID] : '';
								// for (let i=0; i<locSave; i++) {
								// 	let ls = locSave[i];
								// 	console.log(ls);	

			     //        			for (let pl of pLoc) {
			     //        				console.log(pl.innerHTML);
			     //        				if (pl.innerHTML == ls[0]) {
			     //        					console.log(pl.innerHTML == ls[0]);
			     //        				}
			     //        			}
			     //        		}

								td.appendChild(ele);
							}
		     			}
		     			tr.appendChild(td);
		     		}
		     		let totalQty = tr.querySelector('.itemQty').textContent;
					let tds = tr.querySelectorAll('td[class^="picked"]');
					let sum = 0;
					for (let td of tds){
						let colPicked = td.querySelector('input')?.value;
						if (colPicked) {
							sum = sum + parseInt(colPicked);
						}
					}
					if (sum >= totalQty) {
						tr.querySelector('.checkPF .switch input').checked = true;
						tr.style.backgroundColor = 'rgb(161, 255, 162)';
					}
					else{
						tr.querySelector('.checkPF .switch input').checked = false;
						tr.style.backgroundColor = 'transparent';
					}
		     		tBody.appendChild(tr);
		     	}
		    }
		    let trs = document.querySelectorAll('#new-order-details>tbody>tr');
			for(let tr of trs){
				let tds = tr.querySelectorAll('td');
				if (tds.length != cols.length){
					let add = cols.length-tds.length;
					for(let i=0; i<add; i++){
						let emptyTD = document.createElement('td');
						tr.appendChild(emptyTD);
					}
				}
			}
		}
		else {
			page.notification.show('No orders found', {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}
	//loadQuantity();
	page.els.downloadNewOrdersBtn.textContent = 'Download New Orders';
	page.els.downloadNewOrdersBtn.disabled = false;
}

async function saveSelectedOrderDetails(e) {
	//let trs = e.target.closest('#new-order-details').querySelector('tbody tr');
	let trs = e.target.closest('tr');
	// console.log(trs);
	let lineItemID = trs.dataset.lineItemID;
	let notes = trs.querySelector('.notes').firstChild.value;
	// console.log(notes);
	// let itemPickedQty =  trs.querySelector('.itemPickedQty').firstChild.value;
	// console.log(pickedQty);

	let dbID = trs.dataset.id;

	let orderDetail = [];
	let locationSaved = [];
	let od = {};
	od.id = trs.dataset.id;
	od.customSku = trs.dataset.sku;
	od.notes = notes;

	let pickedQtys = trs.querySelectorAll('input[id^="pickedQty"]');
	// console.log(pickedQtys);
	let pickedLocs = trs.querySelectorAll('td[class^="loc"]');
	// console.log(pickedLocs);

	for (let pq of pickedQtys) {
		let qty = pq.value;
		let bay = '';
		if (qty) {
			/*let locNum = pq.id.replace('pickedQty','');
			for (let pl of pickedLocs) {
				if (pl.className.replace('loc','')==locNum) {*/
					let loc = {};

					loc.id = pq.dataset.id;
					//console.log(pq.dataset.id)
					loc.bay = pq.dataset.bay;
					loc.invid = pq.dataset.invID;
					loc.indivQty = qty;
					loc.cartonQty = 0;
					loc.type = '';
					loc.customSku = trs.dataset.sku;
					locationSaved.push(loc);
					
				// }
			// }
		}
	}

	let togCheckbox = trs.querySelector('input[type="checkbox"]');
	if (togCheckbox.checked) {
		//console.log('f');
		od.collected = 'F';
	} else {
		//console.log('p');
		od.collected = 'p';
	}

	orderDetail.push(od);

	let orderDetails = {};
	orderDetails[lineItemID] = orderDetail;
	// console.log(orderDetails);

	let locationSaveData = {};
	/*var obj = (trs.dataset.locationselected) ? JSON.parse(trs.dataset.locationselected) : "";
	var keyCount = Object.keys(obj).length;
	for ( let a = 0; a < keyCount; a++) {
		locationSaveData[Object.keys(obj)[a]] = Object.values(obj[Object.keys(obj)[a]]);
	}*/
	
	locationSaveData[lineItemID] = locationSaved;
	

	let formData = new FormData();
	formData.append('orderID', dbID);
	formData.append('locationNotes', JSON.stringify(orderDetails));
	formData.append('singlelocationselected', JSON.stringify(locationSaveData));

	let response = await fetch(apiServer+'order/saveLocationSelected', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let data = await response.json();

	if (!response.ok) {
		page.notification.show('Error: '+data.result, {hide: false});
	} else {
		page.notification.show('updated');
		if (data.allLocations && data.result =='success'){
			trs.dataset.locationselected = data.allLocations;
		}
			swal('Quantity updated/saved successfully!','','success');
	}
}

function sortTable(n) {
  	
  	let tbody = document.querySelector("#new-order-details tbody");
  	if (document.querySelector('#sorted-new-orders').classList.contains('hide') == false){
  		tbody = document.querySelector("#sorted-new-orders tbody");
  	}
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

// Close popup box
function closeBox() {
	document.getElementById('box-outer').classList.remove('flex');
	setTimeout(function() {
		for (let el of document.querySelectorAll('#box-container > div:not(.close)')) {
			el.classList.add('hide');
		}
	}, 400);
	window.page.scanned = false;
}

/*function loadQuantity() {

	let trs = document.querySelectorAll('#new-order-details>tbody>tr');
	for (let tr of trs) {
	 	let tds = tr.querySelectorAll('td');
	 	tds.querySelectorAll("[class^=]")
	 	//let numberLocations = (tds.length - 7) / 3;
	 	if (tr.dataset.locationselected){
	 		//console.log(tr.dataset.locationselected);
	 		var obj = JSON.parse(tr.dataset.locationselected);
	 		var keyCount = Object.keys(obj).length;
	 		for ( let a = 0; a < keyCount; a++) {
		 		if (tr.dataset.lineItemID == Object.keys(obj)[a]) {
		 			console.log(obj[Object.keys(obj)[a]].length);
					//for( let prop in obj ){
		 				for ( let j = 0; j < obj[Object.keys(obj)[a]].length; j++ ) {
		 					//for (let i=1; i<=numberLocations; i++){
		 						console.log(tr.dataset.lineItemID+' '+obj[prop][j].id);
		 						
		 						let name = 'loc'+(parseInt(j)+1);
		 						let classPick = 'pickedQty'+(parseInt(j)+1);
		 						console.log(classPick);
		 						console.log(tr.querySelector(`[id=${CSS.escape(classPick)}]`).dataset.id);
		 						/*if (obj[prop][j].id == tr.querySelector(`[id=${CSS.escape(classPick)}]`).dataset.id) {
		 							tr.querySelector(`[id=${CSS.escape(classPick)}]`).textContent = obj[prop][j][1];
		 						}*/

		 					//}
		 		    	/*}
		 			//}
		 		}
		 	}
		}
	}
}*/

function checkFullyPicked(e){
	let tr = e.target.closest('tr');
	let totalQty = tr.querySelector('.itemQty').textContent;
	let tds = tr.querySelectorAll('td[class^="picked"]');
	let sum = 0;
	for (let td of tds){
		let colPicked = td.querySelector('input')?.value;
		if (colPicked) {
			sum = sum + parseInt(colPicked);
		}
	}
	if (sum >= totalQty) {
		tr.querySelector('.checkPF .switch input').checked = true;
		tr.style.backgroundColor = 'rgb(161, 255, 162)';
	}
	else{
		tr.querySelector('.checkPF .switch input').checked = false;
		tr.style.backgroundColor = 'transparent';
	}
}

async function collectedOrders(){
	let datefrom = document.querySelector('#content-download-new-orders #datefrom').value;
	let dateto = document.querySelector('#content-download-new-orders #dateto').value;


	var store;
	try {
		store = page.els.downloadNewOrdersForm.elements['nos'].value;
	} catch (e) {}

	page.els.downloadCollectedOrdersBtn.disabled = true;
	page.els.downloadCollectedOrdersBtn.textContent = 'Downloading collected orders, please wait...';

	try {
		let response = await fetch(apiServer+'downloadB2BNewOrders/' + store + '?datefrom=' + datefrom + '&dateto=' + dateto);
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
			table.classList.add('hide');

			let table2 = document.querySelector('#sorted-new-orders');
			table2.classList.add('hide');

			let tableOrders = document.querySelector('#collected-new-orders');
			tableOrders.classList.remove('hide');

			let tBody = document.querySelector('#collected-new-orders tbody');
			while (tBody.firstChild) {
				tBody.removeChild(tBody.firstChild);
			}

			let orders = data.orders;
			let cols = [/*'id',*/'orderID','SKUS Qtys','SKUS Collected','SKUs Sorted']

		    	for (let order of orders){
		    		let tr = document.createElement('tr');
		    		tr.dataset.id = order.id;
		    		tr.dataset.orderID = order.orderID;
		    		for (let col of cols){
		    			let td = document.createElement('td');
		    			if (col == 'SKUS Qtys'){
		    				td.textContent = order.skus.length;
		    				tr.dataset.totalQty = order.skus.length;
		    			}
		    			else if (col == 'SKUS Collected'){
		    				let count = 0;
		    				for (let sku of order.skus){
		    					if (sku.qty == sku.collected){
		    						count++
		    					}
		    				}
		    				td.textContent = count;
		    				td.style.display ='none';
		    				tr.dataset.collectedQty = count;
		    			}
		    			else if (col == 'SKUs Sorted'){
		    				let count = 0;
		    				
		    				for (let sku of order.skus){
		    					if (sku.qty == sku.collected && sku.sorted == true){
		    						count++
		    					}
		    				}
		    				td.textContent = count;
		    				tr.dataset.sortedQty = count;
		    			}
		    			else{
		    				td.textContent = order[col];
		    			}
		    			tr.appendChild(td);

		    		}
		    		if (tr.dataset.collectedQty == tr.dataset.totalQty){
		    			tr.style.backgroundColor = 'rgb(161, 255, 162)';
		    		}
		    		tBody.appendChild(tr);
		    	}


		}
		else {
			page.notification.show('No orders found', {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadCollectedOrdersBtn.textContent = 'Collected New Orders';
	page.els.downloadCollectedOrdersBtn.disabled = false;
}

async function sortedOrders(){
	let datefrom = document.querySelector('#content-download-new-orders #datefrom').value;
	let dateto = document.querySelector('#content-download-new-orders #dateto').value;


	var store;
	try {
		store = page.els.downloadNewOrdersForm.elements['nos'].value;
	} catch (e) {}

	page.els.downloadSortNewOrdersBtn.disabled = true;
	page.els.downloadSortNewOrdersBtn.textContent = 'Sorting collected orders, please wait...';

	try {
		let response = await fetch(apiServer+'downloadB2BNewOrders/' + store + '?datefrom=' + datefrom + '&dateto=' + dateto);
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
			table.classList.add('hide');

			let table2 = document.querySelector('#collected-new-orders');
			table2.classList.add('hide');

			let tableOrders = document.querySelector('#sorted-new-orders');
			tableOrders.classList.remove('hide');

			let tBody = document.querySelector('#sorted-new-orders tbody');
			while (tBody.firstChild) {
				tBody.removeChild(tBody.firstChild);
			}

			    var cols = ['orderID', 'sku', 'title', 'itemQty', 'checkPF', 'checkSorted' /*'itemPickedQty'*/];

		    let newOrders = data.data;
		    let inventorys = data.inventory;

		 //    let totalNewOrders = Object.keys(newOrders).length;
		 //    // console.log(totalNewOrders);
			// let totalPage = Math.ceil(totalNewOrders/perpage);
			// let newOrdersShow = Object.keys(newOrders).slice((pageNumber-1)*perpage, (pageNumber*perpage > totalNewOrders ? totalNewOrders :pageNumber*perpage));
	
			
		    for (let sr of newOrders) {
		     	// console.log(sr);
		     	let orderData = JSON.parse(sr.data);
		     	for (let item of orderData.items) {

		     		let tr = document.createElement('tr');

		     		let locselected = (sr.locationselected);
		     		let locnotes = sr.locationNotes;
	  			//console.log(locselected);
	  			if (locselected) {
	  				tr.dataset.locationselected = locselected;
	  				let lineItemID = item.lineItemID;
					let locsel = JSON.parse(locselected)[lineItemID];
					let total = 0;
					if (locsel) {
						for (let loc of locsel) {
							total = total + parseInt(loc.indivQty);
						}
					}
					if (total < parseInt(item.quantity)){
						continue;
					}
	  			}
	  			else{
	  				continue;
	  			}

	  			let skuSorted;

	  			if (locnotes) {
	  				tr.dataset.locationNotes = locnotes;
	  				let lineItemID = item.lineItemID;
					let locnot = JSON.parse(locnotes)[lineItemID];
					if (locnot) {
						if (locnot[0].sorted == 'true'){
							skuSorted = true;
						}
						else{
							skuSorted = false;
						}
					}

	  			}
	  			else{
	  				continue;
	  			}

	  			
	  			tr.dataset.id = sr.id;
	  			tr.dataset.sku = item.sku;
	  			tr.dataset.lineItemID = item.lineItemID;
	  			tr.dataset.barcode = inventorys[item.sku] ? inventorys[item.sku].itemBarcode.replace(/\s+/g, '') : null;
	  			tr.dataset.image = inventorys[item.sku] ? inventorys[item.sku].image : null;


		     		for (let col of cols) {
		     			let td = document.createElement('td');
		     			td.classList.add(col);
		     			if (col == 'orderID') {
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
		     			else if (col == 'checkPF') {
		     				/*if (locselected){

	     					}*/
		     				//for (let )
		     				let togglebtn = document.createElement("label");
						togglebtn.classList.add("switch");
						//style="display: none"
						togglebtn.innerHTML = '<input checked type="checkbox" id="togBtn" disabled="disabled"><div class="slider round"></div>';
						td.append(togglebtn);
						
	     				}
	     				else if (col == 'checkSorted') {
	     					let togglebtn = document.createElement("label");
						togglebtn.classList.add("switch");

						if (skuSorted == true){
							togglebtn.innerHTML = '<input checked type="checkbox" id="togBtn" disabled="disabled"><div id="slider2" class="slider round"></div></input>';
						}
						else{
							togglebtn.innerHTML = '<input type="checkbox" id="togBtn" disabled="disabled"><div id="slider2" class="slider round"></div></input>';
						}
						togglebtn.addEventListener("change", function(e){
							e.stopPropagation();
							e.preventDefault();
			        			saveSelectedSkuSorted(e);	
			        		}, false);
						td.append(togglebtn);
	     				}


		     			tr.appendChild(td);
		     		}

		     		tBody.appendChild(tr);
		     	}
		    }
		
		}
		else {
			page.notification.show('No orders found', {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	sortTable(1);

	page.els.downloadSortNewOrdersBtn.textContent = 'Sort Collected SKUs';
	page.els.downloadSortNewOrdersBtn.disabled = false;
}

async function saveSelectedSkuSorted(e){
	
	let tr = e.target.closest('tr');

	let lineItemID = tr.dataset.lineItemID;
	let dbID = tr.dataset.id;
	let sorted = tr.querySelector('.checkSorted .switch input').checked;


	let formData = new FormData();
	formData.append('orderID', dbID);
	formData.append('lineItemID', lineItemID);
	formData.append('sorted', sorted);

	let response = await fetch(apiServer+'order/saveLocationSorted', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let data = await response.json();

	if (!response.ok) {
		page.notification.show('Error: '+data.result, {hide: false});
	} else {
		page.notification.show('updated');
		if (data.allLocations && data.result =='success'){
			if (sorted == true){
				swal('Sorted successfully!',lineItemID,'success');
			}
			else if (sorted == false){
				swal('Unsorted successfully!',lineItemID,'success');
			}
		}
			
	}
	
}