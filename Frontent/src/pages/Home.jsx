import React, { useState, useEffect } from 'react';
import './Home.css';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// SVG Icons
const SearchIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const ImageIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const CameraIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const MicIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const LinkIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const ChartIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>;
const BarChartIcon = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="#3b82f6"><rect x="18" y="7" width="3" height="17" rx="1" fill="#2563eb"/><rect x="13" y="11" width="3" height="13" rx="1" fill="#60a5fa"/><rect x="8" y="15" width="3" height="9" rx="1" fill="#93c5fd"/></svg>;
const AlertIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const PlusIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const ArrowRightIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/history', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch(err) {
      console.error('Failed to fetch history', err);
    }
  };

  const handleAnalyze = async () => {
    if (!searchQuery) return;
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch('http://localhost:5000/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ query: searchQuery })
      });
      if (res.ok) {
        const newItem = await res.json();
        setHistory([newItem, ...history]);
      } else if (res.status === 404 || res.status === 401) {
        // Token mismatch due to Memory DB restart, auto logout
        logout();
      }
      
      // Navigate unconditionally to the analytics dashboard
      navigate(`/analytics?q=${encodeURIComponent(searchQuery)}`);
    } catch(err) {
      console.error('Failed to record search', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="home-container">
      {/* Background Blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      <header className="header">
        <div className="logo">SmartBuy.AI</div>
        <nav className="nav-links">
          <a href="#" className="active">Price Tracker</a>
          <a href="#">Predictions</a>
          <a href="#">Deals</a>
          <a href="#">Alerts</a>
        </nav>
        {user ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/wishlist">
              <button className="btn-primary" style={{ background: 'transparent', border: '1px solid #eef2f6', color: '#123b5e' }}>Wishlist</button>
            </Link>
            <button className="btn-primary sign-up-btn" onClick={logout}>Sign Out</button>
          </div>
        ) : (
          <Link to="/auth">
            <button className="btn-primary sign-up-btn">Sign Up</button>
          </Link>
        )}
      </header>

      <main>
        <section className="hero-section">
          <div className="badge">THE FUTURE OF SHOPPING</div>
          <h1 className="hero-title">
            Find the <span className="highlight-italic">Smartest</span><br />
            Deal Ever.
          </h1>

          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="search-icon"><SearchIcon /></span>
              <input 
                type="text" 
                placeholder="Paste product URL or search item" 
                className="search-input" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                disabled={isSearching}
              />
            </div>
            <div className="search-actions">
              <button className="action-btn" title="Upload Image"><ImageIcon /></button>
              <button className="action-btn" title="Scan Barcode"><CameraIcon /></button>
              <button className="action-btn" title="Voice Search"><MicIcon /></button>
              <button className="action-btn" title="Paste Link"><LinkIcon /></button>
              <button className="btn-primary analyze-btn" onClick={handleAnalyze} disabled={isSearching}>
                {isSearching ? 'ANALYZING...' : 'ANALYZE'}
              </button>
            </div>
          </div>

          <div className="trending">
            <span className="trending-label">TRENDING:</span>
            <span className="tag">RTX 4090</span>
            <span className="tag">OLED Monitors</span>
            <span className="tag">Espresso Machines</span>
          </div>
        </section>

        <section className="features-section">
          <div className="feature-card large-card">
            <div className="icon-wrapper glass-icon">
              <ChartIcon />
            </div>
            <h2>Predictive Pricing<br />Algorithms.</h2>
            <p>We analyze millions of data points to<br />tell you exactly when to hit buy.</p>
            <a href="#" className="explore-link">Explore Predictions <ArrowRightIcon /></a>
            <div className="card-bg-shape"></div>
            <div className="card-bg-shape-2"></div>
          </div>

          <div className="right-features">
            <div className="feature-card wide-card">
              <div className="content">
                <h3>History Tracker</h3>
                <p>Visual tracking of every price shift over 2 years.</p>
              </div>
              <div className="icon-wrapper light-blue-box">
                <BarChartIcon />
              </div>
            </div>

            <div className="bottom-row">
              <div className="feature-card small-card plain-card">
                <div className="center-icon">
                  <AlertIcon />
                </div>
                <h3>Instant Alerts</h3>
                <p>Never miss a drop.</p>
              </div>

              <div className="feature-card small-card dotted-card">
                <div className="center-icon">
                  <PlusIcon />
                </div>
                <h3>Custom Filter</h3>
                <p>Build your own tracker.</p>
              </div>
            </div>
          </div>
        </section>

        {user ? (
          <section className="history-section">
            <div className="history-content">
              <h2>My Search History</h2>
              <p>Your previous target extractions and analyzer invocations.</p>
              {history.length === 0 ? (
                <div className="empty-history">
                  <p>No searches found in your current session. Run an analysis above.</p>
                </div>
              ) : (
                <div className="history-grid">
                  {history.map(item => (
                    <div key={item._id} className="history-card">
                      <div className="history-query">{item.query}</div>
                      <div className="history-date">{new Date(item.searchedAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="cta-section">
             <div className="cta-content">
               <h2>Ready to outsmart the<br />marketplace?</h2>
               <p>Join 2M+ users saving an average of $432 per year using our<br />predictive buying technology.</p>
               <div className="cta-buttons">
                 <button className="btn-primary get-started-btn">Get Started Free</button>
                 <button className="btn-outline">View API Docs</button>
               </div>
             </div>
          </section>
        )}
      </main>

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

      {/* Premium Login Required Modal */}
      {showLoginModal && (
        <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-icon-header">
              <div className="lock-icon-bg">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
            </div>
            <h2>Login Required</h2>
            <p>SmartBuy uses advanced AI to track prices across platforms. To access these insights and save your history, please sign in.</p>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowLoginModal(false)}>Maybe Later</button>
              <Link to="/auth" style={{ textDecoration: 'none' }}>
                <button className="btn-primary sign-up-btn">Sign In Now</button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
