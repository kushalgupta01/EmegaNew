//  Discount Chemist
//  Order System

// Get sale record details from eBay
const eBaySession = require('./eBaySession');
const parseString = require('xml2js').parseString;

const getrecord = async function(req, res, next) {
	var store = req.query.store;
	var id = req.query.id;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (!store || !id) {
				output.result = 'Invalid store/record ID.';
				break;
			}

			var appID = 'Xiaochua-php-PRD-7f8fe589d-efab0546';
			var devID = 'ed491a72-b398-462c-a106-0feda6a0ba96';
			var certID = 'PRD-f8fe589d0d8c-1551-4606-a2cc-acd9';
			var siteID = 15;
			var tokens = {
				'eterminal': 'AgAAAA**AQAAAA**aAAAAA**kufHWw**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6AGkoChDpCGoQ2dj6x9nY+seQ**dMgEAA**AAMAAA**0GduP6CY2SyTII21Fr9pL3cvIe/9rMsnWpBUqTWdCyVG3JAHxFFlmawrEB/vogEF+jLMYWKe7V5f9oetXAb/S9mkEfkuttkADi9uBOKKWO/3xpfw2tGdo6W2CYjv6q43hLAYlAqyANCv9De8oUoyPrgdk87iwtdap73SobjpquGhW1EaDu9zFVUTV1i8o2C4s6lcFeTPZt+WLqziOR5cu76bFt8KNaShEv7uy3T5wGeOdg86o0+4vBapTvBdd0aVEgzvt1ASnjcrueZXEaiDAsGKPxcDFbbn5XAOOnWc4CWiawYHjocuEFyn5vc3Dgfv0LnxSsbwXaQp78SNsmmyl2hMlDhiT/FD2Kc7vBQ7YHBZte1vMBLXp0FkSDrCXVUgdAxL+JaZizHcSLyM2ZKcx44xQuNhggQ2DKDHfTs7CqB4uX1cdjgdnAPGV8SrB/wScYc0oNZmXtWy027zOnCGFVUzR3LPQhTi7XR1vi+TVUGEA9cG++VaxNQad6GjS5OWPDprWbRAI8o55D7C01aPkr+shSPlSgdgiNdt5G2r9cDmmUmYzGrHQxg0mMMy0oUZbLKJ13YB1JvB5wSm/QHzQDTqHV78GLvv7PGuOEeER42onqVvOUCbHN0sXSbB7kHIMdEP8RiP5QXbrBpM7vSTreGWI3lWZ6DWC8IDflZl+9EOWZ2ZUaNfkRQ69pDpHs6s4YMZTgrDvxCG8IZZr5BoxAUmiiGSH7pA+eDFDfEI9p7AbKKSTxHONQUJsrDwLrca'
			};

			if (!tokens.hasOwnProperty(store)) {
				output.result = 'Invalid store.';
				break;
			}
			

			// Get selling manager listing
			var apiCall = 'GetSellingManagerSoldListings';
			var requestBody = '<?xml version="1.0" encoding="utf-8" ?>\
			<GetSellingManagerSoldListingsRequest xmlns="urn:ebay:apis:eBLBaseComponents">\
			<RequesterCredentials><eBayAuthToken>'+tokens[store]+'</eBayAuthToken></RequesterCredentials>\
			<Search><SearchType>SaleRecordID</SearchType><SearchValue>'+id+'</SearchValue></Search>\
			<ErrorLanguage>en_AU</ErrorLanguage><WarningLevel>High</WarningLevel>\
			</GetSellingManagerSoldListingsRequest>';

			// Create eBay session
			var session = new eBaySession(devID, appID, certID, siteID);
			var responseXml = await session.sendHttpRequest(apiCall, requestBody);

			// Get sales record response
			if (!responseXml || responseXml.toUpperCase().includes('HTTP 404')) {
				output.result = 'Error sending request';
				break;
			}

			var responseJson = await new Promise((resolve, reject) => {
				parseString(responseXml, function (err, result) {
					//console.log(result);
					if (err) reject(err);
					resolve(result);
				});
			});

			if (!responseJson.GetSellingManagerSoldListingsResponse || !responseJson.GetSellingManagerSoldListingsResponse.SaleRecord) {
				// Some kind of error
				httpStatus = 503;
				output.result = responseJson;
				break;
			}

			var saleRecordData = responseJson.GetSellingManagerSoldListingsResponse.SaleRecord[0];

			if (!saleRecordData || (saleRecordData.constructor == Object && !Object.keys(saleRecordData).length)) {
				// Some kind of error
				httpStatus = 404;
				output.result = 'Sales record ID not found.';
				break;
			}
			//res.json(httpStatus, responseJson);


			// Get sale record/s
			var saleTransactions = saleRecordData.SellingManagerSoldTransaction;
			var buyerInfo = {};
			output.records = [];
			output.result = 'success';
			httpStatus = 200;
	
			// Prepare order items
			var OrderLineItemIDs = '';
			for (let i = 0; i < saleTransactions.length; i++) {
				OrderLineItemIDs += '<OrderID>'+saleTransactions[i].OrderLineItemID[0]+'</OrderID>';
			}

			// Get postage address and order transaction details data
			apiCall = 'GetOrderTransactions';
			requestBody = '<?xml version="1.0" encoding="utf-8" ?>\
			<GetOrderTransactionsRequest xmlns="urn:ebay:apis:eBLBaseComponents">\
			<RequesterCredentials><eBayAuthToken>'+tokens[store]+'</eBayAuthToken></RequesterCredentials>\
			<OrderIDArray>'+OrderLineItemIDs+'</OrderIDArray>\
			<ErrorLanguage>en_AU</ErrorLanguage><WarningLevel>High</WarningLevel>\
			</GetOrderTransactionsRequest>';

			session = new eBaySession(devID, appID, certID, siteID);
			responseXml = await session.sendHttpRequest(apiCall, requestBody);

			// Get sales record response
			if (!responseXml || responseXml.toUpperCase().includes('HTTP 404')) {
				output.result = 'Error sending request (2)';
				break;
			}

			responseJson = await new Promise((resolve, reject) => {
				parseString(responseXml, function (err, result) {
					if (err) reject(err);
					resolve(result);
				});
			});


			// Get sale record
			var orderTransactions = responseJson.GetOrderTransactionsResponse.OrderArray[0].Order;

			for (let i = 0; i < orderTransactions.length; i++) {
				let saleOrder = orderTransactions[i];
				let orderTrans = saleOrder.TransactionArray[0].Transaction[0];

				if (!Object.keys(buyerInfo).length) {
					var saleOrderShippingAddress = saleOrder.ShippingAddress[0];
					buyerInfo['UserID'] = saleRecordData.BuyerID[0].toString();
					buyerInfo['BuyerFullName'] = saleRecordData.ShippingAddress[0].Name[0].toString();
					buyerInfo['Email'] = saleRecordData.BuyerEmail[0].toString();
					buyerInfo['PhoneNum'] = saleOrderShippingAddress.Phone[0].toString();
					buyerInfo['BuyerAddress1'] = saleOrderShippingAddress.Street1[0].toString();
					buyerInfo['BuyerAddress2']  = saleOrderShippingAddress.Street2[0].toString();
					buyerInfo['BuyerCity'] = saleOrderShippingAddress.CityName[0].toString();
					buyerInfo['BuyerState'] = saleOrderShippingAddress.StateOrProvince[0].toString();
					buyerInfo['BuyerPostCode'] = saleOrderShippingAddress.PostalCode[0].toString();
					buyerInfo['BuyerCountry'] = saleOrderShippingAddress.CountryName[0].toString();
				}

				let record = {};
				record['RecordNum'] = saleTransactions[i].SaleRecordID[0].toString();
				record['ItemNum'] = saleTransactions[i].ItemID[0].toString();
				record['ItemTitle'] = saleTransactions[i].ItemTitle[0].toString();
				record['CustomLabel'] = null;
				record['Quantity'] = parseInt(saleTransactions[i].QuantitySold[0], 10);
				record['SalePrice'] = parseFloat(saleRecordData.SalePrice[0]._);
				record['Postage'] = parseFloat(saleRecordData.ActualShippingCost[0]._);
				record['Insurance'] = saleOrder.ShippingDetails[0].InsuranceFee ? parseFloat(saleOrder.ShippingDetails[0].InsuranceFee[0]) : 0;
				record['CashOnDeliveryFee'] = null;
				record['TotalPrice'] = parseFloat(saleRecordData.TotalAmount[0]._);
				record['PaymentMethod'] = orderTrans.Status[0].PaymentMethodUsed[0] || null;
				record['SaleDate'] = saleRecordData.CreationTime[0].toString();
				record['CheckoutDate'] = saleRecordData.CreationTime[0].toString();
				record['PaidDate'] = saleRecordData.OrderStatus[0].PaidTime ? saleRecordData.OrderStatus[0].PaidTime[0].toString() : null;
				record['PostDate'] = saleRecordData.OrderStatus[0].ShippedTime ? saleRecordData.OrderStatus[0].ShippedTime[0].toString() : null;

				record['FeedbackLeft'] = (saleRecordData.OrderStatus[0].FeedbackSent[0].toString() == 'true');
				record['FeedbackReceived'] = null;
				record['NotesToSelf'] = null;
				record['NotesFromBuyer'] = null;
				record['NotesToBuyer'] = null;
				record['UniqueProduceID'] = null;
				record['PrivateField'] = null;
				record['ProductIDType'] = null;
				record['ProductIDValue'] = null;
				record['ProductIDValue2'] = null;

				//record['PaypalTransID'] = saleOrder.OrderStatus[0].PayPalTransactionID ? saleOrder.OrderStatus[0].PayPalTransactionID[0].toString() : null;
				record['PaypalTransID'] = null;
				record['PostService'] = saleOrder.ShippingServiceSelected ? saleOrder.ShippingServiceSelected[0].ShippingService[0].toString() : null;
				record['CashOnDeliveryOpt'] = null;
				record['TransID'] = orderTrans.TransactionID[0].toString();
				record['OrderID'] = saleOrder.OrderID[0].toString();

				let variationData = orderTrans.Variation ? orderTrans.Variation[0].VariationSpecifics[0].NameValueList : null;
				if (variationData) {
					for (let vi = 0; vi < variationData.length; vi++) {
						variationData[vi] = variationData[vi].Name[0]+':'+variationData[vi].Value[0];
					}
				}

				record['VariationDetails'] = variationData;
				record['GlobalShippingProg'] = (saleOrder.IsMultiLegShipping[0].toString() == 'true');
				record['GlobalShippingRefID'] = record['GlobalShippingProg'] ? saleOrder.MultiLegShippingDetails[0].toString() : null;
				//console.log(saleOrder);
				//res.json(httpStatus, orderTrans);
				record['ClickCollect'] = (!!saleOrder.PickupMethodSelected && saleOrder.PickupMethodSelected[0].PickupMethod[0].toString() == 'PickUpDropOff');
				record['ClickCollectRefNum'] = record['ClickCollect'] ? saleOrder.ShippingAddress[0].AddressAttribute[0]._.toString() : null;

				/*record['PostAddress1'] = saleOrder.something.toString();
				record['PostAddress2'] = saleOrder.something.toString();
				record['PostCity'] = saleOrder.something.toString();
				record['PostState'] = saleOrder.something.toString();
				record['PostPostcode'] = saleOrder.something.toString();
				record['PostCountry'] = saleOrder.something.toString();*/
				record['EbayPlus'] = (orderTrans.eBayPlusTransaction[0].toString() == 'true');

				// Save record
				output.records.push(record);
			}

			output.buyerinfo = buyerInfo;
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
	}

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = getrecord;
