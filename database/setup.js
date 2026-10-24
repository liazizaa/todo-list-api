// Menjalankan schema.sql (dan seed.sql jika ada argumen --seed) ke database dari DATABASE_URL
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/db');

(async () => {
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    console.log('Schema berhasil dibuat');
    if (process.argv.includes('--seed')) {
      await pool.query(fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8'));
      console.log('Data contoh berhasil dimasukkan');
    }
  } catch (e) {
    console.error('Gagal setup database:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
