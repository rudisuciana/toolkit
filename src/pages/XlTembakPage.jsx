import React, { useState } from 'react';

function XlTembakPage() {
  const [number, setNumber] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchProducts = async () => {
    if (!number) return setError('Masukkan nomor XL/Axis.');
    setLoading(true); setError(''); setProducts([]);
    try {
      const res = await fetch('/api/xl/get-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number }) });
      const data = await res.json();
      if (data.success && data.data?.products) setProducts(data.data.products);
      else setError(data.message || 'Gagal mengambil produk.');
    } catch { setError('Gagal menghubungi server.'); }
    finally { setLoading(false); }
  };

  const buyPackage = async (code, payment) => {
    if (!confirm('Yakin ingin membeli paket ini?')) return;
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/xl/buy-package', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number, code, payment }) });
      const data = await res.json();
      if (data.success) setMessage('Pembelian berhasil! Ref: ' + (data.data?.ref_id || ''));
      else setError(data.message);
    } catch { setError('Gagal menghubungi server.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">XL Tembak Paket</h2>
      {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">{error}</div>}
      {message && <div className="bg-green-900/50 border border-green-500 text-green-300 px-4 py-2 rounded-lg mb-4">{message}</div>}

      <div className="bg-darker rounded-xl p-6 border border-gray-700 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Nomor XL/Axis" className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary" />
          <button onClick={fetchProducts} disabled={loading} className="bg-primary hover:bg-secondary text-white px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Loading...' : 'Cari Paket'}
          </button>
        </div>
      </div>

      {products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p, i) => (
            <div key={i} className="bg-darker rounded-xl p-4 border border-gray-700">
              <h4 className="text-white font-semibold mb-1">{p.name}</h4>
              <p className="text-gray-400 text-sm mb-2">{p.description || p.code}</p>
              <p className="text-green-400 font-bold mb-3">Rp {(p.final_price || p.fee || 0).toLocaleString('id-ID')}</p>
              <button onClick={() => buyPackage(p.code, 'SALDO')} disabled={loading} className="w-full bg-primary hover:bg-secondary text-white py-2 rounded-lg text-sm transition-colors disabled:opacity-50">Beli</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default XlTembakPage;
