import {describe, expect, it} from 'vitest';
import {
    affineControlPoints, affineImage, affineTranslationForm, applyThenApply, composeElements, COMPOSITION_FIXTURE, deCasteljau,
    ELEMENT_COUNT, elementMatrix, MapElement, productDeterminant, productElement, productMatrix, productOrientation,
    reflectionMatrix, rotationMatrix, stateAffineImage,
} from './composition2';
import {apply, det, IDENTITY, Mat2, multiply, Vec2} from './matrix2';

const R: Mat2 = [[0, -1], [1, 0]];
const F: Mat2 = [[1, 0], [0, -1]];
const near = (a: readonly number[], b: readonly number[], tol = 1e-12) => a.forEach((x, i) => expect(Math.abs(x - b[i])).toBeLessThanOrEqual(tol));
const plain = (m: Mat2): Mat2 => [[m[0][0] + 0, m[0][1] + 0], [m[1][0] + 0, m[1][1] + 0]];
const flat = (m: Mat2) => [m[0][0], m[0][1], m[1][0], m[1][1]];

// A seeded generator keeps the random points reproducible.
const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

describe('L5 acceptance 1: exact integer products', () => {
    it('RF, FR, RR and their determinants', () => {
        expect(plain(multiply(R, F))).toEqual([[0, 1], [1, 0]]);
        expect(plain(multiply(F, R))).toEqual([[0, -1], [-1, 0]]);
        expect(plain(multiply(R, R))).toEqual([[-1, 0], [0, -1]]);
        expect(det(multiply(R, F))).toBe(-1);
        expect(det(multiply(F, R))).toBe(-1);
        expect(det(multiply(R, R))).toBe(1);
        // "F first, then R" is R F; the readout of state A = F, B = R.
        expect(plain(productMatrix({matrix: F, secondMatrix: R}))).toEqual([[0, 1], [1, 0]]);
        expect(plain(productMatrix({matrix: R, secondMatrix: F}))).toEqual([[0, -1], [-1, 0]]);
        expect(productMatrix({matrix: R})).toEqual(R);
    });

    it('the product readout equals applying A then B to random points (1e-12)', () => {
        const next = rng(7);
        const entry = () => Math.round(next() * 32 - 16) / 4;
        for (let i = 0; i < 300; i++) {
            const a: Mat2 = [[entry(), entry()], [entry(), entry()]];
            const b: Mat2 = [[entry(), entry()], [entry(), entry()]];
            const p: Vec2 = [next() * 20 - 10, next() * 20 - 10];
            near(apply(productMatrix({matrix: a, secondMatrix: b}), p), applyThenApply(a, b, p));
        }
    });

    it('with chosen elements the readout also equals the two applied images', () => {
        const next = rng(11);
        for (let i = 0; i < 300; i++) {
            const e1: MapElement = {kind: next() < 0.5 ? 'rotation' : 'reflection', k: Math.floor(next() * 24)};
            const e2: MapElement = {kind: next() < 0.5 ? 'rotation' : 'reflection', k: Math.floor(next() * 24)};
            const p: Vec2 = [next() * 20 - 10, next() * 20 - 10];
            const s = {matrix: IDENTITY, element: e1, secondElement: e2};
            near(apply(productMatrix(s), p), applyThenApply(elementMatrix(e1), elementMatrix(e2), p));
        }
    });

    it('products of grid entries are exact multiples of 1/16 in doubles', () => {
        const a: Mat2 = [[1.25, -0.75], [0.5, 3.75]];
        const b: Mat2 = [[-2.25, 0.25], [4, -1.5]];
        const m = productMatrix({matrix: a, secondMatrix: b});
        expect(m).toEqual([[-2.25 * 1.25 + 0.25 * 0.5, -2.25 * -0.75 + 0.25 * 3.75], [4 * 1.25 + -1.5 * 0.5, 4 * -0.75 + -1.5 * 3.75]]);
        flat(m).forEach(x => expect(Number.isInteger(x * 16)).toBe(true));
        expect(productDeterminant({matrix: a, secondMatrix: b})).toBe(det(a) * det(b));
    });
});

describe('rotation and reflection elements', () => {
    it('rotation by k * 15 degrees is orthogonal with determinant 1; exact at multiples of 6', () => {
        for (let k = 0; k < ELEMENT_COUNT; k++) {
            const m = rotationMatrix(k);
            near(flat(multiply(m, [[m[0][0], m[1][0]], [m[0][1], m[1][1]]])), [1, 0, 0, 1]);
            expect(Math.abs(det(m) - 1)).toBeLessThanOrEqual(1e-15);
        }
        expect(rotationMatrix(0)).toEqual(IDENTITY);
        expect(rotationMatrix(6)).toEqual(R);
        expect(rotationMatrix(12)).toEqual([[-1, 0], [0, -1]]);
        expect(rotationMatrix(18)).toEqual([[0, 1], [-1, 0]]);
        expect(det(rotationMatrix(12))).toBe(1);
    });

    it('R_k R_m = R_(k+m) to 1e-12, exactly at multiples of 6, and the index arithmetic agrees', () => {
        for (let k = 0; k < ELEMENT_COUNT; k++) {
            for (let m = 0; m < ELEMENT_COUNT; m++) {
                near(flat(multiply(rotationMatrix(k), rotationMatrix(m))), flat(rotationMatrix((k + m) % ELEMENT_COUNT)));
                expect(composeElements({kind: 'rotation', k}, {kind: 'rotation', k: m})).toEqual({kind: 'rotation', k: (k + m) % ELEMENT_COUNT});
            }
        }
        expect(plain(multiply(rotationMatrix(6), rotationMatrix(6)))).toEqual(rotationMatrix(12));
        expect(plain(multiply(rotationMatrix(6), rotationMatrix(12)))).toEqual(rotationMatrix(18));
    });

    it('reflections: determinant -1, symmetric, square is the identity (exact at multiples of 6)', () => {
        for (let k = 0; k < ELEMENT_COUNT; k++) {
            const m = reflectionMatrix(k);
            expect(m[0][1]).toBe(m[1][0]);
            expect(Math.abs(det(m) + 1)).toBeLessThanOrEqual(1e-15);
            near(flat(multiply(m, m)), [1, 0, 0, 1]);
        }
        expect(reflectionMatrix(0)).toEqual(F);
        expect(plain(multiply(reflectionMatrix(6), reflectionMatrix(6)))).toEqual(IDENTITY);
        expect(det(reflectionMatrix(6))).toBe(-1);
    });

    it('composeElements matches the matrix product for all four kind pairs', () => {
        for (const k1 of [0, 1, 5, 17, 23]) {
            for (const k2 of [0, 2, 7, 12, 23]) {
                for (const kinds of [['rotation', 'rotation'], ['rotation', 'reflection'], ['reflection', 'rotation'], ['reflection', 'reflection']] as const) {
                    const first: MapElement = {kind: kinds[0], k: k1};
                    const second: MapElement = {kind: kinds[1], k: k2};
                    near(flat(elementMatrix(composeElements(second, first))), flat(multiply(elementMatrix(second), elementMatrix(first))));
                }
            }
        }
    });

    it('orientation of the product comes from the kinds, and productElement gives the exact element', () => {
        const s = {matrix: IDENTITY, element: {kind: 'rotation', k: 1} as MapElement, secondElement: {kind: 'reflection', k: 3} as MapElement};
        expect(productOrientation(s)).toBe(-1);
        expect(productElement(s)).toEqual({kind: 'reflection', k: 2});
        expect(productOrientation({...s, secondElement: {kind: 'rotation', k: 3}})).toBe(1);
        expect(productOrientation({matrix: [[1, 2], [2, 4]]})).toBe(0);
        expect(productElement({matrix: IDENTITY, element: s.element})).toBeUndefined();
    });
});

describe('L5 acceptance 2: the affine step and the Bezier fixture', () => {
    const c: Vec2 = [3, 1];
    it('the quarter-turn about c = (3,1) sends the fixture to the worked-example numbers, exactly', () => {
        const images = COMPOSITION_FIXTURE.map(p => affineImage(R, c, [0, 0], p));
        expect(images).toEqual([[4, -1], [1, 0], [2, 2], [5, 3]]);
        expect(affineControlPoints({matrix: R, pivot: c})).toEqual([[4, -1], [1, 0], [2, 2], [5, 3]]);
        // The same through a chosen rotation element (k = 6 is exact).
        expect(affineControlPoints({matrix: IDENTITY, element: {kind: 'rotation', k: 6}, pivot: c})).toEqual([[4, -1], [1, 0], [2, 2], [5, 3]]);
    });

    it('c is the mean of the fixture control points, and T(B(1/2)) = (9/4, 1) = B_T(1/2) by de Casteljau', () => {
        const mean: Vec2 = [COMPOSITION_FIXTURE.reduce((s, p) => s + p[0], 0) / 4, COMPOSITION_FIXTURE.reduce((s, p) => s + p[1], 0) / 4];
        expect(mean).toEqual(c);
        // Independent hand computation of B(1/2) = (P0 + 3 P1 + 3 P2 + P3) / 8.
        const bx = (1 + 3 * 2 + 3 * 4 + 5) / 8;
        const by = (0 + 3 * 3 + 3 * 2 - 1) / 8;
        expect([bx, by]).toEqual([3, 7 / 4]);
        expect(affineImage(R, c, [0, 0], [bx, by])).toEqual([9 / 4, 1]);
        const image = affineControlPoints({matrix: R, pivot: c});
        expect(deCasteljau(image, 0.5)).toEqual([9 / 4, 1]);
        expect(deCasteljau(COMPOSITION_FIXTURE, 0.5)).toEqual([bx, by]);
    });

    it('T(B(t)) = B_T(t) for several t (affine invariance), with a translation, a pivot and a 30 degree rotation', () => {
        const s = {matrix: IDENTITY, element: {kind: 'rotation', k: 2} as MapElement, secondMatrix: [[2, 0], [0, 0.5]] as Mat2, pivot: [1, -2] as Vec2, translation: [0.5, 1.25] as Vec2};
        const image = affineControlPoints(s);
        for (const t of [0, 0.1, 0.25, 0.5, 0.9, 1]) {
            near(stateAffineImage(s, deCasteljau(COMPOSITION_FIXTURE, t)), deCasteljau(image, t));
        }
    });

    it('both forms: M P + b (pivot 0) and c + M (P - c) (translation 0); the derived form t = b + c - M c agrees', () => {
        const m: Mat2 = [[0.5, -1], [1.5, 0.25]];
        const b: Vec2 = [1, -0.5];
        const p: Vec2 = [2.5, -1.75];
        expect(affineImage(m, [0, 0], b, p)).toEqual([apply(m, p)[0] + b[0], apply(m, p)[1] + b[1]]);
        const t = affineTranslationForm(m, c, b);
        near(affineImage(m, c, b, p), [apply(m, p)[0] + t[0], apply(m, p)[1] + t[1]]);
        expect(affineTranslationForm(R, c, [0, 0])).toEqual([3 + 1, 1 - 3]);
    });

    it('a state without translation and pivot is the product map', () => {
        expect(stateAffineImage({matrix: R, secondMatrix: F}, [2, 3])).toEqual(apply(multiply(F, R), [2, 3]));
    });
});
