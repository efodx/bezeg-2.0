import {run,BASE,lab,NEXT} from './lib.mjs';
const AE=`(()=>{const e=document.activeElement;if(!e)return null;return{tag:e.tagName,text:(e.innerText||'').replace(/\s+/g,' ').slice(0,50),href:e.getAttribute('href'),label:(e.getAttribute('aria-label')||'').slice(0,40)}})()`;
const exLinks=page=>page.$$eval('a[href*="example="]',els=>els.map(e=>({href:e.getAttribute('href'),t:e.innerText.trim().slice(0,40)})));
for(const mode of ['exit','return']) await run('f7-'+mode,async(page,r)=>{
 await page.goto(BASE+'/learn/triangulations-voronoi'); await page.waitForTimeout(1800);
 const links=await exLinks(page); r.exampleLinks=links.filter(l=>/voronoi/.test(l.href)).map(l=>l.href.slice(0,120));
 const link=page.locator('a[href*="/compgeo/voronoi?example="]').first();
 r.linkText=await link.innerText(); await link.click(); await page.waitForTimeout(1500);
 r.lessonLabel=await lab(page); r.urlAfterOpen=page.url().replace(BASE,'').slice(0,140);
 if(mode==='exit'){
  await page.getByRole('button',{name:/Končaj vodeni primer/}).click(); await page.waitForTimeout(500);
  r.dialog=await page.getByRole('button',{name:/Zapusti in povrni graf/}).count();
  if(r.dialog) {await page.getByRole('button',{name:/Zapusti in povrni graf/}).click(); await page.waitForTimeout(1200);}
  r.afterExit={lesson:await lab(page),url:page.url().replace(BASE,'').slice(0,140),active:await page.evaluate(AE)};
 } else {
  await page.getByRole('link',{name:/Nazaj v poglavje/}).click(); await page.waitForTimeout(1500);
  r.afterReturn={lesson:await lab(page),url:page.url().replace(BASE,'').slice(0,140),active:await page.evaluate(AE)};
 }
 await page.screenshot({path:'C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/docs/reviews/feature-streams/geometry/f6-t3-smoke/f7-'+mode+'.png'});
});
