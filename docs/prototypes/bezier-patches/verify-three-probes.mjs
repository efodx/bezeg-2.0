// Verify diagnostic non-vacuity outside all measured intervals.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const { chromium } = createRequire(new URL('../../../package.json', import.meta.url))('playwright');
const base = process.env.BEZEG_SPIKE_URL || 'http://127.0.0.1:4181/docs/prototypes/bezier-patches/';
const out = resolve(process.env.BEZEG_SPIKE_ARTIFACT_DIR || '.command-logs/three-probe-check');
await mkdir(out, { recursive: true });
const source = await readFile(new URL('./three-prototype.js', import.meta.url), 'utf8');
const assert = (ok, message) => { if (!ok) throw Error(message); };
const browser = await chromium.launch({ headless: true });
const report = { browser: browser.version(), sourceSha256: createHash('sha256').update(source).digest('hex'), cases: [] };
try {
  for (const mutation of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    if (mutation) {
      const search = 'meshes.forEach(mesh=>mesh.visible=false);';
      assert(source.includes(search), 'Mutation did not land');
      await page.route('**/three-prototype.js', route => route.fulfill({ contentType: 'application/javascript', body: source.replace(search, '/* deliberate no-op owner hiding mutation */') }));
    }
    await page.goto(new URL('three.html', base).href);
    await page.waitForFunction(() => window.BezierPatchSpike?.ready());
    await page.locator('#kind').selectOption('triangular');
    const diagnostic = await page.evaluate(() => BezierPatchSpike.diagnostics({ surfaceParameter: [1/3, 1/3] }).surface);
    assert(diagnostic.ownerCount === 1 && diagnostic.ownerTriangleCount === 64 && diagnostic.rayOwnerRole === 'surface', 'Missing actual triangular owner');
    assert(mutation ? diagnostic.changedPixels === 0 : diagnostic.changedPixels > 20, 'Pixel probe did not distinguish hidden-owner mutation');
    report.cases.push({ mutation, diagnostic });
    if (!mutation) {
      await page.locator('#kind').selectOption('teapot');
      const teapot = await page.evaluate(() => BezierPatchSpike.diagnostics({ surfaceParameter: [.5,.5] }).surface);
      const data = await (await page.request.get(new URL('../../../.command-logs/patches-three-vendor/teapot-data.json', base).href)).json();
      const b = t => [(1-t)**3, 3*t*(1-t)**2, 3*t*t*(1-t), t**3];
      const evaluate = (u,v) => {
        const bu=b(u),bv=b(v),point=[0,0,0];
        for(let i=0;i<4;i++) for(let j=0;j<4;j++) for(let k=0;k<3;k++) point[k]+=data.vertices[3*data.patches[4*i+j]+k]*bu[i]*bv[j];
        return point;
      };
      const triangle = [evaluate(0,0),evaluate(1/8,0),evaluate(0,1/8)];
      const expected = [0,1,2].map(k => triangle.reduce((sum,p)=>sum+p[k],0)/3);
      const error = Math.max(...expected.map((value,k)=>Math.abs(value-teapot.world[k])));
      assert(teapot.ownerCount === 32 && teapot.rayOwnerRole === 'teapot' && teapot.changedPixels > 20 && error < 1e-6, 'Teapot owner centroid differs from independent fixture calculation');
      report.teapot = { diagnostic: teapot, expected, error };
    }
    await page.close();
  }
  report.pass = true;
} catch (e) { report.pass = false; report.failure = String(e.stack); process.exitCode = 1; }
finally { await browser.close(); await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2)); }
console.log(JSON.stringify({ out, pass: report.pass, failure: report.failure }));
