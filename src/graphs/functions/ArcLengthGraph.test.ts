import {ArcLengthGraph} from './ArcLengthGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {onLanguageChange, setLanguage} from '../../localization';
import {GraphPalette} from '../styles/GraphPalette';

const BOX = [-0.6, 2.2, 3.8, -1.3];
const DEFAULT = {a: 0, b: Math.PI, n: 2};

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        // Lesson views measure the canvas; a detached container has no size, so the view box is applied as given.
        container: document.createElement('div'),
        unitX: 100,
        unitY: 100,
        create: vi.fn((type: string, parents: any[], attributes: any) => {
            const object: any = {type, board, parents, attributes, handlers: {} as Record<string, () => void>};
            if (type === 'point') {
                const free = parents.every((parent: unknown) => typeof parent === 'number');
                object.x = free ? parents[0] : undefined;
                object.y = free ? parents[1] : undefined;
                object.X = () => (free ? object.x : parents[0]());
                object.Y = () => (free ? object.y : parents[1]());
                object.moveTo = vi.fn(([x, y]: number[]) => { object.x = x; object.y = y; });
                object.on = vi.fn((event: string, handler: () => void) => { object.handlers[event] = handler; });
            }
            if (type === 'curve') {
                object.dataX = parents[0];
                object.dataY = parents[1];
            }
            board.objectsList.push(object);
            return object;
        }),
        removeObject: vi.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((object: any) => !list.includes(object));
        }),
        getBoundingBox: vi.fn(() => BOX),
        setBoundingBox: vi.fn(),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

/** A graph whose React state is NOT updated synchronously, exactly like setState inside one lesson tick. */
function makeGraph({asyncState = true}: { asyncState?: boolean } = {}) {
    const graph = new ArcLengthGraph() as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn((patch: any) => { if (!asyncState) graph.store.setState(patch); });
    graph.initialize();
    return graph;
}

const apply = (graph: any, action: LessonAction) => graph.applyLessonAction(action);
const parameter = (name: any, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const boardObjectCount = (graph: any) => graph.board.objectsList.length;
const [POLYLINE, MARKERS] = [0, 1];
const [POINT_A, POINT_B] = [0, 1];
const curveData = (graph: any, index: number) => {
    const curve = ofType(graph, 'curve')[index];
    curve.updateDataArray();
    return {x: curve.dataX as number[], y: curve.dataY as number[]};
};
const groups = (list: number[]) => list.reduce<number[][]>((result, value) => {
    if (Number.isNaN(value)) result.push([]);
    else result[result.length - 1].push(value);
    return result;
}, [[]]);
const pointA = (graph: any) => ofType(graph, 'point')[POINT_A];
const pointB = (graph: any) => ofType(graph, 'point')[POINT_B];
/** The board's one text is the caption: line 0 the function, line 1 the lengths. */
const lengthsText = (graph: any) => graph.captionPlainLines()[1];

beforeEach(() => setLanguage('sl'));

test('initialization draws the sine, the polyline, the vertex markers, two endpoints on the graph and one caption text for [0, pi], n = 2', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual(DEFAULT);
    expect(graph.presets()).toBe('arc-length');
    expect(ofType(graph, 'functiongraph')).toHaveLength(1);
    expect(ofType(graph, 'curve')).toHaveLength(2);
    expect(ofType(graph, 'point')).toHaveLength(2);
    expect(ofType(graph, 'text')).toHaveLength(1);
    expect(boardObjectCount(graph)).toBe(6);
    expect(graph.captionPlainLines()).toEqual(['f(x) = sin x', 'lomljenka 3,7242, lok 3,8202']);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    expect(BOX[2] - BOX[0]).toBeCloseTo(1.27 * (BOX[1] - BOX[3]), 0);
    expect(ofType(graph, 'functiongraph')[0].parents[0](Math.PI / 2)).toBe(1);
    expect([pointA(graph).x, pointA(graph).y]).toEqual([0, 0]);
    expect(pointB(graph).x).toBe(Math.PI);
    expect(pointB(graph).y).toBeCloseTo(0, 12);
    expect(ofType(graph, 'curve')[POLYLINE].attributes.strokeColor).toBe(GraphPalette.constructionAccent);
    expect(lengthsText(graph)).toBe('lomljenka 3,7242, lok 3,8202');
});

test('the polyline is one curve through the n + 1 vertices on the graph; the vertices are n + 1 small closed octagons in one curve', () => {
    const graph = makeGraph();
    const polyline = curveData(graph, POLYLINE);
    expect(polyline.x).toEqual([0, Math.PI / 2, Math.PI]);
    expect(polyline.y[0]).toBe(0);
    expect(polyline.y[1]).toBe(1);
    expect(polyline.y[2]).toBeCloseTo(0, 12);
    const markers = curveData(graph, MARKERS);
    const octagons = groups(markers.x);
    expect(octagons).toHaveLength(3);
    octagons.forEach(octagon => {
        expect(octagon).toHaveLength(9);
        expect(octagon[8]).toBe(octagon[0]);
    });
    // the first octagon is centred on (0, 0) with radius of a few pixels, i.e. a few hundredths of a unit at 100 px per unit
    const first = groups(markers.y)[0];
    expect(Math.max(...octagons[0])).toBeGreaterThan(0.02);
    expect(Math.max(...octagons[0])).toBeLessThan(0.2);
    expect(Math.min(...first)).toBeCloseTo(-Math.max(...first), 12);
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [parameter('a', -1), parameter('b', 2), parameter('n', 12)]) apply(graph, action);
    expect(graph.model).toEqual({a: -1, b: 2, n: 12});
    expect(graph.state).toMatchObject(DEFAULT);
    expect([pointA(graph).x, pointB(graph).x]).toEqual([-1, 2]);
    expect(pointB(graph).y).toBeCloseTo(Math.sin(2), 12);
    expect(groups(curveData(graph, POLYLINE).x)[0]).toHaveLength(13);
    // a later action in the same tick sees the earlier one
    apply(graph, parameter('b', Math.PI));
    apply(graph, parameter('a', 0));
    apply(graph, parameter('n', 10));
    expect(lengthsText(graph)).toBe('lomljenka 3,8153, lok 3,8202');
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('arc-length')!;
    expect(lesson.steps).toHaveLength(5);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph();
        // a deliberately different user state that the default scene must reset
        apply(graph, parameter('a', -3));
        apply(graph, parameter('b', 5));
        apply(graph, parameter('n', 77));
        for (const action of step.scene!.actions) apply(graph, action);
        return [graph.model, lengthsText(graph)];
    });
    expect(finals).toEqual([
        [{a: 0, b: Math.PI, n: 1}, 'lomljenka 3,1416, lok 3,8202'],
        [{a: 0, b: Math.PI, n: 2}, 'lomljenka 3,7242, lok 3,8202'],
        [{a: 0, b: Math.PI, n: 10}, 'lomljenka 3,8153, lok 3,8202'],
        [{a: 0, b: Math.PI, n: 100}, 'lomljenka 3,8201, lok 3,8202'],
        [{a: 0, b: 2 * Math.PI, n: 2}, 'lomljenka 6,2832, lok 7,6404'],
    ]);
});

test('changing n regenerates the data but never the number of board objects', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    for (const n of [1, 100, 37, 2, 99, 1]) {
        apply(graph, parameter('n', n));
        expect(boardObjectCount(graph)).toBe(baseline);
        expect(graph.generatedObjectCount).toBe(baseline);
        expect(curveData(graph, POLYLINE).x).toHaveLength(n + 1);
        expect(groups(curveData(graph, MARKERS).x)).toHaveLength(n + 1);
    }
    apply(graph, parameter('a', 3));
    apply(graph, parameter('b', 3));
    expect(boardObjectCount(graph)).toBe(baseline);
    expect(lengthsText(graph)).toBe('lomljenka 0, lok 0');
});

test('a > b gives the same lengths, a = b gives 0', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', Math.PI));
    apply(graph, parameter('b', 0));
    expect(lengthsText(graph)).toBe('lomljenka 3,7242, lok 3,8202');
    const polyline = curveData(graph, POLYLINE);
    expect(polyline.x[0]).toBe(Math.PI);
    expect(polyline.x[2]).toBe(0);
});

test('dragging an endpoint keeps it on the graph, rounds to 0.01, clamps to the domain and does not move the objects again', () => {
    const graph = makeGraph();
    const a = pointA(graph);
    a.moveTo.mockClear();
    a.x = 1.23456;
    a.y = 5; // dragged off the graph
    a.handlers.drag();
    expect(graph.model.a).toBe(1.23);
    expect(a.moveTo).toHaveBeenCalledWith([1.23, Math.sin(1.23)]);
    expect([a.x, a.y]).toEqual([1.23, Math.sin(1.23)]);
    a.x = 99;
    a.handlers.drag();
    expect(graph.model.a).toBe(7);
    a.x = -99;
    a.handlers.drag();
    expect(graph.model.a).toBe(-7);
    const b = pointB(graph);
    b.x = -3.456;
    b.handlers.drag();
    expect(graph.model.b).toBe(-3.46);
    expect(b.y).toBeCloseTo(Math.sin(-3.46), 12);
    expect(lengthsText(graph)).toMatch(/^lomljenka .*lok/);
});

test('invalid values are rejected without changing the model', () => {
    const graph = makeGraph();
    const before = {...graph.model};
    for (const bad of [7.01, -7.01, NaN, Infinity]) {
        expect(() => apply(graph, parameter('a', bad))).toThrow();
        expect(() => apply(graph, parameter('b', bad))).toThrow();
    }
    for (const bad of [0, -1, 101, 2.5, NaN, Infinity]) expect(() => apply(graph, parameter('n', bad))).toThrow();
    expect(graph.model).toEqual(before);
    apply(graph, parameter('a', -7));
    apply(graph, parameter('b', 7));
    apply(graph, parameter('n', 1));
    apply(graph, parameter('n', 100));
    expect(graph.model).toEqual({a: -7, b: 7, n: 100});
});

test('names, targets and kinds the graph does not own are unsupported', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'y1', 'x2', 'y2', 'k', 'A', 'omega', 'phi', 'B', 'x0', 'h']) {
        expect(() => apply(graph, parameter(name, 1))).toThrow(UnsupportedLessonActionError);
    }
    for (const target of ['mirror', 'reference', 'tangent']) {
        expect(() => apply(graph, {kind: 'function-visibility', target, visible: true} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'function-choice', name: 'area-mode', value: 'between'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-choice', name: 'integral-function', value: 'sin'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
    expect(graph.model).toEqual(DEFAULT);
});

test('readouts: a, b, n, polyline length, arc length and difference, in both languages', () => {
    const graph = makeGraph({asyncState: false});
    const byId = () => Object.fromEntries((graph.renderReadout().props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));
    expect(byId()).toEqual({a: '0', b: '3,14', n: '2', polyline: '3,7242', arc: '3,8202', difference: '0,096'});
    setLanguage('en');
    apply(graph, parameter('n', 100));
    expect(byId()).toEqual({a: '0', b: '3.14', n: '100', polyline: '3.8201', arc: '3.8202', difference: '0'});
    expect(graph.renderReadout().props.note).toMatch(/never longer/);
    for (const [a, b] of [[-7, 7], [7, -7], [0, 0], [3, 3]]) for (const n of [1, 2, 100]) {
        apply(graph, parameter('a', a));
        apply(graph, parameter('b', b));
        apply(graph, parameter('n', n));
        expect(Object.values(byId()).join('|')).not.toMatch(/Infinity|NaN|—/);
        expect(lengthsText(graph)).not.toMatch(/Infinity|NaN/);
        expect(Number(byId().difference.replace('−', '-'))).toBeGreaterThanOrEqual(0);
    }
});

test('the caption follows the language, and a language change notifies subscribers', () => {
    const graph = makeGraph();
    apply(graph, parameter('n', 10));
    expect(graph.captionPlainLines()).toEqual(['f(x) = sin x', 'lomljenka 3,8153, lok 3,8202']);
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(graph.captionPlainLines()).toEqual(['f(x) = sin x', 'polyline 3.8153, arc 3.8202']);
    unsubscribe();
});

test('controls: endpoint inputs and an n slider 1-100', () => {
    const graph = makeGraph({asyncState: false});
    const found: Record<string, any[]> = {};
    const walk = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(walk);
        const name = node.type?.name;
        if (name) (found[name] ??= []).push(node);
        walk(node.props?.children);
    };
    walk([graph.renderControls(), graph.renderReveals()]);
    expect(found.ChoiceSelect).toBeUndefined();
    expect(found.NumberInput).toHaveLength(2);
    const [inputA, inputB] = found.NumberInput.map(node => node.props);
    expect([inputA.min, inputA.max, inputA.step, inputA.value, inputB.value]).toEqual([-7, 7, 0.01, 0, Math.PI]);
    inputA.onChange(-1.5);
    inputB.onChange(6.28);
    expect(graph.model).toMatchObject({a: -1.5, b: 6.28});
    expect([pointA(graph).x, pointB(graph).x]).toEqual([-1.5, 6.28]);
    expect(() => inputB.onChange(7.5)).not.toThrow();
    expect(graph.model.b).toBe(6.28);

    expect(found.Slider).toHaveLength(1);
    const slider = found.Slider[0].props;
    expect([slider.min, slider.max, slider.step, slider.value]).toEqual([1, 100, 1, 2]);
    expect(slider.formatValue).toBeUndefined(); // integer counts show the slider's integer number field
    slider.onChange(100);
    expect(graph.model.n).toBe(100);
    slider.onChange(1);
    expect(graph.model.n).toBe(1);
    expect(() => slider.onChange(0)).not.toThrow();
    expect(graph.model.n).toBe(1);
});

test('presets export the model, import it again, and sanitize bad data to the default model', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', 1));
    apply(graph, parameter('b', -1));
    apply(graph, parameter('n', 20));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('arc-length');
    expect(exported.data).toEqual({a: 1, b: -1, n: 20});
    graph.importPreset({id: 'stored', data: {a: -2, b: 3, n: 10, extra: true}});
    expect(graph.model).toEqual({a: -2, b: 3, n: 10});
    expect(pointA(graph).x).toBe(-2);
    expect(pointB(graph).x).toBe(3);
    graph.importPreset({id: 'stored', data: {a: 0, b: 1, n: 5}});
    expect(graph.model).toEqual({a: 0, b: 1, n: 5});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bad = [undefined, null, 'not json', {}, [], {a: 8, b: 0, n: 2}, {a: 0, b: -8, n: 2}, {a: 0, b: 1, n: 0}, {a: 0, b: 1, n: 101}, {a: 0, b: 1, n: 2.5}, {a: 0, b: 1}];
    for (const entry of bad) {
        graph.importPreset({id: 'stored', data: entry});
        expect(graph.model).toEqual(DEFAULT);
    }
    // A Preset without data (undefined, null) shows the default model without a warning; rejected data warns.
    expect(warn).toHaveBeenCalledTimes(bad.filter(entry => entry !== undefined && entry !== null).length);
    warn.mockRestore();
    graph.importPreset({id: 'arc-length', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {a: 0, b: 3, n: 6}});
    expect(graph.model).toEqual({a: 0, b: 3, n: 6});
    graph.importPreset({id: 'arc-length'});
    expect(graph.model).toEqual(DEFAULT);
});

test('capture and restore bring back the synchronous model even when React state lags', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', -1));
    apply(graph, parameter('b', 4));
    apply(graph, parameter('n', 30));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({a: -1, b: 4, n: 30});
    expect(checkpoint.value.graphState).toMatchObject({a: -1, b: 4, n: 30});
    apply(graph, defaultScene);
    apply(graph, parameter('n', 5));
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({a: -1, b: 4, n: 30});
    expect([pointA(graph).x, pointB(graph).x]).toEqual([-1, 4]);
    expect(curveData(graph, POLYLINE).x).toHaveLength(31);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
    expect(graph.setState).toHaveBeenLastCalledWith(expect.objectContaining({a: -1, b: 4, n: 30}));
});

test('default scene preparation resets model and view and keeps the object count stable', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    apply(graph, parameter('n', 90));
    apply(graph, parameter('b', 5));
    graph.board.setBoundingBox.mockClear();
    apply(graph, defaultScene);
    expect(graph.model).toEqual(DEFAULT);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    for (let i = 0; i < 5; i++) {
        apply(graph, parameter('n', 50 + i));
        apply(graph, defaultScene);
    }
    expect(boardObjectCount(graph)).toBe(baseline);
    expect([pointA(graph).x, pointB(graph).x]).toEqual([0, Math.PI]);
});

test('generated objects are disposed and not duplicated across repeated generation', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    expect(graph.generatedObjectCount).toBe(baseline);
    for (let i = 0; i < 4; i++) graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    expect(graph.generatedObjectCount).toBe(baseline);
    graph.disposeFigureScene();
    expect(boardObjectCount(graph)).toBe(0);
    expect(graph.generatedObjectCount).toBe(0);
    // no stale reference to the removed points: a model change after disposal must not touch them
    expect(() => apply(graph, parameter('a', 1))).not.toThrow();
    graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    graph.graphSession = {isReady: false, isAlive: false};
    graph.disposeFigureScene();
    expect(graph.generatedObjectCount).toBe(0);
});

test('a stored board state is not overwritten by the default view during initialization', () => {
    const graph = new ArcLengthGraph() as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn();
    graph.importPreset({id: 'arc-length', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {a: 0, b: 2, n: 4}});
    graph.board.setBoundingBox.mockClear();
    graph.initialize();
    expect(graph.board.setBoundingBox).not.toHaveBeenCalled();
});

test('figure export preset state follows the imported model', () => {
    const graph = makeGraph();
    graph.importFigurePresetData({id: 'arc-length', data: {a: 1, b: 2, n: 8}});
    expect(graph.figurePresetGraphState(undefined)).toMatchObject({initialized: true, a: 1, b: 2, n: 8});
});
