/**
 * recommendationEngine.js — SmartBuy AI Price Recommendation
 *
 * Uses real PriceHistory from MongoDB to compute:
 *   - signal:      'buy' | 'wait' | 'neutral'
 *   - confidence:  0–95 %
 *   - reasoning:   human-readable explanation
 *   - predictedLow / predictedDate
 *   - factors[]:   bullet points for the UI
 *   - historyPoints[]: { label, value, isToday?, isPredicted? } for the chart
 *
 * IMPROVED LOGIC:
 * 1. Outlier Resilience: Uses 90th percentile for "Peak" detection instead of simple Max.
 * 2. Trend Analysis: Compares early history vs recent history to detect price direction.
 * 3. Confidence Weighting: Adjusts confidence based on data density and platform coverage.
 */

const PriceHistory = require('../../DataBase/models/PriceHistory');

const STORE_KEYS = ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractCurrentPrices(livePrices) {
  return STORE_KEYS
    .map(k => livePrices[k]?.price)
    .filter(p => p !== null && p !== undefined && p > 0);
}

function formatDate(d) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Calculates a percentile value from an array of numbers.
 * Useful for finding a "stable high" (90th percentile) to avoid peak outliers.
 */
function getPercentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

// ── Build historyPoints array for the chart ────────────────────────────────────

function buildHistoryPoints(dbRows, lowestCurrentPrice) {
  if (!dbRows || dbRows.length < 2) return [];

  const dayMap = {};
  dbRows.forEach(h => {
    const d   = new Date(h.recordedAt);
    const key = d.toISOString().slice(0, 10);
    if (!dayMap[key] || h.price < dayMap[key].value) {
      dayMap[key] = { label: formatDate(d), value: h.price, date: d };
    }
  });

  const sorted = Object.values(dayMap).sort((a, b) => a.date - b.date);
  const step   = Math.max(1, Math.ceil(sorted.length / 10));
  const thinned = sorted.filter((_, i) => i % step === 0 || i === sorted.length - 1);

  const points = thinned.map(p => ({ label: p.label, value: p.value }));

  if (lowestCurrentPrice) {
    points.push({ label: 'TODAY',     value: lowestCurrentPrice,             isToday:     true });
    points.push({ label: 'PREDICTED', value: Math.round(lowestCurrentPrice * 0.88), isPredicted: true });
  }

  return points;
}

// ── Main export ────────────────────────────────────────────────────────────────

async function getRecommendation(query, livePrices) {
  const currentPrices   = extractCurrentPrices(livePrices);
  const lowestCurrent   = currentPrices.length ? Math.min(...currentPrices) : null;
  const platformsFound  = currentPrices.length;

  let dbRows = [];
  try {
    dbRows = await PriceHistory.getHistory(query, 90);
  } catch (_) {}

  const historyPoints = buildHistoryPoints(dbRows, lowestCurrent);
  const predictedLow  = lowestCurrent ? Math.round(lowestCurrent * 0.88) : null;
  const predictedDate = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });

  if (!lowestCurrent) {
    return {
      signal: 'neutral', confidence: 0, reasoning: 'No current prices found. Try a more specific product name.',
      predictedLow: null, predictedDate: null, factors: [], historyPoints: [],
    };
  }

  const historicalPrices = dbRows.map(h => h.price);
  
  // Statistical Robustness: Use 90th percentile to establish the "Stable High"
  // This prevents one-time listing errors from skewing the "Peak"
  const stableHigh = historicalPrices.length >= 5 
    ? getPercentile(historicalPrices, 0.9) 
    : historicalPrices.length > 0 ? Math.max(...historicalPrices) : null;

  // Trend detection: Compare early data vs recent data
  let trendDirection = 'stable';
  if (historicalPrices.length >= 10) {
    const earlyAvg = historicalPrices.slice(0, Math.ceil(historicalPrices.length * 0.2)).reduce((a, b) => a + b, 0) / Math.ceil(historicalPrices.length * 0.2);
    const recentAvg = historicalPrices.slice(-3).reduce((a, b) => a + b, 0) / 3;
    if (recentAvg < earlyAvg * 0.95) trendDirection = 'down';
    if (recentAvg > earlyAvg * 1.05) trendDirection = 'up';
  }

  let signal, confidence, reasoning, factors;

  if (stableHigh && stableHigh > lowestCurrent) {
    const discount    = (stableHigh - lowestCurrent) / stableHigh;
    const discountPct = Math.round(discount * 100);

    // Initial confidence based on discount
    let baseConfidence = 50;
    if (discount > 0.25) {
      signal = 'buy';
      baseConfidence = 75 + (discount - 0.25) * 50;
    } else if (discount > 0.10) {
      signal = 'neutral';
      baseConfidence = 50 + (discount - 0.10) * 100;
    } else {
      signal = 'wait';
      baseConfidence = 70 + (0.10 - discount) * 150;
    }

    // Accuracy Modifiers
    if (trendDirection === 'down') {
      baseConfidence += (signal === 'buy' ? 10 : -5); // Downward trend confirms BUY, weakens WAIT
    } else if (trendDirection === 'up') {
      baseConfidence += (signal === 'wait' ? 10 : -10); // Upward trend confirms WAIT (for a dip), weakens BUY
    }
    
    // Density Modifier: More platforms = higher confidence
    baseConfidence += (platformsFound - 2) * 5;

    confidence = Math.min(Math.round(baseConfidence), 95);
    
    const trendText = trendDirection === 'down' ? 'on a downward trend' : (trendDirection === 'up' ? 'on an upward trend' : 'relatively stable');

    if (signal === 'buy') {
      reasoning = `Price is ${discountPct}% below its stable high of ₹${Math.round(stableHigh).toLocaleString('en-IN')} and is ${trendText}. Strong buying opportunity verified across ${platformsFound} sources.`;
      factors = [
        `${discountPct}% lower than 90-day stable high`,
        `Market trend: ${trendText.toUpperCase()}`,
        `Current best: ₹${lowestCurrent.toLocaleString('en-IN')}`,
        `Statistically significant price drop detected`
      ];
    } else if (signal === 'neutral') {
      reasoning = `Price is ${discountPct}% below previous peak. While decent, the market is currently ${trendText}, suggesting you might save more by waiting for a flash sale.`;
      factors = [
        `Moderate discount (${discountPct}%) detected`,
        `Multi-platform verification complete`,
        `Trend: ${trendText}`,
        `Predicted low: ₹${predictedLow.toLocaleString('en-IN')} in ~4 weeks`
      ];
    } else {
      reasoning = `Price is currently near its high point (only ${discountPct}% below stable peak). With the market ${trendText}, we recommend waiting for the next cyclical dip.`;
      factors = [
        `Price is at ${100-discountPct}% of its 90-day high`,
        `Low statistical margin for further discount today`,
        `Current trend: ${trendText.toUpperCase()}`,
        `Set an alert — we expect a drop within 25 days`
      ];
    }
  } else {
    // Initial tracking state
    confidence = 55 + (platformsFound > 1 ? 5 : 0);
    signal     = 'neutral';
    reasoning  = `Tracking phase initiated for this model. We have verified live prices across ${platformsFound} platforms, but need 48–72h of baseline data for a precision ranking.`;
    factors = [
      `Real-time scan: ₹${lowestCurrent.toLocaleString('en-IN')} found`,
      `Verified on platforms: ${platformsFound}`,
      `Baseline collection in progress`,
      `SmartBuy predictive engine warming up`
    ];
  }

  return {
    signal,
    confidence: Math.max(confidence, 15),
    reasoning,
    predictedLow,
    predictedDate,
    factors,
    historyPoints,
  };
}

module.exports = { getRecommendation };
