import { describe, expect, it } from 'vitest';
import {
    bezierDescent,
    classifyBezier,
    descentTime,
    descentTimeFrom,
    G,
    midpointDescentTime,
} from './descentTime';
import { arcTrack, bezierTrack, cycloidTrack, lineTrack, type Vec2 } from './tracks';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

/** Closed form for a straight incline of length L and depth drop d: T = sqrt(2L / (g sin α)), sin α = d / L. */
function lineClosedForm(x: number, d: number, g = G) {
    const L = Math.hypot(x, d);
    return Math.sqrt((2 * L) / (g * (d / L)));
}

/**
 * Independent oracle for a cubic Bézier: power-form coefficients, t = s^4, composite Simpson on 20000 panels.
 * Shares no code with the kernel.
 */
function simpsonS4(P: Vec2[], g = G): number {
    const coef = (k: 0 | 1) => {
        const [a, b, c, d] = P.map(p => p[k]);
        return [a, 3 * (b - a), 3 * (a - 2 * b + c), d - a + 3 * (b - c)];
    };
    const cx = coef(0);
    const cy = coef(1);
    const f = (s: number) => {
        if (s === 0) return 0;
        const t = s ** 4;
        const dx = cx[1] + 2 * cx[2] * t + 3 * cx[3] * t * t;
        const dy = cy[1] + 2 * cy[2] * t + 3 * cy[3] * t * t;
        const y = cy[1] * t + cy[2] * t * t + cy[3] * t ** 3;
        return (4 * s ** 3 * Math.hypot(dx, dy)) / Math.sqrt(2 * g * y);
    };
    const n = 20000;
    const h = 1 / n;
    let sum = f(0) + f(1);
    for (let i = 1; i < n; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
    return (sum * h) / 3;
}

const DEFAULT_CUBIC: Vec2[] = [[0, 0], [0.5, 2], [2, 2.5], [3.25, 2]];

/** Independent oracle for the circular arc: phi = u^2, Simpson with 2000 panels. */
function arcOracle(c: number, phiEnd: number, g = G): number {
    const f = (u: number) =>
        u === 0 ? Math.sqrt((2 * c) / g) : (2 * u * c) / Math.sqrt(2 * g * c * Math.sin(u * u));
    const n = 2000;
    const uEnd = Math.sqrt(phiEnd);
    const h = uEnd / n;
    let sum = f(0) + f(uEnd);
    for (let i = 1; i < n; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
    return (sum * h) / 3;
}

describe('descentTime: closed forms', () => {
    it('straight line matches T = sqrt(2L/(g sin a)) for several slopes', () => {
        for (const [x, d] of [[3, 2], [0.25, 3], [4, 0.25], [1, 1]]) {
            expect(rel(descentTime(lineTrack([0, 0], [x, d])), lineClosedForm(x, d))).toBeLessThan(1e-12);
        }
    });

    it('cycloid matches theta_B sqrt(r/g), including the cusp start', () => {
        for (const [r, th] of [[1, Math.PI], [0.25, Math.PI], [3, 2.5], [1.7, 5]]) {
            expect(rel(descentTime(cycloidTrack(r, 0, th)), th * Math.sqrt(r / G))).toBeLessThan(1e-12);
        }
    });

    it('MC1 numbers: line 1.18904, cycloid 1.00303, arc 1.02848, in this order', () => {
        const line = descentTime(lineTrack([0, 0], [Math.PI, 2]));
        expect(line).toBeCloseTo(1.18904, 5);
        expect(rel(line, Math.sqrt(Math.PI ** 2 + 4) / Math.sqrt(G))).toBeLessThan(1e-12);
        const cyc = descentTime(cycloidTrack(1, 0, Math.PI));
        expect(cyc).toBeCloseTo(1.00303, 5);
        const c = (Math.PI ** 2 + 4) / (2 * Math.PI);
        const phi = Math.acos(1 - Math.PI / c);
        expect((phi * 180) / Math.PI).toBeCloseTo(115.04, 2);
        const arc = descentTime(arcTrack([c, 0], c, Math.PI, Math.PI - phi));
        expect(arc).toBeCloseTo(1.02848, 5);
        expect(rel(arc, arcOracle(c, phi))).toBeLessThan(1e-9);
        expect(cyc).toBeLessThan(arc);
        expect(arc).toBeLessThan(line);
        expect(((line - cyc) / line) * 100).toBeCloseTo(15.6, 1); // line is slower than the cycloid
        expect(((line - cyc) / cyc) * 100).toBeCloseTo(18.54, 2);
    });

    it('times scale as sqrt(r) for r = 0.25 and 3 (cycloid and line)', () => {
        const at = (r: number) => ({
            cyc: descentTime(cycloidTrack(r, 0, Math.PI)),
            line: descentTime(lineTrack([0, 0], [Math.PI * r, 2 * r])),
        });
        const base = at(1);
        for (const r of [0.25, 3]) {
            const t = at(r);
            expect(rel(t.cyc, base.cyc * Math.sqrt(r))).toBeLessThan(1e-12);
            expect(rel(t.line, base.line * Math.sqrt(r))).toBeLessThan(1e-12);
        }
    });
});

describe('descentTime: Bézier against independent oracles', () => {
    it('the s^2 substitution agrees with the s^4 substitution (2000 panels) to 1e-12 and with an independent Simpson', () => {
        const tracks: Vec2[][] = [
            DEFAULT_CUBIC,
            [[0, 0], [1, 0.25], [3, 3], [4, 1]],
            [[0, 0], [0, 1], [2, 0.5], [2.5, 2.25]],
            [[0, 0], [3, 3], [0.25, 0.5], [1, 1]],
        ];
        for (const P of tracks) {
            const a = descentTime(bezierTrack(P));
            const b = descentTime(bezierTrack(P), G, { power: 4, panels: 2000 });
            expect(Math.abs(a - b)).toBeLessThan(1e-12);
            expect(Math.abs(a - simpsonS4(P))).toBeLessThan(1e-11);
        }
    });

    it('MC2 default numbers: T = 1.036620 s', () => {
        const t = descentTime(bezierTrack(DEFAULT_CUBIC));
        expect(t).toBeCloseTo(1.0366196194, 9);
        expect(Math.abs(t - descentTime(bezierTrack(DEFAULT_CUBIC), G, { power: 4 }))).toBeLessThan(5e-14);
    });

    it('negative control: the midpoint rule with 1000 nodes fails the 1e-12 tolerance', () => {
        const track = bezierTrack(DEFAULT_CUBIC);
        const exact = descentTime(track);
        const mid = midpointDescentTime(track, G, 1000);
        expect(mid).toBeCloseTo(1.02572, 4);
        expect(Math.abs(mid - exact)).toBeGreaterThan(1e-2);
        const lineMid = midpointDescentTime(lineTrack([0, 0], [Math.PI, 2]), G, 1000);
        expect(lineMid).toBeCloseTo(1.17767, 4);
        expect(Math.abs(lineMid - lineClosedForm(Math.PI, 2))).toBeGreaterThan(1e-2);
    });

    it('the s^3 substitution leaves an s^(1/2) error that shrinks only like panels^(-3/2)', () => {
        const track = bezierTrack(DEFAULT_CUBIC);
        const ref = descentTime(track, G, { power: 4 });
        const err = (power: number, panels: number) => Math.abs(descentTime(track, G, { power, panels }) - ref);
        const e3 = err(3, 200);
        expect(e3).toBeGreaterThan(1e-8);
        expect(err(2, 200)).toBeLessThan(1e-13);
        const order = Math.log2(err(3, 100) / err(3, 200));
        expect(order).toBeGreaterThan(1.3);
        expect(order).toBeLessThan(1.7); // 1.5, not the >= 9 of a smooth integrand
    });

    it('cusp start (P1 = P0) is timed and agrees between substitutions', () => {
        const P: Vec2[] = [[0, 0], [0, 0], [1, 1], [2, 2]];
        expect(classifyBezier(P)).toBe('ok');
        const a = descentTime(bezierTrack(P));
        expect(Number.isFinite(a)).toBe(true);
        expect(Math.abs(a - descentTime(bezierTrack(P), G, { power: 4 }))).toBeLessThan(1e-11);
    });
});

describe('descentTimeFrom: the tautochrone', () => {
    const track = cycloidTrack(1, 0, Math.PI);
    const bottom = Math.PI / Math.sqrt(G);

    it('MC3 starts 0.3, 1, 2 give pi/sqrt(g) to 2e-12', () => {
        for (const th0 of [0.3, 1, 2]) {
            expect(Math.abs(descentTimeFrom(track, th0) - bottom)).toBeLessThan(2e-12);
        }
        expect(bottom).toBeCloseTo(1.0030333404, 9);
    });

    it('equal times over 60 start parameters (grid 0.05) within 1e-9', () => {
        for (let k = 0; k < 60; k++) {
            expect(Math.abs(descentTimeFrom(track, 0.05 * k) - bottom)).toBeLessThan(1e-9);
        }
    });

    it('midpoint rule misses the constancy (negative control)', () => {
        const from = (th0: number) => midpointDescentTime(cycloidTrack(1, th0, Math.PI), G, 1000);
        expect(from(1)).toBeCloseTo(0.99643, 4);
        expect(Math.abs(from(1) - bottom)).toBeGreaterThan(1e-3);
    });

    it('start at the bottom gives 0 without NaN', () => {
        expect(descentTimeFrom(track, Math.PI)).toBe(0);
    });

    it('a circular arc through the same lowest point is not tautochrone', () => {
        // circle of radius 1 centred at the lowest point's height: pendulum arc, angle a from the bottom
        const arcFrom = (a0: number) => {
            const arc = arcTrack([0, 0], 1, Math.PI / 2 + a0, Math.PI / 2);
            return descentTime(arc);
        };
        expect(Math.abs(arcFrom(0.3) - arcFrom(1.5))).toBeGreaterThan(0.05);
    });
});

describe('admissibility', () => {
    it('accepts the default track and a cusp start', () => {
        expect(classifyBezier(DEFAULT_CUBIC)).toBe('ok');
        expect(classifyBezier([[0, 0], [0, 0], [1, 1], [2, 2]])).toBe('ok');
    });

    it('y1 = 0 with P1 != P0 is never-starts and gives no number', () => {
        const P: Vec2[] = [[0, 0], [0.5, 0], [2, 2.5], [3.25, 2]];
        expect(classifyBezier(P)).toBe('never-starts');
        expect(bezierDescent(P)).toEqual({ kind: 'never-starts' });
        expect(classifyBezier([[0, 0], [0, 0], [1, 0], [2, 2]])).toBe('never-starts');
        expect(classifyBezier([[0, 0], [0, 0], [0, 0]])).toBe('never-starts');
    });

    it('a negative control depth is above-start even if the curve might stay below', () => {
        const P: Vec2[] = [[0, 0], [0.5, 2], [2, -0.25], [3.25, 2]];
        expect(classifyBezier(P)).toBe('above-start');
        expect(bezierDescent(P)).toEqual({ kind: 'above-start' });
    });

    it('an end not strictly below the start (y_n = 0) is above-start', () => {
        expect(classifyBezier([[0, 0], [1, 1], [2, 1], [3, 0]])).toBe('above-start');
    });

    it('statuses never carry a number; admissible tracks give a finite time', () => {
        const r = bezierDescent(DEFAULT_CUBIC);
        expect(r.kind).toBe('ok');
        if (r.kind === 'ok') expect(Number.isFinite(r.time)).toBe(true);
    });

    it('requires P0 = (0, 0)', () => {
        expect(() => classifyBezier([[0, 1], [1, 2]])).toThrow(RangeError);
    });

    it('10 000 seeded admissible random cubics never beat the cycloid through the same end points', async () => {
        const { brachistochrone } = await import('./brachistochrone');
        let seed = 20261110;
        const rnd = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 2 ** 32;
        };
        const grid = (max: number) => Math.round(rnd() * max * 4) / 4;
        let admissible = 0;
        let attempts = 0;
        let worst = Infinity;
        while (admissible < 10000 && attempts < 40000) {
            attempts++;
            const B: Vec2 = [Math.max(0.25, grid(4)), Math.max(0.25, grid(3))];
            const P: Vec2[] = [[0, 0], [grid(4), grid(3)], [grid(4), grid(3)], B];
            const res = bezierDescent(P);
            if (res.kind !== 'ok') continue;
            admissible++;
            worst = Math.min(worst, res.time - brachistochrone(B).time);
        }
        expect(admissible).toBe(10000);
        expect(admissible / attempts).toBeGreaterThan(0.25); // the sampler really exercises the rule
        expect(worst).toBeGreaterThanOrEqual(-1e-9);
        expect(worst).toBeLessThan(0.5); // some track comes near the cycloid: the bound is not vacuous
    });
});
