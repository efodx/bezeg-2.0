import {MATCH_TOLERANCE, MeanValueGraph} from './MeanValueGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {MEAN_VALUE_EXAMPLE_IDS, MEAN_VALUE_EXAMPLES, MVT_X_MAX, MVT_X_MIN} from '../../analysis/meanValue';
import {MEAN_VALUE_EXAMPLE_MODELS} from '../../analysis/meanValueModel';
import {currentLanguage, onLanguageChange, setLanguage} from '../../localization';
import {GraphPalette} from '../styles/GraphPalette';
import {DomainError} from './BaseFunctionGraph';

const BOX = [-2.5, 5, 4, -2.5];

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
    const graph = new MeanValueGraph() as any;
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
const parameter = (name: 'mvt-a' | 'mvt-b' | 'mvt-c', value: number): LessonAction => ({kind: 'function-parameter', name, value});
const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'mean-value-example', value});
const reveal = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'matching-points', visible});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const boardObjectCount = (graph: any) => graph.board.objectsList.length;

// Creation order: curves (function, secant, tangent, two parallels), segments (interval, three drop lines),
// points (three function values, two rings, then the draggable a, b and c on the axis) and the one caption text.
const [FUNCTION, SECANT, TANGENT, PARALLEL_1, PARALLEL_2] = [0, 1, 2, 3, 4];
const [INTERVAL] = [0];
const [RING_1, RING_2, AXIS_A, AXIS_B, AXIS_C] = [3, 4, 5, 6, 7];
const curves = (graph: any) => ofType(graph, 'functiongraph');
const points = (graph: any) => ofType(graph, 'point');
const axisPoints = (graph: any) => [points(graph)[AXIS_A], points(graph)[AXIS_B], points(graph)[AXIS_C]];
const lineValues = (curve: any, xs: number[]) => xs.map(x => curve.parents[0](x));
const secantValues = (graph: any) => lineValues(curves(graph)[SECANT], [-1, 0, 1, 2]);
const caption = (graph: any) => graph.captionPlainLines();

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
    const found = collect([graph.renderControls(), graph.renderReveals()]);
    const [inputA, inputB, inputC] = found.NumberInput;
    const toggle = found.button.find((element: any) => element.props['data-action'] === 'toggle-matches');
    return {found, inputA, inputB, inputC, toggle};
};
const rows = (graph: any): Record<string, string> =>
    Object.fromEntries((graph.renderReadout().props.children[0].props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));
const statusIds = (graph: any) => graph.statuses(graph.model, graph.viewOf(graph.model), currentLanguage()).map((status: { id: string }) => status.id);
/** The status sentences in a language (texts come from the active language, so it is switched for the call). */
const statusTexts = (graph: any, language: 'sl' | 'en' = 'sl') => {
    const previous = currentLanguage();
    setLanguage(language);
    try {
        return graph.statuses(graph.model, graph.viewOf(graph.model), language).map((status: { text: string }) => status.text);
    } finally {
        setLanguage(previous);
    }
};

beforeEach(() => setLanguage('sl'));

test('initialization draws the function, secant, tangent, parallels, drop lines, points and one caption text for x^2 on [0, 2] with c = 0.5', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({example: 'square', a: 0, b: 2, c: 0.5, revealed: false});
    expect(graph.presets()).toBe('mean-value');
    expect(curves(graph)).toHaveLength(5);
    expect(ofType(graph, 'segment')).toHaveLength(4);
    expect(points(graph)).toHaveLength(8);
    expect(ofType(graph, 'text')).toHaveLength(1);
    expect(boardObjectCount(graph)).toBe(18);
    expect(graph.generatedObjectCount).toBe(boardObjectCount(graph));
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    expect(caption(graph)).toEqual(['f(x) = x²', 'naklon sekante 2, tangente 1']);
    // the function, the secant through (0, 0) and (2, 4) and the tangent at c = 0.5 (slope 1, through (0.5, 0.25))
    expect(lineValues(curves(graph)[FUNCTION], [-1, 3])).toEqual([1, 9]);
    expect(secantValues(graph)).toEqual([-2, 0, 2, 4]);
    expect(lineValues(curves(graph)[TANGENT], [0, 0.5, 2])).toEqual([-0.25, 0.25, 1.75]);
    expect(resolve(curves(graph)[TANGENT].attributes.visible)).toBe(true);
    // a, b and c sit on the axis, the function values on the graph, and nothing is revealed
    expect(axisPoints(graph).map((point: any) => [point.x, point.y])).toEqual([[0, 0], [2, 0], [0.5, 0]]);
    expect(points(graph).slice(0, 3).map((point: any) => [point.X(), point.Y()])).toEqual([[0, 0], [2, 4], [0.5, 0.25]]);
    for (const ring of [points(graph)[RING_1], points(graph)[RING_2]]) expect(resolve(ring.attributes.visible)).toBe(false);
    for (const parallel of [curves(graph)[PARALLEL_1], curves(graph)[PARALLEL_2]]) expect(resolve(parallel.attributes.visible)).toBe(false);
    expect(resolve(ofType(graph, 'segment')[INTERVAL].attributes.visible)).toBe(false);
});

test('the default readout gives both slopes and their difference, and hides the matching points until they are revealed', () => {
    const graph = makeGraph({asyncState: false});
    expect(rows(graph)).toEqual({
        'a': '0', 'b': '2', 'c': '0,5', 'f-a': '0', 'f-b': '4', 'f-c': '0,25',
        'secant-slope': '2', 'tangent-slope': '1', 'difference': '−1', 'matches': 'skrite',
    });
    expect(statusIds(graph)).toEqual(['differ']);
    // the changing difference lives in the readout row, never in the live status: it would be announced on every drag step
    expect(statusTexts(graph)[0]).not.toMatch(/\d/);
    expect(statusTexts(graph, 'en')[0]).not.toMatch(/\d/);
    apply(graph, parameter('mvt-c', 1.25));
    expect(statusTexts(graph)).toEqual(['Naklona se razlikujeta. Premakni c, da ju ujameš, ali pokaži ujemajočo točko.']);
});

test('Show matching point reveals c = 1 for x^2 on [0, 2]: a ring on the graph and a tangent parallel to the secant', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, reveal(true));
    expect(graph.model).toEqual({example: 'square', a: 0, b: 2, c: 0.5, revealed: true});
    const [ring1, ring2] = [points(graph)[RING_1], points(graph)[RING_2]];
    expect(resolve(ring1.attributes.visible)).toBe(true);
    expect([ring1.X(), ring1.Y()]).toEqual([1, 1]);
    expect(resolve(ring2.attributes.visible)).toBe(false);
    const parallel = curves(graph)[PARALLEL_1];
    expect(resolve(parallel.attributes.visible)).toBe(true);
    expect(lineValues(parallel, [1, 2])).toEqual([1, 3]); // slope 2 (the secant slope) through (1, 1)
    expect(resolve(curves(graph)[PARALLEL_2].attributes.visible)).toBe(false);
    expect(rows(graph).matches).toBe('1');
    expect(statusIds(graph)).toEqual(['differ', 'matches']);
    // hiding and showing again is a plain toggle of the model
    apply(graph, reveal(false));
    expect(graph.model.revealed).toBe(false);
    expect(resolve(ring1.attributes.visible)).toBe(false);
    expect(rows(graph).matches).toBe('skrite');
});

test('x^3 with a = -2b: the root that equals an endpoint is not shown as a second match', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('cube'));
    apply(graph, parameter('mvt-a', -1.98));
    apply(graph, parameter('mvt-b', 0.99));
    apply(graph, reveal(true));
    expect(rows(graph).matches).toBe('−0,99');
    expect(statusIds(graph)).toContain('matches');
    expect(statusTexts(graph, 'en').join(' ')).toContain('Matching point: c = −0.99.');
    expect(statusTexts(graph, 'en').join(' ')).not.toContain('c = 0.99');
    // the mirror image keeps only the positive root
    apply(graph, parameter('mvt-b', 1.98));
    apply(graph, parameter('mvt-a', -0.99));
    expect(rows(graph).matches).toBe('0,99');
    // a genuine pair of matches is still two points
    apply(graph, choice('cube'));
    apply(graph, reveal(true));
    expect(rows(graph).matches).toBe('−0,5774; 0,5774');
});

test('x^3 on [-1, 1] reveals both matches c = +-1/sqrt(3), the same slope at both', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('cube'));
    expect(graph.model).toEqual({example: 'cube', a: -1, b: 1, c: 0, revealed: false});
    apply(graph, reveal(true));
    const root = 1 / Math.sqrt(3);
    const rings = [points(graph)[RING_1], points(graph)[RING_2]];
    expect(rings.map(ring => resolve(ring.attributes.visible))).toEqual([true, true]);
    expect(rings[0].X()).toBeCloseTo(-root, 12);
    expect(rings[1].X()).toBeCloseTo(root, 12);
    expect(rings[0].Y()).toBeCloseTo(-(root ** 3), 12);
    expect(rings[1].Y()).toBeCloseTo(root ** 3, 12);
    for (const parallel of [curves(graph)[PARALLEL_1], curves(graph)[PARALLEL_2]]) {
        expect(resolve(parallel.attributes.visible)).toBe(true);
        const [low, high] = lineValues(parallel, [0, 1]);
        expect(high - low).toBeCloseTo(1, 12); // the secant slope of x^3 on [-1, 1]
    }
    expect(rows(graph).matches).toBe('−0,5774; 0,5774');
    expect(rows(graph)['secant-slope']).toBe('1');
    expect(statusTexts(graph).at(-1)).toContain('−0,5774');
    expect(statusTexts(graph).at(-1)).toContain('0,5774');
    expect(statusTexts(graph, 'en').at(-1)).toMatch(/more than one/);
    // c = 0 is flat: slopes 0 and 1, the tangent is drawn, the slopes do not agree
    expect(rows(graph)['tangent-slope']).toBe('0');
    expect(rows(graph).difference).toBe('−1');
});

test('|x| on [-1, 1] has no matching point and says so with its reason; the corner has no tangent and no number', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('abs'));
    apply(graph, parameter('mvt-c', 0));
    apply(graph, reveal(true));
    expect(rows(graph)).toEqual({
        'a': '−1', 'b': '1', 'c': '0', 'f-a': '1', 'f-b': '1', 'f-c': '0',
        'secant-slope': '0', 'tangent-slope': 'ne obstaja', 'difference': 'ne obstaja', 'matches': 'ni',
    });
    expect(statusIds(graph)).toEqual(['hypothesis', 'corner', 'matches-none']);
    expect(statusTexts(graph, 'en')).toEqual([
        expect.stringMatching(/not satisfied.*not differentiable at 0/),
        expect.stringMatching(/no tangent and the tangent slope does not exist/),
        expect.stringMatching(/does not contradict the theorem/),
    ]);
    // no tangent line is drawn or even visible; the rings and parallels stay hidden
    const tangent = curves(graph)[TANGENT];
    expect(resolve(tangent.attributes.visible)).toBe(false);
    expect(Number.isNaN(tangent.parents[0](1))).toBe(true);
    for (const ring of [points(graph)[RING_1], points(graph)[RING_2]]) expect(resolve(ring.attributes.visible)).toBe(false);
    expect(caption(graph)).toEqual(['f(x) = |x|', 'naklon sekante 0, tangente v c ni', 'prelom v c: tangente ni']);
    // moving c off the corner draws the tangent again with slope +-1
    apply(graph, parameter('mvt-c', 0.5));
    expect(resolve(tangent.attributes.visible)).toBe(true);
    expect(rows(graph)['tangent-slope']).toBe('1');
    expect(rows(graph).difference).toBe('1');
    apply(graph, parameter('mvt-c', -0.5));
    expect(rows(graph)['tangent-slope']).toBe('−1');
    expect(caption(graph)[1]).toBe('naklon sekante 0, tangente −1');
});

test('|x| on one side of the corner matches on the whole open interval, which is marked on the axis and described honestly', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('abs'));
    apply(graph, parameter('mvt-a', 0));
    apply(graph, reveal(true));
    expect(graph.model).toEqual({example: 'abs', a: 0, b: 1, c: 0.5, revealed: true});
    const interval = ofType(graph, 'segment')[INTERVAL];
    expect(resolve(interval.attributes.visible)).toBe(true);
    expect([interval.parents[0][0](), interval.parents[1][0]()]).toEqual([0, 1]);
    for (const ring of [points(graph)[RING_1], points(graph)[RING_2]]) expect(resolve(ring.attributes.visible)).toBe(false);
    expect(rows(graph).matches).toBe('vsaka točka v (0, 1)');
    expect(statusIds(graph)).toEqual(['agree', 'matches-interval']);
    expect(statusTexts(graph, 'en').at(-1)).toMatch(/Every point of the open interval \(0, 1\) matches.*at least one point, not exactly one/);
    // the interval follows b, and the marker disappears when it is hidden again
    apply(graph, parameter('mvt-b', 2));
    expect([interval.parents[1][0]()]).toEqual([2]);
    apply(graph, reveal(false));
    expect(resolve(interval.attributes.visible)).toBe(false);
    // an interval around the corner has no matching interval and no point
    apply(graph, parameter('mvt-c', 1));
    apply(graph, parameter('mvt-a', -1));
    apply(graph, reveal(true));
    expect(resolve(interval.attributes.visible)).toBe(false);
    expect(rows(graph).matches).toBe('ni');
});

test('changing c never moves a or b, and the displayed slope difference follows it', () => {
    const graph = makeGraph({asyncState: false});
    const before = secantValues(graph);
    for (const c of [0.01, 0.5, 1, 1.5, 1.99]) {
        apply(graph, parameter('mvt-c', c));
        expect([graph.model.a, graph.model.b, graph.model.c]).toEqual([0, 2, c]);
        expect(secantValues(graph)).toEqual(before);
        expect(axisPoints(graph).slice(0, 2).map((point: any) => point.x)).toEqual([0, 2]);
        expect(points(graph).slice(0, 2).map((point: any) => [point.X(), point.Y()])).toEqual([[0, 0], [2, 4]]);
        expect(rows(graph)['secant-slope']).toBe('2');
    }
    expect(rows(graph).difference).toBe('1,98');
});

test('setting c through the number field and through the lesson action gives the same configuration', () => {
    const viaControl = makeGraph({asyncState: false});
    const viaLesson = makeGraph({asyncState: false});
    for (const value of [1, 1.2, 0.25, 1.99]) {
        expect(controls(viaControl).inputC.props.onChange(value)).toBe(true);
        apply(viaLesson, parameter('mvt-c', value));
        expect(viaControl.model).toEqual(viaLesson.model);
        expect(viaControl.model).toMatchObject({a: 0, b: 2, c: value, revealed: false});
        expect(rows(viaControl)).toEqual(rows(viaLesson));
        expect(caption(viaControl)).toEqual(caption(viaLesson));
        expect(secantValues(viaControl)).toEqual(secantValues(viaLesson));
        expect(axisPoints(viaControl).map((point: any) => point.x)).toEqual(axisPoints(viaLesson).map((point: any) => point.x));
    }
    // the same holds for the endpoints, the example and the reveal
    const a = controls(viaControl).inputA.props.onChange(-1);
    apply(viaLesson, parameter('mvt-a', -1));
    expect(a).toBe(true);
    expect(viaControl.model).toEqual(viaLesson.model);
    controls(viaControl).toggle.props.onClick();
    apply(viaLesson, reveal(true));
    expect(viaControl.model).toEqual(viaLesson.model);
    controls(viaControl).found.ChoiceSelect[0].props.onChange('cube');
    apply(viaLesson, choice('cube'));
    expect(viaControl.model).toEqual(viaLesson.model);
    expect(rows(viaControl)).toEqual(rows(viaLesson));
});

test('a < c < b is enforced by every setter: out-of-order values are rejected and leave the model unchanged', () => {
    const graph = makeGraph();
    const model = {example: 'square', a: 0, b: 2, c: 0.5, revealed: false};
    const rejected = (action: LessonAction) => {
        expect(() => apply(graph, action)).toThrow(DomainError);
        expect(graph.model).toEqual(model);
    };
    rejected(parameter('mvt-a', 0.5)); // a = c
    rejected(parameter('mvt-a', 1)); // a beyond c
    rejected(parameter('mvt-a', 2)); // a = b
    rejected(parameter('mvt-b', 0.5)); // b = c
    rejected(parameter('mvt-b', 0.25)); // b before c
    rejected(parameter('mvt-b', -1));
    rejected(parameter('mvt-c', 0)); // c = a
    rejected(parameter('mvt-c', 2)); // c = b
    rejected(parameter('mvt-c', -1));
    rejected(parameter('mvt-c', 3));
    // the domain bounds, and non-finite values
    rejected(parameter('mvt-a', MVT_X_MIN - 0.01));
    rejected(parameter('mvt-b', MVT_X_MAX + 0.01));
    rejected(parameter('mvt-c', NaN));
    rejected(parameter('mvt-a', -Infinity));
    rejected(parameter('mvt-b', Infinity));
    rejected(choice('sin'));
    rejected(choice(''));
    // the closest allowed values are accepted
    apply(graph, parameter('mvt-a', 0.49));
    apply(graph, parameter('mvt-b', 0.51));
    expect(graph.model).toMatchObject({a: 0.49, b: 0.51, c: 0.5});
    apply(graph, parameter('mvt-c', 0.495));
    expect(graph.model.c).toBe(0.495);
    // after c moves the endpoints may move across the old c
    apply(graph, parameter('mvt-c', 0.5));
    apply(graph, parameter('mvt-a', MVT_X_MIN));
    apply(graph, parameter('mvt-b', MVT_X_MAX));
    expect(graph.model).toMatchObject({a: -4, b: 4, c: 0.5});
});

test('the number fields carry the ordering in their range, report rejection and show the rule', () => {
    const graph = makeGraph({asyncState: false});
    const {inputA, inputB, inputC} = controls(graph);
    expect([inputA, inputB, inputC].map((input: any) => [input.props.label, input.props.min, input.props.max, input.props.value])).toEqual([
        ['Levo krajišče a', -4, 0.5, 0], ['Desno krajišče b', 0.5, 4, 2], ['Točka dotika c', 0, 2, 0.5],
    ]);
    expect(inputA.props.onChange(0.5)).toBe(false); // would make a = c
    expect(inputB.props.onChange(0.5)).toBe(false);
    expect(inputC.props.onChange(2)).toBe(false);
    expect(graph.model).toMatchObject({a: 0, b: 2, c: 0.5});
    expect(inputA.props.onChange(0.4)).toBe(true);
    expect(graph.model.a).toBe(0.4);
    expect(controls(graph).inputC.props.min).toBe(0.4);
    expect(collect([graph.renderControls(), graph.renderReveals()]).p.some((element: any) => /a < c < b/.test(String(element.props.children)))).toBe(true);
    setLanguage('en');
    expect(controls(graph).inputA.props.label).toBe('Left endpoint a');
    expect(controls(graph).inputC.props.label).toBe('Point of tangency c');
});

test('the Show matching point control toggles the reveal and names its state in words', () => {
    const graph = makeGraph({asyncState: false});
    expect(controls(graph).toggle.props.children).toBe('Pokaži ujemajočo točko');
    controls(graph).toggle.props.onClick();
    expect(graph.model.revealed).toBe(true);
    expect(controls(graph).toggle.props.children).toBe('Skrij ujemajočo točko');
    controls(graph).toggle.props.onClick();
    expect(graph.model.revealed).toBe(false);
    setLanguage('en');
    expect(controls(graph).toggle.props.children).toBe('Show matching point');
    controls(graph).toggle.props.onClick();
    expect(controls(graph).toggle.props.children).toBe('Hide matching point');
    expect(collect([graph.renderControls(), graph.renderReveals()]).div.some((element: any) => element.props.role === 'group' && element.props['aria-label'] === 'Matching points')).toBe(true);
    expect(controls(graph).found.ChoiceSelect[0].props.options.map((option: any) => [option.value, option.text])).toEqual([
        ['square', 'f(x) = x²'], ['cube', 'f(x) = x³'], ['abs', 'f(x) = |x|'],
    ]);
});

test('the reveal survives edits of a, b and c and is reset only by choosing an example', () => {
    const graph = makeGraph();
    apply(graph, reveal(true));
    apply(graph, parameter('mvt-c', 1.5));
    apply(graph, parameter('mvt-b', 3));
    expect(graph.model).toEqual({example: 'square', a: 0, b: 3, c: 1.5, revealed: true});
    expect(graph.viewOf(graph.model).matches).toEqual({kind: 'points', points: [1.5]});
    apply(graph, choice('square'));
    expect(graph.model).toEqual({example: 'square', a: 0, b: 2, c: 0.5, revealed: false});
});

test('the examples start from their lesson models, which are not at a matching point or a corner', () => {
    for (const id of MEAN_VALUE_EXAMPLE_IDS) {
        const graph = makeGraph();
        apply(graph, choice(id));
        expect(graph.model).toEqual(MEAN_VALUE_EXAMPLE_MODELS[id]);
        expect(MEAN_VALUE_EXAMPLES[id].derivative(graph.model.c)).toBeDefined();
    }
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [choice('cube'), parameter('mvt-c', 0.3), reveal(true)]) apply(graph, action);
    expect(graph.model).toEqual({example: 'cube', a: -1, b: 1, c: 0.3, revealed: true});
    expect(graph.state).toMatchObject({example: 'square', a: 0, b: 2, c: 0.5, revealed: false});
    expect(caption(graph)[1]).toBe('naklon sekante 1, tangente 0,27');
    // a later action in the same tick sees the earlier one, including an endpoint that depends on c
    apply(graph, choice('abs'));
    apply(graph, parameter('mvt-a', 0));
    apply(graph, parameter('mvt-c', 0.5));
    apply(graph, parameter('mvt-b', 3));
    apply(graph, reveal(true));
    expect(graph.model).toEqual({example: 'abs', a: 0, b: 3, c: 0.5, revealed: true});
    apply(graph, parameter('mvt-c', 0.1));
    apply(graph, parameter('mvt-a', 0.05));
    expect(graph.model).toEqual({example: 'abs', a: 0.05, b: 3, c: 0.1, revealed: true});
    // the same sequence with the order of a and c swapped is rejected by the ordering rule, not silently reordered
    expect(() => apply(graph, parameter('mvt-a', 0.2))).toThrow(DomainError);
    expect(graph.model).toEqual({example: 'abs', a: 0.05, b: 3, c: 0.1, revealed: true});
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('mean-value')!;
    expect(lesson.id).toBe('mean-value-guided');
    expect(lesson.steps).toHaveLength(6);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph({asyncState: false});
        // a deliberately different user state that the default scene must reset
        apply(graph, choice('abs'));
        apply(graph, parameter('mvt-c', -0.5));
        apply(graph, reveal(true));
        for (const action of step.scene!.actions) apply(graph, action);
        const {matches, difference} = rows(graph);
        return [graph.model, rows(graph)['secant-slope'], rows(graph)['tangent-slope'], difference, matches, statusIds(graph)];
    });
    expect(finals).toEqual([
        [{example: 'square', a: 0, b: 2, c: 0.5, revealed: false}, '2', '1', '−1', 'skrite', ['differ']],
        [{example: 'square', a: 0, b: 2, c: 1, revealed: true}, '2', '2', '0', '1', ['agree', 'matches']],
        [{example: 'square', a: 0, b: 2, c: 1.5, revealed: false}, '2', '3', '1', 'skrite', ['differ']],
        [{example: 'cube', a: -1, b: 1, c: 0, revealed: false}, '1', '0', '−1', 'skrite', ['differ']],
        [{example: 'abs', a: -1, b: 1, c: 0, revealed: false}, '0', 'ne obstaja', 'ne obstaja', 'skrite', ['hypothesis', 'corner']],
        [{example: 'abs', a: 0, b: 1, c: 0.5, revealed: false}, '1', '1', '0', 'skrite', ['agree']],
    ]);
});

test('the revealing presses of the cube and corner steps give the numbers the lesson states', () => {
    const lesson = getLessonForDemonstration('mean-value')!;
    const stateAfter = (stepId: string) => {
        const graph = makeGraph({asyncState: false});
        for (const action of lesson.steps.find(step => step.id === stepId)!.scene!.actions) apply(graph, action);
        apply(graph, reveal(true));
        return graph;
    };
    expect(rows(stateAfter('mean-value-cube-step')).matches).toBe('−0,5774; 0,5774');
    const corner = stateAfter('mean-value-abs-step');
    expect(rows(corner).matches).toBe('ni');
    expect(statusIds(corner)).toEqual(['hypothesis', 'corner', 'matches-none']);
    const interval = stateAfter('mean-value-free-exploration');
    expect(rows(interval).matches).toBe('vsaka točka v (0, 1)');
    expect(rows(stateAfter('mean-value-reveal-step')).matches).toBe('1');
});

test('no readout, caption or status ever shows NaN, Infinity or a raw undefined, in either language', () => {
    const graph = makeGraph({asyncState: false});
    const cases: [string, number, number, number][] = [
        ['square', -4, 0, 4], ['square', 0, 0.001, 0.002], ['square', 3.99, 3.995, 4], ['cube', -4, 0, 4], ['cube', 0, 0.5, 4], ['cube', -4, -3, -2],
        ['abs', -1, 0, 1], ['abs', -4, 0, 4], ['abs', 0, 0.5, 1], ['abs', -3, -1, 0], ['abs', -0.01, 0.005, 0.01], ['abs', -1, 0.5, 1],
    ];
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        for (const [example, a, c, b] of cases) {
            for (const revealed of [false, true]) {
                graph.importPresetData({example, a, b, c, revealed});
                expect(graph.model).toEqual({example, a, b, c, revealed});
                const text = [...Object.values(rows(graph)), ...caption(graph), ...statusTexts(graph, language)].join(' | ');
                expect(text, `${example} ${a} ${c} ${b} ${revealed}`).not.toMatch(/NaN|Infinity|undefined/);
            }
        }
    }
});

test('a slope difference within the tolerance is called agreement of numbers, never a proof', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, parameter('mvt-c', 1));
    expect(statusIds(graph)).toEqual(['agree']);
    expect(statusTexts(graph, 'en')[0]).toMatch(/within the tolerance 0\.005.*numerical comparison, not a proof/);
    expect(caption(graph)).toEqual(['f(x) = x²', 'naklon sekante 2, tangente 2', 'naklona se ujemata (številčno)']);
    expect(graph.captionColors()[2]).toBe(GraphPalette.primaryCurve);
    // the difference is 2c - 2: 0.004 is inside the tolerance, 0.008 is outside
    apply(graph, parameter('mvt-c', 1.002));
    expect(statusIds(graph)).toEqual(['agree']);
    apply(graph, parameter('mvt-c', 1.004));
    expect(statusIds(graph)).toEqual(['differ']);
    expect(MATCH_TOLERANCE).toBe(0.005);
    const note = graph.renderReadout().props.children[0].props.note as string;
    expect(note).toMatch(/številčna primerjava.*ne dokaz/);
    setLanguage('en');
    expect(graph.renderReadout().props.children[0].props.note).toMatch(/numerical comparison.*not a proof/);
});

test('dragging a, b and c on the axis projects onto the grid and the range the ordering allows, writing the model once', () => {
    const graph = makeGraph();
    const [a, b, c] = axisPoints(graph);
    for (const point of [a, b, c]) point.moveTo.mockClear();

    c.x = 1.2349; // off the 0.01 grid
    c.handlers.drag();
    expect(graph.model.c).toBe(1.23);
    expect(c.moveTo).toHaveBeenCalledTimes(1);
    expect([c.x, c.y]).toEqual([1.23, 0]);

    c.x = 9; // beyond b: clamped just inside it
    c.handlers.drag();
    expect(graph.model.c).toBe(1.99);
    c.x = -9;
    c.handlers.drag();
    expect(graph.model.c).toBe(0.01);

    a.x = 0.7; // beyond c = 0.01: clamped just left of it
    a.handlers.drag();
    expect(graph.model).toMatchObject({a: 0, c: 0.01});
    a.x = -9;
    a.handlers.drag();
    expect(graph.model.a).toBe(MVT_X_MIN);
    b.x = 0.001;
    b.handlers.drag();
    expect(graph.model.b).toBe(0.02);
    b.x = 9;
    b.handlers.drag();
    expect(graph.model.b).toBe(MVT_X_MAX);
    // dragging c never moved the endpoints: a and b were only moved by their own drags
    expect([a.x, b.x]).toEqual([MVT_X_MIN, MVT_X_MAX]);
    // a drag already shows the new model: the scene sync does not move the dragged point a second time
    expect(a.moveTo).toHaveBeenCalledTimes(2);
    expect(Number.isFinite(c.x) && Number.isFinite(b.x)).toBe(true);
});

test('a drag the model still refuses puts the point back instead of leaving it on the rejected position', () => {
    const graph = makeGraph();
    graph.importPresetData({example: 'square', a: 0.499, b: 0.5, c: 0.4995, revealed: false});
    const [a, , c] = axisPoints(graph);
    c.moveTo.mockClear();
    a.moveTo.mockClear();
    // the room between a and b is smaller than two grid steps: any grid position of c is refused
    c.x = 0.7;
    expect(() => c.handlers.drag()).not.toThrow();
    expect(graph.model).toEqual({example: 'square', a: 0.499, b: 0.5, c: 0.4995, revealed: false});
    expect(c.moveTo).toHaveBeenCalledTimes(1);
    expect([c.x, c.y]).toEqual([0.4995, 0]);
    // a is only limited by c: dragging it right of c stops 0.01 short of c, which the model accepts
    a.x = 0.6;
    expect(() => a.handlers.drag()).not.toThrow();
    expect(graph.model).toMatchObject({a: 0.4895, c: 0.4995});
    expect(a.x).toBe(0.4895);
});

test('names, kinds and choices the graph does not own are unsupported', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'y1', 'x2', 'y2', 'k', 'n', 'a', 'A', 'omega', 'phi', 'B', 'x0', 'h', 'b', 'bisect-a', 'bisect-b']) {
        expect(() => apply(graph, {kind: 'function-parameter', name, value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    for (const target of ['tangent', 'mirror', 'reference']) {
        expect(() => apply(graph, {kind: 'function-visibility', target, visible: true} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'function-choice', name: 'bisection-example', value: 'cubic'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-choice', name: 'derivative-function', value: 'sin'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'bisection', command: 'next-step'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'decasteljau', command: 'play'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
    for (const supported of [parameter('mvt-a', 0), parameter('mvt-b', 1), parameter('mvt-c', 1), choice('abs'), reveal(true), reveal(false)]) {
        expect(graph.supportsLessonAction(supported)).toBe(true);
    }
    expect(graph.supportsLessonAction({kind: 'function-parameter', name: 'bisect-a', value: 1})).toBe(false);
    expect(graph.supportsLessonAction({kind: 'function-visibility', target: 'tangent', visible: true})).toBe(false);
    expect(graph.model).toEqual({example: 'square', a: 0, b: 2, c: 0.5, revealed: false});
});

test('presets save the model with the reveal state and reopen the same scene', () => {
    const graph = makeGraph();
    apply(graph, choice('cube'));
    apply(graph, parameter('mvt-c', 0.25));
    apply(graph, reveal(true));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('mean-value');
    expect(exported.data).toEqual({example: 'cube', a: -1, b: 1, c: 0.25, revealed: true});

    const reopened = makeGraph({asyncState: false});
    reopened.importPreset({id: 'mean-value', boardState: {boundingBox: [-1, 1, 1, -1]}, data: exported.data});
    expect(reopened.model).toEqual({example: 'cube', a: -1, b: 1, c: 0.25, revealed: true});
    expect(rows(reopened).matches).toBe('−0,5774; 0,5774');
    expect(resolve(points(reopened)[RING_1].attributes.visible)).toBe(true);
    expect(axisPoints(reopened).map((point: any) => point.x)).toEqual([-1, 1, 0.25]);
    expect(reopened.exportPreset().data).toEqual(exported.data);
    // a string and extra properties are sanitized
    reopened.importPresetData(JSON.stringify({example: 'abs', a: -2, b: 3, c: 0, revealed: false, extra: true}));
    expect(reopened.model).toEqual({example: 'abs', a: -2, b: 3, c: 0, revealed: false});
});

test('malformed or misordered preset data is rejected to the default model with a warning', () => {
    const graph = makeGraph();
    apply(graph, parameter('mvt-c', 1.5));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const valid = {example: 'square', a: 0, b: 2, c: 1, revealed: false};
    const bad = [undefined, null, 'not json', {}, [], {...valid, example: 'quartic'}, {...valid, c: 0}, {...valid, c: 2}, {...valid, c: -1}, {...valid, c: 3},
        {...valid, a: 2, b: 0}, {...valid, a: 1, b: 1, c: 1}, {...valid, a: -5}, {...valid, b: 4.5}, {...valid, a: '0'}, {...valid, c: NaN}, {...valid, revealed: 'yes'},
        {example: 'square', a: 0, b: 2, c: 1}];
    for (const entry of bad) {
        graph.importPresetData(entry);
        expect(graph.model).toEqual({example: 'square', a: 0, b: 2, c: 0.5, revealed: false});
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
});

test('capture and restore bring back the synchronous model, including the reveal', () => {
    const graph = makeGraph();
    apply(graph, choice('cube'));
    apply(graph, parameter('mvt-c', 0.4));
    apply(graph, reveal(true));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({example: 'cube', a: -1, b: 1, c: 0.4, revealed: true});
    expect(checkpoint.value.graphState).toMatchObject({example: 'cube', a: -1, b: 1, c: 0.4, revealed: true});
    apply(graph, defaultScene);
    expect(graph.model).toEqual({example: 'square', a: 0, b: 2, c: 0.5, revealed: false});
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({example: 'cube', a: -1, b: 1, c: 0.4, revealed: true});
    expect(graph.setState).toHaveBeenLastCalledWith(expect.objectContaining({example: 'cube', a: -1, b: 1, c: 0.4, revealed: true}));
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
});

test('unmount leaves no generated object and a late edit changes nothing on the board', () => {
    const graph = makeGraph();
    apply(graph, reveal(true));
    const [a] = axisPoints(graph);
    graph.unmount();
    expect(graph.generatedObjectCount).toBe(0);
    // a late drag, input or action after unmount is only a model update: no React state, no board update, no removed object touched
    const setStates = graph.setState.mock.calls.length;
    const updates = graph.boardUpdate.mock.calls.length;
    expect(() => { a.x = 1; a.handlers.drag(); }).not.toThrow();
    expect(() => apply(graph, parameter('mvt-c', 1))).not.toThrow();
    expect(graph.setState.mock.calls.length).toBe(setStates);
    expect(graph.boardUpdate.mock.calls.length).toBe(updates);
    expect(graph.generatedObjectCount).toBe(0);
});

test('generated objects are disposed and not duplicated across repeated generation, example changes and default scenes', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    expect(baseline).toBe(18);
    for (let i = 0; i < 4; i++) graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    expect(graph.generatedObjectCount).toBe(baseline);
    for (let i = 0; i < 5; i++) {
        apply(graph, choice('cube'));
        apply(graph, reveal(true));
        apply(graph, parameter('mvt-c', 0.5));
        apply(graph, defaultScene);
    }
    expect(boardObjectCount(graph)).toBe(baseline);
    graph.disposeFigureScene();
    expect(boardObjectCount(graph)).toBe(0);
    expect(graph.generatedObjectCount).toBe(0);
    expect(() => apply(graph, parameter('mvt-c', 1))).not.toThrow();
    graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    // the axis points of the new scene are the draggable ones; the old ones are gone
    expect(axisPoints(graph).every((point: any) => graph.board.objectsList.includes(point))).toBe(true);
});

test('the caption follows the language and a language change notifies subscribers', () => {
    const graph = makeGraph();
    expect(caption(graph)).toEqual(['f(x) = x²', 'naklon sekante 2, tangente 1']);
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(caption(graph)).toEqual(['f(x) = x²', 'secant slope 2, tangent slope 1']);
    unsubscribe();
});

test('the legend names the curves and the matching markers in words, not by colour alone', () => {
    const graph = makeGraph();
    const items = graph.renderLegend().props.items as { id: string; label: string; color: string }[];
    expect(items.map(item => item.id)).toEqual(['function', 'secant', 'tangent', 'matches']);
    expect(items.map(item => item.label)).toEqual([
        'Graf funkcije f', 'Sekanta skozi (a, f(a)) in (b, f(b))', 'Tangenta v točki c',
        'Ujemajoče točke (obroči) in njihove tangente',
    ]);
    expect(new Set(items.slice(0, 3).map(item => item.color)).size).toBe(3);
    setLanguage('en');
    expect(graph.renderLegend().props.items.map((item: any) => item.label)[2]).toBe('Tangent at the point c');
});
