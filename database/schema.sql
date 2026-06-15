-- Mengaktifkan ekstensi UUID untuk menghasilkan ID unik secara otomatis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabel Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Receipts (Nota)
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nama_toko VARCHAR(255),
    tanggal_nota DATE,
    total_harga NUMERIC(15, 2) DEFAULT 0, -- Menggunakan NUMERIC untuk menghindari bug koma desimal, panjang 15 digit.
    kategori VARCHAR(100),
    url_gambar_nota TEXT,
    tanggal_diunggah TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Membuat index untuk mempercepat pencarian data berdasarkan user
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
