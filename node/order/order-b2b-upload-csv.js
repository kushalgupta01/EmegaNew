const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const fs = require('fs');
const parse = require('csv-parse');

const uploadOrder = async function(req, res, next) {
	var conn = new Database(dbconn);
	var file = req.files.file;
	var csvFile = file.path;
	//var name = req.body.name;
	//console.log(file);
	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Check token
			let user = await userCheckToken(token, true);

			if (!user) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}
			else if (user.type != Config.USER_TYPE.ADMIN && user.type != Config.USER_TYPE.USER) {
				httpStatus = 403;
				output.result = 'Action not allowed.';
				break;
			}
			await conn.connect();
			class Order {
			  constructor(orderRef, company, firstName, lastName, mobile, deliveryCompany, deliveryFirstName, deliveryLastName, deliveryAddress1, deliveryAddress2, deliveryCity, deliveryState, deliveryPostalCode, deliveryCountry, itemCode, itemName, itemQty) {
			    this.orderRef = orderRef;
			    this.company = company;
			    this.firstName = firstName;
			    this.lastName = lastName;
			    this.mobile = mobile;
			    this.deliveryCompany = deliveryCompany;
			    this.deliveryFirstName = deliveryFirstName;
			    this.deliveryLastName = deliveryLastName;
			    this.deliveryAddress1 = deliveryAddress1;
			    this.deliveryAddress2 = deliveryAddress2;
			    this.deliveryCity = deliveryCity;
			    this.deliveryState = deliveryState;
			    this.deliveryPostalCode = deliveryPostalCode;
			    this.deliveryCountry = deliveryCountry;
			    this.itemCode = itemCode;
			    this.itemName = itemName;
			    this.itemQty = itemQty;
			  }
			}

			let orderData = await new Promise((resolve,reject) => {
				
				const processData = async (err, data) => {
					if (err) {
						console.log(`An error was encountered: ${err}`);
						return;
					}
					data.shift(); // only required if csv has heading row

					const orderList = data.map(row => new Order(...row));
					let order = {};
					order.refNo = orderList[0].orderRef;
					order.customerPONum = orderList[0].orderRef;
					order.companyName = orderList[0].company;
					order.firstName = orderList[0].firstName;
					order.lastName = orderList[0].lastName;
					order.deliveryAddress1 = orderList[0].deliveryAddress1;
					order.deliveryAddress2 = orderList[0].deliveryAddress2;
					order.suburb = orderList[0].deliveryCity;
					order.deliveryState = orderList[0].deliveryState;
					order.deliveryPostalCode = orderList[0].deliveryPostalCode;
					order.deliveryCountry = orderList[0].deliveryCountry;
					order.phone = orderList[0].mobile;
					order.emailAddress = "";
					
					await analyseOrder(order,orderList);

					let dif = orderList.length - order.items.length;
					if (dif == 0){

						// console.log(order);
						resolve(order);
						//analyseOrders(orderList);
					}
					else {
						order.dif = order.notfound.length;
						let skus = [];
						for (let item of order.notfound){
							skus.push(item.sku);
						}
						order.skus = skus;
						resolve(order);
					}
				}
				

				fs.createReadStream(csvFile).pipe(parse({ delimiter: ',' }, processData));
				

				async function analyseOrder(order,orderList){
					await conn.connect();
					let items = [];
					let listOfNotFound = [];
					for (let item of orderList){
						let listOfItems = [];
						
						var sql = await conn.query('SELECT id,itemBarcode,customSku,itemName,store,image,price from stockinventory WHERE sku='+conn.connection.escape(item.itemCode)+' AND store=8');
						
						if (sql.length == '1' || sql.length == 1){
							//for (let i=0; i<sql.length; i++){
								let item1 = {
									id: sql[0].id,
									store: sql[0].store,
									itemName: sql[0].itemName,
									customSku: sql[0].customSku,
									sku: item.itemCode,
									itemBarcode: sql[0].itemBarcode,
									orderQuantity: item.itemQty,
									image: sql[0].image,
									price: sql[0].price
								}
								listOfItems.push(item1);
							//}
							
						items.push(listOfItems);
							
						}

						else {
							let item1 = {
								sku: item.itemCode,
								orderQuantity: item.itemQty,
							}
							listOfNotFound.push(item1);
						}					
						
					}
					order.items = items;
					if (listOfNotFound.length > 0){
						order.notfound = listOfNotFound;
					}
				}
			})
			
			//console.log(orderData);
			// console.log(order);
			httpStatus = 200;
			output.result = 'success';
			output.order = orderData;

			/*let filePath = '../pictures/'+ name;
			fs.renameSync(file.path, filePath);
			if (fs.existsSync(filePath)) {
				httpStatus = 200;
				output.result = 'success';
			}*/
		} while(0);
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

module.exports = uploadOrder;