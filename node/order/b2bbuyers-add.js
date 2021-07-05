//  Discount Chemist
//  Order System

const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const addBuyerDetails = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	var id = (req.body.id == 'null' || req.body.id == ''  )? null :req.body.id;
	var refNo = (req.body.refNo == 'null' || req.body.refNo == ''  )? null :req.body.refNo;
	var poNo = (req.body.poNo == 'null' || req.body.poNo == ''  )? null :req.body.poNo;
	var firstname = (req.body.firstname == 'null' || req.body.firstname == ''  )? null :req.body.firstname;
	var lastname = (req.body.lastname == 'null' || req.body.lastname == ''  )? null :req.body.lastname;
	var companyname = (req.body.companyname == 'null' || req.body.companyname == ''  )? null :req.body.companyname;
	var address1 = (req.body.address1 == 'null' || req.body.address1 == ''  )? null :req.body.address1;
	var address2 = (req.body.address2 == 'null' || req.body.address2 == ''  )? '' :req.body.address2;
	var suburb = (req.body.suburb == 'null' || req.body.suburb == '' )? null :req.body.suburb;
	var state = (req.body.state == 'null' || req.body.state == '' )? null :req.body.state;			
	var postcode = (req.body.postcode == 'null' || req.body.postcode == '' )? null :req.body.postcode;
	var country = (req.body.country == 'null' || req.body.country == '' )? null :req.body.country;
	var phone = (req.body.phone == 'null' || req.body.phone == ''  )? null :req.body.phone;
	var email = (req.body.email == 'null' || req.body.email == ''  )? null :req.body.email;
	var notes = (req.body.notes == 'null' || req.body.notes == ''  )? null :req.body.notes;
	var store = req.body.store;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			await conn.connect();

			// let result = await conn.query('select 1 from b2bbuyers where store = ' + store + ' AND firstname = ' + conn.connection.escape(firstname) + ' AND address1 = ' + conn.connection.escape(address1) + ' AND address2 = ' + conn.connection.escape(address2));

			if (id != undefined && id != null && id != 'undefined') {

				await conn.query ('UPDATE b2bbuyers SET firstname = '+ conn.connection.escape(firstname)
											+ ', lastname = ' + conn.connection.escape(lastname)
											+ ', companyname = ' + conn.connection.escape(companyname) 
											+ ', address1 = ' + conn.connection.escape(address1) 
											+ ', address2 = ' + conn.connection.escape(address2)
											+ ', suburb = ' + conn.connection.escape(suburb)
											+ ', state = ' + conn.connection.escape(state)
											+ ', postcode = ' + conn.connection.escape(postcode)
											+ ', country = ' + conn.connection.escape(country)
											+ ', phone = ' + conn.connection.escape(phone)
											+ ', email = ' + conn.connection.escape(email)
											+ ', notes = ' + conn.connection.escape(notes)
											+ ', store = ' + conn.connection.escape(store)
											+ ', refNo = ' + conn.connection.escape(refNo)
											+ ', poNo = ' + conn.connection.escape(poNo)
											+ ' WHERE id = ' + id );
			} 
			else {
				await conn.query ('INSERT INTO b2bbuyers (firstname, lastname, companyname, address1, address2, suburb, state, postcode, country, phone, email, notes, store, refNo, poNo) VALUES (' + 
					conn.connection.escape(firstname) + ', ' + conn.connection.escape(lastname) + ', ' + conn.connection.escape(companyname) + ', ' + conn.connection.escape(address1) + ', ' + conn.connection.escape(address2) + ', ' 
					+ conn.connection.escape(suburb) + ' , '+ conn.connection.escape(state) + ', ' + conn.connection.escape(postcode) + ', ' 
					+ conn.connection.escape(country) + ' , ' + conn.connection.escape(phone) + ' , '+ conn.connection.escape(email) + ' , '
					+ conn.connection.escape(notes) + ', ' + conn.connection.escape(store) + ', ' + conn.connection.escape(refNo) +', ' + conn.connection.escape(poNo) +')');
			}
			
			output.result = 'success';
			httpStatus = 200;
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

module.exports = addBuyerDetails;