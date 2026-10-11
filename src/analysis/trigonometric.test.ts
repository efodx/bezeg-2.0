import {
    amplitude, basicValue, equationText, formatPhase, formatWithPi, joinPieces, period, phaseAsPi, phaseShift, snapPhase, tangentAsymptotes,
    tangentBranches, trigValue, TrigParameters, valueRange,
} from './trigonometric';
import {DEFAULT_TRIGONOMETRIC_MODEL, parseTrigonometricModel} from './trigonometricModel';

const sine = (A: number, omega: number, phi: number, B: number): TrigParameters => ({fn: 'sin', A, omega, phi, B});
const worked = sine(2, 2, Math.PI / 2, 1);

test('evaluates A g(omega x + phi) + B for sin, cos and tan', () => {
    expect(basicValue('sin', Math.PI / 2)).toBeCloseTo(1, 12);
    expect(trigValue(sine(1, 1, 0, 0), Math.PI / 6)).toBeCloseTo(0.5, 12);
    expect(trigValue({fn: 'cos', A: 1, omega: 1, phi: 0, B: 0}, Math.PI / 3)).toBeCloseTo(0.5, 12);
    expect(trigValue({fn: 'tan', A: 1, omega: 1, phi: 0, B: 0}, Math.PI / 4)).toBeCloseTo(1, 12);
    expect(trigValue(sine(-2, 3, 1, 4), 0.7)).toBeCloseTo(-2 * Math.sin(3 * 0.7 + 1) + 4, 12);
});

describe('worked example A = 2, omega = 2, phi = pi/2, B = 1', () => {
    test('maximum 3, minimum -1, period pi, shift -pi/4', () => {
        expect(valueRange(worked)).toEqual([-1, 3]);
        expect(period(worked)).toBeCloseTo(Math.PI, 12);
        expect(phaseShift(worked)).toBeCloseTo(-Math.PI / 4, 12);
        expect(amplitude(worked)).toBe(2);
    });

    test('the maximum is attained at x = 0 and the graph crosses the midline at the shift', () => {
        expect(trigValue(worked, 0)).toBeCloseTo(3, 12);
        expect(trigValue(worked, phaseShift(worked))).toBeCloseTo(1, 12);
        expect(trigValue(worked, Math.PI / 2)).toBeCloseTo(-1, 12);
        // periodic with period pi
        for (const x of [-1.3, 0.2, 2.9]) expect(trigValue(worked, x + Math.PI)).toBeCloseTo(trigValue(worked, x), 12);
    });

    test('the sampled extrema match the range', () => {
        const values = Array.from({length: 2000}, (_, i) => trigValue(worked, -Math.PI + (2 * Math.PI * i) / 1999));
        expect(Math.max(...values)).toBeCloseTo(3, 4);
        expect(Math.min(...values)).toBeCloseTo(-1, 4);
    });
});

test('the lesson numbers: the base wave, the amplitude and midline scene', () => {
    expect(valueRange(sine(1, 1, 0, 0))).toEqual([-1, 1]);
    expect(period(sine(1, 1, 0, 0))).toBeCloseTo(2 * Math.PI, 12);
    expect(2 * Math.PI).toBeCloseTo(6.28, 2);
    expect(valueRange(sine(2, 1, 0, -1))).toEqual([-3, 1]);
    expect(valueRange(sine(-2, 1, 0, -1))).toEqual([-3, 1]);
    expect(amplitude(sine(-2, 1, 0, -1))).toBe(2);
    expect(Math.PI).toBeCloseTo(3.14, 2);
    expect(Math.PI / 4).toBeCloseTo(0.79, 2);
});

test('cos x = sin(x + pi/2) and the shift of that sine is -pi/2', () => {
    const shifted = sine(1, 1, Math.PI / 2, 0);
    for (const x of [-6, -2.5, 0, 0.3, 1, 4.4]) expect(trigValue(shifted, x)).toBeCloseTo(basicValue('cos', x), 12);
    expect(phaseShift(shifted)).toBeCloseTo(-Math.PI / 2, 12);
    expect(trigValue(shifted, 0)).toBeCloseTo(1, 12);
    expect(Math.PI / 2).toBeCloseTo(1.57, 2);
});

test('period: 2 pi / omega for sin and cos, pi / omega for tan', () => {
    expect(period({fn: 'sin', omega: 0.25})).toBeCloseTo(8 * Math.PI, 12);
    expect(period({fn: 'cos', omega: 4})).toBeCloseTo(Math.PI / 2, 12);
    expect(period({fn: 'tan', omega: 1})).toBeCloseTo(Math.PI, 12);
    expect(period({fn: 'tan', omega: 2})).toBeCloseTo(Math.PI / 2, 12);
    for (const fn of ['sin', 'cos', 'tan'] as const) {
        const parameters: TrigParameters = {fn, A: 1.5, omega: 1.6, phi: 0.4, B: -0.5};
        expect(trigValue(parameters, 0.37 + period(parameters))).toBeCloseTo(trigValue(parameters, 0.37), 9);
    }
});

test('tangent has no amplitude and no finite range, but A = 0 leaves the constant B', () => {
    expect(amplitude({fn: 'tan', A: 2})).toBeNull();
    expect(valueRange({fn: 'tan', A: 2, B: 1})).toBeNull();
    expect(valueRange({fn: 'tan', A: 0, B: 1})).toEqual([1, 1]);
    expect(amplitude({fn: 'sin', A: 0})).toBe(0);
    expect(valueRange({fn: 'cos', A: 0, B: 2})).toEqual([2, 2]);
});

test('the phase shift is never negative zero', () => {
    expect(Object.is(phaseShift({omega: 1, phi: 0}), 0)).toBe(true);
});

describe('tangent asymptotes: omega x + phi = pi/2 + m pi', () => {
    test('for omega = 1, phi = 0 on [-7, 7] they are +-pi/2 and +-3 pi/2', () => {
        const asymptotes = tangentAsymptotes(1, 0, -7, 7);
        expect(asymptotes).toHaveLength(4);
        [-3 * Math.PI / 2, -Math.PI / 2, Math.PI / 2, 3 * Math.PI / 2].forEach((expected, index) => expect(asymptotes[index]).toBeCloseTo(expected, 12));
    });

    test('they are spaced by the period pi / omega and satisfy cos(omega x + phi) = 0', () => {
        for (const [omega, phi] of [[2, 0.3], [0.25, -1], [3.5, Math.PI / 4], [1, Math.PI]]) {
            const asymptotes = tangentAsymptotes(omega, phi, -7, 7);
            expect(asymptotes.length).toBeGreaterThan(0);
            asymptotes.forEach((x, index) => {
                expect(Math.cos(omega * x + phi)).toBeCloseTo(0, 9);
                expect(x).toBeGreaterThanOrEqual(-7 - 1e-9);
                expect(x).toBeLessThanOrEqual(7 + 1e-9);
                if (index > 0) expect(x - asymptotes[index - 1]).toBeCloseTo(Math.PI / omega, 9);
            });
            // none was missed at the ends
            expect(asymptotes[0] - Math.PI / omega).toBeLessThan(-7);
            expect(asymptotes.at(-1)! + Math.PI / omega).toBeGreaterThan(7);
        }
    });

    test('an asymptote exactly on the left edge is included, and bad intervals give nothing', () => {
        expect(tangentAsymptotes(1, 0, -Math.PI / 2, 0)).toHaveLength(1);
        expect(tangentAsymptotes(1, 0, 1, -1)).toEqual([]);
        expect(tangentAsymptotes(0, 0, -7, 7)).toEqual([]);
        expect(tangentAsymptotes(1, 0, NaN, 7)).toEqual([]);
        expect(tangentAsymptotes(1, 0, -1e6, 1e6, 10)).toHaveLength(10);
    });
});

describe('tangent branches are never joined across an asymptote', () => {
    const parameters = {A: 1, omega: 1, phi: 0, B: 0};

    test('one piece per interval between asymptotes, each monotonic and finite', () => {
        const branches = tangentBranches(parameters, -7, 7);
        // intervals: [-7,-3pi/2], [-3pi/2,-pi/2], [-pi/2,pi/2], [pi/2,3pi/2], [3pi/2,7]
        expect(branches).toHaveLength(5);
        for (const branch of branches) {
            expect(branch.x).toHaveLength(branch.y.length);
            expect(branch.y.every(Number.isFinite)).toBe(true);
            for (let i = 1; i < branch.y.length; i++) expect(branch.y[i]).toBeGreaterThan(branch.y[i - 1]);
        }
    });

    test('no piece contains an asymptote and the gap between pieces covers it', () => {
        const asymptotes = tangentAsymptotes(1, 0, -7, 7);
        const branches = tangentBranches(parameters, -7, 7);
        for (const branch of branches) {
            for (const asymptote of asymptotes) {
                const inside = branch.x.some(x => x < asymptote) && branch.x.some(x => x > asymptote);
                expect(inside).toBe(false);
            }
        }
        for (const asymptote of asymptotes) {
            const before = branches.find(branch => branch.x.at(-1)! < asymptote && asymptote - branch.x.at(-1)! < 0.1);
            const after = branches.find(branch => branch.x[0] > asymptote && branch.x[0] - asymptote < 0.1);
            expect(before).toBeDefined();
            expect(after).toBeDefined();
        }
    });

    test('values match the formula and stay bounded near the asymptotes', () => {
        const branches = tangentBranches({A: 2, omega: 2, phi: Math.PI / 2, B: 1}, -7, 7);
        for (const branch of branches) {
            branch.x.forEach((x, i) => expect(branch.y[i]).toBeCloseTo(2 * Math.tan(2 * x + Math.PI / 2) + 1, 9));
            expect(Math.max(...branch.y.map(Math.abs))).toBeLessThan(2 * 101 + 1 + 1e-6);
        }
    });

    test('with A negative the branches fall, and with A = 0 they are the constant B', () => {
        for (const branch of tangentBranches({...parameters, A: -1}, -2, 2)) {
            for (let i = 1; i < branch.y.length; i++) expect(branch.y[i]).toBeLessThan(branch.y[i - 1]);
        }
        for (const branch of tangentBranches({...parameters, A: 0, B: 2}, -2, 2)) expect(branch.y.every(y => y === 2)).toBe(true);
    });

    test('a window without an asymptote is a single piece that is not cut, and a degenerate window is empty', () => {
        const single = tangentBranches(parameters, -1, 1);
        expect(single).toHaveLength(1);
        expect(single[0].x[0]).toBe(-1);
        expect(single[0].x.at(-1)).toBe(1);
        expect(tangentBranches(parameters, 1, 1)).toEqual([]);
        expect(tangentBranches({...parameters, omega: 0}, -1, 1)).toEqual([]);
    });

    test('joinPieces separates pieces with a single NaN pair so a renderer lifts the pen', () => {
        const joined = joinPieces([{x: [0, 1], y: [0, 1]}, {x: [2, 3], y: [4, 5]}]);
        expect(joined.x).toEqual([0, 1, NaN, 2, 3]);
        expect(joined.y).toEqual([0, 1, NaN, 4, 5]);
        expect(joinPieces([])).toEqual({x: [], y: []});
        const tangent = joinPieces(tangentBranches(parameters, -7, 7));
        expect(tangent.x.filter(Number.isNaN)).toHaveLength(4);
    });
});

describe('phase formatting as a multiple of pi', () => {
    test.each([
        [0, '0'], [Math.PI, 'π'], [-Math.PI, '−π'], [Math.PI / 2, 'π/2'], [-Math.PI / 2, '−π/2'], [Math.PI / 4, 'π/4'], [-Math.PI / 3, '−π/3'],
        [Math.PI / 6, 'π/6'], [5 * Math.PI / 12, '5π/12'], [Math.PI / 12, 'π/12'], [2 * Math.PI, '2π'], [4 * Math.PI / 3, '4π/3'], [8 * Math.PI, '8π'],
    ])('%p is written %s', (value, expected) => expect(phaseAsPi(value)).toBe(expected));

    test('values that are not multiples of pi/12 are not written that way', () => {
        expect(phaseAsPi(1)).toBeNull();
        expect(phaseAsPi(0.5)).toBeNull();
        expect(phaseAsPi(NaN)).toBeNull();
        expect(formatPhase(1, 'sl')).toBe('1');
        expect(formatPhase(Math.PI / 2, 'en')).toBe('π/2');
        expect(formatWithPi(Math.PI / 2, 'sl')).toBe('1,57 (π/2)');
        expect(formatWithPi(-Math.PI / 4, 'en')).toBe('−0.79 (−π/4)');
        expect(formatWithPi(Math.PI, 'sl')).toBe('3,14 (π)');
        expect(formatWithPi(0, 'sl')).toBe('0');
        expect(formatWithPi(1.5, 'sl')).toBe('1,5');
        expect(formatWithPi(NaN, 'sl')).toBe('—');
    });

    test('every slider step from -pi to pi is exact after snapping, in particular +-pi/2', () => {
        const step = Math.PI / 12;
        for (let k = 0; k <= 24; k++) {
            const raw = -Math.PI + k * step;
            const snapped = snapPhase(raw);
            expect(phaseAsPi(snapped)).not.toBeNull();
            expect(Math.abs(snapped - raw)).toBeLessThan(1e-12);
        }
        expect(snapPhase(-Math.PI + 6 * step)).toBeCloseTo(-Math.PI / 2, 14);
        expect(snapPhase(-Math.PI + 18 * step)).toBeCloseTo(Math.PI / 2, 14);
        expect(snapPhase(1)).toBe(1);
        expect(Object.is(snapPhase(-Math.PI + 12 * step), 0)).toBe(true);
    });
});

test('equation text', () => {
    expect(equationText(sine(1, 1, 0, 0), 'sl')).toBe('f(x) = sin(x)');
    expect(equationText(worked, 'sl')).toBe('f(x) = 2·sin(2x + π/2) + 1');
    expect(equationText(sine(-1, 0.5, -Math.PI / 4, -1.5), 'sl')).toBe('f(x) = −sin(0,5x − π/4) − 1,5');
    expect(equationText(sine(-1, 0.5, -Math.PI / 4, -1.5), 'en')).toBe('f(x) = −sin(0.5x − π/4) − 1.5');
    expect(equationText({fn: 'tan', A: 1, omega: 1, phi: 0, B: 0}, 'en')).toBe('f(x) = tan(x)');
    expect(equationText({fn: 'cos', A: 1.5, omega: 1, phi: 1, B: 0}, 'en')).toBe('f(x) = 1.5·cos(x + 1)');
    expect(equationText(sine(0, 1, 0, 2), 'en')).not.toMatch(/NaN|Infinity/);
});

describe('model parsing', () => {
    const valid = {fn: 'cos', A: -2, omega: 0.25, phi: -Math.PI, B: 3, reference: true};

    test('accepts a valid model and defaults a missing reference to hidden', () => {
        expect(parseTrigonometricModel(valid)).toEqual(valid);
        expect(parseTrigonometricModel({fn: 'tan', A: 3, omega: 4, phi: Math.PI, B: -3})).toEqual({fn: 'tan', A: 3, omega: 4, phi: Math.PI, B: -3, reference: false});
        expect(parseTrigonometricModel(DEFAULT_TRIGONOMETRIC_MODEL)).toEqual(DEFAULT_TRIGONOMETRIC_MODEL);
    });

    test('drops unknown properties and snaps a phase that carries rounding noise', () => {
        const parsed = parseTrigonometricModel({...valid, phi: Math.PI + 1e-12, extra: 1})!;
        expect(parsed.phi).toBeCloseTo(Math.PI, 14);
        expect('extra' in parsed).toBe(false);
    });

    test.each([
        [undefined], [null], [[]], ['x'], [{}],
        [{...valid, fn: 'sec'}], [{...valid, fn: 1}],
        [{...valid, A: 3.1}], [{...valid, A: '1'}], [{...valid, A: NaN}],
        [{...valid, omega: 0}], [{...valid, omega: -1}], [{...valid, omega: 0.2}], [{...valid, omega: 4.1}], [{...valid, omega: Infinity}],
        [{...valid, phi: 3.2}], [{...valid, phi: -3.2}], [{...valid, phi: null}],
        [{...valid, B: 3.01}], [{...valid, B: -1e9}],
        [{...valid, reference: 'yes'}],
    ])('rejects out-of-domain data %j', data => expect(parseTrigonometricModel(data)).toBeUndefined());
});
