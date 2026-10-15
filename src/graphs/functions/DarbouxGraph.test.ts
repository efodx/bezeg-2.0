import {DarbouxGraph} from './DarbouxGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {DARBOUX_N_MAX, DARBOUX_X_MAX, DARBOUX_X_MIN, DARBOUX_EXAMPLE_IDS, darbouxExample, darbouxSubintervals, darbouxTotals, canRefine} from '../../analysis/darboux';
import {DARBOUX_EXAMPLE_MODELS} from '../../analysis/darbouxModel';
import {currentLanguage, onLanguageChange, setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';

const BOX = [-3.2, 4.6, 5.2, -3.6];

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
            board.objectsList.push(object);
            return object;
        }),
        removeObject: vi.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((object: any) => !list.includes(object));
        }),
        unitX: 100, unitY: 100, canvasWidth: 1000,
        getBoundingBox: vi.fn(() => BOX),
        setBoundingBox: vi.fn(),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

/** A graph whose React state is NOT updated synchronously, exactly like setState inside one lesson tick (unless asyncState is false). */
function makeGraph({asyncState = true}: { asyncState?: boolean } = {}) {
    const graph = new DarbouxGraph() as any;
    graph.board = fakeBoard();
    const session: any = {
        isReady: true, isAlive: true, dispose: vi.fn(() => { session.isAlive = false; }), signal: new AbortController().signal,
        waitUntilReady: () => Promise.resolve(), beginTransition: () => () => undefined,
    };
    graph.graphSession = session;
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn((patch: any) => { if (!asyncState) graph.store.setState(patch); });
    graph.initialize();
    return graph;
}

const apply = (graph: any, action: LessonAction) => graph.applyLessonAction(action);
const parameter = (name: 'darboux-a' | 'darboux-b' | 'darboux-n', value: number): LessonAction => ({kind: 'function-parameter', name, value});
const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'darboux-example', value});
const lower = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'lower-sum', visible});
const upper = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'upper-sum', visible});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const boardObjectCount = (graph: any) => graph.board.objectsList.length;

// Creation order: curves (upper rectangles, lower rectangles, partition), the function graph, the draggable a and b, the one caption text.
const [UPPER, LOWER, PARTITION] = [0, 1, 2];
const curves = (graph: any) => ofType(graph, 'curve');
const axisPoints = (graph: any) => ofType(graph, 'point');
const caption = (graph: any) => graph.captionPlainLines();
/** The data a rectangle curve draws now, after JSXGraph asks it to update. */
const drawn = (curve: any) => {
    curve.updateDataArray();
    return {x: curve.dataX as number[], y: curve.dataY as number[]};
};
/** The rectangles of a curve as [x0, x1, height] triples (the outline of each is 5 points, NaN-separated). */
const rects = (curve: any): number[][] => {
    const {x, y} = drawn(curve);
    const result: number[][] = [];
    for (let i = 0; i < x.length; i += 6) result.push([x[i], x[i + 2], y[i + 1]]);
    return result;
};

/** Collects the React elements of a rendered tree by component name or host tag. */
function collect(node: any, found: Record<string, any[]> = {}) {
    if (!node || typeof node !== 'object') return found;
    if (Array.isArray(node)) { node.forEach(child => collect(child, found)); return found; }
    const name = typeof node.type === 'string' ? node.type : node.type?.name;
    if (name) (found[name] ??= []).push(node);
    collect(node.props?.children, found);
    return found;
}
const controls = (graph: any) => {
    const found = collect(graph.renderControls());
    const [inputA, inputB, inputN] = found.NumberInput;
    const button = (action: string) => found.button.find((element: any) => element.props['data-action'] === action);
    return {found, inputA, inputB, inputN, refine: button('refine'), toggleLower: button('toggle-lower'), toggleUpper: button('toggle-upper')};
};
const rows = (graph: any): Record<string, string> =>
    Object.fromEntries((graph.renderReadout().props.children[0].props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));
const statusIds = (graph: any) => graph.statuses(graph.model).map((status: { id: string }) => status.id);
const statusTexts = (graph: any, language: 'sl' | 'en' = 'sl') => {
    const previous = currentLanguage();
    setLanguage(language);
    try {
        return graph.statuses(graph.model).map((status: { text: string }) => status.text);
    } finally {
        setLanguage(previous);
    }
};

beforeEach(() => setLanguage('sl'));

test('initialization draws the rectangles, the partition, the function, the two points and one caption text for x^2 on [0, 2] with n = 4', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({example: 'square', a: 0, b: 2, n: 4, lowerVisible: true, upperVisible: true});
    expect(graph.presets()).toBe('darboux');
    expect(curves(graph)).toHaveLength(3);
    expect(ofType(graph, 'functiongraph')).toHaveLength(1);
    expect(axisPoints(graph)).toHaveLength(2);
    expect(ofType(graph, 'text')).toHaveLength(1);
    expect(boardObjectCount(graph)).toBe(7);
    expect(graph.generatedObjectCount).toBe(7);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    expect(axisPoints(graph).map((point: any) => [point.x, point.y])).toEqual([[0, 0], [2, 0]]);
    expect(ofType(graph, 'functiongraph')[0].parents[0](1.5)).toBe(2.25);
    // lower rectangles reach the infimum (the left end of an increasing function), upper ones the supremum
    expect(rects(curves(graph)[LOWER])).toEqual([[0, 0.5, 0], [0.5, 1, 0.25], [1, 1.5, 1], [1.5, 2, 2.25]]);
    expect(rects(curves(graph)[UPPER])).toEqual([[0, 0.5, 0.25], [0.5, 1, 1], [1, 1.5, 2.25], [1.5, 2, 4]]);
    expect(caption(graph)).toEqual(['f(x) = x²', 'n = 4, integral = 2,6667', 'L = 1,75, U = 3,75', 'poln: spodnja vsota L; črtkan: zgornja vsota U']);
});

test('the lower and the upper rectangles differ by outline pattern as well as by colour, and the key says so in words', () => {
    const graph = makeGraph();
    const [upperCurve, lowerCurve] = [curves(graph)[UPPER], curves(graph)[LOWER]];
    expect(upperCurve.attributes.dash).not.toBe(lowerCurve.attributes.dash);
    expect(lowerCurve.attributes.dash).toBe(0);
    expect(upperCurve.attributes.fillColor).not.toBe(lowerCurve.attributes.fillColor);
    expect(lowerCurve.attributes.fillOpacity).toBeGreaterThan(upperCurve.attributes.fillOpacity);
    const items = graph.renderLegend().props.items as { id: string; label: string; kind: string }[];
    expect(items.map(item => [item.id, item.kind])).toEqual([['function', 'line'], ['lower', 'area'], ['upper', 'dashed'], ['partition', 'line']]);
    expect(items[1].label).toMatch(/polni.*infimum/);
    expect(items[2].label).toMatch(/črtkan.*supremum/);
    expect(items.map(item => item.label).join(' ')).not.toMatch(/lev|desn/);
    setLanguage('en');
    const english = graph.renderLegend().props.items.map((item: any) => item.label);
    expect(english[1]).toMatch(/filled.*infimum/);
    expect(english[2]).toMatch(/dashed.*supremum/);
    expect(english.join(' ')).not.toMatch(/left|right/i);
    expect(caption(graph)[3]).toBe('filled: lower sum L; dashed: upper sum U');
});

test('the readout gives n, both sums, the exact integral and the gap for x^2 on [0, 2] with n = 4', () => {
    const graph = makeGraph({asyncState: false});
    expect(rows(graph)).toEqual({a: '0', b: '2', n: '4', lower: '1,75', upper: '3,75', integral: '2,6667', gap: '2'});
    expect(statusIds(graph)).toEqual(['trapped']);
    // the status states the relation in words, never a changing number (it would be announced on every drag step)
    expect(statusTexts(graph)[0]).not.toMatch(/\d/);
    expect(statusTexts(graph, 'en')[0]).toBe('The integral lies between the lower and the upper sum: L ≤ integral ≤ U.');
});

test('sin x on [0, pi] with n = 1: the supremum is 1 at the interior pi/2, so U = pi, L = 0 and the integral is 2', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('sine'));
    apply(graph, parameter('darboux-b', Math.PI));
    apply(graph, parameter('darboux-n', 1));
    expect(graph.model).toEqual({example: 'sine', a: 0, b: Math.PI, n: 1, lowerVisible: true, upperVisible: true});
    expect(rows(graph)).toMatchObject({lower: '0', upper: '3,1416', integral: '2', gap: '3,1416'});
    expect(rects(curves(graph)[UPPER])).toEqual([[0, Math.PI, 1]]);
    expect(rects(curves(graph)[LOWER])).toEqual([[0, Math.PI, 0]]);
    // a left-endpoint sample (f(0) * pi = 0) is not an upper bound of the integral 2, and the app does not use one
    expect(darbouxExample('sine').value(0) * Math.PI).toBeLessThan(2);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-1, 2, 7.6, -4.6], true);
});

test('the default sine example shows negative infima below the axis and the signed sums L = -pi, U = pi around the integral 0', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('sine'));
    expect(graph.model).toEqual({...DARBOUX_EXAMPLE_MODELS.sine});
    expect(rows(graph)).toMatchObject({lower: '−3,1416', upper: '3,1416', integral: '0', gap: '6,2832', n: '4'});
    const heights = rects(curves(graph)[LOWER]).map(([, , height]) => Math.round(height * 1e9) / 1e9);
    expect(heights).toEqual([0, 0, -1, -1]);
});

test('hidden sums hide their rectangles, their readouts and the gap, while the partition and the exact integral stay', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, lower(false));
    apply(graph, upper(false));
    expect(resolve(curves(graph)[LOWER].attributes.visible)).toBe(false);
    expect(resolve(curves(graph)[UPPER].attributes.visible)).toBe(false);
    expect(drawn(curves(graph)[LOWER]).x).toEqual([]);
    expect(drawn(curves(graph)[UPPER]).x).toEqual([]);
    expect(drawn(curves(graph)[PARTITION]).x.filter(Number.isFinite)).toHaveLength(10); // 5 dividing points
    expect(rows(graph)).toEqual({a: '0', b: '2', n: '4', lower: 'skrito', upper: 'skrito', integral: '2,6667', gap: 'skrito'});
    expect(statusIds(graph)).toEqual(['hidden']);
    expect(caption(graph)[2]).toBe('L = skrito, U = skrito');
    expect(caption(graph).join(' ')).not.toMatch(/1,75|3,75/);
    // showing one of them reveals only that one; the gap needs both
    apply(graph, lower(true));
    expect(rows(graph)).toMatchObject({lower: '1,75', upper: 'skrito', gap: 'skrito'});
    expect(statusIds(graph)).toEqual(['hidden']);
    apply(graph, upper(true));
    expect(rows(graph)).toMatchObject({lower: '1,75', upper: '3,75', gap: '2'});
    expect(statusIds(graph)).toEqual(['trapped']);
});

test('Refine doubles n through the button, is the same as the lesson action, and is unavailable with an explanation at the limit', () => {
    const viaButton = makeGraph({asyncState: false});
    const viaLesson = makeGraph({asyncState: false});
    const sequence = [8, 16, 32, 64, 128];
    for (const n of sequence) {
        expect(controls(viaButton).refine.props.disabled).toBe(false);
        controls(viaButton).refine.props.onClick();
        apply(viaLesson, parameter('darboux-n', n));
        expect(viaButton.model).toEqual(viaLesson.model);
        expect(viaButton.model.n).toBe(n);
        expect(rows(viaButton)).toEqual(rows(viaLesson));
        expect(caption(viaButton)).toEqual(caption(viaLesson));
        expect(rects(curves(viaButton)[LOWER])).toEqual(rects(curves(viaLesson)[LOWER]));
    }
    // at the limit the button is disabled, says why, and a press changes nothing
    expect(canRefine(viaButton.model.n)).toBe(false);
    const atLimit = controls(viaButton);
    expect(atLimit.refine.props.disabled).toBe(true);
    expect(atLimit.refine.props['aria-describedby']).toBe('darboux-refine-help');
    const help = collect(viaButton.renderControls()).p.find((element: any) => element.props.id === 'darboux-refine-help');
    expect(String(help.props.children)).toContain(String(DARBOUX_N_MAX));
    expect(statusIds(viaButton)).toEqual(['trapped', 'limit']);
    expect(() => atLimit.refine.props.onClick()).not.toThrow();
    expect(viaButton.model.n).toBe(DARBOUX_N_MAX);
    expect(() => viaButton.refinePartition()).toThrow(DomainError);
    expect(viaButton.model.n).toBe(DARBOUX_N_MAX);
});

test('refinement keeps L nondecreasing, U nonincreasing and the integral between them, up to the limit, as displayed', () => {
    const graph = makeGraph({asyncState: false});
    for (const id of DARBOUX_EXAMPLE_IDS) {
        apply(graph, choice(id));
        let previous: { lower: number; upper: number } | undefined;
        for (let n = 1; n <= DARBOUX_N_MAX; n *= 2) {
            apply(graph, parameter('darboux-n', n));
            const totals = darbouxTotals(darbouxExample(id), graph.model.a, graph.model.b, n);
            expect(totals.lower).toBeLessThanOrEqual(totals.integral + 1e-12);
            expect(totals.integral).toBeLessThanOrEqual(totals.upper + 1e-12);
            if (previous) {
                expect(totals.lower).toBeGreaterThanOrEqual(previous.lower - 1e-12);
                expect(totals.upper).toBeLessThanOrEqual(previous.upper + 1e-12);
            }
            previous = totals;
        }
    }
});

test('setting n, a and b through the number fields and through the lesson actions gives the same configuration', () => {
    const viaControl = makeGraph({asyncState: false});
    const viaLesson = makeGraph({asyncState: false});
    for (const value of [1, 7, 128, 4]) {
        expect(controls(viaControl).inputN.props.onChange(value)).toBe(true);
        apply(viaLesson, parameter('darboux-n', value));
        expect(viaControl.model).toEqual(viaLesson.model);
        expect(rows(viaControl)).toEqual(rows(viaLesson));
        expect(caption(viaControl)).toEqual(caption(viaLesson));
    }
    expect(controls(viaControl).inputA.props.onChange(-1)).toBe(true);
    apply(viaLesson, parameter('darboux-a', -1));
    expect(controls(viaControl).inputB.props.onChange(3)).toBe(true);
    apply(viaLesson, parameter('darboux-b', 3));
    expect(viaControl.model).toEqual(viaLesson.model);
    expect(viaControl.model).toMatchObject({a: -1, b: 3, n: 4});
    controls(viaControl).toggleLower.props.onClick();
    apply(viaLesson, lower(false));
    controls(viaControl).toggleUpper.props.onClick();
    apply(viaLesson, upper(false));
    expect(viaControl.model).toEqual(viaLesson.model);
    controls(viaControl).found.ChoiceSelect[0].props.onChange('sine');
    apply(viaLesson, choice('sine'));
    expect(viaControl.model).toEqual(viaLesson.model);
    expect(rows(viaControl)).toEqual(rows(viaLesson));
    expect(axisPoints(viaControl).map((point: any) => point.x)).toEqual(axisPoints(viaLesson).map((point: any) => point.x));
});

test('invalid values are rejected, never clamped: every setter throws DomainError and leaves the model unchanged', () => {
    const graph = makeGraph({asyncState: false});
    const before = {...graph.model};
    for (const n of [0, -1, 129, 256, 2.5, NaN, Infinity]) {
        expect(() => apply(graph, parameter('darboux-n', n)), `n = ${n}`).toThrow(DomainError);
    }
    for (const a of [2, 3, -7.5, 7.5, NaN, Infinity]) expect(() => apply(graph, parameter('darboux-a', a)), `a = ${a}`).toThrow(DomainError);
    for (const b of [0, -1, 7.5, -7.5, NaN, Infinity]) expect(() => apply(graph, parameter('darboux-b', b)), `b = ${b}`).toThrow(DomainError);
    expect(() => apply(graph, choice('quartic'))).toThrow(DomainError);
    expect(graph.model).toEqual(before);
    // the boundary values themselves are accepted
    apply(graph, parameter('darboux-b', DARBOUX_X_MAX));
    apply(graph, parameter('darboux-a', DARBOUX_X_MIN));
    apply(graph, parameter('darboux-n', DARBOUX_N_MAX));
    expect(graph.model).toMatchObject({a: DARBOUX_X_MIN, b: DARBOUX_X_MAX, n: DARBOUX_N_MAX});
});

test('the number fields carry their ranges, report rejection with a hint and show the rule', () => {
    const graph = makeGraph({asyncState: false});
    const {inputA, inputB, inputN} = controls(graph);
    expect([inputA, inputB, inputN].map((input: any) => [input.props.label, input.props.min, input.props.max, input.props.value])).toEqual([
        ['Levo krajišče a', -7, 7, 0], ['Desno krajišče b', -7, 7, 2], ['Število delov n', 1, 128, 4],
    ]);
    expect(inputA.props.onChange(2)).toBe(false); // a = b
    expect(inputA.props.onChange(3)).toBe(false);
    expect(inputB.props.onChange(0)).toBe(false);
    expect(inputN.props.onChange(2.5)).toBe(false);
    expect(inputN.props.onChange(0)).toBe(false);
    expect(graph.model).toMatchObject({a: 0, b: 2, n: 4});
    expect(inputA.props.rejectedHint).toMatch(/a < b/);
    expect(inputN.props.rejectedHint).toBe('Število delov n mora biti celo število od 1 do 128.');
    expect(inputA.props.onChange(1.5)).toBe(true);
    expect(collect(graph.renderControls()).p.some((element: any) => /a < b/.test(String(element.props.children)))).toBe(true);
    setLanguage('en');
    expect(controls(graph).inputA.props.label).toBe('Left endpoint a');
    expect(controls(graph).inputN.props.label).toBe('Number of parts n');
});

test('the toggles name their state in words and the example select loads the example model and keeps the visibility', () => {
    const graph = makeGraph({asyncState: false});
    expect(controls(graph).toggleLower.props.children).toBe('Skrij spodnjo vsoto');
    controls(graph).toggleLower.props.onClick();
    expect(controls(graph).toggleLower.props.children).toBe('Pokaži spodnjo vsoto');
    expect(controls(graph).toggleLower.props['data-revealed']).toBe(false);
    expect(controls(graph).toggleUpper.props['data-revealed']).toBe(true);
    apply(graph, parameter('darboux-n', 16));
    controls(graph).found.ChoiceSelect[0].props.onChange('sine');
    expect(graph.model).toEqual({...DARBOUX_EXAMPLE_MODELS.sine, lowerVisible: false});
    setLanguage('en');
    expect(controls(graph).toggleLower.props.children).toBe('Show lower sum');
    expect(controls(graph).refine.props.children).toBe('Refine the partition (n → 2n)');
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [choice('sine'), parameter('darboux-b', Math.PI), parameter('darboux-n', 1), lower(false), upper(false)]) apply(graph, action);
    expect(graph.model).toEqual({example: 'sine', a: 0, b: Math.PI, n: 1, lowerVisible: false, upperVisible: false});
    expect(graph.state).toMatchObject({example: 'square', a: 0, b: 2, n: 4, lowerVisible: true, upperVisible: true});
    // a later action in the same tick sees the earlier one, including an endpoint that depends on the other endpoint
    apply(graph, parameter('darboux-a', 1));
    apply(graph, parameter('darboux-b', 2));
    expect(() => apply(graph, parameter('darboux-a', 2))).toThrow(DomainError);
    expect(graph.model).toEqual({example: 'sine', a: 1, b: 2, n: 1, lowerVisible: false, upperVisible: false});
    graph.refinePartition();
    graph.refinePartition();
    expect(graph.model.n).toBe(4);
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('darboux')!;
    expect(lesson.id).toBe('darboux-guided');
    expect(lesson.steps).toHaveLength(6);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph({asyncState: false});
        // a deliberately different user state that the default scene must reset
        apply(graph, choice('sine'));
        apply(graph, parameter('darboux-n', 64));
        apply(graph, lower(false));
        for (const action of step.scene!.actions) apply(graph, action);
        const r = rows(graph);
        return [graph.model, r.n, r.lower, r.upper, r.integral, statusIds(graph)];
    });
    const squareModel = {example: 'square', a: 0, b: 2, n: 4};
    const hidden = {lowerVisible: false, upperVisible: false};
    const shown = {lowerVisible: true, upperVisible: true};
    expect(finals).toEqual([
        [{...squareModel, ...hidden}, '4', 'skrito', 'skrito', '2,6667', ['hidden']],
        [{...squareModel, ...shown}, '4', '1,75', '3,75', '2,6667', ['trapped']],
        [{...squareModel, n: 8, ...shown}, '8', '2,1875', '3,1875', '2,6667', ['trapped']],
        [{example: 'sine', a: 0, b: Math.PI, n: 1, ...hidden}, '1', 'skrito', 'skrito', '2', ['hidden']],
        [{example: 'sine', a: 0, b: Math.PI, n: 1, ...shown}, '1', '0', '3,1416', '2', ['trapped']],
        [{example: 'sine', a: 0, b: 2 * Math.PI, n: 4, ...hidden}, '4', 'skrito', 'skrito', '0', ['hidden']],
    ]);
    // the numbers the free-exploration prose states for the sine on [0, 2 pi]
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('sine'));
    expect(rows(graph)).toMatchObject({lower: '−3,1416', upper: '3,1416'});
});

test('the numbers the refine step states are the ones the mathematics gives for n = 16', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, parameter('darboux-n', 16));
    expect(rows(graph)).toMatchObject({lower: '2,4219', upper: '2,9219', gap: '0,5'});
});

test('dragging a and b on the axis projects onto the grid and the range a < b allows, writing the model once', () => {
    const graph = makeGraph();
    const [a, b] = axisPoints(graph);
    for (const point of [a, b]) point.moveTo.mockClear();

    b.x = 1.2349; // off the 0.01 grid
    b.handlers.drag();
    expect(graph.model.b).toBe(1.23);
    expect(b.moveTo).toHaveBeenCalledTimes(1);
    expect([b.x, b.y]).toEqual([1.23, 0]);

    b.x = -9; // below a: clamped just right of it
    b.handlers.drag();
    expect(graph.model.b).toBe(0.01);
    b.x = 9;
    b.handlers.drag();
    expect(graph.model.b).toBe(DARBOUX_X_MAX);

    a.x = 9; // beyond b: clamped just left of it
    a.handlers.drag();
    expect(graph.model.a).toBe(6.99);
    a.x = -9;
    a.handlers.drag();
    expect(graph.model.a).toBe(DARBOUX_X_MIN);
    expect(graph.model.n).toBe(4);
    // a drag already shows the new model: the scene sync does not move the dragged point a second time
    expect(a.moveTo).toHaveBeenCalledTimes(2);
});

test('a drag next to the other endpoint is clamped to one grid step short of it and never leaves a point on a rejected position', () => {
    const graph = makeGraph();
    graph.importPresetData({example: 'square', a: 0.499, b: 0.5, n: 4, lowerVisible: true, upperVisible: true});
    const [a, b] = axisPoints(graph);
    b.moveTo.mockClear();
    b.x = 0.4;
    expect(() => b.handlers.drag()).not.toThrow();
    // the grid step 0.01 above a = 0.499 is 0.509 (clamped), which the model accepts
    expect(graph.model.b).toBe(0.509);
    a.x = 0.7;
    expect(() => a.handlers.drag()).not.toThrow();
    expect(graph.model.a).toBe(0.499);
    expect(a.x).toBe(0.499);
});

test('names, kinds and choices the graph does not own are unsupported', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'k', 'n', 'a', 'b', 'bisect-a', 'mvt-c', 'accum-x']) {
        expect(() => apply(graph, {kind: 'function-parameter', name, value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    for (const target of ['tangent', 'matching-points', 'accumulation-curve']) {
        expect(() => apply(graph, {kind: 'function-visibility', target, visible: true} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'function-choice', name: 'mean-value-example', value: 'abs'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'bisection', command: 'next-step'})).toThrow(UnsupportedLessonActionError);
    for (const supported of [parameter('darboux-a', 0), parameter('darboux-b', 1), parameter('darboux-n', 2), choice('sine'), lower(true), upper(false)]) {
        expect(graph.supportsLessonAction(supported)).toBe(true);
    }
    expect(graph.supportsLessonAction({kind: 'function-parameter', name: 'mvt-a', value: 1})).toBe(false);
    expect(graph.model).toEqual({example: 'square', a: 0, b: 2, n: 4, lowerVisible: true, upperVisible: true});
});

test('presets save the model with the visibility and reopen the same scene', () => {
    const graph = makeGraph();
    apply(graph, choice('sine'));
    apply(graph, parameter('darboux-n', 8));
    apply(graph, upper(false));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('darboux');
    expect(exported.data).toEqual({example: 'sine', a: 0, b: 2 * Math.PI, n: 8, lowerVisible: true, upperVisible: false});

    const reopened = makeGraph({asyncState: false});
    reopened.importPreset({id: 'darboux', boardState: {boundingBox: [-1, 2, 7, -2]}, data: exported.data});
    expect(reopened.model).toEqual(exported.data);
    expect(rows(reopened)).toMatchObject({n: '8', upper: 'skrito'});
    expect(resolve(curves(reopened)[UPPER].attributes.visible)).toBe(false);
    expect(axisPoints(reopened).map((point: any) => point.x)).toEqual([0, 2 * Math.PI]);
    expect(reopened.exportPreset().data).toEqual(exported.data);
    // a string and extra properties are sanitized
    reopened.importPresetData(JSON.stringify({example: 'square', a: -1, b: 3, n: 5, lowerVisible: false, upperVisible: true, extra: true}));
    expect(reopened.model).toEqual({example: 'square', a: -1, b: 3, n: 5, lowerVisible: false, upperVisible: true});
});

test('a preset of another example without a view of its own shows that example\'s view', () => {
    const graph = makeGraph({asyncState: false});
    graph.board.setBoundingBox.mockClear();
    graph.importPreset({id: 'darboux', data: {example: 'sine', a: 0, b: 2 * Math.PI, n: 4, lowerVisible: true, upperVisible: true}});
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-1, 2, 7.6, -4.6], true);
});

test('malformed or misordered preset data is rejected to the default model with a warning', () => {
    const graph = makeGraph();
    apply(graph, parameter('darboux-n', 16));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const valid = {example: 'square', a: 0, b: 2, n: 4, lowerVisible: true, upperVisible: true};
    const bad = [undefined, null, 'not json', {}, [], {...valid, example: 'quartic'}, {...valid, a: 2, b: 0}, {...valid, a: 1, b: 1}, {...valid, a: -7.5}, {...valid, b: 7.5},
        {...valid, a: '0'}, {...valid, n: 0}, {...valid, n: 129}, {...valid, n: 2.5}, {...valid, n: NaN}, {...valid, lowerVisible: 'yes'}, {...valid, upperVisible: 1},
        {example: 'square', a: 0, b: 2, n: 4}];
    for (const entry of bad) {
        graph.importPresetData(entry);
        expect(graph.model).toEqual(valid);
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
});

test('capture and restore bring back the synchronous model, including the visibility', () => {
    const graph = makeGraph();
    apply(graph, choice('sine'));
    apply(graph, parameter('darboux-n', 2));
    apply(graph, lower(false));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({example: 'sine', a: 0, b: 2 * Math.PI, n: 2, lowerVisible: false, upperVisible: true});
    apply(graph, defaultScene);
    expect(graph.model).toEqual({example: 'square', a: 0, b: 2, n: 4, lowerVisible: true, upperVisible: true});
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({example: 'sine', a: 0, b: 2 * Math.PI, n: 2, lowerVisible: false, upperVisible: true});
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
});

test('no readout, caption or status ever shows NaN, Infinity or a raw undefined, in either language', () => {
    const graph = makeGraph({asyncState: false});
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        for (const id of DARBOUX_EXAMPLE_IDS) {
            apply(graph, choice(id));
            for (const n of [1, 128]) {
                apply(graph, parameter('darboux-n', n));
                const text = [...caption(graph), ...Object.values(rows(graph)), ...statusTexts(graph, language)].join(' | ');
                expect(text).not.toMatch(/NaN|Infinity|undefined/);
            }
        }
    }
});

test('unmount leaves no generated object and a late edit changes nothing on the board', () => {
    const graph = makeGraph();
    const [a] = axisPoints(graph);
    graph.unmount();
    expect(graph.generatedObjectCount).toBe(0);
    const setStates = graph.setState.mock.calls.length;
    const updates = graph.boardUpdate.mock.calls.length;
    expect(() => { a.x = 1; a.handlers.drag(); }).not.toThrow();
    expect(() => apply(graph, parameter('darboux-n', 8))).not.toThrow();
    expect(graph.setState.mock.calls.length).toBe(setStates);
    expect(graph.boardUpdate.mock.calls.length).toBe(updates);
    expect(graph.generatedObjectCount).toBe(0);
});

test('generated objects are disposed and not duplicated across repeated generation, example changes and default scenes', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    expect(baseline).toBe(7);
    for (let i = 0; i < 4; i++) graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    expect(graph.generatedObjectCount).toBe(baseline);
    // the object count does not depend on n
    for (let i = 0; i < 5; i++) {
        apply(graph, choice('sine'));
        apply(graph, parameter('darboux-n', 128));
        apply(graph, upper(false));
        apply(graph, defaultScene);
    }
    expect(boardObjectCount(graph)).toBe(baseline);
    graph.disposeFigureScene();
    expect(boardObjectCount(graph)).toBe(0);
    expect(() => apply(graph, parameter('darboux-n', 2))).not.toThrow();
    graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    expect(axisPoints(graph).every((point: any) => graph.board.objectsList.includes(point))).toBe(true);
});

test('the caption follows the language and a language change notifies subscribers', () => {
    const graph = makeGraph();
    expect(caption(graph)[1]).toBe('n = 4, integral = 2,6667');
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(caption(graph)[1]).toBe('n = 4, integral = 2.6667');
    unsubscribe();
});

test('the examples are drawn from the exact subinterval extrema, not from samples', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('sine'));
    apply(graph, parameter('darboux-n', 3));
    const parts = darbouxSubintervals(darbouxExample('sine'), 0, 2 * Math.PI, 3);
    expect(rects(curves(graph)[UPPER]).map(([, , height]) => height)).toEqual(parts.map(part => part.sup));
    expect(rects(curves(graph)[LOWER]).map(([, , height]) => height)).toEqual(parts.map(part => part.inf));
    // the first third [0, 2 pi/3] contains pi/2, so its supremum is exactly sin(pi/2) = 1
    expect(parts[0].sup).toBe(1);
});

test('an endpoint carrying floating-point noise is cleaned and compared cleaned; an irrational endpoint such as pi stays exact', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, parameter('darboux-b', 0.1 + 0.2));
    expect(graph.model.b).toBe(0.3);
    apply(graph, parameter('darboux-a', 0.1));
    const before = graph.model;
    apply(graph, parameter('darboux-a', 0.1 + 1e-15));
    expect(graph.model).toBe(before);
    apply(graph, parameter('darboux-b', Math.PI));
    expect(graph.model.b).toBe(Math.PI);
});

test('the view is memoised by the model values: a copy of the model (the inspector) reuses the board view', () => {
    const graph = makeGraph({asyncState: false});
    const first = graph.viewOf(graph.model);
    expect(graph.viewOf({...graph.model})).toBe(first);
    apply(graph, parameter('darboux-n', 8));
    expect(graph.viewOf(graph.model)).not.toBe(first);
});
