import {UniformConvergenceGraph} from './UniformConvergenceGraph';
import {gridValue} from './BaseFunctionGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {UNIFORM_EXAMPLE_MODELS} from '../../analysis/uniformConvergenceModel';
import {setLanguage, onLanguageChange} from '../../localization';
import {DomainError} from './BaseFunctionGraph';

const BOX = [-0.15, 1.45, 1.2, -0.2];

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
    const graph = new UniformConvergenceGraph() as any;
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
type ParameterName = 'uniform-r' | 'uniform-n' | 'uniform-x' | 'uniform-epsilon';
const parameter = (name: ParameterName, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'uniform-example', value});
const reveal = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'uniform-supremum', visible});
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const visible = (object: any) => resolve(object.attributes.visible);

// Creation order per type (see createScene): segments are the two band edges, the band at an isolated limit value, the limit segment, the pointwise
// error and the supremum line; points are the open end of the limit, the isolated limit value, the attained and the unattained supremum, the values
// of f_n and of f at x, the domain end r and the draggable x.
const segments = (graph: any) => ofType(graph, 'segment');
const [LOW_EDGE, HIGH_EDGE, ISOLATED_BAND, LIMIT_SEGMENT, ERROR, SUPREMUM_LINE] = [0, 1, 2, 3, 4, 5];
const points = (graph: any) => ofType(graph, 'point');
const [OPEN_END, ISOLATED, ATTAINED, UNATTAINED, TERM_POINT, LIMIT_POINT, R_POINT, X_POINT] = [0, 1, 2, 3, 4, 5, 6, 7];
const functionGraphs = (graph: any) => ofType(graph, 'functiongraph');
const caption = (graph: any) => graph.captionPlainLines();
const at = (point: any) => [point.X(), point.Y()];
const coords = (segment: any) => [segment.parents[0][0], segment.parents[0][1], segment.parents[1][0], segment.parents[1][1]].map(resolve);
const OBJECT_COUNT = 17;

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
    const [inputR, inputX, inputEpsilon, inputN] = found.NumberInput;
    const button = (action: string) => found.button.find((element: any) => element.props['data-action'] === action);
    return {found, select: found.ChoiceSelect[0], inputR, inputX, inputEpsilon, inputN, toggle: button('toggle-uniform-supremum'), decrease: button('n-decrease'), increase: button('n-increase')};
};
const rows = (graph: any): Record<string, string> =>
    Object.fromEntries((graph.renderReadout().props.children[0].props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));
const statusIds = (graph: any) => graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: { id: string }) => status.id);

beforeEach(() => setLanguage('sl'));

// ---- Independent references (BigInt integers, not the production code) --------------------------------------------------------

/** The least n >= 1 with (num / den)^n < e100 / 100, by exact integer comparison. */
const leastBelow = (num: number, den: number, e100: number) => {
    for (let n = 1; n < 2000; n++) {
        if (BigInt(num) ** BigInt(n) * 100n < BigInt(e100) * BigInt(den) ** BigInt(n)) return n;
    }
    return undefined;
};

test('initialization draws x^n on [0, 0.8] with the supremum hidden, from a fixed pool of owned objects', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({example: 'power', r: 0.8, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false});
    expect(graph.presets()).toBe('uniform-convergence');
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, false);
    expect(graph.board.objectsList).toHaveLength(OBJECT_COUNT);
    expect(graph.generatedObjectCount).toBe(OBJECT_COUNT);
    expect(functionGraphs(graph)).toHaveLength(1);
    expect(caption(graph)).toEqual([
        'fₙ(x) = xⁿ na [0; 0,8]', 'n = 5, x = 0,5, ε = 0,1', 'pri x: napaka 0,03125, N(x) = 4', 'supremum: skrit',
        'polna črta: fₙ; črtkana črta: f; navpična črta: napaka pri x',
    ]);
    // f_n is drawn on [0, r] only and equals x^n there
    const f = functionGraphs(graph)[0].parents[0];
    expect(f(0.5)).toBe(0.5 ** 5);
    expect(f(0.8)).toBeCloseTo(0.32768, 12);
    expect(f(0.81)).toBeNaN();
    expect(f(-0.01)).toBeNaN();
    // the pool is the same for every example, domain and visibility
    for (const action of [choice('scaled'), reveal(true), parameter('uniform-r', 0.5), parameter('uniform-x', 0.3), parameter('uniform-n', 50), choice('power')]) {
        apply(graph, action);
        expect(graph.board.objectsList).toHaveLength(OBJECT_COUNT);
        expect(graph.generatedObjectCount).toBe(OBJECT_COUNT);
    }
    // removing the scene releases everything
    graph.removeGeneratedObjects();
    expect(graph.board.objectsList).toHaveLength(0);
    expect(graph.generatedObjectCount).toBe(0);
});

test('f_n is solid, the limit dashed, the band edges medium-dashed, the supremum dotted and the pointwise error a solid vertical segment: patterns, not only colours', () => {
    const graph = makeGraph();
    const f = functionGraphs(graph)[0];
    expect(f.attributes.dash).toBe(0);
    expect(segments(graph)[LIMIT_SEGMENT].attributes.dash).toBe(3);
    expect(segments(graph)[LOW_EDGE].attributes.dash).toBe(2);
    expect(segments(graph)[SUPREMUM_LINE].attributes.dash).toBe(1);
    expect(segments(graph)[ERROR].attributes.dash ?? 0).toBe(0);
    expect(f.attributes.strokeColor).not.toBe(segments(graph)[LIMIT_SEGMENT].attributes.strokeColor);
    // the attained supremum is a cross, the unattained one an open circle: shapes
    expect(points(graph)[ATTAINED].attributes.face).toBe('x');
    expect(points(graph)[UNATTAINED].attributes.face).toBe('o');
    expect(points(graph)[OPEN_END].attributes.face).toBe('o');
    const error = segments(graph)[ERROR];
    expect(coords(error)).toEqual([0.5, 0, 0.5, 0.5 ** 5]);
    const items = graph.renderLegend().props.items as { id: string; label: string; kind: string }[];
    expect(items.map(item => item.id)).toEqual(['function', 'limit', 'limit-open', 'band', 'error', 'supremum', 'attained', 'not-attained']);
    expect(items.map(item => item.kind)).toEqual(['line', 'dashed-line', 'ring', 'area', 'line', 'dotted-line', 'cross', 'ring']);
    expect(items[0].label).toMatch(/polna/);
    expect(items[1].label).toMatch(/črtkana/);
});

test('the limit is drawn as separate pieces: on [0, 1] a half-open segment with an open circle at (1, 0) and the isolated filled point (1, 1), never joined', () => {
    const graph = makeGraph({asyncState: false});
    const segment = segments(graph)[LIMIT_SEGMENT];
    const endpoints = () => coords(segment);
    // r < 1: one closed segment on [0, r] and no extra pieces
    expect(endpoints()).toEqual([0, 0, 0.8, 0]);
    expect(visible(points(graph)[OPEN_END])).toBe(false);
    expect(visible(points(graph)[ISOLATED])).toBe(false);
    expect(visible(segments(graph)[ISOLATED_BAND])).toBe(false);
    apply(graph, parameter('uniform-r', 1));
    expect(endpoints()).toEqual([0, 0, 1, 0]);
    expect(visible(points(graph)[OPEN_END])).toBe(true);
    expect(at(points(graph)[OPEN_END])).toEqual([1, 0]);
    expect(points(graph)[OPEN_END].attributes.fillColor).toBe('#fffdf5');
    expect(visible(points(graph)[ISOLATED])).toBe(true);
    expect(at(points(graph)[ISOLATED])).toEqual([1, 1]);
    expect(points(graph)[ISOLATED].attributes.fillColor).toBe(points(graph)[ISOLATED].attributes.strokeColor);
    // the isolated value has its own band stretch f(1) +- epsilon at x = 1 (here 0.9 to 1.1)
    const band = segments(graph)[ISOLATED_BAND];
    expect(visible(band)).toBe(true);
    expect(coords(band)).toEqual([1, 0.9, 1, 1.1]);
    // nothing connects (1, 0) and (1, 1): the only vertical segments are the band stretch and the pointwise error at the chosen x
    const connecting = segments(graph).filter((candidate: any) => visible(candidate) !== false && coords(candidate)[0] === 1 && coords(candidate)[2] === 1
        && Math.min(coords(candidate)[1], coords(candidate)[3]) <= 0 && Math.max(coords(candidate)[1], coords(candidate)[3]) >= 1);
    expect(connecting).toEqual([]);
    // f_n itself is the only curve and ends at (1, 1) on its own; at x = 1 the pointwise error is 0 and not drawn
    expect(functionGraphs(graph)).toHaveLength(1);
    apply(graph, parameter('uniform-x', 1));
    expect(visible(segments(graph)[ERROR])).toBe(false);
    expect(visible(points(graph)[LIMIT_POINT])).toBe(false);
    // the scaled example has no jump even on [0, 1]
    apply(graph, choice('scaled'));
    expect(endpoints()).toEqual([0, 0, 1, 0]);
    expect(visible(points(graph)[OPEN_END])).toBe(false);
    expect(visible(points(graph)[ISOLATED])).toBe(false);
    // the band fill covers the segment piece only
    const band2 = graph.board.objectsList.find((object: any) => object.type === 'curve');
    band2.updateDataArray();
    expect(band2.dataX).toEqual([0, 1, 1, 0, 0]);
    expect(band2.dataY).toEqual([-0.1, -0.1, 0.1, 0.1, -0.1]);
});

test('readouts and statuses are hidden before Show supremum, then give the supremum, whether it is attained and the shared N', () => {
    const graph = makeGraph({asyncState: false});
    expect(rows(graph)).toEqual({
        r: '0,8', n: '5', x: '0,5', epsilon: '0,1', term: '0,03125', limit: '0', 'pointwise-error': '0,03125', 'pointwise-n': '4',
        supremum: 'skrito', 'supremum-attained': 'skrito', 'shared-n': 'skrito',
    });
    expect(statusIds(graph)).toEqual(['hidden']);
    expect(visible(segments(graph)[SUPREMUM_LINE])).toBe(false);
    expect(visible(points(graph)[ATTAINED])).toBe(false);
    expect(visible(points(graph)[UNATTAINED])).toBe(false);
    expect(caption(graph)[3]).toBe('supremum: skrit');
    // power on [0, 0.8]: sup = 0.8^5 = 0.32768 attained at x = 0.8, shared N = 11 (independent integer arithmetic)
    apply(graph, reveal(true));
    expect(0.8 ** 5).toBeCloseTo(0.32768, 14);
    expect(leastBelow(16, 20, 10)).toBe(11);
    expect(rows(graph)).toMatchObject({supremum: '0,32768', 'supremum-attained': 'da, pri x = 0,8', 'shared-n': '11'});
    expect(statusIds(graph)).toEqual(['attained', 'shared-n', 'not-covered']);
    expect(visible(segments(graph)[SUPREMUM_LINE])).toBe(true);
    expect(visible(points(graph)[ATTAINED])).toBe(true);
    expect(visible(points(graph)[UNATTAINED])).toBe(false);
    expect(at(points(graph)[ATTAINED])).toEqual([0.8, 0.8 ** 5]);
    expect(caption(graph)).toEqual([
        'fₙ(x) = xⁿ na [0; 0,8]', 'n = 5, x = 0,5, ε = 0,1', 'pri x: napaka 0,03125, N(x) = 4', 'sup |fₙ − f| = 0,32768, dosežen pri x = 0,8', 'skupni N = 11',
        'polna črta: fₙ; črtkana črta: f; navpična črta: napaka pri x',
    ]);
    // at n = 11 the supremum is below epsilon, at n = 10 it is not
    apply(graph, parameter('uniform-n', 11));
    expect(statusIds(graph)).toEqual(['attained', 'shared-n', 'covered']);
    expect(0.8 ** 11).toBeLessThan(0.1);
    apply(graph, parameter('uniform-n', 10));
    expect(0.8 ** 10).toBeGreaterThan(0.1);
    expect(statusIds(graph)).toEqual(['attained', 'shared-n', 'not-covered']);
});

test('power on [0, 1]: the supremum is 1 for every n, not attained, and there is no shared N', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, parameter('uniform-r', 1));
    apply(graph, reveal(true));
    for (const n of [1, 5, 50]) {
        apply(graph, parameter('uniform-n', n));
        expect(rows(graph)).toMatchObject({supremum: '1', 'supremum-attained': 'ne; napaka se mu približa blizu x = 1', 'shared-n': 'ne obstaja'});
        expect(statusIds(graph)).toEqual(['not-attained', 'no-shared-n', 'not-covered', 'jump']);
        // the marker of an unattained supremum is the open circle, the line is at height 1
        expect(visible(points(graph)[UNATTAINED])).toBe(true);
        expect(visible(points(graph)[ATTAINED])).toBe(false);
        expect(at(points(graph)[UNATTAINED])).toEqual([1, 1]);
        expect(segments(graph)[SUPREMUM_LINE].parents[0][1]()).toBe(1);
    }
    expect(caption(graph)[3]).toBe('sup |fₙ − f| = 1, ni dosežen');
    expect(caption(graph)[4]).toBe('skupnega N ni');
    // the pointwise values: at x < 1 the error is x^n < 1, at x = 1 it is 0
    apply(graph, parameter('uniform-x', 0.99));
    expect(Number(rows(graph)['pointwise-error'].replace(',', '.'))).toBeLessThan(1);
    apply(graph, parameter('uniform-x', 1));
    expect(rows(graph)).toMatchObject({term: '1', limit: '1', 'pointwise-error': '0', 'pointwise-n': '1'});
    // at epsilon = 1 the supremum equals epsilon but is not attained, so every error is below epsilon and N = 1 works; the status does not claim "supremum below epsilon"
    apply(graph, parameter('uniform-epsilon', 1));
    expect(rows(graph)['shared-n']).toBe('1');
    expect(statusIds(graph)).toEqual(['not-attained', 'shared-n-boundary', 'covered-boundary', 'jump']);
    expect(graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: { text: string }) => status.text).join(' ')).not.toMatch(/supremum je manjši/);
    expect(caption(graph)[4]).toBe('skupni N = 1');
    apply(graph, parameter('uniform-epsilon', 0.99));
    expect(rows(graph)['shared-n']).toBe('ne obstaja');
    expect(statusIds(graph)).toContain('no-shared-n');
});

test('a pointwise or shared N beyond the selectable n is reported with its true value, never truncated', () => {
    const graph = makeGraph({asyncState: false});
    // pointwise: x = 0.99 on [0, 1], epsilon = 0.1 needs n = 230 (x^n < 0.1)
    apply(graph, parameter('uniform-r', 1));
    apply(graph, parameter('uniform-x', 0.99));
    expect(leastBelow(99, 100, 10)).toBe(230);
    expect(rows(graph)['pointwise-n']).toBe('230 (nad največjim izbirnim n = 50)');
    expect(statusIds(graph)).toContain('pointwise-beyond');
    expect(caption(graph)[2]).toMatch(/N\(x\) = 230$/);
    setLanguage('en');
    expect(rows(graph)['pointwise-n']).toBe('230 (beyond the largest selectable n = 50)');
    setLanguage('sl');
    // pointwise N never exceeds 459 on the grids (x = 0.99, epsilon = 0.01)
    apply(graph, parameter('uniform-epsilon', 0.01));
    expect(leastBelow(99, 100, 1)).toBe(459);
    expect(rows(graph)['pointwise-n']).toBe('459 (nad največjim izbirnim n = 50)');
    // shared: x^n on [0, 0.95] at epsilon = 0.01 needs 90; x/n on [0, 1] at epsilon = 0.01 needs 101
    apply(graph, parameter('uniform-x', 0.5));
    apply(graph, parameter('uniform-r', 0.95));
    apply(graph, reveal(true));
    expect(leastBelow(19, 20, 1)).toBe(90);
    expect(rows(graph)['shared-n']).toBe('90 (nad največjim izbirnim n = 50)');
    expect(statusIds(graph)).toEqual(['attained', 'shared-n', 'shared-n-beyond', 'not-covered']);
    apply(graph, choice('scaled'));
    apply(graph, parameter('uniform-epsilon', 0.01));
    apply(graph, reveal(true));
    expect(Math.floor(1 / 0.01 + 1e-9) + 1).toBe(101);
    expect(rows(graph)['shared-n']).toBe('101 (nad največjim izbirnim n = 50)');
    expect(caption(graph)[4]).toBe('skupni N = 101');
});

test('x/n: the supremum is r/n attained at x = r and the shared N is floor(r / epsilon) + 1', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('scaled'));
    expect(graph.model).toEqual({example: 'scaled', r: 1, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false});
    expect(rows(graph)).toMatchObject({term: '0,1', limit: '0', 'pointwise-error': '0,1', 'pointwise-n': '6', supremum: 'skrito'});
    expect(caption(graph)[0]).toBe('fₙ(x) = x/n na [0; 1]');
    apply(graph, reveal(true));
    // 1 / 0.1 = 10 exactly, so the threshold is 11 (n = 10 gives the error 0.1, which is not below epsilon)
    expect(rows(graph)).toMatchObject({supremum: '0,2', 'supremum-attained': 'da, pri x = 1', 'shared-n': '11'});
    expect(statusIds(graph)).toEqual(['attained', 'shared-n', 'not-covered']);
    apply(graph, parameter('uniform-n', 11));
    expect(statusIds(graph)).toEqual(['attained', 'shared-n', 'covered']);
    apply(graph, parameter('uniform-r', 0.65));
    apply(graph, parameter('uniform-epsilon', 0.05));
    // floor(0.65 / 0.05) + 1 = 14 (0.65 / 0.05 = 13 exactly in decimals)
    expect(rows(graph)['shared-n']).toBe('14');
    expect(rows(graph).supremum).toBe('0,059091');
});

test('number-field values: arithmetic noise is snapped to the grid, a real off-grid value is rejected', () => {
    expect(gridValue(0.8500000000000001, 0.05)).toBe(0.85);
    expect(gridValue(0.1 + 0.2, 0.01)).toBe(0.3);
    expect(gridValue(0.07 * 100, 1)).toBe(7);
    expect(gridValue(0.851, 0.05)).toBeUndefined();
    expect(gridValue(0.125, 0.01)).toBeUndefined();
    expect(gridValue(Number.NaN, 0.01)).toBeUndefined();
    const graph = makeGraph({asyncState: false});
    apply(graph, parameter('uniform-r', 0.8500000000000001));
    expect(graph.model.r).toBe(0.85);
    apply(graph, parameter('uniform-x', 0.1 + 0.2));
    expect(graph.model.x).toBe(0.3);
    apply(graph, parameter('uniform-epsilon', 0.07));
    expect(graph.model.epsilon).toBe(0.07);
    apply(graph, parameter('uniform-n', 7.0000000000001));
    expect(graph.model.n).toBe(7);
    const before = {...graph.model};
    for (const action of [parameter('uniform-r', 0.851), parameter('uniform-r', 0.05), parameter('uniform-r', 1.05), parameter('uniform-x', 0.305), parameter('uniform-x', -0.01),
        parameter('uniform-x', 0.86), parameter('uniform-epsilon', 0.005), parameter('uniform-epsilon', 0), parameter('uniform-epsilon', 1.01), parameter('uniform-n', 2.5),
        parameter('uniform-n', 0), parameter('uniform-n', 51), parameter('uniform-n', Number.NaN), choice('cubic')]) {
        expect(() => apply(graph, action), JSON.stringify(action)).toThrow(DomainError);
        expect(graph.model).toEqual(before);
    }
    expect(graph.board.objectsList).toHaveLength(OBJECT_COUNT);
});

test('a change of r below the chosen x is rejected and never clamped; the inspector says why and what to do', () => {
    const graph = makeGraph({asyncState: false});
    const before = {...graph.model};
    expect(() => apply(graph, parameter('uniform-r', 0.4))).toThrow(/move x first/);
    expect(graph.model).toEqual(before);
    expect(graph.model.x).toBe(0.5);
    // through the number field: refused (false) and the model is unchanged; the hint names the point and says to move x first
    const {inputR} = controls(graph);
    expect(inputR.props.onChange(0.4)).toBe(false);
    expect(graph.model).toEqual(before);
    expect(inputR.props.rejectedHint).toMatch(/večkratnik števila 0,05 med 0,1 in 1/);
    expect(inputR.props.rejectedHint).toMatch(/x = 0,5/);
    expect(inputR.props.rejectedHint).toMatch(/Najprej premakni točko x/);
    setLanguage('en');
    expect(controls(graph).inputR.props.rejectedHint).toMatch(/not less than the chosen point x = 0\.5\. Move the point x first/);
    setLanguage('sl');
    // after moving x the change is accepted and x stays where it is
    apply(graph, parameter('uniform-x', 0.3));
    apply(graph, parameter('uniform-r', 0.4));
    expect(graph.model).toEqual({...before, r: 0.4, x: 0.3});
    // the point x can reach the new end r and the domain can shrink to it, but not below
    apply(graph, parameter('uniform-x', 0.4));
    apply(graph, parameter('uniform-r', 0.4));
    expect(() => apply(graph, parameter('uniform-r', 0.35))).toThrow(DomainError);
    expect(graph.model.r).toBe(0.4);
    // the x field and the drag are limited to [0, r]
    expect(controls(graph).inputX.props.max).toBe(0.4);
    expect(() => apply(graph, parameter('uniform-x', 0.41))).toThrow(DomainError);
});

test('controls and lesson actions give equivalent models', () => {
    const viaLesson = makeGraph({asyncState: false});
    for (const action of [choice('power'), parameter('uniform-r', 1), parameter('uniform-x', 0.9), parameter('uniform-n', 10), parameter('uniform-epsilon', 0.05), reveal(true)]) apply(viaLesson, action);

    const viaControls = makeGraph({asyncState: false});
    controls(viaControls).select.props.onChange('scaled');
    controls(viaControls).select.props.onChange('power');
    controls(viaControls).inputR.props.onChange(1);
    controls(viaControls).inputX.props.onChange(0.9);
    controls(viaControls).inputN.props.onChange(5);
    for (let n = 5; n < 10; n++) controls(viaControls).increase.props.onClick();
    controls(viaControls).inputEpsilon.props.onChange(0.05);
    controls(viaControls).toggle.props.onClick();
    expect(viaControls.model).toEqual(viaLesson.model);
    expect(viaControls.model).toEqual({example: 'power', r: 1, n: 10, x: 0.9, epsilon: 0.05, supremumVisible: true});
    expect(rows(viaControls)).toEqual(rows(viaLesson));
    expect(caption(viaControls)).toEqual(caption(viaLesson));
    expect(statusIds(viaControls)).toEqual(statusIds(viaLesson));
    // the buttons clamp nothing: at 1 the decrease is disabled, at 50 the increase is
    controls(viaControls).inputN.props.onChange(1);
    expect(controls(viaControls).decrease.props['aria-disabled']).toBe(true);
    expect(controls(viaControls).decrease.props['aria-describedby']).toBe('uniform-n-help');
    controls(viaControls).inputN.props.onChange(50);
    expect(controls(viaControls).increase.props['aria-disabled']).toBe(true);
    // an unavailable button stays focusable and its click does nothing
    controls(viaControls).increase.props.onClick();
    expect(viaControls.model.n).toBe(50);
    controls(viaControls).inputN.props.onChange(1);
    controls(viaControls).decrease.props.onClick();
    expect(viaControls.model.n).toBe(1);
    controls(viaControls).inputN.props.onChange(50);
    expect(controls(viaControls).inputN.props.onChange(51)).toBe(false);
    expect(viaControls.model.n).toBe(50);
    // hide again
    controls(viaControls).toggle.props.onClick();
    expect(viaControls.model.supremumVisible).toBe(false);
    // a rejected value reaches the field as false so it can explain itself, and never throws
    expect(controls(viaControls).inputX.props.onChange(0.91)).toBe(true);
    expect(controls(viaControls).inputX.props.onChange(0.915)).toBe(false);
    expect(controls(viaControls).inputX.props.onChange(1.01)).toBe(false);
});

test('dragging x projects onto the 0.01 grid inside [0, r] and writes through the same setter', () => {
    const graph = makeGraph({asyncState: false});
    const point = points(graph)[X_POINT];
    point.x = 0.5712;
    point.handlers.drag();
    expect(graph.model.x).toBe(0.57);
    expect(at(point)).toEqual([0.57, 0]);
    point.x = 0.95;
    point.handlers.drag();
    expect(graph.model.x).toBe(0.8);
    expect(at(point)).toEqual([0.8, 0]);
    point.x = -0.3;
    point.handlers.drag();
    expect(graph.model.x).toBe(0);
    // a model change by something else (a lesson action) moves the point back
    apply(graph, parameter('uniform-x', 0.25));
    expect(at(point)).toEqual([0.25, 0]);
    expect(points(graph)[R_POINT].X()).toBe(0.8);
    apply(graph, parameter('uniform-r', 0.5));
    expect(points(graph)[R_POINT].X()).toBe(0.5);
});

test('every lesson scene reproduces the configuration its expectedState describes, applied in one synchronous sequence', () => {
    const lesson = getLessonForDemonstration('uniform-convergence')!;
    expect(lesson.id).toBe('uniform-convergence-guided');
    expect(lesson.steps).toHaveLength(7);
    const finals = lesson.steps.map(step => {
        // the React state lags inside one tick (setState is asynchronous); the model must still be what the actions describe
        const graph = makeGraph({asyncState: true});
        // a deliberately different user state that the default scene must reset
        apply(graph, choice('scaled'));
        apply(graph, parameter('uniform-n', 33));
        apply(graph, reveal(true));
        for (const action of step.scene!.actions) apply(graph, action);
        return [graph.model, statusIds(graph)];
    });
    const model = (example: string, r: number, n: number, x: number, supremumVisible: boolean) => ({example, r, n, x, epsilon: 0.1, supremumVisible});
    expect(finals).toEqual([
        [model('power', 0.8, 2, 0.5, false), ['hidden']],
        [model('power', 0.8, 5, 0.5, false), ['hidden']],
        [model('power', 0.8, 11, 0.5, true), ['attained', 'shared-n', 'covered']],
        [model('power', 1, 5, 0.9, false), ['hidden', 'jump']],
        [model('power', 1, 10, 0.9, false), ['hidden', 'jump']],
        [model('power', 0.95, 44, 0.5, false), ['hidden']],
        [model('scaled', 1, 5, 0.5, false), ['hidden']],
    ]);
    // the numbers the lesson prose states, read from the graph
    const graph = makeGraph({asyncState: false});
    const run = (index: number) => { for (const action of lesson.steps[index].scene!.actions) apply(graph, action); };
    run(0);
    expect(rows(graph)).toMatchObject({term: '0,25', 'pointwise-error': '0,25', 'pointwise-n': '4'});
    apply(graph, parameter('uniform-x', 0.8));
    expect(rows(graph)['pointwise-n']).toBe('11');
    run(1);
    apply(graph, reveal(true));
    expect(rows(graph)).toMatchObject({supremum: '0,32768', 'supremum-attained': 'da, pri x = 0,8', 'shared-n': '11'});
    run(2);
    expect(rows(graph).supremum).toBe('0,085899');
    run(3);
    expect(rows(graph)).toMatchObject({'pointwise-error': '0,59049', 'pointwise-n': '22'});
    apply(graph, parameter('uniform-x', 0.99));
    expect(rows(graph)['pointwise-n']).toBe('230 (nad največjim izbirnim n = 50)');
    run(4);
    apply(graph, reveal(true));
    expect(rows(graph)).toMatchObject({supremum: '1', 'supremum-attained': 'ne; napaka se mu približa blizu x = 1', 'shared-n': 'ne obstaja'});
    run(5);
    apply(graph, reveal(true));
    expect(rows(graph)).toMatchObject({supremum: '0,10467', 'supremum-attained': 'da, pri x = 0,95', 'shared-n': '45'});
    apply(graph, parameter('uniform-n', 45));
    expect(rows(graph).supremum).toBe('0,09944');
    expect(leastBelow(19, 20, 10)).toBe(45);
    run(6);
    apply(graph, reveal(true));
    expect(rows(graph)).toMatchObject({supremum: '0,2', 'supremum-attained': 'da, pri x = 1', 'shared-n': '11', 'pointwise-n': '6'});
});

test('the lesson action registry handles exactly the uniform names and refuses the others', () => {
    const graph = makeGraph({asyncState: false});
    expect(() => apply(graph, {kind: 'function-parameter', name: 'taylor-x', value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-visibility', target: 'taylor-bound', visible: true} as LessonAction)).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-choice', name: 'taylor-example', value: 'exp'} as LessonAction)).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'sequence', command: 'next-step'} as LessonAction)).toThrow(UnsupportedLessonActionError);
    expect(graph.model).toEqual(UNIFORM_EXAMPLE_MODELS.power);
});

test('presets round-trip, an invalid preset loads the default, and capture and restore bring back the synchronous model', () => {
    const graph = makeGraph();
    apply(graph, choice('scaled'));
    apply(graph, parameter('uniform-r', 0.75));
    apply(graph, parameter('uniform-x', 0.7));
    apply(graph, parameter('uniform-epsilon', 0.03));
    apply(graph, parameter('uniform-n', 17));
    apply(graph, reveal(true));
    const exported = graph.exportPresetData();
    expect(exported).toEqual({example: 'scaled', r: 0.75, n: 17, x: 0.7, epsilon: 0.03, supremumVisible: true});
    const other = makeGraph();
    other.importPresetData(JSON.parse(JSON.stringify(exported)));
    expect(other.model).toEqual(exported);
    other.importPresetData(JSON.stringify(exported));
    expect(other.model).toEqual(exported);
    expect(graph.defaultPreset()).toBe(JSON.stringify({example: 'power', r: 0.8, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false}));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const valid = {example: 'power', r: 0.8, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false};
    const bad = [null, [], {}, {...valid, example: 'cubic'}, {...valid, r: 0.82}, {...valid, r: 1.05}, {...valid, n: 0}, {...valid, n: 51}, {...valid, n: 2.5}, {...valid, x: 0.85},
        {...valid, x: -0.01}, {...valid, x: 0.505}, {...valid, epsilon: 0}, {...valid, epsilon: 1.5}, {...valid, epsilon: 0.005}, {...valid, supremumVisible: 'yes'}, {...valid, x: '0.5'}];
    for (const entry of bad) {
        other.importPresetData(entry);
        expect(other.model, JSON.stringify(entry)).toEqual(valid);
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
    // capture and restore
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual(exported);
    apply(graph, {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'});
    expect(graph.model).toEqual(valid);
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual(exported);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, false);
});

test('the board caption follows the language, a language change notifies subscribers, and compact boards drop the key line', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, reveal(true));
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(caption(graph)).toEqual([
        'fₙ(x) = xⁿ on [0, 0.8]', 'n = 5, x = 0.5, ε = 0.1', 'at x: error 0.03125, N(x) = 4', 'sup |fₙ − f| = 0.32768, attained at x = 0.8', 'shared N = 11',
        'solid line: fₙ; dashed line: f; vertical line: error at x',
    ]);
    apply(graph, parameter('uniform-r', 1));
    expect(caption(graph).slice(3, 5)).toEqual(['sup |fₙ − f| = 1, not attained', 'no shared N']);
    expect(rows(graph)['supremum-attained']).toBe('no; the error approaches it near x = 1');
    expect(rows(graph)['shared-n']).toBe('does not exist');
    // below 520 px the key is left out; no caption line mentions anything that lives on an axis
    graph.board.canvasWidth = 390;
    expect(caption(graph)).toHaveLength(5);
    expect(caption(graph).join('|')).not.toMatch(/polna|solid/);
    graph.board.canvasWidth = 700;
    expect(caption(graph)).toHaveLength(6);
    unsubscribe();
});

test('no readout, caption or status ever shows NaN, Infinity, -0, 1e-17 noise or a raw undefined, in either language', () => {
    const graph = makeGraph({asyncState: false});
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        for (const id of ['power', 'scaled']) {
            apply(graph, choice(id));
            for (const r of [0.1, 0.5, 1]) {
                apply(graph, parameter('uniform-x', 0));
                apply(graph, parameter('uniform-r', r));
                for (const x of [0, r / 2, r]) {
                    apply(graph, parameter('uniform-x', Math.round(x * 100) / 100));
                    for (const epsilon of [0.01, 0.1, 1]) {
                        apply(graph, parameter('uniform-epsilon', epsilon));
                        for (const n of [1, 5, 50]) {
                            apply(graph, parameter('uniform-n', n));
                            for (const visibleNow of [false, true]) {
                                apply(graph, reveal(visibleNow));
                                const text = [...caption(graph), ...Object.values(rows(graph)),
                                    ...graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: { text: string }) => status.text)].join(' | ');
                                expect(text).not.toMatch(/NaN|Infinity|undefined|−0(?![.,\d])|[0-9]e-\d/);
                            }
                        }
                    }
                }
            }
        }
    }
});

test('Fit restores the default view instead of a canvas-aspect box, because the axes have different units', () => {
    const graph = makeGraph({asyncState: false});
    graph.board.container = document.createElement('div');
    graph.board.applyZoom = vi.fn();
    graph.board.setBoundingBox.mockClear();
    graph.navigateBoard('fit');
    expect(graph.board.setBoundingBox).toHaveBeenCalledTimes(1);
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith([-0.15, 1.45, 1.2, -0.2], false, 'update');
});
