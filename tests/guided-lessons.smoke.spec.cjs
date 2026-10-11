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

const {lessonPanel, nextButton, backButton, exitButton, learnButton, lessonHeading, boardStats, settle, progress,
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
        const action = lesson.locator('.guided-lesson-actions button:not(.guided-lesson-observe)');
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
const countButtons = page => page.locator('button[aria-label^="Current count"], button[aria-label^="Trenutno število"]');
const countValue = async (page, index) => Number((await countButtons(page).nth(index).getAttribute('aria-label')).replace(/\D+/g, ''));
const expectCount = (page, index, expected, message) => expect.poll(() => countValue(page, index), {message}).toBe(expected);

const alternativeDeCasteljau = {
    id: 'decasteljau-alternative',
    path: `${BASE}/bezier/decasteljau2`,
    titles: {sl: 'Alternativna De Casteljaujeva rekurzija', en: 'The alternative de Casteljau recursion'},
    steps: 5,
    minFrames: 12, // 2 + 3 + 3 + 2 + 2 frames
    setup: async page => {
        // Quartic curve plus its two helper cubics, drawn with 4 + 4 control points.
        await expect.poll(async () => (await boardStats(page)).curves).toBe(3);
        return {points: (await boardStats(page)).points};
    },
    stepProbe: async (page, ctx, step, label) => {
        await expectRange(page, 0, [0.5, 0.5, 0.25, 0.75, 0.5][step - 1], `t slider at ${label}`, 2);
        const stats = await boardStats(page);
        expect(stats.curves, `quartic + two helper cubics at ${label}`).toBe(3);
        expect(stats.points, `points stable at ${label}`).toBe(ctx.points);
    },
    prepareUserState: async page => {
        await setRange(page, 0, 0.8);
        await expectRange(page, 0, 0.8, 'user-set t', 1);
        return await boardStats(page);
    },
    exitStep: 3,
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
    steps: 4,
    minFrames: 10, // 2 + 3 + 3 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBe(11);
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        // Counter 0 is the continuity order, counter 1 the spline degree.
        const [continuity, degreeValue, points] = [[1, 2, 11], [1, 2, 11], [2, 3, 13], [1, 2, 11]][step - 1];
        await expectCount(page, 0, continuity, `continuity at ${label}`);
        await expectCount(page, 1, degreeValue, `degree at ${label}`);
        // 7 free points plus the derived points (4 at n=2, r=1; 6 at n=3, r=2).
        await expect.poll(async () => (await boardStats(page)).points, {message: `free + derived points at ${label}`}).toBe(points);
        expect((await boardStats(page)).curves, `one drawn spline curve at ${label}`).toBe(1);
        expect((await splineSwitches(page)).polygon, `control polygon at ${label}`).toBe(step === 2);
        // Step 3: some derived points lie far outside the default view (zoom out to see them).
        if (step === 3) expect(await offscreenPoints(page), `derived points outside the default view at ${label}`).toBeGreaterThan(0);
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

// Symmetric splines: 6 / 7 free points plus derived joints and inner points; the lessons only change switches.
function symmetricSplineRow({id, path, titles, steps, minFrames, points, polygonSteps}) {
    return {
        id, path, titles, steps, minFrames,
        setup: async page => {
            await expect.poll(async () => (await boardStats(page)).points).toBe(points);
            return {};
        },
        stepProbe: async (page, ctx, step, label) => {
            await expect.poll(async () => (await boardStats(page)).points, {message: `free + derived points at ${label}`}).toBe(points);
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
            expect((await boardStats(page)).points).toBe(points);
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
});
const splineC2 = symmetricSplineRow({
    id: 'spline-c2', path: `${BASE}/spline/c2spline`, titles: {sl: 'Simetrični C² zlepek', en: 'Symmetric C² spline'},
    steps: 4, minFrames: 10, points: 16, polygonSteps: [2, 3], // 7 free points + 9 derived; 2 + 3 + 3 + 2 frames
});

// G1 splines: sliders are the first inspector ranges (b for the one-sided, beta for the symmetric spline).
const splineG1 = {
    id: 'spline-g1',
    path: `${BASE}/spline/g1spline`,
    titles: {sl: 'Enostranski G¹ zlepek', en: 'One-sided G¹ spline'},
    steps: 5,
    minFrames: 11, // 2 + 3 + 2 + 2 + 2 frames
    setup: async page => {
        await expect.poll(async () => (await boardStats(page)).points).toBe(7);
        await expect(page.getByText('Parameter b', {exact: true}).first(), 'sliders are labelled "Parameter b"').toBeVisible();
        return {};
    },
    stepProbe: async (page, ctx, step, label) => {
        // The slider snaps to its grid (b = 1 reads 0.9967), hence the tolerance of 0.05.
        await expectRange(page, 0, [1, 1, 0.25, 2.5, 0.25][step - 1], `first b slider at ${label}`);
        await expectRange(page, 1, 1, `second b slider unchanged at ${label}`);
        await expect.poll(async () => (await boardStats(page)).points, {message: `5 free + 2 derived points at ${label}`}).toBe(7);
        // Even at b = 5/2 the derived point must stay inside the default view.
        expect(await offscreenPoints(page), `all points visible in the default view at ${label}`).toBe(0);
        expect((await splineSwitches(page)).polygon, `control polygon at ${label}`).toBe(step === 2 || step === 5);
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
    stableCounts: async page => ({b0: Math.round((await rangeValue(page, 0)) * 100), b1: Math.round((await rangeValue(page, 1)) * 100)}),
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
        const betas = [[0.5, 0.5, 0.5], [0.25, 0.5, 0.5], [0.75, 0.5, 0.5], [0.5, 0.75, 0.5], [0.99, 0.5, 0.5]][step - 1];
        for (const [index, value] of betas.entries()) await expectRange(page, index, value, `beta${index} at ${label}`);
        await expect.poll(async () => (await boardStats(page)).points, {message: `6 free + 3 joint points at ${label}`}).toBe(9);
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
    stableCounts: async page => ({b0: Math.round((await rangeValue(page, 0)) * 100), b1: Math.round((await rangeValue(page, 1)) * 100)}),
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
        await expectRange(page, 0, [0.5, 0.5, 0, 1, 1][step - 1], `alpha at ${label}`, 2);
        await expectRange(page, 1, [25, 25, 25, 25, 10][step - 1], `samples at ${label}`, 0);
        // Step 1 keeps the route's hidden derived points (9 + 25 samples); steps 2-4 show 15 derived points more; step 5 has 10 samples.
        const points = [34, 49, 49, 49, 34][step - 1];
        await expect.poll(async () => (await boardStats(page)).points, {message: `points at ${label}`}).toBe(points);
        expect((await boardStats(page)).curves, `one spline curve at ${label}`).toBe(1);
        expect((await splineSwitches(page)).hideFixed, `derived points hidden only at step 1 (${label})`).toBe(step === 1);
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
        await expectRange(page, 1, 25, 'lesson scene replaces the user samples', 0);
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

const LESSONS = [bernstein, rationalElevation, weighted, uniformPh, subdivision, repeatedSubdivision, rationalSubdivision, extrapolation, rationalExtrapolation,
    alternativeDeCasteljau, farin, circle, splineCn, splineC1, splineC2, splineG1, splineG1Symmetric, splineParameterization, linear, exponential];

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
                    // Real observation flow: collapse to the compact prompt, graph must be unlocked, Continue must be reachable.
                    await pressOn(page, observe);
                    expect(await page.locator('section.workspace-graph').getAttribute('data-lesson-locked'), `graph unlocked while observing at ${label}`).not.toBe('true');
                    const cont = lessonPanel(page).locator('.guided-lesson-continue');
                    await expect(cont).toBeVisible();
                    const blocker = await cont.evaluate(button => {
                        const r = button.getBoundingClientRect();
                        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                        return top === button || button.contains(top) ? null : `${top.tagName}.${top.className?.baseVal ?? top.className}`;
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
            await exitButton(page).click();
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
                await exitButton(page).click();
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
                    const finishing = (await nextButton(page).getAttribute('aria-label')) === 'Finish';
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
            const action = lesson.locator('.guided-lesson-actions button:not(.guided-lesson-observe)');
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

// ---------------------------------------------------------------- Extras: observation flow
// Observation frames open in the full overlay (graph locked); "Observe on the graph" collapses to the compact prompt
// (graph unlocked); the compact prompt's "Continue lesson" advances one frame, "Back to the instructions" reopens the same frame.
test.describe('Observation flow', () => {
    test.setTimeout(150_000);
    const graph = page => page.locator('section.workspace-graph');
    const locked = async page => (await graph(page).getAttribute('data-lesson-locked')) === 'true';
    const pressOn = async (page, locator) => { await locator.focus(); await page.keyboard.press('Enter'); await settle(page); };
    const panelFocused = page => page.evaluate(() => document.activeElement?.matches('section.guided-lesson'));
    const compactFocused = page => page.evaluate(() => document.activeElement?.matches('.guided-lesson-hidden-content'));
    async function toFirstObservation(page) {
        for (let guard = 0; guard < 10; guard += 1) {
            if (await lessonPanel(page).locator('.guided-lesson-observe').count()) return;
            await advance(page);
        }
        throw new Error('no observation frame reached');
    }

    test('overlay locks the graph, compact prompt unlocks it, Back reopens and Continue advances; focus follows', async ({page}) => {
        await openLesson(page, extrapolation, 'en');
        await toFirstObservation(page);
        const observationLabel = await progress(page);
        expect(await locked(page), 'graph locked while the observation overlay is open').toBe(true);
        expect(await panelFocused(page), 'overlay keeps focus').toBe(true);

        await pressOn(page, lessonPanel(page).locator('.guided-lesson-observe'));
        await expect(lessonPanel(page)).toHaveClass(/guided-lesson-hidden/);
        expect(await locked(page), 'graph unlocked in the compact prompt').toBe(false);
        expect(await compactFocused(page), 'compact prompt takes focus').toBe(true);
        // The graph accepts input now: a slider change reaches the board.
        const slider = rangeSlider(page, '1.5');
        await slider.fill('1.4');
        await expect.poll(async () => Number(await slider.inputValue())).toBeCloseTo(1.4, 1);

        // Back to the instructions: same frame, graph locked again, focus on the panel.
        await pressOn(page, lessonPanel(page).locator('.guided-lesson-instructions'));
        await expect(nextButton(page)).toBeVisible();
        expect(await progress(page)).toBe(observationLabel);
        expect(await locked(page), 'graph locked after Back to the instructions').toBe(true);
        expect(await panelFocused(page), 'focus returns to the overlay').toBe(true);

        // Continue advances to the next frame (the explanation of the next step) with the overlay open.
        await pressOn(page, lessonPanel(page).locator('.guided-lesson-observe'));
        await pressOn(page, lessonPanel(page).locator('.guided-lesson-continue'));
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
            if (await lessonPanel(page).locator('.guided-lesson-observe').count() && /Finish/.test(await nextButton(page).getAttribute('aria-label'))) break;
        }
        await pressOn(page, lessonPanel(page).locator('.guided-lesson-observe'));
        await pressOn(page, lessonPanel(page).locator('.guided-lesson-continue'));
        await expect(page.locator('section.guided-lesson.guided-lesson-complete')).toBeVisible();
        expect(await locked(page), 'graph free after completion').toBe(false);
    });

    test('playback stops when the overlay reopens and when Continue advances', async ({page}) => {
        await openLesson(page, {path: `${BASE}/bezier/decasteljau`}, 'en');
        await toFirstObservation(page);
        await pressOn(page, lessonPanel(page).locator('.guided-lesson-observe'));
        const play = lessonPanel(page).locator('.guided-lesson-animation-controls button').first();
        await expect(play, 'compact prompt offers playback on an animated frame').toBeVisible();
        const t = () => rangeSlider(page, '1').first().inputValue();
        await play.click();
        const first = await t();
        await expect.poll(t, {message: 'playback moves the t slider'}).not.toBe(first);
        await pressOn(page, lessonPanel(page).locator('.guided-lesson-instructions'));
        const frozen = await t();
        await page.waitForTimeout(700);
        expect(await t(), 'playback paused behind the overlay').toBe(frozen);

        await pressOn(page, lessonPanel(page).locator('.guided-lesson-observe'));
        await lessonPanel(page).locator('.guided-lesson-animation-controls button').first().click();
        await page.waitForTimeout(250);
        await pressOn(page, lessonPanel(page).locator('.guided-lesson-continue'));
        const afterContinue = await t();
        await page.waitForTimeout(700);
        expect(await t(), 'no playback behind the next overlay').toBe(afterContinue);
    });
});
