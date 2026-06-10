require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dorado_pos',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // Return dates as strings instead of Date objects to match JSON behavior
  decimalNumbers: true, // Parse DECIMAL values as JavaScript Numbers (required for frontend .toFixed() calls)
  ...(process.env.DB_HOST !== 'localhost' && { ssl: { rejectUnauthorized: false } })
});

// A separate connection without a specific database to initialize the database
const rootPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  ...(process.env.DB_HOST !== 'localhost' && { ssl: { rejectUnauthorized: false } })
});

module.exports = { pool, rootPool };
