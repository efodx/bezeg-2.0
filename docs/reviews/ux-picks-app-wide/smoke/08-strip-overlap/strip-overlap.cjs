// Strip vs board cards bounding boxes. Run: node docs/reviews/ux-picks-app-wide/smoke/08-strip-overlap/strip-overlap.cjs
const path = require('path');
const {chromium} = require(path.join(process.cwd(), 'node_modules', 'playwright'));
const base = 'http://127.0.0.1:4483/bezeg-2.0';
const sizes = [[1440, 900], [1280, 720]];
const cases = [
  ['/functions/inverse lesson step 1', '/functions/inverse', 'lesson'],
  ['/functions/inverse free play', '/functions/inverse', 'free'],
  ['/functions/exponential free, Orodja closed', '/functions/exponential', 'free'],
  ['/functions/exponential free, Orodja open', '/functions/exponential', 'tools'],
  ['/linear-map lesson step 1', '/linear-map', 'lesson'],
];
const hit = (a, b) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
(async () => {
  const browser = await chromium.launch();
  let bad = 0;
  for (const [w, h] of sizes) for (const [name, route, mode] of cases) {
    const page = await browser.newPage({viewport: {width: w, height: h}});
    await page.goto(base + route + (mode === 'lesson' ? '?learn=1' : ''));
    await page.waitForSelector('[data-puck-strip]', {timeout: 20000}).catch(() => {});
    await page.waitForTimeout(1500);
    if (mode === 'tools') {
      const t = page.getByText('Orodja', {exact: true}).first();
      if (await t.count()) { await t.click().catch(() => {}); await page.waitForTimeout(800); }
    }
    const r = await page.evaluate(() => {
      const bx = (e) => { const r = e.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}; };
      const el = document.querySelector('[data-puck-strip]'); const kids = el ? [...el.children].filter((k) => !k.className.includes('status')).map(bx) : []; const strip = el && kids.length ? {x: Math.min(...kids.map((k) => k.x)), y: Math.min(...kids.map((k) => k.y)), w: Math.max(...kids.map((k) => k.x + k.w)) - Math.min(...kids.map((k) => k.x)), h: Math.max(...kids.map((k) => k.y + k.h)) - Math.min(...kids.map((k) => k.y))} : null;
      const cards = [...document.querySelectorAll('.board-card[data-card-id]')].map((e) => ({id: e.getAttribute('data-card-id'), ...bx(e)}));
      return {strip, cards: cards.filter((c) => c.x > -1000)};
    });
    const over = r.strip ? r.cards.filter((c) => hit(r.strip, c)).map((c) => c.id) : [];
    if (over.length) bad++;
    console.log(`${w}x${h} ${name}: strip ${JSON.stringify(r.strip)} overlaps [${over}] cards ${r.cards.map((c) => `${c.id}@${c.x},${c.y},${c.w}x${c.h}`).join(' ')}`);
    await page.close();
  }
  console.log(bad ? `OVERLAPS: ${bad}` : 'NO OVERLAPS');
  await browser.close();
})();
