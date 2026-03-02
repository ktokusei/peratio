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
