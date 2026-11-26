// Interaction fuzzer for the repository's workspace. See scripts/fuzz/README.md.
// node scripts/fuzz/fuzz.cjs --base <url> [--route <path>]... [--lesson <path>] [--seeds N | --seed S] [--steps K]
//     [--replay <case.json|dir>] [--repeat R] [--selftest] [--inject-stale] [--out <dir>]
const fs = require('fs'), path = require('path');
const inv = require('./inv.cjs');
const argv = process.argv.slice(2);
if (argv.includes('--selftest')) process.exit(inv.selftest() ? 0 : 1);

const opts = n => { const r = []; argv.forEach((a, i) => { if (a === n && argv[i + 1] !== undefined) r.push(argv[i + 1]); }); return r; };
const opt = (n, d = null) => { const v = opts(n); return v.length ? v[v.length - 1] : d; };
const BASE = (opt('--base') || '').replace(/\/?$/, '/');
const OUT = path.resolve(opt('--out', '.command-logs/fuzz'));
const STEPS = +opt('--steps', 30);
const REPEAT = +opt('--repeat', 5);
const INJECT = argv.includes('--inject-stale');
const replayArg = opt('--replay');
if (!opt('--base')) { console.error('usage: node scripts/fuzz/fuzz.cjs --base <url> [--route <path>]... [--lesson <path>] [--seeds N | --seed S] [--steps K] [--replay <case|dir>] [--repeat R] [--inject-stale] [--selftest] [--out <dir>]'); process.exit(2); }
fs.mkdirSync(OUT, {recursive: true});
const {chromium} = require(process.cwd() + '/node_modules/playwright');

const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = n => String(n).replace('.', ',');
const slugOf = (route, lesson) => route.replace(/\//g, '_') + (lesson ? '-lesson' : '');
// "Workspace mounted" on every route kind: 2D routes have navigation buttons and sliders, surface routes (patches/coons)
// have no navigation and may have no sliders, but always render the shared board stage (DemonstrationWorkspace).
const MOUNTED = '[data-navigation], input[type=range], .workspace-board-stage';

// --- page ------------------------------------------------------------------------------------------------------
// The sampler runs once per animation frame in the page and records every visible slider (range value) and every
// standalone number field (count setters, point coordinates) plus whether a playback is running.
const SAMPLER = () => {
    window.__fzTok = 1; window.__fz = [];
    const vis = e => { if (e.closest('details:not([open])')) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const read = () => {
        const p = {}; let ix = 0;
        for (const f of document.querySelectorAll('form.slider-field')) { const r = f.querySelector('input[type=range]'); if (r && vis(r)) p['s' + ix] = r.value; ix++; }
        let n = 0;
        for (const s of document.querySelectorAll('input[role=spinbutton]')) { if (s.closest('form.slider-field')) continue; if (vis(s)) p['n' + n] = s.value; n++; }
        // Pucks (task 05): the live value of each puck in the board strip, by position; an open typed entry has no role and is skipped.
        let px = 0;
        for (const h of document.querySelectorAll('.puck-strip .puck-host[data-puck-key]')) { const b = h.querySelector('[role=slider],[role=spinbutton]'); if (b && vis(b)) p['p' + px] = b.getAttribute('aria-valuenow'); px++; }
        const pl = [...document.querySelectorAll('button')].some(b => /^Premor$/.test((b.getAttribute('aria-label') || b.textContent || '').trim()));
        return {p, pl};
    };
    const tick = () => { const r = read(); window.__fz.push({t: Date.now(), p: r.p, pl: r.pl}); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
};

async function launchPage(browser, route, lesson) {
    const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
    await ctx.addInitScript(() => { try { localStorage.setItem('bezeg-language', 'sl'); } catch (e) { /* ignore */ } });
    const p = await ctx.newPage();
    const errs = []; const st = {reloaded: false};
    p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(0, 6).join(' ; ')));
    p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
    await p.goto(BASE + route);
    await p.waitForSelector(`${MOUNTED}, canvas`, {timeout: 20000});
    await p.waitForTimeout(3000);
    if (lesson) {
        await p.getByRole('button', {name: /Spoznaj to demonstracijo/}).first().click({timeout: 8000});
        await p.waitForSelector('section.guided-lesson', {timeout: 8000});
        await p.waitForTimeout(800);
    }
    await p.evaluate(SAMPLER);
    p.on('framenavigated', f => { if (f === p.mainFrame()) st.reloaded = true; });
    return {ctx, p, errs, st};
}

// Tags the live controls with data-fz* attributes and returns their geometry; keys match the sampler's.
const info = p => p.evaluate(() => {
    const vis = e => { if (e.closest('details:not([open])')) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
    const sliders = [], counts = [], points = [];
    let ix = 0, n = 0;
    for (const f of document.querySelectorAll('form.slider-field')) {
        const r = f.querySelector('input[type=range]');
        if (r && vis(r)) {
            r.setAttribute('data-fzs', 's' + ix);
            const fld = f.querySelector('input[role=spinbutton]'); if (fld) fld.setAttribute('data-fzf', 's' + ix);
            const b = r.getBoundingClientRect();
            sliders.push({k: 's' + ix, x: b.x, y: b.y, w: b.width, h: b.height, min: +r.min, max: +r.max, step: +r.step || 0.01, field: !!fld, now: r.value});
        }
        ix++;
    }
    for (const s of document.querySelectorAll('input[role=spinbutton]')) {
        if (s.closest('form.slider-field')) continue;
        if (vis(s)) {
            let e = s, inc = null, dec = null;
            for (let k = 0; e && k < 4 && !inc; k++, e = e.parentElement) {
                inc = [...e.querySelectorAll('button')].find(b => /Povečaj število/.test(b.getAttribute('aria-label') || '')) || null;
                dec = [...e.querySelectorAll('button')].find(b => /Zmanjšaj število/.test(b.getAttribute('aria-label') || '')) || null;
            }
            if (inc && dec) { inc.setAttribute('data-fzc', 'n' + n + ':inc'); dec.setAttribute('data-fzc', 'n' + n + ':dec'); counts.push({k: 'n' + n}); }
        }
        n++;
    }
    const pucks = []; let px = 0;
    for (const h of document.querySelectorAll('.puck-strip .puck-host[data-puck-key]')) {
        const b = h.querySelector('[role=slider],[role=spinbutton]');
        if (b && vis(b)) {
            h.setAttribute('data-fzp', 'p' + px);
            const r = b.getBoundingClientRect();
            pucks.push({k: 'p' + px, count: b.getAttribute('role') === 'spinbutton', min: +b.getAttribute('aria-valuemin'), max: +b.getAttribute('aria-valuemax'), x: r.x, y: r.y, w: r.width, h: r.height, track: (() => { const t = h.querySelector('.puck-track'); if (!t) return null; const q = t.getBoundingClientRect(); return {x: q.x, y: q.y, w: q.width, h: q.height}; })()});
        }
        px++;
    }
    const pplay = !!document.querySelector('.puck-strip [data-action=play-pause]'), preset = !!document.querySelector('.puck-strip [data-action=reset]');
    const play = [...document.querySelectorAll('button')].filter(b => /^(Predvajaj|Premor)$/.test((b.getAttribute('aria-label') || b.textContent || '').trim()) && vis(b)).length;
    const board = window.JXG && Object.values(window.JXG.boards)[0];
    let rect = null;
    if (board) {
        const r = board.containerObj.getBoundingClientRect();
        rect = {x: r.left, y: r.top, w: r.width, h: r.height};
        board.objectsList.filter(o => o.elType === 'point' && o.visProp && o.visProp.visible !== false && !o.visProp.fixed && o.coords).forEach(o => {
            const sx = r.left + o.coords.scrCoords[1], sy = r.top + o.coords.scrCoords[2];
            if (sx > r.left + 4 && sx < r.right - 4 && sy > r.top + 4 && sy < r.bottom - 4) points.push({x: sx, y: sy});
        });
    }
    return {sliders, counts, play, rect, points, pucks, pplay, preset};
});

const PRANGE_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift+ArrowLeft', 'Shift+ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'];
const PCOUNT_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
// A typed puck entry: the text for a mode (in range, out of range, off the step grid, not a number) and whether it ends in a write.
function puckText(q, act) {
    const span = q.max - q.min;
    if (act.mode === 'nan') return {text: 'abc', writes: false};
    if (act.mode === 'out') return {text: fmt(+(q.max + span * 0.5 + 1).toFixed(3)), writes: false};
    if (act.mode === 'off') return {text: fmt(+(q.min + span * act.f + span * 0.0137).toFixed(4)), writes: true};
    return {text: fmt(Math.round(q.min + span * act.f)), writes: true};
}
// --- generator ---------------------------------------------------------------------------------------------------
function genAction(rnd, c, extra) {
    const R = (a, b) => a + rnd() * (b - a), I = (a, b) => Math.floor(R(a, b + 1));
    const pick = a => a[Math.floor(rnd() * a.length)];
    const opts = [];
    const add = (name, fn, ok = true, weight = 1) => { if (ok) for (let i = 0; i < weight; i++) opts.push([name, fn]); };
    const sl = c.sliders, typable = sl.filter(s => s.field);
    add('drag', () => { const s = pick(sl); return {a: 'drag', k: s.k, f1: +R(0.05, 0.95).toFixed(2), f2: +R(0.05, 0.95).toFixed(2), hold: I(0, 600)}; }, sl.length, 2);
    add('clickTrack', () => ({a: 'clickTrack', k: pick(sl).k, f: +R(0.05, 0.95).toFixed(2)}), sl.length);
    add('arrow', () => ({a: 'arrow', k: pick(sl).k, dir: rnd() < .5 ? 'ArrowLeft' : 'ArrowRight', n: I(1, 3)}), sl.length, 2);
    add('type', () => {
        const s = pick(typable); const steps = Math.round((s.max - s.min) / s.step), g = Math.floor(rnd() * (steps + 1));
        // aligned to the slider's step, so an integer-step parameter never gets a typed decimal
        return {a: 'type', k: s.k, n: +(s.min + g * s.step).toFixed(6)};
    }, typable.length, 2);
    add('count', () => ({a: 'count', k: pick(c.counts).k, s: I(0, 1)}), c.counts.length);
    add('play', () => ({a: 'play'}), c.play > 0, 2);
    // Puck actions (task 05). Range pucks take keys, drags (with a vertical offset for the fine levels), a track click and typed entry;
    // count pucks take keys, the minus and plus buttons and typed entry; a puck that carries playback takes Play/Pause and Reset.
    const pk = c.pucks || [], rangeP = pk.filter(x => !x.count), countP = pk.filter(x => x.count);
    add('pkey', () => { const q = pick(pk); return {a: 'pkey', k: q.k, key: pick(q.count ? PCOUNT_KEYS : PRANGE_KEYS), n: I(1, 3)}; }, pk.length, 3);
    add('pdrag', () => ({a: 'pdrag', k: pick(rangeP).k, dx: I(-260, 260), dy: pick([0, 0, 0, 30, 90, 200]), hold: I(0, 400)}), rangeP.length, 3);
    add('ptrack', () => ({a: 'ptrack', k: pick(rangeP).k, f: +R(0.15, 0.9).toFixed(2)}), rangeP.length);
    add('pbtn', () => ({a: 'pbtn', k: pick(countP).k, s: I(0, 1), n: I(1, 2)}), countP.length, 2);
    add('ptype', () => ({a: 'ptype', k: pick(pk).k, mode: pick(['in', 'in', 'out', 'off', 'nan']), f: +R(0, 1).toFixed(3), via: pick(['dbl', 'dbl', 'key']), end: pick(['Enter', 'Enter', 'Escape'])}), pk.length, 3);
    add('pplay', () => ({a: 'pplay'}), !!c.pplay, 2);
    add('preset', () => ({a: 'preset'}), !!c.preset);
    add('boardDrag', () => ({a: 'boardDrag', i: I(0, 50), dx: I(-80, 80), dy: I(-80, 80)}), c.points.length, 2);
    add('pan', () => ({a: 'pan', dx: I(-90, 90), dy: I(-60, 60)}), !!c.rect);
    add('wheel', () => ({a: 'wheel', dy: pick([-300, -150, 150, 300])}), !!c.rect);
    add('escape', () => ({a: 'escape'}), true, 2);
    add('rest', () => ({a: 'rest', ms: I(300, 1000)}));
    if (extra.lesson) add('next', () => ({a: 'next'}), true, 2), add('back', () => ({a: 'back'}));
    return pick(opts)[1]();
}

// --- executor ----------------------------------------------------------------------------------------------------
const readSlider = (p, k) => p.evaluate(k => document.querySelector(`[data-fzs="${k}"]`)?.value ?? null, k);
async function exec(p, act, c) {
    const m = p.mouse, none = {write: null};
    const sl = c.sliders.find(x => x.k === act.k);
    const pq = act.k && act.a[0] === 'p' && act.a !== 'play' && act.a !== 'pplay' ? (c.pucks || []).find(x => x.k === act.k) : null;
    if (act.a[0] === 'p' && act.k && !pq) return {...none, skipped: true};
    const needsSlider = ['drag', 'clickTrack', 'arrow', 'type'].includes(act.a);
    if (needsSlider && !sl) return {...none, skipped: true};
    // The slider may sit inside a scrolled inspector (an earlier focus scrolled it away): bring it into view and read its box
    // again, or the pointer lands on whatever is at the old coordinates and the "learner write" never happens.
    if (sl && ['drag', 'clickTrack'].includes(act.a)) {
        const b = await p.locator(`[data-fzs="${sl.k}"]`).evaluate(e => { e.scrollIntoView({block: 'nearest'}); const r = e.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; }).catch(() => null);
        if (b) Object.assign(sl, b);
    }
    const midY = sl ? sl.y + sl.h / 2 : 0;
    // `stale`: a slider write is followed by a delayed write of the previous value (acceptance check for I1).
    const withStale = async fn => {
        const prev = await readSlider(p, sl.k);
        await fn();
        const next = await readSlider(p, sl.k);
        if (INJECT && prev !== null && prev !== next) {
            await p.evaluate(([k, v]) => setTimeout(() => {
                const el = document.querySelector(`[data-fzs="${k}"]`); if (!el) return;
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
                el.dispatchEvent(new Event('input', {bubbles: true}));
            }, 150), [sl.k, prev]);
        }
    };
    switch (act.a) {
        case 'drag': await withStale(async () => {
            await m.move(sl.x + sl.w * act.f1, midY, {steps: 3}); await m.down();
            for (let s = 1; s <= 8; s++) { await m.move(sl.x + sl.w * (act.f1 + (act.f2 - act.f1) * s / 8), midY); await sleep(25); }
            await sleep(act.hold); await m.up();
        }); return {write: {k: sl.k}};
        case 'clickTrack': await withStale(async () => { await m.move(sl.x + sl.w * act.f, midY, {steps: 3}); await m.click(sl.x + sl.w * act.f, midY); }); return {write: {k: sl.k}};
        case 'arrow': await withStale(async () => {
            await p.evaluate(k => document.querySelector(`[data-fzs="${k}"]`)?.focus(), sl.k);
            for (let s = 0; s < act.n; s++) { await p.keyboard.press(act.dir); await sleep(40); }
        }); return {write: {k: sl.k}};
        case 'type': {
            const f = p.locator(`[data-fzf="${sl.k}"]`).first();
            await withStale(async () => { await f.click({timeout: 3000}); await p.keyboard.press('Control+A'); await p.keyboard.type(fmt(act.n)); await p.keyboard.press('Enter'); });
            return {write: {k: sl.k, typed: act.n}};
        }
        case 'count': {
            const b = p.locator(`[data-fzc="${act.k}:${act.s ? 'inc' : 'dec'}"]`).first();
            if (!(await b.count())) return {...none, skipped: true};
            await b.click({timeout: 3000, force: true}); return {write: {k: act.k}};
        }
        case 'pkey': {
            await p.evaluate(k => document.querySelector(`[data-fzp="${k}"] [role=slider],[data-fzp="${k}"] [role=spinbutton]`)?.focus(), pq.k);
            for (let s = 0; s < act.n; s++) { await p.keyboard.press(act.key); await sleep(40); }
            return {write: {k: pq.k}};
        }
        case 'pdrag': {
            const x = pq.x + pq.w / 2, y = pq.y + pq.h / 2;
            await m.move(x, y, {steps: 3}); await m.down();
            for (let s = 1; s <= 8; s++) { await m.move(x + act.dx * s / 8, y - act.dy * Math.min(1, s / 3)); await sleep(25); }
            await sleep(act.hold); await m.up(); return {write: {k: pq.k}};
        }
        case 'ptrack': {
            // A click only jumps when it lands on the track element (a thin bar inside the body), not on the value text.
            const t = pq.track; if (!t) return {...none, skipped: true};
            const x = t.x + t.w * act.f, y = t.y + t.h / 2;
            await m.move(x, y, {steps: 3}); await m.click(x, y); return {write: {k: pq.k}};
        }
        case 'pbtn': {
            const b = p.locator(`[data-fzp="${pq.k}"] .puck-step`).nth(act.s ? 1 : 0);
            for (let s = 0; s < act.n; s++) { if (await b.count()) await b.click({timeout: 3000, force: true}); await sleep(60); }
            return {write: {k: pq.k}};
        }
        case 'ptype': {
            const {text, writes} = puckText(pq, act);
            const body = p.locator(`[data-fzp="${pq.k}"] [role=slider],[data-fzp="${pq.k}"] [role=spinbutton]`).first();
            if (act.via === 'key') { await body.focus(); await p.keyboard.type(text, {delay: 30}); }
            // Double-click the value text: a click on the track would jump the value (a learner write the step does not expect).
            else { await body.locator('.puck-value').dblclick({timeout: 3000}); await p.keyboard.press('Control+A'); await p.keyboard.type(text, {delay: 20}); }
            await p.keyboard.press(act.end);
            // A refused Enter leaves the entry open (with the reason); close it, or the next click lands on a puck that shifted width.
            if (act.end === 'Enter' && !writes) { await sleep(150); await p.keyboard.press('Escape'); }
            // An Escape, a refused value or a non-number leaves the store alone (checked as I5); a valid Enter is a learner write.
            return act.end === 'Enter' && writes ? {write: {k: pq.k}} : {...none, esc: false};
        }
        case 'pplay': {
            const b = p.locator('.puck-strip [data-action=play-pause]').first();
            if (!(await b.isVisible().catch(() => false))) return {...none, skipped: true};
            await b.click({timeout: 3000}); return {...none, anyWrite: true};
        }
        case 'preset': {
            const b = p.locator('.puck-strip [data-action=reset]').first();
            if (!(await b.isVisible().catch(() => false))) return {...none, skipped: true};
            await b.click({timeout: 3000, force: true}); return {...none, anyWrite: true};
        }
        case 'play': {
            const b = p.getByRole('button', {name: /^(Predvajaj|Premor)$/}).first();
            if (!(await b.isVisible().catch(() => false))) return {...none, skipped: true};
            await b.click({timeout: 3000}); return {...none, anyWrite: true};
        }
        case 'boardDrag': {
            if (!c.points.length) return {...none, skipped: true};
            const pt = c.points[act.i % c.points.length];
            await m.move(pt.x, pt.y, {steps: 3}); await m.down();
            for (let s = 1; s <= 6; s++) { await m.move(pt.x + act.dx * s / 6, pt.y + act.dy * s / 6); await sleep(25); }
            await m.up(); return {...none, anyWrite: true};
        }
        case 'pan': {
            if (!c.rect) return {...none, skipped: true};
            // The bottom-left corner is the puck strip: a pan started there would drag a puck, so start at the top-right.
            const x = c.rect.x + c.rect.w - 25, y = c.rect.y + 25;
            await m.move(x, y); await m.down();
            for (let s = 1; s <= 6; s++) { await m.move(x + act.dx * s / 6, y + act.dy * s / 6); await sleep(20); }
            await m.up(); return none;
        }
        case 'wheel': if (!c.rect) return {...none, skipped: true}; await m.move(c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h / 2); await m.wheel(0, act.dy); return none;
        case 'escape': {
            // While a puck's "Razveljavi" pill shows (4 s after a jump), Esc restores the previous value by design: not an untouched change.
            const undo = (await p.locator('.puck-undo').count()) > 0;
            await p.keyboard.press('Escape'); return {...none, esc: true, anyWrite: undo};
        }
        case 'rest': await m.move(5, 5); await sleep(act.ms); return none;
        case 'next': case 'back': {
            const b = p.locator(act.a === 'next' ? 'section.guided-lesson .guided-lesson-nav-next' : 'section.guided-lesson .guided-lesson-nav-back').first();
            if (await b.isVisible().catch(() => false) && await b.isEnabled().catch(() => false)) { await b.click({timeout: 3000}); return {...none, lesson: true}; }
            return {...none, skipped: true};
        }
    }
    return none;
}

// Series for one control over a window. `on` marks a control that moved while a playback ran (the playing one).
function seriesOf(log, k, t0, t1) {
    const s = log.filter(e => e.t >= t0 && e.t <= t1 && e.p[k] !== undefined).map(e => ({t: e.t, v: e.p[k], pl: e.pl}));
    // a playback's closing write may land one frame after the Pause button has appeared or gone
    const moved = s.some((q, i) => i > 0 && (q.pl || s[i - 1].pl) && q.v !== s[i - 1].v);
    return s.map(q => ({t: q.t, v: q.v, on: moved && q.pl}));
}
// Routes whose parameters are derived from their point fields (linear function: k and n move both points).
const COUPLED_FIELDS = {'functions/linear': true};
const keysOf =(log, t0, t1) => [...new Set(log.filter(e => e.t >= t0 && e.t <= t1).flatMap(e => Object.keys(e.p)))];

async function runOnce(browser, route, lesson, seed, getAction, nSteps) {
    let g; try { g = await launchPage(browser, route, lesson); } catch (e) { return {status: 'INVALID', actions: [], err: 'launch: ' + String(e.message).split('\n')[0]}; }
    const {ctx, p, errs, st} = g;
    const done = []; const swing = {};
    try {
        for (let step = 0; step < nSteps; step++) {
            const c = await info(p);
            const act = getAction(step, c);
            if (!act) break;
            const tS = Date.now();
            let r; try { r = await exec(p, act, c); } catch (e) { r = {write: null, skipped: true, note: 'exec error ' + String(e.message).split('\n')[0]}; }
            const tE = Date.now();
            done.push({...act});
            await sleep((r.write || r.esc) ? 1250 : 600);
            const tEnd = Date.now();
            const fl = await p.evaluate(sel => ({tok: window.__fzTok, board: !!document.querySelector(sel), log: window.__fz.splice(0)}), MOUNTED);
            if (st.reloaded || !fl.tok) { await ctx.close(); return {status: 'INVALID', actions: done, err: 'page reloaded'}; }
            const log = fl.log;
            const mkFail = (invariant, why, detail) => ({seed, step, route, lesson, invariant, why, detail, actions: done.slice()});
            let f = null;
            if (errs.length) f = mkFail('I4', errs[0]);
            else if (!fl.board) f = mkFail('I4', 'workspace no longer mounted');
            if (!f && !r.skipped) {
                const keys = keysOf(log, tE, tEnd);
                const w = r.write;
                for (const k of keys) { const s = seriesOf(log, k, tS, tEnd).filter(q => q.on); for (const q of s) { const n = inv.num(q.v); if (n !== null) { const sw = swing[k] || (swing[k] = {mn: n, mx: n}); sw.mn = Math.min(sw.mn, n); sw.mx = Math.max(sw.mx, n); } } }
                if (w && !r.lesson) { const s = seriesOf(log, w.k, tE, tEnd); const x = inv.checkI1(s, tE, w.typed); if (x) f = mkFail('I1', x.why, {param: w.k, ...x, samples: s.filter((_, i) => i % 4 === 0).map(q => q.v).join(' ')}); }
                if (!f && r.esc) for (const k of keys) { const x = inv.checkI3(seriesOf(log, k, tE, tEnd), tE); if (x) { f = mkFail('I3', x.why, {param: k, ...x}); break; } }
                if (!f) for (const k of keys) { const x = inv.checkI2(seriesOf(log, k, r.lesson ? tE + 800 : tE, tEnd), swing[k]); if (x) { f = mkFail('I2', `${x.a} -> ${x.b} -> ${x.a} within 300 ms`, {param: k, ...x}); break; } }
                if (!f && !r.lesson && !r.anyWrite) for (const k of keys) {
                    if (w && w.k === k) continue;
                    // A line's slope or intercept is not independent of its points: the point fields follow it by definition.
                    if (w && /^n\d+$/.test(k) && COUPLED_FIELDS[route]) continue;
                    const x = inv.checkI5(seriesOf(log, k, tS, tEnd)); if (x) { f = mkFail('I5', x.why, {param: k, ...x}); break; }
                }
            }
            if (f) { await ctx.close(); return {status: 'FAIL', fail: f, actions: done}; }
        }
        await ctx.close();
        return {status: 'PASS', actions: done};
    } catch (e) { await ctx.close().catch(() => {}); return {status: 'INVALID', actions: done, err: String(e.message).split('\n')[0]}; }
}

async function shrink(browser, route, lesson, seed, fail) {
    let best = fail.actions.slice(), replays = 0;
    for (let i = best.length - 2; i >= 0 && replays < 15; i--) {
        const cand = best.slice(0, i).concat(best.slice(i + 1));
        replays++;
        const r = await runOnce(browser, route, lesson, seed, i2 => cand[i2] || null, cand.length);
        if (r.status === 'FAIL' && r.fail.invariant === fail.invariant) best = r.actions.slice();
    }
    return {min: best, replays};
}

const describeFail = f => `${f.invariant} step=${f.step}: ${f.why}\n    detail=${JSON.stringify(f.detail)}\n    actions=${JSON.stringify(f.actions.map(a => a.a + (a.k ? ':' + a.k : '')))}`;

async function runSeed(browser, route, lesson, seed, steps) {
    let res, tries = 0;
    do {
        const rnd = mulberry(seed * 7919 + 13);
        res = await runOnce(browser, route, lesson, seed, (i, c) => genAction(rnd, c, {lesson}), steps);
    } while (res.status === 'INVALID' && ++tries < 3);
    return res;
}

async function fuzzRoute(browser, route, lesson, seeds, steps) {
    const slug = slugOf(route, lesson), label = route + (lesson ? ' (lesson)' : '');
    let pass = 0, fail = 0, invalid = 0;
    for (const seed of seeds) {
        const res = await runSeed(browser, route, lesson, seed, steps);
        if (res.status === 'PASS') { pass++; console.log(`  PASS ${label} seed=${seed} steps=${res.actions.length}`); }
        else if (res.status === 'INVALID') { invalid++; console.log(`  INVALID ${label} seed=${seed} ${res.err || ''}`); }
        else {
            fail++;
            console.log(`  FAIL ${label} seed=${seed} ${describeFail(res.fail)}`);
            fs.writeFileSync(path.join(OUT, `fail-${slug}-${seed}.json`), JSON.stringify({route, seed, lesson, steps, invariant: res.fail.invariant, fail: res.fail, actions: res.actions}, null, 1));
            const s = await shrink(browser, route, lesson, seed, res.fail);
            fs.writeFileSync(path.join(OUT, `min-${slug}-${seed}.json`), JSON.stringify({route, seed, lesson, invariant: res.fail.invariant, actions: s.min}, null, 1));
            console.log(`    shrunk ${res.actions.length} -> ${s.min.length} actions in ${s.replays} replays: ${path.join(OUT, `min-${slug}-${seed}.json`)}`);
        }
    }
    console.log(`${label} seeds ${seeds.length} passed ${pass}/${seeds.length} failed ${fail}${invalid ? ` invalid ${invalid}` : ''}`);
    return fail;
}

async function replay(browser, target) {
    const files = fs.statSync(target).isDirectory() ? fs.readdirSync(target).filter(f => f.endsWith('.json')).map(f => path.join(target, f)).sort() : [target];
    let bad = 0;
    for (const file of files) {
        const cs = JSON.parse(fs.readFileSync(file, 'utf8'));
        let pass = 0, failedWith = [];
        for (let i = 0; i < REPEAT; i++) {
            const res = cs.actions
                ? await runOnce(browser, cs.route, !!cs.lesson, cs.seed || 0, j => cs.actions[j] || null, cs.actions.length)
                : await runSeed(browser, cs.route, !!cs.lesson, cs.seed, cs.steps || STEPS);
            if (res.status === 'PASS') pass++; else { failedWith.push(res.status === 'FAIL' ? `${res.fail.invariant} ${res.fail.why}`.slice(0, 160) : `INVALID ${res.err || ''}`); }
        }
        if (pass < REPEAT) bad++;
        console.log(`case ${path.basename(file)} (${cs.route}${cs.lesson ? ' lesson' : ''}) passed ${pass}/${REPEAT}${failedWith.length ? ' | ' + [...new Set(failedWith)].join(' ; ') : ''}`);
    }
    return bad;
}

(async () => {
    const browser = await chromium.launch();
    let failures = 0;
    try {
        if (replayArg) failures = await replay(browser, replayArg);
        else {
            const seedOpt = opt('--seed'), n = +opt('--seeds', 5);
            const seeds = seedOpt !== null ? [+seedOpt] : Array.from({length: n}, (_, i) => i + 1);
            const routes = opts('--route'), lessons = opts('--lesson');
            if (!routes.length && !lessons.length) { console.error('give at least one --route or --lesson'); process.exit(2); }
            for (const r of routes) failures += await fuzzRoute(browser, r, false, seeds, STEPS);
            for (const r of lessons) failures += await fuzzRoute(browser, r, true, seeds, STEPS);
        }
    } finally { await browser.close(); }
    process.exit(failures ? 1 : 0);
})();
