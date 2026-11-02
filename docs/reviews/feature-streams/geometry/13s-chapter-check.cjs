// Sweep 13 handler check: the sweep-algorithms chapter page in both languages, an activity's return link and a live switch.
// Run against `just preview 4313`: node docs/reviews/feature-streams/geometry/13s-chapter-check.cjs
const path = require('node:path');
const repo = path.resolve(__dirname, '..', '..', '..', '..');
const {chromium} = require(path.join(repo, 'node_modules', '@playwright/test'));
const ORIGIN = 'http://127.0.0.1:4313';
const results = [];
const check = (name, ok, info = '') => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' :: ' + info : ''}`);

(async () => {
    const browser = await chromium.launch();
    for (const language of ['sl', 'en']) {
        const page = await browser.newPage({viewport: {width: 1366, height: 768}});
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.addInitScript(lang => localStorage.setItem('bezeg-2.0:bezeg-language', lang), language);
        await page.goto(`${ORIGIN}/bezeg-2.0/learn/sweep-algorithms`);
        await page.waitForSelector('.chapter-section');
        const sections = await page.locator('.chapter-section').evaluateAll(nodes => nodes.map(node => node.id));
        check(`[${language}] sections`, ['sweep-idea', 'interval-sweep', 'segment-intersections'].every(id => sections.includes(id)), sections.join(','));
        const heading = await page.locator('h1').first().innerText();
        check(`[${language}] heading`, language === 'sl' ? /Algoritmi pometanja/.test(heading) : /Sweep/i.test(heading), heading);
        const prereq = page.locator('a[href*="/learn/convexity-hulls#orientation"]');
        check(`[${language}] chapter prerequisite link to orientation`, await prereq.count() > 0);
        const mathOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
        check(`[${language}] no horizontal page overflow`, !mathOverflow);
        const link = page.locator('#segment-intersections .chapter-guided-lessons a').first();
        const linkId = await link.getAttribute('id');
        const href = await link.getAttribute('href');
        check(`[${language}] activity link`, /segment-intersections/.test(href ?? ''), href ?? 'none');
        await link.click();
        await page.waitForSelector('.guided-lesson');
        check(`[${language}] lesson opens with board`, await page.locator('#jgbox').isVisible());
        const back = page.locator('.guided-lesson-owner a[href="/bezeg-2.0/learn/sweep-algorithms#segment-intersections"]');
        check(`[${language}] reading return link visible`, await back.isVisible());
        await back.click();
        await page.waitForURL(/\/learn\/sweep-algorithms#segment-intersections$/);
        await page.waitForTimeout(300);
        const focused = await page.evaluate(() => document.activeElement?.id ?? '');
        check(`[${language}] focus returns to the activity link`, focused === linkId, `focused=${focused} expected=${linkId}`);
        if (language === 'sl') {
            const before = await page.locator('h1').first().innerText();
            await page.locator('header select').selectOption('en');
            await page.waitForTimeout(400);
            const after = await page.locator('h1').first().innerText();
            const prose = await page.locator('#segment-intersections').innerText();
            check('[sl->en] live switch changes the chapter heading', after === 'Sweep-line algorithms', `${before} -> ${after}`);
            check('[sl->en] live switch changes section prose', /Learning outcome/.test(prose));
            check('[sl->en] focus/URL kept on the section', page.url().endsWith('#segment-intersections'), page.url());
        }
        check(`[${language}] no page errors`, errors.length === 0, errors.join(' | '));
        await page.close();
    }
    await browser.close();
    console.log(results.join('\n'));
    console.log(`SUMMARY ${results.filter(r => r.startsWith('PASS')).length}/${results.length} passed`);
})().catch(error => { console.error(error); process.exit(1); });
