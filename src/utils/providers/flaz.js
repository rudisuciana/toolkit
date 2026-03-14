const axios = require('axios');
const logger = require('../../config/logger');

async function getAkrabStockFlaz(config) {
  try {
    const response = await axios.post(`${config.URL.FLAZ}/mpa/product-stock`, {}, { headers: { 'x-api-key': config.API.FLAZ } });
    return response.data;
  } catch (error) {
    logger.error('[Flaz] getAkrabStockFlaz error: ' + error.message);
    throw new Error(error.response?.data?.message || 'Gagal mengambil stok produk Akrab dari Flaz.');
  }
}

async function inviteAkrabMember(data, config) {
  try {
    const response = await axios.post(`${config.URL.FLAZ}/mpa/invite-member`, data, { headers: { 'x-api-key': config.API.FLAZ } });
    return response.data;
  } catch (error) {
    logger.error('[Flaz] inviteAkrabMember error: ' + error.message);
    throw new Error(error.response?.data?.message || 'Gagal mengundang member Akrab dari Flaz.');
  }
}

async function getTransactionInfoFlaz(trx_id, config) {
  try {
    const response = await axios.post(`${config.URL.FLAZ}/info/trx-id`, { trx_id }, { headers: { 'x-api-key': config.API.FLAZ } });
    return response.data;
  } catch (error) {
    logger.error('[Flaz] getTransactionInfoFlaz error: ' + error.message);
    throw new Error(error.response?.data?.message || 'Gagal mengambil info transaksi dari provider Flaz.');
  }
}

module.exports = { getAkrabStockFlaz, inviteAkrabMember, getTransactionInfoFlaz };
