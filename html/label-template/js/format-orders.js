// Discount Chemist
// Order System

import {round2} from '/common/tools.js';

const rePunctuation = /[\.,]+/g;
const reSpace = /\s+/g;
const reTrim = /\s{2,}/;

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

// Format order data
function formatOrder(type, rowData, options = {}, orderType) {
	//console.log(rowData);
	//console.log(rowData.Items.ItemNum[0]);
	//console.log(rowData.Order.BuyerAddress2);
	options = Object.assign({prepared: false, addStore: false}, options);
	var store = null;
	var orderReference = null;
	var copyData = null;
	var comma = ', ';
	var separator = '|';

	var itemData = {
		Quantity: [],
		IndivQuantity: [],
		ItemTitle: [],
		ItemNum: [],
		ItemSku: [],
		TransID: [],
		Weight: [],
	};

	// Label item data
	if (!options.addStore) {
		if (options.prepared) {
			store = rowData.StoreID;
			itemData = rowData.Items;
			rowData = rowData.Order;
		}
		else {
			for (let storeID in saleRecords) {
				if (saleRecords[storeID].records[rowData.DatabaseID]) {
					store = storeID;
					break;
				}
			}

			if (!store) {
				store = rowData.storeID;
			}

			// Process items
			for (let item of rowData.Items) {
				itemData.Quantity.push(item.Quantity);
				itemData.IndivQuantity.push(item.CartonQuantity);
				itemData.ItemTitle.push(item.ItemTitle);
				itemData.ItemNum.push(item.ItemNum);
				if (dealConvert.hasOwnProperty(item.SKU)) {
					itemData.ItemSku.push(item.Quantity + 'x'+ dealConvert[item.SKU]);
				}
				itemData.TransID.push(item.TransID);
				/*if (store == 8 || store == 71 || store == 74 || store == 91) {
					if (!item.Weight) item.Weight = 0.3;
				}*/
				itemData.Weight.push(item.Weight || 0);
			}
		}

		rowData = fixOrder(rowData);

		//console.log(store);

		orderReference = rowData.SalesRecordID ? stores[store].recID+rowData.SalesRecordID : store+'-'+rowData.DatabaseID;
	}

	if (type == PANEL_TYPE.AUSPOST || type == PANEL_TYPE.EXPRESS) {
		// eParcels
		let weight = itemData.Weight.reduce((a,b) => a + b, 0); // Should already include the packaging weight
		//if (weight) weight = round2(weight / 1000); // Convert to kilograms
		// if (weight) weight = weight<=0.5 ? 0.5 : Math.ceil(weight); // Convert to kilograms
		let BuyerState = trim(rowData.BuyerState).toUpperCase();
		if (statesShorter.hasOwnProperty(BuyerState)) BuyerState = statesShorter[BuyerState];

		let factory = false;
		let spwarehouse = false;

		
		for (let itemNo of itemData.ItemNum) {
			if (itemDetails[itemNo]) {
				if (store == 4 && itemDetails[itemNo][0].factory == 1) {
					factory = true;
				}
				if (store == 6 && itemDetails[itemNo][0].sku.startsWith('SP_')) {
					spwarehouse = true;
				}
			}
		}

		/*copyData = [
			weight || '', // weight
			itemData.Quantity.join(comma), // quantity
			itemData.IndivQuantity.join(comma), // quantity
			itemData.ItemTitle.join(comma), // items
			'S', // Row type
			trim(rowData.BuyerFullName), // Recipient contact name
			trim(rowData.BuyerCompany || ''), // Recipient business name
			trim(rowData.BuyerAddress1), // Recipient address line 1
			trim(rowData.BuyerAddress2), // Recipient address line 2
			'', //Recipient address line 3
			trim(rowData.BuyerCity), // Recipient suburb
			BuyerState, // Recipient state
			rowData.BuyerPostCode, // Recipient postcode
			'', // Send tracking email to recipient
			rowData.Email, // recipient_email
			rowData.PhoneNum, // Recipient phone number
			rowData.DeliveryNote || '', // Delivery/special instruction 1
			'', //Special instruction 2
			'', //Special instruction 3
			orderReference, // Sender reference 1
			'', //Sender reference 2
			type == ORDER_TYPE.AUSPOST ? '7D55' : '7J55', //Product id
			'', //Authority to leave
			'', //Safe drop 
			'', //Quantity
			'', //Packaging type
			'20', //Length
			'20', //Width
			'20', //Height
			'', //Parcel contents
			'', //Transit cover value			
		];*/

		copyData = [
			weight || '', // weight
			itemData.Quantity.join(comma), // quantity
			itemData.IndivQuantity.join(comma), // quantity
			itemData.ItemTitle.join(comma), // items
			'', // CONSIGNMENT ID
			'', // POST CHARGE TO ACCOUNT
			type == PANEL_TYPE.AUSPOST ? '3D83' : '3J83', // CHARGE CODE
			'', // MERCHANT CONSIGNEE CODE
			trim(rowData.BuyerFullName || ''), // Recipient contact name
			trim(rowData.BuyerCompany || ''), // Recipient business name
			trim(rowData.BuyerAddress1 || ''), // Recipient address line 1
			trim(rowData.BuyerAddress2 || ''), // Recipient address line 2
			rowData.BuyerAddress3, //Recipient address line 3
			'', //Recipient address line 4
			trim(rowData.BuyerCity || ''), // Recipient suburb
			BuyerState, // Recipient state
			rowData.BuyerPostCode, // Recipient postcode
			'AU', // Recipient country
			rowData.PhoneNum, // Recipient phone number
			'Y', // PHONE_PRINT_REQUIRED
			'', // Fax
			(rowData.DeliveryNote || '')+' '+itemData.ItemSku.join(comma), // Delivery/special instruction 1
			'N', // Signature Required
			'', // Part delivery
			'', // Comments
			'', // Add to address book
			'', // ctc amount
			orderReference, // Reference 1
			'Y', // C_REF_PRINT_REQUIRED
			'',  // Reference 2
			'',  // C_REF2_PRINT_REQUIRED
			store == 4 ? (factory ? 'Factory' : 'Intertrading') : (store==6 ? (spwarehouse ? 'SP' : 'EmegaOnline') : stores[store].storeID),  // CHARGEBACK_ACCOUNT
			'',  // RECURRING_CONSIGNMENT
			'',  // RETURN_NAME
			'',  // RETURN_ADDRESS_1
			'',  // RETURN_ADDRESS_2
			'',  // RETURN_ADDRESS_3
			'',  // RETURN_ADDRESS_4
			'',  // RETURN_SUBURB_CODE
			'',  // RETURN_STATE_CODE
			'',  // RETURN_POSTCODE
			'',  // RETURN_COUNTRY_CODE
			'',  // REDIR_COMPANY_NAME
			'',  // REDIR_NAME
			'',  // REDIR_ADDRESS_1
			'',  // REDIR_ADDRESS_2
			'',  // REDIR_ADDRESS_3
			'',  // REDIR_ADDRESS_4
			'',  // REDIR_SUBURB
			'',  // REDIR_STATE_CODE
			'',  // REDIR_POSTCODE
			'',  // REDIR_COUNTRY_CODE
			'',  // C_MANIFEST_ID
			rowData.Email, // recipient_email
			'Y', // C_EMAIL_NOTIFICATION
	
			'', // C_APCN
			'', // C_SURVEY
			'', // C_DELIVERY_SUBSCRIPTION
			'', // C_EMBARGO_DATE
			'', // C_SPECIFIED_DATE
			'', // C_DELIVER_DAY 
			'', // C_DO_NOT_DELIVER_DAY
			'', // C_DELIVERY_WINDOW
			'', // C_CDP_LOCATION
			'', // C_ID25
			
			'', // A_LENGTH
			'', // A_WIDTH
			'', // A_HEIGHT
			'', // A_NUMBER_IDENTICAL_ARTS
			'', // A_CONSIGNMENT_ARTICLE_TYPE_DESCRIPTION
			'', // A_IS_DANGEROUS_GOODS
			'', // A_IS_TRANSIT_COVER_REQUIRED
			'', // A_TRANSIT_COVER_AMOUNT

			'', // G_ORIGIN_COUNTRY_CODE
			'', // G_HS_TARIFF
			'', // G_DESCRIPTION
			'', // G_PRODUCT_TYPE
			'', // G_PRODUCT_CLASSIFICATION
			'', // G_QUANTITY
			'', // G_WEIGHT
			'', // G_UNIT_VALUE
			'', // G_TOTAL_VALUE
		];
	}
	else if (type == PANEL_TYPE.FWFP) {
		// eParcels
		let weight = itemData.Weight.reduce((a,b) => a + b, 0); // Should already include the packaging weight
		//if (weight) weight = round2(weight / 1000); // Convert to kilograms
		if (weight) weight = weight<=0.5 ? 0.5 : Math.ceil(weight); // Convert to kilograms

		copyData = [
			orderType == ORDER_TYPE.FASTWAYFLATPACK ? '0.3' : orderType == ORDER_TYPE.FASTWAYFLATPACK1KG ? '1' : orderType == ORDER_TYPE.FASTWAYFLATPACK5KG ? '5' : weight || '', // weight (kilograms)
			itemData.Quantity.join(comma), // carton quantity
			itemData.IndivQuantity.join(comma), // quantity
			itemData.ItemTitle.join(comma), // items
			trim(rowData.BuyerFullName || ''), // recipient_name
			trim(rowData.BuyerCompany || ''), // recipient_company
			rowData.PhoneNum, // recipient_phone
			rowData.Email, // recipient_email
			trim(rowData.BuyerAddress1 || ''), // recipient_address1
			trim(rowData.BuyerAddress2 || ''), // recipient_address2	
			'', // recipient_address3
			trim(rowData.BuyerCity || ''), // recipient_city
			trim(rowData.BuyerState || ''), // recipient_state
			rowData.BuyerPostCode, // recipient_postcode
			'', // description
			rowData.DeliveryNote || '', // delivery_instruction
			orderReference, // customer_reference
			'Y', // email_notification
			'', // sender_name
			'', // sender_company
			'', // sender_phone
			'', // sender_email
			'', // sender_address1
			'', // sender_address2
			'', // sender_address3
			'', // sender_city
			'', // sender_state
			'', // sender_postcode
			itemData.ItemNum.join(separator), // ebay_item_number
			itemData.TransID.join(separator), // ebay_transaction_id
		];
	}
	else if (type == PANEL_TYPE.REPEATCUSTOMER) {
		// eParcels
		let weight = itemData.Weight.reduce((a,b) => a + b, 0); // Should already include the packaging weight
		//if (weight) weight = round2(weight / 1000); // Convert to kilograms
		if (weight) weight = weight<=0.5 ? 0.5 : Math.ceil(weight); // Convert to kilograms

		copyData = [
			weight || '', // weight (kilograms)
			itemData.Quantity.join(comma), // carton quantity
			itemData.IndivQuantity.join(comma), // quantity
			itemData.ItemTitle.join(comma), // items
			trim(rowData.BuyerFullName || ''), // recipient_name
			trim(rowData.BuyerCompany || ''), // recipient_company
			rowData.PhoneNum, // recipient_phone
			rowData.Email, // recipient_email
			trim(rowData.BuyerAddress1 || ''), // recipient_address1
			trim(rowData.BuyerAddress2 || ''), // recipient_address2	
			'', // recipient_address3
			trim(rowData.BuyerCity || ''), // recipient_city
			trim(rowData.BuyerState || ''), // recipient_state
			rowData.BuyerPostCode, // recipient_postcode
			'', // description
			rowData.DeliveryNote || '', // delivery_instruction
			orderReference, // customer_reference
			'Y', // email_notification
			'', // sender_name
			'', // sender_company
			'', // sender_phone
			'', // sender_email
			'', // sender_address1
			'', // sender_address2
			'', // sender_address3
			'', // sender_city
			'', // sender_state
			'', // sender_postcode
			itemData.ItemNum.join(separator), // ebay_item_number
			itemData.TransID.join(separator), // ebay_transaction_id
			rowData.PreOrders,
		];
	}
	else if (type == PANEL_TYPE.FASTWAY) {
		// Fastway
		let packageType = 6;
		let weight = 1;
		

		if (itemData.ItemNum.length == 1) {
			let items = rowData.Items;
			if (items.length == 1) {
				let sku = items[0].SKU || '';
				let itemNum = items[0].ItemNum || '';
				let itemTitle = items[0].ItemTitle || '';
				let quantity = items[0].Quantity || '';

				if (quantity == 1) {
					if (itemDetails[itemNum]) {
						let itemDs = itemDetails[itemNum];
						for (let ite in itemDs) {
							if (itemDs[ite].storeID != store) continue;
							if (itemDs[ite].sku) {
								if (itemDs[ite].sku == sku && itemDs[ite].satchel == 'A5') {
									//packageType = 7;
					    			weight = 1;
					    			break;
								}
							}
						}
					}else if (itemDetails[sku]){
						let itemDs = itemDetails[sku];
						for (let ite in itemDs) {
							//console.log(ite.storeID);
							//console.log(store);
							if (itemDs[ite].storeID != store) continue;
							if (itemDs[ite].num && itemDs[ite].num != "") {
								if (itemDs[ite].num == itemNum && itemDs[ite].satchel == 'A5') {
									//packageType = 7;
					    			weight = 1;
					    			break;
								}
							}else if (store == 12 || store == 11) {
								//console.log(itemDs[ite].name);
								if (itemDs[ite].name && itemDs[ite].name != "") {
									if (itemDs[ite].name == itemTitle && itemDs[ite].satchel == 'A5') {
										//packageType = 7;
						    			weight = 1;
						    			break;
									}
								}
							}
						}
					}
				}

			}
		}
		
		

		//console.log(type);
		if (orderType == ORDER_TYPE.FASTWAYFLATPACK5KG) {
			packageType = 17;
		    weight = 1;
		}

		if ( fastwayMetroCodes.includes(rowData.BuyerPostCode)) {
			packageType = 3;
		    weight = 20;
		}

		copyData = [
			'', // Conote no
			'', // Multibusiness
			'', // Account no
			trim(rowData.BuyerFullName || ''), // Contact
			trim(rowData.BuyerCompany || ''), // Company
			trim(rowData.BuyerAddress1 || ''), // ADD1
			trim(rowData.BuyerAddress2 || ''), // ADD2
			trim(rowData.BuyerCity || ''), // SUBURB
			trim(rowData.BuyerState || ''), // CITY
			rowData.BuyerPostCode, // PCODE
			rowData.Email, // EMAIL
			rowData.PhoneNum, // PHONE
			'', // MOBILE
			(rowData.DeliveryNote || '') + ' '+itemData.ItemSku.join(comma),  // SPECIAL1
			'', // SPECIAL2 (store == '4' && rowData.DeliveryNote) ? 'Signature Required' : 
			'', // SPECIAL3
			'', // ITEMS
			orderReference, // Reference
			packageType, // Packaging
			weight, // Weight (kilograms)
			'', // Width
			'', // Length
			'', // Height
			'1', // Count
			//itemData.ItemNum.join(separator), // Item Num
			//itemData.TransID.join(separator), // Trans ID
		];
	}
	else if (type == PANEL_TYPE.DELIVERE) {
		// Fastway
		let packageType = 6;
		let weight = 1;

		copyData = [
			'', // Conote no
			'', // Multibusiness
			'', // Account no
			trim(rowData.BuyerFullName || ''), // Contact
			trim(rowData.BuyerCompany || ''), // Company
			trim(rowData.BuyerAddress1 || ''), // ADD1
			trim(rowData.BuyerAddress2 || ''), // ADD2
			trim(rowData.BuyerCity || ''), // SUBURB
			trim(rowData.BuyerState || ''), // CITY
			rowData.BuyerPostCode, // PCODE
			rowData.Email, // EMAIL
			rowData.PhoneNum, // PHONE
			'', // MOBILE
			rowData.DeliveryNote || '', // SPECIAL1
			'', // SPECIAL2 (store == '4' && rowData.DeliveryNote) ? 'Signature Required' : 
			'', // SPECIAL3
			'', // ITEMS
			orderReference, // Reference
			packageType, // Packaging
			weight, // Weight (kilograms)
			'', // Width
			'', // Length
			'', // Height
			'1', // Count
			//itemData.ItemNum.join(separator), // Item Num
			//itemData.TransID.join(separator), // Trans ID
		];
	}
	else if (type == PANEL_TYPE.INTERNATIONAL) {
		//console.log(itemData);
		// eParcels
		let weight = itemData.Weight.reduce((a,b) => a + b, 0); // Should already include the packaging weight
		let price = itemData.Price.reduce((a,b) => a + b, 0); // Should already include the packaging weight
		//if (weight) weight = round2(weight / 1000); // Convert to kilograms
		if (weight) weight = weight<=0.5 ? 0.5 : Math.ceil(weight); // Convert to kilograms
		let BuyerState = trim(rowData.BuyerState).toUpperCase();
		if (statesShorter.hasOwnProperty(BuyerState)) BuyerState = statesShorter[BuyerState];

		let factory = false;
		let spwarehouse = false;

		
		for (let itemNo of itemData.ItemNum) {
			if (itemDetails[itemNo]) {
				if (store == 4 && itemDetails[itemNo][0].factory == 1) {
					factory = true;
				}
				if (store == 6 && itemDetails[itemNo][0].sku.startsWith('SP_')) {
					spwarehouse = true;
				}
			}
		}


/*		copyData = [
			weight || '', // weight
			itemData.Quantity.join(comma), // quantity
			itemData.IndivQuantity.join(comma), // quantity
			itemData.ItemTitle.join(comma), // items
			'', // CONSIGNMENT ID
			'', // POST CHARGE TO ACCOUNT
			orderType == ORDER_TYPE.AUSPOST ? '7D83' : '7J83', // CHARGE CODE
			'', // MERCHANT CONSIGNEE CODE
			trim(rowData.BuyerFullName || ''), // Recipient contact name
			trim(rowData.BuyerCompany || ''), // Recipient business name
			trim(rowData.BuyerAddress1 || ''), // Recipient address line 1
			trim(rowData.BuyerAddress2 || ''), // Recipient address line 2
			rowData.BuyerAddress3, //Recipient address line 3
			'', //Recipient address line 4
			trim(rowData.BuyerCity || ''), // Recipient suburb
			BuyerState, // Recipient state
			rowData.BuyerPostCode, // Recipient postcode
			'AU', // Recipient country
			rowData.PhoneNum, // Recipient phone number
			'Y', // PHONE_PRINT_REQUIRED
			'', // Fax
			rowData.DeliveryNote || '', // Delivery/special instruction 1
			'N', // Signature Required
			'', // Part delivery
			'', // Comments
			'', // Add to address book
			'', // ctc amount
			orderReference, // Reference 1
			'Y', // C_REF_PRINT_REQUIRED
			'',  // Reference 2
			'',  // C_REF2_PRINT_REQUIRED
			store == 4 ? (factory ? 'Factory' : 'Intertrading') : (store==6 ? (spwarehouse ? 'SP' : 'EmegaOnline') : stores[store].storeID),  // CHARGEBACK_ACCOUNT
			'',  // RECURRING_CONSIGNMENT
			'',  // RETURN_NAME
			'',  // RETURN_ADDRESS_1
			'',  // RETURN_ADDRESS_2
			'',  // RETURN_ADDRESS_3
			'',  // RETURN_ADDRESS_4
			'',  // RETURN_SUBURB_CODE
			'',  // RETURN_STATE_CODE
			'',  // RETURN_POSTCODE
			'',  // RETURN_COUNTRY_CODE
			'',  // REDIR_COMPANY_NAME
			'',  // REDIR_NAME
			'',  // REDIR_ADDRESS_1
			'',  // REDIR_ADDRESS_2
			'',  // REDIR_ADDRESS_3
			'',  // REDIR_ADDRESS_4
			'',  // REDIR_SUBURB
			'',  // REDIR_STATE_CODE
			'',  // REDIR_POSTCODE
			'',  // REDIR_COUNTRY_CODE
			'',  // C_MANIFEST_ID
			rowData.Email, // recipient_email
			'Y', // C_EMAIL_NOTIFICATION
	
			'', // C_APCN
			'', // C_SURVEY
			'', // C_DELIVERY_SUBSCRIPTION
			'', // C_EMBARGO_DATE
			'', // C_SPECIFIED_DATE
			'', // C_DELIVER_DAY 
			'', // C_DO_NOT_DELIVER_DAY
			'', // C_DELIVERY_WINDOW
			'', // C_CDP_LOCATION
			'', // C_ID25
			
			'', // A_LENGTH
			'', // A_WIDTH
			'', // A_HEIGHT
			'', // A_NUMBER_IDENTICAL_ARTS
			'', // A_CONSIGNMENT_ARTICLE_TYPE_DESCRIPTION
			'', // A_IS_DANGEROUS_GOODS
			'', // A_IS_TRANSIT_COVER_REQUIRED
			'', // A_TRANSIT_COVER_AMOUNT

			'', // G_ORIGIN_COUNTRY_CODE
			'', // G_HS_TARIFF
			'', // G_DESCRIPTION
			'', // G_PRODUCT_TYPE
			'', // G_PRODUCT_CLASSIFICATION
			'', // G_QUANTITY
			'', // G_WEIGHT
			'', // G_UNIT_VALUE
			'', // G_TOTAL_VALUE
		];*/

		copyData = [
		    '', // C_CONSIGNMENT_ID
			'', // C_POST_CHARGE_TO_ACCOUNT
			'PTI7', // C_CHARGE_CODE - INT'L STANDARD WITH SIGNATURE
			'', // C_MERCHANT_CONSIGNEE_CODE
			trim(rowData.BuyerFullName || ''), // Recipient contact name
			trim(rowData.BuyerCompany || ''), // Recipient business name
			trim(rowData.BuyerAddress1 || ''), // Recipient address line 1
			trim(rowData.BuyerAddress2 || ''), // Recipient address line 2
			rowData.BuyerAddress3, //Recipient address line 3
			'', //Recipient address line 4
			trim(rowData.BuyerCity || ''), // Recipient suburb
			BuyerState, // Recipient state
			rowData.BuyerPostCode, // Recipient postcode
			rowData.BuyerCountry, // Recipient country
			rowData.PhoneNum, // Recipient phone number
			'Y', // PHONE_PRINT_REQUIRED
			'', // Fax
			rowData.DeliveryNote || '', // Delivery/special instruction 1
			'Y', // C_SIGNATURE_REQUIRED
			'', // C_PART_DELIVERY
			'', // C_COMMENTS
			'', // C_ADD_TO_ADDRESS_BOOK
			'', // C_CTC_AMOUNT
			orderReference, // C_REF
			'Y', // C_REF_PRINT_REQUIRED
			'', // C_REF2
			'', // C_REF2_PRINT_REQUIRED
			store == 4 ? (factory ? 'Factory' : 'Intertrading') : (store==6 ? (spwarehouse ? 'SP' : 'EmegaOnline') : stores[store].storeID), // C_CHARGEBACK_ACCOUNT
			'N', // C_RECURRING_CONSIGNMENT
			'', // C_RETURN_NAME
			'', // C_RETURN_ADDRESS_1
			'', // C_RETURN_ADDRESS_2
			'', // C_RETURN_ADDRESS_3
			'', // C_RETURN_ADDRESS_4
			'', // C_RETURN_SUBURB
			'', // C_RETURN_STATE_CODE
			'', // C_RETURN_POSTCODE
			'', // C_RETURN_COUNTRY_CODE
			'', // C_REDIR_COMPANY_NAME
			'', // C_REDIR_NAME
			'', // C_REDIR_ADDRESS_1
			'', // C_REDIR_ADDRESS_2
			'', // C_REDIR_ADDRESS_3
			'', // C_REDIR_ADDRESS_4
			'', // C_REDIR_SUBURB
			'', // C_REDIR_STATE_CODE
			'', // C_REDIR_POSTCODE
			'', // C_REDIR_COUNTRY_CODE
			'', // C_MANIFEST_ID
			rowData.Email, // C_CONSIGNEE_EMAIL
			'DESPATCH', // C_EMAIL_NOTIFICATION
			'', // C_APCN
			'', // C_SURVEY
			'', // C_DELIVERY_SUBSCRIPTION
			'', // C_EMBARGO_DATE
			'', // C_SPECIFIED_DATE
			'', // C_DELIVER_DAY
			'', // C_DO_NOT_DELIVER_DAY
			'', // C_DELIVERY_WINDOW
			'', // C_CDP_LOCATION
			orderReference, // C_IMPORTERREFNBR
			'', // C_SENDER_NAME
			'', // C_SENDER_CUSTOMS_REFERENCE
			'', // C_SENDER_BUSINESS_NAME
			'', // C_SENDER_ADDRESS_LINE1
			'', // C_SENDER_ADDRESS_LINE2
			'', // C_SENDER_ADDRESS_LINE3
			'', // C_SENDER_SUBURB_CITY
			'', // C_SENDER_STATE_CODE
			'', // C_SENDER_POSTCODE
			'', // C_SENDER_COUNTRY_CODE
			'', // C_SENDER_PHONE_NUMBER
			'', // C_SENDER_EMAIL
			'', // C_RTN_LABEL
			weight.toString(), // A_ACTUAL_CUBIC_WEIGHT
			'', // A_LENGTH
			'', // A_WIDTH
			'', // A_HEIGHT
			'', // A_NUMBER_IDENTICAL_ARTS
			'', // A_CONSIGNMENT_ARTICLE_TYPE_DESCRIPTION
			'', // A_IS_DANGEROUS_GOODS
			'', // A_IS_TRANSIT_COVER_REQUIRED
			'', // A_TRANSIT_COVER_AMOUNT
			price.toString(), //(quantity * unitValue).toString(), // A_CUSTOMS_DECLARED_VALUE
			'', // A_CLASSIFICATION_EXPLANATION
			'', // A_EXPORT_CLEARANCE_NUMBER
			'', // A_IS_RETURN_SURFACE
			'', // A_IS_RETURN_AIR
			'', // A_IS_ABANDON
			'', // A_IS_REDIRECT_SURFACE
			'', // A_IS_REDIRECT_AIR
			'GIFT', // A_PROD_CLASSIFICATION
			'', // A_IS_COMMERCIAL_VALUE
			'AU', // G_ORIGIN_COUNTRY_CODE
			'', // G_HS_TARIFF
			'Gift', // G_DESCRIPTION
			'', // G_PRODUCT_TYPE
			'', // G_PRODUCT_CLASSIFICATION
			'1', //quantity.toString(), // G_QUANTITY
			weight.toString(), //round2(minWeight / 1000), // G_WEIGHT
			price.toString(), //unitValue.toString(), // G_UNIT_VALUE
			price.toString(), //(quantity * unitValue).toString(), // G_TOTAL_VALUE
		];
	}
	else {
		page.notification.show('Error: Unknown postage type.');
	}
	return copyData;
}

function fixOrder(rowData) {
	// Trim
	let trimEntries = ['BuyerFullName', 'BuyerAddress1', 'BuyerAddress2', 'BuyerCity', 'BuyerState'];
	for (let entry of trimEntries) {
		rowData[entry] = trim(rowData[entry] || '');
	}

	// Try to fix surburb
	let postcode = parseInt(rowData.BuyerPostCode.trim(), 10).toString();
	let suburbs = postData.postcodes[postcode];

	if (suburbs && !suburbs[rowData.BuyerCity.toLowerCase()]) {
		let suburbsNS = {}; // Suburbs without spaces
		let found = null;

		for (let suburb in suburbs) {
			suburbsNS[suburb.replace(reSpace, '')] = suburb; // Value is original suburb name
		}

		// Check buyer suburb/city, and address 2, address 1 if needed
		fieldLoop:
		for (let field of ['BuyerCity', 'BuyerAddress2', 'BuyerAddress1']) {
			let cityTrimmed = trim(rowData[field].replace(rePunctuation, ' '));

			// Split up the address into progressively smaller portions, sorted by length
			let partsData = cityTrimmed.toLowerCase().split(' ');
			let addressParts = [];

			let partsTemp = partsData.slice(0);
			while (partsTemp.length) {
				addressParts.push(partsTemp.join(' '));
				partsTemp.shift();
			}

			partsTemp = partsData.slice(0, -1);
			while (partsTemp.length) {
				addressParts.push(partsTemp.join(' '));
				partsTemp.pop();
			}

			addressParts.sort((a, b) => b.length - a.length);

			// Check each address portion
			for (let part of addressParts) {
				if (suburbs[part]) {
					found = [part, field];
					break fieldLoop;
				}
				else {
					// Check without spaces
					let buyerSuburb = part.replace(reSpace, '').toLowerCase();
					for (let suburb in suburbsNS) {
						if (suburb == buyerSuburb) {
							found = [suburbsNS[suburb].toUpperCase(), field];
							break fieldLoop;
						}
					}
				}
			}
		}

		if (found) {
			let cityOriginal = rowData.BuyerCity;
			rowData.BuyerCity = found[0];

			if (found[1] == 'BuyerAddress2') {
				// Swap city and address 2
				rowData.BuyerAddress2 = rowData.BuyerAddress2 + ', ' + cityOriginal;
			}
			else if (found[1] == 'BuyerAddress1' || found[1] == 'BuyerCity') {
				// Put the original city into address 2
				rowData.BuyerAddress2 = !rowData.BuyerAddress2 ? cityOriginal : rowData.BuyerAddress2 + ',' + cityOriginal;
			}
		}
	}

	return rowData;
}

function trim(s = '') {
	return s.trim().replace(reTrim, ' ');
}

export {formatOrder};
