import {describe, expect, it} from 'vitest';
import {intersectCircles, lineValue, powerOfPoint, invertExact, type Line} from './circle';
import {
    apolloniusContains,
    apolloniusLocus,
    commonTangents,
    makeCircle,
    radicalAxis,
    radicalCentre,
    tangentsFrom,
    type CommonTangent,
    type InexactLine,
    type RadiusCircle,
} from './circleConstructions';
import {Rational, RationalPoint} from './rational';
import {tangentPoints, type Conic} from '../projective/conic';

const R = (n: number, d = 1) => Rational.of(n, d);
const RP = (x: number, y: number, d = 1) => new RationalPoint(R(x, d), R(y, d));
const disc = (x: number, y: number, r: Rational): RadiusCircle => makeCircle({x, y}, r);
const near = (a: number, b: number, tol = 1e-12) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

function numberLine(line: Line | InexactLine): { a: number; b: number; c: number } {
    if ('kind' in line) return {a: line.a.toNumber(), b: line.b.toNumber(), c: line.c.toNumber()};
    return {a: line.a, b: line.b, c: line.c};
}

/** Distance of a point from a line, independent formula |a x + b y - c| / |(a, b)|. */
function distance(line: Line | InexactLine, x: number, y: number): number {
    const l = numberLine(line);
    return Math.abs(l.a * x + l.b * y - l.c) / Math.hypot(l.a, l.b);
}

/** Independent oracle: the BigInt conic kernel's tangent points of the circle (scaled by 16 to stay integral). */
function oracleContacts(cx: number, cy: number, r2: Rational, px: number, py: number) {
    const n = (r2.num * 16n) / r2.den;
    const x = BigInt(cx);
    const y = BigInt(cy);
    const conic: Conic = [16n, 0n, 16n, -32n * x, -32n * y, 16n * (x * x + y * y) - n];
    const result = tangentPoints(conic, [BigInt(px), BigInt(py), 1n]);
    if (result.status !== 'outside') return {status: result.status, points: [] as { x: number; y: number }[]};
    const t = result.tangency;
    if (t.status === 'two') {
        return {status: 'outside', points: t.points.map(([hx, hy, hw]) => ({x: Number(hx) / Number(hw), y: Number(hy) / Number(hw)}))};
    }
    if (t.status === 'irrational') {
        return {status: 'outside', points: t.approx.map((p) => (p.kind === 'finite' ? {x: p.x, y: p.y} : {x: NaN, y: NaN}))};
    }
    throw new Error(`unexpected tangency ${t.status}`);
}

const byXY = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x - b.x || a.y - b.y;

describe('CG1 tangentsFrom', () => {
    it('matches the CG1 default numbers', () => {
        const c = disc(0, 0, R(5));
        const t = tangentsFrom({x: 13, y: 0}, c);
        if (t.status !== 'outside') throw new Error('expected outside');
        expect(t.power.format()).toBe('144');
        expect(t.tangentLengthSquared.equals(powerOfPoint(RP(13, 0), c))).toBe(true);
        near(t.tangentLength, 12);
        expect(lineValue(t.chord, new RationalPoint(R(25, 13), R(0)))).toEqual(Rational.ZERO);
        expect(t.chord.b.isZero()).toBe(true);
        const [lo, hi] = [...t.contacts].sort(byXY);
        near(lo.x, 25 / 13);
        near(hi.x, 25 / 13);
        near(Math.abs(lo.y), 60 / 13);
        near(Math.abs(hi.y), 60 / 13);
        expect(lo.inexact).toBe(true);
        // Thales circle on OP: centre (13/2, 0), rho^2 = 169/4, both contacts on it.
        for (const p of t.contacts) near((p.x - 6.5) ** 2 + p.y ** 2, 169 / 4);
    });

    it('classifies on and inside points exactly', () => {
        const c = disc(0, 0, R(5));
        const on = tangentsFrom({x: 5, y: 0}, c);
        if (on.status !== 'on') throw new Error('expected on');
        expect(on.point.equals(RP(5, 0))).toBe(true);
        expect(on.line.a.format()).toBe('5');
        expect(on.line.b.format()).toBe('0');
        expect(on.line.c.format()).toBe('25');
        const inside = tangentsFrom({x: 3, y: 0}, c);
        expect(inside.status).toBe('inside');
        expect(inside.power.format()).toBe('-16');
    });

    it('classifies the smallest nonzero power on the grid (multiples of 1/16) as outside or inside, not on', () => {
        // point (1,0), circle at the origin: power = 1 - r^2
        const out = tangentsFrom({x: 1, y: 0}, disc(0, 0, R(3, 4)));
        expect(out.status).toBe('outside');
        expect(out.power.format()).toBe('7/16');
        const inn = tangentsFrom({x: 1, y: 0}, disc(0, 0, R(5, 4)));
        expect(inn.status).toBe('inside');
        expect(inn.power.format()).toBe('-9/16');
    });

    it('has no tangent from the centre and rejects invalid circles and points', () => {
        expect(tangentsFrom({x: 2, y: 3}, disc(2, 3, R(1, 4))).status).toBe('inside');
        expect(() => tangentsFrom({x: 0, y: 0}, {centre: RP(0, 0), r2: R(0)})).toThrow(RangeError);
        expect(() => tangentsFrom({x: 0.5, y: 0}, disc(0, 0, R(1)))).toThrow(RangeError);
        expect(() => tangentsFrom({x: 0, y: 0}, {centre: RP(1, 0, 2), r2: R(1)})).toThrow(RangeError);
        expect(() => tangentsFrom({x: 0, y: 0}, {centre: RP(0, 0), r2: R(1, 32)})).toThrow(RangeError);
        expect(() => makeCircle({x: 0, y: 0}, R(1, 3))).toThrow(RangeError);
        expect(() => makeCircle({x: 0, y: 0}, R(0))).toThrow(RangeError);
    });

    it('agrees with the independent conic oracle over the whole grid [-16, 16]^2', () => {
        const centres = [[0, 0], [2, -3], [-5, 4]];
        const radii = [R(1, 4), R(5, 4), R(1), R(5, 2), R(5), R(8)];
        let outside = 0;
        for (const [cx, cy] of centres) {
            for (const r of radii) {
                const c = disc(cx, cy, r);
                for (let px = -16; px <= 16; px++) {
                    for (let py = -16; py <= 16; py++) {
                        const t = tangentsFrom({x: px, y: py}, c);
                        const o = oracleContacts(cx, cy, c.r2, px, py);
                        expect(t.status).toBe(o.status);
                        if (t.status !== 'outside') continue;
                        outside++;
                        for (const p of t.contacts) {
                            expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
                            near((p.x - cx) ** 2 + (p.y - cy) ** 2, c.r2.toNumber());
                            near((p.x - cx) * (p.x - px) + (p.y - cy) * (p.y - py), 0);
                        }
                        const close = (u: { x: number; y: number }, v: { x: number; y: number }) =>
                            Math.abs(u.x - v.x) < 1e-8 && Math.abs(u.y - v.y) < 1e-8;
                        for (const p of t.contacts) expect(o.points.some((q) => close(p, q))).toBe(true);
                        for (const q of o.points) expect(t.contacts.some((p) => close(p, q))).toBe(true);
                    }
                }
            }
        }
        expect(outside).toBeGreaterThan(10000);
    });
});

describe('CG2 radical axis and centre', () => {
    const c1 = disc(0, 0, R(5));
    const c2 = disc(6, 0, R(3));

    it('matches the CG2 axes', () => {
        const axis = radicalAxis(c1, c2);
        if (axis.status !== 'line') throw new Error('expected a line');
        expect([axis.line.a, axis.line.b, axis.line.c].map((v) => v.format())).toEqual(['12', '0', '52']);
        const disjoint = radicalAxis(c1, disc(10, 0, R(2)));
        if (disjoint.status !== 'line') throw new Error('expected a line');
        expect([disjoint.line.a, disjoint.line.c].map((v) => v.format())).toEqual(['20', '121']);
        const touching = radicalAxis(c1, disc(8, 0, R(3)));
        if (touching.status !== 'line') throw new Error('expected a line');
        expect([touching.line.a, touching.line.c].map((v) => v.format())).toEqual(['16', '80']);
    });

    it('has equal powers at sampled rational axis points and passes through the common points', () => {
        const axis = radicalAxis(c1, c2);
        if (axis.status !== 'line') throw new Error('expected a line');
        for (let t = -12; t <= 12; t++) {
            const p = new RationalPoint(R(13, 3), R(t, 4));
            expect(lineValue(axis.line, p)).toEqual(Rational.ZERO);
            expect(powerOfPoint(p, c1).equals(powerOfPoint(p, c2))).toBe(true);
        }
        const hit = intersectCircles(c1, c2);
        if (hit.kind !== 'two') throw new Error('expected two points');
        for (const p of hit.points) {
            near(p.x * 12 - 52, 0);
            near(Math.abs(p.y), Math.sqrt(56) / 3);
        }
    });

    it('goes through the exact point of contact of touching circles', () => {
        const touching = disc(8, 0, R(3));
        const hit = intersectCircles(c1, touching);
        if (hit.kind !== 'tangent') throw new Error('expected tangent');
        const axis = radicalAxis(c1, touching);
        if (axis.status !== 'line') throw new Error('expected a line');
        expect(lineValue(axis.line, hit.exact)).toEqual(Rational.ZERO);
    });

    it('gives the radical centre with the common power', () => {
        const c3 = disc(3, 6, R(2));
        const rc = radicalCentre(c1, c2, c3);
        if (rc.status !== 'centre') throw new Error('expected a centre');
        expect(rc.point.equals(new RationalPoint(R(13, 3), R(10, 3)))).toBe(true);
        expect(rc.power.format()).toBe('44/9');
        for (const c of [c1, c2, c3]) expect(powerOfPoint(rc.point, c).equals(rc.power)).toBe(true);
        near(Math.sqrt(rc.power.toNumber()), 2.21108, 1e-5);
    });

    it('reports concentric and coincident pairs without an axis', () => {
        expect(radicalAxis(c1, disc(0, 0, R(3))).status).toBe('concentric');
        expect(radicalAxis(c1, disc(0, 0, R(5))).status).toBe('coincident');
        expect(radicalCentre(c1, disc(0, 0, R(3)), c2).status).toBe('concentric');
    });

    it('separates coaxal from parallel for collinear centres', () => {
        // Three circles through (0, 3) and (0, -3).
        const a = disc(0, 0, R(3));
        const b = disc(4, 0, R(5));
        const c = disc(-4, 0, R(5));
        for (const circle of [a, b, c]) {
            expect(powerOfPoint(RP(0, 3), circle)).toEqual(Rational.ZERO);
            expect(powerOfPoint(RP(0, -3), circle)).toEqual(Rational.ZERO);
        }
        const coaxal = radicalCentre(a, b, c);
        if (coaxal.status !== 'coaxal') throw new Error(`expected coaxal, got ${coaxal.status}`);
        expect(lineValue(coaxal.axis, RP(0, 3))).toEqual(Rational.ZERO);
        expect(lineValue(coaxal.axis, RP(0, -3))).toEqual(Rational.ZERO);
        // The same pair repeated is also one axis; different axes are parallel.
        expect(radicalCentre(c1, c2, disc(10, 0, R(2))).status).toBe('parallel');
        expect(radicalCentre(c1, c2, disc(6, 0, R(3))).status).toBe('coaxal');
    });
});

describe('CG3 apolloniusLocus', () => {
    const A = {x: 0, y: 0};
    const B = {x: 6, y: 0};

    it('matches the CG3 default numbers', () => {
        const m = R(4);
        const locus = apolloniusLocus(A, B, m);
        if (locus.status !== 'circle') throw new Error('expected a circle');
        expect(locus.circle.centre.equals(RP(8, 0))).toBe(true);
        expect(locus.circle.r2.format()).toBe('16');
        expect(locus.k.format()).toBe('2');
        expect(locus.internal.equals(RP(4, 0))).toBe(true);
        expect(locus.external.equals(RP(12, 0))).toBe(true);
        expect(apolloniusContains(A, B, m, RP(8, 4))).toBe(true);
        expect(powerOfPoint(RP(8, 4), locus.circle)).toEqual(Rational.ZERO);
        expect(invertExact(RP(0, 0), locus.circle.centre, locus.circle.r2).equals(RP(6, 0))).toBe(true);
        const quarter = apolloniusLocus(A, B, R(1, 4));
        if (quarter.status !== 'circle') throw new Error('expected a circle');
        expect(quarter.circle.centre.equals(RP(-2, 0))).toBe(true);
        expect(quarter.circle.r2.format()).toBe('16');
        const one = apolloniusLocus(A, B, R(1));
        if (one.status !== 'line') throw new Error('expected a line');
        expect([one.line.a, one.line.b, one.line.c].map((v) => v.format())).toEqual(['12', '0', '36']);
    });

    it('makes the division points the ends of a diameter on the locus', () => {
        for (const m of [R(1, 4), R(9, 4), R(4), R(25, 4), R(16)]) {
            const locus = apolloniusLocus({x: -3, y: 2}, {x: 5, y: -1}, m);
            if (locus.status !== 'circle') throw new Error('expected a circle');
            expect(powerOfPoint(locus.internal, locus.circle)).toEqual(Rational.ZERO);
            expect(powerOfPoint(locus.external, locus.circle)).toEqual(Rational.ZERO);
            const mid = locus.internal.add(locus.external).scale(R(1, 2));
            expect(mid.equals(locus.circle.centre)).toBe(true);
            expect(apolloniusContains({x: -3, y: 2}, {x: 5, y: -1}, m, locus.internal)).toBe(true);
            expect(apolloniusContains({x: -3, y: 2}, {x: 5, y: -1}, m, locus.external)).toBe(true);
        }
    });

    it('agrees with the exact membership test on every window grid point', () => {
        let total = 0;
        const pairs: [typeof A, typeof B][] = [[A, B], [{x: -3, y: 2}, {x: 5, y: -1}]];
        for (const [a, b] of pairs) {
            for (const m of [R(1, 4), R(1), R(9, 4), R(4), R(25, 4), R(9), R(16)]) {
                const locus = apolloniusLocus(a, b, m);
                let members = 0;
                for (let x = -20; x <= 20; x++) {
                    for (let y = -20; y <= 20; y++) {
                        const p = RP(x, y);
                        const member = apolloniusContains(a, b, m, p);
                        const onShape = locus.status === 'line' ? lineValue(locus.line, p).isZero()
                            : locus.status === 'circle' ? powerOfPoint(p, locus.circle).isZero() : null;
                        expect(onShape).toBe(member);
                        if (member) members++;
                        if (locus.status === 'circle') {
                            const pa = p.sub(RP(a.x, a.y));
                            const pb = p.sub(RP(b.x, b.y));
                            const lhs = pa.dot(pa).sub(m.mul(pb.dot(pb)));
                            expect(lhs.equals(R(1).sub(m).mul(powerOfPoint(p, locus.circle)))).toBe(true);
                        }
                    }
                }
                total += members;
            }
        }
        expect(total).toBeGreaterThan(20);
    });

    it('returns statuses for A = B and rejects invalid ratios', () => {
        expect(apolloniusLocus(A, A, R(4)).status).toBe('degenerate');
        for (const m of [R(2), R(1, 2), R(0), R(-1), R(1, 9), R(9, 16)]) {
            expect(() => apolloniusLocus(A, B, m)).toThrow(RangeError);
        }
        expect(() => apolloniusLocus({x: 0.5, y: 0}, B, R(4))).toThrow(RangeError);
    });
});

describe('CG4 commonTangents', () => {
    function ok(c1: RadiusCircle, c2: RadiusCircle) {
        const r = commonTangents(c1, c2);
        if (r.status !== 'ok') throw new Error('expected ok');
        return r;
    }

    function checkDistances(c1: RadiusCircle, c2: RadiusCircle, tangents: readonly CommonTangent[]) {
        for (const t of tangents) {
            near(distance(t.line, c1.centre.x.toNumber(), c1.centre.y.toNumber()), c1.radius.toNumber());
            near(distance(t.line, c2.centre.x.toNumber(), c2.centre.y.toNumber()), c2.radius.toNumber());
            for (const p of t.contacts) expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        }
    }

    it('matches the CG4 default example', () => {
        const c1 = disc(0, 0, R(3));
        const c2 = disc(10, 0, R(1));
        const r = ok(c1, c2);
        expect(r.count).toBe(4);
        expect(r.externalCentre?.equals(RP(15, 0))).toBe(true);
        expect(r.internalCentre.equals(RP(15, 0, 2))).toBe(true);
        checkDistances(c1, c2, r.tangents);
        const angle = (t: CommonTangent) => {
            const l = numberLine(t.line);
            // angle of the line with the centre line (x axis): the line direction is perpendicular to the normal
            return (Math.atan2(Math.abs(l.a), Math.abs(l.b)) * 180) / Math.PI;
        };
        const external = r.tangents.filter((t) => t.kind === 'external');
        const internal = r.tangents.filter((t) => t.kind === 'internal');
        for (const t of external) near(angle(t), (Math.asin(3 / 15) * 180) / Math.PI, 1e-9);
        for (const t of internal) near(angle(t), (Math.asin(3 / 7.5) * 180) / Math.PI, 1e-9);
        const c = external.map((t) => t.contacts[0]).sort(byXY);
        near(c[0].x, 0.6, 1e-9);
        near(Math.abs(c[0].y), 2.93939, 1e-5);
        near(Math.abs(c[1].y), 2.93939, 1e-5);
        const seg = (t: CommonTangent) => Math.hypot(t.contacts[0].x - t.contacts[1].x, t.contacts[0].y - t.contacts[1].y);
        near(seg(external[0]), Math.sqrt(96), 1e-9);
        near(seg(internal[0]), Math.sqrt(84), 1e-9);
    });

    it('counts 3, 2, 1, 0 for radii 5 and 3', () => {
        const big = disc(0, 0, R(5));
        const small = (d: number) => disc(d, 0, R(3));
        expect(ok(big, small(8)).count).toBe(3);
        expect(ok(big, small(7)).count).toBe(2);
        expect(ok(big, small(2)).count).toBe(1);
        expect(ok(big, small(1)).count).toBe(0);
        expect(ok(big, small(0)).count).toBe(0);
        expect(commonTangents(big, disc(0, 0, R(5))).status).toBe('coincident');
    });

    it('gives exact tangents at exact points of contact', () => {
        const big = disc(0, 0, R(5));
        for (const [d, kind] of [[8, 'internal'], [2, 'external']] as const) {
            const small = disc(d, 0, R(3));
            const r = ok(big, small);
            const exact = r.tangents.filter((t) => t.exact);
            expect(exact).toHaveLength(1);
            expect(exact[0].kind).toBe(kind);
            const line = exact[0].line as Line;
            expect(line.kind).toBe('line');
            expect(lineValue(line, RP(5, 0))).toEqual(Rational.ZERO);
            expect(line.b.isZero()).toBe(true);
            checkDistances(big, small, r.tangents);
        }
    });

    it('draws parallel external tangents for equal radii', () => {
        const c1 = disc(0, 0, R(3));
        const c2 = disc(10, 0, R(3));
        const r = ok(c1, c2);
        expect(r.count).toBe(4);
        expect(r.externalCentre).toBeNull();
        expect(r.internalCentre.equals(RP(5, 0))).toBe(true);
        checkDistances(c1, c2, r.tangents);
        for (const t of r.tangents.filter((x) => x.kind === 'external')) {
            const l = numberLine(t.line);
            near(l.a, 0);
            near(Math.abs(l.b), 1);
            near(Math.abs(l.c), 3);
        }
        for (const t of r.tangents.filter((x) => x.kind === 'internal')) {
            near(distance(t.line, 5, 0), 0);
            const l = numberLine(t.line);
            near((Math.atan2(Math.abs(l.a), Math.abs(l.b)) * 180) / Math.PI, (Math.asin(0.6) * 180) / Math.PI, 1e-9);
        }
    });

    it('matches an independent support-function count and lines over centre distances and radii', () => {
        const radii = [R(1, 4), R(1, 2), R(1), R(2), R(7, 2), R(3), R(5), R(6)];
        const seen = new Set<number>();
        for (let dx = 0; dx <= 9; dx++) {
            for (let dy = 0; dy <= dx; dy++) {
                for (const r1 of radii) {
                    for (const r2 of radii) {
                        const c1 = disc(0, 0, r1);
                        const c2 = disc(dx, dy, r2);
                        const result = commonTangents(c1, c2);
                        const d2 = dx * dx + dy * dy;
                        if (d2 === 0 && r1.equals(r2)) {
                            expect(result.status).toBe('coincident');
                            continue;
                        }
                        if (result.status !== 'ok') throw new Error('expected ok');
                        // Normals n with n.e = r1 + s r2 (cos t = (r1 + s r2) / d), one line per solution.
                        const expected: { a: number; b: number; c: number }[] = [];
                        if (d2 > 0) {
                            const phi = Math.atan2(dy, dx);
                            for (const s of [1, -1]) {
                                const num = r1.add(r2.mul(R(s)));
                                const cmp = num.mul(num).compare(R(d2));
                                if (cmp > 0) continue;
                                const angles = cmp === 0 ? [phi + (num.sign() > 0 ? 0 : Math.PI)]
                                    : [phi + Math.acos(num.toNumber() / Math.sqrt(d2)), phi - Math.acos(num.toNumber() / Math.sqrt(d2))];
                                for (const t of angles) expected.push({a: Math.cos(t), b: Math.sin(t), c: r1.toNumber()});
                            }
                        }
                        expect(result.count).toBe(expected.length);
                        seen.add(result.count);
                        checkDistances(c1, c2, result.tangents);
                        const used = new Set<number>();
                        for (const t of result.tangents) {
                            const l = numberLine(t.line);
                            const norm = Math.hypot(l.a, l.b);
                            const n = {a: l.a / norm, b: l.b / norm, c: l.c / norm};
                            // orient so that the first centre lies on the negative side, the oracle's convention
                            const side = n.c - 0; // n.O1 = 0 because O1 is the origin
                            const sign = side >= 0 ? 1 : -1;
                            const index = expected.findIndex((e, i) => !used.has(i) &&
                                Math.abs(e.a - sign * n.a) < 1e-6 && Math.abs(e.b - sign * n.b) < 1e-6 && Math.abs(e.c - sign * n.c) < 1e-6);
                            expect(index).toBeGreaterThanOrEqual(0);
                            used.add(index);
                        }
                        expect(used.size).toBe(expected.length);
                    }
                }
            }
        }
        expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
    });

    it('decides the count exactly one grid step (1/4) either side of tangency, d = 5', () => {
        const count = (r1: Rational, r2: Rational) => {
            const r = commonTangents(disc(0, 0, r1), disc(3, 4, r2));
            if (r.status !== 'ok') throw new Error('expected ok');
            return r;
        };
        // external: r1 + r2 = 19/4 (separated) and 21/4 (crossing)
        expect(count(R(2), R(11, 4)).count).toBe(4);
        expect(count(R(2), R(13, 4)).count).toBe(2);
        // internal: |r1 - r2| = 19/4 (crossing) and 21/4 (nested)
        expect(count(R(5), R(1, 4)).count).toBe(2);
        expect(count(R(11, 2), R(1, 4)).count).toBe(0);
        expect(count(R(1, 4), R(5)).count).toBe(2);
        expect(count(R(1, 4), R(11, 2)).count).toBe(0);
    });
});
