const {chromium}=require('../../../../node_modules/playwright');
setTimeout(()=>process.exit(2),60000).unref();
(async()=>{const b=await chromium.launch();try{
const c=await b.newContext({viewport:{width:1400,height:1000},hasTouch:true});const p=await c.newPage();
const errs=[];p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto('http://127.0.0.1:4391/bezeg-2.0/compgeo/point-in-polygon');await p.waitForSelector('#jgbox');await p.waitForTimeout(1500);
await p.locator('button',{hasText:/^Uredi$/}).click();
await p.locator('button',{hasText:/Dodajanje z dotikom/}).click();
const txt=async()=>(await p.evaluate(()=>document.body.innerText)).match(/Točk: \d+/)?.[0];
const pts=await p.evaluate(()=>[...document.querySelectorAll('#jgbox svg ellipse,#jgbox svg circle')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.x+r.width/2),Math.round(r.y+r.height/2),Math.round(r.width)]}));
console.log(JSON.stringify(pts));
const [a,bq]=[pts[0],pts[1]];
const mx=(a[0]+bq[0])/2,my=(a[1]+bq[1])/2;
await p.mouse.click(mx+80,my+80);await p.waitForTimeout(400);console.log('mouse click off-polygon',await txt());
await p.touchscreen.tap(mx,my);await p.waitForTimeout(500);console.log('tap on edge P1-P2',mx,my,await txt());
console.log(errs);
}finally{await b.close()}})();
