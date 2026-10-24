/*
 * Data-driven guided-lesson smoke spec.
 *
 * ADDING A LESSON: append one row to LESSONS below. Three tests run for every row:
 *   1. sl forward walk: deep link + title, setup, every frame probed (stepProbe), observation frames go through the
 *      real flow (observe button, graph unlocked, Continue hit-tested at its center, Continue advances), completion.
 *   2. en Exit/re-entry: setup, prepareUserState, short Back/Next check at exitStep, duringLesson, Exit,
 *      assertUserState, then two re-entry rounds with a stable board snapshot (curves/points/total + stableCounts).
 *   3. 390x844 narrow viewport: Next/Exit visible; calculation and notation frames have no horizontal overflow and
 *      a pointer-clickable Next.
 * Shared GuidedLesson runtime behaviour (header language switch, Tab+Enter on Next, lossless Back walk) is not
 * repeated per row; it runs on SHARED_RUNTIME_ROWS in the 'Shared lesson runtime' block. No new spec file is needed.
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
 *                                      of the forward walk, around the short Back check, and during re-entry.
 *   prepareUserState(page, ctx)        optional (absent = skip the user-state parts); with no lesson open, changes a user
 *                                      control and returns a `saved` value (usually before-lesson board stats).
 *   exitStep  number?                  step to advance to before exiting (default 3).
 *   duringLesson(page, ctx, saved)     optional; asserts the lesson scene replaced the user state at exitStep.
 *   assertUserState(page, ctx, saved)  asserts the user state is restored after Exit.
 *   stableCounts(page, ctx)            optional; returns an object that must be identical before and after each
 *                                      of two enter/advance/exit rounds (board curves/points/total are always
 *                                      compared too).
 *   assertBaseline(page, ctx)          optional; sanity checks on the untouched route before re-entry rounds.
 *   reentryStep number?                step reached in each re-entry round (default 3).
 * Lesson-specific tests that do not fit the table live in the "extras" blocks at the bottom of this file.
 */
const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');

const {lessonPanel, nextButton, backButton, exitButton, exitAndConfirm, learnButton, lessonHeading, boardStats, settle, progress,
    stepNumber, isFinishing, advance, back, advanceToStep, stepToCompletion, noHorizontalOverflow} = h;

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
// The stacked switch lives on the Display tab; reads go through the label so hidden tab sections are still reachable.
const stackedSwitch = page => page.getByLabel('Stacked area chart', {exact: true});

const degree = page => h.countSetterValue(page, 0);

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
        const action = lesson.locator('.guided-lesson-actions button:not(.guided-lesson-observe):not(.guided-lesson-continue)');
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
    samplesByStep: [3, 3, 3, 10, 20],
    hasMode: false,
});
const uniformPh = parameterizationRow({
    id: 'param-uniform-ph',
    path: `${BASE}/param/param/uniform`,
    titles: {sl: 'Enakomerna parametrizacija PH krivulje', en: 'Uniform parameterization of a PH curve'},
    samplesByStep: [3, 3, 3, 10, 10],
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

// ---------------------------------------------------------------- Rational construction lessons (Cohort B)
// The inspector renders its sliders in DOM order; the route-specific ones come before "Graph element size" (max 25).
const inspectorRange = (page, index) => page.locator('input[type="range"]').nth(index);
const rangeValue = async (page, index) => Number(await inspectorRange(page, index).inputValue());
const expectRange = (page, index, expected, message, digits = 1) =>
    expect.poll(() => rangeValue(page, index), {message}).toBeCloseTo(expected, digits);
// Switches and counters are looked up by label in either language (the lesson tests run in sl and en).
const SWITCH_NAMES = {farin: ['Farin points', 'Farinove Točke'], weights: ['Weights', 'Uteži'], standard: ['Standard form', 'Standardna Oblika'],
    labels: ['Label all points', 'Označi vse točke'], hideFixed: ['Hide fixed points', 'Skrij fiksne točke'], polygon: ['Control polygon', 'Kontrolni poligon']};
// Reads the state straight from the DOM: the inspector is inert during lesson overlays and some switches sit on a hidden tab.
const switchByName = (page, key) => ({
    isChecked: () => page.evaluate(names => {
        const input = [...document.querySelectorAll('input[type="checkbox"]')].find(candidate => names.includes(candidate.labels?.[0]?.textContent?.trim()));
        if (!input) throw new Error(`switch not found: ${names}`);
        return input.checked;
    }, SWITCH_NAMES[key]),
    locator: () => page.getByLabel(new RegExp(`^(${SWITCH_NAMES[key].join('|')})$`)).first(),
});
// Some switches live on the Display tab; open it when the switch is not currently visible.
async function setSwitch(page, key, on) {
    const control = switchByName(page, key).locator();
    if (!(await control.isVisible())) await page.locator('.inspector-tabs button').nth(1).click();
    await control.setChecked(on);
}
// Range inputs only accept values on their step grid; snap the target onto it before filling.
async function setRange(page, index, target) {
    const input = inspectorRange(page, index);
    const value = await input.evaluate((el, wanted) => {
        const min = Number(el.min), step = Number(el.step) || 1;
        return String(Number((min + Math.round((wanted - min) / step) * step).toPrecision(10)));
    }, target);
    await input.fill(value);
}
const countValue = (page, index) => h.countSetterValue(page, index);
const expectCount = (page, index, expected, message) => expect.poll(() => countValue(page, index), {message}).toBe(expected);

const alternativeDeCasteljau = {
    id: 'decasteljau-alternative',
    path: `${BASE}/bezier/decasteljau2`,
    titles: {sl: 'Alternativna De Casteljaujeva rekurzija', en: 'The alternative de Casteljau recursion'},
    steps: 7,
    minFrames: 18, // 3 + 3 + 2 + 3 + 3 + 2 + 2 frames
    setup: async page => {
        // The curve plus its two helper curves of one degree less (a cubic fixture in steps 1-2, the default quartic later).
        await expect.poll(async () => (await boardStats(page)).curves).toBe(3);
        return {points: (await boardStats(page)).points};
    },
    stepProbe: async (page, ctx, step, label) => {
        await expectRange(page, 0, [0.5, 0.25, 0.5, 0.5, 0.25, 0.75, 0.5][step - 1], `t slider at ${label}`, 2);
        const stats = await boardStats(page);
        expect(stats.curves, `curve + two helper curves at ${label}`).toBe(3);
        // The point count is stable per degree, and the quartic has exactly one control point more than the cubic.
        const degree = step <= 2 ? 'cubic' : 'quartic';
        ctx[degree] ??= stats.points;
        expect(stats.points, `points stable for the ${degree} at ${label}`).toBe(ctx[degree]);
        if (ctx.cubic !== undefined && ctx.quartic !== undefined) expect(ctx.quartic - ctx.cubic, `one more control point at ${label}`).toBe(1);
    },
    prepareUserState: async page => {
        await setRange(page, 0, 0.8);
        await expectRange(page, 0, 0.8, 'user-set t', 1);
        return await boardStats(page);
    },
    exitStep: 5,
    duringLesson: async page => { await expectRange(page, 0, 0.25, 'lesson scene replaces the user t', 2); },
    assertUserState: async (page, ctx, before) => {
        await expectRange(page, 0, 0.8, 't restored after exit', 1);
        const after = await boardStats(page);
        expect(after.curves).toBe(before.curves);
        expect(after.points).toBe(before.points);
    },
    stableCounts: async page => ({t: await rangeValue(page, 0)}),
};

const farinSwitches = async page => ({
    farin: await switchByName(page, 'farin').isChecked(),
    weights: await switchByName(page, 'weights').isChecked(),
    standard: await switchByName(page, 'standard').isChecked(),
});

const farin = {
    id: 'farin',
    path: `${BASE}/rational/farin-points`,
    titles: {sl: 'Farinove točke in uteži', en: 'Farin points and weights'},
    steps: 5,
    minFrames: 14, // 2 + 3 + 3 + 3 + 3 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBe(4);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const weights = [[1, 2, 1, 1], [1, 2, 1, 1], [1, 2, 1, 1], [1, 3, 9, 27], [1, 1, 1, 1]][step - 1];
        await expectWeights(page, weights, `weight labels at ${label}`);
        // Farin points are the 3 sliders on the board, visible from step 2; the control points stay draggable.
        await expect.poll(async () => (await boardStats(page)).sliders, {message: `Farin points at ${label}`}).toBe(step === 1 ? 0 : 3);
        await expect.poll(() => farinSwitches(page), {message: `switches at ${label}`}).toEqual({farin: step >= 2, weights: true, standard: step === 5});
        expect((await boardStats(page)).points, `4 control points at ${label}`).toBe(4);
        expect(await page.locator('#jgbox').evaluate(container => {
            const board = Object.values(window.JXG.boards).find(candidate => candidate.containerObj === container);
            return Object.values(board.objects).filter(o => o.elType === 'point' && o.visPropCalc.visible && o.rendNode?.isConnected).map(o => Boolean(o.visProp.fixed));
        }), `control points stay draggable at ${label}`).toEqual([false, false, false, false]);
    },
    prepareUserState: async page => {
        await setSwitch(page, 'farin', true);
        await expect.poll(async () => (await boardStats(page)).sliders).toBe(3);
        return {...(await boardStats(page)), switches: await farinSwitches(page)};
    },
    // Step 1 shows weights but not the Farin points: the lesson scene replaces the user's Farin switch.
    exitStep: 1,
    duringLesson: async page => {
        await expect.poll(() => farinSwitches(page), {message: 'lesson scene replaces the user switches'}).toEqual({farin: false, weights: true, standard: false});
    },
    assertUserState: async (page, ctx, saved) => {
        await expect.poll(() => farinSwitches(page), {message: 'user switches restored after exit'}).toEqual(saved.switches);
        await expect.poll(async () => (await boardStats(page)).sliders).toBe(saved.sliders);
        await expectWeights(page, [], 'weight labels hidden again after exit');
    },
    reentryStep: 5,
    stableCounts: async page => ({switches: await farinSwitches(page)}),
};

const circle = {
    id: 'circle',
    path: `${BASE}/rational/circlen`,
    // The title contains inline math (n), so the heading text includes the rendered math glyph.
    titles: {sl: /^Krog iz .+ racionalnih kosov$/, en: /^A circle from .+ rational pieces$/},
    steps: 5,
    minFrames: 13, // 2 + 3 + 3 + 3 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).curves).toBe(3);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const pieces = [3, 3, 4, 6, 12][step - 1];
        await expectCount(page, 0, pieces, `piece counter at ${label}`);
        await expect.poll(async () => (await boardStats(page)).curves, {message: `${pieces} curves at ${label}`}).toBe(pieces);
        expect((await boardStats(page)).points, `3 control points per piece at ${label}`).toBe(3 * pieces);
    },
    prepareUserState: async page => {
        await page.getByRole('button', {name: 'Increase count'}).click();
        await page.getByRole('button', {name: 'Increase count'}).click();
        await expectCount(page, 0, 5, 'user-set piece count');
        await expect.poll(async () => (await boardStats(page)).curves).toBe(5);
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expectCount(page, 0, 4, 'lesson scene replaces the user piece count');
        await expect.poll(async () => (await boardStats(page)).curves).toBe(4);
    },
    assertUserState: async (page, ctx, before) => {
        await expectCount(page, 0, 5, 'piece counter restored after exit');
        await expect.poll(async () => (await boardStats(page)).curves, {message: 'curves restored'}).toBe(before.curves);
        expect((await boardStats(page)).points).toBe(before.points);
    },
    stableCounts: async page => ({pieces: await countValue(page, 0)}),
};

// Spline lessons: "Label all points" and "Hide fixed points" are plain switches; derived points are the fixed ones.
const splineSwitches = async page => ({
    labels: await switchByName(page, 'labels').isChecked(),
    hideFixed: await switchByName(page, 'hideFixed').isChecked(),
    polygon: await switchByName(page, 'polygon').isChecked(),
});

// Visible board points outside the current view box (derived points of high-order splines can be far away).
const offscreenPoints = page => page.locator('#jgbox').evaluate(container => {
    const board = Object.values(window.JXG.boards).find(candidate => candidate.containerObj === container);
    const [left, top, right, bottom] = board.getBoundingBox();
    return Object.values(board.objects).filter(o => o.elType === 'point' && o.visPropCalc.visible && o.rendNode?.isConnected)
        .filter(o => o.X() < left || o.X() > right || o.Y() > top || o.Y() < bottom).length;
});

const splineCn = {
    id: 'spline-cn',
    path: `${BASE}/spline/spline`,
    titles: {sl: 'Enostranski Cⁿ zlepek', en: 'One-sided Cⁿ spline'},
    steps: 5,
    minFrames: 12, // 2 + 3 + 3 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBe(11);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        // Counter 0 is the continuity order, counter 1 the spline degree.
        const [continuity, degreeValue, points] = [[1, 2, 5], [1, 2, 5], [2, 3, 7], [1, 2, 11], [2, 3, 13]][step - 1];
        await expectCount(page, 0, continuity, `continuity at ${label}`);
        await expectCount(page, 1, degreeValue, `degree at ${label}`);
        // Steps 1-3: lesson fixtures with 4 / 4 / 5 free points plus 1 / 1 / 2 derived; step 4: the default 7 + 4; step 5: 7 + 6 derived.
        await expect.poll(async () => (await boardStats(page)).points, {message: `free + derived points at ${label}`}).toBe(points);
        expect((await boardStats(page)).curves, `one drawn spline curve at ${label}`).toBe(1);
        expect((await splineSwitches(page)).polygon, `control polygon at ${label}`).toBe(step === 2);
        // Fixture scenes set their own view, including the far-reaching limitations example at step 5.
        if (step !== 4) expect(await offscreenPoints(page), `all points inside the lesson view at ${label}`).toBe(0);
    },
    prepareUserState: async page => {
        await page.getByRole('button', {name: 'Increase count'}).nth(1).click();
        await expectCount(page, 1, 3, 'user-set degree');
        await setSwitch(page, 'labels', false);
        return {...(await boardStats(page)), switches: await splineSwitches(page)};
    },
    exitStep: 2,
    duringLesson: async page => {
        await expectCount(page, 1, 2, 'lesson scene replaces the user degree');
        await expect.poll(async () => (await splineSwitches(page)).labels, {message: 'lesson turns the point labels on'}).toBe(true);
    },
    assertUserState: async (page, ctx, saved) => {
        await expectCount(page, 1, 3, 'degree restored after exit');
        await expectCount(page, 0, 1, 'continuity restored after exit');
        await expect.poll(() => splineSwitches(page), {message: 'switches restored after exit'}).toEqual(saved.switches);
        await expect.poll(async () => (await boardStats(page)).points).toBe(saved.points);
    },
    reentryStep: 3,
    stableCounts: async page => ({continuity: await countValue(page, 0), degree: await countValue(page, 1), switches: await splineSwitches(page)}),
};

// Symmetric splines: free points plus derived joints and inner points; lesson fixtures replace the default 6 / 7 free points in most steps.
// `stepPoints` gives the per-step point count where lesson fixtures replace the default scene.
function symmetricSplineRow({id, path, titles, steps, minFrames, points, polygonSteps, stepPoints}) {
    return {
        id, path, titles, steps, minFrames,
        setup: async page => {
            await expect.poll(async () => (await boardStats(page)).points).toBe(points);
            return {};
        },
        stepProbe: async (page, ctx, step, label) => {
            const expected = stepPoints ? stepPoints[step - 1] : points;
            await expect.poll(async () => (await boardStats(page)).points, {message: `free + derived points at ${label}`}).toBe(expected);
            expect((await boardStats(page)).curves, `one drawn spline curve at ${label}`).toBe(1);
            const switches = await splineSwitches(page);
            expect(switches.polygon, `control polygon at ${label}`).toBe(polygonSteps.includes(step));
            expect(switches.hideFixed, `derived points stay visible at ${label}`).toBe(false);
        },
        prepareUserState: async page => {
            await setSwitch(page, 'hideFixed', true);
            await expect.poll(async () => (await boardStats(page)).points).toBeLessThan(points);
            await setSwitch(page, 'labels', false);
            return {...(await boardStats(page)), switches: await splineSwitches(page)};
        },
        exitStep: 2,
        duringLesson: async page => {
            await expect.poll(() => splineSwitches(page), {message: 'lesson scene replaces the user switches'})
                .toMatchObject({labels: true, hideFixed: false});
            expect((await boardStats(page)).points).toBe(stepPoints ? stepPoints[1] : points);
        },
        assertUserState: async (page, ctx, saved) => {
            await expect.poll(() => splineSwitches(page), {message: 'switches restored after exit'}).toEqual(saved.switches);
            await expect.poll(async () => (await boardStats(page)).points, {message: 'hidden derived points restored'}).toBe(saved.points);
        },
        reentryStep: 3,
        stableCounts: async page => ({switches: await splineSwitches(page)}),
    };
}

const splineC1 = symmetricSplineRow({
    id: 'spline-c1', path: `${BASE}/spline/c1spline`, titles: {sl: 'Simetrični C¹ zlepek', en: 'Symmetric C¹ spline'},
    steps: 5, minFrames: 12, points: 9, polygonSteps: [2, 3], // 6 free points + 3 joints; 2 + 3 + 2 + 2 + 3 frames
    stepPoints: [5, 5, 5, 9, 5], // fixtures: 4 free + 1 joint; step 4 keeps the default
});
const splineC2 = symmetricSplineRow({
    id: 'spline-c2', path: `${BASE}/spline/c2spline`, titles: {sl: 'Simetrični C² zlepek', en: 'Symmetric C² spline'},
    steps: 4, minFrames: 10, points: 16, polygonSteps: [2, 3], // 7 free points + 9 derived; 2 + 3 + 3 + 2 frames
    stepPoints: [12, 12, 12, 16], // fixtures: 6 free + 6 derived; step 4 keeps the default
});

// G1 splines: sliders are the first inspector ranges (b for the one-sided, beta for the symmetric spline).
const splineG1 = {
    id: 'spline-g1',
    path: `${BASE}/spline/g1spline`,
    titles: {sl: 'Enostranski G¹ zlepek', en: 'One-sided G¹ spline'},
    steps: 5,
    minFrames: 12, // 2 + 3 + 3 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBe(7);
        await expect(page.getByText('Parameter b', {exact: true}).first(), 'sliders are labelled "Parameter b"').toBeVisible();
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        // The slider snaps to its grid (b = 1 reads 0.9967), hence the tolerance of 0.05.
        await expectRange(page, 0, [1, 1, 0.25, 2.5, 0.25][step - 1], `first b slider at ${label}`);
        // Steps 1-4: one joint (4 free + 1 derived, one slider); step 5: the chain (5 free + 2 derived, two sliders).
        if (step === 5) await expectRange(page, 1, 1, `second b slider unchanged at ${label}`);
        const points = [5, 5, 5, 5, 7][step - 1];
        await expect.poll(async () => (await boardStats(page)).points, {message: `free + derived points at ${label}`}).toBe(points);
        // Even at b = 5/2 the derived point must stay inside the lesson view.
        expect(await offscreenPoints(page), `all points visible in the lesson view at ${label}`).toBe(0);
        expect((await splineSwitches(page)).polygon, `control polygon at ${label}`).toBe(step >= 2);
    },
    prepareUserState: async page => {
        await setRange(page, 0, 1.5);
        await expectRange(page, 0, 1.5, 'user-set b');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => { await expectRange(page, 0, 0.25, 'lesson scene replaces the user b'); },
    assertUserState: async (page, ctx, before) => {
        await expectRange(page, 0, 1.5, 'b restored after exit');
        await expectRange(page, 1, 1, 'second b untouched');
        expect((await boardStats(page)).points).toBe(before.points);
    },
    stableCounts: async page => ({b0: Math.round((await rangeValue(page, 0)) * 100)}),
};

const splineG1Symmetric = {
    id: 'spline-g1-symmetric',
    path: `${BASE}/spline/g1-sym-spline`,
    titles: {sl: 'Simetrični G¹ zlepek', en: 'Symmetric G¹ spline'},
    steps: 5,
    minFrames: 12, // 2 + 3 + 3 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBe(9);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        // beta0, beta1, beta2 sliders; the slider grid is 0.005 wide, so 0.25 reads 0.245.
        // Only step 4 keeps the default scene with three sliders; the other steps are one-joint fixtures.
        const betas = [[0.5], [0.25], [0.75], [0.5, 0.75, 0.5], [0.99]][step - 1];
        for (const [index, value] of betas.entries()) await expectRange(page, index, value, `beta${index} at ${label}`);
        const points = [5, 5, 5, 9, 5][step - 1];
        await expect.poll(async () => (await boardStats(page)).points, {message: `free + joint points at ${label}`}).toBe(points);
        expect(await offscreenPoints(page), `all points visible at ${label}`).toBe(0);
        expect((await splineSwitches(page)).polygon, `control polygon at ${label}`).toBe(step <= 3);
    },
    prepareUserState: async page => {
        await setRange(page, 0, 0.3);
        await expectRange(page, 0, 0.3, 'user-set beta0');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => { await expectRange(page, 0, 0.75, 'lesson scene replaces the user beta0'); },
    assertUserState: async (page, ctx, before) => {
        await expectRange(page, 0, 0.3, 'beta0 restored after exit');
        expect((await boardStats(page)).points).toBe(before.points);
    },
    stableCounts: async page => ({b0: Math.round((await rangeValue(page, 0)) * 100)}),
};

const splineParameterization = {
    id: 'spline-parameterization',
    path: `${BASE}/param/param/alphaparam2`,
    titles: {sl: 'α-parametrizacije zlepka', en: 'α-parameterizations of a spline'},
    steps: 5,
    minFrames: 12, // 2 + 3 + 2 + 3 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBe(34);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        // Range 0 is alpha (0..1), range 1 the number of sample points (0..50).
        await expectRange(page, 0, [0.5, 0.5, 0, 1, 0.5][step - 1], `alpha at ${label}`, 2);
        await expectRange(page, 1, 10, `samples at ${label}`, 0);
        // Every step is the lesson fixture: 8 free + 12 derived points (joints visible) + 10 samples.
        await expect.poll(async () => (await boardStats(page)).points, {message: `points at ${label}`}).toBe(30);
        expect((await boardStats(page)).curves, `one spline curve at ${label}`).toBe(1);
        expect((await splineSwitches(page)).hideFixed, `derived points visible at ${label}`).toBe(false);
    },
    prepareUserState: async page => {
        await setRange(page, 0, 0.8);
        await setRange(page, 1, 7);
        await expectRange(page, 1, 7, 'user-set samples', 0);
        await expect.poll(async () => (await boardStats(page)).points).toBe(9 + 7);
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expectRange(page, 0, 0, 'lesson scene replaces the user alpha', 2);
        await expectRange(page, 1, 10, 'lesson scene replaces the user samples', 0);
    },
    assertUserState: async (page, ctx, before) => {
        await expectRange(page, 0, 0.8, 'alpha restored after exit', 2);
        await expectRange(page, 1, 7, 'samples restored after exit', 0);
        await expect.poll(async () => (await boardStats(page)).points, {message: 'points restored (derived points hidden again)'}).toBe(before.points);
        expect((await splineSwitches(page)).hideFixed).toBe(true);
    },
    reentryStep: 4,
    stableCounts: async page => ({alpha: Math.round((await rangeValue(page, 0)) * 100), samples: await rangeValue(page, 1)}),
};

// ---------------------------------------------------------------- Linear function
const linearField = (page, label) => page.getByLabel(label, {exact: true});
// The equation is the board's and the inspector's most important readout; compare it without language-specific punctuation.
const linearEquation = async page => (await page.locator('[data-readout="equation"] dd').innerText()).replace('−', '-').replace(',', '.');
// Per step: equation and the two draggable points (default scene, worked example, n = -2, k = -1/2, vertical line).
const LINEAR_STEPS = [
    {equation: 'y = 2x + 1', points: [[0, 1], [2, 5]]},
    {equation: 'y = 2x + 1', points: [[0, 1], [2, 5]]},
    {equation: 'y = 2x - 2', points: [[0, -2], [2, 2]]},
    {equation: 'y = -0.5x + 1', points: [[0, 1], [2, 0]]},
    {equation: 'x = 1', points: [[1, -1], [1, 3]]},
];

const linear = {
    id: 'linear-function',
    path: `${BASE}/functions/linear`,
    titles: {sl: 'Linearna funkcija', en: 'Linear function'},
    steps: 5,
    minFrames: 11, // 2 + 3 + 2 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(2);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = LINEAR_STEPS[step - 1];
        await expect.poll(() => linearEquation(page), {message: `equation at ${label}`}).toBe(expected.equation);
        for (const point of expected.points) await expectPointNear(page, point, `point near (${point}) at ${label}`);
        const stats = await boardStats(page);
        expect(stats.curves, `no stray curves at ${label}`).toBe(0);
        expect(stats.total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(40);
    },
    prepareUserState: async page => {
        await linearField(page, 'x₂').fill('3');
        await expect.poll(() => linearEquation(page)).toBe('y = 1.33x + 1');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expectPointNear(page, [2, 2], 'lesson scene replaced the user point');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => linearEquation(page), {message: 'user line restored'}).toBe('y = 1.33x + 1');
        await expect(linearField(page, 'x₂')).toHaveValue('3');
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({equation: await linearEquation(page)}),
};

// ---------------------------------------------------------------- Exponential function
const exponentialReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace('−', '-').replace(',', '.');
// Per step: base a (readout and f(1)) and whether the dashed mirror graph is visible (default, doubling, a = 0.5, mirror, above the axis).
const EXPONENTIAL_STEPS = [
    {a: '2', mirror: false}, {a: '2', mirror: false}, {a: '0.5', mirror: false}, {a: '2', mirror: true}, {a: '2', mirror: false},
];

const exponential = {
    id: 'exponential-function',
    path: `${BASE}/functions/exponential`,
    titles: {sl: 'Eksponentna funkcija', en: 'Exponential function'},
    steps: 5,
    minFrames: 11, // 2 + 3 + 2 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(2);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = EXPONENTIAL_STEPS[step - 1];
        await expect.poll(() => exponentialReadout(page, 'a'), {message: `base at ${label}`}).toBe(expected.a);
        await expect.poll(() => exponentialReadout(page, 'f1'), {message: `f(1) at ${label}`}).toBe(expected.a);
        await expectPointNear(page, [0, 1], `point (0,1) at ${label}`);
        await expectPointNear(page, [1, Number(expected.a)], `point (1,a) at ${label}`);
        await expect.poll(async () => (await boardStats(page)).visibleCurves, {message: `visible graphs at ${label}`}).toBe(expected.mirror ? 2 : 1);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(40);
    },
    prepareUserState: async page => {
        await rangeSlider(page, 5).fill('3');
        await expect.poll(() => exponentialReadout(page, 'a')).toBe('3');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => exponentialReadout(page, 'a'), {message: 'lesson scene replaced the user base'}).toBe('0.5');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => exponentialReadout(page, 'a'), {message: 'user base restored'}).toBe('3');
        await expectPointNear(page, [1, 3], 'user point (1,a) restored');
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({a: await exponentialReadout(page, 'a')}),
};

// ---------------------------------------------------------------- Trigonometric functions
const trigReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace(/−/g, '-').replace(',', '.');
// The range lists its two numbers (separated by ; or , depending on the language); tangent has none.
const trigRange = async page => ((await page.locator('[data-readout="range"] dd').innerText()).replace(/−/g, '-').match(/-?\d+(?:[.,]\d+)?/g) || []).map(value => value.replace(',', '.'));
// Per step: equation, period, phase shift (with exact multiples of pi), range and the number of visible graph curves
// (midline + main graph; the reference graph and, for tan, the asymptotes add one). Steps: default, amplitude, vertical shift, frequency, phase (cosine as shifted sine), combined worked example, tangent.
const TRIG_STEPS = [
    {equation: 'f(x) = sin(x)', period: '6.28 (2π)', shift: '0', range: ['-1', '1'], curves: 2},
    {equation: 'f(x) = 2·sin(x)', period: '6.28 (2π)', shift: '0', range: ['-2', '2'], curves: 3},
    {equation: 'f(x) = sin(x) + 1', period: '6.28 (2π)', shift: '0', range: ['0', '2'], curves: 3},
    {equation: 'f(x) = sin(2x)', period: '3.14 (π)', shift: '0', range: ['-1', '1'], curves: 3},
    {equation: 'f(x) = sin(x + π/2)', period: '6.28 (2π)', shift: '-1.57 (-π/2)', range: ['-1', '1'], curves: 3},
    {equation: 'f(x) = 2·sin(2x + π/2) + 1', period: '3.14 (π)', shift: '-0.79 (-π/4)', range: ['-1', '3'], curves: 2},
    {equation: 'f(x) = tan(x)', period: '3.14 (π)', shift: '0', range: [], curves: 3},
];

const trigonometric = {
    id: 'trigonometric-functions',
    path: `${BASE}/functions/trigonometric`,
    titles: {sl: 'Trigonometrične funkcije', en: 'Trigonometric functions'},
    steps: 7,
    minFrames: 15, // 2 + 2 + 2 + 2 + 2 + 3 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).curves).toBeGreaterThanOrEqual(2);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = TRIG_STEPS[step - 1];
        await expect.poll(() => trigReadout(page, 'equation'), {message: `equation at ${label}`}).toBe(expected.equation);
        await expect.poll(() => trigReadout(page, 'period'), {message: `period at ${label}`}).toBe(expected.period);
        await expect.poll(() => trigReadout(page, 'shift'), {message: `phase shift at ${label}`}).toBe(expected.shift);
        await expect.poll(() => trigRange(page), {message: `range at ${label}`}).toEqual(expected.range);
        if (step === 7) expect(await trigReadout(page, 'amplitude'), 'tangent has no amplitude').toBe('—');
        await expect.poll(async () => (await boardStats(page)).visibleCurves, {message: `visible curves at ${label}`}).toBe(expected.curves);
        await expect.poll(async () => (await boardStats(page)).drawnCurves, {message: `drawn curves at ${label}`}).toBeGreaterThanOrEqual(expected.curves);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(60);
    },
    prepareUserState: async page => {
        await rangeSlider(page, 4).fill('2');
        await expect.poll(() => trigReadout(page, 'equation')).toBe('f(x) = sin(2x)');
        return await boardStats(page);
    },
    exitStep: 6,
    duringLesson: async page => {
        await expect.poll(() => trigReadout(page, 'equation'), {message: 'lesson scene replaced the user frequency'}).toBe('f(x) = 2·sin(2x + π/2) + 1');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => trigReadout(page, 'equation'), {message: 'user frequency restored'}).toBe('f(x) = sin(2x)');
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({equation: await trigReadout(page, 'equation')}),
};

// ---------------------------------------------------------------- Continuity
const continuityReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace('−', '-').replace(',', '.');
// Per step: a, f(1) = left limit, right limit, jump and whether the function is continuous (default, jump example, condition, a = 3/2, slopes).
const CONTINUITY_STEPS = [
    {a: 1, right: '2', jump: '1', continuous: false}, {a: 1, right: '2', jump: '1', continuous: false}, {a: 1, right: '2', jump: '1', continuous: false},
    {a: 1.5, right: '1.5', jump: '0', continuous: true}, {a: 1.5, right: '1.5', jump: '0', continuous: true},
];

const continuity = {
    id: 'continuity',
    path: `${BASE}/functions/continuity`,
    titles: {sl: 'Zveznost', en: 'Continuity'},
    steps: 5,
    minFrames: 11, // 2 + 2 + 3 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(2);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = CONTINUITY_STEPS[step - 1];
        await expect.poll(() => continuityReadout(page, 'value'), {message: `f(1) at ${label}`}).toBe(String(expected.a));
        await expect.poll(() => continuityReadout(page, 'left-limit'), {message: `left limit at ${label}`}).toBe(String(expected.a));
        await expect.poll(() => continuityReadout(page, 'right-limit'), {message: `right limit at ${label}`}).toBe(expected.right);
        await expect.poll(() => continuityReadout(page, 'jump'), {message: `jump at ${label}`}).toBe(expected.jump);
        // The status is written in the page language (sl: "zvezna pri x = 1" / "skok 1 pri x = 1"; en: "continuous at x = 1" / "jump 1 at x = 1").
        expect(await continuityReadout(page, 'status'), `status at ${label}`).toMatch(expected.continuous ? /^(zvezna pri|continuous at) x = 1$/ : new RegExp(`^(skok|jump) ${expected.jump} (pri|at) x = 1$`));
        await expectPointNear(page, [1, expected.a], `filled point (1, a) at ${label}`);
        await expectPointNear(page, [1, Number(expected.right)], `hollow point (1, 3 - a) at ${label}`);
        const stats = await boardStats(page);
        expect(stats.visibleCurves, `both pieces drawn at ${label}`).toBe(2);
        expect(stats.drawnCurves, `both pieces have points at ${label}`).toBe(2);
        expect(stats.total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(40);
    },
    prepareUserState: async page => {
        await rangeSlider(page, 3).fill('2.5');
        await expect.poll(() => continuityReadout(page, 'value')).toBe('2.5');
        await expect.poll(() => continuityReadout(page, 'right-limit')).toBe('0.5');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => continuityReadout(page, 'value'), {message: 'lesson scene replaced the user parameter'}).toBe('1');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => continuityReadout(page, 'value'), {message: 'user parameter restored'}).toBe('2.5');
        await expectPointNear(page, [1, 0.5], 'user hollow point restored');
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({a: await continuityReadout(page, 'value')}),
};

// ---------------------------------------------------------------- Derivative
const derivativeReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace('−', '-').replace(',', '.');
// Per step: h, the difference quotient, f'(1), the P and Q coordinates and the number of visible curves (the function plus, when shown, the tangent).
// Steps: default, worked example h = 0.5, h = 0.1, h = -0.5 with the tangent, sin with h = 0.2 and the tangent.
const DERIVATIVE_STEPS = [
    {h: '1', quotient: '3', exact: '2', p: [1, 1], q: [2, 4], curves: 1},
    {h: '0.5', quotient: '2.5', exact: '2', p: [1, 1], q: [1.5, 2.25], curves: 1},
    {h: '0.1', quotient: '2.1', exact: '2', p: [1, 1], q: [1.1, 1.21], curves: 1},
    {h: '-0.5', quotient: '1.5', exact: '2', p: [1, 1], q: [0.5, 0.25], curves: 2},
    {h: '0.2', quotient: '0.4528', exact: '0.5403', p: [1, Math.sin(1)], q: [1.2, Math.sin(1.2)], curves: 2},
];

const derivative = {
    id: 'derivative',
    path: `${BASE}/functions/derivative`,
    titles: {sl: 'Odvod', en: 'Derivative'},
    steps: 5,
    minFrames: 11, // 2 + 3 + 2 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(2);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = DERIVATIVE_STEPS[step - 1];
        await expect.poll(() => derivativeReadout(page, 'x0'), {message: `x0 at ${label}`}).toBe('1');
        await expect.poll(() => derivativeReadout(page, 'h'), {message: `h at ${label}`}).toBe(expected.h);
        await expect.poll(() => derivativeReadout(page, 'quotient'), {message: `difference quotient at ${label}`}).toBe(expected.quotient);
        await expect.poll(() => derivativeReadout(page, 'derivative'), {message: `exact derivative at ${label}`}).toBe(expected.exact);
        await expectPointNear(page, expected.p, `point P at ${label}`);
        await expectPointNear(page, expected.q, `point Q at ${label}`);
        await expect.poll(async () => (await boardStats(page)).visibleCurves, {message: `visible curves at ${label}`}).toBe(expected.curves);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(40);
    },
    prepareUserState: async page => {
        await rangeSlider(page, 2).fill('-1.5');
        await expect.poll(() => derivativeReadout(page, 'h')).toBe('-1.5');
        await expect.poll(() => derivativeReadout(page, 'quotient')).toBe('0.5');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => derivativeReadout(page, 'h'), {message: 'lesson scene replaced the user step'}).toBe('0.1');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => derivativeReadout(page, 'h'), {message: 'user step restored'}).toBe('-1.5');
        await expectPointNear(page, [-0.5, 0.25], 'user point Q restored');
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({h: await derivativeReadout(page, 'h')}),
};

// ---------------------------------------------------------------- Definite integral
const integralReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace('−', '-').replace(',', '.');
// Per step: n, h, the signed sum, the exact integral and the bound b. Steps: default (left), right, midpoint, n = 100, sin on [0, 2*pi] with 12 midpoint rectangles.
const INTEGRAL_STEPS = [
    {n: '4', h: '0.5', sum: '1.75', exact: '2.6667', b: 2},
    {n: '4', h: '0.5', sum: '3.75', exact: '2.6667', b: 2},
    {n: '4', h: '0.5', sum: '2.625', exact: '2.6667', b: 2},
    {n: '100', h: '0.02', sum: '2.6268', exact: '2.6667', b: 2},
    {n: '12', h: '0.5236', sum: '0', exact: '0', b: 2 * Math.PI},
];

const definiteIntegral = {
    id: 'definite-integral',
    path: `${BASE}/functions/integral`,
    titles: {sl: 'Določeni integral', en: 'Definite integral'},
    steps: 5,
    minFrames: 12, // 2 + 3 + 3 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(2);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = INTEGRAL_STEPS[step - 1];
        await expect.poll(() => integralReadout(page, 'n'), {message: `n at ${label}`}).toBe(expected.n);
        await expect.poll(() => integralReadout(page, 'h'), {message: `h at ${label}`}).toBe(expected.h);
        await expect.poll(() => integralReadout(page, 'sum'), {message: `signed sum at ${label}`}).toBe(expected.sum);
        await expect.poll(() => integralReadout(page, 'exact'), {message: `exact integral at ${label}`}).toBe(expected.exact);
        await expectPointNear(page, [0, 0], `bound a at ${label}`);
        await expectPointNear(page, [expected.b, 0], `bound b at ${label}`);
        // the shapes are two curve objects whatever n is: the object count must not grow with n
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(40);
    },
    prepareUserState: async page => {
        await rangeSlider(page, 150).fill('20');
        await expect.poll(() => integralReadout(page, 'n')).toBe('20');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => integralReadout(page, 'n'), {message: 'lesson scene replaced the user n'}).toBe('4');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => integralReadout(page, 'n'), {message: 'user n restored'}).toBe('20');
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({n: await integralReadout(page, 'n')}),
};

// ---------------------------------------------------------------- Area between curves
const areaReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace('−', '-').replace(',', '.');
const AREA_S = Math.sqrt(1.5);
// Per step: the bounds a and b (as shown and as placed on the axis), the signed integral of g - f, the unsigned area and the shaded quantity of the mode.
// Steps: between [1, 3], under g on [1, 3], the default bounds (intersections), [0, 4], [1, 3.5].
const AREA_STEPS = [
    {a: '1', b: '3', pa: 1, pb: 3, signed: '4.6667', unsigned: '4.6667', shaded: '4.6667'},
    {a: '1', b: '3', pa: 1, pb: 3, signed: '4.6667', unsigned: '4.6667', shaded: '5.3333'},
    {a: '0.78', b: '3.22', pa: 2 - AREA_S, pb: 2 + AREA_S, signed: '4.899', unsigned: '4.899', shaded: '4.899'},
    {a: '0', b: '4', pa: 0, pb: 4, signed: '1.3333', unsigned: '8.4646', shaded: '8.4646'},
    {a: '1', b: '3.5', pa: 1, pb: 3.5, signed: '4.5833', unsigned: '4.9823', shaded: '4.9823'},
];

const areaBetween = {
    id: 'area-between-curves',
    path: `${BASE}/functions/area-between`,
    titles: {sl: 'Ploščina med krivuljama', en: 'Area between curves'},
    steps: 5,
    minFrames: 11, // 2 + 2 + 3 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(4);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = AREA_STEPS[step - 1];
        await expect.poll(() => areaReadout(page, 'a'), {message: `a at ${label}`}).toBe(expected.a);
        await expect.poll(() => areaReadout(page, 'b'), {message: `b at ${label}`}).toBe(expected.b);
        await expect.poll(() => areaReadout(page, 'signed'), {message: `signed integral of g - f at ${label}`}).toBe(expected.signed);
        await expect.poll(() => areaReadout(page, 'unsigned'), {message: `unsigned area at ${label}`}).toBe(expected.unsigned);
        await expect.poll(() => areaReadout(page, 'shaded'), {message: `shaded quantity at ${label}`}).toBe(expected.shaded);
        await expectPointNear(page, [expected.pa, 0], `bound a at ${label}`);
        await expectPointNear(page, [expected.pb, 0], `bound b at ${label}`);
        // the shading is two curve objects whatever the mode and the bounds are: the object count must stay put
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(60);
    },
    prepareUserState: async page => {
        await page.getByRole('spinbutton', {name: /^(Bound b|Meja b)$/}).fill('2.5');
        await expect.poll(() => areaReadout(page, 'b')).toBe('2.5');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => areaReadout(page, 'b'), {message: 'lesson scene replaced the user bound'}).toBe('3.22');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => areaReadout(page, 'b'), {message: 'user bound restored'}).toBe('2.5');
        await expectPointNear(page, [2.5, 0], 'user bound b restored');
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({b: await areaReadout(page, 'b')}),
};

// ---------------------------------------------------------------- Arc length
const arcReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace('−', '-').replace(',', '.');
// Per step: n, the displayed endpoint b, the placed endpoint B (x = b, y = sin b), the polyline length, the arc length and their difference.
// Steps: one chord, the default two chords, ten chords, a hundred chords, [0, 2*pi] with two chords.
const ARC_STEPS = [
    {n: '1', b: '3.14', pb: Math.PI, polyline: '3.1416', arc: '3.8202', difference: '0.6786'},
    {n: '2', b: '3.14', pb: Math.PI, polyline: '3.7242', arc: '3.8202', difference: '0.096'},
    {n: '10', b: '3.14', pb: Math.PI, polyline: '3.8153', arc: '3.8202', difference: '0.0049'},
    {n: '100', b: '3.14', pb: Math.PI, polyline: '3.8201', arc: '3.8202', difference: '0'},
    {n: '2', b: '6.28', pb: 2 * Math.PI, polyline: '6.2832', arc: '7.6404', difference: '1.3572'},
];

const arcLength = {
    id: 'arc-length',
    path: `${BASE}/functions/arc-length`,
    titles: {sl: 'Dolžina loka krivulje', en: 'Arc length of a curve'},
    steps: 5,
    minFrames: 11, // 2 + 3 + 2 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(2);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = ARC_STEPS[step - 1];
        await expect.poll(() => arcReadout(page, 'n'), {message: `n at ${label}`}).toBe(expected.n);
        await expect.poll(() => arcReadout(page, 'b'), {message: `b at ${label}`}).toBe(expected.b);
        await expect.poll(() => arcReadout(page, 'polyline'), {message: `polyline length at ${label}`}).toBe(expected.polyline);
        await expect.poll(() => arcReadout(page, 'arc'), {message: `arc length at ${label}`}).toBe(expected.arc);
        await expect.poll(() => arcReadout(page, 'difference'), {message: `difference at ${label}`}).toBe(expected.difference);
        await expectPointNear(page, [0, 0], `endpoint A at ${label}`);
        await expectPointNear(page, [expected.pb, Math.sin(expected.pb)], `endpoint B at ${label}`);
        // the polyline and its markers are two curve objects whatever n is: the object count must not grow with n
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(40);
    },
    prepareUserState: async page => {
        await rangeSlider(page, 100).fill('20');
        await expect.poll(() => arcReadout(page, 'n')).toBe('20');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => arcReadout(page, 'n'), {message: 'lesson scene replaced the user n'}).toBe('10');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => arcReadout(page, 'n'), {message: 'user n restored'}).toBe('20');
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({n: await arcReadout(page, 'n')}),
};

// ---------------------------------------------------------------- Bisection
const bisectionReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace('−', '-').replace(',', '.');
// Per step: the revealed step count, the midpoint (an em dash before the first reveal), f(m), the interval width and the example's endpoint a.
// Steps: the bracket at step 0, one step, three steps, five steps, the sign step after three steps, the cubic at step 0 with a = -1.5.
// The lesson shows the state after k revealed steps; the learner presses the graph's own Next step to reveal the next one.
const BISECTION_STEPS = [
    {step: '0', mid: '—', fMid: '—', width: '1', a: '1'},
    {step: '1', mid: '1.5', fMid: '0.25', width: '0.5', a: '1'},
    {step: '3', mid: '1.375', fMid: '-0.109375', width: '0.125', a: '1.25'},
    {step: '5', mid: '1.40625', fMid: '-0.0224609375', width: '0.03125', a: '1.375'},
    {step: '3', mid: '-0.25', fMid: '-1', width: '0.25', a: '-0.5'},
    {step: '0', mid: '—', fMid: '—', width: '3.5', a: '-1.5'},
];

const bisection = {
    id: 'bisection',
    path: `${BASE}/analysis/bisection`,
    titles: {sl: 'Bisekcija in izrek o vmesni vrednosti', en: 'Bisection and the intermediate value theorem'},
    steps: 6,
    minFrames: 13, // 2 + 2 + 3 + 2 + 2 + 2 frames
    setup: async page => {
        // At step 0 only a, b, f(a) and f(b) are visible; m and f(m) appear with the first step.
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(4);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = BISECTION_STEPS[step - 1];
        await expect.poll(() => bisectionReadout(page, 'step'), {message: `revealed steps at ${label}`}).toBe(expected.step);
        await expect.poll(() => bisectionReadout(page, 'mid'), {message: `midpoint at ${label}`}).toBe(expected.mid);
        await expect.poll(() => bisectionReadout(page, 'f-mid'), {message: `f(m) at ${label}`}).toBe(expected.fMid);
        await expect.poll(() => bisectionReadout(page, 'width'), {message: `interval width at ${label}`}).toBe(expected.width);
        await expect.poll(() => bisectionReadout(page, 'a'), {message: `examined left endpoint at ${label}`}).toBe(expected.a);
        // the lesson never starts playback: the control still offers Play
        await expect(page.locator('[data-action="play-pause"]'), `playback stopped at ${label}`).toHaveText(/Predvajaj|Play/);
        if (expected.mid !== '—') await expectPointNear(page, [Number(expected.mid), 0], `midpoint m on the axis at ${label}`);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(60);
    },
    prepareUserState: async page => {
        await page.locator('[data-action="next-step"]').click();
        await expect.poll(() => bisectionReadout(page, 'step')).toBe('1');
        await page.getByLabel(/Right endpoint b|Desno kraji/).fill('3');
        await expect.poll(() => bisectionReadout(page, 'step'), {message: 'an endpoint edit restarts the iteration'}).toBe('0');
        await page.locator('[data-action="next-step"]').click();
        await expect.poll(() => bisectionReadout(page, 'mid')).toBe('2');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => bisectionReadout(page, 'step'), {message: 'lesson scene replaced the user step'}).toBe('3');
        await expect.poll(() => bisectionReadout(page, 'width'), {message: 'lesson scene replaced the user bracket'}).toBe('0.125');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => bisectionReadout(page, 'step'), {message: 'user step restored'}).toBe('1');
        await expect.poll(() => bisectionReadout(page, 'mid'), {message: 'user midpoint restored'}).toBe('2');
        await expect(page.locator('[data-action="play-pause"]'), 'restoring does not resume playback').toHaveText(/Predvajaj|Play/);
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({step: await bisectionReadout(page, 'step')}),
};

// ---------------------------------------------------------------- Mean value theorem
const meanValueReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace(/−/g, '-').replace(/,/g, '.');
const meanValueStatuses = page => page.locator('[data-mean-value-status]').evaluateAll(elements => elements.map(element => element.getAttribute('data-mean-value-status')));
// Per step: the displayed a, b, c, the secant slope, the tangent slope and the slope difference, and the statuses on screen. At the corner (step 5)
// the tangent slope and the difference are words ("ne obstaja" / "does not exist"), so only the language-independent status ids are checked there.
// The lesson shows each configuration unrevealed (except step 2, which reveals the prediction of step 1); the learner presses Show matching point.
const MEAN_VALUE_STEPS = [
    {a: '0', b: '2', c: '0.5', secant: '2', tangent: '1', difference: '-1', statuses: ['differ']},
    {a: '0', b: '2', c: '1', secant: '2', tangent: '2', difference: '0', statuses: ['agree', 'matches']},
    {a: '0', b: '2', c: '1.5', secant: '2', tangent: '3', difference: '1', statuses: ['differ']},
    {a: '-1', b: '1', c: '0', secant: '1', tangent: '0', difference: '-1', statuses: ['differ']},
    {a: '-1', b: '1', c: '0', secant: '0', statuses: ['hypothesis', 'corner']},
    {a: '0', b: '1', c: '0.5', secant: '1', tangent: '1', difference: '0', statuses: ['agree']},
];

const meanValue = {
    id: 'mean-value',
    path: `${BASE}/analysis/mean-value`,
    titles: {sl: 'Izrek o povprečni vrednosti', en: 'Mean value theorem'},
    steps: 6,
    minFrames: 15, // 2 + 3 + 2 + 3 + 3 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(6);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = MEAN_VALUE_STEPS[step - 1];
        await expect.poll(() => meanValueReadout(page, 'a'), {message: `a at ${label}`}).toBe(expected.a);
        await expect.poll(() => meanValueReadout(page, 'b'), {message: `b at ${label}`}).toBe(expected.b);
        await expect.poll(() => meanValueReadout(page, 'c'), {message: `c at ${label}`}).toBe(expected.c);
        await expect.poll(() => meanValueReadout(page, 'secant-slope'), {message: `secant slope at ${label}`}).toBe(expected.secant);
        if (expected.tangent !== undefined) {
            await expect.poll(() => meanValueReadout(page, 'tangent-slope'), {message: `tangent slope at ${label}`}).toBe(expected.tangent);
            await expect.poll(() => meanValueReadout(page, 'difference'), {message: `slope difference at ${label}`}).toBe(expected.difference);
        }
        await expect.poll(() => meanValueStatuses(page), {message: `statuses at ${label}`}).toEqual(expected.statuses);
        // a, b and c are the draggable points on the x-axis
        await expectPointNear(page, [Number(expected.a), 0], `a on the axis at ${label}`);
        await expectPointNear(page, [Number(expected.b), 0], `b on the axis at ${label}`);
        await expectPointNear(page, [Number(expected.c), 0], `c on the axis at ${label}`);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(60);
    },
    prepareUserState: async page => {
        await page.getByLabel(/Point of tangency c|Točka dotika c/).fill('1.2');
        await expect.poll(() => meanValueReadout(page, 'c')).toBe('1.2');
        await expect.poll(() => meanValueReadout(page, 'secant-slope'), {message: 'changing c does not move the secant'}).toBe('2');
        await page.locator('[data-action="toggle-matches"]').click();
        await expect.poll(() => meanValueStatuses(page), {message: 'the matching point is revealed'}).toContain('matches');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => meanValueReadout(page, 'c'), {message: 'lesson scene replaced the user c'}).toBe('1.5');
        await expect.poll(() => meanValueStatuses(page), {message: 'lesson scene hid the user reveal'}).not.toContain('matches');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => meanValueReadout(page, 'c'), {message: 'user c restored'}).toBe('1.2');
        await expect.poll(() => meanValueStatuses(page), {message: 'user reveal restored'}).toContain('matches');
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({c: await meanValueReadout(page, 'c')}),
};

// ---------------------------------------------------------------- Accumulated integral
const accumulationReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace(/−/g, '-').replace(/,/g, '.');
const accumulationStatuses = page => page.locator('[data-accumulation-status]').evaluateAll(elements => elements.map(element => element.getAttribute('data-accumulation-status')));
// Per step: the displayed a, x and f(x), the statuses on screen and, where the accumulation is shown, the signed integral and the tangent slope.
// While the accumulation is hidden (every step except 2 and 6; the learner presses Show accumulation A after predicting) the readouts for A are
// words ("skrito" / "hidden"), so only the language-independent status id is checked there.
const ACCUMULATION_STEPS = [
    {a: '0', x: '2', fx: '0.9093', statuses: ['hidden']},
    {a: '0', x: '2', fx: '0.9093', integral: '1.4161', slope: '0.9093', statuses: ['rising']},
    {a: '0', x: '3.1416', fx: '0', statuses: ['hidden']},
    {a: '0', x: '6.2832', fx: '0', statuses: ['hidden']},
    {a: '2', x: '0', fx: '0', statuses: ['hidden']},
    {a: '0', x: '1.5708', fx: '1', integral: '1', slope: '1', statuses: ['rising']},
    {a: '0', x: '2', fx: '4', statuses: ['hidden']},
];

const accumulation = {
    id: 'accumulation',
    path: `${BASE}/analysis/accumulation`,
    titles: {sl: 'Akumulirani integral in osnovni izrek', en: 'The accumulated integral and the fundamental theorem'},
    steps: 7,
    minFrames: 17, // 2 + 3 + 2 + 2 + 3 + 3 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(3);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = ACCUMULATION_STEPS[step - 1];
        await expect.poll(() => accumulationReadout(page, 'a'), {message: `a at ${label}`}).toBe(expected.a);
        await expect.poll(() => accumulationReadout(page, 'x'), {message: `x at ${label}`}).toBe(expected.x);
        await expect.poll(() => accumulationReadout(page, 'f-x'), {message: `f(x) at ${label}`}).toBe(expected.fx);
        if (expected.integral !== undefined) {
            await expect.poll(() => accumulationReadout(page, 'signed-integral'), {message: `signed integral at ${label}`}).toBe(expected.integral);
            await expect.poll(() => accumulationReadout(page, 'slope'), {message: `tangent slope at ${label}`}).toBe(expected.slope);
        }
        await expect.poll(() => accumulationStatuses(page), {message: `statuses at ${label}`}).toEqual(expected.statuses);
        // a and x are the draggable points on the x-axis
        await expectPointNear(page, [Number(expected.a), 0], `a on the axis at ${label}`);
        await expectPointNear(page, [Number(expected.x), 0], `x on the axis at ${label}`);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(60);
    },
    prepareUserState: async page => {
        await page.getByLabel(/Point x|Točka x/).fill('1.2');
        await expect.poll(() => accumulationReadout(page, 'x')).toBe('1.2');
        await page.locator('[data-action="toggle-accumulation"]').click();
        await expect.poll(() => accumulationStatuses(page), {message: 'the accumulation is shown'}).not.toContain('hidden');
        await expect.poll(() => accumulationReadout(page, 'signed-integral'), {message: 'A(1.2) = 1 - cos 1.2'}).toBe('0.6376');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => accumulationReadout(page, 'x'), {message: 'lesson scene replaced the user x'}).toBe('3.1416');
        await expect.poll(() => accumulationStatuses(page), {message: 'lesson scene hid the user reveal'}).toEqual(['hidden']);
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => accumulationReadout(page, 'x'), {message: 'user x restored'}).toBe('1.2');
        await expect.poll(() => accumulationStatuses(page), {message: 'user reveal restored'}).not.toContain('hidden');
        await expect.poll(() => accumulationReadout(page, 'signed-integral'), {message: 'user signed integral restored'}).toBe('0.6376');
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({x: await accumulationReadout(page, 'x')}),
};

// ---------------------------------------------------------------- Darboux sums
const darbouxReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace(/−/g, '-').replace(/,/g, '.');
const darbouxStatuses = page => page.locator('[data-darboux-status]').evaluateAll(elements => elements.map(element => element.getAttribute('data-darboux-status')));
// Per step: the displayed a, b, n, the exact integral, the statuses on screen and, where both sums are shown, L, U and the gap.
// While the sums are hidden (steps 1, 4 and 6; the learner presses Show lower sum / Show upper sum after predicting) their readouts are
// words ("skrito" / "hidden"), so only the language-independent status id is checked there.
const DARBOUX_STEPS = [
    {a: '0', b: '2', n: '4', integral: '2.6667', statuses: ['hidden']},
    {a: '0', b: '2', n: '4', integral: '2.6667', lower: '1.75', upper: '3.75', gap: '2', statuses: ['trapped']},
    {a: '0', b: '2', n: '8', integral: '2.6667', lower: '2.1875', upper: '3.1875', gap: '1', statuses: ['trapped']},
    {a: '0', b: '3.1416', n: '1', integral: '2', statuses: ['hidden']},
    {a: '0', b: '3.1416', n: '1', integral: '2', lower: '0', upper: '3.1416', gap: '3.1416', statuses: ['trapped']},
    {a: '0', b: '6.2832', n: '4', integral: '0', statuses: ['hidden']},
];

const darboux = {
    id: 'darboux',
    path: `${BASE}/analysis/darboux`,
    titles: {sl: 'Darbouxove vsote', en: 'Darboux sums'},
    steps: 6,
    minFrames: 14, // 2 + 3 + 2 + 2 + 3 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(2);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = DARBOUX_STEPS[step - 1];
        await expect.poll(() => darbouxReadout(page, 'a'), {message: `a at ${label}`}).toBe(expected.a);
        await expect.poll(() => darbouxReadout(page, 'b'), {message: `b at ${label}`}).toBe(expected.b);
        await expect.poll(() => darbouxReadout(page, 'n'), {message: `n at ${label}`}).toBe(expected.n);
        await expect.poll(() => darbouxReadout(page, 'integral'), {message: `integral at ${label}`}).toBe(expected.integral);
        if (expected.lower !== undefined) {
            await expect.poll(() => darbouxReadout(page, 'lower'), {message: `lower sum at ${label}`}).toBe(expected.lower);
            await expect.poll(() => darbouxReadout(page, 'upper'), {message: `upper sum at ${label}`}).toBe(expected.upper);
            await expect.poll(() => darbouxReadout(page, 'gap'), {message: `gap at ${label}`}).toBe(expected.gap);
        }
        await expect.poll(() => darbouxStatuses(page), {message: `statuses at ${label}`}).toEqual(expected.statuses);
        // a and b are the draggable points on the x-axis
        await expectPointNear(page, [Number(expected.a), 0], `a on the axis at ${label}`);
        await expectPointNear(page, [Number(expected.b), 0], `b on the axis at ${label}`);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(60);
    },
    prepareUserState: async page => {
        await page.getByLabel(/Number of parts n|Število delov n/).fill('16');
        await expect.poll(() => darbouxReadout(page, 'n')).toBe('16');
        await page.locator('[data-action="toggle-upper"]').click();
        await expect.poll(() => darbouxStatuses(page), {message: 'the upper sum is hidden'}).toContain('hidden');
        await expect.poll(() => darbouxReadout(page, 'lower'), {message: 'L(16) for x^2 on [0, 2]'}).toBe('2.4219');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => darbouxReadout(page, 'n'), {message: 'lesson scene replaced the user n'}).toBe('8');
        await expect.poll(() => darbouxStatuses(page), {message: 'lesson scene showed both sums'}).toEqual(['trapped']);
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => darbouxReadout(page, 'n'), {message: 'user n restored'}).toBe('16');
        await expect.poll(() => darbouxStatuses(page), {message: 'user hidden upper sum restored'}).toContain('hidden');
        await expect.poll(() => darbouxReadout(page, 'lower'), {message: 'user lower sum restored'}).toBe('2.4219');
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({n: await darbouxReadout(page, 'n')}),
};

// ---------------------------------------------------------------- Extrema
const extremaReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace(/−/g, '-').replace(/,/g, '.');
// The first number of a global-value readout ("0 pri x = 0" / "0 at x = 0"), language independent.
const extremaGlobal = async (page, id) => (await extremaReadout(page, id)).split(' ')[0];
const extremaStatuses = page => page.locator('[data-extrema-status]').evaluateAll(elements => elements.map(element => element.getAttribute('data-extrema-status')));
const extremaCandidates = page => page.locator('[data-readout^="candidate-"]').count();
// Per step: the displayed a and b, the number of candidates, the statuses on screen and, where the classification is shown, the global values.
// While it is hidden (steps 1, 3, 4, 5 and 6; the learner presses Show classification after predicting) the global readouts are words
// ("skrito" / "hidden"), so only the language-independent status ids are checked there.
const EXTREMA_STEPS = [
    {a: '-1', b: '2', candidates: 3, statuses: ['hidden']},
    {a: '-1', b: '2', candidates: 3, statuses: ['revealed'], min: '0', max: '4'},
    {a: '-1', b: '1', candidates: 3, statuses: ['hidden']},
    {a: '-1', b: '1', candidates: 3, statuses: ['hidden', 'corner']},
    {a: '-4', b: '4', candidates: 4, statuses: ['hidden']},
    {a: '0', b: '3.1416', candidates: 3, statuses: ['hidden']},
    {a: '0', b: '3.1416', candidates: 3, statuses: ['revealed', 'tie'], min: '0', max: '1'},
];

const extrema = {
    id: 'extrema',
    path: `${BASE}/analysis/extrema`,
    titles: {sl: 'Lokalni in globalni ekstremi', en: 'Local and global extrema'},
    steps: 7,
    minFrames: 16, // 2 + 3 + 2 + 2 + 2 + 2 + 3 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(2);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = EXTREMA_STEPS[step - 1];
        await expect.poll(() => extremaReadout(page, 'a'), {message: `a at ${label}`}).toBe(expected.a);
        await expect.poll(() => extremaReadout(page, 'b'), {message: `b at ${label}`}).toBe(expected.b);
        await expect.poll(() => extremaCandidates(page), {message: `candidates at ${label}`}).toBe(expected.candidates);
        if (expected.min !== undefined) {
            await expect.poll(() => extremaGlobal(page, 'global-minimum'), {message: `global minimum at ${label}`}).toBe(expected.min);
            await expect.poll(() => extremaGlobal(page, 'global-maximum'), {message: `global maximum at ${label}`}).toBe(expected.max);
        }
        await expect.poll(() => extremaStatuses(page), {message: `statuses at ${label}`}).toEqual(expected.statuses);
        // a and b are the draggable points on the x-axis
        await expectPointNear(page, [Number(expected.a), 0], `a on the axis at ${label}`);
        await expectPointNear(page, [Number(expected.b), 0], `b on the axis at ${label}`);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(60);
    },
    prepareUserState: async page => {
        await page.getByLabel(/Right endpoint b|Desno krajišče b/).fill('1.5');
        await expect.poll(() => extremaReadout(page, 'b')).toBe('1.5');
        await page.locator('[data-action="toggle-classification"]').click();
        await expect.poll(() => extremaStatuses(page), {message: 'the classification is shown'}).toContain('revealed');
        await expect.poll(() => extremaGlobal(page, 'global-maximum'), {message: 'maximum of x^2 on [-1, 1.5]'}).toBe('2.25');
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => extremaReadout(page, 'b'), {message: 'lesson scene replaced the user b'}).toBe('1');
        await expect.poll(() => extremaStatuses(page), {message: 'lesson scene hid the classification'}).toEqual(['hidden']);
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => extremaReadout(page, 'b'), {message: 'user b restored'}).toBe('1.5');
        await expect.poll(() => extremaStatuses(page), {message: 'user classification restored'}).toContain('revealed');
        await expect.poll(() => extremaGlobal(page, 'global-maximum'), {message: 'user global maximum restored'}).toBe('2.25');
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({b: await extremaReadout(page, 'b')}),
};

// ---------------------------------------------------------------- Convexity
const convexityReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace(/−/g, '-').replace(/,/g, '.');
const convexityStatuses = page => page.locator('[data-convexity-status]').evaluateAll(elements => elements.map(element => element.getAttribute('data-convexity-status')));
// Per step: the displayed a, b and t, the statuses on screen and, where the second derivative is shown, the chord (and the tangent at step 3).
// While it is hidden (steps 1, 4, 5 and 6; the learner presses Show second derivative after predicting) the verdict readouts are words
// ("skrito" / "hidden"), so only the language-independent status ids are checked there.
const CONVEXITY_STEPS = [
    {a: '-1', b: '1.5', t: '0.5', statuses: ['hidden']},
    {a: '-1', b: '1.5', t: '0.5', statuses: ['revealed'], chord: 'y = 0.5x + 1.5'},
    {a: '-1', b: '1.5', t: '0.5', statuses: ['revealed'], chord: 'y = 0.5x + 1.5', tangent: 'y = x - 0.25'},
    {a: '-1', b: '1.5', t: '0.5', statuses: ['hidden']},
    {a: '-1', b: '1.5', t: '0.5', statuses: ['hidden']},
    {a: '-1', b: '1', t: '0.5', statuses: ['hidden']},
    {a: '-1', b: '1', t: '0.5', statuses: ['revealed', 'zero-without-change'], chord: 'y = 1', tangent: 'y = 0.5x - 0.1875'},
];

const convexity = {
    id: 'convexity',
    path: `${BASE}/analysis/convexity`,
    titles: {sl: 'Konveksnost in konkavnost', en: 'Convexity and concavity'},
    steps: 7,
    minFrames: 17, // 2 + 3 + 3 + 2 + 2 + 2 + 3 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(3);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = CONVEXITY_STEPS[step - 1];
        await expect.poll(() => convexityReadout(page, 'a'), {message: `a at ${label}`}).toBe(expected.a);
        await expect.poll(() => convexityReadout(page, 'b'), {message: `b at ${label}`}).toBe(expected.b);
        await expect.poll(() => convexityReadout(page, 't'), {message: `t at ${label}`}).toBe(expected.t);
        if (expected.chord !== undefined) await expect.poll(() => convexityReadout(page, 'chord'), {message: `chord at ${label}`}).toBe(expected.chord);
        if (expected.tangent !== undefined) await expect.poll(() => convexityReadout(page, 'tangent'), {message: `tangent at ${label}`}).toBe(expected.tangent);
        await expect.poll(() => convexityStatuses(page), {message: `statuses at ${label}`}).toEqual(expected.statuses);
        // a, b and t are the draggable points on the x-axis
        await expectPointNear(page, [Number(expected.a), 0], `a on the axis at ${label}`);
        await expectPointNear(page, [Number(expected.b), 0], `b on the axis at ${label}`);
        await expectPointNear(page, [Number(expected.t), 0], `t on the axis at ${label}`);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(60);
    },
    prepareUserState: async page => {
        await page.getByLabel(/Tangent point t|Točka dotika tangente t/).fill('1.8');
        await expect.poll(() => convexityReadout(page, 't')).toBe('1.8');
        await page.locator('[data-action="toggle-second-derivative"]').click();
        await expect.poll(() => convexityStatuses(page), {message: 'the second derivative is shown and the tangent claim withdrawn'}).toEqual(['revealed', 'tangent-outside']);
        return await boardStats(page);
    },
    exitStep: 4,
    duringLesson: async page => {
        await expect.poll(() => convexityReadout(page, 't'), {message: 'lesson scene replaced the user t'}).toBe('0.5');
        await expect.poll(() => convexityStatuses(page), {message: 'lesson scene hid the second derivative'}).toEqual(['hidden']);
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => convexityReadout(page, 't'), {message: 'user t restored'}).toBe('1.8');
        await expect.poll(() => convexityStatuses(page), {message: 'user second derivative restored'}).toEqual(['revealed', 'tangent-outside']);
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({t: await convexityReadout(page, 't')}),
};

// ---------------------------------------------------------------- Taylor approximation
const taylorReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace(/−/g, '-').replace(/,/g, '.');
const taylorStatuses = page => page.locator('[data-taylor-status]').evaluateAll(elements => elements.map(element => element.getAttribute('data-taylor-status')));
// Per step: the displayed center, degree, x and T_n(x), and the statuses on screen. While the bound is hidden (steps 1, 2, 4, 6 and 7; the learner
// changes the degree or presses Show error bound after predicting) the bound readouts are words ("skrito" / "hidden"), so only the
// language-independent status ids are checked there.
const TAYLOR_STEPS = [
    {center: '0', degree: '1', x: '1', polynomial: '2', statuses: ['hidden']},
    {center: '0', degree: '2', x: '1', polynomial: '2.5', statuses: ['hidden']},
    {center: '0', degree: '6', x: '1', polynomial: '2.7181', statuses: ['revealed']},
    {center: '0', degree: '3', x: '2', polynomial: '0.6667', statuses: ['hidden']},
    {center: '0', degree: '3', x: '2', polynomial: '0.6667', statuses: ['revealed'], bound: '0.6667'},
    {center: '0', degree: '1', x: '-1.5', polynomial: '-0.5', statuses: ['hidden', 'outside-convergence']},
    {center: '0', degree: '3', x: '1', polynomial: '0', statuses: ['hidden', 'flat']},
    {center: '0', degree: '3', x: '1', polynomial: '0', statuses: ['revealed', 'no-bound', 'flat']},
];

const taylor = {
    id: 'taylor',
    path: `${BASE}/analysis/taylor`,
    titles: {sl: 'Taylorjev polinom in napaka približka', en: 'Taylor polynomial and the error of the approximation'},
    steps: 8,
    minFrames: 20, // eight steps; the content test pins 20 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(2);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = TAYLOR_STEPS[step - 1];
        await expect.poll(() => taylorReadout(page, 'center'), {message: `center at ${label}`}).toBe(expected.center);
        await expect.poll(() => taylorReadout(page, 'degree'), {message: `degree at ${label}`}).toBe(expected.degree);
        await expect.poll(() => taylorReadout(page, 'x'), {message: `x at ${label}`}).toBe(expected.x);
        await expect.poll(() => taylorReadout(page, 'polynomial'), {message: `T_n(x) at ${label}`}).toBe(expected.polynomial);
        if (expected.bound !== undefined) await expect.poll(() => taylorReadout(page, 'bound'), {message: `bound at ${label}`}).toBe(expected.bound);
        await expect.poll(() => taylorStatuses(page), {message: `statuses at ${label}`}).toEqual(expected.statuses);
        // c and x are the draggable points on the x-axis
        await expectPointNear(page, [Number(expected.center), 0], `c on the axis at ${label}`);
        await expectPointNear(page, [Number(expected.x), 0], `x on the axis at ${label}`);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(60);
    },
    prepareUserState: async page => {
        await page.getByLabel(/^(Degree n|Stopnja n)$/).fill('7');
        await expect.poll(() => taylorReadout(page, 'degree')).toBe('7');
        await page.locator('[data-action="toggle-taylor-bound"]').click();
        await expect.poll(() => taylorStatuses(page), {message: 'the error bound is shown'}).toEqual(['revealed']);
        return await boardStats(page);
    },
    exitStep: 4,
    duringLesson: async page => {
        await expect.poll(() => taylorReadout(page, 'degree'), {message: 'lesson scene replaced the user degree'}).toBe('3');
        await expect.poll(() => taylorStatuses(page), {message: 'lesson scene hid the error bound'}).toEqual(['hidden']);
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => taylorReadout(page, 'degree'), {message: 'user degree restored'}).toBe('7');
        await expect.poll(() => taylorStatuses(page), {message: 'user error bound restored'}).toEqual(['revealed']);
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({degree: await taylorReadout(page, 'degree')}),
};

// ---------------------------------------------------------------- Sequence convergence
const sequenceReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace(/−/g, '-').replace(/,/g, '.');
const sequenceStatuses = page => page.locator('[data-sequence-status]').evaluateAll(elements => elements.map(element => element.getAttribute('data-sequence-status')));
// Per step: the displayed number of shown terms, epsilon and N, the last shown term a_n on the board, and the statuses on screen. The lesson
// shows every configuration with the certificate hidden (the learner presses Show certificate after predicting) except step 2, which explains
// the least working threshold. With all 40 terms shown (step 3) the status list also says so.
const SEQUENCE_STEPS = [
    {terms: '12', epsilon: '0.25', threshold: '5', last: [12, 1 / 12], statuses: ['hidden']},
    {terms: '12', epsilon: '0.1', threshold: '11', last: [12, 1 / 12], statuses: ['certified']},
    {terms: '40', epsilon: '0.01', threshold: '5', last: [40, 0.025], statuses: ['hidden', 'complete']},
    {terms: '12', epsilon: '0.1', threshold: '5', last: [12, 1 / 12], statuses: ['hidden']},
    {terms: '12', epsilon: '1.5', threshold: '5', last: [12, 1], statuses: ['hidden']},
    {terms: '12', epsilon: '0.5', threshold: '5', last: [12, 12], statuses: ['hidden']},
    {terms: '12', epsilon: '0.1', threshold: '11', last: [12, 1 / 12], statuses: ['hidden']},
];

const sequence = {
    id: 'sequence',
    path: `${BASE}/analysis/sequence`,
    titles: {sl: 'Konvergenca zaporedja: ε in N', en: 'Convergence of a sequence: ε and N'},
    steps: 7,
    minFrames: 15, // 2 + 3 + 2 + 2 + 2 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(1);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = SEQUENCE_STEPS[step - 1];
        await expect.poll(() => sequenceReadout(page, 'terms'), {message: `shown terms at ${label}`}).toBe(expected.terms);
        await expect.poll(() => sequenceReadout(page, 'epsilon'), {message: `epsilon at ${label}`}).toBe(expected.epsilon);
        await expect.poll(() => sequenceReadout(page, 'threshold'), {message: `N at ${label}`}).toBe(expected.threshold);
        await expect.poll(() => sequenceStatuses(page), {message: `statuses at ${label}`}).toEqual(expected.statuses);
        // the lesson never starts playback: the control still offers Play
        await expect(page.locator('[data-action="play-pause"]'), `playback stopped at ${label}`).toHaveText(/Predvajaj|Play/);
        // the last shown term sits on the board at (n, a_n)
        await expectPointNear(page, expected.last, `last shown term at ${label}`);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(120);
    },
    prepareUserState: async page => {
        await page.locator('[data-action="next-step"]').click();
        await page.locator('[data-action="next-step"]').click();
        await expect.poll(() => sequenceReadout(page, 'terms')).toBe('3');
        await page.getByLabel(/^(Threshold N|Prag N)$/).fill('11');
        await expect.poll(() => sequenceReadout(page, 'threshold'), {message: 'N edited'}).toBe('11');
        await page.locator('[data-action="toggle-sequence-certificate"]').click();
        await expect.poll(() => sequenceStatuses(page), {message: 'the certificate is shown, N beyond the shown terms'}).toEqual(['certified', 'beyond-terms', 'n-min-beyond-terms']);
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => sequenceReadout(page, 'terms'), {message: 'lesson scene replaced the user terms'}).toBe('40');
        await expect.poll(() => sequenceReadout(page, 'threshold'), {message: 'lesson scene replaced the user N'}).toBe('5');
        await expect.poll(() => sequenceStatuses(page), {message: 'lesson scene hid the certificate'}).toEqual(['hidden', 'complete']);
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => sequenceReadout(page, 'terms'), {message: 'user terms restored'}).toBe('3');
        await expect.poll(() => sequenceReadout(page, 'threshold'), {message: 'user N restored'}).toBe('11');
        await expect.poll(() => sequenceStatuses(page), {message: 'user certificate restored'}).toEqual(['certified', 'beyond-terms', 'n-min-beyond-terms']);
        await expect(page.locator('[data-action="play-pause"]'), 'restoring does not resume playback').toHaveText(/Predvajaj|Play/);
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({terms: await sequenceReadout(page, 'terms'), threshold: await sequenceReadout(page, 'threshold')}),
};

// ---------------------------------------------------------------- Uniform convergence
const uniformReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace(/−/g, '-').replace(/,/g, '.');
const uniformStatuses = page => page.locator('[data-uniform-status]').evaluateAll(elements => elements.map(element => element.getAttribute('data-uniform-status')));
// Per step: the index n, the domain end r, the point x, the supremum readout, the point (x, f_n(x)) on the board and the statuses on screen. The lesson
// shows every configuration with the supremum hidden (the learner presses Show supremum after predicting) except step 6, which explains the shared N.
// Steps: x/n on [0, 1], x^n on [0, 1] twice, x^n on [0, 0.8] (pointwise, supremum, shared N), the domain near 1, free exploration.
const UNIFORM_STEPS = [
    {n: '4', r: '1', x: '0.5', supremum: 'hidden', point: [0.5, 0.125], statuses: ['hidden']},
    {n: '5', r: '1', x: '0.9', supremum: 'hidden', point: [0.9, 0.59049], statuses: ['hidden', 'jump']},
    {n: '10', r: '1', x: '0.9', supremum: 'hidden', point: [0.9, 0.9 ** 10], statuses: ['hidden', 'jump']},
    {n: '2', r: '0.8', x: '0.5', supremum: 'hidden', point: [0.5, 0.25], statuses: ['hidden']},
    {n: '5', r: '0.8', x: '0.5', supremum: 'hidden', point: [0.5, 0.03125], statuses: ['hidden']},
    {n: '11', r: '0.8', x: '0.5', supremum: '0.0858', point: [0.5, 0.5 ** 11], statuses: ['attained', 'shared-n', 'covered']},
    {n: '44', r: '0.95', x: '0.5', supremum: 'hidden', point: [0.5, 0], statuses: ['hidden']},
    {n: '5', r: '1', x: '0.5', supremum: 'hidden', point: [0.5, 0.1], statuses: ['hidden']},
];

const uniformConvergence = {
    id: 'uniform-convergence',
    path: `${BASE}/analysis/uniform-convergence`,
    titles: {sl: 'Enakomerna konvergenca: en skupni prag za vse točke', en: 'Uniform convergence: one shared threshold for all points'},
    steps: 8,
    minFrames: 17, // 2 + 2 + 2 + 2 + 2 + 3 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(1);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = UNIFORM_STEPS[step - 1];
        await expect.poll(() => uniformReadout(page, 'n'), {message: `index n at ${label}`}).toBe(expected.n);
        await expect.poll(() => uniformReadout(page, 'r'), {message: `domain end r at ${label}`}).toBe(expected.r);
        await expect.poll(() => uniformReadout(page, 'x'), {message: `point x at ${label}`}).toBe(expected.x);
        await expect.poll(async () => {
            const value = await uniformReadout(page, 'supremum');
            return /^(skrito|hidden)$/.test(value) ? 'hidden' : value.slice(0, 6);
        }, {message: `supremum at ${label}`}).toBe(expected.supremum);
        await expect.poll(() => uniformStatuses(page), {message: `statuses at ${label}`}).toEqual(expected.statuses);
        // the point (x, f_n(x)) sits on the board
        await expectPointNear(page, expected.point, `value of f_n at x at ${label}`);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(120);
    },
    prepareUserState: async page => {
        await page.getByLabel(/^(Index n|Indeks n)$/).fill('7');
        await expect.poll(() => uniformReadout(page, 'n'), {message: 'n edited'}).toBe('7');
        await page.getByLabel(/^(Tolerance ε|Toleranca ε)$/).fill('0.05');
        await expect.poll(() => uniformReadout(page, 'epsilon'), {message: 'epsilon edited'}).toBe('0.05');
        await page.locator('[data-action="toggle-uniform-supremum"]').click();
        await expect.poll(() => uniformStatuses(page), {message: 'the supremum is shown'}).toEqual(['attained', 'shared-n', 'not-covered']);
        return await boardStats(page);
    },
    exitStep: 6,
    duringLesson: async page => {
        await expect.poll(() => uniformReadout(page, 'n'), {message: 'lesson scene replaced the user n'}).toBe('11');
        await expect.poll(() => uniformReadout(page, 'epsilon'), {message: 'lesson scene replaced the user epsilon'}).toBe('0.1');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => uniformReadout(page, 'n'), {message: 'user n restored'}).toBe('7');
        await expect.poll(() => uniformReadout(page, 'epsilon'), {message: 'user epsilon restored'}).toBe('0.05');
        await expect.poll(() => uniformStatuses(page), {message: 'user supremum restored'}).toEqual(['attained', 'shared-n', 'not-covered']);
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({n: await uniformReadout(page, 'n'), epsilon: await uniformReadout(page, 'epsilon')}),
};

// ---------------------------------------------------------------- Complex multiplication
const complexReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace(/−/g, '-').replace(/,/g, '.');
const complexStatuses = page => page.locator('[data-complex-status]').evaluateAll(elements => elements.map(element => element.getAttribute('data-complex-status')));
// Per step: z, w and the product readouts, the statuses on screen and the points on the board. The lesson shows every configuration with the product
// hidden (the learner presses Show product after predicting) except step 6, which explains the reduction modulo 2 pi.
const COMPLEX_STEPS = [
    {z: '1 + i', w: 'i', product: 'hidden', statuses: ['hidden'], points: [[1, 1], [0, 1]]},
    {z: '1 + i', w: 'i', product: 'hidden', statuses: ['hidden'], points: [[1, 1], [0, 1]]},
    {z: '1 + i', w: '-1', product: 'hidden', statuses: ['hidden'], points: [[1, 1], [-1, 0]]},
    {z: '1 + i', w: '2', product: 'hidden', statuses: ['hidden'], points: [[1, 1], [2, 0]]},
    {z: '1 + i', w: '1 + i', product: 'hidden', statuses: ['hidden'], points: [[1, 1]]},
    {z: '-1 + i', w: '-1 + i', product: '-2i', statuses: ['reduced'], points: [[-1, 1], [0, -2]]},
    {z: '1 + i', w: '0', product: 'hidden', statuses: ['hidden', 'w-zero'], points: [[1, 1]]},
];

const complexMultiplication = {
    id: 'complex-multiplication',
    path: `${BASE}/complex-multiplication`,
    titles: {sl: 'Kompleksno množenje: vrtež in raztegnitev', en: 'Complex multiplication: rotation and scaling'},
    steps: 7,
    minFrames: 15, // 2 + 2 + 2 + 2 + 2 + 3 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(1);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = COMPLEX_STEPS[step - 1];
        await expect.poll(() => complexReadout(page, 'z'), {message: `z at ${label}`}).toBe(expected.z);
        await expect.poll(() => complexReadout(page, 'w'), {message: `w at ${label}`}).toBe(expected.w);
        await expect.poll(async () => {
            const value = await complexReadout(page, 'product');
            return /^(skrito|hidden)$/.test(value) ? 'hidden' : value;
        }, {message: `product at ${label}`}).toBe(expected.product);
        await expect.poll(() => complexStatuses(page), {message: `statuses at ${label}`}).toEqual(expected.statuses);
        for (const point of expected.points) await expectPointNear(page, point, `a point at (${point}) at ${label}`);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(120);
    },
    prepareUserState: async page => {
        await page.getByLabel(/^Re z$/).fill('0.5');
        await expect.poll(() => complexReadout(page, 'z'), {message: 'Re z edited'}).toBe('0.5 + i');
        await page.locator('[data-action="toggle-complex-product"]').click();
        await page.locator('[data-action="toggle-complex-arguments"]').click();
        await expect.poll(() => complexStatuses(page), {message: 'the product is shown'}).toEqual(['not-reduced']);
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => complexReadout(page, 'z'), {message: 'lesson scene replaced the user z'}).toBe('1 + i');
        await expect.poll(() => complexReadout(page, 'w'), {message: 'lesson scene replaced the user w'}).toBe('-1');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => complexReadout(page, 'z'), {message: 'user z restored'}).toBe('0.5 + i');
        await expect.poll(() => complexReadout(page, 'product'), {message: 'user product restored'}).toBe('-1 + 0.5i');
        await expect.poll(() => complexStatuses(page), {message: 'user product visibility restored'}).toEqual(['not-reduced']);
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({z: await complexReadout(page, 'z'), product: await complexReadout(page, 'product')}),
};

// ---------------------------------------------------------------- Fixed-point iteration
const fixedPointReadout = async (page, id) => (await page.locator(`[data-readout="${id}"] dd`).innerText()).replace(/−/g, '-').replace(/,/g, '.');
const fixedPointStatuses = page => page.locator('[data-fixed-point-status]').evaluateAll(elements => elements.map(element => element.getAttribute('data-fixed-point-status')));
// Per step: the displayed iteration step, the current iterate (six decimals), the threshold, the iterate on the board as a point (x_k, x_k), and the statuses
// on screen. The lesson shows every configuration with the bound hidden (the learner presses Next step or Show error bound after predicting) except step 3,
// which explains the contraction. Step 5 has stopped at the threshold d = 8, where the six-decimal readout shows 1 although the iterate is not exactly 1.
const BOUND_STATUSES = ['hypotheses', 'bound-a-priori', 'bound-a-posteriori'];
const FIXED_POINT_STEPS = [
    {step: '0', current: '0', tolerance: '10⁻³', point: 0, statuses: ['bound-hidden']},
    {step: '1', current: '0.5', tolerance: '10⁻³', point: 0.5, statuses: ['bound-hidden']},
    {step: '3', current: '0.875', tolerance: '10⁻³', point: 0.875, statuses: BOUND_STATUSES},
    {step: '8', current: '0.722102', tolerance: '10⁻³', point: 0.722102, statuses: ['bound-hidden']},
    {step: '27', current: '1', tolerance: '10⁻⁸', point: 1, statuses: ['threshold', 'bound-hidden']},
    {step: '4', current: '0.2', tolerance: '10⁻³', point: 0.2, statuses: ['cycle', 'bound-hidden']},
    {step: '0', current: '1', tolerance: '10⁻³', point: 1, statuses: ['bound-hidden']},
];

const fixedPoint = {
    id: 'fixed-point',
    path: `${BASE}/analysis/fixed-point`,
    titles: {sl: 'Negibna točka in iteracija', en: 'Fixed-point iteration and contractions'},
    steps: 7,
    minFrames: 15, // 2 + 2 + 3 + 2 + 2 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBeGreaterThanOrEqual(1);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        const expected = FIXED_POINT_STEPS[step - 1];
        await expect.poll(() => fixedPointReadout(page, 'step'), {message: `iteration step at ${label}`}).toBe(expected.step);
        await expect.poll(() => fixedPointReadout(page, 'current'), {message: `current iterate at ${label}`}).toBe(expected.current);
        await expect.poll(() => fixedPointReadout(page, 'tolerance'), {message: `threshold at ${label}`}).toBe(expected.tolerance);
        await expect.poll(() => fixedPointStatuses(page), {message: `statuses at ${label}`}).toEqual(expected.statuses);
        // the lesson never starts playback: the control still offers Play
        await expect(page.locator('[data-action="play-pause"]'), `playback stopped at ${label}`).toHaveText(/Predvajaj|Play/);
        // the current iterate sits on the board at (x_k, x_k)
        await expectPointNear(page, [expected.point, expected.point], `current iterate at ${label}`);
        expect((await boardStats(page)).total, `no accumulated objects at ${label}`).toBeLessThanOrEqual(120);
    },
    prepareUserState: async page => {
        await page.getByLabel(/^(Tolerance digits d|Natančnost d)/).fill('5');
        await expect.poll(() => fixedPointReadout(page, 'tolerance'), {message: 'tolerance edited'}).toBe('10⁻⁵');
        await page.locator('[data-action="next-step"]').click();
        await page.locator('[data-action="next-step"]').click();
        await expect.poll(() => fixedPointReadout(page, 'step')).toBe('2');
        await page.locator('[data-action="toggle-fixed-point-bound"]').click();
        await expect.poll(() => fixedPointStatuses(page), {message: 'the bound is shown'}).toEqual(BOUND_STATUSES);
        return await boardStats(page);
    },
    exitStep: 3,
    duringLesson: async page => {
        await expect.poll(() => fixedPointReadout(page, 'step'), {message: 'lesson scene replaced the user step'}).toBe('3');
        await expect.poll(() => fixedPointReadout(page, 'tolerance'), {message: 'lesson scene replaced the user tolerance'}).toBe('10⁻³');
    },
    assertUserState: async (page, ctx, before) => {
        await expect.poll(() => fixedPointReadout(page, 'step'), {message: 'user step restored'}).toBe('2');
        await expect.poll(() => fixedPointReadout(page, 'tolerance'), {message: 'user tolerance restored'}).toBe('10⁻⁵');
        await expect.poll(() => fixedPointStatuses(page), {message: 'user bound restored'}).toEqual(BOUND_STATUSES);
        await expect(page.locator('[data-action="play-pause"]'), 'restoring does not resume playback').toHaveText(/Predvajaj|Play/);
        expect((await boardStats(page)).total).toBe(before.total);
    },
    stableCounts: async page => ({step: await fixedPointReadout(page, 'step'), tolerance: await fixedPointReadout(page, 'tolerance')}),
};

const LESSONS = [bernstein, rationalElevation, weighted, uniformPh, subdivision, repeatedSubdivision, rationalSubdivision, extrapolation, rationalExtrapolation,
    alternativeDeCasteljau, farin, circle, splineCn, splineC1, splineC2, splineG1, splineG1Symmetric, splineParameterization, linear, exponential, trigonometric, continuity, derivative, definiteIntegral, areaBetween, arcLength, bisection, meanValue, accumulation, darboux, extrema, convexity, taylor, sequence, uniformConvergence, complexMultiplication, fixedPoint];

// ---------------------------------------------------------------- Generic tests
async function openLesson(page, row, language) {
    await h.useLanguage(page, language);
    await page.goto(`${row.path}?learn=1`, {waitUntil: 'domcontentloaded'});
    await expect(lessonPanel(page)).toBeVisible();
}

const pressOn = async (page, locator) => { await locator.focus(); await page.keyboard.press('Enter'); await settle(page); };
// Shared runtime behaviour (GuidedLesson.tsx) is identical for every lesson, so it is tested once on these rows.
const SHARED_RUNTIME_ROWS = [bernstein, farin, splineG1];

for (const row of LESSONS) {
    const minFrames = row.minFrames ?? 10;

    test.describe(`Lesson ${row.id}`, () => {
        test.setTimeout(150_000);

        test('sl: ?learn=1 walks every frame (observation frames through observe + Continue) and completes', async ({page}) => {
            await openLesson(page, row, 'sl');
            await expect(lessonHeading(page)).toHaveText(row.titles.sl);
            await expect(backButton(page)).toBeDisabled();
            const ctx = row.setup ? await row.setup(page) : undefined;
            const seen = [];
            const blocked = [];
            for (let guard = 0; guard < 60; guard += 1) {
                const label = await progress(page);
                seen.push(label);
                if (row.stepProbe) await row.stepProbe(page, ctx, stepNumber(label), label);
                const finishing = await isFinishing(page);
                const observe = lessonPanel(page).locator('.guided-lesson-observe');
                if (await observe.count()) {
                    // Real observation flow: hide instructions, then use the header Continue action while the graph is free.
                    await pressOn(page, observe);
                    expect(await page.locator('section.workspace-graph').getAttribute('data-lesson-locked'), `graph unlocked while observing at ${label}`).not.toBe('true');
                    const cont = page.getByRole('button', {name: /Continue lesson|Nadaljuj učno pot/});
                    await expect(cont).toBeVisible();
                    const blocker = await cont.evaluate(button => {
                        const r = button.getBoundingClientRect();
                        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                        return top === button || button.contains(top) ? null : top ? `${top.tagName}.${top.className?.baseVal ?? top.className}` : 'outside viewport';
                    });
                    if (blocker) blocked.push(`at "${label}": ${blocker}`);
                    // Keyboard activation: board labels can intercept pointer clicks; the hit-test above asserts reach.
                    await pressOn(page, cont);
                } else {
                    await nextButton(page).click();
                    await settle(page);
                }
                if (finishing) break;
            }
            await expect(lessonPanel(page)).toContainText(/Lesson complete|Učna pot je končana/);
            expect(blocked, 'Continue lesson center hit-test blocked by board elements').toEqual([]);
            expect(new Set(seen.map(stepNumber)), 'every step visited').toEqual(new Set(Array.from({length: row.steps}, (_, i) => i + 1)));
            expect(seen.length, 'frames visited').toBeGreaterThanOrEqual(minFrames);
        });

        test('en: Exit restores the user state and re-entering twice keeps board counts stable', async ({page}) => {
            await h.useLanguage(page, 'en');
            await page.goto(row.path, {waitUntil: 'domcontentloaded'});
            const ctx = row.setup ? await row.setup(page) : undefined;
            if (row.assertBaseline) await row.assertBaseline(page, ctx);
            const saved = row.prepareUserState ? await row.prepareUserState(page, ctx) : undefined;
            const probe = async label => { if (row.stepProbe) await row.stepProbe(page, ctx, stepNumber(label), label); };
            await learnButton(page).click();
            await expect(lessonPanel(page)).toBeVisible();
            await expect(lessonHeading(page)).toHaveText(row.titles.en);
            await advanceToStep(page, row.exitStep ?? 3);
            // Short Back check: step one frame away (Back, or Next when this is the first frame) and return by the opposite move.
            const here = await progress(page);
            const onFirstFrame = await backButton(page).isDisabled();
            await (onFirstFrame ? advance : back)(page);
            const neighbour = await progress(page);
            expect(neighbour, 'moving one frame changes the frame').not.toBe(here);
            await probe(neighbour);
            await (onFirstFrame ? back : advance)(page);
            expect(await progress(page), 'the opposite move returns to the same frame').toBe(here);
            await probe(here);
            if (row.prepareUserState && row.duringLesson) await row.duringLesson(page, ctx, saved);
            const beforeExit = await progress(page);
            await exitButton(page).click();
            await expect(page.getByRole('dialog')).toBeVisible();
            await expect(page.getByRole('button', {name: /Continue lesson|Nadaljuj učno pot/})).toBeFocused();
            await page.keyboard.press('Escape');
            await expect(page.getByRole('dialog')).toHaveCount(0);
            expect(await progress(page)).toBe(beforeExit);
            await exitAndConfirm(page);
            await expect(lessonPanel(page)).toHaveCount(0);
            if (row.prepareUserState) await row.assertUserState(page, ctx, saved);
            const snapshot = async () => {
                const stats = await boardStats(page);
                return {curves: stats.curves, points: stats.points, total: stats.total, ...(row.stableCounts ? await row.stableCounts(page, ctx) : {})};
            };
            const baseline = await snapshot();
            const step = row.reentryStep ?? 3;
            for (let round = 0; round < 2; round += 1) {
                await learnButton(page).click();
                await expect(lessonPanel(page)).toBeVisible();
                await advanceToStep(page, step);
                if (row.stepProbe) await row.stepProbe(page, ctx, step, `round ${round} step ${step}`);
                await exitAndConfirm(page);
                await expect(lessonPanel(page)).toHaveCount(0);
                await expect.poll(snapshot, {message: `board counts after round ${round}`}).toEqual(baseline);
            }
        });

        test.describe('narrow viewport', () => {
            test.use({viewport: {width: 390, height: 844}});
            test('lesson controls are visible; calculation and notation frames have no horizontal overflow and Next is clickable', async ({page}) => {
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
                for (let guard = 0; guard < 60; guard += 1) {
                    const label = await progress(page);
                    const hasMath = await lesson.locator('.guided-lesson-worked-example, .guided-lesson-notation').count() > 0;
                    const finishing = await isFinishing(page);
                    if (hasMath) {
                        const {scrollWidth, innerWidth} = await page.evaluate(() => ({
                            scrollWidth: document.scrollingElement.scrollWidth, innerWidth: window.innerWidth}));
                        if (scrollWidth > innerWidth + 1) overflowing.push(`${label}: scrollWidth ${scrollWidth} > ${innerWidth}`);
                        try {
                            await nextButton(page).click({timeout: 4000});
                        } catch (error) {
                            blocked.push(`${label}: ${error.message.split(String.fromCharCode(10)).find(line => line.includes('intercepts')) || 'click failed'}`);
                            await nextButton(page).focus();
                            await page.keyboard.press('Enter');
                        }
                    } else {
                        await nextButton(page).click();
                    }
                    await settle(page);
                    if (finishing) break;
                }
                expect(blocked, 'Next not pointer-clickable on calculation/notation frames').toEqual([]);
                expect(overflowing, 'calculation/notation frames with horizontal page overflow').toEqual([]);
                await expect(page.locator('#jgbox')).toBeVisible();
                await noHorizontalOverflow(page);
                await expect(lesson).toBeAttached();
            });
        });
    });
}

// ---------------------------------------------------------------- Shared lesson runtime
test.describe('Shared lesson runtime', () => {
    test.setTimeout(150_000);

    for (const row of SHARED_RUNTIME_ROWS) {
        test.describe(`on ${row.id}`, () => {
            test('header language switch re-titles the open lesson', async ({page}) => {
                await openLesson(page, row, 'sl');
                await expect(lessonHeading(page)).toHaveText(row.titles.sl);
                await page.locator('#bezeg-language').selectOption('en');
                await expect(lessonHeading(page)).toHaveText(row.titles.en);
                await expect(exitButton(page)).toBeVisible();
            });

            test('Next is reachable via Tab and activated with Enter', async ({page}) => {
                await openLesson(page, row, 'en');
                const before = await progress(page);
                await h.pressNextWithKeyboard(page);
                await expect.poll(() => progress(page)).not.toBe(before);
            });

            test('Back is lossless in both directions and the English lesson completes', async ({page}) => {
                const lastStep = new RegExp(`Step ${row.steps} of ${row.steps}`);
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
        });
    }
});

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
        await exitAndConfirm(page);
        await expect(lessonPanel(page)).toHaveCount(0);
        await expect.poll(() => degree(page)).toBe(1);
        await expect.poll(async () => (await stackedSwitch(page)).isChecked()).toBe(false);
        const afterFirst = await boardStats(page);
        for (let round = 0; round < 3; round += 1) {
            await learnButton(page).click();
            await expect(lessonPanel(page)).toBeVisible();
            await advance(page); await advance(page); await advance(page);
            await exitAndConfirm(page);
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

    test('?learn=1 steps through to completion; point count rises to 5 then 6; completed scene and labels remain', async ({page}) => {
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
            const action = lesson.locator('.guided-lesson-actions button:not(.guided-lesson-observe):not(.guided-lesson-continue)');
            if (await action.count()) {
                await action.first().click();
                await settle(page);
            }
            const stats = await boardStats(page);
            pointsByLabel.push(`${label} => points ${stats.points}, labels ${stats.labels}`);
            if (stats.points === 5) sawFive = true;
            if (stats.points === 6) sawSix = true;
            maxLabels = Math.max(maxLabels, stats.labels);
            const finishing = await isFinishing(page);
            await nextButton(page).click();
            await settle(page);
            if (finishing) break;
        }
        test.info().annotations.push({type: 'points-trace', description: pointsByLabel.join('\n')});
        await expect(lesson).toContainText(/Lesson complete/i);
        expect(sawFive, `5 control points seen:\n${pointsByLabel.join('\n')}`).toBe(true);
        expect(sawSix, `6 control points seen:\n${pointsByLabel.join('\n')}`).toBe(true);
        expect(maxLabels, `weight labels visible on some step:\n${pointsByLabel.join('\n')}`).toBeGreaterThan(0);

        const completed = await boardStats(page);
        await exitButton(page).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(lessonPanel(page)).toHaveCount(0);
        expect(await boardStats(page), 'closing completion retains the final scene').toEqual(completed);
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
        await h.openInspectorTab(page, 'display');
        await page.getByRole('checkbox', {name: 'Weights', exact: true}).check();
        await h.openInspectorTab(page, 'edit');
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

// ---------------------------------------------------------------- Extras: observation flow
// Observation frames are read in the full panel (graph locked). Hiding it exposes workspace header actions outside the plot.
test.describe('Observation flow', () => {
    test.setTimeout(150_000);
    const graph = page => page.locator('section.workspace-graph');
    const locked = async page => (await graph(page).getAttribute('data-lesson-locked')) === 'true';
    const pressOn = async (page, locator) => { await locator.focus(); await page.keyboard.press('Enter'); await settle(page); };
    const panelFocused = page => page.evaluate(() => document.activeElement?.matches('section.guided-lesson'));
    const reopenFocused = page => page.evaluate(() => document.activeElement?.textContent?.includes('Back to the instructions'));
    async function toFirstObservation(page) {
        for (let guard = 0; guard < 10; guard += 1) {
            if (await lessonPanel(page).locator('.guided-lesson-observe').count()) return;
            await advance(page);
        }
        throw new Error('no observation frame reached');
    }

    test('visible instructions lock the graph, hide unlocks it, reopen preserves the frame and Continue advances; focus follows', async ({page}) => {
        await openLesson(page, extrapolation, 'en');
        await toFirstObservation(page);
        const observationLabel = await progress(page);
        expect(await locked(page), 'graph locked while the observation overlay is open').toBe(true);
        expect(await panelFocused(page), 'overlay keeps focus').toBe(true);

        await pressOn(page, lessonPanel(page).locator('.guided-lesson-observe'));
        await expect(lessonPanel(page)).toHaveCount(0);
        expect(await locked(page), 'graph unlocked while instructions are hidden').toBe(false);
        expect(await reopenFocused(page), 'header reopen action takes focus').toBe(true);
        // The graph accepts input now: a slider change reaches the board.
        const slider = rangeSlider(page, '1.5');
        await slider.fill('1.4');
        await expect.poll(async () => Number(await slider.inputValue())).toBeCloseTo(1.4, 1);

        // Reopen before testing Escape: dismissal should only run while the panel is visible.
        await pressOn(page, page.getByRole('button', {name: 'Back to the instructions'}));
        await expect(lessonPanel(page)).toBeVisible();
        expect(await progress(page)).toBe(observationLabel);
        expect(await locked(page), 'graph locked while reopened instructions are visible').toBe(true);
        expect(await panelFocused(page), 'focus returns to the reopened overlay').toBe(true);

        // Escape from a header control hides the panel visually and focuses the surviving reopen action.
        await page.getByRole('button', {name: 'Presentation mode'}).focus();
        await page.keyboard.press('Escape');
        await settle(page);
        await expect(lessonPanel(page)).toHaveCount(0);
        expect(await reopenFocused(page), 'Escape returns focus to the header reopen action').toBe(true);
        expect(await locked(page), 'Escape leaves the graph available').toBe(false);

        // Reopen instructions: same frame, graph locked again, focus on the panel.
        await pressOn(page, page.getByRole('button', {name: 'Back to the instructions'}));
        await expect(nextButton(page)).toBeVisible();
        expect(await progress(page)).toBe(observationLabel);
        expect(await locked(page), 'graph locked after reopening instructions').toBe(true);
        expect(await panelFocused(page), 'focus returns to the overlay').toBe(true);

        // Reading has one forward action; workspace Continue is reserved for hidden instructions.
        await pressOn(page, nextButton(page));
        await expect(nextButton(page)).toBeVisible();
        const after = await progress(page);
        expect(after, 'Continue advanced past the observation frame').not.toBe(observationLabel);
        expect(stepNumber(after)).toBe(stepNumber(observationLabel) + 1);
        expect(await locked(page), 'graph locked on the next frame').toBe(true);
        expect(await panelFocused(page), 'focus on the next overlay').toBe(true);
        // Back from the next frame returns to the observation frame.
        await back(page);
        expect(await progress(page)).toBe(observationLabel);
    });

    test('Continue on the last observation frame completes the lesson and unlocks the graph', async ({page}) => {
        await openLesson(page, extrapolation, 'en');
        for (let guard = 0; guard < 40; guard += 1) {
            await advance(page);
            if (await lessonPanel(page).locator('.guided-lesson-observe').count() && await isFinishing(page)) break;
        }
        await pressOn(page, lessonPanel(page).locator('.guided-lesson-observe'));
        await pressOn(page, page.getByRole('button', {name: 'Continue lesson'}));
        await expect(page.locator('section.guided-lesson.guided-lesson-complete')).toBeVisible();
        expect(await locked(page), 'graph free after completion').toBe(false);
    });

    test('playback pauses when instructions reopen and Continue advances', async ({page}) => {
        await openLesson(page, {path: `${BASE}/bezier/decasteljau`}, 'en');
        await toFirstObservation(page);
        await pressOn(page, lessonPanel(page).locator('.guided-lesson-observe'));
        const play = page.locator('.workspace-actions .guided-lesson-animation-controls button').first();
        await expect(play, 'workspace header offers playback on an animated frame').toBeVisible();
        const t = () => rangeSlider(page, '1').first().inputValue();
        await play.click();
        const first = await t();
        await expect.poll(t, {message: 'playback moves the t slider'}).not.toBe(first);
        await pressOn(page, page.getByRole('button', {name: 'Back to the instructions'}));
        const frozen = await t();
        await page.waitForTimeout(700);
        expect(await t(), 'playback paused behind the overlay').toBe(frozen);

        await pressOn(page, lessonPanel(page).locator('.guided-lesson-observe'));
        await page.locator('.workspace-actions .guided-lesson-animation-controls button').first().click();
        await page.waitForTimeout(250);
        await pressOn(page, page.getByRole('button', {name: 'Continue lesson'}));
        const afterContinue = await t();
        await page.waitForTimeout(700);
        expect(await t(), 'no playback behind the next overlay').toBe(afterContinue);
    });
});

require('./lesson-experience-checks.cjs')();
