import {
    arcDeviation, arcPoint, DEVIATION_SAMPLES, evaluateFivePoint, extrapolatedPieces, extrapolationIntervals, FIVE_POINT_EXAMPLE_IDS, FIVE_POINT_EXAMPLES,
    type FivePointScene, matchesExample, nextLastUnique, parseFivePointModel, pointOf, serializeFivePointModel, shownConic,
} from './fivePointModel';
import {movePoint, nudgePoint, setEnd, setNumerators, setThird} from './fivePointEdit';
import {Conic} from '../../projective/conic';
import {renderMessage, setLanguage} from '../../localization';

beforeEach(() => setLanguage('sl'));

type ExampleKey = keyof typeof FIVE_POINT_EXAMPLES;
const sceneOf = (id: ExampleKey) => evaluateFivePoint(FIVE_POINT_EXAMPLES[id]);
type OkArc = Parameters<typeof arcDeviation>[1];
const okArc = (id: ExampleKey): OkArc => {
    const arc = sceneOf(id).arc;
    if (!arc || arc.status !== 'ok') throw new Error('no ok arc');
    return arc;
};
/** Whether two coefficient triples are proportional (the same conic up to a nonzero factor). */
const sameConic = (c: Conic, expected: Conic): boolean => {
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) if (c[i] * expected[j] !== c[j] * expected[i]) return false;
    return true;
};
const conicOf = (scene: FivePointScene): Conic => {
    if (scene.conic === undefined) throw new Error('expected a conic');
    return scene.conic;
};
const near = (a: number, b: number, tol = 1e-12) => expect(Math.abs(a - b)).toBeLessThan(tol);
const fraction = (f: {num: bigint; den: bigint}) => `${f.num}/${f.den}`;

describe('examples', () => {
    test('ellipse: 9x^2 + 25y^2 - 225, P1 = (5, 3), w^2 = 1/2, Farin points and shoulder', () => {
        const scene = sceneOf('ellipse');
        expect(scene.status).toBe('unique');
        expect(scene.type).toBe('ellipse');
        expect(sameConic(conicOf(scene), [9n, 0n, 25n, 0n, 0n, -225n])).toBe(true);
        const arc = okArc('ellipse');
        expect(arc.controlPoints.map(p => [p.x, p.y])).toEqual([[5, 0], [5, 3], [0, 3]]);
        expect(fraction(arc.weightSquared)).toBe('1/2');
        near(arc.weight, Math.SQRT1_2);
        near(arc.farinPoints[0].x, 5); near(arc.farinPoints[0].y, 1.2426406871192852);
        near(arc.farinPoints[1].x, 2.0710678118654755); near(arc.farinPoints[1].y, 3);
        near(arc.shoulder.x, 3.5355339059327378); near(arc.shoulder.y, 2.1213203435596424);
        expect(arc.denominatorZeros).toEqual([]);
        expect(scene.kind).toBe('ok');
    });

    test('hyperbola: 16x^2 - 9y^2 - 144, P1 = (3, 2), w = 2/sqrt(3), denominator zeros -1.366 and 2.366', () => {
        const scene = sceneOf('hyperbola');
        expect(scene.type).toBe('hyperbola');
        expect(sameConic(conicOf(scene), [16n, 0n, -9n, 0n, 0n, -144n])).toBe(true);
        const arc = okArc('hyperbola');
        expect([arc.controlPoints[1].x, arc.controlPoints[1].y]).toEqual([3, 2]);
        near(arc.weight, 2 / Math.sqrt(3));
        expect(arc.weightExact).toBeNull();
        expect(arc.denominatorZeros).toHaveLength(2);
        const [lo, hi] = [...arc.denominatorZeros].sort((p, q) => p - q);
        expect(lo).toBeCloseTo(-1.366, 3);
        expect(hi).toBeCloseTo(2.366, 3);
    });

    test('parabola: y^2 - 4x, P1 = (0, 2), w = 1 exactly, shoulder (1, 2)', () => {
        const scene = sceneOf('parabola');
        expect(scene.type).toBe('parabola');
        expect(sameConic(conicOf(scene), [0n, 0n, 1n, -4n, 0n, 0n])).toBe(true);
        const arc = okArc('parabola');
        expect([arc.controlPoints[1].x, arc.controlPoints[1].y]).toEqual([0, 2]);
        expect(fraction(arc.weightSquared)).toBe('1/1');
        expect(arc.weight).toBe(1);
        near(arc.shoulder.x, 1); near(arc.shoulder.y, 2);
        expect(arc.denominatorZeros).toEqual([]);
    });

    test('three collinear points give a line pair (96x^2 - 24xy - 72y^2 - 288x + 288y) and name the triple', () => {
        const scene = sceneOf('three-collinear');
        expect(scene.status).toBe('line-pair');
        expect(scene.kind).toBe('line-pair');
        expect(scene.arc).toBeUndefined();
        expect(sameConic(conicOf(scene), [96n, -24n, -72n, -288n, 288n, 0n])).toBe(true);
        expect([...scene.collinearSet].sort()).toEqual([0, 1, 2]);
    });

    test('four collinear points give a pencil; coincident points give a pencil naming the pair', () => {
        const scene = sceneOf('four-collinear');
        expect(scene.status).toBe('pencil');
        expect(scene.kind).toBe('pencil-collinear');
        expect(scene.collinearSet).toEqual([0, 1, 2, 3]);
        const repeated = evaluateFivePoint(setNumerators(FIVE_POINT_EXAMPLES.ellipse, 1, {x: 75, y: 0}));
        expect(repeated.status).toBe('pencil');
        expect(repeated.kind).toBe('pencil-repeated');
        expect(repeated.repeated).toEqual([0, 1]);
    });

    test.each(['ellipse', 'hyperbola', 'parabola'] as const)('%s: the evaluator arc lies on the conic (deviation < 1e-9)', id => {
        expect(DEVIATION_SAMPLES).toBe(200);
        const scene = sceneOf(id);
        expect(scene.deviation).toBeDefined();
        expect(scene.deviation!).toBeLessThan(1e-9);
        expect(arcDeviation(conicOf(scene), okArc(id))).toBe(scene.deviation);
    });

    test('the deviation check is not vacuous: a wrong weight is far from the conic', () => {
        const arc = okArc('ellipse');
        const wrong = {...arc, weights: [1, 0.9, 1] as const};
        expect(arcDeviation(conicOf(sceneOf('ellipse')), wrong)).toBeGreaterThan(1e-2);
    });

    test('the arc starts at P0 and ends at P2', () => {
        const arc = okArc('ellipse');
        expect(arcPoint(arc, 0)).toEqual([5, 0]);
        const end = arcPoint(arc, 1);
        near(end[0], 0); near(end[1], 3);
    });

    test('other arc selections report their typed status', () => {
        expect(evaluateFivePoint({...FIVE_POINT_EXAMPLES.hyperbola, a: 1, b: 3, t: 0}).kind).toBe('no-real-weight');
        expect(evaluateFivePoint({...FIVE_POINT_EXAMPLES.ellipse, a: 0, b: 1, t: 2}).kind).toBe('complementary-arc');
        expect(evaluateFivePoint({...FIVE_POINT_EXAMPLES.ellipse, a: 0, b: 2, t: 1}).kind).toBe('split-needed');
    });
});

describe('parsing', () => {
    const good = serializeFivePointModel(FIVE_POINT_EXAMPLES.hyperbola);
    const refusal = (data: unknown) => {
        const checked = parseFivePointModel(data);
        if (checked.ok) throw new Error('accepted');
        return renderMessage(checked.rejection);
    };

    test('an unknown key is refused and named', () => {
        expect(refusal({...JSON.parse(JSON.stringify(good)), extra: 1})).toContain('extra');
    });

    test('valid data round-trips as an independent copy', () => {
        const checked = parseFivePointModel(JSON.parse(JSON.stringify(good)));
        expect(checked.ok && checked.value).toEqual(good);
        expect(checked.ok && checked.value.points[0]).not.toBe(good.points[0]);
    });

    test('every example id parses to itself', () => {
        for (const id of FIVE_POINT_EXAMPLE_IDS) {
            const checked = parseFivePointModel(serializeFivePointModel(FIVE_POINT_EXAMPLES[id]));
            expect(checked.ok && checked.value).toEqual(FIVE_POINT_EXAMPLES[id]);
        }
    });

    test('an edited named example becomes custom', () => {
        const edited = {...good, points: good.points.map((p, i) => i === 0 ? {x: 48, y: 0} : p)};
        const checked = parseFivePointModel(edited);
        expect(checked.ok && checked.value.example).toBe('custom');
    });

    test('refusals are actionable in both languages', () => {
        expect(refusal(null)).toBeTruthy();
        expect(refusal({...good, example: 'circle'})).toContain('ellipse, hyperbola');
        expect(refusal({...good, points: good.points.slice(0, 4)})).toContain('points');
        expect(refusal({...good, points: good.points.map((p, i) => i === 2 ? {x: 1.5, y: 0} : p)})).toContain('points[2]');
        expect(refusal({...good, points: good.points.map((p, i) => i === 3 ? {x: 151, y: 0} : p)})).toContain('points[3]');
        expect(refusal({...good, a: 5})).toContain('a');
        expect(refusal({...good, t: 0.5})).toContain('t');
        expect(refusal({...good, b: good.a})).toContain('različna');
        expect(refusal({...good, t: good.a})).toContain('različna');
        setLanguage('en');
        expect(refusal({...good, t: good.b})).toContain('different');
        expect(refusal({...good, example: 'x'})).toContain('ellipse, hyperbola');
    });
});

describe('edits', () => {
    test('a drag snaps to the 1/5 grid and makes the set-up custom', () => {
        const moved = movePoint(FIVE_POINT_EXAMPLES.ellipse, 0, {x: 2.31, y: -1.09});
        expect(moved.points[0]).toEqual({x: 36, y: -15});
        expect(moved.example).toBe('custom');
        expect(moved.points[1]).toBe(FIVE_POINT_EXAMPLES.ellipse.points[1]);
    });
    test('clamps to +-10, ignores non-finite targets and returns the same object when unchanged', () => {
        expect(movePoint(FIVE_POINT_EXAMPLES.ellipse, 0, {x: 99, y: -99}).points[0]).toEqual({x: 150, y: -150});
        const m = FIVE_POINT_EXAMPLES.ellipse;
        expect(movePoint(m, 0, {x: NaN, y: 0})).toBe(m);
        expect(movePoint(m, 0, {x: 5, y: 0})).toBe(m);
        expect(movePoint(m, 7, {x: 1, y: 1})).toBe(m);
    });
    test('nudging steps by three numerators (0.2)', () => {
        expect(nudgePoint(FIVE_POINT_EXAMPLES.ellipse, 1, 1, -2).points[1]).toEqual({x: 3, y: 39});
    });
    test('choosing an end swaps with the other end and moves the third point off an end', () => {
        const m = FIVE_POINT_EXAMPLES.ellipse;
        const swapped = setEnd(m, 'a', 1);
        expect([swapped.a, swapped.b, swapped.t]).toEqual([1, 0, 3]);
        const onThird = setEnd(m, 'b', 3);
        expect([onThird.a, onThird.b]).toEqual([0, 3]);
        expect(new Set([onThird.a, onThird.b, onThird.t]).size).toBe(3);
        expect(setEnd(m, 'a', 0)).toBe(m);
        expect(setThird(m, 0)).toBe(m);
        expect(setThird(m, 4).t).toBe(4);
    });
    test('matchesExample is false once edited and never true for custom', () => {
        expect(matchesExample(FIVE_POINT_EXAMPLES.parabola)).toBe(true);
        expect(matchesExample(nudgePoint(FIVE_POINT_EXAMPLES.parabola, 0, 1, 0))).toBe(false);
        expect(matchesExample(FIVE_POINT_EXAMPLES.custom)).toBe(false);
    });
});

describe('stale conic (acceptance 6)', () => {
    test('a degenerate position keeps the last unique conic, marked stale', () => {
        const unique = FIVE_POINT_EXAMPLES.ellipse;
        const last = nextLastUnique(undefined, unique, evaluateFivePoint(unique));
        expect(last).toEqual(unique.points);
        expect(shownConic(evaluateFivePoint(unique), last)?.stale).toBe(false);
        // E to the origin makes A, C, E collinear
        const degenerate = setNumerators(unique, 4, {x: 0, y: 0});
        const scene = evaluateFivePoint(degenerate);
        expect(scene.status).toBe('line-pair');
        const kept = nextLastUnique(last, degenerate, scene);
        expect(kept).toBe(last);
        const shown = shownConic(scene, kept);
        expect(shown?.stale).toBe(true);
        expect(shown?.conic).toEqual(evaluateFivePoint(unique).conic);
        const back = nextLastUnique(kept, FIVE_POINT_EXAMPLES.parabola, sceneOf('parabola'));
        expect(back).toEqual(FIVE_POINT_EXAMPLES.parabola.points);
    });
    test('without any unique conic nothing is shown', () => {
        expect(shownConic(sceneOf('four-collinear'), undefined)).toBeUndefined();
    });
});

describe('extrapolation never crosses a denominator zero', () => {
    test('intervals split at the zeros', () => {
        expect(extrapolationIntervals([])).toEqual([{lo: -Infinity, hi: 0}, {lo: 1, hi: Infinity}]);
        const zeros = okArc('hyperbola').denominatorZeros;
        const [lo, hi] = [...zeros].sort((p, q) => p - q);
        const intervals = extrapolationIntervals(zeros);
        expect(intervals).toEqual([{lo: -Infinity, hi: lo}, {lo, hi: 0}, {lo: 1, hi}, {lo: hi, hi: Infinity}]);
        for (const interval of intervals) for (const z of zeros) expect(z <= interval.lo || z >= interval.hi).toBe(true);
    });
    test('the pieces of the hyperbola arc are four polylines on the conic, each on one branch', () => {
        const arc = okArc('hyperbola');
        const pieces = extrapolatedPieces(arc);
        expect(pieces).toHaveLength(4);
        for (const piece of pieces) {
            const xs = piece.x.filter(Number.isFinite);
            expect(xs.length).toBeGreaterThan(0);
            expect(new Set(xs.map(Math.sign)).size).toBe(1);
            piece.x.forEach((x, i) => {
                if (Number.isFinite(x)) expect(Math.abs(16 * x * x - 9 * piece.y[i] ** 2 - 144) / (1 + x * x + piece.y[i] ** 2)).toBeLessThan(1e-6);
            });
        }
    });
    test('an ellipse has no zeros, so two pieces', () => {
        expect(extrapolatedPieces(okArc('ellipse'))).toHaveLength(2);
    });
});

test('pointOf puts a point over the fixed denominator 15 (reduced)', () => {
    expect(pointOf({x: 15, y: 30}).map(Number)).toEqual([1, 2, 1]);
});

describe('independent checks (hyperbola, S6 bridge, lastUnique)', () => {
    test('hyperbola: w^2 = 4/3, Farin points and shoulder from the closed form P0=(3,0), P1=(3,2), P2=(5,16/3)', () => {
        const arc = okArc('hyperbola');
        expect(fraction(arc.weightSquared)).toBe('4/3');
        const w = 2 / Math.sqrt(3);
        const p0 = [3, 0], p1 = [3, 2], p2 = [5, 16 / 3];
        const mix = (a: number[], b: number[]) => [(a[0] + w * b[0]) / (1 + w), (a[1] + w * b[1]) / (1 + w)];
        const f1 = mix(p0, p1);
        const f2 = mix(p2, p1);
        near(arc.farinPoints[0].x, f1[0]); near(arc.farinPoints[0].y, f1[1]);
        near(arc.farinPoints[1].x, f2[0]); near(arc.farinPoints[1].y, f2[1]);
        near(arc.shoulder.x, (f1[0] + f2[0]) / 2); near(arc.shoulder.y, (f1[1] + f2[1]) / 2);
        // the shoulder is the curve point at t = 1/2: (P0 + 2wP1 + P2) / (2 + 2w)
        near(arc.shoulder.x, (p0[0] + 2 * w * p1[0] + p2[0]) / (2 + 2 * w));
        near(arc.shoulder.y, (p0[1] + 2 * w * p1[1] + p2[1]) / (2 + 2 * w));
    });

    test('hyperbola: arc points at t = 0.2, -0.3 and 1.4 lie on 16x^2 - 9y^2 = 144 to relative 1e-13', () => {
        const arc = okArc('hyperbola');
        for (const t of [0.2, -0.3, 1.4]) {
            const [x, y] = arcPoint(arc, t);
            expect(Math.abs(16 * x * x - 9 * y * y - 144) / 144).toBeLessThan(1e-13);
        }
    });

    test('the ellipse arc equals the S6 bridge curve: control points (5,0), (5,3), (0,3), weights 1, sqrt(2)/2, 1', () => {
        const arc = okArc('ellipse');
        expect(arc.weights[0]).toBe(1);
        near(arc.weights[1], Math.SQRT1_2);
        expect(arc.weights[2]).toBe(1);
        for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
            const b0 = (1 - t) ** 2, b1 = 2 * t * (1 - t) * Math.SQRT1_2, b2 = t * t;
            const den = b0 + b1 + b2;
            const [x, y] = arcPoint(arc, t);
            near(x, (5 * b0 + 5 * b1 + 0 * b2) / den);
            near(y, (0 * b0 + 3 * b1 + 3 * b2) / den);
        }
    });

    test('loading an example or a Preset after a stale state resets lastUnique (the record is rebuilt from the new model)', () => {
        const unique = FIVE_POINT_EXAMPLES.ellipse;
        const last = nextLastUnique(undefined, unique, evaluateFivePoint(unique));
        const degenerate = setNumerators(unique, 4, {x: 0, y: 0});
        const kept = nextLastUnique(last, degenerate, evaluateFivePoint(degenerate));
        expect(kept).toBe(last);
        // a loaded degenerate example has no earlier unique conic: nothing stale is shown
        const fresh = nextLastUnique(undefined, FIVE_POINT_EXAMPLES['three-collinear'], sceneOf('three-collinear'));
        expect(fresh).toBeUndefined();
        expect(shownConic(sceneOf('three-collinear'), fresh)).toBeUndefined();
        // a loaded unique example carries its own points
        expect(nextLastUnique(undefined, FIVE_POINT_EXAMPLES.hyperbola, sceneOf('hyperbola'))).toEqual(FIVE_POINT_EXAMPLES.hyperbola.points);
    });
});
