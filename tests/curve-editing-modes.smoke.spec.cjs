const {test, expect} = require('@playwright/test');

for (const route of ['rational/base', 'bezier/decasteljau']) {
    test(`visible curve modes preserve editing on ${route}`, async ({page}, testInfo) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
        await page.goto(`/bezeg-2.0/${route}`);
        await page.locator('.inspector-tabs').getByRole('button', {name: 'Edit', exact: true}).click();
        await page.locator('.curve-selection').getByRole('button').first().click();
        const group = page.getByRole('group', {name: 'Editing mode', exact: true});
        const buttons = group.getByRole('button');
        await expect(buttons).toHaveCount(3);
        await expect(group.getByRole('button', {name: 'Manipulate curve'})).toHaveAttribute('aria-pressed', 'true');

        const boardPoints = () => page.locator('#jgbox').evaluate(element => {
            const board = Object.values(window.JXG.boards).find(b => b.containerObj === element);
            return board.objectsList.filter(o => o.elType === 'point').map(o => ({id: o.id, x: o.X(), y: o.Y()}));
        });
        const initial = await boardPoints();
        await group.getByRole('button', {name: 'Add points'}).focus();
        await page.keyboard.press('Enter');
        await expect(group.getByRole('button', {name: 'Add points'})).toHaveAttribute('aria-pressed', 'true');
        expect(await boardPoints()).toEqual(initial);
        const focus = await group.getByRole('button', {name: 'Add points'}).evaluate(el => getComputedStyle(el).outlineStyle);
        expect(focus).toBe('solid');

        // Click an empty board position, then delete that same control point.
        const addTarget = await page.locator('#jgbox').evaluate(element => {
            const board = Object.values(window.JXG.boards).find(b => b.containerObj === element);
            const rect = element.getBoundingClientRect();
            return {x: rect.left + board.origin.scrCoords[1], y: rect.top + board.origin.scrCoords[2] + 2 * board.unitY};
        });
        await page.mouse.click(addTarget.x, addTarget.y);
        await expect.poll(async () => (await boardPoints()).some(({x, y}) => Math.abs(x) < .05 && Math.abs(y + 2) < .05)).toBe(true);
        const addedPoint = (await boardPoints()).find(point => Math.abs(point.x) < .05 && Math.abs(point.y + 2) < .05);
        expect(addedPoint).toBeDefined();
        expect(initial.some(point => point.id === addedPoint.id)).toBe(false);

        const pointScreenPosition = () => page.locator('#jgbox').evaluate((element, pointId) => {
            const board = Object.values(window.JXG.boards).find(b => b.containerObj === element);
            const point = board.objects[pointId];
            const rect = element.getBoundingClientRect();
            return {
                x: rect.left + board.origin.scrCoords[1] + point.X() * board.unitX,
                y: rect.top + board.origin.scrCoords[2] - point.Y() * board.unitY,
            };
        }, addedPoint.id);
        await group.getByRole('button', {name: 'Manipulate curve'}).click();
        const dragStart = await pointScreenPosition();
        await page.mouse.move(dragStart.x, dragStart.y);
        await page.mouse.down();
        await page.mouse.move(dragStart.x + 20, dragStart.y - 15, {steps: 5});
        await page.mouse.up();
        await expect.poll(async () => {
            const point = (await boardPoints()).find(({id}) => id === addedPoint.id);
            return point && (Math.abs(point.x) >= .05 || Math.abs(point.y + 2) >= .05);
        }).toBe(true);
        await group.getByRole('button', {name: 'Delete points'}).click();
        const deleteTarget = await pointScreenPosition();
        await page.mouse.click(deleteTarget.x, deleteTarget.y);
        await expect.poll(async () => (await boardPoints()).some(({id}) => id === addedPoint.id)).toBe(false);
        expect((await boardPoints()).length).toBe(initial.length);

        for (const language of ['sl', 'en']) {
            await page.locator('#bezeg-language').selectOption(language);
            const modes = page.locator('.curve-editing-mode-buttons');
            await expect(modes.locator('button[aria-pressed="true"]')).toHaveCount(1);
            for (const width of [1440, 390]) {
                await page.setViewportSize({width, height: 1000});
                await modes.scrollIntoViewIfNeeded();
                for (const button of await modes.getByRole('button').all()) {
                    const box = await button.boundingBox();
                    expect(box.height).toBeGreaterThanOrEqual(44);
                    expect(box.x).toBeGreaterThanOrEqual(0);
                    expect(box.x + box.width).toBeLessThanOrEqual(width);
                }
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                await modes.screenshot({path: testInfo.outputPath(`${language}-${width}.png`)});
            }
        }
        await page.locator('html').evaluate(el => el.style.fontSize = '200%');
        await group.scrollIntoViewIfNeeded();
        await expect(group).toBeVisible();
        expect(await buttons.evaluateAll(elements => elements.every(el => el.scrollWidth <= el.clientWidth))).toBe(true);
        await page.locator('html').evaluate(el => el.style.fontSize = '');
        await page.locator('.inspector-tabs').getByRole('button', {name: 'Save', exact: true}).click();
        await page.getByRole('button', {name: 'Reset preset', exact: true}).click();
        await page.locator('.inspector-tabs').getByRole('button', {name: 'Edit', exact: true}).click();
        await expect(group).toHaveCount(0);
        await page.locator('.curve-selection').getByRole('button').first().click();
        await expect(group.getByRole('button', {name: 'Manipulate curve'})).toHaveAttribute('aria-pressed', 'true');
        expect(errors).toEqual([]);
    });
}
