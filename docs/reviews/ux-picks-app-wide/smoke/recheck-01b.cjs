// Task 01b recheck: parameter inset (patches/tensor) and hodograph (ph/cubic) after resize and drag.
// usage: node recheck-01b.cjs   (production preview on 4471)
const {chromium} = require('playwright');
const fs = require('fs');
setTimeout(() => process.exit(2), 400000).unref();
const BASE = 'http://127.0.0.1:4471/bezeg-2.0/';
const LOG = __dirname + '/01b-recheck.log';
fs.writeFileSync(LOG, '');
const log = s => fs.appendFileSync(LOG, s + '\n');
async function waitReady(page) { await page.waitForLoadState('load', {timeout: 30000}).catch(() => {}); try { await page.waitForFunction(() => document.querySelectorAll('[data-navigation], canvas, svg').length > 0, null, {timeout: 40000}); } catch (e) { log('READY_TIMEOUT url=' + page.url() + ' title=' + (await page.title().catch(() => '?')) + ' bodyLen=' + (await page.evaluate(() => document.body.innerHTML.length).catch(() => -1))); throw e; } }
const errs = [];
const results = [];
const record = (step, ok, detail) => { results.push({step, ok, detail}); log('STEP ' + JSON.stringify({step, ok, detail})); };

// Board of the inset: the JSXGraph board whose container sits inside .patch-parameter-inset.
const insetInfo = page => page.evaluate(() => {
    const host = document.querySelector('.patch-parameter-inset');
    if (!host) return {found: false};
    const b = Object.values(JXG.boards).find(bd => host.contains(bd.containerObj));
    const hr = host.getBoundingClientRect();
    if (!b) return {found: true, board: false, host: {w: Math.round(hr.width), h: Math.round(hr.height)}};
    const bb = b.getBoundingBox().map(v => +v.toFixed(3));
    const cr = b.containerObj.getBoundingClientRect();
    const [l, t, r, bo] = bb;
    // Domain [0,1] x [0,1] must be inside the view: left<=0, right>=1, bottom<=0, top>=1 (JSXGraph order).
    const covers = l <= 0 && r >= 1 && bo <= 0 && t >= 1;
    return {found: true, board: true, bbox: bb, covers, container: {w: Math.round(cr.width), h: Math.round(cr.height)}, objects: b.objectsList.length, host: {w: Math.round(hr.width), h: Math.round(hr.height)}};
});

const hodoInfo = page => page.evaluate(() => {
    const host = document.getElementById('hodograph-input-box');
    if (!host) return {found: false};
    const b = Object.values(JXG.boards).find(bd => host.contains(bd.containerObj));
    const hr = host.getBoundingClientRect();
    if (!b) return {found: true, board: false, host: {w: Math.round(hr.width), h: Math.round(hr.height)}};
    const visible = b.objectsList.filter(o => o.visProp && o.visProp.visible !== false).length;
    const canvases = host.querySelectorAll('canvas, svg').length;
    return {found: true, board: true, bbox: b.getBoundingBox().map(v => +v.toFixed(3)), objects: b.objectsList.length, visibleObjects: visible, svgOrCanvas: canvases, host: {w: Math.round(hr.width), h: Math.round(hr.height)}};
});

async function resizeSteps(page, label, check) {
    for (const [w, h] of [[1100, 700], [1440, 900]]) {
        await page.setViewportSize({width: w, height: h});
        await page.waitForTimeout(1200);
        const info = await check();
        record(`${label} after resize ${w}x${h}`, info.ok, info.detail);
    }
}

(async () => {
    const br = await chromium.launch();
    const ctx = await br.newContext({viewport: {width: 1440, height: 900}});
    await ctx.addInitScript(() => { try { localStorage.setItem('bezeg-language', 'sl'); } catch (e) {} });
    try {
        // ---- Step 1: patches/tensor parameter inset
        let page = await ctx.newPage();
        page.on('console', m => { if (m.type() === 'error') { errs.push(m.text()); log('CONSOLE_ERROR ' + JSON.stringify(m.text().slice(0, 300))); } });
        page.on('pageerror', e => { errs.push(e.message); log('PAGEERROR ' + JSON.stringify(e.message.slice(0, 300))); });
        await page.goto(BASE + 'patches/tensor');
        await waitReady(page);
        await page.waitForTimeout(5000);
        const i0 = await insetInfo(page);
        log('INSET_INITIAL ' + JSON.stringify(i0));
        record('tensor inset renders at 1440x900', !!(i0.found && i0.board && i0.covers && i0.objects > 0), JSON.stringify(i0));
        const errs1 = errs.length;
        await resizeSteps(page, 'tensor inset', async () => {
            const i = await insetInfo(page);
            log('INSET ' + JSON.stringify(i));
            return {ok: !!(i.found && i.board && i.covers), detail: JSON.stringify(i)};
        });
        record('tensor inset page errors', errs.length === errs1, 'errors during step: ' + (errs.length - errs1));
        await page.close();

        // ---- Step 2: ph/cubic hodograph
        page = await ctx.newPage();
        page.on('console', m => { if (m.type() === 'error') { errs.push(m.text()); log('CONSOLE_ERROR ' + JSON.stringify(m.text().slice(0, 300))); } });
        page.on('pageerror', e => { errs.push(e.message); log('PAGEERROR ' + JSON.stringify(e.message.slice(0, 300))); });
        await page.goto(BASE + 'ph/cubic');
        await waitReady(page);
        await page.waitForTimeout(5000);
        // The hodograph mounts only with a selected curve: click the main curve at t=0.5 to select it.
        const sel = await page.evaluate(() => {
            const hodo = document.getElementById("hodograph-input-box");
            const b = Object.values(JXG.boards).find(bd => !(hodo && hodo.contains(bd.containerObj)));
            if (!b) return {ok: false, why: "no main board"};
            const c = b.objectsList.find(o => o.elType === "curve" && o.visProp.visible && typeof o.X === "function");
            if (!c) return {ok: false, why: "no curve"};
            const x = c.X(0.5), y = c.Y(0.5), cr = b.containerObj.getBoundingClientRect();
            return {ok: true, x: Math.round(cr.left + b.origin.scrCoords[1] + x * b.unitX), y: Math.round(cr.top + b.origin.scrCoords[2] - y * b.unitY)};
        });
        log("SELECT_TARGET " + JSON.stringify(sel));
        if (sel.ok) { await page.mouse.click(sel.x, sel.y); await page.waitForTimeout(1200); }
        const h0 = await hodoInfo(page);
        log('HODO_INITIAL ' + JSON.stringify(h0));
        record('ph/cubic hodograph renders at 1440x900', !!(h0.found && h0.board && h0.objects > 0), JSON.stringify(h0));

        // Drag one free point of the main curve board (the board not inside the hodograph host).
        const drag = await page.evaluate(() => {
            const hodo = document.getElementById('hodograph-input-box');
            const main = Object.values(JXG.boards).find(b => !(hodo && hodo.contains(b.containerObj)));
            if (!main) return {ok: false, why: 'no main board'};
            const pts = main.objectsList.filter(o => o.elType === "point" && !o.visProp.fixed && o.visProp.visible);
            if (!pts.length) return {ok: false, why: 'no draggable point'};
            const p = pts[pts.length - 1];
            const cr = main.containerObj.getBoundingClientRect();
            return {ok: true, id: p.id, x: Math.round(cr.left + p.coords.scrCoords[1]), y: Math.round(cr.top + p.coords.scrCoords[2])};
        });
        log('DRAG_TARGET ' + JSON.stringify(drag));
        const errs2 = errs.length;
        if (drag.ok) {
            await page.mouse.move(drag.x, drag.y);
            await page.mouse.down();
            await page.mouse.move(drag.x + 40, drag.y - 30, {steps: 10});
            await page.mouse.move(drag.x + 60, drag.y - 50, {steps: 5});
            await page.mouse.up();
            await page.waitForTimeout(600);
        }
        const h1 = await hodoInfo(page);
        log('HODO_AFTER_DRAG ' + JSON.stringify(h1));
        record('ph/cubic drag main control point', drag.ok && errs.length === errs2 && !!(h1.found && h1.board && h1.objects > 0), JSON.stringify({drag: drag.ok ? drag.id : drag.why, hodo: h1}));

        await resizeSteps(page, 'ph hodograph', async () => {
            const h = await hodoInfo(page);
            log('HODO ' + JSON.stringify(h));
            return {ok: !!(h.found && h.board && h.objects > 0 && h.host.w > 0), detail: JSON.stringify(h)};
        });
        record('ph hodograph page errors', errs.length === errs2, 'errors during step: ' + (errs.length - errs2));
        await page.close();
    } catch (e) {
        record('script exception', false, String(e.message).split('\n')[0]);
    } finally {
        log('SUMMARY ' + JSON.stringify(results));
        log('TOTAL_ERRORS ' + errs.length);
        console.log(results.map(r => (r.ok ? 'PASS ' : 'FAIL ') + r.step).join('\n'));
        console.log('TOTAL_ERRORS', errs.length, errs.slice(0, 5).map(s => s.slice(0, 200)).join(' | '));
        await br.close();
    }
})();
