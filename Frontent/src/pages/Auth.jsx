import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

// SVG Icons
const UserIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>;
const LockIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>;
const LightningIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const EyeIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

function Auth() {
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, signup, forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = async (e) => {
    e.preventDefault();
    setEmail('demo@smartbuy.ai');
    setPassword('password123');
    setIsLoading(true);
    setError('');
    
    try {
      await login('demo@smartbuy.ai', 'password123');
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/');
      } else if (mode === 'signup') {
        await signup(email, password, name, age, gender);
        navigate('/');
      } else if (mode === 'forgot') {
        const res = await forgotPassword(email);
        setSuccess(res.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="bg-glow"></div>
      
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">SmartBuy.AI</h1>
          <p className="auth-subtitle">PRICE TRACKING AND FUTURE PREDICTION</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <div className="input-group">
                <label className="input-label">FULL NAME</label>
                <div className="input-wrapper">
                  <input 
                    type="text" 
                    className="auth-input" 
                    placeholder="Your Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <span className="input-icon"><UserIcon /></span>
                </div>
              </div>
              <div className="input-group" style={{ flexDirection: 'row', gap: '16px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="input-label">AGE</label>
                  <div className="input-wrapper">
                    <input 
                      type="number" 
                      className="auth-input" 
                      placeholder="e.g. 25"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                      min="13"
                      max="120"
                    />
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="input-label">GENDER</label>
                  <div className="input-wrapper">
                    <select 
                      className="auth-input dropdown-select" 
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label className="input-label">ACCESS IDENTIFIER</label>
            <div className="input-wrapper">
              <input 
                type="email" 
                className="auth-input" 
                placeholder="Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="input-icon"><UserIcon /></span>
            </div>
          </div>

          {(mode === 'login' || mode === 'signup') && (
            <div className="input-group">
              <label className="input-label">SECURE KEY</label>
              <div className="input-wrapper">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="auth-input" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="auth-btn-primary" disabled={isLoading}>
              {mode === 'login' ? 'Log In' : (mode === 'signup' ? 'Create New Account' : 'Send Reset Link')}
              {(mode === 'login' || mode === 'signup') && <LightningIcon />}
            </button>
            
            {mode === 'login' && (
              <button type="button" className="demo-btn" onClick={handleDemoLogin} disabled={isLoading}>
                One-Click Demo Login
              </button>
            )}
          </div>
        </form>

        <div className="auth-footer-links">
          {mode !== 'forgot' && (
             <span className="forgot-link" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}>
               Forgotten Credentials?
             </span>
          )}
          
          {mode === 'login' ? (
            <span className="switch-mode">
              NEW TO SMARTBUY.AI? 
              <span className="switch-link" onClick={() => { setMode('signup'); setError(''); }}>
                Create New Account
              </span>
            </span>
          ) : (
            <span className="switch-mode">
              ALREADY A USER? 
              <span className="switch-link" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
                Log In
              </span>
            </span>
          )}
        </div>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <div className="footer-logo">SmartBuy.AI</div>
            <p>&#169; 2026 SMARTBUY</p>
          </div>
          <div className="footer-links">
            <a href="#">PRIVACY</a>
            <a href="#">TERMS</a>
            <a href="#">API DOCS</a>
            <a href="#">CONTACT</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Auth;
