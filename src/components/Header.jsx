import React from 'react';
import { useNavigate } from 'react-router-dom';

function Header({ user, onToggleSidebar, setUser }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await fetch('/api/logout');
    setUser(null);
    navigate('/login');
  };

  return (
    <header className="bg-darker text-white px-4 py-3 flex items-center justify-between shadow-md lg:ml-64">
      <button onClick={onToggleSidebar} className="lg:hidden text-white text-2xl">☰</button>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-300">
          Saldo: <span className="font-bold text-green-400">Rp {(user?.balance || 0).toLocaleString('id-ID')}</span>
        </span>
      </div>
      <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm transition-colors">
        Logout
      </button>
    </header>
  );
}

export default Header;
