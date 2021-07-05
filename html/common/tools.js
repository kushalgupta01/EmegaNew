// Tools

export function base64ToBlob(base64, mime) {
	mime = mime || '';
	var sliceSize = 1024;
	var byteChars = window.atob(base64), byteArrays = [];

	for (var offset = 0, len = byteChars.length; offset < len; offset += sliceSize) {
		var slice = byteChars.slice(offset, offset + sliceSize);
		var byteNumbers = new Array(slice.length);

		for (var i = 0; i < slice.length; i++) {
			byteNumbers[i] = slice.charCodeAt(i);
		}
		byteArrays.push(new Uint8Array(byteNumbers));
	}
	return new Blob(byteArrays, {type: mime});
}

export function copyToClipboard(text = '') {
	if (!text) return false;
	let textarea = document.createElement('textarea');
	textarea.style.border = 'none';
	textarea.style.outline = 'none';
	textarea.style.boxShadow = 'none';
	textarea.style.background = 'transparent';
	textarea.value = text;
	document.body.appendChild(textarea);
	textarea.select();
	document.execCommand('copy');
	document.body.removeChild(textarea);
	return true;
}

export function getCaretPosition(el) {
	var range = window.getSelection().getRangeAt(0);
	var preCaretRange = range.cloneRange();
	preCaretRange.selectNodeContents(el);
	preCaretRange.setEnd(range.endContainer, range.endOffset);
	return preCaretRange.toString().length;
}

export function getDateValue(date, time = false, timezone = false) {
	return date.getFullYear().toString()+('00'+(date.getMonth()+1)).slice(-2)+('00'+date.getDate()).slice(-2) + (time ? '-'+('00'+date.getHours()).slice(-2)+('00'+date.getMinutes()).slice(-2)+('00'+date.getSeconds()).slice(-2) : '') + (timezone ? date.getTimezoneOffset() : '');
}

export async function getFont(filename) {
	try {
		return await (await fetch(filename)).arrayBuffer();
	}
	catch (e) {
		return null;
	}

	/*try {
		let blob = await (await fetch(filename)).blob();
		return (await new Promise((resolve, reject) => {
			var reader = new FileReader();
			reader.onerror = reject;
			reader.onload = () => {
				resolve(reader.result);
			}
			reader.readAsDataURL(blob);
		})).split(',')[1];
	}
	catch (e) {
		return false;
	}*/
}

export function getQueryValue(q) {
	var qs = window.location.search.substring(1).split('&');
	for (let i = 0; i < qs.length; i++) {
		let p = qs[i].split('=');
		if (p[0] == q) return p[1];
	}
	return null;
}

export function hasKey(obj, keys) {
	for (let key in keys) {
		if (!keys.hasOwnProperty(key)) continue;
		if (obj.hasOwnProperty(key)) return true;
	}
	return false;
}

// Check if all search values are present in a string
export function includesAll(str, values) {
	if (typeof str !== 'string') str = str.toString();
	if (typeof values === 'string') {
		values = [values];
	}
	for (let value of values) {
		if (!str.includes(value)) {
			return false;
		}
	}
	return true;
}

export function round2(num) {
	return (+(Math.round(num + 'e+2') + 'e-2')).toFixed(2).toString();
}

// Select element content
export function selectElement(el) {
	if (el.textContent.length) {
		setTimeout(() => {
			let s = window.getSelection(), r = document.createRange();
			r.selectNodeContents(el);
			s.removeAllRanges();
			s.addRange(r);
		}, 0);
	}
	else {
		el.focus();
	}
}

// Select text
export function selectText() {
	window.getSelection().selectAllChildren(this);
}

export function usernamePart(s) {
	return s.substr(0, 3);
}

export function weightedRandom(data) {
	var entry, sum = 0, r = Math.random();
	for (entry of data) {
		sum += parseFloat(entry[0]);
		if (r <= sum) return entry[1];
	}
	return null;
}


export function addListener(els, events, func) {
	var reSpace = /\s+/;
	els = document.querySelectorAll(els);
	events = events.split(reSpace);
	for (let el of els) {
		for (let event of events) {
			el.addEventListener(event, func);
		}
	}
}

export function removeListener(els, events, func) {
	var reSpace = /\s+/;
	els = document.querySelectorAll(els);
	events = events.split(reSpace);
	for (let el of els) {
		for (let event of events) {
			el.removeEventListener(event, func);
		}
	}
}

export function getTodayDate() {
	let today = new Date();
	let Mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	let todayDate = (today.getDate() < 10 ? '0'+ today.getDate() : today.getDate()) + '-' + Mon[today.getMonth()] + '-' + (today.getFullYear()-2000);
	return todayDate;
}

export async function checkLogin() {	
	let userToken = localStorage.getItem('usertoken');
	let userName = localStorage.getItem('username');
	if(!userToken)
		window.location.href = '/login.html';	
		
	let formData = new FormData();
	formData.append('token', userToken);
	formData.append('username', userName);

	let response = await fetch(apiServer+'login', {method: 'post', body: formData});
	let data = await response.json();

	if (!response.ok || data.result != 'success') {
		window.location.href = '/login.html';
	}
}
