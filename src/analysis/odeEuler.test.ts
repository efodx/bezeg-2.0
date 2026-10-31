import {
    directionField, EULER_EXAMPLE_IDS, EULER_FIELD_MAX, EULER_X_MAX, EulerExample, eulerExample, eulerPath, EulerStep, EULER_Y_BOUND,
    isEulerStep, STEP_SIZES,
} from './odeEuler';

const growth = eulerExample('exponential');
const relaxation = eulerExample('linear-relaxation');
const blowUp = eulerExample('blow-up');

/** Rounds to the number of decimals the plan shows. */
const round = (x: number, decimals: number): number => Number(x.toFixed(decimals));

const endValue = (example: EulerExample, h: EulerStep): number => {
    const nodes = eulerPath(example, 0, 1, h, 1).nodes;
    return nodes[nodes.length - 1].y;
};
const endError = (example: EulerExample, h: EulerStep): number =>
    Math.abs(example.exact(0, 1)(1) - endValue(example, h));

describe('closed example list', () => {
    test('every example has plain and undelimited LaTeX, a default point and an exact solution through it', () => {
        expect(EULER_EXAMPLE_IDS).toHaveLength(3);
        for (const id of EULER_EXAMPLE_IDS) {
            const example = eulerExample(id);
            expect(example.id).toBe(id);
            for (const text of [example.latex, example.exactLatex]) {
                expect(text).not.toMatch(/\\\(|\\\[|\$/);
                expect(text.length).toBeGreaterThan(0);
            }
            expect(example.plain.length).toBeGreaterThan(0);
            const {x, y} = example.defaultInitial;
            expect(example.exact(x, y)(x)).toBeCloseTo(y, 12);
        }
    });

    test('exact solutions satisfy their equations (difference quotient) and match the stated closed forms', () => {
        const d = 1e-6;
        for (const id of EULER_EXAMPLE_IDS) {
            const example = eulerExample(id);
            const sol = example.exact(0, 1);
            for (const x of [0.1, 0.4, 0.7]) {
                const slope = (sol(x + d) - sol(x - d)) / (2 * d);
                expect(slope).toBeCloseTo(example.F(x, sol(x)), 5);
            }
        }
        expect(growth.exact(0, 1)(1)).toBeCloseTo(Math.E, 14);
        expect(relaxation.exact(0, 1)(1)).toBeCloseTo(2 / Math.E, 14);
        expect(blowUp.exact(0, 1)(0.5)).toBeCloseTo(2, 14);
        expect(blowUp.exact(0, 1)(1)).toBeNaN();
    });

    test('exact solution passes through an arbitrary initial point', () => {
        expect(relaxation.exact(1, 3)(1)).toBeCloseTo(3, 14);
        expect(growth.exact(2, -1.5)(2)).toBeCloseTo(-1.5, 14);
    });
});

describe('step sizes', () => {
    test('exactly the five listed steps are accepted', () => {
        expect([...STEP_SIZES]).toEqual([1, 0.5, 0.25, 0.125, 0.0625]);
        for (const h of STEP_SIZES) expect(isEulerStep(h)).toBe(true);
        for (const h of [0, 0.1, 2, -0.5, 0.03125, NaN, '0.5']) expect(isEulerStep(h)).toBe(false);
        expect(() => eulerPath(growth, 0, 1, 0.1, 1)).toThrow(RangeError);
    });
});

describe('eulerPath', () => {
    test('one step with h = 0.5 equals y + h F(x, y) exactly (representable values)', () => {
        const nodes = eulerPath(growth, 0, 1, 0.5, 0.5).nodes;
        expect(nodes).toEqual([{x: 0, y: 1}, {x: 0.5, y: 1 + 0.5 * 1}]);
        expect(nodes[1].y).toBe(1.5);
        const second = eulerPath(relaxation, 0.5, 0.5, 0.5, 1).nodes[1];
        expect(second).toEqual({x: 1, y: 0.5 + 0.5 * (0.5 - 0.5)});
        const third = eulerPath(relaxation, 0, 2, 0.5, 0.5).nodes[1];
        expect(third.y).toBe(2 + 0.5 * (0 - 2));
    });

    test('y\' = y end values at x = 1 from (0, 1) and their errors and ratios', () => {
        expect([0.5, 0.25, 0.125].map(h => round(endValue(growth, h as EulerStep), 4))).toEqual([2.25, 2.4414, 2.5658]);
        const errors = [0.5, 0.25, 0.125].map(h => endError(growth, h as EulerStep));
        expect(errors.map(e => round(e, 3))).toEqual([0.468, 0.277, 0.152]);
        expect(round(errors[0] / errors[1], 2)).toBe(1.69);
        expect(round(errors[1] / errors[2], 2)).toBe(1.82);
    });

    test('y\' = x - y end values at x = 1 from (0, 1) and their errors', () => {
        expect([0.5, 0.25, 0.125].map(h => round(endValue(relaxation, h as EulerStep), 4))).toEqual([0.5, 0.6328, 0.6872]);
        expect([0.5, 0.25, 0.125].map(h => round(endError(relaxation, h as EulerStep), 4))).toEqual([0.2358, 0.1029, 0.0485]);
    });

    test('reached-end path has the expected node count and finite nodes', () => {
        const path = eulerPath(growth, 0, 1, 0.0625, 1);
        expect(path.termination).toBe('reached-end');
        expect(path.nodes).toHaveLength(17);
        expect(path.nodes[16].x).toBe(1);
    });

    test('y\' = y^2 from (0, 1) never reaches a far end: it leaves the window and every node stays bounded', () => {
        // Euler's polyline lags the exact solution, so it passes x = 1 (finite) before |y| exceeds the bound.
        for (const h of [0.5, 0.25, 0.125, 0.0625] as const) {
            const path = eulerPath(blowUp, 0, 1, h, EULER_X_MAX);
            expect(path.termination).toBe('left-window');
            for (const node of path.nodes) {
                expect(Number.isFinite(node.x) && Number.isFinite(node.y)).toBe(true);
                expect(Math.abs(node.y)).toBeLessThanOrEqual(EULER_Y_BOUND);
            }
            expect(path.nodes[path.nodes.length - 1].x).toBeLessThan(3);
        }
    });

    test('a non-finite slope ends the path without a non-finite node', () => {
        const broken: EulerExample = {...growth, F: () => Infinity};
        const path = eulerPath(broken, 0, 1, 0.5, 1);
        expect(path.termination).toBe('non-finite');
        expect(path.nodes).toEqual([{x: 0, y: 1}]);
        const nan: EulerExample = {...growth, F: () => NaN};
        expect(eulerPath(nan, 0, 1, 0.5, 1).termination).toBe('non-finite');
    });

    test('invalid arguments are rejected', () => {
        expect(() => eulerPath(growth, NaN, 1, 0.5, 1)).toThrow(RangeError);
        expect(() => eulerPath(growth, 0, Infinity, 0.5, 1)).toThrow(RangeError);
        expect(() => eulerPath(growth, 0, EULER_Y_BOUND + 1, 0.5, 1)).toThrow(RangeError);
        expect(() => eulerPath(growth, 1, 1, 0.5, 0)).toThrow(RangeError);
        expect(() => eulerPath(growth, -100, 1, 0.5, 1)).toThrow(RangeError);
    });
});

describe('directionField', () => {
    const window = {xMin: -2, xMax: 2, yMin: -1, yMax: 3};

    test('the slope at every sample point equals F(x, y), on a grid of cell centres', () => {
        for (const example of [growth, relaxation, blowUp]) {
            const field = directionField(example, window, 4, 2);
            expect(field.segments).toHaveLength(8);
            expect(field.omitted).toBe(0);
            for (const s of field.segments) expect(s.slope).toBe(example.F(s.x, s.y));
        }
        const first = directionField(relaxation, window, 4, 2).segments[0];
        expect(first).toEqual({x: -1.5, y: 0, slope: -1.5 - 0});
    });

    test('non-finite slopes are omitted and counted, never returned', () => {
        const partial: EulerExample = {...growth, F: (x) => (x < 0 ? NaN : 1 / x)};
        const field = directionField(partial, window, 4, 2);
        expect(field.segments).toHaveLength(4);
        expect(field.omitted).toBe(4);
        expect(field.segments.every(s => Number.isFinite(s.slope))).toBe(true);
    });

    test('invalid windows and grids are rejected', () => {
        expect(() => directionField(growth, {...window, xMax: -2}, 4, 2)).toThrow(RangeError);
        expect(() => directionField(growth, {...window, yMin: NaN}, 4, 2)).toThrow(RangeError);
        expect(() => directionField(growth, window, 0, 2)).toThrow(RangeError);
        expect(() => directionField(growth, window, 2.5, 2)).toThrow(RangeError);
        expect(() => directionField(growth, window, 2, EULER_FIELD_MAX + 1)).toThrow(RangeError);
    });
});
