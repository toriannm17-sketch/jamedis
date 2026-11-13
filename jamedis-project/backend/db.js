require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const caPath = path.resolve(__dirname, process.env.DB_CA_PATH || './ca.pem');

if (!fs.existsSync(caPath)) {
  console.error(
    `\n[db] Aiven CA certificate not found at: ${caPath}\n` +
      '     Download ca.pem from the Aiven console and place it in the backend folder.\n'
  );
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync(caPath),
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: ['DATE'], // return DATE columns as 'YYYY-MM-DD' strings
});

module.exports = pool;
