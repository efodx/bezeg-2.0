import {Rational} from '../../compgeo/rational';
import {doubledRationalArea} from '../../optimization/lp2';
import {DEFAULT_LP_STATE, OBJECTIVE_RANGE, type LpState} from '../../optimization/lpModel';
import {
    evaluate, exactText, integerText, isFraction, linePoly, linearText, pathPoly, regionPoly, snapInteger, solveState, typedInteger, viewBox,
} from './lpScene';

const state = (constraints: LpState['constraints'], p: number, q: number, sweep = 0): LpState => ({constraints, objective: {p, q}, sweep});
const text = (v: {x: Rational; y: Rational}) => `${exactText(v.x)};${exactText(v.y)}`;
const BOX = {xMin: -10, yMin: -10, xMax: 10, yMax: 10};
const shoelace = (x: number[], y: number[]) => x.reduce((sum, value, i) => sum + value * y[(i + 1) % x.length] - x[(i + 1) % x.length] * y[i], 0);

describe('solveState', () => {
    it('LS5 default: vertices, unique optimum 12 at (2, 3) and the walk (0,0) -> (3,0) -> (2,3)', () => {
        const solution = solveState(DEFAULT_LP_STATE);
        expect(solution.result.vertices.map(text).sort()).toEqual(['0;0', '0;4', '2;3', '3;0']);
        expect(solution.vertexInfo.map(info => exactText(info.value)).sort()).toEqual(['0', '12', '8', '9']);
        expect(solution.status).toBe('unique');
        expect(exactText(solution.value!)).toBe('12');
        expect(solution.optimal.map(text)).toEqual(['2;3']);
        expect(solution.result.walk.map(text)).toEqual(['0;0', '3;0', '2;3']);
    });

    it('an objective parallel to a side: a whole optimal edge (2, 3) - (0, 4), value 8', () => {
        const solution = solveState({...DEFAULT_LP_STATE, objective: {p: 1, q: 2}});
        expect(solution.status).toBe('segment');
        expect(exactText(solution.value!)).toBe('8');
        expect(solution.optimal.map(text).sort()).toEqual(['0;4', '2;3']);
    });

    it('degenerate vertex (3, 1): three constraints tight, 3x + 2y = 11 is the maximum', () => {
        const solution = solveState(state([{a: 1, b: 1, c: 4}, {a: 1, b: 3, c: 6}, {a: 1, b: 0, c: 3}], 3, 2));
        const at = solution.vertexInfo.find(info => text(info.point) === '3;1')!;
        expect(at.tight).toBe(3);
        expect(exactText(at.value)).toBe('11');
        expect(solution.status).toBe('unique');
        expect(exactText(solution.value!)).toBe('11');
    });

    it('fractions are exact: 2x + y <= 7 and maximize x gives 7/2 at (7/2, 0)', () => {
        const solution = solveState(state([{a: 2, b: 1, c: 7}], 1, 0));
        expect(exactText(solution.value!)).toBe('7/2');
        expect(isFraction(solution.value!)).toBe(true);
        expect(text(solution.optimal[0])).toBe('7/2;0');
        expect(solution.value!.toNumber()).toBe(3.5);
    });

    it('unbounded: the improving ray is reported and there is no optimum', () => {
        const solution = solveState(state([{a: -1, b: 1, c: 1}], 1, 1));
        expect(solution.result.region).toBe('unbounded');
        expect(solution.status).toBe('unbounded');
        expect(solution.value).toBeNull();
        expect(solution.optimal).toEqual([]);
        const ray = solution.improvingRay!;
        expect(ray.x + ray.y).toBeGreaterThan(0);
    });

    it('an unbounded region with a bounded objective that is constant along a ray: an optimal ray', () => {
        const solution = solveState(state([{a: 1, b: -1, c: 0}], 1, -1));
        expect(solution.result.region).toBe('unbounded');
        expect(solution.status).toBe('ray');
        expect(exactText(solution.value!)).toBe('0');
        expect(solution.optimal.map(text)).toEqual(['0;0']);
    });

    it('infeasible: x <= -1 with x >= 0 has no region and no vertices', () => {
        const solution = solveState(state([{a: 1, b: 0, c: -1}], 1, 1));
        expect(solution.status).toBe('infeasible');
        expect(solution.result.vertices).toEqual([]);
        expect(solution.value).toBeNull();
        expect(regionPoly(solution, BOX)).toEqual({x: [], y: []});
    });

    it('p = q = 0: every feasible point is optimal with value 0', () => {
        const solution = solveState({...DEFAULT_LP_STATE, objective: {p: 0, q: 0}});
        expect(solution.status).toBe('flat');
        expect(exactText(solution.value!)).toBe('0');
    });

    it('evaluate is the exact value of a x + b y', () => {
        const solution = solveState(state([{a: 2, b: 1, c: 7}], 1, 0));
        expect(exactText(evaluate(3, 2, solution.optimal[0]))).toBe('21/2');
    });
});

describe('texts', () => {
    it('linearText leaves out 1 and 0 and uses a true minus', () => {
        expect(linearText(1, 2)).toBe('x + 2y');
        expect(linearText(3, -1)).toBe('3x − y');
        expect(linearText(-1, 0)).toBe('−x');
        expect(linearText(0, -1)).toBe('−y');
        expect(linearText(-2, -3)).toBe('−2x − 3y');
        expect(linearText(0, 0)).toBe('0');
        expect(integerText(-30)).toBe('−30');
        expect(exactText(Rational.of(-7, 2))).toBe('−7/2');
    });
});

describe('drawing data', () => {
    it('the clipped region of the default state has the exact area 17/2', () => {
        const solution = solveState(DEFAULT_LP_STATE);
        const poly = regionPoly(solution, BOX);
        expect(poly.x[0]).toBe(poly.x[poly.x.length - 1]);
        expect(poly.y[0]).toBe(poly.y[poly.y.length - 1]);
        expect(shoelace(poly.x.slice(0, -1), poly.y.slice(0, -1)) / 2).toBeCloseTo(8.5, 12);
        // the kernel lists a bounded polygon counter-clockwise: the exact doubled area is 17
        expect(exactText(doubledRationalArea(solution.result.vertices))).toBe('17');
    });

    it('an unbounded region stays inside the box and touches its far sides', () => {
        const poly = regionPoly(solveState(state([{a: -1, b: 1, c: 1}], 1, 1)), BOX);
        expect(Math.min(...poly.x)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...poly.x)).toBe(10);
        expect(Math.max(...poly.y)).toBe(10);
    });

    it('a line is cut off by the box, and a line that misses the box is empty', () => {
        const line = linePoly(1, 1, 4, BOX);
        expect(line.x).toHaveLength(2);
        for (let i = 0; i < 2; i++) expect(line.x[i] + line.y[i]).toBeCloseTo(4, 12);
        expect(linePoly(1, 1, 40, BOX)).toEqual({x: [], y: []});
        expect(linePoly(0, 0, 1, BOX)).toEqual({x: [], y: []});
        const vertical = linePoly(1, 0, 3, BOX);
        expect(vertical.x).toEqual([3, 3]);
    });

    it('the view always shows the objective handle range and grows only with the vertices', () => {
        expect(viewBox(solveState(DEFAULT_LP_STATE))).toEqual({xMin: -10, yMin: -10, xMax: 10, yMax: 10});
        expect(viewBox(solveState({...DEFAULT_LP_STATE, objective: {p: -9, q: 9}}))).toEqual(viewBox(solveState(DEFAULT_LP_STATE)));
        expect(viewBox(solveState(state([{a: 1, b: 0, c: 30}], 1, 0))).xMax).toBe(36);
        expect(viewBox(solveState(state([{a: 1, b: 0, c: 30}], 1, 0))).yMin).toBe(-10);
    });

    it('pathPoly lists the walk in order', () => {
        const poly = pathPoly(solveState(DEFAULT_LP_STATE).result.walk);
        expect(poly).toEqual({x: [0, 3, 2], y: [0, 0, 3]});
    });
});

describe('entry of whole numbers', () => {
    it('a typed value is refused when off the grid or out of range, never rounded or clamped', () => {
        expect(typedInteger(3, OBJECTIVE_RANGE)).toBe(3);
        expect(typedInteger(-9, OBJECTIVE_RANGE)).toBe(-9);
        expect(typedInteger(2.5, OBJECTIVE_RANGE)).toBeUndefined();
        expect(typedInteger(10, OBJECTIVE_RANGE)).toBeUndefined();
        expect(typedInteger(Number.NaN, OBJECTIVE_RANGE)).toBeUndefined();
        expect(Object.is(typedInteger(-0, OBJECTIVE_RANGE), 0)).toBe(true);
    });

    it('a drag snaps to the nearest whole number inside the range', () => {
        expect(snapInteger(2.4, OBJECTIVE_RANGE)).toBe(2);
        expect(snapInteger(2.6, OBJECTIVE_RANGE)).toBe(3);
        expect(snapInteger(40, OBJECTIVE_RANGE)).toBe(9);
        expect(snapInteger(-40, OBJECTIVE_RANGE)).toBe(-9);
        expect(snapInteger(Number.NaN, OBJECTIVE_RANGE)).toBeUndefined();
    });
});
