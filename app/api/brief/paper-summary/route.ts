import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = { title: string; source: string; url: string; category?: string };

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    japaneseTitle: { type: "string" },
    bottomLine: { type: "string" },
    population: { type: "string" },
    studyDesign: { type: "string" },
    intervention: { type: "string" },
    comparator: { type: "string" },
    keyResults: { type: "string" },
    clinicalImpact: { type: "string" },
    limitations: { type: "string" },
  },
  required: ["japaneseTitle","bottomLine","population","studyDesign","intervention","comparator","keyResults","clinicalImpact","limitations"],
};

function textFrom(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;
  const chunks: string[] = [];
  for (const item of data?.output || []) if (item?.type === "message") {
    for (const c of item?.content || []) if (c?.type === "output_text" && typeof c.text === "string") chunks.push(c.text);
  }
  return chunks.join("\n");
}
function parseJSON(raw: string) {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(clean); } catch {
    const a = clean.indexOf("{"), b = clean.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(clean.slice(a, b + 1));
    throw new Error("AI解説を読み取れませんでした。");
  }
}
function friendlyError(status: number, data: any) {
  const code = String(data?.error?.code || data?.error?.type || "");
  const raw = String(data?.error?.message || `OpenAI API error (${status})`);
  if (status === 401 || /invalid_api_key|incorrect api key/i.test(`${code} ${raw}`)) return "APIキーが無効です。ControlのSettingsで保存し直してください。";
  if (/credit_balance_exhausted|insufficient_quota|spend_limit|usage_limit/i.test(`${code} ${raw}`)) return "OpenAI APIの残高または利用上限に達しています。";
  if (status === 429) return "OpenAI APIが混み合っています。少し待ってからもう一度開いてください。";
  return raw;
}
function pmidFrom(url: string) { return url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/)?.[1] || ""; }
function cleanXml(value: string) {
  return value.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
}
async function fetchPubMed(pmid: string) {
  if (!pmid) return "";
  const u = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi");
  u.searchParams.set("db","pubmed"); u.searchParams.set("id",pmid); u.searchParams.set("retmode","xml"); u.searchParams.set("tool","ws_studio_brief");
  const r = await fetch(u,{cache:"no-store"});
  if (!r.ok) return "";
  const xml = await r.text();
  const title = cleanXml(xml.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/i)?.[1] || "");
  const parts = [...xml.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi)].map(m=>cleanXml(m[1]));
  return `Title: ${title}\nAbstract: ${parts.join(" ")}`.slice(0,14000);
}

async function callOpenAI(key: string, payload: Payload, sourceText: string) {
  const instructions = `あなたは泌尿器科・腎臓/透析領域の医師向け論文エディターです。対象読者は臨床医です。英語抄録を翻訳・言い換えするだけではなく、診療判断のために情報を再構成してください。原文にない事実・数値・推論は足さないでください。結果と著者の解釈を区別し、臨床導入を断定しすぎないでください。すべて自然な日本語で書きます。薬剤名・試験名・HR・CI・p値など必要な医学用語や数値は保持してください。情報が抄録にない項目は「抄録では不明」と明記してください。`;
  const input = `以下の論文を、3分程度で把握できる医師向け解説にしてください。\n\n元タイトル: ${payload.title}\n掲載誌: ${payload.source}\n領域: ${payload.category || "medical"}\nURL: ${payload.url}\n\nPubMed情報:\n${sourceText || "PubMed抄録を取得できませんでした。タイトルとWeb上で確認可能な情報だけを使い、不足を明記してください。"}\n\n各項目の意図:\n- japaneseTitle: 意味を保った自然な日本語タイトル\n- bottomLine: 最初に読む結論。2〜4文で「結局何が分かったか」\n- population: 対象患者、N、主要背景\n- studyDesign: RCT/Phase III/観察研究等、期間や主要評価項目も分かれば含める\n- intervention: 介入群。該当しなければ「該当なし」\n- comparator: 対照群。該当しなければ「該当なし」\n- keyResults: 一番重要。主要評価項目と数値を優先し、3〜6文\n- clinicalImpact: 明日からの診療が変わるか、ガイドラインや標準治療との位置づけを慎重に2〜4文\n- limitations: 解釈上の限界を1〜3文。抄録から判断不能ならそう書く`;

  const body: any = {
    model: "gpt-5.6-luna", store: false, reasoning: { effort: "low" }, instructions, input,
    text: { format: { type: "json_schema", name: "brief_medical_paper", strict: true, schema } },
    max_output_tokens: 2600,
  };
  let r = await fetch("https://api.openai.com/v1/responses",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify(body)});
  let data = await r.json().catch(()=>({}));
  if (!r.ok && r.status === 400) {
    delete body.text;
    body.instructions += `\n必ずJSONのみで返してください。キー: japaneseTitle,bottomLine,population,studyDesign,intervention,comparator,keyResults,clinicalImpact,limitations`;
    r = await fetch("https://api.openai.com/v1/responses",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify(body)});
    data = await r.json().catch(()=>({}));
  }
  if (!r.ok) throw new Error(friendlyError(r.status,data));
  return { ...parseJSON(textFrom(data)), model: data?.model || "gpt-5.6-luna" };
}

export async function POST(request: Request) {
  try {
    const b = await request.json();
    const payload: Payload = { title:String(b?.title||"").trim(),source:String(b?.source||"").trim(),url:String(b?.url||"").trim(),category:String(b?.category||"").trim() };
    if (!payload.title || !payload.url) return NextResponse.json({error:"論文情報が不足しています。"},{status:400});
    const key = request.headers.get("x-openai-key")?.trim() || process.env.OPENAI_API_KEY?.trim();
    if (!key) return NextResponse.json({error:"AI解説用のOpenAI APIキーがこの端末にありません。ControlのSettingsでAPIキーを保存してください。",code:"NO_API_KEY"},{status:401});
    const sourceText = await fetchPubMed(pmidFrom(payload.url));
    const result = await callOpenAI(key,payload,sourceText);
    return NextResponse.json(result,{headers:{"Cache-Control":"private, no-store"}});
  } catch (e) {
    return NextResponse.json({error:e instanceof Error?e.message:"論文解説に失敗しました。"},{status:500});
  }
}
