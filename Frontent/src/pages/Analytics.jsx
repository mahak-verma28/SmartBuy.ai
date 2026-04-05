import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './Analytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ── SVG Icons ────────────────────────────────────────────────────────────────
const BellIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>;
const ProfileIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const SparkleIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" /></svg>;
const DownArrow = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
const ChipIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>;
const CameraIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
const BatteryIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="16" height="10" rx="2" /><line x1="22" y1="11" x2="22" y2="13" /></svg>;
const SpecIcons = [ChipIcon, CameraIcon, BatteryIcon];

// ── Shimmer Skeleton ─────────────────────────────────────────────────────────
const Shimmer = ({ w = '100%', h = '18px', r = '8px', mb = '0' }) => (
  <div style={{ width: w, height: h, borderRadius: r, marginBottom: mb, background: 'linear-gradient(90deg,#eef2f6 25%,#e0e8f0 50%,#eef2f6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
);

const shimmerCSS = `
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes spin    { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fillBar { from{width:0%} to{width:var(--fill)} }
`;

function SkeletonPage({ query, statusMsg, elapsed }) {
  return (
    <div className="analytics-page">
      <style>{shimmerCSS}</style>
      <header className="a-header">
        <Link to="/" className="a-logo">SmartBuy.AI</Link>
        <nav className="a-nav"><Link to="/">Home</Link><span className="active">Analytics</span></nav>
      </header>
      <main className="a-main">
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
          <div className="a-left-col">
            <div className="g-card" style={{ minHeight: '200px' }}>
              <Shimmer w="180px" h="22px" r="4px" mb="12px" />
              <Shimmer w="100%" h="140px" r="8px" />
            </div>
            <div className="g-card market-card">
              <Shimmer w="150px" h="22px" r="4px" mb="16px" />
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f4f8' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Shimmer w="40px" h="40px" r="10px" />
                    <div><Shimmer w="80px" h="14px" r="4px" mb="6px" /><Shimmer w="100px" h="11px" r="4px" /></div>
                  </div>
                  <Shimmer w="80px" h="20px" r="6px" />
                </div>
              ))}
            </div>
          </div>
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
        <div style={{ marginTop: '24px', padding: '14px 20px', background: '#f0f7ff', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #d0e8ff' }}>
          <div style={{ width: '18px', height: '18px', border: '3px solid #cce0ff', borderTop: '3px solid #0076e3', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: '700', color: '#0076e3', fontSize: '0.85rem' }}>{statusMsg}</div>
            <div style={{ color: '#829ab1', fontSize: '0.72rem', marginTop: '2px' }}>Searching for "{query}" · {elapsed}s elapsed</div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Real Price Chart ─────────────────────────────────────────────────────────
function RealPriceChart({ historyPoints, externalData, isLoading, basePrice, onRetry, marketComparison }) {
  // 1. Show premium loading state if AI is generating data
  if (isLoading) {
    return (
      <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', background: '#f8fafc', borderRadius: '12px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #0076e3', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ color: '#0076e3', fontWeight: '700', fontSize: '0.85rem', letterSpacing: '1px', animation: 'pulse 1.5s infinite' }}>AI ANALYZING MARKET TRENDS...</div>
      </div>
    );
  }

  // 2. Check if we have valid multi-line Groq data
  const hasExternalData = externalData && externalData.labels && Array.isArray(externalData.labels) && externalData.labels.length > 0;

  if (hasExternalData) {
    const datasets = [];

    // Brand Colors mapping
    const brandColors = {
      amazon: { color: '#ff9900', label: 'Amazon' },
      flipkart: { color: '#2874f0', label: 'Flipkart' },
      myntra: { color: '#ff3f6c', label: 'Myntra' },
      ajio: { color: '#2c4152', label: 'Ajio' },
      meesho: { color: '#f43397', label: 'Meesho' }
    };

    const platformKeys = Object.keys(brandColors);

    // Filter to only those with real prices in Market Comparison
    const activeFromMarket = (marketComparison || [])
      .filter(s => s.price !== null && s.price > 0)
      .map(s => s.store.toLowerCase());

    platformKeys.forEach(platform => {
      // ONLY plot if the platform was found by the scraper with a valid price
      const hasPriceInMarket = activeFromMarket.includes(platform);

      if (externalData[platform] && externalData[platform].length > 0 && hasPriceInMarket) {
        datasets.push({
          label: brandColors[platform].label,
          data: externalData[platform],
          fill: false,
          backgroundColor: brandColors[platform].color,
          borderColor: brandColors[platform].color,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          borderWidth: 3,
          segment: {
            borderDash: (ctx) => ctx.p0DataIndex >= 8 ? [5, 5] : undefined,
          }
        });
      }
    });

    const phasedLabels = (externalData.labels || []).map((l, i) => {
      if (i === 8)  return `${l} (Live)`;
      if (i > 8)    return `${l} (Predicted)`;
      return l;
    });

    const chartData = { labels: phasedLabels, datasets };

    // Find which platforms are actually in the datasets for the custom legend
    const activePlatforms = platformKeys.filter(p => 
      activeFromMarket.includes(p) && externalData[p] && externalData[p].length > 0
    );


    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }, // Disable default legend for custom one
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#112233',
          padding: 10,
          callbacks: { label: (context) => `${context.dataset.label}: ₹${context.parsed.y.toLocaleString('en-IN')}` }
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 6, color: '#829ab1', font: { size: 10, weight: 'bold' } } },
        y: { grid: { color: '#eef2f6', drawBorder: false }, ticks: { color: '#829ab1', font: { size: 10 }, callback: (v) => `₹${v}` } }
      },
      interaction: { mode: 'nearest', axis: 'x', intersect: false }
    };

    return (
      <div style={{ width: '100%', position: 'relative' }}>
        {/* Custom Color-Coded Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '12px', justifyContent: 'center' }}>
          {activePlatforms.map(p => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: brandColors[p].color }}></div>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: brandColors[p].color, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {brandColors[p].label}
              </span>
            </div>
          ))}
        </div>
        <div style={{ height: '240px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    );
  }

  // 3. Fallback logic: If no data point but we have a basePrice, show a flat line instead of error
  let labels = historyPoints?.map(p => p.label) || [];
  let dataPoints = historyPoints?.map(p => p.value) || [];

  if (dataPoints.length < 2 && basePrice) {
    // Generate a simple historical trend if we only have the current price
    labels = ["6m ago", "3m ago", "1m ago", "Present"];
    dataPoints = [basePrice * 1.05, basePrice * 1.02, basePrice * 1.01, basePrice].map(Math.floor);
  }

  if (dataPoints.length < 2) {
    return (
      <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#829ab1', gap: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
        <SparkleIcon />
        <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>Waiting for AI Intelligence...</div>
        <button onClick={onRetry} style={{ padding: '6px 16px', background: '#0076e3', color: 'white', border: 'none', borderRadius: '20px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>
          Manually Start Scan
        </button>
      </div>
    );
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Price Trend',
        data: dataPoints,
        fill: true,
        backgroundColor: 'rgba(0, 118, 227, 0.05)',
        borderColor: '#0076e3',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#112233',
        titleFont: { size: 13 },
        bodyFont: { size: 14, weight: 'bold' },
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context) => `₹${context.parsed.y.toLocaleString('en-IN')}`
        }
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 6, color: '#829ab1', font: { size: 10, weight: 'bold' } }
      },
      y: {
        grid: { color: '#eef2f6', drawBorder: false },
        ticks: { color: '#829ab1', font: { size: 10 }, callback: (v) => `₹${v}` }
      }
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false }
  };

  return (
    <div style={{ width: '100%', height: '160px', position: 'relative' }}>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}

// ── AI Recommendation Card ────────────────────────────────────────────────────
const SIGNAL_CONFIG = {
  buy: { label: 'BUY NOW', signalBg: '#dcfce7', signalColor: '#166534', cardBg: '#166534' },
  wait: { label: 'WAIT', signalBg: '#fef3c7', signalColor: '#92400e', cardBg: '#b45309' },
  neutral: { label: 'NEUTRAL', signalBg: '#e0f2fe', signalColor: '#075985', cardBg: '#005bb5' },
};

function AIRecommendationCard({ recommendation, query, currentPrice, user }) {
  const [alertForm, setAlertForm] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertSent, setAlertSent] = useState(false);

  if (!recommendation) {
    return (
      <div className="g-card rating-card">
        <div className="rating-header"><SparkleIcon /> AI RECOMMENDATION</div>
        <div className="rating-text">No recommendation data yet.</div>
      </div>
    );
  }

  const { signal, confidence, reasoning, predictedLow, predictedDate, factors } = recommendation;
  const cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.neutral;

  const handleSetAlert = async () => {
    if (!alertPrice || !user) return;
    try {
      const res = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ query, targetPrice: Number(alertPrice), currentPrice: currentPrice || null }),
      });
      if (res.ok) { setAlertSent(true); setAlertForm(false); }
    } catch (err) { console.error('Alert error:', err); }
  };

  return (
    <div className="g-card rating-card" style={{ background: cfg.cardBg }}>
      <div className="rating-header"><SparkleIcon /> AI RECOMMENDATION</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
        <span className="signal-badge" style={{ background: cfg.signalBg, color: cfg.signalColor }}>
          {cfg.label}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>
            Confidence: {confidence}%
          </div>
          <div className="confidence-bar">
            <div className="confidence-fill" style={{ '--fill': `${confidence}%`, width: `${confidence}%` }} />
          </div>
        </div>
      </div>

      <div className="rating-text" style={{ marginTop: '12px' }}>{reasoning}</div>

      {predictedLow && (
        <div className="predicted-box">
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: '0.06em' }}>PREDICTED LOW</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'white', lineHeight: 1.2 }}>
            ₹{predictedLow.toLocaleString('en-IN')}
          </div>
          {predictedDate && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>by {predictedDate}</div>}
        </div>
      )}

      {factors && factors.length > 0 && (
        <ul className="factors-list">
          {factors.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      )}

      {user ? (
        <>
          <button className="alert-btn" onClick={() => setAlertForm(v => !v)}>
            {alertForm ? '✕ Cancel' : '🔔 Set Price Drop Alert'}
          </button>
          {alertForm && !alertSent && (
            <div className="alert-form">
              <input type="number" className="alert-input" placeholder="Target price (₹)"
                value={alertPrice} onChange={e => setAlertPrice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSetAlert()} />
              <button className="alert-submit-btn" onClick={handleSetAlert}>Confirm</button>
            </div>
          )}
          {alertSent && <div className="alert-success">✅ Alert saved! We'll notify you when the price drops.</div>}
        </>
      ) : (
        <Link to="/auth"><button className="alert-btn">Sign in to set alerts</button></Link>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
function Analytics() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [statusMsg, setStatusMsg] = useState('🔍 Checking cache...');
  const [elapsed, setElapsed] = useState(0);

  const pollerRef = useRef(null);
  const timerRef = useRef(null);
  const stepTimerRef = useRef(null);
  const startedAt = useRef(Date.now());
  const stepRef = useRef(0);

  // External Price History State
  const [extHistory, setExtHistory] = useState(null);
  const [isFetchingExt, setIsFetchingExt] = useState(false);

  // ── EXTERNAL FETCH LOGIC ─────────────
  const fetchExternalPriceHistory = async (isRetry = false) => {
    setIsFetchingExt(true);

    const platformPrices = {};
    if (data?.marketComparison) {
      data.marketComparison.forEach(item => {
        const key = item.store.toLowerCase();
        if (item.price) {
          const numeric = parseInt(String(item.price).replace(/[^0-9]/g, ''), 10);
          if (numeric > 0) platformPrices[key] = numeric;
        }
      });
    }

    const currentPrice = data?.bestMatch?.price || 500;

    try {
      const res = await fetch(`${API_BASE}/search/prixhistory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query || data?.bestMatch?.title, currentPrice, platformPrices })
      });
      const groqData = await res.json();
      if (!groqData.labels) throw new Error("Invalid AI Data");
      setExtHistory(groqData);
    } catch (err) {
      console.error("AI Fetch Error:", err);
      if (!isRetry) {
        console.log("Retrying AI fetch in 2s...");
        setTimeout(() => fetchExternalPriceHistory(true), 2000);
      }
    } finally {
      setIsFetchingExt(false);
    }
  };

  // ── Auto-Fetch AI Prediction ─────────
  useEffect(() => {
    // Trigger if we have a title/query and some price info, but haven't fetched history yet
    const hasPrice = data?.currentBestPrice || data?.bestMatch?.price;
    if (data && hasPrice && !extHistory && !isFetchingExt) {
      console.log("[Analytics] Auto-triggering AI Scan...");
      fetchExternalPriceHistory();
    }
  }, [data, extHistory, isFetchingExt]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const scrapeSteps = [
    '🔍 Connecting to Decodo proxy network...',
    '🌐 Fetching Amazon, Flipkart & more...',
    '📄 Parsing price data with Cheerio...',
    '📊 Aggregating cross-platform results...',
    '✅ Finalising best price comparison...',
  ];

  const stopPolling = () => {
    clearInterval(pollerRef.current);
    clearInterval(timerRef.current);
    clearInterval(stepTimerRef.current);
  };

  useEffect(() => {
    if (!query) return;
    const fetchAndPoll = async () => {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();

      if (json.status === 'cached' || json.status === 'done') {
        setData(json.payload); stopPolling(); return;
      }

      const jobId = json.jobId;
      setStatusMsg(scrapeSteps[0]);
      stepTimerRef.current = setInterval(() => {
        stepRef.current = (stepRef.current + 1) % scrapeSteps.length;
        setStatusMsg(scrapeSteps[stepRef.current]);
      }, 6000);

      pollerRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`${API_BASE}/search/status/${jobId}`);
          const pollJson = await pollRes.json();
          if (pollJson.status === 'done') {
            setData(pollJson.payload); stopPolling();
          } else if (pollJson.status === 'error') {
            setStatusMsg('⚠️ Scrape error — showing partial results');
            setData({
              title: query, subtitle: 'Could not fetch prices.', pipelineSource: 'error',
              trend: 'No Data', currentBestPrice: null, priceDropPercentage: null, cached: false,
              aiRecommendation: null, historyPoints: [],
              marketComparison: ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Meesho'].map(s => ({
                store: s, logoLetter: s[0], perk: '', price: null, url: '', color: '#f3f4f6', text: '#4b5563',
              })),
              specs: [], flashDeal: { title: '—', subtitle: '—' }, refurbishedPrice: null,
            });
            stopPolling();
          }
        } catch (_) { }
      }, 2000);
    };

    fetchAndPoll().catch(() => setStatusMsg('⚠️ Could not connect to backend'));
    return () => stopPolling();
  }, [query]);

  if (!data) return <SkeletonPage query={query} statusMsg={statusMsg} elapsed={elapsed} />;

  const hasAnyPrice = data.marketComparison?.some(s => s.price !== null && s.price > 0);
  const bestPriceReal = hasAnyPrice ? data.currentBestPrice : null;
  const pipelineLabel = data.pipelineSource === 'cache' ? '⚡ Cached Result' : '📡 Decodo Scraper';
  const pipelineBadgeColor = data.pipelineSource === 'cache' ? '#059669' : '#829ab1';
  const historyPoints = data.historyPoints || [];
  const predictedLow = data.aiRecommendation?.predictedLow;
  const predictedDate = data.aiRecommendation?.predictedDate;

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
        <div className="a-user-actions"><BellIcon /><ProfileIcon /></div>
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
            <p className="a-subtitle">{data.subtitle} Current trend: <span className="trend-drop">{data.trend}</span>.</p>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2>AI Market Intelligence</h2>
                    <button
                      onClick={() => fetchExternalPriceHistory(true)}
                      disabled={isFetchingExt}
                      style={{
                        padding: '4px 8px', background: '#f0f7ff', color: '#0076e3', border: '1px solid #d0e8ff',
                        borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      {isFetchingExt ? 'SCANNING...' : '↻ REFRESH AI'}
                    </button>
                  </div>
                  <p>Anchored historical tracking & predictive forecasting</p>
                </div>
                <div className="chart-badges" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="c-badge purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <SparkleIcon /> 5-Node Comparison
                  </span>
                </div>
              </div>
              <div className="svg-chart-container" style={{ padding: '0 10px' }}>
                <RealPriceChart
                  historyPoints={historyPoints}
                  externalData={extHistory}
                  isLoading={isFetchingExt}
                  basePrice={data?.currentBestPrice}
                  onRetry={fetchExternalPriceHistory}
                  marketComparison={data.marketComparison}
                />
              </div>
            </div>

            <div className="g-card market-card">
              <h2>Market Comparison</h2>
              <div className="market-list">
                {data.marketComparison.map((store, idx) => (
                  <div className="market-item" key={idx}>
                    <div className="m-store-info">
                      <div className="m-logo" style={{ background: store.color, color: store.text }}>{store.logoLetter}</div>
                      <div>
                        <div className="m-store-name">{store.store}</div>
                        <div className="m-perk">{store.perk}</div>
                      </div>
                    </div>
                    <div className="m-price-col">
                      <div className="m-price">{store.price ? `₹${store.price.toLocaleString('en-IN')}` : 'Unavailable'}</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                        {store.url && <a href={store.url} target="_blank" rel="noreferrer" className="buy-btn">STORE</a>}
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
            <AIRecommendationCard
              recommendation={data.aiRecommendation}
              query={query}
              currentPrice={bestPriceReal}
              user={user}
            />

            <div className="g-card specs-card">
              <div className="specs-image">
                <div style={{ position: 'absolute', width: '200px', height: '200px', background: 'radial-gradient(circle,rgba(255,255,255,0.2) 0%,rgba(0,0,0,0) 70%)' }} />
                <div style={{ width: '120px', height: '240px', border: '8px solid #333', borderRadius: '30px', background: '#111', zIndex: 1 }} />
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
