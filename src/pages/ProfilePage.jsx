import React, { useState } from 'react';

function ProfilePage({ user, onUpdate }) {
  const [form, setForm] = useState({ username: user?.username || '', phone: user?.phone || '', email: user?.email || '', telegram: user?.telegram || '' });
  const [webhookUrl, setWebhookUrl] = useState(user?.webhook || '');
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const showMsg = (msg, isErr = false) => { isErr ? setError(msg) : setMessage(msg); setTimeout(() => { setError(''); setMessage(''); }, 3000); };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/profile/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    data.success ? (showMsg(data.message), onUpdate()) : showMsg(data.message, true);
  };

  const handleWebhookUpdate = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/profile/update-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ webhook: webhookUrl }) });
    const data = await res.json();
    data.success ? showMsg(data.message) : showMsg(data.message, true);
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/password/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(passwordForm) });
    const data = await res.json();
    data.success ? (showMsg(data.message), setPasswordForm({ oldPassword: '', newPassword: '' })) : showMsg(data.message, true);
  };

  const handleRegenApiKey = async () => {
    if (!confirm('Yakin ingin generate API Key baru?')) return;
    const res = await fetch('/api/apikey/regenerate', { method: 'POST' });
    const data = await res.json();
    data.success ? (showMsg('API Key baru: ' + data.newApiKey), onUpdate()) : showMsg(data.message, true);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Profil</h2>
      {message && <div className="bg-green-900/50 border border-green-500 text-green-300 px-4 py-2 rounded-lg mb-4">{message}</div>}
      {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-darker rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Informasi Profil</h3>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            {['username', 'phone', 'email', 'telegram'].map((field) => (
              <div key={field}>
                <label className="block text-gray-300 text-sm mb-1 capitalize">{field}</label>
                <input type="text" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" />
              </div>
            ))}
            <button type="submit" className="bg-primary hover:bg-secondary text-white px-6 py-2 rounded-lg transition-colors">Simpan Profil</button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-darker rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Ubah Password</h3>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Password Lama</label>
                <input type="password" value={passwordForm.oldPassword} onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" required />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Password Baru</label>
                <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" required minLength={6} />
              </div>
              <button type="submit" className="bg-primary hover:bg-secondary text-white px-6 py-2 rounded-lg transition-colors">Ubah Password</button>
            </form>
          </div>

          <div className="bg-darker rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Webhook URL</h3>
            <form onSubmit={handleWebhookUpdate} className="space-y-4">
              <input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://example.com/webhook" className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" />
              <button type="submit" className="bg-primary hover:bg-secondary text-white px-6 py-2 rounded-lg transition-colors">Simpan Webhook</button>
            </form>
          </div>

          <div className="bg-darker rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">API Key</h3>
            <p className="text-gray-400 text-sm mb-2 break-all">{user?.apikey}</p>
            <button onClick={handleRegenApiKey} className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg transition-colors">Generate Baru</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
