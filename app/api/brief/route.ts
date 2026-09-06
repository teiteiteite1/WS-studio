import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  importanceFor,
  relatedLessonsFor,
  selectAINews,
  type NewsBeat,
  type NewsCandidate,
  type RelatedLesson,
} from "../../brief/newsLogic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Category = "ai" | "urology" | "dialysis";
type Importance = "CRITICAL" | "HIGH" | "MEDIUM";

type Item = {
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
  rawText?: string;
};

const LIMITS: Record<Category, number> = { ai: 5, urology: 3, dialysis: 3 };

const AI_FEEDS: Array<{ beat: NewsBeat; query: string; locale?: "ja" }> = [
  { beat: "frontier", query: '(OpenAI OR Anthropic OR Gemini OR "Google DeepMind" OR xAI OR Grok OR "Meta AI" OR "Microsoft AI") (model OR agent OR launch OR release) when:3d' },
  { beat: "creative", query: '(Midjourney OR Runway OR "Adobe Firefly" OR Seedance OR Seedream OR Kling OR Hailuo OR MiniMax OR Suno OR ElevenLabs OR "Stability AI") when:4d' },
  { beat: "research", query: '("AI research" OR "foundation model" OR multimodal OR robotics) (paper OR benchmark OR breakthrough OR release) when:4d' },
  { beat: "infrastructure", query: '(NVIDIA OR GPU OR semiconductor OR robotics OR "AI agent" OR multimodal OR "open-weight model") AI when:3d' },
  { beat: "policy", query: '("AI copyright" OR "AI regulation" OR "AI safety" OR "training data" OR "AI lawsuit") when:4d' },
  { beat: "business", query: '("AI acquisition" OR "AI funding" OR "AI partnership" OR "AI investment") when:4d' },
  { beat: "policy", locale: "ja", query: '(生成AI OR 人工知能) (著作権 OR 規制 OR 法律 OR 提携 OR 買収) when:4d' },
];

const DIRECT_FEEDS: Array<{ beat: NewsBeat; source: string; url: string; filter?: RegExp }> = [
  { beat: "frontier", source: "OpenAI", url: "https://openai.com/news/rss.xml" },
  { beat: "research", source: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml" },
  { beat: "business", source: "Microsoft", url: "https://blogs.microsoft.com/feed/", filter: /\bAI\b|artificial intelligence|Copilot|agent|model/i },
  { beat: "infrastructure", source: "NVIDIA", url: "https://blogs.nvidia.com/feed/", filter: /\bAI\b|artificial intelligence|GPU|robot|model|agent/i },
  { beat: "business", source: "TechCrunch", url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
  { beat: "frontier", source: "The Verge", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
  { beat: "research", source: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/technology-lab", filter: /\bAI\b|artificial intelligence|OpenAI|Gemini|Claude|model|agent|robot/i },
  { beat: "research", source: "Nature", url: "https://www.nature.com/subjects/machine-learning.rss" },
];

function cleanText(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? cleanText(match[1]) : "";
}

function stableId(value: string) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 18);
}

function safeDate(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

function scorePaper(title: string, journal: string, abstract: string) {
  const value = `${title} ${journal} ${abstract}`.toLowerCase();
  let score = 38;
  ["randomized", "randomised", "phase 3", "phase iii", "guideline", "meta-analysis", "systematic review", "overall survival", "progression-free survival", "noninferiority", "non-inferiority", "multicenter", "multicentre", "hazard ratio"]
    .forEach((word) => { if (value.includes(word)) score += 7; });
  if (/new england journal|nejm|lancet|jama|european urology|journal of clinical oncology|kidney international|jasn|clinical journal of the american society of nephrology/.test(value)) score += 12;
  if (/case report|protocol|editorial|letter to the editor/.test(value)) score -= 18;
  return Math.max(0, Math.min(100, score));
}

function detectStudyDesign(title: string, abstract: string) {
  const value = `${title} ${abstract}`.toLowerCase();
  if (/phase iii|phase 3/.test(value)) return "Phase III";
  if (/phase ii|phase 2/.test(value)) return "Phase II";
  if (/randomized|randomised/.test(value)) return "RCT";
  if (/meta-analysis/.test(value)) return "Meta-analysis";
  if (/systematic review/.test(value)) return "Systematic review";
  if (/guideline|consensus statement/.test(value)) return "Guideline / Consensus";
  if (/prospective/.test(value)) return "Prospective study";
  if (/retrospective/.test(value)) return "Retrospective study";
  if (/cohort/.test(value)) return "Cohort study";
  return "Clinical study";
}

function detectMedicalTags(category: "urology" | "dialysis", title: string, abstract = "") {
  const value = `${title} ${abstract}`.toLowerCase();
  const tags: string[] = [];
  const patterns: Array<[RegExp, string]> = category === "urology"
    ? [[/prostate|mcrpc|mcspc|nmcrpc/, "Prostate"], [/bladder|urothelial|nmibc|mibc|utuc/, "Urothelial"], [/renal cell|kidney cancer|rcc/, "RCC"], [/stone|urolithiasis|calculi/, "Stone"], [/benign prostatic|bph|lower urinary tract|luts/, "LUTS/BPH"]]
    : [[/hemodialysis|haemodialysis|\bhd\b/, "HD"], [/peritoneal dialysis|\bpd\b/, "PD"], [/hemodiafiltration|\bhdf\b/, "HDF"], [/anemia|anaemia|erythropoietin|esa/, "Anemia"], [/vascular access|fistula|graft/, "VA"], [/mineral bone|ckd-mbd|phosphate|parathyroid/, "CKD-MBD"]];
  patterns.forEach(([pattern, name]) => { if (pattern.test(value)) tags.push(name); });
  return tags.slice(0, 3);
}

function sentenceSummary(raw: string, fallback: string) {
  const clean = cleanText(raw);
  if (!clean) return fallback;
  return clean.split(/(?<=[.!?。！？])\s+/).filter(Boolean).slice(0, 2).join(" ").slice(0, 430);
}

function feedUrl(feed: (typeof AI_FEEDS)[number]) {
  const japanese = feed.locale === "ja";
  const params = new URLSearchParams({ q: feed.query, hl: japanese ? "ja" : "en-US", gl: japanese ? "JP" : "US", ceid: japanese ? "JP:ja" : "US:en" });
  return `https://news.google.com/rss/search?${params}`;
}

async function fetchFeed(feed: (typeof AI_FEEDS)[number]): Promise<NewsCandidate[]> {
  try {
    const response = await fetch(feedUrl(feed), { headers: { "User-Agent": "WS-studio-Brief/3.0" }, next: { revalidate: 1800 }, signal: AbortSignal.timeout(7_000) });
    if (!response.ok) return [];
    const blocks = (await response.text()).match(/<item>[\s\S]*?<\/item>/g) ?? [];
    return blocks.slice(0, 35).map((block) => {
      const rawTitle = tag(block, "title");
      const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
      const source = sourceMatch ? cleanText(sourceMatch[1]) : "Google News";
      const suffix = new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      return { title: rawTitle.replace(suffix, "").trim(), source, url: tag(block, "link"), publishedAt: safeDate(tag(block, "pubDate")), description: tag(block, "description"), beat: feed.beat };
    }).filter((item) => item.title && item.url);
  } catch {
    return [];
  }
}

function feedLink(block: string) {
  const textLink = tag(block, "link");
  if (textLink) return textLink;
  const attributeLink = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] ?? "";
  return cleanText(attributeLink);
}

async function fetchDirectFeed(feed: (typeof DIRECT_FEEDS)[number]): Promise<NewsCandidate[]> {
  try {
    const response = await fetch(feed.url, {
      headers: { "User-Agent": "WS-studio-Brief/3.0 (+https://ws-studio-wheat.vercel.app/brief)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(7_000),
    });
    if (!response.ok) return [];
    const xml = await response.text();
    const blocks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
    const cutoff = Date.now() - 7 * 86_400_000;
    return blocks.slice(0, 40).map((block) => {
      const title = tag(block, "title");
      const publishedAt = safeDate(tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || tag(block, "date"));
      const description = tag(block, "description") || tag(block, "summary") || tag(block, "content");
      return { title, source: feed.source, url: feedLink(block), publishedAt, description, beat: feed.beat };
    }).filter((item) => item.title && item.url && Date.parse(item.publishedAt) >= cutoff && (!feed.filter || feed.filter.test(`${item.title} ${item.description}`)));
  } catch {
    return [];
  }
}

function extractArticleText(html: string) {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<nav[\s\S]*?<\/nav>/gi, " ").replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  const scope = clean.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ?? clean.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? clean;
  return [...scope.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => cleanText(match[1]))
    .filter((paragraph) => paragraph.length > 45 && !/cookie|newsletter|subscribe|advertis|sign up/i.test(paragraph))
    .join("\n").slice(0, 9_000);
}

async function hydrateNews(items: Item[]) {
  return Promise.all(items.map(async (item) => {
    try {
      const response = await fetch(item.url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 WS-studio-Brief/3.0", Accept: "text/html,application/xhtml+xml" }, next: { revalidate: 21_600 }, signal: AbortSignal.timeout(7_000) });
      if (!response.ok) return item;
      const body = extractArticleText(await response.text());
      return body.length > 300 ? { ...item, url: response.url || item.url, rawText: body } : item;
    } catch {
      return item;
    }
  }));
}

async function fetchAINews(): Promise<Item[]> {
  const [queryFeeds, directFeeds] = await Promise.all([
    Promise.all(AI_FEEDS.map(fetchFeed)),
    Promise.all(DIRECT_FEEDS.map(fetchDirectFeed)),
  ]);
  const selected = selectAINews([...queryFeeds.flat(), ...directFeeds.flat()]);
  const items: Item[] = selected.map((candidate) => {
    const fallback = sentenceSummary(candidate.description ?? "", "見出しと情報源を取得しました。詳細を開くと、確認できた内容から日本語の要点を作成します。");
    const relatedLessons = relatedLessonsFor(`${candidate.title} ${candidate.description ?? ""}`);
    return {
      id: stableId(`${candidate.company}:${candidate.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()}`),
      category: "ai", kind: "NEWS", title: candidate.title, source: candidate.source, url: candidate.url, publishedAt: candidate.publishedAt,
      summary: fallback, whatHappened: fallback, detailSummary: "",
      whyImportant: candidate.score >= 80 ? "モデルやサービスの使い方だけでなく、AI業界の競争軸を動かす可能性がある更新です。" : "今のAI開発・利用の流れを把握するうえで確認する価値があります。",
      creatorImpact: candidate.creatorScore >= 48 ? "制作手段、品質、費用、権利条件のいずれかに関係する可能性があります。" : "",
      talkPoints: [], relatedLessons, sourceType: candidate.sourceType, company: candidate.company,
      industryScore: candidate.industryScore, creatorScore: candidate.creatorScore, analysisStatus: "headline-only",
      importance: importanceFor(candidate.score), score: candidate.score,
      tags: Array.from(new Set([...(candidate.company === "Other" ? [] : [candidate.company]), ...relatedLessons.map((lesson) => lesson.term)])).slice(0, 3),
      rawText: candidate.description,
    };
  });
  return hydrateNews(items);
}

async function fetchPubMed(category: "urology" | "dialysis"): Promise<Item[]> {
  const term = category === "urology"
    ? '(prostate cancer OR bladder cancer OR urothelial carcinoma OR renal cell carcinoma OR urolithiasis OR benign prostatic hyperplasia OR urology) AND ("last 14 days"[PDat])'
    : '(hemodialysis OR haemodialysis OR peritoneal dialysis OR kidney replacement therapy OR hemodiafiltration OR dialysis) AND ("last 14 days"[PDat])';
  const search = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  search.searchParams.set("db", "pubmed"); search.searchParams.set("term", term); search.searchParams.set("retmode", "json"); search.searchParams.set("retmax", "20"); search.searchParams.set("sort", "pub date"); search.searchParams.set("tool", "ws_studio_brief");
  const searchResponse = await fetch(search, { next: { revalidate: 1800 } });
  if (!searchResponse.ok) return [];
  const ids: string[] = (await searchResponse.json())?.esearchresult?.idlist ?? [];
  if (!ids.length) return [];
  const fetchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi");
  fetchUrl.searchParams.set("db", "pubmed"); fetchUrl.searchParams.set("id", ids.join(",")); fetchUrl.searchParams.set("retmode", "xml"); fetchUrl.searchParams.set("tool", "ws_studio_brief");
  const fetchResponse = await fetch(fetchUrl, { next: { revalidate: 1800 } });
  if (!fetchResponse.ok) return [];
  const articles = (await fetchResponse.text()).match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) ?? [];
  return articles.map((block) => {
    const pmid = tag(block, "PMID");
    const title = tag(block, "ArticleTitle");
    const journal = tag(block, "Title") || tag(block, "ISOAbbreviation") || "PubMed";
    const abstract = [...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi)].map((match) => cleanText(match[1])).join(" ");
    const score = scorePaper(title, journal, abstract);
    return {
      id: stableId(`pmid:${pmid}`), category, kind: "PAPER" as const, title, source: journal, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      publishedAt: safeDate(`${tag(block, "Year") || new Date().getFullYear()} ${tag(block, "Month") || "01"} ${tag(block, "Day") || "01"}`),
      summary: sentenceSummary(abstract, "PubMed新着論文。抄録情報が限定的なため原文確認を推奨します。"),
      whyImportant: score >= 78 ? "診療判断へ影響しうる要素を含む可能性が高い論文です。" : "臨床上チェックする価値がある候補です。",
      importance: importanceFor(score), score, studyDesign: detectStudyDesign(title, abstract), keyResult: "AI要約が有効な場合、主要結果をここに表示します。",
      tags: detectMedicalTags(category, title, abstract), rawText: abstract.slice(0, 5_000),
    };
  }).filter((item) => item.title && item.score >= 42).sort((a, b) => b.score - a.score).slice(0, LIMITS[category]);
}

function responseText(json: unknown) {
  const data = json as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  if (typeof data.output_text === "string") return data.output_text;
  const chunks: string[] = [];
  for (const output of data.output ?? []) for (const content of output.content ?? []) if (typeof content.text === "string") chunks.push(content.text);
  return chunks.join("\n");
}

function parseJSON(raw: string) {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(clean); } catch {
    const start = clean.indexOf("{"); const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error("AIニュース解説を読み取れませんでした。");
  }
}

const aiNewsSchema = {
  type: "object", additionalProperties: false,
  properties: { items: { type: "array", items: { type: "object", additionalProperties: false, properties: {
    id: { type: "string" }, whatHappened: { type: "string" }, whyImportant: { type: "string" }, creatorImpact: { type: "string" },
    talkPoints: { type: "array", items: { type: "string" } }, industryScore: { type: "number" }, creatorScore: { type: "number" },
  }, required: ["id", "whatHappened", "whyImportant", "creatorImpact", "talkPoints", "industryScore", "creatorScore"] } } },
  required: ["items"],
};

async function enrichAINews(items: Item[], key: string): Promise<Item[]> {
  if (!key || !items.length) return items;
  try {
    const compact = items.map(({ id, title, source, publishedAt, url, rawText, industryScore, creatorScore }) => ({ id, title, source, publishedAt, url, industryScore, creatorScore, sourceText: rawText?.slice(0, 5_500) || "本文未取得" }));
    const body: Record<string, unknown> = {
      model: process.env.BRIEF_MODEL || "gpt-5.6-luna", store: false, reasoning: { effort: "low" },
      instructions: [
        "あなたはAI業界全体を追う日本語ニュース編集者です。対象読者はAIツールを日常利用している技術初学者のクリエイターです。",
        "原文、一次情報、信頼できる報道で確認できた事実だけを使い、未確認の推測や大げさな未来予測を足さないでください。",
        "同じ発表の別報道を別事件のように扱わず、企業の宣伝文句は事実と分けてください。",
      ].join("\n"),
      input: `次のニュース候補を短時間で理解できる形にしてください。\n- whatHappened: 何が起きたかを日本語2〜3文。固有名詞と従来との差を明確にする。\n- whyImportant: 業界全体でなぜ重要かを1〜2文。\n- creatorImpact: AIクリエイターやWS studioの画像・動画・音楽・音声・Agent・SNS制作へ具体的な関係がある場合だけ1〜2文。関係が薄ければ空文字。\n- talkPoints: 重要度が高い出来事だけ、人に30秒で説明する骨組みを2〜4項目。完成台本ではなく短い要点。重要度が低ければ空配列。\n- industryScore / creatorScore: 各0〜100。候補値を参考に、記事本文で裏付けられる範囲だけ補正する。\n\n${JSON.stringify(compact)}`,
      text: { format: { type: "json_schema", name: "ws_brief_ai_news", strict: true, schema: aiNewsSchema } }, max_output_tokens: 4_800,
    };
    if (compact.some((item) => item.sourceText === "本文未取得")) { body.tools = [{ type: "web_search", search_context_size: "medium" }]; body.include = ["web_search_call.action.sources"]; }
    let response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify(body), cache: "no-store" });
    let json = await response.json().catch(() => ({}));
    if (!response.ok && response.status === 400) {
      delete body.text;
      body.instructions = `${body.instructions}\nJSONオブジェクトのみを返してください。形式は {"items":[...]} です。`;
      response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify(body), cache: "no-store" });
      json = await response.json().catch(() => ({}));
    }
    if (!response.ok) return items;
    const parsed = parseJSON(responseText(json)) as { items?: Array<Record<string, unknown>> };
    const byId = new Map((parsed.items ?? []).map((item) => [String(item.id ?? ""), item]));
    return items.map((item) => {
      const update = byId.get(item.id);
      if (!update) return item;
      const industryScore = Math.max(0, Math.min(100, Math.round((item.industryScore ?? item.score) * 0.65 + Number(update.industryScore ?? item.score) * 0.35)));
      const creatorScore = Math.max(0, Math.min(100, Math.round((item.creatorScore ?? 20) * 0.65 + Number(update.creatorScore ?? 20) * 0.35)));
      const score = Math.round(industryScore * 0.7 + creatorScore * 0.3);
      const importance = importanceFor(score);
      const talkPoints = Array.isArray(update.talkPoints) ? update.talkPoints.map(String).map((point) => point.trim()).filter(Boolean).slice(0, 4) : [];
      const whatHappened = String(update.whatHappened ?? "").trim() || item.whatHappened || item.summary;
      return {
        ...item, summary: whatHappened, whatHappened,
        whyImportant: String(update.whyImportant ?? "").trim() || item.whyImportant,
        creatorImpact: String(update.creatorImpact ?? "").trim(), talkPoints: importance === "MEDIUM" ? [] : talkPoints,
        relatedLessons: relatedLessonsFor(`${item.title} ${whatHappened} ${String(update.whyImportant ?? "")} ${String(update.creatorImpact ?? "")}`),
        industryScore, creatorScore, score, importance, analysisStatus: "complete" as const,
      };
    }).sort((a, b) => b.score - a.score);
  } catch {
    return items;
  }
}

export async function GET(request: Request) {
  const [ai, urology, dialysis] = await Promise.all([fetchAINews(), fetchPubMed("urology"), fetchPubMed("dialysis")]);
  const key = request.headers.get("x-openai-key")?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
  const enrichedAI = await enrichAINews(ai, key);
  const items = [...enrichedAI, ...urology, ...dialysis].map((item) => {
    const publicItem = { ...item };
    delete publicItem.rawText;
    return publicItem;
  });
  return NextResponse.json({ generatedAt: new Date().toISOString(), methodologyVersion: "ai-news-v3", items }, { headers: { "Cache-Control": "private, no-store", Vary: "x-openai-key" } });
}
