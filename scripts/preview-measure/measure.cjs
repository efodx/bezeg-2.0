// Measures the cost of a parameter preview, option A (pure geometry from the snapshot) against option B (a hidden shadow graph,
// cold and warm), on Taylor, De Casteljau and the phase portrait. Needs the Vite DEV server (the fixture page is absent from
// the production build): node scripts/preview-measure/measure.cjs --base http://127.0.0.1:4483/bezeg-2.0/ [--n 30] [--throttle 1,4]
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const arg = (name, fallback) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : fallback; };
const BASE = arg('base');
if (!BASE) { console.log('usage: measure.cjs --base <dev server url, ending in /> [--n 30] [--throttle 1,4] [--subjects taylor,decasteljau,phase-portrait]'); process.exit(2); }
const N = Math.max(1, +(arg('n', 30)));
const THROTTLES = String(arg('throttle', '1,4')).split(',').map(Number);
const SUBJECTS = arg('subjects') ? arg('subjects').split(',') : undefined;
const URL = BASE.replace(/\/?$/, '/') + 'fixtures/preview/';

// Same frame-gap and long-task collection as scripts/probe/probe.cjs INIT.
const INIT = () => {
  window.__m = {on: false, f: [], lt: [], start() { this.f = []; this.lt = []; this.on = true; }, stop() { this.on = false; return {f: this.f, lt: this.lt}; }};
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (window.__m.on) window.__m.lt.push(e.duration); }).observe({entryTypes: ['longtask']}); } catch (e) { /* unsupported */ }
  let last = performance.now();
  const loop = t => { if (window.__m.on) window.__m.f.push(t - last); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};

const sorted = xs => [...xs].sort((a, b) => a - b);
const pct = (xs, q) => { const s = sorted(xs); return s.length ? s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)] : 0; };
const stat = xs => ({median: +pct(xs, 0.5).toFixed(2), p95: +pct(xs, 0.95).toFixed(2), max: +Math.max(0, ...xs).toFixed(2)});

// In the page: n previews, one per animation frame, the value moving through the subject's sweep; returns per-call ms.
const RUN = async ({option, n, values}) => {
  const P = window.__preview;
  const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));
  if (option === 'B-warm') P.openWarm();
  await frame();
  const calls = [];
  window.__m.start();
  for (let i = 0; i < n; i++) {
    const value = values[i % values.length];
    const t0 = performance.now();
    if (option === 'A') P.geometry(value); else if (option === 'B-cold') P.captureShadow(value); else P.warm(value);
    calls.push(performance.now() - t0);
    await frame();
  }
  const m = window.__m.stop();
  if (option === 'B-warm') P.closeWarm();
  return {calls, gaps: m.f.slice(1), longtasks: m.lt, boards: P.boards()};
};

(async () => {
  const {chromium} = require(path.join(process.cwd(), 'node_modules', 'playwright'));
  const br = await chromium.launch();
  const rows = [];
  const errors = [];
  for (const rate of THROTTLES) {
    const ctx = await br.newContext({viewport: {width: 1000, height: 700}});
    await ctx.addInitScript(INIT);
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    await page.goto(URL);
    await page.waitForFunction(() => !!window.__preview, null, {timeout: 60000});
    const cdp = await ctx.newCDPSession(page);
    const subjects = (await page.evaluate(() => window.__preview.subjects())).filter(s => !SUBJECTS || SUBJECTS.includes(s.id));
    for (const subject of subjects) {
      await page.evaluate(id => window.__preview.open(id), subject.id);
      const baseline = await page.evaluate(() => window.__preview.boards());
      for (const option of ['A', 'B-cold', 'B-warm']) {
        await cdp.send('Emulation.setCPUThrottlingRate', {rate});
        const r = await page.evaluate(RUN, {option, n: N, values: subject.values});
        await cdp.send('Emulation.setCPUThrottlingRate', {rate: 1});
        rows.push({subject: subject.id, option, throttle: rate, n: N, call: stat(r.calls), gap: stat(r.gaps), longtasks: r.longtasks.length, longtaskMax: +Math.max(0, ...r.longtasks).toFixed(1), boardsAfter: r.boards - baseline});
      }
      await page.evaluate(() => window.__preview.close());
    }
    await ctx.close();
  }
  await br.close();

  const date = new Date().toISOString().slice(0, 10);
  const out = path.join(process.cwd(), 'docs', 'reviews', 'ux-picks-app-wide', 'measure');
  fs.mkdirSync(out, {recursive: true});
  const lines = [
    `# Preview options A and B, measured ${date}`,
    '',
    `Dev server ${BASE}, N = ${N} previews per cell, one per animation frame, value sweeping the subject's range. "call" is the time of one preview call (ms); "gap" is the frame gap during the run (ms); "boards +" is JSXGraph boards left over versus before (a leak if not 0).`,
    '',
    '| subject | option | CPU | call median | call p95 | gap median | gap p95 | gap max | long tasks (max ms) | boards + |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.subject} | ${r.option} | ${r.throttle}x | ${r.call.median} | ${r.call.p95} | ${r.gap.median} | ${r.gap.p95} | ${r.gap.max} | ${r.longtasks} (${r.longtaskMax}) | ${r.boardsAfter} |`),
    '',
    errors.length ? `Page errors (${errors.length}): ${[...new Set(errors)].slice(0, 5).join(' | ')}` : 'No page or console errors.',
    '',
    '```json',
    JSON.stringify({date, base: BASE, n: N, rows, errors: [...new Set(errors)]}, null, 1),
    '```',
    '',
  ];
  const file = path.join(out, `preview-${date}${process.env.PREVIEW_MEASURE_SUFFIX || ''}.md`);
  fs.writeFileSync(file, lines.join('\n'));
  console.log(lines.slice(4, 6 + rows.length).join('\n'));
  console.log(`written ${path.relative(process.cwd(), file)}`);
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
