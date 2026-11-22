// Jank / flicker / layout probe for the UX-picks prototype. See night/CHECKLIST.md for thresholds.
// Run from the worktree:  node <this file> <route> [--lesson] [--ux list|none] [--size 1440x900|1024x768|both] [--throttle 1|4] [--out dir]
//        node <this file> --selftest
const fs = require('fs');
const path = require('path');
const NIGHT = 'C:/Users/1337Hacker/Desktop/bezeg-ux-picks/night';
const BASE = 'http://127.0.0.1:4460/bezeg-2.0/';
const DEFAULT_UX = 'a1,a19,a3,a29,boardText,dockTools,b1,toolsCard,viewDirector';

// ---------- pure helpers (also used by --selftest) ----------
const stats = a => {
  const s = [...a].sort((x, y) => x - y);
  const r = v => +(v || 0).toFixed(1);
  return {n: s.length, median: r(s[s.length >> 1]), p95: r(s[Math.floor(s.length * 0.95)]), max: r(s[s.length - 1]),
    gt33: s.filter(v => v > 33.4).length, gt50: s.filter(v => v > 50).length};
};

/** series: [{t, v, x}] sorted by t (ms). Flicker = A,B,A within `win` ms while x (pointer) was monotone. */
function detectFlicker(key, series, win = 150) {
  const events = [];
  for (let i = 0; i < series.length; i++) {
    let j = -1;
    for (let q = i + 1; q < series.length && series[q].t - series[i].t <= win; q++) {
      if (series[q].v !== series[i].v) { j = q; break; }
    }
    if (j < 0) continue;
    for (let k = j + 1; k < series.length && series[k].t - series[i].t <= win; k++) {
      if (series[k].v !== series[i].v) continue;
      const xs = series.slice(i, k + 1).map(s => s.x);
      let up = true, down = true;
      for (let q = 1; q < xs.length; q++) { if (xs[q] < xs[q - 1]) up = false; if (xs[q] > xs[q - 1]) down = false; }
      if (up || down) {
        events.push({key, t: Math.round(series[i].t), dt: Math.round(series[k].t - series[i].t), texts: [series[i].v, series[j].v, series[k].v]});
        i = k - 1;
      }
      break;
    }
  }
  return events;
}

/** Stationary pointer: any change of a series later than `after` ms past its first sample is a flicker. */
function detectLateChange(key, series, after = 200) {
  const events = [];
  if (!series.length) return events;
  const t0 = series[0].t;
  for (let i = 1; i < series.length; i++) {
    if (series[i].t - t0 > after && series[i].v !== series[i - 1].v) {
      events.push({key, t: Math.round(series[i].t - t0), texts: [series[i - 1].v, series[i].v]});
    }
  }
  return events;
}

/** samples: [{t, b:[x1,y1,x2,y2]}], samples[0] = before the action. */
function classifyMotion(samples, tol = 0.002) {
  const w = Math.abs(samples[0].b[2] - samples[0].b[0]) || 1;
  const d = [];
  for (let i = 1; i < samples.length; i++) d.push(Math.max(...samples[i].b.map((v, c) => Math.abs(v - samples[i - 1].b[c]))) / w);
  const changed = d.map(x => x > tol);
  const distinct = new Set(samples.map(s => s.b.map(v => v.toFixed(2)).join(','))).size;
  const segs = [];
  let gap = 99;
  for (let i = 0; i < d.length; i++) {
    if (changed[i]) {
      if (gap >= 2 || !segs.length) segs.push({from: i, to: i, max: d[i]});
      else { const s = segs[segs.length - 1]; s.to = i; s.max = Math.max(s.max, d[i]); }
      gap = 0;
    } else gap++;
  }
  const jump = segs.some(s => s.from === s.to && s.max > 0.15);
  const lastChanged = changed.lastIndexOf(true);
  return {distinct, still: !changed.some(Boolean), jump, glides: segs.length,
    settleMs: lastChanged < 0 ? 0 : Math.round(samples[lastChanged + 1].t - samples[0].t), lastT: lastChanged < 0 ? 0 : samples[lastChanged + 1].t, maxStep: +Math.max(0, ...d).toFixed(3)};
}

function selftest() {
  const ok = [];
  const mk = (vals, x) => vals.map((v, i) => ({t: i * 30, v, x: x ? x[i] : i * 5}));
  const ev1 = detectFlicker('fake', mk(['1.0', '1.0', '1.5', '1.0', '1.0']));
  ok.push(['flicker A,B,A monotone fires', ev1.length === 1 && ev1[0].texts.join() === '1.0,1.5,1.0']);
  ok.push(['flicker A,B,C does not fire', detectFlicker('fake', mk(['1.0', '1.5', '2.0'])).length === 0]);
  ok.push(['flicker A,B,A with pointer turnaround does not fire', detectFlicker('fake', mk(['1', '2', '1'], [0, 10, 5])).length === 0]);
  ok.push(['flicker A,B,A slower than 150 ms does not fire', detectFlicker('fake', [{t: 0, v: 'a', x: 0}, {t: 100, v: 'b', x: 1}, {t: 200, v: 'a', x: 2}]).length === 0]);
  ok.push(['ghost toggle on,off,on fires', detectFlicker('ghost', mk([1, 0, 1])).length === 1]);
  ok.push(['stationary late change fires', detectLateChange('fake', [{t: 0, v: 'a'}, {t: 100, v: 'b'}, {t: 300, v: 'c'}]).length === 1]);
  const S = (rows) => rows.map((b, i) => ({t: i * 50, b}));
  const still = classifyMotion(S([[0, 1, 10, 0], [0, 1, 10, 0], [0, 1, 10, 0]]));
  ok.push(['classify still', still.still && still.glides === 0 && !still.jump]);
  const jumpS = classifyMotion(S([[0, 1, 10, 0], [0, 1, 10, 0], [5, 1, 15, 0], [5, 1, 15, 0], [5, 1, 15, 0]]));
  ok.push(['classify jump (one sample, 50 percent)', jumpS.jump && jumpS.glides === 1]);
  const glide = classifyMotion(S([[0, 1, 10, 0], [0.4, 1, 10.4, 0], [1, 1, 11, 0], [1.6, 1, 11.6, 0], [1.9, 1, 11.9, 0], [2, 1, 12, 0], [2, 1, 12, 0], [2, 1, 12, 0]]));
  ok.push(['classify glide (one segment, no jump)', !glide.jump && glide.glides === 1 && glide.settleMs === 250]);
  const dbl = classifyMotion(S([[0, 1, 10, 0], [1, 1, 11, 0], [2, 1, 12, 0], [2, 1, 12, 0], [2, 1, 12, 0], [3, 1, 13, 0], [4, 1, 14, 0], [4, 1, 14, 0]]));
  ok.push(['classify double motion (2 segments)', dbl.glides === 2 && !dbl.jump]);
  for (const [n, r] of ok) console.log((r ? 'PASS ' : 'FAIL ') + n);
  console.log(ok.every(x => x[1]) ? 'SELFTEST OK' : 'SELFTEST FAILED');
  process.exit(ok.every(x => x[1]) ? 0 : 1);
}

// ---------- args ----------
const argv = process.argv.slice(2);
if (argv.includes('--selftest')) selftest();
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };
const route = argv.find((a, i) => !a.startsWith('--') && !['--ux', '--size', '--throttle', '--out'].includes(argv[i - 1]));
if (!route) { console.log('usage: probe.cjs <route> [--lesson] [--ux list|none] [--size 1440x900|1024x768|both] [--throttle 1|4] [--out dir]'); process.exit(2); }
const lesson = argv.includes('--lesson');
const ux = opt('ux', DEFAULT_UX);
const sizeArg = opt('size', '1440x900');
const sizes = sizeArg === 'both' ? ['1440x900', '1024x768'] : [sizeArg];
const THR = +opt('throttle', '1');
const OUT = opt('out', NIGHT + '/out');
const slug = route.replace(/\//g, '_') + (lesson ? '-lesson' : '');
fs.mkdirSync(OUT, {recursive: true});

const {chromium} = require(process.cwd() + '/node_modules/playwright');

// ---------- in-page code ----------
const INIT = () => {
  window.__m = {on: false, f: [], lt: [], cls: 0, start() { this.f = []; this.lt = []; this.cls = 0; this.on = true; }, stop() { this.on = false; return {f: this.f, lt: this.lt, cls: this.cls}; }};
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (window.__m.on) window.__m.lt.push(e.duration); }).observe({entryTypes: ['longtask']}); } catch (e) { /* none */ }
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (window.__m.on && !e.hadRecentInput) window.__m.cls += e.value; }).observe({type: 'layout-shift'}); } catch (e) { /* none */ }
  let last = performance.now();
  const loop = t => { if (window.__m.on) window.__m.f.push(t - last); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};
const SAMPLER_START = ms => {
  const txt = s => (document.querySelector(s)?.textContent || '').trim();
  const S = {rows: [], px: 0};
  S.mv = e => { S.px = e.clientX; };
  addEventListener('pointermove', S.mv, true);
  S.id = setInterval(() => S.rows.push({
    t: performance.now(), px: S.px,
    ghost: document.querySelector('.ux-scrub-ghost svg') ? 1 : 0,
    fan: document.querySelector('.ux-hover-fan') ? 1 : 0,
    hc: txt('.ux-hover-card'), tape: txt('.ux-tape-readout'),
    pucks: [...document.querySelectorAll('.ux-puck[data-param]')].map(e => [e.dataset.param, (e.querySelector('.ux-puck-value')?.textContent || '').trim(), e.getBoundingClientRect().width]),
    rc: [...document.querySelectorAll('.ux-rc-row[data-readout]')].map(e => [e.dataset.readout, e.textContent.trim()]),
  }), ms);
  window.__samp = S;
};
const SAMPLER_STOP = () => { const S = window.__samp; if (!S) return []; clearInterval(S.id); removeEventListener('pointermove', S.mv, true); window.__samp = null; return S.rows; };
const BOX_START = ms => {
  const get = () => {
    const bs = Object.values(window.JXG?.boards || {}).filter(b => b.containerObj?.isConnected);
    bs.sort((a, b) => b.containerObj.clientWidth * b.containerObj.clientHeight - a.containerObj.clientWidth * a.containerObj.clientHeight);
    return bs[0] ? bs[0].getBoundingBox() : null;
  };
  window.__bx = {rows: [], get};
  window.__bx.rows.push({t: performance.now(), b: get()});
  window.__bx.id = setInterval(() => window.__bx.rows.push({t: performance.now(), b: get()}), ms);
};
const BOX_STOP = () => { clearInterval(window.__bx.id); return window.__bx.rows; };
const BOX_NOW = () => {
  const bs = Object.values(window.JXG?.boards || {}).filter(b => b.containerObj?.isConnected);
  bs.sort((a, b) => b.containerObj.clientWidth * b.containerObj.clientHeight - a.containerObj.clientWidth * a.containerObj.clientHeight);
  return bs[0] ? bs[0].getBoundingBox() : null;
};
const COVER = () => {
  const bs = Object.values(window.JXG?.boards || {}).filter(b => b.containerObj?.isConnected);
  bs.sort((a, b) => b.containerObj.clientWidth * b.containerObj.clientHeight - a.containerObj.clientWidth * a.containerObj.clientHeight);
  const el = bs[0]?.containerObj || document.querySelector('.ux-board-frame');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cards = [...document.querySelectorAll('.ux-btext,.ux-pucks,.ux-pucks-toggle,.guided-lesson,.ux-dock-tray')]
    .map(c => c.getBoundingClientRect()).filter(c => c.width > 2 && c.height > 2);
  let cov = 0, n = 0;
  for (let i = 0; i < 48; i++) for (let j = 0; j < 36; j++) {
    const x = r.left + r.width * (i + 0.5) / 48, y = r.top + r.height * (j + 0.5) / 36; n++;
    if (cards.some(c => x >= c.left && x <= c.right && y >= c.top && y <= c.bottom)) cov++;
  }
  return {boardPx: [Math.round(r.width), Math.round(r.height)], coverPct: +(100 * cov / n).toFixed(1)};
};

// ---------- run ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function openRoute(p) {
  const q = ux === 'none' ? '' : '?ux=' + ux;
  await p.goto(BASE + 'demonstrations' + q);
  await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('ux-')) localStorage.removeItem(k); localStorage.setItem('ux-hint-cards', '1'); });
  const href = '/bezeg-2.0/' + route + (lesson ? '?learn=1' : '');
  const link = p.locator(`a[href="${href}"]`).first();
  await p.waitForTimeout(1500);
  if (await link.count()) await link.click();
  else await p.goto(BASE + route + (lesson ? '?learn=1' : '') + (ux === 'none' ? '' : (lesson ? '&' : '?') + 'ux=' + ux));
  await p.waitForTimeout(4200);
}

async function runSize(br, size) {
  const [w, h] = size.split('x').map(Number);
  const ctx = await br.newContext({viewport: {width: w, height: h}});
  await ctx.addInitScript(INIT);
  if (argv.includes('--legacy')) await ctx.addInitScript(() => { window.__legacy = true; });
  const p = await ctx.newPage();
  const R = {size, pageErrors: [], consoleErrors: [], scenarios: {}, viewMotions: [], cover: {}, shots: []};
  p.on('pageerror', e => { if (!/Unexpected token '<'/.test(e.message)) R.pageErrors.push(e.message.slice(0, 200)); });
  p.on('console', m => { if (m.type() === 'error' && !/Unexpected token '<'/.test(m.text())) R.consoleErrors.push(m.text().slice(0, 200)); });
  p.on('response', r => { if (r.status() >= 400) R.consoleErrors.push('HTTP ' + r.status() + ' ' + r.url().slice(0, 120)); });
  const shot = async name => { const f = `${slug}-${size}-${name}.png`; try { await p.screenshot({path: path.join(OUT, f)}); R.shots.push(f); } catch (e) { /* ignore */ } };
  await openRoute(p);
  if (THR > 1) { const c = await ctx.newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', {rate: THR}); }
  const toBoard = () => p.evaluate(() => document.querySelector('.ux-board-frame, .workspace-graph')?.scrollIntoView({block: 'center'}));
  await toBoard();
  await p.waitForTimeout(300);
  const firstVisitBox = await p.evaluate(BOX_NOW);

  const measure = async act => {
    await p.evaluate(() => window.__m.start());
    let out;
    try { out = await act(); } catch (e) { await p.evaluate(() => window.__m.stop()); throw e; }
    const m = await p.evaluate(() => window.__m.stop());
    if (out && out.skipped) return out;
    return {...(out || {}), frame: stats(m.f), longTasks: {n: m.lt.length, max: Math.round(Math.max(0, ...m.lt)), sum: Math.round(m.lt.reduce((a, b) => a + b, 0)), over50: m.lt.filter(v => v > 50).length}, cls: +m.cls.toFixed(4)};
  };
  const scen = async (name, fn) => {
    const t = Date.now();
    let r;
    try { r = await fn(); } catch (e) { r = {error: String(e).slice(0, 240)}; }
    r = r || {}; r.ms = Date.now() - t; R.scenarios[name] = r;
  };
  const box = async sel => {
    const loc = p.locator(sel).first();
    if (!(await loc.count())) return null;
    await loc.scrollIntoViewIfNeeded({timeout: 2000}).catch(() => {});
    const b = await loc.boundingBox();
    if (!b || b.y < 0 || b.y + b.height > h || b.x < 0 || b.x + b.width > w) return b && b.width > 0 ? {...b, off: true} : null;
    return b;
  };
  const drag = async (b, amp) => {
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    await p.mouse.move(cx, cy); await p.mouse.down();
    for (let i = 0; i < 60; i++) { await p.mouse.move(cx + Math.sin(i / 9) * amp, cy); await p.waitForTimeout(16); }
    await p.mouse.up();
  };
  const sampleRun = async act => {
    await p.evaluate(SAMPLER_START, 30);
    try { await act(); } finally { R._rows = await p.evaluate(SAMPLER_STOP); }
    return R._rows;
  };
  const seriesOf = rows => {
    const S = {};
    const add = (k, r, v) => { (S[k] = S[k] || []).push({t: r.t, v, x: r.px}); };
    for (const r of rows) {
      add('ghost', r, r.ghost); add('fan', r, r.fan); add('hoverCard', r, r.hc); add('tape', r, r.tape);
      for (const [k, v] of r.pucks) add('puck:' + k, r, v);
      for (const [k, v] of r.rc) add('readout:' + k, r, v);
    }
    return S;
  };
  const widthDrift = rows => {
    const W = {};
    for (const r of rows) for (const [k, , wd] of r.pucks) { (W[k] = W[k] || []).push(wd); }
    const o = {};
    for (const k of Object.keys(W)) o[k] = +(Math.max(...W[k]) - Math.min(...W[k])).toFixed(2);
    return o;
  };

  await shot('load');

  await scen('sliderDrag', async () => {
    const sel = '[data-param] input[type=range], .slider-field input[type=range]';
    const loc = p.locator(sel);
    let idx = -1;
    for (let i = 0; i < await loc.count(); i++) if (await loc.nth(i).isVisible()) { idx = i; break; }
    if (idx < 0) return {skipped: 'no visible tools slider'};
    await loc.nth(idx).scrollIntoViewIfNeeded().catch(() => {});
    const b = await loc.nth(idx).boundingBox();
    if (!b) return {skipped: 'no slider box'};
    return measure(async () => { await drag({x: b.x + b.width * 0.5 - 1, y: b.y, width: 2, height: b.height}, Math.min(60, b.width / 3)); });
  });

  await scen('puckDrag', async () => {
    const b = await box('.ux-puck[role=slider]');
    if (!b) return {skipped: 'no pucks'};
    if (b.off) return {skipped: 'puck offscreen at this size'};
    let rows;
    const r = await measure(async () => { rows = await sampleRun(() => drag(b, 60)); });
    r.widthDrift = widthDrift(rows);
    return r;
  });
  await shot('after-puck-drag');

  await scen('countStep', async () => {
    const b = await box('.ux-count-puck');
    if (!b) return {skipped: 'no count puck'};
    if (b.off) return {skipped: 'count puck offscreen'};
    const steps = p.locator('.ux-count-puck').first().locator('.ux-count-step');
    if ((await steps.count()) < 2) return {skipped: 'no count step buttons'};
    return measure(async () => {
      for (let i = 0; i < 4; i++) {
        for (const n of [0, 1]) { await steps.nth(n).click({force: true, timeout: 1500}).catch(() => {}); await p.waitForTimeout(150); }
      }
    });
  });

  await scen('sweep', async () => {
    const osc = p.locator('.ux-puck-osc').first();
    if (!(await osc.count()) || !(await osc.isVisible().catch(() => false))) return {skipped: 'no sweepable puck (no visible sweep button)'};
    await osc.scrollIntoViewIfNeeded().catch(() => {});
    let rows;
    const r = await measure(async () => {
      rows = await sampleRun(async () => { await osc.click({force: true, timeout: 2000}); await p.waitForTimeout(3000); await osc.click({force: true, timeout: 2000}); });
    });
    r.widthDrift = widthDrift(rows);
    return r;
  });

  // "Interrupt what moves" (owner, 2026-11-22): input on a parameter while its ∿ runs must win. Grab the slider puck and hold
  // still: the value must not move while held or after release, and ∿ must show unpressed. Then the same for a count's step.
  await scen('sweepInterrupt', async () => {
    const out = {};
    const wrap = p.locator('.ux-puck-wrap').filter({has: p.locator('.ux-puck[role=slider]')}).first();
    if (!(await wrap.count())) return {skipped: 'no slider puck'};
    await wrap.scrollIntoViewIfNeeded().catch(() => {});
    const val = async w => ((await w.locator('.ux-puck-value').first().textContent().catch(() => '')) || '').trim();
    const samples = async (w, n) => { const v = []; for (let i = 0; i < n; i++) { v.push(await val(w)); await p.waitForTimeout(150); } return v; };
    const b = await wrap.locator('.ux-puck[role=slider]').first().boundingBox();
    if (!b || b.y + b.height > h) return {skipped: 'slider puck offscreen'};
    await wrap.hover().catch(() => {});
    const osc = wrap.locator('.ux-puck-osc');
    if (!(await osc.count())) return {skipped: 'no sweep button on the slider puck'};
    await osc.click({force: true, timeout: 2000});
    await p.waitForTimeout(1500);
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    await p.mouse.move(cx, cy); await p.mouse.down();
    await p.mouse.move(cx + 40, cy, {steps: 5});
    await p.waitForTimeout(200);
    const held = await samples(wrap, 6);
    await p.mouse.up();
    const after = await samples(wrap, 6);
    out.slider = {held: held.join(' '), after: after.join(' '), movedWhileHeld: new Set(held).size > 1, movedAfterRelease: new Set(after).size > 1,
      stillPressed: (await wrap.locator('.ux-puck-osc[aria-pressed="true"]').count()) > 0};
    const cwrap = p.locator('.ux-puck-wrap').filter({has: p.locator('.ux-count-puck')}).first();
    if (await cwrap.count()) {
      await cwrap.hover().catch(() => {});
      const cosc = cwrap.locator('.ux-puck-osc');
      const steps = cwrap.locator('.ux-count-step');
      if ((await cosc.count()) && (await steps.count()) >= 2) {
        await cosc.click({force: true, timeout: 2000});
        await p.waitForTimeout(1600);
        await steps.nth(1).click({force: true, timeout: 1500}).catch(() => {});
        await p.waitForTimeout(200);
        const cvals = [];
        for (let i = 0; i < 5; i++) { cvals.push(((await cwrap.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim()); await p.waitForTimeout(400); }
        out.count = {after: cvals.join(' | '), movedAfterStep: new Set(cvals).size > 1, stillPressed: (await cwrap.locator('.ux-puck-osc[aria-pressed="true"]').count()) > 0};
      }
    }
    await p.keyboard.press('Escape');
    return out;
  });

  await scen('cardDrag', async () => {
    const head = p.locator('.ux-btext-head:visible').first();
    if (!(await head.count())) return {skipped: 'no dock cards'};
    const title = head.locator('.ux-btext-title').first();
    const b = (await title.count()) ? await title.boundingBox() : await head.boundingBox();
    if (!b) return {skipped: 'no head box'};
    const dx = b.x + b.width / 2 > w / 2 ? -200 : 200;
    const r = await measure(async () => {
      const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      await p.mouse.move(cx, cy); await p.mouse.down();
      for (let i = 1; i <= 20; i++) { await p.mouse.move(cx + dx * i / 20, cy - 40 * i / 20); await p.waitForTimeout(16); }
      await p.mouse.up(); await p.waitForTimeout(400);
    });
    await shot('after-card-drag');
    r.fold = await measure(async () => {
      const t = p.locator('.ux-btext-toggle:not(.ux-btext-reset):visible').first();
      if (!(await t.count())) return {skipped: 'no fold toggle'};
      for (let i = 0; i < 4; i++) { await t.click({force: true, timeout: 1500}).catch(() => {}); await p.waitForTimeout(650); }
    });
    return r;
  });

  const hoverSweep = async (b, y, legs = 40) => {
    const x0 = b.x + 3, x1 = b.x + b.width - 3;
    await p.mouse.move(x0, y); await p.waitForTimeout(150);
    for (let i = 0; i <= legs; i++) { await p.mouse.move(x0 + (x1 - x0) * i / legs, y); await p.waitForTimeout(25); }
    for (let i = legs; i >= 0; i--) { await p.mouse.move(x0 + (x1 - x0) * i / legs, y); await p.waitForTimeout(25); }
    await p.waitForTimeout(200);
  };
  const flickerReport = rows => {
    const S = seriesOf(rows), events = [];
    const t0 = rows[0]?.t || 0;
    for (const k of Object.keys(S)) for (const e of detectFlicker(k, S[k].map(s => ({...s, t: s.t - t0})))) events.push(e);
    return {samples: rows.length, flickerEvents: events.slice(0, 20), flickerCount: events.length, widthDrift: widthDrift(rows)};
  };

  await scen('puckHover', async () => {
    const b = await box('.ux-puck[role=slider]');
    if (!b) return {skipped: 'no pucks'};
    if (b.off) return {skipped: 'puck offscreen'};
    let rows;
    const r = await measure(async () => { rows = await sampleRun(() => hoverSweep(b, b.y + b.height - 3)); });
    return {...r, ...flickerReport(rows)};
  });

  await scen('toolsSliderHover', async () => {
    const loc = p.locator('[data-param] input[type=range], .slider-field input[type=range]');
    let idx = -1;
    for (let i = 0; i < await loc.count(); i++) if (await loc.nth(i).isVisible()) { idx = i; break; }
    if (idx < 0) return {skipped: 'no visible tools slider'};
    await loc.nth(idx).scrollIntoViewIfNeeded().catch(() => {});
    const b = await loc.nth(idx).boundingBox();
    if (!b) return {skipped: 'no slider box'};
    let rows;
    const r = await measure(async () => { rows = await sampleRun(() => hoverSweep(b, b.y + b.height / 2)); });
    return {...r, ...flickerReport(rows)};
  });

  await scen('countHoverStationary', async () => {
    let plus = p.locator('.ux-count-step[aria-label^="Povečaj"]').first();
    if (!(await plus.count())) plus = p.locator('.count-setter-button').last();
    if (!(await plus.count())) return {skipped: 'no count +'};
    await plus.scrollIntoViewIfNeeded().catch(() => {});
    const b = await plus.boundingBox();
    if (!b) return {skipped: 'no + box'};
    await p.mouse.move(5, 5); await p.waitForTimeout(300);
    let rows;
    const r = await measure(async () => {
      rows = await sampleRun(async () => { await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(1000); });
    });
    const S = seriesOf(rows), events = [];
    const t0 = rows[0]?.t || 0;
    for (const k of Object.keys(S)) {
      // a stationary window starts when the pointer landed: the first sample
      for (const e of detectLateChange(k, S[k].map(s => ({...s, t: s.t - t0})))) events.push(e);
    }
    return {...r, samples: rows.length, flickerEvents: events.slice(0, 20), flickerCount: events.length};
  });

  // ---------- view motions ----------
  const motion = async (label, act) => {
    try { return await motion0(label, act); } catch (e) { return {label, skipped: 'error: ' + String(e).slice(0, 100)}; }
  };
  const motion0 = async (label, act) => {
    const before = await p.evaluate(BOX_NOW);
    if (!before) return {label, skipped: 'no JXG board'};
    await p.evaluate(BOX_START, 50);
    await act();
    const tAct = await p.evaluate(() => performance.now());
    await p.waitForTimeout(1600);
    const rows = (await p.evaluate(BOX_STOP)).filter(r => r.b);
    const m = classifyMotion(rows.map(r => ({t: r.t, b: r.b})));
    if (m.lastT) m.settleMs = Math.max(0, Math.round(m.lastT - tAct)); delete m.lastT;
    return {label, ...m, box: rows.length ? rows[rows.length - 1].b.map(v => +v.toFixed(2)) : null, from: rows.length ? rows[0].b.map(v => +v.toFixed(2)) : null};
  };

  if (!lesson) {
    await scen('viewOnLoadAndPuckRelease', async () => {
      const a = await motion('idle-1.6s', async () => {});
      const b = await box('.ux-puck[role=slider]');
      if (!b || b.off) return {idle: a, afterPuckRelease: {skipped: 'no usable puck'}};
      const c = await motion('after-puck-release', async () => { await drag(b, 40); });
      return {idle: a, afterPuckRelease: c};
    });
    R.cover.load = await p.evaluate(COVER).catch(() => null);
  }

  if (lesson) {
    await scen('lessonWalk', async () => {
      await toBoard();
      const first = firstVisitBox;
      const nextSel = '.guided-lesson-nav-next', backSel = '.guided-lesson-nav-back';
      R.cover.step0 = await p.evaluate(COVER).catch(() => null);
      let step = 0;
      // Settled box per step index on the way forward (step 0 = before the first Next): Back must return to it (handler 9 fix:
      // the old measure compared with the box just before the Back click, i.e. the later step's own view).
      const settled = {0: await p.evaluate(BOX_NOW)};
      const doStep = async (kind, sel) => {
        const btn = p.locator(sel).first();
        if (!(await btn.count()) || !(await btn.isEnabled().catch(() => false))) return false;
        const before = await p.evaluate(BOX_NOW);
        const m = await motion(kind, async () => { await btn.click({timeout: 2000}); });
        m.step = kind === 'next' ? ++step : --step;
        if (kind === 'next' && m.box) settled[m.step] = m.box;
        const target = kind === 'back' ? settled[m.step] : undefined;
        if (kind === 'back' && target && m.box) m.backReturnPct = +(100 * Math.max(...m.box.map((v, c) => Math.abs(v - target[c]))) / (Math.abs(target[2] - target[0]) || 1)).toFixed(2);
        R.viewMotions.push(m);
        R.cover['step' + m.step + (kind === 'back' ? 'b' : '')] = await p.evaluate(COVER).catch(() => null);
        if (kind === 'next' && R.shots.length < 24 && size === '1440x900') await shot('step' + String(m.step).padStart(2, '0'));
        return true;
      };
      for (let i = 0; i < 24; i++) if (!(await doStep('next', nextSel))) break;
      for (let i = 0; i < 3; i++) if (!(await doStep('back', backSel))) break;
      const endBox = await p.evaluate(BOX_NOW);
      await openRoute(p);
      await toBoard();
      const reloaded = await p.evaluate(BOX_NOW);
      const rel = (a, b) => a && b ? +(100 * Math.max(...a.map((v, c) => Math.abs(v - b[c]))) / (Math.abs(b[2] - b[0]) || 1)).toFixed(2) : null;
      return {steps: step, firstBox: first && first.map(v => +v.toFixed(2)), endBox: endBox && endBox.map(v => +v.toFixed(2)), reloadedBox: reloaded && reloaded.map(v => +v.toFixed(2)), reloadDriftPct: rel(reloaded, first)};
    });
  }

  R.cover.final = await p.evaluate(COVER).catch(() => null);
  R.mustPoints = 'not exposed'; // director.setMarks stores s.marks privately; director.state() does not return them
  delete R._rows;
  await ctx.close();
  return R;
}

// ---------- verdict ----------
function verdict(R) {
  const F = [];
  const add = (metric, value, threshold, where) => F.push({size: R.size, metric: where ? `${where}:${metric}` : metric, value, threshold});
  if (R.pageErrors.length) add('pageErrors', R.pageErrors.length, 0);
  if (R.consoleErrors.length) add('consoleErrors', R.consoleErrors.length, 0);
  const p95Max = THR > 1 ? 40 : 20, maxMax = THR > 1 ? 100 : 50;
  const chk = (name, r) => {
    if (!r || r.skipped || r.error || !r.frame) { if (r && r.error) add('error', r.error, 'none', name); return; }
    if (r.frame.p95 > p95Max) add('frame.p95', r.frame.p95, p95Max, name);
    if (r.frame.max > maxMax) add('frame.max', r.frame.max, maxMax, name);
    if (THR === 1 && r.longTasks.over50 > 0) add('longTasks>50ms', r.longTasks.over50, 0, name);
    if (r.cls > 0.02) add('cls', r.cls, 0.02, name);
    if (r.flickerCount > 0) add('flickerEvents', r.flickerCount, 0, name);
    if (r.widthDrift) for (const [k, v] of Object.entries(r.widthDrift)) if (v > 1) add('puckWidthDrift:' + k, v, 1, name);
  };
  for (const [name, r] of Object.entries(R.scenarios)) {
    chk(name, r);
    if (r.fold) chk(name + '.fold', r.fold);
    for (const k of ['idle', 'afterPuckRelease']) if (r[k] && !r[k].skipped) pushMotion(r[k], name + '.' + k);
  }
  function pushMotion(m, where) {
    if (m.jump) add('jump', true, false, where);
    if (m.glides > 1) add('glides', m.glides, 1, where);
    if (m.settleMs > 900) add('settleMs', m.settleMs, 900, where);
  }
  for (const m of R.viewMotions) {
    if (m.skipped) continue;
    const where = `${m.label}${m.step}`;
    pushMotion(m, where);
    if (m.backReturnPct > 2) add('backReturnPct', m.backReturnPct, 2, where);
  }
  const si = R.scenarios.sweepInterrupt;
  if (si && !si.skipped && !si.error) {
    for (const part of ['slider', 'count']) {
      const r = si[part];
      if (!r) continue;
      for (const k of ['movedWhileHeld', 'movedAfterRelease', 'movedAfterStep', 'stillPressed']) if (r[k]) add(k, true, false, 'sweepInterrupt.' + part);
    }
  }
  const w = R.scenarios.lessonWalk;
  if (w && w.reloadDriftPct > 2) add('reloadDriftPct', w.reloadDriftPct, 2, 'lessonWalk');
  for (const [k, c] of Object.entries(R.cover)) if (c && c.coverPct > 35) add('coverPct', c.coverPct, 35, k);
  return F;
}

(async () => {
  const br = await chromium.launch();
  const result = {route, lesson, ux, throttle: THR, started: new Date().toISOString(), sizes: {}, verdict: []};
  for (const size of sizes) {
    const t = Date.now();
    try { result.sizes[size] = await runSize(br, size); } catch (e) { result.sizes[size] = {size, fatal: String(e).slice(0, 300), scenarios: {}, viewMotions: [], cover: {}, pageErrors: [], consoleErrors: []}; }
    result.sizes[size].runtimeS = +((Date.now() - t) / 1000).toFixed(1);
    result.verdict.push(...verdict(result.sizes[size]));
    if (result.sizes[size].fatal) result.verdict.push({size, metric: 'fatal', value: result.sizes[size].fatal, threshold: 'none'});
  }
  await br.close();
  fs.writeFileSync(path.join(OUT, slug + '.json'), JSON.stringify(result, null, 1));
  const lines = [`${slug} ux=${ux === DEFAULT_UX ? 'all' : ux} throttle=${THR} -> ${path.join(OUT, slug + '.json')}`];
  for (const size of sizes) {
    const R = result.sizes[size];
    const sk = Object.entries(R.scenarios).filter(([, r]) => r.skipped).map(([k, r]) => k + ':' + r.skipped);
    lines.push(`${size}: ${R.runtimeS}s, scenarios ${Object.keys(R.scenarios).length}, skipped [${sk.join('; ')}], steps ${R.viewMotions.filter(m => m.label === 'next').length}, pageErrors ${R.pageErrors.length}`);
  }
  const fails = result.verdict;
  lines.push(`FAILS: ${fails.length}` + (fails.length ? ' (size metric value>threshold)' : ''));
  for (const f of fails.slice(0, 9)) lines.push(`  ${f.size} ${f.metric} ${typeof f.value === 'string' ? f.value.slice(0, 60) : f.value} > ${f.threshold}`);
  if (fails.length > 9) lines.push(`  ... ${fails.length - 9} more in JSON verdict[]`);
  console.log(lines.slice(0, 15).join('\n'));
})();
