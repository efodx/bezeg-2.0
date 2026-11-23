// Chrome trace of one Taylor puck drag: summed durations of rendering phases per move. node trace-05.cjs --url ... [--throttle 4] [--noruler]
const {chromium} = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => { if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]); return acc; }, []));
const base = (args.url || 'http://127.0.0.1:4472').replace(/\/$/, '');
const throttle = Number(args.throttle || 4);
(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    await context.addInitScript(() => { try { localStorage.setItem('bezeg-language', 'sl'); } catch (e) { /* */ } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: throttle});
    await page.goto(`${base}/bezeg-2.0/${args.route || 'analysis/taylor'}`);
    await page.locator('.puck-strip [role=slider]').first().waitFor();
    await page.waitForTimeout(2500);
    if ('noruler' in args) await page.addStyleTag({content: '[data-puck-ruler]{display:none!important}'});
    const box = await page.locator('.puck-strip [role=slider]').first().boundingBox();
    const x0 = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    const events = [];
    cdp.on('Tracing.dataCollected', d => events.push(...d.value));
    const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.start', {traceConfig: {includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline']}, transferMode: 'ReportEvents'});
    const steps = 60, travel = 300, begin = Date.now();
    for (let i = 1; i <= steps; i++) {
        const f = i <= steps / 2 ? i / (steps / 2) : 2 - i / (steps / 2);
        await page.mouse.move(x0 + travel * f, y);
        const wait = begin + i * (2000 / steps) - Date.now();
        if (wait > 0) await page.waitForTimeout(wait);
    }
    await page.waitForTimeout(150);
    await cdp.send('Tracing.end');
    await done;
    await page.mouse.up();
    const sums = {};
    const names = ['EventDispatch', 'FunctionCall', 'UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Layerize', 'Commit', 'RunTask', 'HitTest', 'ParseHTML', 'UpdateLayer'];
    for (const e of events) if (e.ph === 'X' && names.includes(e.name)) sums[e.name] = (sums[e.name] || 0) + e.dur / 1000;
    const layouts = events.filter(e => e.ph === 'X' && e.name === 'Layout');
    console.log(`throttle=${throttle} noruler=${'noruler' in args}; ms per move (sum/${steps}):`);
    for (const [k, v] of Object.entries(sums)) console.log(k.padEnd(18), v.toFixed(0).padStart(6), (v / steps).toFixed(1).padStart(7));
    const big = layouts.sort((a, b) => b.dur - a.dur).slice(0, 3).map(e => `${(e.dur / 1000).toFixed(1)}ms dirty=${e.args && e.args.beginData && e.args.beginData.dirtyObjects} total=${e.args && e.args.beginData && e.args.beginData.totalObjects}`);
    console.log('layouts', layouts.length, big.join(' | '));
    await browser.close();
})();
