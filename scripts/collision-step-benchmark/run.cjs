// Step-cost benchmark over the production bundle. Usage: node scripts/collision-step-benchmark/run.cjs [results.json]
// Build first: node scripts/collision-step-benchmark/build.cjs
const os = require('os');
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {chromium} = require('@playwright/test');
const {serve} = require('./serve.cjs');

const outFile = process.argv[2];
const COUNTS = [100, 250, 500, 1000, 2000, 3000, 5000];
const METHODS = ['naive', 'sweep'];
const SHAPES = ['circle', 'polygon'];
const WARMUP = 30, STEPS = 120, SEED = 1, NAIVE_SKIP_MS = 2000;
const PROFILES = [
    {name: 'desktop', viewport: {width: 1440, height: 900}, cpuThrottle: 1, where: 'worker'},
    {name: 'desktop-main', viewport: {width: 1440, height: 900}, cpuThrottle: 1, where: 'main'},
    {name: 'mobile-4x', viewport: {width: 390, height: 844}, cpuThrottle: 4, where: 'main'},
];
const percentile = (values, p) => { const s = [...values].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]; };
const sh = command => { try { return execSync(command, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim(); } catch { return 'unavailable'; } };

async function profileRun(browser, profile, port) {
    const context = await browser.newContext({viewport: profile.viewport});
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForFunction(() => window.bench && window.bench.ready);
    if (profile.cpuThrottle !== 1) await cdp.send('Emulation.setCPUThrottlingRate', {rate: profile.cpuThrottle});
    const calibration = [];
    for (let i = 0; i < 3; i++) calibration.push((await page.evaluate(w => window.bench.send({type: 'calibrate'}, w), profile.where)).ms);
    const isolated = await page.evaluate(() => crossOriginIsolated);
    const cells = [];
    for (const shape of SHAPES) for (const method of METHODS) {
        let skipped = false;
        for (const n of COUNTS) {
            if (skipped) { cells.push({shape, method, n, skipped: true}); continue; }
            const r = await page.evaluate(([m, c, w, s, seed, where, sh]) => window.bench.send({type: 'run', shape: sh, method: m, count: c, warmup: w, steps: s, seed}, where), [method, n, WARMUP, STEPS, SEED, profile.where, shape]);
            const cell = {
                shape, method, n, median: percentile(r.times, 0.5), p90: percentile(r.times, 0.9), max: Math.max(...r.times),
                boxTests: percentile(r.boxTests, 0.5), candidates: percentile(r.candidates, 0.5),
                narrowTests: percentile(r.narrowTests, 0.5), touchingPairs: percentile(r.touchingPairs, 0.5),
                hullTests: percentile(r.hullTests, 0.5), hullPasses: percentile(r.hullPasses, 0.5), pieceTests: percentile(r.pieceTests, 0.5),
            };
            cells.push(cell);
            console.log(profile.name, shape, method, n, cell.median.toFixed(3), cell.p90.toFixed(3));
            if (method === 'naive' && cell.median > NAIVE_SKIP_MS) skipped = true;
        }
    }
    await context.close();
    return {profile: profile.name, crossOriginIsolated: isolated, cpuThrottle: profile.cpuThrottle, where: profile.where, viewport: profile.viewport, calibrationMs: calibration, cells};
}

(async () => {
    const server = await serve();
    const browser = await chromium.launch();
    const port = server.address().port;
    const profiles = [];
    for (const profile of PROFILES) profiles.push(await profileRun(browser, profile, port));
    const base = percentile(profiles[1].calibrationMs, 0.5);
    for (const p of profiles) p.calibrationRatio = percentile(p.calibrationMs, 0.5) / base;
    const environment = {
        commit: sh('git rev-parse --short HEAD') + (sh('git status --porcelain src') ? ' (src dirty)' : ''),
        browser: `Chromium ${browser.version()} (Playwright ${require('@playwright/test/package.json').version}, headless)`,
        cpu: sh('powershell -NoProfile -Command "(Get-CimInstance Win32_Processor).Name"') + ` (${os.cpus().length} logical)`,
        memoryGB: Math.round(os.totalmem() / 2 ** 30), os: `${os.type()} ${os.release()}`,
        warmup: WARMUP, steps: STEPS, seed: SEED,
    };
    await browser.close();
    server.close();
    const out = {environment, profiles};
    if (outFile) fs.writeFileSync(path.resolve(outFile), JSON.stringify(out, null, 2));
    console.log(JSON.stringify(environment));
    for (const p of profiles) {
        console.log(`\n${p.profile} (${p.where}, CPU throttle ${p.cpuThrottle}x, fixed-loop calibration ${p.calibrationMs.map(v => v.toFixed(0)).join('/')} ms, ratio to desktop-main ${p.calibrationRatio.toFixed(2)})`);
        console.log('| shape | method | n | median ms | p90 ms | max ms | boxTests | candidates | narrowTests | touchingPairs | hullTests | hullPasses | pieceTests |');
        console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
        for (const c of p.cells) console.log(c.skipped ? `| ${c.shape} | ${c.method} | ${c.n} | skipped | | | | | | | | | |` : `| ${c.shape} | ${c.method} | ${c.n} | ${c.median.toFixed(3)} | ${c.p90.toFixed(3)} | ${c.max.toFixed(3)} | ${c.boxTests} | ${c.candidates} | ${c.narrowTests} | ${c.touchingPairs} | ${c.hullTests} | ${c.hullPasses} | ${c.pieceTests} |`);
    }
})().catch(error => { console.error(error); process.exit(1); });
