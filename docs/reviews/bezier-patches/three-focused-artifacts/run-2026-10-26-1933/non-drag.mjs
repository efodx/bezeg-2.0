import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const root = process.cwd(), out = path.join(root,"docs/reviews/bezier-patches/three-focused-artifacts/run-2026-10-26-1933");
const url = "http://127.0.0.1:4181/docs/prototypes/bezier-patches/three.html";
const r = {checks:[], screenshots:[], downloads:[], errors:[]};
async function checkpoint(name,status,evidence) {
  const row = {name,status,evidence};
  r.checks.push(row);
  const file = path.join(out,"checkpoint-" + String(r.checks.length).padStart(2,"0") + ".json");
  await fs.writeFile(file,JSON.stringify({row,checks:r.checks},null,2));
}
async function screenshot(page,name) {
  const file=path.join(out,name); await page.screenshot({path:file,fullPage:true}); r.screenshots.push(path.relative(root,file)); return file;
}
async function snap(page){return page.evaluate(()=>window.BezierPatchSpike.snapshot());}
function need(ok,msg){if(!ok)throw Error(msg);}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  const page=await context.newPage();
  page.on("pageerror",e=>r.errors.push(e.message));
  page.on("console",m=>{if(m.type()==="error")r.errors.push("console: "+m.text());});
  await page.goto(url,{waitUntil:"networkidle",timeout:20000});
  await page.waitForFunction(()=>window.BezierPatchSpike&&window.BezierPatchSpike.ready(),null,{timeout:15000});

  try{
    const views={};
    for(const name of ["front","top","side","isometric"]){
      await page.locator('[data-view="'+name+'"]').click(); await page.waitForTimeout(60);
      const s=await snap(page); views[name]=s.camera;
      need(s.counts&&typeof s.counts.meshTriangles==="number"&&s.counts.meshTriangles>0,"rendered data missing at "+name);
      await screenshot(page,"view-"+name+".png");
    }
    await checkpoint("Four preset views and depth screenshots","passed",{cameras:views,files:r.screenshots.slice(-4)});
  }catch(e){await checkpoint("Four preset views and depth screenshots","failed",e.message);}

  try{
    await page.locator("#stress").click();
    await page.waitForFunction(()=>window.BezierPatchSpike.snapshot().kind==="teapot",null,{timeout:6000});
    const s=await snap(page);
    need(s.counts&&typeof s.counts.teapotPatches==="number"&&s.counts.teapotPatches===32&&s.counts.meshTriangles>0,"missing/null 32-patch teapot render data");
    await screenshot(page,"actual-32-patch-teapot.png");
    await checkpoint("Actual 32-patch teapot","passed",{patches:s.counts.teapotPatches,meshTriangles:s.counts.meshTriangles,drawCalls:s.counts.drawCalls});
  }catch(e){await checkpoint("Actual 32-patch teapot","failed",e.message);}

  try{
    await page.locator("#kind").selectOption("tensor");
    let dlP=page.waitForEvent("download");await page.locator("#export-svg").click();let dl=await dlP;
    let svgPath=path.join(out,"downloads","bezier-patch-three.svg");await dl.saveAs(svgPath);
    let svg=await fs.readFile(svgPath,"utf8");
    need(svg.includes("<polygon")&&svg.includes("<polyline"),"SVG has no surface/line geometry");
    need(svg.includes("<text")&&svg.includes("P(u,v)"),"SVG label text missing");
    dlP=page.waitForEvent("download");await page.locator("#export-png").click();dl=await dlP;
    let pngPath=path.join(out,"downloads","bezier-patch-three.png");await dl.saveAs(pngPath);
    const png=await fs.readFile(pngPath);
    need(png.subarray(0,8).toString("hex")==="89504e470d0a1a0a"&&png.readUInt32BE(16)>0&&png.readUInt32BE(20)>0,"PNG missing or invalid");
    r.downloads.push(path.relative(root,svgPath),path.relative(root,pngPath));
    await checkpoint("SVG and PNG downloads with labels","passed",{svgBytes:Buffer.byteLength(svg),svgLabelCount:(svg.match(/<text/g)||[]).length,pngBytes:png.length,pngSize:[png.readUInt32BE(16),png.readUInt32BE(20)]});
  }catch(e){await checkpoint("SVG and PNG downloads with labels","failed",e.message);}

  try{
    await page.locator("#presentation").click();
    const p=await page.evaluate(()=>({active:document.body.classList.contains("presentation"),aside:getComputedStyle(document.querySelector("aside")).display}));
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(120);
    const layout=await page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,board:document.querySelector("#main-board").getBoundingClientRect().toJSON(),canvas:document.querySelector("#main-board canvas").getBoundingClientRect().toJSON()}));
    await screenshot(page,"presentation-narrow-390.png");
    need(p.active&&p.aside==="none"&&layout.board.width>0&&layout.canvas.width>0,"presentation or resized graph missing");
    need(layout.scrollWidth<=layout.width,"390px viewport horizontal overflow");
    await checkpoint("Presentation, resize, and 390px viewport","passed",{presentation:p,layout});
  }catch(e){await checkpoint("Presentation, resize, and 390px viewport","failed",e.message);}

  try{
    await page.setViewportSize({width:1280,height:900});
    if(await page.evaluate(()=>document.body.classList.contains("presentation")))await page.locator("#presentation").click();
    await page.locator("#remount").click();
    await page.waitForFunction(()=>window.BezierPatchSpike.ready(),null,{timeout:8000});await page.waitForTimeout(80);
    let s=await snap(page), n=await page.locator("#main-board canvas").count();
    const before=s.camera; await page.locator('[data-view="front"]').click(); await page.waitForTimeout(70);
    const after=(await snap(page)).camera; await screenshot(page,"after-ui-remount.png");
    const firstResponded=JSON.stringify(before)!==JSON.stringify(after);
    const second=await page.evaluate(async()=>await window.BezierPatchSpike.remount());
    await page.waitForTimeout(80); const secondBefore=await snap(page);
    await page.locator('[data-view="top"]').click();await page.waitForTimeout(70);const secondAfter=await snap(page);
    await screenshot(page,"after-second-remount.png");
    need(n===1&&second.ready&&await page.locator("#main-board canvas").count()===1,"dispose/remount leaked or failed to mount renderer");
    need(firstResponded&&JSON.stringify(secondBefore.camera)!==JSON.stringify(secondAfter.camera),"preset toolbar stopped responding after remount");
    await checkpoint("Repeated dispose/remount and toolbar","passed",{firstReady:s.ready,secondReady:second.ready,canvasCount:1,firstToolbarResponded:firstResponded,secondToolbarResponded:true});
  }catch(e){await checkpoint("Repeated dispose/remount and toolbar","failed",e.message);}

  const race=await context.newPage();let releaseFetch,arrive;const arrived=new Promise(resolve=>{arrive=resolve;});const release=new Promise(resolve=>{releaseFetch=resolve;});let pageError="";
  race.on("pageerror",e=>{pageError=e.message;r.errors.push("race: "+e.message);});
  await race.route("**/teapot-data.json",async route=>{arrive();await release;await route.continue();});
  try{
    await race.goto(url,{waitUntil:"domcontentloaded",timeout:15000});
    await Promise.race([arrived,new Promise((_,reject)=>setTimeout(()=>reject(Error("teapot-data request was not intercepted")),6000))]);
    await race.evaluate(()=>window.BezierPatchSpike.dispose());releaseFetch();await race.waitForTimeout(500);
    const status=await race.locator("#status").textContent();
    need(!(pageError||status.includes("Prototype failed")),"dispose during pending fetch caused setup error: "+(pageError||status));
    await checkpoint("Async setup/dispose race","passed",{pageError,status});
  }catch(e){releaseFetch();await checkpoint("Async setup/dispose race","failed",e.message);}
  await race.close();await context.close();await browser.close();
  r.errors=[...new Set(r.errors)];
  await fs.writeFile(path.join(out,"non-drag-summary.json"),JSON.stringify(r,null,2));
  console.log(JSON.stringify({checks:r.checks.map(x=>({name:x.name,status:x.status})),screenshots:r.screenshots.length,downloads:r.downloads,errors:r.errors}));
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});
