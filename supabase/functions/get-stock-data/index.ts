import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

Deno.serve(async (req: Request) => {
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Check cache
  const { data: cached } = await supabase
    .from('stock_cache')
    .select('data, fetched_at')
    .eq('symbol', symbol)
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime()
    if (age < CACHE_TTL_MS) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // Fetch fresh from Finnhub
  const base = 'https://finnhub.io/api/v1'
  const encodedSymbol = encodeURIComponent(symbol)

  try {
    const [quoteRes, profileRes, metricsRes] = await Promise.all([
      fetch(`${base}/quote?symbol=${encodedSymbol}&token=${apiKey}`),
      fetch(`${base}/stock/profile2?symbol=${encodedSymbol}&token=${apiKey}`),
      fetch(`${base}/stock/metric?symbol=${encodedSymbol}&metric=all&token=${apiKey}`),
    ])

    if (!quoteRes.ok || !profileRes.ok || !metricsRes.ok) {
      const status = [quoteRes, profileRes, metricsRes].find(r => !r.ok)!.status
      const errorMsg = status === 429
        ? 'Finnhub rate limit reached. Please wait and try again.'
        : `Finnhub API error (HTTP ${status})`
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const [quote, profile, metricsData] = await Promise.all([
      quoteRes.json(),
      profileRes.json(),
      metricsRes.json(),
    ])

    if (!profile.name) {
      return new Response(
        JSON.stringify({ error: 'Ticker not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const metrics = metricsData.metric ?? {}
    const result = {
      symbol,
      name: profile.name,
      price: quote.c ?? null,
      eps: metrics.epsTTM ?? null,
      pe: metrics.peBasicExclExtraTTM ?? null,
      marketCap: profile.marketCapitalization
        ? profile.marketCapitalization * 1_000_000
        : null,
    }

    // Upsert to cache
    await supabase
      .from('stock_cache')
      .upsert({ symbol, data: result, fetched_at: new Date().toISOString() })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[get-stock-data] upstream fetch failed:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch stock data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
