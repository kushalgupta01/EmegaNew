// Discount Chemist
// Order System

// User login token
const crypto = require('crypto');
const {Config} = require('./config');
const Database = require('./connection');
const jwt = require("jsonwebtoken");

const secret = "drty78sr92";
//const IV_LENGTH = 16; // For AES, this is always 16
//const ENCRYPTION_KEY = something // 32 bytes (256 bits)

const userCheckToken = async (token, getUser = false) => {
	var userData = false;

	// Check token
	try {
		userData = await jwt.verify(token, secret);
	}
	catch (e) {}

	if (userData !== false && getUser) {
		// Get user details
		let conn = null;
		try {
			conn = new Database(dbconn);
			await conn.connect();
			let users = await conn.query('SELECT id, username, firstname, lastname, type, supplier FROM users WHERE id = ' + userData.id + ' AND type != '+conn.connection.escape(Config.USER_TYPE.DISABLED));
			if (users.length == 1) {
				userData = users[0];
			}
		}
		catch (e) {}
		if (conn && conn.connected) conn.release();
	}

	return userData;
}

const createToken = ({id, username, type}) => {
  // expires after half and hour (1800 seconds = 30 minutes)
  return jwt.sign({id, username, type}, secret);
}


/*const encrypt = (text) => {
	let iv = crypto.randomBytes(IV_LENGTH);
	let cipher = crypto.createCipheriv('aes-256-cbc', new Buffer(ENCRYPTION_KEY), iv);
	let encrypted = cipher.update(text);
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return iv.toString('hex') + ':' + encrypted.toString('hex');
}
  
const decrypt = (text) => {
	let parts = text.split(':');
	let iv = Buffer.from(parts.shift(), 'hex');
	let encryptedText = Buffer.from(parts.join(':'), 'hex');
	let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
	let decrypted = decipher.update(encryptedText);
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	return decrypted.toString();
}*/

module.exports = {userCheckToken, createToken};