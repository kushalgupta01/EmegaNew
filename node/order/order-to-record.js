// Discount Chemist
// Order System

// Convert order from database to eBay record format

const {Config} = require('./config');
const {postageServiceName, dateIsoToEbay} = require('./utils');

const orderToRecord = function(orderRow) {
	let order = JSON.parse(orderRow.data);
	let recordData = {
		'DatabaseID': orderRow.id,
		'RecordNum': order.orderID,
		'OrderID': order.orderID,
		'SalesRecordID': order.SalesRecordID,
		'DeliveryNote': orderRow.deliveryNote || null,
		'ChannelID': order.channelID || null, // Used to detect orders from MIP (only MIP provides this)
		'UserID': order.buyerID,
		'BuyerFullName': order.finalDestinationAddressName,
		'PhoneNum': order.finalDestinationAddressPhone,
		'Email': order.buyerEmail,
		'BuyerAddress1': order.finalDestinationAddressLine1,
		'BuyerAddress2': order.finalDestinationAddressLine2,
		'BuyerCity': order.finalDestinationCity,
		'BuyerState': order.finalDestinationStateOrProvince,
		'BuyerPostCode': order.finalDestinationPostalCode,
		'BuyerCountry': order.finalDestinationCountry,

		'SalePrice': order.lineItemSumTotal,
		'Postage': order.orderShippingPrice,
		'CashOnDeliveryFee': order.cashOnDeliveryFee || null,
		'TotalPrice': order.orderSumTotal,
		'PaymentMethod': order.PaymentMethod || null,
		'SaleDate': dateIsoToEbay(order.saleDate || order.createdDate, Config.TIMEZONE),
		'CheckoutDate': dateIsoToEbay(order.checkoutDate || order.createdDate, Config.TIMEZONE),
		'PaidDate': dateIsoToEbay(order.paidDate || order.createdDate, Config.TIMEZONE),
		'PostDate': dateIsoToEbay(order.postedDate || order.createdDate, Config.TIMEZONE),

		'NotesToSelf': order.note,
		'PaypalTransID': order.paymentID,
		'PostService': postageServiceName(order.shippingMethod) || order.shippingMethod,
		'ClickCollect': !!(order.clickAndCollectRefID || (order.finalDestinationAddressLine1.startsWith('CnC ') || order.finalDestinationAddressLine2.startsWith('eCP:'))),
		'ClickCollectRefNum': order.clickAndCollectRefID || (order.finalDestinationAddressLine1.startsWith('CnC ') || order.finalDestinationAddressLine2.startsWith('eCP:')),
		'OrderLineID': !order.recordNum ? order.orderID : null,
		'Items': [],
	};

	// Items
	for (let item of order.items) {
		let itemData = {
			'ItemTitle': item.title,
			'ItemNum': item.itemID,
			'Quantity': item.quantity,
			'SalePrice': item.unitPrice,
			'TransID': item.transactionID,
			'VariationDetails': item.variationDetails || '',
			'SKU': item.sku || null,
			'partialrefund': item.partialrefund || null,
		}

		if (item.lineItemID) itemData.LineItemID = item.lineItemID;
		if (item.shippingPrice) itemData.ShippingPrice = item.shippingPrice;

		recordData.Items.push(itemData);
	}

	return recordData;
}

module.exports = orderToRecord;
