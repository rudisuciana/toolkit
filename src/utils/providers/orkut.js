const axios = require('axios');
const qs = require('qs');
const logger = require('../../config/logger');

function getFormattedTime() {
  return Date.now();
}

async function orderNoOtpOrkut(data, config) {
  const { code, destination, ref_id } = data;
  const timeStamp = getFormattedTime();

  const payload = {
    quantity: '1',
    app_reg_id: config.ORKUT.REG_ID,
    phone_uuid: config.ORKUT.PHONE_UUID,
    id_plgn: destination,
    phone_model: 'V2424',
    kode_promo: '',
    request_time: timeStamp,
    phone_android_version: '15',
    pin: '',
    app_version_code: '251010',
    phone: destination,
    auth_username: config.ORKUT.USERNAME,
    voucher_id: code,
    payment: 'balance',
    auth_token: config.ORKUT.TOKEN,
    app_version_name: '25.10.10',
    ui_mode: 'dark',
  };

  const options = {
    method: 'POST',
    url: 'https://app.orderkuota.com/api/v2/order',
    headers: {
      'User-Agent': 'okhttp/4.12.0',
      'Accept-Encoding': 'gzip',
      'Content-Type': 'application/x-www-form-urlencoded',
      timestamp: timeStamp,
    },
    data: qs.stringify(payload),
  };

  try {
    const response = await axios.request(options);
    const resData = response.data;

    if (resData.success && resData.results) {
      return {
        success: true,
        data: {
          trx_id: resData.results.id,
          ref_id: ref_id,
          destination: resData.results.no_hp,
          price: resData.results.harga,
          product_name: resData.results.produk ? resData.results.produk.nama : 'Produk Orkut',
          status: 'processing',
          message: 'Transaksi berhasil dibuat.',
          raw: resData,
        },
      };
    } else {
      throw new Error(resData.message || 'Gagal melakukan order (Unknown Error).');
    }
  } catch (error) {
    logger.error('[Orkut Order] Error: ' + error.message);
    const msg = error.response?.data?.message || error.message || 'Gagal transaksi Orkut.';
    throw new Error(msg);
  }
}

async function checkStatusOrkut(trx_id_provider, config) {
  const timeStamp = getFormattedTime();

  const payload = {
    app_reg_id: config.ORKUT.REG_ID,
    phone_uuid: config.ORKUT.PHONE_UUID,
    request_time: timeStamp,
    auth_username: config.ORKUT.USERNAME,
    auth_token: config.ORKUT.TOKEN,
    app_version_code: '251010',
    phone_model: 'V2424',
    limit: '20',
    page: '1',
  };

  const options = {
    method: 'POST',
    url: 'https://app.orderkuota.com/api/v2/history-transaksi',
    headers: {
      'User-Agent': 'okhttp/4.12.0',
      'Accept-Encoding': 'gzip',
      'Content-Type': 'application/x-www-form-urlencoded',
      timestamp: timeStamp,
    },
    data: qs.stringify(payload),
  };

  try {
    const response = await axios.request(options);
    if (response.data && response.data.data) {
      const found = response.data.data.find(
        (tx) => String(tx.trx_id) === String(trx_id_provider) || String(tx.id) === String(trx_id_provider)
      );
      if (found) {
        let status = 'processing';
        const rawStatus = String(found.status).toLowerCase();
        if (rawStatus === 'sukses' || rawStatus === 'success') status = 'success';
        else if (rawStatus === 'gagal' || rawStatus === 'failed' || rawStatus === 'error') status = 'failed';
        return {
          success: true,
          data: { trx_id: found.id, status, sn: found.sn || found.keterangan || '', message: found.keterangan || 'Status retrieved' },
        };
      }
      return { success: false, message: 'Transaksi tidak ditemukan di history provider.' };
    }
    return response.data;
  } catch (error) {
    logger.error('[Orkut Status] Error: ' + error.message);
    throw new Error('Gagal cek status Orkut.');
  }
}

module.exports = { orderNoOtpOrkut, checkStatusOrkut };
