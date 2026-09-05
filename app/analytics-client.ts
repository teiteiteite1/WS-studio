import { safeUrl, sourceFor } from './lib/telemetry';
type VisitSession = { id:string; touched:number; source:string; medium:string|null; campaign:string|null; content:string|null; referrer:string|null };
let memoryId = ''; let memorySession: VisitSession | null = null;
const pending = new Map<string, Record<string,unknown>>(); const inflight = new Set<string>();
const SESSION = 'ws_analytics_session_v2'; const QUEUE = 'ws_analytics_pending_v2';
function storageGet(key:string, session=false) { try { return (session?sessionStorage:localStorage).getItem(key); } catch { return null; } }
function storageSet(key:string, value:string, session=false) { try { (session?sessionStorage:localStorage).setItem(key,value); } catch {} }
function visitor() { if (!memoryId) { memoryId = storageGet('ws_visitor_id') || crypto.randomUUID(); storageSet('ws_visitor_id',memoryId); } return memoryId; }
function session() {
  const now = Date.now();
  if (!memorySession) try { memorySession = JSON.parse(storageGet(SESSION,true) || 'null'); } catch {}
  if (!memorySession || now-memorySession.touched > 1800000) {
    const p = new URL(location.href).searchParams;
    memorySession = {id:crypto.randomUUID(),touched:now,source:p.get('utm_source') || sourceFor(document.referrer),medium:p.get('utm_medium'),campaign:p.get('utm_campaign'),content:p.get('utm_content'),referrer:safeUrl(document.referrer)};
  }
  memorySession.touched = now; storageSet(SESSION,JSON.stringify(memorySession),true); return memorySession;
}
function persist() { storageSet(QUEUE,JSON.stringify(Array.from(pending.values()).slice(-100)),true); }
async function flush() {
  if (storageGet('ws_analytics_exclude') === '1') { pending.clear(); persist(); return; }
  await Promise.all(Array.from(pending,async ([id,body])=> {
    if (inflight.has(id)) return; inflight.add(id);
    try { const r = await fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}); if (r.ok || (r.status>=400 && r.status<500)) { pending.delete(id); persist(); } } catch {} finally { inflight.delete(id); }
  }));
}
export function trackEvent(kind:string, value?:string, target?:string) {
  if (typeof window === 'undefined' || navigator.webdriver || storageGet('ws_analytics_exclude') === '1') return;
  const s = session(), id = crypto.randomUUID();
  pending.set(id,{id,visitor_id:visitor(),session_id:s.id,path:location.pathname,kind,value,target:safeUrl(target),source:s.source,medium:s.medium,campaign:s.campaign,content:s.content,referrer:s.referrer,device:/iPad|Tablet/i.test(navigator.userAgent)?'tablet':/Mobi/i.test(navigator.userAgent)?'mobile':'desktop'});
  persist(); void flush();
}
if (typeof window !== 'undefined') {
  try { for (const body of JSON.parse(storageGet(QUEUE,true) || '[]')) if (typeof body.id === 'string') pending.set(body.id,body); } catch {}
  window.addEventListener('online',()=>void flush()); window.setInterval(()=>void flush(),15000); void flush();
}
