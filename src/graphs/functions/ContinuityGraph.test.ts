import {ContinuityGraph} from './ContinuityGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {onLanguageChange, setLanguage} from '../../localization';
import {GraphPalette} from '../styles/GraphPalette';

const BOX = [-2, 5, 4, -2];

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        create: jest.fn((type: string, parents: any[], attributes: any) => {
            const object: any = {type, board, parents, attributes};
            board.objectsList.push(object);
            return object;
        }),
        removeObject: jest.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((object: any) => !list.includes(object));
        }),
        getBoundingBox: jest.fn(() => BOX),
        setBoundingBox: jest.fn(),
        fullUpdate: jest.fn(),
        update: jest.fn(),
    };
    return board;
}

/** A graph whose React state is NOT updated synchronously, exactly like setState inside one lesson tick. */
function makeGraph({asyncState = true}: { asyncState?: boolean } = {}) {
    const graph = new ContinuityGraph({}) as any;
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
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const [LEFT, RIGHT] = [0, 1];
const [OPEN, FILLED] = [0, 1];
const [STATUS_TEXT, LIMITS_TEXT] = [0, 1];
const pieces = (graph: any) => ofType(graph, 'curve');
const points = (graph: any) => ofType(graph, 'point');
const boardObjectCount = (graph: any) => graph.board.objectsList.length;
const data = (curve: any) => {
    curve.updateDataArray();
    return {x: curve.dataX as number[], y: curve.dataY as number[]};
};
const pointY = (point: any) => point.parents[1]();
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const MATCH = GraphPalette.primaryCurve;
const MISMATCH = GraphPalette.constructionLevels[5];

beforeEach(() => setLanguage('sl'));

test('initialization draws the two pieces, the hollow and the filled point, and two texts for a = 1', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({a: 1});
    expect(graph.presets()).toBe('piecewise-continuity');
    expect(pieces(graph)).toHaveLength(2);
    expect(points(graph)).toHaveLength(2);
    expect(ofType(graph, 'text')).toHaveLength(2);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith([-2, 5, 4, -2], true);
    // the filled point is the value and left limit (1, a), the hollow point the right limit (1, 3 - a)
    expect(points(graph)[FILLED].parents[0]).toBe(1);
    expect(points(graph)[OPEN].parents[0]).toBe(1);
    expect(pointY(points(graph)[FILLED])).toBe(1);
    expect(pointY(points(graph)[OPEN])).toBe(2);
    expect(points(graph)[OPEN].attributes.fixed).toBe(true);
    expect(points(graph)[FILLED].attributes.fixed).toBe(true);
});

test('each piece is clipped to its own domain: left up to and including 1, right strictly right of 1', () => {
    const graph = makeGraph();
    const left = data(pieces(graph)[LEFT]);
    const right = data(pieces(graph)[RIGHT]);
    expect(left.x[0]).toBe(-2);
    expect(Math.max(...left.x)).toBe(1);
    left.x.forEach((x, i) => expect(left.y[i]).toBeCloseTo(x * x, 12));
    expect(Math.min(...right.x)).toBeGreaterThan(1);
    expect(right.x[0] - 1).toBeLessThan(1e-8);
    expect(right.x.at(-1)).toBe(4);
    right.x.forEach((x, i) => expect(right.y[i]).toBeCloseTo(3 - x, 12));
    // the right piece starts at the hollow point and the left piece ends at the filled one
    expect(right.y[0]).toBeCloseTo(pointY(points(graph)[OPEN]), 6);
    expect(left.y.at(-1)).toBeCloseTo(pointY(points(graph)[FILLED]), 12);
    // the data follows the model
    apply(graph, parameter('a', 2));
    expect(data(pieces(graph)[LEFT]).y.at(-1)).toBe(2);
    expect(data(pieces(graph)[RIGHT]).y[0]).toBeCloseTo(1, 6);
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    apply(graph, parameter('a', 3));
    apply(graph, parameter('a', 0));
    apply(graph, parameter('a', 1.5));
    expect(graph.model).toEqual({a: 1.5});
    expect(graph.state.a).toBe(1);
    expect(pointY(points(graph)[FILLED])).toBe(1.5);
    expect(pointY(points(graph)[OPEN])).toBe(1.5);
    expect(resolve(points(graph)[FILLED].attributes.fillColor)).toBe(MATCH);
    expect(resolve(points(graph)[OPEN].attributes.strokeColor)).toBe(MATCH);
    // a later action in the same tick sees the earlier one
    apply(graph, parameter('a', 0));
    expect([pointY(points(graph)[FILLED]), pointY(points(graph)[OPEN])]).toEqual([0, 3]);
    expect(data(pieces(graph)[LEFT]).y.every((y: number) => y === 0)).toBe(true);
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('continuity')!;
    expect(lesson.steps).toHaveLength(5);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph();
        apply(graph, parameter('a', 2.5)); // a deliberately different user state that the default scene must reset
        for (const action of step.scene!.actions) apply(graph, action);
        return graph.model;
    });
    expect(finals).toEqual([{a: 1}, {a: 1}, {a: 1}, {a: 1.5}, {a: 1.5}]);
});

test('colour and text agree: green and "zvezna pri x = 1" when the limits match, terracotta and the jump otherwise', () => {
    const graph = makeGraph();
    const status = () => ofType(graph, 'text')[STATUS_TEXT].parents[2]();
    const color = () => [resolve(points(graph)[FILLED].attributes.fillColor), resolve(points(graph)[OPEN].attributes.strokeColor),
        resolve(ofType(graph, 'text')[STATUS_TEXT].attributes.strokeColor)];
    expect(status()).toBe('skok 1 pri x = 1');
    expect(color()).toEqual([MISMATCH, MISMATCH, MISMATCH]);
    apply(graph, parameter('a', 1.5));
    expect(status()).toBe('zvezna pri x = 1');
    expect(color()).toEqual([MATCH, MATCH, MATCH]);
    apply(graph, parameter('a', 1.45));
    expect(status()).toBe('skok 0,1 pri x = 1');
    expect(color()).toEqual([MISMATCH, MISMATCH, MISMATCH]);
    // the hollow point is hollow: board-colored fill with a colored ring; the filled point is solid
    expect(points(graph)[OPEN].attributes.fillColor).toBe(GraphPalette.boardSurface);
    expect(points(graph)[FILLED].attributes.fillColor).not.toBe(GraphPalette.boardSurface);
    expect(MATCH).not.toBe(MISMATCH);
});

test('the tolerance accepts slider rounding noise at a = 1.5 but not a visible difference', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', 1.5 + 1e-10));
    expect(ofType(graph, 'text')[STATUS_TEXT].parents[2]()).toBe('zvezna pri x = 1');
    // slider arithmetic is cleaned, so 30 * 0.05 style noise ends on exactly 1.5
    apply(graph, parameter('a', 1.5000000000000007));
    expect(graph.model.a).toBe(1.5);
    apply(graph, parameter('a', 1.5 + 1e-7));
    // not continuous: the colors say so, and the jump 2e-7 is shown with enough decimals rather than as 0
    expect(resolve(points(graph)[FILLED].attributes.fillColor)).toBe(MISMATCH);
    expect(ofType(graph, 'text')[STATUS_TEXT].parents[2]()).toBe('skok 0,0000002 pri x = 1');
});

test('domain edges are accepted and out-of-domain values are rejected without changing the model', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', 0));
    expect(graph.model.a).toBe(0);
    apply(graph, parameter('a', 3));
    expect(graph.model.a).toBe(3);
    for (const bad of [-0.05, 3.05, NaN, Infinity, -Infinity]) {
        expect(() => apply(graph, parameter('a', bad))).toThrow();
        expect(graph.model.a).toBe(3);
    }
});

test('names, targets and kinds the graph does not own are unsupported', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'y1', 'x2', 'y2', 'k', 'n', 'A', 'omega', 'phi', 'B']) {
        expect(() => apply(graph, parameter(name, 1))).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'function-visibility', target: 'mirror', visible: true})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-choice', name: 'trig-function', value: 'sin'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
    expect(graph.model).toEqual({a: 1});
});

test('readouts: f(1), both limits, the jump, the status and the one-sided slopes, in both languages', () => {
    const graph = makeGraph({asyncState: false});
    const rows = () => graph.renderReadout().props.rows as { id: string; value: string }[];
    const byId = () => Object.fromEntries(rows().map(row => [row.id, row.value]));
    expect(byId()).toEqual({
        value: '1', 'left-limit': '1', 'right-limit': '2', jump: '1', status: 'skok 1 pri x = 1', 'left-slope': '2', 'right-slope': '−1',
    });
    expect(graph.renderReadout().props.note).toBeUndefined();
    apply(graph, parameter('a', 1.5));
    expect(byId()).toEqual({
        value: '1,5', 'left-limit': '1,5', 'right-limit': '1,5', jump: '0', status: 'zvezna pri x = 1', 'left-slope': '3', 'right-slope': '−1,5',
    });
    expect(graph.renderReadout().props.note).toMatch(/ostri vogal/);
    setLanguage('en');
    expect(byId()).toMatchObject({value: '1.5', status: 'continuous at x = 1', 'right-slope': '−1.5'});
    expect(graph.renderReadout().props.note).toMatch(/corner/);
    apply(graph, parameter('a', 0));
    expect(byId()).toEqual({
        value: '0', 'left-limit': '0', 'right-limit': '3', jump: '3', status: 'jump 3 at x = 1', 'left-slope': '0', 'right-slope': '0',
    });
    for (const a of [0, 0.05, 1, 1.5, 2.95, 3]) {
        apply(graph, parameter('a', a));
        expect(rows().map(row => row.value).join('|')).not.toMatch(/Infinity|NaN|-/);
    }
});

test('board texts are functions that follow the language, and a language change notifies subscribers', () => {
    const graph = makeGraph();
    const texts = ofType(graph, 'text').map((object: any) => object.parents[2]);
    apply(graph, parameter('a', 1.25));
    expect(texts.map((text: () => string) => text())).toEqual(['skok 0,5 pri x = 1', 'limita z leve 1,25, z desne 1,75']);
    const listener = jest.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(texts.map((text: () => string) => text())).toEqual(['jump 0.5 at x = 1', 'limit from the left 1.25, from the right 1.75']);
    expect(ofType(graph, 'text')[LIMITS_TEXT].attributes.strokeColor).toBe(GraphPalette.label);
    unsubscribe();
});

test('controls: one slider for a from 0 to 3 in steps of 0.05, out-of-domain input ignored', () => {
    const graph = makeGraph({asyncState: false});
    const sliders: any[] = [];
    const walk = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(walk);
        if (node.type?.name === 'Slider') sliders.push(node);
        walk(node.props?.children);
    };
    walk(graph.renderControls());
    expect(sliders).toHaveLength(1);
    expect([sliders[0].props.min, sliders[0].props.max, sliders[0].props.step, sliders[0].props.fixedValue]).toEqual([0, 3, 0.05, 1]);
    expect(sliders[0].props.customText).toBe('Parameter a');
    sliders[0].props.onChange(0 + 30 * 0.05);
    expect(graph.model.a).toBe(1.5);
    expect(() => sliders[0].props.onChange(4)).not.toThrow();
    expect(graph.model.a).toBe(1.5);
});

test('presets export the model, import it again, and sanitize bad data to the default model', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', 2.25));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('piecewise-continuity');
    expect(exported.data).toEqual({a: 2.25});
    graph.importPresetData({a: 0.5, extra: true});
    expect(graph.model).toEqual({a: 0.5});
    graph.importPresetData(JSON.stringify({a: 3}));
    expect(graph.model).toEqual({a: 3});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bad = [undefined, null, 'not json', {}, [], {a: -1}, {a: 3.1}, {a: '1'}, {a: NaN}];
    for (const entry of bad) {
        graph.importPresetData(entry);
        expect(graph.model).toEqual({a: 1});
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
    graph.importPreset({id: 'piecewise-continuity', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {a: 1.5}});
    expect(graph.model).toEqual({a: 1.5});
    graph.importPreset({id: 'piecewise-continuity'});
    expect(graph.model).toEqual({a: 1});
});

test('capture and restore bring back the synchronous model even when React state lags', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', 2.2));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({a: 2.2});
    expect(checkpoint.value.graphState).toMatchObject({a: 2.2});
    apply(graph, defaultScene);
    apply(graph, parameter('a', 1.5));
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({a: 2.2});
    expect(pointY(points(graph)[FILLED])).toBe(2.2);
    expect(pointY(points(graph)[OPEN])).toBeCloseTo(0.8, 12);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
    expect(graph.setState).toHaveBeenLastCalledWith(expect.objectContaining({a: 2.2}));
});

test('default scene preparation resets model and view and keeps the object count stable', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    apply(graph, parameter('a', 2.7));
    graph.board.setBoundingBox.mockClear();
    apply(graph, defaultScene);
    expect(graph.model).toEqual({a: 1});
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith([-2, 5, 4, -2], true);
    for (let i = 0; i < 5; i++) {
        apply(graph, parameter('a', 0.5 * i));
        apply(graph, defaultScene);
    }
    expect(boardObjectCount(graph)).toBe(baseline);
});

test('generated objects are disposed and not duplicated across repeated generation', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    expect(baseline).toBe(6);
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
    const graph = new ContinuityGraph({}) as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = jest.fn();
    graph.setState = jest.fn();
    graph.importPreset({id: 'piecewise-continuity', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {a: 1}});
    graph.board.setBoundingBox.mockClear();
    graph.initialize();
    expect(graph.board.setBoundingBox).not.toHaveBeenCalled();
});

test('the pieces are clipped to a zoomed view and give no samples when the view misses their domain', () => {
    const graph = makeGraph();
    graph.board.getBoundingBox.mockReturnValue([2, 5, 4, -2]);
    expect(data(pieces(graph)[LEFT])).toEqual({x: [], y: []});
    expect(data(pieces(graph)[RIGHT]).x[0]).toBeCloseTo(2, 6);
    graph.board.getBoundingBox.mockReturnValue([-3, 5, 0.5, -2]);
    expect(Math.max(...data(pieces(graph)[LEFT]).x)).toBe(0.5);
    expect(data(pieces(graph)[RIGHT])).toEqual({x: [], y: []});
});

test('figure export preset state follows the imported model', () => {
    const graph = makeGraph();
    graph.importFigurePresetData({id: 'piecewise-continuity', data: {a: 2}});
    expect(graph.figurePresetGraphState(undefined)).toMatchObject({initialized: true, a: 2});
});
