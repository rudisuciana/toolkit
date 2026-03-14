import React, { useState, useEffect } from 'react';

function AkrabV1Page() {
  const [products, setProducts] = useState([]);
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/xl/akrab-stock', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => { if (data.success && data.data) setProducts(data.data); })
      .catch(() => {});
  }, []);

  const handleInvite = async (code) => {
    const parentName = prompt('Masukkan nama parent (pemilik induk):');
    if (!parentName) return;
    if (!number) return setError('Masukkan nomor tujuan.');
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/xl/akrab/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, parent_name: parentName, destination: number }) });
      const data = await res.json();
      if (data.success) setMessage('Invite berhasil! Ref: ' + (data.data?.ref_id || ''));
      else setError(data.message);
    } catch { setError('Gagal menghubungi server.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Akrab V1 (Flaz)</h2>
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
            <p className="text-gray-400 text-sm mb-1">Kode: {p.code}</p>
            <p className="text-gray-400 text-sm mb-2">Stok: {p.stock ?? 'N/A'}</p>
            <p className="text-green-400 font-bold mb-3">Rp {(p.price || 0).toLocaleString('id-ID')}</p>
            <button onClick={() => handleInvite(p.code)} disabled={loading} className="w-full bg-primary hover:bg-secondary text-white py-2 rounded-lg text-sm transition-colors disabled:opacity-50">Invite</button>
          </div>
        ))}
        {products.length === 0 && <p className="text-gray-500 col-span-full text-center py-8">Memuat produk...</p>}
      </div>
    </div>
  );
}

export default AkrabV1Page;
