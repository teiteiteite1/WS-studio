"use client";
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from './analytics-client';
export default function VisitTracker() {
  const pathname = usePathname(); const last = useRef<string|null>(null);
  useEffect(()=>{ if (pathname && last.current !== pathname) { last.current=pathname; trackEvent('pageview'); } },[pathname]);
  useEffect(()=>{
    const click=(event:MouseEvent)=>{ const a=(event.target instanceof Element ? event.target.closest('a[href]') : null) as HTMLAnchorElement|null; if (!a || a.hasAttribute('download')) return; try { const u=new URL(a.href); if (!['https:','http:'].includes(u.protocol)) return; trackEvent(u.origin===location.origin?'internal_click':'outbound_click',a.getAttribute('aria-label') || a.textContent?.trim().slice(0,500),u.href); } catch {} };
    document.addEventListener('click',click,true); return ()=>document.removeEventListener('click',click,true);
  },[]); return null;
}
