import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SummaryPayload = {
  title: string;
  source: string;
  url: string;
};

const summarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    whyImportant: { type: "string" },
  },
  required: ["summary", "whyImportant"],
};

function textFrom(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;
  const chunks: string[] = [];
  for (const item of data?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n");
}

function parseJSON(raw: string) {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(clean); } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error("AI要約を読み取れませんでした。");
  }
}

function friendlyOpenAIError(status: number, data: any) {
  const code = String(data?.error?.code || data?.error?.type || "");
  const raw = String(data?.error?.message || `OpenAI API error (${status})`);
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
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractArticleText(html: string) {
  const article = html.match(/<article\b[\s\S]*?<\/article>/i)?.[0]
    || html.match(/<main\b[\s\S]*?<\/main>/i)?.[0]
    || html;
  const paragraphs = [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => decodeHtml(m[1]))
    .filter((p) => p.length > 45 && !/cookie|newsletter|subscribe|advertis|sign up/i.test(p));
  return paragraphs.join("\n").slice(0, 12000);
}

function safeHttpUrl(value: string) {
  try {
    const u = new URL(value);
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".local")) return null;
    return u;
  } catch { return null; }
}

async function fetchArticle(url: string) {
  const parsed = safeHttpUrl(url);
  if (!parsed) return { text: "", finalUrl: url };
  try {
    const response = await fetch(parsed, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WS-studio-Brief/2.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return { text: "", finalUrl: url };
    const html = await response.text();
    return { text: extractArticleText(html), finalUrl: response.url || url };
  } catch {
    return { text: "", finalUrl: url };
  }
}

async function callOpenAI(key: string, payload: SummaryPayload, articleText: string) {
  const hasBody = articleText.length >= 500;
  const body: any = {
    model: "gpt-5.6-luna",
    store: false,
    reasoning: { effort: "low" },
    instructions: "あなたはAIニュースの日本語編集者です。誇張せず、原文または検索で確認できる事実だけを使ってください。記事のタイトルだけから内容を捏造してはいけません。",
    input: hasBody
      ? `次の記事を日本語で約3分で読める要約にしてください。目安700〜1200字。冒頭で結論を短く示し、その後に何が起きたか、何が新しいか、利用者やAI業界にどう影響するかを自然な文章で整理してください。\n\nタイトル: ${payload.title}\n媒体: ${payload.source}\nURL: ${payload.url}\n\n記事本文:\n${articleText}`
      : `次のニュースをWeb検索で確認し、同じ記事または信頼できる一次・主要報道を根拠に、日本語で約3分で読める要約を作ってください。目安700〜1200字。タイトルだけから推測せず、確認できない点はその旨を明記してください。\n\nタイトル: ${payload.title}\n媒体: ${payload.source}\n元URL: ${payload.url}`,
    text: {
      format: {
        type: "json_schema",
        name: "brief_news_summary",
        strict: true,
        schema: summarySchema,
      },
    },
    max_output_tokens: 2200,
  };
  if (!hasBody) {
    body.tools = [{ type: "web_search", search_context_size: "medium" }];
    body.include = ["web_search_call.action.sources"];
  }

  let response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  let data = await response.json().catch(() => ({}));

  if (!response.ok && response.status === 400) {
    delete body.text;
    body.instructions += `\nJSONだけを返してください。形式: {"summary":"...","whyImportant":"..."}`;
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    data = await response.json().catch(() => ({}));
  }

  if (!response.ok) throw new Error(friendlyOpenAIError(response.status, data));
  const parsed = parseJSON(textFrom(data));
  return {
    summary: String(parsed.summary || "").trim(),
    whyImportant: String(parsed.whyImportant || "").trim(),
    model: data?.model || "gpt-5.6-luna",
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
    };
    if (!payload.title || !payload.url) return NextResponse.json({ error: "ニュース情報が不足しています。" }, { status: 400 });

    const key = request.headers.get("x-openai-key")?.trim() || process.env.OPENAI_API_KEY?.trim();
    if (!key) return NextResponse.json({ error: "AI要約用のOpenAI APIキーがこの端末にありません。ControlのSettingsでAPIキーを保存するか、ここで設定してください。", code: "NO_API_KEY" }, { status: 401 });

    const article = await fetchArticle(payload.url);
    const result = await callOpenAI(key, { ...payload, url: article.finalUrl }, article.text);
    if (!result.summary) throw new Error("要約が空でした。もう一度お試しください。");

    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ニュース要約に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
