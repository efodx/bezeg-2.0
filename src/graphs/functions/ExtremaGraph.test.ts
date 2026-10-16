import {ExtremaGraph} from './ExtremaGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {analyzeExtrema, EXTREMA_EXAMPLE_IDS, EXTREMA_X_MAX, EXTREMA_X_MIN, extremaExample} from '../../analysis/extrema';
import {EXTREMA_EXAMPLE_MODELS} from '../../analysis/extremaModel';
import {currentLanguage, onLanguageChange, setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';

const BOX = [-6, 4.6, 6, -5.6];

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
    const graph = new ExtremaGraph() as any;
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
const parameter = (name: 'extrema-a' | 'extrema-b', value: number): LessonAction => ({kind: 'function-parameter', name, value});
const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'extrema-example', value});
const reveal = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'extrema-classification', visible});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const boardObjectCount = (graph: any) => graph.board.objectsList.length;

// Creation order: the dividers and the global lines, the function graph, the sign texts, the marker point and label of every slot
// (endpoint 0 and 1, stationary 0 and 1, corner 0), the draggable a and b, the one caption text.
const lines = (graph: any) => ofType(graph, 'line');
const DIVIDERS = [0, 1, 2, 3, 4];
const [GLOBAL_MINIMUM, GLOBAL_MAXIMUM] = [5, 6];
const markerPoints = (graph: any) => ofType(graph, 'point').slice(0, 5);
const axisPoints = (graph: any) => ofType(graph, 'point').slice(5);
const signTexts = (graph: any) => ofType(graph, 'text').slice(0, 4);
const markerTexts = (graph: any) => ofType(graph, 'text').slice(4, 9);
const [ENDPOINT_0, ENDPOINT_1, STATIONARY_0, STATIONARY_1, CORNER_0] = [0, 1, 2, 3, 4];
const caption = (graph: any) => graph.captionPlainLines();
/** The text lines a board label shows now (the label's HTML is a stack of divs). */
const labelLines = (text: any): string[] => String(text.parents[2]()).split('</div><div>').map(part => part.replace(/<[^>]*>/g, ''));
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
    const [inputA, inputB] = found.NumberInput;
    const button = (action: string) => found.button.find((element: any) => element.props['data-action'] === action);
    return {found, inputA, inputB, toggle: button('toggle-classification')};
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

test('initialization draws x^2 on [-1, 2] with candidates, signs, a and b, and one caption text; the classification is hidden', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({example: 'square', a: -1, b: 2, revealed: false});
    expect(graph.presets()).toBe('extrema');
    expect(lines(graph)).toHaveLength(7);
    expect(ofType(graph, 'functiongraph')).toHaveLength(1);
    expect(ofType(graph, 'point')).toHaveLength(7);
    expect(ofType(graph, 'text')).toHaveLength(10);
    expect(boardObjectCount(graph)).toBe(25);
    expect(graph.generatedObjectCount).toBe(25);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    expect(ofType(graph, 'functiongraph')[0].parents[0](1.5)).toBe(2.25);
    expect(axisPoints(graph).map((point: any) => [point.x, point.y])).toEqual([[-1, 0], [2, 0]]);
    expect(caption(graph)).toEqual([
        'f(x) = x²', 'a = −1, b = 2', 'klasifikacija: skrita', 'kvadrat: krajišče; romb: stacionarna točka; trikotnik: ostri vogal',
        "zgoraj: predznak f′ na delu (+ narašča, − pada)",
    ]);
});

test('the candidates are marked by kind-specific shapes at (x, f(x)); unused slots are hidden', () => {
    const graph = makeGraph();
    const points = markerPoints(graph);
    expect(points.map((point: any) => point.attributes.face)).toEqual(['[]', '[]', '<>', '<>', '^']);
    expect(new Set(points.map((point: any) => point.attributes.face)).size).toBe(3);
    expect(points.map((point: any) => visible(point))).toEqual([true, true, true, false, false]);
    expect([at(points[ENDPOINT_0]), at(points[ENDPOINT_1]), at(points[STATIONARY_0])]).toEqual([[-1, 1], [2, 4], [0, 0]]);
    // the corner of |x| uses the corner slot, with its own shape
    apply(graph, choice('abs'));
    expect(markerPoints(graph).map((point: any) => visible(point))).toEqual([true, true, false, false, true]);
    expect(at(markerPoints(graph)[CORNER_0])).toEqual([0, 0]);
    expect(labelLines(markerTexts(graph)[CORNER_0])).toEqual(['f(0) = 0', "f′ ne obstaja"]);
});

test('before the reveal the labels give value and kind only; after it they add the local and global classification (ties are all global)', () => {
    const graph = makeGraph({asyncState: false});
    const texts = markerTexts(graph);
    expect(labelLines(texts[ENDPOINT_0])).toEqual(['f(−1) = 1', 'krajišče']);
    expect(labelLines(texts[STATIONARY_0])).toEqual(['f(0) = 0', "f′ = 0"]);
    expect(labelLines(texts[ENDPOINT_1])).toEqual(['f(2) = 4', 'krajišče']);
    expect(lines(graph).slice(5).map((line: any) => visible(line))).toEqual([false, false]);
    apply(graph, reveal(true));
    expect(labelLines(texts[ENDPOINT_0])).toEqual(['f(−1) = 1', 'krajišče', 'lokalni maksimum']);
    expect(labelLines(texts[STATIONARY_0])).toEqual(['f(0) = 0', "f′ = 0", 'lokalni minimum, globalni minimum']);
    expect(labelLines(texts[ENDPOINT_1])).toEqual(['f(2) = 4', 'krajišče', 'lokalni maksimum, globalni maksimum']);
    expect(lines(graph).slice(5).map((line: any) => visible(line))).toEqual([true, true]);
    expect([lines(graph)[GLOBAL_MINIMUM].parents[0][1](), lines(graph)[GLOBAL_MAXIMUM].parents[0][1]()]).toEqual([0, 4]);
    expect(caption(graph)[2]).toBe('globalni min 0 pri x = 0; globalni maks 4 pri x = 2');
    // a tie: both endpoints of |x| are global maxima
    apply(graph, choice('abs'));
    apply(graph, reveal(true));
    expect(labelLines(markerTexts(graph)[ENDPOINT_0])).toEqual(['f(−1) = 1', 'krajišče', 'lokalni maksimum, globalni maksimum']);
    expect(labelLines(markerTexts(graph)[ENDPOINT_1])).toEqual(['f(1) = 1', 'krajišče', 'lokalni maksimum, globalni maksimum']);
    expect(labelLines(markerTexts(graph)[CORNER_0])).toEqual(['f(0) = 0', "f′ ne obstaja", 'lokalni minimum, globalni minimum']);
    expect(caption(graph)[2]).toBe('globalni min 0 pri x = 0; globalni maks 1 pri x = −1; 1');
    expect(statusIds(graph)).toEqual(['revealed', 'corner', 'tie']);
});

test('the derivative sign of every piece is a + or − mark on the board, not colour only, and the dividers follow the candidates', () => {
    const graph = makeGraph();
    expect(signTexts(graph).map((text: any) => [visible(text), text.parents[2]()])).toEqual([[true, '−'], [true, '+'], [false, ''], [false, '']]);
    expect(signTexts(graph).slice(0, 2).map((text: any) => text.parents[0]())).toEqual([-0.5, 1]);
    expect(DIVIDERS.map(index => visible(lines(graph)[index]))).toEqual([true, true, true, false, false]);
    expect(lines(graph).slice(0, 3).map((line: any) => line.parents[0][0]())).toEqual([-1, 0, 2]);
    apply(graph, choice('sine'));
    expect(signTexts(graph).map((text: any) => text.parents[2]())).toEqual(['−', '+', '−', '']);
    expect(DIVIDERS.map(index => visible(lines(graph)[index]))).toEqual([true, true, true, true, false]);
});

test('the readout lists a, b, every candidate with value, derivative and (once revealed) classification, every piece, and the global values', () => {
    const graph = makeGraph({asyncState: false});
    expect(rows(graph)).toEqual({
        a: '−1', b: '2',
        'candidate-0': "f = 1, f′ = −2", 'candidate-1': "f = 0, f′ = 0", 'candidate-2': "f = 4, f′ = 4",
        'piece-0': "− (f′ < 0: f pada)", 'piece-1': "+ (f′ > 0: f narašča)",
        'global-minimum': 'skrito', 'global-maximum': 'skrito',
    });
    expect(rowLabels(graph)['candidate-0']).toBe('Kandidat: krajišče, x = −1');
    expect(rowLabels(graph)['candidate-1']).toBe('Kandidat: stacionarna točka, x = 0');
    expect(rowLabels(graph)['piece-0']).toBe('Del med −1 in 0');
    expect(statusIds(graph)).toEqual(['hidden']);
    apply(graph, reveal(true));
    expect(rows(graph)).toMatchObject({
        'candidate-0': "f = 1, f′ = −2; lokalni maksimum", 'candidate-1': "f = 0, f′ = 0; lokalni minimum, globalni minimum",
        'candidate-2': "f = 4, f′ = 4; lokalni maksimum, globalni maksimum", 'global-minimum': '0 pri x = 0', 'global-maximum': '4 pri x = 2',
    });
    expect(statusIds(graph)).toEqual(['revealed']);
    expect(statusTexts(graph)[0]).not.toMatch(/\d/);
    expect(statusTexts(graph, 'en')[0]).toBe('The classification is relative to the interval [a, b]; at an endpoint only one side is compared.');
});

test('x^3 on [-1, 1]: 0 is stationary and neither a local minimum nor maximum', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('cube'));
    apply(graph, reveal(true));
    expect(graph.model).toEqual({example: 'cube', a: -1, b: 1, revealed: true});
    expect(labelLines(markerTexts(graph)[STATIONARY_0])).toEqual(['f(0) = 0', "f′ = 0", 'ni lokalni ekstrem']);
    expect(rows(graph)).toMatchObject({
        'candidate-0': "f = −1, f′ = 3; lokalni minimum, globalni minimum", 'candidate-1': "f = 0, f′ = 0; ni lokalni ekstrem",
        'candidate-2': "f = 1, f′ = 3; lokalni maksimum, globalni maksimum",
    });
});

test('|x| on [-1, 1]: 0 is a corner where f\' does not exist and the global minimum', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('abs'));
    expect(rows(graph)).toMatchObject({'candidate-1': 'f = 0, f′ = ne obstaja', 'global-minimum': 'skrito'});
    expect(rowLabels(graph)['candidate-1']).toBe('Kandidat: ostri vogal, x = 0');
    expect(statusIds(graph)).toEqual(['hidden', 'corner']);
    apply(graph, reveal(true));
    expect(rows(graph)).toMatchObject({'candidate-1': 'f = 0, f′ = ne obstaja; lokalni minimum, globalni minimum', 'global-minimum': '0 pri x = 0', 'global-maximum': '1 pri x = −1; 1'});
});

test('sin x on [-4, 4]: stationary points at +-pi/2, global values 1 and -1, and the endpoint values take part in the comparison', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('sine'));
    apply(graph, reveal(true));
    expect(graph.model).toEqual({example: 'sine', a: -4, b: 4, revealed: true});
    expect(rows(graph)).toMatchObject({
        'candidate-0': "f = 0,7568, f′ = −0,6536; lokalni maksimum", 'candidate-1': "f = −1, f′ = 0; lokalni minimum, globalni minimum",
        'candidate-2': "f = 1, f′ = 0; lokalni maksimum, globalni maksimum", 'candidate-3': "f = −0,7568, f′ = −0,6536; lokalni minimum",
        'global-minimum': '−1 pri x = −1,5708', 'global-maximum': '1 pri x = 1,5708',
    });
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-7, 3.4, 7, -5], true);
});

test('sin x on [0, pi]: both endpoints tie as global minima with value 0 and the interior pi/2 is the global maximum', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('sine'));
    apply(graph, parameter('extrema-a', 0));
    apply(graph, parameter('extrema-b', Math.PI));
    apply(graph, reveal(true));
    expect(rows(graph)).toMatchObject({
        'candidate-0': "f = 0, f′ = 1; lokalni minimum, globalni minimum", 'candidate-1': "f = 1, f′ = 0; lokalni maksimum, globalni maksimum",
        'candidate-2': "f = 0, f′ = −1; lokalni minimum, globalni minimum", 'global-minimum': '0 pri x = 0; 3,1416', 'global-maximum': '1 pri x = 1,5708',
    });
    expect(statusIds(graph)).toEqual(['revealed', 'tie']);
    expect(statusTexts(graph, 'en')[1]).toBe('Several candidates attain the same extreme value: all of them are global extrema.');
});

test('an endpoint that is also stationary stays one endpoint candidate', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, parameter('extrema-a', 0));
    expect(rows(graph)).toMatchObject({'candidate-0': "f = 0, f′ = 0"});
    expect(rowLabels(graph)['candidate-0']).toBe('Kandidat: krajišče, x = 0');
    expect(Object.keys(rows(graph)).filter(id => id.startsWith('candidate-'))).toEqual(['candidate-0', 'candidate-1']);
    expect(labelLines(markerTexts(graph)[ENDPOINT_0])).toEqual(['f(0) = 0', "krajišče, f′ = 0"]);
    expect(visible(markerPoints(graph)[STATIONARY_0])).toBe(false);
});

test('the marker slots hold the candidates of every example and every interval in the allowed range', () => {
    let largest = 0;
    for (const id of EXTREMA_EXAMPLE_IDS) {
        const example = extremaExample(id);
        for (let a = EXTREMA_X_MIN; a < EXTREMA_X_MAX; a += 0.25) {
            for (let b = a + 0.25; b <= EXTREMA_X_MAX; b += 0.25) {
                const { candidates, pieces } = analyzeExtrema(example, a, b);
                const count = (kind: string) => candidates.filter(candidate => candidate.kind === kind).length;
                expect(count('endpoint')).toBe(2);
                expect(count('stationary'), `${id} ${a} ${b}`).toBeLessThanOrEqual(2);
                expect(count('corner')).toBeLessThanOrEqual(1);
                expect(candidates.length).toBeLessThanOrEqual(5);
                expect(pieces.length).toBeLessThanOrEqual(4);
                largest = Math.max(largest, candidates.length);
            }
        }
    }
    expect(largest).toBe(4);
});

test('setting a, b, the example and the classification through the controls and through the lesson actions gives the same configuration', () => {
    const viaControl = makeGraph({asyncState: false});
    const viaLesson = makeGraph({asyncState: false});
    controls(viaControl).found.ChoiceSelect[0].props.onChange('sine');
    apply(viaLesson, choice('sine'));
    expect(viaControl.model).toEqual(viaLesson.model);
    expect(controls(viaControl).inputA.props.onChange(0)).toBe(true);
    apply(viaLesson, parameter('extrema-a', 0));
    expect(controls(viaControl).inputB.props.onChange(3)).toBe(true);
    apply(viaLesson, parameter('extrema-b', 3));
    controls(viaControl).toggle.props.onClick();
    apply(viaLesson, reveal(true));
    expect(viaControl.model).toEqual(viaLesson.model);
    expect(viaControl.model).toEqual({example: 'sine', a: 0, b: 3, revealed: true});
    expect(rows(viaControl)).toEqual(rows(viaLesson));
    expect(caption(viaControl)).toEqual(caption(viaLesson));
    expect(axisPoints(viaControl).map((point: any) => point.x)).toEqual(axisPoints(viaLesson).map((point: any) => point.x));
    controls(viaControl).toggle.props.onClick();
    apply(viaLesson, reveal(false));
    expect(viaControl.model).toEqual(viaLesson.model);
    expect(viaControl.model.revealed).toBe(false);
});

test('invalid values are rejected, never clamped: every setter throws DomainError and leaves the model unchanged', () => {
    const graph = makeGraph({asyncState: false});
    const before = {...graph.model};
    for (const a of [2, 3, 5, -4.5, -5, NaN, Infinity]) expect(() => apply(graph, parameter('extrema-a', a)), `a = ${a}`).toThrow(DomainError);
    for (const b of [-1, -2, 4.5, 5, -5, NaN, -Infinity]) expect(() => apply(graph, parameter('extrema-b', b)), `b = ${b}`).toThrow(DomainError);
    expect(() => apply(graph, choice('quartic'))).toThrow(DomainError);
    expect(graph.model).toEqual(before);
    // the boundary values themselves are accepted
    apply(graph, parameter('extrema-b', EXTREMA_X_MAX));
    apply(graph, parameter('extrema-a', EXTREMA_X_MIN));
    expect(graph.model).toMatchObject({a: EXTREMA_X_MIN, b: EXTREMA_X_MAX});
});

test('the number fields carry their ranges, report rejection with a hint and show the rule', () => {
    const graph = makeGraph({asyncState: false});
    const {inputA, inputB} = controls(graph);
    expect([inputA, inputB].map((input: any) => [input.props.label, input.props.min, input.props.max, input.props.value])).toEqual([
        ['Levo krajišče a', -4, 4, -1], ['Desno krajišče b', -4, 4, 2],
    ]);
    expect(inputA.props.onChange(2)).toBe(false); // a = b
    expect(inputA.props.onChange(3)).toBe(false);
    expect(inputA.props.onChange(-5)).toBe(false);
    expect(inputB.props.onChange(-1)).toBe(false);
    expect(graph.model).toMatchObject({a: -1, b: 2});
    expect(inputA.props.rejectedHint).toMatch(/a < b/);
    expect(inputB.props.rejectedHint).toMatch(/a < b/);
    expect(collect([graph.renderControls(), graph.renderReveals()]).p.some((element: any) => /a < b/.test(String(element.props.children)))).toBe(true);
    setLanguage('en');
    expect(controls(graph).inputA.props.label).toBe('Left endpoint a');
    expect(controls(graph).inputB.props.label).toBe('Right endpoint b');
});

test('the toggle names its state in words, editing a and b keeps the classification and choosing an example hides it', () => {
    const graph = makeGraph({asyncState: false});
    expect(controls(graph).toggle.props.children).toBe('Pokaži klasifikacijo');
    expect(controls(graph).toggle.props['data-revealed']).toBe(false);
    controls(graph).toggle.props.onClick();
    expect(controls(graph).toggle.props.children).toBe('Skrij klasifikacijo');
    expect(controls(graph).toggle.props['data-revealed']).toBe(true);
    expect(controls(graph).toggle.props.type).toBe('button');
    apply(graph, parameter('extrema-b', 1));
    apply(graph, parameter('extrema-a', -2));
    expect(graph.model).toEqual({example: 'square', a: -2, b: 1, revealed: true});
    controls(graph).found.ChoiceSelect[0].props.onChange('abs');
    expect(graph.model).toEqual({...EXTREMA_EXAMPLE_MODELS.abs, revealed: false});
    expect(controls(graph).found.ChoiceSelect[0].props.options.map((option: any) => option.text)).toEqual(['f(x) = x²', 'f(x) = x³', 'f(x) = |x|', 'f(x) = sin x']);
    setLanguage('en');
    expect(controls(graph).toggle.props.children).toBe('Show classification');
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [choice('sine'), parameter('extrema-a', 0), parameter('extrema-b', Math.PI), reveal(true)]) apply(graph, action);
    expect(graph.model).toEqual({example: 'sine', a: 0, b: Math.PI, revealed: true});
    expect(graph.state).toMatchObject({example: 'square', a: -1, b: 2, revealed: false});
    // a later action in the same tick sees the earlier one, including an endpoint that depends on the other endpoint
    apply(graph, parameter('extrema-a', 1));
    apply(graph, parameter('extrema-b', 2));
    expect(() => apply(graph, parameter('extrema-a', 2))).toThrow(DomainError);
    expect(graph.model).toEqual({example: 'sine', a: 1, b: 2, revealed: true});
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('extrema')!;
    expect(lesson.id).toBe('extrema-guided');
    expect(lesson.steps).toHaveLength(7);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph({asyncState: false});
        // a deliberately different user state that the default scene must reset
        apply(graph, choice('sine'));
        apply(graph, parameter('extrema-a', 1));
        apply(graph, reveal(true));
        for (const action of step.scene!.actions) apply(graph, action);
        return [graph.model, statusIds(graph)];
    });
    const sine = {example: 'sine'};
    expect(finals).toEqual([
        [{example: 'square', a: -1, b: 2, revealed: false}, ['hidden']],
        [{example: 'square', a: -1, b: 2, revealed: true}, ['revealed']],
        [{example: 'cube', a: -1, b: 1, revealed: false}, ['hidden']],
        [{example: 'abs', a: -1, b: 1, revealed: false}, ['hidden', 'corner']],
        [{...sine, a: -4, b: 4, revealed: false}, ['hidden']],
        [{...sine, a: 0, b: Math.PI, revealed: false}, ['hidden']],
        [{...sine, a: 0, b: Math.PI, revealed: true}, ['revealed', 'tie']],
    ]);
    // the numbers the lesson prose states
    const graph = makeGraph({asyncState: false});
    for (const action of lesson.steps[6].scene!.actions) apply(graph, action);
    expect(rows(graph)).toMatchObject({'global-minimum': '0 pri x = 0; 3,1416', 'global-maximum': '1 pri x = 1,5708'});
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
    expect(graph.model.b).toBe(-0.99);
    b.x = 9;
    b.handlers.drag();
    expect(graph.model.b).toBe(EXTREMA_X_MAX);

    a.x = 9; // beyond b: clamped just left of it
    a.handlers.drag();
    expect(graph.model.a).toBe(3.99);
    a.x = -9;
    a.handlers.drag();
    expect(graph.model.a).toBe(EXTREMA_X_MIN);
    expect(graph.model.revealed).toBe(false);
    // a drag already shows the new model: the scene sync does not move the dragged point a second time
    expect(a.moveTo).toHaveBeenCalledTimes(2);
});

test('a drag next to the other endpoint is clamped to one grid step short of it and never leaves a point on a rejected position', () => {
    const graph = makeGraph();
    graph.importPresetData({example: 'square', a: 0.499, b: 0.5, revealed: false});
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
    for (const name of ['x1', 'k', 'n', 'a', 'b', 'darboux-a', 'mvt-c', 'accum-x']) {
        expect(() => apply(graph, {kind: 'function-parameter', name, value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    for (const target of ['tangent', 'matching-points', 'lower-sum', 'upper-sum']) {
        expect(() => apply(graph, {kind: 'function-visibility', target, visible: true} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'function-choice', name: 'darboux-example', value: 'sine'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'bisection', command: 'next-step'})).toThrow(UnsupportedLessonActionError);
    for (const supported of [parameter('extrema-a', 0), parameter('extrema-b', 1), choice('sine'), reveal(true)]) {
        expect(graph.supportsLessonAction(supported)).toBe(true);
    }
    expect(graph.supportsLessonAction({kind: 'function-parameter', name: 'darboux-a', value: 1})).toBe(false);
    expect(graph.model).toEqual({example: 'square', a: -1, b: 2, revealed: false});
});

test('presets save the model with the classification flag and reopen the same scene', () => {
    const graph = makeGraph();
    apply(graph, choice('sine'));
    apply(graph, parameter('extrema-a', 0));
    apply(graph, parameter('extrema-b', Math.PI));
    apply(graph, reveal(true));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('extrema');
    expect(exported.data).toEqual({example: 'sine', a: 0, b: Math.PI, revealed: true});

    const reopened = makeGraph({asyncState: false});
    reopened.importPreset({id: 'extrema', boardState: {boundingBox: [-1, 2, 7, -2]}, data: exported.data});
    expect(reopened.model).toEqual(exported.data);
    expect(rows(reopened)).toMatchObject({'global-minimum': '0 pri x = 0; 3,1416'});
    expect(axisPoints(reopened).map((point: any) => point.x)).toEqual([0, Math.PI]);
    expect(reopened.exportPreset().data).toEqual(exported.data);
    // a string and extra properties are sanitized
    reopened.importPresetData(JSON.stringify({example: 'cube', a: -2, b: 3, revealed: false, extra: true}));
    expect(reopened.model).toEqual({example: 'cube', a: -2, b: 3, revealed: false});
});

test('a preset of another example without a view of its own shows that example\'s view', () => {
    const graph = makeGraph({asyncState: false});
    graph.board.setBoundingBox.mockClear();
    graph.importPreset({id: 'extrema', data: {example: 'abs', a: -1, b: 1, revealed: false}});
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-6, 3.6, 6, -4.2], true);
});

test('malformed or misordered preset data is rejected to the default model with a warning', () => {
    const graph = makeGraph();
    apply(graph, parameter('extrema-a', 1));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const valid = {example: 'square', a: -1, b: 2, revealed: false};
    const bad = [undefined, null, 'not json', {}, [], {...valid, example: 'quartic'}, {...valid, a: 2, b: -1}, {...valid, a: 1, b: 1}, {...valid, a: -4.5}, {...valid, b: 4.5},
        {...valid, a: '0'}, {...valid, revealed: 'yes'}, {...valid, revealed: 1}, {example: 'square', a: -1, b: 2}];
    for (const entry of bad) {
        graph.importPresetData(entry);
        expect(graph.model).toEqual(valid);
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
});

test('capture and restore bring back the synchronous model, including the classification flag', () => {
    const graph = makeGraph();
    apply(graph, choice('abs'));
    apply(graph, parameter('extrema-b', 0.5));
    apply(graph, reveal(true));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({example: 'abs', a: -1, b: 0.5, revealed: true});
    apply(graph, defaultScene);
    expect(graph.model).toEqual({example: 'square', a: -1, b: 2, revealed: false});
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({example: 'abs', a: -1, b: 0.5, revealed: true});
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
});

test('no readout, caption, label or status ever shows NaN, Infinity or a raw undefined, in either language', () => {
    const graph = makeGraph({asyncState: false});
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        for (const id of EXTREMA_EXAMPLE_IDS) {
            apply(graph, choice(id));
            for (const revealed of [false, true]) {
                apply(graph, reveal(revealed));
                const labels = markerTexts(graph).filter((text: any) => visible(text)).flatMap(labelLines);
                const text = [...caption(graph), ...Object.values(rows(graph)), ...statusTexts(graph, language), ...labels].join(' | ');
                expect(text).not.toMatch(/NaN|Infinity|undefined|-0\b/);
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
    expect(baseline).toBe(25);
    for (let i = 0; i < 4; i++) graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    expect(graph.generatedObjectCount).toBe(baseline);
    // the object count does not depend on the example or on the number of candidates
    for (let i = 0; i < 5; i++) {
        apply(graph, choice('sine'));
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
    const graph = makeGraph();
    expect(caption(graph)[1]).toBe('a = −1, b = 2');
    expect(labelLines(markerTexts(graph)[ENDPOINT_0])).toEqual(['f(−1) = 1', 'krajišče']);
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(caption(graph)[2]).toBe('classification: hidden');
    expect(caption(graph)[3]).toBe('square: endpoint; diamond: stationary point; triangle: corner');
    expect(labelLines(markerTexts(graph)[STATIONARY_0])).toEqual(['f(0) = 0', "f′ = 0"]);
    unsubscribe();
});

test('the legend names every marker and line in words', () => {
    const graph = makeGraph();
    const items = graph.renderLegend().props.items as { id: string; label: string; kind: string }[];
    expect(items.map(item => item.id)).toEqual(['function', 'endpoint', 'stationary', 'corner', 'global', 'pieces']);
    expect(items[1].label).toMatch(/kvadrat/);
    expect(items[2].label).toMatch(/romb/);
    expect(items[3].label).toMatch(/trikot/);
    // the global values (dotted) and the piece separators (dashed) are lines with distinct patterns, not boxes
    expect(items[4].kind).toBe('dotted-line');
    expect(items[5].kind).toBe('dashed-line');
    setLanguage('en');
    expect(graph.renderLegend().props.items.map((item: any) => item.label).slice(1, 4)).toEqual([
        'Endpoint: square marker', "Stationary point (f′ = 0): diamond marker", "Corner (f′ does not exist): triangle marker",
    ]);
});

test('an endpoint carrying floating-point noise is cleaned and compared cleaned; the view is memoised by the model values', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, parameter('extrema-b', 0.1 + 0.2));
    expect(graph.model.b).toBe(0.3);
    const before = graph.model;
    apply(graph, parameter('extrema-b', 0.3 + 1e-15));
    expect(graph.model).toBe(before);
    const first = graph.viewOf(graph.model);
    expect(graph.viewOf({...graph.model})).toBe(first);
});
