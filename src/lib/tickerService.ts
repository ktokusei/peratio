import { supabase } from './supabase'

export async function getTickers(): Promise<string[]> {
  const { data, error } = await supabase
    .from('tickers')
    .select('symbol')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data.map((row: { symbol: string }) => row.symbol)
}

export async function addTicker(symbol: string): Promise<void> {
  const normalized = symbol.trim().toUpperCase()
  const { error } = await supabase
    .from('tickers')
    .insert([{ symbol: normalized }])

  if (error) throw new Error(error.message)
}

export async function removeTicker(symbol: string): Promise<void> {
  const { error } = await supabase
    .from('tickers')
    .delete()
    .eq('symbol', symbol)

  if (error) throw new Error(error.message)
}
