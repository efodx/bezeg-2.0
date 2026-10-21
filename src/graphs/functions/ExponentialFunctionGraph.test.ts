import {ExponentialFunctionGraph} from './ExponentialFunctionGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {onLanguageChange, setLanguage} from '../../localization';

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        create: vi.fn((type: string, parents: any[], attributes: any) => {
            const object: any = {type, board, parents, attributes};
            board.objectsList.push(object);
            return object;
        }),
        removeObject: vi.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((object: any) => !list.includes(object));
        }),
        getBoundingBox: vi.fn(() => [-5, 9, 5, -3]),
        setBoundingBox: vi.fn(),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

/** A graph whose React state is NOT updated synchronously, exactly like setState inside one lesson tick. */
function makeGraph({asyncState = true}: { asyncState?: boolean } = {}) {
    const graph = new ExponentialFunctionGraph() as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn((patch: any) => { if (!asyncState) graph.store.setState(patch); });
    graph.initialize();
    return graph;
}

const apply = (graph: any, action: LessonAction) => graph.applyLessonAction(action);
const parameter = (name: any, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const mirror = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'mirror', visible});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const curves = (graph: any) => ofType(graph, 'functiongraph');
const [MIRROR, MAIN] = [0, 1];
const boardObjectCount = (graph: any) => graph.board.objectsList.length;

beforeEach(() => setLanguage('sl'));

test('initialization draws f(x) = 2^x, the mirror graph (hidden), the points (0,1) and (1,a), and the default view', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({a: 2, mirror: false});
    expect(graph.presets()).toBe('exponential-function');
    expect(curves(graph)).toHaveLength(2);
    expect(ofType(graph, 'point')).toHaveLength(2);
    expect(ofType(graph, 'text')).toHaveLength(1);
    const [fixed, moving] = ofType(graph, 'point');
    expect(fixed.parents).toEqual([0, 1]);
    expect(moving.parents[0]).toBe(1);
    expect(moving.parents[1]()).toBe(2);
    expect(curves(graph)[MAIN].parents[0](3)).toBe(8);
    expect(curves(graph)[MIRROR].parents[0](3)).toBe(0.125);
    expect(curves(graph)[MIRROR].attributes.visible()).toBe(false);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith([-5, 9, 5, -3], true);
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    apply(graph, parameter('a', 0.5));
    apply(graph, mirror(true));
    expect(graph.model).toEqual({a: 0.5, mirror: true});
    expect(graph.state).toMatchObject({a: 2, mirror: false});
    // the board objects read the synchronous model
    expect(curves(graph)[MAIN].parents[0](2)).toBe(0.25);
    expect(curves(graph)[MIRROR].parents[0](2)).toBe(4);
    expect(curves(graph)[MIRROR].attributes.visible()).toBe(true);
    expect(ofType(graph, 'point')[1].parents[1]()).toBe(0.5);
    apply(graph, mirror(false));
    apply(graph, parameter('a', 3));
    expect(graph.model).toEqual({a: 3, mirror: false});
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('exponential-function')!;
    const finals = lesson.steps.map(step => {
        const graph = makeGraph();
        // Start from a deliberately different user state so that the default scene has to reset it.
        apply(graph, parameter('a', 4.5));
        apply(graph, mirror(true));
        for (const action of step.scene!.actions) apply(graph, action);
        return graph.model;
    });
    expect(finals).toEqual([
        {a: 2, mirror: false},
        {a: 2, mirror: false},
        {a: 0.5, mirror: false},
        {a: 2, mirror: true},
        {a: 2, mirror: false},
    ]);
});

test('the lesson example gives f(0..3) = 1, 2, 4, 8 on the drawn curve, and a = 0.5 decays', () => {
    const graph = makeGraph();
    const f = (x: number) => curves(graph)[MAIN].parents[0](x);
    expect([0, 1, 2, 3].map(f)).toEqual([1, 2, 4, 8]);
    apply(graph, parameter('a', 0.5));
    expect([0, 1, 2, 3].map(f)).toEqual([1, 0.5, 0.25, 0.125]);
    apply(graph, parameter('a', 1));
    expect([-2, 0, 5].map(f)).toEqual([1, 1, 1]);
});

test('the mirror graph is the reflection of the main graph over the y-axis', () => {
    const graph = makeGraph();
    for (const a of [0.1, 0.35, 2, 4.95]) {
        apply(graph, parameter('a', a));
        for (const x of [-3, -1, 0.5, 2]) {
            expect(curves(graph)[MIRROR].parents[0](x)).toBeCloseTo(curves(graph)[MAIN].parents[0](-x), 9);
        }
    }
});

test('the base slider arithmetic is cleaned of floating-point noise', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', 0.1 + 3 * 0.05));
    expect(graph.model.a).toBe(0.25);
});

test.each([0, -1, -0.5, 0.09, 5.01, NaN, Infinity, -Infinity, 1e9])('base %p is rejected without mutation', value => {
    const graph = makeGraph();
    apply(graph, parameter('a', 0.5));
    const before = {...graph.model};
    expect(() => apply(graph, parameter('a', value))).toThrow();
    expect(graph.model).toEqual(before);
});

test('names and targets the graph does not own are unsupported', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'y1', 'x2', 'y2', 'k', 'n']) expect(() => apply(graph, parameter(name, 1))).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-visibility', target: 'tangent', visible: true} as any)).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
    expect(graph.model).toEqual({a: 2, mirror: false});
});

test('readouts show a, f(0), f(1) and the classification, and never contain Infinity or NaN', () => {
    const graph = makeGraph({asyncState: false});
    const rows = () => graph.renderReadout().props.rows as { id: string; value: string }[];
    const byId = () => Object.fromEntries(rows().map(row => [row.id, row.value]));
    expect(byId()).toEqual({a: '2', f0: '1', f1: '2', behavior: 'narašča (a > 1)'});
    apply(graph, parameter('a', 0.5));
    expect(byId()).toEqual({a: '0,5', f0: '1', f1: '0,5', behavior: 'pada (0 < a < 1)'});
    apply(graph, parameter('a', 1));
    expect(byId().behavior).toBe('konstantna (a = 1)');
    apply(graph, parameter('a', 0.1));
    apply(graph, mirror(true));
    expect(byId()['mirror-base']).toBe('10');
    for (const a of [0.1, 0.3, 1, 5]) {
        apply(graph, parameter('a', a));
        expect(rows().map(row => row.value).join('|')).not.toMatch(/Infinity|NaN/);
    }
    setLanguage('en');
    apply(graph, parameter('a', 0.5));
    expect(byId()).toMatchObject({a: '0.5', f1: '0.5', behavior: 'decays (0 < a < 1)'});
    expect(byId()['mirror-base']).toBe('2');
});

test('the caption follows the language, shows the mirror line only while the mirror is shown, and a language change notifies subscribers', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', 0.5));
    expect(graph.captionPlainLines()).toEqual(['f(x) = 0,5^x']);
    apply(graph, mirror(true));
    expect(graph.captionPlainLines()).toEqual(['f(x) = 0,5^x', '(1/a)^x = 2^x (zrcalni graf)']);
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(graph.captionPlainLines()).toEqual(['f(x) = 0.5^x', '(1/a)^x = 2^x (mirror graph)']);
    unsubscribe();
});

test('presets export the model, import it again, and sanitize bad data to the default model', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', 3));
    apply(graph, mirror(true));
    const exported = graph.exportPreset();
    expect(exported.data).toEqual({a: 3, mirror: true});
    expect(exported.id).toBe('exponential-function');
    graph.importPreset({id: 'stored', data: {a: 0.25, mirror: false}});
    expect(graph.model).toEqual({a: 0.25, mirror: false});
    graph.importPreset({id: 'stored', data: {a: 4}});
    expect(graph.model).toEqual({a: 4, mirror: false});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const bad of [undefined, null, 'not json', {}, {a: 0}, {a: -3}, {a: 1e9}, {a: NaN}, {a: 2, mirror: 'yes'}, []]) {
        graph.importPreset({id: 'stored', data: bad});
        expect(graph.model).toEqual({a: 2, mirror: false});
    }
    // A Preset without data (undefined, null) shows the default model without a warning; rejected data warns.
    expect(warn).toHaveBeenCalledTimes(8);
    warn.mockRestore();
    graph.importPreset({id: 'exponential-function', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {a: 1.5, mirror: true}});
    expect(graph.model).toEqual({a: 1.5, mirror: true});
    graph.importPreset({id: 'exponential-function'});
    expect(graph.model).toEqual({a: 2, mirror: false});
});

test('capture and restore bring back the synchronous model even when React state lags', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', 0.3));
    apply(graph, mirror(true));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({a: 0.3, mirror: true});
    expect(checkpoint.value.graphState).toMatchObject({a: 0.3, mirror: true});
    apply(graph, defaultScene);
    apply(graph, parameter('a', 4));
    expect(graph.model).toEqual({a: 4, mirror: false});
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({a: 0.3, mirror: true});
    expect(curves(graph)[MAIN].parents[0](1)).toBe(0.3);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
    expect(graph.setState).toHaveBeenLastCalledWith(expect.objectContaining({a: 0.3, mirror: true}));
});

test('default scene preparation resets model and view and keeps the object count stable', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    apply(graph, parameter('a', 4));
    apply(graph, mirror(true));
    graph.board.setBoundingBox.mockClear();
    apply(graph, defaultScene);
    expect(graph.model).toEqual({a: 2, mirror: false});
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith([-5, 9, 5, -3], true);
    for (let i = 0; i < 5; i++) {
        apply(graph, parameter('a', 0.5 + i));
        apply(graph, mirror(i % 2 === 0));
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
    graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    graph.graphSession = {isReady: false, isAlive: false};
    graph.disposeFigureScene();
    expect(graph.generatedObjectCount).toBe(0);
});

test('a stored board state is not overwritten by the default view during initialization', () => {
    const graph = new ExponentialFunctionGraph() as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn();
    graph.importPreset({id: 'exponential-function', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {a: 1.5, mirror: false}});
    graph.board.setBoundingBox.mockClear();
    graph.initialize();
    expect(graph.board.setBoundingBox).not.toHaveBeenCalled();
});

test('figure export preset state follows the imported model', () => {
    const graph = makeGraph();
    graph.importFigurePresetData({id: 'exponential-function', data: {a: 1.5, mirror: true}});
    expect(graph.figurePresetGraphState(undefined)).toMatchObject({initialized: true, a: 1.5, mirror: true});
});
