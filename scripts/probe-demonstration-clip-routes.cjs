#!/usr/bin/env node
/**
 * Route probe for the lesson-guided catalog clips stream (step 1).
 * For each Demonstration without a catalog clip, opens its guided example scene, unlocks the inspector with the lesson's
 * "Skrij"/"Opazuj na grafu" button, and records the real controls, draggable points, and whether changing the first
 * slider/number control and dragging the first draggable point visibly changes the board (screenshot hash before/after).
 *
 * Usage: node scripts/probe-demonstration-clip-routes.cjs [--id <demonstration id>]... [--out file] [--no-change]
 *   PREVIEW_BASE_URL (default http://127.0.0.1:4319/bezeg-2.0)
 *   --no-change skips the change/drag gesture, so every liveCheck must read false (used to show the check can fail).
 * A full run writes docs/reviews/feature-streams/clips/route-probe.json; a --id run writes to the OS temp dir unless --out is given.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {chromium} = require('playwright');
const {applyExploreStep} = require('./guided-example-control-steps.cjs');

const root = path.resolve(__dirname, '..');
const base = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4319/bezeg-2.0').replace(/\/$/, '');
const origin = new URL(base).origin;

function parseArgs(argv) {
    const ids = [];
    let out, noChange = false;
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--id') ids.push(argv[++i]);
        else if (argv[i] === '--out') out = argv[++i];
        else if (argv[i] === '--no-change') noChange = true;
        else throw new Error(`unknown argument ${argv[i]}`);
    }
    return {ids, out, noChange};
}

function deriveIds(read = file => fs.readFileSync(path.join(root, file), 'utf8')) {
    // Rows live in src/demonstrations.ts and in each registered family's registration.ts; a new family adds its module here.
    const rowSource = ['src/demonstrations.ts', 'src/graphs/projective/registration.ts', 'src/graphs/trig/registration.ts', 'src/graphs/lines/registration.ts', 'src/graphs/isometry/registration.ts', 'src/graphs/compgeo/circleConstruction/registration.ts', 'src/graphs/combinatorics/registration.ts', 'src/graphs/random/registration.ts', 'src/graphs/curves/kinematics/registration.ts', 'src/graphs/recursion/registration.ts', 'src/graphs/functions/waves/registration.ts', 'src/graphs/mechanics/registration.ts', 'src/graphs/dynamics/registration.ts', 'src/graphs/solids/registration.ts', 'src/graphs/levelsets/registration.ts', 'src/graphs/complex/batchD/registration.ts', 'src/graphs/curves/bspline/registration.ts', 'src/graphs/basics/registration.ts', 'src/graphs/curves/ph/registration.ts', 'src/graphs/curves/parametrisations/registration.ts', 'src/graphs/curves/bezier/registration.ts', 'src/graphs/curves/rational/registration.ts', 'src/graphs/curves/spline/registration.ts', 'src/graphs/curves/geometry/registration.ts', 'src/graphs/curves/interpolation/registration.ts', 'src/graphs/patches/registration.ts', 'src/graphs/functions/registration.ts', 'src/graphs/analysis/registration.ts', 'src/graphs/probability/registration.ts', 'src/graphs/maps/registration.ts', 'src/graphs/compgeo/planeGeometry/registration.ts'].map(read).join('\n');
    const demonstrations = [...rowSource.matchAll(/^\s*\{id: '([^']+)', path: '([^']+)'/gm)].map(m => ({id: m[1], route: m[2]}));
    const clips = new Set([...read('src/demonstrationMotionAssets.ts').matchAll(/^\s*'([^']+)': \{src: /gm)].map(m => m[1]));
    // The rows and clips are read by regex: fail loudly when a source shape change makes them vanish or stop matching.
    if (demonstrations.length === 0 || clips.size === 0) throw new Error(`row parser matched ${demonstrations.length} rows and ${clips.size} clips; the source shape changed`);
    const known = new Set(demonstrations.map(d => d.id));
    const stray = [...clips].filter(id => !known.has(id));
    if (stray.length) throw new Error(`clip ids without a parsed Demonstration row (row parser drift?): ${stray.join(', ')}`);
    return {all: demonstrations, clipCount: clips.size, targets: demonstrations.filter(d => !clips.has(d.id))};
}

function exampleCandidates() {
    const dir = path.join(root, 'docs/reviews');
    const files = fs.readdirSync(dir, {withFileTypes: true}).filter(d => d.isDirectory())
        .map(d => path.join(dir, d.name, d.name === 'illustrated-chapter-examples' ? 'capture-inventory.json' : 'guided-example-inventory.json'))
        .filter(f => fs.existsSync(f)).sort((a, b) => (b.includes('illustrated') ? 1 : 0) - (a.includes('illustrated') ? 1 : 0));
    const byDemonstration = {}, seen = new Set();
    for (const file of files) for (const e of JSON.parse(fs.readFileSync(file, 'utf8')).examples) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        (byDemonstration[e.demonstrationId] ??= []).push({exampleId: e.id, url: new URL(e.path, origin).toString(), inventory: path.relative(root, file).replace(/\\/g, '/')});
    }
    for (const list of Object.values(byDemonstration)) list.forEach((c, i) => { c.chapterFirst = i === 0; });
    return byDemonstration;
}

/** Runs in the page: tags and lists the visible controls of the open inspector tab. */
function enumerateControls() {
    const scope = document.querySelector('#inspector-content section:not([hidden])') || document.querySelector('#inspector-content');
    if (!scope) return [];
    document.querySelectorAll('[data-probe-idx]').forEach(el => el.removeAttribute('data-probe-idx'));
    scope.querySelectorAll('details').forEach(d => { d.open = true; });
    const nameOf = el => {
        const by = el.getAttribute('aria-labelledby');
        if (by) return by.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
        if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
        if (el.labels && el.labels.length) return [...el.labels].map(l => l.textContent).join(' ').trim();
        const wrap = el.closest('label');
        if (wrap) return wrap.textContent.trim();
        if (el.tagName === 'BUTTON') return (el.textContent || el.title || '').trim();
        return (el.title || '').trim();
    };
    const out = [];
    scope.querySelectorAll('input, select, button, textarea').forEach(el => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || el.closest('[hidden]') || getComputedStyle(el).visibility === 'hidden') return;
        const type = (el.getAttribute('type') || '').toLowerCase();
        const kind = el.tagName === 'SELECT' ? 'select' : el.tagName === 'BUTTON' ? 'button' : el.tagName === 'TEXTAREA' ? 'text'
            : type === 'range' ? 'slider' : type === 'number' ? 'number' : type === 'checkbox' ? 'checkbox' : type === 'radio' ? 'radio' : type === 'color' ? 'color' : type === 'file' ? 'file' : 'text';
        const idx = out.length;
        el.setAttribute('data-probe-idx', String(idx));
        out.push({idx, kind, name: nameOf(el), min: el.getAttribute('min'), max: el.getAttribute('max'), step: el.getAttribute('step'),
            value: kind === 'checkbox' || kind === 'radio' ? el.checked : el.value, disabled: el.disabled,
            options: kind === 'select' ? [...el.options].map(o => o.textContent.trim()) : undefined});
    });
    return out;
}

/** Runs in the page: draggable JSXGraph points with name and user coordinates, and the board bounding box. */
function readBoard() {
    const container = document.querySelector('#jgbox');
    const surface = Boolean(container?.hasAttribute('data-surface-framing'));
    const board = Object.values(window.JXG?.boards || {}).find(b => b.container === container?.id || b.containerObj === container);
    if (!board) return {surface, board: null, points: []};
    const rect = container.getBoundingClientRect();
    const points = [];
    for (const el of Object.values(board.objects || {})) {
        if (el.elementClass !== 1 || !el.rendNode?.isConnected) continue;
        const visible = el.visProp?.visible !== false && el.visProp?.visible !== 'false' && getComputedStyle(el.rendNode).display !== 'none';
        if (!visible) continue;
        let draggable;
        try { draggable = typeof el.draggable === 'function' ? Boolean(el.draggable()) : !el.visProp.fixed; } catch { draggable = false; }
        if (!draggable) continue;
        points.push({name: el.name || el.label?.plaintext || el.id, type: el.type, x: el.X?.(), y: el.Y?.(), pageX: rect.left + el.coords.scrCoords[1], pageY: rect.top + el.coords.scrCoords[2]});
    }
    return {surface, board: {boundingBox: board.getBoundingBox(), pixel: [Math.round(rect.width), Math.round(rect.height)]}, points};
}

async function boardHash(page) {
    const shot = await page.locator('#jgbox').screenshot({animations: 'disabled'});
    return crypto.createHash('sha256').update(shot).digest('hex');
}

async function settle(page) {
    await page.waitForTimeout(500);
    let last = await boardHash(page);
    for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(200);
        const next = await boardHash(page);
        if (next === last) return true;
        last = next;
    }
    return false;
}

async function openExample(browser, url, errors) {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, locale: 'sl-SI', colorScheme: 'light'});
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 60000});
    await page.locator('#jgbox').waitFor({state: 'visible'});
    await page.locator('.guided-lesson-hide, .guided-lesson-observe').first().waitFor({state: 'visible'});
    await settle(page);
    await applyExploreStep(page);
    return {context, page};
}

async function selectTab(page, tab) {
    const button = page.locator(`.inspector-tabs button[aria-controls="inspector-${tab}"]`);
    if (await button.count() !== 1) return false;
    await button.click();
    await page.waitForTimeout(200);
    return true;
}

function newValue(control) {
    const min = control.min === null ? null : Number(control.min), max = control.max === null ? null : Number(control.max);
    const step = Number(control.step) > 0 ? Number(control.step) : 1;
    const current = Number(control.value);
    let target;
    if (min !== null && max !== null && Number.isFinite(min) && Number.isFinite(max)) target = current - min > max - current ? min + (current - min) * 0.25 : current + (max - current) * 0.75;
    else target = current + 10 * step;
    if (min !== null && Number.isFinite(min)) target = Math.max(min, target);
    if (max !== null && Number.isFinite(max)) target = Math.min(max, target);
    if (min !== null && Number.isFinite(min)) target = min + Math.round((target - min) / step) * step;
    const decimals = (String(control.step || '').split('.')[1] || '').length;
    target = Number((target === current ? current + step : target).toFixed(decimals));
    return target;
}

async function probeOne(browser, target, candidates, options, entry) {
    Object.assign(entry, {id: target.id, route: target.route, exampleCandidates: candidates, probeStatus: 'ok', surface: null, controls: [], draggablePoints: [], board: null, liveCheck: {control: 'not-applicable', point: 'not-applicable'}, error: []});
    if (!candidates.length) { entry.probeStatus = 'failed'; entry.failure = 'no guided example in any inventory'; return entry; }
    const chosen = candidates.find(c => c.chapterFirst) || candidates[0];
    entry.probedExampleId = chosen.exampleId;
    const errors = entry.error;
    // Phase 1: controls in every tab, then the first slider/number control.
    let first, firstTab;
    {
        const {context, page} = await openExample(browser, chosen.url, errors);
        try {
            const initial = await page.evaluate(readBoard);
            entry.surface = initial.surface; entry.board = initial.board;
            entry.draggablePoints = initial.points.map(({name, type, x, y}) => ({name, type, x, y}));
            for (const tab of ['edit', 'display', 'save']) {
                if (!await selectTab(page, tab)) continue;
                for (const c of await page.evaluate(enumerateControls)) {
                    entry.controls.push({tab, ...c});
                    if (!first && (c.kind === 'slider' || c.kind === 'number') && !c.disabled) { first = c; firstTab = tab; }
                }
            }
            if (first) {
                await selectTab(page, firstTab);
                await page.evaluate(enumerateControls);
                const locator = page.locator(`#inspector-content section:not([hidden]) [data-probe-idx="${first.idx}"]`);
                const stable = await settle(page);
                const before = await boardHash(page);
                const to = newValue(first);
                const record = {name: first.name, tab: firstTab, kind: first.kind, from: first.value, to: String(to), baselineStable: stable};
                if (!options.noChange) {
                    // Playwright fill sets the range/number value and fires the input event, so the app's own change handler runs.
                    await locator.fill(String(to));
                    if (first.kind === 'number') { await locator.press('Enter'); await locator.blur(); }
                }
                await page.waitForTimeout(500);
                await settle(page);
                const after = await boardHash(page);
                record.valueAfter = await locator.inputValue();
                record.changed = before !== after;
                entry.liveCheck.control = record.changed;
                entry.liveCheck.controlDetail = record;
            }
        } finally { await context.close(); }
    }
    // Phase 2: fresh page, drag the first reachable draggable point on the board.
    if (entry.draggablePoints.length) {
        const {context, page} = await openExample(browser, chosen.url, errors);
        try {
            const points = (await page.evaluate(readBoard)).points;
            const box = await page.locator('#jgbox').boundingBox();
            const tried = [];
            entry.liveCheck.point = false;
            for (const p of points.slice(0, 5)) {
                if (!(p.pageX > box.x + 4 && p.pageX < box.x + box.width - 4 && p.pageY > box.y + 4 && p.pageY < box.y + box.height - 4)) { tried.push({name: p.name, skipped: 'outside board'}); continue; }
                const hit = await page.evaluate(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest('#jgbox')), [p.pageX, p.pageY]);
                if (!hit) { tried.push({name: p.name, skipped: 'covered by another element'}); continue; }
                const stable = await settle(page);
                const before = await boardHash(page);
                if (!options.noChange) {
                    await page.mouse.move(p.pageX, p.pageY);
                    await page.mouse.down();
                    const dx = p.pageX + 60 < box.x + box.width ? 60 : -60, dy = p.pageY + 40 < box.y + box.height ? 40 : -40;
                    await page.mouse.move(p.pageX + dx / 2, p.pageY + dy / 2, {steps: 8});
                    await page.mouse.move(p.pageX + dx, p.pageY + dy, {steps: 8});
                    await page.mouse.up();
                }
                await page.waitForTimeout(400);
                await settle(page);
                const after = await boardHash(page);
                const moved = (await page.evaluate(readBoard)).points.find(q => q.name === p.name);
                entry.liveCheck.point = before !== after;
                entry.liveCheck.pointDetail = {name: p.name, fromXY: [p.x, p.y], toXY: moved ? [moved.x, moved.y] : null, baselineStable: stable, skippedBefore: tried};
                break;
            }
            if (!entry.liveCheck.pointDetail) entry.liveCheck.pointDetail = {skippedBefore: tried, note: 'no reachable draggable point'};
        } finally { await context.close(); }
    }
    return entry;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const {all, clipCount, targets} = deriveIds();
    const candidates = exampleCandidates();
    let selected = targets;
    if (options.ids.length) {
        const unknown = options.ids.filter(id => !targets.some(t => t.id === id));
        if (unknown.length) throw new Error(`not a clipless Demonstration: ${unknown.join(', ')}`);
        selected = targets.filter(t => options.ids.includes(t.id));
    }
    console.log(`Demonstrations ${all.length}, clips ${clipCount}, clipless ${targets.length}, probing ${selected.length}`);
    const browser = await chromium.launch({headless: true, ...(process.env.PREVIEW_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.PREVIEW_BROWSER_EXECUTABLE_PATH} : {})});
    const entries = [];
    try {
        for (const target of selected) {
            const entry = {};
            try { await probeOne(browser, target, candidates[target.id] || [], options, entry); }
            catch (e) { Object.assign(entry, {probeStatus: 'failed', failure: String(e.message || e).split('\n')[0]}); }
            entries.push(entry);
            console.log(`${entry.id}: ${entry.probeStatus}${entry.failure ? ` (${entry.failure})` : ''} controls=${entry.controls.length} points=${entry.draggablePoints.length} live=${JSON.stringify(entry.liveCheck.control)}/${JSON.stringify(entry.liveCheck.point)}`);
        }
    } finally { await browser.close(); }
    const out = options.out ? path.resolve(options.out) : options.ids.length ? path.join(os.tmpdir(), 'route-probe-subset.json') : path.join(root, 'docs/reviews/feature-streams/clips/route-probe.json');
    fs.mkdirSync(path.dirname(out), {recursive: true});
    fs.writeFileSync(out, `${JSON.stringify(entries, null, 2)}\n`);
    console.log(`wrote ${entries.length} entries to ${out}`);
    if (entries.length !== selected.length || (!options.ids.length && entries.length !== all.length - clipCount)) { console.error(`entry count ${entries.length} != derived ${selected.length}`); process.exit(1); }
}

module.exports = {deriveIds};

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
