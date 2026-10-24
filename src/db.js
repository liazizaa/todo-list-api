require('dotenv').config();
const { Pool } = require('pg');

// Koneksi diambil dari Environment Variable (bukan ditulis di kode)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

module.exports = pool;
