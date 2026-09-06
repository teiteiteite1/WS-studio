export type NewsBeat = "frontier" | "creative" | "infrastructure" | "research" | "policy" | "business";

export type RelatedLesson = {
  day: number;
  title: string;
  term: string;
};

export type NewsCandidate = {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  description?: string;
  beat: NewsBeat;
};

export type RankedNewsCandidate = NewsCandidate & {
  company: string;
  industryScore: number;
  creatorScore: number;
  score: number;
  sourceType: "PRIMARY" | "REPORTING" | "OTHER";
};

const COMPANY_PATTERNS: Array<[RegExp, string]> = [
  [/\bopenai\b|\bchatgpt\b|\bgpt[-\s]?\d/i, "OpenAI"],
  [/\bgoogle deepmind\b|\bdeepmind\b|\bgemini\b|\bveo\b|\bnano banana\b/i, "Google"],
  [/\banthropic\b|\bclaude\b/i, "Anthropic"],
  [/\bspace[x ]?ai\b|\bxai\b|\bgrok\b/i, "xAI"],
  [/\bmeta ai\b|\bllama\b/i, "Meta"],
  [/\bmicrosoft\b|\bcopilot\b|\bazure ai\b/i, "Microsoft"],
  [/\bnvidia\b|\bcuda\b/i, "NVIDIA"],
  [/\badobe\b|\bfirefly\b/i, "Adobe"],
  [/\bmidjourney\b|\bniji\b/i, "Midjourney"],
  [/\brunway\b|\baleph\b/i, "Runway"],
  [/\bbytedance\b|\bseedance\b|\bseedream\b/i, "ByteDance"],
  [/\bkuaishou\b|\bkling\b/i, "Kuaishou"],
  [/\bminimax\b|\bhailuo\b/i, "MiniMax"],
  [/\bsuno\b/i, "Suno"],
  [/\belevenlabs\b|\beleven v\d/i, "ElevenLabs"],
  [/\bstability ai\b|\bstable diffusion\b/i, "Stability AI"],
];

const PRIMARY_SOURCE = /^(openai|anthropic|google|google deepmind|deepmind|microsoft|nvidia|adobe|midjourney|runway|bytedance|kling ai|kuaishou|minimax|suno|elevenlabs|stability ai|meta ai|meta|spacexai|xai)$/i;
const TRUSTED_REPORTING = /reuters|associated press|\bap news\b|financial times|bloomberg|the verge|wired|techcrunch|ars technica|mit technology review|nature|science|semianalysis|nikkei|日本経済新聞|nhk/i;
const LOW_QUALITY = /sponsored|press release distribution|best \d+|top \d+|coupon|deal|how to make money|stock forecast|yahoo finance uk|msn/i;

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "in", "is", "it", "its", "new", "of", "on", "or", "the", "to", "with",
  "ai", "artificial", "intelligence", "announces", "announced", "introduces", "introduced", "launches", "launched", "releases", "released",
]);

const TOPIC_RULES: Array<{ re: RegExp; day: number; title: string; term: string; weight: number }> = [
  { re: /token|tokenizer/i, day: 7, title: "TokenとTokenizer", term: "Token", weight: 9 },
  { re: /transformer|attention/i, day: 8, title: "TransformerとAttention", term: "Transformer", weight: 9 },
  { re: /context window|long context|million[- ]token/i, day: 9, title: "Context Window", term: "Context Window", weight: 9 },
  { re: /embedding|vector (?:database|search)|semantic search/i, day: 10, title: "Embedding", term: "Embedding", weight: 9 },
  { re: /inference|latency|reasoning effort|test[- ]time compute/i, day: 11, title: "推論と出力", term: "Inference", weight: 7 },
  { re: /hallucinat|grounding|factual/i, day: 12, title: "Hallucination", term: "Hallucination", weight: 8 },
  { re: /prompt|instruction following/i, day: 13, title: "Prompt", term: "Prompt", weight: 6 },
  { re: /reasoning|thinking model|chain.of.thought/i, day: 14, title: "Reasoningモデル", term: "Reasoning", weight: 8 },
  { re: /multimodal|omni.modal|vision.language/i, day: 15, title: "Multimodal AI", term: "Multimodal", weight: 8 },
  { re: /image generation|midjourney|firefly|stable diffusion|seedream|image model/i, day: 16, title: "画像生成AI", term: "画像生成", weight: 10 },
  { re: /video generation|runway|seedance|kling|hailuo|video model|world model/i, day: 17, title: "動画生成AI", term: "動画生成", weight: 10 },
  { re: /voice|speech|text.to.speech|tts|music generation|suno|elevenlabs|audio model/i, day: 18, title: "音声・音楽生成AI", term: "音声・音楽生成", weight: 10 },
  { re: /\bapi\b|developer platform/i, day: 19, title: "API", term: "API", weight: 6 },
  { re: /tool use|tool calling|function calling|structured output/i, day: 20, title: "Tool UseとFunction Calling", term: "Tool Use", weight: 9 },
  { re: /\brag\b|retrieval.augmented/i, day: 21, title: "RAG", term: "RAG", weight: 10 },
  { re: /\bagent\b|agentic|computer use|browser use|automation/i, day: 22, title: "AI Agent", term: "AI Agent", weight: 9 },
  { re: /\bmcp\b|model context protocol/i, day: 23, title: "MCP", term: "MCP", weight: 10 },
  { re: /memory|personalization/i, day: 24, title: "Memory", term: "Memory", weight: 7 },
  { re: /fine.tun|post.training|reinforcement learning/i, day: 25, title: "Fine-tuning", term: "Fine-tuning", weight: 7 },
  { re: /open.weight|open source model|local (?:ai|llm)|quantiz|llama/i, day: 26, title: "Local AIとOpen Weight", term: "Open Weight", weight: 9 },
  { re: /benchmark|\beval|evaluation|leaderboard/i, day: 27, title: "BenchmarkとEvals", term: "Benchmark", weight: 8 },
  { re: /copyright|training data|regulat|law|lawsuit|safety|alignment|watermark|provenance/i, day: 28, title: "安全性・著作権・規制", term: "安全性・権利", weight: 10 },
  { re: /openai|anthropic|google|deepmind|gemini|xai|grok|meta|microsoft|nvidia/i, day: 29, title: "主要企業とモデル", term: "業界の勢力図", weight: 3 },
  { re: /robot|semiconductor|\bgpu\b|funding|acquisition|partnership|workflow/i, day: 30, title: "2026年の重要潮流", term: "業界潮流", weight: 4 },
];

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function companyFor(value: string) {
  return COMPANY_PATTERNS.find(([pattern]) => pattern.test(value))?.[1] ?? "Other";
}

export function sourceTypeFor(source: string): RankedNewsCandidate["sourceType"] {
  if (PRIMARY_SOURCE.test(source.trim())) return "PRIMARY";
  if (TRUSTED_REPORTING.test(source)) return "REPORTING";
  return "OTHER";
}

function keywordScore(value: string, terms: Array<[RegExp, number]>) {
  return terms.reduce((sum, [pattern, points]) => sum + (pattern.test(value) ? points : 0), 0);
}

export function rankCandidate(candidate: NewsCandidate, now = Date.now()): RankedNewsCandidate {
  const text = `${candidate.title} ${candidate.description ?? ""} ${candidate.source}`;
  const sourceType = sourceTypeFor(candidate.source);
  const company = companyFor(text);
  let industryScore = 30;
  let creatorScore = 20;

  if (candidate.beat === "frontier") industryScore += 5;
  if (candidate.beat === "research") industryScore += 8;
  if (candidate.beat === "infrastructure" || candidate.beat === "policy") industryScore += 6;
  if (candidate.beat === "creative") creatorScore += 9;

  industryScore += keywordScore(text, [
    [/introduc|launch|release|unveil|available|debut|preview/i, 11],
    [/new model|flagship|frontier model|major update|next.generation/i, 11],
    [/agentic|computer use|tool use|multimodal|reasoning/i, 8],
    [/copyright|regulat|legislation|lawsuit|safety|security|alignment/i, 10],
    [/acquisition|acquire|merger|funding|raises|partnership|deal/i, 7],
    [/benchmark|evaluation|research|paper/i, 4],
    [/price|pricing|commercial|license|terms of use|open.weight|open source/i, 7],
    [/\bgpu\b|semiconductor|chip|data center|robot/i, 6],
  ]);
  if (company !== "Other") industryScore += 7;
  if (sourceType === "PRIMARY") industryScore += 15;
  if (sourceType === "REPORTING") industryScore += 9;
  if (LOW_QUALITY.test(text)) industryScore -= 28;

  creatorScore += keywordScore(text, [
    [/image|video|audio|voice|music|creator|creative|design|film|animation/i, 16],
    [/midjourney|runway|firefly|seedance|seedream|kling|hailuo|minimax|suno|elevenlabs|stability ai/i, 20],
    [/character|consisten|reference|editing|workflow|camera|lip.sync|storyboard|social media/i, 9],
    [/commercial|copyright|license|training data|terms of use|watermark|provenance/i, 13],
    [/agent|automation|tool use|api|multimodal/i, 8],
    [/model performance|quality|faster|latency|price|pricing|cost/i, 7],
  ]);

  const ageHours = Math.max(0, (now - Date.parse(candidate.publishedAt)) / 3_600_000);
  if (ageHours > 96) industryScore -= Math.min(18, (ageHours - 96) / 12);
  if (ageHours < 24) industryScore += 3;

  industryScore = clamp(industryScore);
  creatorScore = clamp(creatorScore);
  const score = clamp(industryScore * 0.7 + creatorScore * 0.3);
  return { ...candidate, company, sourceType, industryScore, creatorScore, score };
}

function titleTokens(title: string) {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}.]+/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  );
}

function similarity(a: Set<string>, b: Set<string>) {
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

function versionKeys(title: string): string[] {
  return title.toLowerCase().match(/(?:gpt|claude|gemini|grok|llama|midjourney|niji|kling|seedance|seedream|hailuo|firefly|suno|eleven|veo)[-\s]*(?:[a-z]+[-\s]*)?\d+(?:\.\d+)*/g) ?? [];
}

function actionKey(title: string) {
  if (/acqui|merger|buying|buys/i.test(title)) return "acquisition";
  if (/funding|raises|valuation|investment/i.test(title)) return "funding";
  if (/lawsuit|copyright|court|regulat|law|ban/i.test(title)) return "policy";
  if (/partner|deal|collaborat|integrat/i.test(title)) return "partnership";
  if (/launch|release|introduc|unveil|available|debut|preview/i.test(title)) return "release";
  return "other";
}

function isDuplicate(a: RankedNewsCandidate, b: RankedNewsCandidate) {
  const tokensA = titleTokens(a.title);
  const tokensB = titleTokens(b.title);
  const overlap = similarity(tokensA, tokensB);
  if (overlap >= 0.62) return true;

  const versionsA = versionKeys(a.title);
  const versionsB = versionKeys(b.title);
  const sameVersion = versionsA.some((version) => versionsB.includes(version));
  const sameCompany = a.company !== "Other" && a.company === b.company;
  const sameAction = actionKey(a.title) === actionKey(b.title) && actionKey(a.title) !== "other";
  if (sameCompany && sameVersion && sameAction) return true;
  return sameCompany && sameAction && overlap >= 0.44;
}

function preferred(a: RankedNewsCandidate, b: RankedNewsCandidate) {
  const sourceRank = { PRIMARY: 2, REPORTING: 1, OTHER: 0 } as const;
  if (sourceRank[a.sourceType] !== sourceRank[b.sourceType]) return sourceRank[a.sourceType] > sourceRank[b.sourceType] ? a : b;
  if (a.score !== b.score) return a.score > b.score ? a : b;
  return Date.parse(a.publishedAt) >= Date.parse(b.publishedAt) ? a : b;
}

export function dedupeCandidates(candidates: RankedNewsCandidate[]) {
  const kept: RankedNewsCandidate[] = [];
  for (const candidate of [...candidates].sort((a, b) => b.score - a.score)) {
    const index = kept.findIndex((current) => isDuplicate(current, candidate));
    if (index < 0) kept.push(candidate);
    else kept[index] = preferred(kept[index], candidate);
  }
  return kept.sort((a, b) => b.score - a.score);
}

export function selectAINews(candidates: NewsCandidate[], now = Date.now()) {
  const pool = dedupeCandidates(candidates.map((candidate) => rankCandidate(candidate, now))).filter((candidate) => candidate.score >= 42);
  const selected: RankedNewsCandidate[] = [];
  const remaining = [...pool];
  const companyCounts = new Map<string, number>();
  const beatCounts = new Map<NewsBeat, number>();

  while (selected.length < 5 && remaining.length) {
    remaining.sort((a, b) => {
      const adjusted = (item: RankedNewsCandidate) => item.score
        - (companyCounts.get(item.company) ?? 0) * (item.company === "Other" ? 2 : 10)
        - (beatCounts.get(item.beat) ?? 0) * 4;
      return adjusted(b) - adjusted(a) || b.score - a.score;
    });
    const next = remaining.shift();
    if (!next) break;
    selected.push(next);
    companyCounts.set(next.company, (companyCounts.get(next.company) ?? 0) + 1);
    beatCounts.set(next.beat, (beatCounts.get(next.beat) ?? 0) + 1);
  }

  const extra = remaining
    .filter((candidate) => candidate.score >= 88 && !selected.some((item) => isDuplicate(item, candidate)))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  return [...selected, ...extra].sort((a, b) => b.score - a.score);
}

export function importanceFor(score: number): "CRITICAL" | "HIGH" | "MEDIUM" {
  return score >= 76 ? "CRITICAL" : score >= 58 ? "HIGH" : "MEDIUM";
}

export function relatedLessonsFor(value: string, max = 2): RelatedLesson[] {
  return TOPIC_RULES
    .filter((rule) => rule.re.test(value))
    .sort((a, b) => b.weight - a.weight)
    .filter((rule, index, all) => all.findIndex((candidate) => candidate.day === rule.day) === index)
    .slice(0, max)
    .map(({ day, title, term }) => ({ day, title, term }));
}
