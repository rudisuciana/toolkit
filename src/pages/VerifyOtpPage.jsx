import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function VerifyOtpPage() {
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        setTimeout(() => navigate('/login'), 2000);
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
        <h1 className="text-2xl font-bold text-white text-center mb-2">Verifikasi OTP</h1>
        <p className="text-gray-400 text-center mb-6">Masukkan kode OTP yang dikirim ke email Anda</p>
        {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">{error}</div>}
        {message && <div className="bg-green-900/50 border border-green-500 text-green-300 px-4 py-2 rounded-lg mb-4">{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} placeholder="Masukkan 6 digit OTP" className="w-full bg-gray-800 text-white text-center text-2xl tracking-widest border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-secondary text-white py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50">
            {loading ? 'Memverifikasi...' : 'Verifikasi'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default VerifyOtpPage;
