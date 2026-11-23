const {chromium} = require('playwright');
const path = require('path');
const fs = require('fs');
setTimeout(() => process.exit(2), 480000).unref();
const BASE = 'http://127.0.0.1:4483';
const LESSON = BASE + '/bezeg-2.0/analysis/phase-portrait?example=lesson.phase-portraits.linearization.phase-portrait';
const ROUTES = {
  taylor: '/bezeg-2.0/analysis/taylor',
  linear: '/bezeg-2.0/linear-map',
  decasteljau: '/bezeg-2.0/bezier/decasteljau',
  phase: '/bezeg-2.0/analysis/phase-portrait',
  transf: '/bezeg-2.0/functions/transformations',
};
const OUT = path.join(__dirname, '04-strip-overlap-check.json');
const out = {runs: {}};
const ov = (a, b) => {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? Math.round(w) + 'x' + Math.round(h) : null;
};
const inside = (s, l) => s.left >= l.left - 0.5 && s.right <= l.right + 0.5 && s.top >= l.top - 0.5 && s.bottom <= l.bottom + 0.5;

async function measure(page) {
  return page.evaluate(() => {
    const r = e => { const b = e.getBoundingClientRect(); return {left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height}; };
    const strip = document.querySelector('.puck-strip');
    const layer = document.querySelector('.board-cards-layer');
    const cards = [...document.querySelectorAll('[data-card-id]')]
      .map(c => ({id: c.getAttribute('data-card-id'), ...r(c)}))
      .filter(c => c.width > 0 && c.height > 0);
    return {strip: strip ? r(strip) : null, layer: layer ? r(layer) : null, cards};
  });
}

function geom(m) {
  if (!m.strip || !m.layer) return {hasStrip: !!m.strip, hasLayer: !!m.layer};
  const s = m.strip, l = m.layer;
  return {
    hasStrip: true,
    stripW: Math.round(s.width),
    stripH: Math.round(s.height),
    widthOk: s.width > 0,
    inside: inside(s, l),
    overlaps: m.cards.map(c => [c.id, ov(s, c)]).filter(x => x[1]),
  };
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const [w, h] of [[1440, 900], [1024, 768]]) {
      // Check 1: guided lesson walk
      {
        const key = `check1-lesson ${w}`;
        const ctx = await browser.newContext({viewport: {width: w, height: h}});
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push('pageerror: ' + String(e.message).split('\n')[0]));
        page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().split('\n')[0]); });
        await page.addInitScript(() => { try { localStorage.removeItem('bezeg-2.0:board-layout'); } catch {} });
        await page.goto(LESSON, {waitUntil: 'load'});
        await page.waitForSelector('section.guided-lesson .guided-lesson-nav-next', {timeout: 15000}).catch(() => {});
        await page.waitForTimeout(1200);
        const frames = [];
        let completed = false;
        for (let i = 0; i < 60; i++) {
          const nb = page.locator('section.guided-lesson .guided-lesson-nav-next');
          const progress = (await page.locator('section.guided-lesson .guided-lesson-progress').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
          const m = await measure(page);
          const g = geom(m);
          const frame = {i, progress, ...g};
          const count = await nb.count();
          frame.nextPresent = count > 0;
          if (count > 0) {
            const box = await nb.boundingBox();
            frame.nextVisible = await nb.isVisible();
            if (box) {
              frame.nextBox = [Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)];
              frame.nextInViewport = box.y >= 0 && box.x >= 0 && box.y + box.height <= h && box.x + box.width <= w;
              const hit = await page.evaluate(([x, y]) => {
                const el = document.elementFromPoint(x, y);
                const btn = document.querySelector('section.guided-lesson .guided-lesson-nav-next');
                return {hit: !!el && !!btn && (el === btn || btn.contains(el)), tag: el ? el.tagName + '.' + String(el.className).slice(0, 60) : null};
              }, [box.x + box.width / 2, box.y + box.height / 2]);
              frame.centreHit = hit.hit;
              frame.centreEl = hit.tag;
            }
          }
          const done = await page.locator('section.guided-lesson').innerText().then(t => /Example complete|Vodeni primer je končan/.test(t)).catch(() => false);
          frame.completeText = done;
          frames.push(frame);
          if (done || count === 0) { completed = done; break; }
          try {
            await nb.click({timeout: 5000});
            frame.clickOk = true;
          } catch (e) {
            frame.clickOk = false;
            frame.clickErr = String(e.message).split('\n').map(s => s.trim()).filter(Boolean).find(s => s.includes('intercepts')) || String(e.message).split('\n')[0];
          }
          await page.waitForTimeout(800);
        }
        const bad = frames.filter(f => !f.hasStrip || !f.widthOk || !f.inside || f.overlaps.length || f.nextPresent === false || f.centreHit === false || f.clickOk === false);
        out.runs[key] = {completed, frameCount: frames.length, distinctProgress: [...new Set(frames.map(f => f.progress))], failingFrames: bad, errs: errs.slice(0, 10), frames};
        console.log(key, 'completed=' + completed, 'frames=' + frames.length, 'failing=' + bad.length, 'errs=' + errs.length);
        for (const f of bad) console.log('  FAIL', JSON.stringify({i: f.i, progress: f.progress, overlaps: f.overlaps, inside: f.inside, stripW: f.stripW, centreHit: f.centreHit, centreEl: f.centreEl, clickOk: f.clickOk, clickErr: f.clickErr, nextInViewport: f.nextInViewport}));
        await ctx.close();
      }
      // Check 2: five standalone pilots (regression, as 05-strip.cjs)
      for (const [name, p] of Object.entries(ROUTES)) {
        const key = `check2-${name} ${w}`;
        const ctx = await browser.newContext({viewport: {width: w, height: h}});
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push('pageerror: ' + String(e.message).split('\n')[0]));
        page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().split('\n')[0]); });
        await page.addInitScript(() => { try { localStorage.removeItem('bezeg-2.0:board-layout'); } catch {} });
        await page.goto(BASE + p, {waitUntil: 'load'});
        await page.waitForSelector('.puck-strip', {timeout: 15000}).catch(() => {});
        await page.waitForTimeout(1200);
        const m = await measure(page);
        const g = geom(m);
        out.runs[key] = {...g, errs: errs.slice(0, 10)};
        const pass = g.hasStrip && g.widthOk && g.inside && g.overlaps.length === 0;
        console.log(key, pass ? 'PASS' : 'FAIL', JSON.stringify({stripW: g.stripW, inside: g.inside, overlaps: g.overlaps, hasStrip: g.hasStrip}), 'errs=' + errs.length);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
    console.log('WROTE', OUT);
  }
})().catch(e => { console.error('FATAL', String(e.message).split('\n')[0]); process.exit(1); });
