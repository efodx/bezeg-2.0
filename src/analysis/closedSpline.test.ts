import {describe, expect, it} from 'vitest';
import {
    ClosedLoop,
    EPICYCLE_MAX_N,
    LoopPoint,
    coefficientAt,
    coefficientsFromFunction,
    epicycleChain,
    epicycleOrder,
    evaluateLoop,
    loopCoefficients,
    loopParametrization,
    traceSum,
    validateLoop,
} from './closedSpline';
import {integratePiecewise} from './fourier';

const TWO_PI = 2 * Math.PI;
/** Error grid: t_j = 2 pi j / 8192, j = 0..8191 (contains every span end of a 4-span loop). */
const GRID = 8192;

// Independent oracle: own recursive de Casteljau (not the kernel's).
function dc(pts: readonly LoopPoint[], u: number): LoopPoint {
    if (pts.length === 1) {
        return pts[0];
    }
    const next: LoopPoint[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
        next.push({x: (1 - u) * pts[i].x + u * pts[i + 1].x, y: (1 - u) * pts[i].y + u * pts[i + 1].y});
    }
    return dc(next, u);
}

// Independent oracle: composite Simpson per span (2000 intervals), not the kernel's Gauss-Legendre.
function simpsonCoefficient(loop: ClosedLoop, k: number): {re: number; im: number} {
    const m = loop.spans.length;
    const h = TWO_PI / m;
    const n = 2000;
    let re = 0;
    let im = 0;
    for (let s = 0; s < m; s++) {
        for (let i = 0; i <= n; i++) {
            const w = i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2;
            const t = s * h + (h * i) / n;
            const p = dc(loop.spans[s], i / n);
            re += w * (p.x * Math.cos(k * t) + p.y * Math.sin(k * t));
            im += w * (p.y * Math.cos(k * t) - p.x * Math.sin(k * t));
        }
    }
    const f = h / n / 3 / TWO_PI;
    return {re: re * f, im: im * f};
}

const KAPPA = (4 / 3) * (Math.SQRT2 - 1);
const corners: LoopPoint[] = [
    {x: 1, y: 0},
    {x: 0, y: 1},
    {x: -1, y: 0},
    {x: 0, y: -1},
];

function circleLoop(): ClosedLoop {
    const spans = corners.map((a, i) => {
        const b = corners[(i + 1) % 4];
        // Tangent at a is (-a.y, a.x); the handle at b points back along its tangent.
        return [
            a,
            {x: a.x - KAPPA * a.y, y: a.y + KAPPA * a.x},
            {x: b.x + KAPPA * b.y, y: b.y - KAPPA * b.x},
            b,
        ];
    });
    return {spans};
}

function diamondLoop(): ClosedLoop {
    return {spans: corners.map((a, i) => [a, corners[(i + 1) % 4]])};
}

function maxError(loop: ClosedLoop, N: number): number {
    const coef = loopCoefficients(loop, N);
    const ends = loopParametrization(loop).spanEnds;
    let worst = 0;
    for (let j = 0; j < GRID; j++) {
        const t = (TWO_PI * j) / GRID;
        const z = evaluateLoop(loop, ends, t);
        const s = epicycleChain(coef, N, t).sum;
        worst = Math.max(worst, Math.hypot(z.re - s.re, z.im - s.im));
    }
    return worst;
}

describe('validateLoop', () => {
    it('accepts the examples and a degenerate loop', () => {
        expect(validateLoop(circleLoop()).ok).toBe(true);
        expect(validateLoop(diamondLoop()).ok).toBe(true);
        const p = {x: 2, y: 3};
        expect(validateLoop({spans: [[p, p], [p, p]]}).ok).toBe(true);
    });

    it('returns typed reasons', () => {
        const a = {x: 0, y: 0};
        const b = {x: 1, y: 0};
        expect(validateLoop({spans: [[a, a]]})).toEqual({ok: false, reason: 'spans-count'});
        expect(validateLoop({spans: [[a, b, a], [a, a]]})).toEqual({ok: false, reason: 'span-degree'});
        expect(validateLoop({spans: [[a, {x: NaN, y: 0}], [b, a]]})).toEqual({ok: false, reason: 'not-finite'});
        expect(validateLoop({spans: [[a, b], [b, {x: 5, y: 5}]]})).toEqual({ok: false, reason: 'not-closed'});
    });

    it('a degenerate loop has c_0 only and no NaN', () => {
        const p = {x: 2, y: -3};
        const c = loopCoefficients({spans: [[p, p], [p, p, p, p]]}, 5);
        expect(coefficientAt(c, 0).re).toBeCloseTo(2, 12);
        expect(coefficientAt(c, 0).im).toBeCloseTo(-3, 12);
        for (let k = -5; k <= 5; k++) {
            const v = coefficientAt(c, k);
            expect(Number.isFinite(v.re) && Number.isFinite(v.im)).toBe(true);
            if (k !== 0) {
                expect(Math.hypot(v.re, v.im)).toBeLessThan(1e-12);
            }
        }
        expect(loopCoefficients({spans: [[p, p], [p, p]]}, 3, 'chord').fellBack).toBe(true);
    });

    it('rejects N above the cap', () => {
        expect(() => loopCoefficients(diamondLoop(), EPICYCLE_MAX_N + 1)).toThrow();
    });
});

describe('parametrizations', () => {
    const uneven: ClosedLoop = {
        spans: [
            [{x: 0, y: 0}, {x: 4, y: 0}],
            [{x: 4, y: 0}, {x: 4, y: 1}],
            [{x: 4, y: 1}, {x: 0, y: 0}],
        ],
    };

    it('equal spans have length 2 pi / m; chord spans are proportional to chords and end at 2 pi', () => {
        const eq = loopParametrization(uneven).spanEnds;
        expect(eq).toHaveLength(4);
        expect(eq[1]).toBeCloseTo(TWO_PI / 3, 14);
        const ch = loopParametrization(uneven, 'chord');
        expect(ch.fellBack).toBe(false);
        const total = 4 + 1 + Math.hypot(4, 1);
        expect(ch.spanEnds[1]).toBeCloseTo((TWO_PI * 4) / total, 12);
        expect(ch.spanEnds[3]).toBe(TWO_PI);
    });

    it('give different coefficients for an uneven loop', () => {
        const a = coefficientAt(loopCoefficients(uneven, 2, 'equal'), 1);
        const b = coefficientAt(loopCoefficients(uneven, 2, 'chord'), 1);
        expect(Math.hypot(a.re - b.re, a.im - b.im)).toBeGreaterThan(1e-2);
    });
});

describe('four-span cubic circle', () => {
    const loop = circleLoop();
    const c = loopCoefficients(loop, 14);

    it('has the stated coefficients to 6 decimals; only k = 1 mod 4 occur (the spec claim of nothing else above 1e-9 is wrong: c_-11 = -0.000197)', () => {
        const stated: Record<number, number> = {1: 1.000126, 5: 0.003672, [-3]: -0.003641, [-7]: -0.000662, 9: 0.000547};
        for (let k = -14; k <= 14; k++) {
            const v = coefficientAt(c, k);
            if (k in stated) {
                expect(v.re).toBeCloseTo(stated[k], 6);
                expect(Math.abs(v.im)).toBeLessThan(1e-9);
            } else if (((k % 4) + 4) % 4 !== 1) {
                expect(Math.hypot(v.re, v.im)).toBeLessThan(1e-9);
            }
        }
        expect(coefficientAt(c, -11).re).toBeCloseTo(-0.000197, 6);
        expect(coefficientAt(c, 13).re).toBeCloseTo(0.000171, 6);
    });

    it('matches the independent Simpson/de Casteljau computation', () => {
        for (const k of [-7, -3, 0, 1, 5, 9]) {
            const o = simpsonCoefficient(loop, k);
            const v = coefficientAt(c, k);
            expect(v.re).toBeCloseTo(o.re, 8);
            expect(v.im).toBeCloseTo(o.im, 8);
        }
    });

    it('has the stated maximum parametrized errors on the 8192-point grid', () => {
        const stated: Array<[number, number]> = [[0, 1.000273], [1, 0.007346], [3, 0.004759], [5, 0.001545], [9, 0.000596]];
        for (const [N, e] of stated) {
            expect(maxError(loop, N)).toBeCloseTo(e, 6);
        }
    });

    it('deviates from the unit circle by at most 0.000273', () => {
        const ends = loopParametrization(loop).spanEnds;
        let worst = 0;
        for (let j = 0; j < GRID; j++) {
            const z = evaluateLoop(loop, ends, (TWO_PI * j) / GRID);
            worst = Math.max(worst, Math.abs(Math.hypot(z.re, z.im) - 1));
        }
        expect(worst).toBeCloseTo(0.000273, 6);
    });
});

describe('diamond', () => {
    const loop = diamondLoop();
    const c = loopCoefficients(loop, 50);

    it('has c_k = 8 / (pi^2 k^2) for k = 1 mod 4 and zero otherwise, to 1e-10', () => {
        for (let k = -50; k <= 50; k++) {
            const v = coefficientAt(c, k);
            const expected = ((k % 4) + 4) % 4 === 1 ? 8 / (Math.PI ** 2 * k * k) : 0;
            expect(Math.abs(v.re - expected)).toBeLessThan(1e-10);
            expect(Math.abs(v.im)).toBeLessThan(1e-10);
        }
        expect(coefficientAt(c, 1).re).toBeCloseTo(0.810569, 6);
    });

    it('has the stated maximum errors on the 8192-point grid', () => {
        const stated: Array<[number, number]> = [[1, 0.18943], [3, 0.09937], [5, 0.06694], [9, 0.0404]];
        for (const [N, e] of stated) {
            expect(maxError(loop, N)).toBeCloseTo(e, 4);
        }
    });

    it('pitfall: one 16-node rule over the whole period gives c_1 = 0.806564', () => {
        const ends = loopParametrization(loop).spanEnds;
        const naive = integratePiecewise((t) => {
            const z = evaluateLoop(loop, ends, t);
            return z.re * Math.cos(t) + z.im * Math.sin(t);
        }, [0, TWO_PI]) / TWO_PI;
        expect(naive).toBeCloseTo(0.806564, 6);
        // The kernel must split at span ends: it matches the closed form, the naive rule does not.
        expect(Math.abs(coefficientAt(c, 1).re - 8 / Math.PI ** 2)).toBeLessThan(1e-10);
        expect(Math.abs(naive - 8 / Math.PI ** 2)).toBeGreaterThan(1e-3);
    });
});

describe('start shift', () => {
    const lopsided: ClosedLoop = {
        spans: [
            [{x: 1, y: 0.5}, {x: 2, y: 1}, {x: 0.3, y: 2.5}, {x: -1, y: 1.5}],
            [{x: -1, y: 1.5}, {x: -2, y: -1}],
            [{x: -2, y: -1}, {x: 0, y: -2}, {x: 2.5, y: -0.4}, {x: 1, y: 0.5}],
        ],
    };

    it.each([
        ['circle', circleLoop()],
        ['lopsided loop with complex coefficients', lopsided],
    ])('multiplies c_k by exp(ik tau) for a shift that is not a multiple of a span (%s)', (_name, loop) => {
        const ends = loopParametrization(loop).spanEnds;
        const N = 10;
        const base = loopCoefficients(loop, N);
        const tau = 0.4321;
        // z2(t) = z(t + tau); its corners are the span ends moved by -tau (mod 2 pi), kept as boundaries.
        const moved = ends
            .slice(0, -1)
            .map((e) => (((e - tau) % TWO_PI) + TWO_PI) % TWO_PI)
            .filter((e) => e > 0)
            .sort((a, b) => a - b);
        const shiftedEnds = [0, ...moved, TWO_PI];
        const shifted = coefficientsFromFunction((t) => evaluateLoop(loop, ends, t + tau), shiftedEnds, N);
        for (let k = -N; k <= N; k++) {
            const b = coefficientAt(base, k);
            const expRe = b.re * Math.cos(k * tau) - b.im * Math.sin(k * tau);
            const expIm = b.re * Math.sin(k * tau) + b.im * Math.cos(k * tau);
            const s = coefficientAt(shifted, k);
            expect(Math.abs(s.re - expRe)).toBeLessThan(1e-10);
            expect(Math.abs(s.im - expIm)).toBeLessThan(1e-10);
        }
    });
});

describe('epicycle chain', () => {
    it('orders by decreasing modulus', () => {
        const order = epicycleOrder(loopCoefficients(diamondLoop(), 9), 9);
        expect(order.slice(0, 5)).toEqual([1, -3, 5, -7, 9]);
        expect(order).toHaveLength(18);
    });

    it('breaks ties between k and -k by k ascending', () => {
        const coefficients = {
            N: 2,
            c: [{re: 0, im: 1}, {re: 3, im: 0}, {re: 0, im: 0}, {re: 3, im: 0}, {re: 1, im: 0}],
        };
        expect(epicycleOrder(coefficients, 2)).toEqual([-1, 1, -2, 2]);
        expect(epicycleOrder(coefficients, 1)).toEqual([-1, 1]);
    });

    it('arm end points start at c_0, end at the direct sum S_N(t)', () => {
        const loop = circleLoop();
        const c = loopCoefficients(loop, 9);
        const t = 1.234;
        const chain = epicycleChain(c, 5, t);
        expect(chain.points).toHaveLength(11);
        expect(chain.points[0]).toEqual(coefficientAt(c, 0));
        let re = 0;
        let im = 0;
        for (let k = -5; k <= 5; k++) {
            const v = coefficientAt(c, k);
            re += v.re * Math.cos(k * t) - v.im * Math.sin(k * t);
            im += v.re * Math.sin(k * t) + v.im * Math.cos(k * t);
        }
        expect(chain.sum.re).toBeCloseTo(re, 12);
        expect(chain.sum.im).toBeCloseTo(im, 12);
        // Each arm is c_k e^{ikt} for k = order[i]: consecutive end points differ by exactly that vector.
        expect(chain.order).toHaveLength(10);
        chain.order.forEach((k, i) => {
            const v = coefficientAt(c, k);
            expect(chain.points[i + 1].re - chain.points[i].re).toBeCloseTo(v.re * Math.cos(k * t) - v.im * Math.sin(k * t), 12);
            expect(chain.points[i + 1].im - chain.points[i].im).toBeCloseTo(v.re * Math.sin(k * t) + v.im * Math.cos(k * t), 12);
        });
    });

    it('S_N at t = 0 and at span ends is within the recorded error of the loop', () => {
        const recorded: Array<[ClosedLoop, number, number]> = [
            [circleLoop(), 5, 0.001545],
            [diamondLoop(), 5, 0.06694],
        ];
        for (const [loop, N, bound] of recorded) {
            const c = loopCoefficients(loop, N);
            const ends = loopParametrization(loop).spanEnds;
            for (const t of ends.slice(0, -1)) {
                const z = evaluateLoop(loop, ends, t);
                const s = epicycleChain(c, N, t).sum;
                expect(Math.hypot(z.re - s.re, z.im - s.im)).toBeLessThanOrEqual(bound + 5e-6);
            }
        }
    });

    it('traces S_N at equally spaced parameters', () => {
        const c = loopCoefficients(circleLoop(), 3);
        const trace = traceSum(c, 3, 64);
        expect(trace).toHaveLength(64);
        expect(trace[16].re).toBeCloseTo(epicycleChain(c, 3, TWO_PI / 4).sum.re, 12);
        expect(() => traceSum(c, 3, 0)).toThrow();
    });
});
