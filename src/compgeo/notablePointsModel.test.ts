import {
    activeExampleId, analyseNotablePoints, BOARD_COORDINATE_CAP, formatExactPoint, inBox, isNotableExampleId, NOTABLE_EXAMPLES, notableExample,
} from './notablePointsModel';

const tri = (id: Parameters<typeof notableExample>[0]) => {
    const analysis = analyseNotablePoints(notableExample(id).points);
    if (analysis.kind !== 'triangle') throw new Error('expected a triangle');
    return analysis;
};

function noNonFinite(value: unknown, path = 'value'): void {
    if (typeof value === 'number') expect(Number.isFinite(value), path).toBe(true);
    else if (value !== null && typeof value === 'object' && !('num' in value)) {
        for (const [key, inner] of Object.entries(value)) noNonFinite(inner, `${path}.${key}`);
    }
}

test('the default example matches spec T1: exact O and H, inexact I, R and r to 5 decimals', () => {
    const a = tri('default');
    expect(a.classification).toEqual({kind: 'proper', shape: 'acute'});
    expect(formatExactPoint(a.centroid.point)).toBe('(3, 5/3)');
    expect(formatExactPoint(a.circumcentre!.point)).toBe('(7/2, 3/2)');
    expect(formatExactPoint(a.orthocentre!.point)).toBe('(2, 2)');
    expect(a.area.format()).toBe('35/2');
    expect(a.circumradiusSquared!.format()).toBe('29/2');
    expect(a.circumradius!).toBeCloseTo(3.80789, 5);
    expect(a.inradius!).toBeCloseTo(1.79891, 5);
    expect(a.incentre!.x).toBeCloseTo(2.65705, 5);
    expect(a.incentre!.y).toBeCloseTo(1.79891, 5);
    expect([a.centroid.position, a.circumcentre!.position, a.orthocentre!.position]).toEqual(['inside', 'inside', 'inside']);
});

test('the obtuse and right examples report the checked positions and values', () => {
    const obtuse = tri('obtuse');
    expect(obtuse.classification).toEqual({kind: 'proper', shape: 'obtuse'});
    expect(formatExactPoint(obtuse.circumcentre!.point)).toBe('(7/2, -5/2)');
    expect(formatExactPoint(obtuse.orthocentre!.point)).toBe('(1, 6)');
    expect([obtuse.circumcentre!.position, obtuse.orthocentre!.position, obtuse.centroid.position]).toEqual(['outside', 'outside', 'inside']);
    expect(formatExactPoint(obtuse.centroid.point)).toBe('(8/3, 1/3)');
    const right = tri('right');
    expect(right.classification).toEqual({kind: 'proper', shape: 'right'});
    expect(formatExactPoint(right.circumcentre!.point)).toBe('(2, 3/2)');
    expect(right.circumcentre!.position).toBe('on');
    expect(formatExactPoint(right.orthocentre!.point)).toBe('(0, 0)');
    expect(right.circumradius).toBeCloseTo(2.5, 12);
    expect(right.inradius).toBeCloseTo(1, 12);
    expect(right.incentre!.x).toBeCloseTo(1, 12);
});

test('collinear and coincident triples are degenerate with no centre but the centroid and no non-finite number', () => {
    for (const points of [notableExample('degenerate').points, [{x: 2, y: 2}, {x: 2, y: 2}, {x: 2, y: 2}], [{x: 0, y: 0}, {x: 0, y: 0}, {x: 5, y: 1}]]) {
        const a = analyseNotablePoints(points);
        if (a.kind !== 'triangle') throw new Error('expected a triangle result');
        expect(a.classification.kind).toBe('degenerate');
        expect(a.orient).toBe(0);
        expect(a.circumcentre).toBeUndefined();
        expect(a.orthocentre).toBeUndefined();
        expect(a.incentre).toBeUndefined();
        expect(a.circumradius).toBeUndefined();
        expect(a.area.format()).toBe('0');
        expect(a.centroid.board).toBeDefined();
        noNonFinite(a);
    }
});

test('fewer than three points are missing, not an error', () => {
    expect(analyseNotablePoints([])).toEqual({kind: 'missing', have: 0});
    expect(analyseNotablePoints([{x: 1, y: 1}, {x: 2, y: 2}])).toEqual({kind: 'missing', have: 2});
});

test('a near-degenerate triangle has an exact distant circumcentre whose board point stays finite or is withheld', () => {
    const a = analyseNotablePoints([{x: -33554432, y: -33554432}, {x: 33554432, y: 33554431}, {x: 0, y: 0}]);
    if (a.kind !== 'triangle') throw new Error('expected a triangle');
    expect(a.classification.kind).toBe('proper');
    noNonFinite(a);
    const o = a.circumcentre!;
    expect(o.point.x.den > 0n).toBe(true);
    if (o.board) expect(Math.max(Math.abs(o.board.x), Math.abs(o.board.y))).toBeLessThanOrEqual(BOARD_COORDINATE_CAP);
    // This one is far beyond the cap: withheld, but the exact text still exists.
    const far = analyseNotablePoints([{x: 0, y: 0}, {x: 1000000, y: 1}, {x: 2000000, y: 3}]);
    if (far.kind !== 'triangle') throw new Error('expected a triangle');
    expect(far.circumcentre!.board).toBeUndefined();
    expect(formatExactPoint(far.circumcentre!.point)).toMatch(/^\(.*\/.*, .*\)$/);
    noNonFinite(far);
});

test('examples: ids, active example follows the vertices, and lookup of an unknown id fails', () => {
    expect(NOTABLE_EXAMPLES.map(e => e.id)).toEqual(['default', 'obtuse', 'right', 'degenerate']);
    expect(isNotableExampleId('obtuse')).toBe(true);
    expect(isNotableExampleId('nope')).toBe(false);
    expect(activeExampleId('right', notableExample('right').points)).toBe('right');
    expect(activeExampleId('right', notableExample('obtuse').points)).toBeUndefined();
    expect(activeExampleId(undefined, notableExample('right').points)).toBeUndefined();
    expect(() => notableExample('nope' as 'default')).toThrow(RangeError);
});

test('inBox decides membership in either corner order', () => {
    expect(inBox([-1, 5, 5, -1], {x: 0, y: 0})).toBe(true);
    expect(inBox([-1, 5, 5, -1], {x: 6, y: 0})).toBe(false);
    expect(inBox([5, -1, -1, 5], {x: 0, y: 0})).toBe(true);
});
