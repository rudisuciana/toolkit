import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function RegisterPage() {
  const [form, setForm] = useState({ username: '', phone: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        navigate('/verify-otp');
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
        <h1 className="text-3xl font-bold text-white text-center mb-2">Daftar Akun</h1>
        <p className="text-gray-400 text-center mb-6">Buat akun WUZZSTORE baru</p>
        {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-1">Username</label>
            <input type="text" name="username" value={form.username} onChange={handleChange} className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-1">No. HP</label>
            <input type="text" name="phone" value={form.phone} onChange={handleChange} className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary" required />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm mb-1">Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary" required minLength={6} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-secondary text-white py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50">
            {loading ? 'Loading...' : 'Daftar'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-400">
          Sudah punya akun? <Link to="/login" className="text-primary hover:underline">Login</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
