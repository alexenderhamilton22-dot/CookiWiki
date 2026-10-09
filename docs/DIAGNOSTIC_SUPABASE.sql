-- Diagnostic de structure et droits uniquement : aucune écriture.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('recipes', 'comments', 'profiles', 'recipe_bookmarks', 'recipe_versions')
order by table_name, ordinal_position;

select c.conrelid::regclass as table_name, c.conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.conrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace
and relname in ('recipes', 'comments', 'profiles', 'recipe_bookmarks', 'recipe_versions'));

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in ('recipes', 'comments', 'profiles', 'recipe_bookmarks', 'recipe_versions'))
or (schemaname = 'storage' and tablename = 'objects');

select relname, relrowsecurity, relforcerowsecurity
from pg_class where relnamespace = 'public'::regnamespace
and relname in ('recipes', 'comments', 'profiles', 'recipe_bookmarks', 'recipe_versions');

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('recipes', 'comments', 'profiles', 'recipe_bookmarks', 'recipe_versions')
and grantee in ('anon', 'authenticated');

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'recipe-photos';
