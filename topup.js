const axios = require('axios');
const express = require('express');
const cors = require('cors'); // Tambahan: Untuk mengizinkan akses dari browser
const path = require('path'); // Tambahan: Untuk mengatur path file
const pool = require('./database.js'); 

const app = express();

// Konfigurasi Middleware
app.use(cors()); // Mengaktifkan CORS agar HTML bisa akses API tanpa error
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 3001;

// ---------------------------------------------------------
// ROUTE 1: Menampilkan Halaman HTML (Interface)
// ---------------------------------------------------------
app.get('/', (req, res) => {
    // Mengirimkan file index.html ke browser saat user membuka http://localhost:3001
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------------------------------------------------------
// ROUTE 2: API Pemrosesan Deposit (Logic Anda)
// ---------------------------------------------------------
app.get("/nurul", async (req, res) => {
  // 1. Validasi Input
  const amount = parseInt(req.query.amount);
  
  // Cek apakah angka valid dan lebih besar dari 0
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid amount provided.',
      data: null
    });
  }
  
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // 2. Cari Deposit PENDING dengan Lock (FOR UPDATE)
    const [rows] = await connection.execute(
      `SELECT * FROM deposits WHERE amount = ? AND status = 'PENDING' ORDER BY created_at ASC LIMIT 1 FOR UPDATE`, 
      [amount]
    );
    
    const row = rows[0];
    
    // Jika tidak ditemukan transaksi pending dengan nominal tersebut
    if (!row) {
      await connection.commit(); 
      return res.status(404).json({
        success: false,
        message: 'No pending transaction found with this amount.',
        data: null
      });
    }
    
    // 3. Destructuring Data
    const { top_up_id, user_id, amount: dbAmount } = row;
    
    // 4. Eksekusi Update Saldo & Mutasi Data
    await connection.execute(`UPDATE users SET balance = balance + ? WHERE id = ?`, [dbAmount, user_id]);
    
    // Pindahkan ke history
    const nowISO = new Date().toISOString(); 
    await connection.execute(
      `INSERT INTO topup_historys (top_up_id, user_id, amount, status, updated_at) VALUES (?, ?, ?, ?, ?)`, 
      [top_up_id, user_id, dbAmount, 'SUCCESS', nowISO]
    );

    // Hapus dari tabel deposits
    await connection.execute(`DELETE FROM deposits WHERE top_up_id = ?`, [top_up_id]);
    
    // 5. Commit Transaksi
    await connection.commit();
    
    console.log(`[SUCCESS] TopUp ID: ${top_up_id} | User: ${user_id} | Amount: ${dbAmount}`);

    res.status(200).json({
      success: true,
      message: 'Request Successfully',
      data: {
        topupId: top_up_id,
        user_id,
        status: 'success',
        message: `Berhasil menambahkan saldo pengguna dengan TopUp ID ${top_up_id} sebesar Rp ${dbAmount}`
      }
    });

  } catch (err) {
    // 6. Rollback jika terjadi error
    console.error(`[ERROR] Transaction Failed: ${err.message}`);
    if (connection) await connection.rollback();
    
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: err.message,
      data: null
    });
  } finally {
    // 7. Selalu lepaskan koneksi
    if (connection) connection.release();
  }
});

// Jalankan Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Buka http://localhost:${PORT} di browser untuk melihat interface.`);
});
