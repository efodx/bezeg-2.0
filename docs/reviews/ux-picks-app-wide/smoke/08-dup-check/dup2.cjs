const {chromium} = require('playwright');
const fs = require('fs');
const LOG = __dirname + '/dup2.log';
const L = s => { fs.appendFileSync(LOG, s + '\n'); console.log(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => { L('TIMEOUT'); process.exit(2); }, 420000).unref();

const dump = (p, scope) => p.evaluate((scope) => {
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const root = scope ? document.querySelector(scope) : document;
  const out = [];
  if (!root) return ['(scope not found) ' + scope];
  root.querySelectorAll('button,input,select,summary,[role=switch],[role=checkbox],[role=slider],[aria-checked],[aria-pressed]').forEach(e => {
    if (!vis(e)) return;
    const lab = (e.getAttribute('aria-label') || e.innerText || (e.labels && e.labels[0] && e.labels[0].innerText) || '').trim().replace(/\s+/g, ' ').slice(0, 50);
    const grp = e.closest('[aria-label]:not(button):not(input)')?.getAttribute('aria-label') || '';
    out.push(`${e.tagName.toLowerCase()}|${e.type || e.getAttribute('role') || ''}|"${lab}"|chk=${e.getAttribute('aria-checked') ?? (e.type === 'checkbox' ? e.checked : '')}|prs=${e.getAttribute('aria-pressed') ?? ''}|grp=${grp}`);
  });
  return out;
}, scope);

async function open(br, path) {
  const ctx = await br.newContext({viewport: {width: 1440, height: 900}});
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('http://127.0.0.1:4483/bezeg-2.0/' + path, {waitUntil: 'load'});
  await sleep(4000);
  return {p, errs};
}
const tools = '[aria-label="Orodja demonstracije"]';
async function toolsDump(p, tag) {
  for (const tab of ['Uredi', 'Prikaz', 'Shrani']) {
    await p.locator(tools).getByRole('button', {name: tab, exact: true}).click({timeout: 5000}).catch(e => L('tab err ' + tab));
    await sleep(500);
    await p.evaluate(() => document.querySelectorAll('details:not([open])').forEach(d => d.open = true));
    await sleep(300);
    L(`--- ${tag} Orodja tab ${tab} ---`);
    for (const l of await dump(p, tools)) L(l);
  }
}
(async () => {
  fs.writeFileSync(LOG, '');
  const br = await chromium.launch();
  try {
    const a = await open(br, 'compgeo/polygon-area');
    await toolsDump(a.p, 'polygon');
    L('--- polygon board strip ([aria-label="Interaktivni graf"]) ---');
    for (const l of await dump(a.p, '[aria-label="Interaktivni graf"]')) L(l);
    L('--- polygon Legenda ---');
    L(await a.p.evaluate(() => document.querySelector('[aria-label="Legenda"]')?.innerText.replace(/\s+/g, ' ') ?? 'none'));
    const count = () => a.p.evaluate(() => document.querySelectorAll('svg *').length);
    for (const name of ['Trikotniki iz prvega oglišča', 'Mrežne točke']) {
      const sw = a.p.locator(`[role=switch][aria-label="${name}"]`).first();
      const b = await count(), s0 = await sw.getAttribute('aria-checked');
      await sw.click({timeout: 5000}).catch(e => L('click err ' + e.message.slice(0, 80)));
      await sleep(900);
      L(`flip "${name}": ${s0} -> ${await sw.getAttribute('aria-checked')}, svg els ${b} -> ${await count()}`);
    }
    L('polygon errors: ' + JSON.stringify(a.errs));

    const b = await open(br, 'bezier/curve');
    await toolsDump(b.p, 'bezier');
    L('--- bezier board ---');
    for (const l of await dump(b.p, '[aria-label="Interaktivni graf"]')) L(l);
    L('--- bezier Legenda ---');
    L(await b.p.evaluate(() => document.querySelector('[aria-label="Legenda"]')?.innerText.replace(/\s+/g, ' ') ?? 'none'));
    L('bezier errors: ' + JSON.stringify(b.errs));
  } catch (e) { L('FATAL ' + e.message); }
  await br.close();
})();
