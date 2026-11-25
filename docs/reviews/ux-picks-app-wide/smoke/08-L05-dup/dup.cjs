const {chromium} = require('playwright');
const fs = require('fs');
const LOG = __dirname + '/dup2.log';
const L = s => { fs.appendFileSync(LOG, s + '\n'); console.log(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => { L('TIMEOUT'); process.exit(2); }, 300000).unref();

const dump = p => p.evaluate(() => {
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const sel = 'button,input,select,[role=switch],[role=checkbox],[role=tab],[aria-pressed],[aria-checked]';
  const out = [];
  document.querySelectorAll(sel).forEach(e => {
    if (!vis(e)) return;
    const lab = (e.getAttribute('aria-label') || e.innerText || (e.labels && e.labels[0] && e.labels[0].innerText) || e.title || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const where = e.closest('[aria-label]:not(button):not(input)')?.getAttribute('aria-label') || '';
    out.push(`${e.tagName.toLowerCase()}|${e.type || ''}|${e.getAttribute('role') || ''}|"${lab}"|prs=${e.getAttribute('aria-pressed') ?? e.getAttribute('aria-checked') ?? ''}|in=${where}${e.closest('svg') ? '|svg' : ''}`);
  });
  return out;
});

(async () => {
  fs.writeFileSync(LOG, '');
  const br = await chromium.launch();
  const ctx = await br.newContext({viewport: {width: 1440, height: 900}});
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('http://127.0.0.1:4483/bezeg-2.0/bezier/elevation', {waitUntil: 'load'});
  await sleep(4000);
  const open = p.getByRole('button', {name: /^(Odpri orodja|Open tools)$/}).first();
  if (await open.count()) { await open.click(); await sleep(800); }
  L('=== initial ===');
  for (const l of await dump(p)) L(l);
  const tabs = p.getByRole('button', {name: /^(Uredi|Prikaz|Shrani)$/});
  const n = await tabs.count();
  for (let i = 0; i < n; i++) {
    const name = (await tabs.nth(i).innerText()).trim() || (await tabs.nth(i).getAttribute('aria-label'));
    await tabs.nth(i).click({timeout: 3000}).catch(() => {});
    await sleep(600);
    L(`=== tab ${i} ${name} ===`);
    for (const l of await dump(p)) L(l);
  }
  L('errors: ' + JSON.stringify(errs));
  await br.close();
})();
