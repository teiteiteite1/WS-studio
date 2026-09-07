import assert from 'node:assert/strict';
import test from 'node:test';
import { COURSE } from '../app/learn/courseData.ts';
import { LESSON_GUIDES } from '../app/learn/lessonGuide.ts';
import { NEWS_TOPICS } from '../app/learn/newsTopics.mjs';
import { relatedLessonsFor } from '../app/brief/newsLogic.ts';

// Baseline is the main-body paragraphs before the 2026-09-07 rewrite,
// excluding headings, keywords, questions and all supplemental UI copy.
const originalLengths = [1034,757,706,654,739,720,639,746,610,606,645,605,606,540,508,538,494,500,541,487,447,388,509,436,435,431,425,503,962,1022];
const mainBody = lesson => lesson.sections.flatMap(s => s.paragraphs).join('');

test('all 30 main bodies are substantial rewrites within a short lesson budget', () => {
  assert.deepEqual(COURSE.map(l => l.day), Array.from({length:30},(_,i)=>i+1));
  for (const lesson of COURSE) {
    const guide = LESSON_GUIDES[lesson.day];
    const body = mainBody(lesson);
    assert.ok(body.length >= originalLengths[lesson.day-1] * 1.49, `DAY${lesson.day}: body growth`);
    assert.ok(body.length >= 950 && body.length <= 1700, `DAY${lesson.day}: body length ${body.length}`);
    // Approx. 300 Japanese characters/minute plus 2 minutes of recall, optional deeper excluded.
    const required = [lesson.lead, guide.todaysIdea, guide.whyExists, guide.howUsed, guide.whyCare,
      ...lesson.sections.slice(0,-1).flatMap(s=>s.paragraphs), ...guide.realExamples,
      lesson.example.body, ...lesson.takeaways, lesson.misconception.wrong,lesson.misconception.right,
      ...guide.keyWords.map(k=>k.meaning),lesson.quiz.q,lesson.quiz.a,...guide.ownWords].join('');
    assert.ok(required.length <= 2500, `DAY${lesson.day}: reading budget ${required.length}`);
    for (const section of lesson.sections) {
      assert.ok(section.heading.trim());
      assert.ok(section.paragraphs.length >= 1);
      assert.ok(section.paragraphs.every(p=>p.trim().length >= 60));
    }
    assert.ok(guide.realExamples.length > 0);
    assert.ok(guide.keyWords.every(k=>k.meaning.length >= 30), `DAY${lesson.day}: meaningful glossary`);
    assert.ok(guide.prerequisites.every(d=>d < lesson.day && COURSE.some(l=>l.day===d)));
    const references = mainBody(lesson).matchAll(/DAY(\d+)/g);
    for (const [,day] of references) assert.ok(Number(day)>=1 && Number(day)<=30);
  }
});

test('foundational first appearances explain the requested difficult terms inline', () => {
  const definitions = [
    [2,/SVM（[^）]+）/], [2,/Gradient Boosting（[^）]+）/],
    [3,/Parameter（[^）]+）/], [3,/Inference（[^）]+）/],
    [6,/Token（[^）]+）/], [6,/Post-training（[^）]+）/],
    [8,/Attention（[^）]+）/], [8,/ベクトル（[^）]+）/],
    [9,/Context Window/], [10,/Vector（[^）]+）/], [10,/Embedding（[^）]+）/],
    [10,/RAG（[^）]+）はDAY21/], [13,/Prompt（[^）]+）/],
    [15,/Multimodal/], [16,/Diffusion（[^）]+）/], [16,/Latent（[^）]+）/],
    [19,/API/], [21,/Fine-tuning（[^）]+）/], [22,/Agent/], [27,/Benchmark（[^）]+）/],
  ];
  for (const [day,pattern] of definitions) assert.match(mainBody(COURSE[day-1]),pattern,`DAY${day}`);
  // Named advanced implementation jargon formerly appeared unexplained in DAY1–5.
  const early = COURSE.slice(0,5).map(mainBody).join('');
  assert.doesNotMatch(early,/\b(?:RAG|Transformer|Agent|Evals|API|Token)\b/);
});

test('each lesson vocabulary is usable by Brief without loading the full textbook', () => {
  assert.equal(NEWS_TOPICS.length,30);
  for (const topic of NEWS_TOPICS) {
    assert.equal(topic.title, COURSE[topic.day-1].title);
    assert.deepEqual(topic.terms,LESSON_GUIDES[topic.day].newsTerms);
    assert.ok(topic.terms.some(term=>relatedLessonsFor(term,30).some(l=>l.day===topic.day)),`DAY${topic.day}`);
  }
  assert.ok(relatedLessonsFor('機械学習の新しい手法',30).some(l=>l.day===2));
  assert.ok(relatedLessonsFor('量子化によるローカルAI',30).some(l=>l.day===26));
});
