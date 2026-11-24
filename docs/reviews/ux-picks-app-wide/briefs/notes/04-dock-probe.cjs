const {chromium} = require('playwright');
const BASE = 'http://127.0.0.1:4483/bezeg-2.0/';
(async () => {
  const br = await chromium.launch();
  for (const route of ['analysis/phase-portrait', 'analysis/taylor']) {
    for (const [w, h] of [[1440, 900], [1024, 768]]) {
      const ctx = await br.newContext({viewport: {width: w, height: h}});
      const p = await ctx.newPage();
      await p.goto(BASE + route);
      await p.evaluate(() => localStorage.removeItem('bezeg-2.0:board-layout'));
      await p.goto(BASE + route);
      const sel = '.board-cards-layer [data-card-id=readouts]';
      try { await p.waitForSelector(sel, {timeout: 20000}); } catch { console.log(route, w, 'no readouts card'); await ctx.close(); continue; }
      await p.waitForTimeout(2500);
      const board = await p.locator('.board-cards-layer').boundingBox();
      const head = await p.locator(sel + ' .board-card-head').boundingBox();
      const card = await p.locator(sel).boundingBox();
      const sx = head.x + 40, sy = head.y + head.height / 2;
      const tx = board.x + board.width * 0.85;
      await p.mouse.move(sx, sy); await p.mouse.down();
      let hit = null, anchorRect = null;
      for (let y = sy; y <= board.y + board.height + 20; y += 5) {
        await p.mouse.move(tx, y, {steps: 2});
        await p.waitForTimeout(40);
        const g = await p.locator('[data-board-drop-target]').boundingBox().catch(() => null);
        if (g) { const gx = g.x + g.width / 2 - board.x, gy = g.y + g.height / 2 - board.y; if (gy > board.height / 2 && gx > board.width / 2) { hit = y - board.y; anchorRect = g; break; } }
      }
      let docked = null;
      if (hit !== null) {
        await p.mouse.up(); await p.waitForTimeout(600);
        const c = await p.locator(sel).boundingBox();
        docked = {bottomGap: Math.round(board.y + board.height - (c.y + c.height)), rightGap: Math.round(board.x + board.width - (c.x + c.width))};
      } else await p.mouse.up();
      console.log(JSON.stringify({route, vp: `${w}x${h}`, board: [Math.round(board.width), Math.round(board.height)], card: [Math.round(card.width), Math.round(card.height)], grabY: Math.round(sy - board.y), brAtPointerY: hit === null ? null : Math.round(hit), docked}));
      await ctx.close();
    }
  }
  await br.close();
})();
