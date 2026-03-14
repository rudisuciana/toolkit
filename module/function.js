// Fungsi: Membuat string acak (Huruf Kapital + Angka)
// Berguna untuk membuat ID transaksi (Reff ID) atau token unik
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Fungsi: Validasi apakah nomor HP adalah provider XL/Axis
// Mengecek berdasarkan awalan (prefix) dan panjang nomor (11-13 digit)
function cekNomorXl(nomor) {
    if (!nomor) return false;
    // Daftar prefix nomor XL dan Axis
    const prefixXl = ['817', '818', '819', '859', '877', '878', '838', '831', '832', '833'];
    
    // Normalisasi nomor ke format 08xx terlebih dahulu
    const nomorLokal = ubahKe0(String(nomor));
    
    // Harus diawali '08'
    if (!nomorLokal.startsWith('08')) {
        return false;
    }
    
    // Ambil 3 digit setelah angka 0 (contoh: 877 dari 0877...)
    const prefix = nomorLokal.substring(1, 4);
    
    // Cek apakah prefix ada di daftar dan panjang nomor valid
    const isPrefixValid = prefixXl.includes(prefix);
    const isLengthValid = nomorLokal.length >= 11 && nomorLokal.length <= 13;

    return isPrefixValid && isLengthValid;
}

// Fungsi: Mengubah format nomor ke format internasional (62...)
// Contoh: 0877... -> 62877...
function ubahKe62(nomor) {
    // Hapus spasi, tanda plus, atau dash
    const cleaned = String(nomor).replace(/[\s+-]/g, '');
    if (cleaned.startsWith('0')) {
        return '62' + cleaned.substring(1);
    }
    return cleaned;
}

function ubahKe0(nomor) {
  // Hapus spasi, tanda plus, atau dash
  const cleaned = String(nomor).replace(/[\s+-]/g, '');
  if (cleaned.startsWith('62')) {
    return '0' + cleaned.substring(2);
  }
  return cleaned;
}

// Fungsi: Membuat kode OTP 6 digit angka
function generateOTP() {
    // Menghasilkan angka antara 100000 s/d 999999
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Fungsi: Menyensor string (Masking)
// Menampilkan hanya 4 karakter terakhir, sisanya bintang (*)
// Contoh: 087712345678 -> ********5678
function maskString(str) {
    if (!str || str.length <= 4) {
        return str; 
    }
    const lastFour = str.slice(-4);
    const maskedPart = '*'.repeat(str.length - 4);
    return maskedPart + lastFour;
}

module.exports = { generateRandomString, cekNomorXl, ubahKe62, ubahKe0, generateOTP, maskString };
