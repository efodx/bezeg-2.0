const {chromium} = require('playwright');
setTimeout(() => process.exit(2), 100000).unref();
const B = 'http://127.0.0.1:4481/bezeg-2.0/';
(async () => {
    const browser = await chromium.launch();
    try {
        const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
        const page = await ctx.newPage();
        await page.goto(B + 'linear-map'); await page.waitForTimeout(3500);
        console.log('iter text', await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /iterac|Iterac|način|Način/.test(e.textContent)).map(e => e.tagName + ':' + e.textContent.trim().slice(0, 40)).slice(0, 12)));
        console.log('text fields', await page.evaluate(() => [...document.querySelectorAll('input,select')].filter(e => e.offsetParent).map(e => (e.getAttribute('aria-label') || e.closest('label,div')?.textContent || '').trim().slice(0, 40)).join(' ; ')));
        for (const m of ['Prikaz', 'Uredi']) {
            await page.getByRole('button', {name: m, exact: true}).click(); await page.waitForTimeout(400);
            console.log(m, await page.evaluate(() => [...document.querySelectorAll('[role=menuitem],[role=menu] *,input[type=checkbox],[role=radio]')].filter(e => e.offsetParent && e.children.length < 2).map(e => (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30)).filter(Boolean).slice(0, 25).join(' | ')));
            await page.keyboard.press('Escape');
        }
    } finally { await browser.close(); }
})();
