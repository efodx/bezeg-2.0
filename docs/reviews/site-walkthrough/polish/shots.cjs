// Evidence screenshots for docs/specs/site-walkthrough-shell-polish.md, slices 1-3.
// Usage: node .command-logs/polish/shots.cjs <outDir> [header|home|catalog|chapter ...]
const {chromium} = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const base = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4331';
const out = path.resolve(process.argv[2] || '.command-logs/polish/before');
const wanted = process.argv.slice(3);
const want = name => wanted.length === 0 || wanted.includes(name);
fs.mkdirSync(out, {recursive: true});
const metrics = {};

async function open(browser, width, language, pathname, height = 900) {
    const context = await browser.newContext({viewport: {width, height}, deviceScaleFactor: 2, reducedMotion: 'reduce'});
    await context.addInitScript(lang => localStorage.setItem('bezeg-2.0:bezeg-language', lang), language);
    const page = await context.newPage();
    await page.goto(base + pathname, {waitUntil: 'networkidle'});
    await page.evaluate(() => document.fonts.ready);
    return {context, page};
}
const box = locator => locator.evaluate(element => {
    const r = element.getBoundingClientRect();
    return {x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2)};
});

(async () => {
    const browser = await chromium.launch();
    if (want('header')) for (const width of [1440, 820, 390, 360]) for (const language of ['sl', 'en']) {
        const {context, page} = await open(browser, width, language, '/bezeg-2.0/');
        const header = page.locator('.app-header');
        await header.screenshot({path: path.join(out, `header-${width}-${language}.png`)});
        await page.locator('.app-brand').screenshot({path: path.join(out, `brand-${width}-${language}.png`)});
        metrics[`header-${width}-${language}`] = {
            header: await box(header), brand: await box(page.locator('.app-brand')),
            icon: await box(page.locator('.app-brand img')), word: await box(page.locator('.app-brand span')),
            actions: await box(page.locator('.app-header-actions')),
        };
        await context.close();
    }
    if (want('home')) for (const width of [1440, 390]) for (const language of ['sl', 'en']) {
        const {context, page} = await open(browser, width, language, '/bezeg-2.0/');
        await page.screenshot({path: path.join(out, `home-${width}-${language}.png`), fullPage: true});
        metrics[`home-${width}-${language}`] = await page.evaluate(() => {
            const main = document.querySelector('main.welcome-page');
            const last = main.lastElementChild.getBoundingClientRect();
            const m = main.getBoundingClientRect();
            return {footers: document.querySelectorAll('main footer').length, mainBottom: m.bottom, lastChild: main.lastElementChild.tagName,
                lastChildBottom: last.bottom, gapBelowLastChild: +(m.bottom - last.bottom).toFixed(2), viewport: innerHeight, scrollHeight: document.documentElement.scrollHeight};
        });
        await context.close();
    }
    if (want('catalog')) for (const width of [1440, 1024, 390]) for (const language of ['sl', 'en']) {
        const {context, page} = await open(browser, width, language, '/bezeg-2.0/demonstrations');
        await page.screenshot({path: path.join(out, `catalog-${width}-${language}.png`)});
        const card = page.locator('.demonstrations-catalog-card').first();
        await card.scrollIntoViewIfNeeded();
        await card.screenshot({path: path.join(out, `card-${width}-${language}.png`)});
        if (width !== 390) {
            await card.hover();
            await page.waitForTimeout(900);
            await card.screenshot({path: path.join(out, `card-hover-${width}-${language}.png`)});
        }
        const topics = page.locator('.demonstration-topics').first();
        if (await topics.count() && await topics.isVisible()) await topics.screenshot({path: path.join(out, `topics-${width}-${language}.png`)});
        await context.close();
    }
    let chapters = process.env.CHAPTERS ? process.env.CHAPTERS.split(',') : [];
    if (want('chapter') && chapters.length === 0) {
        const {context, page} = await open(browser, 1440, 'sl', '/bezeg-2.0/learn');
        const ids = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/learn/"]')].map(a => new URL(a.href).pathname.split('/learn/')[1]).filter(id => id && !id.includes('/')))]);
        chapters = [ids[0], ids[1], ids[ids.length - 1]];
        metrics.chapters = {count: ids.length, used: chapters};
        await context.close();
    }
    if (want('chapter')) for (const width of [1440, 390]) for (const language of ['sl', 'en']) for (const chapter of chapters) {
        const {context, page} = await open(browser, width, language, `/bezeg-2.0/learn/${chapter}`);
        for (const [name, selector] of [['trail', '.chapter-trail'], ['neighbors', '.learning-neighbors'], ['sidebar-neighbors', '.chapter-toc-neighbors']]) {
            const target = page.locator(selector).first();
            if (await target.count() && await target.isVisible()) {
                await target.scrollIntoViewIfNeeded();
                await target.screenshot({path: path.join(out, `${name}-${chapter}-${width}-${language}.png`)});
                metrics[`${name}-${chapter}-${width}-${language}`] = await box(target);
            }
        }
        await context.close();
    }
    await browser.close();
    fs.writeFileSync(path.join(out, `metrics${wanted.length ? '-' + wanted.join('-') : ''}.json`), JSON.stringify(metrics, null, 1));
    console.log('wrote', out, Object.keys(metrics).length, 'metric rows');
})().catch(error => { console.error(error); process.exit(1); });
