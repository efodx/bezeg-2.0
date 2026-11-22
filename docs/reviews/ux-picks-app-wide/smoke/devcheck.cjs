// Dev-mode UntaggedWriteError hunt: real mouse and keyboard on the Vite dev server.
// Writes every console/page error verbatim to devcheck.log (JSON lines) and prints a summary.
const {chromium} = require('playwright');
const fs = require('fs');
setTimeout(() => process.exit(2), 540000).unref();
const BASE = 'http://127.0.0.1:4482/bezeg-2.0/';
const LOG = __dirname + '/devcheck.log';
fs.writeFileSync(LOG, '');
const errs = [];
const exc = [];
const summary = [];
let route = '';
let label = '';
let page = null;
let ctx = null;

const logLine = s => fs.appendFileSync(LOG, s + '\n');
function rec(kind, text) {
    const e = {route, label, kind, text};
    errs.push(e);
    logLine('ERROR ' + JSON.stringify(e));
}
function attach(p) {
    p.on('console', m => { if (m.type() === 'error') rec('console', m.text()); });
    p.on('pageerror', e => rec('pageerror', e.message));
}
async function act(name, fn) {
    label = name;
    logLine(`ACTION [${route}] ${name}`);
    try { await fn(); }
    catch (e) {
        const msg = String(e.message).split('\n')[0];
        exc.push({route, label, msg});
        logLine(`EXCEPTION [${route}] ${name}: ${msg}`);
    }
    await page.waitForTimeout(300);
}
const readouts = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-readout]')].map(e => [e.getAttribute('data-readout'), (e.querySelector('dd') || e).textContent.trim()])));
const ranges = () => page.locator('input[type=range]');
const spins = () => page.locator('input[role=spinbutton]');

async function dragRange(loc, frac) {
    const b = await loc.boundingBox();
    await page.mouse.move(b.x + b.width * 0.5, b.y + b.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width * frac, b.y + b.height / 2, {steps: 8}); await page.mouse.up();
}
async function keyRange(loc, key, n) {
    await loc.focus();
    for (let i = 0; i < n; i++) await page.keyboard.press(key);
}
async function boardRect() {
    return page.evaluate(() => {
        const b = Object.values(JXG.boards)[0];
        const r = b.containerObj.getBoundingClientRect();
        return {x: r.left, y: r.top, w: r.width, h: r.height};
    });
}
async function boardPoints(max = 4) {
    const pts = await page.evaluate(() => {
        const res = [];
        Object.values(JXG.boards || {}).forEach((b, bi) => {
            const r = b.containerObj.getBoundingClientRect();
            Object.values(b.objects).forEach((o, oi) => {
                if (o.elType !== 'point' || !o.coords || (o.visProp && (o.visProp.fixed || o.visProp.visible === false))) return;
                const x = r.left + o.coords.scrCoords[1], y = r.top + o.coords.scrCoords[2];
                if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return;
                res.push({bi, oi, id: String(o.name || o.id), x, y});
            });
        });
        return res;
    });
    return pts.slice(0, max);
}
async function usrOf(bi, oi) {
    return page.evaluate(([bi, oi]) => {
        const o = Object.values(Object.values(JXG.boards)[bi].objects)[oi];
        return o.coords.usrCoords.slice(1).map(v => +v.toFixed(3));
    }, [bi, oi]);
}
async function dragBoardPoints(tag, max = 4, dx = 40, dy = -30) {
    const pts = await boardPoints(max);
    logLine(`[${route}] ${tag}: ${pts.length} free board point(s)`);
    for (const p of pts) {
        const before = await usrOf(p.bi, p.oi);
        await page.mouse.move(p.x, p.y); await page.mouse.down();
        await page.mouse.move(p.x + dx, p.y + dy, {steps: 6}); await page.mouse.up();
        await page.waitForTimeout(250);
        const after = await usrOf(p.bi, p.oi);
        logLine(`  point ${p.id} ${JSON.stringify(before)} -> ${JSON.stringify(after)} moved=${JSON.stringify(before) !== JSON.stringify(after)}`);
    }
    return pts.length;
}
async function pressBoard(fx, fy) {
    const r = await boardRect();
    await page.mouse.move(r.x + r.w * fx, r.y + r.h * fy); await page.mouse.down(); await page.mouse.up();
}
async function runRoute(name, body) {
    route = name; label = 'load';
    const e0 = errs.length, x0 = exc.length;
    page = await ctx.newPage(); attach(page);
    await page.goto(BASE + name.split(' [')[0]); await page.waitForTimeout(3500);
    await body();
    summary.push({route: name, errors: errs.length - e0, exc: exc.length - x0});
    await page.close();
}

(async () => {
    const browser = await chromium.launch();
    try {
        ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
        await ctx.addInitScript(() => { try { localStorage.setItem('bezeg-language', 'sl'); } catch (e) {} });

        await runRoute('analysis/taylor [controls]', async () => {
            await act('drag center slider 0.8', () => dragRange(ranges().nth(0), 0.8));
            await act('drag center slider 0.3', () => dragRange(ranges().nth(0), 0.3));
            await act('arrow keys x5 on center slider', () => keyRange(ranges().nth(0), 'ArrowRight', 5));
            await act('degree + button x2', async () => { const b = page.getByRole('button', {name: 'Povečaj število'}); await b.click(); await b.click(); });
            await act('degree - button x1', () => page.getByRole('button', {name: 'Zmanjšaj število'}).click());
            await act('type x = 1.5', async () => { const s = spins().nth(2); await s.fill('1.5'); await s.press('Enter'); });
            await act('change example (select index 1)', () => page.locator('select').nth(1).selectOption({index: 1}));
            await act('change example (select index 2)', () => page.locator('select').nth(1).selectOption({index: 2}));
            await act('board point drags', async () => { await dragBoardPoints('taylor board'); });
            logLine('readouts ' + JSON.stringify(await readouts()));
        });

        await runRoute('analysis/taylor [lesson]', async () => {
            await act('open Taylor lesson', () => page.getByRole('button', {name: /Spoznaj to demonstracijo/}).click());
            const nav = s => page.locator('section.guided-lesson .guided-lesson-nav-' + s);
            for (let i = 1; i <= 3; i++) await act('lesson Next ' + i, () => nav('next').click());
            for (let i = 1; i <= 2; i++) await act('lesson Back ' + i, () => nav('back').click());
        });

        await runRoute('analysis/taylor [preset]', async () => {
            const rng = ranges().nth(0);
            await act('preset: move center to save', () => keyRange(rng, 'ArrowRight', 4));
            const name = 'devcheck-' + Date.now();
            await act('preset: open Shrani', () => page.getByRole('button', {name: 'Shrani'}).click());
            await act('preset: Shrani trenutno stanje', () => page.getByRole('button', {name: /Shrani trenutno stanje/}).click());
            await act('preset: name and save', async () => {
                const inp = page.locator('input[type=text]:not([role=spinbutton])').last();
                await inp.fill(name); await inp.press('Enter');
            });
            await act('preset: change center', () => keyRange(rng, 'ArrowRight', 8));
            await act('preset: reselect saved preset', async () => {
                const item = page.getByText(name).first();
                if (!(await item.count())) throw new Error('saved preset "' + name + '" not found in UI');
                await item.click();
            });
            logLine('readouts after reselect ' + JSON.stringify(await readouts()));
        });

        await runRoute('functions/transformations', async () => {
            await act('type field 1..4', async () => {
                for (let i = 0; i < 4; i++) { const s = spins().nth(i); await s.fill(String(i + 2)); await s.press('Enter'); }
            });
            await act('drag image marker / board points', async () => { await dragBoardPoints('transformations board'); });
        });

        await runRoute('bezier/decasteljau', async () => {
            const play = () => page.locator('button', {hasText: /Predvajaj|Nadaljuj/}).first();
            await act('Play', () => play().click());
            await act('drag t slider during play', () => dragRange(ranges().first(), 0.3));
            await act('press board during play', () => pressBoard(0.5, 0.9));
            await act('drag control points during play', async () => { await dragBoardPoints('decasteljau board'); });
            await act('Pause (Premor/Pavza) if playing', async () => {
                const b = page.locator('button', {hasText: /Premor|Pavza/}).first();
                if (await b.count()) await b.click();
            });
            await act('drag control points after pause', async () => { await dragBoardPoints('decasteljau board (paused)', 3); });
        });

        await runRoute('analysis/phase-portrait', async () => {
            const play = () => page.locator('button', {hasText: /Predvajaj|Nadaljuj/}).first();
            await act('Play', () => play().click());
            await act('drag time slider during play', () => dragRange(ranges().nth(1), 0.35));
            await act('drag seed/matrix board points during play', async () => { await dragBoardPoints('phase board', 4); });
            await act('Pause if playing', async () => {
                const b = page.locator('button', {hasText: /Premor|Pavza/}).first();
                if (await b.count()) await b.click();
            });
            await act('drag seed/matrix board points paused', async () => { await dragBoardPoints('phase board (paused)', 4, -35, 25); });
        });

        await runRoute('linear-map', async () => {
            await act('select example quarter-turn', () => page.locator('select').nth(1).selectOption('quarter-turn'));
            await act('select mode iterate', () => page.locator('select').nth(2).selectOption('iterate'));
            await act('Play (iterate)', () => page.getByRole('button', {name: /^Predvajaj/}).first().click());
            await act('drag start point on board during play', async () => { await dragBoardPoints('linear-map board', 2); });
            const modes = await page.locator('select').nth(2).evaluate(s => [...s.options].map(o => o.value));
            for (const m of modes.filter(v => v !== 'iterate')) {
                await act('switch mode to ' + m, () => page.locator('select').nth(2).selectOption(m));
            }
            await act('drag start point after switching modes', async () => { await dragBoardPoints('linear-map board (after modes)', 2); });
        });
    } finally {
        logLine('SUMMARY ' + JSON.stringify(summary));
        console.log('ROUTE RESULTS:');
        for (const s of summary) console.log(`  ${s.route}: ${s.errors === 0 && s.exc === 0 ? 'PASS' : 'FAIL'} (errors=${s.errors}, exceptions=${s.exc})`);
        console.log('ERRORS (' + errs.length + '):');
        for (const e of errs) console.log(`  [${e.route} | ${e.label}] ${e.kind}: ${e.text}`);
        console.log('EXCEPTIONS (' + exc.length + '):');
        for (const e of exc) console.log(`  [${e.route} | ${e.label}] ${e.msg}`);
        console.log('LOG ' + LOG);
        console.log('DONE');
        await browser.close();
    }
})();
