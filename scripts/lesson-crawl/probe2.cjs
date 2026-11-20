// Throwaway: click a labelled control (role checkbox/button by name) in a tab on a fresh route; report checked state, graph labels and change.
const {chromium} = require('playwright');
(async () => {
  const [url, tab, role, name] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1440,height:900}}); p.setDefaultTimeout(4000); p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 120)));
  await p.goto(url, {waitUntil:'networkidle'}); await p.waitForTimeout(1200);
  await p.click(`.inspector-tabs button[aria-controls="inspector-${tab}"]`);
  await p.$$eval('#workspace-inspector details', ds => ds.forEach(d => { d.open = true; }));
  const st = () => p.evaluate(() => { const bd = Object.values(window.JXG.boards).find(b => b.container === 'jgbox'); const vis = Object.values(bd.objects).filter(o => o.visPropCalc?.visible); const lbl = Object.values(bd.objects).filter(o => o.elType==='text' || o.type===JXG.OBJECT_TYPE_TEXT).filter(o=>o.visPropCalc?.visible).length; const ptLabels = Object.values(bd.objects).filter(o => o.elType==='point' && o.label && o.label.visPropCalc?.visible).length; let g=''; document.querySelectorAll('section.workspace-graph svg').forEach(s=>g+=s.innerHTML); return `vis=${vis.length} texts=${lbl} ptLabels=${ptLabels} len=${g.length}`; });
  const loc = p.locator(`#inspector-${tab}`).getByRole(role, {name: new RegExp(name)}).first();
  const c0 = await loc.isChecked().catch(()=>'-'); const s0 = await st();
  await loc.click(); await p.waitForTimeout(700);
  console.log(name, 'checked', c0, '->', await loc.isChecked().catch(()=>'-'), '|', s0, '->', await st());
  await b.close();
})();
