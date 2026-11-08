const {test, expect} = require('@playwright/test');
const demonstrations = require('./smoke-catalog.cjs');
const demonstrationById = new Map(demonstrations.map(demonstration => [demonstration.id, demonstration]));
const familyById = new Map(demonstrations.families.map(family => [family.id, family]));
const startingIds = ['bezier', 'bernstein', 'rational', 'spline-c1', 'ph-cubic', 'derivative'];

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

    const opening = page.getByRole('region', {name: 'Starting demonstrations'});
    await expect(opening).toBeVisible();
    await expect(page.getByRole('region', {name: 'All demonstrations'})).toHaveCount(0);
    await expect(page.locator('main footer')).toContainText('Bezeg is a web tool for exploring the properties of Bézier and PH curves graphically.');
    const pageOrder = await shortcut.evaluate(link => {
        const page = link.closest('main');
        const showcase = page?.querySelector('section');
        const footer = page?.querySelector('footer');
        return {
            shortcutBeforeCarousel: Boolean(showcase && link.compareDocumentPosition(showcase) & Node.DOCUMENT_POSITION_FOLLOWING),
            carouselBeforeFooter: Boolean(showcase && footer && showcase.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING),
        };
    });
    expect(pageOrder.shortcutBeforeCarousel).toBe(true);
    expect(pageOrder.carouselBeforeFooter).toBe(true);

    await expect(opening.locator('.demonstrations-opening-image')).toHaveCount(startingIds.length);
    const openingImage = opening.locator('.demonstrations-opening-image[data-selected="true"] img');
    await expect(openingImage).toHaveCount(1);
    await expect(openingImage).toHaveAttribute('src', /bezier/);
    await expect(openingImage).toHaveCSS('opacity', '1');
    await expect(openingImage).toHaveAttribute('alt', '');
    await expect.poll(() => openingImage.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    const first = demonstrationById.get(startingIds[0]);
    await expect(opening.getByRole('heading', {level: 3, name: first.title})).toBeVisible();
    await expect(opening.locator('[aria-pressed="true"]')).toHaveCount(1);

    const choices = opening.getByRole('group', {name: 'Starting demonstrations'}).getByRole('button');
    await expect(choices).toHaveCount(startingIds.length);
    const expectedChoiceNames = startingIds.map(id => {
        const demonstration = demonstrationById.get(id);
        return `${familyById.get(demonstration.family).title}: ${demonstration.title}`;
    });
    expect(await choices.evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')))).toEqual(expectedChoiceNames);

    const selected = demonstrationById.get('bernstein');
    await choices.nth(1).click();
    await expect(choices.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(openingImage).toHaveAttribute('src', new RegExp(selected.id));
    await expect(openingImage).toHaveCSS('opacity', '1');
    await expect.poll(() => openingImage.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(opening.getByRole('heading', {level: 3, name: selected.title})).toBeVisible();
    const graph = opening.getByRole('link', {name: `Open demonstration: ${selected.title}`});
    await expect(graph).toHaveAttribute('href', selected.path);
    const lesson = opening.getByRole('link', {name: `Guided example: ${selected.title}`});
    await expect(lesson).toHaveAttribute('href', `${selected.path}?learn=1`);

    await shortcut.click();
    await expect(page.getByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
    await expect(page.getByRole('region', {name: 'All demonstrations'})).toBeVisible();
    await expect(page.getByRole('region', {name: 'Starting demonstrations'})).toHaveCount(0);
    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(page.getByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('region', {name: 'Starting demonstrations'})).toBeVisible();
});

test('the homepage fits the target widths in Slovenian and English', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/');
    const slPage = await page.context().newPage();
    await slPage.addInitScript(() => localStorage.removeItem('bezeg-2.0:bezeg-language'));
    try {
        await slPage.goto('/bezeg-2.0/', {waitUntil: 'domcontentloaded'});
        for (const [currentPage, language, headline, intro, shortcutName, carouselName] of [
            [page, 'en', 'Mathematics you can move.', 'Change a point or parameter. Observe the shape. Understand the connection.', /All demonstrations/, 'Starting demonstrations'],
            [slPage, 'sl', 'Matematika, ki jo lahko premakneš.', 'Spremeni točko ali parameter. Opazuj obliko. Razumi povezavo.', /Vse demonstracije/, 'Začetne demonstracije'],
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
    const opening = page.getByRole('region', {name: 'Starting demonstrations'});
    const choices = opening.getByRole('group', {name: 'Starting demonstrations'}).getByRole('button');
    await expect(opening.locator('video[src]')).toHaveCount(0);
    expect(requests).toHaveLength(0);
    await page.evaluate(() => {
        document.addEventListener('ended', event => {
            if (event.target instanceof HTMLVideoElement) document.documentElement.dataset.endedClip = event.target.currentSrc;
        }, {capture: true, once: true});
    });

    await choices.nth(1).click();
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

    await choices.nth(0).click();
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
        const opening = touchPage.getByRole('region', {name:'Starting demonstrations'});
        const choices = opening.getByRole('group', {name:'Starting demonstrations'}).getByRole('button');
        await choices.nth(2).tap();
        const video = opening.locator('.demonstrations-opening-image[data-selected="true"] video[src]');
        await expect(video).toHaveCount(1);
        await expect.poll(() => video.evaluate(element => !element.paused && element.readyState >= 2)).toBe(true);
        expect(await video.evaluate(element => element.muted && element.playsInline && !element.loop)).toBe(true);
        expect(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally {
        await context.close();
    }
});
