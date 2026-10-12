import UniformParamBezierCurveGraph from './UniformParamBezierCurveGraph';
import {PhBezierCurve} from '../../../bezeg/impl/curve/ph-bezier-curve';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';

const defaultCurve = () => new PhBezierCurve(
    [new PointImpl(-3, -4)],
    [[-4.5, -4], [-1, 0], [-4.5, 4]].map(([x, y]) => new PointImpl(x, y)));

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        create: jest.fn((type: string) => {
            const object: any = {type, board, on: jest.fn(), setAttribute: jest.fn()};
            board.objectsList.push(object);
            return object;
        }),
        removeObject: jest.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((o: any) => !list.includes(o));
        }),
        suspendUpdate: jest.fn(),
        unsuspendUpdate: jest.fn(),
        update: jest.fn(),
    };
    return board;
}

function makeGraph(curve = defaultCurve()) {
    const graph = Object.create(UniformParamBezierCurveGraph.prototype) as any;
    graph.board = fakeBoard();
    graph.jxgCurves = [{getCurve: () => curve}];
    graph.graphJXGPoints = [];
    graph.sampleJxgPoints = [];
    graph.hodographBindings = [];
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = jest.fn();
    graph.store.replaceState({isAlphaParam: true, alpha: 0.5, numberOfPoints: 10, initialized: true});
    graph.setState = jest.fn((patch: any) => { graph.store.setState(patch); });
    return graph;
}

/** Simulates the host calling onStateChange after a state change. */
function update(graph: any) {
    const prev = graph.state;
    graph.store.replaceState({...graph.state});
    graph.onStateChange(prev);
}

const sampleCount = (graph: any) => graph.board.objectsList.filter((o: any) => o.type === 'point').length;
const simpson = (f: (t: number) => number, n = 2000) => {
    const h = 1 / n;
    let sum = f(0) + f(1);
    for (let i = 1; i < n; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
    return sum * h / 3;
};

describe('lesson actions', () => {
    test('map to state', () => {
        const graph = makeGraph();
        graph.applyLessonAction({kind: 'parameterization-alpha', value: 0.25});
        graph.applyLessonAction({kind: 'parameterization-samples', count: 7});
        graph.applyLessonAction({kind: 'parameterization-mode', mode: 'uniform'});
        expect(graph.state).toMatchObject({alpha: 0.25, numberOfPoints: 7, isAlphaParam: false});
        graph.applyLessonAction({kind: 'parameterization-mode', mode: 'weighted'});
        expect(graph.state.isAlphaParam).toBe(true);
        graph.applyLessonAction({kind: 'parameterization-alpha', value: 0});
        graph.applyLessonAction({kind: 'parameterization-alpha', value: 1});
        graph.applyLessonAction({kind: 'parameterization-samples', count: 1});
        graph.applyLessonAction({kind: 'parameterization-samples', count: 40});
        expect(graph.state).toMatchObject({alpha: 1, numberOfPoints: 40});
    });

    test.each([-0.1, 1.1, NaN, Infinity])('alpha %p is rejected without mutation', value => {
        const graph = makeGraph();
        expect(() => graph.applyLessonAction({kind: 'parameterization-alpha', value})).toThrow();
        expect(graph.setState).not.toHaveBeenCalled();
    });

    test.each([0, 41, 2.5, NaN, Infinity, -3])('count %p is rejected without mutation', count => {
        const graph = makeGraph();
        expect(() => graph.applyLessonAction({kind: 'parameterization-samples', count})).toThrow();
        expect(graph.setState).not.toHaveBeenCalled();
    });

    test('unknown mode is rejected without mutation', () => {
        const graph = makeGraph();
        expect(() => graph.applyLessonAction({kind: 'parameterization-mode', mode: 'arc'})).toThrow();
        expect(graph.setState).not.toHaveBeenCalled();
    });

    test('unsupported actions are rejected', () => {
        const graph = makeGraph();
        expect(() => graph.applyLessonAction({kind: 'bernstein-degree', degree: 2})).toThrow();
    });
});

describe('default PH curve mathematics', () => {
    test('s(1) equals the quadrature of sigma and sigma is the speed', () => {
        const curve = defaultCurve();
        const length = curve.s(1);
        expect(Math.abs(simpson(t => curve.sigma(t)) - length) / length).toBeLessThan(1e-9);
        [0.05, 0.3, 0.5, 0.8, 0.95].forEach(t => {
            const h = 1e-6;
            const dx = (curve.eval(t + h).X() - curve.eval(t - h).X()) / (2 * h);
            const dy = (curve.eval(t + h).Y() - curve.eval(t - h).Y()) / (2 * h);
            expect(curve.sigma(t)).toBeCloseTo(Math.hypot(dx, dy), 5);
        });
    });

    test('uniform mode gives equal arc-length gaps; weighted alpha 1/2 gives t_i', () => {
        const graph = makeGraph();
        const curve = defaultCurve();
        const length = curve.s(1);
        graph.state.isAlphaParam = false;
        const uniform: number[] = graph.getUniformParamTs();
        const n = 10;
        const s = [0, ...uniform.slice(0, n).map(t => curve.s(t))];
        for (let k = 1; k <= n; k++) {
            expect(Math.abs(s[k] - s[k - 1] - length / (n + 1))).toBeLessThan(1e-6 * length);
        }

        graph.state.isAlphaParam = true;
        graph.refreshTs();
        expect(graph.ts).toHaveLength(n + 1);
        graph.ts.slice(0, n).forEach((t: number, i: number) => expect(t).toBeCloseTo((i + 1) / (n + 1), 12));

        const chords = (ts: number[]) => {
            const pts = [0, ...ts.slice(0, n), 1].map(t => curve.eval(t));
            return pts.slice(1).map((p, i) => Math.hypot(p.X() - pts[i].X(), p.Y() - pts[i].Y()));
        };
        const ratio = (c: number[]) => Math.max(...c) / Math.min(...c);
        expect(ratio(chords(uniform))).toBeLessThan(ratio(chords(graph.ts)));
    });
});

describe('sample point ownership', () => {
    test('component updates keep exactly N samples across count and mode changes', () => {
        const graph = makeGraph();
        const foreign = graph.board.create('control');
        graph.graphJXGPoints.push(foreign);
        update(graph);
        expect(sampleCount(graph)).toBe(10);
        for (const patch of [{numberOfPoints: 3}, {isAlphaParam: false}, {numberOfPoints: 25}, {alpha: 0.2},
            {isAlphaParam: true}, {numberOfPoints: 10}]) {
            graph.store.replaceState({...graph.state, ...patch});
            update(graph);
            expect(sampleCount(graph)).toBe(graph.state.numberOfPoints);
            expect(graph.sampleJxgPoints).toHaveLength(graph.state.numberOfPoints);
        }
        expect(graph.board.objectsList).toContain(foreign);
        expect(graph.graphJXGPoints).toContain(foreign);
    });

    test('mode changes move existing samples without recreating them', () => {
        const graph = makeGraph();
        update(graph);
        const point = graph.sampleJxgPoints[4];
        graph.store.replaceState({...graph.state, isAlphaParam: false});
        update(graph);
        expect(graph.sampleJxgPoints[4]).toBe(point);
        expect(graph.ts[4]).not.toBeCloseTo(5 / 11, 3);
        // board.create mock call 4 is sample index 4; its coordinate function reads the current ts.
        const xFn = graph.board.create.mock.calls[4][1][0];
        expect(xFn()).toBeCloseTo(graph.getFirstCurve().eval(graph.ts[4]).X(), 12);
    });

    test('scene disposal followed by restore ends with N samples on the new curve', () => {
        const graph = makeGraph();
        update(graph);
        const disposed = graph.board.objectsList.slice();
        // importPresetData: disposeFigureScene removes scene points and installs a new curve.
        graph.disposeFigureSceneResources();
        graph.board.removeObject(graph.graphJXGPoints);
        graph.graphJXGPoints = [];
        expect(graph.ts).toBeUndefined();
        const newCurve = defaultCurve();
        graph.jxgCurves = [{getCurve: () => newCurve}];
        graph.store.replaceState({...graph.state, isAlphaParam: false, numberOfPoints: 6, alpha: 0.3});
        update(graph);
        expect(sampleCount(graph)).toBe(6);
        expect(graph.ts).toHaveLength(7);
        disposed.forEach((o: any) => expect(graph.board.objectsList).not.toContain(o));
        const xFn = graph.board.create.mock.calls.slice(-1)[0][1][0];
        expect(xFn()).toBeCloseTo(newCurve.eval(graph.ts[5]).X(), 12);
    });
});
