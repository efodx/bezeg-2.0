import {companionOfDrag, deriveIteration, deriveTraceDet, iterateAt, orbitPolyline, parabolaPolyline, TRACE_DET_VIEW} from './iterationScene';
import type {Mat2} from '../../linear/matrix2';

// The checked examples of docs/specs/linear-maps-lessons.md, L6 and L7.
const E: Mat2 = [[4, 1], [2, 3]];
const SPIRAL: Mat2 = [[1, -1], [1, 1]];
const SHEAR: Mat2 = [[1, 1], [0, 1]];
const POWER_TWO: Mat2 = [[2, 1], [1, 2]];

describe('iterateAt and deriveIteration (L6)', () => {
    test('A = ((2,1),(1,2)), v0 = (1,0): the iterates are ((3^k+1)/2, (3^k-1)/2); the Rayleigh quotient tends to 3 and the angle to 0', () => {
        const view = deriveIteration(POWER_TWO, [1, 0]);
        for (let k = 0; k <= 8; k++) expect(iterateAt(view, POWER_TWO, k).point).toEqual([(3 ** k + 1) / 2, (3 ** k - 1) / 2]);
        const last = iterateAt(view, POWER_TWO, 30);
        expect(last.rayleigh).toBeCloseTo(3, 10);
        expect(last.angleError).toBeLessThan(1e-9);
        expect(view.outcome).toBe('dominant');
    });

    test('E with v0 = (1, 0): the stretch tends to 5, the Rayleigh quotient to the dominant eigenvalue 5, the ratio |l2/l1| is 2/5', () => {
        const view = deriveIteration(E, [1, 0]);
        expect(iterateAt(view, E, 1).point).toEqual([4, 2]);
        const last = iterateAt(view, E, 30);
        expect(last.rayleigh).toBeCloseTo(5, 10);
        expect(last.stretch).toBeCloseTo(5, 10);
        expect(view.orbit.modulusRatio).toBeCloseTo(0.4, 12);
        expect(view.dominantLine?.[0]).toBeCloseTo(Math.SQRT1_2, 12);
        expect(iterateAt(view, E, 0).stretch).toBeUndefined();
        expect(iterateAt(view, E, 0).unit).toEqual([1, 0]);
    });

    test('E with v0 = (1, -2) stays on the other eigenvector: (2,-4), (4,-8), (8,-16); this is an exact status, not a tolerance', () => {
        const view = deriveIteration(E, [1, -2]);
        expect(view.otherEigenvector).toBe(true);
        expect([1, 2, 3].map(k => iterateAt(view, E, k).point)).toEqual([[2, -4], [4, -8], [8, -16]]);
        expect(deriveIteration(E, [1, 0]).otherEigenvector).toBe(false);
    });

    test('the spiral turns 45 degrees per step while the length grows by sqrt 2; no direction settles', () => {
        const view = deriveIteration(SPIRAL, [1, 0]);
        expect(view.outcome).toBe('rotating');
        const norms = [0, 1, 2, 3, 4].map(k => iterateAt(view, SPIRAL, k).norm);
        norms.forEach((norm, k) => expect(norm).toBeCloseTo(Math.SQRT2 ** k, 12));
        expect(iterateAt(view, SPIRAL, 2).point).toEqual([0, 2]);
        expect(iterateAt(view, SPIRAL, 3).angleError).toBeUndefined();
    });

    test('the shear: v0 = (0,1) gives (n, 1) and the angle arctan(1/n) (45, 5,71, 0,573 degrees), slowly', () => {
        const view = deriveIteration(SHEAR, [0, 1]);
        expect(view.outcome).toBe('defective');
        expect(iterateAt(view, SHEAR, 10).point).toEqual([10, 1]);
        for (const n of [1, 10, 30]) expect(iterateAt(view, SHEAR, n).angleError).toBeCloseTo(Math.atan(1 / n) * 180 / Math.PI, 8);
    });

    test('Q = ((0,3),(3,0)) flip-flops: equal moduli; the zero start has no direction and no Rayleigh quotient', () => {
        const q: Mat2 = [[0, 3], [3, 0]];
        const view = deriveIteration(q, [1, 0]);
        expect(view.outcome).toBe('equal-moduli');
        expect([1, 2, 3].map(k => iterateAt(view, q, k).point)).toEqual([[0, 3], [9, 0], [0, 27]]);
        const zero = iterateAt(deriveIteration(q, [0, 0]), q, 3);
        expect([zero.zero, zero.unit, zero.rayleigh]).toEqual([true, undefined, undefined]);
    });

    test('a nilpotent matrix collapses; the orbit polyline holds the iterates 0..step', () => {
        const nil: Mat2 = [[0, 1], [0, 0]];
        expect(deriveIteration(nil, [1, 1]).collapsed).toBe(true);
        expect(deriveIteration(E, [1, 0]).collapsed).toBe(false);
        const line = orbitPolyline(deriveIteration(POWER_TWO, [1, 0]), 2);
        expect(line.x).toEqual([1, 2, 5]);
        expect(line.y).toEqual([0, 1, 4]);
    });
});

describe('deriveTraceDet and the companion matrix (L7)', () => {
    const td = (m: Mat2) => deriveTraceDet(m);

    test('M = ((1/2,1/4),(1/4,1/2)): tau 1, delta 3/16, discriminant 1/4, inside the triangle, the flow grows', () => {
        const view = td([[0.5, 0.25], [0.25, 0.5]]);
        expect([view.tau, view.delta, view.discriminant]).toEqual([1, 3 / 16, 0.25]);
        expect(view.stability).toEqual({kind: 'inside'});
        expect(view.flowStable).toBe(false);
    });

    test('N = ((-4,-1),(-2,-3)): tau -7, delta 10, stable for the flow but outside the triangle', () => {
        const view = td([[-4, -1], [-2, -3]]);
        expect([view.tau, view.delta]).toEqual([-7, 10]);
        expect(view.stability).toEqual({kind: 'outside'});
        expect(view.flowStable).toBe(true);
    });

    test('the spiral is inside with discriminant -1; R is on the edge delta = 1; diag(2, 1/2) is outside; the shear sits on the vertex', () => {
        expect(td([[0.5, -0.5], [0.5, 0.5]])).toMatchObject({tau: 1, delta: 0.5, discriminant: -1, stability: {kind: 'inside'}});
        expect(td([[0, -1], [1, 0]]).stability).toMatchObject({kind: 'edge', edge: 'determinant-one'});
        expect(td([[2, 0], [0, 0.5]])).toMatchObject({tau: 2.5, delta: 1, stability: {kind: 'outside'}});
        const vertex = td(SHEAR);
        expect([vertex.tau, vertex.delta, vertex.discriminant]).toEqual([2, 1, 0]);
        expect(vertex.stability).toMatchObject({kind: 'edge'});
    });

    test('the two other edges name the eigenvalue 1 and -1', () => {
        expect(td([[1, 0], [0, 0.5]]).stability).toMatchObject({kind: 'edge', edge: 'eigenvalue-one'});
        expect(td([[-1, 0], [0, 0.5]]).stability).toMatchObject({kind: 'edge', edge: 'eigenvalue-minus-one'});
    });

    test('a drag writes the companion matrix ((0,1),(-delta,tau)) with no negative zero, and its trace and determinant are the dragged point', () => {
        const m = companionOfDrag(1, 0.25);
        expect(m).toEqual([[0, 1], [-0.25, 1]]);
        expect(td(m)).toMatchObject({tau: 1, delta: 0.25, stability: {kind: 'inside'}, flowStable: false});
        const origin = companionOfDrag(0, 0);
        expect(origin.flat().some(value => Object.is(value, -0))).toBe(false);
    });

    test('the parabola stays inside the view and is delta = tau^2 / 4', () => {
        const line = parabolaPolyline();
        expect(line.x.length).toBeGreaterThan(50);
        line.x.forEach((x, i) => {
            expect(line.y[i]).toBeCloseTo(x * x / 4, 12);
            expect(line.y[i]).toBeLessThanOrEqual(TRACE_DET_VIEW[1]);
        });
    });
});
