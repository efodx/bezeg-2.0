// Usage (cwd = worktree): node fuzz.cjs <route> [--seed N | --seeds A-B] [--steps 40] [--lesson] [--replay file.json] [--selftest]
const fs = require('fs'), path = require('path');
const DIR = __dirname;
const inv = require('./inv.cjs');
const argv = process.argv.slice(2);
if (argv.includes('--selftest')) { process.exit(require('child_process').spawnSync('node', [path.join(DIR, 'inv.cjs'), '--selftest'], {stdio: 'inherit'}).status); }
const {chromium} = require(process.cwd() + '/node_modules/playwright');
const opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const replayFile = opt('--replay');
const replayData = replayFile ? JSON.parse(fs.readFileSync(replayFile, 'utf8')) : null;
const route = replayData ? replayData.route : argv[0];
const lesson = replayData ? !!replayData.lesson : argv.includes('--lesson');
const steps = +(opt('--steps') || 40);
let seeds = [];
if (replayData) seeds = [replayData.seed || 0];
else if (opt('--seeds')) { const [a, b] = opt('--seeds').split('-').map(Number); for (let s = a; s <= b; s++) seeds.push(s); }
else seeds = [+(opt('--seed') || 1)];
const UX = 'ux=a1,a19,a3,a29,boardText,dockTools,b1,toolsCard,viewDirector';
const slug = route.replace(/\//g, '_') + (lesson ? '-lesson' : '');
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = n => String(n).replace('.', ',');

async function launchPage(browser) {
    const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
    const p = await ctx.newPage();
    const errs = []; const st = {reloaded: false};
    p.on('pageerror', e => { if (!/Unexpected token '<'/.test(e.message)) errs.push(e.message + ' | STACK ' + String(e.stack || '').split(String.fromCharCode(10)).slice(0, 25).join(' ; ')); });
    await p.goto(`http://127.0.0.1:4460/bezeg-2.0/${route}?${UX}`);
    await p.waitForTimeout(4500);
    await p.locator('.ux-board-frame').first().scrollIntoViewIfNeeded();
    await p.evaluate(() => {
        window.__fzTok = 1; window.__fz = [];
        const read = () => [...document.querySelectorAll('.ux-board-frame .ux-puck-wrap')].map((w, i) => {
            const cp = w.querySelector('.ux-count-puck'), sl = cp ? null : w.querySelector('.ux-puck[role=slider][data-param]');
            const key = (sl || cp)?.getAttribute('data-param') || 'puck' + i;
            const v = (w.querySelector('.ux-puck-value')?.textContent || '').trim();
            return {k: key, v, on: w.querySelector('.ux-puck-osc')?.getAttribute('aria-pressed') === 'true'};
        });
        setInterval(() => window.__fz.push({t: Date.now(), p: read()}), 30);
    });
    p.on('framenavigated', f => { if (f === p.mainFrame()) st.reloaded = true; });
    return {ctx, p, errs, st};
}

const info = p => p.evaluate(() => [...document.querySelectorAll('.ux-board-frame .ux-puck-wrap')].map((w, i) => {
    const cp = w.querySelector('.ux-count-puck'), sl = cp ? null : w.querySelector('.ux-puck[role=slider][data-param]');
    const el = sl || cp; if (!el) return null;
    const b = el.getBoundingClientRect(), vb = (w.querySelector('.ux-puck-valuebox') || el).getBoundingClientRect();
    if (b.width < 5 || b.bottom < 0 || b.top > innerHeight) return null;
    return {i, k: el.getAttribute('data-param') || 'puck' + i, kind: sl ? 'slider' : 'count',
        x: b.x, y: b.y, w: b.width, h: b.height, vx: vb.x + vb.width / 2, vy: vb.y + vb.height / 2,
        min: sl ? +sl.getAttribute('aria-valuemin') : 0, max: sl ? +sl.getAttribute('aria-valuemax') : 0,
        osc: !!w.querySelector('.ux-puck-osc')};
}).filter(Boolean));

function genAction(rnd, pucks, extra) {
    const R = (a, b) => a + rnd() * (b - a), I = (a, b) => Math.floor(R(a, b + 1));
    const pick = a => a[Math.floor(rnd() * a.length)];
    const sl = pucks.filter(x => x.kind === 'slider'), ct = pucks.filter(x => x.kind === 'count'), os = pucks.filter(x => x.osc);
    const opts = [];
    const add = (name, fn, ok = true) => { if (ok) opts.push([name, fn]); };
    add('hoverValue', () => ({a: 'hoverValue', k: pick(pucks).k}), pucks.length);
    add('hoverTrack', () => ({a: 'hoverTrack', k: pick(sl).k, f: +R(0.05, 0.95).toFixed(2)}), sl.length);
    add('moveTrack', () => ({a: 'moveTrack', k: pick(sl).k, f1: +R(0.05, 0.95).toFixed(2), f2: +R(0.05, 0.95).toFixed(2)}), sl.length);
    add('click', () => ({a: 'click', k: pick(pucks).k}), pucks.length);
    add('clickTrack', () => ({a: 'clickTrack', k: pick(sl).k, f: +R(0.05, 0.95).toFixed(2)}), sl.length);
    add('drag', () => ({a: 'drag', k: pick(sl).k, dx: I(-120, 120), hold: I(0, 600)}), sl.length);
    add('type', () => { const p = pick(sl); const n = +(p.min + rnd() * (p.max - p.min)).toFixed(1); const nn = /^phase.zoom$/.test(p.k) ? Math.round(n) : n; return {a: 'type', k: p.k, n: nn}; }, sl.length);
    add('arrow', () => ({a: 'arrow', k: pick(sl).k, dir: rnd() < .5 ? 'ArrowLeft' : 'ArrowRight', n: I(1, 3)}), sl.length);
    add('osc', () => ({a: 'osc', k: pick(os).k}), os.length);
    add('osc2', () => ({a: 'osc', k: pick(os).k}), os.length);   // double weight: sweeps are the interesting writer
    add('count', () => ({a: 'count', k: pick(ct).k, s: I(0, 1)}), ct.length);
    add('escape', () => ({a: 'escape'}));
    add('undo', () => ({a: 'undo'}));
    add('rest', () => ({a: 'rest', ms: I(300, 1200)}));
    if (extra.lesson) { add('next', () => ({a: 'next'})); add('back', () => ({a: 'back'})); add('next2', () => ({a: 'next'})); }
    add('dockdrag', () => ({a: 'dockdrag', dx: I(-80, 80), dy: I(-80, 80)}));
    return pick(opts)[1]();
}

async function exec(p, act, pucks) {
    const pk = pucks.find(x => x.k === act.k);
    const m = p.mouse;
    const cx = pk ? pk.x + pk.w / 2 : 0, cy = pk ? pk.y + pk.h * 0.4 : 0, ty = pk ? pk.y + pk.h * 0.88 : 0;
    const wrapOf = () => p.locator('.ux-board-frame .ux-puck-wrap').filter({has: p.locator(`[data-param="${pk.k}"]`)}).first();
    const none = {write: null, lesson: false};
    const noPuck = ['rest', 'escape', 'undo', 'next', 'back', 'dockdrag'];
    if (!noPuck.includes(act.a) && !pk) return {...none, skipped: true};
    switch (act.a) {
        case 'hoverValue': await m.move(pk.vx, pk.vy, {steps: 4}); return none;
        case 'hoverTrack': await m.move(pk.x + pk.w * act.f, ty, {steps: 4}); return none;
        case 'moveTrack': await m.move(pk.x + pk.w * act.f1, ty); for (let s = 1; s <= 8; s++) { await m.move(pk.x + pk.w * (act.f1 + (act.f2 - act.f1) * s / 8), ty); await sleep(35); } return none;
        case 'click': await m.move(cx, cy, {steps: 3}); await m.click(cx, cy); return none;
        case 'clickTrack': await m.move(pk.x + pk.w * act.f, ty, {steps: 3}); await m.click(pk.x + pk.w * act.f, ty); return {write: {k: pk.k}, lesson: false};
        case 'drag': {
            await m.move(cx, cy, {steps: 3}); await m.down();
            for (let s = 1; s <= 8; s++) { await m.move(cx + act.dx * s / 8, cy); await sleep(25); }
            await sleep(act.hold); await m.up(); return {write: {k: pk.k}, lesson: false};
        }
        case 'type': {
            await m.move(cx, cy, {steps: 3}); await m.dblclick(cx, cy);
            await sleep(150);
            const isInput = await p.evaluate(() => /INPUT|TEXTAREA/.test(document.activeElement?.tagName || ''));
            if (!isInput) { await p.keyboard.press('Escape'); return {...none, skipped: true, note: 'no input opened'}; }
            await p.keyboard.press('Control+A'); await p.keyboard.type(fmt(act.n)); await p.keyboard.press('Enter');
            return {write: {k: pk.k, typed: act.n}, lesson: false};
        }
        case 'arrow': {
            await p.evaluate(k => document.querySelector(`.ux-puck[data-param="${k}"]`)?.focus(), pk.k);
            for (let s = 0; s < act.n; s++) { await p.keyboard.press(act.dir); await sleep(40); }
            return {write: {k: pk.k}, lesson: false};
        }
        case 'osc': {
            const w = wrapOf(); await m.move(cx, cy, {steps: 3}); await sleep(120);
            await w.locator('.ux-puck-osc').click({force: true, timeout: 2000}); return none;
        }
        case 'count': { await wrapOf().locator('.ux-count-step').nth(act.s).click({force: true, timeout: 2000}); return {write: {k: pk.k}, lesson: false}; }
        case 'escape': await p.keyboard.press('Escape'); return {write: null, lesson: false, esc: true};
        case 'undo': { const b = p.locator('.ux-puck-undo button').first(); if (await b.isVisible().catch(() => false)) { await b.click({timeout: 2000}); return {write: null, lesson: false, undo: true}; } return {...none, skipped: true}; }
        case 'rest': await m.move(10, 10); await sleep(act.ms); return none;
        case 'next': case 'back': {
            const b = p.locator(act.a === 'next' ? '.guided-lesson-nav-next' : '.guided-lesson-nav-back').first();
            if (await b.isVisible().catch(() => false) && await b.isEnabled().catch(() => false)) { await b.click({timeout: 2000}); return {write: null, lesson: true}; }
            return {...none, skipped: true};
        }
        case 'dockdrag': {
            const h = p.locator('.ux-btext-head').first();
            const bb = await h.boundingBox().catch(() => null); if (!bb) return {...none, skipped: true};
            const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
            await m.move(x, y); await m.down(); for (let s = 1; s <= 5; s++) { await m.move(x + act.dx * s / 5, y + act.dy * s / 5); await sleep(25); } await m.up(); return none;
        }
    }
    return none;
}

const seriesOf = (log, k, t0, t1) => log.filter(e => e.t >= t0 && e.t <= t1).map(e => { const q = e.p.find(x => x.k === k); return q ? {t: e.t, v: q.v, on: q.on} : null; }).filter(Boolean);
const keysOf = (log, t0, t1) => [...new Set(log.filter(e => e.t >= t0 && e.t <= t1).flatMap(e => e.p.map(x => x.k)))];

async function runOnce(browser, seed, getAction, nSteps) {
    const {ctx, p, errs, st} = await launchPage(browser);
    const done = []; const swing = {};
    try {
        for (let step = 0; step < nSteps; step++) {
            const pucks = await info(p);
            const act = getAction(step, pucks);
            if (!act) break;
            const tS = Date.now();
            let r; try { r = await exec(p, act, pucks); } catch (e) { r = {write: null, lesson: false, skipped: true, note: 'exec error ' + String(e.message).split('\n')[0]}; }
            const tE = Date.now();
            done.push({...act});
            await sleep((r.write || r.esc || r.undo) ? 1200 : 700);
            const tEnd = Date.now();
            const fl = await p.evaluate(() => ({tok: window.__fzTok, frame: !!document.querySelector('.ux-board-frame .ux-puck-wrap'), log: window.__fz.splice(0)}));
            if (st.reloaded || !fl.tok) { await ctx.close(); return {status: 'INVALID', actions: done}; }
            const log = fl.log;
            for (const e of log) for (const q of e.p) { const n = inv.num(q.v); if (q.on && n !== null) { const s = swing[q.k] || (swing[q.k] = {mn: n, mx: n}); s.mn = Math.min(s.mn, n); s.mx = Math.max(s.mx, n); } }
            const mkFail = (invariant, why, detail) => ({seed, step, route, invariant, why, detail, actions: done.slice()});
            let f = null;
            if (errs.length) f = mkFail('I4', 'page error: ' + errs[0]);
            else if (!fl.frame) f = mkFail('I4', 'board / pucks no longer mounted');
            if (!f && !r.skipped) {
                const keys = keysOf(log, tE, tEnd);
                const w = r.write;
                if (w && !r.lesson) { const s = seriesOf(log, w.k, tE, tEnd); const x = inv.checkI1(s, tE, w.typed); if (x) f = mkFail('I1', x.why, {param: w.k, ...x, samples: s.filter((_, i) => i % 3 === 0).map(q => q.v + (q.on ? '~' : '')).join(' ')}); }
                if (!f && r.esc) for (const k of keys) { const x = inv.checkI3(seriesOf(log, k, tE, tEnd), tE); if (x) { f = mkFail('I3', x.why, {param: k, ...x}); break; } }
                if (!f) for (const k of keys) { const x = inv.checkI2(seriesOf(log, k, r.lesson ? tE + 800 : tE, tEnd), swing[k]); if (x) { f = mkFail('I2', `${x.a} -> ${x.b} -> ${x.a} within 300 ms`, {param: k, ...x}); break; } }
                if (!f && !r.lesson && !r.undo) for (const k of keys) {
                    if (w && w.k === k) continue;
                    const x = inv.checkI5(seriesOf(log, k, tS, tEnd)); if (x) { f = mkFail('I5', x.why, {param: k, ...x}); break; }
                }
            }
            if (f) {
                f.shot = `fail-${slug}-${seed}.png`;
                await p.screenshot({path: path.join(DIR, f.shot)}).catch(() => {});
                await ctx.close(); return {status: 'FAIL', fail: f, actions: done};
            }
        }
        await ctx.close();
        return {status: 'PASS', actions: done};
    } catch (e) { await ctx.close().catch(() => {}); return {status: 'INVALID', actions: done, err: e.message}; }
}

async function shrink(browser, seed, fail) {
    let best = fail.actions.slice(); let replays = 0;
    const tryList = async list => {
        replays++;
        const r = await runOnce(browser, seed, i => list[i] || null, list.length);
        return r.status === 'FAIL' && r.fail.invariant === fail.invariant ? r : null;
    };
    for (let i = best.length - 2; i >= 0 && replays < 15; i--) {
        const cand = best.slice(0, i).concat(best.slice(i + 1));
        const r = await tryList(cand);
        if (r) best = r.actions.slice();
    }
    return {min: best, replays};
}

(async () => {
    const browser = await chromium.launch();
    let nPass = 0, nFail = 0, nInvalid = 0;
    for (const seed of seeds) {
        let res, tries = 0;
        do {
            const rnd = mulberry(seed * 7919 + 13);
            if (replayData) res = await runOnce(browser, seed, i => replayData.actions[i] || null, replayData.actions.length);
            else res = await runOnce(browser, seed, (i, pucks) => genAction(rnd, pucks, {lesson}), steps);
            tries++;
        } while (res.status === 'INVALID' && tries < 3);
        if (res.status === 'PASS') { nPass++; console.log(`PASS ${route} seed=${seed} steps=${res.actions.length}`); }
        else if (res.status === 'INVALID') { nInvalid++; console.log(`INVALID ${route} seed=${seed} (reload/exec error) ${res.err || ''}`); }
        else {
            nFail++;
            const f = res.fail;
            console.log(`FAIL ${route} seed=${seed} step=${f.step} ${f.invariant}: ${f.why}\n  detail=${JSON.stringify(f.detail)}\n  actions=${JSON.stringify(f.actions.map(a => a.a + (a.k ? ':' + a.k : '')))}\n  shot=${f.shot}`);
            fs.writeFileSync(path.join(DIR, `fail-${slug}-${seed}.json`), JSON.stringify({route, seed, lesson, fail: f, actions: f.actions}, null, 1));
            if (!replayData) {
                const s = await shrink(browser, seed, f);
                fs.writeFileSync(path.join(DIR, `min-${slug}-${seed}.json`), JSON.stringify({route, seed, lesson, invariant: f.invariant, actions: s.min}, null, 1));
                console.log(`  shrunk ${f.actions.length} -> ${s.min.length} actions in ${s.replays} replays: min-${slug}-${seed}.json`);
            }
        }
    }
    console.log(`SUMMARY ${route}${lesson ? ' --lesson' : ''} pass=${nPass} fail=${nFail} invalid=${nInvalid}`);
    await browser.close();
})();
