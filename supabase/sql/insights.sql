-- WS studio Insights schema, reconciled from the installed database.
-- Requires existing ws_visits / ws_events tables from this repository's original setup.
begin;
create extension if not exists supabase_vault with schema vault;
create schema if not exists ws_insights_private;
revoke all on schema ws_insights_private from public, anon, authenticated;
grant usage on schema ws_insights_private to service_role;
create table if not exists public.ws_activity (id uuid not null, occurred_at timestamp with time zone default now() not null, visitor_id text not null, session_id text not null, site text not null, path text not null, kind text not null, value text, target text, referrer text, source text default 'direct'::text not null, medium text, campaign text, content text, device text default 'unknown'::text not null);
create table if not exists public.ws_insights_owners (user_id uuid not null);
create table if not exists public.ws_shop_snapshots (day date not null, visits bigint, orders bigint, revenue numeric(14,2), note text default ''::text not null, updated_at timestamp with time zone default now() not null);
create table if not exists public.ws_social_accounts (channel text not null, label text not null, handle text not null, profile_url text not null, auto_enabled boolean default false not null, status text default 'manual'::text not null, last_attempt_at timestamp with time zone, last_success_at timestamp with time zone, last_error text, account_id text, sort_order integer default 0 not null);
create table if not exists public.ws_social_snapshots (id uuid default gen_random_uuid() not null, channel text not null, day date not null, followers bigint, reach bigint, reactions bigint, period_start date, period_end date, source text not null, observed_at timestamp with time zone default now() not null, note text default ''::text not null);
create table if not exists public.ws_sync_runs (id uuid default gen_random_uuid() not null, started_at timestamp with time zone default now() not null, finished_at timestamp with time zone, status text default 'running'::text not null, result jsonb default '{}'::jsonb not null);
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_campaign_check' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_campaign_check" CHECK ((length(campaign) <= 200)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_content_check' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_content_check" CHECK ((length(content) <= 200)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_device_check' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_device_check" CHECK ((device = ANY (ARRAY['mobile'::text, 'tablet'::text, 'desktop'::text, 'unknown'::text]))); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_kind_check' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_kind_check" CHECK ((kind = ANY (ARRAY['pageview'::text, 'outbound_click'::text, 'internal_click'::text, 'gallery_open'::text, 'music_play'::text, 'contact_sent'::text]))); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_medium_check' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_medium_check" CHECK ((length(medium) <= 100)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_path_check' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_path_check" CHECK ((((length(path) >= 1) AND (length(path) <= 500)) AND (path ~~ '/%'::text))); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_pkey' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_pkey" PRIMARY KEY (id); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_referrer_check' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_referrer_check" CHECK ((length(referrer) <= 500)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_session_id_check' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_session_id_check" CHECK (((length(session_id) >= 8) AND (length(session_id) <= 128))); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_site_check' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_site_check" CHECK ((site = ANY (ARRAY['official'::text, 'workspace'::text, 'hub'::text, 'album'::text, 'base'::text, 'social'::text]))); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_source_check' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_source_check" CHECK ((length(source) <= 100)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_target_check' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_target_check" CHECK ((length(target) <= 1000)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_value_check' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_value_check" CHECK ((length(value) <= 500)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_activity_visitor_id_check' and conrelid='public.ws_activity'::regclass) then alter table public.ws_activity add constraint "ws_activity_visitor_id_check" CHECK (((length(visitor_id) >= 8) AND (length(visitor_id) <= 128))); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_insights_owners_pkey' and conrelid='public.ws_insights_owners'::regclass) then alter table public.ws_insights_owners add constraint "ws_insights_owners_pkey" PRIMARY KEY (user_id); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_shop_snapshots_check' and conrelid='public.ws_shop_snapshots'::regclass) then alter table public.ws_shop_snapshots add constraint "ws_shop_snapshots_check" CHECK (((visits IS NOT NULL) OR (orders IS NOT NULL) OR (revenue IS NOT NULL))); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_shop_snapshots_day_check' and conrelid='public.ws_shop_snapshots'::regclass) then alter table public.ws_shop_snapshots add constraint "ws_shop_snapshots_day_check" CHECK ((day <= ((now() AT TIME ZONE 'Asia/Tokyo'::text))::date)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_shop_snapshots_note_check' and conrelid='public.ws_shop_snapshots'::regclass) then alter table public.ws_shop_snapshots add constraint "ws_shop_snapshots_note_check" CHECK ((length(note) <= 1000)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_shop_snapshots_orders_check' and conrelid='public.ws_shop_snapshots'::regclass) then alter table public.ws_shop_snapshots add constraint "ws_shop_snapshots_orders_check" CHECK ((orders >= 0)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_shop_snapshots_pkey' and conrelid='public.ws_shop_snapshots'::regclass) then alter table public.ws_shop_snapshots add constraint "ws_shop_snapshots_pkey" PRIMARY KEY (day); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_shop_snapshots_revenue_check' and conrelid='public.ws_shop_snapshots'::regclass) then alter table public.ws_shop_snapshots add constraint "ws_shop_snapshots_revenue_check" CHECK ((revenue >= (0)::numeric)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_shop_snapshots_visits_check' and conrelid='public.ws_shop_snapshots'::regclass) then alter table public.ws_shop_snapshots add constraint "ws_shop_snapshots_visits_check" CHECK ((visits >= 0)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_social_accounts_pkey' and conrelid='public.ws_social_accounts'::regclass) then alter table public.ws_social_accounts add constraint "ws_social_accounts_pkey" PRIMARY KEY (channel); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_social_snapshots_channel_day_source_key' and conrelid='public.ws_social_snapshots'::regclass) then alter table public.ws_social_snapshots add constraint "ws_social_snapshots_channel_day_source_key" UNIQUE (channel, day, source); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_social_snapshots_check' and conrelid='public.ws_social_snapshots'::regclass) then alter table public.ws_social_snapshots add constraint "ws_social_snapshots_check" CHECK (((followers IS NOT NULL) OR (reach IS NOT NULL) OR (reactions IS NOT NULL))); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_social_snapshots_check1' and conrelid='public.ws_social_snapshots'::regclass) then alter table public.ws_social_snapshots add constraint "ws_social_snapshots_check1" CHECK ((((reach IS NULL) AND (reactions IS NULL)) OR ((period_start IS NOT NULL) AND (period_end IS NOT NULL) AND (period_start <= period_end)))); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_social_snapshots_day_check' and conrelid='public.ws_social_snapshots'::regclass) then alter table public.ws_social_snapshots add constraint "ws_social_snapshots_day_check" CHECK ((day <= ((now() AT TIME ZONE 'Asia/Tokyo'::text))::date)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_social_snapshots_followers_check' and conrelid='public.ws_social_snapshots'::regclass) then alter table public.ws_social_snapshots add constraint "ws_social_snapshots_followers_check" CHECK ((followers >= 0)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_social_snapshots_note_check' and conrelid='public.ws_social_snapshots'::regclass) then alter table public.ws_social_snapshots add constraint "ws_social_snapshots_note_check" CHECK ((length(note) <= 1000)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_social_snapshots_pkey' and conrelid='public.ws_social_snapshots'::regclass) then alter table public.ws_social_snapshots add constraint "ws_social_snapshots_pkey" PRIMARY KEY (id); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_social_snapshots_reach_check' and conrelid='public.ws_social_snapshots'::regclass) then alter table public.ws_social_snapshots add constraint "ws_social_snapshots_reach_check" CHECK ((reach >= 0)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_social_snapshots_reactions_check' and conrelid='public.ws_social_snapshots'::regclass) then alter table public.ws_social_snapshots add constraint "ws_social_snapshots_reactions_check" CHECK ((reactions >= 0)); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_social_snapshots_source_check' and conrelid='public.ws_social_snapshots'::regclass) then alter table public.ws_social_snapshots add constraint "ws_social_snapshots_source_check" CHECK ((source = ANY (ARRAY['api'::text, 'manual'::text, 'legacy'::text]))); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_sync_runs_pkey' and conrelid='public.ws_sync_runs'::regclass) then alter table public.ws_sync_runs add constraint "ws_sync_runs_pkey" PRIMARY KEY (id); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_insights_owners_user_id_fkey' and conrelid='public.ws_insights_owners'::regclass) then alter table public.ws_insights_owners add constraint "ws_insights_owners_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id); end if; end $constraint$;
do $constraint$ begin if not exists(select 1 from pg_constraint where conname='ws_social_snapshots_channel_fkey' and conrelid='public.ws_social_snapshots'::regclass) then alter table public.ws_social_snapshots add constraint "ws_social_snapshots_channel_fkey" FOREIGN KEY (channel) REFERENCES ws_social_accounts(channel); end if; end $constraint$;
CREATE INDEX IF NOT EXISTS ws_activity_scope_time ON public.ws_activity USING btree (site, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ws_activity_session_time ON public.ws_activity USING btree (session_id, occurred_at);
CREATE UNIQUE INDEX IF NOT EXISTS ws_sync_one_running ON public.ws_sync_runs USING btree (status) WHERE (status = 'running'::text);
alter table public."ws_activity" enable row level security;
revoke all on public."ws_activity" from anon, authenticated;
grant all on public."ws_activity" to service_role;
grant select on public."ws_activity" to authenticated;
alter table public."ws_insights_owners" enable row level security;
revoke all on public."ws_insights_owners" from anon, authenticated;
grant all on public."ws_insights_owners" to service_role;
grant select on public."ws_insights_owners" to authenticated;
alter table public."ws_shop_snapshots" enable row level security;
revoke all on public."ws_shop_snapshots" from anon, authenticated;
grant all on public."ws_shop_snapshots" to service_role;
grant select on public."ws_shop_snapshots" to authenticated;
alter table public."ws_social_accounts" enable row level security;
revoke all on public."ws_social_accounts" from anon, authenticated;
grant all on public."ws_social_accounts" to service_role;
grant select on public."ws_social_accounts" to authenticated;
alter table public."ws_social_snapshots" enable row level security;
revoke all on public."ws_social_snapshots" from anon, authenticated;
grant all on public."ws_social_snapshots" to service_role;
grant select on public."ws_social_snapshots" to authenticated;
alter table public."ws_sync_runs" enable row level security;
revoke all on public."ws_sync_runs" from anon, authenticated;
grant all on public."ws_sync_runs" to service_role;
grant select on public."ws_sync_runs" to authenticated;
grant insert on public.ws_activity to anon,authenticated;
grant insert,update on public.ws_social_snapshots,public.ws_shop_snapshots to authenticated;
grant select on public.ws_visits,public.ws_events to authenticated;
drop policy if exists "owner_read" on public."ws_social_accounts";
create policy "owner_read" on public."ws_social_accounts" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM ws_insights_owners)));
drop policy if exists "visits_owner_read" on public."ws_visits";
create policy "visits_owner_read" on public."ws_visits" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM ws_insights_owners)));
drop policy if exists "events_owner_read" on public."ws_events";
create policy "events_owner_read" on public."ws_events" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM ws_insights_owners)));
drop policy if exists "telemetry_append" on public."ws_activity";
create policy "telemetry_append" on public."ws_activity" as PERMISSIVE for INSERT to "anon","authenticated" with check (((occurred_at >= (now() - '00:02:00'::interval)) AND (occurred_at <= (now() + '00:02:00'::interval))));
drop policy if exists "telemetry_owner_read" on public."ws_activity";
create policy "telemetry_owner_read" on public."ws_activity" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM ws_insights_owners)));
drop policy if exists "manual_insert_only" on public."ws_social_snapshots";
create policy "manual_insert_only" on public."ws_social_snapshots" as RESTRICTIVE for INSERT to "authenticated" with check ((source = ANY (ARRAY['manual'::text, 'legacy'::text])));
drop policy if exists "manual_update_only" on public."ws_social_snapshots";
create policy "manual_update_only" on public."ws_social_snapshots" as RESTRICTIVE for UPDATE to "authenticated" using ((source = ANY (ARRAY['manual'::text, 'legacy'::text]))) with check ((source = ANY (ARRAY['manual'::text, 'legacy'::text])));
drop policy if exists "owner_insert" on public."ws_social_snapshots";
create policy "owner_insert" on public."ws_social_snapshots" as PERMISSIVE for INSERT to "authenticated" with check ((EXISTS ( SELECT 1
   FROM ws_insights_owners)));
drop policy if exists "owner_read" on public."ws_social_snapshots";
create policy "owner_read" on public."ws_social_snapshots" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM ws_insights_owners)));
drop policy if exists "owner_update" on public."ws_social_snapshots";
create policy "owner_update" on public."ws_social_snapshots" as PERMISSIVE for UPDATE to "authenticated" using ((EXISTS ( SELECT 1
   FROM ws_insights_owners))) with check ((EXISTS ( SELECT 1
   FROM ws_insights_owners)));
drop policy if exists "owner_insert" on public."ws_shop_snapshots";
create policy "owner_insert" on public."ws_shop_snapshots" as PERMISSIVE for INSERT to "authenticated" with check ((EXISTS ( SELECT 1
   FROM ws_insights_owners)));
drop policy if exists "owner_read" on public."ws_shop_snapshots";
create policy "owner_read" on public."ws_shop_snapshots" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM ws_insights_owners)));
drop policy if exists "owner_update" on public."ws_shop_snapshots";
create policy "owner_update" on public."ws_shop_snapshots" as PERMISSIVE for UPDATE to "authenticated" using ((EXISTS ( SELECT 1
   FROM ws_insights_owners))) with check ((EXISTS ( SELECT 1
   FROM ws_insights_owners)));
drop policy if exists "owner_read" on public."ws_sync_runs";
create policy "owner_read" on public."ws_sync_runs" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM ws_insights_owners)));
drop policy if exists "insights_owner_self" on public."ws_insights_owners";
create policy "insights_owner_self" on public."ws_insights_owners" as PERMISSIVE for SELECT to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create or replace view public.ws_activity_all with(security_invoker=true) as  SELECT ws_activity.id::text AS id,
    ws_activity.occurred_at,
    ws_activity.visitor_id,
    ws_activity.session_id,
    ws_activity.site,
    ws_activity.path,
    ws_activity.kind,
    ws_activity.value,
    ws_activity.target,
    ws_activity.referrer,
    ws_activity.source,
    ws_activity.medium,
    ws_activity.campaign,
    ws_activity.content,
    ws_activity.device,
    false AS legacy
   FROM ws_activity
UNION ALL
 SELECT 'visit:'::text || ws_visits.id AS id,
    ws_visits.visited_at AS occurred_at,
    ws_visits.visitor_id,
    NULL::text AS session_id,
        CASE
            WHEN ws_visits.path ~ '^/(analytics|brief|learn|control)(/|$)'::text THEN 'workspace'::text
            ELSE 'official'::text
        END AS site,
    ws_visits.path,
    'pageview'::text AS kind,
    NULL::text AS value,
    NULL::text AS target,
    split_part(ws_visits.referrer, '?'::text, 1) AS referrer,
        CASE
            WHEN ws_visits.referrer IS NULL OR ws_visits.referrer = ''::text THEN 'direct'::text
            ELSE lower("substring"(ws_visits.referrer, '^https?://([^/]+)'::text))
        END AS source,
    NULL::text AS medium,
    NULL::text AS campaign,
    NULL::text AS content,
    'unknown'::text AS device,
    true AS legacy
   FROM ws_visits
UNION ALL
 SELECT 'event:'::text || ws_events.id AS id,
    ws_events.created_at AS occurred_at,
    ws_events.visitor_id,
    NULL::text AS session_id,
        CASE
            WHEN ws_events.path ~ '^/(analytics|brief|learn|control)(/|$)'::text THEN 'workspace'::text
            ELSE 'official'::text
        END AS site,
    ws_events.path,
    ws_events.event_name AS kind,
    ws_events.event_value AS value,
    NULL::text AS target,
    NULL::text AS referrer,
    'unknown'::text AS source,
    NULL::text AS medium,
    NULL::text AS campaign,
    NULL::text AS content,
    'unknown'::text AS device,
    true AS legacy
   FROM ws_events;
grant select on public.ws_activity_all to authenticated;
CREATE OR REPLACE FUNCTION ws_insights_private.secret_read(p_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service_only' using errcode='42501'; end if;
 if p_name not in ('instagram_token','threads_token','pinterest_token','sync_key') then raise exception 'invalid_secret'; end if;
 return (select decrypted_secret from vault.decrypted_secrets where name='ws_insights_'||p_name limit 1);
end $function$;
revoke all on function ws_insights_private.secret_read(p_name text) from public,anon,authenticated;
grant execute on function ws_insights_private.secret_read(p_name text) to service_role;
CREATE OR REPLACE FUNCTION ws_insights_private.secret_write(p_name text, p_value text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sid uuid;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service_only' using errcode='42501'; end if;
 if p_name not in ('instagram_token','threads_token','pinterest_token') or length(p_value)>4096 then raise exception 'invalid_secret'; end if;
 select id into sid from vault.secrets where name='ws_insights_'||p_name;
 if sid is null then perform vault.create_secret(p_value,'ws_insights_'||p_name); else perform vault.update_secret(sid,p_value); end if;
end $function$;
revoke all on function ws_insights_private.secret_write(p_name text, p_value text) from public,anon,authenticated;
grant execute on function ws_insights_private.secret_write(p_name text, p_value text) to service_role;
CREATE OR REPLACE FUNCTION public.ws_insights_secret(p_name text)
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$select ws_insights_private.secret_read(p_name)$function$;
revoke all on function public.ws_insights_secret(p_name text) from public,anon,authenticated;
grant execute on function public.ws_insights_secret(p_name text) to service_role;
CREATE OR REPLACE FUNCTION public.ws_insights_secret_save(p_name text, p_value text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$select ws_insights_private.secret_write(p_name,p_value)$function$;
revoke all on function public.ws_insights_secret_save(p_name text, p_value text) from public,anon,authenticated;
grant execute on function public.ws_insights_secret_save(p_name text, p_value text) to service_role;
CREATE OR REPLACE FUNCTION public.ws_insights_dashboard(p_start date, p_end date, p_site text DEFAULT 'official'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare result jsonb; lo timestamptz; hi timestamptz;
begin
 if not exists(select 1 from public.ws_insights_owners where user_id=auth.uid()) then raise exception 'owner_required' using errcode='42501'; end if;
 if p_start is null or p_end is null or p_start>p_end or p_end-p_start>365 or p_end>(now() at time zone 'Asia/Tokyo')::date or p_site not in ('official','workspace','hub','album','base','social','all') then raise exception 'invalid_range'; end if;
 lo:=p_start::timestamp at time zone 'Asia/Tokyo'; hi:=(p_end+1)::timestamp at time zone 'Asia/Tokyo';
 with data as materialized (select * from public.ws_activity_all where occurred_at>=lo and occurred_at<hi and (p_site='all' or site=p_site)),
 visits as (select * from data where kind='pageview'),
 previous as (select * from public.ws_activity_all where kind='pageview' and occurred_at>=lo-(hi-lo) and occurred_at<lo and (p_site='all' or site=p_site)),
 sessions as (select site,session_id,min(occurred_at) as started_at,count(*) as pages from visits where session_id is not null group by site,session_id),
 daily as (select d::date as day,(select count(*) from visits where (occurred_at at time zone 'Asia/Tokyo')::date=d::date) as pageviews,(select count(distinct site||':'||visitor_id) from visits where (occurred_at at time zone 'Asia/Tokyo')::date=d::date) as visitors from generate_series(p_start::timestamp,p_end::timestamp,interval '1 day') d),
 sources as (select source,count(*) as pageviews,count(distinct site||':'||visitor_id) as visitors,count(distinct session_id) as sessions from visits group by source),
 paths as (select site,path,count(*) as views,count(distinct visitor_id) as visitors from visits group by site,path order by views desc limit 30),
 actions as (select kind,count(*) as count from data where kind<>'pageview' group by kind),
 destinations as (select coalesce(target,value,'不明') as destination,kind,count(*) as clicks,count(distinct session_id) as sessions from data where kind in ('outbound_click','shop_click','social_click') group by 1,kind order by clicks desc limit 30),
 flows as (select source,path,coalesce(target,value) as destination,count(*) as clicks from data where kind='outbound_click' group by source,path,coalesce(target,value) order by clicks desc limit 30),
 campaigns as (select source,medium,campaign,content,count(*) filter(where kind='pageview') as pageviews,count(distinct session_id) filter(where kind='pageview') as sessions,count(*) filter(where kind='outbound_click') as clicks from data where campaign is not null group by source,medium,campaign,content order by pageviews desc limit 50),
 devices as (select device,count(*) as views from visits group by device),
 social as (select a.*, (select to_jsonb(s) from public.ws_social_snapshots s where s.channel=a.channel and s.day<=p_end and s.followers is not null order by s.day desc,s.observed_at desc limit 1) as latest from public.ws_social_accounts a order by sort_order),
 history as (select distinct on(channel,day) channel,day,followers,reach,reactions,period_start,period_end,source,observed_at,note from public.ws_social_snapshots where day>=p_start and day<=p_end order by channel,day,(followers is not null) desc,observed_at desc),
 baseline as (select distinct on(channel) channel,day,followers from public.ws_social_snapshots where day<p_start and followers is not null order by channel,day desc,observed_at desc),
 coverage as (select site,min(occurred_at) as first_at,max(occurred_at) as last_at,count(*) filter(where kind='pageview') as pageviews from public.ws_activity_all group by site)
 select jsonb_build_object(
 'range',jsonb_build_object('start',p_start,'end',p_end,'site',p_site,'timezone','Asia/Tokyo'),
 'summary',jsonb_build_object('visitors',(select count(distinct site||':'||visitor_id) from visits),'pageviews',(select count(*) from visits),'sessions',(select count(*) from sessions),'actions',(select count(*) from data where kind<>'pageview'),'previous_visitors',(select count(distinct site||':'||visitor_id) from previous),'previous_pageviews',(select count(*) from previous),'tracked_session_views',(select count(*) from visits where session_id is not null),'legacy_views',(select count(*) from visits where legacy),'shop_sessions',(select count(distinct session_id) from data where kind='outbound_click' and target like 'https://wsstudiotei.base.shop%'),'active_last_5m',(select count(distinct site||':'||visitor_id) from public.ws_activity_all where occurred_at>=now()-interval '5 minutes' and (p_site='all' or site=p_site))),
 'daily',coalesce((select jsonb_agg(to_jsonb(daily) order by day) from daily),'[]'),
 'sources',coalesce((select jsonb_agg(to_jsonb(sources) order by visitors desc) from sources),'[]'),
 'paths',coalesce((select jsonb_agg(to_jsonb(paths)) from paths),'[]'),
 'actions',coalesce((select jsonb_agg(to_jsonb(actions)) from actions),'[]'),
 'destinations',coalesce((select jsonb_agg(to_jsonb(destinations)) from destinations),'[]'),
 'flows',coalesce((select jsonb_agg(to_jsonb(flows)) from flows),'[]'),
 'campaigns',coalesce((select jsonb_agg(to_jsonb(campaigns)) from campaigns),'[]'),
 'devices',coalesce((select jsonb_agg(to_jsonb(devices)) from devices),'[]'),
 'social',coalesce((select jsonb_agg(to_jsonb(social)) from social),'[]'),
 'history',coalesce((select jsonb_agg(to_jsonb(history)) from history),'[]'),
 'records',coalesce((select jsonb_agg(to_jsonb(s) order by day desc,channel) from public.ws_social_snapshots s where day>=p_start and day<=p_end),'[]'),
 'baseline',coalesce((select jsonb_agg(to_jsonb(baseline)) from baseline),'[]'),
 'shop',coalesce((select jsonb_agg(to_jsonb(s)) from public.ws_shop_snapshots s where day>=p_start and day<=p_end),'[]'),
 'coverage',coalesce((select jsonb_agg(to_jsonb(coverage)) from coverage),'[]'),
 'sync',(select to_jsonb(r) from public.ws_sync_runs r order by started_at desc limit 1),
 'generated_at',now()) into result;
 return result;
end $function$;
revoke all on function public.ws_insights_dashboard(p_start date, p_end date, p_site text) from public,anon,authenticated;
grant execute on function public.ws_insights_dashboard(p_start date, p_end date, p_site text) to authenticated;
insert into public.ws_insights_owners(user_id) select id from auth.users where lower(email)='tei.wsstudio@gmail.com' on conflict do nothing;
insert into public.ws_social_accounts(channel,label,handle,profile_url,auto_enabled,status,sort_order) values
('x','X','WABISABI_pomo','https://x.com/WABISABI_pomo',false,'manual',1),
('instagram','Instagram','teiteite1tei','https://www.instagram.com/teiteite1tei',false,'needs_connection',2),
('threads','Threads','teiteite1tei','https://www.threads.com/@teiteite1tei',false,'needs_connection',3),
('bluesky','Bluesky','teiteiteite1.bsky.social','https://bsky.app/profile/teiteiteite1.bsky.social',true,'needs_connection',4),
('pinterest','Pinterest','teiwsstudio','https://www.pinterest.com/teiwsstudio/',false,'needs_connection',5),
('note','note','teiteiteite1','https://note.com/teiteiteite1',false,'manual',6),
('suno','Suno','teiteiteitei','https://suno.com/@teiteiteitei',false,'manual',7)
on conflict(channel) do nothing;
commit;
