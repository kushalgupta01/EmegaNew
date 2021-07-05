import '../order-collect/js/config.js';

if (window.location.hostname.startsWith('192.168')) {
	apiServer = apiServerLocal;
}

window.page = {
	user: {
		id: '',
		username: '',
		password: '',
		firstname: '',
		lastname: '',
		type: '',
	},
	userToken: localStorage.getItem('usertoken') || '',
}

//console.log(apiServer);
document.addEventListener('DOMContentLoaded', async function() {
	document.querySelector('.login_frm button').addEventListener('click', login);
	return false;
});

async function login() {
	let username = document.querySelector('#username').value;
	let password = document.querySelector('#password').value;
	
	disableError();
	
	try {
		let formData = new FormData();
		formData.append('username', username);
		formData.append('password', password);

		let response = await fetch(apiServer+'login', {method: 'post', body: formData});
		let data = await response.json();
		

		if (data.result == 'success') {
			if (data.usertoken) {
				localStorage.setItem("mainToken", data.token);
				localStorage.setItem("usertoken", data.usertoken);
				localStorage.setItem('username', data.user.username);
				if(data.user.type == USER_TYPE.CLIENT)
					window.location.href = "/client/index.html";
				else
					window.location.href = "/home/index.html";
			}
		}else{
			showError(data.result);
		}
	}
	catch (e) {
		showError('Error: Could not connect to the server.');
		console.log(e);
	}
}

function showError(errorMessage) {
	var errorDiv = document.querySelector('.erros_mes');
	errorDiv.classList.add("active");
	errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i>' + errorMessage;
}
function disableError() {
	var errorDiv = document.querySelector('.erros_mes');
	errorDiv.classList.remove("active");
	errorDiv.innerHTML = '';
}