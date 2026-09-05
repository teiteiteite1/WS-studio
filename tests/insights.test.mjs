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
test('management visits and attribution use exact path and hostname boundaries',()=>{assert.equal(t.siteForPath('/analytics'),'workspace');assert.equal(t.siteForPath('/analytics/article'),'workspace');assert.equal(t.siteForPath('/analytics-art'),'official');assert.equal(t.sourceFor('https://l.instagram.com/?u=secret'),'instagram');assert.equal(t.sourceFor('https://instagram.com.evil.example/'),'instagram.com.evil.example');assert.equal(t.safeUrl('https://example.org/path?access_token=secret#value'),'https://example.org/path');assert.equal(t.safeUrl('javascript:alert(1)'),null);});
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
