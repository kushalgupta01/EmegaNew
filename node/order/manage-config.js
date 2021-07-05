// Discount Chemist
// Order System

// Manage config file

const {Config} = require('./config');
const fs = require('fs');
const json = require('json5');

const manageConfig = async function(req, res, next) {
	var method = req.method.toLowerCase();
	var password = null;
	var configData = req.body ? (req.body.config || null) : null;
	
	if (req.query && req.query.pw) password = req.query.pw;
	else if (req.body && req.body.pw) password = req.body.pw;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (!password) {
				httpStatus = 401;
				output.result = 'Password was not provided.';
				break;
			}
			else if (password != Config.USER_MANAGEMENT_PW) {
				httpStatus = 403;
				output.result = 'Incorrect password.';
				break;
			}

			if (method == 'get') {
				// Get config file contents
				if (!fs.existsSync(Config.configFile)) {
					httpStatus = 503;
					output.result = 'Configuration file does not exist.';
					break;
				}

				output.content = JSON.stringify(fs.readFileSync(Config.configFile).toString());
				output.result = 'success';
				httpStatus = 200;
			}
			else if (method == 'post') {
				// Save config data
				try {
					json.parse(configData);
				}
				catch (e) {
					output.result = 'Invalid configuration data.';
					break;
				}

				try {
					await new Promise((resolve, reject) => {
						fs.writeFile(Config.configFile, configData, (err) => {
							if (err) reject(err);
							resolve(true);
						});
					});
	
					Config.loadConfig();
	
					httpStatus = 200;
					output.result = 'success';
				}
				catch (e) {
					httpStatus = 503;
					output.result = 'Could not save configuration file.';
				}
			}
			else {
				output.result = 'Unsupported method.';
			}
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

module.exports = manageConfig;
