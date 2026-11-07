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
import type {FunctionGraphState} from '../../graphs/functions/BaseFunctionGraph';
import {setLanguage} from '../../localization';
import {BinomialNormalGraph} from '../../graphs/functions/BinomialNormalGraph';
import {GraphHost} from '../../graphs/base/GraphHost';
import {binomialNormalView} from '../../analysis/binomialNormalModel';
import type {BinomialNormalModel} from '../../analysis/binomialNormalModel';
import {CltGraph} from '../../graphs/functions/CltGraph';
import {CLT_EXAMPLES, cltView, shapeMoments} from '../../analysis/cltModel';
import {normalCdf} from '../../analysis/distributions';
import {SummaryStatisticsGraph} from '../../graphs/functions/SummaryStatisticsGraph';
import {CorrelationGraph} from '../../graphs/functions/CorrelationGraph';
import {correlation} from '../../analysis/correlation';
import {CORRELATION_EXAMPLES} from '../../analysis/correlationModel';

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
const model = (h: Harness) => (h.graph.state as Readonly<FunctionGraphState<DensityAreaModel>>).model;
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

// ---------------------------------------------------------------------------------------------------------------------
// P3: the central limit theorem without randomness (`prob-clt`)
// ---------------------------------------------------------------------------------------------------------------------

const cltLesson = probabilityGuidedLessons.find(entry => entry.demonstrationId === 'prob-clt')!;
const cltStep = (stepId: string): GuidedLessonStep => cltLesson.steps.find(step => step.id === stepId)!;
const CLT_STEP_IDS = ['clt-base', 'clt-two', 'clt-more', 'clt-skewed', 'clt-shape', 'clt-distance', 'clt-explore'];

class ObservedCltGraph extends CltGraph {
    modelNow() { return this.model; }
}

function mountClt() {
    const graph = new ObservedCltGraph();
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
const cltN = (n: number): LessonAction => ({kind: 'function-parameter', name: 'clt-n', value: n});

/** Independent oracle: the Irwin-Hall distribution function (sum of n uniforms) by its closed form. */
const irwinHallCdf = (n: number, x: number) => {
    if (x <= 0) return 0;
    if (x >= n) return 1;
    let total = 0;
    let coefficient = 1;
    let factorial = 1;
    for (let i = 2; i <= n; i++) factorial *= i;
    for (let k = 0; k <= Math.floor(x); k++) {
        if (k > 0) coefficient = coefficient * (n - k + 1) / k;
        total += (k % 2 === 0 ? 1 : -1) * coefficient * (x - k) ** n;
    }
    return total / factorial;
};
/** Kolmogorov distance of the standardized Irwin-Hall sum from the standard normal, by a fine scan of z. */
const uniformDistance = (n: number) => {
    const sigma = Math.sqrt(n / 12);
    let best = 0;
    for (let z = -6; z <= 6; z += 0.0005) best = Math.max(best, Math.abs(irwinHallCdf(n, n / 2 + z * sigma) - normalCdf(z)));
    return best;
};

test('P3: the lesson has seven steps with two frames each, math-delimited prose in both languages and only CLT actions', () => {
    expect(cltLesson.steps.map(step => step.id)).toEqual(CLT_STEP_IDS);
    for (const step of cltLesson.steps) {
        expect(step.frames).toHaveLength(2);
        expect(prose(step, 'sl').length).toBeGreaterThan(0);
        expect(prose(step, 'en').length).toBeGreaterThan(0);
        for (const action of actionsOf(step)) {
            expect(['prepared-scene', 'function-parameter', 'function-choice', 'function-visibility', 'animation']).toContain(action.kind);
            if (action.kind === 'function-parameter') expect(action.name).toBe('clt-n');
            if (action.kind === 'function-choice') expect(action.name).toBe('clt-example');
            if (action.kind === 'function-visibility') expect(action.target).toBe('clt-cdf');
            if (action.kind === 'animation') expect(action).toMatchObject({animationId: 'clt-sum', command: 'next-step'});
        }
    }
});

test('P3: each CLT scene sets the shape and n its text describes and shows the quoted readout, in one synchronous sequence', () => {
    const h = mountClt();
    try {
        const model = () => h.graph.modelNow();
        const read = (...ids: string[]) => ids.map(readout);

        // Step 1: uniform, n = 1.
        h.scene(cltStep('clt-base'));
        expect(model()).toMatchObject({n: 1, cdf: false, heights: [1, 1, 1, 1, 1]});
        expect(read('n', 'mean', 'variance', 'kolmogorov')).toEqual(['1', '0,5', '0,0833', '0,05718']);

        // Step 2: one added copy, n = 2.
        h.scene(cltStep('clt-two'));
        expect(model()).toMatchObject({n: 2, cdf: false});
        expect(read('n', 'sum-mean', 'kolmogorov')).toEqual(['2', '1', '0,01644']);

        // Step 3: n = 5, then the n = 3 and n = 10 values the text asks the reader to visit.
        h.scene(cltStep('clt-more'));
        expect(model()).toMatchObject({n: 5});
        expect(read('kolmogorov')).toEqual(['0,00572']);
        h.apply(cltN(3));
        expect(read('kolmogorov')).toEqual(['0,00986']);
        h.apply(cltN(10));
        expect(read('kolmogorov')).toEqual(['0,00281']);

        // Step 4: skewed, n = 3 (the uniform value at n = 3 it compares with is the one above); n = 10 is quoted too.
        h.scene(cltStep('clt-skewed'));
        expect(model()).toMatchObject({n: 3, cdf: false, heights: CLT_EXAMPLES.skewed.heights});
        expect(read('mean', 'variance', 'kolmogorov')).toEqual(['0,3333', '0,0556', '0,02492']);
        h.apply(cltN(10));
        expect(read('kolmogorov')).toEqual(['0,01248']);

        // Step 5: the uniform shape at n = 5, heights free to drag.
        h.scene(cltStep('clt-shape'));
        expect(model()).toMatchObject({n: 5, heights: [1, 1, 1, 1, 1]});
        expect(read('kolmogorov')).toEqual(['0,00572']);

        // Step 6: skewed, n = 10, distribution function shown.
        h.scene(cltStep('clt-distance'));
        expect(model()).toMatchObject({n: 10, cdf: true, heights: CLT_EXAMPLES.skewed.heights});
        expect(read('kolmogorov')).toEqual(['0,01248']);

        // Step 7: back at the default (uniform, n = 1, no distribution function).
        h.scene(cltStep('clt-explore'));
        expect(model()).toMatchObject({n: 1, cdf: false, heights: [1, 1, 1, 1, 1]});
    } finally {
        h.view.unmount();
    }
});

test('P3: the uniform distances the text quotes equal an independent Irwin-Hall oracle; the skewed ones match the exact law within 4e-5', () => {
    for (const [n, shown] of [[1, 0.05718], [2, 0.01644], [3, 0.00986], [5, 0.00572], [10, 0.00281]] as const) {
        expect(Math.abs(uniformDistance(n) - shown), `uniform n=${n}`).toBeLessThan(4e-5);
    }
    // Spec P3 exact rational-law values for f(x) = 2(1-x): the grid readout is within 4e-5 of them.
    for (const [n, exact] of [[1, 0.07865], [3, 0.02492], [10, 0.01248]] as const) {
        const result = cltView({...CLT_EXAMPLES.skewed, n});
        expect(result.ok).toBe(true);
        if (result.ok) expect(Math.abs(result.view.kolmogorov - exact), `skewed n=${n}`).toBeLessThan(4e-5);
    }
    // Moments and skewness the text quotes: mean 1/3, variance 1/18, skewness 2*sqrt(2)/5 = 0,56569.
    expect(2 * Math.sqrt(2) / 5).toBeCloseTo(0.56569, 5);
    const moments = shapeMoments(CLT_EXAMPLES.skewed.heights)!;
    expect(moments.mean).toBeCloseTo(1 / 3, 3);
    expect(moments.variance).toBeCloseTo(1 / 18, 3);
});

test('P3: every number in the text is an allowed readout or spec value, both languages agree, and no rate constant is claimed', () => {
    const ALLOWED = new Set(['0.5', '0.0833', '0.05718', '0.01644', '0.00572', '0.00986', '0.00281', '0.0556', '0.56569', '0.02492', '0.01248']);
    const numbersIn = (language: 'sl' | 'en') => {
        const body = [cltLesson.summary[language], ...cltLesson.learningGoals.map(g => g[language]), ...cltLesson.formulaBlocks.map(b => b.explanation[language]), ...cltLesson.steps.map(step => prose(step, language))].join(' ');
        return (body.match(language === 'sl' ? /\d+\{,\}\d+/g : /\d+\.\d+/g) ?? []).map(value => value.replace('{,}', '.'));
    };
    for (const language of ['sl', 'en'] as const) {
        const found = numbersIn(language);
        expect(found.length).toBeGreaterThan(20);
        for (const value of found) expect(ALLOWED.has(value), `${language} ${value}`).toBe(true);
        for (const constant of ['0.028', '0.04']) expect(found).not.toContain(constant);
    }
    expect(new Set(numbersIn('sl'))).toEqual(new Set(numbersIn('en')));
    const quoted: ReadonlyArray<readonly [string, readonly string[]]> = [
        ['clt-base', ['0,0833', '0,05718']],
        ['clt-two', ['0,01644', '0,05718']],
        ['clt-more', ['0,00572', '0,00986', '0,00281']],
        ['clt-skewed', ['0,0556', '0,56569', '0,02492', '0,00986', '0,01248']],
        ['clt-shape', ['0,00572']],
        ['clt-distance', ['0,01248', '0,00281']],
    ];
    for (const [stepId, values] of quoted) {
        for (const value of values) {
            for (const language of ['sl', 'en'] as const) {
                const text = prose(cltStep(stepId), language);
                expect(text.includes(language === 'sl' ? value.replace(',', '{,}') : value.replace(',', '.')), `${stepId} ${language} ${value}`).toBe(true);
            }
        }
    }
});

test('P3: the text names the theorem, its hypotheses and sources, says convergence is in distribution and that skew slows the approach, in both languages', () => {
    const all = (language: 'sl' | 'en') => [cltLesson.summary[language], ...cltLesson.formulaBlocks.map(b => b.explanation[language]), ...cltLesson.steps.map(step => prose(step, language)), ...cltLesson.sources.map(source => source.citation)].join(' ');
    expect(all('sl')).toMatch(/centralni limitni izrek/i);
    expect(all('en')).toMatch(/central limit theorem/i);
    expect(all('sl')).toMatch(/neodvisne, enako porazdeljene spremenljivke s končno varianco/);
    expect(all('en')).toMatch(/independent, identically distributed variables with finite variance/);
    expect(all('sl')).toMatch(/konvergenca v porazdelitvi/);
    expect(all('en')).toMatch(/convergence in distribution/);
    expect(all('sl')).toMatch(/FMF, Verjetnost in Statistika/);
    expect(all('en')).toMatch(/FMF, Verjetnost and Statistika/);
    expect(all('en')).toMatch(/Cited, not opened/);
    expect(prose(cltStep('clt-skewed'), 'sl')).toMatch(/Poševnost približevanje upočasni/);
    expect(prose(cltStep('clt-skewed'), 'en')).toMatch(/Skewness slows the approach/);
    expect(prose(cltStep('clt-distance'), 'sl')).toMatch(/ni hitrost/);
    expect(prose(cltStep('clt-distance'), 'en')).toMatch(/is not a rate/);
});

const summaryLesson = probabilityGuidedLessons.find(entry => entry.demonstrationId === 'prob-summary')!;
const summaryStep = (stepId: string): GuidedLessonStep => summaryLesson.steps.find(step => step.id === stepId)!;
const SUMMARY_STEP_IDS = ['summary-markers', 'summary-move', 'summary-box', 'summary-spread', 'summary-convention', 'summary-explore'];

class ObservedSummaryGraph extends SummaryStatisticsGraph {
    modelNow() { return this.model; }
}

function mountSummary() {
    const graph = new ObservedSummaryGraph();
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
const summaryChoice = (name: string, value: string): LessonAction => ({kind: 'function-choice', name, value}) as LessonAction;

test('P4: the lesson has six steps with two frames each, prose in both languages and only summary actions', () => {
    expect(summaryLesson.steps.map(step => step.id)).toEqual(SUMMARY_STEP_IDS);
    for (const step of summaryLesson.steps) {
        expect(step.frames).toHaveLength(2);
        expect(prose(step, 'sl').length).toBeGreaterThan(0);
        expect(prose(step, 'en').length).toBeGreaterThan(0);
        for (const action of actionsOf(step)) {
            expect(['prepared-scene', 'function-choice', 'function-visibility', 'summary']).toContain(action.kind);
            if (action.kind === 'function-choice') expect(['summary-example', 'summary-rule']).toContain(action.name);
            if (action.kind === 'function-visibility') expect(['summary-box-plot', 'summary-sigma-band']).toContain(action.target);
        }
    }
});

test('P4: each summary scene sets the data and display its text describes and shows the quoted readouts, in one synchronous sequence', () => {
    const h = mountSummary();
    try {
        const model = () => h.graph.modelNow();
        const read = (...ids: string[]) => ids.map(readout);

        h.scene(summaryStep('summary-markers'));
        expect(model()).toMatchObject({values: [4, 5, 5, 6, 6, 7, 8], boxPlot: false, sigmaBand: false, rule: 'inclusive', sigma: 'population'});
        expect(read('mean', 'median')).toEqual(['5,857143', '6']);

        h.scene(summaryStep('summary-move'));
        expect(model()).toMatchObject({values: [4, 5, 5, 6, 6, 7, 30], boxPlot: false});
        expect(read('mean', 'median', 'sigma')).toEqual(['9', '6', '8,6189']);

        h.scene(summaryStep('summary-box'));
        expect(model()).toMatchObject({values: [4, 5, 5, 6, 6, 7, 30], boxPlot: true});
        expect(read('q1', 'q3', 'iqr', 'fences', 'outliers')).toEqual(['5', '6,5', '1,5', '2,75 in 8,75', '30']);

        h.scene(summaryStep('summary-spread'));
        expect(model()).toMatchObject({values: [4, 5, 5, 6, 6, 7, 30, 20], sigmaBand: true});
        expect(read('n', 'mean', 'median', 'sigma')).toEqual(['8', '10,375', '6', '8,845']);

        h.scene(summaryStep('summary-convention'));
        expect(model()).toMatchObject({values: [4, 5, 5, 6, 6, 7, 8], rule: 'exclusive', sigma: 'population'});
        expect(read('q1', 'q3', 'iqr')).toEqual(['5', '7', '2']);
        expect(read('sigma')).toEqual(['1,2454']);
        h.apply(summaryChoice('summary-rule', 'inclusive'));
        expect(read('q1', 'q3', 'iqr')).toEqual(['5', '6,5', '1,5']);
        h.apply(summaryChoice('summary-sigma', 'sample'));
        expect(read('sigma')).toEqual(['1,3452']);

        h.scene(summaryStep('summary-explore'));
        expect(model()).toMatchObject({values: [4, 5, 5, 6, 6, 7, 8], boxPlot: true, sigmaBand: false, rule: 'inclusive', sigma: 'population'});
        expect(read('n', 'mean', 'median')).toEqual(['7', '5,857143', '6']);
        h.apply(summaryChoice('summary-example', 'even'));
        expect(read('median')).toEqual(['4']);
    } finally {
        h.view.unmount();
    }
});

test('P4: every number in the text is an allowed readout or spec value, both languages agree, and the conventions are named', () => {
    const ALLOWED = new Set(['5.857143', '6.5', '1.5', '2.75', '8.75', '10.375', '8.6189', '8.845', '1.2454', '1.3452']);
    const numbersIn = (language: 'sl' | 'en') => {
        const body = [summaryLesson.summary[language], ...summaryLesson.learningGoals.map(g => g[language]), ...summaryLesson.formulaBlocks.map(b => b.explanation[language]), ...summaryLesson.steps.map(step => prose(step, language))].join(' ');
        return (body.match(language === 'sl' ? /\d+\{,\}\d+/g : /\d+\.\d+/g) ?? []).map(value => value.replace('{,}', '.'));
    };
    for (const language of ['sl', 'en'] as const) {
        const found = numbersIn(language);
        expect(found.length).toBeGreaterThan(20);
        for (const value of found) expect(ALLOWED.has(value), `${language} ${value}`).toBe(true);
        expect(found).not.toContain('9.3095');
    }
    expect(new Set(numbersIn('sl'))).toEqual(new Set(numbersIn('en')));
    const quoted: ReadonlyArray<readonly [string, readonly string[]]> = [
        ['summary-markers', ['5,857143']],
        ['summary-move', ['8,6189']],
        ['summary-box', ['6,5', '1,5', '2,75', '8,75']],
        ['summary-spread', ['8,6189', '10,375', '8,845']],
        ['summary-convention', ['1,2454', '1,3452', '6,5', '1,5']],
    ];
    for (const [stepId, values] of quoted) {
        for (const value of values) {
            for (const language of ['sl', 'en'] as const) {
                const body = prose(summaryStep(stepId), language);
                expect(body.includes(language === 'sl' ? value.replace(',', '{,}') : value.replace(',', '.')), `${stepId} ${language} ${value}`).toBe(true);
            }
        }
    }
    const conventionSl = prose(summaryStep('summary-convention'), 'sl');
    const conventionEn = prose(summaryStep('summary-convention'), 'en');
    expect(conventionSl).toMatch(/šolsko pravilo/);
    expect(conventionSl).toMatch(/populacijski/);
    expect(conventionSl).toMatch(/Kalkulatorji in programi/);
    expect(conventionSl).toMatch(/dogovor/);
    expect(conventionEn).toMatch(/school rule/);
    expect(conventionEn).toMatch(/population/);
    expect(conventionEn).toMatch(/Calculators and software/);
    expect(conventionEn).toMatch(/convention/);
});

const correlationLesson = probabilityGuidedLessons.find(entry => entry.demonstrationId === 'prob-correlation')!;
const correlationStep = (stepId: string): GuidedLessonStep => correlationLesson.steps.find(step => step.id === stepId)!;
const CORRELATION_STEP_IDS = ['correlation-scatter', 'correlation-line', 'correlation-outlier', 'correlation-parabola', 'correlation-x-on-y', 'correlation-explore'];

class ObservedCorrelationGraph extends CorrelationGraph {
    modelNow() { return this.model; }
}

function mountCorrelation() {
    const graph = new ObservedCorrelationGraph();
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
    };
}

test('P5: the lesson has six steps with two frames each, prose in both languages and only correlation actions', () => {
    expect(correlationLesson.steps.map(step => step.id)).toEqual(CORRELATION_STEP_IDS);
    for (const step of correlationLesson.steps) {
        expect(step.frames).toHaveLength(2);
        expect(prose(step, 'sl').length).toBeGreaterThan(0);
        expect(prose(step, 'en').length).toBeGreaterThan(0);
        for (const action of actionsOf(step)) {
            expect(['prepared-scene', 'function-choice', 'function-visibility', 'correlation']).toContain(action.kind);
            if (action.kind === 'function-choice') expect(action.name).toBe('correlation-example');
            if (action.kind === 'function-visibility') expect(['correlation-residuals', 'correlation-x-on-y']).toContain(action.target);
        }
    }
});

test('P5: each correlation scene sets the data and display its text describes, and its quoted values are those of the model, in one synchronous sequence', () => {
    const h = mountCorrelation();
    const fmt = (value: number | undefined, digits: number) => (value === undefined ? '' : String(Number(value.toFixed(digits)))).replace('.', ',');
    try {
        const model = () => h.graph.modelNow();
        const read = (...ids: string[]) => ids.map(readout);

        h.scene(correlationStep('correlation-scatter'));
        expect(model()).toMatchObject({points: CORRELATION_EXAMPLES.default, residuals: false, xOnY: false});

        h.scene(correlationStep('correlation-line'));
        const line = correlation(CORRELATION_EXAMPLES.default);
        expect(model()).toMatchObject({points: CORRELATION_EXAMPLES.default, residuals: true, xOnY: false});
        expect(read('r', 'equation', 'ssres')).toEqual(['0,92338', 'y = 0,9x + 0,9', '0,7']);
        expect(fmt(line.r, 5)).toBe('0,92338');
        expect(fmt(line.yOnX?.residualSumOfSquares, 6)).toBe('0,7');

        h.scene(correlationStep('correlation-outlier'));
        const outlier = correlation([[0, 1], [1, 2], [2, 2], [3, 8]]);
        expect(model().points).toEqual([[0, 1], [1, 2], [2, 2], [3, 8]]);
        expect(read('r', 'slope', 'intercept', 'ssres')).toEqual(['0,8468', '2,1', '0,1', '8,7']);
        expect(fmt(outlier.r, 5)).toBe('0,8468');
        expect(fmt(outlier.yOnX?.residualSumOfSquares, 6)).toBe('8,7');

        h.scene(correlationStep('correlation-parabola'));
        expect(model().points).toEqual(CORRELATION_EXAMPLES.parabola);
        expect(correlation(CORRELATION_EXAMPLES.parabola).nSxy).toBe(0);
        expect(read('r', 'slope', 'intercept')).toEqual(['0', '0', '4']);

        h.scene(correlationStep('correlation-x-on-y'));
        expect(model()).toMatchObject({points: CORRELATION_EXAMPLES.default, xOnY: true});
        expect(read('xony', 'r2')).toEqual(['x = 0,94737y - 0,63158', '0,852632']);
        const xOnY = line.xOnY!;
        expect(xOnY.slope).toBeCloseTo(0.94737, 5);
        expect(xOnY.intercept).toBeCloseTo(-0.63158, 5);
        expect(line.yOnX!.slope * xOnY.slope).toBeCloseTo(line.rSquared!, 12);

        h.scene(correlationStep('correlation-explore'));
        expect(model()).toMatchObject({points: CORRELATION_EXAMPLES.default, residuals: true, xOnY: false});
        expect(read('r')).toEqual(['0,92338']);
        expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    } finally {
        h.view.unmount();
    }
});

test('P5: every number in the text is a model value, both languages agree, and the claims of acceptance 4 are made in both languages', () => {
    const ALLOWED = new Set(['0.92338', '0.9', '0.7', '0.84680', '2.1', '0.1', '8.7', '0.94737', '0.63158', '0.852632']);
    const numbersIn = (language: 'sl' | 'en') => {
        const body = [correlationLesson.summary[language], ...correlationLesson.learningGoals.map(g => g[language]), ...correlationLesson.formulaBlocks.map(b => b.explanation[language]), ...correlationLesson.steps.map(step => prose(step, language))].join(' ');
        return (body.match(language === 'sl' ? /\d+\{,\}\d+/g : /\d+\.\d+/g) ?? []).map(value => value.replace('{,}', '.'));
    };
    for (const language of ['sl', 'en'] as const) {
        const found = numbersIn(language);
        expect(found.length).toBeGreaterThan(20);
        for (const value of found) expect(ALLOWED.has(value), `${language} ${value}`).toBe(true);
    }
    expect(new Set(numbersIn('sl'))).toEqual(new Set(numbersIn('en')));
    const quoted: ReadonlyArray<readonly [string, readonly string[]]> = [
        ['correlation-line', ['0,92338', '0,9', '0,7']],
        ['correlation-outlier', ['0,92338', '0,84680', '2,1', '0,1', '8,7']],
        ['correlation-x-on-y', ['0,94737', '0,63158', '0,852632']],
    ];
    for (const [stepId, values] of quoted) {
        for (const value of values) {
            for (const language of ['sl', 'en'] as const) {
                const body = prose(correlationStep(stepId), language);
                expect(body.includes(language === 'sl' ? value.replace(',', '{,}') : value.replace(',', '.')), `${stepId} ${language} ${value}`).toBe(true);
            }
        }
    }
    const whole = (language: 'sl' | 'en') => [correlationLesson.summary[language], ...correlationLesson.learningGoals.map(g => g[language]), ...correlationLesson.formulaBlocks.map(b => b.explanation[language]), ...correlationLesson.steps.map(step => prose(step, language))].join(' ');
    const needles: Record<'sl' | 'en', readonly RegExp[]> = {
        sl: [/samo linearno povezanost/, /ne pomeni neodvisnosti/, /ne pomeni vzročnosti/, /osamelec/, /modelska izbira/, /preprost\w* povezav/, /univerzitetna razširitev/, /korelacijski koeficient/, /regresijska premica/],
        en: [/linear association only/, /does not mean independence/, /does not mean causation/, /outlier/, /modelling choice/, /simple relation/, /university-level extension/, /correlation coefficient/, /regression line/],
    };
    for (const language of ['sl', 'en'] as const) for (const needle of needles[language]) expect(whole(language), `${language} ${needle}`).toMatch(needle);
});
