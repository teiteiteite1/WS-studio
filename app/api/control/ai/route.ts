import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Tier = "economy" | "standard" | "deep";
type GeneratedIdea = {
  title: string;
  body: string;
  duration: number;
  tags: string[];
  storyType: "MAIN" | "SIDE" | "LINK";
  duplicateWarning: string;
};
type DevelopmentResult = { label: string; body: string };
type ScenarioEpisodeResult = { title: string; scenario: string };
type ScenarioResult = { title: string; scenario: string; episodes: ScenarioEpisodeResult[] };
type PreflightResult = {
  category: "CHARACTER" | "WORLD" | "STORY" | "DUPLICATION" | "DIALOGUE" | "VISUAL" | "LENGTH" | "GENERATION RISK";
  status: "OK" | "REVIEW" | "FIX";
  issue: string;
  proposedFix: string;
};
type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  model?: string;
  error?: { code?: string; type?: string; message?: string };
};
const MODELS: Record<Tier, string> = {
  economy: "gpt-5.6-luna",
  standard: "gpt-5.6-terra",
  deep: "gpt-5.6-sol",
};

const ideaItemSchema = {
  type: "object", additionalProperties: false,
  properties: {
    title: { type: "string" }, body: { type: "string" }, duration: { type: "integer" },
    tags: { type: "array", items: { type: "string" } },
    storyType: { type: "string", enum: ["MAIN", "SIDE", "LINK"] },
    duplicateWarning: { type: "string" },
  },
  required: ["title", "body", "duration", "tags", "storyType", "duplicateWarning"],
};
const ideasSchema = {
  type: "object", additionalProperties: false,
  properties: { ideas: { type: "array", items: ideaItemSchema } }, required: ["ideas"],
};
const developmentsSchema = {
  type: "object", additionalProperties: false,
  properties: { developments: { type: "array", items: {
    type: "object", additionalProperties: false,
    properties: { label: { type: "string" }, body: { type: "string" } }, required: ["label", "body"],
  } } }, required: ["developments"],
};
const scenarioSchema = {
  type: "object", additionalProperties: false,
  properties: {
    title: { type: "string" }, scenario: { type: "string" },
    episodes: { type: "array", items: {
      type: "object", additionalProperties: false,
      properties: { title: { type: "string" }, scenario: { type: "string" } }, required: ["title", "scenario"],
    } },
  }, required: ["title", "scenario", "episodes"],
};
const checkSchema = {
  type: "object", additionalProperties: false,
  properties: {
    category: { type: "string", enum: ["CHARACTER", "WORLD", "STORY", "DUPLICATION", "DIALOGUE", "VISUAL", "LENGTH", "GENERATION RISK"] },
    status: { type: "string", enum: ["OK", "REVIEW", "FIX"] },
    issue: { type: "string" }, proposedFix: { type: "string" },
  }, required: ["category", "status", "issue", "proposedFix"],
};
const preflightSchema = {
  type: "object", additionalProperties: false,
  properties: { checks: { type: "array", items: checkSchema } }, required: ["checks"],
};
const promptSchema = {
  type: "object", additionalProperties: false,
  properties: { english: { type: "string" }, japanese: { type: "string" } }, required: ["english", "japanese"],
};
const idsSchema = {
  type: "object", additionalProperties: false,
  properties: { ids: { type: "array", items: { type: "string" } } }, required: ["ids"],
};

class OpenAIRequestError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = "") { super(message); this.status = status; this.code = code; }
}

function chars(value: string) { return Array.from(value || "").length; }
function trimChars(value: string, limit: number) {
  if (chars(value) <= limit) return value;
  return `${Array.from(value).slice(0, Math.max(0, limit - 1)).join("").trimEnd()}…`;
}
function clampDuration(value: unknown) {
  const rounded = Math.round(Number(value) / 5) * 5;
  return Math.max(30, Math.min(60, Number.isFinite(rounded) ? rounded : 45));
}
function boundedJSON(value: unknown, max = 45_000) {
  const text = JSON.stringify(value ?? null, null, 2);
  return chars(text) <= max ? text : `${Array.from(text).slice(0, max).join("")}\n[truncated]`;
}
function textFrom(data: OpenAIResponse) {
  if (typeof data?.output_text === "string") return data.output_text;
  const output: string[] = [];
  for (const item of data?.output || []) if (item?.type === "message") {
    for (const content of item.content || []) if (content?.type === "output_text" && typeof content.text === "string") output.push(content.text);
  }
  return output.join("\n").trim();
}
function parseJSON<T>(text: string): T {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(clean) as T; }
  catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1)) as T;
    throw new Error("AIの返答を読み取れませんでした。もう一度実行してください。");
  }
}
function friendlyOpenAIError(status: number, data: OpenAIResponse) {
  const code = String(data?.error?.code || data?.error?.type || "");
  const raw = String(data?.error?.message || `OpenAI API error (${status})`);
  if (status === 401 || /invalid_api_key|incorrect api key/i.test(`${code} ${raw}`)) return "APIキーが無効です。OpenAI PlatformでSecret keyを確認してください。";
  if (/credit_balance_exhausted|insufficient_quota|spend_limit|usage_limit/i.test(`${code} ${raw}`)) return "OpenAI APIの残高または利用上限に達しています。ChatGPT Plusとは別枠です。";
  if (status === 429) return "OpenAI APIのレート制限に達しました。少し待ってから再実行してください。";
  if (status === 403) return "このAPIキーでは指定モデルを利用できません。Project権限を確認してください。";
  if (status === 404 && /model/i.test(raw)) return "指定モデルを利用できないため、Economyへ切り替えて再試行してください。";
  return raw;
}
async function postOpenAI(key: string, body: Record<string, unknown>) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({})) as OpenAIResponse;
  if (!response.ok) throw new OpenAIRequestError(friendlyOpenAIError(response.status, data), response.status, String(data?.error?.code || data?.error?.type || ""));
  return data;
}

type AskOptions = {
  key: string; model: string; name: string; schema: Record<string, unknown>;
  instructions: string; input: string; effort?: "low" | "medium" | "high";
};
async function askOnce<T>(options: AskOptions, structured = true) {
  const body: Record<string, unknown> = {
    model: options.model, store: false, reasoning: { effort: options.effort || "low" },
    instructions: structured ? options.instructions : `${options.instructions}\n\nJSON Schemaに一致する有効なJSONだけを返す: ${JSON.stringify(options.schema)}`,
    input: options.input,
  };
  if (structured) body.text = { format: { type: "json_schema", name: options.name, strict: true, schema: options.schema } };
  const data = await postOpenAI(options.key, body);
  return { json: parseJSON<T>(textFrom(data)), model: data.model || options.model };
}
async function ask<T>(options: AskOptions): Promise<{ json: T; model: string }> {
  try { return await askOnce<T>(options, true); }
  catch (error) {
    if (error instanceof OpenAIRequestError && error.status === 400) return askOnce<T>(options, false);
    if (error instanceof OpenAIRequestError && [403, 404].includes(error.status) && options.model !== MODELS.economy) {
      const fallback = { ...options, model: MODELS.economy };
      try { return await askOnce<T>(fallback, true); }
      catch (second) { if (second instanceof OpenAIRequestError && second.status === 400) return askOnce<T>(fallback, false); throw second; }
    }
    throw error;
  }
}

const SHAFU_CORE = `社不ちゃん専用のショート動画企画として扱う。
- 説明しすぎない。本人に状況・設定・オチを説明させない。ナレーションで補わない。
- 映像で分かることは、視線、手、間、物の配置、動線、カメラで見せる。
- きれいな起承転結、教訓、感動のまとめ、狙った決め台詞を無理に足さない。
- キャラクターは笑わせようとせず、自分なりに真面目に普通のことをしている。結果として変になる。
- 「まさか」「人生終わった」「こんなの聞いてない」「最高すぎる」等のAI脚本テンプレを安易に使わない。
- 若い女性という理由だけでネット語や乱暴語を足さない。セリフは必要なときだけ短く。
- BIBLEにない重要な過去、人間関係、本筋の変化を勝手に正史化しない。
- AIは候補と問題点を出すだけ。人間にウケるかの採点や採用判断をしない。`;

function modelGuide(model: string, totalDuration: number) {
  if (model === "H3") {
    const clips = Math.ceil(totalDuration / 15);
    return `MiniMax H3向け。2026-09時点の公式仕様では1生成4〜15秒、prompt上限7000文字。全体${totalDuration}秒を${clips}本前後の連続CLIPへ分け、各CLIPは最大15秒にする。各CLIP内に0〜秒の時間ビート、被写体の具体的行動、必要最小限のカメラ移動、環境音・声を記す。H3は画像・動画・音声参照と自然音声を扱えるため、与えられた@imageNとVoiceを明示的に役割づける。カメラは必要な箇所だけ[static] [pan] [zoom]等の短い指示を使い、同時に複数の無理な移動を命じない。`;
  }
  const clips = Math.ceil(totalDuration / 30);
  return `現行Seedance向け。全体${totalDuration}秒を${clips}本前後の連続CLIPへ分け、各CLIPは最大30秒を目安にする。時間ビートとショット境界を明確にし、ショット間で人物、衣装、背景、小物位置、光、温度感を維持する。@imageNは番号を変えず、何を参照するかを明確にする。複雑な動作は連続する小さな行動へ分解し、被写体動作とカメラ動作を分ける。音声・環境音は必要分だけ、BGMは生成しない。`;
}

export async function POST(request: Request) {
  try {
    const key = request.headers.get("x-openai-key")?.trim();
    if (!key) return NextResponse.json({ error: "OpenAI APIキーが未設定です。" }, { status: 401 });
    const body = await request.json() as { action?: unknown; payload?: Record<string, unknown> };
    const action = String(body.action || "");
    const payload = body.payload || {};
    const requestedTier = String(payload.tier || "standard");
    const tier: Tier = requestedTier === "economy" || requestedTier === "deep" ? requestedTier : "standard";
    const model = MODELS[tier];

    if (action === "connection_test") {
      const data = await postOpenAI(key, { model: MODELS.economy, store: false, input: "Reply with exactly OK.", max_output_tokens: 16 });
      return NextResponse.json({ ok: true, model: data?.model || MODELS.economy });
    }

    if (action === "ideas_generate" || action === "more_like_this") {
      const count = action === "more_like_this" ? 6 : Math.max(20, Math.min(30, Number(payload.count) || 24));
      const duration = clampDuration(payload.duration);
      const moreLike = action === "more_like_this";
      const instructions = `${SHAFU_CORE}\n\nあなたはアイデア編集者。完成脚本ではなく「何が起きる動画か」が2〜4文で分かる短いネタの核を${count}案作る。セリフ全文、秒刻み、完成したオチの説明、面白さの点数は書かない。案同士の出来事と結末を十分に変える。duplicateWarningは、提示された過去候補と意味的に近い場合だけ「どの案と何が近いか」を短く書き、近くなければ空文字。類似していても削除や禁止はしない。durationは30〜60の5秒刻み。storyTypeは指定を原則守る。${moreLike ? "元案の言葉や舞台を言い換えない。まず、元案の面白さを生む構造・温度感・行動のズレを内的に抽出し、その構造を別の欲望・場所・小道具・結果へ移した別ネタを作る。" : ""}`;
      const result = await ask<{ ideas: GeneratedIdea[] }>({ key, model, name: moreLike ? "shafu_more_like" : "shafu_ideas", schema: ideasSchema, effort: tier === "deep" ? "medium" : "low", instructions,
        input: `目標件数:${count}\n想定尺:${duration}秒\n方向性:${boundedJSON(payload.directions)}\nスタイル:${boundedJSON(payload.styles)}\n分類:${payload.storyType || "SIDE"}\n追加の断片:${String(payload.seed || "なし").slice(0, 3000)}\n元案:${moreLike ? boundedJSON(payload.sourceIdea) : "なし"}\n\nBIBLE:\n${boundedJSON(payload.bible, 14000)}\n\n現在のSTORY（未確定は確定しない）:\n${boundedJSON({ story: payload.story, milestones: payload.milestones, timeline: payload.timeline }, 14000)}\n\n過去案・制作中・完成・ボツ（重複確認だけに使う）:\n${boundedJSON(payload.existing, 20000)}` });
      const ideas = Array.isArray(result.json.ideas) ? result.json.ideas.slice(0, count).map((item) => ({ ...item, duration: clampDuration(item.duration || duration) })) : [];
      return NextResponse.json({ ideas, model: result.model });
    }

    if (action === "develop") {
      const result = await ask<{ developments: DevelopmentResult[] }>({ key, model, name: "shafu_develop", schema: developmentsSchema, effort: tier === "deep" ? "medium" : "low",
        instructions: `${SHAFU_CORE}\n\n同じネタを動画として見せる異なる展開案をちょうど3案作る。固定の「無言・一言・三段階」テンプレへ機械的に当てはめず、このネタで差が出るカメラ位置、情報を見せる順、間、反復、視点、行動のズレを変える。まだ完成シナリオや秒刻みにはしない。各bodyは4〜7文以内。3案のどれが優れているかは評価しない。`,
        input: `作品:\n${boundedJSON(payload.project, 12000)}\n\nBIBLE:\n${boundedJSON(payload.bible, 14000)}\n\nSTORY/TIMELINE:\n${boundedJSON({ story: payload.story, timeline: payload.timeline }, 14000)}` });
      return NextResponse.json({ developments: (result.json.developments || []).slice(0, 3), model: result.model });
    }

    if (action === "scenario") {
      const project = (payload.project && typeof payload.project === "object" ? payload.project : {}) as Record<string, unknown>;
      const count = project.episodeMode === "single" ? 0 : project.episodeMode === "two_part" ? 2 : Math.max(2, Math.min(8, Number(project.episodeCount) || 3));
      const episodeRules = count === 2 ? "2話は長い1本を半分に切らない。EPISODE 1は導入・その回自体の見どころ・次を見たくなる引きを持つ。EPISODE 2は自然な継続・展開・オチまたは次状態への移行を持つ。" : count > 2 ? `${count}話それぞれに小さな見どころと状態変化を持たせ、次話への接続を作る。` : "1話完結。";
      const result = await ask<ScenarioResult>({ key, model, name: "shafu_scenario", schema: scenarioSchema, effort: tier === "deep" ? "medium" : "low",
        instructions: `${SHAFU_CORE}\n\n選ばれた展開案だけを映像シナリオ化する。小説・作文・撮影後の感想ではなく、画面で何が起きるかを書く。0〜5秒、5〜12秒のような時間帯を使い、視線、手、小道具、位置、間、カメラ距離を必要な範囲で具体化する。セリフは本当に必要なものだけ。オチの意味をセリフで説明しない。${episodeRules}\nscenarioには全体構成を入れる。episodesは${count ? `必ず${count}件` : "必ず空配列"}。`,
        input: `作品:\n${boundedJSON(project, 13000)}\n\n選択した見せ方:\n${boundedJSON(payload.selectedDevelopment, 5000)}\n\nBIBLE:\n${boundedJSON(payload.bible, 15000)}\n\n現在のSTORY（ユーザーが確定していない内容を進めない）:\n${boundedJSON({ story: payload.story, milestones: payload.milestones, timeline: payload.timeline }, 17000)}` });
      return NextResponse.json({ ...result.json, episodes: count ? (result.json.episodes || []).slice(0, count) : [], model: result.model });
    }

    if (action === "refine_scenario") {
      const operation = String(payload.operation || "rewrite");
      const focus: Record<string, string> = {
        less_dialogue: "セリフだけを精査し、映像で分かる台詞を削る。出来事と映像の順序は維持。",
        more_visual: "説明文・内面説明を具体的な視線、手、動線、小物、間、画角へ置換。出来事は維持。",
        weirder: "本人が普通にしている行動のズレを一段だけ奇妙にする。大声や突飛な新設定で誤魔化さない。",
        more_shafu: "BIBLEに沿う反応、生活感、雑な生存の仕方へ寄せる。新しい正史は足さない。",
        stronger_ending: "最後の数秒だけを、説明なしで残る映像・行動・短い一言へ改善。前半は維持。",
        rewrite: "同じ核と選択済み展開を保ったまま、説明口調と不自然なギャグを除いて全体を組み直す。",
      };
      const result = await ask<ScenarioResult>({ key, model, name: "shafu_refine", schema: scenarioSchema, effort: tier === "deep" ? "medium" : "low",
        instructions: `${SHAFU_CORE}\n\n編集指示:${focus[operation] || focus.rewrite}\n指定部分以外を無意味に言い換えない。タイトルを維持。エピソード数を変えない。`,
        input: `現在の作品:\n${boundedJSON(payload.project, 24000)}\n\nBIBLE:\n${boundedJSON(payload.bible, 14000)}\n\nSTORY/TIMELINE:\n${boundedJSON({ story: payload.story, timeline: payload.timeline }, 14000)}` });
      return NextResponse.json({ ...result.json, model: result.model });
    }

    if (action === "preflight") {
      const result = await ask<{ checks: PreflightResult[] }>({ key, model, name: "shafu_preflight", schema: preflightSchema, effort: tier === "deep" ? "high" : "medium",
        instructions: `${SHAFU_CORE}\n\n動画生成前の編集チェックを行う。CHARACTER / WORLD / STORY / DUPLICATION / DIALOGUE / VISUAL / LENGTH / GENERATION RISKを、この順で1件ずつ、計8件返す。OKは具体的な問題なし、REVIEWは人間判断が必要、FIXは明確な矛盾・説明過多・尺超過・生成失敗リスク。作品の面白さや人気を採点しない。DUPLICATIONは似ていても禁止せず、何が似ているかだけ示す。GENERATION RISKでは実在ブランド・ロゴ・不要文字・複雑動作・一カット過密・参照不明を確認する。proposedFixは問題箇所に限定した修正方針。OK時は空文字。`,
        input: `対象作品:\n${boundedJSON(payload.project, 26000)}\n\nBIBLE:\n${boundedJSON(payload.bible, 15000)}\n\nSTORY:\n${boundedJSON({ story: payload.story, milestones: payload.milestones, timeline: payload.timeline }, 17000)}\n\n過去作品:\n${boundedJSON(payload.archive, 18000)}` });
      const order: PreflightResult["category"][] = ["CHARACTER", "WORLD", "STORY", "DUPLICATION", "DIALOGUE", "VISUAL", "LENGTH", "GENERATION RISK"];
      const byCategory = new Map((result.json.checks || []).map((check) => [check.category, check]));
      const checks = order.map((category) => byCategory.get(category) || { category, status: "REVIEW", issue: "自動確認結果が欠けています。", proposedFix: "この項目だけ手動で確認してください。" });
      return NextResponse.json({ checks, model: result.model });
    }

    if (action === "apply_fix") {
      const result = await ask<ScenarioResult>({ key, model, name: "shafu_apply_fix", schema: scenarioSchema, effort: tier === "deep" ? "medium" : "low",
        instructions: `${SHAFU_CORE}\n\nPREFLIGHTで指定された1項目だけを修正する。他の出来事、順序、セリフ、映像、タイトル、エピソード数を可能な限り変えない。修正提案を追記するのではなく、該当箇所と置換する。`,
        input: `修正対象:\n${boundedJSON(payload.check, 5000)}\n\n現在の作品:\n${boundedJSON(payload.project, 26000)}\n\nBIBLE/STORY:\n${boundedJSON({ bible: payload.bible, story: payload.story }, 16000)}` });
      return NextResponse.json({ ...result.json, model: result.model });
    }

    if (action === "prompt_build") {
      const target = payload.model === "Seedance" ? "Seedance" : "H3";
      const duration = clampDuration(payload.duration);
      const requestedMax = Math.max(1000, Math.min(25000, Number(payload.maxChars) || 7000));
      const effectiveMax = target === "H3" ? Math.min(7000, requestedMax) : requestedMax;
      const rules = `${modelGuide(target, duration)}\n${SHAFU_CORE}\n\n共通の出力規則:
- これは動画生成欄へ貼る実用プロンプト。解説、評価、前置きは不要。
- 全体${duration}秒をモデル上限に合うCLIP単位へ分ける。各CLIPは単独コピーでき、前CLIPからの外見・衣装・場所・小物位置を自然に継続する。
- AppearanceはBIBLEのCHARACTER、VoiceはVOICEを必要十分に具体化して保持する。性格や世界を設定一覧として羅列しない。
- @image1等は与えられた番号・綴りのまま保持し、参照対象を最初に短く指定する。存在しない参照番号を作らない。
- 被写体動作、カメラ、背景や髪・服・小物の副次運動、環境音、必要な声を区別して書く。
- カメラは物語上必要な分だけ補完し、過剰な移動や同時指示を避ける。
- BGMなし。画面内文字、字幕、テロップ、看板の可読文字、UI、ウォーターマークなし。
- 実在商品、実在店、ブランド、ロゴは一般化した架空物へ置換する。
- 英語を本命、japaneseは意味・CLIP構造・@imageN・セリフが一致する自然訳。
- 各言語${effectiveMax}文字以内。途中で切らず、超える場合は形容や重複から削る。`;
      const result = await ask<{ english: string; japanese: string }>({ key, model, name: "shafu_video_prompt", schema: promptSchema, effort: tier === "deep" ? "medium" : "low", instructions: rules,
        input: `生成先:${target}\n全体尺:${duration}秒\n参照素材:${boundedJSON(payload.references, 5000)}\n\nBIBLE:\n${boundedJSON(payload.bible, 16000)}\n\n現在のSTORY（必要な場合だけ反映）:\n${boundedJSON(payload.story, 9000)}\n\n映像シナリオ:\n${String(payload.scenario || "").slice(0, 26000)}\n\n追加指示:\n${String(payload.direction || "なし").slice(0, 5000)}` });
      let english = String(result.json.english || "");
      let japanese = String(result.json.japanese || "");
      if (chars(english) > effectiveMax || chars(japanese) > effectiveMax) {
        const compressed = await ask<{ english: string; japanese: string }>({ key, model: MODELS.economy, name: "shafu_prompt_compress", schema: promptSchema,
          instructions: `動画生成プロンプトを各言語${effectiveMax}文字以内へ圧縮する。CLIP境界、@imageN、外見、声、時間ビート、重要行動、カメラ、自然な副次運動、セリフ、BGMなし、文字なし、実在ブランドなしを保持する。途中で切らない。`,
          input: `ENGLISH:\n${english}\n\nJAPANESE:\n${japanese}` });
        english = String(compressed.json.english || english);
        japanese = String(compressed.json.japanese || japanese);
      }
      return NextResponse.json({ english: trimChars(english, effectiveMax), japanese: trimChars(japanese, effectiveMax), effectiveMax, model: result.model, guide: target === "H3" ? "MiniMax H3 official 2026-09" : "BytePlus Seedance official 2026-08" });
    }

    if (action === "sync_prompt") {
      const source = payload.source === "ja" ? "ja" : "en";
      const max = Math.max(1000, Math.min(25000, Number(payload.maxChars) || 7000));
      const original = source === "en" ? String(payload.english || "") : String(payload.japanese || "");
      const result = await ask<{ english: string; japanese: string }>({ key, model, name: "shafu_prompt_sync", schema: promptSchema,
        instructions: `${source === "en" ? "英語" : "日本語"}側を正本として一字も勝手に修正せず、反対言語だけを同じ意味・CLIP構造へ同期する。@imageN、時間、セリフ、禁止事項を一致させる。各言語${max}文字以内。`,
        input: `正本(${source.toUpperCase()}):\n${original}\n\n現在EN:\n${String(payload.english || "")}\n\n現在JA:\n${String(payload.japanese || "")}` });
      return NextResponse.json({
        english: source === "en" ? original : trimChars(String(result.json.english || ""), max),
        japanese: source === "ja" ? original : trimChars(String(result.json.japanese || ""), max), model: result.model,
      });
    }

    if (action === "semantic_search") {
      const result = await ask<{ ids: string[] }>({ key, model: MODELS.economy, name: "shafu_semantic_search", schema: idsSchema,
        instructions: "検索文と意味的に近い過去作品を最大20件、近い順のID配列で返す。単語一致だけでなく、行動構造・欲望・失敗パターン・結末の近さを見る。似ていないものは返さない。解説不要。",
        input: `検索:${String(payload.query || "").slice(0, 1000)}\n\n候補:\n${boundedJSON(payload.archive, 35000)}` });
      return NextResponse.json({ ids: (result.json.ids || []).slice(0, 20), model: result.model });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const status = error instanceof OpenAIRequestError ? Math.min(599, Math.max(400, error.status)) : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI処理に失敗しました。" }, { status });
  }
}
