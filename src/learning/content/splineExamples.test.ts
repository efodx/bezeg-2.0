import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {splineGuidedLessons} from './splineGuidedLessons';
import {GenericBezierSpline} from '../../bezeg/impl/curve/GenericBezierSpline';
import {C1QuadraticBezierSpline} from '../../bezeg/impl/curve/C1QuadraticBezierSpline';
import {C2CubicBezierSpline} from '../../bezeg/impl/curve/C2CubicBezierSpline';
import {BezierSpline} from '../../bezeg/impl/curve/bezier-spline';
import {PointImpl} from '../../bezeg/impl/point/point-impl';

/**
 * Task 04 part (a): the lesson-fixture scenes of spline-cn, spline-c1 and spline-c2.
 * Fixtures are read from the adapted lessons (what the app serves), then built with the repo's
 * pure spline classes. Prose numbers are checked in both languages.
 */

type Pt = number[];
type Fixture = {sceneId: string; points: Pt[]; degree: number; continuity: number; view: number[]; kind: 'cn' | 'c1' | 'c2'};

const KIND = {'spline-cn': 'cn', 'spline-c1': 'c1', 'spline-c2': 'c2'} as const;
type Id = keyof typeof KIND;
const IDS = Object.keys(KIND) as Id[];

function fixturesOf(id: Id): Fixture[] {
    const lesson = getLessonForDemonstration(id);
    expect(lesson).toBeDefined();
    const result: Fixture[] = [];
    for (const step of lesson!.steps) {
        const action: any = step.scene?.actions[0];
        if (action?.source !== 'lesson-fixture') continue;
        const curve = action.curve;
        const kind = KIND[id];
        result.push({
            sceneId: action.sceneId,
            points: curve.points.map((p: Pt) => [p[0], p[1]]),
            degree: kind === 'c2' ? 3 : curve.degree ?? 2,
            continuity: kind === 'c2' ? 2 : kind === 'c1' ? 1 : curve.continuity ?? 1,
            view: action.view,
            kind,
        });
    }
    return result;
}

const model = (points: Pt[]) => points.map(([x, y]) => new PointImpl(x, y));
function build(f: {kind: string; points: Pt[]; degree: number; continuity: number}, points = f.points): BezierSpline {
    if (f.kind === 'c1') return new C1QuadraticBezierSpline(model(points));
    if (f.kind === 'c2') return new C2CubicBezierSpline(model(points));
    return new GenericBezierSpline(model(points), f.degree, f.continuity);
}
const pieces = (s: BezierSpline): Pt[][] => s.getUnderlyingCurves().map(c => c.getPoints().map(p => [p.X(), p.Y()]));
const derived = (s: BezierSpline): Pt[] => s.getNonFreePoints().map(p => [p.X(), p.Y()]);
const spans = (s: BezierSpline): number[] => {
    const u: number[] = (s as any).getU();
    return u.slice(1).map((v, i) => v - u[i]);
};
const norm = (v: Pt) => Math.hypot(v[0], v[1]);
const sub = (a: Pt, b: Pt) => [a[0] - b[0], a[1] - b[1]];
const closePt = (a: Pt, b: Pt, d = 9) => { expect(a).toHaveLength(2); expect(a[0]).toBeCloseTo(b[0], d); expect(a[1]).toBeCloseTo(b[1], d); };
const binom = (n: number, k: number): number => k === 0 ? 1 : binom(n, k - 1) * (n - k + 1) / k;
const fall = (n: number, k: number) => { let r = 1; for (let i = 0; i < k; i++) r *= n - i; return r; };
/** k-th derivative with respect to the global parameter at a piece end (span = parameter interval of the piece). */
function derivative(points: Pt[], k: number, span: number, atEnd: boolean): Pt {
    const n = points.length - 1, first = atEnd ? n - k : 0, out = [0, 0];
    for (let j = 0; j <= k; j++) {
        const sign = (k - j) % 2 === 0 ? 1 : -1;
        for (let d = 0; d < 2; d++) out[d] += sign * binom(k, j) * points[first + j][d];
    }
    return out.map(v => v * fall(n, k) / span ** k);
}
/** Distance between the k-th derivatives of the two pieces meeting at junction j (k = 0: positions). */
function gap(s: BezierSpline, j: number, k: number): number {
    const all = pieces(s), sp = spans(s);
    return norm(sub(k === 0 ? all[j][all[j].length - 1] : derivative(all[j], k, sp[j], true), k === 0 ? all[j + 1][0] : derivative(all[j + 1], k, sp[j + 1], false)));
}
const changed = (f: Fixture, index: number): boolean[] => {
    const before = pieces(build(f));
    const moved = f.points.map(p => [...p]);
    moved[index] = [moved[index][0] + 0.5, moved[index][1] - 0.4];
    return pieces(build(f, moved)).map((piece, i) => JSON.stringify(piece) !== JSON.stringify(before[i]));
};

/** What the lesson prose and the construction promise for each fixture scene. */
const EXPECT: Record<string, {pieces: number; derived: Pt[]; free: number; knots?: number[]; joints: Pt[]; local: Record<number, boolean[]>}> = {
    'cn-two-pieces-labelled': {pieces: 2, free: 4, derived: [[2, -4]], joints: [[0, -3]], local: {0: [true, false], 1: [true, true], 2: [true, true], 3: [false, true]}},
    'cn-extrapolation-polygon': {pieces: 2, free: 4, derived: [[2, -4]], joints: [[0, -3]], local: {0: [true, false], 3: [false, true]}},
    'cn-degree-three-continuity-two': {pieces: 2, free: 5, derived: [[2, 0], [4, -3]], joints: [[0, 1]], local: {0: [true, false], 1: [true, true], 4: [false, true]}},
    'cn-limitation-amplified': {pieces: 4, free: 7, derived: [[0.5, -3], [4, -3.5], [-3, 3.5], [-13.5, 11], [18.5, -8], [61, -34.5]], joints: [[-1.5, -2], [0.5, 0], [2.5, 1.5]], local: {0: [true, false, false, false], 1: [true, true, true, true], 6: [false, false, false, true]}},
    'c1-default-labelled': {pieces: 2, free: 4, derived: [[0, 2]], joints: [[0, 2]], local: {0: [true, false], 1: [true, true], 2: [true, true], 3: [false, true]}},
    'c1-midpoint-polygon': {pieces: 2, free: 4, derived: [[0, 2]], joints: [[0, 2]], local: {0: [true, false], 3: [false, true]}},
    'c1-tangent-polygon': {pieces: 2, free: 4, derived: [[0, 2]], joints: [[0, 2]], local: {0: [true, false], 3: [false, true]}},
    'c1-not-c2-hidden': {pieces: 2, free: 4, derived: [[0, 2]], joints: [[0, 2]], local: {0: [true, false], 3: [false, true]}},
    'c2-default-labelled': {pieces: 3, free: 6, derived: [[-4, 0], [-2.5, -1], [-1, -2], [1, -1], [2.5, 0], [4, 1]], joints: [[-2.5, -1], [2.5, 0]], local: {0: [true, false, false], 1: [true, true, false], 2: [true, true, true], 3: [true, true, true], 5: [false, false, true]}},
    'c2-thirds-polygon': {pieces: 3, free: 6, derived: [[-4, 0], [-2.5, -1], [-1, -2], [1, -1], [2.5, 0], [4, 1]], joints: [[-2.5, -1], [2.5, 0]], local: {}},
    'c2-joint-polygon': {pieces: 3, free: 6, derived: [[-4, 0], [-2.5, -1], [-1, -2], [1, -1], [2.5, 0], [4, 1]], joints: [[-2.5, -1], [2.5, 0]], local: {}},
};

const all = IDS.flatMap(id => fixturesOf(id).map(f => ({id, ...f})));

test('the adapted lessons expose exactly the expected fixture scenes', () => {
    expect(all.map(f => f.sceneId).sort()).toEqual(Object.keys(EXPECT).sort());
});

describe.each(all)('$id / $sceneId', fixture => {
    const want = EXPECT[fixture.sceneId];
    const spline = () => build(fixture);

    test('piece count, free points, derived points and uniform knots', () => {
        const s = spline();
        expect(fixture.points).toHaveLength(want.free);
        expect(pieces(s)).toHaveLength(want.pieces);
        const d = derived(s);
        if (fixture.kind === 'cn') {
            expect(d).toHaveLength(want.derived.length);
            want.derived.forEach((p, i) => closePt(d[i], p));
        } else {
            // c1 and c2 list every derived point; compare as a set of coordinates.
            want.derived.forEach(p => expect(d.some(q => Math.abs(q[0] - p[0]) < 1e-9 && Math.abs(q[1] - p[1]) < 1e-9)).toBe(true));
        }
        spans(s).forEach(span => expect(span).toBeCloseTo(1 / want.pieces, 12));
        pieces(s).forEach(piece => expect(piece).toHaveLength(fixture.kind === 'c1' ? 3 : fixture.degree + 1));
    });

    test('joints are the stated points', () => {
        const all = pieces(spline());
        want.joints.forEach((joint, j) => closePt(all[j][all[j].length - 1], joint));
    });

    test('C0 up to C^r holds at every joint (with parameter interval scaling) and C^(r+1) fails somewhere', () => {
        const s = spline();
        for (let j = 0; j < pieces(s).length - 1; j++) {
            for (let k = 0; k <= fixture.continuity; k++) expect(gap(s, j, k)).toBeLessThan(1e-8);
        }
        const next = Array.from({length: pieces(s).length - 1}, (_, j) => gap(s, j, fixture.continuity + 1));
        expect(Math.max(...next)).toBeGreaterThan(1e-3);
    });

    test('the tangent at every joint is nonzero', () => {
        const s = spline(), all = pieces(s), sp = spans(s);
        for (let j = 0; j < all.length - 1; j++) {
            expect(norm(derivative(all[j], 1, sp[j], true))).toBeGreaterThan(0.5);
            expect(norm(derivative(all[j + 1], 1, sp[j + 1], false))).toBeGreaterThan(0.5);
        }
    });

    test('locality: moving a free point changes exactly the stated pieces', () => {
        for (const [index, flags] of Object.entries(want.local)) expect(changed(fixture, Number(index))).toEqual(flags);
    });

    test('every free and derived point lies inside the view box', () => {
        const [xmin, ymax, xmax, ymin] = fixture.view;
        expect(xmin).toBeLessThan(xmax);
        expect(ymin).toBeLessThan(ymax);
        for (const p of [...fixture.points, ...derived(spline())]) {
            expect(p[0]).toBeGreaterThan(xmin);
            expect(p[0]).toBeLessThan(xmax);
            expect(p[1]).toBeGreaterThan(ymin);
            expect(p[1]).toBeLessThan(ymax);
        }
    });
});

// ---------------------------------------------------------------------------------------------
// prose numbers, both languages
// ---------------------------------------------------------------------------------------------

const num = (value: number, lang: 'sl' | 'en') => {
    const t = String(value);
    return lang === 'sl' ? t.replace('.', '{,}') : t;
};
const pt = (p: Pt, lang: 'sl' | 'en') => lang === 'sl' ? `(${num(p[0], lang)};\\ ${num(p[1], lang)})` : `(${num(p[0], lang)},\\ ${num(p[1], lang)})`;
const count = (n: number) => `\\(${n}\\)`;
const stepOf = (id: Id, sceneId: string) => splineGuidedLessons.find(l => l.demonstrationId === id)!.steps.find(s => s.scene?.id === sceneId)!;
const proseOf = (id: Id, sceneId: string, lang: 'sl' | 'en') => {
    const step = stepOf(id, sceneId);
    return [step.explanation[lang], ...step.expectedObservations.map(o => o[lang]), step.scene!.expectedState[lang]].join('\n');
};

describe.each(['sl', 'en'] as const)('prose numbers (%s)', lang => {
    const mentions: [Id, string, Pt[]][] = [
        ['spline-cn', 'cn-two-pieces-labelled', [[0, -3], [2, -4]]],
        ['spline-cn', 'cn-extrapolation-polygon', [[-2, -2], [0, -3], [2, -4]]],
        ['spline-cn', 'cn-degree-three-continuity-two', [[0, 1], [2, 0], [4, -3]]],
        ['spline-cn', 'cn-limitation-amplified', [[61, -34.5]]],
        ['spline-c1', 'c1-default-labelled', [[0, 2]]],
        ['spline-c1', 'c1-midpoint-polygon', [[0, 2], [-2, 2], [2, 2]]],
        ['spline-c1', 'c1-not-c2-hidden', [[0, 2], [0, -4], [-1, -3]]],
        ['spline-c2', 'c2-thirds-polygon', [[-1, -2], [1, -1]]],
        ['spline-c2', 'c2-joint-polygon', [[-2.5, -1], [-4, 0], [-1, -2], [2.5, 0], [1, -1], [4, 1]]],
    ];
    test.each(mentions)('%s %s: stated points appear in the prose', (id, sceneId, points) => {
        const text = proseOf(id, sceneId, lang);
        for (const p of points) expect(text).toContain(pt(p, lang));
    });

    test('stated counts match the construction', () => {
        const f = (sceneId: string) => all.find(x => x.sceneId === sceneId)!;
        const obs = (id: Id, sceneId: string) => stepOf(id, sceneId).expectedObservations.map(o => o[lang]).join('\n');
        const cnPieces = build(f('cn-two-pieces-labelled'));
        expect(obs('spline-cn', 'cn-two-pieces-labelled')).toContain(count(pieces(cnPieces).length));
        expect(obs('spline-cn', 'cn-two-pieces-labelled')).toContain(count(f('cn-two-pieces-labelled').points.length));
        const cn3 = build(f('cn-degree-three-continuity-two'));
        expect(obs('spline-cn', 'cn-degree-three-continuity-two')).toContain(count(pieces(cn3).length));
        expect(obs('spline-cn', 'cn-degree-three-continuity-two')).toContain(count(derived(cn3).length));
        const lim = build(f('cn-limitation-amplified'));
        const limState = stepOf('spline-cn', 'cn-limitation-amplified').scene!.expectedState[lang];
        for (const n of [f('cn-limitation-amplified').points.length, pieces(lim).length, derived(lim).length]) expect(limState).toContain(count(n));
        const c2 = build(f('c2-default-labelled'));
        const c2Obs = obs('spline-c2', 'c2-default-labelled');
        for (const n of [pieces(c2).length, derived(c2).length, f('c2-default-labelled').points.length]) expect(c2Obs).toContain(count(n));
        expect(obs('spline-c1', 'c1-default-labelled')).toContain(count(pieces(build(f('c1-default-labelled'))).length));
    });
});

test('cn-limitation: derived distances by piece match the quoted 5 / 17 / 70 and free points stay within 4.5', () => {
    const f = all.find(x => x.sceneId === 'cn-limitation-amplified')!;
    const s = build(f), d = derived(s).map(norm);
    expect(Math.max(...d.slice(0, 2))).toBeCloseTo(5, 0);
    expect(Math.round(Math.max(...d.slice(2, 4)))).toBe(17);
    expect(Math.round(Math.max(...d.slice(4, 6)))).toBe(70);
    const farthestFree = Math.max(...f.points.map(norm));
    expect(farthestFree).toBeLessThanOrEqual(4.5);
    expect(farthestFree).toBeGreaterThan(4.4);
    expect(f.view[2] - f.view[0]).toBe(90);
    for (const lang of ['sl', 'en'] as const) {
        const text = stepOf('spline-cn', 'cn-limitation-amplified').explanation[lang];
        expect(text).toContain(lang === 'sl' ? '4{,}5' : '4.5');
        for (const n of [5, 17, 70]) expect(text).toContain(count(n));
    }
});

test('second differences claimed by the examples: cn degree 3 at (0,1), c1 at (0,2), c2 equal at the first joint', () => {
    const second = (piece: Pt[], atEnd: boolean) => {
        const [a, b, c] = atEnd ? [piece.at(-1)!, piece.at(-2)!, piece.at(-3)!] : [piece[0], piece[1], piece[2]];
        return [a[0] - 2 * b[0] + c[0], a[1] - 2 * b[1] + c[1]];
    };
    const f = (id: string) => all.find(x => x.sceneId === id)!;
    const cn3 = pieces(build(f('cn-degree-three-continuity-two')));
    closePt(second(cn3[0], true), [0, -2]); closePt(second(cn3[1], false), [0, -2]);
    const c1 = pieces(build(f('c1-not-c2-hidden')));
    closePt(second(c1[0], true), [0, -4]); closePt(second(c1[1], false), [-1, -3]);
    const c2 = pieces(build(f('c2-joint-polygon')));
    closePt(second(c2[0], true), second(c2[1], false));
    closePt(second(c2[0], true), [0.5, 2]);
});
