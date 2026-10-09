begin;

-- Personal bookmarks are isolated by account; recipes remain public and shared.
create table if not exists public.recipe_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  is_favorite boolean not null default false,
  last_viewed_at timestamptz,
  primary key (user_id, recipe_id)
);
alter table public.recipe_bookmarks enable row level security;
drop policy if exists own_bookmarks on public.recipe_bookmarks;
create policy own_bookmarks on public.recipe_bookmarks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.recipe_bookmarks from anon;
grant select, insert, update, delete on public.recipe_bookmarks to authenticated;

create or replace function public.set_recipe_favorite(target_recipe uuid, favorite boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.recipe_bookmarks(user_id, recipe_id, is_favorite)
    values(auth.uid(), target_recipe, favorite)
    on conflict(user_id, recipe_id) do update set is_favorite = excluded.is_favorite;
end;
$$;
create or replace function public.record_recipe_view(target_recipe uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.recipe_bookmarks(user_id, recipe_id, last_viewed_at)
    values(auth.uid(), target_recipe, now())
    on conflict(user_id, recipe_id) do update set last_viewed_at = excluded.last_viewed_at;
end;
$$;

-- No FK to recipes: deleted recipes must keep their snapshots.
create table if not exists public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null,
  event text not null check (event in ('update', 'delete')),
  snapshot jsonb not null,
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists recipe_versions_recipe_date on public.recipe_versions(recipe_id, created_at desc);
alter table public.recipe_versions enable row level security;
drop policy if exists read_recipe_versions on public.recipe_versions;
create policy read_recipe_versions on public.recipe_versions for select to authenticated using (true);
revoke all on public.recipe_versions from anon, authenticated;
grant select on public.recipe_versions to authenticated;

-- The trigger may archive rows; clients cannot forge or modify snapshots.
create or replace function public.capture_recipe_version()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' or to_jsonb(old) is distinct from to_jsonb(new) then
    insert into public.recipe_versions(recipe_id, event, snapshot, actor_id)
      values(old.id, lower(tg_op), to_jsonb(old), auth.uid());
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.capture_recipe_version() from public, anon, authenticated;
drop trigger if exists archive_recipe_changes on public.recipes;
create trigger archive_recipe_changes before update or delete on public.recipes
  for each row execute function public.capture_recipe_version();

-- Invoker functions preserve the existing recipes RLS permissions.
create or replace function public.trash_recipe(target_recipe uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare deleted_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.recipes where id = target_recipe returning id into deleted_id;
  if deleted_id is null then raise exception 'Recipe unavailable or forbidden'; end if;
  return deleted_id;
end;
$$;
create or replace function public.restore_recipe_version(version_id uuid, expected_updated_at timestamptz default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved public.recipe_versions%rowtype; original public.recipes%rowtype; restored_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into saved from public.recipe_versions where id = version_id;
  if not found then raise exception 'Version unavailable'; end if;
  original := jsonb_populate_record(null::public.recipes, saved.snapshot);
  original.updated_at := now();
  original.last_modified_by := auth.uid();
  if saved.event = 'delete' then
    -- A duplicate ID fails instead of overwriting a recipe restored by someone else.
    insert into public.recipes select (original).* returning id into restored_id;
  else
    if expected_updated_at is null then raise exception 'Current version required'; end if;
    update public.recipes set
      title = original.title, description = original.description,
      ingredients = original.ingredients, instructions = original.instructions,
      prep_time = original.prep_time, cook_time = original.cook_time,
      servings = original.servings, difficulty = original.difficulty,
      tags = original.tags, image_url = original.image_url,
      updated_at = original.updated_at, last_modified_by = original.last_modified_by
      where id = saved.recipe_id and updated_at = expected_updated_at
      returning id into restored_id;
    if restored_id is null then raise exception 'Recipe changed or restoration forbidden'; end if;
  end if;
  return restored_id;
end;
$$;

revoke all on function public.set_recipe_favorite(uuid, boolean), public.record_recipe_view(uuid),
  public.trash_recipe(uuid), public.restore_recipe_version(uuid, timestamptz) from public, anon;
grant execute on function public.set_recipe_favorite(uuid, boolean), public.record_recipe_view(uuid),
  public.trash_recipe(uuid), public.restore_recipe_version(uuid, timestamptz) to authenticated;
commit;
