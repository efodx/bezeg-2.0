const {test, expect} = require('@playwright/test');

for (const width of [390, 614, 1280]) {
    test(`Bernstein degree remains uncovered at ${width}px`, async ({page}) => {
        test.skip(width < 1000, 'phone workspace is redesigned by task 09: below 1000 px the board cards cover the Orodja degree row (docs/tasks/ux-picks-app-wide/09-phone-presenter.md)');
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

// The Parameter reza puck (symbol t, id subdivision-t) of /bezier/subdivision-2: range 0.01..0.99, step 0.01, big step 0.1.
// Plain arrows take the small step, Shift+Arrow, PageUp and PageDown the big step, and the value stops at the limits.
test('Shift+Arrow, PageUp and PageDown take the big step on the Parameter reza puck and stop at the limits', async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/bezeg-2.0/bezier/subdivision-2');
    const puck = page.getByRole('slider', {name: /Parameter reza/});
    await expect(puck).toBeVisible();
    const range = await puck.evaluate(el => ({min: Number(el.getAttribute('aria-valuemin')), max: Number(el.getAttribute('aria-valuemax')), value: Number(el.getAttribute('aria-valuenow'))}));
    const step = 0.01;
    const big = 0.1;
    expect(range.min).toBeCloseTo(0.01, 6);
    expect(range.max).toBeCloseTo(0.99, 6);
    expect(range.value).toBeCloseTo(0.5, 6);
    const start = await boardSignature(page);
    expect(start.length, 'the board has drawn objects').toBeGreaterThan(0);

    const value = () => modelValue(puck);
    await puck.focus();
    await puck.press('ArrowRight');
    await expect.poll(value).toBeCloseTo(range.value + step, 6);
    await puck.press('Shift+ArrowRight');
    await expect.poll(value).toBeCloseTo(range.value + step + big, 6);
    await puck.press('PageUp');
    await expect.poll(value).toBeCloseTo(range.value + step + 2 * big, 6);
    await puck.press('PageDown');
    await puck.press('Shift+ArrowLeft');
    await expect.poll(value).toBeCloseTo(range.value + step, 6);
    await puck.press('ArrowUp');
    await expect.poll(value).toBeCloseTo(range.value + 2 * step, 6);
    await puck.press('Shift+ArrowDown');
    await expect.poll(value).toBeCloseTo(range.value + 2 * step - big, 6);
    await puck.press('ArrowLeft');
    await puck.press('ArrowDown');
    await expect.poll(value).toBeCloseTo(range.value - big, 6);
    expect(await boardSignature(page), 'the graph follows the puck').not.toBe(start);

    for (let i = 0; i < 12; i++) await puck.press('PageUp');
    await expect.poll(value).toBeCloseTo(range.max, 6);
    await puck.press('PageUp');
    await puck.press('Shift+ArrowRight');
    await settleFrames(page);
    expect(await value(), 'the puck stops at its maximum').toBeCloseTo(range.max, 6);
    const atMax = await boardSignature(page);
    for (let i = 0; i < 12; i++) await puck.press('PageDown');
    await expect.poll(value).toBeCloseTo(range.min, 6);
    await puck.press('PageDown');
    await puck.press('Shift+ArrowLeft');
    await settleFrames(page);
    expect(await value(), 'the puck stops at its minimum').toBeCloseTo(range.min, 6);
    expect(await boardSignature(page), 'the graph moved with the puck').not.toBe(atMax);

    // Enter opens the typed-value field; it commits on Enter and refuses a value outside the range.
    await puck.press('Enter');
    const field = page.getByRole('textbox', {name: /Vnesi vrednost/});
    await field.fill('0,7');
    await field.press('Enter');
    await expect.poll(value).toBeCloseTo(0.7, 6);
    expect(errors, 'no page error at the limits').toEqual([]);
});
