"use client";

import { useEffect, useMemo, useState } from "react";

type Daily = { day: string; visitors: number };
type PathStat = { path: string; views: number };
type EventStat = { event_name: string; count: number };
type Stats = {
  today: number;
  yesterday: number;
  now: number;
  total: number;
  pageviews_today: number;
  pageviews_total: number;
  daily: Daily[];
  top_paths: PathStat[];
  events: EventStat[];
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    const load = () => fetch("/api/stats", { cache: "no-store" }).then((r) => r.json()).then(setStats).catch(() => {});
    load();
    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const change = useMemo(() => {
    if (!stats || !stats.yesterday) return null;
    return Math.round(((stats.today - stats.yesterday) / stats.yesterday) * 100);
  }, [stats]);
  const maxDaily = Math.max(1, ...(stats?.daily ?? []).map((d) => Number(d.visitors)));
  const eventLabel: Record<string, string> = {
    gallery_open: "Gallery opens",
    music_play: "Music plays",
    shop_click: "Shop clicks",
    contact_sent: "Contacts",
    social_click: "Social clicks",
  };

  return (
    <main className="analytics-page">
      <p className="analytics-kicker">WS STUDIO / LIVE ANALYTICS</p>
      <div className="analytics-heading-row"><h1>VISITORS</h1><a href="/">BACK TO SITE ↗</a></div>
      <div className="analytics-metrics">
        {[['TODAY', stats?.today], ['YESTERDAY', stats?.yesterday], ['NOW / 5 MIN', stats?.now], ['TOTAL', stats?.total]].map(([label, value]) => (
          <section key={String(label)}><p>{label}</p><strong>{value ?? '—'}</strong></section>
        ))}
      </div>
      <div className="analytics-change">{change === null ? "前日比 —" : `前日比 ${change >= 0 ? '↑' : '↓'}${Math.abs(change)}%`} · PV TODAY {stats?.pageviews_today ?? '—'} · PV TOTAL {stats?.pageviews_total ?? '—'}</div>

      <section className="analytics-block">
        <h2>LAST 7 DAYS</h2>
        <div className="analytics-bars">{(stats?.daily ?? []).map((d) => <div key={d.day} className="analytics-bar-item"><div className="analytics-bar-track"><i style={{height: `${Math.max(6, (Number(d.visitors) / maxDaily) * 100)}%`}} /></div><strong>{d.visitors}</strong><span>{d.day}</span></div>)}</div>
      </section>

      <div className="analytics-columns">
        <section className="analytics-block"><h2>POPULAR PAGES</h2><div className="analytics-list">{(stats?.top_paths ?? []).map((p) => <div key={p.path}><span>{p.path}</span><strong>{p.views}</strong></div>)}</div></section>
        <section className="analytics-block"><h2>ENGAGEMENT</h2><div className="analytics-list">{(stats?.events ?? []).map((e) => <div key={e.event_name}><span>{eventLabel[e.event_name] ?? e.event_name}</span><strong>{e.count}</strong></div>)}</div></section>
      </div>
      <p className="analytics-note">匿名ブラウザIDによる概算値。NOWは直近5分、日付区切りは日本時間。60秒ごとに更新。</p>
    </main>
  );
}
