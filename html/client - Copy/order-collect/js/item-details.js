import {changeScanStatus} from './orders.js';


// Get item details
async function getItemDetails(recordData, post = false) {
	var itemList = [];
	var itemNumList = [];
	var skuList = [];
	var bundleItemList = [];
	var getFromDB = false;

	do {
		for (let recordEntry of recordData) {
			let store = recordEntry[0], recordNum = recordEntry[1];
			let rowData = saleRecords[store].records[recordNum];
			if (!rowData) continue;

			// Create list of items and item details
			for (let i = 0; i < rowData.Items.length; i++) {
				if (itemDetails[rowData.Items[i].ItemNum] || itemDetails[rowData.Items[i].SKU]) {
					// Add item details to list
					itemList.push(itemDetails[rowData.Items[i].ItemNum] || itemDetails[rowData.Items[i].SKU]);
				}
				else {
					// Add item SKU/number and store ID to list
					getFromDB = true;
					/*if (rowData.Items[i].SKU) {
						skuList.push([rowData.Items[i].SKU, store]);
					}
					else {
						itemNumList.push([rowData.Items[i].ItemNum, store]);
					}*/
					if (rowData.Items[i].ItemNum) {
						itemNumList.push([rowData.Items[i].ItemNum, store]);		
					}
					else {
						skuList.push([rowData.Items[i].SKU, store]);
					}
				}
			}
		}

		/*let count = 0;
		for (let item of itemNumList) {
			if (item[0] == "332702650063") {
				count++;
			}
		}
		console.log("count: " + count);*/
		//console.log(itemNumList);
		//console.log(skuList);


		// Get item details from database if needed
		if (getFromDB && ( itemNumList.length || skuList.length)) {
			let response, data;
			try {
				if (post) {
					let formData = new FormData();
					formData.append('items', JSON.stringify(itemNumList));
					formData.append('skus', JSON.stringify(skuList));
					response = await fetch(apiServer+'items/get', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				}
				else {
					response = await fetch(apiServer+'items/get?items='+encodeURIComponent(JSON.stringify(itemNumList))+'&skus='+encodeURIComponent(JSON.stringify(skuList)), {headers: {'DC-Access-Token': page.userToken}});
				}
				data = await response.json();
			}
			catch (e) {
				page.notification.show('Error: Could not connect to the server.');
				break;
			}

			if (!response.ok) {
				page.notification.show('Error: '+data.result);
				break;
			}
			else if (data.result != 'success' || !data.items) {
				page.notification.show(data.result);
				break;
			}

			// Save all the item details using SKU and/or item number
			let itemsProcessed = {};
			let itemFields = ['sku', 'num'];
			let itemList2 = [];
			
			for (let item of data.items) {
				if (item.bundle) {
					let bundle = JSON.parse(item.bundle);
					for (let itemID in bundle) {
						if (!bundleItemList.includes(itemID)) {
							bundleItemList.push(itemID);
						}
					}
				}

				for (let field of itemFields) {
					if (!item[field]) continue;
					let itemNum = item[field].toString();
					if (!itemsProcessed.hasOwnProperty(itemNum)) {
						// Create new item or reset existing item
						itemsProcessed[itemNum] = true;
						itemDetails[itemNum] = [];
					}

					// Save item details
					if (!checkInclude(itemNum, item)) {
						itemDetails[itemNum].push(item);
					}
					
				}
				itemList.push(item);
			}

			if (bundleItemList.length > 0) {
				let formData2 = new FormData();
				formData2.append('bundleitems', JSON.stringify(bundleItemList));
				let response2 = await fetch(apiServer+'bundleitems/get', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData2});
				let data2 = await response2.json();
				for (let dataItem in data2.items) {
					if (!bundleItems.hasOwnProperty(dataItem)) {
						bundleItems[dataItem] = data2.items[dataItem];
					}
					itemList2.push([data2.items[dataItem].ItemNum, data2.items[dataItem].storeID]);
				}

				let formData3 = new FormData();
				formData3.append('items', JSON.stringify(itemList2));
				let response3 = await fetch(apiServer+'items/get', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData3});
				let data3 = await response3.json();
				for (let dataItem of data3.items) {
					for (let field of itemFields) {
						if (!dataItem[field]) continue;
						let itemNum = dataItem[field].toString();
						if (!itemsProcessed.hasOwnProperty(itemNum)) {
							// Create new item or reset existing item
							itemsProcessed[itemNum] = true;
							itemDetails[itemNum] = [];
						}

						// Save item details
						if (!checkInclude(itemNum, dataItem)) {
							itemDetails[itemNum].push(dataItem);
						}
					}
				}
			}
			
			//console.log(bundleItems);
		}
	} while(0)
	
	return itemList;
}

// Load item details
async function loadItemDetails(store, recordNum, table) {
	var rowDataToday = saleRecords[store].today[recordNum];
	var recordItemScanTemplate = document.querySelector('#record-item-scan-template').content;
	var recordItemScanTemplate2 = document.querySelector('#record-indiv-item-scan-template').content;
	var needScan = false;
	//console.log(recordNum);
	// Get item details
	var dataItems = await getItemDetails([[store, recordNum]]);

	// Add item details to the table
	if (dataItems && dataItems.length) {
		let tableRows = table.querySelectorAll('tr');
		for (let tableRow of tableRows) {
			let items = [], itemNumFound = false;

			if (itemDetails.hasOwnProperty(tableRow.dataset.itemNum)) {
				items = itemDetails[tableRow.dataset.itemNum];
				itemNumFound = true;
			}
			else if (itemDetails.hasOwnProperty(tableRow.dataset.sku)) {
				items = itemDetails[tableRow.dataset.sku];
				
			}

			for (let item of items) {
				let addDetails = false;
				if (store != item.storeID) continue;

				if (itemNumFound) {
					// Find the specific variation
					/*let tableRowItemVariation = tableRow.dataset.itemTitle.match(reVariation);


					let itemVariation = item.name.match(reVariation);

					console.log(tableRowItemVariation);
					console.log(itemVariation);
					if ((!tableRowItemVariation || !itemVariation) || tableRowItemVariation[0].toLowerCase() == itemVariation[0].toLowerCase()) {
						// Add item details if there is no variation or otherwise find the specific variation
						addDetails = true;
					}*/
					if (item.sku && tableRow.dataset.sku) {
						if (item.sku == tableRow.dataset.sku) {
							addDetails = true;
						}
					}else {
						if (tableRow.dataset.itemTitle && tableRow.dataset.itemTitle == item.name) {
							addDetails = true;
						}
						
					} 
					

				}
				else {
					// Don't check anything if using a SKU number
					if (store==71) {
						addDetails = true;
					} else {
						if (item.num && tableRow.dataset.itemNum) {
							if (item.num == tableRow.dataset.itemNum) {
								addDetails = true;
							}
						}else {
							if (tableRow.dataset.itemTitle && tableRow.dataset.itemTitle == item.name) {
								addDetails = true;
							}
							
						} 
					}		
				}

				/*if (recordNum=='128709') {
					console.log(addDetails);
				}*/

				if (!addDetails) continue;

				// Add item details
				tableRow.dataset.id = item.id;
				tableRow.dataset.vr = item.vr;
				tableRow.dataset.fp = item.flatpack;
				tableRow.dataset.fwfp = item.fwfp;
				tableRow.dataset.factory = item.factory;
				//tableRow.dataset.partialrefund = item.partialrefund;
				tableRow.dataset.costco = item.costco;
				tableRow.dataset.inventory = JSON.stringify(item.inventory);
				tableRow.dataset.singleItemBarcode = item.singleItemBarcode;
				tableRow.dataset.singleItemMultiple = item.singleItemMultiple;
				tableRow.dataset.cartonBarcode = item.barcode;
				tableRow.dataset.cartonMultiple = item.quantity;
				tableRow.dataset.ebayQuantity = item.ebayquantity;
				tableRow.dataset.reservedQuantity = item.reservedQuantity;
				tableRow.dataset.damagedQty = item.damagedQty;
				tableRow.dataset.customSku = item.customSku;

				if (page.type == PAGE_TYPE.COLLECT) {
					if (tableRow.dataset.vr == 1) {
						tableRow.querySelector('#markvr').textContent = 'UnVR';
					}

					if (tableRow.dataset.fp == 1 && tableRow.querySelector('#markfp')) {
						tableRow.querySelector('#markfp').textContent = 'UnFlatpack';
					}

					/*if (tableRow.dataset.fwfp == 1) {
						tableRow.querySelector('#markfwfp').textContent = 'UnFWFP';
					}*/

					if (tableRow.dataset.factory == 1) {
						tableRow.querySelector('#markfactory').textContent = 'UnFactory';
					}

					if (tableRow.dataset.costco == 1) {
						tableRow.querySelector('#markcostco').textContent = 'UnCostco';
					}

					if (tableRow.dataset.partialrefund == 1) {
						tableRow.querySelector('#markparref').textContent = 'UnPartial refund';
					}

					// if (tableRow.dataset.fgb == 1) {
					// 	tableRow.querySelector('#markfgb').textContent = 'UnFGB';
					// }

					// if (tableRow.dataset.morlife == 1) {
					// 	tableRow.querySelector('#markmorlife').textContent = 'UnMORLIFE';
					// }
				}
				//tableRow.dataset.quantity = item.quantity || 1;

				if (item.upc || item.barcode) {
					let itemScanEl = tableRow.querySelector('.item-scan');
					if (itemScanEl) {
						// Set the number of items to be scanned
						needScan = true;
						let itemTotal = item.quantity * parseInt(tableRow.dataset.itemQuantity, 10);
						tableRow.dataset.scanDone = 'false';
						recordItemScanTemplate.querySelector('.current').textContent = rowDataToday.ScanDone ? itemTotal : '0';
						recordItemScanTemplate.querySelector('.total').textContent = itemTotal;
						itemScanEl.innerHTML = '';
						itemScanEl.appendChild(document.importNode(recordItemScanTemplate, true));
					}
				}
				

				if (item.upc || item.singleItemBarcode) {
					// individual items
					let itemScanEl = tableRow.querySelector('.indiv-item-scan');
					if (itemScanEl) {
						// Set the number of items to be scanned
						needScan = true;
						let itemTotal = item.singleItemMultiple * parseInt(tableRow.dataset.itemQuantity, 10);
						tableRow.dataset.scanDone = 'false';
						recordItemScanTemplate2.querySelector('.indivCurrent').textContent = rowDataToday.ScanDone ? itemTotal : '0';
						recordItemScanTemplate2.querySelector('.indivTotal').textContent = itemTotal;
						itemScanEl.innerHTML = '';
						itemScanEl.appendChild(document.importNode(recordItemScanTemplate2, true));
					}
				}
				

				if (!item.upc && !item.barcode && !item.singleItemBarcode) {
					tableRow.dataset.scanDone = 'true';
					tableRow.classList.add('bg-orange');
				}

				if (item.upc || item.imageUrl) {
					// Add item image
					let img = document.createElement('img');
					img.src = item.upc ? imageServer+item.upc+'-1.jpg' : item.imageUrl.substring(0,3)=='img' ? imageServer + item.imageUrl : item.imageUrl;
					tableRow.querySelector('.item-img').appendChild(img);
				}

				
				if (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED) {
					await loadInventoryDetails(item);
					//load inventory stock in hand
					//console.log(inventoryDetails[item.singleItemBarcode]);
					let inventoryLabels =  ['eBay Stock', 'Total StockInHand', 'Individual Stock', 'Carton Stock', 'Qty/carton', 'Inner Quantity', 'Reserved Quantity', 'Damaged Quantity', 'QVB Qty', 'Warehouse Qty', 'Bay']; 
					let inventorytd = tableRow.querySelector('.item-inventory');
					for (let label of inventoryLabels) {
						let stockPre = document.createElement('pre');
						//let labelClass = label.replace(/ /g, '');
						stockPre.dataset.stockType = label;
		        		let stocklabel = document.createElement('span');
		        		stocklabel.classList.add('label');
		        		stocklabel.textContent = label + ': ';
		        		let stockvalue = document.createElement('span');
		        		stockvalue.classList.add('value');
		        		stockvalue.textContent = 'N/A';
		        		stockPre.appendChild(stocklabel);
		        		stockPre.appendChild(stockvalue);
		        		inventorytd.appendChild(stockPre);
					}
			        let invDetail = item.customSku ? inventoryDetails[item.customSku] : (item.singleItemBarcode ? inventoryDetails[item.singleItemBarcode] : null);
			        if (invDetail && invDetail.length == 1) {
			        	invDetail = invDetail[0];
			        	tableRow.dataset.quantityPerCarton = invDetail.quantityPerCarton;
			        }
			        
			        if(!invDetail) {
			        	let stockPres = inventorytd.querySelectorAll('pre');
		        		for (let stockPre of stockPres) {
		        			if (stockPre.dataset.stockType == 'eBay Stock') {
		        				stockPre.querySelector('.value').textContent = item.ebayquantity ? item.ebayquantity : 'N/A';
		        				break;
		        			}		
		        		}
		        	} else if (invDetail.quantityPerCarton) {
		        		//console.log(inventorytd);
		        		let stockInHand =  Math.floor(parseInt((invDetail.quantityPerCarton)*invDetail.cartonQty)+invDetail.indivQty);
		        		let warehousetotal =  Math.floor(parseInt((invDetail.quantityPerCarton)*invDetail['3PLCartonQty'])+invDetail['3PLIndivQty']);
		        		if(invDetail.cartonQty <= 1 && store != 8 && store != 71) {
		        			tableRow.classList.add('bg-red');
		        		}
		        		else {
		        			tableRow.classList.remove('bg-red');	
		        		}

		        		if (warehousetotal > 0 && (store==8 || store==71)) {
		        			tableRow.classList.add('bg-instock');
		        		}
		        		let stockPres = inventorytd.querySelectorAll('pre');
		        		for (let stockPre of stockPres) {
		        			switch (stockPre.dataset.stockType) {
		        				case 'eBay Stock':
		        					stockPre.querySelector('.value').textContent = item.ebayquantity ? item.ebayquantity : 'N/A';
		        					break;
		        				case 'Total StockInHand':
		        					stockPre.querySelector('.value').textContent = stockInHand;
		        					break;
		        				case 'Individual Stock':
		        					stockPre.querySelector('.value').textContent = invDetail.indivQty;
		        					break;
	        					case 'Carton Stock':
		        					stockPre.querySelector('.value').textContent = invDetail.cartonQty;
		        					break;
		        				case 'Qty/carton':
		        					stockPre.querySelector('.value').textContent = invDetail.quantityPerCarton;
		        					break;
		        				case 'Inner Quantity':
		        					stockPre.querySelector('.value').textContent = invDetail.innerQty;
		        					break;
		        				case 'Reserved Quantity':
		        					stockPre.querySelector('.value').textContent = invDetail.reservedQuantity;
		        					break;
		        				case 'Damaged Quantity':
		        					stockPre.querySelector('.value').textContent = invDetail.damagedQty;
		        					break;
		        				case 'QVB Qty':
		        					stockPre.querySelector('.value').textContent = invDetail.QVBQty;
		        					break;
		        				case 'Warehouse Qty':
		        					stockPre.querySelector('.value').textContent = warehousetotal;
		        					break;
		        				case 'Bay':
		        					stockPre.querySelector('.value').textContent = invDetail.bay;
		        					break;
		        			}
		        		}

		        	} else {
		        		let stockPres = inventorytd.querySelectorAll('pre');
		        		for (let stockPre of stockPres) {
		        			switch (stockPre.dataset.stockType) {
		        				case 'eBay Stock':
		        					stockPre.querySelector('.value').textContent = item.ebayquantity ? item.ebayquantity : 'N/A';
		        					break;
		        				case 'Total StockInHand':
		        					stockPre.querySelector('.value').textContent = invDetail.stockInHand;
		        					break;
		        				case 'Inner Quantity':
		        					stockPre.querySelector('.value').textContent = invDetail.innerQty;
		        					break;
		        				case 'Qty/carton':
		        					stockPre.querySelector('.value').textContent = invDetail.quantityPerCarton;
		        					break;
		        				case 'QVB Qty':
		        					stockPre.querySelector('.value').textContent = invDetail.QVBQty;
		        					break;
		        				case 'Warehouse Qty':
		        					stockPre.querySelector('.value').textContent = invDetail['3PLCartonQty'];
		        					break;
		        				case 'Bay':
		        					stockPre.querySelector('.value').textContent = invDetail.bay;
		        					break;
		        			}
		        		}
		        	}
		        	//console.log(invDetail);
		        	if (store==8 || store==71) {
		        		let stockPres = inventorytd.querySelectorAll('pre');
		        		for (let stockPre of stockPres) {
		        			if (stockPre.dataset.stockType != 'QVB Qty' && stockPre.dataset.stockType != 'Warehouse Qty' && stockPre.dataset.stockType != 'Bay') {
		        				stockPre.classList.add('hide');
		        			}
		        		}
		        	} else {
		        		let stockPres = inventorytd.querySelectorAll('pre');
		        		for (let stockPre of stockPres) {
		        			if (stockPre.dataset.stockType == 'QVB Qty' || stockPre.dataset.stockType == 'Warehouse Qty') {
		        				stockPre.classList.add('hide');
		        			}
		        		}
		        	}

					//bay
					if (store!=8 && store!=71) {
						
						var td_1 = tableRow.querySelector('.bay_sat');
						td_1.id = 'baySat';
						/*var baySelect = document.createElement('select');
						baySelect.id = 'bay';

						var option = document.createElement('option');
						option.textContent = "-";
						baySelect.appendChild(option);

						for (let i = 0; i <= page.bays; i++) {
							var option = document.createElement('option');
							option.value = i;
							option.textContent = i;
							if (item.bay == i) option.selected = 'selected';
							baySelect.appendChild(option);

						}

						td_1.className = 'centre';
						td_1.appendChild(baySelect);
						//td_1.appendChild(document.createElement('br'));
						var setBayBtn = document.createElement('button');
						setBayBtn.id = 'set-bay';
						setBayBtn.innerHTML = 'Set Bay';
						setBayBtn.classList.add('set-bay','btn-purple', 'action-btn');
						td_1.appendChild(setBayBtn);*/

						//td_1.appendChild(document.createElement('br'));

						//Satchel
						/*var satSelect = document.createElement('select');
						satSelect.id = 'sat';

						var option = document.createElement('option');
						option.textContent = "-";
						option.selected = 'selected';
						satSelect.appendChild(option);
						
						for (let s in page.satchel) {
							var option = document.createElement('option');
							option.value = s;
							option.textContent = s;
							if (item.satchel == s) option.selected = 'selected';
							satSelect.appendChild(option);

						}
						td_1.className = 'centre';
						td_1.appendChild(satSelect);
						//td_1.appendChild(document.createElement('br'));
						var setSatBtn = document.createElement('button');
						setSatBtn.id = 'set-sat';
						setSatBtn.innerHTML = 'Satchel';
						setSatBtn.classList.add('set-sat','btn-purple', 'action-btn');
						td_1.appendChild(setSatBtn);*/

						//FWFP
						var fwfpSelect = document.createElement('select');
						fwfpSelect.id = 'fwfp';

						var option = document.createElement('option');
						option.textContent = "No";
						option.value = null;
						option.selected = 'selected';
						fwfpSelect.appendChild(option);
						
						for (let s of Object.keys(page.fwfp).sort()) {
							var option = document.createElement('option');
							option.value = s;
							option.textContent = s + 'kg';
							if (item.fwfp == s) option.selected = 'selected';
							fwfpSelect.appendChild(option);
						}
						
						td_1.className = 'centre';
						td_1.appendChild(fwfpSelect);
						//td_1.appendChild(document.createElement('br'));
						var setFWFPBtn = document.createElement('button');
						setFWFPBtn.id = 'set-fwfp';
						setFWFPBtn.innerHTML = 'FWFP';
						setFWFPBtn.classList.add('set-fwfp','btn-purple', 'action-btn');
						td_1.appendChild(setFWFPBtn);
					}
				}	

				/*var bay = item.bay;
				if (bay) {
					let bayEl = table.querySelector("tr td select option[value='" + bay + "']"); 
					//console.log(bayEl);
					bayEl.selected = "selected";
				}*/
				break;
			}
		}
	}

	if (!needScan) {
		// Set record as scanned
		rowDataToday.ScanDone = true;
		changeScanStatus(store, recordNum, SCAN_ACTIONS.DONE);
	}
}

function checkInclude(itemNum, itemData) {
	let includes = false;
	for (let item of itemDetails[itemNum]) {
		if (item.id == itemData.id) includes = true;
	}
	return includes;
}

function showInventoryStock(item) {
	let invDetail = item.customSku ? inventoryDetails[item.customSku] : (item.singleItemBarcode ? inventoryDetails[item.singleItemBarcode] : null);
    if(!invDetail) return;
    if (invDetail.length == 1) invDetail = invDetail[0];
    if (invDetail.quantityPerCarton == null) {
       //document.querySelectorAll(".record-items .record-inventory")[0].innerHTML = '<br/>' + item.stockInHand + '<br/>' + '0';
       document.querySelectorAll(".record-items .item-inventory")[itemIndex].innerHTML = '<br/><br/><br/>Individual Stock:<span style="margin: 0 10px">' + item.stockInHand 
			        															+ '<br/>Carton Stock: <span style="margin: 0 30px">'+ '0'
			        															+'<br/><br/><br/>items/carton: <span style="margin: 0 30px">' +'0' ;
       
       return;
    } else {
        //document.querySelectorAll(".record-items .record-inventory")[0].innerHTML = '(' + item.quantityPerCarton + ' items/carton)<br/>' + item.stockInHand%item.quantityPerCarton + '<br/>' + parseInt(item.stockInHand/item.quantityPerCarton, 10);
        document.querySelectorAll(".record-items .item-inventory")[itemIndex].innerHTML = '<br/><br/><br/>Individual Stock:<span style="margin: 0 10px">' + item.stockInHand%item.quantityPerCarton 
			        															+ '<br/>Carton Stock: <span style="margin: 0 30px">'+ parseInt(item.stockInHand/item.quantityPerCarton, 10)
			        															+'<br/><br/><br/>items/carton: <span style="margin: 0 30px">' + item.quantityPerCarton ;
        return;
    }
}

// Current Inventory
async function loadInventoryDetails(item) {
	//console.log(item);
	let formData = new FormData();
	/*if (item.singleItemBarcode) {
		formData.append('barcode', item.singleItemBarcode);
	} else if (item.sku) {
		var sku = formatSku(item.sku);
		formData.append('sku', sku);
	} else if (item.num) {
		formData.append('itemNum', item.num);
	}*/

	if (item.singleItemBarcode) {
		formData.append('barcode', item.singleItemBarcode);
	} 
	if (item.sku) {
		var sku = formatSku(item.sku);
		formData.append('sku', sku);
	}
	if (item.customSku) {
		formData.append('customSku', item.customSku);
	}

	let response = await fetch(apiServer+'stockInventory/get', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let inventoryData = await response.json();
	//console.log(inventoryData);
	if (response.ok && inventoryData.result == 'success') {	
		let inventorys = inventoryData.inventory;
		for (let inv in inventorys)	{
			if (!inventoryDetails[inv]) {
				inventoryDetails[inv] = [];
				inventoryDetails[inv].push(inventorys[inv]);
			} else {
				let invens = inventoryDetails[inv];
				//console.log(invens);
				let exist = false;
				for (let i=0; i<invens.length; i++) {
					if (invens[i].id == inventorys[inv].id) {
						exist = true;
						invens.splice(i,1);
						invens.push(inventorys[inv]);
						break;
					}
				}
				if (!exist) {
					//console.log(invens);
					inventoryDetails[inv] = invens.push(inventorys[inv]);
				}
			}
		}
	}
	else {
		page.notification.show(inventoryData.result);
	}
}

function formatSku(itemSku) {
	if (itemSku == undefined) return itemSku;
	let sku = (itemSku).replace(/flatpack/ig,'').replace(/ff/ig,'').replace(/parcel/ig,'').trim();
	let skus = sku.split('-');

	if (!isNaN(skus[1]) && parseInt(skus[1])>100000000000) {
		sku = skus[0].trim();
	}
	let skus2 = sku.split('_');
	if (!isNaN(skus2[1])) {
		sku = skus2[0].trim();
	}

	return sku;
}

async function getInventoryDetails(list) {
	let inventorylist = []
	for (let item of list) {
		inventorylist.push([item.barcode, item.sku, item.customSku])
	}
	
	let formData = new FormData();
	//console.log(inventorylist);
    formData.append('list', JSON.stringify(inventorylist));
	
	try {
		let response = await fetch(apiServer+'stockInventory/multiget', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let inventoryData = await response.json();
		//console.log(inventoryData);
		if (response.ok && inventoryData.result == 'success') {	
			let inventorys = inventoryData.inventory;
			for (let inv in inventorys)	{
				if (!inventoryDetails[inv]) {
					inventoryDetails[inv] = [];
					inventoryDetails[inv].push(inventorys[inv]);
				} else {
					let invens = inventoryDetails[inv];
					//console.log(invens);
					let exist = false;
					for (let i=0; i<invens.length; i++) {
						if (invens[i].id == inventorys[inv].id) {
							exist = true;
							invens.splice(i,1);
							invens.push(inventorys[inv]);
							break;
						}
					}
					if (!exist) {
						inventoryDetails[inv] = invens.push(inventorys[inv]);
					}
				}
			}
		}
		else {
			page.notification.show(inventoryData.result);
		}
	} catch(e) {
		console.log(e);
	}

	
}

export {getItemDetails, loadItemDetails, showInventoryStock, loadInventoryDetails, getInventoryDetails, formatSku};
