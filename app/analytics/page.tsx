"use client";

import { useEffect, useState } from "react";

const URL = "https://udjpqsmihauksbceaxww.supabase.co";
const KEY = "sb_publishable_vNHL7xgpDLBfYhTblDQUZg_us4Xbnss";

type Stats = { today: number; total: number; pageviews_today: number; pageviews_total: number };

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    const load = () => fetch(`${URL}/rest/v1/rpc/ws_public_stats`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" })
      .then(r => r.json()).then(setStats).catch(() => {});
    load(); const timer = setInterval(load, 60000); return () => clearInterval(timer);
  }, []);
  return <main style={{minHeight:"100vh",padding:"120px max(6vw,24px)",background:"#f8faf9",color:"#0b1a22"}}>
    <p style={{letterSpacing:".18em",fontSize:11}}>WS STUDIO / LIVE ANALYTICS</p>
    <h1 style={{fontSize:"clamp(54px,9vw,130px)",letterSpacing:"-.07em",margin:"28px 0 70px"}}>VISITORS</h1>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,maxWidth:1000}}>
      {[['TODAY',stats?.today],['TOTAL',stats?.total],['PAGEVIEWS TODAY',stats?.pageviews_today],['PAGEVIEWS TOTAL',stats?.pageviews_total]].map(([label,value])=><section key={String(label)} style={{padding:32,border:"1px solid rgba(11,26,34,.13)",borderRadius:28}}><p style={{fontSize:10,letterSpacing:".14em"}}>{label}</p><strong style={{display:"block",fontSize:54,fontWeight:450,letterSpacing:"-.06em",marginTop:24}}>{value ?? '—'}</strong></section>)}
    </div>
    <p style={{marginTop:40,color:"#687980",fontSize:12}}>匿名ブラウザIDによる概算ユニーク訪問者数。60秒ごとに更新。</p>
  </main>;
}
