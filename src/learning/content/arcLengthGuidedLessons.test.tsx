import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {arcLengthGuidedLessons} from './arcLengthGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type ArcLengthParametrizationGraph from '../../graphs/curves/arclength/ArcLengthParametrizationGraph';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(() => setLanguage('sl'));

type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];
const lesson = arcLengthGuidedLessons.find(entry => entry.demonstrationId === 'arc-length-param')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: Language) =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A value written in the Slovenian decimal comma as the prose writes it: `{,}` in Slovenian math, a point in English. */
const inProse = (value: string, language: Language) => (language === 'sl' ? value.replace(',', '{,}') : value.replace(',', '.'));

// ---- An independent evaluation (no kernel code): Bernstein cubic, composite Simpson, bisection -----------------------------

type Rows = readonly (readonly number[])[];
const Q: Rows = [[0, 0], [1, 3], [3, 3], [4, 0]];
const point = (rows: Rows, t: number) => [0, 1].map(axis => rows.reduce((sum, p, k) => sum +
    [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3][k] * p[axis], 0));
const speed = (rows: Rows, t: number) => {
    const w = [(1 - t) ** 2, 2 * (1 - t) * t, t * t];
    const d = [0, 1].map(axis => 3 * [0, 1, 2].reduce((sum, k) => sum + w[k] * (rows[k + 1][axis] - rows[k][axis]), 0));
    return Math.hypot(d[0], d[1]);
};
const arcTo = (rows: Rows, t: number, steps = 2000) => {
    const h = t / steps;
    let sum = speed(rows, 0) + speed(rows, t);
    for (let i = 1; i < steps; i++) sum += (i % 2 ? 4 : 2) * speed(rows, i * h);
    return sum * h / 3;
};
const lengthOf = (rows: Rows) => arcTo(rows, 1);
const parameterAtArc = (rows: Rows, target: number) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (arcTo(rows, mid, 400) < target) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
};
const chords = (rows: Rows, parameters: readonly number[]) => parameters.slice(1).map((t, i) => {
    const a = point(rows, parameters[i]), b = point(rows, t);
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
});
const ratio = (values: readonly number[]) => Math.max(...values) / Math.min(...values);
const equalT = (n: number) => Array.from({length: n + 1}, (_, i) => i / n);
const equalArc = (rows: Rows, n: number) => Array.from({length: n + 1}, (_, i) => i === 0 ? 0 : i === n ? 1 : parameterAtArc(rows, i * lengthOf(rows) / n));
const polylineError = (rows: Rows, n: number) => Math.abs(lengthOf(rows) - chords(rows, equalT(n)).reduce((a, b) => a + b, 0));
const fixed = (value: number, digits: number) => value.toFixed(digits);

/** The PH cubic from its hodograph points: the speed is |h(t)|^2 with Bernstein coefficients |h0|^2, h0.h1, |h1|^2. */
const H0 = [-3.5, -1.7], H1 = [-2.6, 1.7];
const PH_COEFFICIENTS = [H0[0] ** 2 + H0[1] ** 2, H0[0] * H1[0] + H0[1] * H1[1], H1[0] ** 2 + H1[1] ** 2];
const phLengthTo = (t: number) => PH_COEFFICIENTS[0] * (1 - (1 - t) ** 3) / 3 + 2 * PH_COEFFICIENTS[1] * (t * t / 2 - t ** 3 / 3) + PH_COEFFICIENTS[2] * t ** 3 / 3;

// ---- The real graph ---------------------------------------------------------------------------------------------------------

type ArcGraphView = ArcLengthParametrizationGraph;
type Drawn = {elType: string; labels?: readonly unknown[]};

function mount() {
    const graph = createGraph('arc-length-param');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const arc = graph as unknown as ArcGraphView;
    return {
        graph: arc, mounted, capabilities, checkpoint,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        /** The actions of a step only, in one synchronous tick, without restoring first. */
        run: (step: GuidedLessonStep) => act(() => { for (const action of actionsOf(step)) capabilities.apply(action); }),
        apply: (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); }),
        readout: () => arc.arcOverlay()!.readoutLines().join(' '),
        rows: () => arc.controlRows()!,
    };
}

/** [step, [the readout text (Slovenian spelling), the value the prose quotes]]: checked in the live readout and in the prose. */
const QUOTES: ReadonlyArray<readonly [string, ReadonlyArray<readonly [string, string]>]> = [
    ['arc-constant-t', [['s(t) = 1,9289', '1,9289'], ['L = 6,390976', '6,390976'], ['(N = 8): 1,857', '1,857']]],
    ['arc-speed-graph', [['t = 0,5, s(t)', '0,5']]],
    ['arc-table', [['t = 1, s(t) = 6,391', '6,391'], ['L = 6,390976', '6,390976'], ['8,324555', '8,324555']]],
    ['arc-equal-arcs', [['t = 0,1983, s(t) = 1,5977', '1,5977'], ['(N = 8): 1,857', '1,857'], ['(N = 8): 1,015', '1,015']]],
    ['arc-ph-exact', [['L = 10,333333', '10,333333'], ['s(1) = 10,333333', '10,333333'], ['t = 0,3, s(t) = 3,8496', '3,8496'], ['(N = 8): 1,619', '1,619'], ['(N = 8): 1,004', '1,004']]],
    ['arc-polyline-error', [['N = 8: 0,025086', '0,025086']]],
];

test('the lesson has seven steps with predictions, a worked example shown by a calculation frame and a free last step', () => {
    expect(lesson.steps).toHaveLength(7);
    expect(lesson.steps.map(step => step.id)).toEqual(['arc-constant-t', 'arc-speed-graph', 'arc-table', 'arc-equal-arcs', 'arc-ph-exact', 'arc-polyline-error', 'arc-explore']);
    expect(lesson.steps[6].id).toBe('arc-explore');
    for (const step of lesson.steps.slice(0, 6)) {
        expect(step.explanation.sl, step.id).toMatch(/[Nn]apovej/);
        expect(step.explanation.en, step.id).toMatch(/[Pp]redict/);
    }
    expect(stepOf('arc-ph-exact').frames!.map(frame => frame.kind)).toContain('calculation');
    expect(lesson.workedExamples.map(example => example.id)).toEqual(['arc-ph-exact-example']);
    expect(JSON.stringify(lesson)).toContain('Naravna parametrizacija');
    for (const step of lesson.steps) expect(JSON.stringify(step.scene!.expectedState).length).toBeGreaterThan(40);
});

test('no scene starts playback, every scene pauses last, and every scene is independent of the others', () => {
    for (const step of lesson.steps) {
        const kinds = actionsOf(step).map(action => action.kind);
        expect(kinds, step.id).not.toContain('arc-play');
        expect(kinds[kinds.length - 1], step.id).toBe('arc-pause');
        expect(kinds.indexOf('arc-curve'), step.id).toBe(1);
    }
});

describe('each scene shows on the real graph exactly what its text quotes', () => {
    test.each(QUOTES)('%s', (stepId, values) => {
        const h = mount();
        try {
            const step = stepOf(stepId);
            h.scene(step);
            for (const language of LANGUAGES) {
                setLanguage(language);
                const readout = h.readout();
                for (const [snippet, quoted] of values) {
                    // The value appears in the live readout and, spelled for math, in the prose of the step.
                    expect(readout, `${stepId} readout ${snippet}`).toContain(language === 'sl' ? snippet : snippet.replace(/(\d),(\d)/g, '$1.$2'));
                    expect(prose(step, language), `${stepId} prose ${quoted}`).toContain(inProse(quoted, language));
                }
            }
            expect(h.graph.isPlaying()).toBe(false);
        } finally {
            h.mounted.view.unmount();
        }
    });
});

test('each scene sets the curve, N, switches, mover and view the text describes', () => {
    const h = mount();
    try {
        // [step, curve, N, equal-t, equal-arc, plot, mode, position]
        const CONTRACT = [
            ['arc-constant-t', 'bezier', 8, true, false, false, 'parameter', 0.25],
            ['arc-speed-graph', 'bezier', 8, true, false, true, 'parameter', 0.5],
            ['arc-table', 'bezier', 8, true, false, true, 'parameter', 1],
            ['arc-equal-arcs', 'bezier', 8, true, true, true, 'arc', 0.25],
            ['arc-ph-exact', 'ph', 8, true, true, true, 'parameter', 0.3],
            ['arc-polyline-error', 'bezier', 8, true, false, false, 'parameter', 0],
            ['arc-explore', 'bezier', 8, true, true, true, 'parameter', 0],
        ] as const;
        for (const [id, curve, n, eqT, eqArc, plot, mode, position] of CONTRACT) {
            h.scene(stepOf(id));
            const state = h.graph.state;
            expect(h.graph.curveKind(), id).toBe(curve);
            expect(state.arcPieces, id).toBe(n);
            expect(state.arcEqualTShown, id).toBe(eqT);
            expect(state.arcEqualArcShown, id).toBe(eqArc);
            expect(state.arcSpeedPlotShown, id).toBe(plot);
            expect(state.arcMoverMode, id).toBe(mode);
            expect(state.arcMoverPosition, id).toBe(position);
            expect(h.graph.isPlaying(), id).toBe(false);
            expect(h.rows(), id).toHaveLength(4);
            if (curve === 'bezier') expect(h.rows(), id).toEqual(Q.map(p => [...p]));
        }
    } finally {
        h.mounted.view.unmount();
    }
});

describe('the quoted values equal an independent computation', () => {
    test('curve Q: length, bracket, speeds, s(0.25), chord ratios, equal-arc parameters and the polyline errors', () => {
        const length = lengthOf(Q);
        expect(Math.abs(length - 6.390976)).toBeLessThan(1e-6);
        expect(fixed(length, 6)).toBe('6.390976');
        const polygon = [0, 1, 2].reduce((sum, k) => sum + Math.hypot(Q[k + 1][0] - Q[k][0], Q[k + 1][1] - Q[k][1]), 0);
        expect(fixed(polygon, 6)).toBe('8.324555');
        expect(Math.hypot(Q[3][0] - Q[0][0], Q[3][1] - Q[0][1])).toBe(4);
        expect(fixed(speed(Q, 0), 4)).toBe('9.4868');
        expect(fixed(3 * Math.sqrt(10), 4)).toBe('9.4868');
        expect(speed(Q, 0.5)).toBeCloseTo(4.5, 12);
        expect(fixed(speed(Q, 0) / speed(Q, 0.5), 3)).toBe('2.108');
        expect(fixed(arcTo(Q, 0.25), 4)).toBe('1.9289');
        expect(fixed(100 * arcTo(Q, 0.25) / length, 1)).toBe('30.2');
        expect(fixed(ratio(chords(Q, equalT(8))), 3)).toBe('1.857');
        const arcs = equalArc(Q, 8);
        expect(arcs.slice(1, 5).map(t => fixed(t, 4))).toEqual(['0.0906', '0.1983', '0.3324', '0.5000']);
        expect(fixed(ratio(chords(Q, arcs)), 3)).toBe('1.015');
        expect(fixed(arcTo(Q, arcs[2]), 4)).toBe('1.5977');
        expect(fixed(length / 4, 4)).toBe('1.5977');
        expect([4, 8, 16, 32].map(n => fixed(polylineError(Q, n), 6))).toEqual(['0.100244', '0.025086', '0.006267', '0.001566']);
        expect(polylineError(Q, 8) / polylineError(Q, 16)).toBeGreaterThan(3.9);
        expect(polylineError(Q, 8) / polylineError(Q, 16)).toBeLessThan(4.1);
    });

    test('the PH curve: the speed coefficients, the exact s(1) = 31/3, s(0.3) and the chord ratios, against the numerical length', () => {
        expect(PH_COEFFICIENTS.map(c => fixed(c, 2))).toEqual(['15.14', '6.21', '9.65']);
        expect((PH_COEFFICIENTS[0] + PH_COEFFICIENTS[1] + PH_COEFFICIENTS[2]) / 3).toBeCloseTo(31 / 3, 12);
        expect(fixed(phLengthTo(0.3), 4)).toBe('3.8496');
        const h = mount();
        try {
            h.scene(stepOf('arc-ph-exact'));
            const rows = h.rows();
            // The control polygon of the cubic PH curve, from its start and hodograph points, equals the graph's.
            expect(rows[0]).toEqual([-4.2, -2]);
            expect(rows[1][0]).toBeCloseTo(-4.2 + (H0[0] ** 2 - H0[1] ** 2) / 3, 9);
            expect(rows[1][1]).toBeCloseTo(-2 + 2 * H0[0] * H0[1] / 3, 9);
            expect(Math.abs(lengthOf(rows) - 31 / 3)).toBeLessThan(1e-9);
            expect(Math.abs(arcTo(rows, 0.3) - phLengthTo(0.3))).toBeLessThan(1e-9);
            expect(fixed(ratio(chords(rows, equalT(8))), 3)).toBe('1.619');
            expect(fixed(ratio(chords(rows, equalArc(rows, 8))), 3)).toBe('1.004');
            // The graph's numerical and exact readouts agree to the shown digits (1e-9 is covered by the integral above).
            expect(h.readout()).toContain('10,333333 (numerično');
            expect(h.readout()).toContain('s(1) = 10,333333 (PH krivulja)');
        } finally {
            h.mounted.view.unmount();
        }
    });
});

test('step 6: setting N to 16, 32 and 4 on the real graph gives the quoted errors and the O(h^2) caveat', () => {
    const h = mount();
    try {
        h.scene(stepOf('arc-polyline-error'));
        for (const [n, error] of [[8, '0,025086'], [16, '0,006267'], [32, '0,001566'], [4, '0,100244']] as const) {
            h.apply({kind: 'arc-pieces', value: n});
            expect(h.readout(), `N = ${n}`).toContain(`N = ${n}: ${error}`);
            for (const language of LANGUAGES) expect(prose(stepOf('arc-polyline-error'), language)).toContain(inProse(error, language));
        }
        for (const language of LANGUAGES) {
            setLanguage(language);
            expect(h.readout()).toMatch(language === 'sl' ? /Ponazoritev vedenja O\(h²\) na tem primeru, ne dokaz/ : /An illustration of O\(h²\) behaviour on this example, not a proof/);
            expect(prose(stepOf('arc-polyline-error'), language)).toMatch(language === 'sl' ? /ponazoritev tega vedenja, ne dokaz/ : /illustrate this behaviour; they are not a proof/);
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('the prose proves that constant speed 1 forces a line, says PH makes the length and not the inverse polynomial, and labels exact only for PH', () => {
    for (const language of LANGUAGES) {
        const step = prose(stepOf('arc-ph-exact'), language);
        expect(step).toMatch(language === 'sl' ? /daljica/ : /straight segment/);
        expect(step).toMatch(/x'\(t\)\^2\+y'\(t\)\^2=1/);
        expect(step).toMatch(language === 'sl' ? /PH naredi polinom dolžino/ : /PH makes the length/);
        expect(step).toMatch(language === 'sl' ? /ne pa njenega inverza/ : /not its inverse/);
        // The numerical length of the non-PH curve states its quadrature setting and is not called exact.
        expect(prose(stepOf('arc-table'), language)).toMatch(language === 'sl' ? /\\\(24\\\) točkami na \\\(32\\\) delih/ : /\\\(24\\\) points on \\\(32\\\) panels/);
        expect(prose(stepOf('arc-table'), language)).toMatch(language === 'sl' ? /ne imenujemo točna/ : /not called exact/);
        expect(prose(stepOf('arc-ph-exact'), language)).toMatch(language === 'sl' ? /točna vrednost/ : /exact value/);
    }
});

test('a scene on an empty or wrong graph fails instead of passing silently', () => {
    const h = mount();
    try {
        expect(() => h.apply({kind: 'arc-pieces', value: 1})).toThrow();
        expect(() => h.apply({kind: 'arc-mover-position', value: 2})).toThrow();
        expect(() => h.apply({kind: 'arc-curve', curve: 'cubic' as unknown as 'ph'})).toThrow();
        // The readout names the curve it belongs to: a quote on the wrong curve does not match.
        h.scene(stepOf('arc-constant-t'));
        expect(h.readout()).not.toContain('10,333333');
        h.scene(stepOf('arc-ph-exact'));
        expect(h.readout()).not.toContain('6,390976');
    } finally {
        h.mounted.view.unmount();
    }
});

test('jumping to a step and going backwards give the same state as running the scene fresh', () => {
    const h = mount();
    try {
        const snapshot = () => ({
            state: {...h.graph.state}, kind: h.graph.curveKind(), rows: h.rows().map(row => [...row]), readout: h.readout(),
        });
        const fresh = new Map<string, ReturnType<typeof snapshot>>();
        for (const step of lesson.steps) { h.scene(step); fresh.set(step.id, snapshot()); }
        // Forward without restoring, then backwards, then a jump to the end and back to the start.
        const order = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0, 6, 0, 4];
        for (const index of order) {
            const step = lesson.steps[index];
            h.run(step);
            expect(snapshot(), `${step.id} after navigation`).toEqual(fresh.get(step.id));
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('the scenes keep the curve below the lesson panel: the PH view is the graph\'s own and shows the whole curve', () => {
    const h = mount();
    try {
        for (const id of ['arc-constant-t', 'arc-ph-exact']) {
            h.scene(stepOf(id));
            const [left, top, right, bottom] = (h.graph as unknown as {board: {getBoundingBox(): number[]}}).board.getBoundingBox();
            for (const [x, y] of h.rows()) {
                expect(x, id).toBeGreaterThan(left);
                expect(x, id).toBeLessThan(right);
                expect(y, id).toBeLessThan(top);
                expect(y, id).toBeGreaterThan(bottom);
                // The curve's control points stay in the lower 60 % of the board, below the lesson panel.
                expect((top - y) / (top - bottom), id).toBeGreaterThan(0.35);
            }
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('closing a lesson (restoring the opening checkpoint) returns the state, control points, view and the one overlay', () => {
    const h = mount();
    try {
        const board = (h.graph as unknown as {board: {objectsList: Drawn[]; update(): void; getBoundingBox(): number[]}}).board;
        const objects = () => board.objectsList;
        const withoutTickLabels = () => {
            const labels = new Set(objects().filter(object => object.elType === 'ticks').flatMap(ticks => ticks.labels ?? []));
            return objects().filter(object => !labels.has(object)).length;
        };
        const state = {...h.graph.state};
        const count = withoutTickLabels();
        const box = board.getBoundingBox();
        const original = h.rows().map(row => [...row]);
        const before = [...h.graph.arcOverlay()!.ownedElements()];

        h.scene(stepOf('arc-ph-exact'));
        expect(h.graph.curveKind()).toBe('ph');
        const during = [...(h.graph.arcOverlay()?.ownedElements() ?? [])];

        h.apply({kind: 'arc-pause'});
        act(() => h.capabilities.restoreState(h.checkpoint));
        board.update();
        expect(h.graph.state).toMatchObject(state);
        expect(h.graph.curveKind()).toBe('bezier');
        expect(h.rows()).toEqual(original);
        board.getBoundingBox().forEach((edge, index) => expect(edge).toBeCloseTo(box[index], 9));
        expect(withoutTickLabels()).toBe(count);
        const after = [...h.graph.arcOverlay()!.ownedElements()];
        expect(after).toHaveLength(before.length);
        after.forEach(element => expect(objects().includes(element as Drawn)).toBe(true));
        [...before, ...during].filter(element => !after.includes(element)).forEach(element => expect(objects().includes(element as Drawn)).toBe(false));
        expect(h.graph.isPlaying()).toBe(false);
    } finally {
        h.mounted.view.unmount();
    }
});

/** Every decimal number the lesson prints is one the checks above verified, so one mistyped copy of a value cannot hide behind a correct one. */
const VERIFIED_DECIMALS = new Set([
    '0,25', '1,9289', '6,390976', '30,2', '1,857', '9,4868', '4,5', '2,108', '0,5', '6,391', '8,324555', '0,0906', '0,1983', '0,3324',
    '1,015', '1,5977', '10,333333', '3,8496', '1,619', '1,004', '0,3', '0,025086', '0,006267', '0,100244', '0,001566',
    '-4,2', '-3,5', '-1,7', '-2,6', '1,7', '15,14', '6,21', '9,65', '12,25', '2,89', '9,1', '6,76', '-2,89',
]);

test('every decimal number in the lesson text is a verified value', () => {
    const texts: string[] = [];
    const collect = (value: unknown): void => {
        if (typeof value === 'string') texts.push(value);
        else if (Array.isArray(value)) value.forEach(collect);
        else if (value && typeof value === 'object') Object.values(value).forEach(collect);
    };
    collect(lesson.steps.map(step => [step.explanation, step.expectedObservations, step.scene!.expectedState]));
    collect(lesson.workedExamples.map(example => example.check));
    collect(lesson.formulaBlocks.map(block => [block.explanation, block.notation]));
    collect(lesson.summary);
    const found = new Set<string>();
    for (const textValue of texts) for (const match of textValue.matchAll(/-?\d+(?:\{,\}|\.)\d+/g)) found.add(match[0].replace('{,}', ',').replace('.', ','));
    expect([...found].filter(value => !VERIFIED_DECIMALS.has(value))).toEqual([]);
    expect(found.size).toBeGreaterThan(25);
});
