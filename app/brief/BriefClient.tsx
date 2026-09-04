"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SyncAccount from "../components/SyncAccount";
import { getBriefReadIds, PersonalSession, saveBriefReadIds } from "../lib/personalSync";

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

function persistRead(ids: string[]) {
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(new Set(ids))));
}

export default function BriefClient() {
  const [data, setData] = useState<BriefResponse | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [session, setSession] = useState<PersonalSession | null>(null);
  const [syncing, setSyncing] = useState(false);
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

  const handleSession = useCallback(async (nextSession: PersonalSession | null) => {
    setSession(nextSession);
    if (!nextSession) return;
    setSyncing(true);
    try {
      const local = loadRead();
      const cloud = await getBriefReadIds(nextSession);
      const merged = Array.from(new Set([...local, ...cloud]));
      persistRead(merged);
      setReadIds(merged);
      await saveBriefReadIds(nextSession, merged);
    } catch {
      setError("同期だけ失敗しました。端末内の既読情報は保持されています。");
    } finally {
      setSyncing(false);
    }
  }, []);

  const markRead = (id: string) => {
    setReadIds((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      persistRead(next);
      if (session) void saveBriefReadIds(session, [id]).catch(() => setError("既読のクラウド同期に失敗しました。端末には保存済みです。"));
      return next;
    });
  };

  const togglePaper = (id: string) => {
    setExpandedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    markRead(id);
  };

  const markAllRead = () => {
    if (!data) return;
    const ids = Array.from(new Set([...readIds, ...data.items.map((item) => item.id)]));
    persistRead(ids);
    setReadIds(ids);
    if (session) void saveBriefReadIds(session, ids).catch(() => setError("既読のクラウド同期に失敗しました。端末には保存済みです。"));
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
          <SyncAccount onSessionChange={handleSession} />
          {syncing && <span className="brief-syncing">SYNCING…</span>}
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
          const isPaper = item.kind === "PAPER";
          const expanded = expandedIds.includes(item.id);
          return (
            <article key={item.id} className={`brief-card ${isRead ? "is-read" : "is-unread"} ${isPaper ? "is-paper" : "is-news"} ${expanded ? "is-expanded" : ""}`}>
              <div className="brief-card-topline">
                <div className="brief-badges">
                  <span className={`brief-importance importance-${item.importance.toLowerCase()}`}>{item.importance}</span>
                  <span className="brief-kind">{item.kind}</span>
                  <span className="brief-category">{labels[item.category]}</span>
                  {isPaper && item.studyDesign && <span className="brief-study-design">{item.studyDesign}</span>}
                </div>
                {!isRead && <span className="brief-new-dot" aria-label="未読" />}
              </div>

              {isPaper ? (
                <button type="button" className="brief-paper-toggle" onClick={() => togglePaper(item.id)} aria-expanded={expanded}>
                  <span className="brief-paper-title">{item.title}</span>
                  <span className="brief-paper-chevron">{expanded ? "−" : "+"}</span>
                </button>
              ) : (
                <h2>{item.title}</h2>
              )}

              <div className="brief-meta"><span>{item.source}</span><span>{new Date(item.publishedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "short", day: "numeric" })}</span></div>
              {isPaper && !!item.tags?.length && <div className="brief-tags">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}

              {!isPaper && (
                <div className="brief-card-actions brief-news-actions">
                  <a href={item.url} target="_blank" rel="noreferrer" onClick={() => markRead(item.id)}>ニュースを開く ↗</a>
                  <button type="button" onClick={() => markRead(item.id)} disabled={isRead}>{isRead ? "既読" : "既読にする"}</button>
                </div>
              )}

              {isPaper && expanded && (
                <div className="brief-paper-detail">
                  <div className="brief-paper-section">
                    <span className="brief-paper-label">要約</span>
                    <p className="brief-summary">{item.summary}</p>
                  </div>

                  {item.keyResult && (
                    <div className="brief-result">
                      <span>主要結果</span>
                      <p>{item.keyResult}</p>
                    </div>
                  )}

                  <div className="brief-conclusion">
                    <span>結論 / CLINICAL BOTTOM LINE</span>
                    <p>{item.whyImportant}</p>
                  </div>

                  <div className="brief-card-actions">
                    <a href={item.url} target="_blank" rel="noreferrer">PubMed / 原文を開く ↗</a>
                    <button type="button" onClick={() => togglePaper(item.id)}>閉じる</button>
                  </div>
                </div>
              )}

              {isPaper && !expanded && (
                <div className="brief-paper-hint">クリックで要約・主要結果・結論を表示</div>
              )}
            </article>
          );
        })}
      </section>

      <footer className="brief-footer"><p>上限：AI 5 / 泌尿器科 3 / 透析 3。重要なものがなければ無理に埋めません。</p></footer>
    </main>
  );
}
