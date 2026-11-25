// Browser check: node scripts/bezier-puck-check.cjs <base-url> [route]  (the lone Bezier curve's control polygon and convex hull are board pucks)
const {chromium} = require('@playwright/test');
(async () => {
    const base = process.argv[2];
    const browser = await chromium.launch();
    const page = await browser.newPage({viewport: {width: 1440, height: 900}});
    page.on('pageerror', e => console.log('pageerror', e.message));
    await page.goto(`${base}${process.argv[3] || 'bezier/curve'}`);
    await page.waitForTimeout(3000);
    const keys = await page.$$eval('[data-puck-key]', els => els.map(e => e.getAttribute('data-puck-key')));
    console.log('puck keys', JSON.stringify(keys));
    const poly = page.locator('.puck-strip [data-puck-key="control-polygon-0"] [role="switch"]');
    const before = await poly.getAttribute('aria-checked');
    await poly.click();
    await page.waitForTimeout(300);
    console.log('control polygon puck before/after', before, await poly.getAttribute('aria-checked'));
    console.log('"Kontrolni poligon" elements outside the strip', await page.locator('text=Kontrolni poligon').evaluateAll(els => els.filter(e => !e.closest('.puck-strip')).length));
    await browser.close();
})();
