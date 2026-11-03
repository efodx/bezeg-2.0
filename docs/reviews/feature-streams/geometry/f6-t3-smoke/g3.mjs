import {run,BASE,lab,enter,NEXT,OUT} from './lib.mjs';
const cases=[['voronoi','v',4],['voronoi','v',5],['voronoi-degenerate','d',3]];
const cardBox=p=>p.evaluate(()=>{const g=document.querySelector('.guided-lesson-grip');let c=g;while(c&&c.getBoundingClientRect().height<120)c=c.parentElement;if(!c)return null;const b=c.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}});
const boardBox=p=>p.evaluate(()=>{const e=[...document.querySelectorAll('svg')].sort((a,b)=>b.getBoundingClientRect().width*b.getBoundingClientRect().height-a.getBoundingClientRect().width*a.getBoundingClientRect().height)[0];if(!e)return null;const b=e.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}});
for(const [rt,k,step] of cases) for(const mode of ['hide','drag','present']) await run(`g3-${k}${step}-${mode}`,async(page,r)=>{
 await page.goto(BASE+'/compgeo/'+rt); await page.waitForTimeout(1500); await enter(page,'sl');
 for(let i=0;i<40;i++){const l=await lab(page);if(new RegExp(`Korak ${step} od [0-9]+ · Okvir 1 `).test(l||''))break;await page.getByRole('button',{name:NEXT}).click();await page.waitForTimeout(350);}
 r.label=await lab(page);
 if(mode==='hide'){await page.locator('.guided-lesson-hide').click();await page.waitForTimeout(600);}
 if(mode==='drag'){const g=await page.locator('.guided-lesson-grip').boundingBox();await page.mouse.move(g.x+g.width/2,g.y+g.height/2);await page.mouse.down();await page.mouse.move(g.x+400,g.y+260,{steps:12});await page.mouse.move(g.x+900,g.y+420,{steps:12});await page.mouse.up();await page.waitForTimeout(600);}
 if(mode==='present'){await page.getByRole('button',{name:'Predstavitveni način'}).click();await page.waitForTimeout(1200);r.labelAfter=await lab(page);}
 r.card=await cardBox(page); r.board=await boardBox(page); r.scrollY=await page.evaluate(()=>scrollY);
 r.restore=await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0).map(b=>(b.innerText||b.getAttribute('aria-label')||'').trim()).filter(t=>/lekcij|navodil|Pokaži|Prikaži|Nadaljuj/i.test(t)));
 await page.screenshot({path:OUT+`g3-${k}${step}-${mode}.png`});
});
