// Walks every guided step of the six pilot lessons and reports any puck body, strip or other card whose rect
// intersects the lesson Back/Next buttons. Usage: BASE=http://127.0.0.1:4483/bezeg-2.0/ node 07-nav-overlap.cjs [lesson ...]
const L = require('./07-morph-3a-lib.cjs');
const SIZES = [[1280, 720], [1440, 900], [1024, 768]];
const probe = () => {
  const r = (e) => { const b = e.getBoundingClientRect(); return {x: b.x, y: b.y, w: b.width, h: b.height}; };
  const hit = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
  const nav = [...document.querySelectorAll('.guided-lesson-nav')].filter((b) => b.offsetParent);
  const own = nav[0]?.closest('[data-card-id]');
  const out = [];
  const others = [...document.querySelectorAll('.puck-strip, .puck-body, [data-card-id]')].filter((e) => e !== own && !e.contains(nav[0]) && !(own && own.contains(e)) && e.offsetParent !== null);
  for (const b of nav) for (const o of others) if (hit(r(b), r(o))) out.push(`${b.className.split(' ')[1]} x ${o.className.split(' ')[0]}${o.dataset.cardId ? ':' + o.dataset.cardId : ''}${o.getAttribute('aria-label') ? ':' + o.getAttribute('aria-label') : ''}`);
  return {n: nav.length, out};
};
(async () => {
  const want = process.argv.slice(2);
  const br = await L.chromium.launch();
  let bad = 0;
  for (const [name, route] of Object.entries(L.ROUTES)) {
    if (want.length && !want.includes(name)) continue;
    for (const [w, h] of SIZES) {
      const {ctx, p, errors} = await L.open(br, route, w, h);
      const hits = new Set();
      let steps = 0;
      for (let step = 1; step <= 30; step++) {
        await p.waitForTimeout(1300);
        const res = await p.evaluate(probe);
        if (!res.n) break;
        steps++;
        res.out.forEach((s) => hits.add(`step${step} ${s}`));
        const next = p.locator('.guided-lesson-nav-next').first();
        if (!(await next.isEnabled().catch(() => false))) break;
        await next.click({force: true, timeout: 4000}).catch(() => {});
      }
      bad += hits.size;
      console.log(`${name} ${w}x${h}: steps=${steps} overlaps=${hits.size}${hits.size ? ' ' + [...hits].slice(0, 6).join(' | ') : ''}${errors.length ? ' errors=' + errors.length : ''}`);
      await ctx.close();
    }
  }
  await br.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('FAIL', e.message.slice(0, 400)); process.exit(2); });
