import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Wishlist.css';
import './Home.css'; // Leverage existing header/footer styles

const TrashIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const PlusIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

function Wishlist() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Add item form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchWishlist = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/wishlist', {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch (err) {
        console.error("Failed to fetch wishlist", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWishlist();
  }, [user]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!name || !url) return;
    setAdding(true);

    try {
      const res = await fetch('http://localhost:5000/api/wishlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ name, url })
      });
      if (res.ok) {
        const addedItem = await res.json();
        setItems([...items, addedItem]);
        setName('');
        setUrl('');
      }
    } catch (err) {
      console.error("Failed to add item", err);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/wishlist/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (res.ok) {
        setItems(items.filter(item => item._id !== id));
      }
    } catch (err) {
      console.error("Failed to remove item", err);
    }
  };

  if (!user) {
    return (
      <div className="wishlist-page">
         <header className="header">
           <Link to="/" style={{ textDecoration: 'none' }}><div className="logo">SmartBuy.AI</div></Link>
           <nav className="nav-links">
             <Link to="/">Home</Link>
           </nav>
           <Link to="/auth">
             <button className="btn-primary sign-up-btn">Sign Up</button>
           </Link>
         </header>
         <main className="wishlist-main auth-warning">
           <h2>Authentication Required</h2>
           <p>Please log in to view your Active Protocol Wishlist</p>
           <Link to="/auth"><button className="btn-primary" style={{ marginTop: '20px' }}>Log In</button></Link>
         </main>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <header className="header">
        <Link to="/" style={{ textDecoration: 'none' }}><div className="logo">SmartBuy.AI</div></Link>
        <nav className="nav-links">
          <Link to="/">Price Tracker</Link>
        </nav>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn-primary sign-up-btn" onClick={() => { logout(); navigate('/'); }}>Sign Out</button>
        </div>
      </header>

      <main className="wishlist-main">
        <h1 className="wishlist-title">My Tracked Targets</h1>
        <p className="wishlist-subtitle">SmartBuy.AI is monitoring the following URLs for optimal drops.</p>

        <form className="add-item-form" onSubmit={handleAddItem}>
          <input 
            type="text" 
            className="wishlist-input" 
            placeholder="Target Name (e.g. RTX 4090)" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
          />
          <input 
            type="url" 
            className="wishlist-input" 
            placeholder="Product URL (https://...)" 
            value={url} 
            onChange={(e) => setUrl(e.target.value)} 
            required 
          />
          <button type="submit" className="btn-primary" disabled={adding} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <PlusIcon /> {adding ? 'Tracking...' : 'Track New'}
          </button>
        </form>

        {loading ? (
          <div className="empty-state"><h3>Loading your targets...</h3></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>No Active Targets</h3>
            <p>Paste a product URL above to begin predictive tracking.</p>
          </div>
        ) : (
          <div className="wishlist-grid">
            {items.map(item => (
              <div key={item._id} className="wishlist-card">
                <button className="remove-btn" onClick={() => handleRemove(item._id)} title="Remove target">
                  <TrashIcon />
                </button>
                <div className="card-content">
                  <h3>{item.name}</h3>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="card-url">
                    {item.url.length > 50 ? item.url.substring(0, 50) + '...' : item.url}
                  </a>
                </div>
                <div className="card-date">
                  Added: {new Date(item.addedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
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
    </div>
  );
}

export default Wishlist;
