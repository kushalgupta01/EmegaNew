// Discount Chemist
// Order System

// WooCommerce client

const WooCommerceAPI = require('woocommerce-api');

class WooCommerceClient {
    constructor(data = null) {
        this.client = data ? new WooCommerceAPI(data) : null;
    }

	get(url) {
        return new Promise((resolve, reject) => {
            if (!this.client) reject(false);
            this.client.get(url, (err, data, res) => {
				if (err) reject(err);
				resolve(JSON.parse(res));
			});
        });
	}

	post(url, data) {
        return new Promise((resolve, reject) => {
            if (!this.client) reject(false);
            this.client.post(url, data, (err, data, res) => {
				if (err) reject(err);
				resolve(JSON.parse(res));
			});
        });
	}
}

module.exports = WooCommerceClient;
