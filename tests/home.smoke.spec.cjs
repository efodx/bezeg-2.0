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
