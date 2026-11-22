// Task 01b view-adapter smoke. usage: node devcheck-01b.cjs dev|prev
const {chromium} = require('playwright');
const fs = require('fs');
setTimeout(() => process.exit(2), 580000).unref();
const MODE = process.argv[2] || 'dev';
const BASE = MODE === 'dev' ? 'http://127.0.0.1:4482/bezeg-2.0/' : 'http://127.0.0.1:4471/bezeg-2.0/';
const LOG = __dirname + '/01b-' + MODE + '.log';
fs.writeFileSync(LOG, '');
const errs = []; const res = [];
let route = '', label = '', page, ctx;
const log = s => fs.appendFileSync(LOG, s + '\n');
const PILOTS = ['analysis/taylor', 'functions/transformations', 'bezier/decasteljau', 'linear-map', 'analysis/phase-portrait'];
const OTHERS = ['analysis/fourier-series', 'functions/waves', 'analysis/contours', 'analysis/logistic-map', 'ph/cubic', 'patches/tensor'];
const bbox = () => page.evaluate(() => { const b = Object.values(JXG.boards)[0]; return b ? b.getBoundingBox().map(v => +v.toFixed(3)) : null; });
const rect = () => page.evaluate(() => { const r = Object.values(JXG.boards)[0].containerObj.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height}; });
async function act(name, fn, expectChange) {
    label = name; const e0 = errs.length; let b0 = null, note = '';
    try { b0 = await bbox(); } catch (e) {}
    try { await fn(); } catch (e) { note = 'EXC ' + String(e.message).split('\n')[0]; }
    await page.waitForTimeout(400);
    let b1 = null; try { b1 = await bbox(); } catch (e) {}
    const changed = JSON.stringify(b0) !== JSON.stringify(b1);
    const r = {route, name, errors: errs.length - e0, note, viewChanged: changed, ok: !note && errs.length === e0 && (!expectChange || changed)};
    res.push(r); log('ACTION ' + JSON.stringify(r) + ' bbox ' + JSON.stringify(b0) + '->' + JSON.stringify(b1));
}
async function view() {
    const nav = d => page.locator(`[data-navigation=${d}]`).first();
    const r = await rect(); const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const has = async d => (await nav(d).count()) > 0;
    await act('wheel zoom (plain)', async () => { await page.mouse.move(cx + 30, cy + 20); await page.mouse.wheel(0, -300); }, false);
    await act('wheel zoom (shift)', async () => { await page.mouse.move(cx + 30, cy + 20); await page.keyboard.down('Shift'); await page.mouse.wheel(0, -300); await page.keyboard.up('Shift'); }, false);
    await act('drag-pan empty board (plain)', async () => { await page.mouse.move(r.x + 25, r.y + r.h - 25); await page.mouse.down(); await page.mouse.move(r.x + 90, r.y + r.h - 60, {steps: 8}); await page.mouse.up(); }, false);
    await act('drag-pan empty board (shift)', async () => { await page.keyboard.down('Shift'); await page.mouse.move(r.x + 25, r.y + r.h - 25); await page.mouse.down(); await page.mouse.move(r.x + 90, r.y + r.h - 60, {steps: 8}); await page.mouse.up(); await page.keyboard.up('Shift'); }, false);
    for (const d of ['in', 'out', 'left', 'right', 'up', 'down', 'fit']) {
        if (await has(d)) await act('nav button ' + d, () => nav(d).click({timeout: 8000}), d !== 'fit');
        else log(`[${route}] no nav button ${d}`);
    }
}
async function reset() {
    await act('Reset (Ponastavi prednastavitev, Shrani tab)', async () => {
        await page.getByRole('button', {name: 'Shrani', exact: true}).click({timeout: 8000}).catch(() => {}); const b = page.getByRole('button', {name: /Ponastavi prednastavitev/}).first();
        await b.click({timeout: 8000});
    }, false);
}
async function resize() {
    await act('window resize 1100x700', () => page.setViewportSize({width: 1100, height: 700}), false);
    await act('window resize 1440x900', () => page.setViewportSize({width: 1440, height: 900}), false);
    await act('post-resize zoom in', () => page.locator('[data-navigation=in]').first().click({timeout: 8000}), true);
}
async function preset() {
    const name = 'smoke01b-' + Date.now();
    await act('preset: nudge', async () => { const r = page.locator('input[type=range]').first(); await r.focus(); for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight'); });
    await act('preset: open Shrani', () => page.getByRole('button', {name: 'Shrani', exact: true}).click({timeout: 8000}));
    await act('preset: save current', () => page.getByRole('button', {name: /Shrani trenutno stanje/}).click({timeout: 8000}));
    await act('preset: name+save', async () => { const i = page.locator('input[type=text]:not([role=spinbutton])').last(); await i.fill(name); await i.press('Enter'); });
    await act('preset: nudge again', async () => { const r = page.locator('input[type=range]').first(); await r.focus(); for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight'); });
    await act('preset: select saved', async () => { const it = page.getByText(name).first(); if (!(await it.count())) throw new Error('preset not found'); await it.click(); });
}
async function run(name, body) {
    route = name; label = 'load'; const e0 = errs.length;
    page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') { errs.push({route, label, t: m.text()}); log('ERROR ' + JSON.stringify({route, label, text: m.text()})); } });
    page.on('pageerror', e => { errs.push({route, label, t: e.message}); log('PAGEERROR ' + JSON.stringify({route, label, text: e.message})); });
    try { await page.goto(BASE + name.split(' [')[0]); await page.waitForSelector('[data-navigation], canvas', {timeout: 15000}); await page.waitForTimeout(5000); await body(); }
    catch (e) { log('ROUTE EXC ' + name + ' ' + String(e.message).split('\n')[0]); res.push({route, name: 'route-level', ok: false, note: String(e.message).split('\n')[0]}); }
    log(`LOADERRORS ${name}: ${errs.length - e0} total`);
    await page.close();
}
(async () => {
    const br = await chromium.launch();
    try {
        ctx = await br.newContext({viewport: {width: 1440, height: 900}});
        await ctx.addInitScript(() => { try { localStorage.setItem('bezeg-language', 'sl'); } catch (e) {} });
        if (MODE === 'dev') {
            for (const p of PILOTS) { await run(p + ' [view]', async () => { await view(); await resize(); }); await run(p + ' [reset-preset-lesson]', async () => {
                await reset();
                const sel = page.locator('select');
                const n = await sel.count();
                for (let i = 0; i < Math.min(n, 3); i++) {
                    const opts = await sel.nth(i).evaluate(s => [...s.options].map(o => o.value));
                    if (opts.length > 1 && !opts.includes('en')) { await act(`example/select ${i} -> ${opts[1]}`, () => sel.nth(i).selectOption(opts[1]), false); break; }
                }
                await preset();
                if (p === 'analysis/taylor') {
                    await act('open lesson', () => page.getByRole('button', {name: /Spoznaj to demonstracijo/}).click());
                    const nav = s => page.locator('section.guided-lesson .guided-lesson-nav-' + s);
                    for (let i = 1; i <= 3; i++) await act('lesson Next ' + i, () => nav('next').click());
                    for (let i = 1; i <= 2; i++) await act('lesson Back ' + i, () => nav('back').click());
                }
            }); }
        } else {
            for (const p of OTHERS) await run(p, async () => {
                if (p === 'analysis/fourier-series') await act('zoom to peak', () => page.getByRole('button', {name: /Približaj na vrh/}).click({timeout: 8000}), false);
                await view(); await reset(); await resize();
            });
        }
    } finally {
        log('SUMMARY ' + JSON.stringify(res));
        const by = {}; for (const r of res) { (by[r.route] ||= []).push(r); }
        for (const [k, v] of Object.entries(by)) console.log(k, v.filter(r => r.ok).length + '/' + v.length, 'FAILS:', v.filter(r => !r.ok).map(r => r.name + (r.note ? ' [' + r.note + ']' : '') + (r.errors ? ' errs=' + r.errors : '')).join('; '));
        console.log('ERRORS', errs.length); for (const e of errs.slice(0, 15)) console.log(' ', e.route, '|', e.label, '|', e.t.slice(0, 300));
        await br.close();
    }
})();
