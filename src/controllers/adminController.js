const pool = require('../config/database');
const logger = require('../config/logger');
const settingRepository = require('../repositories/settingRepository');
const noOtpRepository = require('../repositories/noOtpRepository');

const getTables = async (req, res) => {
  try {
    const tables = await settingRepository.getTables();
    res.json({ success: true, tables });
  } catch (error) {
    logger.error('getTables error: ' + error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar tabel: ' + error.message });
  }
};

const getTableData = async (req, res) => {
  const { tableName } = req.params;
  const { searchTerm } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    const isValid = await settingRepository.validateTable(connection, tableName);
    if (!isValid) return res.status(400).json({ success: false, message: 'Nama tabel tidak valid.' });
    const result = await settingRepository.getTableData(connection, tableName, searchTerm);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('getTableData error: ' + error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data tabel: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

const updateRow = async (req, res) => {
  const { tableName, primaryKeyColumn, primaryKeyValue, updatedData } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    const isValid = await settingRepository.validateTable(connection, tableName);
    if (!isValid) return res.status(400).json({ success: false, message: 'Nama tabel tidak valid.' });
    const validColumnNames = await settingRepository.validateColumns(connection, tableName);
    if (!validColumnNames.includes(primaryKeyColumn))
      return res.status(400).json({ success: false, message: 'Kolom primary key tidak valid.' });
    const [result] = await settingRepository.updateRow(connection, tableName, primaryKeyColumn, primaryKeyValue, updatedData, validColumnNames);
    if (result.affectedRows === 0) throw new Error('Gagal memperbarui data.');
    res.json({ success: true, message: 'Data berhasil diperbarui.' });
  } catch (error) {
    logger.error('updateRow error: ' + error.message);
    res.status(500).json({ success: false, message: 'Gagal memperbarui data: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

const addNoOtpProduct = async (req, res) => {
  const { product_id, product_name, amount, category, provider, description } = req.body;
  if (!product_id || !product_name || !amount) return res.status(400).json({ success: false, message: 'Data wajib diisi.' });
  try {
    await noOtpRepository.create({ product_id, product_name, amount, category, provider, description });
    res.json({ success: true, message: 'Produk No OTP berhasil ditambahkan.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Gagal: ID Produk sudah ada.' });
    logger.error('addNoOtpProduct error: ' + error.message);
    res.status(500).json({ success: false, message: 'Gagal menambahkan data: ' + error.message });
  }
};

const deleteRow = async (req, res) => {
  const { tableName, primaryKeyColumn, primaryKeyValue } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    const isValid = await settingRepository.validateTable(connection, tableName);
    if (!isValid) return res.status(400).json({ success: false, message: 'Nama tabel tidak valid.' });
    const validColumnNames = await settingRepository.validateColumns(connection, tableName);
    if (!validColumnNames.includes(primaryKeyColumn))
      return res.status(400).json({ success: false, message: 'Kolom primary key tidak valid.' });
    const [result] = await settingRepository.deleteRow(connection, tableName, primaryKeyColumn, primaryKeyValue);
    if (result.affectedRows === 0) throw new Error('Gagal menghapus data.');
    res.json({ success: true, message: 'Data berhasil dihapus.' });
  } catch (error) {
    logger.error('deleteRow error: ' + error.message);
    res.status(500).json({ success: false, message: 'Gagal menghapus data: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

const getAnnouncement = async (req, res) => {
  try {
    const row = await settingRepository.getAnnouncement();
    res.json({ success: true, announcement: row ? row.setting_value : '' });
  } catch (error) {
    logger.error('getAnnouncement error: ' + error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil pengumuman.' });
  }
};

const updateAnnouncement = async (req, res) => {
  const { announcement } = req.body;
  if (typeof announcement === 'undefined')
    return res.status(400).json({ success: false, message: 'Konten pengumuman tidak boleh kosong.' });
  try {
    await settingRepository.updateAnnouncement(announcement);
    res.json({ success: true, message: 'Pengumuman berhasil diperbarui.' });
  } catch (error) {
    logger.error('updateAnnouncement error: ' + error.message);
    res.status(500).json({ success: false, message: 'Gagal memperbarui pengumuman.' });
  }
};

module.exports = { getTables, getTableData, updateRow, addNoOtpProduct, deleteRow, getAnnouncement, updateAnnouncement };
