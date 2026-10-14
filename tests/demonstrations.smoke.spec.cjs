const {test, expect} = require('@playwright/test');
const demonstrations = require('./smoke-catalog.cjs');
const catalogEntries = demonstrations.families.flatMap(family => family.demonstrations);
const demonstrationByPath = new Map(demonstrations.map(demonstration => [demonstration.path, demonstration]));

async function openEnglish(page, pathname) {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
    await page.goto(pathname, {waitUntil: 'domcontentloaded'});
}

async function expandCatalog(catalog) {
    const topicToggles = catalog.locator('.demonstrations-topic-toggle');
    for (let index = 0; index < await topicToggles.count(); index += 1) {
        const toggle = topicToggles.nth(index);
        if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
    }
}

async function pathFromLink(link, page) {
    return new URL(await link.getAttribute('href'), page.url()).pathname;
}

async function expectRenderedWorkspace(page, demonstration) {
    await expect(page.locator('.workspace-heading h1')).toHaveText(demonstration.heading);

    const graph = page.getByRole('region', {name: 'Interactive graph'});
    await expect(graph).toBeVisible();
    const board = graph.locator('#jgbox');
    await expect(board).toBeVisible();
    await expect.poll(async () => board.evaluate(container => {
        const boards = Object.values(window.JXG?.boards || {});
        const jxgBoard = boards.find(candidate => candidate.container === container.id || candidate.containerObj === container);
        if (!jxgBoard) return 0;
        return Object.values(jxgBoard.objects || {}).filter(object => {
            if (!['curve', 'line'].includes(object.elType) || object.visProp?.visible === false || object.visProp?.visible === 'false') return false;
            const node = object.rendNode;
            if (!node?.isConnected || !(node.getAttribute?.('d') || node.getAttribute?.('x1'))) return false; // curves are paths; straight lines are SVG line elements
            const style = getComputedStyle(node);
            return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
        }).length;
    }), {timeout: 20_000}).toBeGreaterThan(0);

    const inspector = page.getByRole('complementary', {name: 'Demonstration tools'});
    await expect(inspector).toBeVisible();
}

test('the demonstrations page exposes its generated route previews and all active catalog destinations', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/demonstrations');

    const opening = page.locator('.demonstrations-opening-preview');
    await expect(opening).toBeVisible();
    const openingImage = opening.locator('.demonstrations-opening-image');
    await expect(openingImage).toHaveAttribute('alt', '');
    await expect.poll(() => openingImage.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    const openingActions = opening.locator('a');
    await expect(openingActions.first()).toContainText('Open demonstration');
    const openingPath = await pathFromLink(openingActions.first(), page);
    const openingDemonstration = demonstrationByPath.get(openingPath);
    expect(openingDemonstration, `opening action points to an unknown demonstration: ${openingPath}`).toBeDefined();
    if (openingDemonstration.hasLesson) {
        await expect(openingActions).toHaveCount(2);
        await expect(openingActions.nth(1)).toContainText('Guided lesson');
        await expect(openingActions.nth(1)).toHaveAttribute('href', `${openingDemonstration.path}?learn=1`);
    } else {
        await expect(openingActions).toHaveCount(1);
    }
    await expect(openingImage).toHaveAttribute('src', new RegExp(openingDemonstration.id));

    const catalog = page.locator('section[aria-labelledby="all-demonstrations"]');
    const topicToggles = catalog.locator('.demonstrations-topic-toggle');
    await expect(topicToggles).toHaveCount(demonstrations.families.length);
    await expect(topicToggles.first()).toHaveAttribute('aria-expanded', 'true');
    await expect(catalog.locator('.demonstrations-catalog-card:visible')).toHaveCount(demonstrations.families[0].demonstrations.length);

    for (let index = 0; index < demonstrations.families.length; index += 1) {
        const family = demonstrations.families[index];
        const toggle = topicToggles.nth(index);
        await expect(toggle.locator('.demonstrations-topic-title')).toContainText(family.title);
        const countLabel = await toggle.locator('.demonstrations-number').innerText();
        expect(countLabel).toMatch(new RegExp(`(?:^|\\D)${family.demonstrations.length}(?:\\D|$)`));
    }
    await expandCatalog(catalog);

    const cards = catalog.locator('.demonstrations-catalog-card');
    await expect(cards).toHaveCount(demonstrations.length);
    const links = cards.locator('a.demonstrations-catalog-graph[href]');
    const displayedPaths = await links.evaluateAll(anchors => anchors.map(anchor => new URL(anchor.href).pathname));
    expect(displayedPaths).toEqual(catalogEntries.map(demonstration => demonstration.path));

    const previews = cards.locator('.demonstrations-catalog-preview');
    await expect(previews).toHaveCount(demonstrations.length);
    const imagePreviews = cards.locator('img.demonstrations-catalog-preview');
    await expect(imagePreviews).toHaveCount(demonstrations.length);
    await expect(cards.locator('svg.demonstrations-catalog-svg-preview')).toHaveCount(0);
    await expect(cards.locator('.demonstrations-catalog-lesson')).toHaveCount(demonstrations.filter(demonstration => demonstration.hasLesson).length);
    await expect(page.getByText(/Variant [ABC]/)).toHaveCount(0);
    // The generator keeps a distinct named file and map entry for every route.
    // Vite may deduplicate byte-identical PNGs into one browser URL, so URL
    // uniqueness is not a valid catalog invariant here.

    for (let index = 0; index < catalogEntries.length; index += 1) {
        const demonstration = catalogEntries[index];
        const card = cards.nth(index);
        const preview = card.locator('.demonstrations-catalog-preview');
        await expect(preview).toHaveAttribute('width', '360');
        await expect(preview).toHaveAttribute('height', '220');
        await expect(preview).toHaveAttribute('alt', '');
        await expect(preview).toHaveAttribute('loading', 'lazy');
        await expect(card.locator('.demonstrations-catalog-title')).toHaveText(demonstration.title);

        const graph = card.locator('.demonstrations-catalog-graph');
        await expect(graph).toContainText('Open');
        await expect(graph).toHaveAttribute('aria-label', `Open demonstration: ${demonstration.title}`);
        await expect(graph).toHaveAttribute('data-tooltip', `Try and observe: ${demonstration.title}`);
        expect(await pathFromLink(graph, page)).toBe(demonstration.path);
        if (demonstration.hasLesson) {
            const lesson = card.locator('.demonstrations-catalog-lesson');
            await expect(lesson).toContainText('Guided path');
            await expect(lesson).toHaveAttribute('href', demonstration.path + '?learn=1');
            await expect(lesson).toHaveAttribute('aria-label', `Guided lesson: ${demonstration.title}`);
            await expect(lesson).toHaveAttribute('data-tooltip', `Learn this demonstration: ${demonstration.title}`);
        } else {
            await expect(card.locator('.demonstrations-catalog-lesson')).toHaveCount(0);
        }
        await preview.scrollIntoViewIfNeeded();
        await expect.poll(() => preview.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    }
});

test('generated preview mapping and provenance cover the active catalog without a fixed route total', async () => {
    const expectedIds = demonstrations.map(demonstration => demonstration.id).sort();
    const generated = demonstrations.validateGeneratedPreviews();
    expect(Object.keys(generated.map).sort()).toEqual(expectedIds);
    expect(generated.manifest.captures.map(capture => capture.id).sort()).toEqual(expectedIds);
    expect(generated.manifest.capture.coordinateContextPolicy).toContain('per capture');
    expect(generated.manifest.captures.every(capture => capture.framing.outOfFrameElements.length === 0)).toBe(true);
});

test('catalog action labels stay localized, focused, touch-sized, and responsive at target widths', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/demonstrations');
    const catalog = page.locator('section[aria-labelledby="all-demonstrations"]');
    await expandCatalog(catalog);

    const cards = catalog.locator('.demonstrations-catalog-card');
    const lessonIndex = catalogEntries.findIndex(demonstration => demonstration.hasLesson);
    const focusCard = cards.nth(Math.max(lessonIndex, 0));
    const graph = focusCard.locator('.demonstrations-catalog-graph');
    const lesson = focusCard.locator('.demonstrations-catalog-lesson');
    const focusPreview = focusCard.locator('.demonstrations-catalog-preview');
    const carouselButtons = page.locator('.demonstrations-opening-controls button');
    await expect(carouselButtons).toHaveCount(2);
    for (const [width, expectedColumns, minimumPreviewWidth] of [[390, 1, 340], [724, 2, 320], [1440, 3, 340]]) {
        await page.setViewportSize({width, height: 900});
        await expect.poll(() => focusPreview.evaluate(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)).toBe(true);
        const columns = await catalog.locator('.demonstrations-catalog-grid').first().evaluate(grid =>
            getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length);
        expect(columns).toBe(expectedColumns);
        const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(horizontalOverflow, `horizontal overflow at ${width}px`).toBe(false);

        const previewBox = await focusCard.locator('.demonstrations-catalog-preview').boundingBox();
        const renderedImageWidth = await focusCard.locator('.demonstrations-catalog-preview').evaluate(image => {
            const style = getComputedStyle(image);
            const horizontalInset = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
                .reduce((total, property) => total + parseFloat(style[property]), 0);
            const verticalInset = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']
                .reduce((total, property) => total + parseFloat(style[property]), 0);
            const bounds = image.getBoundingClientRect();
            const contentWidth = bounds.width - horizontalInset;
            const contentHeight = bounds.height - verticalInset;
            return Math.min(contentWidth, contentHeight * image.naturalWidth / image.naturalHeight);
        });
        const graphBox = await graph.boundingBox();
        expect(previewBox?.width).toBeGreaterThan(graphBox?.width ?? 0);
        expect(previewBox?.width, `preview width at ${width}px`).toBeGreaterThanOrEqual(minimumPreviewWidth);
        expect(renderedImageWidth * 11 / 360, `estimated captured-label height at ${width}px`).toBeGreaterThanOrEqual(9.5);
        expect(graphBox?.width).toBeGreaterThanOrEqual(44);
        expect(graphBox?.height).toBeGreaterThanOrEqual(44);
        const carouselButtonBoxes = await Promise.all([0, 1].map(index => carouselButtons.nth(index).boundingBox()));
        for (const buttonBox of carouselButtonBoxes) {
            expect(buttonBox?.width, `carousel button width at ${width}px`).toBeGreaterThanOrEqual(44);
            expect(buttonBox?.height, `carousel button height at ${width}px`).toBeGreaterThanOrEqual(44);
        }
        if (lessonIndex >= 0) {
            const lessonBox = await lesson.boundingBox();
            expect(lessonBox?.width).toBeGreaterThanOrEqual(44);
            expect(lessonBox?.height).toBeGreaterThanOrEqual(44);
        }

        await graph.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(graph).toBeFocused();
        const focusIndicator = await graph.evaluate(element => {
            const style = getComputedStyle(element);
            return {visible: element.matches(':focus-visible'), outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth)};
        });
        expect(focusIndicator.visible).toBe(true);
        expect(focusIndicator.outlineStyle).not.toBe('none');
        expect(focusIndicator.outlineWidth).toBeGreaterThanOrEqual(2);
        expect(await graph.evaluate(element => getComputedStyle(element, '::after').visibility)).toBe('visible');
        await graph.hover();
        expect(await graph.evaluate(element => getComputedStyle(element, '::after').visibility)).toBe('visible');
        if (lessonIndex >= 0) {
            await page.keyboard.press('Tab');
            await expect(lesson).toBeFocused();
            await expect.poll(() => lesson.evaluate(element => getComputedStyle(element, '::after').visibility)).toBe('visible');
        }
    }

    await page.evaluate(() => localStorage.removeItem('bezeg-2.0:bezeg-language'));
    const slPage = await page.context().newPage();
    try {
        await slPage.goto('/bezeg-2.0/demonstrations', {waitUntil: 'domcontentloaded'});
        const slCatalog = slPage.locator('section[aria-labelledby="all-demonstrations"]');
        await expandCatalog(slCatalog);
        const slCards = slCatalog.locator('.demonstrations-catalog-card');
        for (let index = 0; index < catalogEntries.length; index += 1) {
            const demonstration = catalogEntries[index];
            const card = slCards.nth(index);
            await expect(card.locator('.demonstrations-catalog-graph')).toContainText('Odpri');
            if (demonstration.hasLesson) await expect(card.locator('.demonstrations-catalog-lesson')).toContainText('Vodena pot');
        }
    } finally {
        await slPage.close();
    }
});

for (const demonstration of demonstrations) {
    test(`${demonstration.id} renders its heading, graph, and inspector`, async ({page}) => {
        await openEnglish(page, demonstration.path);
        await expectRenderedWorkspace(page, demonstration);
    });
}
