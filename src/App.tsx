import { useEffect, useState, useCallback } from 'react'
import { StockTable } from './components/StockTable'
import { AddTickerForm } from './components/AddTickerForm'
import { getTickers, addTicker, removeTicker } from './lib/tickerService'
import { fetchStockData } from './lib/stockDataService'
import { useSort } from './hooks/useSort'
import type { StockData } from './types'

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

    try {
      const data = await fetchStockData(symbol, SUPABASE_URL, SUPABASE_ANON_KEY)
      if (data.error) {
        setAddError(data.error === 'Ticker not found' ? 'Ticker not found' : 'Failed to fetch data')
        return
      }

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Peratio</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">P/E Ratio Tracker</p>
        </header>

        {loadError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
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
            <p className="mt-2 text-red-500 dark:text-red-400 text-sm">{addError}</p>
          )}
        </div>

        {stocks.length === 0 && !loadError ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            No companies added yet. Enter a ticker symbol above to get started.
          </p>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
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
