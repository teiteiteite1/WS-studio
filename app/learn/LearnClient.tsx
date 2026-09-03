"use client";

import { useEffect, useMemo, useState } from "react";

type Lesson = {
  day: number;
  title: string;
  intro: string;
  points: string[];
  quiz: { q: string; a: string };
};

const LESSONS: Lesson[] = [
  {day:1,title:"AIとは何か",intro:"AIは『人間っぽく考える機械』というより、目的に合わせて入力から出力を作る仕組みの総称です。",points:["AIは単一の技術名ではない","分類・予測・生成など目的が違う","生成AIはAI全体の一部"],quiz:{q:"生成AIはAIそのもの全部を指す？",a:"いいえ。生成AIはAIの一分野です。"}},
  {day:2,title:"機械学習とディープラーニング",intro:"機械学習はデータから規則を学ぶ方法。ディープラーニングは多層ニューラルネットワークを使う機械学習です。",points:["AI > 機械学習 > 深層学習という関係","人がルールを全部書かず、データから調整する","画像・音声・言語で特に強い"],quiz:{q:"ディープラーニングは機械学習の外側？",a:"いいえ。機械学習の一種です。"}},
  {day:3,title:"ニューラルネットワーク",intro:"大量の数値計算を層状につないだモデルです。各接続の重みを調整して、入力から望ましい出力へ近づけます。",points:["ニューロンは生物の神経を厳密再現したものではない","重要なのは重みと活性化","層を深くすると複雑な特徴を学べる"],quiz:{q:"学習で主に変わるものは？",a:"ネットワーク内部の重みです。"}},
  {day:4,title:"学習とは何をしているのか",intro:"予測と正解のズレを数値化し、そのズレが小さくなる方向へパラメータを少しずつ更新します。",points:["損失関数がズレを測る","勾配降下法で改善方向を探す","学習と推論は別フェーズ"],quiz:{q:"学習済みモデルに質問する行為は何と呼ぶ？",a:"推論です。"}},
  {day:5,title:"生成AI",intro:"既存データを分類するだけでなく、文章・画像・音声・動画など新しい出力を生成するAIです。",points:["文章だけが生成AIではない","生成は確率的","もっともらしさと事実性は別"],quiz:{q:"生成AIの出力が自然なら必ず事実？",a:"いいえ。自然さと正しさは別です。"}},
  {day:6,title:"LLMとは",intro:"Large Language Model。大量の文章から言語パターンを学び、次に来るtokenを予測し続けて文章を作ります。",points:["知識DBそのものではない","基本動作は次token予測","規模・データ・学習法で性能が変わる"],quiz:{q:"LLMの基本動作は？",a:"次に来るtokenの確率予測です。"}},
  {day:7,title:"Transformer",intro:"現在のLLMの土台。文章中のどの部分をどれだけ参照すべきかをAttentionで計算します。",points:["Attentionが文脈関係を見る","並列計算しやすい","LLM以外にも使われる"],quiz:{q:"Transformerの代表的な仕組みは？",a:"Attentionです。"}},
  {day:8,title:"Token",intro:"AIが文章を扱うときの分割単位。単語そのものとは限らず、文字や語の一部になることもあります。",points:["入力料金はtoken数に関係する","日本語も独自の分割になる","長文ほどcontextを消費する"],quiz:{q:"1 token = 1単語で固定？",a:"いいえ。言語や分割方式で変わります。"}},
  {day:9,title:"Context Window",intro:"モデルが1回の推論で参照できる情報量です。会話履歴、指示、添付情報などがこの枠に入ります。",points:["無限ではない","長ければ必ず賢いわけではない","重要情報の配置も効く"],quiz:{q:"contextが長いほど常に正確？",a:"いいえ。量と利用効率は別です。"}},
  {day:10,title:"Embedding",intro:"文章や画像の意味を数値ベクトルへ変換する技術です。意味が近いものほどベクトル空間でも近くなります。",points:["検索・推薦で重要","RAGの基礎","生成モデル本体とは役割が違う"],quiz:{q:"Embeddingの代表用途は？",a:"意味検索やRAGです。"}},
  {day:11,title:"LLMはどう文章を作るか",intro:"入力をtoken化し、埋め込み、Transformerで文脈を処理し、次tokenの確率分布から出力を選びます。",points:["一文を最初から完成形で作らない","tokenごとに逐次生成","temperatureなどで出力傾向が変わる"],quiz:{q:"文章は一気に完成する？",a:"基本はtokenを順に生成します。"}},
  {day:12,title:"Hallucination",intro:"モデルがもっともらしい誤情報を作る現象。知識不足だけでなく、曖昧な入力や推論ミスでも起こります。",points:["検索接続してもゼロにはならない","出典確認が重要","医療・法律など高リスク領域では特に注意"],quiz:{q:"検索付きAIならhallucinationはゼロ？",a:"いいえ。減らせてもゼロにはできません。"}},
  {day:13,title:"Prompt Engineering",intro:"モデルに目的・制約・形式・前提を明確に伝え、望ましい出力へ寄せる設計です。",points:["役割より目的と評価基準が重要","例示は強力","長いだけのpromptは良いpromptではない"],quiz:{q:"良いpromptは必ず長い？",a:"いいえ。必要情報が明確であることが大事です。"}},
  {day:14,title:"Reasoningモデル",intro:"複数段階の問題解決を得意とするモデル群。数学、コード、計画、複雑な判断などで力を発揮します。",points:["単純タスクでは過剰なこともある","速度とコストのトレードオフ","推論力と事実知識は同義ではない"],quiz:{q:"reasoningが強いと最新情報も自動で知っている？",a:"いいえ。推論力と情報鮮度は別です。"}},
  {day:15,title:"Multimodal AI",intro:"テキストだけでなく画像、音声、動画など複数形式を扱えるAIです。",points:["入力と出力の両方がmultimodal化","視覚理解と画像生成は別能力","実世界タスクへの接続が進む"],quiz:{q:"画像を理解できるAIは必ず画像生成も得意？",a:"いいえ。別能力です。"}},
  {day:16,title:"画像生成AI",intro:"テキストや画像条件から新しい画像を生成します。Diffusion系やautoregressive系など複数方式があります。",points:["prompt以外に参照画像・構図制御も重要","学習データの影響を受ける","一貫性制御が大きなテーマ"],quiz:{q:"画像生成はpromptだけで全て決まる？",a:"いいえ。参照画像やモデル特性なども大きく影響します。"}},
  {day:17,title:"動画生成AI",intro:"時間方向の一貫性を保ちながらフレーム列を生成します。カメラ、動き、物理、音声同期が重要課題です。",points:["静止画生成より制約が多い","時間的一貫性が難しい","生成から編集・演出へ進化中"],quiz:{q:"動画AIで静止画より増える重要要素は？",a:"時間方向の一貫性です。"}},
  {day:18,title:"音声・音楽生成AI",intro:"音声合成、声質変換、効果音、作曲などを生成するAI。時間構造とスタイル制御が重要です。",points:["TTSと音楽生成は別系統","声の権利・同意も重要","長尺一貫性が課題"],quiz:{q:"TTSは何の略？",a:"Text-to-Speechです。"}},
  {day:19,title:"APIとは",intro:"アプリ同士が決められた形式で機能を呼び出す窓口です。AIサービスを自作アプリへ組み込むときの基本になります。",points:["Chat画面とAPI利用は別料金のことが多い","requestとresponseで通信する","API keyは秘密情報"],quiz:{q:"API keyをフロント側へ直接埋め込んでよい？",a:"基本NGです。サーバー側で保護します。"}},
  {day:20,title:"Structured Output / Tool Calling",intro:"自然文だけでなく決まったJSON形式で返したり、外部機能を呼び出させたりする仕組みです。",points:["アプリ化で非常に重要","自由文より機械処理しやすい","tool実行結果を再びAIへ渡せる"],quiz:{q:"AIを業務システムへ組み込みやすくする出力は？",a:"Structured Outputです。"}},
  {day:21,title:"RAG",intro:"検索した外部情報をLLMへ渡して回答させる仕組み。Retrieval-Augmented Generationの略です。",points:["モデル再学習なしで資料を参照できる","検索品質が回答品質を左右する","最新情報や社内文書に向く"],quiz:{q:"RAGではモデルを必ず再学習する？",a:"いいえ。外部情報を検索してcontextへ入れます。"}},
  {day:22,title:"AI Agent",intro:"AIが目標に向けて複数ステップを計画し、ツールを使い、結果を確認しながら進める仕組みです。",points:["単発回答より行動ループが中心","ツール権限設計が重要","完全自律より監督付きが実用的な場面も多い"],quiz:{q:"Agentと通常chatの大きな違いは？",a:"複数ステップでツールを使い行動できることです。"}},
  {day:23,title:"MCPと外部ツール接続",intro:"MCPはAIと外部データ・ツールを共通方式で接続するためのプロトコルです。",points:["接続方式を標準化する","権限と認証が重要","Agentの道具箱を広げる"],quiz:{q:"MCPの主目的は？",a:"AIと外部ツール・データの接続を標準化することです。"}},
  {day:24,title:"Memory",intro:"会話やユーザー設定などを将来の応答に活用する仕組み。contextとは似ていますが永続性が違います。",points:["短期contextと長期memoryは別","保存範囲の設計が重要","個人情報への配慮が必要"],quiz:{q:"Memoryとcontextは完全に同じ？",a:"いいえ。特に永続性が違います。"}},
  {day:25,title:"Fine-tuning",intro:"既存モデルを追加データで調整し、特定の形式やタスクへ適応させる方法です。",points:["最新知識追加ならRAGの方が向くことも多い","出力スタイル・分類などで有効","データ品質が重要"],quiz:{q:"最新社内文書を覚えさせる目的なら必ずfine-tuningが最適？",a:"いいえ。RAGが向くことも多いです。"}},
  {day:26,title:"Local LLM / Open Weight",intro:"自分のPCやサーバーで動かせるモデル群。データ管理やカスタマイズに強みがあります。",points:["open sourceとopen weightは同義とは限らない","GPU・メモリ制約がある","クラウドAPIとの使い分けが重要"],quiz:{q:"Open Weightなら必ず完全なOpen Source？",a:"いいえ。ライセンスや公開範囲は別です。"}},
  {day:27,title:"Evals",intro:"AIの良し悪しを感覚ではなくテストセットや指標で評価する仕組みです。",points:["モデル選定に必須","自分の実タスクで測るのが重要","精度だけでなく速度・コスト・安全性も見る"],quiz:{q:"公開benchmarkだけで自分の用途の最適モデルを決めてよい？",a:"十分ではありません。実タスクでevalするのが重要です。"}},
  {day:28,title:"安全性・著作権・セキュリティ",intro:"AIは便利さと同時に、情報漏洩、誤情報、権利侵害、prompt injectionなど新しいリスクも生みます。",points:["秘密情報をどこへ送るか確認する","出力の権利関係を確認する","Agentは権限を最小化する"],quiz:{q:"Agentへ強い権限を最初から全部渡すべき？",a:"いいえ。最小権限が基本です。"}},
  {day:29,title:"2026年のAI潮流",intro:"単体chatから、reasoning・multimodal・agent・生成メディア・個人化・業務統合へ重心が移っています。",points:["モデル性能だけでなく実行能力が競争軸","動画・音声を含むmultimodal化","AIを使うアプリ設計が重要"],quiz:{q:"現在のAI競争はモデル単体性能だけ？",a:"いいえ。ツール利用、Agent、統合体験も重要です。"}},
  {day:30,title:"自分専用AIシステムを設計する",intro:"最後は『どのモデルが最強か』ではなく、目的・データ・ツール・評価・コストを組み合わせて自分の仕組みを設計します。",points:["目的を先に定義する","小さいモデルと大きいモデルを使い分ける","自動化はevalと監視をセットにする"],quiz:{q:"AIシステム設計で最初に決めるものは？",a:"達成したい目的です。"}},
];

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

  const lesson=useMemo(()=>LESSONS.find((x)=>x.day===selected)??LESSONS[0],[selected]);
  const progress=Math.round((done.length/LESSONS.length)*100);

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
      <div><p className="learn-kicker">WS studio / AI FOUNDATIONS</p><h1>AI 30</h1><p>30日で、AIの基本から今の潮流まで一本につなげる。</p></div>
      <div className="learn-progress"><strong>{progress}%</strong><span>{done.length}/30 DONE</span><div><i style={{width:`${progress}%`}}/></div></div>
    </header>

    <div className="learn-layout">
      <aside className="learn-days" aria-label="30日コース">
        {LESSONS.map(item=><button key={item.day} className={`${selected===item.day?"active":""} ${done.includes(item.day)?"done":""}`} onClick={()=>move(item.day)}><span>{String(item.day).padStart(2,"0")}</span><em>{item.title}</em>{done.includes(item.day)&&<b>✓</b>}</button>)}
      </aside>

      <article className="learn-lesson">
        <div className="learn-day-label">DAY {String(lesson.day).padStart(2,"0")}</div>
        <h2>{lesson.title}</h2>
        <p className="learn-intro">{lesson.intro}</p>

        <section className="learn-section"><h3>KEY POINTS</h3><ul>{lesson.points.map(point=><li key={point}>{point}</li>)}</ul></section>

        <section className="learn-map">
          <span>つながり方</span>
          <p>{lesson.day<=5?"AI → 機械学習 → 深層学習 → 生成AI":lesson.day<=12?"Token → Embedding → Transformer → LLM → 出力":lesson.day<=20?"LLM → Prompt → Multimodal → API → Structured Output":lesson.day<=28?"Embedding → RAG → Agent → MCP → Memory → Evals":"技術理解 → 適切なモデル選択 → ツール接続 → 評価 → 自分専用AI"}</p>
        </section>

        <section className="learn-quiz"><span>MINI QUIZ</span><h3>{lesson.quiz.q}</h3>{showAnswer?<p>{lesson.quiz.a}</p>:<button onClick={()=>setShowAnswer(true)}>答えを見る</button>}</section>

        <div className="learn-complete"><button className={done.includes(selected)?"completed":""} onClick={toggleDone}>{done.includes(selected)?"✓ 完了済み":"このDAYを完了"}</button></div>

        <nav className="learn-nav"><button disabled={selected===1} onClick={()=>move(selected-1)}>← DAY {String(Math.max(1,selected-1)).padStart(2,"0")}</button><button disabled={selected===30} onClick={()=>move(selected+1)}>DAY {String(Math.min(30,selected+1)).padStart(2,"0")} →</button></nav>
      </article>
    </div>
  </main>;
}
