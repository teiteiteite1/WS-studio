import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

type Category = "ai" | "urology" | "dialysis";
type Importance = "CRITICAL" | "HIGH" | "MEDIUM";
type Item = {
  id: string; category: Category; kind: "NEWS" | "PAPER"; title: string; source: string; url: string; publishedAt: string;
  summary: string; detailSummary?: string; whyImportant: string; importance: Importance; score: number;
  studyDesign?: string; keyResult?: string; tags?: string[]; rawText?: string;
};

const LIMITS: Record<Category, number> = { ai: 5, urology: 3, dialysis: 3 };

function text(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
function tag(block: string, name: string) { const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i")); return m ? text(m[1]) : ""; }
function stableId(value: string) { return crypto.createHash("sha1").update(value).digest("hex").slice(0, 18); }
function importance(score: number): Importance { return score >= 78 ? "CRITICAL" : score >= 58 ? "HIGH" : "MEDIUM"; }

function scoreAI(title: string, source: string) {
  const s = `${title} ${source}`.toLowerCase(); let score = 35;
  ["launch","release","new model","gpt-","claude","gemini","agent","api","open source","open-weight","benchmark","regulation","acquisition","partnership","copyright","lawsuit","security","reasoning","multimodal"].forEach(w => { if (s.includes(w)) score += 7; });
  if (/openai|anthropic|deepmind|google|microsoft|meta|nvidia|xai|hugging face/.test(s)) score += 10;
  if (/opinion|sponsored|how to|best ai tools|top \d+/.test(s)) score -= 20;
  return Math.max(0, Math.min(100, score));
}
function scorePaper(title: string, journal: string, abstract: string) {
  const s = `${title} ${journal} ${abstract}`.toLowerCase(); let score = 38;
  ["randomized","randomised","phase 3","phase iii","guideline","meta-analysis","systematic review","overall survival","progression-free survival","noninferiority","non-inferiority","multicenter","multicentre","hazard ratio"].forEach(w => { if (s.includes(w)) score += 7; });
  if (/new england journal|nejm|lancet|jama|european urology|journal of clinical oncology|kidney international|jasn|clinical journal of the american society of nephrology/.test(s)) score += 12;
  if (/case report|protocol|editorial|letter to the editor/.test(s)) score -= 18;
  return Math.max(0, Math.min(100, score));
}
function detectStudyDesign(title: string, abstract: string) {
  const s = `${title} ${abstract}`.toLowerCase();
  if (/phase iii|phase 3/.test(s)) return "Phase III"; if (/phase ii|phase 2/.test(s)) return "Phase II"; if (/randomized|randomised/.test(s)) return "RCT";
  if (/meta-analysis/.test(s)) return "Meta-analysis"; if (/systematic review/.test(s)) return "Systematic review"; if (/guideline|consensus statement/.test(s)) return "Guideline / Consensus";
  if (/prospective/.test(s)) return "Prospective study"; if (/retrospective/.test(s)) return "Retrospective study"; if (/cohort/.test(s)) return "Cohort study"; return "Clinical study";
}
function detectTags(category: Category, title: string, abstract = "") {
  const s = `${title} ${abstract}`.toLowerCase(); const tags: string[] = [];
  const pairs: Array<[RegExp,string]> = category === "urology" ? [[/prostate|mcrpc|mcspc|nmcrpc/,"Prostate"],[/bladder|urothelial|nmibc|mibc|utuc/,"Urothelial"],[/renal cell|kidney cancer|rcc/,"RCC"],[/stone|urolithiasis|calculi/,"Stone"],[/benign prostatic|bph|lower urinary tract|luts/,"LUTS/BPH"]] : category === "dialysis" ? [[/hemodialysis|haemodialysis|\bhd\b/,"HD"],[/peritoneal dialysis|\bpd\b/,"PD"],[/hemodiafiltration|\bhdf\b/,"HDF"],[/anemia|anaemia|erythropoietin|esa/,"Anemia"],[/vascular access|fistula|graft/,"VA"],[/mineral bone|ckd-mbd|phosphate|parathyroid/,"CKD-MBD"]] : [[/agent/,"Agent"],[/multimodal/,"Multimodal"],[/open[- ]weight|open source/,"Open"],[/api/,"API"],[/regulat|law|copyright/,"Policy"]];
  pairs.forEach(([re,n]) => { if (re.test(s)) tags.push(n); }); return tags.slice(0,3);
}
function sentenceSummary(raw: string, fallback: string) { const c = text(raw); if (!c) return fallback; return c.split(/(?<=[.!?。！？])\s+/).filter(Boolean).slice(0,2).join(" ").slice(0,430); }

function extractArticleText(html: string) {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<nav[\s\S]*?<\/nav>/gi," ").replace(/<footer[\s\S]*?<\/footer>/gi," ");
  const scope = clean.match(/<article\b[\s\S]*?<\/article>/i)?.[0] || clean.match(/<main\b[\s\S]*?<\/main>/i)?.[0] || clean;
  const paras = [...scope.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m => text(m[1])).filter(p => p.length > 45 && !/cookie|newsletter|subscribe|advertis/i.test(p));
  return paras.join("\n").slice(0,9000);
}
async function hydrateNews(items: Item[]) {
  return Promise.all(items.map(async item => {
    try {
      const r = await fetch(item.url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 WS-studio-Brief/1.2", Accept: "text/html,application/xhtml+xml" }, next: { revalidate: 21600 } });
      if (!r.ok) return item;
      const html = await r.text(); const body = extractArticleText(html);
      return body.length > 300 ? { ...item, url: r.url || item.url, rawText: body } : item;
    } catch { return item; }
  }));
}

async function fetchAINews(): Promise<Item[]> {
  const query = encodeURIComponent('(OpenAI OR Anthropic OR Gemini OR "Google DeepMind" OR NVIDIA OR "AI agent" OR "artificial intelligence") when:2d');
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(url, { headers: { "User-Agent": "WS-studio-Brief/1.2" }, next: { revalidate: 1800 } }); if (!response.ok) return [];
  const blocks = (await response.text()).match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const items = blocks.map(block => {
    const rawTitle = tag(block,"title"), link = tag(block,"link"), pubDate = tag(block,"pubDate"); const sm = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i); const source = sm ? text(sm[1]) : "Google News";
    const title = rawTitle.replace(/\s+-\s+[^-]+$/,"").trim(); const score = scoreAI(title,source);
    return { id: stableId(link || title), category:"ai" as const, kind:"NEWS" as const, title, source, url:link, publishedAt:new Date(pubDate || Date.now()).toISOString(), summary:"クリックで日本語要約を表示します。", detailSummary:"", whyImportant:score >= 78 ? "AIの使い方や業界構造を直接変える可能性が高い更新です。" : "現在のAI開発・利用トレンドを把握するうえで関連度が高いニュースです。", importance:importance(score), score, tags:detectTags("ai",title), rawText:title };
  }).filter(i => i.url && i.title && i.score >= 45).sort((a,b) => b.score-a.score).slice(0,LIMITS.ai);
  return hydrateNews(items);
}

async function fetchPubMed(category: "urology" | "dialysis"): Promise<Item[]> {
  const term = category === "urology" ? '(prostate cancer OR bladder cancer OR urothelial carcinoma OR renal cell carcinoma OR urolithiasis OR benign prostatic hyperplasia OR urology) AND ("last 14 days"[PDat])' : '(hemodialysis OR haemodialysis OR peritoneal dialysis OR kidney replacement therapy OR hemodiafiltration OR dialysis) AND ("last 14 days"[PDat])';
  const s = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"); s.searchParams.set("db","pubmed"); s.searchParams.set("term",term); s.searchParams.set("retmode","json"); s.searchParams.set("retmax","20"); s.searchParams.set("sort","pub date"); s.searchParams.set("tool","ws_studio_brief");
  const sr = await fetch(s,{next:{revalidate:1800}}); if (!sr.ok) return []; const ids: string[] = (await sr.json())?.esearchresult?.idlist ?? []; if (!ids.length) return [];
  const f = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"); f.searchParams.set("db","pubmed"); f.searchParams.set("id",ids.join(",")); f.searchParams.set("retmode","xml"); f.searchParams.set("tool","ws_studio_brief");
  const fr = await fetch(f,{next:{revalidate:1800}}); if (!fr.ok) return []; const articles = (await fr.text()).match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) ?? [];
  return articles.map(block => {
    const pmid=tag(block,"PMID"), title=tag(block,"ArticleTitle"), journal=tag(block,"Title")||tag(block,"ISOAbbreviation")||"PubMed"; const abstract=[...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi)].map(m=>text(m[1])).join(" ");
    const parsed=Date.parse(`${tag(block,"Year")||new Date().getFullYear()} ${tag(block,"Month")||"01"} ${tag(block,"Day")||"01"}`), score=scorePaper(title,journal,abstract);
    return { id:stableId(`pmid:${pmid}`), category, kind:"PAPER" as const, title, source:journal, url:`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, publishedAt:Number.isNaN(parsed)?new Date().toISOString():new Date(parsed).toISOString(), summary:sentenceSummary(abstract,"PubMed新着論文。抄録情報が限定的なため原文確認を推奨します。"), whyImportant:score>=78?"診療判断へ影響しうる要素を含む可能性が高い論文です。":"臨床上チェックする価値がある候補です。", importance:importance(score), score, studyDesign:detectStudyDesign(title,abstract), keyResult:"AI要約が有効な場合、主要結果をここに表示します。", tags:detectTags(category,title,abstract), rawText:abstract.slice(0,5000) };
  }).filter(i=>i.title&&i.score>=42).sort((a,b)=>b.score-a.score).slice(0,LIMITS[category]);
}

function responseText(json:any){ if(typeof json?.output_text==="string") return json.output_text; const c:string[]=[]; for(const o of json?.output??[]) for(const x of o?.content??[]) if(typeof x?.text==="string") c.push(x.text); return c.join("\n"); }
async function enrichWithAI(items: Item[]): Promise<Item[]> {
  const key=process.env.OPENAI_API_KEY; if(!key||!items.length) return items;
  try {
    const compact=items.map(({id,category,kind,title,source,score,studyDesign,rawText})=>({id,category,kind,title,source,score,studyDesign,rawText}));
    const prompt=`あなたは日本語のニュース編集者兼、泌尿器科・腎臓/透析領域の医学論文エディターです。原文にない事実や数値を推測しないでください。\nNEWS: detailSummary は日本語で約3分で読める長さ（目安700〜1200字）。最初に結論を1〜2文、その後に「何が起きたか」「何が新しいか」「利用者・業界への影響」を自然な文章で説明。whyImportant は1〜2文。本文取得が不十分なら、確認できた範囲だけで短くまとめ、不足を明記。\nPAPER: summary 2〜3文、studyDesign、keyResult（数値があれば数値込み）、whyImportant（臨床的結論）を作る。主要結果が抄録から確定できなければそう明記。\nimportance は CRITICAL/HIGH/MEDIUM。JSON配列だけ返す。キーは id, summary, detailSummary, whyImportant, importance, studyDesign, keyResult。\n\n${JSON.stringify(compact)}`;
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.BRIEF_MODEL||"gpt-5.6-luna",input:prompt,max_output_tokens:7000})}); if(!r.ok) return items;
    const raw=responseText(await r.json()).replace(/^```json\s*/i,"").replace(/```\s*$/,"").trim(); const arr=JSON.parse(raw) as Array<any>; const map=new Map(arr.map(x=>[x.id,x]));
    return items.map(item=>{const x=map.get(item.id); if(!x) return item; return {...item, summary:x.summary||item.summary, detailSummary:item.kind==="NEWS"?(x.detailSummary||item.detailSummary):undefined, whyImportant:x.whyImportant||item.whyImportant, importance:x.importance||item.importance, studyDesign:item.kind==="PAPER"?(x.studyDesign||item.studyDesign):undefined, keyResult:item.kind==="PAPER"?(x.keyResult||item.keyResult):undefined};});
  } catch { return items; }
}

export async function GET(){
  const [ai,urology,dialysis]=await Promise.all([fetchAINews(),fetchPubMed("urology"),fetchPubMed("dialysis")]); const enriched=await enrichWithAI([...ai,...urology,...dialysis]);
  const items=enriched.map(({rawText:_raw,...item})=>item); return NextResponse.json({generatedAt:new Date().toISOString(),items},{headers:{"Cache-Control":"private, max-age=0, s-maxage=21600, stale-while-revalidate=43200"}});
}
