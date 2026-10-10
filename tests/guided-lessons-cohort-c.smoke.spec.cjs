const {test, expect} = require('@playwright/test');

const WEIGHTED = '/bezeg-2.0/param/param/alphaparam';
const UNIFORM = '/bezeg-2.0/param/param/uniform';
const ROUTES = [WEIGHTED, UNIFORM];
const TITLES = {
    [WEIGHTED]: {sl: 'Utežena parametrizacija', en: 'Weighted parameterization'},
    [UNIFORM]: {sl: 'Enakomerna parametrizacija PH krivulje', en: 'Uniform parameterization of a PH curve'},
};
// Sample-point count the scene of each step prepares (step 1 is the route default).
const SAMPLES_BY_STEP = {
    [WEIGHTED]: [10, 3, 3, 3, 20],
    [UNIFORM]: [10, 10, 3, 20, 10],
};
const DEFAULT_SAMPLES = 10;

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
        const stats = {curves: 0, points: 0, total: Object.keys(board.objects).length};
        for (const object of Object.values(board.objects)) {
            const connected = Boolean(object.rendNode?.isConnected);
            const visible = object.visPropCalc?.visible !== false;
            if (object.elType === 'curve' && connected) stats.curves += 1;
            if (object.elType === 'point' && visible && connected) stats.points += 1;
        }
        return stats;
    });
}

// Control points are whatever remains of the visible points when the route holds its default 10 samples.
async function controlPointCount(page) {
    await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThan(DEFAULT_SAMPLES);
    return (await boardStats(page)).points - DEFAULT_SAMPLES;
}

const lessonPanel = page => page.locator('section.guided-lesson');
const nextButton = page => lessonPanel(page).locator('.guided-lesson-nav-next');
const backButton = page => lessonPanel(page).locator('.guided-lesson-nav-back');
const alphaSlider = page => page.locator('input[type="range"][max="1"]').first();
const samplesSlider = page => page.locator('input[type="range"][max="40"]').first();
const modeSelect = page => page.getByRole('combobox', {name: /Choose parametrization|Izberi parametrizacijo/});

// The runtime animates overlay hand-offs (about 220ms); wait until the panel is steady.
async function settle(page) {
    await expect(lessonPanel(page)).toHaveClass(/guided-lesson-handoff-visible|guided-lesson-hidden/);
    await page.waitForTimeout(60);
}

// Reveals the full lesson panel again when an observation frame collapsed it to its compact prompt.
async function reveal(page) {
    await settle(page);
    if (!(await nextButton(page).isVisible())) {
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

function stepNumber(label) {
    return Number((label.match(/(\d+)\D+\d+/) || [])[1]);
}

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

async function advanceToStep(page, step) {
    for (let guard = 0; guard < 40; guard += 1) {
        if (stepNumber(await progress(page)) >= step) return;
        await advance(page);
    }
    throw new Error(`step ${step} not reached`);
}

// Sample points currently drawn: visible points minus the control points.
async function sampleCount(page, controls) {
    return (await boardStats(page)).points - controls;
}

async function expectSamples(page, controls, expected, message) {
    await expect.poll(() => sampleCount(page, controls), {message}).toBe(expected);
}

async function noHorizontalOverflow(page) {
    const {scrollWidth, innerWidth} = await page.evaluate(() => ({
        scrollWidth: document.scrollingElement.scrollWidth, innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
}

async function setRange(locator, value) {
    await locator.fill(String(value));
}

for (const route of ROUTES) {
    const samplesByStep = SAMPLES_BY_STEP[route];

    test.describe(`Parameterization lesson ${route}`, () => {
        test('?learn=1 opens the Slovenian lesson; Next traverses every frame with the scene sample count, then completes', async ({page}) => {
            test.setTimeout(150_000);
            await useLanguage(page, 'sl');
            await page.goto(`${route}?learn=1`, {waitUntil: 'domcontentloaded'});
            const lesson = lessonPanel(page);
            await expect(lesson).toBeVisible();
            await expect(lesson.getByRole('heading', {level: 2})).toHaveText(TITLES[route].sl);
            await expect(backButton(page)).toBeDisabled();
            const controls = await controlPointCount(page);
            expect(controls).toBeGreaterThan(0);
            const curvesAtStart = (await boardStats(page)).curves;

            const seen = [];
            for (let guard = 0; guard < 40; guard += 1) {
                const label = await progress(page);
                seen.push(label);
                const step = stepNumber(label);
                await expectSamples(page, controls, samplesByStep[step - 1], `sample points at ${label}`);
                expect((await boardStats(page)).curves, `curve count stable at ${label}`).toBe(curvesAtStart);
                const finishing = /^(Finish|Dokončaj)$/.test((await nextButton(page).getAttribute('aria-label')) || '');
                await nextButton(page).click();
                await settle(page);
                if (finishing) break;
            }
            expect(new Set(seen.map(stepNumber))).toEqual(new Set([1, 2, 3, 4, 5]));
            expect(seen.length, 'frames visited').toBeGreaterThanOrEqual(10);
            await expect(lesson).toContainText(/Lesson complete|Učna pot je končana/);
        });

        test('Back is lossless: scenes and sample counts follow the step in both directions', async ({page}) => {
            test.setTimeout(150_000);
            await useLanguage(page, 'en');
            await page.goto(`${route}?learn=1`, {waitUntil: 'domcontentloaded'});
            await expect(lessonPanel(page).getByRole('heading', {level: 2})).toHaveText(TITLES[route].en);
            const controls = await controlPointCount(page);
            const trail = [];
            for (let guard = 0; guard < 40; guard += 1) {
                const label = await progress(page);
                trail.push(label);
                if (/Step 5 of 5/.test(label)) break;
                await advance(page);
            }
            expect(new Set(trail.map(stepNumber)).has(5)).toBe(true);
            // Walk the recorded trail backwards.
            for (let index = trail.length - 2; index >= 0; index -= 1) {
                await back(page);
                const label = await progress(page);
                expect(label).toBe(trail[index]);
                await expectSamples(page, controls, samplesByStep[stepNumber(label) - 1], `sample points going back at ${label}`);
            }
            await expect(backButton(page)).toBeDisabled();
            // And forward again to the end.
            for (let index = 1; index < trail.length; index += 1) {
                await advance(page);
                const label = await progress(page);
                expect(label).toBe(trail[index]);
                await expectSamples(page, controls, samplesByStep[stepNumber(label) - 1], `sample points going forward at ${label}`);
            }
        });

        test('Exit mid-lesson restores the user-changed alpha, sample count and mode', async ({page}) => {
            test.setTimeout(150_000);
            await useLanguage(page, 'en');
            await page.goto(route, {waitUntil: 'domcontentloaded'});
            const controls = await controlPointCount(page);
            await expect(samplesSlider(page)).toHaveValue(String(DEFAULT_SAMPLES));
            await setRange(alphaSlider(page), 0.8);
            await setRange(samplesSlider(page), 7);
            await expectSamples(page, controls, 7, 'user-set sample count drawn');
            const hasMode = route === UNIFORM;
            if (hasMode) await modeSelect(page).selectOption('uniform');
            const before = await boardStats(page);

            await page.getByRole('button', {name: 'Learn this demonstration'}).click();
            await expect(lessonPanel(page)).toBeVisible();
            // Step 3 prepares 3 samples on both routes (the PH route also switches mode there).
            await advanceToStep(page, 3);
            await expectSamples(page, controls, samplesByStep[2], 'lesson scene replaces the user sample count');
            await lessonPanel(page).getByRole('button', {name: 'Exit lesson'}).click();
            await expect(lessonPanel(page)).toHaveCount(0);

            await expectSamples(page, controls, 7, 'sample count restored after exit');
            await expect.poll(async () => (await samplesSlider(page).inputValue())).toBe('7');
            if (hasMode) {
                await expect(modeSelect(page)).toHaveValue('uniform');
                // The alpha slider is only offered in weighted mode; switching back is a normal user action.
                await modeSelect(page).selectOption('alpha');
                await expectSamples(page, controls, 7, 'weighted samples after switching mode back');
            }
            await expect.poll(async () => Number(await alphaSlider(page).inputValue())).toBeCloseTo(0.8, 5);
            const after = await boardStats(page);
            expect(after.curves, 'same curve count as before the lesson').toBe(before.curves);
        });

        test('re-entering the lesson three times does not accumulate board point elements', async ({page}) => {
            test.setTimeout(150_000);
            await useLanguage(page, 'en');
            await page.goto(route, {waitUntil: 'domcontentloaded'});
            const controls = await controlPointCount(page);
            const baseline = await boardStats(page);
            expect(baseline.points).toBe(controls + DEFAULT_SAMPLES);
            for (let round = 0; round < 3; round += 1) {
                await page.getByRole('button', {name: 'Learn this demonstration'}).click();
                await expect(lessonPanel(page)).toBeVisible();
                await advanceToStep(page, 4);
                await expectSamples(page, controls, samplesByStep[3], `round ${round} step 4 samples`);
                await lessonPanel(page).getByRole('button', {name: 'Exit lesson'}).click();
                await expect(lessonPanel(page)).toHaveCount(0);
                await expectSamples(page, controls, DEFAULT_SAMPLES, `round ${round} samples after exit`);
            }
            const after = await boardStats(page);
            expect(after.points, 'visible point elements stable across re-entry').toBe(baseline.points);
            expect(after.curves).toBe(baseline.curves);
            expect(after.total, 'board object total stable across re-entry').toBe(baseline.total);
        });

        test('English lesson title and Exit control', async ({page}) => {
            test.setTimeout(150_000);
            await useLanguage(page, 'en');
            await page.goto(`${route}?learn=1`, {waitUntil: 'domcontentloaded'});
            await expect(lessonPanel(page).getByRole('heading', {level: 2})).toHaveText(TITLES[route].en);
            await expect(lessonPanel(page).getByRole('button', {name: 'Exit lesson'})).toBeVisible();
        });

        test('Next is reachable via Tab and activated with Enter', async ({page}) => {
            test.setTimeout(150_000);
            await useLanguage(page, 'en');
            await page.goto(`${route}?learn=1`, {waitUntil: 'domcontentloaded'});
            await expect(lessonPanel(page)).toBeVisible();
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

        test.describe('narrow viewport', () => {
            test.use({viewport: {width: 390, height: 844}});
            test('lesson controls are visible and the page has no horizontal overflow on any frame', async ({page}) => {
            test.setTimeout(150_000);
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
                await noHorizontalOverflow(page);
            });
        });
    });
}
