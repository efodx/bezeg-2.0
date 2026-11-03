setTimeout(()=>process.exit(2),170000).unref();
const {chromium}=require('C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/node_modules/playwright');
const U='http://localhost:4313/bezeg-2.0/';const O='docs/reviews/triangulation-voronoi/22h-browser/';
const _prog=p=>p.evaluate(()=>(document.querySelector('.guided-lesson-progress')||{}).textContent);
const state=p=>p.evaluate(()=>{const t=document.body.innerText;return {prog:(document.querySelector('.guided-lesson-progress')||{}).textContent,counts:(t.match(/[^\n]*(Oglišč|Vertices|Edges|Robov|Roby)[^\n]*\n?[^\n]*/gi)||[]).slice(0,4),pts:(t.match(/P\d/g)||[]).length,pressed:[...document.querySelectorAll('[aria-pressed=true],input:checked')].length+''}});
(async()=>{const b=await chromium.launch();try{
const ctx=await b.newContext({viewport:{width:1400,height:900}});const p=await ctx.newPage();const errs=[];
p.on('console',m=>m.type()==='error'&&errs.push(m.text()));p.on('pageerror',e=>errs.push('PE '+e.message));
const next=()=>p.click('button[aria-label="Naslednji okvir"],button[aria-label="Next frame"]');
await p.goto(U+'compgeo/voronoi?learn=1');await p.waitForTimeout(2500);
// 3 spoiler steps 1-2
console.log('S1f1',JSON.stringify(await state(p)));await next();await p.waitForTimeout(400);await next();await p.waitForTimeout(400);console.log('S2f1',JSON.stringify(await state(p)));await p.screenshot({path:O+'s2.png'});
for(let i=0;i<3;i++){await next();await p.waitForTimeout(400);}
console.log('S4f1?',JSON.stringify(await state(p)));
await next();await p.waitForTimeout(400);console.log('next',JSON.stringify(await state(p)));
// 1 language
const body=()=>p.evaluate(()=>document.body.innerText);
const _before=await state(p);await p.screenshot({path:O+'lang-sl.png'});
const _selBefore=await body();
await p.selectOption('#bezeg-language','en');await p.waitForTimeout(1200);
const after=await state(p);const bt=await body();console.log('EN',JSON.stringify(after),/Step \d of 7/.test(bt),bt.slice(0,0));await p.screenshot({path:O+'lang-en.png'});
await p.selectOption('#bezeg-language','sl');await p.waitForTimeout(1000);console.log('SL again',JSON.stringify(await state(p)));
console.log('errs',JSON.stringify(errs));
}finally{await b.close()}})();
