const {Config} = require('./config');
const request = require('request');
const rp = require('request-promise');

const autoAcceptCatchOrders = async function() {
	let orderData = [];
	let acceptData = [];

	let options = {
		url: Config.catchAPI.url + '/api/orders?' +
		  'paginate=false' +
		  '&order_state_codes=WAITING_ACCEPTANCE' +
		  '&sort=dateCreated' +
		  '&order=asc'
		,
		headers: {
		  'Content-Type': 'application/json',
		  'Authorization': Config.catchAPI.token,
		}
	};
	
	function callback(error, response, body) {
		const data = JSON.parse(body);
		return data.items;
	}

	function getOrders(options) {
		return rp(options).then(body => {
			const data = JSON.parse(body);
			var orders = data.orders ? data.orders : [];

			return orders;
		})
	}

	orderData = await getOrders(options);
	for (let order of orderData) {
		const orderId = order.order_id;

		let data = {
			"order_lines": []
		};

		//Process accept order lines
		for(let orderLine of order.order_lines) {
			const orderLineId = orderLine.order_line_id;
			data.order_lines.push({
				"id": orderLineId,
				"accepted": true
			})
		}
		
		options = {
			url: Config.catchAPI.url + '/api/orders/' + orderId + '/accept',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': Config.catchAPI.token,
			},
			body: JSON.stringify(data),
		};

		acceptData.push(request.put(options));
	}

	await Promise.all(acceptData);
}

module.exports = autoAcceptCatchOrders;