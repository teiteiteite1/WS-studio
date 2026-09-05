export const CHANNELS = ['x','instagram','threads','bluesky','pinterest','note','suno'] as const;
export const SITES: Record<string,string> = {official:'公式サイト',workspace:'管理ページ',hub:'HUB',album:'試聴ページ',base:'BASE',social:'Social Desk',all:'すべて'};
export const STATUS: Record<string,string> = {ok:'自動取得中',manual:'手入力・CSV',needs_connection:'接続待ち',needs_permission:'権限の確認が必要',expired:'再接続が必要',error:'取得に失敗',disabled:'自動取得停止'};
export const EVENTS: Record<string,string> = {gallery_open:'作品を開く',music_play:'音楽再生',contact_sent:'お問い合わせ送信',shop_click:'ショップへのクリック（旧計測）',social_click:'SNSへのクリック（旧計測）',outbound_click:'外部リンク',internal_click:'サイト内リンク'};
export type Snapshot = {channel:string;day:string;followers:number|null;reach?:number|null;reactions?:number|null;period_start?:string|null;period_end?:string|null;source:string;observed_at?:string;note?:string};
export type Account = {channel:string;label:string;handle:string;profile_url:string;status:string;auto_enabled:boolean;last_attempt_at:string|null;last_success_at:string|null;last_error:string|null;latest:Snapshot|null};
export type Stats = {
 range:{start:string;end:string;site:string;timezone:string};
 summary:{visitors:number;pageviews:number;sessions:number;actions:number;previous_visitors:number;previous_pageviews:number;tracked_session_views:number;legacy_views:number;shop_sessions:number;active_last_5m:number};
 daily:{day:string;visitors:number;pageviews:number}[];
 sources:{source:string;visitors:number;pageviews:number;sessions:number}[];
 paths:{site:string;path:string;views:number;visitors:number}[];
 actions:{kind:string;count:number}[];
 destinations:{destination:string;kind:string;clicks:number;sessions:number}[];
 flows:{source:string;path:string;destination:string;clicks:number}[];
 campaigns:{source:string;medium:string|null;campaign:string;content:string|null;pageviews:number;sessions:number;clicks:number}[];
 devices:{device:string;views:number}[];
 social:Account[];history:Snapshot[];records:Snapshot[];baseline:Snapshot[];
 shop:{day:string;visits:number|null;orders:number|null;revenue:number|null;note:string}[];
 coverage:{site:string;first_at:string;last_at:string;pageviews:number}[];
 sync:{status:string;started_at:string;finished_at:string|null}|null;generated_at:string;
};
export function today() { return new Date(Date.now()+9*3600000).toISOString().slice(0,10); }
export function shift(day:string,n:number) { return new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10); }
export function validDay(day:string) { return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0,10)===day && day<=today(); }
export function fmt(value:number|null|undefined) { return value == null ? '—' : new Intl.NumberFormat('ja-JP').format(value); }
export function stamp(value:string|null|undefined) { return value ? new Date(value).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '未取得'; }
export function change(current:number,previous:number) { return previous === 0 ? current === 0 ? '前期間と同じ' : '前期間は0件' : '前期間比 '+((current-previous)/previous*100>=0?'+':'')+Math.round((current-previous)/previous*100)+'%'; }
export function nullableNumber(value:string,integer=true) { if (!value.trim()) return null; const n=Number(value.replace(/,/g,'')); if (!Number.isFinite(n) || n<0 || (integer && !Number.isSafeInteger(n))) throw new Error('数値は0以上'+(integer?'の整数':'')+'で入力してください。'); return n; }
export function csv(rows:unknown[][]) {
 return '\uFEFF'+rows.map(row=>row.map(v=>{ let s=v==null?'':String(v);if (/^[\s]*[=+\-@]|^[\t\r\n]/.test(s)) s="'"+s; return '"'+s.replace(/"/g,'""')+'"'; }).join(',')).join('\r\n');
}
export function parseCSV(text:string) {
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;}
 if(quoted)throw new Error('CSVの引用符が閉じていません。');row.push(field);if(row.some(Boolean))rows.push(row);return rows;
}
export function importFollowers(text:string):Snapshot[] {
 const [head,...body]=parseCSV(text);if(!head)throw new Error('CSVが空です。');
 const index=(key:string)=>head.findIndex(x=>x.trim().toLowerCase()===key);
 const c=index('channel'),d=index('day'),f=index('followers'),n=index('note');
 if(c<0||d<0||f<0)throw new Error('ヘッダーは channel,day,followers,note にしてください。');
 if(body.length>2000)throw new Error('一度に取り込めるのは2,000行までです。');
 const result=new Map<string,Snapshot>();
 body.forEach((r,i)=>{
   const channel=(r[c]||'').trim().toLowerCase(),day=(r[d]||'').trim(),followers=nullableNumber(r[f]||'');
   if(!CHANNELS.includes(channel as typeof CHANNELS[number])||!validDay(day)||followers==null)throw new Error((i+2)+'行目のSNS・日付・フォロワー数を確認してください。');
   result.set(channel+day,{channel,day,followers,source:'manual',note:(r[n]||'').slice(0,1000)});
 });if(!result.size)throw new Error('取り込める記録がありません。');return [...result.values()];
}
