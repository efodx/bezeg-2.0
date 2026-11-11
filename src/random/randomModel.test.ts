import {describe, expect, it} from 'vitest';
import {binomialMasses} from '../analysis/distributions';
import {intervalCoverage, markovDistribution, missCountLaw} from './exact';
import {
    curveCounts, DEFAULT_N, DEFAULT_RANDOM_STATE, exactFor, fairCoinBandHalfWidth, frequencySd, GENERATOR_TAG, largestBarDifference,
    markovProbabilityA, markovProbabilityCurve, markovShareSd, missCountWindow, N_MAX, nextStop, parseRandomState, percentFraction, piStandardError, playbackStops,
    RANDOM_MODES, type RandomState, serializeRandomState, simulate, snapChainInput, snapPercentInput, snapRowsInput, snapSampleSizeInput,
    snapSeedInput, snapStopInput, snapTrialsInput, snapWalkStepsInput, stopPosition, withMode,
} from './randomModel';

const S = DEFAULT_RANDOM_STATE;
const at = (state: Partial<RandomState>): RandomState => ({...S, ...state});

describe('parseRandomState', () => {
    it('round-trips every mode through a Preset (JSON) unchanged', () => {
        for (const mode of RANDOM_MODES) {
            const state = {...withMode(S, mode), seed: 7, shown: 3};
            const parsed = parseRandomState(JSON.parse(JSON.stringify(serializeRandomState(state))));
            expect(parsed).toEqual({ok: true, value: state});
        }
    });
    it('drops derived fields: tallies and curves in a Preset are never read', () => {
        const parsed = parseRandomState({...serializeRandomState(S), counts: [1, 2, 3], exact: {masses: [1]}, heads: 99, inside: 5});
        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect(Object.keys(parsed.value).sort()).toEqual(Object.keys(serializeRandomState(S)).sort());
            expect(simulate(parsed.value)).toEqual(simulate(S));
        }
    });
    it('names the field of every refusal', () => {
        const cases: Array<[string, unknown, string, string]> = [
            ['generator', 'pcg32-other', 'generator', 'generator'],
            ['mode', 'dice', 'mode', 'unknown-value'],
            ['seed', 1.5, 'seed', 'off-grid'],
            ['seed', -1, 'seed', 'out-of-range'],
            ['seed', 1000000, 'seed', 'out-of-range'],
            ['seed', NaN, 'seed', 'not-finite'],
            ['n', 0, 'n', 'out-of-range'],
            ['n', 100001, 'n', 'out-of-range'],
            ['shown', 1001, 'shown', 'out-of-range'],
            ['rows', 13, 'rows', 'out-of-range'],
            ['pPercent', 52, 'pPercent', 'off-grid'],
            ['pPercent', 0, 'pPercent', 'out-of-range'],
            ['walkSteps', 401, 'walkSteps', 'out-of-range'],
            ['markovA', 33, 'markovA', 'off-grid'],
            ['markovB', 105, 'markovB', 'out-of-range'],
            ['markovStart', 2, 'markovStart', 'out-of-range'],
            ['sampleSize', 15, 'sampleSize', 'out-of-range'],
            ['sampleSize', '36', 'sampleSize', 'not-finite'],
            ['rows', undefined, 'rows', 'missing'],
            ['areaShape', 'triangle', 'areaShape', 'unknown-value'],
            ['areaShape', undefined, 'areaShape', 'missing'],
            ['overlay', 2, 'overlay', 'out-of-range'],
            ['overlay', true, 'overlay', 'not-finite'],
            ['seed2', 1000000, 'seed2', 'out-of-range'],
            ['seed2', 1.5, 'seed2', 'off-grid'],
            ['stopMs', 99, 'stopMs', 'out-of-range'],
            ['stopMs', 2050, 'stopMs', 'out-of-range'],
            ['stopMs', 425, 'stopMs', 'off-grid'],
            ['stopMs', undefined, 'stopMs', 'missing'],
        ];
        for (const [key, value, field, reason] of cases) {
            const result = parseRandomState({...serializeRandomState(S), [key]: value});
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.field).toBe(field);
                expect(result.error.reason).toBe(reason);
                expect(result.error.message).toContain(field);
            }
        }
        expect(parseRandomState(null).ok).toBe(false);
        expect(parseRandomState([]).ok).toBe(false);
    });
    it('the generator tag is stored and an old tag refuses the whole file with an explanation', () => {
        expect(serializeRandomState(S).generator).toBe(GENERATOR_TAG);
        const result = parseRandomState({...serializeRandomState(S), generator: 'pcg32-xsh-rr-seq54-v0'});
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.message).toContain('another random generator');
    });
    it('shown above n refuses; n beyond the mode limit refuses (frequency 10000, walk 1000, interval 10000)', () => {
        expect(parseRandomState({...S, n: 100, shown: 101}).ok).toBe(false);
        expect(parseRandomState({...withMode(S, 'frequency'), n: 10001}).ok).toBe(false);
        expect(parseRandomState({...withMode(S, 'walk'), n: 1001}).ok).toBe(false);
        expect(parseRandomState({...withMode(S, 'interval'), n: 10001}).ok).toBe(false);
        expect(parseRandomState({...withMode(S, 'area'), n: 100000, shown: 100000}).ok).toBe(true);
    });
    it('does not turn -0 into a stored value', () => {
        const result = parseRandomState({...S, shown: -0});
        expect(result.ok && Object.is(result.value.shown, 0)).toBe(true);
    });
});

describe('typed input checks (refuse, never change)', () => {
    it('seed: whole numbers 0 to 999 999 only; the message names the range and no value is substituted', () => {
        expect(snapSeedInput(42)).toEqual({ok: true, value: 42});
        expect(snapSeedInput(0)).toEqual({ok: true, value: 0});
        for (const bad of [-1, 1000000, 2.5, NaN, Infinity]) {
            const result = snapSeedInput(bad);
            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.error.field).toBe('seed');
        }
        const text = snapSeedInput(-1);
        expect(!text.ok && text.error.message).toContain('999999');
    });
    it('each field has the ranges of the spec and refuses off-grid values', () => {
        expect(snapTrialsInput('walk', 1000).ok).toBe(true);
        expect(snapTrialsInput('walk', 1001).ok).toBe(false);
        expect(snapTrialsInput('galton', 100000).ok).toBe(true);
        expect(snapTrialsInput('frequency', 0).ok).toBe(false);
        expect(snapRowsInput(12).ok).toBe(true);
        expect(snapRowsInput(13).ok).toBe(false);
        expect(snapPercentInput(50).ok).toBe(true);
        expect(snapPercentInput(52).ok).toBe(false);
        expect(snapChainInput(0, 'markovA').ok).toBe(true);
        expect(snapChainInput(100, 'markovB').ok).toBe(true);
        expect(snapChainInput(101, 'markovB').ok).toBe(false);
        expect(snapWalkStepsInput(400).ok).toBe(true);
        expect(snapWalkStepsInput(0).ok).toBe(false);
        expect(snapSampleSizeInput(16).ok).toBe(true);
        expect(snapSampleSizeInput(15).ok).toBe(false);
        expect(snapSampleSizeInput(NaN).ok).toBe(false);
        expect(snapStopInput(100).ok).toBe(true);
        expect(snapStopInput(2000).ok).toBe(true);
        expect(snapStopInput(125).ok).toBe(false);
        expect(snapStopInput(50).ok).toBe(false);
        const refused = snapChainInput(33, 'markovA');
        expect(!refused.ok && refused.error.field).toBe('markovA');
    });
    it('limits and defaults are consistent', () => {
        for (const mode of RANDOM_MODES) expect(DEFAULT_N[mode]).toBeLessThanOrEqual(N_MAX[mode]);
        const next = withMode(S, 'interval');
        expect(next.n).toBe(100);
        expect(next.shown).toBe(100);
    });
});

describe('playback stops', () => {
    it('visit 0, 1, 2, 5, 10, ... and n, each once', () => {
        expect(playbackStops(1000)).toEqual([0, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]);
        expect(playbackStops(1)).toEqual([0, 1]);
        expect(playbackStops(7)).toEqual([0, 1, 2, 5, 7]);
        expect(playbackStops(100000).at(-1)).toBe(100000);
    });
    it('nextStop steps from the position and stays at n', () => {
        expect(nextStop(0, 1000)).toBe(1);
        expect(nextStop(3, 1000)).toBe(5);
        expect(nextStop(500, 1000)).toBe(1000);
        expect(nextStop(1000, 1000)).toBe(1000);
        expect(nextStop(60, 100)).toBe(100);
    });
    it('stopPosition counts stops', () => {
        expect(stopPosition(0, 1000)).toEqual({index: 0, length: 11});
        expect(stopPosition(20, 1000)).toEqual({index: 5, length: 11});
        expect(stopPosition(1000, 1000)).toEqual({index: 10, length: 11});
        expect(stopPosition(30, 1000).index).toBe(5);
    });
    it('curve counts are ascending, unique, start at 0 and end at n', () => {
        for (const n of [1, 10, 100, 10000]) {
            const counts = curveCounts(n);
            expect(counts[0]).toBe(0);
            expect(counts.at(-1)).toBe(n);
            expect(counts.every((c, i) => i === 0 || c > counts[i - 1])).toBe(true);
            expect(counts.length).toBeLessThanOrEqual(281);
        }
    });
});

describe('fair-coin band (RS2)', () => {
    /** Independent oracle: smallest |H - n/2| bound whose central mass reaches 0,95, summed from `binomialMasses`. */
    function oracle(n: number): number {
        const masses = binomialMasses(n, 0.5);
        for (let w = n % 2; w <= n; w += 2) {
            let covered = 0;
            masses.forEach((mass, k) => { if (Math.abs(2 * k - n) <= w) covered += mass; });
            if (covered >= 0.95) return w / 2;
        }
        return n / 2;
    }
    it('agrees with binomialMasses for n = 1 ... 120 and some larger n up to the limit 1000', () => {
        const ns = [...Array.from({length: 120}, (_, i) => i + 1), 250, 333, 500, 999, 1000];
        for (const n of ns) expect(fairCoinBandHalfWidth(n)).toBe(oracle(n));
    });
    it('n = 100: 95 % of fair-coin runs end within 10 heads of 50 (spec RS2, P(|h - 50| >= 10) = 0,0569)', () => {
        expect(fairCoinBandHalfWidth(100)).toBe(10);
        const masses = binomialMasses(100, 0.5);
        const tail = masses.reduce((s, m, k) => (Math.abs(k - 50) >= 10 ? s + m : s), 0);
        expect(tail).toBeCloseTo(0.0569, 4);
        const within9 = 1 - masses.reduce((s, m, k) => (Math.abs(k - 50) >= 10 ? s + m : s), 0);
        expect(within9).toBeLessThan(0.95);
    });
    it('beyond 1000 it is close to the normal width but is an exact sum (n = 10000: 98 heads)', () => {
        const w = fairCoinBandHalfWidth(10000);
        expect(w).toBeGreaterThan(95);
        expect(w).toBeLessThan(100);
        expect(Math.abs(w - 1.96 * 50)).toBeLessThan(1.5);
        expect(fairCoinBandHalfWidth(10000)).toBe(w);
    });
    it('refuses n below 1', () => {
        expect(() => fairCoinBandHalfWidth(0)).toThrow(RangeError);
    });
});

describe('spec numbers through simulate (seed 42)', () => {
    it('RS1: slot counts, largest bar difference 0,0171, exact bars sum to 1', () => {
        const sim = simulate(S);
        expect(sim.kind === 'galton' && sim.counts).toEqual([0, 12, 38, 118, 218, 229, 207, 125, 42, 11, 0]);
        const exact = exactFor(S);
        expect(exact.kind).toBe('galton');
        if (exact.kind === 'galton' && sim.kind === 'galton') {
            expect(exact.masses.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
            expect(exact.masses[5]).toBeCloseTo(252 / 1024, 12);
            expect(largestBarDifference(sim.counts, exact.masses, 1000)).toBeCloseTo(0.0171, 4);
        }
        const big = simulate({...S, n: 100000, shown: 100000});
        const exactBig = exactFor(S);
        if (big.kind === 'galton' && exactBig.kind === 'galton') expect(largestBarDifference(big.counts, exactBig.masses, 100000)).toBeCloseTo(0.0011, 4);
    });
    it('RS2: heads 1, 45, 493, 5011 after 10, 100, 1000, 10000 tosses', () => {
        const base = withMode(S, 'frequency');
        const heads = [10, 100, 1000, 10000].map(shown => {
            const sim = simulate({...base, shown});
            return sim.kind === 'frequency' ? sim.heads : -1;
        });
        expect(heads).toEqual([1, 45, 493, 5011]);
    });
    it('RS3: inside 76, 779, 7833 after 100, 1000, 10000 points; standard errors', () => {
        const base = withMode(S, 'area');
        const inside = [100, 1000, 10000].map(shown => {
            const sim = simulate({...base, shown});
            return sim.kind === 'area' ? sim.inside : -1;
        });
        expect(inside).toEqual([76, 779, 7833]);
        expect(piStandardError(100)).toBeCloseTo(0.1642, 4);
        expect(piStandardError(10000)).toBeCloseTo(0.0164, 4);
        expect(piStandardError(10000) * 10).toBeCloseTo(piStandardError(100), 12);
    });
    it('RS4: rms 10,31, 68 walks at 0, mean |S| 8,218 against the exact 7,9589 and sqrt(2n/pi)', () => {
        const state = withMode(S, 'walk');
        const sim = simulate(state);
        const exact = exactFor(state);
        expect(sim.kind).toBe('walk');
        if (sim.kind === 'walk' && exact.kind === 'walk') {
            expect(Math.sqrt(sim.sumSquares / 1000)).toBeCloseTo(10.31, 2);
            expect(sim.zeros).toBe(68);
            expect(sim.sumAbs / 1000).toBeCloseTo(8.218, 3);
            expect(exact.meanAbs).toBeCloseTo(7.9589, 4);
            expect(Math.sqrt((2 * 100) / Math.PI)).toBeCloseTo(7.9788, 4);
            expect(exact.zeroMass).toBeCloseTo(0.0796, 4);
            expect(sim.counts.reduce((a, b) => a + b, 0)).toBe(1000);
        }
    });
    it('RS4: odd steps have no zero mass', () => {
        const exact = exactFor(at({mode: 'walk', walkSteps: 7}));
        expect(exact.kind === 'walk' && exact.zeroMass).toBe(0);
    });
    it('RS5: stationary (2/3, 1/3), lambda 0,1, P(A after k) = 2/3 + (1/3) 0,1^k, share 0,6713, pi P = pi', () => {
        const state = withMode(S, 'markov');
        const exact = exactFor(state);
        expect(exact.kind).toBe('markov');
        if (exact.kind === 'markov') {
            expect(exact.stationary?.[0]).toBeCloseTo(2 / 3, 12);
            expect(exact.stationary?.[1]).toBeCloseTo(1 / 3, 12);
            expect(exact.lambda).toBeCloseTo(0.1, 12);
            const [pa, pb] = exact.stationary ?? [0, 0];
            expect(pa * (1 - exact.a) + pb * exact.b).toBeCloseTo(pa, 12);
            for (let k = 1; k <= 5; k++) expect(markovProbabilityA(state, k)).toBeCloseTo(2 / 3 + (1 / 3) * 0.1 ** k, 12);
            expect(markovShareSd(exact, 10000)).toBeCloseTo(Math.sqrt((2 / 9) * (1.1 / 0.9) / 10000), 12);
        }
        const share = (shown: number) => {
            const sim = simulate({...state, shown});
            return sim.kind === 'markov' ? sim.inA / shown : -1;
        };
        expect(share(10000)).toBeCloseTo(0.6713, 4);
        expect(share(100)).toBeCloseTo(0.71, 2);
        expect(share(1000)).toBeCloseTo(0.66, 2);
    });
    it('RS5: edge cases a + b = 0 has no unique distribution and a = b = 1 has lambda -1', () => {
        const none = exactFor(at({mode: 'markov', markovA: 0, markovB: 0}));
        expect(none.kind === 'markov' && none.stationary).toBeNull();
        expect(none.kind === 'markov' && markovShareSd(none, 100)).toBeNull();
        const period = exactFor(at({mode: 'markov', markovA: 100, markovB: 100}));
        expect(period.kind === 'markov' && period.stationary).toEqual([0.5, 0.5]);
        expect(period.kind === 'markov' && period.lambda).toBe(-1);
    });
    it('RS5: the one-pass curve equals the kernel distribution at each count; start in B reaches the same limit', () => {
        for (const markovStart of [0, 1] as const) {
            const state = at({mode: 'markov', markovStart});
            const ks = [0, 1, 2, 5, 40];
            const curve = markovProbabilityCurve(state, ks);
            ks.forEach((k, i) => expect(curve[i]).toBeCloseTo(markovDistribution(0.3, 0.6, markovStart, k)[0], 12));
            expect(curve.at(-1)).toBeCloseTo(2 / 3, 10);
        }
    });
    it('RS6: 2 misses (21, 28) at 100 intervals, 524 at 10 000, exact coverage 0,95030 (0,95083 at 16, 0,94999 at 100)', () => {
        const state = withMode(S, 'interval');
        const sim = simulate(state);
        expect(sim.kind === 'interval' && sim.misses).toBe(2);
        expect(sim.kind === 'interval' && sim.missedRuns).toEqual([21, 28]);
        const big = simulate({...state, n: 10000, shown: 10000});
        expect(big.kind === 'interval' && big.misses).toBe(524);
        expect(big.kind === 'interval' && big.missedRuns.length).toBeLessThanOrEqual(100);
        for (const [size, coverage] of [[36, 0.9503], [16, 0.95083], [100, 0.94999]]) {
            const exact = exactFor(at({mode: 'interval', sampleSize: size}));
            expect(exact.kind === 'interval' && exact.coverage).toBeCloseTo(coverage, 4);
            expect(exact.kind === 'interval' && exact.coverage + exact.miss).toBeCloseTo(1, 12);
        }
    });
});

describe('determinism and prefix', () => {
    it('same state gives the same result; another seed another heap', () => {
        expect(simulate(S)).toEqual(simulate({...S}));
        expect(simulate(at({seed: 43}))).not.toEqual(simulate(S));
    });
    it('shown 40 equals the first 40 of a longer run, and 1000 to 100 and back restores the tally (RS1 4)', () => {
        const full = simulate(at({mode: 'frequency', n: 10000, shown: 10000}));
        const part = simulate(at({mode: 'frequency', n: 10000, shown: 40}));
        if (full.kind === 'frequency' && part.kind === 'frequency') {
            const i = full.curve.at.indexOf(40);
            expect(i).toBeGreaterThanOrEqual(0);
            expect(full.curve.tally[i]).toBe(part.heads);
        }
        const before = simulate(S);
        simulate(at({shown: 40}));
        expect(simulate(S)).toEqual(before);
    });
    it('every mode runs at shown 0 without error', () => {
        for (const mode of RANDOM_MODES) expect(() => simulate({...withMode(S, mode), shown: 0})).not.toThrow();
    });
});

describe('spread helpers', () => {
    it('frequency sd of a fair coin is 0,5 / sqrt(n)', () => {
        expect(frequencySd(0.5, 100)).toBeCloseTo(0.05, 12);
    });
});

describe('new fields: second seed, speed, area shape', () => {
    it('defaults are stored and round-trip with non-default values', () => {
        expect(S).toMatchObject({areaShape: 'quarter', overlay: 0, seed2: 43, stopMs: 450});
        const state = at({areaShape: 'disc', overlay: 1, seed2: 999999, stopMs: 1500});
        expect(parseRandomState(JSON.parse(JSON.stringify(serializeRandomState(state))))).toEqual({ok: true, value: state});
    });
    it('a file from before the fields existed is refused with the missing field named', () => {
        const old: Record<string, unknown> = {...serializeRandomState(S)};
        delete old.seed2;
        const result = parseRandomState(old);
        expect(!result.ok && result.error.reason).toBe('missing');
        expect(!result.ok && result.error.field).toBe('seed2');
    });
});

describe('exact law of the misses (RS6)', () => {
    it('3 runs, miss 1/4: the four masses are 27/64, 27/64, 9/64, 1/64 (hand-computed)', () => {
        const law = missCountWindow(3, 0.25);
        expect(law.first).toBe(0);
        law.masses.forEach((m, i) => expect(m).toBeCloseTo([27, 27, 9, 1][i] / 64, 12));
    });
    it('up to 1000 runs it equals missCountLaw with the miss chance 1 - coverage (spec numbers: 100 runs, P(<=2) = 0,1208)', () => {
        const miss = 1 - intervalCoverage(99, 36, 1.96);
        const window = missCountWindow(100, miss);
        const kernel = missCountLaw(100, miss);
        window.masses.forEach((m, i) => expect(Math.abs(m - kernel[window.first + i])).toBeLessThan(1e-12));
        const atMostTwo = window.masses.slice(0, 3).reduce((a, b) => a + b, 0);
        expect(atMostTwo).toBeCloseTo(0.1208, 4);
    });
    it('beyond 1000 runs the window holds the mass, peaks at the mean and agrees with the normal estimate of the peak height', () => {
        const miss = 0.0497;
        const runs = 10000;
        const law = missCountWindow(runs, miss, 524);
        expect(law.masses.reduce((a, b) => a + b, 0)).toBeGreaterThan(1 - 1e-5);
        const mode = law.first + law.masses.indexOf(Math.max(...law.masses));
        expect(Math.abs(mode - runs * miss)).toBeLessThanOrEqual(1);
        const sd = Math.sqrt(runs * miss * (1 - miss));
        expect(Math.max(...law.masses)).toBeGreaterThan(0.99 / (sd * Math.sqrt(2 * Math.PI)) * 0.98);
        expect(Math.max(...law.masses)).toBeLessThan(1.01 / (sd * Math.sqrt(2 * Math.PI)));
    });
    it('the window is widened to hold an observed count outside it', () => {
        const law = missCountWindow(1000, 0.05, 200);
        expect(law.first + law.masses.length - 1).toBe(200);
        const low = missCountWindow(1000, 0.05, 0);
        expect(low.first).toBe(0);
    });
    it('small runs show every count; a bad chance or run count throws', () => {
        expect(missCountWindow(40, 0.05).masses).toHaveLength(41);
        expect(() => missCountWindow(0, 0.05)).toThrow();
        expect(() => missCountWindow(10, 0)).toThrow();
    });
});

describe('transition fractions (Markov box diagram)', () => {
    it('lowest terms by hand: 30 percent is 3/10, 70 is 7/10, 50 is 1/2, 25 is 1/4, 0 is 0/1, 100 is 1/1', () => {
        expect(percentFraction(30)).toEqual({num: 3, den: 10});
        expect(percentFraction(70)).toEqual({num: 7, den: 10});
        expect(percentFraction(50)).toEqual({num: 1, den: 2});
        expect(percentFraction(25)).toEqual({num: 1, den: 4});
        expect(percentFraction(0)).toEqual({num: 0, den: 1});
        expect(percentFraction(100)).toEqual({num: 1, den: 1});
    });
    it('every grid percentage keeps its value', () => {
        for (let percent = 0; percent <= 100; percent += 5) {
            const {num, den} = percentFraction(percent);
            expect(num * 100).toBe(percent * den);
        }
        expect(() => percentFraction(33.5)).toThrow();
    });
});
