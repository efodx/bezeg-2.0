// F2b browser timings of solids, level sets (contours, linear program), phase portrait and logistic map (ADR 0051, 0053, 0054) on the production build.
//   PREVIEW_BASE_URL=http://127.0.0.1:4391/bezeg-2.0 node scripts/f2b-solids-levelsets-phase-browser-perf.cjs
// Without PREVIEW_BASE_URL the build in .command-logs/f2b-perf3/site is served on port 4391 by this script.
// Profiles as f2b-random-kinematics-browser-perf.cjs: desktop 1280x800 unthrottled, mouse; phone 390x844, 4x CPU (CDP), touch. PERF_RUNS (5) fresh contexts per case.
// Each case drags a control for about 1 s (60 moves): a range input scrub (full range) or a JSXGraph point (circle of radius 40 px, 25 px on the phone).
// The window records rAF intervals (first 3 dropped), the duration of every board.update call (all boards; per-board counts) and long tasks.
// The UI is Slovenian (default language). RESULT_FILE (default .command-logs/f2b-perf3/results.json) gets every run's raw numbers. PERF_ONLY is a regex on the case id.
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const OUT = process.env.RESULT_FILE || path.join('.command-logs', 'f2b-perf3', 'results.json');
const siteDir = path.join('.command-logs', 'f2b-perf3', 'site');
const runs = Number(process.env.PERF_RUNS || 5), steps = 60;
let baseUrl = process.env.PREVIEW_BASE_URL && process.env.PREVIEW_BASE_URL.replace(/\/$/, '');
const only = process.env.PERF_ONLY ? new RegExp(process.env.PERF_ONLY) : null;
const profiles = [
    {name: 'desktop', width: 1280, height: 800, touch: false, cpu: 1, radius: 40},
    {name: 'phone 4x', width: 390, height: 844, touch: true, cpu: 4, radius: 25},
];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (s, q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
const serve = () => new Promise(resolve => {
    const root = path.resolve(siteDir), pre = '/bezeg-2.0';
    const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2'};
    const srv = http.createServer((q, r) => {
        let u = decodeURIComponent(q.url.split('?')[0]); if (u.startsWith(pre)) u = u.slice(pre.length);
        let f = path.join(root, u);
        if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
        r.writeHead(200, {'content-type': types[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(r);
    }).listen(4391, '127.0.0.1', () => resolve(srv));
});
const open = async (page, route) => {
    await page.goto(`${baseUrl}/${route}`, {waitUntil: 'load'});
    await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000});
    await page.waitForTimeout(1500);
};
const instrument = () => {
    const boards = Object.values(window.JXG.boards);
    const P = window.__perf = {stamps: [], on: false, updates: [], long: []};
    boards.forEach((bd, idx) => {
        const u = bd.update;
        bd.update = function (...a) { const s = performance.now(); const r = u.apply(this, a); P.updates.push([s, performance.now() - s, idx]); return r; };
    });
    new PerformanceObserver(l => { for (const e of l.getEntries()) P.long.push([e.startTime, e.duration]); }).observe({entryTypes: ['longtask']});
    const tick = ts => { if (P.on) P.stamps.push(ts); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    return boards.length;
};
const startWindow = page => page.evaluate(() => { const P = window.__perf; P.stamps = []; P.updates = []; P.long = []; P.on = true; return performance.now(); });
const endWindow = (page, t0) => page.evaluate(t0 => {
    const P = window.__perf; P.on = false; const t1 = performance.now(); const iv = [];
    for (let i = 1; i < P.stamps.length; i++) if (P.stamps[i - 1] >= t0 && P.stamps[i] <= t1) iv.push(P.stamps[i] - P.stamps[i - 1]);
    const per = {}; for (const [, , b] of P.updates) per[b] = (per[b] || 0) + 1;
    return {iv: iv.slice(3), upd: P.updates.map(x => x[1]), perBoard: per, long: P.long.map(x => x[1])};
}, t0);
const frameStats = r => {
    const s = [...r.iv].sort((a, b) => a - b), u = [...r.upd].sort((a, b) => a - b);
    return {n: s.length, median: median(r.iv), p95: pct(s, 0.95), max: s[s.length - 1] ?? 0, dropped: r.iv.filter(x => x > 25).length, updates: u.length, perBoard: r.perBoard,
        updMedian: u.length ? median(u) : 0, updMax: u.length ? u[u.length - 1] : 0, longMax: Math.max(0, ...(r.long.length ? r.long : [0])), long50: r.long.filter(x => x > 50).length};
};
const typeIn = async (page, label, v) => { const e = page.locator('input').and(page.getByLabel(label, {exact: true})); await e.scrollIntoViewIfNeeded(); await e.click(); await page.keyboard.press('Control+A'); await page.keyboard.type(v); await page.keyboard.press('Enter'); await page.waitForTimeout(500); };
const val = (page, label) => page.locator('input').and(page.getByLabel(label, {exact: true})).inputValue();
const selectOption = async (page, i, idx) => { await page.locator('select[id^=":r"]').nth(i).selectOption({index: idx}); await page.waitForTimeout(700); };
const send = (cdp, type, x, y) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
const pointsOf = page => page.evaluate(() => {
    const o = [];
    Object.values(window.JXG.boards).forEach((bd, bi) => { const r = bd.containerObj.getBoundingClientRect();
        for (const x of Object.values(bd.objects)) if (x.elType === 'point' && x.visProp.visible && !x.visProp.fixed && x.coords) o.push({b: bi, x: +x.X().toFixed(3), y: +x.Y().toFixed(3), sx: r.left + x.coords.scrCoords[1], sy: r.top + x.coords.scrCoords[2]}); });
    return o;
});
const live = page => page.evaluate(() => [...document.querySelectorAll('[data-readout-live]')].map(e => e.textContent.trim()).join(' | ').slice(0, 400));
// Scrub a range input across its width; passes alternate direction. Returns one frameStats per pass.
async function scrub(page, cdp, p, name, passes = 1) {
    const range = page.getByRole('slider', {name, exact: true});
    await range.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
    const b = await range.boundingBox(); const y = b.y + b.height / 2, xa = b.x + 4, xb = b.x + b.width - 4;
    const res = [];
    for (let pass = 0; pass < passes; pass++) {
        const [x0, x1] = pass % 2 ? [xb, xa] : [xa, xb];
        if (p.touch) await send(cdp, 'touchStart', x0, y); else { await page.mouse.move(x0, y); await page.mouse.down(); }
        const before = await range.inputValue();
        const t0 = await startWindow(page);
        for (let i = 1; i <= steps; i++) {
            const x = x0 + (x1 - x0) * i / steps;
            if (p.touch) await send(cdp, 'touchMove', x, y); else await page.mouse.move(x, y);
            await page.waitForTimeout(1000 / steps);
        }
        const r = await endWindow(page, t0), after = await range.inputValue();
        if (p.touch) await send(cdp, 'touchEnd'); else await page.mouse.up();
        res.push({...frameStats(r), readout: `${name}: value ${before} -> ${after} (${p.touch ? 'touch' : 'mouse'})`, changed: before !== after});
        await page.waitForTimeout(300);
    }
    return res;
}
// Drag the first draggable point passing `pick` around a circle for about 1 s.
async function dragPoint(page, cdp, p, pick) {
    const board = i => page.evaluate(i => Object.values(window.JXG.boards)[i].containerObj.scrollIntoView({block: 'center'}), i);
    let ps = await pointsOf(page); const q0 = ps.find(pick); if (!q0) throw new Error(`no draggable point matches; have ${JSON.stringify(ps)}`);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await board(q0.b);
    let prev = null; // wait until the board stops moving (scroll settles, also at 4x CPU)
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(250); const cur = JSON.stringify((await pointsOf(page))[0]); if (cur === prev) break; prev = cur; }
    ps = await pointsOf(page); const q = ps.find(pick);
    const R = p.radius, pos = i => [q.sx + R * (Math.cos(2 * Math.PI * i / steps) - 1), q.sy + R * Math.sin(2 * Math.PI * i / steps)];
    if (p.touch) await send(cdp, 'touchStart', q.sx, q.sy); else { await page.mouse.move(q.sx, q.sy); await page.mouse.down(); }
    await page.waitForTimeout(250); // let the board's pointer handler take the touch before the first move
    const t0 = await startWindow(page);
    let moved = null;
    for (let i = 1; i <= steps; i++) {
        const [x, y] = pos(i); if (p.touch) await send(cdp, 'touchMove', x, y); else await page.mouse.move(x, y);
        if (i === steps / 4) moved = (await pointsOf(page)).find(z => z.b === q.b && Math.hypot(z.sx - x, z.sy - y) < 3 * R);
        await page.waitForTimeout(1000 / steps);
    }
    const r = await endWindow(page, t0);
    if (p.touch) await send(cdp, 'touchEnd'); else await page.mouse.up();
    await page.waitForTimeout(300);
    return {...frameStats(r), readout: `point on board ${q.b} (${q.x}, ${q.y}) -> quarter-way (${moved ? moved.x + ', ' + moved.y : 'not found; points ' + JSON.stringify(await pointsOf(page)) + ' finger ' + JSON.stringify(pos(steps / 4))}) (${p.touch ? 'touch' : 'mouse'})`, changed: !!moved && (moved.x !== q.x || moved.y !== q.y)};
}
async function runCase(browser, p, c) {
    const context = await browser.newContext({viewport: {width: p.width, height: p.height}, deviceScaleFactor: 1, hasTouch: p.touch, isMobile: p.touch, locale: 'sl-SI'});
    try {
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        const cdp = await context.newCDPSession(page);
        await open(page, c.route);
        const boards = await page.evaluate(instrument);
        if (c.setup) await c.setup(page);
        if (p.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', {rate: p.cpu});
        const out = await c.act(page, cdp, p);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const list = Array.isArray(out) ? out : [out];
        list.forEach(o => { o.boards = boards; if (!o.changed) throw new Error(`control did not move: ${o.readout}`); });
        return list;
    } finally { await context.close(); }
}
const sol = 'analysis/solids', con = 'analysis/contours';
const levels = n => async page => { await typeIn(page, 'Število nivojnic', String(n)); if ((await val(page, 'Število nivojnic')) !== String(n)) throw new Error('level count not ' + n); };
const stack = n => async pg => { await selectOption(pg, 0, 1); await typeIn(pg, 'Število plošč, vrednost', String(n)); };
const cases = [
    {id: 'solids cube: plane offset slider (pass 1 first sweep, pass 2 sweep back)', route: sol, act: (pg, cdp, p) => scrub(pg, cdp, p, 'Odmik ravnine', 2)},
    {id: 'solids revolve (k=48): discs slider', route: sol, setup: async pg => { await selectOption(pg, 0, 3); await selectOption(pg, 1, 1); }, act: (pg, cdp, p) => scrub(pg, cdp, p, 'Število diskov')},
    {id: 'solids slab stack, 17 slabs: shear slider', route: sol, setup: stack(17), act: (pg, cdp, p) => scrub(pg, cdp, p, 'Strižba')},
    {id: 'solids slab stack, 17 slabs: cursor slider', route: sol, setup: stack(17), act: (pg, cdp, p) => scrub(pg, cdp, p, 'Višina primerjane rezine (v % višine telesa)')},
    {id: 'solids slab stack, 60 slabs (max): shear slider', route: sol, setup: stack(60), act: (pg, cdp, p) => scrub(pg, cdp, p, 'Strižba')},
    ...[1, 5, 9].flatMap(n => [
        {id: `contours N=60, ${n} level(s): level slider`, route: con, setup: levels(n), act: (pg, cdp, p) => scrub(pg, cdp, p, 'Vrednost nivojnice c')},
        {id: `contours N=60, ${n} level(s): probe drag`, route: con, setup: levels(n), act: (pg, cdp, p) => dragPoint(pg, cdp, p, q => Math.abs(q.x - 0.6) < 0.01 && Math.abs(q.y - 0.8) < 0.01)},
    ]),
    {id: 'linear program: objective handle drag', route: 'analysis/linear-program', act: (pg, cdp, p) => dragPoint(pg, cdp, p, () => true)},
    {id: 'phase portrait, 6 seeds: matrix handle drag (all trajectories)', route: 'analysis/phase-portrait', act: (pg, cdp, p) => dragPoint(pg, cdp, p, q => Math.abs(q.x + 4) < 0.1 && Math.abs(q.y + 2) < 0.1)},
    {id: 'phase portrait, 6 seeds: seed drag (one trajectory)', route: 'analysis/phase-portrait', act: (pg, cdp, p) => dragPoint(pg, cdp, p, q => Math.abs(q.x - 1) < 0.01 && Math.abs(q.y) < 0.01)},
    {id: 'logistic map: r slider (pass 1 first visit, pass 2 revisit)', route: 'analysis/logistic-map', act: (pg, cdp, p) => scrub(pg, cdp, p, 'Parameter r', 2)},
    {id: 'logistic map: step button x4 (900 ms apart, animated)', route: 'analysis/logistic-map', act: async pg => {
        const btn = pg.getByRole('button', {name: 'Naslednji korak', exact: true}); await btn.scrollIntoViewIfNeeded(); const l0 = await live(pg);
        const t0 = await startWindow(pg); for (let i = 0; i < 4; i++) { await btn.click(); await pg.waitForTimeout(900); }
        const r = frameStats(await endWindow(pg, t0)), l1 = await live(pg);
        return {...r, readout: `live "${l0.slice(0, 70)}" -> "${l1.slice(0, 70)}"`, changed: l0 !== l1};
    }},
];
(async () => {
    const srv = baseUrl ? null : await serve();
    if (!baseUrl) baseUrl = 'http://127.0.0.1:4391/bezeg-2.0';
    const browser = await chromium.launch();
    const all = {browser: browser.version(), runs, baseUrl, date: new Date().toISOString(), results: []};
    console.log('browser', all.browser, 'runs', runs);
    try {
        for (const p of profiles) for (const c of cases) {
            if (only && !only.test(c.id)) continue;
            const perPass = [];
            for (let r = 0; r < runs; r++) {
                const list = await runCase(browser, p, c).catch(e => { throw new Error(`${p.name} | ${c.id} run ${r + 1}: ${e.message}`, {cause: e}); });
                list.forEach((o, i) => (perPass[i] ||= []).push(o));
            }
            perPass.forEach((rs, i) => {
                const f = (k, d = 1) => rs.map(x => x[k].toFixed(d)).join(' ');
                const label = `${p.name} | ${c.id}${perPass.length > 1 ? ` | pass ${i + 1}` : ''}`;
                all.results.push({profile: p.name, case: c.id, pass: i + 1, runs: rs});
                console.log(`${label} | median/run ${f('median')} | p95/run ${f('p95')} | max ${Math.max(...rs.map(x => x.max)).toFixed(1)} | >25ms/run ${rs.map(x => x.dropped).join('/')} | frames/run ${rs.map(x => x.n).join('/')} | updates/run ${rs.map(x => x.updates).join('/')} | boards updated ${JSON.stringify(rs[0].perBoard)} | upd median/run ${f('updMedian')} | upd max/run ${f('updMax')} | long>50ms/run ${rs.map(x => x.long50).join('/')} longest ${Math.max(...rs.map(x => x.longMax)).toFixed(0)} | ${rs[0].readout}`);
            });
            fs.writeFileSync(OUT, JSON.stringify(all, null, 1));
        }
    } finally { await browser.close(); if (srv) srv.close(); }
})().catch(e => { console.error(e); process.exit(1); });
