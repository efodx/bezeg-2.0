// Part of the 03D record (docs/reviews/jsxgraph-surface-view/handler-handoff-3.md). Serve a build on 127.0.0.1:<port> first.
// Sustained orbit rate: real mouse moves sent back to back (no rAF gating) for ~2 s; counts frames that presented a draw.
// usage: node rate.mjs <port> <kind: teapot|tensor> [density] [viewport: desktop|narrow]
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const [port, kind, density = '16', vpName = 'desktop'] = process.argv.slice(2);
const vp = vpName === 'narrow' ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
const browser = await chromium.launch();
const results = [];
for (let rep = 0; rep < 3; rep++) {
  const context = await browser.newContext({ viewport: vp });
  await context.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/bezeg-2.0/patches/${kind === 'teapot' ? 'joins' : kind}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('[role="application"] polyline').length > 20);
  if (kind === 'teapot') {
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.locator('[data-join-scene="join-teapot"]').click();
    await page.locator('.patch-join-capstone').waitFor({ state: 'visible' });
  } else {
    await page.getByRole('button', { name: 'Display', exact: true }).click();
    for (const label of ['Control net', 'Iso-curves', 'Boundary curves', 'Shaded patch']) { const b = page.getByLabel(label, { exact: true }); if (!(await b.isChecked())) await b.setChecked(true); }
    for (const label of ['Iso-curves per direction', 'Shading detail']) await page.getByLabel(label, { exact: true }).selectOption(density);
  }
  await page.waitForTimeout(800);
  await page.locator('[role="application"]').scrollIntoViewIfNeeded();
  const box = await page.locator('[role="application"]').boundingBox();
  const x0 = Math.min(box.x + box.width, vp.width) - 34, y0 = Math.max(box.y, 0) + 34;
  await page.evaluate(() => {
    const host = document.querySelector('[role="application"]');
    const p = window.__rate = { ticks: [], muts: [], on: true };
    const tick = () => { if (!p.on) return; p.ticks.push(performance.now()); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    p.mo = new MutationObserver(() => p.muts.push(performance.now()));
    p.mo.observe(host, { subtree: true, attributes: true, attributeFilter: ['points'] });
  });
  await page.mouse.move(x0, y0); await page.mouse.down();
  const t0 = Date.now(); let i = 0;
  while (Date.now() - t0 < 2000) { i++; await page.mouse.move(x0 - (i % 200) * 2, y0 + (i % 100) * 2); }
  await page.mouse.up();
  const r = await page.evaluate(([dur]) => {
    const p = window.__rate; p.on = false; p.mo.disconnect();
    const end = p.ticks[0] + dur; const ticks = p.ticks.filter(t => t <= end);
    // frames whose preceding interval contained a draw
    let drawn = 0; for (let k = 1; k < ticks.length; k++) if (p.muts.some(m => m > ticks[k - 1] && m <= ticks[k])) drawn++;
    const iv = ticks.slice(1).map((t, k) => t - ticks[k]).sort((a, b) => a - b);
    return { seconds: (ticks.at(-1) - ticks[0]) / 1000, frames: ticks.length - 1, drawnFrames: drawn, intervalMedian: iv[iv.length >> 1], intervalP95: iv[Math.floor(iv.length * 0.95)] };
  }, [2000]);
  r.moves = i; r.drawsPerSecond = +(r.drawnFrames / r.seconds).toFixed(1);
  results.push(r);
  await context.close();
}
await browser.close();
console.log(JSON.stringify({ port, kind, density, vpName, results }));
