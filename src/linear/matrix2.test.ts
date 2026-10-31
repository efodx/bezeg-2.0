import {
    apply, det, discriminant, IDENTITY, inverse, isLinearMapExampleId, isMatrixEntry, isSnappedMatrix, LINEAR_MAP_EXAMPLE_IDS,
    LINEAR_MAP_EXAMPLES, Mat2, MATRIX_ENTRY_MAX, MATRIX_ENTRY_MIN, MATRIX_ENTRY_STEP, multiply, orientationSign, snapMatrix,
    snapMatrixEntry, symmetricPart, trace, transpose, unitSquareImage, Vec2,
} from './matrix2';

const ex = LINEAR_MAP_EXAMPLES;
const A = ex['basis-default'];
const B = ex['orientation-reversing'];
const C = ex.singular;
const E = ex['eigen-default'];

/** Signed shoelace area, independent of the kernel. */
const shoelace = (pts: readonly Vec2[]): number => {
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        sum += x1 * y2 - x2 * y1;
    }
    return sum / 2;
};

/** Independent Bernstein evaluation of a cubic. */
const bernstein = (p: readonly Vec2[], t: number): Vec2 => {
    const w = [(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3];
    return [0, 1].map((k) => w.reduce((s, wi, i) => s + wi * p[i][k], 0)) as unknown as Vec2;
};

/** Independent de Casteljau evaluation. */
const casteljau = (p: readonly Vec2[], t: number): Vec2 => {
    let q = p.map((v) => [...v] as [number, number]);
    while (q.length > 1) {
        q = q.slice(1).map((v, i) => [(1 - t) * q[i][0] + t * v[0], (1 - t) * q[i][1] + t * v[1]]);
    }
    return q[0];
};

describe('matrix operations', () => {
    it('applies a matrix as x*a1 + y*a2', () => {
        expect(apply(A, [1, 0])).toEqual([2, 1]);
        expect(apply(A, [0, 1])).toEqual([-1, 1]);
        expect(apply(A, [1, 1])).toEqual([1, 2]);
        expect(apply(C, [2, -1])).toEqual([0, 0]);
        expect(apply(IDENTITY, [3, -5])).toEqual([3, -5]);
    });

    it('multiplies as composition B A (first A)', () => {
        expect(multiply(B, A)).toEqual([[4, 1], [5, -1]]);
        expect(multiply(A, B)).toEqual([[0, 3], [3, 3]]);
        const p: Vec2 = [3, -2];
        expect(apply(multiply(B, A), p)).toEqual(apply(B, apply(A, p)));
        const R = ex['quarter-turn'];
        const F = ex['reflection-x'];
        expect(multiply(R, F).flat().map((v) => v + 0)).toEqual([[0, 1], [1, 0]].flat());
        expect(multiply(F, R).flat().map((v) => v + 0)).toEqual([[0, -1], [-1, 0]].flat());
        expect(multiply(R, R).flat().map((v) => v + 0)).toEqual([[-1, 0], [0, -1]].flat());
    });

    it('computes det and trace', () => {
        expect([det(A), det(B), det(C), det(E)]).toEqual([3, -3, 0, 10]);
        expect([trace(A), trace(E)]).toEqual([3, 7]);
        expect(det(multiply(A, E))).toBe(30);
        expect(discriminant(E)).toBe(9);
        expect(discriminant(ex['quarter-turn'])).toBe(-4);
        expect(discriminant(ex.shear)).toBe(0);
    });

    it('inverts nonsingular matrices and refuses det = 0', () => {
        expect(inverse(C)).toBeUndefined();
        expect(inverse([[0, 0], [0, 0]])).toBeUndefined();
        expect(inverse(A)).toEqual([[1 / 3, 1 / 3], [-1 / 3, 2 / 3]]);
        expect(multiply(ex['scalar-2'], inverse(ex['scalar-2'])!)).toEqual(IDENTITY);
        const inv = inverse(E)!;
        const prod = multiply(E, inv);
        expect(prod[0][0]).toBeCloseTo(1, 14);
        expect(prod[0][1]).toBeCloseTo(0, 14);
        expect(Object.is(inverse([[1, 0], [0, 1]])![0][1], 0)).toBe(true);
    });

    it('transposes, takes the symmetric part and the orientation sign', () => {
        expect(transpose(E)).toEqual([[4, 2], [1, 3]]);
        expect(symmetricPart(E)).toEqual([[4, 1.5], [1.5, 3]]);
        expect(symmetricPart(ex.symmetric)).toEqual(ex.symmetric);
        expect([orientationSign(A), orientationSign(B), orientationSign(C)]).toEqual([1, -1, 0]);
    });
});

describe('matrix entry snapping', () => {
    it('exposes the quarter grid policy', () => {
        expect([MATRIX_ENTRY_STEP, MATRIX_ENTRY_MIN, MATRIX_ENTRY_MAX]).toEqual([0.25, -4, 4]);
    });

    it('snaps to the nearest quarter, clamps, and never returns -0', () => {
        expect(snapMatrixEntry(0.1)).toBe(0);
        expect(snapMatrixEntry(0.13)).toBe(0.25);
        expect(snapMatrixEntry(-0.1)).toBe(0);
        expect(Object.is(snapMatrixEntry(-0.1), 0)).toBe(true);
        expect(snapMatrixEntry(1.37)).toBe(1.25);
        expect(snapMatrixEntry(-2.4)).toBe(-2.5);
        expect(snapMatrixEntry(7)).toBe(4);
        expect(snapMatrixEntry(-100)).toBe(-4);
        expect(snapMatrix([[0.3, 9], [-9, 1.1]])).toEqual([[0.25, 4], [-4, 1]]);
    });

    it('rejects non-finite input instead of snapping it', () => {
        for (const bad of [NaN, Infinity, -Infinity]) {
            expect(() => snapMatrixEntry(bad)).toThrow(RangeError);
            expect(isMatrixEntry(bad)).toBe(false);
        }
        expect(isMatrixEntry('1')).toBe(false);
        expect(isMatrixEntry(undefined)).toBe(false);
    });

    it('recognises snapped entries and matrices', () => {
        expect(isMatrixEntry(0.25)).toBe(true);
        expect(isMatrixEntry(-4)).toBe(true);
        expect(isMatrixEntry(4.25)).toBe(false);
        expect(isMatrixEntry(0.1)).toBe(false);
        expect(isSnappedMatrix(A)).toBe(true);
        expect(isSnappedMatrix([[0.1, 0], [0, 1]])).toBe(false);
        expect(isSnappedMatrix([[5, 0], [0, 1]])).toBe(false);
        expect(isSnappedMatrix([[1, 0]])).toBe(false);
        expect(isSnappedMatrix([[1, 0, 0], [0, 1, 0]])).toBe(false);
        expect(isSnappedMatrix(null)).toBe(false);
        expect(isSnappedMatrix([[NaN, 0], [0, 1]])).toBe(false);
    });
});

describe('examples and defaults', () => {
    it('lists the closed example set, all snapped', () => {
        expect([...LINEAR_MAP_EXAMPLE_IDS]).toHaveLength(11);
        expect(Object.keys(ex).sort()).toEqual([...LINEAR_MAP_EXAMPLE_IDS].sort());
        for (const id of LINEAR_MAP_EXAMPLE_IDS) {
            expect(isLinearMapExampleId(id)).toBe(true);
            expect(isSnappedMatrix(ex[id])).toBe(true);
        }
        expect(isLinearMapExampleId('nope')).toBe(false);
        expect(isLinearMapExampleId(3)).toBe(false);
    });

    it('matches the spec numbers (L1, L2)', () => {
        expect(A).toEqual([[2, -1], [1, 1]]);
        expect(apply(A, [1, 1])).toEqual([1, 2]);
        const P: Vec2[] = [[1, 0], [2, 3], [4, 2], [5, -1]];
        const image = P.map((p) => apply(A, p));
        expect(image).toEqual([[2, 1], [1, 5], [6, 6], [11, 4]]);
        expect(bernstein(P, 0.5)[0]).toBeCloseTo(3, 12);
        expect(bernstein(P, 0.5)[1]).toBeCloseTo(1.75, 12);
        for (const evaluate of [bernstein, casteljau]) {
            const mapped = apply(A, evaluate(P, 0.5));
            const onImage = evaluate(image, 0.5);
            expect(mapped[0]).toBeCloseTo(17 / 4, 12);
            expect(mapped[1]).toBeCloseTo(19 / 4, 12);
            expect(Math.abs(mapped[0] - onImage[0])).toBeLessThan(1e-12);
            expect(Math.abs(mapped[1] - onImage[1])).toBeLessThan(1e-12);
        }
        // midpoint of P0P3 maps to the midpoint of the image points (exact)
        expect(apply(A, [3, -1 / 2])).toEqual([13 / 2, 5 / 2]);
        expect(unitSquareImage(A)).toEqual([[0, 0], [2, 1], [1, 2], [-1, 1]]);
        expect(shoelace(unitSquareImage(A))).toBe(3);
        expect(shoelace(unitSquareImage(B))).toBe(-3);
        expect(shoelace(unitSquareImage(C))).toBe(0);
        expect(unitSquareImage(C)[2]).toEqual([3, 3 / 2]);
    });
});

describe('exactness on the quarter grid', () => {
    it('keeps the unsnapped counter-example nonzero in doubles', () => {
        expect(0.1 * 0.9 - 0.3 * 0.3).not.toBe(0);
        expect(det([[0.1, 0.3], [0.3, 0.9]])).not.toBe(0);
    });

    it('matches integer arithmetic scaled by 16 for 1e5 random matrices', () => {
        // mulberry32, fixed seed
        let state = 0x9e3779b9;
        const random = () => {
            state = (state + 0x6d2b79f5) | 0;
            let t = Math.imul(state ^ (state >>> 15), 1 | state);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        const quarters = () => Math.floor(random() * 33) - 16; // integer q in [-16, 16], entry q / 4
        for (let n = 0; n < 100000; n++) {
            const [a, b, c, d] = [quarters(), quarters(), quarters(), quarters()];
            const m: Mat2 = [[a / 4, b / 4], [c / 4, d / 4]];
            const det16 = a * d - b * c; // det * 16
            const tr4 = a + d; // trace * 4
            const disc16 = tr4 * tr4 - 4 * det16; // (tr^2 - 4 det) * 16
            if (det(m) * 16 !== det16 || trace(m) * 4 !== tr4 || discriminant(m) * 16 !== disc16) {
                throw new Error(`mismatch for ${JSON.stringify(m)}`);
            }
            if (orientationSign(m) !== Math.sign(det16)) throw new Error(`sign mismatch for ${JSON.stringify(m)}`);
            if ((inverse(m) === undefined) !== (det16 === 0)) throw new Error(`inverse mismatch for ${JSON.stringify(m)}`);
        }
    });
});

describe('singular collapse', () => {
    it('collapses the unit square onto a segment with zero area', () => {
        const sq = unitSquareImage(C);
        expect(shoelace(sq)).toBe(0);
        expect(det(C)).toBe(0);
        expect(orientationSign(C)).toBe(0);
        expect(unitSquareImage([[0, 0], [0, 0]]).every((p) => p[0] === 0 && p[1] === 0)).toBe(true);
    });

    it('has |det| equal to the shoelace area over the whole quarter grid', () => {
        for (let a = -16; a <= 16; a += 3) for (let b = -16; b <= 16; b += 2) {
            for (let c = -16; c <= 16; c += 5) for (let d = -16; d <= 16; d += 1) {
                const m: Mat2 = [[a / 4, b / 4], [c / 4, d / 4]];
                expect(shoelace(unitSquareImage(m)) + 0).toBe(det(m) + 0);
                expect(Math.abs(shoelace(unitSquareImage(m)))).toBe(Math.abs(det(m)));
            }
        }
    });
});
