// Focused acceptance evidence for the corrected, throwaway JSXGraph candidate.
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const { chromium } = createRequire(new URL('../../../package.json', import.meta.url))('playwright');
const out = resolve(process.env.BEZEG_SPIKE_ARTIFACT_DIR || '.command-logs/patches-jsx-final');
const base = process.env.BEZEG_SPIKE_URL || 'http://127.0.0.1:4181/docs/prototypes/bezier-patches/';
await mkdir(out, { recursive: true });
const assert = (ok, message) => { if (!ok) throw Error(message); };
const browser = await chromium.launch({ headless: true });
const report = { browser: browser.version(), url: base, errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(base);
  await page.waitForFunction(() => window.BezierPatchSpike?.ready());
  report.jsx = await page.evaluate(() => JXG.version);
  assert(report.jsx === '1.14.1', 'Wrong JSX runtime');
  const served = await (await page.request.get(new URL('prototype.js', base).href)).body();
  const local = await readFile(new URL('./prototype.js', import.meta.url));
  report.sourceSha256 = createHash('sha256').update(served).digest('hex');
  assert(report.sourceSha256 === createHash('sha256').update(local).digest('hex'), 'Served/local source mismatch');
  await page.locator('#kind').selectOption('triangular');
  await page.locator('#triangle-renderer').selectOption('mesh');
  const mesh = () => page.evaluate(() => {
    const board = Object.values(JXG.boards).find(b => b.containerObj.id === 'main-board');
    const owners = Object.values(board.objects).filter(o => o.elType === 'polygon3d');
    return { snapshot: BezierPatchSpike.snapshot(), faces: owners.map(o => ({ id: o.id, tag: o.element2D?.rendNode?.tagName, points: o.element2D?.rendNode?.getAttribute('points'), vertices: o.vertices?.map(p => [p.X(), p.Y(), p.Z()]) })) };
  });
  const before = await mesh();
  assert(before.faces.length === 64 && before.faces.every(f => f.points?.length > 10), 'Missing rendered mesh polygon owners');
  const rect = await page.evaluate(() => {
    const board = Object.values(JXG.boards).find(b => b.containerObj.id === 'main-board');
    return board.objects[BezierPatchSpike.pointInfo(0).id].element2D.rendNode.getBoundingClientRect().toJSON();
  });
  const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 32, y + 18, { steps: 6 });
  const during = await mesh();
  await page.screenshot({ path: resolve(out, 'triangle-during-drag.png'), fullPage: true });
  await page.mouse.up();
  const after = await mesh();
  const changed = during.faces.filter((f, i) => f.id === before.faces[i].id && f.points !== before.faces[i].points);
  assert(changed.length > 0, 'No actual owned SVG polygon changed before pointerup');
  assert(before.snapshot.net[0].some((v, i) => Math.abs(v - during.snapshot.net[0][i]) > .001), 'Mesh model did not move during drag');
  assert(JSON.stringify(before.snapshot.camera) === JSON.stringify(during.snapshot.camera), 'Camera moved during point edit');
  report.triangle = { before, during, after, changedOwnedPolygonsDuringDrag: changed.length };
  await page.locator('#kind').selectOption('teapot');
  report.teapot = await page.evaluate(() => {
    const board = Object.values(JXG.boards).find(b => b.containerObj.id === 'main-board');
    const owners = Object.values(board.objects).filter(o => o.elType === 'surface3d');
    const b = t => [(1-t)**3, 3*t*(1-t)**2, 3*t*t*(1-t), t**3];
    const errors = owners.map((owner, index) => {
      const net = BezierTeapotData.resolvePatch(index, { fitLid: false, blinn: true, displaySpace: false });
      return [[0,0], [.31,.63], [1,1]].map(([u,v]) => {
        const expected = [0,0,0], bu = b(u), bv = b(v);
        for (let i=0;i<4;i++) for(let j=0;j<4;j++) for(let k=0;k<3;k++) expected[k] += net[4*i+j][k]*bu[i]*bv[j];
        return Math.max(...[owner.X(u,v),owner.Y(u,v),owner.Z(u,v)].map((value,k) => Math.abs(value-expected[k])));
      });
    });
    return { snapshot: BezierPatchSpike.snapshot(), owners: owners.map(o => ({id:o.id, tag:o.element2D?.rendNode?.tagName, path:o.element2D?.rendNode?.getAttribute('d')})), errors, domainHidden:document.querySelector('#domain-board').hidden };
  });
  assert(report.teapot.owners.length === 32, 'Teapot must have exactly 32 surface owners');
  assert(report.teapot.owners.every(o => o.path?.length > 100), 'Teapot has an empty rendered surface owner');
  assert(report.teapot.errors.flat().every(e => Number.isFinite(e) && e < 1e-10), 'Actual teapot owner differs from reviewed 32 patch fixture');
  assert(report.teapot.snapshot.net.length === 0 && report.teapot.domainHidden, 'Teapot retained editable single patch domain');
  await page.screenshot({ path: resolve(out, 'teapot-32.png'), fullPage: true });
  await page.locator('#kind').selectOption('tensor');
  report.returned = await page.evaluate(() => BezierPatchSpike.snapshot());
  assert(report.returned.net.length === 16 && report.returned.counts.surfaces3d === 1, 'Return from teapot did not restore a single tensor patch');
  assert(report.errors.length === 0, 'Browser errors occurred');
  report.pass = true;
} catch (e) { report.pass = false; report.failure = String(e.stack); process.exitCode = 1; }
finally { await browser.close(); await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2)); }
console.log(JSON.stringify({ out, pass: report.pass, failure: report.failure, changedPolygons: report.triangle?.changedOwnedPolygonsDuringDrag, teapotOwners: report.teapot?.owners.length }));
