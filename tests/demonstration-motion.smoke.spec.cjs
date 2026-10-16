const {test, expect} = require('@playwright/test');
const demonstrations = require('./smoke-catalog.cjs');

const catalogPath = '/bezeg-2.0/demonstrations';
const card = (page, id) => page.locator(`#demonstration-card-${id}`);
const control = entry => entry.locator('.demonstration-preview-control');

async function openEnglish(page, path = catalogPath) {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
    await page.goto(path, {waitUntil: 'domcontentloaded'});
}

async function expectPlayback(entry) {
    const video = entry.locator('video');
    await expect(video).toHaveCount(1);
    await expect.poll(() => video.evaluate(element => ({
        ready: element.readyState >= 2,
        playing: !element.paused,
        width: element.videoWidth,
        height: element.videoHeight,
    }))).toEqual({ready: true, playing: true, width: 720, height: 440});
    await expect(video).toHaveAttribute('aria-hidden', 'true');
    expect(await video.evaluate(element => element.muted && element.playsInline && !element.loop)).toBe(true);
}

test('clips stay unloaded until explicit activation and each pilot decodes one pass', async ({page}) => {
    const requests = [];
    const mediaResponses = [];
    page.on('request', request => {if (/\.webm(?:\?|$)/.test(request.url())) requests.push(request.url());});
    page.on('response', response => {
        if (/\.webm(?:\?|$)/.test(response.url())) mediaResponses.push(response.headers()['content-type']);
    });
    await openEnglish(page);
    await expect(page.locator('.demonstrations-catalog-card')).toHaveCount(demonstrations.length);
    await expect(page.locator('video[src], video source[src]')).toHaveCount(0);
    expect(requests).toHaveLength(0);
    for (const id of ['bezier', 'repeated-subdivision', 'bisection']) {
        const entry = card(page, id);
        await entry.scrollIntoViewIfNeeded();
        await control(entry).focus();
        // The suite uses reduced motion: focus and pointer hover must keep the still.
        await entry.hover();
        await expect(entry.locator('video[src], video source[src]')).toHaveCount(0);
        if (id === 'bezier') expect(requests).toHaveLength(0);
        const before = requests.length;
        await control(entry).click();
        await expectPlayback(entry);
        expect(requests.length).toBeGreaterThan(before);
        await expect(control(entry)).toContainText(/stop/i);
        await expect(control(entry)).toContainText(/replay/i, {timeout: 7000});
        await expect(entry.locator('video')).toHaveCount(0);
        await expect(entry.locator('img')).toBeVisible();
    }
    expect(new Set(requests).size).toBe(3);
    expect(mediaResponses.length).toBeGreaterThanOrEqual(3);
    expect(mediaResponses.every(type => type?.startsWith('video/webm'))).toBe(true);
});

test('hover and contained keyboard focus share a pass; leaving and reduced-motion changes cancel it', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await page.setViewportSize({width: 1440, height: 1100});
    await openEnglish(page, `${catalogPath}?topic=${encodeURIComponent('/bezeg-2.0/bezier')}`);
    const entry = card(page, 'bezier');
    await entry.hover();
    await expectPlayback(entry);
    const video = entry.locator('video');
    const identity = await video.evaluate(element => {element.dataset.smokeIdentity = 'original'; return element.dataset.smokeIdentity;});
    await entry.locator('.demonstrations-catalog-title a').focus();
    await expect(video).toHaveAttribute('data-smoke-identity', identity);
    await page.emulateMedia({reducedMotion: 'reduce'});
    await expect(entry.locator('video')).toHaveCount(0);
    await control(entry).click();
    await expectPlayback(entry);
    await page.mouse.move(0, 0);
    await expect(entry.locator('video')).toHaveCount(0);
});

test('one active clip survives rapid selection safely and filtering/offscreen stop playback', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 1100});
    await openEnglish(page);
    const bezier = card(page, 'bezier');
    const subdivision = card(page, 'repeated-subdivision');
    await control(bezier).click();
    await expectPlayback(bezier);
    await control(subdivision).click();
    await expectPlayback(subdivision);
    await expect(page.locator('video')).toHaveCount(1);
    await expect(bezier.locator('video')).toHaveCount(0);
    await page.getByRole('searchbox').fill('elevation');
    await expect(page.locator('video')).toHaveCount(0);
    await page.getByRole('searchbox').fill('');
    await control(bezier).click();
    await expectPlayback(bezier);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('video')).toHaveCount(0);
});

test('explicit keyboard playback keeps the same pass when focus moves within the card', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await openEnglish(page);
    const entry = card(page, 'bezier');
    await control(entry).focus();
    await expect(entry.locator('video')).toHaveCount(0);
    await page.keyboard.press('Space');
    await expectPlayback(entry);
    await entry.locator('video').evaluate(element => {element.dataset.smokeIdentity = 'keyboard-pass';});
    await entry.locator('.demonstrations-catalog-title a').focus();
    await expect(entry.locator('video')).toHaveAttribute('data-smoke-identity', 'keyboard-pass');
});

test('failed media keeps the poster and navigation usable at 390px', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.route('**/*.webm', route => route.abort());
    await openEnglish(page);
    const entry = card(page, 'bezier');
    await control(entry).click();
    await expect(entry.locator('video')).toHaveCount(0);
    await expect(entry.locator('img')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await control(entry).evaluate(button => !button.closest('a') && !button.parentElement.closest('button'))).toBe(true);
    await entry.locator('.demonstrations-catalog-title a').click();
    await expect(page).toHaveURL(/\/bezier\/curve$/);
    await expect(page.locator('#jgbox')).toBeVisible();
});

test('picker playback is disposed on close and reopening preserves the graph', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await openEnglish(page, '/bezeg-2.0/bezier/curve');
    await page.getByRole('button', {name: 'Switch demonstration', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Switch demonstration', exact: true});
    await control(card(dialog, 'bezier')).click();
    await expectPlayback(card(dialog, 'bezier'));
    await dialog.getByRole('button', {name: 'Close', exact: true}).click();
    await expect(page.locator('video')).toHaveCount(0);
    await expect(page.locator('#jgbox')).toBeVisible();
    await page.getByRole('button', {name: 'Switch demonstration', exact: true}).click();
    await expect(dialog.locator('video')).toHaveCount(0);
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test('a delayed request retains the poster and cannot revive a filtered card', async ({page}) => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let requested = false;
    await page.route('**/*.webm', async route => {
        requested = true;
        await gate;
        await route.continue().catch(() => {}); // Filtering may have cancelled this request already.
    });
    try {
        await openEnglish(page);
        const entry = card(page, 'bezier');
        await control(entry).click();
        await expect.poll(() => requested).toBe(true);
        await expect(entry.locator('img')).toBeVisible();
        await expect(entry.locator('video')).not.toHaveClass(/is-frame-ready/);
        await page.getByRole('searchbox').fill('Bernstein');
        await expect(page.locator('video')).toHaveCount(0);
        release();
        await expect(page.locator('video')).toHaveCount(0);
    } finally {
        release();
    }
});

test.describe('touch activation', () => {
    test.use({hasTouch: true, viewport: {width: 390, height: 844}, reducedMotion: 'no-preference'});

    test('a first tap on Play starts a pass without synthetic hover toggling it off', async ({page}) => {
        await openEnglish(page);
        const entry = card(page, 'bezier');
        await control(entry).scrollIntoViewIfNeeded();
        const bounds = await control(entry).boundingBox();
        await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await expectPlayback(entry);
        await control(entry).tap();
        await expect(entry.locator('video')).toHaveCount(0);
    });
});
