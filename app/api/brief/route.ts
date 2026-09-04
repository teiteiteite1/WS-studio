import { NextResponse } from "next/server";
import crypto from "node:crypto";

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
  whyImportant: string;
  importance: Importance;
  score: number;
  studyDesign?: string;
  keyResult?: string;
  tags?: string[];
  rawText?: string;
};

const LIMITS: Record<Category, number> = { ai: 5, urology: 3, dialysis: 3 };

function text(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? text(match[1]) : "";
}

function stableId(value: string) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 18);
}

function scoreAI(title: string, source: string) {
  const s = `${title} ${source}`.toLowerCase();
  let score = 35;
  const strong = ["launch", "release", "new model", "gpt-", "claude", "gemini", "agent", "api", "open source", "open-weight", "benchmark", "regulation", "acquisition", "partnership", "copyright", "lawsuit", "security", "reasoning", "multimodal"];
  strong.forEach((word) => { if (s.includes(word)) score += 7; });
  if (/openai|anthropic|deepmind|google|microsoft|meta|nvidia|xai|hugging face/.test(s)) score += 10;
  if (/opinion|sponsored|how to|best ai tools|top \d+/.test(s)) score -= 20;
  return Math.max(0, Math.min(100, score));
}

function detectStudyDesign(title: string, abstract: string) {
  const s = `${title} ${abstract}`.toLowerCase();
  if (/phase iii|phase 3/.test(s)) return "Phase III";
  if (/phase ii|phase 2/.test(s)) return "Phase II";
  if (/randomized|randomised/.test(s)) return "RCT";
  if (/meta-analysis/.test(s)) return "Meta-analysis";
  if (/systematic review/.test(s)) return "Systematic review";
  if (/guideline|consensus statement/.test(s)) return "Guideline / Consensus";
  if (/prospective/.test(s)) return "Prospective study";
  if (/retrospective/.test(s)) return "Retrospective study";
  if (/cohort/.test(s)) return "Cohort study";
  return "Clinical study";
}

function detectTags(category: Category, title: string, abstract = "") {
  const s = `${title} ${abstract}`.toLowerCase();
  const tags: string[] = [];
  const pairs: Array<[RegExp, string]> = category === "urology" ? [
    [/prostate|mcrpc|mcspc|nmcrpc/, "Prostate"],
    [/bladder|urothelial|nmibc|mibc|utuc/, "Urothelial"],
    [/renal cell|kidney cancer|rcc/, "RCC"],
    [/stone|urolithiasis|calculi/, "Stone"],
    [/benign prostatic|bph|lower urinary tract|luts/, "LUTS/BPH"],
  ] : category === "dialysis" ? [
    [/hemodialysis|haemodialysis|\bhd\b/, "HD"],
    [/peritoneal dialysis|\bpd\b/, "PD"],
    [/hemodiafiltration|\bhdf\b/, "HDF"],
    [/anemia|anaemia|erythropoietin|esa/, "Anemia"],
    [/vascular access|fistula|graft/, "VA"],
    [/mineral bone|ckd-mbd|phosphate|parathyroid/, "CKD-MBD"],
  ] : [
    [/agent/, "Agent"], [/multimodal/, "Multimodal"], [/open[- ]weight|open source/, "Open"], [/api/, "API"], [/regulat|law|copyright/, "Policy"],
  ];
  pairs.forEach(([re, name]) => { if (re.test(s)) tags.push(name); });
  return tags.slice(0, 3);
}

function scorePaper(title: string, journal: string, abstract: string) {
  const s = `${title} ${journal} ${abstract}`.toLowerCase();
  let score = 38;
  const major = ["randomized", "randomised", "phase 3", "phase iii", "guideline", "meta-analysis", "systematic review", "overall survival", "progression-free survival", "noninferiority", "non-inferiority", "multicenter", "multicentre", "hazard ratio"];
  major.forEach((word) => { if (s.includes(word)) score += 7; });
  if (/new england journal|nejm|lancet|jama|european urology|journal of clinical oncology|kidney international|jasn|clinical journal of the american society of nephrology/.test(s)) score += 12;
  if (/case report|protocol|editorial|letter to the editor/.test(s)) score -= 18;
  return Math.max(0, Math.min(100, score));
}

function importance(score: number): Importance {
  if (score >= 78) return "CRITICAL";
  if (score >= 58) return "HIGH";
  return "MEDIUM";
}

function sentenceSummary(raw: string, fallback: string) {
  const cleaned = text(raw);
  if (!cleaned) return fallback;
  const pieces = cleaned.split(/(?<=[.!?。！？])\s+/).filter(Boolean);
  return pieces.slice(0, 2).join(" ").slice(0, 430);
}

async function fetchAINews(): Promise<Item[]> {
  const query = encodeURIComponent('(OpenAI OR Anthropic OR Gemini OR "Google DeepMind" OR NVIDIA OR "AI agent" OR "artificial intelligence") when:2d');
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(url, { headers: { "User-Agent": "WS-studio-Brief/1.1" }, next: { revalidate: 1800 } });
  if (!response.ok) return [];
  const xml = await response.text();
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const items = blocks.map((block) => {
    const rawTitle = tag(block, "title");
    const link = tag(block, "link");
    const pubDate = tag(block, "pubDate");
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    const source = sourceMatch ? text(sourceMatch[1]) : "Google News";
    const title = rawTitle.replace(/\s+-\s+[^-]+$/, "").trim();
    const score = scoreAI(title, source);
    return {
      id: stableId(link || title), category: "ai" as const, kind: "NEWS" as const,
      title, source, url: link, publishedAt: new Date(pubDate || Date.now()).toISOString(),
      summary: `${title}。主要AI企業・研究動向として追跡対象に選定。`,
      whyImportant: score >= 78 ? "モデル、API、規制、主要企業の戦略など、AIの使い方や業界構造を直接変える可能性が高い更新です。" : "現在のAI開発・利用トレンドを把握するうえで関連度が高いニュースです。",
      importance: importance(score), score, tags: detectTags("ai", title), rawText: title,
    };
  });
  return items.filter((item) => item.url && item.title && item.score >= 45).sort((a, b) => b.score - a.score).slice(0, 10);
}

async function fetchPubMed(category: "urology" | "dialysis"): Promise<Item[]> {
  const term = category === "urology"
    ? '(prostate cancer OR bladder cancer OR urothelial carcinoma OR renal cell carcinoma OR urolithiasis OR benign prostatic hyperplasia OR urology) AND ("last 14 days"[PDat])'
    : '(hemodialysis OR haemodialysis OR peritoneal dialysis OR kidney replacement therapy OR hemodiafiltration OR dialysis) AND ("last 14 days"[PDat])';
  const searchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  searchUrl.searchParams.set("db", "pubmed");
  searchUrl.searchParams.set("term", term);
  searchUrl.searchParams.set("retmode", "json");
  searchUrl.searchParams.set("retmax", "20");
  searchUrl.searchParams.set("sort", "pub date");
  searchUrl.searchParams.set("tool", "ws_studio_brief");
  const searchRes = await fetch(searchUrl, { next: { revalidate: 1800 } });
  if (!searchRes.ok) return [];
  const searchJson = await searchRes.json();
  const ids: string[] = searchJson?.esearchresult?.idlist ?? [];
  if (!ids.length) return [];

  const fetchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi");
  fetchUrl.searchParams.set("db", "pubmed");
  fetchUrl.searchParams.set("id", ids.join(","));
  fetchUrl.searchParams.set("retmode", "xml");
  fetchUrl.searchParams.set("tool", "ws_studio_brief");
  const fetchRes = await fetch(fetchUrl, { next: { revalidate: 1800 } });
  if (!fetchRes.ok) return [];
  const xml = await fetchRes.text();
  const articles = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) ?? [];

  return articles.map((block) => {
    const pmid = tag(block, "PMID");
    const title = tag(block, "ArticleTitle");
    const journal = tag(block, "Title") || tag(block, "ISOAbbreviation") || "PubMed";
    const abstractParts = [...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi)].map((m) => text(m[1]));
    const abstract = abstractParts.join(" ");
    const year = tag(block, "Year");
    const month = tag(block, "Month");
    const day = tag(block, "Day");
    const parsed = Date.parse(`${year || new Date().getFullYear()} ${month || "01"} ${day || "01"}`);
    const publishedAt = Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
    const score = scorePaper(title, journal, abstract);
    const isMajor = score >= 78;
    return {
      id: stableId(`pmid:${pmid}`), category, kind: "PAPER" as const, title, source: journal,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, publishedAt,
      summary: sentenceSummary(abstract, "PubMed新着論文。抄録情報が限定的なため、原文確認を推奨します。"),
      whyImportant: isMajor ? "RCT・Phase III・ガイドライン・主要アウトカムなど、診療判断へ影響しうる要素を含む可能性が高い論文です。" : "新規性・研究デザイン・掲載誌などから、臨床上チェックする価値がある候補として選定しています。",
      importance: importance(score), score,
      studyDesign: detectStudyDesign(title, abstract),
      keyResult: "AI要約が有効な場合、主要結果をここに表示します。",
      tags: detectTags(category, title, abstract),
      rawText: abstract.slice(0, 3500),
    };
  }).filter((item) => item.title && item.score >= 42).sort((a, b) => b.score - a.score).slice(0, 12);
}

function responseText(json: any): string {
  if (typeof json?.output_text === "string") return json.output_text;
  const chunks: string[] = [];
  for (const output of json?.output ?? []) for (const content of output?.content ?? []) if (typeof content?.text === "string") chunks.push(content.text);
  return chunks.join("\n");
}

async function enrichWithAI(items: Item[]): Promise<Item[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !items.length) return items;
  try {
    const compact = items.map(({ id, category, kind, title, source, score, studyDesign, rawText }) => ({ id, category, kind, title, source, score, studyDesign, rawText }));
    const prompt = `あなたはAIニュース編集者兼、泌尿器科・腎臓/透析領域の医学論文エディターです。以下の候補を日本語で要約してください。原文にない結果や数値は絶対に推測しないでください。\nNEWS: summary 2〜3文、whyImportant 1〜2文。\nPAPER: summary 2〜3文、studyDesign を簡潔に、keyResult は主要結果を数値があれば数値込みで1〜2文、whyImportant は臨床的意味を1〜2文。抄録から主要結果が読み取れなければ keyResult は「抄録から主要結果を確定できず。原文確認推奨。」とする。\nimportance は CRITICAL/HIGH/MEDIUM。CRITICALは診療変更につながりうるPhase III/RCT/主要ガイドライン、または主要AI製品・規制の大幅変更だけ。\nJSON配列だけを返す。キーは id, summary, whyImportant, importance, studyDesign, keyResult。\n\n${JSON.stringify(compact)}`;
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.BRIEF_MODEL || "gpt-5.6-luna", input: prompt, max_output_tokens: 4200 }),
    });
    if (!res.ok) return items;
    const json = await res.json();
    const raw = responseText(json).replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const enriched = JSON.parse(raw) as Array<{ id: string; summary: string; whyImportant: string; importance: Importance; studyDesign?: string; keyResult?: string }>;
    const map = new Map(enriched.map((item) => [item.id, item]));
    return items.map((item) => {
      const extra = map.get(item.id);
      return extra ? {
        ...item,
        summary: extra.summary || item.summary,
        whyImportant: extra.whyImportant || item.whyImportant,
        importance: extra.importance || item.importance,
        studyDesign: item.kind === "PAPER" ? (extra.studyDesign || item.studyDesign) : undefined,
        keyResult: item.kind === "PAPER" ? (extra.keyResult || item.keyResult) : undefined,
      } : item;
    });
  } catch {
    return items;
  }
}

export async function GET() {
  const [ai, urology, dialysis] = await Promise.all([fetchAINews(), fetchPubMed("urology"), fetchPubMed("dialysis")]);
  const selected = [...ai.slice(0, LIMITS.ai), ...urology.slice(0, LIMITS.urology), ...dialysis.slice(0, LIMITS.dialysis)];
  const enriched = await enrichWithAI(selected);
  const items = enriched.map(({ rawText: _rawText, ...item }) => item);
  return NextResponse.json({ generatedAt: new Date().toISOString(), items }, { headers: { "Cache-Control": "private, max-age=0, s-maxage=1800, stale-while-revalidate=3600" } });
}
