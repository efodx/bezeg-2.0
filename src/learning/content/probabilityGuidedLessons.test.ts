import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {sceneActions} from '../runtime/lessonCatalog';
import {probabilityGuidedLessons} from './probabilityGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {densityAreaView} from '../../analysis/densityAreaModel';
import type {DensityAreaModel} from '../../analysis/densityAreaModel';
import {setLanguage} from '../../localization';
import {BinomialNormalGraph} from '../../graphs/functions/BinomialNormalGraph';
import {GraphHost} from '../../graphs/base/GraphHost';
import {binomialNormalView} from '../../analysis/binomialNormalModel';
import type {BinomialNormalModel} from '../../analysis/binomialNormalModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = probabilityGuidedLessons.find(entry => entry.demonstrationId === 'prob-density')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language])].join(' ');
const proseHas = (stepId: string, quoted: string, language: 'sl' | 'en') =>
    prose(stepOf(stepId), language).includes(language === 'sl' ? quoted.replace(',', '{,}') : quoted.replace(',', '.'));
const STEP_IDS = ['density-total', 'density-bounds', 'density-one-sigma', 'density-shape', 'density-iq', 'density-explore'];

function mount() {
    const graph = createGraph('prob-density');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        apply: (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); }),
    };
}
type Harness = ReturnType<typeof mount>;

const readout = (id: string) => (document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? '').replace(/−/g, '-');
const model = (h: Harness) => h.graph.state as unknown as DensityAreaModel;
const param = (name: 'density-mu' | 'density-sigma' | 'density-a' | 'density-b', value: number): LessonAction => ({kind: 'function-parameter', name, value});

test('the lesson has six steps with two frames each, math-delimited prose in both languages and only density actions', () => {
    expect(lesson.steps.map(step => step.id)).toEqual(STEP_IDS);
    for (const step of lesson.steps) {
        expect(step.frames).toHaveLength(2);
        expect(prose(step, 'sl').length).toBeGreaterThan(0);
        expect(prose(step, 'en').length).toBeGreaterThan(0);
        for (const action of actionsOf(step)) {
            expect(['prepared-scene', 'function-parameter', 'function-choice']).toContain(action.kind);
            if (action.kind === 'function-parameter') expect(['density-mu', 'density-sigma', 'density-a', 'density-b']).toContain(action.name);
            if (action.kind === 'function-choice') expect(action.name).toBe('density-example');
        }
    }
});

test('each density scene sets the example, mu, sigma and the bounds its text describes and shows the quoted readout, in one synchronous sequence', () => {
    const h = mount();
    try {
        // Step 1: the wide interval, the total area.
        h.scene(stepOf('density-total'));
        expect(model(h)).toMatchObject({mu: 0, sigma: 1, a: -4, b: 4});
        expect(readout('area-percent')).toBe('99,99');
        expect(densityAreaView(model(h)).probability).toBeCloseTo(0.99994, 5);

        // Step 2: a = -1,5 and b = 0,5.
        h.scene(stepOf('density-bounds'));
        expect(model(h)).toMatchObject({mu: 0, sigma: 1, a: -1.5, b: 0.5});
        expect(readout('area-percent')).toBe('62,47');
        expect(readout('area')).toBe('0,62466');
        expect(densityAreaView(model(h)).probability).toBeCloseTo(0.62466, 5);
        // The text's one-half check (a = -6, b = 0) and the equal bounds (area 0).
        h.apply(param('density-a', -6), param('density-b', 0));
        expect(readout('area-percent')).toBe('50');
        h.apply(param('density-a', 0));
        expect(readout('area-percent')).toBe('0');

        // Step 3: mu +- sigma reveals 68,27 % and the 2 sigma and 3 sigma shares and the outside share.
        h.scene(stepOf('density-one-sigma'));
        expect(model(h)).toMatchObject({a: -1, b: 1});
        expect(readout('area-percent')).toBe('68,27');
        expect(readout('area')).toBe('0,68269');
        expect([readout('za'), readout('zb')]).toEqual(['-1', '1']);
        h.apply(param('density-a', -2), param('density-b', 2));
        expect(readout('area-percent')).toBe('95,45');
        h.apply(param('density-a', -3), param('density-b', 3));
        expect(readout('area-percent')).toBe('99,73');
        expect(100 - 68.27).toBeCloseTo(31.73, 10);

        // Step 4: N(1; 1,5^2) with mu -+ sigma, and the second case of the text.
        h.scene(stepOf('density-shape'));
        expect(model(h)).toMatchObject({mu: 1, sigma: 1.5, a: -0.5, b: 2.5});
        expect(readout('area-percent')).toBe('68,27');
        expect([readout('za'), readout('zb')]).toEqual(['-1', '1']);
        h.apply(param('density-mu', -1), param('density-sigma', 0.85), param('density-a', -1.85), param('density-b', -0.15));
        expect(model(h)).toMatchObject({mu: -1, sigma: 0.85, a: -1.85, b: -0.15});
        expect(readout('area-percent')).toBe('68,27');
        expect([readout('za'), readout('zb')]).toEqual(['-1', '1']);

        // Step 5: N(100; 15^2), P(85 <= X <= 130) = Phi(2) - Phi(-1).
        h.scene(stepOf('density-iq'));
        expect(model(h)).toMatchObject({mu: 100, sigma: 15, a: 85, b: 130});
        expect(readout('area-percent')).toBe('81,86');
        expect(readout('area')).toBe('0,81859');
        expect([readout('za'), readout('zb')]).toEqual(['-1', '2']);
        h.apply(param('density-a', 70));
        expect(readout('area-percent')).toBe('95,45');

        // Step 6: back at the default, and the tails the text mentions.
        h.scene(stepOf('density-explore'));
        expect(model(h)).toMatchObject({mu: 0, sigma: 1, a: -1, b: 1});
        expect(readout('area-percent')).toBe('68,27');
        h.apply(param('density-a', -6), param('density-b', 0));
        expect(readout('area-percent')).toBe('50');
        h.apply(param('density-a', 2), param('density-b', 6));
        expect(densityAreaView(model(h)).probability * 100).toBeCloseTo(2.275, 2);
    } finally {
        h.mounted.view.unmount();
    }
});

test('every number the prose quotes appears in both languages, with the decimal comma only in Slovenian', () => {
    const quoted: ReadonlyArray<readonly [string, readonly string[]]> = [
        ['density-total', ['99,99']],
        ['density-bounds', ['62,47', '0,62466', '-1,5', '0,5']],
        ['density-one-sigma', ['68,27', '0,68269', '95,45', '99,73', '31,73']],
        ['density-shape', ['68,27', '1,5', '-0,5', '2,5', '0,85', '-1,85', '-0,15']],
        ['density-iq', ['81,86', '0,81859', '95,45']],
        ['density-explore', ['2,3']],
    ];
    for (const [stepId, numbers] of quoted) {
        for (const value of numbers) {
            expect(proseHas(stepId, value, 'sl'), `${stepId} sl ${value}`).toBe(true);
            expect(proseHas(stepId, value, 'en'), `${stepId} en ${value}`).toBe(true);
        }
    }
});

test('the prose says area under the density, labels 68-95-99,7 as a normal-law property and never calls a point a probability', () => {
    const all = (language: 'sl' | 'en') => lesson.steps.map(step => prose(step, language)).join(' ') + lesson.formulaBlocks.map(block => block.explanation[language]).join(' ');
    expect(all('sl')).toMatch(/ploščin/);
    expect(all('en')).toMatch(/area under the density/);
    expect(lesson.formulaBlocks[0].explanation.en).toMatch(/property of the normal distribution/);
    expect(lesson.formulaBlocks[0].explanation.sl).toMatch(/lastnost normalne porazdelitve/);
    expect(lesson.formulaBlocks[0].explanation.en).toMatch(/single value has probability/);
    expect(all('en')).not.toMatch(/probability of the point/i);
    expect(all('sl')).not.toMatch(/verjetnost točke/i);
});


// ---------------------------------------------------------------------------------------------------------------------
// P2: binomial to normal (`prob-binomial-normal`)
// ---------------------------------------------------------------------------------------------------------------------

const bnLesson = probabilityGuidedLessons.find(entry => entry.demonstrationId === 'prob-binomial-normal')!;
const bnStep = (stepId: string): GuidedLessonStep => bnLesson.steps.find(step => step.id === stepId)!;
const BN_STEP_IDS = ['binomial-bars', 'binomial-shade', 'binomial-correction', 'binomial-growing-n', 'binomial-poisson', 'binomial-explore'];

class ObservedBinomialNormalGraph extends BinomialNormalGraph {
    modelNow() { return this.model; }
    liveBoard() { return this.board; }
}

function mountBn() {
    const graph = new ObservedBinomialNormalGraph();
    const view = render(React.createElement(MemoryRouter, null, React.createElement(GraphHost, {create: () => graph})));
    expect(graph.state.initialized).toBe(true);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, view,
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        apply: (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); }),
    };
}
const bnChoice = (value: string): LessonAction => ({kind: 'function-choice', name: 'binomial-normal-example', value});
const bnReadouts = (...ids: string[]) => ids.map(readout);

/** Independent oracle: the binomial distribution function by a direct sum of integer-coefficient masses. */
const directCdf = (n: number, p: number, k: number) => {
    let total = 0;
    for (let j = 0; j <= k; j++) {
        let coefficient = 1;
        for (let i = 1; i <= j; i++) coefficient = coefficient * (n - j + i) / i;
        total += coefficient * p ** j * (1 - p) ** (n - j);
    }
    return total;
};
const bnView = (n: number, p: number, k: number) => {
    const model: BinomialNormalModel = {n, p, k, correction: true, poisson: false};
    return binomialNormalView(model);
};
const comma = (value: number) => value.toFixed(5).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');

test('P2: the lesson has six steps with two frames each, math-delimited prose in both languages and only binomial actions', () => {
    expect(bnLesson.steps.map(step => step.id)).toEqual(BN_STEP_IDS);
    for (const step of bnLesson.steps) {
        expect(step.frames).toHaveLength(2);
        expect(prose(step, 'sl').length).toBeGreaterThan(0);
        expect(prose(step, 'en').length).toBeGreaterThan(0);
        for (const action of actionsOf(step)) {
            expect(['prepared-scene', 'function-parameter', 'function-choice', 'function-visibility']).toContain(action.kind);
            if (action.kind === 'function-parameter') expect(['binomial-n', 'binomial-p', 'binomial-k']).toContain(action.name);
            if (action.kind === 'function-choice') expect(['binomial-normal-example', 'binomial-correction']).toContain(action.name);
            if (action.kind === 'function-visibility') expect(action.target).toBe('poisson-bars');
        }
    }
});

test('P2: each binomial scene sets the distribution its text describes and shows the quoted readout, in one synchronous sequence', () => {
    const h = mountBn();
    try {
        const model = () => h.graph.modelNow();

        // Step 1: B(20; 1/2), k = 10.
        h.scene(bnStep('binomial-bars'));
        expect(model()).toMatchObject({n: 20, p: 0.5, k: 10, correction: true, poisson: false});
        expect(readout('exact')).toBe('0,5881');
        expect(directCdf(20, 0.5, 10)).toBeCloseTo(0.5881, 5);

        // Step 2: k = 8, exact, corrected, error.
        h.scene(bnStep('binomial-shade'));
        expect(model()).toMatchObject({n: 20, p: 0.5, k: 8, correction: true});
        expect(bnReadouts('exact', 'corrected', 'error-corrected')).toEqual(['0,25172', '0,25117', '0,00055']);
        expect(directCdf(20, 0.5, 8)).toBeCloseTo(0.25172, 5);

        // Step 3: the correction is off, so the uncorrected area and its error show.
        h.scene(bnStep('binomial-correction'));
        expect(model()).toMatchObject({n: 20, p: 0.5, k: 8, correction: false});
        expect(bnReadouts('exact', 'uncorrected', 'error-uncorrected')).toEqual(['0,25172', '0,18555', '0,06618']);
        // The text's "switch the correction on" shows 0,25117 against 0,25172.
        h.apply({kind: 'function-choice', name: 'binomial-correction', value: 'on'});
        expect(model().correction).toBe(true);
        expect(bnReadouts('corrected', 'exact')).toEqual(['0,25117', '0,25172']);

        // Step 4: n = 50, k = 22 and the fitted view contains the bars at 25 +- 4 sigma.
        h.scene(bnStep('binomial-growing-n'));
        expect(model()).toMatchObject({n: 50, p: 0.5, k: 22, correction: true});
        expect(bnReadouts('exact', 'corrected', 'uncorrected', 'error-corrected', 'error-uncorrected'))
            .toEqual(['0,23994', '0,23975', '0,19807', '0,00019', '0,04187']);
        expect(directCdf(50, 0.5, 22)).toBeCloseTo(0.23994, 5);
        const [left, top, right, bottom] = [...h.graph.liveBoard().getBoundingBox()];
        const sigma = Math.sqrt(50 * 0.25);
        for (const x of [Math.round(25 - 4 * sigma), Math.round(25 + 4 * sigma)]) {
            const mass = directCdf(50, 0.5, x) - directCdf(50, 0.5, x - 1);
            expect(x).toBeGreaterThanOrEqual(left); expect(x).toBeLessThanOrEqual(right);
            expect(mass).toBeLessThanOrEqual(top); expect(mass).toBeGreaterThanOrEqual(bottom);
        }
        // The text's second case: the example B(100; 1/2) with k = 45.
        h.apply(bnChoice('fair100'));
        expect(model()).toMatchObject({n: 100, p: 0.5, k: 45});
        expect(bnReadouts('exact', 'corrected', 'uncorrected', 'error-corrected', 'error-uncorrected'))
            .toEqual(['0,1841', '0,18406', '0,15866', '0,00004', '0,02545']);

        // Step 5: n = 100, p = 0,02, k = 2 with the Poisson bars.
        h.scene(bnStep('binomial-poisson'));
        expect(model()).toMatchObject({n: 100, p: 0.02, k: 2, correction: true, poisson: true});
        expect(bnReadouts('exact', 'corrected', 'poisson', 'error-corrected', 'error-poisson'))
            .toEqual(['0,67669', '0,63951', '0,67668', '0,03718', '0,00001']);
        expect(directCdf(100, 0.02, 2)).toBeCloseTo(0.67669, 5);

        // Step 6: back at the default B(20; 1/2), k = 8, no Poisson bars.
        h.scene(bnStep('binomial-explore'));
        expect(model()).toMatchObject({n: 20, p: 0.5, k: 8, correction: true, poisson: false});
        expect(bnReadouts('exact', 'corrected')).toEqual(['0,25172', '0,25117']);
    } finally {
        h.view.unmount();
    }
});

test('P2: the numbers the text quotes beyond the scenes follow from the kernel and a direct binomial sum', () => {
    // P(X <= 9) at n = 20 (step 2 observation).
    expect(directCdf(20, 0.5, 9)).toBeCloseTo(0.4119, 5);
    expect(comma(bnView(20, 0.5, 9).exact)).toBe('0,4119');
    // sigma = sqrt(5) = 2,24 (step 1).
    expect(bnView(20, 0.5, 10).sigma).toBeCloseTo(Math.sqrt(5), 12);
    expect(Math.sqrt(5)).toBeCloseTo(2.24, 2);
    // B(100; 1/2), k = 45 (step 4 observation).
    const wide = bnView(100, 0.5, 45);
    expect(directCdf(100, 0.5, 45)).toBeCloseTo(0.1841, 5);
    expect(wide.exact).toBeCloseTo(directCdf(100, 0.5, 45), 12);
    expect([wide.exact, wide.corrected, wide.uncorrected].map(comma)).toEqual(['0,1841', '0,18406', '0,15866']);
    expect([wide.correctedError, wide.uncorrectedError].map(comma)).toEqual(['0,00004', '0,02545']);
    // The mean np = 2 of step 5, and the kernel against the direct sum for every scene.
    expect(bnView(100, 0.02, 2).lambda).toBeCloseTo(2, 12);
    for (const [n, p, k] of [[20, 0.5, 10], [20, 0.5, 8], [50, 0.5, 22], [100, 0.02, 2]] as const) {
        expect(bnView(n, p, k).exact).toBeCloseTo(directCdf(n, p, k), 12);
    }
});

test('P2: every number the prose quotes is on the allowed list, in both languages and with the decimal comma only in Slovenian', () => {
    const ALLOWED = new Set([
        '0.5881', '0.25172', '0.25117', '0.00055', '0.18555', '0.06618', '0.23994', '0.23975', '0.19807', '0.00019', '0.04187',
        '0.1841', '0.18406', '0.15866', '0.00004', '0.02545', '0.67669', '0.63951', '0.67668', '0.03718', '0.00001', '0.41190',
        '2.24', '0.1', '0.25', '0.4', '7.5', '8.5', '0.02', '0.9',
    ]);
    const stringsOf = (language: 'sl' | 'en') => [
        bnLesson.summary[language],
        ...bnLesson.learningGoals.map(goal => goal[language]),
        ...bnLesson.formulaBlocks.flatMap(block => [block.notation[language], block.explanation[language]]),
        ...bnLesson.steps.flatMap(step => [
            step.purpose[language], step.explanation[language], step.observationPrompt[language], step.scene!.expectedState[language],
            ...step.expectedObservations.map(o => o[language]),
        ]),
    ].join(' ');
    const numbersIn = (language: 'sl' | 'en') => {
        const source = stringsOf(language);
        // A decimal is two digit runs joined by `{,}` (Slovenian) or `.` (English).
        if (language === 'sl') expect(source).not.toMatch(/\d\.\d/);
        else expect(source).not.toMatch(/\{,\}/);
        const pattern = language === 'sl' ? /\d+\{,\}\d+/g : /\d+\.\d+/g;
        return (source.match(pattern) ?? []).map(value => value.replace('{,}', '.'));
    };
    for (const language of ['sl', 'en'] as const) {
        const found = numbersIn(language);
        expect(found.length).toBeGreaterThan(30);
        for (const value of found) expect(ALLOWED.has(value) || value === '0.41190', `${language} ${value}`).toBe(true);
    }
    expect(new Set(numbersIn('sl'))).toEqual(new Set(numbersIn('en')));
    // Every value asserted above is quoted in the text of its step, in both languages.
    const quoted: ReadonlyArray<readonly [string, readonly string[]]> = [
        ['binomial-bars', ['0,5881', '2,24']],
        ['binomial-shade', ['0,25172', '0,25117', '0,00055', '0,41190']],
        ['binomial-correction', ['0,18555', '0,06618', '0,25117', '0,25172']],
        ['binomial-growing-n', ['0,23994', '0,23975', '0,00019', '0,19807', '0,04187', '0,1841', '0,18406', '0,15866', '0,00004', '0,02545']],
        ['binomial-poisson', ['0,67669', '0,63951', '0,03718', '0,67668', '0,00001']],
    ];
    for (const [stepId, values] of quoted) {
        for (const value of values) {
            for (const language of ['sl', 'en'] as const) {
                const text = prose(bnStep(stepId), language);
                expect(text.includes(language === 'sl' ? value.replace(',', '{,}') : value.replace(',', '.')), `${stepId} ${language} ${value}`).toBe(true);
            }
        }
    }
});

test('P2: the text states the limit statement, that the correction is not optional, the Poisson regime and the labelled rule of thumb, in both languages', () => {
    const stepText = (stepId: string, language: 'sl' | 'en') => prose(bnStep(stepId), language);
    const all = (language: 'sl' | 'en') => [bnLesson.summary[language], ...bnLesson.learningGoals.map(g => g[language]), ...bnLesson.formulaBlocks.map(b => b.explanation[language]), ...bnLesson.steps.map(step => prose(step, language))].join(' ');
    // The limit statement (de Moivre-Laplace).
    expect(stepText('binomial-growing-n', 'sl')).toMatch(/limitno trditev/);
    expect(stepText('binomial-growing-n', 'en')).toMatch(/limit statement/);
    expect(stepText('binomial-growing-n', 'sl')).toMatch(/de Moivre/);
    expect(bnLesson.formulaBlocks[0].explanation.en).toMatch(/does not say how large/);
    // The correction is not optional at small n (step 3).
    expect(stepText('binomial-correction', 'sl')).toMatch(/popravka ne smemo izpustiti/);
    expect(stepText('binomial-correction', 'en')).toMatch(/correction must not be left out/);
    // The Poisson regime: n large, p small, np moderate (step 5).
    expect(stepText('binomial-poisson', 'sl')).toMatch(/\\\(n\\\) velik, \\\(p\\\) majhen in \\\(np\\\) zmeren/);
    expect(stepText('binomial-poisson', 'en')).toMatch(/when \\\(n\\\) is large, \\\(p\\\) small and \\\(np\\\) moderate/);
    // The rule of thumb is labelled as a rule of thumb, not a theorem.
    expect(stepText('binomial-poisson', 'sl')).toMatch(/pravilo palca \(pravilo palca, ne izrek\)/);
    expect(stepText('binomial-poisson', 'en')).toMatch(/rule of thumb \(a rule of thumb, not a theorem\)/);
    expect(all('sl')).toMatch(/np\\ge5/);
    expect(all('en')).toMatch(/np\\ge5/);
});
