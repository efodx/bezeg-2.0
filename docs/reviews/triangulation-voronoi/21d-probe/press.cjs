const {chromium} = require('C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/node_modules/playwright');
(async () => {
  for (const route of ['voronoi', 'delaunay']) {
    const browser = await chromium.launch();
    const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
    await page.goto(`http://127.0.0.1:4313/bezeg-2.0/compgeo/${route}`, {waitUntil: 'load'});
    await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0); await page.waitForTimeout(1500);
    const box = page.getByRole('checkbox', {name: /Delaunay/}).first();
    if (route === 'voronoi') await box.setChecked(true, {force: true});
    await page.waitForTimeout(500);
    const st = () => page.evaluate(() => { const bd = Object.values(window.JXG.boards)[0]; bd.containerObj.scrollIntoView({block: 'center'}); const r = bd.containerObj.getBoundingClientRect();
      return {r: [r.x, r.y], n: bd.objectsList.length, pressed: [...document.querySelectorAll('button[aria-pressed="true"]')].map(b => b.textContent.trim()).slice(0, 4), p: Object.values(bd.objects).filter(o => o.elType === 'point' && /^P\d+$/.test(o.name)).map(o => [o.name, o.coords.scrCoords[1], o.coords.scrCoords[2]])}; });
    const a = await st(); const t = a.p[5];
    await page.mouse.move(a.r[0] + t[1], a.r[1] + t[2]); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(500);
    const b = await st();
    console.log(route, 'press', t[0], 'objects', a.n, '->', b.n, 'pressed buttons before', JSON.stringify(a.pressed), 'after', JSON.stringify(b.pressed));
    await browser.close();
  }
})();
