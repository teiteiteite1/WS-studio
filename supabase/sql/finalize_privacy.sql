-- Applied after the authenticated /analytics release on 2026-09-06.
-- Retain the old functions for historical reference; stop all client execution.
begin;
revoke all on function public.ws_dashboard_stats(),public.ws_public_stats() from public,anon,authenticated;
alter function public.ws_dashboard_stats() security invoker;
alter function public.ws_public_stats() security invoker;
revoke all on public.ws_visits,public.ws_events,public.ws_activity_all from anon;
commit;
