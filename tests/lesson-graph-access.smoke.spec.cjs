const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');

h.failOnRuntimeErrors();

// Tools are hidden (visibility: hidden) while the docked card is read at 701 px and wider (ADR 0061), so readouts are
// read from DOM text, whitespace-normalised the way rendered text was, instead of innerText.
const domText = element => element.textContent.replace(/\s+/g, ' ').trim();
const BASE = '/bezeg-2.0';
const readout = (page, id) => page.locator(`[data-readout="${id}"] dd`).evaluate(domText);
const boundStatuses = page => page.locator('[data-taylor-status]').evaluateAll(elements => elements.map(element => element.getAttribute('data-taylor-status')));

async function boardSnapshot(page) {
    return page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === container.id || candidate.containerObj === container);
        if (!board) throw new Error('main board missing');
        const rect = container.getBoundingClientRect();
        // JSXGraph pools axis tick labels: a board that was narrower for a while (the lesson column, ADR 0061) keeps the
        // labels it made then, hidden. They are the axis's own, so the count is of everything else.
        const tickLabels = new Set();
        for (const object of Object.values(board.objects)) {
            if (object.elType === 'ticks') for (const label of object.labels || []) if (label) tickLabels.add(label.id);
        }
        return {
            id: board.id,
            view: board.getBoundingBox().map(value => Number(value.toFixed(6))),
            size: {width: Math.round(rect.width), height: Math.round(rect.height)},
            objects: Object.keys(board.objects).filter(id => !tickLabels.has(id)).length,
        };
    });
}

async function reachTaylorLagrangeObservation(page) {
    const panel = h.lessonPanel(page);
    for (let guard = 0; guard < 40; guard += 1) {
        if (await panel.isVisible() && (await panel.innerText()).includes('A higher degree and the Lagrange bound')
            && await h.observationFrame(page).isVisible()) return;
        await h.advance(page);
    }
    throw new Error('Taylor Step 2 Lagrange observation was not reached');
}

test('Taylor observation can hide, edit, reopen the same frame, continue and restore on exit', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto(`${BASE}/analysis/taylor`);
    await expect(page.locator('#jgbox')).toBeVisible();
    await expect.poll(async () => (await boardSnapshot(page)).objects).toBeGreaterThan(0);

    await page.getByRole('spinbutton', {name: 'Degree n', exact: true}).fill('7');
    await page.getByRole('spinbutton', {name: 'Degree n', exact: true}).press('Enter');
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
    // An observation frame's task card sits above the live tools (ADR 0061): the tools are visible and not inert.
    const inspectorVisibility = () => page.locator('.workspace-inspector').evaluate(element => getComputedStyle(element).visibility);
    expect(await inspectorVisibility(), 'the tools stay visible beside the task card at desktop width').toBe('visible');
    await expect(page.locator('.guided-lesson-graph-catcher')).toHaveCount(0);
    const beforeHide = await boardSnapshot(page);

    await h.hideButton(page).click();
    await expect(h.lessonPanel(page)).toHaveCount(0);
    expect(await inspectorVisibility(), 'Hide brings the tools back').toBe('visible');
    await expect(page.locator('[data-readout="degree"] dd'), 'a tool readout is visible after Hide').toBeVisible();
    await expect(page.locator('section.workspace-graph')).not.toHaveAttribute('data-lesson-locked', 'true');
    const reopen = h.reopenButton(page);
    await expect(reopen).toBeVisible();
    await expect(page.getByRole('spinbutton', {name: 'Degree n', exact: true})).toBeEnabled();

    await page.getByRole('spinbutton', {name: 'Degree n', exact: true}).fill('8');
    await page.getByRole('spinbutton', {name: 'Degree n', exact: true}).press('Enter');
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

test('on a phone Back and Next rest on the bottom of the window and a frame change deep in the text returns to the graph', async ({page}) => {
    await h.useLanguage(page, 'sl');
    await page.setViewportSize({width: 390, height: 844});
    await page.goto(`${BASE}/analysis/taylor?learn=1`);
    const panel = h.lessonPanel(page);
    await expect(panel).toBeVisible();
    await h.settle(page);
    const next = h.nextButton(page);
    const nextBottom = () => next.evaluate(button => Math.round(button.getBoundingClientRect().bottom));
    await expect(next, 'Next is in the first screen').toBeInViewport({ratio: 1});
    // The document order is the order on the screen: heading, text, then Back and Next.
    expect(await panel.evaluate(element => [...element.querySelectorAll('.guided-lesson-heading, .guided-lesson-reading, .guided-lesson-navigation')].map(part => part.className.split(' ')[0])))
        .toEqual(['guided-lesson-heading', 'guided-lesson-reading', 'guided-lesson-navigation']);
    // While the card reaches below the window the row rests on the window's bottom edge.
    expect(await panel.evaluate(element => element.getBoundingClientRect().bottom), 'the card reaches below the first screen').toBeGreaterThan(844);
    const restingBottom = await nextBottom();
    expect(restingBottom, 'the row rests on the bottom edge of the window').toBeGreaterThan(844 - 16);
    await page.evaluate(() => scrollBy(0, 60));
    expect(await nextBottom(), 'the row stays there while the text scrolls').toBe(restingBottom);
    // Deep in the text nothing of the card is pinned to the top; Next is still in the window, at the card's end.
    await panel.evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY + 240));
    expect(await panel.locator('.guided-lesson-heading').evaluate(element => element.getBoundingClientRect().bottom), 'the heading scrolls away with the page').toBeLessThan(0);
    expect(await panel.locator('.guided-lesson-reading').evaluate(element => element.getBoundingClientRect().top), 'the start of the text is above the window').toBeLessThan(0);
    await expect(next).toBeInViewport({ratio: 1});
    const progress = await h.progress(page);
    await next.click();
    await h.settle(page);
    expect(await h.progress(page)).not.toBe(progress);
    // The new frame starts with the graph it changed in view, and Next is back on the bottom edge.
    expect(Math.abs(await page.locator('section.workspace-graph').evaluate(element => element.getBoundingClientRect().top)), 'the page returns to the graph').toBeLessThanOrEqual(1);
    await expect(page.locator('#jgbox')).toBeInViewport({ratio: 1});
    await expect(panel.locator('.guided-lesson-frame h3')).toBeInViewport();
    expect(await nextBottom(), 'the row is on the bottom edge again').toBe(restingBottom);
    // A frame change with the start of the text in view leaves the page where it is.
    const offset = await page.evaluate(() => scrollY);
    await next.click();
    await h.settle(page);
    expect(await page.evaluate(() => scrollY), 'no realignment when the frame start is in view').toBe(offset);
    // Beside the graph the row is back in the toolbar, before the text.
    await page.setViewportSize({width: 1440, height: 900});
    await expect(panel.locator('.guided-lesson-toolbar .guided-lesson-navigation')).toHaveCount(1);
    expect(await panel.locator('.guided-lesson-navigation').evaluate(element => getComputedStyle(element).position)).toBe('static');
});

test('lesson actions stay reachable at narrow size and 200% text in Presentation', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.setViewportSize({width: 390, height: 844});
    await page.goto(`${BASE}/analysis/taylor`);
    await h.learnButton(page).click();
    await expect(h.lessonPanel(page)).toBeVisible();
    await h.settle(page);
    await reachTaylorLagrangeObservation(page);
    expect(await page.locator('.workspace-inspector').evaluate(element => getComputedStyle(element).visibility), 'at 390 px the tools stay visible below the card while it is read').toBe('visible');

    // Enlarge rem-based lesson copy without changing the emulated device viewport.
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await h.settle(page);
    await h.noHorizontalOverflow(page);
    const panel = h.lessonPanel(page);
    const reading = panel.locator('.guided-lesson-reading');
    // At 700 px and narrower the page scrolls, not the card (ADR 0061): the card is as long as its text, nothing of it
    // pins to the top of the window, and Back and Next are its last row, resting on the window's bottom edge.
    expect(await reading.evaluate(element => element.scrollHeight > element.clientHeight + 1), 'the reading region does not scroll inside the card').toBe(false);
    expect(await panel.evaluate(element => [getComputedStyle(element).overflowY, getComputedStyle(element).maxHeight])).toEqual(['visible', 'none']);
    expect(await panel.locator('.guided-lesson-controls').evaluate(element => getComputedStyle(element).position), 'the heading scrolls with the page').toBe('static');
    expect(await panel.evaluate(element => {
        const row = element.lastElementChild;
        return [row.className, getComputedStyle(row).position, getComputedStyle(row).bottom];
    }), 'Back and Next are the last row and rest on the bottom of the window').toEqual(['guided-lesson-navigation', 'sticky', '0px']);
    const cardTall = await panel.evaluate(element => element.getBoundingClientRect().height > innerHeight);
    const hide = h.hideButton(page);
    // A card that fits the window has one position; a taller one is checked at its top, middle and bottom. Next is in
    // reach at each of them; Hide belongs to the heading at the card's top.
    for (const fraction of cardTall ? [0, .5, 1] : [0]) {
        await panel.evaluate((element, f) => {
            const rect = element.getBoundingClientRect();
            scrollTo(0, rect.top + scrollY + Math.max(0, rect.height - innerHeight) * f);
        }, fraction);
        for (const [name, action] of fraction === 0 ? [['Next', h.nextButton(page)], ['Hide', hide]] : [['Next', h.nextButton(page)]]) {
            await expect(action).toBeVisible();
            const actionBox = await action.boundingBox();
            expect(actionBox.y, `${name} stays in the window at card position ${fraction}`).toBeGreaterThanOrEqual(0);
            expect(actionBox.y + actionBox.height, `${name} stays in the window at card position ${fraction}`).toBeLessThanOrEqual(844);
            expect(await action.evaluate(button => {
                const r = button.getBoundingClientRect();
                return button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
            }), `${name} is pointer reachable at card position ${fraction}`).toBe(true);
        }
    }
    if (cardTall) expect(await panel.locator('.guided-lesson-heading').evaluate(element => element.getBoundingClientRect().bottom), 'the heading has scrolled away at the card\'s end').toBeLessThan(0);
    expect(await panel.evaluate(element => element.scrollTop), 'prose scroll belongs to the page, not the card').toBe(0);
    await h.noHorizontalOverflow(page);

    await hide.click();
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
    // The docked card takes its column in Presentation, so the board is resized (ADR 0061): JSXGraph keeps the scene
    // centred and to scale instead of keeping the identical bounding box.
    const before = boardBeforePresentationReopen;
    const after = boardAfterPresentationReopen;
    const centre = ([left, top, right, bottom]) => [(left + right) / 2, (top + bottom) / 2];
    expect(centre(after.view)[0], 'same view centre (x) after reopening in Presentation').toBeCloseTo(centre(before.view)[0], 3);
    expect(centre(after.view)[1], 'same view centre (y) after reopening in Presentation').toBeCloseTo(centre(before.view)[1], 3);
    expect((after.view[2] - after.view[0]) / after.size.width, 'same horizontal scale after reopening in Presentation').toBeCloseTo((before.view[2] - before.view[0]) / before.size.width, 3);
    expect((after.view[1] - after.view[3]) / after.size.height, 'same vertical scale after reopening in Presentation').toBeCloseTo((before.view[1] - before.view[3]) / before.size.height, 3);
    await h.hideButton(page).click();
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
        await h.hideButton(page).tap();
        await expect(panel).toHaveCount(0);
        const reopen = h.reopenButton(page);
        await expect(reopen).toBeVisible();
        await reopen.tap();
        await h.settle(page);
        await expect(panel).toBeVisible();
        expect((await boardSnapshot(page)).id).toBe(before.id);
        await panel.getByRole('button', {name: 'Exit example', exact: true}).tap();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('button', {name: 'Exit and restore graph', exact: true}).tap();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(panel).toHaveCount(0);
        await expect(h.learnButton(page)).toBeVisible();
    } finally {
        await context.close();
    }
});
