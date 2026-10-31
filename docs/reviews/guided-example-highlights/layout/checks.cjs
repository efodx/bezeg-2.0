const {chromium} = require('playwright'); const path=require('path');
const url='http://127.0.0.1:4313/bezeg-2.0/learn/ph-curves';
(async()=>{
 const b=await chromium.launch();
 // keyboard + focus ring
 let ctx=await b.newContext({viewport:{width:1280,height:720}}); let p=await ctx.newPage();
 await p.goto(url,{waitUntil:'networkidle'});
 await p.evaluate(()=>{const a=document.querySelector('.chapter-exploration--guided-example a.chapter-open-activity'); a.focus(); return a.id;});
 // tab order: focus previous focusable then Tab
 const order=await p.evaluate(()=>{const c=document.querySelectorAll('.chapter-exploration--guided-example')[0]; const f=[...c.querySelectorAll('a,button,[tabindex]')].map(e=>e.className); return f;});
 await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab');
 const act=await p.evaluate(()=>{const e=document.activeElement; const cs=getComputedStyle(e); return {id:e.id,cls:e.className,outline:cs.outlineStyle+' '+cs.outlineWidth,inCard:!!e.closest('.chapter-exploration--guided-example'),vis:e.matches(':focus-visible')};});
 console.log('keyboard',JSON.stringify(act),JSON.stringify(order));
 await p.locator('.chapter-exploration--guided-example:has(a:focus)').screenshot({path:path.join(__dirname,'after-focus.png')});
 // DOM order: figure before copy
 console.log('domorder',await p.evaluate(()=>[...document.querySelector('.chapter-exploration--guided-example').children].map(e=>e.tagName)));
 await ctx.close();
 // fallback
 for (const [w,h] of [[1280,720],[390,844]]) {
  ctx=await b.newContext({viewport:{width:w,height:h}}); p=await ctx.newPage();
  await p.route(/\/src\/images\/learning\/examples\/|assets\/.*\.png/, r=>r.abort());
  await p.goto(url,{waitUntil:'networkidle'}); await p.waitForTimeout(600);
  const r=await p.evaluate(()=>{const cs=[...document.querySelectorAll('.chapter-exploration--guided-example')]; const de=document.documentElement; return {cards:cs.length,withFig:cs.filter(c=>c.querySelector('figure')).length,noPrev:cs.filter(c=>c.classList.contains('chapter-exploration--without-preview')).length,cols:getComputedStyle(cs[0]).gridTemplateColumns,w:cs[0].getBoundingClientRect().width,link:!!cs[0].querySelector('a.chapter-open-activity'),overflow:de.scrollWidth>de.clientWidth};});
  console.log('fallback',w,JSON.stringify(r));
  await p.locator('.chapter-exploration--guided-example').first().screenshot({path:path.join(__dirname,`after-fallback-${w}.png`)});
  await ctx.close();
 }
 await b.close();
})();
