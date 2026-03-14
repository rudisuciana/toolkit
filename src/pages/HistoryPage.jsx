import React, { useState } from 'react';

function HistoryPage() {
  const [tab, setTab] = useState('transactions');
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    const endpoint = tab === 'transactions' ? '/api/history/transactions' : '/api/history/topups';
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searchTerm, startDate, endDate }) });
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const statusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'success' || s === 'sukses') return 'bg-green-600';
    if (s === 'failed' || s === 'gagal') return 'bg-red-600';
    return 'bg-yellow-600';
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Riwayat</h2>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('transactions')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'transactions' ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300'}`}>Transaksi</button>
        <button onClick={() => setTab('topups')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'topups' ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300'}`}>Top Up</button>
      </div>

      <div className="bg-darker rounded-xl p-4 border border-gray-700 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari..." className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" />
          <button onClick={fetchHistory} disabled={loading} className="bg-primary hover:bg-secondary text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Loading...' : 'Cari'}
          </button>
        </div>
      </div>

      <div className="bg-darker rounded-xl p-4 border border-gray-700 overflow-x-auto">
        {tab === 'transactions' ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2">Ref ID</th>
                <th className="text-left py-2">Produk</th>
                <th className="text-left py-2">Tujuan</th>
                <th className="text-left py-2">Harga</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">SN</th>
                <th className="text-left py-2">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t, i) => (
                <tr key={i} className="border-b border-gray-800 text-gray-300">
                  <td className="py-2 font-mono text-xs">{t.ref_id}</td>
                  <td className="py-2">{t.product_name}</td>
                  <td className="py-2">{t.destination}</td>
                  <td className="py-2">Rp {(t.price || 0).toLocaleString('id-ID')}</td>
                  <td className="py-2"><span className={`${statusBadge(t.status)} text-white px-2 py-0.5 rounded text-xs`}>{t.status}</span></td>
                  <td className="py-2 text-xs">{t.serial_number || '-'}</td>
                  <td className="py-2 text-xs">{t.updated_at ? new Date(t.updated_at).toLocaleString('id-ID') : '-'}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-8">Tidak ada data. Klik "Cari" untuk memuat.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2">Top Up ID</th>
                <th className="text-left py-2">Nominal</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t, i) => (
                <tr key={i} className="border-b border-gray-800 text-gray-300">
                  <td className="py-2 font-mono text-xs">{t.top_up_id}</td>
                  <td className="py-2">Rp {(t.amount || 0).toLocaleString('id-ID')}</td>
                  <td className="py-2"><span className={`${statusBadge(t.status)} text-white px-2 py-0.5 rounded text-xs`}>{t.status}</span></td>
                  <td className="py-2 text-xs">{t.updated_at ? new Date(t.updated_at).toLocaleString('id-ID') : '-'}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={4} className="text-center text-gray-500 py-8">Tidak ada data. Klik "Cari" untuk memuat.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;
