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
