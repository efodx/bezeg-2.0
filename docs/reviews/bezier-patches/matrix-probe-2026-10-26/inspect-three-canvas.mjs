import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire('C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg/.command-logs/patches-acceptance/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:4181/docs/prototypes/bezier-patches/three.html');
  await page.waitForFunction(() => window.BezierPatchSpike?.ready());
  await page.evaluate(async () => {
    const set = (id, value) => { const e = document.querySelector(`#${id}`); e.value = value; e.dispatchEvent(new Event('change', { bubbles: true })); };
    set('kind', 'triangular'); set('iso', '8'); set('tiling', '8');
    for (const id of ['show-net', 'show-iso']) { const e=document.querySelector(`#${id}`); e.checked=false; e.dispatchEvent(new Event('change',{bubbles:true})); }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  const detail = await page.evaluate(async () => {
    const board=document.querySelector('#main-board'), canvas=board.querySelector('canvas'), label=[...document.querySelectorAll('#labels .scene-label')].find(e=>e.textContent==='P(u,v)');
    const gl=canvas.getContext('webgl2')||canvas.getContext('webgl'), px=new Uint8Array(canvas.width*canvas.height*4); gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,px);
    let min=[255,255,255],max=[0,0,0],colored=0; for(let i=0;i<px.length;i+=4){for(let d=0;d<3;d++){min[d]=Math.min(min[d],px[i+d]);max[d]=Math.max(max[d],px[i+d]);} if(px[i]<250||px[i+1]<246||px[i+2]<238)colored++;}
    const sample=(x,y)=>{const ix=Math.round(x),iy=canvas.height-1-Math.round(y),i=(iy*canvas.width+ix)*4;return [...px.slice(i,i+4)];};
    return {board:board.getBoundingClientRect().toJSON(),canvas:canvas.getBoundingClientRect().toJSON(),canvasSize:[canvas.width,canvas.height],dpr:devicePixelRatio,label:{text:label?.textContent,style:{left:label?.style.left,top:label?.style.top,display:label?getComputedStyle(label).display:null,visibility:label?getComputedStyle(label).visibility:null},rect:label?.getBoundingClientRect().toJSON()},counts:BezierPatchSpike.counts(),min,max,colored,samples:[[592,475],[592*devicePixelRatio,475*devicePixelRatio],[canvas.width/2,canvas.height/2]].map(([x,y])=>({x,y,color:sample(x,y)}))};
  });
  await page.screenshot({ path: resolve('C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg/docs/reviews/bezier-patches/matrix-probe-2026-10-26/triangle-canvas.png') });
  console.log(JSON.stringify(detail,null,2));
} finally { await browser.close(); }
