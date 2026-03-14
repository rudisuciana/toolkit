const axios = require('axios');
const qs = require('qs');

// Helper untuk membuat Timestamp (Unix Milliseconds)
// Contoh output: 1762505037158
function getFormattedTime() {
    return Date.now();
}

/**
 * Melakukan Order ke OrderKuota (Orkut)
 * @param {Object} data - { code, destination, ref_id }
 * @param {Object} config - Config global (.vars.json)
 */
async function orderNoOtpOrkut(data, config) {
    const { code, destination, ref_id } = data; // Pastikan ref_id diambil dari data
    const timeStamp = getFormattedTime();

    // Payload sesuai dokumentasi & snippet Anda
    const payload = {
        'quantity': '1',
        'app_reg_id': config.ORKUT.REG_ID,
        'phone_uuid': config.ORKUT.PHONE_UUID,
        'id_plgn': destination, 
        'phone_model': 'V2424',
        'kode_promo': '',
        'request_time': timeStamp,
        'phone_android_version': '15',
        'pin': '', 
        'app_version_code': '251010',
        'phone': destination,
        'auth_username': config.ORKUT.USERNAME,
        'voucher_id': code, 
        'payment': 'balance',
        'auth_token': config.ORKUT.TOKEN,
        'app_version_name': '25.10.10',
        'ui_mode': 'dark'
    };

    const options = {
        method: 'POST',
        url: 'https://app.orderkuota.com/api/v2/order',
        headers: {
            'User-Agent': 'okhttp/4.12.0',
            'Accept-Encoding': 'gzip',
            'Content-Type': 'application/x-www-form-urlencoded',
            'timestamp': timeStamp
        },
        data: qs.stringify(payload)
    };

    try {
        const response = await axios.request(options);
        const resData = response.data;

        // NORMALISASI RESPON
        // Mengubah format respon Orkut agar sesuai dengan standar aplikasi kita
        if (resData.success && resData.results) {
            return {
                success: true,
                data: {
                    trx_id: resData.results.id,           // ID Transaksi Provider
                    ref_id: ref_id,                       // ID Referensi Lokal kita
                    destination: resData.results.no_hp,   // Nomor Tujuan
                    price: resData.results.harga,         // Harga Modal
                    product_name: resData.results.produk ? resData.results.produk.nama : 'Produk Orkut',
                    status: 'processing',                 // Status awal biasanya processing/pending
                    message: 'Transaksi berhasil dibuat.',
                    raw: resData                          // Simpan respon asli jika perlu debug
                }
            };
        } else {
            // Jika API merespon sukses:false atau format tidak sesuai
            throw new Error(resData.message || 'Gagal melakukan order (Unknown Error).');
        }

    } catch (error) {
        console.error("[Orkut Order] Error:", error.message);
        const msg = error.response?.data?.message || error.message || 'Gagal transaksi Orkut.';
        throw new Error(msg);
    }
}

/**
 * Cek Status Transaksi (Riwayat)
 */
async function checkStatusOrkut(trx_id_provider, config) {
    const timeStamp = getFormattedTime();

    const payload = {
        'app_reg_id': config.ORKUT.REG_ID,
        'phone_uuid': config.ORKUT.PHONE_UUID,
        'request_time': timeStamp,
        'auth_username': config.ORKUT.USERNAME,
        'auth_token': config.ORKUT.TOKEN,
        'app_version_code': '251010',
        'phone_model': 'V2424',
        'limit': '20',
        'page': '1'
    };

    const options = {
        method: 'POST',
        url: 'https://app.orderkuota.com/api/v2/history-transaksi',
        headers: {
            'User-Agent': 'okhttp/4.12.0',
            'Accept-Encoding': 'gzip',
            'Content-Type': 'application/x-www-form-urlencoded',
            'timestamp': timeStamp
        },
        data: qs.stringify(payload)
    };

    try {
        const response = await axios.request(options);
        
        // Logika pencarian transaksi di history
        if (response.data && response.data.data) {
            // Mencari transaksi yang cocok dengan trx_id_provider
            const found = response.data.data.find(tx => 
                String(tx.trx_id) === String(trx_id_provider) || 
                String(tx.id) === String(trx_id_provider)
            );

            if (found) {
                // Normalisasi Status
                let status = 'processing';
                const rawStatus = String(found.status).toLowerCase();
                if (rawStatus === 'sukses' || rawStatus === 'success') status = 'success';
                else if (rawStatus === 'gagal' || rawStatus === 'failed' || rawStatus === 'error') status = 'failed';

                return {
                    success: true,
                    data: {
                        trx_id: found.id,
                        status: status,
                        sn: found.sn || found.keterangan || '', // Serial Number / Keterangan
                        message: found.keterangan || 'Status retrieved'
                    }
                };
            }
            return { success: false, message: 'Transaksi tidak ditemukan di history provider.' };
        }
        return response.data;

    } catch (error) {
        console.error("[Orkut Status] Error:", error.message);
        throw new Error('Gagal cek status Orkut.');
    }
}

module.exports = { orderNoOtpOrkut, checkStatusOrkut };