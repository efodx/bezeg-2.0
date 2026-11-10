import {classifyEigen} from './eigen2';
import {discriminant, LINEAR_MAP_EXAMPLES, Mat2, trace, det} from './matrix2';
import {
    companion, discreteStability, discreteStabilityTD, exactTraceDet, flowStability, flowStabilityTD,
} from './stability2';

const ex = LINEAR_MAP_EXAMPLES;
const E = ex['eigen-default'];
const R = ex['quarter-turn'];
const S = ex.shear;
const M: Mat2 = [[1 / 2, 1 / 4], [1 / 4, 1 / 2]];
const N: Mat2 = [[-4, -1], [-2, -3]];
const SPIRAL: Mat2 = [[1 / 2, -1 / 2], [1 / 2, 1 / 2]];
const DIAG: Mat2 = [[2, 0], [0, 1 / 2]];

/** Moduli of the eigenvalues from the characteristic polynomial x^2 - tau x + delta in doubles (no classifyEigen). */
function moduli(m: Mat2): [number, number] {
    const tau = m[0][0] + m[1][1];
    const delta = m[0][0] * m[1][1] - m[0][1] * m[1][0];
    const disc = tau * tau - 4 * delta;
    if (disc < 0) return [Math.sqrt(delta), Math.sqrt(delta)];
    const q = -(tau + (tau >= 0 ? 1 : -1) * Math.sqrt(disc)) / 2; // stable quadratic formula; roots q and delta / q
    return q === 0 ? [0, 0] : [Math.abs(q), Math.abs(delta / q)];
}

describe('L7 checked numbers', () => {
    it('lists tau, delta and Delta exactly', () => {
        const rows: [Mat2, number, number, number][] = [
            [M, 1, 3 / 16, 1 / 4], [N, -7, 10, 9], [SPIRAL, 1, 1 / 2, -1], [R, 0, 1, -4], [DIAG, 5 / 2, 1, 9 / 4],
            [S, 2, 1, 0], [E, 7, 10, 9],
        ];
        for (const [m, tau, delta, disc] of rows) {
            expect(exactTraceDet(m)).toEqual({tau, delta});
            expect(trace(m)).toBe(tau);
            expect(det(m)).toBe(delta);
            expect(discriminant(m)).toBe(disc);
        }
    });

    it('classifies the listed examples', () => {
        expect(discreteStability(M)).toEqual({kind: 'inside'});
        expect(flowStability(M)).toBe(false);
        expect(discreteStability(N)).toEqual({kind: 'outside'});
        expect(flowStability(N)).toBe(true);
        expect(discreteStability(SPIRAL)).toEqual({kind: 'inside'});
        expect(discreteStability(R)).toEqual({kind: 'edge', edge: 'determinant-one', edges: ['determinant-one']});
        expect(discreteStability(DIAG)).toEqual({kind: 'outside'}); // on the line delta = 1, |tau| > 2
        expect(discreteStability(S)).toEqual({
            kind: 'edge', edge: 'determinant-one', edges: ['determinant-one', 'eigenvalue-one'],
        });
        expect(discreteStability(E)).toEqual({kind: 'outside'});
        expect(flowStability(E)).toBe(false);
        expect(flowStability(R)).toBe(false); // tau = 0
    });

    it('matches eigenvalue moduli to 1e-12', () => {
        expect(moduli(M).sort()).toEqual([0.25, 0.75]);
        expect(classifyEigen(M)).toMatchObject({kind: 'distinct-real'});
        expect(moduli(N).sort((p, q) => p - q)[0]).toBeCloseTo(2, 12);
        expect(moduli(N).sort((p, q) => p - q)[1]).toBeCloseTo(5, 12);
        expect(moduli(SPIRAL)[0]).toBeCloseTo(Math.sqrt(0.5), 12);
        expect(moduli(SPIRAL)[0]).toBeCloseTo(0.7071, 4);
        expect(moduli(DIAG).sort((p, q) => p - q)).toEqual([0.5, 2]);
    });
});

describe('triangle edges and vertices (exact)', () => {
    it('inside only for delta < 1 and |tau| < 1 + delta', () => {
        expect(discreteStabilityTD(0, 0).kind).toBe('inside');
        expect(discreteStabilityTD(1.5, 0.75).kind).toBe('inside');
        expect(discreteStabilityTD(1.75, 0.75).kind).toBe('edge');
        expect(discreteStabilityTD(0, 0.9375).kind).toBe('inside');
        expect(discreteStabilityTD(0, 1)).toMatchObject({kind: 'edge', edge: 'determinant-one'});
        expect(discreteStabilityTD(0, 1.0625).kind).toBe('outside');
    });

    it('delta = 1 is an edge (not inside) for |tau| <= 2 and outside beyond', () => {
        for (const tau of [-2, -1.5, -0.0625, 0, 1, 2]) {
            expect(discreteStabilityTD(tau, 1)).toMatchObject({kind: 'edge'});
        }
        expect(discreteStabilityTD(2.0625, 1)).toEqual({kind: 'outside'});
        expect(discreteStabilityTD(-2.0625, 1)).toEqual({kind: 'outside'});
    });

    it('tau = +-(1 + delta) are edges only for -1 <= delta <= 1', () => {
        expect(discreteStabilityTD(1.5, 0.5)).toMatchObject({kind: 'edge', edge: 'eigenvalue-one'});
        expect(discreteStabilityTD(-1.5, 0.5)).toMatchObject({kind: 'edge', edge: 'eigenvalue-minus-one'});
        expect(discreteStabilityTD(0, -1)).toMatchObject({kind: 'edge', edges: ['eigenvalue-one', 'eigenvalue-minus-one']});
        expect(discreteStabilityTD(-0.5, -1.5).kind).toBe('outside'); // the line beyond the vertex (0, -1)
        expect(discreteStabilityTD(3, 2).kind).toBe('outside'); // the line beyond the vertex (2, 1)
        expect(discreteStabilityTD(-2, 1)).toMatchObject({kind: 'edge', edges: ['determinant-one', 'eigenvalue-minus-one']});
    });

    it('flow stability is tau < 0 and delta > 0, strictly', () => {
        expect(flowStabilityTD(-0.0625, 0.0625)).toBe(true);
        expect(flowStabilityTD(0, 1)).toBe(false);
        expect(flowStabilityTD(-1, 0)).toBe(false);
        expect(flowStabilityTD(-1, -1)).toBe(false);
    });

    it('throws off the quarter grid', () => {
        expect(() => discreteStability([[0.3, 0], [0, 1]])).toThrow(RangeError);
        expect(() => flowStability([[0.3, 0], [0, 1]])).toThrow(RangeError);
    });
});

describe('the stability triangle claim over 2000 seeded matrices', () => {
    function seeded(seed: number): () => number {
        let state = seed >>> 0;
        return () => {
            state = (state + 0x6d2b79f5) >>> 0;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    it('inside agrees with max |lambda| < 1; matrices within 1e-9 of an edge are listed and excluded', () => {
        const random = seeded(20261110);
        const entry = () => Math.floor(random() * 33) / 4 - 4;
        const nearEdge: Mat2[] = [];
        let compared = 0;
        let inside = 0;
        let outsideOrEdge = 0;
        for (let k = 0; k < 2000; k++) {
            const m: Mat2 = [[entry(), entry()], [entry(), entry()]];
            const tau = m[0][0] + m[1][1];
            const delta = m[0][0] * m[1][1] - m[0][1] * m[1][0];
            if (Math.abs(delta - 1) < 1e-9 || Math.abs(tau - (1 + delta)) < 1e-9 || Math.abs(tau + (1 + delta)) < 1e-9) {
                nearEdge.push(m);
                continue;
            }
            const [l1, l2] = moduli(m);
            const stable = Math.max(l1, l2) < 1;
            expect(discreteStability(m).kind === 'inside').toBe(stable);
            compared++;
            if (stable) inside++; else outsideOrEdge++;
        }
        expect(compared + nearEdge.length).toBe(2000);
        expect(nearEdge.length).toBeGreaterThan(0);
        expect(nearEdge.length).toBeLessThan(400);
        expect(inside).toBeGreaterThan(20);
        expect(outsideOrEdge).toBeGreaterThan(50);
        // The excluded ones are exactly classified as well: never inside unless the edge line is outside the segment.
        for (const m of nearEdge) {
            const kind = discreteStability(m).kind;
            const maxModulus = Math.max(...moduli(m));
            if (kind === 'inside') throw new Error('an edge-line matrix cannot be inside');
            if (kind === 'edge') expect(Math.abs(maxModulus - 1)).toBeLessThan(1e-6);
        }
    });
});

describe('non-finite (tau, delta)', () => {
    it('is rejected with a RangeError, finite off-grid points are accepted', () => {
        expect(() => discreteStabilityTD(NaN, 0)).toThrow(RangeError);
        expect(() => flowStabilityTD(0, Infinity)).toThrow(RangeError);
        expect(() => companion(Infinity, 1)).toThrow(RangeError);
        expect(discreteStabilityTD(0.1, 0.1).kind).toBe('inside');
    });
});

describe('companion', () => {
    it('has the given trace and determinant', () => {
        for (const [tau, delta] of [[0, 1], [-7, 10], [1, 3 / 16], [2, 1], [0, 0], [-4, 4]]) {
            const c = companion(tau, delta);
            expect(c).toEqual([[0, 1], [-delta + 0, tau]]);
            expect(trace(c)).toBe(tau);
            expect(det(c) + 0).toBe(delta);
            expect(Object.is(c[1][0], -0)).toBe(false);
        }
    });

    it('keeps the stability class of its (tau, delta)', () => {
        expect(discreteStability(companion(1, 1 / 4))).toEqual({kind: 'inside'});
        expect(discreteStability(companion(2, 1))).toMatchObject({kind: 'edge'});
        expect(flowStability(companion(-3, 2))).toBe(true);
    });
});
