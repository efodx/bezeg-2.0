import {describe, expect, it} from 'vitest';
import {
    circleConic,
    classifyEccentricity,
    classifyMiddleWeight,
    conicFromFocusDirectrix,
    conicMetrics,
    directrixDistance,
    focalDistance,
    focusDirectrixRatio,
    maxConicDeviation,
    quarterEllipseBezier,
    rationalQuadraticPoint,
    sampleConic,
    sampleRationalQuadratic,
} from './conic';

const ellipse = () => conicFromFocusDirectrix({x: 4, y: 0}, {nx: 1, ny: 0, d: 6.25}, 0.8);
const parabola = () => conicFromFocusDirectrix({x: 1, y: 0}, {nx: 1, ny: 0, d: -1}, 1);
const hyperbola = () => conicFromFocusDirectrix({x: 5, y: 0}, {nx: 1, ny: 0, d: 1.8}, 5 / 3);

describe('classification', () => {
    it('classifies by epsilon with exactly 1 a parabola', () => {
        expect(classifyEccentricity(0)).toBe('circle');
        expect(classifyEccentricity(0.999999)).toBe('ellipse');
        expect(classifyEccentricity(1)).toBe('parabola');
        expect(classifyEccentricity(1.000001)).toBe('hyperbola');
        expect(() => classifyEccentricity(-0.1)).toThrow();
        expect(ellipse().kind).toBe('ellipse');
        expect(parabola().kind).toBe('parabola');
        expect(hyperbola().kind).toBe('hyperbola');
    });
    it('epsilon 0 is a circle from centre and radius, no directrix', () => {
        const c = circleConic({x: 1, y: 2}, 3);
        expect(c.kind).toBe('circle');
        expect(c.directrix).toBeUndefined();
        expect(directrixDistance(c, {x: 4, y: 2})).toBeNull();
        expect(focalDistance(c, {x: 4, y: 2})).toBe(3);
        expect(() => conicFromFocusDirectrix({x: 0, y: 0}, {nx: 1, ny: 0, d: 1}, 0)).toThrow();
    });
});

describe('spec values', () => {
    it('ellipse a=5, b=3', () => {
        const e = ellipse();
        const m = conicMetrics(e);
        expect(m.a).toBeCloseTo(5, 12);
        expect(m.b).toBeCloseTo(3, 12);
        expect(m.c).toBeCloseTo(4, 12);
        expect(m.centre?.x).toBeCloseTo(0, 12);
        expect(m.secondFocus?.x).toBeCloseTo(-4, 12);
        const p = {x: 0, y: 3};
        expect(focalDistance(e, p)).toBeCloseTo(5, 12);
        expect(directrixDistance(e, p)).toBeCloseTo(6.25, 12);
        expect(focusDirectrixRatio(e, p)).toBeCloseTo(0.8, 12);
        expect(focalDistance(e, p) + Math.hypot(p.x + 4, p.y)).toBeCloseTo(10, 12);
    });
    it('parabola y^2 = 4x at (1, 2)', () => {
        const q = parabola();
        expect(conicMetrics(q).a).toBeUndefined();
        expect(focalDistance(q, {x: 1, y: 2})).toBeCloseTo(2, 12);
        expect(directrixDistance(q, {x: 1, y: 2})).toBeCloseTo(2, 12);
    });
    it('hyperbola x^2/9 - y^2/16 = 1 at (6, sqrt 48)', () => {
        const h = hyperbola();
        const m = conicMetrics(h);
        expect(m.a).toBeCloseTo(3, 12);
        expect(m.b).toBeCloseTo(4, 12);
        expect(m.c).toBeCloseTo(5, 12);
        expect(m.secondFocus?.x).toBeCloseTo(-5, 12);
        const p = {x: 6, y: Math.sqrt(48)};
        expect(focalDistance(h, p)).toBeCloseTo(7, 12);
        expect(directrixDistance(h, p)).toBeCloseTo(4.2, 12);
        expect(focusDirectrixRatio(h, p)).toBeCloseTo(1.6667, 4);
        const f2 = Math.hypot(p.x + 5, p.y);
        expect(f2).toBeCloseTo(13, 12);
        expect(f2 - focalDistance(h, p)).toBeCloseTo(6, 12);
    });
});

describe('sampler', () => {
    it('ratio equals epsilon within 1e-9 at sampled points, on every branch', () => {
        const conics = [ellipse(), parabola(), hyperbola(),
            conicFromFocusDirectrix({x: 1, y: 2}, {nx: 3, ny: -4, d: 20}, 0.37),
            conicFromFocusDirectrix({x: 1, y: 2}, {nx: 3, ny: -4, d: 20}, 2.5)];
        for (const c of conics) {
            for (const pts of sampleConic(c, 120)) {
                for (const p of pts) {
                    expect(Math.abs((focusDirectrixRatio(c, p) as number) - c.epsilon)).toBeLessThan(1e-9);
                }
            }
        }
    });
    it('branch counts; hyperbola has both branches; parabola is cut at maxRadius', () => {
        expect(sampleConic(ellipse())).toHaveLength(1);
        expect(sampleConic(parabola())).toHaveLength(1);
        const [right, left] = sampleConic(hyperbola());
        expect(right.every(p => p.x > 0)).toBe(true);
        expect(left.every(p => p.x < 0)).toBe(true);
        for (const p of [...right, ...left]) {
            expect(Math.abs(Math.hypot(p.x - 5, p.y) - Math.hypot(p.x + 5, p.y))).toBeCloseTo(6, 6);
        }
        const hf = hyperbola().focus;
        for (const p of [...right, ...left]) expect(Math.hypot(p.x - hf.x, p.y - hf.y)).toBeLessThanOrEqual(50 + 1e-9);
        const par = sampleConic(parabola(), 50, 20)[0];
        const parMax = Math.max(...par.map(p => Math.hypot(p.x - 1, p.y)));
        expect(parMax).toBeGreaterThan(15);
        expect(parMax).toBeLessThanOrEqual(20 + 1e-9);
    });
    it('drops a hyperbola branch that lies wholly beyond maxRadius instead of returning repeated points', () => {
        // Focus-directrix distance 1, eps 1.01: the second branch is nearest the focus at e s / (e - 1) = 101 > 50.
        const nearParabola = conicFromFocusDirectrix({x: 0, y: 0}, {nx: 1, ny: 0, d: 1}, 1.01);
        const branches = sampleConic(nearParabola, 50, 50);
        expect(branches).toHaveLength(1);
        for (const p of branches[0]) expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(50 + 1e-9);
    });
    it('circle samples lie on the circle', () => {
        const c = circleConic({x: 1, y: -1}, 2);
        expect(maxConicDeviation(c, sampleConic(c)[0])).toBeLessThan(1e-12);
    });
});

describe('Bezier bridge', () => {
    const {points, weights} = quarterEllipseBezier(5, 3);
    it('midpoint (3.5355, 2.1213) lies on the ellipse', () => {
        expect(points).toEqual([{x: 5, y: 0}, {x: 5, y: 3}, {x: 0, y: 3}]);
        const p = rationalQuadraticPoint(points, weights, 0.5);
        expect(p.x).toBeCloseTo(3.5355, 4);
        expect(p.y).toBeCloseTo(2.1213, 4);
        expect(p.x ** 2 / 25 + p.y ** 2 / 9).toBeCloseTo(1, 12);
    });
    it('max deviation from the focus-directrix definition is below 1e-9', () => {
        expect(maxConicDeviation(ellipse(), sampleRationalQuadratic(points, weights, 200))).toBeLessThan(1e-9);
    });
    it('deviation is detected for a wrong weight', () => {
        expect(maxConicDeviation(ellipse(), sampleRationalQuadratic(points, [1, 0.9, 1], 50))).toBeGreaterThan(1e-3);
    });
    it('weight classification matches the conic type', () => {
        expect(classifyMiddleWeight(Math.SQRT1_2)).toBe('ellipse');
        expect(classifyMiddleWeight(1)).toBe('parabola');
        expect(classifyMiddleWeight(1.5)).toBe('hyperbola');
        expect(() => classifyMiddleWeight(0)).toThrow();
    });
    it('weights 1 reduce to the polynomial quadratic Bezier (parabola)', () => {
        const m = rationalQuadraticPoint([{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}], [1, 1, 1], 0.5);
        expect(m.x).toBeCloseTo(0.75, 12);
        expect(m.y).toBeCloseTo(0.25, 12);
    });
});
