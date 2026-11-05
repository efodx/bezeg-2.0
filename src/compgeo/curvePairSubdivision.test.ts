import {describe, expect, it} from 'vitest';
import type {GridPoint} from './grid';
import {hullsSeparated} from './hullSeparation';
import {orient} from './predicates';
import {
    CURVE_PAIR_MAX_DEPTH, curvePairRun, curvePairStateAt, curvePieces, pieceHull, type PiecePair,
} from './curvePairSubdivision';

const net = (...p: number[][]): GridPoint[] => p.map(([x, y]) => ({x, y}));
const A = net([0, 0], [2, 4], [4, 0]);
// Half-integer rows are doubled onto the integer grid; counts do not depend on the scale.
const A2 = net([0, 0], [4, 8], [8, 0]);

interface Row { name: string; a: GridPoint[]; b: GridPoint[]; overlapping: number[]; tested: number[] }
const rows: Row[] = [
    {name: 'crossing', a: A, b: net([0, 3], [2, -1], [4, 3]), overlapping: [1, 2, 8, 8, 8], tested: [1, 4, 8, 32, 32]},
    {name: 'tangent', a: A, b: net([0, 4], [2, 0], [4, 4]), overlapping: [1, 4, 4, 4, 4], tested: [1, 4, 16, 16, 16]},
    {name: 'offset', a: A2, b: net([0, 9], [4, 1], [8, 9]), overlapping: [1, 0], tested: [1, 4]},
    {name: 'inside pieces', a: A2, b: net([1, 6], [5, -2], [9, 6]), overlapping: [1, 2, 2, 2, 2], tested: [1, 4, 8, 8, 8]},
    {name: 'near miss', a: net([4, 0], [8, 2], [2, 6]), b: net([5, 0], [7, 4], [3, 6]),
        overlapping: [1, 3, 3, 1, 1], tested: [1, 4, 12, 12, 4]},
    {name: 'cubic', a: net([0, 0], [1, 4], [3, -4], [4, 0]), b: net([0, 1], [1, -3], [3, 5], [4, 1]),
        overlapping: [1, 1, 2, 2, 2], tested: [1, 4, 4, 8, 8]},
];

/** The verdict events: the phase event at depth 0, the discard events after. */
function verdicts(run: ReturnType<typeof curvePairRun>) {
    return run.filter(e => e.kind !== 'split').map(e => e.payload);
}

function allPairsKept(a: GridPoint[], b: GridPoint[], depth: number): string[] {
    const pa = curvePieces(a, depth);
    const pb = curvePieces(b, depth);
    const kept: string[] = [];
    for (let i = 0; i < pa.length; i++) {
        for (let j = 0; j < pb.length; j++) if (!hullsSeparated(pa[i], pb[j]).separated) kept.push(`${i},${j}`);
    }
    return kept;
}

const key = (pairs: readonly PiecePair[]) => pairs.map(([i, j]) => `${i},${j}`).sort();

function rng(seed: number) {
    let s = seed;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 2 ** 32;
    };
}

function randomNet(rand: () => number, degree: number, span: number): GridPoint[] {
    return Array.from({length: degree + 1}, () => ({
        x: Math.floor(rand() * (2 * span + 1)) - span, y: Math.floor(rand() * (2 * span + 1)) - span,
    }));
}

describe('table of checked numbers', () => {
    for (const row of rows) {
        it(`${row.name}: overlapping and tested pairs at every depth`, () => {
            const v = verdicts(curvePairRun(row.a, row.b));
            expect(v.map(p => p.kept.length)).toEqual(row.overlapping);
            expect(v.map(p => p.candidates.length)).toEqual(row.tested);
            expect(v.map(p => p.depth)).toEqual(row.tested.map((_, k) => k));
        });
    }

    it('near miss: depth 5 discards all 1024 pairs, so the curves are disjoint', () => {
        const {a, b} = rows[4];
        const pa = curvePieces(a, 5);
        const pb = curvePieces(b, 5);
        expect(pa.length * pb.length).toBe(1024);
        let overlapping = 0;
        for (const p of pa) for (const q of pb) if (!hullsSeparated(p, q).separated) overlapping++;
        expect(overlapping).toBe(0);
    });
});

describe('trace and state', () => {
    it('has phase, then split and discard per depth, and a depth-4 end', () => {
        const run = curvePairRun(rows[0].a, rows[0].b);
        expect(run.map(e => e.kind)).toEqual(['phase', ...Array(CURVE_PAIR_MAX_DEPTH).fill(['split', 'discard']).flat()]);
        expect(run[0].predicateCount).toBe(1);
        expect(run[run.length - 1].predicateCount).toBe(1 + 4 + 8 + 32 + 32);
    });

    it('ends early when nothing is kept (offset row: three events)', () => {
        const run = curvePairRun(rows[2].a, rows[2].b);
        expect(run.map(e => e.kind)).toEqual(['phase', 'split', 'discard']);
        const last = curvePairStateAt(run, 99);
        expect(last.kept).toEqual([]);
        expect(last.discarded.length).toBe(4);
    });

    it('ends at event 0 when the whole pair is separated', () => {
        const run = curvePairRun(A, net([0, 20], [2, 24], [4, 20]));
        expect(run.length).toBe(1);
        expect(run[0].payload.kept).toEqual([]);
    });

    it('stateAt is pure and a split state has no verdicts', () => {
        const run = curvePairRun(rows[0].a, rows[0].b);
        const before = JSON.stringify(run);
        const split = curvePairStateAt(run, 1);
        expect(split.phase).toBe('split');
        expect(split.depth).toBe(1);
        expect(split.candidates.length).toBe(4);
        expect(split.kept).toEqual([]);
        expect(split.discarded).toEqual([]);
        expect(split.tests).toBe(1);
        const verdict = curvePairStateAt(run, 2);
        expect(verdict.phase).toBe('discard');
        expect(verdict.kept.length + verdict.discarded.length).toBe(4);
        expect(verdict.tests).toBe(5);
        expect(curvePairStateAt(run, 1)).toEqual(split);
        expect(JSON.stringify(run)).toBe(before);
        expect(curvePairStateAt(run, -3).phase).toBe('phase');
    });

    it('candidates are the four children of each kept pair', () => {
        const run = curvePairRun(rows[0].a, rows[0].b);
        const children = (pairs: readonly PiecePair[]): PiecePair[] =>
            pairs.flatMap(([i, j]): PiecePair[] => [[2 * i, 2 * j], [2 * i, 2 * j + 1], [2 * i + 1, 2 * j], [2 * i + 1, 2 * j + 1]]);
        for (let k = 1; k < run.length; k += 2) {
            expect(run[k].kind).toBe('split');
            expect(key(run[k].payload.candidates)).toEqual(key(children(run[k - 1].payload.kept)));
        }
    });
});

describe('hierarchical result equals all pairs', () => {
    const check = (a: GridPoint[], b: GridPoint[]) => {
        for (const payload of verdicts(curvePairRun(a, b))) {
            expect(key(payload.kept)).toEqual(allPairsKept(a, b, payload.depth).sort());
        }
    };
    for (const row of rows) it(row.name, () => check(row.a, row.b));
    it('seeded random integer nets', () => {
        const rand = rng(12345);
        for (let n = 0; n < 24; n++) {
            const degree = n % 2 ? 3 : 2;
            check(randomNet(rand, degree, 8), randomNet(rand, degree, 8));
        }
    });
});

describe('acceptance 2: discarded pairs hold no points of the other curve', () => {
    const B = rows[0].b;
    const bez = (n: GridPoint[], t: number) => {
        const u = 1 - t;
        return {
            x: u * u * n[0].x + 2 * u * t * n[1].x + t * t * n[2].x,
            y: u * u * n[0].y + 2 * u * t * n[1].y + t * t * n[2].y,
        };
    };
    it('dense sampling finds no two points closer than the margin, and the true crossings stay kept', () => {
        const margin = 1e-9;
        for (const payload of verdicts(curvePairRun(A, B))) {
            const n = 2 ** payload.depth;
            const sample = (net2: GridPoint[], piece: number) =>
                Array.from({length: 41}, (_, s) => bez(net2, (piece + s / 40) / n));
            for (const [i, j] of payload.discarded) {
                let min = Infinity;
                for (const p of sample(A, i)) for (const q of sample(B, j)) min = Math.min(min, Math.hypot(p.x - q.x, p.y - q.y));
                expect(min).toBeGreaterThan(margin);
            }
            // Both curves have x = 4t and y differs by -3 + 16 t (1 - t), so they cross at t = 1/4 and 3/4 on both.
            // Those parameters are piece boundaries at depth >= 2, so the piece on either side is kept as well.
            for (const t of [0.25, 0.75]) {
                const pa = bez(A, t);
                const pb = bez(B, t);
                expect(Math.hypot(pa.x - pb.x, pa.y - pb.y)).toBeLessThan(1e-12);
                const pieces = [Math.min(Math.floor(t * n), n - 1), Math.max(Math.ceil(t * n) - 1, 0)];
                for (const i of pieces) expect(key(payload.kept)).toContain(`${i},${i}`);
            }
        }
    });
});

describe('pieces and hulls', () => {
    it('pieces are 2^depth, join end to end and start and end at the net ends', () => {
        const p = curvePieces(rows[5].a, 3);
        expect(p.length).toBe(8);
        expect(p[0][0]).toEqual({x: 0, y: 0});
        expect(p[7][3]).toEqual({x: 4, y: 0});
        for (let i = 0; i + 1 < p.length; i++) expect(p[i][3]).toEqual(p[i + 1][0]);
    });

    it('acceptance 3: child control points lie in the parent hull (scaled integers, orient)', () => {
        const rand = rng(777);
        for (let n = 0; n < 20; n++) {
            const degree = n % 2 ? 3 : 2;
            const source = randomNet(rand, degree, 50);
            for (let depth = 0; depth < CURVE_PAIR_MAX_DEPTH; depth++) {
                const parents = curvePieces(source, depth);
                const children = curvePieces(source, depth + 1);
                const scale = 2 ** (degree * (depth + 1));
                const toGrid = (p: {x: number; y: number}): GridPoint => ({x: p.x * scale, y: p.y * scale});
                parents.forEach((parent, i) => {
                    const hull = pieceHull(parent, depth, degree).map(v => toGrid(parent[v]));
                    for (const child of [children[2 * i], children[2 * i + 1]]) {
                        for (const c of child.map(toGrid)) {
                            if (hull.length >= 3) {
                                hull.forEach((v, e) => expect(orient(v, hull[(e + 1) % hull.length], c)).toBeGreaterThanOrEqual(0));
                            } else {
                                // Segment or point: collinear with it and inside its bounding box.
                                const [p, q] = [hull[0], hull[hull.length - 1]];
                                expect(orient(p, q, c)).toBe(0);
                                expect(c.x).toBeGreaterThanOrEqual(Math.min(p.x, q.x));
                                expect(c.x).toBeLessThanOrEqual(Math.max(p.x, q.x));
                                expect(c.y).toBeGreaterThanOrEqual(Math.min(p.y, q.y));
                                expect(c.y).toBeLessThanOrEqual(Math.max(p.y, q.y));
                            }
                        }
                    }
                });
            }
        }
    });

    it('hull of a general piece is counterclockwise and skips interior points', () => {
        const piece = [{x: 0, y: 0}, {x: 4, y: 0}, {x: 4, y: 4}, {x: 1, y: 1}];
        expect(pieceHull(piece, 0, 3)).toEqual([0, 1, 2]);
    });

    it('a collinear net gives a segment, repeated points give a point', () => {
        expect(pieceHull(curvePieces(net([0, 0], [2, 2], [4, 4]), 2)[1], 2, 2)).toHaveLength(2);
        expect(pieceHull(net([0, 0], [2, 2], [4, 4]), 0, 2)).toEqual([0, 2]);
        expect(pieceHull(net([3, 3], [3, 3], [3, 3]), 0, 2)).toEqual([0]);
        expect(pieceHull(net([3, 3], [3, 3], [3, 3], [3, 3]), 0, 3)).toEqual([0]);
        expect(pieceHull(net([0, 0], [0, 0], [5, 1], [5, 1]), 0, 3)).toHaveLength(2);
    });

    it('degree 3 at the coordinate bound scales to integers at depth 4', () => {
        const bound = 2 ** 13;
        const source = net([-bound, bound], [bound, bound - 1], [-bound + 1, -bound], [bound, -bound + 3]);
        for (const piece of curvePieces(source, 4)) {
            for (const p of piece) {
                expect(Number.isInteger(p.x * 2 ** 12)).toBe(true);
                expect(Number.isInteger(p.y * 2 ** 12)).toBe(true);
                expect(Math.abs(p.x * 2 ** 12)).toBeLessThanOrEqual(2 ** 25);
            }
            expect(() => pieceHull(piece, 4, 3)).not.toThrow();
        }
    });
});

describe('input validation', () => {
    const quad = net([0, 0], [1, 1], [2, 0]);
    const cubic = net([0, 0], [1, 1], [2, 1], [3, 0]);
    it('rejects mixed degrees, wrong degrees, off-grid points and coordinates over the bound', () => {
        expect(() => curvePairRun(quad, cubic)).toThrow(RangeError);
        expect(() => curvePairRun(net([0, 0], [1, 1]), net([0, 0], [1, 1]))).toThrow(RangeError);
        const quartic = net([0, 0], [1, 1], [2, 0], [3, 3], [4, 0]);
        expect(() => curvePairRun(quartic, quartic)).toThrow(RangeError);
        expect(() => curvePairRun(quad, net([0, 0], [0.5, 1], [2, 0]))).toThrow(RangeError);
        expect(() => curvePairRun(quad, net([0, 0], [NaN, 1], [2, 0]))).toThrow(RangeError);
        expect(() => curvePairRun(quad, net([0, 0], [1, 8193], [2, 0]))).toThrow(RangeError);
        expect(() => curvePairRun(net([-8193, 0], [1, 1], [2, 0]), quad)).toThrow(RangeError);
        expect(() => curvePairRun(net([8192, -8192], [1, 1], [2, 0]), quad)).not.toThrow();
        expect(() => curvePieces(quad, 6)).toThrow(RangeError);
        expect(() => curvePieces(net([0, 0], [1, 1]), 1)).toThrow(RangeError);
        expect(() => pieceHull(net([0, 0], [0.3, 1], [2, 0]), 0, 2)).toThrow(RangeError);
        expect(cubic.length).toBe(4);
    });
});
