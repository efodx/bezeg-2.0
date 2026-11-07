// Registered by the existing data-driven guided lesson suite.
const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');

async function lessonScrollPort(panel) {
    const owner = await panel.evaluate(section => {
        const candidates = [['section', section], ['reading', section.querySelector('.guided-lesson-reading')]];
        return candidates.find(([, element]) => {
            const overflow = getComputedStyle(element).overflowY;
            return (overflow === 'auto' || overflow === 'scroll') && element.scrollHeight > element.clientHeight + 1;
        })?.[0] || null;
    });
    if (!owner) return null;
    return owner === 'section' ? panel : panel.locator('.guided-lesson-reading');
}

module.exports = function registerExperienceChecks() {
    test.describe('Lesson reading experience', () => {
        for (const language of ['sl', 'en']) {
            test(`${language}: toolbar stays put after clipped-pointer Next activation`, async ({page}) => {
                await page.setViewportSize({width: 390, height: 844});
                await h.useLanguage(page, language);
                await page.goto('/bezeg-2.0/analysis/taylor?learn=1&source=reading#preserved');
                const panel = h.lessonPanel(page);
                await expect(panel).toBeVisible();
                await page.waitForFunction(() => !!window.MathJax?.typesetPromise);
                await page.evaluate(async () => {
                    await window.MathJax.startup.promise;
                    await window.MathJax.typesetPromise();
                });
                await page.addStyleTag({content: 'html {font-size:200% !important} body {font-family:Verdana, system-ui !important}'});
                const next = h.nextButton(page);
                await next.scrollIntoViewIfNeeded();
                await h.settle(page);

                // A fractional available height can clip the row while leaving its center clickable.
                // Set that height explicitly so the edge case is independent of installed font metrics.
                const clipping = await panel.evaluate(element => {
                    const button = element.querySelector('.guided-lesson-nav-next');
                    const height = button.getBoundingClientRect().bottom - element.getBoundingClientRect().top - 0.5;
                    element.style.setProperty('max-height', `${height}px`, 'important');
                    const box = button.getBoundingClientRect();
                    const x = box.left + box.width / 2;
                    const y = box.top + box.height / 2;
                    const hit = document.elementFromPoint(x, y);
                    return {
                        panel: element.getBoundingClientRect().toJSON(),
                        button: box.toJSON(), x, y,
                        pageY: window.scrollY,
                        outerScrollTop: element.scrollTop,
                        centerInsideViewport: x >= 0 && x < window.innerWidth && y >= 0 && y < window.innerHeight,
                        centerInsidePanel: x >= element.getBoundingClientRect().left && x <= element.getBoundingClientRect().right
                            && y >= element.getBoundingClientRect().top && y <= element.getBoundingClientRect().bottom,
                        centerHitsNext: hit === button || button.contains(hit),
                    };
                });
                expect(clipping.centerInsideViewport).toBe(true);
                expect(clipping.centerInsidePanel).toBe(true);
                expect(clipping.button.bottom - clipping.panel.bottom, 'the Next button is fractionally clipped').toBeGreaterThan(0);
                expect(clipping.button.bottom - clipping.panel.bottom).toBeLessThan(1);
                expect(clipping.centerHitsNext, 'the visible center still targets the Next button').toBe(true);

                const snapshot = async () => ({
                    positions: await Promise.all([h.backButton(page), next].map(async button => {
                        const box = await button.boundingBox();
                        return Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, box[key]]));
                    })),
                    pageY: await page.evaluate(() => window.scrollY),
                    outerScrollTop: await panel.evaluate(element => element.scrollTop),
                });
                const before = await snapshot();
                const progressBefore = await h.progress(page);
                await page.mouse.click(clipping.x, clipping.y);
                await h.settle(page);
                expect(await h.progress(page), 'the pointer advances to the next frame').not.toBe(progressBefore);
                expect(await snapshot(), 'pointer navigation preserves the visible toolbar and scroll positions').toEqual(before);
            });
        }

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
            const scrollPort = await lessonScrollPort(panel);
            await scrollPort.evaluate(el => { el.scrollTop = el.scrollHeight; });
            const before = await scrollPort.evaluate(el => el.scrollTop);
            expect(before, 'the production prose really scrolls').toBeGreaterThan(0);
            const progress = await h.progress(page);
            await h.hideButton(page).click();
            await h.reopenButton(page).click();
            await settleMath();
            expect(await h.progress(page)).toBe(progress);
            expect(await scrollPort.evaluate(el => el.scrollTop)).toBeCloseTo(before, 0);
        });
        test('at 390 px the collapsed lesson tab leaves the top of the board free', async ({page}) => {
            await page.setViewportSize({width: 390, height: 844});
            await h.useLanguage(page, 'en');
            await page.goto('/bezeg-2.0/bezier/reduction?learn=1', {waitUntil: 'domcontentloaded'});
            const panel = h.lessonPanel(page);
            await expect(panel).toBeVisible();
            for (let frame = 0; frame < 8 && await h.observationFrame(page).count() === 0; frame += 1) await h.nextButton(page).click();
            await expect(h.observationFrame(page)).toBeVisible();
            await h.hideButton(page).click();
            await expect(h.reopenButton(page)).toBeVisible();
            // Board captions start at its top left corner, right where the tab sits.
            const tab = await h.reopenButton(page).boundingBox();
            const board = await page.locator('#jgbox').boundingBox();
            expect(board.y, 'the board starts below the tab').toBeGreaterThanOrEqual(tab.y + tab.height);
        });
        for (const language of ['sl', 'en']) {
            test(`${language}: navigation keeps one position from explanation through observation and completion`, async ({page}) => {
                await page.setViewportSize({width: 1100, height: 700});
                await h.useLanguage(page, language);
                await page.goto('/bezeg-2.0/analysis/taylor?learn=1');
                const panel = h.lessonPanel(page);
                await expect(panel).toBeVisible();
                const names = language === 'en'
                    ? {back: 'Back: previous frame', next: 'Next: next frame', finish: 'Finish example'}
                    : {back: 'Nazaj: prejšnji okvir', next: 'Naprej: naslednji okvir', finish: 'Končaj in raziskuj graf'};
                await expect(h.backButton(page)).toHaveAccessibleName(names.back);
                await expect(h.nextButton(page)).toHaveAccessibleName(names.next);
                await expect(h.hideButton(page)).toBeVisible();
                await expect(panel.getByRole('button', {name: /Observe on the graph|Opazuj na grafu/})).toHaveCount(0);

                const navigationBox = async () => Promise.all([h.backButton(page), h.nextButton(page)].map(async button => {
                    const box = await button.boundingBox();
                    return box && Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Math.round(box[key])]));
                }));
                const panelBeforeDrag = await panel.boundingBox();
                const grip = panel.locator('.guided-lesson-grip');
                const gripBox = await grip.boundingBox();
                await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
                await page.mouse.down();
                await page.mouse.move(gripBox.x + gripBox.width / 2 + 32, gripBox.y + gripBox.height / 2 + 24, {steps: 4});
                await page.mouse.up();
                const panelAfterDrag = await panel.boundingBox();
                expect(panelAfterDrag.x).not.toBe(panelBeforeDrag.x);
                expect(panelAfterDrag.y).not.toBe(panelBeforeDrag.y);
                const initial = await navigationBox();
                // Advance across Taylor's explanation, observation and calculation frames; disclosure expansion must
                // not move the single toolbar away from its reading position.
                let completionSeen = false;
                let disclosureSeen = false;
                // Keep a bounded walk and require the explicit completion state.
                for (let frame = 0; frame < 32; frame += 1) {
                    if (await h.isFinishing(page)) {
                        await expect(h.nextButton(page)).toHaveAccessibleName(names.finish);
                        expect(await navigationBox(), 'completion label reserves the same navigation footprint').toEqual(initial);
                        completionSeen = true;
                        break;
                    }
                    const disclosures = panel.locator('.guided-lesson-reading details');
                    const disclosureCount = await disclosures.count();
                    if (disclosureCount) disclosureSeen = true;
                    for (const disclosure of await disclosures.all()) await disclosure.locator('summary').click();
                    if (disclosureCount) expect(await navigationBox(), `toolbar position after disclosure expansion at frame ${frame + 1}`).toEqual(initial);
                    await h.nextButton(page).click();
                    await h.settle(page);
                    expect(await navigationBox(), `toolbar position after frame ${frame + 2}`).toEqual(initial);
                }
                expect(completionSeen, 'the walk reaches the explicit completion action').toBe(true);
                expect(disclosureSeen, 'the lesson exposes an expected-observation disclosure').toBe(true);
            });
        }
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
                    await expect(h.backButton(page)).toHaveAccessibleName(language === 'en' ? 'Back: previous frame' : 'Nazaj: prejšnji okvir');
                    await expect(h.nextButton(page)).toHaveAccessibleName(language === 'en' ? 'Next: next frame' : 'Naprej: naslednji okvir');
                    const toolbarPosition = async () => Promise.all([h.backButton(page), h.nextButton(page)].map(async button => {
                        const box = await button.boundingBox();
                        return Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Math.round(box[key])]));
                    }));
                    await h.nextButton(page).scrollIntoViewIfNeeded();
                    await h.settle(page);
                    const firstToolbarPosition = await toolbarPosition();
                    await h.nextButton(page).click();
                    await h.settle(page);
                    expect(await toolbarPosition(), 'toolbar position after a frame change at this viewport').toEqual(firstToolbarPosition);
                    await h.backButton(page).click();
                    await h.settle(page);
                    expect(await toolbarPosition(), 'toolbar position after returning to the first frame').toEqual(firstToolbarPosition);
                    // The stability check above covers a visible toolbar in a partly scrolled panel. Now bring the
                    // whole card into view, below Presentation's sticky heading, before checking each action.
                    await panel.evaluate(el => el.scrollIntoView({block: 'center'}));
                    await h.settle(page);
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
                    const scrollPort = await lessonScrollPort(panel);
                    const scrollRange = scrollPort ? await scrollPort.evaluate(el => el.scrollHeight - el.clientHeight) : 0;
                    const scrollRequired = view.height <= 500 || view.enlarged;
                    if (scrollRequired) expect(scrollRange, 'short or enlarged lesson content has a real scroll range').toBeGreaterThan(1);
                    if (scrollRange <= 1) {
                        const fits = await panel.locator('.guided-lesson-reading').evaluate(el => el.scrollHeight <= el.clientHeight + 1);
                        expect(fits, 'lesson content fits when the viewport does not require scrolling').toBe(true);
                    }
                    const progress = await h.progress(page);
                    const originalUrl = page.url();
                    const boardId = await page.locator('#jgbox').evaluate(el => Object.values(window.JXG.boards).find(b => b.containerObj === el).id);
                    const hide = h.hideButton(page);
                    const exit = panel.getByRole('button', {name: language === 'en' ? 'Exit example' : 'Končaj vodeni primer', exact: true});
                    for (const [position, fraction] of (scrollRange > 1 ? [['top', 0], ['middle', .5], ['bottom', 1]] : [['top', 0]])) {
                        if (scrollPort) await scrollPort.evaluate((el, f) => { el.scrollTop = (el.scrollHeight - el.clientHeight) * f; }, fraction);
                        const scrollTop = scrollPort ? await scrollPort.evaluate(el => el.scrollTop) : 0;
                        if (scrollRange > 1) expect(Math.round(scrollTop), `${position}: the chosen scroll owner moves to its requested rounded offset`).toBe(Math.round(scrollRange * fraction));
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
                        const toolbarBeforeHide = await toolbarPosition();
                        await hide.click();
                        await expect(panel).toHaveCount(0);
                        await h.reopenButton(page).click();
                        await expect(panel).toBeVisible();
                        if (scrollPort) expect(await scrollPort.evaluate(el => el.scrollTop), `${position}: same-frame scroll position survives hide and reopen`).toBe(scrollTop);
                        expect(await toolbarPosition(), `${position}: navigation stays anchored after hide and reopen`).toEqual(toolbarBeforeHide);
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
                    const beforeFrameChange = await toolbarPosition();
                    const outerBeforeFrameChange = await panel.evaluate(el => el.scrollTop);
                    const readingScrollsWithOuter = await panel.locator('.guided-lesson-reading').evaluate(el => getComputedStyle(el).overflowY === 'visible');
                    await h.nextButton(page).click();
                    await h.settle(page);
                    await expect(panel.locator('h3')).toBeInViewport();
                    expect(await panel.locator('.guided-lesson-reading').evaluate(el => el.scrollTop), 'a new frame starts at the reading top').toBe(0);
                    expect(await panel.evaluate(el => el.scrollTop), 'only the outer reading scroll resets; enlarged control placement stays').toBe(readingScrollsWithOuter ? 0 : outerBeforeFrameChange);
                    expect(await toolbarPosition(), 'the toolbar stays anchored when the next frame starts').toEqual(beforeFrameChange);
                });
            }
        }
    });
};
