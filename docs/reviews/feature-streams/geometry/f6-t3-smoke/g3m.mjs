import {run,BASE,lab,enter,NEXT,OUT} from './lib.mjs';
await run('g3-v4-markers',async(page,r)=>{
 await page.goto(BASE+'/compgeo/voronoi'); await page.waitForTimeout(1500); await enter(page,'sl');
 for(let i=0;i<40;i++){const l=await lab(page);if(/Korak 4 od [0-9]+ · Okvir 1 /.test(l||''))break;await page.getByRole('button',{name:NEXT}).click();await page.waitForTimeout(350);}
 await page.locator('.guided-lesson-hide').click();await page.waitForTimeout(600);
 r.markers=await page.evaluate(()=>{const glyphs=/^[↑↓←→↗↘↙↖⇢⇡⋯…▸▴▾◂]+$/;const box=[...document.querySelectorAll('svg')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0].getBoundingClientRect();
  return [...document.querySelectorAll('div,text')].filter(e=>e.children.length===0&&glyphs.test((e.textContent||'').trim())).map(e=>{const b=e.getBoundingClientRect();return {g:e.textContent.trim(),x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),inBoard:b.x>=box.x&&b.right<=box.right&&b.y>=box.y&&b.bottom<=box.bottom,vis:getComputedStyle(e).visibility}})});
 r.board=await page.evaluate(()=>{const b=[...document.querySelectorAll('svg')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0].getBoundingClientRect();return [b.x,b.y,b.right,b.bottom].map(Math.round)});
 await page.getByRole('button',{name:'Ponastavi pogled'}).click();await page.waitForTimeout(800);
 r.afterReset=await page.evaluate(()=>[...document.querySelectorAll('div,text')].filter(e=>e.children.length===0&&/^[↑↓←→↗↘↙↖⇢⇡⋯…▸▴▾◂]+$/.test((e.textContent||'').trim())).map(e=>{const b=e.getBoundingClientRect();return [e.textContent.trim(),Math.round(b.x),Math.round(b.y)]}));
 await page.screenshot({path:OUT+'g3-v4-hide-reset.png'});
});
