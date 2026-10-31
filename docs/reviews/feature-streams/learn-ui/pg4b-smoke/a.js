const L = require('./lib.js'); const D = __dirname;
const mobile = process.argv[2] === 'm';
(async () => {
  const {br, page, errs} = await L.open(mobile ? {ctx: {viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true}} : {});
  const R = (n, v) => console.log(n, JSON.stringify(v));
  await page.goto(L.B + '/learn/bezier-curves'); await page.waitForTimeout(2500);
  const pg = page.locator('.playground--draw'); const cv = pg.locator('svg.playground__canvas');
  await cv.scrollIntoViewIfNeeded();
  const btn = n => pg.locator('.playground__toolbar button', {hasText: new RegExp('^' + n + '$')});
  const d = async () => (await pg.locator('path.playground__shape').getAttribute('d').catch(() => null));
  const na = () => pg.locator('[data-role="anchor"]').count();
  const bb = await cv.boundingBox(); R('canvas', bb);
  const P = (x, y) => [bb.x + bb.width * x, bb.y + bb.height * y];
  const tap = async (px, py) => { if (mobile) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py); await page.waitForTimeout(150); };
  const click = (x, y) => tap(...P(x, y));
  const touchDrag = (px, py, dx, dy) => page.evaluate(([px, py, dx, dy]) => {
    const el = document.elementFromPoint(px, py); const o = {pointerId: 8, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: px, clientY: py, button: 0, buttons: 1};
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    for (let i = 1; i <= 8; i++) el.dispatchEvent(new PointerEvent('pointermove', {...o, clientX: px + dx * i / 8, clientY: py + dy * i / 8}));
    el.dispatchEvent(new PointerEvent('pointerup', {...o, buttons: 0, clientX: px + dx, clientY: py + dy}));
  }, [px, py, dx, dy]);
  const dragAt = async (sx, sy, dx, dy, alt) => {
    if (!mobile) { if (alt) await page.keyboard.down('Alt'); await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(sx + dx, sy + dy, {steps: 8}); await page.mouse.up(); if (alt) await page.keyboard.up('Alt'); }
    else await touchDrag(sx, sy, dx, dy);
    await page.waitForTimeout(250);
  };
  const types = () => pg.locator('[data-role="anchor"]').evaluateAll(a => a.map(x => x.getAttribute('aria-label')));
  const center = async loc => { const b = await loc.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const live = async () => { await page.waitForTimeout(900); return pg.locator('.playground__live').innerText(); };

  await btn('Clear').click({force: true}).catch(() => {});
  await click(.2, .7); await click(.5, .2); R('anchors after 2 clicks', await na());
  await dragAt(...P(.8, .5), 40, 40); R('anchors after drag-create', await na());
  R('types', await types()); R('handles', await pg.locator('[data-role^="handle"]').count());
  await page.screenshot({path: D + `/a-${mobile ? 'm' : 'd'}-built.png`});
  // close by clicking the first anchor
  await tap(...(await center(pg.locator('[data-role="anchor"][data-index="0"] .playground__anchor-dot, [data-role="anchor"][data-index="0"] circle').last())));
  R('live after click first anchor', await live());
  if (/open|odprta/.test(await live())) { await btn('Close shape').click(); R('closed via button', await live()); }
  const dBefore = await d();
  const [ax, ay] = await center(pg.locator('[data-role="anchor"][data-index="1"] circle').last());
  await dragAt(ax, ay, 30, 25); const dAfter = await d(); R('anchor drag changed d', dBefore !== dAfter);
  await btn('Undo').click(); R('undo reverts drag', (await d()) === dBefore);
  await btn('Redo').click(); R('redo restores', (await d()) === dAfter);
  const h = pg.locator('[data-role^="handle"]'); R('handle count', await h.count());
  if (await h.count()) {
    const [hx, hy] = await center(h.first().locator('circle').last()); const d0 = await d();
    await dragAt(hx, hy, 20, -20); R('handle drag changed d', d0 !== await d());
    if (!mobile) {
      const d1 = await d(); const t0 = await types();
      const [h2x, h2y] = await center(pg.locator('[data-role^="handle"][data-index="2"]').first().locator('circle').last());
      await dragAt(h2x, h2y, -15, -15, true); R('alt-drag', {dChanged: d1 !== await d(), before: t0.slice(2), after: (await types()).slice(2)});
    }
  }
  const t1 = await types();
  const [x2, y2] = await center(pg.locator('[data-role="anchor"][data-index="2"] circle').last());
  await dragAt(x2, y2, 10, 10);
  if (!mobile) await page.mouse.dblclick(x2 + 10, y2 + 10); else { await page.touchscreen.tap(x2 + 10, y2 + 10); await page.touchscreen.tap(x2 + 10, y2 + 10); }
  await page.waitForTimeout(300); R('dblclick after drag types', {before: t1, after: await types()});
  await btn('Clear').click(); R('after clear', await na());
  const [ex, ey] = P(.3, .5);
  if (!mobile) await page.mouse.dblclick(ex, ey); else { await page.touchscreen.tap(ex, ey); await page.waitForTimeout(60); await page.touchscreen.tap(ex, ey); }
  await page.waitForTimeout(300); R('dblclick/doubletap empty anchors', await na());
  await click(.6, .6); const n0 = await na();
  await pg.locator('[data-role="anchor"]').last().focus(); await btn('Delete point').click({force: true}); R('delete (n before, after)', [n0, await na()]);
  await btn('Clear').click(); R('clear', await na());
  await btn('Load example').click(); R('example', {n: await na(), live: await live()});
  if (mobile) {
    R('toolbar btn sizes', await pg.locator('.playground__toolbar button').evaluateAll(b => b.map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })));
    R('hit sizes', await pg.locator('.playground-hit').evaluateAll(c => c.slice(0, 4).map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })));
    R('touch-action canvas/body', await page.evaluate(() => [getComputedStyle(document.querySelector('.playground--draw svg.playground__canvas')).touchAction, getComputedStyle(document.body).touchAction]));
    const cdp = await page.context().newCDPSession(page); const y0 = await page.evaluate(() => scrollY);
    const cb = await cv.boundingBox(); R('canvas now', cb);
    const sy = cb.y + cb.height + 60 < 830 ? cb.y + cb.height + 40 : Math.max(10, cb.y - 40);
    await cdp.send('Input.synthesizeScrollGesture', {x: 195, y: sy, xDistance: 0, yDistance: -200, gestureSourceType: 'touch'}).catch(e => R('cdp err', e.message));
    await page.waitForTimeout(500); R('scrollY from outside canvas', [y0, await page.evaluate(() => scrollY), sy]);
    await cv.scrollIntoViewIfNeeded();
  }
  // keyboard path
  await btn('Clear').click();
  await btn('Add point').focus();
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(100); }
  R('kb anchors', await na());
  await btn('Close shape').focus(); await page.screenshot({path: D + `/a-${mobile ? 'm' : 'd'}-focusring.png`});
  await page.keyboard.press('Enter'); R('kb close', await live());
  await pg.locator('[data-role="anchor"]').first().focus(); await page.keyboard.press('Tab');
  R('tab after anchor0', await page.evaluate(() => document.activeElement.getAttribute('aria-label') + '|' + document.activeElement.getAttribute('data-role')));
  const k0 = await d(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Shift+ArrowRight'); await page.waitForTimeout(300);
  R('key move on handle changed d', k0 !== await d());
  await page.screenshot({path: D + `/a-${mobile ? 'm' : 'd'}-kbhandle.png`});
  R('errs', errs); await br.close();
})().catch(e => { console.log('FAIL', e.message.slice(0, 500)); process.exit(1); });
