import {run,BASE,lab} from './lib.mjs';
const info=`(()=>{const e=document.activeElement;if(!e)return 'none';return (e.tagName+':'+((e.getAttribute('aria-label')||e.innerText||'')+'').replace(/\s+/g,' ').slice(0,22))})()`;
await run('kd-voronoi',async(page,r)=>{
 await page.goto(BASE+'/compgeo/voronoi?learn=1'); await page.waitForTimeout(1500);
 await page.focus('body');
 const seq=[]; for(let i=0;i<140;i++){await page.keyboard.press('Tab'); seq.push(await page.evaluate(info));}
 r.seq=seq.map((s,i)=>i+':'+s);
 r.ch=seq.filter(s=>/okvir|Formula|Končaj/.test(s));
});
