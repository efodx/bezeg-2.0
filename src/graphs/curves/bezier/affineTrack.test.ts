import {PointImpl} from '../../../bezeg/impl/point/point-impl';
import {PolynomialBezierCurve} from '../../../bezeg/impl/curve/polynomial-bezier-curve';
import {
    type Affine, type AffineOperation, IDENTITY, affineOfOperation, applyAffine, bezierPoint, boxCentreOf, composeAffine,
    departsFromTrack, mappedReferencePoint, meanOf, type Pt,
} from './affineTrack';

const lessonPoints: Pt[] = [[1, 0], [2, 3], [4, 2], [5, -1]];
const makeCurve = (points: readonly Pt[]) => new PolynomialBezierCurve(points.map(([x, y]) => new PointImpl(x, y)));
const pointsOf = (curve: PolynomialBezierCurve): Pt[] => curve.getPoints().map(p => [p.X(), p.Y()] as Pt);

/** Applies `op` to the curve with the curve's own gesture and composes the map the way the graph does. */
function step(curve: PolynomialBezierCurve, map: Affine, op: AffineOperation): Affine {
    const points = pointsOf(curve);
    const next = composeAffine(affineOfOperation(op, {mean: meanOf(points), box: boxCentreOf(points)}), map);
    if (op.kind === 'move') curve.moveFor(op.x, op.y);
    else if (op.kind === 'scale') curve.scale(op.factor);
    else if (op.kind === 'rotate') curve.rotate(op.theta);
    else curve.flip(op.x, op.y);
    return next;
}

const lessonScene: AffineOperation[] = [
    {kind: 'move', x: -2, y: 0}, {kind: 'move', x: 0, y: -1}, {kind: 'rotate', theta: Math.PI / 2}, {kind: 'scale', factor: 2},
];
const otherScene: AffineOperation[] = [
    {kind: 'rotate', theta: -0.1 * Math.PI}, {kind: 'flip', x: true, y: false}, {kind: 'scale', factor: 0.8}, {kind: 'move', x: 0.5, y: 0},
    {kind: 'rotate', theta: 0.1 * Math.PI}, {kind: 'flip', x: false, y: true}, {kind: 'scale', factor: 1.2},
];

function run(points: readonly Pt[], ops: readonly AffineOperation[]) {
    const curve = makeCurve(points);
    let map: Affine = IDENTITY;
    for (const op of ops) map = step(curve, map, op);
    return {curve, map};
}

test('the composed map of the lesson scene sends two control points to their hand-computed images', () => {
    const {map, curve} = run(lessonPoints, lessonScene);
    // (1,0) -> (-1,-1) -> turn about (1,0): (2,-2) -> scale 2 about (1,0): (3,-4); (5,-1) -> (3,-2) -> (3,2) -> (5,4).
    const first = applyAffine(map, lessonPoints[0]);
    const last = applyAffine(map, lessonPoints[3]);
    expect(first[0]).toBeCloseTo(3, 9);
    expect(first[1]).toBeCloseTo(-4, 9);
    expect(last[0]).toBeCloseTo(5, 9);
    expect(last[1]).toBeCloseTo(4, 9);
    const moved = pointsOf(curve);
    expect(moved[0][0]).toBeCloseTo(3, 9);
    expect(moved[3][1]).toBeCloseTo(4, 9);
});

test('the turn and the scaling act about different centres when the points are not symmetric', () => {
    const points: Pt[] = [[0, 0], [1, 4], [2, 0], [8, 0]];
    expect(meanOf(points)).toEqual([2.75, 1]);
    expect(boxCentreOf(points)).toEqual([4, 2]);
    const turn = affineOfOperation({kind: 'rotate', theta: Math.PI / 2}, {mean: meanOf(points), box: boxCentreOf(points)});
    const scale = affineOfOperation({kind: 'scale', factor: 3}, {mean: meanOf(points), box: boxCentreOf(points)});
    expect(applyAffine(turn, [2.75, 1])[0]).toBeCloseTo(2.75, 12);
    expect(applyAffine(turn, [2.75, 1])[1]).toBeCloseTo(1, 12);
    expect(applyAffine(scale, [4, 2])).toEqual([4, 2]);
    expect(applyAffine(scale, [2.75, 1])[0]).toBeCloseTo(4 + 3 * (2.75 - 4), 12);
});

test.each([
    ['the lesson scene at 3/4', lessonScene, 0.75],
    ['the lesson scene at 1/2', lessonScene, 0.5],
    ['a turn, reflection, scaling and shifts', otherScene, 0.3],
])('T(B(t)) and B_T(t) agree to 1e-9: %s', (_, ops, t) => {
    const {map, curve} = run(lessonPoints, ops);
    const viaMap = mappedReferencePoint(lessonPoints, map, t);
    const viaPoints = curve.eval(t);
    expect(Math.abs(viaMap[0] - viaPoints.X())).toBeLessThan(1e-9);
    expect(Math.abs(viaMap[1] - viaPoints.Y())).toBeLessThan(1e-9);
});

test('the pure Bézier point equals the curve class', () => {
    const curve = makeCurve(lessonPoints);
    const own = bezierPoint(lessonPoints, 0.75);
    expect(own[0]).toBeCloseTo(curve.eval(0.75).X(), 12);
    expect(own[1]).toBeCloseTo(curve.eval(0.75).Y(), 12);
});

test('a hand edit departs from the track, a tracked operation does not', () => {
    const {map, curve} = run(lessonPoints, lessonScene);
    expect(departsFromTrack(lessonPoints, map, pointsOf(curve))).toBe(false);
    curve.getPoints()[1].setX(curve.getPoints()[1].X() + 0.01);
    expect(departsFromTrack(lessonPoints, map, pointsOf(curve))).toBe(true);
});

const mirrorScenes: Array<[string, AffineOperation[]]> = [
    ['a mirror across the y axis, then a turn', [{kind: 'flip', x: true, y: false}, {kind: 'rotate', theta: 0.7}]],
    ['a mirror across the x axis between shifts and a scaling', [{kind: 'move', x: 1, y: 2}, {kind: 'flip', x: false, y: true}, {kind: 'scale', factor: 1.5}, {kind: 'move', x: -3, y: 0.5}]],
    ['both mirrors and a scaling about the box centre', [{kind: 'scale', factor: 0.5}, {kind: 'flip', x: true, y: true}, {kind: 'flip', x: true, y: false}]],
];

test.each(mirrorScenes)('a mirror keeps T(B(t)) equal to B_T(t) to 1e-9 (it acts about the mean of the points): %s', (_, ops) => {
    const {map, curve} = run(lessonPoints, ops);
    for (const t of [0, 0.25, 0.5, 0.9, 1]) {
        const viaMap = mappedReferencePoint(lessonPoints, map, t);
        const viaPoints = curve.eval(t);
        expect(Math.abs(viaMap[0] - viaPoints.X())).toBeLessThan(1e-9);
        expect(Math.abs(viaMap[1] - viaPoints.Y())).toBeLessThan(1e-9);
    }
    expect(departsFromTrack(lessonPoints, map, pointsOf(curve))).toBe(false);
});
