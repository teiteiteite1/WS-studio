export const KINDS = ['pageview','outbound_click','internal_click','gallery_open','music_play','contact_sent'] as const;
export function siteForPath(path: string) { return /^\/(analytics|brief|learn|control)(\/|$)/.test(path) ? 'workspace' : 'official'; }
export function safeUrl(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  try { const u = new URL(value); if (!['http:','https:'].includes(u.protocol)) return null; return (u.origin + u.pathname).slice(0,1000); } catch { return null; }
}
export function sourceFor(referrer: string) {
  let host: string; try { host = new URL(referrer).hostname.toLowerCase(); } catch { return 'direct'; }
  const match = (s: string) => host === s || host.endsWith('.' + s);
  if (match('instagram.com')) return 'instagram';
  if (match('threads.net') || match('threads.com')) return 'threads';
  if (match('x.com') || match('twitter.com') || match('t.co')) return 'x';
  if (match('bsky.app')) return 'bluesky';
  if (match('pinterest.com') || match('pin.it')) return 'pinterest';
  if (match('note.com')) return 'note';
  if (match('google.com') || match('google.co.jp')) return 'google';
  if (host === 'ws-studio-hub.wsstudio.chatgpt.site') return 'hub';
  if (host === 'now-generating-album.wsstudio.chatgpt.site') return 'album';
  return host.slice(0,100);
}
const short = (v: unknown, n: number) => typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g,'').slice(0,n) || null : null;
export function cleanActivity(input: unknown) {
  if (!input || typeof input !== 'object') return null;
  const a = input as Record<string,unknown>;
  if (typeof a.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(a.id)) return null;
  for (const k of ['visitor_id','session_id']) if (typeof a[k] !== 'string' || a[k].length < 8 || a[k].length > 128) return null;
  if (typeof a.path !== 'string' || !a.path.startsWith('/') || !KINDS.includes(a.kind as typeof KINDS[number])) return null;
  const path = a.path.split(/[?#]/)[0].slice(0,500);
  return { id:a.id, visitor_id:a.visitor_id, session_id:a.session_id, site:siteForPath(path), path, kind:a.kind,
    value:short(a.value,500), target:safeUrl(a.target), referrer:safeUrl(a.referrer)?.slice(0,500) || null,
    source:short(a.source,100) || 'direct', medium:short(a.medium,100), campaign:short(a.campaign,200), content:short(a.content,200),
    device:['mobile','tablet','desktop'].includes(String(a.device)) ? a.device : 'unknown' };
}
