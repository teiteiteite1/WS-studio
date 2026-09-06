import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';

const script=readFileSync(new URL('../public/ws-base-telemetry.js',import.meta.url),'utf8');
function visit(url,{referrer='',webdriver=false}={}) {
 const sent=[],listeners={};const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};
 const context={location:new URL(url),document:{referrer,addEventListener:(name,fn)=>listeners[name]=fn},window:{addEventListener(){}},navigator:{webdriver,userAgent:'Mozilla/5.0'},localStorage:storage(),sessionStorage:storage(),crypto:webcrypto,URL,Element:class {},setInterval(){},history:{pushState(){},replaceState(){}},fetch:async(url,options)=>{sent.push({url,headers:options.headers,body:JSON.parse(options.body)});return {ok:true,status:201};}};
 runInNewContext(script,context);return {sent,context,listeners};
}
test('BASE collector sends an attributed public visit with a stable session on navigation',()=>{
 const {sent,context}=visit('https://wsstudiotei.base.shop/?utm_source=instagram&utm_campaign=launch');
 assert.equal(sent.length,1);const first=sent[0].body;
 assert.equal(first.site,'base');assert.equal(first.kind,'pageview');assert.equal(first.source,'instagram');assert.equal(first.campaign,'launch');assert.equal(first.path,'/');
 context.location=new URL('https://wsstudiotei.base.shop/items/152969255');context.history.pushState();
 assert.equal(sent.length,2);assert.equal(sent[1].body.session_id,first.session_id);assert.equal(sent[1].body.visitor_id,first.visitor_id);assert.notEqual(sent[1].body.id,first.id);
});
test('BASE collector rejects private pages, unrelated sites, internal referrers and automated browsers',()=>{
 for(const url of ['https://wsstudiotei.base.shop/cart','https://wsstudiotei.base.shop/checkout','https://ws-studio-hub.wsstudio.chatgpt.site/','https://now-generating-album.wsstudio.chatgpt.site/'])assert.equal(visit(url).sent.length,0);
 assert.equal(visit('https://wsstudiotei.base.shop/',{referrer:'https://ws-studio-wheat.vercel.app/analytics'}).sent.length,0);
 assert.equal(visit('https://wsstudiotei.base.shop/',{webdriver:true}).sent.length,0);
});
test('BASE collector recognizes Official referrals and remains single-initialized',()=>{
 const {sent,context}=visit('https://wsstudiotei.base.shop/',{referrer:'https://ws-studio-wheat.vercel.app/'});
 assert.equal(sent[0].body.source,'official');runInNewContext(script,context);assert.equal(sent.length,1);
});
