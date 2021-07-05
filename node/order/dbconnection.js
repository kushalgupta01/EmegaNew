// Discount Chemist
// Order System

// Database connection
const mysql = require('mysql');
const DBConfig = require('./config').DBConfig;

class DBConnection {
    constructor() {
        this.connectionPool = null;
        this.createPool();
    }

    // Create database connection pool 
	createPool() {
        this.connectionPool = mysql.createPool(DBConfig);
    }
}

module.exports = DBConnection;
