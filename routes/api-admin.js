const express = require('express');
const router = express.Router();
const pool = require('../database.js');
const { isAuthenticated, isAdmin } = require('../middleware/auth.js');

const dbAll = async (sql, params = []) => { const [rows] = await pool.execute(sql, params); return rows; };
const dbRun = async (sql, params = []) => { const [result] = await pool.execute(sql, params); return result; };
const dbGet = async (sql, params = []) => { const [rows] = await pool.execute(sql, params); return rows[0]; };

router.get('/admin/tables', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const tables = await dbAll(`SHOW TABLES`);
        const tableNames = tables.map(t => Object.values(t)[0]).filter(name => name !== 'sessions');
        res.json({ success: true, tables: tableNames });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar tabel: ' + error.message });
    }
});

router.post('/admin/table-data/:tableName', isAuthenticated, isAdmin, async (req, res) => {
    const { tableName } = req.params;
    const { searchTerm } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        const [tables] = await connection.execute(`SHOW TABLES`);
        const validTableNames = tables.map(t => Object.values(t)[0]);
        if (!validTableNames.includes(tableName)) return res.status(400).json({ success: false, message: 'Nama tabel tidak valid.' });

        const [columnsResult] = await connection.execute(`DESCRIBE \`${tableName}\``);
        const columnNames = columnsResult.map(col => col.Field);
        const pkColumnInfo = columnsResult.find(col => col.Key === 'PRI');
        const primaryKeyColumn = pkColumnInfo ? pkColumnInfo.Field : columnNames[0];

        let query = `SELECT * FROM \`${tableName}\``;
        let params = [];
        if (searchTerm) {
            const whereClauses = columnNames.map(col => `CAST(\`${col}\` AS CHAR) LIKE ?`).join(' OR ');
            query += ` WHERE ${whereClauses}`;
            params = columnNames.map(() => `%${searchTerm}%`);
        }
        if (tableName === 'users') {
          query += ` ORDER BY \`${primaryKeyColumn}\``;
        } else {
          query += ` ORDER BY \`${primaryKeyColumn}\` DESC LIMIT 200`;
        }
        // query += ` ORDER BY \`${primaryKeyColumn}\``;
        const [data] = await connection.execute(query, params);
        res.json({ success: true, columns: columnNames, data: data, primaryKey: primaryKeyColumn });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data tabel: ' + error.message });
    } finally {
        if(connection) connection.release();
    }
});

router.post('/admin/update-row', isAuthenticated, isAdmin, async (req, res) => {
    const { tableName, primaryKeyColumn, primaryKeyValue, updatedData } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        const [tables] = await connection.execute(`SHOW TABLES`);
        if (!tables.map(t => Object.values(t)[0]).includes(tableName)) return res.status(400).json({ success: false, message: 'Nama tabel tidak valid.' });

        const [columnsResult] = await connection.execute(`DESCRIBE \`${tableName}\``);
        const validColumnNames = columnsResult.map(c => c.Field);
        if (!validColumnNames.includes(primaryKeyColumn)) return res.status(400).json({ success: false, message: 'Kolom primary key tidak valid.' });

        const setClauses = Object.keys(updatedData).map(col => {
            if (!validColumnNames.includes(col)) throw new Error(`Kolom '${col}' tidak valid.`);
            return `\`${col}\` = ?`;
        }).join(', ');
        
        const params = [...Object.values(updatedData), primaryKeyValue];
        const [result] = await connection.execute(`UPDATE \`${tableName}\` SET ${setClauses} WHERE \`${primaryKeyColumn}\` = ?`, params);
        if (result.affectedRows === 0) throw new Error(`Gagal memperbarui data.`);
        res.json({ success: true, message: 'Data berhasil diperbarui.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal memperbarui data: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.post('/admin/no-otp/add', isAuthenticated, isAdmin, async (req, res) => {
    const { product_id, product_name, amount, category, provider, description } = req.body;
    if (!product_id || !product_name || !amount) return res.status(400).json({ success: false, message: 'Data wajib diisi.' });
    try {
        const query = `INSERT INTO no_otp (product_id, product_name, amount, category, provider, description) VALUES (?, ?, ?, ?, ?, ?)`;
        await dbRun(query, [product_id, product_name, amount, category, provider, description]);
        res.json({ success: true, message: 'Produk No OTP berhasil ditambahkan.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Gagal: ID Produk sudah ada.' });
        res.status(500).json({ success: false, message: 'Gagal menambahkan data: ' + error.message });
    }
});

router.post('/admin/delete-row', isAuthenticated, isAdmin, async (req, res) => {
    const { tableName, primaryKeyColumn, primaryKeyValue } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        const [tables] = await connection.execute(`SHOW TABLES`);
        if (!tables.map(t => Object.values(t)[0]).includes(tableName)) return res.status(400).json({ success: false, message: 'Nama tabel tidak valid.' });

        const [columnsResult] = await connection.execute(`DESCRIBE \`${tableName}\``);
        if (!columnsResult.map(c => c.Field).includes(primaryKeyColumn)) return res.status(400).json({ success: false, message: 'Kolom primary key tidak valid.' });

        const [result] = await connection.execute(`DELETE FROM \`${tableName}\` WHERE \`${primaryKeyColumn}\` = ?`, [primaryKeyValue]);
        if (result.affectedRows === 0) throw new Error(`Gagal menghapus data.`);
        res.json({ success: true, message: 'Data berhasil dihapus.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menghapus data: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/announcement', isAuthenticated, async (req, res) => {
    try {
        const row = await dbGet(`SELECT setting_value FROM settings WHERE setting_key = ?`, ['announcement']);
        res.json({ success: true, announcement: row ? row.setting_value : '' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil pengumuman.' });
    }
});

router.post('/admin/update-announcement', isAuthenticated, isAdmin, async (req, res) => {
    const { announcement } = req.body;
    if (typeof announcement === 'undefined') return res.status(400).json({ success: false, message: 'Konten pengumuman tidak boleh kosong.' });
    try {
        await dbRun(`UPDATE settings SET setting_value = ? WHERE setting_key = ?`, [announcement, 'announcement']);
        res.json({ success: true, message: 'Pengumuman berhasil diperbarui.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal memperbarui pengumuman.' });
    }
});

module.exports = router;
