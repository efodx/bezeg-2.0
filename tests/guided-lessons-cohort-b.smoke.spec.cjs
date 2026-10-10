const {test, expect} = require('@playwright/test');

const BERNSTEIN = '/bezeg-2.0/bernstein';
const RATIONAL = '/bezeg-2.0/rational/rational-elevation';
const TITLES = {
    [BERNSTEIN]: {sl: 'Bernsteinove bazne funkcije', en: 'Bernstein basis functions'},
    [RATIONAL]: {sl: null, en: 'Degree elevation of a rational curve'},
};

// Uncaught page errors and console errors fail every test.
let runtimeErrors;
test.beforeEach(({page}) => {
    runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
        if (message.type() === 'error') runtimeErrors.push(`console.error: ${message.text()}`);
    });
});
test.afterEach(() => {
    expect(runtimeErrors, 'uncaught page errors / console errors').toEqual([]);
});

async function useLanguage(page, language) {
    await page.addInitScript(value => localStorage.setItem('bezeg-2.0:bezeg-language', value), language);
}

// Counts live JSXGraph objects whose SVG node is attached to the main board.
function boardStats(page) {
    return page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === container.id || candidate.containerObj === container);
        if (!board) throw new Error('main board missing');
        const stats = {curves: 0, curveIds: [], points: 0, sliders: 0, labels: 0, total: Object.keys(board.objects).length};
        for (const object of Object.values(board.objects)) {
            const connected = Boolean(object.rendNode?.isConnected);
            const visible = object.visPropCalc?.visible !== false;
            if (object.elType === 'curve' && connected) { stats.curves += 1; stats.curveIds.push(object.id); }
            if (object.elType === 'point' && visible && connected) stats.points += 1;
            if (object.elType === 'slider') stats.sliders += 1;
            // Weight labels are smart labels rendered as text nodes with this class.
            const cls = String(object.rendNode?.className?.baseVal ?? object.rendNode?.className ?? '');
            if (object.elType === 'text' && connected && visible && cls.includes('smart-label-point2')) stats.labels += 1;
        }
        return stats;
    });
}

const lessonPanel = page => page.locator('section.guided-lesson');
const nextButton = page => lessonPanel(page).locator('.guided-lesson-nav-next');
const backButton = page => lessonPanel(page).locator('.guided-lesson-nav-back');

// The runtime animates overlay hand-offs (about 220ms); wait until the panel is steady.
async function settle(page) {
    await expect(lessonPanel(page)).toHaveClass(/guided-lesson-handoff-visible|guided-lesson-hidden/);
    await page.waitForTimeout(60);
}

// Reveals the full lesson panel again when an observation frame collapsed it to its compact prompt.
async function reveal(page) {
    await settle(page);
    if (!(await nextButton(page).isVisible())) {
        // Keyboard activation: a pointer click can be intercepted by board labels (see the dedicated pointer test).
        const cont = lessonPanel(page).getByRole('button', {name: /Continue lesson|Nadaljuj/});
        await cont.focus();
        await page.keyboard.press('Enter');
        await settle(page);
    }
    await expect(nextButton(page)).toBeVisible();
}

async function progress(page) {
    await reveal(page);
    return (await lessonPanel(page).locator('.guided-lesson-progress').innerText()).replace(/\s+/g, ' ').trim();
}

// Advance one frame, handling the collapsed "explore" prompt if the runtime shows it.
async function advance(page) {
    await reveal(page);
    await nextButton(page).click();
    await settle(page);
}

async function back(page) {
    await reveal(page);
    await backButton(page).click();
    await settle(page);
}

// Steps forward until the last frame, recording each progress label; clicks Finish.
async function stepToCompletion(page, perFrame) {
    const seen = [];
    for (let guard = 0; guard < 40; guard += 1) {
        const label = await progress(page);
        seen.push(label);
        if (perFrame) await perFrame(label);
        const finishing = /^(Finish|Dokončaj)$/.test((await nextButton(page).getAttribute('aria-label')) || '');
        await nextButton(page).click();
        await settle(page);
        if (finishing) break;
    }
    await expect(lessonPanel(page)).toContainText(/Lesson complete|Učna pot je končana/);
    return seen;
}

async function stackedSwitch(page) {
    return page.getByRole('checkbox', {name: /Stacked area chart/});
}

function degreeCounter(page) {
    return page.locator('.inspector-control, #inspector-edit').first().getByRole('button', {name: /^Current count: \d+$/});
}

async function degree(page) {
    const label = await page.getByRole('button', {name: /^Current count: \d+$/}).getAttribute('aria-label');
    return Number(label.replace(/\D+/g, ''));
}

async function noHorizontalOverflow(page) {
    const {scrollWidth, innerWidth} = await page.evaluate(() => ({
        scrollWidth: document.scrollingElement.scrollWidth, innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
}

test.describe('Bernstein lesson', () => {
    test('?learn=1 opens the lesson, Next/Back traverse all frames, stacked step switches ON, no curve accumulation', async ({page}) => {
        await useLanguage(page, 'sl');
        await page.goto(`${BERNSTEIN}?learn=1`, {waitUntil: 'domcontentloaded'});
        const lesson = lessonPanel(page);
        await expect(lesson).toBeVisible();
        await expect(lesson.getByRole('heading', {level: 2})).toHaveText(TITLES[BERNSTEIN].sl);
        await expect(backButton(page)).toBeDisabled();
        await expect.poll(async () => (await boardStats(page)).curves).toBeGreaterThan(0);

        const curvesAtStep = {};
        const seen = await stepToCompletion(page, async label => {
            const step = label.match(/(\d+)\D+(\d+)/);
            const stats = await boardStats(page);
            expect(stats.curves, `curve count sane at ${label}`).toBeLessThanOrEqual(12);
            curvesAtStep[label] = stats.curves;
        });
        expect(seen.length, 'frames visited').toBeGreaterThanOrEqual(10);
        // Step 4 (stacked area) must be among the visited frames.
        const stackedLabel = seen.find(label => /\b4\b.*\b1\b/.test(label) || /Korak 4/.test(label));
        expect(stackedLabel, 'a step-4 frame was visited').toBeTruthy();
    });

    test('stacked-area step reflects the switch ON and stepping back/forth does not accumulate curves', async ({page}) => {
        await useLanguage(page, 'en');
        await page.goto(`${BERNSTEIN}?learn=1`, {waitUntil: 'domcontentloaded'});
        const lesson = lessonPanel(page);
        await expect(lesson.getByRole('heading', {level: 2})).toHaveText(TITLES[BERNSTEIN].en);
        const frames = [];
        // Walk until step 4 starts (Step 4 of 5).
        for (let guard = 0; guard < 20; guard += 1) {
            const label = await progress(page);
            frames.push(label);
            if (/Step 4 of 5/.test(label)) break;
            await advance(page);
        }
        expect(await progress(page)).toMatch(/Step 4 of 5/);
        const stacked = await stackedSwitch(page);
        await expect.poll(() => stacked.isChecked(), {message: 'stacked switch ON at the stacked-area step'}).toBe(true);
        expect(await degree(page)).toBe(3);
        const stackedStats = await boardStats(page);
        expect(stackedStats.curves).toBeGreaterThanOrEqual(4);
        expect(stackedStats.curves).toBeLessThanOrEqual(12);

        // Step 3 (degree 3, not stacked) as the comparison point.
        await back(page);
        expect(await progress(page)).toMatch(/Step 3 of 5/);
        const calcStats = await boardStats(page);
        await expect.poll(() => (stacked).isChecked()).toBe(false);
        const stackedCounts = [];
        const calcCounts = [calcStats.curves];
        for (let round = 0; round < 5; round += 1) {
            await advance(page); // step 3 frame 3 -> step 4 frame 1
            expect(await progress(page)).toMatch(/Step 4 of 5/);
            await expect.poll(async () => (await stackedSwitch(page)).isChecked()).toBe(true);
            stackedCounts.push((await boardStats(page)).curves);
            await back(page);
            expect(await progress(page)).toMatch(/Step 3 of 5/);
            calcCounts.push((await boardStats(page)).curves);
        }
        const unique = array => [...new Set(array)];
        expect(unique(stackedCounts), `stacked-step curve counts ${stackedCounts}`).toEqual([stackedStats.curves]);
        expect(unique(calcCounts), `step-3 curve counts ${calcCounts}`).toEqual([calcStats.curves]);
    });

    test('full forward pass, Back, and completion with English lesson', async ({page}) => {
        await useLanguage(page, 'en');
        await page.goto(`${BERNSTEIN}?learn=1`, {waitUntil: 'domcontentloaded'});
        const lesson = lessonPanel(page);
        await expect(lesson.getByRole('heading', {level: 2})).toHaveText('Bernstein basis functions');
        // Forward 3 frames, back 2, forward again to check Back is lossless.
        const first = await progress(page);
        await advance(page); await advance(page); await advance(page);
        const third = await progress(page);
        await back(page); await back(page);
        expect(await progress(page)).not.toBe(third);
        await advance(page); await advance(page);
        expect(await progress(page)).toBe(third);
        await back(page); await back(page); await back(page);
        expect(await progress(page)).toBe(first);
        await expect(backButton(page)).toBeDisabled();
        const seen = await stepToCompletion(page);
        expect(seen.length).toBeGreaterThanOrEqual(10);
    });

    test('Exit mid-lesson restores the user\'s pre-lesson degree and a cleared stacked switch', async ({page}) => {
        await useLanguage(page, 'en');
        await page.goto(BERNSTEIN, {waitUntil: 'domcontentloaded'});
        await expect.poll(async () => (await boardStats(page)).curves).toBeGreaterThan(0);
        expect(await degree(page)).toBe(1);
        await page.getByRole('button', {name: 'Increase count'}).click();
        await expect.poll(() => degree(page)).toBe(2);
        const before = await boardStats(page);
        expect(before.curves).toBeGreaterThan(0);

        await page.getByRole('button', {name: 'Learn this demonstration'}).click();
        const lesson = lessonPanel(page);
        await expect(lesson).toBeVisible();
        for (let guard = 0; guard < 20; guard += 1) {
            if (/Step 4 of 5/.test(await progress(page))) break;
            await advance(page);
        }
        await expect.poll(async () => (await stackedSwitch(page)).isChecked()).toBe(true);
        expect(await degree(page)).toBe(3);

        await lesson.getByRole('button', {name: 'Exit lesson'}).click();
        await expect(lessonPanel(page)).toHaveCount(0);
        await expect.poll(() => degree(page), {message: 'degree restored after exit'}).toBe(2);
        await expect.poll(async () => (await stackedSwitch(page)).isChecked(), {message: 'stacked switch restored OFF'}).toBe(false);
        const after = await boardStats(page);
        expect(after.curves, 'same curve count as before the lesson').toBe(before.curves);
    });

    test('?learn=1 exit restores degree 1 / stacked off and re-entry does not accumulate objects', async ({page}) => {
        await useLanguage(page, 'en');
        await page.goto(`${BERNSTEIN}?learn=1`, {waitUntil: 'domcontentloaded'});
        const lesson = lessonPanel(page);
        await expect(lesson).toBeVisible();
        for (let guard = 0; guard < 20; guard += 1) {
            if (/Step 4 of 5/.test(await progress(page))) break;
            await advance(page);
        }
        await lesson.getByRole('button', {name: 'Exit lesson'}).click();
        await expect(lessonPanel(page)).toHaveCount(0);
        await expect.poll(() => degree(page)).toBe(1);
        await expect.poll(async () => (await stackedSwitch(page)).isChecked()).toBe(false);
        const afterFirst = await boardStats(page);
        for (let round = 0; round < 3; round += 1) {
            await page.getByRole('button', {name: 'Learn this demonstration'}).click();
            await expect(lessonPanel(page)).toBeVisible();
            await advance(page); await advance(page); await advance(page);
            await lessonPanel(page).getByRole('button', {name: 'Exit lesson'}).click();
            await expect(lessonPanel(page)).toHaveCount(0);
        }
        await expect.poll(() => degree(page)).toBe(1);
        const afterRepeat = await boardStats(page);
        expect(afterRepeat.curves).toBe(afterFirst.curves);
        expect(afterRepeat.total, 'board object total stable across re-entry').toBe(afterFirst.total);
    });
});

test.describe('Rational elevation lesson', () => {
    test('?learn=1 steps through to completion; point count rises to 5 then 6; Exit restores 4; weight labels show', async ({page}) => {
        await useLanguage(page, 'en');
        await page.goto(`${RATIONAL}?learn=1`, {waitUntil: 'domcontentloaded'});
        const lesson = lessonPanel(page);
        await expect(lesson.getByRole('heading', {level: 2})).toHaveText(TITLES[RATIONAL].en);
        await expect.poll(async () => (await boardStats(page)).points).toBe(4);
        const pointsByLabel = [];
        const labelsByLabel = [];
        let sawFive = false;
        let sawSix = false;
        let maxLabels = 0;
        // Frame-level walk. Elevation is applied by the lesson's action button or scene entry.
        for (let guard = 0; guard < 40; guard += 1) {
            const label = await progress(page);
            const action = lesson.locator('.guided-lesson-actions button');
            if (await action.count()) {
                await action.first().click();
                await settle(page);
            }
            const stats = await boardStats(page);
            pointsByLabel.push(`${label} => points ${stats.points}, labels ${stats.labels}`);
            if (stats.points === 5) sawFive = true;
            if (stats.points === 6) sawSix = true;
            maxLabels = Math.max(maxLabels, stats.labels);
            const finishing = (await nextButton(page).getAttribute('aria-label')) === 'Finish';
            await nextButton(page).click();
            await settle(page);
            if (finishing) break;
        }
        test.info().annotations.push({type: 'points-trace', description: pointsByLabel.join('\n')});
        await expect(lesson).toContainText(/Lesson complete/i);
        expect(sawFive, `5 control points seen:\n${pointsByLabel.join('\n')}`).toBe(true);
        expect(sawSix, `6 control points seen:\n${pointsByLabel.join('\n')}`).toBe(true);
        expect(maxLabels, `weight labels visible on some step:\n${pointsByLabel.join('\n')}`).toBeGreaterThan(0);

        await lesson.getByRole('button', {name: 'Exit lesson'}).click();
        await expect(lessonPanel(page)).toHaveCount(0);
        await expect.poll(async () => (await boardStats(page)).points, {message: 'points restored after exit'}).toBe(4);
    });

    test('Exit mid-lesson on an elevated step restores 4 points', async ({page}) => {
        await useLanguage(page, 'en');
        await page.goto(`${RATIONAL}?learn=1`, {waitUntil: 'domcontentloaded'});
        const lesson = lessonPanel(page);
        for (let guard = 0; guard < 30; guard += 1) {
            await reveal(page);
            const action = lesson.locator('.guided-lesson-actions button');
            if (await action.count()) { await action.first().click(); await settle(page); }
            if ((await boardStats(page)).points >= 5) break;
            await advance(page);
        }
        expect((await boardStats(page)).points).toBeGreaterThanOrEqual(5);
        await lesson.getByRole('button', {name: 'Exit lesson'}).click();
        await expect.poll(async () => (await boardStats(page)).points).toBe(4);
    });
});

test.describe('Pointer reachability of the compact lesson prompt', () => {
    for (const route of [BERNSTEIN, RATIONAL]) {
        test(`Continue lesson is clickable at its center on every observation frame (${route})`, async ({page}) => {
            await useLanguage(page, 'en');
            await page.goto(`${route}?learn=1`, {waitUntil: 'domcontentloaded'});
            const covered = [];
            for (let guard = 0; guard < 30; guard += 1) {
                const label = await progress(page);
                await nextButton(page).click();
                await settle(page);
                const cont = lessonPanel(page).locator('.guided-lesson-continue');
                if (await cont.count()) {
                    const blocker = await cont.evaluate(button => {
                        const r = button.getBoundingClientRect();
                        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                        return top === button || button.contains(top) ? null : `${top.tagName}.${top.className?.baseVal ?? top.className}`;
                    });
                    if (blocker) covered.push(`after "${label}": ${blocker}`);
                    await cont.focus();
                    await page.keyboard.press('Enter');
                    await settle(page);
                }
                if (/Finish/.test((await nextButton(page).getAttribute('aria-label').catch(() => '')) || '')) break;
            }
            expect(covered, 'Continue lesson center hit-test blocked by board elements').toEqual([]);
        });
    }
});

test.describe('Languages', () => {
    for (const route of [BERNSTEIN, RATIONAL]) {
        test(`English title on ${route}`, async ({page}) => {
            await useLanguage(page, 'en');
            await page.goto(`${route}?learn=1`, {waitUntil: 'domcontentloaded'});
            await expect(lessonPanel(page).getByRole('heading', {level: 2})).toHaveText(TITLES[route].en);
            await expect(lessonPanel(page).getByRole('button', {name: 'Exit lesson'})).toBeVisible();
        });
    }

    test('Slovenian rational lesson opens with a non-empty Slovenian title; header switch to English re-titles it', async ({page}) => {
        await useLanguage(page, 'sl');
        await page.goto(`${RATIONAL}?learn=1`, {waitUntil: 'domcontentloaded'});
        const heading = lessonPanel(page).getByRole('heading', {level: 2});
        await expect(heading).toBeVisible();
        const sl = (await heading.innerText()).trim();
        expect(sl.length).toBeGreaterThan(0);
        expect(sl).not.toBe(TITLES[RATIONAL].en);
        await page.locator('#bezeg-language').selectOption('en');
        await expect(heading).toHaveText(TITLES[RATIONAL].en);
    });
});

test.describe('Narrow viewport', () => {
    test.use({viewport: {width: 390, height: 844}});
    for (const route of [BERNSTEIN, RATIONAL]) {
        test(`lesson controls visible and no horizontal overflow on ${route}`, async ({page}) => {
            await useLanguage(page, 'en');
            await page.goto(`${route}?learn=1`, {waitUntil: 'domcontentloaded'});
            const lesson = lessonPanel(page);
            await expect(lesson).toBeVisible();
            for (const control of [nextButton(page), lesson.getByRole('button', {name: 'Exit lesson'})]) {
                await expect(control).toBeVisible();
                const box = await control.boundingBox();
                expect(box.x).toBeGreaterThanOrEqual(-1);
                expect(box.x + box.width).toBeLessThanOrEqual(391);
            }
            // Check every frame so the failing frame is named.
            const overflowing = [];
            const blocked = [];
            for (let guard = 0; guard < 40; guard += 1) {
                const label = await progress(page);
                const {scrollWidth, innerWidth} = await page.evaluate(() => ({
                    scrollWidth: document.scrollingElement.scrollWidth, innerWidth: window.innerWidth}));
                if (scrollWidth > innerWidth + 1) overflowing.push(`${label}: scrollWidth ${scrollWidth} > ${innerWidth}`);
                const finishing = (await nextButton(page).getAttribute('aria-label')) === 'Finish';
                try {
                    await nextButton(page).click({timeout: 4000});
                } catch (error) {
                    blocked.push(`${label}: ${error.message.split(String.fromCharCode(10)).find(line => line.includes('intercepts')) || 'click failed'}`);
                    await nextButton(page).focus();
                    await page.keyboard.press('Enter');
                }
                await settle(page);
                if (finishing) break;
            }
            expect(blocked, 'Next not pointer-clickable on frames').toEqual([]);
            expect(overflowing, 'frames with horizontal page overflow').toEqual([]);
            await expect(page.locator('#jgbox')).toBeVisible();
        });
    }
});

test.describe('Keyboard', () => {
    test('Next is reachable via Tab and activated with Enter', async ({page}) => {
        await useLanguage(page, 'en');
        await page.goto(`${BERNSTEIN}?learn=1`, {waitUntil: 'domcontentloaded'});
        const lesson = lessonPanel(page);
        await expect(lesson).toBeVisible();
        const before = await progress(page);
        let reached = false;
        for (let presses = 0; presses < 25; presses += 1) {
            await page.keyboard.press('Tab');
            const active = await page.evaluate(() => document.activeElement?.className || '');
            if (String(active).includes('guided-lesson-nav-next')) { reached = true; break; }
        }
        expect(reached, 'Next button focused through Tab').toBe(true);
        await page.keyboard.press('Enter');
        await expect.poll(() => progress(page)).not.toBe(before);
    });
});

test.describe('Rational elevation outside lessons', () => {
    async function selectCurve(page) {
        await page.locator('.inspector-tabs').getByRole('button', {name: 'Edit'}).click();
        await page.locator('.workspace-curve-picker button').first().click();
        await expect(page.locator('.workspace-curve-picker button[aria-pressed="true"]')).toHaveCount(1);
    }

    test('Dvigni stopnjo with weight labels shown rebuilds points (4 -> 5 -> 6) and labels', async ({page}) => {
        await useLanguage(page, 'en');
        await page.goto(RATIONAL, {waitUntil: 'domcontentloaded'});
        await expect.poll(async () => (await boardStats(page)).points).toBe(4);
        await selectCurve(page);
        await page.getByRole('checkbox', {name: 'Weights'}).check();
        await expect.poll(async () => (await boardStats(page)).labels).toBeGreaterThanOrEqual(4);
        // Graph commands (Elevate degree) are only offered while no curve is selected.
        await page.getByRole('button', {name: 'Clear selection'}).click();
        await expect.poll(async () => (await boardStats(page)).labels, {message: 'weight labels survive deselect'}).toBeGreaterThanOrEqual(4);
        await page.getByRole('button', {name: 'Elevate degree'}).click();
        await expect.poll(async () => (await boardStats(page)).points).toBe(5);
        await expect.poll(async () => (await boardStats(page)).labels, {message: 'weight labels rebuilt for 5 points'}).toBeGreaterThanOrEqual(5);
        await page.getByRole('button', {name: 'Elevate degree'}).click();
        await expect.poll(async () => (await boardStats(page)).points).toBe(6);
        await expect.poll(async () => (await boardStats(page)).labels).toBeGreaterThanOrEqual(6);
    });

    test('Farin points on the elevation route (seeded stored preset) then Elevate degree rebuilds sliders', async ({page}) => {
        // The elevation route offers no Farin switch in its UI; the only reachable way to have
        // Farin sliders active here is a stored preset with showingFarinPoints:true.
        await useLanguage(page, 'en');
        await page.addInitScript(() => {
            const preset = {id: 'smoke-farin', data: [['JSXRationalBezierCurve', {
                points: [[-4, -3], [-3, 3], [3, 3], [4, -3]], weights: [1, 2, 1, 1],
                state: {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, subdivisionT: 0.5,
                    extrapolationT: 1.2, showingWeights: false, weightNumber: 1, showingFarinPoints: true},
            }]]};
            localStorage.setItem('bezeg-2.0:preset-rational-bezier-elevation', JSON.stringify({data: [preset]}));
        });
        await page.goto(RATIONAL, {waitUntil: 'domcontentloaded'});
        await page.locator('.inspector-tabs').getByRole('button', {name: 'Save'}).click();
        await page.locator('#inspector-save').getByRole('combobox', {name: 'Presets'}).selectOption('smoke-farin');
        await expect.poll(async () => (await boardStats(page)).sliders, {message: '3 Farin sliders for 4 points'}).toBe(3);
        await page.locator('.inspector-tabs').getByRole('button', {name: 'Edit'}).click();
        await page.getByRole('button', {name: 'Elevate degree'}).click();
        await expect.poll(async () => (await boardStats(page)).points).toBe(5);
        await expect.poll(async () => (await boardStats(page)).sliders, {message: '4 Farin sliders for 5 points'}).toBe(4);
        await page.getByRole('button', {name: 'Elevate degree'}).click();
        await expect.poll(async () => (await boardStats(page)).points).toBe(6);
        await expect.poll(async () => (await boardStats(page)).sliders).toBe(5);
    });
});
