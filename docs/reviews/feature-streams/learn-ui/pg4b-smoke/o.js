// Probe: elements wider than the viewport on the Bézier chapter at 390px and 200% text (CI overflow failure after PG4).
const L=require('./lib');
(async()=>{for(const lang of ['sl','en']){const {br,page}=await L.open({ctx:{viewport:{width:390,height:844}},lang});
await page.goto(L.B+'/learn/bezier-curves');await page.waitForTimeout(1500);
await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(1500);await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(500);
const r=await page.evaluate(()=>{const W=innerWidth;const out=[];for(const e of document.querySelectorAll('body *')){const b=e.getBoundingClientRect();if(b.right>W+2&&b.width>0){out.push(`${e.tagName}.${(e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className)||''} r=${Math.round(b.right)} w=${Math.round(b.width)} "${(e.textContent||'').trim().slice(0,30)}"`)}}return{sw:document.documentElement.scrollWidth,W,out:out.slice(0,15)}});
console.log(lang,JSON.stringify(r,null,1));await br.close();}})().catch(e=>{console.error(e);process.exit(1)});
