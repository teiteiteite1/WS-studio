"use client";

import { useEffect, useMemo, useState } from "react";
import { COURSE } from "./courseData";

const STORAGE_KEY = "ws-ai30-progress-v1";

export default function LearnClient(){
  const [selected,setSelected]=useState(1);
  const [done,setDone]=useState<number[]>([]);
  const [showAnswer,setShowAnswer]=useState(false);

  useEffect(()=>{
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(raw)setDone(JSON.parse(raw));
    }catch{}
  },[]);

  const lesson=useMemo(()=>COURSE.find((x)=>x.day===selected)??COURSE[0],[selected]);
  const progress=Math.round((done.length/COURSE.length)*100);

  const toggleDone=()=>{
    setDone(current=>{
      const next=current.includes(selected)?current.filter(x=>x!==selected):[...current,selected].sort((a,b)=>a-b);
      localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
      return next;
    });
  };

  const move=(day:number)=>{
    setSelected(Math.min(30,Math.max(1,day)));
    setShowAnswer(false);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  return <main className="learn-shell">
    <header className="learn-header">
      <div><p className="learn-kicker">WS studio / AI FOUNDATIONS</p><h1>AI 30</h1><p>30日で、AIを「使う」から「仕組みが見える」へ。1日約10分。</p></div>
      <div className="learn-progress"><strong>{progress}%</strong><span>{done.length}/30 DONE</span><div><i style={{width:`${progress}%`}}/></div></div>
    </header>

    <div className="learn-layout">
      <aside className="learn-days" aria-label="30日コース">
        {COURSE.map(item=><button key={item.day} className={`${selected===item.day?"active":""} ${done.includes(item.day)?"done":""}`} onClick={()=>move(item.day)}><span>{String(item.day).padStart(2,"0")}</span><em>{item.title}</em>{done.includes(item.day)&&<b>✓</b>}</button>)}
      </aside>

      <article className="learn-lesson">
        <div className="learn-day-label">DAY {String(lesson.day).padStart(2,"0")} / ABOUT 10 MIN</div>
        <h2>{lesson.title}</h2>
        <p className="learn-intro">{lesson.lead}</p>

        <section className="learn-section learn-takeaways">
          <h3>今日わかること</h3>
          <ul>{lesson.takeaways.map(point=><li key={point}>{point}</li>)}</ul>
        </section>

        <div className="learn-reading">
          {lesson.sections.map(section=><section className="learn-reading-section" key={section.heading}>
            <h3>{section.heading}</h3>
            {section.paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}
          </section>)}
        </div>

        <section className="learn-example">
          <span>CONCRETE EXAMPLE</span>
          <h3>{lesson.example.title}</h3>
          <p>{lesson.example.body}</p>
        </section>

        <section className="learn-misconception">
          <span>よくある誤解</span>
          <div><b>×</b><p>{lesson.misconception.wrong}</p></div>
          <div><b>○</b><p>{lesson.misconception.right}</p></div>
        </section>

        <section className="learn-map">
          <span>30日コースの中では</span>
          <p>{lesson.day<=5?"AI → 機械学習 → 深層学習 → 生成AI":lesson.day<=12?"Token → Embedding → Transformer → LLM → 出力 → Hallucination":lesson.day<=20?"LLM → Prompt → Reasoning → Multimodal → API → Structured Output":lesson.day<=28?"Embedding → RAG → Agent → MCP → Memory → Fine-tuning → Evals → Safety":"技術理解 → モデル選択 → Tool接続 → 評価 → 自分専用AIシステム"}</p>
        </section>

        <section className="learn-quiz"><span>MINI QUIZ</span><h3>{lesson.quiz.q}</h3>{showAnswer?<p>{lesson.quiz.a}</p>:<button onClick={()=>setShowAnswer(true)}>答えを見る</button>}</section>

        <div className="learn-complete"><button className={done.includes(selected)?"completed":""} onClick={toggleDone}>{done.includes(selected)?"✓ 完了済み":"このDAYを完了"}</button></div>

        <nav className="learn-nav"><button disabled={selected===1} onClick={()=>move(selected-1)}>← DAY {String(Math.max(1,selected-1)).padStart(2,"0")}</button><button disabled={selected===30} onClick={()=>move(selected+1)}>DAY {String(Math.min(30,selected+1)).padStart(2,"0")} →</button></nav>
      </article>
    </div>
  </main>;
}
