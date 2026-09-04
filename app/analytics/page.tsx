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
type SocialMetric = {
  channel: string;
  reach: number;
  engagement: number;
  followers: number;
  note: string;
};
type SocialState = { updatedAt: string; rows: SocialMetric[] };

const SOCIAL_KEY = "ws_insights_social_v1";
const channels = ["Instagram", "Threads", "Pinterest", "Bluesky", "BASE"];
const emptySocial = (): SocialState => ({
  updatedAt: "",
  rows: channels.map((channel) => ({ channel, reach: 0, engagement: 0, followers: 0, note: "" })),
});
const nf = new Intl.NumberFormat("ja-JP");
const eventLabel: Record<string, string> = {
  gallery_open: "Gallery opens",
  music_play: "Music plays",
  shop_click: "Shop clicks",
  contact_sent: "Contacts",
  social_click: "Social clicks",
};

function numberValue(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [social, setSocial] = useState<SocialState>(emptySocial);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SOCIAL_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SocialState;
        if (Array.isArray(parsed.rows)) {
          const rows = channels.map((channel) => parsed.rows.find((row) => row.channel === channel) ?? { channel, reach: 0, engagement: 0, followers: 0, note: "" });
          setSocial({ updatedAt: parsed.updatedAt || "", rows });
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const load = () =>
      fetch("/api/stats", { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("stats");
          return response.json();
        })
        .then((data) => {
          setStats(data);
          setLoadError(false);
        })
        .catch(() => setLoadError(true));
    load();
    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const summary = useMemo(() => {
    const daily = stats?.daily ?? [];
    const best = daily.reduce<Daily | null>((winner, day) => !winner || Number(day.visitors) > Number(winner.visitors) ? day : winner, null);
    const engagement = (stats?.events ?? []).reduce((sum, event) => sum + Number(event.count), 0);
    const socialReach = social.rows.reduce((sum, row) => sum + row.reach, 0);
    const socialEngagement = social.rows.reduce((sum, row) => sum + row.engagement, 0);
    const followers = social.rows.reduce((sum, row) => sum + row.followers, 0);
    return { best, engagement, socialReach, socialEngagement, followers };
  }, [stats, social]);

  const change = !stats || !stats.yesterday ? null : Math.round(((stats.today - stats.yesterday) / stats.yesterday) * 100);
  const maxDaily = Math.max(1, ...(stats?.daily ?? []).map((day) => Number(day.visitors)));
  const hasSocial = social.rows.some((row) => row.reach || row.engagement || row.followers);

  function updateSocial(index: number, field: keyof Omit<SocialMetric, "channel">, value: string) {
    setSocial((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: field === "note" ? value : numberValue(value) } : row),
    }));
    setSaved(false);
  }

  function saveSocial() {
    const next = { ...social, updatedAt: new Date().toISOString() };
    localStorage.setItem(SOCIAL_KEY, JSON.stringify(next));
    setSocial(next);
    setSaved(true);
    setEditing(false);
  }

  const recommendations = [
    change !== null && change < 0 ? "昨日より訪問が落ちています。Social Deskから人気ページへ1本導線を作る。" : "伸びている導線を維持。人気ページ上位の作品を次のSNS投稿に再利用する。",
    (stats?.events ?? []).some((event) => event.event_name === "shop_click" && event.count > 0) ? "ショップクリックが発生中。BASE側の売上と照合して投稿別の成果を残す。" : "商品導線の反応はまだ小さめ。作品ページからBASEへの入口を1つだけ強くする。",
    hasSocial ? "SNS数値は最新スナップショットと前回値を定期比較すると、媒体ごとの勝ち筋が見えます。" : "各SNSの管理画面からリーチ・反応・フォロワーを入力すると横断集計が完成します。",
  ];

  return (
    <main className="insights">
      <style>{`
        :root{color-scheme:dark}.insights{min-height:100vh;padding:38px clamp(18px,4vw,64px) 80px;background:#080909;color:#f4f4f1;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .topline{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #272929;padding-bottom:18px}.wordmark{font-size:12px;font-weight:800;letter-spacing:.18em}.topline a{color:#999;text-decoration:none;font-size:11px;letter-spacing:.08em}
        .hero{display:grid;grid-template-columns:1.4fr .6fr;gap:24px;align-items:end;padding:58px 0 42px}.eyebrow,.label{font-size:10px;font-weight:750;letter-spacing:.16em;color:#7e8380;text-transform:uppercase}.hero h1{margin:12px 0 0;font-size:clamp(64px,12vw,176px);line-height:.76;letter-spacing:-.085em;font-weight:500}.hero-copy{color:#9b9f9c;font-size:13px;line-height:1.7;max-width:360px;margin:0 0 4px auto}
        .metrics{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #272929;border-left:1px solid #272929}.metric{min-height:160px;padding:22px;border-right:1px solid #272929;border-bottom:1px solid #272929}.metric strong{display:block;margin-top:38px;font-size:clamp(36px,5vw,68px);font-weight:520;letter-spacing:-.06em}.metric small{display:block;color:#777d79;margin-top:8px;font-size:11px}.up{color:#b7e6c7}.down{color:#f0a9a9}
        .section{margin-top:62px}.section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin-bottom:18px}.section-head h2{margin:5px 0 0;font-size:clamp(26px,4vw,48px);font-weight:520;letter-spacing:-.05em}.button{border:1px solid #393b3a;background:transparent;color:#eee;border-radius:999px;padding:10px 15px;font-size:11px;font-weight:750;cursor:pointer}.button:hover{background:#f3f3ef;color:#0a0b0b}.button.primary{background:#f3f3ef;color:#0a0b0b;border-color:#f3f3ef}
        .trend{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;height:250px}.bar{display:grid;grid-template-rows:1fr auto auto;gap:9px;text-align:center;min-width:0}.track{height:100%;background:#121414;display:flex;align-items:flex-end}.fill{display:block;width:100%;min-height:5px;background:linear-gradient(#d9ddd8,#767c77)}.bar strong{font-size:13px}.bar span{font-size:9px;color:#737874;overflow:hidden}
        .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.panel{border:1px solid #272929;padding:24px;min-width:0}.list{margin-top:18px}.list-row{display:flex;justify-content:space-between;gap:18px;border-top:1px solid #242625;padding:14px 0;font-size:12px}.list-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#b5b8b5}.empty{color:#717673;font-size:12px;padding:22px 0}
        .social-summary{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #272929}.social-summary>div{padding:22px;border-right:1px solid #272929}.social-summary>div:last-child{border:0}.social-summary strong{display:block;font-size:34px;margin-top:12px;letter-spacing:-.05em}
        .social-grid{display:grid;grid-template-columns:repeat(5,1fr);border-left:1px solid #272929;margin-top:12px}.channel{border:1px solid #272929;border-left:0;padding:18px;min-width:0}.channel h3{font-size:13px;margin:0 0 22px}.channel dl{margin:0}.channel dl div{display:flex;justify-content:space-between;border-top:1px solid #222;padding:10px 0;font-size:11px}.channel dt{color:#767b78}.channel dd{margin:0;font-weight:700}.channel p{color:#757a77;font-size:10px;line-height:1.5;min-height:30px}
        .editor{margin-top:12px;border:1px solid #363938;padding:20px}.editor-row{display:grid;grid-template-columns:130px repeat(3,1fr) 1.5fr;gap:10px;align-items:center;margin-bottom:10px}.editor-row label{font-size:12px;font-weight:700}.editor input{width:100%;background:#111313;border:1px solid #303332;color:#eee;padding:11px;border-radius:4px;font-size:12px}.editor-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.updated{color:#6f7571;font-size:10px}
        .actions{counter-reset:item}.action{display:grid;grid-template-columns:52px 1fr;gap:18px;padding:20px 0;border-top:1px solid #272929}.action:before{counter-increment:item;content:"0" counter(item);color:#626763;font-size:11px}.action p{margin:0;font-size:14px;line-height:1.65;color:#c6c9c6}.foot{margin-top:70px;padding-top:18px;border-top:1px solid #272929;color:#646966;font-size:10px;display:flex;justify-content:space-between;gap:20px}
        @media(max-width:900px){.hero{grid-template-columns:1fr}.hero-copy{margin:0}.metrics{grid-template-columns:1fr 1fr}.two{grid-template-columns:1fr}.social-grid{grid-template-columns:1fr 1fr}.editor-row{grid-template-columns:1fr 1fr}.editor-row label{grid-column:1/-1}.social-summary{grid-template-columns:1fr}.social-summary>div{border-right:0;border-bottom:1px solid #272929}}
        @media(max-width:560px){.insights{padding-top:24px}.hero{padding-top:44px}.metrics{grid-template-columns:1fr 1fr}.metric{min-height:132px;padding:16px}.metric strong{margin-top:28px}.trend{height:190px;gap:4px}.social-grid{grid-template-columns:1fr}.section-head{align-items:flex-start;flex-direction:column}.foot{flex-direction:column}.editor-row{grid-template-columns:1fr}.social-summary strong{font-size:29px}}
      `}</style>

      <div className="topline"><span className="wordmark">WS STUDIO</span><a href="/">OFFICIAL SITE ↗</a></div>
      <header className="hero">
        <div><div className="eyebrow">Private performance desk</div><h1>INSIGHTS</h1></div>
        <p className="hero-copy">公式サイトの実アクセスと、各SNS・ショップの最新スナップショットを一画面で。数字を眺めるだけでなく、次の一手まで整理します。</p>
      </header>

      <section className="metrics" aria-label="公式サイト主要指標">
        <div className="metric"><div className="label">Today</div><strong>{stats ? nf.format(stats.today) : "—"}</strong><small>{change === null ? "前日比 —" : <span className={change >= 0 ? "up" : "down"}>{change >= 0 ? "↑" : "↓"} {Math.abs(change)}% vs yesterday</span>}</small></div>
        <div className="metric"><div className="label">Live / 5 min</div><strong>{stats ? nf.format(stats.now) : "—"}</strong><small>active visitors</small></div>
        <div className="metric"><div className="label">Pageviews today</div><strong>{stats ? nf.format(stats.pageviews_today) : "—"}</strong><small>official site</small></div>
        <div className="metric"><div className="label">Engagement</div><strong>{stats ? nf.format(summary.engagement) : "—"}</strong><small>tracked actions</small></div>
      </section>
      {loadError && <p className="empty">公式サイトの集計を一時的に読み込めません。自動で再試行します。</p>}

      <section className="section">
        <div className="section-head"><div><div className="label">Official site</div><h2>7 day movement</h2></div><span className="updated">60秒ごとに更新 · 日本時間</span></div>
        <div className="trend">{(stats?.daily ?? []).map((day) => <div key={day.day} className="bar"><div className="track"><i className="fill" style={{ height: `${Math.max(3, Number(day.visitors) / maxDaily * 100)}%` }} /></div><strong>{day.visitors}</strong><span>{day.day}</span></div>)}</div>
        <div className="two">
          <div className="panel"><div className="label">Popular pages</div><div className="list">{stats?.top_paths?.length ? stats.top_paths.map((path) => <div className="list-row" key={path.path}><span>{path.path}</span><strong>{nf.format(path.views)}</strong></div>) : <div className="empty">まだデータがありません。</div>}</div></div>
          <div className="panel"><div className="label">Actions</div><div className="list">{stats?.events?.length ? stats.events.map((event) => <div className="list-row" key={event.event_name}><span>{eventLabel[event.event_name] ?? event.event_name}</span><strong>{nf.format(event.count)}</strong></div>) : <div className="empty">まだデータがありません。</div>}</div></div>
        </div>
      </section>

      <section className="section">
        <div className="section-head"><div><div className="label">Cross-channel snapshot</div><h2>Social + Shop</h2></div><button className="button" onClick={() => setEditing((value) => !value)}>{editing ? "CLOSE" : "UPDATE NUMBERS"}</button></div>
        <div className="social-summary">
          <div><div className="label">Total reach</div><strong>{hasSocial ? nf.format(summary.socialReach) : "—"}</strong></div>
          <div><div className="label">Total reactions</div><strong>{hasSocial ? nf.format(summary.socialEngagement) : "—"}</strong></div>
          <div><div className="label">Audience / followers</div><strong>{hasSocial ? nf.format(summary.followers) : "—"}</strong></div>
        </div>
        <div className="social-grid">{social.rows.map((row) => <article className="channel" key={row.channel}><h3>{row.channel}</h3><dl><div><dt>Reach</dt><dd>{row.reach ? nf.format(row.reach) : "—"}</dd></div><div><dt>Reactions</dt><dd>{row.engagement ? nf.format(row.engagement) : "—"}</dd></div><div><dt>{row.channel === "BASE" ? "Orders" : "Followers"}</dt><dd>{row.followers ? nf.format(row.followers) : "—"}</dd></div></dl><p>{row.note || "メモなし"}</p></article>)}</div>
        {editing && <div className="editor">
          {social.rows.map((row, index) => <div className="editor-row" key={row.channel}><label>{row.channel}</label><input inputMode="numeric" aria-label={`${row.channel} reach`} value={row.reach || ""} placeholder="リーチ" onChange={(event) => updateSocial(index, "reach", event.target.value)} /><input inputMode="numeric" aria-label={`${row.channel} reactions`} value={row.engagement || ""} placeholder="反応数" onChange={(event) => updateSocial(index, "engagement", event.target.value)} /><input inputMode="numeric" aria-label={`${row.channel} audience`} value={row.followers || ""} placeholder={row.channel === "BASE" ? "注文数" : "フォロワー"} onChange={(event) => updateSocial(index, "followers", event.target.value)} /><input aria-label={`${row.channel} note`} value={row.note} placeholder="期間・投稿・売上などのメモ" onChange={(event) => updateSocial(index, "note", event.target.value)} /></div>)}
          <div className="editor-actions"><button className="button" onClick={() => setEditing(false)}>CANCEL</button><button className="button primary" onClick={saveSocial}>SAVE SNAPSHOT</button></div>
        </div>}
        <p className="updated">{saved ? "保存しました。 " : ""}{social.updatedAt ? `最終更新 ${new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(social.updatedAt))} · ` : ""}SNS・BASEの値はこの端末だけに保存されます。</p>
      </section>

      <section className="section">
        <div className="section-head"><div><div className="label">Next moves</div><h2>What to do now</h2></div>{summary.best && <span className="updated">7日間の最高値 {summary.best.day} / {summary.best.visitors}</span>}</div>
        <div className="actions">{recommendations.map((recommendation) => <div className="action" key={recommendation}><p>{recommendation}</p></div>)}</div>
      </section>

      <footer className="foot"><span>匿名ブラウザIDによる概算値。SNS値は各管理画面から入力した実数のみ。</span><span>WS STUDIO / INSIGHTS</span></footer>
    </main>
  );
}
