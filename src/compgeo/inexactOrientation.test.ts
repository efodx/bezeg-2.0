import {orientExactDyadic, orientNaiveDouble} from './inexactOrientation';

/** Independent reference for inputs that are multiples of 2^-53: scale to integers and use BigInt. */
const SCALE = 2 ** 53;
function scaled(value: number): bigint {
    const integer = value * SCALE; // exact (power-of-two scaling); an integer exactly when value is a multiple of 2^-53
    if (!Number.isInteger(integer)) throw new Error('test input not a multiple of 2^-53');
    return BigInt(integer);
}
function refExact(px: number, py: number, qx: number, qy: number, rx: number, ry: number): bigint {
    const [pX, pY, qX, qY, rX, rY] = [px, py, qx, qy, rx, ry].map(scaled);
    return (qX - pX) * (rY - pY) - (qY - pY) * (rX - pX);
}
const sign = (v: bigint | number) => (v > 0 ? 1 : v < 0 ? -1 : 0);

describe('Kettner robustness example (pivot p, q=(12,12), r=(24,24))', () => {
    const U = 2 ** -53;
    let wrongSign = 0;
    let falseZero = 0;
    let total = 0;
    for (let i = 0; i < 64; i++) {
        for (let j = 0; j < 64; j++) {
            const px = 0.5 + i * U;
            const py = 0.5 + j * U;
            const naive = orientNaiveDouble(px, py, 12, 12, 24, 24);
            const exact = sign(refExact(px, py, 12, 12, 24, 24));
            if (orientExactDyadic(px, py, 12, 12, 24, 24) !== exact) throw new Error(`exact mismatch at ${i},${j}`);
            if (naive === 0 && exact !== 0) falseZero++;
            else if (naive !== 0 && sign(naive) !== exact) wrongSign++;
            total++;
        }
    }

    it('covers 64 x 64 pivots', () => {
        expect(total).toBe(4096);
    });

    it('gives exactly 112 wrong nonzero signs and 2052 false zeros in doubles', () => {
        expect(wrongSign).toBe(112);
        expect(falseZero).toBe(2052);
    });

    it('i=41, j=48: exact value is about +9.3259e-15 but doubles give about -5.6843e-14', () => {
        const px = 0.5 + 41 * U;
        const py = 0.5 + 48 * U;
        const exactValue = Number(refExact(px, py, 12, 12, 24, 24)) / 2 ** 106;
        expect(exactValue).toBeGreaterThan(0);
        expect(exactValue / 9.3259e-15).toBeCloseTo(1, 4);
        const naive = orientNaiveDouble(px, py, 12, 12, 24, 24);
        expect(naive).toBeLessThan(0);
        expect(naive / -5.6843e-14).toBeCloseTo(1, 4);
        expect(orientExactDyadic(px, py, 12, 12, 24, 24)).toBe(1);
    });
});

describe('orientNaiveDouble', () => {
    it('is the plain double evaluation and agrees with exact arithmetic on small integers', () => {
        expect(orientNaiveDouble(0, 0, 4, 0, 3, 2)).toBe(8);
        expect(orientNaiveDouble(0, 0, 4, 0, 3, -2)).toBe(-8);
        expect(orientNaiveDouble(0, 0, 4, 0, 2, 0)).toBe(0);
    });

    it('accepts arbitrary numbers (no grid check)', () => {
        expect(orientNaiveDouble(0.1, 0.2, 0.3, 0.4, 0.5, 0.6)).not.toBeNaN();
        expect(orientNaiveDouble(0, 0, 2 ** 40, 0, 0, 2 ** 40)).toBe(2 ** 80);
    });
});

describe('orientExactDyadic', () => {
    it('returns exact signs on small integer and dyadic inputs', () => {
        expect(orientExactDyadic(0, 0, 4, 0, 3, 2)).toBe(1);
        expect(orientExactDyadic(0, 0, 4, 0, 3, -2)).toBe(-1);
        expect(orientExactDyadic(0, 0, 4, 0, 2, 0)).toBe(0);
        expect(orientExactDyadic(0.25, 0.5, 1.25, 1.5, 2.25, 2.5)).toBe(0);
        expect(orientExactDyadic(0, 0, 0.5, 0.25, 1, 0.5)).toBe(0);
        expect(orientExactDyadic(0, 0, 0.5, 0.25, 1, 0.5 + 2 ** -40)).toBe(1);
    });

    it('matches an integer-scaled BigInt reference on random multiples of 2^-53', () => {
        let seed = 12345;
        const next = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
            return (seed >>> 0) / 4294967296;
        };
        const value = () => (Math.floor(next() * 4096) - 2048) * 2 ** -53 * (next() < 0.5 ? 1 : 2 ** 20);
        for (let k = 0; k < 5000; k++) {
            const v = [value(), value(), value(), value(), value(), value()] as const;
            expect(orientExactDyadic(...v)).toBe(sign(refExact(...v)));
        }
    });

    it('handles subnormal and very large magnitudes exactly', () => {
        const tiny = Number.MIN_VALUE;
        expect(orientExactDyadic(0, 0, tiny, 0, 0, tiny)).toBe(1);
        expect(orientExactDyadic(0, 0, tiny, 0, 0, -tiny)).toBe(-1);
        expect(orientExactDyadic(0, 0, 1e300, 0, 0, 1e-300)).toBe(1);
        expect(orientExactDyadic(0, 0, 1e300, 1e300, 2e300, 2e300)).toBe(0);
        expect(orientExactDyadic(-0, -0, 1, 1, 2, 2)).toBe(0);
    });

    it('rejects non-finite input', () => {
        expect(() => orientExactDyadic(NaN, 0, 1, 0, 0, 1)).toThrow(RangeError);
        expect(() => orientExactDyadic(0, 0, Infinity, 0, 0, 1)).toThrow(RangeError);
    });
});
