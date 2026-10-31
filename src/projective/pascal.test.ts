import {describe, expect, it} from 'vitest';
import {equal, hom, isIdeal, point, type Hom} from './homogeneous';
import {pascal} from './pascal';
import {conic, type Conic} from './conic';
import {DIRECTION_TABLE, secondIntersection} from './conicPencil';

function ok(h: readonly Hom[]) {
    const r = pascal(h);
    if (r.status !== 'ok') throw new Error(`expected ok, got ${r.status}`);
    return r;
}

describe('Pascal (K2)', () => {
    it('ellipse hexagon: points (-15,24), (12,3/5), (15/2,9/2), determinant exactly 0', () => {
        const hexagon = [point(5, 0), hom(15, 12, 5), point(0, 3), hom(-15, 12, 5), point(0, -3), hom(20, -9, 5)];
        const r = ok(hexagon);
        expect(equal(r.points[0], hom(-15, 24, 1))).toBe(true);
        expect(equal(r.points[1], hom(60, 3, 5))).toBe(true);
        expect(equal(r.points[2], hom(15, 9, 2))).toBe(true);
        expect(r.determinant).toBe(0n);
        expect(r.collinear).toBe(true);
        expect(r.line).not.toBeNull();
    });

    it('Pappus: (8/5,6/5), (22/5,9/5), (3,3/2), collinear', () => {
        const [A1, A2, A3] = [point(0, 0), point(2, 0), point(5, 0)];
        const [B1, B2, B3] = [point(1, 3), point(4, 3), point(6, 3)];
        const r = ok([A1, B2, A3, B1, A2, B3]);
        expect(equal(r.points[0], hom(8, 6, 5))).toBe(true);
        expect(equal(r.points[1], hom(22, 9, 5))).toBe(true);
        expect(equal(r.points[2], hom(6, 3, 2))).toBe(true);
        expect(r.determinant).toBe(0n);
    });

    it('parallel sides: the ideal Pascal point (-9,-9,0), the others on a line of slope 1', () => {
        const [A1, A2, A3] = [point(0, 0), point(1, 0), point(6, 0)];
        const [B1, B2, B3] = [point(4, 3), point(3, 3), point(8, 3)];
        const r = ok([A1, B2, A3, B1, A2, B3]);
        expect(isIdeal(r.points[0])).toBe(true);
        expect(equal(r.points[0], hom(-9, -9, 0))).toBe(true);
        expect(equal(r.points[1], hom(9, 3, 2))).toBe(true);
        expect(equal(r.points[2], hom(24, 9, 5))).toBe(true);
        expect(r.determinant).toBe(0n);
        // a line of slope 1 is a x + b y + c = 0 with a = -b
        expect(r.line !== null && r.line[0] === -r.line[1]).toBe(true);
    });

    it('a generic hexagon is not collinear (determinant non-zero)', () => {
        const r = ok([point(0, 0), point(4, 1), point(5, 5), point(1, 6), point(-3, 2), point(-1, -3)]);
        expect(r.determinant).not.toBe(0n);
        expect(r.collinear).toBe(false);
        expect(r.line).toBeNull();
    });

    it('coincident neighbours give a typed status, no NaN', () => {
        const p = point(5, 0);
        expect(pascal([p, p, point(0, 3), point(-3, 2), point(0, -3), point(4, -2)])).toEqual({
            status: 'undefined-side',
            side: 0,
        });
        expect(pascal([point(1, 2), point(0, 3), point(2, 5), point(-3, 2), point(0, -3), point(1, 2)])).toEqual({
            status: 'undefined-side',
            side: 5,
        });
    });

    it('opposite sides on one line give a typed status', () => {
        // P0P1 and P3P4 both on the x axis
        const r = pascal([point(0, 0), point(1, 0), point(3, 4), point(5, 0), point(7, 0), point(2, 9)]);
        expect(r).toEqual({status: 'coincident-opposite-sides', pair: 0});
    });
});

// Fixed-seed property test: exact zero determinant for random table positions on all four conic types.
function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface Case {
    name: string;
    c: Conic;
    /** The equation written independently of the kernel. */
    form: (x: bigint, y: bigint, w: bigint) => bigint;
    bases: Hom[];
    /** Keep the hexagon alternating between the two bases (Pappus configuration); a random order would repeat a line. */
    alternate?: boolean;
}

const CASES: Case[] = [
    {
        name: 'ellipse',
        c: conic(9, 0, 25, 0, 0, -225),
        form: (x, y, w) => 9n * x * x + 25n * y * y - 225n * w * w,
        bases: [point(5, 0)],
    },
    {
        name: 'tilted ellipse',
        c: conic(1, 1, 1, 0, 0, -3),
        form: (x, y, w) => x * x + x * y + y * y - 3n * w * w,
        bases: [point(1, 1)],
    },
    {name: 'parabola', c: conic(0, 0, 1, -4, 0, 0), form: (x, y, w) => y * y - 4n * x * w, bases: [point(0, 0)]},
    {
        name: 'hyperbola',
        c: conic(16, 0, -9, 0, 0, -144),
        form: (x, y, w) => 16n * x * x - 9n * y * y - 144n * w * w,
        bases: [point(3, 0)],
    },
    // y (x - 2y - 3) = 0: alternate base points on y = 0 and on x - 2y - 3 = 0 (Pappus configurations)
    {
        name: 'line pair',
        c: conic(0, 1, -2, 0, -3, 0),
        form: (x, y, w) => y * (x - 2n * y - 3n * w),
        bases: [point(1, 0), point(1, -1)],
        alternate: true,
    },
];

describe('Pascal property test over the pencil table', () => {
    it.each(CASES)('$name: determinant is exactly 0 for random positions and orders', ({c, form, bases, alternate}) => {
        const rand = mulberry32(20261031);
        let checked = 0;
        for (let trial = 0; trial < 300; trial++) {
            const pts: Hom[] = [];
            for (let i = 0; i < 6; i++) {
                const base = bases[i % bases.length];
                const dir = DIRECTION_TABLE[Math.floor(rand() * DIRECTION_TABLE.length)];
                const r = secondIntersection(c, base, dir);
                if (r.status !== 'ok') continue;
                expect(form(r.point[0], r.point[1], r.point[2])).toBe(0n);
                pts.push(r.point);
            }
            if (pts.length < 6) continue;
            const shuffle2 = (a: Hom[]) => (shuffle(a), a);
            const shuffle = (a: Hom[]) => {
                for (let i = a.length - 1; i > 0; i--) {
                    const j = Math.floor(rand() * (i + 1));
                    [a[i], a[j]] = [a[j], a[i]];
                }
            };
            if (alternate) {
                const evens = shuffle2(pts.filter((_, i) => i % 2 === 0));
                const odds = shuffle2(pts.filter((_, i) => i % 2 === 1));
                pts.splice(0, 6, ...[0, 1, 2].flatMap((i) => [evens[i], odds[i]]));
            } else {
                shuffle(pts);
            }
            const res = pascal(pts);
            if (res.status !== 'ok') continue;
            expect(res.determinant).toBe(0n);
            checked++;
        }
        expect(checked).toBeGreaterThan(100);
    });
});
