// Show the selected tab

import {showOrders, showDoneScreen} from './orders.js';
import {clearRecords} from './order-list.js';
import {updatePageRecords} from './live-messages.js';
import {hasKey} from '/common/tools.js';

function showTab(data = {}) {
	var recordItems = document.querySelectorAll('#record-list ul li');
	var selectedOrderTypes = {}, selectedOrderData = {};
	var tabID = null;

	// Get tab ID
	for (let pageTab in PAGE_TAB) {
		let pageTabInfo = PAGE_TAB_INFO[PAGE_TAB[pageTab]];
		if (pageTabInfo.name == data.name || pageTabInfo.id == data.id || pageTabInfo.href == data.href) {
			tabID = PAGE_TAB[pageTab];
			break;
		}
	}

	if (tabID==null) {
		// if (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.PARTIALCOLLECT || page.type == PAGE_TYPE.WAREHOUSECOLLECT || page.type == PAGE_TYPE.AWAITINGLIST  || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.B2B || page.type == PAGE_TYPE.NEWORDERS) {
			// let hflink = document.querySelector('#header a').href.split('#')[1];
			// for (let pageTab in PAGE_TAB) {
				// let pageTabInfo = PAGE_TAB_INFO[PAGE_TAB[pageTab]];
				// if (pageTabInfo.href == '#'+hflink) {
					// tabID = PAGE_TAB[pageTab];
					// break;
				// }
			// }
		// } else if (page.type == PAGE_TYPE.RTS) {
			// tabID = PAGE_TAB.RTS;
		// } else if (page.type == PAGE_TYPE.REFUNDS) {
			// tabID = PAGE_TAB.PENDINGREFUND;
		// } 
	}

	// Get selected order type/s
	switch (tabID) {
		case PAGE_TAB.PARCELS:
			selectedOrderTypes[ORDER_TYPE.FASTWAY] = true;
			selectedOrderTypes[ORDER_TYPE.AUSPOST] = true;
			break;
		case PAGE_TAB.FLATPACK:
			selectedOrderTypes[ORDER_TYPE.FLATPACK] = true;
			break;
		case PAGE_TAB.FASTWAYFLATPACK:
			selectedOrderTypes[ORDER_TYPE.FASTWAYFLATPACK] = true;
			break;
		case PAGE_TAB.FASTWAYFLATPACK1KG:
			selectedOrderTypes[ORDER_TYPE.FASTWAYFLATPACK1KG] = true;
			break;
		case PAGE_TAB.FASTWAYFLATPACK5KG:
			selectedOrderTypes[ORDER_TYPE.FASTWAYFLATPACK5KG] = true;
			break;
		case PAGE_TAB.EXPRESS:
			selectedOrderTypes[ORDER_TYPE.EXPRESS] = true;
			break;
		case PAGE_TAB.INTERNATIONAL:
			selectedOrderTypes[ORDER_TYPE.INTERNATIONAL] = true;
			break;
		case PAGE_TAB.NOTRACKING:
			selectedOrderData[ORDER_DATA.NOTRACKING] = true;
			break;
		case PAGE_TAB.MNB:
			selectedOrderData[ORDER_DATA.MNB] = true;
			break;
		case PAGE_TAB.VR:
			selectedOrderTypes[ORDER_TYPE.VR] = true;
			selectedOrderData[ORDER_DATA.VR] = true;
			break;
		case PAGE_TAB.DO:
			selectedOrderTypes[ORDER_TYPE.DO] = true;
			selectedOrderData[ORDER_DATA.DO] = true;
			break;
		case PAGE_TAB.COMBINED:
			selectedOrderData[ORDER_DATA.CG] = true;
			break;
		case PAGE_TAB.SOS:
			selectedOrderData[ORDER_DATA.SOS] = true;
			break;
		case PAGE_TAB.KOBAYASHI:
			selectedOrderData[ORDER_DATA.KOBAYASHI] = true;
			break;
		case PAGE_TAB.AMAZON:
			selectedOrderData[ORDER_DATA.AMAZON] = true;
			break;
		case PAGE_TAB.JV:
			selectedOrderData[ORDER_DATA.JV] = true;
			break;
		case PAGE_TAB.FACTORY:
			selectedOrderData[ORDER_DATA.FACTORY] = true;
			break;
		case PAGE_TAB.COSTCO:
			selectedOrderData[ORDER_DATA.COSTCO] = true;
			break;
		case PAGE_TAB.CHARLICHAIR:
			selectedOrderData[ORDER_DATA.CHARLICHAIR] = true;
			break;
		case PAGE_TAB.MAGENTO:
			selectedOrderData[ORDER_DATA.MAGENTO] = true;
			break;
		case PAGE_TAB.MICROSOFT:
			selectedOrderData[ORDER_DATA.MICROSOFT] = true;
			break;
		case PAGE_TAB.LPG:
			selectedOrderTypes[ORDER_TYPE.LPG] = true;
			selectedOrderData[ORDER_DATA.LPG] = true;
			break;
		case PAGE_TAB.MORLIFE:
			selectedOrderTypes[ORDER_TYPE.MORLIFE] = true;
			selectedOrderData[ORDER_DATA.MORLIFE] = true;
			// selectedOrderData[ORDER_DATA.MORLIFE] = true; //needed for button under costco
			break;
		case PAGE_TAB.SPWAREHOUSE:
			selectedOrderData[ORDER_DATA.SPWAREHOUSE] = true;
			break;
		case PAGE_TAB.ORBIT:
			selectedOrderData[ORDER_DATA.ORBIT] = true;
			break;
		case PAGE_TAB.WV:
			selectedOrderData[ORDER_DATA.WV] = true;
			break;
		case PAGE_TAB.ME:
			selectedOrderData[ORDER_DATA.ME] = true;
			break;
		case PAGE_TAB.SCHOLASTIC:
			selectedOrderData[ORDER_DATA.SCHOLASTIC] = true;
			break;
		case PAGE_TAB.KORIMCO:
			selectedOrderData[ORDER_DATA.KORIMCO] = true;
			break;
		case PAGE_TAB.HYCLOR:
			selectedOrderData[ORDER_DATA.HYCLOR] = true;
			break;
		case PAGE_TAB.SPLOSH:
			selectedOrderData[ORDER_DATA.SPLOSH] = true;
			break;
		case PAGE_TAB.SIGMA:
			selectedOrderData[ORDER_DATA.SIGMA] = true;
			break;
		case PAGE_TAB.MISC:
			selectedOrderData[ORDER_DATA.MISC] = true;
			break;
		// case PAGE_TAB.SIXPACK:
		// 	selectedOrderData[ORDER_DATA.SIXPACK] = true;
		// 	break;
		// case PAGE_TAB.TENPACK:
		// 	selectedOrderData[ORDER_DATA.TENPACK] = true;
		// 	break;
		// case PAGE_TAB.TWENTYPACK:
		// 	selectedOrderData[ORDER_DATA.TWENTYPACK] = true;
		// 	break;
		// case PAGE_TAB.THIRTYPACK:
		// 	selectedOrderData[ORDER_DATA.THIRTYPACK] = true;
		// 	break;
		// case PAGE_TAB.SIXTYPACK:
		// 	selectedOrderData[ORDER_DATA.SIXTYPACK] = true;
		// 	break;
		// case PAGE_TAB.GUCCI:
		// 	selectedOrderData[ORDER_DATA.GUCCI] = true;
		// 	break;
		case PAGE_TAB.TPROLLS:
			selectedOrderData[ORDER_DATA.TPROLLS] = true;
			break;
		case PAGE_TAB.HOBBYCO:
			selectedOrderData[ORDER_DATA.HOBBYCO] = true;
			break;
		case PAGE_TAB.RTS:
			selectedOrderData[ORDER_DATA.RTS] = true;
			break;
		case PAGE_TAB.DAMAGEDRTS:
			selectedOrderData[ORDER_DATA.DAMAGEDRTS] = true;
			break;
		case PAGE_TAB.PENDINGREFUND:
			selectedOrderData[ORDER_DATA.PENDINGREFUND] = true;
			break;
		case PAGE_TAB.REFUNDDONE:
			selectedOrderData[ORDER_DATA.REFUNDDONE] = true;
			break;
		case PAGE_TAB.PARTIALREFUND:
			selectedOrderData[ORDER_DATA.PARTIALREFUND] = true;
			break;	
		case PAGE_TAB.ALTERNATIVE:
			selectedOrderData[ORDER_DATA.ALTERNATIVE] = true;
			break;
		// case PAGE_TAB.B2BWholesale:
		// 	selectedOrderData[ORDER_DATA.B2BWholesale] = true;
		// 	break;
		// case PAGE_TAB.B2BTransfer:
		// 	selectedOrderData[ORDER_DATA.B2BTransfer] = true;
		// 	break;
		case PAGE_TAB.B2BORDERS:
			selectedOrderData[ORDER_DATA.B2BORDERS] = true;
			break;
		case PAGE_TAB.HABITANIA:
			selectedOrderData[ORDER_DATA.HABITANIA] = true;
			break;
		case PAGE_TAB.CATWALK:
			selectedOrderData[ORDER_DATA.CATWALK] = true;
			break;
		case PAGE_TAB.PARTIALLYPICKED:
			selectedOrderData[ORDER_DATA.PARTIALLYPICKED] = true;
			break;
		case PAGE_TAB.FULLYPICKED:
			selectedOrderData[ORDER_DATA.FULLYPICKED] = true;
			break;
		case PAGE_TAB.SONSOFAMAZON:
			selectedOrderData[ORDER_DATA.SONSOFAMAZON] = true;
			break;
		case PAGE_TAB.AUTOWELL:
			selectedOrderData[ORDER_DATA.AUTOWELL] = true;
			break;
		case PAGE_TAB.TRINITYCONNECT:
			selectedOrderData[ORDER_DATA.TRINITYCONNECT] = true;
			break;
		case PAGE_TAB.CIRCULAR2NDS:
			selectedOrderData[ORDER_DATA.CIRCULAR2NDS] = true;
			break;
		case PAGE_TAB.RRV:
			selectedOrderData[ORDER_DATA.RRV] = true;
			break;
		case PAGE_TAB.SWD:
			selectedOrderData[ORDER_DATA.SWD] = true;
			break;
		case PAGE_TAB.HPD:
			selectedOrderData[ORDER_DATA.HPD] = true;
			break;
		case PAGE_TAB.ELIABATHROOMS:
			selectedOrderData[ORDER_DATA.ELIABATHROOMS] = true;
			break;
		case PAGE_TAB.SPARTAN:
			selectedOrderData[ORDER_DATA.SPARTAN] = true;
			break;
		case PAGE_TAB.DEAL:
			selectedOrderData[ORDER_DATA.DEAL] = true;
			break;
		case PAGE_TAB.HUGGIES:
			selectedOrderData[ORDER_DATA.HUGGIES] = true;
			break;
		case PAGE_TAB.FINISH:
			selectedOrderData[ORDER_DATA.FINISH] = true;
			break;
		case PAGE_TAB.ORALB:
			selectedOrderData[ORDER_DATA.ORALB] = true;
			break;
		case PAGE_TAB.ATPACK:
			selectedOrderData[ORDER_DATA.ATPACK] = true;
			break;
		case PAGE_TAB.QUARANTINE:
			selectedOrderData[ORDER_DATA.QUARANTINE] = true;
			break;
		case PAGE_TAB.PACOJAANSON:
			selectedOrderData[ORDER_DATA.PACOJAANSON] = true;
			break;
		case PAGE_TAB.ICTONE:
			selectedOrderData[ORDER_DATA.ICTONE] = true;
			break;
		case PAGE_TAB.HOBEXPRESS:
			selectedOrderData[ORDER_DATA.HOBEXPRESS] = true;
			break;
			
		default:
			if (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.PARTIALCOLLECT || page.type == PAGE_TYPE.WAREHOUSECOLLECT || page.type == PAGE_TYPE.AWAITINGLIST  || page.type == PAGE_TYPE.ORDERED) {
				tabID = PAGE_TAB.HOBBYCO;
				selectedOrderData[ORDER_DATA.HOBBYCO] = true;
			} else if (page.type == PAGE_TYPE.RTS) {
				tabID = PAGE_TAB.RTS;
				selectedOrderData[ORDER_DATA.RTS] = true;
			} else if (page.type == PAGE_TYPE.REFUNDS) {
				tabID = PAGE_TAB.PENDINGREFUND;
				selectedOrderData[ORDER_DATA.PENDINGREFUND] = true;
			} else if (page.type == PAGE_TYPE.B2B) {
				tabID = PAGE_TAB.PARTIALLYPICKED;
				selectedOrderData[ORDER_DATA.PARTIALLYPICKED] = true;
			} else if (page.type == PAGE_TYPE.NEWORDERS) {
				// tabID = PAGE_TAB.B2BWholesale;
				// selectedOrderData[ORDER_DATA.B2BWholesale] = true;
				tabID = PAGE_TAB.B2BORDERS;
				selectedOrderData[ORDER_DATA.B2BORDERS] = true;
			} else if (page.type == PAGE_TYPE.DEAL) {
				tabID = PAGE_TAB.HUGGIES;
				selectedOrderData[ORDER_DATA.HUGGIES] = true;
			}
	}

	// Select the selected tab
	var tabs = document.querySelectorAll('#header a');
	if (tabs.length) {
		for (let i = 0; i < tabs.length; i++) {
			tabs[i].classList.remove('selected');
		}
		//console.log(tabID);
		document.getElementById(PAGE_TAB_INFO[tabID].id).classList.add('selected');
		page.tab = tabID;
	}

	var tabs = document.querySelectorAll('#header option');

	if (tabs.length) {
		for (let i = 0; i < tabs.length; i++) {
			if (tabs[i].id == PAGE_TAB_INFO[tabID].id) {
				tabs[i].selected = 'selected';
			} 
		}
		
		page.tab = tabID;
	}


	// Re-enable all items
	for (let i = 0; i < recordItems.length; i++) {
		if (recordItems[i].dataset.removed) {
			recordItems[i].classList.add('disabled');
			continue;
		}
		recordItems[i].classList.remove('disabled');
		recordItems[i].removeAttribute('data-topranked');
	}

	var connectedRecordsLoaded = {};
	for (let store in stores) {
		connectedRecordsLoaded[store] = {};
	}

	// Show items for the selected order type/s
	var selectedOrderTypesCount = Object.keys(selectedOrderTypes).length;
	var selectedOrderDataCount = Object.keys(selectedOrderData).length;

	for (let i = 0; i < recordItems.length; i++) {
		let recordItem = recordItems[i], recordStore = recordItem.dataset.store, recordNum = recordItem.dataset.record;
		let recordExtraData = recordItem.dataset.extra ? JSON.parse(recordItem.dataset.extra) : {};
		let saleRecordStore = saleRecords[recordStore];
		if (!saleRecordStore || !saleRecordStore.today[recordNum]) continue;
		let record = saleRecordStore.today[recordNum];
		let connectedRecords = saleRecordStore.connected[recordNum];

		// Hide records that don't match the order type or order data or if they are connected orders that have already been shown
		if ((!selectedOrderDataCount && selectedOrderTypesCount && !selectedOrderTypes.hasOwnProperty(record.OrderType)) || connectedRecordsLoaded[recordStore].hasOwnProperty(recordNum)
			|| (!selectedOrderTypesCount && selectedOrderDataCount && !hasKey(selectedOrderData, recordExtraData)) || (Object.keys(recordExtraData).length && !selectedOrderDataCount)
			|| (selectedOrderDataCount && selectedOrderTypesCount && !selectedOrderTypes.hasOwnProperty(record.OrderType) && !hasKey(selectedOrderData, recordExtraData))) {
			if (!recordItem.dataset.topranked) recordItem.classList.add('disabled');
		}
		else {
			// Add any connected records to the done list
			let orderTypeRank = ORDER_TYPE_RANK[record.OrderType] || null;
			let orderTopRanked = [recordStore, recordNum];
			let useTopRanked = false;

			if (connectedRecords.length > 1) {
				for (let cr_i = 0; cr_i < connectedRecords.length; cr_i++) {
					let crRecordStore = connectedRecords[cr_i][0], crRecordNum = connectedRecords[cr_i][1];
					connectedRecordsLoaded[crRecordStore][crRecordNum] = true;

					if (orderTypeRank) {
						// Hide the main record if it is ranked and if one of the connected records has a higher rank (Express > Aus Post/Fastway/Parcel > Flat-pack)
						let connectedRecord = saleRecords[crRecordStore].today[crRecordNum];
						if (connectedRecord.OrderType && ORDER_TYPE_RANK[connectedRecord.OrderType] > orderTypeRank) {
							recordItem.classList.add('disabled');
							orderTopRanked = [crRecordStore, crRecordNum]; // Update the top-ranked order
							useTopRanked = true;
						}
					}
				}
			}

			// Show the top-ranked order if needed
			if (useTopRanked && (!selectedOrderTypesCount || selectedOrderTypes.hasOwnProperty(saleRecords[orderTopRanked[0]].today[orderTopRanked[1]].OrderType))) {
				let orderTopRankedEl = document.querySelector('#record-list ul li[data-store="'+orderTopRanked[0]+'"][data-record="'+orderTopRanked[1]+'"]');
				orderTopRankedEl.classList.remove('disabled');
				orderTopRankedEl.dataset.topranked = 'true';
			}
		}
	}

	//show number of records
	let recordListAll = document.querySelectorAll('#record-list ul li:not(.disabled):not(.hide)');
	// console.log(recordListAll.length);
	//document.querySelector('#header input').value = recordListAll.length;

	// Show first record
	var firstItem = document.querySelector('#record-list ul li:not(.disabled)');
	if (firstItem) {
		// Unselect selected item
		var selectedItem = document.querySelector('#record-list ul li.selected');
		if (selectedItem) {
			selectedItem.classList.remove('selected');
		}

		// Select the first item
		firstItem.classList.add('selected');
		if (firstItem.dataset && firstItem.dataset.store && firstItem.dataset.record) {
			if (!page.localUser) {
				// Send the record opened message once the connection to the server is ready
				(function sendRecordOpenedMsg() {
					/*if (page.liveMessages.connected) {
						page.liveMessages.send({action: LIVE_ACTIONS.RECORD_OPENED, page: page.type, store: firstItem.dataset.store, recordNum: firstItem.dataset.record, user: {id: page.user.id, firstname: page.user.firstname}});
					}
					else {
						setTimeout(sendRecordOpenedMsg, 500);
					}*/
				})();
				updatePageRecords(firstItem.dataset.store, firstItem.dataset.record, page.user, true);
			}
			showOrders(firstItem.dataset.store, firstItem.dataset.record);
		}
	}
	else {
		// Remove all currently shown record entries and show done screen
		clearRecords();
		showDoneScreen();

		if (!page.localUser) {
			// Send the record closed message once the connection to the server is ready
			function sendRecordClosedMsg() {
				/*if (page.liveMessages.connected) {
					page.liveMessages.send({action: LIVE_ACTIONS.RECORD_CLOSED, page: page.type, store: -1, recordNum: -1, user: {id: page.user.id, firstname: page.user.firstname}});
				}
				else {
					setTimeout(sendRecordClosedMsg, 500);
				}*/
			}
			sendRecordClosedMsg();
			updatePageRecords(null, null, page.user, false);
		}
	}
}

export {showTab};
