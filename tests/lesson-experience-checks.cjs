// Registered by the existing data-driven guided lesson suite.
const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');

module.exports = function registerExperienceChecks() {
    test.describe('Lesson reading experience', () => {
        test('same-frame reading position survives math reflow after hide and reopen', async ({page}) => {
            // The lean panel fits this observation prose on a short desktop; 200% page zoom, as when projecting,
            // gives it a real scroll range.
            await page.setViewportSize({width: 1100, height: 540});
            await h.useLanguage(page, 'en');
            await page.goto('/bezeg-2.0/analysis/taylor?learn=1');
            await page.addStyleTag({content: 'html {zoom: 2}'});
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
            expect(await reading.locator('mjx-container').count(), 'the same-frame reading contains rendered mathematics').toBeGreaterThan(0);
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
                {name: 'narrow', width: 390, height: 844},
                {name: 'landscape', width: 844, height: 390},
                {name: 'enlarged', width: 390, height: 844, enlarged: true},
                {name: 'small-enlarged', width: 320, height: 844, enlarged: true},
                {name: 'small-enlarged-wide-font', width: 320, height: 844, enlarged: true, fontFamily: 'Verdana, system-ui'},
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
                    // Exercise wider font metrics without depending on the host's default UI font.
                    if (view.fontFamily) await page.addStyleTag({content: `body {font-family:${view.fontFamily} !important}`});
                    if (view.presenting) await page.getByRole('button', {name: language === 'en' ? 'Presentation mode' : 'Predstavitveni način', exact: true}).click();
                    const reading = panel.locator('.guided-lesson-reading');
                    if (view.width === 320) {
                        const degreeControls = page.locator('.workspace-inspector .count-setter-controls');
                        expect(await degreeControls.evaluate(el => el.scrollWidth <= el.parentElement.clientWidth + 1), 'degree stepper fits its inspector row even with enlarged text').toBe(true);
                        for (const control of await degreeControls.locator('button, input').all()) {
                            const box = await control.boundingBox();
                            expect(box.width).toBeGreaterThanOrEqual(44);
                            expect(box.height).toBeGreaterThanOrEqual(44);
                        }
                        for (const tab of await page.locator('.workspace-inspector .inspector-tabs button').all()) {
                            const box = await tab.boundingBox();
                            expect(box.width).toBeGreaterThanOrEqual(44);
                            expect(box.height).toBeGreaterThanOrEqual(44);
                            expect(await tab.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'inspector tab labels remain readable within their targets').toBe(true);
                        }
                    }
                    await expect(h.backButton(page)).toBeDisabled();
                    const panelBackground = await panel.evaluate(el => {
                        const token = getComputedStyle(document.documentElement).getPropertyValue('--bezeg-shell-panel').trim();
                        const probe = document.createElement('span');
                        probe.style.backgroundColor = 'var(--bezeg-shell-panel)';
                        document.body.appendChild(probe);
                        const tokenBackground = getComputedStyle(probe).backgroundColor;
                        probe.remove();
                        return {token, tokenBackground, panelBackground: getComputedStyle(el).backgroundColor};
                    });
                    expect(panelBackground.token, 'the approved shell panel role is defined').not.toBe('');
                    expect(panelBackground.tokenBackground, 'the approved shell panel role is opaque').toMatch(/^rgb\(/);
                    expect(panelBackground.panelBackground).toBe(panelBackground.tokenBackground);
                    expect(await reading.evaluate(el => getComputedStyle(el).overflowY)).toBe('auto');
                    const progress = await h.progress(page);
                    const originalUrl = page.url();
                    const boardId = await page.locator('#jgbox').evaluate(el => Object.values(window.JXG.boards).find(b => b.containerObj === el).id);
                    const hide = panel.getByRole('button', {name: language === 'en' ? 'Hide example instructions' : 'Skrij navodila vodenega primera', exact: true});
                    const exit = panel.getByRole('button', {name: language === 'en' ? 'Exit example' : 'Končaj vodeni primer', exact: true});
                    for (const [position, fraction] of [['top', 0], ['middle', .5], ['bottom', 1]]) {
                        await reading.evaluate((el, f) => { el.scrollTop = (el.scrollHeight - el.clientHeight) * f; }, fraction);
                        for (const control of [hide, exit, h.nextButton(page)]) {
                            await expect(control).toBeVisible();
                            const box = await control.boundingBox();
                            expect(box.width).toBeGreaterThanOrEqual(44);
                            expect(box.height).toBeGreaterThanOrEqual(44);
                            expect(await control.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'action text fits its button').toBe(true);
                            expect(box.y).toBeGreaterThanOrEqual(0);
                            expect(box.y + box.height).toBeLessThanOrEqual(view.height + 1);
                            expect(await control.evaluate(el => {
                                const r = el.getBoundingClientRect();
                                return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
                            }), `${position}: action is pointer reachable`).toBe(true);
                        }
                        const overflow = await page.evaluate(() => {
                            const documentOverflow = document.documentElement.scrollWidth > innerWidth + 1;
                            const offenders = documentOverflow ? [...document.querySelectorAll('body *')].filter(element => {
                                const rect = element.getBoundingClientRect();
                                return rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1 || element.scrollWidth > element.clientWidth + 1);
                            }).slice(0, 12).map(element => {
                                const rect = element.getBoundingClientRect();
                                return {
                                    selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${typeof element.className === 'string' && element.className ? `.${element.className.trim().replace(/\s+/g, '.')}` : ''}`,
                                    text: element.textContent.trim().slice(0, 80),
                                    left: Math.round(rect.left), right: Math.round(rect.right),
                                    clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
                                };
                            }) : [];
                            return {documentOverflow, documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, offenders};
                        });
                        expect(overflow.documentOverflow, `document horizontal overflow: ${JSON.stringify(overflow)}`).toBe(false);
                        if (view.width === 320) {
                            const headingOverlap = await page.locator('.workspace-inspector .inspector-heading').evaluate(el => {
                                const title = el.querySelector(':scope > div').getBoundingClientRect();
                                const button = el.querySelector(':scope > button').getBoundingClientRect();
                                return {overlap: title.right > button.left + 1 && title.bottom > button.top + 1 && button.bottom > title.top + 1,
                                    title: {left: title.left, right: title.right, top: title.top, bottom: title.bottom},
                                    button: {left: button.left, right: button.right, top: button.top, bottom: button.bottom}};
                            });
                            expect(headingOverlap.overlap, `inspector title and collapse action overlap: ${JSON.stringify({headingOverlap, overflow})}`).toBe(false);
                        }
                        await testInfo.attach(`${language}-${view.name}-${position}`, {body: await page.screenshot(), contentType: 'image/png'});
                    }
                    await exit.click();
                    const dialog = page.getByRole('dialog');
                    await expect(dialog).toBeVisible();
                    const safe = dialog.getByRole('button', {name: language === 'en' ? 'Continue example' : 'Nadaljuj vodeni primer', exact: true});
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
                    expect(await reading.evaluate(el => el.scrollTop)).toBe(0);
                });
            }
        }
    });
};
