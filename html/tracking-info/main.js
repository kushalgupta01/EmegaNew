import '/order-collect/js/config.js';

window.page = {	
	local: window.location.hostname.startsWith('192.168')
}

if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {	
	let hideOrderNo = document.getElementById("hideOrderNo");
	hideOrderNo.parentNode.removeChild(hideOrderNo);
	
	let hideOrderContentSteps = document.getElementById("hideOrderContentSteps");
	hideOrderContentSteps.parentNode.removeChild(hideOrderContentSteps);	
	document.querySelector('#searchOrder').addEventListener('click', searchOrder);
	return false;
});

async function searchOrder(){
	let orderNo = document.getElementById("orderNo").value;	
	if(!orderNo){
		document.getElementById("errorMsg").innerHTML = "Order no. is required";
		return false;
	}else{
		document.getElementById("errorMsg").innerHTML = "";
	}
	
	try{
		let response = await fetch(apiServer+'user-order-status-tracking?orderNo='+orderNo, {method: 'get'});	
		let data = await response.json();
		console.log(data);
		if(data.result == "success"){
			let orderData = data.orderData;
			if(orderData.trackingId != "")
				document.getElementById("trackingNoValue").innerHTML = orderData.trackingId;
			
			if(orderData.orderStatus != ""){
				let hideOrderNo = document.getElementById("hideOrderNo");
				hideOrderNo.parentNode.appendChild(hideOrderNo);
				document.getElementById("orderNoValue").innerHTML = orderNo;
				let hideOrderContentSteps = document.getElementById("hideOrderContentSteps");
				hideOrderContentSteps.parentNode.appendChild(hideOrderContentSteps);
				if(orderData.orderStatus == "New Order"){
					document.getElementById("orderNoValue").innerHTML = orderNo;
				}else if(orderData.orderStatus == "COLLECTED"){
				
				}else if(orderData.orderStatus == "PACKED" || orderData.orderStatus == "OVERRIDE"){
				
				}
			}
			
		}
	}catch(e){
		document.getElementById("errorMsg").innerHTML = "Please check internet connection";
		console.log(e);
	}
	
}