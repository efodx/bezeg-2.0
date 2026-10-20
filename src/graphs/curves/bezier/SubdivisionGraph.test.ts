import SubdivisionGraph, {MAX_SUBDIVISION_STEPS} from './SubdivisionGraph';
import {PolynomialBezierCurve} from '../../../bezeg/impl/curve/polynomial-bezier-curve';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';
import {GraphPalette} from '../../styles/GraphPalette';
import {Attributes} from '../../attributes/Attributes';

const DEFAULT_POINTS = [[-4, -3], [-3, 3], [3, 3], [4, -3]];
const makeCurve = () => new PolynomialBezierCurve(DEFAULT_POINTS.map(([x, y]) => new PointImpl(x, y)));

function fakeJxgCurve(curve: PolynomialBezierCurve, log: any[]) {
    const jsxCurve = {setAttribute: vi.fn()};
    let selected = false;
    const jxg: any = {
        curve, disposed: false,
        isSelected: () => selected,
        select: vi.fn(() => { selected = true; }),
        deselect: vi.fn(() => { selected = false; }),
        getJxgCurve: () => jsxCurve,
        jsxCurve,
        setSubdivisionResultConsumer: vi.fn(),
        isShowingControlPolygon: () => false,
        showControlPolygon: vi.fn(),
        setAttributes: vi.fn(),
        dispose: vi.fn(() => { jxg.disposed = true; }),
        board: undefined,
        subdivide: vi.fn((t: number) => {
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
    graph.board = {suspendUpdate: vi.fn(), unsuspendUpdate: vi.fn(), update: vi.fn(), fullUpdate: vi.fn(), setBoundingBox: vi.fn()};
    graph.workspaceRevision = 0;
    graph.graphJXGPoints = [];
    graph.jxgCurves = [fakeJxgCurve(makeCurve(), log)];
    graph.graphSession = {isReady: true, isAlive: true};
    graph.store.replaceState({initialized: true});
    graph.setState = vi.fn((patch: any) => { graph.store.setState(patch); });
    graph.refreshWorkspace = vi.fn(() => { graph.workspaceRevision++; });
    graph.unsuspendBoardUpdate = vi.fn();
    graph.boardUpdate = vi.fn();
    graph.boardState = () => ({boundingBox: [-1, 1, 1, -1]});
    graph.exportPresetData = () => graph.jxgCurves.map((c: any) =>
        ['JSXBezierCurve', {points: c.curve.getPoints().map((p: any) => [p.X(), p.Y()])}]);
    graph.importPresetData = vi.fn((data: any) => {
        graph.jxgCurves.forEach((c: any) => c.dispose());
        graph.jxgCurves = data.map((d: any) => fakeJxgCurve(
            new PolynomialBezierCurve(d[1].points.map(([x, y]: number[]) => new PointImpl(x, y))), log));
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
    // The step count follows from the saved pieces; it is not saved anywhere itself.
    expect(graph.stepsDone).toBe(2);
    expect((checkpoint.value as any).transientState).not.toHaveProperty('stepsDone');
    expect((checkpoint.value as any).graphState).not.toHaveProperty('stepsDone');
    expect(checkpoint.value).not.toHaveProperty('stepsDone');
    lesson(graph, subdivide);
    lesson(graph, subdivide);
    expect(graph.jxgCurves.length).toBe(16);
    graph.restoreLessonState(checkpoint);
    expect(graph.stepsDone).toBe(2);
    expect(graph.jxgCurves.length).toBe(4);
    // Every restored piece keeps the operations its subdivided parent had disabled.
    graph.jxgCurves.forEach((piece: any) => expect(piece.setAttributes).toHaveBeenCalledWith(Attributes.bezierDisabled));
    // A checkpoint taken at step 0 restores a single curve even after subdividing.
    const fresh = makeGraph();
    const start = fresh.captureLessonState();
    lesson(fresh, subdivide);
    fresh.restoreLessonState(start);
    expect(fresh.stepsDone).toBe(0);
    expect(fresh.jxgCurves.length).toBe(1);
});

test('a Preset that already has subdivided pieces counts their steps toward the cap', () => {
    const source = makeGraph();
    for (let k = 0; k < 3; k++) lesson(source, subdivide);
    const graph = makeGraph();
    graph.importPresetData(source.exportPresetData());
    expect(graph.jxgCurves.length).toBe(8);
    expect(graph.stepsDone).toBe(3);
    lesson(graph, subdivide);
    lesson(graph, subdivide);
    expect(graph.jxgCurves.length).toBe(2 ** MAX_SUBDIVISION_STEPS);
    expect(() => lesson(graph, subdivide)).toThrow(/At most 5 subdivision steps/);
    // A piece count that no number of halvings gives rounds up, so the cap still bounds the pieces.
    const odd = makeGraph();
    odd.importPresetData(source.exportPresetData().slice(0, 3));
    expect(odd.stepsDone).toBe(2);
    for (let k = 0; k < 3; k++) lesson(odd, subdivide);
    expect(odd.jxgCurves.length).toBe(24);
    expect(() => lesson(odd, subdivide)).toThrow();
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
