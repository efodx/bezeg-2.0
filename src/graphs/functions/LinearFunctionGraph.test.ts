import {LinearFunctionGraph} from './LinearFunctionGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {onLanguageChange, setLanguage} from '../../localization';

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        create: jest.fn((type: string, parents: any[], attributes: any) => {
            const object: any = {type, board, parents, attributes, handlers: {} as Record<string, () => void>, snapLog: [] as boolean[]};
            const free = type === 'point' && parents.every((parent: unknown) => typeof parent === 'number');
            if (type === 'point') {
                object.x = free ? parents[0] : undefined;
                object.y = free ? parents[1] : undefined;
                object.X = () => (free ? object.x : parents[0]());
                object.Y = () => (free ? object.y : parents[1]());
                object.moveTo = jest.fn(([x, y]: number[]) => { object.x = x; object.y = y; });
                object.setAttribute = jest.fn((attribute: any) => { object.snapLog.push(attribute.snapToGrid); });
                object.on = jest.fn((event: string, handler: () => void) => { object.handlers[event] = handler; });
            }
            board.objectsList.push(object);
            return object;
        }),
        removeObject: jest.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((object: any) => !list.includes(object));
        }),
        getBoundingBox: jest.fn(() => [-6, 8, 6, -4]),
        setBoundingBox: jest.fn(),
        fullUpdate: jest.fn(),
        update: jest.fn(),
    };
    return board;
}

/** A graph whose React state is NOT updated synchronously, exactly like setState inside one lesson tick. */
function makeGraph({asyncState = true}: { asyncState?: boolean } = {}) {
    const graph = new LinearFunctionGraph({}) as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = jest.fn();
    graph.setState = jest.fn((patch: any) => { if (!asyncState) graph.state = {...graph.state, ...patch}; });
    graph.initialize();
    return graph;
}

const apply = (graph: any, action: LessonAction) => graph.applyLessonAction(action);
const parameter = (name: any, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const points = (graph: any) => graph.board.objectsList.filter((object: any) => object.type === 'point' && object.x !== undefined)
    .map((object: any) => [object.x, object.y]);
const boardObjectCount = (graph: any) => graph.board.objectsList.length;

beforeEach(() => setLanguage('sl'));

test('initialization draws the default points and keeps k, n and the model in the lesson example', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({x1: 0, y1: 1, x2: 2, y2: 5});
    expect(points(graph)).toEqual([[0, 1], [2, 5]]);
    expect(graph.presets()).toBe('linear-function');
    const types = graph.board.objectsList.map((object: any) => object.type);
    expect(types.filter((type: string) => type === 'line')).toHaveLength(1);
    expect(types.filter((type: string) => type === 'segment')).toHaveLength(2);
    expect(types.filter((type: string) => type === 'text')).toHaveLength(3);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith([-6, 8, 6, -4], true);
});

test('a multi-action scene applied in one synchronous tick gives the expected line even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [parameter('x1', 1), parameter('y1', 2), parameter('x2', 3), parameter('y2', 6)]) apply(graph, action);
    // The line through (1,2) and (3,6) is y = 2x; React state still holds the old values.
    expect(graph.model).toEqual({x1: 1, y1: 2, x2: 3, y2: 6});
    expect(graph.state).toMatchObject({x1: 0, y1: 1, x2: 2, y2: 5});
    apply(graph, parameter('k', -1));
    // k is applied to the model written a moment earlier (n = 0 there): both points move along y = -x, keeping their x.
    expect(graph.model).toEqual({x1: 1, y1: -1, x2: 3, y2: -3});
    expect(points(graph)).toEqual([[1, -1], [3, -3]]);
    apply(graph, parameter('n', 2));
    expect(graph.model).toEqual({x1: 1, y1: 1, x2: 3, y2: -1});
    expect(graph.state).toMatchObject({x1: 0, y1: 1, x2: 2, y2: 5});
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('linear-function')!;
    const finals = lesson.steps.map(step => {
        const graph = makeGraph();
        // Start from a deliberately different user state so that the default scene has to reset it.
        apply(graph, parameter('x1', -3));
        apply(graph, parameter('y2', 9));
        for (const action of step.scene!.actions) apply(graph, action);
        return graph.model;
    });
    expect(finals).toEqual([
        {x1: 0, y1: 1, x2: 2, y2: 5},
        {x1: 0, y1: 1, x2: 2, y2: 5},
        {x1: 0, y1: -2, x2: 2, y2: 2},
        {x1: 0, y1: 1, x2: 2, y2: 0},
        {x1: 1, y1: -1, x2: 1, y2: 3},
    ]);
});

test('k and n keep the x-coordinates; they are rejected without mutation for a vertical line or coincident points', () => {
    const graph = makeGraph();
    apply(graph, parameter('n', -2));
    expect(graph.model).toEqual({x1: 0, y1: -2, x2: 2, y2: 2});
    for (const [x1, y1, x2, y2] of [[1, 0, 1, 4], [2, 2, 2, 2]]) {
        for (const [name, value] of [['x1', x1], ['y1', y1], ['x2', x2], ['y2', y2]] as const) apply(graph, parameter(name, value));
        const before = {...graph.model};
        expect(() => apply(graph, parameter('k', 3))).toThrow(/vertical line or coincident/);
        expect(() => apply(graph, parameter('n', 3))).toThrow(/vertical line or coincident/);
        expect(graph.model).toEqual(before);
    }
});

test.each([NaN, Infinity, -Infinity, 1001, -1e6])('out-of-domain value %p is rejected without mutation', value => {
    const graph = makeGraph();
    const before = {...graph.model};
    for (const name of ['x1', 'y1', 'x2', 'y2', 'k', 'n'] as const) {
        expect(() => apply(graph, parameter(name, value))).toThrow();
    }
    expect(graph.model).toEqual(before);
});

test('a slope that would push a point beyond the domain is rejected without mutation', () => {
    const graph = makeGraph();
    expect(() => apply(graph, parameter('k', 600))).toThrow(/within 1000/);
    expect(graph.model).toEqual({x1: 0, y1: 1, x2: 2, y2: 5});
});

test('names the graph does not own are unsupported', () => {
    const graph = makeGraph();
    expect(() => apply(graph, parameter('a', 1))).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
});

test('dragging a point updates the model without moving the board objects again', () => {
    const graph = makeGraph();
    const [p1, p2] = graph.board.objectsList.filter((object: any) => object.type === 'point' && object.x !== undefined);
    p2.x = 3.1;
    p2.y = -0.7;
    p2.handlers.drag();
    expect(graph.model).toEqual({x1: 0, y1: 1, x2: 3.1, y2: -0.7});
    expect(p1.moveTo).not.toHaveBeenCalled();
    expect(p2.moveTo).not.toHaveBeenCalled();
    // grid noise from snapping is removed
    p1.x = 0.30000000000000004;
    p1.handlers.drag();
    expect(graph.model.x1).toBe(0.3);
});

test('programmatic moves pause grid snapping and restore it', () => {
    const graph = makeGraph();
    const [p1] = graph.board.objectsList.filter((object: any) => object.type === 'point' && object.x !== undefined);
    apply(graph, parameter('k', 0.33));
    expect(p1.snapLog).toEqual([false, true]);
    expect(p1.attributes.snapToGrid).toBe(true);
    expect(p1.attributes.snapSizeX).toBe(0.1);
    expect(points(graph)[1][1]).toBeCloseTo(0.33 * 2 + 1, 12);
});

test('readouts never contain Infinity or NaN, including the vertical and coincident cases', () => {
    const graph = makeGraph({asyncState: false});
    const rowsFor = (...coordinates: number[]) => {
        ['x1', 'y1', 'x2', 'y2'].forEach((name, index) => apply(graph, parameter(name, coordinates[index])));
        return graph.renderReadout().props.rows as { id: string; value: string }[];
    };
    const text = (rows: { value: string }[]) => rows.map(row => row.value).join('|');
    expect(text(rowsFor(0, 1, 2, 5))).toBe('y = 2x + 1|2|1|2|4');
    const vertical = rowsFor(1, -1, 1, 3);
    expect(text(vertical)).toBe('x = 1|ni določen|ni določen|0|4');
    expect(graph.renderReadout().props.note).toMatch(/navpična/);
    const coincident = rowsFor(2, 2, 2, 2);
    expect(text(coincident)).toMatch(/^—\|ni določen\|ni določen\|0\|0$/);
    expect(graph.renderReadout().props.note).toMatch(/sovpadata/);
    for (const rows of [vertical, coincident]) expect(text(rows)).not.toMatch(/Infinity|NaN/);
    setLanguage('en');
    expect(text(rowsFor(0, 1, 2, 5)).split('|')[0]).toBe('y = 2x + 1');
    expect(text(rowsFor(0, 0, 3, -1)).split('|')[1]).toBe('−0.33');
});

test('the caption follows the language, and a language change notifies subscribers', () => {
    const graph = makeGraph();
    apply(graph, parameter('k', -0.5));
    setLanguage('sl');
    expect(graph.captionPlainLines()).toEqual(['y = −0,5x + 1']);
    const listener = jest.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(graph.captionPlainLines()).toEqual(['y = −0.5x + 1']);
    unsubscribe();
    setLanguage('sl');
    expect(listener).toHaveBeenCalledTimes(1);
});

test('presets export the model, import it again, and sanitize bad data to the default model', () => {
    const graph = makeGraph();
    apply(graph, parameter('x2', 4));
    const exported = graph.exportPreset();
    expect(exported.data).toEqual({x1: 0, y1: 1, x2: 4, y2: 5});
    expect(exported.id).toBe('linear-function');
    graph.importPresetData({x1: 5, y1: 6, x2: 7, y2: 8});
    expect(graph.model).toEqual({x1: 5, y1: 6, x2: 7, y2: 8});
    expect(points(graph)).toEqual([[5, 6], [7, 8]]);
    graph.importPresetData(JSON.stringify({x1: 1, y1: 2, x2: 3, y2: 4}));
    expect(graph.model).toEqual({x1: 1, y1: 2, x2: 3, y2: 4});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const bad of [undefined, null, 'not json', {x1: 1}, {x1: 1, y1: 2, x2: 3, y2: NaN}, [], {x1: 1e12, y1: 0, x2: 0, y2: 0}]) {
        graph.importPresetData(bad);
        expect(graph.model).toEqual({x1: 0, y1: 1, x2: 2, y2: 5});
    }
    expect(warn).toHaveBeenCalledTimes(7);
    warn.mockRestore();
    graph.importPreset({id: 'linear-function', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {x1: 2, y1: 2, x2: 4, y2: 8}});
    expect(graph.model).toEqual({x1: 2, y1: 2, x2: 4, y2: 8});
    graph.importPreset({id: 'linear-function'});
    expect(graph.model).toEqual({x1: 0, y1: 1, x2: 2, y2: 5});
});

test('capture and restore bring back the synchronous model even when React state lags', () => {
    const graph = makeGraph();
    apply(graph, parameter('x1', -2));
    apply(graph, parameter('y2', 7));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({x1: -2, y1: 1, x2: 2, y2: 7});
    expect(checkpoint.value.graphState).toMatchObject({x1: -2, y1: 1, x2: 2, y2: 7});
    apply(graph, defaultScene);
    apply(graph, parameter('n', 4));
    expect(graph.model).not.toEqual({x1: -2, y1: 1, x2: 2, y2: 7});
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({x1: -2, y1: 1, x2: 2, y2: 7});
    expect(points(graph)).toEqual([[-2, 1], [2, 7]]);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
    expect(graph.setState).toHaveBeenLastCalledWith(expect.objectContaining({x1: -2, y1: 1, x2: 2, y2: 7}));
});

test('default scene preparation resets model and view and keeps the object count stable', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    apply(graph, parameter('x2', 9));
    graph.board.setBoundingBox.mockClear();
    apply(graph, defaultScene);
    expect(graph.model).toEqual({x1: 0, y1: 1, x2: 2, y2: 5});
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith([-6, 8, 6, -4], true);
    for (let i = 0; i < 5; i++) {
        apply(graph, parameter('k', i));
        apply(graph, defaultScene);
    }
    expect(boardObjectCount(graph)).toBe(baseline);
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
    expect(graph.p1).toBeUndefined();
    graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    // a dead session drops its references without touching the board
    graph.graphSession = {isReady: false, isAlive: false};
    graph.disposeFigureScene();
    expect(graph.generatedObjectCount).toBe(0);
});

test('a stored board state is not overwritten by the default view during initialization', () => {
    const graph = new LinearFunctionGraph({}) as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = jest.fn();
    graph.setState = jest.fn();
    graph.importPreset({id: 'linear-function', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {x1: 0, y1: 0, x2: 1, y2: 1}});
    graph.board.setBoundingBox.mockClear();
    graph.initialize();
    expect(graph.board.setBoundingBox).not.toHaveBeenCalled();
});

test('figure export preset state follows the imported model', () => {
    const graph = makeGraph();
    graph.importFigurePresetData({id: 'linear-function', data: {x1: 1, y1: 1, x2: 3, y2: 2}});
    const state = graph.figurePresetGraphState(undefined);
    expect(state).toMatchObject({initialized: true, x1: 1, y1: 1, x2: 3, y2: 2});
});
