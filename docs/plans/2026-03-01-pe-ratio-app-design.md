# P/E Ratio Tracker — Design Document

**Date:** 2026-03-01
**Stack:** React + Vite, Supabase (PostgreSQL + Edge Functions), Vercel

---

## Overview

A single-page web app that lets any visitor maintain a shared watchlist of publicly traded US companies (NYSE/NASDAQ) and view their key financial metrics including P/E ratio, EPS, current price, and market cap. No authentication required — all visitors share the same list.

---

## Architecture

```
Browser (React + Vite)
  │
  ├── reads/writes ticker list ──→ Supabase PostgreSQL
  │                                  table: tickers (symbol, created_at)
  │
  └── fetches stock data ────────→ Supabase Edge Function: get-stock-data
                                     │
                                     └── calls Finnhub (server-side, key secured)
                                           ├── GET /quote          → price
                                           ├── GET /stock/profile2 → name, market cap
                                           └── GET /stock/metric   → P/E ratio, EPS
```

- The ticker list is persisted in Supabase — one shared list for all visitors
- The Edge Function accepts a ticker symbol, fans out to 3 Finnhub endpoints in parallel, and returns a merged response
- The Finnhub API key is stored as a Supabase secret, never exposed to the browser
- The frontend is deployed on Vercel; no backend runs on Vercel

---

## Database Schema

**Table: `tickers`**

| Column       | Type          | Notes                          |
|--------------|---------------|--------------------------------|
| `id`         | `uuid`        | Primary key, auto-generated    |
| `symbol`     | `text`        | Unique, uppercase (e.g. AAPL)  |
| `created_at` | `timestamptz` | Default `now()`                |

Row-level security: publicly readable and writable (no auth). This is intentional for a single shared view.

**Migration SQL** (to be run in Supabase SQL Editor):

```sql
create table public.tickers (
  id uuid primary key default gen_random_uuid(),
  symbol text unique not null,
  created_at timestamptz default now()
);

alter table public.tickers enable row level security;

create policy "Allow public read" on public.tickers
  for select using (true);

create policy "Allow public insert" on public.tickers
  for insert with check (true);

create policy "Allow public delete" on public.tickers
  for delete using (true);
```

---

## Supabase Edge Function: `get-stock-data`

**Input:** `?symbol=AAPL`
**Output:**
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "price": 189.30,
  "eps": 6.67,
  "pe": 28.4,
  "marketCap": 2940000000000
}
```

- Fans out 3 Finnhub API calls in parallel (`Promise.all`)
- Finnhub API key stored as a Supabase secret (`FINNHUB_API_KEY`)
- Returns HTTP 404 if ticker is not found on Finnhub
- Returns HTTP 429 with error message if Finnhub rate limit is hit

---

## Data Flow

1. **App loads** → fetch all rows from `tickers` → call Edge Function once per symbol (in parallel) → render table
2. **User adds a ticker** → call Edge Function to validate symbol exists → if valid, insert into `tickers` → refresh data
3. **User removes a ticker** → delete row from `tickers` → remove from UI immediately
4. **User sorts** → client-side only, no DB interaction

---

## UI

Single page layout:

```
┌─────────────────────────────────────────────────────────────────┐
│  Peratio                                                        │
│  P/E Ratio Tracker                                              │
├─────────────────────────────────────────────────────────────────┤
│  [ AAPL          ] [ Add Company ]                              │
├──────┬──────────────┬──────┬───────┬──────────┬────────────────┤
│Ticker│ Company      │ P/E  │ Price │ EPS(TTM) │ Market Cap     │
├──────┼──────────────┼──────┼───────┼──────────┼────────────────┤
│ AAPL │ Apple Inc.   │ 28.4 │$189.30│   $6.67  │  $2.94T     🗑 │
│ MSFT │ Microsoft    │ 34.1 │$415.20│  $12.17  │  $3.08T     🗑 │
│ LYFT │ Lyft Inc.    │  —   │ $12.40│  -$0.83  │  $5.2B      🗑 │
└──────┴──────────────┴──────┴───────┴──────────┴────────────────┘
```

### Column Sorting
- Clicking any column header sorts by that column
- 1st click → ascending (A→Z for text, low→high for numbers)
- 2nd click → descending (Z→A for text, high→low for numbers)
- Subsequent clicks alternate between ascending and descending
- Active sort column shows ↑ or ↓ arrow indicator

### Add Ticker
- Input normalized to uppercase, whitespace stripped
- On submit: calls Edge Function to validate, then inserts to Supabase
- Input cleared after successful add

### Display Details
- Negative EPS shown in red to explain missing P/E ratio
- Missing P/E shown as `—` (not `0` or blank)
- Each row shows a loading spinner while data is being fetched

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Invalid ticker | Inline error: "Ticker not found" |
| Duplicate ticker | Client-side check: "Already in your list" |
| Finnhub rate limit | Affected rows show "Data unavailable" |
| Finnhub returns null P/E | Display `—` |
| Negative EPS (loss) | Show EPS in red; P/E shows `—` |
| Supabase unreachable | Top-level error banner |

---

## Deployment

- **Frontend:** Vercel (auto-deploy from git)
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Environment variables needed on Vercel:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Supabase secrets needed:** `FINNHUB_API_KEY`
