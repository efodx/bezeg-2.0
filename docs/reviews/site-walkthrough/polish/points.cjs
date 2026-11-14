// Slice 4 checks: hover cursor on every point, label rendering and drag cost on point-set graphs.
// Usage: node .command-logs/polish/points.cjs <outDir> [route ...]
const {chromium} = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const base = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4331';
const out = path.resolve(process.argv[2]);
const routes = process.argv.slice(3).length ? process.argv.slice(3) : ['compgeo/interval-sweep', 'compgeo/delaunay', 'compgeo/voronoi', 'compgeo/convex-hull', 'compgeo/segment-intersections', 'compgeo/fortune', 'bspline/blossom', 'bezier/curve'];
fs.mkdirSync(out, {recursive: true});
(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    await context.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'sl'));
    const page = await context.newPage();
    const report = {};
    for (const route of routes) {
        await page.goto(`${base}/bezeg-2.0/${route}`, {waitUntil: 'networkidle'});
        await page.waitForSelector('svg ellipse', {state: 'attached', timeout: 20000});
        await page.waitForTimeout(2500);
        const name = route.replace('/', '-');
        await page.locator('svg:has(ellipse)').first().locator('xpath=..').screenshot({path: path.join(out, `${name}.png`)});
        const cursor = () => page.evaluate(() => getComputedStyle(document.querySelector('svg ellipse').ownerSVGElement.parentElement).cursor);
        const dots = () => page.evaluate(() => [...document.querySelectorAll('svg ellipse')].map(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
            return {x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, shown: s.display !== 'none' && s.visibility !== 'hidden'}; }).filter(p => p.w > 3 && p.shown));
        const points = await dots();
        const hovers = [];
        for (const [i, p] of points.slice(0, 14).entries()) {
            await page.mouse.move(p.x - 70, p.y + 53, {steps: 4}); await page.waitForTimeout(250);
            await page.mouse.move(p.x, p.y, {steps: 12}); await page.mouse.move(p.x + 1, p.y); await page.waitForTimeout(300);
            const during = await cursor();
            await page.mouse.move(p.x - 70, p.y + 53, {steps: 12}); await page.waitForTimeout(300);
            hovers.push(`${i}:${during}>${await cursor()}`);
        }
        const texts = await page.evaluate(() => ({texts: document.querySelectorAll('.JXGtext').length, mjx: document.querySelectorAll('.JXGtext mjx-container').length,
            plain: [...document.querySelectorAll('.JXGtext')].filter(e => !e.querySelector('mjx-container') && e.textContent.trim() && getComputedStyle(e).display !== 'none').map(e => e.textContent.trim().slice(0, 24)).slice(0, 12),
            svgText: [...document.querySelectorAll('svg text')].filter(e => e.textContent.trim()).map(e => e.textContent.trim().slice(0, 16)).slice(0, 12)}));
        // Drag cost: frame intervals in the page while the mouse drags the last point.
        let drag;
        if (points.length) {
            const p = points[points.length - 1];
            await page.mouse.move(p.x, p.y); await page.mouse.down();
            await page.evaluate(() => { window.__frames = []; let last = performance.now(); const tick = now => { window.__frames.push(now - last); last = now; window.__raf = requestAnimationFrame(tick); }; window.__raf = requestAnimationFrame(tick); });
            for (let i = 1; i <= 60; i++) { await page.mouse.move(p.x + Math.sin(i / 6) * 40, p.y + Math.cos(i / 6) * 30 - 30); }
            const frames = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__frames.slice(2); });
            await page.mouse.up();
            const sorted = [...frames].sort((a, b) => a - b);
            const after = (await dots())[points.length - 1];
            drag = {frames: frames.length, medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(1), p95Ms: +sorted[Math.floor(sorted.length * .95)].toFixed(1), maxMs: +sorted[sorted.length - 1].toFixed(1),
                moved: after ? [+(after.x - p.x).toFixed(0), +(after.y - p.y).toFixed(0)] : null};
        }
        report[route] = {points: points.length, hovers: hovers.join(' '), ...texts, drag};
        console.log(route, JSON.stringify(report[route]));
    }
    await browser.close();
    fs.writeFileSync(path.join(out, 'points.json'), JSON.stringify(report, null, 1));
})().catch(error => { console.error(error); process.exit(1); });
