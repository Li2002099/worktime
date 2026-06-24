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

        {/* 桌面版導航（顯示在 navbar 中間） */}
        <ul className="navbar-nav-desktop">
          {user?.role === 'user' && (
            <>
              <li><NavLink to="/dashboard">打卡首頁</NavLink></li>
              <li><NavLink to="/records">打卡紀錄</NavLink></li>
            </>
          )}
          {user?.role === 'admin' && (
            <li><NavLink to="/admin">管理後台</NavLink></li>
          )}
        </ul>

        <div className="navbar-right">
          <span className="navbar-user">👤 {user?.name}</span>
          <button className="navbar-logout" onClick={handleLogout}>
            登出
          </button>
        </div>
      </nav>

      {/* 底部導航（手機用） / 頂部導航（桌面用） */}
      <ul className="navbar-nav">
        {user?.role === 'user' && (
          <>
            <li>
              <NavLink to="/dashboard">
                <span className="nav-icon">⏰</span>
                <span className="nav-label">打卡首頁</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/records">
                <span className="nav-icon">📋</span>
                <span className="nav-label">打卡紀錄</span>
              </NavLink>
            </li>
          </>
        )}
        {user?.role === 'admin' && (
          <li>
            <NavLink to="/admin">
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">管理後台</span>
            </NavLink>
          </li>
        )}
      </ul>
      <main>{children}</main>
    </>
  );
}
