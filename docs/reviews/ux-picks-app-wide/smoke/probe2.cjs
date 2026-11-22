const {chromium} = require('playwright');
setTimeout(() => process.exit(2), 100000).unref();
const B = 'http://127.0.0.1:4481/bezeg-2.0/';
(async () => {
    const browser = await chromium.launch();
    try {
        const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
        const page = await ctx.newPage();
        await page.goto(B + 'analysis/taylor'); await page.waitForTimeout(3000);
        console.log('boards', await page.evaluate(() => [...document.querySelectorAll('[id*=jxg], .JXG_wrap, svg, canvas')].slice(0, 6).map(e => e.tagName + '#' + e.id + '.' + String(e.className.baseVal ?? e.className).slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width))));
        await page.getByRole('button', {name: 'Shrani'}).click(); await page.waitForTimeout(600);
        console.log('after Shrani', await page.evaluate(() => [...document.querySelectorAll('input,button,[role=menuitem],[role=dialog]')].filter(e => e.offsetParent).map(e => e.tagName + ':' + (e.getAttribute('aria-label') || e.textContent || e.placeholder || '').trim().slice(0, 25)).slice(16).join(' ; ')));
        await page.keyboard.press('Escape');
        await page.getByRole('button', {name: /Spoznaj to demonstracijo/}).click(); await page.waitForTimeout(1500);
        console.log('lesson', await page.locator('section.guided-lesson').evaluate(e => e.innerText.slice(0, 500) + ' || ' + [...e.querySelectorAll('button')].map(b => b.className + ':' + b.disabled + ':' + b.textContent.trim().slice(0, 20)).join(' ; ')));
        const p2 = await ctx.newPage();
        await p2.goto(B + 'analysis/phase-portrait'); await p2.waitForTimeout(3500);
        console.log('phase', await p2.evaluate(() => [...document.querySelectorAll('input[type=range],input[role=spinbutton]')].map(e => e.type + ':' + e.id + ':' + (e.closest('label,div')?.textContent || '').trim().slice(0, 40) + '=' + e.value).join(' ; ')));
        console.log('phase boards', await p2.evaluate(() => [...document.querySelectorAll('[id*=jxg], .JXG_wrap')].slice(0, 4).map(e => e.tagName + '#' + e.id + ' ' + Math.round(e.getBoundingClientRect().width))));
    } finally { await browser.close(); }
})();
