import {run,BASE,lab} from './lib.mjs';
const info=`(()=>{const e=document.activeElement;if(!e||e===document.body)return null;const cs=getComputedStyle(e);return{tag:e.tagName,label:((e.getAttribute('aria-label')||e.innerText||e.value||'')+'').replace(/[\u00AD\s]+/g,' ').slice(0,40),outline:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor}})()`;
const isNext=s=>s&&/okvir|frame/i.test(s.label)&&!/Prej|Previous/.test(s.label)&&s.tag==='BUTTON';
for(const rt of ['voronoi','voronoi-degenerate']) await run('kb-'+rt,async(page,r)=>{
 await page.goto(BASE+'/compgeo/'+rt+'?learn=1'); await page.waitForTimeout(1500);
 r.labelAtLoad=await lab(page);
 let hit=-1;
 for(let i=0;i<60;i++){await page.keyboard.press('Tab'); const s=await page.evaluate(info); if(isNext(s)){hit=i;r.nextFocus=s;break;}}
 r.nextIndex=hit;
 if(hit>=0){await page.keyboard.press('Enter'); await page.waitForTimeout(600); r.afterEnter=await lab(page);
  await page.keyboard.press('Enter'); await page.waitForTimeout(600); r.afterEnter2=await lab(page);}
 await page.screenshot({path:'C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/docs/reviews/feature-streams/geometry/f6-t3-smoke/kb-'+rt+'-next.png'});
});
