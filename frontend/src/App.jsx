import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import CashierPanel from './components/CashierPanel';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Dynamically resolve API endpoint (Cloud URL or Local Network)
  const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

  // Verify stored session on boot
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('dorado_pos_token');
      const storedUser = localStorage.getItem('dorado_pos_user');

      if (storedToken && storedUser) {
        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });

          if (response.ok) {
            const freshUser = await response.json();
            setUser(freshUser);
            setToken(storedToken);
            setIsLoggedIn(true);
          } else {
            // Token expired or invalid
            handleLogout();
          }
        } catch (error) {
          console.warn('Network issue checking profile token. Using cached profile.', error);
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          setIsLoggedIn(true);
        }
      }
      setCheckingSession(false);
    };

    verifySession();
  }, []);

  const handleLoginSuccess = (loggedInUser, userToken) => {
    setUser(loggedInUser);
    setToken(userToken);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('dorado_pos_token');
    localStorage.removeItem('dorado_pos_user');
    setUser(null);
    setToken(null);
    setIsLoggedIn(false);
  };

  if (checkingSession) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
        gap: '20px'
      }}>
        {/* Sleek rotating glass portal animation */}
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '3px solid rgba(0, 242, 254, 0.1)',
          borderTopColor: 'var(--accent-cyan)',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ fontSize: '0.9rem', letterSpacing: '1px', fontWeight: '500' }}>
          Configuring POS Terminal System...
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      {!isLoggedIn ? (
        <Login API_URL={API_URL} onLoginSuccess={handleLoginSuccess} />
      ) : user.role === 'admin' ? (
        <AdminDashboard API_URL={API_URL} token={token} user={user} onLogout={handleLogout} />
      ) : (
        <CashierPanel API_URL={API_URL} token={token} user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
