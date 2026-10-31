import {describe, expect, it} from 'vitest';
import {
    N_MAX,
    cdf,
    convolve,
    defaultHeights,
    kolmogorovDistance,
    mass,
    moments,
    nFold,
    nodeX,
    normalize,
    piecewiseLinearBase,
    standardize,
    triangleBase,
    uniformBase,
    type DensityResult,
    type GridDensity,
} from './convolution';
import {normalCdf} from './distributions';

// Independent oracles from the closed formulas, written without the kernel.
const binomial = (n: number, k: number): number => {
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return r;
};
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

/** Irwin-Hall density of the sum of n independent U(0,1): (1/(n-1)!) sum_k (-1)^k C(n,k) (x-k)^(n-1) over k <= x. */
function irwinHallPdf(n: number, x: number): number {
    if (x <= 0 || x >= n) return 0;
    let sum = 0;
    for (let k = 0; k <= Math.floor(x); k++) sum += (k % 2 ? -1 : 1) * binomial(n, k) * (x - k) ** (n - 1);
    return sum / factorial(n - 1);
}

/** Irwin-Hall CDF: (1/n!) sum_k (-1)^k C(n,k) (x-k)^n over k <= x. */
function irwinHallCdf(n: number, x: number): number {
    if (x <= 0) return 0;
    if (x >= n) return 1;
    let sum = 0;
    for (let k = 0; k <= Math.floor(x); k++) sum += (k % 2 ? -1 : 1) * binomial(n, k) * (x - k) ** n;
    return sum / factorial(n);
}

/** Exact sup |F_n(standardized) - Phi| for U(0,1), scanned on a fine grid of the standardized variable. */
function exactUniformKolmogorov(n: number): number {
    const mean = n / 2;
    const sd = Math.sqrt(n / 12);
    let best = 0;
    const steps = 40000;
    for (let i = 0; i <= steps; i++) {
        const z = -8 + (16 * i) / steps;
        best = Math.max(best, Math.abs(irwinHallCdf(n, mean + sd * z) - normalCdf(z)));
    }
    return best;
}

function density(result: DensityResult): GridDensity {
    if (!result.ok) throw new Error(`unexpected status ${result.status}`);
    return result.density;
}

function sumOf(base: GridDensity, n: number): GridDensity {
    const r = nFold(base, n);
    if (!r.ok) throw new Error(`unexpected status ${r.status}`);
    return r.density;
}

function distance(d: GridDensity): number {
    const r = kolmogorovDistance(d);
    if (!r.ok) throw new Error(`unexpected status ${r.status}`);
    return r.distance;
}

const standardizedDistance = (base: GridDensity, n: number): number => distance(density(standardize(sumOf(base, n))));

const gauss = (z: number): number => Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);

const uniform = density(uniformBase(0.01));
const skewed = density(triangleBase(0.01));

describe('base densities', () => {
    it('uniform on [0, 1] has mass 1, mean 1/2 and variance 1/12', () => {
        const m = moments(uniform);
        expect(uniform.x0).toBe(0);
        expect(uniform.values).toHaveLength(101);
        expect(m.mass).toBeCloseTo(1, 12);
        expect(m.mean).toBeCloseTo(1 / 2, 12);
        expect(m.variance).toBeCloseTo(1 / 12, 3);
        expect(m.skewness).toBeCloseTo(0, 12);
    });

    it('right triangle 2(1-x) has mean 1/3, variance 1/18 and skewness 0.56569', () => {
        const m = moments(skewed);
        expect(skewed.values[0]).toBeCloseTo(2, 12);
        expect(skewed.values[100]).toBeCloseTo(0, 12);
        expect(m.mass).toBeCloseTo(1, 12);
        expect(Math.abs(m.mean - 1 / 3)).toBeLessThan(1e-4);
        expect(m.variance).toBeCloseTo(1 / 18, 3);
        expect(m.skewness).toBeCloseTo(0.56569, 2);
    });

    it('the piecewise-linear shape defaults to five equal heights, the uniform density', () => {
        expect(defaultHeights()).toEqual([1, 1, 1, 1, 1]);
        expect(density(piecewiseLinearBase()).values).toEqual(uniform.values);
    });

    it('five heights on the grid nodes 0, 1/4, ..., 1 reproduce the triangle and are normalized by the scale', () => {
        const shape = density(piecewiseLinearBase([8, 6, 4, 2, 0], 0.01));
        shape.values.forEach((v, i) => expect(v).toBeCloseTo(skewed.values[i], 12));
        expect(mass(shape)).toBeCloseTo(1, 12);
    });

    it('interpolates linearly between heights that are not grid nodes (three heights, step 1/30)', () => {
        const shape = density(piecewiseLinearBase([0, 2, 0], 1 / 30));
        expect(shape.values).toHaveLength(31);
        expect(shape.values[15]).toBeCloseTo(2, 12);
        expect(shape.values[5]).toBeCloseTo(2 / 3, 12);
        expect(shape.values[20]).toBeCloseTo(2 * (1 - (20 / 30 - 0.5) / 0.5), 12);
    });

    it('clamps negative heights to zero', () => {
        expect(density(piecewiseLinearBase([-3, 1, 1, 1, 1])).values).toEqual(density(piecewiseLinearBase([0, 1, 1, 1, 1])).values);
    });

    it('rejects an all-zero shape, non-finite heights, too few or too many heights with a status', () => {
        expect(piecewiseLinearBase([0, 0, 0, 0, 0])).toEqual({ok: false, status: 'zero-mass'});
        expect(piecewiseLinearBase([-1, -2, 0, 0, 0])).toEqual({ok: false, status: 'zero-mass'});
        expect(piecewiseLinearBase([1, NaN, 1])).toEqual({ok: false, status: 'invalid-heights'});
        expect(piecewiseLinearBase([1, Infinity, 1])).toEqual({ok: false, status: 'invalid-heights'});
        expect(piecewiseLinearBase([1])).toEqual({ok: false, status: 'invalid-heights'});
        expect(piecewiseLinearBase(Array.from({length: 33}, () => 1))).toEqual({ok: false, status: 'invalid-heights'});
    });

    it('rejects a step outside 1/2000..1/10', () => {
        for (const h of [0, -0.01, NaN, Infinity, 0.5, 1e-6]) expect(uniformBase(h)).toEqual({ok: false, status: 'invalid-step'});
        expect(uniformBase(0.1).ok).toBe(true);
    });
});

describe('normalize', () => {
    it('scales to mass 1 and reports the signed residual mass - 1', () => {
        const r = normalize({x0: 2, h: 0.5, values: [0, 2, 2, 0]});
        expect(r.ok && r.massResidual).toBeCloseTo(2 - 1, 12);
        expect(r.ok && mass(r.density)).toBeCloseTo(1, 12);
        expect(r.ok && r.density.x0).toBe(2);
        const small = normalize({x0: 0, h: 1, values: [0.5, 0.25]});
        expect(small.ok && small.massResidual).toBeCloseTo(0.375 - 1, 12);
    });

    it('rejects zero mass, negative values and non-finite grids with a status', () => {
        expect(normalize({x0: 0, h: 1, values: [0, 0, 0]})).toEqual({ok: false, status: 'zero-mass'});
        expect(normalize({x0: 0, h: 1, values: [1, -0.1, 1]})).toEqual({ok: false, status: 'invalid-grid'});
        expect(normalize({x0: 0, h: 1, values: [1, NaN]})).toEqual({ok: false, status: 'invalid-grid'});
        expect(normalize({x0: 0, h: 0, values: [1, 1]})).toEqual({ok: false, status: 'invalid-grid'});
        expect(normalize({x0: 0, h: 1, values: [1]})).toEqual({ok: false, status: 'invalid-grid'});
    });

    it('does not modify its input', () => {
        const values = [1, 2, 1];
        normalize({x0: 0, h: 1, values});
        expect(values).toEqual([1, 2, 1]);
    });
});

describe('convolve', () => {
    it('adds the origins, has m + m - 1 nodes and vanishes at both extreme nodes', () => {
        const f = {x0: 1, h: 0.1, values: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]};
        const g = {x0: 2, h: 0.1, values: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]};
        const r = density(convolve(f, g));
        expect(r.x0).toBe(3);
        expect(r.values).toHaveLength(21);
        expect(r.values[0]).toBe(0);
        expect(r.values[20]).toBe(0);
        expect(mass(r)).toBeCloseTo(1, 12);
    });

    it('the sum of two uniforms is the triangle on [0, 2]', () => {
        const r = density(convolve(uniform, uniform));
        expect(nodeX(r, 100)).toBeCloseTo(1, 12);
        expect(r.values[100]).toBeCloseTo(1, 12);
        expect(r.values[50]).toBeCloseTo(0.5, 12);
        expect(r.values[150]).toBeCloseTo(0.5, 12);
    });

    it('is symmetric in its arguments', () => {
        const a = density(convolve(skewed, uniform));
        const b = density(convolve(uniform, skewed));
        a.values.forEach((v, i) => expect(v).toBeCloseTo(b.values[i], 12));
    });

    it('rejects different steps and invalid grids with a status', () => {
        expect(convolve(uniform, density(uniformBase(0.02)))).toEqual({ok: false, status: 'grid-mismatch'});
        expect(convolve(uniform, {x0: 0, h: 0.01, values: [1]})).toEqual({ok: false, status: 'invalid-grid'});
        expect(convolve(uniform, {x0: 0, h: 0.01, values: [0, 0, 0]})).toEqual({ok: false, status: 'zero-mass'});
    });
});

describe('nFold range', () => {
    it('n = 1 is the normalized base density and n = 30 has 30 * 100 + 1 nodes', () => {
        const one = nFold(skewed, 1);
        if (!one.ok) throw new Error(one.status);
        one.density.values.forEach((v, i) => expect(v).toBeCloseTo(skewed.values[i], 12));
        expect(one.ok && one.massResidual).toBe(0);
        const top = nFold(uniform, N_MAX);
        expect(top.ok && top.density.values).toHaveLength(30 * 100 + 1);
        expect(top.ok && mass(top.density)).toBeCloseTo(1, 12);
    });

    it('rejects n outside 1..30 or not an integer with a status instead of throwing', () => {
        for (const n of [0, -1, 31, 100, 2.5, NaN, Infinity]) expect(nFold(uniform, n)).toEqual({ok: false, status: 'n-out-of-range'});
    });

    it('passes on a zero-mass base', () => {
        expect(nFold({x0: 0, h: 0.01, values: [0, 0, 0]}, 3)).toEqual({ok: false, status: 'zero-mass'});
    });
});

describe('Irwin-Hall oracle (independent closed formula)', () => {
    it('is itself a density: IH_3(1.5) = 3/4, IH_2(1) = 1, CDF of the sum of 4 at 2 is 1/2', () => {
        expect(irwinHallPdf(3, 1.5)).toBeCloseTo(0.75, 12);
        expect(irwinHallPdf(2, 1)).toBeCloseTo(1, 12);
        expect(irwinHallCdf(4, 2)).toBeCloseTo(0.5, 12);
        expect(irwinHallCdf(1, 0.3)).toBeCloseTo(0.3, 12);
    });

    // The n = 2 triangle is piecewise linear with its kink on a node, so the trapezoid rule is exact there (review
    // round 1: the spec's 5e-3 described a scheme with half weights on one factor only).
    it('kernel density: exact to round-off at n = 2 and <= 6e-5 for n >= 3 (h = 0.01)', () => {
        const bound = (n: number): number => (n === 2 ? 1e-12 : 6e-5);
        for (const n of [2, 3, 5, 10]) {
            const d = sumOf(uniform, n);
            let worst = 0;
            d.values.forEach((v, i) => {
                worst = Math.max(worst, Math.abs(v - irwinHallPdf(n, nodeX(d, i))));
            });
            expect(worst, `n=${n}`).toBeLessThanOrEqual(bound(n));
        }
    });

    it('kernel CDF: error below 1e-4 for n = 1, 2, 3, 5, 10 (h = 0.01)', () => {
        for (const n of [1, 2, 3, 5, 10]) {
            const d = sumOf(uniform, n);
            const F = cdf(d);
            let worst = 0;
            F.values.forEach((v, i) => {
                worst = Math.max(worst, Math.abs(v - irwinHallCdf(n, nodeX(F, i))));
            });
            expect(worst, `n=${n}`).toBeLessThan(1e-4);
        }
    });
});

describe('Kolmogorov distance from the standard normal', () => {
    it('of a finely sampled standard normal is about 0', () => {
        const values = Array.from({length: 1601}, (_, i) => gauss((i - 800) * 0.01));
        expect(distance({x0: -8, h: 0.01, values})).toBeLessThan(1e-4);
    });

    it('finds the supremum between nodes: N(0.1, 1) on a grid whose nodes miss x = 0.05', () => {
        const values = Array.from({length: 1601}, (_, i) => gauss(-8.003 + i * 0.01 - 0.1));
        const exact = 2 * normalCdf(0.05) - 1;
        expect(distance({x0: -8.003, h: 0.01, values})).toBeCloseTo(exact, 4);
    });

    it('matches a brute-force scan of the interpolated cumulative function on a coarse grid (supremum between nodes)', () => {
        const raw = [0.1, 0.3, 0.55, 0.4, 0.2, 0.05];
        const total = 0.6 * (raw.reduce((a, b) => a + b, 0) - 0.5 * (raw[0] + raw[5]));
        const coarse: GridDensity = {x0: -1.2, h: 0.6, values: raw.map(v => v / total)};
        const line = (x: number): number => {
            const t = (x - coarse.x0) / coarse.h;
            if (t <= 0 || t >= coarse.values.length - 1) return 0;
            const i = Math.floor(t);
            return coarse.values[i] + (coarse.values[i + 1] - coarse.values[i]) * (t - i);
        };
        let F = 0;
        let brute = 0;
        const dx = 1e-4;
        for (let x = -8; x <= 8; x += dx) {
            F += 0.5 * dx * (line(x) + line(x + dx));
            brute = Math.max(brute, Math.abs(F - normalCdf(x + dx)));
        }
        const atNodes = Math.max(...cdf(coarse).values.map((v, i) => Math.abs(v - normalCdf(nodeX(coarse, i)))));
        expect(brute - atNodes).toBeGreaterThan(3e-5);
        expect(Math.abs(distance(coarse) - brute)).toBeLessThan(1e-5);
    });

    it('is symmetric in the sense that the mirrored density gives the same distance', () => {
        const mirrored = {x0: -1, h: 0.01, values: [...skewed.values].reverse()};
        expect(standardizedDistance(mirrored, 3)).toBeCloseTo(standardizedDistance(skewed, 3), 6);
    });

    it('rejects an invalid grid with a status', () => {
        expect(kolmogorovDistance({x0: 0, h: 0.01, values: [1]})).toEqual({ok: false, status: 'invalid-grid'});
    });

    it('U(0,1): 0.05721, 0.01643, 0.00985, 0.00571, 0.00281 for n = 1, 2, 3, 5, 10 within 1e-4, and the exact Irwin-Hall value', () => {
        const spec: Record<number, number> = {1: 0.05721, 2: 0.01643, 3: 0.00985, 5: 0.00571, 10: 0.00281};
        for (const n of [1, 2, 3, 5, 10]) {
            const k = standardizedDistance(uniform, n);
            expect(Math.abs(k - spec[n]), `spec n=${n}`).toBeLessThan(1e-4);
            expect(Math.abs(k - exactUniformKolmogorov(n)), `oracle n=${n}`).toBeLessThan(1e-4);
        }
    });

    // Exact values from a rational piecewise-polynomial n-fold law of 2(1 - x) with exact mean n/3 and variance n/18
    // (review round 1); they replaced the spec's 0.02495, 0.01859 and 0.01261.
    // n = 1 carries the O(h) error of the density's jump at 0 (observed 3.1e-5), hence 4e-5.
    it('skewed: exact 0.0786496, 0.0355558, 0.0249181, 0.0185186, 0.0124833 for n = 1, 2, 3, 5, 10 within 4e-5', () => {
        const exact: Record<number, number> = {1: 0.0786496, 2: 0.0355558, 3: 0.0249181, 5: 0.0185186, 10: 0.0124833};
        for (const n of [1, 2, 3, 5, 10]) {
            expect(Math.abs(standardizedDistance(skewed, n) - exact[n]), `n=${n}`).toBeLessThan(4e-5);
        }
    });

    it('decreases with n for both base densities up to n = 30', () => {
        for (const base of [uniform, skewed]) {
            let previous = Infinity;
            for (const n of [1, 2, 3, 5, 10, 20, 30]) {
                const k = standardizedDistance(base, n);
                expect(k).toBeLessThan(previous);
                previous = k;
            }
        }
    });

    it('illustration constants: n K_n near 0.028 (uniform) and sqrt(n) K_n near 0.04 (skewed) at n = 10', () => {
        expect(10 * standardizedDistance(uniform, 10)).toBeCloseTo(0.028, 2);
        expect(Math.sqrt(10) * standardizedDistance(skewed, 10)).toBeCloseTo(0.04, 2);
    });

    it('grid-halving regression: h = 0.005 keeps the skewed n = 10 distance at the exact 0.01248', () => {
        const fine = density(triangleBase(0.005));
        const coarse = standardizedDistance(skewed, 10);
        const halved = standardizedDistance(fine, 10);
        expect(Math.abs(halved - 0.0124833)).toBeLessThan(3e-5);
        expect(Math.abs(halved - coarse)).toBeLessThan(3e-5);
    });
});

describe('mass, moments and standardization', () => {
    it('renormalization residual is of order h^2 per step (spec: 0.999975 at h = 0.01; observed -h^2 for the skewed base)', () => {
        const r = nFold(skewed, 10);
        expect(r.ok && Math.abs(r.massResidual)).toBeLessThan(2.5e-4);
        expect(r.ok && mass(r.density)).toBeCloseTo(1, 12);
        const flat = nFold(uniform, 10);
        expect(flat.ok && Math.abs(flat.massResidual)).toBeLessThan(1e-12);
    });

    it('n-fold mean and variance are n mu and n sigma^2 within 1e-3 (skewed, n = 10: 10/3 and 5/9)', () => {
        const m = moments(sumOf(skewed, 10));
        expect(Math.abs(m.mean - 10 / 3)).toBeLessThan(1e-3);
        expect(Math.abs(m.variance - 5 / 9)).toBeLessThan(1e-3);
        for (const n of [2, 5, 30]) {
            const u = moments(sumOf(uniform, n));
            expect(Math.abs(u.mean - n / 2), `mean n=${n}`).toBeLessThan(1e-3);
            expect(Math.abs(u.variance - n / 12), `variance n=${n}`).toBeLessThan(1e-3);
        }
    });

    it('f_2(1) of the skewed density is 2/3 within 1e-4 (spec: 0.6666)', () => {
        const d = sumOf(skewed, 2);
        expect(nodeX(d, 100)).toBeCloseTo(1, 12);
        expect(Math.abs(d.values[100] - 2 / 3)).toBeLessThan(1e-4);
    });

    it('skewness of the n-fold sum falls as 0.56569 / sqrt(n)', () => {
        const spec: Record<number, number> = {2: 0.4, 3: 0.3266, 5: 0.253, 10: 0.1789};
        for (const n of [2, 3, 5, 10]) {
            const s = moments(sumOf(skewed, n)).skewness;
            expect(Math.abs(s - 0.56569 / Math.sqrt(n)), `formula n=${n}`).toBeLessThan(1e-3);
            expect(Math.abs(s - spec[n]), `spec n=${n}`).toBeLessThan(1e-3);
        }
    });

    it('standardize gives mean 0, variance 1, the same mass, and the density of (X - mean) / sd', () => {
        const d = sumOf(skewed, 5);
        const original = moments(d);
        const s = density(standardize(d));
        const m = moments(s);
        expect(m.mean).toBeCloseTo(0, 12);
        expect(m.variance).toBeCloseTo(1, 12);
        expect(m.mass).toBeCloseTo(original.mass, 12);
        expect(m.skewness).toBeCloseTo(original.skewness, 10);
        const i = 123;
        const sd = Math.sqrt(original.variance);
        expect(nodeX(s, i)).toBeCloseTo((nodeX(d, i) - original.mean) / sd, 12);
        expect(s.values[i]).toBeCloseTo(d.values[i] * sd, 12);
    });

    it('rejects a grid without mass for standardization', () => {
        expect(standardize({x0: 0, h: 1, values: [0, 0]})).toEqual({ok: false, status: 'zero-mass'});
        expect(standardize({x0: 0, h: 1, values: [0, 1, 0]})).toEqual({ok: false, status: 'zero-variance'});
        expect(standardize({x0: 0, h: 1, values: [1]})).toEqual({ok: false, status: 'invalid-grid'});
    });

    it('cdf is nondecreasing from 0 to the mass', () => {
        const F = cdf(sumOf(skewed, 3)).values;
        expect(F[0]).toBe(0);
        expect(F[F.length - 1]).toBeCloseTo(1, 12);
        for (let i = 1; i < F.length; i++) expect(F[i]).toBeGreaterThanOrEqual(F[i - 1]);
    });
});

describe('user-shaped base densities reach the same limit', () => {
    it('a lopsided five-height shape has a distance that shrinks with n, and a bimodal one too', () => {
        for (const heights of [[0, 4, 1, 0.5, 3], [3, 0, 0, 0, 3]]) {
            const base = density(piecewiseLinearBase(heights));
            const k1 = standardizedDistance(base, 1);
            const k10 = standardizedDistance(base, 10);
            const k30 = standardizedDistance(base, 30);
            expect(k10).toBeLessThan(k1 / 2);
            expect(k30).toBeLessThan(k10);
            expect(k30).toBeLessThan(0.02);
        }
    });
});
