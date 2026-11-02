import {describe, expect, it} from 'vitest';
import {GridPoint} from './grid';
import {Rational, RationalPoint} from './rational';
import {intersectCircles, lineThrough, lineValue, powerOfPoint, type Circle} from './circle';
import {circleInversion} from '../analysis/complexMobius';
import {
    analyseAngle, analysePoint, analysePower, analyseSource, INVERSION_EXAMPLES, INVERSION_RADIUS_MAX, inversionExample,
    isInversionPoint, isInversionRadius, type CircleSpec, type Inversion, type InversionSource,
} from './inversionModel';

const O: GridPoint = {x: 0, y: 0};
const inv = (radius: number, centre: GridPoint = O): Inversion => ({centre, radius});
const q = (x: number, y: number, den = 1): RationalPoint => new RationalPoint(Rational.of(x, den), Rational.of(y, den));

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const randInt = (rng: () => number, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));
const randPoint = (rng: () => number): GridPoint => ({x: randInt(rng, -10, 10), y: randInt(rng, -10, 10)});
const randCircle = (rng: () => number): CircleSpec => ({centre: randPoint(rng), radius: randInt(rng, 1, INVERSION_RADIUS_MAX)});

/** Every number reachable in the value is finite (bigint and strings are skipped). */
function assertFinite(value: unknown, path = 'result'): void {
    if (typeof value === 'number') {
        expect(Number.isFinite(value), path).toBe(true);
    } else if (value !== null && typeof value === 'object') {
        for (const [key, inner] of Object.entries(value)) assertFinite(inner, `${path}.${key}`);
    }
}

describe('spec default numbers', () => {
    it('inverts the grid points of the default example in a circle of radius 2', () => {
        for (const [x, y, ex, ey] of [[1, 1, 2, 2], [1, -1, 2, -2], [2, 0, 2, 0]] as const) {
            const r = analysePoint(inv(2), {x, y});
            if (r.kind !== 'image') throw new Error('image expected');
            expect(r.exact.equals(q(ex, ey))).toBe(true);
            expect(r.drawn.x).toBeCloseTo(ex, 12);
            expect(r.drawn.y).toBeCloseTo(ey, 12);
        }
        const on = analysePoint(inv(2), {x: 2, y: 0});
        expect(on.kind === 'image' && on.position).toBe('on');
        const p = analysePoint(inv(2), {x: 3, y: 1});
        expect(p.kind === 'image' && p.position).toBe('outside');
    });

    it('maps the circle through the centre to the line x = 2', () => {
        const r = analyseSource(inv(2), {kind: 'circle', centre: {x: 1, y: 0}, radius: 1});
        if (r.kind !== 'image' || r.exact.kind !== 'line') throw new Error('line expected');
        expect(r.shape).toBe('line');
        expect(r.throughCentre).toBe(true);
        expect([r.exact.a.format(), r.exact.b.format(), r.exact.c.format()]).toEqual(['1', '0', '2']);
    });

    it('maps the circle (3,0) r 1 to the circle (3/2,0) r^2 1/4 and the sample points as listed', () => {
        const r = analyseSource(inv(2), {kind: 'circle', centre: {x: 3, y: 0}, radius: 1});
        if (r.kind !== 'image' || r.exact.kind !== 'circle') throw new Error('circle expected');
        expect(r.shape).toBe('circle');
        expect(r.throughCentre).toBe(false);
        expect(r.exact.centre.equals(q(3, 0, 2))).toBe(true);
        expect(r.exact.r2.equals(Rational.of(1, 4))).toBe(true);
        expect(r.drawn.kind === 'circle' && r.drawn.radius).toBeCloseTo(0.5, 12);
        for (const [x, y, ex, ey] of [[2, 0, q(2, 0), 0], [4, 0, q(1, 0), 0], [3, 1, q(6, 2, 5), 0]] as const) {
            void ey;
            const p = analysePoint(inv(2), {x, y});
            if (p.kind !== 'image') throw new Error('image expected');
            expect(p.exact.equals(ex)).toBe(true);
        }
    });

    it('gives power 16, secant points (2,0) and (8,0), product 16 and tangent length 4', () => {
        const r = analysePower(O, {centre: {x: 5, y: 0}, radius: 3}, 0);
        if (r.kind !== 'power' || r.secant.kind !== 'two') throw new Error('two points expected');
        expect(r.power.equals(Rational.of(16))).toBe(true);
        expect(r.position).toBe('outside');
        expect(r.secant.A.x).toBeCloseTo(2, 12);
        expect(r.secant.B.x).toBeCloseTo(8, 12);
        expect(Math.abs(r.secant.A.y)).toBeLessThan(1e-12);
        expect(Math.abs(r.secant.product - 16)).toBeLessThan(1e-12);
        expect(r.tangent?.length).toBeCloseTo(4, 12);
    });

    it('with r = 4 the circle (5,0) r 3 is mapped to itself and (2,0), (8,0), (5,3) map as listed', () => {
        const r = analyseSource(inv(4), {kind: 'circle', centre: {x: 5, y: 0}, radius: 3});
        if (r.kind !== 'image' || r.exact.kind !== 'circle') throw new Error('circle expected');
        expect(r.exact.centre.equals(q(5, 0))).toBe(true);
        expect(r.exact.r2.equals(Rational.of(9))).toBe(true);
        const a = analysePoint(inv(4), {x: 2, y: 0});
        const b = analysePoint(inv(4), {x: 8, y: 0});
        const c = analysePoint(inv(4), {x: 5, y: 3});
        if (a.kind !== 'image' || b.kind !== 'image' || c.kind !== 'image') throw new Error('image expected');
        expect(a.exact.equals(q(8, 0))).toBe(true);
        expect(b.exact.equals(q(2, 0))).toBe(true);
        expect(c.exact.equals(q(40, 24, 17))).toBe(true);
    });

    it('lists the examples with the default numbers', () => {
        expect(INVERSION_EXAMPLES.map(e => e.id)).toEqual(
            ['point', 'through-centre', 'not-through-centre', 'power', 'orthogonal', 'angle', 'line-through-centre']);
        const angle = inversionExample('angle').angle!;
        const r = analyseAngle(inversionExample('angle').inversion, angle.first, angle.second, angle.which);
        if (r.kind !== 'angle') throw new Error('angle expected');
        expect(r.point.x).toBeCloseTo(2.134, 3);
        expect(r.point.y).toBeCloseTo(0.5, 12);
        const line = analyseSource(inv(2), inversionExample('line-through-centre').source!);
        expect(line.kind === 'image' && line.shape).toBe('line');
        expect(line.kind === 'image' && line.throughCentre).toBe(true);
    });
});

describe('angle preservation and orientation reversal', () => {
    it('the example angle is 60 degrees before and after, with the sign negated, at both intersection points', () => {
        for (const which of [0, 1] as const) {
            const r = analyseAngle(inv(2), {centre: {x: 3, y: 0}, radius: 1}, {centre: {x: 3, y: 1}, radius: 1}, which);
            if (r.kind !== 'angle') throw new Error('angle expected');
            expect(r.before.unsigned).toBeCloseTo(60, 9);
            expect(r.after.unsigned).toBeCloseTo(60, 9);
            expect(Math.abs(r.before.signed)).toBeCloseTo(60, 9);
            expect(r.after.signed).toBeCloseTo(-r.before.signed, 9);
            expect(Math.sign(r.after.signed)).toBe(-Math.sign(r.before.signed));
        }
    });

    it('holds for 200 seeded pairs of intersecting circles not through the centre', () => {
        const rng = mulberry32(2024);
        let checked = 0;
        while (checked < 200) {
            const centre = randPoint(rng);
            const i = inv(randInt(rng, 1, INVERSION_RADIUS_MAX), centre);
            const a = randCircle(rng);
            const b = randCircle(rng);
            const circleA: Circle = {centre: RationalPoint.fromGrid(a.centre), r2: Rational.of(a.radius ** 2)};
            const circleB: Circle = {centre: RationalPoint.fromGrid(b.centre), r2: Rational.of(b.radius ** 2)};
            const c = RationalPoint.fromGrid(centre);
            if (powerOfPoint(c, circleA).isZero() || powerOfPoint(c, circleB).isZero()) continue;
            if (intersectCircles(circleA, circleB).kind !== 'two') continue;
            for (const which of [0, 1] as const) {
                const r = analyseAngle(i, a, b, which);
                if (r.kind !== 'angle') throw new Error('angle expected');
                expect(Math.abs(r.after.unsigned - r.before.unsigned)).toBeLessThan(1e-9);
                const sum = r.after.signed + r.before.signed;
                if (Math.abs(r.before.signed) > 89.999) expect(Math.abs(((sum % 180) + 270) % 180 - 90)).toBeLessThan(1e-6);
                else expect(Math.abs(sum)).toBeLessThan(1e-9);
            }
            checked += 1;
        }
    });
});

describe('drawn images agree with exact images', () => {
    it('for every grid point in [-6, 6]^2 and radii 1, 2, 3', () => {
        for (const radius of [1, 2, 3]) {
            for (let x = -6; x <= 6; x += 1) {
                for (let y = -6; y <= 6; y += 1) {
                    const r = analysePoint(inv(radius), {x, y});
                    if (x === 0 && y === 0) {
                        expect(r.kind).toBe('centre');
                        continue;
                    }
                    if (r.kind !== 'image') throw new Error('image expected');
                    const ex = r.exact.x.toNumber();
                    const ey = r.exact.y.toNumber();
                    expect(Math.abs(r.drawn.x - ex)).toBeLessThanOrEqual(1e-12 * Math.max(1, Math.abs(ex)));
                    expect(Math.abs(r.drawn.y - ey)).toBeLessThanOrEqual(1e-12 * Math.max(1, Math.abs(ey)));
                }
            }
        }
    });

    it('the drawn image of 100 seeded circles and lines passes through the inverted source points; line iff through the centre', () => {
        const rng = mulberry32(77);
        for (let n = 0; n < 100; n += 1) {
            const i = inv(randInt(rng, 1, INVERSION_RADIUS_MAX), randPoint(rng));
            let source: InversionSource;
            let points: {x: number; y: number}[];
            let through: boolean;
            if (n % 2 === 0) {
                const c = randCircle(rng);
                source = {kind: 'circle', ...c};
                const phase = rng() * 6;
                points = [0, 2, 4].map(k => ({x: c.centre.x + c.radius * Math.cos(phase + k), y: c.centre.y + c.radius * Math.sin(phase + k)}));
                through = powerOfPoint(RationalPoint.fromGrid(i.centre), {centre: RationalPoint.fromGrid(c.centre), r2: Rational.of(c.radius ** 2)}).isZero();
            } else {
                let p = randPoint(rng);
                let r = randPoint(rng);
                while (p.x === r.x && p.y === r.y) r = randPoint(rng);
                if (n % 4 === 1) { // force a line through the centre every other line
                    p = i.centre;
                    while (r.x === p.x && r.y === p.y) r = randPoint(rng);
                }
                source = {kind: 'line', p, q: r};
                const dx = r.x - p.x;
                const dy = r.y - p.y;
                points = [-1.3, 0.4, 2.1].map(t => ({x: p.x + t * dx, y: p.y + t * dy}));
                const line = lineThrough(RationalPoint.fromGrid(p), RationalPoint.fromGrid(r));
                if (line.kind !== 'line') throw new Error('line expected');
                through = lineValue(line, RationalPoint.fromGrid(i.centre)).isZero();
            }
            const image = analyseSource(i, source);
            if (image.kind !== 'image') throw new Error('image expected');
            expect(image.shape === 'line').toBe(through);
            expect(image.throughCentre).toBe(through);
            for (const point of points) {
                if (Math.hypot(point.x - i.centre.x, point.y - i.centre.y) < 0.2) continue;
                const inverted = circleInversion({re: point.x, im: point.y}, {re: i.centre.x, im: i.centre.y}, i.radius);
                if (inverted.kind !== 'point') throw new Error('point expected');
                const p = inverted.point;
                const scale = 1 + Math.hypot(p.re, p.im);
                if (image.drawn.kind === 'circle') {
                    const distance = Math.hypot(p.re - image.drawn.centre.re, p.im - image.drawn.centre.im);
                    expect(Math.abs(distance - image.drawn.radius)).toBeLessThan(1e-9 * scale * Math.max(1, image.drawn.radius));
                } else {
                    const d = image.drawn.direction;
                    const cross = (p.re - image.drawn.point.re) * d.im - (p.im - image.drawn.point.im) * d.re;
                    expect(Math.abs(cross)).toBeLessThan(1e-9 * scale);
                }
            }
        }
    });
});

describe('power of a point', () => {
    it('the signed secant product equals the exact power for 200 seeded cases; tangent length squared equals power outside', () => {
        const rng = mulberry32(5);
        const positions = new Set<string>();
        let secants = 0;
        for (let n = 0; n < 200; n += 1) {
            const circle = randCircle(rng);
            let p = randPoint(rng);
            if (n % 5 === 0) { // a point on the circle, if the grid has one, otherwise keep the random point
                const onGrid: GridPoint[] = [{x: circle.centre.x + circle.radius, y: circle.centre.y}, {x: circle.centre.x, y: circle.centre.y - circle.radius}]
                    .filter(isInversionPoint);
                if (onGrid.length > 0) p = onGrid[n % onGrid.length];
            } else if (n % 5 === 1) { // inside
                p = {x: circle.centre.x + randInt(rng, -1, 1), y: circle.centre.y};
                if (!isInversionPoint(p)) p = circle.centre;
            }
            const r = analysePower(p, circle, rng() * 360);
            if (r.kind !== 'power') throw new Error('power expected');
            positions.add(r.position);
            if (r.secant.kind === 'two') {
                secants += 1;
                expect(Math.abs(r.secant.product - r.power.toNumber())).toBeLessThan(1e-9);
                const dot = (r.secant.A.x - p.x) * (r.secant.B.x - p.x) + (r.secant.A.y - p.y) * (r.secant.B.y - p.y);
                expect(Math.abs(dot - r.power.toNumber())).toBeLessThan(1e-9);
                expect(Math.abs(Math.hypot(r.secant.A.x - circle.centre.x, r.secant.A.y - circle.centre.y) - circle.radius)).toBeLessThan(1e-9);
            }
            if (r.position === 'outside') {
                expect(r.tangent).toBeDefined();
                expect(Math.abs(r.tangent!.length ** 2 - r.power.toNumber())).toBeLessThan(1e-9);
                for (const t of r.tangent!.points) {
                    expect(Math.abs(Math.hypot(t.x - circle.centre.x, t.y - circle.centre.y) - circle.radius)).toBeLessThan(1e-9);
                    const toP = {x: p.x - t.x, y: p.y - t.y};
                    const radius = {x: t.x - circle.centre.x, y: t.y - circle.centre.y};
                    expect(Math.abs(toP.x * radius.x + toP.y * radius.y)).toBeLessThan(1e-9);
                }
            } else if (r.position === 'inside') expect(r.tangent).toBeUndefined();
        }
        expect([...positions].sort()).toEqual(['inside', 'on', 'outside']);
        expect(secants).toBeGreaterThan(50);
    });
});

describe('edge cases are typed and finite', () => {
    it('the point at the centre has no image', () => {
        expect(analysePoint(inv(2, {x: 3, y: 3}), {x: 3, y: 3})).toEqual({kind: 'centre'});
    });

    it('a point at distance 1 with r = 8 has its image beyond the drawing cap', () => {
        const r = analysePoint(inv(8), {x: 1, y: 0});
        if (r.kind !== 'image') throw new Error('image expected');
        expect(r.drawn.x).toBeCloseTo(64, 12);
        expect(r.exact.equals(q(64, 0))).toBe(true);
        expect(r.board).toBeUndefined();
        expect(r.direction).toEqual({x: 1, y: 0});
        assertFinite(r);
        expect(analysePoint(inv(8), {x: 3, y: 0}).kind === 'image' && (analysePoint(inv(8), {x: 3, y: 0}) as {board?: unknown}).board).toBeDefined();
    });

    it('a circle passing within 1 of the centre but not through it gives a huge image, not drawn', () => {
        const r = analyseSource(inv(8), {kind: 'circle', centre: {x: 6, y: 0}, radius: 5});
        if (r.kind !== 'image') throw new Error('image expected');
        expect(r.shape).toBe('circle');
        expect(r.throughCentre).toBe(false);
        expect(r.board).toBeUndefined();
        expect(r.drawn.kind).toBe('circle');
        assertFinite(r);
        const near = analyseSource(inv(1), {kind: 'circle', centre: {x: 6, y: 0}, radius: 5});
        expect(near.kind === 'image' && near.board).toBeDefined();
    });

    it('P on the circle: power 0, tangent of length 0, a secant through P', () => {
        const r = analysePower({x: 2, y: 0}, {centre: {x: 5, y: 0}, radius: 3}, 90);
        if (r.kind !== 'power') throw new Error('power expected');
        expect(r.power.isZero()).toBe(true);
        expect(r.position).toBe('on');
        expect(r.tangent?.length).toBe(0);
        expect(r.secant.kind).toBe('tangent');
        const slanted = analysePower({x: 2, y: 0}, {centre: {x: 5, y: 0}, radius: 3}, 45);
        expect(slanted.kind === 'power' && slanted.secant.kind).toBe('two');
        assertFinite(r);
        assertFinite(slanted);
    });

    it('a secant that misses and a tangent secant', () => {
        const miss = analysePower(O, {centre: {x: 5, y: 0}, radius: 3}, 90);
        expect(miss.kind === 'power' && miss.secant.kind).toBe('miss');
        const tangentAngle = (Math.asin(3 / 5) * 180) / Math.PI;
        const near = analysePower(O, {centre: {x: 5, y: 0}, radius: 3}, tangentAngle + 20);
        expect(near.kind === 'power' && near.secant.kind).toBe('miss');
        const tangent = analysePower({x: 5, y: 3}, {centre: {x: 5, y: 0}, radius: 3}, 0);
        expect(tangent.kind === 'power' && tangent.secant.kind).toBe('tangent');
        assertFinite(miss);
        assertFinite(tangent);
        const normalised = analysePower(O, {centre: {x: 5, y: 0}, radius: 3}, -360);
        expect(normalised.kind === 'power' && normalised.thetaDeg).toBe(0);
    });

    it('concentric, tangent and centre-passing circle pairs give typed results', () => {
        const a: CircleSpec = {centre: {x: 3, y: 0}, radius: 1};
        expect(analyseAngle(inv(2), a, {centre: {x: 3, y: 0}, radius: 2}, 0).kind).toBe('no-intersection');
        expect(analyseAngle(inv(2), a, {centre: {x: 3, y: 0}, radius: 1}, 0).kind).toBe('coincident');
        expect(analyseAngle(inv(2), a, {centre: {x: 5, y: 0}, radius: 1}, 0).kind).toBe('tangent');
        expect(analyseAngle(inv(2), a, {centre: {x: 9, y: 0}, radius: 1}, 0).kind).toBe('no-intersection');
        // both circles pass through the centre (0,0); one intersection point is the centre, the other is not
        const b: CircleSpec = {centre: {x: 1, y: 0}, radius: 1};
        const c: CircleSpec = {centre: {x: 0, y: 1}, radius: 1};
        const kinds = ([0, 1] as const).map(which => analyseAngle(inv(2), b, c, which));
        expect(kinds.map(k => k.kind).sort()).toEqual(['angle', 'point-at-centre']);
        for (const k of kinds) assertFinite(k);
        const both = kinds.find(k => k.kind === 'angle');
        if (both?.kind === 'angle') {
            expect(both.before.unsigned).toBeCloseTo(90, 9);
            expect(both.after.unsigned).toBeCloseTo(90, 9);
            // ±90° is one undirected angle: the negation holds modulo 180, not as a sign flip
            expect(Math.abs(both.before.signed)).toBeCloseTo(90, 9);
            expect(Math.abs(both.after.signed)).toBeCloseTo(90, 9);
        }
    });

    it('rejects radius 0 and 9, and non-integer or out-of-range input, without throwing', () => {
        expect(isInversionRadius(0)).toBe(false);
        expect(isInversionRadius(9)).toBe(false);
        expect(isInversionRadius(1.5)).toBe(false);
        expect(isInversionRadius(8)).toBe(true);
        expect(analysePoint(inv(0), {x: 1, y: 1})).toEqual({kind: 'invalid'});
        expect(analysePoint(inv(9), {x: 1, y: 1})).toEqual({kind: 'invalid'});
        expect(analysePoint(inv(2), {x: 0.5, y: 1})).toEqual({kind: 'invalid'});
        expect(analysePoint(inv(2), {x: 11, y: 1})).toEqual({kind: 'invalid'});
        expect(analysePoint(inv(2), {x: NaN, y: 1})).toEqual({kind: 'invalid'});
        expect(analyseSource(inv(2), {kind: 'circle', centre: {x: 1, y: 0}, radius: 0})).toEqual({kind: 'invalid'});
        expect(analyseSource(inv(2), {kind: 'line', p: {x: 1, y: 1}, q: {x: 1, y: 1}})).toEqual({kind: 'invalid'});
        expect(analyseSource(inv(2.5), {kind: 'circle', centre: {x: 1, y: 0}, radius: 1})).toEqual({kind: 'invalid'});
        expect(analysePower({x: 0, y: 0}, {centre: {x: 5, y: 0}, radius: 9}, 0)).toEqual({kind: 'invalid'});
        expect(analysePower({x: 0, y: 0}, {centre: {x: 5, y: 0}, radius: 3}, Infinity)).toEqual({kind: 'invalid'});
        expect(analyseAngle(inv(0), {centre: {x: 3, y: 0}, radius: 1}, {centre: {x: 3, y: 1}, radius: 1}, 0)).toEqual({kind: 'invalid'});
    });

    it('every number of every result of every example is finite', () => {
        for (const e of INVERSION_EXAMPLES) {
            if (e.point) assertFinite(analysePoint(e.inversion, e.point));
            if (e.source) assertFinite(analyseSource(e.inversion, e.source));
            if (e.power) assertFinite(analysePower(e.power.point, e.power.circle, e.power.thetaDeg));
            if (e.angle) assertFinite(analyseAngle(e.inversion, e.angle.first, e.angle.second, e.angle.which));
        }
    });

    it('the grid sweep of points, sources and angles never yields a non-finite number', () => {
        const rng = mulberry32(9);
        for (let n = 0; n < 300; n += 1) {
            const i = inv(randInt(rng, 1, 8), randPoint(rng));
            assertFinite(analysePoint(i, randPoint(rng)));
            assertFinite(analyseSource(i, {kind: 'circle', ...randCircle(rng)}));
            assertFinite(analyseSource(i, {kind: 'line', p: randPoint(rng), q: randPoint(rng)}));
            assertFinite(analysePower(randPoint(rng), randCircle(rng), rng() * 720 - 360));
            for (const which of [0, 1] as const) assertFinite(analyseAngle(i, randCircle(rng), randCircle(rng), which));
        }
    });
});
