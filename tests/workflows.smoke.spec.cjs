const {test, expect} = require('@playwright/test');

function bezierInspector(page) {
    return page.locator('.workspace-inspector');
}

async function selectBezierCurve(page) {
    const inspector = bezierInspector(page);
    await inspector.locator('.inspector-tabs').getByRole('button', {name: /^(Edit|Uredi)$/}).click();
    const selection = inspector.locator('.curve-selection');
    await selection.getByRole('button').first().click();
    await expect(selection.locator('button[aria-pressed="true"]')).toHaveCount(1);
    return inspector;
}

async function openPointEditor(inspector) {
    const editor = inspector.locator('.curve-point-controls');
    await expect(editor.getByRole('spinbutton', {name: 'p₀, x'})).toBeVisible();
    return editor;
}

async function visibleCurvePaths(page) {
    return page.locator('#jgbox').evaluate(container => {
        const boards = Object.values(window.JXG?.boards || {});
        const board = boards.find(candidate => candidate.container === container.id || candidate.containerObj === container);
        if (!board) return [];
        return Object.values(board.objects || {}).filter(object => object.elType === 'curve' &&
            object.visProp?.visible !== false && object.visProp?.visible !== 'false').flatMap(object => {
            const node = object.rendNode;
            const path = node?.isConnected && node.getAttribute?.('d');
            if (!path) return [];
            const style = getComputedStyle(node);
            return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 ? [path] : [];
        }).sort();
    });
}

async function geometrySignature(page) {
    return (await visibleCurvePaths(page)).join('\n');
}

async function showPresetTools(inspector) {
    await inspector.locator('.inspector-tabs').getByRole('button', {name: 'Save', exact: true}).click();
    const presetArea = inspector.locator('#inspector-save');
    await expect(presetArea).toBeVisible();
    return presetArea;
}

async function setLanguage(page, language) {
    await page.locator('#bezeg-language').selectOption(language);
}

test('switching SL → EN → SL keeps edited Bézier geometry and curve selection', async ({page}) => {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'sl'));
    await page.goto('/bezeg-2.0/bezier/curve', {waitUntil: 'domcontentloaded'});
    const inspector = await selectBezierCurve(page);
    const editor = await openPointEditor(inspector);
    const x = editor.getByRole('spinbutton', {name: 'p₀, x'});
    const y = editor.getByRole('spinbutton', {name: 'p₀, y'});
    await x.fill('0.75');
    await y.fill('-0.35');
    const initialCurves = await visibleCurvePaths(page);
    expect(initialCurves.length).toBeGreaterThan(0);
    const initialGeometry = await geometrySignature(page);
    await editor.getByRole('spinbutton', {name: 'p₀, x'}).press('Enter');
    await editor.getByRole('spinbutton', {name: 'p₀, y'}).press('Enter');
    await expect(x).toHaveValue('0,75');
    await expect(y).toHaveValue('−0,35');
    const editedGeometry = await geometrySignature(page);
    expect(editedGeometry).not.toBe(initialGeometry);

    await setLanguage(page, 'en');
    await expect(page.locator('.workspace-heading h1')).toHaveText('Bézier curve');
    await expect(inspector.locator('.curve-selection button[aria-pressed="true"]')).toHaveCount(1);
    await expect(x).toHaveValue('0.75');
    await expect(y).toHaveValue('−0.35');
    expect((await visibleCurvePaths(page)).length).toBeGreaterThan(0);
    await expect.poll(() => geometrySignature(page)).toBe(editedGeometry);

    await setLanguage(page, 'sl');
    await expect(page.locator('.workspace-heading h1')).toHaveText('Bézierjeva krivulja');
    await expect(inspector.locator('.curve-selection button[aria-pressed="true"]')).toHaveCount(1);
    await expect(x).toHaveValue('0,75');
    await expect(y).toHaveValue('−0,35');
    expect((await visibleCurvePaths(page)).length).toBeGreaterThan(0);
    await expect.poll(() => geometrySignature(page)).toBe(editedGeometry);
});

test('saving, changing, and reopening a preset restores edited Bézier coordinates', async ({page}) => {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
    await page.goto('/bezeg-2.0/bezier/curve', {waitUntil: 'domcontentloaded'});
    const inspector = await selectBezierCurve(page);
    const editor = await openPointEditor(inspector);
    const savedCoordinates = {x: '0.65', y: '0.9'};
    const x = editor.getByRole('spinbutton', {name: 'p₀, x'});
    const y = editor.getByRole('spinbutton', {name: 'p₀, y'});
    await x.fill(savedCoordinates.x);
    await y.fill(savedCoordinates.y);
    await editor.getByRole('spinbutton', {name: 'p₀, x'}).press('Enter');
    await editor.getByRole('spinbutton', {name: 'p₀, y'}).press('Enter');
    await expect(x).toHaveValue(savedCoordinates.x);
    await expect(y).toHaveValue(savedCoordinates.y);
    const savedGeometry = await geometrySignature(page);
    expect(savedGeometry.length).toBeGreaterThan(0);

    const presetArea = await showPresetTools(inspector);
    await presetArea.locator('button.preset-save').click();
    await presetArea.locator('#preset-save-name').fill('smoke-edited-bezier');
    await presetArea.locator('#preset-save-name').press('Enter');

    const savedPresetArea = await showPresetTools(inspector);
    await expect(savedPresetArea.locator('li[data-preset-id="smoke-edited-bezier"] button.preset-row-select')).toHaveAttribute('aria-current', 'true');
    const changedInspector = await selectBezierCurve(page);
    const changedEditor = await openPointEditor(changedInspector);
    await changedEditor.getByRole('spinbutton', {name: 'p₀, x'}).fill('-0.4');
    await changedEditor.getByRole('spinbutton', {name: 'p₀, y'}).fill('0.2');
    await changedEditor.getByRole('spinbutton', {name: 'p₀, x'}).press('Enter');
    await changedEditor.getByRole('spinbutton', {name: 'p₀, y'}).press('Enter');
    await expect(changedEditor.getByRole('spinbutton', {name: 'p₀, x'})).toHaveValue('−0.4');
    await expect(changedEditor.getByRole('spinbutton', {name: 'p₀, y'})).toHaveValue('0.2');
    await expect.poll(() => geometrySignature(page)).not.toBe(savedGeometry);

    const changedPresetArea = await showPresetTools(changedInspector);
    const defaultRow = changedPresetArea.locator('li[data-preset-id=""] button.preset-row-select');
    await expect(defaultRow).toBeVisible();
    await defaultRow.click();
    const defaultInspector = await selectBezierCurve(page);
    const defaultEditor = await openPointEditor(defaultInspector);
    await defaultEditor.getByRole('spinbutton', {name: 'p₀, x'}).fill('0.1');
    await defaultEditor.getByRole('spinbutton', {name: 'p₀, y'}).fill('-0.1');
    await defaultEditor.getByRole('spinbutton', {name: 'p₀, x'}).press('Enter');
    await defaultEditor.getByRole('spinbutton', {name: 'p₀, y'}).press('Enter');
    await expect.poll(() => geometrySignature(page)).not.toBe(savedGeometry);

    const defaultPresetArea = await showPresetTools(defaultInspector);
    const savedRow = defaultPresetArea.locator('li[data-preset-id="smoke-edited-bezier"] button.preset-row-select');
    await expect(savedRow).toBeVisible();
    await savedRow.click();

    const reopenedInspector = await selectBezierCurve(page);
    const reopenedEditor = await openPointEditor(reopenedInspector);
    await expect(reopenedEditor.getByRole('spinbutton', {name: 'p₀, x'})).toHaveValue(savedCoordinates.x);
    await expect(reopenedEditor.getByRole('spinbutton', {name: 'p₀, y'})).toHaveValue(savedCoordinates.y);
    await expect.poll(() => geometrySignature(page)).toBe(savedGeometry);
});

test('preset rows can be renamed, overwritten with the current state, and deleted after confirmation', async ({page}) => {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
    await page.goto('/bezeg-2.0/bezier/curve', {waitUntil: 'domcontentloaded'});

    const setX = async value => {
        const editor = await openPointEditor(await selectBezierCurve(page));
        const x = editor.getByRole('spinbutton', {name: 'p₀, x'});
        await x.fill(value);
        await x.press('Enter');
    };
    const expectX = async value => {
        const editor = await openPointEditor(await selectBezierCurve(page));
        await expect(editor.getByRole('spinbutton', {name: 'p₀, x'})).toHaveValue(value);
    };
    const presetsArea = () => showPresetTools(bezierInspector(page));
    const row = async id => (await presetsArea()).locator(`li[data-preset-id="${id}"]`);

    await setX('0.65');
    let area = await presetsArea();
    await area.locator('button.preset-save').click();
    await area.locator('#preset-save-name').fill('smoke-row-old');
    await area.locator('#preset-save-name').press('Enter');
    await expect(await row('smoke-row-old')).toBeVisible();

    // 1. Rename
    await (await row('smoke-row-old')).getByRole('button', {name: 'Menu for state smoke-row-old'}).click();
    await (await row('smoke-row-old')).getByRole('button', {name: 'Rename', exact: true}).click();
    const renameInput = (await row('smoke-row-old')).locator('.preset-rename-input');
    await expect(renameInput).toBeVisible();
    await renameInput.fill('smoke-row-new');
    await renameInput.press('Enter');
    await expect(await row('smoke-row-new')).toBeVisible();
    await expect(await row('smoke-row-old')).toHaveCount(0);
    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(await row('smoke-row-old')).toHaveCount(0);
    await (await row('smoke-row-new')).locator('button.preset-row-select').click();
    await expectX('0.65');

    // 2. Overwrite with the current state
    await setX('-0.4');
    await (await row('smoke-row-new')).getByRole('button', {name: 'Menu for state smoke-row-new'}).click();
    await (await row('smoke-row-new')).getByRole('button', {name: 'Overwrite with the current state'}).click();
    await (await row('')).locator('button.preset-row-select').click();
    await (await row('smoke-row-new')).locator('button.preset-row-select').click();
    await expect((await row('smoke-row-new')).locator('button.preset-row-select')).toHaveAttribute('aria-current', 'true');
    await expectX('−0.4');
    await page.reload({waitUntil: 'domcontentloaded'});
    await (await row('smoke-row-new')).locator('button.preset-row-select').click();
    await expectX('−0.4');

    // 3. Delete with inline confirmation
    await (await row('smoke-row-new')).getByRole('button', {name: 'Menu for state smoke-row-new'}).click();
    await (await row('smoke-row-new')).getByRole('button', {name: 'Delete', exact: true}).click();
    await expect((await row('smoke-row-new')).getByRole('group', {name: 'Delete the state "smoke-row-new"?'})).toBeVisible();
    await (await row('smoke-row-new')).locator('.preset-confirm-cancel').click();
    await expect(await row('smoke-row-new')).toHaveCount(1);
    await (await row('smoke-row-new')).getByRole('button', {name: 'Menu for state smoke-row-new'}).click();
    await (await row('smoke-row-new')).getByRole('button', {name: 'Delete', exact: true}).click();
    await (await row('smoke-row-new')).getByRole('group').getByRole('button', {name: 'Delete', exact: true}).click();
    await expect(await row('smoke-row-new')).toHaveCount(0);
    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(await row('smoke-row-new')).toHaveCount(0);
    await expect(await row('')).toBeVisible();
});

async function fitState(page) {
    return page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === container.id || candidate.containerObj === container);
        const points = board.objectsList.filter(object => window.JXG.isPoint(object) && object.visPropCalc.visible)
            .map(point => [point.coords.usrCoords[1], point.coords.usrCoords[2]]);
        return {box: board.getBoundingBox(), points};
    });
}

test('fit to points frames every visible point and repeated presses keep the view', async ({page}) => {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
    await page.goto('/bezeg-2.0/bezier/curve', {waitUntil: 'domcontentloaded'});
    const navigation = page.locator('.workspace-navigation');
    const fit = navigation.getByRole('button', {name: 'Fit to points'});
    await expect(fit).toBeVisible();
    // Start away from the fitted view; JSXGraph's zoomAllPoints margin depended on the current zoom.
    await navigation.getByRole('button', {name: 'Zoom in'}).click();
    await navigation.getByRole('button', {name: 'Zoom in'}).click();
    await navigation.getByRole('button', {name: 'Pan right'}).click();

    await fit.click();
    const first = await fitState(page);
    expect(first.points.length).toBeGreaterThan(0);
    const [left, top, right, bottom] = first.box;
    for (const [x, y] of first.points) {
        expect(x).toBeGreaterThan(left);
        expect(x).toBeLessThan(right);
        expect(y).toBeGreaterThan(bottom);
        expect(y).toBeLessThan(top);
    }

    await fit.click();
    const second = await fitState(page);
    second.box.forEach((value, index) => expect(value).toBeCloseTo(first.box[index], 9));
});
