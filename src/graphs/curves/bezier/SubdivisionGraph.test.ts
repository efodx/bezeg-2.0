import SubdivisionGraph from './SubdivisionGraph';
import {PolynomialBezierCurve} from '../../../bezeg/impl/curve/polynomial-bezier-curve';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';
import {GraphPalette} from '../../styles/GraphPalette';

const DEFAULT_POINTS = [[-4, -3], [-3, 3], [3, 3], [4, -3]];
const makeCurve = () => new PolynomialBezierCurve(DEFAULT_POINTS.map(([x, y]) => new PointImpl(x, y)));

function fakeJxgCurve(curve: PolynomialBezierCurve, log: any[]) {
    const jsxCurve = {setAttribute: jest.fn()};
    const jxg: any = {
        curve, disposed: false,
        getJxgCurve: () => jsxCurve,
        jsxCurve,
        setSubdivisionResultConsumer: jest.fn(),
        isShowingControlPolygon: () => false,
        showControlPolygon: jest.fn(),
        dispose: jest.fn(() => { jxg.disposed = true; }),
        board: undefined,
        subdivide: jest.fn((t: number) => {
            const [left, right] = jxg.curve.subdivide(t);
            jxg.curve = left;
            const created = fakeJxgCurve(right, log);
            log.push(created);
            return created;
        }),
    };
    return jxg;
}

function makeGraph() {
    const graph = Object.create(SubdivisionGraph.prototype) as any;
    const log: any[] = [];
    graph.board = {suspendUpdate: jest.fn(), unsuspendUpdate: jest.fn(), update: jest.fn(), setBoundingBox: jest.fn()};
    graph.stepsDone = 0;
    graph.workspaceRevision = 0;
    graph.graphJXGPoints = [];
    graph.jxgCurves = [fakeJxgCurve(makeCurve(), log)];
    graph.graphSession = {isReady: true, isAlive: true};
    graph.store.replaceState({initialized: true});
    graph.setState = jest.fn((patch: any) => { graph.store.setState(patch); });
    graph.refreshWorkspace = jest.fn(() => { graph.workspaceRevision++; });
    graph.unsuspendBoardUpdate = jest.fn();
    graph.boardUpdate = jest.fn();
    graph.boardState = () => ({boundingBox: [-1, 1, 1, -1]});
    graph.exportPresetData = () => graph.jxgCurves.map((c: any) =>
        ['JSXBezierCurve', {points: c.curve.getPoints().map((p: any) => [p.X(), p.Y()])}]);
    graph.importPresetData = jest.fn((data: any) => {
        graph.jxgCurves.forEach((c: any) => c.dispose());
        graph.jxgCurves = data.map((d: any) => fakeJxgCurve(
            new PolynomialBezierCurve(d[1].points.map(([x, y]: number[]) => new PointImpl(x, y))), log));
        graph.jxgCurves[0].setAttributes = jest.fn();
    });
    return graph;
}

const lesson = (graph: any, action: any) => graph.applyLessonAction(action);
const subdivide = {kind: 'subdivide'};

test('subdivide action allows 5 steps and the 6th throws without mutation', () => {
    const graph = makeGraph();
    for (let k = 1; k <= 5; k++) {
        lesson(graph, subdivide);
        expect(graph.jxgCurves.length).toBe(2 ** k);
        expect(graph.stepsDone).toBe(k);
    }
    const curves = [...graph.jxgCurves];
    expect(() => lesson(graph, subdivide)).toThrow(/At most 5 subdivision steps/);
    expect(graph.stepsDone).toBe(5);
    expect(graph.jxgCurves).toEqual(curves);
    expect(graph.jxgCurves.length).toBe(32);
});

test('newly owned subdivision curves receive the next scene-order visual role', () => {
    const graph = makeGraph();
    lesson(graph, subdivide);
    expect(graph.jxgCurves[1].jsxCurve.setAttribute).toHaveBeenCalledWith(expect.objectContaining({
        strokeColor: GraphPalette.comparisonCurve
    }));
});

test('other actions fall through to the base class', () => {
    const graph = makeGraph();
    expect(() => lesson(graph, {kind: 'parameterization-alpha', value: 0.5})).toThrow();
});

test('default scene resets stepsDone and disposes generated pieces', () => {
    const graph = makeGraph();
    graph.defaultPreset = SubdivisionGraph.prototype.defaultPreset;
    graph.lessonDefaultState = () => ({initialized: true});
    for (let i = 0; i < 3; i++) lesson(graph, subdivide);
    const old = [...graph.jxgCurves];
    expect(old.length).toBe(8);
    lesson(graph, {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'});
    expect(graph.stepsDone).toBe(0);
    expect(graph.jxgCurves.length).toBe(1);
    old.forEach((c: any) => expect(c.disposed).toBe(true));
});

test('lesson checkpoint round-trips curve set and stepsDone', () => {
    const graph = makeGraph();
    lesson(graph, subdivide);
    lesson(graph, subdivide);
    const checkpoint = graph.captureLessonState();
    expect((checkpoint.value as any).stepsDone).toBe(2);
    lesson(graph, subdivide);
    lesson(graph, subdivide);
    expect(graph.jxgCurves.length).toBe(16);
    graph.restoreLessonState(checkpoint);
    expect(graph.stepsDone).toBe(2);
    expect(graph.jxgCurves.length).toBe(4);
    // A checkpoint taken at step 0 restores a single curve even after subdividing.
    const fresh = makeGraph();
    const start = fresh.captureLessonState();
    lesson(fresh, subdivide);
    fresh.restoreLessonState(start);
    expect(fresh.stepsDone).toBe(0);
    expect(fresh.jxgCurves.length).toBe(1);
});

describe('subdivision mathematics on the default curve', () => {
    const original = makeCurve();
    const pieces = (k: number): PolynomialBezierCurve[] => {
        let list = [makeCurve()];
        for (let i = 0; i < k; i++) list = list.flatMap(c => c.subdivide(1 / 2));
        return list;
    };
    // Control point i of piece j is compared with the curve point at the Greville-like parameter (j + i/n) / 2^k.
    const polygonDistance = (list: PolynomialBezierCurve[]) => {
        let max = 0;
        list.forEach((piece, j) => {
            const pts = piece.getPoints();
            const n = pts.length - 1;
            pts.forEach((p, i) => {
                const q = original.eval((j + i / n) / list.length);
                max = Math.max(max, Math.hypot(p.X() - q.X(), p.Y() - q.Y()));
            });
        });
        return max;
    };

    test.each([1, 2, 3, 4, 5])('k=%p gives 2^k pieces matching B((j+u)/2^k)', k => {
        const list = pieces(k);
        expect(list.length).toBe(2 ** k);
        list.forEach((piece, j) => [0, 0.13, 0.5, 0.77, 1].forEach(u => {
            const a = piece.eval(u);
            const b = original.eval((j + u) / 2 ** k);
            expect(Math.abs(a.X() - b.X())).toBeLessThan(1e-10);
            expect(Math.abs(a.Y() - b.Y())).toBeLessThan(1e-10);
        }));
    });

    test('control polygon distance to the curve decreases with k', () => {
        const values: number[] = [];
        for (let k = 0; k <= 5; k++) values.push(polygonDistance(pieces(k)));
        for (let k = 1; k <= 5; k++) expect(values[k]).toBeLessThan(values[k - 1]);
    });
});
