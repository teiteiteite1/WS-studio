// Supabase Edge Function. No analytics token is exposed to the browser.
// @ts-nocheck
const base = Deno.env.get('SUPABASE_URL');
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const publicKey = Deno.env.get('SUPABASE_ANON_KEY');
const allowedOrigins = ['https://ws-studio-wheat.vercel.app','https://ws-social-desk.wsstudio.chatgpt.site'];
const today = () => new Date(Date.now()+9*3600_000).toISOString().slice(0,10);
class ProviderError extends Error { constructor(public status:string, message:string){super(message);} }
async function db(path:string, init:RequestInit={}, jwt=service) {
  const r = await fetch(`${base}/rest/v1/${path}`,{...init,headers:{apikey:service,Authorization:`Bearer ${jwt}`,'Content-Type':'application/json',...init.headers},signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Error(`database_${r.status}`);
  const text=await r.text();return text?JSON.parse(text):null;
}
async function secret(name:string){return db('rpc/ws_insights_secret',{method:'POST',body:JSON.stringify({p_name:name})});}
async function provider(url:string,token?:string){
 const r=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{},redirect:'manual',signal:AbortSignal.timeout(15000)});
 if(!r.ok){let code=null;try{code=(await r.json())?.error?.code;}catch{}
   throw new ProviderError(code===190||r.status===401?'expired':r.status===403||code===10||code===200?'needs_permission':'error', code===190||r.status===401?'認証期限が切れました。再接続してください。':r.status===403||code===10||code===200?'フォロワー数を読む権限を確認してください。':`SNSから取得できませんでした（${r.status}）。`);
 }
 return r.json();
}
function count(value:unknown){if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw new ProviderError('needs_permission','フォロワー数が応答にありません。インサイト閲覧権限を確認してください。');return value;}
async function measure(account,token?:string){
 if(account.channel==='bluesky') { const p=await provider(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(account.handle)}`);return {followers:count(p.followersCount),id:p.did,handle:p.handle}; }
 if(!token)throw new ProviderError('needs_connection','Social Deskから連携するか、アクセストークンを登録してください。');
 if(account.channel==='instagram'){const p=await provider('https://graph.instagram.com/v25.0/me?fields=user_id,username,followers_count',token);return {followers:count(p.followers_count),id:p.user_id,handle:p.username};}
 if(account.channel==='threads'){
   const p=await provider('https://graph.threads.net/v1.0/me?fields=id,username',token);
   const insights=await provider(`https://graph.threads.net/v1.0/${encodeURIComponent(p.id)}/threads_insights?metric=followers_count`,token);
   const metric=insights.data?.find(m=>m.name==='followers_count');return {followers:count(metric?.total_value?.value ?? metric?.values?.at(-1)?.value),id:p.id,handle:p.username};
 }
 if(account.channel==='pinterest'){const p=await provider('https://api.pinterest.com/v5/user_account',token);return {followers:count(p.follower_count),id:p.id||p.username,handle:p.username};}
 throw new ProviderError('manual','このSNSは日付つきの手入力・CSVで保存できます。');
}
async function saveMeasurement(account,measurement){
 const now=new Date().toISOString();
 await db('ws_social_snapshots?on_conflict=channel,day,source',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({channel:account.channel,day:today(),followers:measurement.followers,source:'api',observed_at:now,note:''})});
 await db(`ws_social_accounts?channel=eq.${account.channel}`,{method:'PATCH',body:JSON.stringify({status:'ok',auto_enabled:true,account_id:measurement.id,handle:measurement.handle,last_attempt_at:now,last_success_at:now,last_error:null})});
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');const cors=origin&&allowedOrigins.includes(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{...cors,'Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:origin&&allowedOrigins.includes(origin)?204:403,headers:{...cors,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST'}});
 if(req.method!=='POST')return reply({error:'method'},405);
 if(origin&&!allowedOrigins.includes(origin))return reply({error:'origin'},403);
 let isCron=false;
 try{
   const cron=req.headers.get('x-ws-sync-key');
   if(cron){const expected=await secret('sync_key');isCron=typeof expected==='string'&&expected.length>=32&&cron.length===expected.length&&[...cron].reduce((n,c,i)=>n|(c.charCodeAt(0)^expected.charCodeAt(i)),0)===0;if(!isCron)return reply({error:'unauthorized'},401);}
   if(!isCron){
     const authorization=req.headers.get('authorization');if(!authorization?.startsWith('Bearer '))return reply({error:'ログインしてください。'},401);
     const jwt=authorization.slice(7);const auth=await fetch(`${base}/auth/v1/user`,{headers:{apikey:publicKey,Authorization:authorization},signal:AbortSignal.timeout(10000)});
     if(!auth.ok)return reply({error:'ログインの有効期限が切れました。'},401);
     const user=await auth.json();const owners=await db(`ws_insights_owners?user_id=eq.${encodeURIComponent(user.id)}&select=user_id`,{},jwt);
     if(!owners.length)return reply({error:'閲覧権限がありません。'},403);
   }
   const raw=await req.text();if(raw.length>16000)return reply({error:'入力が大きすぎます。'},413);const input=raw?JSON.parse(raw):{};
   if(input.action==='connect'){
     if(isCron)return reply({error:'owner_required'},403);
     if(!['instagram','threads','pinterest'].includes(input.channel)||typeof input.token!=='string'||!/^[\x21-\x7e]{20,4096}$/.test(input.token))return reply({error:'接続情報を確認してください。'},400);
     const [account]=await db(`ws_social_accounts?channel=eq.${input.channel}`);
     const m=await measure(account,input.token);
     if(account.handle&&m.handle.toLowerCase()!==account.handle.toLowerCase())return reply({error:`登録済みの @${account.handle} と異なるアカウントです。`},400);
     await db('rpc/ws_insights_secret_save',{method:'POST',body:JSON.stringify({p_name:`${input.channel}_token`,p_value:input.token})});
     await saveMeasurement(account,m);return reply({ok:true,channel:account.channel,followers:m.followers});
   }
   if(input.action==='disconnect'){
     if(isCron||!['instagram','threads','pinterest'].includes(input.channel))return reply({error:'invalid'},400);
     await db('rpc/ws_insights_secret_save',{method:'POST',body:JSON.stringify({p_name:`${input.channel}_token`,p_value:''})});
     await db(`ws_social_accounts?channel=eq.${input.channel}`,{method:'PATCH',body:JSON.stringify({auto_enabled:false,status:'needs_connection',last_error:null})});return reply({ok:true});
   }
   const cutoff=new Date(Date.now()-10*60_000).toISOString();
   await db(`ws_sync_runs?status=eq.running&started_at=lt.${cutoff}`,{method:'PATCH',body:JSON.stringify({status:'interrupted',finished_at:new Date().toISOString()})});
   const latest=await db('ws_sync_runs?select=started_at,status&order=started_at.desc&limit=1');
   if(latest[0]&&Date.now()-Date.parse(latest[0].started_at)<60_000)return reply({ok:true,skipped:true,message:'直前の取得結果を表示します。'});
   const run=crypto.randomUUID();try{await db('ws_sync_runs',{method:'POST',body:JSON.stringify({id:run})});}catch{return reply({error:'別の更新が進行中です。'},409);}
   const outcomes={};
   try{
     const accounts=await db('ws_social_accounts?auto_enabled=eq.true&order=sort_order');
     for(const account of accounts){try{const token=account.channel==='bluesky'?undefined:await secret(`${account.channel}_token`);const m=await measure(account,token);await saveMeasurement(account,m);outcomes[account.channel]={ok:true,followers:m.followers};}
       catch(e){const status=e instanceof ProviderError?e.status:'error';const message=e instanceof ProviderError?e.message:'保存または通信に失敗しました。次回更新時に再試行します。';outcomes[account.channel]={ok:false,status};await db(`ws_social_accounts?channel=eq.${account.channel}`,{method:'PATCH',body:JSON.stringify({status,last_attempt_at:new Date().toISOString(),last_error:message})});}}
     const status=Object.values(outcomes).every(x=>x.ok)?'succeeded':'partial';
     await db(`ws_sync_runs?id=eq.${run}`,{method:'PATCH',body:JSON.stringify({status,finished_at:new Date().toISOString(),result:outcomes})});return reply({ok:true,status,result:outcomes});
   }catch{await db(`ws_sync_runs?id=eq.${run}`,{method:'PATCH',body:JSON.stringify({status:'failed',finished_at:new Date().toISOString()})}).catch(()=>{});return reply({error:'同期に失敗しました。再度お試しください。'},503);}
 }catch(e){return reply({error:e instanceof ProviderError?e.message:'接続または保存に失敗しました。',status:e instanceof ProviderError?e.status:'error'},e instanceof ProviderError?400:503);}
});

