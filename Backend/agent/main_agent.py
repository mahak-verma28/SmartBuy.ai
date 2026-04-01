"""
main_agent.py — SmartBuy AI FastAPI Sidecar
Serves on http://localhost:5001
Consumed by Node.js search.js route
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env from Backend directory (one level up from agent/)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import asyncio

# ── Ensure agent/ is on sys.path ──────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent))
from agents import OrchestratorAgent, PLATFORMS_ORDER

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SmartBuy AI Agent",
    description="Autonomous multi-agent price tracker powered by Groq + Playwright",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query:     str                    = Field(..., min_length=1, description="Product search query")
    platforms: Optional[list[str]]   = Field(default=None, description="Platforms to search")


class PlatformResult(BaseModel):
    price:    Optional[float]  = None
    url:      str              = ""
    title:    Optional[str]    = None
    in_stock: bool             = True
    source:   Optional[str]    = None
    verdict:  Optional[str]    = None
    error:    Optional[str]    = None


class SearchResponse(BaseModel):
    query:      str
    results:    dict                  # platform -> PlatformResult
    log:        list[str]
    best_price: Optional[float]       = None
    best_store: Optional[str]         = None
    agent:      str                   = "SmartBuy-Agentic-v1"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Liveness probe for Node.js to verify the agent sidecar is running."""
    return {"status": "ok", "agent": "SmartBuy-Agentic-v1"}


@app.post("/search", response_model=SearchResponse)
async def search_product(request: SearchRequest):
    """
    Main agentic search endpoint.
    Runs the full ReAct pipeline: DDG → Playwright → Validator → return.
    """
    query     = request.query.strip()
    platforms = request.platforms or PLATFORMS_ORDER

    # Validate platform names
    invalid = [p for p in platforms if p not in PLATFORMS_ORDER]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown platforms: {invalid}")

    try:
        orchestrator = OrchestratorAgent(platforms=platforms)
        outcome      = await orchestrator.run(query)
    except ValueError as e:
        # Missing GROQ_API_KEY etc.
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    return SearchResponse(
        query=query,
        results=outcome["results"],
        log=outcome["log"],
        best_price=outcome["best_price"],
        best_store=outcome["best_store"],
    )


@app.get("/search")
async def search_product_get(q: str, platforms: Optional[str] = None):
    """
    GET convenience wrapper — called by Node.js with ?q=query&platforms=amazon,flipkart
    """
    platform_list = platforms.split(",") if platforms else PLATFORMS_ORDER
    req = SearchRequest(query=q, platforms=platform_list)
    return await search_product(req)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AGENT_PORT", "5001"))
    uvicorn.run("main_agent:app", host="0.0.0.0", port=port, reload=False)
