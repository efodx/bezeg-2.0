import {describe, expect, it} from 'vitest';
import {GRID_COORD_LIMIT, type GridPoint} from './grid';
import {polygonSimplicity} from './predicates';
import {
    boundaryLatticeCount,
    doubledSignedArea,
    polygonMeasures,
    strictlyInsidePolygon,
    type PolygonMeasures,
} from './polygonMeasures';

const p = (x: number, y: number): GridPoint => ({x, y});
const poly = (...c: [number, number][]) => c.map(([x, y]) => p(x, y));
const HULL = poly([-1, 3], [0, 0], [4, 0], [5, 3], [2, 5]);
const NOTCHED = poly([0, 0], [6, 0], [6, 4], [3, 2], [0, 4]);

function simple(m: PolygonMeasures) {
    if (m.kind !== 'simple') throw new Error(`expected simple, got ${m.kind}`);
    return m;
}

const interiorOf = (m: ReturnType<typeof simple>) => (m.interior.ok ? m.interior.interior : -1);

/** Deterministic LCG so failures reproduce. */
function rng(seed: number) {
    let s = seed >>> 0;
    return (n: number) => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s % n;
    };
}

describe('polygonMeasures reference numbers', () => {
    it('hull pentagon: doubled 42, B 8, I 18, Pick 42', () => {
        const m = simple(polygonMeasures(HULL));
        expect(m.doubledSignedArea).toBe(42n);
        expect(m.orientation).toBe('ccw');
        expect(m.boundary).toBe(8);
        expect(interiorOf(m)).toBe(18);
        expect(m.pickDoubledArea).toBe(42);
        expect(m.pickHolds).toBe(true);
        expect(m.fan.reduce((a, b) => a + b, 0n)).toBe(42n);
    });

    it('notched pentagon: doubled 36, B 16, I 11', () => {
        const m = simple(polygonMeasures(NOTCHED));
        expect(m.doubledSignedArea).toBe(36n);
        expect(m.boundary).toBe(16);
        expect(interiorOf(m)).toBe(11);
        expect(m.pickHolds).toBe(true);
    });

    it('reversing negates the signed area and keeps |A|, B, I; rotating changes nothing', () => {
        for (const v of [HULL, NOTCHED]) {
            const a = simple(polygonMeasures(v));
            const r = simple(polygonMeasures([...v].reverse()));
            expect(r.doubledSignedArea).toBe(-a.doubledSignedArea);
            expect(r.orientation).toBe('cw');
            expect(r.boundary).toBe(a.boundary);
            expect(interiorOf(r)).toBe(interiorOf(a));
            expect(r.pickHolds).toBe(true);
            for (let k = 1; k < v.length; k++) {
                const rot = simple(polygonMeasures([...v.slice(k), ...v.slice(0, k)]));
                expect(rot.doubledSignedArea).toBe(a.doubledSignedArea);
                expect(rot.boundary).toBe(a.boundary);
                expect(interiorOf(rot)).toBe(interiorOf(a));
            }
        }
    });
});

describe('non-simple polygons', () => {
    it('crossed quadrilateral gives signed sum 18 and no B/I/Pick', () => {
        const m = polygonMeasures(poly([0, 0], [6, 0], [0, 6], [3, 6]));
        expect(m.kind).toBe('signed-sum');
        if (m.kind === 'signed-sum') expect(m.doubledSignedSum).toBe(18n);
        expect(m).not.toHaveProperty('boundary');
        expect(m).not.toHaveProperty('interior');
    });

    it('symmetric bow-tie sums to 0', () => {
        const m = polygonMeasures(poly([0, 0], [4, 4], [4, 0], [0, 4]));
        expect(m.kind).toBe('signed-sum');
        if (m.kind === 'signed-sum') expect(m.doubledSignedSum).toBe(0n);
    });

    it('collinear (zero-area) polygon is non-simple with signed sum 0', () => {
        const m = polygonMeasures(poly([0, 0], [1, 1], [2, 2]));
        expect(m.kind).toBe('signed-sum');
        if (m.kind === 'signed-sum') expect(m.doubledSignedSum).toBe(0n);
    });
});

describe('no-area cases', () => {
    it.each([0, 1, 2])('n = %i has no area claim', (n) => {
        expect(polygonMeasures([p(0, 0), p(1, 0)].slice(0, n))).toEqual({kind: 'no-area', reason: 'too-few-vertices'});
    });

    it('open polygon has no area claim', () => {
        expect(polygonMeasures(HULL, false)).toEqual({kind: 'no-area', reason: 'open'});
    });
});

describe('lattice counting', () => {
    it('collinear consecutive vertices count on the boundary, never inside', () => {
        const m = simple(polygonMeasures(poly([0, 0], [2, 0], [4, 0], [4, 4], [0, 4])));
        expect(m.doubledSignedArea).toBe(32n);
        expect(m.boundary).toBe(16);
        expect(interiorOf(m)).toBe(9);
        expect(m.pickHolds).toBe(true);
    });

    it('boundary points and vertices are never strictly inside', () => {
        for (const v of [HULL, NOTCHED]) {
            for (const q of v) expect(strictlyInsidePolygon(q, v)).toBe(false);
        }
        expect(strictlyInsidePolygon(p(3, 0), NOTCHED)).toBe(false); // on an edge
        expect(strictlyInsidePolygon(p(3, 3), NOTCHED)).toBe(false); // inside the notch
        expect(strictlyInsidePolygon(p(3, 1), NOTCHED)).toBe(true);
    });

    it('a ray through a vertex is counted once (half-open rule)', () => {
        const diamond = poly([0, 0], [2, -2], [4, 0], [2, 2]);
        expect(strictlyInsidePolygon(p(1, 0), diamond)).toBe(true);
        expect(strictlyInsidePolygon(p(-1, 0), diamond)).toBe(false);
        expect(strictlyInsidePolygon(p(5, 0), diamond)).toBe(false);
    });

    it('Pick holds on random simple lattice polygons', () => {
        const r = rng(12345);
        let kept = 0;
        for (let t = 0; t < 20000 && kept < 300; t++) {
            const v = Array.from({length: 3 + r(6)}, () => p(r(13) - 6, r(13) - 6));
            if (!polygonSimplicity(v, true).simple) continue;
            kept++;
            const m = simple(polygonMeasures(v));
            expect(m.interior.ok).toBe(true);
            expect(m.pickHolds).toBe(true);
            expect(m.doubledSignedArea === 0n).toBe(false);
        }
        expect(kept).toBeGreaterThanOrEqual(300);
    });
});

describe('exactness and refusal', () => {
    const L = GRID_COORD_LIMIT;

    it('extreme corners: a non-simple sum above 2^53 is exact, not a rounded double', () => {
        // Square A(-L,-L) B(L,-L) C(L,L) D(-L,L) has doubled area (2L)^2 * 2 = 2^53 (side 2L = 2^26). Closing at A and
        // then adding triangle A, T1(L,-L+1), T2(L-1,L) adds its doubled area, the orientation determinant
        // (2L)(2L) - (1)(2L-1) = 2^52 - 2^26 + 1. Total: 2^53 + 2^52 - 2^26 + 1 = 13510798815002625, which is odd and
        // above 2^53, hence not a double.
        const v = poly([-L, -L], [L, -L], [L, L], [-L, L], [-L, -L], [L, -L + 1], [L - 1, L]);
        const expected = 13510798815002625n;
        expect(BigInt(Number(expected)) === expected).toBe(false);
        const m = polygonMeasures(v);
        expect(m.kind).toBe('signed-sum');
        if (m.kind === 'signed-sum') {
            expect(m.doubledSignedSum).toBe(expected);
            expect(m.fan.reduce((a, b) => a + b, 0n)).toBe(expected);
        }
        expect(doubledSignedArea(poly([-L, -L], [L, -L], [L, L], [-L, L]))).toBe(2n ** 53n);
    });

    it('huge simple polygon: exact area and boundary, interior scan refused with a reason', () => {
        const m = simple(polygonMeasures(poly([-L, -L], [L, -L], [L, L], [-L, L])));
        expect(m.doubledSignedArea).toBe(2n ** 53n);
        expect(m.boundary).toBe(4 * 2 * L);
        expect(m.interior).toMatchObject({ok: false, reason: 'box-too-large'});
        expect(m.pickHolds).toBeUndefined();
    });

    it('a small cap refuses a small polygon too', () => {
        const m = simple(polygonMeasures(HULL, true, 10));
        expect(m.interior).toEqual({ok: false, reason: 'box-too-large', boxPoints: 42});
    });

    it('boundary count uses gcd on a slanted edge', () => {
        expect(boundaryLatticeCount(poly([0, 0], [6, 4], [0, 4]))).toBe(2 + 6 + 4);
    });
});
