const {test, expect} = require('@playwright/test');
const demonstrations = require('./smoke-catalog.cjs');
const catalogEntries = demonstrations.familyIds.flatMap(family => demonstrations.filter(demonstration => demonstration.family === family));

async function openEnglish(page, pathname) {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
    await page.goto(pathname, {waitUntil: 'domcontentloaded'});
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

test(`the demonstration catalog expands all ${demonstrations.familyIds.length} topics and links every maintained route`, async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/demonstrations');
    const catalog = page.locator('section[aria-labelledby="all-demonstrations"]');
    const topicToggles = catalog.locator('.demonstrations-topic-toggle');
    await expect(topicToggles).toHaveCount(demonstrations.familyIds.length);
    await expect(topicToggles.first()).toHaveAttribute('aria-expanded', 'true');
    await expect(catalog.locator('.demonstrations-catalog-card:visible')).toHaveCount(1);

    for (let index = 0; index < await topicToggles.count(); index += 1) {
        const toggle = topicToggles.nth(index);
        if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
    }

    const cards = catalog.locator('.demonstrations-catalog-card');
    await expect(cards).toHaveCount(demonstrations.length);
    const links = cards.locator('a.demonstrations-catalog-graph[href]');
    const displayedPaths = await links.evaluateAll(anchors => anchors.map(anchor => new URL(anchor.href).pathname).sort());
    const expectedPaths = demonstrations.map(demonstration => demonstration.path).sort();
    expect(displayedPaths).toEqual(expectedPaths);

    const previews = cards.locator('.demonstrations-catalog-preview');
    await expect(previews).toHaveCount(demonstrations.length);
    const imagePreviews = cards.locator('img.demonstrations-catalog-preview');
    await expect(imagePreviews).toHaveCount(demonstrations.length - 2);
    const schematicPreviews = cards.locator('svg.demonstrations-catalog-svg-preview');
    await expect(schematicPreviews).toHaveCount(2);
    await expect(cards.locator('.demonstrations-catalog-lesson')).toHaveCount(demonstrations.filter(demonstration => demonstration.hasLesson).length);
    await expect(page.getByText(/Variant [ABC]/)).toHaveCount(0);
    const previewSources = await imagePreviews.evaluateAll(images => images.map(image => image.currentSrc));
    expect(new Set(previewSources).size).toBe(demonstrations.length - 2);
    for (let index = 0; index < await previews.count(); index += 1) {
        const demonstration = catalogEntries[index];
        const card = cards.nth(index);
        const preview = card.locator('.demonstrations-catalog-preview');
        if (demonstration.id === 'spline-g1-symmetric' || demonstration.id === 'rational-elevation') {
            await expect(preview).toHaveJSProperty('tagName', 'svg');
            await expect(preview).toHaveAttribute('data-preview-schematic', demonstration.id);
            await expect(preview).toHaveAttribute('aria-hidden', 'true');
        } else {
            await expect(preview).toHaveAttribute('width', '360');
            await expect(preview).toHaveAttribute('height', '220');
            await expect(preview).toHaveAttribute('alt', '');
            await expect(preview).toHaveAttribute('loading', 'lazy');
        }
        await expect(card.locator('.demonstrations-catalog-title')).toHaveText(demonstration.title);
        const graph = card.locator('.demonstrations-catalog-graph');
        await expect(graph).toHaveAttribute('aria-label', `Open demonstration: ${demonstration.title}`);
        await expect(graph).toHaveAttribute('data-tooltip', `Try and observe: ${demonstration.title}`);
        if (demonstration.hasLesson) {
            const lesson = card.locator('.demonstrations-catalog-lesson');
            await expect(lesson).toHaveAttribute('href', demonstration.path + '?learn=1');
            await expect(lesson).toHaveAttribute('aria-label', `Guided lesson: ${demonstration.title}`);
            await expect(lesson).toHaveAttribute('data-tooltip', `Learn this demonstration: ${demonstration.title}`);
        }
        if (demonstration.id !== 'spline-g1-symmetric' && demonstration.id !== 'rational-elevation') {
            await preview.scrollIntoViewIfNeeded();
            await expect.poll(() => preview.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
        }
    }
});

test('catalog actions stay localized, focused, touch-sized, and responsive at target widths', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/demonstrations');
    const catalog = page.locator('section[aria-labelledby="all-demonstrations"]');
    const topicToggles = catalog.locator('.demonstrations-topic-toggle');
    for (let index = 0; index < await topicToggles.count(); index += 1) {
        const toggle = topicToggles.nth(index);
        if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
    }

    const cards = catalog.locator('.demonstrations-catalog-card');
    const graph = cards.first().locator('.demonstrations-catalog-graph');
    const lesson = cards.first().locator('.demonstrations-catalog-lesson');
    for (const [width, expectedColumns] of [[390, 1], [724, 3], [1440, null]]) {
        await page.setViewportSize({width, height: 900});
        const columns = await catalog.locator('.demonstrations-catalog-grid').first().evaluate(grid =>
            getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length);
        if (expectedColumns !== null) expect(columns).toBe(expectedColumns);
        else expect(columns).toBeGreaterThanOrEqual(4);
        const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(horizontalOverflow, `horizontal overflow at ${width}px`).toBe(false);

        const previewBox = await cards.first().locator('.demonstrations-catalog-preview').boundingBox();
        const graphBox = await graph.boundingBox();
        expect(previewBox?.width).toBeGreaterThan(graphBox?.width ?? 0);
        expect(graphBox?.width).toBeGreaterThanOrEqual(44);
        expect(graphBox?.height).toBeGreaterThanOrEqual(44);
        if (catalogEntries[0].hasLesson) {
            const lessonBox = await lesson.boundingBox();
            expect(lessonBox?.width).toBeGreaterThanOrEqual(44);
            expect(lessonBox?.height).toBeGreaterThanOrEqual(44);
        }

        await graph.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(graph).toBeFocused();
        expect(await graph.evaluate(element => getComputedStyle(element, '::after').visibility)).toBe('visible');
        const graphTooltipCanOverflow = await graph.evaluate(element => {
            let current = element;
            while (current && current !== document.body) {
                const overflow = getComputedStyle(current).overflow;
                if (overflow === 'hidden' || overflow === 'clip') return false;
                current = current.parentElement;
            }
            return true;
        });
        expect(graphTooltipCanOverflow, `graph tooltip is clipped at ${width}px`).toBe(true);
        await graph.hover();
        expect(await graph.evaluate(element => getComputedStyle(element, '::after').visibility)).toBe('visible');
        if (catalogEntries[0].hasLesson) {
            await page.keyboard.press('Tab');
            await expect(lesson).toBeFocused();
            await expect.poll(() => lesson.evaluate(element => getComputedStyle(element, '::after').visibility)).toBe('visible');
        }
    }
});

for (const demonstration of demonstrations) {
    test(`${demonstration.id} renders its heading, graph, and inspector`, async ({page}) => {
        await openEnglish(page, demonstration.path);
        await expectRenderedWorkspace(page, demonstration);
    });
}
