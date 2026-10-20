import DecasteljauGraph2 from './DecasteljauGraph2';
import BaseCurveGraph from '../../base/BaseCurveGraph';
import {PolynomialBezierCurve} from '../../../bezeg/impl/curve/polynomial-bezier-curve';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';

const P = [[-4, -3], [-3, 2], [0, 3], [3, 2], [4, -3]];
const quartic = () => new PolynomialBezierCurve(P.map(([x, y]) => new PointImpl(x, y)));
const sub = (from: number, to: number) => new PolynomialBezierCurve(P.slice(from, to).map(([x, y]) => new PointImpl(x, y)));

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        create: vi.fn((type: string, parents: any[]) => {
            const object: any = {type, parents, board, on: vi.fn()};
            board.objectsList.push(object);
            return object;
        }),
        removeObject: vi.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((o: any) => !list.includes(o));
        }),
        update: vi.fn(),
    };
    return board;
}

function fakeJxgCurve(curve: any) {
    return {
        getCurve: () => curve,
        getAttributes: () => ({}),
        isSelected: () => false,
        getJxgPoints: () => [],
        setIntervalEnd: vi.fn(),
        setAttributes: vi.fn(),
        setDecasteljauT: vi.fn(),
        dispose: vi.fn(),
        board: undefined as any,
    };
}

function makeGraph() {
    const graph = Object.create(DecasteljauGraph2.prototype) as any;
    graph.board = fakeBoard();
    graph.jxgCurves = [fakeJxgCurve(quartic())];
    graph.graphJXGPoints = [];
    graph.helperObjects = [];
    graph.workspaceRevision = 0;
    graph.parameter = 0.5;
    graph.graphSession = {isReady: true, isAlive: true};
    graph.store.replaceState({t: 0.5, v: 1, animationStatus: 'ready', initialized: true});
    graph.setState = vi.fn((patch: any, callback?: () => void) => { graph.store.setState(patch); callback?.(); });
    graph.boardUpdate = vi.fn();
    graph.animation = {isRunning: vi.fn(() => false), pause: vi.fn(), play: vi.fn(), stop: vi.fn()};
    return graph;
}

const ofType = (graph: any, type: string) => graph.board.objectsList.filter((o: any) => o.type === type);
const num = (v: any) => (typeof v === 'function' ? v() : v);

describe('Izrek 2.13 on the default quartic', () => {
    test.each([0, 0.25, 0.5, 0.75, 1])('B(t) = (1-t) B[p0..p3](t) + t B[p1..p4](t) at t=%p, main point on the helper segment', t => {
        const graph = makeGraph();
        graph.parameter = t;
        graph.bindSceneToFirstCurve();
        const [h1, h2, main] = ofType(graph, 'point');
        const a = sub(0, 4).eval(t), b = sub(1, 5).eval(t), full = quartic().eval(t);
        expect(num(h1.parents[0])).toBeCloseTo(a.X(), 10);
        expect(num(h1.parents[1])).toBeCloseTo(a.Y(), 10);
        expect(num(h2.parents[0])).toBeCloseTo(b.X(), 10);
        expect(num(h2.parents[1])).toBeCloseTo(b.Y(), 10);
        expect(num(main.parents[0])).toBeCloseTo((1 - t) * a.X() + t * b.X(), 10);
        expect(num(main.parents[1])).toBeCloseTo((1 - t) * a.Y() + t * b.Y(), 10);
        expect(num(main.parents[0])).toBeCloseTo(full.X(), 10);
        expect(num(main.parents[1])).toBeCloseTo(full.Y(), 10);
        // |H1 M| : |H1 H2| equals t
        const d = Math.hypot(b.X() - a.X(), b.Y() - a.Y());
        if (d > 0) expect(Math.hypot(full.X() - a.X(), full.Y() - a.Y()) / d).toBeCloseTo(t, 10);
    });

    test('helper points and B(t) at t = 0.5 and 0.25 match the worked example', () => {
        const rows = [0.5, 0.25].map(t => {
            const f = (c: any) => { const p = c.eval(t); return [p.X(), p.Y()]; };
            return {t, h1: f(sub(0, 4)), h2: f(sub(1, 5)), B: f(quartic())};
        });
        const expected = [
            {h1: [-1.25, 1.75], h2: [1.25, 1.75], B: [0, 1.75]},
            {h1: [-2.90625, 0.03125], h2: [-0.78125, 2.34375], B: [-2.375, 0.609375]},
        ];
        rows.forEach((row, i) => (['h1', 'h2', 'B'] as const).forEach(key => row[key].forEach((v: number, k: number) => expect(v).toBeCloseTo(expected[i][key][k], 10))));
    });
});

describe('lesson parameter action', () => {
    test.each([0, 0.25, 1])('accepts %p, draws synchronously and publishes', value => {
        const graph = makeGraph();
        graph.bindSceneToFirstCurve();
        graph.applyLessonAction({kind: 'parameter', name: 't', value});
        expect(graph.parameter).toBe(value);
        expect(graph.state.t).toBe(value);
        expect(graph.jxgCurves[0].setDecasteljauT).toHaveBeenLastCalledWith(value);
        expect(graph.boardUpdate).toHaveBeenCalled();
    });

    test.each([-0.1, 1.1, NaN, Infinity, '0.5'])('rejects %p without mutation', value => {
        const graph = makeGraph();
        expect(() => graph.applyLessonAction({kind: 'parameter', name: 't', value})).toThrow(/between 0 and 1/);
        expect(graph.parameter).toBe(0.5);
        expect(graph.setState).not.toHaveBeenCalled();
    });

    test('pauses running playback', () => {
        const graph = makeGraph();
        graph.animation.isRunning.mockReturnValue(true);
        graph.state.animationStatus = 'playing';
        graph.applyLessonAction({kind: 'parameter', name: 't', value: 0.3});
        expect(graph.animation.pause).toHaveBeenCalled();
        expect(graph.state).toMatchObject({t: 0.3, animationStatus: 'paused'});
    });

    test('workspace pause preserves the drawn frame and playback can resume from it', () => {
        const graph = makeGraph();
        graph.bindSceneToFirstCurve();
        graph.parameter = 0.73;
        graph.store.replaceState({...graph.state, t: 0.71, animationStatus: 'playing'});
        graph.animation.isRunning.mockReturnValue(true);

        graph.pausePlayback();

        expect(graph.animation.pause).toHaveBeenCalledTimes(1);
        expect(graph.parameter).toBe(0.73);
        expect(graph.state).toMatchObject({t: 0.73, animationStatus: 'paused'});
        expect(graph.jxgCurves[0].setDecasteljauT).toHaveBeenLastCalledWith(0.73);

        graph['playAnimation']();
        expect(graph.animation.play).toHaveBeenCalledTimes(1);
        expect(graph.parameter).toBe(0.73);
        expect(graph.state).toMatchObject({t: 0.73, animationStatus: 'playing'});
    });

    test('other parameter names go to the base graph', () => {
        const graph = makeGraph();
        expect(() => graph.applyLessonAction({kind: 'parameter', name: 'u', value: 0.3})).toThrow();
    });
});

describe('helper ownership', () => {
    const stubImport = () => vi.spyOn(BaseCurveGraph.prototype, 'importPresetData').mockImplementation(function (this: any) {
        this.disposeFigureScene();
        this.jxgCurves = [fakeJxgCurve(quartic())];
    });

    test('bind creates 3 points, 1 segment and 2 curves; rebinding does not duplicate', () => {
        const graph = makeGraph();
        graph.bindSceneToFirstCurve();
        graph.bindSceneToFirstCurve();
        expect(ofType(graph, 'point')).toHaveLength(3);
        expect(ofType(graph, 'segment')).toHaveLength(1);
        expect(ofType(graph, 'curve')).toHaveLength(2);
        expect(graph.board.objectsList).toHaveLength(6);
    });

    test('importing twice leaves one helper set bound to the new curve', () => {
        const graph = makeGraph();
        graph.bindSceneToFirstCurve();
        const spy = stubImport();
        try {
            graph.importPresetData([]);
            graph.importPresetData([]);
            expect(graph.board.objectsList).toHaveLength(6);
            expect(graph.jxgCurves).toHaveLength(1);
            const live = graph.jxgCurves[0];
            expect(live.setIntervalEnd).toHaveBeenCalledTimes(1);
            expect(live.setDecasteljauT).toHaveBeenCalledWith(0.5);
            // helpers follow the new curve's live control points
            const before = sub(1, 5).eval(0.5).Y();
            live.getCurve().getPoints()[4].setY(10);
            const h2 = ofType(graph, 'point')[1];
            expect(num(h2.parents[1])).toBeCloseTo(before + 0.5 ** 3 * 13, 10);
        } finally { spy.mockRestore(); }
    });

    test('dispose removes every helper', () => {
        const graph = makeGraph();
        graph.bindSceneToFirstCurve();
        graph.disposeFigureScene();
        expect(graph.board.objectsList).toHaveLength(0);
        expect(graph.helperObjects).toHaveLength(0);
    });

    test('default lesson scene rebinds with t = 0.5 and ready animation', () => {
        const graph = makeGraph();
        graph.parameter = 0.9;
        graph.store.replaceState({...graph.state, t: 0.9, animationStatus: 'paused'});
        graph.bindSceneToFirstCurve();
        const spy = stubImport();
        try {
            graph.applyLessonAction({kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'});
            expect(graph.parameter).toBe(0.5);
            expect(graph.state).toMatchObject({t: 0.5, animationStatus: 'ready'});
            expect(graph.board.objectsList).toHaveLength(6);
        } finally { spy.mockRestore(); }
    });
});
