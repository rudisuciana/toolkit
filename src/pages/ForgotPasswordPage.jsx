import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
      } else {
        setError(data.message);
      }
    } catch {
      setError('Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="bg-darker rounded-xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-2">Lupa Password</h1>
        <p className="text-gray-400 text-center mb-6">Masukkan email untuk menerima link reset password</p>
        {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">{error}</div>}
        {message && <div className="bg-green-900/50 border border-green-500 text-green-300 px-4 py-2 rounded-lg mb-4">{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-secondary text-white py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50">
            {loading ? 'Mengirim...' : 'Kirim Link Reset'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-400">
          <Link to="/login" className="text-primary hover:underline">Kembali ke Login</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
