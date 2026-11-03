import {run,BASE,lab} from './lib.mjs';
await run('kc-voronoi',async(page,r)=>{
 await page.goto(BASE+'/compgeo/voronoi?learn=1'); await page.waitForTimeout(1500);
 r.btns=await page.$$eval('button,a,[role=button]',els=>els.filter(e=>/Naslednji|Next|Nazaj|Prejšnji|Previous|okvir|frame/i.test(e.innerText||e.getAttribute('aria-label')||'')).map(e=>({tag:e.tagName,t:(e.innerText||'').slice(0,30),disabled:e.disabled||e.getAttribute('aria-disabled'),tabindex:e.getAttribute('tabindex'),vis:e.getBoundingClientRect().width>0,y:Math.round(e.getBoundingClientRect().y)})));
 r.nextByRole=await page.getByRole('button',{name:/Naslednji okvir/}).count();
 r.tabbables=await page.evaluate(()=>[...document.querySelectorAll('button,a[href],input,select,[tabindex]')].filter(e=>e.tabIndex>=0 && e.getBoundingClientRect().width>0).length);
 r.lessonNext=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].filter(e=>/okvir/.test(e.innerText));return b.map(e=>[e.innerText,e.tabIndex,e.disabled, e.getBoundingClientRect().width])});
});
