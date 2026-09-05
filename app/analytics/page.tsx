"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { getValidSession, signIn, signOutLocal } from '../lib/personalSync';
import { SUPABASE_KEY, SUPABASE_URL, SOCIAL_DESK, SYNC_URL } from '../lib/insights-config';
import { CHANNELS, SITES, STATUS, EVENTS, today, shift, validDay, fmt, stamp, change, nullableNumber, csv, importFollowers, type Stats, type Snapshot } from './data';
import Chart from './Chart';
import './insights.css';

const TABS=['概要','フォロワー','動線','記録','接続・計測'];
function Table({heads,rows}:{heads:string[];rows:ReactNode[][]}) { return rows.length ? <div className="ix-table-wrap"><table><thead><tr>{heads.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c??'—'}</td>)}</tr>)}</tbody></table></div> : <p className="ix-empty">この期間に記録がありません。</p>; }
function download(name:string,rows:unknown[][]) { const url=URL.createObjectURL(new Blob([csv(rows)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
function message(e:unknown) { return e instanceof Error ? e.message : '処理に失敗しました。もう一度お試しください。'; }
async function ownerRequest(path:string,body?:unknown) {
 const s=await getValidSession();if(!s)throw new Error('ログインし直してください。');
 const r=await fetch(path.startsWith('https:')?path:SUPABASE_URL+'/rest/v1/'+path,{method:body===undefined?'GET':'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json',...(path===SYNC_URL?{}:{Prefer:'resolution=merge-duplicates,return=minimal'})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(60000)});
 if(!r.ok){const data=await r.json().catch(()=>({}));throw new Error(data.error || (r.status===401?'ログインし直してください。':r.status===403?'このアカウントでの操作が許可されていません。':'保存・取得に失敗しました。入力値と接続を確認してください。'));}
 const text=await r.text();return text?JSON.parse(text):null;
}
export default function AnalyticsPage() {
 const [ready,setReady]=useState(false),[authed,setAuthed]=useState(false),[data,setData]=useState<Stats|null>(null);
 const [start,setStart]=useState(()=>shift(today(),-29)),[end,setEnd]=useState(today),[site,setSite]=useState('official'),[tab,setTab]=useState(0);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 const [channel,setChannel]=useState('bluesky'),[excluded,setExcluded]=useState(false),[legacy,setLegacy]=useState(false),[imported,setImported]=useState<Snapshot[]>([]);
 const [link,setLink]=useState('');const sequence=useRef(0),popupCleanup=useRef<()=>void>(()=>{});
 useEffect(()=>{let active=true;getValidSession().then(s=>{if(active){setAuthed(!!s);setReady(true);}});try{setExcluded(localStorage.getItem('ws_analytics_exclude')==='1');setLegacy(!!localStorage.getItem('ws_insights_social_v1')&&!localStorage.getItem('ws_insights_social_migrated'));}catch{}return()=>{active=false;popupCleanup.current();};},[]);
 const load=useCallback(async()=>{
  const id=++sequence.current;setLoading(true);setError('');
  try{
   if(!validDay(start)||!validDay(end)||start>end||Date.parse(end)-Date.parse(start)>365*86400000)throw new Error('期間は過去366日以内の幅で、開始日から終了日の順に指定してください。');
   const s=await getValidSession();if(!s){setAuthed(false);setData(null);throw new Error('ログインしてください。');}
   const r=await fetch('/api/stats?'+new URLSearchParams({start,end,site}),{headers:{Authorization:'Bearer '+s.access_token},cache:'no-store',signal:AbortSignal.timeout(20000)});const next=await r.json();
   if(!r.ok){if(r.status===401){setAuthed(false);setData(null);}throw new Error(next.error||'集計を取得できません。');}
   if(id===sequence.current)setData(next);
  }catch(e){if(id===sequence.current)setError(message(e));}finally{if(id===sequence.current)setLoading(false);}
 },[start,end,site]);
 useEffect(()=>{if(!authed)return;setData(null);void load();const timer=setInterval(()=>{if(document.visibilityState==='visible')void load();},60000);return()=>{sequence.current++;clearInterval(timer);};},[authed,load]);
 async function run(action:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await action();}catch(e){setError(message(e));}finally{setBusy(false);}}
 async function login(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);await run(async()=>{await signIn(String(f.get('email')),String(f.get('password')));setAuthed(true);});}
 async function manual(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget);
  await run(async()=>{const day=String(f.get('day')),followers=nullableNumber(String(f.get('followers'))),reach=nullableNumber(String(f.get('reach'))),reactions=nullableNumber(String(f.get('reactions'))),period_start=String(f.get('period_start')||'')||null,period_end=String(f.get('period_end')||'')||null;
   if(!validDay(day))throw new Error('記録日を確認してください。');
   if(followers===null&&reach===null&&reactions===null)throw new Error('少なくとも1つの数値を入力してください。');
   if((reach!==null||reactions!==null)&&(!period_start||!period_end||!validDay(period_start)||!validDay(period_end)||period_start>period_end))throw new Error('リーチ・反応の集計期間を指定してください。');
   await ownerRequest('ws_social_snapshots?on_conflict=channel,day,source',[{channel:f.get('channel'),day,followers,reach,reactions,period_start,period_end,source:'manual',observed_at:new Date().toISOString(),note:String(f.get('note')||'')}]);await load();setNotice('記録を保存しました。同じSNS・日付の手入力記録は更新されます。');
  });
 }
 async function shop(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);await run(async()=>{const day=String(f.get('day')),visits=nullableNumber(String(f.get('visits'))),orders=nullableNumber(String(f.get('orders'))),revenue=nullableNumber(String(f.get('revenue')),false);if(!validDay(day)||[visits,orders,revenue].every(v=>v===null))throw new Error('記録日と少なくとも1つの数値を入力してください。');await ownerRequest('ws_shop_snapshots?on_conflict=day',[{day,visits,orders,revenue,note:String(f.get('note')||''),updated_at:new Date().toISOString()}]);await load();setNotice('BASEの実績を保存しました。');});}
 async function migrate(){
  await run(async()=>{let old;try{old=JSON.parse(localStorage.getItem('ws_insights_social_v1')||'null');}catch{throw new Error('以前の記録を読み込めませんでした。');}
   if(!old?.updatedAt||!Array.isArray(old.rows)||!Number.isFinite(Date.parse(old.updatedAt)))throw new Error('以前の記録に保存日時がありません。確認できる数値を手入力してください。');
   const day=new Date(Date.parse(old.updatedAt)+9*3600000).toISOString().slice(0,10);
   const rows=old.rows.filter((r:{channel:string;followers:number})=>CHANNELS.includes(r.channel.toLowerCase() as typeof CHANNELS[number])&&Number.isSafeInteger(r.followers)&&r.followers>0).map((r:{channel:string;followers:number;note?:string})=>({channel:r.channel.toLowerCase(),day,followers:r.followers,source:'legacy',observed_at:old.updatedAt,note:('旧端末記録から移行。'+(r.note||'')).slice(0,1000)}));
   if(!rows.length)throw new Error('移行できる確定値がありません。旧画面の初期値0は未取得と区別できないため手入力で確認してください。');
   await ownerRequest('ws_social_snapshots?on_conflict=channel,day,source',rows);localStorage.setItem('ws_insights_social_migrated','1');setLegacy(false);await load();setNotice('以前のフォロワー数を移行しました。元の端末記録は残しています。');
  });
 }
 async function connect(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,f=new FormData(form);await run(async()=>{await ownerRequest(SYNC_URL,{action:'connect',channel:f.get('channel'),token:f.get('token')});form.reset();await load();setNotice('接続とフォロワー数の取得を完了しました。');});}
 function connectDesk(){
  popupCleanup.current();setError('');setNotice('');
  const nonce=crypto.randomUUID(),popup=window.open(SOCIAL_DESK+'/insights-connect?nonce='+nonce,'ws-insights-connect','width=560,height=640');
  if(!popup){setError('Social Deskを開けません。ポップアップを許可してください。');return;}
  const receive=(e:MessageEvent)=>{
   if(e.origin!==SOCIAL_DESK||e.source!==popup||e.data?.type!=='ws-insights-credentials'||e.data.nonce!==nonce)return;
   cleanup();popup.close();void run(async()=>{
    const credentials=Array.isArray(e.data.credentials)?e.data.credentials:[];let count=0;const failures:string[]=[];
    for(const c of credentials){if(!['instagram','threads','pinterest'].includes(c.channel)||typeof c.token!=='string')continue;try{await ownerRequest(SYNC_URL,{action:'connect',channel:c.channel,token:c.token});count++;}catch(err){failures.push(c.channel+'：'+message(err));}}
    await load();if(count)setNotice(count+'件のSNSを接続しました。');if(failures.length)throw new Error(failures.join(' / '));if(!credentials.length)throw new Error('Social Deskに接続可能なSNSの認証情報がありません。');
   });
  };
  const timer=setTimeout(()=>{cleanup();setError('接続が時間切れになりました。Social Deskにログインしてからもう一度お試しください。');},180000);
  const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',receive);};popupCleanup.current=cleanup;window.addEventListener('message',receive);
 }
 function buildLink(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');try{const f=new FormData(e.currentTarget),u=new URL(String(f.get('url')));if(u.protocol!=='https:')throw new Error('httpsのURLを入力してください。');for(const k of ['source','medium','campaign','content']){const v=String(f.get(k)||'');if(v)u.searchParams.set('utm_'+k,v);else u.searchParams.delete('utm_'+k);}setLink(u.href);}catch(e){setError(message(e));}}
 const account=data?.social.find(a=>a.channel===channel);
 const history=data?.history.filter(s=>s.channel===channel&&s.followers!==null)||[];
 const baseline=data?.baseline.find(s=>s.channel===channel)||history[0];
 const last=history[history.length-1];
 const delta=last&&baseline&&last.day!==baseline.day?Number(last.followers)-Number(baseline.followers):null;
 const tracked=!!data?.coverage.some(c=>c.site===site||site==='all');
 return <main className="ix">
  <header className="ix-top"><a className="ix-brand" href="/analytics">WS STUDIO / INSIGHTS</a><nav className="ix-links"><a href="https://ws-studio-hub.wsstudio.chatgpt.site">HUB</a><a href="/">公式サイト</a>{authed&&<button onClick={()=>{sequence.current++;signOutLocal();setAuthed(false);setData(null);setNotice('');}}>ログアウト</button>}</nav></header>
  {error&&<div className="ix-alert" role="alert">{error}</div>}{notice&&<div className="ix-alert ix-success" role="status">{notice}</div>}
  {!ready?<p className="ix-empty">アカウントを確認しています…</p>:!authed?<section className="ix-login ix-panel"><h1>Insights</h1><p className="muted">Brief・AI30と共通のアカウントでログインしてください。</p><form onSubmit={login}><label>メールアドレス<input name="email" type="email" autoComplete="username" required/></label><label>パスワード<input name="password" type="password" autoComplete="current-password" required/></label><button className="primary" disabled={busy}>ログイン</button></form></section>:<>
   <h1>Insights</h1><p className="muted">訪問・動線・SNSの推移を、記録された実数で確認。</p>
   <div className="ix-toolbar"><label>対象<select value={site} onChange={e=>setSite(e.target.value)}>{Object.entries(SITES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>開始日<input aria-label="開始日" type="date" value={start} max={end} onChange={e=>setStart(e.target.value)}/></label><label>終了日<input aria-label="終了日" type="date" value={end} min={start} max={today()} onChange={e=>setEnd(e.target.value)}/></label>{[7,30,90].map(n=><button key={n} onClick={()=>{setStart(shift(today(),1-n));setEnd(today());}}>{n}日</button>)}<button disabled={loading} onClick={()=>void load()}>{loading?'更新中…':'再読み込み'}</button></div>
   <p className="muted">日本時間（JST）・{data?'最終更新 '+stamp(data.generated_at):'集計を読み込み中'}・1分ごとに更新</p>
   <div className="ix-tabs" role="tablist" aria-label="インサイトの表示">{TABS.map((t,i)=><button key={t} id={'ix-tab-'+i} role="tab" aria-controls="ix-content" aria-selected={tab===i} tabIndex={tab===i?0:-1} onClick={()=>setTab(i)} onKeyDown={e=>{let n=i;if(e.key==='ArrowRight')n=(i+1)%TABS.length;else if(e.key==='ArrowLeft')n=(i+TABS.length-1)%TABS.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=TABS.length-1;else return;e.preventDefault();setTab(n);document.getElementById('ix-tab-'+n)?.focus();}}>{t}</button>)}</div>
   {data&&<div id="ix-content" role="tabpanel" aria-labelledby={'ix-tab-'+tab}>
    {tab===0&&<>
     {!tracked&&<p className="ix-note">この場所はまだ訪問データを受信していません。計測の開始後から表示されます。</p>}
     <div className="ix-metrics">{[
      ['訪問者（ブラウザ）',tracked?fmt(data.summary.visitors):'—',change(data.summary.visitors,data.summary.previous_visitors)],
      ['ページ表示',tracked?fmt(data.summary.pageviews):'—',change(data.summary.pageviews,data.summary.previous_pageviews)],
      ['訪問回数（セッション）',data.summary.tracked_session_views?fmt(data.summary.sessions):'—','30分の無操作で新しい訪問'],
      ['クリック・アクション',tracked?fmt(data.summary.actions):'—','直近5分：'+fmt(data.summary.active_last_5m)+'ブラウザ']
     ].map(([title,value,sub])=><article className="ix-metric" key={title}><span className="muted">{title}</span><strong>{value}</strong><small>{sub}</small></article>)}</div>
     <section className="ix-panel"><h2>訪問者の推移</h2>{tracked?<Chart points={data.daily.map(d=>({day:d.day,value:d.visitors}))} start={start} end={end} label="日別の訪問者数"/>:<p className="ix-empty">計測開始待ち</p>}</section>
     {!!data.summary.legacy_views&&<p className="ix-note">旧計測のページ表示 {fmt(data.summary.legacy_views)}件を含みます。旧記録にはセッション情報がないため、訪問回数と一部の動線には含まれません。</p>}
     <div className="ix-grid"><section className="ix-panel"><h2>流入元</h2><Table heads={['流入元','訪問者','表示']} rows={data.sources.map(r=>[r.source,fmt(r.visitors),fmt(r.pageviews)])}/></section><section className="ix-panel"><h2>閲覧されたページ</h2><Table heads={['場所 / ページ','訪問者','表示']} rows={data.paths.map(r=>[SITES[r.site]+' '+r.path,fmt(r.visitors),fmt(r.views)])}/></section><section className="ix-panel"><h2>アクション</h2><Table heads={['操作','回数']} rows={data.actions.map(r=>[EVENTS[r.kind]||r.kind,fmt(r.count)])}/></section><section className="ix-panel"><h2>端末</h2><Table heads={['種別','表示']} rows={data.devices.map(r=>[({mobile:'スマートフォン',tablet:'タブレット',desktop:'PC',unknown:'旧計測・不明'} as Record<string,string>)[r.device]||r.device,fmt(r.views)])}/></section></div>
     <section className="ix-panel"><h2>BASEへの動線と実績</h2><p>BASEへのリンクを押した訪問：<strong>{fmt(data.summary.shop_sessions)}</strong> 回</p><p className="muted">クリックから、BASE内の訪問・注文は推定しません。下はBASE管理画面から記録した実績です。</p><Table heads={['日付','訪問','注文','売上（円）']} rows={data.shop.map(r=>[r.day,fmt(r.visits),fmt(r.orders),fmt(r.revenue)])}/></section>
    </>}
    {tab===1&&<>
     <p className="ix-note">各SNSの数値は終了日までの最新記録です。「—」は未取得。日々の記録が増えると推移が表示されます。未計測の日は補完しません。</p>
     <div className="ix-accounts">{data.social.map(a=><button className="ix-account" key={a.channel} aria-pressed={channel===a.channel} onClick={()=>setChannel(a.channel)}><h3>{a.label}</h3><small>@{a.handle}</small><strong>{fmt(a.latest?.followers)}</strong><small>{a.latest?a.latest.day+' / '+(a.latest.source==='api'?'自動取得':a.latest.source==='legacy'?'移行記録':'手入力'):'記録待ち'}</small><span className="ix-status">{STATUS[a.status]||a.status}</span></button>)}</div>
     <section className="ix-panel"><div className="ix-inline"><h2>{account?.label} の推移</h2>{account&&<a href={account.profile_url} target="_blank" rel="noreferrer">SNSを開く ↗</a>}</div><p>{delta===null?'比較できる記録がまだありません。':(delta>0?'+':'')+fmt(delta)+' フォロワー（'+baseline?.day+' → '+last?.day+'）'}</p><Chart points={history.map(p=>({day:p.day,value:p.followers}))} start={start} end={end} label={(account?.label||channel)+'のフォロワー推移'} gaps/><Table heads={['記録日','フォロワー','取得方法']} rows={history.slice().reverse().map(r=>[r.day,fmt(r.followers),r.source==='api'?'自動取得':r.source==='legacy'?'移行記録':'手入力'])}/></section>
    </>}
    {tab===2&&<>
     <section className="ix-panel"><h2>流入元 → 閲覧ページ → 外部リンク</h2><p className="muted">クリックしたページと、同じ訪問で記録した流入元を表示します。サイトをまたぐ個人の特定は行いません。</p><Table heads={['流入元','ページ','移動先','クリック']} rows={data.flows.map(r=>[r.source,r.path,r.destination,fmt(r.clicks)])}/></section>
     <section className="ix-panel"><h2>移動先</h2><Table heads={['リンク先','クリック','訪問回数']} rows={data.destinations.map(r=>[r.destination,fmt(r.clicks),r.kind==='outbound_click'?fmt(r.sessions):'旧計測：不明'])}/></section>
     <section className="ix-panel"><h2>投稿・キャンペーン別</h2><Table heads={['流入元 / 媒体','キャンペーン / 投稿','訪問','表示','外部クリック']} rows={data.campaigns.map(r=>[r.source+' / '+(r.medium||'—'),r.campaign+' / '+(r.content||'—'),fmt(r.sessions),fmt(r.pageviews),fmt(r.clicks)])}/></section>
     <section className="ix-panel"><h2>投稿用の計測リンク</h2><p className="muted">公式サイトや計測済みページへの投稿リンクに使えます。SNS名・企画名・投稿名を付けると、訪問を区別できます。</p><form className="ix-form" onSubmit={buildLink}><label className="ix-wide">リンク先<input name="url" type="url" defaultValue="https://ws-studio-wheat.vercel.app/" required/></label><label>SNS<select name="source">{CHANNELS.map(c=><option key={c}>{c}</option>)}</select></label><label>媒体<input name="medium" defaultValue="social" required/></label><label>企画・キャンペーン<input name="campaign" placeholder="album_release" required maxLength={200}/></label><label>投稿名<input name="content" placeholder="post_01" maxLength={200}/></label><button className="primary">リンクを作成</button></form>{link&&<><pre>{link}</pre><button onClick={()=>void run(async()=>{await navigator.clipboard.writeText(link);setNotice('リンクをコピーしました。');})}>コピー</button></>}</section>
    </>}
    {tab===3&&<>
     {legacy&&<section className="ix-panel"><h2>この端末に残る以前の記録</h2><p className="muted">保存日時と正のフォロワー数を共通データベースへ移行します。旧初期値の0、期間不明のリーチ・反応、BASEの数値は元の記録に残します。</p><button disabled={busy} onClick={()=>void migrate()}>以前の記録を移行</button></section>}
     <section className="ix-panel"><h2>SNSの実数を記録</h2><p className="muted">空欄は未取得、0は実測0。同じSNS・日付の手入力を保存すると更新されます。自動取得の履歴も残ります。</p><form className="ix-form" onSubmit={manual}><label>SNS<select name="channel">{data.social.map(a=><option key={a.channel} value={a.channel}>{a.label}</option>)}</select></label><label>記録日<input type="date" name="day" defaultValue={today()} max={today()} required/></label><label>フォロワー<input name="followers" type="number" min="0" step="1"/></label><label>リーチ<input name="reach" type="number" min="0" step="1"/></label><label>反応<input name="reactions" type="number" min="0" step="1"/></label><label>集計期間の開始<input type="date" name="period_start" max={today()}/></label><label>集計期間の終了<input type="date" name="period_end" max={today()}/></label><label className="ix-wide">メモ<textarea name="note" rows={2} maxLength={1000}/></label><button className="primary" disabled={busy}>保存</button></form></section>
     <section className="ix-panel"><h2>フォロワー履歴のCSV取込</h2><p className="muted">channel,day,followers,note の列で取り込めます。SNS名は x / instagram / threads / bluesky / pinterest / note / suno。同じSNS・日付が複数行ある場合は末尾の行を採用します。</p><div className="ix-inline"><button onClick={()=>download('followers-template.csv',[['channel','day','followers','note']])}>ひな形をダウンロード</button><label>CSV（最大1MB / 2,000行）<input type="file" accept=".csv,text/csv" disabled={busy} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setImported([]);setError('');try{if(f.size>1000000)throw new Error('CSVは1MB以内にしてください。');setImported(importFollowers(await f.text()));}catch(err){setError(message(err));}e.target.value='';}}/></label></div>{!!imported.length&&<><p>{imported.length}件を保存します。先頭5件：</p><Table heads={['SNS','日付','フォロワー']} rows={imported.slice(0,5).map(r=>[r.channel,r.day,fmt(r.followers)])}/><button className="primary" disabled={busy} onClick={()=>void run(async()=>{await ownerRequest('ws_social_snapshots?on_conflict=channel,day,source',imported.map(r=>({...r,observed_at:new Date().toISOString()})));setImported([]);await load();setNotice('CSVを保存しました。');})}>確認した内容を取り込む</button></>}</section>
     <section className="ix-panel"><h2>SNSの記録一覧</h2><button onClick={()=>download('ws-social-'+start+'-'+end+'.csv',[['channel','day','followers','reach','reactions','period_start','period_end','source','observed_at','note'],...data.records.map(r=>[r.channel,r.day,r.followers,r.reach,r.reactions,r.period_start,r.period_end,r.source,r.observed_at,r.note])])}>この期間のCSVを書き出す</button><Table heads={['日付 / SNS','フォロワー','リーチ / 反応','集計期間','取得方法']} rows={data.records.map(r=>[r.day+' / '+r.channel,fmt(r.followers),fmt(r.reach)+' / '+fmt(r.reactions),r.period_start?r.period_start+'〜'+r.period_end:'—',r.source])}/></section>
     <section className="ix-panel"><h2>BASEの実績を記録</h2><form className="ix-form" onSubmit={shop}><label>日付<input name="day" type="date" defaultValue={today()} max={today()} required/></label><label>訪問数<input name="visits" type="number" min="0" step="1"/></label><label>注文数<input name="orders" type="number" min="0" step="1"/></label><label>売上（円）<input name="revenue" type="number" min="0" step="0.01"/></label><label className="ix-wide">メモ<input name="note" maxLength={1000}/></label><button className="primary" disabled={busy}>BASE実績を保存</button></form></section>
    </>}
    {tab===4&&<>
     <section className="ix-panel"><h2>SNSの接続</h2><p>自動取得は毎日 06:10（日本時間）。最終実行：{stamp(data.sync?.started_at)} / {({succeeded:'成功',partial:'一部失敗',failed:'失敗',running:'実行中',interrupted:'中断'} as Record<string,string>)[data.sync?.status||'']||'未実行'}</p><div className="ix-inline"><button className="primary" disabled={busy} onClick={connectDesk}>Social Deskから接続</button><button disabled={busy} onClick={()=>void run(async()=>{const result=await ownerRequest(SYNC_URL,{});await load();if(result?.status==='failed'||result?.status==='partial')throw new Error('取得できないSNSがあります。下の接続状況を確認してください。');setNotice('フォロワーの取得を実行しました。');})}>今すぐ取得</button></div><p className="muted">Instagram・ThreadsはSocial Deskの接続を利用します。フォロワー閲覧権限が不足している場合は再認証が必要です。X・note・Sunoは手入力またはCSVで記録できます。</p><Table heads={['SNS','接続状況','最終試行','最終成功','詳細']} rows={data.social.map(a=>[a.label,STATUS[a.status]||a.status,stamp(a.last_attempt_at),stamp(a.last_success_at),a.last_error||'—'])}/></section>
     <details className="ix-panel"><summary>認証トークンで接続する</summary><p className="muted">SNSで発行した閲覧権限のあるトークンを入力します。トークンは暗号化して保存され、画面には再表示されません。</p><form className="ix-form" onSubmit={connect}><label>SNS<select name="channel"><option value="instagram">Instagram</option><option value="threads">Threads</option><option value="pinterest">Pinterest</option></select></label><label className="ix-wide">アクセストークン<input name="token" type="password" autoComplete="off" required/></label><button disabled={busy}>接続して確認</button></form></details>
     <section className="ix-panel"><h2>計測できている場所</h2><Table heads={['場所','最初の記録','最終受信','累計表示']} rows={Object.entries(SITES).filter(([k])=>k!=='all').map(([k,v])=>{const c=data.coverage.find(r=>r.site===k);return[v,stamp(c?.first_at),stamp(c?.last_at),fmt(c?.pageviews)];})}/><p className="muted">BASE管理画面への記録は「実績」です。BASE内の自動計測にはショップ側の計測タグ設置が必要です。</p></section>
     <section className="ix-panel"><h2>自分の操作を除外</h2><label className="ix-check"><input type="checkbox" checked={excluded} onChange={e=>{try{localStorage.setItem('ws_analytics_exclude',e.target.checked?'1':'0');setExcluded(e.target.checked);}catch{setError('このブラウザでは除外設定を保存できません。');}}}/>このブラウザの今後の訪問・操作を除外する</label><p className="muted">設定したサイト・ブラウザに適用されます。HUBや試聴ページ、別端末はそれぞれの保存領域を使います。過去の記録は変更されません。</p></section>
    </>}
   </div>}
   <footer className="ix-footer"><p className="muted">訪問者はサイトごとのブラウザ識別子で集計します。「すべて」では同じ人が複数サイト・端末で数えられる場合があります。SNSアプリ内の閲覧、追跡をブロックした訪問、計測開始前の未記録データは取得できません。流入元が送られない訪問は direct に含まれます。</p></footer>
  </>}
 </main>;
}
