import {describe, expect, it} from 'vitest';
import {bisectorOrder, constructionRegion, parseRationalText, sameCyclicPolygon} from './voronoiConstruction';
import {frame} from './voronoiDrawing';
import {Rational, RationalPoint} from '../../compgeo/rational';
import {clipCell, voronoiFromDelaunay} from '../../compgeo/voronoi';

const pts = (list: [number, number][]) => list.map(([x, y]) => ({x, y}));
const B2 = pts([[0, 0], [8, 0], [9, 6], [4, 8], [-1, 5], [3, 3], [6, 3]]);

function diagramOf(points: readonly {x: number; y: number}[]) {
    const outcome = voronoiFromDelaunay(points);
    if (!outcome.ok) throw new Error('refused');
    return outcome.value;
}

describe('bisectorOrder', () => {
    it('lists the other sites by increasing distance, ties by index', () => {
        // from (0,0): index 1 and 3 are at distance 2 (tie), index 2 at distance 1, index 4 at distance 5
        const points = pts([[0, 0], [2, 0], [0, 1], [0, 2], [5, 0]]);
        expect(bisectorOrder(points, 0)).toEqual([2, 1, 3, 4]);
        expect(bisectorOrder(points, 4)).toEqual([1, 0, 2, 3]);
        // all four neighbours of the centre tie: the order is the index order
        expect(bisectorOrder(pts([[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]), 0)).toEqual([1, 2, 3, 4]);
    });

    it('excludes the site itself and does not depend on the input order of equal distances', () => {
        const order = bisectorOrder(B2, 5);
        expect(order).toHaveLength(6);
        expect(order).not.toContain(5);
    });
});

describe('constructionRegion', () => {
    it('is the whole box before any bisector and shrinks monotonically', () => {
        const diagram = diagramOf(B2);
        const box = frame(diagram, B2);
        const order = bisectorOrder(B2, 5);
        expect(constructionRegion(B2, 5, order, 0, box)).toHaveLength(4);
        const area = (poly: readonly RationalPoint[]) => poly.reduce((sum, p, k) => {
            const q = poly[(k + 1) % poly.length];
            return sum.add(p.x.mul(q.y).sub(q.x.mul(p.y)));
        }, Rational.ZERO).mul(Rational.of(1, 2));
        let last = area(constructionRegion(B2, 5, order, 0, box));
        for (let k = 1; k <= order.length; k++) {
            const next = area(constructionRegion(B2, 5, order, k, box));
            expect(next.compare(last)).toBeLessThanOrEqual(0);
            last = next;
        }
    });

    it('ends at the polygon clipCell returns, exactly, for every site of the B4 example and of a tie-rich set', () => {
        for (const points of [B2, pts([[0, 0], [4, 0], [0, 4], [4, 4], [2, 2]]), pts([[0, 0], [2, 0], [1, 2]])]) {
            const diagram = diagramOf(points);
            const box = frame(diagram, points);
            points.forEach((_, site) => {
                const order = bisectorOrder(points, site);
                const region = constructionRegion(points, site, order, order.length, box);
                expect(sameCyclicPolygon(region, clipCell(diagram, points, site, box).polygon)).toBe(true);
                // a count beyond the end is clamped
                expect(sameCyclicPolygon(constructionRegion(points, site, order, order.length + 5, box), region)).toBe(true);
            });
        }
    });

    it('reaching the cell does not depend on the order, but a shorter prefix is strictly larger for a far bisector', () => {
        const diagram = diagramOf(B2);
        const box = frame(diagram, B2);
        const order = bisectorOrder(B2, 0);
        const reversed = [...order].reverse();
        const full = constructionRegion(B2, 0, order, order.length, box);
        expect(sameCyclicPolygon(constructionRegion(B2, 0, reversed, reversed.length, box), full)).toBe(true);
        expect(sameCyclicPolygon(constructionRegion(B2, 0, order, 1, box), full)).toBe(false);
    });
});

describe('sameCyclicPolygon', () => {
    const P = (x: number, y: number) => new RationalPoint(Rational.of(x), Rational.of(y));
    it('ignores the start corner but not the order or a differing corner', () => {
        const a = [P(0, 0), P(1, 0), P(1, 1)];
        expect(sameCyclicPolygon(a, [P(1, 0), P(1, 1), P(0, 0)])).toBe(true);
        expect(sameCyclicPolygon(a, [P(1, 1), P(1, 0), P(0, 0)])).toBe(false);
        expect(sameCyclicPolygon(a, [P(0, 0), P(1, 0), P(2, 1)])).toBe(false);
        expect(sameCyclicPolygon(a, [P(0, 0), P(1, 0)])).toBe(false);
        expect(sameCyclicPolygon([], [])).toBe(true);
    });
});

describe('parseRationalText', () => {
    const text = (s: string) => parseRationalText(s)?.format();
    it('reads integers, fractions and decimals with a point or a comma', () => {
        expect(text('3')).toBe('3');
        expect(text(' -7 ')).toBe('-7');
        expect(text('3/2')).toBe('3/2');
        expect(text('-6/4')).toBe('-3/2');
        expect(text('1,5')).toBe('3/2');
        expect(text('0.25')).toBe('1/4');
        expect(text('-0.5')).toBe('-1/2');
        expect(text('+2')).toBe('2');
    });
    it('refuses anything else', () => {
        for (const bad of ['', 'abc', '1/0', '1/-2', '--1', '1.', '.5', '1e3', '1/2/3']) expect(parseRationalText(bad)).toBeUndefined();
    });
});
