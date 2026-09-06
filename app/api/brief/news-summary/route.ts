import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { relatedLessonsFor } from "../../../brief/newsLogic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SummaryPayload = {
  title: string;
  source: string;
  url: string;
  summary: string;
};

const summarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    whatHappened: { type: "string" },
    whyImportant: { type: "string" },
    creatorImpact: { type: "string" },
    talkPoints: { type: "array", items: { type: "string" } },
  },
  required: ["whatHappened", "whyImportant", "creatorImpact", "talkPoints"],
};

function textFrom(data: unknown) {
  const response = data as { output_text?: string; output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
  if (typeof response.output_text === "string") return response.output_text;
  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    if (item.type && item.type !== "message") continue;
    for (const content of item.content ?? []) if (typeof content.text === "string") chunks.push(content.text);
  }
  return chunks.join("\n");
}

function parseJSON(raw: string) {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(clean); } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error("AI解説を読み取れませんでした。");
  }
}

function friendlyOpenAIError(status: number, data: unknown) {
  const error = (data as { error?: { code?: string; type?: string; message?: string } })?.error;
  const code = String(error?.code || error?.type || "");
  const raw = String(error?.message || `OpenAI API error (${status})`);
  if (status === 401 || /invalid_api_key|incorrect api key/i.test(`${code} ${raw}`)) return "APIキーが無効です。ControlのSettingsで保存し直してください。";
  if (/credit_balance_exhausted|insufficient_quota|spend_limit|usage_limit/i.test(`${code} ${raw}`)) return "OpenAI APIの残高または利用上限に達しています。ChatGPT Plusとは別のAPI残高を確認してください。";
  if (status === 429) return "OpenAI APIが混み合っています。少し待ってからもう一度開いてください。";
  return raw;
}

function decodeHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractArticleText(html: string) {
  const article = html.match(/<article\b[\s\S]*?<\/article>/i)?.[0]
    || html.match(/<main\b[\s\S]*?<\/main>/i)?.[0]
    || html;
  return [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => decodeHtml(match[1]))
    .filter((paragraph) => paragraph.length > 45 && !/cookie|newsletter|subscribe|advertis|sign up/i.test(paragraph))
    .join("\n")
    .slice(0, 12_000);
}

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (!isIP(host)) return false;
  return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
    || host === "::1" || host === "::" || /^f[cd][0-9a-f]{2}:/i.test(host) || /^fe[89ab][0-9a-f]:/i.test(host);
}

function safeHttpUrl(value: string, base?: URL) {
  try {
    const url = new URL(value, base);
    if (!/^https?:$/.test(url.protocol) || isPrivateHostname(url.hostname)) return null;
    url.username = "";
    url.password = "";
    return url;
  } catch {
    return null;
  }
}

async function fetchArticle(value: string) {
  let current = safeHttpUrl(value);
  if (!current) return { text: "", finalUrl: value };
  try {
    for (let hop = 0; hop < 4; hop += 1) {
      const response = await fetch(current, {
        redirect: "manual",
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WS-studio-Brief/3.0)", Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(8_000),
      });
      if (response.status >= 300 && response.status < 400) {
        const next = safeHttpUrl(response.headers.get("location") || "", current);
        if (!next) return { text: "", finalUrl: current.toString() };
        current = next;
        continue;
      }
      if (!response.ok) return { text: "", finalUrl: current.toString() };
      return { text: extractArticleText(await response.text()), finalUrl: current.toString() };
    }
    return { text: "", finalUrl: current.toString() };
  } catch {
    return { text: "", finalUrl: current.toString() };
  }
}

async function callOpenAI(key: string, payload: SummaryPayload, articleText: string) {
  const hasBody = articleText.length >= 500;
  const body: Record<string, unknown> = {
    model: process.env.BRIEF_MODEL || "gpt-5.6-luna",
    store: false,
    reasoning: { effort: "low" },
    instructions: [
      "あなたはAI業界を追う日本語編集者です。対象読者はAIツールを日常利用している技術初学者のクリエイターです。",
      "確認できる事実と発表主体の主張を分け、誇張、断定的な未来予測、タイトルだけからの推測を避けてください。",
      "専門語が必要なら、その場で短く説明してください。creatorImpactは具体的な関係がない場合は空文字にしてください。",
    ].join("\n"),
    input: hasBody
      ? `次の記事を、短時間で理解して人へ説明できる形にしてください。\n- whatHappened: 何が起きたかを2〜4文。従来との差を含める。\n- whyImportant: AI業界全体でなぜ重要かを1〜3文。\n- creatorImpact: 画像・動画・音楽・音声・Agent・制作Workflow・商用条件・権利の面で具体的な関係がある場合だけ1〜2文。\n- talkPoints: 30秒説明の骨組みを2〜4個。完成台本ではなく短い要点。\n\nタイトル: ${payload.title}\n媒体: ${payload.source}\nURL: ${payload.url}\n既存要点: ${payload.summary}\n\n記事本文:\n${articleText}`
      : `次のニュースをWeb検索で確認し、一次情報または信頼できる主要報道を根拠に整理してください。確認できない点は明記し、タイトルだけから補わないでください。\n- whatHappened: 2〜4文\n- whyImportant: 1〜3文\n- creatorImpact: 具体的な関係がある場合だけ1〜2文。なければ空文字\n- talkPoints: 30秒説明の骨組みを2〜4個\n\nタイトル: ${payload.title}\n媒体: ${payload.source}\n元URL: ${payload.url}\n既存要点: ${payload.summary}`,
    text: { format: { type: "json_schema", name: "brief_news_explainer", strict: true, schema: summarySchema } },
    max_output_tokens: 2_400,
  };
  if (!hasBody) {
    body.tools = [{ type: "web_search", search_context_size: "medium" }];
    body.include = ["web_search_call.action.sources"];
  }

  let response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify(body),
  });
  let data = await response.json().catch(() => ({}));
  if (!response.ok && response.status === 400) {
    delete body.text;
    body.instructions = `${body.instructions}\nJSONのみを返してください。形式: {"whatHappened":"...","whyImportant":"...","creatorImpact":"...","talkPoints":["..."]}`;
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify(body),
    });
    data = await response.json().catch(() => ({}));
  }
  if (!response.ok) throw new Error(friendlyOpenAIError(response.status, data));
  const parsed = parseJSON(textFrom(data));
  const whatHappened = String(parsed.whatHappened || "").trim();
  const whyImportant = String(parsed.whyImportant || "").trim();
  const creatorImpact = String(parsed.creatorImpact || "").trim();
  const talkPoints = Array.isArray(parsed.talkPoints) ? parsed.talkPoints.map(String).map((point: string) => point.trim()).filter(Boolean).slice(0, 4) : [];
  return {
    whatHappened,
    summary: whatHappened,
    whyImportant,
    creatorImpact,
    talkPoints,
    relatedLessons: relatedLessonsFor(`${payload.title} ${whatHappened} ${whyImportant} ${creatorImpact}`),
    model: (data as { model?: string })?.model || "gpt-5.6-luna",
    usedWebSearch: !hasBody,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload: SummaryPayload = {
      title: String(body?.title || "").trim(),
      source: String(body?.source || "").trim(),
      url: String(body?.url || "").trim(),
      summary: String(body?.summary || "").trim(),
    };
    if (!payload.title || !safeHttpUrl(payload.url)) return NextResponse.json({ error: "ニュース情報が不足しているか、URLが無効です。" }, { status: 400 });

    const key = request.headers.get("x-openai-key")?.trim() || process.env.OPENAI_API_KEY?.trim();
    if (!key) return NextResponse.json({ error: "AI解説用のOpenAI APIキーがこの端末にありません。ControlのSettingsで保存するか、ここで設定してください。", code: "NO_API_KEY" }, { status: 401 });

    const article = await fetchArticle(payload.url);
    const result = await callOpenAI(key, { ...payload, url: article.finalUrl }, article.text);
    if (!result.whatHappened) throw new Error("解説が空でした。もう一度お試しください。");
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ニュース解説に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
