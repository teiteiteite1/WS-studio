alter table public.ws_activity drop constraint ws_activity_site_check;
alter table public.ws_activity add constraint ws_activity_site_check check (site in ('official','workspace','hub','album','base','social'));
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
end $function$
