import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = process.cwd(), out = path.resolve(process.env.BEZEG_TOUCH_OUT || '.command-logs/three-touch-target');
await mkdir(out, { recursive: true });
const source = await readFile(path.join(root, 'docs/prototypes/bezier-patches/three-prototype.js'), 'utf8');
const injection = `window.__touchDebug={pointer:()=>owned.pointer,hit:(x,y)=>rayFor({clientX:x,clientY:y}).intersectObjects(owned.controlMeshes,false).map(h=>({index:h.object.userData.pointIndex,distance:h.distance})),project:i=>{const r=$('main-board').getBoundingClientRect(),p=owned.controlMeshes[i].getWorldPosition(new owned.THREE.Vector3()).project(owned.camera);return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}};`;
if (!source.includes('window.BezierPatchSpike=')) throw Error('Instrumentation anchor missing');
const browser = await chromium.launch({ headless: true });
const result = { sourceSha256: createHash('sha256').update(source).digest('hex'), instrumentation: injection, rows: [], errors: [] };
try {
  for (const kind of ['tensor', 'triangular']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', e => result.errors.push(e.message));
    await page.route('**/three-prototype.js', async route => {
      const response = await route.fetch(), bytes = await response.body();
      if (createHash('sha256').update(bytes).digest('hex') !== result.sourceSha256) throw Error('Served source mismatch');
      await route.fulfill({ response, body: source.replace('window.BezierPatchSpike=', injection + 'window.BezierPatchSpike=') });
    });
    await page.goto('http://127.0.0.1:4181/docs/prototypes/bezier-patches/three.html');
    await page.waitForFunction(() => window.BezierPatchSpike?.ready());
    await page.selectOption('#kind', kind);
    await page.waitForTimeout(100);
    const spot = i => page.locator('#labels').evaluate((host, index) => {
      const el = [...host.children].find(x => x.textContent === String(index + 1));
      if (!el) throw Error('Missing label');
      const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, i);
    // Preserve the preceding mouse edit in the failing triangular smoke sequence.
    if (kind === 'triangular') {
      const p = await spot(0); await page.mouse.move(p.x, p.y); await page.mouse.down();
      await page.mouse.move(p.x + 55, p.y - 18, { steps: 7 }); await page.mouse.up(); await page.waitForTimeout(100);
    }
    const cdp = await context.newCDPSession(page);
    for (const [mode, dx, dy] of [['xy', 58, 20], ['z', 0, -62]]) {
      await page.locator('#z-mode').setChecked(mode === 'z');
      const target = await spot(1), before = await page.evaluate(() => BezierPatchSpike.snapshot());
      const debug = await page.evaluate(({ x, y }) => ({ hit: __touchDebug.hit(x, y), projected: __touchDebug.project(1), zMode: document.querySelector('#z-mode').checked }), target);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...target, id: 1 }] });
      const pointer = await page.evaluate(() => __touchDebug.pointer());
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target.x + dx, y: target.y + dy, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(100);
      const after = await page.evaluate(() => BezierPatchSpike.snapshot());
      const deltas = after.net.map((p, i) => p.map((x, d) => x - before.net[i][d]));
      const changed = deltas.flatMap((p, i) => p.some(x => Math.abs(x) > 1e-8) ? [i] : []);
      const row = { kind, mode, target, debug, pointer, before, after, deltas, changed, cameraFixed: JSON.stringify(before.camera) === JSON.stringify(after.camera) };
      row.constraintPassed = pointer?.mode === 'point' && debug.hit.length > 0 && pointer.index === debug.hit[0].index && changed.length === 1 && changed[0] === pointer.index && row.cameraFixed && (mode === 'z' ? Math.hypot(...deltas[pointer.index].slice(0, 2)) < 1e-8 && Math.abs(deltas[pointer.index][2]) > 1e-5 : Math.hypot(...deltas[pointer.index].slice(0, 2)) > 1e-5 && Math.abs(deltas[pointer.index][2]) < 1e-8);
      result.rows.push(row);
      await page.screenshot({ path: path.join(out, `${kind}-${mode}.png`) });
    }
    await context.close();
  }
} finally { await browser.close(); await writeFile(path.join(out, 'results.json'), JSON.stringify(result, null, 2)); }
console.log(JSON.stringify(result.rows.map(({ kind, mode, debug, pointer, changed, deltas, cameraFixed }) => ({ kind, mode, debug, pointer, changed, deltas, cameraFixed }))));
if (result.errors.length || result.rows.length !== 4 || result.rows.some(row => !row.constraintPassed)) process.exitCode = 1;
