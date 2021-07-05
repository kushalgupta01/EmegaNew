// Live messages

import {usernamePart} from '/common/tools.js';
import {WebSocketMessages} from './websocket.js';

class LiveMessages extends WebSocketMessages {
	constructor(host = null) {
		super({host: host});
	}

	onMessageReceived(data) {
		if (typeof data !== 'object') {
			console.error('Invalid data received from the websocket server:', data);
			return;
		}

		var dataEntries = [];

		if (data.action == LIVE_ACTIONS.RECORD_ALL) {
			// Received all user statuses
			for (let entry of data.entries) {
				dataEntries.push(JSON.parse(entry));
			}
		}
		else {
			dataEntries.push(data);
		}

		for (let entry of dataEntries) {
			// Check page type
			if (entry.page != page.type) return;

			if (entry.action == LIVE_ACTIONS.RECORD_OPENED) {
				// Save and show the user's name
				if (!entry.hasOwnProperty('user')) return;
				updatePageRecords(entry.store, entry.recordNum, entry.user, true);
			}
			else if (entry.action == LIVE_ACTIONS.RECORD_CLOSED) {
				// Remove and maybe hide the user's name
				if (!entry.hasOwnProperty('user')) return;
				updatePageRecords(entry.store, entry.recordNum, entry.user, false);
			}
			else if (entry.action == LIVE_ACTIONS.STATUS_CHANGED) {
				// Mark/unmark the order
				if (!entry.hasOwnProperty('status')) return;
				var recordItem = document.querySelector('#record-list ul li[data-store="'+entry.store+'"][data-record="'+entry.recordNum+'"]');
				if (!recordItem) return;

				if (entry.status == ORDER_STATUS.NONE || entry.status == ORDER_STATUS.UNKNOWN) {
					recordItem.classList.remove('done');
				}
				else if (entry.status == ORDER_STATUS.OUTOFSTOCK) {
					recordItem.classList.add('outofstock');
					recordItem.dataset.removed = 'true';
				}
				else if (entry.status == 'dailyorder') {
					recordItem.classList.add('dailyorder');
				}
				else if (entry.status == 'fgb') {
					recordItem.classList.add('fgb');
				}
				else if (entry.status == 'morlife') {
					recordItem.classList.add('morlife');
				}
				else if (entry.status == 'spwarehouse') {
					recordItem.classList.add('spwarehouse');
				}
				else if (entry.status == 'orbit') {
					recordItem.classList.add('orbit');
				}
				else if (entry.status == 'wv') {
					recordItem.classList.add('wv');
				}
				else if (entry.status == 'scholastic') {
					recordItem.classList.add('scholastic');
				}
				else if (entry.status == 'korimco') {
					recordItem.classList.add('korimco');
				}
				else if (entry.status == 'hyclor') {
					recordItem.classList.add('hyclor');
				}
				else if (entry.status == 'splosh') {
					recordItem.classList.add('splosh');
				}
				else if (entry.status == 'sigma') {
					recordItem.classList.add('sigma');
				}
				else if (entry.status == 'misc') {
					recordItem.classList.add('misc');
				}
				else if (entry.status == 'intertrading') {
					recordItem.classList.add('intertrading');
				}
				else if (entry.status == 'factory') {
					recordItem.classList.add('factory');
				}
				// else if (entry.status == 'sixpack') {
				// 	recordItem.classList.add('sixpack');
				// }
				// else if (entry.status == 'tenpack') {
				// 	recordItem.classList.add('tenpack');
				// }
				// else if (entry.status == 'twentypack') {
				// 	recordItem.classList.add('twentypack');
				// }
				// else if (entry.status == 'thirtypack') {
				// 	recordItem.classList.add('thirtypack');
				// }
				// else if (entry.status == 'sixtypack') {
				// 	recordItem.classList.add('sixtypack');
				// }
				// else if (entry.status == 'gucci') {
				// 	recordItem.classList.add('gucci');
				// }
				else if (entry.status == 'kob') {
					recordItem.classList.add('kob');
				}
				else if (entry.status == 'tprolls') {
					recordItem.classList.add('tprolls');
				}
				/*else if (entry.status == 'hobbyco') {
					recordItem.classList.add('hobbyco');
				}*/
				else if (entry.status == ORDER_STATUS.ORDERED) {
					recordItem.classList.add('ordered');
				}
				else if (entry.status == ORDER_STATUS.CANCELLED.OUTOFSTOCK) {
					recordItem.classList.add('cancelledoos');
				}
				else if (entry.status == 'partialrefund') {
					recordItem.classList.add('partialrefund');
				}
				else if (entry.status == ORDER_STATUS.PENDINGREVIEW) {
					recordItem.classList.add('alternative');
				}
				else {
					recordItem.classList.add('done');
				}

				// Mark the tab button as done if all the orders in this tab are done
				var recordNotDone = document.querySelector('#record-list ul li:not(.done)');
				if (!recordNotDone) {
					document.querySelector('#header a.selected').classList.add('done');
				}
			}
		}
	}
}

// Find and update a user's status in the page records
function updatePageRecords(recordStore, recordNum, user, saveUser = true) {
	// Ignore if the user is the current user
	if (!user.id || user.id == page.user.id) return;

	// Remove the user from any other records
	pageRecordRemoveUser:
	for (let store in page.orders) {
		for (let pageRecordNum in page.orders[store].records) {
			let pageRecordUsers = page.orders[store].records[pageRecordNum];
			if (Array.isArray(pageRecordUsers) && pageRecordUsers.length) {
				for (let i = 0; i < pageRecordUsers.length; i++) {
					if (pageRecordUsers[i].id == user.id) {
						// Remove user (this should only happen once)
						pageRecordUsers.splice(i, 1);
						break pageRecordRemoveUser;
					}
				}
			}
		}
	}

	// Remove user from any old records and set them to their last user or hide them
	let recordItemUserAll = document.querySelectorAll('#record-list ul li .user[data-userid="'+user.id+'"]');
	for (let iu_e = 0; iu_e < recordItemUserAll.length; iu_e++) {
		let recordItemUser = recordItemUserAll[iu_e], recordItem = recordItemUser.parentNode;
		let pageRecordUsers = page.orders[recordItem.dataset.store].records[recordItem.dataset.record];

		if (Array.isArray(pageRecordUsers) && pageRecordUsers.length) {
			let lastUser = pageRecordUsers[pageRecordUsers.length - 1];
			recordItemUser.dataset.userid = lastUser.id;
			recordItemUser.textContent = usernamePart(lastUser.firstname);
			recordItemUser.setAttribute('title', lastUser.firstname);
		}
		else {
			recordItemUser.removeAttribute('data-username');
			recordItemUser.removeAttribute('title');
			recordItemUser.classList.add('hide');
		}
	}

	if (saveUser) {
		// Create new user list for the record if needed
		let pageRecordStore = page.orders[recordStore];
		if (!pageRecordStore.records.hasOwnProperty(recordNum)) {
			pageRecordStore.records[recordNum] = [];
		}

		// Add the user to the specified record and show their name
		pageRecordStore.records[recordNum].push(user);
		let recordItemUser = document.querySelector('#record-list ul li[data-store="'+recordStore+'"][data-record="'+recordNum+'"] .user');
		if (recordItemUser) {
			recordItemUser.dataset.userid = user.id;
			recordItemUser.textContent = usernamePart(user.firstname);
			recordItemUser.setAttribute('title', user.firstname);
			recordItemUser.classList.remove('hide');
		}
	}
}

export {LiveMessages, updatePageRecords};
