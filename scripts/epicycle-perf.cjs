// Frame-interval measurement of epicycle drawing approaches (Fourier series 06 Batch C step 1, ADR 0034 section 3):
//   node scripts/epicycle-perf.cjs           // serves scripts/perf-harness and node_modules/jsxgraph/distrib on port 4330 (PERF_PORT)
// Method of euler-field-perf.cjs: rAF stamps sampled only inside the interaction, warm-up dropped, PERF_RUNS runs, median of runs.
// Env: PERF_RUNS (3), PERF_DRAG_MS (2000), PERF_ONLY (substring filter on the case name, or "bench"), PERF_PORT.
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
    const file = path.normalize(path.join(dirs[base], url.slice(base.length) || 'epicycle.html'));
    if (!file.startsWith(dirs[base]) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'content-type': types[path.extname(file)] || 'application/octet-stream'}).end(fs.readFileSync(file));
});
const approaches = ['a', 'b1', 'b2'];
const Ns = [10, 25, 50], Ss = [400, 2000];
const sizes = [[1280, 720], [1920, 1080]];
const cases = [];
for (const [w, h] of sizes) for (const approach of approaches) for (const S of Ss) {
    for (const N of Ns) for (const kind of ['play', 'drag']) cases.push({name: `${approach} N=${N} S=${S} ${w}x${h} ${kind}`, approach, N, S, w, h, kind});
    cases.push({name: `${approach} N=10 S=${S} ${w}x${h} nsweep`, approach, N: 10, S, w, h, kind: 'nsweep'});
}

const pct = (s, q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const intervals = (stamps, t0, t1) => { const iv = []; for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]); return iv; };
const startSampling = page => page.evaluate(() => {
    window.__perf = {stamps: [], on: true};
    const tick = ts => { if (window.__perf.on) { window.__perf.stamps.push(ts); requestAnimationFrame(tick); } };
    requestAnimationFrame(tick);
});
const stopSampling = page => page.evaluate(() => { window.__perf.on = false; return window.__perf.stamps; });
const url = c => `http://127.0.0.1:${port}/epicycle.html?approach=${c.approach}&N=${c.N}&S=${c.S}&w=${c.w}&h=${c.h}`;

async function runOnce(browser, c) {
    const context = await browser.newContext({viewport: {width: c.w, height: c.h}, deviceScaleFactor: 1});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto(url(c), {waitUntil: 'load'});
        await page.waitForFunction(() => window.H && window.H.ready, null, {timeout: 20000});
        await page.waitForTimeout(1000);
        let counts = await page.evaluate(() => window.H.counts());
        let t0, t1;
        if (c.kind === 'drag') {
            const p = await page.evaluate(() => window.H.point());
            const path2 = f => [p.x + p.w * 0.06 * Math.sin(2 * Math.PI * f), p.y + p.h * 0.12 * Math.sin(4 * Math.PI * f)];
            await page.mouse.move(p.x, p.y); await page.mouse.down();
            await startSampling(page);
            t0 = await page.evaluate(() => performance.now());
            for (let i = 1; i <= STEPS; i++) {
                const [x, y] = path2(i / STEPS); await page.mouse.move(x, y); await page.waitForTimeout(dragMs / STEPS);
                if (i === STEPS / 4) { const m = await page.evaluate(() => window.H.point()); if (Math.hypot(m.x - p.x, m.y - p.y) < 10) throw new Error('drag moved nothing'); }
            }
            t1 = await page.evaluate(() => performance.now());
            await page.mouse.up();
        } else if (c.kind === 'nsweep') {
            const ns = [10, 25, 50, 25, 10];
            await startSampling(page);
            t0 = await page.evaluate(() => performance.now());
            for (let k = 0; k < 30; k++) { await page.evaluate(v => window.H.setN(v), ns[k % 5]); await page.waitForTimeout(dragMs / 30); }
            t1 = await page.evaluate(() => performance.now());
        } else {
            await page.evaluate(() => window.H.play(true));
            await startSampling(page);
            t0 = await page.evaluate(() => performance.now());
            await page.waitForTimeout(dragMs);
            t1 = await page.evaluate(() => performance.now());
            await page.evaluate(() => window.H.play(false));
        }
        const stamps = await stopSampling(page);
        const samples = intervals(stamps, t0, t1).slice(WARMUP);
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        if (c.kind === 'nsweep') counts = {...counts, ...{objects: Math.max(counts.objects, await page.evaluate(() => window.H.counts().objects))}};
        const sorted = [...samples].sort((a, b) => a - b);
        return {samples: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], dropped: samples.filter(x => x > 25).length, counts};
    } finally { await context.close(); }
}

async function bench(browser) { // main-thread cost per operation, JS only; complements the frame intervals, which saturate at the 60 Hz cap
    console.log('BENCH case | op | median ms | p95 ms | max ms');
    for (const [w, h] of sizes) for (const approach of approaches) for (const S of Ss) for (const N of Ns) {
        const c = {approach, N, S, w, h};
        const context = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 1});
        try {
            const page = await context.newPage();
            await page.goto(url(c), {waitUntil: 'load'});
            await page.waitForFunction(() => window.H && window.H.ready);
            for (const kind of ['play', 'drag', 'nsweep']) {
                if (kind === 'nsweep' && N !== 10) continue; // the sweep ignores the starting N
                const rs = [];
                for (let r = 0; r < runs; r++) rs.push(await page.evaluate(k => window.H.bench(k, 100), kind));
                console.log(`BENCH ${approach} N=${N} S=${S} ${w}x${h} | ${kind} | ${median(rs.map(x => x.median)).toFixed(2)} | ${median(rs.map(x => x.p95)).toFixed(2)} | ${Math.max(...rs.map(x => x.max)).toFixed(2)}`);
            }
        } finally { await context.close(); }
    }
}

(async () => {
    await new Promise(r => server.listen(port, '127.0.0.1', r));
    const browser = await chromium.launch();
    try {
        if (only === 'bench') { await bench(browser); return; }
        for (const c of cases.filter(x => x.name.includes(only))) {
            const rs = [];
            for (let r = 0; r < runs; r++) rs.push(await runOnce(browser, c).catch(err => { throw new Error(`${c.name} run ${r + 1}: ${err.message}`, {cause: err}); }));
            const s = {name: c.name, median: median(rs.map(x => x.median)), p95: median(rs.map(x => x.p95)), max: Math.max(...rs.map(x => x.max)), dropped: rs.map(x => x.dropped).join('/'), samples: rs.map(x => x.samples).join('/'), counts: rs[0].counts};
            console.log(`${s.name} | ${s.median.toFixed(1)} | ${s.p95.toFixed(1)} | ${s.max.toFixed(1)} | ${s.dropped} | ${s.samples} | objects ${s.counts.objects}, DOM ${s.counts.dom}`);
        }
    } finally { await browser.close(); server.close(); }
    console.log(`\nbrowser ${browser.version()}`);
})().catch(err => { console.error(`epicycle-perf FAILED: ${err.message}`); server.close(); process.exit(1); });
