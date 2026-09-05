-- Daily 06:10 JST; reuses the existing named job and Vault secret.
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $schedule$
begin
 if not exists(select 1 from vault.secrets where name='ws_insights_sync_key') then
  perform vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text,'ws_insights_sync_key');
 end if;
end $schedule$;
select cron.schedule('ws-insights-followers','10 21 * * *',$job$
 select net.http_post(
  url:='https://udjpqsmihauksbceaxww.supabase.co/functions/v1/ws-insights-sync',
  headers:=jsonb_build_object('Content-Type','application/json','x-ws-sync-key',(select decrypted_secret from vault.decrypted_secrets where name='ws_insights_sync_key')),
  body:='{}'::jsonb,timeout_milliseconds:=120000
 );
$job$);
