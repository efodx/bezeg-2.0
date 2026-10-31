// usage: node measure.cjs <tag> ; measures guided-example cards (before/after) on 4313 preview
const {chromium} = require('playwright');
const path = require('path');
const tag = process.argv[2] || 'before';
const out = __dirname;
const base = 'http://127.0.0.1:4313/bezeg-2.0/learn/';
const pages = [{name: 'ph', chapter: 'ph-curves', section: 'offsets'}, {name: 'bez', chapter: 'bezier-curves', section: null}];
const vps = [['desktop',1440,900,1],['proj',1280,720,1],['narrow',390,844,1],['narrow200',390,844,2],['proj200',1280,720,2]];
(async () => {
  const browser = await chromium.launch();
  const res = [];
  for (const [vn,w,h,zoom] of vps) for (const lang of ['sl','en']) {
    if (lang==='en' && !['desktop','narrow200'].includes(vn)) continue;
    const ctx = await browser.newContext({viewport:{width:w,height:h}});
    const page = await ctx.newPage();
    for (const p of pages) {
      await page.goto(base + p.chapter, {waitUntil:'networkidle'});
      if (lang==='en') { await page.selectOption('#bezeg-language','en').catch(()=>{}); await page.waitForTimeout(400); }
      if (zoom===2) await page.addStyleTag({content:'html{font-size:200% !important}'});
      await page.waitForTimeout(500);
      const cards = page.locator('.chapter-exploration--guided-example');
      const n = await cards.count();
      let idx = 0;
      if (p.section) { idx = await page.evaluate(s => { const l=[...document.querySelectorAll('.chapter-exploration--guided-example')]; const i=l.findIndex(c=>c.closest('#'+s)); return i; }, p.section); }
      if (idx<0) idx=0;
      const card = cards.nth(idx);
      await card.scrollIntoViewIfNeeded();
      await page.evaluate(()=>new Promise(r=>setTimeout(r,300)));
      const m = await card.evaluate(c => {
        const r = x => { if(!x) return null; const b=x.getBoundingClientRect(); return {x:Math.round(b.x),w:Math.round(b.width*10)/10,h:Math.round(b.height*10)/10}; };
        const img=c.querySelector('img'), cap=c.querySelector('figcaption');
        const de=document.documentElement;
        return {title:c.querySelector('h3').textContent, card:r(c), img:r(img), natural: img?[img.naturalWidth,img.naturalHeight]:null, imgAttr: img?[img.getAttribute('width'),img.getAttribute('height')]:null, objectFit: img&&getComputedStyle(img).objectFit, caption: cap&&cap.textContent.slice(0,60), capClipped: cap? cap.scrollWidth>cap.clientWidth+1:null, alt: img&&img.alt.slice(0,40), overflow: de.scrollWidth>de.clientWidth, sw:de.scrollWidth, cw:de.clientWidth};
      });
      res.push({vp:vn,lang,page:p.name,count:n,idx,...m});
      await card.screenshot({path: path.join(out, `${tag}-${p.name}-${vn}-${lang}.png`)});
    }
    await ctx.close();
  }
  require('fs').writeFileSync(path.join(out,`${tag}.json`), JSON.stringify(res,null,1));
  for (const r of res) console.log(r.vp,r.lang,r.page,r.count,JSON.stringify(r.card),JSON.stringify(r.img),r.imgAttr,r.overflow,r.capClipped,r.title.slice(0,25));
  await browser.close();
})();
