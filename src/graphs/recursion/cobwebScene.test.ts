import {iterate} from '../../recursion/iteration';
import {affineEquation, captionPlace, cobwebPath, DRAW_LIMIT, inView, mapSamples, subscript, VIEW_BOXES} from './cobwebScene';

/** Every expected value below is worked out by hand from the definitions, not read from the code. */

describe('cobwebPath', () => {
    test('m = 0,5, c = 1, x0 = 0: the vertices are (0,0), (0,1), (1,1), (1,1.5), (1.5,1.5), (1.5,1.75), (1.75,1.75)', () => {
        const {steps} = iterate(x => 0.5 * x + 1, 0, 3);
        expect(steps.map(s => [s.from, s.to])).toEqual([[0, 1], [1, 1.5], [1.5, 1.75]]);
        const path = cobwebPath(0, steps);
        // The path starts on the diagonal, goes vertically to the map and horizontally back to the diagonal.
        expect(path.x).toEqual([0, 0, 1, 1, 1.5, 1.5, 1.75]);
        expect(path.y).toEqual([0, 1, 1, 1.5, 1.5, 1.75, 1.75]);
    });

    test('no steps: only the start point; every vertex pair after it is (from, to) then (to, to)', () => {
        expect(cobwebPath(0.3, [])).toEqual({x: [0.3], y: [0.3]});
        const {steps} = iterate(x => -2 * x, 1, 3); // 1 -> -2 -> 4 -> -8
        const path = cobwebPath(1, steps);
        expect(path.x).toEqual([1, 1, -2, -2, 4, 4, -8]);
        expect(path.y).toEqual([1, -2, -2, 4, 4, -8, -8]);
    });

    test('a step to a non-finite value or past the limit ends the path before that step', () => {
        const good = {index: 1, from: 1, to: 2};
        expect(cobwebPath(1, [good, {index: 2, from: 2, to: Infinity}])).toEqual({x: [1, 1, 2], y: [1, 2, 2]});
        expect(cobwebPath(1, [good, {index: 2, from: 2, to: NaN}])).toEqual({x: [1, 1, 2], y: [1, 2, 2]});
        expect(cobwebPath(1, [good, {index: 2, from: 2, to: -(DRAW_LIMIT + 1)}])).toEqual({x: [1, 1, 2], y: [1, 2, 2]});
        expect(cobwebPath(1, [{index: 1, from: 1, to: DRAW_LIMIT}]).x).toEqual([1, 1, DRAW_LIMIT]);
    });

    test('a start that is not finite or beyond the limit draws nothing', () => {
        expect(cobwebPath(NaN, [])).toEqual({x: [], y: []});
        expect(cobwebPath(DRAW_LIMIT * 2, [])).toEqual({x: [], y: []});
    });
});

describe('mapSamples', () => {
    test('four intervals of x squared on [0, 2]: x = 0, 0.5, 1, 1.5, 2 and y = 0, 0.25, 1, 2.25, 4', () => {
        expect(mapSamples(x => x * x, 0, 2, 4)).toEqual({x: [0, 0.5, 1, 1.5, 2], y: [0, 0.25, 1, 2.25, 4]});
    });
    test('the default has 201 samples with the end points exact', () => {
        const samples = mapSamples(Math.cos, -2, 2);
        expect(samples.x).toHaveLength(201);
        expect([samples.x[0], samples.x[200]]).toEqual([-2, 2]);
    });
});

describe('windows and view test', () => {
    test('the windows are the stated boxes', () => {
        expect(VIEW_BOXES.affine).toEqual([-10, 10, 10, -10]);
        expect(VIEW_BOXES.cosine).toEqual([-2, 2, 2, -2]);
        expect(VIEW_BOXES.logistic).toEqual([-0.1, 1.1, 1.1, -0.1]);
    });
    test('inView: the edges are inside, just beyond is outside, not finite is outside', () => {
        expect(inView('affine', 10)).toBe(true);
        expect(inView('affine', -10)).toBe(true);
        expect(inView('affine', 10.01)).toBe(false);
        expect(inView('affine', -10.01)).toBe(false);
        expect(inView('affine', -200)).toBe(false);
        expect(inView('logistic', -0.2)).toBe(false);
        expect(inView('cosine', -2.5)).toBe(false);
        expect(inView('affine', 200)).toBe(false);
        expect(inView('logistic', -0.1)).toBe(true);
        expect(inView('logistic', 1.1)).toBe(true);
        expect(inView('logistic', 1.2)).toBe(false);
        expect(inView('cosine', 2)).toBe(true);
        expect(inView('cosine', 2.5)).toBe(false);
        expect(inView('affine', NaN)).toBe(false);
        expect(inView('affine', Infinity)).toBe(false);
    });
});

describe('subscript and the equation', () => {
    test('subscript digits', () => {
        expect(subscript(0)).toBe('₀');
        expect(subscript(7)).toBe('₇');
        expect(subscript(12)).toBe('₁₂');
        expect(subscript(60)).toBe('₆₀');
        expect(subscript(-3)).toBe('₀');
    });
    test('affineEquation: sign of c from the number, zero intercept left out, format from the caller', () => {
        const comma = (v: number) => String(v).replace('.', ',');
        expect(affineEquation(0.5, 1, comma)).toBe('y = 0,5·x + 1');
        expect(affineEquation(-2, -0.5, comma)).toBe('y = -2·x − 0,5');
        expect(affineEquation(3, 0, comma)).toBe('y = 3·x');
        expect(affineEquation(0, 2, comma)).toBe('y = 0·x + 2');
    });
});

describe('captionPlace', () => {
    test('affine window (width 20, height 20): fixed places and the places beside the markers', () => {
        // map: (-10 + 0.02*20, 10 - 0.05*20); start at 0: (0.4, -1); fixed at 2: (2.4, 3); iterate at 1.5: (1.9, -0.7)
        expect(captionPlace('affine', 'map')).toEqual({x: -9.6, y: 9});
        expect(captionPlace('affine', 'start', 0)).toEqual({x: 0.4, y: -1});
        expect(captionPlace('affine', 'fixed', 2)).toEqual({x: 2.4, y: 3});
        const iterate = captionPlace('affine', 'iterate', 1.5);
        expect(iterate.x).toBeCloseTo(1.9, 12);
        expect(iterate.y).toBeCloseTo(-0.7, 12);
    });
    test('a marker outside the window gets a fixed place at the bottom, the three rows one above the other', () => {
        // x = -10 + 0.3*20 = -4; y = -10 + (0.05 + 0.06*row)*20 = -9, -7.8, -6.6
        const start = captionPlace('affine', 'start', 50);
        const fixed = captionPlace('affine', 'fixed', 200);
        const iterate = captionPlace('affine', 'iterate', -1e5);
        expect([start.x, fixed.x, iterate.x]).toEqual([-4, -4, -4]);
        expect(start.y).toBeCloseTo(-9, 12);
        expect(fixed.y).toBeCloseTo(-7.8, 12);
        expect(iterate.y).toBeCloseTo(-6.6, 12);
    });
    test('logistic window (width 1.2): the legend stands in the lower left, the diagonal caption below the diagonal', () => {
        const legend = captionPlace('logistic', 'legend');
        expect(legend.x).toBeCloseTo(-0.076, 12);
        expect(legend.y).toBeCloseTo(-0.04, 12);
        const diagonal = captionPlace('logistic', 'diagonal');
        expect(diagonal.x).toBeCloseTo(0.8, 12); // 1.1 - 0.25*1.2
        expect(diagonal.y).toBeCloseTo(0.8 - 0.072, 12); // below the diagonal at that x
    });
    test('an unreachable iterate (not finite) is placed at the bottom too', () => {
        expect(captionPlace('cosine', 'iterate', NaN).x).toBeCloseTo(-2 + 0.3 * 4, 12);
    });
});
