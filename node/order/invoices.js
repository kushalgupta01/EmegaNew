const {Config} = require('./config');
const Database = require('./connection');
const { getConversionData } = require('./order-convert');
const { userCheckToken } = require('./users-token');
const rp = require('request-promise');
var _ = require('lodash');
const xlsx = require('xlsx');
const fs = require('fs');
const mailjet = require('node-mailjet');

const EXPORT_DIR =  __dirname + '/exportfiles';

const MAILJET_CONFIG = {
	From: {
		Email: 'tuyencaovn@gmail.com',
		Name: 'Tuyen'
	},
	Auth: {
		Username: 'f7e2d28a64b9326ac86102d33c98e97e',
		Password: 'a8efc3ad03e00e8d19e5be282ed51157'
	}
};

const AUSPOST_API_PARAMS = {
	URL: 'https://digitalapi.auspost.com.au/shipping/v1/prices/shipments',
	USERNAME: '8106e0df-2531-4b37-8e51-2a0581c70734',
	PASSWORD: 'x759932b6881406d77cf',
	ACCOUNT_NUMBER: '0008515116'
};

const PRICE_DELTA = 0.2;

const HANDLING_COST = 1.5;
const PAYPAL_TRANSACTION_FEE = 0.3;
const PAYPAL_FEE = 0.021;
const EBAY_FEE =  0.095;
const SERVICE_FEE = 0.15;

const DEFAULT_COST_WEIGHT = [
	{min: 0, max: 1, cost: 5.9},
	{min: 1, max: 3, cost: 8.9},
	{min: 3, max: 6, cost: 12.9},
	{min: 6, max: 10, cost: 15.9},
	{min: 10, max: 20, cost: 19.9}
];

function isEbayStore(store) {
	return ([1, 15, 4, 6, 8, 9].indexOf(parseInt(store)) >= 0);
}

function getShorthandState(state) {
	const statesShorter = {
		"NEW SOUTH WALES": "NSW",
		"QUEENSLAND": "QLD",
		"SOUTH AUSTRALIA": "SA",
		"TASMANIA": "TAS",
		"VICTORIA": "VIC",
		"WESTERN AUSTRALIA": "WA",
		"AUSTRALIAN CAPITAL TERRITORY": "ACT",
		"NORTHERN TERRITORY": "NT"
	}
	return statesShorter.hasOwnProperty(state.toUpperCase()) ? statesShorter[state.toUpperCase()] : state.toUpperCase();
}

function getPostageProductId(postageId) {
	const postage_products = [
		{
			type: "INTL ECONOMY W SOD/ REGD POST",
			product_id: "RPI8",
		},
		{
			type: "INTL STANDARD/PACK & TRACK",
			product_id: "PTI8",
		},
		{
			id: 4,
			type: "INT'L STANDARD WITH SIGNATURE",
			product_id: "PTI7",
		},
		{
			type: "INTL EXPRESS MERCH/ECI MERCH",
			product_id: "ECM8",
		},
		{
			type: "INTL EXPRESS DOCS/ECI DOCS",
			product_id: "ECD8",
		},
		{
			type: "INTL ECONOMY/AIRMAIL PARCELS",
			product_id: "AIR8",
		},
		{
			id: 5,
			type: "EXPRESS POST",
			product_id: "3J83",
		},
		{
			id: 2,
			type: "PARCEL POST",
			product_id: "3D83",
		},
		{
			type: "EXPRESS EPARCEL POST RETURNS",
			product_id: "XPR",
		},
		{
			type: "EPARCEL POST RETURNS",
			product_id: "PR",
		}
	];

	let postage_product = postage_products.find(p => p.id === postageId);

	return postage_product ? postage_product.product_id : null;
}

async function getEstAusPostPrice(country, state, suburb, postcode, type, weight) {
	const length = 10;
	const width = 10;
	const height = 10;

	let product_id = getPostageProductId(type);

	if (_.isNil(product_id)) {
		return null;
	}

	// get from store window.storeAddress 
	const fromAddress = {
		suburb: 'ENFIELD',
		state: 'NSW',
		postcode: '2136',
	};

	const toAddress = {
		country,
		suburb,
		state,
		postcode,
	};

	const items = [{
		product_id,
		length,
		height,
		width,
		weight,
	}];

	const body = {
		shipments: [
			{
				from: fromAddress,
				to: toAddress,
				items: items
			}
		]
	}
	try {
		let params = {
			url: AUSPOST_API_PARAMS.URL,
			method: 'post',
			headers: {
				'Content-Type': 'application/json',
				'account-number': AUSPOST_API_PARAMS.ACCOUNT_NUMBER
			},
			'auth': {
				'user': AUSPOST_API_PARAMS.USERNAME,
				'pass': AUSPOST_API_PARAMS.PASSWORD
			},
			body: JSON.stringify(body),
		};

		const result = await rp(params);
		const { shipments } = JSON.parse(result);
		const { shipment_summary } = shipments[0];

		return shipment_summary ? shipment_summary.total_cost : null;

	} catch (error) {
		// console.log(error);
		console.log({ state, suburb, postcode, type, weight});
		return null;
	}
}

function getBaseShippingCost(costweights, weight) {
	if (weight <= 0) {
		return -1;
	}

	weight = parseFloat(weight);

	let costweight = costweights.find(cw => cw.min < weight && weight <= cw.max);

	if (costweight) {
		return costweight.cost;
	}

	return -2;// undefined
}

async function getShippingCost(storeCostWeights, order, postalPurchases = []) {
	let costweights = null;
	let storeCostWeight = storeCostWeights.find(scw => scw.store == order.store);

	if (storeCostWeight) {
		costweights = storeCostWeight.costweights;
	} else {
		costweights = DEFAULT_COST_WEIGHT;
	}

	let shippingCost = getBaseShippingCost(costweights, order.weight);

	if ((shippingCost > -1) && usedAusPost(order.trackingNumber)) {
		let actualCost = 0;
		let estimatedCost = 0;

		let postalPurchase = postalPurchases.find(pp => pp.consignmentNo == order.trackingNumber /*&& pp.totalWeight == order.weight*/);

		if (postalPurchase) {
			actualCost = postalPurchase.actualChargeInGST;
			estimatedCost = postalPurchase.expectedChargeInGST;
		} else {
			let estAusPostPrice = await getEstAusPostPrice(order.country, order.state, order.city, order.postcode, order.type, order.weight);
			
			if (estAusPostPrice === null) {
				return -3;
			}

			estimatedCost = estAusPostPrice ? estAusPostPrice : estimatedCost
		}

		shippingCost = shippingCost > estimatedCost ? shippingCost : (estimatedCost + estimatedCost * PRICE_DELTA);
		shippingCost = shippingCost > actualCost ? shippingCost : (actualCost + actualCost * PRICE_DELTA);

		shippingCost = parseFloat(shippingCost.toFixed(2));
	}

	return shippingCost;
}

function getFormattedOrder(order) {
	order.trackingID = JSON.parse(order.trackingID);
	order.items = JSON.parse(order.items);
	order.country = order.country.replace(/"/g, "").trim();
	order.state = order.state.replace(/"/g, "").trim();

	if (order.country === 'AU') {
		order.state = getShorthandState(order.state);
	}
	
	order.city = order.city.replace(/"/g, "").trim();
	order.postcode = order.postcode.replace(/"/g, "").trim();

	return order;
}

function usedAusPost(trackingNumber) {
	return !!(
				trackingNumber 
				&& ( (trackingNumber.indexOf("33VY") === 0) || (trackingNumber.indexOf("CH11") === 0) )
			);
}

function readImportFileNames() {
	let importFileName = "importAusPostLogs.txt";
	try {
		let fileNames = "";
		fileNames = fs.readFileSync(importFileName, "utf-8");
		return fileNames.split('\n');
	} catch (error) { 
		return [];
	}
}

function writeImportFileNames(fileName) {
	let importFileName = "importAusPostLogs.txt";

	let fileNames = readImportFileNames();

	if (fileNames.indexOf(fileName) === -1)  {
		fileNames = [fileName, ...fileNames];
	}

	fs.writeFileSync(importFileName, fileNames.join('\n'));
}

async function listAusPostLogs(req, res, next) {
	let importFileNames = [];
	importFileNames = readImportFileNames();

	let output = {};

	httpStatus = 200;
	output.result = 'success';
	output.FiileNames = importFileNames;

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

function getOrderWeightByItems(order, convertData, itemDetails, itemSkuDetails) {
	let orderWeight = 0;

	for (let item of order.items) {
		let weight = 0;

		let itemNo = item[convertData.ItemData.ItemID];
		let sku = item[convertData.ItemData.SKU];
		let quantity = item[convertData.ItemData.Quantity];

		if (order.store == 8 || order.store == 71) {
			if (itemSkuDetails[sku]) {
				let itemDetail = itemSkuDetails[sku][0];
				weight = parseFloat(itemDetail.itemWeight);
			}
		}
		else if (order.store == 30) {
			if (itemDetails[itemNo]) {
				for (let itemDetail of itemDetails[itemNo]) {
					if (itemDetail.sku == sku) {
						weight = parseFloat(itemDetail.itemWeight) == 0 ? item['weight'] : parseFloat(itemDetail.itemWeight);
					}
				}

			}
		} else {
			if (itemDetails[itemNo]) {
				for (let itemDetail of itemDetails[itemNo]) {
					if (itemDetail.sku == sku) {
						weight = parseFloat(itemDetail.itemWeight);
					}
				}

			}
		}

		// console.log('getOrderWeightByItems - weight: ', weight, ', quantity: ', quantity, ', sku: ', sku);

		orderWeight = orderWeight + parseFloat(weight) * parseInt(quantity);
	}

	// console.log('getOrderWeightByItems - ', order.id, ', weight: ', orderWeight);
	return orderWeight;
}

function getNormalizeStr(str) {
	if (typeof str != 'string') return str;
	return str && str.replace(/\t/g, '').trim();
}

function readInvoicesSheet(worksheet) {
	let invoices = [];
	let orderId = null, trackingNumber = null, totalCost = null;
	var rowIndex = 2;

	while (worksheet['B' + rowIndex] != undefined) {
		orderId = worksheet['B' + rowIndex] ? getNormalizeStr(worksheet['B' + rowIndex].v) : null;
		trackingNumber = worksheet['L' + rowIndex] ? getNormalizeStr(worksheet['L' + rowIndex].v) : null;
		totalCost = worksheet['U' + rowIndex] ? worksheet['U' + rowIndex].v : null;

		if (!totalCost) {
			totalCost = 0;
		}

		orderId && trackingNumber && invoices.push({ orderId, trackingNumber, totalCost });

		rowIndex = rowIndex + 1;
	}

	return invoices;
}

function generateInvoiceExcelFile(fileName, orders, showOptions) {
	let ebayStore = orders && orders.length && isEbayStore(orders[0].store);
	let hobbycoWebsite = orders && orders.length && orders[0].store==71;

	let isShowTotalCost = showOptions && showOptions.showTotalCost;
	let isShowTotalPayment = showOptions && showOptions.showTotalPayment;
	let isShowParcelWeight = showOptions && showOptions.showParcelWeight;
	let isShowPostageCost = showOptions && showOptions.showPostageCost;
	let isShowHanlingCost = showOptions && showOptions.showHanlingCost;

	let isShowPaypalTransactionFee = ebayStore && showOptions && showOptions.showPaypalTransactionFee;
	let isShowEbayFee = ebayStore && showOptions && showOptions.showEbayFee;
	let isShowServiceFee = ebayStore && showOptions && showOptions.showServiceFee;
	let isShowPaypalTotalFee = ebayStore && showOptions && showOptions.showPaypalTotalFee;
	let isShowSalesChannel = hobbycoWebsite && showOptions && showOptions.showSalesChannel;

	var aoa_data = [];
	var head = ['SalesRecordID', 'OrderID', 'Name', 'Address1', 'Address2', 'Suburb', 'State', 'PostCode', 'Country',
		'Email', 'Phone', 'Tracking', 'Date Created', 'Collected Time', 'Date Sent', 'Items'];

	isShowPaypalTransactionFee = ebayStore;
	isShowEbayFee = ebayStore;
	isShowServiceFee = ebayStore;
	isShowPaypalTotalFee = ebayStore;

	isShowTotalPayment && head.push('Total Payment');
	isShowParcelWeight && head.push('Parcel weight');
	isShowPostageCost && head.push('Postage Cost');
	isShowHanlingCost && head.push('Handling Cost');
	isShowTotalCost && head.push('Total Cost');
	isShowPaypalTransactionFee && head.push('Paypal Transaction Fee');
	isShowEbayFee && head.push('Ebay Fee');
	isShowServiceFee && head.push('Service Fee');
	isShowPaypalTotalFee && head.push('Paypal Total Fee');

	head.push('Final Amount');
	head.push('Export Note');

	isShowSalesChannel && head.push('SalesChannel');

	aoa_data.push(head);

	for (let order of orders) {
		let items = typeof order.items === 'object' ? order.items : JSON.parse(order.items);
		let aoa_row = [];
		aoa_row.push(order.salesRecordID);
		aoa_row.push(order.id);

		aoa_row.push(order.name ? order.name.replace(/"/g, "") : order.name);
		aoa_row.push(order.addr1 ? order.addr1.replace(/"/g, "") : order.addr1);
		aoa_row.push(order.addr2 ? order.addr2.replace(/"/g, "") : order.addr2);
		aoa_row.push(order.city ? order.city.replace(/"/g, "") : order.city);
		aoa_row.push(order.state ? order.state.replace(/"/g, "") : order.state);
		aoa_row.push(order.postcode ? order.postcode.replace(/"/g, "") : order.postcode);
		aoa_row.push(order.country ? order.country.replace(/"/g, "") : order.country);
		aoa_row.push(order.email ? order.email.replace(/"/g, "") : order.email);
		aoa_row.push(order.phone ? order.phone.replace(/"/g, "") : order.phone);

		aoa_row.push(order.trackingNumber ? order.trackingNumber : '');

		aoa_row.push(order.createdDate);
		aoa_row.push(order.collected);
		aoa_row.push(order.packedTime);

		// items
		let itemInfo = items.map(
			p =>
				[
					(p.quantity || p.Quantity || p.qty || p.qty_ordered || p.quantity_purchased),
					' x ',
					p.sku || p.SKU,
					' - ',
					(p.title || p.name || p.ProductName || p.product_title)
				].join('')
		).join('\n');

		aoa_row.push(itemInfo);

		// weigth
		isShowTotalPayment && aoa_row.push(parseFloat(order.paymentTotal));
		isShowParcelWeight && aoa_row.push(order.weight);
		isShowPostageCost && (order.weight > 0 && order.shippingCost && order.shippingCost > 0 ? aoa_row.push(order.shippingCost) : aoa_row.push('')); // Postage cost
		isShowHanlingCost && (order.handlingCost ? aoa_row.push(order.handlingCost) : aoa_row.push(''));

		if ((order.weight > 0) && (order.shippingCost >= 0) && (order.handlingCost > 0 || order.isPlacementOrderSummary)) {
			var totalCost = parseFloat(order.totalCost);
			isShowTotalCost && (totalCost ? aoa_row.push(totalCost) : aoa_row.push(''));
			isShowPaypalTransactionFee && (order.paypal_transaction_fee ? aoa_row.push(order.paypal_transaction_fee) : aoa_row.push('')); //Paypal Transaction Fee
			isShowEbayFee && (order.ebay_fee ? aoa_row.push(order.ebay_fee) : aoa_row.push('')); //Ebay Fee
			isShowServiceFee && (order.service_fee ? aoa_row.push(order.service_fee) : aoa_row.push('')); //Service Fee
			isShowPaypalTotalFee && (order.paypal_total_fee ? aoa_row.push(order.paypal_total_fee) : aoa_row.push('')); //Paypal Total Fee

			var finalAmount = parseFloat(order.paymentTotal) - totalCost;

			if (order.paypal_total_fee) {
				finalAmount = finalAmount - order.paypal_total_fee;
			}

			aoa_row.push(finalAmount); // Amount
			aoa_row.push(''); // Note
		} else {
			isShowTotalCost && aoa_row.push(''); // Total cost
			isShowPaypalTransactionFee && aoa_row.push(''); //Paypal Transaction Fee
			isShowEbayFee && aoa_row.push(''); //Ebay Fee
			isShowServiceFee && aoa_row.push(''); //Service Fee
			isShowPaypalTotalFee && aoa_row.push(''); //Paypal Total Fee

			aoa_row.push(''); // Amount

			let note = '';

			if (order.weight == 0) {
				note = 'Invalid parcel weight or item weight';
			} else {
				if (order.shippingCost == -1) {
					note = 'Invalid parcel weight';
				} else if (order.shippingCost == -2) {
					note = 'Shipping cost not defined yet';
				} else if (order.shippingCost == -3) {
					note = 'Failed Auspost API. Please check (state, suburb, postcode) again';
				}
			}

			aoa_row.push(note);

		}

		isShowSalesChannel && aoa_row.push(order.salesChannel ? order.salesChannel.replace(/"/g, "") : order.salesChannel);

		aoa_data.push(aoa_row);
	}

	var ws = xlsx.utils.aoa_to_sheet(aoa_data);
	var wb = xlsx.utils.book_new();
	xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

	if (!fs.existsSync(EXPORT_DIR)) {
		fs.mkdirSync(EXPORT_DIR, { recursive: true });
	}

	let filePath = EXPORT_DIR + '/' + fileName;
	xlsx.writeFile(wb, filePath);

	return filePath;
}

async function sendInvoiceEmail(toName, toEmail, subject, content) {
	var emailMsg = {
		'From': {},
		'To': [],
		'Subject': subject,
		'TextPart': '',
		'HTMLPart': '',
	};

	emailMsg.From = MAILJET_CONFIG.From;
	emailMsg.To.push({
		'Name': toName,
		'Email': toEmail
	});

	emailMsg.HTMLPart = content;

	let messages = [emailMsg];

	var result = await new Promise((resolve, reject) => {
		var mailjetConn = mailjet.connect(MAILJET_CONFIG.Auth.Username, MAILJET_CONFIG.Auth.Password);
		var request = mailjetConn.post('send', { 'version': 'v3.1' }).request({
			'Messages': messages
		});

		request.then(result => resolve(result))
			.catch(err => reject(err));
	});
}

const downloadInvoice = async function(req, res, next) {

	req.connection.setTimeout(0);
    res.connection.setTimeout(0);
	
	conn = new Database(dbconn);

	let store = req.body && req.body.store || null;
	let substore = req.body && req.body.substore || null;
	
	let datefrom = req.body && req.body.datefrom || null;
	let dateto = req.body && req.body.dateto || null;
	let costweights = req.body && req.body.costweights ? req.body.costweights : null;
	let receive_email = req.body && req.body.receive_email ? req.body.receive_email : null;

	let show_options = req.body && req.body.show_options ? req.body.show_options : null;

	let output = {result: null};
	let httpStatus = 400;

	let storeCostWeights = null;

	let postalPurchases = [];

	async function generatePacelWeightOrders(originalOrder, parcelWeights) {
		let tempNewOrders = [];

		for (var i = 0; i < parcelWeights.length; ++i) {
			let newOrder = _.clone(originalOrder);
			newOrder.trackingID = [parcelWeights[i].trackingNumber];
			newOrder.weight = parseFloat(parcelWeights[i].weight);

			let shippingCost = await getShippingCost(storeCostWeights, { ...originalOrder, ...{ weight: parseFloat(parcelWeights[i].weight), trackingNumber: parcelWeights[i].trackingNumber } }, postalPurchases);

			newOrder.shippingCost = shippingCost;
			newOrder.isPlacementOrderSummary = (parcelWeights[i].type != 0) && (i == 0);

			if (i != 0 || (parcelWeights[i].type != 0)) {
				newOrder.handlingCost = 0;
				newOrder.totalCost = 0;
			}

			tempNewOrders.push(newOrder);
		}

		return tempNewOrders;
	}

	function isAllInvoiced(invoicedTrackingNumbers, parcelWeights) {
		let isInvoiced = true;
		for (let parcelWeight of parcelWeights) {
			if (!invoicedTrackingNumbers.has(parcelWeight.trackingNumber)) {
				isInvoiced = false;
				break;
			}
		}

		return isInvoiced;
	}

	async function getInvoicedTrackingNumbers(trackingNumbers) {
		let invoices = [];
		let invoicedTrackingNumbers = new Map();

		if (trackingNumbers.length) {
			invoices = await conn.query('SELECT * FROM invoices WHERE trackingNumber in (' + trackingNumbers.join(',') + ')');
			for (let invoice of invoices) {
				if (!invoicedTrackingNumbers.has(invoice.trackingNumber)) {
					invoicedTrackingNumbers.set(invoice.trackingNumber, true);
				}
			}
		}

		return invoicedTrackingNumbers;
	}

	async function downloadInvoiceTask(store, costweights, datefrom, dateto, receive_email, show_options) {

		let costWeights = JSON.parse(costweights);
		let showOptions = show_options ? JSON.parse(show_options) : null;
		storeCostWeights = [{ store: store, costweights: costWeights}];

		let queryStores = [];
		let convertData = getConversionData(store);
		if (store == 30) {
			// combined group
			convertData = getConversionData(31);
			queryStores = [31, 32, 33, 35, 30];
		} else {
			queryStores = [store];
		}

		
		const ORDER_STATUS_PACKED = 3;
		const ORDER_STATUS_OVERRIDE = 8;

		const createdDateFieldName = convertData.DateCreated ;
		const itemsFieldName = convertData.Items;
		const nameFieldName = Array.isArray(convertData.BuyerFullName) ? convertData.BuyerFullName.join('.') : convertData.BuyerFullName;
		const addr1FieldName = Array.isArray(convertData.BuyerAddress1) ? convertData.BuyerAddress1.join('.') : convertData.BuyerAddress1;
		const addr2FieldName = Array.isArray(convertData.BuyerAddress2) ? convertData.BuyerAddress2.join('.') : convertData.BuyerAddress2;
		const cityFieldName = Array.isArray(convertData.BuyerCity) ? convertData.BuyerCity.join('.') : convertData.BuyerCity;
		const stateFieldName = Array.isArray(convertData.BuyerState) ? convertData.BuyerState.join('.') : convertData.BuyerState;
		const postcodeFieldName = Array.isArray(convertData.BuyerPostcode) ? convertData.BuyerPostcode.join('.') : convertData.BuyerPostcode;
		const countryFieldName = Array.isArray(convertData.BuyerCountry) ? convertData.BuyerCountry.join('.') : convertData.BuyerCountry;
		const emailFieldName = Array.isArray(convertData.Email) ? convertData.Email.join('.') : convertData.Email;
		const phoneFieldName = Array.isArray(convertData.PhoneNumber) ? convertData.PhoneNumber.join('.') : convertData.PhoneNumber;
		const saleschannelFieldName = Array.isArray(convertData.SalesChannel) ? convertData.SalesChannel.join('.') : convertData.SalesChannel;
		const totalPriceFieldName = convertData.TotalPrice;

		await conn.connect();
		let sql = 'select od.id, od.orderID, od.salesRecordID, od.createdDate, od.store, cl.type, cl.collected, cl.packedTime, cl.`status`, cl.trackingID, cl.weight, cl.parcelWeights, JSON_EXTRACT(od.`data`, "$.' + itemsFieldName + '") as items, '
				+ ' JSON_EXTRACT(od.`data`, "$.' + nameFieldName + '") as name, '
				+ ' JSON_EXTRACT(od.`data`, "$.' + addr1FieldName + '") as addr1,'
				+ ' JSON_EXTRACT(od.`data`, "$.' + addr2FieldName + '") as addr2,'
				+ ' JSON_EXTRACT(od.`data`, "$.' + cityFieldName + '") as city,'
				+ ' JSON_EXTRACT(od.`data`, "$.' + stateFieldName + '") as state,'
				+ ' JSON_EXTRACT(od.`data`, "$.' + postcodeFieldName + '") as postcode,'
				+ ' JSON_EXTRACT(od.`data`, "$.' + countryFieldName + '") as country,'
				+ (emailFieldName ? (' JSON_EXTRACT(od.`data`, "$.' + emailFieldName + '") as email,') : ' "" as email,')
				+ ' JSON_EXTRACT(od.`data`, "$.' + phoneFieldName + '") as phone,'
				+ (saleschannelFieldName ? ' JSON_EXTRACT(od.`data`, "$.' + saleschannelFieldName + '") as salesChannel,' : '')
				+ ' JSON_UNQUOTE(JSON_EXTRACT(od.`data`, "$.' + totalPriceFieldName + '")) as paymentTotal,'
				+ HANDLING_COST + ' as handlingCost'
			  	+ ' from orders od join collecting cl on cl.orderID = od.id'
				+ ' where cl.trackingID is not null and od.store in (' + queryStores.join(',') + ')'
				+ ' and cl.`status` in( ' + [ORDER_STATUS_PACKED, ORDER_STATUS_OVERRIDE].join(', ') + ') ';
				
		if (datefrom || dateto) {
			sql = sql + ' and (CAST(JSON_UNQUOTE(JSON_EXTRACT(od.`data`, "$.' + createdDateFieldName + '")) as DATETIME)';

			if (datefrom && dateto) {
				sql = sql + ' between "' + datefrom + '" AND "' + dateto + '")';
			} else if (datefrom) {
				sql = sql + ' >= "' + datefrom + '")';
			} else if (dateto) {
				sql = sql + ' <= "' + dateto + '")';
			}
		}

		sql = sql + ' order by od.id desc';

		let result = await conn.query(sql);

		if (result.length == 0) {
			return [];
		} else if (result.length > 0) {

			let itemSql = 'SELECT * FROM items WHERE itemStore in (' + queryStores.join(',') + ')';
			let items = await conn.query(itemSql);

			let itemDetails = {};
			let itemSkuDetails = {};
			for (let item of items) {
				let newitem = {};
				for (let att in item) {
					newitem[att] = item[att]
				}

				if (!itemDetails.hasOwnProperty(item.itemNo)) {
					itemDetails[item.itemNo] = [];
				}
				itemDetails[item.itemNo].push(newitem);

				if (!itemSkuDetails.hasOwnProperty(item.sku)) {
					itemSkuDetails[item.sku] = [];
				}
				itemSkuDetails[item.sku].push(newitem);

			}


			let trackingNumbers = new Map();
			for (let order of result) {
				order = getFormattedOrder(order);
				let trackingIDs = order.trackingID;

				if (Array.isArray(trackingIDs)) {
					for (let trackingId of trackingIDs) {
						if (trackingNumbers.has(trackingId)) {
							let currentOrderIds = trackingNumbers.get(trackingId);
							currentOrderIds.push(order.id);
							trackingNumbers.set(trackingId, currentOrderIds);
						} else {
							trackingNumbers.set(trackingId, [order.id]);
						}
					}
				}
			}

			let trackingNumberArr = Array.from(trackingNumbers.keys()).map(tid => '"' + tid + '"');
			let invoicedTrackingNumbers = await getInvoicedTrackingNumbers(trackingNumberArr);
			postalPurchases = await getPostalPurchases(trackingNumberArr);

			let newOrders = [];
			let skipOrders = [];

			for (let order of result) {
				if (_.indexOf(skipOrders, order.id) == -1) {
					let trackingIDs = order.trackingID;
					let parcelWeights = order.parcelWeights ? JSON.parse(order.parcelWeights) : null;
					
					try {
						if (trackingIDs.length == 1) {
							order.trackingNumber = trackingIDs[0];
							let sameTrackingOrderIds = trackingNumbers.get(trackingIDs[0]);
							let isInvoiced = invoicedTrackingNumbers.has(trackingIDs[0]);

							order.weight = parcelWeights ? parcelWeights[0].weight : order.weight;

							if (sameTrackingOrderIds.length == 1) {
								// case 1
								if (!isInvoiced) {
									if (!order.weight) {
										order.weight = getOrderWeightByItems(order, convertData, itemDetails, itemSkuDetails);
									}

									order.shippingCost = await getShippingCost(storeCostWeights, order, postalPurchases)
									order.totalCost = order.shippingCost + order.handlingCost;
									newOrders.push(order);
								}
							} else {
								// case 5
								let sameTrackingOrders = [];
								let sameTrackingCost = 0;

								for (let stId of sameTrackingOrderIds) {
									if (order.id != stId) {
										if (!isInvoiced) {
											let sameTrackingOrder = result.find(order => order.id == stId);
											
											let parcelWeights = sameTrackingOrder.parcelWeights ? JSON.parse(sameTrackingOrder.parcelWeights) : null;
											sameTrackingOrder.trackingNumber = trackingIDs[0];
											sameTrackingOrder.weight = parcelWeights ? parcelWeights[0].weight : sameTrackingOrder.weight;

											sameTrackingCost = sameTrackingCost + await getShippingCost(storeCostWeights, sameTrackingOrder, postalPurchases);
											sameTrackingOrder.shippingCost = 0;
											sameTrackingOrder.totalCost = sameTrackingOrder.handlingCost;
											sameTrackingOrders.push(sameTrackingOrder);
										}

										skipOrders.push(stId);
									}
								}

								if (!isInvoiced) {
									order.shippingCost = sameTrackingCost + await getShippingCost(storeCostWeights, order, postalPurchases);
									order.totalCost = order.shippingCost + order.handlingCost ;
									newOrders.push(order);
									newOrders = newOrders.concat(sameTrackingOrders);
								}
							}
						} else {
							if (parcelWeights) {
								let parcelOrders = [];
								let totalShippingCost = 0;

								let originalParcelWeights = parcelWeights.filter(pw => pw.type == 0);
								let originalOrders = [];

								if (originalParcelWeights.length) {
									let isInvoiced = isAllInvoiced(invoicedTrackingNumbers, originalParcelWeights);
									if (!isInvoiced) {
										// case 2
										originalOrders = await generatePacelWeightOrders(order, originalParcelWeights);
									}
								}

								let replacementParcelWeights = parcelWeights.filter(pw => pw.type == 1);
								let replacementOrders = [];

								if (replacementParcelWeights.length) {
									let isInvoiced = isAllInvoiced(invoicedTrackingNumbers, replacementParcelWeights);

									if (!isInvoiced) {
										replacementOrders = await generatePacelWeightOrders(order, replacementParcelWeights);
									}
								}

								totalShippingCost = totalShippingCost + originalOrders.reduce((total, order) => (total + order.shippingCost), 0);
								totalShippingCost = totalShippingCost + replacementOrders.reduce((total, order) => (total + order.shippingCost), 0);

								parcelOrders = [...parcelOrders, ...originalOrders];
								parcelOrders = [...parcelOrders, ...replacementOrders];

								if (parcelOrders.length) {
									parcelOrders[0].totalCost = parcelOrders[0].handlingCost + totalShippingCost
								}

								newOrders = [...newOrders, ...parcelOrders];

							} else {
								order.trackingNumber = trackingIDs[0];
								order.shippingCost = await getShippingCost(storeCostWeights, order, postalPurchases);
								order.totalCost = order.shippingCost + order.handlingCost;
								newOrders.push(order);
							}

						}
					}
					catch (error) {
						// console.log('------', order.orderID, order.trackingID);
						console.log(error);
					}
				}

			}

			let ebayStore = isEbayStore(store);

			if (ebayStore) { // oz plaza
				for (let order of newOrders) {
					if (order.handlingCost && order.handlingCost > 0) {
						let paymentTotal = order.paymentTotal;

						order.paypal_transaction_fee = parseFloat((PAYPAL_TRANSACTION_FEE).toFixed(2));
						order.paypal_fee = parseFloat((PAYPAL_FEE * paymentTotal).toFixed(2));
						order.ebay_fee = parseFloat((EBAY_FEE * paymentTotal).toFixed(2));
						order.service_fee = parseFloat((SERVICE_FEE * paymentTotal).toFixed(2));
						order.paypal_total_fee = order.paypal_transaction_fee + order.paypal_fee + order.ebay_fee + order.service_fee;
					}
				}
			}

			if (!receive_email) {
				return newOrders;
			} else {
				let storeName = Config.STORES[store.toString()] ? (Config.STORES[store.toString()].name || Config.STORES[store.toString()].shopName) : 'Store - ' + store.toString();
				let fileName = [
					"invoices", 
					storeName,
					datefrom ? "From" + datefrom.replace(/-/g, "") : "",
					dateto ? "To" + dateto.replace(/-/g, "") : "",
					(new Date().toISOString()).substring(0, 16).split([":"]).join("-").replace(/-/g, "")
				].join("_") + ".xlsx";

				generateInvoiceExcelFile(fileName, newOrders, showOptions);
				let fileNameEncode = Buffer.from(fileName, "utf8").toString("base64");

				// send email
				if (receive_email) {
					let downloadLink = [(req.isSecure() ? 'https' : 'http'), '://', req.headers.host, '/api/invoices/downloadExportFile/', fileNameEncode].join('');
					await sendInvoiceEmail('Receiver', receive_email, 'All ' + storeName + ' invoices', 'This is exported file of store ' + storeName + '. Please click <a href="' + downloadLink + '">here</a> to download')
				}
				
				console.log('Done - ', newOrders.length);
			}

		}
	}

	async function getPostalPurchases(trackingNumbers) {
		let postalPurchases = await conn.query('SELECT * FROM postalcharges WHERE consignmentNo in (' + trackingNumbers.join(',') + ')');
		return postalPurchases;
	}

	do {
		if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store) && store != 30)) {
			output.result = 'Invalid store.';
			break;
		}
		
		if (!costweights) {
			httpStatus = 401;
			output.result = 'Bad request.';
			break;
		}
		
		try{
			if (receive_email) {
				downloadInvoiceTask(store, costweights, datefrom, dateto, receive_email, show_options);
				output.result = 'success';
				output.data = [];
				httpStatus = 200;
			} else {
				let newOrders = await downloadInvoiceTask(store, costweights, datefrom, dateto, receive_email, show_options);

				if (newOrders.length) {
					output.result = 'success';
					output.data = newOrders;
					httpStatus = 200;

				} else {
					output.result = 'No invoices found';
					httpStatus = 404;
				}
				
			}
	
		}catch (e) {
			// Error
			httpStatus = 503;
			output.result = e;
			console.log(e);
		}
	} while(0);

	if (conn.connected) conn.release();


	// Output
	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

const markOrdersInvoiced = async function (req, res, next) {
	var conn = new Database(dbconn);

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var trackingNumbers = req.body.trackingNumbers;
	var orderId = req.body.orderId;

	let storeCostWeights = null;

	var output = { result: null };
	var httpStatus = 400;

	async function getPostalPurchases(trackingNumbers) {
		let postalPurchases = await conn.query('SELECT * FROM postalcharges WHERE consignmentNo in (' + trackingNumbers.join(',') + ')');
		return postalPurchases;
	}

	async function getOrderCost(order, convertData, itemDetails, itemSkuDetails) {
		let newOrders = [];

		order = getFormattedOrder(order);
		let trackingIDs = order.trackingID;
		let parcelWeights = order.parcelWeights ? JSON.parse(order.parcelWeights) : null;

		let trackingNumberArr = trackingIDs.map(tid => '"' + tid + '"');
		let postalPurchases = await getPostalPurchases(trackingNumberArr);

		order.weight = parcelWeights ? parcelWeights[0].weight : order.weight;

		if (trackingIDs.length == 1) {
			order.trackingNumber = trackingIDs[0];

			// const itemsFieldName = convertData.Items;
			// const nameFieldName = Array.isArray(convertData.BuyerFullName) ? convertData.BuyerFullName.join('.') : convertData.BuyerFullName;
			// const addr1FieldName = Array.isArray(convertData.BuyerAddress1) ? convertData.BuyerAddress1.join('.') : convertData.BuyerAddress1;
			// const addr2FieldName = Array.isArray(convertData.BuyerAddress2) ? convertData.BuyerAddress2.join('.') : convertData.BuyerAddress2;
			// const cityFieldName = Array.isArray(convertData.BuyerCity) ? convertData.BuyerCity.join('.') : convertData.BuyerCity;
			// const stateFieldName = Array.isArray(convertData.BuyerState) ? convertData.BuyerState.join('.') : convertData.BuyerState;
			// const postcodeFieldName = Array.isArray(convertData.BuyerPostcode) ? convertData.BuyerPostcode.join('.') : convertData.BuyerPostcode;
			// const countryFieldName = Array.isArray(convertData.BuyerCountry) ? convertData.BuyerCountry.join('.') : convertData.BuyerCountry;
			// const emailFieldName = Array.isArray(convertData.Email) ? convertData.Email.join('.') : convertData.Email;
			// const phoneFieldName = Array.isArray(convertData.PhoneNumber) ? convertData.PhoneNumber.join('.') : convertData.PhoneNumber;
			// const totalPriceFieldName = convertData.TotalPrice;

			// sameTrackingOrderSql = 'select od.id, od.orderID, od.salesRecordID, od.createdDate, od.store, cl.type, cl.collected, cl.packedTime, cl.`status`, cl.trackingID, cl.weight, cl.parcelWeights, JSON_EXTRACT(od.`data`, "$.' + itemsFieldName + '") as items, '
			// 	+ ' JSON_EXTRACT(od.`data`, "$.' + nameFieldName + '") as name, '
			// 	+ ' JSON_EXTRACT(od.`data`, "$.' + addr1FieldName + '") as addr1,'
			// 	+ ' JSON_EXTRACT(od.`data`, "$.' + addr2FieldName + '") as addr2,'
			// 	+ ' JSON_EXTRACT(od.`data`, "$.' + cityFieldName + '") as city,'
			// 	+ ' JSON_EXTRACT(od.`data`, "$.' + stateFieldName + '") as state,'
			// 	+ ' JSON_EXTRACT(od.`data`, "$.' + postcodeFieldName + '") as postcode,'
			// 	+ ' JSON_EXTRACT(od.`data`, "$.' + countryFieldName + '") as country,'
			// 	+ ' JSON_EXTRACT(od.`data`, "$.' + emailFieldName + '") as email,'
			// 	+ ' JSON_EXTRACT(od.`data`, "$.' + phoneFieldName + '") as phone,'
			// 	+ ' JSON_UNQUOTE(JSON_EXTRACT(od.`data`, "$.' + totalPriceFieldName + '")) as paymentTotal,'
			// 	+ HANDLING_COST + ' as handlingCost'
			// 	+ ' from orders od join collecting cl on cl.orderID = od.id'
			// 	+ ' where cl.orderId != ' + order.id + ' and cl.trackingID = \'["' + order.trackingNumber + '"]\'';

			let sameTrackingNumberOrders = null;

			if (!sameTrackingNumberOrders) {
				if (!order.weight) {
					order.weight = getOrderWeightByItems(order, convertData, itemDetails, itemSkuDetails);
				}

				order.shippingCost = await getShippingCost(storeCostWeights, order, postalPurchases);
				order.totalCost = order.shippingCost + order.handlingCost;
				newOrders.push(order);
			} else {
				let sameTrackingOrders = [];
				let sameTrackingCost = 0;
				let isLatestOrder = sameTrackingNumberOrders.length == sameTrackingNumberOrders.filter(o => o.id < order.id).length;

				for (let sameTrackingOrder of sameTrackingNumberOrders) {
					sameTrackingOrder = getFormattedOrder(sameTrackingOrder);

					let parcelWeights = sameTrackingOrder.parcelWeights ? JSON.parse(sameTrackingOrder.parcelWeights) : null;
					sameTrackingOrder.trackingNumber = trackingIDs[0];
					sameTrackingOrder.weight = parcelWeights ? parcelWeights[0].weight : sameTrackingOrder.weight;

					if (!sameTrackingOrder.weight) {
						sameTrackingOrder.weight = getOrderWeightByItems(order, convertData, itemDetails, itemSkuDetails);
					}

					sameTrackingCost = sameTrackingCost + await getShippingCost(storeCostWeights, sameTrackingOrder, postalPurchases);
					sameTrackingOrder.shippingCost = 0;
					sameTrackingOrder.totalCost = sameTrackingOrder.handlingCost;
					sameTrackingOrders.push(sameTrackingOrder);
				}

				order.shippingCost = isLatestOrder ? (sameTrackingCost + await getShippingCost(storeCostWeights, order, postalPurchases)) : 0;
				order.totalCost = order.shippingCost + order.handlingCost;
				newOrders.push(order);
				newOrders = newOrders.concat(sameTrackingOrders);
			}
		} else {
			if (parcelWeights) {
				let parcelOrders = [];
				let totalShippingCost = 0;

				let originalParcelWeights = parcelWeights.filter(pw => pw.type == 0);
				let originalOrders = [];

				if (originalParcelWeights.length) {
					// case 2
					originalOrders = await generatePacelWeightOrders(order, originalParcelWeights);
				}

				let replacementParcelWeights = parcelWeights.filter(pw => pw.type == 1);
				let replacementOrders = [];

				if (replacementParcelWeights.length) {
					replacementOrders = await generatePacelWeightOrders(order, replacementParcelWeights);
				}

				totalShippingCost = totalShippingCost + originalOrders.reduce((total, order) => (total + order.shippingCost), 0);
				totalShippingCost = totalShippingCost + replacementOrders.reduce((total, order) => (total + order.shippingCost), 0);

				parcelOrders = [...parcelOrders, ...originalOrders];
				parcelOrders = [...parcelOrders, ...replacementOrders];

				for (let i = 0; i < parcelOrders.length; ++i) {
					if (i == 0) {
						parcelOrders[i].totalCost = parcelOrders[i].handlingCost + totalShippingCost
					} else {
						parcelOrders[i].totalCost = 0;
					}
				}

				newOrders = [...newOrders, ...parcelOrders];

			} else {
				order.trackingNumber = trackingIDs[0];
				order.shippingCost = await getShippingCost(storeCostWeights, order, postalPurchases);
				newOrders.push(order);
			}
		}

		return newOrders;
	}

	let postalPurchases = [];

	async function generatePacelWeightOrders(originalOrder, parcelWeights) {
		let tempNewOrders = [];

		for (var i = 0; i < parcelWeights.length; ++i) {
			let newOrder = _.clone(originalOrder);
			newOrder.trackingNumber = parcelWeights[i].trackingNumber;
			newOrder.trackingID = [parcelWeights[i].trackingNumber];
			newOrder.weight = parseFloat(parcelWeights[i].weight);

			let shippingCost = await getShippingCost(storeCostWeights, { ...originalOrder, ...{ weight: parseFloat(parcelWeights[i].weight), trackingNumber: parcelWeights[i].trackingNumber } }, postalPurchases);

			newOrder.shippingCost = shippingCost;
			newOrder.isPlacementOrderSummary = (parcelWeights[i].type != 0) && (i == 0);

			if (i != 0 || (parcelWeights[i].type != 0)) {
				newOrder.handlingCost = 0;
			}

			tempNewOrders.push(newOrder);
		}

		return tempNewOrders;
	}

	try {
		do {
			let loggedInUser = await userCheckToken(token);
			if (!loggedInUser) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			if (!trackingNumbers || !orderId) {
				output.result = 'Invalid tracking number or order id.';
				break;
			}

			trackingNumbers = JSON.parse(trackingNumbers);
			await conn.connect();

			let orderSql = 'select store from orders where id = ' + conn.connection.escape(orderId);
			let orders = await conn.query(orderSql);

			if (!orders) {
				output.result = 'Order not existed!';
				break;
			}

			let order = orders[0];

			let convertData = getConversionData(order.store);

			const itemsFieldName = convertData.Items;
			const nameFieldName = Array.isArray(convertData.BuyerFullName) ? convertData.BuyerFullName.join('.') : convertData.BuyerFullName;
			const addr1FieldName = Array.isArray(convertData.BuyerAddress1) ? convertData.BuyerAddress1.join('.') : convertData.BuyerAddress1;
			const addr2FieldName = Array.isArray(convertData.BuyerAddress2) ? convertData.BuyerAddress2.join('.') : convertData.BuyerAddress2;
			const cityFieldName = Array.isArray(convertData.BuyerCity) ? convertData.BuyerCity.join('.') : convertData.BuyerCity;
			const stateFieldName = Array.isArray(convertData.BuyerState) ? convertData.BuyerState.join('.') : convertData.BuyerState;
			const postcodeFieldName = Array.isArray(convertData.BuyerPostcode) ? convertData.BuyerPostcode.join('.') : convertData.BuyerPostcode;
			const countryFieldName = Array.isArray(convertData.BuyerCountry) ? convertData.BuyerCountry.join('.') : convertData.BuyerCountry;
			const emailFieldName = Array.isArray(convertData.Email) ? convertData.Email.join('.') : convertData.Email;
			const phoneFieldName = Array.isArray(convertData.PhoneNumber) ? convertData.PhoneNumber.join('.') : convertData.PhoneNumber;
			const totalPriceFieldName = convertData.TotalPrice;

			orderSql = 'select od.id, od.orderID, od.salesRecordID, od.createdDate, od.store, cl.type, cl.collected, cl.packedTime, cl.`status`, cl.trackingID, cl.weight, cl.parcelWeights, JSON_EXTRACT(od.`data`, "$.' + itemsFieldName + '") as items, '
				+ ' JSON_EXTRACT(od.`data`, "$.' + nameFieldName + '") as name, '
				+ ' JSON_EXTRACT(od.`data`, "$.' + addr1FieldName + '") as addr1,'
				+ ' JSON_EXTRACT(od.`data`, "$.' + addr2FieldName + '") as addr2,'
				+ ' JSON_EXTRACT(od.`data`, "$.' + cityFieldName + '") as city,'
				+ ' JSON_EXTRACT(od.`data`, "$.' + stateFieldName + '") as state,'
				+ ' JSON_EXTRACT(od.`data`, "$.' + postcodeFieldName + '") as postcode,'
				+ ' JSON_EXTRACT(od.`data`, "$.' + countryFieldName + '") as country,'
				+ (emailFieldName ? (' JSON_EXTRACT(od.`data`, "$.' + emailFieldName + '") as email,') : ' "" as email,')
				+ ' JSON_EXTRACT(od.`data`, "$.' + phoneFieldName + '") as phone,'
				+ ' JSON_UNQUOTE(JSON_EXTRACT(od.`data`, "$.' + totalPriceFieldName + '")) as paymentTotal,'
				+ HANDLING_COST + ' as handlingCost'
				+ ' from orders od join collecting cl on cl.orderID = od.id'
				+ ' where od.id = ' + conn.connection.escape(orderId);

			orders = await conn.query(orderSql);
			order = orders[0];

			let itemSql = 'SELECT * FROM items WHERE itemStore = ' + order.store;
			let items = await conn.query(itemSql);

			let costWeightsSql = 'SELECT * FROM storecostweights';
			storeCostWeights = await conn.query(costWeightsSql);

			if (storeCostWeights && storeCostWeights.length) {
				for (let storeCostWeight of storeCostWeights) {
					storeCostWeight.costweights = JSON.parse(storeCostWeight.costweights);
				}
			}

			let itemDetails = {};
			let itemSkuDetails = {};
			for (let item of items) {
				let newitem = {};
				for (let att in item) {
					newitem[att] = item[att]
				}

				if (!itemDetails.hasOwnProperty(item.itemNo)) {
					itemDetails[item.itemNo] = [];
				}
				itemDetails[item.itemNo].push(newitem);

				if (!itemSkuDetails.hasOwnProperty(item.sku)) {
					itemSkuDetails[item.sku] = [];
				}
				itemSkuDetails[item.sku].push(newitem);

			}

			let orderCosts = await getOrderCost(order, convertData, itemDetails, itemSkuDetails);
			let invoices = [];
			for (let trackingNumber of trackingNumbers) {
				let checkExistSql = 'SELECT * FROM invoices WHERE orderId =  ' + conn.connection.escape(order.id) + ' and trackingNumber = ' + conn.connection.escape(trackingNumber) + ' limit 0, 1';
				let invoice = await conn.query(checkExistSql);

				if (!invoice || !invoice.length) {
					let checkOrder = orderCosts.find(o => o.trackingNumber == trackingNumber);
					let orderCost = checkOrder.totalCost;

					let insertSql = [
						'INSERT INTO invoices (orderId, trackingNumber, totalCost, invoicedTime, invoicedBy) values (',
						[
							conn.connection.escape(order.id),
							conn.connection.escape(trackingNumber),
							orderCost,
							conn.connection.escape(new Date()),
							conn.connection.escape(loggedInUser['username']),
						].join(', '),
						')'].join('');

					await conn.query(insertSql);
					
					let invoiceSql = 'SELECT * FROM invoices WHERE orderId =  ' + conn.connection.escape(order.id) + ' and trackingNumber = ' + conn.connection.escape(trackingNumber) + ' limit 0, 1';
					let invoice = await conn.query(invoiceSql);
				
					if (invoice) {
						invoices.push(invoice[0]);
					}
				}

				output.invoices = invoices;
				httpStatus = 200;
				output.result = 'success';
			}
		} while (0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
		console.log(e);
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

const importImvoice = async function (req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var output = { result: null };
	var httpStatus = 400;

	try {
		do {
			console.log('import invoices');

			let loggedInUser = await userCheckToken(token);
			if (!loggedInUser) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			if (method != 'post') {
				httpStatus = 401;
				output.result = 'Bad request.';
				break;
			}

			var file = req.files.file;

			var workbook = xlsx.readFile(file.path);

			if (!workbook || !workbook.SheetNames || !workbook.SheetNames.length) {
				httpStatus = 400;
				output.result = 'Invalid file.';
				break;
			}

			let invoicesSheetName = workbook.SheetNames[0];
			let invoices = readInvoicesSheet(workbook.Sheets[invoicesSheetName]);

			await conn.connect();
			let insertSqls = [];

			for (let invoice of invoices) {
				let orderId = invoice.orderId;
				let trackingNumber = invoice.trackingNumber;
				let totalCost = invoice.totalCost;
				
				let checkExistSql = 'SELECT * FROM invoices WHERE orderId =  ' + conn.connection.escape(orderId) + ' and trackingNumber = ' + conn.connection.escape(trackingNumber) + ' limit 0, 1';
				let checkInvoice = await conn.query(checkExistSql);

				if (!checkInvoice || !checkInvoice.length) {
					insertSqls.push([
						'(',
						[
							conn.connection.escape(orderId),
							conn.connection.escape(trackingNumber),
							totalCost,
							conn.connection.escape(new Date()),
							conn.connection.escape('autoimport'),
						].join(', '),
						')'].join('')
					);
				}
			}

			if (insertSqls.length) {
				await conn.query(
					[	
						'INSERT INTO invoices (orderId, trackingNumber, totalCost, invoicedTime, invoicedBy) values ',
						insertSqls.join(',')
					].join('')
				);
			}

			httpStatus = 200;
			output.result = 'success';
		} while (0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
		console.log(e);
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

const importAusPost = async function (req, res, next) {
	function readPostalchargesSheet(worksheet) {
		let postalcharges = [];

		let consignmentNo = null;
		let chargeCode = null;
		let toAccount = null;
		let chargebackAccount = null;
		let actualChargeInGST = null;
		let actualChargeExGST = null;
		let expectedChargeInGST = null;
		let expectedChargeExGST = null;
		let articleCount = null;
		let totalWeight = null;
		let serviceId = 1;

		var rowIndex = 3;

		while (worksheet['A' + rowIndex] != undefined) {
			consignmentNo = worksheet['A' + rowIndex] ? getNormalizeStr(worksheet['A' + rowIndex].v) : null;
			chargeCode = worksheet['B' + rowIndex] ? getNormalizeStr(worksheet['B' + rowIndex].v) : null;
			toAccount = worksheet['C' + rowIndex] ? getNormalizeStr(worksheet['C' + rowIndex].v) : null;
			chargebackAccount = worksheet['D' + rowIndex] ? getNormalizeStr(worksheet['D' + rowIndex].v) : null;
			actualChargeExGST = worksheet['E' + rowIndex] ? worksheet['E' + rowIndex].v : 0; 
			actualChargeInGST = worksheet['F' + rowIndex] ? worksheet['F' + rowIndex].v : null; 
			expectedChargeExGST = worksheet['G' + rowIndex] ? worksheet['G' + rowIndex].v : 0; 
			expectedChargeInGST = worksheet['H' + rowIndex] ? worksheet['H' + rowIndex].v : null; 
			articleCount = worksheet['I' + rowIndex] ? worksheet['I' + rowIndex].v : 1;
			totalWeight = worksheet['J' + rowIndex] ? worksheet['J' + rowIndex].v : null;

			consignmentNo && actualChargeInGST && expectedChargeInGST && totalWeight && postalcharges.push({
				consignmentNo,
				chargeCode,
				toAccount,
				chargebackAccount,
				actualChargeInGST,
				actualChargeExGST,
				expectedChargeInGST,
				expectedChargeExGST,
				articleCount,
				totalWeight,
				serviceId
			});

			rowIndex = rowIndex + 1;
		}

		return postalcharges;
	}

	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var output = { result: null };
	var httpStatus = 400;

	try {
		do {
			console.log('import auspost');

			let loggedInUser = await userCheckToken(token);
			if (!loggedInUser) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			if (method != 'post') {
				httpStatus = 401;
				output.result = 'Bad request.';
				break;
			}

			var file = req.files.file;
			writeImportFileNames(file.name); 

			var workbook = xlsx.readFile(file.path);

			if (!workbook || !workbook.SheetNames || !workbook.SheetNames.length) {
				httpStatus = 400;
				output.result = 'Invalid file.';
				break;
			}

			let postalChargesSheetName = workbook.SheetNames[0];
			let postalcharges = readPostalchargesSheet(workbook.Sheets[postalChargesSheetName]);

			await conn.connect();
			let insertSqls = [];

			for (let postalcharge of postalcharges) {
				let consignmentNo = postalcharge.consignmentNo;
				let totalWeight = postalcharge.totalWeight;

				let checkExistSql = 'SELECT * FROM postalcharges WHERE consignmentNo =  ' + conn.connection.escape(consignmentNo) + ' and totalWeight = ' + totalWeight + ' limit 0, 1';
				let checkPostalCharge = await conn.query(checkExistSql);

				if (!checkPostalCharge || !checkPostalCharge.length) {
					insertSqls.push([
						'(',
						[
							conn.connection.escape(postalcharge.consignmentNo),
							conn.connection.escape(postalcharge.chargeCode),
							conn.connection.escape(postalcharge.toAccount),
							conn.connection.escape(postalcharge.chargebackAccount),
							postalcharge.actualChargeInGST,
							postalcharge.actualChargeExGST,
							postalcharge.expectedChargeInGST,
							postalcharge.expectedChargeExGST,
							postalcharge.articleCount,
							postalcharge.totalWeight,
							postalcharge.serviceId,
							conn.connection.escape(new Date()),
							conn.connection.escape(loggedInUser['username'])
						].join(', '),
						')'].join('')
					);
				}
			}

			if (insertSqls.length) {
				await conn.query(
					[
						`INSERT INTO postalcharges (consignmentNo, chargeCode, toAccount, chargebackAccount, actualChargeInGST, actualChargeExGST, 
									 expectedChargeInGST, expectedChargeExGST, articleCount, totalWeight, serviceId, importAt, importBy) values `,
						insertSqls.join(',')
					].join('')
				);
			}

			httpStatus = 200;
			output.result = 'success';
		} while (0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
		console.log(e);
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

const getCostWeights = async function (req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var output = { result: null };
	var httpStatus = 400;

	var store = req.body.store;

	try {
		do {
			console.log('getCostWeights');

			let loggedInUser = await userCheckToken(token);
			if (!loggedInUser) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			if (method != 'post' || !store) {
				httpStatus = 401;
				output.result = 'Bad request.';
				break;
			}

			await conn.connect();
			let storecostweights = await conn.query("SELECT * FROM storecostweights where store = " + conn.connection.escape(store) + " LIMIT 0, 1");
			httpStatus = 200;

			output.result = (storecostweights && storecostweights.length > 0) ? JSON.parse(storecostweights[0].costweights) : DEFAULT_COST_WEIGHT;
		} while (0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
		console.log(e);
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

const saveCostWeights = async function (req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var output = { result: null };
	var httpStatus = 400;

	var store = req.body.store;
	var costweights = req.body.costweights;

	try {
		do {
			console.log('saveCostWeights');

			let loggedInUser = await userCheckToken(token);
			if (!loggedInUser) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			if (method != 'post' || !store || !costweights) {
				httpStatus = 401;
				output.result = 'Bad request.';
				break;
			}

			await conn.connect();
			let storecostweights = await conn.query("SELECT * FROM storecostweights WHERE store = " + conn.connection.escape(store) + " LIMIT 0, 1");

			if (storecostweights && storecostweights.length > 0) {
				await conn.query(
					[
						"UPDATE storecostweights SET ",
						[
							"costweights = " + conn.connection.escape(costweights)
						].join(","),
						" WHERE store = " + conn.connection.escape(store)
					].join("")
				);
			} else {
				await conn.query(
					[
						"INSERT INTO storecostweights(store, costweights) values(",
						[
							conn.connection.escape(store),
							conn.connection.escape(costweights)
						].join(","),
						")"
					].join("")
				);
			}

			httpStatus = 200;
			output.result = 'success';

		} while (0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
		console.log(e);
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

const downloadExportFile = async function (req, res, next) {
	let fileNameEncode = req.params.file;
	let fileName = Buffer.from(fileNameEncode, "base64").toString("utf8");

	var output = { result: null };
	var httpStatus = 400;

	try {
		let filePath = EXPORT_DIR +  '/' + fileName;
		res.writeHead(200, {
			"Content-Type": 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			"Content-Disposition": "attachment; filename=" + fileName
		});

		// process Data
		var readStream = fs.createReadStream(filePath);
		readStream.pipe(res);
	}
	catch (e) {
		console.log(e);
		// Error
		httpStatus = 503;
		output.result = e;

		res.set({
			'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
			'Pragma': 'no-cache',
		});
		res.json(httpStatus, output);
		next();
	}

}

module.exports = { 
	downloadInvoice,
	markOrdersInvoiced,
	importImvoice,
	importAusPost,
	listAusPostLogs,
	getShorthandState,
	getEstAusPostPrice,
	saveCostWeights,
	getCostWeights,
	downloadExportFile
};