-- Make tickers Data API access explicit, not reliant on Supabase's default auto-grants.
-- Supabase is removing the auto-expose-new-tables default (rollout through 2026-10-30,
-- see github.com/orgs/supabase/discussions/45329). Without explicit GRANTs here, fresh
-- environments built from these migrations after the rollout would return
-- "permission denied for table tickers" via PostgREST.
grant select, insert, delete on public.tickers to anon, authenticated;
