import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StockTable } from './StockTable'
import type { StockData } from '../types'

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
