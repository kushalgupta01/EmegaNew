// Discount Chemist
// Order System

// Amazon MWS client

const crypto = require('crypto');
const request = require('request');
var parseString = require('xml2js').parseString;
const querystring = require('querystring');

class AmazonMwsClient {
    constructor(accessKeyId, secretKey, sellerId, options) {
        var options = options || {};

        this.accessKeyId = accessKeyId || null;
        this.secretKey = secretKey || null;
        this.sellerId = sellerId || null;
        this.host = options.host || 'mws.amazonservices.com.au';
        this.mwsAuthToken = options.mwsAuthToken || null;
    }

    call(api, action, params) {
        if (this.accessKeyId == null || this.secretKey == null 
            || this.sellerId == null) {
            throw 'accessKeyId, secretKey and sellerId must be set';
        }

        var requestOptions = {
            method: 'POST',
            host: this.host,
            path: api.path,
            secretKey: this.secretKey
        }
        var requestParams = {
            Action: action,
            AWSAccessKeyId: this.accessKeyId,
            SellerId: this.sellerId,
            MWSAuthToken: this.mwsAuthToken,
            Timestamp: new Date().toISOString(),
            Version: api.version
        }

        for (let key in params) {
            requestParams[key] = params[key];
        }
        requestParams.Signature =
            AmazonMwsClient.sign(requestOptions, requestParams);

        return new Promise(function (resolve, reject) {
            request[requestOptions.method.toLowerCase()]({
                url: 'https://' + requestOptions.host + requestOptions.path,
                qs: requestParams
            }, function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    if (body.slice(0, 5) == '<?xml') {
                        parseString(body, function (err, result) {
                            if (err) {
                                reject(new Error('parseString: failed to ' + 
                                    'parse response.'));
                            } else {
                                resolve(result);
                            }
                        });
                    } else {
                        resolve(body);
                    }
                }
            });
        });
    }

    static sign(requestOptions, requestParams) {
        requestParams.SignatureMethod = 'HmacSHA256';
        requestParams.SignatureVersion = '2';

        var sorted = Object.keys(requestParams).sort();

        // Create query string from sorted parameters
        var paramsString = '';
        for (let i = 0; i < sorted.length; i++) {
            paramsString += sorted[i] + '=' + 
                querystring.escape(requestParams[sorted[i]]);
            if (i !== (sorted.length - 1)) {
                paramsString += '&';
            }
        }

        var hmac = crypto.createHmac('sha256', requestOptions.secretKey);
        hmac.update(requestOptions.method + '\n');
        hmac.update(requestOptions.host + '\n');
        hmac.update(requestOptions.path + '\n');
        hmac.update(paramsString);

        return hmac.digest('base64');
    }
}

module.exports = AmazonMwsClient;
