/**
 * K3 (projective-pole-polar): every scene lands in the state the text states (the real graph, one synchronous sequence of actions, out of
 * order and twice), and every number the lesson quotes is recomputed here with exact fractions of our own (the conic forms, polars,
 * tangency points and tangents), without the projective kernel. The tangency points and tangent lines are written down by hand and checked
 * against the conics here, then against the graph's readout.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {projectiveConicsGuidedLessons} from './projectiveConicsGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {PolePolarGraph} from '../../graphs/projective/PolePolarGraph';
import {PolePolarConicId} from '../../graphs/projective/polePolarModel';
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
const eq = (a: Fr, b: Fr): boolean => a.n * b.d === b.n * a.d;
const isZero = (a: Fr): boolean => a.n === 0n;
const sum = (values: readonly Fr[]): Fr => values.reduce(add, fr(0));

type V3 = readonly [Fr, Fr, Fr];
const vec = (x: number | Fr, y: number | Fr, w: number | Fr = 1): V3 => [typeof x === 'number' ? fr(x) : x, typeof y === 'number' ? fr(y) : y, typeof w === 'number' ? fr(w) : w];
const dot = (a: V3, b: V3): Fr => sum([mul(a[0], b[0]), mul(a[1], b[1]), mul(a[2], b[2])]);
const cross3 = (a: V3, b: V3): V3 => [sub(mul(a[1], b[2]), mul(a[2], b[1])), sub(mul(a[2], b[0]), mul(a[0], b[2])), sub(mul(a[0], b[1]), mul(a[1], b[0]))];
/** Whether two homogeneous triples are the same point or line (cross product zero, neither zero). */
const same = (p: V3, q: V3): boolean => cross3(p, q).every(isZero) && !p.every(isZero) && !q.every(isZero);

/** Conics A x^2 + B xy + C y^2 + D x + E y + F, written down here from the graph's documented definitions. */
const CONICS: Record<PolePolarConicId, readonly number[]> = {
    ellipse: [9, 0, 25, 0, 0, -225],
    circle: [1, 0, 1, 0, 0, -25],
    parabola: [1, 0, 0, 0, -4, 0],
    hyperbola: [9, 0, -16, 0, 0, -144],
};
/** The symmetric matrix of a conic, applied to a homogeneous point: the polar line of the point. */
function polarOf(id: PolePolarConicId, p: V3): V3 {
    const [a, b, c, d, e, f] = CONICS[id].map(v => fr(v));
    const half = fr(1, 2);
    const [x, y, w] = p;
    return [
        sum([mul(a, x), mul(mul(b, half), y), mul(mul(d, half), w)]),
        sum([mul(mul(b, half), x), mul(c, y), mul(mul(e, half), w)]),
        sum([mul(mul(d, half), x), mul(mul(e, half), y), mul(f, w)]),
    ];
}
/** The conic form at a homogeneous point: its sign decides outside (>0 against the sign of the form on the inside), on (0) and inside. */
const formAt = (id: PolePolarConicId, p: V3): Fr => dot(polarOf(id, p), p);

// ---- The lesson ----------------------------------------------------------------------------------------------------------------------

const lesson: GuidedLesson = projectiveConicsGuidedLessons.find(entry => entry.demonstrationId === 'projective-pole-polar')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const fields = (step: GuidedLessonStep, language: 'sl' | 'en'): string[] =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])];
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') => fields(step, language).join(' ');

/** A number as the prose writes it: `-\tfrac75`, a bare single digit or a braced group. */
const group = (value: bigint): string => (value < 10n ? `${value}` : `{${value}}`);
const tex = (value: Fr): string => {
    const sign = value.n < 0n ? '-' : '';
    const n = value.n < 0n ? -value.n : value.n;
    return value.d === 1n ? `${sign}${n}` : `${sign}\\tfrac${group(n)}${group(value.d)}`;
};
const pointTex = (p: V3): string => `(${tex(p[0])},${tex(p[1])})`;
/** The readout's text for a fraction: a Unicode minus and `n/d`. */
const shown = (value: Fr) => (value.d === 1n ? `${value.n}` : `${value.n}/${value.d}`).replace('-', '−');
const shownPoint = (p: V3) => `(${shown(p[0])}, ${shown(p[1])})`;

interface QuotedLine {
    /** The line as the prose writes it, undelimited. */
    readonly tex: string;
    /** The same line, written down by hand. */
    readonly line: V3;
}
const ql = (texText: string, a: number | Fr, b: number | Fr, c: number | Fr): QuotedLine => ({tex: texText, line: vec(a, b, c)});

interface Expected {
    readonly conic: PolePolarConicId;
    /** P: a finite point, or a direction (a point at infinity). */
    readonly p: {readonly at: V3} | {readonly direction: readonly [number, number]};
    readonly side: 'outside' | 'on' | 'inside';
    /** The polar as the readout writes it. */
    readonly polar: string;
    /** The points of tangency by name T_1, T_2, in the readout's order. */
    readonly tangency: readonly V3[];
    /** The tangents as the readout writes them (outside only). */
    readonly tangents: readonly string[];
    /** The readout's centre sentence contains this. */
    readonly centre: string;
    readonly quotedLines: readonly QuotedLine[];
    /** Whether the prose quotes P (and so must quote the scene's P). */
    readonly quotesP: boolean;
}

const P_DEFAULT = vec(1, fr(21, 5));
// The graph's order of the points of tangency (the spec, projective-conics-lessons.md K3, names them the other way round).
const T1 = vec(-3, fr(12, 5));
const T2 = vec(4, fr(9, 5));
const ON_ELLIPSE = vec(4, fr(9, 5));
const TANGENT_LINES = [ql('4x+5y-25=0', 4, 5, -25), ql('9x-20y+75=0', 9, -20, 75), ql('\\tfrac{4x}{25}+\\tfrac y5=1', fr(4, 25), fr(1, 5), -1), ql('-\\tfrac{3x}{25}+\\tfrac{4y}{15}=1', fr(-3, 25), fr(4, 15), -1)];
const POLAR_LINES = [ql('3x+35y-75=0', 3, 35, -75), ql('\\tfrac x{25}+\\tfrac{7y}{15}=1', fr(1, 25), fr(7, 15), -1)];

const SCENES: Record<string, Expected> = {
    'pole-polar-predict': {
        conic: 'ellipse', p: {at: P_DEFAULT}, side: 'outside', polar: '3x + 35y − 75 = 0', tangency: [T1, T2],
        tangents: ['9x − 20y + 75 = 0', '4x + 5y − 25 = 0'], centre: '(0, 0)', quotedLines: [], quotesP: true,
    },
    'pole-polar-tangents': {
        conic: 'ellipse', p: {at: P_DEFAULT}, side: 'outside', polar: '3x + 35y − 75 = 0', tangency: [T1, T2],
        tangents: ['9x − 20y + 75 = 0', '4x + 5y − 25 = 0'], centre: '(0, 0)', quotedLines: TANGENT_LINES, quotesP: true,
    },
    'pole-polar-polar': {
        conic: 'ellipse', p: {at: P_DEFAULT}, side: 'outside', polar: '3x + 35y − 75 = 0', tangency: [T1, T2],
        tangents: ['9x − 20y + 75 = 0', '4x + 5y − 25 = 0'], centre: '(0, 0)', quotedLines: POLAR_LINES, quotesP: true,
    },
    'pole-polar-on': {
        conic: 'ellipse', p: {at: ON_ELLIPSE}, side: 'on', polar: '4x + 5y − 25 = 0', tangency: [ON_ELLIPSE], tangents: [], centre: '(0, 0)',
        quotedLines: [ql('4x+5y-25=0', 4, 5, -25), ql('\\tfrac{4x}{25}+\\tfrac y5=1', fr(4, 25), fr(1, 5), -1)], quotesP: true,
    },
    'pole-polar-infinity': {
        conic: 'ellipse', p: {direction: [1, 0]}, side: 'outside', polar: 'x = 0', tangency: [vec(0, -3), vec(0, 3)],
        tangents: ['y + 3 = 0', 'y − 3 = 0'], centre: '(0, 0)',
        quotedLines: [ql('9x=0', 9, 0, 0), ql('x=0', 1, 0, 0), ql('y=3', 0, 1, -3), ql('y=-3', 0, 1, 3)], quotesP: false,
    },
    'pole-polar-line': {
        conic: 'circle', p: {at: vec(1, 7)}, side: 'outside', polar: 'x + 7y − 25 = 0', tangency: [vec(-3, 4), vec(4, 3)],
        tangents: ['3x − 4y + 25 = 0', '4x + 3y − 25 = 0'], centre: '(0, 0)',
        quotedLines: [ql('x+7y=25', 1, 7, -25), ql('x+7y-25=0', 1, 7, -25), ql('4x+3y=25', 4, 3, -25), ql('-3x+4y=25', -3, 4, -25), ql('4x+3y-25=0', 4, 3, -25), ql('3x-4y+25=0', 3, -4, 25)],
        quotesP: true,
    },
    'pole-polar-explore': {
        conic: 'parabola', p: {at: vec(2, 0)}, side: 'outside', polar: 'x − y = 0', tangency: [vec(0, 0), vec(4, 4)],
        tangents: ['y = 0', '2x − y − 4 = 0'], centre: '(0, 1)',
        quotedLines: [ql('x-y=0', 1, -1, 0), ql('y=0', 0, 1, 0), ql('2x-y-4=0', 2, -1, -4)], quotesP: true,
    },
};

const pointOf = (e: Expected): V3 => ('at' in e.p ? e.p.at : vec(e.p.direction[0], e.p.direction[1], 0));

function mount() {
    const graph = createGraph('projective-pole-polar');
    if (!(graph instanceof PolePolarGraph)) throw new Error('projective-pole-polar must be the pole and polar graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(stepOf(stepId))) capabilities.apply(action);
        }),
    };
}

const line = (name: string) => document.querySelector(`[data-projective-line="${name}"]`)?.textContent ?? null;
const status = () => document.querySelector('[data-projective-status]')?.getAttribute('data-projective-status');

test('K3 has seven ordered steps, each with a scene of its own that uses pole-polar operations', () => {
    expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(SCENES));
    expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(7);
    for (const step of lesson.steps) {
        const operations = sceneActions(step.scene!).flatMap(action => (action.kind === 'projective' ? [action.operation] : []));
        expect(operations.length, step.id).toBeGreaterThan(0);
        expect(operations.every(operation => operation.startsWith('pole-polar-')), step.id).toBe(true);
    }
});

test('K3: the hand-written points, lines and regions recompute with exact fractions (the spec\'s numbers)', () => {
    for (const [id, e] of Object.entries(SCENES)) {
        const p = pointOf(e);
        const polar = polarOf(e.conic, p);
        const value = formAt(e.conic, p);
        // Inside, on, outside are decided exactly from the sign of the conic form at P (the form is positive outside for all four conics).
        const sign = value.n === 0n ? 'on' : value.n > 0n ? 'outside' : 'inside';
        expect([id, sign]).toEqual([id, e.side]);
        e.tangency.forEach((t, i) => {
            expect([id, 'T', i, isZero(formAt(e.conic, t))]).toEqual([id, 'T', i, true]);
            // Each point of tangency is on the polar of P, and the tangent there passes through P.
            expect([id, 'T on polar', i, isZero(dot(polar, t))]).toEqual([id, 'T on polar', i, true]);
            const tangent = polarOf(e.conic, t);
            expect([id, 'tangent through P', i, isZero(dot(tangent, p))]).toEqual([id, 'tangent through P', i, true]);
        });
        if (e.side === 'on') expect(same(polar, polarOf(e.conic, e.tangency[0]))).toBe(true);
        // The quoted lines are the polar or one of the tangents.
        const lines = [polar, ...e.tangency.map(t => polarOf(e.conic, t))];
        for (const quoted of e.quotedLines) expect([id, quoted.tex, lines.some(candidate => same(candidate, quoted.line))]).toEqual([id, quoted.tex, true]);
    }
    // The default numbers in the graph's order, written directly: T1 = (-3, 12/5), T2 = (4, 9/5) on 9x^2 + 25y^2 = 225; the tangents meet at P = (1, 21/5).
    const tangent1 = vec(fr(-3, 25), fr(4, 15), -1);
    const tangent2 = vec(fr(4, 25), fr(1, 5), -1);
    expect(same(cross3(tangent1, tangent2), P_DEFAULT)).toBe(true);
    expect(same(polarOf('ellipse', T1), tangent1) && same(polarOf('ellipse', T2), tangent2)).toBe(true);
    // The polar x/25 + 7y/15 = 1 through T1 and T2: both residuals exactly 0.
    const polar = vec(fr(1, 25), fr(7, 15), -1);
    expect(same(polarOf('ellipse', P_DEFAULT), polar)).toBe(true);
    expect([dot(polar, T1), dot(polar, T2)].every(isZero)).toBe(true);
    // P is outside: x^2/25 + y^2/9 = 1/25 + 441/225 = 2 > 1.
    const value = add(mul(fr(1, 25), fr(1)), mul(mul(fr(21, 5), fr(21, 5)), fr(1, 9)));
    expect(eq(value, fr(2))).toBe(true);
    // On: (4, 9/5) gives 16/25 + 9/25 = 1; inside: (1, 1) gives 1/25 + 1/9 = 34/225 < 1, with the polar 9x + 25y - 225 = 0.
    expect(eq(add(mul(fr(16, 25), fr(1)), mul(mul(fr(9, 5), fr(9, 5)), fr(1, 9))), fr(1))).toBe(true);
    expect(eq(add(fr(1, 25), fr(1, 9)), fr(34, 225))).toBe(true);
    expect(same(polarOf('ellipse', vec(1, 1)), vec(9, 25, -225))).toBe(true);
    expect(formAt('ellipse', vec(1, 1)).n < 0n).toBe(true);
    // Acceptance 4: the polar of (1, 0, 0) for 9x^2 + 25y^2 - 225 is x = 0, and the pole of the line at infinity is the centre (0, 0).
    expect(same(polarOf('ellipse', vec(1, 0, 0)), vec(1, 0, 0))).toBe(true);
    expect(same(polarOf('ellipse', vec(0, 0, 1)), vec(0, 0, 1))).toBe(true);
    // The parabola x^2 = 4y has no finite centre: the polar of the point at infinity of its axis (0, 1, 0) is the line at infinity, w = 0.
    expect(same(polarOf('parabola', vec(0, 1, 0)), vec(0, 0, 1))).toBe(true);
    // The circle: the tangents at (4, 3) and (-3, 4) meet at (1, 7), which is on the line x + 7y = 25.
    expect(same(cross3(polarOf('circle', vec(4, 3)), polarOf('circle', vec(-3, 4))), vec(1, 7))).toBe(true);
    // The worked example: the tangents 4x + 5y = 25 and -9x + 20y = 75 meet at (1, 21/5).
    expect(same(cross3(vec(4, 5, -25), vec(-9, 20, -75)), P_DEFAULT)).toBe(true);
});

test('K3: every scene lands in the stated state, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    const m = mount();
    try {
        const ids = Object.keys(SCENES);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const e = SCENES[id];
            m.scene(id);
            m.scene(id);
            const model = m.graph.model;
            expect({id, conic: model.conic}).toEqual({id, conic: e.conic});
            const scene = m.graph.scene();
            // P: the finite point or the direction the text states.
            const p: V3 = [fr(scene.p[0]), fr(scene.p[1]), fr(scene.p[2])];
            expect([id, 'P', same(p, pointOf(e)), scene.ideal, !('at' in e.p)]).toEqual([id, 'P', true, !('at' in e.p), !('at' in e.p)]);
            // The region is the exact one, and the status text names it.
            expect([id, scene.side, status()]).toEqual([id, e.side, e.side]);
            expect(line('status'), id).toContain({outside: 'zunaj stožnice', on: 'na stožnici', inside: 'znotraj stožnice'}[e.side]);
            // The polar, the tangency points and the tangents are the ones we computed.
            expect(line('polar'), id).toContain(e.polar);
            expect([id, scene.tangency.length]).toEqual([id, e.tangency.length]);
            e.tangency.forEach((t, i) => {
                const entry = scene.tangency[i];
                expect([id, i, entry.exact]).toEqual([id, i, true]);
                if (entry.exact) expect([id, i, same([fr(entry.point[0]), fr(entry.point[1]), fr(entry.point[2])], t)]).toEqual([id, i, true]);
                expect(line(`tangency-${i + 1}`), id).toContain(shownPoint(t));
            });
            expect([id, scene.numerical]).toEqual([id, false]);
            expect(line('numerical'), id).toBeNull();
            e.tangents.forEach((text, i) => expect(line(`tangent-${i + 1}`), id).toContain(text));
            expect([id, line(`tangent-${e.tangents.length + 1}`)]).toEqual([id, null]);
            // The centre: the pole of the line at infinity; for the parabola it is at infinity and nothing finite is drawn.
            expect(line('centre'), id).toContain(e.centre);
            if (e.conic === 'parabola') {
                expect([id, scene.centre?.kind]).toEqual([id, 'ideal']);
                expect(line('centre'), id).toContain('v neskončnosti');
            } else {
                expect([id, scene.centre?.kind]).toEqual([id, 'finite']);
            }
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('K3: the inside example the prose describes reads as the prose says, and the readout is English after a live language switch', () => {
    const m = mount();
    try {
        m.scene('pole-polar-on');
        act(() => { m.capabilities.apply({kind: 'projective', operation: 'pole-polar-load-example', exampleId: 'inside'}); });
        expect(status()).toBe('inside');
        expect(line('polar')).toContain('9x + 25y − 225 = 0');
        expect(line('tangent-1')).toBeNull();
        expect(line('tangency-1')).toBeNull();
        expect(m.graph.scene().tangency).toEqual([]);
        m.scene('pole-polar-predict');
        act(() => { setLanguage('en'); });
        expect(status()).toBe('outside');
        expect(line('status')).toContain('lies outside the conic');
        expect(line('polar')).toContain('3x + 35y − 75 = 0');
        expect(line('tangency-1')).toContain(shownPoint(T1));
        m.scene('pole-polar-explore');
        expect(line('centre')).toContain('at infinity');
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('K3: the quoted points, lines and values are in the prose, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        for (const [id, e] of Object.entries(SCENES)) {
            const text = prose(stepOf(id), language);
            if (e.quotesP) expect(text, `${id} ${language} P`).toContain(`P=${pointTex(pointOf(e))}`);
            // The scene's text states each point of tangency it lists (the first four steps and the circle and parabola scenes quote them).
            if (id !== 'pole-polar-predict' && id !== 'pole-polar-polar' && id !== 'pole-polar-on') e.tangency.forEach((t, i) => expect(text, `${id} ${language} T${i + 1}`).toContain(`T_${i + 1}=${pointTex(t)}`));
            for (const quoted of e.quotedLines) expect(text, `${id} ${language} ${quoted.tex}`).toContain(quoted.tex);
        }
        const step = (id: string) => prose(stepOf(id), language);
        // Numbers of the regions.
        expect(step('pole-polar-predict')).toContain('\\tfrac1{25}+\\tfrac{441}{225}=2>1');
        expect(step('pole-polar-on')).toContain('\\tfrac{16}{25}+\\tfrac9{25}=1');
        expect(step('pole-polar-on')).toContain('\\tfrac1{25}+\\tfrac19=\\tfrac{34}{225}<1');
        expect(step('pole-polar-on')).toContain('9x+25y-225=0');
        // Residuals of the polar through T1 and T2.
        expect(step('pole-polar-polar')).toContain('\\tfrac4{25}+\\tfrac{21}{25}=1');
        expect(step('pole-polar-polar')).toContain('-\\tfrac3{25}+\\tfrac{28}{25}=1');
        // The polar of the point at infinity is a diameter through the centre; the parabola has no finite centre (acceptance 4 and 5).
        expect(step('pole-polar-infinity')).toContain('(1,0,0)');
        expect(step('pole-polar-infinity')).toContain('x=0');
        expect(step('pole-polar-explore')).toContain('(0,1)');
        expect(step('pole-polar-explore')).toMatch(language === 'sl' ? /končnega središča ni/ : /no finite centre/);
        // The theorem is stated with its source and the drag is called an illustration (never a proof).
        const theorem = lesson.formulaBlocks.find(block => block.id === 'pole-polar-polar')!.explanation[language];
        expect(theorem).toMatch(language === 'sl' ? /Izrek \(pol in polara\)[\s\S]*FMF[\s\S]*ilustracija/ : /Theorem \(pole and polar\)[\s\S]*FMF[\s\S]*illustration/);
        expect(step('pole-polar-polar')).toMatch(language === 'sl' ? /ilustrira, ne dokaže/ : /illustrates it and does not prove/);
        // Acceptance 6: no matura level is claimed for tangents.
        expect(JSON.stringify(lesson)).not.toMatch(/matur|4\.11/i);
    }
});

test('K3: every point a scene step quotes, in each text field separately, is that scene\'s point or point of tangency', () => {
    for (const language of ['sl', 'en'] as const) {
        for (const [id, e] of Object.entries(SCENES)) {
            const step = stepOf(id);
            const expected = new Map<string, string>();
            if ('at' in e.p) expected.set('P', pointTex(e.p.at));
            e.tangency.forEach((t, i) => expected.set(`T_${i + 1}`, pointTex(t)));
            let quoted = 0;
            for (const field of fields(step, language)) {
                for (const match of field.matchAll(/(?<![A-Za-z_])(P|T_[12])=(\([^()]*\))/g)) {
                    quoted += 1;
                    expect(match[2], `${id} ${language} ${match[1]}`).toBe(expected.get(match[1]));
                }
            }
            expect(quoted, `${id} ${language} quotes some point`).toBeGreaterThan(0);
        }
    }
});

test('K3: every quoted region or residual value, in each text field separately, has its exact result', () => {
    // Each left side the prose computes, and the only result it may be followed by (1/25 + 441/225 = 2, 16/25 + 9/25 = 1, ...).
    const values: readonly (readonly [string, string])[] = [
        ['\\tfrac1{25}+\\tfrac{441}{225}=', '2>1'],
        ['\\tfrac{16}{25}+\\tfrac9{25}=', '1'],
        ['\\tfrac1{25}+\\tfrac19=', '\\tfrac{34}{225}<1'],
        ['\\tfrac4{25}+\\tfrac{21}{25}=', '1'],
        ['-\\tfrac3{25}+\\tfrac{28}{25}=', '1'],
    ];
    for (const language of ['sl', 'en'] as const) {
        const seen = new Set<string>();
        for (const id of Object.keys(SCENES)) {
            for (const field of fields(stepOf(id), language)) {
                for (const [left, result] of values) {
                    for (let at = field.indexOf(left); at >= 0; at = field.indexOf(left, at + 1)) {
                        seen.add(left);
                        expect(field.slice(at + left.length, at + left.length + result.length), `${id} ${language} ${left}`).toBe(result);
                    }
                }
            }
        }
        expect([...seen].sort()).toEqual(values.map(([left]) => left).sort());
    }
});

test('K3: the strict scene operations refuse bad values and the other graphs\' operations', () => {
    const m = mount();
    try {
        const apply = (action: LessonAction) => () => m.capabilities.apply(action);
        expect(apply({kind: 'projective', operation: 'pole-polar-place', x: 51, y: 0})).toThrow();
        expect(apply({kind: 'projective', operation: 'pole-polar-set-direction', dx: 0, dy: 0})).toThrow();
        expect(apply({kind: 'projective', operation: 'move-handle', handle: 0, x: 1})).toThrow();
        expect(apply({kind: 'projective', operation: 'pascal-set-conic', conic: 'ellipse'})).toThrow();
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

