// Screenshots of the implemented design slices from a running preview. Usage: node shots.mjs [origin] [name-filter]
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const origin = process.argv[2] ?? 'http://127.0.0.1:4332';
const filter = process.argv[3] ?? '';
const out = path.join(here, 'shots');
mkdirSync(out, {recursive: true});
const base = `${origin}/bezeg-2.0`;
const browser = await chromium.launch();

async function shot(name, url, {width = 1440, height = 900, scale = 1, before, storage} = {}) {
    if (filter && !name.includes(filter)) return;
    const context = await browser.newContext({viewport: {width, height}, deviceScaleFactor: scale, reducedMotion: 'reduce'});
    if (storage) await context.addInitScript(entries => { for (const [key, value] of entries) localStorage.setItem(key, value); }, storage);
    const page = await context.newPage();
    page.on('pageerror', error => console.log('  page error', name, error.message.slice(0, 160)));
    try {
        await page.goto(url, {waitUntil: 'networkidle'});
        await page.waitForTimeout(1200);
        const result = before ? await before(page) : undefined;
        await page.waitForTimeout(300);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        await page.screenshot({path: path.join(out, `${name}.png`), clip: result?.clip});
        console.log('ok', name, overflow > 0 ? `HORIZONTAL OVERFLOW ${overflow}px` : '', result?.log ?? '');
    } catch (error) {
        console.log('FAIL', name, String(error).split('\n').slice(0, 2).join(' '));
    } finally {
        await context.close();
    }
}

// Homepage carousel (H02, H03)
for (const [width, height] of [[1440, 980], [1024, 900], [390, 900]]) {
    await shot(`home-${width}`, base, {width, height, before: async page => {
        await page.locator('.demonstrations-opening-rail').scrollIntoViewIfNeeded();
        const labels = await page.locator('.demonstrations-opening-choice').evaluateAll(buttons => buttons.map(b => b.getAttribute('aria-label')));
        return {log: `\n  ${labels.join(' | ')}`};
    }});
}
await shot('home-cards-close', base, {width: 1440, height: 980, scale: 2, before: async page => {
    await page.locator('.demonstrations-opening-choice').nth(2).click();
    await page.mouse.move(5, 5);
    const box = await page.locator('.demonstrations-opening-rail').boundingBox();
    return {clip: {x: box.x - 10, y: box.y - 10, width: box.width + 20, height: box.height + 20}};
}});

// Chapters (L01, L05)
const toFirstSection = page => page.evaluate(() => {
    const first = document.querySelector('.chapter-section-heading').getBoundingClientRect();
    window.scrollTo(0, window.scrollY + first.top - 190);
});
await shot('chapter-family-1440', `${base}/learn/convexity-hulls`, {height: 620, before: toFirstSection});
await shot('chapter-bezier-1440', `${base}/learn/bezier-curves`, {height: 620, before: toFirstSection});
for (const [width, height] of [[2560, 1300], [1920, 1080], [1600, 900]]) {
    await shot(`chapter-botanicals-${width}`, `${base}/learn/bezier-curves`, {width, height, before: async page => {
        await page.waitForTimeout(3000);
        await page.evaluate(() => window.scrollTo(0, 700));
        const log = await page.evaluate(() => {
            const rect = selector => { const e = document.querySelector(selector); if (!e) return 'none'; const r = e.getBoundingClientRect(); return `${Math.round(r.left)}..${Math.round(r.right)}`; };
            return `left=${rect('.side-botanicals-left')} right=${rect('.side-botanicals-right')} column=${rect('[data-content-column]')} toc=${rect('.chapter-layout nav ol')} article=${rect('.chapter-article')}`;
        });
        return {log};
    }});
}
await shot('chapter-1280-no-botanicals', `${base}/learn/bezier-curves`, {width: 1280, height: 800, before: async page => ({log: `svg count=${await page.locator('.side-botanicals').count()}`})});

// Guided lesson Back button (L04)
await shot('lesson-back', `${base}/analysis/darboux?learn=1`, {scale: 2, before: async page => {
    await page.locator('.guided-lesson-nav-next').click();
    await page.waitForTimeout(700);
    await page.mouse.move(5, 5);
    const box = await page.locator('.guided-lesson').boundingBox();
    return {clip: {x: box.x - 14, y: box.y - 14, width: box.width + 28, height: 250}};
}});

// Presets panel (P01, P02)
const stored = [['bezeg-2.0:bezeg-language', 'sl']];
const openSaveTab = async page => {
    await page.getByRole('tab', {name: 'Shrani'}).or(page.locator('button', {hasText: /^Shrani$/}).first()).first().click();
    await page.waitForTimeout(500);
};
const panelClip = async page => {
    const box = await page.locator('#inspector-save, .workspace-inspector').first().boundingBox();
    return {clip: {x: 1076, y: 260, width: 310, height: Math.min(640, box ? box.height + 140 : 640)}};
};
const savePreset = async (page, name) => {
    await page.locator('.preset-save').click();
    await page.locator('input[type=text]').last().fill(name);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
};
await shot('presets-empty', `${base}/analysis/darboux`, {scale: 2, storage: stored, before: async page => { await openSaveTab(page); return panelClip(page); }});
await shot('presets-saving', `${base}/analysis/darboux`, {scale: 2, storage: stored, before: async page => {
    await openSaveTab(page);
    await savePreset(page, 'parabola-4-deli');
    await page.locator('.preset-save').click();
    await page.locator('input[type=text]').last().fill('parabola-4-deli');
    return panelClip(page);
}});
await shot('presets-list', `${base}/analysis/darboux`, {scale: 2, storage: stored, before: async page => {
    await openSaveTab(page);
    for (const name of ['parabola-4-deli', 'sinus-8-delov', 'zelo-dolgo-ime-shranjenega-stanja-za-preizkus']) await savePreset(page, name);
    await page.mouse.move(5, 5);
    return panelClip(page);
}});
await shot('presets-menu', `${base}/analysis/darboux`, {scale: 2, storage: stored, before: async page => {
    await openSaveTab(page);
    for (const name of ['parabola-4-deli', 'sinus-8-delov']) await savePreset(page, name);
    await page.locator('li[data-preset-id] button').nth(1).click();
    return panelClip(page);
}});
await shot('presets-phone', `${base}/analysis/darboux`, {width: 390, height: 844, storage: stored, before: async page => {
    await openSaveTab(page);
    await savePreset(page, 'parabola-4-deli');
    await page.locator('.preset-save').scrollIntoViewIfNeeded();
}});

await browser.close();
