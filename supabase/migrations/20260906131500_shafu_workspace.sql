create table if not exists public.shafu_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint shafu_workspaces_data_object check (jsonb_typeof(data) = 'object')
);

create table if not exists public.shafu_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
  episode_id uuid,
  kind text not null check (kind in ('reference', 'completed_video')),
  bucket_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  tag text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists shafu_assets_user_created_idx
  on public.shafu_assets (user_id, created_at desc);
create index if not exists shafu_assets_project_idx
  on public.shafu_assets (project_id) where project_id is not null;

alter table public.shafu_workspaces enable row level security;
alter table public.shafu_assets enable row level security;

drop policy if exists shafu_workspace_select_own on public.shafu_workspaces;
create policy shafu_workspace_select_own on public.shafu_workspaces
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists shafu_workspace_insert_own on public.shafu_workspaces;
create policy shafu_workspace_insert_own on public.shafu_workspaces
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists shafu_workspace_update_own on public.shafu_workspaces;
create policy shafu_workspace_update_own on public.shafu_workspaces
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists shafu_workspace_delete_own on public.shafu_workspaces;
create policy shafu_workspace_delete_own on public.shafu_workspaces
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists shafu_assets_select_own on public.shafu_assets;
create policy shafu_assets_select_own on public.shafu_assets
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists shafu_assets_insert_own on public.shafu_assets;
create policy shafu_assets_insert_own on public.shafu_assets
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists shafu_assets_update_own on public.shafu_assets;
create policy shafu_assets_update_own on public.shafu_assets
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists shafu_assets_delete_own on public.shafu_assets;
create policy shafu_assets_delete_own on public.shafu_assets
  for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.shafu_workspaces to authenticated;
grant select, insert, update, delete on public.shafu_assets to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shafu-media',
  'shafu-media',
  false,
  262144000,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif', 'image/avif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists shafu_media_select_own on storage.objects;
create policy shafu_media_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shafu-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists shafu_media_insert_own on storage.objects;
create policy shafu_media_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shafu-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists shafu_media_update_own on storage.objects;
create policy shafu_media_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shafu-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'shafu-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists shafu_media_delete_own on storage.objects;
create policy shafu_media_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shafu-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
