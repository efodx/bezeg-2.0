setTimeout(() => process.exit(2), 60000).unref();
const {chromium} = require('C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/node_modules/playwright');
(async () => {
    const b = await chromium.launch();
    try {
        for (const lang of ['sl', 'en']) {
            const p = await (await b.newContext({viewport: {width: 1280, height: 900}})).newPage();
            await p.goto('http://localhost:4313/bezeg-2.0/learn/triangulations-voronoi');
            await p.selectOption('#bezeg-language', lang);
            await p.waitForTimeout(1500);
            const s = p.locator('#voronoi-degenerate');
            await s.scrollIntoViewIfNeeded();
            await p.waitForTimeout(800);
            console.log(lang, await s.evaluate(e => e.querySelectorAll('mjx-container').length));
            await s.screenshot({path: `docs/reviews/triangulation-voronoi/41-browser/section-${lang}.png`});
        }
    } finally { await b.close(); }
})();
