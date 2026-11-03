import {run,BASE,lab,NEXT} from './lib.mjs';
const info=`(()=>{const e=document.activeElement;if(!e||e===document.body)return null;const cs=getComputedStyle(e);return{tag:e.tagName,role:e.getAttribute('role'),label:((e.getAttribute('aria-label')||e.innerText||e.getAttribute('placeholder')||e.value||'')+'').replace(/\s+/g,' ').slice(0,50),outline:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor,shadow:cs.boxShadow.slice(0,50),vis:e.getBoundingClientRect().width>0}})()`;
for(const rt of ['voronoi','voronoi-degenerate']) await run('k-'+rt,async(page,r)=>{
 await page.goto(BASE+'/compgeo/'+rt); await page.waitForTimeout(1500);
 const stops=[];
 for(let i=0;i<120;i++){await page.keyboard.press('Tab'); const s=await page.evaluate(info); stops.push(s);}
 const real=stops.filter(Boolean);
 r.tabStops=real.length; r.withOutline=real.filter(s=>!/^none/.test(s.outline)&&!/ 0px /.test(s.outline)).length;
 r.stops=real.map(s=>`${s.tag}|${s.role||''}|${s.label}|${s.outline}|${s.shadow!=='none'?'shadow':''}`).filter((v,i,a)=>a.indexOf(v)===i).slice(0,80);
 // keyboard lesson path: Tab to Learn button, Enter, then Tab to Next, Enter
 await page.evaluate(()=>{document.activeElement&&document.activeElement.blur();window.scrollTo(0,0)});
 let learnHit=false; for(let i=0;i<120&&!learnHit;i++){await page.keyboard.press('Tab'); const s=await page.evaluate(info); if(s&&/Spoznaj|Learn this/.test(s.label)){learnHit=true; r.learnFocus=s; await page.keyboard.press('Enter'); await page.waitForTimeout(1000);} }
 r.afterLearnEnter=await lab(page);
 let nextHit=false; for(let i=0;i<150&&!nextHit;i++){await page.keyboard.press('Tab'); const s=await page.evaluate(info); if(s&&/Naslednji okvir|Next frame/.test(s.label)){nextHit=true; r.nextFocus=s; await page.keyboard.press('Enter'); await page.waitForTimeout(500);} }
 r.afterKeyboardNext=await lab(page); r.nextHit=nextHit;
 await page.screenshot({path:'C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/docs/reviews/feature-streams/geometry/f6-t3-smoke/k-'+rt+'-next-focus.png'});
});
