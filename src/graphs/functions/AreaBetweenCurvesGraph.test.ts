import {AreaBetweenCurvesGraph} from './AreaBetweenCurvesGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {onLanguageChange, setLanguage} from '../../localization';
import {GraphPalette} from '../styles/GraphPalette';
import {areaFill, INTERSECTIONS} from '../../analysis/areaBetween';

const BOX = [-1.3, 4.2, 5.3, -1];
const S = Math.sqrt(1.5);

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
            if (type === 'curve') {
                object.dataX = parents[0];
                object.dataY = parents[1];
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
    const graph = new AreaBetweenCurvesGraph({}) as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = jest.fn();
    graph.setState = jest.fn((patch: any) => { if (!asyncState) graph.state = {...graph.state, ...patch}; });
    graph.initialize();
    return graph;
}

const apply = (graph: any, action: LessonAction) => graph.applyLessonAction(action);
const parameter = (name: any, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const mode = (value: string): LessonAction => ({kind: 'function-choice', name: 'area-mode', value});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const boardObjectCount = (graph: any) => graph.board.objectsList.length;
const [POSITIVE, NEGATIVE] = [0, 1];
const [P1, P2, POINT_A, POINT_B] = [0, 1, 2, 3];
const [LABEL_F, LABEL_G] = [0, 1];
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
}, [[]]).filter(group => group.length > 0);
const pointA = (graph: any) => ofType(graph, 'point')[POINT_A];
const pointB = (graph: any) => ofType(graph, 'point')[POINT_B];
const textAt = (graph: any, index: number) => {
    const parent = ofType(graph, 'text')[index].parents[2];
    return typeof parent === 'function' ? parent() : parent;
};
/** The caption (the last board text) holds the two results, then the two formulas on a wide board. */
const valuesText = (graph: any) => graph.captionPlainLines().slice(0, 2).join(', ');
const readout = (graph: any) => Object.fromEntries((graph.renderReadout().props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));
const DEFAULT_OBJECTS = 13;

beforeEach(() => setLanguage('sl'));

test('initialization draws two fill curves, two bound lines, two curves, two fixed intersections, two bound points, two curve names and one caption', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({a: 2 - S, b: 2 + S, mode: 'between'});
    expect(graph.presets()).toBe('area-between-curves');
    expect(ofType(graph, 'curve')).toHaveLength(2);
    expect(ofType(graph, 'segment')).toHaveLength(2);
    expect(ofType(graph, 'functiongraph')).toHaveLength(2);
    expect(ofType(graph, 'point')).toHaveLength(4);
    expect(ofType(graph, 'text')).toHaveLength(3);
    expect(boardObjectCount(graph)).toBe(DEFAULT_OBJECTS);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    // the default view has about the aspect of the workspace (1.27) and shows x from -0.5 to 4.5 and both intersections
    expect((BOX[2] - BOX[0]) / (BOX[1] - BOX[3])).toBeCloseTo(1.27, 2);
    expect(BOX[0]).toBeLessThan(-0.5);
    expect(BOX[2]).toBeGreaterThan(4.5);
    // the two intersections are fixed at (2 -+ sqrt(1.5), 1.5); the bounds sit on the axis at the unrounded intersections
    expect([ofType(graph, 'point')[P1].parents, ofType(graph, 'point')[P2].parents]).toEqual([[INTERSECTIONS[0], 1.5], [INTERSECTIONS[1], 1.5]]);
    expect(ofType(graph, 'point')[P1].attributes.fixed).toBe(true);
    expect(ofType(graph, 'point')[P1].attributes.name).toBe('$$P_1$$');
    expect([pointA(graph).x, pointA(graph).y, pointB(graph).x, pointB(graph).y]).toEqual([2 - S, 0, 2 + S, 0]);
    expect(pointA(graph).attributes.name).toBe('$$a$$');
    expect(pointB(graph).attributes.name).toBe('$$b$$');
    // two different palette colours for the two signs; the curves are drawn after (above) the shading
    expect(ofType(graph, 'curve').map((curve: any) => curve.attributes.fillColor)).toEqual([GraphPalette.additionalCurves[0], GraphPalette.additionalCurves[1]]);
    const order = (object: any) => graph.board.objectsList.indexOf(object);
    expect(order(ofType(graph, 'functiongraph')[0])).toBeGreaterThan(order(ofType(graph, 'curve')[1]));
    // f and g have distinct colours, are labelled on the board, and f(2) = 0, g(2) = 3
    const [curveF, curveG] = ofType(graph, 'functiongraph');
    expect(curveF.attributes.strokeColor).not.toBe(curveG.attributes.strokeColor);
    expect([curveF.parents[0](2), curveG.parents[0](2)]).toEqual([0, 3]);
    expect([textAt(graph, LABEL_F), textAt(graph, LABEL_G)]).toEqual(['<i>f</i>', '<i>g</i>']);
    expect(graph.captionPlainLines().slice(2)).toEqual(['f(x) = (x − 2)²', 'g(x) = 3 − (x − 2)²']);
    expect(ofType(graph, 'text')[LABEL_F].attributes.strokeColor).toBe(curveF.attributes.strokeColor);
    expect(ofType(graph, 'text')[LABEL_G].attributes.strokeColor).toBe(curveG.attributes.strokeColor);
    // values far outside the view are left out of the paths, so their extent stays near the view
    expect(curveF.parents[0](-1)).toBeNaN();
    expect(curveG.parents[0](5)).toBeNaN();
    expect(curveF.parents[0](0)).toBe(4);
    expect(valuesText(graph)).toBe('∫(g − f) dx = 4,899, ploščina = 4,899');
});

test('the default scene shades one polygon in the g-on-top colour, none in the f-on-top colour', () => {
    const graph = makeGraph();
    const positive = curveData(graph, POSITIVE);
    expect(polygons(positive.x)).toHaveLength(1);
    expect(curveData(graph, NEGATIVE)).toEqual({x: [], y: []});
    expect(positive.x[0]).toBe(INTERSECTIONS[0]);
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [mode('under-g'), parameter('a', 0), parameter('b', 4)]) apply(graph, action);
    expect(graph.model).toEqual({a: 0, b: 4, mode: 'under-g'});
    expect(graph.state).toMatchObject({a: 2 - S, b: 2 + S, mode: 'between'});
    expect([pointA(graph).x, pointB(graph).x]).toEqual([0, 4]);
    expect(valuesText(graph)).toBe('∫(g − f) dx = 1,3333, ploščina = 8,4646');
    // a later action in the same tick sees the earlier ones
    apply(graph, parameter('b', 3));
    apply(graph, mode('under-f'));
    apply(graph, parameter('a', 1));
    expect(graph.model).toEqual({a: 1, b: 3, mode: 'under-f'});
    expect(valuesText(graph)).toBe('∫(g − f) dx = 4,6667, ploščina = 4,6667');
    expect(polygons(curveData(graph, POSITIVE).x)).toHaveLength(1);
    expect(curveData(graph, NEGATIVE).x).toEqual([]);
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('area-between-curves')!;
    expect(lesson.steps).toHaveLength(5);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph({asyncState: false});
        // a deliberately different user state that the default scene must reset
        apply(graph, mode('under-f'));
        apply(graph, parameter('a', -1));
        apply(graph, parameter('b', 0.2));
        for (const action of step.scene!.actions) apply(graph, action);
        const rows = readout(graph);
        graph.state = {...graph.state, ...graph.model};
        return [graph.model, [rows['int-f'], rows['int-g'], rows.signed, rows.unsigned, rows.shaded].join(' | '), valuesText(graph)];
    });
    expect(finals).toEqual([
        [{a: 2 - S, b: 2 + S, mode: 'under-g'}, '1,2247 | 6,1237 | 4,899 | 4,899 | 6,1237', '∫(g − f) dx = 4,899, ploščina = 4,899'],
        [{a: 1, b: 3, mode: 'between'}, '0,6667 | 5,3333 | 4,6667 | 4,6667 | 4,6667', '∫(g − f) dx = 4,6667, ploščina = 4,6667'],
        [{a: 2 - S, b: 2 + S, mode: 'between'}, '1,2247 | 6,1237 | 4,899 | 4,899 | 4,899', '∫(g − f) dx = 4,899, ploščina = 4,899'],
        [{a: 0, b: 4, mode: 'between'}, '5,3333 | 6,6667 | 1,3333 | 8,4646 | 8,4646', '∫(g − f) dx = 1,3333, ploščina = 8,4646'],
        [{a: 1, b: 3.5, mode: 'between'}, '1,4583 | 6,0417 | 4,5833 | 4,9823 | 4,9823', '∫(g − f) dx = 4,5833, ploščina = 4,9823'],
    ]);
});

test('changing the mode or the bounds regenerates the data but never the number of board objects', () => {
    const graph = makeGraph();
    for (const value of ['under-f', 'under-g', 'between', 'under-g', 'between']) {
        for (const [a, b] of [[0, 4], [-1, 5], [5, -1], [2, 2], [1, 3], [0.77, 0.78]]) {
            apply(graph, mode(value));
            apply(graph, parameter('a', a));
            apply(graph, parameter('b', b));
            expect(boardObjectCount(graph)).toBe(DEFAULT_OBJECTS);
            expect(graph.generatedObjectCount).toBe(DEFAULT_OBJECTS);
        }
    }
});

test('the two fills follow the sign: on [0, 4] f-on-top pieces go to the second fill, and under-g puts the part below the axis there', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', 0));
    apply(graph, parameter('b', 4));
    expect(polygons(curveData(graph, POSITIVE).x)).toHaveLength(1);
    expect(polygons(curveData(graph, NEGATIVE).x)).toHaveLength(2);
    apply(graph, mode('under-g'));
    expect(polygons(curveData(graph, POSITIVE).x)).toHaveLength(1);
    expect(polygons(curveData(graph, NEGATIVE).x)).toHaveLength(2);
    expect(curveData(graph, NEGATIVE).y.filter(value => !Number.isNaN(value)).every(value => value <= 1e-12)).toBe(true);
    apply(graph, mode('under-f'));
    expect(polygons(curveData(graph, POSITIVE).x)).toHaveLength(1);
    expect(curveData(graph, NEGATIVE).x).toEqual([]);
    // the fill data is the analysis module's
    apply(graph, mode('between'));
    expect(curveData(graph, POSITIVE).x.filter(value => !Number.isNaN(value))).toEqual(areaFill('between', 0, 4).positive.x.filter(value => !Number.isNaN(value)));
});

test('the drawn fill is clamped to a quarter view height beyond the view', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', -1));
    apply(graph, parameter('b', 0));
    const all = [...curveData(graph, POSITIVE).y, ...curveData(graph, NEGATIVE).y].filter(value => !Number.isNaN(value));
    expect(all.length).toBeGreaterThan(0);
    const margin = 0.25 * (BOX[1] - BOX[3]);
    expect(Math.max(...all)).toBeLessThanOrEqual(BOX[1] + margin + 1e-12);
    expect(Math.min(...all)).toBeGreaterThanOrEqual(BOX[3] - margin - 1e-12);
});

test('the dashed bound lines follow the mode and the bounds', () => {
    const graph = makeGraph();
    const [lineA, lineB] = ofType(graph, 'segment');
    const end = (line: any, which: 0 | 1) => [line.parents[which][0](), line.parents[which][1]()];
    expect(lineA.attributes.dash).toBe(2);
    expect(lineB.attributes.dash).toBe(2);
    // between: from f(x) to g(x), which meet at the intersections
    expect(end(lineA, 0)[0]).toBe(2 - S);
    expect(end(lineA, 0)[1]).toBeCloseTo(1.5, 12);
    expect(end(lineA, 1)[1]).toBeCloseTo(1.5, 12);
    apply(graph, parameter('b', 4));
    expect([end(lineB, 0), end(lineB, 1)]).toEqual([[4, 4], [4, -1]]);
    apply(graph, mode('under-g'));
    expect([end(lineB, 0), end(lineB, 1)]).toEqual([[4, 0], [4, -1]]);
    apply(graph, mode('under-f'));
    expect([end(lineB, 0), end(lineB, 1)]).toEqual([[4, 0], [4, 4]]);
});

test('a = b draws nothing and reports 0; a > b flips the signed values and keeps the area', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, parameter('a', 2));
    apply(graph, parameter('b', 2));
    expect(curveData(graph, POSITIVE)).toEqual({x: [], y: []});
    expect(curveData(graph, NEGATIVE)).toEqual({x: [], y: []});
    expect(valuesText(graph)).toBe('∫(g − f) dx = 0, ploščina = 0');
    expect(Object.values(readout(graph)).join('|')).toBe('2|2|0|0|0|0|0');
    apply(graph, parameter('a', 4));
    apply(graph, parameter('b', 0));
    expect(readout(graph)).toMatchObject({a: '4', b: '0', 'int-f': '−5,3333', 'int-g': '−6,6667', signed: '−1,3333', unsigned: '8,4646', shaded: '8,4646'});
    expect(polygons(curveData(graph, POSITIVE).x)).toHaveLength(1);
    expect(polygons(curveData(graph, NEGATIVE).x)).toHaveLength(2);
});

test('dragging a bound keeps it on the x-axis, rounds to 0.01, clamps to [-1, 5] and does not move the objects again', () => {
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
    expect(graph.model.a).toBe(5);
    a.x = -99;
    a.handlers.drag();
    expect(graph.model.a).toBe(-1);
    a.x = 1;
    a.handlers.drag();
    const b = pointB(graph);
    b.x = 0.456;
    b.handlers.drag();
    expect(graph.model.b).toBe(0.46);
    expect(graph.model.b).toBeLessThan(graph.model.a);
    // the mode is untouched by dragging
    expect(graph.model.mode).toBe('between');
    // dragging does not run the scene sync again (the point was moved only to the rounded place)
    b.moveTo.mockClear();
    b.x = 2.5;
    b.handlers.drag();
    expect(b.moveTo).toHaveBeenCalledTimes(1);
});

test('invalid values are rejected without changing the model', () => {
    const graph = makeGraph();
    const before = {...graph.model};
    for (const bad of [5.01, -1.01, NaN, Infinity, -Infinity]) {
        expect(() => apply(graph, parameter('a', bad))).toThrow();
        expect(() => apply(graph, parameter('b', bad))).toThrow();
    }
    expect(() => apply(graph, mode('under'))).toThrow();
    expect(() => apply(graph, mode('Between'))).toThrow();
    expect(graph.model).toEqual(before);
    apply(graph, parameter('a', -1));
    apply(graph, parameter('b', 5));
    expect(graph.model).toMatchObject({a: -1, b: 5});
});

test('names, targets and kinds the graph does not own are unsupported', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'y1', 'x2', 'y2', 'k', 'n', 'A', 'omega', 'phi', 'B', 'x0', 'h']) {
        expect(() => apply(graph, parameter(name, 1))).toThrow(UnsupportedLessonActionError);
    }
    for (const target of ['mirror', 'reference', 'tangent']) {
        expect(() => apply(graph, {kind: 'function-visibility', target, visible: true} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    for (const name of ['trig-function', 'derivative-function', 'integral-function', 'sum-method']) {
        expect(() => apply(graph, {kind: 'function-choice', name, value: 'sin'} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
    expect(graph.model).toEqual({a: 2 - S, b: 2 + S, mode: 'between'});
});

test('readouts: a, b, ∫f, ∫g, signed ∫(g-f), unsigned ∫|g-f| and the shaded quantity, in both languages', () => {
    const graph = makeGraph({asyncState: false});
    expect(readout(graph)).toEqual({a: '0,78', b: '3,22', 'int-f': '1,2247', 'int-g': '6,1237', signed: '4,899', unsigned: '4,899', shaded: '4,899'});
    expect(Object.keys(readout(graph))).toEqual(['a', 'b', 'int-f', 'int-g', 'signed', 'unsigned', 'shaded']);
    const labels = () => (graph.renderReadout().props.rows as { id: string; label: string }[]).map(row => row.label);
    expect(labels().slice(2)).toEqual(['∫ f(x) dx', '∫ g(x) dx', '∫ (g(x) − f(x)) dx (predznačeno)', '∫ |g(x) − f(x)| dx (ploščina)', 'Pobarvano: ploščina med f in g']);
    apply(graph, mode('under-f'));
    expect(labels()[6]).toBe('Pobarvano: ∫ f(x) dx');
    expect(readout(graph).shaded).toBe('1,2247');
    apply(graph, mode('under-g'));
    expect(labels()[6]).toBe('Pobarvano: ∫ g(x) dx');
    expect(readout(graph).shaded).toBe('6,1237');
    setLanguage('en');
    apply(graph, mode('between'));
    apply(graph, parameter('a', 0));
    apply(graph, parameter('b', 4));
    expect(readout(graph)).toEqual({a: '0', b: '4', 'int-f': '5.3333', 'int-g': '6.6667', signed: '1.3333', unsigned: '8.4646', shaded: '8.4646'});
    expect(labels().slice(4)).toEqual(['∫ (g(x) − f(x)) dx (signed)', '∫ |g(x) − f(x)| dx (area)', 'Shaded: area between f and g']);
    expect(graph.renderReadout().props.note).toMatch(/counts as negative/);
    for (const value of ['under-f', 'under-g', 'between']) for (const [a, b] of [[-1, 5], [5, -1], [0, 0], [3, 3]]) {
        apply(graph, mode(value));
        apply(graph, parameter('a', a));
        apply(graph, parameter('b', b));
        expect(Object.values(readout(graph)).join('|')).not.toMatch(/Infinity|NaN|—/);
        expect(valuesText(graph)).not.toMatch(/Infinity|NaN/);
    }
});

test('the caption follows the language, and a language change notifies subscribers', () => {
    const graph = makeGraph();
    apply(graph, parameter('a', 0));
    apply(graph, parameter('b', 4));
    expect(graph.captionPlainLines().slice(0, 2)).toEqual(['∫(g − f) dx = 1,3333', 'ploščina = 8,4646']);
    const listener = jest.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(graph.captionPlainLines().slice(0, 2)).toEqual(['∫(g − f) dx = 1.3333', 'area = 8.4646']);
    unsubscribe();
});

test('the legend names the colours in words for each mode, and reversed bounds add a note', () => {
    const graph = makeGraph();
    const legend = () => graph.renderLegend().props.items.map((item: any) => [item.id, item.label]);
    expect(legend()).toEqual([
        ['f', 'f(x) = (x − 2)²'], ['g', 'g(x) = 3 − (x − 2)²'], ['positive', 'g nad f: šteje pozitivno (+)'], ['negative', 'f nad g: šteje negativno (−)'],
    ]);
    graph.state = {...graph.state, mode: 'under-f'};
    expect(legend().slice(2)).toEqual([['positive', 'Krivulja nad osjo x: šteje pozitivno (+)'], ['negative', 'Krivulja pod osjo x: šteje negativno (−)']]);
    const notes = () => ([] as string[]).concat(graph.renderReadout().props.note);
    expect(notes()).toHaveLength(1);
    graph.state = {...graph.state, a: 3, b: 1};
    expect(notes()).toHaveLength(2);
    expect(notes()[1]).toMatch(/obrnjeni/);
});

test('controls: mode select with three correctly labelled options, bound inputs wired to a and b', () => {
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
    const select = found.ChoiceSelect[0].props;
    expect(select.value).toBe('between');
    expect(select.options.map((option: any) => option.value)).toEqual(['under-f', 'under-g', 'between']);
    expect(select.options.map((option: any) => option.text)).toEqual(['Ploščina pod f (do osi x)', 'Ploščina pod g (do osi x)', 'Ploščina med f in g']);
    select.onChange('under-g');
    expect(graph.model.mode).toBe('under-g');
    // the option shades what it says: under-g shades the region under g (its upper boundary is g)
    const top = () => Math.max(...curveData(graph, POSITIVE).y.filter(value => !Number.isNaN(value)));
    expect(top()).toBeCloseTo(3, 1);
    select.onChange('under-f');
    expect(top()).toBeCloseTo(1.5, 1);
    select.onChange('under-g');
    apply(graph, parameter('a', 1.5));
    apply(graph, parameter('b', 2.5));
    expect(top()).toBeCloseTo(3, 1);
    expect(() => select.onChange('under')).not.toThrow();
    expect(graph.model.mode).toBe('under-g');

    expect(found.NumberInput).toHaveLength(2);
    const [inputA, inputB] = found.NumberInput.map(node => node.props);
    expect([inputA.min, inputA.max, inputB.min, inputB.max]).toEqual([-1, 5, -1, 5]);
    expect([inputA.value, inputB.value]).toEqual([2 - S, 2 + S]);
    inputA.onChange(-0.5);
    inputB.onChange(4.5);
    expect(graph.model).toMatchObject({a: -0.5, b: 4.5});
    expect([pointA(graph).x, pointB(graph).x]).toEqual([-0.5, 4.5]);
    expect(() => inputB.onChange(5.5)).not.toThrow();
    expect(graph.model.b).toBe(4.5);
});

test('the inspector shows the default bounds as 0.78 and 3.22 while the model keeps them unrounded', () => {
    const graph = makeGraph({asyncState: false});
    expect(graph.state.a).toBe(2 - S);
    const text = (value: number) => String(Number(value.toFixed(2)));
    expect([text(graph.state.a), text(graph.state.b)]).toEqual(['0.78', '3.22']);
});

test('presets export the model, import it again, and sanitize bad data to the default model', () => {
    const graph = makeGraph();
    apply(graph, mode('under-f'));
    apply(graph, parameter('a', 1));
    apply(graph, parameter('b', -1));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('area-between-curves');
    expect(exported.data).toEqual({a: 1, b: -1, mode: 'under-f'});
    graph.importPresetData({a: -1, b: 3, mode: 'under-g', extra: true});
    expect(graph.model).toEqual({a: -1, b: 3, mode: 'under-g'});
    expect(pointA(graph).x).toBe(-1);
    expect(pointB(graph).x).toBe(3);
    graph.importPresetData(JSON.stringify({a: 0, b: 4, mode: 'between'}));
    expect(graph.model).toEqual({a: 0, b: 4, mode: 'between'});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const good = {a: 2 - S, b: 2 + S, mode: 'between'};
    const bad = [undefined, null, 'not json', {}, [], {a: 0, b: 4, mode: 'under'}, {a: 5.5, b: 0, mode: 'between'}, {a: 0, b: -2, mode: 'between'}, {a: '0', b: 4, mode: 'between'}, {a: 0, b: 4}];
    for (const entry of bad) {
        graph.importPresetData(entry);
        expect(graph.model).toEqual(good);
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
    graph.importPreset({id: 'area-between-curves', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {a: 0, b: 3, mode: 'under-g'}});
    expect(graph.model).toEqual({a: 0, b: 3, mode: 'under-g'});
    graph.importPreset({id: 'area-between-curves'});
    expect(graph.model).toEqual(good);
});

test('capture and restore bring back the synchronous model even when React state lags', () => {
    const graph = makeGraph();
    apply(graph, mode('under-g'));
    apply(graph, parameter('a', -1));
    apply(graph, parameter('b', 4));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({a: -1, b: 4, mode: 'under-g'});
    expect(checkpoint.value.graphState).toMatchObject({a: -1, b: 4, mode: 'under-g'});
    apply(graph, defaultScene);
    apply(graph, parameter('a', 3));
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({a: -1, b: 4, mode: 'under-g'});
    expect([pointA(graph).x, pointB(graph).x]).toEqual([-1, 4]);
    expect(polygons(curveData(graph, POSITIVE).x).length + polygons(curveData(graph, NEGATIVE).x).length).toBe(3);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
    expect(graph.setState).toHaveBeenLastCalledWith(expect.objectContaining({a: -1, b: 4, mode: 'under-g'}));
});

test('default scene preparation resets model and view and keeps the object count stable', () => {
    const graph = makeGraph();
    apply(graph, mode('under-g'));
    apply(graph, parameter('a', 0));
    graph.board.setBoundingBox.mockClear();
    apply(graph, defaultScene);
    expect(graph.model).toEqual({a: 2 - S, b: 2 + S, mode: 'between'});
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    for (let i = 0; i < 5; i++) {
        apply(graph, parameter('a', i / 4));
        apply(graph, mode('under-f'));
        apply(graph, defaultScene);
    }
    expect(boardObjectCount(graph)).toBe(DEFAULT_OBJECTS);
    expect([pointA(graph).x, pointB(graph).x]).toEqual([2 - S, 2 + S]);
});

test('generated objects are disposed and not duplicated across repeated generation', () => {
    const graph = makeGraph();
    expect(graph.generatedObjectCount).toBe(DEFAULT_OBJECTS);
    for (let i = 0; i < 4; i++) graph.initialize();
    expect(boardObjectCount(graph)).toBe(DEFAULT_OBJECTS);
    expect(graph.generatedObjectCount).toBe(DEFAULT_OBJECTS);
    graph.disposeFigureScene();
    expect(boardObjectCount(graph)).toBe(0);
    expect(graph.generatedObjectCount).toBe(0);
    // no stale reference to the removed points: a model change after disposal must not touch them
    expect(() => apply(graph, parameter('a', 1))).not.toThrow();
    graph.initialize();
    expect(boardObjectCount(graph)).toBe(DEFAULT_OBJECTS);
    graph.graphSession = {isReady: false, isAlive: false};
    graph.disposeFigureScene();
    expect(graph.generatedObjectCount).toBe(0);
});

test('a stored board state is not overwritten by the default view during initialization', () => {
    const graph = new AreaBetweenCurvesGraph({}) as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = jest.fn();
    graph.setState = jest.fn();
    graph.importPreset({id: 'area-between-curves', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {a: 0, b: 2, mode: 'between'}});
    graph.board.setBoundingBox.mockClear();
    graph.initialize();
    expect(graph.board.setBoundingBox).not.toHaveBeenCalled();
});

test('figure export preset state follows the imported model', () => {
    const graph = makeGraph();
    graph.importFigurePresetData({id: 'area-between-curves', data: {a: 1, b: 2, mode: 'under-f'}});
    expect(graph.figurePresetGraphState(undefined)).toMatchObject({initialized: true, a: 1, b: 2, mode: 'under-f'});
});
