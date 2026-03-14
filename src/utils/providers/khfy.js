const axios = require('axios');
const { generateRandomString } = require('../helpers');
const logger = require('../../config/logger');

async function getProductKhfy(config) {
  try {
    const response = await axios.get(config.URL.KHFY2);
    return response.data;
  } catch (error) {
    logger.error('[KHFY] getProductKhfy error: ' + error.message);
    throw new Error(error.response?.data?.message || 'Gagal mengambil data dari provider.');
  }
}

async function orderProductKhfy(data, config) {
  try {
    const { code, destination } = data;
    const ref_id = `WZ${generateRandomString(13)}`;
    const targetUrl = `${config.URL.KHFY}/trx?produk=${code}&tujuan=${destination}&reff_id=${ref_id}&api_key=${config.API.KHFY}`;
    const response = await axios.get(targetUrl);
    return response.data;
  } catch (error) {
    logger.error('[KHFY] orderProductKhfy error: ' + error.message);
    const errorMessage = error.response?.data?.msg || error.response?.data?.message || 'Gagal memesan produk dari KHFY.';
    throw new Error(errorMessage);
  }
}

module.exports = { getProductKhfy, orderProductKhfy };
