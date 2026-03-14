const express = require('express');
const router = express.Router();
const pool = require('../database.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { isAuthenticated } = require('../middleware/auth.js');
const { generateRandomString, cekNomorXl, ubahKe62, ubahKe0 } = require('../module/function.js');
const { requestOtp, loginOtp, checkSession, checkQuotas, getProducts, buyPackage } = require('../module/kaje.js');
const { getAkrabStockFlaz, inviteAkrabMember } = require('../module/flaz.js');
const { getProductKhfy, orderProductKhfy } = require('../module/khfy.js');
const { getListProduct, orderProduct } = require('../module/kaje.js');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.vars.json')));

// Helper DB
const dbGet = async (sql, params = []) => { const [rows] = await pool.execute(sql, params); return rows[0]; };
const dbAll = async (sql, params = []) => { const [rows] = await pool.execute(sql, params); return rows; };
const dbRun = async (sql, params = []) => { const [result] = await pool.execute(sql, params); return result; };

// =================== XL TEMBAK PAKET ===================
router.post('/xl/request-otp', isAuthenticated, async (req, res) => {
    const { number } = req.body;
    const formattedNumber = ubahKe62(number);
    if (!cekNomorXl(formattedNumber)) return res.status(400).json({ success: false, message: 'Nomor bukan nomor XL/Axis.' });
    try {
        const responseData = await requestOtp(formattedNumber, config);
        res.json(responseData);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/xl/login-otp', isAuthenticated, async (req, res) => {
    const { number, otp } = req.body;
    const formattedNumber = ubahKe62(number);
    if (!number || !otp || otp.length < 6) return res.status(400).json({ success: false, message: 'Data tidak valid.' });
    try {
        const responseData = await loginOtp(formattedNumber, otp, config);
        if (responseData && responseData.success) {
            const user = await dbGet(`SELECT number_otp FROM users WHERE id = ?`, [req.session.userId]);
            let numbers = JSON.parse(user.number_otp || '[]');
            if (!numbers.some(item => item.number === formattedNumber)) {
                numbers.push({ number: formattedNumber });
                await dbRun(`UPDATE users SET number_otp = ? WHERE id = ?`, [JSON.stringify(numbers), req.session.userId]);
            }
        }
        res.json(responseData);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/xl/check-session', isAuthenticated, async (req, res) => {
    const { number } = req.body;
    const formattedNumber = ubahKe62(number);
    if (!cekNomorXl(formattedNumber)) return res.status(400).json({ success: false, message: 'Bukan nomor XL/Axis.' });
    try {
        const user = await dbGet(`SELECT number_otp FROM users WHERE id = ?`, [req.session.userId]);
        const numbers = JSON.parse(user.number_otp || '[]');
        if (!numbers.some(item => item.number === formattedNumber)) return res.status(403).json({ success: false, message: 'Nomor belum diautentikasi.' });
        
        const responseData = await checkSession(formattedNumber, config);
        res.json(responseData);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/xl/check-quotas', isAuthenticated, async (req, res) => {
    try {
        const formattedNumber = ubahKe62(req.body.number);
        const quotaData = await checkQuotas(formattedNumber, config); 
        res.json(quotaData);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/xl/get-products', isAuthenticated, async (req, res) => {
    try {
        const productData = await getProducts(req.body.number, config);
        if (productData.success && productData.data.products) {
            productData.data.products = productData.data.products.map(product => {
                const final_price = product.fee > 0 ? product.fee + (config.UNTUNG || 0) : 0;
                return { ...product, final_price };
            });
        }
        res.json(productData);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/xl/buy-package', isAuthenticated, async (req, res) => {
    const { number, code, payment } = req.body; 
    const userId = req.session.userId;
    if (!number || !code || !payment) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const productData = await getProducts(ubahKe62(number), config);
        const product = productData.data.products.find(p => p.code === code);
        if (!product) throw new Error('Produk tidak ditemukan.');
        
        const price = product.fee > 0 ? product.fee + (config.UNTUNG || 0) : 0;
        
        const [userRows] = await connection.execute(`SELECT balance FROM users WHERE id = ? FOR UPDATE`, [userId]);
        if (userRows[0].balance < price) throw new Error('Saldo tidak mencukupi.');
        
        const responseData = await buyPackage({ number: ubahKe62(number), ref_id: `WZ${generateRandomString(13)}`, code, payment }, config);

        if (responseData && responseData.success) {
            if (price > 0) await connection.execute(`UPDATE users SET balance = balance - ? WHERE id = ?`, [price, userId]);
            
            const { ref_id, trx_id, status, destination, serial_number, meta_data, deeplink, message } = responseData.data;
            await connection.execute(`INSERT INTO transactions (ref_id, trx_id, user_id, product_code, product_name, payment_method, message, destination, price, status, serial_number, meta_data, payment_info, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                   [ref_id, trx_id, userId, code, product.name, payment, message, destination, price, status, serial_number || '', JSON.stringify(meta_data), deeplink || null, new Date()]);
            
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
});

// =================== XL AKRAB ===================

// v2: List Produk
router.post('/xl/list-product', isAuthenticated, async (req, res) => {
    try {
        const productData = await getListProduct(config);
        if (productData.success && productData.data && productData.data.products) {
            const productsWithFinalPrice = productData.data.products.map(product => {
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
});

// v2: Order
router.post('/xl/akrabv2/order', isAuthenticated, async (req, res) => {
    const { code, destination } = req.body;
    const userId = req.session.userId;
    if (!code || !destination) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const productData = await getListProduct(config);
        const product = productData.data.products.find(p => p.code === code);
        if (!product) throw new Error('Produk tidak ditemukan.');

        const price = product.price > 0 ? product.price + (config.UNTUNG || 0) : 0;
        const [userRows] = await connection.execute(`SELECT balance FROM users WHERE id = ? FOR UPDATE`, [userId]);
        if (userRows[0].balance < price) throw new Error('Saldo tidak mencukupi.');

        const ref_id = `WZ${generateRandomString(13)}`;
        const responseData = await orderProduct({ code, destination: ubahKe0(destination), ref_id }, config);

        if (responseData && (responseData.success === true || responseData.code === "000")) {
            if (price > 0) await connection.execute(`UPDATE users SET balance = balance - ? WHERE id = ?`, [price, userId]);
            const { trx_id, status, message, serial_number, meta_data } = responseData.data;
            await connection.execute(`INSERT INTO transactions (ref_id, trx_id, user_id, product_code, product_name, payment_method, message, destination, price, status, serial_number, meta_data, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                   [ref_id, trx_id, userId, code, product.name, 'SALDO', message, destination, price, status, serial_number || '', JSON.stringify(meta_data), new Date()]);
            
            await connection.commit();
            res.json(responseData);
        } else {
            throw new Error(responseData.message || 'Gagal memesan dari provider.');
        }
    } catch (error) {
        if(connection) await connection.rollback();
        res.status(error.message === 'Saldo tidak mencukupi.' ? 402 : 500).json({ success: false, message: error.message });
    } finally {
        if(connection) connection.release();
    }
});

// v1: Invite Member
router.post('/xl/akrab/invite', isAuthenticated, async (req, res) => {
    const { code, parent_name, destination } = req.body;
    const userId = req.session.userId;
    if (!code || !parent_name || !destination) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const stockData = await getAkrabStockFlaz(config);
        const product = stockData.data.find(p => p.code === code);
        if (!product) throw new Error('Produk Akrab tidak ditemukan.');

        const price = product.price;
        const [userRows] = await connection.execute(`SELECT balance FROM users WHERE id = ? FOR UPDATE`, [userId]);
        if (userRows[0].balance < price) throw new Error('Saldo tidak mencukupi.');
        
        const ref_id = `WZ${generateRandomString(13)}`;
        const responseData = await inviteAkrabMember({ code, parent_name, destination: ubahKe0(destination), ref_id }, config);

        if (responseData && (responseData.success === true || responseData.code === "000")) {
            if (price > 0) await connection.execute(`UPDATE users SET balance = balance - ? WHERE id = ?`, [price, userId]);
            const { trx_id, status, message, serial_number, meta_data } = responseData.data;
            await connection.execute(`INSERT INTO transactions (ref_id, trx_id, user_id, product_code, product_name, payment_method, source, message, destination, price, status, serial_number, meta_data, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                   [ref_id, trx_id, userId, code, product.name, 'SALDO', 'WEB', message, destination, price, status, serial_number || '', JSON.stringify(meta_data), new Date()]);
            
            await connection.commit();
            res.json(responseData);
        } else {
            throw new Error(responseData.message || 'Gagal mengundang member dari provider.');
        }
    } catch (error) {
        if(connection) await connection.rollback();
        res.status(error.message === 'Saldo tidak mencukupi.' ? 402 : 500).json({ success: false, message: error.message });
    } finally {
        if(connection) connection.release();
    }
});

// v3: Stock KHFY & Order
router.post('/v3/xl/stock-khfy', isAuthenticated, async (req, res) => {
    try {
        const productData = await getProductKhfy(config);
        if (!productData.ok || !Array.isArray(productData.data)) throw new Error(productData.message || 'Gagal mengambil data stok.');

        const akrabJsonPath = path.join(__dirname, '..', 'akrab.json');
        const localAkrabData = JSON.parse(fs.readFileSync(akrabJsonPath, 'utf-8'));
        const mergedData = productData.data.map(liveProduct => {
            const localDetails = localAkrabData.find(localProduct => localProduct.code === liveProduct.type);
            return localDetails ? { ...liveProduct, ...localDetails, nama: liveProduct.nama } : liveProduct;
        }).filter(p => p.harga !== undefined);

        res.json({ success: true, message: 'success', data: mergedData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message, data: null });
    }
});

router.post('/xl/akrabv3/order', isAuthenticated, async (req, res) => {
    const { code, destination } = req.body;
    const userId = req.session.userId;
    if (!code || !destination) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const akrabJsonPath = path.join(__dirname, '..', 'akrab.json');
        const localAkrabData = JSON.parse(fs.readFileSync(akrabJsonPath, 'utf-8'));
        const product = localAkrabData.find(p => p.code === code);
        if (!product) throw new Error('Produk tidak ditemukan.');

        const price = product.harga;
        const [userRows] = await connection.execute(`SELECT balance FROM users WHERE id = ? FOR UPDATE`, [userId]);
        if (userRows[0].balance < price) throw new Error('Saldo tidak mencukupi.');

        const apiResponse = await orderProductKhfy({ code, destination: ubahKe0(destination) }, config);
        if (apiResponse.ok === false) throw new Error('Transaksi gagal karena produk sedang error');

        if (price > 0) await connection.execute(`UPDATE users SET balance = balance - ? WHERE id = ?`, [price, userId]);
        
        const data = apiResponse.data || {};
        const ref_id = data.reffid || `WZ${generateRandomString(13)}`;

        await connection.execute(`INSERT INTO transactions (ref_id, trx_id, user_id, product_code, product_name, payment_method, source, message, destination, price, status, serial_number, meta_data, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
               [ref_id, data.trxid || null, userId, code, product.name, 'SALDO', 'WEB', apiResponse.msg, destination, price, 'pending', data.sn || '', JSON.stringify(data), new Date()]);
        
        await connection.commit();
        res.json({ success: true, data: { ref_id, trx_id: data.trxid || null, status: 'pending', message: apiResponse.msg, destination } });
    } catch (error) {
        if(connection) await connection.rollback();
        res.status(error.message === 'Saldo tidak mencukupi.' ? 402 : 500).json({ success: false, message: error.message });
    } finally {
        if(connection) connection.release();
    }
});

// =================== NO OTP & CEK PAKET ===================
router.post('/no-otp/products', isAuthenticated, async (req, res) => {
    const { provider } = req.body;
    if (!provider) return res.status(400).json({ success: false, message: 'Provider diperlukan.' });
    try {
        const products = await dbAll(`SELECT * FROM no_otp WHERE provider = ?`, [provider]);
        const productsWithFinalPrice = products.map(product => ({ ...product, final_price: product.amount }));
        res.json({ success: true, data: productsWithFinalPrice });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil produk: ' + error.message });
    }
});

router.post('/no-otp/order', isAuthenticated, async (req, res) => {
    const { code, destination } = req.body;
    const userId = req.session.userId;
    if (!code || !destination) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const product = await dbGet(`SELECT * FROM no_otp WHERE product_id = ?`, [code]);
        if (!product) throw new Error('Produk tidak ditemukan.');

        const price = product.amount > 0 ? product.amount + (config.UNTUNG || 0) : 0;
        const [userRows] = await connection.execute(`SELECT balance FROM users WHERE id = ? FOR UPDATE`, [userId]);
        if (userRows[0].balance < price) throw new Error('Saldo tidak mencukupi.');

        if (price > 0) await connection.execute(`UPDATE users SET balance = balance - ? WHERE id = ?`, [price, userId]);
        
        const ref_id = `WZ${generateRandomString(13)}`;
        await connection.execute(`INSERT INTO transactions (ref_id, trx_id, user_id, product_code, product_name, payment_method, source, message, destination, price, status, serial_number, meta_data, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
               [ref_id, ref_id, userId, code, product.product_name, 'SALDO', 'WEB', 'Transaksi sukses.', destination, price, 'success', 'NONE', JSON.stringify(product), new Date()]);
        
        await connection.commit();
        res.json({ success: true, data: { ref_id, trx_id: ref_id, status: 'success', message: 'Transaksi sukses.', destination } });

    } catch (error) {
        if(connection) await connection.rollback();
        res.status(error.message === 'Saldo tidak mencukupi.' ? 402 : 500).json({ success: false, message: error.message });
    } finally {
        if(connection) connection.release();
    }
});

router.post('/check-package', isAuthenticated, async (req, res) => {
    const { number } = req.body;
    if (!number) return res.status(400).json({ success: false, message: 'Nomor tidak boleh kosong.' });
    try {
        const formattedNumber = ubahKe62(number);
        const response = await axios.get(`https://bendith.my.id/end.php?check=package&number=${formattedNumber}&version=2`);
        if (response.data && response.data.success) {
            res.json(response.data);
        } else {
            throw new Error(response.data.message || 'Gagal mengambil data dari provider.');
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.response ? error.response.data.message : error.message });
    }
});

router.post('/xl/akrab-stock', isAuthenticated, async (req, res) => {
    try {
        const stockData = await getAkrabStockFlaz(config);
        res.json(stockData);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
