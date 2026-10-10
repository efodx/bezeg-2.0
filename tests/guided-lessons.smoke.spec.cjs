/*
 * Data-driven guided-lesson smoke spec.
 *
 * ADDING A LESSON: append one row to LESSONS below. Every generic test runs for every row:
 *   deep link + titles, Next through all frames to completion, lossless Back, header language switch,
 *   Exit restores a user-changed state, 3x re-entry keeps board counts stable, pointer reachability of the
 *   compact "Continue lesson" prompt, 390x844 layout (no horizontal overflow, Next/Exit visible, Next clickable),
 *   and keyboard Tab+Enter on Next. No new spec file is needed.
 *
 * Row schema (all hooks receive Playwright `page`; `ctx` is whatever `setup` returned):
 *   id        string   test-name label.
 *   path      string   route under the app base, e.g. '/bezeg-2.0/bernstein'.
 *   titles    {sl, en} exact lesson heading in each language (src/learning/content/*GuidedLessons.ts).
 *   steps     number   lesson step count (progress reads "Step n of <steps>").
 *   minFrames number?  minimum progress frames visited (observation frames count); default 10.
 *   setup(page)                        optional; runs after the route is open with the lesson state ready;
 *                                      returns ctx (e.g. a control-point count or baseline curve count).
 *   stepProbe(page, ctx, step, label)  optional; asserts the board for the scene of `step`. Runs on every frame
 *                                      while stepping forward, backward and forward again, and during re-entry.
 *   prepareUserState(page, ctx)        optional (null = skip the Exit test); with no lesson open, changes a user
 *                                      control and returns a `saved` value (usually before-lesson board stats).
 *   exitStep  number?                  step to advance to before exiting (default 3).
 *   duringLesson(page, ctx, saved)     optional; asserts the lesson scene replaced the user state at exitStep.
 *   assertUserState(page, ctx, saved)  asserts the user state is restored after Exit.
 *   stableCounts(page, ctx)            optional; returns an object that must be identical before and after each
 *                                      of three enter/advance/exit rounds (board curves/points/total are always
 *                                      compared too).
 *   assertBaseline(page, ctx)          optional; sanity checks on the untouched route before re-entry rounds.
 *   reentryStep number?                step reached in each re-entry round (default 3).
 * Lesson-specific tests that do not fit the table live in the "extras" blocks at the bottom of this file.
 */
const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');

const {lessonPanel, nextButton, backButton, exitButton, learnButton, lessonHeading, boardStats, settle, progress,
    stepNumber, advance, back, advanceToStep, stepToCompletion, noHorizontalOverflow} = h;

h.failOnRuntimeErrors();

// Every test below owns its page and context and the preview server is stateless, so tests may run in parallel.
test.describe.configure({mode: 'parallel'});

const BASE = '/bezeg-2.0';
const rangeSlider = (page, max) => page.locator(`input[type="range"][max="${max}"]`).first();
const near = (actual, expected, tolerance = 0.02) => Math.abs(actual - expected) <= tolerance;
const expectPointNear = (page, [x, y], message) => expect.poll(
    async () => (await h.visiblePoints(page)).some(point => near(point[0], x) && near(point[1], y)), {message: message || `a point near (${x}, ${y})`}).toBe(true);
const expectWeights = (page, expected, message) => expect.poll(
    async () => (await h.boardWeights(page)).slice(0, expected.length).map(value => Number(value.toFixed(2))), {message}).toEqual(expected);

// ---------------------------------------------------------------- Bernstein
const stackedSwitch = page => page.getByRole('checkbox', {name: /Stacked area chart/});

async function degree(page) {
    const label = await page.getByRole('button', {name: /^Current count: \d+$/}).getAttribute('aria-label');
    return Number(label.replace(/\D+/g, ''));
}

const bernstein = {
    id: 'bernstein',
    path: `${BASE}/bernstein`,
    titles: {sl: 'Bernsteinove bazne funkcije', en: 'Bernstein basis functions'},
    steps: 5,
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).curves).toBeGreaterThan(0);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        expect((await boardStats(page)).curves, `curve count sane at ${label}`).toBeLessThanOrEqual(12);
    },
    prepareUserState: async page => {
        await expect.poll(async () => (await boardStats(page)).curves).toBeGreaterThan(0);
        expect(await degree(page)).toBe(1);
        await page.getByRole('button', {name: 'Increase count'}).click();
        await expect.poll(() => degree(page)).toBe(2);
        const before = await boardStats(page);
        expect(before.curves).toBeGreaterThan(0);
        return before;
    },
    exitStep: 4,
    duringLesson: async page => {
        await expect.poll(async () => (await stackedSwitch(page)).isChecked()).toBe(true);
        expect(await degree(page)).toBe(3);
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => degree(page), {message: 'degree restored after exit'}).toBe(2);
        await expect.poll(async () => (await stackedSwitch(page)).isChecked(), {message: 'stacked switch restored OFF'}).toBe(false);
        expect((await boardStats(page)).curves, 'same curve count as before the lesson').toBe(before.curves);
    },
    stableCounts: async page => ({degree: await degree(page), stacked: await (await stackedSwitch(page)).isChecked()}),
};

// ---------------------------------------------------------------- Rational elevation
async function runElevationActions(page, until) {
    const lesson = lessonPanel(page);
    for (let guard = 0; guard < 30; guard += 1) {
        await h.reveal(page);
        const action = lesson.locator('.guided-lesson-actions button');
        if (await action.count()) { await action.first().click(); await settle(page); }
        if (until && await until()) return;
        await advance(page);
    }
}

const rationalElevation = {
    id: 'rational-elevation',
    path: `${BASE}/rational/rational-elevation`,
    titles: {sl: 'Višanje stopnje racionalne krivulje', en: 'Degree elevation of a rational curve'},
    steps: 5,
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBe(4);
        return {};
    },
    prepareUserState: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBe(4);
        return {points: 4};
    },
    // "Exit mid-lesson on an elevated step restores 4 points": apply the lesson's elevation action first.
    exitStep: 1,
    duringLesson: async page => {
        await runElevationActions(page, async () => (await boardStats(page)).points >= 5);
        expect((await boardStats(page)).points).toBeGreaterThanOrEqual(5);
    },
    assertUserState: async (page, ctx, saved) => {
        await expect.poll(async () => (await boardStats(page)).points, {message: 'points restored after exit'}).toBe(saved.points);
    },
    stableCounts: async page => ({points: (await boardStats(page)).points}),
};

// ---------------------------------------------------------------- Parameterization
const DEFAULT_SAMPLES = 10;
const alphaSlider = page => page.locator('input[type="range"][max="1"]').first();
const samplesSlider = page => page.locator('input[type="range"][max="40"]').first();
const modeSelect = page => page.getByRole('combobox', {name: /Choose parametrization|Izberi parametrizacijo/});

// Sample points currently drawn: visible points minus the control points.
const sampleCount = async (page, controls) => (await boardStats(page)).points - controls;
const expectSamples = (page, controls, expected, message) =>
    expect.poll(() => sampleCount(page, controls), {message}).toBe(expected);

// Control points are whatever remains of the visible points when the route holds its default 10 samples.
async function controlPointCount(page) {
    await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThan(DEFAULT_SAMPLES);
    return (await boardStats(page)).points - DEFAULT_SAMPLES;
}

// samplesByStep: sample-point count the scene of each step prepares (step 1 is the route default).
function parameterizationRow({id, path, titles, samplesByStep, hasMode}) {
    return {
        id, path, titles, steps: 5,
        setup: async page => {
            const controls = await controlPointCount(page);
            expect(controls).toBeGreaterThan(0);
            return {controls, curves: (await boardStats(page)).curves};
        },
        stepProbe: async (page, ctx, step, label) => {
            await expectSamples(page, ctx.controls, samplesByStep[step - 1], `sample points at ${label}`);
            expect((await boardStats(page)).curves, `curve count stable at ${label}`).toBe(ctx.curves);
        },
        prepareUserState: async (page, ctx) => {
            await expect(samplesSlider(page)).toHaveValue(String(DEFAULT_SAMPLES));
            await alphaSlider(page).fill('0.8');
            await samplesSlider(page).fill('7');
            await expectSamples(page, ctx.controls, 7, 'user-set sample count drawn');
            if (hasMode) await modeSelect(page).selectOption('uniform');
            return await boardStats(page);
        },
        // Step 3 prepares 3 samples on both routes (the PH route also switches mode there).
        exitStep: 3,
        duringLesson: async (page, ctx) => {
            await expectSamples(page, ctx.controls, samplesByStep[2], 'lesson scene replaces the user sample count');
        },
        assertUserState: async (page, ctx, before) => {
            await expectSamples(page, ctx.controls, 7, 'sample count restored after exit');
            await expect.poll(async () => (await samplesSlider(page).inputValue())).toBe('7');
            if (hasMode) {
                await expect(modeSelect(page)).toHaveValue('uniform');
                // The alpha slider is only offered in weighted mode; switching back is a normal user action.
                await modeSelect(page).selectOption('alpha');
                await expectSamples(page, ctx.controls, 7, 'weighted samples after switching mode back');
            }
            await expect.poll(async () => Number(await alphaSlider(page).inputValue())).toBeCloseTo(0.8, 5);
            expect((await boardStats(page)).curves, 'same curve count as before the lesson').toBe(before.curves);
        },
        reentryStep: 4,
        assertBaseline: async (page, ctx) => {
            expect((await boardStats(page)).points).toBe(ctx.controls + DEFAULT_SAMPLES);
        },
        stableCounts: async (page, ctx) => ({samples: await sampleCount(page, ctx.controls)}),
    };
}

const weighted = parameterizationRow({
    id: 'param-weighted',
    path: `${BASE}/param/param/alphaparam`,
    titles: {sl: 'Utežena parametrizacija', en: 'Weighted parameterization'},
    samplesByStep: [10, 3, 3, 3, 20],
    hasMode: false,
});
const uniformPh = parameterizationRow({
    id: 'param-uniform-ph',
    path: `${BASE}/param/param/uniform`,
    titles: {sl: 'Enakomerna parametrizacija PH krivulje', en: 'Uniform parameterization of a PH curve'},
    samplesByStep: [10, 10, 3, 20, 10],
    hasMode: true,
});

// ---------------------------------------------------------------- Construction lessons (Cohort D)
const tSlider = page => rangeSlider(page, '0.99');
const expectT = (page, expected, message) => expect.poll(async () => Number(await tSlider(page).inputValue()), {message}).toBeCloseTo(expected, 1);

// Default subdivision route draws two curves (blue [0,t] and orange remainder [t,1]) and 4 + 6 scheme points.
const subdivision = {
    id: 'subdivision',
    path: `${BASE}/bezier/subdivision-2`,
    titles: {sl: 'Subdivizija Bézierjeve krivulje', en: 'Subdivision of a Bézier curve'},
    steps: 5,
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).drawnCurves).toBe(2);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const tByStep = [0.5, 0.3, 0.5, 1, 1];
        await expectT(page, tByStep[step - 1], `t slider at ${label}`);
        if (step <= 3) {
            await expect.poll(async () => (await boardStats(page)).points, {message: `scheme + control points at ${label}`}).toBe(10);
            expect((await boardStats(page)).drawnCurves, `blue part + orange remainder at ${label}`).toBe(2);
        } else {
            await expect.poll(async () => (await boardStats(page)).points, {message: `two cubic parts at ${label}`}).toBe(8);
            expect((await boardStats(page)).drawnCurves, `two parts after the cut at ${label}`).toBe(2);
        }
    },
    prepareUserState: async page => {
        await page.getByRole('button', {name: 'Subdivide'}).click();
        await expect.poll(async () => (await boardStats(page)).drawnCurves).toBe(2);
        await tSlider(page).fill('0.696');
        await expectT(page, 0.7, 'user-set t');
        return await boardStats(page);
    },
    exitStep: 3,
    assertUserState: async (page, ctx, before) => {
        await expectT(page, 0.7, 't restored after exit');
        // After the user's cut, t = 0.7 makes the orange remainder [0.7, 1] a real curve again: 3 drawn curves.
        await expect.poll(async () => (await boardStats(page)).drawnCurves, {message: 'cut curves restored'}).toBe(before.drawnCurves);
        const after = await boardStats(page);
        expect(after.curves, 'same curve objects (no duplicated remainder)').toBe(before.curves);
        expect(after.points).toBe(before.points);
    },
    stableCounts: async page => ({t: Number(await tSlider(page).inputValue())}),
};

const repeatedSubdivision = {
    id: 'repeated-subdivision',
    path: `${BASE}/bezier/subdivision`,
    titles: {sl: 'Zaporedna subdivizija', en: 'Repeated subdivision'},
    steps: 5,
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).curves).toBe(1);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const pieces = 2 ** (step - 1);
        await expect.poll(async () => (await boardStats(page)).curves, {message: `${pieces} pieces at ${label}`}).toBe(pieces);
        expect((await boardStats(page)).points, `4 control points per piece at ${label}`).toBe(4 * pieces);
    },
    prepareUserState: async page => {
        await page.getByRole('button', {name: 'Subdivide'}).click();
        await page.getByRole('button', {name: 'Subdivide'}).click();
        await expect.poll(async () => (await boardStats(page)).curves).toBe(4);
        return await boardStats(page);
    },
    exitStep: 4,
    duringLesson: async page => {
        await expect.poll(async () => (await boardStats(page)).curves, {message: 'lesson scene shows 8 pieces'}).toBe(8);
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(async () => (await boardStats(page)).curves, {message: 'pieces restored after exit'}).toBe(4);
        expect((await boardStats(page)).points).toBe(before.points);
        // The step counter is restored too: one more cut doubles 4 to 8.
        await page.getByRole('button', {name: 'Subdivide'}).click();
        await expect.poll(async () => (await boardStats(page)).curves).toBe(8);
    },
};

const rationalSubdivision = {
    id: 'rational-subdivision',
    path: `${BASE}/rational/rational-subdivision`,
    titles: {sl: 'Subdivizija racionalne Bézierjeve krivulje', en: 'Subdivision of a rational Bézier curve'},
    steps: 4,
    minFrames: 9, // 2 + 2 + 3 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).drawnCurves).toBe(2);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        if (step <= 2) {
            await expectT(page, 0.5, `t slider at ${label}`);
            await expect.poll(async () => (await boardStats(page)).points, {message: `scheme + control points at ${label}`}).toBe(10);
            await expectWeights(page, [1, 2, 1, 1], `weights at ${label}`);
        } else if (step === 3) {
            // Left part weights 1, 3/2, 3/2, 11/8; right part 11/8, 5/4, 1, 1; both pieces are labelled, listed by index
            // (w0 left, w0 right, w1 left, ...). The shared junction has weight 11/8 = 1.375 (shown as 1.38).
            await expect.poll(async () => (await boardStats(page)).points, {message: `two cubic parts at ${label}`}).toBe(8);
            expect((await boardStats(page)).drawnCurves).toBe(2);
            await expectWeights(page, [1, 1.38, 1.5, 1.25, 1.5, 1, 1.38, 1], `weights of both pieces at ${label}`);
        } else {
            // t = 0.3: left part weights 1, 1.3, 1.42, 1.441; right part 1.441, 1.49, 1, 1 (junction weight shown as 1.44).
            expect((await boardStats(page)).drawnCurves).toBe(2);
            await expectWeights(page, [1, 1.44, 1.3, 1.49, 1.42, 1, 1.44, 1], `weights of both pieces at ${label}`);
        }
    },
    prepareUserState: async page => {
        await tSlider(page).fill('0.696');
        await expectT(page, 0.7, 'user-set t');
        return {...(await boardStats(page)), weights: await h.boardWeights(page)};
    },
    exitStep: 3,
    assertUserState: async (page, ctx, before) => {
        await expectT(page, 0.7, 't restored after exit');
        const after = await boardStats(page);
        expect(after.drawnCurves).toBe(before.drawnCurves);
        expect(after.curves, 'same curve objects (no duplicated remainder)').toBe(before.curves);
        // Weight labels are off on the plain route; the lesson turns them on, so Exit must hide them again.
        expect(before.weights, 'weight labels are off before the lesson').toEqual([]);
        await expectWeights(page, [], 'weight labels hidden again after exit');
    },
    stableCounts: async page => ({t: Number(await tSlider(page).inputValue())}),
};

// Extrapolation: 4 control points + the marker point B(t); the curve is replaced by the extended one.
const extrapolation = {
    id: 'extrapolation',
    path: `${BASE}/bezier/extrapolation`,
    titles: {sl: 'Ekstrapolacija Bézierjeve krivulje', en: 'Extrapolation of a Bézier curve'},
    steps: 4,
    minFrames: 9, // 2 + 2 + 3 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBe(5);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const tByStep = [1.2, 1.5, 1.2, 1.5];
        await expect.poll(async () => Number(await rangeSlider(page, '1.5').inputValue()), {message: `extrapolation slider at ${label}`}).toBeCloseTo(tByStep[step - 1], 2);
        const stats = await boardStats(page);
        expect(stats.curves, `one curve at ${label}`).toBe(1);
        expect(stats.points, `4 control points + marker at ${label}`).toBe(5);
        // Marker B(1.2) / B(1.5) of the default curve; after "extrapolate" the old marker is the new last control point
        // and the second control point moves to (-2.8, 4) / (-2.5, 5.5).
        if (step === 1) await expectPointNear(page, [3.06, -3.87], 'marker B(6/5)');
        if (step === 2) await expectPointNear(page, [0.5, -9.88], 'marker B(3/2)');
        if (step === 3) { await expectPointNear(page, [3.06, -3.87], 'p3 equals the old marker B(6/5)'); await expectPointNear(page, [-2.8, 4]); }
        if (step === 4) { await expectPointNear(page, [0.5, -9.88], 'p3 equals the old marker B(3/2)'); await expectPointNear(page, [-2.5, 5.5]); }
    },
    prepareUserState: async page => {
        await rangeSlider(page, '1.5').fill('1.4');
        await expect.poll(async () => Number(await rangeSlider(page, '1.5').inputValue())).toBeCloseTo(1.4, 1);
        return await boardStats(page);
    },
    exitStep: 3,
    assertUserState: async (page, ctx, before) => {
        await expect.poll(async () => Number(await rangeSlider(page, '1.5').inputValue()), {message: 'extrapolation slider restored'}).toBeCloseTo(1.4, 1);
        const after = await boardStats(page);
        expect(after.curves).toBe(before.curves);
        expect(after.points).toBe(before.points);
    },
    stableCounts: async page => ({t: Number(await rangeSlider(page, '1.5').inputValue())}),
};

const rationalExtrapolation = {
    id: 'rational-extrapolation',
    path: `${BASE}/rational/rational-extrapolation`,
    titles: {sl: 'Ekstrapolacija racionalne Bézierjeve krivulje', en: 'Extrapolation of a rational Bézier curve'},
    steps: 4,
    minFrames: 9, // 2 + 2 + 3 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBe(5);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const stats = await boardStats(page);
        expect(stats.curves, `one curve at ${label}`).toBe(1);
        expect(stats.points, `4 control points + marker at ${label}`).toBe(5);
        // Weights 1, 1+t, 1+2t-2t^2, w(t): (1,2,1,1) -> (1,2.2,0.52,1.14) at t=6/5 -> (1,2.5,-0.5,17/8) at t=3/2.
        const weights = [[1, 2, 1, 1], [1, 2, 1, 1], [1, 2.2, 0.52, 1.14], [1, 2.5, -0.5, 2.13]][step - 1];
        await expectWeights(page, weights, `weights at ${label}`);
        if (step === 3) { await expectPointNear(page, [-2.91, 3.55]); await expectPointNear(page, [13.54, 2.54]); }
        // The third control point (negative weight) lies at (-29.5, 6), outside the default view; the lesson says so and points to Zoom out.
        if (step === 4) { await expectPointNear(page, [-2.8, 4.2]); await expectPointNear(page, [-29.5, 6]); }
    },
    prepareUserState: async page => {
        await rangeSlider(page, '1.5').fill('1.4');
        await expect.poll(async () => Number(await rangeSlider(page, '1.5').inputValue())).toBeCloseTo(1.4, 1);
        return {...(await boardStats(page)), weights: await h.boardWeights(page)};
    },
    exitStep: 3,
    duringLesson: async page => {
        await expectWeights(page, [1, 2.2, 0.52, 1.14], 'lesson scene weights');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(async () => Number(await rangeSlider(page, '1.5').inputValue()), {message: 'extrapolation slider restored'}).toBeCloseTo(1.4, 1);
        expect(before.weights, 'weight labels are off before the lesson').toEqual([]);
        await expectWeights(page, [], 'weight labels hidden again after exit');
        expect((await boardStats(page)).points).toBe(before.points);
    },
    stableCounts: async page => ({t: Number(await rangeSlider(page, '1.5').inputValue())}),
};

const LESSONS = [bernstein, rationalElevation, weighted, uniformPh, subdivision, repeatedSubdivision, rationalSubdivision, extrapolation, rationalExtrapolation];

// ---------------------------------------------------------------- Generic tests
async function openLesson(page, row, language) {
    await h.useLanguage(page, language);
    await page.goto(`${row.path}?learn=1`, {waitUntil: 'domcontentloaded'});
    await expect(lessonPanel(page)).toBeVisible();
}

for (const row of LESSONS) {
    const lastStep = new RegExp(`Step ${row.steps} of ${row.steps}`);
    const minFrames = row.minFrames ?? 10;

    test.describe(`Lesson ${row.id}`, () => {
        test.setTimeout(150_000);

        test('?learn=1 opens the Slovenian lesson; Next traverses every frame, then completes', async ({page}) => {
            await openLesson(page, row, 'sl');
            await expect(lessonHeading(page)).toHaveText(row.titles.sl);
            await expect(backButton(page)).toBeDisabled();
            const ctx = row.setup ? await row.setup(page) : undefined;
            const seen = await stepToCompletion(page, async label => {
                if (row.stepProbe) await row.stepProbe(page, ctx, stepNumber(label), label);
            });
            expect(new Set(seen.map(stepNumber)), 'every step visited').toEqual(new Set(Array.from({length: row.steps}, (_, i) => i + 1)));
            expect(seen.length, 'frames visited').toBeGreaterThanOrEqual(minFrames);
        });

        test('Back is lossless in both directions and the English lesson completes', async ({page}) => {
            await openLesson(page, row, 'en');
            await expect(lessonHeading(page)).toHaveText(row.titles.en);
            const ctx = row.setup ? await row.setup(page) : undefined;
            const probe = async label => { if (row.stepProbe) await row.stepProbe(page, ctx, stepNumber(label), label); };
            const trail = [];
            for (let guard = 0; guard < 40; guard += 1) {
                const label = await progress(page);
                trail.push(label);
                if (lastStep.test(label)) break;
                await advance(page);
            }
            expect(new Set(trail.map(stepNumber)).has(row.steps)).toBe(true);
            for (let index = trail.length - 2; index >= 0; index -= 1) {
                await back(page);
                const label = await progress(page);
                expect(label).toBe(trail[index]);
                await probe(label);
            }
            await expect(backButton(page)).toBeDisabled();
            for (let index = 1; index < trail.length; index += 1) {
                await advance(page);
                const label = await progress(page);
                expect(label).toBe(trail[index]);
                await probe(label);
            }
            await stepToCompletion(page);
        });

        test('header language switch re-titles the open lesson', async ({page}) => {
            await openLesson(page, row, 'sl');
            await expect(lessonHeading(page)).toHaveText(row.titles.sl);
            await page.locator('#bezeg-language').selectOption('en');
            await expect(lessonHeading(page)).toHaveText(row.titles.en);
            await expect(exitButton(page)).toBeVisible();
        });

        if (row.prepareUserState) {
            test('Exit mid-lesson restores the user-changed state', async ({page}) => {
                await h.useLanguage(page, 'en');
                await page.goto(row.path, {waitUntil: 'domcontentloaded'});
                const ctx = row.setup ? await row.setup(page) : undefined;
                const saved = await row.prepareUserState(page, ctx);
                await learnButton(page).click();
                await expect(lessonPanel(page)).toBeVisible();
                await advanceToStep(page, row.exitStep ?? 3);
                if (row.duringLesson) await row.duringLesson(page, ctx, saved);
                await exitButton(page).click();
                await expect(lessonPanel(page)).toHaveCount(0);
                await row.assertUserState(page, ctx, saved);
            });
        }

        test('re-entering the lesson three times keeps board counts stable', async ({page}) => {
            await h.useLanguage(page, 'en');
            await page.goto(row.path, {waitUntil: 'domcontentloaded'});
            const ctx = row.setup ? await row.setup(page) : undefined;
            if (row.assertBaseline) await row.assertBaseline(page, ctx);
            const snapshot = async () => {
                const stats = await boardStats(page);
                return {curves: stats.curves, points: stats.points, total: stats.total, ...(row.stableCounts ? await row.stableCounts(page, ctx) : {})};
            };
            const baseline = await snapshot();
            const step = row.reentryStep ?? 3;
            for (let round = 0; round < 3; round += 1) {
                await learnButton(page).click();
                await expect(lessonPanel(page)).toBeVisible();
                await advanceToStep(page, step);
                if (row.stepProbe) await row.stepProbe(page, ctx, step, `round ${round} step ${step}`);
                await exitButton(page).click();
                await expect(lessonPanel(page)).toHaveCount(0);
                await expect.poll(snapshot, {message: `board counts after round ${round}`}).toEqual(baseline);
            }
        });

        test('Continue lesson is clickable at its center on every observation frame', async ({page}) => {
            await openLesson(page, row, 'en');
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

        test('Next is reachable via Tab and activated with Enter', async ({page}) => {
            await openLesson(page, row, 'en');
            const before = await progress(page);
            await h.pressNextWithKeyboard(page);
            await expect.poll(() => progress(page)).not.toBe(before);
        });

        test.describe('narrow viewport', () => {
            test.use({viewport: {width: 390, height: 844}});
            test('lesson controls are visible and the page has no horizontal overflow on any frame', async ({page}) => {
                await openLesson(page, row, 'en');
                const lesson = lessonPanel(page);
                for (const control of [nextButton(page), exitButton(page)]) {
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
                await expect(lesson).toBeAttached();
            });
        });
    });
}

// ---------------------------------------------------------------- Extras: Bernstein
test.describe('Bernstein extras', () => {
    test.setTimeout(150_000);

    test('stacked-area step reflects the switch ON and stepping back/forth does not accumulate curves', async ({page}) => {
        await openLesson(page, bernstein, 'en');
        for (let guard = 0; guard < 20; guard += 1) {
            if (/Step 4 of 5/.test(await progress(page))) break;
            await advance(page);
        }
        expect(await progress(page)).toMatch(/Step 4 of 5/);
        const stacked = stackedSwitch(page);
        await expect.poll(() => stacked.isChecked(), {message: 'stacked switch ON at the stacked-area step'}).toBe(true);
        expect(await degree(page)).toBe(3);
        const stackedStats = await boardStats(page);
        expect(stackedStats.curves).toBeGreaterThanOrEqual(4);
        expect(stackedStats.curves).toBeLessThanOrEqual(12);

        // Step 3 (degree 3, not stacked) as the comparison point.
        await back(page);
        expect(await progress(page)).toMatch(/Step 3 of 5/);
        const calcStats = await boardStats(page);
        await expect.poll(() => stacked.isChecked()).toBe(false);
        const stackedCounts = [];
        const calcCounts = [calcStats.curves];
        for (let round = 0; round < 5; round += 1) {
            await advance(page);
            expect(await progress(page)).toMatch(/Step 4 of 5/);
            await expect.poll(() => stacked.isChecked()).toBe(true);
            stackedCounts.push((await boardStats(page)).curves);
            await back(page);
            expect(await progress(page)).toMatch(/Step 3 of 5/);
            calcCounts.push((await boardStats(page)).curves);
        }
        const unique = array => [...new Set(array)];
        expect(unique(stackedCounts), `stacked-step curve counts ${stackedCounts}`).toEqual([stackedStats.curves]);
        expect(unique(calcCounts), `step-3 curve counts ${calcCounts}`).toEqual([calcStats.curves]);
    });

    test('Back all the way to the first frame after a forward walk lands on the first frame', async ({page}) => {
        await openLesson(page, bernstein, 'en');
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
    });

    test('?learn=1 exit restores degree 1 / stacked off and re-entry does not accumulate objects', async ({page}) => {
        await openLesson(page, bernstein, 'en');
        for (let guard = 0; guard < 20; guard += 1) {
            if (/Step 4 of 5/.test(await progress(page))) break;
            await advance(page);
        }
        await exitButton(page).click();
        await expect(lessonPanel(page)).toHaveCount(0);
        await expect.poll(() => degree(page)).toBe(1);
        await expect.poll(async () => (await stackedSwitch(page)).isChecked()).toBe(false);
        const afterFirst = await boardStats(page);
        for (let round = 0; round < 3; round += 1) {
            await learnButton(page).click();
            await expect(lessonPanel(page)).toBeVisible();
            await advance(page); await advance(page); await advance(page);
            await exitButton(page).click();
            await expect(lessonPanel(page)).toHaveCount(0);
        }
        await expect.poll(() => degree(page)).toBe(1);
        const afterRepeat = await boardStats(page);
        expect(afterRepeat.curves).toBe(afterFirst.curves);
        expect(afterRepeat.total, 'board object total stable across re-entry').toBe(afterFirst.total);
    });
});

// ---------------------------------------------------------------- Extras: rational elevation
test.describe('Rational elevation extras', () => {
    test.setTimeout(150_000);

    test('?learn=1 steps through to completion; point count rises to 5 then 6; Exit restores 4; weight labels show', async ({page}) => {
        await openLesson(page, rationalElevation, 'en');
        const lesson = lessonPanel(page);
        await expect.poll(async () => (await boardStats(page)).points).toBe(4);
        const pointsByLabel = [];
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

        await exitButton(page).click();
        await expect(lessonPanel(page)).toHaveCount(0);
        await expect.poll(async () => (await boardStats(page)).points, {message: 'points restored after exit'}).toBe(4);
    });
});

test.describe('Rational elevation outside lessons', () => {
    test.setTimeout(150_000);
    const RATIONAL = rationalElevation.path;

    async function selectCurve(page) {
        await page.locator('.inspector-tabs').getByRole('button', {name: 'Edit'}).click();
        await page.locator('.workspace-curve-picker button').first().click();
        await expect(page.locator('.workspace-curve-picker button[aria-pressed="true"]')).toHaveCount(1);
    }

    test('Dvigni stopnjo with weight labels shown rebuilds points (4 -> 5 -> 6) and labels', async ({page}) => {
        await h.useLanguage(page, 'en');
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
        await h.useLanguage(page, 'en');
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
