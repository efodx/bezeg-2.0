/**
 * SV5 (solids, batch C, solids of revolution): every scene opens on the state and readouts the text states (the real solids graph, scenes applied in one synchronous `act` from a
 * restored checkpoint, out of order and twice, in sl and en), the actions the prompts ask for give the readouts the text quotes, the control and readout names are the graph's own
 * strings, a predicting step does not render its answer, and every quoted number is recomputed here from the kernels in `src/solids/` and closed formulas (not from the graph's
 * scene code).
 */
import {act} from '@testing-library/react';
import {beforeAll, describe, expect, test, vi} from 'vitest';
import {sceneActions} from '../runtime/lessonCatalog';
import {solidsRevolutionLesson} from './solidsRevolutionGuidedLessons';
import type {LessonAction} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import SolidsGraph from '../../graphs/solids/SolidsGraph';
import {setLanguage, t} from '../../localization';
import {frustumSum, kgonFactor, revolve} from '../../solids/revolve';
import {meshVolume} from '../../solids/volume';
import {DISC_RANGE} from '../../solids/solidsModel';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];

// ---- formats ------------------------------------------------------------------------------------------------------------------------------

const q = (value: number, digits: number, language: Language) => { const s = String(Number(value.toFixed(digits))); return language === 'sl' ? s.replace('.', ',') : s; };
const prose = (text: string) => text.replace(/\\\(|\\\)|\\\[|\\\]/g, '').replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,/])${escapeRegExp(value)}(?![0-9]|[.,/][0-9])`).test(prose(text));
const hasQuote = (text: string, value: number, digits: number, language: Language) => hasNumber(text, q(value, digits, language));
const numberOf = (text: string | null) => Number((text ?? '').replace(/−/g, '-').replace(',', '.').match(/-?\d+(?:\.\d+)?/)?.[0]);

// ---- the model, independent of the graph's scene code: profiles, exact values, sums, meshes ----------------------------------------------------

type SolidId = 'cone' | 'sqrt' | 'parabola' | 'sphere';
interface Profile {
    readonly a: number; readonly b: number; readonly f: (x: number) => number; readonly segments: number; readonly exact: number;
    readonly aboutY?: {readonly top: number; readonly inner: (y: number) => number; readonly exact: number};
}
const PROFILES: Readonly<Record<SolidId, Profile>> = {
    cone: {a: 0, b: 4, f: x => 3 * x / 4, segments: 1, exact: 12 * Math.PI, aboutY: {top: 3, inner: y => 4 * y / 3, exact: 32 * Math.PI}},
    sqrt: {a: 0, b: 4, f: Math.sqrt, segments: 8, exact: 8 * Math.PI, aboutY: {top: 2, inner: y => y * y, exact: 128 * Math.PI / 5}},
    parabola: {a: 0, b: 1, f: x => x * x, segments: 8, exact: Math.PI / 5, aboutY: {top: 1, inner: Math.sqrt, exact: Math.PI / 2}},
    sphere: {a: -3, b: 3, f: x => Math.sqrt(Math.max(0, 9 - x * x)), segments: 12, exact: 36 * Math.PI},
};
/** Midpoint disc sum pi * sum f(x_i)^2 * dx about the x axis; about the y axis the washer sum pi * sum (b^2 - inner(y_i)^2) * dy. */
function sumOf(solid: SolidId, axis: 'x' | 'y', n: number): number {
    const p = PROFILES[solid];
    let total = 0;
    if (axis === 'x') {
        const dx = (p.b - p.a) / n;
        for (let i = 0; i < n; i += 1) total += p.f(p.a + (i + 0.5) * dx) ** 2 * dx;
    } else {
        const {top, inner} = p.aboutY!;
        const dy = top / n;
        for (let i = 0; i < n; i += 1) total += (p.b ** 2 - inner((i + 0.5) * dy) ** 2) * dy;
    }
    return Math.PI * total;
}
const exactOf = (solid: SolidId, axis: 'x' | 'y') => axis === 'x' ? PROFILES[solid].exact : PROFILES[solid].aboutY!.exact;
/** The profile polyline of the mesh about the x axis (equal chords; the end radii stay on the graph). */
const profileOf = (solid: SolidId): Array<[number, number]> => {
    const p = PROFILES[solid];
    return Array.from({length: p.segments + 1}, (_, i): [number, number] => { const x = p.a + (p.b - p.a) * i / p.segments; return [x, Math.max(0, p.f(x))]; });
};
/** About the x axis from the kernel; about the y axis only the value the text quotes (the parabola, 1,57869: the washer mesh has its own welded construction). */
const meshOf = (solid: SolidId, axis: 'x' | 'y'): number | undefined => axis === 'x' ? meshVolume(revolve(profileOf(solid), 48, 'x')) : solid === 'parabola' ? 1.57869 : undefined;

// ---- lesson text --------------------------------------------------------------------------------------------------------------------------

const lesson = solidsRevolutionLesson;
const stepOf = (id: string) => lesson.steps.find(step => step.id === id)!;
const stepIds = lesson.steps.map(step => step.id);
const allText = (id: string, language: Language) => {
    const step = stepOf(id);
    return [step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]), step.scene!.expectedState[language]].join(' ');
};
/** What a predicting step shows before the learner has answered: purpose, explanation and the formula blocks it attaches (and any worked example). */
const shownBeforeAnswer = (id: string, language: Language) => {
    const step = stepOf(id);
    const blocks = lesson.formulaBlocks.filter(block => step.formulaIds.includes(block.id));
    return [step.purpose[language], step.explanation[language], ...blocks.flatMap(b => [b.latex, b.notation[language], b.explanation[language]]), ...(lesson.workedExamples ?? []).map(w => JSON.stringify(w))].join(' ');
};

// ---- the graph ----------------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const readoutLabel = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent ?? null;

function mountSolids() {
    const graph = createGraph('solids');
    if (!(graph instanceof SolidsGraph)) throw new Error('solids must be the solids graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const scene = (stepId: string, times = 1) => act(() => {
        capabilities.restoreState(checkpoint);
        for (let i = 0; i < times; i += 1) for (const action of sceneActions(stepOf(stepId).scene!)) capabilities.apply(action);
    });
    const learner = (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); });
    const resetView = () => act(() => { graph.resetView(); });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, mounted, capabilities, scene, learner, resetView, restore, free};
}
type Mounted = ReturnType<typeof mountSolids>;
const setAxis = (axis: 'x' | 'y'): LessonAction => ({kind: 'solids', operation: 'set-axis', axis});
const setDiscs = (discs: number): LessonAction => ({kind: 'solids', operation: 'set-discs', discs});
const setSolid = (solid: string): LessonAction => ({kind: 'solids', operation: 'set-solid', solid});

/** The state a step opens on or the learner reaches: the solid, the axis, the discs and whether the camera is the front preset (az 0, el 0) or the authored view. */
interface Sol {readonly solid: SolidId; readonly axis: 'x' | 'y'; readonly discs: number; readonly front: boolean}
const sol = (solid: SolidId, axis: 'x' | 'y', discs: number, front = false): Sol => ({solid, axis, discs, front});
const round6 = (value: number) => Math.round(value * 1e6) / 1e6;
const stateOf = (m: Mounted) => ({solid: m.graph.state.solid, mode: m.graph.state.mode, axis: m.graph.state.axis, discs: m.graph.state.discs, az: round6(m.graph.state.camera.az), el: round6(m.graph.state.camera.el)});
const expectedState = (s: Sol) => ({solid: s.solid, mode: 'revolve', axis: s.axis, discs: s.discs, az: s.front ? 0 : -0.9, el: s.front ? 0 : 0.5});

function checkRows(what: string, s: Sol) {
    const near = (key: string, actual: number, expected: number) => expect({what, key, ok: Math.abs(actual - expected) <= 6e-6, actual, expected}).toEqual({what, key, ok: true, actual, expected});
    near('disc-sum', numberOf(readout('disc-sum')), sumOf(s.solid, s.axis, s.discs));
    near('volume-exact', numberOf(readout('volume-exact')), exactOf(s.solid, s.axis));
    const mesh = meshOf(s.solid, s.axis);
    if (mesh !== undefined) near('volume-mesh', numberOf(readout('volume-mesh')), mesh);
    expect({what, axisRow: readout('axis'), discLabel: readoutLabel('disc-sum')})
        .toEqual({what, axisRow: t(`solids_graph_axis_${s.axis}`), discLabel: t(s.axis === 'y' ? 'solids_graph_row_washer_sum' : 'solids_graph_row_disc_sum', {value0: s.discs})});
}

/** The opening of every step: what the scene sets. */
const OPENING: Record<string, Sol> = {
    'sv5-solid': sol('cone', 'x', 10, true),
    'sv5-discs': sol('parabola', 'x', 1),
    'sv5-integral': sol('parabola', 'x', 4),
    'sv5-sphere': sol('sphere', 'x', 6),
    'sv5-axis': sol('parabola', 'x', 10),
    'sv5-free': sol('sqrt', 'x', 10),
};

/** What each prompt asks the learner to produce: the actions (or the Reset view button) and the state they reach (every one differs from the opening). */
interface Produce {readonly label: string; readonly actions: readonly LessonAction[]; readonly reset?: true; readonly target: Sol}
const PRODUCE: Record<string, readonly Produce[]> = {
    'sv5-solid': [{label: 'Reset view', actions: [], reset: true, target: sol('cone', 'x', 10)}],
    'sv5-discs': [
        {label: 'discs 5', actions: [setDiscs(5)], target: sol('parabola', 'x', 5)},
        {label: 'discs 60', actions: [setDiscs(5), setDiscs(60)], target: sol('parabola', 'x', 60)},
    ],
    'sv5-integral': [
        {label: 'Solid sqrt', actions: [setSolid('sqrt')], target: sol('sqrt', 'x', 4)},
        {label: 'discs 1', actions: [setSolid('sqrt'), setDiscs(1)], target: sol('sqrt', 'x', 1)},
        {label: 'discs 10', actions: [setSolid('sqrt'), setDiscs(1), setDiscs(10)], target: sol('sqrt', 'x', 10)},
        {label: 'discs 60', actions: [setSolid('sqrt'), setDiscs(1), setDiscs(10), setDiscs(60)], target: sol('sqrt', 'x', 60)},
    ],
    'sv5-sphere': [
        {label: 'discs 60', actions: [setDiscs(60)], target: sol('sphere', 'x', 60)},
        {label: 'discs 2', actions: [setDiscs(60), setDiscs(2)], target: sol('sphere', 'x', 2)},
        {label: 'discs 10', actions: [setDiscs(60), setDiscs(2), setDiscs(10)], target: sol('sphere', 'x', 10)},
    ],
    'sv5-axis': [{label: 'axis y', actions: [setAxis('y')], target: sol('parabola', 'y', 10)}],
    'sv5-free': [
        {label: 'axis y', actions: [setAxis('y')], target: sol('sqrt', 'y', 10)},
        {label: 'axis y, discs 60', actions: [setAxis('y'), setDiscs(60)], target: sol('sqrt', 'y', 60)},
    ],
};

describe('SV5 (solids of revolution): scenes, prompted actions, labels and quoted numbers', () => {
    test('the lesson has the six steps the tests know', () => {
        expect(stepIds).toEqual(Object.keys(OPENING));
        expect(Object.keys(PRODUCE)).toEqual(stepIds);
    });

    test('the lesson title is plain text (the runtime reads it into aria-label and title attributes, where math is not typeset)', () => {
        for (const title of [lesson.title.sl, lesson.title.en]) expect(title).not.toMatch(/\\[([]/);
    });

    for (const language of LANGUAGES) {
        test(`${language}: every scene opens on the state and readouts the kernels give, in one synchronous act from a restored checkpoint, out of order and twice; leaving restores the free state`, () => {
            setLanguage(language);
            const m = mountSolids();
            try {
                for (const id of [...stepIds, ...stepIds.slice().reverse()]) {
                    m.scene(id, 2);
                    expect({id, state: stateOf(m)}).toEqual({id, state: expectedState(OPENING[id])});
                    checkRows(id, OPENING[id]);
                    expect({id, rows: ['axis', 'volume-mesh', 'volume-exact', 'disc-sum'].map(readout)}).toEqual({id, rows: expect.not.arrayContaining([null])});
                }
                m.restore();
                expect(JSON.stringify(m.graph.state)).toBe(m.free);
            } finally {
                m.mounted.view.unmount();
            }
        });

        test(`${language}: the actions each prompt asks for reach the state the text describes, with the readouts the kernels give; no opening is already that state`, () => {
            setLanguage(language);
            const m = mountSolids();
            try {
                for (const id of stepIds) {
                    for (const produce of PRODUCE[id]) {
                        const what = `${id}: ${produce.label}`;
                        expect({what, differsFromOpening: JSON.stringify(produce.target) !== JSON.stringify(OPENING[id])}).toEqual({what, differsFromOpening: true});
                        m.scene(id);
                        if (produce.reset) m.resetView();
                        m.learner(...produce.actions);
                        expect({what, state: stateOf(m)}).toEqual({what, state: expectedState(produce.target)});
                        checkRows(what, produce.target);
                    }
                }
                m.restore();
                expect(JSON.stringify(m.graph.state)).toBe(m.free);
            } finally {
                m.mounted.view.unmount();
            }
        });
    }

    describe('the numbers quoted in the text are the readouts of the states the text describes, in sl and en', () => {
        type Key = 'disc-sum' | 'volume-exact' | 'volume-mesh';
        /** [step, state the actions reach, actions after the scene, readout, digits it is quoted with]. */
        const QUOTES: ReadonlyArray<readonly [string, Sol, readonly LessonAction[], Key, number]> = [
            ['sv5-solid', sol('cone', 'x', 10, true), [], 'disc-sum', 5],
            ['sv5-solid', sol('cone', 'x', 10, true), [], 'volume-exact', 5],
            ['sv5-discs', sol('parabola', 'x', 1), [], 'disc-sum', 5],
            ['sv5-discs', sol('parabola', 'x', 1), [], 'volume-exact', 5],
            ['sv5-discs', sol('parabola', 'x', 1), [], 'volume-mesh', 5],
            ['sv5-discs', sol('parabola', 'x', 5), [setDiscs(5)], 'disc-sum', 5],
            ['sv5-discs', sol('parabola', 'x', 60), [setDiscs(60)], 'disc-sum', 5],
            ['sv5-integral', sol('parabola', 'x', 4), [], 'disc-sum', 5],
            ['sv5-integral', sol('parabola', 'x', 4), [], 'volume-exact', 5],
            ['sv5-integral', sol('sqrt', 'x', 4), [setSolid('sqrt')], 'disc-sum', 5],
            ['sv5-integral', sol('sqrt', 'x', 4), [setSolid('sqrt')], 'volume-exact', 5],
            ['sv5-integral', sol('sqrt', 'x', 4), [setSolid('sqrt')], 'volume-mesh', 5],
            ['sv5-integral', sol('sqrt', 'x', 1), [setSolid('sqrt'), setDiscs(1)], 'disc-sum', 5],
            ['sv5-integral', sol('sqrt', 'x', 10), [setSolid('sqrt'), setDiscs(10)], 'disc-sum', 5],
            ['sv5-integral', sol('sqrt', 'x', 60), [setSolid('sqrt'), setDiscs(60)], 'disc-sum', 5],
            ['sv5-sphere', sol('sphere', 'x', 6), [], 'volume-exact', 5],
            ['sv5-sphere', sol('sphere', 'x', 6), [], 'volume-mesh', 5],
            ['sv5-sphere', sol('sphere', 'x', 60), [setDiscs(60)], 'disc-sum', 5],
            ['sv5-sphere', sol('sphere', 'x', 2), [setDiscs(2)], 'disc-sum', 4],
            ['sv5-sphere', sol('sphere', 'x', 10), [setDiscs(10)], 'disc-sum', 5],
            ['sv5-axis', sol('parabola', 'x', 10), [], 'disc-sum', 5],
            ['sv5-axis', sol('parabola', 'x', 10), [], 'volume-exact', 5],
            ['sv5-axis', sol('parabola', 'y', 10), [setAxis('y')], 'volume-exact', 4],
            ['sv5-axis', sol('parabola', 'y', 10), [setAxis('y')], 'disc-sum', 4],
            ['sv5-axis', sol('parabola', 'y', 10), [setAxis('y')], 'volume-mesh', 5],
            ['sv5-free', sol('sqrt', 'x', 10), [], 'disc-sum', 5],
            ['sv5-free', sol('sqrt', 'x', 10), [], 'volume-exact', 5],
            ['sv5-free', sol('sqrt', 'y', 10), [setAxis('y')], 'volume-exact', 5],
            ['sv5-free', sol('sqrt', 'y', 10), [setAxis('y')], 'disc-sum', 5],
            ['sv5-free', sol('sqrt', 'y', 60), [setAxis('y'), setDiscs(60)], 'disc-sum', 5],
        ];
        const valueOf = (s: Sol, key: Key) => key === 'disc-sum' ? sumOf(s.solid, s.axis, s.discs) : key === 'volume-exact' ? exactOf(s.solid, s.axis) : meshOf(s.solid, s.axis)!;
        for (const language of LANGUAGES) {
            test(`${language}: every quoted readout value (graph and kernel) is in the step text`, () => {
                setLanguage(language);
                const m = mountSolids();
                try {
                    for (const [id, state, actions, key, digits] of QUOTES) {
                        const kernelValue = valueOf(state, key);
                        m.scene(id);
                        m.learner(...actions);
                        const shown = numberOf(readout(key));
                        expect({id, key, discs: state.discs, shown: Number(shown.toFixed(digits))}).toEqual({id, key, discs: state.discs, shown: Number(kernelValue.toFixed(digits))});
                        expect({id, key, discs: state.discs, quoted: hasQuote(allText(id, language), kernelValue, digits, language)}).toEqual({id, key, discs: state.discs, quoted: true});
                    }
                    m.restore();
                } finally {
                    m.mounted.view.unmount();
                }
            });
        }
    });

    describe('the control and readout names a prompt uses exist in the graph strings, in sl and en', () => {
        const discRow = () => t('solids_graph_row_disc_sum', {value0: 0}).replace(/ \(.*$/, '');
        const washerRow = () => t('solids_graph_row_washer_sum', {value0: 0}).replace(/ \(.*$/, '');
        /** [step, which text the phrase must be in, phrase = the catalog string]. */
        const names = (): ReadonlyArray<readonly [string, 'prompt' | 'all', string]> => [
            ['sv5-solid', 'prompt', t('display')],
            ['sv5-solid', 'prompt', t('patch_view_reset')],
            ['sv5-discs', 'prompt', t('solids_graph_discs')],
            ['sv5-discs', 'prompt', discRow()],
            ['sv5-discs', 'prompt', t('solids_graph_row_exact_volume')],
            ['sv5-discs', 'all', t('solids_graph_row_mesh_volume')],
            ['sv5-integral', 'prompt', t('solids_graph_solid')],
            ['sv5-integral', 'prompt', t('solids_graph_solid_sqrt')],
            ['sv5-integral', 'prompt', t('solids_graph_discs')],
            ['sv5-integral', 'prompt', discRow()],
            ['sv5-integral', 'prompt', t('solids_graph_row_exact_volume')],
            ['sv5-integral', 'all', t('solids_graph_row_mesh_volume')],
            ['sv5-sphere', 'prompt', t('solids_graph_discs')],
            ['sv5-sphere', 'prompt', discRow()],
            ['sv5-sphere', 'prompt', t('solids_graph_row_exact_volume')],
            ['sv5-sphere', 'all', t('solids_graph_row_mesh_volume')],
            ['sv5-axis', 'prompt', t('solids_graph_axis')],
            ['sv5-axis', 'prompt', t('solids_graph_axis_x')],
            ['sv5-axis', 'prompt', t('solids_graph_axis_y')],
            ['sv5-axis', 'prompt', t('solids_graph_row_exact_volume')],
            ['sv5-axis', 'prompt', washerRow()],
            ['sv5-axis', 'prompt', discRow()],
            ['sv5-axis', 'all', t('solids_graph_row_mesh_volume')],
            ['sv5-free', 'prompt', t('solids_graph_axis')],
            ['sv5-free', 'prompt', t('solids_graph_axis_x')],
            ['sv5-free', 'prompt', t('solids_graph_axis_y')],
            ['sv5-free', 'prompt', t('solids_graph_discs')],
            ['sv5-free', 'prompt', t('solids_graph_solid')],
            ['sv5-free', 'prompt', t('solids_graph_solid_sqrt')],
            ['sv5-free', 'prompt', t('solids_graph_solid_parabola')],
            ['sv5-free', 'prompt', t('solids_graph_solid_sphere')],
        ];
        for (const language of LANGUAGES) {
            test(`${language}: every named control and row is the graph's exact label, in the prompt text, and is shown on the page`, () => {
                setLanguage(language);
                const m = mountSolids();
                try {
                    for (const [id, where, phrase] of names()) {
                        const haystack = where === 'prompt' ? `${stepOf(id).explanation[language]} ${stepOf(id).observationPrompt[language]}` : allText(id, language);
                        expect({id, phrase, named: prose(haystack).includes(phrase)}).toEqual({id, phrase, named: true});
                    }
                    // the labels exist on the page: the three controls and the four rows of the opening of the lesson's first revolve step
                    m.scene('sv5-discs');
                    const page = document.body.textContent ?? '';
                    for (const label of [t('solids_graph_solid'), t('solids_graph_axis'), t('solids_graph_discs'), t('solids_graph_row_mesh_volume'), t('solids_graph_row_exact_volume'), t('solids_graph_row_disc_sum', {value0: 1})]) {
                        expect({label, shown: page.includes(label)}).toEqual({label, shown: true});
                    }
                    m.learner(setAxis('y'));
                    expect({washer: (document.body.textContent ?? '').includes(t('solids_graph_row_washer_sum', {value0: 1}))}).toEqual({washer: true});
                    m.restore();
                } finally {
                    m.mounted.view.unmount();
                }
            });
        }
    });

    describe('a predicting step does not render the answer it quotes in its expected observations', () => {
        /** [value, digits] answers per step: what expectedObservations give and the question does not name. */
        const ANSWERS: Record<string, ReadonlyArray<readonly [number, number]>> = {
            'sv5-discs': [[sumOf('parabola', 'x', 5), 5], [sumOf('parabola', 'x', 60), 5]],
            'sv5-integral': [[8 * Math.PI, 5], [meshOf('sqrt', 'x')!, 5]],
            'sv5-sphere': [[sumOf('sphere', 'x', 60), 5], [sumOf('sphere', 'x', 6) - 36 * Math.PI, 4], [sumOf('sphere', 'x', 60) - 36 * Math.PI, 4], [36 * Math.PI, 5], [meshOf('sphere', 'x')!, 5]],
            'sv5-axis': [[Math.PI / 2, 4], [2.5, 1], [meshOf('parabola', 'y')!, 5]],
            'sv5-free': [[128 * Math.PI / 5, 5], [sumOf('sqrt', 'y', 10), 5], [sumOf('sqrt', 'y', 60), 5]],
        };
        /** Closed forms (undelimited fragments of the LaTeX) the answers are written in. */
        const FRAGMENTS: Record<string, readonly string[]> = {
            'sv5-solid': ['9\\pi', '\\tfrac32', '\\tfrac{9'],
            'sv5-integral': ['8\\pi'],
            'sv5-sphere': ['36\\pi', '18\\pi', '\\tfrac{18'],
            'sv5-axis': ['\\tfrac\\pi2', '\\tfrac52', '\\tfrac{5}{2}'],
            'sv5-free': ['128\\pi', '\\tfrac{16}{5}'],
        };
        for (const language of LANGUAGES) {
            test(`${language}: purpose, explanation and formula blocks do not contain the answers`, () => {
                setLanguage(language);
                for (const [id, answers] of Object.entries(ANSWERS)) {
                    const shown = shownBeforeAnswer(id, language);
                    for (const [value, digits] of answers) expect({id, value, shows: hasQuote(shown, value, digits, language)}).toEqual({id, value, shows: false});
                }
                for (const [id, fragments] of Object.entries(FRAGMENTS)) {
                    const shown = shownBeforeAnswer(id, language);
                    for (const fragment of fragments) expect({id, fragment, shows: shown.includes(fragment)}).toEqual({id, fragment, shows: false});
                }
                // the answers are in the expected observations, so the test is not vacuous
                for (const [id, fragments] of Object.entries(FRAGMENTS)) {
                    const observed = stepOf(id).expectedObservations.map(o => o[language]).join(' ');
                    expect({id, there: fragments.some(fragment => observed.includes(fragment))}).toEqual({id, there: true});
                }
            });
        }
    });
});

describe('SV5: the mathematics behind the quoted numbers, from the kernels and the formulas (independent of the graph)', () => {
    const counts = Array.from({length: DISC_RANGE.max - DISC_RANGE.min + 1}, (_, i) => DISC_RANGE.min + i);

    test('the exact volumes quoted are the closed forms: 8 pi, pi/5, 12 pi, 36 pi (about x) and pi/2 (parabola about y), 128 pi/5 (sqrt about y)', () => {
        // pi * integral f^2: sqrt: pi * [x^2/2]_0^4; parabola: pi * [x^5/5]_0^1; cone: pi * (9/16) * [x^3/3]_0^4; sphere: pi * [9x - x^3/3]_-3^3
        expect(Math.PI * (16 / 2)).toBeCloseTo(PROFILES.sqrt.exact, 12);
        expect(Math.PI * (1 / 5)).toBeCloseTo(PROFILES.parabola.exact, 12);
        expect(Math.PI * (9 / 16) * (64 / 3)).toBeCloseTo(PROFILES.cone.exact, 12);
        expect(Math.PI * ((27 - 9) - (-27 + 9))).toBeCloseTo(PROFILES.sphere.exact, 12);
        expect(PROFILES.sphere.exact).toBeCloseTo(4 * Math.PI * 27 / 3, 12);
        // washers about y: pi * integral (b^2 - inner^2) dy: parabola pi * (1 - 1/2); sqrt pi * (32 - 32/5)
        expect(Math.PI * (1 - 1 / 2)).toBeCloseTo(PROFILES.parabola.aboutY!.exact, 12);
        expect(Math.PI * (32 - 32 / 5)).toBeCloseTo(PROFILES.sqrt.aboutY!.exact, 12);
        // shells 2 pi * integral x f(x) dx for the parabola about y: 2 pi / 4
        expect(2 * Math.PI / 4).toBeCloseTo(Math.PI / 2, 12);
        // the quoted rounded values
        expect([PROFILES.sqrt.exact, PROFILES.parabola.exact, PROFILES.cone.exact, PROFILES.sphere.exact, Math.PI / 2, 128 * Math.PI / 5].map(v => Number(v.toFixed(5))))
            .toEqual([25.13274, 0.62832, 37.69911, 113.09734, 1.5708, 80.42477]);
    });

    test('the exact values are the limit of the midpoint sums: a fine sum agrees with the closed form to 1e-6', () => {
        for (const solid of ['cone', 'sqrt', 'parabola', 'sphere'] as const) {
            expect({solid, error: Math.abs(sumOf(solid, 'x', 40000) - exactOf(solid, 'x')) < 1e-6}).toEqual({solid, error: true});
        }
        for (const solid of ['sqrt', 'parabola'] as const) expect({solid, error: Math.abs(sumOf(solid, 'y', 40000) - exactOf(solid, 'y')) < 1e-6}).toEqual({solid, error: true});
    });

    test('the midpoint disc sums at every quoted count are pi * sum f(x_i)^2 dx by an independent loop (and by the kernel rule of volume.ts)', () => {
        const QUOTED: ReadonlyArray<readonly [SolidId, number, number]> = [
            ['cone', 10, 37.60486], ['parabola', 1, 0.19635], ['parabola', 4, 0.59595], ['parabola', 5, 0.60752], ['parabola', 10, 0.62309], ['parabola', 60, 0.62817],
            ['sqrt', 1, 25.13274], ['sqrt', 4, 25.13274], ['sqrt', 10, 25.13274], ['sqrt', 60, 25.13274],
            ['sphere', 2, 127.2345], ['sphere', 6, 114.66813], ['sphere', 10, 113.66282], ['sphere', 60, 113.11304],
        ];
        for (const [solid, n, quoted] of QUOTED) {
            const p = PROFILES[solid];
            const dx = (p.b - p.a) / n;
            let loop = 0;
            for (let k = 1; k <= n; k += 1) loop += Math.PI * p.f(p.a + (k - 0.5) * dx) ** 2 * dx;
            expect({solid, n, loop: Number(loop.toFixed(5)), quoted: Number(quoted.toFixed(5))}).toEqual({solid, n, loop: quoted, quoted});
            expect({solid, n, same: Math.abs(loop - sumOf(solid, 'x', n)) < 1e-12}).toEqual({solid, n, same: true});
        }
        expect(sumOf('parabola', 'x', 1)).toBeCloseTo(Math.PI / 16, 12);
        for (const [solid, n, quoted] of [['sqrt', 10, 80.59203], ['sqrt', 60, 80.42943]] as const) expect({solid, n, washers: Number(sumOf(solid, 'y', n).toFixed(5))}).toEqual({solid, n, washers: quoted});
    });

    test('the sqrt(x) disc sum equals 8 pi at every disc count 1..60 (to 1e-9): pi * x is linear, the midpoint rule is exact for it', () => {
        for (const n of counts) expect({n, equal: Math.abs(sumOf('sqrt', 'x', n) - 8 * Math.PI) < 1e-9}).toEqual({n, equal: true});
    });

    test('the y-axis washer sum of the parabola equals pi/2 at every disc count 1..60 (to 1e-9): pi * (1 - y) is linear', () => {
        for (const n of counts) expect({n, equal: Math.abs(sumOf('parabola', 'y', n) - Math.PI / 2) < 1e-9}).toEqual({n, equal: true});
    });

    test('the gap of the sphere sum is exactly 18 pi / n^2 at every count (a quadratic integrand), above the exact value, and the quoted gaps follow', () => {
        for (const n of counts) {
            const gap = sumOf('sphere', 'x', n) - 36 * Math.PI;
            expect({n, exact: Math.abs(gap - 18 * Math.PI / (n * n)) < 1e-9, above: gap > 0}).toEqual({n, exact: true, above: true});
        }
        const gap = (n: number) => sumOf('sphere', 'x', n) - 36 * Math.PI;
        expect([gap(6), gap(60)].map(v => Number(v.toFixed(4)))).toEqual([1.5708, 0.0157]);
        expect([gap(2), gap(10)].map(v => Number(v.toFixed(4)))).toEqual([14.1372, 0.5655]);
        expect(gap(6) / gap(60)).toBeCloseTo(100, 9);
    });

    test('the sums about x of x^2 stay below the exact value (convex integrand) and the quoted gap shrinks', () => {
        let previous = Infinity;
        for (const n of counts) {
            const gap = Math.PI / 5 - sumOf('parabola', 'x', n);
            expect({n, below: gap > 0, shrinks: gap < previous}).toEqual({n, below: true, shrinks: true});
            previous = gap;
        }
    });

    test('the mesh volume of the sqrt(x) revolve is the frustum sum times (k/2pi) sin(2pi/k) to 1e-12 (spec SV5 acceptance 1), and the quoted mesh values follow', () => {
        for (const solid of ['cone', 'sqrt', 'parabola', 'sphere'] as const) {
            const profile = profileOf(solid);
            const mesh = meshVolume(revolve(profile, 48, 'x'));
            expect({solid, factor: Math.abs(mesh - frustumSum(profile) * kgonFactor(48)) < 1e-12}).toEqual({solid, factor: true});
            expect({solid, factorForm: Math.abs(kgonFactor(48) - 48 / (2 * Math.PI) * Math.sin(2 * Math.PI / 48)) < 1e-15}).toEqual({solid, factorForm: true});
        }
        expect([meshOf('sqrt', 'x'), meshOf('parabola', 'x'), meshOf('sphere', 'x')].map(v => Number(v!.toFixed(5)))).toEqual([24.86295, 0.63198, 110.27559]);
        // the sqrt mesh is about 1,1 % below the exact value; the parabola mesh above the exact value
        expect(Number(((8 * Math.PI - meshOf('sqrt', 'x')!) / (8 * Math.PI) * 100).toFixed(1))).toBe(1.1);
        expect(meshOf('parabola', 'x')!).toBeGreaterThan(Math.PI / 5);
        expect(meshOf('sphere', 'x')!).toBeLessThan(36 * Math.PI);
    });

    test('the section areas of the cone at x = 2 and x = 4 are 9 pi / 4 and 9 pi: the radius doubles, the area becomes four times as large', () => {
        const area = (x: number) => Math.PI * PROFILES.cone.f(x) ** 2;
        expect([PROFILES.cone.f(2), PROFILES.cone.f(4)]).toEqual([1.5, 3]);
        expect(area(2)).toBeCloseTo(9 * Math.PI / 4, 12);
        expect(area(4)).toBeCloseTo(9 * Math.PI, 12);
        expect(area(4) / area(2)).toBeCloseTo(4, 12);
    });

    test('the parabola about y: centroid (3/4, 3/10) of the region, shells 2 pi / 4, volume ratio 5/2', () => {
        const n = 20000;
        let areaSum = 0, mx = 0, my = 0;
        for (let i = 0; i < n; i += 1) { const x = (i + 0.5) / n; areaSum += x * x / n; mx += x * x * x / n; my += x ** 4 / 2 / n; }
        expect([mx / areaSum, my / areaSum].map(v => Number(v.toFixed(6)))).toEqual([0.75, 0.3]);
        expect(PROFILES.parabola.aboutY!.exact / PROFILES.parabola.exact).toBeCloseTo(5 / 2, 12);
        expect(PROFILES.sqrt.aboutY!.exact / PROFILES.sqrt.exact).toBeCloseTo(16 / 5, 12);
    });

    test('numbers in the sl text have no English decimal points; every rounded number is marked as approximate; en text has no decimal commas', () => {
        const slTexts: string[] = [];
        const enTexts: string[] = [];
        for (const step of lesson.steps) {
            for (const text of [step.title, step.purpose, step.explanation, step.observationPrompt, ...step.expectedObservations, step.scene!.expectedState]) { slTexts.push(text.sl); enTexts.push(text.en); }
        }
        for (const block of lesson.formulaBlocks) { slTexts.push(block.notation.sl, block.explanation.sl); enTexts.push(block.notation.en, block.explanation.en); }
        for (const text of slTexts) expect({text: text.slice(0, 60), englishDecimal: /\d\.\d/.test(prose(text))}).toEqual({text: text.slice(0, 60), englishDecimal: false});
        for (const text of enTexts) expect({text: text.slice(0, 60), commaDecimal: /\d,\d{4,}/.test(prose(text).replace(/\\left|\\right/g, ''))}).toEqual({text: text.slice(0, 60), commaDecimal: false});
        // a rounded number (five decimals, or the four-decimal gaps and exact values) is introduced by "približno" / "about" / \approx or sits in the scene text that carries "približno" / "about"
        for (const language of LANGUAGES) {
            const marker = language === 'sl' ? /približno|\\approx/ : /about|\\approx/;
            for (const step of lesson.steps) {
                const parts = [step.explanation[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]), step.scene!.expectedState[language]];
                for (const part of parts) {
                    const rounded = prose(part).match(/\d+[.,]\d{4,}/g) ?? [];
                    if (rounded.length > 0) expect({id: step.id, part: part.slice(0, 50), marked: marker.test(part)}).toEqual({id: step.id, part: part.slice(0, 50), marked: true});
                }
            }
        }
    });

    test('every quoted number of the text is reproduced here: the rounded decimals in the sl text are exactly the values this file computes', () => {
        const known = new Set<string>();
        const add = (value: number, digits: number) => known.add(String(Number(value.toFixed(digits))).replace('.', ','));
        for (const [solid, axis, n] of [['cone', 'x', 10], ['parabola', 'x', 1], ['parabola', 'x', 4], ['parabola', 'x', 5], ['parabola', 'x', 10], ['parabola', 'x', 60], ['sqrt', 'x', 4], ['sqrt', 'x', 10], ['sphere', 'x', 2], ['sphere', 'x', 6],
            ['sphere', 'x', 10], ['sphere', 'x', 60], ['parabola', 'y', 10], ['sqrt', 'y', 10], ['sqrt', 'y', 60]] as const) add(sumOf(solid, axis, n), 5);
        for (const solid of ['cone', 'sqrt', 'parabola', 'sphere'] as const) add(exactOf(solid, 'x'), 5);
        add(exactOf('parabola', 'y'), 4); add(exactOf('sqrt', 'y'), 5);
        add(meshOf('sqrt', 'x')!, 5); add(meshOf('parabola', 'x')!, 5); add(meshOf('sphere', 'x')!, 5); add(meshOf('parabola', 'y')!, 5);
        add(sumOf('sphere', 'x', 6) - 36 * Math.PI, 4); add(sumOf('sphere', 'x', 60) - 36 * Math.PI, 4);
        for (const step of lesson.steps) {
            const text = [step.explanation.sl, step.observationPrompt.sl, ...step.expectedObservations.map(o => o.sl), step.scene!.expectedState.sl].map(prose).join(' ');
            for (const number of text.match(/\d+,\d{4,}/g) ?? []) expect({id: step.id, number, known: known.has(number)}).toEqual({id: step.id, number, known: true});
        }
    });
});
