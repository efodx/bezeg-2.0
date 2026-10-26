const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '../../..');
const args = process.argv.slice(2);
function arg(name, fallback) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; }
const phase = arg('--phase', 'baseline');
const sourceRoot = path.resolve(arg('--checkout', root));
const baseUrl = arg('--base-url', 'http://127.0.0.1:4396/bezeg-2.0').replace(/\/$/, '');
const output = path.join(__dirname, 'browser-parity', phase);
const viewport = {width: 1440, height: 960};
const routes = [
  {id: 'bezier', path: '/bezier/curve'},
  {id: 'decasteljau-mathjax', path: '/bezier/decasteljau'},
  {id: 'rational', path: '/rational/base'},
  {id: 'spline-c1', path: '/spline/c1spline'},
  {id: 'ph-cubic', path: '/ph/cubic'},
  {id: 'area-between-curves', path: '/functions/area-between'},
];
const round = n => Number(Number(n).toFixed(5));
function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)] : null;
}
async function ready(page, route) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseUrl + route, {waitUntil: 'domcontentloaded', timeout: 60000});
  await page.locator('#jgbox').waitFor({state: 'visible', timeout: 30000});
  await page.waitForFunction(() => {
    const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === 'jgbox');
    return Boolean(board && board.containerObj?.clientWidth > 200 && board.containerObj?.clientHeight > 200 && board.objectsList?.length);
  }, {timeout: 30000});
  await page.evaluate(async () => {
    await window.MathJax?.startup?.promise;
    await window.MathJax?.typesetPromise?.();
    await document.fonts.ready;
  });
  await page.waitForTimeout(120);
  return errors;
}
async function boardSnapshot(page) {
  return page.evaluate(() => {
    const container = document.getElementById('jgbox');
    const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === 'jgbox');
    if (!board) return {container: 'jgbox', missing: true};
    const objects = Object.values(board.objects || {}).map(object => {
      let xy;
      try { if (typeof object.X === 'function' && typeof object.Y === 'function') xy = [Number(object.X()), Number(object.Y())]; }
      catch (_) { /* Some JSXGraph objects do not expose evaluable coordinates. */ }
      return {type: object.elType, name: object.name || '', xy: xy?.every(Number.isFinite) ? xy.map(value => Number(value.toFixed(5))) : null,
        visible: object.visProp?.visible !== false && object.visProp?.visible !== 'false'};
    });
    const rect = container.getBoundingClientRect();
    return {container: 'jgbox', size: {width: rect.width, height: rect.height}, boundingBox: board.getBoundingBox().map(Number),
      objectCount: objects.length, visibleObjectCount: objects.filter(object => object.visible).length,
      curveCount: objects.filter(object => object.type === 'curve' && object.visible).length,
      pointCount: objects.filter(object => object.type === 'point' && object.visible).length,
      labelCount: container.querySelectorAll('.JXGtext').length, mathJaxCount: container.querySelectorAll('mjx-container').length, objects};
  });
}
async function pointTarget(page) {
  return page.evaluate(() => {
    const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === 'jgbox');
    const candidates = Object.values(board?.objects || {}).filter(object => object.elType === 'point' && object.rendNode?.isConnected && object.visProp?.visible !== false && object.visProp?.fixed !== true && typeof object.X === 'function' && typeof object.Y === 'function').map(object => {
      const node = object.rendNode.querySelector?.('circle') || object.rendNode;
      const rect = node.getBoundingClientRect();
      const x = Number(object.X()), y = Number(object.Y());
      return {id: object.id, name: object.name || object.id, xy: [x, y], screen: [rect.left + rect.width / 2, rect.top + rect.height / 2], distance: Math.hypot(x + 4, y + 3)};
    }).filter(point => Number.isFinite(point.screen[0]) && Number.isFinite(point.screen[1]));
    candidates.sort((a, b) => a.distance - b.distance);
    if (!candidates[0] || candidates[0].distance > 0.25) throw new Error('Could not find the default free Bézier point near (-4,-3): ' + JSON.stringify(candidates.slice(0, 3)));
    return candidates[0];
  });
}
async function installTiming(page) {
  await page.evaluate(() => {
    const state = window.__browserParityTiming = {active: false, raf: 0, updates: [], frames: [], lastFrame: 0, pointerMoves: 0};
    document.addEventListener('pointermove', () => { if (state.active) state.pointerMoves++; }, true);
    for (const board of Object.values(window.JXG?.boards || {})) {
      if (typeof board.update !== 'function') continue;
      const original = board.update;
      board.update = function(...args) {
        if (!state.active) return original.apply(this, args);
        const start = performance.now();
        try { return original.apply(this, args); }
        finally { state.updates.push(performance.now() - start); }
      };
    }
    state.begin = () => {
      state.active = true; state.updates = []; state.frames = []; state.pointerMoves = 0; state.lastFrame = 0;
      const frame = now => {
        if (!state.active) return;
        if (state.lastFrame) state.frames.push(now - state.lastFrame);
        state.lastFrame = now; state.raf = requestAnimationFrame(frame);
      };
      state.raf = requestAnimationFrame(frame);
    };
    state.end = () => {
      state.active = false; cancelAnimationFrame(state.raf); state.raf = 0;
      return {synchronousBoardUpdateDurationsMs: state.updates.map(value => Number(value.toFixed(5))), rafFrameIntervalsMs: state.frames.map(value => Number(value.toFixed(5))), pointerMoves: state.pointerMoves};
    };
  });
}
async function dragTrial(browser, index) {
  const context = await browser.newContext({viewport, deviceScaleFactor: 1, locale: 'sl-SI', colorScheme: 'light', reducedMotion: 'reduce', timezoneId: 'Europe/Ljubljana'});
  const page = await context.newPage();
  try {
    const errors = await ready(page, '/bezier/curve');
    const beforeBoard = await boardSnapshot(page);
    if (beforeBoard.missing || beforeBoard.visibleObjectCount === 0 || beforeBoard.curveCount === 0) throw new Error('Bézier board was empty before drag');
    const before = await pointTarget(page);
    await installTiming(page);
    await page.mouse.move(before.screen[0], before.screen[1]);
    await page.mouse.down();
    await page.evaluate(() => window.__browserParityTiming.begin());
    for (let step = 1; step <= 12; step++) {
      await page.mouse.move(before.screen[0] + 42 * step / 12, before.screen[1] - 24 * step / 12);
      // Let each delivered move reach a frame instead of coalescing the last move with pointer-up.
      await page.waitForTimeout(20);
    }
    await page.mouse.up();
    const timing = await page.evaluate(() => window.__browserParityTiming.end());
    await page.waitForTimeout(120);
    const after = await page.evaluate(id => {
      const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === 'jgbox');
      const object = board?.objects?.[id];
      return object && typeof object.X === 'function' && typeof object.Y === 'function' ? [Number(object.X()), Number(object.Y())] : null;
    }, before.id);
    if (!after || Math.hypot(after[0] - before.xy[0], after[1] - before.xy[1]) < 0.03) throw new Error('Real pointer drag did not move the selected control point: ' + JSON.stringify({before: before.xy, after}));
    return {trial: index, path: '/bezier/curve', pointerDeltaPx: [42, -24], point: before.name, pointId: before.id, beforeUserXY: before.xy.map(round), afterUserXY: after.map(round), displacement: round(Math.hypot(after[0] - before.xy[0], after[1] - before.xy[1])), pointerMoves: timing.pointerMoves, boardUpdateCount: timing.synchronousBoardUpdateDurationsMs.length,
      boardUpdateMedianMs: percentile(timing.synchronousBoardUpdateDurationsMs, 0.5), boardUpdateP95Ms: percentile(timing.synchronousBoardUpdateDurationsMs, 0.95), boardUpdateDurationsMs: timing.synchronousBoardUpdateDurationsMs,
      rafFrameCount: timing.rafFrameIntervalsMs.length, rafMedianMs: percentile(timing.rafFrameIntervalsMs, 0.5), rafP95Ms: percentile(timing.rafFrameIntervalsMs, 0.95), rafFrameIntervalsMs: timing.rafFrameIntervalsMs,
      pageErrors: errors, beforeBoard: {objectCount: beforeBoard.objectCount, curveCount: beforeBoard.curveCount}};
  } finally { await context.close(); }
}
async function assetProvenance() {
  const shell = await fetch(baseUrl + '/');
  if (!shell.ok) throw new Error('Production preview shell HTTP ' + shell.status);
  const html = await shell.text();
  const refs = [...html.matchAll(/(?:src|href)="([^"]+assets\/index-[^"]+\.(?:js|css))"/g)].map(match => match[1]);
  const result = [];
  for (const ref of refs) {
    const response = await fetch(new URL(ref, shell.url));
    const bytes = Buffer.from(await response.arrayBuffer());
    const name = path.basename(new URL(ref, shell.url).pathname);
    const servedHash = crypto.createHash('sha256').update(bytes).digest('hex');
    const localPath = path.join(sourceRoot, 'build', 'assets', name);
    const localHash = fs.existsSync(localPath) ? crypto.createHash('sha256').update(fs.readFileSync(localPath)).digest('hex') : null;
    result.push({name, servedHash, localDistHash: localHash, matchesLocalDist: servedHash === localHash});
  }
  if (!result.length) throw new Error('Could not identify Vite entry assets in preview shell');
  if (result.some(item => !item.matchesLocalDist)) throw new Error('Preview assets do not match supplied checkout');
  return {shellStatus: shell.status, entryAssets: result};
}
async function main() {
  fs.mkdirSync(output, {recursive: true});
  const browser = await chromium.launch({headless: true});
  const report = {phase, targetUrl: baseUrl, checkout: sourceRoot, revision: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: sourceRoot, encoding: 'utf8'}).trim(), dirty: execFileSync('git', ['status', '--short'], {cwd: sourceRoot, encoding: 'utf8'}).trim().split(/\r?\n/).filter(Boolean), packageJsxgraph: require(path.join(sourceRoot, 'node_modules/jsxgraph/package.json')).version, lockJsxgraph: JSON.parse(fs.readFileSync(path.join(sourceRoot, 'package-lock.json'), 'utf8')).packages?.['node_modules/jsxgraph']?.version, browser: {name: 'Playwright Chromium', version: browser.version(), headless: true}, device: {platform: os.platform(), arch: os.arch(), hostname: os.hostname()}, viewport, locale: 'sl-SI', colorScheme: 'light', reducedMotion: 'reduce', startedAt: new Date().toISOString(), assetProvenance: await assetProvenance(), screenshots: [], dragTrials: []};
  try {
    for (const route of routes) {
      const context = await browser.newContext({viewport, deviceScaleFactor: 1, locale: 'sl-SI', colorScheme: 'light', reducedMotion: 'reduce', timezoneId: 'Europe/Ljubljana'});
      const page = await context.newPage();
      try {
        const pageErrors = await ready(page, route.path);
        const board = await boardSnapshot(page);
        if (board.missing || board.visibleObjectCount === 0) throw new Error(route.id + ' board is empty');
        const screenshot = path.join(output, route.id + '.png');
        await page.screenshot({path: screenshot, fullPage: true, animations: 'disabled', caret: 'hide'});
        report.screenshots.push({id: route.id, path: path.relative(root, screenshot).replaceAll('\\', '/'), route: route.path, board, pageErrors});
      } finally { await context.close(); }
    }
    for (let trial = 1; trial <= 3; trial++) report.dragTrials.push(await dragTrial(browser, trial));
  } finally { await browser.close(); }
  report.finishedAt = new Date().toISOString();
  report.elapsedMs = Date.parse(report.finishedAt) - Date.parse(report.startedAt);
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({phase, output: path.relative(root, output), revision: report.revision, jsxgraph: report.packageJsxgraph, assets: report.assetProvenance.entryAssets.map(item => ({name: item.name, matchesLocalDist: item.matchesLocalDist})), screenshots: report.screenshots.map(item => ({id: item.id, nonempty: item.board.visibleObjectCount > 0, labels: item.board.labelCount, mathJax: item.board.mathJaxCount})), dragTrials: report.dragTrials.map(({trial, beforeUserXY, afterUserXY, displacement, boardUpdateCount, boardUpdateMedianMs, boardUpdateP95Ms, rafMedianMs, rafP95Ms, pointerMoves}) => ({trial, beforeUserXY, afterUserXY, displacement, boardUpdateCount, boardUpdateMedianMs, boardUpdateP95Ms, rafMedianMs, rafP95Ms, pointerMoves})), elapsedMs: report.elapsedMs}, null, 2));
}
main().catch(error => { console.error(error.stack || String(error)); process.exitCode = 1; });
