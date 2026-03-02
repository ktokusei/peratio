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
    expect(result).toEqual({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 189.3,
      eps: 6.67,
      pe: 28.4,
      marketCap: 2940000000000,
    })
  })

  it('returns an error object for an unknown ticker', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Ticker not found' }),
    })

    const result = await fetchStockData('FAKE', 'https://project.supabase.co', 'anon-key')
    expect(result).toEqual({
      symbol: 'FAKE',
      name: '',
      price: null,
      eps: null,
      pe: null,
      marketCap: null,
      error: 'Ticker not found',
    })
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

  it('returns an error object when fetch throws a network error', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    const result = await fetchStockData('AAPL', 'https://project.supabase.co', 'anon-key')
    expect(result.error).toBe('Failed to fetch data')
  })
})
