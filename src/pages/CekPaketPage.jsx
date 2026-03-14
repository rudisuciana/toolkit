import React, { useState } from 'react';

function CekPaketPage() {
  const [number, setNumber] = useState('');
  const [result, setResult] = useState(null);
  const [quotas, setQuotas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkPackage = async () => {
    if (!number) return setError('Masukkan nomor.');
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/check-package', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number }) });
      const data = await res.json();
      if (data.success) setResult(data);
      else setError(data.message || 'Gagal mengecek paket.');
    } catch { setError('Gagal menghubungi server.'); }
    finally { setLoading(false); }
  };

  const checkQuotas = async () => {
    if (!number) return setError('Masukkan nomor.');
    setLoading(true); setError(''); setQuotas(null);
    try {
      const res = await fetch('/api/xl/check-quotas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number }) });
      const data = await res.json();
      if (data.success) setQuotas(data);
      else setError(data.message || 'Gagal mengecek kuota.');
    } catch { setError('Gagal menghubungi server.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Cek Paket & Kuota</h2>
      {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">{error}</div>}

      <div className="bg-darker rounded-xl p-6 border border-gray-700 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Nomor XL/Axis" className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary" />
          <button onClick={checkPackage} disabled={loading} className="bg-primary hover:bg-secondary text-white px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">Cek Paket</button>
          <button onClick={checkQuotas} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">Cek Kuota</button>
        </div>
      </div>

      {result && (
        <div className="bg-darker rounded-xl p-6 border border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Hasil Cek Paket</h3>
          <pre className="bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {quotas && (
        <div className="bg-darker rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Hasil Cek Kuota</h3>
          <pre className="bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">{JSON.stringify(quotas, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default CekPaketPage;
