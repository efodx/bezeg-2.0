import {act, fireEvent, render, screen} from '@testing-library/react';
import {DefiniteIntegralGraph} from './DefiniteIntegralGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {onLanguageChange, setLanguage} from '../../localization';
import {GraphPalette} from '../styles/GraphPalette';

const BOX = [-1.5, 4.5, 5.5, -1];
const SIN_BOX = [-0.8, 3.1, 7.1, -3.1];
const EXP_BOX = [-3, 8.5, 9, -1];

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
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
    const graph = new DefiniteIntegralGraph() as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn((patch: any) => { if (!asyncState) graph.store.setState(patch); });
    graph.initialize();
    return graph;
}

const apply = (graph: any, action: LessonAction) => graph.applyLessonAction(action);
const parameter = (name: any, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const fnChoice = (value: string): LessonAction => ({kind: 'function-choice', name: 'integral-function', value});
const methodChoice = (value: string): LessonAction => ({kind: 'function-choice', name: 'sum-method', value});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const boardObjectCount = (graph: any) => graph.board.objectsList.length;
const [POSITIVE, NEGATIVE] = [0, 1];
const [POINT_A, POINT_B] = [0, 1];
/** The curve's point lists as the board would read them after an update. */
const curveData = (graph: any, index: number) => {
    const curve = ofType(graph, 'curve')[index];
    curve.updateDataArray();
    return {x: curve.dataX as number[], y: curve.dataY as number[]};
};
const polygons = (list: number[]) => list.reduce<number[][]>((groups, value) => {
    if (Number.isNaN(value)) groups.push([]);
    else groups[groups.length - 1].push(value);
    return groups;
}, [[]]);
const pointA = (graph: any) => ofType(graph, 'point')[POINT_A];
const pointB = (graph: any) => ofType(graph, 'point')[POINT_B];
/** The board's one text is the caption: line 0 the function, line 1 the sum and the integral. */
const valuesText = (graph: any) => graph.captionPlainLines()[1];

beforeEach(() => setLanguage('sl'));

test('initialization draws two fill curves, the function, the two bound points and two texts for x^2 on [0, 2], n = 4, left', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({fn: 'square', a: 0, b: 2, n: 4, method: 'left'});
    expect(graph.presets()).toBe('definite-integral');
    expect(ofType(graph, 'curve')).toHaveLength(2);
    expect(ofType(graph, 'functiongraph')).toHaveLength(1);
    expect(ofType(graph, 'point')).toHaveLength(2);
    expect(ofType(graph, 'text')).toHaveLength(1);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    expect([pointA(graph).x, pointA(graph).y, pointB(graph).x, pointB(graph).y]).toEqual([0, 0, 2, 0]);
    // the shapes use two different palette colours, the function is drawn after (above) them
    const fills = ofType(graph, 'curve').map((curve: any) => curve.attributes.fillColor);
    expect(fills).toEqual([GraphPalette.additionalCurves[0], GraphPalette.additionalCurves[1]]);
    expect(graph.board.objectsList.indexOf(ofType(graph, 'functiongraph')[0])).toBeGreaterThan(graph.board.objectsList.indexOf(ofType(graph, 'curve')[1]));
    expect(ofType(graph, 'functiongraph')[0].parents[0](2)).toBe(4);
    // values far outside the view are left out of the path, so its extent stays near the view
    expect(ofType(graph, 'functiongraph')[0].parents[0](7)).toBeNaN();
    expect(ofType(graph, 'functiongraph')[0].parents[0](2.4)).toBeCloseTo(5.76, 12);
    expect(valuesText(graph)).toBe('vsota 1,75, integral 2,6667');
});

test('the positive fill is the three closed left rectangles of positive height under x^2 (the first has height 0) and the negative fill is empty', () => {
    const graph = makeGraph();
    const positive = curveData(graph, POSITIVE);
    expect(polygons(positive.x)).toEqual([
        [0.5, 0.5, 1, 1, 0.5], [1, 1, 1.5, 1.5, 1], [1.5, 1.5, 2, 2, 1.5],
    ]);
    expect(polygons(positive.y)).toEqual([[0, 0.25, 0.25, 0, 0], [0, 1, 1, 0, 0], [0, 2.25, 2.25, 0, 0]]);
    expect(curveData(graph, NEGATIVE)).toEqual({x: [], y: []});
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [fnChoice('sin'), parameter('a', 0), parameter('b', 2 * Math.PI), parameter('n', 12), methodChoice('midpoint')]) apply(graph, action);
    expect(graph.model).toEqual({fn: 'sin', a: 0, b: 2 * Math.PI, n: 12, method: 'midpoint'});
    expect(graph.state).toMatchObject({fn: 'square', a: 0, b: 2, n: 4, method: 'left'});
    expect([pointB(graph).x, pointB(graph).y]).toEqual([2 * Math.PI, 0]);
    expect(valuesText(graph)).toBe('vsota 0, integral 0');
    // a later action in the same tick sees the earlier one
    apply(graph, parameter('b', 1));
    apply(graph, parameter('n', 1));
    apply(graph, methodChoice('left'));
    expect(valuesText(graph)).toBe('vsota 0, integral 0,4597');
    // the single left rectangle of sin on [0, 1] has height sin 0 = 0, so nothing is drawn
    expect(curveData(graph, POSITIVE).x).toEqual([]);
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('definite-integral')!;
    expect(lesson.steps).toHaveLength(5);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph();
        // a deliberately different user state that the default scene must reset
        apply(graph, fnChoice('exp'));
        apply(graph, parameter('a', -3));
        apply(graph, parameter('b', 5));
        apply(graph, parameter('n', 77));
        apply(graph, methodChoice('trapezoid'));
        for (const action of step.scene!.actions) apply(graph, action);
        return [graph.model, valuesText(graph)];
    });
    expect(finals).toEqual([
        [{fn: 'square', a: 0, b: 2, n: 4, method: 'left'}, 'vsota 1,75, integral 2,6667'],
        [{fn: 'square', a: 0, b: 2, n: 4, method: 'right'}, 'vsota 3,75, integral 2,6667'],
        [{fn: 'square', a: 0, b: 2, n: 4, method: 'midpoint'}, 'vsota 2,625, integral 2,6667'],
        [{fn: 'square', a: 0, b: 2, n: 100, method: 'left'}, 'vsota 2,6268, integral 2,6667'],
        [{fn: 'sin', a: 0, b: 2 * Math.PI, n: 12, method: 'midpoint'}, 'vsota 0, integral 0'],
    ]);
});

test('changing n or the method regenerates the data but never the number of board objects', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    expect(baseline).toBe(6);
    for (const method of ['left', 'right', 'midpoint', 'trapezoid']) {
        for (const n of [1, 4, 150, 37, 2]) {
            apply(graph, methodChoice(method));
            apply(graph, parameter('n', n));
            expect(boardObjectCount(graph)).toBe(baseline);
            expect(graph.generatedObjectCount).toBe(baseline);
        }
    }
    apply(graph, parameter('n', 150));
    apply(graph, methodChoice('right'));
    expect(polygons(curveData(graph, POSITIVE).x)).toHaveLength(150);
    apply(graph, parameter('n', 3));
    expect(polygons(curveData(graph, POSITIVE).x)).toHaveLength(3);
    apply(graph, methodChoice('left'));
    expect(polygons(curveData(graph, POSITIVE).x)).toHaveLength(2);
});

test('the parts below the axis go to the negative fill and sin on [0, 2*pi] splits evenly', () => {
    const graph = makeGraph();
    for (const action of [fnChoice('sin'), parameter('b', 2 * Math.PI), parameter('n', 8), methodChoice('midpoint')]) apply(graph, action);
    const positive = curveData(graph, POSITIVE);
    const negative = curveData(graph, NEGATIVE);
    expect(polygons(positive.x)).toHaveLength(4);
    expect(polygons(negative.x)).toHaveLength(4);
    expect(positive.y.filter(value => !Number.isNaN(value)).every(value => value >= 0)).toBe(true);
    expect(negative.y.filter(value => !Number.isNaN(value)).every(value => value <= 0)).toBe(true);
    // the trapezoid rule draws trapezoids; one that crosses the axis becomes a positive and a negative triangle
    apply(graph, methodChoice('trapezoid'));
    apply(graph, parameter('n', 3));
    expect(polygons(curveData(graph, POSITIVE).y).map(group => group.length)).toEqual([5, 4]);
    expect(polygons(curveData(graph, NEGATIVE).y).map(group => group.length)).toEqual([4, 5]);
});

test('a = b draws nothing and reports 0; a > b flips the sign of the sum and the integral', () => {
    const graph = makeGraph();
    apply(graph, parameter('b', 0));
    expect(curveData(graph, POSITIVE)).toEqual({x: [], y: []});
    expect(curveData(graph, NEGATIVE)).toEqual({x: [], y: []});
    expect(valuesText(graph)).toBe('vsota 0, integral 0');
    apply(graph, parameter('a', 2));
    apply(graph, parameter('b', 0));
    apply(graph, methodChoice('midpoint'));
    expect(valuesText(graph)).toBe('vsota −2,625, integral −2,6667');
    // negative width: the shapes still lie above the axis for x^2 and are drawn
    expect(polygons(curveData(graph, POSITIVE).x)).toHaveLength(4);
    graph.store.replaceState({...graph.state, ...graph.model});
    const rows = Object.fromEntries((graph.renderReadout().props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));
    expect(rows).toMatchObject({a: '2', b: '0', h: '−0,5', sum: '−2,625'});
});

test('dragging a bound keeps it on the x-axis, rounds to 0.01, clamps to the domain and does not move the objects again', () => {
    const graph = makeGraph();
    const a = pointA(graph);
    a.moveTo.mockClear();
    a.x = 1.23456;
    a.y = 3; // dragged off the axis
    a.handlers.drag();
    expect(graph.model.a).toBe(1.23);
    expect(a.moveTo).toHaveBeenCalledWith([1.23, 0]);
    expect([a.x, a.y]).toEqual([1.23, 0]);
    a.x = 99;
    a.handlers.drag();
    expect(graph.model.a).toBe(7);
    a.x = -99;
    a.handlers.drag();
    expect(graph.model.a).toBe(-7);
    // b can be dragged left past a: the integral is oriented
    a.x = 1;
    a.handlers.drag();
    const b = pointB(graph);
    b.x = -3.456;
    b.handlers.drag();
    expect(graph.model.b).toBe(-3.46);
    expect(valuesText(graph)).toMatch(/^vsota .*integral/);
    expect(graph.model.b).toBeLessThan(graph.model.a);
});

test('invalid values are rejected without changing the model', () => {
    const graph = makeGraph();
    const before = {...graph.model};
    for (const bad of [7.01, -7.01, NaN, Infinity]) {
        expect(() => apply(graph, parameter('a', bad))).toThrow();
        expect(() => apply(graph, parameter('b', bad))).toThrow();
    }
    for (const bad of [0, -1, 151, 2.5, NaN, Infinity]) expect(() => apply(graph, parameter('n', bad))).toThrow();
    expect(() => apply(graph, fnChoice('cos'))).toThrow();
    expect(() => apply(graph, methodChoice('upper'))).toThrow();
    expect(graph.model).toEqual(before);
    apply(graph, parameter('a', -7));
    apply(graph, parameter('b', 7));
    apply(graph, parameter('n', 1));
    apply(graph, parameter('n', 150));
    expect(graph.model).toMatchObject({a: -7, b: 7, n: 150});
});

test('names, targets and kinds the graph does not own are unsupported', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'y1', 'x2', 'y2', 'k', 'A', 'omega', 'phi', 'B', 'x0', 'h']) {
        expect(() => apply(graph, parameter(name, 1))).toThrow(UnsupportedLessonActionError);
    }
    for (const target of ['mirror', 'reference', 'tangent']) {
        expect(() => apply(graph, {kind: 'function-visibility', target, visible: true} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'function-choice', name: 'trig-function', value: 'sin'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-choice', name: 'derivative-function', value: 'sin'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
    expect(graph.model).toEqual({fn: 'square', a: 0, b: 2, n: 4, method: 'left'});
});

test('readouts: a, b, n, h, sum, exact integral and difference, in both languages', () => {
    const graph = makeGraph({asyncState: false});
    const byId = () => Object.fromEntries((graph.renderReadout().props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));
    expect(byId()).toEqual({a: '0', b: '2', n: '4', h: '0,5', sum: '1,75', exact: '2,6667', difference: '−0,9167'});
    apply(graph, methodChoice('trapezoid'));
    expect(byId()).toMatchObject({sum: '2,75', difference: '0,0833'});
    setLanguage('en');
    apply(graph, parameter('n', 100));
    apply(graph, methodChoice('left'));
    expect(byId()).toEqual({a: '0', b: '2', n: '100', h: '0.02', sum: '2.6268', exact: '2.6667', difference: '−0.0399'});
    expect(graph.renderReadout().props.note).toMatch(/negative/);
    for (const fn of ['square', 'sin', 'exp']) for (const method of ['left', 'right', 'midpoint', 'trapezoid']) for (const [a, b] of [[-7, 7], [7, -7], [0, 0], [3, 3]]) {
        apply(graph, fnChoice(fn));
        apply(graph, methodChoice(method));
        apply(graph, parameter('a', a));
        apply(graph, parameter('b', b));
        expect(Object.values(byId()).join('|')).not.toMatch(/Infinity|NaN|—/);
        expect(valuesText(graph)).not.toMatch(/Infinity|NaN/);
    }
});

test('the caption follows the language, and a language change notifies subscribers', () => {
    const graph = makeGraph();
    apply(graph, fnChoice('sin'));
    apply(graph, parameter('b', Math.PI));
    apply(graph, parameter('n', 2));
    apply(graph, methodChoice('midpoint'));
    expect(graph.captionPlainLines()).toEqual(['f(x) = sin x', 'vsota 2,2214, integral 2']);
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(graph.captionPlainLines()).toEqual(['f(x) = sin x', 'sum 2.2214, integral 2']);
    unsubscribe();
});

test('importing a model with another function and no view shows that function view; a stored view or the same function keeps the view', () => {
    const graph = makeGraph();
    const model = (fn: string) => ({fn, a: 0, b: 2, n: 4, method: 'left'});
    graph.board.setBoundingBox.mockClear();
    graph.importPreset({id: 'definite-integral', data: model('sin')});
    expect(graph.model.fn).toBe('sin');
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(SIN_BOX, true);
    graph.board.setBoundingBox.mockClear();
    graph.importPreset({id: 'definite-integral', data: model('sin')});
    expect(graph.board.setBoundingBox).not.toHaveBeenCalled();
    graph.importPreset({id: 'definite-integral', data: model('exp'), boardState: {boundingBox: [-1, 2, 3, -4]}});
    expect(graph.model.fn).toBe('exp');
    expect(graph.board.setBoundingBox).toHaveBeenCalledTimes(1);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-1, 2, 3, -4], true);
    graph.importPreset({id: 'definite-integral', data: model('exp')});
    expect(graph.board.setBoundingBox).toHaveBeenCalledTimes(1);
    graph.importPreset({id: 'definite-integral', data: model('square')});
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(BOX, true);
});

test('reversed bounds add a readout note and the legend names the two colours in words', () => {
    const graph = makeGraph();
    const notes = () => ([] as string[]).concat(graph.renderReadout().props.note);
    expect(notes()).toHaveLength(1);
    apply(graph, parameter('a', 3));
    apply(graph, parameter('b', 1));
    graph.store.replaceState({...graph.state, ...graph.model});
    expect(notes()).toHaveLength(2);
    expect(notes()[1]).toMatch(/obrnjeni/);
    const legend = graph.renderLegend().props.items;
    expect(legend.map((item: any) => item.id)).toEqual(['positive', 'negative']);
    expect(legend.map((item: any) => item.color)).toEqual([GraphPalette.additionalCurves[0], GraphPalette.additionalCurves[1]]);
    expect(legend[0].label).toMatch(/pozitivno/);
    expect(legend[1].label).toMatch(/negativno/);
});

test('controls: function select, bound inputs, n slider 1-150 and method select', () => {
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
    expect(found.ChoiceSelect).toHaveLength(2);
    const [functionSelect, methodSelect] = found.ChoiceSelect.map(node => node.props);
    expect(functionSelect.options.map((option: any) => option.value)).toEqual(['square', 'sin', 'exp']);
    expect(methodSelect.options.map((option: any) => option.value)).toEqual(['left', 'right', 'midpoint', 'trapezoid']);
    expect(methodSelect.options.map((option: any) => option.text)).toEqual(['Leva vsota', 'Desna vsota', 'Sredinska vsota', 'Trapezna vsota']);
    functionSelect.onChange('exp');
    methodSelect.onChange('trapezoid');
    expect(graph.model).toMatchObject({fn: 'exp', method: 'trapezoid'});
    expect(() => functionSelect.onChange('cos')).not.toThrow();
    expect(() => methodSelect.onChange('upper')).not.toThrow();
    expect(graph.model).toMatchObject({fn: 'exp', method: 'trapezoid'});

    expect(found.NumberInput).toHaveLength(2);
    const [inputA, inputB] = found.NumberInput.map(node => node.props);
    expect([inputA.min, inputA.max, inputA.value, inputB.value]).toEqual([-7, 7, 0, 2]);
    inputA.onChange(-1.5);
    inputB.onChange(6.28);
    expect(graph.model).toMatchObject({a: -1.5, b: 6.28});
    expect([pointA(graph).x, pointB(graph).x]).toEqual([-1.5, 6.28]);
    expect(() => inputB.onChange(7.5)).not.toThrow();
    expect(graph.model.b).toBe(6.28);

    expect(found.Slider).toHaveLength(1);
    const slider = found.Slider[0].props;
    expect([slider.min, slider.max, slider.step, slider.value]).toEqual([1, 150, 1, 4]);
    expect(slider.formatValue).toBeUndefined(); // integer counts show the slider's integer number field
    slider.onChange(150);
    expect(graph.model.n).toBe(150);
    slider.onChange(1);
    expect(graph.model.n).toBe(1);
    expect(() => slider.onChange(0)).not.toThrow();
    expect(graph.model.n).toBe(1);
});

test('presets export the model, import it again, and sanitize bad data to the default model', () => {
    const graph = makeGraph();
    apply(graph, fnChoice('exp'));
    apply(graph, parameter('a', 1));
    apply(graph, parameter('b', -1));
    apply(graph, parameter('n', 20));
    apply(graph, methodChoice('midpoint'));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('definite-integral');
    expect(exported.data).toEqual({fn: 'exp', a: 1, b: -1, n: 20, method: 'midpoint'});
    graph.importPresetData({fn: 'sin', a: -2, b: 3, n: 10, method: 'right', extra: true});
    expect(graph.model).toEqual({fn: 'sin', a: -2, b: 3, n: 10, method: 'right'});
    expect(pointA(graph).x).toBe(-2);
    expect(pointB(graph).x).toBe(3);
    graph.importPresetData(JSON.stringify({fn: 'square', a: 0, b: 1, n: 5, method: 'left'}));
    expect(graph.model).toEqual({fn: 'square', a: 0, b: 1, n: 5, method: 'left'});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const good = {fn: 'square', a: 0, b: 2, n: 4, method: 'left'};
    const bad = [undefined, null, 'not json', {}, [], {...good, fn: 'cos'}, {...good, a: 8}, {...good, b: -8}, {...good, n: 0}, {...good, n: 200}, {...good, n: 2.5},
        {...good, method: 'upper'}, {fn: 'square', a: 0, b: 2, n: 4}];
    for (const entry of bad) {
        graph.importPresetData(entry);
        expect(graph.model).toEqual(good);
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
    graph.importPreset({id: 'definite-integral', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {fn: 'sin', a: 0, b: 3, n: 6, method: 'trapezoid'}});
    expect(graph.model).toEqual({fn: 'sin', a: 0, b: 3, n: 6, method: 'trapezoid'});
    graph.importPreset({id: 'definite-integral'});
    expect(graph.model).toEqual(good);
});

test('capture and restore bring back the synchronous model even when React state lags', () => {
    const graph = makeGraph();
    apply(graph, fnChoice('sin'));
    apply(graph, parameter('a', -1));
    apply(graph, parameter('b', 4));
    apply(graph, parameter('n', 30));
    apply(graph, methodChoice('right'));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({fn: 'sin', a: -1, b: 4, n: 30, method: 'right'});
    expect(checkpoint.value.graphState).toMatchObject({fn: 'sin', a: -1, b: 4, n: 30, method: 'right'});
    apply(graph, defaultScene);
    apply(graph, parameter('n', 5));
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({fn: 'sin', a: -1, b: 4, n: 30, method: 'right'});
    expect([pointA(graph).x, pointB(graph).x]).toEqual([-1, 4]);
    expect(polygons(curveData(graph, POSITIVE).x).length + polygons(curveData(graph, NEGATIVE).x).length).toBeGreaterThanOrEqual(29);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
    expect(graph.setState).toHaveBeenLastCalledWith(expect.objectContaining({fn: 'sin', a: -1, b: 4, n: 30, method: 'right'}));
});

test('default scene preparation resets model and view and keeps the object count stable', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    apply(graph, fnChoice('exp'));
    apply(graph, parameter('n', 90));
    graph.board.setBoundingBox.mockClear();
    apply(graph, defaultScene);
    expect(graph.model).toEqual({fn: 'square', a: 0, b: 2, n: 4, method: 'left'});
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    for (let i = 0; i < 5; i++) {
        apply(graph, parameter('n', 50 + i));
        apply(graph, methodChoice('trapezoid'));
        apply(graph, defaultScene);
    }
    expect(boardObjectCount(graph)).toBe(baseline);
    expect([pointA(graph).x, pointB(graph).x]).toEqual([0, 2]);
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
    const graph = new DefiniteIntegralGraph() as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn();
    graph.importPreset({id: 'definite-integral', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {fn: 'square', a: 0, b: 2, n: 4, method: 'left'}});
    graph.board.setBoundingBox.mockClear();
    graph.initialize();
    expect(graph.board.setBoundingBox).not.toHaveBeenCalled();
});

test('figure export preset state follows the imported model', () => {
    const graph = makeGraph();
    graph.importFigurePresetData({id: 'definite-integral', data: {fn: 'exp', a: 1, b: 2, n: 8, method: 'midpoint'}});
    expect(graph.figurePresetGraphState(undefined)).toMatchObject({initialized: true, fn: 'exp', a: 1, b: 2, n: 8, method: 'midpoint'});
});

test('changing the function sets the view of that function, from the inspector and from the lesson action; other changes keep the view', () => {
    const graph = makeGraph({asyncState: false});
    graph.board.setBoundingBox.mockClear();
    apply(graph, fnChoice('sin'));
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(SIN_BOX, true);
    apply(graph, fnChoice('exp'));
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(EXP_BOX, true);
    apply(graph, fnChoice('square'));
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(BOX, true);
    graph.board.setBoundingBox.mockClear();
    apply(graph, parameter('n', 20));
    apply(graph, methodChoice('midpoint'));
    apply(graph, parameter('b', 1));
    expect(graph.board.setBoundingBox).not.toHaveBeenCalled();
    // the inspector select does the same
    const found: any[] = [];
    const walk = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(walk);
        if (node.type?.name === 'ChoiceSelect') found.push(node);
        walk(node.props?.children);
    };
    walk([graph.renderControls(), graph.renderReveals()]);
    found[0].props.onChange('sin');
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(SIN_BOX, true);
});

test('the default scene uses the x^2 view and lesson step 5 ends with the sin view', () => {
    const graph = makeGraph();
    apply(graph, fnChoice('exp'));
    graph.board.setBoundingBox.mockClear();
    apply(graph, defaultScene);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(BOX, true);
    const step5 = getLessonForDemonstration('definite-integral')!.steps[4];
    for (const action of step5.scene!.actions) apply(graph, action);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(SIN_BOX, true);
    // [0, 2*pi] lies inside the sin view
    expect(SIN_BOX[0]).toBeLessThan(0);
    expect(SIN_BOX[2]).toBeGreaterThan(2 * Math.PI);
});

test('a view stored in a preset wins over the function view on initialization, and a preset with sin and no view uses the sin view', () => {
    const graph = new DefiniteIntegralGraph() as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn();
    graph.importPreset({id: 'definite-integral', data: {fn: 'sin', a: 0, b: 3, n: 6, method: 'left'}});
    graph.initialize();
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(SIN_BOX, true);
});

test('the n slider shows an integer number field that commits typed whole numbers to the graph and rejects fractions', () => {
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
    render(found.Slider[0]);
    const field = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(field.value).toBe('4');
    act(() => { fireEvent.change(field, {target: {value: '12'}}); });
    expect(graph.model.n).toBe(12);
    act(() => { fireEvent.change(field, {target: {value: '2.5'}}); });
    expect(graph.model.n).toBe(12);
});

test('Edit order: controls, then the readout, then the legend (no reveal area when the graph has no reveals)', () => {
    const graph = makeGraph({asyncState: false});
    const children = (graph.workspaceEdit() as any).props.children;
    expect(children.map((child: any) => child?.type?.name ?? (child ? 'controls' : null))).toEqual(['controls', null, 'FunctionReadout', 'FunctionLegend']);
});
