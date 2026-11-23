const {chromium} = require('playwright');
setTimeout(() => process.exit(2), 120000).unref();
const BASE = 'http://127.0.0.1:4483/bezeg-2.0/linear-map';
const ov = (a, b) => { const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return w > 0 && h > 0 ? Math.round(w) + 'x' + Math.round(h) : null; };
(async () => {
  const browser = await chromium.launch();
  try {
    for (const [w, h] of [[1440, 900], [1024, 768]]) {
      const ctx = await browser.newContext({viewport: {width: w, height: h}});
      const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', e => errs.push('pageerror: ' + String(e.message).split('\n')[0]));
      page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().split('\n')[0]); });
      await page.addInitScript(() => { try { localStorage.removeItem('bezeg-2.0:board-layout'); } catch {} });
      await page.goto(BASE, {waitUntil: 'load'}); await page.waitForTimeout(1500);
      await page.locator('#board-card-tools button[aria-expanded=false]').first().click(); await page.waitForTimeout(600);
      const sel = page.locator('#board-card-tools select').nth(1);
      console.log(w, 'selects', await page.locator('#board-card-tools select').count(), await page.locator('#board-card-tools [role=combobox]').count());
      let how = 'select';
      try { await sel.selectOption('composition', {timeout: 3000}); }
      catch (e) { console.log('selErr', e.message.split(String.fromCharCode(10)).slice(0,6).join(' | '));
        how = 'combobox';
        const cb = page.locator('#board-card-tools [role=combobox], #board-card-tools button[aria-haspopup]').first();
        await cb.click({timeout: 3000}); await page.getByRole('option', {name: /Sestavljanje/}).click({timeout: 3000});
      }
      await page.waitForTimeout(1000);
      const pk = await page.evaluate(() => [...document.querySelectorAll('.puck-strip [data-puck-key]')].map(p => { const e = p.querySelector('[role=slider],[role=spinbutton]'); return p.getAttribute('data-puck-key') + '|' + e?.getAttribute('aria-label') + '|' + e?.getAttribute('role') + '|' + e?.getAttribute('aria-valuenow') + '|' + e?.getAttribute('aria-valuetext') + '|' + e?.getAttribute('aria-valuemin') + '..' + e?.getAttribute('aria-valuemax'); }));
      console.log(w, how, JSON.stringify(pk));
      const geo = await page.evaluate(() => {
        const r = e => { const b = e.getBoundingClientRect(); return {left: b.left, right: b.right, top: b.top, bottom: b.bottom}; };
        const s = document.querySelector('.puck-strip'), l = document.querySelector('.board-cards-layer');
        const tools = [...document.querySelectorAll('#board-card-tools [role=slider],#board-card-tools [role=spinbutton],#board-card-tools input[type=range],#board-card-tools input[type=number]')].map(e => e.getAttribute('aria-label') || e.id);
        return {s: s && r(s), l: l && r(l), cards: [...document.querySelectorAll('[data-card-id]')].map(c => ({id: c.getAttribute('data-card-id'), ...r(c)})), rows: [...new Set([...document.querySelectorAll('.puck-strip [data-puck-key]')].map(p => Math.round(p.getBoundingClientRect().top)))].length, tools, names: [...document.querySelectorAll('.puck-strip [role=slider],.puck-strip [role=spinbutton]')].map(e => e.getAttribute('aria-label'))};
      });
      console.log(w, 'strip', JSON.stringify(geo.s), 'inside', geo.s.left >= geo.l.left && geo.s.right <= geo.l.right && geo.s.top >= geo.l.top && geo.s.bottom <= geo.l.bottom, 'rows', geo.rows, 'overlaps', JSON.stringify(geo.cards.map(c => [c.id, ov(geo.s, c)]).filter(x => x[1])), 'toolsDup', JSON.stringify(geo.tools.filter(n => geo.names.includes(n))), 'tools', JSON.stringify(geo.tools));
      const angles = page.locator('.puck-strip [role=slider]').filter({hasNot: page.locator('x')});
      const n = await angles.count();
      for (let i = 0; i < n; i++) {
        const a = angles.nth(i); const lab = await a.getAttribute('aria-label');
        if (!/kot|angle|°|zasuk|rot/i.test(lab + (await a.getAttribute('aria-valuetext')))) continue;
        const a0 = await a.getAttribute('aria-valuenow'), t0 = await a.getAttribute('aria-valuetext');
        await a.focus(); await page.keyboard.press('Shift+ArrowRight'); await page.waitForTimeout(400);
        const a1 = await a.getAttribute('aria-valuenow'), t1 = await a.getAttribute('aria-valuetext');
        console.log(w, 'angle', lab, a0, t0, '->', a1, t1);
      }
      await page.screenshot({path: `docs/reviews/ux-picks-app-wide/smoke/05-strip-composition-${w}.png`});
      console.log(w, 'errs', JSON.stringify(errs));
      await ctx.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error('FATAL', e.message.split('\n')[0]); process.exit(1); });
