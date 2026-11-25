'use strict';
// Task 11 interactive states. node states.cjs --base <url> --out <dir> [--only <name-substring>]
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('@playwright/test');

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const base = (opt('--base') || '').replace(/\/+$/, '');
const out = opt('--out');
const only = opt('--only');
if (!base || !out) { console.error('usage: node states.cjs --base <url> --out <dir> [--only <name-substring>]'); process.exit(2); }
fs.mkdirSync(out, {recursive: true});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TAYLOR = 'analysis/taylor';
const LESSON = 'analysis/taylor?example=lesson.analysis.taylor.taylor';
const card = (id) => `#board-card-${id}`;
const STRIP = '[data-puck-strip]';
const CENTER = '[data-puck-key="taylor-center"]';
const COUNT = '[data-puck-key="taylor-degree"]';

async function open(ctx, route, init) {
    const page = await ctx.newPage();
    if (init) await page.addInitScript(init.fn, init.arg);
    await page.goto(`${base}/${route}`, {waitUntil: 'load'});
    await page.locator('.workspace-board-stage').first().waitFor({state: 'visible', timeout: 20000});
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForFunction(() => !window.MathJax || !window.MathJax.startup || !window.MathJax.startup.promise || true).catch(() => {});
    await sleep(2500);
    return page;
}

// Crop: element box grown by {t,r,b,l,all}, clamped to viewport; opts.topOnly limits height.
async function shoot(page, file, sel, g = {}, topOnly) {
    const el = page.locator(sel).first();
    await el.waitFor({state: 'visible', timeout: 10000});
    const b = await el.boundingBox();
    const vp = page.viewportSize();
    const a = g.all || 0;
    const t = g.t ?? a, r = g.r ?? a, bo = g.b ?? a, l = g.l ?? a;
    let x = b.x - l, y = b.y - t, w = b.width + l + r, h = (topOnly ? Math.min(topOnly, b.height) : b.height) + t + bo;
    const x2 = Math.min(vp.width, x + w), y2 = Math.min(vp.height, y + h);
    x = Math.max(0, x); y = Math.max(0, y);
    await page.screenshot({path: file, clip: {x, y, width: x2 - x, height: y2 - y}});
}
async function whole(page, file) { await shoot(page, file, '.workspace-board-stage'); }
async function viewport(page, file) { await page.screenshot({path: file}); }
async function focusVisible(page, sel) {
    await page.locator(sel).first().evaluate((e) => e.focus({focusVisible: true}));
    await page.keyboard.press('Shift').catch(() => {}); // keyboard modality
    await sleep(300);
}
async function center(page, sel) {
    const b = await page.locator(sel).first().boundingBox();
    return {x: b.x + b.width / 2, y: b.y + b.height / 2};
}
async function drag(page, from, dx, dy, steps, during) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) { await page.mouse.move(from.x + dx * i / steps, from.y + dy * i / steps); await sleep(40); }
    await sleep(300);
    try { await during(); } finally { await page.mouse.up(); }
}

const R = card('readouts');
const states = [];
const S = (name, route, fn, o) => states.push({name, route, fn, ...o});
const P = (name, fn) => (page, f) => fn(page, f);

S('card-readouts', TAYLOR, (p, f) => shoot(p, f, R));
S('card-legend-open', TAYLOR, async (p, f) => { await p.locator(`${card('legend')} .board-card-fold`).click(); await sleep(600); await shoot(p, f, card('legend')); });
['edit', 'display', 'save'].forEach((n, i) => S(`card-tools-${n}`, TAYLOR, async (p, f) => {
    await p.locator(`${card('tools')} .tools-head-button`).nth(i).click(); await sleep(600); await shoot(p, f, card('tools'));
}));
S('card-head-hover', TAYLOR, async (p, f) => { await p.locator(`${R} .board-card-fold`).hover(); await sleep(500); await shoot(p, f, R, {}, 60); });
S('card-head-focus', TAYLOR, async (p, f) => { await focusVisible(p, `${R} .board-card-grip`); await shoot(p, f, R, {}, 60); });
S('card-drag', TAYLOR, async (p, f) => {
    const from = await center(p, `${R} .board-card-title`);
    await drag(p, from, -160, 120, 8, () => whole(p, f));
});
S('card-lesson', LESSON, (p, f) => shoot(p, f, card('lesson')));
const lessonNext = async (p) => {
    let n = 0;
    while (n < 14 && !(await p.locator(`${R} [data-highlight]`).count())) {
        const btn = p.getByRole('button', {name: /^Naprej/}).first();
        await btn.click(); await sleep(900); n++;
    }
    return n;
};
S('card-readouts-highlight', LESSON, async (p, f) => {
    const n = await lessonNext(p);
    if (!(await p.locator(`${R} [data-highlight]`).count())) {
        note('card-readouts-highlight: no lesson step highlighted a readouts row in 14 steps; captured the readouts card at step 14 instead');
    }
    await shoot(p, f, R);
    await shoot(p, f.replace('card-readouts-highlight', 'card-lesson-later'), card('lesson'));
    console.log(`ok card-lesson-later (after ${n} clicks) -> ${f.replace('card-readouts-highlight', 'card-lesson-later')}`);
}, {alsoOk: false});
S('card-readouts-cut', 'analysis/phase-portrait', (p, f) => shoot(p, f, R));
S('card-section-open', 'functions/transformations', async (p, f) => {
    const sec = p.locator('[id^="board-card-section"]').first();
    await sec.locator('.board-card-fold').click(); await sleep(600);
    await shoot(p, f, '[id^="board-card-section"]');
});
S('card-tools-empty', 'functions/exponential', (p, f) => shoot(p, f, card('tools')));
S('card-notes-more', 'compgeo/polygon-area', async (p, f) => {
    const m = p.locator(`${R} .ws-more`).first();
    if (await m.count()) { await m.click(); await sleep(600); } else note('card-notes-more: no .ws-more in the readouts card; captured without clicking');
    await shoot(p, f, R);
});
S('card-tools-inspector', 'bezier/decasteljau', (p, f) => shoot(p, f, card('tools')));
S('board-presentation', TAYLOR, async (p, f) => {
    await p.getByRole('button', {name: 'Predstavitveni način'}).click(); await sleep(1500);
    await viewport(p, f);
    await p.locator(`${card('tools')} .board-card-fold`).click(); await sleep(800);
    const f2 = f.replace('board-presentation', 'board-presentation-tools');
    await viewport(p, f2);
    console.log(`ok board-presentation-tools -> ${f2}`);
});

const sl = (k) => `${k} [role="slider"]`;
const stripTop = {t: 110, r: 8, b: 8, l: 8};
S('strip-default', TAYLOR, (p, f) => shoot(p, f, STRIP, {all: 8}));
S('puck-hover', TAYLOR, async (p, f) => { await p.locator(sl(CENTER)).hover(); await sleep(700); await shoot(p, f, STRIP, stripTop); });
S('puck-focus', TAYLOR, async (p, f) => { await focusVisible(p, sl(CENTER)); await sleep(500); await shoot(p, f, STRIP, stripTop); });
S('puck-help-open', TAYLOR, async (p, f) => { await p.locator(`${CENTER} .puck-help-button`).click(); await sleep(500); await shoot(p, f, STRIP, stripTop); });
S('puck-entry', TAYLOR, async (p, f) => {
    await p.locator(sl(CENTER)).dblclick(); await p.locator(`${CENTER} .puck-input`).waitFor({timeout: 5000}); await sleep(400);
    await shoot(p, f, STRIP, stripTop);
    await p.keyboard.press('Control+A'); await p.keyboard.type('99'); await p.keyboard.press('Enter'); await sleep(700);
    const f2 = f.replace('puck-entry', 'puck-entry-invalid');
    await shoot(p, f2, STRIP, {t: 110, r: 8, b: 60, l: 8});
    console.log(`ok puck-entry-invalid -> ${f2}`);
});
S('puck-drag-ruler', TAYLOR, async (p, f) => {
    const from = await center(p, `${CENTER} .puck-value`);
    await drag(p, from, 60, 0, 6, async () => {
        if (!(await p.locator('[data-puck-ruler]').count())) note('puck-drag-ruler: no [data-puck-ruler] visible while dragging');
        await shoot(p, f, STRIP, {t: 130, r: 8, b: 8, l: 8});
    });
});
S('puck-undo', TAYLOR, async (p, f) => {
    const b = await p.locator(`${CENTER} .puck-track`).boundingBox();
    await p.mouse.click(b.x + b.width * 0.85, b.y + b.height / 2); await sleep(300);
    await shoot(p, f, STRIP, {t: 110, r: 8, b: 8, l: 8});
});
S('puck-sweep', TAYLOR, async (p, f) => {
    await p.locator(CENTER).hover(); await sleep(200);
    const sw = p.locator(`${CENTER} .puck-sweep`);
    await sw.click(); await sleep(600);
    try { await shoot(p, f, STRIP, {t: 110, r: 8, b: 8, l: 8}); } finally { await sw.click().catch(() => {}); }
});
S('count-hover', TAYLOR, async (p, f) => { await p.locator(`${COUNT} .puck-step`).nth(1).hover(); await sleep(500); await shoot(p, f, STRIP, stripTop); });
S('strip-phase', 'analysis/phase-portrait', (p, f) => shoot(p, f, STRIP, {all: 8}));
S('strip-decasteljau', 'bezier/decasteljau', (p, f) => shoot(p, f, STRIP, {all: 8}));
S('strip-inverse', 'functions/inverse', (p, f) => shoot(p, f, STRIP, {all: 8}));
S('strip-transformations', 'functions/transformations', (p, f) => shoot(p, f, STRIP, {all: 8}));
S('strip-column', TAYLOR, (p, f) => whole(p, f), {init: {fn: (k) => { localStorage.setItem(k, JSON.stringify({version: 1, strip: 'left'})); }, arg: 'board-layout'}});
// Touch
S('touch-board', TAYLOR, async (p, f) => {
    const coarse = await p.evaluate(() => matchMedia('(pointer: coarse)').matches);
    if (!coarse) note('touch: (pointer: coarse) is false in this context');
    await whole(p, f);
    for (const [n, sel, g] of [['touch-readouts', R, {}], ['touch-strip', STRIP, {all: 8}]]) {
        const f2 = f.replace('touch-board', n);
        await shoot(p, f2, sel, g); console.log(`ok ${n} -> ${f2}`);
    }
}, {touch: true});

const notes = [];
function note(s) { notes.push(s); console.log(`note ${s}`); }

function pngSize(file) { const b = fs.readFileSync(file); return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; }

(async () => {
    const browser = await chromium.launch({headless: true, ...(process.env.PREVIEW_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.PREVIEW_BROWSER_EXECUTABLE_PATH} : {})});
    let failed = 0;
    for (const s of states) {
        if (only && !s.name.includes(only)) continue;
        const ctx = await browser.newContext(s.touch ? {viewport: {width: 1280, height: 800}, hasTouch: true, isMobile: false} : {viewport: {width: 1440, height: 900}});
        try {
            const page = await open(ctx, s.route, s.init);
            const file = path.join(out, `${s.name}.png`);
            await s.fn(page, file);
            console.log(`ok ${s.name} -> ${file} ${pngSize(file)}`);
        } catch (e) {
            failed++;
            console.log(`FAIL ${s.name}: ${String(e.message).split('\n')[0]}`);
        }
        await ctx.close();
    }
    await browser.close();
    process.exit(failed ? 1 : 0);
})();
