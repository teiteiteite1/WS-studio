"use client";
import { useRef, useState } from "react";
import { newId, now, projectFromIdea, type ShafuIdea, type ShafuProject, type ShafuWorkspace, type ViewName } from "./shafu-data";
type Output = NonNullable<ShafuProject["production"]>;
type Props = {
    view: ViewName;
    setView: (v: ViewName) => void;
    workspace: ShafuWorkspace;
    mutate: (fn: (w: ShafuWorkspace) => void) => void;
    callAI: <T>(action: string, payload: Record<string, unknown>) => Promise<T>;
    ready: boolean;
    notify: (s: string) => void;
};
const stocks = { unused: "未使用", prompted: "プロンプト化済み", video: "動画化済み", hold: "保留" };
const publications = { unposted: "未投稿", scheduled: "投稿予定", posted: "投稿済み", discarded: "ボツ" };
function idea(body = ""): ShafuIdea { return { id: newId(), title: body.slice(0, 24), body, duration: 40, tags: [], directions: [], styles: [], storyType: "SIDE", status: "favorite", stockStatus: "unused", priority: 2, duplicateWarning: "", sourceIdeaId: null, source: "manual", createdAt: now(), updatedAt: now() }; }
function outputOf(p: ShafuProject): Output { return p.production || { title: p.title, summary: p.scenario || p.ideaText, part1_prompt: p.episodes[0]?.promptJa || p.episodes[0]?.promptEn || "", part2_prompt: p.episodes[1]?.promptJa || p.episodes[1]?.promptEn || "" }; }
export default function ProductionPanel({ view, setView, workspace, mutate, callAI, ready, notify }: Props) {
    const [seed, setSeed] = useState("");
    const [notes, setNotes] = useState("");
    const [edge, setEdge] = useState("社不");
    const [source, setSource] = useState("");
    const [result, setResult] = useState<Output | null>(null);
    const [saved, setSaved] = useState("");
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const [query, setQuery] = useState("");
    const [draft, setDraft] = useState<ShafuIdea | null>(null);
    const [editing, setEditing] = useState<ShafuProject | null>(null);
    function send(i: ShafuIdea) { setSeed(i.body); setSource(i.id); setResult(null); setSaved(""); setView("create"); }
    function archive(i: ShafuIdea, out?: Output) { const p = projectFromIdea(i, workspace.settings.defaultVideoModel); p.ideaId = workspace.ideas.some(x => x.id === i.id) ? i.id : null; p.duration = 40; p.episodeMode = "two_part"; p.episodeCount = 2; p.publicationStatus = "unposted"; p.production = out || { title: i.title, summary: i.body, part1_prompt: "", part2_prompt: "" }; p.title = p.production.title; p.stage = "prompt"; return p; }
    async function generate() { if (lock.current || !ready || !seed.trim())
        return; lock.current = true; setBusy(true); notify(""); setResult(null); setSaved(""); try {
        const out = await callAI<Output>("production_prompt", { seed, notes, edge, bible: workspace.bible });
        if (!out || [out.title, out.summary, out.part1_prompt, out.part2_prompt].some(s => typeof s !== "string" || !s.trim()))
            throw new Error("両方のプロンプトが揃っていません。再生成してください。");
        setResult(out);
        mutate(w => { const i = w.ideas.find(x => x.id === source); if (i) {
            i.stockStatus = "prompted";
            i.updatedAt = now();
        } });
    }
    catch (e) {
        notify(e instanceof Error ? e.message : "生成に失敗しました。");
    }
    finally {
        lock.current = false;
        setBusy(false);
    } }
    async function copy(s: string) { try {
        await navigator.clipboard.writeText(s);
        notify("コピーしました。");
    }
    catch {
        notify("コピーできませんでした。本文を選択してコピーしてください。");
    } }
    function saveResult() { if (!result)
        return; const i = workspace.ideas.find(x => x.id === source) || idea(seed); const p = archive(i, result); p.memo = notes; mutate(w => { if (saved) {
        const old = w.projects.find(x => x.id === saved);
        if (old) {
            old.production = result;
            old.title = result.title;
            old.scenario = result.summary;
            old.updatedAt = now();
        }
    }
    else {
        w.projects.unshift(p);
    } }); setSaved(saved || p.id); notify("ARCHIVEに保存しました。"); }
    function saveArchive() { if (!editing)
        return; const p = structuredClone(editing); if (!p.title.trim()) {
        notify("タイトルを入力してください。");
        return;
    } p.updatedAt = now(); if (p.production)
        p.production.title = p.title; mutate(w => { const n = w.projects.findIndex(x => x.id === p.id); if (n < 0)
        w.projects.unshift(p);
    else
        w.projects[n] = p; }); setEditing(null); notify("保存しました。"); }
    return <section className="shafu-view production-view"><div className="production-heading"><h1>{view === "create" ? "PROMPT" : view === "ideas" ? "ネタ帳" : "ARCHIVE"}</h1><span>20 SEC × 2</span></div><fieldset disabled={!ready || busy} className="production-fields">
 {view === "create" && <><div className="production-input"><label>ネタ帳から呼び出し<select value={source} onChange={e => { const i = workspace.ideas.find(x => x.id === e.target.value); if (i)
        send(i);
    else
        setSource(""); }}><option value="">ネタを選択</option>{workspace.ideas.map(i => <option key={i.id} value={i.id}>{i.title || i.body.slice(0, 35)}</option>)}</select></label><label>ネタ<textarea rows={5} maxLength={12000} value={seed} onChange={e => { setSeed(e.target.value); setSource(""); setResult(null); setSaved(""); }} placeholder="何が起きる？ 思いついたネタをそのまま入力"/></label><label>攻め具合<select value={edge} onChange={e => setEdge(e.target.value)}>{["普通", "社不", "かなり社不", "炎上寸前"].map(s => <option key={s}>{s}</option>)}</select></label><details><summary>補足メモ（任意）</summary><textarea aria-label="補足メモ" rows={3} maxLength={4000} value={notes} onChange={e => setNotes(e.target.value)}/></details><button className="primary-action" disabled={!seed.trim()} onClick={() => void generate()}>{busy ? "2本のプロンプトを生成中…" : "完成プロンプトを作る"}</button></div>{result && <div className="production-result"><label>タイトル<input value={result.title} onChange={e => setResult({ ...result, title: e.target.value })}/></label><label>40秒全体の概要<textarea value={result.summary} onChange={e => setResult({ ...result, summary: e.target.value })}/></label><div className="production-parts">{(["part1_prompt", "part2_prompt"] as const).map((key, n) => <article key={key}><div className="production-heading"><h2>PART {n + 1} · 20秒</h2><button onClick={() => void copy(result[key])}>コピー</button></div><textarea aria-label={`PART ${n + 1}完成プロンプト`} rows={20} readOnly value={result[key]}/></article>)}</div><button className="primary-action" onClick={saveResult} disabled={!result.title.trim() || !result.summary.trim()}>{saved ? "ARCHIVEを更新" : "ARCHIVEに保存"}</button></div>}</>}
 {view === "ideas" && <><div className="production-toolbar"><input aria-label="ネタ検索" type="search" placeholder="本文・タグで検索" value={query} onChange={e => setQuery(e.target.value)}/><button onClick={() => setDraft(idea())}>＋ 新規追加</button></div>{draft && <article className="production-editor"><label>ネタ本文<textarea rows={5} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })}/></label><label>タグ（カンマ区切り）<input value={draft.tags.join(",")} onChange={e => setDraft({ ...draft, tags: e.target.value.split(/[,、]/) })}/></label><label>ステータス<select value={draft.stockStatus || "unused"} onChange={e => setDraft({ ...draft, stockStatus: e.target.value as ShafuIdea["stockStatus"] })}>{Object.entries(stocks).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><button disabled={!draft.body.trim()} onClick={() => { const row = { ...draft, title: draft.body.trim().slice(0, 24), body: draft.body.trim(), tags: draft.tags.map(s => s.trim()).filter(Boolean), updatedAt: now() }; mutate(w => { const n = w.ideas.findIndex(x => x.id === row.id); if (n < 0)
        w.ideas.unshift(row);
    else
        w.ideas[n] = row; }); setDraft(null); }}>保存</button><button onClick={() => setDraft(null)}>キャンセル</button></article>}<div className="production-list">{workspace.ideas.filter(i => [i.body, i.title, ...i.tags].join(" ").toLowerCase().includes(query.toLowerCase())).map(i => <article key={i.id}><small>{i.createdAt.slice(0, 10)} · {stocks[i.stockStatus || (i.status === "dismissed" ? "hold" : i.status === "in_progress" ? "prompted" : "unused")]}</small><p>{i.body}</p><p>{i.tags.join(" / ")}</p><div className="production-toolbar"><button onClick={() => send(i)}>PROMPTへ</button><button onClick={() => { setEditing(archive(i)); setView("archive"); }}>ARCHIVEへ</button><button onClick={() => setDraft(structuredClone(i))}>編集</button><button onClick={() => { if (confirm("このネタを削除しますか？"))
        mutate(w => { w.ideas = w.ideas.filter(x => x.id !== i.id); }); }}>削除</button></div></article>)}{!workspace.ideas.length && <p>思いついたネタを保存しておこう。</p>}</div></>}
 {view === "archive" && <><div className="production-toolbar"><input aria-label="アーカイブ検索" type="search" placeholder="タイトル・概要・メモで検索" value={query} onChange={e => setQuery(e.target.value)}/><button onClick={() => setEditing(archive(idea()))}>＋ 手入力で追加</button></div>{editing && <article className="production-editor"><label>タイトル<input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })}/></label><label>概要<textarea value={outputOf(editing).summary} onChange={e => setEditing({ ...editing, production: { ...outputOf(editing), summary: e.target.value } })}/></label><div className="production-parts">{(["part1_prompt", "part2_prompt"] as const).map((k, n) => <label key={k}>PART {n + 1}（20秒）<textarea rows={10} value={outputOf(editing)[k]} onChange={e => setEditing({ ...editing, production: { ...outputOf(editing), [k]: e.target.value } })}/></label>)}</div><label>話数<input value={editing.episodeNumber || ""} onChange={e => setEditing({ ...editing, episodeNumber: e.target.value })}/></label><label>投稿日<input type="date" value={editing.postedAt} onChange={e => setEditing({ ...editing, postedAt: e.target.value })}/></label><label>ステータス<select value={editing.publicationStatus || (editing.status === "discarded" ? "discarded" : editing.postedAt ? "posted" : "unposted")} onChange={e => setEditing({ ...editing, publicationStatus: e.target.value as ShafuProject["publicationStatus"] })}>{Object.entries(publications).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><label>メモ<textarea value={editing.memo} onChange={e => setEditing({ ...editing, memo: e.target.value })}/></label>{!editing.production && (editing.promptJa || editing.promptEn) && <details><summary>旧形式のプロンプト（原文を保持）</summary><pre>{editing.promptJa || editing.promptEn}</pre></details>}<button onClick={saveArchive}>保存</button><button onClick={() => setEditing(null)}>キャンセル</button></article>}<div className="production-list">{workspace.projects.filter(p => [p.title, outputOf(p).summary, p.memo, p.episodeNumber].join(" ").toLowerCase().includes(query.toLowerCase())).map(p => <article key={p.id}><small>{p.episodeNumber ? `第${p.episodeNumber}話 · ` : ""}{publications[p.publicationStatus || (p.status === "discarded" ? "discarded" : p.postedAt ? "posted" : "unposted")]} · {p.postedAt || "投稿日未設定"}</small><h2>{p.title || "無題"}</h2><p>{outputOf(p).summary}</p><div className="production-toolbar"><button onClick={() => setEditing(structuredClone(p))}>開く・編集</button>{(["part1_prompt", "part2_prompt"] as const).map((k, n) => outputOf(p)[k] && <button key={k} onClick={() => void copy(outputOf(p)[k])}>PART {n + 1}コピー</button>)}</div></article>)}{!workspace.projects.length && <p>完成プロンプトや投稿予定を、ここに保存できます。</p>}</div></>}
 </fieldset></section>;
}
