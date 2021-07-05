// Discount Chemist
// Order System

import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {getCaretPosition, addListener, removeListener, checkLogin} from '/common/tools.js';

window.page = {
	configData: '',
	configLoaded: false,
	els: {},
	notification: new NotificationBar(),
	password: '',
	selectedPanel: null,
	usersLoaded: false,
	local: window.location.hostname.startsWith('192.168'),
}
window.userTypes = null;
window.suppliers = null;

if (page.local) {
	apiServer = apiServerLocal;
}


document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	page.els.menuList = document.querySelector('#menu-list ul');
	page.els.mainPassword = document.getElementById('content-main-password');
	page.els.mainLogin = document.getElementById('content-main-login');
	//page.els.userHeaderDiv = document.getElementById('content-user-header');
	//page.els.actionButtons = document.getElementById('content-users-actions');
	page.els.addRow = document.getElementById('content-add-row');
	page.els.refresh = document.getElementById('content-refresh');

	page.els.usersSave = document.getElementById('content-users-save');
	page.els.usersRemove = document.getElementById('content-users-remove');
	page.els.usersRemoveConfirm = document.getElementById('box-users-remove-confirm');
	page.els.usersRemoveCancel = document.getElementById('box-users-remove-cancel');
	page.els.usersReset = document.getElementById('content-users-reset');

	page.els.configText = document.getElementById('content-config-text');
	page.els.configSave = document.getElementById('content-config-save');
	page.els.configReset = document.getElementById('content-config-reset');
	page.els.configRefresh = document.getElementById('content-config-refresh');

	// Header colour
	if (page.local) {
		document.getElementById('header').classList.add('local');
	}

	// Show main panel
	showPanel();

	// Menu list
	addListener('#menu-list li', 'click', function(e) {
		e.preventDefault();
		showPanel({id: this.dataset.panel});

		if (this.dataset.panel == 'content-config' && !page.configLoaded) {
			loadConfig();
		}
	});

	// Back to Menu
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});


	// Login
	page.els.mainLogin.addEventListener('click', login);

	// Load user list
	page.els.refresh.addEventListener('click', loadUsers);
	page.els.usersReset.addEventListener('click', loadUsers);

	// Add new user row
	page.els.addRow.addEventListener('click', () => addTableRows());

	// Save users
	page.els.usersSave.addEventListener('click', saveUsers);

	// Remove user
	page.els.usersRemove.addEventListener('click', removeUser);
	page.els.usersRemoveConfirm.addEventListener('click', removeUserConfirm);
	page.els.usersRemoveCancel.addEventListener('click', closeBox);

	// Ability to press enter to get the order
	page.els.mainPassword.addEventListener('keyup', function(e) {
		if (e.key == 'Enter' || e.key == '↵') {
			login();
		}
	});


	// Configuration
	page.els.configSave.addEventListener('click', saveConfig);
	page.els.configReset.addEventListener('click', resetConfig);
	page.els.configRefresh.addEventListener('click', loadConfig);


	// Close popup box
	addListener('#box-container .close', 'click', closeBox);

	// Don't close the popup box when it's clicked
	/*addListener('#box-container > div', 'click mousedown', function(e) {
		e.stopPropagation();
	});*/
});


// Login and load user list
async function login() {
	if (!page.els.mainPassword.value) return;
	page.password = page.els.mainPassword.value;
	showPanel({id: 'content-users'});
	loadUsers();
}


// Load order data from the server
async function loadUsers() {
	page.els.usersSave.disabled = true;
	page.els.usersReset.disabled = true;
	page.els.refresh.disabled = true;

	try {
		do {
			let response = await fetch(apiServer+'users/get?pw='+page.password);
			let data = await response.json();

			if (!response.ok) {
				page.notification.show('Error: '+data.result);
				break;
			}
			else if (data.result != 'success' && !data.hasOwnProperty('users')) {
				page.notification.show(data.result);
				break;
			}


			let tableBody = document.querySelector('.content-page:not(.hide) table tbody');
			page.usersLoaded = true;

			// Remove all entries from table
			while (tableBody.firstChild) {
				tableBody.removeChild(tableBody.firstChild);
			}

			if (!data.users || !data.users.length) {
				let tr = document.createElement('tr'), td = document.createElement('td');
				tr.dataset.defaultrow = 'true';
				td.colSpan = 5;
				td.className = 'centre';
				td.textContent = 'No users';
				tr.appendChild(td);
				tableBody.appendChild(tr);
				break;
			}

			// Add users to table
			addTableRows(data.users);
		} while(0)
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.usersSave.disabled = false;
	page.els.usersReset.disabled = false;
	page.els.refresh.disabled = false;
}


// Add rows to table
function addTableRows(data = null) {
	var table = document.querySelector('#content-container .content-page:not(.hide) table');
	if (!table) return;
	var tableBody = table.querySelector('tbody');
	var defaultRow = tableBody.querySelector('tr[data-defaultrow]');

	// Remove default row if present
	if (defaultRow) {
		defaultRow.parentNode.removeChild(defaultRow);
	}

	if (data) {
		// Add each data row
		let tableHeader = table.querySelector('thead');

		for (let row of data) {
			let tr = document.createElement('tr'), td = document.createElement('td');
			tr.dataset.id = row.id;
			td.className = 'selected';
			td.appendChild(createCheckbox());
			tr.appendChild(td);
			for (let rowCol in row) {
				let th = tableHeader.querySelector('[data-col="'+rowCol+'"]');
				if (!th) continue;
				let td = document.createElement('td');
				td.dataset.col = th.dataset.col;
				if (th.dataset.class) td.className = th.dataset.class;
				if (th.dataset.editable) td.contentEditable = true;
				
				if (row[rowCol]) {
					if (th.dataset.col == 'type') {
						td.appendChild(createUserTypeSelect(row[rowCol]));
					}
					else if (th.dataset.col == 'supplier') {
						td.appendChild(createSupplierSelect(row[rowCol]));
					}
					else {
						td.textContent = row[rowCol];
					}
				}
				tr.appendChild(td);
			}
			tableBody.appendChild(tr);
		}
	}
	else {
		// Add empty row
		let tableHeaderTh = table.querySelectorAll('thead th');

		for (let r_i = 0; r_i < 1; r_i++) {
			let tr = document.createElement('tr'), td = document.createElement('td');
			tr.dataset.changed = 1;
			td.className = 'selected';
			td.appendChild(createCheckbox());
			tr.appendChild(td);

			for (let th_i = 1; th_i < tableHeaderTh.length; th_i++) {
				let td = document.createElement('td');
				if (tableHeaderTh[th_i].dataset.col) td.dataset.col = tableHeaderTh[th_i].dataset.col;
				if (tableHeaderTh[th_i].dataset.class) td.className = tableHeaderTh[th_i].dataset.class;
				if (tableHeaderTh[th_i].dataset.editable) td.contentEditable = true;

				if (tableHeaderTh[th_i].dataset.col == 'type') {
					td.appendChild(createUserTypeSelect());
				}
				if (tableHeaderTh[th_i].dataset.col == 'supplier') {
					td.appendChild(createSupplierSelect());
				}
				tr.appendChild(td);
			}
			tableBody.appendChild(tr);
		}
	}

	updateListeners();
}

function createCheckbox() {
	var checkbox = document.createElement('input');
	checkbox.type = 'checkbox';
	checkbox.setAttribute('autocomplete', 'off');
	return checkbox;
}

function createUserTypeSelect(selected = null) {
	// Get user types
	if (!userTypes) {
		userTypes = [];
		for (let userType in USER_TYPE_INFO) {
			userTypes.push([USER_TYPE_INFO[userType].name, userType, USER_TYPE_INFO[userType].default || false]);
		}
		userTypes.sort(function(a,b){return a[0] > b[0]});
	}

	var select = document.createElement('select');
	var selectedSet = false;

	for (let userType of userTypes) {
		let option = document.createElement('option');
		option.textContent = userType[0];
		option.value = userType[1];
		if (userType[1] == selected || (!selectedSet && userType[2])) {
			option.selected = 'selected';
			selectedSet = true;
		}
		select.appendChild(option);
	}
	return select;
}

function createSupplierSelect(selected = null) {
	// Get user types
	if (!suppliers) {
		suppliers = [];
		for (let supplier in SUPPLIER_INFO) {
			suppliers.push([SUPPLIER_INFO[supplier].name, supplier, SUPPLIER_INFO[supplier].default || false]);
		}
		suppliers.sort(function(a,b){return a[0] > b[0]});
	}

	var select = document.createElement('select');
	var selectedSet = false;

	for (let supplier of suppliers) {
		let option = document.createElement('option');
		option.textContent = supplier[0];
		option.value = supplier[1];
		if (supplier[1] == selected || (!selectedSet && supplier[2])) {
			option.selected = 'selected';
			selectedSet = true;
		}
		select.appendChild(option);
	}
	return select;
}


// Save user changes to the database
async function saveUsers() {
	var userData = [];
	var trs = document.querySelectorAll('.content-page:not(.hide) table tbody tr[data-changed]');
	var cols = ['username', 'password', 'firstname', 'lastname', 'type', 'supplier'];

	for (let tr of trs) {
		let userEntry = {};
		if (tr.dataset.id) userEntry.id = tr.dataset.id;

		for (let col of cols) {
			if (col == 'type') {
				userEntry[col] = tr.querySelector('td[data-col="'+col+'"] select').value;
			}
			else if (col == 'supplier') {
				userEntry[col] = tr.querySelector('td[data-col="'+col+'"] select').value;
			}
			else {
				userEntry[col] = tr.querySelector('td[data-col="'+col+'"]').textContent;
			}
		}

		if (!userEntry.username || !userEntry.firstname) {
			page.notification.show('Every user must have a username and a first name.');
			return;
		}

		userData.push(userEntry);
	}

	if (!userData.length) {
		page.notification.show('No users have been changed.');
		return;
	}


	page.els.usersSave.disabled = true;
	page.els.usersReset.disabled = true;
	page.els.refresh.disabled = true;

	try {
		let formData = new FormData();
		formData.append('users', JSON.stringify(userData));
		formData.append('pw', page.password);

		let response = await fetch(apiServer+'users/save', {method: 'post', body: formData});
		let data = await response.json();

		if (response.ok && data.result == 'success') {
			page.notification.show('Changes to the users have been saved into the database.', {background: 'bg-lgreen'});
			loadUsers();
		}
		else if (!response.ok) {
			page.notification.show('Error: '+data.result);
		}
		else {
			page.notification.show(data.result);
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.usersSave.disabled = false;
	page.els.usersReset.disabled = false;
	page.els.refresh.disabled = false;
}


// Select order
function selectOrder(e) {
	if (e.target.tagName.toLowerCase() == 'input') return;
	e.target.firstChild.checked = !e.target.firstChild.checked;
}


// Update listeners
function updateListeners() {
	// Order select/de-select changes
	var orderTdSelected = '.content-page:not(.hide) table tbody td.selected';
	removeListener(orderTdSelected, 'click', selectOrder);
	addListener(orderTdSelected, 'click', selectOrder);

	// Listen for when an entry is changed
	let orderTr = '.content-page:not(.hide) table tbody tr';
	removeListener(orderTr, 'input change', rowChanged);
	addListener(orderTr, 'input change', rowChanged);

	// Colour rows
	colourRows(document.querySelector('#content-container .content-page:not(.hide) table tbody'));

	// Move between cells
	var orderTd = '.content-page:not(.hide) table tbody td';
	removeListener(orderTd, 'keypress', changeCurrentCell);
	addListener(orderTd, 'keypress', changeCurrentCell);
}


// Mark row as changed
function rowChanged(e) {
	if (e.target.innerHTML == '<br>') e.target.textContent = ''; // Remove empty line if needed
	if (e.target.parentNode.classList.contains('selected')) return;
	e.target.closest('tr').dataset.changed = 1;
}

// Colour rows
function colourRows(tableBody) {
	var trs = tableBody.querySelectorAll('tr:not(.hide)');
	var coloured = false;

	for (let tr of trs) {
		tr.classList[coloured ? 'add' : 'remove']('colour');
		if (!tr.classList.contains('msg1')) coloured = !coloured;
	}
}

// Move between table cells using arrow buttons
function changeCurrentCell(e) {
	var td = e.target;
	var sibling = null;
	var caretPosition = getCaretPosition(td);

	switch (e.key) {
		case 'ArrowLeft':
			if (caretPosition == 0) sibling = previousVisibleSibling(td, true);
			break;
		case 'ArrowRight':
			if (caretPosition == td.textContent.length) sibling = nextVisibleSibling(td, true);
			break;
		case 'ArrowUp':
			let previousRow = previousVisibleSibling(td.parentNode);
			if (previousRow) sibling = previousRow.children[td.cellIndex];
			break;
		case 'ArrowDown':
			let nextRow = nextVisibleSibling(td.parentNode);
			if (nextRow) sibling = nextRow.children[td.cellIndex];
			break;
	}

	if (sibling) selectElement(sibling);
}

function previousVisibleSibling(el, editable = false) {
	while (el.previousElementSibling) {
		if (!el.previousElementSibling.classList.contains('hide') && (!editable || el.previousElementSibling.isContentEditable)) {
			return el.previousElementSibling;
		}
		el = el.previousElementSibling;
	}
	return null;
}
function nextVisibleSibling(el, editable = false) {
	while (el.nextElementSibling) {
		if (!el.nextElementSibling.classList.contains('hide') && (!editable || el.nextElementSibling.isContentEditable)) {
			return el.nextElementSibling;
		}
		el = el.nextElementSibling;
	}
	return null;
}


// Show confirmation box for removing a user
function removeUser() {
	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('box-users-remove').classList.remove('hide');
}

// Remove orders
async function removeUserConfirm() {
	closeBox();

	var tableBody = document.querySelector('#content-container .content-page:not(.hide) tbody');
	var tableBodyTrs = tableBody.querySelectorAll('tr');
	var selectedRows = [];
	var selectedRow = null;

	for (let tr of tableBodyTrs) {
		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput && selectedInput.checked) {
			selectedRows.push(tr);
		}
	}

	if (!selectedRows.length) {
		page.notification.show('No users selected.');
		return;
	}
	else if (selectedRows.length != 1) {
		page.notification.show('Only one user can be removed at a time.');
		return;
	}

	selectedRow = selectedRows[0];


	if (selectedRow.dataset.id) {
		// Remove user from database
		let selectedRowIDs = [selectedRow.dataset.id];
		/*for (let tr of selectedRows) {
			selectedRowIDs.push(tr.dataset.id);
		}*/

		page.els.usersRemove.disabled = true;

		try {
			let formData = new FormData();
			formData.append('users', JSON.stringify(selectedRowIDs));
			formData.append('pw', page.password);

			let response = await fetch(apiServer+'users/remove', {method: 'delete', body: formData});
			let data = await response.json();

			if (!response.ok) {
				if (data.result) {
					page.notification.show('Error: '+data.result);
				}
				else {
					page.notification.show('Error: The selected user could not be removed.');
				}
			}

			if (data.result == 'success') {
				page.notification.show('The selected user has been removed.', {background: 'bg-lgreen'});
				loadUsers(); // Refresh users
			}
			else {
				page.notification.show(data.result);
			}
		}
		catch (e) {
			page.notification.show('Error: Could not connect to the server.');
		}

		page.els.usersRemove.disabled = false;
	}
	else {
		// Remove row
		tableBody.removeChild(selectedRow);
	}

	updateListeners();
}


// Load config data from the server
async function loadConfig() {
	page.els.configSave.disabled = true;
	page.els.configReset.disabled = true;
	page.els.configRefresh.disabled = true;

	try {
		do {
			let response = await fetch(apiServer+'config/get?pw='+page.password);
			let data = await response.json();

			if (!response.ok) {
				page.notification.show('Error: '+data.result);
				break;
			}
			else if (data.result != 'success' && !data.hasOwnProperty('users')) {
				page.notification.show(data.result);
				break;
			}

			try {
				let content = JSON.parse(data.content);
				page.els.configText.value = content;
				page.configData = content;
			}
			catch (e) {
				page.notification.show('Error: Could not process configuration file.');
			}
		} while(0)
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.configSave.disabled = false;
	page.els.configReset.disabled = false;
	page.els.configRefresh.disabled = false;
}

// Save config data in the server
async function saveConfig() {
	if (!page.els.configText.value) {
		page.notification.show('Configuration file cannot be empty.');
		return;
	}

	page.els.configSave.disabled = true;
	page.els.configReset.disabled = true;
	page.els.configRefresh.disabled = true;

	try {
		let formData = new FormData();
		formData.append('config', page.els.configText.value);
		formData.append('pw', page.password);

		let response = await fetch(apiServer+'config/save', {method: 'post', body: formData});
		let data = await response.json();

		if (response.ok && data.result == 'success') {
			page.notification.show('Configuration data has been saved.', {background: 'bg-lgreen'});
		}
		else if (!response.ok) {
			page.notification.show('Error: '+data.result);
		}
		else {
			page.notification.show(data.result);
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.configSave.disabled = false;
	page.els.configReset.disabled = false;
	page.els.configRefresh.disabled = false;
}

function resetConfig() {
	if (page.configData) page.els.configText.value = page.configData;
}


function showPanel(data = {}) {
	var menuListUl = document.querySelector('#menu-list ul');
	var tabId = data.id;

	// Select menu item
	var menuItem = tabId ? menuListUl.querySelector('li[data-panel="'+tabId+'"]') : menuListUl.children[0];
	if (!tabId) tabId = menuItem.dataset.panel;
	if (!tabId) return;

	var selected = menuListUl.querySelector('.selected');
	if (selected) selected.classList.remove('selected');
	menuItem.classList.add('selected');

	// Show panel
	var contentPanels = document.querySelectorAll('#content-container > .content-page');
	for (var i = 0; i < contentPanels.length; ++i) {
		contentPanels[i].classList.add('hide');
	}

	document.getElementById(tabId).classList.remove('hide');

	// Set selected panel
	page.selectedPanel = tabId;

	/*var action = (!page.selectedPanel || page.selectedPanel == 'content-main') ? 'add' : 'remove';
	page.els.userHeaderDiv.classList[action]('hide');
	page.els.actionButtons.classList[action]('hide');*/
}

// Close popup box
function closeBox() {
	document.getElementById('box-outer').classList.remove('flex');
	var divs = document.querySelectorAll('#box-container > div:not(.close)');
	for (let div of divs) {
		div.classList.add('hide');
	}
}
