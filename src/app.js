const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware dasar
app.use(cors()); // Mengizinkan frontend untuk mengakses backend
app.use(express.json({ limit: '50mb' })); // Memperbesar batas ukuran request agar sanggup menampung gambar Base64
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic Route (Akan menampilkan halaman Frontend kita sekarang)
app.use(express.static(path.join(__dirname, '../public')));

// Import Routes
const apiRoutes = require('./routes/apiRoutes');

// Mendaftarkan Rute API Utama
// Semua rute di dalam apiRoutes akan memiliki awalan /api
app.use('/api', apiRoutes);

// Nantinya rute lain akan ditambahkan di sini
// contoh: app.use('/api/users', userRoutes);

module.exports = app;
