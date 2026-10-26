// Tiny same-scene comparison for the parameter-construction batching candidate.
// Run only in the handler-owned exclusive browser window.
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const out = resolve(process.env.BEZEG_BATCH_OUT || '.command-logs/jsx-batching');
const baseUrl = process.env.BEZEG_SPIKE_URL || 'http://127.0.0.1:4181/docs/prototypes/bezier-patches/';
const hardMs = 120000;
const operationMs = 30000;
const baselineRevision = '0ec2f8f7e641e6c63b9908bd2d26484da5183d43';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const candidate = await readFile(resolve(here, 'prototype.js'), 'utf8');
const baseline = execFileSync('git', ['show', `${baselineRevision}:docs/prototypes/bezier-patches/prototype.js`], { cwd: root, encoding: 'utf8' });
const sha = s => createHash('sha256').update(s).digest('hex');
const report = { startedAt: new Date().toISOString(), gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), baselineRevision, baseUrl, expectedJsxGraph: '1.14.1', viewport: { width: 1280, height: 900 }, configuration: { iso: 8, tiling: 8, warmups: 1, samples: 3, operationTimeoutMs: operationMs, totalDeadlineMs: hardMs }, sourceSha256: { baseline: sha(baseline), candidate: sha(candidate) }, rendererAssetSha256: {}, runs: [], failures: [], caveats: ['Headless Chromium on desktop; this tiny comparison does not establish renderer or interaction budgets.', 'Operation wall time includes construction and the synchronous board flush; it excludes the following animation frame.', 'Update-method counters are call counts, not pixel-presentation measurements.', 'A 120 second in-process deadline closes Chromium; it is not an OS process-tree kill guarantee.'] };
await mkdir(out, { recursive: true });
const save = () => writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
const mathCheck = (net, kind, u, v) => {
  const binom = (n, k) => { let x = 1; for (let i = 1; i <= k; i++) x = x * (n - i + 1) / i; return x; };
  const bernstein = (n, i, t) => binom(n, i) * (1 - t) ** (n - i) * t ** i;
  if (kind === 'tensor') return [0, 1, 2].map(d => net.reduce((sum, p, i) => sum + p.reduce((row, q, j) => row + bernstein(3, i, u) * bernstein(3, j, v) * q[d], 0), 0));
  const w = 1 - u - v; let at = 0, p = [0, 0, 0];
  for (let i = 3; i >= 0; i--) for (let j = 3 - i; j >= 0; j--) {
    const k = 3 - i - j, weight = binom(3, i) * binom(3 - i, j) * u ** i * v ** j * w ** k;
    for (let d = 0; d < 3; d++) p[d] += weight * net[at][d]; at++;
  }
  return p;
};
const instrument = `(() => { window.__batchProbe={calls:[],active:false}; const proto=JXG.Board.prototype; for (const name of ['fullUpdate','unsuspendUpdate','updateElements']) { const original=proto[name]; if(typeof original!=='function') continue; proto[name]=function(...args){ if(window.__batchProbe.active){const start=performance.now();try{return original.apply(this,args)}finally{window.__batchProbe.calls.push({name,ms:performance.now()-start});}} return original.apply(this,args); }; } })();\n`;
const bounded = (promise, label) => new Promise((resolvePromise, rejectPromise) => {
  const timer = setTimeout(() => rejectPromise(Error(`${label} exceeded ${operationMs} ms`)), operationMs);
  Promise.resolve(promise).then(value => { clearTimeout(timer); resolvePromise(value); }, error => { clearTimeout(timer); rejectPromise(error); });
});

const browser = await chromium.launch({ headless: true });
const hardTimer = setTimeout(() => { report.failures.push('120 second hard deadline exceeded'); void save(); void browser.close(); }, hardMs);
try {
  report.browser = { name: 'Chromium', version: browser.version() };
  const assetPaths = ['../../../node_modules/jsxgraph/distrib/jsxgraphcore.js', '../../../node_modules/jsxgraph/distrib/jsxgraph.css'];
  for (const assetPath of assetPaths) {
    const response = await fetch(new URL(assetPath, baseUrl));
    if (!response.ok) throw Error(`Could not read served JSXGraph asset ${assetPath}: HTTP ${response.status}`);
    const served = Buffer.from(await response.arrayBuffer());
    const local = await readFile(resolve(here, assetPath));
    const servedHash = sha(served), localHash = sha(local);
    report.rendererAssetSha256[assetPath] = { served: servedHash, local: localHash };
    if (servedHash !== localHash) throw Error(`Served JSXGraph asset hash differs from pinned local file: ${assetPath}`);
  }
  await save();
  for (const mode of ['baseline', 'candidate']) for (const kind of ['tensor', 'triangular']) {
    const context = await browser.newContext({ viewport: report.viewport });
    const page = await context.newPage();
    const source = mode === 'baseline' ? baseline : candidate;
    let servedPrototypeSha256 = null;
    await page.route('**/prototype.js', route => { const body = instrument + source; servedPrototypeSha256 = sha(body); return route.fulfill({ status: 200, contentType: 'text/javascript', body }); });
    await bounded(page.goto(baseUrl + 'index.html', { waitUntil: 'networkidle', timeout: operationMs }), `${mode}/${kind} navigation`);
    await page.waitForFunction(() => window.BezierPatchSpike?.ready(), null, { timeout: operationMs });
    const runtime = await page.evaluate(() => JXG.version);
    if (runtime !== '1.14.1') throw Error(`Expected JSXGraph 1.14.1, received ${runtime}`);
    if (kind === 'triangular') {
      await page.selectOption('#kind', 'triangular');
      await page.selectOption('#triangle-renderer', 'mesh');
    }
    const result = await bounded(page.evaluate(async ({ mode, kind }) => {
      const board = Object.values(JXG.boards).find(b => b.containerObj.id === 'main-board');
      const stats = () => {
        const objs = Object.values(board.objects);
        const surfaces = objs.filter(o => o.elType === 'surface3d' || o.elType === 'polygon3d');
        const primitives = new Set();
        for (const owner of surfaces) {
          const root = owner.element2D?.rendNode || owner.rendNode;
          if (root?.matches?.('path,polygon,polyline') && ((root.getAttribute('d') || root.getAttribute('points') || '').length > 2)) primitives.add(root);
          for (const node of root?.querySelectorAll?.('path,polygon,polyline') || []) if (((node.getAttribute('d') || node.getAttribute('points') || '').length > 2)) primitives.add(node);
        }
        const target = objs.find(o => o.elType === 'point3d' && (o.visProp?.name === 'P(u,v)' || o.name === 'P(u,v)'));
        return { objectCount: objs.length, surfaceOwnerCount: surfaces.length, renderedOwnerPrimitiveCount: primitives.size, targetPoint: target ? [target.X(), target.Y(), target.Z()] : null, uv: BezierPatchSpike.snapshot().uv, net: BezierPatchSpike.snapshot().net };
      };
      const times = [], batches = [];
      for (let i = 0; i < 4; i++) {
        window.__batchProbe.calls.length = 0; window.__batchProbe.active = true;
        const start = performance.now();
        BezierPatchSpike.setParameter(.21 + i * .09, kind === 'tensor' ? .43 + i * .025 : .24 + i * .025);
        const durationMs = performance.now() - start;
        window.__batchProbe.active = false;
        await new Promise(requestAnimationFrame);
        const state = stats();
        if (i > 0) { times.push(durationMs); batches.push({ durationMs, calls: [...window.__batchProbe.calls], state }); }
        else window.__batchProbe.calls.length = 0;
      }
      return { mode, kind, timesMs: times, batches, baselineOrCandidate: mode };
    }, { mode, kind }), `${mode}/${kind} parameter sequence`);
    if (!servedPrototypeSha256) throw Error(`${mode}/${kind}: prototype source was not intercepted`);
    result.runtime = runtime;
    result.servedPrototypeSha256 = servedPrototypeSha256;
    const sampleStates = result.batches.map(x => x.state);
    for (let i = 0; i < sampleStates.length; i++) {
      const s = sampleStates[i], u = .21 + (i + 1) * .09, v = kind === 'tensor' ? .43 + (i + 1) * .025 : .24 + (i + 1) * .025;
      const expected = mathCheck(s.net, kind, u, v);
      if (!s.targetPoint) throw Error(`${mode}/${kind}: actual construction target point was not found in board ownership`);
      if (expected.some((x, d) => Math.abs(x - s.targetPoint[d]) > 1e-8)) throw Error(`${mode}/${kind}: rendered construction target differs from Bernstein evaluation`);
      if (!s.surfaceOwnerCount || !s.renderedOwnerPrimitiveCount) throw Error(`${mode}/${kind}: actual patch surface/mesh has no rendered owner primitives`);
    }
    if (new Set(sampleStates.map(x => x.objectCount)).size !== 1) throw Error(`${mode}/${kind}: board object count grew across parameter rebuilds`);
    report.runs.push({ ...result, medianMs: [...result.timesMs].sort((a,b)=>a-b)[1], minMs: Math.min(...result.timesMs), maxMs: Math.max(...result.timesMs), stableBoardObjectCount: sampleStates[0].objectCount, renderedOwnerPrimitiveCount: sampleStates[0].renderedOwnerPrimitiveCount });
    if (mode === 'candidate') await page.screenshot({ path: resolve(out, `${kind}-candidate.png`), fullPage: true });
    await save(); await context.close();
  }
} catch (error) {
  report.failures.push(String(error?.stack || error)); await save(); throw error;
} finally {
  clearTimeout(hardTimer); await browser.close(); await save();
}
