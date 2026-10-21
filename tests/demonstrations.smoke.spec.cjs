const {test, expect} = require('@playwright/test');
const demonstrations = require('./smoke-catalog.cjs');
const h = require('./lesson-smoke-helpers.cjs');
const catalogEntries = demonstrations.families.flatMap(family => family.demonstrations);

async function openEnglish(page, pathname) {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
    await page.goto(pathname, {waitUntil: 'domcontentloaded'});
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

test('the catalogue shows every demonstration in teaching order with useful cards and supported destinations', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/demonstrations');

    await expect(page.getByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
    await expect(page.getByRole('heading', {level: 1})).toHaveCount(1);
    await expect(page.getByText('Explore by topic. Start with what interests you.')).toBeVisible();
    await expect(page.getByText(`${demonstrations.families.length} families · ${demonstrations.length} demonstrations`)).toBeVisible();
    await expect(page.getByRole('region', {name: 'Starting demonstrations'})).toHaveCount(0);

    const catalog = page.getByRole('region', {name: 'All demonstrations'});
    await expect(catalog).toBeVisible();
    const cards = catalog.locator('.demonstrations-catalog-card');
    await expect(cards).toHaveCount(demonstrations.length);
    expect(await cards.locator('.demonstrations-catalog-title').allTextContents()).toEqual(catalogEntries.map(demonstration => demonstration.title));

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
        await expect(preview).toHaveAttribute('loading', index < 3 ? 'eager' : 'lazy');
        await expect(card.locator('.demonstrations-catalog-title')).toHaveText(demonstration.title);
        await expect(card.locator('.demonstrations-catalog-family')).toContainText(demonstrations.families.find(family => family.id === demonstration.family).title);
        await expect(card.locator('.demonstrations-catalog-copy p')).not.toBeEmpty();

        const graph = card.locator('.demonstrations-catalog-graph');
        await expect(graph).toHaveAttribute('aria-label', `Open demonstration: ${demonstration.title}`);
        if (await graph.evaluate(element => element instanceof HTMLAnchorElement)) expect(await pathFromLink(graph, page)).toBe(demonstration.path);
        if (demonstration.hasLesson) {
            const lesson = card.locator('.demonstrations-catalog-lesson');
            await expect(lesson).toHaveAttribute('aria-label', `Guided lesson: ${demonstration.title}`);
            if (await lesson.evaluate(element => element instanceof HTMLAnchorElement)) await expect(lesson).toHaveAttribute('href', demonstration.path + '?learn=1');
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

test('catalog filters combine topic and forgiving search, then clear recoverable empty results', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/demonstrations?topic=%2Fbezeg-2.0%2Fbezier&keep=yes#collection');
    const catalog = page.getByRole('region', {name: 'All demonstrations'});
    const topicNav = catalog.getByRole('navigation', {name: 'Topic'});
    await expect(topicNav.getByRole('button', {name: /^Bézier curves \d+$/})).toHaveAttribute('aria-pressed', 'true');
    const cards = catalog.locator('.demonstrations-catalog-card');
    const family = demonstrations.families.find(item => item.id === '/bezeg-2.0/bezier');
    await expect(cards).toHaveCount(family.demonstrations.length);
    const search = catalog.getByRole('searchbox');
    await search.fill('  BEZIER   curve  ');
    await expect(cards.locator('.demonstrations-catalog-title').first()).toContainText(/Bézier/i);
    await expect(page).toHaveURL(/topic=%2Fbezeg-2\.0%2Fbezier/);
    await expect(page).toHaveURL(/keep=yes/);
    await expect(page).toHaveURL(/#collection$/);

    await search.fill('no matching demonstration');
    await expect(catalog.getByRole('heading', {name: 'No matches'})).toBeVisible();
    await catalog.locator('.demonstration-search-row').getByRole('button', {name: 'Clear search'}).click();
    await expect(cards).toHaveCount(family.demonstrations.length);
    await topicNav.getByRole('button', {name: 'All topics'}).click();
    await expect(cards).toHaveCount(demonstrations.length);
});

test('catalog controls remain readable, focused, touch-sized, and overflow-free across languages and widths', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/demonstrations');
    const catalog = page.getByRole('region', {name: 'All demonstrations'});
    const cards = catalog.locator('.demonstrations-catalog-card');
    const lessonIndex = demonstrations.findIndex(demonstration => demonstration.hasLesson);
    const focusCard = cards.nth(lessonIndex);
    const graph = focusCard.locator('.demonstrations-catalog-graph');
    const lesson = focusCard.locator('.demonstrations-catalog-lesson');
    for (const width of [390, 724, 1440]) {
        await page.setViewportSize({width, height: 900});
        await expect(graph).toBeVisible();
        if (width === 390) await expect(catalog.getByRole('combobox', {name: 'Topic'})).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `horizontal overflow at ${width}px`).toBe(true);
        for (const action of [graph, lesson]) {
            const box = await action.boundingBox();
            expect(box?.width).toBeGreaterThanOrEqual(44);
            expect(box?.height).toBeGreaterThanOrEqual(44);
        }
        await graph.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(graph).toBeFocused();
        const visibleFocus = await graph.evaluate(element => element.matches(':focus-visible') && getComputedStyle(element).outlineStyle !== 'none');
        expect(visibleFocus).toBe(true);
        const copyFits = await focusCard.locator('.demonstrations-catalog-copy').evaluate(element =>
            [...element.querySelectorAll('*')].every(child => child.scrollWidth <= child.clientWidth + 1));
        expect(copyFits, `card copy is clipped at ${width}px`).toBe(true);
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = '125%'; });
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.setViewportSize({width: 390, height: 540});
    await expect(graph).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.evaluate(() => localStorage.removeItem('bezeg-2.0:bezeg-language'));
    const slPage = await page.context().newPage();
    try {
        await slPage.goto('/bezeg-2.0/demonstrations', {waitUntil: 'domcontentloaded'});
        const slCatalog = slPage.getByRole('region', {name: 'Vse demonstracije'});
        const slCards = slCatalog.locator('.demonstrations-catalog-card');
        await expect(slCards).toHaveCount(demonstrations.length);
        await expect(slCards.first().locator('.demonstrations-catalog-graph')).toHaveAttribute('aria-label', /^Odpri demonstracijo:/);
        await slPage.setViewportSize({width: 390, height: 650});
        expect(await slPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally {
        await slPage.close();
    }
});

test('unknown topic values fall back safely and topic navigation participates in browser history', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/demonstrations?topic=unknown-family');
    const catalog = page.getByRole('region', {name: 'All demonstrations'});
    const cards = catalog.locator('.demonstrations-catalog-card');
    await expect(cards).toHaveCount(demonstrations.length);
    const topicNav = catalog.getByRole('navigation', {name: 'Topic'});
    await expect(topicNav.getByRole('button', {name: 'All topics'})).toHaveAttribute('aria-pressed', 'true');

    await topicNav.getByRole('button', {name: /PH curves/}).click();
    const phCount = demonstrations.families.find(family => family.id === '/bezeg-2.0/ph').demonstrations.length;
    await expect(cards).toHaveCount(phCount);
    await expect(page).toHaveURL(/topic=%2Fbezeg-2\.0%2Fph/);
    await page.goBack();
    await expect(cards).toHaveCount(demonstrations.length);
    await expect(topicNav.getByRole('button', {name: 'All topics'})).toHaveAttribute('aria-pressed', 'true');
    await page.goForward();
    await expect(cards).toHaveCount(phCount);
});

test('opening a filtered catalogue card and going back restores its query, topic, scroll position, and focus', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/demonstrations?topic=%2Fbezeg-2.0%2Fbezier&q=bezier');
    const catalog = page.getByRole('region', {name: 'All demonstrations'});
    const cards = catalog.locator('.demonstrations-catalog-card');
    await expect(cards).toHaveCount(demonstrations.families.find(family => family.id === '/bezeg-2.0/bezier').demonstrations.length);
    const targetCard = cards.last();
    const graphLink = targetCard.locator('.demonstrations-catalog-graph');
    await graphLink.scrollIntoViewIfNeeded();
    await graphLink.focus();
    const savedScrollY = await page.evaluate(() => window.scrollY);
    await graphLink.click();
    await expect(page.locator('.workspace-heading h1')).toBeVisible();
    await page.goBack();
    await expect(catalog).toBeVisible();
    await expect(catalog.getByRole('searchbox')).toHaveValue('bezier');
    await expect(catalog.getByRole('navigation', {name: 'Topic'}).getByRole('button', {name: /^Bézier curves \d+$/})).toHaveAttribute('aria-pressed', 'true');
    await expect(graphLink).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(Math.max(0, savedScrollY - 40));
});

test('workspace collection breadcrumb returns to the saved filtered card position', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/demonstrations?topic=%2Fbezeg-2.0%2Fbezier&q=bezier');
    const catalog = page.getByRole('region', {name: 'All demonstrations'});
    const target = catalog.locator('.demonstrations-catalog-card').last();
    const graph = target.locator('.demonstrations-catalog-graph');
    await graph.scrollIntoViewIfNeeded();
    await graph.focus();
    const savedScrollY = await page.evaluate(() => window.scrollY);
    await graph.click();
    const breadcrumb = page.getByRole('navigation', {name: 'Demonstration breadcrumb'});
    await expect(breadcrumb.getByRole('link', {name: 'Demonstrations'})).toBeVisible();
    await breadcrumb.getByRole('link', {name: 'Demonstrations'}).click();
    await expect(catalog).toBeVisible();
    await expect(catalog.getByRole('searchbox')).toHaveValue('bezier');
    await expect(graph).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(Math.max(0, savedScrollY - 40));
});

test('production deep links retain filters and lesson query/hash through refresh and Exit', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/demonstrations?topic=%2Fbezeg-2.0%2Fph&q=degree&school=west#cards');
    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(page.getByRole('searchbox')).toHaveValue('degree');
    await expect(page.locator('.demonstrations-catalog-card')).toHaveCount(
        demonstrations.families.find(family => family.id === '/bezeg-2.0/ph').demonstrations.length,
    );
    await expect(page).toHaveURL(/school=west#cards$/);
    await page.goto('/bezeg-2.0/bezier/curve?learn=1&school=west#figure', {waitUntil: 'domcontentloaded'});
    await page.reload({waitUntil: 'domcontentloaded'});
    const lesson = page.locator('section.guided-lesson');
    await expect(lesson).toBeVisible();
    await h.exitAndConfirm(page);
    await expect(page).toHaveURL(/\/bezier\/curve\?school=west#figure$/);
    await expect(page.locator('#jgbox')).toBeVisible();
    await page.goto('/bezeg-2.0/not-a-demonstration', {waitUntil: 'domcontentloaded'});
    await expect(page.getByRole('link', {name: 'Bezeg · home'})).toBeVisible();
    await expect(page.locator('#jgbox')).toHaveCount(0);
});

for (const demonstration of demonstrations) {
    test(`${demonstration.id} renders its heading, graph, and inspector`, async ({page}) => {
        await openEnglish(page, demonstration.path);
        await expectRenderedWorkspace(page, demonstration);
    });
}
