import {describe, expect, it} from 'vitest';
import {bezierPieces, blossom, deBoorTriangle, evaluate} from './index';

const TOL = 1e-12;

function seeded(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

const P2 = [[0, 0], [1, 2], [3, 2], [4, 0]];
const U2 = [0, 0, 0, 1, 2, 2, 2];
const P3 = [[0, 0], [1, 3], [2, -1], [4, 2], [5, 0], [6, 4]];
const U3 = [0, 0, 0, 0, 1, 2, 3, 3, 3, 3];

function f(u: number[], k: number, P: number[][], segment: number, args: number[]): number[] {
    const r = blossom(u, k, P, segment, args);
    if (!r.ok) {
        throw new Error(r.reason);
    }
    return r.point;
}

function expectClose(actual: number[], expected: number[]): void {
    expect(actual).toHaveLength(expected.length);
    expected.forEach((v, i) => expect(Math.abs(actual[i] - v)).toBeLessThan(TOL));
}

describe('blossom: L2 example values (acceptance 1)', () => {
    // Segment 2 is [0,1), segment 3 is [1,2); each argument pair lies in the closed support of the segment used.
    it('control points d_i = f(u_{i+1}, u_{i+2})', () => {
        expectClose(f(U2, 2, P2, 2, [0, 0]), [0, 0]);
        expectClose(f(U2, 2, P2, 2, [0, 1]), [1, 2]);
        expectClose(f(U2, 2, P2, 3, [1, 2]), [3, 2]);
        expectClose(f(U2, 2, P2, 3, [2, 2]), [4, 0]);
    });

    it('de Boor triangle values at 0.5 (segment 2)', () => {
        expectClose(f(U2, 2, P2, 2, [0, 0.5]), [0.5, 1]);
        expectClose(f(U2, 2, P2, 2, [0.5, 1]), [1.5, 2]);
        expectClose(f(U2, 2, P2, 2, [0.5, 0.5]), [1, 1.5]);
        const triangle = deBoorTriangle(U2, 2, P2, 0.5);
        expectClose(triangle.levels[1][0].point, [0.5, 1]);
        expectClose(triangle.levels[1][1].point, [1.5, 2]);
        expectClose(triangle.levels[2][0].point, [1, 1.5]);
    });

    it('Bezier piece on [0,1] equals f(0,0), f(0,1), f(1,1)', () => {
        const piece = bezierPieces(U2, 2, P2).pieces[0];
        expect(piece.start).toBe(0);
        expect(piece.end).toBe(1);
        const pts = [[0, 0], [0, 1], [1, 1]].map((a) => f(U2, 2, P2, 2, a));
        expectClose(pts[0], [0, 0]);
        expectClose(pts[1], [1, 2]);
        expectClose(pts[2], [2, 2]);
        pts.forEach((p, i) => expectClose(p, piece.points[i]));
    });

    it('exposes the interpolation levels', () => {
        const r = blossom(U2, 2, P2, 2, [0, 0.5]);
        if (!r.ok) throw new Error(r.reason);
        expect(r.triangle.segment).toBe(2);
        expect(r.triangle.levels.map((l) => l.length)).toEqual([3, 2, 1]);
        expectClose(r.triangle.levels[2][0], r.point);
    });
});

describe('blossom: symmetry (acceptance 2)', () => {
    it('f(a,b) = f(b,a) for random pairs, any real values', () => {
        const rnd = seeded(7);
        for (let i = 0; i < 50; i++) {
            const a = rnd() * 6 - 2;
            const b = rnd() * 6 - 2;
            const seg = 2 + (i % 2);
            expectClose(f(U2, 2, P2, seg, [a, b]), f(U2, 2, P2, seg, [b, a]));
        }
    });

    it('all 6 permutations of (a,b,c) agree on a cubic', () => {
        const rnd = seeded(11);
        const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
        for (let i = 0; i < 30; i++) {
            const abc = [rnd() * 5 - 1, rnd() * 5 - 1, rnd() * 5 - 1];
            const seg = 3 + (i % 3);
            const ref = f(U3, 3, P3, seg, abc);
            for (const p of perms) {
                expectClose(f(U3, 3, P3, seg, p.map((x) => abc[x])), ref);
            }
        }
    });
});

describe('blossom: diagonal and Bezier points (acceptance 3)', () => {
    it('f(t,...,t) equals evaluate in every segment, k = 2 and 3', () => {
        const cases: [number[], number, number[][]][] = [[U2, 2, P2], [U3, 3, P3]];
        for (const [u, k, P] of cases) {
            for (let seg = k; seg < u.length - k - 1; seg++) {
                if (!(u[seg] < u[seg + 1])) continue;
                for (const s of [0, 0.1, 0.5, 0.9]) {
                    const t = u[seg] + s * (u[seg + 1] - u[seg]);
                    expectClose(f(u, k, P, seg, Array(k).fill(t)), evaluate(u, k, P, t));
                }
            }
        }
    });

    it('cubic Bezier points f(u_j^{3-i}, u_{j+1}^i) equal bezierPieces', () => {
        const pieces = bezierPieces(U3, 3, P3).pieces;
        expect(pieces).toHaveLength(3);
        for (const piece of pieces) {
            const seg = U3.indexOf(piece.start, 3);
            expect(U3[seg + 1]).toBe(piece.end);
            for (let i = 0; i <= 3; i++) {
                const args = [...Array(3 - i).fill(piece.start), ...Array(i).fill(piece.end)];
                expectClose(f(U3, 3, P3, seg, args), piece.points[i]);
            }
        }
    });
});

describe('blossom: refusals (acceptance 4)', () => {
    const reason = (r: ReturnType<typeof blossom>) => (r.ok ? 'ok' : r.reason);
    it('refuses degrees other than 2 and 3', () => {
        expect(reason(blossom([0, 0, 1, 1], 1, [[0], [1]], 1, [0.5]))).toBe('unsupported_degree');
        const u4 = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
        const P4 = [[0], [1], [2], [3], [4]];
        expect(reason(blossom(u4, 4, P4, 4, [0, 0, 0, 0]))).toBe('unsupported_degree');
    });
    it('refuses a wrong argument count and non-finite arguments', () => {
        expect(reason(blossom(U2, 2, P2, 2, [0.5]))).toBe('wrong_argument_count');
        expect(reason(blossom(U3, 3, P3, 3, [0, 1]))).toBe('wrong_argument_count');
        expect(reason(blossom(U2, 2, P2, 2, [0.5, NaN]))).toBe('not_finite');
        expect(reason(blossom(U2, 2, P2, 2, [Infinity, 0]))).toBe('not_finite');
    });
    it('refuses empty or out-of-range segments', () => {
        expect(reason(blossom(U2, 2, P2, 1, [0, 0]))).toBe('bad_segment'); // [0,0) is empty
        expect(reason(blossom(U2, 2, P2, 4, [0, 0]))).toBe('bad_segment'); // [2,2) is empty
        expect(reason(blossom(U2, 2, P2, 0, [0, 0]))).toBe('bad_segment');
        expect(reason(blossom(U2, 2, P2, 9, [0, 0]))).toBe('bad_segment');
        expect(reason(blossom(U2, 2, P2, 2.5, [0, 0]))).toBe('bad_segment');
    });
});
