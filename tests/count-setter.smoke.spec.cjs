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
                expect(box.width).toBeGreaterThanOrEqual(44);
                expect(box.height).toBeGreaterThanOrEqual(44);
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
        await expect(plus).toBeDisabled();
        await minus.click();
        await expect(field).toHaveValue('4');

        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        await expectUncovered();
    });
}
