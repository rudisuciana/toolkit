import React from 'react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/topup', label: 'Top Up', icon: '💰' },
  { path: '/xl-auth', label: 'XL Auth', icon: '🔑' },
  { path: '/xl-tembak', label: 'XL Tembak', icon: '🎯' },
  { path: '/akrab-v1', label: 'Akrab V1', icon: '📦' },
  { path: '/akrab-v2', label: 'Akrab V2', icon: '📦' },
  { path: '/akrab-v3', label: 'Akrab V3', icon: '📦' },
  { path: '/no-otp', label: 'No OTP', icon: '📱' },
  { path: '/cek-paket', label: 'Cek Paket', icon: '🔍' },
  { path: '/history', label: 'Riwayat', icon: '📋' },
  { path: '/profile', label: 'Profil', icon: '👤' },
];

function Sidebar({ user, isOpen, onClose }) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-darker text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-primary">WUZZSTORE</h1>
          <p className="text-sm text-gray-400 mt-1">{user?.username}</p>
        </div>
        <nav className="p-2 overflow-y-auto h-[calc(100%-80px)]">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-colors ${isActive ? 'bg-primary text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          {user?.isAdmin && (
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-colors ${isActive ? 'bg-red-600 text-white' : 'text-red-400 hover:bg-red-900 hover:text-white'}`
              }
            >
              <span>⚙️</span>
              <span>Admin Panel</span>
            </NavLink>
          )}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
