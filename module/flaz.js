const axios = require('axios'); // Library untuk melakukan HTTP Request

// Fungsi 1: Mengambil stok produk "Akrab" dari Provider Flaz
// Digunakan untuk mengetahui apakah layanan sedang tersedia sebelum user membeli
async function getAkrabStockFlaz(config) {
    try {
        // Melakukan POST request ke endpoint cek stok
        const response = await axios.post(`${config.URL.FLAZ}/mpa/product-stock`, {}, { 
            headers: { 'x-api-key': config.API.FLAZ } // Menggunakan API Key dari config
        });
        return response.data; // Mengembalikan data stok dari API
    } catch (error) {
        // Menangani error jika API down atau request gagal
        throw new Error(error.response?.data?.message || 'Gagal mengambil stok produk Akrab dari Flaz.');
    }
}

// Fungsi 2: Mengundang member ke grup Akrab (Proses Transaksi Utama)
// Data yang dikirim biasanya berisi nomor HP tujuan dan jenis paket
async function inviteAkrabMember(data, config) {
    try {
        // Melakukan POST request untuk eksekusi invite member
        const response = await axios.post(`${config.URL.FLAZ}/mpa/invite-member`, data, { 
            headers: { 'x-api-key': config.API.FLAZ } 
        });
        return response.data; // Mengembalikan respon sukses/gagal dari API
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Gagal mengundang member Akrab dari Flaz.');
    }
}

// Fungsi 3: Mengecek status transaksi (Cek Status)
// Berguna untuk sinkronisasi status transaksi (Pending -> Sukses/Gagal)
async function getTransactionInfoFlaz(trx_id, config) {
    try {
        // Mengirim trx_id ke API untuk mendapatkan status terkini
        const response = await axios.post(`${config.URL.FLAZ}/info/trx-id`, { trx_id }, { 
            headers: { 'x-api-key': config.API.FLAZ } 
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Gagal mengambil info transaksi dari provider Flaz.');
    }
}

module.exports = { getAkrabStockFlaz, inviteAkrabMember, getTransactionInfoFlaz };
