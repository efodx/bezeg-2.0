import {describe, expect, it} from "vitest";
import {curvatureAt, type Vec2} from "../bezeg/impl/curve/curvature";
import {cycloidSource} from "../bezeg/impl/curve/parametric-sources";
import {decompose} from "./decompose";
import {circularSource, G, projectileSource, projectileSummary, reparametrize, sineWarp} from "./motion";

function regular(d1: Vec2, d2: Vec2, scale = 1) {
    const d = decompose(d1, d2, scale);
    if (d.kind !== 'regular') {
        throw new Error('expected regular');
    }
    return d;
}

describe('decompose, cycloid (KN5 closed forms a_T = cos(t/2), a_N = -sin(t/2))', () => {
    const cyc = cycloidSource(1);

    it('matches the closed forms on (0, 2 pi)', () => {
        for (const t of [0.2, 1, Math.PI / 2, 2.5, Math.PI, 4, 5.5, 6.2]) {
            const {d1, d2} = cyc.at(t);
            const d = regular(d1, d2);
            expect(d.aT).toBeCloseTo(Math.cos(t / 2), 12);
            expect(d.aN).toBeCloseTo(-Math.sin(t / 2), 12);
            expect(d.speed).toBeCloseTo(2 * Math.sin(t / 2), 12);
        }
    });

    it('gives the KN5 checked numbers', () => {
        const at = (t: number) => regular(cyc.at(t).d1, cyc.at(t).d2);
        const q = at(Math.PI / 2);
        expect(q.speed).toBeCloseTo(1.41421, 5);
        expect(q.aT).toBeCloseTo(0.70711, 5);
        expect(q.aN).toBeCloseTo(-0.70711, 5);
        expect(q.kappa).toBeCloseTo(-0.35355, 5);
        expect(q.kappa * q.speed ** 2).toBeCloseTo(-0.70711, 5);
        const top = at(Math.PI);
        expect(top.speed).toBeCloseTo(2, 12);
        expect(top.aT).toBeCloseTo(0, 12);
        expect(top.aN).toBeCloseTo(-1, 12);
        expect(top.kappa).toBeCloseTo(-0.25, 12);
        expect(1 / Math.abs(top.kappa)).toBeCloseTo(4, 12);
        const one = at(1);
        expect(one.speed).toBeCloseTo(0.95885, 5);
        expect(one.aT).toBeCloseTo(0.87758, 5);
        expect(one.aN).toBeCloseTo(-0.47943, 5);
    });

    it('has a_T equal to the central finite difference of the speed (step 1e-5, tol 1e-8)', () => {
        const speed = (t: number) => Math.hypot(...cyc.at(t).d1);
        const h = 1e-5;
        for (const t of [0.5, 1, 2, Math.PI, 4.5, 6]) {
            const fd = (speed(t + h) - speed(t - h)) / (2 * h);
            expect(Math.abs(regular(cyc.at(t).d1, cyc.at(t).d2).aT - fd)).toBeLessThan(1e-8);
        }
    });

    it('returns no components at the cusp t = 0 (and 2 pi)', () => {
        const c = cyc.at(0);
        expect(c.d2).toEqual([0, 1]);
        const d = decompose(c.d1, c.d2, cyc.scale);
        expect(d.kind).toBe('singular');
        expect(d).not.toHaveProperty('aT');
        expect(d).not.toHaveProperty('aN');
        expect(d).not.toHaveProperty('kappa');
        const e = cyc.at(2 * Math.PI);
        expect(decompose(e.d1, e.d2, cyc.scale).kind).toBe('singular');
    });
});

describe('decompose identities', () => {
    const sources = [
        cycloidSource(1),
        circularSource(2, Math.PI / 2),
        projectileSource(20, 45),
        reparametrize(circularSource(1, 1), sineWarp(0.5)),
    ];

    it('satisfies a_T^2 + a_N^2 = |r\'\'|^2 and agrees with curvatureAt', () => {
        for (const src of sources) {
            for (const t of [0.3, 0.9, 1.7, 2.6, 3.3]) {
                const {d1, d2} = src.at(t);
                const d = regular(d1, d2, src.scale);
                const acc2 = d2[0] ** 2 + d2[1] ** 2;
                expect(d.aT ** 2 + d.aN ** 2).toBeCloseTo(acc2, 10);
                const c = curvatureAt(d1, d2, src.scale);
                expect(c.kind).toBe('regular');
                if (c.kind === 'regular') {
                    expect(d.kappa).toBe(c.kappa);
                    expect(d.aN).toBeCloseTo(c.kappa * c.speed ** 2, 10);
                }
            }
        }
    });

    it('puts a_N on the left normal: counter-clockwise turn is positive', () => {
        const ccw = circularSource(2, 1).at(0.7);
        expect(regular(ccw.d1, ccw.d2).aN).toBeCloseTo(2, 12);
        const cw = projectileSource(20, 45).at(1);
        expect(regular(cw.d1, cw.d2).aN).toBeLessThan(0);
    });
});

describe('decompose, circular and projectile', () => {
    it('uniform circular motion: a_T = 0, a_N = omega^2 R = v^2 / R, kappa = 1 / R', () => {
        const R = 2;
        const w = Math.PI / 2;
        for (const t of [0, 0.4, 1, 2.9]) {
            const {d1, d2} = circularSource(R, w).at(t);
            const d = regular(d1, d2, R);
            expect(d.speed).toBeCloseTo(w * R, 12);
            expect(d.aT).toBeCloseTo(0, 12);
            expect(d.aN).toBeCloseTo(w * w * R, 12);
            expect(d.aN).toBeCloseTo(d.speed ** 2 / R, 12);
            expect(d.kappa).toBeCloseTo(1 / R, 12);
        }
        const a = (R_: number, w_: number) => {
            const {d1, d2} = circularSource(R_, w_).at(0.3);
            return regular(d1, d2, R_).aN;
        };
        expect(a(2, Math.PI)).toBeCloseTo(19.7392, 4);
        expect(a(4, Math.PI / 2)).toBeCloseTo(9.8696, 4);
        expect(a(4, Math.PI / 4)).toBeCloseTo(2.4674, 4);
    });

    it('KN2 values for theta = t + 0.5 sin t on the unit circle', () => {
        const warped = reparametrize(circularSource(1, 1), sineWarp(0.5));
        const q = regular(warped.at(Math.PI / 2).d1, warped.at(Math.PI / 2).d2);
        expect(q.aT).toBeCloseTo(-0.5, 12);
        expect(q.aN).toBeCloseTo(1, 12);
        const z = regular(warped.at(0).d1, warped.at(0).d2);
        expect(z.aT).toBeCloseTo(0, 12);
        expect(z.aN).toBeCloseTo(2.25, 12);
        for (const t of [0, Math.PI / 2, Math.PI]) {
            expect(regular(warped.at(t).d1, warped.at(t).d2).kappa).toBeCloseTo(1, 12);
        }
    });

    it('projectile apex: kappa magnitude g / vx^2, a_N = -g (clockwise), a_T = 0', () => {
        const apex = projectileSummary(20, 45).apexTime;
        const {d1, d2} = projectileSource(20, 45).at(apex);
        const d = regular(d1, d2);
        expect(Math.abs(d.kappa)).toBeCloseTo(G / (d1[0] ** 2), 12);
        expect(Math.abs(d.kappa)).toBeCloseTo(0.04905, 5);
        expect(1 / Math.abs(d.kappa)).toBeCloseTo(20.3874, 4);
        expect(d.aT).toBeCloseTo(0, 12);
        expect(d.aN).toBeCloseTo(-G, 12);
    });
});
