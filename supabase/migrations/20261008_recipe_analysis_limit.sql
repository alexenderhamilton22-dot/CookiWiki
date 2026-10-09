-- À exécuter sur le projet Supabase CookiWiki, une fois avant le déploiement.
-- Limite par compte : 3 analyses/minute et 10 analyses/heure.
-- Aucune modification des recettes, commentaires ou profils existants.
begin;
create table if not exists public.recipe_analysis_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  minute_start timestamptz not null,
  minute_count integer not null default 0,
  hour_start timestamptz not null,
  hour_count integer not null default 0
);
alter table public.recipe_analysis_usage enable row level security;
revoke all on public.recipe_analysis_usage from public, anon, authenticated;

create or replace function public.consume_recipe_analysis()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  account uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  minute_at timestamptz := date_trunc('minute', now_at);
  hour_at timestamptz := date_trunc('hour', now_at);
  usage public.recipe_analysis_usage%rowtype;
begin
  if account is null then return false; end if;
  -- Serialize checks and increments for this account, even across server instances.
  perform pg_advisory_xact_lock(hashtextextended(account::text, 0));
  insert into public.recipe_analysis_usage(user_id, minute_start, hour_start)
  values (account, minute_at, hour_at) on conflict (user_id) do nothing;
  select * into usage from public.recipe_analysis_usage where user_id = account;
  if usage.minute_start <> minute_at then usage.minute_count := 0; end if;
  if usage.hour_start <> hour_at then usage.hour_count := 0; end if;
  if usage.minute_count >= 3 or usage.hour_count >= 10 then return false; end if;
  update public.recipe_analysis_usage set
    minute_start = minute_at, minute_count = usage.minute_count + 1,
    hour_start = hour_at, hour_count = usage.hour_count + 1
  where user_id = account;
  return true;
end;
$$;
revoke all on function public.consume_recipe_analysis() from public, anon;
grant execute on function public.consume_recipe_analysis() to authenticated;
commit;
