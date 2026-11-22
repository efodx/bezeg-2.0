const {chromium} = require('playwright');
setTimeout(() => process.exit(2), 100000).unref();
const B = 'http://127.0.0.1:4481/bezeg-2.0';
(async () => {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({viewport: {width: 1440, height: 900}});
        for (const r of process.argv.slice(2)) {
            await page.goto(B + '/' + r); await page.waitForTimeout(5000);
            const info = await page.evaluate(() => ({
                inputs: [...document.querySelectorAll('input,button,[role=slider],select')].filter(e => e.offsetParent).map(e => `${e.tagName}|${e.type || ''}|${e.id || ''}|${e.getAttribute('aria-label') || ''}|${(e.textContent || '').trim().slice(0, 20)}|${e.getAttribute('role') || ''}`),
            }));
            console.log('== ' + r + '\n' + info.inputs.join('\n'));
        }
    } finally { await browser.close(); }
})();
