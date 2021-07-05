//  Discount Chemist
//  Order System Home
``
import './config.js';
// import {NotificationBar} from '/common/notification.js';
import {addListener, removeListener, checkLogin} from '/common/tools.js';

window.page = {
	type: null,
	els: {
		username: null,
	},
	//notification: new NotificationBar({positionFixed: true}),
	user: {
		id: '',
		username: '',
		password: '',
		firstname: '',
		lastname: '',
		type: '',
	},
	userToken: localStorage.getItem('usertoken') || '',
	local: window.location.hostname.startsWith('192.168'),
}

//console.log(page.local);

if (page.local) {
	apiServer = apiServerLocal;
	wsServer = wsServerLocal;
}



document.addEventListener('DOMContentLoaded', async function() {
	
		checkLogin();
	// Page type
	var pageTypeName = document.getElementById('container');
	if (pageTypeName) pageTypeName = pageTypeName.dataset.pageType;

	for (let pageType in PAGE_TYPE) {
		if (PAGE_INFO[PAGE_TYPE[pageType]].name == pageTypeName) {
			page.type = PAGE_TYPE[pageType];
			break;
		}
	}

	if (!page.type) {
		page.notification.show('Error: Invalid page type', {hide: false});
		return;
	}

	switch (page.type) {
		case PAGE_TYPE.HOME:
		case PAGE_TYPE.ORDERHOME:
			// Username
			page.els.username = document.getElementById('page-username');
			let savedUsername = localStorage.getItem('username');
			if (savedUsername) page.els.username.value = savedUsername;
			break;
	}
	
	var pageInfo = PAGE_INFO[page.type];

	// Title, header
	document.title = pageInfo.title;
	// var header = document.getElementById('header'), headerTitle = header.querySelector('.title');
	// headerTitle.textContent = pageInfo.heading || pageInfo.title;
	// if (pageInfo.position) {
		// headerTitle.classList.add(pageInfo.position);
	// }

	// Header colour
	if (window.location.hostname.startsWith('local.')) {
		document.getElementById('header').classList.add('local');
	}

	// Check user
	var loginSuccess = false;
	if (page.userToken) {
		try {
			let formData = new FormData();
			let response = await fetch(apiServer+'users/login', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
			let data = await response.json();

			if (response.ok && data.result == 'success') {
				// Save user details
				page.user = data.user;
				//page.user.firstname = data.user.firstname;

				if (data.user.type == USER_TYPE.CLIENT) {
					window.location.href = "/client/index.html";
				}
				
				let buttons = document.querySelectorAll('.page-line button');
				let userType = window.page.user.type;
				for (let btn of buttons) {
					if (USER_TYPE_INFO[userType].name == 'Supplier') {
						if (btn.dataset.userType == 'Supplier') {
							btn.classList.remove('hide');
						}
					} else {
						btn.classList.remove('hide');
					}
					
				}

				let response2 = await fetch(apiServer+'check/morelabel', {headers: {'DC-Access-Token': page.userToken}});
			    let data2 = await response2.json();
			    if (!response2.ok) {
					console.log('Error: '+data2.result);
				}

				if (data2.result == 'success') {
				//	let morelabelBtn = document.querySelector('#page-more-labels');
					// if (data2.morelabel) {
						// morelabelBtn.textContent = 'More Labels';
						// morelabelBtn.classList.remove('btn-red');
						// morelabelBtn.disabled = false;
					// } else {
						// morelabelBtn.textContent = 'No More Labels';
						// morelabelBtn.classList.add('btn-red');
						// morelabelBtn.disabled = true;
					// }
				}
					//localStorage.removeItem('username');
					//localStorage.removeItem('usertoken');
					window.location.href = '/home/index.html';
				// document.querySelector('#home #input-line').classList.add('hide');
				// document.querySelector('#record-nav-buttons #record-logout span').textContent = window.page.user.firstname;
				// document.querySelector('#record-nav-buttons #record-logout').classList.remove('hide');
				// document.querySelector('#record-nav-buttons #record-logout').addEventListener('click', function() {
					// localStorage.removeItem('username');
					// localStorage.removeItem('usertoken');
					// window.location.href = '/home/home.html';
				// });
	
			}
			else {
				console.log(data.result);
			}
		}
		catch (e) {
			console.log('Error: Could not connect to the server.');
			console.log(e);
		}
	}

	document.querySelector('#user-login').addEventListener('click', login);

	addListener('#home button[id^="page-"]', 'click', async function(e) {
		/*var username = page.els.username ? page.els.username.value.toLowerCase() : null;
		var success = false;

		if (username) {
			localStorage.removeItem('username');
			localStorage.removeItem('usertoken');

			try {
				let formData = new FormData();
				formData.append('username', username);
		
				let response = await fetch(apiServer+'users/login', {method: 'post', body: formData});
				let data = await response.json();
		
				if (!response.ok) {
					if (response.status == 404) {
						page.notification.show('The username you have entered does not exist.');
					}
					else {
						page.notification.show('Error: '+data.result);
					}
				}
		
				if (data.result == 'success') {
					// Save user ID and username
					localStorage.setItem('username', data.user.username);
					localStorage.setItem('usertoken', data.user.token);
					success = true;
				}
				else {
					page.notification.show(data.result);
				}
			}
			catch (e) {
				page.notification.show('Error: Could not connect to the server.');
			}
		}
		else {
			page.notification.show('Please enter your username first.');
		}

		if (!success) return;*/


		// Go to page
		var newPage = null;
		switch (this.id) {
			case 'page-collect':
				newPage = '/order-collect/orders.html?p=collect';
				break;
			case 'page-partial-collect':
				newPage = '/order-collect/orders.html?p=partialcollect';
				break;
			case 'page-warehouse-collect':
				newPage = '/order-collect/orders.html?p=warehousecollect';
				break;
			case 'page-pack':
				newPage = '/order-pack/index.html';
				break;
			case 'page-outofstock':
				newPage = '/order-collect/orders.html?p=stock';
				break;
			case 'page-labels':
				newPage = '/order-collect/orders.html?p=labels';
				break;
			case 'page-more-labels':
				newPage = '/order-collect/orders.html?p=morelabels';
				break;
			case 'page-refunds':
				newPage = '/order-collect/orders.html?p=refunds';
				break;
			case 'page-manage':
				newPage = '/order-collect/manage.html';
				break;
			case 'page-download':
				newPage = '/order-download/index.html';
				break;
			case 'page-label-template':
				newPage = '/label-template/index.html';
				break;
			case 'page-user-management':
				newPage = '/user-management/index.html';
				break;
			case 'page-packer-detail':
				newPage = '/packer-management/packerDetail.html';
				break;
			case 'page-daily-order':
				newPage = '/daily-order/dailyOrder.html';
				break;
			case 'page-add-order':
				newPage = '/add-order/addOrder.html';
				break;
			case 'page-add-item':
				newPage = '/add-item/addItem.html';
				break;
			case 'page-manage-item':
				newPage = '/manage-item/manageItem.html';
				break;
			case 'page-customers':
				newPage = '/customers/customers.html';
				break;
			case 'page-stock':
				newPage = '/stock/stock.html';
				break;
			case 'page-inventory-mgt':
				newPage = '/inventory/inventorymanagement.html';
				break;
			case 'page-inventory':
				newPage = '/inventory/inventory.html';
				break;
			case 'page-inventory-scan':
				newPage = '/inventory/inventoryscan.html';
				break;
			case 'page-weight':
				newPage = '/manage-weight/manageweight.html';
				break;
			case 'page-search-order':
				newPage = '/order-search/searchOrders.html';
				break;
			case 'page-ordered':
				newPage = '/order-collect/orders.html?p=ordered';
				break;
			case 'page-awaiting-list':
				newPage = '/order-collect/orders.html?p=awaitinglist';
				break;
			case 'page-rts':
				newPage = '/order-collect/orders.html?p=rts';
				break;
			case 'page-new-orders':
				newPage = '/order-collect/orders.html?p=newOrders';
				break;
			case 'page-create-order':
				newPage = '/order-create/createOrder.html';
				break;
			case 'page-generate-report':
				newPage = '/generate-reports/index.html';
				break;
			case 'page-b2b-order':
				newPage = '/order-collect/orders.html?p=b2b';
				break;
			case 'page-invoice':
				newPage = '/invoice-management/index.html';
				break;	
			case 'page-new-order-report':
				newPage = '/b2b-order/newOrder.html';
				break;	
			case 'page-packed-order-report':
				newPage = '/b2b-order/packedOrder.html';
				break;
			case 'page-orders-dashboard':
				newPage = '/dashboard/index.html';
				break;
			case 'page-deal':
				newPage = '/order-collect/orders.html?p=deal';
				break;	
		}

		if (newPage) window.location.href = newPage;
	});
});

async function login() {
	

	
	let username = document.querySelector('#page-username').value.toLowerCase();
	
	let password = document.querySelector('#page-password').value;
	

		var success = false;

		if (username && password) {
			
			localStorage.removeItem('username');
			localStorage.removeItem('password');
			localStorage.removeItem('usertoken');

			try {
				let formData = new FormData();
				formData.append('username', username);
				formData.append('password', password);
		
				let response = await fetch(apiServer+'users/login', {method: 'post', body: formData});
				let data = await response.json();
		
				if (!response.ok) {
					if (response.status == 404) {
						page.notification.show('The username you have entered does not exist or wrong password.');
					}
					else {
						page.notification.show('Error: '+data.result);
					}
				}
		
				if (data.result == 'success') {
					// Save user ID and username
					localStorage.setItem('username', data.user.username);
					localStorage.setItem('password', data.user.password);
					localStorage.setItem('usertoken', data.user.token);
					localStorage.setItem('supplier', data.user.supplier);
					localStorage.setItem('type', data.user.type);
					success = true;
					window.page.user.type = data.user.type;
					window.page.user.firstname = data.user.firstname;

					if (data.user.type == USER_TYPE.CLIENT) {
						window.location.href = "/client/index.html";
					}
				}
				else {
					alert('Error: '+data.result);
					page.notification.show(data.result);
				}
			}
			catch (e) {
				page.notification.show('Error: Could not connect to the server.');
			}
		}
		else {
			page.notification.show('Please enter your username and password first.');
		}

		if (!success) return;

		let buttons = document.querySelectorAll('.page-line button');
		let userType = window.page.user.type;
		for (let btn of buttons) {
			if (USER_TYPE_INFO[userType].name == 'Supplier') {
				if (btn.dataset.userType == 'Supplier') {
					btn.classList.remove('hide');
				}
			} else {
				btn.classList.remove('hide');
			}
			
		}
        //localStorage.removeItem('username');
			//localStorage.removeItem('usertoken');
			window.location.href = '/home/index.html';
		// document.querySelector('#home #input-line').classList.add('hide');
		// document.querySelector('#record-nav-buttons #record-logout span').textContent = window.page.user.firstname;
		// document.querySelector('#record-nav-buttons #record-logout').classList.remove('hide');
		// document.querySelector('#record-nav-buttons #record-logout').addEventListener('click', function() {
			// localStorage.removeItem('username');
			// localStorage.removeItem('usertoken');
			// window.location.href = '/home/home.html';
		// });

}
