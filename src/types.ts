export interface StockData {
  symbol: string
  name: string
  price: number | null
  eps: number | null
  pe: number | null
  marketCap: number | null
  error?: string
}

export type SortableKey = Exclude<keyof StockData, 'error'>
export type SortKey = SortableKey
export type SortDir = 'asc' | 'desc'
