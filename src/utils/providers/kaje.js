const axios = require('axios');
const logger = require('../../config/logger');

async function requestOtp(number, config) {
  try {
    const response = await axios.post(`${config.URL.KAJE}/xl-auth/get-otp`, { number }, { headers: { 'x-api-key': config.API.KAJE } });
    return response.data;
  } catch (error) {
    logger.error('[Kaje] requestOtp error: ' + error.message);
    throw new Error(error.response?.data?.message || 'Gagal menghubungi server XL (OTP).');
  }
}

async function loginOtp(number, otp, config) {
  try {
    const response = await axios.post(`${config.URL.KAJE}/xl-auth/login-otp`, { number, code_otp: otp }, { headers: { 'x-api-key': config.API.KAJE } });
    return response.data;
  } catch (error) {
    logger.error('[Kaje] loginOtp error: ' + error.message);
    throw new Error(error.response?.data?.message || 'Gagal menghubungi server XL (Login).');
  }
}

async function checkSession(number, config) {
  try {
    const response = await axios.post(`${config.URL.KAJE}/xl-auth/login-sesi`, { number }, { headers: { 'x-api-key': config.API.KAJE } });
    return response.data;
  } catch (error) {
    logger.error('[Kaje] checkSession error: ' + error.message);
    throw new Error(error.response?.data?.message || 'Gagal memeriksa sesi nomor.');
  }
}

async function checkQuotas(number, config) {
  try {
    const response = await axios.post(`${config.URL.KAJE}/xl-info/quotas`, { number }, { headers: { 'x-api-key': config.API.KAJE } });
    return response.data;
  } catch (error) {
    logger.error('[Kaje] checkQuotas error: ' + error.message);
    throw new Error(error.response?.data?.message || 'Gagal memeriksa kuota paket.');
  }
}

async function getProducts(number, config) {
  try {
    const response = await axios.post(`${config.URL.KAJE}/service/list-package-otp`, { number }, { headers: { 'x-api-key': config.API.KAJE } });
    return response.data;
  } catch (error) {
    logger.error('[Kaje] getProducts error: ' + error.message);
    throw new Error(error.response?.data?.message || 'Gagal mengambil daftar paket.');
  }
}

async function buyPackage(purchaseData, config) {
  const { number, ref_id, code, payment } = purchaseData;
  try {
    const response = await axios.post(`${config.URL.KAJE}/service/order-package-otp`, { destination: number, ref_id, code, payment }, { headers: { 'x-api-key': config.API.KAJE } });
    return response.data;
  } catch (error) {
    logger.error('[Kaje] buyPackage error: ' + error.message);
    throw new Error(error.response?.data?.message || 'Gagal melakukan pembelian paket.');
  }
}

async function getTransactionInfo(trx_id, config) {
  try {
    const response = await axios.post(`${config.URL.KAJE}/info/trx-id`, { trx_id }, { headers: { 'x-api-key': config.API.KAJE } });
    return response.data;
  } catch (error) {
    logger.error('[Kaje] getTransactionInfo error: ' + error.message);
    throw new Error(error.response?.data?.message || 'Gagal mengambil info transaksi dari provider.');
  }
}

async function getListProduct(config) {
  try {
    const response = await axios.post(`${config.URL.KAJE}/service/list-product`, {}, { headers: { 'x-api-key': config.API.KAJE } });
    return response.data;
  } catch (error) {
    logger.error('[Kaje] getListProduct error: ' + error.message);
    throw new Error(error.response?.data?.message || 'Gagal mengambil daftar produk.');
  }
}

async function orderProduct(data, config) {
  try {
    const response = await axios.post(`${config.URL.KAJE}/service/order-product`, data, { headers: { 'x-api-key': config.API.KAJE } });
    return response.data;
  } catch (error) {
    logger.error('[Kaje] orderProduct error: ' + error.message);
    throw new Error(error.response?.data?.message || 'Gagal memesan produk.');
  }
}

module.exports = { requestOtp, loginOtp, checkSession, checkQuotas, getProducts, buyPackage, getTransactionInfo, getListProduct, orderProduct };
