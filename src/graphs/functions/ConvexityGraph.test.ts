import {ConvexityGraph} from './ConvexityGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {
    chordLineOf, CONVEXITY_EXAMPLE_IDS, CONVEXITY_EXAMPLES, CONVEXITY_X_MAX, CONVEXITY_X_MIN, convexityExample, secondDerivativePieces, tangentLineAt,
} from '../../analysis/convexity';
import {CONVEXITY_EXAMPLE_MODELS} from '../../analysis/convexityModel';
import {currentLanguage, onLanguageChange, setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';

const BOX = [-6.5, 4.2, 6.5, -3.2];

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
    const graph = new ConvexityGraph() as any;
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
const parameter = (name: 'convexity-a' | 'convexity-b' | 'convexity-t', value: number): LessonAction => ({kind: 'function-parameter', name, value});
const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'convexity-example', value});
const reveal = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'second-derivative', visible});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const boardObjectCount = (graph: any) => graph.board.objectsList.length;

// Creation order: the three drop lines and the chord (segments), the function and the tangent (function graphs), the value points of
// a, b and t, the inflection ring, the draggable a, b and t; the inflection label, the two sign pieces, the zero mark and the one caption text.
const segments = (graph: any) => ofType(graph, 'segment');
const [CHORD] = [3];
const functionGraphs = (graph: any) => ofType(graph, 'functiongraph');
const valuePoints = (graph: any) => ofType(graph, 'point').slice(0, 3);
const inflectionRing = (graph: any) => ofType(graph, 'point')[3];
const axisPoints = (graph: any) => ofType(graph, 'point').slice(4);
const inflectionLabel = (graph: any) => ofType(graph, 'text')[0];
const signTexts = (graph: any) => ofType(graph, 'text').slice(1, 3);
const zeroMark = (graph: any) => ofType(graph, 'text')[3];
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
    const found = collect([graph.renderControls(), graph.renderReveals()]);
    const [inputA, inputB, inputT] = found.NumberInput;
    const button = (action: string) => found.button.find((element: any) => element.props['data-action'] === action);
    return {found, inputA, inputB, inputT, toggle: button('toggle-second-derivative')};
};
const rows = (graph: any): Record<string, string> =>
    Object.fromEntries((graph.renderReadout().props.children[0].props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));
const rowLabels = (graph: any): Record<string, string> =>
    Object.fromEntries((graph.renderReadout().props.children[0].props.rows as { id: string; label: string }[]).map(row => [row.id, row.label]));
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

beforeEach(() => setLanguage('sl'));

test('initialization draws x^2 on [-1, 1.5] with chord, tangent, a, b, t and one caption text; the second derivative is hidden', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({example: 'square', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false});
    expect(graph.presets()).toBe('convexity');
    expect(segments(graph)).toHaveLength(4);
    expect(functionGraphs(graph)).toHaveLength(2);
    expect(ofType(graph, 'point')).toHaveLength(7);
    expect(ofType(graph, 'text')).toHaveLength(5);
    expect(boardObjectCount(graph)).toBe(18);
    expect(graph.generatedObjectCount).toBe(18);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    expect(functionGraphs(graph)[0].parents[0](1.5)).toBe(2.25);
    expect(axisPoints(graph).map((point: any) => [point.x, point.y])).toEqual([[-1, 0], [1.5, 0], [0.5, 0]]);
    expect(valuePoints(graph).map(at)).toEqual([[-1, 1], [1.5, 2.25], [0.5, 0.25]]);
    expect(caption(graph)).toEqual([
        'f(x) = x²', 'a = −1, b = 1,5, t = 0,5', 'sklep: skrit', 'polna črta: tetiva; črtkana črta: tangenta',
    ]);
});

test('the chord is a solid segment over [a, b] and the tangent a dashed line at t, distinguishable by pattern and colour', () => {
    const graph = makeGraph();
    const chord = segments(graph)[CHORD];
    const tangent = functionGraphs(graph)[1];
    expect([chord.parents[0][0](), chord.parents[0][1](), chord.parents[1][0](), chord.parents[1][1]()]).toEqual([-1, 1, 1.5, 2.25]);
    // y = 0.5x + 1.5 through both endpoints; the tangent at 0.5 is y = x - 0.25
    expect(chord.parents[0][1]()).toBe(0.5 * -1 + 1.5);
    expect(chord.parents[1][1]()).toBe(0.5 * 1.5 + 1.5);
    expect([tangent.parents[0](0), tangent.parents[0](2)]).toEqual([-0.25, 1.75]);
    expect(chord.attributes.dash).toBe(0);
    expect(tangent.attributes.dash).toBeGreaterThan(0);
    expect(chord.attributes.strokeColor).not.toBe(tangent.attributes.strokeColor);
    // a different example and t move both
    apply(graph, choice('cube'));
    apply(graph, parameter('convexity-t', 1));
    expect([tangent.parents[0](0), tangent.parents[0](1)]).toEqual([-2, 1]); // y = 3x - 2
    expect([chord.parents[0][1](), chord.parents[1][1]()]).toEqual([-1, 3.375]);
});

test('before the reveal the readout, caption and statuses say hidden and give no verdict; the chord and tangent rows are always given', () => {
    const graph = makeGraph({asyncState: false});
    expect(rows(graph)).toEqual({
        a: '−1', b: '1,5', t: '0,5', chord: 'y = 0,5x + 1,5', tangent: 'y = x − 0,25',
        'second-derivative-sign': 'skrito', verdict: 'skrito', 'tangent-verdict': 'skrito', inflection: 'skrito',
    });
    expect(rowLabels(graph).verdict).toBe('Sklep za [a, b]');
    expect(statusIds(graph)).toEqual(['hidden']);
    expect(statusTexts(graph)[0]).not.toMatch(/\d/);
    expect(caption(graph)[2]).toBe('sklep: skrit');
    const text = [...caption(graph), ...Object.values(rows(graph)).filter(value => value !== 'skrito')].join(' ');
    expect(text).not.toMatch(/konveksna|konkavna|brez trditve/);
    expect(signTexts(graph).map(visible)).toEqual([false, false]);
    expect(visible(zeroMark(graph))).toBe(false);
    expect(visible(inflectionRing(graph))).toBe(false);
});

test('x^2 on [-1, 1.5] revealed: convex, graph on or below the chord and on or above the tangent, f\'\' >= 0, no inflection', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, reveal(true));
    expect(rows(graph)).toEqual({
        a: '−1', b: '1,5', t: '0,5', chord: 'y = 0,5x + 1,5', tangent: 'y = x − 0,25',
        'second-derivative-sign': "f″ ≥ 0 na [a, b]", verdict: 'konveksna na [a, b]: graf leži na tetivi ali pod njo',
        'tangent-verdict': 'graf leži na tangenti ali nad njo', inflection: 'ni',
    });
    expect(statusIds(graph)).toEqual(['revealed']);
    expect(caption(graph)).toEqual([
        'f(x) = x²', 'a = −1, b = 1,5, t = 0,5', 'konveksna na [a, b]', 'graf: na tetivi ali pod njo, na tangenti ali nad njo',
        'polna črta: tetiva; črtkana črta: tangenta', "zgoraj: predznak f″ (+ konveksna, − konkavna)",
    ]);
    expect(statusTexts(graph, 'en')[0]).toBe('The verdict follows from the sign of f″ on [a, b].');
});

test('-x^2 reverses both comparisons: concave, graph on or above the chord and on or below the tangent', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('negSquare'));
    apply(graph, reveal(true));
    expect(rows(graph)).toMatchObject({
        chord: 'y = −0,5x − 1,5', tangent: 'y = −x + 0,25', 'second-derivative-sign': "f″ ≤ 0 na [a, b]",
        verdict: 'konkavna na [a, b]: graf leži na tetivi ali nad njo', 'tangent-verdict': 'graf leži na tangenti ali pod njo', inflection: 'ni',
    });
    expect(caption(graph)[2]).toBe('konkavna na [a, b]');
    expect(caption(graph)[3]).toBe('graf: na tetivi ali nad njo, na tangenti ali pod njo');
});

test('a tangent point outside [a, b] withdraws the tangent claim and says why, while the chord claim stays', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, reveal(true));
    apply(graph, parameter('convexity-t', 1.8));
    expect(rows(graph)).toMatchObject({
        t: '1,8', tangent: 'y = 3,6x − 3,24', verdict: 'konveksna na [a, b]: graf leži na tetivi ali pod njo', 'tangent-verdict': 'brez trditve: t je zunaj [a, b]',
    });
    expect(statusIds(graph)).toEqual(['revealed', 'tangent-outside']);
    expect(caption(graph)[3]).toBe('graf: na tetivi ali pod njo; za tangento ni trditve (t zunaj [a, b])');
    expect(statusTexts(graph, 'en')[1]).toMatch(/lies outside \[a, b\]/);
    // the boundary itself belongs to [a, b]
    apply(graph, parameter('convexity-t', 1.5));
    expect(statusIds(graph)).toEqual(['revealed']);
    expect(rows(graph)['tangent-verdict']).toBe('graf leži na tangenti ali nad njo');
    // moving t back keeps the second derivative revealed
    apply(graph, parameter('convexity-t', -1));
    expect(graph.model.secondDerivativeVisible).toBe(true);
});

test('x^3: f\'\' = 6x changes sign at 0, so [-1, 1.5] gets no claim and names the inflection point; [0, 2] is convex and [-2, 0] concave', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('cube'));
    apply(graph, reveal(true));
    expect(graph.model).toEqual({example: 'cube', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: true});
    expect(rows(graph)).toMatchObject({
        chord: 'y = 1,75x + 0,75', 'second-derivative-sign': "f″ spremeni predznak na [a, b]", verdict: "brez trditve: f″ spremeni predznak na [a, b]",
        'tangent-verdict': "brez trditve: f″ spremeni predznak na [a, b]", inflection: 'pri x = 0',
    });
    expect(statusIds(graph)).toEqual(['revealed', 'no-claim']);
    expect(caption(graph)[2]).toBe("brez trditve: f″ spremeni predznak na [a, b]");
    expect(caption(graph)).toHaveLength(5); // no line about the position of the graph
    expect(graph.captionColors()[2]).not.toBe(graph.captionColors()[1]);
    expect(at(inflectionRing(graph))).toEqual([0, 0]);
    expect(visible(inflectionRing(graph))).toBe(true);
    expect(visible(inflectionLabel(graph))).toBe(true);
    expect(inflectionLabel(graph).parents[2]()).toContain('prevojna točka pri x = 0');

    apply(graph, parameter('convexity-a', 0));
    apply(graph, parameter('convexity-b', 2));
    expect(rows(graph)).toMatchObject({chord: 'y = 4x', tangent: 'y = 0,75x − 0,25', verdict: 'konveksna na [a, b]: graf leži na tetivi ali pod njo'});
    expect(statusIds(graph)).toEqual(['revealed']);
    apply(graph, parameter('convexity-a', -2));
    apply(graph, parameter('convexity-b', 0));
    expect(rows(graph)).toMatchObject({chord: 'y = 4x', verdict: 'konkavna na [a, b]: graf leži na tetivi ali nad njo'});
    apply(graph, parameter('convexity-t', -1));
    expect(rows(graph)['tangent-verdict']).toBe('graf leži na tangenti ali pod njo');
});

test('x^4 on [-1, 1]: convex, f\'\'(0) = 0 yet no inflection point, and the zero is marked without a sign change', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('quartic'));
    apply(graph, reveal(true));
    expect(graph.model).toEqual({example: 'quartic', a: -1, b: 1, t: 0.5, secondDerivativeVisible: true});
    expect(rows(graph)).toMatchObject({
        chord: 'y = 1', tangent: 'y = 0,5x − 0,1875', 'second-derivative-sign': "f″ ≥ 0 na [a, b]",
        verdict: 'konveksna na [a, b]: graf leži na tetivi ali pod njo', inflection: 'ni',
    });
    expect(statusIds(graph)).toEqual(['revealed', 'zero-without-change']);
    expect(statusTexts(graph, 'en')[1]).toBe("f″ equals 0 at x = 0 but keeps its sign, so this is not an inflection point.");
    expect(visible(inflectionRing(graph))).toBe(false);
    expect(visible(inflectionLabel(graph))).toBe(false);
    expect(signTexts(graph).map((text: any) => [visible(text), text.parents[2]()])).toEqual([[true, '+'], [true, '+']]);
    expect([visible(zeroMark(graph)), zeroMark(graph).parents[2](), zeroMark(graph).parents[0]()]).toEqual([true, '0', 0.14]);
});

test('the sign strip is a row of + and − marks per piece of the view (not colour only), centred on the piece, with a 0 where f\'\' vanishes', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, reveal(true));
    expect(signTexts(graph).map((text: any) => [visible(text), text.parents[2](), text.parents[0]()])).toEqual([[true, '+', -3.25], [false, '', 0]]);
    expect(visible(zeroMark(graph))).toBe(false);
    apply(graph, choice('negSquare'));
    apply(graph, reveal(true));
    expect(signTexts(graph).map((text: any) => text.parents[2]())).toEqual(['−', '']);
    apply(graph, choice('cube'));
    apply(graph, reveal(true));
    expect(signTexts(graph).map((text: any) => [visible(text), text.parents[2](), text.parents[0]()])).toEqual([[true, '−', -3.25], [true, '+', 3.25]]);
    expect([zeroMark(graph).parents[2](), zeroMark(graph).parents[0]()]).toEqual(['0', 0.14]);
    // the marks sit at the top of the view
    const y = signTexts(graph)[0].parents[1]();
    expect(y).toBeCloseTo(4.2 - 0.07 * 7.4, 12);
});

test('the board objects never exceed the fixed pool: slots for one inflection, two sign pieces and one zero hold every example and view', () => {
    for (const id of CONVEXITY_EXAMPLE_IDS) {
        const example = CONVEXITY_EXAMPLES[id];
        expect(example.inflectionPoints.length).toBeLessThanOrEqual(1);
        expect(example.secondDerivativeZeros.length).toBeLessThanOrEqual(1);
        for (const [left, right] of [[-2.6, 2.6], [-10, 10], [-0.5, 0.5], [0, 3], [-3, 0], [0.1, 5]]) {
            expect(secondDerivativePieces(example, left, right).length).toBeLessThanOrEqual(2);
        }
    }
});

test('setting the example, a, b, t and the reveal through the controls and through the lesson actions gives the same configuration', () => {
    const viaControl = makeGraph({asyncState: false});
    const viaLesson = makeGraph({asyncState: false});
    controls(viaControl).found.ChoiceSelect[0].props.onChange('cube');
    apply(viaLesson, choice('cube'));
    expect(viaControl.model).toEqual(viaLesson.model);
    expect(controls(viaControl).inputA.props.onChange(0)).toBe(true);
    apply(viaLesson, parameter('convexity-a', 0));
    expect(controls(viaControl).inputB.props.onChange(2)).toBe(true);
    apply(viaLesson, parameter('convexity-b', 2));
    expect(controls(viaControl).inputT.props.onChange(1.8)).toBe(true);
    apply(viaLesson, parameter('convexity-t', 1.8));
    controls(viaControl).toggle.props.onClick();
    apply(viaLesson, reveal(true));
    expect(viaControl.model).toEqual(viaLesson.model);
    expect(viaControl.model).toEqual({example: 'cube', a: 0, b: 2, t: 1.8, secondDerivativeVisible: true});
    expect(rows(viaControl)).toEqual(rows(viaLesson));
    expect(caption(viaControl)).toEqual(caption(viaLesson));
    expect(axisPoints(viaControl).map((point: any) => point.x)).toEqual(axisPoints(viaLesson).map((point: any) => point.x));
    controls(viaControl).toggle.props.onClick();
    apply(viaLesson, reveal(false));
    expect(viaControl.model).toEqual(viaLesson.model);
    expect(viaControl.model.secondDerivativeVisible).toBe(false);
});

test('invalid values are rejected, never clamped: every setter throws DomainError and leaves the model unchanged', () => {
    const graph = makeGraph({asyncState: false});
    const before = {...graph.model};
    for (const a of [1.5, 1.6, 3, -2.5, -3, NaN, Infinity]) expect(() => apply(graph, parameter('convexity-a', a)), `a = ${a}`).toThrow(DomainError);
    for (const b of [-1, -1.5, 2.5, 3, -3, NaN, -Infinity]) expect(() => apply(graph, parameter('convexity-b', b)), `b = ${b}`).toThrow(DomainError);
    for (const t of [2.01, -2.01, 5, NaN, Infinity, -Infinity]) expect(() => apply(graph, parameter('convexity-t', t)), `t = ${t}`).toThrow(DomainError);
    for (const value of ['sine', 'abs', '', 'Square']) expect(() => apply(graph, choice(value))).toThrow(DomainError);
    expect(graph.model).toEqual(before);
    // the boundary values themselves are accepted, and t is independent of a and b
    apply(graph, parameter('convexity-b', CONVEXITY_X_MAX));
    apply(graph, parameter('convexity-a', CONVEXITY_X_MIN));
    apply(graph, parameter('convexity-t', CONVEXITY_X_MAX));
    apply(graph, parameter('convexity-a', 1));
    expect(graph.model).toMatchObject({a: 1, b: CONVEXITY_X_MAX, t: CONVEXITY_X_MAX});
    apply(graph, parameter('convexity-t', CONVEXITY_X_MIN));
    expect(graph.model).toMatchObject({a: 1, t: CONVEXITY_X_MIN});
});

test('the number fields carry their ranges, report rejection with a hint and show the rule', () => {
    const graph = makeGraph({asyncState: false});
    const {inputA, inputB, inputT} = controls(graph);
    expect([inputA, inputB, inputT].map((input: any) => [input.props.label, input.props.min, input.props.max, input.props.value])).toEqual([
        ['Levo krajišče a', -2, 2, -1], ['Desno krajišče b', -2, 2, 1.5], ['Točka dotika tangente t', -2, 2, 0.5],
    ]);
    expect(inputA.props.onChange(1.5)).toBe(false); // a = b
    expect(inputA.props.onChange(2)).toBe(false);
    expect(inputA.props.onChange(-3)).toBe(false);
    expect(inputB.props.onChange(-1)).toBe(false);
    expect(inputT.props.onChange(3)).toBe(false);
    expect(inputT.props.onChange(-2.5)).toBe(false);
    expect(graph.model).toMatchObject({a: -1, b: 1.5, t: 0.5});
    expect(inputA.props.rejectedHint).toMatch(/a < b/);
    expect(inputB.props.rejectedHint).toMatch(/a < b/);
    expect(inputT.props.rejectedHint).toBe('Točka t mora biti število med −2 in 2.');
    expect(collect([graph.renderControls(), graph.renderReveals()]).p.some((element: any) => /a < b/.test(String(element.props.children)))).toBe(true);
    setLanguage('en');
    expect(controls(graph).inputA.props.label).toBe('Left endpoint a');
    expect(controls(graph).inputB.props.label).toBe('Right endpoint b');
    expect(controls(graph).inputT.props.label).toBe('Tangent point t');
    expect(controls(graph).inputT.props.rejectedHint).toBe('The point t must be a number between −2 and 2.');
});

test('the toggle names its state in words, editing a, b and t keeps the reveal and choosing an example hides it', () => {
    const graph = makeGraph({asyncState: false});
    expect(controls(graph).toggle.props.children).toBe('Pokaži drugi odvod');
    expect(controls(graph).toggle.props['data-revealed']).toBe(false);
    controls(graph).toggle.props.onClick();
    expect(controls(graph).toggle.props.children).toBe('Skrij drugi odvod');
    expect(controls(graph).toggle.props['data-revealed']).toBe(true);
    expect(controls(graph).toggle.props.type).toBe('button');
    apply(graph, parameter('convexity-b', 1));
    apply(graph, parameter('convexity-a', -2));
    apply(graph, parameter('convexity-t', 1.9));
    expect(graph.model).toEqual({example: 'square', a: -2, b: 1, t: 1.9, secondDerivativeVisible: true});
    controls(graph).found.ChoiceSelect[0].props.onChange('quartic');
    expect(graph.model).toEqual({...CONVEXITY_EXAMPLE_MODELS.quartic, secondDerivativeVisible: false});
    expect(controls(graph).found.ChoiceSelect[0].props.options.map((option: any) => option.text)).toEqual(['f(x) = x²', 'f(x) = −x²', 'f(x) = x³', 'f(x) = x⁴']);
    setLanguage('en');
    expect(controls(graph).toggle.props.children).toBe('Show second derivative');
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [choice('cube'), parameter('convexity-a', 0), parameter('convexity-b', 2), parameter('convexity-t', 1.8), reveal(true)]) apply(graph, action);
    expect(graph.model).toEqual({example: 'cube', a: 0, b: 2, t: 1.8, secondDerivativeVisible: true});
    expect(graph.state).toMatchObject({example: 'square', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false});
    // a later action in the same tick sees the earlier one, including an endpoint that depends on the other endpoint
    apply(graph, parameter('convexity-b', 1));
    apply(graph, parameter('convexity-a', 0.5));
    expect(() => apply(graph, parameter('convexity-a', 1))).toThrow(DomainError);
    expect(graph.model).toEqual({example: 'cube', a: 0.5, b: 1, t: 1.8, secondDerivativeVisible: true});
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('convexity')!;
    expect(lesson.id).toBe('convexity-guided');
    expect(lesson.steps).toHaveLength(7);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph({asyncState: false});
        // a deliberately different user state that the default scene must reset
        apply(graph, choice('cube'));
        apply(graph, parameter('convexity-a', 1));
        apply(graph, parameter('convexity-t', 2));
        apply(graph, reveal(true));
        for (const action of step.scene!.actions) apply(graph, action);
        return [graph.model, statusIds(graph)];
    });
    expect(finals).toEqual([
        [{example: 'square', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false}, ['hidden']],
        [{example: 'square', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: true}, ['revealed']],
        [{example: 'square', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: true}, ['revealed']],
        [{example: 'negSquare', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false}, ['hidden']],
        [{example: 'cube', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false}, ['hidden']],
        [{example: 'quartic', a: -1, b: 1, t: 0.5, secondDerivativeVisible: false}, ['hidden']],
        [{example: 'quartic', a: -1, b: 1, t: 0.5, secondDerivativeVisible: true}, ['revealed', 'zero-without-change']],
    ]);
    // the numbers the lesson prose states
    const graph = makeGraph({asyncState: false});
    for (const action of lesson.steps[1].scene!.actions) apply(graph, action);
    expect(rows(graph)).toMatchObject({chord: 'y = 0,5x + 1,5', tangent: 'y = x − 0,25'});
});

test('the displayed lines are the exact chord and tangent for every example (independent identities f - line)', () => {
    const graph = makeGraph({asyncState: false});
    const identities: [string, number, number, number, (x: number) => number][] = [
        ['square', -1, 1.5, 0.5, x => (x + 1) * (x - 1.5)],
        ['negSquare', -1, 1.5, 0.5, x => -(x + 1) * (x - 1.5)],
        ['cube', -1, 1.5, 0.5, x => (x + 1) * (x + 0.5) * (x - 1.5)],
        ['quartic', -1, 1, 0.5, x => (x * x - 1) * (x * x + 1)],
    ];
    for (const [id, a, b, t, difference] of identities) {
        apply(graph, choice(id));
        apply(graph, parameter('convexity-a', a));
        apply(graph, parameter('convexity-b', b));
        apply(graph, parameter('convexity-t', t));
        const chord = segments(graph)[CHORD];
        const example = convexityExample(id as any);
        const line = chordLineOf(example, a, b);
        for (let i = 0; i <= 20; i++) {
            const x = a + ((b - a) * i) / 20;
            expect(example.value(x) - (line.slope * x + line.intercept)).toBeCloseTo(difference(x), 10);
        }
        expect([chord.parents[0][1](), chord.parents[1][1]()]).toEqual([example.value(a), example.value(b)]);
        const tangent = tangentLineAt(example, t);
        expect(functionGraphs(graph)[1].parents[0](1)).toBeCloseTo(tangent.slope + tangent.intercept, 12);
    }
});

test('dragging a, b and t on the axis projects onto the grid and the range the model allows, writing the model once', () => {
    const graph = makeGraph();
    const [a, b, t] = axisPoints(graph);
    for (const point of [a, b, t]) point.moveTo.mockClear();

    b.x = 1.2349; // off the 0.01 grid
    b.handlers.drag();
    expect(graph.model.b).toBe(1.23);
    expect(b.moveTo).toHaveBeenCalledTimes(1);
    expect([b.x, b.y]).toEqual([1.23, 0]);

    b.x = -9; // below a: clamped just right of it
    b.handlers.drag();
    expect(graph.model.b).toBe(-0.99);
    b.x = 9;
    b.handlers.drag();
    expect(graph.model.b).toBe(CONVEXITY_X_MAX);

    a.x = 9; // beyond b: clamped just left of it
    a.handlers.drag();
    expect(graph.model.a).toBe(1.99);
    a.x = -9;
    a.handlers.drag();
    expect(graph.model.a).toBe(CONVEXITY_X_MIN);

    // t is independent: it moves over the whole range, also past a and b
    t.x = 9;
    t.handlers.drag();
    expect(graph.model.t).toBe(CONVEXITY_X_MAX);
    t.x = -9;
    t.handlers.drag();
    expect(graph.model.t).toBe(CONVEXITY_X_MIN);
    t.x = 0.3351;
    t.handlers.drag();
    expect(graph.model.t).toBe(0.34);
    expect(graph.model.secondDerivativeVisible).toBe(false);
    // a drag already shows the new model: the scene sync does not move the dragged point a second time
    expect(a.moveTo).toHaveBeenCalledTimes(2);
    expect(t.moveTo).toHaveBeenCalledTimes(3);
});

test('a drag next to the other endpoint is clamped to one grid step short of it and never leaves a point on a rejected position', () => {
    const graph = makeGraph();
    graph.importPresetData({example: 'square', a: 0.499, b: 0.5, t: 0.5, secondDerivativeVisible: false});
    const [a, b] = axisPoints(graph);
    b.moveTo.mockClear();
    b.x = 0.4;
    expect(() => b.handlers.drag()).not.toThrow();
    expect(graph.model.b).toBe(0.509);
    a.x = 0.7;
    expect(() => a.handlers.drag()).not.toThrow();
    expect(graph.model.a).toBe(0.499);
    expect(a.x).toBe(0.499);
});

test('names, kinds and choices the graph does not own are unsupported', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'k', 'n', 'a', 'b', 'extrema-a', 'darboux-a', 'mvt-c', 'accum-x']) {
        expect(() => apply(graph, {kind: 'function-parameter', name, value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    for (const target of ['tangent', 'matching-points', 'lower-sum', 'upper-sum', 'extrema-classification']) {
        expect(() => apply(graph, {kind: 'function-visibility', target, visible: true} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'function-choice', name: 'extrema-example', value: 'sine'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'bisection', command: 'next-step'})).toThrow(UnsupportedLessonActionError);
    for (const supported of [parameter('convexity-a', 0), parameter('convexity-b', 1), parameter('convexity-t', 1), choice('cube'), reveal(true)]) {
        expect(graph.supportsLessonAction(supported)).toBe(true);
    }
    expect(graph.supportsLessonAction({kind: 'function-parameter', name: 'extrema-a', value: 1})).toBe(false);
    expect(graph.model).toEqual({example: 'square', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false});
});

test('presets save the model with the reveal flag and reopen the same scene', () => {
    const graph = makeGraph();
    apply(graph, choice('cube'));
    apply(graph, parameter('convexity-a', 0));
    apply(graph, parameter('convexity-b', 2));
    apply(graph, parameter('convexity-t', 1.8));
    apply(graph, reveal(true));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('convexity');
    expect(exported.data).toEqual({example: 'cube', a: 0, b: 2, t: 1.8, secondDerivativeVisible: true});

    const reopened = makeGraph({asyncState: false});
    reopened.importPreset({id: 'convexity', boardState: {boundingBox: [-1, 2, 7, -2]}, data: exported.data});
    expect(reopened.model).toEqual(exported.data);
    expect(rows(reopened)).toMatchObject({chord: 'y = 4x', verdict: 'konveksna na [a, b]: graf leži na tetivi ali pod njo', 'tangent-verdict': 'graf leži na tangenti ali nad njo'});
    expect(axisPoints(reopened).map((point: any) => point.x)).toEqual([0, 2, 1.8]);
    expect(reopened.exportPreset().data).toEqual(exported.data);
    // a string and extra properties are sanitized
    reopened.importPresetData(JSON.stringify({example: 'quartic', a: -2, b: 1, t: 2, secondDerivativeVisible: false, extra: true}));
    expect(reopened.model).toEqual({example: 'quartic', a: -2, b: 1, t: 2, secondDerivativeVisible: false});
});

test('a preset of another example without a view of its own shows that example\'s view', () => {
    const graph = makeGraph({asyncState: false});
    graph.board.setBoundingBox.mockClear();
    graph.importPreset({id: 'convexity', data: {example: 'cube', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false}});
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-6.5, 4.2, 6.5, -3.2], true);
    apply(graph, choice('negSquare'));
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-6.5, 2.3, 6.5, -7.8], true);
    apply(graph, choice('quartic'));
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-6.5, 4.2, 6.5, -3.2], true);
});

test('malformed or misordered preset data is rejected to the default model with a warning', () => {
    const graph = makeGraph();
    apply(graph, parameter('convexity-a', 1));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const valid = {example: 'square', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false};
    const bad = [undefined, null, 'not json', {}, [], {...valid, example: 'sine'}, {...valid, a: 1.5, b: -1}, {...valid, a: 1, b: 1}, {...valid, a: -2.5}, {...valid, b: 2.5},
        {...valid, t: 2.5}, {...valid, t: '0'}, {...valid, a: '0'}, {...valid, secondDerivativeVisible: 'yes'}, {...valid, secondDerivativeVisible: 1},
        {example: 'square', a: -1, b: 1.5, t: 0.5}];
    for (const entry of bad) {
        graph.importPresetData(entry);
        expect(graph.model).toEqual(valid);
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
});

test('capture and restore bring back the synchronous model, including the reveal flag', () => {
    const graph = makeGraph();
    apply(graph, choice('cube'));
    apply(graph, parameter('convexity-b', 0.5));
    apply(graph, parameter('convexity-t', 1.8));
    apply(graph, reveal(true));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({example: 'cube', a: -1, b: 0.5, t: 1.8, secondDerivativeVisible: true});
    apply(graph, defaultScene);
    expect(graph.model).toEqual({example: 'square', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false});
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({example: 'cube', a: -1, b: 0.5, t: 1.8, secondDerivativeVisible: true});
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
});

test('no readout, caption, label or status ever shows NaN, Infinity or a raw undefined, in either language, for any example and reveal', () => {
    const graph = makeGraph({asyncState: false});
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        for (const id of CONVEXITY_EXAMPLE_IDS) {
            apply(graph, choice(id));
            for (const t of [-2, 0, 0.5, 2]) {
                apply(graph, parameter('convexity-t', t));
                for (const visibleNow of [false, true]) {
                    apply(graph, reveal(visibleNow));
                    const text = [...caption(graph), ...Object.values(rows(graph)), ...statusTexts(graph, language), inflectionLabel(graph).parents[2]()].join(' | ');
                    expect(text).not.toMatch(/NaN|Infinity|undefined|-0\b/);
                }
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
    expect(() => apply(graph, reveal(true))).not.toThrow();
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
    // the object count does not depend on the example or on the verdict
    for (let i = 0; i < 5; i++) {
        apply(graph, choice('cube'));
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
    expect(caption(graph)[1]).toBe('a = −1, b = 1,5, t = 0,5');
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(caption(graph)[1]).toBe('a = −1, b = 1.5, t = 0.5');
    expect(caption(graph)[2]).toBe('verdict: hidden');
    expect(caption(graph)[3]).toBe('solid line: chord; dashed line: tangent');
    apply(graph, reveal(true));
    expect(caption(graph)[2]).toBe('convex on [a, b]');
    expect(caption(graph)[3]).toBe('graph: on or below the chord, on or above the tangent');
    expect(rows(graph).verdict).toBe('convex on [a, b]: the graph lies on or below the chord');
    expect(rows(graph).chord).toBe('y = 0.5x + 1.5');
    unsubscribe();
});

test('the legend names the function, the chord, the tangent and the inflection ring in words, with the line patterns', () => {
    const graph = makeGraph();
    const items = graph.renderLegend().props.items as { id: string; label: string; kind: string }[];
    expect(items.map(item => item.id)).toEqual(['function', 'chord', 'tangent', 'inflection']);
    expect(items[1].label).toMatch(/polna črta/);
    expect(items[2].label).toMatch(/črtkana črta/);
    expect(items[1].kind).toBe('line');
    expect(items[2].kind).toBe('dashed-line');
    expect(items[3].kind).toBe('ring');
    setLanguage('en');
    expect(graph.renderLegend().props.items.map((item: any) => item.label)).toEqual([
        'Graph of the function f', 'Chord between the graph points above a and b: solid line', 'Tangent at t: dashed line',
        'Inflection point: open ring (after the second derivative is shown)',
    ]);
});

test('the example views are the ones the examples need, with the default example first', () => {
    const graph = makeGraph();
    expect(graph.defaultBoundingBox()).toEqual(BOX);
    expect(CONVEXITY_X_MIN).toBe(-2);
});
