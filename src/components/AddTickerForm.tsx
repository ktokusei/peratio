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
