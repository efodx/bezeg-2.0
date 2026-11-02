/**
 * K1 (projective-cross-ratio): every scene lands in the state the text states (the real graph, one synchronous sequence of actions, out of
 * order and twice), and every number the lesson quotes is recomputed here with exact fractions of our own, without the projective kernel.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {projectiveConicsGuidedLessons} from './projectiveConicsGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {CrossRatioGraph} from '../../graphs/projective/CrossRatioGraph';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- Exact fractions of our own (bigint), independent of src/projective ------------------------------------------------------------

interface Fr {readonly n: bigint; readonly d: bigint}
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const fr = (n: number | bigint, d: number | bigint = 1): Fr => {
    let num = BigInt(n);
    let den = BigInt(d);
    if (den < 0n) { num = -num; den = -den; }
    const g = gcd(num, den) || 1n;
    return {n: num / g, d: den / g};
};
const add = (a: Fr, b: Fr): Fr => fr(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Fr, b: Fr): Fr => fr(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Fr, b: Fr): Fr => fr(a.n * b.n, a.d * b.d);
const div = (a: Fr, b: Fr): Fr => fr(a.n * b.d, a.d * b.n);
const eq = (a: Fr, b: Fr): boolean => a.n === b.n && a.d === b.d;
const toNumber = (a: Fr): number => Number(a.n) / Number(a.d);
const same = (a: Fr, b: Fr): boolean => a.n * b.d === b.n * a.d;

type P = readonly [Fr, Fr];
type Image = {readonly kind: 'finite'; readonly at: P} | {readonly kind: 'ideal'; readonly direction: readonly [bigint, bigint]};
const cross = (a: P, b: P): Fr => sub(mul(a[0], b[1]), mul(a[1], b[0]));
const minus = (a: P, b: P): P => [sub(a[0], b[0]), sub(a[1], b[1])];

/** The central projection of (x, 0) from `centre` onto the line through `m` and `n`, by intersecting the ray with the line directly. */
function project(centre: P, m: P, n: P, x: number): Image {
    const ray = minus([fr(x), fr(0)], centre);
    const line = minus(n, m);
    const denominator = cross(ray, line);
    if (denominator.n === 0n) {
        // The ray is parallel to the second line: its direction is the point at infinity.
        const scale = ray[0].d * ray[1].d;
        return {kind: 'ideal', direction: [ray[0].n * (scale / ray[0].d), ray[1].n * (scale / ray[1].d)]};
    }
    const s = div(cross(minus(m, centre), line), denominator);
    return {kind: 'finite', at: [add(centre[0], mul(s, ray[0])), add(centre[1], mul(s, ray[1]))]};
}

/** (A,B;C,D) of four numbers, the limit formula when one is at infinity (null). */
function ratio(values: readonly (Fr | null)[]): Fr {
    const [a, b, c, d] = values;
    if (a && b && c && d) return div(mul(sub(c, a), sub(d, b)), mul(sub(c, b), sub(d, a)));
    if (d && a && b && c === null) return div(sub(d, b), sub(d, a));
    if (a && b && c && d === null) return div(sub(c, a), sub(c, b));
    throw new Error('Only C or D may be at infinity in these scenes.');
}

// ---- The lesson ----------------------------------------------------------------------------------------------------------------------

const lesson: GuidedLesson = projectiveConicsGuidedLessons.find(entry => entry.demonstrationId === 'projective-cross-ratio')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');

/** A number as the prose writes it: a bare single digit or a braced group inside `\tfrac`. */
const group = (value: bigint): string => (value >= 0n && value < 10n ? `${value}` : `{${value}}`);
const tex = (value: Fr): string => (value.d === 1n ? `${value.n}` : `\\tfrac${group(value.n)}${group(value.d)}`);
const pointTex = (p: P): string => `(${tex(p[0])},${tex(p[1])})`;
const decimal = (value: number, language: 'sl' | 'en') => (language === 'sl' ? `${value}`.replace('.', '{,}') : `${value}`);

interface Expected {
    readonly params: readonly [number, number, number, number];
    readonly centre: readonly [number, number];
    readonly m: readonly [number, number];
    readonly n: readonly [number, number];
    /** The text quotes this cross-ratio as `ratio` (the original points and, equally, the images). */
    readonly ratio: readonly [number, number];
    readonly idealIndex?: number;
    /** The image points the text quotes, by index (the abscissa is projected from the centre onto the second line). */
    readonly quoted: readonly number[];
}

const SCENES: Record<string, Expected> = {
    'ratio-predict': {params: [0, 1, 3, 4], centre: [0, 5], m: [0, 1], n: [2, 2], ratio: [9, 8], quoted: [0]},
    'ratio-lengths': {params: [0, 1, 3, 4], centre: [0, 5], m: [0, 1], n: [2, 2], ratio: [9, 8], quoted: [0, 1, 2, 3]},
    'ratio-invariant': {params: [0, 1, 3, 4], centre: [0, 5], m: [0, 1], n: [2, 2], ratio: [9, 8], quoted: []},
    'ratio-drag': {params: [0, 1, 3, 4], centre: [3, 6], m: [0, 1], n: [4, 1], ratio: [9, 8], quoted: [0, 1, 2, 3]},
    'ratio-harmonic': {params: [0, 6, 2, -6], centre: [0, 5], m: [0, 1], n: [2, 2], ratio: [-1, 1], quoted: [0, 1, 2, 3]},
    'ratio-infinity': {params: [0, 1, 3, -10], centre: [0, 5], m: [0, 1], n: [2, 2], ratio: [33, 20], idealIndex: 3, quoted: [3]},
    'ratio-explore': {params: [0, 1, 2, 4], centre: [0, 5], m: [0, 1], n: [2, 2], ratio: [3, 2], quoted: []},
};

const pt = (p: readonly [number, number]): P => [fr(p[0]), fr(p[1])];
const imagesOf = (e: Expected): Image[] => e.params.map(x => project(pt(e.centre), pt(e.m), pt(e.n), x));
const xs = (images: readonly Image[]): (Fr | null)[] => images.map(image => (image.kind === 'finite' ? image.at[0] : null));

function mount() {
    const graph = createGraph('projective-cross-ratio');
    if (!(graph instanceof CrossRatioGraph)) throw new Error('projective-cross-ratio must be the cross-ratio graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(stepOf(stepId))) capabilities.apply(action);
        }),
    };
}

const line = (name: string) => document.querySelector(`[data-projective-line="${name}"]`)?.textContent ?? null;
const status = () => document.querySelector('[data-projective-status]')?.getAttribute('data-projective-status');
/** The readout's text for a fraction: a Unicode minus and `n/d`. */
const shownFraction = (value: Fr) => (value.d === 1n ? `${value.n}` : `${value.n}/${value.d}`).replace('-', '−');

test('K1 has seven ordered steps, each with a scene of its own', () => {
    expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(SCENES));
    expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(7);
    for (const step of lesson.steps) expect(sceneActions(step.scene!).some(action => action.kind === 'projective')).toBe(true);
});

test('K1: every scene lands in the stated state, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    const m = mount();
    try {
        const ids = Object.keys(SCENES);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const expected = SCENES[id];
            m.scene(id);
            m.scene(id);
            const model = m.graph.model;
            expect({id, params: model.params, centre: model.centre, line2: model.line2}).toEqual({
                id, params: expected.params, centre: {x: expected.centre[0], y: expected.centre[1]},
                line2: [{x: expected.m[0], y: expected.m[1]}, {x: expected.n[0], y: expected.n[1]}],
            });
            const images = imagesOf(expected);
            const scene = m.graph.scene();
            const stated = fr(expected.ratio[0], expected.ratio[1]);
            // The text's cross-ratio is the exact one of the original points and, by the theorem, of the images (our own fractions).
            expect(eq(ratio(expected.params.map(x => fr(x))), stated), id).toBe(true);
            expect(eq(ratio(xs(images)), stated), id).toBe(true);
            // The graph reports the same exact values, the infinity status and the images the text quotes.
            const original = scene.originalRatio;
            const imageRatio = scene.imageRatio;
            expect(original?.status === 'ok' && same(fr(original.value.num, original.value.den), stated), `${id} original`).toBe(true);
            expect(imageRatio?.status === 'ok' && same(fr(imageRatio.value.num, imageRatio.value.den), stated), `${id} image`).toBe(true);
            expect([id, scene.status, scene.idealIndex]).toEqual([id, 'ok', expected.idealIndex]);
            expect([id, status()]).toEqual([id, expected.idealIndex === undefined ? 'ok' : 'ideal']);
            images.forEach((image, i) => {
                const view = scene.imageViews?.[i];
                if (image.kind === 'ideal') {
                    // The graph shows the reduced direction (2, 1), a multiple of our ray direction (-10, -5): equal up to a nonzero scale.
                    const direction = view?.kind === 'ideal' ? view.direction : [0n, 0n];
                    expect([id, i, view?.kind, direction[0] * image.direction[1] === direction[1] * image.direction[0], direction[0] !== 0n]).toEqual([id, i, 'ideal', true, true]);
                    expect([id, direction[0], direction[1]]).toEqual([id, 2n, 1n]);
                    expect(line('images'), id).toContain('(2, 1)');
                }
                else if (view?.kind === 'finite') {
                    expect([id, i, same(fr(view.x.num, view.x.den), image.at[0]), same(fr(view.y.num, view.y.den), image.at[1])]).toEqual([id, i, true, true]);
                } else expect([id, i, view?.kind]).toEqual([id, i, 'finite']);
            });
            // The readouts, as text: the exact fraction next to the decimal, on both ratios.
            expect(line('original-ratio'), id).toContain(shownFraction(stated));
            expect(line('image-ratio'), id).toContain(shownFraction(stated));
            if (expected.idealIndex !== undefined) expect(line('limit'), id).toContain(shownFraction(stated));
            else expect(line('limit'), id).toBeNull();
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('K1: the numbers of the spec, recomputed with exact fractions', () => {
    const o = pt([0, 5]);
    const m = pt([0, 1]);
    const n = pt([2, 2]);
    // (0,1;3,4) = 9/8, and the images of 0, 1, 3, 4 from O = (0,5) onto y = 1 + x/2.
    expect(eq(ratio([fr(0), fr(1), fr(3), fr(4)]), fr(9, 8))).toBe(true);
    const images = [0, 1, 3, 4].map(x => project(o, m, n, x));
    const at = images.map(image => (image.kind === 'finite' ? image.at : [fr(0), fr(0)] as const));
    expect(at.map(([x, y]) => [x.n, x.d, y.n, y.d])).toEqual([[0n, 1n, 1n, 1n], [8n, 11n, 15n, 11n], [24n, 13n, 25n, 13n], [16n, 7n, 15n, 7n]]);
    expect(eq(ratio(at.map(([x]) => x)), fr(9, 8))).toBe(true);
    // The image points lie on y = 1 + x/2 and on the rays through O (collinear with O and the original point).
    for (const [i, x] of [0, 1, 3, 4].entries()) {
        expect(eq(at[i][1], add(fr(1), mul(fr(1, 2), at[i][0])))).toBe(true);
        expect(eq(cross(minus(at[i], o), minus([fr(x), fr(0)], o)), fr(0))).toBe(true);
    }
    // The gaps of step 2: equal original gaps AB and CD give different image gaps, and AB : BC goes from 1 : 2 to 13 : 20.
    const gap = (i: number, j: number) => sub(at[j][0], at[i][0]);
    expect([gap(0, 1), gap(1, 2), gap(2, 3)].map(g => [g.n, g.d])).toEqual([[8n, 11n], [160n, 143n], [40n, 91n]]);
    expect(toNumber(gap(0, 1)).toFixed(2)).toBe('0.73');
    expect(toNumber(gap(2, 3)).toFixed(2)).toBe('0.44');
    expect(eq(div(gap(0, 1), gap(1, 2)), fr(13, 20))).toBe(true);
    // The worked example's numerator and denominator on the images.
    expect(eq(mul(fr(24, 13), fr(120, 77)), fr(2880, 1001))).toBe(true);
    expect(eq(mul(fr(160, 143), fr(16, 7)), fr(2560, 1001))).toBe(true);
    // The harmonic quadruple 0, 6, 2, -6 gives -1 and so do its images.
    expect(eq(ratio([fr(0), fr(6), fr(2), fr(-6)]), fr(-1))).toBe(true);
    const harmonic = [0, 6, 2, -6].map(x => project(o, m, n, x));
    expect(eq(ratio(xs(harmonic)), fr(-1))).toBe(true);
    // D = -10 goes to the direction (-40, -20), a point at infinity; (0,1;3,-10) = 33/20 and the limit formula gives 33/20 for the images.
    const far = project(o, m, n, -10);
    expect(far).toEqual({kind: 'ideal', direction: [-10n, -5n]});
    expect(eq(ratio([fr(0), fr(1), fr(3), fr(-10)]), fr(33, 20))).toBe(true);
    expect(eq(div(sub(fr(24, 13), fr(0)), sub(fr(24, 13), fr(8, 11))), fr(33, 20))).toBe(true);
    expect(eq(ratio([fr(0), fr(1), fr(2), fr(4)]), fr(3, 2))).toBe(true);
    // Step 4: parallel lines, the projection is a similarity with the factor 5/6.
    const similarity = [0, 1, 3, 4].map(x => project(pt([3, 6]), pt([0, 1]), pt([4, 1]), x));
    expect(similarity.map(image => (image.kind === 'finite' ? [image.at[0].n, image.at[0].d, image.at[1].n] : []))).toEqual([[1n, 2n, 1n], [4n, 3n, 1n], [3n, 1n, 1n], [23n, 6n, 1n]]);
});

test('K1: the quoted points and values are in the prose, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        for (const [id, expected] of Object.entries(SCENES)) {
            const text = prose(stepOf(id), language);
            const images = imagesOf(expected);
            for (const i of expected.quoted) {
                const image = images[i];
                if (image.kind === 'finite') expect(text, `${id} ${language} image ${i}`).toContain(pointTex(image.at));
                else {
                    // Our ray direction (-10, -5) and the graph's reduced direction (2, 1) are both quoted.
                    expect(text, `${id} ${language} ray direction`).toContain('(-10,-5)');
                    expect(text, `${id} ${language} shown direction`).toContain('(2,1)');
                }
            }
            if (id !== 'ratio-predict' && id !== 'ratio-lengths') expect(text, `${id} ${language} ratio`).toContain(tex(fr(expected.ratio[0], expected.ratio[1])));
        }
        const step = (id: string) => prose(stepOf(id), language);
        const gaps = [[0, 1], [1, 2], [2, 3]].map(([i, j]) => {
            const image = imagesOf(SCENES['ratio-lengths']);
            const a = image[i];
            const b = image[j];
            return a.kind === 'finite' && b.kind === 'finite' ? sub(b.at[0], a.at[0]) : fr(0);
        });
        for (const g of gaps) expect(step('ratio-lengths'), language).toContain(tex(g));
        expect(step('ratio-lengths')).toContain(decimal(0.73, language));
        expect(step('ratio-lengths')).toContain(decimal(0.44, language));
        expect(step('ratio-lengths')).toContain('13:20');
        expect(step('ratio-invariant')).toContain(decimal(1.125, language));
        expect(step('ratio-infinity')).toContain(decimal(1.65, language));
        expect(step('ratio-explore')).toContain(decimal(1.5, language));
        expect(step('ratio-infinity')).toContain('24/13');
        expect(step('ratio-infinity')).toContain('160/143');
        expect(step('ratio-drag')).toContain(tex(fr(5, 6)));
        expect(step('ratio-drag')).toContain('(3,6)');
        // The theorem is stated with its source, and the drag is called an illustration (acceptance 5).
        const theorem = lesson.formulaBlocks.find(block => block.id === 'cross-ratio-definition')!.explanation[language];
        expect(theorem).toMatch(language === 'sl' ? /Izrek[\s\S]*FMF[\s\S]*ilustracija/ : /Theorem[\s\S]*FMF[\s\S]*illustrates/);
        expect(step('ratio-drag')).toMatch(language === 'sl' ? /ilustracija/ : /illustration/);
    }
});

test('K1: the exploration step names the undefined cases, and the graph reaches them without a value', () => {
    const m = mount();
    try {
        m.scene('ratio-explore');
        act(() => { m.graph.moveHandleTo(4, 2, 0); });
        expect(m.graph.scene().status).toBe('centre-on-line');
        expect(status()).toBe('undefined');
        expect(line('original-ratio')).toBeNull();
        m.scene('ratio-explore');
        act(() => { m.graph.moveHandleTo(1, 0, 0); });
        expect(m.graph.scene().status).toBe('coincident-points');
        expect(line('original-ratio')).toBeNull();
        m.scene('ratio-explore');
        expect(m.graph.scene().status).toBe('ok');
        expect(line('original-ratio')).toContain('3/2');
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);
