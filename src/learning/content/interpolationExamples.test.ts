/**
 * Mathematical checks for the interpolation-family lesson examples (task 01, part b):
 * decasteljau-alternative, affine, and elevation.
 *
 * Expected values come from an independent Bernstein form, a hand-written De Casteljau recurrence and hand-written
 * rotation/scale about stated centres in this file; the repository's `PolynomialBezierCurve` (eval, elevate, moveFor,
 * rotate, scale) and `elevatedControlPoints` are compared against them. The lesson content, read through the real
 * lesson adapter, must carry the same control points, parameters and prose numbers, and every control point (also
 * after each transform) must lie inside the scene's starting view.
 */
import {PolynomialBezierCurve} from '../../bezeg/impl/curve/polynomial-bezier-curve';
import {PointImpl} from '../../bezeg/impl/point/point-impl';
import {elevatedControlPoints} from '../../graphs/curves/object/AbstractJXGBezierCurve';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {additionalGuidedLessons} from './additionalGuidedLessons';
import {expansionGuidedLessons} from './expansionGuidedLessons';
import {rationalConstructionGuidedLessons} from './rationalConstructionGuidedLessons';
import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../model';

type Vec = readonly [number, number];

const ALT_CUBIC: Vec[] = [[-4, -2], [-2, 4], [2, 2], [4, -2]];
const AFFINE_CUBIC: Vec[] = [[1, 0], [2, 3], [4, 2], [5, -1]];
const ELEVATION_CUBIC: Vec[] = [[-4, -2], [-3, 3], [2, 3], [3, -2]];
/** The elevation lesson scenes set no view, so the board default of BaseGraph ([-5, 5, 5, -5]) applies. */
const ELEVATION_DEFAULT_VIEW: LessonViewBox = [-5, 5, 5, -5];

// ---- independent references ----
const binom = (n: number, k: number): number => (k === 0 || k === n ? 1 : binom(n - 1, k - 1) + binom(n - 1, k));

function bernstein(points: readonly Vec[], t: number): Vec {
    const n = points.length - 1;
    let x = 0, y = 0;
    points.forEach(([px, py], i) => {
        const w = binom(n, i) * (1 - t) ** (n - i) * t ** i;
        x += w * px;
        y += w * py;
    });
    return [x, y];
}

function rows(points: readonly Vec[], t: number): Vec[][] {
    const out: Vec[][] = [points.map(p => [...p] as Vec)];
    while (out[out.length - 1].length > 1) {
        const prev = out[out.length - 1];
        out.push(prev.slice(1).map((q, i) => [(1 - t) * prev[i][0] + t * q[0], (1 - t) * prev[i][1] + t * q[1]] as Vec));
    }
    return out;
}

const curve = (points: readonly Vec[]) => new PolynomialBezierCurve(points.map(([x, y]) => new PointImpl(x, y)));
const near = (actual: Vec | {X(): number; Y(): number}, expected: Vec) => {
    const [ax, ay] = Array.isArray(actual) ? actual as Vec : [(actual as {X(): number}).X(), (actual as {Y(): number}).Y()];
    expect(ax).toBeCloseTo(expected[0], 12);
    expect(ay).toBeCloseTo(expected[1], 12);
};
const nearAll = (actual: readonly Vec[], expected: readonly Vec[]) => {
    expect(actual).toHaveLength(expected.length);
    expected.forEach((p, i) => near(actual[i], p));
};
const pointsOf = (c: PolynomialBezierCurve): Vec[] => c.getPoints().map(p => [p.X(), p.Y()] as Vec);

/** Independent affine maps written from the stated centres (not from the repository). */
const meanOf = (ps: readonly Vec[]): Vec => [ps.reduce((s, p) => s + p[0], 0) / ps.length, ps.reduce((s, p) => s + p[1], 0) / ps.length];
const boxCentreOf = (ps: readonly Vec[]): Vec => {
    const xs = ps.map(p => p[0]), ys = ps.map(p => p[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
};
const translate = (ps: readonly Vec[], dx: number, dy: number): Vec[] => ps.map(([x, y]) => [x + dx, y + dy]);
const rotateAbout = (ps: readonly Vec[], c: Vec, theta: number): Vec[] => ps.map(([x, y]) => [
    c[0] + Math.cos(theta) * (x - c[0]) - Math.sin(theta) * (y - c[1]),
    c[1] + Math.sin(theta) * (x - c[0]) + Math.cos(theta) * (y - c[1]),
]);
const scaleAbout = (ps: readonly Vec[], c: Vec, k: number): Vec[] => ps.map(([x, y]) => [c[0] + k * (x - c[0]), c[1] + k * (y - c[1])]);

// ---- text helpers ----
function fraction(value: number): string {
    for (let d = 1; d <= 64; d++) {
        const n = Math.round(value * d);
        if (Math.abs(n / d - value) < 1e-12) {
            const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b));
            const k = g(n, d) || 1;
            return d / k === 1 ? `${n / k}` : `${n / k}/${d / k}`;
        }
    }
    throw new Error(`no small fraction for ${value}`);
}
const pointText = ([x, y]: Vec) => `(${fraction(x)},${fraction(y)})`;
/** LaTeX to a flat string: "\bigl(-\tfrac32,2\bigr)" -> "(-3/2,2)", "\frac{13}{4}" -> "13/4". */
function flat(latex: string): string {
    const digits = (s: string) => s.replace(/[{}]/g, '');
    return latex
        .replace(/\\(?:left|right|bigl|bigr)/g, '')
        .replace(/\\[tdf]?frac(\d|\{-?\d+\})(\d|\{\d+\})/g, (_m, a: string, b: string) => `${digits(a)}/${digits(b)}`)
        .replace(/\\[,;!]|\\quad|\\[()[\]]/g, '')
        .replace(/\s+/g, '');
}
/** All strings inside a (localized, nested) value. */
const stringsOf = (v: unknown): string[] => typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(stringsOf) : [];
const POINT_PATTERN = /\(-?\d+(?:\/\d+)?,-?\d+(?:\/\d+)?\)/g;

// ---- lesson content through the real adapter ----
type Lesson = NonNullable<ReturnType<typeof getLessonForDemonstration>>;
type Step = Lesson['steps'][number];
type Id = 'decasteljau-alternative' | 'affine' | 'elevation';
const lesson = (id: Id) => getLessonForDemonstration(id)!;
const actionsOf = (s: Step) => (s.scene?.actions ?? []) as readonly LessonAction[];
const fixtureOf = (s: Step): {fixture: LessonCurveFixture; view?: LessonViewBox} | undefined => {
    const first = actionsOf(s).find(a => a.kind === 'prepared-scene');
    return first && first.kind === 'prepared-scene' && first.source === 'lesson-fixture' ? {fixture: first.curve, view: first.view} : undefined;
};
const parameterOf = (s: Step) => {
    const a = actionsOf(s).find(x => x.kind === 'parameter' && x.name === 't');
    return a && a.kind === 'parameter' ? a.value : undefined;
};
const evaluationOf = (s: Step) => {
    const a = actionsOf(s).find(x => x.kind === 'curve-evaluation');
    return a && a.kind === 'curve-evaluation' ? a.parameter : undefined;
};
/** Authored content (prose, worked examples); the adapted lesson above only carries scene actions and ids. */
const rawLesson = (id: Id) => [...rationalConstructionGuidedLessons, ...expansionGuidedLessons, ...additionalGuidedLessons].find(l => l.demonstrationId === id)!;
const exampleOf = (id: Id, exampleId: string) => rawLesson(id).workedExamples.find(x => x.id === exampleId)!;
const exampleText = (id: Id, exampleId: string) => {
    const e = exampleOf(id, exampleId);
    return flat(e.calculationLatex + ' ' + e.resultLatex);
};
const proseOf = (id: Id, s: Step) => {
    const raw = rawLesson(id).steps.find(r => r.id === s.id)!;
    return [raw.explanation, raw.expectedObservations, raw.scene?.expectedState, raw.observationPrompt].flatMap(stringsOf);
};
const inView = (ps: readonly Vec[], [left, top, right, bottom]: LessonViewBox) =>
    ps.every(([x, y]) => x >= left && x <= right && y >= bottom && y <= top);
const toVec = (points: readonly (readonly [number, number])[]): Vec[] => points.map(([x, y]) => [x, y]);
const dist = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('decasteljau-alternative: cubic opening steps', () => {
    const steps = lesson('decasteljau-alternative').steps;
    const halfStep = steps.find(s => s.id === 'da-cubic-two-quadratics')!;
    const quarterStep = steps.find(s => s.id === 'da-cubic-quarter')!;
    const q1 = ALT_CUBIC.slice(0, 3), q2 = ALT_CUBIC.slice(1);

    test('both steps open the lesson with the cubic fixture, view and parameter', () => {
        for (const [s, t] of [[halfStep, 0.5], [quarterStep, 0.25]] as const) {
            const prepared = fixtureOf(s)!;
            expect(toVec(prepared.fixture.points)).toEqual(ALT_CUBIC);
            expect(prepared.view).toEqual([-6, 6, 6, -4]);
            expect(parameterOf(s)).toBe(t);
            expect(inView(ALT_CUBIC, prepared.view!)).toBe(true);
        }
        expect(steps.indexOf(halfStep)).toBe(0);
        expect(steps.indexOf(quarterStep)).toBe(1);
    });

    test.each([
        ['da-cubic-half', 0.5, [-1.5, 2], [1.5, 1.5], [0, 7 / 4]],
        ['da-cubic-quarter', 0.25, [-23 / 8, 1 / 2], [-1 / 8, 23 / 8], [-35 / 16, 35 / 32]],
    ] as const)('%s: helper points and B(t) agree with Bernstein, De Casteljau and the repository', (exampleId, t, h1, h2, b) => {
        near(bernstein(q1, t), h1);
        near(bernstein(q2, t), h2);
        near(bernstein(ALT_CUBIC, t), b);
        const scheme = rows(ALT_CUBIC, t);
        near(scheme[2][0], h1);
        near(scheme[2][1], h2);
        near(scheme[3][0], b);
        near([(1 - t) * h1[0] + t * h2[0], (1 - t) * h1[1] + t * h2[1]], b);   // B = (1-t) Q1 + t Q2
        near(curve(q1).eval(t), h1);
        near(curve(q2).eval(t), h2);
        near(curve(ALT_CUBIC).eval(t), b);
        const full = curve(ALT_CUBIC).decasteljauScheme(t);
        // the repository keeps n entries in every row (in-place recurrence); row r has n-r meaningful entries
        const repo = full.map((row, r) => row.slice(0, full.length - r));
        expect(repo.map(r => r.length)).toEqual([4, 3, 2, 1]);
        scheme.forEach((row, i) => row.forEach((p, j) => near(repo[i][j], p)));
        const text = exampleText('decasteljau-alternative', exampleId);
        for (const p of [h1, h2, b]) expect(text).toContain(pointText(p));
        // the two helper points and B are visibly separate at the demonstrated t
        expect(dist(h1, h2)).toBeGreaterThan(1.5);
        expect(dist(h1, b)).toBeGreaterThan(0.5);
        expect(dist(h2, b)).toBeGreaterThan(0.5);
    });

    test('the two demonstrated parameters give clearly different points and the prose heights are true', () => {
        expect(dist(bernstein(ALT_CUBIC, 0.5), bernstein(ALT_CUBIC, 0.25))).toBeGreaterThan(1.5);
        const half = rows(ALT_CUBIC, 0.5);
        expect(half[2][0][1]).toBeCloseTo(2, 12);       // "heights 2 and 3/2"
        expect(half[2][1][1]).toBeCloseTo(3 / 2, 12);
        const check = stringsOf(exampleOf('decasteljau-alternative', 'da-cubic-half').check).map(flat).join(' ');
        expect(check).toContain('(0,7/4)');
        expect(check).toContain('3/2');
    });

    test('step prose only names verified points', () => {
        const verified = new Set(['(0,7/4)', '(-3/2,2)', '(3/2,3/2)', '(-35/16,35/32)', '(-23/8,1/2)', '(-1/8,23/8)', ...ALT_CUBIC.map(pointText)]);
        for (const s of [halfStep, quarterStep]) {
            for (const piece of proseOf('decasteljau-alternative', s)) for (const m of flat(piece).match(POINT_PATTERN) ?? []) expect(verified.has(m)).toBe(true);
        }
    });
});

describe('affine: fixture, graph centres and commutation', () => {
    const steps = lesson('affine').steps;
    const byId = (id: string) => steps.find(s => s.id === id)!;
    const VIEW: LessonViewBox = [-5, 7, 9, -5];

    test('independent B(1/2) and the centres of the fixture', () => {
        near(bernstein(AFFINE_CUBIC, 0.5), [3, 7 / 4]);
        near(curve(AFFINE_CUBIC).eval(0.5), [3, 7 / 4]);
        near(meanOf(AFFINE_CUBIC), [3, 1]);
        near(boxCentreOf(AFFINE_CUBIC), [3, 1]);
        // the repository's own centres: rotate() turns about the mean of the controls, scale() about the bounding-box centre
        const c = curve(AFFINE_CUBIC);
        near(c.getPointsCenter() as unknown as Vec, [3, 1]);
        near(c.getBoundingBoxCenter() as unknown as Vec, [3, 1]);
    });

    test('every scene starts from the same fixture and view, all inside the view', () => {
        expect(steps).toHaveLength(5);
        for (const s of steps) {
            const prepared = fixtureOf(s)!;
            expect(toVec(prepared.fixture.points)).toEqual(AFFINE_CUBIC);
            expect(prepared.view).toEqual(VIEW);
            expect(inView(AFFINE_CUBIC, prepared.view!)).toBe(true);
        }
    });

    test('translation by (-2,-1): controls, B(1/2), prose', () => {
        const moved = translate(AFFINE_CUBIC, -2, -1);
        nearAll(moved, [[-1, -1], [0, 2], [2, 1], [3, -2]]);
        near(bernstein(moved, 0.5), [1, 3 / 4]);
        const c = curve(AFFINE_CUBIC);
        c.moveFor(-2, 0);
        c.moveFor(0, -1);
        nearAll(pointsOf(c), moved);
        near(c.eval(0.5), [1, 3 / 4]);
        expect(actionsOf(byId('affine-translation')).filter(a => a.kind === 'affine-transform')).toEqual([
            {kind: 'affine-transform', operation: 'translate-x', value: -2},
            {kind: 'affine-transform', operation: 'translate-y', value: -1},
        ]);
        expect(evaluationOf(byId('affine-translation'))).toBe(0.5);
        const text = exampleText('affine', 'affine-translation-midpoint');
        expect(text).toContain('(3,7/4)');
        expect(text).toContain('(1,3/4)');
        expect(text).toContain(moved.map(pointText).join(','));
        expect(inView(moved, VIEW)).toBe(true);
    });

    test('quarter-turn about the graph centre (3,1), not the origin', () => {
        const turned = rotateAbout(AFFINE_CUBIC, [3, 1], Math.PI / 2);
        nearAll(turned, [[4, -1], [1, 0], [2, 2], [5, 3]]);
        near(bernstein(turned, 0.5), [9 / 4, 1]);
        const aboutOrigin = rotateAbout(AFFINE_CUBIC, [0, 0], Math.PI / 2);
        near(bernstein(aboutOrigin, 0.5), [-7 / 4, 3]);
        expect(dist(bernstein(aboutOrigin, 0.5), bernstein(turned, 0.5))).toBeGreaterThan(3);
        const c = curve(AFFINE_CUBIC);
        c.rotate(Math.PI / 2);
        nearAll(pointsOf(c), turned);
        near(c.eval(0.5), [9 / 4, 1]);
        const text = exampleText('affine', 'affine-quarter-turn-midpoint');
        expect(text).toContain(turned.map(pointText).join(','));
        expect(text).toContain('(9/4,1)');
        expect(stringsOf(exampleOf('affine', 'affine-quarter-turn-midpoint').check).map(flat).join(' ')).toContain('(-7/4,3)');
        expect(actionsOf(byId('affine-quarter-turn'))).toContainEqual({kind: 'affine-transform', operation: 'rotate', value: Math.PI / 2});
        expect(inView(turned, VIEW)).toBe(true);
    });

    test('scale 2 about the bounding-box centre (3,1)', () => {
        const scaled = scaleAbout(AFFINE_CUBIC, [3, 1], 2);
        nearAll(scaled, [[-1, -1], [1, 5], [5, 3], [7, -3]]);
        near(bernstein(scaled, 0.5), [3, 5 / 2]);
        const c = curve(AFFINE_CUBIC);
        c.scale(2);
        nearAll(pointsOf(c), scaled);
        near(c.eval(0.5), [3, 5 / 2]);
        const text = exampleText('affine', 'affine-scale-midpoint');
        expect(text).toContain(scaled.map(pointText).join(','));
        expect(text).toContain('(3,5/2)');
        expect(actionsOf(byId('affine-scale'))).toContainEqual({kind: 'affine-transform', operation: 'scale', value: 2});
        expect(inView(scaled, VIEW)).toBe(true);
    });

    test('composed scene: translate, rotate, scale in order; the centres move with the controls', () => {
        const s = byId('affine-analysis');
        expect(actionsOf(s).filter(a => a.kind === 'affine-transform')).toEqual([
            {kind: 'affine-transform', operation: 'translate-x', value: -2},
            {kind: 'affine-transform', operation: 'translate-y', value: -1},
            {kind: 'affine-transform', operation: 'rotate', value: Math.PI / 2},
            {kind: 'affine-transform', operation: 'scale', value: 2},
        ]);
        expect(evaluationOf(s)).toBe(0.75);
        const moved = translate(AFFINE_CUBIC, -2, -1);
        near(meanOf(moved), [1, 0]);                       // the rotation centre is no longer (3,1)
        const turned = rotateAbout(moved, meanOf(moved), Math.PI / 2);
        nearAll(turned, [[2, -2], [-1, -1], [0, 1], [3, 2]]);
        near(boxCentreOf(turned), [1, 0]);                 // the scale centre
        const final = scaleAbout(turned, boxCentreOf(turned), 2);
        nearAll(final, [[3, -4], [-3, -2], [-1, 2], [5, 4]]);
        // the repository, replaying the graph's own calls (AffineTransformsBezierCurveGraph: moveFor, rotate, scale)
        const c = curve(AFFINE_CUBIC);
        c.moveFor(-2, 0);
        c.moveFor(0, -1);
        c.rotate(Math.PI / 2);
        c.scale(2);
        nearAll(pointsOf(c), final);
        // commutation: T(B(t)) = B_T(t), with T written out as the composed point map (centres (1,0), then (1,0))
        for (const t of [0.25, 0.5, 0.75, 1]) {
            const base = bernstein(AFFINE_CUBIC, t);
            const afterMove: Vec = [base[0] - 2, base[1] - 1];
            const afterTurn: Vec = [1 - afterMove[1], afterMove[0] - 1];
            const afterScale: Vec = [1 + 2 * (afterTurn[0] - 1), 2 * afterTurn[1]];
            near(bernstein(final, t), afterScale);
            near(c.eval(t), afterScale);
        }
        near(bernstein(final, 0.75), [1 + 2 * ((1 - ((bernstein(AFFINE_CUBIC, 0.75)[1]) - 1)) - 1), 2 * (bernstein(AFFINE_CUBIC, 0.75)[0] - 3)]);
        expect(inView(final, VIEW) && inView(moved, VIEW) && inView(turned, VIEW)).toBe(true);
    });

    test('step prose only names verified points', () => {
        const verified = new Set<string>([
            ...AFFINE_CUBIC.map(pointText), '(3,7/4)', '(1,3/4)', '(9/4,1)', '(-7/4,3)', '(3,5/2)', '(3,1)', '(-2,-1)',
            ...([[-1, -1], [0, 2], [2, 1], [3, -2], [4, -1], [1, 0], [2, 2], [5, 3], [1, 5], [7, -3], [3, -4], [-3, -2], [-1, 2], [5, 4]] as Vec[]).map(pointText),
        ]);
        for (const s of steps) {
            for (const piece of proseOf('affine', s)) for (const m of flat(piece).match(POINT_PATTERN) ?? []) expect(verified.has(m)).toBe(true);
        }
    });
});

describe('elevation: default cubic', () => {
    const elevated: Vec[] = [[-4, -2], [-13 / 4, 7 / 4], [-1 / 2, 3], [9 / 4, 7 / 4], [3, -2]];
    const steps = lesson('elevation').steps;

    test('independent elevated control points equal elevatedControlPoints and curve.elevate()', () => {
        const hand: Vec[] = [ELEVATION_CUBIC[0]];           // Q_i = (i/4) P_{i-1} + (1 - i/4) P_i
        for (let i = 1; i <= 3; i++) {
            const a = i / 4;
            hand.push([a * ELEVATION_CUBIC[i - 1][0] + (1 - a) * ELEVATION_CUBIC[i][0], a * ELEVATION_CUBIC[i - 1][1] + (1 - a) * ELEVATION_CUBIC[i][1]]);
        }
        hand.push(ELEVATION_CUBIC[3]);
        nearAll(hand, elevated);
        nearAll(elevatedControlPoints(ELEVATION_CUBIC.map(([x, y]) => new PointImpl(x, y))), elevated);
        nearAll(pointsOf(curve(ELEVATION_CUBIC).elevate()), elevated);
        near(elevated[0], ELEVATION_CUBIC[0]);
        near(elevated[4], ELEVATION_CUBIC[3]);
    });

    test('elevated curve equals the original at many parameters; B(1/2) = (-1/2,7/4)', () => {
        near(bernstein(ELEVATION_CUBIC, 0.5), [-1 / 2, 7 / 4]);
        near(bernstein(elevated, 0.5), [-1 / 2, 7 / 4]);
        const original = curve(ELEVATION_CUBIC), raised = original.elevate();
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            near(bernstein(elevated, t), bernstein(ELEVATION_CUBIC, t));
            near(raised.eval(t), [original.eval(t).X(), original.eval(t).Y()]);
        }
        // the degree 5 preview of the last step keeps the shape as well
        const second = elevatedControlPoints(elevated.map(([x, y]) => new PointImpl(x, y))) as Vec[];
        expect(second).toHaveLength(6);
        for (const t of [0.25, 0.5, 0.75]) near(bernstein(second, t), bernstein(ELEVATION_CUBIC, t));
        expect(inView(second, ELEVATION_DEFAULT_VIEW)).toBe(true);
        // the new interior control points do not lie on the curve (the lesson says so)
        const samples = Array.from({length: 201}, (_, i) => bernstein(ELEVATION_CUBIC, i / 200));
        for (const p of elevated.slice(1, -1)) expect(Math.min(...samples.map(q => dist(p, q)))).toBeGreaterThan(0.1);
    });

    test('control points and elevated points lie inside the default view', () => {
        expect(inView(ELEVATION_CUBIC, ELEVATION_DEFAULT_VIEW)).toBe(true);
        expect(inView(elevated, ELEVATION_DEFAULT_VIEW)).toBe(true);
        for (const s of steps) expect(fixtureOf(s)).toBeUndefined();   // demonstration default, no fixture
    });

    test('worked example prose and scene wiring', () => {
        const text = exampleText('elevation', 'elevation-cubic-example');
        for (const p of ELEVATION_CUBIC) expect(text).toContain(pointText(p));
        expect(text).toContain(elevated.map(pointText).join(','));
        expect(steps).toHaveLength(4);
        steps.slice(0, 3).forEach(s => expect(actionsOf(s).some(a => a.kind === 'degree-elevation')).toBe(false));
        expect(actionsOf(steps[3]).some(a => a.kind === 'degree-elevation')).toBe(true);
        expect(evaluationOf(steps[2])).toBe(0.5);
        expect(evaluationOf(steps[3])).toBe(0.75);
        for (const s of steps) expect(actionsOf(s)).toContainEqual({kind: 'curve-visibility', target: 'control-polygon', visible: true});
        expect(flat(steps.map(s => proseOf('elevation', s).join(' ')).join(' '))).toContain('(-1/2,7/4)');
    });
});
