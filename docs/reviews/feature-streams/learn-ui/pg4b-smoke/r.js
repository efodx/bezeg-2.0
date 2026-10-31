// Recheck after the PG4b repair: inspect block on a first visit, and overlay labels at 390x844 and 1440x900.
const L=require('./lib');
(async()=>{for(const [name,ctx] of [['m',{viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2}],['d',{viewport:{width:1440,height:900}}]]){
const {br,page,errs}=await L.open({ctx});await page.goto(L.B+'/learn/bezier-curves');
const blocks=page.locator('.playground');await blocks.first().waitFor();
const n=await blocks.count();const counts=[];for(let i=0;i<n;i++)counts.push(await blocks.nth(i).locator('[data-role="anchor"]').count());
const insp=page.locator('.playground--inspect');await insp.scrollIntoViewIfNeeded();
const sw=insp.locator('xpath=ancestor::*[.//input[@type="checkbox"]][1]').locator('input[type="checkbox"]');const k=await sw.count();for(let i=0;i<k;i++){if(!(await sw.nth(i).isChecked()))await sw.nth(i).check();}
const box=await insp.locator('svg').first().boundingBox();
// overlap test: bounding boxes of P labels vs joint labels
const ov=await insp.evaluate(el=>{const r=s=>[...el.querySelectorAll(s)].map(e=>({t:e.textContent,b:e.getBoundingClientRect()}));const P=r('.lu-point-label'),J=r('.lu-joint-label');const hit=[];for(const p of P)for(const j of J){const a=p.b,b=j.b;const w=Math.min(a.right,b.right)-Math.max(a.left,b.left),h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(w>1&&h>1)hit.push(p.t+'/'+j.t)}return{P:P.length,J:J.length,hit}});
await page.screenshot({path:__dirname+`/r-${name}-overlays.png`,clip:{x:box.x,y:box.y+ (await page.evaluate(()=>scrollY)),width:box.width,height:box.height},fullPage:true});
console.log(name,JSON.stringify({counts,switches:k,ov,errs}));await br.close();}})().catch(e=>{console.error(e);process.exit(1)});
