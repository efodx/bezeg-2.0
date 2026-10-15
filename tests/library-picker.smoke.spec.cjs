const {test, expect} = require('@playwright/test');
const demonstrations = require('./smoke-catalog.cjs');

async function openEnglish(page, path) {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
    await page.goto(path, {waitUntil: 'domcontentloaded'});
}

function switchButton(page) {
    return page.getByRole('button', {name: 'Switch demonstration'});
}

function picker(page) {
    return page.getByRole('dialog', {name: 'Switch demonstration'});
}

async function boardState(page) {
    return page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === container.id || candidate.containerObj === container);
        if (!board) throw new Error('The workspace JSXGraph board is missing.');
        const registry = window.__bezegSmokeBoardIds ??= new WeakMap();
        if (!registry.has(board)) registry.set(board, (window.__bezegSmokeNextBoardId = (window.__bezegSmokeNextBoardId ?? 0) + 1));
        const round = value => Number(value.toFixed(6));
        return {
            identity: registry.get(board),
            bounds: board.getBoundingBox().map(round),
            points: board.objectsList.filter(object => object.elType === 'point' && object.visPropCalc?.visible)
                .map(point => [round(point.X()), round(point.Y())]),
            curves: board.objectsList.filter(object => object.elType === 'curve' && object.visPropCalc?.visible)
                .map(curve => curve.rendNode?.getAttribute?.('d') ?? '').filter(Boolean).sort(),
        };
    });
}

async function selectCurveAndEdit(page) {
    const inspector = page.getByRole('complementary', {name: 'Demonstration tools'});
    await inspector.locator('.inspector-tabs').getByRole('button', {name: 'Edit', exact: true}).click();
    const selection = inspector.locator('.curve-selection');
    await selection.getByRole('button').first().click();
    await expect(selection.locator('button[aria-pressed="true"]')).toHaveCount(1);
    const editor = inspector.locator('.point-coordinate-editor');
    if (!(await editor.evaluate(element => element.open))) await editor.locator('summary').click();
    const x = editor.getByRole('spinbutton', {name: 'p0 x'});
    await x.fill('0.7');
    await editor.locator('.point-coordinate-form button.point-coordinate-submit').click();
    await expect(x).toHaveValue('0.7');
    return {inspector, selection, editor};
}

test('picker browsing and cancellation preserve edited graph state, isolate focus, and restore the switcher', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/bezier/curve');
    const {inspector, selection, editor} = await selectCurveAndEdit(page);
    const before = await boardState(page);
    expect(before.curves.length).toBeGreaterThan(0);
    const originalUrl = page.url();
    const trigger = switchButton(page);
    await trigger.click();

    const dialog = picker(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', {name: 'Switch demonstration'})).toBeVisible();
    await expect(dialog.getByRole('searchbox')).toBeFocused();
    await expect(dialog.locator('.demonstrations-current-marker')).toContainText('Currently open');
    await expect(dialog.locator('.demonstrations-current-marker')).toHaveAttribute('aria-label', 'Current demonstration: Bézier curve');
    await expect(dialog.getByRole('navigation', {name: 'Topic'}).getByRole('button', {name: /^Bézier curves \d+$/})).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByRole('searchbox')).toHaveValue('');
    await expect(page).toHaveURL(originalUrl);

    const topicNav = dialog.getByRole('navigation', {name: 'Topic'});
    await topicNav.getByRole('button', {name: /^PH curves \d+$/}).click();
    const phCount = demonstrations.families.find(family => family.id === '/bezeg-2.0/ph').demonstrations.length;
    await expect(dialog.locator('.demonstrations-catalog-card')).toHaveCount(phCount);
    const search = dialog.getByRole('searchbox');
    await search.fill('degree 3');
    await expect(dialog.locator('.demonstrations-catalog-card')).toHaveCount(1);
    const degreeCard = dialog.locator('.demonstrations-catalog-card#demonstration-card-ph-cubic');
    await expect(degreeCard.locator('.demonstrations-catalog-graph')).toBeVisible();
    await search.fill('');

    for (let index = 0; index < 18; index += 1) {
        await page.keyboard.press('Tab');
        const focus = await dialog.evaluate(element => {
            const active = document.activeElement;
            return {inside: element.contains(active), tag: active?.tagName, className: active?.className, text: active?.textContent?.trim().slice(0, 50)};
        });
        expect(focus.inside, `Tab ${index + 1} focus must remain in the picker; active=${JSON.stringify(focus)}`).toBe(true);
    }
    await page.locator('.workspace-navigation button[aria-label="Zoom in"]').evaluate(element => element.focus());
    expect(await dialog.evaluate(element => element.contains(document.activeElement)), 'workspace controls cannot take focus behind the picker').toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page).toHaveURL(originalUrl);
    expect(await boardState(page)).toEqual(before);
    await expect(selection.locator('button[aria-pressed="true"]')).toHaveCount(1);
    await expect(editor.getByRole('spinbutton', {name: 'p0 x'})).toHaveValue('0.7');
    await expect(inspector.locator('.point-coordinate-editor')).toBeVisible();
});

test('choosing the current graph continues the same board and preserves its lesson entry checkpoint', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/bezier/curve');
    const {inspector} = await selectCurveAndEdit(page);
    const editedEntryState = await boardState(page);
    expect(editedEntryState.curves.length).toBeGreaterThan(0);
    await switchButton(page).click();
    const lessonPicker = picker(page);
    await lessonPicker.getByRole('button', {name: 'Guided lesson: Bézier curve'}).click();
    await expect(lessonPicker).toBeHidden();
    const lesson = page.locator('section.guided-lesson');
    await expect(lesson).toBeVisible();
    await expect(lesson.getByRole('heading', {level: 2})).toBeVisible();
    const progress = lesson.locator('.guided-lesson-progress');
    const entryProgress = await progress.innerText();
    await lesson.locator('.guided-lesson-nav-next').click();
    await expect(progress).not.toHaveText(entryProgress);
    const advancedProgress = await progress.innerText();
    const activeLessonState = await boardState(page);
    expect(activeLessonState.identity).toBe(editedEntryState.identity);

    // Browse a different family and filter it, then cancel. The lesson checkpoint
    // and the live board must remain exactly where they were.
    await switchButton(page).click();
    const browsePicker = picker(page);
    await browsePicker.getByRole('navigation', {name: 'Topic'}).getByRole('button', {name: /^PH curves \d+$/}).click();
    await browsePicker.getByRole('searchbox').fill('degree 3');
    await expect(browsePicker.locator('.demonstrations-catalog-card#demonstration-card-ph-cubic')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(browsePicker).toBeHidden();
    await expect(progress).toHaveText(advancedProgress);
    expect(await boardState(page)).toEqual(activeLessonState);

    // Selecting the already-open graph is also a continuation, not navigation.
    await switchButton(page).click();
    const continuationPicker = picker(page);
    await expect(continuationPicker.locator('.demonstrations-current-marker')).toContainText('Currently open');
    await continuationPicker.locator('.demonstrations-catalog-card#demonstration-card-bezier .demonstrations-catalog-graph').click();
    await expect(continuationPicker).toBeHidden();
    await expect(lesson).toBeVisible();
    await expect(progress).toHaveText(advancedProgress);
    expect(await boardState(page)).toEqual(activeLessonState);

    await lesson.getByRole('button', {name: 'Exit lesson'}).click();
    await expect(lesson).toBeHidden();
    const restoredState = await boardState(page);
    expect(restoredState.identity).toBe(editedEntryState.identity);
    expect(restoredState.bounds).toEqual(editedEntryState.bounds);
    expect(restoredState.curves).toEqual(editedEntryState.curves);
    const selection = inspector.locator('.curve-selection');
    await selection.getByRole('button').first().click();
    const editor = inspector.locator('.point-coordinate-editor');
    if (!(await editor.evaluate(element => element.open))) await editor.locator('summary').click();
    await expect(editor.getByRole('spinbutton', {name: 'p0 x'})).toHaveValue('0.7');
});

test('picker cancellation and destination switching preserve presentation mode', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/bezier/curve');
    await page.getByRole('button', {name: 'Presentation mode'}).click();
    const presentationExit = page.getByRole('button', {name: 'Exit presentation'});
    await expect(presentationExit).toHaveAttribute('aria-pressed', 'true');
    const initialBoard = await boardState(page);
    const originalUrl = page.url();

    await switchButton(page).click();
    const dialog = picker(page);
    await dialog.getByRole('navigation', {name: 'Topic'}).getByRole('button', {name: /^PH curves \d+$/}).click();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(originalUrl);
    expect(await boardState(page)).toEqual(initialBoard);
    await expect(presentationExit).toHaveAttribute('aria-pressed', 'true');

    await switchButton(page).click();
    const destinationPicker = picker(page);
    await destinationPicker.getByRole('navigation', {name: 'Topic'}).getByRole('button', {name: /^PH curves \d+$/}).click();
    await destinationPicker.locator('.demonstrations-catalog-card#demonstration-card-ph-cubic .demonstrations-catalog-graph').click();
    await expect(destinationPicker).toBeHidden();
    await expect(page.locator('.workspace-heading h1')).toHaveText('Degree 3 PH curve');
    await expect(presentationExit).toHaveAttribute('aria-pressed', 'true');
});

test('workspace switcher and picker labels are localized in Slovenian', async ({page}) => {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'sl'));
    await page.goto('/bezeg-2.0/bezier/curve', {waitUntil: 'domcontentloaded'});
    const trigger = page.getByRole('button', {name: 'Zamenjaj demonstracijo'});
    await trigger.click();
    const dialog = page.getByRole('dialog', {name: 'Zamenjaj demonstracijo'});
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('searchbox')).toBeFocused();
    await expect(dialog.getByRole('navigation', {name: 'Tema'})).toBeVisible();
    await dialog.getByRole('button', {name: 'Zapri'}).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
});

test('picker controls and cards remain usable from narrow screens through projection width', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/bezier/curve');
    await switchButton(page).click();
    const dialog = picker(page);
    for (const width of [390, 724, 1440]) {
        await page.setViewportSize({width, height: 720});
        await expect(dialog.getByRole('searchbox')).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'Close'})).toBeVisible();
        await expect(dialog.locator('.demonstrations-catalog-card').first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `picker overflows at ${width}px`).toBe(true);
        if (width === 390) await expect(dialog.getByRole('combobox', {name: 'Topic'})).toBeVisible();
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = '125%'; });
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.setViewportSize({width: 390, height: 440});
    await expect(dialog.getByRole('searchbox')).toBeVisible();
    await expect(dialog.getByRole('button', {name: 'Close'})).toBeVisible();
    await dialog.getByRole('button', {name: 'Close'}).click();
    await expect(dialog).toBeHidden();
});

test('opening the picker pauses running De Casteljau playback at its current parameter', async ({page}) => {
    await openEnglish(page, '/bezeg-2.0/bezier/decasteljau2');
    const animation = page.locator('.decasteljau-animation-panel');
    const parameter = animation.locator('.decasteljau-animation-heading output');
    const initial = await parameter.innerText();
    await animation.getByRole('button', {name: 'Play', exact: true}).click();
    await expect.poll(() => parameter.innerText()).not.toBe(initial);
    const movingValue = await parameter.innerText();
    const beforePicker = await boardState(page);
    expect(beforePicker.identity).toBeTruthy();

    await switchButton(page).click();
    const dialog = picker(page);
    await expect(dialog).toBeVisible();
    await expect(animation).toContainText('Paused');
    const pausedValue = await parameter.innerText();
    const pausedState = await boardState(page);
    await page.waitForTimeout(300);
    await expect(parameter).toHaveText(pausedValue);
    expect(await boardState(page)).toEqual(pausedState);
    await expect(dialog.getByRole('searchbox')).toBeFocused();

    await dialog.getByRole('button', {name: 'Close'}).click();
    await expect(dialog).toBeHidden();
    await expect(animation).toContainText('Paused');
    await page.waitForTimeout(300);
    await expect(parameter).toHaveText(pausedValue);
    expect(await boardState(page)).toEqual(pausedState);
    expect(Number(pausedValue.split('=')[1])).toBeGreaterThanOrEqual(Number(movingValue.split('=')[1]));
    expect(pausedValue).not.toBe(initial);
});
