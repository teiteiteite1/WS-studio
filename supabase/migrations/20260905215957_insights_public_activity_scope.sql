begin;
-- Preserve historical rows; restrict new collection and analytics to public activity.
create or replace function public.ws_insights_public_path(p_path text) returns boolean language plpgsql immutable set search_path='' as $$
declare decoded text:=lower(split_part(split_part(p_path,'?',1),'#',1)); code integer;
begin
 for code in 32..126 loop decoded:=replace(decoded,'%'||lpad(to_hex(code),2,'0'),lower(chr(code))); end loop;
 return coalesce(decoded ~ '^/' and decoded !~ '^/(analytics|insights?|hub|social-desk|social|control|brief|learn|ai30|ai-30|counter|admin|api|_next|cart|checkout|mypage|account)(/|$)',false);
end $$;
create or replace function public.ws_insights_public_target(p_target text) returns boolean language sql immutable set search_path='' as $$
 select p_target is null or (lower(p_target) !~ '^https?://(ws-studio-hub|ws-social-desk|now-generating-album)[.]wsstudio[.]chatgpt[.]site(/|$)'
 and (lower(p_target) !~ '^https?://ws-studio-wheat[.]vercel[.]app(/|$)' or public.ws_insights_public_path(regexp_replace(lower(p_target),'^https?://ws-studio-wheat[.]vercel[.]app',''))));
$$;
create or replace view public.ws_insights_activity with(security_invoker=true) as
 select * from public.ws_activity_all where site in ('official','base') and public.ws_insights_public_path(path) and public.ws_insights_public_target(target) and public.ws_insights_public_target(referrer);
revoke all on public.ws_insights_activity from public,anon;
grant select on public.ws_insights_activity to authenticated;
drop policy if exists telemetry_append on public.ws_activity;
create policy telemetry_append on public.ws_activity for insert to anon,authenticated with check
 (site in ('official','base') and public.ws_insights_public_path(path) and public.ws_insights_public_target(target) and public.ws_insights_public_target(referrer) and occurred_at between now()-interval '2 minutes' and now()+interval '2 minutes');
create or replace function public.ws_insights_ignore_internal() returns trigger language plpgsql set search_path='' as $$
begin
 if not public.ws_insights_public_path(new.path) then return null; end if;
 return new;
end $$;
drop trigger if exists ws_ignore_internal on public.ws_visits;
create trigger ws_ignore_internal before insert on public.ws_visits for each row execute function public.ws_insights_ignore_internal();
drop trigger if exists ws_ignore_internal on public.ws_events;
create trigger ws_ignore_internal before insert on public.ws_events for each row execute function public.ws_insights_ignore_internal();

CREATE OR REPLACE FUNCTION public.ws_insights_dashboard(p_start date, p_end date, p_site text DEFAULT 'official'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare result jsonb; lo timestamptz; hi timestamptz;
begin
 if not exists(select 1 from public.ws_insights_owners where user_id=auth.uid()) then raise exception 'owner_required' using errcode='42501'; end if;
 if p_start is null then select least(coalesce((select (min(occurred_at) at time zone 'Asia/Tokyo')::date from public.ws_insights_activity),current_date),coalesce((select min(day) from public.ws_social_snapshots),current_date),coalesce((select min(day) from public.ws_shop_snapshots),current_date)) into p_start; end if;
 if p_start<date '2000-01-01' or p_end is null or p_start>p_end or p_end>(now() at time zone 'Asia/Tokyo')::date or p_site not in ('official','base','all') then raise exception 'invalid_range'; end if;
 lo:=p_start::timestamp at time zone 'Asia/Tokyo'; hi:=(p_end+1)::timestamp at time zone 'Asia/Tokyo';
 with data as materialized (select * from public.ws_insights_activity where occurred_at>=lo and occurred_at<hi and (p_site='all' or site=p_site)),
 visits as (select * from data where kind='pageview'),
 previous as (select * from public.ws_insights_activity where kind='pageview' and occurred_at>=lo-(hi-lo) and occurred_at<lo and (p_site='all' or site=p_site)),
 sessions as (select site,session_id,min(occurred_at) as started_at,count(*) as pages from visits where session_id is not null group by site,session_id),
 daily_counts as (select (occurred_at at time zone 'Asia/Tokyo')::date as day,count(*) pageviews,count(distinct site||':'||visitor_id) visitors from visits group by 1),
 daily as (select d::date as day,coalesce(c.pageviews,0) pageviews,coalesce(c.visitors,0) visitors from generate_series(p_start::timestamp,p_end::timestamp,interval '1 day') d left join daily_counts c on c.day=d::date),
 sources as (select source,count(*) as pageviews,count(distinct site||':'||visitor_id) as visitors,count(distinct site||':'||session_id) as sessions,count(*) filter(where session_id is null) as legacy_views from visits group by source),
 paths as (select site,path,count(*) as views,count(distinct visitor_id) as visitors from visits group by site,path order by views desc limit 30),
 actions as (select kind,count(*) as count from data where kind<>'pageview' group by kind),
 destinations as (select coalesce(target,value,'不明') as destination,kind,count(*) as clicks,count(distinct session_id) as sessions from data where kind in ('outbound_click','shop_click','social_click') group by 1,kind order by clicks desc limit 30),
 flows as (select source,path,coalesce(target,value) as destination,count(*) as clicks from data where kind='outbound_click' group by source,path,coalesce(target,value) order by clicks desc limit 30),
 campaigns as (select source,medium,campaign,content,count(*) filter(where kind='pageview') as pageviews,count(distinct session_id) filter(where kind='pageview') as sessions,count(*) filter(where kind='outbound_click') as clicks from data where campaign is not null group by source,medium,campaign,content order by pageviews desc limit 50),
 ordered_pages as (select *,lag(path) over(partition by site,session_id order by occurred_at,id) from_path from visits where site='official' and session_id is not null),
 transitions as (select from_path,path to_path,count(*) views from ordered_pages where from_path is not null and from_path<>path group by from_path,path order by views desc limit 50),
 official_sessions as (select session_id,min(occurred_at) first_at,(array_agg(source order by occurred_at,id))[1] source from visits where site='official' and session_id is not null group by session_id),
 funnel as (select o.source,count(*) official_sessions,count(*) filter(where exists(select 1 from data d where d.site='official' and d.session_id=o.session_id and d.occurred_at>=o.first_at and d.kind='outbound_click' and d.target ~ '^https://wsstudiotei[.]base[.]shop(/|$)')) base_click_sessions from official_sessions o group by o.source),
 base_sources as (select source,count(*) pageviews,count(distinct visitor_id) visitors,count(distinct session_id) sessions from visits where site='base' group by source),
 devices as (select device,count(*) as views from visits group by device),
 social as (select a.*, (select min(day) from public.ws_social_snapshots first_s where first_s.channel=a.channel and first_s.followers is not null) as first_observed_day, (select to_jsonb(s) from public.ws_social_snapshots s where s.channel=a.channel and s.day<=p_end and s.followers is not null order by s.day desc,s.observed_at desc limit 1) as latest from public.ws_social_accounts a order by sort_order),
 history as (select distinct on(channel,day) channel,day,followers,reach,reactions,period_start,period_end,source,observed_at,note from public.ws_social_snapshots where day>=p_start and day<=p_end order by channel,day,(followers is not null) desc,observed_at desc),
 baseline as (select distinct on(channel) channel,day,followers from public.ws_social_snapshots where day<p_start and followers is not null order by channel,day desc,observed_at desc),
 coverage as (select site,min(occurred_at) as first_at,max(occurred_at) as last_at,count(*) filter(where kind='pageview') as pageviews from public.ws_insights_activity group by site)
 select jsonb_build_object(
 'range',jsonb_build_object('start',p_start,'end',p_end,'site',p_site,'timezone','Asia/Tokyo'),
 'summary',jsonb_build_object('visitors',(select count(distinct site||':'||visitor_id) from visits),'pageviews',(select count(*) from visits),'sessions',(select count(*) from sessions),'actions',(select count(*) from data where kind<>'pageview'),'previous_visitors',(select count(distinct site||':'||visitor_id) from previous),'previous_pageviews',(select count(*) from previous),'tracked_session_views',(select count(*) from visits where session_id is not null),'legacy_views',(select count(*) from visits where legacy),'shop_sessions',(select count(distinct session_id) from data where kind='outbound_click' and target ~ '^https://wsstudiotei[.]base[.]shop(/|$)'),'active_last_5m',(select count(distinct site||':'||visitor_id) from public.ws_insights_activity where occurred_at>=now()-interval '5 minutes' and (p_site='all' or site=p_site))),
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
 'transitions',coalesce((select jsonb_agg(to_jsonb(t)) from transitions t),'[]'),
 'funnel',coalesce((select jsonb_agg(to_jsonb(f)) from funnel f),'[]'),
 'base_sources',coalesce((select jsonb_agg(to_jsonb(b)) from base_sources b),'[]'),
 'tracking_started_at',(select min(occurred_at) from public.ws_insights_activity where not legacy and kind='pageview' and (p_site='all' or site=p_site)),
 'generated_at',now()) into result;
 return result;
end $function$;

commit;
