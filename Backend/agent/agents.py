"""
agents.py — SmartBuy AI Groq-Powered Agent Layer
Components:
  - ValidatorAgent: llama3-8b-8192 — decides MATCH / NO_MATCH
  - OrchestratorAgent: llama3-70b-8192 — ReAct loop across platforms
"""

import os
import asyncio
import json
import re
from typing import Optional
from groq import Groq
from scraper_engine import get_product_urls, scrape_data

# ── Groq client setup ─────────────────────────────────────────────────────────

def get_groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set in environment")
    return Groq(api_key=api_key)


# ── Validator Agent ───────────────────────────────────────────────────────────

class ValidatorAgent:
    """
    Uses llama3-8b-8192 to verify the scraped page is actually the product
    the user searched for. Returns 'MATCH' or 'NO_MATCH'.
    Fast and cheap — runs on every result before it is accepted.
    """

    MODEL = "llama3-8b-8192"
    SYSTEM_PROMPT = (
        "You are a product validation assistant. "
        "Your only job is to decide if a scraped page title matches a user's search query. "
        "Respond with exactly one token: MATCH or NO_MATCH — nothing else."
    )

    def __init__(self):
        self.client = get_groq_client()

    def validate(self, query: str, scraped_title: str) -> str:
        """
        Returns 'MATCH' if scraped_title is genuinely the product described in query,
        'NO_MATCH' otherwise.
        """
        if not scraped_title or not scraped_title.strip():
            return "NO_MATCH"

        user_prompt = (
            f"User searched for: \"{query}\"\n"
            f"Scraped page title: \"{scraped_title}\"\n\n"
            "Is this the same product? Reply MATCH or NO_MATCH only."
        )

        try:
            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user",   "content": user_prompt},
                ],
                max_tokens=5,
                temperature=0.0,  # deterministic
            )
            verdict = response.choices[0].message.content.strip().upper()
            # Sanitise — only accept exact tokens
            return "MATCH" if "MATCH" in verdict and "NO" not in verdict else "NO_MATCH"
        except Exception as e:
            print(f"[Validator] Groq call failed: {e}")
            # Default to MATCH on API failure — don't discard potentially valid data
            return "MATCH"


# ── Orchestrator Agent ────────────────────────────────────────────────────────

PLATFORMS_ORDER = ["amazon", "flipkart", "myntra", "ajio", "meesho"]

class OrchestratorAgent:
    """
    ReAct-style orchestrator:
      Thought → Action (search + scrape) → Observation (validate) → repeat or return

    For each platform (in order):
      1. DuckDuckGo site-scoped search → candidate URLs
      2. Playwright scrape of top URL → (title, price)
      3. Validator LLM → MATCH or NO_MATCH
      4. If MATCH and price found → accept and move to next platform
         If NO_MATCH or error → try next URL on same platform, then next platform

    Collects results from ALL platforms (skip on block, use next URL on mismatch).
    """

    def __init__(self, platforms: Optional[list[str]] = None):
        self.platforms  = platforms or PLATFORMS_ORDER
        self.validator  = ValidatorAgent()
        self.client     = get_groq_client()
        self.log        = []  # reasoning log for frontend display

    def _think(self, message: str):
        """Append a thought to the reasoning log."""
        self.log.append(message)
        print(f"[Orchestrator] {message}")

    async def _try_platform(self, query: str, platform: str) -> Optional[dict]:
        """
        Try to get a valid price from one platform.
        Returns result dict on success, None on failure.
        """
        self._think(f"🔍 [{platform.upper()}] Searching DuckDuckGo: site:{platform}.in \"{query}\"")

        urls = await asyncio.to_thread(get_product_urls, query, platform, max_results=4)

        if not urls:
            self._think(f"❌ [{platform.upper()}] No URLs found via DDG — skipping")
            return None

        self._think(f"🔗 [{platform.upper()}] Found {len(urls)} candidate URL(s)")

        for i, url in enumerate(urls):
            self._think(f"🌐 [{platform.upper()}] Scraping URL #{i+1}: {url}")
            scraped = await scrape_data(url, platform)

            # Bot detection / network error
            if scraped.get("error") == "Bot Detected":
                self._think(f"🚫 [{platform.upper()}] Bot block detected — trying next URL")
                continue
            if scraped.get("error"):
                self._think(f"⚠️  [{platform.upper()}] Error: {scraped['error']} — trying next URL")
                continue

            title = scraped.get("title") or ""
            price = scraped.get("price")

            if not price:
                self._think(f"⚠️  [{platform.upper()}] Price not found on this page — trying next URL")
                continue

            # Validator check
            self._think(f"🤖 [{platform.upper()}] Validator checking: \"{title[:60]}\"")
            verdict = self.validator.validate(query, title)

            if verdict == "NO_MATCH":
                self._think(f"❌ [{platform.upper()}] Validator says NO_MATCH — trying next URL")
                continue

            self._think(
                f"✅ [{platform.upper()}] MATCH! Price: ₹{price:,.0f} | "
                f"Source: {scraped.get('source')} | Stock: {'Yes' if scraped.get('in_stock') else 'No'}"
            )
            return {
                "store":    platform,
                "price":    price,
                "currency": scraped.get("currency", "INR"),
                "url":      url,
                "title":    title,
                "in_stock": scraped.get("in_stock", True),
                "source":   scraped.get("source"),
                "verdict":  "MATCH",
            }

        self._think(f"🔴 [{platform.upper()}] All URLs exhausted — no valid price")
        return None

    async def run(self, query: str) -> dict:
        """
        Main ReAct loop. Returns:
        {
          results: { amazon: {...}, flipkart: {...}, ... },
          log: [...reasoning steps...],
          best_price: int,
          best_store: str
        }
        """
        self.log = []
        results  = {}

        self._think(f"🚀 Starting Orchestrator for: \"{query}\"")
        self._think(f"📋 Platform order: {' → '.join(self.platforms)}")

        # Run platforms concurrently for speed — each with internal sequential URL fallback
        tasks = {p: self._try_platform(query, p) for p in self.platforms}
        platform_results = await asyncio.gather(*tasks.values(), return_exceptions=True)

        for platform, res in zip(tasks.keys(), platform_results):
            if isinstance(res, Exception):
                self._think(f"💥 [{platform.upper()}] Unhandled exception: {res}")
                results[platform] = {"price": None, "url": "", "error": str(res)}
            elif res is None:
                results[platform] = {"price": None, "url": "", "error": "No valid result"}
            else:
                results[platform] = res

        # Determine best price
        valid = [(p, d) for p, d in results.items() if d.get("price")]
        if valid:
            best_platform, best_data = min(valid, key=lambda x: x[1]["price"])
            best_price = best_data["price"]
            best_store = best_platform
            self._think(f"🏆 Best price: ₹{best_price:,.0f} from {best_platform.upper()}")
        else:
            best_price = None
            best_store = None
            self._think("😔 No valid prices found across all platforms")

        return {
            "results":    results,
            "log":        self.log,
            "best_price": best_price,
            "best_store": best_store,
        }
