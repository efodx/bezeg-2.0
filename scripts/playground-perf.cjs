// Frame-interval measurement for the Bezier drawing playground (spec criterion 5):
//   just build; just preview 4312   (other terminal)
//   node scripts/playground-perf.cjs            # PREVIEW_BASE_URL defaults to http://127.0.0.1:4312/bezeg-2.0
// Env: PERF_RUNS (default 3), PERF_STEPS (default 150), PERF_CASE (e.g. 3 or 1,2; default all), PERF_DRAG_MS (default 2000), PERF_BREAK_SEED=1 (failure demonstration: seeds a bad drawing).
// Prints one JSON line per run and a summary table; exits non-zero if the seeded drawing does not load or < 60 frames were sampled.
const {chromium} = require('playwright');

const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4312/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 3);
const steps = Number(process.env.PERF_STEPS || 150);
const dragMs = Number(process.env.PERF_DRAG_MS || 2000);
const MIN_SAMPLES = 60;
const WARMUP = 15;
const KEY = 'bezeg-2.0:bezier-playground.drawing.v1'; // app storage prefix + key from DrawingPlayground.tsx

function seedDrawing() {
    const anchors = [];
    for (let i = 0; i < 20; i++) {
        const a = 2 * Math.PI * i / 20;
        const p = {x: 500 + 400 * Math.cos(a), y: 312 + 230 * Math.sin(a)};
        const tx = -400 * Math.sin(a), ty = 230 * Math.cos(a), len = Math.hypot(tx, ty);
        // Aligned (not mirrored) smooth anchors: a long out handle (grabbable at phone scale, beyond 1.5 hit radii) and a short in
        // handle (not grabbable), so no neighbouring hit circle covers the dragged out handle.
        const hi = 25 / len, ho = 55 / len;
        anchors.push({position: p, handleIn: {x: p.x - tx * hi, y: p.y - ty * hi}, handleOut: {x: p.x + tx * ho, y: p.y + ty * ho}, type: 'smooth-aligned'});
    }
    return {anchors, closed: true};
}

const cases = [
    {name: 'draw, no overlays, desktop', block: 'draw', viewport: {width: 1440, height: 900}, throttle: 1},
    {name: 'inspect, all overlays, desktop', block: 'inspect', viewport: {width: 1440, height: 900}, throttle: 1},
    {name: 'draw, no overlays, 390x844 4x CPU', block: 'draw', viewport: {width: 390, height: 844}, throttle: 4},
    {name: 'inspect, all overlays, 390x844 4x CPU', block: 'inspect', viewport: {width: 390, height: 844}, throttle: 4},
];

const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

async function runOnce(browser, c) {
    const context = await browser.newContext({viewport: c.viewport, deviceScaleFactor: 1});
    try {
        const seed = process.env.PERF_BREAK_SEED ? '{"anchors":"broken"}' : JSON.stringify(seedDrawing());
        await context.addInitScript(([k, v]) => { window.localStorage.setItem(k, v); }, [KEY, seed]);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', {rate: c.throttle});
        await page.goto(`${baseUrl}/learn/bezier-curves`, {waitUntil: 'load'});
        const root = page.locator(`.playground--${c.block}`).first();
        await root.waitFor({timeout: 20000});
        await root.scrollIntoViewIfNeeded();
        const anchorCount = await root.locator('[data-role="anchor"]').count();
        if (anchorCount !== 20) throw new Error(`seeded drawing did not load: ${anchorCount} anchors rendered, expected 20`);
        if (c.block === 'inspect') {
            const boxes = root.locator('.lu-switches input[type="checkbox"]');
            const n = await boxes.count();
            if (n !== 4) throw new Error(`expected 4 overlay switches, found ${n}`);
            for (let i = 0; i < n; i++) if (!(await boxes.nth(i).isChecked())) await boxes.nth(i).check();
            if ((await root.locator('[data-overlay="single"]').count()) !== 1) throw new Error('one-curve overlay not rendered');
        } else if ((await root.locator('[data-overlay]').count()) !== 0) throw new Error('draw block unexpectedly shows overlays');
        const dot = root.locator('[data-role="handle-out"][data-index="3"] .playground-handle__dot');
        await dot.scrollIntoViewIfNeeded();
        const box = await dot.boundingBox();
        if (!box) throw new Error('handle not found');
        const sx = box.x + box.width / 2, sy = box.y + box.height / 2;
        await page.waitForTimeout(500);
        await page.evaluate(() => {
            window.__perf = {stamps: [], on: true};
            const tick = ts => { if (window.__perf.on) { window.__perf.stamps.push(ts); requestAnimationFrame(tick); } };
            requestAnimationFrame(tick);
        });
        await page.mouse.move(sx, sy);
        await page.mouse.down();
        const t0 = await page.evaluate(() => performance.now());
        const radius = 18;
        for (let i = 1; i <= steps; i++) {
            const a = 2 * Math.PI * i / steps * 1.5;
            await page.mouse.move(sx + radius * (Math.cos(a) - 1) * 1.0, sy + radius * Math.sin(a));
            await page.waitForTimeout(dragMs / steps);
        }
        const t1 = await page.evaluate(() => performance.now());
        await page.mouse.up();
        const stamps = await page.evaluate(() => { window.__perf.on = false; return window.__perf.stamps; });
        if (process.env.PERF_DEBUG_SHOT) await page.screenshot({path: process.env.PERF_DEBUG_SHOT});
        const after = await dot.boundingBox();
        if (!after || Math.hypot(after.x - box.x, after.y - box.y) < 3) throw new Error('the dragged handle did not move; the drag did not edit the drawing');
        const iv = [];
        for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]); // frames inside the drag only
        const samples = iv.slice(WARMUP);
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples (< ${MIN_SAMPLES})`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const sorted = [...samples].sort((a, b) => a - b);
        return {samples: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1]};
    } finally {
        await context.close();
    }
}

(async () => {
    const browser = await chromium.launch();
    const summary = [];
    try {
        for (const [ci, c] of cases.entries()) {
            if (process.env.PERF_CASE && !process.env.PERF_CASE.split(',').includes(String(ci + 1))) continue;
            const results = [];
            for (let r = 0; r < runs; r++) {
                const res = await runOnce(browser, c);
                results.push(res);
                console.log(JSON.stringify({case: c.name, run: r + 1, ...Object.fromEntries(Object.entries(res).map(([k, v]) => [k, Math.round(v * 100) / 100]))}));
            }
            summary.push({name: c.name, median: median(results.map(x => x.median)), medMin: Math.min(...results.map(x => x.median)), medMax: Math.max(...results.map(x => x.median)),
                p95: median(results.map(x => x.p95)), p95Min: Math.min(...results.map(x => x.p95)), p95Max: Math.max(...results.map(x => x.p95)), samples: results.map(x => x.samples).join('/')});
        }
    } finally {
        await browser.close();
    }
    console.log('\ncase | median ms (range) | p95 ms (range) | samples per run');
    for (const s of summary) console.log(`${s.name} | ${s.median.toFixed(1)} (${s.medMin.toFixed(1)}-${s.medMax.toFixed(1)}) | ${s.p95.toFixed(1)} (${s.p95Min.toFixed(1)}-${s.p95Max.toFixed(1)}) | ${s.samples}`);
})().catch(err => { console.error(`playground-perf FAILED: ${err.message}`); process.exit(1); });
