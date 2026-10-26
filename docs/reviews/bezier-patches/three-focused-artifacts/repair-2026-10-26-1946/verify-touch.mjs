import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true});
const results=[];
try {
  for(const kind of ['tensor','triangular']) {
    const context=await browser.newContext({viewport:{width:1280,height:900},hasTouch:true});
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:4181/docs/prototypes/bezier-patches/three.html');
    await page.waitForFunction(()=>BezierPatchSpike.ready());
    await page.selectOption('#kind',kind);
    await page.check('#z-mode');
    await page.waitForTimeout(100);
    const before=await page.evaluate(()=>BezierPatchSpike.snapshot());
    const target=await page.locator('#labels').evaluate(host=>{const label=[...host.children].find(e=>e.textContent==='1');const r=label.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...target,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:target.x,y:target.y-40,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(100);
    const after=await page.evaluate(()=>BezierPatchSpike.snapshot());
    const deltas=after.net.map((p,i)=>p.map((x,d)=>x-before.net[i][d]));
    const passed=Math.abs(deltas[0][2])>1e-5&&Math.hypot(...deltas[0].slice(0,2))<1e-8&&JSON.stringify(before.camera)===JSON.stringify(after.camera);
    results.push({kind,target,before,after,deltas,passed});
    await context.close();
  }
} finally {await browser.close();await writeFile('.command-logs/patches-three-recheck/touch.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results.map(({kind,deltas,passed})=>({kind,deltas,passed}))));
