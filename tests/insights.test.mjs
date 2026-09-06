import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
async function module(source){const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));}
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const d=await module(read('app/analytics/data.ts')),t=await module(read('app/lib/telemetry.ts'));
test('missing metrics remain distinct from measured zero',()=>{assert.equal(d.fmt(null),'—');assert.equal(d.fmt(0),'0');assert.equal(d.nullableNumber(''),null);assert.equal(d.nullableNumber('0'),0);assert.throws(()=>d.nullableNumber('-1'));assert.match(d.change(5,0),/前期間は0/);});
test('CSV preserves quotes and line breaks and blocks spreadsheet formula execution',()=>{const input=d.csv([['channel','day','followers','note'],['x','2026-09-01',0,'a,"b"\nc'],['note','2026-09-01',2,'=1+1']]);const rows=d.parseCSV(input);assert.equal(rows[1][3],'a,"b"\nc');assert.equal(rows[2][3],"'=1+1");assert.equal(d.parseCSV(d.csv([["  =1+1"]]))[0][0],"'  =1+1");});
test('CSV rejects impossible dates, future dates, blank metrics and unknown accounts',()=>{for(const row of ['x,2026-02-30,1','x,2099-01-01,1','x,2026-09-01,','unknown,2026-09-01,1','x,2026-09-01,-2'])assert.throws(()=>d.importFollowers('channel,day,followers\n'+row));assert.equal(d.importFollowers('channel,day,followers\nx,2026-09-01,0')[0].followers,0);});
test('duplicate CSV dates use the last value before a bulk upsert',()=>{const rows=d.importFollowers('channel,day,followers\nx,2026-09-01,1\nx,2026-09-01,2');assert.equal(rows.length,1);assert.equal(rows[0].followers,2);});
test('management visits and attribution use exact path and hostname boundaries',()=>{assert.equal(t.siteForPath('/analytics'),'excluded');assert.equal(t.siteForPath('/analytics/article'),'excluded');assert.equal(t.siteForPath('/analytics-art'),'official');assert.equal(t.sourceFor('https://l.instagram.com/?u=secret'),'instagram');assert.equal(t.sourceFor('https://instagram.com.evil.example/'),'instagram.com.evil.example');assert.equal(t.safeUrl('https://example.org/path?access_token=secret#value'),'https://example.org/path');assert.equal(t.safeUrl('javascript:alert(1)'),null);});
const record={id:'11111111-1111-4111-8111-111111111111',visitor_id:'visitor-test',session_id:'session-test',path:'/music?secret=yes',kind:'pageview'};
test('telemetry rejects malformed events and derives site on the server',()=>{assert.equal(t.cleanActivity({...record,id:'bad'}),null);assert.equal(t.cleanActivity({...record,kind:'made-up'}),null);const c=t.cleanActivity({...record,site:'hub'});assert.equal(c.site,'official');assert.equal(c.path,'/music');});
test('collector acknowledges duplicate delivery but never hides database permission errors',async()=>{
 const route=await module(read('app/lib/telemetry.ts')+'\nconst SUPABASE_KEY="public",SUPABASE_URL="https://database.example";\n'+read('app/api/track/route.ts').replace(/^import .*;\n/gm,''));
 const original=globalThis.fetch;const request=()=>new Request('https://app.example/api/track',{method:'POST',headers:{origin:'https://app.example'},body:JSON.stringify(record)});
 try{globalThis.fetch=async()=>Response.json({code:'23505'},{status:409});assert.equal((await route.POST(request())).status,204);globalThis.fetch=async()=>Response.json({code:'42501'},{status:403});assert.equal((await route.POST(request())).status,503);assert.equal((await route.POST(new Request('https://app.example/api/track',{method:'POST',headers:{origin:'https://foreign.example'},body:'{}'}))).status,403);}finally{globalThis.fetch=original;}
});
test('stats requires an owner JWT and does not return public statistics',async()=>{
 const route=await module('const SUPABASE_KEY="public",SUPABASE_URL="https://database.example";\n'+read('app/api/stats/route.ts').replace(/^import .*;\n/gm,''));
 assert.equal((await route.GET(new Request('https://app.example/api/stats'))).status,401);
 const original=globalThis.fetch;try{globalThis.fetch=async(_url,init)=>{assert.equal(init.headers.Authorization,'Bearer owner-jwt');return Response.json({message:'owner_required'},{status:403});};assert.equal((await route.GET(new Request('https://app.example/api/stats?start=2026-09-01&end=2026-09-05',{headers:{authorization:'Bearer owner-jwt'}}))).status,403);}finally{globalThis.fetch=original;}
});

test('all private paths and Now Generating targets are excluded',()=>{
 for(const path of ['/analytics','/insight','/hub','/social-desk','/control/a','/brief','/learn','/ai30','/counter','/admin','/%61nalytics']){assert.equal(t.isPublicPath(path),false,path);assert.equal(t.cleanActivity({...record,path}),null);}
 assert.equal(t.isPublicTarget('https://now-generating-album.wsstudio.chatgpt.site/tracks/song'),false);
 assert.equal(t.isPublicTarget('https://ws-studio-wheat.vercel.app/brief'),false);
 assert.equal(t.isPublicTarget('https://wsstudiotei.base.shop/items/123'),true);
});
test('weekly/monthly follower series select recorded values, never invented zeroes',()=>{
 const rows=[{channel:'x',day:'2026-08-01',followers:0,source:'manual'},{channel:'x',day:'2026-08-02',followers:2,source:'manual'},{channel:'x',day:'2026-09-01',followers:5,source:'manual'}];
 assert.deepEqual(d.followerSeries(rows,'month'),[{day:'2026-08-02',value:2},{day:'2026-09-01',value:5}]);
 assert.equal(d.followerState({channel:'x',status:'manual',latest:null,first_observed_day:'2026-09-01'},'2026-08-01',[]),'取得開始前');
});

const reuse=await module(read('supabase/functions/ws-insights-sync/initial-connections.ts'));
test('existing SNS connections are reused only on first setup and after real permission validation',async()=>{
 const account={channel:'instagram',handle:'owner',status:'needs_connection',auto_enabled:false,last_attempt_at:null};
 const connection={channel:'instagram',handle:'owner',status:'connected'};
 assert.equal(reuse.canReuseConnection(account,connection),true);
 for(const other of [{...account,last_attempt_at:'2026-09-06'},{...account,status:'expired'},{...account,auto_enabled:true}])assert.equal(reuse.canReuseConnection(other,connection),false);
 assert.equal(reuse.canReuseConnection(account,{...connection,handle:'someone_else'}),false);
 const saves=[];const io={existing:async()=>null,shared:async()=>'a'.repeat(30),measure:async()=>({followers:0,handle:'owner'}),saveToken:async()=>saves.push('token'),saveMeasurement:async()=>saves.push('measurement'),failure:async()=>({ok:false})};
 const result=await reuse.reuseInitialConnections([account],[connection],io);
 assert.deepEqual(saves,['token','measurement']);assert.deepEqual(result,{instagram:{ok:true,followers:0}});
 saves.length=0;await reuse.reuseInitialConnections([account],[connection],{...io,existing:async()=>'existing'.repeat(5)});assert.deepEqual(saves,['measurement']);
 saves.length=0;await reuse.reuseInitialConnections([account],[connection],{...io,measure:async()=>{throw Error('permission');}});assert.deepEqual(saves,[]);
 await reuse.reuseInitialConnections([account],[connection],{...io,measure:async()=>({followers:9,handle:'someone_else'})});assert.deepEqual(saves,[]);
});

test('an expired session cannot leave account checking pending after an aborted refresh',async()=>{
 const auth=await module(read('app/lib/personalSync.ts'));
 const prior={fetch:globalThis.fetch,window:globalThis.window,localStorage:globalThis.localStorage};
 const values=new Map([['ws-personal-session-v1',JSON.stringify({access_token:'expired-test',refresh_token:'test-refresh',expires_at:1,user:{id:'test-user'}})]]);
 globalThis.window={};globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 globalThis.fetch=async(_url,init)=>{assert.ok(init.signal);throw init.signal.reason;};
 try{assert.equal(await auth.getValidSession(AbortSignal.abort(new Error('timeout'))),null);assert.equal(values.has('ws-personal-session-v1'),false);}finally{Object.assign(globalThis,prior);}
});
