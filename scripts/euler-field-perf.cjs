// Frame-interval measurement of four direction-field drawing approaches (numerical-methods 07 step 1, ADR 0037):
//   node scripts/euler-field-perf.cjs        // serves scripts/perf-harness and node_modules/jsxgraph/distrib on port 4330 (PERF_PORT)
// Method of fourier-browser-perf.cjs: rAF stamps sampled only inside the interaction, warm-up dropped, PERF_RUNS runs, median of runs.
// Env: PERF_RUNS (3), PERF_DRAG_MS (2000), PERF_ONLY (substring filter on the case name), PERF_PORT.
const {chromium} = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const runs = Number(process.env.PERF_RUNS || 3), dragMs = Number(process.env.PERF_DRAG_MS || 2000), port = Number(process.env.PERF_PORT || 4330);
const only = process.env.PERF_ONLY || '';
const MIN_SAMPLES = 60, WARMUP = 15, STEPS = 120;
const root = path.resolve(__dirname, '..');
const dirs = {'/jsxgraph/': path.join(root, 'node_modules/jsxgraph/distrib'), '/': path.join(root, 'scripts/perf-harness')};
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css'};
const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const base = url.startsWith('/jsxgraph/') ? '/jsxgraph/' : '/';
    const file = path.normalize(path.join(dirs[base], url.slice(base.length) || 'euler-field.html'));
    if (!file.startsWith(dirs[base]) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'content-type': types[path.extname(file)] || 'application/octet-stream'}).end(fs.readFileSync(file));
});
const approaches = [['a', 21, 15], ['a', 41, 29], ['b', 21, 15], ['b', 41, 29], ['c', 21, 15], ['c', 41, 29], ['d', 11, 8]];
const sizes = [[1280, 720], [1920, 1080]];
const interactions = ['drag', 'step', 'view'];
const cases = [];
for (const [w, h] of sizes) for (const [a, nx, ny] of approaches) for (const kind of interactions)
    cases.push({name: `${a} ${nx}x${ny} ${w}x${h} ${kind}`, approach: a, nx, ny, w, h, kind});

const pct = (s, q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const intervals = (stamps, t0, t1) => { const iv = []; for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]); return iv; };
const startSampling = page => page.evaluate(() => {
    window.__perf = {stamps: [], on: true};
    const tick = ts => { if (window.__perf.on) { window.__perf.stamps.push(ts); requestAnimationFrame(tick); } };
    requestAnimationFrame(tick);
});
const stopSampling = page => page.evaluate(() => { window.__perf.on = false; return window.__perf.stamps; });

async function runOnce(browser, c) {
    const context = await browser.newContext({viewport: {width: c.w, height: c.h}, deviceScaleFactor: 1});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto(`http://127.0.0.1:${port}/euler-field.html?approach=${c.approach}&nx=${c.nx}&ny=${c.ny}&w=${c.w}&h=${c.h}`, {waitUntil: 'load'});
        await page.waitForFunction(() => window.H && window.H.ready, null, {timeout: 20000});
        await page.waitForTimeout(1000);
        const counts = await page.evaluate(() => window.H.counts());
        let t0, t1;
        if (c.kind === 'drag') {
            const p = await page.evaluate(() => window.H.point());
            const path2 = f => [p.x + p.w * 0.1 * Math.sin(2 * Math.PI * f), p.y + p.h * 0.2 * Math.sin(4 * Math.PI * f)];
            await page.mouse.move(p.x, p.y); await page.mouse.down();
            await startSampling(page);
            t0 = await page.evaluate(() => performance.now());
            for (let i = 1; i <= STEPS; i++) {
                const [x, y] = path2(i / STEPS); await page.mouse.move(x, y); await page.waitForTimeout(dragMs / STEPS);
                if (i === STEPS / 4) { const m = await page.evaluate(() => window.H.point()); if (Math.hypot(m.x - p.x, m.y - p.y) < 20) throw new Error('drag moved nothing'); }
            }
            t1 = await page.evaluate(() => performance.now());
            await page.mouse.up();
        } else if (c.kind === 'step') {
            const hs = [1, 0.5, 0.25, 0.125, 0.0625];
            await startSampling(page);
            t0 = await page.evaluate(() => performance.now());
            for (let k = 0; k < 30; k++) { await page.evaluate(v => window.H.setStep(v), hs[k % 5]); await page.waitForTimeout(dragMs / 30); }
            t1 = await page.evaluate(() => performance.now());
        } else {
            await startSampling(page);
            t0 = await page.evaluate(() => performance.now());
            for (let k = 0; k < 60; k++) { // zoom in and out about the centre with a drifting pan
                const z = 1 + 0.4 * Math.sin(2 * Math.PI * k / 30), cx = 1.5 * Math.sin(2 * Math.PI * k / 60);
                await page.evaluate(bb => window.H.setView(bb), [cx - 5 * z, 3 * z, cx + 5 * z, -3 * z]);
                await page.waitForTimeout(dragMs / 60);
            }
            t1 = await page.evaluate(() => performance.now());
        }
        const stamps = await stopSampling(page);
        const samples = intervals(stamps, t0, t1).slice(WARMUP);
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const sorted = [...samples].sort((a, b) => a - b);
        return {samples: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], dropped: samples.filter(x => x > 25).length, counts};
    } finally { await context.close(); }
}

async function bench(browser) { // main-thread cost per operation, JS only; complements the frame intervals, which saturate at the 60 Hz cap
    console.log('BENCH case | op | median ms | p95 ms | max ms');
    for (const [w, h] of sizes) for (const [a, nx, ny] of approaches) {
        const context = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 1});
        try {
            const page = await context.newPage();
            await page.goto(`http://127.0.0.1:${port}/euler-field.html?approach=${a}&nx=${nx}&ny=${ny}&w=${w}&h=${h}`, {waitUntil: 'load'});
            await page.waitForFunction(() => window.H && window.H.ready);
            for (const kind of interactions) {
                const rs = [];
                for (let r = 0; r < runs; r++) rs.push(await page.evaluate(k => window.H.bench(k, 100), kind));
                console.log(`BENCH ${a} ${nx}x${ny} ${w}x${h} | ${kind} | ${median(rs.map(x => x.median)).toFixed(2)} | ${median(rs.map(x => x.p95)).toFixed(2)} | ${Math.max(...rs.map(x => x.max)).toFixed(2)}`);
            }
        } finally { await context.close(); }
    }
}

(async () => {
    await new Promise(r => server.listen(port, '127.0.0.1', r));
    const browser = await chromium.launch();
    const summary = [];
    try {
        if (only === 'bench') { await bench(browser); return; }
        for (const c of cases.filter(x => x.name.includes(only))) {
            const rs = [];
            for (let r = 0; r < runs; r++) rs.push(await runOnce(browser, c).catch(err => { throw new Error(`${c.name} run ${r + 1}: ${err.message}`, {cause: err}); }));
            const s = {name: c.name, median: median(rs.map(x => x.median)), p95: median(rs.map(x => x.p95)), max: Math.max(...rs.map(x => x.max)), dropped: rs.map(x => x.dropped).join('/'), samples: rs.map(x => x.samples).join('/'), counts: rs[0].counts};
            summary.push(s);
            console.log(`${s.name} | ${s.median.toFixed(1)} | ${s.p95.toFixed(1)} | ${s.max.toFixed(1)} | ${s.dropped} | ${s.samples} | objects ${s.counts.objects}, DOM ${s.counts.dom}`);
        }
    } finally { await browser.close(); server.close(); }
    console.log(`\nbrowser ${browser.version()}`);
})().catch(err => { console.error(`euler-field-perf FAILED: ${err.message}`); server.close(); process.exit(1); });
