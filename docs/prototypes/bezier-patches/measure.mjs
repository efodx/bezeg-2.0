// Bounded dual-renderer probe. Run only after functional verification and when
// browser/timing work is idle. The parent process enforces the hard deadline.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.env.BEZEG_MEASURE_OUT || '.command-logs/patches-measure');
const deadlineMs = numberEnv('BEZEG_MEASURE_DEADLINE_MS', 90000, 1000, 600000);
const script = fileURLToPath(import.meta.url);

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
async function save(name, value) { await writeFile(resolve(out, name), JSON.stringify(value, null, 2)); }

if (process.argv[2] !== '--worker') {
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
  const require = createRequire(new URL('../../../package.json', import.meta.url));
  const { chromium } = require('playwright');
  const baseUrl = process.env.BEZEG_SPIKE_URL || 'http://127.0.0.1:4181/docs/prototypes/bezier-patches/';
  const renderers = listEnv('BEZEG_MEASURE_RENDERERS', 'jsx', ['jsx', 'three']);
  const kinds = listEnv('BEZEG_MEASURE_KINDS', 'tensor', ['tensor', 'triangular', 'teapot']);
  const isos = listEnv('BEZEG_MEASURE_ISO', '8', ['8', '16']);
  const tilings = listEnv('BEZEG_MEASURE_TILING', '8', ['8', '16']);
  const viewports = listEnv('BEZEG_MEASURE_VIEWPORTS', 'desktop', ['desktop', 'narrow']);
  const gestures = listEnv('BEZEG_MEASURE_GESTURES', 'drag,orbit,uv', ['drag', 'orbit', 'uv']);
  const triangleModes = listEnv('BEZEG_MEASURE_TRIANGLE_MODES', 'mesh', ['mesh', 'surface']);
  const repeats = numberEnv('BEZEG_MEASURE_REPEATS', 1, 1, 10);
  const samples = numberEnv('BEZEG_MEASURE_SAMPLES', 3, 2, 120);
  const operationTimeout = numberEnv('BEZEG_MEASURE_OPERATION_TIMEOUT_MS', 12000, 500, 120000);
  await mkdir(out, { recursive: true });
  let browser = null;
  const pageUrl = renderer => `${baseUrl}${renderer === 'three' ? 'three.html' : 'index.html'}`;
  const sourceFiles = ['prototype.js', 'three-prototype.js'];
  const localHashes = {};
  for (const file of sourceFiles) localHashes[file] = createHash('sha256').update(await readFile(resolve(here, file))).digest('hex');
  const repoRoot = resolve(here, '../../..');
  const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  const gitStatus = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: repoRoot, encoding: 'utf8' });
  const report = { startedAt: new Date().toISOString(), host: { platform: os.platform(), release: os.release(), arch: os.arch(), cpu: os.cpus()[0]?.model }, git: { head: gitHead, dirty: gitStatus.length > 0, dirtyStatusSha256: createHash('sha256').update(gitStatus).digest('hex'), dirtyEntries: gitStatus ? gitStatus.trimEnd().split(/\r?\n/).length : 0 }, browser: null, runtime: { expectedJsxGraph: '1.14.1', expectedThreeRevision: '180', localSourceSha256: localHashes }, url: baseUrl, parameters: { renderers, kinds, isos, tilings, viewports, gestures, triangleModes, repeats, samples, operationTimeout }, caveats: ['Headless Chromium on this host; narrow viewport is an emulation, not a physical phone.', 'rAF cadence and input-dispatch-to-next-rAF are proxies; they do not measure compositor presentation or pixel-visible latency.', 'The continuous rAF series includes time between host-dispatched samples and JSON writes; inspect raw per-event samples for the interaction response.', 'UV samples time the named setParameter/update path and are reported separately from pointer gestures.', 'Per-renderer medians describe these prototypes and are not interchangeable operation-cost comparisons.'], runs: [], failures: [] };
  await save('measure.json', report);
  const planned = renderers.reduce((n, renderer) => n + kinds.reduce((m, kind) => m + (kind === 'triangular' && renderer === 'jsx' ? triangleModes.length : 1) * isos.length * tilings.length * viewports.length * gestures.length * repeats, 0), 0);
  await save('progress.json', { at: report.startedAt, status: 'started', completed: 0, planned });
  const stats = a => { const s = [...a].sort((x, y) => x - y); return { count: a.length, median: s[Math.floor(s.length / 2)] ?? null, p95: s[Math.min(s.length - 1, Math.floor(s.length * .95))] ?? null, max: s.at(-1) ?? null }; };
  const bounded = (promise, label) => new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => rejectPromise(Error(`${label} exceeded ${operationTimeout} ms`)), operationTimeout);
    Promise.resolve(promise).then(value => { clearTimeout(timer); resolvePromise(value); }, error => { clearTimeout(timer); rejectPromise(error); });
  });
  try {
    browser = await chromium.launch({ headless: true });
    report.browser = { name: 'Chromium', version: browser.version() };
    await save('measure.json', report);
    for (const renderer of renderers) for (const kind of kinds) for (const iso of isos) for (const tiling of tilings) for (const viewportName of viewports) for (const gesture of gestures) for (const triangleMode of kind === 'triangular' && renderer === 'jsx' ? triangleModes : ['n/a']) for (let repeat = 1; repeat <= repeats; repeat++) {
      const viewport = viewportName === 'desktop' ? { width: 1440, height: 1000 } : { width: 390, height: 844 };
      const key = { renderer, kind, triangleMode: kind === 'triangular' ? renderer === 'jsx' ? triangleMode : 'three-surface' : 'n/a', iso: Number(iso), tiling: Number(tiling), viewportName, viewport, gesture, repeat };
      const entry = { ...key, status: 'running', startedAt: new Date().toISOString(), samples: [] };
      report.runs.push(entry); await save('measure.json', report); await save('progress.json', { at: new Date().toISOString(), status: 'running', current: key, completed: report.runs.length - 1 });
      if (kind === 'teapot' && ['drag', 'uv'].includes(gesture)) {
        Object.assign(entry, { status: 'skipped', reason: gesture === 'drag' ? 'Both prototype teapot views have no draggable control net.' : 'Neither teapot view has a single patch parameter domain for UV updates.' });
        await save('measure.json', report); await save('progress.json', { at: new Date().toISOString(), status: 'running', current: key, completed: report.runs.filter(x => x.status !== 'running').length }); continue;
      }
      let context = null, contextClosed = false;
      const errors = [];
      try {
        const contextPromise = browser.newContext({ viewport });
        contextPromise.then(lateContext => { context = lateContext; if (contextClosed) lateContext.close().catch(() => {}); }, () => {});
        context = await bounded(contextPromise, 'new context');
        const page = await bounded(context.newPage(), 'new page');
        page.on('pageerror', e => errors.push(e.message));
        await bounded(page.goto(pageUrl(renderer), { waitUntil: 'load', timeout: operationTimeout }), 'navigation');
        await bounded(page.waitForFunction(() => window.BezierPatchSpike?.ready(), null, { timeout: operationTimeout }), 'prototype readiness');
        const htmlName = renderer === 'three' ? 'three.html' : 'index.html';
        const assetSpecs = renderer === 'three' ? [
          [htmlName, htmlName], ['three-prototype.js', 'three-prototype.js'], ['three-style.css', 'three-style.css'],
          ['../../../.command-logs/patches-three-vendor/three.module.js', '../../../.command-logs/patches-three-vendor/three.module.js'],
          ['../../../.command-logs/patches-three-vendor/teapot-data.json', '../../../.command-logs/patches-three-vendor/teapot-data.json']
        ] : [
          [htmlName, htmlName], ['prototype.js', 'prototype.js'], ['style.css', 'style.css'], ['teapot-data.js', 'teapot-data.js'],
          ['../../../node_modules/jsxgraph/distrib/jsxgraphcore.js', '../../../node_modules/jsxgraph/distrib/jsxgraphcore.js'],
          ['../../../node_modules/jsxgraph/distrib/jsxgraph.css', '../../../node_modules/jsxgraph/distrib/jsxgraph.css']
        ];
        const servedHashes = {}, worktreeHashes = {};
        for (const [urlPath, localPath] of assetSpecs) {
          await save('progress.json', { at: new Date().toISOString(), status: 'running', current: key, operation: 'verify-served-source', file: urlPath, completed: report.runs.length - 1 });
          const assetUrl = new URL(urlPath, page.url()).href;
          const response = await bounded(page.request.get(assetUrl, { timeout: operationTimeout }), `fetch served ${urlPath}`);
          if (!response.ok()) throw Error(`Could not fetch served ${urlPath}: ${response.status()}`);
          const servedAsset = await response.body();
          servedHashes[urlPath] = createHash('sha256').update(servedAsset).digest('hex');
          const localAsset = await readFile(resolve(here, localPath));
          worktreeHashes[urlPath] = createHash('sha256').update(localAsset).digest('hex');
          if (servedHashes[urlPath] !== worktreeHashes[urlPath]) throw Error(`Served asset hash differs from worktree ${localPath}`);
        }
        entry.sourceSha256 = { served: servedHashes, worktree: worktreeHashes, matchesWorktree: true };
        const setup = await bounded(page.evaluate(({ kind, iso, tiling, triangleMode }) => {
          const sel = (id, value) => { const e = document.querySelector(`#${id}`); if (!e) throw Error(`Missing #${id}`); e.value = value; e.dispatchEvent(new Event('change', { bubbles: true })); };
          sel('kind', kind); if (kind === 'triangular' && window.JXG) sel('triangle-renderer', triangleMode); sel('iso', String(iso)); sel('tiling', String(tiling));
          for (const [id, checked] of [['show-net', true], ['show-iso', true]]) { const e = document.querySelector(`#${id}`); e.checked = checked; e.dispatchEvent(new Event('change', { bubbles: true })); }
          BezierPatchSpike.camera('isometric');
          return { snapshot: BezierPatchSpike.snapshot(), runtime: { jsxgraph: window.JXG?.version ?? null } };
        }, { kind, iso: Number(iso), tiling: Number(tiling), triangleMode: key.triangleMode }), 'configuration');
        const threeRevision = renderer === 'three' ? await bounded(page.evaluate(async () => (await import(new URL('../../../.command-logs/patches-three-vendor/three.module.js', location.href))).REVISION), 'read three.js revision') : null;
        entry.runtime = { ...setup.runtime, threeRevision };
        if (renderer === 'jsx' && setup.runtime.jsxgraph !== '1.14.1') throw Error(`Wrong JSXGraph runtime: ${setup.runtime.jsxgraph}`);
        if (renderer === 'three' && threeRevision !== '180') throw Error(`Wrong three.js REVISION: ${threeRevision}`);
        const before = setup.snapshot;
        const started = await bounded(page.evaluate(({ gesture, samples }) => {
          const box = document.querySelector('#main-board').getBoundingClientRect();
          let target;
          if (gesture === 'drag') {
            const info = BezierPatchSpike.pointInfo(0); if (!info?.draggable) throw Error('Point 0 is not draggable');
            if (window.JXG) { const board = Object.values(JXG.boards).find(b => b.containerObj.id === 'main-board'); target = board.objects[info.id].element2D.rendNode.getBoundingClientRect(); }
            else { const label = [...document.querySelectorAll('#labels *')].find(e => e.textContent.trim() === String(info.id)); if (!label) throw Error('Indexed point label is unavailable'); target = label.getBoundingClientRect(); }
          }
          const x = target ? target.x + target.width / 2 : box.x + box.width - 34, y = target ? target.y + target.height / 2 : box.y + 34;
          window.__probe = { raf: [], events: [], last: null, active: true, start: performance.now() };
          const tick = t => { const p = window.__probe; if (!p.active) return; if (p.last !== null) p.raf.push(t - p.last); p.last = t; requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
          const mark = e => { if (e.type === 'pointermove' && !e.buttons) return; const t = performance.now(), type = e.type; requestAnimationFrame(() => { const p = window.__probe; p.events.push({ type, ms: performance.now() - t, at: new Date().toISOString(), state: BezierPatchSpike.snapshot() }); }); };
          for (const type of ['pointerdown', 'pointermove', 'pointerup']) document.querySelector('#main-board').addEventListener(type, mark, true);
          return { x, y, before: BezierPatchSpike.snapshot() };
        }, { gesture, samples }), 'probe setup');
        const duration = [];
        if (gesture === 'uv') {
          if (kind === 'teapot') throw Error('UV operation unavailable for teapot: no single patch parameter domain.');
          for (let i = 0; i < samples; i++) {
            await save('progress.json', { at: new Date().toISOString(), status: 'running', current: key, operation: 'uv', sample: i + 1, samples, completed: report.runs.length - 1 });
            const v = await bounded(page.evaluate(async ({ i, samples }) => { await new Promise(requestAnimationFrame); const start = performance.now(); BezierPatchSpike.setParameter(.12 + .38 * i / (samples - 1), .12 + .22 * i / (samples - 1)); const cost = performance.now() - start; await new Promise(requestAnimationFrame); return { cost, state: BezierPatchSpike.snapshot() }; }, { i, samples }), 'UV sample');
            duration.push(v.cost); entry.samples.push({ at: new Date().toISOString(), operationCostMs: v.cost, state: v.state.uv });
            await save('measure.json', report);
          }
        } else {
          await bounded(page.mouse.move(started.x, started.y), 'pointer positioning'); await bounded(page.mouse.down(), 'pointer down');
          for (let i = 1; i <= samples; i++) {
            await save('progress.json', { at: new Date().toISOString(), status: 'running', current: key, operation: gesture, sample: i, samples, completed: report.runs.length - 1 });
            const x = gesture === 'drag' ? started.x + 28 * Math.sin(i / samples * Math.PI) : started.x - i * 7;
            const y = gesture === 'drag' ? started.y + i * 3 : started.y + i * 6;
            await bounded(page.evaluate(() => new Promise(requestAnimationFrame)), 'sample rAF gate');
            await bounded(page.mouse.move(x, y), `${gesture} sample ${i}`);
            const sampleState = await bounded(page.evaluate(() => BezierPatchSpike.snapshot()), 'sample state');
            entry.samples.push({ at: new Date().toISOString(), x, y, state: gesture === 'drag' ? sampleState.net[0] : sampleState.camera }); await save('measure.json', report);
          }
          await bounded(page.mouse.up(), 'pointer up');
          await bounded(page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))), 'settle frames');
        }
        const result = await bounded(page.evaluate(() => { const p = window.__probe; p.active = false; return { after: BezierPatchSpike.snapshot(), raf: p.raf, inputToNextRaf: p.events }; }), 'collect results');
        const geometry = await bounded(page.evaluate(async ({ kind, triangleMode, tiling }) => {
          const toggle = id => { const el = document.querySelector(`#${id}`); el.checked = false; el.dispatchEvent(new Event('change', { bubbles: true })); };
          toggle('show-net'); toggle('show-iso');
          let labelRect = null;
          if (kind !== 'teapot') {
            BezierPatchSpike.setParameter(...(kind === 'triangular' ? [.33, .33] : [.5, .5]));
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            const label = [...document.querySelectorAll('#labels .scene-label')].find(el => el.textContent === 'P(u,v)');
            if (label) labelRect = label.getBoundingClientRect().toJSON();
            document.querySelector('#labels')?.style.setProperty('visibility', 'hidden');
            if (!window.JXG && !labelRect) return { kind: 'three-surface-interior-pixels', surfaceFaces: BezierPatchSpike.counts().meshTriangles, patchInteriorPixels: 0, reason: 'Projected interior parameter label missing.' };
          }
          if (window.JXG) {
            const board = Object.values(JXG.boards).find(b => b.containerObj.id === 'main-board');
            const ownerType = kind === 'triangular' && triangleMode === 'mesh' ? 'polygon3d' : 'surface3d';
            const owners = Object.values(board?.objects || {}).filter(o => o.elType === ownerType), primitives = new Set();
            for (const owner of owners) {
              const root = owner.element2D?.rendNode || owner.rendNode;
              if (!root) continue;
              if (root.matches?.('path,polygon,polyline') && ((root.getAttribute('d') || root.getAttribute('points') || '').length > 2)) primitives.add(root);
              for (const node of root.querySelectorAll?.('path,polygon,polyline') || []) if (((node.getAttribute('d') || node.getAttribute('points') || '').length > 2)) primitives.add(node);
            }
            return { kind: 'jsx-owned-surface-geometry', ownerType, faceOrSurfaceOwners: owners.length, renderedOwnerPrimitives: primitives.size };
          }
          const canvas = document.querySelector('#main-board canvas'), gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl'), faces = BezierPatchSpike.counts().meshTriangles;
          if (!canvas || !gl) return { kind: 'three-surface-interior-pixels', surfaceFaces: faces, patchInteriorPixels: 0 };
          const pixels = new Uint8Array(4 * canvas.width * canvas.height); gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          const area = labelRect && kind !== 'teapot' ? (() => {
            const box = canvas.getBoundingClientRect(), sx = canvas.width / box.width, sy = canvas.height / box.height;
            const cx = (labelRect.x + labelRect.width / 2 - box.x) * sx, cy = canvas.height - (labelRect.y + labelRect.height / 2 - box.y) * sy, radius = 18;
            let colored = 0, sampled = 0;
            for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(canvas.height, Math.ceil(cy + radius)); y++) for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(canvas.width, Math.ceil(cx + radius)); x++) {
              const d = Math.hypot(x - cx, y - cy); if (d < 7 || d > radius) continue;
              const i = (y * canvas.width + x) * 4; sampled++; if (pixels[i] < 250 || pixels[i + 1] < 246 || pixels[i + 2] < 238) colored++;
            }
            return { colored, sampled };
          })() : (() => { let colored = 0, sampled = 0; for (let i = 0; i < canvas.width * canvas.height; i += 128) { const j = i * 4; sampled++; if (pixels[j] < 250 || pixels[j + 1] < 246 || pixels[j + 2] < 238) colored++; } return { colored, sampled }; })();
          return { kind: 'three-surface-interior-pixels', surfaceFaces: faces, patchInteriorPixels: area.colored, sampledPixels: area.sampled };
        }, { kind, triangleMode: key.triangleMode, tiling: Number(tiling) }), 'verify patch geometry');
        const moved = gesture === 'drag' ? before.net[0]?.some((v, i) => Math.abs(v - result.after.net[0][i]) > .001) : gesture === 'orbit' ? JSON.stringify(before.camera) !== JSON.stringify(result.after.camera) : before.uv.some((v, i) => Math.abs(v - result.after.uv[i]) > .001);
        const dragCameraFixed = gesture !== 'drag' || JSON.stringify(before.camera) === JSON.stringify(result.after.camera);
        const expectedFaces = kind === 'teapot' ? 64 * Number(tiling) ** 2 : kind === 'triangular' ? Number(tiling) ** 2 : 2 * Number(tiling) ** 2;
        const geometryPresent = geometry.kind === 'jsx-owned-surface-geometry'
          ? geometry.faceOrSurfaceOwners > 0 && geometry.renderedOwnerPrimitives > 0 && (key.triangleMode !== 'mesh' || geometry.faceOrSurfaceOwners >= Number(tiling) ** 2)
          : geometry.surfaceFaces >= expectedFaces && geometry.patchInteriorPixels > 20;
        if (!moved || !dragCameraFixed || !result.raf.length || !geometryPresent) throw Error(`Non-vacuous measurement failed: moved=${moved}, dragCameraFixed=${dragCameraFixed}, rAF=${result.raf.length}, patchGeometry=${JSON.stringify(geometry)}`);
        Object.assign(entry, { status: 'complete', finishedAt: new Date().toISOString(), changedState: moved, dragCameraFixed, finalState: gesture === 'drag' ? result.after.net[0] : gesture === 'orbit' ? result.after.camera : result.after.uv, frameIntervalMs: stats(result.raf), rawFrameIntervalsMs: result.raf, inputToNextRafMs: stats(result.inputToNextRaf.map(x => x.ms)), rawInputToNextRaf: result.inputToNextRaf, operationCostMs: duration.length ? stats(duration) : undefined, patchGeometry: geometry });
      } catch (error) { Object.assign(entry, { status: 'failed', failure: String(error?.stack || error), finishedAt: new Date().toISOString() }); report.failures.push({ key, failure: entry.failure }); }
      finally { contextClosed = true; if (context) await bounded(context.close(), 'context close').catch(e => report.failures.push({ key, failure: `Context cleanup: ${e.message}` })); }
      await save('measure.json', report); await save('progress.json', { at: new Date().toISOString(), status: 'running', current: key, completed: report.runs.filter(x => x.status !== 'running').length });
      if (errors.length) report.failures.push({ key, failure: errors.join('\n') });
    }
  } catch (error) {
    report.failures.push({ failure: String(error?.stack || error) });
  } finally {
    await browser?.close().catch(() => {});
    report.finishedAt = new Date().toISOString();
    for (const run of report.runs) if (run.status === 'running') { run.status = 'failed'; run.finishedAt = report.finishedAt; run.failure = 'Runner ended before this run completed; see top-level failures.'; }
    await save('measure.json', report);
    await save('progress.json', { at: report.finishedAt, status: report.failures.length ? 'finished-with-failures' : 'finished', completed: report.runs.filter(x => x.status !== 'running').length, total: report.runs.length });
    console.log(JSON.stringify({ out, runs: report.runs.length, failures: report.failures.length, browser: report.browser }));
    if (report.failures.length) process.exitCode = 1;
  }
}
