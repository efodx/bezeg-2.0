import {describe, expect, test} from 'vitest';
import {GLIDE_MAX_MS, GLIDE_MS, glideDuration} from './motion';

type Box = [number, number, number, number];
const base: Box = [-10, 7.5, 10, -7.5];
const panned = (widths: number): Box => [base[0] + 20 * widths, base[1], base[2] + 20 * widths, base[3]];

describe('glideDuration', () => {
    test('no move and small moves keep the base duration', () => {
        expect(glideDuration(base, base)).toBe(GLIDE_MS);
        expect(glideDuration(base, panned(0.01))).toBeLessThan(GLIDE_MS + 2);
    });

    test('a one-width pan is about 330 ms and a three-width pan reaches the cap', () => {
        expect(glideDuration(base, panned(1))).toBeCloseTo(330, 0);
        expect(glideDuration(base, panned(3))).toBe(GLIDE_MAX_MS);
    });

    test('is bounded and grows with distance (pan and zoom)', () => {
        let last = 0;
        for (const w of [0, 0.2, 0.5, 1, 1.5, 2, 5, 100]) {
            const d = glideDuration(base, panned(w));
            expect(d).toBeGreaterThanOrEqual(GLIDE_MS);
            expect(d).toBeLessThanOrEqual(GLIDE_MAX_MS);
            expect(d).toBeGreaterThanOrEqual(last);
            last = d;
        }
        const zoomed: Box = [-40, 30, 40, -30];
        expect(glideDuration(base, zoomed)).toBeGreaterThan(GLIDE_MS + 100);
        expect(glideDuration(base, zoomed)).toBeCloseTo(glideDuration(zoomed, base), 6);
    });
});
