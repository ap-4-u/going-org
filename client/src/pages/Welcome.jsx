import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Mail, Lock, X } from 'lucide-react';
import './Welcome.css';

export default function Welcome() {
  const navigate = useNavigate();
  const { setUser, API } = useUser();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [logging, setLogging] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setError('');
    setLogging(true);
    try {
      const r = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'Login failed');
      } else {
        setUser(data);
        navigate('/app');
      }
    } catch (err) {
      setError('Connection error. Try again.');
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="welcome-page">
      <div className="welcome-bg">
        <div className="welcome-orb orb-1" />
        <div className="welcome-orb orb-2" />
        <div className="welcome-orb orb-3" />
      </div>

      <div className="welcome-content fade-in">
        <div className="welcome-logo">
          <span className="logo-icon">G</span>
        </div>
        <h1 className="welcome-title">Going<span>.org</span></h1>
        <p className="welcome-sub">Find your future wife <span className="highlight-here">Here.</span></p>

        <div className="welcome-actions">
          <button className="btn-primary" onClick={() => navigate('/onboarding')}>
            Get Started
          </button>
        </div>

        <p className="welcome-footer">
          Already have an account? <button className="link-btn" onClick={() => setShowLogin(true)}>Sign in</button>
        </p>
      </div>

      {/* Login Modal */}
      {showLogin && (
        <div className="login-overlay" onClick={() => setShowLogin(false)}>
          <div className="login-modal fade-in" onClick={e => e.stopPropagation()}>
            <button className="login-close" onClick={() => setShowLogin(false)}><X size={20} /></button>
            <div className="login-icon"><Mail size={32} /></div>
            <h2>Welcome back</h2>
            <p className="login-sub">Sign in to your account</p>

            <div className="login-form">
              <div className="input-group">
                <label><Mail size={14} /> Email</label>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  className="text-input"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label><Lock size={14} /> Password</label>
                <input
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="text-input"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>

              {error && <p className="login-error">{error}</p>}

              <button
                className="btn-primary"
                onClick={handleLogin}
                disabled={logging || !email.trim() || !password}
              >
                {logging ? 'Signing in...' : 'Sign In'}
              </button>

              <button className="btn-secondary" onClick={() => { setShowLogin(false); navigate('/onboarding'); }}>
                Create Account Instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
