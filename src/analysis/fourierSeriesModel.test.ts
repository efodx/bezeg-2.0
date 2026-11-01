import {FOURIER_EXAMPLES, gibbsPeakValue, squareWavePartialSum} from './fourierExamples';
import {partialSum, realCoefficients} from './fourier';
import {
    changeFourierEpsilon, changeFourierN, checkFourierSeriesModel, chooseFourierSeriesExample, DEFAULT_FOURIER_SERIES_MODEL, effectiveOrder, FOURIER_DOMAIN,
    FOURIER_SAMPLES_PER_PERIOD, fourierGibbsPeak, fourierJump, fourierPartialSum, fourierPieces, fourierSampleSpacing, fourierSamples, fourierTarget, fourierTermList,
    fourierZoomWindow, moveFourierX, parseFourierSeriesModel,
} from './fourierSeriesModel';

const valid = DEFAULT_FOURIER_SERIES_MODEL;

/** The direct sum of sines, the definition the recurrence must reproduce. */
function directSum(example: 'square' | 'sawtooth', n: number, x: number): number {
    let s = 0;
    for (let k = 1; k <= n; k++) {
        if (example === 'square') {
            if (k % 2 === 1) s += (4 / (Math.PI * k)) * Math.sin(k * x);
        } else {
            s += (2 * (k % 2 === 1 ? 1 : -1) / k) * Math.sin(k * x);
        }
    }
    return s;
}

describe('validity per field', () => {
    test('the default and the boundaries of every field are accepted', () => {
        expect(checkFourierSeriesModel(valid)).toEqual({ok: true, model: valid});
        for (const boundary of [{n: 1}, {n: 1001}, {x: -6.28}, {x: 6.28}, {x: 0}, {epsilon: 0.01}, {epsilon: 1}, {example: 'sawtooth'}]) {
            expect(checkFourierSeriesModel({...valid, ...boundary}).ok).toBe(true);
        }
    });

    test('N must be an integer in 1..1001; a non-integer is rejected, never rounded', () => {
        for (const n of [0, -1, 1002, 2.5, 11.0000001, 10.9999999, 1000.5, 0.5]) {
            expect(checkFourierSeriesModel({...valid, n})).toEqual({ok: false, issue: {kind: 'n', min: 1, max: 1001}});
            expect(changeFourierN(valid, n)).toEqual({ok: false, issue: {kind: 'n', min: 1, max: 1001}});
        }
        const edit = changeFourierN(valid, 12);
        expect(edit.ok && edit.model.n).toBe(12);
        expect(changeFourierN(valid, 11)).toEqual({ok: true, model: valid});
        expect(changeFourierN(valid, '12')).toMatchObject({ok: false});
        expect(checkFourierSeriesModel({...valid, n: '11'})).toEqual({ok: false, issue: undefined});
        expect(checkFourierSeriesModel({...valid, n: NaN})).toEqual({ok: false, issue: undefined});
    });

    test('x is a multiple of 0.01 in [-6.28, 6.28] and epsilon a multiple of 0.01 in [0.01, 1]', () => {
        for (const x of [-6.29, 6.29, 0.505, 7]) expect(checkFourierSeriesModel({...valid, x})).toMatchObject({ok: false, issue: {kind: 'x'}});
        for (const epsilon of [0, 0.005, 1.01, -0.1, 0.123]) expect(checkFourierSeriesModel({...valid, epsilon})).toMatchObject({ok: false, issue: {kind: 'epsilon'}});
        expect(moveFourierX(valid, 0.1 + 0.2)).toMatchObject({ok: true, model: {x: 0.3}});
        expect(changeFourierEpsilon(valid, 0.07)).toMatchObject({ok: true, model: {epsilon: 0.07}});
        expect(moveFourierX(valid, 0.505)).toMatchObject({ok: false});
        expect(changeFourierEpsilon(valid, 0)).toMatchObject({ok: false});
        expect(checkFourierSeriesModel({...valid, x: '0.5'})).toEqual({ok: false, issue: undefined});
    });

    test('the example must be known; missing fields and wrong containers give the generic issue; unknown properties are dropped', () => {
        expect(checkFourierSeriesModel({...valid, example: 'triangle'})).toMatchObject({ok: false, issue: {kind: 'example', allowed: ['square', 'sawtooth']}});
        expect(chooseFourierSeriesExample(valid, 'triangle')).toMatchObject({ok: false});
        expect(chooseFourierSeriesExample(valid, 'sawtooth')).toMatchObject({ok: true, model: {example: 'sawtooth', n: 11, x: 0.5, epsilon: 0.1}});
        for (const data of [null, [], 3, 'x']) expect(checkFourierSeriesModel(data)).toEqual({ok: false, issue: undefined});
        expect(parseFourierSeriesModel({example: 'square', n: 11, x: 0.5})).toBeUndefined();
        expect(parseFourierSeriesModel({...valid, extra: 1})).toEqual(valid);
    });
});

describe('mathematics', () => {
    test('the square wave with even N equals N - 1', () => {
        for (const n of [2, 10, 100, 1000]) {
            expect(effectiveOrder('square', n)).toBe(n - 1);
            for (const x of [0.3, 1.1, 2.9]) expect(fourierPartialSum('square', n, x)).toBeCloseTo(fourierPartialSum('square', n - 1, x), 12);
            expect(fourierGibbsPeak('square', n).x).toBe(fourierGibbsPeak('square', n - 1).x);
        }
        expect(effectiveOrder('sawtooth', 10)).toBe(10);
    });

    test('the recurrence agrees with the direct sum, the kernel and squareWavePartialSum within 1e-12', () => {
        for (const n of [1, 2, 11, 101, 1001]) {
            // the direct sums round k*x (up to ~6000 rad) and carry an error of about 1e-12 themselves at N = 1001
            const tolerance = n >= 1001 ? 5e-12 : 1e-12;
            for (const x of [-6.28, -3.14, -1, 0, 0.0031, 0.5, Math.PI / (n + 1), 1.5707963, 3.14, 6.28]) {
                expect(Math.abs(fourierPartialSum('square', n, x) - squareWavePartialSum(n, x))).toBeLessThan(tolerance);
                expect(Math.abs(fourierPartialSum('square', n, x) - directSum('square', n, x))).toBeLessThan(tolerance);
                expect(Math.abs(fourierPartialSum('sawtooth', n, x) - directSum('sawtooth', n, x))).toBeLessThan(tolerance);
            }
        }
        const coefficients = realCoefficients(FOURIER_EXAMPLES.sawtooth.source, 11);
        expect(fourierPartialSum('sawtooth', 11, 1.3)).toBeCloseTo(partialSum(coefficients, 11, 1.3), 8);
    });

    test('square-wave values from the lessons: S_N(pi/2) and the peak values 1.27324, 1.20042, 1.18130, 1.17901', () => {
        expect(fourierPartialSum('square', 1, Math.PI / 2)).toBeCloseTo(4 / Math.PI, 12);
        expect(fourierPartialSum('square', 3, Math.PI / 2)).toBeCloseTo((4 / Math.PI) * (1 - 1 / 3), 12);
        const expected: [number, number][] = [[1, 1.27324], [3, 1.20042], [11, 1.1813], [101, 1.17901]];
        for (const [n, value] of expected) expect(fourierGibbsPeak('square', n).value).toBeCloseTo(value, 5);
    });

    test('the Gibbs peak sits at pi/(N+1) with the value of gibbsPeakValue, and nearby points stay below it', () => {
        for (const n of [1, 3, 11, 101, 1001]) {
            const peak = fourierGibbsPeak('square', n);
            expect(peak.x).toBeCloseTo(Math.PI / (n + 1), 14);
            expect(peak.value).toBe(gibbsPeakValue(n));
            expect(peak.overshoot).toBeCloseTo((peak.value - 1) / 2, 14);
        }
        const peak = fourierGibbsPeak('square', 11);
        for (const dx of [-0.2, -0.05, -0.005, 0.005, 0.05, 0.2]) expect(fourierPartialSum('square', 11, peak.x + dx)).toBeLessThan(peak.value);
    });

    test('the sawtooth peak is the maximiser of S_N left of pi, at pi - pi/(N+1), above the limit pi', () => {
        for (const n of [2, 5, 11, 101]) {
            const peak = fourierGibbsPeak('sawtooth', n);
            expect(peak.x).toBeCloseTo(Math.PI - Math.PI / (n + 1), 14);
            // independent oracle: the direct sum of b_k sin(kx), b_k = 2 (-1)^(k+1) / k, at the peak abscissa
            let direct = 0;
            for (let k = 1; k <= n; k++) direct += (2 * (k % 2 === 1 ? 1 : -1) / k) * Math.sin(k * peak.x);
            expect(peak.value).toBeCloseTo(direct, 12);
            let best = -Infinity;
            for (let x = Math.PI / 2; x < Math.PI; x += 0.0005) best = Math.max(best, fourierPartialSum('sawtooth', n, x));
            expect(best).toBeLessThanOrEqual(peak.value + 1e-12);
            expect(peak.value - best).toBeLessThan(1e-5);
        }
        expect(fourierGibbsPeak('sawtooth', 101).overshoot).toBeGreaterThan(0.08);
        expect(fourierGibbsPeak('sawtooth', 1).overshoot).toBeUndefined();
    });

    test('jumps: the one-sided limits and the midpoint where every S_N passes', () => {
        expect(fourierJump('square')).toMatchObject({x: 0, left: -1, right: 1, midpoint: 0});
        expect(fourierJump('sawtooth')).toMatchObject({x: Math.PI, left: Math.PI, right: -Math.PI, midpoint: 0});
        expect(fourierTarget('square', 0)).toBe(0);
        expect(fourierTarget('square', Math.PI)).toBe(0);
        expect(fourierTarget('square', 1)).toBe(1);
        expect(fourierTarget('square', -1)).toBe(-1);
        expect(fourierTarget('sawtooth', Math.PI)).toBe(0);
        expect(fourierTarget('sawtooth', 1)).toBe(1);
        expect(fourierTarget('sawtooth', 4)).toBeCloseTo(4 - 2 * Math.PI, 12);
        for (const n of [1, 6, 11]) {
            expect(Math.abs(fourierPartialSum('square', n, 0))).toBeLessThan(1e-14);
            expect(Math.abs(fourierPartialSum('sawtooth', n, Math.PI))).toBeLessThan(1e-12);
        }
        const square = fourierPieces('square');
        expect(square).toHaveLength(4);
        expect(square.map(p => p.y0)).toEqual([1, -1, 1, -1]);
        const saw = fourierPieces('sawtooth');
        expect(saw).toHaveLength(3);
        expect(saw[1].y0).toBeCloseTo(-Math.PI, 12);
        expect(saw[1].y1).toBeCloseTo(Math.PI, 12);
        expect(saw[0].y1).toBeCloseTo(Math.PI, 12);
    });

    test('the sampling has at least 8 points per period of the highest harmonic and covers the domain', () => {
        for (const example of ['square', 'sawtooth'] as const) {
            for (const n of [1, 2, 11, 101, 1001]) {
                const {x, y} = fourierSamples(example, n);
                expect(y).toHaveLength(x.length);
                const period = 2 * Math.PI / effectiveOrder(example, n);
                let widest = 0;
                for (let i = 1; i < x.length; i++) widest = Math.max(widest, x[i] - x[i - 1]);
                expect(widest).toBeLessThanOrEqual(period / 8);
                expect(widest).toBeLessThanOrEqual(fourierSampleSpacing(example, n) + 1e-12);
                expect(x[0]).toBeCloseTo(FOURIER_DOMAIN[0], 12);
                expect(x[x.length - 1]).toBeCloseTo(FOURIER_DOMAIN[1], 12);
                expect(y.every(Number.isFinite)).toBe(true);
            }
        }
        expect(FOURIER_SAMPLES_PER_PERIOD).toBeGreaterThanOrEqual(8);
    });

    test('the drawn maximum is the closed-form Gibbs peak, for both examples', () => {
        for (const example of ['square', 'sawtooth'] as const) {
            for (const n of [3, 11, 101, 1001]) {
                const {y} = fourierSamples(example, n);
                expect(y.length).toBeGreaterThan(0);
                expect(Math.max(...y)).toBeCloseTo(fourierGibbsPeak(example, n).value, 12);
            }
        }
    });

    test('the zoom window is centred on the peak and contains the peak and the jump limit', () => {
        for (const example of ['square', 'sawtooth'] as const) {
            for (const n of [3, 101]) {
                const [left, top, right, bottom] = fourierZoomWindow(example, n);
                const peak = fourierGibbsPeak(example, n);
                expect((left + right) / 2).toBeCloseTo(peak.x, 12);
                expect(right - left).toBeCloseTo(4 * peak.distance, 12);
                expect(peak.value).toBeLessThan(top);
                expect(fourierJump(example).high).toBeGreaterThan(bottom);
            }
        }
        expect(fourierZoomWindow('square', 11)).not.toEqual(fourierZoomWindow('square', 101));
    });
});

describe('fourierTermList', () => {
    const signs = (list: ReturnType<typeof fourierTermList>) => list.leading.map(t => t.sign * t.k);

    test('square: odd k, all positive, prefactor 4/pi; even N ends at N - 1', () => {
        const list = fourierTermList('square', 11);
        expect(list.prefactor).toBe('four-over-pi');
        expect(signs(list)).toEqual([1, 3, 5, 7, 9, 11]);
        expect(list.last).toBeUndefined();
        expect(list.count).toBe(6);
        const big = fourierTermList('square', 50);
        expect(signs(big)).toEqual([1, 3, 5, 7, 9, 11]);
        expect(big.last).toEqual({k: 49, sign: 1});
        expect(big.count).toBe(25);
        expect(fourierTermList('square', 2)).toMatchObject({count: 1, last: undefined});
        expect(signs(fourierTermList('square', 2))).toEqual([1]);
    });

    test('sawtooth: every k, signs alternate as the sign of b_k, prefactor 2', () => {
        const list = fourierTermList('sawtooth', 4);
        expect(list.prefactor).toBe('two');
        expect(signs(list)).toEqual([1, -2, 3, -4]);
        const big = fourierTermList('sawtooth', 50);
        expect(signs(big)).toEqual([1, -2, 3, -4, 5, -6]);
        expect(big.last).toEqual({k: 50, sign: -1});
        expect(fourierTermList('sawtooth', 7).last).toEqual({k: 7, sign: 1});
        expect(fourierTermList('sawtooth', 6).last).toBeUndefined();
    });

    test('the listed terms reproduce S_N', () => {
        for (const [example, n] of [['square', 9], ['sawtooth', 6]] as const) {
            const list = fourierTermList(example, n);
            const x = 0.7;
            const pre = list.prefactor === 'two' ? 2 : 4 / Math.PI;
            const sum = pre * list.leading.reduce((a, t) => a + t.sign * Math.sin(t.k * x) / t.k, 0);
            expect(sum).toBeCloseTo(fourierPartialSum(example, n, x), 12);
        }
    });
});
