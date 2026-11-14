const {test, expect} = require('@playwright/test');
const demonstrations = require('./smoke-catalog.cjs');
const demonstrationById = new Map(demonstrations.map(demonstration => [demonstration.id, demonstration]));
const familyById = new Map(demonstrations.families.map(family => [family.id, family]));
const demonstrationByChoiceName = new Map(demonstrations.map(demonstration =>
    [`${familyById.get(demonstration.family).title}: ${demonstration.title}`, demonstration]));
const STARTING_COUNT = 6;

// The carousel draws its six entries at random on each full page load, so the specs read the drawn entries from the page
// and look each one up in the smoke catalogue instead of assuming fixed ids.
async function drawnEntries(choices) {
    await expect(choices).toHaveCount(STARTING_COUNT);
    const names = await choices.evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')));
    return names.map(name => {
        const demonstration = demonstrationByChoiceName.get(name);
        expect(demonstration, `carousel choice "${name}" is a catalogue demonstration`).toBeTruthy();
        return {name, demonstration};
    });
}

async function openEnglish(page, pathname) {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
    await page.goto(pathname, {waitUntil: 'domcontentloaded'});
}

test('the homepage owns the starting carousel and its actions lead to the selected demonstration', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/');

    await expect(page.getByRole('heading', {level: 1, name: 'Mathematics you can move.'})).toBeVisible();
    await expect(page.getByText('Change a point or parameter. Observe the shape. Understand the connection.')).toBeVisible();
    const shortcut = page.getByRole('link', {name: /All demonstrations/});
    await expect(shortcut).toHaveAttribute('href', '/bezeg-2.0/demonstrations');
    await expect(page.getByRole('main').getByRole('link', {name: /All learning content/})).toHaveAttribute('href', '/bezeg-2.0/learn');

    const opening = page.getByRole('region', {name: 'A selection of demonstrations'});
    await expect(opening).toBeVisible();
    await expect(page.getByRole('region', {name: 'All demonstrations'})).toHaveCount(0);
    await expect(page.locator('footer')).toHaveCount(0);
    const pageOrder = await shortcut.evaluate(link => {
        const page = link.closest('main');
        const showcase = page?.querySelector('section');
        return {
            shortcutBeforeCarousel: Boolean(showcase && link.compareDocumentPosition(showcase) & Node.DOCUMENT_POSITION_FOLLOWING),
            carouselIsLast: Boolean(showcase && page.lastElementChild === showcase),
        };
    });
    expect(pageOrder.shortcutBeforeCarousel).toBe(true);
    expect(pageOrder.carouselIsLast).toBe(true);

    await expect(opening.locator('.demonstrations-opening-image')).toHaveCount(STARTING_COUNT);
    const choices = opening.getByRole('group', {name: 'A selection of demonstrations'}).getByRole('button');
    const drawn = await drawnEntries(choices);
    expect(new Set(drawn.map(entry => entry.demonstration.family)).size, 'the six families are distinct').toBe(STARTING_COUNT);
    expect(new Set(drawn.map(entry => entry.demonstration.id)).size).toBe(STARTING_COUNT);
    await expect(opening.getByRole('button', {name: /previous|next/i})).toHaveCount(0);
    await expect(opening.getByText(/^\d+ \/ \d+$/)).toHaveCount(0);

    const openingImage = opening.locator('.demonstrations-opening-image[data-selected="true"] img');
    await expect(openingImage).toHaveCount(1);
    await expect(openingImage).toHaveAttribute('src', new RegExp(drawn[0].demonstration.id));
    await expect(openingImage).toHaveCSS('opacity', '1');
    await expect(openingImage).toHaveAttribute('alt', '');
    await expect.poll(() => openingImage.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(opening.getByRole('heading', {level: 3, name: drawn[0].demonstration.title})).toBeVisible();
    await expect(opening.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(choices.nth(0)).toHaveAttribute('aria-pressed', 'true');

    const selected = drawn[1].demonstration;
    await choices.nth(1).click();
    await expect(choices.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(openingImage).toHaveAttribute('src', new RegExp(selected.id));
    await expect(openingImage).toHaveCSS('opacity', '1');
    await expect.poll(() => openingImage.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(opening.getByRole('heading', {level: 3, name: selected.title})).toBeVisible();
    const graph = opening.getByRole('link', {name: `Open demonstration: ${selected.title}`});
    await expect(graph).toHaveAttribute('href', selected.path);
    const lesson = opening.getByRole('link', {name: `Guided example: ${selected.title}`});
    if (selected.hasLesson) await expect(lesson).toHaveAttribute('href', `${selected.path}?learn=1`);
    else await expect(lesson).toHaveCount(0);

    await shortcut.click();
    await expect(page.getByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('region', {name: 'A selection of demonstrations'})).toBeVisible();
    const afterBack = await drawnEntries(choices);
    expect(afterBack.map(entry => entry.name), 'client-side return keeps the same six in the same order').toEqual(drawn.map(entry => entry.name));
    await shortcut.click();
    await expect(page.getByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
    await expect(page.getByRole('region', {name: 'All demonstrations'})).toBeVisible();
    await expect(page.getByRole('region', {name: 'A selection of demonstrations'})).toHaveCount(0);
    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(page.getByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('region', {name: 'A selection of demonstrations'})).toBeVisible();
});

test('the homepage fits the target widths in Slovenian and English', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/');
    const slPage = await page.context().newPage();
    await slPage.addInitScript(() => localStorage.removeItem('bezeg-2.0:bezeg-language'));
    try {
        await slPage.goto('/bezeg-2.0/', {waitUntil: 'domcontentloaded'});
        for (const [currentPage, language, headline, intro, shortcutName, carouselName] of [
            [page, 'en', 'Mathematics you can move.', 'Change a point or parameter. Observe the shape. Understand the connection.', /All demonstrations/, 'A selection of demonstrations'],
            [slPage, 'sl', 'Matematika, ki jo lahko premakneš.', 'Spremeni točko ali parameter. Opazuj obliko. Razumi povezavo.', /Vse demonstracije/, 'Izbor demonstracij'],
        ]) {
            for (const width of [390, 724, 1440]) {
                await currentPage.setViewportSize({width, height: 900});
                await expect(currentPage.getByRole('heading', {level: 1, name: headline})).toBeVisible();
                await expect(currentPage.getByText(intro)).toBeVisible();
                await expect(currentPage.getByRole('link', {name: shortcutName})).toHaveAttribute('href', '/bezeg-2.0/demonstrations');
                const opening = currentPage.getByRole('region', {name: carouselName});
                await expect(opening).toBeVisible();
                const selectedImage = opening.locator('.demonstrations-opening-image[data-selected="true"]');
                await expect(selectedImage).toBeVisible();
                await expect(selectedImage).toHaveCSS('opacity', '1');
                const containment = await selectedImage.evaluate(layer => {
                    const outer = layer.getBoundingClientRect();
                    const media = layer.querySelector('.demonstration-preview-media').getBoundingClientRect();
                    return {height: media.height, contained: media.left >= outer.left - 1 && media.right <= outer.right + 1 && media.top >= outer.top - 1 && media.bottom <= outer.bottom + 1};
                });
                expect(containment.height).toBeGreaterThan(0);
                expect(containment.contained).toBe(true);
                const horizontalOverflow = await currentPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
                expect(horizontalOverflow, `${language} document overflow at ${width}px`).toBe(false);
            }
        }
    } finally {
        await slPage.close();
    }
});

test('a newly selected homepage preview plays one silent pass and returns to its poster', async ({page}) => {
    const requests = [];
    page.on('request', request => { if (/\.webm(?:\?|$)/.test(request.url())) requests.push(request.url()); });
    await page.setViewportSize({width:1440, height:900});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await openEnglish(page, '/bezeg-2.0/');
    const opening = page.getByRole('region', {name: 'A selection of demonstrations'});
    const choices = opening.getByRole('group', {name: 'A selection of demonstrations'}).getByRole('button');
    await expect(opening.locator('video[src]')).toHaveCount(0);
    expect(requests).toHaveLength(0);
    await page.evaluate(() => {
        document.addEventListener('ended', event => {
            if (event.target instanceof HTMLVideoElement) document.documentElement.dataset.endedClip = event.target.currentSrc;
        }, {capture: true, once: true});
    });

    const drawn = await drawnEntries(choices);
    // Only entries with a manifest clip play. The first click must change the selection, so it takes a clip entry after the first card.
    const clipIndexes = drawn.map((entry, index) => entry.demonstration.hasMotion ? index : -1).filter(index => index >= 0);
    const firstClip = clipIndexes.find(index => index > 0);
    const secondClip = clipIndexes.find(index => index !== firstClip);
    expect(firstClip, 'a drawn demonstration after the first carries a clip').toBeGreaterThan(0);
    expect(secondClip, 'a second drawn demonstration carries a clip').toBeDefined();
    await choices.nth(firstClip).click();
    const selected = opening.locator('.demonstrations-opening-image[data-selected="true"]');
    const video = selected.locator('video[src]');
    await expect(video).toHaveCount(1);
    await expect.poll(() => video.evaluate(element => !element.paused && element.readyState >= 2)).toBe(true);
    expect(await video.evaluate(element => element.muted && element.playsInline && !element.loop && !element.controls)).toBe(true);
    const source = await video.evaluate(element => element.src);
    await expect.poll(() => video.evaluate(element => element.currentTime), {timeout:5000, intervals:[100]}).toBeGreaterThan(0.2);
    await expect(video).toHaveCount(0, {timeout:10000});
    await expect(page.locator('html')).toHaveAttribute('data-ended-clip', source);
    await expect(selected.locator('.demonstration-preview-poster')).toBeVisible();
    expect(new Set(requests)).toEqual(new Set([source]));

    await choices.nth(secondClip).click();
    const returned = opening.locator('.demonstrations-opening-image[data-selected="true"] video[src]');
    await expect(returned).toHaveCount(1);
    await expect.poll(() => returned.evaluate(element => !element.paused && element.readyState >= 2)).toBe(true);
});

test('touch selection starts the selected homepage clip at 390px', async ({page}) => {
    const browser = page.context().browser();
    expect(browser).not.toBeNull();
    const context = await browser.newContext({viewport:{width:390, height:844}, hasTouch:true, reducedMotion:'no-preference'});
    try {
        const touchPage = await context.newPage();
        await openEnglish(touchPage, '/bezeg-2.0/');
        const opening = touchPage.getByRole('region', {name:'A selection of demonstrations'});
        const choices = opening.getByRole('group', {name:'A selection of demonstrations'}).getByRole('button');
        const drawn = await drawnEntries(choices);
        const clipIndex = drawn.findIndex((entry, index) => index > 0 && entry.demonstration.hasMotion);
        expect(clipIndex, 'a drawn demonstration after the first carries a clip').toBeGreaterThan(0);
        await choices.nth(clipIndex).tap();
        const video = opening.locator('.demonstrations-opening-image[data-selected="true"] video[src]');
        await expect(video).toHaveCount(1);
        await expect.poll(() => video.evaluate(element => !element.paused && element.readyState >= 2)).toBe(true);
        expect(await video.evaluate(element => element.muted && element.playsInline && !element.loop)).toBe(true);
        expect(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally {
        await context.close();
    }
});
