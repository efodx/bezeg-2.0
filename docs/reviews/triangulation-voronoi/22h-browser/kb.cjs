setTimeout(()=>process.exit(2),170000).unref();
const {chromium}=require('C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/node_modules/playwright');
const U='http://localhost:4313/bezeg-2.0/';const O='docs/reviews/triangulation-voronoi/22h-browser/';
const act=p=>p.evaluate(()=>{const e=document.activeElement;const c=getComputedStyle(e);return {tag:e.tagName,label:e.getAttribute('aria-label')||(e.textContent||'').trim().slice(0,25),ring:(c.outlineStyle!=='none'&&parseFloat(c.outlineWidth)>0)||c.boxShadow!=='none',prog:(document.querySelector('.guided-lesson-progress')||{}).textContent}});
(async()=>{const b=await chromium.launch();try{
const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
await p.goto(U+'compgeo/voronoi?learn=1');await p.waitForTimeout(2500);
let frames=0,tabs=0,noRing=new Set(),lost=0;
for(let f=0;f<20;f++){
 let a=await act(p);let n=0;
 while(!/Naslednji okvir/.test(a.label)&&n<40){await p.keyboard.press('Tab');n++;tabs++;a=await act(p);if(a.tag==='BODY')lost++;if(!a.ring)noRing.add(a.label);}
 const pr=a.prog;console.log(f,'at',a.label,'after',n,'tabs',pr,'ring',a.ring);
 if(!/Naslednji okvir/.test(a.label)){break;}
 await p.keyboard.press(f%2?'Space':'Enter');await p.waitForTimeout(500);frames++;
 const a2=await act(p);console.log('  post',a2.tag,a2.label,a2.prog,'ring',a2.ring);if(a2.tag==='BODY')lost++;
}
console.log('frames advanced',frames,'tabs',tabs,'lost',lost,'noRing',[...noRing]);
await p.screenshot({path:O+'kb-end.png'});
}finally{await b.close()}})();
