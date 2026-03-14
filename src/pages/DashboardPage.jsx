import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function DashboardPage({ user }) {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    fetch('/api/announcement')
      .then((res) => res.json())
      .then((data) => { if (data.success) setAnnouncement(data.announcement); })
      .catch(() => {});
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Dashboard</h2>

      {announcement && (
        <div className="bg-yellow-900/30 border border-yellow-600 text-yellow-200 px-4 py-3 rounded-lg mb-6">
          <span className="font-semibold">📢 Pengumuman:</span> {announcement}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-darker rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Username</p>
          <p className="text-white text-lg font-semibold">{user?.username}</p>
        </div>
        <div className="bg-darker rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Saldo</p>
          <p className="text-green-400 text-lg font-semibold">Rp {(user?.balance || 0).toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-darker rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Email</p>
          <p className="text-white text-lg font-semibold">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { label: 'Top Up', href: '/topup', icon: '💰' },
          { label: 'XL Auth', href: '/xl-auth', icon: '🔑' },
          { label: 'XL Tembak', href: '/xl-tembak', icon: '🎯' },
          { label: 'Akrab V1', href: '/akrab-v1', icon: '📦' },
          { label: 'Akrab V2', href: '/akrab-v2', icon: '📦' },
          { label: 'Akrab V3', href: '/akrab-v3', icon: '📦' },
          { label: 'No OTP', href: '/no-otp', icon: '📱' },
          { label: 'Cek Paket', href: '/cek-paket', icon: '🔍' },
        ].map((item) => (
          <Link key={item.href} to={item.href} className="bg-darker rounded-xl p-4 border border-gray-700 hover:border-primary transition-colors text-center">
            <div className="text-3xl mb-2">{item.icon}</div>
            <p className="text-white text-sm font-medium">{item.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
