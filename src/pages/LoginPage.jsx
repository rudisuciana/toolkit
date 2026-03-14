import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.needVerification) {
          navigate('/verify-otp');
        } else {
          await onLogin();
          navigate('/dashboard');
        }
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
        <h1 className="text-3xl font-bold text-white text-center mb-2">WUZZSTORE</h1>
        <p className="text-gray-400 text-center mb-6">Silakan login ke akun Anda</p>
        {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-1">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary" required />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-secondary text-white py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50">
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline">Lupa Password?</Link>
        </div>
        <div className="mt-2 text-center text-sm text-gray-400">
          Belum punya akun? <Link to="/register" className="text-primary hover:underline">Daftar</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
