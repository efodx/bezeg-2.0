import {incircleValue} from '../../compgeo/predicates';
import {voronoiFromDelaunay} from '../../compgeo/voronoi';
import type {GridPoint} from '../../compgeo/grid';
import {fourPointReadout} from './degenerateSites';
import {DEGENERATE_EXAMPLES} from './degenerateSitesPresets';

const diagramOf = (points: readonly GridPoint[]) => {
    const outcome = voronoiFromDelaunay(points);
    return outcome.ok ? outcome.value : undefined;
};
const read = (points: readonly GridPoint[]) => fourPointReadout(points, diagramOf(points))!;
const legalPairs = (points: readonly GridPoint[]) => read(points).diagonals!.filter(d => d.legal).map(d => `${d.from}${d.to}`);

describe('exact B5 examples (derived with python -I, checked with incircleValue)', () => {
    test('unit square: D = 0, one vertex of degree 4, both diagonals legal', () => {
        const points = DEGENERATE_EXAMPLES.square.points;
        expect(incircleValue(points[0], points[1], points[2], points[3])).toBe(0n);
        const readout = read(points);
        expect(readout.determinant).toBe('0');
        expect(readout.sign).toBe('on');
        expect(readout.degrees).toEqual([4]);
        expect(readout.diagonals).toEqual([{from: 0, to: 2, legal: true}, {from: 1, to: 3, legal: true}]);
    });

    test('symmetric trapezoid: D = 0, one vertex of degree 4, both diagonals legal', () => {
        const points = DEGENERATE_EXAMPLES.trapezoid.points;
        expect(incircleValue(points[0], points[1], points[2], points[3])).toBe(0n);
        const readout = read(points);
        expect(readout.determinant).toBe('0');
        expect(readout.degrees).toEqual([4]);
        expect(legalPairs(points)).toEqual(['02', '13']);
    });

    test('near-circle quadruple: D = -30 (outside), one step on the circle: D = 0', () => {
        const near = DEGENERATE_EXAMPLES.near.points;
        expect(incircleValue(near[0], near[1], near[2], near[3])).toBe(-30n);
        const readout = read(near);
        expect(readout.determinant).toBe('-30');
        expect(readout.sign).toBe('outside');
        expect(readout.degrees).toEqual([3, 3]);
        expect(legalPairs(near)).toHaveLength(1);
        const on = [near[0], near[1], near[2], {x: 0, y: -5}];
        expect(incircleValue(on[0], on[1], on[2], on[3])).toBe(0n);
        expect(read(on).degrees).toEqual([4]);
    });

    test('the unit square with one corner one grid step off: D = 2, two degree-3 vertices, one legal diagonal; moved back, degree 4', () => {
        const off = [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 2}, {x: 0, y: 1}];
        const readout = read(off);
        expect(readout.determinant).toBe('2');
        expect(readout.sign).toBe('inside');
        expect(readout.degrees).toEqual([3, 3]);
        expect(legalPairs(off)).toEqual(['13']);
        expect(read(DEGENERATE_EXAMPLES.square.points).degrees).toEqual([4]);
    });
});

describe('the determinant is taken counter-clockwise against the fourth site', () => {
    test('a clockwise first triple gives the same value as its counter-clockwise reading', () => {
        const cw = [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: 0}];
        const readout = read(cw);
        expect(readout.circle).toEqual({a: 0, b: 2, c: 1, d: 3});
        expect(readout.determinant).toBe('0');
        const inside = [{x: 0, y: 0}, {x: 0, y: 4}, {x: 4, y: 0}, {x: 1, y: 1}];
        expect(read(inside).determinant).toBe(incircleValue(inside[0], inside[2], inside[1], inside[3]).toString());
        expect(read(inside).sign).toBe('inside');
    });

    test('collinear first three: no circle and no determinant; not convex: no diagonals', () => {
        const line = [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 1, y: 3}];
        const readout = read(line);
        expect(readout.determinant).toBeUndefined();
        expect(readout.circle).toBeUndefined();
        expect(readout.diagonals).toBeUndefined();
    });

    test('a site inside the triangle of the others: not strictly convex, no diagonals; a count other than four: no readout', () => {
        const nested = [{x: 0, y: 0}, {x: 8, y: 0}, {x: 0, y: 8}, {x: 2, y: 2}];
        expect(read(nested).diagonals).toBeUndefined();
        expect(read(nested).degrees).toEqual([3, 3, 3]);
        expect(fourPointReadout(nested.slice(0, 3), undefined)).toBeUndefined();
    });

    test('large coordinates stay exact bigint text', () => {
        const big = [{x: 0, y: 0}, {x: 2 ** 25, y: 0}, {x: 2 ** 25, y: 2 ** 25}, {x: 0, y: 2 ** 25 - 1}];
        expect(read(big).determinant).toBe(incircleValue(big[0], big[1], big[2], big[3]).toString());
    });
});
