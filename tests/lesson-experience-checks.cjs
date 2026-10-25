// Registered by the existing data-driven guided lesson suite.
const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');

module.exports = function registerExperienceChecks() {
    test.describe('Lesson reading experience', () => {
        test('same-frame reading position survives math reflow after hide and reopen', async ({page}) => {
            await page.setViewportSize({width: 1100, height: 650});
            await h.useLanguage(page, 'en');
            await page.goto('/bezeg-2.0/analysis/taylor?learn=1');
            const panel = h.lessonPanel(page);
            await expect(panel).toBeVisible();
            await h.advanceToStep(page, 2);
            await h.advance(page); // worked calculation with display mathematics
            const settleMath = () => page.evaluate(async () => {
                await window.MathJax.startup.promise;
                await window.MathJax.typesetPromise();
            });
            await settleMath();
            const reading = panel.locator('.guided-lesson-reading');
            await reading.evaluate(el => { el.scrollTop = el.scrollHeight; });
            const before = await reading.evaluate(el => el.scrollTop);
            expect(before, 'the production prose really scrolls').toBeGreaterThan(0);
            const progress = await h.progress(page);
            await panel.getByRole('button', {name: 'Observe on the graph', exact: true}).click();
            await h.reopenButton(page).click();
            await settleMath();
            expect(await h.progress(page)).toBe(progress);
            expect(await reading.evaluate(el => el.scrollTop)).toBeCloseTo(before, 0);
        });
        for (const language of ['sl', 'en']) {
            for (const view of [
                {name: 'desktop', width: 1440, height: 1000},
                {name: 'projection', width: 1920, height: 1080, presenting: true},
                {name: 'narrow', width: 390, height: 844, document: true},
                {name: 'landscape', width: 844, height: 390, document: true},
                {name: 'enlarged', width: 390, height: 844, document: true, enlarged: true},
            ]) {
                test(`${language} ${view.name}: persistent actions, scroll ownership, and safe exit`, async ({page}, testInfo) => {
                    await page.setViewportSize({width: view.width, height: view.height});
                    await h.useLanguage(page, language);
                    await page.goto('/bezeg-2.0/analysis/taylor?learn=1&source=reading#preserved');
                    const panel = h.lessonPanel(page);
                    await expect(panel).toBeVisible();
                    await page.waitForFunction(() => !!window.MathJax?.typesetPromise);
                    await page.evaluate(async () => {
                        await window.MathJax.startup.promise;
                        await window.MathJax.typesetPromise();
                    });
                    if (view.enlarged) await page.addStyleTag({content: 'html {font-size:200% !important}'});
                    if (view.presenting) await page.getByRole('button', {name: language === 'en' ? 'Presentation mode' : 'Predstavitveni način', exact: true}).click();
                    const reading = panel.locator('.guided-lesson-reading');
                    await expect(h.backButton(page)).toBeDisabled();
                    expect(await panel.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(251, 252, 245)');
                    expect(await reading.evaluate(el => getComputedStyle(el).overflowY)).toBe(view.document ? 'visible' : 'auto');
                    const progress = await h.progress(page);
                    const originalUrl = page.url();
                    const boardId = await page.locator('#jgbox').evaluate(el => Object.values(window.JXG.boards).find(b => b.containerObj === el).id);
                    const hide = panel.getByRole('button', {name: language === 'en' ? 'Hide lesson instructions' : 'Skrij navodila učne poti', exact: true});
                    const exit = panel.getByRole('button', {name: language === 'en' ? 'Exit lesson' : 'Končaj učno pot', exact: true});
                    for (const [position, fraction] of [['top', 0], ['middle', .5], ['bottom', 1]]) {
                        if (view.document) await panel.evaluate((el, f) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + (el.clientHeight - window.innerHeight) * f), fraction);
                        else await reading.evaluate((el, f) => { el.scrollTop = (el.scrollHeight - el.clientHeight) * f; }, fraction);
                        for (const control of [hide, exit, h.nextButton(page)]) {
                            await expect(control).toBeVisible();
                            const box = await control.boundingBox();
                            expect(box.width).toBeGreaterThanOrEqual(44);
                            expect(box.height).toBeGreaterThanOrEqual(44);
                            expect(box.y).toBeGreaterThanOrEqual(0);
                            expect(box.y + box.height).toBeLessThanOrEqual(view.height + 1);
                            expect(await control.evaluate(el => {
                                const r = el.getBoundingClientRect();
                                return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
                            }), `${position}: action is pointer reachable`).toBe(true);
                        }
                        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
                        await testInfo.attach(`${language}-${view.name}-${position}`, {body: await page.screenshot(), contentType: 'image/png'});
                    }
                    await exit.click();
                    const dialog = page.getByRole('dialog');
                    await expect(dialog).toBeVisible();
                    const safe = dialog.getByRole('button', {name: language === 'en' ? 'Continue lesson' : 'Nadaljuj učno pot', exact: true});
                    await expect(safe).toBeFocused();
                    await page.keyboard.press('Shift+Tab');
                    await expect(dialog.getByRole('button').last()).toBeFocused();
                    await page.keyboard.press('Tab');
                    await expect(safe).toBeFocused();
                    await page.keyboard.press('Escape');
                    await expect(dialog).toBeHidden();
                    await expect(exit).toBeFocused();
                    expect(page.url()).toBe(originalUrl);
                    expect(await h.progress(page)).toBe(progress);
                    expect(await page.locator('#jgbox').evaluate(el => Object.values(window.JXG.boards).find(b => b.containerObj === el).id)).toBe(boardId);
                    await h.nextButton(page).click();
                    await expect(panel.locator('h3')).toBeInViewport();
                    if (!view.document) expect(await reading.evaluate(el => el.scrollTop)).toBe(0);
                });
            }
        }
    });
};
