/**
 * cronScraper.js — SmartBuy Scheduled Price Refresh
 *
 * Runs every 6 hours (IST). For each query that has been tracked
 * in PriceHistory, re-scrapes all 5 platforms via Decodo and stores
 * new price points — building up a real historical dataset over time.
 */

const cron         = require('node-cron');
const { scrapeAllPlatforms } = require('../utils/scraper');
const Product      = require('../../DataBase/models/Product');
const PriceHistory = require('../../DataBase/models/PriceHistory');

const STORES      = ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Meesho'];
const STORE_KEYS  = ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho'];

// ── Scrape & persist one query ─────────────────────────────────────────────────

async function scrapeAndStore(query) {
  try {
    console.log(`[CronScraper] 🔄 Refreshing: "${query}"`);
    const livePrices = await scrapeAllPlatforms(query);

    const results = STORES.map((store, i) => ({
      store,
      price: livePrices[STORE_KEYS[i]]?.price || null,
      url:   livePrices[STORE_KEYS[i]]?.url   || '',
    }));

    const validResults = results.filter(r => r.price !== null);
    const bestPrice    = validResults.length ? Math.min(...validResults.map(r => r.price)) : null;
    const lowestStore  = validResults.find(r => r.price === bestPrice)?.store || null;

    // Refresh Product cache
    await Product.findOneAndUpdate(
      { query: query.toLowerCase() },
      { query: query.toLowerCase(), results, bestPrice, lowestStore, cachedAt: new Date() },
      { upsert: true, new: true }
    );

    // Append new PriceHistory data points
    if (validResults.length) {
      await PriceHistory.insertMany(validResults.map(r => ({
        query:      query.toLowerCase(),
        store:      r.store,
        price:      r.price,
        url:        r.url,
        recordedAt: new Date(),
      })));
      console.log(`[CronScraper] ✔ Saved ${validResults.length} price points for "${query}"`);
    } else {
      console.log(`[CronScraper] ⚠ No prices returned for "${query}"`);
    }
  } catch (err) {
    console.error(`[CronScraper] ✖ Error for "${query}":`, err.message);
  }
}

// ── Full cron run ──────────────────────────────────────────────────────────────

async function runCronJob() {
  console.log('[CronScraper] ⏰ Starting scheduled refresh...');
  try {
    const queries = await PriceHistory.distinct('query');
    if (!queries.length) {
      console.log('[CronScraper] No tracked products yet — skipping run.');
      return;
    }
    console.log(`[CronScraper] Refreshing ${queries.length} tracked product(s)...`);

    // Sequential scraping — avoids hammering Decodo rate limits
    for (const query of queries) {
      await scrapeAndStore(query);
      await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5s between queries
    }
    console.log('[CronScraper] ✔ Refresh run complete.');
  } catch (err) {
    console.error('[CronScraper] ✖ Run failed:', err.message);
  }
}

// ── Start scheduler ────────────────────────────────────────────────────────────

function start() {
  // Every 6 hours at minute 0: '0 */6 * * *'
  cron.schedule('0 */6 * * *', runCronJob, { timezone: 'Asia/Kolkata' });
  console.log('✔  CronScraper scheduled — runs every 6 hours (IST)');
}

module.exports = { start, runCronJob };
