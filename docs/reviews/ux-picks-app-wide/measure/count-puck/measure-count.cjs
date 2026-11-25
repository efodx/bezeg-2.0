// node measure-count.cjs --url http://127.0.0.1:4472 [--route analysis/taylor] [--gap 30] [--throttle 1] [--profile]
// Modes run in one page: click (+10 then -10), key (ArrowUp x10, ArrowDown x10 on count), range (ArrowRight x10, Left x10 on first slider).
const {chromium} = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => { if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]); return acc; }, []));
const base = (args.url || 'http://127.0.0.1:4472').replace(/\/$/, '');
const prefix = args.prefix === undefined ? '/bezeg-2.0' : args.prefix;
const route = args.route || 'analysis/taylor';
const gap = Number(args.gap || 30), throttle = Number(args.throttle || 1);
const profile = 'profile' in args;
(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    await context.addInitScript(() => { try { localStorage.setItem('bezeg-language', 'sl'); } catch (e) { /* */ } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', {rate: throttle});
    await page.goto(`${base}${prefix}/${route}`);
    const countSel = '.puck-strip .puck-count [role=spinbutton]';
    await page.locator(countSel).first().waitFor();
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
        window.__long = []; window.__ev = [];
        new PerformanceObserver(l => l.getEntries().forEach(e => window.__long.push(Math.round(e.duration)))).observe({type: 'longtask', buffered: false});
        new PerformanceObserver(l => l.getEntries().forEach(e => window.__ev.push({n: e.name, d: e.duration, t: Math.round(e.startTime)}))).observe({type: 'event', durationThreshold: 16, buffered: false});
    });
    const read = () => page.locator(countSel).first().getAttribute('aria-valuenow');
    const results = {};
    async function run(name, doUp, doDown) {
        await page.evaluate(() => { window.__long = []; window.__ev = []; });
        const start = Number(await read());
        const t0 = Date.now();
        for (let i = 0; i < 10; i++) { await doUp(); await page.waitForTimeout(gap); }
        const mid = Number(await read());
        for (let i = 0; i < 10; i++) { await doDown(); await page.waitForTimeout(gap); }
        const tIssued = Date.now() - t0;
        // settle: two rAFs idle for 300ms with no long task
        await page.evaluate(() => new Promise(r => { let last = performance.now(); const tick = () => { r(); }; requestAnimationFrame(() => requestAnimationFrame(tick)); }));
        const tPaint = Date.now() - t0;
        await page.waitForTimeout(600);
        const end = Number(await read());
        const d = await page.evaluate(() => ({long: window.__long, ev: window.__ev}));
        results[name] = {start, mid, end, issuedMs: tIssued, firstPaintAfterLastMs: tPaint - tIssued, longTasks: d.long, nLong: d.long.length, longSum: d.long.reduce((a, b) => a + b, 0),
            events: d.ev.length, evMax: Math.max(0, ...d.ev.map(e => e.d)), evAvg: d.ev.length ? Math.round(d.ev.reduce((a, b) => a + b.d, 0) / d.ev.length) : 0,
            expectedMid: Math.min(start + 10, Number(await page.locator(countSel).first().getAttribute('aria-valuemax'))), dropped: null};
        results[name].dropped = results[name].mid !== results[name].expectedMid || end !== start;
    }
    const strip = page.locator('.puck-strip .puck-count').first(); const plus = strip.locator('.puck-step').last(), minus = strip.locator('.puck-step').first(); console.error('start', await read());
    if (profile) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', {interval: 200}); await cdp.send('Profiler.start'); }
    await run('click', () => plus.click({noWaitAfter: true, force: true}), () => minus.click({noWaitAfter: true, force: true}));
    let prof;
    if (profile) prof = (await cdp.send('Profiler.stop')).profile;
    await page.locator(countSel).first().focus();
    await run('keyCount', () => page.keyboard.press('ArrowUp'), () => page.keyboard.press('ArrowDown'));
    const slider = page.locator('[role=slider]').first();
    if (await slider.count()) {
        await slider.focus();
        await run('keyRange', () => page.keyboard.press('ArrowRight'), () => page.keyboard.press('ArrowLeft'));
    }
    console.log(JSON.stringify({url: base, route, gap, throttle, results}, null, 1));
    if (prof) {
        const byId = new Map(prof.nodes.map(n => [n.id, n])), self = new Map();
        prof.samples.forEach((id, i) => { const cf = byId.get(id).callFrame; const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').slice(-2).join('/')}:${cf.lineNumber}`; self.set(k, (self.get(k) || 0) + (prof.timeDeltas[i] || 0) / 1000); });
        const idle = self.get('(idle) :0') || 0; const tot = [...self.values()].reduce((a, b) => a + b, 0);
        console.log(`profile (click phase): total ${tot.toFixed(0)} idle ${idle.toFixed(0)} busy ${(tot - idle).toFixed(0)}`);
        [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22).forEach(([k, v]) => console.log(v.toFixed(0).padStart(6), k));
    }
    await browser.close();
})();
