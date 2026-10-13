import SplineAlphaParametrizationGraph from './SplineAlphaParametrizationGraph';
import BaseCurveGraph from '../../base/BaseCurveGraph';
import {C2QubicBezierSpline} from '../../../bezeg/impl/curve/C2QubicBezierSpline';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';

const defaultPoints: number[][] = Object.create(SplineAlphaParametrizationGraph.prototype).defaultPreset()[0][1].points;
const makeSpline = () => new C2QubicBezierSpline(defaultPoints.map(([x, y]) => new PointImpl(x, y)));
const spans = (curve: any): number[] => {
    const u: number[] = curve.getU();
    return u.slice(1).map((value, i) => value - u[i]);
};
const chord = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Chord lengths the C2 spline uses for its knot spans: p0p2, p2p3, ..., p_{n-4}p_{n-3}, p_{n-3}p_{n-1}. */
function chords(): number[] {
    const p = defaultPoints;
    const result = [chord(p[0], p[2])];
    for (let i = 2; i < p.length - 3; i++) result.push(chord(p[i], p[i + 1]));
    result.push(chord(p[p.length - 3], p[p.length - 1]));
    return result;
}

const junctions = (curve: C2QubicBezierSpline) => {
    const pieces = curve.getUnderlyingCurves();
    return pieces.slice(0, -1).map(piece => {
        const end = piece.getPoints()[3];
        return [end.X(), end.Y()];
    });
};

describe('spline alpha parametrization math (thesis 4.2.3)', () => {
    test('route default has six cubic pieces', () => {
        expect(makeSpline().getUnderlyingCurves()).toHaveLength(6);
        expect(chords()).toHaveLength(6);
    });

    test.each([0, 0.5, 1])('knot spans are proportional to chord^alpha for alpha = %p', alpha => {
        const curve = makeSpline();
        curve.setAlpha(alpha);
        const expected = chords().map(c => c ** alpha);
        const total = expected.reduce((a, b) => a + b, 0);
        spans(curve).forEach((span, i) => expect(span).toBeCloseTo(expected[i] / total, 12));
        expect(spans(curve).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    });

    test('alpha = 0 gives equal spans', () => {
        const curve = makeSpline();
        curve.setAlpha(0);
        spans(curve).forEach(span => expect(span).toBeCloseTo(1 / 6, 12));
    });

    test('changing alpha moves the derived junction points while the control points stay', () => {
        const curve = makeSpline();
        const control = curve.getPoints().map(p => [p.X(), p.Y()]);
        const byAlpha = [0, 0.5, 1].map(alpha => {
            curve.setAlpha(alpha);
            return junctions(curve);
        });
        expect(curve.getPoints().map(p => [p.X(), p.Y()])).toEqual(control);
        for (const [a, b] of [[0, 1], [1, 2], [0, 2]]) {
            const distance = Math.max(...byAlpha[a].map((p, i) => chord(p, byAlpha[b][i])));
            expect(distance).toBeGreaterThan(0.05);
        }
    });

    test('junction points at alpha = 0, 1/2, 1 on the route default', () => {
        const curve = makeSpline();
        const result = [0, 0.5, 1].map(alpha => {
            curve.setAlpha(alpha);
            return junctions(curve);
        });
        const expected = [
            [[-1.825, -0.5333333333], [1.1666666667, 1.35], [3.2666666667, 1.65], [4.0833333333, 0.4833333333], [2.8083333333, -1.5]],
            [[-2.2733008634, -0.6911739666], [1.4502474121, 1.4623922565], [3.3899784547, 1.6086357506], [4.1158113624, 0.5401180501], [3.5789431718, -0.7317874390]],
            [[-2.7032130850, -0.8099951479], [1.7574055509, 1.5681429769], [3.4991348176, 1.5615202016], [4.1478229368, 0.5947631903], [3.9844462463, -0.1813711149]],
        ];
        result.forEach((set, a) => set.forEach((p, i) => {
            expect(p[0]).toBeCloseTo(expected[a][i][0], 8);
            expect(p[1]).toBeCloseTo(expected[a][i][1], 8);
        }));
        for (const set of result) expect(set).toHaveLength(5);
    });

    test('the spline stays continuous: pieces share endpoints for every alpha', () => {
        const curve = makeSpline();
        for (const alpha of [0, 0.5, 1]) {
            curve.setAlpha(alpha);
            const pieces = curve.getUnderlyingCurves();
            for (let i = 1; i < pieces.length; i++) {
                const end = pieces[i - 1].getPoints()[3];
                const start = pieces[i].getPoints()[0];
                expect(end.X()).toBeCloseTo(start.X(), 12);
                expect(end.Y()).toBeCloseTo(start.Y(), 12);
            }
        }
    });
});

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        create: vi.fn((type: string, args: any[]) => {
            const object: any = {type, args, board, on: vi.fn(), setAttribute: vi.fn()};
            board.objectsList.push(object);
            return object;
        }),
        removeObject: vi.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((o: any) => !list.includes(o));
        }),
        update: vi.fn(),
        suspendUpdate: vi.fn(),
        unsuspendUpdate: vi.fn(),
        setBoundingBox: vi.fn(),
    };
    return board;
}

function fakeJxgCurve(board: any, spline: C2QubicBezierSpline) {
    return {board, getCurve: () => spline, dispose: vi.fn(), getJxgPoints: () => [], setAttributes: vi.fn()};
}

function makeGraph(initial = {alpha: 0.5, numberOfPoints: 25}) {
    const graph = Object.create(SplineAlphaParametrizationGraph.prototype) as any;
    graph.board = fakeBoard();
    graph.controlPoints = [graph.board.create('point', [0, 0]), graph.board.create('point', [1, 1])];
    graph.sampleMarkers = [];
    graph.graphJXGPoints = [];
    graph.jxgCurves = [fakeJxgCurve(graph.board, makeSpline())];
    graph.graphSession = {isReady: true, isAlive: true};
    graph.store.replaceState({...initial, initialized: true});
    graph.setState = vi.fn((patch: any) => {
        graph.store.replaceState({...graph.state, ...(typeof patch === 'function' ? patch(graph.state) : patch)});
    });
    graph.boardUpdate = vi.fn();
    return graph;
}

const markers = (graph: any) => graph.sampleMarkers.length;
const pointsOnBoard = (graph: any) => graph.board.objectsList.filter((o: any) => o.type === 'point').length;
const lesson = (graph: any, action: any) => graph.applyLessonAction(action);

/** Stands in for the real preset importer: disposes the scene and installs a brand-new spline (alpha 0). */
function stubImport() {
    return vi.spyOn(BaseCurveGraph.prototype, 'importPresetData').mockImplementation(function (this: any) {
        this.disposeFigureScene();
        this.jxgCurves = [fakeJxgCurve(this.board, makeSpline())];
    });
}

describe('lesson actions', () => {
    test.each([0, 0.5, 1])('parameterization-alpha %p is stored on the curve and in state', value => {
        const graph = makeGraph();
        lesson(graph, {kind: 'parameterization-alpha', value});
        expect(graph.getFirstCurve().getAlpha()).toBe(value);
        expect(graph.state.alpha).toBe(value);
    });

    test.each([-0.01, 1.01, NaN, Infinity, '0.5' as any])('parameterization-alpha %p is rejected without mutation', value => {
        const graph = makeGraph();
        const before = graph.getFirstCurve().getAlpha();
        expect(() => lesson(graph, {kind: 'parameterization-alpha', value})).toThrow(/from 0 to 1/);
        expect(graph.getFirstCurve().getAlpha()).toBe(before);
        expect(graph.setState).not.toHaveBeenCalled();
    });

    test.each([0, 1, 25, 50])('parameterization-samples %p regenerates exactly that many markers', count => {
        const graph = makeGraph();
        graph.generateParamPoints();
        lesson(graph, {kind: 'parameterization-samples', count});
        expect(graph.state.numberOfPoints).toBe(count);
        expect(markers(graph)).toBe(count);
        expect(pointsOnBoard(graph)).toBe(count + 2);
    });

    test.each([-1, 51, 2.5, NaN])('parameterization-samples %p is rejected without mutation', count => {
        const graph = makeGraph();
        graph.generateParamPoints();
        const objects = [...graph.board.objectsList];
        expect(() => lesson(graph, {kind: 'parameterization-samples', count})).toThrow(/integer from 0 to 50/);
        expect(graph.state.numberOfPoints).toBe(25);
        expect(graph.board.objectsList).toEqual(objects);
    });

    test('mode action is unsupported on this route', () => {
        const graph = makeGraph();
        expect(() => lesson(graph, {kind: 'parameterization-mode', mode: 'uniform'})).toThrow(/does not support lesson action/);
    });

    test('markers read the current curve, also after the curve object is replaced', () => {
        const graph = makeGraph({alpha: 0.5, numberOfPoints: 3});
        graph.generateParamPoints();
        const replacement = makeSpline();
        graph.jxgCurves = [fakeJxgCurve(graph.board, replacement)];
        replacement.setAlpha(1);
        const t = 1 / 4;
        expect(graph.sampleMarkers[0].args[0]()).toBeCloseTo(replacement.eval(t).X(), 12);
        expect(graph.sampleMarkers[0].args[1]()).toBeCloseTo(replacement.eval(t).Y(), 12);
    });

    test('control points are never touched by marker regeneration', () => {
        const graph = makeGraph();
        graph.generateParamPoints();
        const controls = [...graph.controlPoints];
        lesson(graph, {kind: 'parameterization-samples', count: 4});
        lesson(graph, {kind: 'parameterization-samples', count: 0});
        controls.forEach(c => expect(graph.board.objectsList).toContain(c));
        expect(graph.graphJXGPoints.some((p: any) => controls.includes(p))).toBe(false);
    });
});

describe('default scene and checkpoint restore', () => {
    test('prepared default scene gives the new curve alpha 1/2 and exactly 25 markers', () => {
        const graph = makeGraph({alpha: 1, numberOfPoints: 4});
        graph.generateParamPoints();
        const old = graph.getFirstCurve();
        old.setAlpha(1);
        const spy = stubImport();
        try {
            lesson(graph, {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'});
            expect(graph.getFirstCurve()).not.toBe(old);
            expect(graph.getFirstCurve().getAlpha()).toBe(0.5);
            expect(graph.state).toMatchObject({alpha: 0.5, numberOfPoints: 25});
            expect(markers(graph)).toBe(25);
            expect(pointsOnBoard(graph)).toBe(25 + 2);
        } finally { spy.mockRestore(); }
    });

    test('prepared scene, alpha and samples in one synchronous tick keep the later values', () => {
        const graph = makeGraph();
        const queued: any[] = [];
        graph.setState = vi.fn((patch: any) => { queued.push(patch); });
        const spy = stubImport();
        try {
            lesson(graph, {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'});
            lesson(graph, {kind: 'parameterization-alpha', value: 1});
            lesson(graph, {kind: 'parameterization-samples', count: 9});
            expect(graph.getFirstCurve().getAlpha()).toBe(1);
            expect(markers(graph)).toBe(9);
            const committed = queued.reduce((state, patch) => ({...state, ...patch}), graph.state);
            expect(committed).toMatchObject({alpha: 1, numberOfPoints: 9});
        } finally { spy.mockRestore(); }
    });

    test('checkpoint restore reapplies alpha to the new curve and regenerates the saved sample count', () => {
        const graph = makeGraph({alpha: 0.5, numberOfPoints: 25});
        graph.generateParamPoints();
        const spy = stubImport();
        try {
            graph.restoreLessonState({
                version: 1,
                value: {
                    boardState: {boundingBox: [-5, 5, 5, -5]},
                    graphState: {initialized: true, alpha: 1, numberOfPoints: 7},
                    data: [],
                },
            });
            expect(graph.getFirstCurve().getAlpha()).toBe(1);
            expect(graph.state).toMatchObject({alpha: 1, numberOfPoints: 7});
            expect(markers(graph)).toBe(7);
            expect(pointsOnBoard(graph)).toBe(7 + 2);
            graph.controlPoints.forEach((c: any) => expect(graph.board.objectsList).toContain(c));
            // the render that follows must find nothing left to regenerate
            const prevState = {...graph.state};
            const before = [...graph.sampleMarkers];
            graph.onStateChange(prevState);
            expect(graph.sampleMarkers).toEqual(before);
        } finally { spy.mockRestore(); }
    });

    test('repeated restore and regeneration never accumulate markers', () => {
        const graph = makeGraph();
        graph.generateParamPoints();
        const spy = stubImport();
        try {
            for (let i = 0; i < 4; i++) {
                graph.restoreLessonState({
                    version: 1,
                    value: {boardState: {boundingBox: [-5, 5, 5, -5]}, graphState: {initialized: true, alpha: 0.25, numberOfPoints: 6}, data: []},
                });
                lesson(graph, {kind: 'parameterization-samples', count: 6});
            }
            expect(markers(graph)).toBe(6);
            expect(graph.graphJXGPoints).toHaveLength(6);
            expect(pointsOnBoard(graph)).toBe(6 + 2);
        } finally { spy.mockRestore(); }
    });

    test('disposing the figure scene drops stale marker references', () => {
        const graph = makeGraph();
        graph.generateParamPoints();
        graph.disposeFigureScene();
        expect(markers(graph)).toBe(0);
        expect(pointsOnBoard(graph)).toBe(2);
    });
});
