import '/order-collect/js/config.js';

window.page = {
	local: window.location.hostname.startsWith('192.168')
}

if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function () {
	const urlParams = new URLSearchParams(window.location.search);
	const id = urlParams.get('id');
	let hideOrderNo = document.getElementById("hideOrderNo");
	let hideOrderContentSteps = document.getElementById("hideOrderContentSteps");
	searchOrder(id)
	return false;
});

async function searchOrder(orderNo) {
try {
		let response = await fetch(apiServer + 'user-order-status-tracking?orderNo=' + orderNo, { method: 'get' });
		let data = await response.json();
		console.log(data);
		if (data.result == "success") {
			let orderData = data.orderData;
			if (orderData.trackingId != "") {
				document.getElementById("trackingNoValue").innerHTML = orderData.trackingId;
			}
			else {
				document.getElementById("trackingNoValue").innerHTML = "-";
			}

			if (orderData.orderStatus != "") {
				let hideOrderNo = document.getElementById("hideOrderNo");
				hideOrderNo.parentNode.appendChild(hideOrderNo);
				document.getElementById("orderNoValue").innerHTML = orderData.orderNumber;
				let hideOrderContentSteps = document.getElementById("hideOrderContentSteps");
				hideOrderContentSteps.parentNode.appendChild(hideOrderContentSteps);
				if (["New Order","COLLECTED","PACKED","OVERRIDE","On the Way","Delivered"].includes(orderData.orderStatus)) {
					document.getElementById("new-order").classList.add("active");
				}
				if (["COLLECTED","PACKED","OVERRIDE","On the Way","Delivered"].includes(orderData.orderStatus)) {
					document.getElementById("collected-order").classList.add("active");
				}
				if (["PACKED","OVERRIDE","On the Way","Delivered"].includes(orderData.orderStatus)) {
					document.getElementById("packed-order").classList.add("active");
				}
				if (["On the Way","Delivered"].includes(orderData.orderStatus)) {
					document.getElementById("on-way-order").classList.add("active");
				}
				if (["Delivered"].includes(orderData.orderStatus)) {
					document.getElementById("delivered-order").classList.add("active");
				}

				
			}

		}
	} catch (e) {
		document.getElementById("errorMsg").innerHTML = "Please check internet connection";
		console.log(e);
	}

}