const DEFAULT_BIBLE={
  version:2,
  updatedAt:'',
  premise:'東京の安い街で暮らす21歳のフリーター「社不ちゃん」の、生活の小さな失敗と雑な生存を描く日常コメディ。',
  timeline:'高校卒業 → 事務職 → 退職 → フリーター。現在の年齢は21歳。出来事を追加するときは、ここで前後関係を固定する。',
  relationships:'未確定。家族、友人、元同僚、近所の人、店員など、登場が確定した人物だけ追加する。',
  home:'東京の安い地域。築約50年の1K、2階。白い敷布団、ちゃぶ台、水色のカーテン。ユニットバスの鏡、水色のコップ、黄色い歯ブラシ。',
  places:'自宅 / カワイ荘 / 如月駅 / 居酒屋「豚奴隷」 / コンビニ「ファミリーマーケット」 / 激安スーパー「竿出」 / コインランドリー / 公園 / 河川敷',
  recurringProps:'白い敷布団 / ちゃぶ台 / 水色のカーテン / 水色のコップ / 黄色い歯ブラシ / タバコ / 酒。新しい定番小物が確定したら追加する。',
  canon:'01｜求人誌を読む → 闇バイトっぽさに気づく → 布団へ戻る
02｜夏、暑すぎて冷凍庫を開けたまま寝ようとする
03｜タバコが切れる → 雑草を巻いて吸う',
  continuity:'住居は1Kの2階。部屋の主要色と小物を勝手に変えない。公開済みエピソードと矛盾する過去・人間関係を新しく確定しない。',
  visualRules:'生活感を残し、部屋をおしゃれにしすぎない。実在ブランドのロゴや商品名は動画生成Promptへ自動注入しない。文字・字幕・テロップ・BGMなし。',
  storyRules:'小さな欲望 → 雑な行動 → 一瞬の安心 → さらに詰む、の流れが似合う。台詞で説明しすぎず、行動・間・カメラで見せる。',
  neverDo:'公開済み設定を無視する / 急に裕福になる / 長い教訓を語る / 不幸自慢だけで終わる / キャラクター設定を台詞で説明する',
  openThreads:'家族構成 / 友人関係 / 事務職を辞めた具体的な理由 / よく行く店の店員 / 季節ごとの服装。決まるまでは正史として扱わない。'
};
const bibleFields=[
  ['premise','シリーズの前提','作品全体が何を描くか'],
  ['timeline','正史タイムライン','確定した過去と出来事の順序'],
  ['relationships','人物関係','登場が確定した人物と関係'],
  ['home','自宅・生活環境','部屋と建物の固定設定'],
  ['places','舞台・場所','繰り返し登場する場所'],
  ['recurringProps','定番の小道具','画面に繰り返し出る物'],
  ['canon','公開済みエピソード','番号付きの正史ログ'],
  ['continuity','連続性ルール','前後で変えてはいけない事実'],
  ['visualRules','世界の映像ルール','背景・生活感・画面上の制約'],
  ['storyRules','物語ルール','社不ちゃん作品らしい展開'],
  ['neverDo','矛盾・禁止事項','世界観を壊す展開'],
  ['openThreads','未確定・保留','決まるまで正史にしない項目']
];

function ensureBible(){
  const existing=state.bible||{};
  state.bible={...DEFAULT_BIBLE,...existing};
  if(!state.bible.premise)state.bible.premise=DEFAULT_BIBLE.premise;
  if(!state.bible.relationships)state.bible.relationships=DEFAULT_BIBLE.relationships;
  if(!state.bible.recurringProps)state.bible.recurringProps=DEFAULT_BIBLE.recurringProps;
  if(!state.bible.continuity)state.bible.continuity=DEFAULT_BIBLE.continuity;
  state.bible.version=Math.max(2,Number(state.bible.version)||2);
  saveState();
}
function bibleValue(key){return String(state.bible?.[key]||'')}
function renderBible(){
  ensureBible();
  const query=($('bibleSearch')?.value||'').trim().toLowerCase();
  const visible=bibleFields.filter(([key,title,description])=>!query||[title,description,bibleValue(key)].join(' ').toLowerCase().includes(query));
  $('bibleGrid').innerHTML=visible.map(([key,title,description])=>`<article class="bible-card"><div class="head"><div><h2>${esc(title)}</h2><div class="small muted">${esc(description)}</div></div><span class="pill mono" data-bible-count="${esc(key)}">${charCount(bibleValue(key))}</span></div><textarea data-bible="${esc(key)}">${esc(bibleValue(key))}</textarea></article>`).join('')||'<div class="card muted">一致する設定がありません。</div>';
  $('bibleGrid').querySelectorAll('[data-bible]').forEach(el=>el.oninput=()=>{const counter=document.querySelector(`[data-bible-count="${el.dataset.bible}"]`);if(counter)counter.textContent=String(charCount(el.value));setStatus($('bibleStatus'),'未保存の変更があります。')});
  const filled=bibleFields.filter(([key])=>bibleValue(key).trim()).length;
  $('bibleProgress').textContent=`${filled} / ${bibleFields.length} sections`;
  $('bibleVersion').textContent=`CANON v${state.bible.version||2}`;
  $('bibleUpdated').textContent=state.bible.updatedAt?`最終更新 ${new Intl.DateTimeFormat('ja-JP',{dateStyle:'medium',timeStyle:'short'}).format(new Date(state.bible.updatedAt))}`:'初期設定';
}
function collectBible(){
  document.querySelectorAll('[data-bible]').forEach(el=>{state.bible[el.dataset.bible]=el.value.trim()});
}
$('bibleSearch').oninput=()=>{collectBible();renderBible()};
$('saveBible').onclick=()=>{
  collectBible();
  state.bible.version=(Number(state.bible.version)||2)+1;
  state.bible.updatedAt=new Date().toISOString();
  saveState();
  renderBible();
  setStatus($('bibleStatus'),'正史・世界設定を保存しました。Scenario Labは次の生成から参照します。','ok');
};
$('resetBible').onclick=()=>{
  if(!confirm('SHAFU Bibleを初期設定へ戻しますか？ Charactersの設定は変わりません。'))return;
  state.bible=structuredClone(DEFAULT_BIBLE);
  saveState();
  renderBible();
  setStatus($('bibleStatus'),'Bibleだけ初期設定へ戻しました。','ok');
};
$('copyBible').onclick=async()=>{
  collectBible();
  const text=bibleFields.map(([key,title])=>`## ${title}\n${state.bible[key]||''}`).join('\n\n');
  await navigator.clipboard.writeText(text);
  setStatus($('bibleStatus'),'Bible全文をコピーしました。','ok');
};
$('exportBible').onclick=()=>{
  collectBible();
  const data={title:'SHAFU Bible',character:'社不ちゃん',...Object.fromEntries(bibleFields.map(([key])=>[key,state.bible[key]||''])),version:state.bible.version,updatedAt:state.bible.updatedAt};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='shafu-bible.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  setStatus($('bibleStatus'),'JSONを書き出しました。','ok');
};
ensureBible();
renderBible();
