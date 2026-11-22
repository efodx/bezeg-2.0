// Interaction-smoothness probe. Usage (from the repository root, against a built preview):
//   node scripts/probe/probe.cjs --base http://127.0.0.1:4471/bezeg-2.0/ [--route analysis/taylor]...
//        [--viewport 1440x900] [--throttle 4] [--json out.json]
// Routes: a plain path, or `<path>?lesson` to open the lesson and step Next/Back. Exit 1 when a threshold fails.
// A metric whose subject is absent (cards, puck widths) reports n/a; it switches on once the element exists.
const fs = require('fs');
const path = require('path');
const thresholds = require('./thresholds.cjs');

const DEFAULT_ROUTES = ['analysis/taylor', 'functions/transformations', 'bezier/decasteljau', 'analysis/phase-portrait', 'analysis/taylor?lesson'];
const CARD_SELECTOR = '.ux-btext,.ux-pucks,.ux-pucks-toggle,.ux-dock-tray';

// ---------- pure helpers ----------
const stats = a => {
  const s = [...a].sort((x, y) => x - y);
  const r = v => +(v || 0).toFixed(1);
  return {n: s.length, median: r(s[s.length >> 1]), p95: r(s[Math.floor(s.length * 0.95)]), max: r(s[s.length - 1])};
};

/** series: [{t, v, x}] sorted by t (ms). Flicker = A,B,A within `win` ms while the pointer x was monotone. */
function detectFlicker(series, win = 150) {
  const events = [];
  for (let i = 0; i < series.length; i++) {
    let j = -1;
    for (let q = i + 1; q < series.length && series[q].t - series[i].t <= win; q++) if (series[q].v !== series[i].v) { j = q; break; }
    if (j < 0) continue;
    for (let k = j + 1; k < series.length && series[k].t - series[i].t <= win; k++) {
      if (series[k].v !== series[i].v) continue;
      const xs = series.slice(i, k + 1).map(s => s.x);
      let up = true, down = true;
      for (let q = 1; q < xs.length; q++) { if (xs[q] < xs[q - 1]) up = false; if (xs[q] > xs[q - 1]) down = false; }
      if (up || down) { events.push({t: Math.round(series[i].t), texts: [series[i].v, series[j].v, series[k].v]}); i = k - 1; }
      break;
    }
  }
  return events;
}

/** samples: [{t, b:[x1,y1,x2,y2]}], samples[0] = before the action. Counts motion segments (glides) and jumps. */
function classifyMotion(samples, tol = 0.002) {
  const w = Math.abs(samples[0].b[2] - samples[0].b[0]) || 1;
  const d = [];
  for (let i = 1; i < samples.length; i++) d.push(Math.max(...samples[i].b.map((v, c) => Math.abs(v - samples[i - 1].b[c]))) / w);
  const changed = d.map(x => x > tol);
  const segs = [];
  let gap = 99;
  for (let i = 0; i < d.length; i++) {
    if (changed[i]) {
      if (gap >= 2 || !segs.length) segs.push({from: i, to: i, max: d[i]});
      else { const s = segs[segs.length - 1]; s.to = i; s.max = Math.max(s.max, d[i]); }
      gap = 0;
    } else gap++;
  }
  const last = changed.lastIndexOf(true);
  return {glides: segs.length, jump: segs.some(s => s.from === s.to && s.max > 0.15), lastT: last < 0 ? 0 : samples[last + 1].t};
}

// ---------- in-page code ----------
const INIT = () => {
  window.__m = {on: false, f: [], lt: [], cls: 0, start() { this.f = []; this.lt = []; this.cls = 0; this.on = true; }, stop() { this.on = false; return {f: this.f, lt: this.lt, cls: this.cls}; }};
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (window.__m.on) window.__m.lt.push(e.duration); }).observe({entryTypes: ['longtask']}); } catch (e) { /* unsupported */ }
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (window.__m.on && !e.hadRecentInput) window.__m.cls += e.value; }).observe({type: 'layout-shift'}); } catch (e) { /* unsupported */ }
  let last = performance.now();
  const loop = t => { if (window.__m.on) window.__m.f.push(t - last); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};
const SAMPLER_START = ms => {
  const S = {rows: [], px: 0};
  S.mv = e => { S.px = e.clientX; };
  addEventListener('pointermove', S.mv, true);
  S.id = setInterval(() => S.rows.push({
    t: performance.now(), px: S.px,
    vals: [...document.querySelectorAll('input[type=range], input[type=number], [role=spinbutton]')].slice(0, 12).map(e => e.value || e.textContent || ''),
  }), ms);
  window.__samp = S;
};
const SAMPLER_STOP = () => { const S = window.__samp; if (!S) return []; clearInterval(S.id); removeEventListener('pointermove', S.mv, true); window.__samp = null; return S.rows; };
const mainBoard = () => {
  const bs = Object.values(window.JXG?.boards || {}).filter(b => b.containerObj?.isConnected);
  bs.sort((a, b) => b.containerObj.clientWidth * b.containerObj.clientHeight - a.containerObj.clientWidth * a.containerObj.clientHeight);
  return bs[0] || null;
};
const BOX_NOW = () => { const b = (0, window.__mainBoard)(); return b ? b.getBoundingBox() : null; };
const BOX_START = ms => {
  window.__bx = {rows: [{t: performance.now(), b: window.__mainBoard()?.getBoundingBox() || null}]};
  window.__bx.id = setInterval(() => window.__bx.rows.push({t: performance.now(), b: window.__mainBoard()?.getBoundingBox() || null}), ms);
};
const BOX_STOP = () => { clearInterval(window.__bx.id); return window.__bx.rows; };
/** First draggable, visible free point in screen pixels (page coordinates), or null. */
const FIND_POINT = () => {
  const b = window.__mainBoard();
  if (!b) return null;
  const r = b.containerObj.getBoundingClientRect();
  for (const o of b.objectsList) {
    if (o.elementClass !== 1 || !o.visProp || !o.visProp.visible || o.visProp.fixed || o.hasPoint === undefined || !o.coords) continue;
    if (o.visProp.visible === false) continue;
    const x = r.left + o.coords.scrCoords[1], y = r.top + o.coords.scrCoords[2];
    if (x > r.left + 8 && x < r.right - 8 && y > r.top + 8 && y < r.bottom - 8 && o.isDraggable !== false) return {x, y};
  }
  return null;
};
const COVER = sel => {
  const b = window.__mainBoard();
  const cards = [...document.querySelectorAll(sel)].map(c => c.getBoundingClientRect()).filter(c => c.width > 2 && c.height > 2);
  if (!b || !cards.length) return null;
  const r = b.containerObj.getBoundingClientRect();
  let cov = 0, n = 0;
  for (let i = 0; i < 48; i++) for (let j = 0; j < 36; j++) {
    const x = r.left + r.width * (i + 0.5) / 48, y = r.top + r.height * (j + 0.5) / 36; n++;
    if (cards.some(c => x >= c.left && x <= c.right && y >= c.top && y <= c.bottom)) cov++;
  }
  return +(100 * cov / n).toFixed(1);
};

// ---------- run ----------
const argv = process.argv.slice(2);
const arg = name => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : undefined; };
const all = name => argv.flatMap((a, i) => (a === '--' + name ? [argv[i + 1]] : []));
const BASE = arg('base');
if (!BASE) { console.log('usage: probe.cjs --base <url> [--route <path>]... [--viewport 1440x900] [--throttle 4] [--json <file>]'); process.exit(2); }
const ROUTES = all('route').length ? all('route') : DEFAULT_ROUTES;
const [VW, VH] = (arg('viewport') || '1440x900').split('x').map(Number);
const THR = +(arg('throttle') || 1);
const T = thresholds(THR);

async function probeRoute(br, routeSpec) {
  const [routePath, flag] = routeSpec.split('?');
  const withLesson = flag === 'lesson';
  const ctx = await br.newContext({viewport: {width: VW, height: VH}});
  await ctx.addInitScript(INIT);
  await ctx.addInitScript(() => { try { localStorage.setItem('bezeg-language', 'sl'); } catch (e) { /* ignore */ } });
  await ctx.addInitScript(`window.__mainBoard = ${mainBoard.toString()};`);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message.slice(0, 160)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  await p.goto(BASE + routePath);
  await p.waitForFunction(() => Object.keys(window.JXG?.boards || {}).length > 0, null, {timeout: 20000});
  await p.waitForTimeout(5000);
  if (THR > 1) { const c = await ctx.newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', {rate: THR}); }

  const R = {route: routeSpec, actions: {}, errors};
  const measure = async act => {
    await p.evaluate(() => window.__m.start());
    let out;
    try { out = await act(); } finally { R._m = await p.evaluate(() => window.__m.stop()); }
    const m = R._m;
    return {...(out || {}), frame: stats(m.f), longTasks: m.lt.length, longTasksOver50: m.lt.filter(v => v > 50).length, longTaskMaxMs: Math.round(Math.max(0, ...m.lt)), cls: +m.cls.toFixed(4)};
  };
  const sampled = async act => {
    await p.evaluate(SAMPLER_START, 30);
    try { await act(); } finally { R._rows = await p.evaluate(SAMPLER_STOP); }
    const t0 = R._rows[0]?.t || 0, keys = (R._rows[0]?.vals || []).length;
    let n = 0;
    for (let k = 0; k < keys; k++) n += detectFlicker(R._rows.map(r => ({t: r.t - t0, v: r.vals[k], x: r.px}))).length;
    return n;
  };
  const act = async (name, fn) => {
    try { R.actions[name] = await fn(); } catch (e) { R.actions[name] = {error: String(e).split('\n')[0].slice(0, 200)}; }
    R.actions[name].coverPct = await p.evaluate(COVER, CARD_SELECTOR).catch(() => null); // null = n/a (no cards on master)
  };
  const drag = async (cx, cy, amp, steps = 60) => {
    await p.mouse.move(cx, cy); await p.mouse.down();
    for (let i = 0; i < steps; i++) { await p.mouse.move(cx + Math.sin(i / 9) * amp, cy); await p.waitForTimeout(16); }
    await p.mouse.up();
  };
  const visibleSlider = async () => {
    const loc = p.locator('input[type=range]');
    for (let i = 0; i < await loc.count(); i++) if (await loc.nth(i).isVisible()) return loc.nth(i);
    return null;
  };
  const sliderDrag = async () => {
    const s = await visibleSlider();
    if (!s) return {skipped: 'no visible slider'};
    await s.scrollIntoViewIfNeeded().catch(() => {});
    const b = await s.boundingBox();
    let flicker = 0;
    const out = await measure(async () => { flicker = await sampled(() => drag(b.x + b.width / 2, b.y + b.height / 2, Math.min(60, b.width / 3))); });
    return {...out, flicker};
  };

  await act('sliderDrag', sliderDrag);

  await act('boardPan', async () => {
    const r = await p.evaluate(() => { const b = window.__mainBoard(); if (!b) return null; const c = b.containerObj.getBoundingClientRect(); return {x: c.left, y: c.top, w: c.width, h: c.height}; });
    if (!r) return {skipped: 'no board'};
    // Plain drag on an empty corner may be inert on some graphs; retry with Shift held and report which one panned.
    let out, moved = false, how = 'plain';
    for (const shift of [false, true]) {
      how = shift ? 'shift' : 'plain';
      await p.evaluate(BOX_START, 50);
      out = await measure(async () => {
        if (shift) await p.keyboard.down('Shift');
        await p.mouse.move(r.x + 25, r.y + r.h - 25); await p.mouse.down();
        await p.mouse.move(r.x + 120, r.y + r.h - 70, {steps: 24});
        await p.mouse.up();
        if (shift) await p.keyboard.up('Shift');
      });
      const rows = (await p.evaluate(BOX_STOP)).filter(x => x.b);
      moved = rows.length > 1 && JSON.stringify(rows[0].b) !== JSON.stringify(rows[rows.length - 1].b);
      if (moved) break;
    }
    return {...out, moved, how};
  });

  await act('pointDrag', async () => {
    const pt = await p.evaluate(FIND_POINT);
    if (!pt) return {skipped: 'no draggable point'};
    let flicker = 0;
    const out = await measure(async () => { flicker = await sampled(() => drag(pt.x, pt.y, 50, 50)); });
    return {...out, flicker};
  });

  await act('playThenSliderTouch', async () => {
    const play = p.locator('[data-action="play-pause"]').first();
    if (!(await play.count()) || !(await play.isVisible().catch(() => false))) return {skipped: 'no playback'};
    const out = await measure(async () => {
      await play.click({timeout: 3000});
      await p.waitForTimeout(2000);
    });
    const touch = await sliderDrag();
    if ((await play.getAttribute('data-playing').catch(() => null)) === 'true') await play.click({timeout: 3000}).catch(() => {});
    return {...out, touch};
  });

  if (withLesson) {
    await act('lessonWalk', async () => {
      const open = p.getByRole('button', {name: /Spoznaj to demonstracijo/}).first();
      if (await open.count()) await open.click({timeout: 5000});
      await p.waitForTimeout(1500);
      const next = '.guided-lesson-nav-next', back = '.guided-lesson-nav-back';
      const settled = {0: await p.evaluate(BOX_NOW)};
      const steps = [];
      let step = 0;
      const doStep = async (kind, sel) => {
        const btn = p.locator(sel).first();
        if (!(await btn.count()) || !(await btn.isEnabled().catch(() => false))) return false;
        await p.evaluate(BOX_START, 50);
        const m = await measure(async () => { await btn.click({timeout: 3000}); await p.waitForTimeout(1600); });
        const rows = (await p.evaluate(BOX_STOP)).filter(x => x.b);
        const mo = rows.length > 1 ? classifyMotion(rows) : {glides: 0, jump: false, lastT: 0};
        step = kind === 'next' ? step + 1 : step - 1;
        const box = rows.length ? rows[rows.length - 1].b : null;
        if (kind === 'next' && box) settled[step] = box;
        const tgt = kind === 'back' ? settled[step] : null;
        const rec = {kind, step, glides: mo.glides, jump: mo.jump, settleMs: mo.lastT ? Math.round(mo.lastT - rows[0].t) : 0, frame: m.frame, longTasksOver50: m.longTasksOver50, cls: m.cls};
        if (tgt && box) rec.backReturnPct = +(100 * Math.max(...box.map((v, c) => Math.abs(v - tgt[c]))) / (Math.abs(tgt[2] - tgt[0]) || 1)).toFixed(2);
        steps.push(rec);
        return true;
      };
      for (let i = 0; i < 12; i++) if (!(await doStep('next', next))) break;
      for (let i = 0; i < 3; i++) if (!(await doStep('back', back))) break;
      return {skipped: steps.length ? undefined : 'lesson not opened', steps};
    });
  }
  await ctx.close();
  delete R._m; delete R._rows;
  return R;
}

// ---------- verdict ----------
function judge(R) {
  const rows = []; // {route, action, metric, value, limit, status}
  const add = (action, metric, value, limit, fail) => rows.push({route: R.route, action, metric, value, limit, status: value === null || value === undefined ? 'n/a' : fail ? 'FAIL' : 'ok'});
  for (const e of R.errors.slice(0, 3)) add('page', 'error', e.slice(0, 60), 0, true);
  const frame = (name, a) => {
    add(name, 'frame.p95Ms', a.frame.p95, T.frameP95Ms, a.frame.p95 > T.frameP95Ms);
    add(name, 'frame.maxMs', a.frame.max, T.frameMaxMs, a.frame.max > T.frameMaxMs);
    add(name, 'longTasks>50ms', a.longTasksOver50, T.longTasksOver50, T.longTasksOver50 !== null && a.longTasksOver50 > T.longTasksOver50);
    add(name, 'cls', a.cls, T.cls, a.cls > T.cls);
    if (a.flicker !== undefined) add(name, 'flickerEvents', a.flicker, T.flickerEvents, a.flicker > T.flickerEvents);
  };
  for (const [name, a] of Object.entries(R.actions)) {
    if (a.error) { add(name, 'error', a.error.slice(0, 60), 'none', true); continue; }
    if (a.skipped) { rows.push({route: R.route, action: name, metric: 'skipped', value: a.skipped, limit: '', status: 'n/a'}); continue; }
    if (a.moved === false) rows.push({route: R.route, action: name, metric: 'board did not pan', value: a.how, limit: '', status: 'n/a'});
    if (a.frame) frame(name, a);
    if (a.touch && a.touch.frame) frame(name + '.touch', a.touch);
    add(name, 'coverPct', a.coverPct ?? null, T.coverPct, a.coverPct > T.coverPct);
    if (a.steps) {
      for (const s of a.steps) {
        const n = `${name}.${s.kind}${s.step}`;
        frame(n, s);
        add(n, 'glidesPerStep', s.glides, T.glidesPerStep, s.glides > T.glidesPerStep);
        add(n, 'jump', s.jump ? 1 : 0, 0, s.jump);
        add(n, 'settleMs', s.settleMs, T.settleMs, s.settleMs > T.settleMs);
        if (s.backReturnPct !== undefined) add(n, 'backReturnPct', s.backReturnPct, T.backReturnPct, s.backReturnPct > T.backReturnPct);
      }
    }
  }
  add('all', 'valueWidthDrift', null, T.valueWidthDriftPx, false); // needs pucks (tasks 03-07)
  return rows;
}

(async () => {
  const {chromium} = require(path.join(process.cwd(), 'node_modules', 'playwright'));
  const br = await chromium.launch();
  const out = {base: BASE, viewport: `${VW}x${VH}`, throttle: THR, started: new Date().toISOString(), thresholds: T, routes: {}, rows: []};
  for (const r of ROUTES) {
    let R;
    try { R = await probeRoute(br, r); } catch (e) { R = {route: r, actions: {}, errors: ['fatal: ' + String(e).split('\n')[0].slice(0, 160)]}; }
    out.routes[r] = R;
    out.rows.push(...judge(R));
  }
  await br.close();
  if (arg('json')) { fs.mkdirSync(path.dirname(path.resolve(arg('json'))), {recursive: true}); fs.writeFileSync(arg('json'), JSON.stringify(out, null, 1)); }
  for (const x of out.rows) if (x.status !== 'ok' || x.metric === 'frame.p95Ms' || x.metric === 'frame.maxMs') console.log(`${x.status.padEnd(4)} ${x.route} ${x.action} ${x.metric} ${x.value} (limit ${x.limit})`);
  const fails = out.rows.filter(x => x.status === 'FAIL');
  console.log(`${out.viewport} throttle=${THR}: ${out.rows.length} checks, ${fails.length} failed`);
  process.exit(fails.length ? 1 : 0);
})();
