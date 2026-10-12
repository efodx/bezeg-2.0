const {test, expect} = require('@playwright/test');
const fs = require('node:fs/promises');
const JSZip = require('jszip');

function inspector(page) {
    return page.locator('.workspace-inspector');
}

async function openSaveTools(page) {
    const panel = inspector(page);
    await panel.locator('.inspector-tabs').getByRole('button', {name: 'Save', exact: true}).click();
    const save = panel.locator('#inspector-save');
    await expect(save).toBeVisible();
    return save;
}

async function createPreset(page, id) {
    const save = await openSaveTools(page);
    await save.getByRole('button', {name: 'Save preset', exact: true}).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Preset name').fill(id);
    await dialog.getByRole('button', {name: 'Save', exact: true}).click();
    await expect(dialog).toBeHidden();
}

async function generatePresetFigures(page, ids) {
    const save = await openSaveTools(page);
    const trigger = save.getByRole('button', {name: 'Generate preset figures', exact: true});
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (const id of ids) await dialog.getByRole('checkbox', {name: id, exact: true}).check();
    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', {name: 'Generate', exact: true}).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('slike.zip');
    await expect(trigger).toBeFocused();
    const zip = await JSZip.loadAsync(await fs.readFile(await download.path()));
    return Object.fromEntries(await Promise.all(Object.keys(zip.files).filter(name => name.endsWith('.png'))
        .map(async name => [name, await zip.files[name].async('nodebuffer')])));
}

async function boardSnapshot(page) {
    return page.locator('#jgbox').evaluate(container => {
        const boards = Object.values(window.JXG?.boards || {});
        const board = boards.find(candidate => candidate.container === container.id || candidate.containerObj === container);
        if (!board) throw new Error('The main JSXGraph board is missing.');
        const visibleCurves = Object.values(board.objects || {}).filter(object => object.elType === 'curve' &&
            object.visProp?.visible !== false && object.visProp?.visible !== 'false').flatMap(object => {
            const path = object.rendNode?.isConnected && object.rendNode.getAttribute?.('d');
            if (!path) return [];
            const style = getComputedStyle(object.rendNode);
            return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 ? [path] : [];
        }).sort();
        const axes = [board.defaultAxes?.x, board.defaultAxes?.y].map(axis => ({
            id: axis?.id,
            pointIds: [axis?.point1?.id, axis?.point2?.id],
            ticksId: axis?.defaultTicks?.id,
            tickLabelIds: Object.values(axis?.defaultTicks?.labels || {}).map(label => label.id).sort(),
        }));
        return {
            boundingBox: board.getBoundingBox().map(value => Number(value.toFixed(6))),
            axes,
            infoboxId: board.infobox?.id,
            objectCount: Object.keys(board.objects || {}).length,
            visibleCurves,
        };
    });
}

function expectCurvePathsClose(actualPaths, expectedPaths, tolerance = 1e-8) {
    expect(actualPaths).toHaveLength(expectedPaths.length);
    const tokenize = path => path.match(/[-+]?(?:(?:\d+\.\d*)|(?:\.\d+)|\d+)(?:[eE][-+]?\d+)?|[a-zA-Z]/g) || [];
    for (let pathIndex = 0; pathIndex < expectedPaths.length; pathIndex += 1) {
        const expected = tokenize(expectedPaths[pathIndex]);
        const actual = tokenize(actualPaths[pathIndex]);
        expect(actual).toHaveLength(expected.length);
        for (let tokenIndex = 0; tokenIndex < expected.length; tokenIndex += 1) {
            if (/^[a-zA-Z]$/.test(expected[tokenIndex])) {
                expect(actual[tokenIndex]).toBe(expected[tokenIndex]);
            } else {
                expect(Number(actual[tokenIndex])).toBeCloseTo(Number(expected[tokenIndex]), 8);
                expect(Math.abs(Number(actual[tokenIndex]) - Number(expected[tokenIndex]))).toBeLessThanOrEqual(tolerance);
            }
        }
    }
}

async function boardChildSnapshot(page) {
    return page.evaluate(() => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.containerObj?.id === 'hodograph-input-box');
        if (!board) return undefined;
        return {
            boundingBox: board.getBoundingBox().map(value => Number(value.toFixed(6))),
            points: board.objectsList.filter(object => object.elType === 'point').map(point => [
                Number(point.X().toFixed(6)), Number(point.Y().toFixed(6)),
            ]),
        };
    });
}

async function rationalFarinRatios(page) {
    return page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.containerObj === container);
        if (!board) throw new Error('The main JSXGraph board is missing.');
        return board.objectsList.filter(object => object.elType === 'slider')
            .map(slider => Number(slider.Value().toFixed(8)));
    });
}

async function jsxGraphBoardCount(page) {
    return page.evaluate(() => Object.keys(window.JXG?.boards || {}).length);
}

async function navigateTopic(page, familyTitle, linkName) {
    const topics = page.getByRole('navigation', {name: 'Demonstration topics'});
    const family = topics.locator('details').filter({has: page.getByText(familyTitle, {exact: true})});
    if (!(await family.evaluate(element => element.open))) await family.locator('summary').click();
    await family.getByRole('link', {name: linkName, exact: true}).click();
}

async function firstHodographPointPosition(page) {
    return page.locator('#hodograph-input-box').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.containerObj === container);
        const point = board?.objectsList.find(object => object.elType === 'point' && object.name?.includes('w_'));
        const bounds = point?.rendNode?.getBoundingClientRect();
        if (!bounds || bounds.width === 0 || bounds.height === 0) throw new Error('The first hodograph input point is not rendered.');
        const containerBounds = container.getBoundingClientRect();
        const position = {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2};
        if (position.x < containerBounds.left || position.x > containerBounds.right ||
            position.y < containerBounds.top || position.y > containerBounds.bottom) {
            throw new Error('The first hodograph input point is outside the visible child board.');
        }
        return position;
    });
}

async function selectFirstCurve(page) {
    const edit = inspector(page);
    await edit.locator('.inspector-tabs').getByRole('button', {name: 'Edit', exact: true}).click();
    const selection = edit.locator('.curve-selection');
    await selection.getByRole('button').first().click();
    await expect(selection.locator('button[aria-pressed="true"]')).toHaveCount(1);
    return selection;
}

test.beforeEach(async ({page}) => {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
});

test('batch export captures different saved Bézier scenes and restores selection, viewport, axes, and focus', async ({page}) => {
    await page.goto('/bezeg-2.0/bezier/curve', {waitUntil: 'domcontentloaded'});
    await selectFirstCurve(page);
    let editor = inspector(page).locator('.point-coordinate-editor');
    await editor.locator('summary').click();
    const x = editor.getByRole('spinbutton', {name: 'p0 x'});
    await expect(x).toBeVisible();

    await createPreset(page, 'ownership-default');
    await selectFirstCurve(page);
    editor = inspector(page).locator('.point-coordinate-editor');
    // Presets load in place now, so the editor may still be open from before; only open it when closed.
    if (!(await editor.evaluate(element => element.open))) await editor.locator('summary').click();
    await expect(editor).toBeVisible();
    await editor.getByRole('spinbutton', {name: 'p0 x'}).fill('0.8');
    await editor.locator('.point-coordinate-form button.point-coordinate-submit').click();
    await createPreset(page, 'ownership-alternate');
    const selection = await selectFirstCurve(page);
    await page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG.boards).find(candidate => candidate.containerObj === container);
        board.setBoundingBox([-3, 4, 5, -4], true);
    });

    const entry = await boardSnapshot(page);
    expect(entry.visibleCurves.length).toBeGreaterThan(0);
    expect(entry.axes.every(axis => axis.id && axis.ticksId && axis.tickLabelIds.length > 0)).toBe(true);
    const images = await generatePresetFigures(page, ['ownership-default', 'ownership-alternate']);
    expect(Object.keys(images).sort()).toEqual(['ownership-alternate.png', 'ownership-default.png']);
    for (const image of Object.values(images)) {
        expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        expect(image.byteLength).toBeGreaterThan(100);
    }
    expect(images['ownership-default.png'].equals(images['ownership-alternate.png'])).toBe(false);

    const restored = await boardSnapshot(page);
    expect(restored).toEqual(entry);
    await expect(selection.locator('button[aria-pressed="true"]')).toHaveCount(1);
    await expect(inspector(page).getByRole('button', {name: 'Generate preset figures', exact: true})).toBeFocused();
});

test('scene rebuild preserves De Casteljau and Bernstein auxiliary geometry', async ({page}) => {
    await page.goto('/bezeg-2.0/bezier/decasteljau2', {waitUntil: 'domcontentloaded'});
    await expect.poll(async () => (await boardSnapshot(page)).visibleCurves.length).toBeGreaterThan(1);
    await createPreset(page, 'ownership-decasteljau');
    const decasteljauBefore = await boardSnapshot(page);
    expect(decasteljauBefore.visibleCurves.length).toBeGreaterThan(1);
    await generatePresetFigures(page, ['ownership-decasteljau']);
    expect(await boardSnapshot(page)).toEqual(decasteljauBefore);

    await page.goto('/bezeg-2.0/bernstein', {waitUntil: 'domcontentloaded'});
    await createPreset(page, 'ownership-bernstein');
    const bernsteinBefore = await boardSnapshot(page);
    expect(bernsteinBefore.visibleCurves.length).toBeGreaterThan(0);
    await generatePresetFigures(page, ['ownership-bernstein']);
    expect(await boardSnapshot(page)).toEqual(bernsteinBefore);
});

test('batch restore preserves live Farin weights, rational curve, and standard-form mode', async ({page}) => {
    await page.goto('/bezeg-2.0/rational/farin-points', {waitUntil: 'domcontentloaded'});
    await createPreset(page, 'ownership-rational-default');

    const selection = await selectFirstCurve(page);
    await inspector(page).getByRole('button', {name: '<', exact: true}).click();
    await inspector(page).getByRole('button', {name: '+', exact: true}).first().click();
    await selection.getByRole('button', {name: 'Clear selection', exact: true}).click();
    const farinSwitch = inspector(page).getByRole('checkbox', {name: 'Farin points', exact: true});
    await farinSwitch.check();

    await selectFirstCurve(page);
    const standardForm = inspector(page).getByRole('checkbox', {name: 'Standard form', exact: true});
    await standardForm.check();
    const beforeCurve = await boardSnapshot(page);
    const beforeRatios = await rationalFarinRatios(page);
    expect(beforeRatios).toHaveLength(3);
    const beforeEffectiveWeights = [1];
    beforeRatios.forEach(ratio => {
        const previousWeight = beforeEffectiveWeights[beforeEffectiveWeights.length - 1];
        beforeEffectiveWeights.push(previousWeight * ratio / (1 - ratio));
    });
    expect(beforeEffectiveWeights[0]).toBeCloseTo(1);
    expect(beforeEffectiveWeights[1]).toBeCloseTo(1.6);
    expect(beforeEffectiveWeights[2]).toBeCloseTo(0.8);
    expect(beforeEffectiveWeights[3]).toBeCloseTo(0.8);
    await expect(standardForm).toBeChecked();

    await generatePresetFigures(page, ['ownership-rational-default']);
    await inspector(page).locator('.inspector-tabs').getByRole('button', {name: 'Edit', exact: true}).click();
    const restoredCurve = await boardSnapshot(page);
    const {visibleCurves: restoredPaths, ...restoredBoardState} = restoredCurve;
    const {visibleCurves: expectedPaths, ...expectedBoardState} = beforeCurve;
    expect(restoredBoardState).toEqual(expectedBoardState);
    expectCurvePathsClose(restoredPaths, expectedPaths);
    expect(await rationalFarinRatios(page)).toEqual(beforeRatios);
    await expect(inspector(page).getByRole('checkbox', {name: 'Standard form', exact: true})).toBeChecked();

    const restoredSelection = inspector(page).locator('.curve-selection');
    await restoredSelection.getByRole('button', {name: 'Clear selection', exact: true}).click();
    await expect(inspector(page).getByRole('checkbox', {name: 'Farin points', exact: true})).toBeChecked();
    await expect(inspector(page).getByRole('checkbox', {name: 'Standard form', exact: true})).toBeChecked();
});

async function farinGeometry(page) {
    return page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.containerObj === container);
        if (!board) throw new Error('The main JSXGraph board is missing.');
        const round = value => Number(value.toFixed(6));
        const controlPoints = board.objectsList.filter(object => object.elType === 'point' && object.visPropCalc?.visible &&
            !board.objectsList.some(slider => slider.elType === 'slider' && (slider.point1 === object || slider.point2 === object)))
            .map(point => {
                const bounds = point.rendNode?.getBoundingClientRect();
                return {x: round(point.X()), y: round(point.Y()),
                    screen: bounds && {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2}};
            });
        const sliders = board.objectsList.filter(object => object.elType === 'slider').map(slider => ({
            value: round(slider.Value()),
            start: [round(slider.point1.X()), round(slider.point1.Y())],
            end: [round(slider.point2.X()), round(slider.point2.Y())],
            glider: [round(slider.X()), round(slider.Y())],
        }));
        return {controlPoints, sliders};
    });
}

test('Farin sliders follow dragged control points without changing their ratios', async ({page}) => {
    await page.goto('/bezeg-2.0/rational/farin-points', {waitUntil: 'domcontentloaded'});
    await inspector(page).getByRole('checkbox', {name: 'Farin points', exact: true}).check();
    const before = await farinGeometry(page);
    expect(before.sliders).toHaveLength(3);
    const p1 = before.controlPoints[1];
    expect([p1.x, p1.y]).toEqual([-3, 3]);
    expect(p1.screen).toBeTruthy();

    await page.mouse.move(p1.screen.x, p1.screen.y);
    await page.mouse.down();
    await page.mouse.move(p1.screen.x + 40, p1.screen.y + 30, {steps: 6});
    await page.mouse.up();

    await expect.poll(async () => {
        const {x, y} = (await farinGeometry(page)).controlPoints[1];
        return x !== p1.x && y !== p1.y;
    }).toBe(true);
    const after = await farinGeometry(page);
    expect(after.sliders.map(slider => slider.value)).toEqual(before.sliders.map(slider => slider.value));
    const moved = after.controlPoints[1];
    expect(after.sliders[0].end).toEqual([moved.x, moved.y]);
    expect(after.sliders[1].start).toEqual([moved.x, moved.y]);
    after.sliders.forEach(slider => {
        for (let axis = 0; axis < 2; axis++) {
            const expected = slider.start[axis] + slider.value * (slider.end[axis] - slider.start[axis]);
            expect(slider.glider[axis]).toBeCloseTo(expected, 5);
        }
    });
});

test('PH child board and model points survive batch scene disposal and restoration', async ({page}) => {
    await page.goto('/bezeg-2.0/ph/cubic', {waitUntil: 'domcontentloaded'});
    await createPreset(page, 'ownership-ph');
    await selectFirstCurve(page);
    await expect.poll(() => boardChildSnapshot(page)).toBeDefined();
    const childBoard = page.locator('#hodograph-input-box');
    await childBoard.evaluate(container => {
        const board = Object.values(window.JXG.boards).find(candidate => candidate.containerObj === container);
        board.setBoundingBox([-5, 4, 4, -5], true);
    });
    const childBefore = await boardChildSnapshot(page);
    expect(childBefore.points.length).toBeGreaterThan(0);
    const before = await boardSnapshot(page);
    await generatePresetFigures(page, ['ownership-ph']);
    await inspector(page).locator('.inspector-tabs').getByRole('button', {name: 'Edit', exact: true}).click();
    await expect.poll(async () => {
        const snapshot = await boardChildSnapshot(page);
        return snapshot && snapshot.boundingBox.every(Number.isFinite) ? snapshot : undefined;
    }).toEqual(childBefore);
    expect(await boardSnapshot(page)).toEqual(before);
    await expect(inspector(page).locator('.curve-selection button[aria-pressed="true"]')).toHaveCount(1);

    const coordinateEditor = inspector(page).locator('.point-coordinate-editor');
    await coordinateEditor.locator('summary').click();
    const w0x = coordinateEditor.getByRole('spinbutton', {name: 'w0 x'});
    const oldW0x = Number(await w0x.inputValue());
    const oldCurve = await boardSnapshot(page);
    await childBoard.scrollIntoViewIfNeeded();
    const pointPosition = await firstHodographPointPosition(page);
    await page.mouse.move(pointPosition.x, pointPosition.y);
    await page.mouse.down();
    await page.mouse.move(pointPosition.x + 24, pointPosition.y - 16, {steps: 5});
    await page.mouse.up();

    await expect.poll(async () => Number(await w0x.inputValue())).not.toBe(oldW0x);
    expect(await boardSnapshot(page)).not.toEqual(oldCurve);
});

test('same-page polynomial and PH navigation disposes main and child boards across remounts', async ({page}) => {
    await page.goto('/bezeg-2.0/bezier/curve', {waitUntil: 'domcontentloaded'});
    await expect.poll(() => jsxGraphBoardCount(page)).toBe(1);

    for (let visit = 0; visit < 2; visit++) {
        await navigateTopic(page, 'PH curves', 'Degree 3');
        await expect(page.getByRole('heading', {name: 'Degree 3 PH curve'})).toBeVisible();
        await expect.poll(() => jsxGraphBoardCount(page)).toBe(1);
        await selectFirstCurve(page);
        await expect.poll(() => jsxGraphBoardCount(page)).toBe(2);

        await navigateTopic(page, 'Bézier curves', 'Bézier curve');
        await expect(page.getByRole('heading', {name: 'Bézier curve'})).toBeVisible();
        await expect.poll(() => jsxGraphBoardCount(page)).toBe(1);
    }

    await selectFirstCurve(page);
    const editor = inspector(page).locator('.point-coordinate-editor');
    await editor.locator('summary').click();
    await expect(editor.getByRole('spinbutton', {name: 'p0 x'})).toBeVisible();
});
