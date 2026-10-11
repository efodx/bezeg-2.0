import {DerivativeGraph} from './DerivativeGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {onLanguageChange, setLanguage} from '../../localization';
import {GraphPalette} from '../styles/GraphPalette';

const BOX = [-3, 6, 4, -2];

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        create: jest.fn((type: string, parents: any[], attributes: any) => {
            const object: any = {type, board, parents, attributes, handlers: {} as Record<string, () => void>};
            if (type === 'point') {
                const free = parents.every((parent: unknown) => typeof parent === 'number');
                object.x = free ? parents[0] : undefined;
                object.y = free ? parents[1] : undefined;
                object.X = () => (free ? object.x : parents[0]());
                object.Y = () => (free ? object.y : parents[1]());
                object.moveTo = jest.fn(([x, y]: number[]) => { object.x = x; object.y = y; });
                object.on = jest.fn((event: string, handler: () => void) => { object.handlers[event] = handler; });
            }
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
    const graph = new DerivativeGraph({}) as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = jest.fn();
    graph.setState = jest.fn((patch: any) => { if (!asyncState) graph.state = {...graph.state, ...patch}; });
    graph.initialize();
    return graph;
}

const apply = (graph: any, action: LessonAction) => graph.applyLessonAction(action);
const parameter = (name: any, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'derivative-function', value});
const tangent = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'tangent', visible});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const boardObjectCount = (graph: any) => graph.board.objectsList.length;
const [FUNCTION, TANGENT] = [0, 1];
const [POINT_P, POINT_Q] = [0, 1];
const [SLOPES_TEXT] = [1];
const functionCurve = (graph: any) => ofType(graph, 'functiongraph')[FUNCTION];
const tangentCurve = (graph: any) => ofType(graph, 'functiongraph')[TANGENT];
const pointP = (graph: any) => ofType(graph, 'point')[POINT_P];
const pointQ = (graph: any) => ofType(graph, 'point')[POINT_Q];
const q = (graph: any) => [pointQ(graph).X(), pointQ(graph).Y()];
const slopesText = (graph: any) => ofType(graph, 'text')[SLOPES_TEXT].parents[2]();

beforeEach(() => setLanguage('sl'));

test('initialization draws the function, the tangent, P, Q, the secant and two texts for x^2, x0 = 1, h = 1', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({fn: 'square', x0: 1, h: 1, tangent: false});
    expect(graph.presets()).toBe('derivative');
    expect(ofType(graph, 'functiongraph')).toHaveLength(2);
    expect(ofType(graph, 'point')).toHaveLength(2);
    expect(ofType(graph, 'line')).toHaveLength(1);
    expect(ofType(graph, 'text')).toHaveLength(2);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith([-3, 6, 4, -2], true);
    expect([pointP(graph).x, pointP(graph).y]).toEqual([1, 1]);
    expect(q(graph)).toEqual([2, 4]);
    expect(pointQ(graph).attributes.fixed).toBe(true);
    expect(pointP(graph).attributes.fixed).toBeUndefined();
    // the secant is a full line through P and Q in the palette's construction colour
    const secant = ofType(graph, 'line')[0];
    expect(secant.parents).toEqual([pointP(graph), pointQ(graph)]);
    expect(secant.attributes.strokeColor).toBe(GraphPalette.constructionAccent);
    expect(functionCurve(graph).parents[0](3)).toBe(9);
    expect(resolve(tangentCurve(graph).attributes.visible)).toBe(false);
    expect(slopesText(graph)).toBe('naklon sekante 3, f′(x₀) = 2');
});

test('the tangent is the dashed exact line and follows the tangent visibility', () => {
    const graph = makeGraph();
    const value = tangentCurve(graph).parents[0];
    expect([value(1), value(0), value(3)]).toEqual([1, -1, 5]);
    expect(tangentCurve(graph).attributes.dash).toBe(2);
    apply(graph, tangent(true));
    expect(resolve(tangentCurve(graph).attributes.visible)).toBe(true);
    apply(graph, parameter('x0', 2));
    expect(value(2)).toBe(4);
    expect(value(3)).toBe(8);
    apply(graph, tangent(false));
    expect(resolve(tangentCurve(graph).attributes.visible)).toBe(false);
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [choice('sin'), parameter('x0', 1), parameter('h', 0.2), tangent(true)]) apply(graph, action);
    expect(graph.model).toEqual({fn: 'sin', x0: 1, h: 0.2, tangent: true});
    expect(graph.state).toMatchObject({fn: 'square', x0: 1, h: 1, tangent: false});
    expect([pointP(graph).x, pointP(graph).y]).toEqual([1, Math.sin(1)]);
    expect(q(graph)[0]).toBeCloseTo(1.2, 12);
    expect(q(graph)[1]).toBeCloseTo(Math.sin(1.2), 12);
    expect(slopesText(graph)).toBe('naklon sekante 0,4528, f′(x₀) = 0,5403');
    // a later action in the same tick sees the earlier one
    apply(graph, choice('exp'));
    apply(graph, parameter('x0', 0));
    expect([pointP(graph).x, pointP(graph).y]).toEqual([0, 1]);
    expect(q(graph)).toEqual([0.2, Math.exp(0.2)]);
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('derivative')!;
    expect(lesson.steps).toHaveLength(5);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph();
        // a deliberately different user state that the default scene must reset
        apply(graph, choice('exp'));
        apply(graph, parameter('x0', -3));
        apply(graph, parameter('h', -2));
        apply(graph, tangent(true));
        for (const action of step.scene!.actions) apply(graph, action);
        return [graph.model, slopesText(graph)];
    });
    expect(finals).toEqual([
        [{fn: 'square', x0: 1, h: 1, tangent: false}, 'naklon sekante 3, f′(x₀) = 2'],
        [{fn: 'square', x0: 1, h: 0.5, tangent: false}, 'naklon sekante 2,5, f′(x₀) = 2'],
        [{fn: 'square', x0: 1, h: 0.1, tangent: false}, 'naklon sekante 2,1, f′(x₀) = 2'],
        [{fn: 'square', x0: 1, h: -0.5, tangent: true}, 'naklon sekante 1,5, f′(x₀) = 2'],
        [{fn: 'sin', x0: 1, h: 0.2, tangent: true}, 'naklon sekante 0,4528, f′(x₀) = 0,5403'],
    ]);
});

test('dragging P projects onto the graph, writes x0 to the model and clamps to the domain', () => {
    const graph = makeGraph();
    const p = pointP(graph);
    p.moveTo.mockClear();
    p.x = 2.5;
    p.y = 0.3; // off the graph: the drag moved the pointer, not the point on the curve
    p.handlers.drag();
    expect(graph.model.x0).toBe(2.5);
    expect(p.moveTo).toHaveBeenCalledWith([2.5, 6.25]);
    expect([p.x, p.y]).toEqual([2.5, 6.25]);
    expect(q(graph)).toEqual([3.5, 12.25]);
    expect(slopesText(graph)).toBe('naklon sekante 6, f′(x₀) = 5');
    p.x = 1.23456;
    p.handlers.drag();
    expect(graph.model.x0).toBe(1.23);
    expect(p.y).toBe(1.23 * 1.23);
    p.x = 9;
    p.handlers.drag();
    expect(graph.model.x0).toBe(4);
    expect(p.y).toBe(16);
    p.x = -9;
    p.handlers.drag();
    expect(graph.model.x0).toBe(-4);
    // dragging must not move the objects a second time through the scene sync
    graph.boardUpdate.mockClear();
    apply(graph, choice('sin'));
    expect(p.y).toBeCloseTo(Math.sin(-4), 12);
});

test('changing the function moves P onto the new graph and keeps x0, h and the view', () => {
    const graph = makeGraph();
    apply(graph, parameter('x0', -1.5));
    apply(graph, parameter('h', 0.25));
    graph.board.setBoundingBox.mockClear();
    apply(graph, choice('exp'));
    expect(graph.model).toEqual({fn: 'exp', x0: -1.5, h: 0.25, tangent: false});
    expect(pointP(graph).y).toBeCloseTo(Math.exp(-1.5), 12);
    expect(q(graph)[1]).toBeCloseTo(Math.exp(-1.25), 12);
    expect(graph.board.setBoundingBox).not.toHaveBeenCalled();
    expect(functionCurve(graph).parents[0](0)).toBe(1);
});

test('h in the excluded band, out-of-domain values and non-finite values are rejected without changing the model', () => {
    const graph = makeGraph();
    apply(graph, parameter('h', 0.01));
    apply(graph, parameter('h', -0.01));
    apply(graph, parameter('h', 2));
    apply(graph, parameter('h', -2));
    expect(graph.model.h).toBe(-2);
    for (const bad of [0, 0.005, -0.005, 0.0099, 2.01, -2.01, NaN, Infinity]) {
        expect(() => apply(graph, parameter('h', bad))).toThrow();
        expect(graph.model.h).toBe(-2);
    }
    apply(graph, parameter('x0', 4));
    apply(graph, parameter('x0', -4));
    for (const bad of [4.01, -4.01, NaN, Infinity]) {
        expect(() => apply(graph, parameter('x0', bad))).toThrow();
        expect(graph.model.x0).toBe(-4);
    }
    expect(() => apply(graph, choice('cos'))).toThrow();
    expect(graph.model.fn).toBe('square');
});

test('names, targets and kinds the graph does not own are unsupported', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'y1', 'x2', 'y2', 'k', 'n', 'a', 'A', 'omega', 'phi', 'B']) {
        expect(() => apply(graph, parameter(name, 1))).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'function-visibility', target: 'mirror', visible: true})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-visibility', target: 'reference', visible: true})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-choice', name: 'trig-function', value: 'sin'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
    expect(graph.model).toEqual({fn: 'square', x0: 1, h: 1, tangent: false});
});

test('readouts: x0, h, values, quotient, exact derivative and difference, in both languages', () => {
    const graph = makeGraph({asyncState: false});
    const rows = () => graph.renderReadout().props.rows as { id: string; value: string }[];
    const byId = () => Object.fromEntries(rows().map(row => [row.id, row.value]));
    expect(byId()).toEqual({x0: '1', h: '1', 'f-x0': '1', 'f-x0h': '4', quotient: '3', derivative: '2', difference: '1'});
    apply(graph, parameter('h', 0.1));
    expect(byId()).toEqual({x0: '1', h: '0,1', 'f-x0': '1', 'f-x0h': '1,21', quotient: '2,1', derivative: '2', difference: '0,1'});
    apply(graph, parameter('h', -0.5));
    expect(byId()).toMatchObject({quotient: '1,5', difference: '−0,5'});
    apply(graph, choice('sin'));
    apply(graph, parameter('h', 0.2));
    setLanguage('en');
    expect(byId()).toEqual({x0: '1', h: '0.2', 'f-x0': '0.8415', 'f-x0h': '0.932', quotient: '0.4528', derivative: '0.5403', difference: '−0.0875'});
    expect(graph.renderReadout().props.note).toMatch(/0\/0/);
    apply(graph, choice('exp'));
    apply(graph, parameter('x0', 4));
    apply(graph, parameter('h', 2));
    for (const fn of ['square', 'sin', 'exp']) {
        apply(graph, choice(fn));
        for (const x0 of [-4, 0, 4]) for (const h of [-2, -0.01, 0.01, 2]) {
            apply(graph, parameter('x0', x0));
            apply(graph, parameter('h', h));
            expect(rows().map(row => row.value).join('|')).not.toMatch(/Infinity|NaN/);
            expect(slopesText(graph)).not.toMatch(/Infinity|NaN/);
        }
    }
});

test('board texts are functions that follow the language, and a language change notifies subscribers', () => {
    const graph = makeGraph();
    const texts = ofType(graph, 'text').map((object: any) => object.parents[2]);
    apply(graph, choice('sin'));
    apply(graph, parameter('h', 0.2));
    expect(texts.map((text: () => string) => text())).toEqual(['f(x) = sin x', 'naklon sekante 0,4528, f′(x₀) = 0,5403']);
    const listener = jest.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(texts.map((text: () => string) => text())).toEqual(['f(x) = sin x', 'secant slope 0.4528, f′(x₀) = 0.5403']);
    unsubscribe();
});

test('controls: function select, x0 input, h slider [-2, 2] step 0.01 that skips the excluded band, tangent switch', () => {
    const graph = makeGraph({asyncState: false});
    const found: Record<string, any[]> = {};
    const walk = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(walk);
        const name = node.type?.name;
        if (name) (found[name] ??= []).push(node);
        walk(node.props?.children);
    };
    walk(graph.renderControls());
    expect(found.ChoiceSelect).toHaveLength(1);
    expect(found.ChoiceSelect[0].props.options.map((option: any) => option.value)).toEqual(['square', 'sin', 'exp']);
    expect(found.ChoiceSelect[0].props.value).toBe('square');
    found.ChoiceSelect[0].props.onChange('sin');
    expect(graph.model.fn).toBe('sin');
    expect(() => found.ChoiceSelect[0].props.onChange('cos')).not.toThrow();
    expect(graph.model.fn).toBe('sin');

    expect(found.NumberInput).toHaveLength(1);
    expect([found.NumberInput[0].props.min, found.NumberInput[0].props.max, found.NumberInput[0].props.value]).toEqual([-4, 4, 1]);
    found.NumberInput[0].props.onChange(-2.5);
    expect(graph.model.x0).toBe(-2.5);
    expect(() => found.NumberInput[0].props.onChange(7)).not.toThrow();
    expect(graph.model.x0).toBe(-2.5);
    expect([pointP(graph).x, pointP(graph).y]).toEqual([-2.5, Math.sin(-2.5)]);

    expect(found.Slider).toHaveLength(1);
    const slider = found.Slider[0].props;
    expect([slider.min, slider.max, slider.step, slider.fixedValue]).toEqual([-2, 2, 0.01, 1]);
    slider.onChange(-2 + 150 * 0.01); // -0.5 up to rounding noise
    expect(graph.model.h).toBe(-0.5);
    // stepping over 0: the slider cannot take a value inside the band, it skips to the other side
    slider.onChange(0.01);
    expect(graph.model.h).toBe(0.01);
    slider.onChange(0);
    expect(graph.model.h).toBe(-0.01);
    slider.onChange(0);
    expect(graph.model.h).toBe(0.01);
    slider.onChange(0.005); // moving down from 0.01 into the band: continue to the other side
    expect(graph.model.h).toBe(-0.01);
    slider.onChange(0.7);
    expect(graph.model.h).toBe(0.7);

    expect(found.OnOffSwitch).toHaveLength(1);
    found.OnOffSwitch[0].props.onChange(true);
    expect(graph.model.tangent).toBe(true);
});

test('presets export the model, import it again, and sanitize bad data to the default model', () => {
    const graph = makeGraph();
    apply(graph, choice('exp'));
    apply(graph, parameter('x0', 0.5));
    apply(graph, parameter('h', -0.25));
    apply(graph, tangent(true));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('derivative');
    expect(exported.data).toEqual({fn: 'exp', x0: 0.5, h: -0.25, tangent: true});
    graph.importPresetData({fn: 'sin', x0: -2, h: 0.5, tangent: false, extra: true});
    expect(graph.model).toEqual({fn: 'sin', x0: -2, h: 0.5, tangent: false});
    expect(pointP(graph).y).toBeCloseTo(Math.sin(-2), 12);
    graph.importPresetData(JSON.stringify({fn: 'square', x0: 3, h: 2}));
    expect(graph.model).toEqual({fn: 'square', x0: 3, h: 2, tangent: false});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bad = [undefined, null, 'not json', {}, [], {fn: 'cos', x0: 1, h: 1}, {fn: 'square', x0: 5, h: 1}, {fn: 'square', x0: 1, h: 0},
        {fn: 'square', x0: 1, h: 0.001}, {fn: 'square', x0: 1, h: 1, tangent: 1}];
    for (const entry of bad) {
        graph.importPresetData(entry);
        expect(graph.model).toEqual({fn: 'square', x0: 1, h: 1, tangent: false});
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
    graph.importPreset({id: 'derivative', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {fn: 'sin', x0: 1, h: 0.2, tangent: true}});
    expect(graph.model).toEqual({fn: 'sin', x0: 1, h: 0.2, tangent: true});
    graph.importPreset({id: 'derivative'});
    expect(graph.model).toEqual({fn: 'square', x0: 1, h: 1, tangent: false});
});

test('capture and restore bring back the synchronous model even when React state lags', () => {
    const graph = makeGraph();
    apply(graph, choice('sin'));
    apply(graph, parameter('x0', -1));
    apply(graph, parameter('h', -0.3));
    apply(graph, tangent(true));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({fn: 'sin', x0: -1, h: -0.3, tangent: true});
    expect(checkpoint.value.graphState).toMatchObject({fn: 'sin', x0: -1, h: -0.3, tangent: true});
    apply(graph, defaultScene);
    apply(graph, parameter('h', 0.5));
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({fn: 'sin', x0: -1, h: -0.3, tangent: true});
    expect(pointP(graph).y).toBeCloseTo(Math.sin(-1), 12);
    expect(q(graph)[0]).toBeCloseTo(-1.3, 12);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
    expect(graph.setState).toHaveBeenLastCalledWith(expect.objectContaining({fn: 'sin', x0: -1, h: -0.3, tangent: true}));
});

test('default scene preparation resets model and view and keeps the object count stable', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    apply(graph, choice('exp'));
    apply(graph, parameter('x0', 3));
    graph.board.setBoundingBox.mockClear();
    apply(graph, defaultScene);
    expect(graph.model).toEqual({fn: 'square', x0: 1, h: 1, tangent: false});
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith([-3, 6, 4, -2], true);
    for (let i = 0; i < 5; i++) {
        apply(graph, parameter('x0', -i));
        apply(graph, tangent(true));
        apply(graph, defaultScene);
    }
    expect(boardObjectCount(graph)).toBe(baseline);
});

test('generated objects are disposed and not duplicated across repeated generation', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    expect(baseline).toBe(7);
    expect(graph.generatedObjectCount).toBe(baseline);
    for (let i = 0; i < 4; i++) graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    expect(graph.generatedObjectCount).toBe(baseline);
    graph.disposeFigureScene();
    expect(boardObjectCount(graph)).toBe(0);
    expect(graph.generatedObjectCount).toBe(0);
    // no stale reference to the removed point: a model change after disposal must not touch it
    expect(() => apply(graph, parameter('x0', 2))).not.toThrow();
    graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    graph.graphSession = {isReady: false, isAlive: false};
    graph.disposeFigureScene();
    expect(graph.generatedObjectCount).toBe(0);
});

test('a stored board state is not overwritten by the default view during initialization', () => {
    const graph = new DerivativeGraph({}) as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = jest.fn();
    graph.setState = jest.fn();
    graph.importPreset({id: 'derivative', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {fn: 'square', x0: 1, h: 1}});
    graph.board.setBoundingBox.mockClear();
    graph.initialize();
    expect(graph.board.setBoundingBox).not.toHaveBeenCalled();
});

test('figure export preset state follows the imported model', () => {
    const graph = makeGraph();
    graph.importFigurePresetData({id: 'derivative', data: {fn: 'exp', x0: 2, h: 0.5, tangent: true}});
    expect(graph.figurePresetGraphState(undefined)).toMatchObject({initialized: true, fn: 'exp', x0: 2, h: 0.5, tangent: true});
});
