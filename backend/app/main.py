"""
Anonymous counter backend for the CBSE Class XII Results 2026 prank page.

Stores nothing about who clicked Submit — only a single integer counter
(plus the latest timestamp). The frontend never sends form values.

Endpoints:
  POST /api/pranked         -> increment counter, return {count}
  GET  /api/stats?key=...   -> read counter (shared-secret protected)
  GET  /healthz             -> liveness probe
"""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
DATA_FILE = DATA_DIR / "counter.json"

# Secret required to read the counter. MUST be set via the STATS_KEY env
# var in production. If unset, the stats endpoints simply 503 — they will
# never accept any caller-supplied value as authentication.
STATS_KEY = os.environ.get("STATS_KEY", "")


def _check_key(supplied: str) -> bool:
    if not STATS_KEY:
        return False
    return supplied == STATS_KEY

# CORS — allow the deployed frontend(s) and any local file usage.
ALLOWED_ORIGINS = [
    "https://cbse12-results-2026-daypsopt.devinapps.com",
    "https://cbse-prank-smluyrtt.devinapps.com",
    "http://localhost",
    "http://localhost:8000",
    "http://127.0.0.1",
    "null",  # for file:// origins during local testing
]

_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------

def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text(json.dumps({"count": 0, "last_at": None}))


def _read() -> dict:
    _ensure_data_dir()
    try:
        return json.loads(DATA_FILE.read_text() or "{}")
    except json.JSONDecodeError:
        return {"count": 0, "last_at": None}


def _write(payload: dict) -> None:
    _ensure_data_dir()
    tmp = DATA_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload))
    tmp.replace(DATA_FILE)


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="CBSE Prank Counter",
    description="Anonymous prank counter. No PII is stored.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz() -> dict:
    return {"ok": True}


@app.post("/api/pranked")
def pranked() -> dict:
    """Increment the global counter. No request body is read or stored."""
    with _lock:
        data = _read()
        data["count"] = int(data.get("count", 0)) + 1
        data["last_at"] = datetime.now(timezone.utc).isoformat()
        _write(data)
        return {"count": data["count"]}


@app.get("/api/stats")
def stats(key: str = Query(default="")) -> dict:
    if not STATS_KEY:
        raise HTTPException(status_code=503, detail="stats key not configured")
    if not _check_key(key):
        raise HTTPException(status_code=403, detail="forbidden")
    data = _read()
    return {"count": int(data.get("count", 0)), "last_at": data.get("last_at")}


@app.get("/", response_class=HTMLResponse)
def root() -> HTMLResponse:
    return HTMLResponse(
        """
        <!doctype html>
        <html><head><meta charset="utf-8"><title>cbse-prank-counter</title>
        <style>body{font-family:system-ui;margin:40px;color:#333}</style>
        </head><body>
        <h1>cbse-prank-counter</h1>
        <p>Anonymous counter backend. Nothing to see here.</p>
        </body></html>
        """
    )


@app.get("/admin", response_class=HTMLResponse)
def admin(key: str = Query(default="")) -> HTMLResponse:
    """Tiny private dashboard. Visit with ?key=<secret> to see the count."""
    if not STATS_KEY:
        return HTMLResponse(
            "<h1>503</h1><p>STATS_KEY env var not configured.</p>",
            status_code=503,
        )
    if not _check_key(key):
        return HTMLResponse(
            "<h1>403</h1><p>Wrong or missing key.</p>", status_code=403
        )
    data = _read()
    count = int(data.get("count", 0))
    last_at = data.get("last_at") or "—"
    return HTMLResponse(
        f"""
        <!doctype html>
        <html><head><meta charset="utf-8">
        <title>Prank Stats</title>
        <meta http-equiv="refresh" content="10">
        <style>
          body {{ font-family: system-ui, sans-serif; background:#0b1020;
                 color:#eaeaea; display:flex; align-items:center;
                 justify-content:center; min-height:100vh; margin:0; }}
          .card {{ background:#141a35; padding:40px 56px; border-radius:14px;
                   box-shadow:0 12px 40px rgba(0,0,0,.5); text-align:center; }}
          .label {{ font-size:14px; letter-spacing:2px; text-transform:uppercase;
                    color:#8aa1ff; }}
          .num {{ font-size:96px; font-weight:800; margin:8px 0 4px; }}
          .last {{ font-size:13px; color:#8a93b3; }}
          .footer {{ margin-top:24px; font-size:12px; color:#5b6485; }}
        </style></head><body>
        <div class="card">
          <div class="label">friends pranked</div>
          <div class="num">{count}</div>
          <div class="last">last reveal: {last_at}</div>
          <div class="footer">auto-refreshes every 10s &middot; private link</div>
        </div>
        </body></html>
        """
    )


# Default 404 handler returns JSON for anything else.
@app.exception_handler(404)
async def not_found(_, __):
    return JSONResponse({"error": "not found"}, status_code=404)
