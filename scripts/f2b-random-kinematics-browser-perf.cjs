// F2b simulation and kinematics browser timings on the production build.
//   PREVIEW_BASE_URL=http://127.0.0.1:4337/bezeg-2.0 node scripts/f2b-random-kinematics-browser-perf.cjs
// Profiles as f2b-geometry-browser-perf.cjs: desktop 1280x800 unthrottled; phone 390x844, 4x CPU (CDP), touch. PERF_RUNS (5) fresh contexts per case.
// Simulation: (a) edit to paint: n typed into the trials field, Enter; t0 is the Enter keydown, the end is the first rAF after the first board.update. Then (b) Play at the fastest stop time (100 ms)
// from 0: rAF intervals (first 3 dropped) and the duration of every board.update call; the last stop is the whole run, so the largest update duration is the whole-run cost.
// Kinematics: Play rAF intervals for PLAY_MS (2500) ms; slider scrub (60 moves over 1 s, mouse drag or CDP touch on the range input) and keyboard scrub (60 ArrowRight presses, 16 ms apart).
// The UI is Slovenian (default language): the Play button is named "Predvajaj".
const {chromium} = require('playwright');
const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4337/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 5), steps = 60, PLAY_MS = 2500;
const profiles = [
    {name: 'desktop', width: 1280, height: 800, touch: false, cpu: 1},
    {name: 'phone 4x', width: 390, height: 844, touch: true, cpu: 4},
];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (s, q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
const open = async (page, route) => {
    await page.goto(`${baseUrl}/${route}`, {waitUntil: 'load'});
    await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000});
    await page.waitForTimeout(1500);
};
const instrument = () => {
    const bd = Object.values(window.JXG.boards)[0];
    const P = window.__perf = {stamps: [], on: false, updates: [], t0: 0, firstPaint: null, pending: false, long: []};
    const u = bd.update;
    bd.update = function (...a) {
        const s = performance.now(); const r = u.apply(this, a); const d = performance.now() - s; P.updates.push([s, d]);
        if (P.pending) { P.pending = false; requestAnimationFrame(ts => { P.firstPaint = ts - P.t0; }); }
        return r;
    };
    document.addEventListener('keydown', e => { if (e.key === 'Enter') { P.t0 = performance.now(); P.pending = true; P.firstPaint = null; } }, true);
    new PerformanceObserver(l => { for (const e of l.getEntries()) P.long.push([e.startTime, e.duration]); }).observe({entryTypes: ['longtask']});
    const tick = ts => { if (P.on) P.stamps.push(ts); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
};
const startWindow = page => page.evaluate(() => { const P = window.__perf; P.stamps = []; P.updates = []; P.long = []; P.on = true; return performance.now(); });
const endWindow = (page, t0) => page.evaluate(t0 => {
    const P = window.__perf; P.on = false; const t1 = performance.now(); const iv = [];
    for (let i = 1; i < P.stamps.length; i++) if (P.stamps[i - 1] >= t0 && P.stamps[i] <= t1) iv.push(P.stamps[i] - P.stamps[i - 1]);
    return {iv: iv.slice(3), upd: P.updates.filter(x => x[0] >= t0).map(x => x[1]), long: P.long.map(x => x[1])};
}, t0);
const frameStats = r => {
    const s = [...r.iv].sort((a, b) => a - b), u = [...r.upd].sort((a, b) => a - b);
    return {n: s.length, median: median(r.iv), p95: pct(s, 0.95), max: s[s.length - 1] ?? 0, dropped: r.iv.filter(x => x > 25).length, updates: u.length, updMedian: u.length ? median(u) : 0, updMax: u.length ? u[u.length - 1] : 0, longMax: Math.max(0, ...(r.long || [0]))};
};
async function withPage(browser, p, route, fn) {
    const context = await browser.newContext({viewport: {width: p.width, height: p.height}, deviceScaleFactor: 1, hasTouch: p.touch, isMobile: p.touch});
    try {
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        const cdp = await context.newCDPSession(page);
        await open(page, route);
        await page.evaluate(instrument);
        if (p.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', {rate: p.cpu});
        const out = await fn(page, cdp);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        return out;
    } finally { await context.close(); }
}
const modeCases = [['galton', 10000], ['galton', 100000], ['frequency', 10000], ['area', 10000], ['area', 100000], ['markov', 100000]];
async function simRun(browser, p, mode, n) {
    return withPage(browser, p, 'probability/simulation', async page => {
        if (mode !== 'galton') { await page.locator('select').nth(1).selectOption(mode); await page.waitForTimeout(500); }
        const field = page.locator('input[type=text]').nth(1);
        await page.waitForTimeout(500);
        await field.fill(String(n)); await field.press('Enter');
        await page.waitForFunction(() => window.__perf.firstPaint !== null, null, {timeout: 4000}).catch(() => {});
        const first = await page.evaluate(() => window.__perf.firstPaint ?? -1);
        await page.waitForTimeout(800);
        const speed = page.locator(`xpath=(//input[@type="range"])[1]/preceding::input[@type="text"][1]`);
        await speed.fill('100'); await speed.press('Enter'); await page.waitForTimeout(500);
        await page.evaluate(() => { window.__perf.pending = false; });
        const t0 = await startWindow(page);
        await page.getByRole('button', {name: /Predvajaj/}).click();
        await page.waitForTimeout(4500);
        const st = frameStats(await endWindow(page, t0));
        return {first, ...st};
    });
}
async function kinRun(browser, p, motion, kind) {
    return withPage(browser, p, 'curve-geometry/kinematics', async (page, cdp) => {
        if (motion !== 'cycloid') { await page.locator('select').nth(1).selectOption(motion); await page.waitForTimeout(800); }
        const range = page.locator('input[type=range]').first();
        await range.scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
        if (kind === 'play') {
            const t0 = await startWindow(page);
            await page.getByRole('button', {name: /Predvajaj/}).click();
            await page.waitForTimeout(PLAY_MS);
            return frameStats(await endWindow(page, t0));
        }
        if (kind === 'keyboard') {
            await range.focus();
            const t0 = await startWindow(page);
            for (let i = 0; i < steps; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(16); }
            return frameStats(await endWindow(page, t0));
        }
        const b = await range.boundingBox();
        const y = b.y + b.height / 2, x0 = b.x + 4, x1 = b.x + b.width - 4;
        const send = (type, x) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
        if (p.touch) await send('touchStart', x0); else { await page.mouse.move(x0, y); await page.mouse.down(); }
        const t0 = await startWindow(page);
        for (let i = 1; i <= steps; i++) {
            const x = x0 + (x1 - x0) * i / steps;
            if (p.touch) await send('touchMove', x); else await page.mouse.move(x, y);
            await page.waitForTimeout(1000 / steps);
        }
        const r = await endWindow(page, t0);
        if (p.touch) await send('touchEnd'); else await page.mouse.up();
        const v = Number(await range.inputValue()); if (!(v > 0)) throw new Error('scrub moved nothing');
        return frameStats(r);
    });
}
const line = (label, rs) => {
    const f = (k, d = 1) => rs.map(x => x[k].toFixed(d)).join(' ');
    return `${label} | ${rs[0].first !== undefined ? `edit-to-paint ${rs.map(x => x.first.toFixed(0)).join(' ')} ms (-1: no change) | ` : ''}frame median/run ${f('median')} | p95/run ${f('p95')} | max ${Math.max(...rs.map(x => x.max)).toFixed(1)} | >25ms/run ${rs.map(x => x.dropped).join('/')} | frames/run ${rs.map(x => x.n).join('/')} | updates/run ${rs.map(x => x.updates).join('/')} | update median/run ${f('updMedian')} | update max/run ${f('updMax')} | longest long task/run ${f('longMax', 0)}`;
};
(async () => {
    const browser = await chromium.launch();
    console.log('browser', browser.version(), 'runs', runs);
    try {
        for (const p of profiles) {
            for (const [mode, n] of modeCases) {
                const rs = [];
                for (let r = 0; r < runs; r++) rs.push(await simRun(browser, p, mode, n).catch(e => { throw new Error(`${p.name} ${mode} ${n} run ${r + 1}: ${e.message}`, {cause: e}); }));
                console.log(line(`${p.name} | simulation ${mode} n=${n}`, rs));
            }
            for (const motion of ['cycloid', 'projectile']) for (const kind of ['play', 'slider', 'keyboard']) {
                const rs = [];
                for (let r = 0; r < runs; r++) rs.push(await kinRun(browser, p, motion, kind).catch(e => { throw new Error(`${p.name} ${motion} ${kind} run ${r + 1}: ${e.message}`, {cause: e}); }));
                console.log(line(`${p.name} | kinematics ${motion} ${kind}`, rs));
            }
        }
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
