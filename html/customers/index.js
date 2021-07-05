import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {addListener, removeListener, checkLogin} from '/common/tools.js';
//import {getItemDetails} from '../order-collect/js/item-details.js';
import '../common/stores.js'



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
	localUser: !!localStorage.getItem('local'),
	loadTime: 0,
	repeatCustomers: {}
};


if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});
	
	await loadRepeatCustomers();

	document.querySelector('#updateCustomers').addEventListener('click', updateCustomers, false);

	let  storeFilter = document.querySelector('#store-filter');

	for (let store in stores) {
		let btn = document.createElement('button');
		btn.type = 'button';
		btn.dataset.store = store;
		btn.classList.add('btn', 'btn-secondary')
		btn.textContent = stores[store];
		storeFilter.appendChild(btn);
	}

	addListener('#store-filter button', 'click', selectStore);
	addListener('#date-filter button', 'click', selectDate);

	let  customersTBody = document.querySelector('#customers-tbody');

	for (let customer of page.repeatCustomers) {
		let tr = document.createElement('tr');
		tr.dataset.id = customer.id;
		tr.dataset.store = customer.store;
		tr.dataset.customerID = customer.customerID;
		tr.dataset.fullname = customer.fullname;
		tr.dataset.address1 = customer.address1;
		tr.dataset.address2 = customer.address2;
		tr.dataset.suburb = customer.suburb;
		tr.dataset.state = customer.state;
		tr.dataset.postcode = customer.postcode;
		tr.dataset.country = customer.country;
		tr.dataset.email = customer.email;
		tr.dataset.phone = customer.phone;
		tr.dataset.orders = JSON.stringify(customer.orders);

		let cols = ['Store', 'BuyerID', 'FullName', 'Orders'];

		let td = document.createElement('td');
		let input = document.createElement('input');
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);

		for (let col of cols) {
			let td = document.createElement('td');

			td.dataset.col = col;
				
				let text = '';
				switch (col) {
					case 'Store':
						text = stores[customer.store];
						break;
					case 'BuyerID':
						text = customer.customerID;
						break;
					case 'FullName':
						text = customer.fullname;
						break;
					case 'Orders':
						//text = JSON.stringify(customer.orders);
						text = customer.orders;
						break;
					default:
						text = '';
				}

				td.textContent = text || '';
				tr.appendChild(td);
		}

		customersTBody.appendChild(tr);

	}

	addListener('#store-filter button', 'click', selectStore);
	addListener('#date-filter button', 'click', selectDate);
	

	
});

async function updateCustomers() {
	let response = await fetch(apiServer + 'updatecustomers', {headers: {'DC-Access-Token': page.userToken}});
	let data = await response.json();

	if (response.ok && data.result == 'success') {		
		page.notification.show("Customers updated successfully.");
	}
	else {
		page.notification.show(data.result);
	}
}

async function loadRepeatCustomers() {
	let formData = new FormData();
	formData.append('repeat', true);
	//formData.append('srn', true);
	let response = await fetch(apiServer + 'getcustomers', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let data = await response.json();
	console.log(data);
	page.repeatCustomers = data.data;
	document.getElementById('loading').style.display = 'none';
}

function selectStore(e) {
	let storeBtns = document.querySelectorAll('#store-filter button');
	for (let storeBtn of storeBtns) {
		storeBtn.classList.remove('btn-success');
	}
	let store = e.target.dataset.store;
	e.target.classList.add('btn-success');
	
	let trs = document.querySelectorAll('#customers-tbody tr');

	let todayBtn = document.querySelector('#today-orders');
	let isToday = todayBtn.classList.contains('btn-success') ? true : false;
	let todayDate = getTodayDate();

	for (let tr of trs) {
		tr.classList.add('hide');
		if (isToday) {
			if (tr.dataset.store == store && tr.dataset.orders.includes(todayDate)) {
				tr.classList.remove('hide');
			}
		}else{
			if (tr.dataset.store == store) {
				tr.classList.remove('hide');
			}
		}
	}
}

function selectDate(e) {
	let dateBtns = document.querySelectorAll('#date-filter button');
	for (let dateBtn of dateBtns) {
		dateBtn.classList.remove('btn-success');
	}
	
	e.target.classList.add('btn-success');
	let isToday = e.target.id == "today-orders" ? true : false;
	
	let todayDate = getTodayDate();

	let storeBtns = document.querySelectorAll('#store-filter button');

	let store = 0;

	for (let storeBtn of storeBtns) {
		if (storeBtn.classList.contains('btn-success')) {
			store = storeBtn.dataset.store;
		}
	}

	let trs = document.querySelectorAll('#customers-tbody tr');
	for (let tr of trs) {
		tr.classList.add('hide');
		if (isToday) {
			//console.log(tr.dataset.orders);
			if ((tr.dataset.orders).includes(todayDate) && (tr.dataset.store == store || store == 0)) {
				tr.classList.remove('hide');
			}
		}else{
			if (tr.dataset.store == store || store == 0) {
				tr.classList.remove('hide');
			}
			
		}
		
	}

}

function getTodayDate() {
	let today = new Date();
	let Mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	let todayDate = (today.getDate() < 10 ? '0'+ today.getDate() : today.getDate()) + '-' + Mon[today.getMonth()] + '-' + (today.getFullYear()-2000);
	return todayDate;
}