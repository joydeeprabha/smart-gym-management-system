// ============================================================
// config/db.js - MySQL Database Connection
// Uses mysql2 with promise support for async/await
// ============================================================

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool (more efficient than single connection)
const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'smart_gym',
    waitForConnections: true,
    connectionLimit: 10,      // max 10 simultaneous connections
    queueLimit: 0
});

// Test the connection on startup
async function testConnection() {
    try {
        const conn = await pool.getConnection();
        console.log('✅ MySQL connected successfully');
        conn.release();
    } catch (err) {
        console.error('❌ MySQL connection failed:', err.message);
        process.exit(1);  // Exit if DB connection fails
    }
}

testConnection();

module.exports = pool;
