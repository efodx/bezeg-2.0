const {test, expect} = require('@playwright/test');
const demonstrations = require('./smoke-catalog.cjs');

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

test('the demonstration catalog expands all seven topics and links every maintained route', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/demonstrations');
    const catalog = page.locator('section[aria-labelledby="all-demonstrations"]');
    const topicToggles = catalog.locator('.demonstrations-topic-toggle');
    await expect(topicToggles).toHaveCount(7);
    await expect(topicToggles.first()).toHaveAttribute('aria-expanded', 'true');
    await expect(catalog.locator('.demonstrations-catalog-card:visible')).toHaveCount(1);

    for (let index = 0; index < await topicToggles.count(); index += 1) {
        const toggle = topicToggles.nth(index);
        if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
    }

    const cards = catalog.locator('.demonstrations-catalog-card');
    await expect(cards).toHaveCount(33);
    const links = cards.locator('a.demonstrations-catalog-main[href]');
    const displayedPaths = await links.evaluateAll(anchors => anchors.map(anchor => new URL(anchor.href).pathname).sort());
    const expectedPaths = demonstrations.map(demonstration => demonstration.path).sort();
    expect(displayedPaths).toEqual(expectedPaths);

    const previews = cards.locator('img.demonstrations-catalog-preview');
    await expect(previews).toHaveCount(33);
    await expect(cards.locator('.demonstrations-catalog-learn')).toHaveCount(33);
    await expect(page.getByText(/Variant [ABC]/)).toHaveCount(0);
    for (let index = 0; index < await previews.count(); index += 1) {
        const preview = previews.nth(index);
        await expect(preview).toHaveAttribute('width', '360');
        await expect(preview).toHaveAttribute('height', '220');
        await expect(preview).toHaveAttribute('alt', '');
        await expect(preview).toHaveAttribute('loading', 'lazy');
        await preview.scrollIntoViewIfNeeded();
        await expect.poll(() => preview.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    }
});

for (const demonstration of demonstrations) {
    test(`${demonstration.id} renders its heading, graph, and inspector`, async ({page}) => {
        await openEnglish(page, demonstration.path);
        await expectRenderedWorkspace(page, demonstration);
    });
}
