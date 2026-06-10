import React, { useState } from 'react';

export default function Login({ API_URL, onLoginSuccess }) {
  const [roleSelection, setRoleSelection] = useState('cashier'); // 'cashier' or 'admin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all credentials fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Check credentials.');
      }

      // Safe saving of login details
      localStorage.setItem('dorado_pos_token', data.token);
      localStorage.setItem('dorado_pos_user', JSON.stringify(data.user));
      
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const autofillDemo = (selectedRole) => {
    setRoleSelection(selectedRole);
    if (selectedRole === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('cashier');
      setPassword('cashier123');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Background Neon Orbs */}
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(0, 242, 254, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
        top: '15%',
        left: '20%',
        pointerEvents: 'none'
      }}></div>
      
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(255, 42, 95, 0.1) 0%, rgba(0, 0, 0, 0) 70%)',
        bottom: '15%',
        right: '20%',
        pointerEvents: 'none'
      }}></div>

      <div className="glass-panel-glow animate-fade-in" style={{
        width: '100%',
        maxWidth: '430px',
        padding: '40px',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Glowing Logo Icon */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(0,242,254,0.2) 0%, rgba(79,172,254,0.1) 100%)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            boxShadow: '0 0 20px rgba(0, 242, 254, 0.2)',
            marginBottom: '16px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          
          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: '800',
            letterSpacing: '1px',
            background: 'linear-gradient(135deg, #fff 30%, var(--text-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '4px'
          }}>
            DORADO ESSENCE
          </h1>
          <p style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '2px' }}>
            SMART POS TERMINAL
          </p>
        </div>

        {/* Auth Role Selectors */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '28px'
        }}>
          <button
            type="button"
            onClick={() => autofillDemo('cashier')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              background: roleSelection === 'cashier' ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
              color: roleSelection === 'cashier' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: '600',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
          >
            Cashier Login
          </button>
          
          <button
            type="button"
            onClick={() => autofillDemo('admin')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              background: roleSelection === 'admin' ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
              color: roleSelection === 'admin' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: '600',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
          >
            Admin Dashboard
          </button>
        </div>

        {/* Error Message banner */}
        {error && (
          <div style={{
            background: 'rgba(255, 42, 95, 0.1)',
            border: '1px solid rgba(255, 42, 95, 0.3)',
            borderRadius: '10px',
            color: '#ff6b8b',
            padding: '12px',
            fontSize: '0.9rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              className="glass-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="glass-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              marginTop: '10px',
              padding: '14px',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {loading ? (
              <span className="animate-pulse-slow">Authenticating...</span>
            ) : (
              <>
                <span>Sign In Terminal</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Quick autofill helper */}
        <div style={{
          marginTop: '25px',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: '20px'
        }}>
          💡 Click a tab above to auto-fill default system credentials!
        </div>
      </div>
    </div>
  );
}
