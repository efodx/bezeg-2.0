// Browser smoke for sweep task 24 (Fortune registration). Read-only on src.
const {chromium} = require('@playwright/test');
const fs = require('fs');
const OUT = __dirname;
const BASE = 'http://127.0.0.1:4323/bezeg-2.0';
const VP = {desktop: {width: 1280, height: 720}, phone: {width: 390, height: 844}};
const results = [];
const rec = (item, pass, detail) => {
  results.push({item, pass: !!pass, detail});
  console.log((pass ? 'PASS ' : 'FAIL ') + item + ' :: ' + JSON.stringify(detail).slice(0, 700));
};
const RUN = Date.now().toString(36);

async function open(browser, vpName, lang) {
  const ctx = await browser.newContext({viewport: VP[vpName], reducedMotion: 'reduce'});
  await ctx.addInitScript(l => localStorage.setItem('bezeg-2.0:bezeg-language', l), lang);
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  p.on('pageerror', e => errs.push('pageerror ' + e.message.slice(0, 160)));
  p.on('dialog', d => d.accept());
  return {ctx, p, errs};
}
const stepOf = async p => {
  const t = await p.locator('body').innerText();
  const m = t.match(/(Step|Korak) (\d+) (of|od) (\d+)/);
  return m ? {n: +m[2], of: +m[4]} : null;
};
const readouts = p => p.locator('[data-fortune]').allTextContents();
const nextBtn = p => p.getByRole('button', {name: /^(Next step|Naslednji korak)$/});
const tab = async (p, name) => p.getByRole('button', {name, exact: true}).click();
const rawTexScan = p => p.locator('[data-fortune]').evaluateAll(roots => {
  const raw = [];
  for (const r of roots) {
    const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (n.parentElement && n.parentElement.closest('.katex')) continue;
      if (/\\\(|\\\)|\\approx|\\sqrt|\\\[/.test(n.textContent)) raw.push(n.textContent.trim().slice(0, 80));
    }
  }
  return raw;
});
const overflowScan = p => p.evaluate(() => {
  const W = window.innerWidth;
  const bad = [];
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || !e.textContent.trim() || e.children.length > 0) continue;
    if (r.right > W + 1) bad.push(e.tagName + ':' + e.textContent.trim().slice(0, 30));
  }
  return {docScrollWidth: document.documentElement.scrollWidth, innerWidth: W, offRight: bad.slice(0, 6), offCount: bad.length};
});

async function stepRun(browser, vpName) {
  const {ctx, p, errs} = await open(browser, vpName, 'en');
  const tag = 'fortune-' + vpName;
  await p.goto(BASE + '/compgeo/fortune', {waitUntil: 'load'});
  await p.locator('h1').first().waitFor();
  await p.waitForTimeout(600);
  const board = await p.evaluate(() => {
    const b = window.JXG && Object.values(window.JXG.boards)[0];
    return b ? {unitX: b.unitX, unitY: b.unitY, bbox: b.getBoundingBox()} : null;
  });
  const s0 = await stepOf(p);
  const r0 = (await readouts(p)).join(' | ');
  const svgBox = await p.locator('.jxgbox').first().boundingBox();
  await p.screenshot({path: `${OUT}/24-smoke-${tag}-load.png`});
  rec(`1 ${tag} direct load: graph visible, counter Step 1 of 8 (display is 1-based)`, !!svgBox && svgBox.width > 300 && svgBox.height > 200 && !!s0 && s0.n === 1, {svgBox, step: s0});
  rec(`1 ${tag} equal axis units`, !!board && Math.abs(board.unitX - board.unitY) < 1e-9, board);
  rec(`1 ${tag} step-0 readout: sweep line above all sites`, /above all/.test(r0), r0.slice(0, 300));
  await p.reload({waitUntil: 'load'});
  await p.locator('h1').first().waitFor();
  await p.waitForTimeout(500);
  const sr = await stepOf(p);
  const svgR = await p.locator('.jxgbox').first().boundingBox();
  rec(`1 ${tag} reload: graph visible, step 0`, !!svgR && svgR.width > 300 && !!sr && sr.n === 1, {svgR, step: sr});

  const trace = [];
  let falseAlarm = null, latexOk = null;
  const latexRaw = [];
  let prevNote = null, noteChanges = 0;
  for (let i = 0; i < 20; i++) {
    const btn = nextBtn(p);
    if ((await btn.getAttribute('aria-disabled')) === 'true') break;
    await btn.click();
    await p.waitForTimeout(250);
    const st = await stepOf(p);
    const ro = (await readouts(p)).join(' | ');
    const note = ro.slice(0, 90);
    if (note !== prevNote) noteChanges++;
    prevNote = note;
    const cancelled = await p.locator('li[data-cancelled]').count();
    if (/False alarm/.test(ro) && falseAlarm === null) {
      falseAlarm = {step: st && st.n, cancelled, queue: await p.locator('ol.sweep-side-list li').allInnerTexts()};
      await p.screenshot({path: `${OUT}/24-smoke-${tag}-false-alarm.png`});
    }
    const katex = await p.locator('[data-fortune] mjx-container').count();
    const raw = await rawTexScan(p);
    if (/Sweep line height/.test(ro)) {
      latexOk = (latexOk !== false) && katex > 0;
      latexRaw.push(...raw);
    }
    trace.push({n: st && st.n, live: (await p.locator('[data-fortune-live]').first().textContent()).slice(0, 50), cancelled, katex, raw: raw.length});
  }
  const end = await stepOf(p);
  const endDisabled = (await nextBtn(p).getAttribute('aria-disabled')) === 'true';
  await p.screenshot({path: `${OUT}/24-smoke-${tag}-end.png`});
  const liveBox = await p.locator('[data-fortune-live]').first().boundingBox();
  const liveAttr = await p.locator('[data-fortune-live]').first().getAttribute('aria-live');
  const liveCls = await p.locator('[data-fortune-live]').first().getAttribute('class');
  rec(`2 ${tag} Next step runs to end`, !!end && end.n === end.of && end.n > 0 && endDisabled, {end, steps: trace.length});
  rec(`2 ${tag} readouts update on each step`, noteChanges >= trace.length, {noteChanges, steps: trace.length});
  rec(`2 ${tag} false alarm: cancelled queue entry`, !!falseAlarm && falseAlarm.cancelled > 0 && falseAlarm.queue.some(t => /cancel/i.test(t)), falseAlarm);
  rec(`2 ${tag} sweep-height LaTeX typeset, no raw TeX`, latexOk === true && latexRaw.length === 0, {latexOk, rawTexSamples: latexRaw.slice(0, 3)});
  rec(`2 ${tag} live region: aria-live, visually hidden, announces steps`, !!liveBox && liveBox.width <= 1.5 && liveBox.height <= 1.5 && liveAttr === 'polite' && trace.filter(t => t.live.length > 0).length > 0, {liveBox, liveAttr, liveCls, sample: trace.slice(0, 3).map(t => t.live)});
  const ov = await overflowScan(p);
  rec(`2 ${tag} no horizontal overflow / text beyond viewport`, ov.docScrollWidth <= ov.innerWidth + 1 && ov.offCount === 0, ov);
  await tab(p, 'Edit');
  await p.getByRole('button', {name: 'Reset', exact: true}).click();
  await p.waitForTimeout(250);
  const rs = await stepOf(p);
  rec(`2 ${tag} playback Reset returns to Step 1`, !!rs && rs.n === 1, rs);
  rec(`2 ${tag} console errors`, errs.length === 0, errs.slice(0, 5));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();

  await stepRun(browser, 'desktop');
  await stepRun(browser, 'phone');

  // 3. Language switch SL -> EN -> SL
  {
    const {ctx, p, errs} = await open(browser, 'desktop', 'sl');
    await p.goto(BASE + '/compgeo/fortune', {waitUntil: 'load'});
    await p.locator('h1').first().waitFor();
    await p.waitForTimeout(400);
    await p.getByRole('button', {name: 'Naslednji korak', exact: true}).click();
    await p.getByRole('button', {name: 'Naslednji korak', exact: true}).click();
    await p.waitForTimeout(300);
    const slBefore = {h1: await p.locator('h1').first().textContent(), step: await stepOf(p), ro: (await readouts(p)).join(' | ').slice(0, 200)};
    await p.locator('select').first().selectOption({label: 'EN'});
    await p.waitForTimeout(400);
    const enAfter = {h1: await p.locator('h1').first().textContent(), step: await stepOf(p), ro: (await readouts(p)).join(' | ').slice(0, 200)};
    await p.screenshot({path: `${OUT}/24-smoke-lang-en.png`});
    await p.locator('select').first().selectOption({label: 'SL'});
    await p.waitForTimeout(400);
    const slAfter = {h1: await p.locator('h1').first().textContent(), step: await stepOf(p), ro: (await readouts(p)).join(' | ').slice(0, 200)};
    rec('3 language SL->EN->SL: title, controls, readouts switch; graph state kept', enAfter.h1 === "Fortune's algorithm" && slAfter.h1 === 'Fortunov algoritem' && !!enAfter.step && enAfter.step.n === 3 && !!slAfter.step && slAfter.step.n === 2 && enAfter.ro !== slBefore.ro && slAfter.ro === slBefore.ro, {slBefore, enAfter, slAfter});
    rec('3 language console errors', errs.length === 0, errs.slice(0, 5));
    await ctx.close();
  }

  // 4. Preset round trip (EN desktop)
  {
    const name = 'smoke-24-' + RUN;
    const {ctx, p, errs} = await open(browser, 'desktop', 'en');
    await p.goto(BASE + '/compgeo/fortune', {waitUntil: 'load'});
    await p.locator('h1').first().waitFor();
    await p.waitForTimeout(400);
    const origX = await p.getByLabel('Point 1: x').inputValue();
    for (let i = 0; i < 3; i++) await nextBtn(p).click();
    await tab(p, 'Save');
    await p.getByRole('button', {name: 'Save preset', exact: true}).click();
    await p.getByPlaceholder('my-curve-example').fill(name);
    await p.locator('button:text-is("Save")').last().click();
    await p.waitForTimeout(400);
    const opts = await p.locator('select[aria-label="Presets"]').evaluate(s => [...s.options].map(o => o.label));
    rec('4 preset saved and listed in Presets select', opts.includes(name), {opts});
    // change state: Edit tab, reset playback, move point 1 x, step twice
    await tab(p, 'Edit');
    await p.getByRole('button', {name: 'Reset', exact: true}).click();
    const x = p.getByLabel('Point 1: x');
    await x.fill(String(Number(origX) + 0.5));
    await x.press('Enter');
    await p.waitForTimeout(300);
    await nextBtn(p).click();
    await nextBtn(p).click();
    await p.waitForTimeout(200);
    const changed = {step: await stepOf(p), x: await p.getByLabel('Point 1: x').inputValue()};
    await p.reload({waitUntil: 'load'});
    await p.locator('h1').first().waitFor();
    await p.waitForTimeout(400);
    const afterReload = {step: await stepOf(p), x: await p.getByLabel('Point 1: x').inputValue()};
    await tab(p, 'Save');
    await p.locator('select[aria-label="Presets"]').selectOption({label: name});
    await p.waitForTimeout(500);
    await tab(p, 'Edit');
    const restored = {step: await stepOf(p), x: await p.getByLabel('Point 1: x').inputValue()};
    await p.screenshot({path: `${OUT}/24-smoke-preset-restored.png`});
    rec('4 preset round trip: restore returns step 3 and point 1 x', !!restored.step && restored.step.n === 3 && restored.x === origX, {origX, changed, afterReload, restored});
    await tab(p, 'Save');
    await p.getByRole('button', {name: 'Reset preset', exact: true}).click();
    await p.waitForTimeout(400);
    await tab(p, 'Edit');
    const rp = {step: await stepOf(p), x: await p.getByLabel('Point 1: x').inputValue()};
    rec('4 Reset preset returns to the default state (step 0, point 1 x default)', !!rp.step && rp.step.n === 0 && rp.x !== restored.x, {rp, restoredX: restored.x});
    await p.getByRole('button', {name: 'Reset view', exact: true}).click();
    rec('4 Reset view clickable without error', errs.length === 0, {note: 'click completed'});
    await tab(p, 'Save');
    await p.locator('select[aria-label="Presets"]').selectOption({label: name});
    await p.getByRole('button', {name: 'Delete preset', exact: true}).click();
    await p.waitForTimeout(400);
    const opts2 = await p.locator('select[aria-label="Presets"]').evaluate(s => [...s.options].map(o => o.label));
    rec('4 cleanup: temp preset deleted', !opts2.includes(name), {opts2});
    rec('4 console errors', errs.length === 0, errs.slice(0, 5));
    await ctx.close();
  }

  // 5. Catalog (SL, Računska geometrija family)
  {
    const {ctx, p, errs} = await open(browser, 'desktop', 'sl');
    await p.goto(BASE + '/demonstrations', {waitUntil: 'load'});
    await p.waitForTimeout(800);
    const cards = p.getByRole('link', {name: /Fortunov algoritem/});
    const cnt = await cards.count();
    const info = cnt ? await cards.first().evaluate(a => {
      let e = a;
      for (let i = 0; i < 10 && e; i++, e = e.parentElement) {
        const h = e.querySelector && e.querySelector('h2');
        if (h && !h.contains(a)) return {familyHeading: h.textContent.trim(), tag: e.tagName};
      }
      return null;
    }) : null;
    const href = cnt ? await cards.first().getAttribute('href') : null;
    rec('5 Fortune card on demonstrations page', cnt >= 1, {cnt, href, info});
    if (cnt) {
      const famOk = await p.getByRole('heading', {name: 'Računska geometrija'}).count();
      rec('5 Računska geometrija family heading present', famOk >= 1, {famOk});
      await cards.first().click();
      await p.waitForURL(/compgeo\/fortune/, {timeout: 10000}).catch(() => {});
      await p.locator('h1').first().waitFor({timeout: 10000}).catch(() => {});
      rec('5 card link opens /compgeo/fortune', /compgeo\/fortune/.test(p.url()), {url: p.url()});
    }
    rec('5 console errors', errs.length === 0, errs.slice(0, 5));
    await ctx.close();
  }

  // 6. visually-hidden regression
  for (const route of ['compgeo/monotone-partition', 'compgeo/segment-intersections']) {
    const {ctx, p, errs} = await open(browser, 'desktop', 'en');
    await p.goto(BASE + '/' + route, {waitUntil: 'load'});
    await p.locator('h1').first().waitFor();
    await p.waitForTimeout(800);
    const hid = await p.evaluate(() => [...document.querySelectorAll('.visually-hidden')].map(e => {
      const r = e.getBoundingClientRect();
      return {tag: e.tagName, role: e.getAttribute('role'), text: e.textContent.trim().slice(0, 50), w: +r.width.toFixed(2), h: +r.height.toFixed(2), ariaHiddenAncestor: e.closest('[aria-hidden="true"]') !== null, display: getComputedStyle(e).display};
    }));
    const aria = await p.locator('body').ariaSnapshot();
    const withText = hid.filter(h => h.text.length > 0);
    const inTree = withText.map(h => ({text: h.text.slice(0, 30), inAria: aria.includes(h.text.slice(0, 20))}));
    const clipped = hid.length > 0 && hid.every(h => h.w <= 1.5 && h.h <= 1.5);
    rec(`6 ${route} .visually-hidden elements clipped to 1px box`, clipped, {count: hid.length, boxes: hid.slice(0, 6)});
    rec(`6 ${route} .visually-hidden text still in accessibility tree`, inTree.length > 0 && inTree.every(t => t.inAria) && hid.every(h => !h.ariaHiddenAncestor), {inTree: inTree.slice(0, 8)});
    const visText = await p.locator('main').first().innerText().catch(() => '');
    const slug = route.replace('/', '-');
    fs.writeFileSync(`${OUT}/24-smoke-${slug}-visible.txt`, visText);
    await p.screenshot({path: `${OUT}/24-smoke-${slug}.png`});
    rec(`6 ${route} visible readouts/controls still rendered`, visText.length > 0, {len: visText.length, sample: visText.replace(/\s+/g, ' ').slice(0, 300), stepCounter: (visText.match(/Step \d+ of \d+/) || [null])[0]});
    rec(`6 ${route} console errors`, errs.length === 0, errs.slice(0, 5));
    await ctx.close();
  }

  await browser.close();
  fs.writeFileSync(`${OUT}/24-smoke-results.json`, JSON.stringify(results, null, 2));
  console.log('SUMMARY total=' + results.length + ' fail=' + results.filter(r => !r.pass).length);
})().catch(e => {
  console.log('FATAL ' + e.stack.slice(0, 800));
  process.exit(1);
});
