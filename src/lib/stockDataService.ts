import { StockData } from '../types'

export async function fetchStockData(
  symbol: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<StockData> {
  const url = `${supabaseUrl}/functions/v1/get-stock-data?symbol=${encodeURIComponent(symbol)}`

  let response: Response
  let data: Record<string, unknown>
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    })
    data = await response.json()
  } catch {
    return {
      symbol,
      name: '',
      price: null,
      eps: null,
      pe: null,
      marketCap: null,
      error: 'Failed to fetch data',
    }
  }

  if (!response.ok) {
    return {
      symbol,
      name: '',
      price: null,
      eps: null,
      pe: null,
      marketCap: null,
      error: (data.error as string) ?? 'Failed to fetch data',
    }
  }

  return data as StockData
}
