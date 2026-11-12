// Usage: node shoot.cjs <tag> [chapterId ...]
// Captures chapter pages at desktop, projection and phone widths, as viewport slices at several scroll offsets.
const path = require('node:path');
const {chromium} = require(path.join(process.env.BEZEG_WT, 'node_modules', '@playwright/test'));

const base = 'http://localhost:4467/bezeg-2.0/learn/';
const out = path.join(__dirname, 'shots'); // untracked evidence
const tag = process.argv[2] || 'before';
const chapters = process.argv.slice(3).length ? process.argv.slice(3) : ['convexity-hulls'];
const sizes = [
    {name: 'desktop', width: 1366, height: 800},
    {name: 'wide', width: 1920, height: 1080},
    {name: 'phone', width: 390, height: 780},
];

(async () => {
    require('node:fs').mkdirSync(out, {recursive: true});
    const browser = await chromium.launch();
    for (const chapter of chapters) {
        for (const size of sizes) {
            const context = await browser.newContext({viewport: {width: size.width, height: size.height}, deviceScaleFactor: 1});
            const page = await context.newPage();
            const errors = [];
            page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
            page.on('pageerror', error => errors.push(String(error)));
            await page.goto(base + chapter, {waitUntil: 'domcontentloaded', timeout: 120000});
            await page.waitForSelector('.chapter-article', {timeout: 120000}); await page.waitForFunction(() => document.querySelector('.chapter-article mjx-container'), null, {timeout: 60000}).catch(() => {});
            await page.waitForTimeout(2500);
            const metrics = await page.evaluate(() => {
                const px = selector => { const node = document.querySelector(selector); return node ? getComputedStyle(node).fontSize : null; };
                const width = selector => { const node = document.querySelector(selector); return node ? Math.round(node.getBoundingClientRect().width) : null; };
                return {
                    title: document.title,
                    height: document.documentElement.scrollHeight,
                    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                    paragraphFont: px('.chapter-paragraph'), paragraphWidth: width('.chapter-paragraph'),
                    purposeWidth: width('.chapter-purpose'), articleWidth: width('.chapter-article'),
                    sections: document.querySelectorAll('.chapter-section').length,
                    cards: document.querySelectorAll('.chapter-exploration').length,
                    formulas: document.querySelectorAll('.chapter-formula').length,
                };
            });
            console.log(chapter, size.name, JSON.stringify(metrics), errors.length ? 'ERRORS ' + errors.slice(0, 3).join(' | ') : '');
            const offsets = [0, 0.12, 0.3, 0.55, 1];
            for (let index = 0; index < offsets.length; index++) {
                const top = Math.round((metrics.height - size.height) * offsets[index]);
                await page.evaluate(y => window.scrollTo(0, y), top);
                await page.waitForTimeout(350);
                await page.screenshot({path: path.join(out, `${tag}-${chapter}-${size.name}-${index}.png`)});
            }
            await context.close();
        }
    }
    await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
