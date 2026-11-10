import {describe, expect, it} from 'vitest';
import {BIFURCATION_RECORDED, bifurcationRaster, columnR, nearestColumn} from './bifurcation';

/** Independent oracle: a raster built column by column with its own loop (burn-in, then record). */
function oracle(width: number, bins: number): number[] {
    const out = new Array<number>(width * bins).fill(0);
    for (let j = 0; j < width; j++) {
        const r = 2.5 + (1.5 * j) / (width - 1);
        let x = 0.2;
        for (let i = 0; i < 1300; i++) {
            x = r * x * (1 - x);
            if (i >= 1000) out[j * bins + Math.min(bins - 1, Math.floor(x * bins))]++;
        }
    }
    return out;
}

const occupied = (counts: Uint16Array, bins: number, j: number): number[] => {
    const bs: number[] = [];
    for (let b = 0; b < bins; b++) if (counts[j * bins + b] > 0) bs.push(b);
    return bs;
};

describe('bifurcation raster', () => {
    it('matches the independent oracle exactly and has 300 counts per column', () => {
        const r = bifurcationRaster(61, 400);
        expect(Array.from(r.counts)).toEqual(oracle(61, 400));
        for (let j = 0; j < 61; j++) {
            let s = 0;
            for (let b = 0; b < 400; b++) s += r.counts[j * 400 + b];
            expect(s).toBe(BIFURCATION_RECORDED);
        }
    });

    it('is deterministic and memoised on (W, bins)', () => {
        const a = bifurcationRaster(40, 400);
        expect(bifurcationRaster(40, 400)).toBe(a);
        expect(bifurcationRaster(40, 200)).not.toBe(a);
        expect(Array.from(bifurcationRaster(40, 200).counts)).toEqual(oracle(40, 200));
        expect(() => bifurcationRaster(1, 400)).toThrow(RangeError);
        expect(() => bifurcationRaster(10, 0)).toThrow(RangeError);
    });

    it('columns span 2,5..4 and the cursor snaps to the nearest column', () => {
        expect(columnR(800, 0)).toBe(2.5);
        expect(columnR(800, 799)).toBe(4);
        expect(nearestColumn(800, 3)).toBe(Math.round((0.5 / 1.5) * 799));
        const j = nearestColumn(800, 3.1);
        expect(Math.abs(columnR(800, j) - 3.1)).toBeLessThanOrEqual(1.5 / 799 / 2 + 1e-12);
        expect(nearestColumn(800, 1)).toBe(0);
        expect(nearestColumn(800, 9)).toBe(799);
    });

    it('shows the route: one bin below 3 (transient gone), two bins at 3,1, many at 4', () => {
        const W = 1501; // step 0,001
        const bins = 400;
        const r = bifurcationRaster(W, bins);
        const col = (rr: number) => nearestColumn(W, rr);
        // r = 2,9: the fixed point sits in one bin; a transient left in would add other bins.
        const fixedBin = Math.floor((1 - 1 / columnR(W, col(2.9))) * bins);
        const b29 = occupied(r.counts, bins, col(2.9));
        expect(b29.every(b => Math.abs(b - fixedBin) <= 1)).toBe(true);
        expect(b29.length).toBeLessThanOrEqual(2);
        expect(occupied(r.counts, bins, col(2.5)).length).toBeLessThanOrEqual(2);
        // r = 3,1: 2-cycle 0,558 and 0,765 -> bins 223 and 305.
        expect(occupied(r.counts, bins, col(3.1))).toEqual([223, 305]);
        expect(occupied(r.counts, bins, W - 1).length).toBeGreaterThan(100);
    });
});
