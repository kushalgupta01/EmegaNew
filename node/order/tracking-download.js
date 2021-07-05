const {Config} = require('./config');
const Database = require('./connection');
const { getConversionData } = require('./order-convert');


const downloadTracking = async function(req, res, next) {
	conn = new Database(dbconn);

	var store = req.params.store || null;
	var substore = req.params.substore || null;
	var datefrom = req.query.datefrom || null;
	var dateto = req.query.dateto || null;

	var total;

	var output = {result: null};
	var httpStatus = 400;

	do {
		if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store) && store != 30)) {
			output.result = 'Invalid store.';
			break;
		}
		
		try{
			await conn.connect();
			let sql;

			if (datefrom && dateto) {
				if (store==30) {
					sql = 'SELECT o.store, o.orderID, o.salesRecordID, JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.full_name") as name, '
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.street_1") as addr1,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.street_2") as addr2,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.city") as city,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.state") as state,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.zip") as postcode,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.country_iso2") as country,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.billing_address"), "$.email") as email,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.billing_address"), "$.phone") as phone,'
					+ ' JSON_EXTRACT(o.data, "$.items") as items,'
					+ ' c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID ' 
					+ 'and (o.store = 31 or o.store = 32 or o.store = 33 or o.store = 35) ' + ' AND ( (o.createdDate between "' + datefrom + '" AND "' + dateto + '") OR (c.packedTime between "' + datefrom + '" AND "' + dateto + '")) ORDER BY salesRecordID, store ' ;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.WOOCOMMERCE) {
					sql = 'SELECT o.store, o.orderID, o.salesRecordID, JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.full_name") as name, '
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.address_1") as addr1,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.address_2") as addr2,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.city") as city,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.state") as state,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.postcode") as postcode,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.country") as country,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.billing"), "$.email") as email,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.billing"), "$.phone") as phone,'
					+ ' JSON_EXTRACT(o.data, "$.line_items") as items,'
					+ ' c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID ' 
					+ 'and o.store = ' + store + ' AND ( (o.createdDate between "' + datefrom + '" AND "' + dateto + '") OR (c.packedTime between "' + datefrom + '" AND "' + dateto + '")) ORDER BY salesRecordID' ;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.EBAY || Config.STORES[store].service == Config.SERVICE_IDS.NEWSERVICE) {
					sql = 'SELECT o.store, o.salesRecordID, o.orderID, JSON_EXTRACT(o.data, "$.finalDestinationAddressName") as name, '
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationAddressLine1") as addr1,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationAddressLine2") as addr2,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationCity") as city,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationStateOrProvince") as state,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationPostalCode") as postcode,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationCountry") as country,'
					+ 'JSON_EXTRACT(o.data, "$.buyerEmail") as email,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationAddressPhone") as phone,'
					+ 'JSON_EXTRACT(o.data, "$.paymentID") as paymentID,'
					+ 'JSON_EXTRACT(o.data, "$.paymentTotal") as paymentTotal,'
					+ ' JSON_EXTRACT(o.data, "$.items") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID and o.store = ' 
					+ store + ' AND ( (o.createdDate between "' + datefrom + '" AND "' + dateto + '") OR (c.packedTime between "' + datefrom + '" AND "' + dateto + '")) ORDER BY name' ;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.NETO) {
					sql = 'SELECT o.store, o.salesRecordID, o.orderID, JSON_EXTRACT(o.data, "$.ShipFullName") as name, '
					+ 'JSON_EXTRACT(o.data, "$.ShipStreetLine1") as addr1,'
					+ 'JSON_EXTRACT(o.data, "$.ShipStreetLine2") as addr2,'
					+ 'JSON_EXTRACT(o.data, "$.ShipCity") as city,'
					+ 'JSON_EXTRACT(o.data, "$.ShipState") as state,'
					+ 'JSON_EXTRACT(o.data, "$.ShipPostCode") as postcode,'
					+ 'JSON_EXTRACT(o.data, "$.ShipCountry") as country,'
					+ 'JSON_EXTRACT(o.data, "$.Email") as email,'
					+ 'JSON_EXTRACT(o.data, "$.ShipPhone") as phone,'
					+ 'JSON_EXTRACT(o.data, "$.ShippingTotal") as ShippingTotal,'
					+ 'JSON_EXTRACT(o.data, "$.SalesChannel") as SalesChannel,'
					+ ' JSON_EXTRACT(o.data, "$.OrderLine") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID and o.store = ' 
					+ store + ' AND ( (o.createdDate between "' + datefrom + '" AND "' + dateto + '") OR (c.packedTime between "' + datefrom + '" AND "' + dateto + '")) ORDER BY name' ;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.SHOPIFY) {
					sql = 'SELECT o.store, o.orderID, o.salesRecordID, JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.name") as name, '
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.address1") as addr1,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.address2") as addr2,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.city") as city,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.province") as state,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.zip") as postcode,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.country_code") as country,'
					+ 'JSON_EXTRACT(o.data, "$.email") as email,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.phone") as phone,'
					+ ' JSON_EXTRACT(o.data, "$.line_items") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID and o.store = ' 
					+ store + ' AND ( (o.createdDate between "' + datefrom + '" AND "' + dateto + '") OR (c.packedTime between "' + datefrom + '" AND "' + dateto + '")) ORDER BY name' ;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.CATCH) {
					sql = 'SELECT o.store, o.orderID, o.salesRecordID, JSON_EXTRACT(o.data, "$.ShipFullName") as name, '
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.street_1") as addr1,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.street_2") as addr2,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.city") as city,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.state") as state,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.zip_code") as postcode,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.country_iso_code") as country,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.phone") as phone,'
					+ 'JSON_EXTRACT(o.data, "$.total_price") as paymentTotal,'
					+ ' JSON_EXTRACT(o.data, "$.order_lines") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID and o.store = ' 
					+ store + ' AND ( (o.createdDate between "' + datefrom + '" AND "' + dateto + '") OR (c.packedTime between "' + datefrom + '" AND "' + dateto + '")) ORDER BY name' ;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.KOGAN) {
					sql = 'SELECT o.store, o.orderID, o.salesRecordID, JSON_EXTRACT(o.data, "$.ShipFullName") as name, '
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.AddressLine1") as addr1,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.AddressLine2") as addr2,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.City") as city,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.StateOrProvince") as state,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.PostalCode") as postcode,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.Country") as country,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.EmailAddress") as email,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.DaytimePhone") as phone,'
					+ 'JSON_EXTRACT(o.data, "$.TotalPrice") as paymentTotal,'
					+ ' JSON_EXTRACT(o.data, "$.Items") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID and o.store = ' 
					+ store + ' AND ( (o.createdDate between "' + datefrom + '" AND "' + dateto + '") OR (c.packedTime between "' + datefrom + '" AND "' + dateto + '")) ORDER BY name' ;
				}
					
			} else {
				if (store==30) {
					sql = 'SELECT o.store, o.salesRecordID, o.orderID, JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.full_name") as name, '
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.street_1") as addr1,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.street_2") as addr2,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.city") as city,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.state") as state,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.zip") as postcode,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.country_iso2") as country,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.billing_address"), "$.email") as email,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.billing_address"), "$.phone") as phone,'
					+ ' JSON_EXTRACT(o.data, "$.items") as items,'
					+ ' c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID ' 
					+ 'and (o.store = 31 or o.store = 32 or o.store = 33 or o.store = 35) ' + ' ORDER BY salesRecordID, store ' ;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.WOOCOMMERCE) {
					sql = 'SELECT o.store, o.orderID, o.salesRecordID, JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.full_name") as name, '
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.address_1") as addr1,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.address_2") as addr2,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.city") as city,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.state") as state,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.postcode") as postcode,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping"), "$.country") as country,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.billing"), "$.email") as email,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.billing"), "$.phone") as phone,'
					+ ' JSON_EXTRACT(o.data, "$.line_items") as items,'
					+ ' c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID ' 
					+ 'and o.store = ' + store + ' ORDER BY salesRecordID' ;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.EBAY || Config.STORES[store].service == Config.SERVICE_IDS.NEWSERVICE) {
					sql = 'SELECT o.store, o.salesRecordID, o.orderID, JSON_EXTRACT(o.data, "$.finalDestinationAddressName") as name, '
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationAddressLine1") as addr1,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationAddressLine2") as addr2,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationCity") as city,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationStateOrProvince") as state,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationPostalCode") as postcode,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationCountry") as country,'
					+ 'JSON_EXTRACT(o.data, "$.buyerEmail") as email,'
					+ 'JSON_EXTRACT(o.data, "$.finalDestinationAddressPhone") as phone,'
					+ 'JSON_EXTRACT(o.data, "$.paymentID") as paymentID,'
					+ 'JSON_EXTRACT(o.data, "$.paymentTotal") as paymentTotal,'
					+ ' JSON_EXTRACT(o.data, "$.items") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID and o.store = ' 
					+ store + ' ORDER BY name' ;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.NETO) {
					sql = 'SELECT o.store, o.salesRecordID, o.orderID, JSON_EXTRACT(o.data, "$.ShipFullName") as name, '
					+ 'JSON_EXTRACT(o.data, "$.ShipStreetLine1") as addr1,'
					+ 'JSON_EXTRACT(o.data, "$.ShipStreetLine2") as addr2,'
					+ 'JSON_EXTRACT(o.data, "$.ShipCity") as city,'
					+ 'JSON_EXTRACT(o.data, "$.ShipState") as state,'
					+ 'JSON_EXTRACT(o.data, "$.ShipPostCode") as postcode,'
					+ 'JSON_EXTRACT(o.data, "$.ShipCountry") as country,'
					+ 'JSON_EXTRACT(o.data, "$.Email") as email,'
					+ 'JSON_EXTRACT(o.data, "$.ShipPhone") as phone,'
					+ 'JSON_EXTRACT(o.data, "$.ShippingTotal") as ShippingTotal,'
					+ 'JSON_EXTRACT(o.data, "$.SalesChannel") as SalesChannel,'
					+ ' JSON_EXTRACT(o.data, "$.OrderLine") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID and o.store = ' 
					+ store + ' ORDER BY name' ;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.SHOPIFY) {
					sql = 'SELECT o.store, o.orderID, o.salesRecordID, JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.name") as name, '
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.address1") as addr1,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.address2") as addr2,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.city") as city,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.province") as state,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.zip") as postcode,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.country_code") as country,'
					+ 'JSON_EXTRACT(o.data, "$.email") as email,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.shipping_address"), "$.phone") as phone,'
					+ ' JSON_EXTRACT(o.data, "$.line_items") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID and o.store = ' 
					+ store + ' ORDER BY name' ;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.CATCH) {
					sql = 'SELECT o.store, o.orderID, o.salesRecordID, JSON_EXTRACT(o.data, "$.ShipFullName") as name, '
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.street_1") as addr1,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.street_2") as addr2,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.city") as city,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.state") as state,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.zip_code") as postcode,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.country_iso_code") as country,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(o.data, "$.customer"), "$.shipping_address"), "$.phone") as phone,'
					+ 'JSON_EXTRACT(o.data, "$.total_price") as paymentTotal,'
					+ ' JSON_EXTRACT(o.data, "$.order_lines") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID and o.store = ' 
					+ store + ' ORDER BY name' ;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.KOGAN) {
					sql = 'SELECT o.store, o.orderID, o.salesRecordID, JSON_EXTRACT(o.data, "$.ShipFullName") as name, '
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.AddressLine1") as addr1,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.AddressLine2") as addr2,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.City") as city,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.StateOrProvince") as state,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.PostalCode") as postcode,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.Country") as country,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.EmailAddress") as email,'
					+ 'JSON_EXTRACT(JSON_EXTRACT(o.data, "$.ShippingAddress"), "$.DaytimePhone") as phone,'
					+ 'JSON_EXTRACT(o.data, "$.TotalPrice") as paymentTotal,'
					+ ' JSON_EXTRACT(o.data, "$.Items") as items, c.trackingID, c.type, o.createdDate, c.packedTime, c.status, c.packedData, c.collected, c.notes, c.weight FROM orders o, collecting c WHERE o.id = c.orderID and o.store = ' 
					+ store + ' ORDER BY name' ;
				}
					
			}
			
			let result = await conn.query(sql);
			//console.log(result);
			if (result.length == 0) {
				output.result = 'No trackings found';
				httpStatus = 404;
			} else if (result.length > 0) {
				output.result = 'success';

				let sql2 = 'SELECT * FROM items WHERE itemStore = ' + store;
				if (store==30) {
					sql2 = 'SELECT * FROM items WHERE itemStore = 31 or itemStore = 32 or itemStore = 33 or itemStore = 35';
				}
				let results2 = await conn.query(sql2);
				let itemDetails = {};
				let itemSkuDetails = {};
				for (let item of results2) {
					let newitem = {};
					for (let att in item) {
						newitem[att] = item[att]
					}

					if (itemDetails.hasOwnProperty(item.itemNo)) {
						itemDetails[item.itemNo].push(newitem);
					} else {
						itemDetails[item.itemNo] = [];
						itemDetails[item.itemNo].push(newitem);
					}

					if (itemSkuDetails.hasOwnProperty(item.sku)) {
						itemSkuDetails[item.sku].push(newitem);
					} else {
						itemSkuDetails[item.sku] = [];
						itemSkuDetails[item.sku].push(newitem);
					}
					
				}
				if (substore != 'all') {
					let newResult = [];
					if (store == 4) {
						if (substore == 1) {
							for (let order of result) {
								let items = JSON.parse(order.items);
								let factory = false;
								let intertrading = false;
								for (let item of items) {
									//let factory = await conn.query('SELECT factory FROM items WHERE itemNo = ' + item.itemID + ' AND sku = ' + conn.connection.escape(item.sku) + ' AND itemStore = ' + store);
									//console.log(factory);
									let sku = item.sku;
									let name = item.title;
									let itemNo = item.itemID;
									if ((sku.startsWith('AI') || sku.startsWith('IA')) || !isNaN(name.split('x')[0])) {
										intertrading = true;
									}
									if (!sku.startsWith('AI') && !sku.startsWith('IA') && isNaN(name.split('x')[0])) {
										factory = true;
									}
									if (itemDetails[itemNo]) {
										for (let itemDetail of itemDetails[itemNo]) {
											if (itemDetail.sku == sku) {
												item['weight'] = parseFloat(itemDetail.itemWeight);
												break;
											}
										}	
									}
								}

								if (intertrading && !factory) {
									newResult.push(order);
								}
							}
						} else if (substore == 2) {
							for (let order of result) {
								let items = JSON.parse(order.items);
								let factory = false;
								let intertrading = false;
								for (let item of items) {
									//let factory = await conn.query('SELECT factory FROM items WHERE itemNo = ' + item.itemID + ' AND sku = ' + conn.connection.escape(item.sku) + ' AND itemStore = ' + store);
									let sku = item.sku;
									let name = item.title;
									let itemNo = item.itemID;
									if ((sku.startsWith('AI') || sku.startsWith('IA')) || !isNaN(name.split('x')[0])) {
										intertrading = true;
									}
									if (!sku.startsWith('AI') && !sku.startsWith('IA') && isNaN(name.split('x')[0])) {
										factory = true;
									}
									if (itemDetails[itemNo]) {
										for (let itemDetail of itemDetails[itemNo]) {
											if (itemDetail.sku == sku) {
												item['weight'] = parseFloat(itemDetail.itemWeight);
												break;
											}
										}	
									}
								}
								if (factory) {
									newResult.push(order);
								}
							}
						}
					}
					output.data = newResult;
					httpStatus = 200;
				} else {
					if (store==4) {

						
						//console.log(itemDetails);

						let newResult = [];
						for (let order of result) {	
							let neworder = {};
							for (let att in order) {
								neworder[att] = order[att];
							}

							let items = JSON.parse(order.items);
							let factory = false;
							let intertrading = false;

							let newitems = []
							for (let item of items) {
								let newitem = item;
								let itemNo = item.itemID;
								let sku = item.sku;
								if (itemDetails[itemNo] && itemDetails[itemNo].factory) {
									factory = true;
								} 
								if (itemDetails[itemNo] && !itemDetails[itemNo].factory) {
									intertrading = true;
								}
								/*let sku = item.sku;
								let name = item.title;
								if ((sku.startsWith('AI') || sku.startsWith('IA')) || !isNaN(name.split('x')[0])) {
									intertrading = true;
								}
								if (!sku.startsWith('AI') && !sku.startsWith('IA') && isNaN(name.split('x')[0])) {
									factory = true;
								}*/
								if (factory) newitem['type'] = 'factory';
								if (intertrading) newitem['type'] = 'intertrading';
								if (itemDetails[itemNo]) {
									for (let itemDetail of itemDetails[itemNo]) {
										if (itemDetail.sku == sku) {
											newitem['weight'] = parseFloat(itemDetail.itemWeight);
											break;
										}
									}	
								}
								
								newitems.push(newitem);
							}
							neworder['items'] = newitems;
							newResult.push(neworder);
							
						}
						result = newResult;
					} else {

						let convertData = getConversionData(store);
			            let itemConvert = convertData.ItemData;

						let newResult = [];
						for (let order of result) {	
							let neworder = {};
							for (let att in order) {
								neworder[att] = order[att];
							}

							let items = JSON.parse(order.items);

							let newitems = []
							for (let item of items) {
								let newitem = item;
								let itemNo = item[itemConvert.ItemID];
								let sku = item[itemConvert.SKU];
								
								if (store==8 || store==71) {
									if (itemSkuDetails[sku]) {
										//console.log(sku);
										let itemDetail = itemSkuDetails[sku][0];
										newitem['weight'] = parseFloat(itemDetail.itemWeight);
									}
								}
								else if (store==30) {
									if (itemDetails[itemNo]) {
										for (let itemDetail of itemDetails[itemNo]) {
											if (itemDetail.sku == sku) {
												newitem['weight'] = parseFloat(itemDetail.itemWeight) == 0 ? newitem['weight'] : parseFloat(itemDetail.itemWeight);
												break;
											}
										}	
										
									}
								} else {
									if (itemDetails[itemNo]) {
										for (let itemDetail of itemDetails[itemNo]) {
											if (itemDetail.sku == sku) {
												newitem['weight'] = parseFloat(itemDetail.itemWeight);
												break;
											}
										}	
										
									}
								}	
								
								newitems.push(newitem);
							}
							neworder['items'] = newitems;
							newResult.push(neworder);
							
						}
						result = newResult;
					}
					output.data = result;
					httpStatus = 200;
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




module.exports = downloadTracking;