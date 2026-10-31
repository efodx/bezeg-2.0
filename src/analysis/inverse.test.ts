import {describe, expect, it} from 'vitest';
import {INVERSE_RESTRICTIONS, inversePair, mirrorPoint, mirroredSlopes, type InversePair, type InverseRestriction} from './inverse';

const pair = (r: InverseRestriction): InversePair => {
    const p = inversePair(r);
    if (typeof p === 'string') throw new Error(p);
    return p;
};
const slopeValue = (s: {kind: string; value?: number}): number => {
    expect(s.kind).toBe('slope');
    return s.value!;
};

describe('closed list of restrictions', () => {
    it('offers exactly square, exp and natural, all constructible', () => {
        expect(INVERSE_RESTRICTIONS.map(r => r.kind)).toEqual(['square', 'exp', 'natural']);
        for (const r of INVERSE_RESTRICTIONS) expect(typeof inversePair(r)).toBe('object');
    });

    it('restricts x^2 to x >= 0', () => {
        const p = pair({kind: 'square'});
        expect(p.forward.value(-1)).toBeUndefined();
        expect(p.forward.value(2)).toBe(4);
        expect(mirroredSlopes(p, -1)).toBeUndefined();
    });

    it('rejects base 1 and out-of-range bases', () => {
        expect(inversePair({kind: 'exp', base: 1})).toBe('base-one');
        expect(inversePair({kind: 'exp', base: 0})).toBe('base-out-of-range');
        expect(inversePair({kind: 'exp', base: 6})).toBe('base-out-of-range');
        expect(inversePair({kind: 'exp', base: NaN})).toBe('not-finite');
    });
});

describe('mirror point and reciprocal slopes', () => {
    it('swaps coordinates exactly', () => {
        expect(mirrorPoint({x: 2, y: 4})).toEqual({x: 4, y: 2});
        const m = mirroredSlopes(pair({kind: 'exp', base: 2}), 3)!;
        expect(m.point).toEqual({x: 3, y: 8});
        expect(m.mirror).toEqual({x: 8, y: 3});
    });

    it('x^2 and sqrt: slopes 4 and 1/4', () => {
        const m = mirroredSlopes(pair({kind: 'square'}), 2)!;
        expect(slopeValue(m.forwardSlope)).toBeCloseTo(4, 12);
        expect(slopeValue(m.inverseSlope)).toBeCloseTo(0.25, 12);
    });

    it('2^x and log_2: 8 ln 2 and 1/(8 ln 2)', () => {
        const m = mirroredSlopes(pair({kind: 'exp', base: 2}), 3)!;
        expect(slopeValue(m.forwardSlope)).toBeCloseTo(5.5452, 4);
        expect(slopeValue(m.inverseSlope)).toBeCloseTo(0.18034, 5);
    });

    it('e^x and ln: e and 1/e', () => {
        const m = mirroredSlopes(pair({kind: 'natural'}), 1)!;
        expect(slopeValue(m.forwardSlope)).toBeCloseTo(Math.E, 12);
        expect(slopeValue(m.inverseSlope)).toBeCloseTo(0.36788, 5);
    });

    it('product of slopes is 1 within 1e-9 across restrictions', () => {
        const cases: [InverseRestriction, number[]][] = [
            [{kind: 'square'}, [0.1, 0.5, 2, 7]],
            [{kind: 'exp', base: 2}, [-2, 0, 1.5, 3]],
            [{kind: 'exp', base: 0.5}, [-2, 0, 1.5, 3]],
            [{kind: 'exp', base: 5}, [-1, 0.3, 2]],
            [{kind: 'natural'}, [-2, 0, 1, 2.5]],
        ];
        for (const [r, xs] of cases) for (const x of xs) {
            const m = mirroredSlopes(pair(r), x)!;
            expect(Math.abs(m.product! - 1)).toBeLessThan(1e-9);
        }
    });
});

describe('vertical inverse tangent', () => {
    it('x^2 at 0: inverse is vertical with no slope number', () => {
        const m = mirroredSlopes(pair({kind: 'square'}), 0)!;
        expect(m.forwardSlope).toEqual({kind: 'slope', value: 0});
        expect(m.inverseSlope).toEqual({kind: 'vertical'});
        expect(m.product).toBeUndefined();
        expect(pair({kind: 'square'}).inverse.slope(0)).toEqual({kind: 'vertical'});
    });
});

describe('slopes against finite differences', () => {
    const h = 1e-5;
    const central = (f: (x: number) => number | undefined, x: number): number => (f(x + h)! - f(x - h)!) / (2 * h);
    const cases: [InverseRestriction, number[]][] = [
        [{kind: 'square'}, [0.5, 2, 5]],
        [{kind: 'exp', base: 2}, [-1, 0.5, 3]],
        [{kind: 'exp', base: 0.5}, [-1, 0.5, 3]],
        [{kind: 'natural'}, [-1, 1, 2]],
    ];
    it('forward and inverse slopes match central differences within 1e-6 relative', () => {
        for (const [r, xs] of cases) for (const x of xs) {
            const p = pair(r);
            const m = mirroredSlopes(p, x)!;
            const fd = central(p.forward.value, x);
            const id = central(p.inverse.value, m.mirror.x);
            expect(Math.abs(slopeValue(m.forwardSlope) - fd)).toBeLessThan(1e-6 * Math.max(1, Math.abs(fd)));
            expect(Math.abs(slopeValue(m.inverseSlope) - id)).toBeLessThan(1e-6 * Math.max(1, Math.abs(id)));
        }
    });
});
