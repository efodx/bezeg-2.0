// Scripted Playwright drag over the production benchmark bundle.
// Usage: node scripts/linear-map-benchmark/run.cjs [repeats=3] [results.json]
// Build first: node scripts/linear-map-benchmark/build.cjs
const os = require('os');
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {chromium} = require('@playwright/test');
const {serve} = require('./serve.cjs');

const repeats = Number(process.argv[2] || 3);
const outFile = process.argv[3];
const WARMUP = 60, STEPS = 240, RADIUS_PX = 70;
const VIEWPORT = {width: 1280, height: 800};
const configs = [
    {variant: 'lines', ellipse: 0}, {variant: 'poly', ellipse: 0},
    {variant: 'lines', ellipse: 1}, {variant: 'poly', ellipse: 1},
];
const percentile = (values, p) => { const s = [...values].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]; };
const sh = command => { try { return execSync(command, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim(); } catch { return 'unavailable'; } };
const raf = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())));

async function open(browser, config, port) {
    const page = await browser.newPage({viewport: VIEWPORT});
    await page.goto(`http://127.0.0.1:${port}/?variant=${config.variant}&ellipse=${config.ellipse}`);
    await page.waitForFunction(() => window.bench && window.bench.ready);
    await page.mouse.move(0, 0);
    return page;
}

async function dragRun(browser, config, port) {
    const page = await open(browser, config, port);
    const box = await page.evaluate(() => window.bench.box());
    const [sx, sy] = await page.evaluate(() => window.bench.handlePixel(1));
    const cx = box.x + sx, cy = box.y + sy;
    // Fixed path: a circle through the start pixel (centre one radius to the left), traced once per 240 steps.
    const at = i => { const a = (2 * Math.PI * i) / STEPS; return [cx - RADIUS_PX + RADIUS_PX * Math.cos(a), cy + RADIUS_PX * Math.sin(a)]; };
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= WARMUP; i++) { await page.mouse.move(...at(i)); await raf(page); }
    await page.evaluate(() => { window.bench.reset(); window.bench.stats.recording = true; });
    for (let i = 1; i <= STEPS; i++) { await page.mouse.move(...at(WARMUP + i)); await raf(page); }
    await page.evaluate(() => { window.bench.stats.recording = false; });
    await page.mouse.up();
    const r = await page.evaluate(() => ({s: window.bench.stats, gridCalls: window.bench.gridCalls(), elements: window.bench.elementCount, finite: window.bench.nonFiniteCount()}));
    await page.close();
    return {
        frameMedian: percentile(r.s.frames, 0.5), frameP95: percentile(r.s.frames, 0.95),
        updateMedian: percentile(r.s.updateMs, 0.5), updateP95: percentile(r.s.updateMs, 0.95),
        framesAbove20: r.s.frames.filter(f => f > 20).length, frames: r.s.frames.length,
        updates: r.s.updates, gridCalls: r.gridCalls, elements: r.elements, nonFinite: r.finite.nonFinite,
    };
}

async function singularChecks(browser, config, port) {
    const page = await open(browser, config, port);
    const results = {};
    const cases = {
        'e2 on e1 (rank 1)': [[2, 1], [2, 1]],
        'e2 = 2*e1 (rank 1)': [[2, 1], [4, 2]],
        'zero matrix': [[0, 0], [0, 0]],
        'e1 = 0 (rank 1)': [[0, 0], [-1, 2]],
        'huge e1 (1e6)': [[1e6, 1e6], [1, 0]],
        'huge e1 (1e12)': [[1e12, -1e12], [0.5, 1]],
    };
    for (const [name, [a, b]] of Object.entries(cases)) {
        await page.evaluate(([p, q]) => { window.bench.setHandle(1, ...p); window.bench.setHandle(2, ...q); }, [a, b]);
        results[name] = await page.evaluate(() => window.bench.nonFiniteCount());
    }
    // Real drag: pull e2 onto e1 with the mouse, then release exactly there.
    await page.evaluate(() => { window.bench.setHandle(1, 1.5, 0.5); window.bench.setHandle(2, -0.5, 1.25); });
    const box = await page.evaluate(() => window.bench.box());
    const [p2x, p2y] = await page.evaluate(() => window.bench.handlePixel(2));
    const [p1x, p1y] = await page.evaluate(() => window.bench.handlePixel(1));
    await page.mouse.move(box.x + p2x, box.y + p2y);
    await page.mouse.down();
    await page.mouse.move(box.x + p1x, box.y + p1y, {steps: 20});
    results['mouse drag e2 onto e1'] = await page.evaluate(() => window.bench.nonFiniteCount());
    await page.mouse.up();
    await page.close();
    return results;
}

(async () => {
    const server = await serve();
    const browser = await chromium.launch();
    const probe = await open(browser, configs[0], server.address().port);
    const idle = await probe.evaluate(() => new Promise(resolve => { const t = []; let last = performance.now(); const f = n => { t.push(n - last); last = n; t.length < 120 ? requestAnimationFrame(f) : resolve(t.slice(10)); }; requestAnimationFrame(f); }));
    await probe.close();
    const idleMedian = percentile(idle, 0.5);
    const environment = {
        commit: sh('git rev-parse --short HEAD') + (sh('git status --porcelain src') ? ' (src dirty)' : ''),
        browser: `Chromium ${browser.version()} (Playwright ${require('@playwright/test/package.json').version}, headless)`,
        cpu: os.cpus()[0].model + ` x${os.cpus().length}`, memoryGB: Math.round(os.totalmem() / 2 ** 30),
        gpu: sh('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name }) -join \'; \'"'),
        os: `${os.type()} ${os.release()}`, viewport: VIEWPORT, boardPx: '900x700',
        idleRafMedianMs: idleMedian, refreshHzEstimate: Math.round(1000 / idleMedian),
        steps: {warmup: WARMUP, recorded: STEPS, radiusPx: RADIUS_PX}, repeats,
    };
    const results = [];
    for (const config of configs) {
        const runs = [];
        for (let i = 0; i < repeats; i++) runs.push(await dragRun(browser, config, server.address().port));
        results.push({config, runs, singular: await singularChecks(browser, config, server.address().port)});
    }
    await browser.close();
    server.close();
    const out = {environment, results};
    if (outFile) fs.writeFileSync(path.resolve(outFile), JSON.stringify(out, null, 2));
    console.log(JSON.stringify(environment));
    const f = n => n.toFixed(2);
    console.log('| variant | ellipse | run | frame med | frame p95 | update med | update p95 | frames>20ms | updates | gridCalls | nonFinite |');
    for (const {config, runs} of results) runs.forEach((r, i) => console.log(`| ${config.variant} | ${config.ellipse} | ${i + 1} | ${f(r.frameMedian)} | ${f(r.frameP95)} | ${f(r.updateMedian)} | ${f(r.updateP95)} | ${r.framesAbove20}/${r.frames} | ${r.updates} | ${r.gridCalls} | ${r.nonFinite} |`));
    for (const {config, singular} of results) console.log(config.variant, config.ellipse, JSON.stringify(singular));
})().catch(error => { console.error(error); process.exitCode = 1; });
