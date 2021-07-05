import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener, checkLogin} from '/common/tools.js';
import {getItemDetails, loadInventoryDetails, getInventoryDetails, formatSku} from '../order-collect/js/item-details.js';




window.page = {
	//liveMessages: new LiveMessages(wsServer),
	notification: new NotificationBar(),
	orders: {},
	type: 'DO',
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

window.saleRecords = {};
window.itemDetails = {}; 
window.bundleItems = {};
window.groupItems = {'DO': {},'VR': {}, 'JV': {}, 'HYC': {}, 'SP': {}, 'SIG': {}, 'COS': {}, 'HOB': {}, 'HOBW': {}, 'HPD': {}};
window.sumItems = {'DO': {},'VR': {}, 'JV': {}, 'HYC': {}, 'SP': {}, 'SIG': {}, 'COS': {}, 'HOB': {}, 'HOBW': {}, 'HPD': {}};
window.inventoryData = {};
window.inventoryDetails = {};
//window.hideCols = ["Quantity Need", "Quantity In Stock", "Inner", "Pack Size"];
window.hideCols = ["Inner", "Pack Size"];

window.qtyConvert = {
	'1': 1,
	'5': 5,
	'10': 10,
    '20': 20,
	'50': 50,
	'102': 100,
	'15': 150,
	'202': 200,
	'25': 250,
	'502': 500,
	'1000': 1000,
	'2000': 2000,
};

window.qtyConvert2 = {
	'19': 1,
	'192': 5,
	'193': 10,
	'194': 50,
	'195': 100,
	'196': 200,
	'197': 500,
	'25': 1,
	'252': 5,
	'253': 10,
	'254': 50,
	'255': 100,
	'256': 200,
	'257': 500,
	'30': 1,
	'302': 5,
	'303': 10,
	'304': 50,
	'305': 100,
	'306': 200,
	'307': 500,
	'35': 1,
	'352': 5,
	'353': 10,
	'354': 50,
	'355': 100,
	'356': 200,
	'357': 500,
	'40': 1,
	'402': 5,
	'403': 10,
	'404': 50,
	'405': 100,
	'406': 200,
	'407': 500,
};


if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});

	var today = new Date();
	// Records from the last 2 and a half months (75 days)
	var startDate = new Date();
	startDate.setDate(startDate.getDate() - 180);
	await loadRecords(getDateValue(startDate), getDateValue(today));

	let recordList = [];
			
	// Get item data for each connected order
	if (saleRecords[1]) {
		for (let o in saleRecords[1].records) {
			recordList.push([1, o]);
		}
	}
		
	if (saleRecords[4]) {
		for (let o in saleRecords[4].records) {
			recordList.push([4, o]);
		}
	}
		
	if (saleRecords[6]) {
		for (let o in saleRecords[6].records) {
			recordList.push([6, o]);
		}
	}

	if (saleRecords[51]) {
		for (let o in saleRecords[51].records) {
			recordList.push([51, o]);
		}
	}

	if (saleRecords[8]) {
		for (let o in saleRecords[8].records) {
			recordList.push([8, o]);
		}
	}

	if (saleRecords[71]) {
		for (let o in saleRecords[71].records) {
			recordList.push([71, o]);
		}
	}

	if (saleRecords[91]) {
		for (let o in saleRecords[91].records) {
			recordList.push([91, o]);
		}
	}
		
	await getItemDetails(recordList, true);

	var newRecords = {
		'DO': {},
		'VR': {},
		'JV': {},
		'HYC': {},
		'SP': {},
		'SIG': {},
		'COS': {},
		'HOB': {},
		'HOBW': {},
		'HPD': {},
	};

	let inventoryList = [];
	let storeIDs = [1,51];
	for (let storeID of storeIDs) {
		if (!saleRecords[storeID]) continue;
		var todayRecord = saleRecords[storeID].today;
		var ebay_records = saleRecords[storeID].records;
		for (let m in todayRecord) {
			let dailyorder = todayRecord[m].DailyOrder;
			let hyc = todayRecord[m].HYCLOR;
			let spwarehouse = todayRecord[m].SPWAREHOUSE;
			let sigma = todayRecord[m].SIGMA;
			let jv = todayRecord[m].JV;
			let factory = todayRecord[m].FACTORY;
			if (dailyorder == 1) {
				newRecords['DO'][m] = ebay_records[m];
				let order_items = ebay_records[m].Items;
				for (let order_i in order_items) {
					let order_item = order_items[order_i];
					let itemNumber = order_item.ItemNum;
					let itemSku = order_item.SKU;

					let orderitemDetails = itemDetails[itemSku];
					for (let item_d in orderitemDetails) {
						let item_detail = orderitemDetails[item_d];
						if (item_detail.num == itemNumber) {
							inventoryList.push({'sku': item_detail.sku, 'barcode': item_detail.singleItemBarcode, 'customSku': item_detail.customSku, 'cartonbarcode': item_detail.barcode});
						}
					}
					
				}
			}else if (hyc == 1) {
				newRecords['HYC'][m] = ebay_records[m];
				let order_items = ebay_records[m].Items;
				for (let order_i in order_items) {
					let order_item = order_items[order_i];
					let itemNumber = order_item.ItemNum;
					let itemSku = order_item.SKU;

					let orderitemDetails = itemDetails[itemSku];
					for (let item_d in orderitemDetails) {
						let item_detail = orderitemDetails[item_d];
						if (item_detail.num == itemNumber) {
							inventoryList.push({'sku': item_detail.sku, 'barcode': item_detail.singleItemBarcode, 'customSku': item_detail.customSku, 'cartonbarcode': item_detail.barcode});
						}
					}
					
				}
			}else if (spwarehouse == 1) {
				newRecords['SP'][m] = ebay_records[m];
				let order_items = ebay_records[m].Items;
				for (let order_i in order_items) {
					let order_item = order_items[order_i];
					let itemNumber = order_item.ItemNum;
					let itemSku = order_item.SKU;

					let orderitemDetails = itemDetails[itemSku];
					for (let item_d in orderitemDetails) {
						let item_detail = orderitemDetails[item_d];
						if (item_detail.num == itemNumber) {
							inventoryList.push({'sku': item_detail.sku, 'barcode': item_detail.singleItemBarcode, 'customSku': item_detail.customSku, 'cartonbarcode': item_detail.barcode});
						}
					}
					
				}
			}else if (sigma == 1) {
				newRecords['SIG'][m] = ebay_records[m];
				let order_items = ebay_records[m].Items;
				for (let order_i in order_items) {
					let order_item = order_items[order_i];
					let itemNumber = order_item.ItemNum;
					let itemSku = order_item.SKU;

					let orderitemDetails = itemDetails[itemSku];
					for (let item_d in orderitemDetails) {
						let item_detail = orderitemDetails[item_d];
						if (item_detail.num == itemNumber) {
							inventoryList.push({'sku': item_detail.sku, 'barcode': item_detail.singleItemBarcode, 'customSku': item_detail.customSku, 'cartonbarcode': item_detail.barcode});
						}
					}
					
				}
			}else if (jv == 1) {
				newRecords['JV'][m] = ebay_records[m];
				let order_items = ebay_records[m].Items;
				for (let order_i in order_items) {
					let order_item = order_items[order_i];
					let itemNumber = order_item.ItemNum;
					let itemSku = order_item.SKU;

					let orderitemDetails = itemDetails[itemSku];
					for (let item_d in orderitemDetails) {
						let item_detail = orderitemDetails[item_d];
						if (item_detail.num == itemNumber) {
							inventoryList.push({'sku': formatSku(item_detail.sku), 'barcode': item_detail.singleItemBarcode, 'customSku': item_detail.customSku, 'cartonbarcode': item_detail.barcode});
						}
					}
					
				}
			}else{
				if (!ebay_records[m]) continue;
				let order_items = ebay_records[m].Items;
				for (let order_i in order_items) {
					let order_item = order_items[order_i];
					let itemNumber = order_item.ItemNum;
					let itemSku = order_item.SKU;

					if (itemSku && itemSku.startsWith('HPD_')) {
						newRecords['HPD'][m] = ebay_records[m];
					} else {
						let orderitemDetails = itemDetails[itemSku];
						for (let item_d in orderitemDetails) {
							let item_detail = orderitemDetails[item_d];
							if (item_detail.num == itemNumber) {
								inventoryList.push({'sku': item_detail.sku, 'barcode': item_detail.singleItemBarcode, 'customSku': item_detail.customSku, 'cartonbarcode': item_detail.barcode});
								if (item_detail.vr == 1) {
									//console.log(itemNumber + '  ' + itemSku)
									newRecords['VR'][m] = ebay_records[m];
								} /*else if (item_detail.sku.startsWith('SI-')) {
									newRecords['SIG'][m] = ebay_records[m];
								} */else if (item_detail.sku.startsWith('COSTCO') || item_detail.costco) {
									newRecords['COS'][m] = ebay_records[m];
								}
								break;
								
							}
						}
					}
					
				}
				
			}
		}
	}

	var todayRecord_4 = saleRecords[4] ? saleRecords[4].today : {};
	var ebay_records_4 = saleRecords[4] ? saleRecords[4].records : {};
	for (let m in todayRecord_4) {
		if (!ebay_records_4[m]) continue;
		let order_items = ebay_records_4[m].Items;
		for (let order_i in order_items) {
			let order_item = order_items[order_i];
			let itemNumber = order_item.ItemNum;
			let itemSku = order_item.SKU;

			let orderitemDetails = itemDetails[itemSku];
			for (let item_d in orderitemDetails) {
				let item_detail = orderitemDetails[item_d];
				if (item_detail.num == itemNumber) {
					inventoryList.push({'sku': item_detail.sku, 'barcode': item_detail.singleItemBarcode, 'customSku': item_detail.customSku, 'cartonbarcode': item_detail.barcode});
					if (item_detail.factory == 0) {
						//console.log(itemNumber + '  ' + itemSku)
						newRecords['JV'][m] = ebay_records_4[m];
					}
					
				}
			}
			
		}	
		
	}

	
	var ebay_records_8 = saleRecords[8] ? saleRecords[8].records : {};
	var ebay_today_8 = saleRecords[8] ? saleRecords[8].today : {};
	for (let m in ebay_records_8) {
		if (!ebay_records_8[m]) continue;
		ebay_records_8[m].storeID = 8;
		let order_items = ebay_records_8[m].Items;
		for (let order_i in order_items) {
			let order_item = order_items[order_i];
			let itemNumber = order_item.ItemNum;
			let itemSku = order_item.SKU;

			let orderitemDetails = itemDetails[itemSku];
			for (let item_d in orderitemDetails) {
				let item_detail = orderitemDetails[item_d];
				if (item_detail.num == itemNumber) {
					inventoryList.push({'sku': item_detail.sku, 'barcode': item_detail.singleItemBarcode, 'customSku': item_detail.customSku, 'cartonbarcode': item_detail.barcode});
					if (ebay_today_8[m].OrderStatus==18) {
						newRecords['HOBW'][m] = ebay_records_8[m];
					} else {
						newRecords['HOB'][m] = ebay_records_8[m];
					}
					break;
					
				}
			}
			
		}	
		
	}

	var records_how = saleRecords[71] ? saleRecords[71].records : {};
	var today_how = saleRecords[71] ? saleRecords[71].today : {};
	for (let m in records_how) {
		if (!records_how[m]) continue;
		records_how[m].storeID = 71;
		let order_items = records_how[m].Items;
		for (let order_i in order_items) {
			let order_item = order_items[order_i];
			let itemSku = order_item.SKU;

			let orderitemDetails = itemDetails[itemSku];
			for (let item_d in orderitemDetails) {
				let item_detail = orderitemDetails[item_d];
				if (item_detail.storeID == 71) {
					inventoryList.push({'sku': item_detail.sku, 'barcode': item_detail.singleItemBarcode, 'customSku': item_detail.customSku, 'cartonbarcode': item_detail.barcode});

					if (today_how[m].OrderStatus==18) {
						newRecords['HOBW'][m] = records_how[m];
					} else {
						newRecords['HOB'][m] = records_how[m];
					}
					break;
					
					
				}
			}
			
		}	
		
	}

	var records_hoc = saleRecords[91] ? saleRecords[91].records : {};
	var today_hoc = saleRecords[91] ? saleRecords[91].today : {};
	for (let m in records_hoc) {
		if (!records_hoc[m]) continue;
		records_hoc[m].storeID = 91;
		let order_items = records_hoc[m].Items;
		for (let order_i in order_items) {
			let order_item = order_items[order_i];
			let itemNumber = order_item.ItemNum;
			let itemSku = order_item.SKU;

			let orderitemDetails = itemDetails[itemSku];
			for (let item_d in orderitemDetails) {
				let item_detail = orderitemDetails[item_d];
				if (item_detail.num == itemNumber) {
					inventoryList.push({'sku': item_detail.sku, 'barcode': item_detail.singleItemBarcode, 'customSku': item_detail.customSku, 'cartonbarcode': item_detail.barcode});

					if (today_hoc[m].OrderStatus==18) {
						newRecords['HOBW'][m] = records_hoc[m];
					} else {
						newRecords['HOB'][m] = records_hoc[m];
					}
					break;
				}
			}
			
		}	
		
	}

	await getInventoryDetails(inventoryList);

	for (let k in newRecords['DO']) {
		let items = newRecords['DO'][k].Items;
		for (let i=0; i<items.length; i++) {
			let item = items[i]; 
			if (item.SKU) {
				let orderitemDetails = itemDetails[item.SKU];
				for (let item_d in orderitemDetails) {
					let item_detail = orderitemDetails[item_d];
					if (item_detail.num == item.ItemNum) {
						item['barcode'] = item_detail.barcode;
						item['singleItemBarcode'] = item_detail.singleItemBarcode;
						item['image'] = item_detail.imageUrl;
					}
				}
				var sku = (item.SKU).replace(/flatpack/ig,'').replace(/ff/ig,'').replace(/parcel/ig,'').trim();
				let sku2 = sku.split('_');
				if (!isNaN(sku2.slice(-1)) && sku2.length > 1) {
					sku = sku2.slice(-2,-1)=='S' ? sku2.slice(0,-2).join('_').trim() : sku2.slice(0,-1).join('_').trim();
				}
				if (!groupItems['DO'].hasOwnProperty(sku)) {
					groupItems['DO'][sku] = [item];
				}else{
					groupItems['DO'][sku] = groupItems['DO'][sku].concat([item]);
				}
			}	
		}

	}

	for (let k in newRecords['VR']) {
		let items = newRecords['VR'][k].Items;
		for (let i=0; i<items.length; i++) {
			let item = items[i];

			let itemNumber = item.ItemNum;
			let itemSku = item.SKU;
			let orderitemDetails = itemDetails[itemSku];
			for (let item_d in orderitemDetails) {
				let item_detail = orderitemDetails[item_d];
				if (item_detail.num == itemNumber) {
					if (item_detail.vr == 1) {
						if (item.SKU) {
							item['barcode'] = item_detail.barcode;
							item['singleItemBarcode'] = item_detail.singleItemBarcode;
							item['image'] = item_detail.imageUrl;
							var sku = (item.SKU).replace(/flatpack/ig,'').trim();
							sku = sku.split('_');
							if (!isNaN(sku[1])) {
								sku = sku[0].trim();
							}
							if (!groupItems['VR'].hasOwnProperty(sku)) {
								groupItems['VR'][sku] = [item];
							}else{
								groupItems['VR'][sku] = groupItems['VR'][sku].concat([item]);
							}
						}	
					}
					
				}
			} 
			
		}

	}

	for (let k in newRecords['JV']) {
		let items = newRecords['JV'][k].Items;
		for (let i=0; i<items.length; i++) {
			let item = items[i];

			let itemNumber = item.ItemNum;
			let itemSku = item.SKU;
			let orderitemDetails = itemDetails[itemSku];
			for (let item_d in orderitemDetails) {
				let item_detail = orderitemDetails[item_d];
				if (item_detail.num == itemNumber) {
					if (item_detail.storeID==4 && item_detail.factory == 0) {
						if (item.SKU) {
							var sku = item.SKU;
							let skus = sku.split('_');
							if (!isNaN(skus[skus.length-1]) && parseInt(skus[skus.length-1])<5000) {
								sku = skus.slice(0,skus.length-1).join('_').trim();
							}
							item['barcode'] = item_detail.barcode;
							item['singleItemBarcode'] = item_detail.singleItemBarcode;
							item['image'] = item_detail.imageUrl;
							if (!groupItems['JV'].hasOwnProperty(sku)) {
								groupItems['JV'][sku] = [item];
							}else{
								groupItems['JV'][sku] = groupItems['JV'][sku].concat([item]);
							}
						}	
					} /*else if (item_detail.storeID==51) {
						//console.log(item);
						if (item.SKU) {
							var sku = item.SKU;
							let skus = sku.split('_');
							if (!isNaN(skus[1]) && parseInt(skus[1])<5000) {
								sku = skus[0].trim();
							}
							let skus2 = sku.split('-');
							if (skus2[0].startsWith('IA') || skus2[0].startsWith('AI')) {
								sku = skus2[0].trim();
							}
							item['barcode'] = item_detail.barcode;
							item['singleItemBarcode'] = item_detail.singleItemBarcode;
							item['image'] = item_detail.imageUrl;
							if (!groupItems['JV'].hasOwnProperty(sku)) {
								groupItems['JV'][sku] = [item];
							}else{
								groupItems['JV'][sku] = groupItems['JV'][sku].concat([item]);
							}
						}	
					} */else {
						if (item.SKU) {
							var sku = item.SKU;
							let skus = sku.split('_');
							if (!isNaN(skus[skus.length-1]) && parseInt(skus[skus.length-1])<5000) {
								sku = skus.slice(0,skus.length-1).join('_').trim();
							}
							item['barcode'] = item_detail.barcode;
							item['singleItemBarcode'] = item_detail.singleItemBarcode;
							item['image'] = item_detail.imageUrl;
							if (!groupItems['JV'].hasOwnProperty(sku)) {
								groupItems['JV'][sku] = [item];
							}else{
								groupItems['JV'][sku] = groupItems['JV'][sku].concat([item]);
							}
						}	
					}
					
				}
			} 
			
		}

	}

	for (let k in newRecords['HYC']) {
		let items = newRecords['HYC'][k].Items;
		for (let i=0; i<items.length; i++) {
			let item = items[i];

			let itemNumber = item.ItemNum;
			let itemSku = item.SKU;
			let orderitemDetails = itemDetails[itemSku];
			for (let item_d in orderitemDetails) {
				let item_detail = orderitemDetails[item_d];
				if (item_detail.num == itemNumber) {
					if (item.SKU) {
						item['barcode'] = item_detail.barcode;
						item['singleItemBarcode'] = item_detail.singleItemBarcode;
						item['image'] = item_detail.imageUrl;

						var sku = (item.SKU).replace(/flatpack/ig,'').replace(/ff/ig,'').replace(/parcel/ig,'').trim();
						let skus = sku.split('_');
						if (!isNaN(skus.slice(-1)) && parseInt(skus.slice(-1)) < 100) {
							sku = sku.replace('_'+skus.slice(-1),'');
						}
						if (!groupItems['HYC'].hasOwnProperty(sku)) {
							groupItems['HYC'][sku] = [item];
						}else{
							groupItems['HYC'][sku] = groupItems['HYC'][sku].concat([item]);
						}
					}	
					
					
				}
			} 
			
		}

	}

	for (let k in newRecords['SP']) {
		let items = newRecords['SP'][k].Items;
		for (let i=0; i<items.length; i++) {
			let item = items[i];

			let itemNumber = item.ItemNum;
			let itemSku = item.SKU;
			let orderitemDetails = itemDetails[itemSku];
			for (let item_d in orderitemDetails) {
				let item_detail = orderitemDetails[item_d];
				if (item_detail.num == itemNumber) {
					
					if (item.SKU) {
						item['barcode'] = item_detail.barcode;
						item['singleItemBarcode'] = item_detail.singleItemBarcode;
						item['image'] = item_detail.imageUrl;

						var sku = (item.SKU).replace(/flatpack/ig,'').replace(/ff/ig,'').replace(/parcel/ig,'').trim();

						if (!groupItems['SP'].hasOwnProperty(sku)) {
							groupItems['SP'][sku] = [item];
						}else{
							groupItems['SP'][sku] = groupItems['SP'][sku].concat([item]);
						}
					}	
					
					
				}
			} 
			
		}

	}

	for (let k in newRecords['SIG']) {
		let items = newRecords['SIG'][k].Items;
		for (let i=0; i<items.length; i++) {
			let item = items[i];

			let itemNumber = item.ItemNum;
			let itemSku = item.SKU;
			let orderitemDetails = itemDetails[itemSku];
			for (let item_d in orderitemDetails) {
				let item_detail = orderitemDetails[item_d];
				if (item_detail.num == itemNumber) {
					
					if (item.SKU) {
						item['barcode'] = item_detail.barcode;
						item['singleItemBarcode'] = item_detail.singleItemBarcode;
						item['image'] = item_detail.imageUrl;

						var sku = (item.SKU).replace(/flatpack/ig,'').replace(/ff/ig,'').replace(/parcel/ig,'').trim();
						let skus = sku.split('_');
						if (skus.length>1 && ['2','3','6','12'].includes(skus[1])) {
							sku = skus[0].trim();
						}

						if (!groupItems['SIG'].hasOwnProperty(sku)) {
							groupItems['SIG'][sku] = [item];
						}else{
							groupItems['SIG'][sku] = groupItems['SIG'][sku].concat([item]);
						}
					}	
					
					
				}
			} 
			
		}

	}
	//console.log(newRecords['COS']);
	for (let k in newRecords['COS']) {
		let items = newRecords['COS'][k].Items;
		for (let i=0; i<items.length; i++) {
			let item = items[i];
			//console.log(item);
			let itemNumber = item.ItemNum;
			let itemSku = item.SKU;
			let orderitemDetails = itemDetails[itemSku];
			for (let item_d in orderitemDetails) {
				let item_detail = orderitemDetails[item_d];
				if (item_detail.num == itemNumber) {
					
					if (item.SKU) {
						item['barcode'] = item_detail.barcode;
						item['singleItemBarcode'] = item_detail.singleItemBarcode;
						item['image'] = item_detail.imageUrl;

						var sku = (item.SKU.split('-')[0]).replace(/flatpack/ig,'').replace(/ff/ig,'').replace(/parcel/ig,'').replace(/flat/ig,'').trim();
						let skus = sku.split('_');
						if (skus.length>1 && !isNaN(skus[1]) && parseInt(skus[1]) < 100) {
							sku = skus[0].trim();
						}

						if (!groupItems['COS'].hasOwnProperty(sku)) {
							groupItems['COS'][sku] = [item];
						}else{
							groupItems['COS'][sku] = groupItems['COS'][sku].concat([item]);
						}
					}	
					
					
				}
			} 
			
		}

	}

	for (let k in newRecords['HOB']) {
		let items = newRecords['HOB'][k].Items;
		for (let i=0; i<items.length; i++) {
			let item = items[i];
			//console.log(item);
			let itemNumber = item.ItemNum;
			let itemSku = item.SKU;
			let orderitemDetails = itemDetails[itemSku];
			for (let item_d in orderitemDetails) {
				let item_detail = orderitemDetails[item_d];

				if (newRecords['HOB'][k].storeID == 71) {
					if (item.SKU) {
						item['barcode'] = item_detail.barcode;
						item['singleItemBarcode'] = item_detail.singleItemBarcode;
						item['image'] = item_detail.imageUrl;

						var sku = item.SKU;

						if (!groupItems['HOB'].hasOwnProperty(sku)) {
							groupItems['HOB'][sku] = [item];
						}else{
							groupItems['HOB'][sku] = groupItems['HOB'][sku].concat([item]);
						}
						break;
					}	
						
				}else {
					if (item_detail.num == itemNumber) {
						
						if (item.SKU) {
							item['barcode'] = item_detail.barcode;
							item['singleItemBarcode'] = item_detail.singleItemBarcode;
							item['image'] = item_detail.imageUrl;

							var sku = item.SKU;

							if (!groupItems['HOB'].hasOwnProperty(sku)) {
								groupItems['HOB'][sku] = [item];
							}else{
								groupItems['HOB'][sku] = groupItems['HOB'][sku].concat([item]);
							}
							break;
						}	
						
						
					} 
				}

					
			} 
			
		}

	}

	for (let k in newRecords['HOBW']) {
		let items = newRecords['HOBW'][k].Items;
		for (let i=0; i<items.length; i++) {
			let item = items[i];
			//console.log(item);
			let itemNumber = item.ItemNum;
			let itemSku = item.SKU;
			let orderitemDetails = itemDetails[itemSku];
			for (let item_d in orderitemDetails) {
				let item_detail = orderitemDetails[item_d];

				if (newRecords['HOBW'][k].storeID == 71) {
					if (item.SKU) {
						item['barcode'] = item_detail.barcode;
						item['singleItemBarcode'] = item_detail.singleItemBarcode;
						item['image'] = item_detail.imageUrl;

						var sku = item.SKU;

						if (!groupItems['HOBW'].hasOwnProperty(sku)) {
							groupItems['HOBW'][sku] = [item];
						}else{
							groupItems['HOBW'][sku] = groupItems['HOBW'][sku].concat([item]);
						}
						break;
					}	
						
				}else {
					if (item_detail.num == itemNumber) {
						
						if (item.SKU) {
							item['barcode'] = item_detail.barcode;
							item['singleItemBarcode'] = item_detail.singleItemBarcode;
							item['image'] = item_detail.imageUrl;

							var sku = item.SKU;

							if (!groupItems['HOBW'].hasOwnProperty(sku)) {
								groupItems['HOBW'][sku] = [item];
							}else{
								groupItems['HOBW'][sku] = groupItems['HOBW'][sku].concat([item]);
							}
							break;
						}	
						
						
					} 
				}

					
			} 
			
		}

	}


	for (let k in newRecords['HPD']) {
		let items = newRecords['HPD'][k].Items;
		for (let i=0; i<items.length; i++) {
			let item = items[i];
			//console.log(item);
			let itemNumber = item.ItemNum;
			let itemSku = item.SKU;

			let orderitemDetails = itemDetails[itemSku];
			for (let item_d in orderitemDetails) {
				let item_detail = orderitemDetails[item_d];
			
				if (item_detail.num == itemNumber) {
					item['barcode'] = item_detail.barcode;
					item['singleItemBarcode'] = item_detail.singleItemBarcode;
					item['image'] = item_detail.imageUrl;

					var sku = item.SKU;

					if (!groupItems['HPD'].hasOwnProperty(sku)) {
						groupItems['HPD'][sku] = [item];
					}else{
						groupItems['HPD'][sku] = groupItems['HPD'][sku].concat([item]);
					}
					break;
				}						
			} 
			
		}

	}

	//console.log(groupItems);

	for (let j in groupItems['DO']) {
		let items = groupItems['DO'][j];

		let sum = 0;
		let itemNameShort = items[0].ItemTitle;
		let barcode = items[0].barcode;
		let singleItemBarcode = items[0].singleItemBarcode;
		let image = items[0].image;
		for (let m=0; m< items.length; m++) {
			let item = items[m];
			let sku = (item.SKU).replace(/flatpack/ig,'').replace(/ff/ig,'').replace(/parcel/ig,'').trim();
			sku = sku.split('_');
			if (!isNaN(sku[1])) {
				sum += parseInt(sku[1])*parseInt(item.Quantity);
			} else {
				let itemName = item.ItemTitle;
				if (itemName.length < itemNameShort.length) {
					itemNameShort = itemName;
				}
				itemName = itemName.replace(/x/ig, "").split(" ");
				if (!isNaN(itemName[0])) {
					sum += parseInt(itemName[0])*parseInt(item.Quantity);
				} else {
					sum += parseInt(item.Quantity);
				}
			}
		}

		var sumobj = {'sum': sum, 'name': itemNameShort, 'barcode': barcode, 'singleItemBarcode': singleItemBarcode, 'image': image};
		sumItems['DO'][j] = sumobj;
	
	}

	for (let j in groupItems['VR']) {
		let items = groupItems['VR'][j];
		let sum = 0;
		let itemNameShort = items[0].ItemTitle;
		let barcode = items[0].barcode;
		let singleItemBarcode = items[0].singleItemBarcode;
		let image = items[0].image;
		for (let m=0; m< items.length; m++) {
			let item = items[m];
			let sku = (item.SKU).replace(/flatpack/ig,'').replace(/ff/ig,'').replace(/parcel/ig,'').trim();
			sku = sku.split('_');
			if (!isNaN(sku[1])) {
				sum += parseInt(sku[1])*parseInt(item.Quantity);
			} else {
				let itemName = item.ItemTitle;
				if (itemName.length < itemNameShort.length) {
					itemNameShort = itemName;
				}
				itemName = itemName.replace(/x/ig, "").split(" ");
				if (!isNaN(itemName[0])) {
					sum += parseInt(itemName[0])*parseInt(item.Quantity);
				} else {
					sum += parseInt(item.Quantity);
				}
			}
		}

		var sumobj = {'sum': sum, 'name': itemNameShort, 'barcode': barcode, 'singleItemBarcode': singleItemBarcode, 'image': image};
		sumItems['VR'][j] = sumobj;
	}

	for (let j in groupItems['JV']) {
		let items = groupItems['JV'][j];
		let sum = 0;
		let itemName;
		let barcode = items[0].barcode;
		let singleItemBarcode = items[0].singleItemBarcode;
		let image = items[0].image;
		for (let m=0; m< items.length; m++) {
			let item = items[m];
			
			itemName = item.ItemTitle;
			
			let sku = item.SKU;
			let itemNum = item.ItemNum;
			let skus = sku.split('_');
			let qty = skus[skus.length-1];
			if (!isNaN(qty) && parseInt(qty) < 5000) {
				if (itemNum=='184471316816') {
					sum += parseInt(qtyConvert2[qty])*parseInt(item.Quantity);
				} else {
					sum += parseInt(qtyConvert[qty])*parseInt(item.Quantity);
				}
				
			} else {
				sum += parseInt(item.Quantity);
			}	
			
			
		}

		var sumobj = {'sum': sum, 'name': itemName, 'barcode': barcode, 'singleItemBarcode': singleItemBarcode, 'image': image};
		sumItems['JV'][j] = sumobj;
	}

	for (let j in groupItems['HYC']) {
		let items = groupItems['HYC'][j];
		let sum = 0;
		let itemNameShort = items[0].ItemTitle;
		let barcode = items[0].barcode;
		let singleItemBarcode = items[0].singleItemBarcode;
		let image = items[0].image;
		for (let m=0; m< items.length; m++) {
			let item = items[m];
			let sku = (item.SKU).replace(/flatpack/ig,'').replace(/ff/ig,'').replace(/parcel/ig,'').trim();
			sku = sku.split('_');
			if (!isNaN(sku.slice(-1)) && parseInt(sku.slice(-1)) < 5000) {
				sum += parseInt(sku.slice(-1))*parseInt(item.Quantity);
			} else {
				let itemName = item.ItemTitle;
				if (itemName.length < itemNameShort.length) {
					itemNameShort = itemName;
				}
				itemName = itemName.replace(/x/ig, "").split(" ");
				if (!isNaN(itemName[0])) {
					sum += parseInt(itemName[0])*parseInt(item.Quantity);
				} else {
					sum += parseInt(item.Quantity);
				}
			}
			
		}


		var sumobj = {'sum': sum, 'name': itemNameShort, 'barcode': barcode, 'singleItemBarcode': singleItemBarcode, 'image': image};
		sumItems['HYC'][j] = sumobj;
	}

	for (let j in groupItems['SP']) {
		let items = groupItems['SP'][j];
		let sum = 0;
		let itemNameShort = items[0].ItemTitle;
		let barcode = items[0].barcode;
		let singleItemBarcode = items[0].singleItemBarcode;
		let image = items[0].image;
		for (let m=0; m< items.length; m++) {
			let item = items[m];
			let sku = (item.SKU).replace(/flatpack/ig,'').replace(/ff/ig,'').replace(/parcel/ig,'').trim();
			sku = sku.split('_');
			if (!isNaN(sku.slice(-1)) && parseInt(sku.slice(-1)) < 5000) {
				sum += parseInt(sku.slice(-1))*parseInt(item.Quantity);
			} else {
				let itemName = item.ItemTitle;
				if (itemName.length < itemNameShort.length) {
					itemNameShort = itemName;
				}
				itemName = itemName.replace(/x/ig, "").split(" ");
				if (!isNaN(itemName[0])) {
					sum += parseInt(itemName[0])*parseInt(item.Quantity);
				} else {
					sum += parseInt(item.Quantity);
				}
			}
			
		}


		var sumobj = {'sum': sum, 'name': itemNameShort, 'barcode': barcode, 'singleItemBarcode': singleItemBarcode, 'image': image};
		sumItems['SP'][j] = sumobj;
	}

	for (let j in groupItems['SIG']) {
		let items = groupItems['SIG'][j];
		let sum = 0;
		let itemNameShort = items[0].ItemTitle;
		let barcode = items[0].barcode;
		let singleItemBarcode = items[0].singleItemBarcode;
		let image = items[0].image;
		for (let m=0; m< items.length; m++) {
			let item = items[m];
			let sku = (item.SKU).replace(/flatpack/ig,'').replace(/ff/ig,'').replace(/parcel/ig,'').trim();
			sku = sku.split('_');
			if (!isNaN(sku.slice(-1)) && parseInt(sku.slice(-1)) < 5000) {
				sum += parseInt(sku.slice(-1))*parseInt(item.Quantity);
			} else {
				let itemName = item.ItemTitle;
				if (itemName.length < itemNameShort.length) {
					itemNameShort = itemName;
				}
				itemName = itemName.replace(/x/ig, "").split(" ");
				if (!isNaN(itemName[0])) {
					sum += parseInt(itemName[0])*parseInt(item.Quantity);
				} else {
					sum += parseInt(item.Quantity);
				}
			}
			
		}


		var sumobj = {'sum': sum, 'name': itemNameShort, 'barcode': barcode, 'singleItemBarcode': singleItemBarcode, 'image': image};
		sumItems['SIG'][j] = sumobj;
	}

	for (let j in groupItems['COS']) {
		let items = groupItems['COS'][j];
		let sum = 0;
		let itemNameShort = items[0].ItemTitle;
		let barcode = items[0].barcode;
		let singleItemBarcode = items[0].singleItemBarcode;
		let image = items[0].image;
		for (let m=0; m< items.length; m++) {
			let item = items[m];
			let sku = (item.SKU.split('-')[0]).replace(/flatpack/ig,'').replace(/ff/ig,'').replace(/parcel/ig,'').replace(/flat/ig,'').trim();
			sku = sku.split('_');
			//console.log(sku);
			if (!isNaN(sku.slice(-1)) && parseInt(sku.slice(-1)) < 5000) {
				sum += parseInt(sku.slice(-1))*parseInt(item.Quantity);
			} else {
				let itemName = item.ItemTitle;
				if (itemName.length < itemNameShort.length) {
					itemNameShort = itemName;
				}
				itemName = itemName.replace(/x/ig, "").split(" ");
				if (!isNaN(itemName[0])) {
					sum += parseInt(itemName[0])*parseInt(item.Quantity);
				} else {
					sum += parseInt(item.Quantity);
				}
			}
			
		}


		var sumobj = {'sum': sum, 'name': itemNameShort, 'barcode': barcode, 'singleItemBarcode': singleItemBarcode, 'image': image};
		sumItems['COS'][j] = sumobj;
	}

	for (let j in groupItems['HOB']) {
		let items = groupItems['HOB'][j];
		let sum = 0;
		let itemNameShort = items[0].ItemTitle;
		let barcode = items[0].barcode;
		let singleItemBarcode = items[0].singleItemBarcode;
		let image = items[0].image;
		for (let m=0; m< items.length; m++) {
			let item = items[m];
			let sku = item.SKU;
			sum += parseInt(item.Quantity);
			
		}


		var sumobj = {'sum': sum, 'name': itemNameShort, 'barcode': barcode, 'singleItemBarcode': singleItemBarcode, 'image': image};
		sumItems['HOB'][j] = sumobj;
	}

	for (let j in groupItems['HOBW']) {
		let items = groupItems['HOBW'][j];
		let sum = 0;
		let itemNameShort = items[0].ItemTitle;
		let barcode = items[0].barcode;
		let singleItemBarcode = items[0].singleItemBarcode;
		let image = items[0].image;
		for (let m=0; m< items.length; m++) {
			let item = items[m];
			let sku = item.SKU;
			sum += parseInt(item.Quantity);
			
		}


		var sumobj = {'sum': sum, 'name': itemNameShort, 'barcode': barcode, 'singleItemBarcode': singleItemBarcode, 'image': image};
		sumItems['HOBW'][j] = sumobj;
	}

	for (let j in groupItems['HPD']) {
		let items = groupItems['HPD'][j];
		let sum = 0;
		let itemNameShorts = items[0].ItemTitle.split(' x ');
		let itemNameShort = items[0].ItemTitle;
		if (itemNameShorts.length > 1) {
			if (!isNaN(itemNameShorts[0])) {
				itemNameShort = itemNameShorts.slice(1).join(' x ');
			} 
		}
		// let itemNameShort = itemNameShorts.length > 1 ? itemNameShorts[1] : itemNameShorts[0];
		let barcode = items[0].barcode;
		let singleItemBarcode = items[0].singleItemBarcode;
		let image = items[0].image;
		for (let m=0; m< items.length; m++) {
			let item = items[m];
			
			let itemName = item.ItemTitle;
			
			itemName = itemName.replace(/x/ig, "").split(" ");
			if (!isNaN(itemName[0])) {
				sum += parseInt(itemName[0])*parseInt(item.Quantity);
			} else {
				sum += parseInt(item.Quantity);
			}
		}


		var sumobj = {'sum': sum, 'name': itemNameShort, 'barcode': barcode, 'singleItemBarcode': singleItemBarcode, 'image': image};
		sumItems['HPD'][j] = sumobj;
	}

	/*try {
		let formData = new FormData();
		let skuData = [];
		for (let s in sumItems['DO']) {
			skuData = skuData.concat([[s['sum'],"1"]]); 
		}
		for (let s in sumItems['VR']) {
			skuData = skuData.concat([[s['sum'],"1"]]); 
		}

		formData.append('skus', JSON.stringify(skuData));

		let response = await fetch(apiServer+'inventory/get', {method: 'post', body: formData});
		let data = await response.json();

		if (!response.ok) {
			page.notification.show('Error: '+data.result);
		}

		if (data.result == 'success') {
			inventoryData = data.items;
		}
		else {
			page.notification.show(JSON.stringify(data.result));
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}*/

	let cols = [
		'Item Title', 'sku', 'Quantity Need', 'Quantity In Stock', 'Quantity Order', 'Inner', 'Pack Size', 'Image'
		
	];
	let colsEditable = {
		'Item Title': 1, 'Quantity Order': 1, 'Inner': 1, 'Pack Size': 1
	};

	var tableBody = document.querySelector('#content-order-summary table tbody');
	//console.log(JSON.stringify(sumItems));

	for (let sk in sumItems['DO']) {
		let sum = sumItems['DO'][sk]['sum'];
		let barcode = sumItems['DO'][sk]['barcode'];
		let singleItemBarcode = sumItems['DO'][sk]['singleItemBarcode'];
		let image = sumItems['DO'][sk]['image'];
		let tr = document.createElement('tr');
		tr.dataset.type = 'DO';
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

			let quantityPerCarton = inventoryDetails[sk] ? inventoryDetails[sk][0].quantityPerCarton : 0;
			let indivQty = inventoryDetails[sk] ? inventoryDetails[sk][0].indivQty : 0;
			let cartonQty = inventoryDetails[sk] ? inventoryDetails[sk][0].cartonQty : 0;

			let text = '';
			switch (col) {
				case 'Item Title':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0].itemName : sumItems['DO'][sk]['name'];
					
					let text2 = text.split('x');
					if (!isNaN(text2[0])) {
						text = text2[1].trim();
					} else {
						let numbers = text2[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text2[1].trim();
					}

					let text3 = text.split('X');
					if (!isNaN(text3[0])) {
						text = text3[1].trim();
					} else {
						let numbers = text3[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text3[1].trim();
					}

					let text4 = text.split(' ');
					if (!isNaN(text4[0])) {
						text = text4.slice(1).join(' ');
					} else {
						let numbers = text4[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text4.slice(1).join(' ');
					}

					break;
				case 'sku':
					text = sk;
					break;
				case 'Quantity Need':
					text = sum;
					break;
				case 'Quantity In Stock':
					text = cartonQty*quantityPerCarton+indivQty;
					break;
				case 'Quantity Order':
					let numberOrder = sum - (cartonQty*quantityPerCarton+indivQty);
					text = numberOrder>0 ? numberOrder : '0';
					break;
				case 'Pack Size':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['packsize'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['packsize'] : '0';
					break;
				case 'Image':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['image'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['image'] : image;
					break;	
				default:
					text = '';
			}
			if (col=='Image') {
				let img = document.createElement('img');
				img.src = text;
				td.appendChild(img); 
			} else {
			   td.textContent = text;
			}

			tr.appendChild(td);
		}

		tableBody.appendChild(tr);
	}

	for (let sk in sumItems['VR']) {
		let sum = sumItems['VR'][sk]['sum'];
		let barcode = sumItems['VR'][sk]['barcode'];
		let singleItemBarcode = sumItems['VR'][sk]['singleItemBarcode'];
		let image = sumItems['VR'][sk]['image'];
		let tr = document.createElement('tr');
		tr.dataset.type = 'VR';
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

			let quantityPerCarton = inventoryDetails[sk] ? inventoryDetails[sk][0].quantityPerCarton : 0;
			let indivQty = inventoryDetails[sk] ? inventoryDetails[sk][0].indivQty : 0;
			let cartonQty = inventoryDetails[sk] ? inventoryDetails[sk][0].cartonQty : 0;

			let text = '';
			switch (col) {
				case 'Item Title':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0].itemName : sumItems['VR'][sk]['name'];
					break;
				case 'sku':
					text = sk;
					break;
				case 'Quantity Need':
					text = sum;
					break;
				case 'Quantity In Stock':
					text = cartonQty*quantityPerCarton+indivQty;
					break;
				case 'Quantity Order':
					let numberOrder = sum - (cartonQty*quantityPerCarton+indivQty);
					text = numberOrder>0 ? numberOrder : '0';
					break;
				case 'Pack Size': 
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['packsize'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['packsize'] : '0';;
					break;
				case 'Image':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['image'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['image'] : image;
					break;
				default:
					text = '';
			}
			if (col=='Image') {
				let img = document.createElement('img');
				img.src = text;
				td.appendChild(img); 
			} else {
			    td.textContent = text;
			}
			tr.appendChild(td);
		}

		tableBody.appendChild(tr);
	}

	for (let sk in sumItems['JV']) {
		let sum = sumItems['JV'][sk]['sum'];
		let barcode = sumItems['JV'][sk]['barcode'];
		let singleItemBarcode = sumItems['JV'][sk]['singleItemBarcode'];
		let image = sumItems['JV'][sk]['image'];
		let tr = document.createElement('tr');
		tr.dataset.type = 'JV';
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

			let quantityPerCarton = inventoryDetails[sk] ? inventoryDetails[sk][0].quantityPerCarton : 0;
			let indivQty = inventoryDetails[sk] ? inventoryDetails[sk][0].indivQty : 0;
			let cartonQty = inventoryDetails[sk] ? inventoryDetails[sk][0].cartonQty : 0;

			let text = '';
			switch (col) {
				case 'Item Title':
					let name = sumItems['JV'][sk]['name'];
					
				    text = name.replace(/\[.*\]/,'');
						
					
					break;
				case 'sku':
					let sks = sk.split(' ');
					if (sks.length == 1) {
						text = sks[0];
					} else {
						if (sks[0]=='AI' || sks[0]=='IA') {
							text = sks[1];
						} else {
							if (sks[1] == 'PARCEL' || sks[1] == 'FF' || sks[1] == 'FLATPACK') {
								text = sks[0];
							} else {
								text = sk;
							}
						}
					}
					break;
				case 'Quantity Need':
					text = sum;
					break;
				case 'Quantity In Stock':
					text = cartonQty*quantityPerCarton+indivQty;
					break;
				case 'Quantity Order':
					let numberOrder = sum - 0;
					let inner = inventoryDetails[sk] ? inventoryDetails[sk][0].innerQty : 0

					//console.log(numberOrder + ' ' + inner + ' ' + quantityPerCarton);
					if (inner) {
						if (numberOrder % inner != 0) {
							numberOrder = Math.ceil(numberOrder/inner) * inner 
						}
						
					} else {
						if (quantityPerCarton) {
							if (numberOrder % quantityPerCarton != 0) {
								numberOrder = Math.ceil(numberOrder/quantityPerCarton) * quantityPerCarton 
							}
						}
					}
					text = numberOrder>0 ? numberOrder : '0';
					break;
				case 'Inner':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['innerQty'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['innerQty'] : 'N/A';
					break;
				case 'Pack Size':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['quantityPerCarton'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['quantityPerCarton'] : 'N/A';
					break;
				case 'Image':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['image'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['image'] : image;
					break;
				default:
					text = '';
			}

			if (col=='Image') {
				let img = document.createElement('img');
				img.src = text;
				td.appendChild(img); 
			} else {
				td.textContent = text;
			}
			tr.appendChild(td);
		}

		tableBody.appendChild(tr);
	}

	for (let sk in sumItems['HYC']) {
		let sum = sumItems['HYC'][sk]['sum'];
		let barcode = sumItems['HYC'][sk]['barcode'];
		let singleItemBarcode = sumItems['HYC'][sk]['singleItemBarcode'];
		let image = sumItems['HYC'][sk]['image'];
		let tr = document.createElement('tr');
		tr.dataset.type = 'HYC';
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

			let quantityPerCarton = inventoryDetails[sk] ? inventoryDetails[sk][0].quantityPerCarton : 0;
			let indivQty = inventoryDetails[sk] ? inventoryDetails[sk][0].indivQty : 0;
			let cartonQty = inventoryDetails[sk] ? inventoryDetails[sk][0].cartonQty : 0;

			let text = '';
			switch (col) {
				case 'Item Title':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0].itemName : sumItems['HYC'][sk]['name'];

					let text2 = text.split('x');
					if (!isNaN(text2[0])) {
						text = text2[1].trim();
					} else {
						let numbers = text2[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text2[1].trim();
					}

					let text3 = text.split('X');
					if (!isNaN(text3[0])) {
						text = text3[1].trim();
					} else {
						let numbers = text3[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text3[1].trim();
					}
					break;
				case 'sku':
					text = sk;
					break;
				case 'Quantity Need':
					text = sum;
					break;
				case 'Quantity In Stock':
					text = cartonQty*quantityPerCarton+indivQty;
					break;
				case 'Quantity Order':
					let numberOrder = sum - (cartonQty*quantityPerCarton+indivQty);
					text = numberOrder>0 ? numberOrder : '0';
					break;
				case 'Pack Size': 
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['packsize'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['packsize'] : '0';;
					break;
				case 'Image':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['image'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['image'] : image;
					break;
				default:
					text = '';
			}
			if (col=='Image') {
				let img = document.createElement('img');
				img.src = text;
				td.appendChild(img); 
			} else {
				td.textContent = text;
			}
			
			tr.appendChild(td);
		}

		tableBody.appendChild(tr);
	}

	for (let sk in sumItems['SP']) {
		let sum = sumItems['SP'][sk]['sum'];
		let barcode = sumItems['SP'][sk]['barcode'];
		let singleItemBarcode = sumItems['SP'][sk]['singleItemBarcode'];
		let image = sumItems['SP'][sk]['image'];
		let tr = document.createElement('tr');
		tr.dataset.type = 'SP';
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

			let quantityPerCarton = inventoryDetails[sk] ? inventoryDetails[sk][0].quantityPerCarton : 0;
			let indivQty = inventoryDetails[sk] ? inventoryDetails[sk][0].indivQty : 0;
			let cartonQty = inventoryDetails[sk] ? inventoryDetails[sk][0].cartonQty : 0;

			let text = '';
			switch (col) {
				case 'Item Title':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0].itemName : sumItems['SP'][sk]['name'];

					let text2 = text.split('x');
					if (!isNaN(text2[0])) {
						text = text2[1].trim();
					} else {
						let numbers = text2[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text2[1].trim();
					}

					let text3 = text.split('X');
					if (!isNaN(text3[0])) {
						text = text3[1].trim();
					} else {
						let numbers = text3[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text3[1].trim();
					}
					break;
				case 'sku':
					text = sk;
					break;
				case 'Quantity Need':
					text = sum;
					break;
				case 'Quantity In Stock':
					text = cartonQty*quantityPerCarton+indivQty;
					break;
				case 'Quantity Order':
					let numberOrder = sum - (cartonQty*quantityPerCarton+indivQty);
					text = numberOrder>0 ? numberOrder : '0';
					break;
				case 'Pack Size': 
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['packsize'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['packsize'] : '0';;
					break;
				case 'Image':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['image'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['image'] : image;
					break;
				default:
					text = '';
			}
			if (col=='Image') {
				let img = document.createElement('img');
				img.src = text;
				td.appendChild(img); 
			} else {
				td.textContent = text;
			}
			
			tr.appendChild(td);
		}

		tableBody.appendChild(tr);
	}

	for (let sk in sumItems['SIG']) {
		let sum = sumItems['SIG'][sk]['sum'];
		let barcode = sumItems['SIG'][sk]['barcode'];
		let singleItemBarcode = sumItems['SIG'][sk]['singleItemBarcode'];
		let image = sumItems['SIG'][sk]['image'];
		let tr = document.createElement('tr');
		tr.dataset.type = 'SIG';
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

			let quantityPerCarton = inventoryDetails[sk] ? inventoryDetails[sk][0].quantityPerCarton : 0;
			let indivQty = inventoryDetails[sk] ? inventoryDetails[sk][0].indivQty : 0;
			let cartonQty = inventoryDetails[sk] ? inventoryDetails[sk][0].cartonQty : 0;

			let text = '';
			switch (col) {
				case 'Item Title':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0].itemName : sumItems['SIG'][sk]['name'];

					let text2 = text.split('x');
					if (!isNaN(text2[0])) {
						text = text2[1].trim();
					} else {
						let numbers = text2[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text2[1].trim();
					}

					let text3 = text.split('X');
					if (!isNaN(text3[0])) {
						text = text3[1].trim();
					} else {
						let numbers = text3[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text3[1].trim();
					}
					break;
				case 'sku':
					text = sk;
					break;
				case 'Quantity Need':
					text = sum;
					break;
				case 'Quantity In Stock':
					text = cartonQty*quantityPerCarton+indivQty;
					break;
				case 'Quantity Order':
					let numberOrder = sum - (cartonQty*quantityPerCarton+indivQty);
					text = numberOrder>0 ? numberOrder : '0';
					break;
				case 'Pack Size': 
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['packsize'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['packsize'] : '0';;
					break;
				case 'Image':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['image'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['image'] : image;
					break;
				default:
					text = '';
			}
			if (col=='Image') {
				let img = document.createElement('img');
				img.src = text;
				td.appendChild(img); 
			} else {
				td.textContent = text;
			}
			
			tr.appendChild(td);
		}

		tableBody.appendChild(tr);
	}

	for (let sk in sumItems['COS']) {
		let sum = sumItems['COS'][sk]['sum'];
		let barcode = sumItems['COS'][sk]['barcode'];
		let singleItemBarcode = sumItems['COS'][sk]['singleItemBarcode'];
		let image = sumItems['COS'][sk]['image'];
		let tr = document.createElement('tr');
		tr.dataset.type = 'COS';
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

			let quantityPerCarton = inventoryDetails[sk] ? inventoryDetails[sk][0].quantityPerCarton : 0;
			let indivQty = inventoryDetails[sk] ? inventoryDetails[sk][0].indivQty : 0;
			let cartonQty = inventoryDetails[sk] ? inventoryDetails[sk][0].cartonQty : 0;

			let text = '';
			switch (col) {
				case 'Item Title':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0].itemName : sumItems['COS'][sk]['name'];

					let text2 = text.split('x');
					if (!isNaN(text2[0])) {
						text = text2[1].trim();
					} else {
						let numbers = text2[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text2[1].trim();
					}

					let text3 = text.split('X');
					if (!isNaN(text3[0])) {
						text = text3[1].trim();
					} else {
						let numbers = text3[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text3[1].trim();
					}
					break;
				case 'sku':
					text = sk;
					break;
				case 'Quantity Need':
					text = sum;
					break;
				case 'Quantity In Stock':
					text = cartonQty*quantityPerCarton+indivQty;
					break;
				case 'Quantity Order':
					let numberOrder = sum - (cartonQty*quantityPerCarton+indivQty);
					text = numberOrder>0 ? numberOrder : '0';
					break;
				case 'Pack Size': 
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['packsize'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['packsize'] : '0';;
					break;
				case 'Image':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['image'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['image'] : image;
					break;
				default:
					text = '';
			}
			if (col=='Image') {
				let img = document.createElement('img');
				img.src = text;
				td.appendChild(img); 
			} else {
				td.textContent = text;
			}
			
			tr.appendChild(td);
		}

		tableBody.appendChild(tr);
	}

	for (let sk in sumItems['HOB']) {
		if (sk.startsWith('WV-') || sk.startsWith('ME-')) continue;
		let sum = sumItems['HOB'][sk]['sum'];
		let barcode = sumItems['HOB'][sk]['barcode'];
		let singleItemBarcode = sumItems['HOB'][sk]['singleItemBarcode'];
		let image = sumItems['HOB'][sk]['image'];
		let tr = document.createElement('tr');
		tr.dataset.type = 'HOB';
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

			let quantityPerCarton = inventoryDetails[sk] ? inventoryDetails[sk][0].quantityPerCarton : 0;
			let indivQty = inventoryDetails[sk] ? inventoryDetails[sk][0]['3PLIndivQty'] : 0;
			let cartonQty = inventoryDetails[sk] ? inventoryDetails[sk][0]['3PLCartonQty'] : 0;

			let text = '';
			switch (col) {
				case 'Item Title':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0].itemName : sumItems['HOB'][sk]['name'];
					/*let text2 = text.split('x');
					if (!isNaN(text2[0])) {
						text = text2[1].trim();
					} else {
						let numbers = text2[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text2[1].trim();
					}

					let text3 = text.split('X');
					if (!isNaN(text3[0])) {
						text = text3[1].trim();
					} else {
						let numbers = text3[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text3[1].trim();
					}*/
					break;
				case 'sku':
					text = sk;
					break;
				case 'Quantity Need':
					text = sum;
					break;
				case 'Quantity In Stock':
					text = cartonQty*quantityPerCarton+indivQty;
					break;
				case 'Quantity Order':
					let numberOrder = sum - (cartonQty*quantityPerCarton+indivQty);
					text = numberOrder>0 ? numberOrder : '0';
					break;
				case 'Pack Size': 
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['packsize'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['packsize'] : '0';;
					break;
				case 'Image':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['image'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['image'] : image;
					break;
				default:
					text = '';
			}
			if (col=='Image') {
				let img = document.createElement('img');
				img.src = text;
				td.appendChild(img); 
			} else {
				td.textContent = text;
			}
			
			tr.appendChild(td);
		}

		tableBody.appendChild(tr);
	}

	for (let sk in sumItems['HOBW']) {
		if (sk.startsWith('WV-') || sk.startsWith('ME-')) continue;
		let sum = sumItems['HOBW'][sk]['sum'];
		let barcode = sumItems['HOBW'][sk]['barcode'];
		let singleItemBarcode = sumItems['HOBW'][sk]['singleItemBarcode'];
		let image = sumItems['HOBW'][sk]['image'];
		let tr = document.createElement('tr');
		tr.dataset.type = 'HOBW';
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

			let quantityPerCarton = inventoryDetails[sk] ? inventoryDetails[sk][0].quantityPerCarton : 0;
			let indivQty = inventoryDetails[sk] ? inventoryDetails[sk][0]['3PLIndivQty'] : 0;
			let cartonQty = inventoryDetails[sk] ? inventoryDetails[sk][0]['3PLCartonQty'] : 0;

			let text = '';
			switch (col) {
				case 'Item Title':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0].itemName : sumItems['HOBW'][sk]['name'];
					/*let text2 = text.split('x');
					if (!isNaN(text2[0])) {
						text = text2[1].trim();
					} else {
						let numbers = text2[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text2[1].trim();
					}

					let text3 = text.split('X');
					if (!isNaN(text3[0])) {
						text = text3[1].trim();
					} else {
						let numbers = text3[0].split('/');
						let isNumber = true;
						for (let num of numbers) {
							if (isNaN(num)) isNumber = false;
						}
						if (isNumber) text = text3[1].trim();
					}*/
					break;
				case 'sku':
					text = sk;
					break;
				case 'Quantity Need':
					text = sum;
					break;
				case 'Quantity In Stock':
					text = cartonQty*quantityPerCarton+indivQty;
					break;
				case 'Quantity Order':
					let numberOrder = sum - (cartonQty*quantityPerCarton+indivQty);
					text = numberOrder>0 ? numberOrder : '0';
					break;
				case 'Pack Size': 
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['packsize'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['packsize'] : '0';;
					break;
				case 'Image':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['image'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['image'] : image;
					break;
				default:
					text = '';
			}
			if (col=='Image') {
				let img = document.createElement('img');
				img.src = text;
				td.appendChild(img); 
			} else {
				td.textContent = text;
			}
			
			tr.appendChild(td);
		}

		tableBody.appendChild(tr);
	}

	for (let sk in sumItems['HPD']) {
		let sum = sumItems['HPD'][sk]['sum'];
		let barcode = sumItems['HPD'][sk]['barcode'];
		let singleItemBarcode = sumItems['HPD'][sk]['singleItemBarcode'];
		let image = sumItems['HPD'][sk]['image'];
		let tr = document.createElement('tr');
		tr.dataset.type = 'HPD';
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

			let quantityPerCarton = inventoryDetails[sk] ? inventoryDetails[sk][0].quantityPerCarton : 0;
			let indivQty = inventoryDetails[sk] ? inventoryDetails[sk][0].indivQty : 0;
			let cartonQty = inventoryDetails[sk] ? inventoryDetails[sk][0].cartonQty : 0;

			let text = '';
			switch (col) {
				case 'Item Title':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0].itemName : sumItems['HPD'][sk]['name'];
					break;
				case 'sku':
					text = sk;
					break;
				case 'Quantity Need':
					text = sum;
					break;
				case 'Quantity In Stock':
					text = cartonQty*quantityPerCarton+indivQty;
					break;
				case 'Quantity Order':
					let numberOrder = sum - (cartonQty*quantityPerCarton+indivQty);
					text = numberOrder>0 ? numberOrder : '0';
					break;
				case 'Pack Size': 
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['packsize'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['packsize'] : '0';;
					break;
				case 'Image':
					text = inventoryDetails[sk] ? inventoryDetails[sk][0]['image'] : inventoryDetails[singleItemBarcode] ? inventoryDetails[singleItemBarcode][0]['image'] : image;
					break;
				default:
					text = '';
			}
			if (col=='Image') {
				let img = document.createElement('img');
				img.src = text;
				td.appendChild(img); 
			} else {
				td.textContent = text;
			}
			
			tr.appendChild(td);
		}

		tableBody.appendChild(tr);
	}

	let trs = document.querySelectorAll('.content-page table tbody tr');
	for (let tr of trs) {
		if (tr.dataset.type == 'SIG') {
			tr.classList.remove('hide');
		} else {
			tr.classList.add('hide');
		}	
	}


	document.querySelector('#content-order-summary table thead th.selected-all').addEventListener('click', selectAllOrders, false);
	document.querySelector('#content-order-summary table thead th.selected-all input').addEventListener('change', selectAllOrders, false);
	document.getElementById('content-orders-save').addEventListener('click', saveDocument, false);
	document.getElementById('content-orders-selected-save').addEventListener('click', saveDocumentSelected, false);
	addListener('#content-orders-filters form input', 'change', filterOrders);

	document.getElementById('loading').style.display = 'none';
});

// Load the sales records from the server
async function loadRecords(startDate = 'all', endDate = null) {
	// Load orders
	var pageUrl = apiServer+'orders/load?store=all&day='+startDate;
	if (endDate) pageUrl += '&endday='+endDate+'&status[]=0&status[]=17&status[]=18';
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
	var tableHeaderTh = table.querySelectorAll('thead th:not(.hide)');
	var orderRows = [];
	var headerRow = [];
	var requiredCols = {};
	var excludedCols = {};
	var orderRequiredCols = {};
	var orderNamesValid = true;

	// Get indices of columns that should be excluded
	{
		let headerRow = [];
		for (let th of tableHeaderTh) {
			if (th.dataset.col) {
				headerRow.push(th.dataset.col);
			}
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
		let tds = tableRow.querySelectorAll('td:not(.hide)');
		let orderRow = [];
		
		for (let td_i = 1; td_i < tds.length; td_i++) {
			let td = tds[td_i];
			if (td.dataset.col=='Image') {
				orderRow.push(td.firstChild.getAttribute("src"));
			}
			else {
				orderRow.push(td.textContent);
			}	

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
	var tableHeaderTh = table.querySelectorAll('thead th:not(.hide)');
	var orderRows = [];
	var headerRow = [];
	var requiredCols = {};
	var excludedCols = {};
	var orderRequiredCols = {};
	var orderNamesValid = true;

	// Get indices of columns that should be excluded
	{
		let headerRow = [];
		for (let th of tableHeaderTh) {
			if (th.dataset.col) {
				headerRow.push(th.dataset.col);
			}
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
			let tds = tableRow.querySelectorAll('td:not(.hide)');
			let orderRow = [];

			// Save each value
			for (let td_i = 1; td_i < tds.length; td_i++) {
				let td = tds[td_i];
				if (td.dataset.col=='Image') {
					orderRow.push(td.firstChild.getAttribute("src"));
				}
				else {
					orderRow.push(td.textContent);
				}	

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
	var thead = e.target.closest('.content-page').querySelector('table thead');
	var tableHeadths = thead.querySelectorAll('th');
	var tableBody = e.target.closest('.content-page').querySelector('table tbody');
	var tableBodyTrs = tableBody.querySelectorAll('tr');
	var checkedItem = e.target.closest('.options').querySelector('form input:checked');
	var filter = checkedItem.value;
	window.page.type = filter;

	for (let th of tableHeadths) {
		if (hideCols.includes(th.dataset.col)) {
			if (filter=='HYC' || filter=='COS' || filter=='HOB' || filter=='HOBW' || filter=='HPD') {
				th.classList.add('hide');
			} else {
				th.classList.remove('hide');
			}
		} 
	}

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

		let tds = tr.querySelectorAll('td');
		for (let td of tds) {
			if (hideCols.includes(td.dataset.col)) {
				if (filter=='HYC' || filter=='COS' || filter=='HOB' || filter=='HOBW' || filter=='HPD') {
					td.classList.add('hide');
				} else {
					td.classList.remove('hide');
				}
			} 
		}
	}

}
