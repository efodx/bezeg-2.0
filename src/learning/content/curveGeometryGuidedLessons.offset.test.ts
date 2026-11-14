import {act} from '@testing-library/react';
import {getLessonForDemonstration, sceneActions} from '../runtime/lessonCatalog';
import {LessonSession} from '../runtime/LessonSession';
import {curveGeometryGuidedLessons, OFFSET_SEGMENT} from './curveGeometryGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {currentLanguage, setLanguage, t} from '../../localization';
import {fitBoundingBox} from '../../graphs/base/fitBoundingBox';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(() => setLanguage('sl'));

// ---- L5: the offset curves ------------------------------------------------------------------------------------------------

const ID = 'curve-offset';
type Language = 'sl' | 'en';
type Drawn = {
    elType: string; dataX?: number[]; dataY?: number[]; X?: () => number; Y?: () => number; plaintext?: string;
    evalVisProp: (name: string) => unknown;
};
type OffsetGraphView = {
    state: { offsetD: number; offsetSamples: number; offsetShown: boolean; offsetCuspsShown: boolean; offsetSpeedPlotShown: boolean };
    board: { objectsList: Drawn[]; update(): void; getBoundingBox(): number[] };
    curveKind(): 'bezier' | 'ph';
    controlRows(): number[][] | undefined;
    getFirstCurve(): { getPoints(): Array<{ X(): number; Y(): number }> };
    offset(): {
        ownedElements(): readonly unknown[]; cuspCount(): number; readoutText(): string; readoutLines(): string[];
        geometry(): { cusps: Array<{ t: number; point: [number, number] }>; factor: { t: number[]; factor: number[] } };
    } | undefined;
};
type ExactOffset = { getOffsetCurves(): Array<{ eval(t: number): { X(): number; Y(): number } }>; getOffsetCurveDistance(): number };

const lesson = curveGeometryGuidedLessons.find(item => item.demonstrationId === ID)!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;

function mount() {
    const graph = createGraph(ID);
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as OffsetGraphView & typeof graph, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneActions(step.scene!)) capabilities.apply(action);
        }),
        apply: (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); }),
    };
}

const owned = (graph: OffsetGraphView) => [...graph.offset()!.ownedElements()] as Drawn[];
const traceOf = (graph: OffsetGraphView) => owned(graph).find(element => element.elType === 'curve')!;
/** The visible cusp markers, as board positions. */
const markersOf = (graph: OffsetGraphView): Array<[number, number]> =>
    owned(graph).filter(element => element.elType === 'point' && element.evalVisProp('visible')).map(point => [point.X!(), point.Y!()]);
const captionsOf = (graph: OffsetGraphView) => owned(graph).filter(element => element.elType === 'text').map(element => element.plaintext ?? '').filter(Boolean);
const finiteSamples = (curve: Drawn) =>
    (curve.dataX ?? []).map((x, i) => [x, curve.dataY![i]] as [number, number]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
const exactOffsetOf = (graph: OffsetGraphView) => graph.getFirstCurve() as unknown as ExactOffset;
/** Board objects that are not tick labels (a pool whose size follows the view, and grows when the wider PH view has been shown). */
const countWithoutTickLabels = (graph: OffsetGraphView) => {
    const own = owned(graph);
    return graph.board.objectsList.filter(element => !(element.elType === 'label' || (element.elType === 'text' && !own.includes(element)))).length;
};

const PARABOLA = [[-1, 1], [0, -1], [1, 1]];
/** The windows written down here, not read from the lesson: the parabola and segment window, and the PH route's window. */
const BEZIER_VIEW = [-3, 3.4, 3, -1.2];
const PH_VIEW = [-6, 5, 6, -5];
/** [step id, d, samples, cusps shown, plot shown, expected cusp count, curve kind, view box, control points or undefined for the PH curve]. */
const CONTRACT: ReadonlyArray<readonly [string, number, number, boolean, boolean, number, 'bezier' | 'ph', readonly number[], number[][] | undefined]> = [
    ['offset-predict', -0.5, 128, false, false, 0, 'bezier', BEZIER_VIEW, [[-1, 0], [0, 0], [1, 0]]],
    ['offset-small', -0.25, 128, true, false, 0, 'bezier', BEZIER_VIEW, PARABOLA],
    ['offset-first-cusp', -0.5, 128, true, false, 1, 'bezier', BEZIER_VIEW, PARABOLA],
    ['offset-ph', -0.5, 128, false, false, 0, 'ph', PH_VIEW, undefined],
    ['offset-cusps-plot', -1, 128, true, true, 2, 'bezier', BEZIER_VIEW, PARABOLA],
    ['offset-explore', -0.25, 128, true, true, 0, 'bezier', BEZIER_VIEW, PARABOLA],
];
const stepIds = CONTRACT.map(row => row[0]);

const near = (actual: readonly number[], expected: readonly number[], tolerance: number, label: string) => {
    expect(actual, label).toHaveLength(expected.length);
    expected.forEach((value, index) => expect(Math.abs(actual[index] - value), `${label} [${index}]`).toBeLessThan(tolerance));
};

/** The parabola y = x^2 with x = 2t - 1, by its own derivatives. */
const baseX = (t: number) => 2 * t - 1;
const kappaOf = (x: number) => 2 / (1 + 4 * x * x) ** 1.5;
/** The right-normal offset of y = x^2 at x, from the closed form. */
const parabolaOffset = (x: number, d: number): [number, number] => {
    const s = Math.sqrt(1 + 4 * x * x);
    return [x + d * 2 * x / s, x * x - d / s];
};
/** The cusp abscissa of d = -1: (1 + 4x^2)^(3/2) = 2. */
const CUSP_X = Math.sqrt((2 ** (2 / 3) - 1) / 4);

/** The distance from p to the parabola on x in [-1, 1], by a scan and a golden-section refinement. */
function distanceToParabola(p: readonly [number, number]): number {
    const f = (x: number) => (x - p[0]) ** 2 + (x * x - p[1]) ** 2;
    const n = 2000;
    let best = 0;
    for (let i = 1; i <= n; i++) if (f(-1 + 2 * i / n) < f(-1 + 2 * best / n)) best = i;
    let a = Math.max(-1, -1 + 2 * (best - 1) / n), b = Math.min(1, -1 + 2 * (best + 1) / n);
    const g = (Math.sqrt(5) - 1) / 2;
    for (let k = 0; k < 80; k++) {
        const c = b - g * (b - a), e = a + g * (b - a);
        if (f(c) < f(e)) b = e; else a = c;
    }
    return Math.sqrt(f((a + b) / 2));
}

test('the offset lesson has the six scenes of the contract in order', () => {
    expect(lesson.steps.map(step => step.id)).toEqual(stepIds);
    expect(lesson.steps.map(step => step.scene!.id)).toEqual(
        ['offset-segment', 'offset-parabola-small', 'offset-parabola-first-cusp', 'offset-ph-exact', 'offset-parabola-cusps', 'offset-explore-start']);
});

test('every offset scene sets d, samples, switches, curve, view and the cusps as the contract says, on the real board', () => {
    const h = mount();
    try {
        for (const [id, d, samples, cusps, plot, cuspCount, kind, view, points] of CONTRACT) {
            h.scene(stepOf(id));
            h.graph.board.update();
            expect(h.graph.state, id).toMatchObject({offsetD: d, offsetSamples: samples, offsetShown: true, offsetCuspsShown: cusps, offsetSpeedPlotShown: plot});
            expect(h.graph.curveKind(), `${id} kind`).toBe(kind);
            if (points) expect(h.graph.getFirstCurve().getPoints().map(point => [point.X(), point.Y()]), `${id} curve`).toEqual(points);
            expect(h.graph.offset()!.cuspCount(), `${id} cusp count`).toBe(cuspCount);
            // The objects themselves: the trace is on the board and the markers follow the switch and the count.
            expect(traceOf(h.graph).evalVisProp('visible'), `${id} trace`).toBe(true);
            expect(traceOf(h.graph).dataX, `${id} samples drawn`).toHaveLength(samples);
            expect(markersOf(h.graph), `${id} markers`).toHaveLength(cusps ? cuspCount : 0);
            // The view goes through fitBoundingBox (margins, equal units) at the harness's 600 by 400 canvas.
            const [left, top, right, bottom] = view;
            const expected = fitBoundingBox([[left, top], [right, bottom]], 600, 400)!;
            const box = h.graph.board.getBoundingBox();
            expect(box).toHaveLength(4);
            box.forEach((value, index) => expect(value, `${id} box ${index}`).toBeCloseTo(expected[index], 9));
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('the first scene is the segment fixture with a parallel segment at y = 1/2 and the objects the inventory counts', () => {
    const h = mount();
    try {
        h.scene(stepOf('offset-predict'));
        h.graph.board.update();
        expect(OFFSET_SEGMENT.points).toEqual([[-1, 0], [0, 0], [1, 0]]);
        const samples = finiteSamples(traceOf(h.graph));
        expect(samples).toHaveLength(128);
        samples.forEach(([x, y], i) => {
            expect(Math.abs(y - 0.5), `y ${i}`).toBeLessThan(1e-12);
            expect(Math.abs(x - (-1 + 2 * i / 127)), `x ${i}`).toBeLessThan(1e-12);
        });
        // The visible curves and points of the board, as scripts/generate-guided-example-inventory.cjs counts them for the first frame.
        const visible = (type: string) => h.graph.board.objectsList.filter(element => element.elType === type && element.evalVisProp('visible')).length;
        expect({curve: visible('curve'), point: visible('point')}).toEqual({curve: 2, point: 3});
    } finally {
        h.mounted.view.unmount();
    }
});

type Snapshot = ReturnType<typeof snapshot>;
function snapshot(graph: OffsetGraphView) {
    return {
        state: {...graph.state}, kind: graph.curveKind(), rows: graph.controlRows(), box: graph.board.getBoundingBox(),
        dataX: [...traceOf(graph).dataX!], dataY: [...traceOf(graph).dataY!], markers: markersOf(graph),
        captions: captionsOf(graph), readout: graph.offset()!.readoutLines(), objects: countWithoutTickLabels(graph), cusps: graph.offset()!.cuspCount(),
    };
}

test('a scene looks the same from every earlier scene as from a fresh board, including back from the PH curve', () => {
    const fresh = new Map<string, Snapshot>();
    for (const id of stepIds) {
        const h = mount();
        try {
            h.scene(stepOf(id));
            h.graph.board.update();
            fresh.set(id, snapshot(h.graph));
        } finally {
            h.mounted.view.unmount();
        }
    }
    const h = mount();
    try {
        for (const from of stepIds) {
            for (const to of stepIds) {
                h.scene(stepOf(from));
                h.graph.board.update();
                h.scene(stepOf(to));
                h.graph.board.update();
                expect(snapshot(h.graph), `${from} then ${to}`).toEqual(fresh.get(to));
            }
        }
        // The scenes really differ, so the comparison above is not vacuous.
        expect(fresh.get('offset-ph')!.kind).toBe('ph');
        expect(fresh.get('offset-predict')!.rows).not.toEqual(fresh.get('offset-small')!.rows);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the PH scene draws the PH curve with one exact offset at d, and restoring a state captured on it leaves the PH curve on screen', () => {
    const h = mount();
    try {
        h.scene(stepOf('offset-ph'));
        h.graph.board.update();
        const ph = exactOffsetOf(h.graph);
        expect(h.graph.curveKind()).toBe('ph');
        expect(ph.getOffsetCurves()).toHaveLength(1);
        expect(ph.getOffsetCurveDistance()).toBe(-0.5);
        const onPh = snapshot(h.graph);
        expect(finiteSamples(traceOf(h.graph))).toHaveLength(128);
        const captured = h.capabilities.captureState();
        h.scene(stepOf('offset-first-cusp'));
        expect(h.graph.curveKind()).toBe('bezier');
        act(() => h.capabilities.restoreState(captured));
        h.graph.board.update();
        expect(h.graph.curveKind(), 'kind after restoring the PH capture').toBe('ph');
        expect(exactOffsetOf(h.graph).getOffsetCurves()).toHaveLength(1);
        expect(exactOffsetOf(h.graph).getOffsetCurveDistance()).toBe(-0.5);
        expect(snapshot(h.graph)).toEqual(onPh);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the sampled offset is at distance |d| from the base curve at every sample of scenes 2, 3 and 5, from the board curve data', () => {
    const h = mount();
    try {
        for (const [id, d] of [['offset-small', -0.25], ['offset-first-cusp', -0.5], ['offset-cusps-plot', -1]] as const) {
            h.scene(stepOf(id));
            h.graph.board.update();
            const trace = traceOf(h.graph);
            expect(trace.dataX, id).toHaveLength(128);
            let checked = 0;
            trace.dataX!.forEach((x, i) => {
                const p: [number, number] = [x, trace.dataY![i]];
                expect(Number.isFinite(p[0]) && Number.isFinite(p[1]), `${id} sample ${i} finite`).toBe(true);
                // Sample i belongs to the parameter i / 127: the generating point is at distance |d| along the right normal (y', -x').
                const bx = baseX(i / 127), by = bx * bx;
                expect(Math.abs(Math.hypot(p[0] - bx, p[1] - by) - Math.abs(d)), `${id} sample ${i} generating distance`).toBeLessThan(1e-9);
                const s = Math.hypot(1, 2 * bx);
                near([p[0] - bx, p[1] - by], [d * 2 * bx / s, -d / s], 1e-9, `${id} sample ${i} right-normal offset`);
                near(p, parabolaOffset(bx, d), 1e-9, `${id} sample ${i} closed form`);
                // Where the offset stays within the focal distance (scenes 2 and 3), |d| is the distance to the whole curve.
                if (d > -1) expect(Math.abs(distanceToParabola(p) - Math.abs(d)), `${id} sample ${i} distance to the curve`).toBeLessThan(1e-9);
                checked++;
            });
            expect(checked).toBe(128);
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('the cusp markers of d = -1 are at (-+0.2251, 0.9406) and solve 1 + d kappa = 0; at d = -1/2 the one marker is (0, 1/2)', () => {
    const h = mount();
    try {
        h.scene(stepOf('offset-cusps-plot'));
        h.graph.board.update();
        const markers = markersOf(h.graph).sort((a, b) => a[0] - b[0]);
        expect(markers).toHaveLength(2);
        near(markers[0], [-0.2251, 0.9406], 1e-3, 'left marker');
        near(markers[1], [0.2251, 0.9406], 1e-3, 'right marker');
        // The markers are the offset points at x = -+X, where X solves 1 - kappa(x) = 0.
        expect(Math.abs(1 - kappaOf(CUSP_X))).toBeLessThan(1e-12);
        near(markers[0], parabolaOffset(CUSP_X, -1), 1e-6, 'left marker at the closed form');
        near(markers[1], parabolaOffset(-CUSP_X, -1), 1e-6, 'right marker at the closed form');
        const cusps = h.graph.offset()!.geometry().cusps;
        expect(cusps).toHaveLength(2);
        for (const cusp of cusps) {
            const x = baseX(cusp.t);
            expect(Math.abs(1 + -1 * kappaOf(x)), `1 + d kappa at x = ${x}`).toBeLessThan(1e-6);
            expect(Math.abs(Math.abs(x) - CUSP_X), 'cusp abscissa').toBeLessThan(1e-6);
        }
        // The speed factor the plot receives changes sign across each cusp parameter.
        const factor = h.graph.offset()!.geometry().factor;
        for (const cusp of cusps) {
            const before = factor.factor[Math.floor(cusp.t * 127)], after = factor.factor[Math.ceil(cusp.t * 127)];
            expect(before * after, `factor sign change at t = ${cusp.t}`).toBeLessThanOrEqual(0);
        }

        h.scene(stepOf('offset-first-cusp'));
        h.graph.board.update();
        const single = markersOf(h.graph);
        expect(single).toHaveLength(1);
        near(single[0], [0, 0.5], 1e-6, 'marker at d = -1/2');
        const t = h.graph.offset()!.geometry().cusps[0].t;
        expect(Math.abs(1 + -0.5 * kappaOf(baseX(t)))).toBeLessThan(1e-6);
        expect(Math.abs(baseX(t))).toBeLessThan(1e-6);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the PH scene: the sampled offset equals the exact rational offset on the board (the right-normal sign of phOffsetRational)', () => {
    const h = mount();
    try {
        h.scene(stepOf('offset-ph'));
        h.graph.board.update();
        const exact = exactOffsetOf(h.graph).getOffsetCurves()[0];
        const trace = traceOf(h.graph);
        expect(trace.dataX).toHaveLength(128);
        trace.dataX!.forEach((x, i) => {
            const point = exact.eval(i / 127);
            near([x, trace.dataY![i]], [point.X(), point.Y()], 1e-7, `sample ${i}`);
        });
    } finally {
        h.mounted.view.unmount();
    }
});

test('the captions say the sampled offset is approximate in every scene and name the exact offset only on the PH step, in both languages', () => {
    const h = mount();
    try {
        for (const language of ['sl', 'en'] as const) {
            setLanguage(language);
            expect(currentLanguage()).toBe(language);
            for (const id of stepIds) {
                h.scene(stepOf(id));
                h.graph.board.update();
                const lines = h.graph.offset()!.readoutLines();
                expect(lines, `${language} ${id}`).toContain(t('offset_readout_approx'));
                expect(captionsOf(h.graph), `${language} ${id} board`).toContain(t('offset_readout_approx'));
                if (id === 'offset-ph') {
                    expect(lines).toContain(t('offset_readout_exact_ph'));
                    expect(captionsOf(h.graph)).toContain(t('offset_readout_exact_ph'));
                } else {
                    expect(lines, `${language} ${id} exact`).not.toContain(t('offset_readout_exact_ph'));
                    expect(captionsOf(h.graph)).not.toContain(t('offset_readout_exact_ph'));
                }
            }
        }
        expect(t('offset_readout_approx')).not.toBe(t('offset_readout_exact_ph'));
    } finally {
        h.mounted.view.unmount();
    }
});

const every = (language: Language) => [
    lesson.summary[language], ...lesson.edgeCases.map(entry => entry[language]),
    ...lesson.steps.flatMap(step => [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language])]),
].join(' ');

test('the lesson says the picture shows local cusps only and global self-intersections are not solved, in both languages', () => {
    const global = lesson.edgeCases[0], local = stepOf('offset-explore').expectedObservations[0];
    expect(global.sl).toMatch(/ni rešen/);
    expect(global.sl).toMatch(/le lokalne osti/);
    expect(global.en).toMatch(/not solved/);
    expect(global.en).toMatch(/local cusps only/);
    expect(local.sl).toMatch(/osti so lokalne/);
    expect(local.en).toMatch(/cusps are local/);
});

test('the right-normal sign convention is stated in prose in both languages', () => {
    const block = lesson.formulaBlocks.find(item => item.id === 'offset-point')!;
    expect(block.latex).toContain('(y^{\\prime},\\,-x^{\\prime})');
    expect(block.notation.sl).toMatch(/desna enotska normala/);
    expect(block.notation.en).toMatch(/unit right normal/);
    expect(block.explanation.sl).toMatch(/vzdolž desne normale/);
    expect(block.explanation.sl).toContain('\\(d<0\\) je vzporednica na levi strani krivulje');
    expect(block.explanation.en).toMatch(/along the right normal/);
    expect(block.explanation.en).toContain('\\(d<0\\) the offset is on the left of the curve');
    // The sign is the one the scenes draw: d = -1/2 puts the offset of y = x^2 above it (the left of the curve traversed to the right).
    const [x, y] = parabolaOffset(0.25, -0.5);
    expect(y).toBeGreaterThan(0.25 * 0.25);
    expect(x).toBeLessThan(0.25);
});

test('every step, formula, example and edge case has Slovenian and English text', () => {
    const texts = [
        lesson.title, lesson.summary, ...lesson.prerequisites, ...lesson.learningGoals, ...lesson.edgeCases,
        ...lesson.formulaBlocks.flatMap(block => [block.notation, block.explanation]),
        ...lesson.workedExamples.flatMap(example => [example.title, example.check]),
        ...lesson.steps.flatMap(step => [step.title, step.purpose, step.explanation, step.observationPrompt, step.scene!.expectedState, ...step.expectedObservations]),
    ];
    expect(texts.length).toBeGreaterThan(40);
    for (const entry of texts) {
        expect(entry.sl.trim().length).toBeGreaterThan(0);
        expect(entry.en.trim().length).toBeGreaterThan(0);
        expect(entry.sl).not.toBe(entry.en);
    }
});

/** A number as the prose of a language writes it: `{,}` in Slovenian math, a point in English. */
const written = (value: number, digits: number, language: Language) => (language === 'sl' ? value.toFixed(digits).replace('.', '{,}') : value.toFixed(digits));

test('every number the steps quote matches the scene and the closed form, in both languages', () => {
    const h = mount();
    try {
        const cuspPoint = parabolaOffset(CUSP_X, -1);
        expect(CUSP_X.toFixed(5)).toBe('0.38321');
        expect(Math.abs(cuspPoint[0]).toFixed(4)).toBe('0.2251');
        expect(cuspPoint[1].toFixed(4)).toBe('0.9406');
        const quotes: ReadonlyArray<readonly [string, readonly string[]]> = [
            ['offset-predict', ['\\tfrac12']],
            ['offset-small', ['\\tfrac14']],
            ['offset-first-cusp', ['\\tfrac12', '\\kappa=2', '(0,\\tfrac12)']],
            ['offset-ph', ['\\tfrac12']],
            ['offset-cusps-plot', ['d=-1', '@X', '@Y']],
            ['offset-explore', ['\\tfrac14', '\\(128\\)']],
        ];
        for (const [id, needles] of quotes) {
            const step = stepOf(id);
            h.scene(step);
            h.graph.board.update();
            const row = CONTRACT.find(item => item[0] === id)!;
            for (const language of ['sl', 'en'] as const) {
                const text = step.explanation[language];
                for (const needle of needles) {
                    const form = needle === '@X' ? written(CUSP_X, 5, language) : needle === '@Y' ? written(cuspPoint[1], 4, language) : needle;
                    expect(text, `${language} ${id} quotes ${needle}`).toContain(form);
                }
                if (id === 'offset-cusps-plot') expect(step.scene!.expectedState[language], `${language} scene state quotes the cusp x`).toContain(written(CUSP_X, 5, language));
                if (id === 'offset-cusps-plot') expect(text, `${language} quotes the cusp x`).toContain(written(Math.abs(cuspPoint[0]), 4, language));
            }
            // The quoted d is the scene's.
            const d = row[1];
            const fraction = Math.abs(d) === 0.5 ? '\\tfrac12' : Math.abs(d) === 0.25 ? '\\tfrac14' : undefined;
            if (fraction) expect(step.scene!.expectedState.en).toContain(`d=-${fraction}`);
            else expect(step.scene!.expectedState.en).toContain(`d=${d}`);
            expect(h.graph.state.offsetD).toBe(d);
            if (id === 'offset-explore') expect(h.graph.state.offsetSamples).toBe(128);
        }
        // Cusp abscissae of d = -1 and the vertex curvature quoted in the steps, from the board's own data.
        h.scene(stepOf('offset-cusps-plot'));
        expect(h.graph.offset()!.geometry().cusps.map(cusp => Math.abs(baseX(cusp.t)).toFixed(5))).toEqual(['0.38321', '0.38321']);
        expect(kappaOf(0)).toBe(2);
        h.scene(stepOf('offset-first-cusp'));
        expect(-1 / h.graph.state.offsetD).toBe(kappaOf(0));
        // The worked example repeats the same numbers.
        const example = lesson.workedExamples[0];
        expect(example.calculationLatex).toContain('0.38321');
        expect(example.resultLatex).toContain('0.2251');
        expect(example.resultLatex).toContain('0.9406');
        expect(example.check.sl).toContain('0{,}38321');
        expect(example.check.en).toContain('0.38321');
        expect(example.check.sl).toContain('0{,}2251');
        expect(example.check.en).toContain('0.9406');
        expect(every('en')).toContain('0.2251');
        expect(every('sl')).toContain('0{,}9406');
    } finally {
        h.mounted.view.unmount();
    }
});

test('closing a real curve-offset session returns the state, the board and the one offset overlay to the opening state', () => {
    const h = mount();
    try {
        const objects = () => (h.graph.board.objectsList as ReadonlyArray<Drawn & {labels?: readonly unknown[]}>);
        const withoutTickLabels = () => {
            const labels = new Set(objects().filter(object => object.elType === 'ticks').flatMap(ticks => ticks.labels ?? []));
            return objects().filter(object => !labels.has(object)).length;
        };
        const state = {...h.graph.state};
        const count = withoutTickLabels();
        const box = h.graph.board.getBoundingBox();
        const original = h.graph.getFirstCurve().getPoints().map(point => [point.X(), point.Y()]);
        const before = [...h.graph.offset()!.ownedElements()];

        const lessonOf = getLessonForDemonstration(ID)!;
        const session = new LessonSession(lessonOf, h.capabilities);
        act(() => session.start());
        const target = lessonOf.steps.findIndex(step => step.id === 'offset-ph');
        for (let guard = 0; session.snapshot().stepIndex < target && guard < 40; guard++) act(() => session.next());
        // The lesson really moved on: the PH curve replaced the opening parabola.
        expect(session.snapshot().stepIndex).toBe(target);
        expect(h.graph.curveKind()).toBe('ph');
        const during = [...(h.graph.offset()?.ownedElements() ?? [])];

        act(() => session.close());
        h.graph.board.update();
        expect(h.graph.state).toMatchObject(state);
        expect(h.graph.curveKind()).toBe('bezier');
        expect(h.graph.getFirstCurve().getPoints().map(point => [point.X(), point.Y()])).toEqual(original);
        h.graph.board.getBoundingBox().forEach((edge, index) => expect(edge).toBeCloseTo(box[index], 9));
        expect(withoutTickLabels()).toBe(count);
        const after = [...h.graph.offset()!.ownedElements()];
        expect(after).toHaveLength(before.length);
        after.forEach(element => expect(objects().includes(element as Drawn)).toBe(true));
        [...before, ...during].filter(element => !after.includes(element)).forEach(element => expect(objects().includes(element as Drawn)).toBe(false));
    } finally {
        h.mounted.view.unmount();
    }
});
