import assert from "node:assert/strict";
import test from "node:test";
import { COURSE } from "../app/learn/courseData.ts";
import { LESSON_GUIDES } from "../app/learn/lessonGuide.ts";
import { dedupeCandidates, relatedLessonsFor, selectAINews } from "../app/brief/newsLogic.ts";

const NOW = Date.parse("2026-09-06T12:00:00.000Z");
const candidate = (title, source, beat = "frontier", hour = 0) => ({
  title,
  source,
  beat,
  url: `https://example.com/${encodeURIComponent(title)}`,
  publishedAt: new Date(NOW - hour * 3_600_000).toISOString(),
  description: title,
});

test("Brief merges multiple reports of the same announcement and prefers a primary source", () => {
  const items = dedupeCandidates([
    candidate("OpenAI introduces GPT-7 with multimodal tool use", "OpenAI"),
    candidate("OpenAI launches GPT-7 multimodal model with tool use", "Reuters"),
    candidate("GPT-7 is here: OpenAI releases new multimodal model", "The Verge"),
  ], NOW);
  assert.equal(items.length, 1);
  assert.equal(items[0].source, "OpenAI");
});

test("Brief applies soft diversity while still choosing the highest-value news", () => {
  const items = selectAINews([
    candidate("OpenAI launches GPT-7 frontier model", "OpenAI"),
    candidate("OpenAI releases new computer use agent", "OpenAI"),
    candidate("OpenAI announces major AI partnership", "OpenAI", "business"),
    candidate("Anthropic launches Claude 6 reasoning model", "Anthropic"),
    candidate("Adobe releases Firefly video workflow update", "Adobe", "creative"),
    candidate("NVIDIA unveils new AI GPU platform", "NVIDIA", "infrastructure"),
    candidate("EU adopts new AI copyright guidance", "Reuters", "policy"),
  ], NOW);
  assert.ok(items.length >= 5 && items.length <= 7);
  assert.ok(new Set(items.map((item) => item.company)).size >= 4);
  assert.ok(items.some((item) => item.company === "OpenAI"));
  assert.ok(items.some((item) => item.company === "Adobe"));
});

test("Brief links technical terms to the matching AI30 days", () => {
  const lessons = relatedLessonsFor("A new agent uses MCP tools with a longer context window", 3);
  assert.deepEqual(lessons.map((lesson) => lesson.day), [23, 9, 22]);
});

test("AI30 has one complete, cumulative lesson for every day", () => {
  const ordered = [...COURSE].sort((a, b) => a.day - b.day);
  assert.deepEqual(ordered.map((lesson) => lesson.day), Array.from({ length: 30 }, (_, index) => index + 1));
  assert.match(ordered[6].title, /Token/);
  assert.match(ordered[7].title, /Transformer/);
  assert.match(ordered[28].title, /主要AI企業/);
  assert.match(ordered[29].title, /2026年/);
  for (const lesson of ordered) {
    const guide = LESSON_GUIDES[lesson.day];
    assert.ok(guide, `DAY ${lesson.day} guide`);
    assert.ok(lesson.sections.length >= 4, `DAY ${lesson.day} deeper content`);
    assert.ok(guide.todaysIdea.length >= 20, `DAY ${lesson.day} today's idea`);
    assert.ok(guide.whyExists.length >= 20, `DAY ${lesson.day} why`);
    assert.ok(guide.howUsed.length >= 20, `DAY ${lesson.day} how`);
    assert.ok(guide.whyCare.length >= 20, `DAY ${lesson.day} care`);
    assert.ok(guide.keyWords.length >= 3, `DAY ${lesson.day} keywords`);
    assert.ok(guide.ownWords.length >= 2 && guide.ownWords.length <= 4, `DAY ${lesson.day} own words`);
    assert.ok(guide.prerequisites.every((day) => day < lesson.day), `DAY ${lesson.day} prerequisites only use earlier lessons`);
  }
});
