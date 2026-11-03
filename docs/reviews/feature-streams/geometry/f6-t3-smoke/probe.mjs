import {run,BASE} from './lib.mjs';
for (const rt of ['voronoi','voronoi-degenerate']) await run('probe-'+rt,async(page,r)=>{
 await page.goto(BASE+'/compgeo/'+rt); await page.waitForTimeout(2500);
 r.buttons=await page.$$eval('button',els=>els.map(e=>e.innerText.trim()||e.getAttribute('aria-label')).filter(Boolean).slice(0,60));
 r.inputs=await page.$$eval('input,select,textarea',els=>els.map(e=>(e.type||e.tagName)+':'+(e.getAttribute('aria-label')||e.labels?.[0]?.innerText||'')).slice(0,40));
 r.checkboxes=await page.$$eval('input[type=checkbox]',els=>els.map(e=>e.labels?.[0]?.innerText||e.getAttribute('aria-label')).slice(0,20));
 r.jxg=await page.evaluate(()=>!!window.JXG && Object.values(window.JXG.boards).length);
 r.svgCount=await page.$$eval('svg',s=>s.length);
 r.text=(await page.innerText('body')).slice(0,900);
 r.links=await page.$$eval('a',els=>els.map(e=>e.innerText.trim()).filter(Boolean).slice(0,30));
}); 
