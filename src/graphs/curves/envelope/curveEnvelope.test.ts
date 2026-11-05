import {
    COLLINEAR_TOLERANCE, ENVELOPE_LINES_MAX, envelopeFamily, envelopeParameters, isCollinear, tangentSegment,
} from './curveEnvelope';

const QUADRATIC = [[1, 0], [0, 0], [0, 1]];
const CUBIC = [[-2, -1], [-1, 3], [2, 2.5], [3, -1.5]];
const QUARTIC = [[0, 0], [1, 2], [3, 3], [4, 0.5], [6, 1]];

function binomial(n: number, k: number): number {
    let result = 1;
    for (let i = 1; i <= k; i++) result = result * (n - k + i) / i;
    return result;
}

/** The Bernstein form of the curve point, independent of the de Casteljau scheme. */
function bernstein(rows: number[][], t: number): [number, number] {
    const n = rows.length - 1;
    let x = 0, y = 0;
    rows.forEach((row, i) => {
        const weight = binomial(n, i) * t ** i * (1 - t) ** (n - i);
        x += weight * row[0];
        y += weight * row[1];
    });
    return [x, y];
}

/** B'(t) from the hodograph formula n * sum of (P_{i+1} - P_i) B_i^{n-1}. */
function derivative(rows: number[][], t: number): [number, number] {
    const n = rows.length - 1;
    const differences = rows.slice(1).map((row, i) => [row[0] - rows[i][0], row[1] - rows[i][1]]);
    const [x, y] = bernstein(differences, t);
    return [n * x, n * y];
}

const cross = (a: readonly number[], b: readonly number[]) => a[0] * b[1] - a[1] * b[0];
const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1];

describe('the touching point and the tangent segment', () => {
    test.each([['quadratic', QUADRATIC], ['cubic', CUBIC], ['quartic', QUARTIC]])('%s: B(t) is the Bernstein point and lies on the segment', (_name, rows) => {
        for (const t of [0, 0.1, 0.25, 0.5, 0.8, 1]) {
            const segment = tangentSegment(rows, t)!;
            const expected = bernstein(rows, t);
            expect(segment.touch[0]).toBeCloseTo(expected[0], 9);
            expect(segment.touch[1]).toBeCloseTo(expected[1], 9);
            const direction = [segment.q1[0] - segment.q0[0], segment.q1[1] - segment.q0[1]];
            const offset = [segment.touch[0] - segment.q0[0], segment.touch[1] - segment.q0[1]];
            expect(Math.abs(cross(direction, offset))).toBeLessThan(1e-9);
            // B(t) = (1 - t) Q0 + t Q1: between the ends for t in [0, 1].
            expect(dot(offset, direction)).toBeGreaterThan(-1e-9);
            expect(dot(offset, direction)).toBeLessThan(dot(direction, direction) + 1e-9);
        }
    });

    test.each([['quadratic', QUADRATIC], ['cubic', CUBIC], ['quartic', QUARTIC]])('%s: the segment is parallel to B\'(t), and equals it divided by the degree', (_name, rows) => {
        const n = rows.length - 1;
        for (const t of [0.1, 0.3, 0.5, 0.9]) {
            const segment = tangentSegment(rows, t)!;
            const direction = [segment.q1[0] - segment.q0[0], segment.q1[1] - segment.q0[1]];
            const hodograph = derivative(rows, t);
            expect(direction[0] * n).toBeCloseTo(hodograph[0], 9);
            expect(direction[1] * n).toBeCloseTo(hodograph[1], 9);
            // Independent check by a central finite difference.
            const h = 1e-5;
            const ahead = bernstein(rows, t + h), behind = bernstein(rows, t - h);
            const numeric = [(ahead[0] - behind[0]) / (2 * h), (ahead[1] - behind[1]) / (2 * h)];
            expect(Math.abs(cross(direction, numeric)) / Math.hypot(...numeric) / Math.hypot(...direction)).toBeLessThan(1e-6);
        }
    });

    test('degree 1 is the control segment itself, with the point on it', () => {
        const segment = tangentSegment([[0, 0], [4, 2]], 0.25)!;
        expect(segment.q0).toEqual([0, 0]);
        expect(segment.q1).toEqual([4, 2]);
        expect(segment.touch).toEqual([1, 0.5]);
    });

    test('fewer than two points or non-finite input has no segment', () => {
        expect(tangentSegment([[1, 1]], 0.5)).toBeUndefined();
        expect(tangentSegment([], 0.5)).toBeUndefined();
        expect(tangentSegment(QUADRATIC, NaN)).toBeUndefined();
        expect(tangentSegment([[0, 0], [NaN, 1], [1, 1]], 0.5)).toBeUndefined();
    });
});

describe('the family parameters', () => {
    test('are interior and evenly spaced, and one line is t = 1/2', () => {
        expect(envelopeParameters(1)).toEqual([0.5]);
        expect(envelopeParameters(3)).toEqual([0.25, 0.5, 0.75]);
        const many = envelopeParameters(16);
        expect(many).toHaveLength(16);
        many.forEach((t, i) => expect(t).toBeCloseTo((i + 1) / 17, 15));
    });

    test('are capped at 200 and empty for a non-integer or non-positive count', () => {
        expect(envelopeParameters(1000)).toHaveLength(ENVELOPE_LINES_MAX);
        expect(envelopeParameters(0)).toEqual([]);
        expect(envelopeParameters(2.5)).toEqual([]);
        expect(envelopeParameters(NaN)).toEqual([]);
    });
});

/** The finite runs of a NaN-separated pair of arrays. */
function runs(x: number[], y: number[]): number[][][] {
    const result: number[][][] = [[]];
    x.forEach((value, i) => {
        if (Number.isNaN(value)) { expect(Number.isNaN(y[i])).toBe(true); result.push([]); } else result[result.length - 1].push([value, y[i]]);
    });
    return result.filter(run => run.length);
}

describe('the family polyline', () => {
    test.each([1, 16, 200])('N = %i holds exactly N two-point segments with NaN breaks between them', count => {
        const family = envelopeFamily(QUADRATIC, count);
        expect(family.x).toHaveLength(3 * count - 1);
        expect(family.y).toHaveLength(3 * count - 1);
        const segments = runs(family.x, family.y);
        expect(segments).toHaveLength(count);
        segments.forEach(segment => expect(segment).toHaveLength(2));
        expect(family.x.filter(Number.isNaN)).toHaveLength(count - 1);
    });

    test('on the default curve every line satisfies x/(1-t) + y/t = 1 at both ends, and the touching point lies on sqrt(x) + sqrt(y) = 1', () => {
        const count = 16;
        const segments = runs(...(Object.values(envelopeFamily(QUADRATIC, count)) as [number[], number[]]));
        envelopeParameters(count).forEach((t, i) => {
            for (const [x, y] of segments[i]) expect(x / (1 - t) + y / t).toBeCloseTo(1, 12);
            const touch = tangentSegment(QUADRATIC, t)!.touch;
            expect(Math.sqrt(touch[0]) + Math.sqrt(touch[1])).toBeCloseTo(1, 12);
        });
    });

    test('is empty without a curve', () => {
        expect(envelopeFamily([[1, 1]], 5)).toEqual({x: [], y: []});
    });

    test('collinear controls make every segment lie on the one line, without NaN inside a segment', () => {
        const rows = [[0, 0], [1, 1], [3, 3]];
        const segments = runs(...(Object.values(envelopeFamily(rows, 10)) as [number[], number[]]));
        expect(segments).toHaveLength(10);
        segments.flat().forEach(([x, y]) => { expect(Number.isFinite(x)).toBe(true); expect(x).toBeCloseTo(y, 12); });
    });
});

describe('isCollinear', () => {
    test('is false for a proper quadratic, cubic and quartic', () => {
        expect(isCollinear(QUADRATIC)).toBe(false);
        expect(isCollinear(CUBIC)).toBe(false);
        expect(isCollinear(QUARTIC)).toBe(false);
    });

    test('is true for points on a line, in any order, on a slanted line, and for coincident points', () => {
        expect(isCollinear([[0, 0], [2, 1], [4, 2]])).toBe(true);
        expect(isCollinear([[4, 2], [0, 0], [2, 1], [-2, -1]])).toBe(true);
        expect(isCollinear([[1, 1], [1, 1], [1, 1]])).toBe(true);
        expect(isCollinear([[1, 1], [1, 1], [3, 0]])).toBe(true);
        expect(isCollinear([[0, 0], [1, 1]])).toBe(true);
    });

    test('is relative to the size: a tiny but proportionally large bend is not collinear, a large drift of 1e-12 relative is', () => {
        expect(isCollinear([[0, 0], [5e-7, 1e-6], [1e-6, 0]])).toBe(false);
        expect(isCollinear([[0, 0], [5e6, 1e6 * (1 + 0.1 * COLLINEAR_TOLERANCE)], [1e7, 2e6]])).toBe(true);
        expect(isCollinear([[0, 0], [1, 1e-6], [2, 0]])).toBe(false);
    });
});
