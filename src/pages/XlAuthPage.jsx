import React, { useState } from 'react';

function XlAuthPage() {
  const [number, setNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('request');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    if (!number) return setError('Masukkan nomor XL/Axis.');
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/xl/request-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number }) });
      const data = await res.json();
      if (data.success) { setMessage('OTP berhasil dikirim ke nomor ' + number); setStep('verify'); }
      else setError(data.message);
    } catch { setError('Gagal menghubungi server.'); }
    finally { setLoading(false); }
  };

  const loginOtp = async () => {
    if (!otp) return setError('Masukkan kode OTP.');
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/xl/login-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number, otp }) });
      const data = await res.json();
      if (data.success) { setMessage('Login berhasil! Nomor ' + number + ' telah terautentikasi.'); setStep('done'); }
      else setError(data.message);
    } catch { setError('Gagal menghubungi server.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">XL Authentication</h2>
      {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">{error}</div>}
      {message && <div className="bg-green-900/50 border border-green-500 text-green-300 px-4 py-2 rounded-lg mb-4">{message}</div>}

      <div className="bg-darker rounded-xl p-6 border border-gray-700 max-w-md">
        <div className="mb-4">
          <label className="block text-gray-300 text-sm mb-1">Nomor XL/Axis</label>
          <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="08xxxxxxxxxx" className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary" disabled={step !== 'request'} />
        </div>

        {step === 'request' && (
          <button onClick={requestOtp} disabled={loading} className="w-full bg-primary hover:bg-secondary text-white py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Mengirim...' : 'Kirim OTP'}
          </button>
        )}

        {step === 'verify' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-1">Kode OTP</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Masukkan OTP" className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary" />
            </div>
            <button onClick={loginOtp} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
            </button>
          </>
        )}

        {step === 'done' && (
          <button onClick={() => { setStep('request'); setNumber(''); setOtp(''); setMessage(''); }} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-lg transition-colors">
            Auth Nomor Lain
          </button>
        )}
      </div>
    </div>
  );
}

export default XlAuthPage;
