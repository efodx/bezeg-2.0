const {chromium}=require('C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/node_modules/playwright');
const B='http://localhost:4313/bezeg-2.0';
(async()=>{
const br=await chromium.launch();const p=await br.newPage({viewport:{width:1400,height:900}});const errs=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(String(e)));
const chk=async(tag)=>{const r=await p.evaluate(()=>{const t=document.body.innerText;const i=t.indexOf(String.fromCharCode(92)+'(');return {raw:i<0?null:t.slice(Math.max(0,i-40),i+60),katex:document.querySelectorAll('math').length,
 secs:[...document.querySelectorAll('section[id]')].map(s=>s.id),h:[...document.querySelectorAll('h2,h3')].map(h=>h.textContent.trim()).filter(x=>/onoton/.test(x)||/Interval|Segment|Pometanje|Presečišč|sweep/i.test(x)),
 ear:[...document.querySelectorAll('a')].some(a=>a.getAttribute('href')==='/bezeg-2.0/learn/triangulations-voronoi#ear-clipping')}});console.log(tag,JSON.stringify(r))};
const ret=async(tag,sec)=>{
 await p.locator(`a[href*="/compgeo/${sec}?example"]`).first().click();await p.waitForTimeout(2500);console.log(tag,'lesson url',p.url());
 const back=p.locator('a[href*="learn/sweep-algorithms"]');console.log(tag,'backlinks',await back.evaluateAll(a=>a.map(x=>x.getAttribute('href')+'|'+x.textContent.trim().slice(0,40))));
 await back.first().click();await p.waitForTimeout(2000);
 const s=await p.evaluate((sec)=>{const e=document.getElementById(sec);const r=e.getBoundingClientRect();const a=document.activeElement;return {url:location.href,top:Math.round(r.top),bottom:Math.round(r.bottom),vh:innerHeight,focusIn:e.contains(a)||a===e,active:a.tagName+'#'+a.id}},sec);console.log(tag,'return',JSON.stringify(s));
 await p.screenshot({path:`ret-${tag}.png`});};
await p.goto(B+'/learn/sweep-algorithms');await p.waitForTimeout(2500);
await chk('SL');
// ear-clipping
const ec=await p.request.get(B+'/learn/triangulations-voronoi');console.log('ear status',ec.status());
await ret('sl-partition','monotone-partition');
await p.locator('select#bezeg-language:visible').first().selectOption('en');await p.waitForTimeout(1000);
await chk('EN');
await ret('en-triang','monotone-triangulation');
await p.goto(B+'/learn/triangulations-voronoi');await p.waitForTimeout(2500);
console.log('ear section',await p.evaluate(()=>!!document.getElementById('ear-clipping')));
await p.goto(B+'/learn');await p.waitForTimeout(2500);
console.log('landing',await p.evaluate(()=>!!document.querySelector('a[href*="sweep-algorithms"]')),await p.evaluate(()=>document.querySelector('a[href*="sweep-algorithms"]')?.textContent.trim().slice(0,60)));
console.log('errs',errs);
await br.close()})();
