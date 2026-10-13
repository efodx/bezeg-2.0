import {BernsteinGraph} from './BernsteinGraph';
import {PolynomialBezierCurve} from '../../bezeg/impl/curve/polynomial-bezier-curve';
import {PointImpl} from '../../bezeg/impl/point/point-impl';

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        create: vi.fn((type: string) => {
            const object = {type, board};
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

function makeGraph(initial = {n: 2, isSumGraph: false, showLabels: false}) {
    const graph = Object.create(BernsteinGraph.prototype) as any;
    graph.board = fakeBoard();
    graph.jxgObjects = [];
    graph.generatedFor = null;
    graph.padding = 0.1;
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = vi.fn();
    graph.store.replaceState({...initial});
    graph.setState = vi.fn((patch: any) => { graph.store.setState(patch); });
    return graph;
}

const curveCount = (graph: any) => graph.board.objectsList.filter((o: any) => o.type === 'curve').length;

test('degree action sets n = degree + 1 and regenerates', () => {
    const graph = makeGraph();
    graph.applyLessonAction({kind: 'bernstein-degree', degree: 3});
    expect(graph.state.n).toBe(4);
    expect(curveCount(graph)).toBe(4);
    graph.applyLessonAction({kind: 'bernstein-degree', degree: 0});
    expect(graph.state.n).toBe(1);
    graph.applyLessonAction({kind: 'bernstein-degree', degree: 5});
    expect(graph.state.n).toBe(6);
});

test.each([-1, 6, 1.5, NaN, Infinity])('degree %p is rejected without mutation', degree => {
    const graph = makeGraph();
    graph.applyLessonAction({kind: 'bernstein-degree', degree: 2});
    const before = {state: {...graph.state}, objects: [...graph.board.objectsList]};
    expect(() => graph.applyLessonAction({kind: 'bernstein-degree', degree})).toThrow(/integer from 0 to 5/);
    expect(graph.state).toEqual(before.state);
    expect(graph.board.objectsList).toEqual(before.objects);
});

test('stacked-area action toggles the sum graph and keeps degree', () => {
    const graph = makeGraph({n: 4, isSumGraph: false, showLabels: false});
    graph.applyLessonAction({kind: 'bernstein-stacked-area', visible: true});
    expect(graph.state).toMatchObject({n: 4, isSumGraph: true});
    graph.applyLessonAction({kind: 'bernstein-stacked-area', visible: false});
    expect(graph.state.isSumGraph).toBe(false);
});

test('default scene preparation resets to degree 1, stacked area off', () => {
    const graph = makeGraph({n: 6, isSumGraph: true, showLabels: true});
    graph.applyLessonAction({kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'});
    expect(graph.state).toEqual({initialized: true, n: 2, isSumGraph: false, showLabels: false});
    expect(curveCount(graph)).toBe(2);
});

test('repeated regeneration does not accumulate board objects or references', () => {
    const graph = makeGraph();
    graph.applyLessonAction({kind: 'bernstein-degree', degree: 2});
    const baseline = graph.board.objectsList.length;
    for (let i = 0; i < 5; i++) {
        graph.applyLessonAction({kind: 'bernstein-degree', degree: 2});
        graph.applyLessonAction({kind: 'bernstein-stacked-area', visible: true});
        graph.applyLessonAction({kind: 'bernstein-stacked-area', visible: false});
    }
    expect(graph.board.objectsList.length).toBe(baseline);
    expect(graph.jxgObjects.length).toBe(baseline);
    graph.setN(4);
    graph.setN(1);
    expect(graph.board.objectsList.length).toBe(graph.jxgObjects.length);
    expect(graph.board.objectsList.length).toBe(2); // one curve + one label
});

test('onStateChange regenerates only when the generated state is stale', () => {
    const graph = makeGraph();
    graph.applyLessonAction({kind: 'bernstein-degree', degree: 2});
    const calls = graph.board.create.mock.calls.length;
    graph.onStateChange({});
    expect(graph.board.create.mock.calls.length).toBe(calls);
    graph.store.replaceState({...graph.state, n: 5}); // e.g. restored checkpoint
    graph.onStateChange({});
    expect(curveCount(graph)).toBe(5);
});

test.each([0, 1, 2, 3, 4, 5])('Bernstein basis of degree %p is nonnegative and sums to one', degree => {
    const n = degree + 1;
    const bases = Array.from({length: n}, (_, i) => {
        const points = Array(n - 1).fill([0, 0]);
        points.splice(i, 0, [1, 0]);
        return new PolynomialBezierCurve(points.map(p => new PointImpl(p[0], p[1])));
    });
    expect(bases).toHaveLength(degree + 1);
    for (let k = 0; k <= 20; k++) {
        const t = k / 20;
        const values = bases.map(b => b.eval(t).X());
        values.forEach(v => expect(v).toBeGreaterThanOrEqual(-1e-12));
        expect(Math.abs(values.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-10);
    }
});
