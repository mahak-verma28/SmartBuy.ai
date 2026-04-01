"""
scraper_engine.py — SmartBuy AI Agentic Scraper
Responsibilities:
  1. Discover direct product-page URLs via DuckDuckGo site-scoped search
  2. Render pages with Playwright (headless Chromium)
  3. Extract price via Schema.org JSON-LD first, CSS selectors as fallback
  4. Detect bot-blocks and out-of-stock states
"""

import json
import re
import asyncio
from typing import Optional
try:
    from ddgs import DDGS          # new package name
except ImportError:
    from duckduckgo_search import DDGS  # fallback to old name

# ── Platform Configuration ────────────────────────────────────────────────────

PLATFORM_CONFIG = {
    "amazon": {
        "site":        "amazon.in",
        "domain":      "https://www.amazon.in",
        "url_pattern": r"amazon\.in/(dp|gp/product|s\?k)",
        "selectors":   [
            "#corePrice_desktop .a-price-whole",
            "#corePrice_feature_div .a-price-whole",
            "#kindle-price",
            ".a-price-whole",
            "#price_inside_buybox",
            "#newBuyBoxPrice",
            ".priceToPay .a-price-whole",
        ],
        "out_of_stock_selectors": [
            "#outOfStock",
            "#availability .a-color-price",
        ],
        "title_selectors": ["#productTitle", "#title"],
        "prefer_product_page": True,
    },
    "flipkart": {
        "site":        "flipkart.com",  # .com not .in
        "domain":      "https://www.flipkart.com",
        "url_pattern": r"flipkart\.com/[^/]+/p/",
        "selectors":   [
            "div._30jeq3",
            "div.Nx9bqj",
            "div[class*='_30jeq3']",
            "div[class*='Nx9bqj']",
            "._25b18 ._30jeq3",
        ],
        "out_of_stock_selectors": ["._16FRp0"],
        "title_selectors": ["span.B_NuCI", "h1.yhB1nd"],
        "prefer_product_page": True,
    },
    "myntra": {
        "site":        "myntra.com",
        "domain":      "https://www.myntra.com",
        "url_pattern": r"myntra\.com/[^/]+/[^/]+/buy",
        "selectors":   [
            "span.pdp-price strong",
            ".pdp-price",
            ".pdp-discountedPrice",
            "span.pdp-mrp strong",
        ],
        "out_of_stock_selectors": [".pdp-out-of-stock"],
        "title_selectors": ["h1.pdp-title", ".pdp-name"],
        "prefer_product_page": True,
    },
    "ajio": {
        "site":        "ajio.com",
        "domain":      "https://www.ajio.com",
        "url_pattern": r"ajio\.com/[^/]+/p/",
        "selectors":   [
            ".prod-sp",
            "span.price",
            "span[class*='price']",
            "div[class*='price']",
            ".price-section .price",
        ],
        "out_of_stock_selectors": [".notify-me"],
        "title_selectors": ["h1.nameTxtBox", ".prod-name"],
        "prefer_product_page": True,
    },
    "meesho": {
        "site":        "meesho.com",
        "domain":      "https://www.meesho.com",
        "url_pattern": r"meesho\.com/[^/]+/p/",
        "selectors":   [
            "h4[class*='Text__StyledText']",
            "span[class*='Price']",
            "div[class*='price']",
            # Meesho uses ₹ symbol text nodes
        ],
        "out_of_stock_selectors": [],
        "title_selectors": ["p[class*='Title']", "h1"],
        "prefer_product_page": True,
    },
}

# ── Step 1: URL Discovery via DuckDuckGo ─────────────────────────────────────

def get_product_urls(query: str, platform: str, max_results: int = 5) -> list[str]:
    """
    Use DuckDuckGo with site-specific operator to find direct product-page URLs.
    Bypasses on-site search bot detection by using DDG as the entry point.
    Returns a ranked list of candidate URLs (product pages first).
    """
    cfg = PLATFORM_CONFIG.get(platform)
    if not cfg:
        return []

    site = cfg["site"]
    prefer_pattern = cfg.get("url_pattern", "")

    # Strategy: try quoted exact search first, fall back to unquoted if no results
    def _ddg_search(q: str) -> list[str]:
        try:
            with DDGS() as ddgs_client:
                raw = ddgs_client.text(q, max_results=max_results * 2)
                return [r["href"] for r in (raw or []) if site in r.get("href", "")]
        except Exception as e:
            print(f"[DDG ERROR] {platform} query='{q}': {e}")
            return []

    # 1. Strict: site + quoted product name
    urls = _ddg_search(f'site:{site} "{query}"')
    # 2. Relaxed: site + unquoted if strict gave nothing
    if not urls:
        urls = _ddg_search(f'site:{site} {query}')
    # 3. Even more relaxed: no site: operator, just domain in results filter
    if not urls:
        urls = _ddg_search(f'{query} site:{site} buy price')

    # Prioritise direct product-page URLs (contain /dp/, /p/, etc.)
    product_urls = []
    fallback_urls = []
    for url in urls:
        if prefer_pattern and re.search(prefer_pattern, url):
            product_urls.append(url)
        else:
            fallback_urls.append(url)

    ranked = product_urls + fallback_urls
    return ranked[:max_results]


# ── Step 2: Schema.org JSON-LD Extractor ─────────────────────────────────────

def extract_jsonld_price(html_content: str) -> Optional[dict]:
    """
    Parse JSON-LD Schema.org metadata for clean, reliable price data.
    This is the highest-quality source — no layout changes can break it.
    """
    try:
        # Find all <script type="application/ld+json"> blocks
        pattern = r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>'
        matches = re.findall(pattern, html_content, re.DOTALL | re.IGNORECASE)

        for raw in matches:
            try:
                data = json.loads(raw.strip())
            except json.JSONDecodeError:
                continue

            # Handle both single objects and @graph arrays
            items = []
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict):
                if "@graph" in data:
                    items = data["@graph"]
                else:
                    items = [data]

            for item in items:
                schema_type = item.get("@type", "")
                if isinstance(schema_type, list):
                    schema_type = " ".join(schema_type)

                # Product schema
                if "Product" in schema_type:
                    offers = item.get("offers", item.get("Offers", {}))
                    if isinstance(offers, list):
                        offers = offers[0] if offers else {}

                    price = offers.get("price") or offers.get("Price")
                    currency = offers.get("priceCurrency", "INR")
                    name = item.get("name", "")
                    availability = offers.get("availability", "")
                    in_stock = "OutOfStock" not in str(availability)

                    if price:
                        return {
                            "price":     float(str(price).replace(",", "")),
                            "currency":  currency,
                            "title":     name,
                            "in_stock":  in_stock,
                            "source":    "schema_org",
                        }
    except Exception as e:
        print(f"[JSON-LD] Parse error: {e}")

    return None


# ── Rupee text extractor (Meesho / Ajio fallback) ────────────────────────────

def extract_rupee_from_text(text: str) -> Optional[float]:
    """Extract first ₹ price from raw text (for Meesho / Ajio)."""
    match = re.search(r'[₹Rs\.]+\s*([\d,]+)', text)
    if match:
        try:
            return float(match.group(1).replace(",", ""))
        except ValueError:
            pass
    return None


# ── Step 3: Playwright Scraper ────────────────────────────────────────────────

async def scrape_data(url: str, platform: str) -> dict:
    """
    Render a product page with headless Playwright.
    Strategy:
      1. Schema.org JSON-LD  (most reliable)
      2. Platform CSS selectors
      3. ₹ symbol text search (generic last resort)
    Returns: { title, price, currency, in_stock, url, source, error? }
    """
    from playwright.async_api import async_playwright, TimeoutError as PWTimeout

    cfg = PLATFORM_CONFIG.get(platform, {})
    price_selectors  = cfg.get("selectors", [])
    title_selectors  = cfg.get("title_selectors", [])
    oos_selectors    = cfg.get("out_of_stock_selectors", [])

    result = {
        "url":      url,
        "platform": platform,
        "title":    None,
        "price":    None,
        "currency": "INR",
        "in_stock": True,
        "source":   None,
    }

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                ],
            )
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 800},
                locale="en-IN",
                extra_http_headers={
                    "Accept-Language": "en-IN,en;q=0.9",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
            )

            # Block images/fonts/media for speed
            await context.route(
                "**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,eot,mp4,mp3}",
                lambda route: route.abort(),
            )

            page = await context.new_page()
            page.set_default_timeout(30000)

            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_timeout(2000)  # small wait for JS rendering
            except PWTimeout:
                await browser.close()
                return {**result, "error": "Page load timeout"}

            html = await page.content()

            # ── Detect bot block ───────────────────────────────────────────
            block_signals = ["captcha", "access denied", "robot check",
                             "unusual traffic", "verify you are human", "blocked"]
            page_lower = html.lower()
            if any(sig in page_lower for sig in block_signals):
                await browser.close()
                return {**result, "error": "Bot Detected"}

            # ── Strategy 1: Schema.org JSON-LD ────────────────────────────
            jsonld = extract_jsonld_price(html)
            if jsonld and jsonld.get("price"):
                result["price"]    = jsonld["price"]
                result["currency"] = jsonld.get("currency", "INR")
                result["title"]    = jsonld.get("title") or result["title"]
                result["in_stock"] = jsonld.get("in_stock", True)
                result["source"]   = "schema_org"

            # ── Title extraction (for validator) ──────────────────────────
            if not result["title"]:
                for sel in title_selectors:
                    try:
                        el = await page.query_selector(sel)
                        if el:
                            result["title"] = (await el.inner_text()).strip()
                            break
                    except Exception:
                        continue

            if not result["title"]:
                try:
                    result["title"] = await page.title()
                except Exception:
                    pass

            # ── Strategy 2: CSS selector fallback ────────────────────────
            if not result["price"]:
                for sel in price_selectors:
                    try:
                        el = await page.query_selector(sel)
                        if el:
                            raw = (await el.inner_text()).strip()
                            cleaned = re.sub(r"[^\d.]", "", raw)
                            if cleaned:
                                result["price"]  = float(cleaned)
                                result["source"] = f"css:{sel}"
                                break
                    except Exception:
                        continue

            # ── Strategy 3: ₹ symbol text scan ───────────────────────────
            if not result["price"]:
                try:
                    body_text = await page.inner_text("body")
                    price_val = extract_rupee_from_text(body_text)
                    if price_val:
                        result["price"]  = price_val
                        result["source"] = "text_scan"
                except Exception:
                    pass

            # ── Out-of-stock check ────────────────────────────────────────
            for oos_sel in oos_selectors:
                try:
                    oos_el = await page.query_selector(oos_sel)
                    if oos_el:
                        oos_text = (await oos_el.inner_text()).lower()
                        if any(w in oos_text for w in ["out of stock", "sold out", "unavailable"]):
                            result["in_stock"] = False
                except Exception:
                    continue

            await browser.close()

    except Exception as e:
        return {**result, "error": str(e)}

    if not result["price"]:
        result["error"] = "Price not found on page"

    return result
