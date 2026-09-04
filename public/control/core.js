const STATE_KEY='ws_control_v3_state';
const SETTINGS_KEY='ws_control_v3_settings';
const KEY_LOCAL='ws_control_openai_key';
const KEY_SESSION='ws_control_openai_key_session';
const DB_NAME='ws_control_assets_v1';
const DB_STORE='images';
const seedCharacter={
  id:'shafuchan',name:'社不ちゃん',
  appearance:'young Japanese woman, 21 years old, about 153 cm tall, slim build, casual everyday appearance, slightly tired and unpolished but cute, natural modern Japanese styling',
  voice:'female voice, early to mid 20s, around 235 Hz, mid-high pitch, light stable head-mix, bright slightly airy tone, soft and cute without sounding childish, light breathiness, clear articulation, smooth slightly bouncy delivery, low vocal tension, intimate close-mic feel, natural human imperfection',
  personality:'だるそうで少し投げやり。社会生活は雑だが、妙なところで行動力がある。自虐はするが、自分を可哀想には見せすぎない。',
  speaking:'短く自然な口語。説明口調を避ける。ときどき雑で勢いのある言い方をする。',
  world:'高校卒業後に事務職を経験し退職。現在はフリーター。東京の安い地域の築年数が古い1Kで暮らす。白い敷布団、ちゃぶ台、水色のカーテンがある生活感の強い部屋。',
  places:'自宅、居酒屋「豚奴隷」、コンビニ「ファミリーマーケット」、激安スーパー「竿出」、公園、河川敷、コインランドリーなど。固有名はシナリオ上の設定用で、動画生成Promptでは必要な場面以外は自動挿入しない。',
  likes:'酒、タバコ、サーモン、モツ煮。苦手：パクチー、セロリ。',
  notes:'日常の小さな失敗、金欠、寝坊、仕事、酒などを乾いたテンポで扱いやすい。',refs:[]
};
const defaultState={characters:[seedCharacter],feedback:{prompts:[],scenarios:[]},lastParts:[],draftMeta:{title:'',researchNotes:'',hooks:[],sources:[]}};
const defaultSettings={tier:'standard',defaultVideoModel:'H3'};
let state=loadJSON(STATE_KEY,defaultState),settings=loadJSON(SETTINGS_KEY,defaultSettings);
let currentCharacterId=state.characters[0]?.id||'',builderSelectedRefs=[],researchMode='ai',splitCount=2,modalTarget='';
function loadJSON(key,fallback){try{return {...fallback,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{return structuredClone(fallback)}}
function saveState(){localStorage.setItem(STATE_KEY,JSON.stringify(state))}
function saveSettingsLocal(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const charCount=s=>Array.from(String(s||'')).length;
const uid=()=>crypto.randomUUID?crypto.randomUUID():'id_'+Date.now()+'_'+Math.random().toString(16).slice(2);
function activeCharacter(id){return state.characters.find(c=>c.id===id)||state.characters[0]}
function apiKey(){return sessionStorage.getItem(KEY_SESSION)||localStorage.getItem(KEY_LOCAL)||''}
function setStatus(el,msg,type=''){el.className='status'+(type?' '+type:'');el.innerHTML=msg}
function busy(btn,on,label){if(!btn)return;if(on){btn.dataset.old=btn.textContent;btn.disabled=true;btn.innerHTML='<span class="spinner"></span>'+label}else{btn.disabled=false;btn.textContent=btn.dataset.old||label}}
function navTo(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id===id));document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>navTo(b.dataset.view));
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function putImage(rec){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(rec);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)})}
async function getImage(id){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction(DB_STORE).objectStore(DB_STORE).get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function deleteImage(id){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(id);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)})}
async function imageUrl(id){const rec=await getImage(id);return rec?.blob?URL.createObjectURL(rec.blob):''}
async function ai(action,payload={}){const key=apiKey();if(!key)throw new Error('SettingsでOpenAI APIキーを設定してね。');let res;try{res=await fetch('/api/control/ai',{method:'POST',headers:{'Content-Type':'application/json','x-openai-key':key},body:JSON.stringify({action,payload:{...payload,tier:settings.tier||'standard'}})})}catch(e){throw new Error('CONTROLのAIサーバーへ接続できませんでした。ページを再読み込みしてもう一度試してください。')}const raw=await res.text();let data={};try{data=raw?JSON.parse(raw):{}}catch{throw new Error(`AIサーバーから不正な応答が返りました (HTTP ${res.status})`)}if(!res.ok)throw new Error(data.error||`API error ${res.status}`);return data}
function updateAIState(verified=false){const ok=!!apiKey();['aiStateLab','aiStateBuilder','aiStateSettings'].forEach(id=>{const e=$(id);if(!e)return;e.textContent=ok?(verified?'AI connected':'API key saved'):'API key 未設定';e.className='pill '+(ok?(verified?'online':'warn'):'warn')});$('apiKey').value=apiKey();$('rememberKey').checked=!!localStorage.getItem(KEY_LOCAL)}
function renderCharacterSelects(){const options=state.characters.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');['labChar','builderChar'].forEach(id=>{const el=$(id),prev=el.value;el.innerHTML=options;if(state.characters.some(c=>c.id===prev))el.value=prev});if(!$('labChar').value&&state.characters[0])$('labChar').value=state.characters[0].id;if(!$('builderChar').value&&state.characters[0])$('builderChar').value=state.characters[0].id}
function scenarioContext(c){return{name:c.name,personality:c.personality,speaking_style:c.speaking,world:c.world,recurring_places:c.places,likes_dislikes:c.likes,notes:c.notes,...(c.id==='shafuchan'&&state.bible?{canon_timeline:state.bible.timeline,canon_episodes:state.bible.canon,visual_rules:state.bible.visualRules,story_rules:state.bible.storyRules,never_do:state.bible.neverDo,open_threads:state.bible.openThreads}:{})}}
function likedScenarioExamples(){return state.feedback.scenarios.filter(x=>x.rating==='good').slice(-4).map(x=>x.draft)}
function rejectedScenarioExamples(){return state.feedback.scenarios.filter(x=>x.rating==='bad').slice(-3).map(x=>x.draft)}