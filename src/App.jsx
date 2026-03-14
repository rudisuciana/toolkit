import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import TopupPage from './pages/TopupPage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import XlAuthPage from './pages/XlAuthPage';
import XlTembakPage from './pages/XlTembakPage';
import AkrabV1Page from './pages/AkrabV1Page';
import AkrabV2Page from './pages/AkrabV2Page';
import AkrabV3Page from './pages/AkrabV3Page';
import NoOtpPage from './pages/NoOtpPage';
import CekPaketPage from './pages/CekPaketPage';
import Layout from './components/Layout';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user');
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage onLogin={fetchUser} /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/" element={user ? <Layout user={user} setUser={setUser} /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<DashboardPage user={user} />} />
          <Route path="profile" element={<ProfilePage user={user} onUpdate={fetchUser} />} />
          <Route path="topup" element={<TopupPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="xl-auth" element={<XlAuthPage />} />
          <Route path="xl-tembak" element={<XlTembakPage />} />
          <Route path="akrab-v1" element={<AkrabV1Page />} />
          <Route path="akrab-v2" element={<AkrabV2Page />} />
          <Route path="akrab-v3" element={<AkrabV3Page />} />
          <Route path="no-otp" element={<NoOtpPage />} />
          <Route path="cek-paket" element={<CekPaketPage />} />
          {user?.isAdmin && <Route path="admin" element={<AdminPage />} />}
        </Route>

        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
      </Routes>
    </Router>
  );
}

export default App;
