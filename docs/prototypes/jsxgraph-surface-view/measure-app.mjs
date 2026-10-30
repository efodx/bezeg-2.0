// Gate measurement for the JSXGraph surface view (task 01, criterion 1), adapted from the ADR 0018 harness
// (docs/prototypes/bezier-patches/measure.mjs): a parent process enforces a hard deadline, a worker runs one fresh
// browser context per repetition, and pointermove -> next requestAnimationFrame plus rAF intervals are sampled in page.
// Unlike the prototype it drives the real production app through its UI (tabs, switches, selects, buttons, mouse), not
// through internals. The three builds are served separately (VITE_SURFACE_VIEW picks the view at build time).
//
//   BEZEG_MEASURE_MODE=measure (default) | depth | summarize
//   BEZEG_MEASURE_OUT, BEZEG_MEASURE_DEADLINE_MS, BEZEG_MEASURE_STRATEGIES=board2d,view3d,three
//   BEZEG_MEASURE_KINDS=tensor,triangular,teapot  BEZEG_MEASURE_DENSITIES=8,16  BEZEG_MEASURE_VIEWPORTS=desktop,narrow
//   BEZEG_MEASURE_GESTURES=orbit,drag  BEZEG_MEASURE_REPEATS=2  BEZEG_MEASURE_SAMPLES=16
//   BEZEG_PORTS=board2d:4191,view3d:4192,three:4193  BEZEG_BUILD_DIRS=board2d:<dir>,view3d:<dir>,three:<dir>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const out = resolve(process.env.BEZEG_MEASURE_OUT || resolve(repoRoot, 'docs/reviews/jsxgraph-surface-view/gate-2026-10-29'));
const deadlineMs = numberEnv('BEZEG_MEASURE_DEADLINE_MS', 90000, 1000, 7200000);
const script = fileURLToPath(import.meta.url);
const mode = process.env.BEZEG_MEASURE_MODE || 'measure';
const BUDGET_MS = 1000 / 60;
// Control points are filled with SURFACE_COLORS.point / .selected (src/graphs/patches/surface-view/surfaceStyles.ts); read
// them from that file so a palette change cannot silently make the drag gesture find no point.
const palette = readFileSync(resolve(repoRoot, 'src/graphs/patches/surface-view/surfaceStyles.ts'), 'utf8');
const paletteHex = name => {
  const m = palette.match(new RegExp(`^[ \\t]+${name}: 0x([0-9a-fA-F]{6})`, 'm'));
  if (!m) throw Error(`SURFACE_COLORS.${name} not found in surfaceStyles.ts`);
  return '#' + m[1].toLowerCase();
};
const POINT_FILL = paletteHex('point'), SELECTED_FILL = paletteHex('selected');
const reportFile = mode === 'depth' ? 'depth-run.json' : 'measure.json';

function numberEnv(name, fallback, min, max) {
  const n = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(n) || n < min || n > max) throw Error(`${name} must be an integer from ${min} to ${max}`);
  return n;
}
function listEnv(name, fallback, allowed) {
  const values = (process.env[name] ?? fallback).split(',').map(x => x.trim()).filter(Boolean);
  if (!values.length || values.some(x => !allowed.includes(x))) throw Error(`${name} must contain comma-separated values from: ${allowed.join(', ')}`);
  return [...new Set(values)];
}
function mapEnv(name, fallback) {
  return Object.fromEntries((process.env[name] ?? fallback).split(',').map(pair => { const i = pair.indexOf(':'); return [pair.slice(0, i), pair.slice(i + 1)]; }));
}
const evidenceWriteRetries = [];
async function save(name, value) {
  await mkdir(dirname(resolve(out, name)), { recursive: true });
  for (let attempt = 0; ; attempt++) {
    try { await writeFile(resolve(out, name), JSON.stringify(value, null, 2)); return; }
    catch (error) {
      if (process.platform !== 'win32' || error.code !== 'UNKNOWN' || attempt >= 5) throw error;
      evidenceWriteRetries.push({ at: new Date().toISOString(), name, retry: attempt + 1, code: error.code });
      await new Promise(resolveRetry => setTimeout(resolveRetry, 100));
    }
  }
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
/** Control points identified by position (the app rebuilds the board on selection, so DOM ids are not stable). */
function matchPoints(before, after, tol) {
  const near = (p, list) => list.some(q => dist(p, q) <= tol);
  return { unmatchedBefore: before.filter(p => !near(p, after)), unmatchedAfter: after.filter(q => !near(q, before)) };
}
const stats = a => { const s = [...a].filter(x => x !== null && x !== undefined).sort((x, y) => x - y); return { count: s.length, median: s[Math.floor(s.length / 2)] ?? null, p95: s[Math.min(s.length - 1, Math.floor(s.length * .95))] ?? null, max: s.at(-1) ?? null }; };

function summarize(report) {
  const cells = {};
  for (const run of report.runs) {
    const key = [run.strategy, run.kind, run.densityLabel, run.viewportName, run.gesture].join('|');
    const c = cells[key] ??= { strategy: run.strategy, kind: run.kind, density: run.densityLabel, viewport: run.viewportName, gesture: run.gesture, repetitions: 0, failed: 0, skipped: 0, eventMs: [], mutationMs: [], lastMutationMs: [], visibleMs: [], frames: [], activeFrameMs: [], allFrameMs: [], perRepEventP95: [], mutationBeforeNextRaf: 0, eventsTotal: 0, moved: [], cameraFixed: [], failures: [] };
    if (run.status === 'skipped') { c.skipped++; continue; }
    c.repetitions++;
    if (run.status !== 'complete') { c.failed++; c.failures.push(run.failure?.split('\n')[0]); }
    if (!run.events) continue;
    c.eventMs.push(...run.events.map(e => e.nextRafMs));
    c.mutationMs.push(...run.events.map(e => e.firstMutationMs)); c.lastMutationMs.push(...run.events.map(e => e.lastMutationMs)); c.visibleMs.push(...run.events.map(e => e.visibleFrameMs)); c.frames.push(...run.events.map(e => e.framesToVisible));
    c.eventsTotal += run.events.length;
    c.mutationBeforeNextRaf += run.events.filter(e => e.firstMutationMs !== null && e.firstMutationMs <= e.nextRafMs).length;
    c.perRepEventP95.push(stats(run.events.map(e => e.nextRafMs)).p95);
    c.activeFrameMs.push(...(run.activeFrameIntervalsMs || []));
    c.allFrameMs.push(...(run.frameIntervalsMs || []));
    c.moved.push(run.changedState); if (run.gesture === 'drag') c.cameraFixed.push(run.dragCameraFixed);
  }
  const rows = Object.values(cells).map(c => {
    const ev = stats(c.eventMs), act = stats(c.activeFrameMs);
    return { strategy: c.strategy, kind: c.kind, density: c.density, viewport: c.viewport, gesture: c.gesture, repetitions: c.repetitions, failed: c.failed, skipped: c.skipped,
      eventToNextRafMs: ev, perRepetitionP95Ms: c.perRepEventP95, eventToFirstDomMutationMs: stats(c.mutationMs), eventToLastDomMutationMs: stats(c.lastMutationMs), eventToFrameAfterLastMutationMs: stats(c.visibleMs), framesUntilDrawVisible: { eventsWithDrawSeen: c.frames.filter(x => x !== null).length, inNextFrame: c.frames.filter(x => x === 1).length, inSecondFrame: c.frames.filter(x => x === 2).length, later: c.frames.filter(x => x > 2).length }, eventsWithDomMutationBeforeNextRaf: `${c.mutationBeforeNextRaf}/${c.eventsTotal}`,
      activeFrameIntervalMs: act, allFrameIntervalMs: stats(c.allFrameMs), allRepetitionsChangedExpectedState: c.moved.length ? c.moved.every(Boolean) : null,
      dragCameraFixedInAllRepetitions: c.cameraFixed.length ? c.cameraFixed.every(Boolean) : null,
      orbitBudgetMs: c.gesture === 'orbit' ? Number(BUDGET_MS.toFixed(2)) : null, orbitP95WithinBudget: c.gesture === 'orbit' && ev.p95 !== null ? ev.p95 <= BUDGET_MS + 0.05 : null,
      failures: c.failures };
  });
  const verdict = {};
  for (const strategy of [...new Set(rows.map(r => r.strategy))]) {
    const orbit = rows.filter(r => r.strategy === strategy && r.gesture === 'orbit');
    const gating = orbit.filter(r => r.kind !== 'teapot'), tea = orbit.filter(r => r.kind === 'teapot');
    const worst = list => list.reduce((m, r) => Math.max(m, r.eventToNextRafMs.p95 ?? 0), 0);
    verdict[strategy] = { gatingCells: gating.length, worstTensorTriangularOrbitP95Ms: worst(gating), allTensorTriangularOrbitWithinBudget: gating.length > 0 && gating.every(r => r.orbitP95WithinBudget && !r.failed), teapotOrbitP95Ms: tea.map(r => ({ viewport: r.viewport, p95: r.eventToNextRafMs.p95 })), cellsWithFailures: rows.filter(r => r.strategy === strategy && r.failed).length };
  }
  return { generatedAt: new Date().toISOString(), p95Definition: 'sorted[min(n-1, floor(n*0.95))] over events pooled across repetitions (as measure.mjs of ADR 0018)', budgetMs: BUDGET_MS, verdict, cells: rows };
}

if (mode === 'summarize') {
  const report = JSON.parse(await readFile(resolve(out, 'measure.json'), 'utf8'));
  await save('summary.json', summarize(report));
  console.log(JSON.stringify({ summarized: report.runs.length }));
} else if (process.argv[2] !== '--worker') {
  await mkdir(out, { recursive: true });
  const child = spawn(process.execPath, [script, '--worker'], { stdio: 'inherit', windowsHide: true, detached: process.platform !== 'win32' });
  let ended = false;
  const timer = setTimeout(async () => {
    if (ended) return;
    ended = true;
    await save('failure.json', { at: new Date().toISOString(), failure: 'Hard deadline exceeded; terminating runner and browser process tree.', deadlineMs });
    if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
    else if (child.pid) { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
    process.exitCode = 124;
  }, deadlineMs);
  child.on('exit', code => { if (ended) return; ended = true; clearTimeout(timer); process.exitCode = code ?? 1; });
} else {
  const require = createRequire(resolve(repoRoot, 'package.json'));
  const { chromium } = require('playwright');
  const ports = mapEnv('BEZEG_PORTS', 'board2d:4191,view3d:4192,three:4193');
  const buildDirs = mapEnv('BEZEG_BUILD_DIRS', 'board2d:C:/Users/1337Hacker/.claude/jobs/302d1e29/tmp/build-board2d,view3d:C:/Users/1337Hacker/.claude/jobs/302d1e29/tmp/build-view3d,three:C:/Users/1337Hacker/.claude/jobs/302d1e29/tmp/build-three');
  const strategies = listEnv('BEZEG_MEASURE_STRATEGIES', 'board2d,view3d', ['board2d', 'view3d', 'three']);
  const kinds = listEnv('BEZEG_MEASURE_KINDS', 'tensor,triangular,teapot', ['tensor', 'triangular', 'teapot']);
  const densities = listEnv('BEZEG_MEASURE_DENSITIES', '8,16', ['8', '16']);
  const viewports = listEnv('BEZEG_MEASURE_VIEWPORTS', 'desktop,narrow', ['desktop', 'narrow']);
  const gestures = listEnv('BEZEG_MEASURE_GESTURES', 'orbit,drag', ['orbit', 'drag']);
  const repeats = numberEnv('BEZEG_MEASURE_REPEATS', 2, 1, 10);
  const samples = numberEnv('BEZEG_MEASURE_SAMPLES', 16, 2, 120);
  const operationTimeout = numberEnv('BEZEG_MEASURE_OPERATION_TIMEOUT_MS', 20000, 500, 120000);
  const settleMs = numberEnv('BEZEG_MEASURE_SETTLE_MS', 600, 0, 10000);
  const VIEWPORTS = { desktop: { width: 1440, height: 1000 }, narrow: { width: 390, height: 844 } };
  const ROUTES = { tensor: 'patches/tensor', triangular: 'patches/triangular', teapot: 'patches/joins', joins: 'patches/joins' };
  const PRESETS = ['front', 'top', 'side', 'isometric'];
  const PRESET_BUTTON = { front: 'Front', top: 'Top', side: 'Side', isometric: 'Isometric' };
  const SWITCH_ON = ['Control net', 'Iso-curves', 'Boundary curves', 'Shaded patch'];
  const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  const gitStatus = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: repoRoot, encoding: 'utf8' });
  const url = (strategy, kind) => `http://127.0.0.1:${ports[strategy]}/bezeg-2.0/${ROUTES[kind]}`;
  const bounded = (promise, label) => new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => rejectPromise(Error(`${label} exceeded ${operationTimeout} ms`)), operationTimeout);
    Promise.resolve(promise).then(value => { clearTimeout(timer); resolvePromise(value); }, error => { clearTimeout(timer); rejectPromise(error); });
  });
  const rafs = (page, n = 2) => bounded(page.evaluate(async n => { for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame); }, n), 'rAF settle');

  const report = {
    mode, evidenceWriteRetries, startedAt: new Date().toISOString(),
    host: { platform: os.platform(), release: os.release(), arch: os.arch(), cpu: os.cpus()[0]?.model, cpus: os.cpus().length, totalMemGiB: Math.round(os.totalmem() / 2 ** 30) },
    git: { head: gitHead, dirty: gitStatus.length > 0, dirtyEntries: gitStatus ? gitStatus.trimEnd().split(/\r?\n/) : [] },
    browser: null, jsxgraph: null, builds: {}, parameters: { strategies, kinds, densities, viewports, gestures, repeats, samples, operationTimeout, settleMs, ports },
    caveats: [
      'Headless Chromium (software GL path) on this host; narrow viewport is an emulation, not a physical phone.',
      'Pointer-to-next-rAF is a scheduling proxy as in ADR 0018: it does not measure compositor presentation. eventToFirstDomMutationMs / eventToLastDomMutationMs / eventToFrameAfterLastMutationMs / framesUntilDrawVisible additionally record when DOM mutations inside the surface host followed each pointermove (MutationObserver on the host subtree, mutations attributed to the latest pointermove) and in which rAF frame they could first be presented. Because the harness gates each move on an rAF callback, the move lands shortly before the next frame; a draw that finishes after that frame is first visible one frame later. The WebGL (three) build has no DOM mutations, so these are null for it.',
      'Playwright mouse events are dispatched one per rAF gate; the app was driven through tabs, switches, selects and buttons with English UI language (localStorage), not through internals.',
      'Active frame intervals are rAF timestamp deltas whose interval starts no later than 50 ms after the last pointermove (so a long frame caused by a move counts); they are not CPU render time. frameIntervalsMs holds all intervals of the run (including idle settle).',
      'Teapot density is fixed at 8 by the app (no density control in the capstone); recorded as density "fixed8".'],
    runs: [], failures: [] };
  let browser = null;

  async function verifyBuilds(list) {
    for (const strategy of list) {
      const dir = buildDirs[strategy];
      const local = createHash('sha256').update(await readFile(resolve(dir, 'index.html'))).digest('hex');
      const response = await fetch(`http://127.0.0.1:${ports[strategy]}/bezeg-2.0/`);
      const served = createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
      report.builds[strategy] = { dir, port: ports[strategy], indexSha256: local, servedMatchesDir: local === served, status: response.status };
      if (local !== served) throw Error(`Served index for ${strategy} differs from build dir ${dir}`);
    }
  }

  /** Opens a route in a fresh context, selects the teapot capstone if asked, shows constructions and sets densities. */
  async function openScene(strategy, kind, viewportName, density, withOptions = {}) {
    const context = await bounded(browser.newContext({ viewport: VIEWPORTS[viewportName] }), 'new context');
    const errors = [];
    try {
      await context.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
      const page = await bounded(context.newPage(), 'new page');
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      await bounded(page.goto(url(strategy, kind), { waitUntil: 'load', timeout: operationTimeout }), 'navigation');
      await bounded(page.waitForSelector('[role="application"]', { timeout: operationTimeout }), 'surface host');
      if (strategy === 'three') await bounded(page.waitForSelector('[role="application"] canvas', { timeout: operationTimeout }), 'canvas');
      else await bounded(page.waitForFunction(() => document.querySelectorAll('[role="application"] polygon, [role="application"] polyline').length > 20, null, { timeout: operationTimeout }), 'board content');
      await page.waitForTimeout(settleMs);
      if (kind === 'teapot') {
        await bounded(page.getByRole('button', { name: 'Edit', exact: true }).click(), 'edit tab');
        await bounded(page.locator('[data-join-scene="join-teapot"]').click(), 'teapot scene');
        await bounded(page.locator('.patch-join-capstone').waitFor({ state: 'visible' }), 'capstone panel');
      }
      await bounded(page.getByRole('button', { name: 'Display', exact: true }).click(), 'display tab');
      const setup = { switches: {}, selects: {} };
      if (kind !== 'teapot') {
        for (const label of SWITCH_ON) {
          const box = page.getByLabel(label, { exact: true });
          if (!(await box.isChecked())) await bounded(box.setChecked(true), `switch ${label}`);
          setup.switches[label] = await box.isChecked();
        }
        if (density) {
          for (const label of ['Iso-curves per direction', 'Shading detail']) {
            const sel = page.getByLabel(label, { exact: true });
            await bounded(sel.selectOption(String(density)), `select ${label}`);
            setup.selects[label] = await sel.inputValue();
          }
        }
      } else {
        for (const label of ['Boundary curves', 'Shaded patch']) setup.switches[label] = await page.getByLabel(label, { exact: true }).isChecked();
      }
      await page.waitForTimeout(settleMs); await rafs(page, 3);
      if (withOptions.scrollHost) await bounded(page.locator('[role="application"]').scrollIntoViewIfNeeded(), 'scroll host');
      return { context, page, errors, setup };
    } catch (error) { await context.close().catch(() => {}); throw error; }
  }

  const readState = page => page.evaluate(([pointFill, selectedFill]) => {
    const host = document.querySelector('[role="application"]');
    const r = host.getBoundingClientRect();
    const sliders = [...document.querySelectorAll('input[type=range]')].map(x => ({ label: document.querySelector(`label[for="${x.id}"]`)?.innerText ?? '', value: Number(x.value) }));
    const camera = sliders.filter(s => /azimuth|elevation/i.test(s.label)).map(s => s.value);
    const points = [...host.querySelectorAll('ellipse')].filter(e => [pointFill, selectedFill].includes(e.getAttribute('fill')) && e.getBoundingClientRect().width >= 9 && getComputedStyle(e).visibility !== 'hidden').map(e => { const b = e.getBoundingClientRect(); return { id: e.id, x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, selected: e.getAttribute('fill') === selectedFill }; });
    const paths = [...host.querySelectorAll('polygon, polyline')].filter(p => (p.getAttribute('points') || '').length > 2 && p.getAttribute('display') !== 'none');
    let h = 5381; for (const p of paths) { const d = p.getAttribute('points'); for (let i = 0; i < d.length; i++) h = (h * 33 + d.charCodeAt(i)) | 0; }
    const canvas = host.querySelector('canvas');
    return { host: [r.x, r.y, r.width, r.height], camera, points, drawn: { paths: paths.length, ellipses: host.querySelectorAll('ellipse').length, polygons: host.querySelectorAll('polygon').length, pathHash: h, canvas: canvas ? [canvas.width, canvas.height] : null }, scrollY: scrollY };
  }, [POINT_FILL, SELECTED_FILL]);

  async function runOne(strategy, kind, viewportName, density, gesture, repeat) {
    const densityLabel = kind === 'teapot' ? 'fixed8' : `iso${density}/shading${density}`;
    const key = { strategy, kind, density: kind === 'teapot' ? null : Number(density), densityLabel, viewportName, viewport: VIEWPORTS[viewportName], gesture, repeat };
    const entry = { ...key, status: 'running', startedAt: new Date().toISOString() };
    report.runs.push(entry); await save(reportFile, report);
    let scene = null;
    try {
      if (gesture === 'drag' && (kind === 'teapot' || strategy === 'three')) { Object.assign(entry, { status: 'skipped', reason: kind === 'teapot' ? 'The teapot capstone is read-only (no control points).' : 'The Three build has no DOM control points; the drag reference is not measured.' }); return; }
      scene = await openScene(strategy, kind, viewportName, density, { scrollHost: true });
      const { page } = scene;
      entry.setup = scene.setup;
      entry.runtime = await page.evaluate(() => ({ jsxgraph: window.JXG?.version ?? null, userAgent: navigator.userAgent }));
      report.jsxgraph ??= entry.runtime.jsxgraph;
      let before = await bounded(readState(page), 'state before');
      entry.before = before;
      if (!before.camera.length) throw Error('Camera sliders (azimuth/elevation) not found');
      // Gesture start: empty background corner of the visible part of the host, or the control point for a drag.
      const vp = VIEWPORTS[viewportName];
      const [hx, hy, hw, hh] = before.host;
      const visible = { left: Math.max(hx, 0), top: Math.max(hy, 0), right: Math.min(hx + hw, vp.width), bottom: Math.min(hy + hh, vp.height) };
      let start = { x: visible.right - 34, y: visible.top + 34 };
      let target = null;
      if (gesture === 'drag') {
        target = await bounded(page.evaluate(([pointFill]) => {
          const host = document.querySelector('[role="application"]'), hb = host.getBoundingClientRect();
          const cands = [...host.querySelectorAll('ellipse')].filter(e => e.getAttribute('fill') === pointFill && getComputedStyle(e).visibility !== 'hidden');
          const scored = cands.map((e, index) => { const b = e.getBoundingClientRect(); const x = b.x + b.width / 2, y = b.y + b.height / 2; const inside = x > hb.x + 60 && x < hb.right - 60 && y > Math.max(hb.y, 0) + 60 && y < Math.min(hb.bottom, innerHeight) - 60; const top = document.elementFromPoint(x, y) === e; return { id: e.id, index, x, y, inside, top, d: Math.hypot(x - (hb.x + hb.width / 2), y - (hb.y + hb.height / 2)) }; });
          const ok = scored.filter(c => c.inside && c.top).sort((a, b) => a.d - b.d);
          return { chosen: ok[0] ?? null, candidates: scored.length, hittable: ok.length };
        }, [POINT_FILL]), 'locate control point');
        if (!target.chosen) throw Error(`No hittable control point inside the visible host: ${JSON.stringify(target)}`);
        entry.target = target;
        // Cold attempt: press-drag on a not-yet-selected point exactly like a user. Recorded as a diagnostic, not measured.
        const c0 = target.chosen;
        await bounded(page.mouse.move(c0.x, c0.y), 'cold positioning'); await bounded(page.mouse.down(), 'cold down');
        for (let i = 1; i <= samples; i++) {
          await bounded(page.evaluate(() => new Promise(requestAnimationFrame)), 'cold rAF gate');
          await bounded(page.mouse.move(c0.x + 28 * Math.sin(i / samples * Math.PI), c0.y + i * 3), `cold sample ${i}`);
        }
        await bounded(page.mouse.up(), 'cold up'); await rafs(page, 3); await page.waitForTimeout(300);
        const coldAfter = await bounded(readState(page), 'state after cold attempt');
        const coldMatch = matchPoints(before.points, coldAfter.points, 0.05);
        entry.coldAttempt = { targetMovedOnScreen: coldMatch.unmatchedAfter.length === 1 && coldMatch.unmatchedBefore.length === 1 && dist(coldMatch.unmatchedBefore[0], coldMatch.unmatchedAfter[0]) > 1, boardRebuiltDuringGesture: (before.points[0]?.id.match(/jxgBoard(\d+)/)?.[1]) !== (coldAfter.points[0]?.id.match(/jxgBoard(\d+)/)?.[1]), selectedAfter: coldAfter.points.filter(p => p.selected).length, cameraBefore: before.camera, cameraAfter: coldAfter.camera, unmatchedBefore: coldMatch.unmatchedBefore.length, unmatchedAfter: coldMatch.unmatchedAfter.length };
        // Measured drag: the point is now selected; drag it again from where it is.
        before = coldAfter; entry.before = before;
        const sel = before.points.find(p => p.selected) ?? before.points.reduce((m, p) => Math.hypot(p.x - c0.x, p.y - c0.y) < Math.hypot(m.x - c0.x, m.y - c0.y) ? p : m);
        target.chosen = { ...c0, x: sel.x, y: sel.y, id: sel.id, selectedBeforeMeasuredDrag: sel.selected };
        start = { x: sel.x, y: sel.y };
      }
      entry.start = start;
      await bounded(page.evaluate(() => {
        const host = document.querySelector('[role="application"]');
        const p = window.__probe = { raf: [], active: [], ev: [], ticks: [], last: null, lastMove: -1e9, on: true };
        const tick = t => { if (!p.on) return; p.ticks.push(performance.now()); if (p.last !== null) { const dt = t - p.last; p.raf.push(dt); if (p.lastMove > p.last - 50) p.active.push(dt); } p.last = t; requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
        const mo = new MutationObserver(() => { const now = performance.now(), r = p.ev.at(-1); if (!r) return; if (r.firstMutationMs === null) r.firstMutationMs = now - r.t0; r.lastMutationAt = now; r.mutationBatches++; });
        mo.observe(host, { subtree: true, attributes: true, childList: true, characterData: true });
        p.mo = mo;
        host.addEventListener('pointermove', e => {
          if (!e.buttons) return;
          const t0 = performance.now(); p.lastMove = t0;
          const rec = { t0, nextRafMs: null, firstMutationMs: null, lastMutationAt: null, mutationBatches: 0 }; p.ev.push(rec);
          requestAnimationFrame(() => { rec.nextRafMs = performance.now() - t0; });
        }, true);
      }), 'probe setup');
      await bounded(page.mouse.move(start.x, start.y), 'pointer positioning'); await bounded(page.mouse.down(), 'pointer down');
      for (let i = 1; i <= samples; i++) {
        const x = gesture === 'drag' ? start.x + 28 * Math.sin(i / samples * Math.PI) : start.x - i * 7;
        const y = gesture === 'drag' ? start.y + i * 3 : start.y + i * 6;
        await bounded(page.evaluate(() => new Promise(requestAnimationFrame)), 'sample rAF gate');
        await bounded(page.mouse.move(x, y), `${gesture} sample ${i}`);
      }
      await bounded(page.mouse.up(), 'pointer up');
      await rafs(page, 3); await page.waitForTimeout(150);
      const result = await bounded(page.evaluate(() => { const p = window.__probe; p.on = false; p.mo.disconnect(); return { raf: p.raf, active: p.active, ev: p.ev.map(r => {
        const out = { nextRafMs: r.nextRafMs, firstMutationMs: r.firstMutationMs, lastMutationMs: r.lastMutationAt === null ? null : r.lastMutationAt - r.t0, mutationBatches: r.mutationBatches, visibleFrameMs: null, framesToVisible: null };
        if (r.lastMutationAt !== null) { const frame = p.ticks.find(t => t > r.lastMutationAt); if (frame !== undefined) { out.visibleFrameMs = frame - r.t0; out.framesToVisible = p.ticks.filter(t => t > r.t0 && t <= frame).length; } }
        return out; }) }; }), 'collect');
      const after = await bounded(readState(page), 'state after');
      entry.after = after;
      const cameraChanged = JSON.stringify(before.camera) !== JSON.stringify(after.camera);
      let moved, extra = {};
      const match = matchPoints(before.points, after.points, gesture === 'orbit' ? 1 : 0.05);
      if (gesture === 'orbit') {
        moved = cameraChanged && (strategy === 'three' ? true : after.drawn.pathHash !== before.drawn.pathHash && (before.points.length === 0 || match.unmatchedBefore.length > 0));
        extra = { cameraChanged, controlPointsMovedOnScreen: match.unmatchedBefore.length, controlPointsBefore: before.points.length, drawnChanged: after.drawn.pathHash !== before.drawn.pathHash };
      } else {
        const one = match.unmatchedBefore.length === 1 && match.unmatchedAfter.length === 1;
        const shift = one ? dist(match.unmatchedBefore[0], match.unmatchedAfter[0]) : null;
        moved = one && shift > 1;
        const cursorEnd = { x: start.x + 28 * Math.sin(Math.PI), y: start.y + samples * 3 };
        extra = { targetScreenDeltaPx: shift, targetEndDistanceToCursorPx: one ? dist(match.unmatchedAfter[0], cursorEnd) : null, otherControlPointsUnmovedAfterDrag: before.points.length - match.unmatchedBefore.length, controlPointsBefore: before.points.length, controlPointsAfter: after.points.length,
          cameraSlidersChanged: cameraChanged, drawnChanged: after.drawn.pathHash !== before.drawn.pathHash,
          dragCameraFixed: !cameraChanged && match.unmatchedBefore.length <= 1 && match.unmatchedAfter.length <= 1 };
      }
      const geometryPresent = strategy === 'three' ? !!after.drawn.canvas && after.drawn.canvas[0] > 0 : after.drawn.paths > 10 && (kind === 'teapot' || after.points.length >= (kind === 'tensor' ? 16 : 10));
      Object.assign(entry, extra, { changedState: moved, geometryPresent, events: result.ev, eventsSeen: result.ev.length, frameIntervalsMs: result.raf, activeFrameIntervalsMs: result.active, eventToNextRafMs: stats(result.ev.map(e => e.nextRafMs)), activeFrameIntervalMs: stats(result.active), pageErrors: scene.errors });
      const problems = [];
      if (!moved) problems.push(`expected state change missing (${gesture})`);
      if (gesture === 'drag' && !extra.dragCameraFixed) problems.push('camera not fixed during drag');
      if (result.ev.length < samples) problems.push(`only ${result.ev.length}/${samples} pointermove events seen`);
      if (result.ev.some(e => e.nextRafMs === null)) problems.push('an event never reached a next rAF');
      if (!geometryPresent) problems.push('surface geometry missing');
      if (scene.errors.length) problems.push('page errors: ' + scene.errors.slice(0, 3).join(' | '));
      if (problems.length) { entry.problems = problems; throw Error(problems.join('; ')); }
      Object.assign(entry, { status: 'complete', finishedAt: new Date().toISOString() });
    } catch (error) {
      Object.assign(entry, { status: 'failed', failure: String(error?.stack || error), finishedAt: new Date().toISOString() });
      report.failures.push({ key, failure: entry.failure.split('\n')[0] });
    } finally {
      if (scene) await bounded(scene.context.close(), 'context close').catch(e => report.failures.push({ key, failure: `Context cleanup: ${e.message}` }));
      await save(reportFile, report);
    }
  }

  async function runDepth() {
    const dir = 'depth';
    const index = [];
    for (const strategy of strategies) for (const kind of ['tensor', 'triangular', 'joins', 'teapot']) {
      let scene = null;
      try {
        // joins: the two-patch scene of the route default (c1); teapot: the capstone; both with the same constructions.
        scene = kind === 'joins' ? await openJoins(strategy) : await openScene(strategy, kind, 'desktop', 8);
        const { page } = scene;
        for (const preset of PRESETS) {
          const file = `${dir}/${strategy}-${kind}-${preset}.png`;
          const rec = { strategy, kind, preset, file, status: 'ok' };
          try {
            await bounded(page.getByRole('button', { name: PRESET_BUTTON[preset], exact: true }).click(), `preset ${preset}`);
            await page.waitForTimeout(settleMs); await rafs(page, 3);
            const box = await page.locator('[role="application"]').boundingBox();
            await mkdir(resolve(out, dir), { recursive: true });
            const png = await bounded(page.screenshot({ path: resolve(out, file), clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 1000 - box.y) } }), 'screenshot');
            rec.bytes = png.length; rec.host = [box.x, box.y, box.width, box.height].map(Math.round);
            rec.camera = (await readState(page)).camera; rec.drawn = (await readState(page)).drawn;
          } catch (error) { rec.status = 'failed'; rec.failure = String(error.message || error); }
          index.push(rec); await save(`${dir}/index.json`, { generatedAt: new Date().toISOString(), git: report.git, builds: report.builds, screenshots: index });
        }
        if (scene.errors.length) index.push({ strategy, kind, pageErrors: scene.errors.slice(0, 5) });
      } catch (error) { index.push({ strategy, kind, status: 'failed', failure: String(error.message || error) }); }
      finally { if (scene) await scene.context.close().catch(() => {}); }
      await save(`${dir}/index.json`, { generatedAt: new Date().toISOString(), git: report.git, builds: report.builds, screenshots: index });
    }
    return index;
  }

  /** The two-patch scene of /patches/joins (not the capstone) with net, iso curves, boundary and shading at density 8/8. */
  async function openJoins(strategy) {
    const context = await bounded(browser.newContext({ viewport: VIEWPORTS.desktop }), 'new context');
    const errors = [];
    try {
      await context.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await bounded(page.goto(url(strategy, 'joins'), { waitUntil: 'load', timeout: operationTimeout }), 'navigation');
      await bounded(page.waitForSelector('[role="application"]', { timeout: operationTimeout }), 'surface host');
      await page.waitForTimeout(settleMs);
      await bounded(page.getByRole('button', { name: 'Display', exact: true }).click(), 'display tab');
      for (const label of SWITCH_ON) { const box = page.getByLabel(label, { exact: true }); if (!(await box.isChecked())) await box.setChecked(true); }
      for (const label of ['Iso-curves per direction', 'Shading detail']) await page.getByLabel(label, { exact: true }).selectOption('8');
      await page.waitForTimeout(settleMs); await rafs(page, 3);
      return { context, page, errors };
    } catch (error) { await context.close().catch(() => {}); throw error; }
  }

  try {
    browser = await chromium.launch({ headless: true });
    report.browser = { name: 'Chromium', version: browser.version() };
    await verifyBuilds(strategies);
    await save(reportFile, report);
    if (mode === 'depth') {
      const index = await runDepth();
      report.depthScreenshots = index.filter(x => x.file).length;
      report.failures.push(...index.filter(x => x.status === 'failed').map(x => ({ key: x, failure: x.failure })));
    } else {
      await save(reportFile, report);
      for (const strategy of strategies) for (const kind of kinds) for (const viewportName of viewports) for (const gesture of gestures) for (const density of kind === 'teapot' ? ['8'] : densities) for (let repeat = 1; repeat <= repeats; repeat++) {
        if (kind === 'teapot' && gesture === 'drag') { report.runs.push({ strategy, kind, density: null, densityLabel: 'fixed8', viewportName, gesture, repeat, status: 'skipped', reason: 'The teapot capstone is read-only (no control points).' }); continue; }
        await runOne(strategy, kind, viewportName, density, gesture, repeat);
      }
    }
  } catch (error) {
    report.failures.push({ failure: String(error?.stack || error) });
  } finally {
    await browser?.close().catch(() => {});
    report.finishedAt = new Date().toISOString();
    for (const run of report.runs) if (run.status === 'running') { run.status = 'failed'; run.finishedAt = report.finishedAt; run.failure = 'Runner ended before this run completed; see top-level failures.'; }
    await save(reportFile, report);
    if (mode === 'measure') await save('summary.json', summarize(report));
    console.log(JSON.stringify({ mode, out, runs: report.runs.length, failed: report.runs.filter(r => r.status === 'failed').length, failures: report.failures.length, browser: report.browser }));
    if (report.failures.length) process.exitCode = 1;
  }
}
