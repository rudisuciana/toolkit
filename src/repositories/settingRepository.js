const pool = require('../config/database');

const dbGet = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows[0];
};

const dbAll = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

const dbRun = async (sql, params = []) => {
  const [result] = await pool.execute(sql, params);
  return result;
};

const getAnnouncement = () => dbGet("SELECT setting_value FROM settings WHERE setting_key = ?", ['announcement']);
const updateAnnouncement = (value) => dbRun("UPDATE settings SET setting_value = ? WHERE setting_key = ?", [value, 'announcement']);

const getTables = async () => {
  const tables = await dbAll('SHOW TABLES');
  return tables.map((t) => Object.values(t)[0]).filter((name) => name !== 'sessions');
};

const getTableData = async (connection, tableName, searchTerm) => {
  const [columnsResult] = await connection.execute(`DESCRIBE \`${tableName}\``);
  const columnNames = columnsResult.map((col) => col.Field);
  const pkColumnInfo = columnsResult.find((col) => col.Key === 'PRI');
  const primaryKeyColumn = pkColumnInfo ? pkColumnInfo.Field : columnNames[0];

  let query = `SELECT * FROM \`${tableName}\``;
  let params = [];
  if (searchTerm) {
    const whereClauses = columnNames.map((col) => `CAST(\`${col}\` AS CHAR) LIKE ?`).join(' OR ');
    query += ` WHERE ${whereClauses}`;
    params = columnNames.map(() => `%${searchTerm}%`);
  }
  if (tableName === 'users') {
    query += ` ORDER BY \`${primaryKeyColumn}\``;
  } else {
    query += ` ORDER BY \`${primaryKeyColumn}\` DESC LIMIT 200`;
  }
  const [data] = await connection.execute(query, params);
  return { columns: columnNames, data, primaryKey: primaryKeyColumn };
};

const validateTable = async (connection, tableName) => {
  const [tables] = await connection.execute('SHOW TABLES');
  return tables.map((t) => Object.values(t)[0]).includes(tableName);
};

const validateColumns = async (connection, tableName) => {
  const [columnsResult] = await connection.execute(`DESCRIBE \`${tableName}\``);
  return columnsResult.map((c) => c.Field);
};

const updateRow = async (connection, tableName, primaryKeyColumn, primaryKeyValue, updatedData, validColumnNames) => {
  const setClauses = Object.keys(updatedData)
    .map((col) => {
      if (!validColumnNames.includes(col)) throw new Error(`Kolom '${col}' tidak valid.`);
      return `\`${col}\` = ?`;
    })
    .join(', ');
  const params = [...Object.values(updatedData), primaryKeyValue];
  return connection.execute(`UPDATE \`${tableName}\` SET ${setClauses} WHERE \`${primaryKeyColumn}\` = ?`, params);
};

const deleteRow = (connection, tableName, primaryKeyColumn, primaryKeyValue) =>
  connection.execute(`DELETE FROM \`${tableName}\` WHERE \`${primaryKeyColumn}\` = ?`, [primaryKeyValue]);

module.exports = {
  getAnnouncement, updateAnnouncement, getTables, getTableData,
  validateTable, validateColumns, updateRow, deleteRow,
};
