import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // stateless logout，忽略後端錯誤
    }
    logout();
    navigate('/login');
  };

  return (
    <>
      <nav className="navbar">
        <span className="navbar-brand">員工打卡系統</span>

        <ul className="navbar-nav">
          {user?.role === 'user' && (
            <>
              <li>
                <NavLink to="/dashboard">打卡首頁</NavLink>
              </li>
              <li>
                <NavLink to="/records">打卡紀錄</NavLink>
              </li>
            </>
          )}
          {user?.role === 'admin' && (
            <li>
              <NavLink to="/admin">管理後台</NavLink>
            </li>
          )}
        </ul>

        <div className="navbar-right">
          <span className="navbar-user">👤 {user?.name}</span>
          <button className="navbar-logout" onClick={handleLogout}>
            登出
          </button>
        </div>
      </nav>
      <main>{children}</main>
    </>
  );
}
