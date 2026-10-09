const {test, expect} = require('@playwright/test');
const demonstrations = require('./smoke-catalog.cjs');

async function openEnglish(page, pathname) {
    await page.addInitScript(() => localStorage.setItem('bezeg-language', 'en'));
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
            if (object.elType !== 'curve' || object.visProp?.visible === false || object.visProp?.visible === 'false') return false;
            const node = object.rendNode;
            if (!node?.isConnected || !node.getAttribute?.('d')) return false;
            const style = getComputedStyle(node);
            return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
        }).length;
    }), {timeout: 20_000}).toBeGreaterThan(0);

    const inspector = page.getByRole('complementary', {name: 'Demonstration tools'});
    await expect(inspector).toBeVisible();
}

test('the demonstration catalog links every maintained route', async ({page}) => {
    await openEnglish(page, '/bezeg/demonstrations');
    const links = page.locator('section[aria-labelledby="all-demonstrations"] .demonstrations-catalog-entry > a[href]:not(.demonstrations-catalog-learn)');
    const displayedPaths = await links.evaluateAll(anchors => anchors.map(anchor => new URL(anchor.href).pathname).sort());
    const expectedPaths = demonstrations.map(demonstration => demonstration.path).sort();

    expect(displayedPaths).toEqual(expectedPaths);
});

for (const demonstration of demonstrations) {
    test(`${demonstration.id} renders its heading, graph, and inspector`, async ({page}) => {
        await openEnglish(page, demonstration.path);
        await expectRenderedWorkspace(page, demonstration);
    });
}
