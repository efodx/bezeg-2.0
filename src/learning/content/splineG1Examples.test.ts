import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {splineGuidedLessons} from './splineGuidedLessons';
import {G1QuadraticBezierSpline} from '../../bezeg/impl/curve/G1QuadraticBezierSpline';
import {G1SymmetricQuadraticBezierSpline} from '../../bezeg/impl/curve/G1SymmetricQuadraticBezierSpline';
import {BezierSpline} from '../../bezeg/impl/curve/bezier-spline';
import {PointImpl} from '../../bezeg/impl/point/point-impl';

/**
 * Task 04 part (c): the lesson-fixture scenes of spline-g1 and spline-g1-symmetric.
 * Fixtures are read from the raw lesson content (the adapted lessons are checked to carry them) and built with the repo's pure spline classes.
 * The ratio of a scene is the fixture's splineRatios with its later set-spline-beta actions applied.
 * G1 is only tangent-direction continuous, so joints are checked by direction (cross product), not by equal derivatives.
 */

type Pt = number[];
type Id = 'spline-g1' | 'spline-g1-symmetric';
type Fixture = {id: Id; sceneId: string; points: Pt[]; ratios: number[]; view: number[]};

const IDS: Id[] = ['spline-g1', 'spline-g1-symmetric'];

function fixturesOf(id: Id): Fixture[] {
    const raw = splineGuidedLessons.find(l => l.demonstrationId === id)!;
    const result: Fixture[] = [];
    for (const step of raw.steps) {
        const scene: any = step.scene;
        if (scene?.basedOn !== 'lesson-fixture') continue;
        const ratios: number[] = [...scene.curve.splineRatios];
        for (const action of scene.actions ?? []) if (action.name === 'set-spline-beta') ratios[action.value.index] = action.value.value;
        result.push({id, sceneId: scene.id, points: scene.curve.points.map((p: Pt) => [p[0], p[1]]), ratios, view: scene.view});
    }
    return result;
}

const model = (points: Pt[]) => points.map(([x, y]) => new PointImpl(x, y));
function build(f: {id: Id; points: Pt[]; ratios: number[]}, points = f.points, ratios = f.ratios): BezierSpline {
    const spline = f.id === 'spline-g1' ? new G1QuadraticBezierSpline(model(points)) : new G1SymmetricQuadraticBezierSpline(model(points));
    ratios.forEach((value, i) => (spline as any).setB(i, value));
    return spline;
}
const pieces = (s: BezierSpline): Pt[][] => s.getUnderlyingCurves().map(c => c.getPoints().map(p => [p.X(), p.Y()]));
const derived = (s: BezierSpline): Pt[] => s.getNonFreePoints().map(p => [p.X(), p.Y()]);
const spans = (s: BezierSpline): number[] => {
    const u: number[] = (s as any).getU();
    return u.slice(1).map((v, i) => v - u[i]);
};
const norm = (v: Pt) => Math.hypot(v[0], v[1]);
const cross = (a: Pt, b: Pt) => a[0] * b[1] - a[1] * b[0];
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const closePt = (a: Pt, b: Pt, d = 9) => { expect(a).toHaveLength(2); expect(a[0]).toBeCloseTo(b[0], d); expect(a[1]).toBeCloseTo(b[1], d); };
/** First derivative with respect to the global parameter at the end of piece j and the start of piece j+1. */
function jointDerivatives(s: BezierSpline, j: number): [Pt, Pt] {
    const all = pieces(s), sp = spans(s);
    const left = all[j], right = all[j + 1];
    const n = left.length - 1;
    return [
        [n * (left[n][0] - left[n - 1][0]) / sp[j], n * (left[n][1] - left[n - 1][1]) / sp[j]],
        [n * (right[1][0] - right[0][0]) / sp[j + 1], n * (right[1][1] - right[0][1]) / sp[j + 1]],
    ];
}
const changed = (f: Fixture, edit: (points: Pt[], ratios: number[]) => void): boolean[] => {
    const before = pieces(build(f));
    const points = f.points.map(p => [...p]), ratios = [...f.ratios];
    edit(points, ratios);
    return pieces(build(f, points, ratios)).map((piece, i) => JSON.stringify(piece) !== JSON.stringify(before[i]));
};
const move = (index: number) => (points: Pt[]) => { points[index] = [points[index][0] + 0.5, points[index][1] - 0.4]; };
const bump = (index: number, to: number) => (_points: Pt[], ratios: number[]) => { ratios[index] = to; };

/** What the lesson prose and the construction promise for each fixture scene. */
const EXPECT: Record<string, {free: number; ratios: number[]; derived: Pt[]; joints: Pt[]; moved: Record<number, boolean[]>; bumped: Record<number, boolean[]>}> = {
    'g1-default-labelled': {free: 4, ratios: [1], derived: [[2, -2]], joints: [[0, 0]], moved: {0: [true, false], 1: [true, true], 2: [true, true], 3: [false, true]}, bumped: {0: [false, true]}},
    'g1-condition-polygon': {free: 4, ratios: [1], derived: [[2, -2]], joints: [[0, 0]], moved: {}, bumped: {}},
    'g1-b-quarter': {free: 4, ratios: [0.25], derived: [[0.5, -0.5]], joints: [[0, 0]], moved: {}, bumped: {}},
    'g1-b-two-and-half': {free: 4, ratios: [2.5], derived: [[5, -5]], joints: [[0, 0]], moved: {}, bumped: {}},
    'g1-chain-quarter': {
        free: 5, ratios: [0.25, 1], derived: [[-0.5, -0.5], [4.5, -1.5]], joints: [[-1, 0], [2, -1]],
        moved: {0: [true, false, false], 1: [true, true, true], 2: [true, true, true], 3: [false, true, true], 4: [false, false, true]},
        bumped: {0: [false, true, true], 1: [false, false, true]},
    },
    'g1s-default-polygon': {free: 4, ratios: [0.5], derived: [[0, 1]], joints: [[0, 1]], moved: {0: [true, false], 1: [true, true], 2: [true, true], 3: [false, true]}, bumped: {0: [true, true]}},
    'g1s-beta-quarter': {free: 4, ratios: [0.25], derived: [[-1, 1.5]], joints: [[-1, 1.5]], moved: {}, bumped: {}},
    'g1s-beta-three-quarters': {free: 4, ratios: [0.75], derived: [[1, 0.5]], joints: [[1, 0.5]], moved: {}, bumped: {}},
    'g1s-beta-upper-limit': {free: 4, ratios: [0.99], derived: [[1.96, 0.02]], joints: [[1.96, 0.02]], moved: {}, bumped: {}},
};

/** The free points each scene must carry (the same quadruple across the one-sided scenes; the symmetric ones share another). */
const G1_POINTS: Pt[] = [[-4, -1], [-2, 2], [0, 0], [4, -1]];
const G1_CHAIN_POINTS: Pt[] = [[-5, -1], [-3, 2], [-1, 0], [2, -1], [5, 2]];
const G1S_POINTS: Pt[] = [[-5, -1], [-2, 2], [2, 0], [5, 3]];
const POINTS: Record<string, Pt[]> = {
    'g1-default-labelled': G1_POINTS, 'g1-condition-polygon': G1_POINTS, 'g1-b-quarter': G1_POINTS, 'g1-b-two-and-half': G1_POINTS,
    'g1-chain-quarter': G1_CHAIN_POINTS,
    'g1s-default-polygon': G1S_POINTS, 'g1s-beta-quarter': G1S_POINTS, 'g1s-beta-three-quarters': G1S_POINTS, 'g1s-beta-upper-limit': G1S_POINTS,
};

const all = IDS.flatMap(id => fixturesOf(id));

test('the adapted G1 lessons expose exactly the expected fixture scenes (the neighbours step stays on the route default)', () => {
    expect(all.map(f => f.sceneId).sort()).toEqual(Object.keys(EXPECT).sort());
    expect(stepOf('spline-g1-symmetric', 'g1s-second-beta').scene!.basedOn).toBe('demonstration-default');
    for (const id of IDS) {
        const rawSteps = splineGuidedLessons.find(l => l.demonstrationId === id)!.steps;
        const adapted = getLessonForDemonstration(id)!.steps;
        expect(adapted).toHaveLength(rawSteps.length);
        rawSteps.forEach((step, i) => {
            if (step.scene?.basedOn === 'lesson-fixture') expect((adapted[i].scene as any)?.actions?.[0]?.source).toBe('lesson-fixture');
        });
    }
});

describe.each(all)('$id / $sceneId', fixture => {
    const want = EXPECT[fixture.sceneId];
    const symmetric = fixture.id === 'spline-g1-symmetric';
    const spline = () => build(fixture);
    const bRange = symmetric ? [0.01, 0.99] : [0.01, 3];

    test('free points, ratio count and range, piece count, derived points and uniform spans', () => {
        const s = spline();
        expect(fixture.points).toHaveLength(want.free);
        expect(fixture.points).toEqual(POINTS[fixture.sceneId]);
        expect(fixture.ratios).toEqual(want.ratios);
        expect(fixture.ratios).toHaveLength(want.free - 3);
        fixture.ratios.forEach(b => { expect(b).toBeGreaterThanOrEqual(bRange[0]); expect(b).toBeLessThanOrEqual(bRange[1]); });
        expect(pieces(s)).toHaveLength(want.free - 2);
        spans(s).forEach(span => expect(span).toBeCloseTo(1 / (want.free - 2), 12));
        const d = derived(s);
        expect(d).toHaveLength(want.derived.length);
        want.derived.forEach((p, i) => closePt(d[i], p));
    });

    test('joints are the stated points', () => {
        const p = pieces(spline());
        want.joints.forEach((joint, j) => closePt(p[j][p[j].length - 1], joint));
        want.joints.forEach((joint, j) => closePt(p[j + 1][0], joint));
    });

    test('tangent direction is equal and nonzero at every joint; derivative ratio is b (or (1-beta)/beta); C1 only at ratio 1', () => {
        const s = spline();
        fixture.ratios.forEach((b, j) => {
            const [left, right] = jointDerivatives(s, j);
            expect(norm(left)).toBeGreaterThan(0.1);
            expect(norm(right)).toBeGreaterThan(0.1);
            expect(cross(left, right)).toBeCloseTo(0, 8);
            expect(dot(left, right)).toBeGreaterThan(0);
            const ratio = symmetric ? (1 - b) / b : b;
            expect(norm(right) / norm(left)).toBeCloseTo(ratio, 10);
            expect(Math.abs(norm(right) - norm(left)) < 1e-9).toBe(ratio === 1);
        });
    });

    test('the polyline p_{l} J p_{l+1} (symmetric) or p_{l-1} p_l q (one-sided) is collinear at each joint', () => {
        const s = spline(), p = pieces(s);
        fixture.ratios.forEach((_, j) => {
            const [a, b] = [p[j][p[j].length - 2], p[j + 1][1]], joint = p[j][p[j].length - 1];
            expect(cross([joint[0] - a[0], joint[1] - a[1]], [b[0] - joint[0], b[1] - joint[1]])).toBeCloseTo(0, 9);
        });
    });

    test('locality and propagation: moving a free point or editing a ratio changes exactly the stated pieces', () => {
        for (const [index, flags] of Object.entries(want.moved)) expect(changed(fixture, move(Number(index)))).toEqual(flags);
        for (const [index, flags] of Object.entries(want.bumped)) {
            const to = symmetric ? 0.4 : 1.7;
            expect(changed(fixture, bump(Number(index), to))).toEqual(flags);
        }
    });

    test('every free and derived point, and every joint, lies inside the view box', () => {
        const [xmin, ymax, xmax, ymin] = fixture.view;
        expect(xmin).toBeLessThan(xmax);
        expect(ymin).toBeLessThan(ymax);
        const joints = pieces(spline()).flatMap(piece => [piece[0], piece[piece.length - 1]]);
        for (const p of [...fixture.points, ...derived(spline()), ...joints]) {
            expect(p[0]).toBeGreaterThan(xmin);
            expect(p[0]).toBeLessThan(xmax);
            expect(p[1]).toBeGreaterThan(ymin);
            expect(p[1]).toBeLessThan(ymax);
        }
    });
});

test('one-sided slider extremes keep the derived point in the view of the large-b scene (b = 3 is the slider maximum)', () => {
    const f = all.find(x => x.sceneId === 'g1-b-two-and-half')!;
    const q = derived(build(f, f.points, [3]))[0];
    closePt(q, [6, -6]);
    expect(q[0]).toBeLessThan(f.view[2]);
    expect(q[1]).toBeGreaterThan(f.view[3]);
});

// ---------------------------------------------------------------------------------------------
// prose numbers, both languages
// ---------------------------------------------------------------------------------------------

const num = (value: number, lang: 'sl' | 'en', digits = 9) => {
    const t = String(Number(value.toFixed(digits)));
    return lang === 'sl' ? t.replace('.', '{,}') : t;
};
const pt = (p: Pt, lang: 'sl' | 'en') => lang === 'sl' ? `(${num(p[0], lang)};\\ ${num(p[1], lang)})` : `(${num(p[0], lang)},\\ ${num(p[1], lang)})`;
const count = (n: number) => `\\(${n}\\)`;
const stepOf = (id: Id, sceneId: string) => splineGuidedLessons.find(l => l.demonstrationId === id)!.steps.find(s => s.scene?.id === sceneId)!;
const proseOf = (id: Id, sceneId: string, lang: 'sl' | 'en') => {
    const step = stepOf(id, sceneId);
    return [step.explanation[lang], ...step.expectedObservations.map(o => o[lang]), step.scene!.expectedState[lang]].join('\n');
};
const fx = (sceneId: string) => all.find(x => x.sceneId === sceneId)!;
/** Derivatives at joint j of a scene, as the prose must quote them. */
const derivs = (sceneId: string, j = 0) => jointDerivatives(build(fx(sceneId)), j);

describe.each(['sl', 'en'] as const)('prose numbers (%s)', lang => {
    const mentions: [Id, string, Pt[]][] = [
        ['spline-g1', 'g1-default-labelled', [[-4, -1], [-2, 2], [0, 0], [4, -1], [2, -2]]],
        ['spline-g1', 'g1-condition-polygon', [[2, -2]]],
        ['spline-g1', 'g1-b-quarter', [[0.5, -0.5]]],
        ['spline-g1', 'g1-b-two-and-half', [[5, -5]]],
        ['spline-g1', 'g1-chain-quarter', [[-0.5, -0.5], [4.5, -1.5], [1, -2], [3, 0]]],
        ['spline-g1-symmetric', 'g1s-default-polygon', [[-5, -1], [-2, 2], [2, 0], [5, 3], [0, 1]]],
        ['spline-g1-symmetric', 'g1s-beta-quarter', [[-1, 1.5]]],
        ['spline-g1-symmetric', 'g1s-beta-three-quarters', [[1, 0.5]]],
        ['spline-g1-symmetric', 'g1s-beta-upper-limit', [[1.96, 0.02]]],
    ];
    test.each(mentions)('%s %s: stated points appear in the prose', (id, sceneId, points) => {
        const text = proseOf(id, sceneId, lang);
        for (const p of points) expect(text).toContain(pt(p, lang));
    });

    test('quoted derivatives match the construction (direction vs size under the actual spans)', () => {
        const quoted: [Id, string, number, Pt[]][] = [
            ['spline-g1', 'g1-b-quarter', 0, [derivs('g1-b-quarter')[0], derivs('g1-b-quarter')[1]]],
            ['spline-g1', 'g1-b-two-and-half', 0, [derivs('g1-b-two-and-half')[0], derivs('g1-b-two-and-half')[1]]],
            ['spline-g1', 'g1-chain-quarter', 1, [[6, 6], derivs('g1-chain-quarter', 1)[0]]],
            ['spline-g1-symmetric', 'g1s-default-polygon', 0, [derivs('g1s-default-polygon')[0]]],
            ['spline-g1-symmetric', 'g1s-beta-quarter', 0, [derivs('g1s-beta-quarter')[0], derivs('g1s-beta-quarter')[1]]],
            ['spline-g1-symmetric', 'g1s-beta-three-quarters', 0, [derivs('g1s-beta-three-quarters')[0], derivs('g1s-beta-three-quarters')[1]]],
            ['spline-g1-symmetric', 'g1s-beta-upper-limit', 0, [derivs('g1s-beta-upper-limit')[0], derivs('g1s-beta-upper-limit')[1]]],
        ];
        for (const [id, sceneId, , vectors] of quoted) {
            const text = stepOf(id, sceneId).explanation[lang];
            for (const v of vectors) expect(text).toContain(pt(v, lang));
        }
        // The chain's second joint: derivative turns from (6, 6) to the value of the edited spline, equal on both sides.
        const [l, r] = derivs('g1-chain-quarter', 1);
        closePt(l, r);
        closePt(l, [15, -3]);
        // Baseline (b_1 = 1) of the chain, as quoted: q_1 = (1, -2), q_2 = (3, 0).
        const base = build(fx('g1-chain-quarter'), fx('g1-chain-quarter').points, [1, 1]);
        closePt(derived(base)[0], [1, -2]);
        closePt(derived(base)[1], [3, 0]);
        closePt(jointDerivatives(base, 1)[0], [6, 6]);
    });

    test('stated counts match the construction', () => {
        const obs = (id: Id, sceneId: string) => stepOf(id, sceneId).expectedObservations.map(o => o[lang]).join('\n');
        const one = build(fx('g1-default-labelled'));
        for (const n of [fx('g1-default-labelled').points.length, pieces(one).length, pieces(one).length - 1]) expect(proseOf('spline-g1', 'g1-default-labelled', lang)).toContain(count(n));
        const chain = build(fx('g1-chain-quarter'));
        for (const n of [fx('g1-chain-quarter').points.length, pieces(chain).length, pieces(chain).length - 1]) expect(stepOf('spline-g1', 'g1-chain-quarter').explanation[lang]).toContain(count(n));
        const sym = build(fx('g1s-default-polygon'));
        for (const n of [fx('g1s-default-polygon').points.length, pieces(sym).length]) expect(stepOf('spline-g1-symmetric', 'g1s-default-polygon').explanation[lang]).toContain(count(n));
        expect(obs('spline-g1-symmetric', 'g1s-default-polygon')).toContain(count(pieces(sym).length));
    });

    test('quoted ratios and norms match the construction', () => {
        const small = derivs('g1-b-quarter'), large = derivs('g1-b-two-and-half');
        const sm = stepOf('spline-g1', 'g1-b-quarter').explanation[lang];
        const q = (v: Pt) => num(norm(v), lang, 2);
        expect(norm(small[1])).toBeCloseTo(2 * Math.SQRT2, 10);
        expect(norm(small[0])).toBeCloseTo(8 * Math.SQRT2, 10);
        expect(norm(large[1])).toBeCloseTo(20 * Math.SQRT2, 10);
        expect(sm).toContain(`\\(2\\sqrt2\\approx${q(small[1])}\\)`);
        expect(sm).toContain(`\\(8\\sqrt2\\approx${q(small[0])}\\)`);
        const lg = stepOf('spline-g1', 'g1-b-two-and-half').explanation[lang];
        expect(lg).toContain(`\\(20\\sqrt2\\approx${q(large[1])}\\)`);
        expect(lg).toContain(`\\(8\\sqrt2\\approx${q(large[0])}\\)`);
        expect(stepOf('spline-g1-symmetric', 'g1s-beta-three-quarters').explanation[lang]).toContain('\\tfrac13');
        expect(stepOf('spline-g1-symmetric', 'g1s-beta-quarter').explanation[lang]).toContain(lang === 'sl' ? 'trikrat večji' : 'three times larger');
        const [l, r] = derivs('g1s-beta-upper-limit');
        expect(norm(r) / norm(l)).toBeCloseTo(1 / 99, 12);
    });
});
