import {describe, expect, it} from 'vitest';
import {Rational, RationalPoint} from '../compgeo/rational';
import {classifyEigen} from '../linear/eigen2';
import {multiply, type Mat2} from '../linear/matrix2';
import {
    affineMap, apply, classifyIsometry, compose, determinant, dilation, identityMap, inverse, isOrthogonal, mapsEqual,
    reflection, rotationAbout, similarity, toMat2, translation, type AffineMap2,
} from './isometry2';

const R = (n: number, d = 1) => Rational.of(n, d);
const P = (x: number, y: number, d = 1) => new RationalPoint(R(x, d), R(y, d));
const grid = (x: number, y: number) => ({x, y});
/** Map from integer-or-fraction entries given as [num, den] pairs. */
const rmap = (e: Array<[number, number]>): AffineMap2 =>
    affineMap(R(...e[0]), R(...e[1]), R(...e[2]), R(...e[3]), R(...e[4]), R(...e[5]));

function mulberry32(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * `classifyEigen` throws on entries off the quarter grid (such as 3/5), so those maps are compared through the computed
 * discriminant of the double linear part, the same quantity that `classifyEigen` evaluates.
 */
function eigenOracle(m: AffineMap2): ReturnType<typeof classifyEigen> {
    const lin = toMat2(m);
    if (lin.every(row => row.every(v => Number.isInteger(v * 4)))) return classifyEigen(lin);
    const tr = lin[0][0] + lin[1][1];
    const det = lin[0][0] * lin[1][1] - lin[0][1] * lin[1][0];
    const disc = tr * tr - 4 * det;
    if (disc < -1e-9) return {kind: 'complex', real: tr / 2, imaginary: Math.sqrt(-disc) / 2, discriminant: disc};
    const r = Math.sqrt(Math.max(disc, 0));
    return {kind: 'distinct-real', eigenvalues: [(tr + r) / 2, (tr - r) / 2], eigenvectors: [[1, 0], [0, 1]], discriminant: disc};
}

function randomMirror(rand: () => number): AffineMap2 {
    const int = () => Math.floor(rand() * 13) - 6;
    for (;;) {
        const p = grid(int(), int());
        const q = grid(int(), int());
        if (p.x !== q.x || p.y !== q.y) return reflection(p, q);
    }
}

const is = (p: RationalPoint, x: number, y: number, d = 1) => p.equals(P(x, y, d));

describe('AffineMap2 basics', () => {
    it('apply, compose order and inverse', () => {
        const shift = translation(grid(1, 0));
        const turn = rotationAbout(grid(0, 0), R(0), R(1)); // 90 degrees
        // first shift, then turn: (0,0) -> (1,0) -> (0,1)
        expect(is(apply(compose(turn, shift), P(0, 0)), 0, 1)).toBe(true);
        // first turn, then shift: (0,0) -> (0,0) -> (1,0)
        expect(is(apply(compose(shift, turn), P(0, 0)), 1, 0)).toBe(true);
        const m = rmap([[3, 5], [-4, 5], [4, 5], [3, 5], [1, 1], [-2, 3]]);
        expect(mapsEqual(compose(inverse(m), m), identityMap)).toBe(true);
        expect(mapsEqual(compose(m, inverse(m)), identityMap)).toBe(true);
    });

    it('rejects singular maps in inverse', () => {
        expect(() => inverse(rmap([[1, 1], [2, 1], [2, 1], [4, 1], [0, 1], [0, 1]]))).toThrow(RangeError);
    });

    it('agrees with double Mat2 multiplication within 1e-12 over seeded grid mirrors', () => {
        const rand = mulberry32(11);
        for (let i = 0; i < 200; i++) {
            const A = randomMirror(rand);
            const B = randomMirror(rand);
            const exact = toMat2(compose(B, A));
            const oracle: Mat2 = multiply(toMat2(B), toMat2(A));
            for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
                expect(Math.abs(exact[r][c] - oracle[r][c])).toBeLessThan(1e-12);
            }
        }
    });
});

describe('constructors', () => {
    it('validates input', () => {
        expect(() => reflection(grid(1, 1), grid(1, 1))).toThrow(RangeError);
        expect(() => reflection(grid(0.5, 0), grid(1, 1))).toThrow(RangeError);
        expect(() => translation(grid(0, 1.5))).toThrow(RangeError);
        expect(() => rotationAbout(grid(0, 0), R(1, 2), R(1, 2))).toThrow(RangeError);
        expect(() => rotationAbout(grid(0.1, 0), R(1), R(0))).toThrow(RangeError);
        expect(() => dilation(grid(0, 0), R(0))).toThrow(RangeError);
        expect(() => dilation(grid(Number.NaN, 0), R(2))).toThrow(RangeError);
        expect(() => dilation(grid(2 ** 26, 0), R(2))).toThrow(RangeError);
    });

    it('L1: two mirrors through the origin compose to the rotation (3/5, -4/5; 4/5, 3/5)', () => {
        const m1 = reflection(grid(0, 0), grid(1, 0));
        const m2 = reflection(grid(0, 0), grid(2, 1));
        const c = compose(m2, m1);
        expect([c.a, c.b, c.c, c.d].map(v => v.format())).toEqual([R(3, 5), R(-4, 5), R(4, 5), R(3, 5)].map(v => v.format()));
        expect(is(apply(m1, P(3, 1)), 3, -1)).toBe(true);
        expect(is(apply(c, P(3, 1)), 1, 3)).toBe(true);
        expect(apply(c, P(5, 1)).equals(new RationalPoint(R(11, 5), R(23, 5)))).toBe(true);
        expect(apply(c, P(3, 4)).equals(new RationalPoint(R(-7, 5), R(24, 5)))).toBe(true);
        expect(determinant(c).equals(R(1))).toBe(true);
    });

    it('L1: parallel mirrors x=0 and x=3 give the translation (6,0)', () => {
        const c = compose(reflection(grid(3, 0), grid(3, 1)), reflection(grid(0, 0), grid(0, 1)));
        expect(mapsEqual(c, translation(grid(6, 0)))).toBe(true);
        expect(classifyIsometry(c)).toEqual({kind: 'translation', vector: P(6, 0)});
    });

    it('L1: cos(2 phi) = (d^2 - c^2)/(d^2 + c^2) matches the matrix entry exactly', () => {
        const rand = mulberry32(5);
        let checked = 0;
        for (let i = 0; i < 200; i++) {
            const u = grid(Math.floor(rand() * 9) - 4, Math.floor(rand() * 9) - 4);
            const v = grid(Math.floor(rand() * 9) - 4, Math.floor(rand() * 9) - 4);
            if ((u.x === 0 && u.y === 0) || (v.x === 0 && v.y === 0)) continue;
            const dot = u.x * v.x + u.y * v.y;
            const cross = u.x * v.y - u.y * v.x;
            const comp = compose(reflection(grid(0, 0), v), reflection(grid(0, 0), u));
            const expected = Rational.of(dot * dot - cross * cross, dot * dot + cross * cross);
            expect(comp.a.equals(expected)).toBe(true);
            expect(comp.d.equals(expected)).toBe(true);
            checked++;
        }
        expect(checked).toBeGreaterThan(150);
    });

    it('rotationAbout and the classifier agree (round trip), including off-origin centres', () => {
        for (const [cx, cy] of [[0, 0], [1, 2], [-3, 5]]) {
            const m = rotationAbout(grid(cx, cy), R(3, 5), R(4, 5));
            const cl = classifyIsometry(m);
            expect(cl.kind).toBe('rotation');
            if (cl.kind === 'rotation') {
                expect(cl.centre.equals(P(cx, cy))).toBe(true);
                expect(cl.angle).toBeCloseTo(Math.atan2(0.8, 0.6), 12);
                expect(cl.angleComputed).toBe(true);
            }
            // translation part (I - A) c
            expect(m.tx.equals(R(cx).sub(R(3, 5).mul(R(cx)).sub(R(4, 5).mul(R(cy)))))).toBe(true);
        }
    });
});

describe('classifyIsometry', () => {
    it('rejects non-isometries and handles identity / translation', () => {
        expect(classifyIsometry(dilation(grid(0, 0), R(2))).kind).toBe('notIsometry');
        expect(classifyIsometry(rmap([[1, 1], [1, 1], [0, 1], [1, 1], [0, 1], [0, 1]])).kind).toBe('notIsometry');
        expect(classifyIsometry(identityMap).kind).toBe('identity');
        expect(classifyIsometry(translation(grid(2, -1)))).toEqual({kind: 'translation', vector: P(2, -1)});
    });

    it('L2: rotation by 90 degrees with t = (3,1) has centre (1,2)', () => {
        const cl = classifyIsometry(rmap([[0, 1], [-1, 1], [1, 1], [0, 1], [3, 1], [1, 1]]));
        expect(cl.kind).toBe('rotation');
        if (cl.kind === 'rotation') {
            expect(cl.centre.equals(P(1, 2))).toBe(true);
            expect(cl.angle).toBeCloseTo(Math.PI / 2, 12);
        }
    });

    it('L2: (y+2, x+2) is a glide along y = x with vector (2,2)', () => {
        const cl = classifyIsometry(rmap([[0, 1], [1, 1], [1, 1], [0, 1], [2, 1], [2, 1]]));
        expect(cl.kind).toBe('glide');
        if (cl.kind === 'glide') {
            expect(cl.vector.equals(P(2, 2))).toBe(true);
            expect(cl.axis.a.mul(R(1)).add(cl.axis.b).isZero()).toBe(true); // axis y = x: a x + b y = c with a = -b
            expect(cl.axis.c.isZero()).toBe(true);
        }
    });

    it('L2: (y+1, x-1) is the reflection in y = x - 1 and fixes (2,1)', () => {
        const m = rmap([[0, 1], [1, 1], [1, 1], [0, 1], [1, 1], [-1, 1]]);
        const cl = classifyIsometry(m);
        expect(cl.kind).toBe('reflection');
        if (cl.kind === 'reflection') {
            // line a x + b y = c through (1,0) and (2,1): a = 1, b = -1, c = 1
            const {a, b, c} = cl.axis;
            const k = a.equals(R(0)) ? R(1) : R(1).div(a);
            expect([a.mul(k), b.mul(k), c.mul(k)].map(v => v.format())).toEqual(['1', '-1', '1']);
        }
        expect(is(apply(m, P(2, 1)), 2, 1)).toBe(true);
    });

    it('vertical axes: (-x, y) is the reflection in x = 0, (-x+1, y) in x = 1/2, (-x, y+3) a glide along x = 0', () => {
        const v = classifyIsometry(rmap([[-1, 1], [0, 1], [0, 1], [1, 1], [0, 1], [0, 1]]));
        expect(v.kind).toBe('reflection');
        if (v.kind === 'reflection') {
            expect(!v.axis.a.isZero() && v.axis.b.isZero() && v.axis.c.isZero()).toBe(true);
        }
        const half = classifyIsometry(rmap([[-1, 1], [0, 1], [0, 1], [1, 1], [1, 1], [0, 1]]));
        expect(half.kind).toBe('reflection');
        if (half.kind === 'reflection') {
            expect(half.axis.b.isZero()).toBe(true);
            expect(half.axis.c.div(half.axis.a).equals(R(1, 2))).toBe(true);
        }
        const g = classifyIsometry(rmap([[-1, 1], [0, 1], [0, 1], [1, 1], [0, 1], [3, 1]]));
        expect(g.kind).toBe('glide');
        if (g.kind === 'glide') expect(g.vector.equals(P(0, 3))).toBe(true);
    });

    it('decides the glide exactly: a glide of length 1e-6 is not a reflection', () => {
        const tiny = rmap([[1, 1], [0, 1], [0, 1], [-1, 1], [1, 1000000], [0, 1]]);
        const cl = classifyIsometry(tiny);
        expect(cl.kind).toBe('glide');
        if (cl.kind === 'glide') expect(cl.vector.equals(P(1, 0, 1000000))).toBe(true);
        const vertical = classifyIsometry(rmap([[-1, 1], [0, 1], [0, 1], [1, 1], [0, 1], [1, 1000000]]));
        expect(vertical.kind).toBe('glide');
    });

    it('half-turn and 180 degrees about a centre', () => {
        const cl = classifyIsometry(rotationAbout(grid(2, -1), R(-1), R(0)));
        expect(cl.kind).toBe('rotation');
        if (cl.kind === 'rotation') {
            expect(cl.centre.equals(P(2, -1))).toBe(true);
            expect(cl.angle).toBeCloseTo(Math.PI, 12);
        }
    });

    it('property: compositions of 1-3 seeded grid mirrors are exact isometries of the right class and agree with classifyEigen', () => {
        const rand = mulberry32(2024);
        const seen = new Set<string>();
        for (let i = 0; i < 600; i++) {
            const n = 1 + (i % 3);
            let m: AffineMap2 = identityMap;
            for (let j = 0; j < n; j++) m = compose(randomMirror(rand), m);
            expect(isOrthogonal(m)).toBe(true);
            expect(determinant(m).equals(R(n % 2 === 0 ? 1 : -1))).toBe(true);
            const cl = classifyIsometry(m);
            seen.add(cl.kind);
            const eig = eigenOracle(m);
            if (n % 2 === 1) {
                expect(['reflection', 'glide']).toContain(cl.kind);
                expect(eig.kind).toBe('distinct-real');
                if (eig.kind === 'distinct-real') {
                    expect(eig.eigenvalues[0]).toBeCloseTo(1, 12);
                    expect(eig.eigenvalues[1]).toBeCloseTo(-1, 12);
                }
                if (cl.kind === 'reflection' || cl.kind === 'glide') {
                    const {a, b, c} = cl.axis;
                    const onAxis = !b.isZero()
                        ? new RationalPoint(R(0), c.div(b))
                        : new RationalPoint(c.div(a), R(0));
                    const g = cl.kind === 'glide' ? cl.vector : P(0, 0);
                    const moved = apply(m, onAxis);
                    expect(moved.equals(onAxis.add(g))).toBe(true);
                    expect(a.mul(moved.x).add(b.mul(moved.y)).equals(c)).toBe(true); // still on the axis
                    expect(g.dot(new RationalPoint(a, b)).isZero()).toBe(true); // g runs along the axis
                    const twice = compose(m, m);
                    expect(mapsEqual(twice, affineMap(R(1), R(0), R(0), R(1), g.x.mul(R(2)), g.y.mul(R(2))))).toBe(true);
                }
                const sim = similarity(m);
                expect(sim).toMatchObject({kind: 'similarity', orientation: -1});
            } else {
                expect(['identity', 'translation', 'rotation']).toContain(cl.kind);
                if (cl.kind === 'identity' || cl.kind === 'translation') {
                    expect(cl.kind === 'identity').toBe(m.tx.isZero() && m.ty.isZero());
                    if (cl.kind === 'translation') expect(cl.vector.equals(new RationalPoint(m.tx, m.ty))).toBe(true);
                    expect(eig).toMatchObject({kind: 'repeated', repeated: 'scalar'});
                    if (eig.kind === 'repeated') expect(eig.eigenvalue).toBe(1);
                } else if (cl.kind === 'rotation') {
                    expect(apply(m, cl.centre).equals(cl.centre)).toBe(true);
                    expect(cl.angle).toBeCloseTo(Math.atan2(m.c.toNumber(), m.a.toNumber()), 12);
                    expect(Math.cos(cl.angle)).toBeCloseTo((toMat2(m)[0][0] + toMat2(m)[1][1]) / 2, 12); // trace / 2
                    if (m.a.equals(R(-1))) {
                        expect(eig).toMatchObject({kind: 'repeated', repeated: 'scalar', eigenvalue: -1});
                    } else {
                        expect(eig.kind).toBe('complex');
                    }
                }
            }
        }
        for (const kind of ['reflection', 'glide', 'translation', 'rotation']) expect(seen.has(kind)).toBe(true);
    });
});

describe('similarity', () => {
    const tri = [P(0, 0), P(4, 0), P(0, 3)];
    const shoelace = (pts: RationalPoint[]) => pts.reduce(
        (s, p, i) => s.add(p.cross(pts[(i + 1) % pts.length])), Rational.ZERO).div(R(2));

    it('L3: dilation k = 3/2 about (1,1)', () => {
        const m = dilation(grid(1, 1), R(3, 2));
        const images = tri.map(p => apply(m, p));
        expect(is(images[0], -1, -1, 2)).toBe(true);
        expect(is(images[1], 11, -1, 2)).toBe(true);
        expect(is(images[2], -1, 4 * 2, 2)).toBe(true);
        const s = similarity(m);
        expect(s).toMatchObject({kind: 'similarity', orientation: 1});
        if (s.kind === 'similarity') {
            expect(s.lambda2.equals(R(9, 4))).toBe(true);
            expect(s.lambda?.equals(R(3, 2))).toBe(true);
            expect(s.fixedPoint).toEqual(P(1, 1));
            expect(shoelace(images).div(shoelace(tri)).equals(s.lambda2)).toBe(true);
        }
        expect(shoelace(images).equals(R(27, 2))).toBe(true);
    });

    it('L3: k = -1/2 about (1,1) keeps orientation and shrinks area by 1/4', () => {
        const m = dilation(grid(1, 1), R(-1, 2));
        const images = tri.map(p => apply(m, p));
        expect(is(images[0], 3, 3, 2)).toBe(true);
        expect(is(images[1], -1, 3, 2)).toBe(true);
        expect(is(images[2], 3, 0, 2)).toBe(true);
        const s = similarity(m);
        if (s.kind !== 'similarity') throw new Error('expected a similarity');
        expect(s.orientation).toBe(1);
        expect(s.lambda2.equals(R(1, 4))).toBe(true);
        expect(shoelace(images).div(shoelace(tri)).equals(R(1, 4))).toBe(true);
    });

    it('L3: 3/2 times the rotation (3/5, 4/5) with t = (1,2) has det(I-A) = 29/20 and fixed point (-46/29, 28/29)', () => {
        const m = rmap([[9, 10], [-6, 5], [6, 5], [9, 10], [1, 1], [2, 1]]);
        const s = similarity(m);
        if (s.kind !== 'similarity') throw new Error('expected a similarity');
        expect(s.lambda2.equals(R(9, 4))).toBe(true);
        expect(s.detIMinusA.equals(R(29, 20))).toBe(true);
        expect(s.fixedPoint).toEqual(new RationalPoint(R(-46, 29), R(28, 29)));
        if (s.fixedPoint !== 'none') expect(apply(m, s.fixedPoint).equals(s.fixedPoint)).toBe(true);
        // the same matrix as a composition of a dilation and a rotation
        const built = compose(translation(grid(1, 2)), compose(dilation(grid(0, 0), R(3, 2)), rotationAbout(grid(0, 0), R(3, 5), R(4, 5))));
        expect(mapsEqual(built, m)).toBe(true);
    });

    it('k = 1 is the identity, k = -1 a half-turn, and a dilation is not an isometry otherwise', () => {
        expect(classifyIsometry(dilation(grid(3, -2), R(1))).kind).toBe('identity');
        const half = classifyIsometry(dilation(grid(3, -2), R(-1)));
        expect(half.kind).toBe('rotation');
        if (half.kind === 'rotation') expect(half.centre.equals(P(3, -2))).toBe(true);
        expect(classifyIsometry(dilation(grid(0, 0), R(-2))).kind).toBe('notIsometry');
    });

    it('reports no fixed point when det(I - A) = 0, notSimilarity for shears, and a non-square ratio', () => {
        const s = similarity(translation(grid(1, 1)));
        expect(s).toMatchObject({kind: 'similarity', fixedPoint: 'none'});
        expect(similarity(rmap([[1, 1], [1, 1], [0, 1], [1, 1], [0, 1], [0, 1]])).kind).toBe('notSimilarity');
        expect(similarity(rmap([[2, 1], [0, 1], [0, 1], [3, 1], [0, 1], [0, 1]])).kind).toBe('notSimilarity');
        expect(similarity(rmap([[0, 1], [0, 1], [0, 1], [0, 1], [1, 1], [0, 1]])).kind).toBe('notSimilarity');
        const sq = similarity(rmap([[1, 1], [-1, 1], [1, 1], [1, 1], [0, 1], [0, 1]]));
        expect(sq).toMatchObject({kind: 'similarity', lambda: undefined});
    });

    it('property: det equals the shoelace area ratio and det(I-A) = 1 - 2k cos + k^2 for seeded dilation-rotations', () => {
        const rand = mulberry32(77);
        const rots: Array<[Rational, Rational]> = [[R(3, 5), R(4, 5)], [R(5, 13), R(12, 13)], [R(-8, 17), R(15, 17)], [R(0), R(1)]];
        for (let i = 0; i < 100; i++) {
            const k = R(Math.floor(rand() * 15) - 7 || 1, 4);
            const [co, si] = rots[i % rots.length];
            const m = compose(dilation(grid(Math.floor(rand() * 7) - 3, 0), k), rotationAbout(grid(1, 1), co, si));
            const s = similarity(m);
            if (s.kind !== 'similarity') throw new Error('expected a similarity');
            expect(shoelace(tri.map(p => apply(m, p))).div(shoelace(tri)).equals(determinant(m))).toBe(true);
            expect(s.detIMinusA.equals(R(1).sub(R(2).mul(k).mul(co)).add(k.mul(k)))).toBe(true);
        }
    });

    it('orientation -1 for dilation after a reflection; lambda for larger, non-square and unit ratios', () => {
        const m = compose(dilation(grid(1, 2), R(5, 2)), reflection(grid(0, 0), grid(3, 1)));
        expect(similarity(m)).toMatchObject({kind: 'similarity', orientation: -1});
        const mk = (num: number, den: number) => similarity(rmap([[num, den], [0, 1], [0, 1], [num, den], [0, 1], [0, 1]]));
        const big = mk(13, 8);
        if (big.kind !== 'similarity') throw new Error('expected a similarity');
        expect(big.lambda2.equals(R(169, 64))).toBe(true);
        expect(big.lambda?.equals(R(13, 8))).toBe(true);
        const nonSquare = similarity(rmap([[1, 1], [-1, 1], [1, 1], [1, 1], [0, 1], [0, 1]]));
        expect(nonSquare).toMatchObject({kind: 'similarity', lambda: undefined});
        const ninehalves = similarity(rmap([[3, 1], [0, 1], [0, 1], [3, 1], [0, 1], [0, 1]])); // lambda2 = 9
        expect(ninehalves).toMatchObject({kind: 'similarity'});
        const half = similarity(rmap([[3, 2], [3, 2], [-3, 2], [3, 2], [0, 1], [0, 1]])); // lambda2 = 9/2
        expect(half).toMatchObject({kind: 'similarity', lambda: undefined});
        if (half.kind === 'similarity') expect(half.lambda2.equals(R(9, 2))).toBe(true);
        const unit = similarity(rotationAbout(grid(0, 0), R(3, 5), R(4, 5)));
        expect(unit).toMatchObject({kind: 'similarity'});
        if (unit.kind === 'similarity') {
            expect(unit.lambda2.equals(R(1))).toBe(true);
            expect(unit.lambda?.equals(R(1))).toBe(true);
        }
    });

    it('spec numbers: k = -1/2 fixes its centre, side 5 -> 15/2, L1 angles', () => {
        const m = dilation(grid(1, 1), R(-1, 2));
        expect(apply(m, P(1, 1)).equals(P(1, 1))).toBe(true);
        expect(similarity(m)).toMatchObject({kind: 'similarity', fixedPoint: P(1, 1)});
        const big = dilation(grid(1, 1), R(3, 2));
        const [p, q] = [apply(big, P(4, 0)), apply(big, P(0, 3))];
        const d = p.sub(q);
        expect(d.dot(d).equals(R(225, 4))).toBe(true); // squared side (15/2)^2
        const cl = classifyIsometry(compose(reflection(grid(0, 0), grid(2, 1)), reflection(grid(0, 0), grid(1, 0))));
        if (cl.kind !== 'rotation') throw new Error('expected a rotation');
        expect(Math.abs(cl.angle * 180 / Math.PI - 53.13)).toBeLessThan(0.01);
        expect(Math.abs(cl.angle * 90 / Math.PI - 26.57)).toBeLessThan(0.01);
    });
});
