'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isPublicPath, isPublicTarget } from './lib/telemetry';
type Event = {url:string;[key:string]:unknown};
type AnalyticsWindow = Window & {va?: (...args:unknown[])=>void;vaq?:unknown[][]};
export default function PublicAnalytics() {
 const pathname=usePathname();
 useEffect(()=>{
  if(process.env.NODE_ENV!=='production'||!isPublicPath(pathname)||!isPublicTarget(document.referrer||null))return;
  const w=window as AnalyticsWindow;
  w.va=w.va||((...args:unknown[])=>{(w.vaq=w.vaq||[]).push(args);});
  w.va('beforeSend',(event:Event)=>{
   try { if(localStorage.getItem('ws_analytics_exclude')==='1'||!isPublicPath(new URL(event.url).pathname)||!isPublicTarget(document.referrer||null))return null; } catch { return null; }
   return event;
  });
  if(!document.querySelector('script[data-ws-public-analytics]')){
   const script=document.createElement('script');script.src='/_vercel/insights/script.js';script.defer=true;script.dataset.wsPublicAnalytics='1';document.head.appendChild(script);
  }
 },[pathname]);
 return null;
}
