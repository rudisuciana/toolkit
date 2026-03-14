const pool = require('../config/database');
const config = require('../config/env');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const userRepository = require('../repositories/userRepository');
const transactionRepository = require('../repositories/transactionRepository');
const noOtpRepository = require('../repositories/noOtpRepository');
const { generateRandomString, cekNomorXl, ubahKe62, ubahKe0 } = require('../utils/helpers');
const { requestOtp, loginOtp, checkSession, checkQuotas, getProducts, buyPackage, getListProduct, orderProduct } = require('../utils/providers/kaje');
const { getAkrabStockFlaz, inviteAkrabMember } = require('../utils/providers/flaz');
const { getProductKhfy, orderProductKhfy } = require('../utils/providers/khfy');

const xlRequestOtp = async (req, res) => {
  const { number } = req.body;
  const formattedNumber = ubahKe62(number);
  if (!cekNomorXl(formattedNumber)) return res.status(400).json({ success: false, message: 'Nomor bukan nomor XL/Axis.' });
  try {
    const responseData = await requestOtp(formattedNumber, config);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const xlLoginOtp = async (req, res) => {
  const { number, otp } = req.body;
  const formattedNumber = ubahKe62(number);
  if (!number || !otp || otp.length < 6) return res.status(400).json({ success: false, message: 'Data tidak valid.' });
  try {
    const responseData = await loginOtp(formattedNumber, otp, config);
    if (responseData && responseData.success) {
      const user = await userRepository.findByIdSelect(req.session.userId, 'number_otp');
      let numbers = JSON.parse(user.number_otp || '[]');
      if (!numbers.some((item) => item.number === formattedNumber)) {
        numbers.push({ number: formattedNumber });
        await userRepository.updateNumberOtp(req.session.userId, JSON.stringify(numbers));
      }
    }
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const xlCheckSession = async (req, res) => {
  const { number } = req.body;
  const formattedNumber = ubahKe62(number);
  if (!cekNomorXl(formattedNumber)) return res.status(400).json({ success: false, message: 'Bukan nomor XL/Axis.' });
  try {
    const user = await userRepository.findByIdSelect(req.session.userId, 'number_otp');
    const numbers = JSON.parse(user.number_otp || '[]');
    if (!numbers.some((item) => item.number === formattedNumber))
      return res.status(403).json({ success: false, message: 'Nomor belum diautentikasi.' });
    const responseData = await checkSession(formattedNumber, config);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const xlCheckQuotas = async (req, res) => {
  try {
    const formattedNumber = ubahKe62(req.body.number);
    const quotaData = await checkQuotas(formattedNumber, config);
    res.json(quotaData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const xlGetProducts = async (req, res) => {
  try {
    const productData = await getProducts(req.body.number, config);
    if (productData.success && productData.data.products) {
      productData.data.products = productData.data.products.map((product) => {
        const final_price = product.fee > 0 ? product.fee + (config.UNTUNG || 0) : 0;
        return { ...product, final_price };
      });
    }
    res.json(productData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const xlBuyPackage = async (req, res) => {
  const { number, code, payment } = req.body;
  const userId = req.session.userId;
  if (!number || !code || !payment) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const productData = await getProducts(ubahKe62(number), config);
    const product = productData.data.products.find((p) => p.code === code);
    if (!product) throw new Error('Produk tidak ditemukan.');

    const price = product.fee > 0 ? product.fee + (config.UNTUNG || 0) : 0;
    const [userRows] = await userRepository.getBalanceForUpdate(connection, userId);
    if (userRows[0].balance < price) throw new Error('Saldo tidak mencukupi.');

    const responseData = await buyPackage({ number: ubahKe62(number), ref_id: `WZ${generateRandomString(13)}`, code, payment }, config);

    if (responseData && responseData.success) {
      if (price > 0) await userRepository.subtractBalance(connection, userId, price);
      const { ref_id, trx_id, status, destination, serial_number, meta_data, deeplink, message } = responseData.data;
      await transactionRepository.createTransaction(connection, {
        ref_id, trx_id, userId, productCode: code, productName: product.name, paymentMethod: payment,
        source: 'WEB', message, destination, price, status, serialNumber: serial_number || '',
        metaData: JSON.stringify(meta_data), paymentInfo: deeplink || null, updatedAt: new Date(),
      });
      await connection.commit();
      res.json(responseData);
    } else {
      throw new Error(responseData.message || 'Gagal memesan dari provider.');
    }
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(error.message === 'Saldo tidak mencukupi.' ? 402 : 500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const xlListProduct = async (req, res) => {
  try {
    const productData = await getListProduct(config);
    if (productData.success && productData.data && productData.data.products) {
      const productsWithFinalPrice = productData.data.products.map((product) => {
        const final_price = product.price > 0 ? product.price + (config.UNTUNG || 0) : 0;
        return { ...product, final_price };
      });
      res.json({ success: true, data: { products: productsWithFinalPrice } });
    } else {
      res.json(productData);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const xlAkrabV2Order = async (req, res) => {
  const { code, destination } = req.body;
  const userId = req.session.userId;
  if (!code || !destination) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const productData = await getListProduct(config);
    const product = productData.data.products.find((p) => p.code === code);
    if (!product) throw new Error('Produk tidak ditemukan.');

    const price = product.price > 0 ? product.price + (config.UNTUNG || 0) : 0;
    const [userRows] = await userRepository.getBalanceForUpdate(connection, userId);
    if (userRows[0].balance < price) throw new Error('Saldo tidak mencukupi.');

    const ref_id = `WZ${generateRandomString(13)}`;
    const responseData = await orderProduct({ code, destination: ubahKe0(destination), ref_id }, config);

    if (responseData && (responseData.success === true || responseData.code === '000')) {
      if (price > 0) await userRepository.subtractBalance(connection, userId, price);
      const { trx_id, status, message, serial_number, meta_data } = responseData.data;
      await transactionRepository.createTransaction(connection, {
        ref_id, trx_id, userId, productCode: code, productName: product.name, paymentMethod: 'SALDO',
        source: 'WEB', message, destination, price, status, serialNumber: serial_number || '',
        metaData: JSON.stringify(meta_data), updatedAt: new Date(),
      });
      await connection.commit();
      res.json(responseData);
    } else {
      throw new Error(responseData.message || 'Gagal memesan dari provider.');
    }
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(error.message === 'Saldo tidak mencukupi.' ? 402 : 500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const xlAkrabInvite = async (req, res) => {
  const { code, parent_name, destination } = req.body;
  const userId = req.session.userId;
  if (!code || !parent_name || !destination) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const stockData = await getAkrabStockFlaz(config);
    const product = stockData.data.find((p) => p.code === code);
    if (!product) throw new Error('Produk Akrab tidak ditemukan.');

    const price = product.price;
    const [userRows] = await userRepository.getBalanceForUpdate(connection, userId);
    if (userRows[0].balance < price) throw new Error('Saldo tidak mencukupi.');

    const ref_id = `WZ${generateRandomString(13)}`;
    const responseData = await inviteAkrabMember({ code, parent_name, destination: ubahKe0(destination), ref_id }, config);

    if (responseData && (responseData.success === true || responseData.code === '000')) {
      if (price > 0) await userRepository.subtractBalance(connection, userId, price);
      const { trx_id, status, message, serial_number, meta_data } = responseData.data;
      await transactionRepository.createTransaction(connection, {
        ref_id, trx_id, userId, productCode: code, productName: product.name, paymentMethod: 'SALDO',
        source: 'WEB', message, destination, price, status, serialNumber: serial_number || '',
        metaData: JSON.stringify(meta_data), updatedAt: new Date(),
      });
      await connection.commit();
      res.json(responseData);
    } else {
      throw new Error(responseData.message || 'Gagal mengundang member dari provider.');
    }
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(error.message === 'Saldo tidak mencukupi.' ? 402 : 500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const xlStockKhfy = async (req, res) => {
  try {
    const productData = await getProductKhfy(config);
    if (!productData.ok || !Array.isArray(productData.data)) throw new Error(productData.message || 'Gagal mengambil data stok.');

    const akrabJsonPath = path.join(__dirname, '..', '..', 'akrab.json');
    const localAkrabData = JSON.parse(fs.readFileSync(akrabJsonPath, 'utf-8'));
    const mergedData = productData.data
      .map((liveProduct) => {
        const localDetails = localAkrabData.find((localProduct) => localProduct.code === liveProduct.type);
        return localDetails ? { ...liveProduct, ...localDetails, nama: liveProduct.nama } : liveProduct;
      })
      .filter((p) => p.harga !== undefined);

    res.json({ success: true, message: 'success', data: mergedData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
};

const xlAkrabV3Order = async (req, res) => {
  const { code, destination } = req.body;
  const userId = req.session.userId;
  if (!code || !destination) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const akrabJsonPath = path.join(__dirname, '..', '..', 'akrab.json');
    const localAkrabData = JSON.parse(fs.readFileSync(akrabJsonPath, 'utf-8'));
    const product = localAkrabData.find((p) => p.code === code);
    if (!product) throw new Error('Produk tidak ditemukan.');

    const price = product.harga;
    const [userRows] = await userRepository.getBalanceForUpdate(connection, userId);
    if (userRows[0].balance < price) throw new Error('Saldo tidak mencukupi.');

    const apiResponse = await orderProductKhfy({ code, destination: ubahKe0(destination) }, config);
    if (apiResponse.ok === false) throw new Error('Transaksi gagal karena produk sedang error');

    if (price > 0) await userRepository.subtractBalance(connection, userId, price);

    const data = apiResponse.data || {};
    const ref_id = data.reffid || `WZ${generateRandomString(13)}`;

    await transactionRepository.createTransaction(connection, {
      ref_id, trx_id: data.trxid || null, userId, productCode: code, productName: product.name,
      paymentMethod: 'SALDO', source: 'WEB', message: apiResponse.msg, destination, price,
      status: 'pending', serialNumber: data.sn || '', metaData: JSON.stringify(data), updatedAt: new Date(),
    });

    await connection.commit();
    res.json({ success: true, data: { ref_id, trx_id: data.trxid || null, status: 'pending', message: apiResponse.msg, destination } });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(error.message === 'Saldo tidak mencukupi.' ? 402 : 500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const noOtpProducts = async (req, res) => {
  const { provider } = req.body;
  if (!provider) return res.status(400).json({ success: false, message: 'Provider diperlukan.' });
  try {
    const products = await noOtpRepository.findByProvider(provider);
    const productsWithFinalPrice = products.map((product) => ({ ...product, final_price: product.amount }));
    res.json({ success: true, data: productsWithFinalPrice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil produk: ' + error.message });
  }
};

const noOtpOrder = async (req, res) => {
  const { code, destination } = req.body;
  const userId = req.session.userId;
  if (!code || !destination) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const product = await noOtpRepository.findByProductId(code);
    if (!product) throw new Error('Produk tidak ditemukan.');

    const price = product.amount > 0 ? product.amount + (config.UNTUNG || 0) : 0;
    const [userRows] = await userRepository.getBalanceForUpdate(connection, userId);
    if (userRows[0].balance < price) throw new Error('Saldo tidak mencukupi.');

    if (price > 0) await userRepository.subtractBalance(connection, userId, price);

    const ref_id = `WZ${generateRandomString(13)}`;
    await transactionRepository.createTransaction(connection, {
      ref_id, trx_id: ref_id, userId, productCode: code, productName: product.product_name,
      paymentMethod: 'SALDO', source: 'WEB', message: 'Transaksi sukses.', destination,
      price, status: 'success', serialNumber: 'NONE', metaData: JSON.stringify(product), updatedAt: new Date(),
    });

    await connection.commit();
    res.json({ success: true, data: { ref_id, trx_id: ref_id, status: 'success', message: 'Transaksi sukses.', destination } });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(error.message === 'Saldo tidak mencukupi.' ? 402 : 500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const checkPackage = async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ success: false, message: 'Nomor tidak boleh kosong.' });
  try {
    const formattedNumber = ubahKe62(number);
    const response = await axios.get(`${config.CHECK_PACKAGE_URL}?check=package&number=${formattedNumber}&version=2`);
    if (response.data && response.data.success) {
      res.json(response.data);
    } else {
      throw new Error(response.data.message || 'Gagal mengambil data dari provider.');
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.response ? error.response.data.message : error.message });
  }
};

const xlAkrabStock = async (req, res) => {
  try {
    const stockData = await getAkrabStockFlaz(config);
    res.json(stockData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  xlRequestOtp, xlLoginOtp, xlCheckSession, xlCheckQuotas, xlGetProducts, xlBuyPackage,
  xlListProduct, xlAkrabV2Order, xlAkrabInvite, xlStockKhfy, xlAkrabV3Order,
  noOtpProducts, noOtpOrder, checkPackage, xlAkrabStock,
};
