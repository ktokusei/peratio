# P/E Ratio Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a shared single-page web app that displays P/E ratios and key financials for user-specified NYSE/NASDAQ stocks.

**Architecture:** React + Vite frontend reads a shared ticker list from Supabase PostgreSQL and fetches live stock data via a Supabase Edge Function that proxies Finnhub API calls server-side. No authentication — all visitors share the same watchlist.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Supabase JS client, Supabase Edge Functions (Deno), Finnhub API, Vitest + React Testing Library, Vercel

---

### Task 1: Scaffold project ✅ DONE

---

### Task 2: Install dependencies

**Step 1: Install runtime dependencies**

```bash
npm install @supabase/supabase-js
```

**Step 2: Install and configure Tailwind CSS**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 3: Configure Tailwind content paths**

Edit `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

**Step 4: Add Tailwind directives to `src/index.css`**

Replace the entire contents of `src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 5: Install test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Step 6: Commit**

```bash
git add .
git commit -m "chore: add supabase, tailwind, and test dependencies"
```

---

### Task 3: Configure Vitest

**Files:**
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`

**Step 1: Update `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

**Step 2: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom'
```

**Step 3: Add test script to `package.json`**

In the `scripts` section, ensure this exists:
```json
"test": "vitest"
```

**Step 4: Write a smoke test**

Create `src/test/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('test setup', () => {
  it('works', () => {
    expect(1 + 1).toBe(2)
  })
})
```

**Step 5: Run the test**

```bash
npm test
```
Expected: 1 test passing

**Step 6: Commit**

```bash
git add .
git commit -m "chore: configure vitest with jsdom"
```

---

### Task 4: Set up Supabase client and environment

**Files:**
- Create: `.env.local`
- Create: `.env.example`
- Create: `src/lib/supabase.ts`

**Step 1: Create `.env.local`** (this file is NOT committed to git)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in your Supabase dashboard under **Project Settings → API**.

**Step 2: Create `.env.example`** (committed as a template for other developers)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

**Step 3: Ensure `.env.local` is in `.gitignore`**

The Vite scaffold already adds `.env.local` to `.gitignore`. Verify it's there:
```bash
grep '.env.local' .gitignore
```
Expected: `.env.local` appears in the output. If not, add it manually.

**Step 4: Create `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 5: Commit**

```bash
git add .env.example src/lib/supabase.ts
git commit -m "feat: configure supabase client"
```

---

### Task 5: Create database migration

**Files:**
- Create: `supabase/migrations/20260301000000_create_tickers.sql`

**Step 1: Create the migration file**

```bash
mkdir -p supabase/migrations
```

Create `supabase/migrations/20260301000000_create_tickers.sql`:

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

**Step 2: Run migration in Supabase**

1. Open your Supabase project dashboard at [app.supabase.com](https://app.supabase.com)
2. Go to **SQL Editor** in the left sidebar
3. Paste the entire contents of the migration file above
4. Click **Run**

Expected: "Success. No rows returned"

**Step 3: Verify the table exists**

In the SQL Editor, run:
```sql
select * from public.tickers;
```
Expected: Empty result with columns `id`, `symbol`, `created_at`

**Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add tickers table migration"
```

---

### Task 6: Create ticker service

**Files:**
- Create: `src/lib/tickerService.ts`
- Create: `src/lib/tickerService.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/tickerService.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { getTickers, addTicker, removeTicker } from './tickerService'
import { supabase } from './supabase'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getTickers', () => {
  it('returns list of ticker symbols', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }],
          error: null,
        }),
      }),
    })

    const result = await getTickers()
    expect(result).toEqual(['AAPL', 'MSFT'])
  })

  it('throws on supabase error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        }),
      }),
    })

    await expect(getTickers()).rejects.toThrow('DB error')
  })
})

describe('addTicker', () => {
  it('inserts a normalized uppercase symbol', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: insertMock })

    await addTicker('aapl')
    expect(insertMock).toHaveBeenCalledWith([{ symbol: 'AAPL' }])
  })
})

describe('removeTicker', () => {
  it('deletes by symbol', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ delete: deleteMock })

    await removeTicker('AAPL')
    expect(eqMock).toHaveBeenCalledWith('symbol', 'AAPL')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test tickerService
```
Expected: FAIL — "getTickers is not a function"

**Step 3: Create `src/lib/tickerService.ts`**

```ts
import { supabase } from './supabase'

export async function getTickers(): Promise<string[]> {
  const { data, error } = await supabase
    .from('tickers')
    .select('symbol')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data.map((row: { symbol: string }) => row.symbol)
}

export async function addTicker(symbol: string): Promise<void> {
  const normalized = symbol.trim().toUpperCase()
  const { error } = await supabase
    .from('tickers')
    .insert([{ symbol: normalized }])

  if (error) throw new Error(error.message)
}

export async function removeTicker(symbol: string): Promise<void> {
  const { error } = await supabase
    .from('tickers')
    .delete()
    .eq('symbol', symbol)

  if (error) throw new Error(error.message)
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test tickerService
```
Expected: 4 tests passing

**Step 5: Commit**

```bash
git add src/lib/tickerService.ts src/lib/tickerService.test.ts
git commit -m "feat: add ticker CRUD service"
```

---

### Task 7: Create Supabase Edge Function

**Files:**
- Create: `supabase/functions/get-stock-data/index.ts`

**Step 1: Install the Supabase CLI** (if not already installed)

```bash
brew install supabase/tap/supabase
```

**Step 2: Log in and link to your project**

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref in the Supabase dashboard URL:
`https://app.supabase.com/project/YOUR_PROJECT_REF`

**Step 3: Create the Edge Function file**

```bash
mkdir -p supabase/functions/get-stock-data
```

Create `supabase/functions/get-stock-data/index.ts`:

```ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const symbol = url.searchParams.get('symbol')?.toUpperCase()

  if (!symbol) {
    return new Response(
      JSON.stringify({ error: 'symbol parameter is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const apiKey = Deno.env.get('FINNHUB_API_KEY')
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'FINNHUB_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const base = 'https://finnhub.io/api/v1'

  try {
    const [quoteRes, profileRes, metricsRes] = await Promise.all([
      fetch(`${base}/quote?symbol=${symbol}&token=${apiKey}`),
      fetch(`${base}/stock/profile2?symbol=${symbol}&token=${apiKey}`),
      fetch(`${base}/stock/metric?symbol=${symbol}&metric=all&token=${apiKey}`),
    ])

    const [quote, profile, metricsData] = await Promise.all([
      quoteRes.json(),
      profileRes.json(),
      metricsRes.json(),
    ])

    // Finnhub returns {} for unknown tickers on profile2
    if (!profile.name) {
      return new Response(
        JSON.stringify({ error: 'Ticker not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const metrics = metricsData.metric ?? {}

    return new Response(
      JSON.stringify({
        symbol,
        name: profile.name,
        price: quote.c ?? null,
        eps: metrics.epsTTM ?? null,
        pe: metrics.peBasicExclExtraTTM ?? null,
        marketCap: profile.marketCapitalization
          ? profile.marketCapitalization * 1_000_000
          : null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch stock data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**Step 4: Store your Finnhub API key as a Supabase secret**

```bash
supabase secrets set FINNHUB_API_KEY=your-finnhub-api-key-here
```

**Step 5: Deploy the Edge Function**

```bash
supabase functions deploy get-stock-data
```

Expected output: "Deployed Function get-stock-data"

**Step 6: Verify the function works**

```bash
curl "https://YOUR_PROJECT.supabase.co/functions/v1/get-stock-data?symbol=AAPL" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

Expected: JSON object with `symbol`, `name`, `price`, `eps`, `pe`, `marketCap`

**Step 7: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add get-stock-data edge function"
```

---

### Task 8: Create stock data types and service

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/stockDataService.ts`
- Create: `src/lib/stockDataService.test.ts`

**Step 1: Create `src/types.ts`**

```ts
export interface StockData {
  symbol: string
  name: string
  price: number | null
  eps: number | null
  pe: number | null
  marketCap: number | null
  error?: string
}
```

**Step 2: Write the failing tests**

Create `src/lib/stockDataService.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchStockData } from './stockDataService'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchStockData', () => {
  it('returns stock data for a valid ticker', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 189.3,
        eps: 6.67,
        pe: 28.4,
        marketCap: 2940000000000,
      }),
    })

    const result = await fetchStockData('AAPL', 'https://project.supabase.co', 'anon-key')
    expect(result.name).toBe('Apple Inc.')
    expect(result.pe).toBe(28.4)
  })

  it('returns an error object for an unknown ticker', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Ticker not found' }),
    })

    const result = await fetchStockData('FAKE', 'https://project.supabase.co', 'anon-key')
    expect(result.error).toBe('Ticker not found')
  })

  it('passes through negative EPS without modification', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        symbol: 'LYFT',
        name: 'Lyft Inc.',
        price: 12.40,
        eps: -0.83,
        pe: null,
        marketCap: 5200000000,
      }),
    })

    const result = await fetchStockData('LYFT', 'https://project.supabase.co', 'anon-key')
    expect(result.eps).toBe(-0.83)
    expect(result.pe).toBeNull()
  })
})
```

**Step 3: Run tests to verify they fail**

```bash
npm test stockDataService
```
Expected: FAIL — "fetchStockData is not a function"

**Step 4: Create `src/lib/stockDataService.ts`**

```ts
import { StockData } from '../types'

export async function fetchStockData(
  symbol: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<StockData> {
  const url = `${supabaseUrl}/functions/v1/get-stock-data?symbol=${symbol}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      symbol,
      name: '',
      price: null,
      eps: null,
      pe: null,
      marketCap: null,
      error: data.error ?? 'Failed to fetch data',
    }
  }

  return data as StockData
}
```

**Step 5: Run tests to verify they pass**

```bash
npm test stockDataService
```
Expected: 3 tests passing

**Step 6: Commit**

```bash
git add src/types.ts src/lib/stockDataService.ts src/lib/stockDataService.test.ts
git commit -m "feat: add stock data service"
```

---

### Task 9: Build the useSort hook

**Files:**
- Create: `src/hooks/useSort.ts`
- Create: `src/hooks/useSort.test.ts`

**Step 1: Write the failing tests**

Create `src/hooks/useSort.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useSort } from './useSort'
import { StockData } from '../types'

const stocks: StockData[] = [
  { symbol: 'MSFT', name: 'Microsoft', price: 415.20, eps: 12.17, pe: 34.1, marketCap: 3080000000000 },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 189.30, eps: 6.67, pe: 28.4, marketCap: 2940000000000 },
  { symbol: 'LYFT', name: 'Lyft Inc.', price: 12.40, eps: -0.83, pe: null, marketCap: 5200000000 },
]

describe('useSort', () => {
  it('returns data unsorted by default', () => {
    const { result } = renderHook(() => useSort(stocks))
    expect(result.current.sorted[0].symbol).toBe('MSFT')
  })

  it('sorts by symbol ascending on first click', () => {
    const { result } = renderHook(() => useSort(stocks))
    act(() => result.current.toggleSort('symbol'))
    expect(result.current.sorted[0].symbol).toBe('AAPL')
    expect(result.current.sorted[2].symbol).toBe('MSFT')
  })

  it('sorts by symbol descending on second click', () => {
    const { result } = renderHook(() => useSort(stocks))
    act(() => result.current.toggleSort('symbol'))
    act(() => result.current.toggleSort('symbol'))
    expect(result.current.sorted[0].symbol).toBe('MSFT')
    expect(result.current.sortDir).toBe('desc')
  })

  it('sorts by pe ascending, placing nulls last', () => {
    const { result } = renderHook(() => useSort(stocks))
    act(() => result.current.toggleSort('pe'))
    expect(result.current.sorted[0].pe).toBe(28.4)
    expect(result.current.sorted[2].pe).toBeNull()
  })

  it('tracks the active sort column and direction', () => {
    const { result } = renderHook(() => useSort(stocks))
    act(() => result.current.toggleSort('price'))
    expect(result.current.sortKey).toBe('price')
    expect(result.current.sortDir).toBe('asc')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test useSort
```
Expected: FAIL — "useSort is not a function"

**Step 3: Create `src/hooks/useSort.ts`**

```ts
import { useState, useMemo } from 'react'
import { StockData } from '../types'

type SortKey = keyof StockData
type SortDir = 'asc' | 'desc'

export function useSort(data: StockData[]) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      // Nulls always go last regardless of sort direction
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1

      let cmp: number
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal)
      } else {
        cmp = (aVal as number) - (bVal as number)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  return { sorted, sortKey, sortDir, toggleSort }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test useSort
```
Expected: 5 tests passing

**Step 5: Commit**

```bash
git add src/hooks/useSort.ts src/hooks/useSort.test.ts
git commit -m "feat: add useSort hook with null-last sorting"
```

---

### Task 10: Build the StockTable component

**Files:**
- Create: `src/components/StockTable.tsx`
- Create: `src/components/StockTable.test.tsx`

**Step 1: Write the failing tests**

Create `src/components/StockTable.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StockTable } from './StockTable'
import { StockData } from '../types'

const mockStocks: StockData[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 189.30, eps: 6.67, pe: 28.4, marketCap: 2940000000000 },
  { symbol: 'LYFT', name: 'Lyft Inc.', price: 12.40, eps: -0.83, pe: null, marketCap: 5200000000 },
]

const defaultProps = {
  stocks: mockStocks,
  onRemove: vi.fn(),
  sortKey: null,
  sortDir: 'asc' as const,
  onSort: vi.fn(),
}

describe('StockTable', () => {
  it('renders company names and tickers', () => {
    render(<StockTable {...defaultProps} />)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(screen.getByText('LYFT')).toBeInTheDocument()
  })

  it('shows — for a null P/E ratio', () => {
    render(<StockTable {...defaultProps} />)
    // LYFT has null pe
    const cells = screen.getAllByText('—')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('calls onRemove with the correct symbol when delete is clicked', () => {
    const onRemove = vi.fn()
    render(<StockTable {...defaultProps} onRemove={onRemove} />)
    const deleteButtons = screen.getAllByRole('button', { name: /remove/i })
    deleteButtons[0].click()
    expect(onRemove).toHaveBeenCalledWith('AAPL')
  })

  it('shows an up arrow on the active sort column', () => {
    render(<StockTable {...defaultProps} sortKey="symbol" sortDir="asc" />)
    expect(screen.getByText(/Ticker/)).toHaveTextContent('↑')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test StockTable
```
Expected: FAIL — "Cannot find module"

**Step 3: Create `src/components/StockTable.tsx`**

```tsx
import { StockData } from '../types'

type SortKey = keyof StockData
type SortDir = 'asc' | 'desc'

function formatPrice(value: number | null): string {
  if (value === null) return '—'
  return `$${value.toFixed(2)}`
}

function formatMarketCap(value: number | null): string {
  if (value === null) return '—'
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  return `$${value.toFixed(0)}`
}

function formatPE(value: number | null): string {
  if (value === null) return '—'
  return value.toFixed(1)
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  align = 'left',
}: {
  label: string
  column: SortKey
  sortKey: SortKey | null
  sortDir: SortDir
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const isActive = sortKey === column
  return (
    <th
      className={`px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900 ${align === 'right' ? 'text-right' : ''}`}
      onClick={() => onSort(column)}
    >
      {label}{' '}
      {isActive
        ? sortDir === 'asc' ? '↑' : '↓'
        : <span className="text-gray-300">↕</span>}
    </th>
  )
}

interface StockTableProps {
  stocks: StockData[]
  onRemove: (symbol: string) => void
  sortKey: SortKey | null
  sortDir: SortDir
  onSort: (key: SortKey) => void
}

export function StockTable({ stocks, onRemove, sortKey, sortDir, onSort }: StockTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <SortHeader label="Ticker" column="symbol" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="Company" column="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="P/E" column="pe" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
            <SortHeader label="Price" column="price" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
            <SortHeader label="EPS (TTM)" column="eps" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
            <SortHeader label="Market Cap" column="marketCap" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => (
            <tr key={stock.symbol} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 font-mono font-semibold">{stock.symbol}</td>
              <td className="px-4 py-3 text-gray-700">{stock.name || '—'}</td>
              <td className="px-4 py-3 text-right">{formatPE(stock.pe)}</td>
              <td className="px-4 py-3 text-right">{formatPrice(stock.price)}</td>
              <td className={`px-4 py-3 text-right ${stock.eps !== null && stock.eps < 0 ? 'text-red-600 font-medium' : ''}`}>
                {stock.eps !== null ? formatPrice(stock.eps) : '—'}
              </td>
              <td className="px-4 py-3 text-right">{formatMarketCap(stock.marketCap)}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onRemove(stock.symbol)}
                  aria-label={`Remove ${stock.symbol}`}
                  className="text-gray-300 hover:text-red-500 transition-colors text-base"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test StockTable
```
Expected: 4 tests passing

**Step 5: Commit**

```bash
git add src/components/StockTable.tsx src/components/StockTable.test.tsx
git commit -m "feat: add sortable stock table component"
```

---

### Task 11: Build the AddTickerForm component

**Files:**
- Create: `src/components/AddTickerForm.tsx`
- Create: `src/components/AddTickerForm.test.tsx`

**Step 1: Write the failing tests**

Create `src/components/AddTickerForm.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddTickerForm } from './AddTickerForm'

describe('AddTickerForm', () => {
  it('calls onAdd with an uppercase trimmed symbol on submit', () => {
    const onAdd = vi.fn()
    render(<AddTickerForm onAdd={onAdd} existingTickers={[]} />)
    const input = screen.getByPlaceholderText(/e\.g\. AAPL/i)
    fireEvent.change(input, { target: { value: ' aapl ' } })
    fireEvent.submit(input.closest('form')!)
    expect(onAdd).toHaveBeenCalledWith('AAPL')
  })

  it('shows an error for a duplicate ticker without calling onAdd', () => {
    const onAdd = vi.fn()
    render(<AddTickerForm onAdd={onAdd} existingTickers={['AAPL']} />)
    const input = screen.getByPlaceholderText(/e\.g\. AAPL/i)
    fireEvent.change(input, { target: { value: 'AAPL' } })
    fireEvent.submit(input.closest('form')!)
    expect(screen.getByText(/already in your list/i)).toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('clears the input after a successful add', () => {
    const onAdd = vi.fn()
    render(<AddTickerForm onAdd={onAdd} existingTickers={[]} />)
    const input = screen.getByPlaceholderText(/e\.g\. AAPL/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'GOOG' } })
    fireEvent.submit(input.closest('form')!)
    expect(input.value).toBe('')
  })

  it('does not submit when input is empty', () => {
    const onAdd = vi.fn()
    render(<AddTickerForm onAdd={onAdd} existingTickers={[]} />)
    const input = screen.getByPlaceholderText(/e\.g\. AAPL/i)
    fireEvent.submit(input.closest('form')!)
    expect(onAdd).not.toHaveBeenCalled()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test AddTickerForm
```
Expected: FAIL — "Cannot find module"

**Step 3: Create `src/components/AddTickerForm.tsx`**

```tsx
import { useState } from 'react'

interface AddTickerFormProps {
  onAdd: (symbol: string) => void
  existingTickers: string[]
  isLoading?: boolean
}

export function AddTickerForm({ onAdd, existingTickers, isLoading }: AddTickerFormProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const symbol = value.trim().toUpperCase()
    if (!symbol) return

    if (existingTickers.includes(symbol)) {
      setError('Already in your list')
      return
    }

    setError(null)
    setValue('')
    onAdd(symbol)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start">
      <div className="flex flex-col gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          placeholder="e.g. AAPL"
          maxLength={10}
          className="border border-gray-300 rounded px-3 py-2 text-sm w-40 uppercase focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {error && <span className="text-red-500 text-xs">{error}</span>}
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isLoading ? 'Adding...' : 'Add Company'}
      </button>
    </form>
  )
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test AddTickerForm
```
Expected: 4 tests passing

**Step 5: Commit**

```bash
git add src/components/AddTickerForm.tsx src/components/AddTickerForm.test.tsx
git commit -m "feat: add ticker input form component"
```

---

### Task 12: Wire everything together in App.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Step 1: Clear `src/App.css`**

Replace the entire contents of `src/App.css` with an empty file (delete all default Vite styles).

**Step 2: Replace `src/App.tsx` entirely**

```tsx
import { useEffect, useState, useCallback } from 'react'
import { StockTable } from './components/StockTable'
import { AddTickerForm } from './components/AddTickerForm'
import { getTickers, addTicker, removeTicker } from './lib/tickerService'
import { fetchStockData } from './lib/stockDataService'
import { useSort } from './hooks/useSort'
import { StockData } from './types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export default function App() {
  const [stocks, setStocks] = useState<StockData[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const { sorted, sortKey, sortDir, toggleSort } = useSort(stocks)

  const loadAllStocks = useCallback(async () => {
    setLoadError(null)
    try {
      const symbols = await getTickers()
      // Show placeholders immediately while data loads
      setStocks(symbols.map((symbol) => ({
        symbol,
        name: '',
        price: null,
        eps: null,
        pe: null,
        marketCap: null,
      })))
      const results = await Promise.all(
        symbols.map((symbol) => fetchStockData(symbol, SUPABASE_URL, SUPABASE_ANON_KEY))
      )
      setStocks(results)
    } catch {
      setLoadError('Unable to load ticker list. Please refresh the page.')
    }
  }, [])

  useEffect(() => {
    loadAllStocks()
  }, [loadAllStocks])

  async function handleAdd(symbol: string) {
    setIsAdding(true)
    setAddError(null)

    // Validate ticker exists via Edge Function before inserting
    const data = await fetchStockData(symbol, SUPABASE_URL, SUPABASE_ANON_KEY)
    if (data.error) {
      setAddError(data.error === 'Ticker not found' ? 'Ticker not found' : 'Failed to fetch data')
      setIsAdding(false)
      return
    }

    try {
      await addTicker(symbol)
      setStocks((prev) => [...prev, data])
    } catch {
      setAddError('Failed to add ticker. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemove(symbol: string) {
    // Optimistic update: remove immediately from UI
    setStocks((prev) => prev.filter((s) => s.symbol !== symbol))
    try {
      await removeTicker(symbol)
    } catch {
      // Revert if the delete failed
      loadAllStocks()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Peratio</h1>
          <p className="text-gray-500 text-sm mt-1">P/E Ratio Tracker</p>
        </header>

        {loadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {loadError}
          </div>
        )}

        <div className="mb-6">
          <AddTickerForm
            onAdd={handleAdd}
            existingTickers={stocks.map((s) => s.symbol)}
            isLoading={isAdding}
          />
          {addError && (
            <p className="mt-2 text-red-500 text-sm">{addError}</p>
          )}
        </div>

        {stocks.length === 0 && !loadError ? (
          <p className="text-gray-400 text-sm">
            No companies added yet. Enter a ticker symbol above to get started.
          </p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <StockTable
              stocks={sorted}
              onRemove={handleRemove}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Run all tests to make sure nothing is broken**

```bash
npm test
```
Expected: All tests passing

**Step 4: Start the dev server and do a manual end-to-end check**

```bash
npm run dev
```

Open `http://localhost:5173` and verify:
- [ ] Page loads with "Peratio" header
- [ ] Add `AAPL` → appears in table with real data (name, price, P/E, EPS, market cap)
- [ ] Add `LYFT` → appears with red negative EPS and `—` for P/E
- [ ] Add `FAKE` → shows "Ticker not found" error
- [ ] Add `AAPL` again → shows "Already in your list"
- [ ] Click **Ticker** column header → rows sort A→Z; click again → Z→A
- [ ] Click **P/E** column header → sorts low→high; nulls go to bottom
- [ ] Click **✕** on a row → row disappears immediately

**Step 5: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "feat: wire app together with all components and services"
```

---

### Task 13: Configure and deploy to Vercel

**Files:**
- Create: `vercel.json`

**Step 1: Create `vercel.json`**

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

**Step 2: Run a production build to confirm it compiles**

```bash
npm run build
```
Expected: `dist/` directory created with no TypeScript errors

**Step 3: Push to GitHub**

Create a new repository at [github.com/new](https://github.com/new), then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/peratio.git
git push -u origin main
```

**Step 4: Deploy to Vercel**

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your `peratio` GitHub repository
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key
4. Click **Deploy**

**Step 5: Verify the live deployment**

Visit your Vercel URL and repeat the manual checks from Task 12 Step 4.

**Step 6: Commit**

```bash
git add vercel.json
git commit -m "chore: add vercel deployment config"
git push
```

---

## Summary

| Task | What's Built |
|---|---|
| 1–3 | Project scaffolded, dependencies installed, Vitest configured |
| 4–5 | Supabase client + `tickers` table created |
| 6 | Edge Function proxying Finnhub (key secured server-side) |
| 7–8 | Service layer: ticker CRUD + stock data fetching |
| 9 | `useSort` hook with null-last sorting |
| 10–11 | `StockTable` + `AddTickerForm` UI components |
| 12 | App wired together, full end-to-end working |
| 13 | Deployed to Vercel |
