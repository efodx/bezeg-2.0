import {resizeScale, rotationAngle} from './gesture-transforms';

// Transcriptions of the formulas used before gesture-transforms existed.
function legacyRotation(c: [number, number], prev: [number, number], cur: [number, number]) {
    const k1 = (c[1] - cur[1]) / (c[0] - cur[0]);
    const k2 = (c[1] - prev[1]) / (c[0] - prev[0]);
    return Math.atan((k1 - k2) / (1 + k1 * k2));
}

function legacyScale(box: number[], d: number[], dir: number[]) {
    const [minX, maxX, minY, maxY] = box;
    return {
        xScale: (2 * d[0] * dir[0] + maxX - minX) / (maxX - minX),
        yScale: (2 * d[1] * dir[1] + maxY - minY) / (maxY - minY),
    };
}

const polar = (r: number, a: number): [number, number] => [r * Math.cos(a), r * Math.sin(a)];

describe('rotationAngle', () => {
    it('is finite and correct with the pointer vertically aligned with the centre', () => {
        const c: [number, number] = [2, 1];
        expect(rotationAngle(c, [2, 4], [2, 6])).toBeCloseTo(0, 12);
        expect(rotationAngle(c, [2, 4], [5, 1])).toBeCloseTo(-Math.PI / 2, 12);
        expect(rotationAngle(c, [5, 1], [2, 4])).toBeCloseTo(Math.PI / 2, 12);
        expect(Number.isFinite(legacyRotation(c, [2, 4], [5, 1]))).toBe(false);
    });

    it('gives the signed angle across +-90 degrees, including a 100 degree step', () => {
        const c: [number, number] = [0, 0];
        const deg = Math.PI / 180;
        expect(rotationAngle(c, polar(2, 50 * deg), polar(3, 150 * deg))).toBeCloseTo(100 * deg, 12);
        expect(rotationAngle(c, polar(2, 150 * deg), polar(3, 50 * deg))).toBeCloseTo(-100 * deg, 12);
        expect(legacyRotation(c, polar(2, 50 * deg), polar(3, 150 * deg))).not.toBeCloseTo(100 * deg, 6);
    });

    it('sums the steps of a full turn to 2 PI', () => {
        const c: [number, number] = [1, -1];
        let sum = 0;
        const n = 36;
        for (let i = 0; i < n; i++) {
            const a = polar(1.5, (2 * Math.PI * i) / n);
            const b = polar(1.5, (2 * Math.PI * (i + 1)) / n);
            sum += rotationAngle(c, [c[0] + a[0], c[1] + a[1]], [c[0] + b[0], c[1] + b[1]]);
        }
        expect(sum).toBeCloseTo(2 * Math.PI, 10);
    });

    it('returns 0 for a degenerate radius', () => {
        expect(rotationAngle([1, 1], [1, 1], [3, 2])).toBe(0);
        expect(rotationAngle([1, 1], [3, 2], [1, 1])).toBe(0);
    });

    it('matches the legacy formula for ordinary steps', () => {
        const c: [number, number] = [0.5, 0.25];
        for (const [p, q] of [[[2, 3], [3, 2.5]], [[-2, 1], [-2.5, 2]], [[1, -3], [2, -2]]] as [[number, number], [number, number]][]) {
            expect(rotationAngle(c, p, q)).toBeCloseTo(legacyRotation(c, p, q), 12);
        }
    });
});

describe('resizeScale', () => {
    it('matches the legacy formula for ordinary boxes, including mirroring', () => {
        const box: [number, number, number, number] = [-1, 3, 0, 2];
        for (const d of [[0.5, 0.2], [-1, -0.4], [-3, 0.5]] as [number, number][]) {
            for (const dir of [[1, 1], [-1, 1], [-1, -1]] as [number, number][]) {
                const r = resizeScale(box, d, dir)!;
                const l = legacyScale(box, d, dir);
                expect(r.xScale).toBeCloseTo(l.xScale, 12);
                expect(r.yScale).toBeCloseTo(l.yScale, 12);
            }
        }
        expect(resizeScale(box, [-3, 0], [1, 1])!.xScale).toBeLessThan(0);
    });

    it('gives finite factors for zero-width and zero-height boxes', () => {
        const flat = resizeScale([1, 1, 0, 2], [0.5, 0.5], [1, 1])!;
        expect(flat.xScale).toBe(1);
        expect(flat.yScale).toBeCloseTo(1.5, 12);
        const thin = resizeScale([0, 4, 3, 3], [0.5, 0.5], [1, 1])!;
        expect(thin.xScale).toBeCloseTo(1.25, 12);
        expect(thin.yScale).toBe(1);
        const legacy = legacyScale([1, 1, 0, 2], [0.5, 0.5], [1, 1]);
        expect(Number.isFinite(legacy.xScale)).toBe(false);
    });

    it('refuses steps with a zero or non-finite factor', () => {
        expect(resizeScale([0, 2, 0, 2], [-1, 0], [1, 1])).toBeNull();
        expect(resizeScale([0, 2, 0, 2], [Infinity, 0], [1, 1])).toBeNull();
        expect(resizeScale([0, 2, 0, 2], [NaN, 0], [1, 1])).toBeNull();
    });
});
