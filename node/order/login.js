 // Discount Chemist
// Order System

// Get users from the database
const crypto = require('crypto');
const Database = require('./connection');
const {Config} = require('./config');
const jwt = require("jsonwebtoken");
const secret = 'drty78sr92';

const login = async function(req, res, next) {
	var conn = new Database(dbconn);
	var username = req.body.username || null;
	var password = req.body.password || null;	
	var token = req.body.token || null;
	var output = {result: null};
	var httpStatus = 400;

	do {
		try {
			await conn.connect();
			let users = await conn.query('SELECT * FROM users WHERE username = '+conn.connection.escape(username)+' AND type != '+conn.connection.escape(Config.USER_TYPE.DISABLED));
					
			if(!users.length){
				httpStatus = 404;
				output.result = 'The specified user does not exist.';
				break;
			}else{
				if(token){
					let userToken = createToken2(users[0]);
					httpStatus = 200;
					let tokenVerification = jwt.verify(token, secret);
					if(tokenVerification.username == username){
						output.result = 'success';
					}else{
						output.result = 'Token incorrect';
					}
				}else if(username && password && token == null){
					httpStatus = 200;
					if(users[0].password == password){
						output.result = 'success';
						output.token = createToken(username, password, secret);
						output.usertoken = createToken2(users[0]);
						output.user = users[0];
					}else{
						output.result = 'Incorrect Username/Password';
					}
				}else {
					output.result = 'Missing input data.';
					break;
				}
			}			
		}
		catch (e) {
			// Error
			httpStatus = 503;
			output.result = e;
			console.log(e)
			break;
		}

	} while(0);
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

const createToken = (username, password, secret) => {
	var hash = crypto.createHash('sha256');
	hash.update(username+secret+password);
	return hash.digest('hex');
}

const createToken2 = ({id, username, type}) => {
  
  return jwt.sign({id, username, type}, secret, { expiresIn : "1h"});
}

module.exports = login;