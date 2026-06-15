const { Pool } = require('pg');
require('dotenv').config();

// Konfigurasi koneksi ke PostgreSQL menggunakan connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Listener untuk memantau jika ada error pada koneksi database idle
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Fungsi pembantu (helper) untuk mengeksekusi query dengan aman
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool // Mengekspos pool asli jika dibutuhkan untuk transaksi manual
};
