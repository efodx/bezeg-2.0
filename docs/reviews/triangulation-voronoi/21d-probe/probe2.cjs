// Locates the long frame of the 40-site Voronoi drag with the Delaunay overlay on: times each phase separately.
const {chromium} = require('C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/node_modules/playwright');
const base = 'http://127.0.0.1:4313/bezeg-2.0';
const N = Number(process.env.N || 40);
const TRI = process.env.TRI !== '0';
(async () => {
    const browser = await chromium.launch();
    const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
    await page.goto(`${base}/compgeo/voronoi`, {waitUntil: 'load'});
    await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0);
    await page.waitForTimeout(1500);
    const pts = () => page.evaluate(() => {
        const bd = Object.values(window.JXG.boards)[0];
        bd.containerObj.scrollIntoView({block: 'center'});
        const r = bd.containerObj.getBoundingClientRect();
        return {r: [r.x, r.y, r.width, r.height], p: Object.values(bd.objects).filter(o => o.elType === 'point' && /^P\d+$/.test(o.name)).map(o => [o.name, o.coords.scrCoords[1], o.coords.scrCoords[2]])};
    });
    await page.getByRole('button', {name: 'Uredi', exact: true}).first().click();
    let n = (await pts()).p.length;
    for (let i = 0; n < N && i < 120; i++) {
        const x = -9 + (i % 10) * 2 + (i % 3), y = -6 + Math.floor(i / 10) * 2 + ((i * 7) % 3);
        await page.getByLabel(/^Nova točka: x$/).fill(String(x));
        await page.getByLabel(/^Nova točka: y$/).fill(String(y));
        await page.getByRole('button', {name: /^Dodaj točko$/}).click();
        n = (await pts()).p.length;
    }
    let t = Date.now();
    await page.getByRole('checkbox', {name: /^Dualnost: Delaunayeva triangulacija$/}).setChecked(TRI, {force: true});
    console.log(`sites ${n}; toggle tri=${TRI}: ${Date.now() - t} ms`);
    await page.waitForTimeout(1500);
    const s = await pts();
    const [ox, oy, w, h] = s.r;
    const target = s.p.map(([name, x, y]) => ({name, x, y, d: Math.hypot(x - w / 2, y - h / 2)})).filter(o => o.x > 0 && o.x < w && o.y > 0 && o.y < h).sort((a, b) => a.d - b.d)[0];
    const frameGap = () => page.evaluate(() => new Promise(res => { const a = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - a))); }));
    await page.mouse.move(ox + target.x, oy + target.y);
    const cdp = await page.context().newCDPSession(page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
    t = Date.now(); await page.mouse.down(); const down = Date.now() - t; const downFrame = await frameGap();
    const {profile} = await cdp.send('Profiler.stop'); require('fs').writeFileSync(__dirname + '/down.cpuprofile', JSON.stringify(profile));
    console.log(`target ${target.name}; mouse.down ${down} ms, next two frames ${downFrame.toFixed(0)} ms`);
    const per = [];
    for (let i = 1; i <= 12; i++) {
        t = Date.now();
        await page.mouse.move(ox + target.x + 3 * i, oy + target.y + 2 * i);
        const mv = Date.now() - t; const fr = await frameGap();
        per.push(`${mv}/${fr.toFixed(0)}`);
    }
    console.log(`moves (move ms/two frames ms): ${per.join(' ')}`);
    t = Date.now(); await page.mouse.up(); const up = Date.now() - t; const upFrame = await frameGap();
    console.log(`mouse.up ${up} ms, next two frames ${upFrame.toFixed(0)} ms`);
    const after = await page.evaluate(() => [...document.querySelectorAll('button')].length);
    console.log(`buttons on page: ${after}`);
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
