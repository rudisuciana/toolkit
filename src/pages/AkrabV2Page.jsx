import React, { useState, useEffect } from 'react';

function AkrabV2Page() {
  const [products, setProducts] = useState([]);
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/xl/list-product', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => { if (data.success && data.data?.products) setProducts(data.data.products); })
      .catch(() => {});
  }, []);

  const handleOrder = async (code) => {
    if (!number) return setError('Masukkan nomor tujuan.');
    if (!confirm('Yakin ingin order paket ini?')) return;
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/xl/akrabv2/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, destination: number }) });
      const data = await res.json();
      if (data.success) setMessage('Order berhasil! Ref: ' + (data.data?.ref_id || ''));
      else setError(data.message);
    } catch { setError('Gagal menghubungi server.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Akrab V2 (Kaje)</h2>
      {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">{error}</div>}
      {message && <div className="bg-green-900/50 border border-green-500 text-green-300 px-4 py-2 rounded-lg mb-4">{message}</div>}

      <div className="bg-darker rounded-xl p-6 border border-gray-700 mb-6">
        <label className="block text-gray-300 text-sm mb-1">Nomor Tujuan</label>
        <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="08xxxxxxxxxx" className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p, i) => (
          <div key={i} className="bg-darker rounded-xl p-4 border border-gray-700">
            <h4 className="text-white font-semibold mb-1">{p.name}</h4>
            <p className="text-gray-400 text-sm mb-2">{p.code}</p>
            <p className="text-green-400 font-bold mb-3">Rp {(p.final_price || p.price || 0).toLocaleString('id-ID')}</p>
            <button onClick={() => handleOrder(p.code)} disabled={loading} className="w-full bg-primary hover:bg-secondary text-white py-2 rounded-lg text-sm transition-colors disabled:opacity-50">Order</button>
          </div>
        ))}
        {products.length === 0 && <p className="text-gray-500 col-span-full text-center py-8">Memuat produk...</p>}
      </div>
    </div>
  );
}

export default AkrabV2Page;
