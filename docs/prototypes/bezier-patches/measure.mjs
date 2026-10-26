// Run only after functional verification, with other browser/test work idle.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const out = resolve(process.env.BEZEG_MEASURE_OUT || '.command-logs/patches-measure');
const url = process.env.BEZEG_SPIKE_URL || 'http://127.0.0.1:4181/docs/prototypes/bezier-patches/';
const samples = Number(process.env.BEZEG_MEASURE_SAMPLES || 12);
const repeats = Number(process.env.BEZEG_MEASURE_REPEATS || 3);
if (!Number.isInteger(samples) || samples < 4 || !Number.isInteger(repeats) || repeats < 1) throw Error('Expected samples >=4 and repeats >=1');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { at: new Date().toISOString(), browser: browser.version(), cpu: os.cpus()[0]?.model, platform: os.platform(), url,
  samples,repeats,caveats: ['Headless desktop Chromium, not physical phone', 'rAF intervals and input-to-next-rAF are proxies; no compositor/pixel visibility claim', 'Programmatic u/v sweep exercises construction update, not pointer dispatch'], runs: [] };
const stats = a => {
  const sorted = [...a].sort((x,y) => x-y);
  return { count: a.length, median: sorted[Math.floor(sorted.length*.5)] ?? null, p95: sorted[Math.min(sorted.length-1, Math.floor(sorted.length*.95))] ?? null, max: sorted.at(-1) ?? null };
};
try {
  for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await page.waitForFunction(() => window.BezierPatchSpike?.ready());
    const version = await page.evaluate(() => JXG.version);
    if (version !== '1.14.1') throw Error(`Wrong runtime ${version}`);
    report.jsxgraph = version;
    for (const kind of ['tensor','triangular']) for (const iso of [8,16]) for (const tiling of [8,16]) {
      await page.locator('#kind').selectOption(kind);
      await page.locator('#triangle-renderer').selectOption(kind === 'triangular' ? 'mesh' : 'surface');
      await page.locator('#iso').selectOption(String(iso)); await page.locator('#tiling').selectOption(String(tiling));
      await page.waitForTimeout(200);
      for (const gesture of ['drag','orbit','uv']) for (let repeat=0;repeat<repeats;repeat++) {
        await page.evaluate(() => BezierPatchSpike.remount());
        await page.waitForFunction(() => BezierPatchSpike.ready());
        await page.evaluate(() => BezierPatchSpike.setParameter(.25,.3));
        await page.evaluate(() => BezierPatchSpike.camera('isometric'));
        await page.evaluate(() => {
          const board = Object.values(JXG.boards).find(b => b.containerObj.id === 'main-board');
          const original = board.update;
          window.__measure = { frames: [], input: [], updates: [], last: null, active: true };
          board.update = function(...args) { const t=performance.now(); try { return original.apply(this,args); } finally { __measure.updates.push(performance.now()-t); } };
          const tick = t => { const m=window.__measure; if(!m.active)return; if(m.last!==null)m.frames.push(t-m.last);m.last=t; requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
          window.__markInput = () => { const start=performance.now(); requestAnimationFrame(() => __measure.input.push(performance.now()-start)); };
          const onMove = e => { if(e.buttons) __markInput(); };
          board.containerObj.addEventListener('pointermove',onMove,true);
          __measure.restore = () => { board.update = original; board.containerObj.removeEventListener('pointermove',onMove,true); };
        });
        const before = await page.evaluate(() => BezierPatchSpike.snapshot());
        if (gesture === 'uv') {
          // Pace at display frames; update cost and the next frame both include real board work.
          // Save each operation as it completes, so a pathological sweep cannot erase evidence.
          const wall=[];
          for(let i=0;i<samples;i++) {
            const ms=await page.evaluate(async ({i,samples})=>{await new Promise(requestAnimationFrame);__markInput();const t=performance.now();BezierPatchSpike.setParameter(.15+.55*i/(samples-1),.15+.15*i/(samples-1));return performance.now()-t;},{i,samples});
            wall.push(ms);
            await writeFile(resolve(out,'uv-progress.json'),JSON.stringify({viewport,kind,iso,tiling,repeat,wall},null,2));
          }
        } else {
          const rect = gesture === 'drag' ? await page.evaluate(() => {
            const id=BezierPatchSpike.pointInfo(0).id;
            const board=Object.values(JXG.boards).find(b=>b.containerObj.id==='main-board');
            return board.objects[id].element2D.rendNode.getBoundingClientRect().toJSON();
          }) : await page.locator('#main-board').boundingBox();
          const x=gesture==='drag'?rect.x+rect.width/2:rect.x+rect.width-35;
          const y=gesture==='drag'?rect.y+rect.height/2:rect.y+35;
          await page.mouse.move(x,y); await page.mouse.down();
          for(let i=1;i<=samples;i++) {
            await page.evaluate(() => new Promise(requestAnimationFrame));
            await page.mouse.move(x+Math.sin(i/samples*Math.PI)*35,y+i/samples*28);
          }
          await page.mouse.up();
        }
        await page.evaluate(() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
        const after = await page.evaluate(() => BezierPatchSpike.snapshot());
        const raw = await page.evaluate(() => { const m=__measure;m.active=false;m.restore();return {frames:m.frames,input:m.input,updates:m.updates}; });
        const changed = gesture==='drag' ? before.net[0].some((x,i)=>Math.abs(x-after.net[0][i])>.001) : gesture==='orbit' ? JSON.stringify(before.camera)!==JSON.stringify(after.camera) : before.uv.some((x,i)=>Math.abs(x-after.uv[i])>.001);
        if(!changed || !raw.frames.length || !raw.updates.length) throw Error(`Empty/unchanged measurement ${kind}/${gesture}`);
        const entry = {viewport,kind,iso,tiling,gesture,repeat,counts:after.counts,changed, frames:stats(raw.frames),inputToNextRaf:stats(raw.input),boardUpdate:stats(raw.updates),raw};
        report.runs.push(entry);
        await writeFile(resolve(out,'measure.json'),JSON.stringify(report,null,2));
      }
    }
    if(errors.length)throw Error(errors.join('\n'));
    await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(out,'measure.json'),JSON.stringify(report,null,2)); }
console.log(JSON.stringify({out,runs:report.runs.length,browser:report.browser}));
