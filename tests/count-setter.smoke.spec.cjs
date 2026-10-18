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
            expect(inputBox.x).toBeGreaterThanOrEqual(minusBox.x + minusBox.width);
            expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(plusBox.x);
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
