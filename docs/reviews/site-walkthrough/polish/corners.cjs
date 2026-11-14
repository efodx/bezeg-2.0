// D01 check: every capture corner against its card, at rest, on hover and while the clip plays.
// Usage: node .command-logs/polish/corners.cjs <outDir>   (PREVIEW_BASE_URL overrides the base)
const {chromium} = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const base = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4331';
const out = path.resolve(process.argv[2]);
fs.mkdirSync(out, {recursive: true});
(async () => {
    const browser = await chromium.launch();
    const rows = [];
    for (const width of [1440, 1024, 390]) for (const language of ['sl', 'en']) {
        const context = await browser.newContext({viewport: {width, height: 900}, deviceScaleFactor: 4});
        await context.addInitScript(lang => localStorage.setItem('bezeg-2.0:bezeg-language', lang), language);
        const page = await context.newPage();
        await page.goto(base + '/bezeg-2.0/demonstrations', {waitUntil: 'networkidle'});
        const card = page.locator('.demonstrations-catalog-card').first();
        await card.scrollIntoViewIfNeeded();
        const measure = async state => {
            const row = await card.evaluate((element, info) => {
                const cardBox = element.getBoundingClientRect();
                const media = [...element.querySelectorAll('img, video')].filter(node => getComputedStyle(node).display !== 'none' && +getComputedStyle(node).opacity > 0);
                return {...info, card: [cardBox.x, cardBox.y, cardBox.width, cardBox.height].map(v => +v.toFixed(2)), cardRadius: getComputedStyle(element).borderTopLeftRadius,
                    media: media.map(node => { const r = node.getBoundingClientRect(); const s = getComputedStyle(node);
                        return {tag: node.tagName, playing: node.tagName === 'VIDEO' ? !node.paused && node.currentTime > 0 : undefined, radius: s.borderTopLeftRadius, fit: s.objectFit,
                            insetLeft: +(r.x - cardBox.x).toFixed(2), insetTop: +(r.y - cardBox.y).toFixed(2), insetRight: +(cardBox.right - r.right).toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2),
                            natural: node.tagName === 'IMG' ? [node.naturalWidth, node.naturalHeight] : [node.videoWidth, node.videoHeight]}; })};
            }, {width, language, state});
            rows.push(row);
            const box = await card.boundingBox();
            for (const [name, x, y] of [['tl', box.x - 2, box.y - 2], ['tr', box.x + box.width - 38, box.y - 2]]) {
                await page.screenshot({path: path.join(out, `corner-${state}-${name}-${width}-${language}.png`), clip: {x, y, width: 40, height: 40}});
            }
        };
        await measure('rest');
        if (width !== 390) {
            await card.hover();
            await page.waitForTimeout(300);
            await measure('hover');
            await page.waitForTimeout(1800);
            await measure('play');
        } else {
            await card.locator('a, button').first().focus();
            await page.waitForTimeout(1800);
            await measure('focus');
        }
        await context.close();
    }
    await browser.close();
    fs.writeFileSync(path.join(out, 'corners.json'), JSON.stringify(rows, null, 1));
    for (const row of rows) console.log(row.width, row.language, row.state, JSON.stringify(row.card), row.cardRadius, JSON.stringify(row.media));
})().catch(error => { console.error(error); process.exit(1); });
