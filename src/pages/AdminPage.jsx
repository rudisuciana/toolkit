import React, { useState, useEffect } from 'react';

function AdminPage() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [primaryKey, setPrimaryKey] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [editRow, setEditRow] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetch('/api/admin/tables').then((r) => r.json()).then((d) => { if (d.success) setTables(d.tables); });
    fetch('/api/announcement').then((r) => r.json()).then((d) => { if (d.success) setAnnouncement(d.announcement || ''); });
  }, []);

  const fetchTableData = async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/table-data/${selectedTable}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searchTerm }) });
      const data = await res.json();
      if (data.success) { setColumns(data.columns); setTableData(data.data); setPrimaryKey(data.primaryKey); }
    } catch { setError('Gagal memuat data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (selectedTable) fetchTableData(); }, [selectedTable]);

  const handleUpdateRow = async () => {
    setError(''); setMessage('');
    try {
      const res = await fetch('/api/admin/update-row', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableName: selectedTable, primaryKeyColumn: primaryKey, primaryKeyValue: editRow, updatedData: editData }) });
      const data = await res.json();
      if (data.success) { setMessage(data.message); setEditRow(null); fetchTableData(); }
      else setError(data.message);
    } catch { setError('Gagal memperbarui.'); }
  };

  const handleDeleteRow = async (pkValue) => {
    if (!confirm('Yakin ingin menghapus baris ini?')) return;
    try {
      const res = await fetch('/api/admin/delete-row', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableName: selectedTable, primaryKeyColumn: primaryKey, primaryKeyValue: pkValue }) });
      const data = await res.json();
      if (data.success) { setMessage(data.message); fetchTableData(); }
      else setError(data.message);
    } catch { setError('Gagal menghapus.'); }
  };

  const handleUpdateAnnouncement = async () => {
    try {
      const res = await fetch('/api/admin/update-announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ announcement }) });
      const data = await res.json();
      data.success ? setMessage(data.message) : setError(data.message);
    } catch { setError('Gagal memperbarui.'); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Admin Panel</h2>
      {message && <div className="bg-green-900/50 border border-green-500 text-green-300 px-4 py-2 rounded-lg mb-4">{message}</div>}
      {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">{error}</div>}

      <div className="bg-darker rounded-xl p-6 border border-gray-700 mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Pengumuman</h3>
        <div className="flex gap-3">
          <input type="text" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="Isi pengumuman..." />
          <button onClick={handleUpdateAnnouncement} className="bg-primary hover:bg-secondary text-white px-6 py-2 rounded-lg transition-colors">Simpan</button>
        </div>
      </div>

      <div className="bg-darker rounded-xl p-6 border border-gray-700 mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Database Manager</h3>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)} className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
            <option value="">-- Pilih Tabel --</option>
            {tables.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari..." className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" />
          <button onClick={fetchTableData} disabled={loading} className="bg-primary hover:bg-secondary text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50">Cari</button>
        </div>

        {columns.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  {columns.map((col) => (<th key={col} className="text-left py-2 px-2 whitespace-nowrap">{col}</th>))}
                  <th className="text-left py-2 px-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800 text-gray-300">
                    {columns.map((col) => (
                      <td key={col} className="py-2 px-2 max-w-[200px] truncate">
                        {editRow === row[primaryKey] ? (
                          <input type="text" value={editData[col] ?? row[col] ?? ''} onChange={(e) => setEditData({ ...editData, [col]: e.target.value })} className="bg-gray-700 text-white border border-gray-500 rounded px-2 py-1 w-full text-xs" />
                        ) : (
                          String(row[col] ?? '')
                        )}
                      </td>
                    ))}
                    <td className="py-2 px-2 whitespace-nowrap">
                      {editRow === row[primaryKey] ? (
                        <div className="flex gap-1">
                          <button onClick={handleUpdateRow} className="text-green-400 hover:text-green-300 text-xs">Simpan</button>
                          <button onClick={() => setEditRow(null)} className="text-gray-400 hover:text-gray-300 text-xs">Batal</button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => { setEditRow(row[primaryKey]); setEditData({}); }} className="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
                          <button onClick={() => handleDeleteRow(row[primaryKey])} className="text-red-400 hover:text-red-300 text-xs">Hapus</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {tableData.length === 0 && <tr><td colSpan={columns.length + 1} className="text-center text-gray-500 py-8">Tidak ada data.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
