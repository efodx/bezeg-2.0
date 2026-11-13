import {angleOfPoint, eigenHalfExtent, eigenLabelPlacements, eigenViewBox, outwardPlacement, deriveEigen, eigenSnapAngle, normalizeTestAngle, quarterGridDirection, unitVector} from './eigenScene';
import {EIGEN_PARALLEL_TOLERANCE} from '../../linear/eigen2';
import {LINEAR_MAP_EXAMPLES, type Mat2} from '../../linear/matrix2';

const E = LINEAR_MAP_EXAMPLES['eigen-default'];
const R = LINEAR_MAP_EXAMPLES['quarter-turn'];
const S = LINEAR_MAP_EXAMPLES.shear;
const C = LINEAR_MAP_EXAMPLES.singular;
const TWO_I = LINEAR_MAP_EXAMPLES['scalar-2'];
const ZERO: Mat2 = [[0, 0], [0, 0]];

describe('eigen mode scene numbers', () => {
    test('the parallel indicator of E at 44 and 44.9 degrees (spec: sine 0,0105 and 0,0010; tolerance 0,01)', () => {
        const at44 = deriveEigen(E, 44);
        const at449 = deriveEigen(E, 44.9);
        expect(Math.abs(at44.sine)).toBeCloseTo(0.0105, 4);
        expect(Math.abs(at449.sine)).toBeCloseTo(0.001, 4);
        expect(at44.approximatelyParallel).toBe(false);
        expect(at449.approximatelyParallel).toBe(true);
        expect(EIGEN_PARALLEL_TOLERANCE).toBe(0.01);
        expect(at449.exactlyParallel).toBe(false); // not a multiple of 45 degrees
    });

    test('the classes: E two lines, R none, S one, 2I every direction (no lines), C eigenvalue 0 with the kernel direction', () => {
        expect(deriveEigen(E, 0).lines).toHaveLength(2);
        expect(deriveEigen(R, 0).lines).toHaveLength(0);
        expect(deriveEigen(R, 0).classification.kind).toBe('complex');
        expect(deriveEigen(S, 0).lines).toHaveLength(1);
        expect(deriveEigen(TWO_I, 0).lines).toHaveLength(0);
        expect(deriveEigen(TWO_I, 0).classification).toMatchObject({kind: 'repeated', repeated: 'scalar', eigenvalue: 2});
        const c = deriveEigen(C, 0);
        expect(c.classification).toMatchObject({kind: 'distinct-real', eigenvalues: [2, 0]});
        expect(c.delta).toBe(0);
        const kernel = c.lines[1];
        expect(Math.abs(kernel[0] * 1 + kernel[1] * 2)).toBeLessThan(1e-12); // C (2, -1) = 0: the kernel direction is (2, -1)/sqrt 5
        expect(deriveEigen(ZERO, 0).classification).toMatchObject({repeated: 'scalar', eigenvalue: 0});
    });

    test('exactly parallel only at multiples of 45 degrees, where the quarter-grid vector passes the kernel exact test', () => {
        expect(quarterGridDirection(45)).toEqual([1, 1]);
        expect(quarterGridDirection(315)).toEqual([1, -1]);
        expect(quarterGridDirection(44.9)).toBeUndefined();
        expect(deriveEigen(E, 45).exactlyParallel).toBe(true); // det((1,1), E(1,1)) = 1*5 - 1*5 = 0
        expect(deriveEigen(E, 225).exactlyParallel).toBe(true);
        expect(deriveEigen(E, 90).exactlyParallel).toBe(false);
        expect(deriveEigen(E, 116.57).exactlyParallel).toBe(false);
        expect(deriveEigen(E, 116.57).approximatelyParallel).toBe(true);
        expect(deriveEigen(TWO_I, 0).exactlyParallel).toBe(true);
        expect(deriveEigen(TWO_I, 30).exactlyParallel).toBe(false);
        expect(deriveEigen(R, 0).exactlyParallel).toBe(false);
        expect(deriveEigen(S, 0).exactlyParallel).toBe(true); // S (1,0) = (1,0)
        expect(unitVector(90)).toEqual([0, 1]);
        expect(unitVector(270)).toEqual([0, -1]);
    });

    test('Av = 0 has no angle and counts as parallel', () => {
        const kernelAngle = normalizeTestAngle(Math.atan2(-1, 2) * 180 / Math.PI);
        const atKernel = deriveEigen(C, kernelAngle);
        expect(Math.hypot(atKernel.av[0], atKernel.av[1])).toBeLessThan(1e-3);
        expect(deriveEigen(ZERO, 10)).toMatchObject({angleBetween: undefined, approximatelyParallel: true});
    });

    test('the snap lands on 45 degrees for E from 30 and on 116,57 from 100; none for R and 2I', () => {
        expect(eigenSnapAngle(E, 30)).toBe(45);
        expect(eigenSnapAngle(E, 100)).toBe(116.57); // on the stored 0,01 grid, so a Preset round-trips
        expect(eigenSnapAngle(E, 200)).toBe(225);
        expect(eigenSnapAngle(E, 280)).toBe(296.57);
        expect(eigenSnapAngle(S, 100)).toBe(180);
        expect(deriveEigen(E, eigenSnapAngle(E, 100)!).approximatelyParallel).toBe(true);
        expect(eigenSnapAngle(R, 30)).toBeUndefined();
        expect(eigenSnapAngle(TWO_I, 30)).toBeUndefined();
        const snapped = eigenSnapAngle(E, 30)!;
        expect(deriveEigen(E, snapped).approximatelyParallel).toBe(true);
        expect(Math.abs(deriveEigen(E, snapped).sine)).toBeLessThan(1e-12);
        expect(Math.abs(deriveEigen(E, 116.57).sine)).toBeLessThan(0.0002);
    });

    test('the drag projects the pointer onto the circle: only the angle is kept', () => {
        expect(angleOfPoint(3, 4)).toBe(53.13);
        expect(angleOfPoint(0, -5)).toBe(270);
        expect(angleOfPoint(-2, -0)).toBe(180);
        expect(angleOfPoint(0, 0)).toBeUndefined();
        expect(angleOfPoint(Number.NaN, 1)).toBeUndefined();
        expect(normalizeTestAngle(-0.001)).toBe(0);
        expect(normalizeTestAngle(359.999)).toBe(0);
        expect(normalizeTestAngle(370.456)).toBe(10.46);
    });
});

describe('the eigen view and the label placements', () => {
    test('the half-extent covers the circle, both columns and sigma1 with a 20 % margin, at least 2', () => {
        expect(eigenHalfExtent(TWO_I)).toBeCloseTo(2.4, 12);
        expect(eigenHalfExtent([[1, 0], [0, 1]])).toBe(2);
        expect(eigenHalfExtent(R)).toBe(2);
        expect(eigenHalfExtent(E)).toBeGreaterThan(1.2 * Math.hypot(4, 2) - 1e-9);
        expect(eigenHalfExtent([[4, 4], [4, 4]])).toBeCloseTo(1.2 * 8, 9); // sigma1 = 8 exceeds both columns (|a| = 5.66)
    });

    test('the box is centred at the origin, with the shorter side the half-extent and the board aspect', () => {
        expect(eigenViewBox(TWO_I, 1366, 768)[1]).toBeCloseTo(2.4, 12);
        const [left, top, right, bottom] = eigenViewBox(TWO_I, 1366, 768);
        expect(left).toBeCloseTo(-right, 12);
        expect(top).toBeCloseTo(-bottom, 12);
        expect((right - left) / (top - bottom)).toBeCloseTo(1366 / 768, 12);
        const narrow = eigenViewBox(TWO_I, 390, 844);
        expect(narrow[2]).toBeCloseTo(2.4, 12);
        expect(narrow[1]).toBeCloseTo(2.4 * 844 / 390, 9);
    });

    test('the label of a tip sits beyond it, and Av steps aside from a column label', () => {
        expect(outwardPlacement([1, 0])).toBe('right');
        expect(outwardPlacement([0, -1])).toBe('below');
        expect(outwardPlacement([-1, 1])).toBe('above-left');
        expect(eigenLabelPlacements([0.7, 0.7], [2.1, 2.1], [4, 2], [1, 3])).toEqual({v: 'above-right', av: 'above-right'});
        expect(eigenLabelPlacements([0, 1], [0, 2], [2, 0], [0, 2]).av).toBe('below-right');
        expect(eigenLabelPlacements([1, 0], [2, 0], [2, 0], [0, 2]).av).toBe('above-right');
    });
});
