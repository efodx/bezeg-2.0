import {run,BASE} from './lib.mjs';
for(const lang of ['sl','en']) for(const [w,h] of [[1440,900],[390,844]]) await run('c-'+lang+'-'+w,async(page,r)=>{
 await page.setViewportSize({width:w,height:h});
 if(lang==='en') await page.addInitScript(()=>{try{localStorage.setItem('bezeg-language','en');localStorage.setItem('language','en')}catch{}});
 await page.goto(BASE+'/learn/triangulations-voronoi'); await page.waitForTimeout(1800);
 if(lang==='en'){await page.selectOption('#bezeg-language','en').catch(()=>{}); await page.waitForTimeout(600);}
 r.headings=await page.$$eval('h2,h3',els=>els.filter(e=>/Voronoj|Voronoi|Izrojen|egenerate|kocirkular|cocircular/.test(e.innerText)).map(e=>{const b=e.getBoundingClientRect();return {t:e.innerText.trim().slice(0,60),tag:e.tagName,w:Math.round(b.width),vis:b.width>0&&b.height>0&&getComputedStyle(e).visibility!=='hidden',top:Math.round(b.top+scrollY)}}));
 const links=await page.$$eval('a[href*="example="]',els=>els.filter(e=>/voronoi/.test(e.getAttribute('href'))&&!/ear|point|delaunay/.test(e.getAttribute('href'))).map(e=>{const b=e.getBoundingClientRect();return {href:e.getAttribute('href').split('?')[0].replace('/bezeg-2.0',''),t:e.innerText.replace(/\s+/g,' ').slice(0,30),vis:b.width>0&&b.height>0,inViewport:b.top>=0&&b.bottom<=innerHeight}}));
 r.exampleLinks=links;
 r.scrollW=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
 await page.screenshot({path:'C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/docs/reviews/feature-streams/geometry/f6-t3-smoke/c-'+lang+'-'+w+'.png',fullPage:false});
});
