import {run,BASE,lab} from './lib.mjs';
const info=`(()=>{const e=document.activeElement;if(!e||e===document.body)return 'BODY/none';return e.tagName+':'+((e.getAttribute('aria-label')||e.innerText||'')+'').replace(/[\u00AD\s]+/g,' ').slice(0,30)})()`;
const isNext=s=>/okvir/.test(s)&&/^BUTTON/.test(s)&&!/Prej/.test(s);
await run('ke-voronoi',async(page,r)=>{
 await page.goto(BASE+'/compgeo/voronoi?learn=1'); await page.waitForTimeout(1500);
 for(let i=0;i<60;i++){await page.keyboard.press('Tab'); if(isNext(await page.evaluate(info))) break;}
 r.f0=await page.evaluate(info);
 await page.keyboard.press('Enter'); await page.waitForTimeout(700); r.f1=await page.evaluate(info); r.l1=await lab(page);
 for(let k=0;k<3;k++){await page.keyboard.press('Tab'); await page.waitForTimeout(100);} r.afterTab3=await page.evaluate(info);
 for(let i=0;i<60;i++){ if(isNext(await page.evaluate(info))) break; await page.keyboard.press('Tab');}
 r.f2=await page.evaluate(info); await page.keyboard.press('Enter'); await page.waitForTimeout(700); r.l2=await lab(page);
});
