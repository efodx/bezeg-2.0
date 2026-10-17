const {test, expect} = require('@playwright/test');
const demonstrations = require('./smoke-catalog.cjs');
const clips = ['bezier', 'repeated-subdivision', 'bisection', 'affine', 'elevation', 'rational-elevation', 'decasteljau', 'farin', 'derivative', 'weighted-parameterization', 'complex-multiplication', 'accumulation'];
const card = (page, id) => page.locator('#demonstration-card-' + id);
test.use({reducedMotion: 'no-preference'});

async function openEnglish(page, pathname = '/bezeg-2.0/demonstrations') {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
    await page.goto(pathname, {waitUntil: 'domcontentloaded'});
}
async function playing(entry) {
    const video = entry.locator('video[src]');
    await expect(video).toHaveCount(1);
    await expect.poll(() => video.evaluate(v => ({ready:v.readyState >= 2, playing:!v.paused, width:v.videoWidth, height:v.videoHeight})))
        .toEqual({ready:true, playing:true, width:720, height:440});
    expect(await video.evaluate(v => v.muted && v.playsInline && v.loop && !v.controls)).toBe(true);
    await expect(video).toHaveAttribute('aria-hidden', 'true');
    return video;
}

test('visible previews loop automatically without buttons or offscreen media requests', async ({page}) => {
    const requests = [], types = [];
    page.on('request', r => {if (/\.webm(?:\?|$)/.test(r.url())) requests.push(r.url());});
    page.on('response', r => {if (/\.webm(?:\?|$)/.test(r.url())) types.push(r.headers()['content-type']);});
    await page.setViewportSize({width:1440, height:1000});
    await openEnglish(page);
    await expect(page.locator('.demonstrations-catalog-card')).toHaveCount(demonstrations.length);
    await expect(page.locator('.demonstration-preview-control')).toHaveCount(0);
    expect(await card(page, 'bezier').locator('.demonstration-preview-stage > .demonstration-card-open').evaluate(a => a.getBoundingClientRect().height)).toBeGreaterThan(0);
    const video = await playing(card(page, 'bezier'));
    expect(requests.length).toBeGreaterThan(0);
    const visibleSources = await page.locator('video[src]').evaluateAll(videos => videos.map(v => {
        const bounds = v.getBoundingClientRect();
        return {src: v.src, visible: bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth};
    }));
    expect(visibleSources.every(item => item.visible)).toBe(true);
    expect(requests.every(url => visibleSources.some(item => item.src === url))).toBe(true);
    await expect.poll(() => video.evaluate(v => v.currentTime), {intervals:[100]}).toBeGreaterThan(3.5);
    await expect.poll(() => video.evaluate(v => v.currentTime), {timeout:3000, intervals:[100]}).toBeLessThan(1.5);
    await playing(card(page, 'bezier'));
    expect(types.every(type => type?.startsWith('video/webm'))).toBe(true);
});

test('every clip decodes as it enters view and unloads offscreen', async ({page}) => {
    await openEnglish(page);
    for (const id of clips) {
        const entry = card(page, id);
        await entry.locator('.demonstration-preview-media').scrollIntoViewIfNeeded();
        await playing(entry);
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('video[src]')).toHaveCount(0);
});

test('multiple visible clips loop together without hover or focus restarts', async ({page}) => {
    await page.setViewportSize({width:1440, height:1800});
    await openEnglish(page, '/bezeg-2.0/demonstrations?topic=%2Fbezeg-2.0%2Fbezier');
    const first = card(page, 'bezier'), video = await playing(first);
    await playing(card(page, 'affine'));
    await playing(card(page, 'elevation'));
    await video.evaluate(v => {v.dataset.smokeIdentity = 'same-loop';});
    await first.hover();
    await first.locator('.demonstrations-catalog-title a').focus();
    await expect(video).toHaveAttribute('data-smoke-identity', 'same-loop');
    await page.getByRole('searchbox').fill('not-a-demonstration');
    await expect(page.locator('video[src]')).toHaveCount(0);
});

test('reduced motion keeps posters and cancels active loops', async ({page}) => {
    const requests = [];
    page.on('request', r => {if (/\.webm(?:\?|$)/.test(r.url())) requests.push(r.url());});
    await page.emulateMedia({reducedMotion:'reduce'});
    await openEnglish(page);
    await card(page, 'affine').scrollIntoViewIfNeeded();
    await expect(page.locator('video[src]')).toHaveCount(0);
    expect(requests).toHaveLength(0);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await playing(card(page, 'affine'));
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect(page.locator('video[src]')).toHaveCount(0);
    await expect(card(page, 'affine').locator('img')).toBeVisible();
});

test('failed media retains a usable poster and navigation at 390px', async ({page}) => {
    await page.setViewportSize({width:390, height:844});
    await page.route('**/*.webm', route => route.abort());
    await openEnglish(page);
    const entry = card(page, 'bezier');
    await entry.scrollIntoViewIfNeeded();
    await expect(entry.locator('video[src]')).toHaveCount(0);
    await expect(entry.locator('img')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(entry.getByRole('button')).toHaveCount(0);
    await entry.locator('.demonstrations-catalog-title a').click();
    await expect(page).toHaveURL(/\/bezier\/curve$/);
    await expect(page.locator('#jgbox')).toBeVisible();
});

test('picker starts visible loops automatically and disposes them on close', async ({page}) => {
    await page.setViewportSize({width:390, height:844});
    await openEnglish(page, '/bezeg-2.0/bezier/curve');
    await page.getByRole('button', {name:'Switch demonstration', exact:true}).click();
    const dialog = page.getByRole('dialog', {name:'Switch demonstration', exact:true});
    await playing(card(dialog, 'bezier'));
    await dialog.getByRole('button', {name:'Close', exact:true}).click();
    await expect(page.locator('video[src]')).toHaveCount(0);
    await expect(page.locator('#jgbox')).toBeVisible();
    await page.getByRole('button', {name:'Switch demonstration', exact:true}).click();
    await playing(card(dialog, 'bezier'));
    expect(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
});

test('delayed media retains the poster and cannot revive a filtered card', async ({page}) => {
    let release, requested = false;
    const gate = new Promise(resolve => {release = resolve;});
    await page.route('**/*.webm', async route => {requested = true; await gate; await route.continue().catch(() => {});});
    try {
        await openEnglish(page);
        const entry = card(page, 'bezier');
        await expect.poll(() => requested).toBe(true);
        await expect(entry.locator('img')).toBeVisible();
        await expect(entry.locator('video')).not.toHaveClass(/is-frame-ready/);
        await page.getByRole('searchbox').fill('Bernstein');
        await expect(page.locator('video[src]')).toHaveCount(0);
        release();
        await expect(page.locator('video[src]')).toHaveCount(0);
    } finally {release();}
});

test('carousel shares the catalog clip and disposes it when its slide changes', async ({page}) => {
    await openEnglish(page);
    const source = await (await playing(card(page, 'bezier'))).getAttribute('src');
    await page.goto('/bezeg-2.0', {waitUntil:'domcontentloaded'});
    const opening = page.locator('.demonstrations-opening');
    await opening.hover();
    const selected = opening.locator('.demonstrations-opening-image[data-selected="true"]');
    expect(await (await playing(selected)).getAttribute('src')).toBe(source);
    await expect(opening.locator('.demonstration-preview-control')).toHaveCount(0);
    const choices = opening.locator('.demonstrations-opening-choice');
    await choices.nth(1).click();
    await expect(opening.locator('video[src]')).toHaveCount(0);
    await choices.first().click();
    await playing(opening.locator('.demonstrations-opening-image[data-selected="true"]'));
});
