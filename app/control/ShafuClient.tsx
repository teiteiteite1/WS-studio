"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import SyncAccount from "../components/SyncAccount";
import type { PersonalSession } from "../lib/personalSync";
import {
  deleteShafuAsset,
  listShafuAssets,
  loadShafuWorkspace,
  saveShafuWorkspace,
  ShafuAsset,
  uploadShafuAsset,
} from "../lib/shafuSync";
import {
  Bible,
  createDefaultWorkspace,
  Development,
  DIRECTIONS,
  Episode,
  migrateLegacyControl,
  newId,
  normalizeWorkspace,
  now,
  PreflightCheck,
  priorityLabel,
  projectFromIdea,
  ShafuIdea,
  ShafuNote,
  ShafuProject,
  ShafuWorkspace,
  StoryType,
  STYLES,
  ViewName,
} from "./shafu-data";
import "./shafu.css";

const LOCAL_KEY = "shafu_workspace_v1";
const KEY_LOCAL = "ws_control_openai_key";
const KEY_SESSION = "ws_control_openai_key_session";
const NAV: Array<{ id: ViewName; label: string; short: string }> = [
  { id: "home", label: "HOME", short: "HM" },
  { id: "ideas", label: "IDEAS", short: "ID" },
  { id: "favorites", label: "FAVORITES", short: "FV" },
  { id: "create", label: "CREATE", short: "CR" },
  { id: "story", label: "STORY", short: "ST" },
  { id: "archive", label: "ARCHIVE", short: "AR" },
  { id: "bible", label: "BIBLE", short: "BB" },
  { id: "notes", label: "NOTES", short: "NT" },
];
const STAGES: ShafuProject["stage"][] = ["idea", "develop", "scenario", "preflight", "prompt"];
const STORY_LABELS: Record<StoryType, string> = { MAIN: "本筋", SIDE: "小話", LINK: "本筋につながる小話" };
const BIBLE_FIELDS: Array<{ key: keyof Bible; label: string; hint: string }> = [
  { key: "character", label: "CHARACTER", hint: "外見、年齢、身体設定" },
  { key: "personality", label: "PERSONALITY", hint: "性格、思考、反応、行動原理" },
  { key: "voice", label: "VOICE", hint: "声質、テンション、話し方、言葉遣い" },
  { key: "home", label: "HOME", hint: "かわい荘、自室、家具、小物" },
  { key: "world", label: "WORLD", hint: "店、駅、生活圏、人物、世界設定" },
  { key: "videoStyle", label: "VIDEO STYLE", hint: "映像表現と演出の基本ルール" },
  { key: "never", label: "NEVER", hint: "絶対に避ける行動・表現・キャラ崩壊" },
  { key: "styleReferences", label: "STYLE REFERENCES", hint: "参考URLと、そのどこを参考にするか" },
  { key: "freeNotes", label: "FREE NOTES", hint: "その他の固定設定" },
];

function formatDate(value: string, withTime = false) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ja-JP", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(value));
  } catch { return value; }
}

function clip(value: string, length = 120) {
  const chars = Array.from(value || "");
  return chars.length > length ? `${chars.slice(0, length).join("")}…` : value;
}

function episodeCountFor(project: ShafuProject) {
  return project.episodeMode === "single" ? 1 : project.episodeMode === "two_part" ? 2 : Math.max(2, Math.min(8, project.episodeCount || 3));
}

function ensureEpisodes(project: ShafuProject, count = episodeCountFor(project)) {
  if (project.episodeMode === "single") return [];
  return Array.from({ length: count }, (_, index) => project.episodes[index] || {
    id: newId(), position: index + 1, title: `EPISODE ${index + 1}`, status: "not_started" as const,
    scenario: "", promptEn: "", promptJa: "",
  }).map((episode, index) => ({ ...episode, position: index + 1 }));
}

function buttonBusy(current: string, id: string) { return current === id; }

type LegacyReference = { id: string; name: string; tag: string };

async function readLegacyReferenceFiles() {
  const raw = localStorage.getItem("ws_control_v3_state");
  if (!raw || !globalThis.indexedDB) return [];
  let legacy: { characters?: Array<{ refs?: LegacyReference[] }> };
  try { legacy = JSON.parse(raw) as typeof legacy; }
  catch { return []; }
  const references = (legacy.characters || []).flatMap((character) => character.refs || []);
  if (!references.length) return [];

  const database = await new Promise<IDBDatabase | null>((resolve, reject) => {
    let created = false;
    const request = indexedDB.open("ws_control_assets_v1");
    request.onupgradeneeded = () => { created = true; };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (created || !db.objectStoreNames.contains("images")) {
        db.close();
        if (created) indexedDB.deleteDatabase("ws_control_assets_v1");
        resolve(null);
        return;
      }
      resolve(db);
    };
  });
  if (!database) return [];

  try {
    const rows = await Promise.all(references.map((reference) => new Promise<{ file: File; tag: string } | null>((resolve) => {
      const request = database.transaction("images", "readonly").objectStore("images").get(reference.id);
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const record = request.result as { blob?: Blob; name?: string; type?: string } | undefined;
        if (!record?.blob) { resolve(null); return; }
        const name = record.name || reference.name || `${reference.id}.png`;
        resolve({ file: new File([record.blob], name, { type: record.type || record.blob.type || "image/png" }), tag: reference.tag || name });
      };
    })));
    return rows.filter((row): row is { file: File; tag: string } => Boolean(row));
  } finally {
    database.close();
  }
}

export default function ShafuClient() {
  const [view, setView] = useState<ViewName>("home");
  const [workspace, setWorkspace] = useState<ShafuWorkspace>(() => createDefaultWorkspace());
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<PersonalSession | null>(null);
  const [syncState, setSyncState] = useState("DEVICE MODE");
  const [assets, setAssets] = useState<ShafuAsset[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [rememberKey, setRememberKey] = useState(false);
  const [ideaDuration, setIdeaDuration] = useState(45);
  const [ideaDirections, setIdeaDirections] = useState<string[]>(["日常"]);
  const [ideaStyles, setIdeaStyles] = useState<string[]>(["映像主体", "セリフ少なめ"]);
  const [ideaStoryType, setIdeaStoryType] = useState<StoryType>("SIDE");
  const [ideaSeed, setIdeaSeed] = useState("");
  const [manualFavoriteOpen, setManualFavoriteOpen] = useState(false);
  const [manualIdea, setManualIdea] = useState({ title: "", body: "", duration: 45, tags: "", priority: 2 as 1 | 2 | 3 });
  const [archiveQuery, setArchiveQuery] = useState("");
  const [semanticIds, setSemanticIds] = useState<string[] | null>(null);
  const [noteQuery, setNoteQuery] = useState("");
  const [bibleDraft, setBibleDraft] = useState<Bible>(workspace.bible);
  const [shownFix, setShownFix] = useState<string | null>(null);
  const [dragTimelineId, setDragTimelineId] = useState<string | null>(null);
  const workspaceRef = useRef(workspace);
  const cloudReadyFor = useRef("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scenarioRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => { workspaceRef.current = workspace; }, [workspace]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let initial = createDefaultWorkspace();
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) initial = normalizeWorkspace(JSON.parse(raw));
      } catch { /* keep defaults */ }
      initial = migrateLegacyControl(initial);
      setWorkspace(initial);
      setBibleDraft(initial.bible);
      setApiKeyDraft(sessionStorage.getItem(KEY_SESSION) || localStorage.getItem(KEY_LOCAL) || "");
      setRememberKey(Boolean(localStorage.getItem(KEY_LOCAL)));
      setActiveProjectId(initial.projects[0]?.id || null);
      setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  const mutate = useCallback((updater: (draft: ShafuWorkspace) => void) => {
    setWorkspace((previous) => {
      const draft = structuredClone(previous);
      updater(draft);
      draft.updatedAt = now();
      return draft;
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(workspace));
    if (!session || cloudReadyFor.current !== session.user.id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSyncState("SAVING");
    saveTimer.current = setTimeout(() => {
      void saveShafuWorkspace(session, workspace, Date.now())
        .then(() => setSyncState("SYNCED"))
        .catch((error) => { setSyncState("SAVE ERROR"); setNotice(error instanceof Error ? error.message : "保存に失敗しました。"); });
    }, 900);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [hydrated, session, workspace]);

  const handleSession = useCallback((next: PersonalSession | null) => {
    setSession(next);
    cloudReadyFor.current = "";
    if (!next) { setSyncState("DEVICE MODE"); setAssets([]); return; }
    setSyncState("LOADING");
    void (async () => {
      try {
        const [cloud, storedMedia] = await Promise.all([loadShafuWorkspace<ShafuWorkspace>(next), listShafuAssets(next)]);
        let nextWorkspace = workspaceRef.current;
        if (cloud?.data && Object.keys(cloud.data).length) {
          nextWorkspace = migrateLegacyControl(normalizeWorkspace(cloud.data));
        } else {
          nextWorkspace = migrateLegacyControl(normalizeWorkspace(workspaceRef.current));
        }

        const media = [...storedMedia];
        if (!nextWorkspace.legacyAssetsImported) {
          const legacyFiles = await readLegacyReferenceFiles();
          for (const row of legacyFiles) {
            if (media.some((asset) => asset.kind === "reference" && asset.file_name === row.file.name)) continue;
            media.unshift(await uploadShafuAsset(next, row.file, { kind: "reference", tag: row.tag }));
          }
          nextWorkspace = { ...nextWorkspace, legacyAssetsImported: true, updatedAt: now() };
        }

        await saveShafuWorkspace(next, nextWorkspace, Date.now());
        setWorkspace(nextWorkspace);
        setBibleDraft(nextWorkspace.bible);
        setActiveProjectId((current) => current && nextWorkspace.projects.some((item) => item.id === current) ? current : nextWorkspace.projects[0]?.id || null);
        setAssets(media);
        cloudReadyFor.current = next.user.id;
        setSyncState("SYNCED");
      } catch (error) {
        setSyncState("SYNC ERROR");
        setNotice(error instanceof Error ? error.message : "同期に失敗しました。");
      }
    })();
  }, []);

  const apiKey = useCallback(() => sessionStorage.getItem(KEY_SESSION) || localStorage.getItem(KEY_LOCAL) || "", []);

  const callAI = useCallback(async <T,>(action: string, payload: Record<string, unknown>) => {
    const key = apiKey();
    if (!key) throw new Error("右上のSETTINGSでOpenAI APIキーを保存してね。");
    const response = await fetch("/api/control/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-openai-key": key },
      body: JSON.stringify({ action, payload: { ...payload, tier: workspaceRef.current.settings.tier } }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `AI処理に失敗しました (${response.status})`);
    return data as T;
  }, [apiKey]);

  const run = useCallback(async (id: string, task: () => Promise<void>) => {
    setBusy(id); setNotice("");
    try { await task(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "処理に失敗しました。"); }
    finally { setBusy(""); }
  }, []);

  const activeProject = useMemo(() => workspace.projects.find((item) => item.id === activeProjectId) || null, [workspace.projects, activeProjectId]);
  const favorites = useMemo(() => workspace.ideas.filter((item) => item.status === "favorite"), [workspace.ideas]);
  const recentProject = useMemo(() => [...workspace.projects].filter((item) => item.status === "in_progress" || item.status === "retry").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0], [workspace.projects]);
  const archive = useMemo(() => workspace.projects.filter((item) => ["completed", "failed", "discarded"].includes(item.status)), [workspace.projects]);
  const visibleArchive = useMemo(() => {
    let rows = archive;
    if (semanticIds) rows = semanticIds.map((id) => archive.find((item) => item.id === id)).filter(Boolean) as ShafuProject[];
    const q = archiveQuery.trim().toLowerCase();
    if (q && !semanticIds) rows = rows.filter((item) => [item.title, item.ideaText, item.scenario, item.memo, item.failureReason, item.postChannels.join(" ")].join(" ").toLowerCase().includes(q));
    return rows;
  }, [archive, archiveQuery, semanticIds]);

  function openProject(projectId: string, stage?: ShafuProject["stage"]) {
    setActiveProjectId(projectId);
    if (stage) mutate((draft) => { const project = draft.projects.find((item) => item.id === projectId); if (project) project.stage = stage; });
    setView("create");
  }

  function createFromIdea(idea: ShafuIdea) {
    const project = projectFromIdea(idea, workspace.settings.defaultVideoModel);
    mutate((draft) => {
      const source = draft.ideas.find((item) => item.id === idea.id);
      if (source) { source.status = "in_progress"; source.updatedAt = now(); }
      draft.projects.unshift(project);
    });
    setActiveProjectId(project.id);
    setView("create");
  }

  function patchProject(projectId: string, patch: Partial<ShafuProject>) {
    mutate((draft) => {
      const project = draft.projects.find((item) => item.id === projectId);
      if (project) Object.assign(project, patch, { updatedAt: now() });
    });
  }

  async function generateIdeas(sourceIdea?: ShafuIdea) {
    await run(sourceIdea ? `more-${sourceIdea.id}` : "ideas", async () => {
      const data = await callAI<{ ideas: Array<{ title: string; body: string; duration?: number; tags?: string[]; storyType?: StoryType; duplicateWarning?: string }> }>(sourceIdea ? "more_like_this" : "ideas_generate", {
        count: sourceIdea ? 6 : workspace.settings.ideaCount,
        duration: ideaDuration,
        directions: ideaDirections,
        styles: ideaStyles,
        storyType: ideaStoryType,
        seed: ideaSeed,
        sourceIdea: sourceIdea || null,
        bible: workspace.bible,
        story: workspace.story,
        milestones: workspace.milestones,
        timeline: workspace.timeline.slice(-30),
        existing: [
          ...workspace.ideas.map((item) => ({ id: item.id, title: item.title, body: item.body, status: item.status })),
          ...workspace.projects.map((item) => ({ id: item.id, title: item.title, body: item.ideaText, status: item.status })),
        ].slice(-160),
      });
      const stamp = now();
      const rows: ShafuIdea[] = (data.ideas || []).map((item) => ({
        id: newId(), title: item.title || "無題", body: item.body || "", duration: Math.max(30, Math.min(60, Number(item.duration) || ideaDuration)),
        tags: item.tags || ideaDirections.filter((tag) => tag !== "ランダム"), directions: ideaDirections, styles: ideaStyles,
        storyType: ["MAIN", "SIDE", "LINK"].includes(item.storyType || "") ? item.storyType as StoryType : ideaStoryType,
        status: "generated", priority: 2, duplicateWarning: item.duplicateWarning || "", sourceIdeaId: sourceIdea?.id || null,
        source: "ai", createdAt: stamp, updatedAt: stamp,
      }));
      mutate((draft) => { draft.ideas = [...rows, ...draft.ideas]; });
      setNotice(`${rows.length}案を追加したよ。採用するのはAIじゃなく、ていちゃん。`);
    });
  }

  function toggleIdeaFilter(value: string, current: string[], setter: (next: string[]) => void) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function addManualFavorite() {
    if (!manualIdea.body.trim()) { setNotice("ネタ本文だけは入れてね。"); return; }
    const stamp = now();
    const idea: ShafuIdea = {
      id: newId(), title: manualIdea.title.trim() || clip(manualIdea.body.trim(), 24), body: manualIdea.body.trim(),
      duration: manualIdea.duration, tags: manualIdea.tags.split(/[,、\s]+/).filter(Boolean), directions: [],
      styles: ["映像主体", "セリフ少なめ"], storyType: "SIDE", status: "favorite", priority: manualIdea.priority,
      duplicateWarning: "", sourceIdeaId: null, source: "manual", createdAt: stamp, updatedAt: stamp,
    };
    mutate((draft) => { draft.ideas.unshift(idea); });
    setManualIdea({ title: "", body: "", duration: 45, tags: "", priority: 2 });
    setManualFavoriteOpen(false);
  }

  async function developProject(project: ShafuProject) {
    await run("develop", async () => {
      const data = await callAI<{ developments: Array<{ label: string; body: string }> }>("develop", {
        project, bible: workspace.bible, story: workspace.story, timeline: workspace.timeline.slice(-30),
      });
      const developments: Development[] = (data.developments || []).slice(0, 3).map((item) => ({ id: newId(), label: item.label, body: item.body }));
      patchProject(project.id, { developments, selectedDevelopmentId: null, stage: "develop" });
    });
  }

  async function generateScenario(project: ShafuProject) {
    const selected = project.developments.find((item) => item.id === project.selectedDevelopmentId);
    if (!selected) { setNotice("先にDEVELOPで見せ方を1つ選んでね。"); return; }
    await run("scenario", async () => {
      const data = await callAI<{ title: string; scenario: string; episodes: Array<{ title: string; scenario: string }> }>("scenario", {
        project, selectedDevelopment: selected, bible: workspace.bible, story: workspace.story,
        milestones: workspace.milestones, timeline: workspace.timeline.slice(-40),
      });
      const count = episodeCountFor(project);
      const episodes = project.episodeMode === "single" ? [] : Array.from({ length: count }, (_, index) => ({
        id: project.episodes[index]?.id || newId(), position: index + 1,
        title: data.episodes?.[index]?.title || `EPISODE ${index + 1}`,
        status: "in_progress" as const,
        scenario: data.episodes?.[index]?.scenario || "", promptEn: project.episodes[index]?.promptEn || "", promptJa: project.episodes[index]?.promptJa || "",
      }));
      patchProject(project.id, { title: data.title || project.title, scenario: data.scenario || "", episodes, stage: "scenario", preflight: [] });
    });
  }

  async function refineScenario(project: ShafuProject, operation: string) {
    await run(`refine-${operation}`, async () => {
      const data = await callAI<{ scenario: string; episodes: Array<{ title: string; scenario: string }> }>("refine_scenario", {
        operation, project, bible: workspace.bible, story: workspace.story, timeline: workspace.timeline.slice(-30),
      });
      const episodes = project.episodes.map((episode, index) => ({
        ...episode,
        title: data.episodes?.[index]?.title || episode.title,
        scenario: data.episodes?.[index]?.scenario || episode.scenario,
      }));
      patchProject(project.id, { scenario: data.scenario || project.scenario, episodes, preflight: [] });
    });
  }

  async function runPreflight(project: ShafuProject) {
    await run("preflight", async () => {
      const data = await callAI<{ checks: PreflightCheck[] }>("preflight", {
        project, bible: workspace.bible, story: workspace.story, milestones: workspace.milestones,
        timeline: workspace.timeline.slice(-50), archive: archive.slice(0, 80).map((item) => ({ id: item.id, title: item.title, ideaText: item.ideaText, scenario: item.scenario })),
      });
      patchProject(project.id, { preflight: data.checks || [], stage: "preflight" });
    });
  }

  async function applyPreflightFix(project: ShafuProject, check: PreflightCheck) {
    await run(`fix-${check.category}`, async () => {
      const data = await callAI<{ scenario: string; episodes: Array<{ title: string; scenario: string }> }>("apply_fix", {
        check, project, bible: workspace.bible, story: workspace.story,
      });
      patchProject(project.id, {
        scenario: data.scenario || project.scenario,
        episodes: project.episodes.map((episode, index) => ({ ...episode, title: data.episodes?.[index]?.title || episode.title, scenario: data.episodes?.[index]?.scenario || episode.scenario })),
        preflight: [], stage: "scenario",
      });
      setShownFix(null);
      setNotice(`${check.category}だけを反映したよ。PREFLIGHTをもう一度通してね。`);
    });
  }

  function scenarioForPrompt(project: ShafuProject) {
    if (!project.episodes.length) return project.scenario;
    return project.episodes.map((episode) => `${episode.title}\n${episode.scenario}`).join("\n\n");
  }

  async function buildPrompt(project: ShafuProject) {
    await run("prompt", async () => {
      const selectedAssets = project.selectedAssetIds.map((id, index) => {
        const asset = assets.find((item) => item.id === id);
        return asset ? { token: `@image${index + 1}`, tag: asset.tag, fileName: asset.file_name } : null;
      }).filter(Boolean);
      const data = await callAI<{ english: string; japanese: string }>("prompt_build", {
        model: project.promptModel, duration: project.duration, maxChars: project.promptMaxChars,
        scenario: scenarioForPrompt(project), direction: project.extraDirection, references: selectedAssets,
        bible: workspace.bible, story: workspace.story,
      });
      patchProject(project.id, { promptEn: data.english || "", promptJa: data.japanese || "", stage: "prompt" });
    });
  }

  async function syncPrompt(project: ShafuProject, source: "en" | "ja") {
    await run(`sync-${source}`, async () => {
      const data = await callAI<{ english: string; japanese: string }>("sync_prompt", {
        source, english: project.promptEn, japanese: project.promptJa, maxChars: project.promptMaxChars,
      });
      patchProject(project.id, { promptEn: data.english || project.promptEn, promptJa: data.japanese || project.promptJa });
    });
  }

  function insertReference(project: ShafuProject, assetId: string) {
    const current = project.selectedAssetIds;
    const index = current.indexOf(assetId);
    if (index >= 0) {
      const next = current.filter((id) => id !== assetId);
      let text = project.scenario;
      current.forEach((id, oldIndex) => { text = text.replaceAll(`@image${oldIndex + 1}`, `__ASSET_${id.replaceAll("-", "_")}__`); });
      next.forEach((id, nextIndex) => { text = text.replaceAll(`__ASSET_${id.replaceAll("-", "_")}__`, `@image${nextIndex + 1}`); });
      text = text.replace(/__ASSET_[A-Z0-9_]+__/gi, "").replace(/ {2,}/g, " ").trim();
      patchProject(project.id, { selectedAssetIds: next, scenario: text });
      return;
    }
    const token = `@image${current.length + 1}`;
    const element = scenarioRef.current;
    let nextScenario = project.scenario;
    if (element) {
      const start = element.selectionStart ?? nextScenario.length;
      nextScenario = `${nextScenario.slice(0, start)}${start && !/\s$/.test(nextScenario.slice(0, start)) ? " " : ""}${token} ${nextScenario.slice(start)}`.trim();
    } else nextScenario = `${nextScenario} ${token}`.trim();
    patchProject(project.id, { selectedAssetIds: [...current, assetId], scenario: nextScenario });
  }

  async function uploadAsset(event: ChangeEvent<HTMLInputElement>, kind: ShafuAsset["kind"], project?: ShafuProject) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (!session) { setNotice("画像・完成動画の保存はログイン後に使えるよ。MacとiPhoneで同じ素材を使うための仕様。 "); return; }
    await run(`upload-${kind}`, async () => {
      const uploaded: ShafuAsset[] = [];
      for (const file of files) uploaded.push(await uploadShafuAsset(session, file, { kind, projectId: project?.id || null, tag: kind === "reference" ? "reference" : "completed" }));
      setAssets((current) => [...uploaded, ...current]);
      if (kind === "completed_video" && project) patchProject(project.id, { status: "completed" });
    });
  }

  async function removeAsset(asset: ShafuAsset) {
    if (!session || !confirm(`「${asset.file_name}」を削除する？`)) return;
    await run(`delete-${asset.id}`, async () => {
      await deleteShafuAsset(session, asset);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      mutate((draft) => {
        for (const project of draft.projects) project.selectedAssetIds = project.selectedAssetIds.filter((id) => id !== asset.id);
      });
    });
  }

  function archiveProject(project: ShafuProject, status: ShafuProject["status"], failureReason = "") {
    patchProject(project.id, {
      status,
      failureReason,
      stage: "prompt",
      episodes: status === "completed" ? project.episodes.map((episode) => ({ ...episode, status: "video_ready" })) : project.episodes,
    });
    if (status === "completed") {
      mutate((draft) => {
        if (draft.timeline.some((item) => item.projectId === project.id)) return;
        const rows = project.episodes.length ? project.episodes : [{ id: null, title: project.title, scenario: project.scenario }];
        let sameType = draft.timeline.filter((item) => item.storyType === project.storyType).length;
        for (const episode of rows) {
          sameType += 1;
          draft.timeline.push({
            id: newId(), projectId: project.id, episodeId: episode.id, order: draft.timeline.length + 1,
            code: `${project.storyType} ${String(sameType).padStart(2, "0")}`,
            title: episode.title || project.title,
            storyType: project.storyType,
            whatHappened: episode.scenario || project.ideaText,
            characterChange: "", newCanon: "", resolvedThreads: "", newThreads: "", publishedAt: project.postedAt,
          });
        }
      });
    }
    setView("archive");
  }

  async function semanticSearch() {
    if (!archiveQuery.trim()) { setSemanticIds(null); return; }
    await run("semantic", async () => {
      const data = await callAI<{ ids: string[] }>("semantic_search", {
        query: archiveQuery,
        archive: archive.map((item) => ({ id: item.id, title: item.title, idea: item.ideaText, scenario: clip(item.scenario, 500), memo: item.memo })),
      });
      setSemanticIds(data.ids || []);
    });
  }

  function saveBible() {
    mutate((draft) => {
      draft.bible = structuredClone(bibleDraft);
      draft.bibleVersion += 1;
      draft.bibleHistory = [...draft.bibleHistory, { version: draft.bibleVersion, savedAt: now(), content: structuredClone(bibleDraft) }].slice(-12);
    });
    setNotice("BIBLEを保存。次のIDEAS / CREATE / PREFLIGHT / PROMPTから自動参照するよ。");
  }

  function addNote() {
    const note: ShafuNote = { id: newId(), title: "", body: "", pinned: false, createdAt: now(), updatedAt: now() };
    mutate((draft) => { draft.notes.unshift(note); });
  }

  function noteToIdea(note: ShafuNote) {
    if (!note.body.trim() && !note.title.trim()) return;
    const stamp = now();
    mutate((draft) => { draft.ideas.unshift({
      id: newId(), title: note.title.trim() || clip(note.body, 24), body: note.body.trim(), duration: 45, tags: ["メモ発"],
      directions: [], styles: ["映像主体", "セリフ少なめ"], storyType: "SIDE", status: "favorite", priority: 2,
      duplicateWarning: "", sourceIdeaId: null, source: "note", createdAt: stamp, updatedAt: stamp,
    }); });
    setNotice("元メモは残したまま、FAVORITESへコピーしたよ。");
  }

  function noteToStory(note: ShafuNote) {
    if (!note.body.trim() && !note.title.trim()) return;
    mutate((draft) => { draft.milestones.push({ id: newId(), title: note.title.trim() || "メモからの候補", detail: note.body.trim(), status: "candidate" }); });
    setNotice("元メモは残したまま、STORYのMILESTONES候補へコピーしたよ。");
  }

  function reorderTimeline(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    mutate((draft) => {
      const items = [...draft.timeline].sort((a, b) => a.order - b.order);
      const source = items.findIndex((item) => item.id === sourceId);
      const target = items.findIndex((item) => item.id === targetId);
      if (source < 0 || target < 0) return;
      const [moved] = items.splice(source, 1);
      items.splice(target, 0, moved);
      draft.timeline = items.map((item, index) => ({ ...item, order: index + 1 }));
    });
  }

  function moveTimeline(id: string, delta: number) {
    const rows = [...workspace.timeline].sort((a, b) => a.order - b.order);
    const index = rows.findIndex((item) => item.id === id);
    const target = rows[index + delta];
    if (target) reorderTimeline(id, target.id);
  }

  if (!hydrated) return <div className="shafu-boot"><b>SHAFU</b><span>loading workspace</span></div>;

  return (
    <div className="shafu-shell">
      <aside className="shafu-side">
        <button className="shafu-brand" type="button" onClick={() => setView("home")}>
          <span>SHAFU</span><small>SHAFU-CHAN PRODUCTION OS</small>
        </button>
        <nav aria-label="SHAFU main navigation">
          {NAV.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} type="button" onClick={() => setView(item.id)}><i>{item.short}</i><span>{item.label}</span></button>)}
        </nav>
        <div className="shafu-side-bottom">
          <span className={`sync-badge ${syncState.includes("ERROR") ? "error" : syncState === "SYNCED" ? "ok" : ""}`}>{syncState}</span>
          <button type="button" className="settings-link" onClick={() => setSettingsOpen(true)}>SETTINGS</button>
        </div>
      </aside>

      <header className="shafu-mobile-head">
        <button type="button" onClick={() => setView("home")}><b>SHAFU</b><small>{NAV.find((item) => item.id === view)?.label}</small></button>
        <button type="button" onClick={() => setSettingsOpen(true)}>SETTINGS</button>
      </header>

      <main className="shafu-main">
        <div className="shafu-account"><SyncAccount onSessionChange={handleSession} description="同じアカウントでログインすると、SHAFUの制作途中・設定・素材をMacとiPhoneで同期します。" /></div>
        {notice && <div className="global-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice("")}>×</button></div>}

        {view === "home" && <section className="shafu-view home-view">
          <div className="page-kicker">SHAFU-CHAN PRODUCTION OS</div>
          <h1 className="home-title">Make less.<br /><em>Choose better.</em></h1>
          <p className="home-lead">AIは候補を増やして、矛盾を減らす。何を作るかは、こっちが決める。</p>
          <div className="home-actions">
            <button type="button" onClick={() => setView("ideas")}><span>01</span><b>NEW IDEAS</b><small>短いネタの核をまとめて出す</small></button>
            <button type="button" onClick={() => setView("favorites")}><span>02</span><b>FAVORITES</b><small>{favorites.length} ideas saved</small></button>
            <button type="button" onClick={() => recentProject ? openProject(recentProject.id) : setView("create")}><span>03</span><b>CONTINUE</b><small>{recentProject ? clip(recentProject.title, 34) : "制作途中はまだなし"}</small></button>
            <button type="button" onClick={() => setView("archive")}><span>04</span><b>ARCHIVE</b><small>{archive.length} works</small></button>
          </div>
          {recentProject && <button className="continue-card" type="button" onClick={() => openProject(recentProject.id)}>
            <div><small>RECENT</small><h2>{recentProject.title}</h2><p>{clip(recentProject.ideaText, 110)}</p></div>
            <div className="continue-meta"><span>{recentProject.stage.toUpperCase()}</span><span>{recentProject.duration} SEC</span><b>続きから →</b></div>
          </button>}
          <div className="home-secondary">
            <button type="button" onClick={() => setView("story")}>STORY <span>本筋の現在地</span></button>
            <button type="button" onClick={() => setView("bible")}>BIBLE <span>変わらない設定</span></button>
            <button type="button" onClick={() => setView("notes")}>NOTES <span>雑なメモ置き場</span></button>
          </div>
        </section>}

        {view === "ideas" && <section className="shafu-view">
          <PageTitle eyebrow="EXPLORE" title="IDEAS" sub="完成脚本ではなく、何が起きる動画かだけを短く出す。" />
          <div className="control-panel">
            <div className="control-row length-row">
              <div className="control-label"><b>LENGTH</b><span>{ideaDuration} SEC</span></div>
              <input aria-label="動画尺" type="range" min="30" max="60" step="5" value={ideaDuration} onChange={(event) => setIdeaDuration(Number(event.target.value))} />
              <div className="range-labels">{[30,35,40,45,50,55,60].map((value) => <span key={value}>{value}</span>)}</div>
            </div>
            <div className="control-row"><div className="control-label"><b>DIRECTION</b><span>複数選択</span></div><div className="chips">
              {[...DIRECTIONS, ...workspace.settings.customDirections].map((value) => <button key={value} type="button" className={ideaDirections.includes(value) ? "selected" : ""} onClick={() => toggleIdeaFilter(value, ideaDirections, setIdeaDirections)}>{value}</button>)}
              <button type="button" className="add-chip" onClick={() => { const value = prompt("追加する方向性"); if (value?.trim()) mutate((draft) => { if (!draft.settings.customDirections.includes(value.trim())) draft.settings.customDirections.push(value.trim()); }); }}>＋</button>
            </div></div>
            <div className="control-row"><div className="control-label"><b>STYLE</b><span>初期は映像主体</span></div><div className="chips">{STYLES.map((value) => <button key={value} type="button" className={ideaStyles.includes(value) ? "selected" : ""} onClick={() => toggleIdeaFilter(value, ideaStyles, setIdeaStyles)}>{value}</button>)}</div></div>
            <div className="control-row"><div className="control-label"><b>STORY</b><span>本筋との距離</span></div><div className="chips story-chips">{(["SIDE","LINK","MAIN"] as StoryType[]).map((value) => <button key={value} type="button" className={ideaStoryType === value ? "selected" : ""} onClick={() => setIdeaStoryType(value)}><b>{value}</b><small>{STORY_LABELS[value]}</small></button>)}</div></div>
            <div className="seed-row"><textarea value={ideaSeed} onChange={(event) => setIdeaSeed(event.target.value)} placeholder="任意：入れたい断片、避けたいこと、今の気分。空欄でもOK。" /><div><label>COUNT<select value={workspace.settings.ideaCount} onChange={(event) => mutate((draft) => { draft.settings.ideaCount = Number(event.target.value) as 20 | 24 | 30; })}><option value="20">20</option><option value="24">24</option><option value="30">30</option></select></label><button className="primary-action" type="button" disabled={Boolean(busy)} onClick={() => void generateIdeas()}>{buttonBusy(busy,"ideas") ? "GENERATING…" : "GENERATE IDEAS"}</button></div></div>
          </div>
          <div className="idea-list">
            {workspace.ideas.filter((item) => item.status === "generated").map((idea, index) => <article className="idea-card" key={idea.id}>
              <div className="idea-index">{String(index + 1).padStart(2,"0")}</div>
              <div className="idea-body"><div className="idea-meta"><span>{idea.duration} SEC</span><span className={`type ${idea.storyType.toLowerCase()}`}>{idea.storyType}</span>{idea.tags.slice(0,3).map((tag) => <span key={tag}>{tag}</span>)}</div><h2>{idea.title}</h2><p>{idea.body}</p>{idea.duplicateWarning && <div className="duplicate-note">SIMILAR? <span>{idea.duplicateWarning}</span></div>}</div>
              <div className="idea-actions"><button type="button" onClick={() => mutate((draft) => { const item=draft.ideas.find((x)=>x.id===idea.id); if(item)item.status="favorite"; })}>SAVE</button><button className="dark" type="button" onClick={() => createFromIdea(idea)}>CREATE</button><button type="button" onClick={() => mutate((draft) => { const item=draft.ideas.find((x)=>x.id===idea.id); if(item)item.status="dismissed"; })}>DISMISS</button><button type="button" disabled={Boolean(busy)} onClick={() => void generateIdeas(idea)}>{buttonBusy(busy,`more-${idea.id}`)?"MAKING…":"MORE LIKE THIS"}</button></div>
            </article>)}
            {!workspace.ideas.some((item) => item.status === "generated") && <Empty title="まだ候補なし" text="条件を選んで20〜30案まとめて出そう。ここでは脚本まで書かせない。" />}
          </div>
        </section>}

        {view === "favorites" && <section className="shafu-view">
          <PageTitle eyebrow="SHORTLIST" title="FAVORITES" sub="後で作りたいネタ。AI案も、自分で思いついた断片も同じ場所へ。" action={<button className="page-action" type="button" onClick={() => setManualFavoriteOpen((value) => !value)}>＋ ADD IDEA</button>} />
          {manualFavoriteOpen && <div className="manual-card"><div className="field-grid"><label>TITLE<input value={manualIdea.title} onChange={(e)=>setManualIdea({...manualIdea,title:e.target.value})} placeholder="空欄でもOK" /></label><label>LENGTH<select value={manualIdea.duration} onChange={(e)=>setManualIdea({...manualIdea,duration:Number(e.target.value)})}>{[30,35,40,45,50,55,60].map((n)=><option key={n}>{n}</option>)}</select></label><label>PRIORITY<select value={manualIdea.priority} onChange={(e)=>setManualIdea({...manualIdea,priority:Number(e.target.value) as 1|2|3})}><option value="1">LOW</option><option value="2">MID</option><option value="3">HIGH</option></select></label></div><label>IDEA<textarea value={manualIdea.body} onChange={(e)=>setManualIdea({...manualIdea,body:e.target.value})} placeholder="思いついたまま雑に書いてOK" /></label><label>TAGS<input value={manualIdea.tags} onChange={(e)=>setManualIdea({...manualIdea,tags:e.target.value})} placeholder="金欠, 夜, 部屋" /></label><button className="primary-action" type="button" onClick={addManualFavorite}>SAVE TO FAVORITES</button></div>}
          <div className="favorite-grid">{[...favorites].sort((a,b)=>b.priority-a.priority||b.updatedAt.localeCompare(a.updatedAt)).map((idea)=><article className="favorite-card" key={idea.id}><div className="favorite-top"><span className={`priority p${idea.priority}`}>{priorityLabel(idea.priority)}</span><span>{formatDate(idea.createdAt)}</span></div><input className="title-input" value={idea.title} onChange={(e)=>mutate((draft)=>{const item=draft.ideas.find((x)=>x.id===idea.id);if(item){item.title=e.target.value;item.updatedAt=now();}})} /><textarea value={idea.body} onChange={(e)=>mutate((draft)=>{const item=draft.ideas.find((x)=>x.id===idea.id);if(item){item.body=e.target.value;item.updatedAt=now();}})} /><label className="tags-field">TAGS<input value={idea.tags.join(", ")} onChange={(e)=>mutate((draft)=>{const item=draft.ideas.find((x)=>x.id===idea.id);if(item){item.tags=e.target.value.split(/[,、]+/).map((value)=>value.trim()).filter(Boolean);item.updatedAt=now();}})} placeholder="金欠, 夜, 部屋" /></label><div className="favorite-meta"><select aria-label="動画尺" value={idea.duration} onChange={(e)=>mutate((draft)=>{const item=draft.ideas.find((x)=>x.id===idea.id);if(item)item.duration=Number(e.target.value);})}>{[30,35,40,45,50,55,60].map((n)=><option key={n} value={n}>{n} sec</option>)}</select><select aria-label="優先度" value={idea.priority} onChange={(e)=>mutate((draft)=>{const item=draft.ideas.find((x)=>x.id===idea.id);if(item)item.priority=Number(e.target.value) as 1|2|3;})}><option value="1">LOW</option><option value="2">MID</option><option value="3">HIGH</option></select></div><div className="card-actions"><button type="button" onClick={()=>mutate((draft)=>{const item=draft.ideas.find((x)=>x.id===idea.id);if(item)item.status="dismissed";})}>REMOVE</button><button className="dark" type="button" onClick={()=>createFromIdea(idea)}>CREATE →</button></div></article>)}{!favorites.length&&<Empty title="まだ空っぽ" text="IDEASでSAVEするか、右上から自分のネタを追加できるよ。" />}</div>
        </section>}

        {view === "create" && <section className="shafu-view create-view">
          <PageTitle eyebrow="WORKBENCH" title="CREATE" sub="選んだネタだけを、段階を踏んで動画にする。" />
          <div className="project-switcher"><select value={activeProjectId || ""} onChange={(e)=>setActiveProjectId(e.target.value||null)}><option value="">制作中の作品を選択</option>{workspace.projects.filter((item)=>!["completed","failed","discarded"].includes(item.status)).map((project)=><option key={project.id} value={project.id}>{project.title}</option>)}</select><button type="button" onClick={()=>{const stamp=now();const idea:ShafuIdea={id:newId(),title:"新しい作品",body:"",duration:45,tags:[],directions:[],styles:["映像主体","セリフ少なめ"],storyType:"SIDE",status:"in_progress",priority:2,duplicateWarning:"",sourceIdeaId:null,source:"manual",createdAt:stamp,updatedAt:stamp};createFromIdea(idea);}}>＋ NEW</button></div>
          {activeProject ? <>
            <div className="stage-nav">{STAGES.map((stage,index)=><button type="button" key={stage} className={activeProject.stage===stage?"active":STAGES.indexOf(activeProject.stage)>index?"done":""} onClick={()=>patchProject(activeProject.id,{stage})}><span>{String(index+1).padStart(2,"0")}</span>{stage.toUpperCase()}</button>)}</div>

            {activeProject.stage === "idea" && <div className="workspace-card idea-stage"><div className="workspace-head"><div><small>01 / IDEA</small><h2>元ネタを整える</h2></div><span>{activeProject.duration} SEC</span></div><label>TITLE<input value={activeProject.title} onChange={(e)=>patchProject(activeProject.id,{title:e.target.value})} /></label><label>IDEA<textarea className="tall" value={activeProject.ideaText} onChange={(e)=>patchProject(activeProject.id,{ideaText:e.target.value})} /></label><div className="field-grid three"><label>LENGTH<select value={activeProject.duration} onChange={(e)=>patchProject(activeProject.id,{duration:Number(e.target.value)})}>{[30,35,40,45,50,55,60].map((n)=><option key={n}>{n}</option>)}</select></label><label>CLASS<select value={activeProject.storyType} onChange={(e)=>patchProject(activeProject.id,{storyType:e.target.value as StoryType})}><option>MAIN</option><option>SIDE</option><option>LINK</option></select></label><label>EPISODES<select value={activeProject.episodeMode} onChange={(e)=>{const mode=e.target.value as ShafuProject["episodeMode"];const count=mode==="single"?1:mode==="two_part"?2:Math.max(3,activeProject.episodeCount);patchProject(activeProject.id,{episodeMode:mode,episodeCount:count,episodes:ensureEpisodes({...activeProject,episodeMode:mode,episodeCount:count},count)});}}><option value="single">1話完結</option><option value="two_part">前後編 / 2話連続</option><option value="series">複数話構成</option></select></label></div>{activeProject.episodeMode==="series"&&<label>EPISODE COUNT<input type="number" min="2" max="8" value={activeProject.episodeCount} onChange={(e)=>{const count=Math.max(2,Math.min(8,Number(e.target.value)||2));patchProject(activeProject.id,{episodeCount:count,episodes:ensureEpisodes(activeProject,count)});}} /></label>}<div className="next-row"><p>変更は自動保存。ここではまだ脚本にしない。</p><button className="primary-action" type="button" disabled={Boolean(busy)} onClick={()=>void developProject(activeProject)}>DEVELOP →</button></div></div>}

            {activeProject.stage === "develop" && <div className="workspace-card"><div className="workspace-head"><div><small>02 / DEVELOP</small><h2>違う見せ方を選ぶ</h2></div><button type="button" className="sub-action" disabled={Boolean(busy)} onClick={()=>void developProject(activeProject)}>{buttonBusy(busy,"develop")?"GENERATING…":"REGENERATE 3"}</button></div>{!activeProject.developments.length?<Empty title="展開案を作ろう" text="同じネタから、ネタに合った異なる見せ方を3案だけ出す。" action={<button className="primary-action" type="button" disabled={Boolean(busy)} onClick={()=>void developProject(activeProject)}>GENERATE 3 DIRECTIONS</button>} />:<div className="development-grid">{activeProject.developments.map((development,index)=><button key={development.id} type="button" className={activeProject.selectedDevelopmentId===development.id?"selected":""} onClick={()=>patchProject(activeProject.id,{selectedDevelopmentId:development.id})}><span>{String(index+1).padStart(2,"0")}</span><h3>{development.label}</h3><p>{development.body}</p><b>{activeProject.selectedDevelopmentId===development.id?"SELECTED":"SELECT"}</b></button>)}</div>}<div className="next-row"><p>選んだ案だけSCENARIOへ送る。</p><button className="primary-action" type="button" disabled={!activeProject.selectedDevelopmentId||Boolean(busy)} onClick={()=>void generateScenario(activeProject)}>{buttonBusy(busy,"scenario")?"WRITING…":"BUILD SCENARIO →"}</button></div></div>}

            {activeProject.stage === "scenario" && <div className="workspace-card"><div className="workspace-head"><div><small>03 / SCENARIO</small><h2>映像で起きることを書く</h2></div><span>{activeProject.duration} SEC · {activeProject.episodeMode==="single"?"ONE SHOT":`${episodeCountFor(activeProject)} EPISODES`}</span></div><div className="refine-bar">{[["less_dialogue","LESS DIALOGUE"],["more_visual","MORE VISUAL"],["weirder","WEIRDER"],["more_shafu","MORE SHAFU"],["stronger_ending","STRONGER ENDING"],["rewrite","REWRITE"]].map(([key,label])=><button key={key} type="button" disabled={Boolean(busy)} onClick={()=>void refineScenario(activeProject,key)}>{buttonBusy(busy,`refine-${key}`)?"…":label}</button>)}</div><label>FULL SCENARIO<textarea ref={scenarioRef} className="scenario-editor" value={activeProject.scenario} onChange={(e)=>patchProject(activeProject.id,{scenario:e.target.value,preflight:[]})} placeholder="0〜5秒：…" /></label>{activeProject.episodes.map((episode,index)=><div className="episode-card" key={episode.id}><div className="episode-head"><input value={episode.title} onChange={(e)=>patchProject(activeProject.id,{episodes:activeProject.episodes.map((item,i)=>i===index?{...item,title:e.target.value}:item)})} /><select value={episode.status} onChange={(e)=>patchProject(activeProject.id,{episodes:activeProject.episodes.map((item,i)=>i===index?{...item,status:e.target.value as Episode["status"]}:item)})}><option value="not_started">未着手</option><option value="in_progress">制作中</option><option value="prompt_ready">プロンプト完成</option><option value="video_ready">動画完成</option></select></div><textarea value={episode.scenario} onChange={(e)=>patchProject(activeProject.id,{episodes:activeProject.episodes.map((item,i)=>i===index?{...item,scenario:e.target.value}:item),preflight:[]})} /></div>)}<div className="next-row"><p>全文は直接編集できる。補助ボタンは指定した方向だけを直す。</p><button className="primary-action" type="button" disabled={Boolean(busy)||!activeProject.scenario.trim()} onClick={()=>void runPreflight(activeProject)}>{buttonBusy(busy,"preflight")?"CHECKING…":"RUN PREFLIGHT →"}</button></div></div>}

            {activeProject.stage === "preflight" && <div className="workspace-card"><div className="workspace-head"><div><small>04 / PREFLIGHT</small><h2>作る前に事故だけ潰す</h2></div><button className="sub-action" type="button" disabled={Boolean(busy)} onClick={()=>void runPreflight(activeProject)}>{buttonBusy(busy,"preflight")?"CHECKING…":"CHECK AGAIN"}</button></div>{!activeProject.preflight.length?<Empty title="まだ未確認" text="BIBLE・STORY・過去作・尺・生成リスクをまとめて照合する。" action={<button className="primary-action" type="button" onClick={()=>void runPreflight(activeProject)}>RUN PREFLIGHT</button>} />:<div className="check-list">{activeProject.preflight.map((check)=><article key={check.category} className={`check ${check.status.toLowerCase()}`}><div className="check-status"><span>{check.status}</span><b>{check.category}</b></div><p>{check.issue||"問題なし"}</p>{check.status!=="OK"&&<><button type="button" onClick={()=>setShownFix(shownFix===check.category?null:check.category)}>SHOW FIX</button>{shownFix===check.category&&<div className="fix-box"><p>{check.proposedFix}</p><button type="button" disabled={Boolean(busy)} onClick={()=>void applyPreflightFix(activeProject,check)}>{buttonBusy(busy,`fix-${check.category}`)?"APPLYING…":"APPLY THIS FIX"}</button></div>}</>}</article>)}</div>}<div className="next-row"><p>警告は強制ではない。別物だと判断したらそのまま進めてOK。</p><button className="primary-action" type="button" onClick={()=>patchProject(activeProject.id,{stage:"prompt"})}>PROMPT →</button></div></div>}

            {activeProject.stage === "prompt" && <div className="workspace-card prompt-stage"><div className="workspace-head"><div><small>05 / PROMPT</small><h2>生成モデルへ渡す</h2></div><span>MODEL-OPTIMIZED</span></div><div className="prompt-config"><label>MODEL<select value={activeProject.promptModel} onChange={(e)=>{const promptModel=e.target.value as "H3"|"Seedance";patchProject(activeProject.id,{promptModel,promptMaxChars:promptModel==="H3"?Math.min(7000,activeProject.promptMaxChars):activeProject.promptMaxChars});}}><option value="H3">MiniMax H3</option><option value="Seedance">Seedance</option></select></label><label>LENGTH<select value={activeProject.duration} onChange={(e)=>patchProject(activeProject.id,{duration:Number(e.target.value)})}>{[30,35,40,45,50,55,60].map((n)=><option key={n}>{n} sec</option>)}</select></label><label>MAX CHARS<input type="number" min="1000" max={activeProject.promptModel==="H3"?7000:25000} step="100" value={activeProject.promptMaxChars} onChange={(e)=>patchProject(activeProject.id,{promptMaxChars:Math.max(1000,Math.min(activeProject.promptModel==="H3"?7000:25000,Number(e.target.value)||7000))})} /></label></div><label>SCENARIO<textarea ref={scenarioRef} className="scenario-editor compact" value={activeProject.scenario} onChange={(e)=>patchProject(activeProject.id,{scenario:e.target.value})} /></label><label>EXTRA DIRECTION<textarea className="compact" value={activeProject.extraDirection} onChange={(e)=>patchProject(activeProject.id,{extraDirection:e.target.value})} placeholder="この作品だけの追加指示" /></label><div className="asset-library"><div className="asset-title"><div><b>REFERENCE IMAGES</b><span>選択順に @image1, @image2…</span></div><label className="upload-button">＋ UPLOAD<input hidden type="file" accept="image/*" multiple onChange={(event)=>void uploadAsset(event,"reference",activeProject)} /></label></div><div className="asset-grid">{assets.filter((asset)=>asset.kind==="reference").map((asset)=>{const index=activeProject.selectedAssetIds.indexOf(asset.id);return <article className={index>=0?"selected":""} key={asset.id}><button className="asset-select" type="button" onClick={()=>insertReference(activeProject,asset.id)}>{asset.signed_url?<Image src={asset.signed_url} width={180} height={120} unoptimized alt={asset.tag||asset.file_name} />:<span>IMAGE</span>}<small>{asset.tag||asset.file_name}</small>{index>=0&&<b>@image{index+1}</b>}</button><button className="asset-delete" type="button" aria-label={`${asset.file_name}を削除`} onClick={()=>void removeAsset(asset)}>×</button></article>})}{!assets.some((asset)=>asset.kind==="reference")&&<p className="asset-empty">ログイン後、参照画像をアップロードできます。</p>}</div></div><button className="primary-action full" type="button" disabled={Boolean(busy)||!scenarioForPrompt(activeProject).trim()} onClick={()=>void buildPrompt(activeProject)}>{buttonBusy(busy,"prompt")?"BUILDING…":"BUILD MODEL PROMPT"}</button><div className="prompt-columns"><div><div className="prompt-label"><b>ENGLISH</b><span>{Array.from(activeProject.promptEn).length} / {activeProject.promptMaxChars}</span></div><textarea value={activeProject.promptEn} onChange={(e)=>patchProject(activeProject.id,{promptEn:e.target.value})} /><div className="prompt-actions"><button type="button" onClick={()=>void navigator.clipboard.writeText(activeProject.promptEn)}>COPY</button><button type="button" disabled={Boolean(busy)} onClick={()=>void syncPrompt(activeProject,"en")}>{buttonBusy(busy,"sync-en")?"SYNCING…":"EN → 日本語"}</button></div></div><div><div className="prompt-label"><b>日本語</b><span>{Array.from(activeProject.promptJa).length} / {activeProject.promptMaxChars}</span></div><textarea value={activeProject.promptJa} onChange={(e)=>patchProject(activeProject.id,{promptJa:e.target.value})} /><div className="prompt-actions"><button type="button" onClick={()=>void navigator.clipboard.writeText(activeProject.promptJa)}>COPY</button><button type="button" disabled={Boolean(busy)} onClick={()=>void syncPrompt(activeProject,"ja")}>{buttonBusy(busy,"sync-ja")?"同期中…":"日本語 → EN"}</button></div></div></div><div className="finish-panel"><div><label>POSTED AT<input type="date" value={activeProject.postedAt} onChange={(e)=>patchProject(activeProject.id,{postedAt:e.target.value})} /></label><label>POST TO<input value={activeProject.postChannels.join(", ")} onChange={(e)=>patchProject(activeProject.id,{postChannels:e.target.value.split(/[,、]+/).map((v)=>v.trim()).filter(Boolean)})} placeholder="Instagram, TikTok" /></label></div><div><label>MEMO<textarea value={activeProject.memo} onChange={(e)=>patchProject(activeProject.id,{memo:e.target.value})} /></label><label>FAILED REASON<select value={activeProject.failureReason} onChange={(e)=>patchProject(activeProject.id,{failureReason:e.target.value})}><option value="">—</option><option>生成失敗</option><option>動きがおかしい</option><option>シナリオが弱い</option><option>社不ちゃんらしくない</option><option>オチが弱い</option><option>その他</option></select></label></div><div className="finish-actions"><label className="upload-button video">UPLOAD FINISHED VIDEO<input hidden type="file" accept="video/*" onChange={(event)=>void uploadAsset(event,"completed_video",activeProject)} /></label><button type="button" onClick={()=>archiveProject(activeProject,"retry")}>RETRY</button><button type="button" onClick={()=>archiveProject(activeProject,"failed",activeProject.failureReason||"その他")}>FAILED / ボツ</button><button className="complete" type="button" onClick={()=>archiveProject(activeProject,"completed")}>COMPLETED</button></div></div></div>}
          </>:<Empty title="制作中の作品なし" text="IDEASかFAVORITESでCREATEを押すか、上のNEWから始めよう。" />}
        </section>}

        {view === "story" && <section className="shafu-view">
          <PageTitle eyebrow="CONTINUITY" title="STORY" sub="変化する現在地を管理。9月8日のMTG後も、ここを書き換えるだけ。" />
          <div className="story-grid">{([['current','CURRENT','いま本筋のどこにいるか'],['goal','GOAL','最終的にどこへ向かうか'],['mainArc','MAIN ARC','現在の章・大きな流れ'],['unresolved','UNRESOLVED','未回収の伏線・未解決事項'],['characterState','CHARACTER STATE','現在の関係性と状態']] as const).map(([key,label,hint])=><label className={key==="current"||key==="goal"?"wide":""} key={key}><b>{label}</b><span>{hint}</span><textarea value={workspace.story[key]} onChange={(e)=>mutate((draft)=>{draft.story[key]=e.target.value;})} /></label>)}</div>
          <div className="section-head"><div><small>EDITABLE</small><h2>MILESTONES</h2></div><button type="button" onClick={()=>mutate((draft)=>{draft.milestones.push({id:newId(),title:"",detail:"",status:"candidate"});})}>＋ ADD</button></div><div className="milestone-list">{workspace.milestones.map((item)=><article key={item.id}><select value={item.status} onChange={(e)=>mutate((draft)=>{const row=draft.milestones.find((x)=>x.id===item.id);if(row)row.status=e.target.value as typeof item.status;})}><option value="candidate">CANDIDATE</option><option value="confirmed">CONFIRMED</option><option value="done">DONE</option></select><input value={item.title} onChange={(e)=>mutate((draft)=>{const row=draft.milestones.find((x)=>x.id===item.id);if(row)row.title=e.target.value;})} placeholder="重要イベント" /><textarea value={item.detail} onChange={(e)=>mutate((draft)=>{const row=draft.milestones.find((x)=>x.id===item.id);if(row)row.detail=e.target.value;})} placeholder="まだ候補なら候補のままでOK" /><button type="button" onClick={()=>mutate((draft)=>{draft.milestones=draft.milestones.filter((x)=>x.id!==item.id);})}>DELETE</button></article>)}{!workspace.milestones.length&&<Empty title="未確定でOK" text="メインストーリーを決める前でも、候補だけ置いておける。" />}</div>
          <div className="section-head timeline-heading"><div><small>DRAG OR MOVE</small><h2>TIMELINE</h2></div><button type="button" onClick={()=>mutate((draft)=>{draft.timeline.push({id:newId(),projectId:null,episodeId:null,order:draft.timeline.length+1,code:`SIDE ${String(draft.timeline.length+1).padStart(2,"0")}`,title:"",storyType:"SIDE",whatHappened:"",characterChange:"",newCanon:"",resolvedThreads:"",newThreads:"",publishedAt:""});})}>＋ ADD</button></div><div className="timeline-list">{[...workspace.timeline].sort((a,b)=>a.order-b.order).map((item,index)=><article key={item.id} draggable onDragStart={()=>setDragTimelineId(item.id)} onDragOver={(e:DragEvent)=>e.preventDefault()} onDrop={()=>{if(dragTimelineId)reorderTimeline(dragTimelineId,item.id);setDragTimelineId(null);}}><div className="timeline-order"><span>{String(index+1).padStart(2,"0")}</span><button type="button" onClick={()=>moveTimeline(item.id,-1)}>↑</button><button type="button" onClick={()=>moveTimeline(item.id,1)}>↓</button></div><div className="timeline-main"><div className="field-grid three"><label>CODE<input value={item.code} onChange={(e)=>mutate((draft)=>{const row=draft.timeline.find((x)=>x.id===item.id);if(row)row.code=e.target.value;})} /></label><label>TYPE<select value={item.storyType} onChange={(e)=>mutate((draft)=>{const row=draft.timeline.find((x)=>x.id===item.id);if(row)row.storyType=e.target.value as StoryType;})}><option>MAIN</option><option>SIDE</option><option>LINK</option></select></label><label>TITLE<input value={item.title} onChange={(e)=>mutate((draft)=>{const row=draft.timeline.find((x)=>x.id===item.id);if(row)row.title=e.target.value;})} /></label></div><label className="published-field">PUBLISHED AT<input type="date" value={item.publishedAt} onChange={(e)=>mutate((draft)=>{const row=draft.timeline.find((x)=>x.id===item.id);if(row)row.publishedAt=e.target.value;})} /></label><label>WHAT HAPPENED<textarea value={item.whatHappened} onChange={(e)=>mutate((draft)=>{const row=draft.timeline.find((x)=>x.id===item.id);if(row)row.whatHappened=e.target.value;})} /></label><details><summary>変化・設定・伏線</summary><div className="field-grid two">{([['characterChange','CHARACTER CHANGE'],['newCanon','NEW CANON'],['resolvedThreads','RESOLVED'],['newThreads','NEW THREADS']] as const).map(([key,label])=><label key={key}>{label}<textarea value={item[key]} onChange={(e)=>mutate((draft)=>{const row=draft.timeline.find((x)=>x.id===item.id);if(row)row[key]=e.target.value;})} /></label>)}</div></details></div><button className="timeline-delete" type="button" onClick={()=>mutate((draft)=>{draft.timeline=draft.timeline.filter((x)=>x.id!==item.id).map((row,i)=>({...row,order:i+1}));})}>×</button></article>)}{!workspace.timeline.length&&<Empty title="公開順はまだ空" text="COMPLETEDにすると自動で追加。先に予定だけ並べてもOK。" />}</div>
        </section>}

        {view === "archive" && <section className="shafu-view">
          <PageTitle eyebrow="MEMORY" title="ARCHIVE" sub="完成もボツも残す。失敗理由は参考情報であって、AIの勝手な採点には使わない。" />
          <div className="archive-search"><input type="search" value={archiveQuery} onChange={(e)=>{setArchiveQuery(e.target.value);setSemanticIds(null);}} placeholder="金欠ネタ / 家から出ようとして結局出ない系" /><button type="button" disabled={Boolean(busy)||!archive.length} onClick={()=>void semanticSearch()}>{buttonBusy(busy,"semantic")?"SEARCHING…":"MEANING SEARCH"}</button>{semanticIds&&<button type="button" onClick={()=>setSemanticIds(null)}>CLEAR</button>}</div>
          <div className="archive-list">{visibleArchive.map((project)=>{const media=assets.filter((asset)=>asset.project_id===project.id||project.selectedAssetIds.includes(asset.id));return <article key={project.id}><div className="archive-status"><span className={project.status}>{project.status.toUpperCase()}</span><small>{formatDate(project.updatedAt)}</small></div><div><div className="idea-meta"><span>{project.duration} SEC</span><span className={`type ${project.storyType.toLowerCase()}`}>{project.storyType}</span><span>{project.promptModel}</span></div><h2>{project.title}</h2><p>{clip(project.ideaText||project.scenario,180)}</p>{project.failureReason&&<div className="failure">REASON · {project.failureReason}</div>}<details><summary>保存内容を見る</summary><label>ORIGINAL IDEA<textarea readOnly value={project.ideaText} /></label><label>SCENARIO<textarea readOnly value={project.scenario} /></label>{project.episodes.map((episode)=><label key={episode.id}>{episode.title} · {episode.status}<textarea readOnly value={episode.scenario} /></label>)}<label>FINAL PROMPT · EN<textarea readOnly value={project.promptEn} /></label><label>FINAL PROMPT · 日本語<textarea readOnly value={project.promptJa} /></label>{project.memo&&<label>MEMO<textarea readOnly value={project.memo} /></label>}{media.length>0&&<div className="archive-media"><b>MEDIA / REFERENCES</b>{media.map((asset)=><div key={asset.id}>{asset.kind==="completed_video"&&asset.signed_url?<video controls preload="metadata" src={asset.signed_url} />:asset.kind==="reference"&&asset.signed_url?<Image src={asset.signed_url} width={160} height={100} unoptimized alt={asset.tag||asset.file_name} />:<span>FILE</span>}<a href={asset.signed_url||undefined} target="_blank" rel="noreferrer">{asset.file_name}</a><button type="button" onClick={()=>void removeAsset(asset)}>DELETE</button></div>)}</div>}<div className="archive-detail">投稿日 {project.postedAt||"—"} · 投稿先 {project.postChannels.join(", ")||"—"}</div></details></div><button type="button" onClick={()=>openProject(project.id,"prompt")}>OPEN</button></article>})}{!visibleArchive.length&&<Empty title={archive.length?"一致なし":"まだ作品なし"} text={archive.length?"言い方を変えるか、MEANING SEARCHを試してね。":"PROMPTの最後でCOMPLETEDかFAILEDを選ぶと、ここへ残る。"} />}</div>
        </section>}

        {view === "bible" && <section className="shafu-view">
          <PageTitle eyebrow={`CANON v${workspace.bibleVersion}`} title="BIBLE" sub="変わらない基本設定。時間で変化する情報はSTORYへ。" action={<button className="page-action dark" type="button" onClick={saveBible}>SAVE BIBLE</button>} />
          <div className="bible-history"><span>VERSION HISTORY</span><select defaultValue="" onChange={(e)=>{const version=workspace.bibleHistory.find((item)=>item.version===Number(e.target.value));if(version)setBibleDraft(structuredClone(version.content));e.currentTarget.value="";}}><option value="">過去版を読み込む</option>{[...workspace.bibleHistory].reverse().map((item)=><option key={item.version} value={item.version}>v{item.version} · {formatDate(item.savedAt,true)}</option>)}</select><small>読み込んだだけでは保存されません。</small></div>
          <div className="bible-grid">{BIBLE_FIELDS.map((field)=><label key={field.key}><div><b>{field.label}</b><span>{field.hint}</span></div><textarea value={bibleDraft[field.key]} onChange={(e)=>setBibleDraft({...bibleDraft,[field.key]:e.target.value})} /></label>)}</div>
          <div className="sticky-save"><span>最新版はすべてのAI工程から自動参照</span><button type="button" onClick={saveBible}>SAVE BIBLE · v{workspace.bibleVersion+1}</button></div>
        </section>}

        {view === "notes" && <section className="shafu-view">
          <PageTitle eyebrow="SCRATCHPAD" title="NOTES" sub="整えなくていいメモ帳。書いたまま自動保存する。" action={<button className="page-action" type="button" onClick={addNote}>＋ NEW NOTE</button>} />
          <div className="notes-search"><input type="search" value={noteQuery} onChange={(e)=>setNoteQuery(e.target.value)} placeholder="メモを検索" /></div><div className="notes-grid">{workspace.notes.filter((note)=>[note.title,note.body].join(" ").toLowerCase().includes(noteQuery.toLowerCase())).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt.localeCompare(a.updatedAt)).map((note)=><article key={note.id} className={note.pinned?"pinned":""}><div className="note-top"><button type="button" onClick={()=>mutate((draft)=>{const row=draft.notes.find((x)=>x.id===note.id);if(row)row.pinned=!row.pinned;})}>{note.pinned?"PINNED":"PIN"}</button><span>{formatDate(note.updatedAt,true)}</span><button type="button" onClick={()=>{if(confirm("このメモを削除する？"))mutate((draft)=>{draft.notes=draft.notes.filter((x)=>x.id!==note.id);});}}>DELETE</button></div><input value={note.title} onChange={(e)=>mutate((draft)=>{const row=draft.notes.find((x)=>x.id===note.id);if(row){row.title=e.target.value;row.updatedAt=now();}})} placeholder="TITLE" /><textarea value={note.body} onChange={(e)=>mutate((draft)=>{const row=draft.notes.find((x)=>x.id===note.id);if(row){row.body=e.target.value;row.updatedAt=now();}})} placeholder="思いつき、MTGで聞くこと、ネタの断片、保留事項…" /><div className="note-actions"><button type="button" onClick={()=>noteToStory(note)}>STORYへコピー</button><button className="dark" type="button" onClick={()=>noteToIdea(note)}>IDEASへコピー</button></div></article>)}{!workspace.notes.length&&<Empty title="雑でいい場所" text="MTGで聞きたいことも、動画の一言だけも、ここに放り込める。" action={<button className="primary-action" type="button" onClick={addNote}>CREATE FIRST NOTE</button>} />}</div>
        </section>}
      </main>

      <nav className="shafu-mobile-nav" aria-label="Mobile navigation">{NAV.map((item)=><button type="button" key={item.id} className={view===item.id?"active":""} onClick={()=>setView(item.id)}><i>{item.short}</i><span>{item.label}</span></button>)}</nav>

      {settingsOpen && <div className="settings-modal" role="dialog" aria-modal="true" aria-label="SHAFU settings" onMouseDown={(e)=>{if(e.target===e.currentTarget)setSettingsOpen(false);}}><div className="settings-card"><div className="settings-head"><div><small>SHAFU</small><h2>SETTINGS</h2></div><button type="button" onClick={()=>setSettingsOpen(false)}>×</button></div><label>OPENAI API KEY<input type="password" value={apiKeyDraft} onChange={(e)=>setApiKeyDraft(e.target.value)} placeholder="sk-..." autoComplete="off" /></label><label className="remember"><input type="checkbox" checked={rememberKey} onChange={(e)=>setRememberKey(e.target.checked)} />この端末に保存する</label><p>未チェックなら、このタブを閉じるまでだけ保持。キーはWS studioのDBへ保存しません。</p><button className="primary-action full" type="button" onClick={()=>{const key=apiKeyDraft.trim();if(!key){localStorage.removeItem(KEY_LOCAL);sessionStorage.removeItem(KEY_SESSION);}else if(rememberKey){localStorage.setItem(KEY_LOCAL,key);sessionStorage.removeItem(KEY_SESSION);}else{sessionStorage.setItem(KEY_SESSION,key);localStorage.removeItem(KEY_LOCAL);}setNotice(key?"APIキーを保存したよ。":"APIキーを削除したよ。");}}>SAVE KEY</button><div className="field-grid"><label>AI QUALITY<select value={workspace.settings.tier} onChange={(e)=>mutate((draft)=>{draft.settings.tier=e.target.value as ShafuWorkspace["settings"]["tier"];})}><option value="economy">Economy · Luna</option><option value="standard">Standard · Terra</option><option value="deep">Deep · Sol</option></select></label><label>DEFAULT MODEL<select value={workspace.settings.defaultVideoModel} onChange={(e)=>mutate((draft)=>{draft.settings.defaultVideoModel=e.target.value as "H3"|"Seedance";})}><option value="H3">MiniMax H3</option><option value="Seedance">Seedance</option></select></label></div><label>CUSTOM DIRECTIONS<input value={workspace.settings.customDirections.join(", ")} onChange={(e)=>mutate((draft)=>{draft.settings.customDirections=e.target.value.split(/[,、]+/).map((value)=>value.trim()).filter(Boolean);})} placeholder="追加・編集するカテゴリをカンマ区切りで" /></label><div className="settings-rule">BGMなし · 不要な文字なし · 実在ブランド/ロゴなし · 面白さの自動採否なし</div></div></div>}
    </div>
  );
}

function PageTitle({ eyebrow, title, sub, action }: { eyebrow: string; title: string; sub: string; action?: React.ReactNode }) {
  return <div className="page-title"><div><span>{eyebrow}</span><h1>{title}</h1><p>{sub}</p></div>{action}</div>;
}

function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span>○</span><h3>{title}</h3><p>{text}</p>{action}</div>;
}
