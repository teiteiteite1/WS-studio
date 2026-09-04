"use client";

import { useEffect, useMemo, useState } from "react";

type Category = "ai" | "urology" | "dialysis";
type Importance = "CRITICAL" | "HIGH" | "MEDIUM";

type BriefItem = {
  id: string;
  category: Category;
  kind: "NEWS" | "PAPER";
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  whyImportant: string;
  importance: Importance;
  score: number;
  studyDesign?: string;
  keyResult?: string;
  tags?: string[];
};

type BriefResponse = { generatedAt: string; items: BriefItem[] };

const labels: Record<Category, string> = { ai: "AI", urology: "UROLOGY", dialysis: "DIALYSIS" };
const limits: Record<Category, number> = { ai: 5, urology: 3, dialysis: 3 };
const READ_KEY = "ws-brief-read-v1";

function loadRead(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function BriefClient() {
  const [data, setData] = useState<BriefResponse | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [active, setActive] = useState<Category | "all">("all");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/brief", { cache: "no-store" });
      if (!response.ok) throw new Error("brief fetch failed");
      setData((await response.json()) as BriefResponse);
    } catch {
      setError("取得に失敗しました。少ししてから更新してください。");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setReadIds(loadRead());
    void refresh();
    const onStorage = (event: StorageEvent) => { if (event.key === READ_KEY) setReadIds(loadRead()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const markRead = (id: string) => {
    setReadIds((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      localStorage.setItem(READ_KEY, JSON.stringify(next));
      return next;
    });
  };

  const markAllRead = () => {
    if (!data) return;
    const ids = Array.from(new Set([...readIds, ...data.items.map((item) => item.id)]));
    localStorage.setItem(READ_KEY, JSON.stringify(ids));
    setReadIds(ids);
  };

  const visible = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => {
      if (active !== "all" && item.category !== active) return false;
      if (onlyUnread && readIds.includes(item.id)) return false;
      return true;
    });
  }, [data, active, onlyUnread, readIds]);

  const unreadCount = data?.items.filter((item) => !readIds.includes(item.id)).length ?? 0;

  return (
    <main className="brief-shell">
      <header className="brief-header">
        <div>
          <p className="brief-kicker">WS studio / PERSONAL INTELLIGENCE</p>
          <h1>Brief</h1>
          <p className="brief-subtitle">AI・泌尿器科・透析。今日見る価値があるものだけ。</p>
        </div>
        <div className="brief-header-actions">
          <div className="brief-unread"><strong>{unreadCount}</strong><span>UNREAD</span></div>
          <button type="button" onClick={() => void refresh()} disabled={loading}>{loading ? "更新中" : "更新"}</button>
        </div>
      </header>

      <section className="brief-toolbar">
        <div className="brief-tabs" role="tablist" aria-label="カテゴリ">
          <button className={active === "all" ? "active" : ""} onClick={() => setActive("all")}>TODAY</button>
          {(Object.keys(labels) as Category[]).map((category) => (
            <button key={category} className={active === category ? "active" : ""} onClick={() => setActive(category)}>
              {labels[category]}<span>{data?.items.filter((item) => item.category === category).length ?? limits[category]}</span>
            </button>
          ))}
        </div>
        <div className="brief-filter-actions">
          <label className="brief-toggle"><input type="checkbox" checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)} /><span>未読のみ</span></label>
          <button type="button" className="brief-quiet-button" onClick={markAllRead}>すべて既読</button>
        </div>
      </section>

      {data && <div className="brief-generated">UPDATED {new Date(data.generatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>}
      {error && <div className="brief-error">{error}</div>}

      <section className="brief-list">
        {loading && !data ? <div className="brief-empty">今日の情報を集めています…</div> : visible.length === 0 ? <div className="brief-empty">ここは空っぽ。今日は静かな日です。</div> : visible.map((item) => {
          const isRead = readIds.includes(item.id);
          return (
            <article key={item.id} className={`brief-card ${isRead ? "is-read" : "is-unread"}`}>
              <div className="brief-card-topline">
                <div className="brief-badges">
                  <span className={`brief-importance importance-${item.importance.toLowerCase()}`}>{item.importance}</span>
                  <span className="brief-kind">{item.kind}</span>
                  <span className="brief-category">{labels[item.category]}</span>
                  {item.studyDesign && <span className="brief-study-design">{item.studyDesign}</span>}
                </div>
                {!isRead && <span className="brief-new-dot" aria-label="未読" />}
              </div>

              <h2>{item.title}</h2>
              <div className="brief-meta"><span>{item.source}</span><span>{new Date(item.publishedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "short", day: "numeric" })}</span></div>
              {!!item.tags?.length && <div className="brief-tags">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}

              <p className="brief-summary">{item.summary}</p>
              {item.kind === "PAPER" && item.keyResult && <div className="brief-result"><span>KEY RESULT</span><p>{item.keyResult}</p></div>}
              <div className="brief-why"><span>WHY IT MATTERS</span><p>{item.whyImportant}</p></div>

              <div className="brief-card-actions">
                <a href={item.url} target="_blank" rel="noreferrer" onClick={() => markRead(item.id)}>原文を開く ↗</a>
                <button type="button" onClick={() => markRead(item.id)} disabled={isRead}>{isRead ? "既読" : "既読にする"}</button>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="brief-footer"><p>上限：AI 5 / 泌尿器科 3 / 透析 3。重要なものがなければ無理に埋めません。</p></footer>
    </main>
  );
}
