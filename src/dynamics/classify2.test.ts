import {describe, expect, it} from 'vitest';
import type {Mat2} from '../linear/matrix2';
import {classifyPlane, companionMatrix, PlaneType, traceDeterminant} from './classify2';

const grid = Array.from({length: 33}, (_, i) => i - 16); // entries times 4

/**
 * Independent oracle: the eigenvalues by the quadratic formula, with entries scaled by 4 so that everything is an
 * integer. Eigenvalues are (T +- sqrt(D)) / 8 with T = 4 tau and D = 16 Delta; only their signs are needed, and the
 * sign of p +- sqrt(q) is decided by integer comparison with p^2 vs q. No table in tau, delta is used.
 */
function oracle(a: number, b: number, c: number, d: number): PlaneType {
    const T = a + d;
    const D = T * T - 4 * (a * d - b * c);
    const scalar = b === 0 && c === 0 && a === d;
    const zero = a === 0 && b === 0 && c === 0 && d === 0;
    if (D < 0) return T === 0 ? {kind: 'centre'} : {kind: 'spiral', stability: T < 0 ? 'stable' : 'unstable'};
    // larger and smaller root signs (D >= 0): sign of T + sqrt(D) and T - sqrt(D)
    const signPlus = T >= 0 ? (T === 0 && D === 0 ? 0 : 1) : Math.sign(D - T * T);
    const signMinus = T <= 0 ? (T === 0 && D === 0 ? 0 : -1) : Math.sign(T * T - D);
    if (signPlus === 0 || signMinus === 0) {
        if (signPlus === 0 && signMinus === 0) return {kind: 'non-isolated', case: zero ? 'all-fixed' : 'shear-flow'};
        return {kind: 'non-isolated', case: 'line-of-equilibria'};
    }
    if (signPlus > 0 && signMinus < 0) return {kind: 'saddle'};
    const stability = signPlus < 0 ? 'stable' : 'unstable';
    if (D === 0) return {kind: scalar ? 'star-node' : 'degenerate-node', stability};
    return {kind: 'node', stability};
}

describe('classifyPlane', () => {
    it('matches the integer quadratic-formula oracle on all 33^4 snapped matrices', () => {
        const counts: Record<string, number> = {};
        for (const a of grid) for (const b of grid) for (const c of grid) for (const d of grid) {
            const m: Mat2 = [[a / 4, b / 4], [c / 4, d / 4]];
            const got = classifyPlane(m).type;
            const want = oracle(a, b, c, d);
            if (JSON.stringify(got) !== JSON.stringify(want)) {
                throw new Error(`${JSON.stringify(m)}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
            }
            counts[got.kind] = (counts[got.kind] ?? 0) + 1;
        }
        // every class is actually exercised
        for (const kind of ['saddle', 'node', 'star-node', 'degenerate-node', 'spiral', 'centre', 'non-isolated']) {
            expect(counts[kind]).toBeGreaterThan(0);
        }
        expect(Object.values(counts).reduce((s, n) => s + n, 0)).toBe(33 ** 4);
    });

    it('classifies the named examples', () => {
        const kind = (m: Mat2) => classifyPlane(m).type;
        expect(kind([[-4, -1], [-2, -3]])).toEqual({kind: 'node', stability: 'stable'});
        expect(classifyPlane([[-4, -1], [-2, -3]])).toMatchObject({tau: -7, delta: 10, discriminant: 9});
        expect(kind([[4, 1], [2, 3]])).toEqual({kind: 'node', stability: 'unstable'});
        expect(classifyPlane([[-0.25, -1], [1, -0.25]])).toMatchObject({tau: -0.5, delta: 1.0625, discriminant: -4});
        expect(kind([[-0.25, -1], [1, -0.25]])).toEqual({kind: 'spiral', stability: 'stable'});
        expect(kind([[0, -1], [1, 0]])).toEqual({kind: 'centre'});
        expect(classifyPlane([[1, 0], [0, -1]])).toMatchObject({tau: 0, delta: -1});
        expect(kind([[1, 0], [0, -1]])).toEqual({kind: 'saddle'});
        expect(kind([[-1, 0], [0, -1]])).toEqual({kind: 'star-node', stability: 'stable'});
        expect(kind([[1, 1], [0, 1]])).toEqual({kind: 'degenerate-node', stability: 'unstable'});
        expect(kind([[1, 0], [0, 0]])).toEqual({kind: 'non-isolated', case: 'line-of-equilibria'});
        expect(kind([[0, 1], [0, 0]])).toEqual({kind: 'non-isolated', case: 'shear-flow'});
        expect(kind([[0, 0], [0, 0]])).toEqual({kind: 'non-isolated', case: 'all-fixed'});
    });

    it('decides the boundaries exactly, with no tolerance', () => {
        // tau = 1/16 * 0 exactly: a tiny nonzero trace is a spiral, never a centre
        expect(classifyPlane([[0.25, -1], [1, -0.25]]).type).toEqual({kind: 'centre'});
        expect(classifyPlane([[0.25, -1], [1, 0]]).type).toEqual({kind: 'spiral', stability: 'unstable'});
        // a small trace with a negative Delta is a spiral; Delta = 0 a degenerate node; a small positive Delta a node
        expect(classifyPlane([[0.25, 0.25], [-0.25, 0.25]]).type).toEqual({kind: 'spiral', stability: 'unstable'});
        expect(classifyPlane([[0.5, 0.25], [0, 0.5]]).type).toEqual({kind: 'degenerate-node', stability: 'unstable'});
        expect(classifyPlane([[0.5, 0.25], [0, 0.25]]).type).toEqual({kind: 'node', stability: 'unstable'});
    });

    it('rejects entries off the quarter grid', () => {
        expect(() => classifyPlane([[0.1, 0], [0, 1]])).toThrow(RangeError);
        expect(() => traceDeterminant([[Number.NaN, 0], [0, 1]])).toThrow(RangeError);
    });

    it('reaches every trace-determinant point of the range with the companion matrix, never a star node', () => {
        for (let t4 = -16; t4 <= 16; t4++) {
            for (let d4 = -16; d4 <= 16; d4++) {
                const tau = t4 / 4;
                const delta = d4 / 4;
                const res = classifyPlane(companionMatrix(tau, delta));
                expect(res.tau).toBe(tau);
                expect(res.delta).toBe(delta);
                expect(res.discriminant).toBe(tau * tau - 4 * delta);
                expect(res.type.kind).not.toBe('star-node');
            }
        }
    });
});
