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
