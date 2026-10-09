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
    const editor = inspector.locator('.point-coordinate-editor');
    await editor.locator('summary').click();
    await expect(editor.getByRole('spinbutton', {name: 'p0 x'})).toBeVisible();
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
    const x = editor.getByRole('spinbutton', {name: 'p0 x'});
    const y = editor.getByRole('spinbutton', {name: 'p0 y'});
    await x.fill('0.75');
    await y.fill('-0.35');
    const initialCurves = await visibleCurvePaths(page);
    expect(initialCurves.length).toBeGreaterThan(0);
    const initialGeometry = await geometrySignature(page);
    await editor.locator('.point-coordinate-form button.point-coordinate-submit').click();
    await expect(x).toHaveValue('0.75');
    await expect(y).toHaveValue('-0.35');
    const editedGeometry = await geometrySignature(page);
    expect(editedGeometry).not.toBe(initialGeometry);

    await setLanguage(page, 'en');
    await expect(page.locator('.workspace-heading h1')).toHaveText('Bézier curve');
    await expect(inspector.locator('.curve-selection button[aria-pressed="true"]')).toHaveCount(1);
    await expect(x).toHaveValue('0.75');
    await expect(y).toHaveValue('-0.35');
    expect((await visibleCurvePaths(page)).length).toBeGreaterThan(0);
    await expect.poll(() => geometrySignature(page)).toBe(editedGeometry);

    await setLanguage(page, 'sl');
    await expect(page.locator('.workspace-heading h1')).toHaveText('Bézierjeva krivulja');
    await expect(inspector.locator('.curve-selection button[aria-pressed="true"]')).toHaveCount(1);
    await expect(x).toHaveValue('0.75');
    await expect(y).toHaveValue('-0.35');
    expect((await visibleCurvePaths(page)).length).toBeGreaterThan(0);
    await expect.poll(() => geometrySignature(page)).toBe(editedGeometry);
});

test('saving, changing, and reopening a preset restores edited Bézier coordinates', async ({page}) => {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
    await page.goto('/bezeg-2.0/bezier/curve', {waitUntil: 'domcontentloaded'});
    const inspector = await selectBezierCurve(page);
    const editor = await openPointEditor(inspector);
    const savedCoordinates = {x: '0.65', y: '0.9'};
    const x = editor.getByRole('spinbutton', {name: 'p0 x'});
    const y = editor.getByRole('spinbutton', {name: 'p0 y'});
    await x.fill(savedCoordinates.x);
    await y.fill(savedCoordinates.y);
    await editor.locator('.point-coordinate-form button.point-coordinate-submit').click();
    await expect(x).toHaveValue(savedCoordinates.x);
    await expect(y).toHaveValue(savedCoordinates.y);
    const savedGeometry = await geometrySignature(page);
    expect(savedGeometry.length).toBeGreaterThan(0);

    const presetArea = await showPresetTools(inspector);
    await presetArea.getByRole('button', {name: 'Save preset', exact: true}).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Preset name').fill('smoke-edited-bezier');
    await dialog.getByRole('button', {name: 'Save', exact: true}).click();

    const savedPresetArea = await showPresetTools(inspector);
    const presetSelector = savedPresetArea.getByRole('combobox', {name: 'Presets'});
    await expect(presetSelector).toHaveValue('smoke-edited-bezier');
    const changedInspector = await selectBezierCurve(page);
    const changedEditor = await openPointEditor(changedInspector);
    await changedEditor.getByRole('spinbutton', {name: 'p0 x'}).fill('-0.4');
    await changedEditor.getByRole('spinbutton', {name: 'p0 y'}).fill('0.2');
    await changedEditor.locator('.point-coordinate-form button.point-coordinate-submit').click();
    await expect(changedEditor.getByRole('spinbutton', {name: 'p0 x'})).toHaveValue('-0.4');
    await expect(changedEditor.getByRole('spinbutton', {name: 'p0 y'})).toHaveValue('0.2');
    await expect.poll(() => geometrySignature(page)).not.toBe(savedGeometry);

    const changedPresetArea = await showPresetTools(changedInspector);
    const livePresetSelector = changedPresetArea.getByRole('combobox', {name: 'Presets'});
    await expect(livePresetSelector).toBeVisible();
    await livePresetSelector.selectOption('');
    const defaultInspector = await selectBezierCurve(page);
    const defaultEditor = await openPointEditor(defaultInspector);
    await defaultEditor.getByRole('spinbutton', {name: 'p0 x'}).fill('0.1');
    await defaultEditor.getByRole('spinbutton', {name: 'p0 y'}).fill('-0.1');
    await defaultEditor.locator('.point-coordinate-form button.point-coordinate-submit').click();
    await expect.poll(() => geometrySignature(page)).not.toBe(savedGeometry);

    const defaultPresetArea = await showPresetTools(defaultInspector);
    const defaultPresetSelector = defaultPresetArea.getByRole('combobox', {name: 'Presets'});
    await expect(defaultPresetSelector).toBeVisible();
    await defaultPresetSelector.selectOption('smoke-edited-bezier');

    const reopenedInspector = await selectBezierCurve(page);
    const reopenedEditor = await openPointEditor(reopenedInspector);
    await expect(reopenedEditor.getByRole('spinbutton', {name: 'p0 x'})).toHaveValue(savedCoordinates.x);
    await expect(reopenedEditor.getByRole('spinbutton', {name: 'p0 y'})).toHaveValue(savedCoordinates.y);
    await expect.poll(() => geometrySignature(page)).toBe(savedGeometry);
});
