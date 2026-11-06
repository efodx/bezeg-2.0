import {describe, expect, it} from 'vitest';
import {
    addCorrelationPoint, checkCorrelationModel, chooseCorrelationExample, CORRELATION_COORDINATE_LIMIT,
    CORRELATION_EXAMPLE_IDS, CORRELATION_EXAMPLES, CORRELATION_POINTS_MAX, CORRELATION_POINTS_MIN, correlationExampleOf,
    CORRELATION_CAPTION_CORNER, correlationView, DEFAULT_CORRELATION_MODEL, fitCorrelationView, moveCorrelationPoint, parseCorrelationModel,
    removeCorrelationPoint, setCorrelationResiduals, setCorrelationXOnY,
} from './correlationModel';
import type {CorrelationExampleId, CorrelationModel, CorrelationPoint} from './correlationModel';
import {fitLine} from './leastSquares';

const model = (id: CorrelationExampleId): CorrelationModel => ({...DEFAULT_CORRELATION_MODEL, points: CORRELATION_EXAMPLES[id]});
const view = (id: CorrelationExampleId) => correlationView(model(id));
const refused = (edit: {ok: boolean}) => expect(edit.ok).toBe(false);
const must = <T extends {ok: boolean}>(edit: T): Extract<T, {ok: true}> => {
    expect(edit.ok).toBe(true);
    return edit as Extract<T, {ok: true}>;
};

/** Independent centred sums in plain floating point. */
const sums = (points: readonly CorrelationPoint[]) => {
    const n = points.length;
    const mx = points.reduce((s, p) => s + p[0], 0) / n;
    const my = points.reduce((s, p) => s + p[1], 0) / n;
    return {
        sxx: points.reduce((s, p) => s + (p[0] - mx) ** 2, 0),
        syy: points.reduce((s, p) => s + (p[1] - my) ** 2, 0),
        sxy: points.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0),
    };
};

describe('correlation model: examples and the default numbers', () => {
    it('lists the five examples with the spec points', () => {
        expect(CORRELATION_EXAMPLE_IDS).toEqual(['default', 'outlier', 'parabola', 'parabola-right', 'ring']);
        expect(CORRELATION_EXAMPLES.default).toEqual([[0, 1], [1, 2], [2, 2], [3, 4]]);
        expect(CORRELATION_EXAMPLES.outlier).toEqual([[0, 1], [1, 2], [2, 2], [3, 8]]);
        expect(CORRELATION_EXAMPLES.parabola).toEqual([-3, -2, -1, 0, 1, 2, 3].map(x => [x, x * x]));
        expect(CORRELATION_EXAMPLES['parabola-right']).toEqual([0, 1, 2, 3].map(x => [x, x * x]));
        expect(CORRELATION_EXAMPLES.ring).toHaveLength(8);
        const sorted = [...CORRELATION_EXAMPLES.ring].map(p => p.join(',')).sort();
        expect(sorted).toEqual(['-2,-2', '-2,2', '-3,0', '0,-3', '0,3', '2,-2', '2,2', '3,0'].sort());
        expect(DEFAULT_CORRELATION_MODEL).toMatchObject({residuals: true, xOnY: false});
    });

    it('default: Sxx 5, Syy 4.75, Sxy 4.5, r2 = 81/95, line 0.9x + 0.9, SSres 0.7', () => {
        const {result} = view('default');
        expect(result.status).toBe('ok');
        expect(result.sxx).toBeCloseTo(5, 12);
        expect(result.syy).toBeCloseTo(4.75, 12);
        expect(result.sxy).toBeCloseTo(4.5, 12);
        expect(result.rSquared).toBeCloseTo(81 / 95, 12);
        expect(result.r).toBeCloseTo(0.92338, 5);
        expect(result.yOnX!.slope).toBeCloseTo(0.9, 12);
        expect(result.yOnX!.intercept).toBeCloseTo(0.9, 12);
        expect(result.residualSumOfSquares).toBeCloseTo(0.7, 12);
        expect(result.residualSumOfSquares).toBeCloseTo(4.75 * (1 - 81 / 95), 12);
        expect(result.slopeFromR).toBeCloseTo(0.9, 12);
        expect(result.xOnY!.slope).toBeCloseTo(0.94737, 5);
        expect(result.xOnY!.intercept).toBeCloseTo(-0.63158, 5);
        expect(result.yOnX!.slope * result.xOnY!.slope).toBeCloseTo(result.rSquared!, 12);
    });

    it('outlier: r 0.84680, line 2.1x + 0.1, SSres 8.7', () => {
        const {result} = view('outlier');
        expect(result.r).toBeCloseTo(0.8468, 4);
        expect(result.yOnX!.slope).toBeCloseTo(2.1, 12);
        expect(result.yOnX!.intercept).toBeCloseTo(0.1, 12);
        expect(result.residualSumOfSquares).toBeCloseTo(8.7, 12);
    });

    it('parabola and ring have r exactly 0; the right half has r 0.95831', () => {
        const parabola = view('parabola').result;
        expect(parabola.nSxy).toBe(0);
        expect(parabola.r).toBe(0);
        expect(parabola.yOnX!.slope).toBeCloseTo(0, 12);
        expect(parabola.yOnX!.intercept).toBeCloseTo(4, 12);
        expect(view('ring').result.r).toBe(0);
        expect(view('parabola-right').result.r).toBeCloseTo(0.95831, 5);
    });

    it('the examples are named back and round trip through check', () => {
        for (const id of CORRELATION_EXAMPLE_IDS) {
            expect(correlationExampleOf(model(id))).toBe(id);
            const check = checkCorrelationModel(model(id));
            expect(check.ok && check.model.points).toEqual(CORRELATION_EXAMPLES[id]);
        }
        expect(correlationExampleOf({...DEFAULT_CORRELATION_MODEL, points: [[0, 1], [1, 2], [2, 2], [3, 4.1]]})).toBeUndefined();
    });
});

describe('correlation model: independent checks', () => {
    it('the y-on-x line equals fitLine and the residuals are orthogonal to 1 and x', () => {
        for (const id of ['default', 'parabola'] as const) {
            const points = CORRELATION_EXAMPLES[id];
            const {result} = view(id);
            const ref = fitLine(points);
            expect(result.yOnX!.slope).toBeCloseTo(ref.slope, 12);
            expect(result.yOnX!.intercept).toBeCloseTo(ref.intercept, 12);
            const res = points.map(p => p[1] - (result.yOnX!.intercept + result.yOnX!.slope * p[0]));
            expect(res.reduce((s, v) => s + v, 0)).toBeCloseTo(0, 12);
            expect(res.reduce((s, v, i) => s + v * points[i][0], 0)).toBeCloseTo(0, 12);
        }
    });

    it('r equals sign(Sxy) sqrt(1 - SSres / Syy) and matches the plain sums', () => {
        for (const id of ['default', 'outlier', 'parabola-right'] as const) {
            const {result} = view(id);
            const s = sums(CORRELATION_EXAMPLES[id]);
            expect(result.r).toBeCloseTo(s.sxy / Math.sqrt(s.sxx * s.syy), 12);
            expect(result.r).toBeCloseTo(Math.sign(s.sxy) * Math.sqrt(1 - result.residualSumOfSquares! / s.syy), 9);
        }
        const negative: CorrelationModel = {...DEFAULT_CORRELATION_MODEL, points: [[0, 4], [1, 2], [2, 2], [3, 1]]};
        expect(correlationView(negative).result.r!).toBeLessThan(0);
    });

    it('r and the line do not depend on the point order', () => {
        let seed = 7;
        const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
        for (let trial = 0; trial < 20; trial++) {
            const points: CorrelationPoint[] = Array.from({length: 3 + Math.floor(rand() * 8)}, () =>
                [Math.round(rand() * 100) / 10 - 5, Math.round(rand() * 100) / 10 - 5] as const);
            const shuffled = [...points].sort(() => rand() - 0.5);
            const a = correlationView({...DEFAULT_CORRELATION_MODEL, points}).result;
            const b = correlationView({...DEFAULT_CORRELATION_MODEL, points: shuffled}).result;
            expect(b.status).toBe(a.status);
            if (a.r !== undefined) expect(b.r).toBeCloseTo(a.r, 12);
            if (a.yOnX) {
                expect(b.yOnX!.slope).toBeCloseTo(a.yOnX.slope, 9);
                expect(b.yOnX!.intercept).toBeCloseTo(a.yOnX.intercept, 9);
            }
        }
    });

    it('reports zero variance and too few points', () => {
        const status = (points: CorrelationPoint[]) => correlationView({...DEFAULT_CORRELATION_MODEL, points});
        const zx = status([[1, 1], [1, 2], [1, 4]]);
        expect(zx.status).toBe('zero-variance-x');
        expect(zx.result.r).toBeUndefined();
        expect(zx.yOnXLine).toBeUndefined();
        expect(zx.residualSegments).toEqual([]);
        expect(zx.xOnYLine).toBeDefined();
        const zy = status([[1, 2], [2, 2], [4, 2]]);
        expect(zy.status).toBe('zero-variance-y');
        expect(zy.result.r).toBeUndefined();
        expect(zy.xOnYLine).toBeUndefined();
        expect(zy.yOnXLine).toBeDefined();
        const both = status([[1, 2], [1, 2], [1, 2]]);
        expect(both.status).toBe('zero-variance-both');
        expect(both.result.r).toBeUndefined();
        const two = status([[0, 0], [1, 1]]);
        expect(two.status).toBe('too-few');
        expect(two.result.r).toBeUndefined();
        expect(two.yOnXLine).toBeDefined();
    });
});

describe('correlation model: view', () => {
    it('residual segments are vertical, end on the line, and the lines span the bounds', () => {
        const v = view('default');
        expect(v.residualSegments).toHaveLength(4);
        expect(v.residualSegments[1].from).toEqual([1, 2]);
        expect(v.residualSegments[1].to[0]).toBe(1);
        expect(v.residualSegments[1].to[1]).toBeCloseTo(1.8, 12);
        const [left, top, right, bottom] = v.bounds;
        expect(v.yOnXLine![0]).toBe(left);
        expect(v.yOnXLine![2]).toBe(right);
        expect(v.yOnXLine![1]).toBeCloseTo(0.9 + 0.9 * left, 12);
        expect(v.xOnYLine![1]).toBe(bottom);
        expect(v.xOnYLine![3]).toBe(top);
    });

    it('fitted bounds contain every point with a margin and are at least 6 wide', () => {
        for (const id of CORRELATION_EXAMPLE_IDS) {
            const [left, top, right, bottom] = fitCorrelationView(CORRELATION_EXAMPLES[id]);
            for (const [x, y] of CORRELATION_EXAMPLES[id]) {
                expect(x).toBeGreaterThanOrEqual(left + 1);
                expect(x).toBeLessThanOrEqual(right - 1);
                expect(y).toBeGreaterThanOrEqual(bottom + 1);
                expect(y).toBeLessThanOrEqual(top - 1);
            }
            expect(right - left).toBeGreaterThanOrEqual(6);
            expect(top - bottom).toBeGreaterThanOrEqual(6);
        }
        expect(fitCorrelationView([[0, 0], [20, 20]])).toEqual([-1, 21, 21, -1]);
    });

    it('leaves the corner of the board that holds the caption free of points', () => {
        const inCaption = (points: readonly (readonly [number, number])[]) => {
            const [left, top, right, bottom] = fitCorrelationView(points);
            return points.filter(([x, y]) => (x - left) / (right - left) < CORRELATION_CAPTION_CORNER.width
                && (top - y) / (top - bottom) < CORRELATION_CAPTION_CORNER.height - 1e-9);
        };
        for (const id of CORRELATION_EXAMPLE_IDS) expect(inCaption(CORRELATION_EXAMPLES[id]), id).toEqual([]);
        expect(inCaption([[0, 0], [20, -20]])).toEqual([]);
    });

    it('raises only the top of the view, and only when a point sits in that corner', () => {
        const [left, top, right, bottom] = fitCorrelationView(CORRELATION_EXAMPLES['parabola']);
        expect([left, right, bottom]).toEqual([-4, 4, -1]);
        expect(top).toBeCloseTo(11.5, 9);
        expect(fitCorrelationView(CORRELATION_EXAMPLES['default'])).toEqual([-1.5, 5.5, 4.5, -0.5]);
        expect(fitCorrelationView(CORRELATION_EXAMPLES['ring'])).toEqual([-4, 4, 4, -4]);
    });
});

describe('correlation model: edits', () => {
    const base = DEFAULT_CORRELATION_MODEL;

    it('moves a point and snaps typed values to tenths', () => {
        expect(must(moveCorrelationPoint(base, 1, [1.23, 2.26])).model.points[1]).toEqual([1.2, 2.3]);
        expect(must(moveCorrelationPoint(base, 0, [-0.04, 1])).model.points[0]).toEqual([0, 1]);
        expect(must(moveCorrelationPoint(base, 0, [0, 1])).model).toBe(base);
        expect(base.points[1]).toEqual([1, 2]);
    });

    it('refuses out-of-range, non-finite, malformed values and bad indices', () => {
        const L = CORRELATION_COORDINATE_LIMIT;
        expect(must(moveCorrelationPoint(base, 0, [L, -L])).model.points[0]).toEqual([L, -L]);
        for (const bad of [[L + 0.1, 0], [0, -L - 1], [NaN, 0], [0, Infinity], [1], 'x', null, [1, '2']]) {
            const edit = moveCorrelationPoint(base, 2, bad);
            refused(edit);
            expect(!edit.ok && edit.issue).toEqual({kind: 'coordinate', index: 2, limit: L});
        }
        for (const index of [-1, 4, 1.5, NaN, '1', undefined]) {
            const edit = moveCorrelationPoint(base, index, [0, 0]);
            expect(!edit.ok && edit.issue).toEqual({kind: 'index', count: 4});
        }
        expect(base.points).toEqual(CORRELATION_EXAMPLES.default);
    });

    it('adds a point right of the last one and refuses at the maximum', () => {
        expect(must(addCorrelationPoint(base)).model.points[4]).toEqual([4, 4]);
        const edge = {...base, points: [[0, 0], [CORRELATION_COORDINATE_LIMIT, 3]] as CorrelationPoint[]};
        expect(must(addCorrelationPoint(edge)).model.points[2]).toEqual([CORRELATION_COORDINATE_LIMIT - 1, 3]);
        let m = base;
        while (m.points.length < CORRELATION_POINTS_MAX) m = must(addCorrelationPoint(m)).model;
        expect(m.points).toHaveLength(20);
        const edit = addCorrelationPoint(m);
        expect(!edit.ok && edit.issue).toEqual({kind: 'points', min: 2, max: 20});
    });

    it('removes a point and refuses at the minimum or for a bad index', () => {
        expect(must(removeCorrelationPoint(base)).model.points).toEqual([[0, 1], [1, 2], [2, 2]]);
        expect(must(removeCorrelationPoint(base, 0)).model.points).toEqual([[1, 2], [2, 2], [3, 4]]);
        const edit = removeCorrelationPoint(base, 9);
        expect(!edit.ok && edit.issue).toEqual({kind: 'index', count: 4});
        let m = base;
        while (m.points.length > CORRELATION_POINTS_MIN) m = must(removeCorrelationPoint(m)).model;
        expect(m.points).toHaveLength(2);
        const last = removeCorrelationPoint(m);
        expect(!last.ok && last.issue).toEqual({kind: 'points', min: 2, max: 20});
    });

    it('sets the flags and chooses examples', () => {
        expect(must(setCorrelationResiduals(base, false)).model.residuals).toBe(false);
        expect(must(setCorrelationXOnY(base, true)).model.xOnY).toBe(true);
        expect(must(setCorrelationXOnY(base, false)).model).toBe(base);
        refused(setCorrelationResiduals(base, 'yes'));
        refused(setCorrelationXOnY(base, 1));
        const ring = must(chooseCorrelationExample({...base, xOnY: true}, 'ring')).model;
        expect(ring.points).toEqual(CORRELATION_EXAMPLES.ring);
        expect(ring.xOnY).toBe(true);
        refused(chooseCorrelationExample(base, 'anscombe'));
    });
});

describe('correlation model: check and parse', () => {
    const issue = (data: unknown) => {
        const check = checkCorrelationModel(data);
        expect(check.ok).toBe(false);
        return check.ok ? undefined : check.issue;
    };
    const good = {points: [[0, 1], [1, 2], [2, 2]], residuals: false, xOnY: true};

    it('accepts a valid model, copies it and drops unknown properties', () => {
        const parsed = parseCorrelationModel({...good, extra: 1});
        expect(parsed).toEqual(good);
        expect(parsed!.points).not.toBe(good.points);
        expect(parseCorrelationModel(DEFAULT_CORRELATION_MODEL)).toEqual(DEFAULT_CORRELATION_MODEL);
    });

    it('gives a distinct issue for each malformed case', () => {
        expect(issue(null)).toBeUndefined();
        expect(issue([])).toBeUndefined();
        expect(issue('x')).toBeUndefined();
        expect(issue({...good, points: 'abc'})).toEqual({kind: 'points', min: 2, max: 20});
        expect(issue({...good, points: [[0, 0]]})).toEqual({kind: 'points', min: 2, max: 20});
        expect(issue({...good, points: Array.from({length: 21}, (_, i) => [i / 10, 0])})).toEqual({kind: 'points', min: 2, max: 20});
        expect(parseCorrelationModel({...good, points: Array.from({length: 20}, (_, i) => [i / 10, 0])})).toBeDefined();
        const L = CORRELATION_COORDINATE_LIMIT;
        for (const p of [[L + 1, 0], [0, NaN], [0, '1'], [1], [1, 2, 3], 'ab', null]) {
            expect(issue({...good, points: [[0, 0], p, [1, 1]]})).toEqual({kind: 'coordinate', index: 1, limit: L});
        }
        expect(issue({...good, points: [[0, 0], [1, 1], [0.15, 2]]})).toEqual({kind: 'grid', index: 2});
        expect(issue({...good, points: [[0, 0], [1, 1.234], [0, 2]]})).toEqual({kind: 'grid', index: 1});
        expect(issue({...good, residuals: 1})).toEqual({kind: 'flag', field: 'residuals'});
        expect(issue({...good, xOnY: 'no'})).toEqual({kind: 'flag', field: 'xOnY'});
        expect(issue({points: good.points, residuals: true})).toEqual({kind: 'flag', field: 'xOnY'});
    });

    it('accepts tenths stored in floating point', () => {
        expect(parseCorrelationModel({...good, points: [[0.1 + 0.2, 1], [1, 2], [2, 2]]})!.points[0]).toEqual([0.3, 1]);
    });
});
