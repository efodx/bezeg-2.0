import {TrigonometricFunctionsGraph} from './TrigonometricFunctionsGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {onLanguageChange, setLanguage} from '../../localization';
import {tangentAsymptotes} from '../../analysis/trigonometric';

const BOX = [-7, 4, 7, -4];

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
        getBoundingBox: vi.fn(() => BOX),
        setBoundingBox: vi.fn(),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

/** A graph whose React state is NOT updated synchronously, exactly like setState inside one lesson tick. */
function makeGraph({asyncState = true}: { asyncState?: boolean } = {}) {
    const graph = new TrigonometricFunctionsGraph() as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn((patch: any) => { if (!asyncState) graph.store.setState(patch); });
    graph.initialize();
    return graph;
}

const apply = (graph: any, action: LessonAction) => graph.applyLessonAction(action);
const parameter = (name: any, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'trig-function', value});
const reference = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'reference', visible});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
// functiongraph: midline, reference (sin/cos), main (sin/cos); curve: reference (tan), asymptotes, main (tan)
const [MIDLINE, REFERENCE, MAIN] = [0, 1, 2];
const [REFERENCE_TAN, ASYMPTOTES, MAIN_TAN] = [0, 1, 2];
const functions = (graph: any) => ofType(graph, 'functiongraph');
const dataCurves = (graph: any) => ofType(graph, 'curve');
const boardObjectCount = (graph: any) => graph.board.objectsList.length;
const data = (curve: any) => {
    curve.updateDataArray();
    return {x: curve.dataX as number[], y: curve.dataY as number[]};
};
const mainValue = (graph: any, x: number) => functions(graph)[MAIN].parents[0](x);

beforeEach(() => setLanguage('sl'));

test('initialization draws f(x) = sin x, the midline, hidden reference, tangent curves and asymptotes, and a view of about two periods', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({fn: 'sin', A: 1, omega: 1, phi: 0, B: 0, reference: false});
    expect(graph.presets()).toBe('trigonometric-function');
    expect(functions(graph)).toHaveLength(3);
    expect(dataCurves(graph)).toHaveLength(3);
    expect(ofType(graph, 'text')).toHaveLength(1);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith([-7, 4, 7, -4], true);
    expect(mainValue(graph, Math.PI / 2)).toBeCloseTo(1, 12);
    expect(functions(graph)[MIDLINE].parents[0](123)).toBe(0);
    expect(functions(graph)[REFERENCE].attributes.visible()).toBe(false);
    expect(functions(graph)[MAIN].attributes.visible()).toBe(true);
    for (const curve of dataCurves(graph)) expect(curve.attributes.visible()).toBe(false);
    expect(functions(graph)[MIDLINE].attributes.dash).toBeGreaterThan(0);
    expect(functions(graph)[REFERENCE].attributes.dash).toBeGreaterThan(0);
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    apply(graph, choice('cos'));
    apply(graph, parameter('A', 2));
    apply(graph, parameter('omega', 2));
    apply(graph, parameter('phi', Math.PI / 2));
    apply(graph, parameter('B', 1));
    apply(graph, reference(true));
    expect(graph.model).toMatchObject({fn: 'cos', A: 2, omega: 2, B: 1, reference: true});
    expect(graph.model.phi).toBeCloseTo(Math.PI / 2, 12);
    expect(graph.state).toMatchObject({fn: 'sin', A: 1, omega: 1, phi: 0, B: 0, reference: false});
    // board objects read the synchronous model
    expect(mainValue(graph, 0)).toBeCloseTo(2 * Math.cos(Math.PI / 2) + 1, 12);
    expect(mainValue(graph, 0.3)).toBeCloseTo(2 * Math.cos(0.6 + Math.PI / 2) + 1, 12);
    expect(functions(graph)[MIDLINE].parents[0](5)).toBe(1);
    expect(functions(graph)[REFERENCE].parents[0](0.5)).toBeCloseTo(Math.cos(0.5), 12);
    expect(functions(graph)[REFERENCE].attributes.visible()).toBe(true);
    // a later action in the same tick sees an earlier one (no stale state)
    apply(graph, choice('tan'));
    apply(graph, parameter('A', -1));
    expect(graph.model).toMatchObject({fn: 'tan', A: -1});
    expect(functions(graph)[MAIN].attributes.visible()).toBe(false);
    expect(dataCurves(graph)[MAIN_TAN].attributes.visible()).toBe(true);
    expect(dataCurves(graph)[REFERENCE_TAN].attributes.visible()).toBe(true);
    expect(dataCurves(graph)[ASYMPTOTES].attributes.visible()).toBe(true);
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('trigonometric-functions')!;
    expect(lesson.steps).toHaveLength(5);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph();
        // Start from a deliberately different user state so that the default scene has to reset it.
        apply(graph, choice('cos'));
        apply(graph, parameter('A', -3));
        apply(graph, parameter('omega', 4));
        apply(graph, parameter('phi', -1));
        apply(graph, parameter('B', 2.5));
        apply(graph, reference(true));
        for (const action of step.scene!.actions) apply(graph, action);
        return graph.model;
    });
    const expected = [
        {fn: 'sin', A: 1, omega: 1, phi: 0, B: 0, reference: false},
        {fn: 'sin', A: 2, omega: 1, phi: 0, B: -1, reference: false},
        {fn: 'sin', A: 2, omega: 2, phi: Math.PI / 2, B: 1, reference: false},
        {fn: 'sin', A: 1, omega: 1, phi: Math.PI / 2, B: 0, reference: true},
        {fn: 'tan', A: 1, omega: 1, phi: 0, B: 0, reference: false},
    ];
    finals.forEach((model, index) => {
        const {phi, ...rest} = model;
        const {phi: expectedPhi, ...expectedRest} = expected[index];
        expect(rest).toEqual(expectedRest);
        expect(phi).toBeCloseTo(expectedPhi, 12);
    });
});

test('the worked example on the drawn curve: max 3 at x = 0, min -1, period pi, crossing the midline at -pi/4', () => {
    const graph = makeGraph();
    apply(graph, parameter('A', 2));
    apply(graph, parameter('omega', 2));
    apply(graph, parameter('phi', Math.PI / 2));
    apply(graph, parameter('B', 1));
    expect(mainValue(graph, 0)).toBeCloseTo(3, 12);
    expect(mainValue(graph, Math.PI / 2)).toBeCloseTo(-1, 12);
    expect(mainValue(graph, -Math.PI / 4)).toBeCloseTo(1, 12);
    expect(mainValue(graph, 1.1 + Math.PI)).toBeCloseTo(mainValue(graph, 1.1), 12);
    const sampled = Array.from({length: 1000}, (_, i) => mainValue(graph, -7 + 14 * i / 999));
    expect(Math.max(...sampled)).toBeLessThanOrEqual(3 + 1e-12);
    expect(Math.min(...sampled)).toBeGreaterThanOrEqual(-1 - 1e-12);
    expect(functions(graph)[MIDLINE].parents[0](0)).toBe(1);
});

test('the cosine scene: sin(x + pi/2) equals cos x and the reference is sin x', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    apply(graph, choice('sin'));
    apply(graph, parameter('phi', Math.PI / 2));
    apply(graph, reference(true));
    for (const x of [-5, -1, 0, 0.7, 3]) {
        expect(mainValue(graph, x)).toBeCloseTo(Math.cos(x), 12);
        expect(functions(graph)[REFERENCE].parents[0](x)).toBeCloseTo(Math.sin(x), 12);
    }
    // choosing cos with phi = 0 gives the same solid graph
    const other = makeGraph();
    apply(other, choice('cos'));
    for (const x of [-5, -1, 0, 0.7, 3]) expect(mainValue(other, x)).toBeCloseTo(mainValue(graph, x), 12);
});

test('tangent is drawn branch by branch: the curve data never joins two sides of an asymptote', () => {
    const graph = makeGraph();
    apply(graph, choice('tan'));
    const {x, y} = data(dataCurves(graph)[MAIN_TAN]);
    const asymptotes = tangentAsymptotes(1, 0, BOX[0], BOX[2]);
    expect(asymptotes).toHaveLength(4);
    expect(x).toHaveLength(y.length);
    expect(x.filter(Number.isNaN)).toHaveLength(asymptotes.length); // one separator per asymptote
    expect(y.filter(Number.isNaN)).toHaveLength(asymptotes.length);
    for (let i = 1; i < x.length; i++) {
        if (Number.isNaN(x[i]) || Number.isNaN(x[i - 1])) continue;
        for (const asymptote of asymptotes) expect(x[i - 1] < asymptote && asymptote < x[i]).toBe(false);
    }
    expect(y.filter(value => !Number.isNaN(value)).every(Number.isFinite)).toBe(true);
    expect(Math.max(...y.filter(value => !Number.isNaN(value)).map(Math.abs))).toBeLessThan(101);
});

test('tangent data follows the parameters, the view and the model of the same tick', () => {
    const graph = makeGraph();
    apply(graph, choice('tan'));
    apply(graph, parameter('omega', 2));
    apply(graph, parameter('phi', Math.PI / 4));
    apply(graph, parameter('A', 2));
    apply(graph, parameter('B', -1));
    const {x, y} = data(dataCurves(graph)[MAIN_TAN]);
    x.forEach((value, i) => {
        if (!Number.isNaN(value)) expect(y[i]).toBeCloseTo(2 * Math.tan(2 * value + Math.PI / 4) - 1, 9);
    });
    const asymptotes = data(dataCurves(graph)[ASYMPTOTES]);
    const verticals = asymptotes.x.filter(value => !Number.isNaN(value));
    expect(verticals).toHaveLength(2 * tangentAsymptotes(2, Math.PI / 4, BOX[0], BOX[2]).length);
    // every vertical segment runs from the bottom to the top of the view
    expect(asymptotes.y.filter(value => !Number.isNaN(value))).toEqual(verticals.map((_, i) => (i % 2 === 0 ? BOX[3] : BOX[1])));
    // a different view changes the sampled range
    graph.board.getBoundingBox.mockReturnValue([0, 4, 3, -4]);
    const narrow = data(dataCurves(graph)[MAIN_TAN]).x.filter(value => !Number.isNaN(value));
    expect(Math.min(...narrow)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...narrow)).toBeLessThanOrEqual(3);
    graph.board.getBoundingBox.mockReturnValue(BOX);
});

test('tangent reference draws plain tan in branches, and the data curves are empty for sin and cos', () => {
    const graph = makeGraph();
    apply(graph, reference(true));
    for (const curve of dataCurves(graph)) expect(data(curve).x).toEqual([]);
    apply(graph, choice('tan'));
    apply(graph, parameter('A', 2));
    const {x, y} = data(dataCurves(graph)[REFERENCE_TAN]);
    x.forEach((value, i) => { if (!Number.isNaN(value)) expect(y[i]).toBeCloseTo(Math.tan(value), 9); });
    expect(x.filter(Number.isNaN)).toHaveLength(4);
    apply(graph, choice('cos'));
    for (const curve of dataCurves(graph)) expect(data(curve).x).toEqual([]);
});

test.each([
    ['A', [-3.01, 3.01, NaN, Infinity, -Infinity, 1e9]],
    ['omega', [0, -1, 0.24, 4.01, NaN, Infinity]],
    ['phi', [-3.2, 3.2, NaN, Infinity, 7]],
    ['B', [-3.01, 3.01, NaN, -Infinity]],
])('%s outside its domain is rejected without mutation', (name, values) => {
    const graph = makeGraph();
    apply(graph, parameter('A', 1.5));
    const before = {...graph.model};
    for (const value of values) {
        expect(() => apply(graph, parameter(name, value))).toThrow();
        expect(graph.model).toEqual(before);
    }
});

test('the domain edges are accepted and omega = 0 is excluded', () => {
    const graph = makeGraph();
    for (const [name, value] of [['A', -3], ['A', 3], ['A', 0], ['omega', 0.25], ['omega', 4], ['phi', -Math.PI], ['phi', Math.PI], ['B', -3], ['B', 3]] as const) {
        expect(() => apply(graph, parameter(name, value))).not.toThrow();
    }
    expect(() => apply(graph, parameter('omega', 0))).toThrow();
    expect(graph.model.omega).toBe(4);
});

test('slider arithmetic is cleaned and the phase snaps to a multiple of pi/12', () => {
    const graph = makeGraph();
    apply(graph, parameter('A', -3 + 14 * 0.1));
    expect(graph.model.A).toBe(-1.6);
    apply(graph, parameter('B', -3 + 30 * 0.1));
    expect(graph.model.B).toBe(0);
    expect(Object.is(graph.model.B, 0)).toBe(true);
    apply(graph, parameter('omega', 0.25 + 15 * 0.05));
    expect(graph.model.omega).toBe(1);
    apply(graph, parameter('phi', -Math.PI + 6 * (Math.PI / 12) + 1e-13));
    expect(graph.model.phi).toBeCloseTo(-Math.PI / 2, 14);
    apply(graph, parameter('phi', -Math.PI + 24 * (Math.PI / 12) + 2e-10));
    expect(graph.model.phi).toBeLessThanOrEqual(Math.PI);
    expect(graph.model.phi).toBeCloseTo(Math.PI, 12);
});

test('unknown function choices and names or targets the graph does not own are unsupported or rejected', () => {
    const graph = makeGraph();
    expect(() => apply(graph, choice('sec'))).toThrow();
    expect(() => apply(graph, choice('SIN'))).toThrow();
    for (const name of ['x1', 'y1', 'x2', 'y2', 'k', 'n', 'a']) expect(() => apply(graph, parameter(name, 1))).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-visibility', target: 'mirror', visible: true})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-choice', name: 'derivative-function', value: 'sin'} as any)).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
    expect(graph.model).toEqual({fn: 'sin', A: 1, omega: 1, phi: 0, B: 0, reference: false});
});

test('readouts: amplitude, period, shift and range, with exact multiples of pi, in both languages', () => {
    const graph = makeGraph({asyncState: false});
    const rows = () => graph.renderReadout().props.rows as { id: string; value: string }[];
    const byId = () => Object.fromEntries(rows().map(row => [row.id, row.value]));
    expect(byId()).toEqual({equation: 'f(x) = sin(x)', phi: '0', amplitude: '1', period: '6,28 (2π)', shift: '0', range: '[−1; 1]'});
    apply(graph, parameter('A', 2));
    apply(graph, parameter('omega', 2));
    apply(graph, parameter('phi', Math.PI / 2));
    apply(graph, parameter('B', 1));
    expect(byId()).toEqual({
        equation: 'f(x) = 2·sin(2x + π/2) + 1', phi: '1,57 (π/2)', amplitude: '2', period: '3,14 (π)', shift: '−0,79 (−π/4)', range: '[−1; 3]',
    });
    setLanguage('en');
    expect(byId()).toMatchObject({period: '3.14 (π)', shift: '−0.79 (−π/4)', range: '[−1, 3]'});
    apply(graph, choice('tan'));
    expect(byId()).toMatchObject({amplitude: '—', period: '1.57 (π/2)', range: 'all real numbers'});
    expect(graph.renderReadout().props.note).toMatch(/asymptotes/);
    setLanguage('sl');
    expect(byId().range).toBe('vsa realna števila');
    apply(graph, choice('sin'));
    expect(graph.renderReadout().props.note).toBeUndefined();
    apply(graph, parameter('phi', 1));
    expect(byId().phi).toBe('1');
    for (const fn of ['sin', 'cos', 'tan']) {
        apply(graph, choice(fn));
        for (const [name, value] of [['A', 0], ['omega', 0.25], ['omega', 4], ['phi', -Math.PI], ['B', -3]] as const) {
            apply(graph, parameter(name, value));
            expect(rows().map(row => row.value).join('|')).not.toMatch(/Infinity|NaN/);
        }
    }
});

test('the caption follows the language, and a language change notifies subscribers', () => {
    const graph = makeGraph();
    apply(graph, parameter('A', 0.5));
    apply(graph, parameter('omega', 0.5));
    expect(graph.captionPlainLines()).toEqual(['f(x) = 0,5·sin(0,5x)']);
    apply(graph, reference(true));
    expect(graph.captionPlainLines()).toEqual(['f(x) = 0,5·sin(0,5x)', 'sin(x) (referenčni graf)']);
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(graph.captionPlainLines()).toEqual(['f(x) = 0.5·sin(0.5x)', 'sin(x) (reference graph)']);
    unsubscribe();
});

test('controls: a labelled native select, four sliders, the reference switch, and the phase slider is shown in multiples of pi', () => {
    const graph = makeGraph({asyncState: false});
    const controls = graph.renderControls();
    const flat: any[] = [];
    const walk = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(walk);
        flat.push(node);
        walk(node.props?.children);
    };
    walk(controls);
    const named = (name: string) => flat.filter(node => node.type?.name === name || node.type?.displayName === name);
    expect(named('ChoiceSelect')).toHaveLength(1);
    expect(named('ChoiceSelect')[0].props.label).toBe('Osnovna funkcija g');
    expect(named('ChoiceSelect')[0].props.options.map((option: any) => option.value)).toEqual(['sin', 'cos', 'tan']);
    const sliders = named('Slider');
    expect(sliders.map((slider: any) => [slider.props.min, slider.props.max])).toEqual([[-3, 3], [0.25, 4], [-Math.PI, Math.PI], [-3, 3]]);
    expect(sliders[2].props.step).toBeCloseTo(Math.PI / 12, 14);
    expect(sliders[2].props.formatValue(Math.PI / 2)).toBe('π/2');
    expect(sliders[2].props.formatValue(-Math.PI)).toBe('−π');
    // choosing from the select and moving the sliders goes through the synchronous model
    named('ChoiceSelect')[0].props.onChange('cos');
    sliders[0].props.onChange(-3 + 17 * 0.1);
    sliders[2].props.onChange(-Math.PI + 18 * (Math.PI / 12));
    expect(graph.model).toMatchObject({fn: 'cos', A: -1.3});
    expect(graph.model.phi).toBeCloseTo(Math.PI / 2, 12);
    // an out-of-domain value from a control is ignored instead of throwing
    expect(() => sliders[1].props.onChange(0)).not.toThrow();
    expect(graph.model.omega).toBe(1);
    named('OnOffSwitch')[0].props.onChange(true);
    expect(graph.model.reference).toBe(true);
});

test('presets export the model, import it again, and sanitize bad data to the default model', () => {
    const graph = makeGraph();
    apply(graph, choice('tan'));
    apply(graph, parameter('omega', 2));
    apply(graph, reference(true));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('trigonometric-function');
    expect(exported.data).toEqual({fn: 'tan', A: 1, omega: 2, phi: 0, B: 0, reference: true});
    graph.importPresetData({fn: 'cos', A: -2, omega: 0.5, phi: -Math.PI / 3, B: 1});
    expect(graph.model).toEqual({fn: 'cos', A: -2, omega: 0.5, phi: -Math.PI / 3, B: 1, reference: false});
    graph.importPresetData(JSON.stringify({fn: 'sin', A: 1, omega: 4, phi: 0, B: 0, reference: true}));
    expect(graph.model).toMatchObject({fn: 'sin', omega: 4, reference: true});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const base = {fn: 'sin', A: 1, omega: 1, phi: 0, B: 0};
    const bad = [undefined, null, 'not json', {}, [], {...base, fn: 'sec'}, {...base, omega: 0}, {...base, omega: -2}, {...base, A: 4}, {...base, phi: 4}, {...base, B: NaN}, {...base, reference: 'yes'}];
    for (const entry of bad) {
        graph.importPresetData(entry);
        expect(graph.model).toEqual({fn: 'sin', A: 1, omega: 1, phi: 0, B: 0, reference: false});
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
    graph.importPreset({id: 'trigonometric-function', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {fn: 'cos', A: 1, omega: 1, phi: 0, B: 0, reference: true}});
    expect(graph.model.fn).toBe('cos');
    graph.importPreset({id: 'trigonometric-function'});
    expect(graph.model).toEqual({fn: 'sin', A: 1, omega: 1, phi: 0, B: 0, reference: false});
});

test('capture and restore bring back the synchronous model even when React state lags', () => {
    const graph = makeGraph();
    apply(graph, choice('cos'));
    apply(graph, parameter('A', -1.5));
    apply(graph, parameter('phi', Math.PI / 3));
    apply(graph, reference(true));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toMatchObject({fn: 'cos', A: -1.5, reference: true});
    expect(checkpoint.value.graphState).toMatchObject({fn: 'cos', A: -1.5, reference: true});
    apply(graph, defaultScene);
    apply(graph, choice('tan'));
    expect(graph.model.fn).toBe('tan');
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toMatchObject({fn: 'cos', A: -1.5, reference: true});
    expect(graph.model.phi).toBeCloseTo(Math.PI / 3, 12);
    expect(mainValue(graph, 0.2)).toBeCloseTo(-1.5 * Math.cos(0.2 + Math.PI / 3), 12);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
    expect(graph.setState).toHaveBeenLastCalledWith(expect.objectContaining({fn: 'cos', A: -1.5, reference: true}));
});

test('default scene preparation resets model and view and keeps the object count stable', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    apply(graph, choice('tan'));
    apply(graph, parameter('omega', 3));
    apply(graph, reference(true));
    graph.board.setBoundingBox.mockClear();
    apply(graph, defaultScene);
    expect(graph.model).toEqual({fn: 'sin', A: 1, omega: 1, phi: 0, B: 0, reference: false});
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith([-7, 4, 7, -4], true);
    for (let i = 0; i < 5; i++) {
        apply(graph, choice(['sin', 'cos', 'tan'][i % 3]));
        apply(graph, parameter('omega', 0.5 + 0.5 * i));
        apply(graph, reference(i % 2 === 0));
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
    const graph = new TrigonometricFunctionsGraph() as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn();
    graph.importPreset({id: 'trigonometric-function', boardState: {boundingBox: [-1, 1, 1, -1]}, data: {fn: 'sin', A: 1, omega: 1, phi: 0, B: 0}});
    graph.board.setBoundingBox.mockClear();
    graph.initialize();
    expect(graph.board.setBoundingBox).not.toHaveBeenCalled();
});

test('figure export preset state follows the imported model', () => {
    const graph = makeGraph();
    graph.importFigurePresetData({id: 'trigonometric-function', data: {fn: 'tan', A: 2, omega: 1, phi: 0, B: 0, reference: true}});
    expect(graph.figurePresetGraphState(undefined)).toMatchObject({initialized: true, fn: 'tan', A: 2, reference: true});
});
