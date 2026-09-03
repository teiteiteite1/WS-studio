import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Tier = "economy" | "standard" | "deep";
const MODELS: Record<Tier, string> = {
  economy: "gpt-5.6-luna",
  standard: "gpt-5.6-terra",
  deep: "gpt-5.6-sol",
};

function textFrom(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;
  const out: string[] = [];
  for (const item of data?.output || []) if (item?.type === "message") {
    for (const c of item.content || []) if (c?.type === "output_text" && typeof c.text === "string") out.push(c.text);
  }
  return out.join("\n").trim();
}

function cleanJSON(text: string) {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(clean); } catch {
    const a = clean.indexOf("{"), b = clean.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(clean.slice(a, b + 1));
    throw new Error("自然化した台本を読み取れませんでした。");
  }
}

export async function POST(req: Request) {
  try {
    const key = req.headers.get("x-openai-key")?.trim();
    if (!key) return NextResponse.json({ error: "OpenAI APIキーが未設定です。" }, { status: 401 });

    const body = await req.json();
    const p = body?.payload || {};
    const tier: Tier = ["economy", "standard", "deep"].includes(p.tier) ? p.tier : "standard";
    const model = MODELS[tier];
    const character = p.character || {};
    const draft = String(p.draft || "").trim();
    if (!draft) return NextResponse.json({ error: "台本がありません。" }, { status: 400 });

    const instructions = `あなたは日本語の会話脚本を自然にする編集者。プロット作家ではない。出来事、順序、オチは変えず、主にセリフと言い回しだけを、そのキャラクターが実際に口にしそうな日本語へ直す。

最重要ルール:
- 設定を説明するためのセリフを書かない。本人が知っている情報を観客向けに言い直させない。
- 文章として綺麗な日本語より、口から出る日本語を優先する。主語、省略、言い切り、短い断片を自然に使う。
- 一文に情報を詰め込まない。説明できることは行動や間に逃がす。
- AI脚本にありがちな、意味をまとめる台詞、きれいな決め台詞、過剰なリアクション、説明的な独り言を避ける。
- 「つまり」「ってことは」「まさか」「こんなの聞いてない」「人生終わった」「最高すぎる」「〜なんだけど！？」等のテンプレ反応は、Character examplesに実例がない限り安易に使わない。
- ネットミーム語、若者語、乱暴語を“若いキャラだから”という理由だけで足さない。
- 無言の方が自然ならセリフを削る。
- オチは説明しない。状況か短い一言で落とす。
- Character examplesがある場合、語彙、文の長さ、省略、テンポを最優先で模倣する。ただし文面を機械的にコピーしない。
- NG phrasesは使わない。
- ナレーションもAI臭い説明文なら簡潔に直してよいが、場面内容は変えない。
- 出力は日本語。JSON以外は返さない。

返却形式: {"draft":"自然化した完成台本"}`;

    const input = `Character name: ${character.name || ""}
Personality: ${character.personality || ""}
Speaking style: ${character.speaking || ""}
Dialogue examples:\n${character.dialogueExamples || "なし"}
NG phrases:\n${character.bannedPhrases || "なし"}
World / background: ${character.world || ""}
Other notes: ${character.notes || ""}

Original draft:\n${draft}`;

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        store: false,
        reasoning: { effort: tier === "deep" ? "medium" : "low" },
        instructions,
        input,
        text: { format: { type: "json_schema", name: "dialogue_polish", strict: true, schema: {
          type: "object", additionalProperties: false,
          properties: { draft: { type: "string" } },
          required: ["draft"]
        } } }
      })
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return NextResponse.json({ error: data?.error?.message || `OpenAI API error (${r.status})` }, { status: r.status });
    const parsed = cleanJSON(textFrom(data));
    return NextResponse.json({ draft: String(parsed.draft || draft), model: data?.model || model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "台詞の自然化に失敗しました。" }, { status: 500 });
  }
}
