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
