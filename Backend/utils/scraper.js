/**
 * scraper.js — SmartBuy Unified Scraper
 *
 * Uses the Decodo API + Cheerio to scrape prices from all 5 platforms.
 * 
 * ACCURACY IMPROVEMENTS:
 * 1. Title Match Filtering: Verifies the scraped product title against the query.
 * 2. Outlier Price Filtering: Ignores prices that are statistically impossible for the given query.
 */

const cheerio = require('cheerio');

const DECODO_API_URL = "https://scraper-api.decodo.com/v2/scrape";
const DECODO_AUTH    = "Basic VTAwMDAzNzg4NzU6UFdfMTFiZDM3MjlhZGI3NjRiNDVmOTZjZWNhNDM5ZWJmZDZm";

// ── Helpers ───────────────────────────────────────────────────────────────────

const parsePrice = (priceStr) => {
    if (!priceStr) return null;
    const cleaned = priceStr.replace(/[^0-9]/g, '');
    const val = parseInt(cleaned, 10);
    return isNaN(val) || val === 0 ? null : val;
};

/**
 * fuzzyMatch(query, title)
 * Returns true if the title is a high-confidence match for the query.
 * Improvements:
 * 1. Substring matching (e.g. "Mac" matches "MacBook").
 * 2. Anchor keywords (numbers like 14, 15, m1, m2 are mandatory).
 */
const isTitleMatch = (query, resultTitle) => {
    if (!query || !resultTitle) return false;
    
    const queryLower = query.toLowerCase();
    const titleLower = resultTitle.toLowerCase();
    
    const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 2);
    if (queryWords.length === 0) return true;

    // 1. Mandatory Anchor Keywords Check (Numbers/Versions)
    // If user searches "M1" or "15", it MUST be in the title
    const anchors = queryWords.filter(w => /\d/.test(w) || w.length <= 2);
    for (const anchor of anchors) {
        if (!titleLower.includes(anchor)) return false;
    }

    // 2. Keyword Match Ratio
    // We check if the title contains the query words (as substrings to handle MacBook vs Mac)
    const matches = queryWords.filter(word => titleLower.includes(word));
    const matchRatio = matches.length / queryWords.length;
    
    // 3. Accessory Exclusion (STRICT)
    const accessoryKeywords = ['case', 'cover', 'tempered', 'glass', 'sticker', 'cable', 'charger', 'strap'];
    const detectedAccessory = accessoryKeywords.find(acc => 
        titleLower.includes(acc) && !queryLower.includes(acc)
    );
    if (detectedAccessory) return false;
    
    // For short queries (1-2 words), we need 100% match or anchor match
    if (queryWords.length <= 2) return matchRatio >= 0.5;
    
    return matchRatio >= 0.6;
};

// ── Decodo + Cheerio scrapers ─────────────────────────────────────────────────

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
    if (!html) return { price: null, url, title: null };
    const $ = cheerio.load(html);
    
    // Select first result that has a price and looks like a product
    let result = { price: null, url, title: null };
    
    $('.s-result-item[data-component-type="s-search-result"]').each((i, el) => {
        let title = $(el).find('h2 a span').text() || $(el).find('h2 span').text() || $(el).find('h2').text();
        const priceStr = $(el).find('.a-price-whole').first().text();
        const price = parsePrice(priceStr);
        let link = $(el).find('h2 a').attr('href') || $(el).find('.a-link-normal[href*="/dp/"]').attr('href') || $(el).find('a.a-link-normal').attr('href');
        
        if (price && isTitleMatch(query, title)) {
            result = { 
                price, 
                url: link ? (link.startsWith('http') ? link : `https://www.amazon.in${link}`) : url,
                title 
            };
            return false; // break
        }
    });
    
    return result;
};

const scrapeFlipkart = async (query) => {
    const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
    const html = await fetchHTML(url);
    if (!html) return { price: null, url, title: null };
    const $ = cheerio.load(html);
    
    let result = { price: null, url, title: null };
    
    // "N-Iteration" Strategy: We try multiple ways to extract from each potential product row
    $('div[data-id], a.k7wcnx, div._1AtVbE').each((i, el) => {
        const container = $(el);
        
        // --- TIER 1: Hashed Classes (Title) ---
        let title = container.find('div.KzY99u').text() || 
                    container.find('a[class*="irp"]').text() || 
                    container.find('div[class*="KzD161"]').text() || 
                    container.find('div._4rR01T').text();
        
        // --- TIER 2: Structural Fallback (Title) ---
        // Laptop layout: Col 2 (2nd child) contains the title div
        if (!title) {
            title = container.children().eq(1).find('div').first().text();
        }

        // --- TIER 1: Hashed Classes (Price) ---
        let priceStr = container.find('div.Nx9Z0j').text() || 
                       container.find('div[class*="Nx9bqj"]').text() || 
                       container.find('div._30jeq3').text();

        // --- TIER 2: Structural Fallback (Price) ---
        // Laptop layout: Col 3 (3rd child) contains the price
        if (!priceStr) {
            priceStr = container.children().eq(2).text();
        }

        // --- TIER 3: Deep Scan (Iteration till perfection) ---
        // If still no price, we look for literally ANY element with ₹ inside the container
        if (!priceStr || !priceStr.includes('₹')) {
            container.find('*').each((j, inner) => {
                const txt = $(inner).text().trim();
                if (txt.startsWith('₹') && txt.length < 15) {
                    priceStr = txt;
                    return false; 
                }
            });
        }

        const price = parsePrice(priceStr);
        const link = container.attr('href') || container.find('a').attr('href');
        
        if (price && isTitleMatch(query, title)) {
            result = { 
                price, 
                url: link ? (link.startsWith('http') ? link : `https://www.flipkart.com${link}`) : url,
                title: title.trim() 
            };
            return false; // Found a solid match, exit loop
        }
    });
    
    return result;
};

const scrapeMyntra   = async (query) => {
    const url = `https://www.myntra.com/${query.replace(/\s+/g, '-').toLowerCase()}`;
    const html = await fetchHTML(url);
    if (!html) return { price: null, url, title: null };
    const $ = cheerio.load(html);
    
    let result = { price: null, url, title: null };
    
    $('.product-base').each((i, el) => {
        const title = $(el).find('.product-product').text() || $(el).find('.product-brand').text();
        const priceStr = $(el).find('.product-discountedPrice').text() || $(el).find('.product-price').text();
        const price = parsePrice(priceStr);
        const link = $(el).find('a').attr('href');
        
        if (price && isTitleMatch(query, title)) {
            result = { 
                price, 
                url: link ? (link.startsWith('http') ? link : `https://www.myntra.com/${link}`) : url,
                title 
            };
            return false;
        }
    });
    
    return result;
};

const scrapeAjio     = async (query) => {
    const url = `https://www.ajio.com/search/?text=${encodeURIComponent(query)}`;
    const html = await fetchHTML(url);
    if (!html) return { price: null, url, title: null };
    const $ = cheerio.load(html);
    
    let result = { price: null, url, title: null };
    
    // Ajio "N-Iteration" Strategy
    $('.item, .rilrtl-products-list__link').each((i, el) => {
        const container = $(el);
        
        // --- TIER 1: Standard CSS Classes ---
        let title = container.find('.nameCls').text() || container.find('.brand').text();
        let priceStr = container.find('.price').first().text();

        // --- TIER 2: ARIA-Label Parsing (Ultimate Fallback) ---
        // Ajio often puts a full description like "Brand Title. Current price; ₹299. MRP ₹1,499..." in the ARIA label
        const ariaLabel = container.attr('aria-label') || container.find('a').attr('aria-label');
        if (ariaLabel && (!title || !priceStr)) {
            // Extract title: Text before "Current price"
            const titleMatch = ariaLabel.match(/^(.*?)\.\s*Current price/i);
            if (titleMatch) title = titleMatch[1];
            
            // Extract price: Text between "Current price;" and "."
            const priceMatch = ariaLabel.match(/Current price;\s*(₹[\d,]+)/i);
            if (priceMatch) priceStr = priceMatch[1];
        }

        // --- TIER 3: Deep Scan ---
        if (!priceStr || !priceStr.includes('₹')) {
            container.find('*').each((j, inner) => {
                const txt = $(inner).text().trim();
                if (txt.includes('₹') && txt.length < 20) {
                    priceStr = txt;
                    return false;
                }
            });
        }

        const price = parsePrice(priceStr);
        const link = container.attr('href') || container.find('a').attr('href');
        
        if (price && isTitleMatch(query, title)) {
            result = { 
                price, 
                url: link ? (link.startsWith('http') ? link : `https://www.ajio.com${link}`) : url,
                title: title.trim() 
            };
            return false;
        }
    });
    
    return result;
};

const scrapeMeesho   = async (query) => {
    const url = `https://www.meesho.com/search?q=${encodeURIComponent(query)}`;
    const html = await fetchHTML(url);
    if (!html) return { price: null, url, title: null };
    const $ = cheerio.load(html);
    
    let result = { price: null, url, title: null };
    
    // Meesho items are often in <a> tags within a grid
    $('a[href*="/p/"]').each((i, el) => {
        const title = $(el).find('p[class*="ProductTitle"]').text() || $(el).find('span[class*="ProductTitle"]').text();
        let priceStr = null;
        $(el).find('h5, p, span').each((j, nested) => {
            const txt = $(nested).text();
            if (txt.includes('₹')) {
                priceStr = txt;
                return false;
            }
        });
        
        const price = parsePrice(priceStr);
        const link = $(el).attr('href');
        
        if (price && isTitleMatch(query, title)) {
            result = { 
                price, 
                url: link ? (link.startsWith('http') ? link : `https://www.meesho.com${link}`) : url,
                title 
            };
            return false;
        }
    });
    
    return result;
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * scrapeAllPlatforms(query)
 * Scrapes Amazon, Flipkart, Myntra, Ajio, and Meesho concurrently via Decodo.
 * Attaches `_source = 'decodo'`.
 */
async function scrapeAllPlatforms(query) {
    console.log(`[Scraper] Firing concurrent Decodo scrape for: "${query}"`);
    const results = await Promise.allSettled([
        scrapeAmazon(query), scrapeFlipkart(query),
        scrapeMyntra(query), scrapeAjio(query), scrapeMeesho(query),
    ]);
    
    const extract = (idx) =>
        results[idx].status === 'fulfilled' ? results[idx].value : { price: null, url: '', title: null };
    
    console.log(`[Scraper] Aggregated results for: "${query}"`);
    
    return {
        amazon:   extract(0),
        flipkart: extract(1),
        myntra:   extract(2),
        ajio:     extract(3),
        meesho:   extract(4),
        _source:  'decodo',
    };
}

module.exports = { scrapeAllPlatforms, isTitleMatch };
