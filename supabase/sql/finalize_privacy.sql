-- Apply together with the authenticated /analytics release.
-- The old frontend depends on the public dashboard RPC until that release.
begin;
revoke all on function public.ws_dashboard_stats(),public.ws_public_stats() from public,anon;
alter function public.ws_dashboard_stats() security invoker;
alter function public.ws_public_stats() security invoker;
revoke all on public.ws_visits,public.ws_events,public.ws_activity_all from anon;
commit;
