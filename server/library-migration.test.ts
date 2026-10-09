// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
let db: PGlite;
const userA = '11111111-1111-4111-8111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';
const recipeId = '33333333-3333-4333-8333-333333333333';
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    insert into auth.users values ('${userA}'), ('${userB}');
    create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table public.recipes(
      id uuid primary key, title text not null, description text, ingredients jsonb not null default '[]',
      instructions text not null default '', prep_time integer default 0, cook_time integer default 0,
      servings integer default 4, difficulty text, tags text[] default '{}', image_url text,
      created_at timestamptz default now(), updated_at timestamptz default now(), last_modified_by uuid
    );
    alter table public.recipes enable row level security;
    create policy public_read on public.recipes for select using(true);
    create policy collaborative_write on public.recipes for all to authenticated using(true) with check(true);
    grant select on public.recipes to anon, authenticated;
    grant insert, update, delete on public.recipes to authenticated;
    insert into recipes(id,title,instructions) values('${recipeId}', 'Soupe originale', '1. Cuire.');
  `);
  const migration = await readFile('supabase/migrations/20261009_recipe_library.sql', 'utf8');
  await db.exec(migration);
  await db.exec(migration); // Applying the migration twice must remain safe.
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${userA}',false);`);
}, 30000);
afterAll(async () => { await db?.close(); });
describe('Migration bibliothèque dans PostgreSQL local', () => {
  it('conserve le favori pendant la consultation et la consultation pendant le retrait', async () => {
    await db.query('select public.set_recipe_favorite($1,true)', [recipeId]);
    await db.query('select public.record_recipe_view($1)', [recipeId]);
    const first = await db.query<{ is_favorite: boolean; last_viewed_at: string }>('select * from recipe_bookmarks');
    expect(first.rows[0].is_favorite).toBe(true); expect(first.rows[0].last_viewed_at).toBeTruthy();
    await db.query('select public.set_recipe_favorite($1,false)', [recipeId]);
    const next = await db.query<{ is_favorite: boolean; last_viewed_at: string }>('select * from recipe_bookmarks');
    expect(next.rows[0].is_favorite).toBe(false); expect(next.rows[0].last_viewed_at).toBeTruthy();
  });
  it('isole les favoris entre deux comptes', async () => {
    await db.exec(`select set_config('request.jwt.claim.sub','${userB}',false);`);
    expect((await db.query('select * from recipe_bookmarks')).rows).toHaveLength(0);
    await expect(db.query('insert into recipe_bookmarks(user_id,recipe_id) values($1,$2)', [userA, recipeId])).rejects.toThrow();
    await db.exec(`select set_config('request.jwt.claim.sub','${userA}',false);`);
  });
  it('archive une modification, refuse les snapshots forgés et restaure sans changer l’ID', async () => {
    await db.query('update recipes set title=$1, updated_at=now() where id=$2', ['Soupe modifiée', recipeId]);
    const versions = await db.query<{ id: string; snapshot: { title: string } }>('select * from recipe_versions');
    expect(versions.rows[0].snapshot.title).toBe('Soupe originale');
    await expect(db.exec(`insert into recipe_versions(recipe_id,event,snapshot) values('${recipeId}','delete','{}');`)).rejects.toThrow();
    const current = await db.query<{ updated_at: string }>('select updated_at from recipes where id=$1', [recipeId]);
    await expect(db.query('select restore_recipe_version($1,$2)', [versions.rows[0].id, '2000-01-01'])).rejects.toThrow();
    await db.query('select restore_recipe_version($1,$2)', [versions.rows[0].id, current.rows[0].updated_at]);
    expect((await db.query<{ title: string }>('select title from recipes where id=$1', [recipeId])).rows[0].title).toBe('Soupe originale');
  });
  it('archive une suppression, restaure la recette et refuse une seconde restauration', async () => {
    await db.query('select trash_recipe($1)', [recipeId]);
    expect((await db.query('select * from recipes')).rows).toHaveLength(0);
    const archived = await db.query<{ id: string }>("select id from recipe_versions where event='delete'");
    await db.query('select restore_recipe_version($1)', [archived.rows[0].id]);
    expect((await db.query<{ id: string }>('select * from recipes')).rows[0].id).toBe(recipeId);
    await expect(db.query('select restore_recipe_version($1)', [archived.rows[0].id])).rejects.toThrow();
  });
  it('respecte un refus d’écriture de la RLS existante', async () => {
    await db.exec('reset role; drop policy collaborative_write on recipes; set role authenticated;');
    await expect(db.query('select trash_recipe($1)', [recipeId])).rejects.toThrow();
    expect((await db.query('select * from recipes')).rows).toHaveLength(1);
  });
  it('interdit les archives et les favoris au visiteur anonyme', async () => {
    await db.exec("reset role; set role anon; select set_config('request.jwt.claim.sub','',false);");
    await expect(db.query('select * from recipe_versions')).rejects.toThrow();
    await expect(db.query('select set_recipe_favorite($1,true)', [recipeId])).rejects.toThrow();
  });
});
