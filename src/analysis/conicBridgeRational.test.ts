import {describe, expect, it} from 'vitest';
import {PointImpl} from '../bezeg/impl/point/point-impl';
import {RationalBezierCurve} from '../bezeg/impl/curve/rational-bezier-curve';
import {conicFocalView, ConicFocalModel, CONIC_EXAMPLE_MODELS} from './conicFocalModel';
import {directrixDistance, focalDistance, rationalQuadraticPoint} from './conic';

/**
 * F6: the S6 bridge arc is the same curve the "Rational curves" chapter evaluates (RationalBezierCurve, De Casteljau in
 * projected form). Convention mapping: none needed. S6 uses end weights 1 and a free middle weight w1 with the standard
 * Bernstein parameter t in [0, 1]; the chapter's standard-form display normalisation divides w_i by
 * (w_n^i w_0^(n-1-i))^(1/(n-1)), which is the identity when w_0 = w_n = 1. Evaluation uses the raw weights anyway.
 * Tolerances: S6-vs-chapter points 1e-12 (absolute, coordinates are O(10)); |PF| = eps|Pd| relative 1e-9.
 */
const T = Array.from({length: 11}, (_, i) => i / 10);
const model = (epsilon: number, ell: number): ConicFocalModel =>
    ({...CONIC_EXAMPLE_MODELS.bridge, epsilon, ell, weight: null});

function check(m: ConicFocalModel) {
    const view = conicFocalView(m);
    const bridge = view.bridge!;
    const weights = [...bridge.weights] as [number, number, number];
    const curve = new RationalBezierCurve(bridge.points.map(p => new PointImpl(p.x, p.y)), weights);
    const out = T.map(t => {
        const c = curve.eval(t);
        const s = rationalQuadraticPoint(bridge.points, weights, t);
        expect(Math.abs(c.X() - s.x)).toBeLessThan(1e-12);
        expect(Math.abs(c.Y() - s.y)).toBeLessThan(1e-12);
        const p = {x: c.X(), y: c.Y()};
        const pf = focalDistance(view.conic, p);
        const eps = m.epsilon * (directrixDistance(view.conic, p) as number);
        expect(Math.abs(pf - eps) / pf).toBeLessThan(1e-9);
        return p;
    });
    // The drawn samples (index i of CONIC_SAMPLES) coincide with the chapter curve at the same parameter.
    const mid = bridge.samples[Math.round((bridge.samples.length - 1) / 2)];
    const c = curve.eval(0.5);
    expect(Math.abs(c.X() - mid.x)).toBeLessThan(1e-12);
    expect(Math.abs(c.Y() - mid.y)).toBeLessThan(1e-12);
    return {out, weights};
}

describe('S6 bridge equals the Rational curves chapter evaluator', () => {
    it('quarter ellipse (5,0),(5,3),(0,3), w1 = sqrt(2)/2, t = 1/2 is (5/sqrt2, 3/sqrt2)', () => {
        const {out, weights} = check(CONIC_EXAMPLE_MODELS.bridge);
        expect(weights[1]).toBeCloseTo(Math.SQRT1_2, 15);
        expect(out[5].x).toBeCloseTo(5 / Math.SQRT2, 12);
        expect(out[5].y).toBeCloseTo(3 / Math.SQRT2, 12);
    });

    it('parabola and hyperbola vertex-to-latus-rectum arcs', () => {
        check(model(1, 2));
        check({...CONIC_EXAMPLE_MODELS.hyperbola, bridge: true});
    });

    for (const ell of [0.5, 2, 6]) {
        for (const eps of [0.3, 0.8, 1, 1.6, 2.4]) {
            it(`eps = ${eps}, l = ${ell}`, () => {
                check(model(eps, ell));
            });
        }
    }
});
