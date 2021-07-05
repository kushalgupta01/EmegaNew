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
	local: window.location.hostname.startsWith('1'),
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

	addListener('#main #page-orders-stats', 'click', function(e) {
		window.location.href = '/dashboard/orders.html';
	});

	addListener('#main #page-packers-stats', 'click', function(e) {
		window.location.href = '/dashboard/packers.html';
	});

});