import AlphaParamBezierCurveGraph, {alphaParameterization} from './AlphaParamBezierCurveGraph';

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
    };
    return board;
}

function makeGraph(initial = {alpha: 0.5, numberOfPoints: 10}) {
    const graph = Object.create(AlphaParamBezierCurveGraph.prototype) as any;
    graph.board = fakeBoard();
    // Two stand-in control points owned by the curve; they must survive sample regeneration.
    graph.controlPoints = [graph.board.create('point', [0, 0]), graph.board.create('point', [1, 1])];
    graph.sampleMarkers = [];
    graph.graphJXGPoints = [];
    graph.jxgCurves = [{getCurve: () => ({eval: (t: number) => ({X: () => t, Y: () => 2 * t})}), isSelected: () => false}];
    graph.graphSession = {isReady: true, isAlive: true};
    graph.store.replaceState({...initial, initialized: true});
    graph.setState = vi.fn((patch: any) => { graph.store.setState(patch); });
    // Class fields are not on the prototype, so mirror the graph's own definition.
    graph.alphaParam = (t: number) => alphaParameterization(graph.state.alpha, t);
    const curve = graph.jxgCurves[0];
    graph.importPresetData = vi.fn(() => { graph.disposeFigureScene(); graph.jxgCurves = [curve]; });
    return graph;
}

const sampleCount = (graph: any) => graph.sampleMarkers.length;
const pointsOnBoard = (graph: any) => graph.board.objectsList.filter((o: any) => o.type === 'point').length;
const lesson = (graph: any, action: any) => graph.applyLessonAction(action);

test('alpha action sets alpha', () => {
    const graph = makeGraph();
    lesson(graph, {kind: 'parameterization-alpha', value: 0.25});
    expect(graph.state.alpha).toBe(0.25);
    lesson(graph, {kind: 'parameterization-alpha', value: 0});
    lesson(graph, {kind: 'parameterization-alpha', value: 1});
    expect(graph.state.alpha).toBe(1);
});

test.each([-0.1, 1.1, NaN, Infinity])('alpha %p is rejected without mutation', value => {
    const graph = makeGraph();
    const before = {...graph.state};
    expect(() => lesson(graph, {kind: 'parameterization-alpha', value})).toThrow(/from 0 to 1/);
    expect(graph.state).toEqual(before);
    expect(graph.setState).not.toHaveBeenCalled();
});

test('samples action sets count and regenerates exactly that many markers', () => {
    const graph = makeGraph();
    graph.generateParamPoints();
    lesson(graph, {kind: 'parameterization-samples', count: 3});
    expect(graph.state.numberOfPoints).toBe(3);
    expect(sampleCount(graph)).toBe(3);
    expect(pointsOnBoard(graph)).toBe(3 + 2);
    lesson(graph, {kind: 'parameterization-samples', count: 40});
    expect(sampleCount(graph)).toBe(40);
    lesson(graph, {kind: 'parameterization-samples', count: 1});
    expect(sampleCount(graph)).toBe(1);
});

test.each([0, 41, 2.5, NaN, -1])('samples %p is rejected without mutation', count => {
    const graph = makeGraph();
    graph.generateParamPoints();
    const objects = [...graph.board.objectsList];
    expect(() => lesson(graph, {kind: 'parameterization-samples', count})).toThrow(/integer from 1 to 40/);
    expect(graph.state.numberOfPoints).toBe(10);
    expect(graph.board.objectsList).toEqual(objects);
});

test('mode action is unsupported here', () => {
    const graph = makeGraph();
    expect(() => lesson(graph, {kind: 'parameterization-mode', mode: 'uniform'})).toThrow(/does not support lesson action/);
    expect(graph.setState).not.toHaveBeenCalled();
});

test('default scene restores alpha 1/2, 10 samples and the default preset', () => {
    const graph = makeGraph({alpha: 0.9, numberOfPoints: 4});
    graph.generateParamPoints();
    lesson(graph, {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'});
    expect(graph.importPresetData).toHaveBeenCalledTimes(1);
    expect(graph.state).toMatchObject({alpha: 0.5, numberOfPoints: 10});
    expect(sampleCount(graph)).toBe(10);
    expect(pointsOnBoard(graph)).toBe(10 + 2);
});

test('repeated regeneration and restore do not accumulate sample points', () => {
    const graph = makeGraph();
    graph.generateParamPoints();
    for (let i = 0; i < 5; i++) {
        lesson(graph, {kind: 'parameterization-samples', count: 7});
        lesson(graph, {kind: 'parameterization-alpha', value: 0.3});
        graph.clearPoints();
        graph.generateParamPoints();
    }
    expect(sampleCount(graph)).toBe(7);
    expect(graph.graphJXGPoints.length).toBe(sampleCount(graph));
    expect(pointsOnBoard(graph)).toBe(7 + 2);
    // Checkpoint restore: preset import disposes scene samples, then state change triggers onStateChange.
    graph.getFirstJxgCurve = () => graph.jxgCurves[0];
    graph.importPresetData();
    expect(sampleCount(graph)).toBe(0);
    const prevState = graph.state;
    graph.store.replaceState({...prevState, numberOfPoints: 5, alpha: 0.75});
    graph.onStateChange(prevState);
    expect(sampleCount(graph)).toBe(5);
    expect(pointsOnBoard(graph)).toBe(5 + 2);
    expect(graph.board.objectsList).toEqual(expect.arrayContaining(graph.controlPoints));
});

test('alpha and count changes leave control points untouched', () => {
    const graph = makeGraph();
    graph.generateParamPoints();
    const controls = [...graph.controlPoints];
    lesson(graph, {kind: 'parameterization-samples', count: 2});
    lesson(graph, {kind: 'parameterization-alpha', value: 0.8});
    expect(graph.controlPoints).toEqual(controls);
    controls.forEach(c => expect(graph.board.objectsList).toContain(c));
    expect(graph.graphJXGPoints.some((p: any) => controls.includes(p))).toBe(false);
});

test('sample positions follow phi_alpha at the sample parameters', () => {
    const graph = makeGraph({alpha: 0.25, numberOfPoints: 3});
    graph.generateParamPoints();
    const xs = graph.sampleMarkers.map((p: any) => p.args[0]());
    expect(xs[0]).toBeCloseTo(1 / 2, 12);
    expect(xs[1]).toBeCloseTo(3 / 4, 12);
    expect(xs[2]).toBeCloseTo(9 / 10, 12);
    graph.store.replaceState({...graph.state, alpha: 0.75});
    const ys = graph.sampleMarkers.map((p: any) => p.args[1]() / 2);
    expect(ys[0]).toBeCloseTo(1 / 10, 12);
    expect(ys[1]).toBeCloseTo(1 / 4, 12);
    expect(ys[2]).toBeCloseTo(1 / 2, 12);
});

describe('phi_alpha(t) = (1-a)t / (a(1-t) + (1-a)t)', () => {
    const ts = [0, 0.1, 0.25, 0.5, 0.7, 0.9, 1];
    test.each(ts)('alpha 1/2 is the identity at t=%p', t => {
        expect(alphaParameterization(0.5, t)).toBeCloseTo(t, 12);
    });
    test('alpha 1/4 with N=3 gives 1/2, 3/4, 9/10', () => {
        [1 / 4, 2 / 4, 3 / 4].forEach((t, i) =>
            expect(alphaParameterization(0.25, t)).toBeCloseTo([1 / 2, 3 / 4, 9 / 10][i], 12));
    });
    test('alpha 3/4 with N=3 gives 1/10, 1/4, 1/2', () => {
        [1 / 4, 2 / 4, 3 / 4].forEach((t, i) =>
            expect(alphaParameterization(0.75, t)).toBeCloseTo([1 / 10, 1 / 4, 1 / 2][i], 12));
    });
    test.each([0.2, 0.25, 0.4])('symmetry phi_{1-a}(t) = 1 - phi_a(1-t) for a=%p', a => {
        ts.forEach(t => expect(alphaParameterization(1 - a, t)).toBeCloseTo(1 - alphaParameterization(a, 1 - t), 12));
    });
    test.each([0.1, 0.25, 0.5, 0.75, 0.9])('fixes the endpoints and is increasing for alpha=%p', a => {
        expect(alphaParameterization(a, 0)).toBe(0);
        expect(alphaParameterization(a, 1)).toBeCloseTo(1, 12);
        let previous = -Infinity;
        for (let k = 0; k <= 100; k++) {
            const value = alphaParameterization(a, k / 100);
            expect(value).toBeGreaterThan(previous);
            previous = value;
        }
    });
});
