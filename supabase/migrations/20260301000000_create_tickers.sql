create table public.tickers (
  id uuid primary key default gen_random_uuid(),
  symbol text unique not null,
  created_at timestamptz default now()
);

alter table public.tickers enable row level security;

create policy "Allow public read" on public.tickers
  for select using (true);

create policy "Allow public insert" on public.tickers
  for insert with check (true);

create policy "Allow public delete" on public.tickers
  for delete using (true);
