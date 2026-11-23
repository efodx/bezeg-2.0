const {chromium} = require('playwright');
setTimeout(() => process.exit(2), 280000).unref();
const BASE = 'http://127.0.0.1:4483';
const ROUTES = {
  taylor: '/bezeg-2.0/analysis/taylor',
  linear: '/bezeg-2.0/linear-map',
  decasteljau: '/bezeg-2.0/bezier/decasteljau',
  phase: '/bezeg-2.0/analysis/phase-portrait',
  transf: '/bezeg-2.0/functions/transformations',
};
const out = {};
const log = (k, v) => { out[k] = v; console.log(k, JSON.stringify(v)); };
const ov = (a, b) => {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? Math.round(w) + 'x' + Math.round(h) : null;
};
(async () => {
  const browser = await chromium.launch();
  try {
    for (const [w, h] of [[1440, 900], [1024, 768]]) {
      for (const [name, path] of Object.entries(ROUTES)) {
        const ctx = await browser.newContext({viewport: {width: w, height: h}});
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push('pageerror: ' + String(e.message).split('\n')[0]));
        page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().split('\n')[0]); });
        await page.addInitScript(() => { try { localStorage.removeItem('bezeg-2.0:board-layout'); } catch {} });
        await page.goto(BASE + path, {waitUntil: 'load'});
        await page.waitForSelector('.puck-strip', {timeout: 15000}).catch(() => {});
        await page.waitForTimeout(1200);
        const info = await page.evaluate(() => {
          const r = e => { const b = e.getBoundingClientRect(); return {left: b.left, right: b.right, top: b.top, bottom: b.bottom}; };
          const strip = document.querySelector('.puck-strip');
          const layer = document.querySelector('.board-cards-layer');
          const cards = [...document.querySelectorAll('[data-card-id]')].map(c => ({id: c.getAttribute('data-card-id'), ...r(c)}));
          const pucks = [...document.querySelectorAll('[data-puck-key]')].map(p => {
            const sl = p.querySelector('[role=slider],[role=spinbutton]') || (p.matches('[role=slider],[role=spinbutton]') ? p : null);
            return {param: p.getAttribute("data-puck-key"), name: sl && sl.getAttribute('aria-label'), role: sl && sl.getAttribute('role'), ...r(p)};
          });
          const tools = document.querySelector('#board-card-tools');
          const toolNames = tools ? [...tools.querySelectorAll('[role=slider],[role=spinbutton],input[type=range],input[type=number]')].map(e => e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].textContent) || e.id) : null;
          return {strip: strip && {visible: strip.getBoundingClientRect().width > 0, ...r(strip)}, layer: layer && r(layer), cards, pucks, toolNames, hasTools: !!tools};
        });
        const res = {errs, hasStrip: !!info.strip, stripVisible: info.strip && info.strip.visible, hasTools: info.hasTools};
        if (info.strip && info.layer) {
          const s = info.strip, l = info.layer;
          res.inside = s.left >= l.left - 0.5 && s.right <= l.right + 0.5 && s.top >= l.top - 0.5 && s.bottom <= l.bottom + 0.5;
          res.stripRect = s; res.layer = l;
          res.overlaps = info.cards.map(c => [c.id, ov(s, c)]).filter(x => x[1]);
          res.puckTops = [...new Set(info.pucks.map(p => Math.round(p.top)))].length;
          res.pucks = info.pucks.map(p => p.name + ':' + p.role);
          const names = info.pucks.map(p => p.name).filter(Boolean);
          res.toolsDup = (info.toolNames || []).filter(n => names.includes(n));
          res.toolNames = info.toolNames;
        }
        log(`check1 ${w} ${name}`, res);
        if (w === 1440 && name === 'taylor') await page.screenshot({path: 'docs/reviews/ux-picks-app-wide/smoke/05-strip-taylor.png'});
        if (w === 1024) await page.screenshot({path: `docs/reviews/ux-picks-app-wide/smoke/05-strip-${name}-1024.png`});
        // behaviours
        if (name === 'taylor') {
          const deg = page.locator('[data-puck-key] [role=spinbutton]').first();
          const rd = () => page.evaluate(() => document.body.innerText.length + '|' + (document.querySelector('[role=spinbutton]')?.getAttribute('aria-valuenow')));
          const before = await deg.getAttribute('aria-valuenow');
          const txtBefore = await page.evaluate(() => document.querySelector('.board-cards-layer')?.innerText);
          await deg.focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500);
          const after = await deg.getAttribute('aria-valuenow');
          const txtAfter = await page.evaluate(() => document.querySelector('.board-cards-layer')?.innerText);
          const diff = txtBefore !== txtAfter;
          log(`check2 ${w}`, {name: await deg.getAttribute('aria-label'), before, after, readoutChanged: diff, errs: errs.slice()});
        }
        if (name === 'decasteljau') {
          const tp = page.locator('[data-puck-key] [role=slider]').first();
          const val = () => tp.getAttribute('aria-valuenow');
          const v0 = await val();
          await page.locator('.puck-playback button').first().click();
          await page.waitForTimeout(300); const v1 = await val();
          await page.waitForTimeout(1000); const v2 = await val();
          await tp.focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
          const v3 = await val(); await page.waitForTimeout(1000); const v4 = await val();
          log(`check3 ${w}`, {label: await tp.getAttribute('aria-label'), v0, v1, v2, afterKey: v3, later: v4, errs: errs.slice()});
        }
        if (name === 'phase') {
          const entry = page.locator('[data-puck-key] [role=slider]').first();
          const label = await entry.getAttribute('aria-label');
          await entry.dblclick();
          await page.waitForTimeout(200);
          const inp = page.locator('.puck input').first();
          await inp.fill('1,3'); await inp.press('Enter'); await page.waitForTimeout(400);
          const sl = page.locator('[data-puck-key] [role=slider]').first();
          log(`check4 ${w}`, {label, valuetext: await sl.getAttribute('aria-valuetext'), valuenow: await sl.getAttribute('aria-valuenow'), text: (await sl.innerText()).trim(), notice: await page.locator('.puck-notice').allInnerTexts(), errs: errs.slice()});
        }
        if (name === 'linear') {
          // enter composition mode: try role/text
          let entered = false;
          const cand = page.getByText(/Sestavljanje preslikav/).first();
          try {
            await page.locator('[data-card-id]').first().waitFor({timeout: 3000});
            if (!(await cand.isVisible())) { /* maybe in closed section */ }
            await cand.click({timeout: 3000}); entered = true;
          } catch (e) { log(`check5 ${w} enterErr`, String(e.message).split('\n')[0]); }
          await page.waitForTimeout(800);
          const pk = await page.evaluate(() => [...document.querySelectorAll('[data-puck-key]')].map(p => p.getAttribute("data-puck-key") + '|' + (p.querySelector('[role=slider],[role=spinbutton]')?.getAttribute('aria-label')) + '|' + p.querySelector('[role=slider],[role=spinbutton]')?.getAttribute('aria-valuenow')));
          log(`check5 ${w} pucks`, {entered, pk});
          const ang = page.locator('[data-puck-key]').filter({has: page.locator('[role=slider],[role=spinbutton]')}).filter({hasText: /kot|angle|°/i}).locator('[role=slider],[role=spinbutton]').first();
          if (await ang.count()) {
            const a0 = await ang.getAttribute('aria-valuenow');
            await ang.focus(); await page.keyboard.press('Shift+ArrowRight'); await page.waitForTimeout(400);
            const a1 = await ang.getAttribute('aria-valuenow');
            log(`check5 ${w}`, {label: await ang.getAttribute('aria-label'), a0, a1, errs: errs.slice()});
          } else log(`check5 ${w}`, 'no angle puck found');
          const s2 = await page.evaluate(() => { const s = document.querySelector('.puck-strip'); const l = document.querySelector('.board-cards-layer'); if (!s) return null; const a = s.getBoundingClientRect(), b = l.getBoundingClientRect(); return {inside: a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom, a: [a.left, a.top, a.right, a.bottom], rows: new Set([...document.querySelectorAll('[data-puck-key]')].map(p => Math.round(p.getBoundingClientRect().top))).size}; });
          log(`check5-strip ${w}`, s2);
          if (w === 1024) await page.screenshot({path: 'docs/reviews/ux-picks-app-wide/smoke/05-strip-linear-composition-1024.png'});
        }
        await ctx.close();
      }
    }
  } finally { await browser.close(); require('fs').writeFileSync('docs/reviews/ux-picks-app-wide/smoke/05-strip.json', JSON.stringify(out, null, 1)); }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
