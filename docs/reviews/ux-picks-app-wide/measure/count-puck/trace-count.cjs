// Trace of 10 count-puck + clicks: summed phase durations, plus top FunctionCall callers/UpdateLayoutTree counts. node trace-count.cjs --url http://127.0.0.1:4472
const {chromium} = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => { if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]); return acc; }, []));
const base = (args.url || 'http://127.0.0.1:4472').replace(/\/$/, '');
const n = Number(args.n || 10);
(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    await context.addInitScript(() => { try { localStorage.setItem('bezeg-language', 'sl'); } catch (e) { /* */ } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await page.goto(`${base}/bezeg-2.0/${args.route || 'analysis/taylor'}`);
    const strip = page.locator('.puck-strip .puck-count').first();
    await strip.waitFor();
    await page.waitForTimeout(2500);
    if (args.css) await page.addStyleTag({content: args.css});
    const events = [];
    cdp.on('Tracing.dataCollected', d => events.push(...d.value));
    const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.start', {traceConfig: {includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline']}, transferMode: 'ReportEvents'});
    const plus = strip.locator('.puck-step').last();
    const t0 = Date.now();
    for (let i = 0; i < n; i++) { await plus.click({noWaitAfter: true, force: true}); await page.waitForTimeout(30); }
    const issued = Date.now() - t0;
    await page.waitForTimeout(1500);
    await cdp.send('Tracing.end');
    await done;
    const sums = {}, counts = {};
    const names = ['EventDispatch', 'FunctionCall', 'UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Layerize', 'Commit', 'RunTask', 'HitTest', 'ParseHTML', 'UpdateLayer', 'FireAnimationFrame', 'TimerFire', 'MinorGC', 'MajorGC', 'V8.GC_MC_BACKGROUND_MARKING'];
    for (const e of events) if (e.ph === 'X' && names.includes(e.name)) { sums[e.name] = (sums[e.name] || 0) + e.dur / 1000; counts[e.name] = (counts[e.name] || 0) + 1; }
    console.log(`clicks ${n}, issued in ${issued} ms`);
    Object.keys(sums).sort((a, b) => sums[b] - sums[a]).forEach(k => console.log(k.padEnd(22), sums[k].toFixed(0).padStart(7), 'ms', counts[k], 'x'));
    const long = events.filter(e => e.ph === 'X' && e.name === 'RunTask' && e.dur > 50000).map(e => (e.dur / 1000).toFixed(0));
    console.log('RunTask >50ms:', long.join(' '));
    const fc = events.filter(e => e.ph === 'X' && e.name === 'FunctionCall' && e.dur > 30000).map(e => `${(e.dur / 1000).toFixed(0)}ms ${e.args && e.args.data ? e.args.data.functionName + ' ' + String(e.args.data.url).split('/').pop() + ':' + e.args.data.lineNumber : ''}`);
    console.log('FunctionCall >30ms:\n' + fc.join('\n'));
    await browser.close();
})();
