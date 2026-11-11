import {DEFAULT_WAVES_STATE, POINTS_PER_SECOND, type WavesState} from '../../../waves/wavesModel';
import {deriveWaves, derivedKey, frameAt, instantOf, standingCurves, type BeatFacts, type SamplingFacts, type StandingFacts, type SumFacts} from './wavesDerived';

const state = (patch: Partial<WavesState>): WavesState => ({...DEFAULT_WAVES_STATE, ...patch});
const deg = (d: number) => (d * Math.PI) / 180;
const maxOf = (values: readonly number[]) => values.reduce((m, v) => Math.max(m, v), -Infinity);

/** Independent oracle: golden-section search of the maximum of a function on [lo, hi]. */
function goldenMax(f: (t: number) => number, lo: number, hi: number): number {
    const r = (Math.sqrt(5) - 1) / 2;
    let a = lo;
    let b = hi;
    for (let i = 0; i < 80; i++) {
        const c = b - r * (b - a);
        const d = a + r * (b - a);
        if (f(c) > f(d)) b = d; else a = c;
    }
    return f((a + b) / 2);
}

const sumFacts = (s: WavesState): SumFacts => deriveWaves(s).facts as SumFacts;

describe('every continuous curve has 2048 points per second of window (ADR 0055 section 2)', () => {
    test.each([['sum', 1], ['beats', 2], ['sampling', 1]] as const)('%s: window %d s, %d x 2048 + 1 points, spacing 1/2048', (mode, seconds) => {
        const d = deriveWaves(state({mode}));
        expect(d.window).toBe(seconds);
        expect(d.xs).toHaveLength(seconds * 2048 + 1);
        expect(d.xs[0]).toBe(0);
        expect(d.xs[1]).toBe(1 / 2048);
        expect(d.xs[d.xs.length - 1]).toBe(seconds);
        expect(d.first).toHaveLength(d.xs.length);
    });

    test('the standing wave has 2048 intervals on its length 2', () => {
        const d = deriveWaves(state({mode: 'standing'}));
        expect(POINTS_PER_SECOND).toBe(2048);
        expect(d.xs).toHaveLength(2049);
        expect(d.xs[2048]).toBe(2);
        expect(d.xs[1024]).toBe(1);
    });
});

describe('superposition (WV1)', () => {
    test('equal amplitudes: 0 degrees give 2, 120 degrees give 1 (2 A cos(dphi / 2)), 60 degrees give the square root of 3', () => {
        expect(sumFacts(state({a1: 1, a2: 1, p2: 0})).phasor.amplitude).toBeCloseTo(2, 14);
        expect(sumFacts(state({a1: 1, a2: 1, p2: 120})).phasor.amplitude).toBeCloseTo(1, 14);
        expect(sumFacts(state({a1: 1, a2: 1, p2: 60})).phasor.amplitude).toBeCloseTo(Math.sqrt(3), 14);
    });

    test('A1 = 3, A2 = 2: square root of 13 at 90 degrees with phase atan(2/3), square root of 19 at 60 degrees', () => {
        const right = sumFacts(state({a1: 3, a2: 2, p2: 90})).phasor;
        expect(right.amplitude).toBeCloseTo(Math.sqrt(13), 14);
        expect(right.relativePhase).toBeCloseTo(Math.atan(2 / 3), 14);
        expect((right.relativePhase * 180) / Math.PI).toBeCloseTo(33.69, 2);
        const sixty = sumFacts(state({a1: 3, a2: 2, p2: 60})).phasor;
        expect(sixty.amplitude).toBeCloseTo(Math.sqrt(19), 14);
        expect((sixty.relativePhase * 180) / Math.PI).toBeCloseTo(23.41, 2);
    });

    test('opposite phase is declared from the inputs; the computed amplitude is a residue near 0, never exactly claimed', () => {
        const facts = sumFacts(state({a1: 1.5, a2: 1.5, p1: -90, p2: 90}));
        expect(facts.opposite).toBe(true);
        expect(facts.phasor.amplitude).toBeLessThan(1e-7);
        expect(sumFacts(state({a1: 1.5, a2: 1.5, p1: 0, p2: 175})).opposite).toBe(false);
        expect(sumFacts(state({a1: 3, a2: 2, p1: 0, p2: 180})).opposite).toBe(false);
        expect(sumFacts(state({a1: 3, a2: 2, p1: 0, p2: 180})).phasor.amplitude).toBeCloseTo(1, 14);
    });

    test('the drawn maximum agrees with the formula within the stated chord tolerance, and with the golden-section maximum at 1e-8', () => {
        for (const [a1, a2, p2, f1] of [[3, 2, 90, 1], [3, 2, 60, 40], [1, 1, 120, 7], [2.5, 0.75, -135, 23]] as const) {
            const s = state({a1, a2, p1: 0, p2, f1});
            const d = deriveWaves(s);
            const amplitude = (d.facts as SumFacts).phasor.amplitude;
            const drawn = maxOf(d.total);
            const bound = (amplitude * (Math.PI * f1 / 2048) ** 2) / 2;
            expect(drawn).toBeLessThanOrEqual(amplitude + 1e-12);
            expect(amplitude - drawn).toBeLessThanOrEqual(bound + 1e-12);
            const total = (t: number) => a1 * Math.cos(2 * Math.PI * f1 * t) + a2 * Math.cos(2 * Math.PI * f1 * t + deg(p2));
            const index = d.total.indexOf(drawn);
            const refined = goldenMax(total, d.xs[Math.max(index - 1, 0)], d.xs[Math.min(index + 1, d.xs.length - 1)]);
            expect(Math.abs(refined - amplitude)).toBeLessThan(1e-8);
        }
    });

    test('the curve and the phasor sum come from the same two components: sum = amplitude cos(2 pi f t + phase)', () => {
        const d = deriveWaves(state({a1: 3, a2: 2, p1: 30, p2: 100, f1: 5}));
        const phasor = (d.facts as SumFacts).phasor;
        d.xs.forEach((t, i) => {
            expect(d.total[i]).toBeCloseTo(phasor.amplitude * Math.cos(2 * Math.PI * 5 * t + phasor.phase), 11);
            expect(d.total[i]).toBeCloseTo(d.first[i] + d.second[i], 14);
        });
    });
});

describe('beats (WV2)', () => {
    const beats = (patch: Partial<WavesState>) => deriveWaves(state({mode: 'beats', p1: 0, p2: 0, ...patch}));

    test('10 Hz and 12 Hz: difference 2, mean 11, period 0,5 s; envelope 2 at 0 and 0,5 and 0 at 0,25', () => {
        const d = beats({f1: 10, f2: 12, a1: 1});
        const facts = d.facts as BeatFacts;
        expect([facts.beatFrequency, facts.meanFrequency, facts.beatPeriod]).toEqual([2, 11, 0.5]);
        expect(d.envelope![0]).toBe(2);
        expect(d.envelope![512]).toBeCloseTo(0, 14); // t = 0,25
        expect(d.envelope![1024]).toBeCloseTo(2, 14); // t = 0,5
        expect(d.window).toBe(2);
    });

    test('10 Hz and 11 Hz: period 1 s; equal frequencies: no beats and no period', () => {
        expect((beats({f1: 10, f2: 11}).facts as BeatFacts).beatPeriod).toBe(1);
        const none = beats({f1: 7, f2: 7}).facts as BeatFacts;
        expect([none.beatFrequency, none.beatPeriod]).toEqual([0, null]);
    });

    test('the sum is the direct addition and equals 2A cos(pi df t) cos(pi (f1 + f2) t) at 1e-12; the envelope bounds it', () => {
        const d = beats({f1: 10, f2: 12, a1: 1.75});
        d.xs.forEach((t, i) => {
            expect(d.total[i]).toBeCloseTo(1.75 * Math.cos(2 * Math.PI * 10 * t) + 1.75 * Math.cos(2 * Math.PI * 12 * t), 12);
            expect(d.total[i]).toBeCloseTo(2 * 1.75 * Math.cos(Math.PI * 2 * t) * Math.cos(Math.PI * 22 * t), 12);
            expect(Math.abs(d.total[i])).toBeLessThanOrEqual(d.envelope![i] + 1e-12);
        });
    });

    test('the envelope is 2A|cos(pi df t)| written out, not fitted to the sum', () => {
        const d = beats({f1: 4, f2: 9, a1: 0.5});
        d.xs.forEach((t, i) => expect(d.envelope![i]).toBeCloseTo(Math.abs(2 * 0.5 * Math.cos(Math.PI * 5 * t)), 14));
    });
});

describe('standing waves (WV3)', () => {
    const standing = (m: number, a1 = 1) => deriveWaves(state({mode: 'standing', halfWaves: m, a1}));

    test('m = 2: wavelength 2, nodes 0, 1, 2, antinodes 0,5 and 1,5', () => {
        const f = standing(2).facts as StandingFacts;
        expect(f.wavelength).toBe(2);
        expect(f.nodes).toEqual([0, 1, 2]);
        expect(f.antinodes).toEqual([0.5, 1.5]);
        expect(f.k).toBeCloseTo(Math.PI, 14);
        expect(f.omega).toBeCloseTo(2 * Math.PI, 14);
    });

    test('nodes at n L / m for every m: the count is m + 1 and the spacing L / m', () => {
        for (let m = 1; m <= 6; m++) {
            const f = standing(m).facts as StandingFacts;
            expect(f.nodes).toHaveLength(m + 1);
            f.nodes.forEach((x, n) => expect(x).toBeCloseTo((n * 2) / m, 14));
            expect(f.antinodes).toHaveLength(m);
            f.antinodes.forEach((x, n) => expect(x).toBeCloseTo(((n + 0.5) * 2) / m, 14));
        }
    });

    test('the directly added sum equals 2 A sin(kx) cos(wt) at 1e-12 on the grid and is zero at every node for every t', () => {
        for (const m of [1, 2, 3, 6]) {
            const d = standing(m, 2.5);
            const f = d.facts as StandingFacts;
            for (const t of [0, 0.1, 0.25, 0.37, 0.5, 0.99]) {
                const {total} = standingCurves(d, t);
                d.xs.forEach((x, i) => expect(total[i]).toBeCloseTo(2 * 2.5 * Math.sin((m * Math.PI * x) / 2) * Math.cos(2 * Math.PI * t), 12));
                for (const node of f.nodes) {
                    const at = d.xs.indexOf(node);
                    if (at >= 0) expect(Math.abs(total[at])).toBeLessThan(1e-12);
                }
            }
        }
    });

    test('at t = 1/4 the whole pattern is flat; the antinode oscillates between plus and minus 2A', () => {
        const d = standing(2, 1);
        expect(maxOf(standingCurves(d, 0.25).total.map(Math.abs))).toBeLessThan(1e-12);
        expect(standingCurves(d, 0).total[512]).toBeCloseTo(2, 12); // x = 0,5
        expect(standingCurves(d, 0.5).total[512]).toBeCloseTo(-2, 12);
    });

    test('the two travelling waves are sin(kx - wt) and sin(kx + wt), each of amplitude A', () => {
        const d = standing(3, 1.5);
        const {right, left} = standingCurves(d, 0.2);
        d.xs.forEach((x, i) => {
            expect(right[i]).toBeCloseTo(1.5 * Math.sin(1.5 * Math.PI * x - 2 * Math.PI * 0.2), 12);
            expect(left[i]).toBeCloseTo(1.5 * Math.sin(1.5 * Math.PI * x + 2 * Math.PI * 0.2), 12);
        });
    });
});

describe('sampling (WV4, WV5)', () => {
    const sampling = (patch: Partial<WavesState>) => deriveWaves(state({mode: 'sampling', a1: 1, p1: 0, ...patch}));
    const facts = (patch: Partial<WavesState>) => sampling(patch).facts as SamplingFacts;

    test.each([
        [23, 24, -1], [25, 24, 1], [9, 12, -3], [13, 24, -11], [5, 12, 5], [24, 24, 0], [40, 24, -8],
    ] as const)('f = %d, fs = %d: the alias is %d', (f1, fs, signed) => {
        const a = facts({f1, fs}).alias;
        expect(a.ambiguous).toBe(false);
        if (!a.ambiguous) expect([a.signed, a.magnitude]).toEqual([signed, Math.abs(signed)]);
    });

    test('f = 6 at fs = 12 is ambiguous and draws no alias wave', () => {
        const f = facts({f1: 6, fs: 12});
        expect(f.alias).toEqual({ambiguous: true});
        expect(f.aliasWave).toBeNull();
        expect(f.relation).toBe('at');
    });

    test('the Nyquist relation is the exact comparison of fs with 2f', () => {
        expect([facts({f1: 5, fs: 11}), facts({f1: 5, fs: 10}), facts({f1: 5, fs: 9})].map(f => f.relation)).toEqual(['above', 'at', 'below']);
        expect(facts({f1: 5, fs: 12}).samplesPerPeriod).toBeCloseTo(2.4, 14);
    });

    test('the strip is the instants n / fs for n = 0..fs and never the frame rate', () => {
        const f = facts({f1: 23, fs: 24});
        expect(f.instants).toHaveLength(25);
        f.instants.forEach((t, n) => expect(t).toBe(n / 24));
        expect(instantOf(7, 24)).toBe(7 / 24);
        expect(frameAt(0.5, 24)).toBe(12);
        expect(frameAt(0.5 - 1e-12, 24)).toBe(12); // float slack of the product
        expect(frameAt(0.49, 24)).toBe(11);
    });

    test('the samples are cos(2 pi f n / fs + phi) and the alias wave has the same samples at 1e-12', () => {
        const s = sampling({f1: 23, fs: 24, p1: 25});
        const f = s.facts as SamplingFacts;
        f.samples.forEach((value, n) => expect(value).toBeCloseTo(Math.cos((2 * Math.PI * 23 * n) / 24 + deg(25)), 12));
        f.instants.forEach((t, n) => {
            const alias = Math.cos(2 * Math.PI * -1 * t + deg(25));
            expect(Math.abs(alias - f.samples[n])).toBeLessThan(1e-12);
        });
        const index = s.xs.indexOf(0.5);
        expect(f.aliasWave![index]).toBeCloseTo(Math.cos(-Math.PI + deg(25)), 12);
    });

    test('the linear join misses a 5 Hz tone sampled at 12 Hz by 0,7183 of the amplitude at phase 0, as independently measured', () => {
        const f = facts({f1: 5, fs: 12, p1: 0});
        expect(Math.abs(f.joinError - 0.7183)).toBeLessThan(1e-4);
        let worst = 0;
        for (let i = 0; i <= 2048; i++) {
            const t = i / 2048;
            const n = Math.min(Math.floor(t * 12), 11);
            const a = Math.cos((2 * Math.PI * 5 * n) / 12);
            const b = Math.cos((2 * Math.PI * 5 * (n + 1)) / 12);
            const line = a + (b - a) * (t * 12 - n);
            worst = Math.max(worst, Math.abs(line - Math.cos(2 * Math.PI * 5 * t)));
        }
        expect(f.joinError).toBeCloseTo(worst, 12);
    });

    test('the sinc curve exists only when asked, its error falls with the extra samples and matches an independent sum', () => {
        expect(facts({f1: 5, fs: 12, showSinc: false}).sinc).toBeNull();
        const errors = [12, 48, 192].map(extra => facts({f1: 5, fs: 12, p1: 25, showSinc: true, extra}).sinc!.error);
        expect(errors[0]).toBeGreaterThan(errors[1]);
        expect(errors[1]).toBeGreaterThan(errors[2]);
        expect(errors[0]).toBeLessThan(0.05);
        expect(errors[2]).toBeLessThan(0.005);
        const d = sampling({f1: 5, fs: 12, p1: 25, showSinc: true, extra: 48});
        const t = 0.5;
        let total = 0;
        for (let n = -48; n <= 12 + 48; n++) {
            const x = 12 * t - n;
            total += Math.cos((2 * Math.PI * 5 * n) / 12 + deg(25)) * (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
        }
        expect((d.facts as SamplingFacts).sinc!.values[d.xs.indexOf(t)]).toBeCloseTo(total, 12);
    });
});

describe('the derived cache key', () => {
    test('display switches that change no number do not change the key; the sinc switch and every number do', () => {
        const base = state({mode: 'sampling'});
        const key = derivedKey(base);
        for (const patch of [{showPhasors: false}, {showEnvelope: false}, {showAlias: false}, {showJoin: true}] as const) expect(derivedKey({...base, ...patch})).toBe(key);
        for (const patch of [{showSinc: true}, {a1: 2}, {p1: 5}, {f1: 4}, {fs: 13}] as const) expect(derivedKey({...base, ...patch})).not.toBe(key);
        expect(derivedKey(state({mode: 'beats'}))).not.toBe(derivedKey(state({mode: 'sum'})));
    });
});
