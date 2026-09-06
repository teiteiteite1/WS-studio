"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SyncAccount from "../components/SyncAccount";
import { getBriefReadIds, PersonalSession, saveBriefReadIds } from "../lib/personalSync";

type Category = "ai" | "urology" | "dialysis";
type Importance = "CRITICAL" | "HIGH" | "MEDIUM";
type RelatedLesson = { day: number; title: string; term: string };
type BriefItem = {
  id: string;
  category: Category;
  kind: "NEWS" | "PAPER";
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  whatHappened?: string;
  detailSummary?: string;
  whyImportant: string;
  creatorImpact?: string;
  talkPoints?: string[];
  relatedLessons?: RelatedLesson[];
  sourceType?: "PRIMARY" | "REPORTING" | "OTHER";
  company?: string;
  industryScore?: number;
  creatorScore?: number;
  analysisStatus?: "complete" | "headline-only";
  importance: Importance;
  score: number;
  studyDesign?: string;
  keyResult?: string;
  tags?: string[];
};
type BriefResponse = { generatedAt: string; methodologyVersion?: string; items: BriefItem[] };
type NewsSummary = {
  whatHappened: string;
  summary?: string;
  whyImportant: string;
  creatorImpact?: string;
  talkPoints?: string[];
  relatedLessons?: RelatedLesson[];
  model?: string;
  usedWebSearch?: boolean;
};
type PaperSummary = { japaneseTitle: string; bottomLine: string; population: string; studyDesign: string; intervention: string; comparator: string; keyResults: string; clinicalImpact: string; limitations: string; model?: string };

const labels: Record<Category, string> = { ai: "AI", urology: "UROLOGY", dialysis: "DIALYSIS" };
const limits: Record<Category, number> = { ai: 5, urology: 3, dialysis: 3 };
const READ_KEY = "ws-brief-read-v1";
const API_KEY_LOCAL = "ws_control_openai_key";
const API_KEY_SESSION = "ws_control_openai_key_session";
const FEED_CACHE_KEY = "ws-brief-feed-v3";
const NEWS_CACHE_PREFIX = "ws-brief-news-summary-v3:";
const PAPER_CACHE_PREFIX = "ws-brief-paper-summary-v3:";
const FEED_CACHE_MS = 15 * 60 * 1000;

function loadRead(): string[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(READ_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function persistRead(ids: string[]) { localStorage.setItem(READ_KEY, JSON.stringify(Array.from(new Set(ids)))); }
function apiKey() { if (typeof window === "undefined") return ""; return sessionStorage.getItem(API_KEY_SESSION) || localStorage.getItem(API_KEY_LOCAL) || ""; }
function readCache<T>(key: string): T | null { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function writeCache(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

function sourceLabel(type?: BriefItem["sourceType"]) {
  if (type === "PRIMARY") return "一次情報";
  if (type === "REPORTING") return "主要報道";
  return "情報源";
}

export default function BriefClient() {
  const [data, setData] = useState<BriefResponse | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [newsSummaries, setNewsSummaries] = useState<Record<string, NewsSummary>>({});
  const [paperSummaries, setPaperSummaries] = useState<Record<string, PaperSummary>>({});
  const [itemLoading, setItemLoading] = useState<Record<string, boolean>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [keyDraft, setKeyDraft] = useState("");
  const [session, setSession] = useState<PersonalSession | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [active, setActive] = useState<Category | "all">("all");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [lessonFilter, setLessonFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async (force = false) => {
    setError("");
    if (!force) {
      const cached = readCache<{ savedAt: number; data: BriefResponse }>(FEED_CACHE_KEY);
      if (cached && Date.now() - cached.savedAt < FEED_CACHE_MS) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const key = apiKey();
      const response = await fetch("/api/brief", { cache: "no-store", headers: key ? { "x-openai-key": key } : undefined });
      if (!response.ok) throw new Error();
      const next = await response.json() as BriefResponse;
      setData(next);
      writeCache(FEED_CACHE_KEY, { savedAt: Date.now(), data: next });
    } catch {
      const cached = readCache<{ data: BriefResponse }>(FEED_CACHE_KEY);
      if (cached?.data) setData(cached.data);
      setError("取得に失敗しました。保存済みの内容があれば、そのまま表示しています。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setReadIds(loadRead());
    const requestedLesson = Number(new URLSearchParams(window.location.search).get("lesson"));
    if (Number.isInteger(requestedLesson) && requestedLesson >= 1 && requestedLesson <= 30) {
      setLessonFilter(requestedLesson);
      setActive("ai");
    }
    void refresh();
    const handleStorage = (event: StorageEvent) => { if (event.key === READ_KEY) setReadIds(loadRead()); };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refresh]);

  const handleSession = useCallback(async (next: PersonalSession | null) => {
    setSession(next);
    if (!next) return;
    setSyncing(true);
    try {
      const local = loadRead();
      const cloud = await getBriefReadIds(next);
      const merged = Array.from(new Set([...local, ...cloud]));
      persistRead(merged);
      setReadIds(merged);
      await saveBriefReadIds(next, merged);
    } catch {
      setError("同期だけ失敗しました。端末内の既読情報は保持されています。");
    } finally {
      setSyncing(false);
    }
  }, []);

  const markRead = (id: string) => setReadIds((current) => {
    if (current.includes(id)) return current;
    const next = [...current, id];
    persistRead(next);
    if (session) void saveBriefReadIds(session, [id]).catch(() => setError("既読のクラウド同期に失敗しました。端末には保存済みです。"));
    return next;
  });

  const loadNewsSummary = async (item: BriefItem) => {
    const cached = readCache<NewsSummary>(`${NEWS_CACHE_PREFIX}${item.id}`);
    if (cached) { setNewsSummaries((current) => ({ ...current, [item.id]: cached })); return; }
    if (itemLoading[item.id]) return;
    setItemLoading((current) => ({ ...current, [item.id]: true }));
    setItemErrors((current) => ({ ...current, [item.id]: "" }));
    try {
      const key = apiKey();
      const response = await fetch("/api/brief/news-summary", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", ...(key ? { "x-openai-key": key } : {}) },
        body: JSON.stringify({ title: item.title, source: item.source, url: item.url, summary: item.whatHappened || item.summary }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "ニュース解説に失敗しました。");
      const value: NewsSummary = {
        whatHappened: String(payload.whatHappened || payload.summary || ""),
        summary: String(payload.summary || payload.whatHappened || ""),
        whyImportant: String(payload.whyImportant || ""),
        creatorImpact: String(payload.creatorImpact || ""),
        talkPoints: Array.isArray(payload.talkPoints) ? payload.talkPoints.map(String) : [],
        relatedLessons: Array.isArray(payload.relatedLessons) ? payload.relatedLessons : item.relatedLessons,
        model: payload.model,
        usedWebSearch: payload.usedWebSearch,
      };
      if (!value.whatHappened) throw new Error("解説が空でした。");
      writeCache(`${NEWS_CACHE_PREFIX}${item.id}`, value);
      setNewsSummaries((current) => ({ ...current, [item.id]: value }));
    } catch (cause) {
      setItemErrors((current) => ({ ...current, [item.id]: cause instanceof Error ? cause.message : "ニュース解説に失敗しました。" }));
    } finally {
      setItemLoading((current) => ({ ...current, [item.id]: false }));
    }
  };

  const loadPaperSummary = async (item: BriefItem) => {
    const cached = readCache<PaperSummary>(`${PAPER_CACHE_PREFIX}${item.id}`);
    if (cached) { setPaperSummaries((current) => ({ ...current, [item.id]: cached })); return; }
    if (itemLoading[item.id]) return;
    setItemLoading((current) => ({ ...current, [item.id]: true }));
    setItemErrors((current) => ({ ...current, [item.id]: "" }));
    try {
      const key = apiKey();
      const response = await fetch("/api/brief/paper-summary", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", ...(key ? { "x-openai-key": key } : {}) },
        body: JSON.stringify({ title: item.title, source: item.source, url: item.url, category: item.category }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "論文解説に失敗しました。");
      const value: PaperSummary = {
        japaneseTitle: String(payload.japaneseTitle || item.title), bottomLine: String(payload.bottomLine || ""), population: String(payload.population || ""),
        studyDesign: String(payload.studyDesign || ""), intervention: String(payload.intervention || ""), comparator: String(payload.comparator || ""),
        keyResults: String(payload.keyResults || ""), clinicalImpact: String(payload.clinicalImpact || ""), limitations: String(payload.limitations || ""), model: payload.model,
      };
      if (!value.bottomLine) throw new Error("論文解説が空でした。");
      writeCache(`${PAPER_CACHE_PREFIX}${item.id}`, value);
      setPaperSummaries((current) => ({ ...current, [item.id]: value }));
    } catch (cause) {
      setItemErrors((current) => ({ ...current, [item.id]: cause instanceof Error ? cause.message : "論文解説に失敗しました。" }));
    } finally {
      setItemLoading((current) => ({ ...current, [item.id]: false }));
    }
  };

  const toggleDetail = (item: BriefItem) => {
    const opening = !expandedIds.includes(item.id);
    setExpandedIds((current) => opening ? [...current, item.id] : current.filter((id) => id !== item.id));
    if (!opening) return;
    markRead(item.id);
    if (item.kind === "PAPER") void loadPaperSummary(item);
    else if (item.analysisStatus !== "complete") void loadNewsSummary(item);
  };

  const saveKeyAndRetry = (item: BriefItem) => {
    const key = keyDraft.trim();
    if (!key) return;
    localStorage.setItem(API_KEY_LOCAL, key);
    setKeyDraft("");
    if (item.kind === "NEWS") void loadNewsSummary(item); else void loadPaperSummary(item);
  };

  const markAllRead = () => {
    if (!data) return;
    const ids = Array.from(new Set([...readIds, ...data.items.map((item) => item.id)]));
    persistRead(ids);
    setReadIds(ids);
    if (session) void saveBriefReadIds(session, ids).catch(() => setError("既読のクラウド同期に失敗しました。端末には保存済みです。"));
  };

  const baseVisible = useMemo(() => !data ? [] : data.items.filter((item) => (active === "all" || item.category === active) && (!onlyUnread || !readIds.includes(item.id))), [data, active, onlyUnread, readIds]);
  const lessonMatches = lessonFilter ? baseVisible.filter((item) => item.relatedLessons?.some((lesson) => lesson.day === lessonFilter)) : [];
  const visible = lessonFilter && lessonMatches.length ? lessonMatches : baseVisible;
  const unreadCount = data?.items.filter((item) => !readIds.includes(item.id)).length ?? 0;

  return (
    <main className="brief-shell">
      <header className="brief-header">
        <div>
          <p className="brief-kicker">WS studio / PERSONAL INTELLIGENCE</p>
          <h1>Brief</h1>
          <p className="brief-subtitle">AI業界の「今日」を5〜10分で理解する。医療ニュース・論文もこれまで通り。</p>
        </div>
        <div className="brief-header-actions">
          <SyncAccount onSessionChange={handleSession} />
          {syncing && <span className="brief-syncing">SYNCING…</span>}
          <div className="brief-unread"><strong>{unreadCount}</strong><span>UNREAD</span></div>
          <button type="button" onClick={() => void refresh(true)} disabled={loading}>{loading ? "更新中" : "更新"}</button>
        </div>
      </header>

      <div className="brief-role-note"><b>Brief</b><span>今起きていること</span><i>↔</i><b>AI30</b><span>理解するための土台</span></div>

      <section className="brief-toolbar">
        <div className="brief-tabs" role="tablist" aria-label="カテゴリ">
          <button className={active === "all" ? "active" : ""} onClick={() => { setActive("all"); setLessonFilter(null); }}>TODAY</button>
          {(Object.keys(labels) as Category[]).map((category) => <button key={category} className={active === category ? "active" : ""} onClick={() => { setActive(category); if (category !== "ai") setLessonFilter(null); }}>{labels[category]}<span>{data?.items.filter((item) => item.category === category).length ?? limits[category]}</span></button>)}
        </div>
        <div className="brief-filter-actions">
          <label className="brief-toggle"><input type="checkbox" checked={onlyUnread} onChange={(event) => setOnlyUnread(event.target.checked)} /><span>未読のみ</span></label>
          <button className="brief-quiet-button" onClick={markAllRead}>すべて既読</button>
        </div>
      </section>

      {lessonFilter && <div className="brief-lesson-filter"><span>AI30 DAY {String(lessonFilter).padStart(2, "0")} の関連ニュース{lessonMatches.length ? `：${lessonMatches.length}件` : "：今日の該当記事なし"}</span><button onClick={() => setLessonFilter(null)}>すべて表示</button></div>}
      {data && <div className="brief-generated">UPDATED {new Date(data.generatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>}
      {error && <div className="brief-error">{error}</div>}

      <section className="brief-list">
        {loading && !data ? <div className="brief-empty">今日の情報を集め、重複と偏りを整理しています…</div> : visible.length === 0 ? <div className="brief-empty">ここは空っぽ。重要な更新がなければ無理に埋めません。</div> : visible.map((item) => {
          const isRead = readIds.includes(item.id);
          const isPaper = item.kind === "PAPER";
          const expanded = expandedIds.includes(item.id);
          const generatedNews = newsSummaries[item.id];
          const news = {
            whatHappened: generatedNews?.whatHappened || item.whatHappened || item.summary,
            whyImportant: generatedNews?.whyImportant || item.whyImportant,
            creatorImpact: generatedNews?.creatorImpact ?? item.creatorImpact,
            talkPoints: generatedNews?.talkPoints ?? item.talkPoints ?? [],
            relatedLessons: generatedNews?.relatedLessons ?? item.relatedLessons ?? [],
          };
          const paper = paperSummaries[item.id];
          const itemError = itemErrors[item.id];
          const waiting = itemLoading[item.id];
          const needsKey = /APIキー|API key/i.test(itemError || "");
          const displayTitle = isPaper && paper?.japaneseTitle ? paper.japaneseTitle : item.title;
          return (
            <article key={item.id} className={`brief-card ${isRead ? "is-read" : "is-unread"} ${isPaper ? "is-paper" : "is-news"} ${expanded ? "is-expanded" : ""}`}>
              <div className="brief-card-topline">
                <div className="brief-badges">
                  <span className={`brief-importance importance-${item.importance.toLowerCase()}`}>{item.importance}</span>
                  <span className="brief-kind">{item.kind}</span>
                  <span className="brief-category">{labels[item.category]}</span>
                  {!isPaper && <span className={`brief-source-type source-${(item.sourceType || "OTHER").toLowerCase()}`}>{sourceLabel(item.sourceType)}</span>}
                  {isPaper && item.studyDesign && <span className="brief-study-design">{item.studyDesign}</span>}
                </div>
                {!isRead && <span className="brief-new-dot" aria-label="未読" />}
              </div>
              <button type="button" className="brief-paper-toggle" onClick={() => toggleDetail(item)} aria-expanded={expanded}>
                <span className="brief-paper-title">{displayTitle}</span><span className="brief-paper-chevron">{expanded ? "−" : "+"}</span>
              </button>
              {isPaper && paper?.japaneseTitle && paper.japaneseTitle !== item.title && <div className="brief-original-title">{item.title}</div>}
              <div className="brief-meta"><span>{item.company && item.company !== "Other" ? `${item.company} / ` : ""}{item.source}</span><span>{new Date(item.publishedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "short", day: "numeric" })}</span></div>
              {!!item.tags?.length && <div className="brief-tags">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}

              {!isPaper && <div className="brief-what"><span>WHAT HAPPENED</span><p>{news.whatHappened}</p></div>}

              {expanded && <div className="brief-paper-detail">
                {waiting && <div className="brief-news-loading">{isPaper ? "抄録を読み、医師向け日本語解説を作っています…" : "記事と情報源を確認し、説明できる形へ整理しています…"}</div>}
                {itemError && <div className="brief-news-error"><p>{itemError}</p>{needsKey ? <div className="brief-key-form"><input type="password" value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} placeholder="OpenAI API key" /><button type="button" onClick={() => saveKeyAndRetry(item)}>この端末に保存して生成</button><small>ControlのAPIキーと共通。キー自体はBriefのDBには保存しません。</small></div> : <button type="button" onClick={() => void (isPaper ? loadPaperSummary(item) : loadNewsSummary(item))}>もう一度生成</button>}</div>}

                {!waiting && !itemError && isPaper && paper && <>
                  <div className="brief-conclusion brief-bottom-line"><span>ひとことで結論</span><p>{paper.bottomLine}</p></div>
                  <div className="brief-med-grid"><div><span>対象</span><p>{paper.population}</p></div><div><span>研究デザイン</span><p>{paper.studyDesign}</p></div><div><span>介入</span><p>{paper.intervention}</p></div><div><span>比較</span><p>{paper.comparator}</p></div></div>
                  <div className="brief-result"><span>主要結果</span><p>{paper.keyResults}</p></div>
                  <div className="brief-conclusion"><span>臨床的にどう見るか</span><p>{paper.clinicalImpact}</p></div>
                  <div className="brief-limitations"><span>限界</span><p>{paper.limitations}</p></div>
                </>}

                {!isPaper && <>
                  <div className="brief-conclusion"><span>WHY IT MATTERS</span><p>{news.whyImportant}</p></div>
                  {news.creatorImpact && <div className="brief-creator-impact"><span>FOR CREATORS / WS studio</span><p>{news.creatorImpact}</p></div>}
                  {news.talkPoints.length > 0 && <div className="brief-talk-point"><span>TALK POINT / 30秒で説明する骨組み</span><ol>{news.talkPoints.map((point) => <li key={point}>{point}</li>)}</ol></div>}
                  {news.relatedLessons.length > 0 && <div className="brief-ai30-links"><span>このニュースを理解するための基礎</span><div>{news.relatedLessons.map((lesson) => <a key={lesson.day} href={`/learn?day=${lesson.day}`}><b>AI30 DAY {String(lesson.day).padStart(2, "0")}</b><small>{lesson.term} / {lesson.title}</small></a>)}</div></div>}
                  {item.analysisStatus !== "complete" && !generatedNews && !waiting && !itemError && <button className="brief-enrich-button" onClick={() => void loadNewsSummary(item)}>情報源を確認して詳しい解説を生成</button>}
                </>}

                <div className="brief-card-actions"><a href={item.url} target="_blank" rel="noreferrer">{isPaper ? "PubMed / 原文を開く ↗" : "元ソースを確認する ↗"}</a><button type="button" onClick={() => toggleDetail(item)}>閉じる</button></div>
              </div>}
              {!expanded && <div className="brief-paper-hint">{isPaper ? "クリックで医師向け日本語解説を表示" : "クリックで重要性・クリエイター視点・説明の骨組みを表示"}</div>}
            </article>
          );
        })}
      </section>

      <footer className="brief-footer"><p>AIは通常5件前後。業界への影響とWS studioへの重要性を合わせて評価し、同じ発表の重複と不自然な企業偏重を抑えます。泌尿器科・透析は従来通り各最大3件です。</p></footer>
    </main>
  );
}
