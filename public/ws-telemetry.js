/* WS studio first-party telemetry. Public INSERT-only key; no read credential. */
(() => {
 const site=document.currentScript?.dataset.site;
 if(!['hub','album','base','social'].includes(site)||window.__wsTelemetryReady)return;
 window.__wsTelemetryReady=true;
 const endpoint='https://udjpqsmihauksbceaxww.supabase.co/rest/v1/ws_activity';
 const key='sb_publishable_vNHL7xgpDLBfYhTblDQUZg_us4Xbnss';
 const pending=new Map(),inflight=new Set();let memoryId='',session=null,lastPath='';
 const get=(key,temp=false)=>{try{return (temp?sessionStorage:localStorage).getItem(key);}catch{return null;}};
 const set=(key,value,temp=false)=>{try{(temp?sessionStorage:localStorage).setItem(key,value);}catch{}};
 const safe=value=>{if(!value)return null;try{const u=new URL(value,location.href);return /^https?:$/.test(u.protocol)?(u.origin+u.pathname).slice(0,1000):null;}catch{return null;}};
 const source=ref=>{if(!ref)return 'direct';try{const h=new URL(ref).hostname,match=s=>h===s||h.endsWith('.'+s);
 for(const [name,hosts] of Object.entries({instagram:['instagram.com'],threads:['threads.net','threads.com'],x:['x.com','twitter.com','t.co'],bluesky:['bsky.app'],pinterest:['pinterest.com','pin.it'],note:['note.com'],google:['google.com','google.co.jp'],hub:['ws-studio-hub.wsstudio.chatgpt.site'],social:['ws-social-desk.wsstudio.chatgpt.site'],official:['ws-studio-wheat.vercel.app']}))if(hosts.some(match))return name;return h.slice(0,100);}catch{return 'direct';}};
 const saveQueue=()=>set('ws_pending_v2',JSON.stringify([...pending.values()].slice(-100)),true);
 const flush=()=>{if(get('ws_analytics_exclude')==='1'){pending.clear();saveQueue();return;}for(const [id,body] of pending){if(inflight.has(id))continue;inflight.add(id);fetch(endpoint,{method:'POST',headers:{apikey:key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(body),keepalive:true}).then(async r=>{if(r.ok||(r.status===409&&(await r.json()).code==='23505')||(r.status>=400&&r.status<500)){pending.delete(id);saveQueue();}}).catch(()=>{}).finally(()=>inflight.delete(id));}};
 const short=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f]/g,'').slice(0,n)||null:null;
 const track=(kind,value,target)=>{
  if(get('ws_analytics_exclude')==='1'||navigator.webdriver||/bot|crawler|spider/i.test(navigator.userAgent))return;
  const now=Date.now();if(!memoryId){memoryId=get('ws_visitor_id')||crypto.randomUUID();set('ws_visitor_id',memoryId);}
  if(!session)try{session=JSON.parse(get('ws_session_v2',true)||'null');}catch{}
  if(!session||now-session.touched>1800000){const p=new URL(location.href).searchParams;session={id:crypto.randomUUID(),touched:now,source:short(p.get('utm_source'),100)||source(document.referrer),medium:short(p.get('utm_medium'),100),campaign:short(p.get('utm_campaign'),200),content:short(p.get('utm_content'),200),referrer:safe(document.referrer)?.slice(0,500)||null};}
  session.touched=now;set('ws_session_v2',JSON.stringify(session),true);
  const id=crypto.randomUUID();pending.set(id,{id,visitor_id:memoryId,session_id:session.id,site,path:location.pathname.slice(0,500),kind,value:short(value,500),target:safe(target),referrer:session.referrer,source:session.source,medium:session.medium,campaign:session.campaign,content:session.content,device:/iPad|Tablet/i.test(navigator.userAgent)?'tablet':/Mobi/i.test(navigator.userAgent)?'mobile':'desktop'});saveQueue();flush();
 };
 try{for(const r of JSON.parse(get('ws_pending_v2',true)||'[]'))if(r.site===site&&typeof r.id==='string')pending.set(r.id,r);}catch{}
 const page=()=>{if(lastPath!==location.pathname){lastPath=location.pathname;track('pageview');}};
 document.addEventListener('click',e=>{const a=e.target instanceof Element?e.target.closest('a[href]'):null;if(!a||a.hasAttribute('download'))return;try{const u=new URL(a.href);if(!/^https?:$/.test(u.protocol))return;track(u.origin===location.origin?'internal_click':'outbound_click',a.getAttribute('aria-label')||a.textContent?.trim(),u.href);}catch{}},true);
 window.addEventListener('ws-music-play',e=>track('music_play',e.detail?.title));
 for(const method of ['pushState','replaceState']){const original=history[method];history[method]=function(...args){const result=original.apply(this,args);page();return result;};}
 window.addEventListener('popstate',page);window.addEventListener('online',flush);setInterval(flush,15000);page();flush();
})();
