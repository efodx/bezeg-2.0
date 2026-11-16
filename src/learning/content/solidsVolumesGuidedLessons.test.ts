/**
 * SV3 (solids, batch B, Cavalieri's principle): every scene opens on the state and readouts the text states (the real solids graph, scenes applied in one synchronous `act` from a
 * restored checkpoint, out of order and twice, in sl and en), the actions the prompts ask for give the readouts the text quotes, and the numbers are recomputed here from the
 * kernels in `src/solids/` and closed formulas (not from the graph's scene code). SV4 has its own describe below this one.
 */
import {act} from '@testing-library/react';
import {beforeAll, describe, expect, test, vi} from 'vitest';
import {sceneActions} from '../runtime/lessonCatalog';
import {solidsCavalieriLesson, solidsPyramidConeLesson} from './solidsVolumesGuidedLessons';
import type {LessonAction} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import SolidsGraph from '../../graphs/solids/SolidsGraph';
import {setLanguage, t} from '../../localization';
import {cone, cube, faceNormal, prism, pyramid, realCoords, vertexCount, type Solid} from '../../solids/solid';
import {cubePyramids} from '../../solids/cubePyramids';
import {kgonFactor, revolve} from '../../solids/revolve';
import {meshVolume, sliceAreaAt} from '../../solids/volume';
import {CURSOR_SCALE, DEFAULT_SOLIDS_STATE, DISC_RANGE, shearOf} from '../../solids/solidsModel';

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

// ---- the kernels, independent of the graph's scene code -------------------------------------------------------------------------------------

const SQUARE_2: ReadonlyArray<readonly [number, number]> = [[-4, -4], [4, -4], [4, 4], [-4, 4]]; // grid units of 1/4: a 2 x 2 square
const straightSolid = (id: 'cube' | 'square-prism' | 'cone'): Solid => id === 'cube' ? cube() : id === 'cone' ? cone(3, 4) : prism(SQUARE_2, -6, 6);
const cylinder = (): Solid => revolve([[0, 3], [4, 3]], 48, 'z');
/** x moves by shear (z - zmin) / (zmax - zmin): the top face by `shear`, every horizontal slice sideways as a whole. */
function sheared(solid: Solid, shear: number): Solid {
    const n = vertexCount(solid);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i += 1) { const z = realCoords(solid, i)[2]; lo = Math.min(lo, z); hi = Math.max(hi, z); }
    const out = new Float64Array(3 * n);
    for (let i = 0; i < n; i += 1) { const [x, y, z] = realCoords(solid, i); out.set([x + shear * (z - lo) / (hi - lo), y, z], 3 * i); }
    return {vertices: out, faces: solid.faces};
}
const zRange = (solid: Solid) => { const zs = Array.from({length: vertexCount(solid)}, (_, i) => realCoords(solid, i)[2]); return {lo: Math.min(...zs), hi: Math.max(...zs)}; };

interface Spec {readonly solid: 'cube' | 'square-prism' | 'cone'; readonly shear: number; readonly discs: number; readonly cursor: number}
const spec = (solid: Spec['solid'], shear: number, cursor: number, discs = DEFAULT_SOLIDS_STATE.discs): Spec => ({solid, shear, discs, cursor});

/** What the readouts must show: from the kernels. Heights as the cursor sets them (cursor / 40 of the height). */
function expectedRows(s: Spec) {
    const first = straightSolid(s.solid);
    const second = s.solid === 'cone' ? cylinder() : sheared(first, shearOf(s.shear));
    const {lo, hi} = zRange(first);
    const z = lo + (hi - lo) * s.cursor / CURSOR_SCALE;
    const exact = s.solid === 'cone' ? [12 * Math.PI, 36 * Math.PI] : [meshVolume(first), meshVolume(first)];
    return {volume: [meshVolume(first), meshVolume(second)], exact, height: z, slice: [sliceAreaAt(first, z), sliceAreaAt(second, z)]};
}

// ---- lesson text --------------------------------------------------------------------------------------------------------------------------

const lesson = solidsCavalieriLesson;
const stepOf = (id: string) => lesson.steps.find(step => step.id === id)!;
const stepIds = lesson.steps.map(step => step.id);
const allText = (id: string, language: Language) => {
    const step = stepOf(id);
    return [step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]), step.scene!.expectedState[language]].join(' ');
};
/** What a predicting step shows before the learner has answered: purpose, explanation and the formula blocks it attaches. */
const shownBeforeAnswer = (id: string, language: Language) => {
    const step = stepOf(id);
    const blocks = lesson.formulaBlocks.filter(block => step.formulaIds.includes(block.id));
    return [step.purpose[language], step.explanation[language], ...blocks.flatMap(b => [b.latex, b.notation[language], b.explanation[language]]), ...(lesson.workedExamples ?? []).map(w => JSON.stringify(w))].join(' ');
};

// ---- the graph ----------------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const pageText = () => document.body.textContent ?? '';

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
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, mounted, capabilities, scene, learner, restore, free};
}
const setShear = (shear: number): LessonAction => ({kind: 'solids', operation: 'set-shear', shear});
const setCursor = (cursor: number): LessonAction => ({kind: 'solids', operation: 'set-cursor', cursor});
const setDiscs = (discs: number): LessonAction => ({kind: 'solids', operation: 'set-discs', discs});
const setSolid = (solid: string): LessonAction => ({kind: 'solids', operation: 'set-solid', solid});

type Mounted = ReturnType<typeof mountSolids>;
const stateSpec = (m: Mounted): Spec & {mode: string} => ({solid: m.graph.state.solid as Spec['solid'], mode: m.graph.state.mode, shear: m.graph.state.shear, discs: m.graph.state.discs, cursor: m.graph.state.cursor});

function checkRows(what: string, s: Spec) {
    const e = expectedRows(s);
    const near = (key: string, actual: number, expected: number) => expect({what, key, ok: Math.abs(actual - expected) <= 6e-6, actual, expected}).toEqual({what, key, ok: true, actual, expected});
    near('volume-0', numberOf(readout('volume-0')), e.volume[0]);
    near('volume-1', numberOf(readout('volume-1')), e.volume[1]);
    near('exact-0', numberOf(readout('exact-0')), e.exact[0]);
    near('exact-1', numberOf(readout('exact-1')), e.exact[1]);
    near('height', numberOf(readout('height')), e.height);
    near('slice-0', numberOf(readout('slice-0')), e.slice[0]);
    near('slice-1', numberOf(readout('slice-1')), e.slice[1]);
}
const shearedNote = () => pageText().includes(t('solids_graph_sheared_note'));
const failingNote = () => pageText().includes(t('solids_graph_failing_note'));

/** The opening of every step: what the scene sets, and which note is on screen. */
const OPENING: Record<string, {spec: Spec; shearedNote: boolean; failingNote: boolean}> = {
    'sv3-stack': {spec: spec('square-prism', 0, 20), shearedNote: false, failingNote: false},
    'sv3-shear': {spec: spec('square-prism', 0, 20), shearedNote: false, failingNote: false},
    'sv3-slices': {spec: spec('square-prism', 0, 20), shearedNote: false, failingNote: false},
    'sv3-failing': {spec: spec('cone', 0, 20), shearedNote: false, failingNote: true},
    'sv3-free': {spec: spec('square-prism', 6, 20, 12), shearedNote: true, failingNote: false},
};

/** What each prompt asks the learner to produce: the actions and the state they reach (every one differs from the opening). */
interface Produce {readonly label: string; readonly actions: readonly LessonAction[]; readonly target: Spec; readonly shearedNote: boolean; readonly failingNote: boolean}
const PRODUCE: Record<string, readonly Produce[]> = {
    'sv3-stack': [{label: 'Shear 1,5', actions: [setShear(6)], target: spec('square-prism', 6, 20), shearedNote: true, failingNote: false}],
    'sv3-shear': [
        {label: 'Shear -1,5', actions: [setShear(-6)], target: spec('square-prism', -6, 20), shearedNote: true, failingNote: false},
        {label: 'Shear 3', actions: [setShear(-6), setShear(12)], target: spec('square-prism', 12, 20), shearedNote: true, failingNote: false},
    ],
    'sv3-slices': [
        {label: 'Shear 3, cursor 25 %', actions: [setShear(12), setCursor(10)], target: spec('square-prism', 12, 10), shearedNote: true, failingNote: false},
        {label: 'Shear 3, cursor 75 %', actions: [setShear(12), setCursor(10), setCursor(30)], target: spec('square-prism', 12, 30), shearedNote: true, failingNote: false},
    ],
    'sv3-failing': [
        {label: 'cursor 25 %', actions: [setCursor(10)], target: spec('cone', 0, 10), shearedNote: false, failingNote: true},
        {label: 'cursor 75 %', actions: [setCursor(10), setCursor(30)], target: spec('cone', 0, 30), shearedNote: false, failingNote: true},
    ],
    'sv3-free': [
        {label: 'slabs 3', actions: [setDiscs(3)], target: spec('square-prism', 6, 20, 3), shearedNote: true, failingNote: false},
        {label: 'cube', actions: [setDiscs(3), setSolid('cube')], target: spec('cube', 6, 20, 3), shearedNote: true, failingNote: false},
        {label: 'cone', actions: [setSolid('cone')], target: spec('cone', 6, 20, 12), shearedNote: false, failingNote: true},
    ],
};

describe('SV3 (Cavalieri): scenes, prompted actions, labels and quoted numbers', () => {
    test('the lesson has the five steps the tests know', () => {
        expect(stepIds).toEqual(Object.keys(OPENING));
        expect(Object.keys(PRODUCE)).toEqual(stepIds);
    });

    for (const language of LANGUAGES) {
        test(`${language}: every scene opens on the state and readouts the kernels give, in one synchronous act from a restored checkpoint, out of order and twice; leaving restores the free state`, () => {
            setLanguage(language);
            const m = mountSolids();
            try {
                for (const id of [...stepIds, ...stepIds.slice().reverse()]) {
                    m.scene(id, 2);
                    const opening = OPENING[id];
                    expect({id, state: stateSpec(m)}).toEqual({id, state: {...opening.spec, mode: 'stack'}});
                    checkRows(id, opening.spec);
                    expect({id, shearedNote: shearedNote(), failingNote: failingNote()}).toEqual({id, shearedNote: opening.shearedNote, failingNote: opening.failingNote});
                    expect({id, rows: ['volume-0', 'exact-0', 'volume-1', 'exact-1', 'height', 'slice-0', 'slice-1'].map(readout)})
                        .toEqual({id, rows: expect.not.arrayContaining([null])});
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
                        expect({what, differsFromOpening: JSON.stringify(produce.target) !== JSON.stringify(OPENING[id].spec)}).toEqual({what, differsFromOpening: true});
                        m.scene(id);
                        m.learner(...produce.actions);
                        expect({what, state: stateSpec(m)}).toEqual({what, state: {...produce.target, mode: 'stack'}});
                        checkRows(what, produce.target);
                        expect({what, shearedNote: shearedNote(), failingNote: failingNote()}).toEqual({what, shearedNote: produce.shearedNote, failingNote: produce.failingNote});
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
        /** [step, state, key, digits, which texts must carry it]. */
        const QUOTES: ReadonlyArray<readonly [string, Spec, 'volume' | 'exact' | 'height' | 'slice', number, 0 | 1]> = [
            ['sv3-stack', spec('square-prism', 6, 20), 'volume', 0, 0],
            ['sv3-stack', spec('square-prism', 6, 20), 'exact', 0, 1],
            ['sv3-shear', spec('square-prism', -6, 20), 'slice', 0, 0],
            ['sv3-shear', spec('square-prism', 12, 20), 'volume', 0, 1],
            ['sv3-slices', spec('square-prism', 12, 10), 'height', 2, 0],
            ['sv3-slices', spec('square-prism', 12, 30), 'height', 2, 0],
            ['sv3-slices', spec('square-prism', 12, 30), 'slice', 0, 1],
            ['sv3-failing', spec('cone', 0, 20), 'slice', 5, 0],
            ['sv3-failing', spec('cone', 0, 20), 'slice', 5, 1],
            ['sv3-failing', spec('cone', 0, 10), 'slice', 5, 0],
            ['sv3-failing', spec('cone', 0, 30), 'slice', 4, 0],
            ['sv3-failing', spec('cone', 0, 10), 'slice', 5, 1],
            ['sv3-failing', spec('cone', 0, 20), 'exact', 5, 0],
            ['sv3-failing', spec('cone', 0, 20), 'exact', 5, 1],
        ];
        for (const language of LANGUAGES) {
            test(`${language}: every quoted readout value (graph and kernel) is in the step text`, () => {
                setLanguage(language);
                const m = mountSolids();
                try {
                    for (const [id, state, key, digits, index] of QUOTES) {
                        const value = expectedRows(state)[key];
                        const kernelValue = Array.isArray(value) ? value[index] : value;
                        m.scene(id);
                        m.learner(...[setSolid(state.solid), ...(state.solid === 'cone' ? [] : [setShear(state.shear)]), setCursor(state.cursor)]);
                        const shown = numberOf(readout(key === 'height' ? 'height' : `${key}-${index}`));
                        expect({id, key, index, shown: Number(shown.toFixed(digits))}).toEqual({id, key, index, shown: Number(kernelValue.toFixed(digits))});
                        expect({id, key, index, quoted: hasQuote(allText(id, language), kernelValue, digits, language)}).toEqual({id, key, index, quoted: true});
                    }
                    m.restore();
                } finally {
                    m.mounted.view.unmount();
                }
            });
        }
    });

    describe('the control and readout names a prompt uses exist in the graph strings, in sl and en', () => {
        /** [step, phrase in the prompt, a catalog string it must be part of]. */
        const names = (): ReadonlyArray<readonly [string, string, string]> => {
            const sheared = t('solids_graph_name_sheared');
            const straight = t('solids_graph_name_straight');
            const shear = t('solids_graph_shear');
            const area = t('solids_graph_row_slice_area', {value0: straight}).replace(/:.*$/, '');
            const heightLabel = t('solids_graph_cursor').replace(/ \(.*$/, '');
            const volume = (name: string) => t('solids_graph_row_volume_of_mesh', {value0: name}).replace(/ \(.*$/, '');
            return [
                ['sv3-stack', shear, t('solids_graph_shear')],
                ['sv3-stack', volume(straight), t('solids_graph_row_volume_of_mesh', {value0: straight})],
                ['sv3-shear', shear, t('solids_graph_shear')],
                ['sv3-shear', area, t('solids_graph_row_slice_area', {value0: sheared})],
                ['sv3-slices', t('solids_graph_row_slice_height'), t('solids_graph_row_slice_height')],
                ['sv3-slices', heightLabel, t('solids_graph_cursor')],
                ['sv3-failing', area, t('solids_graph_row_slice_area', {value0: t('solids_graph_name_cone')})],
                ['sv3-free', t('solids_graph_slabs'), t('solids_graph_slabs')],
                ['sv3-free', t('solids_graph_solid'), t('solids_graph_solid')],
            ];
        };
        for (const language of LANGUAGES) {
            test(`${language}: named controls exist in the rendered page and the rows are the rows the graph shows`, () => {
                setLanguage(language);
                const m = mountSolids();
                try {
                    m.scene('sv3-stack');
                    const page = pageText();
                    for (const [id, phrase, label] of names()) {
                        expect({id, phrase, inPrompt: `${stepOf(id).explanation[language]} ${stepOf(id).observationPrompt[language]}`.includes(phrase)}).toEqual({id, phrase, inPrompt: true});
                        expect({id, phrase, inCatalog: label.includes(phrase)}).toEqual({id, phrase, inCatalog: true});
                    }
                    for (const control of [t('solids_graph_shear'), t('solids_graph_cursor'), t('solids_graph_slabs'), t('solids_graph_solid')]) expect({control, shown: page.includes(control)}).toEqual({control, shown: true});
                    m.restore();
                } finally {
                    m.mounted.view.unmount();
                }
            });
        }
    });

    // The volume rows the prompts name are the graph's stack-row labels: "Volume: oblique solid" (step 1) and "Volume: cone (exact)" / "Volume: cylinder (exact)" (step 4),
    // not the volume mode's generic "Volume (exact)".
    for (const language of LANGUAGES) {
        test(`${language}: the volume rows the prompts name are the stack rows of the graph`, () => {
            setLanguage(language);
            const prompt = (id: string) => `${stepOf(id).explanation[language]} ${stepOf(id).observationPrompt[language]}`;
            const sheared = t('solids_graph_row_volume_of_mesh', {value0: t('solids_graph_name_sheared')}).replace(/ \(.*$/, '');
            const cone = t('solids_graph_row_volume_of_exact', {value0: t('solids_graph_name_cone')});
            const cylinder = t('solids_graph_row_volume_of_exact', {value0: t('solids_graph_name_cylinder')});
            expect({
                sheared: prompt('sv3-stack').includes(sheared),
                cone: prompt('sv3-failing').includes(cone),
                cylinder: prompt('sv3-failing').includes(cylinder),
                generic: prompt('sv3-failing').includes(t('solids_graph_row_exact_volume')),
            }).toEqual({sheared: true, cone: true, cylinder: true, generic: false});
        });
    }

    describe('a predicting step does not render the answer it quotes in its expected observations', () => {
        /** The values each step's expectedObservations give as the answer (not the values its question already names). */
        const ANSWERS: Record<string, ReadonlyArray<readonly [number, number]>> = {
            'sv3-stack': [[12, 0]],
            'sv3-shear': [[4, 0], [12, 0]],
            'sv3-slices': [[0.75, 2], [4, 0]],
            'sv3-failing': [[expectedRows(spec('cone', 0, 10)).slice[0], 5], [expectedRows(spec('cone', 0, 30)).slice[0], 4], [12 * Math.PI, 5], [36 * Math.PI, 5], [9 * Math.PI, 5]],
        };
        for (const language of LANGUAGES) {
            test(`${language}: purpose, explanation and formula blocks do not contain the answers`, () => {
                for (const [id, answers] of Object.entries(ANSWERS)) {
                    const shown = shownBeforeAnswer(id, language);
                    for (const [value, digits] of answers) expect({id, value, shows: hasQuote(shown, value, digits, language)}).toEqual({id, value, shows: false});
                }
                const fractions = shownBeforeAnswer('sv3-failing', language);
                expect({nineSixteenths: /\{9\}\{16\}|9\/16/.test(fractions), oneSixteenth: /\{1\}\{16\}|1\/16/.test(fractions)}).toEqual({nineSixteenths: false, oneSixteenth: false});
                for (const answer of ['sv3-failing']) {
                    // the answers are in the expected observations of the step, so the test is not vacuous
                    expect({answer, there: stepOf(answer).expectedObservations.map(o => o[language]).join(' ').includes('\\tfrac{9}{16}')}).toEqual({answer, there: true});
                }
            });
        }
    });

    describe('the mathematics behind the quoted numbers, from the kernels and the formulas (independent of the graph)', () => {
        const kgon = (r: number) => 24 * r * r * Math.sin(2 * Math.PI / 48); // area of the regular 48-gon inscribed in a circle of radius r
        const prismStraight = straightSolid('square-prism');
        const {lo, hi} = zRange(prismStraight);

        test('the straight and the sheared prism: volume 12, equal to 1e-12, at every shear the text names', () => {
            expect(meshVolume(prismStraight)).toBeCloseTo(12, 12);
            for (const stored of [-12, -6, 0, 6, 12]) {
                const slanted = sheared(prismStraight, shearOf(stored));
                expect({stored, difference: Math.abs(meshVolume(slanted) - meshVolume(prismStraight)) < 1e-12}).toEqual({stored, difference: true});
                expect({stored, volume: Math.abs(meshVolume(slanted) - 12) < 1e-12}).toEqual({stored, volume: true});
            }
        });

        test('the shear moves the top face by the slider value and every slice sideways as a whole: the slice areas are equal at 100 heights and equal 4', () => {
            expect({lo, hi}).toEqual({lo: -1.5, hi: 1.5});
            for (const stored of [-6, 6, 12]) {
                const slanted = sheared(prismStraight, shearOf(stored));
                const top = Array.from({length: vertexCount(slanted)}, (_, i) => realCoords(slanted, i)).filter(p => p[2] === hi).map(p => p[0]).sort((a, b) => a - b);
                expect({stored, top}).toEqual({stored, top: [-1 + shearOf(stored), -1 + shearOf(stored), 1 + shearOf(stored), 1 + shearOf(stored)]});
                for (let i = 0; i < 100; i += 1) {
                    const z = lo + (hi - lo) * (i + 0.5) / 100;
                    expect({stored, i, equal: Math.abs(sliceAreaAt(slanted, z) - sliceAreaAt(prismStraight, z)) < 1e-12 && Math.abs(sliceAreaAt(slanted, z) - 4) < 1e-12}).toEqual({stored, i, equal: true});
                }
            }
            expect(shearOf(6)).toBe(1.5);
            expect(shearOf(-6)).toBe(-1.5);
            expect(shearOf(12)).toBe(3);
        });

        test('the slider heights the text names: cursor 10, 20, 30 are 25, 50, 75 % of the height, the slice heights -0,75, 0, 0,75', () => {
            expect([10, 20, 30].map(cursor => 100 * cursor / CURSOR_SCALE)).toEqual([25, 50, 75]);
            expect([10, 20, 30].map(cursor => lo + (hi - lo) * cursor / CURSOR_SCALE)).toEqual([-0.75, 0, 0.75]);
        });

        test('the cone and the cylinder: slice areas of the 48-gon meshes at 25, 50, 75 % of the height, their ratio (1 - t)^2, the exact volumes', () => {
            const theCone = straightSolid('cone');
            const theCylinder = cylinder();
            const values = [10, 20, 30].map(cursor => {
                const t = cursor / CURSOR_SCALE;
                const z = 4 * t;
                return {t, z, cone: sliceAreaAt(theCone, z), cylinder: sliceAreaAt(theCylinder, z)};
            });
            for (const v of values) {
                expect({t: v.t, cone: Math.abs(v.cone - kgon(3 * (1 - v.t))) < 1e-9, cylinder: Math.abs(v.cylinder - kgon(3)) < 1e-9, ratio: Math.abs(v.cone / v.cylinder - (1 - v.t) ** 2) < 1e-12})
                    .toEqual({t: v.t, cone: true, cylinder: true, ratio: true});
            }
            expect(values.map(v => Number(v.cone.toFixed(5)))).toEqual([15.85893, 7.04841, 1.7621]);
            expect(values.map(v => Number(v.cylinder.toFixed(5)))).toEqual([28.19366, 28.19366, 28.19366]);
            [9 / 16, 1 / 4, 1 / 16].forEach((fraction, i) => expect(values[i].cone / values[i].cylinder).toBeCloseTo(fraction, 12));
            expect(Number((9 * Math.PI).toFixed(5))).toBe(28.27433);
            expect(kgon(3)).toBeLessThan(9 * Math.PI);
            expect(Number((12 * Math.PI).toFixed(5))).toBe(37.69911);
            expect(Number((36 * Math.PI).toFixed(5))).toBe(113.09734);
            // exact volumes by the formulas; the meshes are the inscribed 48-gon solids, slightly below
            expect(meshVolume(theCone)).toBeCloseTo(kgon(3) * 4 / 3, 9);
            expect(meshVolume(theCylinder)).toBeCloseTo(kgon(3) * 4, 9);
            expect(meshVolume(theCone)).toBeLessThan(12 * Math.PI);
            expect(meshVolume(theCylinder)).toBeLessThan(36 * Math.PI);
            expect(meshVolume(theCylinder) / meshVolume(theCone)).toBeCloseTo(3, 9);
        });

        /** Every number the text of a step shows, as a decimal number: the numerals of the prose with the LaTeX markup removed. */
        const numbersIn = (text: string) => [...prose(text).replace(/\\[a-z]+/g, ' ').matchAll(/\d+(?:[.,]\d+)?/g)].map(match => Number(match[0].replace(',', '.')));
        /** The values the text may show: each from the kernels above or exact arithmetic. */
        const allowed = (() => {
            const t = (cursor: number) => cursor / CURSOR_SCALE;
            const cone10 = sliceAreaAt(straightSolid('cone'), 4 * t(10));
            const cone20 = sliceAreaAt(straightSolid('cone'), 4 * t(20));
            const cone30 = sliceAreaAt(straightSolid('cone'), 4 * t(30));
            return new Set<number>([
                0, 1, 2, 3, 4, // the base side 2, the heights 3 and 4, the shear 0, the empty shear and the exponent 2
                meshVolume(prismStraight), // 12 (also the number of slabs)
                shearOf(6), shearOf(12), 0.75, // 1,5 and 3 on the slider; slice height 0,75
                100 * t(10), 100 * t(20), 100 * t(30), // 25, 50, 75 %
                3, 9, 16, 36, 48, // the radius 3, 9/16 and 1/16, 12 pi and 36 pi, the 48-gon
                Number(cone10.toFixed(5)), Number(cone20.toFixed(5)), Number(cone30.toFixed(4)), Number(sliceAreaAt(cylinder(), 2).toFixed(5)), Number((9 * Math.PI).toFixed(5)),
                Number((12 * Math.PI).toFixed(5)), Number((36 * Math.PI).toFixed(5)),
            ]);
        })();
        for (const language of LANGUAGES) {
            test(`${language}: every numeral in the five steps is one the kernels or arithmetic produce`, () => {
                for (const id of stepIds) {
                    const unknown = numbersIn(allText(id, language)).filter(value => !allowed.has(value));
                    expect({id, unknown}).toEqual({id, unknown: []});
                }
            });
        }
        test('the numeral check catches a changed number (a mutated copy of the sl text of step 4)', () => {
            const original = allText('sv3-failing', 'sl');
            for (const [from, to] of [['7{,}04841', '7{,}04814'], ['28{,}19366', '28{,}1936'], ['37{,}69911', '37{,}6991'], ['\\tfrac{9}{16}', '\\tfrac{9}{15}']] as const) {
                expect({from, changes: original.includes(from)}).toEqual({from, changes: true});
                const unknown = numbersIn(original.replaceAll(from, to)).filter(value => !allowed.has(value));
                expect({from, caught: unknown.length > 0}).toEqual({from, caught: true});
            }
        });
    });

    describe('sl text has no English decimals, en text no decimal commas, and rounded numbers say so', () => {
        for (const id of ['sv3-stack', 'sv3-shear', 'sv3-slices', 'sv3-failing', 'sv3-free']) {
            test(`${id}`, () => {
                for (const language of LANGUAGES) {
                    const parts = [stepOf(id).purpose, stepOf(id).explanation, stepOf(id).observationPrompt, ...stepOf(id).expectedObservations, stepOf(id).scene!.expectedState].map(part => part[language]);
                    for (const part of parts) {
                        const plain = prose(part);
                        if (language === 'sl') expect({id, part, englishDecimal: /\d\.\d/.test(plain)}).toEqual({id, part, englishDecimal: false});
                        else expect({id, part, decimalComma: /\d,\d/.test(plain)}).toEqual({id, part, decimalComma: false});
                        if (/\d[,.]\d{4,}/.test(plain)) expect({id, part, says: /približno|about|\\approx/.test(part)}).toEqual({id, part, says: true});
                    }
                }
            });
        }
    });
});

// ======================================================================================================================================================
// SV4 (the volumes of the pyramid and the cone): the volume and revolve modes of the real solids graph. Expected values come from the kernels in `src/solids/` and
// from closed formulas written out here (midpoint sums included), not from the graph's scene code.
// ======================================================================================================================================================

const lesson4 = solidsPyramidConeLesson;
const step4 = (id: string) => lesson4.steps.find(step => step.id === id)!;
const ids4 = lesson4.steps.map(step => step.id);
const allText4 = (id: string, language: Language) => {
    const step = step4(id);
    return [step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]), step.scene!.expectedState[language]].join(' ');
};
const prompt4 = (id: string, language: Language) => `${step4(id).explanation[language]} ${step4(id).observationPrompt[language]}`;
/** What a predicting step shows before the learner has answered: purpose, explanation and the formula blocks it attaches. */
const shownBeforeAnswer4 = (id: string, language: Language) => {
    const step = step4(id);
    const blocks = lesson4.formulaBlocks.filter(block => step.formulaIds.includes(block.id));
    return [step.purpose[language], step.explanation[language], ...blocks.flatMap(b => [b.latex, b.notation[language], b.explanation[language]]), ...(lesson4.workedExamples ?? []).map(w => JSON.stringify(w))].join(' ');
};

// ---- values from the kernels and formulas ----------------------------------------------------------------------------------------------------

const SQUARE_4: ReadonlyArray<readonly [number, number]> = [[-8, -8], [8, -8], [8, 8], [-8, 8]]; // grid units of 1/4: a 4 x 4 square, the apex at 8 above a base at -8
const squarePyramid = (): Solid => pyramid(SQUARE_4, -8, [0, 0, 8]);
const coneAboutX = (): Solid => revolve([[0, 0], [4, 3]], 48, 'x'); // r = 3x/4 on [0, 4], turned about the x axis
/** The midpoint disc sum of the cone about the x axis: pi * sum r(x_i)^2 * dx, r(x) = 3x/4 and x_i the middle of the i-th of n parts of [0, 4]. */
const midpointDiscs = (n: number) => { let s = 0; for (let i = 0; i < n; i += 1) s += (3 * ((i + 0.5) * 4 / n) / 4) ** 2; return Math.PI * s * 4 / n; };
/** The midpoint washer sum of the same region about the y axis: pi * sum (4^2 - (4y/3)^2) * dy over n parts of [0, 3] (outer radius 4, inner radius 4y/3 from the line). */
const midpointWashers = (n: number) => { let s = 0; for (let i = 0; i < n; i += 1) s += 16 - (4 * ((i + 0.5) * 3 / n) / 3) ** 2; return Math.PI * s * 3 / n; };

interface Spec4 {readonly mode: 'volume' | 'revolve'; readonly solid: 'cube' | 'square-pyramid' | 'cone'; readonly pyramids: boolean; readonly axis: 'x' | 'y'; readonly discs: number}
const volumeSpec = (solid: Spec4['solid'], pyramids: boolean): Spec4 => ({mode: 'volume', solid, pyramids, axis: DEFAULT_SOLIDS_STATE.axis, discs: DEFAULT_SOLIDS_STATE.discs});
const revolveSpec = (axis: 'x' | 'y', discs: number): Spec4 => ({mode: 'revolve', solid: 'cone', pyramids: DEFAULT_SOLIDS_STATE.pyramids, axis, discs});

/** The readout rows a state must show (id -> value), from the kernels; `axis` is a text row. */
function rows4(s: Spec4): Record<string, number> {
    if (s.mode === 'volume' && s.solid === 'cube') {
        const pieces = cubePyramids().map(meshVolume);
        return s.pyramids ? {'pyramid-0': pieces[0], 'pyramid-1': pieces[1], 'pyramid-2': pieces[2], 'pyramids-sum': pieces[0] + pieces[1] + pieces[2]} : {'volume-mesh': meshVolume(cube()), 'volume-exact': 1};
    }
    if (s.mode === 'volume') return {'volume-mesh': meshVolume(squarePyramid()), 'volume-exact': 16 * 4 / 3}; // B h / 3
    if (s.axis === 'x') return {'volume-mesh': meshVolume(coneAboutX()), 'volume-exact': 12 * Math.PI, 'disc-sum': midpointDiscs(s.discs)};
    return {'volume-mesh': 32 * Math.PI * kgonFactor(48), 'volume-exact': 32 * Math.PI, 'disc-sum': midpointWashers(s.discs)}; // both radii of the washers are inscribed 48-gon radii
}

// ---- the graph ----------------------------------------------------------------------------------------------------------------------------

function mountSolids4() {
    const m = mountSolids();
    const checkpoint = m.capabilities.captureState();
    const scene = (stepId: string, times = 1) => act(() => {
        m.capabilities.restoreState(checkpoint);
        for (let i = 0; i < times; i += 1) for (const action of sceneActions(step4(stepId).scene!)) m.capabilities.apply(action);
    });
    return {...m, scene};
}
type Mounted4 = ReturnType<typeof mountSolids4>;
const setAxis = (axis: 'x' | 'y'): LessonAction => ({kind: 'solids', operation: 'set-axis', axis});
const setPyramids = (pyramids: boolean): LessonAction => ({kind: 'solids', operation: 'set-pyramids', pyramids});
const stateSpec4 = (m: Mounted4): Spec4 => ({mode: m.graph.state.mode as Spec4['mode'], solid: m.graph.state.solid as Spec4['solid'], pyramids: m.graph.state.pyramids, axis: m.graph.state.axis, discs: m.graph.state.discs});
const readoutIds = () => [...document.querySelectorAll('[data-readout]')].map(node => node.getAttribute('data-readout')!).sort();
const readoutLabel = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent ?? null;

function checkRows4(what: string, s: Spec4) {
    const expected = rows4(s);
    expect({what, ids: readoutIds()}).toEqual({what, ids: [...Object.keys(expected), ...(s.mode === 'revolve' ? ['axis'] : [])].sort()});
    for (const [key, value] of Object.entries(expected)) {
        const shown = numberOf(readout(key));
        expect({what, key, ok: Math.abs(shown - value) <= 6e-6, shown, value}).toEqual({what, key, ok: true, shown, value});
    }
    if (s.mode === 'revolve') expect({what, axis: readout('axis')}).toEqual({what, axis: t(`solids_graph_axis_${s.axis}`)});
    if (s.mode === 'revolve') expect({what, label: readoutLabel('disc-sum')}).toEqual({what, label: t(s.axis === 'y' ? 'solids_graph_row_washer_sum' : 'solids_graph_row_disc_sum', {value0: s.discs})});
    expect({what, pyramidsNote: pageText().includes(t('solids_graph_pyramids_note'))}).toEqual({what, pyramidsNote: s.mode === 'volume' && s.solid === 'cube' && s.pyramids});
}

/** The opening of every step. */
const OPENING4: Record<string, Spec4> = {
    'sv4-cube': volumeSpec('cube', false),
    'sv4-split': volumeSpec('cube', false),
    'sv4-argument': volumeSpec('cube', true),
    'sv4-square-pyramid': volumeSpec('cube', true),
    'sv4-cone': revolveSpec('x', 4),
    'sv4-free': revolveSpec('x', 10),
};
interface Produce4 {readonly label: string; readonly actions: readonly LessonAction[]; readonly target: Spec4}
/** What each prompt asks the learner to do (steps 1 and 3 ask only for reading and writing); every target differs from the step's opening. */
const PRODUCE4: Record<string, readonly Produce4[]> = {
    'sv4-cube': [],
    'sv4-split': [{label: 'switch on', actions: [setPyramids(true)], target: volumeSpec('cube', true)}],
    'sv4-argument': [],
    'sv4-square-pyramid': [{label: 'Telo: square pyramid', actions: [setSolid('square-pyramid')], target: volumeSpec('square-pyramid', true)}],
    'sv4-cone': [
        {label: 'discs 10', actions: [setDiscs(10)], target: revolveSpec('x', 10)},
        {label: 'discs 10 then 60', actions: [setDiscs(10), setDiscs(60)], target: revolveSpec('x', 60)},
    ],
    'sv4-free': [
        {label: 'axis y', actions: [setAxis('y')], target: revolveSpec('y', 10)},
        {label: 'axis y, discs 4', actions: [setAxis('y'), setDiscs(4)], target: revolveSpec('y', 4)},
        {label: 'axis y, discs 60', actions: [setAxis('y'), setDiscs(60)], target: revolveSpec('y', 60)},
        {label: 'discs 60', actions: [setDiscs(60)], target: revolveSpec('x', 60)},
    ],
};

describe('SV4 (pyramid and cone volumes): scenes, prompted actions, labels and quoted numbers', () => {
    test('the lesson has the six steps the tests know', () => {
        expect(ids4).toEqual(Object.keys(OPENING4));
        expect(Object.keys(PRODUCE4)).toEqual(ids4);
    });

    for (const language of LANGUAGES) {
        test(`${language}: every scene opens on the state and readouts the kernels give, in one synchronous act from a restored checkpoint, out of order and twice; leaving restores the free state`, () => {
            setLanguage(language);
            const m = mountSolids4();
            try {
                for (const id of [...ids4, ...ids4.slice().reverse()]) {
                    m.scene(id, 2);
                    expect({id, state: stateSpec4(m)}).toEqual({id, state: OPENING4[id]});
                    checkRows4(id, OPENING4[id]);
                }
                m.restore();
                expect(JSON.stringify(m.graph.state)).toBe(m.free);
            } finally {
                m.mounted.view.unmount();
            }
        });

        test(`${language}: the actions each prompt asks for reach the state the text describes, with the readouts the kernels give; no opening is already that state`, () => {
            setLanguage(language);
            const m = mountSolids4();
            try {
                for (const id of ids4) {
                    for (const produce of PRODUCE4[id]) {
                        const what = `${id}: ${produce.label}`;
                        expect({what, differsFromOpening: JSON.stringify(produce.target) !== JSON.stringify(OPENING4[id])}).toEqual({what, differsFromOpening: true});
                        m.scene(id);
                        m.learner(...produce.actions);
                        expect({what, state: stateSpec4(m)}).toEqual({what, state: produce.target});
                        checkRows4(what, produce.target);
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
        /** [step, state the learner reaches, readout id, quoted value, digits]. The learner reaches `state` by the actions below. */
        const QUOTES: ReadonlyArray<readonly [string, Spec4, string, number, number]> = [
            ['sv4-cube', volumeSpec('cube', false), 'volume-mesh', 1, 0],
            ['sv4-cube', volumeSpec('cube', false), 'volume-exact', 1, 0],
            ['sv4-split', volumeSpec('cube', true), 'pyramid-0', 1 / 3, 5],
            ['sv4-split', volumeSpec('cube', true), 'pyramid-1', 1 / 3, 5],
            ['sv4-split', volumeSpec('cube', true), 'pyramid-2', 1 / 3, 5],
            ['sv4-split', volumeSpec('cube', true), 'pyramids-sum', 1, 0],
            ['sv4-argument', volumeSpec('cube', true), 'pyramid-0', 1 / 3, 5],
            ['sv4-square-pyramid', volumeSpec('square-pyramid', true), 'volume-mesh', 64 / 3, 5],
            ['sv4-square-pyramid', volumeSpec('square-pyramid', true), 'volume-exact', 64 / 3, 5],
            ['sv4-cone', revolveSpec('x', 4), 'disc-sum', midpointDiscs(4), 5],
            ['sv4-cone', revolveSpec('x', 4), 'volume-exact', 12 * Math.PI, 5],
            ['sv4-cone', revolveSpec('x', 10), 'disc-sum', midpointDiscs(10), 5],
            ['sv4-cone', revolveSpec('x', 60), 'disc-sum', midpointDiscs(60), 5],
            ['sv4-cone', revolveSpec('x', 4), 'volume-mesh', meshVolume(coneAboutX()), 5],
            ['sv4-cone', revolveSpec('x', 60), 'volume-mesh', meshVolume(coneAboutX()), 5],
            ['sv4-free', revolveSpec('x', 10), 'disc-sum', midpointDiscs(10), 5],
            ['sv4-free', revolveSpec('y', 10), 'volume-exact', 32 * Math.PI, 5],
            ['sv4-free', revolveSpec('y', 4), 'disc-sum', midpointWashers(4), 5],
            ['sv4-free', revolveSpec('y', 10), 'disc-sum', midpointWashers(10), 5],
            ['sv4-free', revolveSpec('y', 60), 'disc-sum', midpointWashers(60), 5],
        ];
        /** The actions that take a step's opening to a state (the scene of the step itself when it is already there). */
        const reach = (state: Spec4): LessonAction[] => [
            ...(state.mode === 'revolve' ? [setAxis(state.axis), setDiscs(state.discs)] : [setSolid(state.solid), ...(state.solid === 'cube' ? [setPyramids(state.pyramids)] : [])]),
        ];
        for (const language of LANGUAGES) {
            test(`${language}: every quoted readout value (graph and kernel) is in the step text`, () => {
                setLanguage(language);
                const m = mountSolids4();
                try {
                    for (const [id, state, key, value, digits] of QUOTES) {
                        m.scene(id);
                        m.learner(...reach(state));
                        expect({id, key, state: stateSpec4(m)}).toEqual({id, key, state});
                        const shown = numberOf(readout(key));
                        expect({id, key, shown: Number(shown.toFixed(digits))}).toEqual({id, key, shown: Number(value.toFixed(digits))});
                        expect({id, key, value, quoted: hasQuote(allText4(id, language), value, digits, language)}).toEqual({id, key, value, quoted: true});
                    }
                    m.restore();
                } finally {
                    m.mounted.view.unmount();
                }
            });
        }
    });

    describe('every row and control a prompt names is the graph\'s exact label, in sl and en', () => {
        const names = (): ReadonlyArray<readonly [string, string]> => {
            const first = (key: 'solids_graph_row_pyramid', n: number) => t(key, {value0: n}).replace(/:.*$/, '');
            const pyramidRow = (n: number) => t('solids_graph_row_pyramid', {value0: n});
            const sum = t('solids_graph_row_pyramids_sum');
            const discsRow = t('solids_graph_row_disc_sum', {value0: 4}).replace(/ \(.*$/, '');
            const washersRow = t('solids_graph_row_washer_sum', {value0: 4}).replace(/ \(.*$/, '');
            const mesh = t('solids_graph_row_mesh_volume');
            const exact = t('solids_graph_row_exact_volume');
            const modeVolume = t('solids_graph_mode_volume');
            return [
                ['sv4-cube', mesh], ['sv4-cube', exact], ['sv4-cube', modeVolume], ['sv4-cube', t('solids_graph_pyramids')],
                ['sv4-split', t('solids_graph_pyramids')], ['sv4-split', pyramidRow(1)], ['sv4-split', first('solids_graph_row_pyramid', 2)], ['sv4-split', first('solids_graph_row_pyramid', 3)], ['sv4-split', sum],
                ['sv4-argument', first('solids_graph_row_pyramid', 1)], ['sv4-argument', sum],
                ['sv4-square-pyramid', t('solids_graph_solid')], ['sv4-square-pyramid', t('solids_graph_solid_square-pyramid')], ['sv4-square-pyramid', mesh], ['sv4-square-pyramid', exact],
                ['sv4-square-pyramid', modeVolume],
                ['sv4-cone', t('solids_graph_discs')], ['sv4-cone', discsRow], ['sv4-cone', exact],
                ['sv4-free', t('solids_graph_axis')], ['sv4-free', t('solids_graph_axis_x')], ['sv4-free', t('solids_graph_axis_y')], ['sv4-free', washersRow], ['sv4-free', t('solids_graph_discs')],
                ['sv4-free', t('solids_graph_pyramids')], ['sv4-free', modeVolume],
            ];
        };
        for (const language of LANGUAGES) {
            test(`${language}: the phrases are in the prompt text and the controls and rows are on the page the graph shows`, () => {
                setLanguage(language);
                const m = mountSolids4();
                try {
                    for (const [id, phrase] of names()) expect({id, phrase, inPrompt: prompt4(id, language).includes(phrase)}).toEqual({id, phrase, inPrompt: true});
                    // the revolve scenes name the mode in their expected state, the volume scenes name it in the prompt
                    for (const id of ['sv4-cone', 'sv4-free']) expect({id, mode: step4(id).scene!.expectedState[language].includes(t('solids_graph_mode_revolve'))}).toEqual({id, mode: true});
                    expect({mesh: step4('sv4-cone').expectedObservations.map(o => o[language]).join(' ').includes(t('solids_graph_row_mesh_volume'))}).toEqual({mesh: true});
                    m.scene('sv4-cube');
                    const volumePage = pageText();
                    for (const label of [t('solids_graph_mode'), t('solids_graph_solid'), t('solids_graph_pyramids'), t('solids_graph_row_mesh_volume'), t('solids_graph_row_exact_volume')]) expect({label, shown: volumePage.includes(label)}).toEqual({label, shown: true});
                    m.scene('sv4-argument');
                    for (const [i, label] of [1, 2, 3].map(n => [n, t('solids_graph_row_pyramid', {value0: n})] as const)) expect({i, label, shown: readoutLabel(`pyramid-${i - 1}`)}).toEqual({i, label, shown: label});
                    expect({sum: readoutLabel('pyramids-sum')}).toEqual({sum: t('solids_graph_row_pyramids_sum')});
                    m.scene('sv4-cone');
                    const revolvePage = pageText();
                    for (const label of [t('solids_graph_axis'), t('solids_graph_discs'), t('solids_graph_row_mesh_volume'), t('solids_graph_row_exact_volume'), t('solids_graph_row_disc_sum', {value0: 4})]) expect({label, shown: revolvePage.includes(label)}).toEqual({label, shown: true});
                    m.learner(setAxis('y'));
                    expect({washers: readoutLabel('disc-sum')}).toEqual({washers: t('solids_graph_row_washer_sum', {value0: 4})});
                    m.restore();
                } finally {
                    m.mounted.view.unmount();
                }
            });
        }
    });

    describe('a predicting step does not render the answer its expected observations give', () => {
        /** [numbers, digits] per step: the values the expected observations give as the answer (not the values the question already names). */
        const ANSWERS: Record<string, ReadonlyArray<readonly [number, number]>> = {
            'sv4-split': [[1 / 3, 5]],
            'sv4-square-pyramid': [[64 / 3, 5]],
            'sv4-cone': [[midpointDiscs(10), 5], [midpointDiscs(60), 5], [meshVolume(coneAboutX()), 5]],
            'sv4-free': [[32 * Math.PI, 5], [midpointWashers(4), 5], [midpointWashers(10), 5], [midpointWashers(60), 5]],
        };
        /** Latex or words of the answer that are not plain numbers. */
        const WORDS: Record<string, RegExp> = {
            'sv4-cube': /0\{?[,.]\}?33333|\\tfrac13|\\frac13|1\/3|tretjin|third/i,
            'sv4-split': /\\tfrac13|\\frac13|1\/3|tretjin|third/i,
            'sv4-argument': /najmanjš|smallest|zrcalj|reflection|Zamenjava|Swapping/i,
            'sv4-square-pyramid': /64\}?\{3|64\/3/,
            'sv4-free': /32\\pi|32 ?π/,
        };
        for (const language of LANGUAGES) {
            test(`${language}: purpose, explanation and formula blocks do not contain the answers`, () => {
                for (const id of ids4) {
                    const shown = shownBeforeAnswer4(id, language);
                    for (const [value, digits] of ANSWERS[id] ?? []) expect({id, value, shows: hasQuote(shown, value, digits, language)}).toEqual({id, value, shows: false});
                    if (WORDS[id]) expect({id, words: WORDS[id].test(shown)}).toEqual({id, words: false});
                    // the answers are in the expected observations, so the tests above are not vacuous
                    for (const [value, digits] of ANSWERS[id] ?? []) expect({id, value, there: hasQuote(step4(id).expectedObservations.map(o => o[language]).join(' '), value, digits, language)}).toEqual({id, value, there: true});
                }
            });
        }
    });

    test('Number of discs runs from 1 to 60 (the text says so and offers no 100)', () => {
        expect(DISC_RANGE).toEqual({min: 1, max: 60});
        for (const language of LANGUAGES) expect(prompt4('sv4-free', language) + step4('sv4-cone').expectedObservations.map(o => o[language]).join(' ')).toMatch(/\\\(60\\\)/);
    });
});

describe('SV4 mathematics behind the quoted numbers, from the kernels and the formulas (independent of the graph)', () => {
    const pieces = cubePyramids();
    const vertexSet = (solid: Solid, map: (p: readonly [number, number, number]) => readonly [number, number, number] = p => p) =>
        Array.from({length: vertexCount(solid)}, (_, i) => map(realCoords(solid, i)).map(c => c.toFixed(9)).join(',')).sort();
    /** Inside or on the boundary of a convex solid with outward faces: no face has the point on its outer side. */
    const inside = (solid: Solid, p: readonly [number, number, number], slack = 1e-9) => solid.faces.every(face => {
        const [x, y, z] = realCoords(solid, face[0]);
        const n = faceNormal(solid, face);
        return n[0] * (p[0] - x) + n[1] * (p[1] - y) + n[2] * (p[2] - z) <= slack * Math.hypot(...n);
    });

    test('the cube has volume 1; the three pyramids each have volume 1/3 = B h / 3 with B = h = 1, sum 1, to 1e-12', () => {
        expect(meshVolume(cube())).toBeCloseTo(1, 12);
        for (const piece of pieces) expect(Math.abs(meshVolume(piece) - 1 / 3)).toBeLessThan(1e-12);
        expect(Math.abs(pieces.reduce((sum, piece) => sum + meshVolume(piece), 0) - 1)).toBeLessThan(1e-12);
        expect(1 * 1 / 3).toBeCloseTo(1 / 3, 15);
        expect(Number((1 / 3).toFixed(5))).toBe(0.33333);
    });

    test('the pyramids fill the cube without overlap: every interior grid point lies in exactly one; the point (0,5; 0,2; 0,9) lies in the pyramid with base y = 0 only', () => {
        const probe = (p: readonly [number, number, number]) => pieces.map(piece => inside(piece, p));
        expect(probe([0.5, 0.2, 0.9])).toEqual([false, true, false]);
        for (let i = 1; i < 20; i += 1) for (let j = 1; j < 20; j += 1) for (let k = 1; k < 20; k += 1) {
            const p: [number, number, number] = [(i + 0.37) / 20, (j + 0.11) / 20, (k + 0.71) / 20]; // not on a shared boundary (no two coordinates equal)
            expect({p, count: probe(p).filter(Boolean).length}).toEqual({p, count: 1});
            // the pyramid with base on the face of the smallest coordinate
            const smallest = p.indexOf(Math.min(...p));
            expect({p, which: probe(p).indexOf(true)}).toEqual({p, which: smallest});
        }
    });

    test('swapping two coordinates maps one pyramid onto another (the congruence the argument uses) and keeps the volume', () => {
        const swap = (a: number, b: number) => (p: readonly [number, number, number]) => { const q: [number, number, number] = [p[0], p[1], p[2]]; q[a] = p[b]; q[b] = p[a]; return q; };
        expect(vertexSet(pieces[0], swap(0, 1))).toEqual(vertexSet(pieces[1]));
        expect(vertexSet(pieces[1], swap(1, 2))).toEqual(vertexSet(pieces[2]));
        expect(vertexSet(pieces[0], swap(0, 2))).toEqual(vertexSet(pieces[2]));
    });

    test('the square pyramid 4 x 4 x 4: mesh volume 64/3 = B h / 3 to 1e-12, the apex above the centre, and slice areas B (1 - z/h)^2 at 100 heights (Cavalieri)', () => {
        const solid = squarePyramid();
        expect(Math.abs(meshVolume(solid) - 64 / 3)).toBeLessThan(1e-12);
        expect(Number((64 / 3).toFixed(5))).toBe(21.33333);
        const zs = Array.from({length: vertexCount(solid)}, (_, i) => realCoords(solid, i));
        expect({lo: Math.min(...zs.map(p => p[2])), hi: Math.max(...zs.map(p => p[2]))}).toEqual({lo: -2, hi: 2});
        const apex = zs.find(p => p[2] === 2)!;
        expect([apex[0], apex[1]]).toEqual([0, 0]);
        for (let i = 1; i <= 100; i += 1) {
            const z = -2 + 4 * i / 101;
            expect(sliceAreaAt(solid, z)).toBeCloseTo(16 * (1 - (z + 2) / 4) ** 2, 10);
        }
    });

    test('the cone r = 3x/4 on [0, 4]: exact 12 pi = pi r^2 h / 3 = B h / 3 with B = 9 pi, the mesh is the inscribed 48-gon cone', () => {
        expect(12 * Math.PI).toBeCloseTo(Math.PI * 9 * 4 / 3, 12);
        expect(Number((12 * Math.PI).toFixed(5))).toBe(37.69911);
        expect(meshVolume(coneAboutX())).toBeCloseTo(12 * Math.PI * kgonFactor(48), 9);
        expect(Number(meshVolume(coneAboutX()).toFixed(5))).toBe(37.59154);
        // 12 pi from a fine midpoint sum, independent of the formula
        expect(midpointDiscs(200000)).toBeCloseTo(12 * Math.PI, 6);
    });

    test('the midpoint disc sums at the quoted counts (4, 10, 60), also written out by hand for 4', () => {
        const sums = [[4, 37.11006], [10, 37.60486], [60, 37.69649]] as const;
        for (const [n, quoted] of sums) expect({n, sum: Number(midpointDiscs(n).toFixed(5))}).toEqual({n, sum: quoted});
        // n = 4: pi * (9/16) * (0,25 + 2,25 + 6,25 + 12,25) * 1 (thickness 1, radii 3x/4 at x = 0,5; 1,5; 2,5; 3,5)
        expect(midpointDiscs(4)).toBeCloseTo(Math.PI * (9 / 16) * (0.25 + 2.25 + 6.25 + 12.25), 12);
        // the sum grows with n, stays below 12 pi, and the gap shrinks (the cone about the x axis: x^2 is convex, the midpoint rule underestimates)
        let previous = 0;
        for (let n = 1; n <= 60; n += 1) { const sum = midpointDiscs(n); expect({n, grows: sum > previous, below: sum < 12 * Math.PI}).toEqual({n, grows: true, below: true}); previous = sum; }
    });

    test('about the y axis: exact 32 pi (two ways), the washer sums at 4, 10 and 60 are above it and fall towards it', () => {
        // 48 pi (cylinder r 4, h 3) minus 16 pi (cone r 4, h 3), and 32 pi by shells 2 pi * integral of x (3x/4) over [0, 4] (a fine midpoint sum)
        expect(Math.PI * 16 * 3 - Math.PI * 16 * 3 / 3).toBeCloseTo(32 * Math.PI, 12);
        let shells = 0;
        const n = 200000;
        for (let i = 0; i < n; i += 1) { const x = (i + 0.5) * 4 / n; shells += x * (3 * x / 4) * 4 / n; }
        expect(2 * Math.PI * shells).toBeCloseTo(32 * Math.PI, 6);
        expect(Number((32 * Math.PI).toFixed(5))).toBe(100.53096);
        for (const [count, quoted] of [[4, 101.31636], [10, 100.65663], [60, 100.53446]] as const) expect({count, sum: Number(midpointWashers(count).toFixed(5))}).toEqual({count, sum: quoted});
        let previous = Infinity;
        for (let count = 1; count <= 60; count += 1) { const sum = midpointWashers(count); expect({count, above: sum > 32 * Math.PI, falls: sum < previous}).toEqual({count, above: true, falls: true}); previous = sum; }
        // the same region about the y axis, as washers by hand for n = 4: pi * (3/4) * (15,75 + 13,75 + 9,75 + 3,75)
        expect(midpointWashers(4)).toBeCloseTo(Math.PI * 0.75 * (15.75 + 13.75 + 9.75 + 3.75), 12);
    });

    /** Every number the text of a step shows, as a decimal number: the numerals of the prose with the LaTeX markup removed (\tfrac13 is one third, not thirteen). */
    const numbersIn = (text: string) => [...prose(text).replace(/\\tfrac13/g, '\\tfrac{1}{3}').replace(/\(1,1,1\)|\[[^\]]*\]/g, ' ').replace(/\\[a-z]+/g, ' ').matchAll(/\d+(?:[.,]\d+)?/g)].map(match => Number(match[0].replace(',', '.')));
    /** The values the text may show: each from the kernels above or exact arithmetic. */
    const allowed = new Set<number>([
        0, 1, 2, 3, 4, // coordinates, the exponent 2, the radius 3, the height and side 4, the cube edge 1, the sums from k = 1
        9, 16, 48, 64, // 9 pi and 9/16, the base 16, the inscribed 48-gon, 64/3
        10, 60, 100, 12, 32, // the disc counts 10 and 60 (and the refused 100), 12 pi, 32 pi
        0.5, 0.2, 0.9, // the point (0,5; 0,2; 0,9)
        ...[1 / 3, 64 / 3, midpointDiscs(4), midpointDiscs(10), midpointDiscs(60), 12 * Math.PI, meshVolume(coneAboutX()), 32 * Math.PI, midpointWashers(4), midpointWashers(10), midpointWashers(60)].map(value => Number(value.toFixed(5))),
    ]);
    for (const language of LANGUAGES) {
        test(`${language}: every numeral in the six steps is one the kernels or arithmetic produce`, () => {
            for (const id of ids4) {
                const unknown = numbersIn(allText4(id, language)).filter(value => !allowed.has(value));
                expect({id, unknown}).toEqual({id, unknown: []});
            }
        });
    }
    test('the numeral check catches a changed number (a mutated copy of the sl text of steps 5 and 6)', () => {
        for (const [id, from, to] of [['sv4-cone', '37{,}60486', '37{,}60468'], ['sv4-cone', '37{,}69649', '37{,}6965'], ['sv4-free', '100{,}65663', '100{,}65633'], ['sv4-free', '101{,}31636', '101{,}3136'], ['sv4-free', '32\\pi', '33\\pi']] as const) {
            const original = allText4(id, 'sl');
            expect({id, from, changes: original.includes(from)}).toEqual({id, from, changes: true});
            const unknown = numbersIn(original.replaceAll(from, to)).filter(value => !allowed.has(value));
            expect({id, from, caught: unknown.length > 0}).toEqual({id, from, caught: true});
        }
    });

    describe('sl text has no English decimals, en text no decimal commas, and rounded numbers say so', () => {
        for (const id of ['sv4-cube', 'sv4-split', 'sv4-argument', 'sv4-square-pyramid', 'sv4-cone', 'sv4-free']) {
            test(`${id}`, () => {
                for (const language of LANGUAGES) {
                    const parts = [step4(id).purpose, step4(id).explanation, step4(id).observationPrompt, ...step4(id).expectedObservations, step4(id).scene!.expectedState].map(part => part[language]);
                    for (const part of parts) {
                        const plain = prose(part);
                        if (language === 'sl') expect({id, part, englishDecimal: /\d\.\d/.test(plain)}).toEqual({id, part, englishDecimal: false});
                        else expect({id, part, decimalComma: /\d,\d/.test(plain.replace(/\(\d,\d[^)]*\)|\[[^\]]*\]/g, ''))}).toEqual({id, part, decimalComma: false});
                        if (/\d[,.]\d{4,}/.test(plain)) expect({id, part, says: /približno|about|\\approx/.test(part)}).toEqual({id, part, says: true});
                    }
                }
            });
        }
    });
});
