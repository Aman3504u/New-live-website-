# cbse-prank-backend

Tiny FastAPI service that powers the anonymous "how many friends got pranked"
counter for the CBSE Class XII Results 2026 prank page.

**Stores nothing about who clicked Submit.** Only a single integer (plus the
last-seen timestamp) lives on disk.

## Endpoints

| Method | Path                      | Auth          | Purpose                             |
| ------ | ------------------------- | ------------- | ----------------------------------- |
| POST   | `/api/pranked`            | none          | Increment the counter, return new value. |
| GET    | `/api/stats?key=...`      | shared secret | Read the counter (JSON).            |
| GET    | `/admin?key=...`          | shared secret | Pretty private dashboard (HTML, auto-refresh). |
| GET    | `/healthz`                | none          | Liveness probe.                     |

## Configuration

| Env var      | Required | Notes                                                  |
| ------------ | -------- | ------------------------------------------------------ |
| `STATS_KEY`  | yes      | Shared secret guarding `/api/stats` and `/admin`. If unset, those endpoints respond 503. |
| `DATA_DIR`   | no       | Where to store `counter.json`. Defaults to `/data`.     |

## Local run

```bash
cd backend
pip install -e .
STATS_KEY=local-only DATA_DIR=./data uvicorn app.main:app --reload
```

## Deploy notes

The included version is meant for any FastAPI host (Fly.io, Render, Railway).
On Fly.io, mount a 1 GB volume at `/data` and set `STATS_KEY` as a secret:

```bash
fly volumes create data --size 1
fly secrets set STATS_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(16))')
```

## What it does NOT do

- It does **not** read or store any form fields from the prank page.
- It does **not** log IPs, user agents, or session identifiers.
- It does **not** know which roll number / school number / admit card ID
  someone typed into the form.
