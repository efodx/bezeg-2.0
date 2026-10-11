import {
    AREA_MODES, antiderivativeDifference, antiderivativeF, antiderivativeG, areaFill, BOUND_MAX, BOUND_MIN, difference, f, g, INTERSECTION_HEIGHT,
    INTERSECTIONS, integralF, integralG, isAreaMode, isBound, shadedQuantity, signedBetween, topCurve, unsignedBetween, ZEROS_OF_G,
} from './areaBetween';
import {DEFAULT_AREA_BETWEEN_MODEL, parseAreaBetweenModel} from './areaBetweenModel';

const S = Math.sqrt(1.5);

/** Composite Simpson rule, an independent check of the exact integrals. */
function simpson(fn: (x: number) => number, a: number, b: number, n = 2000): number {
    const h = (b - a) / n;
    let sum = fn(a) + fn(b);
    for (let i = 1; i < n; i++) sum += fn(a + i * h) * (i % 2 === 0 ? 2 : 4);
    return sum * h / 3;
}

describe('the two curves and their intersections', () => {
    test('f = (x-2)^2, g = 3-(x-2)^2 and g-f = 3-2(x-2)^2', () => {
        expect([f(2), f(0), f(4), f(3)]).toEqual([0, 4, 4, 1]);
        expect([g(2), g(0), g(4), g(3)]).toEqual([3, -1, -1, 2]);
        for (const x of [-1, 0, 0.5, 2, 3.7, 5]) expect(difference(x)).toBeCloseTo(3 - 2 * (x - 2) ** 2, 12);
    });

    test('they meet at 2 -+ sqrt(1.5) = 0.775255..., 3.224745... at height 1.5', () => {
        expect(INTERSECTIONS[0]).toBeCloseTo(0.7752551286084111, 12);
        expect(INTERSECTIONS[1]).toBeCloseTo(3.224744871391589, 12);
        for (const x of INTERSECTIONS) {
            expect(f(x)).toBeCloseTo(INTERSECTION_HEIGHT, 12);
            expect(g(x)).toBeCloseTo(INTERSECTION_HEIGHT, 12);
            expect(difference(x)).toBeCloseTo(0, 12);
        }
        expect(INTERSECTIONS[0] + INTERSECTIONS[1]).toBeCloseTo(4, 14);
        expect((INTERSECTIONS[0] - 2) ** 2).toBeCloseTo(1.5, 12);
    });

    test('g is zero at 2 -+ sqrt(3); f never changes sign', () => {
        for (const x of ZEROS_OF_G) expect(g(x)).toBeCloseTo(0, 12);
        expect(f(2)).toBe(0);
        expect([1.9, 2.1, -1, 5].every(x => f(x) > 0)).toBe(true);
    });

    test('which curve is on top', () => {
        expect([topCurve(2), topCurve(1), topCurve(0), topCurve(4), topCurve(3.5), topCurve(-1)]).toEqual(['g', 'g', 'f', 'f', 'f', 'f']);
        expect(topCurve(1.5)).toBe('g');
        expect(topCurve(0.7)).toBe('f');
        expect(topCurve(0.8)).toBe('g');
        expect(topCurve(3.2)).toBe('g');
        expect(topCurve(3.3)).toBe('f');
    });
});

describe('exact integrals', () => {
    test('between the intersections the area is 4*sqrt(1.5) = 2*sqrt(6) = 4.898979... (lesson)', () => {
        const [a, b] = INTERSECTIONS;
        expect(signedBetween(a, b)).toBeCloseTo(4 * S, 12);
        expect(unsignedBetween(a, b)).toBeCloseTo(4 * S, 12);
        expect(4 * S).toBeCloseTo(2 * Math.sqrt(6), 12);
        expect(4 * S).toBeCloseTo(4.898979485566356, 12);
        // 6*sqrt(1.5) - (4/3)*1.5^(3/2) = 6s - 2s, the calculation of the lesson
        expect(6 * S - (4 / 3) * Math.pow(1.5, 1.5)).toBeCloseTo(4 * S, 12);
        expect(Math.pow(1.5, 1.5)).toBeCloseTo(1.5 * S, 14);
        // with u = x - 2 from -s to s: integral of 3 - 2u^2 = 6s - (4/3)s^3
        expect(simpson(difference, a, b)).toBeCloseTo(4 * S, 9);
    });

    test('on [0, 4] the signed integral is 4/3 but the unsigned area is 2*sqrt(6) + 2*(2*sqrt(1.5) - 2/3) = 8.4646... (lesson)', () => {
        expect(signedBetween(0, 4)).toBeCloseTo(4 / 3, 12);
        expect(unsignedBetween(0, 4)).toBeCloseTo(2 * Math.sqrt(6) + 2 * (2 * S - 2 / 3), 12);
        expect(unsignedBetween(0, 4)).toBeCloseTo(8.464626, 6);
        expect(Math.round(unsignedBetween(0, 4) * 1e4) / 1e4).toBe(8.4646);
        // the piece [0, 2-s] where f is on top: the integral of g - f is 2/3 - 2s < 0
        expect(signedBetween(0, INTERSECTIONS[0])).toBeCloseTo(2 / 3 - 2 * S, 12);
        expect(signedBetween(INTERSECTIONS[1], 4)).toBeCloseTo(2 / 3 - 2 * S, 12);
        expect(2 * S - 2 / 3).toBeCloseTo(1.7828, 4);
        // independent numeric integral of |g - f|
        expect(simpson(x => Math.abs(difference(x)), 0, INTERSECTIONS[0], 400) + simpson(x => Math.abs(difference(x)), INTERSECTIONS[0], INTERSECTIONS[1], 400)
            + simpson(x => Math.abs(difference(x)), INTERSECTIONS[1], 4, 400)).toBeCloseTo(unsignedBetween(0, 4), 9);
        expect(unsignedBetween(0, 4)).toBeGreaterThan(signedBetween(0, 4));
    });

    test('the integrals of f and g on [0, 4]: 16/3 and 20/3, and their difference is the signed area', () => {
        expect(integralF(0, 4)).toBeCloseTo(16 / 3, 12);
        expect(integralG(0, 4)).toBeCloseTo(20 / 3, 12);
        expect(12 - integralF(0, 4)).toBeCloseTo(integralG(0, 4), 12);
        expect(integralG(0, 4) - integralF(0, 4)).toBeCloseTo(signedBetween(0, 4), 12);
        expect(integralG(0, 4) - integralF(0, 4)).toBeCloseTo(4 / 3, 12);
    });

    test('the integrals of f and g between the intersections', () => {
        const [a, b] = INTERSECTIONS;
        // integral of u^2 from -s to s = 2 s^3 / 3 = s (since s^2 = 1.5)
        expect(integralF(a, b)).toBeCloseTo(S, 12);
        expect(integralG(a, b)).toBeCloseTo(3 * 2 * S - S, 12);
        expect(integralG(a, b) - integralF(a, b)).toBeCloseTo(4 * S, 12);
        expect(integralF(a, b)).toBeCloseTo(simpson(f, a, b), 9);
        expect(integralG(a, b)).toBeCloseTo(simpson(g, a, b), 9);
    });

    test('antiderivatives have the right derivatives', () => {
        const step = 1e-6;
        for (const x of [-1, 0.3, 2, 3.9, 5]) {
            expect((antiderivativeF(x + step) - antiderivativeF(x - step)) / (2 * step)).toBeCloseTo(f(x), 5);
            expect((antiderivativeG(x + step) - antiderivativeG(x - step)) / (2 * step)).toBeCloseTo(g(x), 5);
            expect((antiderivativeDifference(x + step) - antiderivativeDifference(x - step)) / (2 * step)).toBeCloseTo(difference(x), 5);
            expect(antiderivativeDifference(x)).toBeCloseTo(antiderivativeG(x) - antiderivativeF(x), 12);
        }
    });

    test.each([[-1, 5], [0, 4], [0.3, 1.1], [1, 3], [3.5, 5], [-1, 0.5], [2, 2.1], [0.7, 3.3]])('exact values agree with a numeric integral on [%p, %p]', (a, b) => {
        expect(integralF(a, b)).toBeCloseTo(simpson(f, a, b), 8);
        expect(integralG(a, b)).toBeCloseTo(simpson(g, a, b), 8);
        expect(signedBetween(a, b)).toBeCloseTo(simpson(difference, a, b), 8);
        const pieces = [a, ...INTERSECTIONS.filter(x => x > a && x < b), b];
        let numeric = 0;
        for (let i = 0; i + 1 < pieces.length; i++) numeric += Math.abs(simpson(difference, pieces[i], pieces[i + 1], 400));
        expect(unsignedBetween(a, b)).toBeCloseTo(numeric, 8);
    });
});

describe('orientation, empty intervals and bounds', () => {
    test('swapping the bounds flips every signed value and keeps the area', () => {
        for (const [a, b] of [[0, 4], [0.3, 1.1], [-1, 5], [INTERSECTIONS[0], INTERSECTIONS[1]]]) {
            expect(integralF(b, a)).toBeCloseTo(-integralF(a, b), 12);
            expect(integralG(b, a)).toBeCloseTo(-integralG(a, b), 12);
            expect(signedBetween(b, a)).toBeCloseTo(-signedBetween(a, b), 12);
            expect(unsignedBetween(b, a)).toBeCloseTo(unsignedBetween(a, b), 12);
            expect(unsignedBetween(a, b)).toBeGreaterThanOrEqual(0);
        }
    });

    test('a = b gives exactly 0 everywhere, never -0', () => {
        for (const a of [-1, 0, INTERSECTIONS[0], 2, 5]) {
            for (const value of [integralF(a, a), integralG(a, a), signedBetween(a, a), unsignedBetween(a, a)]) expect(Object.is(value, 0)).toBe(true);
        }
    });

    test('a single piece away from the intersections: f on top gives a negative signed value and a positive area', () => {
        expect(signedBetween(0, 0.5)).toBeLessThan(0);
        expect(unsignedBetween(0, 0.5)).toBeCloseTo(-signedBetween(0, 0.5), 12);
        expect(signedBetween(1, 3)).toBeGreaterThan(0);
        expect(unsignedBetween(1, 3)).toBeCloseTo(signedBetween(1, 3), 12);
    });

    test('the bound domain is [-1, 5] and contains the intersections and 0 and 4', () => {
        expect([BOUND_MIN, BOUND_MAX]).toEqual([-1, 5]);
        expect([-1, 0, 4, 5, INTERSECTIONS[0], INTERSECTIONS[1]].every(isBound)).toBe(true);
        expect([-1.01, 5.01, NaN, Infinity, '1', null, undefined].some(isBound)).toBe(false);
    });
});

describe('shaded quantity per mode', () => {
    test('under-f is the integral of f, under-g the integral of g, between the unsigned area', () => {
        expect(shadedQuantity('under-f', 0, 4)).toBeCloseTo(16 / 3, 12);
        expect(shadedQuantity('under-g', 0, 4)).toBeCloseTo(20 / 3, 12);
        expect(shadedQuantity('between', 0, 4)).toBeCloseTo(unsignedBetween(0, 4), 12);
        expect(shadedQuantity('between', ...INTERSECTIONS)).toBeCloseTo(2 * Math.sqrt(6), 12);
    });

    test('mode names', () => {
        expect(AREA_MODES).toEqual(['under-f', 'under-g', 'between']);
        expect(AREA_MODES.every(isAreaMode)).toBe(true);
        expect(['under', 'f', 'Between', '', null, 1, undefined].some(isAreaMode)).toBe(false);
    });
});

/** Polygons of a point list: groups separated by NaN. */
const polygons = (xs: number[], ys: number[]) => {
    const result: [number, number][][] = [[]];
    xs.forEach((x, i) => {
        if (Number.isNaN(x)) result.push([]);
        else result[result.length - 1].push([x, ys[i]]);
    });
    return result.filter(polygon => polygon.length > 0);
};
/** Shoelace area of a closed polygon. */
const shoelace = (polygon: [number, number][]) => {
    let sum = 0;
    for (let i = 0; i + 1 < polygon.length; i++) sum += polygon[i][0] * polygon[i + 1][1] - polygon[i + 1][0] * polygon[i][1];
    return Math.abs(sum) / 2;
};
const totalArea = (data: { x: number[]; y: number[] }) => polygons(data.x, data.y).reduce((sum, polygon) => sum + shoelace(polygon), 0);

describe('the shading', () => {
    test('between the intersections only the positive (g on top) fill exists and its area is the exact one', () => {
        const fill = areaFill('between', INTERSECTIONS[0], INTERSECTIONS[1]);
        expect(fill.negative).toEqual({x: [], y: []});
        expect(polygons(fill.positive.x, fill.positive.y)).toHaveLength(1);
        // the polygon is a polyline of a parabola: its area is within 1e-4 of the exact value
        expect(totalArea(fill.positive)).toBeCloseTo(4 * S, 2);
    });

    test('on [0, 4] there are three pieces: f on top at both ends (negative fill), g on top in the middle (positive fill)', () => {
        const fill = areaFill('between', 0, 4);
        expect(polygons(fill.positive.x, fill.positive.y)).toHaveLength(1);
        expect(polygons(fill.negative.x, fill.negative.y)).toHaveLength(2);
        expect(totalArea(fill.positive)).toBeCloseTo(4 * S, 2);
        expect(totalArea(fill.negative)).toBeCloseTo(2 * (2 * S - 2 / 3), 2);
        expect(totalArea(fill.positive) + totalArea(fill.negative)).toBeCloseTo(unsignedBetween(0, 4), 2);
        expect(totalArea(fill.positive) - totalArea(fill.negative)).toBeCloseTo(signedBetween(0, 4), 2);
        // the pieces are cut exactly at the intersections
        const xs = polygons(fill.positive.x, fill.positive.y)[0].map(point => point[0]);
        expect(Math.min(...xs)).toBe(INTERSECTIONS[0]);
        expect(Math.max(...xs)).toBe(INTERSECTIONS[1]);
        // positive pieces lie between f below and g above
        for (const [x, y] of polygons(fill.positive.x, fill.positive.y)[0]) {
            expect(y).toBeGreaterThanOrEqual(f(x) - 1e-9);
            expect(y).toBeLessThanOrEqual(g(x) + 1e-9);
        }
    });

    test('under-f shades f down to the axis: one positive polygon, area = integral of f; under-g splits at the zeros of g', () => {
        const underF = areaFill('under-f', 0, 4);
        expect(polygons(underF.positive.x, underF.positive.y)).toHaveLength(1);
        expect(underF.negative.x).toEqual([]);
        expect(totalArea(underF.positive)).toBeCloseTo(16 / 3, 2);
        const underG = areaFill('under-g', 0, 4);
        expect(polygons(underG.positive.x, underG.positive.y)).toHaveLength(1);
        expect(polygons(underG.negative.x, underG.negative.y)).toHaveLength(2);
        expect(totalArea(underG.positive) - totalArea(underG.negative)).toBeCloseTo(20 / 3, 2);
        expect(underG.negative.y.filter(y => !Number.isNaN(y)).every(y => y <= 1e-12)).toBe(true);
        expect(underG.positive.y.filter(y => !Number.isNaN(y)).every(y => y >= -1e-12)).toBe(true);
    });

    test('the drawing does not depend on the order of the bounds, and a = b draws nothing', () => {
        for (const mode of AREA_MODES) {
            expect(areaFill(mode, 4, 0)).toEqual(areaFill(mode, 0, 4));
            expect(areaFill(mode, 1, 1)).toEqual({positive: {x: [], y: []}, negative: {x: [], y: []}});
        }
    });

    test('polygons are closed and no coordinate is non-finite except the NaN separators', () => {
        for (const mode of AREA_MODES) for (const [a, b] of [[-1, 5], [0, 4], [0.3, 0.31], [INTERSECTIONS[0], INTERSECTIONS[1]]]) {
            const fill = areaFill(mode, a, b);
            for (const part of [fill.positive, fill.negative]) {
                expect(part.x).toHaveLength(part.y.length);
                part.x.forEach((x, i) => expect(Number.isNaN(x)).toBe(Number.isNaN(part.y[i])));
                for (const polygon of polygons(part.x, part.y)) {
                    expect(polygon[0]).toEqual(polygon[polygon.length - 1]);
                    polygon.forEach(point => point.forEach(value => expect(Number.isFinite(value)).toBe(true)));
                }
            }
        }
    });

    test('a tiny interval still draws a valid piece', () => {
        const fill = areaFill('between', 2, 2.01);
        expect(polygons(fill.positive.x, fill.positive.y)).toHaveLength(1);
    });
});

describe('the model', () => {
    test('the default model uses the unrounded intersections and the between mode', () => {
        expect(DEFAULT_AREA_BETWEEN_MODEL).toEqual({a: 2 - Math.sqrt(1.5), b: 2 + Math.sqrt(1.5), mode: 'between'});
        expect(DEFAULT_AREA_BETWEEN_MODEL.a).toBe(INTERSECTIONS[0]);
        expect(Math.round(DEFAULT_AREA_BETWEEN_MODEL.a * 100) / 100).toBe(0.78);
        expect(Math.round(DEFAULT_AREA_BETWEEN_MODEL.b * 100) / 100).toBe(3.22);
    });

    test('parse keeps valid data, drops unknown properties and rejects the rest', () => {
        expect(parseAreaBetweenModel({a: 0, b: 4, mode: 'under-g', extra: 1})).toEqual({a: 0, b: 4, mode: 'under-g'});
        expect(parseAreaBetweenModel({a: 4, b: -1, mode: 'under-f'})).toEqual({a: 4, b: -1, mode: 'under-f'});
        const good = {a: 0, b: 4, mode: 'between'};
        for (const bad of [undefined, null, 'x', [], {}, {...good, a: 5.01}, {...good, b: -1.01}, {...good, a: '0'}, {...good, b: NaN}, {...good, mode: 'under'}, {a: 0, b: 4}]) {
            expect(parseAreaBetweenModel(bad)).toBeUndefined();
        }
    });
});
