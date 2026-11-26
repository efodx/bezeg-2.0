// Registered by the existing data-driven guided lesson suite.
const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');

function navigationPosition(panel) {
    return panel.locator('.guided-lesson-navigation button').evaluateAll(buttons => buttons.map(button => {
        const {x, y, width, height} = button.getBoundingClientRect();
        return {x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height)};
    }));
}

async function lessonScrollPort(panel) {
    const owner = await panel.evaluate(section => {
        const candidates = [['section', section], ['reading', section.querySelector('.guided-lesson-reading')], ['card', section.closest('[data-card-body]')]];
        return candidates.find(([, element]) => {
            if (!element) return false;
            const overflow = getComputedStyle(element).overflowY;
            return (overflow === 'auto' || overflow === 'scroll') && element.scrollHeight > element.clientHeight + 1;
        })?.[0] || null;
    });
    if (!owner) return null;
    if (owner === 'card') return panel.locator('xpath=ancestor::*[@data-card-body][1]');
    return owner === 'section' ? panel : panel.locator('.guided-lesson-reading');
}

module.exports = function registerExperienceChecks() {
    test.describe('Lesson reading experience', () => {
        for (const language of ['sl', 'en']) {
            test(`${language}: Back and Next stay under the pointer after pointer Next activations on a phone`, async ({page}) => {
                test.skip(true, 'phone workspace is redesigned by task 09 (docs/tasks/ux-picks-app-wide/09-phone-presenter.md)');
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
                await h.settle(page);

                // In one column Back and Next are the card's last row and rest on the bottom edge of the window while
                // the card reaches below it. A press there leaves the row under the pointer and the page where it
                // is, so the same tap advances again. (A frame that ends inside the window takes the row up with
                // the card's end, and a press deep in the text returns the page to the graph: the phone test in
                // lesson-graph-access.smoke.spec.cjs covers that.)
                const resting = () => panel.evaluate(element => {
                    const row = element.querySelector('.guided-lesson-navigation').getBoundingClientRect();
                    const button = element.querySelector('.guided-lesson-nav-next');
                    const box = button.getBoundingClientRect();
                    const x = box.left + box.width / 2;
                    const y = box.top + box.height / 2;
                    return {
                        x, y,
                        rowBelowWindowBottom: row.bottom - window.innerHeight,
                        cardBelowWindowBottom: element.getBoundingClientRect().bottom - window.innerHeight,
                        readingTop: element.querySelector('.guided-lesson-reading').getBoundingClientRect().top,
                        centerHitsNext: button.contains(document.elementFromPoint(x, y)),
                    };
                });
                const snapshot = async () => ({
                    positions: await Promise.all([h.backButton(page), next].map(async button => {
                        const box = await button.boundingBox();
                        return Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, box[key]]));
                    })),
                    pageY: await page.evaluate(() => window.scrollY),
                });

                // Enlarging the text after the page has loaded pushes the card down the page. Read from a little past
                // the graph's top edge, so that a press which realigned the page to the graph would show as a move.
                await page.locator('.guided-lesson-layer').evaluate(layer => scrollTo(0, layer.getBoundingClientRect().top + scrollY + 60));
                const first = await resting();
                expect(first.cardBelowWindowBottom, 'the enlarged card reaches below the window').toBeGreaterThan(0);
                expect(Math.abs(first.rowBelowWindowBottom), 'the row rests on the bottom edge of the window').toBeLessThanOrEqual(1);
                expect(first.readingTop, 'the start of the text is in the window').toBeGreaterThanOrEqual(0);
                expect(first.centerHitsNext, 'the centre of Next is a pointer target').toBe(true);
                const before = await snapshot();
                expect(before.pageY, 'the page is scrolled past the top of the graph').toBeGreaterThan(0);
                // The first tap enters a reading frame (frame 2 is a calculation); the repeated tap enters frame 3, an
                // observation frame, whose task is worked with the graph: there the page comes to the graph, with the
                // start of the task in view (GuidedLesson.tsx, the observation alignment of c2ac1463).
                for (const press of ['first', 'repeated']) {
                    const progressBefore = await h.progress(page);
                    await page.mouse.click(first.x, first.y);
                    await h.settle(page);
                    expect(await h.progress(page), `${press} tap: the pointer advances to the next frame`).not.toBe(progressBefore);
                    expect((await resting()).cardBelowWindowBottom, `${press} tap: the new frame's card still reaches below the window`).toBeGreaterThan(0);
                    const task = await panel.evaluate(element => element.classList.contains('guided-lesson-task'));
                    expect(task, `${press} tap: the frame kind this check expects`).toBe(press === 'repeated');
                    if (!task) {
                        expect(await snapshot(), `${press} tap at the same point moves neither the row nor the page`).toEqual(before);
                        continue;
                    }
                    const view = await panel.evaluate(element => ({
                        layerTop: document.querySelector('.guided-lesson-layer').getBoundingClientRect().top,
                        promptTop: element.querySelector('.guided-lesson-exploration').getBoundingClientRect().top,
                    }));
                    expect(Math.abs(view.layerTop), `${press} tap: an observation frame brings the page to the graph`).toBeLessThanOrEqual(1);
                    expect(view.promptTop, `${press} tap: the start of the task is in the window`).toBeGreaterThanOrEqual(0);
                    expect(view.promptTop, `${press} tap: the start of the task is in the window`).toBeLessThan(844);
                }
            });
        }

        test('same-frame reading position survives math reflow after hide and reopen', async ({page}) => {
            // A short board, as 200% zoom leaves when projecting: the lesson card is cut there and its reading scrolls. (A CSS
            // `zoom` on html is no stand-in: the card is measured in zoomed pixels and the board in CSS pixels.)
            await page.setViewportSize({width: 1100, height: 380});
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
            expect(await reading.locator('mjx-container').count(), 'the same-frame reading contains rendered mathematics').toBeGreaterThan(0);
            // On this short board the lesson card is cut (its "Več" bar shows) and the reading scroller is its one scroll port.
            const scrollPort = page.locator('#board-card-lesson [data-card-scroll]');
            await expect(page.locator('#board-card-lesson .board-card-more'), 'the card is cut on this short board').toBeVisible();
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
            test.skip(true, 'phone workspace is redesigned by task 09 (docs/tasks/ux-picks-app-wide/09-phone-presenter.md)');
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
                await page.setViewportSize({width: 1100, height: 1000});
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

                const navigationBox = () => navigationPosition(panel);
                const card = page.locator('#board-card-lesson');
                const panelBeforeDrag = await card.boundingBox();
                const gripBox = await card.locator('.board-card-title').boundingBox();
                const gx = gripBox.x + gripBox.width / 2;
                const gy = gripBox.y + gripBox.height / 2;
                await page.mouse.move(gx, gy);
                await page.mouse.down();
                // Drop with the card's centre at the board centre: the middle half of the board is a free placement, so the top really moves.
                const boardBox = await page.locator('#jgbox').boundingBox();
                const dx = boardBox.x + boardBox.width / 2 - (panelBeforeDrag.x + panelBeforeDrag.width / 2);
                const dy = boardBox.y + boardBox.height / 2 - (panelBeforeDrag.y + panelBeforeDrag.height / 2);
                await page.mouse.move(gx + dx / 2, gy + dy / 2, {steps: 6});
                await page.mouse.move(gx + dx, gy + dy, {steps: 8});
                await page.mouse.up();
                await page.waitForTimeout(600);
                const panelAfterDrag = await card.boundingBox();
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
                    test.skip(view.width <= 700 || view.height <= 400, 'phone workspace is redesigned by task 09 (docs/tasks/ux-picks-app-wide/09-phone-presenter.md)');
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
                    const toolbarPosition = () => navigationPosition(panel);
                    await h.nextButton(page).scrollIntoViewIfNeeded();
                    await h.settle(page);
                    // Let the resize and scroll observers apply the final panel height before taking the reference.
                    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
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
                        return {token, tokenBackground, panelBackground: getComputedStyle(el.closest('.board-card')).backgroundColor};
                    });
                    expect(panelBackground.token, 'the approved shell panel role is defined').not.toBe('');
                    expect(panelBackground.tokenBackground, 'the approved shell panel role is opaque').toMatch(/^rgb\(/);
                    expect(panelBackground.panelBackground).toBe(panelBackground.tokenBackground);
                    // One-column screens (700 px and narrower) scroll the page, not the card (ADR 0061): the card is as long
                    // as its text, nothing of it pins to the top of the window, and Back and Next are its last row, resting on
                    // the window's bottom edge. Two-column views keep the card's own scroll.
                    const pageScroll = view.width <= 700;
                    let cardTaller = false;
                    if (pageScroll) {
                        const contract = await panel.evaluate(el => ({
                            panelOverflowY: getComputedStyle(el).overflowY,
                            panelMaxHeight: getComputedStyle(el).maxHeight,
                            readingScrolls: el.querySelector('.guided-lesson-reading').scrollHeight > el.querySelector('.guided-lesson-reading').clientHeight + 1,
                            controlsPosition: getComputedStyle(el.querySelector('.guided-lesson-controls')).position,
                            lastRow: [el.lastElementChild.className, getComputedStyle(el.lastElementChild).position, getComputedStyle(el.lastElementChild).bottom],
                            height: el.getBoundingClientRect().height,
                            windowHeight: innerHeight,
                        }));
                        expect(contract, 'at 700 px and narrower the card is as long as its text and the page scrolls').toMatchObject({panelOverflowY: 'visible', panelMaxHeight: 'none', readingScrolls: false});
                        expect(contract.controlsPosition, 'the heading scrolls with the page').toBe('static');
                        expect(contract.lastRow, 'Back and Next are the last row and rest on the bottom of the window').toEqual(['guided-lesson-navigation', 'sticky', '0px']);
                        cardTaller = contract.height > contract.windowHeight;
                        if (view.enlarged) expect(cardTaller, 'enlarged lesson text makes the card taller than the window').toBe(true);
                    }
                    const scrollPort = pageScroll ? null : await lessonScrollPort(panel);
                    const scrollRange = scrollPort ? await scrollPort.evaluate(el => el.scrollHeight - el.clientHeight) : 0;
                    const scrollRequired = !pageScroll && (view.height <= 500 || view.enlarged);
                    if (scrollRequired) expect(scrollRange, 'short or enlarged lesson content has a real scroll range').toBeGreaterThan(1);
                    if (scrollRange <= 1 && !pageScroll) {
                        const fits = await panel.locator('.guided-lesson-reading').evaluate(el => el.scrollHeight <= el.clientHeight + 1);
                        expect(fits, 'lesson content fits when the viewport does not require scrolling').toBe(true);
                    }
                    const progress = await h.progress(page);
                    const originalUrl = page.url();
                    const boardId = await page.locator('#jgbox').evaluate(el => Object.values(window.JXG.boards).find(b => b.containerObj === el).id);
                    const hide = h.hideButton(page);
                    const exit = panel.getByRole('button', {name: language === 'en' ? 'Exit example' : 'Končaj vodeni primer', exact: true});
                    for (const [position, fraction] of (scrollRange > 1 || cardTaller ? [['top', 0], ['middle', .5], ['bottom', 1]] : [['top', 0]])) {
                        // Page scroll: put the card's top, middle and bottom part in the window.
                        if (pageScroll) await panel.evaluate((el, f) => {
                            const rect = el.getBoundingClientRect();
                            scrollTo(0, rect.top + scrollY + Math.max(0, rect.height - innerHeight) * f);
                        }, fraction);
                        const scrollY = pageScroll ? await page.evaluate(() => scrollY) : 0;
                        if (scrollPort) await scrollPort.evaluate((el, f) => { el.scrollTop = (el.scrollHeight - el.clientHeight) * f; }, fraction);
                        const scrollTop = scrollPort ? await scrollPort.evaluate(el => el.scrollTop) : 0;
                        if (scrollRange > 1) expect(Math.round(scrollTop), `${position}: the chosen scroll owner moves to its requested rounded offset`).toBe(Math.round(scrollRange * fraction));
                        // On one-column screens Hide and Exit belong to the heading at the card's top; only Back and Next
                        // stay in reach while the text is read further down.
                        const headingScrolledAway = pageScroll && position !== 'top';
                        for (const control of headingScrolledAway ? [h.nextButton(page)] : [hide, exit, h.nextButton(page)]) {
                            await expect(control).toBeVisible();
                            const box = await control.boundingBox();
                            // Card-head buttons (Hide) are 28 px with a fine pointer and 44 px on touch (task 11 board cards, CardShell.css); other actions keep 44.
                            const fine = await page.evaluate(() => !matchMedia('(pointer: coarse)').matches);
                            const minimum = control === hide && fine ? 28 : 44;
                            expect(box.width).toBeGreaterThanOrEqual(minimum);
                            expect(box.height).toBeGreaterThanOrEqual(minimum);
                            expect(await control.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'action text fits its button').toBe(true);
                            expect(box.y).toBeGreaterThanOrEqual(0);
                            expect(box.y + box.height).toBeLessThanOrEqual(view.height + 1);
                            expect(await control.evaluate(el => {
                                const r = el.getBoundingClientRect();
                                return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
                            }), `${position}: action is pointer reachable`).toBe(true);
                        }
                        // The hide and reopen round trip starts from Hide, so there it is checked at the card's top.
                        if (headingScrolledAway) continue;
                        const toolbarBeforeHide = await toolbarPosition();
                        await hide.click();
                        await expect(panel).toBeHidden();
                        await h.reopenButton(page).click();
                        await expect(panel).toBeVisible();
                        if (pageScroll) expect(await page.evaluate(() => window.scrollY), `${position}: same-frame page scroll position survives hide and reopen`).toBe(scrollY);
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
                    // The page keeps its scroll across frames and each frame has its own height, so on one-column views compare
                    // the navigation with the card's top at the top of the window both times.
                    const cardToTop = () => pageScroll ? panel.evaluate(el => { scrollTo(0, el.getBoundingClientRect().top + scrollY); }) : null;
                    await cardToTop();
                    const beforeFrameChange = await toolbarPosition();
                    const outerBeforeFrameChange = await panel.evaluate(el => el.scrollTop);
                    const readingScrollsWithOuter = await panel.locator('.guided-lesson-reading').evaluate(el => getComputedStyle(el).overflowY === 'visible');
                    await h.nextButton(page).click();
                    await h.settle(page);
                    await expect(panel.locator('h3')).toBeInViewport();
                    await cardToTop();
                    expect(await panel.locator('.guided-lesson-reading').evaluate(el => el.scrollTop), 'a new frame starts at the reading top').toBe(0);
                    expect(await panel.evaluate(el => el.scrollTop), 'only the outer reading scroll resets; enlarged control placement stays').toBe(readingScrollsWithOuter ? 0 : outerBeforeFrameChange);
                    // In one column the row follows the card's end when a frame is shorter than the window, so there the
                    // check is that Next is still in the window.
                    if (pageScroll) await expect(h.nextButton(page), 'Next stays in the window when the next frame starts').toBeInViewport();
                    else expect(await toolbarPosition(), 'the toolbar stays anchored when the next frame starts').toEqual(beforeFrameChange);
                });
            }
        }
        // Board workspace (task 04): cards float over the board by design, so the old ADR 0061 'never covers the graph' check becomes:
        // the open lesson card stays inside the window and does not overlap the other open cards.
        for (const view of [
            {width: 1440, height: 900}, {width: 1920, height: 1080}, {width: 1024, height: 768},
            {width: 844, height: 390}, {width: 390, height: 844}, {width: 1920, height: 1080, presenting: true},
        ]) {
            test(`the open card stays in the window and clear of other cards at ${view.width}x${view.height}${view.presenting ? ' in Presentation' : ''}`, async ({page}) => {
                test.skip(view.width <= 700 || view.height <= 400, 'phone workspace is redesigned by task 09 (docs/tasks/ux-picks-app-wide/09-phone-presenter.md)');
                await page.setViewportSize({width: view.width, height: view.height});
                await h.useLanguage(page, 'en');
                await page.goto('/bezeg-2.0/analysis/taylor?learn=1&source=reading');
                const panel = h.lessonPanel(page);
                await expect(panel).toBeVisible();
                if (view.presenting) await page.getByRole('button', {name: 'Presentation mode', exact: true}).click();
                await h.settle(page);
                const intersection = () => page.evaluate(() => {
                    const card = document.querySelector('#board-card-lesson').getBoundingClientRect();
                    const box = rect => [rect.left, rect.top, rect.right, rect.bottom].map(Math.round);
                    const others = [...document.querySelectorAll('.board-card')].filter(el => el.id !== 'board-card-lesson')
                        .map(el => el.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0);
                    const overlapsOther = others.some(other => Math.min(card.right, other.right) - Math.max(card.left, other.left) > 1
                        && Math.min(card.bottom, other.bottom) - Math.max(card.top, other.top) > 1);
                    const outside = card.left < -1 || card.top < -1 || card.right > innerWidth + 1 || card.bottom > innerHeight + 1;
                    return {overlaps: overlapsOther || outside, card: box(card), others: others.map(box), window: [innerWidth, innerHeight]};
                });
                const first = await intersection();
                expect(first.overlaps, `first frame: lesson card leaves the window or overlaps another card ${JSON.stringify(first)}`).toBe(false);
                await h.nextButton(page).click();
                await h.settle(page);
                const second = await intersection();
                expect(second.overlaps, `after Next: lesson card leaves the window or overlaps another card ${JSON.stringify(second)}`).toBe(false);
            });
        }
    });
};
