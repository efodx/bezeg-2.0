import {TaylorGraph} from './TaylorGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {TAYLOR_EXAMPLE_IDS, TAYLOR_EXAMPLES, TaylorExampleId} from '../../analysis/taylor';
import {TAYLOR_EXAMPLE_MODELS} from '../../analysis/taylorModel';
import {currentLanguage, onLanguageChange, setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';

const BOX = [-3.5, 10, 3.5, -4];

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
        getBoundingBox: vi.fn(() => BOX),
        setBoundingBox: vi.fn(),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

/** A graph whose React state is NOT updated synchronously, exactly like setState inside one lesson tick (unless asyncState is false). */
function makeGraph({asyncState = true}: { asyncState?: boolean } = {}) {
    const graph = new TaylorGraph() as any;
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
type ParameterName = 'taylor-center' | 'taylor-degree' | 'taylor-x';
const parameter = (name: ParameterName, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'taylor-example', value});
const reveal = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'taylor-bound', visible});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const boardObjectCount = (graph: any) => graph.board.objectsList.length;

// Creation order per type: segments are the convergence interval, the bound band, the drop line at c and the error; functiongraphs are f and T_n;
// points are the value points (f(c), f(x), T_n(x)) and then the draggable c and x; texts are the convergence label and the one caption.
const segments = (graph: any) => ofType(graph, 'segment');
const [CONVERGENCE, BOUND_BAND, , ERROR] = [0, 1, 2, 3];
const functionGraphs = (graph: any) => ofType(graph, 'functiongraph');
const valuePoints = (graph: any) => ofType(graph, 'point').slice(0, 3);
const axisPoints = (graph: any) => ofType(graph, 'point').slice(3);
const convergenceLabel = (graph: any) => ofType(graph, 'text')[0];
const caption = (graph: any) => graph.captionPlainLines();
const visible = (object: any) => resolve(object.attributes.visible);
const at = (point: any) => [point.X(), point.Y()];

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
    const [inputCenter, inputX, inputDegree] = found.NumberInput;
    const button = (action: string) => found.button.find((element: any) => element.props['data-action'] === action);
    return {found, inputCenter, inputX, inputDegree, toggle: button('toggle-taylor-bound'), decrease: button('degree-decrease'), increase: button('degree-increase')};
};
const rows = (graph: any): Record<string, string> =>
    Object.fromEntries((graph.renderReadout().props.children[0].props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));
const statusIds = (graph: any) => graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: { id: string }) => status.id);
const statusTexts = (graph: any, language: 'sl' | 'en' = 'sl') => {
    const previous = currentLanguage();
    setLanguage(language);
    try {
        return graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: { text: string }) => status.text);
    } finally {
        setLanguage(previous);
    }
};
const numbers = (graph: any) => graph.viewOf(graph.model);

beforeEach(() => setLanguage('sl'));

// ---- Independent references (not the production formulas) -----------------------------------------------------------------

/** Exact rational partial sum of e^x about 0 at x = 1 with a plain factorial loop. */
const expPartialSum = (n: number) => {
    let sum = 0;
    let term = 1;
    for (let k = 0; k <= n; k++) {
        sum += term;
        term /= k + 1;
    }
    return sum;
};
/** The sine derivative cycle written out, summed term by term. */
const sinePolynomial = (center: number, n: number, x: number) => {
    const cycle = [Math.sin(center), Math.cos(center), -Math.sin(center), -Math.cos(center)];
    let sum = 0;
    let factorial = 1;
    for (let k = 0; k <= n; k++) {
        if (k > 0) factorial *= k;
        sum += cycle[k % 4] * (x - center) ** k / factorial;
    }
    return sum;
};
/** The geometric-series remainder in closed form: f - T_n = ((x - c) / (1 - c))^(n + 1) / (1 - x). */
const geometricError = (center: number, n: number, x: number) => ((x - center) / (1 - center)) ** (n + 1) / (1 - x);

test('initialization draws e^x about 0 with T_1 at x = 1 and the error bound hidden', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({example: 'exp', center: 0, degree: 1, x: 1, boundVisible: false});
    expect(graph.presets()).toBe('taylor');
    expect(segments(graph)).toHaveLength(4);
    expect(functionGraphs(graph)).toHaveLength(2);
    expect(ofType(graph, 'point')).toHaveLength(5);
    expect(ofType(graph, 'text')).toHaveLength(2);
    expect(boardObjectCount(graph)).toBe(13);
    expect(graph.generatedObjectCount).toBe(13);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    expect(functionGraphs(graph)[0].parents[0](1)).toBe(Math.E);
    expect(functionGraphs(graph)[1].parents[0](1)).toBe(2);
    expect(axisPoints(graph).map((point: any) => [point.x, point.y])).toEqual([[0, 0], [1, 0]]);
    expect(valuePoints(graph).map(at)).toEqual([[0, 1], [1, Math.E], [1, 2]]);
    expect(caption(graph)).toEqual([
        'f(x) = eˣ', 'c = 0, n = 1, x = 1', 'Tₙ(x) = 2, f(x) = 2,7183', 'napaka |f(x) − Tₙ(x)| = 0,7183', 'ocena napake: skrita',
        'polna črta: f; črtkana črta: Tₙ; navpična črta pri x: napaka',
    ]);
});

test('f is a solid line and T_n a dashed line, the error a vertical segment at x between T_n(x) and f(x), distinguishable by pattern and not only colour', () => {
    const graph = makeGraph();
    const [f, polynomial] = functionGraphs(graph);
    expect(f.attributes.dash).toBe(0);
    expect(polynomial.attributes.dash).toBe(3);
    expect(f.attributes.strokeColor).not.toBe(polynomial.attributes.strokeColor);
    const error = segments(graph)[ERROR];
    expect([error.parents[0][0](), error.parents[0][1](), error.parents[1][0](), error.parents[1][1]()]).toEqual([1, 2, 1, Math.E]);
    expect(visible(error)).toBe(true);
    // T_n is drawn beyond the x domain (the polynomial exists everywhere), f of 1/(1 - x) only left of 1
    apply(graph, parameter('taylor-degree', 3));
    expect(polynomial.parents[0](-10)).toBeCloseTo(1 - 10 + 50 - 1000 / 6, 12);
    apply(graph, choice('geometric'));
    expect(f.parents[0](0.5)).toBe(2);
    expect(f.parents[0](1)).toBeNaN();
    expect(f.parents[0](3)).toBeNaN();
    // no error segment when the polynomial hits the function
    apply(graph, choice('flat'));
    apply(graph, parameter('taylor-x', -1));
    expect(visible(error)).toBe(false);
});

test('before the reveal the bound reads hidden everywhere; the polynomial, function and errors are always given', () => {
    const graph = makeGraph({asyncState: false});
    expect(rows(graph)).toEqual({
        center: '0', degree: '1', x: '1', polynomial: '2', function: '2,7183', 'signed-error': '0,7183', 'absolute-error': '0,7183',
        bound: 'skrito', 'bound-hypothesis': 'skrito', convergence: 'Vrsta konvergira k f pri vsakem x.',
    });
    expect(statusIds(graph)).toEqual(['hidden']);
    expect(statusTexts(graph)[0]).toMatch(/skrita/);
    expect(visible(segments(graph)[BOUND_BAND])).toBe(false);
    expect(caption(graph)[4]).toBe('ocena napake: skrita');
});

test('e^x about 0 at x = 1: T_1 = 2, T_3 = 8/3, T_6 = 1957/720 and the revealed bound e/7! contains the error', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, parameter('taylor-degree', 3));
    expect(numbers(graph).polynomial).toBeCloseTo(8 / 3, 14);
    expect(rows(graph).polynomial).toBe('2,6667');
    apply(graph, parameter('taylor-degree', 6));
    expect(numbers(graph).polynomial).toBeCloseTo(1957 / 720, 14);
    expect(1957 / 720).toBeCloseTo(expPartialSum(6), 14);
    expect(rows(graph)).toMatchObject({polynomial: '2,7181', function: '2,7183', 'absolute-error': '0,0002263', 'signed-error': '0,0002263'});
    apply(graph, reveal(true));
    expect(rows(graph).bound).toBe('0,0005393');
    expect(Math.E / 5040).toBeCloseTo(0.000539, 6);
    expect(rows(graph)['bound-hypothesis']).toMatch(/max\(e\^c, e\^x\)/);
    expect(statusIds(graph)).toEqual(['revealed']);
    expect(caption(graph)[4]).toBe('napaka ≤ 0,0005393 (Lagrangeeva ocena)');
    // the band around T_n(x) has half-width equal to the bound
    const band = segments(graph)[BOUND_BAND];
    expect(visible(band)).toBe(true);
    const half = (band.parents[1][1]() - band.parents[0][1]()) / 2;
    expect(half).toBeCloseTo(Math.E / 5040, 12);
});

test('sin x about 0 at x = 2, n = 3: T_3 = 2/3, error about 0.2426 and the bound 2^4/4! = 2/3 with M = 1', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('sine'));
    apply(graph, reveal(true));
    expect(graph.model).toEqual({example: 'sine', center: 0, degree: 3, x: 2, boundVisible: true});
    expect(numbers(graph).polynomial).toBeCloseTo(2 / 3, 14);
    expect(sinePolynomial(0, 3, 2)).toBeCloseTo(2 / 3, 14);
    expect(rows(graph)).toMatchObject({polynomial: '0,6667', function: '0,9093', 'absolute-error': '0,2426', bound: '0,6667'});
    expect(numbers(graph).absoluteError).toBeCloseTo(Math.sin(2) - 2 / 3, 12);
    expect(rows(graph)['bound-hypothesis']).toMatch(/M = 1/);
    apply(graph, parameter('taylor-degree', 5));
    expect(numbers(graph).polynomial).toBeCloseTo(14 / 15, 14);
    expect(rows(graph)).toMatchObject({'absolute-error': '0,02404', bound: '0,08889'});
    expect(rows(graph)['signed-error']).toBe('−0,02404');
});

test('1/(1 - x) about 0 at x = -1.5 (outside |x| < 1): the error 0.9, 2.025, 4.556 grows with the degree; inside it shrinks', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('geometric'));
    apply(graph, parameter('taylor-x', -1.5));
    apply(graph, parameter('taylor-degree', 1));
    const errors = [1, 3, 5].map(n => {
        apply(graph, parameter('taylor-degree', n));
        return numbers(graph).absoluteError;
    });
    expect(errors[0]).toBeCloseTo(0.9, 12);
    expect(errors[1]).toBeCloseTo(2.025, 12);
    expect(errors[2]).toBeCloseTo(4.55625, 12);
    for (const n of [1, 2, 3, 4, 5, 6]) {
        apply(graph, parameter('taylor-degree', n));
        expect(numbers(graph).signedError).toBeCloseTo(geometricError(0, n, -1.5), 10);
    }
    expect(statusIds(graph)).toEqual(['hidden', 'outside-convergence']);
    expect(rows(graph).convergence).toMatch(/zunaj/);
    // inside the interval the error falls with the degree
    apply(graph, parameter('taylor-x', 0.5));
    const inside = [1, 3, 5].map(n => {
        apply(graph, parameter('taylor-degree', n));
        return numbers(graph).absoluteError;
    });
    expect(inside[0]).toBeGreaterThan(inside[1]);
    expect(inside[1]).toBeGreaterThan(inside[2]);
    expect(inside[1]).toBeCloseTo(0.125, 12);
    expect(inside[2]).toBeCloseTo(0.03125, 12);
    expect(statusIds(graph)).toEqual(['hidden', 'inside-convergence']);
    expect(rows(graph).convergence).toMatch(/znotraj/);
});

test('the convergence interval of 1/(1 - x) is a segment on the axis with a text label and exists only for that example', () => {
    const graph = makeGraph({asyncState: false});
    const segment = segments(graph)[CONVERGENCE];
    expect(visible(segment)).toBe(false);
    expect(visible(convergenceLabel(graph))).toBe(false);
    // the hidden interval is evaluated for every example without throwing (the exp center may exceed 1)
    apply(graph, parameter('taylor-center', 2));
    expect(() => [segment.parents[0][0](), segment.parents[1][0](), convergenceLabel(graph).parents[0](), convergenceLabel(graph).parents[2]()]).not.toThrow();
    apply(graph, choice('geometric'));
    apply(graph, parameter('taylor-center', -0.5));
    expect(visible(segment)).toBe(true);
    expect(visible(convergenceLabel(graph))).toBe(true);
    expect([segment.parents[0][0](), segment.parents[1][0](), segment.parents[0][1]]).toEqual([-2, 1, 0]);
    expect(convergenceLabel(graph).parents[2]()).toContain('konvergenčni interval: −2 &lt; x &lt; 1');
    // the label is centred on the visible part of the interval (the left end of the view is -3.5)
    expect(convergenceLabel(graph).parents[0]()).toBe(-0.5);
    setLanguage('en');
    expect(convergenceLabel(graph).parents[2]()).toContain('convergence interval: −2 &lt; x &lt; 1');
    expect(graph.renderLegend().props.items.map((item: any) => item.id)).toContain('convergence');
});

test('the flat function: every T_n is 0, f(1) = e^-1 > 0, the series converges to 0 and the bound says why it is not shown', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('flat'));
    expect(graph.model).toEqual({example: 'flat', center: 0, degree: 3, x: 1, boundVisible: false});
    for (const n of [0, 1, 2, 5, 10]) {
        apply(graph, parameter('taylor-degree', n));
        expect(numbers(graph).polynomial).toBe(0);
        expect(numbers(graph).value).toBeCloseTo(Math.exp(-1), 14);
        expect(numbers(graph).absoluteError).toBeCloseTo(Math.exp(-1), 14);
    }
    expect(rows(graph)).toMatchObject({polynomial: '0', function: '0,3679', 'absolute-error': '0,3679', convergence: expect.stringMatching(/konvergira, a k 0 in ne k f/)});
    expect(statusIds(graph)).toEqual(['hidden', 'flat']);
    apply(graph, reveal(true));
    expect(rows(graph).bound).toBe('ni prikazana (glej opombo)');
    expect(rows(graph)['bound-hypothesis']).toMatch(/ni ocene/);
    expect(statusIds(graph)).toEqual(['revealed', 'no-bound', 'flat']);
    expect(statusTexts(graph)[1]).toMatch(/ne modelira/);
    expect(caption(graph)[4]).toBe('ocena napake: je ni (glej opombo)');
    expect(visible(segments(graph)[BOUND_BAND])).toBe(false);
    // for x <= 0 the function is 0 and so is the polynomial
    apply(graph, parameter('taylor-x', -1));
    expect(rows(graph)).toMatchObject({function: '0', polynomial: '0', 'absolute-error': '0'});
});

test('the center field of the flat example is disabled with an explanation that the field points to; the other examples keep it enabled', () => {
    const graph = makeGraph({asyncState: false});
    expect(controls(graph).inputCenter.props.disabled).toBe(false);
    expect(controls(graph).inputCenter.props.describedBy).toBeUndefined();
    apply(graph, choice('flat'));
    const {inputCenter, found} = controls(graph);
    expect(inputCenter.props.disabled).toBe(true);
    expect(inputCenter.props.describedBy).toBe('taylor-center-help');
    const help = found.p.find((element: any) => element.props.id === 'taylor-center-help');
    expect(help.props.children).toMatch(/stalno c = 0/);
    expect(() => apply(graph, parameter('taylor-center', 0.1))).toThrow(DomainError);
    expect(inputCenter.props.onChange(0.5)).toBe(false);
    apply(graph, parameter('taylor-center', 0));
    expect(graph.model.center).toBe(0);
});

test('invalid values are rejected, never clamped, per example domain; the boundary values are accepted', () => {
    const graph = makeGraph({asyncState: false});
    const before = {...graph.model};
    for (const center of [2.01, -2.01, NaN, Infinity]) expect(() => apply(graph, parameter('taylor-center', center)), `center ${center}`).toThrow(DomainError);
    for (const x of [3.01, -3.01, NaN, -Infinity]) expect(() => apply(graph, parameter('taylor-x', x)), `x ${x}`).toThrow(DomainError);
    for (const degree of [-1, 11, 2.5, NaN, Infinity]) expect(() => apply(graph, parameter('taylor-degree', degree)), `degree ${degree}`).toThrow(DomainError);
    for (const value of ['tan', '', 'Exp', 'square']) expect(() => apply(graph, choice(value))).toThrow(DomainError);
    expect(graph.model).toEqual(before);
    apply(graph, parameter('taylor-center', 2));
    apply(graph, parameter('taylor-center', -2));
    apply(graph, parameter('taylor-x', 3));
    apply(graph, parameter('taylor-x', -3));
    apply(graph, parameter('taylor-degree', 10));
    apply(graph, parameter('taylor-degree', 0));
    expect(graph.model).toMatchObject({center: -2, x: -3, degree: 0});

    apply(graph, choice('sine'));
    for (const center of [4.01, -4.01]) expect(() => apply(graph, parameter('taylor-center', center))).toThrow(DomainError);
    for (const x of [7.01, -7.01]) expect(() => apply(graph, parameter('taylor-x', x))).toThrow(DomainError);
    apply(graph, parameter('taylor-center', 4));
    apply(graph, parameter('taylor-x', -7));
    expect(graph.model).toMatchObject({center: 4, x: -7});

    apply(graph, choice('geometric'));
    for (const center of [0.51, 1, 2, -1.01]) expect(() => apply(graph, parameter('taylor-center', center)), `center ${center}`).toThrow(DomainError);
    for (const x of [0.96, 1, 1.5, -2.01]) expect(() => apply(graph, parameter('taylor-x', x)), `x ${x}`).toThrow(DomainError);
    apply(graph, parameter('taylor-center', 0.5));
    apply(graph, parameter('taylor-center', -1));
    apply(graph, parameter('taylor-x', 0.95));
    apply(graph, parameter('taylor-x', -2));
    expect(graph.model).toMatchObject({center: -1, x: -2});

    apply(graph, choice('flat'));
    for (const x of [3.01, -1.01]) expect(() => apply(graph, parameter('taylor-x', x))).toThrow(DomainError);
    apply(graph, parameter('taylor-x', 3));
    apply(graph, parameter('taylor-x', -1));
    expect(graph.model).toMatchObject({example: 'flat', center: 0, x: -1});
});

test('setting the example, center, degree, x and the bound through the controls and through the lesson actions gives the same configuration', () => {
    const viaControl = makeGraph({asyncState: false});
    const viaLesson = makeGraph({asyncState: false});
    controls(viaControl).found.ChoiceSelect[0].props.onChange('sine');
    apply(viaLesson, choice('sine'));
    expect(viaControl.model).toEqual(viaLesson.model);
    controls(viaControl).inputCenter.props.onChange(1);
    controls(viaControl).inputX.props.onChange(-2.5);
    controls(viaControl).inputDegree.props.onChange(7);
    apply(viaLesson, parameter('taylor-center', 1));
    apply(viaLesson, parameter('taylor-x', -2.5));
    apply(viaLesson, parameter('taylor-degree', 7));
    controls(viaControl).toggle.props.onClick();
    apply(viaLesson, reveal(true));
    expect(viaControl.model).toEqual(viaLesson.model);
    expect(viaControl.model).toEqual({example: 'sine', center: 1, degree: 7, x: -2.5, boundVisible: true});
    expect(rows(viaControl)).toEqual(rows(viaLesson));
    expect(caption(viaControl)).toEqual(caption(viaLesson));
    expect(axisPoints(viaControl).map((point: any) => point.x)).toEqual(axisPoints(viaLesson).map((point: any) => point.x));
    // the degree buttons use the same setter as the field and the lesson parameter
    controls(viaControl).decrease.props.onClick();
    apply(viaLesson, parameter('taylor-degree', 6));
    expect(viaControl.model).toEqual(viaLesson.model);
    controls(viaControl).increase.props.onClick();
    controls(viaControl).increase.props.onClick();
    apply(viaLesson, parameter('taylor-degree', 8));
    expect(viaControl.model).toEqual(viaLesson.model);
    controls(viaControl).toggle.props.onClick();
    apply(viaLesson, reveal(false));
    expect(viaControl.model).toEqual(viaLesson.model);
    expect(viaControl.model.boundVisible).toBe(false);
});

test('the degree buttons are disabled at 0 and 10 and point at the explanation, which changes with the limit', () => {
    const graph = makeGraph({asyncState: false});
    const help = () => collect(graph.renderControls()).p.find((element: any) => element.props.id === 'taylor-degree-help').props.children;
    expect(controls(graph).decrease.props.disabled).toBe(false);
    expect(controls(graph).decrease.props['aria-describedby']).toBe('taylor-degree-help');
    expect(help()).toMatch(/gumboma/);
    apply(graph, parameter('taylor-degree', 0));
    expect(controls(graph).decrease.props.disabled).toBe(true);
    expect(controls(graph).increase.props.disabled).toBe(false);
    expect(help()).toMatch(/najmanjša/);
    apply(graph, parameter('taylor-degree', 10));
    expect(controls(graph).increase.props.disabled).toBe(true);
    expect(controls(graph).increase.props['aria-describedby']).toBe('taylor-degree-help');
    expect(controls(graph).decrease.props.disabled).toBe(false);
    expect(help()).toMatch(/največja/);
    // a click at a limit is refused, never wrapped
    controls(graph).increase.props.onClick();
    expect(graph.model.degree).toBe(10);
    expect(controls(graph).decrease.props['aria-label']).toBe('Zmanjšaj stopnjo n za 1');
    expect(controls(graph).decrease.props.type).toBe('button');
});

test('the number fields carry their ranges per example, report rejection with a hint and name their labels in both languages', () => {
    const graph = makeGraph({asyncState: false});
    const {inputCenter, inputX, inputDegree} = controls(graph);
    expect([inputCenter, inputX, inputDegree].map((input: any) => [input.props.label, input.props.min, input.props.max, input.props.value])).toEqual([
        ['Središče c', -2, 2, 0], ['Točka x', -3, 3, 1], ['Stopnja n', 0, 10, 1],
    ]);
    expect(inputCenter.props.onChange(5)).toBe(false);
    expect(inputX.props.onChange(-4)).toBe(false);
    expect(inputDegree.props.onChange(2.5)).toBe(false);
    expect(inputDegree.props.onChange(11)).toBe(false);
    expect(graph.model).toMatchObject({center: 0, x: 1, degree: 1});
    expect(inputCenter.props.rejectedHint).toBe('Središče c mora biti število med −2 in 2.');
    expect(inputDegree.props.rejectedHint).toBe('Stopnja n mora biti celo število med 0 in 10.');
    apply(graph, choice('geometric'));
    expect([controls(graph).inputCenter, controls(graph).inputX].map((input: any) => [input.props.min, input.props.max])).toEqual([[-1, 0.5], [-2, 0.95]]);
    setLanguage('en');
    expect(controls(graph).inputCenter.props.label).toBe('Center c');
    expect(controls(graph).inputX.props.label).toBe('Point x');
    expect(controls(graph).inputX.props.rejectedHint).toBe('The point x must be a number between −2 and 0.95.');
    expect(controls(graph).inputDegree.props.label).toBe('Degree n');
});

test('the toggle names its state in words; editing the center, degree and x keeps the bound and choosing an example hides it', () => {
    const graph = makeGraph({asyncState: false});
    expect(controls(graph).toggle.props.children).toBe('Pokaži oceno napake');
    expect(controls(graph).toggle.props['data-revealed']).toBe(false);
    expect(controls(graph).toggle.props.type).toBe('button');
    controls(graph).toggle.props.onClick();
    expect(controls(graph).toggle.props.children).toBe('Skrij oceno napake');
    expect(controls(graph).toggle.props['data-revealed']).toBe(true);
    apply(graph, parameter('taylor-center', 0.5));
    apply(graph, parameter('taylor-degree', 4));
    apply(graph, parameter('taylor-x', -1));
    expect(graph.model).toEqual({example: 'exp', center: 0.5, degree: 4, x: -1, boundVisible: true});
    controls(graph).found.ChoiceSelect[0].props.onChange('geometric');
    expect(graph.model).toEqual({...TAYLOR_EXAMPLE_MODELS.geometric, boundVisible: false});
    expect(controls(graph).found.ChoiceSelect[0].props.options.map((option: any) => option.text)).toEqual([
        'f(x) = eˣ', 'f(x) = sin x', 'f(x) = 1/(1 − x)', 'f(x) = e^(−1/x) za x > 0, 0 sicer',
    ]);
    setLanguage('en');
    expect(controls(graph).toggle.props.children).toBe('Show error bound');
    expect(controls(graph).found.ChoiceSelect[0].props.options[3].text).toBe('f(x) = e^(−1/x) for x > 0, 0 otherwise');
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [choice('geometric'), parameter('taylor-x', -1.5), parameter('taylor-degree', 5), parameter('taylor-center', -0.5), reveal(true)]) apply(graph, action);
    expect(graph.model).toEqual({example: 'geometric', center: -0.5, degree: 5, x: -1.5, boundVisible: true});
    expect(graph.state).toMatchObject({example: 'exp', center: 0, degree: 1, x: 1, boundVisible: false});
    // a later action in the same tick sees the earlier ones: the new example's domain applies to x at once
    expect(() => apply(graph, parameter('taylor-x', 2))).toThrow(DomainError);
    apply(graph, choice('sine'));
    apply(graph, parameter('taylor-x', 6));
    expect(graph.model).toMatchObject({example: 'sine', x: 6, boundVisible: false});
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('taylor')!;
    expect(lesson.id).toBe('taylor-guided');
    expect(lesson.steps).toHaveLength(7);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph({asyncState: false});
        // a deliberately different user state that the default scene must reset
        apply(graph, choice('sine'));
        apply(graph, parameter('taylor-center', 2));
        apply(graph, parameter('taylor-degree', 9));
        apply(graph, reveal(true));
        for (const action of step.scene!.actions) apply(graph, action);
        return [graph.model, statusIds(graph)];
    });
    expect(finals).toEqual([
        [{example: 'exp', center: 0, degree: 1, x: 1, boundVisible: false}, ['hidden']],
        [{example: 'exp', center: 0, degree: 6, x: 1, boundVisible: true}, ['revealed']],
        [{example: 'sine', center: 0, degree: 3, x: 2, boundVisible: false}, ['hidden']],
        [{example: 'sine', center: 0, degree: 3, x: 2, boundVisible: true}, ['revealed']],
        [{example: 'geometric', center: 0, degree: 1, x: -1.5, boundVisible: false}, ['hidden', 'outside-convergence']],
        [{example: 'flat', center: 0, degree: 3, x: 1, boundVisible: false}, ['hidden', 'flat']],
        [{example: 'flat', center: 0, degree: 3, x: 1, boundVisible: true}, ['revealed', 'no-bound', 'flat']],
    ]);
    // the numbers the lesson prose states
    const graph = makeGraph({asyncState: false});
    for (const action of lesson.steps[1].scene!.actions) apply(graph, action);
    expect(rows(graph)).toMatchObject({polynomial: '2,7181', 'absolute-error': '0,0002263', bound: '0,0005393'});
});

test('the displayed bound is at least the actual error for every example, center, point and degree, against independent references', () => {
    const graph = makeGraph({asyncState: false});
    const grid = (min: number, max: number, count = 6) => Array.from({length: count + 1}, (_, i) => Math.round((min + ((max - min) * i) / count) * 100) / 100);
    const domains: Record<TaylorExampleId, { centers: number[]; xs: number[] }> = {
        exp: {centers: grid(-2, 2), xs: grid(-3, 3)},
        sine: {centers: grid(-4, 4), xs: grid(-7, 7, 8)},
        geometric: {centers: grid(-1, 0.5), xs: grid(-2, 0.95)},
        flat: {centers: [0], xs: grid(-1, 3)},
    };
    let checked = 0;
    for (const id of TAYLOR_EXAMPLE_IDS) {
        apply(graph, choice(id));
        for (const center of domains[id].centers) {
            apply(graph, parameter('taylor-center', center));
            for (const x of domains[id].xs) {
                apply(graph, parameter('taylor-x', x));
                for (const degree of [0, 1, 2, 3, 5, 8, 10]) {
                    apply(graph, parameter('taylor-degree', degree));
                    const view = numbers(graph);
                    let reference: number;
                    if (id === 'exp') reference = Math.exp(x) - Array.from({length: degree + 1}, (_, k) => k).reduce((sum, k) => sum + Math.exp(center) * (x - center) ** k / [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800][k], 0);
                    else if (id === 'sine') reference = Math.sin(x) - sinePolynomial(center, degree, x);
                    else if (id === 'geometric') reference = geometricError(center, degree, x);
                    else reference = x > 0 ? Math.exp(-1 / x) : 0;
                    const scale = Math.max(1, Math.abs(view.value), Math.abs(view.polynomial));
                    expect(Math.abs(view.signedError - reference), `${id} c=${center} x=${x} n=${degree}`).toBeLessThanOrEqual(1e-9 * scale);
                    if (view.bound.kind === 'bound') {
                        expect(view.bound.value, `${id} c=${center} x=${x} n=${degree}`).toBeGreaterThanOrEqual(Math.abs(reference) - 1e-9 * scale);
                        checked++;
                    } else {
                        expect(id).toBe('flat');
                    }
                }
            }
        }
    }
    expect(checked).toBeGreaterThan(1000);
});

test('dragging c and x on the axis projects onto the grid and the example range, writing the model once', () => {
    const graph = makeGraph();
    const [center, x] = axisPoints(graph);
    center.moveTo.mockClear();
    x.moveTo.mockClear();

    x.x = 1.2349; // off the 0.01 grid
    x.handlers.drag();
    expect(graph.model.x).toBe(1.23);
    expect(x.moveTo).toHaveBeenCalledTimes(1);
    expect([x.x, x.y]).toEqual([1.23, 0]);
    x.x = 9;
    x.handlers.drag();
    expect(graph.model.x).toBe(3);
    x.x = -9;
    x.handlers.drag();
    expect(graph.model.x).toBe(-3);

    center.x = 0.3351; // the 0.05 grid
    center.handlers.drag();
    expect(graph.model.center).toBe(0.35);
    center.x = 9;
    center.handlers.drag();
    expect(graph.model.center).toBe(2);
    expect(graph.model.boundVisible).toBe(false);
    expect(center.moveTo).toHaveBeenCalledTimes(2);

    // the example's own ranges apply after a change of example
    apply(graph, choice('geometric'));
    x.x = 9;
    x.handlers.drag();
    expect(graph.model.x).toBe(0.95);
    center.x = 9;
    center.handlers.drag();
    expect(graph.model.center).toBe(0.5);
    // the flat center cannot move
    apply(graph, choice('flat'));
    center.x = 1;
    expect(() => center.handlers.drag()).not.toThrow();
    expect(graph.model.center).toBe(0);
    expect(center.x).toBe(0);
});

test('names, kinds and choices the graph does not own are unsupported', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'k', 'n', 'a', 'b', 'convexity-a', 'extrema-a', 'darboux-n', 'mvt-c', 'accum-x']) {
        expect(() => apply(graph, {kind: 'function-parameter', name, value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    for (const target of ['tangent', 'second-derivative', 'lower-sum', 'upper-sum', 'extrema-classification']) {
        expect(() => apply(graph, {kind: 'function-visibility', target, visible: true} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'function-choice', name: 'convexity-example', value: 'cube'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'bisection', command: 'next-step'})).toThrow(UnsupportedLessonActionError);
    for (const supported of [parameter('taylor-center', 0), parameter('taylor-degree', 1), parameter('taylor-x', 1), choice('sine'), reveal(true)]) {
        expect(graph.supportsLessonAction(supported)).toBe(true);
    }
    expect(graph.supportsLessonAction({kind: 'function-parameter', name: 'convexity-a', value: 1})).toBe(false);
    expect(graph.model).toEqual({example: 'exp', center: 0, degree: 1, x: 1, boundVisible: false});
});

test('presets save the model with the reveal flag and reopen the same scene', () => {
    const graph = makeGraph();
    apply(graph, choice('geometric'));
    apply(graph, parameter('taylor-center', 0.25));
    apply(graph, parameter('taylor-degree', 4));
    apply(graph, parameter('taylor-x', -1.5));
    apply(graph, reveal(true));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('taylor');
    expect(exported.data).toEqual({example: 'geometric', center: 0.25, degree: 4, x: -1.5, boundVisible: true});

    const reopened = makeGraph({asyncState: false});
    reopened.importPreset({id: 'taylor', boardState: {boundingBox: [-1, 2, 7, -2]}, data: exported.data});
    expect(reopened.model).toEqual(exported.data);
    expect(rows(reopened)).toMatchObject({degree: '4', center: '0,25', x: '−1,5'});
    expect(statusIds(reopened)).toEqual(['revealed', 'outside-convergence']);
    expect(axisPoints(reopened).map((point: any) => point.x)).toEqual([0.25, -1.5]);
    expect(reopened.exportPreset().data).toEqual(exported.data);
    // a string and extra properties are sanitized
    reopened.importPresetData(JSON.stringify({example: 'sine', center: 1, degree: 2, x: 3, boundVisible: false, extra: true}));
    expect(reopened.model).toEqual({example: 'sine', center: 1, degree: 2, x: 3, boundVisible: false});
});

test('a preset of another example without a view of its own shows that example\'s view', () => {
    const graph = makeGraph({asyncState: false});
    graph.board.setBoundingBox.mockClear();
    graph.importPreset({id: 'taylor', data: {example: 'sine', center: 0, degree: 3, x: 2, boundVisible: false}});
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-7.5, 3.4, 7.5, -3.6], true);
    apply(graph, choice('geometric'));
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-2.6, 6, 1.6, -3], true);
    apply(graph, choice('flat'));
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-1.4, 1.6, 3.4, -0.6], true);
});

test('malformed or out-of-domain preset data is rejected to the default model with a warning', () => {
    const graph = makeGraph();
    apply(graph, parameter('taylor-degree', 4));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const valid = {example: 'exp', center: 0, degree: 1, x: 1, boundVisible: false};
    const bad = [undefined, null, 'not json', {}, [], {...valid, example: 'cos'}, {...valid, center: 2.5}, {...valid, x: 3.5}, {...valid, degree: 11}, {...valid, degree: -1},
        {...valid, degree: 1.5}, {...valid, degree: '1'}, {...valid, center: '0'}, {...valid, boundVisible: 'yes'}, {...valid, boundVisible: 1},
        {example: 'exp', center: 0, degree: 1, x: 1}, {...valid, example: 'flat', center: 0.5}, {...valid, example: 'geometric', x: 1},
        {...valid, example: 'geometric', center: 1}];
    for (const entry of bad) {
        graph.importPresetData(entry);
        expect(graph.model).toEqual(valid);
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
});

test('capture and restore bring back the synchronous model, including the reveal flag', () => {
    const graph = makeGraph();
    apply(graph, choice('sine'));
    apply(graph, parameter('taylor-center', 1));
    apply(graph, parameter('taylor-degree', 7));
    apply(graph, reveal(true));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({example: 'sine', center: 1, degree: 7, x: 2, boundVisible: true});
    apply(graph, defaultScene);
    expect(graph.model).toEqual({example: 'exp', center: 0, degree: 1, x: 1, boundVisible: false});
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({example: 'sine', center: 1, degree: 7, x: 2, boundVisible: true});
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
});

test('no readout, caption, label or status ever shows NaN, Infinity, -0, 1e-17 noise or a raw undefined, in either language', () => {
    const graph = makeGraph({asyncState: false});
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        for (const id of TAYLOR_EXAMPLE_IDS) {
            apply(graph, choice(id));
            for (const degree of [0, 3, 10]) {
                apply(graph, parameter('taylor-degree', degree));
                for (const x of [-1, 0, 0.5]) {
                    apply(graph, parameter('taylor-x', x));
                    for (const visibleNow of [false, true]) {
                        apply(graph, reveal(visibleNow));
                        const text = [...caption(graph), ...Object.values(rows(graph)), ...statusTexts(graph, language),
                            ...(id === 'geometric' ? [convergenceLabel(graph).parents[2]()] : [])].join(' | ');
                        expect(text).not.toMatch(/NaN|Infinity|undefined|−0(?![.,\d])|[0-9]e-\d/);
                    }
                }
            }
        }
    }
});

test('floating-point noise in an error shows as 0, never -0 or 1e-17', () => {
    const graph = makeGraph({asyncState: false});
    // x = c: T_n(c) = f(c) up to rounding, so the error must read 0
    apply(graph, parameter('taylor-center', 0.7));
    apply(graph, parameter('taylor-x', 0.7));
    apply(graph, parameter('taylor-degree', 5));
    expect(rows(graph)).toMatchObject({'signed-error': '0', 'absolute-error': '0'});
    expect(visible(segments(graph)[ERROR])).toBe(numbers(graph).absoluteError > 0);
    // sine about 0 at x = 0: sin 0 - T_n(0) is exactly 0 and must not read -0
    apply(graph, choice('sine'));
    apply(graph, parameter('taylor-x', 0));
    expect(rows(graph)['signed-error']).toBe('0');
    // a tiny but real error keeps its significant digits
    apply(graph, choice('sine'));
    apply(graph, parameter('taylor-x', 0.5));
    apply(graph, parameter('taylor-degree', 9));
    expect(rows(graph)['absolute-error']).toMatch(/·10⁻/);
    apply(graph, reveal(true));
    expect(rows(graph).bound).toMatch(/·10⁻/);
});

test('unmount leaves no generated object and a late edit changes nothing on the board', () => {
    const graph = makeGraph();
    const [center] = axisPoints(graph);
    graph.unmount();
    expect(graph.generatedObjectCount).toBe(0);
    const setStates = graph.setState.mock.calls.length;
    const updates = graph.boardUpdate.mock.calls.length;
    expect(() => { center.x = 1; center.handlers.drag(); }).not.toThrow();
    expect(() => apply(graph, reveal(true))).not.toThrow();
    expect(graph.setState.mock.calls.length).toBe(setStates);
    expect(graph.boardUpdate.mock.calls.length).toBe(updates);
    expect(graph.generatedObjectCount).toBe(0);
});

test('generated objects are disposed and not duplicated across repeated generation, example changes and default scenes', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    expect(baseline).toBe(13);
    for (let i = 0; i < 4; i++) graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    expect(graph.generatedObjectCount).toBe(baseline);
    // the object count depends neither on the example, the degree nor the bound
    for (let i = 0; i < 5; i++) {
        apply(graph, choice('geometric'));
        apply(graph, parameter('taylor-degree', 10));
        apply(graph, reveal(true));
        apply(graph, defaultScene);
    }
    expect(boardObjectCount(graph)).toBe(baseline);
    graph.disposeFigureScene();
    expect(boardObjectCount(graph)).toBe(0);
    expect(() => apply(graph, reveal(true))).not.toThrow();
    graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    expect(axisPoints(graph).every((point: any) => graph.board.objectsList.includes(point))).toBe(true);
});

test('the caption follows the language and a language change notifies subscribers', () => {
    const graph = makeGraph({asyncState: false});
    expect(caption(graph)[1]).toBe('c = 0, n = 1, x = 1');
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(caption(graph)[2]).toBe('Tₙ(x) = 2, f(x) = 2.7183');
    expect(caption(graph)[3]).toBe('error |f(x) − Tₙ(x)| = 0.7183');
    expect(caption(graph)[4]).toBe('error bound: hidden');
    expect(caption(graph)[5]).toBe('solid line: f; dashed line: Tₙ; vertical line at x: the error');
    apply(graph, reveal(true));
    expect(caption(graph)[4]).toBe('error ≤ 1.359 (Lagrange bound)'); // M = e, |x - c|^2 / 2! = 1/2
    expect(rows(graph).convergence).toBe('The series converges to f for every x.');
    expect(rows(graph)['bound-hypothesis']).toMatch(/because e\^t is increasing/);
    unsubscribe();
});

test('the legend names f, T_n, the error, the bound band and the convergence interval in words, with the line patterns', () => {
    const graph = makeGraph();
    const items = graph.renderLegend().props.items as { id: string; label: string; kind: string }[];
    expect(items.map(item => item.id)).toEqual(['function', 'polynomial', 'error', 'bound', 'convergence']);
    expect(items[0].label).toMatch(/polna črta/);
    expect(items[1].label).toMatch(/črtkana črta/);
    expect(items[0].kind).toBe('line');
    expect(items[1].kind).toBe('dashed-line');
    setLanguage('en');
    expect(graph.renderLegend().props.items.map((item: any) => item.label)).toEqual([
        'Graph of the function f: solid line', 'Taylor polynomial Tₙ: dashed line', 'Error between Tₙ(x) and f(x): vertical line at x',
        'Error bound around Tₙ(x): wide translucent line (after the bound is shown)', 'Convergence interval of the series of 1/(1 − x): thick line on the x-axis',
    ]);
});

test('the example views are the ones the examples need, with the default example first', () => {
    const graph = makeGraph();
    expect(graph.defaultBoundingBox()).toEqual(BOX);
    for (const id of TAYLOR_EXAMPLE_IDS) {
        apply(graph, choice(id));
        const [left, top, right, bottom] = graph.defaultBoundingBox();
        expect(left).toBeLessThan(right);
        expect(top).toBeGreaterThan(bottom);
        // the board shows the whole x range of the example
        const example = TAYLOR_EXAMPLES[id];
        expect(left).toBeLessThanOrEqual(example.xMin);
        expect(right).toBeGreaterThanOrEqual(example.xMax);
    }
});

test('1/(1 - x) with the bound shown and x > c inside the interval notes that the bound is valid but not sharp, while the error shrinks', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('geometric'));
    apply(graph, parameter('taylor-x', 0.5));
    apply(graph, parameter('taylor-degree', 5));
    // hidden bound: no note
    expect(statusIds(graph)).toEqual(['hidden', 'inside-convergence']);
    apply(graph, reveal(true));
    expect(statusIds(graph)).toEqual(['revealed', 'inside-convergence', 'bound-not-sharp']);
    // c = 0, x = 0.5: the bound stays 2 for every n while the error halves
    const bounds = [1, 5, 10].map(n => {
        apply(graph, parameter('taylor-degree', n));
        const bound = graph.viewOf(graph.model).bound;
        return bound.kind === 'bound' ? bound.value : NaN;
    });
    for (const bound of bounds) expect(bound).toBeCloseTo(2, 9);
    expect(numbers(graph).absoluteError).toBeLessThan(1e-3);
    // x left of c, or outside the interval: no such note
    apply(graph, parameter('taylor-x', -0.5));
    expect(statusIds(graph)).toEqual(['revealed', 'inside-convergence']);
    apply(graph, parameter('taylor-x', -1.5));
    expect(statusIds(graph)).toEqual(['revealed', 'outside-convergence']);
});
