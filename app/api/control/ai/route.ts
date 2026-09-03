import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Tier = "economy" | "standard" | "deep";
const MODELS: Record<Tier, string> = {
  economy: "gpt-5.6-luna",
  standard: "gpt-5.6-terra",
  deep: "gpt-5.6-sol",
};

const promptSchema = {
  type: "object", additionalProperties: false,
  properties: { english: { type: "string" }, japanese: { type: "string" } },
  required: ["english", "japanese"],
};
const draftSchema = {
  type: "object", additionalProperties: false,
  properties: {
    title: { type: "string" }, draft: { type: "string" }, research_notes: { type: "string" },
    hooks: { type: "array", items: { type: "string" } },
  }, required: ["title", "draft", "research_notes", "hooks"],
};
const splitSchema = {
  type: "object", additionalProperties: false,
  properties: { parts: { type: "array", items: {
    type: "object", additionalProperties: false,
    properties: { label: { type: "string" }, scenario: { type: "string" } },
    required: ["label", "scenario"],
  } } }, required: ["parts"],
};

function chars(s: string) { return Array.from(s || "").length; }
function trimChars(s: string, n: number) { return chars(s) <= n ? s : Array.from(s).slice(0, Math.max(0, n - 1)).join("").trimEnd() + "…"; }

function textFrom(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;
  const out: string[] = [];
  for (const item of data?.output || []) if (item?.type === "message") {
    for (const c of item.content || []) if (c?.type === "output_text" && typeof c.text === "string") out.push(c.text);
  }
  return out.join("\n");
}
function parseJSON(text: string) {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(clean); } catch {
    const a = clean.indexOf("{"), b = clean.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(clean.slice(a, b + 1));
    throw new Error("AIの返答をJSONとして読み取れませんでした。");
  }
}
function sourcesFrom(data: any) {
  const urls = new Set<string>();
  for (const item of data?.output || []) {
    for (const s of item?.action?.sources || []) if (s?.url) urls.add(s.url);
    for (const c of item?.content || []) for (const a of c?.annotations || []) {
      if (a?.url) urls.add(a.url); if (a?.url_citation?.url) urls.add(a.url_citation.url);
    }
  }
  return [...urls].slice(0, 12);
}

async function ask(opts: { key: string; model: string; instructions: string; input: string; schema: any; name: string; web?: "medium" | "high"; effort?: "low" | "medium" | "high" }) {
  const body: any = {
    model: opts.model, store: false, instructions: opts.instructions, input: opts.input,
    reasoning: { effort: opts.effort || "low" },
    text: { format: { type: "json_schema", name: opts.name, strict: true, schema: opts.schema } },
  };
  if (opts.web) { body.tools = [{ type: "web_search", search_context_size: opts.web }]; body.include = ["web_search_call.action.sources"]; }
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.key}` },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `OpenAI API error (${r.status})`);
  return { json: parseJSON(textFrom(data)), sources: sourcesFrom(data) };
}

function guide(model: string) {
  if (model === "H3") return "MiniMax H3向け。短い制作ブリーフとして、時間ビート、具体的な行動、必要なカメラ、音、禁止事項を明快に書く。抽象的な雰囲気語を増やしすぎない。";
  if (model === "Seedance") return "Seedance向け。時間ビートの明快さに加えて、マルチショット、ショット間の主被写体と雰囲気の一貫性、複雑な動作の追従、意図のあるカメラ移動を重視する。";
  return "Kling向け。時間ビートの明快さに加えて、被写体、具体的な動作、空間関係、カメラ位置と動きを視覚的に読みやすく書く。";
}

export async function POST(req: Request) {
  try {
    const key = req.headers.get("x-openai-key")?.trim();
    if (!key) return NextResponse.json({ error: "OpenAI APIキーが未設定です。" }, { status: 401 });
    const body = await req.json();
    const action = String(body?.action || "");
    const p = body?.payload || {};
    const tier: Tier = ["economy", "standard", "deep"].includes(p.tier) ? p.tier : "standard";
    const model = MODELS[tier];

    if (action === "scenario_draft") {
      const mode = String(p.researchMode || "ai");
      const web = mode === "deep" ? "high" : mode === "web" ? "medium" : undefined;
      const result = await ask({ key, model, web, effort: mode === "deep" ? "high" : "low", name: "scenario_draft", schema: draftSchema,
        instructions: `あなたは30〜60秒ショート動画のシナリオ作家兼リサーチャー。日本語で自然なオリジナル台本を作る。Web検索時はネット上のあるある・体験談から一般化できる構造だけを抽出し、固有の文章や珍しい出来事を転載しない。複数傾向を組み替える。キャラ設定は創作文脈として使うが説明を羅列しない。冒頭数秒で状況を示し、行動と短い会話で進め、最後に明確な着地を作る。AI動画プロンプト文法や@imageは入れない。`,
        input: `キャラクター:\n${JSON.stringify(p.character || {}, null, 2)}\n\nテーマ:${p.topic || "社不っぽい日常"}\n目標尺:${p.duration || 45}秒\nトーン:${p.tone || "日常コメディ"}\n追加:${p.notes || "なし"}\n\n好評例:\n${(p.likedExamples || []).slice(-4).join("\n---\n") || "なし"}\n\n避けたい例:\n${(p.rejectedExamples || []).slice(-3).join("\n---\n") || "なし"}\n\ndraftはそのまま人が推敲できる台本。research_notesは材料にした一般傾向を短く。hooksは別導入案を3つ以内。` });
      return NextResponse.json({ ...result.json, sources: result.sources, model });
    }

    if (action === "scenario_split") {
      const count = Number(p.count) === 3 ? 3 : 2;
      const result = await ask({ key, model, name: "scenario_split", schema: splitSchema,
        instructions: `短編台本を自然な場面の切れ目で${count}パートに分割する。各パートは後で動画生成Prompt Builderへ入る。日本語シナリオ記述のままにし、重要なセリフやオチを削らない。各パート単独でも状況が分かる最小限の補足は可。partsは必ず${count}件。`,
        input: `タイトル:${p.title || "無題"}\n\n草稿:\n${p.draft || ""}` });
      return NextResponse.json({ parts: result.json.parts || [], model });
    }

    if (action === "prompt_build") {
      const target = ["H3", "Seedance", "Kling"].includes(p.model) ? p.model : "H3";
      const max = Math.min(25000, Math.max(1000, Number(p.maxChars) || 7000));
      const c = p.character || {};
      const rules = `${guide(target)}\n必須条件: AppearanceとVoiceは内容として必ず含めるがALWAYS INCLUDE等のメタ見出しは不要。Personality/World/家/固有場所はシナリオに必要な時だけ反映。Reference images/Model-specific note/Platform/TopView等のメタ情報は出さない。冒頭に15-second video/15秒の動画など尺そのものを書かない。尺は時間ビート計算だけに使う。BGMなし。必要な環境音・効果音・会話のみ。画面内文字、字幕、テロップ、ウォーターマークなし。実在の商品、店名、ブランド名、ロゴ、実在店舗看板なし。必要なら一般化した架空物にする。@image1等は番号・綴りを変えない。英語を主出力、日本語は意味が一致する自然訳。各言語実測${max}文字以内。途中で切らず不要語から削る。`;
      const result = await ask({ key, model, name: "video_prompt", schema: promptSchema, effort: tier === "deep" ? "medium" : "low", instructions: rules,
        input: `生成モデル:${target}\n内部尺:${p.duration || 15}秒（本文冒頭には書かない）\n\nAppearance:\n${c.appearance || ""}\n\nVoice:\n${c.voice || ""}\n\nシナリオ:\n${p.scenario || ""}\n\n追加指示:\n${p.direction || "なし"}\n\nGood傾向:\n${(p.goodExamples || []).slice(-3).join("\n---\n") || "なし"}\n\nNG傾向:\n${(p.badExamples || []).slice(-2).join("\n---\n") || "なし"}\n\n解説なしで実際に貼るプロンプトだけをenglish/japaneseへ。` });
      let english = String(result.json.english || ""), japanese = String(result.json.japanese || "");
      if (chars(english) > max || chars(japanese) > max) {
        const compressed = await ask({ key, model: MODELS.economy, name: "compressed_prompt", schema: promptSchema,
          instructions: `動画生成プロンプトを各言語実測${max}文字以内へ圧縮する。@imageN、Appearance、Voice、時間ビート、重要行動、セリフ、カメラ、BGMなし、文字なし、実在ブランド/店/ロゴなしを保持し、途中で切らない。`,
          input: `EN:\n${english}\n\nJA:\n${japanese}` });
        english = String(compressed.json.english || english); japanese = String(compressed.json.japanese || japanese);
      }
      return NextResponse.json({ english: trimChars(english, max), japanese: trimChars(japanese, max), model });
    }

    if (action === "sync_prompt") {
      const source = p.source === "ja" ? "ja" : "en";
      const max = Math.min(25000, Math.max(1000, Number(p.maxChars) || 7000));
      const original = source === "en" ? String(p.english || "") : String(p.japanese || "");
      const result = await ask({ key, model, name: "synced_prompt", schema: promptSchema,
        instructions: `${source === "en" ? "英語" : "日本語"}側を正本として一字も勝手に修正せず、反対言語だけを同じ意味・構造へ同期する。@imageNは同じ位置関係と番号で保持。各言語${max}文字以内。`,
        input: `正本(${source.toUpperCase()}):\n${original}\n\n現在EN:\n${p.english || ""}\n\n現在JA:\n${p.japanese || ""}` });
      return NextResponse.json({ english: source === "en" ? original : trimChars(String(result.json.english || ""), max), japanese: source === "ja" ? original : trimChars(String(result.json.japanese || ""), max), model });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI処理に失敗しました。" }, { status: 500 });
  }
}
