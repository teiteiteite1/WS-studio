import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { createDefaultWorkspace, normalizeWorkspace, projectFromIdea } from "../app/control/shafu-data.ts";

const routePath = new URL("../app/api/control/ai/route.ts", import.meta.url);
const routeSource = readFileSync(routePath, "utf8").replace(
  'import { NextResponse } from "next/server";',
  "const NextResponse = { json(value, init) { return Response.json(value, init); } };",
);
const routeModule = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(routeSource, { mode: "strip" })).toString("base64")}`);
const { POST } = routeModule;

const originalFetch = globalThis.fetch;

function request(action, payload = {}, withKey = true) {
  return new Request("http://localhost/api/control/ai", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(withKey ? { "x-openai-key": "sk-test" } : {}),
    },
    body: JSON.stringify({ action, payload }),
  });
}

function mockOpenAI(output) {
  globalThis.fetch = async (_url, init) => {
    const sent = JSON.parse(String(init?.body || "{}"));
    assert.equal(sent.store, false);
    return new Response(JSON.stringify({ output_text: JSON.stringify(output), model: sent.model }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

test.afterEach(() => { globalThis.fetch = originalFetch; });

test("workspace starts with editable story fields and versioned Shafu bible", () => {
  const workspace = createDefaultWorkspace();
  assert.equal(workspace.schemaVersion, 2);
  assert.deepEqual(workspace.story, { current: "", goal: "", mainArc: "", unresolved: "", characterState: "" });
  assert.match(workspace.bible.videoStyle, /映像/);
  assert.equal(workspace.bibleHistory.length, 1);

  const normalized = normalizeWorkspace({ story: { ...workspace.story, goal: "後から決める" } });
  assert.equal(normalized.story.goal, "後から決める");
  assert.equal(normalized.story.current, "");
});

test("idea becomes a linked project and respects the selected default video model", () => {
  const idea = {
    id: "0f39a0e4-0612-4c89-9799-754457f22cc6",
    title: "冷蔵庫の前",
    body: "冷蔵庫を開けたまま考え、考えている間に座り込む。",
    duration: 45,
    tags: ["日常"], directions: ["日常"], styles: ["映像主体"], storyType: "SIDE",
    status: "favorite", priority: 2, duplicateWarning: "", sourceIdeaId: null, source: "manual",
    createdAt: "2026-09-06T00:00:00.000Z", updatedAt: "2026-09-06T00:00:00.000Z",
  };
  const project = projectFromIdea(idea, "Seedance");
  assert.equal(project.ideaId, idea.id);
  assert.equal(project.ideaText, idea.body);
  assert.equal(project.promptModel, "Seedance");
  assert.equal(project.stage, "idea");
});

test("prompt duration options keep the numeric project duration", () => {
  const clientSource = readFileSync(new URL("../app/control/ShafuClient.tsx", import.meta.url), "utf8");
  assert.match(clientSource, /<option key=\{n\} value=\{n\}>\{n\} sec<\/option>/);
});

test("AI route requires a key before any generation", async () => {
  const response = await POST(request("ideas_generate", {}, false));
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /APIキー/);
});

test("AI route keeps ideas short-form, clamps duration, and preserves human selection", async () => {
  mockOpenAI({ ideas: Array.from({ length: 24 }, (_, index) => ({
    title: `案${index + 1}`,
    body: "何が起きるかだけを書く。",
    duration: 44,
    tags: ["日常"],
    storyType: "SIDE",
    duplicateWarning: "",
  })) });
  const response = await POST(request("ideas_generate", { count: 24, duration: 45, tier: "standard" }));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ideas.length, 24);
  assert.equal(data.ideas[0].duration, 45);
});

test("two-part scenario remains two independent episode records", async () => {
  mockOpenAI({
    title: "前後編テスト",
    scenario: "全体の流れ",
    episodes: [
      { title: "EPISODE 1", scenario: "導入と見どころ、引き" },
      { title: "EPISODE 2", scenario: "継続と展開、状態の変化" },
    ],
  });
  const response = await POST(request("scenario", { project: { episodeMode: "two_part", episodeCount: 2 } }));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.episodes.length, 2);
  assert.notEqual(data.episodes[0].scenario, data.episodes[1].scenario);
});

test("preflight always returns all eight checks in the required order", async () => {
  const categories = ["CHARACTER", "WORLD", "STORY", "DUPLICATION", "DIALOGUE", "VISUAL", "LENGTH", "GENERATION RISK"];
  mockOpenAI({ checks: categories.map((category) => ({ category, status: "OK", issue: "", proposedFix: "" })) });
  const response = await POST(request("preflight", { project: {}, bible: {}, story: {} }));
  const data = await response.json();
  assert.deepEqual(data.checks.map((check) => check.category), categories);
});

test("H3 prompt response keeps bilingual reference tokens", async () => {
  mockOpenAI({ english: "CLIP 1 @image1 No BGM. No text or logos.", japanese: "CLIP 1 @image1 BGMなし。文字・ロゴなし。" });
  const response = await POST(request("prompt_build", { model: "H3", duration: 60, maxChars: 25000, references: [{ token: "@image1" }] }));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.effectiveMax, 7000);
  assert.match(data.english, /@image1/);
  assert.match(data.japanese, /@image1/);
});

test("production rejects missing, blank and duplicate second parts", async () => {
 for (const part2_prompt of [undefined, "   ", "前半"]) {
  mockOpenAI({title:"テスト",summary:"全体",part1_prompt:"前半",part2_prompt,continuity:"公園、昼、ベンチ"});
  const response=await POST(request("production_prompt",{seed:"公園で休む",edge:"社不"}));
  assert.equal(response.status,502);
 }
});
test("production returns two standalone prompts with shared rules and concrete continuity", async()=>{
 mockOpenAI({title:"ベンチ",summary:"40秒の話",part1_prompt:"0〜20秒：ベンチに座る",part2_prompt:"0〜20秒：さらに横になる",continuity:"公園、昼、参照画像のパーカー、右手に缶、ベンチ右側に座る"});
 const response=await POST(request("production_prompt",{seed:"ベンチを占領",edge:"炎上寸前",bible:{voice:"眠そうな可愛い声"}}));
 assert.equal(response.status,200);const data=await response.json();
 for(const part of [data.part1_prompt,data.part2_prompt])for(const term of ["20秒","社不ちゃん @image1","眠そうな可愛い声","共通演出","ネガティブプロンプト","BGMなし","右手に缶"])assert.ok(part.includes(term),term);
 assert.match(data.part2_prompt,/PART 1の直後/);
});
test("additive production fields survive workspace normalization with old records",()=>{
 const w=createDefaultWorkspace();w.projects=[{id:"legacy",promptJa:"旧原文",episodes:[]},{id:"new",production:{title:"a",summary:"b",part1_prompt:"c",part2_prompt:"d"},metrics:{views:10},publicationStatus:"scheduled"}];
 const n=normalizeWorkspace(JSON.parse(JSON.stringify(w)));assert.deepEqual(n.projects,w.projects);
});
