import {run,BASE,lab,enter,NEXT} from './lib.mjs';
await run('g3-probe',async(page,r)=>{ await page.goto(BASE+'/compgeo/voronoi'); await page.waitForTimeout(1500); await enter(page,'sl');
 for(let i=0;i<40;i++){const l=await lab(page);if(/Korak 4 od 7 · Okvir 1 /.test(l||''))break;await page.getByRole('button',{name:NEXT}).click();await page.waitForTimeout(350);}
 r.label=await lab(page);
 r.buttons=await page.evaluate(()=>[...document.querySelectorAll('button,[role=button],[draggable],[aria-roledescription]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const b=e.getBoundingClientRect();return {t:((e.innerText||'').trim()||e.getAttribute('aria-label')||'').slice(0,40),cls:(e.className+'').slice(0,50),x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}}));
 const sec=await page.evaluate(()=>{const s=document.querySelector('section[aria-label], .guided-lesson, [class*=lesson-card], [class*=GuidedLesson]');if(!s)return null;const b=s.getBoundingClientRect();return {cls:s.className+'',x:b.x,y:b.y,w:b.width,h:b.height}});
 r.card=sec;
 const board=await page.evaluate(()=>{const s=document.querySelector('.jxgbox');const b=s.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height}}); r.board=board;
});
