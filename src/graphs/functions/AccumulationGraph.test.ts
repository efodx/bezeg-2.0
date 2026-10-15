import {accumulationFill, AccumulationGraph, FLAT_SLOPE, MAX_PIECES} from './AccumulationGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {ACCUMULATION_BOUND_MAX, ACCUMULATION_BOUND_MIN, accumulation} from '../../analysis/accumulation';
import {catalogFunction, FUNCTION_IDS} from '../../analysis/functions';
import {currentLanguage, onLanguageChange, setLanguage} from '../../localization';
import {GraphPalette} from '../styles/GraphPalette';
import {DomainError} from './BaseFunctionGraph';

const SIN_VIEW = [-1.2, 3.1, 6.7, -3.1];

function fakeBoard() {
    let box = [...SIN_VIEW];
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
        getBoundingBox: vi.fn(() => box),
        setBoundingBox: vi.fn((next: number[]) => { box = [...next]; }),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

/** A graph whose React state is NOT updated synchronously, exactly like setState inside one lesson tick (unless asyncState is false). */
function makeGraph({asyncState = true}: { asyncState?: boolean } = {}) {
    const graph = new AccumulationGraph() as any;
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
const parameter = (name: 'accum-a' | 'accum-x', value: number): LessonAction => ({kind: 'function-parameter', name, value});
const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'accumulation-function', value});
const reveal = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'accumulation-curve', visible});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const boardObjectCount = (graph: any) => graph.board.objectsList.length;

// Creation order: the two shaded curves, the function graphs (f, A, tangent), two drop-line segments, six sign marks and the one caption
// text, then the points (f(x), A(x), and the draggable a and x on the axis).
const [POSITIVE_FILL, NEGATIVE_FILL] = [0, 1];
const [F_CURVE, A_CURVE, TANGENT] = [0, 1, 2];
const [F_POINT, A_POINT, AXIS_A, AXIS_X] = [0, 1, 2, 3];
const BASELINE = 18;
const curves = (graph: any) => ofType(graph, 'functiongraph');
const fills = (graph: any) => ofType(graph, 'curve');
const points = (graph: any) => ofType(graph, 'point');
const marks = (graph: any) => ofType(graph, 'text').slice(0, MAX_PIECES);
const axisPoints = (graph: any) => [points(graph)[AXIS_A], points(graph)[AXIS_X]];
const caption = (graph: any) => graph.captionPlainLines();
const markSigns = (graph: any) => marks(graph).filter((mark: any) => resolve(mark.attributes.visible)).map((mark: any) => mark.parents[2]());
const fillOf = (graph: any, index: number) => {
    const curve = fills(graph)[index];
    curve.updateDataArray();
    return {x: curve.dataX as number[], y: curve.dataY as number[]};
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
    const [inputA, inputX] = found.NumberInput;
    const toggle = found.button.find((element: any) => element.props['data-action'] === 'toggle-accumulation');
    return {found, inputA, inputX, toggle};
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
const lineValue = (curve: any, t: number): number => curve.parents[0](t);

beforeEach(() => setLanguage('sl'));

test('initialization draws the shaded stretches, f, the hidden A and tangent, drop lines, sign marks, points and one caption for sin on [0, 2]', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({fn: 'sin', a: 0, x: 2, accumulationVisible: false});
    expect(graph.presets()).toBe('accumulation');
    expect(fills(graph)).toHaveLength(2);
    expect(curves(graph)).toHaveLength(3);
    expect(ofType(graph, 'segment')).toHaveLength(2);
    expect(ofType(graph, 'text')).toHaveLength(MAX_PIECES + 1);
    expect(points(graph)).toHaveLength(4);
    expect(boardObjectCount(graph)).toBe(BASELINE);
    expect(graph.generatedObjectCount).toBe(boardObjectCount(graph));
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(SIN_VIEW, true);
    // f is drawn, A and its tangent exist but are hidden, and the point on A is hidden
    expect(lineValue(curves(graph)[F_CURVE], 1)).toBeCloseTo(Math.sin(1), 12);
    for (const hidden of [curves(graph)[A_CURVE], curves(graph)[TANGENT], points(graph)[A_POINT]]) expect(resolve(hidden.attributes.visible)).toBe(false);
    expect(resolve(points(graph)[F_POINT].attributes.visible)).not.toBe(false);
    // the shaded region lies above the axis between a = 0 and x = 2, and nothing is below it
    const positive = fillOf(graph, POSITIVE_FILL);
    expect(Math.min(...positive.x.filter(Number.isFinite))).toBe(0);
    expect(Math.max(...positive.x.filter(Number.isFinite))).toBe(2);
    expect(Math.min(...positive.y.filter(Number.isFinite))).toBe(0);
    expect(fillOf(graph, NEGATIVE_FILL).x).toEqual([]);
    expect(markSigns(graph)).toEqual(['+']);
    // a and x sit on the axis, the point of f on the graph
    expect(axisPoints(graph).map((point: any) => [point.x, point.y])).toEqual([[0, 0], [2, 0]]);
    expect([points(graph)[F_POINT].X(), points(graph)[F_POINT].Y()]).toEqual([2, Math.sin(2)]);
    // the board names f in words, and while A is hidden it says A is hidden and gives no value
    expect(caption(graph)).toEqual(['f(x) = sin x', 'f: polna črta', 'A je skrita: napovej A(x)']);
});

test('while A is hidden every readout that would give the answer away says hidden and the status is only the prompt', () => {
    const graph = makeGraph({asyncState: false});
    expect(rows(graph)).toEqual({
        'a': '0', 'x': '2', 'f-x': '0,9093', 'signed-integral': 'skrito', 'slope': 'skrito', 'above-axis': 'skrito', 'below-axis': 'skrito',
    });
    expect(statusIds(graph)).toEqual(['hidden']);
    // also with x < a, where the orientation status would reveal the sign of A
    apply(graph, parameter('accum-a', 2));
    apply(graph, parameter('accum-x', 0));
    expect(statusIds(graph)).toEqual(['hidden']);
    expect(Object.entries(rows(graph)).filter(([, value]) => value === 'skrito').map(([id]) => id)).toEqual(['signed-integral', 'slope', 'above-axis', 'below-axis']);
    // no board text shows the value or the slope of A
    for (const line of caption(graph)) expect(line).not.toMatch(/1,4161|−1,4161/);
    setLanguage('en');
    expect(rows(graph)['signed-integral']).toBe('hidden');
    expect(statusTexts(graph, 'en')).toEqual([expect.stringMatching(/hidden.*Predict/)]);
});

test('showing A draws the dashed curve, its tangent and its point, and the readouts report the signed value and the slope f(x)', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, reveal(true));
    expect(graph.model).toEqual({fn: 'sin', a: 0, x: 2, accumulationVisible: true});
    for (const shown of [curves(graph)[A_CURVE], curves(graph)[TANGENT], points(graph)[A_POINT]]) expect(resolve(shown.attributes.visible)).toBe(true);
    // A is dashed and drawn thicker than f; f is solid: the curves differ by pattern as well as colour
    expect(curves(graph)[A_CURVE].attributes.dash).toBe(2);
    expect(curves(graph)[F_CURVE].attributes.dash).toBeUndefined();
    expect(curves(graph)[A_CURVE].attributes.strokeColor).not.toBe(curves(graph)[F_CURVE].attributes.strokeColor);
    expect(resolve(curves(graph)[A_CURVE].attributes.strokeWidth)).toBeGreaterThan(resolve(curves(graph)[F_CURVE].attributes.strokeWidth));
    expect(lineValue(curves(graph)[A_CURVE], 2)).toBeCloseTo(1 - Math.cos(2), 12);
    expect(lineValue(curves(graph)[A_CURVE], 0)).toBe(0);
    expect(rows(graph)).toEqual({
        'a': '0', 'x': '2', 'f-x': '0,9093', 'signed-integral': '1,4161', 'slope': '0,9093', 'above-axis': '1,4161', 'below-axis': '0',
    });
    expect(statusIds(graph)).toEqual(['rising']);
    expect(caption(graph)).toEqual([
        'f(x) = sin x', 'f: polna črta', 'A: črtkana črta', 'A(x) = 1,4161 (s predznakom)', 'naklon tangente na A v točki x: 0,9093',
    ]);
    expect([points(graph)[A_POINT].X(), points(graph)[A_POINT].Y()]).toEqual([2, 1 - Math.cos(2)]);
    // hiding again is a plain toggle of the model
    apply(graph, reveal(false));
    expect(resolve(curves(graph)[A_CURVE].attributes.visible)).toBe(false);
    expect(rows(graph)['signed-integral']).toBe('skrito');
});

test('the default sin example gives A(0) = 0, A(pi) = 2 and A(2 pi) = 0, with the contributions that make them', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, reveal(true));
    const at = (x: number) => { apply(graph, parameter('accum-x', x)); return rows(graph); };
    const zero = at(0);
    expect([zero['signed-integral'], zero['above-axis'], zero['below-axis']]).toEqual(['0', '0', '0']);
    expect(statusIds(graph)).toEqual(['empty', 'flat']);
    expect(fillOf(graph, POSITIVE_FILL).x).toEqual([]);
    expect(markSigns(graph)).toEqual([]);

    const pi = at(Math.PI);
    expect([pi['signed-integral'], pi['above-axis'], pi['below-axis'], pi['slope'], pi['f-x']]).toEqual(['2', '2', '0', '0', '0']);
    // sin(pi) is 1.2e-16 in floating point, which is a flat tangent, not a rising one
    expect(statusIds(graph)).toEqual(['flat']);
    expect(markSigns(graph)).toEqual(['+']);

    const twoPi = at(2 * Math.PI);
    expect([twoPi['signed-integral'], twoPi['above-axis'], twoPi['below-axis'], twoPi['slope']]).toEqual(['0', '2', '−2', '0']);
    expect(statusIds(graph)).toEqual(['flat']);
    expect(markSigns(graph)).toEqual(['+', '−']);
    // the negative arc decreases A: A at pi is 2 and falls back to 0 at 2 pi
    expect(lineValue(curves(graph)[A_CURVE], Math.PI)).toBeCloseTo(2, 12);
    expect(lineValue(curves(graph)[A_CURVE], 1.5 * Math.PI)).toBeCloseTo(1, 12);
    expect(lineValue(curves(graph)[A_CURVE], 2 * Math.PI)).toBeCloseTo(0, 12);
});

test('the tangent to A at x passes through (x, A(x)) with slope f(x), which is the numerical derivative of the drawn A, for every function', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, reveal(true));
    for (const fnId of FUNCTION_IDS) {
        apply(graph, choice(fnId));
        const fn = catalogFunction(fnId);
        for (const [a, x] of [[0, 1], [-1, 1.3], [1, -0.5], [2, 2], [-1, 0.2]]) {
            apply(graph, parameter('accum-a', a));
            apply(graph, parameter('accum-x', x));
            const aCurve = curves(graph)[A_CURVE];
            const tangent = curves(graph)[TANGENT];
            // the drawn curves are clipped far outside the view; these points are well inside it
            const slope = lineValue(tangent, x + 1) - lineValue(tangent, x);
            expect(slope, `${fnId} ${a} ${x} slope`).toBeCloseTo(fn.value(x), 9);
            expect(lineValue(tangent, x), `${fnId} ${a} ${x} through (x, A(x))`).toBeCloseTo(lineValue(aCurve, x), 9);
            const h = 1e-5;
            const derivative = (lineValue(aCurve, x + h) - lineValue(aCurve, x - h)) / (2 * h);
            expect(derivative, `${fnId} ${a} ${x} A'(x)`).toBeCloseTo(fn.value(x), 5);
            expect(lineValue(aCurve, a), `${fnId} ${a} A(a)`).toBeCloseTo(0, 12);
        }
    }
});

test('x < a keeps the orientation: A(x) = -(integral from x to a), the status says so and the parts swap their contributions', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, reveal(true));
    apply(graph, parameter('accum-a', 2));
    apply(graph, parameter('accum-x', 0));
    expect(rows(graph)['signed-integral']).toBe('−1,4161'); // -(1 - cos 2): the same region as a = 0, x = 2 but reversed
    expect(statusIds(graph)).toEqual(['reversed', 'flat']);
    expect(statusTexts(graph, 'en')[0]).toMatch(/left of a.*A\(x\) = −\(the integral from x to a\)/);
    expect(markSigns(graph)).toEqual(['+']); // the region still lies above the axis
    // x = -1 crosses a zero of sin: a negative stretch [-1, 0] and a positive one [0, 2]
    apply(graph, parameter('accum-x', -1));
    expect(rows(graph)).toMatchObject({'signed-integral': '−0,9564', 'above-axis': '−1,4161', 'below-axis': '0,4597'});
    expect(statusIds(graph)).toEqual(['reversed', 'falling']);
    expect(markSigns(graph)).toEqual(['−', '+']);
    // the sign flips exactly when x passes a, and equal bounds give 0
    apply(graph, parameter('accum-x', 2));
    expect(rows(graph)['signed-integral']).toBe('0');
    expect(statusIds(graph)).toEqual(['empty', 'rising']);
    apply(graph, parameter('accum-x', 2.5));
    expect(rows(graph)['signed-integral']).toBe('0,385'); // cos 2 - cos 2.5
    // x^2 below a: A(1) = (1 - 8)/3 for a = 2
    apply(graph, choice('square'));
    apply(graph, parameter('accum-x', 1));
    expect(rows(graph)['signed-integral']).toBe('−2,3333');
    expect(statusIds(graph)).toEqual(['reversed', 'rising']);
});

test('negative integrand values decrease A: it falls where f is negative, as the status and the contributions state', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, reveal(true));
    apply(graph, parameter('accum-x', 4));
    expect(rows(graph)['f-x']).toBe('−0,7568');
    expect(rows(graph)['slope']).toBe('−0,7568');
    expect(statusIds(graph)).toEqual(['falling']);
    expect(rows(graph)['signed-integral']).toBe('1,6536'); // 1 - cos 4
    expect(rows(graph)['below-axis']).toBe('−0,3464'); // cos 4 - cos pi... the part below the axis after pi
    expect(rows(graph)['above-axis']).toBe('2');
    expect(markSigns(graph)).toEqual(['+', '−']);
    const [positive, negative] = [fillOf(graph, POSITIVE_FILL), fillOf(graph, NEGATIVE_FILL)];
    expect(Math.max(...positive.y.filter(Number.isFinite))).toBeCloseTo(1, 2);
    expect(Math.min(...negative.y.filter(Number.isFinite))).toBeCloseTo(Math.sin(4), 9);
    expect(Math.min(...negative.x.filter(Number.isFinite))).toBeCloseTo(Math.PI, 12);
    expect(Math.max(...negative.x.filter(Number.isFinite))).toBe(4);
    // x^2 and e^x are never negative, so A never falls and the below-axis contribution is 0
    for (const fnId of ['square', 'exp']) {
        apply(graph, choice(fnId));
        expect(statusIds(graph)).toEqual(['rising']);
        expect(rows(graph)['below-axis']).toBe('0');
        expect(markSigns(graph)).toEqual(['+']);
    }
});

test('the readout calls the value the signed integral and never presents the geometric area as the integral', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, reveal(true));
    apply(graph, parameter('accum-x', 2 * Math.PI));
    // the unsigned geometric area of the two arcs is 4; the displayed integral is 0, and 4 appears nowhere
    const shown = [...Object.values(rows(graph)), ...caption(graph), ...statusTexts(graph, 'sl'), ...statusTexts(graph, 'en')];
    expect(shown.some(text => /\b4\b/.test(text))).toBe(false);
    const labels = (graph.renderReadout().props.children[0].props.rows as { id: string; label: string }[]).find(row => row.id === 'signed-integral')!.label;
    expect(labels).toMatch(/s predznakom/);
    setLanguage('en');
    expect((graph.renderReadout().props.children[0].props.rows as { id: string; label: string }[]).find(row => row.id === 'signed-integral')!.label).toMatch(/signed/);
    expect(graph.renderReadout().props.children[0].props.note).toMatch(/signed definite integral, not the geometric area/);
    expect(caption(graph)).toContain('A(x) = 0 (signed)');
    setLanguage('sl');
    expect(graph.renderReadout().props.children[0].props.note).toMatch(/s predznakom, ne geometrijska ploščina/);
});

test('the fill data of a stretch is a closed polygon whose sampled area matches the exact integral, NaN-separated per stretch', () => {
    const sin = catalogFunction('sin');
    const area = (polyline: { x: number[]; y: number[] }) => {
        // shoelace area of each NaN-separated polygon
        let total = 0;
        let start = 0;
        for (let i = 0; i <= polyline.x.length; i++) {
            if (i === polyline.x.length || Number.isNaN(polyline.x[i])) {
                let sum = 0;
                for (let j = start; j < i; j++) {
                    const k = j + 1 < i ? j + 1 : start;
                    sum += polyline.x[j] * polyline.y[k] - polyline.x[k] * polyline.y[j];
                }
                total += Math.abs(sum) / 2;
                start = i + 1;
            }
        }
        return total;
    };
    const full = accumulationFill(sin, 0, 2 * Math.PI);
    expect(Math.abs(area(full.positive) - 2)).toBeLessThan(0.01);
    expect(Math.abs(area(full.negative) - 2)).toBeLessThan(0.01);
    expect(full.positive.x.filter(Number.isNaN)).toHaveLength(0);
    // reversed bounds shade the same region
    const reversed = accumulationFill(sin, 2 * Math.PI, 0);
    expect(reversed.positive.x).toEqual(full.positive.x);
    expect(reversed.negative.y).toEqual(full.negative.y);
    // three stretches above and below give NaN separators within one list
    const many = accumulationFill(sin, -7, 7);
    expect(many.positive.x.filter(Number.isNaN)).toHaveLength(2);
    expect(many.negative.x.filter(Number.isNaN)).toHaveLength(2);
    expect(accumulationFill(sin, 1, 1)).toEqual({positive: {x: [], y: []}, negative: {x: [], y: []}});
    // the clamp limits plotted heights but not the stretch bounds
    const clamped = accumulationFill(catalogFunction('exp'), 0, 7, y => Math.min(y, 10));
    expect(Math.max(...clamped.positive.y)).toBe(10);
    expect(Math.max(...clamped.positive.x)).toBe(7);
});

test('the shaded region follows the view clamp, so e^x at x = 7 never plots a path far above the view', () => {
    const graph = makeGraph();
    apply(graph, choice('exp'));
    apply(graph, parameter('accum-x', 7));
    const {y} = fillOf(graph, POSITIVE_FILL);
    const [, top, , bottom] = graph.board.getBoundingBox();
    expect(Math.max(...y.filter(Number.isFinite))).toBeLessThanOrEqual(top + 0.25 * (top - bottom) + 1e-9);
    // the curves leave far-off values out (NaN) instead of drawing them
    expect(Number.isNaN(lineValue(curves(graph)[F_CURVE], 7))).toBe(true);
    expect(lineValue(curves(graph)[F_CURVE], 0)).toBe(1);
});

test('a sign mark exists per stretch, shows its sign and is left out for a stretch too narrow to hold it', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, parameter('accum-a', -7));
    apply(graph, parameter('accum-x', 7));
    expect(markSigns(graph)).toEqual(['−', '+', '−', '+', '−', '+']);
    expect(graph.viewOf(graph.model).pieces).toHaveLength(MAX_PIECES);
    expect(marks(graph)[1].parents[0]()).toBeCloseTo(-1.5 * Math.PI, 12); // centred on the stretch [-2 pi, -pi]
    expect(marks(graph)[1].parents[1]()).toBeCloseTo(0.5, 12);
    // a sliver of a stretch just past pi (0.05 wide) gets no mark, its neighbour does
    apply(graph, parameter('accum-a', 0));
    apply(graph, parameter('accum-x', Math.PI + 0.05));
    expect(markSigns(graph)).toEqual(['+']);
    // the contributions still count the sliver exactly
    expect(graph.viewOf(graph.model).below).toBeLessThan(0);
    expect(graph.viewOf(graph.model).below).toBeGreaterThan(-0.002);
    // marks are not colour alone: they are text, never take pointer events
    expect(marks(graph)[0].attributes.cssStyle).toMatch(/pointer-events:none/);
});

test('every control writes the same model as its lesson action: function, a, x and the reveal', () => {
    const viaControl = makeGraph({asyncState: false});
    const viaLesson = makeGraph({asyncState: false});
    for (const value of [1, 1.2, -0.5, 6.28, 7]) {
        expect(controls(viaControl).inputX.props.onChange(value)).toBe(true);
        apply(viaLesson, parameter('accum-x', value));
        expect(viaControl.model).toEqual(viaLesson.model);
        expect(rows(viaControl)).toEqual(rows(viaLesson));
        expect(caption(viaControl)).toEqual(caption(viaLesson));
    }
    expect(controls(viaControl).inputA.props.onChange(-2)).toBe(true);
    apply(viaLesson, parameter('accum-a', -2));
    expect(viaControl.model).toEqual(viaLesson.model);
    controls(viaControl).toggle.props.onClick();
    apply(viaLesson, reveal(true));
    expect(viaControl.model).toEqual(viaLesson.model);
    controls(viaControl).found.ChoiceSelect[0].props.onChange('exp');
    apply(viaLesson, choice('exp'));
    expect(viaControl.model).toEqual(viaLesson.model);
    expect(rows(viaControl)).toEqual(rows(viaLesson));
    expect(axisPoints(viaControl).map((point: any) => point.x)).toEqual(axisPoints(viaLesson).map((point: any) => point.x));
    expect(viaControl.model).toEqual({fn: 'exp', a: -2, x: 7, accumulationVisible: true});
});

test('the controls carry the range, label every field, name the reveal state in words and offer the three functions', () => {
    const graph = makeGraph({asyncState: false});
    const {inputA, inputX, toggle, found} = controls(graph);
    expect([inputA, inputX].map((input: any) => [input.props.label, input.props.min, input.props.max, input.props.value])).toEqual([
        ['Spodnja meja a', ACCUMULATION_BOUND_MIN, ACCUMULATION_BOUND_MAX, 0], ['Točka x', ACCUMULATION_BOUND_MIN, ACCUMULATION_BOUND_MAX, 2],
    ]);
    expect(toggle.props.children).toBe('Pokaži akumulacijo A');
    expect(toggle.props.type).toBe('button');
    expect(found.ChoiceSelect[0].props.options.map((option: any) => [option.value, option.text])).toEqual([
        ['square', 'f(x) = x²'], ['sin', 'f(x) = sin x'], ['exp', 'f(x) = eˣ'],
    ]);
    toggle.props.onClick();
    expect(controls(graph).toggle.props.children).toBe('Skrij akumulacijo A');
    expect(controls(graph).toggle.props['data-revealed']).toBe(true);
    setLanguage('en');
    expect(controls(graph).toggle.props.children).toBe('Hide accumulation A');
    expect(controls(graph).inputA.props.label).toBe('Lower bound a');
    expect(controls(graph).inputX.props.label).toBe('Point x');
    expect(collect(graph.renderControls()).div.some((element: any) => element.props.role === 'group' && element.props['aria-label'] === 'Accumulation A')).toBe(true);
    // x may be left of a: the fields do not tie one to the other
    expect(controls(graph).inputX.props.onChange(-3)).toBe(true);
    expect(graph.model).toMatchObject({a: 0, x: -3});
});

test('out-of-domain values are rejected by every setter and leave the model unchanged', () => {
    const graph = makeGraph();
    const model = {fn: 'sin', a: 0, x: 2, accumulationVisible: false};
    const rejected = (action: LessonAction) => {
        expect(() => apply(graph, action)).toThrow(DomainError);
        expect(graph.model).toEqual(model);
    };
    for (const name of ['accum-a', 'accum-x'] as const) {
        for (const value of [ACCUMULATION_BOUND_MIN - 0.01, ACCUMULATION_BOUND_MAX + 0.01, 100, -100, NaN, Infinity, -Infinity]) rejected(parameter(name, value));
    }
    rejected(choice('cos'));
    rejected(choice(''));
    rejected(choice('Sin'));
    // the number fields report the refusal instead of throwing
    expect(controls(graph).inputX.props.onChange(7.5)).toBe(false);
    expect(controls(graph).inputA.props.onChange(NaN)).toBe(false);
    expect(graph.model).toEqual(model);
    // the closest allowed values are accepted
    apply(graph, parameter('accum-a', ACCUMULATION_BOUND_MIN));
    apply(graph, parameter('accum-x', ACCUMULATION_BOUND_MAX));
    expect(graph.model).toMatchObject({a: -7, x: 7});
    expect(graph.model.accumulationVisible).toBe(false);
});

test('values are stored as given, so x = pi stays a zero of sin and is not rounded past it', () => {
    const graph = makeGraph();
    apply(graph, parameter('accum-x', Math.PI));
    expect(graph.model.x).toBe(Math.PI);
    expect(graph.viewOf(graph.model).pieces).toHaveLength(1);
    apply(graph, parameter('accum-x', 2 * Math.PI));
    expect(graph.model.x).toBe(2 * Math.PI);
    expect(graph.viewOf(graph.model).pieces).toHaveLength(2);
});

test('changing the function keeps a, x and the reveal and switches to the view of that function', () => {
    const graph = makeGraph();
    apply(graph, reveal(true));
    apply(graph, parameter('accum-a', -1));
    graph.board.setBoundingBox.mockClear();
    apply(graph, choice('exp'));
    expect(graph.model).toEqual({fn: 'exp', a: -1, x: 2, accumulationVisible: true});
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-5, 10, 9.6, -1.5], true);
    apply(graph, choice('square'));
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-2.5, 6, 5.5, -2], true);
    // both curves are readable at the default values of every function: f and A at x = 2 lie inside its view
    for (const fnId of FUNCTION_IDS) {
        const fn = catalogFunction(fnId);
        const box = ({sin: [-1.2, 3.1, 6.7, -3.1], square: [-2.5, 6, 5.5, -2], exp: [-5, 10, 9.6, -1.5]} as Record<string, number[]>)[fnId];
        for (const y of [fn.value(2), accumulation(fn, 0, 2)]) {
            expect(y).toBeLessThan(box[1]);
            expect(y).toBeGreaterThan(box[3]);
        }
        expect(2).toBeLessThan(box[2]);
        expect((box[2] - box[0]) / (box[1] - box[3])).toBeGreaterThan(0.75);
    }
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [choice('square'), parameter('accum-a', -1), parameter('accum-x', 3), reveal(true)]) apply(graph, action);
    expect(graph.model).toEqual({fn: 'square', a: -1, x: 3, accumulationVisible: true});
    expect(graph.state).toMatchObject({fn: 'sin', a: 0, x: 2, accumulationVisible: false});
    expect(caption(graph)[3]).toBe('A(x) = 9,3333 (s predznakom)'); // (27 - (-1)) / 3
    // later actions in the same tick see the earlier ones, including the order of a and x
    apply(graph, parameter('accum-a', 3));
    apply(graph, parameter('accum-x', -1));
    expect(graph.model).toEqual({fn: 'square', a: 3, x: -1, accumulationVisible: true});
    expect(caption(graph)[3]).toBe('A(x) = −9,3333 (s predznakom)');
    expect(statusIds(graph)).toEqual(['reversed', 'rising']);
    // the board points followed every action although React state never updated
    expect(axisPoints(graph).map((point: any) => point.x)).toEqual([3, -1]);
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('accumulation')!;
    expect(lesson.id).toBe('accumulation-guided');
    expect(lesson.steps).toHaveLength(7);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph({asyncState: false});
        // a deliberately different user state that the default scene must reset
        apply(graph, choice('exp'));
        apply(graph, parameter('accum-a', -3));
        apply(graph, parameter('accum-x', -1));
        apply(graph, reveal(true));
        for (const action of step.scene!.actions) apply(graph, action);
        return [graph.model, rows(graph), statusIds(graph)];
    });
    const hidden = {'signed-integral': 'skrito', 'slope': 'skrito', 'above-axis': 'skrito', 'below-axis': 'skrito'};
    expect(finals).toEqual([
        [{fn: 'sin', a: 0, x: 2, accumulationVisible: false}, {a: '0', x: '2', 'f-x': '0,9093', ...hidden}, ['hidden']],
        [{fn: 'sin', a: 0, x: 2, accumulationVisible: true}, {a: '0', x: '2', 'f-x': '0,9093', 'signed-integral': '1,4161', 'slope': '0,9093', 'above-axis': '1,4161', 'below-axis': '0'}, ['rising']],
        [{fn: 'sin', a: 0, x: Math.PI, accumulationVisible: false}, {a: '0', x: '3,1416', 'f-x': '0', ...hidden}, ['hidden']],
        [{fn: 'sin', a: 0, x: 2 * Math.PI, accumulationVisible: false}, {a: '0', x: '6,2832', 'f-x': '0', ...hidden}, ['hidden']],
        [{fn: 'sin', a: 2, x: 0, accumulationVisible: false}, {a: '2', x: '0', 'f-x': '0', ...hidden}, ['hidden']],
        [{fn: 'sin', a: 0, x: Math.PI / 2, accumulationVisible: true}, {a: '0', x: '1,5708', 'f-x': '1', 'signed-integral': '1', 'slope': '1', 'above-axis': '1', 'below-axis': '0'}, ['rising']],
        [{fn: 'square', a: 0, x: 2, accumulationVisible: false}, {a: '0', x: '2', 'f-x': '4', ...hidden}, ['hidden']],
    ]);
});

test('the revealing presses of the lesson give the numbers its prose states', () => {
    const lesson = getLessonForDemonstration('accumulation')!;
    const afterPress = (stepId: string) => {
        const graph = makeGraph({asyncState: false});
        for (const action of lesson.steps.find(step => step.id === stepId)!.scene!.actions) apply(graph, action);
        apply(graph, reveal(true));
        return graph;
    };
    const pi = afterPress('accumulation-pi-step');
    expect(rows(pi)).toMatchObject({'signed-integral': '2', 'slope': '0', 'f-x': '0'});
    expect(statusIds(pi)).toEqual(['flat']);
    const twoPi = afterPress('accumulation-negative-step');
    expect(rows(twoPi)).toMatchObject({'signed-integral': '0', 'above-axis': '2', 'below-axis': '−2'});
    const reversed = afterPress('accumulation-reversed-step');
    expect(rows(reversed)['signed-integral']).toBe('−1,4161');
    expect(statusIds(reversed)).toEqual(['reversed', 'flat']);
    const free = afterPress('accumulation-free-exploration');
    expect(rows(free)).toMatchObject({'signed-integral': '2,6667', 'slope': '4'});
    expect(statusIds(free)).toEqual(['rising']);
});

test('no readout, caption or status ever shows NaN, Infinity or a raw undefined, in either language', () => {
    const graph = makeGraph({asyncState: false});
    const bounds = [-7, -6.28, -3.14, -1, -0.001, 0, 0.001, 1, 2, Math.PI, 2 * Math.PI, 6.99, 7];
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        for (const fn of FUNCTION_IDS) {
            for (const a of bounds) {
                for (const x of [-7, -2, 0, a, 3.5, 7]) {
                    for (const accumulationVisible of [false, true]) {
                        graph.importPresetData({fn, a, x, accumulationVisible});
                        expect(graph.model).toEqual({fn, a, x, accumulationVisible});
                        const text = [...Object.values(rows(graph)), ...caption(graph), ...statusTexts(graph, language)].join(' | ');
                        expect(text, `${fn} ${a} ${x} ${accumulationVisible}`).not.toMatch(/NaN|Infinity|undefined/);
                    }
                }
            }
        }
    }
});

test('the contributions of the parts always add up to the signed integral', () => {
    const graph = makeGraph({asyncState: false});
    for (const fn of FUNCTION_IDS) {
        for (const [a, x] of [[0, 2 * Math.PI], [-7, 7], [2, -1], [1, 1], [-6, 0.5], [6.5, -6.5]]) {
            graph.importPresetData({fn, a, x, accumulationVisible: true});
            const view = graph.viewOf(graph.model);
            expect(view.above + view.below, `${fn} ${a} ${x}`).toBeCloseTo(view.value, 9);
            expect(view.value).toBeCloseTo(accumulation(catalogFunction(fn), a, x), 12);
        }
    }
});

test('dragging a and x projects onto the 0.01 grid and the domain, independently of each other, writing the model once', () => {
    const graph = makeGraph();
    const [a, x] = axisPoints(graph);
    for (const point of [a, x]) point.moveTo.mockClear();

    x.x = 1.2349; // off the grid
    x.handlers.drag();
    expect(graph.model.x).toBe(1.23);
    expect(x.moveTo).toHaveBeenCalledTimes(1);
    expect([x.x, x.y]).toEqual([1.23, 0]);
    x.x = 9; // beyond the domain: clamped to its edge
    x.handlers.drag();
    expect(graph.model.x).toBe(ACCUMULATION_BOUND_MAX);
    x.x = -9;
    x.handlers.drag();
    expect(graph.model.x).toBe(ACCUMULATION_BOUND_MIN);
    // x was dragged left of a = 0: allowed, the orientation reverses
    expect(graph.model.x).toBeLessThan(graph.model.a);

    a.x = 3.456;
    a.handlers.drag();
    expect(graph.model).toMatchObject({a: 3.46, x: -7});
    a.x = -50;
    a.handlers.drag();
    expect(graph.model.a).toBe(ACCUMULATION_BOUND_MIN);
    // a drag already shows the new model: the scene sync does not move the dragged point a second time
    expect(a.moveTo).toHaveBeenCalledTimes(2);
    expect(x.moveTo).toHaveBeenCalledTimes(3);
    expect(Number.isFinite(a.x) && Number.isFinite(x.x)).toBe(true);
    expect(graph.model.accumulationVisible).toBe(false);
});

test('a drag of a point does not change the reveal state and a drag after reveal updates the readouts', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, reveal(true));
    const [, x] = axisPoints(graph);
    x.x = 3.14;
    x.handlers.drag();
    expect(graph.model).toEqual({fn: 'sin', a: 0, x: 3.14, accumulationVisible: true});
    expect(rows(graph)['signed-integral']).toBe('2');
    expect(rows(graph).slope).toBe('0,0016');
    expect(statusIds(graph)).toEqual(['rising']);
});

test('names, kinds and choices the graph does not own are unsupported', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'y1', 'x2', 'y2', 'k', 'n', 'a', 'A', 'omega', 'phi', 'B', 'x0', 'h', 'b', 'bisect-a', 'bisect-b', 'mvt-a', 'mvt-b', 'mvt-c']) {
        expect(() => apply(graph, {kind: 'function-parameter', name, value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    for (const target of ['tangent', 'mirror', 'reference', 'matching-points']) {
        expect(() => apply(graph, {kind: 'function-visibility', target, visible: true} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'function-choice', name: 'integral-function', value: 'sin'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-choice', name: 'mean-value-example', value: 'abs'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'bisection', command: 'next-step'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
    for (const supported of [parameter('accum-a', 0), parameter('accum-x', 1), choice('exp'), reveal(true), reveal(false)]) {
        expect(graph.supportsLessonAction(supported)).toBe(true);
    }
    expect(graph.supportsLessonAction({kind: 'function-parameter', name: 'mvt-c', value: 1})).toBe(false);
    expect(graph.supportsLessonAction({kind: 'function-visibility', target: 'matching-points', visible: true})).toBe(false);
    expect(graph.model).toEqual({fn: 'sin', a: 0, x: 2, accumulationVisible: false});
});

test('presets save the model with the reveal state and reopen the same scene', () => {
    const graph = makeGraph();
    apply(graph, choice('exp'));
    apply(graph, parameter('accum-a', -1));
    apply(graph, parameter('accum-x', 0.5));
    apply(graph, reveal(true));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('accumulation');
    expect(exported.data).toEqual({fn: 'exp', a: -1, x: 0.5, accumulationVisible: true});

    const reopened = makeGraph({asyncState: false});
    reopened.importPreset({id: 'accumulation', boardState: {boundingBox: [-1, 1, 1, -1]}, data: exported.data});
    expect(reopened.model).toEqual({fn: 'exp', a: -1, x: 0.5, accumulationVisible: true});
    expect(rows(reopened)['signed-integral']).toBe('1,2808'); // e^0.5 - e^-1
    expect(resolve(curves(reopened)[A_CURVE].attributes.visible)).toBe(true);
    expect(axisPoints(reopened).map((point: any) => point.x)).toEqual([-1, 0.5]);
    expect(reopened.exportPreset().data).toEqual(exported.data);
    // a hidden state round-trips as hidden, and a string with extra properties is sanitized
    reopened.importPresetData(JSON.stringify({fn: 'square', a: 1, x: -2, accumulationVisible: false, extra: true}));
    expect(reopened.model).toEqual({fn: 'square', a: 1, x: -2, accumulationVisible: false});
    expect(rows(reopened)['signed-integral']).toBe('skrito');
    // a preset without a view of its own for another function shows that function's view
    const other = makeGraph({asyncState: false});
    other.board.setBoundingBox.mockClear();
    other.importPreset({id: 'accumulation', data: {fn: 'exp', a: 0, x: 1, accumulationVisible: false}});
    expect(other.board.setBoundingBox).toHaveBeenLastCalledWith([-5, 10, 9.6, -1.5], true);
});

test('malformed, out-of-domain or incomplete preset data is rejected to the default model with a warning', () => {
    const graph = makeGraph();
    apply(graph, parameter('accum-x', 3));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const valid = {fn: 'sin', a: 0, x: 2, accumulationVisible: false};
    const bad = [undefined, null, 'not json', {}, [], {...valid, fn: 'cos'}, {...valid, a: -7.01}, {...valid, x: 7.01}, {...valid, x: 100}, {...valid, a: '0'}, {...valid, x: NaN},
        {...valid, x: Infinity}, {...valid, accumulationVisible: 'yes'}, {...valid, accumulationVisible: 1}, {fn: 'sin', a: 0, x: 2}, {fn: 'sin', x: 2, accumulationVisible: true}];
    for (const entry of bad) {
        graph.importPresetData(entry);
        expect(graph.model).toEqual({fn: 'sin', a: 0, x: 2, accumulationVisible: false});
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
});

test('capture and restore bring back the synchronous model, including the reveal', () => {
    const graph = makeGraph();
    apply(graph, choice('square'));
    apply(graph, parameter('accum-a', -2));
    apply(graph, parameter('accum-x', 1.5));
    apply(graph, reveal(true));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({fn: 'square', a: -2, x: 1.5, accumulationVisible: true});
    expect(checkpoint.value.graphState).toMatchObject({fn: 'square', a: -2, x: 1.5, accumulationVisible: true});
    apply(graph, defaultScene);
    expect(graph.model).toEqual({fn: 'sin', a: 0, x: 2, accumulationVisible: false});
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({fn: 'square', a: -2, x: 1.5, accumulationVisible: true});
    expect(graph.setState).toHaveBeenLastCalledWith(expect.objectContaining({fn: 'square', a: -2, x: 1.5, accumulationVisible: true}));
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
});

test('unmount leaves no generated object and a late edit changes nothing on the board', () => {
    const graph = makeGraph();
    apply(graph, reveal(true));
    const [a] = axisPoints(graph);
    graph.unmount();
    expect(graph.generatedObjectCount).toBe(0);
    const setStates = graph.setState.mock.calls.length;
    const updates = graph.boardUpdate.mock.calls.length;
    expect(() => { a.x = 1; a.handlers.drag(); }).not.toThrow();
    expect(() => apply(graph, parameter('accum-x', 1))).not.toThrow();
    expect(graph.setState.mock.calls.length).toBe(setStates);
    expect(graph.boardUpdate.mock.calls.length).toBe(updates);
    expect(graph.generatedObjectCount).toBe(0);
});

test('generated objects are disposed and not duplicated across repeated generation, function changes and default scenes', () => {
    const graph = makeGraph();
    expect(boardObjectCount(graph)).toBe(BASELINE);
    for (let i = 0; i < 4; i++) graph.initialize();
    expect(boardObjectCount(graph)).toBe(BASELINE);
    expect(graph.generatedObjectCount).toBe(BASELINE);
    for (let i = 0; i < 5; i++) {
        apply(graph, choice('exp'));
        apply(graph, reveal(true));
        apply(graph, parameter('accum-x', -3));
        apply(graph, defaultScene);
    }
    expect(boardObjectCount(graph)).toBe(BASELINE);
    // no board, listener or auxiliary object beyond the owned ones was created
    expect(graph.board.create.mock.calls.every((call: any[]) => ['curve', 'functiongraph', 'segment', 'text', 'point'].includes(call[0]))).toBe(true);
    graph.disposeFigureScene();
    expect(boardObjectCount(graph)).toBe(0);
    expect(graph.generatedObjectCount).toBe(0);
    expect(() => apply(graph, parameter('accum-x', 1))).not.toThrow();
    graph.initialize();
    expect(boardObjectCount(graph)).toBe(BASELINE);
    expect(axisPoints(graph).every((point: any) => graph.board.objectsList.includes(point))).toBe(true);
});

test('the caption follows the language and a language change notifies subscribers', () => {
    const graph = makeGraph();
    apply(graph, reveal(true));
    expect(caption(graph)).toEqual(['f(x) = sin x', 'f: polna črta', 'A: črtkana črta', 'A(x) = 1,4161 (s predznakom)', 'naklon tangente na A v točki x: 0,9093']);
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(caption(graph)).toEqual(['f(x) = sin x', 'f: solid line', 'A: dashed line', 'A(x) = 1.4161 (signed)', 'slope of the tangent to A at x: 0.9093']);
    unsubscribe();
});

test('the legend names the curves and both kinds of shaded region in words, not by colour alone', () => {
    const graph = makeGraph();
    const items = graph.renderLegend().props.items as { id: string; label: string; color: string; kind?: string }[];
    expect(items.map(item => item.id)).toEqual(['function', 'accumulation', 'tangent', 'positive', 'negative']);
    expect(items.map(item => item.label)).toEqual([
        'Graf funkcije f (polna črta)', 'Akumulacija A (črtkana črta)', 'Tangenta na A v točki x z naklonom f(x)',
        'Območje med f in osjo x nad osjo: šteje pozitivno, oznaka +', 'Območje med f in osjo x pod osjo: šteje negativno, oznaka −',
    ]);
    expect(new Set(items.map(item => item.color)).size).toBe(5);
    expect(items.filter(item => item.kind === 'line')).toHaveLength(3);
    setLanguage('en');
    expect(graph.renderLegend().props.items.map((item: any) => item.label)[1]).toBe('Accumulation A (dashed line)');
    // the shaded kinds also differ by outline pattern, and the colours are those of the legend
    expect(fills(graph)[POSITIVE_FILL].attributes.dash).toBe(0);
    expect(fills(graph)[NEGATIVE_FILL].attributes.dash).toBe(2);
    expect(fills(graph)[POSITIVE_FILL].attributes.fillColor).toBe(GraphPalette.additionalCurves[0]);
    expect(fills(graph)[NEGATIVE_FILL].attributes.fillColor).toBe(GraphPalette.additionalCurves[1]);
});

test('the flat-slope tolerance covers floating-point noise only, never a small non-zero slope', () => {
    expect(FLAT_SLOPE).toBe(1e-12);
    expect(Math.abs(Math.sin(Math.PI))).toBeLessThan(FLAT_SLOPE);
    expect(Math.abs(Math.sin(2 * Math.PI))).toBeLessThan(FLAT_SLOPE);
    const graph = makeGraph({asyncState: false});
    apply(graph, reveal(true));
    // sin(x) = 4e-5 rounds to 0 on the four-decimal readout but is not zero: the status must not claim f(x) = 0
    apply(graph, parameter('accum-x', Math.asin(4e-5)));
    expect(rows(graph).slope).toBe('0');
    expect(statusIds(graph)).toEqual(['rising']);
    apply(graph, parameter('accum-x', Math.PI - Math.asin(4e-5)));
    expect(statusIds(graph)).toEqual(['rising']);
    apply(graph, parameter('accum-x', Math.PI + Math.asin(4e-5)));
    expect(statusIds(graph)).toEqual(['falling']);
    apply(graph, parameter('accum-x', Math.asin(6e-5)));
    expect(rows(graph).slope).toBe('0,0001');
    expect(statusIds(graph)).toEqual(['rising']);
});

test('the drawn curves tolerate the non-finite arguments a real board evaluates while it sets up', () => {
    const graph = makeGraph();
    for (const curve of curves(graph)) {
        for (const t of [NaN, Infinity, -Infinity]) expect(() => curve.parents[0](t)).not.toThrow();
        expect(Number.isNaN(curve.parents[0](NaN))).toBe(true);
    }
});
