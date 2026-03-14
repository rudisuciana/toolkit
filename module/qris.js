// Fungsi Helper: Menghitung Checksum CRC16-CCITT (0xFFFF)
// Standar QRIS/EMVCo mewajibkan 4 karakter terakhir dari string QR adalah hasil kalkulasi CRC
// dari seluruh karakter sebelumnya (termasuk tag '6304').
function crc16ccitt(data) {
    let crc = 0xFFFF; // Initial value standar CCITT
    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8; // XOR byte data ke buffer
        for (let j = 0; j < 8; j++) {
            // Bitwise operation untuk polinomial CRC-CCITT (0x1021)
            if ((crc & 0x8000) > 0) crc = (crc << 1) ^ 0x1021;
            else crc = crc << 1;
        }
    }
    // Mengembalikan hasil dalam format Hexadecimal 4 digit (Huruf Besar)
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

// Fungsi Utama: Membuat QRIS Dinamis dengan Nominal
function generateDynamicQris(baseQrisString, amount) {
    // 1. Hapus 8 karakter terakhir dari QRIS asli.
    // 8 karakter itu adalah Tag CRC ('63'), Panjang CRC ('04'), dan Nilai CRC lama ('XXXX')
    let payload = baseQrisString.substring(0, baseQrisString.length - 8);
    
    // 2. Hapus tag Amount lama (Tag '54') jika ada, agar tidak duplikat.
    // Regex mencari pola '54' diikuti panjang digit, lalu nilainya.
    const cleanedPayload = payload.replace(/54\d{2,}\d*/g, '');
    
    // 3. Siapkan Tag Amount baru
    const amountStr = String(Math.round(amount)); // Pastikan nominal bulat
    const amountLength = amountStr.length.toString().padStart(2, '0'); // Panjang karakter nominal (2 digit)
    const amountTag = `54${amountLength}${amountStr}`; // Format Tag 54: 54 + Panjang + Nilai
    
    // 4. Gabungkan payload bersih dengan tag amount baru
    const stringForCrc = cleanedPayload + amountTag;
    
    // 5. Hitung CRC baru
    // String yang dihitung harus diakhiri dengan '6304' (Tag ID CRC + Panjangnya)
    const newCrc = crc16ccitt(stringForCrc + '6304');
    
    // 6. Kembalikan string QRIS lengkap
    return `${stringForCrc}6304${newCrc}`;
}

module.exports = { generateDynamicQris };
