import {activeEulerExampleId, analyseEulerLine, EULER_EXAMPLES, eulerExample} from './eulerLineModel';
import {Rational, RationalPoint} from './rational';
import {eulerLineFromCentres} from './triangle';

type Tri = Extract<ReturnType<typeof analyseEulerLine>, {kind: 'triangle'}>;
const asTriangle = (analysis: ReturnType<typeof analyseEulerLine>): Tri => {
    if (analysis.kind !== 'triangle') throw new Error('not a triangle');
    return analysis;
};
const tri = (id: Parameters<typeof eulerExample>[0]): Tri => asTriangle(analyseEulerLine(eulerExample(id).points));
const at = (x: [number, number], y: [number, number]) => new RationalPoint(Rational.of(...x), Rational.of(...y));
const same = (p: RationalPoint, q: RationalPoint) => expect(p.equals(q), `${p.x.format()},${p.y.format()} vs ${q.x.format()},${q.y.format()}`).toBe(true);

test('the default triangle has the spec values exactly', () => {
    const a = tri('default');
    same(a.h.point, at([2, 1], [2, 1]));
    same(a.g.point, at([3, 1], [5, 3]));
    same(a.o.point, at([7, 2], [3, 2]));
    same(a.h.point.sub(a.g.point), a.g.point.sub(a.o.point).scale(Rational.of(2)));
    same(a.n.point, at([11, 4], [7, 4]));
    expect(a.r2Quarter.format()).toBe('29/8');
    for (const p of a.nine.all) {
        const d = p.sub(a.n.point);
        expect(d.dot(d).format()).toBe('29/8');
    }
    same(a.nine.feet[2], at([2, 1], [0, 1]));
    same(a.nine.vertexMidpoints[2], at([2, 1], [7, 2]));
    expect(a.hg).toBeCloseTo(1.05409, 5);
    expect(a.go).toBeCloseTo(0.52705, 5);
    expect(a.nine.distinctCount).toBe(9);
    expect(a.ninePoints).toHaveLength(9);
    expect(a.ninePoints.map(p => p.kind).slice(0, 4)).toEqual(['midpoint', 'midpoint', 'midpoint', 'foot']);
    expect(a.collinear && a.ratioHolds).toBe(true);
    expect(a.line).toBeDefined();
});

test('distinct nine points: right 5, both spec isosceles triangles 8, a scalene one 9', () => {
    expect(tri('right').nine.distinctCount).toBe(5);
    expect(tri('isosceles').nine.distinctCount).toBe(8);
    expect(asTriangle(analyseEulerLine([{x: 0, y: 0}, {x: 4, y: 0}, {x: 2, y: 5}])).nine.distinctCount).toBe(8);
    expect(tri('near-equilateral').nine.distinctCount).toBe(8);
    expect(asTriangle(analyseEulerLine([{x: 0, y: 0}, {x: 8, y: 0}, {x: 3, y: 7}])).nine.distinctCount).toBe(9);
});

test('the near-equilateral example has H, O and |HO| = 1/14 exactly', () => {
    const a = tri('near-equilateral');
    same(a.h.point, at([4, 1], [16, 7]));
    same(a.o.point, at([4, 1], [33, 14]));
    expect(a.ho).toBeCloseTo(1 / 14, 12);
    expect(a.circumradius).toBeCloseTo(4.64286, 5);
    expect(a.halfCircumradius).toBeCloseTo(a.circumradius / 2, 12);
});

test('on every lattice triangle in a box O, G, H are collinear and HG^2 = 4 GO^2, exactly', () => {
    const grid: {x: number; y: number}[] = [];
    for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) grid.push({x, y});
    let checked = 0;
    for (const a of grid) for (const b of grid) for (const c of grid) {
        const analysis = analyseEulerLine([a, b, c]);
        if (analysis.kind !== 'triangle') continue;
        checked++;
        expect(analysis.collinear && analysis.ratioHolds, JSON.stringify([a, b, c])).toBe(true);
        for (const v of [analysis.hg, analysis.go, analysis.ho, analysis.circumradius]) expect(Number.isFinite(v)).toBe(true);
    }
    expect(checked).toBeGreaterThan(10000);
});

test('H = O gives no Euler line; a collinear triple is degenerate without throwing; fewer points are missing', () => {
    const p = at([1, 1], [1, 1]);
    expect(eulerLineFromCentres(p, p, p)).toBeUndefined();
    expect(analyseEulerLine(eulerExample('degenerate').points).kind).toBe('degenerate');
    expect(analyseEulerLine([{x: 2, y: 2}, {x: 2, y: 2}, {x: 2, y: 2}]).kind).toBe('degenerate');
    expect(analyseEulerLine([{x: 0, y: 0}])).toEqual({kind: 'missing', have: 1});
});

test('very large triangles stay finite', () => {
    const a = asTriangle(analyseEulerLine([{x: -33554432, y: -33554432}, {x: 33554431, y: 33554430}, {x: 33554431, y: 33554431}]));
    for (const v of [a.hg, a.go, a.ho, a.circumradius, a.halfCircumradius]) expect(Number.isFinite(v)).toBe(true);
    expect(a.collinear && a.ratioHolds).toBe(true);
});

test('the example id names the example only while the vertices still equal it', () => {
    expect(activeEulerExampleId('right', eulerExample('right').points)).toBe('right');
    expect(activeEulerExampleId('right', eulerExample('default').points)).toBeUndefined();
    expect(EULER_EXAMPLES).toHaveLength(5);
});

test.each(['right', 'default', 'isosceles'] as const)('the %s Euler example on a finer grid has the same exact points scaled to board units', id => {
    const unit = analyseEulerLine(eulerExample(id).points);
    const fine = analyseEulerLine(eulerExample(id).points.map(p => ({x: p.x * 8, y: p.y * 8})), -3);
    if (unit.kind !== 'triangle' || fine.kind !== 'triangle') throw new Error('expected a triangle');
    for (const key of ['h', 'g', 'o', 'n'] as const) {
        expect(fine[key].point.x.equals(unit[key].point.x), key).toBe(true);
        expect(fine[key].point.y.equals(unit[key].point.y), key).toBe(true);
    }
    expect(fine.r2Quarter.equals(unit.r2Quarter)).toBe(true);
    expect(fine.ninePoints.map(p => p.board)).toEqual(unit.ninePoints.map(p => p.board));
    expect([fine.hg, fine.go, fine.ho, fine.circumradius]).toEqual([unit.hg, unit.go, unit.ho, unit.circumradius]);
    expect([fine.collinear, fine.ratioHolds]).toEqual([unit.collinear, unit.ratioHolds]);
    expect(fine.line?.direction.x.equals(unit.line!.direction.x)).toBe(true);
    expect(activeEulerExampleId(id, eulerExample(id).points.map(p => ({x: p.x * 8, y: p.y * 8})), -3)).toBe(id);
});
