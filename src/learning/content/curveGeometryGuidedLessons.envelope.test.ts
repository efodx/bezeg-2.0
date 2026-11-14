import {act} from '@testing-library/react';
import {getLessonForDemonstration, sceneActions} from '../runtime/lessonCatalog';
import {LessonSession} from '../runtime/LessonSession';
import {curveGeometryGuidedLessons, ENVELOPE_COLLINEAR, ENVELOPE_CORNER, ENVELOPE_MOVED, ENVELOPE_VIEW} from './curveGeometryGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {setLanguage, t} from '../../localization';
import {fitBoundingBox} from '../../graphs/base/fitBoundingBox';
import {FAMILY_BANDS} from '../../graphs/curves/envelope/EnvelopeOverlay';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(() => setLanguage('sl'));

// ---- L6: the envelope of de Casteljau lines -------------------------------------------------------------------------------

const ID = 'curve-envelope';
type Language = 'sl' | 'en';
type Drawn = {
    elType: string; dataX?: number[]; dataY?: number[]; X?: () => number; Y?: () => number; plaintext?: string;
    evalVisProp: (name: string) => unknown; labels?: readonly unknown[];
};
type EnvelopeGraphView = {
    state: { envelopeT: number; envelopeLineCount: number; envelopeLinesShown: boolean; envelopeCurveShown: boolean; envelopeTouchShown: boolean };
    board: { objectsList: Drawn[]; update(): void; getBoundingBox(): number[] };
    controlRows(): number[][] | undefined;
    getFirstJxgCurve(): { getJxgCurve(): Drawn };
    setState(patch: Record<string, unknown>): void;
    envelope(): {
        ownedElements(): readonly unknown[]; collinear(): boolean; readoutLines(): string[]; readoutText(): string;
        current(): { q0: [number, number]; q1: [number, number]; touch: [number, number] } | undefined;
    } | undefined;
};

const lesson = curveGeometryGuidedLessons.find(item => item.demonstrationId === ID)!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;

function mount() {
    const graph = createGraph(ID);
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as EnvelopeGraphView & typeof graph, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneActions(step.scene!)) capabilities.apply(action);
        }),
        apply: (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); }),
    };
}

const owned = (graph: EnvelopeGraphView) => [...graph.envelope()!.ownedElements()] as Drawn[];
const curvesOf = (graph: EnvelopeGraphView) => owned(graph).filter(element => element.elType === 'curve');
/** The family is drawn as FAMILY_BANDS curves of consecutive lines (the colour runs along them); joined here into one NaN-separated curve. */
const familyOf = (graph: EnvelopeGraphView): Drawn => {
    const bands = curvesOf(graph).slice(0, FAMILY_BANDS), dataX: number[] = [], dataY: number[] = [];
    for (const band of bands) {
        if (!band.dataX!.length) continue;
        if (dataX.length) { dataX.push(NaN); dataY.push(NaN); }
        dataX.push(...band.dataX!); dataY.push(...band.dataY!);
    }
    return {elType: 'curve', dataX, dataY, evalVisProp: name => bands[0].evalVisProp(name)};
};
const highlightOf = (graph: EnvelopeGraphView) => curvesOf(graph)[FAMILY_BANDS];
const touchOf = (graph: EnvelopeGraphView) => owned(graph).find(element => element.elType === 'point')!;
const captionsOf = (graph: EnvelopeGraphView) => owned(graph).filter(element => element.elType === 'text').map(element => element.plaintext ?? '').filter(Boolean);
/** The actual JSXGraph visibility of the Bezier curve on the board, not the state. */
const curveVisible = (graph: EnvelopeGraphView) => graph.getFirstJxgCurve().getJxgCurve().evalVisProp('visible') as boolean;
/** Board objects that are not tick labels (a pool whose size follows the view). */
const countWithoutTickLabels = (graph: EnvelopeGraphView) => {
    const objects = graph.board.objectsList;
    const labels = new Set(objects.filter(object => object.elType === 'ticks').flatMap(ticks => ticks.labels ?? []));
    return objects.filter(object => !labels.has(object)).length;
};

type Pair = [number, number];
/** The contract written down here, not read from the lesson: [step id, t, lines, lines shown, curve shown, touch shown, control points]. */
const CORNER = [[1, 0], [0, 0], [0, 1]];
const MOVED = [[1, 0], [1, 1], [0, 1]];
const COLLINEAR = [[1, 0], [0.5, 0.5], [0, 1]];
const CONTRACT: ReadonlyArray<readonly [string, number, number, boolean, boolean, boolean, number[][]]> = [
    ['envelope-predict', 0.5, 4, true, false, false, CORNER],
    ['envelope-more-lines', 0.5, 64, true, false, false, CORNER],
    ['envelope-reveal', 0.5, 200, true, true, false, CORNER],
    ['envelope-slide-t', 0.5, 21, true, true, true, CORNER],
    ['envelope-drag', 0.5, 21, true, true, true, MOVED],
    ['envelope-collinear', 0.5, 21, true, true, true, COLLINEAR],
    ['envelope-explore', 0.5, 21, true, true, true, CORNER],
];
const stepIds = CONTRACT.map(row => row[0]);
const WIDTH = 600, HEIGHT = 400;

/** Independent evaluation: the Bernstein form of the quadratic and its first de Casteljau row, not the code under test. */
const bez = (p: number[][], t: number): Pair => [0, 1].map(k => (1 - t) ** 2 * p[0][k] + 2 * t * (1 - t) * p[1][k] + t * t * p[2][k]) as Pair;
const rowOne = (p: number[][], t: number): [Pair, Pair] => [
    [0, 1].map(k => (1 - t) * p[0][k] + t * p[1][k]) as Pair, [0, 1].map(k => (1 - t) * p[1][k] + t * p[2][k]) as Pair,
];
const near = (actual: readonly number[], expected: readonly number[], tolerance: number, label: string) => {
    expect(actual, label).toHaveLength(expected.length);
    expected.forEach((value, index) => expect(Math.abs(actual[index] - value), `${label} [${index}]`).toBeLessThan(tolerance));
};
/** The segments of a NaN-separated data curve. */
function segmentsOf(curve: Drawn): Pair[][] {
    const out: Pair[][] = [[]];
    (curve.dataX ?? []).forEach((x, i) => {
        const y = curve.dataY![i];
        if (Number.isNaN(x) && Number.isNaN(y)) out.push([]); else out[out.length - 1].push([x, y]);
    });
    return out;
}
const expectedBox = () => fitBoundingBox([[ENVELOPE_VIEW[0], ENVELOPE_VIEW[1]], [ENVELOPE_VIEW[2], ENVELOPE_VIEW[3]]], WIDTH, HEIGHT)!;

function expectContract(h: ReturnType<typeof mount>, row: typeof CONTRACT[number], label: string) {
    const [id, t0, lines, linesShown, curveShown, touchShown, points] = row;
    h.graph.board.update();
    expect(h.graph.state, label).toMatchObject({envelopeT: t0, envelopeLineCount: lines, envelopeLinesShown: linesShown, envelopeCurveShown: curveShown, envelopeTouchShown: touchShown});
    expect(h.graph.controlRows(), `${label} points`).toEqual(points);
    // The objects themselves, not the state.
    expect(curveVisible(h.graph), `${label} board curve visibility`).toBe(curveShown);
    expect(familyOf(h.graph).evalVisProp('visible'), `${label} family visible`).toBe(linesShown);
    expect(highlightOf(h.graph).evalVisProp('visible'), `${label} highlight visible`).toBe(touchShown);
    expect(touchOf(h.graph).evalVisProp('visible'), `${label} touch visible`).toBe(touchShown);
    expect(segmentsOf(familyOf(h.graph)), `${label} segments`).toHaveLength(linesShown ? lines : 1);
    const box = h.graph.board.getBoundingBox();
    expectedBox().forEach((value, index) => expect(box[index], `${id} box ${index}`).toBeCloseTo(value, 9));
}

test('the envelope lesson has seven steps with fifteen frames and the scenes of the contract in order', () => {
    expect(lesson.steps.map(step => step.id)).toEqual(stepIds);
    expect(lesson.steps.reduce((sum, step) => sum + step.frames.length, 0)).toBe(15);
    expect(lesson.steps.map(step => step.scene!.id)).toEqual([
        'envelope-few-lines', 'envelope-many-lines', 'envelope-revealed', 'envelope-touch', 'envelope-moved-middle', 'envelope-degenerate', 'envelope-explore-start']);
    expect(ENVELOPE_CORNER.points).toEqual(CORNER);
    expect(ENVELOPE_MOVED.points).toEqual(MOVED);
    expect(ENVELOPE_COLLINEAR.points).toEqual(COLLINEAR);
});

test('every envelope scene sets t, line count, switches, points, view and the curve visibility on the real board', () => {
    const h = mount();
    try {
        for (const row of CONTRACT) {
            h.scene(stepOf(row[0]));
            expectContract(h, row, row[0]);
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('walking all fifteen frames of a real session shows the contract of the frame step, forward and back', () => {
    const h = mount();
    try {
        const session = new LessonSession(getLessonForDemonstration(ID)!, h.capabilities);
        act(() => session.start());
        const seen: string[] = [];
        const check = () => {
            const {stepIndex, frameIndex} = session.snapshot();
            seen.push(`${stepIndex}.${frameIndex}`);
            expectContract(h, CONTRACT[stepIndex], `frame ${stepIndex}.${frameIndex}`);
        };
        check();
        for (let guard = 0; guard < 14; guard++) { act(() => session.next()); check(); }
        expect(new Set(seen).size).toBe(15);
        const back: string[] = [];
        for (let guard = 0; guard < 14; guard++) {
            act(() => session.back());
            const {stepIndex, frameIndex} = session.snapshot();
            back.push(`${stepIndex}.${frameIndex}`);
            expectContract(h, CONTRACT[stepIndex], `back ${stepIndex}.${frameIndex}`);
        }
        expect(new Set(back).size).toBe(14);
        act(() => session.close());
    } finally {
        h.mounted.view.unmount();
    }
});

test('the touching point equals the independent de Casteljau point at several t in every non-collinear scene', () => {
    const h = mount();
    try {
        for (const row of CONTRACT.filter(item => item[6] !== COLLINEAR)) {
            h.scene(stepOf(row[0]));
            for (const t0 of [0, 0.1, 0.25, 0.5, 0.8, 1]) {
                h.apply({kind: 'envelope-t', value: t0});
                h.graph.board.update();
                const [q0, q1] = rowOne(row[6], t0);
                const current = h.graph.envelope()!.current()!;
                near(current.touch, bez(row[6], t0), 1e-9, `${row[0]} t=${t0} touch`);
                near(current.q0, q0, 1e-9, `${row[0]} t=${t0} Q0`);
                near(current.q1, q1, 1e-9, `${row[0]} t=${t0} Q1`);
                // The drawn point and the highlighted segment on the board.
                near([touchOf(h.graph).X!(), touchOf(h.graph).Y!()], bez(row[6], t0), 1e-9, `${row[0]} t=${t0} drawn touch`);
                if (row[5]) {
                    const [a, b] = segmentsOf(highlightOf(h.graph))[0];
                    near(a, q0, 1e-9, `${row[0]} t=${t0} drawn Q0`);
                    near(b, q1, 1e-9, `${row[0]} t=${t0} drawn Q1`);
                }
            }
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('on the default curve B(t) = ((1-t)^2, t^2), sqrt(x) + sqrt(y) = 1 and the family points satisfy x/(1-t_i) + y/t_i = 1', () => {
    const h = mount();
    try {
        h.scene(stepOf('envelope-slide-t'));
        for (const t0 of [0.05, 0.3, 0.5, 0.77, 0.95]) {
            h.apply({kind: 'envelope-t', value: t0});
            h.graph.board.update();
            const touch = h.graph.envelope()!.current()!.touch;
            near(touch, [(1 - t0) ** 2, t0 * t0], 1e-9, `B(${t0})`);
            expect(Math.abs(Math.sqrt(touch[0]) + Math.sqrt(touch[1]) - 1), `sqrt sum at ${t0}`).toBeLessThan(1e-9);
        }
        for (const lines of [1, 4, 21, 64, 200]) {
            h.apply({kind: 'envelope-lines', value: lines});
            h.graph.board.update();
            const segments = segmentsOf(familyOf(h.graph));
            expect(segments).toHaveLength(lines);
            segments.forEach((segment, i) => {
                const ti = (i + 1) / (lines + 1);
                expect(segment, `line ${i}`).toHaveLength(2);
                for (const [x, y] of segment) expect(Math.abs(x / (1 - ti) + y / ti - 1), `N=${lines} line ${i}`).toBeLessThan(1e-9);
                near(segment[0], [1 - ti, 0], 1e-9, `N=${lines} Q0 ${i}`);
                near(segment[1], [0, ti], 1e-9, `N=${lines} Q1 ${i}`);
            });
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('the 200-line step holds 200 segments with 199 NaN separators, and the count never exceeds 200', () => {
    const h = mount();
    try {
        h.scene(stepOf('envelope-reveal'));
        h.graph.board.update();
        const family = familyOf(h.graph);
        expect(family.dataX).toHaveLength(3 * 200 - 1);
        expect(family.dataY).toHaveLength(3 * 200 - 1);
        expect(family.dataX!.filter(Number.isNaN)).toHaveLength(199);
        expect(segmentsOf(family)).toHaveLength(200);
        // Beyond the maximum: the action refuses, and a restored state with a larger count is clamped when drawn.
        expect(() => h.apply({kind: 'envelope-lines', value: 201})).toThrow();
        expect(h.graph.state.envelopeLineCount).toBe(200);
        act(() => h.graph.setState({envelopeLineCount: 5000}));
        h.graph.board.update();
        expect(segmentsOf(familyOf(h.graph)).length).toBeLessThanOrEqual(200);
        for (const row of CONTRACT) {
            h.scene(stepOf(row[0]));
            h.graph.board.update();
            expect(segmentsOf(familyOf(h.graph)).length, row[0]).toBeLessThanOrEqual(200);
            expect(h.graph.state.envelopeLineCount, row[0]).toBeLessThanOrEqual(200);
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('the collinear scene is collinear, says so in both languages on the board, and draws every line on x + y = 1', () => {
    const h = mount();
    try {
        h.scene(stepOf('envelope-collinear'));
        h.graph.board.update();
        expect(h.graph.envelope()!.collinear()).toBe(true);
        const notes: string[] = [];
        for (const language of ['sl', 'en'] as Language[]) {
            act(() => setLanguage(language));
            h.graph.board.update();
            const note = t('envelope_readout_collinear');
            notes.push(note);
            expect(note).not.toBe('envelope_readout_collinear');
            expect(h.graph.envelope()!.readoutLines(), language).toContain(note);
            expect(h.graph.envelope()!.readoutText(), language).toContain(note);
            expect(captionsOf(h.graph), `${language} board caption`).toContain(note);
        }
        expect(notes[0]).not.toBe(notes[1]);
        act(() => setLanguage('sl'));
        h.graph.board.update();
        const segments = segmentsOf(familyOf(h.graph));
        expect(segments).toHaveLength(21);
        segments.forEach((segment, i) => {
            expect(segment, `segment ${i}`).toHaveLength(2);
            for (const [x, y] of segment) {
                expect(Number.isFinite(x) && Number.isFinite(y), `finite ${i}`).toBe(true);
                expect(Math.abs(x + y - 1), `x+y ${i}`).toBeLessThan(1e-12);
            }
        });
        // The non-collinear scenes carry no note.
        for (const id of ['envelope-drag', 'envelope-explore']) {
            h.scene(stepOf(id));
            h.graph.board.update();
            expect(h.graph.envelope()!.collinear(), id).toBe(false);
            expect(h.graph.envelope()!.readoutLines(), id).not.toContain(t('envelope_readout_collinear'));
        }
    } finally {
        h.mounted.view.unmount();
    }
});

const NUM: Record<Language, (value: string) => string> = {sl: value => value.replace('.', '{,}'), en: value => value};
const PAIR: Record<Language, (a: string, b: string) => string> = {
    sl: (a, b) => `(${NUM.sl(a)};\\ ${NUM.sl(b)})`, en: (a, b) => `(${a},\\ ${b})`,
};

test('every value the envelope prose quotes matches the scene or an independent computation, in both languages', () => {
    // t = 1/2 on the default curve.
    const [q0, q1] = rowOne(CORNER, 0.5);
    near(q0, [0.5, 0], 1e-12, 'Q0');
    near(q1, [0, 0.5], 1e-12, 'Q1');
    near(bez(CORNER, 0.5), [0.25, 0.25], 1e-12, 'B');
    // The line through Q0 and Q1 is 2x + 2y = 1: both points and B satisfy it.
    for (const [x, y] of [q0, q1, bez(CORNER, 0.5)]) expect(Math.abs(2 * x + 2 * y - 1)).toBeLessThan(1e-12);
    // B'(1/2) = 2 (Q1 - Q0) = (-1, 1), and by the Bernstein derivative.
    const derivative = (t0: number) => [0, 1].map(k => 2 * ((1 - t0) * (CORNER[1][k] - CORNER[0][k]) + t0 * (CORNER[2][k] - CORNER[1][k])));
    near(derivative(0.5), [-1, 1], 1e-12, "B'(1/2)");
    near([2 * (q1[0] - q0[0]), 2 * (q1[1] - q0[1])], [-1, 1], 1e-12, '2(Q1-Q0)');
    // The moved scene.
    const [m0, m1] = rowOne(MOVED, 0.5);
    near(m0, [1, 0.5], 1e-12, 'moved Q0');
    near(m1, [0.5, 1], 1e-12, 'moved Q1');
    near(bez(MOVED, 0.5), [0.75, 0.75], 1e-12, 'moved B');

    const h = mount();
    try {
        const slide = stepOf('envelope-slide-t'), drag = stepOf('envelope-drag'), collinear = stepOf('envelope-collinear');
        const example = lesson.workedExamples.find(item => item.id === 'envelope-example')!;
        for (const language of ['sl', 'en'] as Language[]) {
            const explanation = (step: GuidedLessonStep) => step.explanation[language];
            const sceneText = (step: GuidedLessonStep) => step.scene!.expectedState[language];
            // Step 4 (default curve, t = 1/2).
            for (const fragment of ['B(\\tfrac12)=(\\tfrac14,\\tfrac14)', 'Q_0=(\\tfrac12,0)', 'Q_1=(0,\\tfrac12)', '2x+2y=1', '\\sqrt x+\\sqrt y=1', '\\sqrt{\\tfrac14}+\\sqrt{\\tfrac14}=1']) {
                expect(explanation(slide), `${language} slide ${fragment}`).toContain(fragment);
            }
            expect(sceneText(slide), `${language} slide scene`).toContain(PAIR[language]('0.25', '0.25'));
            expect(sceneText(slide), `${language} slide scene t`).toContain(`t=${NUM[language]('0.5')}`);
            expect(sceneText(slide), `${language} slide scene lines`).toContain('\\(21\\)');
            expect(example.check[language], `${language} example`).toContain('B^{\\prime}\\bigl(\\tfrac12\\bigr)=(-1,1)');
            expect(example.check[language]).toContain('2x+2y=1');
            expect(example.calculationLatex).toContain('Q_0=\\bigl(\\tfrac12,0\\bigr)');
            expect(example.calculationLatex).toContain('Q_1=\\bigl(0,\\tfrac12\\bigr)');
            expect(example.calculationLatex).toContain('B\\bigl(\\tfrac12\\bigr)=\\bigl(\\tfrac14,\\tfrac14\\bigr)');
            // Step 5 (the moved scene).
            for (const fragment of ['(1,1)', 'Q_0=(1,\\tfrac12)', 'Q_1=(\\tfrac12,1)', 'B(\\tfrac12)=(\\tfrac34,\\tfrac34)']) {
                expect(explanation(drag), `${language} drag ${fragment}`).toContain(fragment);
            }
            expect(sceneText(drag), `${language} drag scene`).toContain(PAIR[language]('0.75', '0.75'));
            // Step 6 (collinear).
            for (const fragment of ['(\\tfrac12,\\tfrac12)', 'x+y=1']) expect(explanation(collinear), `${language} collinear ${fragment}`).toContain(fragment);
            // The number of lines each scene quotes is the scene's own, as the readout shows it.
            act(() => setLanguage(language));
            for (const row of CONTRACT) {
                h.scene(stepOf(row[0]));
                h.graph.board.update();
                if (['envelope-predict', 'envelope-more-lines', 'envelope-reveal', 'envelope-slide-t', 'envelope-drag'].includes(row[0])) {
                    expect(stepOf(row[0]).scene!.expectedState[language], `${language} ${row[0]} lines`).toContain(`\\(${row[2]}\\)`);
                }
                const readout = h.graph.envelope()!.readoutLines();
                expect(readout[0], `${language} ${row[0]} readout`).toBe(t('envelope_readout_lines', {value0: String(row[2])}));
                expect(captionsOf(h.graph), `${language} ${row[0]} caption`).toContain(readout[0]);
            }
        }
        act(() => setLanguage('sl'));
        // The values the prose names are what the board shows in the quoted scenes.
        h.scene(slide);
        h.graph.board.update();
        near(h.graph.envelope()!.current()!.touch, [0.25, 0.25], 1e-12, 'board B(1/2)');
        near(h.graph.envelope()!.current()!.q0, [0.5, 0], 1e-12, 'board Q0');
        near(h.graph.envelope()!.current()!.q1, [0, 0.5], 1e-12, 'board Q1');
        h.scene(drag);
        h.graph.board.update();
        near(h.graph.envelope()!.current()!.touch, [0.75, 0.75], 1e-12, 'board moved B');
        near(h.graph.envelope()!.current()!.q0, [1, 0.5], 1e-12, 'board moved Q0');
        near(h.graph.envelope()!.current()!.q1, [0.5, 1], 1e-12, 'board moved Q1');
    } finally {
        h.mounted.view.unmount();
    }
});

test('the board curve visibility equals the state after every scene change, including hidden to hidden, hidden to shown and back', () => {
    const h = mount();
    try {
        expect(CONTRACT.filter(row => !row[4]).map(row => row[0])).toEqual(['envelope-predict', 'envelope-more-lines']);
        for (const from of stepIds) {
            for (const to of stepIds) {
                h.scene(stepOf(from));
                h.graph.board.update();
                const fromRow = CONTRACT.find(row => row[0] === from)!;
                expect(curveVisible(h.graph), `${from} alone`).toBe(fromRow[4]);
                h.scene(stepOf(to));
                h.graph.board.update();
                const toRow = CONTRACT.find(row => row[0] === to)!;
                expect(h.graph.state.envelopeCurveShown, `${from} then ${to} state`).toBe(toRow[4]);
                expect(curveVisible(h.graph), `${from} then ${to} board`).toBe(toRow[4]);
                expect(highlightOf(h.graph).evalVisProp('visible'), `${from} then ${to} highlight`).toBe(toRow[5]);
            }
        }
        // Through a real session: hidden -> hidden (step 1 to 2), hidden -> shown (2 to 3) and shown -> hidden (back).
        const session = new LessonSession(getLessonForDemonstration(ID)!, h.capabilities);
        act(() => session.start());
        const expectVisibility = (expected: boolean, label: string) => {
            h.graph.board.update();
            expect(curveVisible(h.graph), label).toBe(expected);
            expect(h.graph.state.envelopeCurveShown, `${label} state`).toBe(expected);
        };
        expectVisibility(false, 'start');
        for (let guard = 0; session.snapshot().stepIndex < 1 && guard < 6; guard++) act(() => session.next());
        expectVisibility(false, 'hidden to hidden');
        for (let guard = 0; session.snapshot().stepIndex < 2 && guard < 6; guard++) act(() => session.next());
        expectVisibility(true, 'hidden to shown');
        for (let guard = 0; session.snapshot().stepIndex > 1 && guard < 6; guard++) act(() => session.back());
        expectVisibility(false, 'shown back to hidden');
        for (let guard = 0; session.snapshot().stepIndex > 0 && guard < 6; guard++) act(() => session.back());
        expectVisibility(false, 'hidden back to hidden');
        act(() => session.close());
    } finally {
        h.mounted.view.unmount();
    }
});

test('the actions of a scene run in one tick: a later action reads the state an earlier one wrote', () => {
    const h = mount();
    try {
        const reads: unknown[] = [];
        act(() => {
            h.capabilities.apply({kind: 'envelope-t', value: 0.25});
            reads.push(h.graph.state.envelopeT);
            h.capabilities.apply({kind: 'envelope-lines', value: 7});
            reads.push(h.graph.state.envelopeLineCount, h.graph.state.envelopeT);
            h.capabilities.apply({kind: 'curve-visibility', target: 'envelope-curve', visible: false});
            reads.push(h.graph.state.envelopeCurveShown, h.graph.state.envelopeLineCount);
            h.capabilities.apply({kind: 'curve-visibility', target: 'envelope-touch', visible: false});
            reads.push(h.graph.state.envelopeTouchShown, h.graph.state.envelopeCurveShown);
            h.capabilities.apply({kind: 'curve-visibility', target: 'envelope-curve', visible: true});
            reads.push(h.graph.state.envelopeCurveShown);
            h.capabilities.apply({kind: 'curve-visibility', target: 'envelope-curve', visible: false});
            reads.push(h.graph.state.envelopeCurveShown);
        });
        expect(reads).toEqual([0.25, 7, 0.25, false, 7, false, false, true, false]);
        h.graph.board.update();
        expect(curveVisible(h.graph)).toBe(false);
        expect(segmentsOf(familyOf(h.graph))).toHaveLength(7);
        near(h.graph.envelope()!.current()!.touch, bez(CORNER, 0.25), 1e-9, 'touch after the tick');
        // A whole scene, hidden after shown within one act, ends hidden on the board.
        h.scene(stepOf('envelope-reveal'));
        h.scene(stepOf('envelope-predict'));
        h.graph.board.update();
        expect(curveVisible(h.graph)).toBe(false);
        expect(h.graph.state.envelopeLineCount).toBe(4);
    } finally {
        h.mounted.view.unmount();
    }
});

test('cycling the scenes keeps the board object count constant, without tick labels', () => {
    const h = mount();
    try {
        const initial = countWithoutTickLabels(h.graph);
        expect(owned(h.graph)).toHaveLength(5 + FAMILY_BANDS); // the family bands, then highlight, point and captions
        const counts = new Set<number>();
        for (let round = 0; round < 3; round++) {
            for (const id of [...stepIds, ...[...stepIds].reverse()]) {
                h.scene(stepOf(id));
                h.graph.board.update();
                counts.add(countWithoutTickLabels(h.graph));
                expect(owned(h.graph), `${id} owned`).toHaveLength(5 + FAMILY_BANDS);
            }
        }
        expect([...counts]).toEqual([initial]);
        const live = new Set(h.graph.board.objectsList);
        owned(h.graph).forEach(element => expect(live.has(element)).toBe(true));
    } finally {
        h.mounted.view.unmount();
    }
});

test('closing a real curve-envelope session on the collinear step returns the state, the points, the view and the overlay to the opening state', () => {
    const h = mount();
    try {
        const objects = () => h.graph.board.objectsList;
        const state = {...h.graph.state};
        const count = countWithoutTickLabels(h.graph);
        const box = h.graph.board.getBoundingBox();
        const original = h.graph.controlRows()!.map(row => [...row]);
        const wasVisible = curveVisible(h.graph);
        const before = owned(h.graph);

        const lessonOf = getLessonForDemonstration(ID)!;
        const session = new LessonSession(lessonOf, h.capabilities);
        act(() => session.start());
        const target = lessonOf.steps.findIndex(step => step.id === 'envelope-collinear');
        for (let guard = 0; session.snapshot().stepIndex < target && guard < 40; guard++) act(() => session.next());
        expect(session.snapshot().stepIndex).toBe(target);
        h.graph.board.update();
        expect(h.graph.controlRows()).toEqual(COLLINEAR);
        expect(h.graph.envelope()!.collinear()).toBe(true);
        const during = owned(h.graph);

        act(() => session.close());
        h.graph.board.update();
        expect(h.graph.state).toMatchObject(state);
        expect(h.graph.controlRows()).toEqual(original);
        expect(curveVisible(h.graph)).toBe(wasVisible);
        h.graph.board.getBoundingBox().forEach((edge, index) => expect(edge).toBeCloseTo(box[index], 9));
        expect(countWithoutTickLabels(h.graph)).toBe(count);
        expect(h.graph.envelope()!.collinear()).toBe(false);
        const after = owned(h.graph);
        expect(after).toHaveLength(before.length);
        after.forEach(element => expect(objects().includes(element)).toBe(true));
        [...before, ...during].filter(element => !after.includes(element)).forEach(element => expect(objects().includes(element)).toBe(false));
    } finally {
        h.mounted.view.unmount();
    }
});

test('the view keeps every control point and the curve in the lower half of the board in every scene', () => {
    const h = mount();
    try {
        for (const row of CONTRACT) {
            h.scene(stepOf(row[0]));
            h.graph.board.update();
            const [left, top, right, bottom] = h.graph.board.getBoundingBox();
            const middle = (top + bottom) / 2;
            const curvePoints = [0, 0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 1].map(t0 => bez(row[6], t0));
            for (const [x, y] of [...(row[6] as Pair[]), ...curvePoints]) {
                expect(y, `${row[0]} y=${y}`).toBeLessThan(middle);
                expect(y, `${row[0]} y=${y} above the bottom`).toBeGreaterThan(bottom);
                expect(x, `${row[0]} x=${x}`).toBeGreaterThan(left);
                expect(x, `${row[0]} x=${x}`).toBeLessThan(right);
            }
            // The curve the board draws lies in the lower half too.
            const jxg = h.graph.getFirstJxgCurve().getJxgCurve();
            for (const y of jxg.dataY ?? []) if (Number.isFinite(y)) expect(y, `${row[0]} drawn curve`).toBeLessThan(middle);
        }
    } finally {
        h.mounted.view.unmount();
    }
});
