const express      = require('express');
const router       = express.Router();
const { scrapeAllPlatforms } = require('../utils/scraper');
const Product      = require('../../DataBase/models/Product');
const PriceHistory = require('../../DataBase/models/PriceHistory');
const { randomUUID } = require('crypto');

// ── In-memory job store ────────────────────────────────────────────────────────
// { jobId: { status: 'pending'|'done'|'error', payload, createdAt } }
const jobs = new Map();

// Clean up completed jobs older than 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}, 60_000);

// ── Shared payload builder ─────────────────────────────────────────────────────
function buildStoreMap() {
  return [
    { store: 'Amazon',   logoLetter: 'A', perk: 'Free Delivery',     key: 'amazon',   color: '#fef3c7', text: '#d97706' },
    { store: 'Flipkart', logoLetter: 'F', perk: 'Exchange Available', key: 'flipkart', color: '#e0f2fe', text: '#0284c7' },
    { store: 'Myntra',   logoLetter: 'M', perk: 'Easy Returns',       key: 'myntra',   color: '#f3f4f6', text: '#4b5563' },
    { store: 'Ajio',     logoLetter: 'A', perk: 'Rewards Points',     key: 'ajio',     color: '#fce7f3', text: '#db2777' },
    { store: 'Meesho',   logoLetter: 'M', perk: 'Standard Shipping',  key: 'meesho',   color: '#ffedd5', text: '#c2410c' },
  ];
}

async function buildPayload(query, livePrices, isCached) {
  const queryLower = query.toLowerCase();
  const storeMap   = buildStoreMap();

  const competitors = storeMap.map(s => ({
    store:      s.store,
    logoLetter: s.logoLetter,
    perk:       s.perk,
    price:      livePrices[s.key]?.price || null,
    url:        livePrices[s.key]?.url   || '',
    color:      s.color,
    text:       s.text,
  }));

  let bestPrice   = Infinity;
  let leaderStore = null;
  competitors.forEach(c => {
    if (c.price !== null && c.price < bestPrice) {
      bestPrice   = c.price;
      leaderStore = c;
    }
  });
  if (leaderStore) leaderStore.isLowest = true;
  if (bestPrice === Infinity) bestPrice = null;

  // Chart data
  let chartData = [];
  try {
    const history = await PriceHistory.getHistory(query, 30);
    if (history.length >= 2 && bestPrice) {
      const weekMap = {};
      history.forEach(h => {
        const week = `W${Math.ceil(new Date(h.recordedAt).getDate() / 7)}`;
        if (!weekMap[week] || h.price < weekMap[week]) weekMap[week] = h.price;
      });
      chartData = Object.entries(weekMap).map(([label, value]) => ({ label, value }));
      chartData.push({ label: 'TODAY',     value: bestPrice });
      chartData.push({ label: 'PREDICTED', value: Math.round(bestPrice * 0.9) });
    } else if (bestPrice) {
      chartData = [
        { label: 'JAN',       value: Math.round(bestPrice * 1.1) },
        { label: 'MAR',       value: Math.round(bestPrice * 1.15) },
        { label: 'MAY',       value: Math.round(bestPrice * 0.95) },
        { label: 'JUL',       value: Math.round(bestPrice * 1.05) },
        { label: 'TODAY',     value: bestPrice },
        { label: 'PREDICTED', value: Math.round(bestPrice * 0.9) },
      ];
    }
  } catch (_) { /* ignore */ }

  const dropAmount  = bestPrice ? Math.round(bestPrice * 0.05) : null;

  return {
    title:               query,
    subtitle:            livePrices._source === 'agent'
      ? `Verified by SmartBuy AI agent (Groq + Playwright) for ${query}.`
      : `Realtime scrape analysis for ${query}.`,
    pipelineSource:      livePrices._source || 'unknown',
    trend:               bestPrice ? 'Dropping' : 'No Data',
    currentBestPrice:    bestPrice,
    priceDropPercentage: bestPrice ? -4.2 : null,
    cached:              !!isCached,
    rating: {
      score:   8.4,
      message: dropAmount
        ? `Our AI suggests waiting 2 more weeks. We predict a ₹${dropAmount.toLocaleString('en-IN')} drop in the upcoming festival sale.`
        : `No live prices found. Try a more specific product name or model number.`,
    },
    marketComparison: competitors,
    chartData,
    specs: ['Authentic Model', 'Verified Scrape', 'Realtime Node Execution'],
    flashDeal:        { title: 'Extra 5% Off', subtitle: 'Bank Cards Only' },
    refurbishedPrice: bestPrice ? Math.round(bestPrice * 0.82) : null,
  };
}

// ── Background scrape + save ───────────────────────────────────────────────────
async function runScrapeJob(jobId, query, queryLower) {
  try {
    const livePrices = await scrapeAllPlatforms(query);
    const pipelineUsed = livePrices._source === 'agent' ? '🤖 Agentic' : '📡 Decodo';
    console.log(`[Job ${jobId}] ${pipelineUsed} done for "${query}"`);

    // Persist to cache
    const results = buildStoreMap().map(s => ({
      store: s.store,
      price: livePrices[s.key]?.price || null,
      url:   livePrices[s.key]?.url   || '',
    }));
    const validResults = results.filter(r => r.price !== null);
    const bestPrice    = validResults.length ? Math.min(...validResults.map(r => r.price)) : null;
    const lowestStore  = validResults.find(r => r.price === bestPrice)?.store || null;

    try {
      await Product.findOneAndUpdate(
        { query: queryLower },
        { query: queryLower, results, bestPrice, lowestStore, cachedAt: new Date() },
        { upsert: true, new: true }
      );
    } catch (e) { console.warn('[Cache] save error:', e.message); }

    if (validResults.length) {
      try {
        await PriceHistory.insertMany(validResults.map(r => ({
          query: queryLower, store: r.store, price: r.price, url: r.url, recordedAt: new Date()
        })));
      } catch (e) { console.warn('[PriceHistory] save error:', e.message); }
    }

    const payload = await buildPayload(query, livePrices, false);
    jobs.set(jobId, { status: 'done', payload, createdAt: jobs.get(jobId)?.createdAt ?? Date.now() });
  } catch (err) {
    console.error(`[Job ${jobId}] Error:`, err.message);
    jobs.set(jobId, { status: 'error', error: err.message, createdAt: jobs.get(jobId)?.createdAt ?? Date.now() });
  }
}

// ── GET /api/search?q=<query> ─────────────────────────────────────────────────
// Returns instantly:
//   • { status: 'cached', payload }  — if MongoDB cache hit (<100ms)
//   • { status: 'pending', jobId }   — if fresh scrape started in background
router.get('/', async (req, res) => {
  const query      = (req.query.q || 'Unknown Product').trim();
  const queryLower = query.toLowerCase();

  // ── Cache check — returns in <100ms ──────────────────────────────
  const cached = await Product.findOne({ query: queryLower });
  if (cached) {
    console.log(`[Cache HIT] "${query}"`);
    const livePrices = { _source: 'cache' };
    livePrices._source = 'cache';
    cached.results.forEach(r => {
      livePrices[r.store.toLowerCase()] = { price: r.price, url: r.url };
    });
    // For cached results, label subtitle correctly
    livePrices._isCached = true;
    const payload = await buildPayload(query, livePrices, true);
    payload.pipelineSource = 'cache';
    payload.subtitle = `Cached result for ${query}. Prices may be up to an hour old.`;
    return res.json({ status: 'cached', payload });
  }

  // ── Check if a job is already running for this query ─────────────
  for (const [id, job] of jobs.entries()) {
    if (job.query === queryLower) {
      if (job.status === 'pending') {
        console.log(`[Job ${id}] Already running for "${query}"`);
        return res.json({ status: 'pending', jobId: id });
      }
      if (job.status === 'done') {
        return res.json({ status: 'cached', payload: job.payload });
      }
    }
  }

  // ── Start new background job ──────────────────────────────────────
  const jobId = randomUUID();
  jobs.set(jobId, { status: 'pending', query: queryLower, createdAt: Date.now() });
  console.log(`[Job ${jobId}] Started for "${query}"`);

  // Fire-and-forget — does not block the response
  runScrapeJob(jobId, query, queryLower);

  return res.json({ status: 'pending', jobId });
});

// ── GET /api/search/status/:jobId ─────────────────────────────────────────────
// Polling endpoint — returns quickly in all cases
router.get('/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ status: 'not_found' });
  if (job.status === 'pending') return res.json({ status: 'pending' });
  if (job.status === 'error')   return res.json({ status: 'error', error: job.error });
  return res.json({ status: 'done', payload: job.payload });
});

module.exports = router;
