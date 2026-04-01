import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './Analytics.css';

// SVGs
const BellIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>;
const ProfileIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const SparkleIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/></svg>;
const DownArrow   = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const ChipIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>;
const CameraIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const BatteryIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/></svg>;
const SpecIcons   = [ChipIcon, CameraIcon, BatteryIcon];

// ── Shimmer Skeleton ─────────────────────────────────────────────────────────
const Shimmer = ({ w = '100%', h = '18px', r = '8px', mb = '0' }) => (
  <div style={{
    width: w, height: h, borderRadius: r, marginBottom: mb,
    background: 'linear-gradient(90deg, #eef2f6 25%, #e0e8f0 50%, #eef2f6 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
  }} />
);

const shimmerCSS = `
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
`;

// ── Skeleton layout that matches the real page ───────────────────────────────
function SkeletonPage({ query, statusMsg, elapsed }) {
  return (
    <div className="analytics-page">
      <style>{shimmerCSS}</style>
      <header className="a-header">
        <Link to="/" className="a-logo">SmartBuy.AI</Link>
        <nav className="a-nav">
          <Link to="/">Home</Link>
          <span className="active">Analytics</span>
        </nav>
      </header>

      <main className="a-main">
        {/* Top bar skeleton */}
        <div className="a-top-bar">
          <div className="a-top-left">
            <Shimmer w="140px" h="22px" r="20px" mb="12px" />
            <Shimmer w="320px" h="32px" r="6px" mb="10px" />
            <Shimmer w="260px" h="16px" r="4px" />
          </div>
          <div className="a-price-card" style={{ gap: '12px', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Shimmer w="110px" h="14px" r="4px" mb="6px" />
            <Shimmer w="160px" h="36px" r="6px" />
          </div>
        </div>

        <div className="a-grid">
          {/* Left col skeleton */}
          <div className="a-left-col">
            <div className="g-card" style={{ minHeight: '200px' }}>
              <Shimmer w="180px" h="22px" r="4px" mb="12px" />
              <Shimmer w="100%" h="140px" r="8px" />
            </div>
            <div className="g-card market-card">
              <Shimmer w="150px" h="22px" r="4px" mb="16px" />
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f0f4f8' }}>
                  <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                    <Shimmer w="40px" h="40px" r="10px" />
                    <div><Shimmer w="80px" h="14px" r="4px" mb="6px" /><Shimmer w="100px" h="11px" r="4px" /></div>
                  </div>
                  <Shimmer w="80px" h="20px" r="6px" />
                </div>
              ))}
            </div>
          </div>

          {/* Right col skeleton */}
          <div className="a-right-col">
            <div className="g-card rating-card">
              <Shimmer w="130px" h="14px" r="4px" mb="12px" />
              <Shimmer w="80px" h="48px" r="6px" mb="12px" />
              <Shimmer w="100%" h="14px" r="4px" mb="8px" />
              <Shimmer w="80%" h="14px" r="4px" mb="20px" />
              <Shimmer w="100%" h="40px" r="10px" />
            </div>
            <div className="g-card specs-card" style={{ minHeight: '140px' }}>
              <Shimmer w="100px" h="18px" r="4px" mb="12px" />
              <Shimmer w="100%" h="14px" r="4px" mb="8px" />
              <Shimmer w="90%" h="14px" r="4px" mb="8px" />
              <Shimmer w="80%" h="14px" r="4px" />
            </div>
            <div className="deals-row">
              <Shimmer w="48%" h="80px" r="12px" />
              <Shimmer w="48%" h="80px" r="12px" />
            </div>
          </div>
        </div>

        {/* Status strip at bottom */}
        <div style={{
          marginTop: '24px', padding: '14px 20px', background: '#f0f7ff',
          borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px',
          border: '1px solid #d0e8ff',
        }}>
          <div style={{ width: '18px', height: '18px', border: '3px solid #cce0ff', borderTop: '3px solid #0076e3', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: '700', color: '#0076e3', fontSize: '0.85rem' }}>{statusMsg}</div>
            <div style={{ color: '#829ab1', fontSize: '0.72rem', marginTop: '2px' }}>
              Searching for "{query}" · {elapsed}s elapsed
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
function Analytics() {
  const [searchParams] = useSearchParams();
  const query          = searchParams.get('q') || '';
  const [data, setData]           = useState(null);
  const [statusMsg, setStatusMsg] = useState('🔍 Checking cache...');
  const [elapsed, setElapsed]     = useState(0);
  const pollerRef  = useRef(null);
  const timerRef   = useRef(null);
  const startedAt  = useRef(Date.now());

  // Tick elapsed seconds
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Spinning status messages while scraping
  const agentSteps = [
    '🔍 Searching Amazon via DuckDuckGo...',
    '🌐 Playwright rendering store pages...',
    '📄 Extracting prices (Schema.org + CSS)...',
    '🤖 Groq LLM validating product titles...',
    '✅ Aggregating all platforms...',
  ];
  const stepRef = useRef(0);
  const stepTimerRef = useRef(null);

  const stopPolling = () => {
    clearInterval(pollerRef.current);
    clearInterval(timerRef.current);
    clearInterval(stepTimerRef.current);
  };

  useEffect(() => {
    if (!query) return;

    const fetchAndPoll = async () => {
      // ── Step 1: Initial request — returns instantly ──────────────
      const res = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();

      if (json.status === 'cached' || json.status === 'done') {
        setData(json.payload);
        stopPolling();
        return;
      }

      // ── Step 2: Pending — start polling every 2s ─────────────────
      const jobId = json.jobId;
      setStatusMsg(agentSteps[0]);

      // Cycle status messages every 6s
      stepTimerRef.current = setInterval(() => {
        stepRef.current = (stepRef.current + 1) % agentSteps.length;
        setStatusMsg(agentSteps[stepRef.current]);
      }, 6000);

      pollerRef.current = setInterval(async () => {
        try {
          const pollRes  = await fetch(`http://localhost:5000/api/search/status/${jobId}`);
          const pollJson = await pollRes.json();

          if (pollJson.status === 'done') {
            setData(pollJson.payload);
            stopPolling();
          } else if (pollJson.status === 'error') {
            setStatusMsg('⚠️ Scrape encountered an error — showing partial results');
            // Show an empty-price result so UI doesn't hang
            setData({
              title: query, subtitle: 'Could not fetch prices at this time.', pipelineSource: 'error',
              trend: 'No Data', currentBestPrice: null, priceDropPercentage: null, cached: false,
              rating: { score: 0, message: 'Scrape error. Please retry.' },
              marketComparison: ['Amazon','Flipkart','Myntra','Ajio','Meesho'].map(s => ({
                store: s, logoLetter: s[0], perk: '', price: null, url: '', color: '#f3f4f6', text: '#4b5563'
              })),
              chartData: [], specs: [], flashDeal: { title: '—', subtitle: '—' }, refurbishedPrice: null,
            });
            stopPolling();
          }
        } catch (e) {
          // Network blip — keep polling
        }
      }, 2000);
    };

    fetchAndPoll().catch(err => {
      console.error('Analytics fetch error:', err);
      setStatusMsg('⚠️ Could not connect to backend');
    });

    return () => stopPolling();
  }, [query]);

  // ── Skeleton while waiting ───────────────────────────────────────
  if (!data) {
    return <SkeletonPage query={query} statusMsg={statusMsg} elapsed={elapsed} />;
  }

  // ── Results ──────────────────────────────────────────────────────
  const hasAnyPrice      = data.marketComparison?.some(s => s.price !== null && s.price > 0);
  const bestPriceReal    = hasAnyPrice ? data.currentBestPrice : null;
  const pipelineLabel    = data.pipelineSource === 'agent' ? '🤖 AI Agent (Groq + Playwright)'
                         : data.pipelineSource === 'cache' ? '⚡ Cached Result'
                         : '📡 Decodo Scraper';
  const pipelineBadgeColor = data.pipelineSource === 'agent' ? '#0076e3'
                           : data.pipelineSource === 'cache' ? '#059669'
                           : '#829ab1';

  return (
    <div className="analytics-page" style={{ animation: 'fadeIn 0.4s ease' }}>
      <style>{shimmerCSS}</style>
      <header className="a-header">
        <Link to="/" className="a-logo">SmartBuy.AI</Link>
        <nav className="a-nav">
          <Link to="/">Home</Link>
          <Link to="#" className="active">Analytics</Link>
          <Link to="#">Comparison</Link>
        </nav>
        <div className="a-user-actions">
          <BellIcon />
          <ProfileIcon />
        </div>
      </header>

      <main className="a-main">
        <div className="a-top-bar">
          <div className="a-top-left">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span className="a-badge">AI PREDICTION ACTIVE</span>
              <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: `${pipelineBadgeColor}18`, color: pipelineBadgeColor, letterSpacing: '0.05em' }}>
                {pipelineLabel}
              </span>
            </div>
            <h1 className="a-title">{data.title}</h1>
            <p className="a-subtitle">
              {data.subtitle} Current trend: <span className="trend-drop">{data.trend}</span>.
            </p>
          </div>

          <div className="a-price-card">
            {bestPriceReal ? (
              <>
                <div className="best-price-info">
                  <div className="best-price-label">Current Best Price</div>
                  <div className="best-price-value">₹{bestPriceReal.toLocaleString('en-IN')}</div>
                </div>
                <div className="price-drop-indicator">
                  <DownArrow />
                  <div>{data.priceDropPercentage}%</div>
                </div>
              </>
            ) : (
              <div className="best-price-info">
                <div className="best-price-label">Best Price</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#829ab1', marginTop: '4px' }}>No prices found</div>
                <div style={{ fontSize: '0.7rem', color: '#829ab1', marginTop: '4px' }}>Try a more specific product name</div>
              </div>
            )}
          </div>
        </div>

        <div className="a-grid">
          {/* Left Column */}
          <div className="a-left-col">
            <div className="g-card">
              <div className="chart-header">
                <div>
                  <h2>The Price Tracker</h2>
                  <p>Real-time market scanning & predictive modeling</p>
                </div>
                <div className="chart-badges">
                  <span className="c-badge">History</span>
                  <span className="c-badge purple">AI Forecast</span>
                </div>
              </div>
              <div className="svg-chart-container">
                <svg width="100%" height="100%" viewBox="0 0 500 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="predGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(124,58,237,0.2)" />
                      <stop offset="100%" stopColor="rgba(124,58,237,0)" />
                    </linearGradient>
                  </defs>
                  <path d="M 0 130 L 500 130" stroke="#eef2f6" strokeWidth="2" />
                  <path d="M 0 50 Q 50 60, 100 80 T 200 40 T 300 70" fill="none" stroke="#0076e3" strokeWidth="4" />
                  <path d="M 300 70 Q 380 0, 480 50 L 480 130 L 300 130 Z" fill="url(#predGrad)" />
                  <path d="M 300 70 Q 380 0, 480 50" fill="none" stroke="#7c3aed" strokeWidth="4" strokeDasharray="6,4" />
                  <circle cx="300" cy="70" r="6" fill="#0076e3" stroke="white" strokeWidth="2"/>
                  <text x="10"  y="145" fontSize="10" fill="#829ab1" fontWeight="700">JAN</text>
                  <text x="100" y="145" fontSize="10" fill="#829ab1" fontWeight="700">MAR</text>
                  <text x="200" y="145" fontSize="10" fill="#829ab1" fontWeight="700">MAY</text>
                  <text x="290" y="145" fontSize="10" fill="#0076e3" fontWeight="800">TODAY</text>
                  <text x="400" y="145" fontSize="10" fill="#7c3aed" fontWeight="800">PREDICTED</text>
                </svg>
                <div style={{ position: 'absolute', right: '40px', top: '20px', background: 'white', padding: '12px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#7c3aed', fontWeight: '800', marginBottom: '4px' }}>AI PREDICTION</div>
                  <div style={{ fontSize: '0.8rem', color: '#123b5e', fontWeight: '800' }}>Expected:</div>
                  <div style={{ fontSize: '1.2rem', color: '#123b5e', fontWeight: '800' }}>
                    {data.chartData?.length ? `₹${data.chartData[data.chartData.length - 1].value?.toLocaleString('en-IN') ?? '—'}` : '—'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#829ab1', marginTop: '2px' }}>by October 12</div>
                </div>
              </div>
            </div>

            <div className="g-card market-card">
              <h2>Market Comparison</h2>
              <div className="market-list">
                {data.marketComparison.map((store, idx) => (
                  <div className="market-item" key={idx}>
                    <div className="m-store-info">
                      <div className="m-logo" style={{ background: store.color, color: store.text }}>
                        {store.logoLetter}
                      </div>
                      <div>
                        <div className="m-store-name">{store.store}</div>
                        <div className="m-perk">{store.perk}</div>
                      </div>
                    </div>
                    <div className="m-price-col">
                      <div className="m-price">
                        {store.price ? `₹${store.price.toLocaleString('en-IN')}` : 'Unavailable'}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                        {store.url && (
                          <a href={store.url} target="_blank" rel="noreferrer" className="buy-btn">STORE</a>
                        )}
                        {store.isLowest && <div className="m-lowest-badge">Lowest</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="a-right-col">
            <div className="g-card rating-card">
              <div className="rating-header"><SparkleIcon /> SMARTBUY RATING</div>
              <div className="rating-score">{data.rating.score} <span className="rating-max">/10</span></div>
              <div className="rating-text">{data.rating.message}</div>
              <button className="alert-btn">Set Price Drop Alert</button>
            </div>

            <div className="g-card specs-card">
              <div className="specs-image">
                <div style={{ position: 'absolute', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0) 70%)' }}></div>
                <div style={{ width: '120px', height: '240px', border: '8px solid #333', borderRadius: '30px', background: '#111', zIndex: 1 }}></div>
              </div>
              <div className="specs-content">
                <h3>Quick Specs</h3>
                <div className="specs-list">
                  {data.specs.map((spec, i) => {
                    const Icon = SpecIcons[i] || SpecIcons[0];
                    return <div className="spec-item" key={i}><Icon /> {spec}</div>;
                  })}
                </div>
              </div>
            </div>

            <div className="deals-row">
              <div className="deal-mini deal-pink">
                <div className="deal-label"><SparkleIcon width="12" /> FLASH DEAL</div>
                <div className="deal-val">{data.flashDeal.title}</div>
                <div className="deal-sub">{data.flashDeal.subtitle}</div>
              </div>
              <div className="deal-mini deal-purple">
                <div className="deal-label">📦 REFURBISHED</div>
                <div className="deal-val">{data.refurbishedPrice ? `₹${data.refurbishedPrice.toLocaleString('en-IN')}` : 'N/A'}</div>
                <div className="deal-sub">Certified Grade A</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Analytics;
