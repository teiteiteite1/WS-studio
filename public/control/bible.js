const DEFAULT_BIBLE={
  version:1,
  updatedAt:'',
  profile:'21歳 / 153cm。高校卒業後に事務職へ就職するが退職し、現在はフリーター。かわいさはあるが生活は雑。自分を可哀想に見せすぎない。',
  appearance:'若い日本人女性。細身。少し疲れていて整えすぎない日常感。現代的で自然な服装。可愛いが、作り込みすぎない。',
  voice:'20代前半〜半ばの女性声。約235Hzの中高音。明るく少し息混じり。幼すぎず、近いマイク感。発音は明瞭だが、人間らしい揺れを残す。',
  personality:'だるそうで少し投げやり。社会生活は雑だが、妙なところで行動力がある。自虐はするが、悲劇の主人公にはならない。',
  speaking:'短く自然な口語。説明口調を避ける。感情を言葉で全部説明しない。真顔寄りの間と、たまに雑で勢いのある一言。',
  timeline:'高校卒業 → 事務職 → 退職 → フリーター。仕事、金欠、寝坊、酒など日常の小さな失敗が現在の主な物語。',
  home:'東京の安い地域。築約50年の1K、2階。白い敷布団、ちゃぶ台、水色のカーテン。ユニットバスの鏡、水色のコップ、黄色い歯ブラシ。',
  places:'自宅 / カワイ荘 / 如月駅 / 居酒屋「豚奴隷」 / コンビニ「ファミリーマーケット」 / 激安スーパー「竿出」 / コインランドリー / 公園 / 河川敷',
  likes:'好き：酒、タバコ、サーモン、モツ煮。苦手：パクチー、セロリ。',
  canon:'・求人誌を読む → 闇バイトっぽさに気づく → 布団へ戻る\n・夏、暑すぎて冷凍庫を開けたまま寝ようとする\n・タバコが切れる → 代用品を探す → 草に手を出しそうになる',
  visualRules:'生活感を残す。部屋をおしゃれにしすぎない。実在ブランドのロゴや商品名は動画生成Promptへ自動注入しない。文字・字幕・テロップ・BGMなし。',
  storyRules:'小さな欲望 → 雑な行動 → 一瞬の安心 → さらに詰む、の流れが似合う。ネットの体験談はコピーせず、あるあるだけ抽象化してオリジナル化する。',
  neverDo:'急に優等生になる / 長い教訓を語る / 必要以上に泣く / 不幸自慢だけで終わる / キャラ設定を台詞で説明する',
  openThreads:'今後決める：家族構成、友人関係、事務職を辞めた具体的な理由、よく行く店の店員、季節ごとの服装。'
};
const bibleFields=[
  ['profile','基本プロフィール','年齢・身長・現在地など'],
  ['appearance','見た目','生成時に守る外見'],
  ['voice','声','声質・音程・話す距離'],
  ['personality','性格','行動の判断基準'],
  ['speaking','話し方','語彙・テンポ・間'],
  ['timeline','経歴','変わらない過去'],
  ['home','自宅','部屋と生活道具'],
  ['places','場所','繰り返し登場する舞台'],
  ['likes','好き・苦手','食べ物や習慣'],
  ['canon','既出エピソード','公開済み・確定済みの出来事'],
  ['visualRules','映像ルール','画作りの固定事項'],
  ['storyRules','物語ルール','社不ちゃんらしい展開'],
  ['neverDo','やらないこと','キャラ崩壊を防ぐ'],
  ['openThreads','未確定・保留','あとで決める設定']
];

function ensureBible(){
  state.bible={...DEFAULT_BIBLE,...(state.bible||{})};
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
  $('bibleVersion').textContent=`CANON v${state.bible.version||1}`;
  $('bibleUpdated').textContent=state.bible.updatedAt?`最終更新 ${new Intl.DateTimeFormat('ja-JP',{dateStyle:'medium',timeStyle:'short'}).format(new Date(state.bible.updatedAt))}`:'初期設定';
}
function collectBible(){
  document.querySelectorAll('[data-bible]').forEach(el=>{state.bible[el.dataset.bible]=el.value.trim()});
}
function syncBibleCharacter(){
  const c=state.characters.find(x=>x.id==='shafuchan')||state.characters.find(x=>x.name==='社不ちゃん');
  if(!c)return;
  Object.assign(c,{appearance:state.bible.appearance,voice:state.bible.voice,personality:state.bible.personality,speaking:state.bible.speaking,world:state.bible.home,places:state.bible.places,likes:state.bible.likes,notes:[state.bible.profile,state.bible.timeline,state.bible.storyRules].filter(Boolean).join('\n')});
}
$('bibleSearch').oninput=renderBible;
$('saveBible').onclick=()=>{
  collectBible();
  state.bible.version=(Number(state.bible.version)||1)+1;
  state.bible.updatedAt=new Date().toISOString();
  syncBibleCharacter();
  saveState();
  renderBible();
  renderCharacters();
  renderCharacterSelects();
  setStatus($('bibleStatus'),'Bibleを保存。Scenario Labの社不ちゃん設定にも同期しました。','ok');
};
$('resetBible').onclick=()=>{
  if(!confirm('SHAFU Bibleを初期設定へ戻しますか？'))return;
  state.bible=structuredClone(DEFAULT_BIBLE);
  syncBibleCharacter();
  saveState();
  renderBible();
  setStatus($('bibleStatus'),'初期設定へ戻しました。','ok');
};
$('copyBible').onclick=async()=>{
  collectBible();
  const text=bibleFields.map(([key,title])=>`## ${title}\n${state.bible[key]||''}`).join('\n\n');
  await navigator.clipboard.writeText(text);
  setStatus($('bibleStatus'),'Bible全文をコピーしました。','ok');
};
$('exportBible').onclick=()=>{
  collectBible();
  const blob=new Blob([JSON.stringify({name:'社不ちゃん',...state.bible},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='shafu-bible.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  setStatus($('bibleStatus'),'JSONを書き出しました。','ok');
};
ensureBible();
renderBible();
