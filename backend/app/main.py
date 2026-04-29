"""
Anonymous counter backend for the CBSE Class XII Results 2026 prank page.

Stores nothing about who clicked Submit — only:
  - a running integer counter,
  - the timestamp of each reveal (rolling list, capped to RECENT_LIMIT).

No IP addresses, user-agents, session IDs, or form values are recorded.

Endpoints:
  POST /api/pranked         -> increment counter, return {count}
  GET  /api/stats?key=...   -> read counter + recent timestamps
  GET  /admin?key=...       -> private dashboard (HTML)
  GET  /healthz             -> liveness probe
"""

from __future__ import annotations

import hmac
import json
import os
import threading
from datetime import datetime, timezone
from html import escape
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
DATA_FILE = DATA_DIR / "counter.json"

# Secret required to read the counter. Set via env in production. If unset,
# the stats endpoints respond 503 — they never accept any caller-supplied
# value as authentication.
STATS_KEY = os.environ.get("STATS_KEY", "")

# How many of the most recent reveal timestamps to keep on disk.
RECENT_LIMIT = int(os.environ.get("RECENT_LIMIT", "500"))

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


def _check_key(supplied: str) -> bool:
    """Constant-time secret comparison. Returns False if STATS_KEY is unset."""
    if not STATS_KEY:
        return False
    return hmac.compare_digest(supplied or "", STATS_KEY)


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------

def _empty_state() -> dict:
    return {"count": 0, "last_at": None, "recent": []}


def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text(json.dumps(_empty_state()))


def _read() -> dict:
    _ensure_data_dir()
    try:
        data = json.loads(DATA_FILE.read_text() or "{}")
    except json.JSONDecodeError:
        return _empty_state()
    # Backfill missing keys for older state files.
    data.setdefault("count", 0)
    data.setdefault("last_at", None)
    data.setdefault("recent", [])
    return data


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
    now_iso = datetime.now(timezone.utc).isoformat()
    with _lock:
        data = _read()
        data["count"] = int(data.get("count", 0)) + 1
        data["last_at"] = now_iso
        recent = list(data.get("recent") or [])
        recent.append(now_iso)
        # Keep only the most recent N entries.
        if len(recent) > RECENT_LIMIT:
            recent = recent[-RECENT_LIMIT:]
        data["recent"] = recent
        _write(data)
        return {"count": data["count"]}


@app.get("/api/stats")
def stats(key: str = Query(default="")) -> dict:
    if not STATS_KEY:
        raise HTTPException(status_code=503, detail="stats key not configured")
    if not _check_key(key):
        raise HTTPException(status_code=403, detail="forbidden")
    data = _read()
    return {
        "count": int(data.get("count", 0)),
        "last_at": data.get("last_at"),
        "recent": list(data.get("recent") or []),
    }


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


def _render_rows(recent: list[str]) -> str:
    if not recent:
        return (
            "<tr><td class='empty' colspan='2'>No reveals yet. "
            "Share the link!</td></tr>"
        )
    rows = []
    # Most-recent first; show 1-based reveal number ("#42" = 42nd reveal).
    total = len(recent)
    for idx, iso in enumerate(reversed(recent)):
        n = total - idx
        # iso is ISO-8601 in UTC; render as-is (browser tz conversion is left
        # to the viewer, this is private anyway).
        rows.append(
            f"<tr><td class='num'>#{n}</td>"
            f"<td class='ts'>{escape(iso)}</td></tr>"
        )
    return "\n".join(rows)


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
    recent = list(data.get("recent") or [])
    rows_html = _render_rows(recent)
    return HTMLResponse(
        f"""
<!doctype html>
<html><head><meta charset="utf-8">
<title>Prank Stats</title>
<meta http-equiv="refresh" content="10">
<style>
  * {{ box-sizing: border-box; }}
  body {{
    font-family: system-ui, sans-serif; background:#0b1020;
    color:#eaeaea; margin:0; padding:32px 16px;
    display:flex; flex-direction:column; align-items:center;
  }}
  .card {{
    background:#141a35; padding:32px 44px; border-radius:14px;
    box-shadow:0 12px 40px rgba(0,0,0,.5); text-align:center;
    width:100%; max-width:520px;
  }}
  .label {{
    font-size:13px; letter-spacing:2px; text-transform:uppercase;
    color:#8aa1ff;
  }}
  .num-big {{ font-size:84px; font-weight:800; margin:6px 0 4px; }}
  .last {{ font-size:13px; color:#8a93b3; margin-bottom:4px; }}
  .footer {{
    margin-top:18px; font-size:12px; color:#5b6485;
  }}
  .panel {{
    margin-top:20px; width:100%; max-width:720px;
    background:#10162e; border-radius:12px; padding:18px 22px;
    box-shadow:0 8px 24px rgba(0,0,0,.4);
  }}
  .panel h2 {{
    margin:0 0 12px; font-size:14px; letter-spacing:2px;
    text-transform:uppercase; color:#8aa1ff; font-weight:600;
  }}
  table {{ width:100%; border-collapse:collapse; }}
  th, td {{
    text-align:left; padding:8px 10px; font-size:13px;
    border-bottom:1px solid #1d2549;
  }}
  th {{ color:#8a93b3; font-weight:600; }}
  td.num {{ color:#8aa1ff; width:60px; font-variant-numeric: tabular-nums; }}
  td.ts  {{ color:#dfe4ff; font-family: ui-monospace, Menlo, monospace; }}
  td.empty {{ color:#5b6485; font-style:italic; text-align:center; padding:18px; }}
  .scroll {{ max-height: 360px; overflow-y:auto; }}
</style></head><body>
  <div class="card">
    <div class="label">friends pranked</div>
    <div class="num-big">{count}</div>
    <div class="last">last reveal (UTC): {escape(str(last_at))}</div>
    <div class="footer">auto-refreshes every 10s &middot; private link</div>
  </div>

  <div class="panel">
    <h2>Recent reveal timestamps (UTC)</h2>
    <div class="scroll">
      <table>
        <thead><tr><th>#</th><th>timestamp</th></tr></thead>
        <tbody>
          {rows_html}
        </tbody>
      </table>
    </div>
  </div>
</body></html>
        """
    )


# Default 404 handler returns JSON for anything else.
@app.exception_handler(404)
async def not_found(_, __):
    return JSONResponse({"error": "not found"}, status_code=404)
