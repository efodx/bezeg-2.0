import {describe, expect, it} from 'vitest';
import {doubledSignedArea} from '../compgeo/polygonMeasures';
import {Rational, RationalPoint} from '../compgeo/rational';
import {doubledRationalArea, solveLinearProgram, type LpConstraint} from './lp2';

const K = (a: number, b: number, c: number): LpConstraint => ({a, b, c});
const fmt = (v: RationalPoint): string => `${v.x.format()},${v.y.format()}`;
const fmtAll = (vs: readonly RationalPoint[]): string[] => vs.map(fmt);

function mulberry32(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

describe('LS5 checked numbers', () => {
    const main = [K(1, 2, 8), K(3, 1, 9)];

    it('has the four vertices, maximum 12 at (2,3) and the walk (0,0) -> (3,0) -> (2,3)', () => {
        const r = solveLinearProgram(main, {p: 3, q: 2});
        expect(r.region).toBe('polygon');
        expect(r.bounded).toBe(true);
        expect(fmtAll(r.vertices).sort()).toEqual(['0,0', '0,4', '2,3', '3,0']);
        expect(r.optimum?.value.format()).toBe('12');
        expect(fmtAll(r.optimum!.vertices)).toEqual(['2,3']);
        expect(fmtAll(r.walk)).toEqual(['0,0', '3,0', '2,3']);
        expect(r.optimalEdge).toBe(false);
    });

    it('objective values at the vertices are 0, 9, 12, 8 (hand computed)', () => {
        const r = solveLinearProgram(main, {p: 3, q: 2});
        const byVertex = new Map(r.vertices.map(v => [fmt(v), v.x.mul(Rational.of(3)).add(v.y.mul(Rational.of(2))).format()]));
        expect(Object.fromEntries(byVertex)).toEqual({'0,0': '0', '3,0': '9', '2,3': '12', '0,4': '8'});
    });

    it('objective x + 2y is parallel to the first side: optimal edge (2,3)-(0,4), value 8', () => {
        const r = solveLinearProgram(main, {p: 1, q: 2});
        expect(r.optimum?.value.format()).toBe('8');
        expect(fmtAll(r.optimum!.vertices).sort()).toEqual(['0,4', '2,3']);
        expect(r.optimalEdge).toBe(true);
        expect(r.walk.length).toBeGreaterThan(1);
        expect(['2,3', '0,4']).toContain(fmt(r.walk[r.walk.length - 1]));
    });

    it('degenerate vertex (3,1) is listed once although three pairs meet there', () => {
        const r = solveLinearProgram([K(1, 1, 4), K(1, 3, 6), K(1, 0, 3)], {p: 3, q: 2});
        expect(r.constraints.length).toBe(5);
        expect(fmtAll(r.vertices).sort()).toEqual(['0,0', '0,2', '3,0', '3,1']);
        expect(r.optimum?.value.format()).toBe('11');
        expect(fmtAll(r.optimum!.vertices)).toEqual(['3,1']);
        // Hand count: 10 pairs of the 5 lines, 3 pairs at (3,1), so without dedupe there would be 6 feasible hits.
        expect(r.vertices.length).toBe(4);
    });

    it('exact fractions: vertex coordinates are reduced', () => {
        const r = solveLinearProgram([K(2, 3, 7), K(5, 1, 6)], {p: 1, q: 1});
        // 2x+3y=7, 5x+y=6 -> x = 11/13, y = 23/13 (hand solved: 2x+3(6-5x)=7 gives x = 11/13, y = 6-55/13).
        expect(fmtAll(r.vertices)).toContain('11/13,23/13');
        expect(r.optimum?.value.format()).toBe('34/13'); // 11/13+23/13
    });
});

describe('region kinds and statuses', () => {
    it('reports infeasible when no vertex exists', () => {
        const r = solveLinearProgram([K(1, 1, -1)], {p: 1, q: 1});
        expect(r.region).toBe('infeasible');
        expect(r.vertices).toEqual([]);
        expect(r.optimum).toBeNull();
        expect(r.unbounded).toBe(false);
        expect(solveLinearProgram([K(-1, 0, -3), K(1, 0, 1)], {p: 1, q: 0}).region).toBe('infeasible');
    });

    it('reports a point when a constraint holds with equality (x + y <= 0)', () => {
        const r = solveLinearProgram([K(1, 1, 0)], {p: 2, q: 5});
        expect(r.region).toBe('point');
        expect(fmtAll(r.vertices)).toEqual(['0,0']);
        expect(r.bounded).toBe(true);
        expect(r.optimum?.value.format()).toBe('0');
    });

    it('reports a segment: y <= 0 with x <= 4', () => {
        const r = solveLinearProgram([K(0, 1, 0), K(1, 0, 4)], {p: 1, q: 1});
        expect(r.region).toBe('segment');
        expect(fmtAll(r.vertices)).toEqual(['0,0', '4,0']);
        expect(r.optimum?.value.format()).toBe('4');
        expect(r.walk).toEqual([]);
    });

    it('unbounded needs a recession ray that improves the objective', () => {
        const region = [K(1, -1, 2)]; // x - y <= 2: rays (0,1) and (1,1)
        const up = solveLinearProgram(region, {p: 1, q: 1});
        expect(up.unbounded).toBe(true);
        expect(up.optimum).toBeNull();
        expect(up.bounded).toBe(false);
        // Same unbounded region, objective pointing the other way: bounded optimum at a vertex.
        const down = solveLinearProgram(region, {p: -1, q: -1});
        expect(down.bounded).toBe(false);
        expect(down.unbounded).toBe(false);
        expect(down.optimum?.value.format()).toBe('0');
        const mixed = solveLinearProgram(region, {p: 1, q: -1});
        expect(mixed.unbounded).toBe(false);
        expect(mixed.optimum?.value.format()).toBe('2');
        expect(fmtAll(mixed.optimum!.vertices)).toEqual(['2,0']);
        expect(mixed.walk).toEqual([]);
    });

    it('an unbounded feasible region reports region unbounded, whatever its vertex count', () => {
        const one = solveLinearProgram([K(1, -1, 2)], {p: -1, q: -1});
        expect(one.vertices.length).toBe(2);
        expect(one.region).toBe('unbounded');
        const single = solveLinearProgram([K(0, 1, 0)], {p: 1, q: 0});
        expect(fmtAll(single.vertices)).toEqual(['0,0']);
        expect(single.region).toBe('unbounded');
        expect(solveLinearProgram([K(1, 1, 1)], {p: 1, q: 1}).region).toBe('polygon');
    });

    it('rays are primitive integer directions without duplicates', () => {
        const r = solveLinearProgram([K(2, -2, 4), K(3, -3, 6)], {p: 1, q: 1});
        const keys = r.rays.map(d => `${d.x},${d.y}`);
        expect(keys.sort()).toEqual(['0,1', '1,1']);
        const g = (x: number, y: number): number => (y === 0 ? Math.abs(x) : g(y, x % y));
        for (const d of r.rays) expect(g(d.x, d.y)).toBe(1);
    });

    it('rejects a row with a = b = 0 and non-integer input', () => {
        expect(() => solveLinearProgram([K(0, 0, 1)], {p: 1, q: 1})).toThrow(RangeError);
        expect(() => solveLinearProgram([K(1.5, 1, 1)], {p: 1, q: 1})).toThrow(RangeError);
        expect(() => solveLinearProgram([K(1, 1, 1)], {p: 0.5, q: 1})).toThrow(RangeError);
    });

    it('does not duplicate x>=0, y>=0 when the caller passes them', () => {
        const r = solveLinearProgram([K(-1, 0, 0), K(1, 1, 3)], {p: 1, q: 2});
        expect(r.constraints.length).toBe(3);
        expect(r.optimum?.value.format()).toBe('6');
    });
});

describe('area and brute force', () => {
    it('Rational area equals doubledSignedArea for the integer LS5 polygon (hand value 17)', () => {
        const r = solveLinearProgram([K(1, 2, 8), K(3, 1, 9)], {p: 1, q: 1});
        const area = doubledRationalArea(r.vertices);
        expect(area.format()).toBe('17');
        expect(BigInt(area.num)).toBe(doubledSignedArea(r.vertices.map(v => ({x: Number(v.x.num), y: Number(v.y.num)}))));
    });

    it('doubled area of a fractional quadrilateral is exact (2x+3y<=7, 5x+y<=6)', () => {
        const r = solveLinearProgram([K(2, 3, 7), K(5, 1, 6)], {p: 1, q: 0});
        // vertices (0,0), (6/5,0), (11/13,23/13), (0,7/3): hand shoelace = 6/5*23/13 + 11/13*7/3 = 138/65 + 77/39.
        expect(doubledRationalArea(r.vertices).format()).toBe('799/195');
    });

    it('random small programs agree with a brute-force lattice maximum', () => {
        const rnd = mulberry32(20261110);
        const int = (lo: number, hi: number): number => lo + Math.floor(rnd() * (hi - lo + 1));
        const L = 60;
        const W = 6;
        let compared = 0;
        let integerPolygons = 0;
        for (let t = 0; t < 400 && compared < 80; t++) {
            const rows: LpConstraint[] = [K(1, 0, W), K(0, 1, W)];
            for (let i = int(1, 3); i > 0; i--) {
                let a = int(-2, 3);
                const b = int(-2, 3);
                if (a === 0 && b === 0) a = 1;
                rows.push(K(a, b, int(0, 9)));
            }
            const p = int(-3, 3);
            const q = int(-3, 3);
            const r = solveLinearProgram(rows, {p, q});
            // Independent exactness check of every reported vertex against every row.
            for (const v of r.vertices) {
                for (const k of r.constraints) {
                    const lhsN = BigInt(k.a) * v.x.num * v.y.den + BigInt(k.b) * v.y.num * v.x.den;
                    expect(lhsN <= BigInt(k.c) * v.x.den * v.y.den).toBe(true);
                }
            }
            let latticeMax: number | null = null;
            for (let i = 0; i <= W * L; i++) {
                for (let j = 0; j <= W * L; j++) {
                    if (rows.every(k => k.a * i + k.b * j <= k.c * L)) {
                        const val = p * i + q * j;
                        if (latticeMax === null || val > latticeMax) latticeMax = val;
                    }
                }
            }
            if (r.region === 'infeasible') {
                expect(latticeMax).toBeNull();
                continue;
            }
            expect(r.bounded).toBe(true); // the box rows bound the region
            expect(r.unbounded).toBe(false);
            const onLattice = r.vertices.every(v => L % Number(v.x.den) === 0 && L % Number(v.y.den) === 0);
            if (!onLattice) {
                if (latticeMax !== null) expect(latticeMax / L).toBeLessThanOrEqual(Number(r.optimum!.value.num) / Number(r.optimum!.value.den) + 1e-12);
                continue;
            }
            compared++;
            if (r.region === 'polygon') {
                const n = r.vertices.length;
                const idx = r.walk.map(w => r.vertices.findIndex(v => v.equals(w)));
                expect(idx.every(i => i >= 0)).toBe(true);
                const val = (v: RationalPoint): Rational => v.x.mul(Rational.of(p)).add(v.y.mul(Rational.of(q)));
                for (let i = 1; i < idx.length; i++) {
                    const step = (idx[i] - idx[i - 1] + n) % n;
                    expect(step === 1 || step === n - 1).toBe(true);
                    expect(val(r.walk[i]).compare(val(r.walk[i - 1]))).toBe(1);
                }
                expect(r.optimum!.vertices.some(v => v.equals(r.walk[r.walk.length - 1]))).toBe(true);
            }
            expect(latticeMax).not.toBeNull();
            expect(Rational.of(latticeMax!, L).equals(r.optimum!.value)).toBe(true);
            if (r.vertices.every(v => v.x.den === 1n && v.y.den === 1n) && r.region === 'polygon') {
                integerPolygons++;
                const grid = r.vertices.map(v => ({x: Number(v.x.num), y: Number(v.y.num)}));
                expect(doubledRationalArea(r.vertices).equals(Rational.fromBigInt(doubledSignedArea(grid)))).toBe(true);
            }
        }
        expect(compared).toBeGreaterThanOrEqual(40);
        expect(integerPolygons).toBeGreaterThanOrEqual(5);
    });

    it('random unbounded programs: the unbounded flag matches a witness ray and a coarse lattice', () => {
        const rnd = mulberry32(777);
        const int = (lo: number, hi: number): number => lo + Math.floor(rnd() * (hi - lo + 1));
        let unboundedSeen = 0;
        let boundedOptimum = 0;
        for (let t = 0; t < 150; t++) {
            const rows: LpConstraint[] = [];
            for (let i = int(1, 3); i > 0; i--) {
                let a = int(-2, 3);
                const b = int(-2, 3);
                if (a === 0 && b === 0) a = 1;
                rows.push(K(a, b, int(0, 6)));
            }
            const p = int(-3, 3);
            const q = int(-3, 3);
            const r = solveLinearProgram(rows, {p, q});
            if (r.region === 'infeasible') continue;
            const inRegion = (x: number, y: number): boolean => r.constraints.every(k => k.a * x + k.b * y <= k.c * 2);
            if (r.unbounded) {
                unboundedSeen++;
                // Witness: some vertex plus 1000 times a recession ray is feasible and beats every vertex.
                const best = r.vertices.map(v => v.x.mul(Rational.of(p)).add(v.y.mul(Rational.of(q)))).reduce((m, v) => (v.compare(m) > 0 ? v : m));
                const witness = r.rays.some(d => r.vertices.some(v => {
                    const w = new RationalPoint(v.x.add(Rational.of(1000 * d.x)), v.y.add(Rational.of(1000 * d.y)));
                    return r.constraints.every(k => w.x.mul(Rational.of(k.a)).add(w.y.mul(Rational.of(k.b))).compare(Rational.of(k.c)) <= 0)
                        && w.x.mul(Rational.of(p)).add(w.y.mul(Rational.of(q))).compare(best) > 0;
                }));
                expect(witness).toBe(true);
            } else {
                boundedOptimum++;
                let latticeMax = -Infinity;
                for (let i = 0; i <= 120; i++) {
                    for (let j = 0; j <= 120; j++) {
                        if (inRegion(i, j)) latticeMax = Math.max(latticeMax, (p * i + q * j) / 2);
                    }
                }
                const opt = r.optimum!.value;
                expect(latticeMax * Number(opt.den)).toBeLessThanOrEqual(Number(opt.num) + 1e-9);
            }
        }
        expect(unboundedSeen).toBeGreaterThanOrEqual(5);
        expect(boundedOptimum).toBeGreaterThanOrEqual(20);
    });
});
