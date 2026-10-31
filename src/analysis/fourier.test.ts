import {gaussLegendre} from '../bezeg/impl/kernels/arc-length';
import {
    FourierError,
    PiecewiseLinearShape,
    complexCoefficients,
    integratePiecewise,
    meanSquare,
    parsevalSum,
    partialSum,
    realCoefficients,
    validateBreakpoints,
    validatePiecewiseLinear,
} from './fourier';
import {FOURIER_EXAMPLES, gibbsLimit, gibbsPeakValue, gibbsPeakX, squareWavePartialSum} from './fourierExamples';

const PI = Math.PI;

// Oracles below are written here from textbook formulas, not taken from the kernel's helpers.
const oddSquareB = (k: number): number => (k % 2 === 1 ? 4 / (PI * k) : 0);
const squareSum = (N: number, x: number): number => {
    let s = 0;
    for (let k = 1; k <= N; k += 2) {
        s += (4 * Math.sin(k * x)) / (PI * k);
    }
    return s;
};
const jumpFn = (x: number): number => (x < 1 ? -1 : 1);

describe('integratePiecewise', () => {
    it('matches the arc-length Gauss-Legendre rule on one piece', () => {
        const rule = gaussLegendre(16);
        let expected = 0;
        for (let j = 0; j < 16; j++) {
            expected += rule.weights[j] * Math.exp(rule.nodes[j]);
        }
        expect(integratePiecewise(Math.exp, [-1, 1])).toBeCloseTo(expected, 14);
        expect(integratePiecewise(Math.exp, [-1, 1])).toBeCloseTo(Math.E - 1 / Math.E, 12);
    });

    it('splits at every breakpoint', () => {
        // The integral of |x - 0.3| over [-1, 2] is (1.3^2 + 1.7^2)/2 only when split at the corner.
        expect(integratePiecewise((x) => Math.abs(x - 0.3), [-1, 0.3, 2])).toBeCloseTo((1.69 + 2.89) / 2, 13);
        expect(integratePiecewise((x) => Math.abs(x - 0.3), [-1, 2])).not.toBeCloseTo((1.69 + 2.89) / 2, 6);
    });

    it('rejects bad breakpoints and node counts with typed reasons', () => {
        const reason = (bp: number[], nodes?: number): string | undefined => {
            try {
                integratePiecewise(() => 1, bp, nodes);
            } catch (error) {
                return error instanceof FourierError ? error.reason : 'other';
            }
            return undefined;
        };
        expect(reason([1])).toBe('breakpoints-count');
        expect(reason([0, NaN, 2])).toBe('breakpoints-not-finite');
        expect(reason([0, Infinity])).toBe('breakpoints-not-finite');
        expect(reason([0, 1, 1])).toBe('breakpoints-not-increasing');
        expect(reason([0, 2, 1])).toBe('breakpoints-not-increasing');
        expect(reason([0, 1], 0)).toBe('nodes');
        expect(reason([0, 1], 2.5)).toBe('nodes');
        expect(reason([0, 1])).toBeUndefined();
    });

    it('reports a non-finite integrand as a typed error, not NaN', () => {
        expect(() => integratePiecewise(() => NaN, [0, 1])).toThrow(FourierError);
    });

    it('returns validator results as data', () => {
        expect(validateBreakpoints([0, 1, 2])).toEqual({ok: true});
        expect(validateBreakpoints([])).toEqual({ok: false, reason: 'breakpoints-count'});
    });
});

describe('breakpoint pitfall (F2)', () => {
    const exactB1 = 0.9805869033;

    it('an unsplit 16-node rule misses the jump example by more than 1e-2', () => {
        const unsplit = integratePiecewise((x) => jumpFn(x) * Math.sin(x), [-PI, PI]) / PI;
        expect(unsplit).toBeCloseTo(0.888871, 5);
        expect(Math.abs(unsplit - exactB1)).toBeGreaterThan(1e-2);
    });

    it('the kernel gets the jump example right because it splits at the breakpoint', () => {
        const {b} = realCoefficients(FOURIER_EXAMPLES.jump.source, 5);
        expect(Math.abs(b[1] - exactB1)).toBeLessThan(1e-10);
        expect(Math.abs(b[2] - -0.4507735384)).toBeLessThan(1e-10);
        expect(Math.abs(b[5] - 0.1634409457)).toBeLessThan(1e-10);
        // Independent closed form (1/pi)[-(F(1)-F(-pi)) + (F(pi)-F(1))], F = -cos(kx)/k.
        for (const k of [1, 2, 3, 4, 5]) {
            const F = (x: number): number => -Math.cos(k * x) / k;
            const exact = (-(F(1) - F(-PI)) + (F(PI) - F(1))) / PI;
            expect(Math.abs(b[k] - exact)).toBeLessThan(1e-10);
        }
    });
});

describe('F1 square wave and sawtooth', () => {
    const square = realCoefficients(FOURIER_EXAMPLES.square.source, 60);

    it('has b_k = 4/(pi k) for odd k and 0 for even k, a_k = 0, to 1e-12', () => {
        for (let k = 1; k <= 60; k++) {
            expect(Math.abs(square.b[k] - oddSquareB(k))).toBeLessThan(1e-12);
            expect(Math.abs(square.a[k])).toBeLessThan(1e-12);
        }
        expect(Math.abs(square.a[0])).toBeLessThan(1e-12);
    });

    it('has the sawtooth coefficients 2(-1)^(k+1)/k', () => {
        const saw = realCoefficients(FOURIER_EXAMPLES.sawtooth.source, 10);
        for (let k = 1; k <= 10; k++) {
            expect(Math.abs(saw.b[k] - (2 * (-1) ** (k + 1)) / k)).toBeLessThan(1e-12);
            expect(Math.abs(saw.a[k])).toBeLessThan(1e-12);
        }
    });

    it('partial sums vanish at the jump and the sawtooth midpoint', () => {
        const coeff = realCoefficients(FOURIER_EXAMPLES.square.source, 101);
        for (const N of [1, 2, 3, 11, 50, 101]) {
            expect(partialSum(coeff, N, 0)).toBeCloseTo(0, 12);
        }
        const saw = realCoefficients(FOURIER_EXAMPLES.sawtooth.source, 30);
        expect(Math.abs(partialSum(saw, 30, PI))).toBeLessThan(1e-12);
    });

    it('reproduces the spec values at x = pi/2 against the direct sum', () => {
        const coeff = realCoefficients(FOURIER_EXAMPLES.square.source, 1001);
        const expected: Array<[number, number]> = [
            [3, 0.84883],
            [5, 1.10347],
            [11, 0.9473],
            [101, 1.00624],
        ];
        for (const [N, value] of expected) {
            expect(partialSum(coeff, N, PI / 2)).toBeCloseTo(value, 5);
            expect(squareSum(N, PI / 2)).toBeCloseTo(value, 5);
        }
    });

    it('reproduces the pointwise errors at x = 0.5', () => {
        const coeff = realCoefficients(FOURIER_EXAMPLES.square.source, 1001);
        const expected: Array<[number, number]> = [
            [11, 0.09759],
            [101, 0.00981],
            [1001, 0.00011],
        ];
        for (const [N, err] of expected) {
            expect(Math.abs(partialSum(coeff, N, 0.5) - 1)).toBeCloseTo(err, 5);
            expect(Math.abs(squareSum(N, 0.5) - 1)).toBeCloseTo(err, 5);
        }
    });

    it('even N equals N - 1 for the square wave', () => {
        const coeff = realCoefficients(FOURIER_EXAMPLES.square.source, 12);
        expect(partialSum(coeff, 12, 0.7)).toBeCloseTo(partialSum(coeff, 11, 0.7), 12);
    });

    it('rejects an order beyond the coefficient list', () => {
        const coeff = realCoefficients(FOURIER_EXAMPLES.square.source, 4);
        expect(() => partialSum(coeff, 5, 0)).toThrow(FourierError);
        expect(() => partialSum(coeff, 1.5, 0)).toThrow(FourierError);
        expect(() => realCoefficients(FOURIER_EXAMPLES.square.source, -1)).toThrow(FourierError);
    });
});

describe('F2 absolute value, piecewise-linear shapes, Parseval', () => {
    it('|x| has a_0/2 = pi/2 and a_k = -4/(pi k^2) for odd k, 0 for even k', () => {
        const {a, b} = realCoefficients(FOURIER_EXAMPLES.abs.source, 20);
        expect(Math.abs(a[0] / 2 - PI / 2)).toBeLessThan(1e-12);
        for (let k = 1; k <= 20; k++) {
            const exact = k % 2 === 1 ? -4 / (PI * k * k) : 0;
            expect(Math.abs(a[k] - exact)).toBeLessThan(1e-12);
            expect(Math.abs(b[k])).toBeLessThan(1e-12);
        }
        expect(a[1]).toBeCloseTo(-1.27324, 5);
        expect(a[3]).toBeCloseTo(-0.141471, 6);
        expect(a[5]).toBeCloseTo(-0.05093, 5);
    });

    it('closed-form piecewise-linear coefficients agree with quadrature for every shaped example', () => {
        for (const id of ['square', 'sawtooth', 'abs', 'jump'] as const) {
            const example = FOURIER_EXAMPLES[id];
            const viaShape = realCoefficients(example.shape as PiecewiseLinearShape, 12);
            const viaQuadrature = realCoefficients(example.source, 12);
            for (let k = 0; k <= 12; k++) {
                expect(Math.abs(viaShape.a[k] - viaQuadrature.a[k])).toBeLessThan(1e-10);
                expect(Math.abs(viaShape.b[k] - viaQuadrature.b[k])).toBeLessThan(1e-10);
            }
        }
    });

    it('random piecewise-linear shapes (fixed seed, 1-4 breakpoints) match exact integrals to 1e-10', () => {
        let seed = 20261031;
        const rand = (): number => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        for (let trial = 0; trial < 40; trial++) {
            const interior = 1 + Math.floor(rand() * 4);
            const inner: number[] = [];
            while (inner.length < interior) {
                const x = -PI + 0.2 + rand() * (2 * PI - 0.4);
                if (inner.every((y) => Math.abs(y - x) > 0.1)) {
                    inner.push(x);
                }
            }
            inner.sort((p, q) => p - q);
            const bp = [-PI, ...inner, PI];
            const left = bp.map(() => rand() * 6 - 3);
            const right = bp.map(() => rand() * 6 - 3);
            const shape: PiecewiseLinearShape = {kind: 'piecewise-linear', breakpoints: bp, left, right};
            expect(validatePiecewiseLinear(shape)).toEqual({ok: true});
            const {a, b} = realCoefficients(shape, 8);
            const viaFunction = realCoefficients(
                {
                    kind: 'function',
                    breakpoints: bp,
                    f: (x) => {
                        let i = 0;
                        while (i < bp.length - 2 && x > bp[i + 1]) {
                            i++;
                        }
                        const u = right[i];
                        const v = left[i + 1];
                        return u + ((v - u) * (x - bp[i])) / (bp[i + 1] - bp[i]);
                    },
                },
                8,
            );
            for (let k = 0; k <= 8; k++) {
                // Exact integral by parts using the endpoint values of every linear piece.
                let ec = 0;
                let es = 0;
                for (let i = 0; i + 1 < bp.length; i++) {
                    const p = bp[i];
                    const q = bp[i + 1];
                    const u = right[i];
                    const v = left[i + 1];
                    const slope = (v - u) / (q - p);
                    if (k === 0) {
                        ec += ((u + v) / 2) * (q - p);
                    } else {
                        ec += (v * Math.sin(k * q) - u * Math.sin(k * p)) / k + (slope * (Math.cos(k * q) - Math.cos(k * p))) / (k * k);
                        es += -(v * Math.cos(k * q) - u * Math.cos(k * p)) / k + (slope * (Math.sin(k * q) - Math.sin(k * p))) / (k * k);
                    }
                }
                expect(Math.abs(a[k] - ec / PI)).toBeLessThan(1e-10);
                expect(Math.abs(b[k] - es / PI)).toBeLessThan(1e-10);
                expect(Math.abs(viaFunction.a[k] - ec / PI)).toBeLessThan(1e-10);
                expect(Math.abs(viaFunction.b[k] - es / PI)).toBeLessThan(1e-10);
            }
        }
    });

    it('rejects malformed shapes with typed reasons', () => {
        const base: PiecewiseLinearShape = {
            kind: 'piecewise-linear',
            breakpoints: [-PI, 0, PI],
            left: [0, 1, 2],
            right: [0, 1, 2],
        };
        expect(validatePiecewiseLinear(base)).toEqual({ok: true});
        expect(validatePiecewiseLinear({...base, left: [0, 1]})).toEqual({ok: false, reason: 'values-length'});
        expect(validatePiecewiseLinear({...base, right: [0, 1, 2, 3]})).toEqual({ok: false, reason: 'values-length'});
        expect(validatePiecewiseLinear({...base, left: [0, NaN, 2]})).toEqual({ok: false, reason: 'values-not-finite'});
        expect(validatePiecewiseLinear({...base, right: [0, Infinity, 2]})).toEqual({
            ok: false,
            reason: 'values-not-finite',
        });
        expect(validatePiecewiseLinear({...base, breakpoints: [-PI, 0, 0]})).toEqual({
            ok: false,
            reason: 'breakpoints-not-increasing',
        });
        expect(validatePiecewiseLinear({...base, breakpoints: [-1, 0, PI]})).toEqual({
            ok: false,
            reason: 'breakpoints-range',
        });
        expect(() => realCoefficients({...base, left: [0, NaN, 2]}, 3)).toThrow(FourierError);
    });

    it('gives the Parseval partial sums for the square wave and the mean square 2', () => {
        const coeff = realCoefficients(FOURIER_EXAMPLES.square.source, 101);
        const expected: Array<[number, number]> = [
            [1, 1.62114],
            [3, 1.80127],
            [11, 1.93261],
            [101, 1.99205],
        ];
        for (const [N, value] of expected) {
            let direct = 0;
            for (let k = 1; k <= N; k += 2) {
                direct += 16 / (PI * k) ** 2;
            }
            expect(parsevalSum(coeff, N)).toBeCloseTo(value, 5);
            expect(direct).toBeCloseTo(value, 5);
        }
        expect(meanSquare(FOURIER_EXAMPLES.square.source)).toBeCloseTo(2, 12);
        expect(meanSquare(FOURIER_EXAMPLES.square.shape as PiecewiseLinearShape)).toBeCloseTo(2, 12);
        // (1/pi) int x^2 = 2 pi^2 / 3 for the sawtooth; |x| shares it.
        expect(meanSquare(FOURIER_EXAMPLES.sawtooth.shape as PiecewiseLinearShape)).toBeCloseTo((2 * PI * PI) / 3, 12);
        expect(meanSquare(FOURIER_EXAMPLES.abs.source)).toBeCloseTo((2 * PI * PI) / 3, 12);
    });

    it('mean square of a smooth non-polynomial source: 1/(2 - cos x) gives 4/(3 sqrt 3)', () => {
        // int_{-pi}^{pi} (a - b cos x)^{-2} dx = 2 pi a / (a^2 - b^2)^{3/2}; a = 2, b = 1.
        const source = {kind: 'function', f: (x: number) => 1 / (2 - Math.cos(x)), breakpoints: [-PI, PI]} as const;
        expect(Math.abs(meanSquare(source) - 4 / (3 * Math.sqrt(3)))).toBeLessThan(1e-12);
    });

    it('Parseval sum converges to the mean square for |x|', () => {
        const coeff = realCoefficients(FOURIER_EXAMPLES.abs.source, 2000);
        expect(Math.abs(parsevalSum(coeff, 2000) - (2 * PI * PI) / 3)).toBeLessThan(1e-6);
    });
});

describe('complex coefficients', () => {
    it('c_k = -2i/(pi k) for the odd square wave, conjugate symmetric, c_0 = 0', () => {
        const N = 7;
        const c = complexCoefficients(FOURIER_EXAMPLES.square.source, N);
        expect(c).toHaveLength(2 * N + 1);
        for (let k = -N; k <= N; k++) {
            const odd = Math.abs(k) % 2 === 1;
            const exactIm = odd ? -2 / (PI * k) : 0;
            expect(Math.abs(c[k + N].re)).toBeLessThan(1e-12);
            expect(Math.abs(c[k + N].im - exactIm)).toBeLessThan(1e-12);
        }
    });

    it('agrees with a direct (1/2pi) int f e^{-ikx} for the jump example', () => {
        const N = 5;
        const c = complexCoefficients(FOURIER_EXAMPLES.jump.source, N);
        for (let k = -N; k <= N; k++) {
            const re = integratePiecewise((x) => jumpFn(x) * Math.cos(k * x), [-PI, 1, PI]) / (2 * PI);
            const im = -integratePiecewise((x) => jumpFn(x) * Math.sin(k * x), [-PI, 1, PI]) / (2 * PI);
            expect(Math.abs(c[k + N].re - re)).toBeLessThan(1e-12);
            expect(Math.abs(c[k + N].im - im)).toBeLessThan(1e-12);
        }
    });

    it('obeys the shift identity c_k(f(x - tau)) = e^{-ik tau} c_k(f)', () => {
        const tau = 0.7;
        const f = (x: number): number => 1 / (2 - Math.cos(x));
        const base = complexCoefficients({kind: 'function', f, breakpoints: [-PI, PI]}, 6);
        const shifted = complexCoefficients(
            {kind: 'function', f: (x) => f(x - tau), breakpoints: [-PI, PI]},
            6,
        );
        for (let k = -6; k <= 6; k++) {
            const c = base[k + 6];
            const re = c.re * Math.cos(k * tau) + c.im * Math.sin(k * tau);
            const im = c.im * Math.cos(k * tau) - c.re * Math.sin(k * tau);
            expect(Math.abs(shifted[k + 6].re - re)).toBeLessThan(1e-10);
            expect(Math.abs(shifted[k + 6].im - im)).toBeLessThan(1e-10);
        }
    });
});

describe('F3 Gibbs phenomenon', () => {
    it('peak values at x = pi/(N+1)', () => {
        const expected: Array<[number, number]> = [
            [1, 1.27324],
            [3, 1.20042],
            [5, 1.18836],
            [11, 1.1813],
            [101, 1.17901],
            [1001, 1.17898],
        ];
        for (const [N, value] of expected) {
            expect(gibbsPeakValue(N)).toBeCloseTo(value, 5);
            expect(squareSum(N, PI / (N + 1))).toBeCloseTo(gibbsPeakValue(N), 12);
        }
        expect(gibbsPeakX(11)).toBeCloseTo(PI / 12, 14);
    });

    it('the kernel partial sum peaks at pi/(N+1) (local scan)', () => {
        const coeff = realCoefficients(FOURIER_EXAMPLES.square.source, 11);
        const x0 = PI / 12;
        const peak = partialSum(coeff, 11, x0);
        for (const d of [-0.01, -0.001, 0.001, 0.01]) {
            expect(partialSum(coeff, 11, x0 + d)).toBeLessThan(peak);
        }
        expect(peak).toBeCloseTo(1.1813, 5);
    });

    it('the limit 2 Si(pi)/pi agrees with 1.1789797 to 1e-6', () => {
        expect(Math.abs(gibbsLimit() - 1.1789797)).toBeLessThan(1e-6);
        expect(Math.abs(gibbsLimit() - (2 * 1.851937052) / PI)).toBeLessThan(1e-8);
    });

    it('has finite overshoot 0.09065 at N = 11 and error 0.99994 at x = 1e-6, N = 101', () => {
        expect((squareWavePartialSum(11, PI / 12) - 1) / 2).toBeCloseTo(0.09065, 5);
        expect(Math.abs(squareSum(101, 1e-6) - 1)).toBeCloseTo(0.99994, 5);
        const coeff = realCoefficients(FOURIER_EXAMPLES.square.source, 101);
        expect(Math.abs(partialSum(coeff, 101, 1e-6) - 1)).toBeCloseTo(0.99994, 5);
    });
});

describe('F4 smoothness and decay', () => {
    it('1/(2 - cos x) has a_k = 2/sqrt(3) r^k, r = 2 - sqrt(3)', () => {
        const {a, b} = realCoefficients(FOURIER_EXAMPLES.smooth.source, 10);
        const r = 2 - Math.sqrt(3);
        for (let k = 0; k <= 5; k++) {
            expect(Math.abs(a[k] - (2 / Math.sqrt(3)) * r ** k)).toBeLessThan(1e-10);
            expect(Math.abs(b[k])).toBeLessThan(1e-10);
        }
        // Recorded tolerance: relative 1e-3 at k = 10, where the value (about 2.2e-6) is near the quadrature noise.
        const exact10 = (2 / Math.sqrt(3)) * r ** 10;
        expect(Math.abs(a[10] - exact10) / exact10).toBeLessThan(1e-3);
        expect(a[1]).toBeCloseTo(0.3094011, 7);
        expect(a[5]).toBeCloseTo(0.00159489, 8);
    });

    it('the sup error of S_11 for |x| equals the odd tail 4/(pi k^2), k >= 13, at the corner', () => {
        const coeff = realCoefficients(FOURIER_EXAMPLES.abs.source, 11);
        // sum over all odd k of 1/k^2 is pi^2/8; subtract the odd k <= 11 part for the tail.
        let head = 0;
        for (let k = 1; k <= 11; k += 2) {
            head += 1 / (k * k);
        }
        const tail = (4 / PI) * (PI * PI / 8 - head);
        expect(tail).toBeCloseTo(0.05293, 5);
        let sup = 0;
        for (let i = 0; i <= 20000; i++) {
            const x = (PI * i) / 20000;
            sup = Math.max(sup, Math.abs(partialSum(coeff, 11, x) - x));
        }
        expect(sup).toBeCloseTo(tail, 5);
        expect(Math.abs(partialSum(coeff, 11, 0) - 0)).toBeCloseTo(tail, 12);
    });
});
