const {test, expect} = require('@playwright/test');

for (const width of [390, 614, 1280]) {
    test(`Bernstein degree remains uncovered at ${width}px`, async ({page}) => {
        await page.setViewportSize({width, height: 1000});
        await page.goto('/bezeg-2.0/bernstein');
        const field = page.getByRole('spinbutton', {name: 'Stopnja polinomov', exact: true});
        await expect(field).toHaveValue('1');
        const controls = page.locator('.count-setter-controls').filter({has: field});
        const minus = controls.getByRole('button').first();
        const plus = controls.getByRole('button').last();

        const expectUncovered = async () => {
            await field.scrollIntoViewIfNeeded();
            const [inputBox, minusBox, plusBox] = await Promise.all([
                field.boundingBox(), minus.boundingBox(), plus.boundingBox(),
            ]);
            const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width &&
                a.y < b.y + b.height && b.y < a.y + a.height;
            expect(overlaps(inputBox, minusBox), 'minus does not cover the input').toBe(false);
            expect(overlaps(inputBox, plusBox), 'plus does not cover the input').toBe(false);
            const rowBox = await controls.boundingBox();
            for (const control of [field, minus, plus]) {
                const box = await control.boundingBox();
                expect(box.x).toBeGreaterThanOrEqual(rowBox.x);
                expect(box.x + box.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
                // --bezeg-control-height: 44 px on coarse pointers and at 700 px or narrower, 38 px on a wide fine-pointer view.
                const target = width <= 700 ? 44 : 38;
                expect(box.width).toBeGreaterThanOrEqual(target);
                expect(box.height).toBeGreaterThanOrEqual(target);
                expect(await control.evaluate(el => {
                    const rect = el.getBoundingClientRect();
                    return el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
                }), 'control remains pointer reachable when the row wraps').toBe(true);
            }
        };
        await expectUncovered();
        await plus.click();
        await expect(field).toHaveValue('2');
        await field.fill('4');
        await field.press('Enter');
        await expect(field).toHaveValue('4');
        await field.press('ArrowUp');
        await expect(field).toHaveValue('5');
        // Unavailable at the bound (slice 2a): aria-disabled and focusable, and pressing it says why instead of doing nothing.
        await expect(plus).toHaveAttribute('aria-disabled', 'true');
        // Playwright counts aria-disabled as not enabled, so the press is a real keyboard press on the focused button.
        await plus.focus();
        await page.keyboard.press('Enter');
        await expect(plus).toBeFocused();
        await expect(field).toHaveValue('5');
        await expect(page.locator('[data-count-status]')).not.toBeEmpty();
        await minus.click();
        await expect(field).toHaveValue('4');

        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        await expectUncovered();
    });
}

// Slice 1a (spec decision 2): typing only edits a draft; Enter or blur commits it, Escape drops it.
// What reached the graph is read from the board itself: every visible point position and curve path.
async function boardSignature(page) {
    return page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === container.id || candidate.containerObj === container);
        if (!board) throw new Error('main board missing');
        const rows = Object.values(board.objects || {}).filter(object => object.visProp?.visible !== false && object.visProp?.visible !== 'false')
            .flatMap(object => {
                if (object.elType === 'point') return [`point ${object.X().toFixed(5)} ${object.Y().toFixed(5)}`];
                const path = object.rendNode?.isConnected && object.rendNode.getAttribute?.('d');
                return path ? [`${object.elType} ${path}`] : [];
            });
        return rows.sort().join('\n');
    });
}
const settleFrames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 150)))));
const modelValue = async field => Number(await field.getAttribute('aria-valuenow'));

test('a typed degree reaches the graph only on blur or Enter, and Escape drops it', async ({page}) => {
    await page.goto('/bezeg-2.0/bernstein');
    const field = page.getByRole('spinbutton', {name: 'Stopnja polinomov', exact: true});
    await expect(field).toHaveValue('1');
    const degree1 = await boardSignature(page);
    expect(degree1.length, 'the board has drawn objects').toBeGreaterThan(0);

    await field.fill('3');
    await settleFrames(page);
    await expect(field).toHaveValue('3');
    expect(await modelValue(field), 'typing alone leaves the model value').toBe(1);
    expect(await boardSignature(page), 'typing alone leaves the graph').toBe(degree1);

    await field.blur();
    await expect.poll(() => modelValue(field)).toBe(3);
    await expect.poll(() => boardSignature(page)).not.toBe(degree1);
    const degree3 = await boardSignature(page);

    await field.fill('4');
    await settleFrames(page);
    expect(await modelValue(field)).toBe(3);
    expect(await boardSignature(page)).toBe(degree3);
    await field.press('Enter');
    await expect.poll(() => modelValue(field)).toBe(4);
    await expect.poll(() => boardSignature(page)).not.toBe(degree3);
    const degree4 = await boardSignature(page);

    await field.fill('2');
    await field.press('Escape');
    await expect(field).toHaveValue('4');
    await field.blur();
    await settleFrames(page);
    expect(await modelValue(field), 'Escape dropped the draft, so blur commits nothing').toBe(4);
    expect(await boardSignature(page)).toBe(degree4);
});

test('Shift+Arrow, PageUp and PageDown take the big step on a slider and its field and stop at the limits', async ({page}) => {
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/bezeg-2.0/bezier/subdivision-2');
    const slider = page.getByRole('slider', {name: 'Subdivision parameter t', exact: true});
    const field = page.getByRole('spinbutton', {name: /Subdivision parameter t/});
    await expect(slider).toBeVisible();
    await expect(field).toHaveCount(1);
    const range = await slider.evaluate(el => ({min: Number(el.min), max: Number(el.max), step: Number(el.step), value: Number(el.value)}));
    const big = range.step * 10;
    expect(range.step, 'the slider has a step').toBeGreaterThan(0);
    expect(range.value).toBeCloseTo(0.5, 6);
    const start = await boardSignature(page);
    expect(start.length, 'the board has drawn objects').toBeGreaterThan(0);

    const sliderValue = async () => Number(await slider.inputValue());
    await slider.focus();
    await slider.press('ArrowRight');
    await expect.poll(sliderValue).toBeCloseTo(range.value + range.step, 6);
    await slider.press('Shift+ArrowRight');
    await expect.poll(sliderValue).toBeCloseTo(range.value + range.step + big, 6);
    await slider.press('PageUp');
    await expect.poll(sliderValue).toBeCloseTo(range.value + range.step + 2 * big, 6);
    await slider.press('PageDown');
    await slider.press('Shift+ArrowLeft');
    await expect.poll(sliderValue).toBeCloseTo(range.value + range.step, 6);
    await expect.poll(() => modelValue(field), 'the field follows the slider').toBeCloseTo(range.value + range.step, 6);
    expect(await boardSignature(page), 'the graph follows the slider').not.toBe(start);

    for (let i = 0; i < 12; i++) await slider.press('PageUp');
    await expect.poll(sliderValue).toBeCloseTo(range.max, 6);
    await slider.press('PageUp');
    await slider.press('Shift+ArrowRight');
    await settleFrames(page);
    expect(await sliderValue(), 'the slider stops at its maximum').toBeCloseTo(range.max, 6);
    const atMax = await boardSignature(page);
    for (let i = 0; i < 12; i++) await slider.press('PageDown');
    await expect.poll(sliderValue).toBeCloseTo(range.min, 6);
    await slider.press('PageDown');
    await slider.press('Shift+ArrowLeft');
    await settleFrames(page);
    expect(await sliderValue(), 'the slider stops at its minimum').toBeCloseTo(range.min, 6);
    expect(await boardSignature(page), 'the graph moved with the slider').not.toBe(atMax);

    // The numeric field takes the same keys; it commits each key at once and clamps at the limits.
    await field.focus();
    await field.press('PageUp');
    await expect.poll(() => modelValue(field)).toBeCloseTo(range.min + big, 6);
    await field.press('Shift+ArrowUp');
    await expect.poll(() => modelValue(field)).toBeCloseTo(range.min + 2 * big, 6);
    expect(await sliderValue(), 'the slider follows the field').toBeCloseTo(range.min + 2 * big, 6);
    await field.press('ArrowUp');
    await expect.poll(() => modelValue(field)).toBeCloseTo(range.min + 2 * big + range.step, 6);
    await field.press('Shift+ArrowDown');
    await expect.poll(() => modelValue(field)).toBeCloseTo(range.min + range.step + big, 6);
    const midSignature = await boardSignature(page);
    for (let i = 0; i < 12; i++) await field.press('PageUp');
    await expect.poll(() => modelValue(field)).toBeCloseTo(range.max, 6);
    await field.press('Shift+ArrowUp');
    await settleFrames(page);
    expect(await modelValue(field), 'the field stops at its maximum').toBeCloseTo(range.max, 6);
    expect(await boardSignature(page), 'the graph follows the field').not.toBe(midSignature);
    for (let i = 0; i < 12; i++) await field.press('PageDown');
    await expect.poll(() => modelValue(field)).toBeCloseTo(range.min, 6);
    await field.press('Shift+ArrowDown');
    await settleFrames(page);
    expect(await modelValue(field), 'the field stops at its minimum').toBeCloseTo(range.min, 6);
    expect(await sliderValue()).toBeCloseTo(range.min, 6);
    expect(errors, 'no page error at the limits').toEqual([]);
});
