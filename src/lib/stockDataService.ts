import { StockData } from '../types'

export async function fetchStockData(
  symbol: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<StockData> {
  const url = `${supabaseUrl}/functions/v1/get-stock-data?symbol=${symbol}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      symbol,
      name: '',
      price: null,
      eps: null,
      pe: null,
      marketCap: null,
      error: data.error ?? 'Failed to fetch data',
    }
  }

  return data as StockData
}
