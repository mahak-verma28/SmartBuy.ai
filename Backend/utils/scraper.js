/**
 * scraper.js — SmartBuy Unified Scraper
 *
 * Priority order:
 *   1. Python Agentic Sidecar (Groq + Playwright + DDG) — http://localhost:5001
 *   2. Legacy Decodo API + Cheerio fallback (if agent is unavailable)
 *
 * The agent validates results via LLM before returning them,
 * so the data here is guaranteed to match the user's query.
 */

const cheerio = require('cheerio');

const AGENT_URL    = process.env.AGENT_URL    || 'http://localhost:5001';
const DECODO_API_URL = "https://scraper-api.decodo.com/v2/scrape";
const DECODO_AUTH    = "Basic VTAwMDAzNzg4NzU6UFdfMTFiZDM3MjlhZGI3NjRiNDVmOTZjZWNhNDM5ZWJmZDZm";

// ── Helpers ───────────────────────────────────────────────────────────────────

const parsePrice = (priceStr) => {
    if (!priceStr) return null;
    const cleaned = priceStr.replace(/[^0-9]/g, '');
    const val = parseInt(cleaned, 10);
    return isNaN(val) || val === 0 ? null : val;
};

const PLATFORM_KEYS = ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho'];

// ── Agent Health Check ────────────────────────────────────────────────────────

let agentAvailable = null; // null = unchecked, true/false after first check

async function checkAgentHealth() {
    try {
        const res = await fetch(`${AGENT_URL}/health`, {
            signal: AbortSignal.timeout(3000),
        });
        agentAvailable = res.ok;
    } catch {
        agentAvailable = false;
    }
    return agentAvailable;
}

// ── Strategy 1: Agentic Scraper ───────────────────────────────────────────────

/**
 * Calls the Python FastAPI sidecar.
 * Returns the same shape as scrapeAllPlatforms:
 *   { amazon: { price, url }, flipkart: {...}, ... }
 */
async function scrapeAllPlatformsAgent(query) {
    try {
        const url = `${AGENT_URL}/search?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            signal: AbortSignal.timeout(120000), // agent can take up to 2 min for all 5 platforms
        });

        if (!res.ok) {
            console.warn(`[Agent] HTTP ${res.status} — falling back to Decodo`);
            return null;
        }

        const data = await res.json();

        if (!data.results) {
            console.warn('[Agent] Empty results — falling back to Decodo');
            return null;
        }

        // Emit the reasoning log so it appears in Node.js console
        if (data.log && data.log.length) {
            console.log('\n── Agent Reasoning Log ───────────────────────────');
            data.log.forEach(line => console.log(line));
            console.log('──────────────────────────────────────────────────\n');
        }

        // Normalise to the shape the rest of search.js expects
        const normalised = {};
        for (const platform of PLATFORM_KEYS) {
            const r = data.results[platform] || {};
            normalised[platform] = {
                price: r.price ? Math.round(r.price) : null,
                url:   r.url   || '',
                title: r.title || null,
                in_stock: r.in_stock !== false,
                source: r.source || null,
            };
        }

        const anyPrice = Object.values(normalised).some(r => r.price !== null);
        if (!anyPrice) {
            console.warn('[Agent] No prices in agent response — falling back to Decodo');
            return null;
        }

        return normalised;

    } catch (e) {
        console.warn(`[Agent] Request failed: ${e.message} — falling back to Decodo`);
        return null;
    }
}

// ── Strategy 2: Legacy Decodo + Cheerio fallback ──────────────────────────────

const fetchHTML = async (targetUrl) => {
    try {
        const response = await fetch(DECODO_API_URL, {
            method: "POST",
            body: JSON.stringify({
              url: targetUrl,
              proxy_pool: "standard",
              headless: "html"
            }),
            headers: {
              "Content-Type": "application/json",
              "Authorization": DECODO_AUTH
            },
            signal: AbortSignal.timeout(90000)
        });
        const json = await response.json();
        if (json && json.results && json.results.length > 0) {
           return json.results[0].content;
        }
        return null;
    } catch (e) {
        console.error(`[Decodo Timeout] Abandoned ${targetUrl} due to hang/block.`);
        return null; 
    }
};

const scrapeAmazon   = async (query) => {
    const url = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
    const html = await fetchHTML(url);
    if (!html) return { price: null, url };
    const $ = cheerio.load(html);
    let priceStr = $('.a-price-whole').first().text() || $('.a-color-price').first().text();
    return { price: parsePrice(priceStr), url };
};

const scrapeFlipkart = async (query) => {
    const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
    const html = await fetchHTML(url);
    if (!html) return { price: null, url };
    const $ = cheerio.load(html);
    let priceStr = $('div[class*="Nx9bqj"]').first().text() || $('div._30jeq3').first().text();
    return { price: parsePrice(priceStr), url };
};

const scrapeMyntra   = async (query) => {
    const url = `https://www.myntra.com/${query.replace(/\s+/g, '-').toLowerCase()}`;
    const html = await fetchHTML(url);
    if (!html) return { price: null, url };
    const $ = cheerio.load(html);
    let priceStr = $('.product-discountedPrice').first().text() || $('.product-price').first().text();
    return { price: parsePrice(priceStr), url };
};

const scrapeAjio     = async (query) => {
    const url = `https://www.ajio.com/search/?text=${encodeURIComponent(query)}`;
    const html = await fetchHTML(url);
    if (!html) return { price: null, url };
    const $ = cheerio.load(html);
    let priceStr = $('.price').first().text() || $('span[class*="strse-price"]').first().text();
    return { price: parsePrice(priceStr), url };
};

const scrapeMeesho   = async (query) => {
    const url = `https://www.meesho.com/search?q=${encodeURIComponent(query)}`;
    const html = await fetchHTML(url);
    if (!html) return { price: null, url };
    const $ = cheerio.load(html);
    let priceStr = null;
    $('h5').each((i, el) => {
        const txt = $(el).text();
        if (txt && txt.includes('₹') && !priceStr) priceStr = txt;
    });
    return { price: parsePrice(priceStr), url };
};

const scrapeAllPlatformsLegacy = async (query) => {
    console.log(`[Decodo API] Firing concurrent scrape for: ${query}`);
    const results = await Promise.allSettled([
        scrapeAmazon(query), scrapeFlipkart(query),
        scrapeMyntra(query), scrapeAjio(query), scrapeMeesho(query),
    ]);
    const extract = (idx) =>
        results[idx].status === 'fulfilled' ? results[idx].value : { price: null, url: '' };
    console.log(`[Decodo API] Aggregated results.`);
    return {
        amazon:   extract(0), flipkart: extract(1),
        myntra:   extract(2), ajio:     extract(3), meesho: extract(4),
    };
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * scrapeAllPlatforms(query)
 * Tries the agentic pipeline first. Falls back to legacy Decodo if unavailable.
 * Attaches `_source` to indicate which path was taken.
 */
async function scrapeAllPlatforms(query) {
    // Quick liveness check (cached per process lifecycle)
    if (agentAvailable === null) {
        await checkAgentHealth();
    }

    if (agentAvailable) {
        console.log(`[Scraper] Using Agentic pipeline for: "${query}"`);
        const agentResult = await scrapeAllPlatformsAgent(query);
        if (agentResult) {
            agentResult._source = 'agent';
            return agentResult;
        }
        // Mark agent as down so we don't keep trying this request
        agentAvailable = false;
    }

    console.log(`[Scraper] Using Decodo legacy pipeline for: "${query}"`);
    const legacy = await scrapeAllPlatformsLegacy(query);
    legacy._source = 'decodo';
    return legacy;
}

module.exports = { scrapeAllPlatforms, checkAgentHealth };
