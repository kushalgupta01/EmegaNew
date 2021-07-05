//import '/common/stores.js';
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

if (page.local) {
	//apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	// back to menu button
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});

	addListener('#main #page-inventory', 'click', function(e) {
		window.location.href = '/inventory/inventory.html';
	});

	addListener('#main #page-inventory-scan', 'click', function(e) {
		window.location.href = '/inventory/inventoryscan.html';
	});

	addListener('#main #page-pickstock', 'click', function(e) {
		window.location.href = '/stock-pick/stockpick.html';
	});

	addListener('#main #page-locations', 'click', function(e) {
		window.location.href = '/locations/locations.html';
	});

	addListener('#main #page-purchase-order', 'click', function(e) {
		window.location.href = '/inventory/purchaseorder.html';
	});

	addListener('#main #page-files', 'click', function(e) {
		window.location.href = '/inventory/files/importexport.html';
	});
	addListener('#main #page-add-items', 'click', function(e) {
		window.location.href = '/locations/add/additems.html';
	});
	addListener('#main #page-dispatched', 'click', function(e) {
		window.location.href = '/locations/dispatch/dispatch.html';
	});
	addListener('#main #page-dispatched', 'click', function(e) {
		window.location.href = '/locations/dispatch/dispatch.html';
	});
	// addListener('#main #page-transferstock', 'click', function(e) {
	// 	window.location.href = ;
	// });
	addListener('#main #page-stockreceived', 'click', function(e) {
		window.location.href = '/locations/stockreceived/byday.html';
	});

});