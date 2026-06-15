require('dotenv').config();
const app = require('./src/app.js');
const db = require('./src/config/db.js');

const PORT = process.env.PORT || 5000;

// Fungsi untuk mengecek koneksi database sebelum menyalakan server
const startServer = async () => {
  try {
    // Test koneksi database sederhana
    const res = await db.query('SELECT NOW() AS current_time');
    console.log('✅ Berhasil terkoneksi ke Database PostgreSQL pada:', res.rows[0].current_time);

    // Jika database sukses, nyalakan server Express
    app.listen(PORT, () => {
      console.log(`🚀 Server backend berjalan di http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('❌ Gagal terkoneksi ke Database:', err.message);
    console.log('Pastikan PostgreSQL sudah berjalan dan kredensial di file .env sudah benar.');
    process.exit(1); // Matikan aplikasi jika database mati
  }
};

startServer();
