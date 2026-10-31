import {describe, expect, it} from 'vitest';
import {subdivide} from '../bezeg/impl/kernels/bezier-kernels';
import {HULL_SEPARATION_MARGIN, hullsSeparated, type HullPoint} from './hullSeparation';
import {orient} from './predicates';

const pt = (x: number, y: number): HullPoint => ({x, y});
const toPoints = (net: number[][]): HullPoint[] => net.map(([x, y]) => pt(x, y));

function margin(a: readonly HullPoint[], b: readonly HullPoint[]): number {
    let s = 1;
    for (const p of [...a, ...b]) s = Math.max(s, Math.abs(p.x), Math.abs(p.y));
    return HULL_SEPARATION_MARGIN * s;
}

/** Checks the documented contract of a separated result: unit length, A to B, margin respected. */
function expectValidAxis(a: HullPoint[], b: HullPoint[], axis: HullPoint): void {
    expect(Math.abs(Math.hypot(axis.x, axis.y) - 1)).toBeLessThan(1e-12);
    const maxA = Math.max(...a.map(p => axis.x * p.x + axis.y * p.y));
    const minB = Math.min(...b.map(p => axis.x * p.x + axis.y * p.y));
    expect(maxA + margin(a, b)).toBeLessThan(minB);
}

/** The 2^depth pieces of a net, left to right, from repeated halving at t = 1/2. */
function pieces(net: number[][], depth: number): number[][][] {
    let current = [net];
    for (let level = 0; level < depth; level++) current = current.flatMap(piece => subdivide(0.5, piece));
    return current;
}

// ---- exact reference: every finite double is m * 2^e, so scaling by 2^1074 gives an exact BigInt ----

const bitsView = new DataView(new ArrayBuffer(8));

function exactScaled(x: number): bigint {
    bitsView.setFloat64(0, x);
    const bits = bitsView.getBigUint64(0);
    const negative = bits >> 63n === 1n;
    const exponent = Number((bits >> 52n) & 0x7ffn);
    const fraction = bits & ((1n << 52n) - 1n);
    const mantissa = exponent === 0 ? fraction : fraction | (1n << 52n);
    const shift = exponent === 0 ? 0 : exponent - 1;
    const value = mantissa << BigInt(shift);
    return negative ? -value : value;
}

interface BigPoint {
    x: bigint;
    y: bigint;
}

/** Strict separation by the same candidate axes, without normalization and without a margin, in exact integers. */
function exactlySeparated(a: HullPoint[], b: HullPoint[]): boolean {
    const toBig = (list: HullPoint[]): BigPoint[] => list.map(p => ({x: exactScaled(p.x), y: exactScaled(p.y)}));
    const A = toBig(a);
    const B = toBig(b);
    const all = [...A, ...B];
    const dots = (list: BigPoint[], wx: bigint, wy: bigint) => list.map(p => wx * p.x + wy * p.y);
    const max = (values: bigint[]) => values.reduce((m, v) => (v > m ? v : m));
    const min = (values: bigint[]) => values.reduce((m, v) => (v < m ? v : m));
    for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
            const dx = all[j].x - all[i].x;
            const dy = all[j].y - all[i].y;
            if (dx === 0n && dy === 0n) continue;
            for (const [wx, wy] of [[dx, dy], [-dy, dx]]) {
                const da = dots(A, wx, wy);
                const db = dots(B, wx, wy);
                if (max(da) < min(db) || max(db) < min(da)) return true;
            }
        }
    }
    return false;
}

function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ---- the A6 curves: A(t) = (4t, 8t(1-t)), B(t) = (4t, 3 - 8t + 8t^2); they cross at t = 1/4 and t = 3/4 ----

const NET_A = [[0, 0], [2, 4], [4, 0]];
const NET_B = [[0, 3], [2, -1], [4, 3]];

function quadraticAt(net: number[][], t: number): HullPoint {
    const u = 1 - t;
    const w = [u * u, 2 * u * t, t * t];
    return pt(
        w[0] * net[0][0] + w[1] * net[1][0] + w[2] * net[2][0],
        w[0] * net[0][1] + w[1] * net[1][1] + w[2] * net[2][1]);
}

describe('hullsSeparated: input validation', () => {
    it('rejects lists of the wrong size and non-finite coordinates with a RangeError', () => {
        const ok = [pt(0, 0)];
        const nine = Array.from({length: 9}, (_, i) => pt(i, 0));
        expect(() => hullsSeparated([], ok)).toThrow(RangeError);
        expect(() => hullsSeparated(ok, [])).toThrow(RangeError);
        expect(() => hullsSeparated(nine, ok)).toThrow(RangeError);
        expect(() => hullsSeparated(ok, nine)).toThrow(RangeError);
        expect(() => hullsSeparated([pt(NaN, 0)], ok)).toThrow(RangeError);
        expect(() => hullsSeparated(ok, [pt(0, Infinity)])).toThrow(RangeError);
        expect(() => hullsSeparated(Array.from({length: 8}, (_, i) => pt(i, 0)), ok)).not.toThrow();
    });

    it('exports the documented margin', () => {
        expect(HULL_SEPARATION_MARGIN).toBe(1e-12);
    });
});

describe('hullsSeparated: A6 pair of curves under repeated halving', () => {
    const expectedOverlapping = [1, 2, 8, 8, 8];
    const totals = [1, 4, 16, 64, 256];

    it.each([0, 1, 2, 3, 4])('counts the overlapping piece pairs at depth %i', k => {
        const as = pieces(NET_A, k);
        const bs = pieces(NET_B, k);
        let overlapping = 0;
        for (const pa of as) {
            for (const pb of bs) {
                const result = hullsSeparated(toPoints(pa), toPoints(pb));
                if (result.separated) expectValidAxis(toPoints(pa), toPoints(pb), result.axis);
                else overlapping++;
            }
        }
        expect(as.length * bs.length).toBe(totals[k]);
        expect(overlapping).toBe(expectedOverlapping[k]);
    });

    it('never discards pieces closer than the margin, and keeps the pieces holding t = 1/4 and 3/4', () => {
        const samples = 200;
        for (let k = 0; k <= 4; k++) {
            const count = 2 ** k;
            const as = pieces(NET_A, k);
            const bs = pieces(NET_B, k);
            const sample = (net: number[][], index: number) =>
                Array.from({length: samples}, (_, s) => quadraticAt(net, (index + s / (samples - 1)) / count));
            const curveA = Array.from({length: count}, (_, i) => sample(NET_A, i));
            const curveB = Array.from({length: count}, (_, i) => sample(NET_B, i));
            for (let i = 0; i < count; i++) {
                for (let j = 0; j < count; j++) {
                    const result = hullsSeparated(toPoints(as[i]), toPoints(bs[j]));
                    if (!result.separated) continue;
                    const delta = margin(toPoints(as[i]), toPoints(bs[j]));
                    let closest = Infinity;
                    for (const p of curveA[i]) {
                        for (const q of curveB[j]) closest = Math.min(closest, Math.hypot(p.x - q.x, p.y - q.y));
                    }
                    expect(closest).toBeGreaterThan(delta);
                }
            }
            for (const t of [0.25, 0.75]) {
                for (let i = 0; i < count; i++) {
                    for (let j = 0; j < count; j++) {
                        const holds = (index: number) => index / count <= t && t <= (index + 1) / count;
                        if (holds(i) && holds(j)) {
                            expect(hullsSeparated(toPoints(as[i]), toPoints(bs[j])).separated).toBe(false);
                        }
                    }
                }
            }
        }
    });

    /** The point p lies in the closed triangle with the three given vertices (exact, integer coordinates). */
    function inTriangle(tri: HullPoint[], p: HullPoint): boolean {
        const sign = orient(tri[0], tri[1], tri[2]);
        expect(sign).not.toBe(0);
        return [0, 1, 2].every(i => orient(tri[i], tri[(i + 1) % 3], p) !== -sign);
    }

    it('decides hull containment exactly (helper sanity)', () => {
        const tri = [pt(0, 0), pt(4, 0), pt(0, 4)];
        expect(inTriangle(tri, pt(1, 1))).toBe(true);
        expect(inTriangle(tri, pt(2, 2))).toBe(true);
        expect(inTriangle(tri, pt(3, 2))).toBe(false);
        expect(inTriangle(tri, pt(0, 0))).toBe(true);
    });

    it('keeps every sub-piece control point inside its parent piece hull, exactly on the dyadic grid', () => {
        for (const net of [NET_A, NET_B]) {
            for (let k = 1; k <= 4; k++) {
                const scale = 4 ** k;
                const toGrid = (piece: number[][]) => piece.map(([x, y]) => {
                    expect(Number.isInteger(x * scale) && Number.isInteger(y * scale)).toBe(true);
                    return pt(x * scale, y * scale);
                });
                const parents = pieces(net, k - 1);
                const children = pieces(net, k);
                children.forEach((child, index) => {
                    const parent = toGrid(parents[index >> 1]);
                    for (const p of toGrid(child)) expect(inTriangle(parent, p)).toBe(true);
                });
            }
        }
    });
});

describe('hullsSeparated: margin and exactness', () => {
    it('keeps two parallel segments whose gap (1e-14) is below the margin although the exact test separates them', () => {
        const a = [pt(0, 0), pt(1, 0)];
        const b = [pt(0, 1e-14), pt(1, 1e-14)];
        expect(exactlySeparated(a, b)).toBe(true);
        expect(hullsSeparated(a, b)).toEqual({separated: false});
        expect(hullsSeparated(b, a)).toEqual({separated: false});
        const wider = [pt(0, 1e-10), pt(1, 1e-10)];
        const result = hullsSeparated(a, wider);
        expect(result.separated).toBe(true);
        if (result.separated) expectValidAxis(a, wider, result.axis);
    });

    it('scales the margin with the largest coordinate', () => {
        const a = [pt(0, 0), pt(1e6, 0)];
        expect(hullsSeparated(a, [pt(0, 5e-7), pt(1e6, 5e-7)])).toEqual({separated: false});
        expect(hullsSeparated(a, [pt(0, 5e-5), pt(1e6, 5e-5)]).separated).toBe(true);
    });

    it('never reports a separation the exact test denies, on seeded random pairs of degree 1 to 3', () => {
        const random = mulberry32(20261031);
        const coordinate = () => random() * 10 - 5;
        const list = () => Array.from({length: 2 + Math.floor(random() * 3)}, () => pt(coordinate(), coordinate()));
        let separatedCount = 0;
        for (let n = 0; n < 3000; n++) {
            const a = list();
            const b = list();
            const result = hullsSeparated(a, b);
            if (result.separated) {
                separatedCount++;
                expect(exactlySeparated(a, b)).toBe(true);
                expectValidAxis(a, b, result.axis);
            } else {
                // generic doubles are never within the margin of touching, so the exact test agrees
                expect(exactlySeparated(a, b)).toBe(false);
            }
        }
        expect(separatedCount).toBeGreaterThan(200);
        expect(separatedCount).toBeLessThan(2800);
    });

    it('agrees with the exact test on seeded pairs on a coarse grid, where touching is common', () => {
        const random = mulberry32(7);
        const coordinate = () => Math.floor(random() * 7) / 2 - 1.5;
        const list = () => Array.from({length: 1 + Math.floor(random() * 4)}, () => pt(coordinate(), coordinate()));
        let overlapping = 0;
        for (let n = 0; n < 3000; n++) {
            const a = list();
            const b = list();
            const result = hullsSeparated(a, b);
            if (result.separated) expectValidAxis(a, b, result.axis);
            expect(result.separated).toBe(exactlySeparated(a, b));
            if (!result.separated) overlapping++;
        }
        expect(overlapping).toBeGreaterThan(300);
    });
});

describe('hullsSeparated: degenerate inputs and the returned axis', () => {
    it('separates single points iff their distance exceeds the margin', () => {
        expect(hullsSeparated([pt(0, 0)], [pt(1e-13, 0)])).toEqual({separated: false});
        expect(hullsSeparated([pt(0, 0)], [pt(0, 0)])).toEqual({separated: false});
        expect(hullsSeparated([pt(0, 0)], [pt(1e-9, 0)]).separated).toBe(true);
        const far = hullsSeparated([pt(0, 0)], [pt(3, 4)]);
        expect(far.separated).toBe(true);
        if (far.separated) {
            expect(far.axis.x).toBeCloseTo(0.6, 14);
            expect(far.axis.y).toBeCloseTo(0.8, 14);
        }
    });

    it('separates collinear segments on one line by the direction axis, pointing from A to B', () => {
        const a = [pt(0, 0), pt(1, 0)];
        const b = [pt(2, 0), pt(3, 0)];
        expect(hullsSeparated(a, b)).toEqual({separated: true, axis: {x: 1, y: 0}});
        const swapped = hullsSeparated(b, a);
        expect(swapped.separated).toBe(true);
        if (swapped.separated) {
            expect(swapped.axis.x).toBe(-1);
            expect(Math.abs(swapped.axis.y)).toBe(0);
            expectValidAxis(b, a, swapped.axis);
        }
        const diagonalA = [pt(0, 0), pt(1, 1)];
        const diagonalB = [pt(2, 2), pt(3, 3)];
        const diagonal = hullsSeparated(diagonalA, diagonalB);
        expect(diagonal.separated).toBe(true);
        if (diagonal.separated) expectValidAxis(diagonalA, diagonalB, diagonal.axis);
    });

    it('keeps overlapping collinear segments, a point on a segment, identical lists and touching hulls', () => {
        expect(hullsSeparated([pt(0, 0), pt(2, 0)], [pt(1, 0), pt(3, 0)]).separated).toBe(false);
        expect(hullsSeparated([pt(1, 0)], [pt(0, 0), pt(2, 0)]).separated).toBe(false);
        expect(hullsSeparated([pt(0, 0), pt(2, 0)], [pt(1, 0)]).separated).toBe(false);
        const triangle = [pt(0, 0), pt(3, 1), pt(1, 4)];
        expect(hullsSeparated(triangle, [...triangle]).separated).toBe(false);
        const square = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        expect(hullsSeparated(square, [pt(1, 0), pt(2, 0), pt(2, 1), pt(1, 1)]).separated).toBe(false);
        expect(hullsSeparated(square, [pt(1, 1), pt(2, 1), pt(2, 2), pt(1, 2)]).separated).toBe(false);
        expect(hullsSeparated(square, [pt(0.5, 0.5)]).separated).toBe(false);
    });

    it('returns a unit axis separating the lists for a vertex-to-edge configuration', () => {
        const a = [pt(0, 0), pt(4, 0), pt(2, 3)];
        const b = [pt(2, 3.5), pt(1, 6), pt(3, 6)];
        const result = hullsSeparated(a, b);
        expect(result.separated).toBe(true);
        if (result.separated) {
            expectValidAxis(a, b, result.axis);
            expect(result.axis.y).toBeGreaterThan(0);
        }
    });
});
