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
    expect(mockFrom).toHaveBeenCalledWith('tickers')
    expect(insertMock).toHaveBeenCalledWith([{ symbol: 'AAPL' }])
  })

  it('throws on supabase error', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } })
    mockFrom.mockReturnValue({ insert: insertMock })

    await expect(addTicker('AAPL')).rejects.toThrow('Insert failed')
  })
})

describe('removeTicker', () => {
  it('deletes by symbol', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ delete: deleteMock })

    await removeTicker('AAPL')
    expect(mockFrom).toHaveBeenCalledWith('tickers')
    expect(eqMock).toHaveBeenCalledWith('symbol', 'AAPL')
  })

  it('throws on supabase error', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ delete: deleteMock })

    await expect(removeTicker('AAPL')).rejects.toThrow('Delete failed')
  })
})
