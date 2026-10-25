const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');

h.failOnRuntimeErrors();

const BASE = '/bezeg-2.0';
const readout = (page, id) => page.locator(`[data-readout="${id}"] dd`).innerText();
const boundStatuses = page => page.locator('[data-taylor-status]').evaluateAll(elements => elements.map(element => element.getAttribute('data-taylor-status')));

async function boardSnapshot(page) {
    return page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === container.id || candidate.containerObj === container);
        if (!board) throw new Error('main board missing');
        const rect = container.getBoundingClientRect();
        return {
            id: board.id,
            view: board.getBoundingBox().map(value => Number(value.toFixed(6))),
            size: {width: Math.round(rect.width), height: Math.round(rect.height)},
            objects: Object.keys(board.objects).length,
        };
    });
}

async function reachTaylorLagrangeObservation(page) {
    const panel = h.lessonPanel(page);
    for (let guard = 0; guard < 40; guard += 1) {
        if (await panel.isVisible() && (await panel.innerText()).includes('A higher degree and the Lagrange bound')
            && await panel.getByRole('button', {name: 'Observe on the graph'}).isVisible()) return;
        await h.advance(page);
    }
    throw new Error('Taylor Step 2 Lagrange observation was not reached');
}

test('Taylor observation can hide, edit, reopen the same frame, continue and restore on exit', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto(`${BASE}/analysis/taylor`);
    await expect(page.locator('#jgbox')).toBeVisible();
    await expect.poll(async () => (await boardSnapshot(page)).objects).toBeGreaterThan(0);

    await page.getByLabel('Degree n', {exact: true}).fill('7');
    await expect.poll(() => readout(page, 'degree')).toBe('7');
    await page.locator('[data-action="toggle-taylor-bound"]').click();
    await expect.poll(() => boundStatuses(page)).toEqual(['revealed']);
    const entryBoard = await boardSnapshot(page);
    const entryBound = await boundStatuses(page);

    await h.learnButton(page).click();
    await expect(h.lessonPanel(page)).toBeVisible();
    await h.settle(page);
    await reachTaylorLagrangeObservation(page);
    const observationProgress = await h.progress(page);
    const beforeHide = await boardSnapshot(page);

    await h.lessonPanel(page).getByRole('button', {name: 'Observe on the graph'}).click();
    await expect(h.lessonPanel(page)).toHaveCount(0);
    await expect(page.locator('section.workspace-graph')).not.toHaveAttribute('data-lesson-locked', 'true');
    const reopen = h.reopenButton(page);
    await expect(reopen).toBeVisible();
    await expect(page.getByLabel('Degree n', {exact: true})).toBeEnabled();

    await page.getByLabel('Degree n', {exact: true}).fill('8');
    await expect.poll(() => readout(page, 'degree')).toBe('8');
    const editedBoard = await boardSnapshot(page);
    expect(editedBoard.id, 'same board after hiding instructions').toBe(beforeHide.id);
    expect(editedBoard.view, 'same view after hiding instructions').toEqual(beforeHide.view);

    await reopen.focus();
    await page.keyboard.press('Enter');
    await h.settle(page);
    await expect(h.nextButton(page)).toBeVisible();
    expect(await h.progress(page), 'the observation frame is unchanged after reopening').toBe(observationProgress);
    await expect.poll(() => readout(page, 'degree')).toBe('8');
    const reopenedBoard = await boardSnapshot(page);
    expect(reopenedBoard, 'board identity, view, size and objects survive reopening').toEqual(editedBoard);

    await h.nextButton(page).click();
    await h.settle(page);
    const afterContinue = await h.progress(page);
    expect(afterContinue, 'Continue advances from the observation frame').not.toBe(observationProgress);
    expect(h.stepNumber(afterContinue)).toBe(h.stepNumber(observationProgress) + 1);

    await h.exitAndConfirm(page);
    await expect(h.lessonPanel(page)).toHaveCount(0);
    await expect.poll(() => readout(page, 'degree')).toBe('7');
    expect(await boundStatuses(page), 'Exit restores the entry error-bound state').toEqual(entryBound);
    const restoredBoard = await boardSnapshot(page);
    expect(restoredBoard.id, 'exit keeps the mounted board').toBe(entryBoard.id);
    expect(restoredBoard.view, 'exit restores the entry view').toEqual(entryBoard.view);
    expect(restoredBoard.size).toEqual(entryBoard.size);
    expect(restoredBoard.objects).toBe(entryBoard.objects);
    expect(new URL(page.url()).pathname).toBe(`${BASE}/analysis/taylor`);
});

test('lesson actions stay reachable at narrow size and 200% text in Presentation', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.setViewportSize({width: 390, height: 844});
    await page.goto(`${BASE}/analysis/taylor`);
    await h.learnButton(page).click();
    await expect(h.lessonPanel(page)).toBeVisible();
    await h.settle(page);
    await reachTaylorLagrangeObservation(page);

    // Enlarge rem-based lesson copy without changing the emulated device viewport.
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await h.settle(page);
    await h.noHorizontalOverflow(page);
    const panel = h.lessonPanel(page);
    const reading = panel.locator('.guided-lesson-reading');
    expect(await reading.evaluate(element => getComputedStyle(element).overflowY)).toBe('auto');
    await reading.evaluate(element => { element.scrollTop = element.scrollHeight; });
    expect(await reading.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await expect(panel.getByRole('button', {name: 'Hide lesson instructions', exact: true})).toHaveCount(0);
    const observe = panel.getByRole('button', {name: 'Observe on the graph', exact: true});
    await expect(observe).toBeVisible();
    const actionFitsPanel = await observe.evaluate(button => {
        const action = button.getBoundingClientRect();
        const container = button.closest('.guided-lesson').getBoundingClientRect();
        return action.top >= container.top && action.bottom <= container.bottom;
    });
    expect(actionFitsPanel, 'the visible minimize action fits within the bounded overlay').toBe(true);
    const actionBox = await observe.boundingBox();
    expect(actionBox.y).toBeGreaterThanOrEqual(0);
    expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(844);
    expect(await panel.evaluate(element => element.scrollTop), 'prose scroll belongs to the reading region').toBe(0);

    await observe.click();
    await expect(panel).toHaveCount(0);
    const reopen = h.reopenButton(page);
    await expect(reopen).toBeVisible();
    const tabMetrics = await reopen.evaluate(action => {
        const board = document.querySelector('#jgbox');
        const a = action.getBoundingClientRect();
        const b = board.getBoundingClientRect();
        const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const hit = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2);
        return {overlaps, width: a.width, height: a.height, hit: action.contains(hit)};
    });
    expect(tabMetrics.overlaps, 'the compact lesson tab overlays the graph').toBe(true);
    expect(tabMetrics.width).toBeGreaterThanOrEqual(44);
    expect(tabMetrics.height).toBeGreaterThanOrEqual(44);
    expect(tabMetrics.hit, 'the compact lesson tab receives pointer hits').toBe(true);

    await page.setViewportSize({width: 844, height: 390});
    await h.noHorizontalOverflow(page);
    const shortLandscape = await boardSnapshot(page);
    expect(shortLandscape.size.width).toBeGreaterThan(300);
    expect(shortLandscape.size.height).toBeGreaterThan(120);
    await expect(reopen).toBeVisible();

    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await page.setViewportSize({width: 1280, height: 800});
    await page.getByRole('button', {name: 'Presentation mode', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Exit presentation', exact: true})).toBeVisible();
    const boardBeforePresentationReopen = await boardSnapshot(page);
    await reopen.click();
    await h.settle(page);
    const boardAfterPresentationReopen = await boardSnapshot(page);
    expect(boardAfterPresentationReopen.id).toBe(boardBeforePresentationReopen.id);
    expect(boardAfterPresentationReopen.view).toEqual(boardBeforePresentationReopen.view);
    await h.lessonPanel(page).getByRole('button', {name: 'Observe on the graph', exact: true}).click();
    await expect(reopen).toBeVisible();
});

test('touch learners can hide, reopen by touch, and explicitly exit', async ({browser}) => {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
    const page = await context.newPage();
    try {
        await h.useLanguage(page, 'en');
        await page.goto(`${BASE}/analysis/taylor`);
        await h.learnButton(page).tap();
        const panel = h.lessonPanel(page);
        await expect(panel).toBeVisible();
        await h.settle(page);
        const before = await boardSnapshot(page);
        await panel.getByRole('button', {name: 'Hide lesson instructions', exact: true}).tap();
        await expect(panel).toHaveCount(0);
        const reopen = h.reopenButton(page);
        await expect(reopen).toBeVisible();
        await reopen.tap();
        await h.settle(page);
        await expect(panel).toBeVisible();
        expect((await boardSnapshot(page)).id).toBe(before.id);
        await panel.getByRole('button', {name: 'Exit lesson', exact: true}).tap();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('button', {name: 'Exit and restore graph', exact: true}).tap();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(panel).toHaveCount(0);
        await expect(h.learnButton(page)).toBeVisible();
    } finally {
        await context.close();
    }
});
