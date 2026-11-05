// Dragging measurement of the curvature Demonstration on the production preview (curve-geometry CG-B1-6, spec "Performance gate"):
//   node scripts/curvature-browser-perf.cjs     // PREVIEW_BASE_URL defaults to http://127.0.0.1:4314/bezeg-2.0
// Method of fourier-browser-perf.cjs (rAF sampling only inside the interaction), plus the time spent in board.update, because a frame interval
// cannot show work that fits inside one frame. The overlay's cost is the lesson cubic with the overlay hidden against the same cubic with it
// shown; /bezier/curve is the plain Bezier baseline. Env: PERF_RUNS, PERF_STEPS, PERF_DRAG_MS.
const {chromium} = require('playwright');
const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4314/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 3), steps = Number(process.env.PERF_STEPS || 150), dragMs = Number(process.env.PERF_DRAG_MS || 2000);
const MIN_SAMPLES = 60, WARMUP = 15, THROTTLE = 4;
const LESSON = 'curve-geometry/curvature?example=lesson.curve-geometry.curve-curvature.curve-curvature';
const plain = {name: 'baseline /bezier/curve, default', route: 'bezier/curve', kind: 'drag'};
const hidden = {name: 'lesson cubic, overlay hidden', route: LESSON, kind: 'drag', overlay: false};
const shown = {name: 'lesson cubic, frame and circle shown', route: LESSON, kind: 'drag', overlay: true};
const free = {name: 'free route parabola, frame and circle shown', route: 'curve-geometry/curvature', kind: 'drag', overlay: true};
const cases = [
    plain, hidden, shown, free,
    {...plain, name: `${plain.name}, CPU /${THROTTLE}`, throttle: THROTTLE},
    {...hidden, name: `${hidden.name}, CPU /${THROTTLE}`, throttle: THROTTLE},
    {...shown, name: `${shown.name}, CPU /${THROTTLE}`, throttle: THROTTLE},
    {...shown, name: `${shown.name}, 1920 px`, width: 1920, height: 1080},
    {name: 'free route t sweep 0 to 1', route: 'curve-geometry/curvature', kind: 'sweep', overlay: true},
];
const pct = (s, q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const readBoard = () => {
    const boards = Object.values(window.JXG.boards), bd = boards[boards.length - 1];
    bd.containerObj.scrollIntoView({block: 'center'});
    const r = bd.containerObj.getBoundingClientRect();
    const shownObject = o => o.visProp.visible !== false && o.visPropCalc.visible;
    const free = Object.values(bd.objects).filter(o => o.elType === 'point' && shownObject(o) && !o.visProp.fixed);
    // Only points the pointer can reach: the lesson card may cover part of the board.
    const pts = free.map(o => [o.coords.scrCoords[1], o.coords.scrCoords[2]])
        .filter(([x, y]) => bd.containerObj.contains(document.elementFromPoint(r.x + x, r.y + y)));
    return {rect: [r.x, r.y], size: [r.width, r.height], pts, freePoints: free.length,
        circles: Object.values(bd.objects).filter(o => o.elType === 'circle' && shownObject(o)).length,
        objects: Object.keys(bd.objects).length};
};
const startSampling = page => page.evaluate(() => {
    const boards = Object.values(window.JXG.boards), bd = boards[boards.length - 1];
    window.__perf = {stamps: [], updates: [], on: true};
    const update = bd.update;
    bd.update = function timedUpdate(...args) {
        const start = performance.now(), result = update.apply(this, args);
        if (window.__perf.on) window.__perf.updates.push(performance.now() - start);
        return result;
    };
    const tick = ts => { if (window.__perf.on) { window.__perf.stamps.push(ts); requestAnimationFrame(tick); } };
    requestAnimationFrame(tick);
});
const stopSampling = page => page.evaluate(() => { window.__perf.on = false; return window.__perf; });
const intervals = (stamps, t0, t1) => { const iv = []; for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]); return iv; };

/** Walks the lesson forward until the osculating circle is visible, the first step that shows the whole overlay. */
async function showOverlay(page) {
    for (let clicks = 0; clicks < 12; clicks++) {
        if ((await page.evaluate(readBoard)).circles > 0) return;
        await page.locator('section.guided-lesson .guided-lesson-nav-next').click();
        await page.waitForTimeout(400);
    }
    throw new Error('no lesson step showed the osculating circle');
}

async function runOnce(browser, c) {
    const context = await browser.newContext({viewport: {width: c.width || 1440, height: c.height || 900}, deviceScaleFactor: 1});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto(`${baseUrl}/${c.route}`, {waitUntil: 'load'});
        await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000});
        await page.waitForTimeout(2000);
        if (c.overlay && c.route === LESSON) await showOverlay(page);
        // The lesson card covers the board's middle; a learner hides it to drag.
        if (c.route === LESSON) { await page.locator('section.guided-lesson').getByRole('button', {name: /^(Hide|Skrij)/}).first().click(); await page.waitForTimeout(400); }
        await page.evaluate(readBoard); await page.waitForTimeout(600);
        const s = await page.evaluate(readBoard);
        if (c.overlay !== undefined && (s.circles > 0) !== c.overlay) throw new Error(`overlay expected ${c.overlay}, ${s.circles} circles on the board`);
        if (c.throttle) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', {rate: c.throttle});
        let t0, t1;
        if (c.kind === 'drag') {
            if (!s.pts.length) throw new Error('no reachable draggable point');
            const [ox, oy] = s.rect, [px, py] = s.pts[s.pts.length - 1];
            const span = s.size[1] * 0.12;
            const pathAt = f => [px + span * Math.sin(2 * Math.PI * f), py + span * (1 - Math.cos(2 * Math.PI * f))];
            await startSampling(page);
            await page.mouse.move(ox + px, oy + py);
            await page.mouse.down();
            t0 = await page.evaluate(() => performance.now());
            for (let i = 1; i <= steps; i++) {
                const [x, y] = pathAt(i / steps);
                await page.mouse.move(ox + x, oy + y);
                await page.waitForTimeout(dragMs / steps);
            }
            t1 = await page.evaluate(() => performance.now());
            await page.mouse.up();
        } else {
            const slider = page.getByRole('slider', {name: /^Parameter t$/}).first();
            await slider.focus();
            await slider.press('Home');
            await startSampling(page);
            t0 = await page.evaluate(() => performance.now());
            for (let i = 0; i < 100; i++) { await slider.press('ArrowRight'); await page.waitForTimeout(20); }
            t1 = await page.evaluate(() => performance.now());
        }
        const perf = await stopSampling(page);
        const iv = intervals(perf.stamps, t0, t1);
        const samples = c.kind === 'drag' ? iv.slice(WARMUP) : iv;
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples`);
        if (perf.updates.length < MIN_SAMPLES) throw new Error(`only ${perf.updates.length} board updates: the gesture moved nothing`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const sorted = [...samples].sort((a, b) => a - b), updates = [...perf.updates].sort((a, b) => a - b);
        return {samples: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], dropped: samples.filter(x => x > 25).length,
            updates: updates.length, updateMedian: median(updates), updateP95: pct(updates, 0.95), freePoints: s.freePoints, objects: s.objects};
    } finally { await context.close(); }
}

(async () => {
    const browser = await chromium.launch();
    const summary = [];
    console.log(`Chromium ${browser.version()}, ${runs} runs, ${steps} steps over ${dragMs} ms`);
    try {
        for (const c of cases) {
            const rs = [];
            for (let r = 0; r < runs; r++) rs.push(await runOnce(browser, c).catch(err => { throw new Error(`${c.name} run ${r + 1}: ${err.message}`, {cause: err}); }));
            summary.push({name: c.name, median: median(rs.map(x => x.median)), p95: median(rs.map(x => x.p95)), max: Math.max(...rs.map(x => x.max)), dropped: rs.map(x => x.dropped).join('/'),
                updates: rs.map(x => x.updates).join('/'), updateMedian: median(rs.map(x => x.updateMedian)), updateP95: median(rs.map(x => x.updateP95)),
                points: rs[0].freePoints, objects: rs[0].objects});
        }
    } finally {
        await browser.close();
        console.log('\ncase | frame median ms | frame p95 ms | frame max ms | frames >25 ms per run | update median ms | update p95 ms | updates per run | free points | board objects');
        for (const s of summary) console.log(`${s.name} | ${s.median.toFixed(1)} | ${s.p95.toFixed(1)} | ${s.max.toFixed(1)} | ${s.dropped} | ${s.updateMedian.toFixed(2)} | ${s.updateP95.toFixed(2)} | ${s.updates} | ${s.points} | ${s.objects}`);
    }
})().catch(err => { console.error(`curvature-browser-perf FAILED: ${err.message}`); process.exit(1); });
