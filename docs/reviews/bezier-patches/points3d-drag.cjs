// Matched production-build drag check. Run only while verification writers are idle.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '../../..');
const routes = ['/bezier/curve', '/bezier/decasteljau', '/rational/rational-decasteljau'];
const targets = [
    {id: 'before', url: 'http://127.0.0.1:4410/bezeg-2.0', build: '.command-logs/patches-baseline/build'},
    {id: 'after', url: 'http://127.0.0.1:4411/bezeg-2.0', build: '.command-logs/patches-acceptance/build'},
];
const quantile = (xs, p) => [...xs].sort((a, b) => a - b)[Math.max(0, Math.ceil(xs.length * p) - 1)];
const summarize = xs => ({n: xs.length, median: quantile(xs, .5), p95: quantile(xs, .95)});
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
async function provenance(target) {
    const shell = await fetch(target.url + '/');
    if (!shell.ok) throw Error('Missing production shell: ' + target.url);
    const html = await shell.text();
    const refs = [...html.matchAll(/(?:src|href)="([^"]+assets\/index-[^"]+\.(?:js|css))"/g)].map(m => m[1]);
    if (!refs.length) throw Error('No production assets');
    return Promise.all(refs.map(async ref => {
        const response = await fetch(new URL(ref, shell.url));
        if (!response.ok) throw Error('Missing served asset');
        const served = hash(Buffer.from(await response.arrayBuffer()));
        const name = path.basename(new URL(ref, shell.url).pathname);
        const local = hash(fs.readFileSync(path.join(root, target.build, 'assets', name)));
        if (served !== local) throw Error('Build provenance mismatch: ' + name);
        return {name, sha256: served};
    }));
}
async function trial(browser, target, route, repetition) {
    const context = await browser.newContext({viewport: {width: 1440, height: 960}, locale: 'sl-SI', reducedMotion: 'reduce'});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(target.url + route, {waitUntil: 'domcontentloaded'});
        await page.locator('#jgbox').waitFor();
        await page.waitForFunction(() => Object.values(window.JXG?.boards || {}).some(b => b.container === 'jgbox' && b.objectsList.length));
        const jsxgraphVersion = await page.evaluate(() => window.JXG.version);
        if (jsxgraphVersion !== '1.14.1') throw Error('Unexpected JSXGraph runtime: ' + jsxgraphVersion);
        await page.evaluate(async () => { await window.MathJax?.startup?.promise; await document.fonts.ready; });
        await page.waitForTimeout(200);
        const point = await page.evaluate(() => {
            const board = Object.values(window.JXG.boards).find(b => b.container === 'jgbox');
            const points = board.objectsList.filter(o => o.elType === 'point' && o.visProp.visible !== false && o.visProp.fixed !== true && o.rendNode?.isConnected);
            const p = points.find(o => Math.hypot(o.X() + 4, o.Y() + 3) < .01);
            if (!p) throw Error('Default free control point missing');
            const rect = p.rendNode.getBoundingClientRect();
            const curve = board.objectsList.find(o => o.elType === 'curve' && o.visProp.visible !== false && o.rendNode?.getTotalLength?.() > 10);
            if (!curve) throw Error('Visible curve missing');
            const timing = window.__pointDragTiming = {updates: [], frames: [], active: false, last: 0};
            const original = board.update;
            board.update = function(...args) {
                const start = performance.now();
                try { return original.apply(this, args); }
                finally { if (timing.active) timing.updates.push(performance.now() - start); }
            };
            const frame = now => {
                if (timing.active && timing.last) timing.frames.push(now - timing.last);
                timing.last = now;
                timing.raf = requestAnimationFrame(frame);
            };
            timing.raf = requestAnimationFrame(frame);
            return {id: p.id, before: [p.X(), p.Y()], screen: [rect.x + rect.width / 2, rect.y + rect.height / 2], curvePath: curve.rendNode.getAttribute('d'), curveId: curve.id};
        });
        await page.mouse.move(...point.screen);
        await page.mouse.down();
        await page.evaluate(() => { window.__pointDragTiming.active = true; window.__pointDragTiming.last = 0; });
        for (let step = 1; step <= 24; step++) {
            await page.mouse.move(point.screen[0] + 84 * step / 24, point.screen[1] - 48 * step / 24);
            await page.waitForTimeout(20);
        }
        await page.mouse.up();
        const result = await page.evaluate(({id, curveId}) => {
            const b = Object.values(window.JXG.boards).find(b => b.container === 'jgbox');
            const p = b.objects[id], t = window.__pointDragTiming;
            t.active = false; cancelAnimationFrame(t.raf);
            return {after: [p.X(), p.Y()], updates: t.updates, frames: t.frames, curvePath: b.objects[curveId].rendNode.getAttribute('d')};
        }, point);
        if (errors.length) throw Error(errors.join('\n'));
        if (Math.hypot(result.after[0] - point.before[0], result.after[1] - point.before[1]) < .1 || result.curvePath === point.curvePath) throw Error('Pointer gesture failed to change point and curve');
        if (result.updates.length < 20 || result.frames.length < 10) throw Error('Insufficient timing samples');
        return {target: target.id, route, repetition, jsxgraphVersion, before: point.before, after: result.after, updates: result.updates, frames: result.frames, updateSummary: summarize(result.updates), frameSummary: summarize(result.frames)};
    } finally { await context.close(); }
}
async function main() {
    const startedAt = new Date().toISOString();
    const assets = await Promise.all(targets.map(async t => ({target: t.id, assets: await provenance(t)})));
    const browser = await chromium.launch({headless: true});
    const report = {startedAt, browser: browser.version(), platform: os.platform(), viewport: [1440, 960], method: 'Three alternating A/B fresh-context trials per scene; 24 mouse moves (+84,-48px), 20ms between moves. Synchronous board.update durations and rAF intervals, not input-to-paint latency. No physical phone.', assets, trials: [], summary: []};
    try {
        for (const route of routes) {
            for (let repetition = 1; repetition <= 3; repetition++) {
                for (const target of targets) report.trials.push(await trial(browser, target, route, repetition));
            }
            const rows = report.trials.filter(t => t.route === route);
            const endpoint = rows[0].after;
            if (rows.some(t => Math.hypot(t.after[0] - endpoint[0], t.after[1] - endpoint[1]) > 1e-5)) throw Error('Matched gesture endpoints differ: ' + route);
            for (const target of targets) {
                const selected = rows.filter(t => t.target === target.id);
                report.summary.push({route, target: target.id, updates: summarize(selected.flatMap(t => t.updates)), frames: summarize(selected.flatMap(t => t.frames)), perTrialMedians: selected.map(t => t.updateSummary.median), endpoint});
            }
        }
    } finally { await browser.close(); }
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'points3d-drag.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report.summary));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
