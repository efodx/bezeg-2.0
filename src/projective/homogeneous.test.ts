import {describe, expect, it} from 'vitest';
import {orient} from '../compgeo/predicates';
import {
    collinear,
    concurrent,
    crossRatio,
    det3,
    equal,
    hom,
    isHarmonic,
    isIdeal,
    isZero,
    join,
    lineAtInfinity,
    meet,
    point,
    pointFromQuarters,
    project,
    toAffine,
    type Hom,
} from './homogeneous';

/** Deterministic PRNG (mulberry32) so the property tests are reproducible. */
function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function ratio(a: Hom, b: Hom, c: Hom, d: Hom): readonly [bigint, bigint] {
    const r = crossRatio(a, b, c, d);
    if (r.status !== 'ok') throw new Error(`cross-ratio status ${r.status}`);
    return [r.value.num, r.value.den];
}

function image(centre: Hom, from: Hom, to: Hom, p: Hom): Hom {
    const r = project(centre, from, to, p);
    if (r.status !== 'ok') throw new Error(`projection status ${r.status}`);
    return r.image;
}

const xAxis = join(point(0, 0), point(1, 0)); // y = 0
const slanted = join(point(0, 1), point(2, 2)); // y = 1 + x/2
const O = point(0, 5);
const onAxis = (x: number) => point(x, 0);

describe('construction and normalization', () => {
    it('rejects non-integers and the zero triple with RangeError', () => {
        expect(() => hom(0.5, 1, 1)).toThrow(RangeError);
        expect(() => hom(0, 0, 0)).toThrow(RangeError);
        expect(() => point(NaN, 1)).toThrow(RangeError);
        expect(() => pointFromQuarters(0.3, 1)).toThrow(RangeError);
    });

    it('normalizes by gcd and sign so equal points compare equal', () => {
        expect(hom(-2, -4, -6)).toEqual([1n, 2n, 3n]);
        expect(equal(hom(2, 4, 6), hom(-1, -2, -3))).toBe(true);
        expect(equal(hom(1, 2, 3), hom(1, 2, 4))).toBe(false);
        expect(pointFromQuarters(0.25, 0.5)).toEqual([1n, 2n, 4n]);
    });
});

describe('join, meet, predicates, toAffine', () => {
    it('join and meet are the cross product', () => {
        expect(join(point(0, 0), point(1, 1))).toEqual([1n, -1n, 0n]);
        expect(meet(join(point(0, 0), point(1, 1)), join(point(0, 1), point(1, 0)))).toEqual([1n, 1n, 2n]);
        expect(isZero(join(point(1, 1), point(1, 1)))).toBe(true);
    });

    it('decides collinear and concurrent exactly', () => {
        expect(collinear(point(0, 0), point(1, 1), point(5, 5))).toBe(true);
        expect(collinear(point(0, 0), point(1, 1), point(5, 6))).toBe(false);
        const l1 = join(point(0, 0), point(1, 0));
        const l2 = join(point(0, 0), point(0, 1));
        const l3 = join(point(0, 0), point(1, 1));
        expect(concurrent(l1, l2, l3)).toBe(true);
        expect(concurrent(l1, l2, join(point(1, 0), point(0, 1)))).toBe(false);
        expect(det3(point(0, 0), point(1, 0), point(0, 1))).toBe(1n);
    });

    it('toAffine returns exact fractions or a direction, never NaN', () => {
        const p = toAffine(hom(8, 15, 11));
        expect(p.kind).toBe('finite');
        if (p.kind === 'finite') {
            expect(p.x).toEqual({num: 8n, den: 11n});
            expect(p.view.y).toBeCloseTo(15 / 11, 12);
        }
        expect(toAffine(hom(-40, -20, 0))).toEqual({kind: 'ideal', direction: [2n, 1n]});
        expect(isIdeal(meet(xAxis, join(point(0, 1), point(1, 1))))).toBe(true);
        expect(lineAtInfinity()).toEqual([0n, 0n, 1n]);
        // Non-reducing huge fraction: the shift path must run and keep the ratio (10^400+1)/(10^399+7) close to 10.
        const huge = toAffine([10n ** 400n + 1n, 3n, 10n ** 399n + 7n]);
        expect(huge.kind).toBe('finite');
        if (huge.kind === 'finite') {
            expect(huge.view.x).toBeCloseTo(10, 9);
            expect(Number.isFinite(huge.view.y)).toBe(true);
        }
        // Huge numerator over a small denominator overflows the double range: clamped, never Infinity or NaN.
        const far = toAffine([10n ** 400n, -(10n ** 400n), 1n]);
        expect(far.kind === 'finite' && far.view.x).toBe(Number.MAX_VALUE);
        expect(far.kind === 'finite' && far.view.y).toBe(-Number.MAX_VALUE);
        const moderate = toAffine([3n * 2n ** 900n + 1n, 1n, 2n ** 80n]);
        expect(moderate.kind === 'finite' && moderate.view.x / 2 ** 820).toBeCloseTo(3, 12);
    });
});

describe('K1 cross-ratio values', () => {
    it('0,1,3,4 give 9/8', () => {
        expect(ratio(onAxis(0), onAxis(1), onAxis(3), onAxis(4))).toEqual([9n, 8n]);
    });

    it('images from (0,5) on y = 1 + x/2 are the stated points with ratio 9/8', () => {
        const images = [0, 1, 3, 4].map((x) => image(O, xAxis, slanted, onAxis(x)));
        const expected = [
            [0n, 1n, 1n],
            [8n, 15n, 11n],
            [24n, 25n, 13n],
            [16n, 15n, 7n],
        ] as const;
        expect(images).toHaveLength(4);
        images.forEach((img, i) => expect(img).toEqual(expected[i]));
        expect(ratio(images[0], images[1], images[2], images[3])).toEqual([9n, 8n]);
    });

    it('0,6,2,-6 is harmonic (ratio -1) and 0,1,3,4 is not', () => {
        expect(ratio(onAxis(0), onAxis(6), onAxis(2), onAxis(-6))).toEqual([-1n, 1n]);
        expect(isHarmonic(onAxis(0), onAxis(6), onAxis(2), onAxis(-6))).toBe(true);
        expect(isHarmonic(onAxis(0), onAxis(1), onAxis(3), onAxis(4))).toBe(false);
    });

    it('D = -10 projects to the ideal direction (-40,-20,0); 33/20 matches the limit formula', () => {
        const r = project(O, xAxis, slanted, onAxis(-10));
        expect(r.status).toBe('ok');
        if (r.status !== 'ok') return;
        expect(r.ideal).toBe(true);
        expect(equal(r.image, hom(-40, -20, 0))).toBe(true);

        expect(crossRatio(onAxis(0), onAxis(1), onAxis(3), onAxis(-10))).toEqual({
            status: 'ok',
            value: {num: 33n, den: 20n},
            usedLimit: false,
        });

        const images = [0, 1, 3].map((x) => image(O, xAxis, slanted, onAxis(x)));
        expect(crossRatio(images[0], images[1], images[2], r.image)).toEqual({
            status: 'ok',
            value: {num: 33n, den: 20n},
            usedLimit: true,
        });
        // (A,B;C,D) = (B,A;D,C) = (C,D;A,B) = (D,C;B,A): the ideal point in positions C, B and A.
        const limitCase = {status: 'ok', value: {num: 33n, den: 20n}, usedLimit: true};
        expect(crossRatio(images[1], images[0], r.image, images[2])).toEqual(limitCase);
        expect(crossRatio(images[2], r.image, images[0], images[1])).toEqual(limitCase);
        expect(crossRatio(r.image, images[2], images[1], images[0])).toEqual(limitCase);

        // Independent limit formula (A,B;C,inf) = (C-A)/(C-B) on the image x-coordinates 0, 8/11, 24/13.
        const [a, b, c] = images.map((p) => toAffine(p));
        if (a.kind !== 'finite' || b.kind !== 'finite' || c.kind !== 'finite') throw new Error('finite expected');
        // x = n/d; (C-A)/(C-B) = ((cn*ad - an*cd)/(cd*ad)) / ((cn*bd - bn*cd)/(cd*bd))
        const num = (c.x.num * a.x.den - a.x.num * c.x.den) * b.x.den;
        const den = (c.x.num * b.x.den - b.x.num * c.x.den) * a.x.den;
        expect(num * 20n).toBe(den * 33n);
    });

    it('typed statuses, no division by zero', () => {
        expect(crossRatio(onAxis(0), onAxis(0), onAxis(3), onAxis(4)).status).toBe('coincident');
        expect(crossRatio(hom(2, 0, 2), onAxis(1), onAxis(3), onAxis(4)).status).toBe('coincident');
        expect(crossRatio(onAxis(0), onAxis(1), onAxis(3), point(4, 1)).status).toBe('not-collinear');
        expect(project(point(1, 0), xAxis, slanted, onAxis(3)).status).toBe('centre-on-line');
        expect(project(point(0, 1), xAxis, slanted, onAxis(3)).status).toBe('centre-on-line');
        expect(project(O, xAxis, slanted, point(3, 1)).status).toBe('point-off-line');
    });
});

describe('property and exactness', () => {
    it('cross-ratio is invariant under projection over seeded random grid placements', () => {
        const next = rng(20261031);
        const int = (lim: number) => Math.floor(next() * (2 * lim + 1)) - lim;
        let checked = 0;
        for (let iter = 0; iter < 400; iter++) {
            const base = [int(20), int(20)];
            const dir = [int(5), int(5)];
            if (dir[0] === 0 && dir[1] === 0) continue;
            const ts = [int(8), int(8), int(8), int(8)];
            const pts = ts.map((t) => point(base[0] + t * dir[0], base[1] + t * dir[1]));
            const line = join(point(base[0], base[1]), point(base[0] + dir[0], base[1] + dir[1]));
            const to = join(point(int(20), int(20)), point(int(20), int(20)));
            const centre = point(int(20), int(20));
            if (isZero(to)) continue;
            const projected = pts.map((p) => project(centre, line, to, p));
            const before = crossRatio(pts[0], pts[1], pts[2], pts[3]);
            if (before.status !== 'ok' || projected.some((r) => r.status !== 'ok')) continue;
            const imgs = projected.map((r) => (r.status === 'ok' ? r.image : pts[0]));
            const after = crossRatio(imgs[0], imgs[1], imgs[2], imgs[3]);
            expect(after.status).toBe('ok');
            if (after.status === 'ok') expect(after.value).toEqual(before.value);
            checked++;
        }
        expect(checked).toBeGreaterThan(100);
    });

    it('stays exact with coordinates near 2^12, where products exceed 2^53', () => {
        // Points on the line through (-4096,4095) with direction (4093,-4091), at parameters 0,1,3,4.
        const pts = [0n, 1n, 3n, 4n].map((t) => hom(-4096n + t * 4093n, 4095n + t * -4091n, 1));
        const line = join(pts[0], pts[1]);
        const to = join(point(-4087, -4093), point(4089, 4085));
        const centre = point(4091, -4099);
        const imgs = pts.map((p) => image(centre, line, to, p));
        // The bracket product behind the cross-ratio numerator is far beyond double precision here.
        const bracketProduct = det3(imgs[0], imgs[2], centre) * det3(imgs[1], imgs[3], centre);
        expect((bracketProduct < 0n ? -bracketProduct : bracketProduct) > 2n ** 53n).toBe(true);
        expect(ratio(pts[0], pts[1], pts[2], pts[3])).toEqual([9n, 8n]);
        expect(ratio(imgs[0], imgs[1], imgs[2], imgs[3])).toEqual([9n, 8n]);
        // A second projection onto another large line: 2x2 minors of the image rows now exceed 2^53 themselves.
        const to2 = join(point(4093, -4090), point(-4089, 4086));
        const centre2 = point(-4095, 4092);
        const imgs2 = imgs.map((p) => image(centre2, to, to2, p));
        const minor = imgs2[0][0] * imgs2[1][1] - imgs2[0][1] * imgs2[1][0];
        expect((minor < 0n ? -minor : minor) > 2n ** 53n).toBe(true);
        expect(ratio(imgs2[0], imgs2[1], imgs2[2], imgs2[3])).toEqual([9n, 8n]);
    });

    it('sign of det3 with w = 1 equals compgeo orient on sampled grid points', () => {
        const next = rng(7);
        const int = () => Math.floor(next() * 8193) - 4096;
        let nonzero = 0;
        let zero = 0;
        for (let i = 0; i < 500; i++) {
            const a = {x: int(), y: int()};
            const b = {x: int(), y: int()};
            // every fifth sample is exactly collinear so that the zero branch is covered
            const c = i % 5 === 0 ? {x: 2 * b.x - a.x, y: 2 * b.y - a.y} : {x: int(), y: int()};
            const d = det3(point(a.x, a.y), point(b.x, b.y), point(c.x, c.y));
            const sign = d > 0n ? 1 : d < 0n ? -1 : 0;
            expect(sign).toBe(orient(a, b, c));
            if (sign === 0) zero++;
            else nonzero++;
        }
        expect(zero).toBeGreaterThan(50);
        expect(nonzero).toBeGreaterThan(300);
    });
});
