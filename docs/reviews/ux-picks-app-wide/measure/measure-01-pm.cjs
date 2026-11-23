// Frame measurement for task 01 slice 6. Usage:
//   node docs/reviews/ux-picks-app-wide/measure/measure-01.cjs --url http://127.0.0.1:4477 --label base --runs 5 --throttle 1 [--out file.json]
// Run it with --throttle 1 (no throttle) and --throttle 4 (CDP CPU throttle); see RESULTS.md.
// Scenarios: decasteljau-play (play button, 5 s) and taylor-drag (center slider, 60 steps / 2 s out and back).
const {chromium} = require('playwright');
const fs = require('fs');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]);
    return acc;
}, []));
const base = (args.url || 'http://127.0.0.1:4477').replace(/\/$/, '');
const label = args.label || 'run';
const runs = Number(args.runs || 5);
const throttle = Number(args.throttle || 1);
const out = args.out || null;

// Installed before page scripts: frame timestamps, long tasks, and a mutation-batch commit proxy.
const INSTALL = () => {
    const m = window.__m = {frames: [], longtasks: [], mutBatches: 0, delays: [], pendingInput: null, unmatched: 0, sampling: false};
    const loop = ts => { if (m.sampling) m.frames.push(ts); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    try {
        new PerformanceObserver(list => {
            if (!m.sampling) return;
            for (const e of list.getEntries()) m.longtasks.push({start: e.startTime, duration: e.duration});
        }).observe({entryTypes: ['longtask']});
    } catch (e) { /* longtask unsupported */ }
};

async function startSampling(page) {
    await page.evaluate(() => {
        const m = window.__m;
        m.frames = []; m.longtasks = []; m.mutBatches = 0; m.delays = []; m.pendingInput = null; m.unmatched = 0;
        // Commit proxy: mutation batches on the inspector form's container (not the board SVG).
        const root = document.querySelector('form').parentElement.parentElement;
        m.mo = new MutationObserver(recs => {
            m.mutBatches++;
            if (m.pendingInput !== null && recs.some(r => r.type === 'attributes' && r.attributeName === 'aria-valuetext')) {
                const t0 = m.pendingInput; m.pendingInput = null;
                requestAnimationFrame(() => m.delays.push(performance.now() - t0)); // time at the rAF callback (frame work starts), not vsync stamp
            }
        });
        m.mo.observe(root, {subtree: true, childList: true, attributes: true, characterData: true});
        document.addEventListener('pointermove', e => { if (!e.buttons) return;
            { if (m.pendingInput !== null) m.unmatched++; m.pendingInput = e.timeStamp; }
        }, true);
        m.sampling = true;
    });
}

async function stopSampling(page) {
    return page.evaluate(() => {
        const m = window.__m; m.sampling = false; m.mo.disconnect();
        const intervals = m.frames.slice(1).map((t, i) => t - m.frames[i]);
        return {intervals, longtasks: m.longtasks, commitsProxy: m.mutBatches, delays: m.delays, unmatchedInputs: m.unmatched};
    });
}

async function openPage(browser, route) {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    const page = await context.newPage();
    await page.addInitScript(INSTALL);
    if (throttle > 1) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', {rate: throttle});
    }
    await page.goto(`${base}/bezeg-2.0/${route}`);
    await page.locator('input[type=range]').first().waitFor();
    await page.waitForTimeout(2500); // settle after load
    return {context, page};
}

async function decasteljauPlay(browser) {
    const {context, page} = await openPage(browser, 'bezier/decasteljau');
    const t = () => page.locator('input[type=range]').first().inputValue();
    const t0 = await t();
    await startSampling(page);
    await page.getByRole('button', {name: 'Predvajaj'}).click();
    const began = Date.now();
    let last = t0, changedUntil = 0;
    while (Date.now() - began < 5000) { // note how long the parameter keeps moving
        await page.waitForTimeout(100);
        const v = await t();
        if (v !== last) { last = v; changedUntil = Date.now() - began; }
    }
    const result = await stopSampling(page);
    result.parameterMovingMs = changedUntil;
    result.parameterBefore = t0; result.parameterAfter = await t();
    await context.close();
    return result;
}

async function taylorDrag(browser) {
    const {context, page} = await openPage(browser, 'analysis/taylor');
    const slider = page.locator('input[type=range]').first();
    const box = await slider.boundingBox();
    const [min, max, val] = await slider.evaluate(e => [Number(e.min), Number(e.max), Number(e.value)]);
    const thumb = 16, usable = box.width - thumb;
    const xAt = v => box.x + thumb / 2 + ((v - min) / (max - min)) * usable;
    const y = box.y + box.height / 2;
    await page.mouse.move(xAt(val), y);
    await page.mouse.down();
    await startSampling(page);
    const steps = 60, stepMs = 2000 / steps;
    const startX = xAt(val), endX = xAt(max);
    const begin = Date.now();
    for (let i = 1; i <= steps; i++) {
        const f = i <= steps / 2 ? i / (steps / 2) : 2 - i / (steps / 2); // out and back
        await page.mouse.move(startX + (endX - startX) * f, y);
        const wait = begin + i * stepMs - Date.now();
        if (wait > 0) await page.waitForTimeout(wait);
    }
    await page.waitForTimeout(150); // let the last update commit
    const result = await stopSampling(page);
    result.dragWallMs = Date.now() - begin;
    result.sliderValueAfter = await slider.inputValue();
    await page.mouse.up();
    await context.close();
    return result;
}

const pct = (arr, p) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)];
};
const round = x => (x === null ? null : Math.round(x * 100) / 100);

function summarize(r) {
    const lt = r.longtasks;
    return {
        frames: r.intervals.length + 1,
        frameMedian: round(pct(r.intervals, 0.5)), frameP95: round(pct(r.intervals, 0.95)), frameMax: round(Math.max(...r.intervals)),
        longTasks: lt.length, longTaskTotalMs: round(lt.reduce((a, e) => a + e.duration, 0)),
        commitsProxy: r.commitsProxy,
        inputDelayMedian: round(pct(r.delays, 0.5)), inputDelayP95: round(pct(r.delays, 0.95)), inputDelaySamples: r.delays.length,
        unmatchedInputs: r.unmatchedInputs,
        parameterMovingMs: r.parameterMovingMs, parameterBefore: r.parameterBefore, parameterAfter: r.parameterAfter, sliderValueAfter: r.sliderValueAfter,
    };
}

(async () => {
    const browser = await chromium.launch();
    const result = {label, url: base, throttle, runs, browser: browser.version(), viewport: '1440x900', date: new Date().toISOString(), scenarios: {}};
    const scenarios = {'decasteljau-play': decasteljauPlay, 'taylor-drag': taylorDrag};
    for (const [name, fn] of Object.entries(scenarios)) {
        const perRun = [];
        for (let i = 0; i < runs; i++) {
            const raw = await fn(browser);
            perRun.push({summary: summarize(raw), rawIntervals: raw.intervals, rawDelays: raw.delays, rawLongTasks: raw.longtasks});
        }
        result.scenarios[name] = perRun;
    }
    // Refresh rate estimate from the idle page.
    const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
    const pg = await ctx.newPage();
    result.refreshHz = await pg.evaluate(() => new Promise(res => {
        const ts = []; const f = t => { ts.push(t); if (ts.length < 120) requestAnimationFrame(f); else res(Math.round(1000 / ((ts[119] - ts[10]) / 109))); };
        requestAnimationFrame(f);
    }));
    await ctx.close();
    await browser.close();
    const json = JSON.stringify(result, null, 1);
    if (out) fs.writeFileSync(out, json);
    for (const [name, list] of Object.entries(result.scenarios)) {
        console.log(`${name} throttle=${throttle}`);
        list.forEach((r, i) => console.log(' run', i + 1, JSON.stringify(r.summary)));
    }
    console.log('refreshHz', result.refreshHz, 'browser', result.browser);
})();
