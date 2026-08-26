"use client";

import { useEffect, useMemo, useState } from "react";

type Daily = { day: string; visitors: number };
type PathStat = { path: string; views: number };
type EventStat = { event_name: string; count: number };
type Stats = { today: number; yesterday: number; now: number; total: number; pageviews_today: number; pageviews_total: number; daily: Daily[]; top_paths: PathStat[]; events: EventStat[] };

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    const load = () => fetch("/api/stats", { cache: "no-store" }).then((r) => r.json()).then(setStats).catch(() => {});
    load(); const timer = window.setInterval(load, 60000); return () => window.clearInterval(timer);
  }, []);

  const change = useMemo(() => (!stats || !stats.yesterday ? null : Math.round(((stats.today - stats.yesterday) / stats.yesterday) * 100)), [stats]);
  const maxDaily = Math.max(1, ...(stats?.daily ?? []).map((d) => Number(d.visitors)));
  const eventLabel: Record<string, string> = { gallery_open: "Gallery opens", music_play: "Music plays", shop_click: "Shop clicks", contact_sent: "Contacts", social_click: "Social clicks" };

  return (
    <main className="analytics-page">
      <style>{`
        .analytics-page{min-height:100vh;padding:110px max(5vw,24px) 80px;background:#f8faf9;color:#0b1a22}
        .analytics-kicker{margin:0;color:#687980;font-size:10px;font-weight:700;letter-spacing:.18em}
        .analytics-heading-row{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:28px 0 58px}
        .analytics-heading-row h1{margin:0;font-size:clamp(58px,9vw,130px);font-weight:430;letter-spacing:-.075em;line-height:.86}
        .analytics-heading-row a{padding-bottom:8px;color:#687980;font-size:9px;font-weight:700;letter-spacing:.12em}
        .analytics-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .analytics-metrics section,.analytics-block{border:1px solid rgba(11,26,34,.12);border-radius:28px;background:rgba(255,255,255,.56)}
        .analytics-metrics section{padding:26px}.analytics-metrics p{margin:0;color:#687980;font-size:9px;font-weight:700;letter-spacing:.14em}
        .analytics-metrics strong{display:block;margin-top:24px;font-size:clamp(38px,5vw,62px);font-weight:450;letter-spacing:-.065em;line-height:1}
        .analytics-change{margin:18px 2px 54px;color:#687980;font-size:11px;letter-spacing:.02em}
        .analytics-block{padding:28px;margin-top:18px}.analytics-block h2{margin:0 0 28px;font-size:10px;letter-spacing:.14em;color:#687980}
        .analytics-bars{height:220px;display:grid;grid-template-columns:repeat(7,1fr);gap:12px;align-items:end}.analytics-bar-item{height:100%;display:grid;grid-template-rows:1fr auto auto;gap:7px;text-align:center}
        .analytics-bar-track{height:100%;display:flex;align-items:end;border-radius:12px;background:rgba(103,127,135,.08);overflow:hidden}.analytics-bar-track i{display:block;width:100%;border-radius:12px 12px 0 0;background:#789198;min-height:6px}
        .analytics-bar-item strong{font-size:13px;font-weight:600}.analytics-bar-item span{color:#78898f;font-size:8px}
        .analytics-columns{display:grid;grid-template-columns:1fr 1fr;gap:18px}.analytics-list{display:grid}.analytics-list div{display:flex;justify-content:space-between;gap:20px;padding:14px 0;border-top:1px solid rgba(11,26,34,.09);font-size:11px}.analytics-list strong{font-weight:650}
        .analytics-note{margin:38px 2px 0;color:#74878d;font-size:10px}
        @media(max-width:760px){.analytics-metrics{grid-template-columns:1fr 1fr}.analytics-columns{grid-template-columns:1fr}.analytics-heading-row{align-items:flex-start;flex-direction:column}.analytics-bars{gap:6px;height:180px}}
      `}</style>
      <p className="analytics-kicker">WS STUDIO / LIVE ANALYTICS</p>
      <div className="analytics-heading-row"><h1>VISITORS</h1><a href="/">BACK TO SITE ↗</a></div>
      <div className="analytics-metrics">{[['TODAY', stats?.today], ['YESTERDAY', stats?.yesterday], ['NOW / 5 MIN', stats?.now], ['TOTAL', stats?.total]].map(([label, value]) => <section key={String(label)}><p>{label}</p><strong>{value ?? '—'}</strong></section>)}</div>
      <div className="analytics-change">{change === null ? "前日比 —" : `前日比 ${change >= 0 ? '↑' : '↓'}${Math.abs(change)}%`} · PV TODAY {stats?.pageviews_today ?? '—'} · PV TOTAL {stats?.pageviews_total ?? '—'}</div>
      <section className="analytics-block"><h2>LAST 7 DAYS</h2><div className="analytics-bars">{(stats?.daily ?? []).map((d) => <div key={d.day} className="analytics-bar-item"><div className="analytics-bar-track"><i style={{height:`${Math.max(6,(Number(d.visitors)/maxDaily)*100)}%`}} /></div><strong>{d.visitors}</strong><span>{d.day}</span></div>)}</div></section>
      <div className="analytics-columns"><section className="analytics-block"><h2>POPULAR PAGES</h2><div className="analytics-list">{(stats?.top_paths ?? []).map((p)=><div key={p.path}><span>{p.path}</span><strong>{p.views}</strong></div>)}</div></section><section className="analytics-block"><h2>ENGAGEMENT</h2><div className="analytics-list">{(stats?.events ?? []).map((e)=><div key={e.event_name}><span>{eventLabel[e.event_name] ?? e.event_name}</span><strong>{e.count}</strong></div>)}</div></section></div>
      <p className="analytics-note">匿名ブラウザIDによる概算値。NOWは直近5分、日付区切りは日本時間。60秒ごとに更新。</p>
    </main>
  );
}
