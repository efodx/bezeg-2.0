import {gridImage} from './gridImage';
import {LINEAR_MAP_EXAMPLES, Mat2} from './matrix2';

const A = LINEAR_MAP_EXAMPLES['basis-default'];
const C = LINEAR_MAP_EXAMPLES.singular;

describe('gridImage', () => {
    it('returns 13 + 13 = 26 lines for the window [-6, 6]^2 with step 1', () => {
        const lines = gridImage(A, 6, 1);
        expect(lines).toHaveLength(26);
        expect(lines.filter((l) => l.axis === 'x').map((l) => l.value)).toEqual([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]);
        expect(lines.filter((l) => l.axis === 'y')).toHaveLength(13);
    });

    it('maps x = k to the line through k*a1 with direction a2, and y = k symmetrically', () => {
        const a1 = [2, 1];
        const a2 = [-1, 1];
        for (const line of gridImage(A, 6, 1)) {
            const [through, dir] = line.axis === 'x' ? [a1, a2] : [a2, a1];
            const k = line.value;
            const dx = line.to[0] - line.from[0];
            const dy = line.to[1] - line.from[1];
            expect([dx, dy]).toEqual([12 * dir[0], 12 * dir[1]]);
            // k*through lies on the line: cross product with the direction is 0 (exact integers here)
            const px = k * through[0] - line.from[0];
            const py = k * through[1] - line.from[1];
            expect(px * dy - py * dx).toBe(0);
        }
    });

    it('collapses a singular matrix onto a line without non-finite endpoints', () => {
        const lines = gridImage(C, 6, 1);
        expect(lines).toHaveLength(26);
        for (const l of lines) {
            for (const v of [...l.from, ...l.to]) expect(Number.isFinite(v)).toBe(true);
            // every endpoint lies on the image line through (2, 1): x - 2y = 0
            expect(l.from[0] - 2 * l.from[1]).toBe(0);
            expect(l.to[0] - 2 * l.to[1]).toBe(0);
        }
    });

    it('collapses the zero matrix to the origin', () => {
        const zero: Mat2 = [[0, 0], [0, 0]];
        for (const l of gridImage(zero, 6, 1)) {
            expect(l.from.map((v) => v + 0)).toEqual([0, 0]);
            expect(l.to.map((v) => v + 0)).toEqual([0, 0]);
        }
    });

    it('supports fractional steps and rejects bad arguments', () => {
        expect(gridImage(A, 1, 0.25)).toHaveLength(18);
        expect(() => gridImage(A, 6, 0)).toThrow(RangeError);
        expect(() => gridImage(A, NaN, 1)).toThrow(RangeError);
        expect(() => gridImage(A, -1, 1)).toThrow(RangeError);
    });
});
