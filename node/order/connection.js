// Discount Chemist
// Order System

// Database connection

class Database {
    constructor(dbconnection) {
        this.db = dbconnection;
        this.connection = null;
        this.connected = false;
        this.isTransaction = false;
    }

    // Get connection from connection pool
	connect() {
        return new Promise((resolve, reject) => {
            if (!this.db || !this.db.connectionPool) reject(false);
            this.db.connectionPool.getConnection((err, connection) => {
                if (err) reject(err);
                this.connection = connection;
                this.connected = true;
                resolve(true);
            });
        });
    }

    // Database query
    query(sql) {
        return new Promise((resolve, reject) => {
            if (!this.connected) reject(false);
            this.connection.query(sql, (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        }).catch((err) => console.log(err));
    }

    // Database transaction
    transaction(func) {
        return new Promise((resolve, reject) => {
            if (!this.connected) reject(false);
            this.connection.beginTransaction(async (err) => {
                if (err) reject(err);
                this.isTransaction = true;
                var result = await func();
                //console.log('funcresult: '+result.toString());
                resolve(result);
            });
        });
    }

    // Commit database transaction
    commit() {
        return new Promise((resolve, reject) => {
            if (!this.isTransaction) reject(false);
            this.connection.commit((err) => {
                if (err) {
                    return this.connection.rollback(() => {
                        reject(err);
                    });
                }
                else {
                    this.isTransaction = false;
                    resolve(true);
                }
            });
        });
    }

    // Rollback database transaction
    rollback(err) {
        if (!this.isTransaction) return;
        this.isTransaction = false;
        return this.connection.rollback(() => {
            throw err;
        });
    }

    // Release pool connection
    release() {
        if (!this.connected) return true;
        return new Promise((resolve, reject) => {
            if (this.connected) {
                this.connection.release();
                this.connection = null;
                this.connected = false;
                this.isTransaction = false;
            }
            resolve(true);
        });
    }

    // End all pool connections
    end() {
        return new Promise((resolve, reject) => {
            if (!this.db || this.db.connectionPool) resolve(true);
            this.db.connectionPool.end(err => {
                if (err) reject(err);
                resolve(true);
            });
        });
    }
}

module.exports = Database;
