// Fresh-visit capture for the first-use control plans (docs/tasks/graph-control-first-use/README.md, definition of done step 1).
// For each route listed in the plan pages, it opens a clean desktop context (1440x900, 310 px inspector) and a clean phone
// context (390x844), both in Slovenian. It stays on Edit with nothing opened and records each visible control in order with
// its page y and whether it is in the first view.
//
//   node scripts/controls-sweep/fresh-visit.cjs [ids|all] [--base https://efodx.github.io/bezeg-2.0] [--out .command-logs/fresh-visit]
//
// ids is a comma-separated list of route ids, such as analysis/epicycles. --base swaps the published site for a local
// preview, such as http://127.0.0.1:4173/bezeg-2.0. It writes <out>/routes.json, <out>/raw.json and <out>/shots/.
// The 2026-11-19 baseline is in docs/reviews/graph-control-first-use/baseline-fresh-visit.md.
const {chromium, devices} = require('@playwright/test');
const fs = require('fs'), path = require('path');

const option = (name, fallback) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? fallback : process.argv[at + 1]; };
const dir = path.resolve(__dirname, '../../docs/tasks/graph-control-first-use');
const out = path.resolve(option('out', '.command-logs/fresh-visit'));
const BASE = option('base', 'https://efodx.github.io/bezeg-2.0').replace(/\/$/, '');
fs.mkdirSync(path.join(out, 'shots'), {recursive: true});

const routes = [];
for (const f of fs.readdirSync(dir)) {
  if (f === 'README.md') continue;
  const txt = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const p of txt.split(/\n## /).slice(1)) {
    const m = p.match(/\]\(https:\/\/efodx\.github\.io\/bezeg-2\.0\/([^)]+)\)/);
    if (!m || !/Open graph/.test(p)) continue;
    const ft = (p.match(/- \*\*First task\.\*\*\s*([^\n]*)/) || [])[1] || '';
    routes.push({id: m[1], url: `${BASE}/${m[1]}`, file: f, title: p.split('\n')[0], firstTask: ft});
  }
}
fs.writeFileSync(path.join(out, 'routes.json'), JSON.stringify(routes, null, 1));
console.log('routes', routes.length, new Set(routes.map(r => r.id)).size);
const arg = process.argv[2];
const only = arg && !arg.startsWith('--') && arg !== 'all' ? new Set(arg.split(',')) : null;

/** Runs in the page: the visible Edit and playback-slot controls, the board box and the inspector geometry. */
const collect = () => {
  const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden]'); };
  const nameOf = el => {
    let n = el.getAttribute('aria-label');
    if (!n && el.getAttribute('aria-labelledby')) n = el.getAttribute('aria-labelledby').split(/\s+/).map(i => document.getElementById(i)?.textContent || '').join(' ');
    if (!n && el.labels && el.labels.length) n = [...el.labels].map(l => l.textContent).join(' ');
    if (!n && el.closest('label')) n = el.closest('label').textContent;
    if (!n && /^(BUTTON|SUMMARY|A)$/.test(el.tagName)) n = el.textContent;
    if (!n) n = el.getAttribute('title') || el.getAttribute('placeholder') || el.value || '';
    return n.replace(/\s+/g, ' ').trim().slice(0, 80);
  };
  const roleOf = el => el.getAttribute('role') || (el.tagName === 'INPUT' ? 'input:' + el.type : el.tagName.toLowerCase());
  const insp = document.querySelector('#workspace-inspector');
  const content = document.querySelector('#inspector-content');
  const edit = document.querySelector('#inspector-edit');
  const ir = insp.getBoundingClientRect(), cr = content.getBoundingClientRect();
  const clipTop = Math.max(0, cr.top), clipBot = Math.min(innerHeight, cr.bottom);
  const phone = innerWidth <= 700;
  const controls = [];
  for (const root of [document.querySelector('[data-playback-slot]'), edit]) if (root && vis(root)) for (const el of root.querySelectorAll('button,input,select,textarea,summary,[role=slider],[role=button],[role=tab],[role=switch],a[href],[tabindex="0"]')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    const top = r.top + scrollY, bot = r.bottom + scrollY;
    const inView = phone ? (bot <= innerHeight && top >= 0) : (r.top >= clipTop && r.bottom <= clipBot);
    controls.push({slot: root !== edit, name: nameOf(el), role: roleOf(el), y: Math.round(top), h: Math.round(r.height), inView});
  }
  const box = document.querySelector('#jgbox'); const br = box?.getBoundingClientRect();
  const slot = document.querySelector('[data-playback-slot]'); const sr = slot?.getBoundingClientRect();
  const hd = document.querySelector('.workspace-heading h1');
  return {
    title: hd?.textContent, inspectorWidth: Math.round(ir.width), inspectorTop: Math.round(ir.top + scrollY), contentVisible: vis(content), editVisible: !!(edit && vis(edit)),
    contentH: Math.round(cr.height), clipBottom: Math.round(clipBot),
    boardTop: br ? Math.round(br.top + scrollY) : null, boardBottom: br ? Math.round(br.bottom + scrollY) : null,
    slot: sr && sr.height > 0 ? {y: Math.round(sr.top + scrollY), h: Math.round(sr.height), text: slot.textContent.replace(/\s+/g, ' ').slice(0, 60)} : null,
    docHeight: document.documentElement.scrollHeight, controls,
    entry: [...document.scripts].map(s => s.src).filter(Boolean),
  };
};

const jobs = [];
for (const r of routes) { if (only && !only.has(r.id)) continue; for (const v of ['desktop', 'phone']) jobs.push({r, v}); }
const results = {};
(async () => {
  const browser = await chromium.launch();
  let idx = 0;
  const worker = async () => {
    while (idx < jobs.length) {
      const {r, v} = jobs[idx++];
      const opts = v === 'desktop' ? {viewport: {width: 1440, height: 900}} : {...devices['Pixel 7'], viewport: {width: 390, height: 844}, deviceScaleFactor: 1, isMobile: true, hasTouch: true};
      opts.locale = 'sl-SI';
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      const rec = {id: r.id, view: v};
      try {
        await page.goto(r.url, {waitUntil: 'load', timeout: 45000});
        await page.waitForSelector('#inspector-edit', {state: 'attached', timeout: 30000});
        await page.waitForSelector('#jgbox svg, #jgbox canvas', {timeout: 30000}).catch(() => { rec.noBoardSvg = true; });
        await page.waitForTimeout(2000);
        Object.assign(rec, await page.evaluate(collect));
        await page.screenshot({path: path.join(out, 'shots', r.id.replace(/\//g, '__') + '-' + v + '.png')});
      } catch (e) { rec.error = String(e).slice(0, 200); }
      await ctx.close();
      results[r.id + '|' + v] = rec;
      process.stdout.write('.');
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  await browser.close();
  fs.writeFileSync(path.join(out, 'raw.json'), JSON.stringify(results, null, 1));
  console.log('\ndone', Object.keys(results).length);
})();
