// Prints every chapter id linked from the Learn page with its count of example links: `<id> <examples>`.
const {chromium} = require('playwright');
(async () => {
    const base = process.argv[2] || 'http://localhost:4399';
    const b = await chromium.launch(); const p = await b.newPage();
    await p.goto(`${base}/bezeg-2.0/learn`, {waitUntil: 'networkidle'});
    const ids = [...new Set(await p.$$eval('a[href^="/bezeg-2.0/learn/"]', as => as.map(a => a.getAttribute('href').split(/[/#?]/)[3]).filter(Boolean)))];
    for (const id of ids) {
        await p.goto(`${base}/bezeg-2.0/learn/${id}`, {waitUntil: 'networkidle'});
        const n = new Set(await p.$$eval('a[href*="example="]', as => as.map(a => a.getAttribute('href')))).size;
        console.log(id, n);
    }
    await b.close();
})();
