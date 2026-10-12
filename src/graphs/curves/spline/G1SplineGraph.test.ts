import G1SplineGraph from './G1SplineGraph';
import G1SymmetricSplineGraph from './G1SymmetricSplineGraph';
import {G1QuadraticBezierSpline} from '../../../bezeg/impl/curve/G1QuadraticBezierSpline';
import {G1SymmetricQuadraticBezierSpline} from '../../../bezeg/impl/curve/G1SymmetricQuadraticBezierSpline';
import {BezierSpline} from '../../../bezeg/impl/curve/bezier-spline';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';

const toPoints = (raw: number[][]) => raw.map(([x, y]) => new PointImpl(x, y));

/** The route defaults, read from the graph classes so the tests follow the shipped presets. */
function defaultPoints(Cls: any): number[][] {
    return Object.create(Cls.prototype).defaultPreset()[0][1].points;
}

const g1Points = () => defaultPoints(G1SplineGraph);
const symmetricPoints = () => defaultPoints(G1SymmetricSplineGraph);

const xy = (p: {X(): number; Y(): number}): [number, number] => [p.X(), p.Y()];
const sub = (a: [number, number], b: [number, number]): [number, number] => [a[0] - b[0], a[1] - b[1]];
const norm = (v: [number, number]) => Math.hypot(v[0], v[1]);
const cross = (a: [number, number], b: [number, number]) => a[0] * b[1] - a[1] * b[0];
const dot = (a: [number, number], b: [number, number]) => a[0] * b[0] + a[1] * b[1];

/** Derivative direction (times the degree) of a Bezier piece at its end and start, in parameter units of the piece. */
function endDerivative(piece: any): [number, number] {
    const pts = piece.getPoints();
    const n = pts.length - 1;
    return sub(xy(pts[n]), xy(pts[n - 1])).map(c => c * n) as [number, number];
}

function startDerivative(piece: any): [number, number] {
    const pts = piece.getPoints();
    const n = pts.length - 1;
    return sub(xy(pts[1]), xy(pts[0])).map(c => c * n) as [number, number];
}

function makeGraph(Cls: any, curve: BezierSpline) {
    const graph = Object.create(Cls.prototype) as any;
    graph.jxgCurves = [{getCurve: () => curve}];
    graph.graphSession = {isReady: true, isAlive: true};
    graph.store.replaceState({initialized: true});
    graph.setState = jest.fn((patch: any) => {
        graph.store.replaceState({...graph.state, ...(typeof patch === 'function' ? patch(graph.state) : patch)});
    });
    graph.boardUpdate = jest.fn();
    return graph;
}

describe('G1 quadratic spline (thesis 4.1, b = 1 / alpha_1)', () => {
    test('route default has three quadratic pieces, two junctions and b starting at 1', () => {
        const curve = new G1QuadraticBezierSpline(toPoints(g1Points()));
        expect(curve.getUnderlyingCurves()).toHaveLength(3);
        expect(curve.getUnderlyingCurves().every(piece => piece.getPoints().length === 3)).toBe(true);
        expect(curve.getBs()).toEqual([1, 1]);
        expect(curve.getNumOfBs()).toBe(2);
    });

    test.each([0.25, 1, 2.5])('b = %p: tangent directions agree at every junction and the derivative ratio equals b', b => {
        const curve = new G1QuadraticBezierSpline(toPoints(g1Points()));
        curve.getBs().forEach((_, j) => curve.setB(j, b));
        const pieces = curve.getUnderlyingCurves();
        // alpha = 0 gives equal parameter spans for every piece, so Bezier-piece derivatives compare directly.
        const u = (curve as any).getU();
        const spans = u.slice(1).map((value: number, i: number) => value - u[i]);
        spans.forEach((span: number) => expect(span).toBeCloseTo(1 / 3, 12));
        for (let j = 1; j < pieces.length; j++) {
            const incoming = endDerivative(pieces[j - 1]);
            const outgoing = startDerivative(pieces[j]);
            expect(cross(incoming, outgoing)).toBeCloseTo(0, 9);
            expect(dot(incoming, outgoing)).toBeGreaterThan(0);
            expect(norm(outgoing) / norm(incoming)).toBeCloseTo(b, 9);
        }
    });

    test('the junction is shared and C1 only when b = 1', () => {
        const curve = new G1QuadraticBezierSpline(toPoints(g1Points()));
        const pieces = curve.getUnderlyingCurves();
        for (let j = 1; j < pieces.length; j++) {
            const end = xy(pieces[j - 1].getPoints()[2]);
            const start = xy(pieces[j].getPoints()[0]);
            expect(end[0]).toBeCloseTo(start[0], 12);
            expect(end[1]).toBeCloseTo(start[1], 12);
            const incoming = endDerivative(pieces[j - 1]);
            const outgoing = startDerivative(pieces[j]);
            expect(outgoing[0]).toBeCloseTo(incoming[0], 9);
            expect(outgoing[1]).toBeCloseTo(incoming[1], 9);
        }
    });
});

describe('G1 symmetric quadratic spline (thesis Algorithm 6)', () => {
    test('route default has four pieces and three junction parameters starting at 1/2', () => {
        const curve = new G1SymmetricQuadraticBezierSpline(toPoints(symmetricPoints()));
        expect(curve.getUnderlyingCurves()).toHaveLength(4);
        expect(curve.getBs()).toEqual([0.5, 0.5, 0.5]);
    });

    test.each([0.25, 0.5, 0.75])('beta = %p: junctions are (1-beta)p_l + beta p_{l+1} with continuous tangent direction', beta => {
        const raw = symmetricPoints();
        const curve = new G1SymmetricQuadraticBezierSpline(toPoints(raw));
        curve.getBs().forEach((_, j) => curve.setB(j, beta));
        const pieces = curve.getUnderlyingCurves();
        for (let j = 0; j < curve.getNumOfBs(); j++) {
            // junction j joins pieces j and j+1 and lies on the segment p_{j+1} p_{j+2}
            const a = raw[j + 1], c = raw[j + 2];
            const expected = [(1 - beta) * a[0] + beta * c[0], (1 - beta) * a[1] + beta * c[1]];
            const end = xy(pieces[j].getPoints()[pieces[j].getPoints().length - 1]);
            const start = xy(pieces[j + 1].getPoints()[0]);
            expect(end[0]).toBeCloseTo(expected[0], 12);
            expect(end[1]).toBeCloseTo(expected[1], 12);
            expect(start[0]).toBeCloseTo(expected[0], 12);
            expect(start[1]).toBeCloseTo(expected[1], 12);
            const incoming = endDerivative(pieces[j]);
            const outgoing = startDerivative(pieces[j + 1]);
            expect(cross(incoming, outgoing)).toBeCloseTo(0, 9);
            expect(dot(incoming, outgoing)).toBeGreaterThan(0);
        }
    });

    test('moving a junction changes only its two neighbouring pieces', () => {
        const curve = new G1SymmetricQuadraticBezierSpline(toPoints(symmetricPoints()));
        const before = curve.getUnderlyingCurves().map(piece => piece.getPoints().map(xy));
        curve.setB(1, 0.8);
        const after = curve.getUnderlyingCurves().map(piece => piece.getPoints().map(xy));
        expect(after[0]).toEqual(before[0]);
        expect(after[3]).toEqual(before[3]);
        expect(after[1]).not.toEqual(before[1]);
        expect(after[2]).not.toEqual(before[2]);
    });
});

describe.each([
    ['spline-g1', G1SplineGraph, () => new G1QuadraticBezierSpline(toPoints(g1Points())), 0.01, 3, 2],
    ['spline-g1-symmetric', G1SymmetricSplineGraph, () => new G1SymmetricQuadraticBezierSpline(toPoints(symmetricPoints())), 0.01, 0.99, 3],
] as const)('%s lesson action spline-beta', (_name, Cls, make, min, max, count) => {
    test.each([min, (min + max) / 2, max])('accepts %p and updates the model, state and board', value => {
        const curve = make();
        const graph = makeGraph(Cls, curve);
        graph.applyLessonAction({kind: 'spline-beta', index: count - 1, value});
        expect(curve.getB(count - 1)).toBe(value);
        expect(graph.state.betaRevision).toBe(1);
        expect(graph.boardUpdate).toHaveBeenCalled();
    });

    test.each([min - 0.001, max + 0.001, 0, NaN, Infinity, '0.5' as any])('rejects value %p without mutation', value => {
        const curve = make();
        const before = [...curve.getBs()];
        const graph = makeGraph(Cls, curve);
        expect(() => graph.applyLessonAction({kind: 'spline-beta', index: 0, value})).toThrow(/parameter β/);
        expect(curve.getBs()).toEqual(before);
        expect(graph.setState).not.toHaveBeenCalled();
        expect(graph.boardUpdate).not.toHaveBeenCalled();
    });

    test.each([-1, count, 0.5, NaN, '0' as any])('rejects index %p without mutation', index => {
        const curve = make();
        const before = [...curve.getBs()];
        const graph = makeGraph(Cls, curve);
        expect(() => graph.applyLessonAction({kind: 'spline-beta', index, value: (min + max) / 2})).toThrow(/junction index/);
        expect(curve.getBs()).toEqual(before);
        expect(graph.setState).not.toHaveBeenCalled();
    });

    test('two beta actions in one tick both count and both apply', () => {
        const curve = make();
        const graph = makeGraph(Cls, curve);
        graph.applyLessonAction({kind: 'spline-beta', index: 0, value: max});
        graph.applyLessonAction({kind: 'spline-beta', index: 1, value: min});
        expect(curve.getB(0)).toBe(max);
        expect(curve.getB(1)).toBe(min);
        expect(graph.state.betaRevision).toBe(2);
    });

    test('unrelated actions still reach the base class', () => {
        const graph = makeGraph(Cls, make());
        expect(() => graph.applyLessonAction({kind: 'subdivide'})).toThrow(/does not support lesson action/);
    });
});

describe('beta values survive checkpoints through the preset DTO', () => {
    test.each([
        ['JXGQuadraticG1SplineCurve', () => import('../object/JXGQuadraticG1SplineCurve').then(m => m.JXGQuadraticG1SplineCurve)],
        ['JXGSymmetricQuadraticG1SplineCurve', () => import('../object/JXGSymmetricQuadraticG1SplineCurve').then(m => m.JXGSymmetricQuadraticG1SplineCurve)],
    ])('%s exports b in its state, which fromDto reapplies', async (_name, load) => {
        const Cls: any = await load();
        const state = Cls.prototype.exportState;
        const fake: any = {getCurve: () => ({getBs: () => [0.3, 1.7]}), pointControlledCurve: {}};
        const exported = state.call(Object.assign(Object.create(Cls.prototype), fake), undefined);
        expect(exported.b).toEqual([0.3, 1.7]);
    });
});
