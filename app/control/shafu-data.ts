export type ViewName = "home" | "ideas" | "favorites" | "create" | "story" | "archive" | "bible" | "notes";
export type StoryType = "MAIN" | "SIDE" | "LINK";
export type EpisodeStatus = "not_started" | "in_progress" | "prompt_ready" | "video_ready";
export type WorkStatus = "draft" | "in_progress" | "completed" | "retry" | "failed" | "discarded";

export type ShafuIdea = {
  id: string;
  title: string;
  body: string;
  duration: number;
  tags: string[];
  directions: string[];
  styles: string[];
  storyType: StoryType;
  status: "generated" | "favorite" | "dismissed" | "in_progress";
  priority: 1 | 2 | 3;
  duplicateWarning: string;
  sourceIdeaId: string | null;
  source: "ai" | "manual" | "note";
  createdAt: string;
  updatedAt: string;
};

export type Development = {
  id: string;
  label: string;
  body: string;
};

export type Episode = {
  id: string;
  position: number;
  title: string;
  status: EpisodeStatus;
  scenario: string;
  promptEn: string;
  promptJa: string;
};

export type PreflightCheck = {
  category: "CHARACTER" | "WORLD" | "STORY" | "DUPLICATION" | "DIALOGUE" | "VISUAL" | "LENGTH" | "GENERATION RISK";
  status: "OK" | "REVIEW" | "FIX";
  issue: string;
  proposedFix: string;
};

export type ShafuProject = {
  id: string;
  ideaId: string | null;
  title: string;
  ideaText: string;
  duration: number;
  storyType: StoryType;
  episodeMode: "single" | "two_part" | "series";
  episodeCount: number;
  stage: "idea" | "develop" | "scenario" | "preflight" | "prompt";
  developments: Development[];
  selectedDevelopmentId: string | null;
  scenario: string;
  episodes: Episode[];
  preflight: PreflightCheck[];
  promptModel: "H3" | "Seedance";
  promptEn: string;
  promptJa: string;
  promptMaxChars: number;
  extraDirection: string;
  selectedAssetIds: string[];
  status: WorkStatus;
  failureReason: string;
  memo: string;
  postedAt: string;
  postChannels: string[];
  createdAt: string;
  updatedAt: string;
};

export type StoryState = {
  current: string;
  goal: string;
  mainArc: string;
  unresolved: string;
  characterState: string;
};

export type Milestone = {
  id: string;
  title: string;
  detail: string;
  status: "candidate" | "confirmed" | "done";
};

export type TimelineItem = {
  id: string;
  projectId: string | null;
  episodeId: string | null;
  order: number;
  code: string;
  title: string;
  storyType: StoryType;
  whatHappened: string;
  characterChange: string;
  newCanon: string;
  resolvedThreads: string;
  newThreads: string;
  publishedAt: string;
};

export type Bible = {
  character: string;
  personality: string;
  voice: string;
  home: string;
  world: string;
  videoStyle: string;
  never: string;
  styleReferences: string;
  freeNotes: string;
};

export type BibleVersion = {
  version: number;
  savedAt: string;
  content: Bible;
};

export type ShafuNote = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShafuSettings = {
  tier: "economy" | "standard" | "deep";
  defaultVideoModel: "H3" | "Seedance";
  ideaCount: 20 | 24 | 30;
  customDirections: string[];
};

export type ShafuWorkspace = {
  schemaVersion: 2;
  ideas: ShafuIdea[];
  projects: ShafuProject[];
  story: StoryState;
  milestones: Milestone[];
  timeline: TimelineItem[];
  bible: Bible;
  bibleVersion: number;
  bibleHistory: BibleVersion[];
  notes: ShafuNote[];
  settings: ShafuSettings;
  legacyImported: boolean;
  legacyAssetsImported: boolean;
  updatedAt: string;
};

export const DIRECTIONS = ["日常", "酒", "金欠", "仕事", "恋愛", "食事", "外出", "SNS", "夜", "ランダム", "その他"];
export const STYLES = ["映像主体", "セリフ少なめ", "シュール寄り", "かわいさ寄り", "ダーク寄り"];

export const DEFAULT_BIBLE: Bible = {
  character: "社不ちゃん。21歳、153cm。高校卒業後に事務職を経験して退職し、現在はフリーター。華奢で、少し疲れて見えるが自然にかわいい。",
  personality: "だるそうで少し投げやり。社会生活は雑だが、妙なところで行動力がある。本人は異常なことも真面目に普通のこととして行う。自虐はするが、自分を可哀想には見せすぎない。",
  voice: "20代前半〜中盤の女性。基音225〜245Hz程度のmid-high。head-mix優勢で明るく少しエアリー。近接収音。眠そう、だるそうな可愛さと自然な不完全性。短い自然な口語で、説明口調を避ける。",
  home: "築約50年の『かわい荘』2階にある1K。白い敷布団、ちゃぶ台、水色のカーテン。ユニットバスの鏡前には水色のコップと黄色い歯ブラシ。生活感を残し、おしゃれにしすぎない。",
  world: "生活圏：かわい荘、きさらぎ駅、居酒屋『豚奴隷』、コンビニ『ファミリーマーケット』、激安スーパー『竿出』、コインランドリー、公園、河川敷。好き：酒、タバコ、サーモン、モツ煮。苦手：パクチー、セロリ。公開済み小話：闇バイトっぽい求人に気づき布団へ戻る／暑すぎて冷凍庫を開けたまま寝ようとする／タバコが切れて雑草を巻く。",
  videoStyle: "説明しすぎず、しゃべらせすぎず、映像と間で見せる。きれいな起承転結を無理に作らない。キャラクターはボケようとせず真面目に行動し、結果として変になる。髪、服、小物、背景は必要に応じて自然に動く。BGMなし。",
  never: "長い教訓／状況を説明する独り言／セリフでオチを解説／不幸自慢だけで終わる／急に裕福になる／公開済み設定と矛盾する過去や人物関係の確定／不要な文字・字幕・テロップ・ウォーターマーク／実在ブランド、ロゴ、実在店舗看板の生成。",
  styleReferences: "",
  freeNotes: "",
};

export function now() { return new Date().toISOString(); }
export function newId() { return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`; }

export function createDefaultWorkspace(): ShafuWorkspace {
  return {
    schemaVersion: 2,
    ideas: [],
    projects: [],
    story: { current: "", goal: "", mainArc: "", unresolved: "", characterState: "" },
    milestones: [],
    timeline: [],
    bible: { ...DEFAULT_BIBLE },
    bibleVersion: 1,
    bibleHistory: [{ version: 1, savedAt: now(), content: { ...DEFAULT_BIBLE } }],
    notes: [],
    settings: { tier: "standard", defaultVideoModel: "H3", ideaCount: 24, customDirections: [] },
    legacyImported: false,
    legacyAssetsImported: false,
    updatedAt: now(),
  };
}

export function normalizeWorkspace(input: Partial<ShafuWorkspace> | null | undefined): ShafuWorkspace {
  const base = createDefaultWorkspace();
  if (!input || typeof input !== "object") return base;
  return {
    ...base,
    ...input,
    schemaVersion: 2,
    ideas: Array.isArray(input.ideas) ? input.ideas : [],
    projects: Array.isArray(input.projects) ? input.projects : [],
    milestones: Array.isArray(input.milestones) ? input.milestones : [],
    timeline: Array.isArray(input.timeline) ? input.timeline : [],
    notes: Array.isArray(input.notes) ? input.notes : [],
    bible: { ...DEFAULT_BIBLE, ...(input.bible || {}) },
    story: { ...base.story, ...(input.story || {}) },
    settings: { ...base.settings, ...(input.settings || {}) },
    bibleHistory: Array.isArray(input.bibleHistory) && input.bibleHistory.length ? input.bibleHistory : base.bibleHistory,
    legacyAssetsImported: Boolean(input.legacyAssetsImported),
  };
}

export function migrateLegacyControl(workspace: ShafuWorkspace): ShafuWorkspace {
  if (workspace.legacyImported || typeof window === "undefined") return workspace;
  const copy = structuredClone(workspace);
  copy.legacyImported = true;
  try {
    const raw = localStorage.getItem("ws_control_v3_state");
    if (!raw) return copy;
    const legacy = JSON.parse(raw);
    const character = legacy?.characters?.find((item: { id?: string }) => item?.id === "shafuchan") || legacy?.characters?.[0];
    const bible = legacy?.bible || {};
    copy.bible = {
      character: [character?.appearance, "年齢・身体・外見の日本語メモ：", character?.notes].filter(Boolean).join("\n\n") || copy.bible.character,
      personality: character?.personality || copy.bible.personality,
      voice: [character?.voice, character?.speaking, character?.dialogueExamples ? `セリフ例：\n${character.dialogueExamples}` : "", character?.bannedPhrases ? `避ける表現：\n${character.bannedPhrases}` : ""].filter(Boolean).join("\n\n") || copy.bible.voice,
      home: bible.home || character?.world || copy.bible.home,
      world: [bible.places || character?.places, bible.relationships, bible.recurringProps, bible.canon].filter(Boolean).join("\n\n") || copy.bible.world,
      videoStyle: [bible.visualRules, bible.storyRules].filter(Boolean).join("\n\n") || copy.bible.videoStyle,
      never: [bible.neverDo, bible.continuity].filter(Boolean).join("\n\n") || copy.bible.never,
      styleReferences: copy.bible.styleReferences,
      freeNotes: [bible.premise, bible.timeline, bible.openThreads].filter(Boolean).join("\n\n") || copy.bible.freeNotes,
    };
    copy.bibleVersion += 1;
    copy.bibleHistory = [...copy.bibleHistory, { version: copy.bibleVersion, savedAt: now(), content: structuredClone(copy.bible) }].slice(-10);

    const draft = String(legacy?.draft || "").trim();
    const draftTitle = String(legacy?.draftMeta?.title || "旧Controlから引き継いだ制作途中").trim();
    if (draft) {
      const projectId = newId();
      copy.projects.unshift({
        id: projectId, ideaId: null, title: draftTitle, ideaText: draft, duration: 45, storyType: "SIDE",
        episodeMode: "single", episodeCount: 1, stage: "scenario", developments: [], selectedDevelopmentId: null,
        scenario: draft, episodes: [], preflight: [], promptModel: "H3", promptEn: "", promptJa: "", promptMaxChars: 7000,
        extraDirection: "", selectedAssetIds: [], status: "in_progress", failureReason: "", memo: "旧Controlから自動移行",
        postedAt: "", postChannels: [], createdAt: now(), updatedAt: now(),
      });
    }
  } catch {
    // Broken legacy data must not block the new workspace.
  }
  return copy;
}

export function projectFromIdea(idea: ShafuIdea, promptModel: ShafuProject["promptModel"] = "H3"): ShafuProject {
  return {
    id: newId(), ideaId: idea.id, title: idea.title, ideaText: idea.body, duration: idea.duration,
    storyType: idea.storyType, episodeMode: "single", episodeCount: 1, stage: "idea",
    developments: [], selectedDevelopmentId: null, scenario: "", episodes: [], preflight: [],
    promptModel, promptEn: "", promptJa: "", promptMaxChars: 7000, extraDirection: "",
    selectedAssetIds: [], status: "in_progress", failureReason: "", memo: "", postedAt: "", postChannels: [],
    createdAt: now(), updatedAt: now(),
  };
}

export function priorityLabel(value: number) {
  return value === 3 ? "HIGH" : value === 2 ? "MID" : "LOW";
}

export function episodeStatusLabel(value: EpisodeStatus) {
  return ({ not_started: "未着手", in_progress: "制作中", prompt_ready: "プロンプト完成", video_ready: "動画完成" })[value];
}
