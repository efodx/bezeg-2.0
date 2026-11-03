setTimeout(()=>process.exit(2),120000).unref();
const {chromium}=require('C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/node_modules/playwright');
const U='http://localhost:4313/bezeg-2.0/';const O='docs/reviews/triangulation-voronoi/41-browser/';
(async()=>{const b=await chromium.launch();try{
for(const lang of ['sl','en']){
const ctx=await b.newContext({viewport:{width:1400,height:900}});const p=await ctx.newPage();
await p.addInitScript(()=>{});
await p.goto(U+'learn/triangulations-voronoi');await p.waitForTimeout(1500);
await p.selectOption('#bezeg-language',lang);await p.waitForTimeout(800);
const r=await p.evaluate(()=>{const s=document.querySelector('#voronoi-degenerate');const prev=s&&s.previousElementSibling;const pid=[...document.querySelectorAll('section[id]')].map(x=>x.id);return {h:s&&s.querySelector('h2,h3')?.textContent,links:s?[...s.querySelectorAll('a')].map(a=>a.textContent.trim()+' -> '+a.getAttribute('href')):null,prev:prev&&prev.id,prevText:prev&&prev.innerText.match(/[^.]*(Voronoi|Voronoj)[^.]*\./i)?.[0],ids:pid}});
console.log(lang,JSON.stringify(r));
const m=await p.evaluate(()=>{const s=document.querySelector('#voronoi-degenerate');const t=s.innerText;const i=t.indexOf('e0');return {mathNodes:s.querySelectorAll('mjx-container').length,aroundE0:i<0?null:t.slice(Math.max(0,i-15),i+5),hasNeq:t.includes(String.fromCharCode(0x2260))}});console.log(' math',JSON.stringify(m));
const link=p.locator('#voronoi-degenerate a[href*=example]');await link.click();await p.waitForTimeout(2500);console.log(' url',p.url());
await p.click('a:has-text("Nazaj v poglavje"),a.guided-lesson-chapter-link,a:has-text("chapter")');await p.waitForTimeout(2000);
console.log(' back',p.url(),JSON.stringify(await p.evaluate(()=>{const a=document.activeElement;return {tag:a.tagName,id:a.id,inSec:!!a.closest('#voronoi-degenerate'),y:Math.round(document.querySelector('#voronoi-degenerate').getBoundingClientRect().top)}})));
await p.screenshot({path:O+'ch-'+lang+'.png'});
await ctx.close();}
}finally{await b.close()}})();
