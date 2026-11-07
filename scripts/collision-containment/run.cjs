// CP7 containment, switch latency, smoothness and lifecycle measurements for the collision playground.
// Usage: node scripts/collision-containment/run.cjs <page path> [results.json] [results.md]
// Serves a COPY of build/ (so a concurrent `just build` cannot disturb the run) under /bezeg-2.0/. See README.md.
const os = require('os');
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {chromium} = require('@playwright/test');
const {serve} = require('./serve.cjs');

const [pagePath, jsonOut, mdOut] = process.argv.slice(2);
if (!pagePath) { console.error('Usage: run.cjs <page path, e.g. /bezeg-2.0/learn/sweep-algorithms> [results.json] [results.md]'); process.exit(2); }
const REPO = path.resolve(__dirname, '../..');
const COPY = path.join(os.tmpdir(), 'collision-cp7-build-' + process.pid);
// COLLISION_CP7_MODE: playing (default, everything) | lifecycle (only the lifecycle section) | paused | none: baseline scroll and link measurements only.
const MODE = process.env.COLLISION_CP7_MODE || 'playing';
// COLLISION_CP7_HEADED=1: the first lifecycle phase (scroll away, hidden tab) runs in a headed Chromium, where the window can be minimised.
const HEADED = process.env.COLLISION_CP7_HEADED === '1';
const PLAY_MS = 10000, SCROLLS = 20, CLICKS = 20, SWITCHES = 5, IDLE_MS = 2000;
const PROFILES = [
    {name: 'desktop', throttle: 1, frameMedianTarget: 16.7, context: {viewport: {width: 1440, height: 900}}, touch: false},
    {name: 'mobile-4x', throttle: 4, frameMedianTarget: 33.3, context: {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 2}, touch: true},
];
const pct = (values, p) => { if (!values.length) return null; const s = [...values].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]; };
const r1 = v => (v == null ? null : Math.round(v * 10) / 10);
const sh = command => { try { return execSync(command, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim(); } catch { return 'unavailable'; } };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const LINK = 'header a[href^="/bezeg-2.0"], nav a[href^="/bezeg-2.0"]';

// Runs in every page before the app: LoAF + Event Timing collection and a passive tap on every Worker's messages.
function initScript() {
    window.__loaf = []; window.__events = []; window.__inputLatency = []; window.__workers = []; window.__blockNav = false;
    try { new PerformanceObserver(list => { for (const e of list.getEntries()) window.__loaf.push({start: e.startTime, duration: e.duration, blocking: e.blockingDuration, scripts: e.scripts.map(s => ({invoker: s.invoker, type: s.invokerType, url: s.sourceURL, fn: s.sourceFunctionName, duration: s.duration}))}); }).observe({type: 'long-animation-frame', buffered: true}); } catch (e) { window.__loafError = String(e); }
    try { new PerformanceObserver(list => { for (const e of list.getEntries()) window.__events.push({name: e.name, start: e.startTime, duration: e.duration}); }).observe({type: 'event', buffered: true, durationThreshold: 16}); } catch (e) { window.__eventError = String(e); }
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
        constructor(...args) { super(...args); const w = {url: String(args[0]), messages: 0, terminated: false}; window.__workers.push(w); this.addEventListener('message', e => { w.messages++; if (window.__expect && e.data && e.data.method === window.__expect && window.__expectAt == null) window.__expectAt = performance.now(); }); const t = this.terminate.bind(this); this.terminate = () => { w.terminated = true; t(); }; }
    };
    // Input to the first task after the next frame (rAF callback, then a MessageChannel task), a stand-in for next paint.
    const next = () => new Promise(resolve => requestAnimationFrame(() => { const c = new MessageChannel(); c.port1.onmessage = () => resolve(); c.port2.postMessage(0); }));
    const tap = e => { const ts = e.timeStamp; next().then(() => window.__inputLatency.push({type: e.type, ms: performance.now() - ts})); };
    window.addEventListener('wheel', tap, {capture: true, passive: true});
    window.addEventListener('touchstart', tap, {capture: true, passive: true});
    document.addEventListener('click', e => { if (window.__blockNav && e.target.closest && e.target.closest('a')) e.preventDefault(); }, true);
}

const messages = page => page.evaluate(() => window.__workers.reduce((n, w) => n + w.messages, 0));
const section = page => page.locator('section.collision-playground').first();

async function open(browser, profile, url) {
    const context = await browser.newContext({...profile.context, locale: 'sl-SI'});
    await context.addInitScript(initScript);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    if (profile.throttle !== 1) await cdp.send('Emulation.setCPUThrottlingRate', {rate: profile.throttle});
    await page.goto(url, {waitUntil: 'load'});
    if (MODE === 'none') { await page.waitForLoadState('networkidle'); return {context, page, cdp}; }
    await section(page).waitFor({timeout: 30000});
    await section(page).locator('canvas').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__workers.some(w => w.messages > 0), null, {timeout: 30000});
    return {context, page, cdp};
}

// Chooses the method and the largest count through the UI (End on the slider), then makes sure the simulation plays.
async function setup(page, method) {
    if (MODE === 'none') return 'no playground';
    const s = section(page);
    await s.getByRole('radio', {name: method === 'naive' ? 'Preizkus vseh parov' : 'Pometanje in obrezovanje'}).check();
    const slider = s.getByRole('slider').first();
    await slider.focus();
    await slider.press('End');
    if (MODE === 'paused') {
        // The playground plays on its own once in view, so pause it through the UI and wait until the button offers Play again.
        const pauseBtn = s.getByRole('button', {name: 'Premor', exact: true});
        if (await pauseBtn.count()) await pauseBtn.click();
        await s.getByRole('button', {name: 'Predvajaj', exact: true}).waitFor({timeout: 10000});
        await sleep(1500);
        return s.locator('dl dd').first().innerText();
    }
    // The playground may autoplay once in view, so wait for either control and press Play only if it is offered.
    const playBtn = s.getByRole('button', {name: 'Predvajaj', exact: true});
    const pauseBtn = s.getByRole('button', {name: 'Premor', exact: true});
    await playBtn.or(pauseBtn).first().waitFor({timeout: 15000});
    for (let i = 0; i < 5 && !(await pauseBtn.count()); i++) { try { await playBtn.click({timeout: 2000}); } catch { /* it flipped to Pause meanwhile */ } await sleep(300); }
    await pauseBtn.waitFor({timeout: 10000});
    await sleep(1500);
    return s.locator('dl dd').first().innerText();
}

const playgroundScript = s => /Collision/.test(s.url || '');
function summariseLoaf(entries, from) {
    const inWindow = entries.filter(e => e.start >= from);
    const long = inWindow.filter(e => e.duration > 50);
    const frames = long.map(e => ({start: r1(e.start), duration: r1(e.duration), blocking: r1(e.blocking), scripts: e.scripts.map(s => ({invoker: s.invoker, url: (s.url || '').split('/').pop(), fn: s.fn, duration: r1(s.duration), playground: playgroundScript(s)}))}));
    return {framesOver50ms: long.length, anyPlaygroundAttributable: frames.some(e => e.scripts.some(s => s.playground)), longestMs: r1(Math.max(0, ...inWindow.map(e => e.duration))), frames: frames.slice(0, 20)};
}

async function containment(browser, profile, url) {
    const {context, page, cdp} = await open(browser, profile, url);
    const objects = await setup(page, 'naive');
    await page.evaluate(() => { window.__inputLatency.length = 0; window.__events.length = 0; window.__blockNav = true; });
    const from = await page.evaluate(() => performance.now());
    const startMessages = await messages(page);
    const t0 = Date.now();
    // Scroll input every ~250 ms, small alternating deltas so the canvas stays in view.
    for (let i = 0; i < SCROLLS; i++) {
        const dy = i % 2 === 0 ? 100 : -100;
        if (profile.touch) await cdp.send('Input.synthesizeScrollGesture', {x: 200, y: 500, yDistance: -dy, gestureSourceType: 'touch', speed: 1200});
        else await page.mouse.wheel(0, dy);
        await sleep(250);
    }
    // Link clicks outside the playground: the click is real (pointer events), a capture handler only cancels the navigation.
    const link = page.locator(LINK).first();
    let clickNote = null, clicked = 0;
    if (await link.count() === 0) clickNote = 'no header/nav link found';
    else {
        for (let i = 0; i < CLICKS; i++) {
            try { if (profile.touch) await link.tap({timeout: 3000}); else await link.click({timeout: 3000}); clicked++; } catch (e) { clickNote = 'link not clickable: ' + String(e.message).split('\n')[0]; break; }
            await sleep(150);
        }
    }
    const rest = PLAY_MS - (Date.now() - t0);
    if (rest > 0) await sleep(rest);
    await sleep(300);
    const data = await page.evaluate(() => ({loaf: window.__loaf, events: window.__events, latency: window.__inputLatency, loafError: window.__loafError || null, eventError: window.__eventError || null}));
    const endMessages = await messages(page);
    const lat = data.latency.filter(l => l.ms >= 0 && l.ms < 10000).map(l => l.ms);
    const clickEntries = data.events.filter(e => e.name === 'click').map(e => e.duration);
    // Event Timing reports only events of 16 ms or more; a click with no entry counts as 16 ms (an upper bound).
    const clickDurations = [...clickEntries, ...Array(Math.max(0, clicked - clickEntries.length)).fill(16)];
    await context.close();
    return {
        objectsShown: objects, windowMs: PLAY_MS, snapshotsInWindow: endMessages - startMessages,
        loaf: summariseLoaf(data.loaf, from), loafError: data.loafError,
        scroll: {inputs: lat.length, kind: profile.touch ? 'touchstart' : 'wheel', p50Ms: r1(pct(lat, 0.5)), p95Ms: r1(pct(lat, 0.95)), maxMs: r1(Math.max(0, ...lat)), targetMs: 100},
        linkClick: {clicks: clicked, eventTimingEntriesOver16ms: clickEntries.length, p95DurationMsUpperBound: clickDurations.length ? r1(pct(clickDurations, 0.95)) : null, maxMs: clickDurations.length ? r1(Math.max(...clickDurations)) : null, targetMs: 100, note: clickNote, eventError: data.eventError},
    };
}

async function switchLatency(browser, profile, url) {
    const {context, page} = await open(browser, profile, url);
    await setup(page, 'naive');
    const s = section(page);
    const samples = [];
    for (let i = 0; i < SWITCHES; i++) {
        const sweep = await s.getByRole('radio', {name: 'Pometanje in obrezovanje'}).elementHandle();
        const naive = await s.getByRole('radio', {name: 'Preizkus vseh parov'}).elementHandle();
        samples.push(await page.evaluate(el => new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('no sweep snapshot within 15 s')), 15000);
            // Worker messages are timestamped by the init script; the live region is not used because it can announce a stale naive snapshot.
            window.__expect = 'sweep'; window.__expectAt = null;
            const t0 = performance.now();
            el.click();
            const poll = () => { if (window.__expectAt == null) { setTimeout(poll, 1); return; } const dom = window.__expectAt - t0; requestAnimationFrame(() => resolve({domMs: dom, frameMs: performance.now() - t0})); };
            poll();
        }), sweep));
        await sleep(800);
        await page.evaluate(el => el.click(), naive);
        await page.waitForFunction(() => document.querySelector('section.collision-playground dl').textContent.includes('Vsi pari'), null, {timeout: 20000});
        await sleep(800);
    }
    await context.close();
    const dom = samples.map(x => x.domMs), frame = samples.map(x => x.frameMs);
    return {switches: SWITCHES, snapshotDomMs: {median: r1(pct(dom, 0.5)), max: r1(Math.max(...dom))}, firstFrameMs: {median: r1(pct(frame, 0.5)), max: r1(Math.max(...frame))}, targetMs: profile.throttle > 1 ? 250 : null, perSwitch: samples.map(x => ({domMs: r1(x.domMs), frameMs: r1(x.frameMs)}))};
}

async function smoothness(browser, profile, url) {
    const {context, page} = await open(browser, profile, url);
    const objects = await setup(page, 'sweep');
    await browser.startTracing(page, {categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline']});
    await sleep(PLAY_MS);
    const buf = await browser.stopTracing();
    await context.close();
    const events = JSON.parse(buf.toString()).traceEvents;
    const fires = events.filter(e => e.ph === 'X' && e.name === 'FireAnimationFrame');
    const calls = events.filter(e => e.ph === 'X' && e.name === 'FunctionCall' && e.args && e.args.data && /Collision/.test(e.args.data.url || ''));
    const own = fires.filter(f => calls.some(c => c.pid === f.pid && c.tid === f.tid && c.ts >= f.ts && c.ts + c.dur <= f.ts + f.dur + 1));
    const ms = list => list.map(e => e.dur / 1000);
    const stat = list => ({frames: list.length, medianMs: r1(pct(ms(list), 0.5)), p95Ms: r1(pct(ms(list), 0.95)), maxMs: r1(Math.max(0, ...ms(list)))});
    const all = stat(fires), mine = stat(own);
    return {objectsShown: objects, method: 'sweep', allAnimationFrames: all, playgroundAnimationFrames: mine, targetMedianMs: profile.frameMedianTarget, meetsMedianTarget: mine.medianMs != null && mine.medianMs <= profile.frameMedianTarget};
}

async function lifecycle(browser, profile, url, port, headedBrowser) {
    const out = {};
    const count = async (page, ms) => { const a = await messages(page); await sleep(ms); return (await messages(page)) - a; };
    // Worker targets that belong to the page's own browser context (other contexts may still be closing).
    const workerTargets = async (bcdp, pageUrl) => {
        const {targetInfos} = await bcdp.send('Target.getTargets');
        const pageTarget = targetInfos.find(t => t.type === 'page' && t.url === pageUrl);
        if (!pageTarget) return null;
        return targetInfos.filter(t => t.type === 'worker' && t.browserContextId === pageTarget.browserContextId && t.url.startsWith(`http://127.0.0.1:${port}`)).map(t => t.url.split('/').pop());
    };
    // Earlier contexts close asynchronously: wait until no collision worker target is left anywhere before opening a page.
    const drained = async () => {
        const bcdp = await browser.newBrowserCDPSession();
        let n = -1;
        for (let i = 0; i < 40; i++) { n = (await bcdp.send('Target.getTargets')).targetInfos.filter(t => t.type === 'worker' && t.url.startsWith(`http://127.0.0.1:${port}`)).length; if (!n) break; await sleep(250); }
        await bcdp.detach();
        return n;
    };
    {
        out.headed = !!headedBrowser;
        const {context, page, cdp} = await open(headedBrowser || browser, profile, url);
        await setup(page, 'sweep');
        out.playingControl = await count(page, IDLE_MS);
        await page.evaluate(() => { const c = document.querySelector('section.collision-playground canvas').getBoundingClientRect(); window.scrollBy(0, c.bottom + 80); });
        await sleep(700);
        out.offscreenSnapshots2s = await count(page, IDLE_MS);
        // Scroll the canvas itself back: a mid-chapter canvas is not at scrollY 0. The reader never paused, so it should resume.
        await page.evaluate(() => document.querySelector('section.collision-playground canvas').scrollIntoView({block: 'center'}));
        await sleep(700);
        out.canvasInViewAfterScrollBack = await page.evaluate(() => { const r = document.querySelector('section.collision-playground canvas').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
        out.resumedAfterScrollBack = await count(page, 1000);
        // Hidden tab: a second page of the same context in front. document.hidden is read back to prove it.
        const other = await context.newPage();
        await other.goto('about:blank');
        await other.bringToFront();
        await sleep(700);
        out.hiddenMethod = 'second tab bringToFront';
        if (!(await page.evaluate(() => document.hidden))) {
            // Headed windows honour a minimise request; headless ones usually do not.
            try { const w = await cdp.send('Browser.getWindowForTarget'); await cdp.send('Browser.setWindowBounds', {windowId: w.windowId, bounds: {windowState: 'minimized'}}); out.hiddenMethod += ' + window minimised'; } catch (e) { out.minimiseError = String(e.message).slice(0, 120); }
            await sleep(1000);
        }
        out.hiddenAfterBringToFront = await page.evaluate(() => document.hidden);

        if (out.hiddenAfterBringToFront) out.hiddenSnapshots2s = await count(page, IDLE_MS);
        else { out.hiddenSnapshots2s = null; out.hiddenMethod = `not measured: document.hidden stayed false (${out.headed ? 'headed' : 'headless keeps every page visible'}; tried ${out.hiddenMethod}; minimise ${out.minimiseError || 'had no effect'})`; }
        await other.close();
        await context.close();
    }
    out.targetsDrainedBeforeNavigation = (await drained()) === 0;
    {
        const {context, page} = await open(browser, profile, url);
        await setup(page, 'sweep');
        const bcdp = await browser.newBrowserCDPSession();
        out.workerTargetsBefore = await workerTargets(bcdp, page.url());
        out.pageWorkersCreated = await page.evaluate(() => window.__workers.map(w => w.url.split('/').pop()));
        const link = page.locator(LINK).first();
        const pathBefore = await page.evaluate(() => location.pathname);
        try {
            await page.evaluate(() => { window.__marker = 1; });
            if (profile.touch) await link.tap({timeout: 3000}); else await link.click({timeout: 3000});
            await page.waitForFunction(p => location.pathname !== p, pathBefore, {timeout: 10000});
            out.clientSideNavigation = await page.evaluate(() => window.__marker === 1);
            await sleep(1000);
            out.workerTargetsAfter = await workerTargets(bcdp, page.url());
            out.pageWorkersTerminated = await page.evaluate(() => window.__workers.filter(w => w.terminated).length);
            out.trafficAfterNavigation2s = await count(page, IDLE_MS);
            out.navigatedTo = await page.evaluate(() => location.pathname);
        } catch (e) { out.navigationNote = String(e.message).split('\n')[0]; }
        await bcdp.detach();
        await context.close();
    }
    return out;
}

function renderMarkdown({environment: e, profiles}) {
    const L = [`Page: \`${e.page}\` | commit ${e.commit} | ${e.browser} | ${e.cpu} | ${e.os}`, '', e.note, ''];
    L.push('| measurement | target | ' + profiles.map(p => p.profile).join(' | ') + ' |', '|---|---|' + profiles.map(() => '---').join('|') + '|');
    const row = (name, target, f) => L.push(`| ${name} | ${target} | ` + profiles.map(p => { try { const v = f(p); return v == null ? 'n/a' : v; } catch { return 'error'; } }).join(' | ') + ' |');
    row('naive at limit: frames > 50 ms in 10 s', 'none in playground code', p => `${p.containment.loaf.framesOver50ms} (playground-attributable: ${p.containment.loaf.anyPlaygroundAttributable ? 'yes' : 'no'}; longest ${p.containment.loaf.longestMs} ms)`);
    row('scroll input to next frame p95 (p50 / max)', '<= 100 ms', p => `${p.containment.scroll.p95Ms} ms (${p.containment.scroll.p50Ms} / ${p.containment.scroll.maxMs}; n=${p.containment.scroll.inputs}, ${p.containment.scroll.kind})`);
    row('link click event duration p95 (upper bound)', '<= 100 ms', p => `${p.containment.linkClick.p95DurationMsUpperBound} ms (n=${p.containment.linkClick.clicks}, ${p.containment.linkClick.eventTimingEntriesOver16ms} >= 16 ms${p.containment.linkClick.note ? '; ' + p.containment.linkClick.note : ''})`);
    row('naive to sweep: snapshot shown (median / max)', '<= 250 ms throttled', p => `${p.switchLatency.snapshotDomMs.median} / ${p.switchLatency.snapshotDomMs.max} ms (first frame ${p.switchLatency.firstFrameMs.median} / ${p.switchLatency.firstFrameMs.max})`);
    row('sweep at limit: draw callback median (p95, frames)', '<= 16.7 desktop / 33.3 throttled', p => `${p.smoothness.playgroundAnimationFrames.medianMs} ms (${p.smoothness.playgroundAnimationFrames.p95Ms}, n=${p.smoothness.playgroundAnimationFrames.frames}; all rAF ${p.smoothness.allAnimationFrames.medianMs})`);
    row('snapshots in 2 s, playing (control)', '> 0', p => p.lifecycle.playingControl);
    row('snapshots in 2 s, canvas scrolled off-screen', '0', p => p.lifecycle.offscreenSnapshots2s);
    row('snapshots in 2 s, hidden tab', '0', p => (p.lifecycle.hiddenSnapshots2s == null ? p.lifecycle.hiddenMethod : `${p.lifecycle.hiddenSnapshots2s} (document.hidden=${p.lifecycle.hiddenAfterBringToFront})`));
    row('worker targets after client-side navigation (before)', '0', p => (p.lifecycle.workerTargetsAfter == null ? p.lifecycle.navigationNote : `${p.lifecycle.workerTargetsAfter.length} (${p.lifecycle.workerTargetsBefore.length}; page terminated ${p.lifecycle.pageWorkersTerminated} of ${p.lifecycle.pageWorkersCreated.length}); traffic 2 s: ${p.lifecycle.trafficAfterNavigation2s}`));
    return L.join('\n') + '\n';
}

(async () => {
    if (!fs.existsSync(path.join(REPO, 'build', 'index.html'))) { console.error('build/ missing: run `just build` first'); process.exit(1); }
    fs.cpSync(path.join(REPO, 'build'), COPY, {recursive: true});
    const server = await serve(COPY);
    const port = server.address().port;
    const url = `http://127.0.0.1:${port}${pagePath}`;
    const browser = await chromium.launch();
    const headedBrowser = HEADED ? await chromium.launch({headless: false}) : null;
    const environment = {
        page: pagePath, commit: sh('git rev-parse --short HEAD') + (sh('git status --porcelain src') ? ' (src dirty)' : ''),
        browser: `Chromium ${browser.version()} (Playwright ${require('@playwright/test/package.json').version}, headless)`,
        cpu: sh('powershell -NoProfile -Command "(Get-CimInstance Win32_Processor).Name"') + ` (${os.cpus().length} logical)`, os: `${os.type()} ${os.release()}`,
        buildCopy: COPY, buildIndexMtime: fs.statSync(path.join(REPO, 'build', 'index.html')).mtime.toISOString(),
        note: 'CDP CPU throttling applies to the page main thread only, not to the dedicated simulation worker (CP3 finding), so the throttled profile loads the main thread but not the worker.',
    };
    const profiles = [];
    for (const profile of PROFILES) {
        console.log(`profile ${profile.name}`);
        const result = {profile: profile.name, throttle: profile.throttle, viewport: profile.context.viewport};
        const steps = [['containment', containment], ['switchLatency', switchLatency], ['smoothness', smoothness], ['lifecycle', lifecycle]];
        for (const [key, fn] of MODE === 'playing' ? steps : MODE === 'lifecycle' ? steps.slice(3) : steps.slice(0, 1)) {
            console.log('  ' + key);
            try { result[key] = await fn(browser, profile, url, port, key === 'lifecycle' ? headedBrowser : undefined); } catch (e) { result[key] = {error: String(e.message).split('\n')[0]}; console.log('    failed: ' + result[key].error); }
        }
        profiles.push(result);
    }
    await browser.close();
    if (headedBrowser) await headedBrowser.close();
    server.close();
    fs.rmSync(COPY, {recursive: true, force: true});
    const out = {environment, profiles};
    if (jsonOut) fs.writeFileSync(path.resolve(jsonOut), JSON.stringify(out, null, 2));
    if (MODE === 'lifecycle') { for (const p of profiles) console.log('LIFECYCLE ' + p.profile + ' ' + JSON.stringify(p.lifecycle)); return; }
    if (MODE !== 'playing') {
        for (const p of profiles) console.log(`BASELINE ${MODE} ${p.profile}: scroll p95 ${p.containment.scroll && p.containment.scroll.p95Ms} ms (n=${p.containment.scroll && p.containment.scroll.inputs}), link p95 ${p.containment.linkClick && p.containment.linkClick.p95DurationMsUpperBound} ms ${p.containment.error || ''}`);
        return;
    }
    const md = renderMarkdown(out);
    if (mdOut) fs.writeFileSync(path.resolve(mdOut), md);
    console.log(md);
})().catch(error => { console.error(error); process.exit(1); });
