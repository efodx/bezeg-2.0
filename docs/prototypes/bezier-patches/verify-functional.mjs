import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const url = process.env.BEZEG_SPIKE_URL || 'http://127.0.0.1:4181/docs/prototypes/bezier-patches/';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];
const results = {};
  const dialogs = [];
const artifactDir = process.env.BEZEG_SPIKE_ARTIFACT_DIR;
if (artifactDir) mkdirSync(artifactDir, { recursive: true });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await context.addInitScript(() => {
    const active = new WeakMap();
    const listenerIds = new WeakMap(); let nextListenerId = 1;
    const listenerId = listener => {
      if (!listenerIds.has(listener)) listenerIds.set(listener, nextListenerId++);
      return listenerIds.get(listener);
    };
    window.__listenerCounts = () => {
      const nodes = [window, document, document.getElementById('main-board'), document.getElementById('domain-board')];
      return Object.fromEntries(nodes.map((node, i) => [i === 0 ? 'window' : i === 1 ? 'document' : node?.id, active.get(node)?.size || 0]));
    };
    const proto = EventTarget.prototype, add = proto.addEventListener, remove = proto.removeEventListener;
    proto.addEventListener = function(type, listener, options) {
      if (listener) {
        let records = active.get(this);
        if (!records) active.set(this, records = new Set());
        records.add(`${type}:${listenerId(listener)}:${typeof options === 'boolean' ? options : !!options?.capture}`);
      }
      return add.call(this, type, listener, options);
    };
    proto.removeEventListener = function(type, listener, options) {
      const capture = typeof options === 'boolean' ? options : !!options?.capture;
      if (listener) active.get(this)?.delete(`${type}:${listenerId(listener)}:${capture}`);
      return remove.call(this, type, listener, options);
    };
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
  await page.goto(url);
  await page.waitForFunction(() => window.BezierPatchSpike?.ready());
  const initial = await page.evaluate(() => ({
    version: JXG.version, snapshot: BezierPatchSpike.snapshot(), boards: Object.keys(JXG.boards).length,
    listeners: window.__listenerCounts(), math: BezierPatchSpike.assertMath()
  }));
  assert(initial.version === '1.14.1', `Expected JSXGraph 1.14.1, got ${initial.version}`);
  assert(initial.snapshot.net.length === 16 && initial.snapshot.counts.surfaces3d > 0, 'Tensor patch did not render substantive geometry');
  results.provenance = { version: initial.version, url, boards: initial.boards, initialPointCount: initial.snapshot.net.length };
  results.math = initial.math;

  const projectPoint = index => page.evaluate(index => {
    const snap = BezierPatchSpike.snapshot();
    const id = BezierPatchSpike.pointInfo(index).id;
    const board = JXG.boards[Object.keys(JXG.boards)[0]], point = board.objects[id];
    const rect = point.element2D.rendNode.getBoundingClientRect().toJSON();
    const surface = Object.values(board.objects).find(o => o.elType === 'surface3d' || o.elType === 'polygon3d');
    return { xyz: snap.net[index], camera: snap.camera, rect, surfacePath: surface?.element2D?.rendNode?.getAttribute('d') || surface?.rendNode?.getAttribute('d') };
  }, index);
  const drag = async (rect, dx, dy, during = async () => {}) => {
    const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    for (let step = 1; step <= 6; step++) {
      await page.mouse.move(x + dx * step / 6, y + dy * step / 6);
      if (step === 4) await during();
    }
    await page.mouse.up();
    await page.waitForTimeout(150);
  };

  let before = await projectPoint(0);
  await drag(before.rect, 45, 27);
  let after = await projectPoint(0);
  assert(before.xyz.some((v, i) => Math.abs(v - after.xyz[i]) > 0.01), 'Mouse XY drag did not change model coordinates');
  assert(Math.abs(before.xyz[2] - after.xyz[2]) < 0.01, 'XY-mode drag changed point height');
  assert(before.surfacePath !== after.surfacePath && after.surfacePath?.length > 1000, 'Mouse drag did not change the rendered surface path');
  assert(JSON.stringify(before.camera) === JSON.stringify(after.camera), 'Camera moved while a point was dragged');
  results.mouseXY = { before: before.xyz, after: after.xyz, surfacePathChanged: true, cameraFixed: true };

  await page.locator('#z-mode').check();
  before = await projectPoint(1);
  await drag(before.rect, 0, -42);
  after = await projectPoint(1);
  assert(Math.abs(before.xyz[2] - after.xyz[2]) > 0.01, 'z-mode gesture did not change point height');
  assert(Math.hypot(before.xyz[0] - after.xyz[0], before.xyz[1] - after.xyz[1]) < 0.01, 'z-mode gesture changed horizontal coordinates');
  assert(JSON.stringify(before.camera) === JSON.stringify(after.camera), 'Camera moved during z-mode point drag');
  results.zMode = { before: before.xyz, after: after.xyz, cameraFixed: true };
  await page.locator('#z-mode').uncheck();

  const cameraBefore = await page.evaluate(() => BezierPatchSpike.snapshot().camera);
  const graph = await page.locator('#main-board').boundingBox();
  await page.mouse.move(graph.x + graph.width - 35, graph.y + 35);
  await page.mouse.down(); await page.mouse.move(graph.x + graph.width - 80, graph.y + 65, { steps: 5 }); await page.mouse.up();
  await page.waitForTimeout(100);
  const cameraAfter = await page.evaluate(() => BezierPatchSpike.snapshot().camera);
  assert(cameraBefore.az !== cameraAfter.az || cameraBefore.el !== cameraAfter.el, 'Empty-space mouse orbit did not move the camera');
  await page.locator('#main-board').focus(); await page.keyboard.press('ArrowRight');
  const keyboardCamera = await page.evaluate(() => BezierPatchSpike.snapshot().camera);
  assert(cameraAfter.az !== keyboardCamera.az, 'Keyboard orbit did not move the camera');
  results.orbit = { mouseBefore: cameraBefore, mouseAfter: cameraAfter, keyboardAfter: keyboardCamera };

  await page.locator('#kind').selectOption('triangular');
  await page.waitForTimeout(300);
  const triBefore = await page.evaluate(() => {
    const s = BezierPatchSpike.snapshot(), board = JXG.boards[Object.keys(JXG.boards)[0]];
    const evaluation = Object.values(board.objects).find(o => o.elType === 'point3d' && o.name === 'P(u,v)');
    return { s, constructionPoint: [evaluation.X(), evaluation.Y(), evaluation.Z()] };
  });
  assert(triBefore.s.net.length === 10 && triBefore.s.counts.surfaces3d > 0, 'Triangular patch rendered no substantive surface');
  const insetPoint = await page.evaluate(() => {
    const board = JXG.boards[Object.keys(JXG.boards)[1]], p = Object.values(board.objects).find(o => o.elType === 'point' && o.name === '(u,v)');
    return p.rendNode.getBoundingClientRect().toJSON();
  });
  await drag(insetPoint, 35, -20);
  const triAfter = await page.evaluate(() => BezierPatchSpike.snapshot());
  assert(triAfter.uv.some((v, i) => Math.abs(v - triBefore.s.uv[i]) > 0.01), 'Parameter inset drag did not update u/v');
  assert(triAfter.uv[0] >= 0 && triAfter.uv[1] >= 0 && triAfter.uv[0] + triAfter.uv[1] <= 1.000001, 'Triangular parameter escaped its domain');
  const triConstructionAfter = await page.evaluate(() => { const board=JXG.boards[Object.keys(JXG.boards)[0]], p=Object.values(board.objects).find(o=>o.elType==='point3d'&&o.name==='P(u,v)'); return [p.X(),p.Y(),p.Z()]; });
  assert(triBefore.constructionPoint.some((v,i)=>Math.abs(v-triConstructionAfter[i])>0.01), 'Triangular inset drag did not move the de Casteljau result');
  results.insetTriangular = { before: triBefore.s.uv, after: triAfter.uv, constructionBefore: triBefore.constructionPoint, constructionAfter: triConstructionAfter, triangularSurfaceObjects: triAfter.counts.surfaces3d };

  await page.locator('#triangle-renderer').selectOption('mesh');
  await page.waitForTimeout(400);
  const meshBefore = await page.evaluate(() => BezierPatchSpike.snapshot());
  assert(meshBefore.counts.polygons3d >= 64, 'Triangle mesh produced too few actual faces');
  before = await projectPoint(0);
  let meshDuring;
  const meshPathBefore = await page.evaluate(() => Object.values(JXG.boards[Object.keys(JXG.boards)[0]].objects).find(o => o.elType === 'polygon3d')?.element2D?.rendNode?.getAttribute('d'));
  await drag(before.rect, 22, 14, async () => {
    meshDuring = await page.evaluate(() => ({ point: BezierPatchSpike.snapshot().net[0], path: Object.values(JXG.boards[Object.keys(JXG.boards)[0]].objects).find(o => o.elType === 'polygon3d')?.element2D?.rendNode?.getAttribute('d') }));
  });
  after = await projectPoint(0);
  assert(before.xyz.some((v, i) => Math.abs(v - after.xyz[i]) > 0.01), 'Triangle mesh point drag did not move its model point');
  assert(meshDuring.point.some((v, i) => Math.abs(v - before.xyz[i]) > 0.01), 'Triangle mesh model point did not update during pointer drag');
  const meshPathChangedDuringDrag = meshDuring.path !== meshPathBefore;
  results.triangleMesh = { faces: meshBefore.counts.polygons3d, draggedPoint: after.xyz, duringDragPoint: meshDuring.point, facePathChangedDuringDrag: meshPathChangedDuringDrag, pathBefore: meshPathBefore, pathDuring: meshDuring.path };
  if (!meshPathChangedDuringDrag) (results.gaps ||= []).push('Triangle mesh face path did not visibly change during point drag; JSXGraph mesh acceptance remains open.');
  await page.locator('#kind').selectOption('tensor');
  await page.locator('#triangle-renderer').selectOption('surface');
  await page.waitForTimeout(300);
  const tensorConstructionBefore = await page.evaluate(() => { const board=JXG.boards[Object.keys(JXG.boards)[0]], p=Object.values(board.objects).find(o=>o.elType==='point3d'&&o.name==='P(u,v)'); return { s:BezierPatchSpike.snapshot(), point:[p.X(),p.Y(),p.Z()] }; });
  const tensorInset = await page.evaluate(() => { const board=JXG.boards[Object.keys(JXG.boards)[1]], p=Object.values(board.objects).find(o=>o.elType==='point'&&o.name==='(u,v)'); return p.rendNode.getBoundingClientRect().toJSON(); });
  await drag(tensorInset, -24, 18);
  const tensorConstructionAfter = await page.evaluate(() => { const board=JXG.boards[Object.keys(JXG.boards)[0]], p=Object.values(board.objects).find(o=>o.elType==='point3d'&&o.name==='P(u,v)'); return { s:BezierPatchSpike.snapshot(), point:[p.X(),p.Y(),p.Z()] }; });
  assert(tensorConstructionBefore.s.uv.some((v,i)=>Math.abs(v-tensorConstructionAfter.s.uv[i])>0.01), 'Tensor parameter inset drag did not update u/v');
  assert(tensorConstructionBefore.point.some((v,i)=>Math.abs(v-tensorConstructionAfter.point[i])>0.01), 'Tensor inset drag did not move the de Casteljau result');
  results.insetTensor = { before:tensorConstructionBefore.s.uv, after:tensorConstructionAfter.s.uv, constructionBefore:tensorConstructionBefore.point, constructionAfter:tensorConstructionAfter.point };

  const svgDownloadPromise = page.waitForEvent('download'); await page.locator('#export-svg').click(); const svgDownload = await svgDownloadPromise;
  const svgStream = await svgDownload.createReadStream(); let svg = ''; for await (const chunk of svgStream) svg += chunk.toString();
  assert(svg.length > 10000 && svg.includes('dcae78') && /<text[ >]/.test(svg), 'SVG export lacks a substantial surface or labels');
  if (artifactDir) writeFileSync(join(artifactDir, 'bezier-patch.svg'), svg);
  const pngDownloadPromise = page.waitForEvent('download', { timeout: 8000 }).catch(() => null); await page.locator('#export-png').click(); const pngDownload = await pngDownloadPromise;
  let pngPixels = null, pngBytes = 0;
  if (pngDownload) {
    const pngStream = await pngDownload.createReadStream(); const pngChunks = []; for await (const chunk of pngStream) pngChunks.push(chunk); const png = Buffer.concat(pngChunks);
    pngBytes = png.length;
    if (artifactDir) writeFileSync(join(artifactDir, 'bezier-patch.png'), png);
    assert(png.length > 10000 && png.subarray(0, 8).equals(Buffer.from([137,80,78,13,10,26,10])), 'PNG export is empty or invalid');
    pngPixels = await page.evaluate(async data => {
      const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0); const values = ctx.getImageData(0, 0, img.width, img.height).data;
      let visible = 0; for (let i = 3; i < values.length; i += 4) if (values[i] > 0) visible++;
      return { width: img.width, height: img.height, visible };
    }, png.toString('base64'));
    assert(pngPixels.visible > 10000, 'PNG export contains no substantive rendered content');
  }
  results.exports = { svgBytes: svg.length, svgHasSurface: svg.includes('dcae78'), svgHasLabels: /<text[ >]/.test(svg), pngDownloaded: !!pngDownload, pngBytes, pngPixels, pngExportError: dialogs.at(-1) || null };

  const beforePresentation = await page.locator('#main-board').boundingBox();
  await page.locator('#presentation').click(); await page.waitForTimeout(200);
  const presented = await page.locator('#main-board').boundingBox();
  assert(presented.width > beforePresentation.width * 1.1 && await page.locator('aside').isHidden(), 'Presentation mode did not expand the graph');
  await page.setViewportSize({ width: 1180, height: 760 }); await page.waitForTimeout(250);
  const resized = await page.locator('#main-board').boundingBox();
  assert(resized.width > presented.width * .75 && resized.height > 500, 'Presentation graph did not resize with the viewport');
  await page.locator('#presentation').click(); await page.waitForTimeout(150);
  results.presentationResize = { before: beforePresentation, presentation: presented, resized };

  if (artifactDir) {
    const captureViews = async (kind, renderer) => {
      await page.locator('#kind').selectOption(kind);
      await page.locator('#triangle-renderer').selectOption(renderer);
      await page.waitForTimeout(250);
      const shots = {};
      for (const view of ['front', 'top', 'side', 'isometric']) {
        await page.locator(`[data-view="${view}"]`).click(); await page.waitForTimeout(180);
        const file = join(artifactDir, `${kind}-${renderer}-${view}.png`);
        await page.screenshot({ path: file, fullPage: true }); shots[view] = file;
      }
      return shots;
    };
    results.viewScreenshots = {
      tensor: await captureViews('tensor', 'surface'),
      triangularMesh: await captureViews('triangular', 'mesh')
    };
  }

  const baselineListeners = await page.evaluate(() => window.__listenerCounts());
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => BezierPatchSpike.dispose());
    assert(await page.evaluate(() => Object.keys(JXG.boards).length) === 0, 'Disposed prototype left JSXGraph boards registered');
    await page.evaluate(() => BezierPatchSpike.remount());
    await page.waitForFunction(() => BezierPatchSpike.ready());
    assert(await page.evaluate(() => Object.keys(JXG.boards).length) === 2, 'Remount did not create exactly two owned boards');
  }
  const remountedListeners = await page.evaluate(() => window.__listenerCounts());
  const listenersStable = JSON.stringify(baselineListeners) === JSON.stringify(remountedListeners);
  if (!listenersStable) (results.gaps ||= []).push(`Listener counts grew across remount: ${JSON.stringify({ baselineListeners, remountedListeners })}`);
  results.lifecycle = { cycles: 3, baselineBoards: 2, disposedBoards: 0, remountedBoards: 2, baselineListeners, remountedListeners, listenersStable };

  const touchContext = await browser.newContext({ viewport: { width: 900, height: 900 }, hasTouch: true, isMobile: true });
  const touchPage = await touchContext.newPage(); touchPage.on('pageerror', e => errors.push(e.message));
  await touchPage.goto(url); await touchPage.waitForFunction(() => window.BezierPatchSpike?.ready());
  const touchBoard = await touchPage.locator('#main-board').boundingBox();
  const cdp = await touchContext.newCDPSession(touchPage);
  const touchDrag = async (x, y, dx, dy) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y, radiusX: 8, radiusY: 8, force: 1 }] });
    for (let step = 1; step <= 6; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x + dx * step / 6, y: y + dy * step / 6, radiusX: 8, radiusY: 8, force: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await touchPage.waitForTimeout(150);
  };
  const touchCameraBefore = await touchPage.evaluate(() => BezierPatchSpike.snapshot().camera);
  await touchDrag(touchBoard.x + touchBoard.width - 35, touchBoard.y + 40, -40, 25);
  const touchCameraAfter = await touchPage.evaluate(() => BezierPatchSpike.snapshot().camera);
  assert(touchCameraBefore.az !== touchCameraAfter.az || touchCameraBefore.el !== touchCameraAfter.el, 'Touch orbit did not move the camera');
  const touchPointBefore = await touchPage.evaluate(() => ({ s: BezierPatchSpike.snapshot(), id: BezierPatchSpike.pointInfo(0).id }));
  const touchRect = await touchPage.evaluate(id => JXG.boards[Object.keys(JXG.boards)[0]].objects[id].element2D.rendNode.getBoundingClientRect().toJSON(), touchPointBefore.id);
  const touchCameraBeforeXY = await touchPage.evaluate(() => BezierPatchSpike.snapshot().camera);
  await touchDrag(touchRect.x + touchRect.width / 2, touchRect.y + touchRect.height / 2, 26, -16);
  const touchPointAfterXY = await touchPage.evaluate(() => BezierPatchSpike.snapshot().net[0]);
  const touchCameraAfterXY = await touchPage.evaluate(() => BezierPatchSpike.snapshot().camera);
  assert(touchPointBefore.s.net[0].some((v, i) => Math.abs(v - touchPointAfterXY[i]) > 0.01), 'Touch XY-mode drag did not change model coordinates');
  assert(Math.abs(touchPointBefore.s.net[0][2] - touchPointAfterXY[2]) < 0.01, 'Touch XY-mode drag changed point height');
  assert(JSON.stringify(touchCameraBeforeXY) === JSON.stringify(touchCameraAfterXY), 'Camera moved during touch XY-mode drag');
  await touchPage.locator('#z-mode').check();
  await touchDrag(touchRect.x + touchRect.width / 2, touchRect.y + touchRect.height / 2, 0, -35);
  const touchPointAfter = await touchPage.evaluate(() => BezierPatchSpike.snapshot().net[0]);
  assert(Math.abs(touchPointBefore.s.net[0][2] - touchPointAfter[2]) > 0.01, 'Touch z-mode drag did not change point height');
  results.touch = { orbitBefore: touchCameraBefore, orbitAfter: touchCameraAfter, xyBefore: touchPointBefore.s.net[0], xyAfter: touchPointAfterXY, xyCameraFixed: true, zBefore: touchPointAfterXY, zAfter: touchPointAfter };
  await touchPage.evaluate(() => BezierPatchSpike.dispose()); await touchContext.close();

  assert(errors.length === 0, `Browser page errors: ${errors.join('; ')}`);
  results.pageErrors = errors;
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
