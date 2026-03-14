import React, { useState, useEffect } from 'react';

function TopupPage() {
  const [amount, setAmount] = useState('');
  const [deposits, setDeposits] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPending = async () => {
    const res = await fetch('/api/deposits/pending');
    const data = await res.json();
    if (data.success) setDeposits(data.data);
  };

  useEffect(() => { fetchPending(); }, []);

  const handleQris = async () => {
    if (!amount || amount < 10000) return setError('Minimal top up Rp 10.000');
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/payment/generate-qris', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseAmount: parseInt(amount) }) });
      const data = await res.json();
      if (data.success) { setResult(data); fetchPending(); }
      else setError(data.message);
    } catch { setError('Gagal menghubungi server.'); }
    finally { setLoading(false); }
  };

  const handleTransfer = async () => {
    if (!amount || amount < 10000) return setError('Minimal top up Rp 10.000');
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/payment/generate-topup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseAmount: parseInt(amount) }) });
      const data = await res.json();
      if (data.success) { setResult(data); fetchPending(); }
      else setError(data.message);
    } catch { setError('Gagal menghubungi server.'); }
    finally { setLoading(false); }
  };

  const handleCancel = async (topUpId) => {
    if (!confirm('Yakin ingin membatalkan deposit ini?')) return;
    const res = await fetch(`/api/deposit/cancel/${topUpId}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) fetchPending();
    else alert(data.message);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Top Up Saldo</h2>
      {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">{error}</div>}

      <div className="bg-darker rounded-xl p-6 border border-gray-700 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Buat Deposit Baru</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Masukkan nominal (min 10.000)" className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary" />
          <button onClick={handleQris} disabled={loading} className="bg-primary hover:bg-secondary text-white px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">QRIS</button>
          <button onClick={handleTransfer} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">Transfer</button>
        </div>
      </div>

      {result && (
        <div className="bg-darker rounded-xl p-6 border border-green-700 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Detail Pembayaran</h3>
          <p className="text-gray-300">ID: <span className="text-white font-mono">{result.topUpId}</span></p>
          <p className="text-gray-300">Nominal: <span className="text-green-400 font-bold">Rp {result.finalAmount?.toLocaleString('id-ID')}</span></p>
          {result.rekening && <p className="text-gray-300">No. Rek: <span className="text-white font-mono">{result.rekening}</span></p>}
          {result.norek && <p className="text-gray-300">No. Rek: <span className="text-white font-mono">{result.norek}</span></p>}
        </div>
      )}

      {deposits.length > 0 && (
        <div className="bg-darker rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Deposit Pending</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Nominal</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d.top_up_id} className="border-b border-gray-800 text-gray-300">
                    <td className="py-2 font-mono text-xs">{d.top_up_id}</td>
                    <td className="py-2">Rp {d.amount?.toLocaleString('id-ID')}</td>
                    <td className="py-2"><span className="bg-yellow-600 text-white px-2 py-0.5 rounded text-xs">{d.status}</span></td>
                    <td className="py-2">
                      <button onClick={() => handleCancel(d.top_up_id)} className="text-red-400 hover:text-red-300 text-xs">Batalkan</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TopupPage;
