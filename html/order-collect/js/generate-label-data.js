
import {getRecordsOfType, getRepeatCustomerRecordList} from './orders.js';
import {getItemDetails} from './item-details.js';
import {round2} from '/common/tools.js';

// Generate eParcel/Fastway/flat-pack/other label output data for excel
async function generateLabelData(store, type, removeCombined = true, jsonOutput = false, repeat = 2, morelabel) {
	if (![ORDER_TYPE.AUSPOST, ORDER_TYPE.FASTWAY, ORDER_TYPE.EXPRESS, ORDER_TYPE.INTERNATIONAL, 
		ORDER_TYPE.FASTWAYFLATPACK, ORDER_TYPE.FASTWAYFLATPACK1KG, ORDER_TYPE.FASTWAYFLATPACK5KG, ORDER_TYPE.DELIVERE].includes(type)) {
		return 'unsupported type';
	}

	var recordList = getRecordsOfType(store, type, true, true, morelabel);
	recordList = getRepeatCustomerRecordList(recordList, repeat);

	var copyData = jsonOutput ? [] : '';
	var dataAdded = false;
	var comma = ', ', sep = '|';

	if (removeCombined) {
		// For connected records only keep the first one of them
		let newRecordList = [];
		let connectedRecordsDone = [];

		for (let num = 0; num < recordList.length; num++) {
			if (recordList[num] === undefined) continue;
			let store = recordList[num][0], recordNum = recordList[num][1];
			let connectedRecords = saleRecords[store].connected[recordNum];

			// Skip connected records that are already done
			let skipRecord = false;
			for (let co_i = 0; co_i < connectedRecordsDone.length; co_i++) {
				if (connectedRecordsDone[co_i][0] == store && connectedRecordsDone[co_i][1] == recordNum) {
					skipRecord = true;
					break;
				}
			}
			if (skipRecord) continue;

			// Add any connected records to the done list
			if (connectedRecords.length > 1) {
				Array.prototype.push.apply(connectedRecordsDone, connectedRecords);
			}

			newRecordList.push(recordList[num]);
		}

		recordList = newRecordList;
	}


	// Get item details
	var dataItems = await getItemDetails(recordList,true);

	// Initial label data
	if (!jsonOutput) {
		if (type == ORDER_TYPE.INTERNATIONAL) {
			// Header
			copyData += 'C_CONSIGNMENT_ID,C_POST_CHARGE_TO_ACCOUNT,C_CHARGE_CODE,C_MERCHANT_CONSIGNEE_CODE,C_CONSIGNEE_NAME,C_CONSIGNEE_BUSINESS_NAME,C_CONSIGNEE_ADDRESS_1,C_CONSIGNEE_ADDRESS_2,C_CONSIGNEE_ADDRESS_3,C_CONSIGNEE_ADDRESS_4,C_CONSIGNEE_SUBURB,C_CONSIGNEE_STATE_CODE,C_CONSIGNEE_POSTCODE,C_CONSIGNEE_COUNTRY_CODE,C_CONSIGNEE_PHONE_NUMBER,C_PHONE_PRINT_REQUIRED,C_CONSIGNEE_FAX_NUMBER,C_DELIVERY_INSTRUCTION,C_SIGNATURE_REQUIRED,C_PART_DELIVERY,C_COMMENTS,C_ADD_TO_ADDRESS_BOOK,C_CTC_AMOUNT,C_REF,C_REF_PRINT_REQUIRED,C_REF2,C_REF2_PRINT_REQUIRED,C_CHARGEBACK_ACCOUNT,C_RECURRING_CONSIGNMENT,C_RETURN_NAME,C_RETURN_ADDRESS_1,C_RETURN_ADDRESS_2,C_RETURN_ADDRESS_3,C_RETURN_ADDRESS_4,C_RETURN_SUBURB,C_RETURN_STATE_CODE,C_RETURN_POSTCODE,C_RETURN_COUNTRY_CODE,C_REDIR_COMPANY_NAME,C_REDIR_NAME,C_REDIR_ADDRESS_1,C_REDIR_ADDRESS_2,C_REDIR_ADDRESS_3,C_REDIR_ADDRESS_4,C_REDIR_SUBURB,C_REDIR_STATE_CODE,C_REDIR_POSTCODE,C_REDIR_COUNTRY_CODE,C_MANIFEST_ID,C_CONSIGNEE_EMAIL,C_EMAIL_NOTIFICATION,C_APCN,C_SURVEY,C_DELIVERY_SUBSCRIPTION,C_EMBARGO_DATE,C_SPECIFIED_DATE,C_DELIVER_DAY,C_DO_NOT_DELIVER_DAY,C_DELIVERY_WINDOW,C_CDP_LOCATION,C_IMPORTERREFNBR,C_SENDER_NAME,C_SENDER_CUSTOMS_REFERENCE,C_SENDER_BUSINESS_NAME,C_SENDER_ADDRESS_LINE1,C_SENDER_ADDRESS_LINE2,C_SENDER_ADDRESS_LINE3,C_SENDER_SUBURB_CITY,C_SENDER_STATE_CODE,C_SENDER_POSTCODE,C_SENDER_COUNTRY_CODE,C_SENDER_PHONE_NUMBER,C_SENDER_EMAIL,C_RTN_LABEL,A_ACTUAL_CUBIC_WEIGHT,A_LENGTH,A_WIDTH,A_HEIGHT,A_NUMBER_IDENTICAL_ARTS,A_CONSIGNMENT_ARTICLE_TYPE_DESCRIPTION,A_IS_DANGEROUS_GOODS,A_IS_TRANSIT_COVER_REQUIRED,A_TRANSIT_COVER_AMOUNT,A_CUSTOMS_DECLARED_VALUE,A_CLASSIFICATION_EXPLANATION,A_EXPORT_CLEARANCE_NUMBER,A_IS_RETURN_SURFACE,A_IS_RETURN_AIR,A_IS_ABANDON,A_IS_REDIRECT_SURFACE,A_IS_REDIRECT_AIR,A_PROD_CLASSIFICATION,A_IS_COMMERCIAL_VALUE,G_ORIGIN_COUNTRY_CODE,G_HS_TARIFF,G_DESCRIPTION,G_PRODUCT_TYPE,G_PRODUCT_CLASSIFICATION,G_QUANTITY,G_WEIGHT,G_UNIT_VALUE,G_TOTAL_VALUE\n';
			copyData += 'IGNORED,OPTIONAL,MANDATORY,MANDATORY/OPTIONAL REFER TO GUIDE,MANDATORY/OPTIONAL REFER TO GUIDE,OPTIONAL,MANDATORY/OPTIONAL REFER TO GUIDE,OPTIONAL,OPTIONAL,OPTIONAL,MANDATORY/OPTIONAL REFER TO GUIDE,MANDATORY/OPTIONAL REFER TO GUIDE,MANDATORY/OPTIONAL REFER TO GUIDE,MANDATORY/OPTIONAL REFER TO GUIDE,MANDATORY/OPTIONAL REFER TO GUIDE,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,IGNORED,MANDATORY/OPTIONAL REFER TO GUIDE,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,MANDATORY,MANDATORY/OPTIONAL REFER TO GUIDE,MANDATORY/OPTIONAL REFER TO GUIDE,MANDATORY/OPTIONAL REFER TO GUIDE,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,MANDATORY/OPTIONAL REFER TO GUIDE,MANDATORY/OPTIONAL REFER TO GUIDE,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,OPTIONAL,MANDATORY/OPTIONAL REFER TO GUIDE,OPTIONAL,MANDATORY/OPTIONAL REFER TO GUIDE,MANDATORY/OPTIONAL REFER TO GUIDE,MANDATORY,OPTIONAL,OPTIONAL,MANDATORY/OPTIONAL REFER TO GUIDE,MANDATORY/OPTIONAL REFER TO GUIDE,MANDATORY/OPTIONAL REFER TO GUIDE,MANDATORY/OPTIONAL REFER TO GUIDE\n';
		}
	}

	// Generate label data
	for (let rl_i = 0; rl_i < recordList.length; rl_i++) {
		let store = recordList[rl_i][0], recordNum = recordList[rl_i][1];
		let rowData = saleRecords[store].records[recordNum];
		let rowDataToday = saleRecords[store].today[recordNum];
		let connectedRecords = saleRecords[store].connected[recordNum];
		let factory = false;
		let spwarehouse = false;
		let morelabel = rowDataToday.morelabel;

		let boxDetails = rowDataToday.boxDetails;
		if (boxDetails) {
			boxDetails = JSON.parse(boxDetails);
		}

		// Label item data
		let itemData = {
			Quantity: [],
			IndivQuantity: [],
			ItemTitle: [],
			ItemNum: [],
			ItemSku: [],
			TransID: [],
			Weight: [],
			Price: [],
		};

		// Get item data for each connected order
		let itemDataWeightBlank = [];
		let hasBlankWeights = false;

		for (let co_i = 0; co_i < connectedRecords.length; co_i++) {
			let connectedRecord = connectedRecords[co_i];
			let connectedRowData = saleRecords[connectedRecord[0]].records[connectedRecord[1]];

			for (let it_i = 0; it_i < connectedRowData.Items.length; it_i++) {
				let recordItem = connectedRowData.Items[it_i];
				let itemEntries = itemDetails[recordItem.SKU];
				let itemEntriesIN = itemDetails[recordItem.ItemNum];

				itemData.ItemTitle.push(recordItem.ItemTitle);
				itemData.ItemNum.push(recordItem.ItemNum);
				if (dealConvert.hasOwnProperty(recordItem.SKU)) {
					itemData.ItemSku.push(recordItem.Quantity + ' x ' + dealConvert[recordItem.SKU]);
				}
				itemData.TransID.push(recordItem.TransID);
				itemData.Price.push(recordItem.Quantity * recordItem.SalePrice);

				// Quantity and weight
				let itemQuantity = 0; //recordItem.Quantity;
				let itemIndivQuantity = 0; // recordItem.Quantity;
				let itemWeight = 0;

				if (itemEntries) {
					// All entries should have the same quantity and weight
					/*itemQuantity = itemQuantity * itemEntries[0].quantity;
					itemWeight = itemEntries[0].weight;*/

					for (let item of itemEntries) {
						if (store == 71 && store == item.storeID) {
							itemQuantity = recordItem.Quantity * item.quantity;
							itemIndivQuantity = recordItem.Quantity * item.singleItemMultiple
							itemWeight = item.weight || 0.3;

						}
						if (item.num == recordItem.ItemNum) {
							itemQuantity = recordItem.Quantity * item.quantity;
							itemIndivQuantity = recordItem.Quantity * item.singleItemMultiple
							itemWeight = item.weight;
							if (store == 4 && item.factory == 1) {
								factory = true;
							}
							if (store == 6 && item.sku.startsWith('SP_')) {
								spwarehouse = true;
							}
							if (store == 8 || store == 74 || store == 91) {
								console.log(store);
								if (!itemWeight) itemWeight = 0.3;
							}
							break;
						}
					}


				}
				else if (itemEntriesIN) {
					//let variationDetails = getVariationDetails(recordItem);
					let itemName = recordItem.ItemTitle.trim();

					// Remove any flat pack symbols
					for (let fpSymbol in fpSymbols) {
						if (itemName[0] == fpSymbol) {
							itemName = itemName.substring(1).trim();
						}
					}

					for (let item of itemEntriesIN) {
						let itemDetailName = item.name.trim();

						// Remove any flat pack symbols
						for (let fpSymbol in fpSymbols) {
							if (itemDetailName[0] == fpSymbol) {
								itemDetailName = itemDetailName.substring(1).trim();
							}
						}

						// Change any flat pack symbols
						/*for (let fpSymbol in fpSymbolsConv) {
							if (itemDetailName[0] == fpSymbol) {
								itemDetailName = fpSymbolsConv[fpSymbol]+itemDetailName.substring(1);
							}
						}*/

						if (itemName == itemDetailName) {
							itemQuantity = recordItem.Quantity * item.quantity;
							itemIndivQuantity = recordItem.Quantity * item.singleItemMultiple
							itemWeight = item.sku ? item.weight : item.weight * item.quantity;
							if (store == 4 && item.factory == 1) {
								factory = true;
							}
							if (store == 6 && item.sku.startsWith('SP_')) {
								spwarehouse = true;
							}
							if (store == 8 || store == 71 || store == 74 || store == 91) {
								if (!itemWeight) itemWeight = 0.3;
							}
							break;
						}
					}
				} else {
					if (store == 8 || store == 71 || store == 74 || store == 91) {
						if (!itemWeight) itemWeight = 0.3;
					}
				}

				itemData.Quantity.push(itemQuantity);
				itemData.IndivQuantity.push(itemIndivQuantity || 1);
				itemData.Weight.push(itemWeight * recordItem.Quantity);
				itemDataWeightBlank.push(0);
				if (!itemWeight) hasBlankWeights = true;
			}
		}

		if (hasBlankWeights) {
			// For combined orders, set all weights to 0 if there are any items that have blank weights
			itemData.Weight = itemDataWeightBlank;
		}

		if (jsonOutput) {
			// Add additional details
			if (morelabel==0) {
				if (boxDetails && Array.isArray(boxDetails) && boxDetails.length>0) {
					for (let i=0; i<boxDetails.length; i++) {
						let newItemData = JSON.parse(JSON.stringify(itemData));
						newItemData.Weight = [parseFloat(boxDetails[i][1])];
						copyData.push({
							StoreID: store,
							Order: rowData,
							Items: newItemData,						
						});
					}
				} else {
					copyData.push({
						StoreID: store,
						Order: rowData,
						Items: itemData
					});
				}
			} else {
				for (let i=0; i<morelabel; i++) {
					copyData.push({
						StoreID: store,
						Order: rowData,
						Items: itemData
					});
				}
			}
			dataAdded = true;
		}
		else {
			// If the buyer name/address starts with/contains symbols then add a space to the start of them to disable Excel formulas
			let buyerFullName = rowData.BuyerFullName;
			let buyerAddress1 = rowData.BuyerAddress1.replace(reAddress[0], reAddress[1]);
			let buyerAddress2 = rowData.BuyerAddress2.replace(reAddress[0], reAddress[1]);
			if (buyerFullName.match(reSymbols)) buyerFullName = ' '+buyerFullName;
			if (buyerAddress1.match(reSymbols)) buyerAddress1 = ' '+buyerAddress1;
			if (buyerAddress2.match(reSymbols)) buyerAddress2 = ' '+buyerAddress2;
			let orderReference = rowData.SalesRecordID ? stores[store].recID+rowData.SalesRecordID : store+'-'+rowData.DatabaseID;

			if (type == ORDER_TYPE.AUSPOST || type == ORDER_TYPE.EXPRESS) {
				// eParcels
				/*let copyEntries = [
				    itemData.Weight.join(comma), // weight
					itemData.Quantity.join(comma), // quantity
					itemData.IndivQuantity.join(comma), // quantity
					itemData.ItemTitle.join(comma), // items
					'S', // Row type
					buyerFullName, // Recipient contact name
					rowData.BuyerCompany || '', // Recipient business name
					buyerAddress1, // Recipient address line 1
					buyerAddress2, // Recipient address line 2
					'', //Recipient address line 3
					rowData.BuyerCity, // Recipient suburb
					rowData.BuyerState, // Recipient state
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
					'', //Length
					'', //Width
					'', //Height
					'', //Parcel contents
					'', //Transit cover value				
				];*/

				let copyEntries = [
				    itemData.Weight.join(comma), // weight
					itemData.Quantity.join(comma), // quantity
					itemData.IndivQuantity.join(comma), // quantity
					itemData.ItemTitle.join(comma), // items
					'', // CONSIGNMENT ID
					'', // POST CHARGE TO ACCOUNT
					type == ORDER_TYPE.AUSPOST ? '3D83' : '3J83', // CHARGE CODE
					'', // MERCHANT CONSIGNEE CODE
					buyerFullName, // Recipient contact name
					rowData.BuyerCompany || '', // Recipient business name
					buyerAddress1, // Recipient address line 1
					buyerAddress2, // Recipient address line 2
					rowData.BuyerAddress3, //Recipient address line 3
					'', //Recipient address line 4
					rowData.BuyerCity, // Recipient suburb
					rowData.BuyerState, // Recipient state
					rowData.BuyerPostCode, // Recipient postcode
					'AU', // Recipient country
					rowData.PhoneNum, // Recipient phone number
					'Y', // C_PHONE_PRINT_REQUIRED
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
					'',  // RETURN_STATE_CODE
					'',  // RETURN_POSTCODE
					'',  // RETURN_COUNTRY_CODE
					'',  // REDIR_COMPANY_NAME
					'',  // REDIR_NAME
					'',  // REDIR_ADDRESS_1
					'',  // REDIR_ADDRESS_2
					'',  // REDIR_ADDRESS_3
					'',  // REDIR_ADDRESS_4
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
				if (rowData.PreOrders) copyEntries.push(rowData.PreOrders);
				copyData += copyEntries.join('\t')+'\r\n';
				dataAdded = true;
			}
			else if (type == ORDER_TYPE.FASTWAYFLATPACK || type == ORDER_TYPE.FASTWAYFLATPACK1KG) {
				// eParcels
				let copyEntries = [
					itemData.Weight.join(comma), // weight
					itemData.Quantity.join(comma), // quantity
					itemData.IndivQuantity.join(comma), // quantity
					itemData.ItemTitle.join(comma), // items
					buyerFullName, // recipient_name
					rowData.BuyerCompany || '', // recipient_company
					rowData.PhoneNum, // recipient_phone
					rowData.Email, // recipient_email
					buyerAddress1, // recipient_address1
					buyerAddress2, // recipient_address2	
					'', // recipient_address3
					rowData.BuyerCity, // recipient_city
					rowData.BuyerState, // recipient_state
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
					itemData.ItemNum.join(sep), // ebay_item_number
					itemData.TransID.join(sep), // ebay_transaction_id
				];
				if (rowData.PreOrders) copyEntries.push(rowData.PreOrders);
				copyData += copyEntries.join('\t')+'\r\n';
				dataAdded = true;
			}
			else if (type == ORDER_TYPE.FASTWAY || type == ORDER_TYPE.FASTWAYFLATPACK5KG) {
				// Fastway
				let packageType = 6;
				let weight = 1;
				
				if (type == ORDER_TYPE.FASTWAYFLATPACK5KG) {
					packageType = 17;
				    weight = 1;
				}

				if ( fastwayMetroCodes.includes(rowData.BuyerPostCode)) {
					packageType = 3;
				    weight = 20;
				}
				let copyEntries = [
					'', // Conote no
					'', // Multibusiness
					'', // Account no
					buyerFullName, // Contact
					rowData.BuyerCompany || '', // Company
					buyerAddress1, // ADD1
					buyerAddress2, // ADD2
					rowData.BuyerCity, // SUBURB
					rowData.BuyerState, // CITY
					rowData.BuyerPostCode, // PCODE
					rowData.Email, // EMAIL
					rowData.PhoneNum, // PHONE
					'', // MOBILE
					(rowData.DeliveryNote || '')+' '+itemData.ItemSku.join(comma), // SPECIAL1
					'', // SPECIAL2 (store == '4' && rowData.DeliveryNote) ? 'Signature Required' : 
					'', // SPECIAL3
					'', // ITEMS
					orderReference, // Reference
					packageType, // Packaging
					weight, // Weight
					'', // Width
					'', // Length
					'', // Height
					'1', // Count
					itemData.ItemNum.join(sep), // Item Num
					itemData.TransID.join(sep), // Trans ID
				];

				copyData += copyEntries.join('\t')+'\r\n';
				dataAdded = true;
			}
			else if (type == ORDER_TYPE.DELIVERE) {
				// Fastway
				let packageType = 6;
				let weight = 1;
				
				let copyEntries = [
					'', // Conote no
					'', // Multibusiness
					'', // Account no
					buyerFullName, // Contact
					rowData.BuyerCompany || '', // Company
					buyerAddress1, // ADD1
					buyerAddress2, // ADD2
					rowData.BuyerCity, // SUBURB
					rowData.BuyerState, // CITY
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
					weight, // Weight
					'', // Width
					'', // Length
					'', // Height
					'1', // Count
					itemData.ItemNum.join(sep), // Item Num
					itemData.TransID.join(sep), // Trans ID
				];

				copyData += copyEntries.join('\t')+'\r\n';
				dataAdded = true;
			}
			else if (type == ORDER_TYPE.INTERNATIONAL) {
				// console.log(itemData);
				// Aus Post International
				let quantity = itemData.Quantity.reduce((a,b) => a + b, 0);
				let weight = itemData.Weight.reduce((a,b) => a + b, 0);
				let price = itemData.Price.reduce((a,b) => a + b, 0);
				if (weight) weight = round2((weight + PACKAGING_WEIGHT) / 1000); // Total weight in kilograms
				let unitValue = 2;

				// Minimum mass excluding 0
				let minWeight = Number.POSITIVE_INFINITY;
				for (let itemWeight of itemData.Weight) {
					if (itemWeight && itemWeight < minWeight) minWeight = itemWeight;
				}
				if (minWeight === Number.POSITIVE_INFINITY) minWeight = 50; // Default to 50g

				let copyEntries = [
					'', // C_CONSIGNMENT_ID
					'', // C_POST_CHARGE_TO_ACCOUNT
					'PTI7', // C_CHARGE_CODE - INT'L STANDARD WITH SIGNATURE
					'', // C_MERCHANT_CONSIGNEE_CODE
					buyerFullName, // C_CONSIGNEE_NAME
					rowData.BuyerCompany || '', // C_CONSIGNEE_BUSINESS_NAME
					buyerAddress1, // C_CONSIGNEE_ADDRESS_1
					buyerAddress2, // C_CONSIGNEE_ADDRESS_2
					rowData.BuyerState.length > 10 ? rowData.BuyerState : '', // C_CONSIGNEE_ADDRESS_3
					'', // C_CONSIGNEE_ADDRESS_4
					rowData.BuyerCity, // C_CONSIGNEE_SUBURB
					rowData.BuyerState.length <= 10 ? rowData.BuyerState : '', // C_CONSIGNEE_STATE_CODE
					rowData.BuyerPostCode || '-', // C_CONSIGNEE_POSTCODE
					rowData.BuyerCountry, // C_CONSIGNEE_COUNTRY_CODE
					rowData.PhoneNum, // C_CONSIGNEE_PHONE_NUMBER
					'Y', // C_PHONE_PRINT_REQUIRED
					'', // C_CONSIGNEE_FAX_NUMBER
					rowDataToday.DeliveryNote || '', // C_DELIVERY_INSTRUCTION
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

				// Remove commas and quotation marks
				let reCsvData = /[,"]/g;
				for (let i = 0; i < copyEntries.length; i++) {
					copyEntries[i] = copyEntries[i].replace(reCsvData, '');
				}

				copyData += copyEntries.join(',')+'\r\n';
				dataAdded = true;
			}
		}
	}

	if (!dataAdded) return false;
	
	return copyData;
}

export {generateLabelData};
