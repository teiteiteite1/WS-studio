"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COURSE } from "./courseData";
import { LESSON_GUIDES } from "./lessonGuide";

const STORAGE_KEY = "ws-ai30-progress-v1";
const LAST_DAY_KEY = "ws-ai30-last-day-v1";
const SCROLL_PREFIX = "ws-ai30-scroll-v1:";
const LESSONS = [...COURSE].sort((a, b) => a.day - b.day);

const PHASES = [
  { from: 1, to: 5, label: "01 / AIの土台" },
  { from: 6, to: 14, label: "02 / LLMを理解する" },
  { from: 15, to: 18, label: "03 / 生成メディア" },
  { from: 19, to: 27, label: "04 / AIをシステムにする" },
  { from: 28, to: 30, label: "05 / 社会と現在地" },
];

function validDay(value: string | null) {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 30 ? day : null;
}

function readDone() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(Number).filter((day) => day >= 1 && day <= 30) : [];
  } catch {
    return [];
  }
}

function restoreScroll(day: number, behavior: ScrollBehavior = "auto") {
  const saved = Number(sessionStorage.getItem(`${SCROLL_PREFIX}${day}`) || "0");
  window.requestAnimationFrame(() => window.scrollTo({ top: Number.isFinite(saved) ? saved : 0, behavior }));
}

export default function LearnClient() {
  const [selected, setSelected] = useState(1);
  const [done, setDone] = useState<number[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const selectedRef = useRef(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = validDay(params.get("day")) ?? validDay(localStorage.getItem(LAST_DAY_KEY)) ?? 1;
    selectedRef.current = initial;
    const hydrateTimer = window.setTimeout(() => {
      setSelected(initial);
      setDone(readDone());
      setReady(true);
      restoreScroll(initial);
    }, 0);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setDone(readDone());
    };
    const onPopState = () => {
      const next = validDay(new URLSearchParams(window.location.search).get("day"));
      if (!next) return;
      selectedRef.current = next;
      setSelected(next);
      setShowAnswer(false);
      restoreScroll(next);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.clearTimeout(hydrateTimer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    const savePosition = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => sessionStorage.setItem(`${SCROLL_PREFIX}${selectedRef.current}`, String(Math.round(window.scrollY))));
    };
    window.addEventListener("scroll", savePosition, { passive: true });
    return () => {
      window.removeEventListener("scroll", savePosition);
      window.cancelAnimationFrame(frame);
    };
  }, [ready]);

  const lesson = useMemo(() => LESSONS.find((item) => item.day === selected) ?? LESSONS[0], [selected]);
  const guide = LESSON_GUIDES[lesson.day];
  const progress = Math.round((done.length / LESSONS.length) * 100);
  const phase = PHASES.find((item) => selected >= item.from && selected <= item.to) ?? PHASES[0];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredLessons = useMemo(() => {
    if (!normalizedQuery) return LESSONS;
    return LESSONS.filter((item) => {
      const itemGuide = LESSON_GUIDES[item.day];
      const searchable = [
        item.title,
        item.lead,
        ...item.takeaways,
        ...itemGuide.keyWords.flatMap((keyword) => [keyword.term, keyword.meaning]),
        ...itemGuide.newsTerms,
      ].join(" ").toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  const move = (day: number) => {
    const next = Math.min(30, Math.max(1, day));
    sessionStorage.setItem(`${SCROLL_PREFIX}${selectedRef.current}`, String(Math.round(window.scrollY)));
    selectedRef.current = next;
    setSelected(next);
    setShowAnswer(false);
    localStorage.setItem(LAST_DAY_KEY, String(next));
    const url = new URL(window.location.href);
    url.searchParams.set("day", String(next));
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    restoreScroll(next, "smooth");
  };

  const toggleDone = () => {
    setDone((current) => {
      const next = current.includes(selected)
        ? current.filter((day) => day !== selected)
        : [...current, selected].sort((a, b) => a - b);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <main className="learn-shell">
      <header className="learn-header">
        <div>
          <p className="learn-kicker">WS studio / AI FOUNDATIONS</p>
          <h1>AI 30</h1>
          <p>Briefを理解し、自分の言葉で説明するための30日。1日約10分。</p>
        </div>
        <div className="learn-progress" aria-label={`進捗 ${progress}%`}>
          <strong>{progress}%</strong>
          <span>{done.length}/30 DONE</span>
          <div><i style={{ width: `${progress}%` }} /></div>
        </div>
      </header>

      <div className="learn-role-note">
        <b>AI30</b><span>基礎を積み上げる</span><i>→</i><b>Brief</b><span>今日の出来事へ接続する</span>
      </div>

      <div className="learn-layout">
        <aside className={`learn-days ${normalizedQuery ? "is-searching" : ""}`} aria-label="30日コース">
          <label className="learn-search">
            <span>用語・テーマを探す</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例：RAG / 著作権 / 動画" type="search" />
          </label>
          {filteredLessons.length ? filteredLessons.map((item) => (
            <button
              key={item.day}
              className={`${selected === item.day ? "active" : ""} ${done.includes(item.day) ? "done" : ""}`}
              onClick={() => move(item.day)}
              aria-current={selected === item.day ? "step" : undefined}
            >
              <span>{String(item.day).padStart(2, "0")}</span>
              <em>{item.title}</em>
              {done.includes(item.day) && <b>✓</b>}
            </button>
          )) : <p className="learn-no-result">該当するDAYがありません。</p>}
        </aside>

        <article className="learn-lesson">
          <div className="learn-day-label">DAY {String(lesson.day).padStart(2, "0")} / {phase.label} / ABOUT 10 MIN</div>
          <h2>{lesson.title}</h2>
          <p className="learn-intro">{lesson.lead}</p>

          {guide.prerequisites.length > 0 && (
            <nav className="learn-prerequisites" aria-label="前提となるDAY">
              <span>BEFORE TODAY</span>
              <div>{guide.prerequisites.map((day) => <button key={day} onClick={() => move(day)}>DAY {String(day).padStart(2, "0")}</button>)}</div>
            </nav>
          )}

          <section className="learn-idea">
            <span>TODAY&apos;S IDEA</span>
            <p>{guide.todaysIdea}</p>
          </section>

          <section className="learn-block">
            <span>WHAT IS IT?</span>
            <h3>{lesson.sections[0]?.heading}</h3>
            {lesson.sections[0]?.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </section>

          <section className="learn-block">
            <span>WHY DOES IT EXIST?</span>
            <p className="learn-block-lead">{guide.whyExists}</p>
          </section>

          <section className="learn-block">
            <span>HOW IS IT USED?</span>
            <p className="learn-block-lead">{guide.howUsed}</p>
            {lesson.sections.slice(1, -1).map((section) => <div className="learn-block-subsection" key={section.heading}><h3>{section.heading}</h3>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>)}
          </section>

          <section className="learn-example">
            <span>REAL EXAMPLES</span>
            <ul>{guide.realExamples.map((example) => <li key={example}>{example}</li>)}</ul>
            <h3>{lesson.example.title}</h3>
            <p>{lesson.example.body}</p>
          </section>

          <section className="learn-care">
            <span>WHY SHOULD I CARE?</span>
            <p>{guide.whyCare}</p>
            <ul>{lesson.takeaways.map((point) => <li key={point}>{point}</li>)}</ul>
          </section>

          {lesson.sections.length > 3 && (
            <details className="learn-deeper">
              <summary><span>ONE STEP DEEPER</span><b>もう一段だけ深く読む</b><i>＋</i></summary>
              <div>{lesson.sections.slice(-1).map((section) => <section key={section.heading}><h3>{section.heading}</h3>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>)}</div>
            </details>
          )}

          <section className="learn-misconception">
            <span>よくある誤解</span>
            <div><b>×</b><p>{lesson.misconception.wrong}</p></div>
            <div><b>○</b><p>{lesson.misconception.right}</p></div>
          </section>

          <section className="learn-keywords">
            <span>KEY WORDS</span>
            <dl>{guide.keyWords.map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.meaning}</dd></div>)}</dl>
          </section>

          <section className="learn-quiz">
            <span>CAN YOU EXPLAIN IT?</span>
            <h3>{lesson.quiz.q}</h3>
            {showAnswer ? <p>{lesson.quiz.a}</p> : <button onClick={() => setShowAnswer(true)}>確認ポイントを見る</button>}
            <div className="learn-speaking-prompt"><b>30秒で話すなら</b><p>{guide.explainPrompt}</p></div>
          </section>

          <section className="learn-own-words">
            <span>IN YOUR OWN WORDS</span>
            <h3>丸暗記せず、この骨組みで話す</h3>
            <ol>{guide.ownWords.map((point) => <li key={point}>{point}</li>)}</ol>
          </section>

          <section className="learn-news-bridge">
            <div><span>BRIEF × AI30</span><h3>この概念が出てくる今日のニュースを見る</h3><p>{guide.newsTerms.slice(0, 4).join(" / ")}</p></div>
            <a href={`/brief?lesson=${lesson.day}`}>Briefへ移動 →</a>
          </section>

          {!!guide.references?.length && (
            <section className="learn-references">
              <span>CHECK THE SOURCE</span>
              {guide.references.map((reference) => <a key={reference.url} href={reference.url} target="_blank" rel="noreferrer"><b>{reference.label} ↗</b><small>{reference.note}</small></a>)}
            </section>
          )}

          <div className="learn-complete"><button className={done.includes(selected) ? "completed" : ""} onClick={toggleDone}>{done.includes(selected) ? "✓ 完了済み" : "このDAYを完了"}</button></div>

          <nav className="learn-nav">
            <button disabled={selected === 1} onClick={() => move(selected - 1)}>← DAY {String(Math.max(1, selected - 1)).padStart(2, "0")}</button>
            <button disabled={selected === 30} onClick={() => move(selected + 1)}>DAY {String(Math.min(30, selected + 1)).padStart(2, "0")} →</button>
          </nav>
        </article>
      </div>
    </main>
  );
}
