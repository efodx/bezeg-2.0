import {describe, expect, it} from 'vitest';
import {
    CONVEXITY_EXAMPLE_IDS,
    CONVEXITY_EXAMPLES,
    CONVEXITY_X_MAX,
    CONVEXITY_X_MIN,
    chordComparison,
    chordLineOf,
    convexityExample,
    convexityVerdict,
    inflectionPointsIn,
    isConvexityExampleId,
    secondDerivativeSignOn,
    tangentComparison,
    tangentLineAt,
} from './convexity';
import {CONVEXITY_EXAMPLE_MODELS, DEFAULT_CONVEXITY_MODEL, parseConvexityModel} from './convexityModel';

const square = convexityExample('square');
const negSquare = convexityExample('negSquare');
const cube = convexityExample('cube');
const quartic = convexityExample('quartic');

const line = (l: {slope: number; intercept: number}, x: number) => l.slope * x + l.intercept;
const grid = (a: number, b: number, n = 40) => Array.from({length: n + 1}, (_, i) => a + ((b - a) * i) / n);

describe('examples', () => {
    it('have consistent derivatives (central differences)', () => {
        const h = 1e-5;
        for (const id of CONVEXITY_EXAMPLE_IDS) {
            const e = CONVEXITY_EXAMPLES[id];
            for (const x of [-1.5, -0.4, 0.7, 1.9]) {
                expect(e.derivative(x)).toBeCloseTo((e.value(x + h) - e.value(x - h)) / (2 * h), 4);
                expect(e.secondDerivative(x)).toBeCloseTo((e.derivative(x + h) - e.derivative(x - h)) / (2 * h), 3);
            }
        }
    });

    it('guards ids', () => {
        expect(isConvexityExampleId('cube')).toBe(true);
        expect(isConvexityExampleId('abs')).toBe(false);
        expect(isConvexityExampleId(3)).toBe(false);
    });

    it('agrees with sampled f\'\'-sign on the grid for every example and interval', () => {
        const pts = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 2];
        for (const id of CONVEXITY_EXAMPLE_IDS) {
            const e = CONVEXITY_EXAMPLES[id];
            for (const a of pts) for (const b of pts) {
                if (!(a < b)) continue;
                const values = grid(a, b, 80).map(e.secondDerivative);
                const hasNeg = values.some(v => v < 0), hasPos = values.some(v => v > 0);
                const expected = hasNeg && hasPos ? 'changes' : hasNeg ? 'nonpositive' : 'nonnegative';
                expect(secondDerivativeSignOn(e, a, b)).toBe(expected);
            }
        }
    });
});

describe('verdicts', () => {
    it('x^2 convex, -x^2 concave, x^4 convex', () => {
        expect(convexityVerdict(square, -2, 2)).toEqual({kind: 'convex'});
        expect(convexityVerdict(negSquare, -2, 2)).toEqual({kind: 'concave'});
        expect(convexityVerdict(quartic, -1, 1)).toEqual({kind: 'convex'});
    });

    it('x^3 changes across 0, is convex on [0, 2] and concave on [-2, 0]', () => {
        expect(convexityVerdict(cube, -1, 1.5)).toEqual({kind: 'none', reason: 'sign-changes'});
        expect(convexityVerdict(cube, 0, 2)).toEqual({kind: 'convex'});
        expect(convexityVerdict(cube, -2, 0)).toEqual({kind: 'concave'});
        expect(convexityVerdict(cube, 0.5, 1)).toEqual({kind: 'convex'});
    });

    it('x^4 on [-1, 1]: convex, f\'\'(0) = 0, no inflection', () => {
        expect(quartic.secondDerivative(0)).toBe(0);
        expect(convexityVerdict(quartic, -1, 1)).toEqual({kind: 'convex'});
        expect(inflectionPointsIn(quartic, -1, 1)).toEqual([]);
    });

    it('x^3 has its inflection point at 0 only when 0 is interior', () => {
        expect(inflectionPointsIn(cube, -1, 1)).toEqual([0]);
        expect(inflectionPointsIn(cube, 0, 2)).toEqual([]);
        expect(inflectionPointsIn(cube, -2, 0)).toEqual([]);
        expect(inflectionPointsIn(square, -2, 2)).toEqual([]);
    });

    it('throws on invalid intervals', () => {
        expect(() => convexityVerdict(square, 1, 1)).toThrow(RangeError);
        expect(() => chordLineOf(square, 2, 1)).toThrow(RangeError);
        expect(() => tangentComparison(square, 0, 1, NaN)).toThrow(RangeError);
    });
});

describe('chord and tangent claims', () => {
    it('x^2 - chord = (x - a)(x - b) <= 0 on [a, b]', () => {
        const [a, b] = [-1, 1.5];
        const chord = chordLineOf(square, a, b);
        expect(chordComparison(square, a, b)).toEqual({kind: 'below'});
        for (const x of grid(a, b)) {
            expect(square.value(x) - line(chord, x)).toBeCloseTo((x - a) * (x - b), 12);
            expect((x - a) * (x - b)).toBeLessThanOrEqual(1e-15);
        }
    });

    it('x^2 - tangent = (x - t)^2 >= 0', () => {
        const [a, b, t] = [-1, 1.5, 0.5];
        const tangent = tangentLineAt(square, t);
        expect(tangentComparison(square, a, b, t)).toEqual({kind: 'above'});
        for (const x of grid(a, b)) {
            expect(square.value(x) - line(tangent, x)).toBeCloseTo((x - t) ** 2, 12);
        }
    });

    it('-x^2 reverses both', () => {
        const [a, b, t] = [-1, 1.5, 0.5];
        expect(chordComparison(negSquare, a, b)).toEqual({kind: 'above'});
        expect(tangentComparison(negSquare, a, b, t)).toEqual({kind: 'below'});
        const chord = chordLineOf(negSquare, a, b), tangent = tangentLineAt(negSquare, t);
        for (const x of grid(a, b)) {
            expect(negSquare.value(x) - line(chord, x)).toBeCloseTo(-(x - a) * (x - b), 12);
            expect(negSquare.value(x) - line(tangent, x)).toBeCloseTo(-((x - t) ** 2), 12);
        }
    });

    it('claimed inequalities hold on a grid for every example and interval', () => {
        const pts = [-2, -1, -0.5, 0, 0.5, 1.5, 2];
        for (const id of CONVEXITY_EXAMPLE_IDS) {
            const e = CONVEXITY_EXAMPLES[id];
            for (const a of pts) for (const b of pts) {
                if (!(a < b)) continue;
                const chord = chordLineOf(e, a, b);
                const cc = chordComparison(e, a, b);
                for (const t of pts) {
                    const tc = tangentComparison(e, a, b, t);
                    const tangent = tangentLineAt(e, t);
                    for (const x of grid(a, b)) {
                        const dc = e.value(x) - line(chord, x), dt = e.value(x) - line(tangent, x);
                        if (cc.kind === 'below') expect(dc).toBeLessThanOrEqual(1e-9);
                        if (cc.kind === 'above') expect(dc).toBeGreaterThanOrEqual(-1e-9);
                        if (tc.kind === 'above') expect(dt).toBeGreaterThanOrEqual(-1e-9);
                        if (tc.kind === 'below') expect(dt).toBeLessThanOrEqual(1e-9);
                    }
                }
            }
        }
    });

    it('makes no claim when f\'\' changes sign, naming the reason', () => {
        expect(chordComparison(cube, -1, 1)).toEqual({kind: 'none', reason: 'sign-changes'});
        expect(tangentComparison(cube, -1, 1, 0.5)).toEqual({kind: 'none', reason: 'sign-changes'});
    });

    it('makes no tangent claim when t is outside [a, b], but the chord claim stands', () => {
        expect(tangentComparison(square, 0, 1, 1.5)).toEqual({kind: 'none', reason: 'tangent-outside-interval'});
        expect(tangentComparison(square, 0, 1, -0.5)).toEqual({kind: 'none', reason: 'tangent-outside-interval'});
        expect(tangentComparison(square, 0, 1, 1)).toEqual({kind: 'above'});
        expect(chordComparison(square, 0, 1)).toEqual({kind: 'below'});
    });

    it('cube on [0, 2] is convex with a tangent claim for t in [0, 2]', () => {
        expect(chordComparison(cube, 0, 2)).toEqual({kind: 'below'});
        expect(tangentComparison(cube, 0, 2, 1)).toEqual({kind: 'above'});
    });
});

describe('model', () => {
    it('starting models are valid and match their example', () => {
        for (const id of CONVEXITY_EXAMPLE_IDS) {
            const m = CONVEXITY_EXAMPLE_MODELS[id];
            expect(m.example).toBe(id);
            expect(parseConvexityModel(m)).toEqual(m);
        }
        expect(CONVEXITY_EXAMPLE_MODELS.square).toBe(DEFAULT_CONVEXITY_MODEL);
        const c = CONVEXITY_EXAMPLE_MODELS.cube;
        expect(c.a < 0 && 0 < c.b).toBe(true);
        expect(convexityVerdict(cube, c.a, c.b).kind).toBe('none');
    });

    it('drops unknown properties', () => {
        expect(parseConvexityModel({...DEFAULT_CONVEXITY_MODEL, extra: 1})).toEqual(DEFAULT_CONVEXITY_MODEL);
    });

    it('allows t outside [a, b] but within range', () => {
        expect(parseConvexityModel({...DEFAULT_CONVEXITY_MODEL, t: -2})).toBeDefined();
    });

    it('rejects invalid data instead of clamping', () => {
        const m = DEFAULT_CONVEXITY_MODEL;
        const bad: unknown[] = [
            null, undefined, 3, 'x', [], {},
            {...m, example: 'abs'},
            {...m, a: 1, b: 1},
            {...m, a: 1.5, b: -1},
            {...m, a: CONVEXITY_X_MIN - 0.01},
            {...m, b: CONVEXITY_X_MAX + 0.01},
            {...m, t: 2.5},
            {...m, t: NaN},
            {...m, a: '0'},
            {...m, b: Infinity},
            {...m, secondDerivativeVisible: 'yes'},
            {example: m.example, a: m.a, b: m.b, t: m.t},
        ];
        for (const data of bad) expect(parseConvexityModel(data)).toBeUndefined();
    });
});
