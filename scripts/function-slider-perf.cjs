// Frame-interval measurement for function/analysis lesson-free routes whose fill or construction depends on a dragged point:
//   node scripts/function-slider-perf.cjs      // PREVIEW_BASE_URL defaults to http://127.0.0.1:4311/bezeg-2.0
// Env: PERF_RUNS (default 3), PERF_STEPS (default 150), PERF_DRAG_MS (default 2000), PERF_CASE (substring filter on case name).
// Cases (desktop 1440x900, no CPU throttle): drag point b on /functions/integral and /functions/area-between and /analysis/darboux,
// drag point x on /analysis/accumulation. /analysis/bisection has no draggable object (all fixed), so the gesture is repeated
// clicks on the "next step" button (reset when it is exhausted); this is a click rate, not a drag, and a documented gap.
// The effect check compares a signature of the board's SVG geometry (path/polygon/rect/line/circle attributes) on the board before and after (fill/construction
// changed) and, for drags, the dragged point's screen position. Frames are sampled by rAF only inside the gesture.
// Exits non-zero if the effect check fails, < MIN_SAMPLES frames were sampled, or page errors occurred.
const {chromium} = require('playwright');

const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4311/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 3);
const steps = Number(process.env.PERF_STEPS || 150);
const dragMs = Number(process.env.PERF_DRAG_MS || 2000);
const MIN_SAMPLES = 60;
const WARMUP = 15;
const desktop = {width: 1440, height: 900}, phone = {width: 390, height: 844};
const cases = [
    {route: 'functions/integral', point: '$$b$$', dx: 200},
    {route: 'functions/area-between', point: '$$b$$', dx: -150},
    {route: 'analysis/accumulation', point: '$$x$$', dx: 250},
    {route: 'analysis/darboux', point: '$$b$$', dx: 200},
    {route: 'analysis/bisection', button: /Naslednji korak|Next step/},
];
const all = [];
for (const v of [{viewport: desktop, throttle: 1, label: 'desktop 1440x900, throttle 1'}, {viewport: phone, throttle: 4, label: '390x844, 4x CPU'}])
    for (const c of cases) all.push({...c, ...v, name: `${c.route} ${c.point ? 'drag ' + c.point : 'next-step clicks'} (${v.label})`});
cases.length = 0; cases.push(...all);

const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Runs in the page: board origin, a named point's screen position, and a geometry signature of the rendered board.
const readBoard = name => {
    const bd = Object.values(window.JXG.boards)[0];
    bd.containerObj.scrollIntoView({block: 'center'});
    const r = bd.containerObj.getBoundingClientRect();
    const pt = Object.values(bd.objects).find(o => o.elType === 'point' && o.name === name);
    const attrs = ['d', 'points', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'fill'];
    const sig = [...bd.containerObj.querySelectorAll('svg path, svg polygon, svg rect, svg line, svg circle, svg ellipse')]
        .map(e => attrs.map(k => e.getAttribute(k) || '').join(',')).join('|');
    let h = 0;
    for (let i = 0; i < sig.length; i++) h = (h * 31 + sig.charCodeAt(i)) | 0;
    return {rect: [r.x, r.y], pt: pt ? [pt.coords.scrCoords[1], pt.coords.scrCoords[2]] : null, sig: h, sigLen: sig.length};
};

async function runOnce(browser, c) {
    const context = await browser.newContext({viewport: c.viewport, deviceScaleFactor: 1});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', {rate: c.throttle});
        await page.goto(`${baseUrl}/${c.route}`, {waitUntil: 'load'});
        await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000});
        await page.waitForTimeout(2500);
        await page.evaluate(readBoard, c.point || '');
        await page.waitForTimeout(200);
        const s = await page.evaluate(readBoard, c.point || '');
        if (c.point && !s.pt) throw new Error(`point ${c.point} not found`);
        await page.evaluate(() => {
            window.__perf = {stamps: [], on: true};
            const tick = ts => { if (window.__perf.on) { window.__perf.stamps.push(ts); requestAnimationFrame(tick); } };
            requestAnimationFrame(tick);
        });
        let t0, t1;
        let sawChange = false;
        if (c.point) {
            const ox = s.rect[0], oy = s.rect[1];
            await page.mouse.move(ox + s.pt[0], oy + s.pt[1]);
            await page.mouse.down();
            t0 = await page.evaluate(() => performance.now());
            for (let i = 1; i <= steps; i++) {
                await page.mouse.move(ox + s.pt[0] + c.dx * i / steps, oy + s.pt[1]);
                await page.waitForTimeout(dragMs / steps);
            }
            t1 = await page.evaluate(() => performance.now());
            await page.mouse.up();
        } else {
            const next = page.getByRole('button', {name: c.button}).first();
            const reset = page.getByRole('button', {name: /Ponastavi iteracijo|Reset/}).first();
            t0 = await page.evaluate(() => performance.now());
            const clicks = 24;
            for (let i = 0; i < clicks; i++) {
                if (await next.isEnabled()) await next.click(); else await reset.click();
                await page.waitForTimeout(dragMs / clicks);
                if (i === 0 && (await page.evaluate(readBoard, '')).sig !== s.sig) sawChange = true;
            }
            t1 = await page.evaluate(() => performance.now());
        }
        const stamps = await page.evaluate(() => { window.__perf.on = false; return window.__perf.stamps; });
        const e = await page.evaluate(readBoard, c.point || '');
        let effect;
        if (c.point) {
            effect = Math.abs(e.pt[0] - s.pt[0]);
            if (!(effect > 20)) throw new Error(`point ${c.point} did not move (${effect} px)`);
            if (e.sig === s.sig) throw new Error('board geometry (fill/construction) did not change after the drag');
        } else {
            effect = sawChange ? 1 : 0;
            if (!sawChange) throw new Error('board geometry did not change after the first next-step click');
        }
        const iv = [];
        for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]);
        const samples = iv.slice(WARMUP);
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples (< ${MIN_SAMPLES})`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const sorted = [...samples].sort((a, b) => a - b);
        return {samples: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], effect};
    } finally {
        await context.close();
    }
}

(async () => {
    const browser = await chromium.launch();
    const summary = [];
    try {
        for (const c of cases) {
            if (process.env.PERF_CASE && !c.name.includes(process.env.PERF_CASE)) continue;
            const results = [];
            for (let r = 0; r < runs; r++) {
                let res;
                try { res = await runOnce(browser, c); } catch (err) { throw new Error(`${c.name} run ${r + 1}: ${err.message}`); }
                results.push(res);
                console.log(JSON.stringify({case: c.name, run: r + 1, ...Object.fromEntries(Object.entries(res).map(([k, v]) => [k, Math.round(v * 100) / 100]))}));
            }
            summary.push({name: c.name, median: median(results.map(x => x.median)), medMin: Math.min(...results.map(x => x.median)), medMax: Math.max(...results.map(x => x.median)),
                p95: median(results.map(x => x.p95)), p95Min: Math.min(...results.map(x => x.p95)), p95Max: Math.max(...results.map(x => x.p95)), samples: results.map(x => x.samples).join('/')});
        }
    } finally {
        await browser.close();
        console.log('\ncase | median ms (range) | p95 ms (range) | samples per run');
        for (const s of summary) console.log(`${s.name} | ${s.median.toFixed(1)} (${s.medMin.toFixed(1)}-${s.medMax.toFixed(1)}) | ${s.p95.toFixed(1)} (${s.p95Min.toFixed(1)}-${s.p95Max.toFixed(1)}) | ${s.samples}`);
    }
})().catch(err => { console.error(`function-slider-perf FAILED: ${err.message}`); process.exit(1); });
