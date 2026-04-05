const express      = require('express');
const router       = express.Router();
const { scrapeAllPlatforms }  = require('../utils/scraper');
const { getRecommendation }   = require('../services/recommendationEngine');
const Product      = require('../../DataBase/models/Product');
const PriceHistory = require('../../DataBase/models/PriceHistory');
const { randomUUID } = require('crypto');
const { generatePrixHistoryToken } = require('../utils/tokenGenerator');

// ── In-memory job store ────────────────────────────────────────────────────────
// { jobId: { status: 'pending'|'done'|'error', payload, createdAt } }
const jobs = new Map();

// Clean up completed jobs older than 10 minutes
const cleanupInterval = setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}, 60_000);

// Export for test cleanup
router._cleanupInterval = cleanupInterval;
router._jobsMap = jobs;

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

  // ── AI recommendation + real history chart data ──────────────────
  const recommendation = await getRecommendation(query, livePrices);

  return {
    title:               query,
    subtitle:            `Realtime scrape analysis for ${query}.`,
    pipelineSource:      livePrices._source || 'unknown',
    trend:               bestPrice ? 'Dropping' : 'No Data',
    currentBestPrice:    bestPrice,
    priceDropPercentage: bestPrice ? -4.2 : null,
    cached:              !!isCached,
    aiRecommendation:    recommendation,
    historyPoints:       recommendation.historyPoints || [],
    marketComparison:    competitors,
    specs: ['Authentic Model', 'Verified Scrape', 'Realtime Node Execution'],
    flashDeal:        { title: 'Extra 5% Off', subtitle: 'Bank Cards Only' },
    refurbishedPrice: bestPrice ? Math.round(bestPrice * 0.82) : null,
  };
}

// ── Background scrape + save ───────────────────────────────────────────────────
async function runScrapeJob(jobId, query, queryLower) {
  try {
    const livePrices = await scrapeAllPlatforms(query);
    console.log(`[Job ${jobId}] 📡 Decodo scrape done for "${query}"`);

    // Persist to cache
    const results = buildStoreMap().map(s => ({
      store: s.store,
      price: livePrices?.[s.key]?.price || null,
      url:   livePrices?.[s.key]?.url   || '',
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
  if (!req.query.q || !req.query.q.trim()) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }
  const query      = req.query.q.trim();
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

// ── POST /api/search/prixhistory ──────────────────────────────────────────────
// Generates highly realistic multi-platform fake price history using Groq AI
router.post('/prixhistory', async (req, res) => {
  try {
    const { query, currentPrice, platformPrices } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    if (!process.env.GROQ_API_KEY) {
      throw new Error("Missing GROQ_API_KEY in backend environment");
    }

    const basePrice = parseInt(String(currentPrice).replace(/[^0-9]/g, ''), 10) || 500;
    const pricesInfo = platformPrices ? JSON.stringify(platformPrices) : `Approx baseline ₹${basePrice}`;
    
    // Generating instructions for the LLM graph
    const systemPrompt = `You are a professional market intelligence engine. Your goal is to produce a 12-month multi-vendor price analysis for "${query}".

WEB-SCRAPER ACTUALS (PRESENT PRICE FOR SEPTEMBER): ${pricesInfo}.
If a specific platform is NOT in the data, estimate its price logically (Market Baseline: ₹${basePrice}).

STRICT JSON SKELETON (DO NOT MODIFY THE LABELS):
{
  "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  "amazon": [12_integers],
  "flipkart": [12_integers],
  "myntra": [12_integers],
  "ajio": [12_integers],
  "meesho": [12_integers]
}

SPECIFIC RULES:
1. Every price array MUST have 12 integer values.
2. Index 8 (Sep) for "amazon" and "flipkart" MUST match the scraped prices provided.
3. Use only LOWERCASE keys for platform names.
4. Output ONLY the raw JSON object. No other text.
`;

    console.log("[Groq Proxy] Requesting for:", query, "@", basePrice);
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: systemPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!groqRes.ok) {
        const errorText = await groqRes.text();
        console.error("[Groq API Error Status]", groqRes.status);
        console.error("[Groq API Error Response]", errorText);
        throw new Error(`Groq API Error: ${groqRes.status}`);
    }

    const data = await groqRes.json();
    console.log("[Groq Response Received]");
    let graphData;
    
    try {
        let rawContent = data.choices[0].message.content.trim();
        console.log("[Groq Raw Content Length]:", rawContent.length);

        // Robustly strip any markdown JSON code block markers if present
        if (rawContent.startsWith("```")) {
           rawContent = rawContent.replace(/^```json\s*|^```\s*|```\s*$/g, "").trim();
        }

        // HEALING: Fix potential missing commas if AI returns [100 200 300]
        rawContent = rawContent.replace(/(\d+)\s+(\d+)/g, "$1, $2");

        graphData = JSON.parse(rawContent);

        // HEALING: Force valid labels and platforms
        const standardLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        if (!graphData.labels || !Array.isArray(graphData.labels) || graphData.labels.length !== 12) {
          graphData.labels = standardLabels;
        }

        const platforms = ["amazon", "flipkart", "myntra", "ajio", "meesho"];
        platforms.forEach(p => {
          if (!graphData[p] || !Array.isArray(graphData[p])) {
            graphData[p] = new Array(12).fill(basePrice);
          } else if (graphData[p].length < 12) {
            while(graphData[p].length < 12) graphData[p].push(basePrice);
          }
        });
        
        console.log("[Groq JSON Healed & Validated]");
    } catch(err) {
        console.error("[Groq JSON Healing/Parse Error]", err);
        throw new Error("Groq returned invalid or unhealable JSON");
    }

    res.json(graphData);
  } catch (error) {
    console.error("[Groq Fake Graph Error]", error);
    res.status(500).json({ error: "Failed to generate price history" });
  }
});

module.exports = router;
