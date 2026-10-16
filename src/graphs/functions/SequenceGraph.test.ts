import {SEQUENCE_STEP_INTERVAL_MS, SequenceGraph} from './SequenceGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {SEQUENCE_MAX_STEPS, SEQUENCE_MAX_TERMS} from '../../analysis/sequence';
import {SEQUENCE_EXAMPLE_MODELS, SequenceModel} from '../../analysis/sequenceModel';
import {currentLanguage, onLanguageChange, setLanguage} from '../../localization';
import {GraphPalette} from '../styles/GraphPalette';
import {COMPACT_BOARD_WIDTH, DomainError} from './BaseFunctionGraph';

// The export itself is not under test: only that it pauses the iteration before it captures the board.
vi.mock('../base/export/FigureCapture', () => ({downloadSVG: vi.fn(() => Promise.resolve()), downloadPNG: vi.fn(() => Promise.resolve())}));
vi.mock('../base/export/PresetFigureBatch', () => ({downloadPresetFigures: vi.fn(() => Promise.resolve())}));

const BOX = [-4.9, 1.5, 43, -1.5];

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        create: vi.fn((type: string, parents: any[], attributes: any) => {
            const object: any = {type, board, parents, attributes};
            if (type === 'point') {
                object.X = () => (typeof parents[0] === 'function' ? parents[0]() : parents[0]);
                object.Y = () => (typeof parents[1] === 'function' ? parents[1]() : parents[1]);
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

/** Manual frame source: the test decides when the one pending frame runs and what time it reports. */
function manualScheduler() {
    let nextHandle = 0;
    let time = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => {const handle = nextHandle++; callbacks.set(handle, callback); return handle;},
        cancel: handle => {callbacks.delete(handle);},
    };
    const frame = (elapsed: number) => {
        const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
        if (!entry) return false;
        callbacks.delete(entry[0]);
        time += elapsed;
        entry[1](time);
        return true;
    };
    return {scheduler, callbacks, frame};
}

/** A graph whose React state is NOT updated synchronously, exactly like setState inside one lesson tick (unless asyncState is false). */
function makeGraph({asyncState = true}: { asyncState?: boolean } = {}) {
    const frames = manualScheduler();
    const graph = new SequenceGraph(frames.scheduler) as any;
    graph.board = fakeBoard();
    graph.graphSession = {
        isReady: true, isAlive: true, dispose: vi.fn(), signal: new AbortController().signal,
        waitUntilReady: () => Promise.resolve(), beginTransition: () => () => undefined,
    };
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn((patch: any) => { if (!asyncState) graph.store.setState(patch); });
    graph.initialize();
    return Object.assign(graph, {frames});
}

/** Plays by feeding frames of exactly one step interval until `steps` transitions ran (the first frame reports no elapsed time). */
function playSteps(graph: any, steps: number) {
    const target = graph.model.terms + steps;
    graph.frames.frame(0);
    for (let guard = 0; guard < steps * 3 && graph.model.terms < target && graph.controller.isPlaying(); guard++) {
        graph.frames.frame(SEQUENCE_STEP_INTERVAL_MS);
    }
}

const apply = (graph: any, action: LessonAction) => graph.applyLessonAction(action);
type ParameterName = 'sequence-epsilon' | 'sequence-limit' | 'sequence-threshold';
const parameter = (name: ParameterName, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'sequence-example', value});
const reveal = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'sequence-certificate', visible});
const command = (value: any): LessonAction => ({kind: 'animation', animationId: 'sequence', command: value});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const next = (graph: any, count = 1) => { for (let i = 0; i < count; i++) apply(graph, command('next-step')); };
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const boardObjectCount = (graph: any) => graph.board.objectsList.length;
const caption = (graph: any): string[] => graph.captionPlainLines();
const statusIds = (graph: any) => graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: { id: string }) => status.id);
const statusTexts = (graph: any) => graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: { text: string }) => status.text);
const model = (overrides: Partial<SequenceModel>): SequenceModel => ({...SEQUENCE_EXAMPLE_MODELS.reciprocal, ...overrides});

// Creation order: the band curve, then the segments (two band edges, the line y = L, the threshold marker), then the pool of 40 points
// outside the band and the pool of 40 points inside it (index n - 1 is the term a_n), then the threshold label and the caption.
const band = (graph: any) => ofType(graph, 'curve')[0];
const segments = (graph: any) => ofType(graph, 'segment');
const [LOWER_EDGE, UPPER_EDGE, LIMIT_LINE, THRESHOLD_MARKER] = [0, 1, 2, 3];
const outsidePool = (graph: any) => ofType(graph, 'point').slice(0, SEQUENCE_MAX_TERMS);
const insidePool = (graph: any) => ofType(graph, 'point').slice(SEQUENCE_MAX_TERMS);
const thresholdLabel = (graph: any) => ofType(graph, 'text')[0];
const shownIn = (pool: any[]) => pool.map((point, index) => resolve(point.attributes.visible) ? index + 1 : 0).filter(Boolean);

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
    const button = (action: string) => found.button.find((element: any) => element.props['data-action'] === action);
    const [inputEpsilon, inputLimit, inputThreshold] = found.NumberInput;
    return {
        found, inputEpsilon, inputLimit, inputThreshold, select: found.ChoiceSelect[0],
        next: button('next-step'), play: button('play-pause'), reset: button('reset'), toggle: button('toggle-sequence-certificate'),
    };
};
const rows = (graph: any): Record<string, string> =>
    Object.fromEntries((graph.renderReadout().props.children[0].props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));

beforeEach(() => setLanguage('sl'));

test('initialization draws the band, its edges, the line y = L, the marker and a fixed pool of terms and one caption', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({example: 'reciprocal', epsilon: 0.1, limit: 0, threshold: 5, terms: 1, certificateVisible: false});
    expect(graph.presets()).toBe('sequence');
    expect(ofType(graph, 'curve')).toHaveLength(1);
    expect(segments(graph)).toHaveLength(4);
    expect(ofType(graph, 'point')).toHaveLength(2 * SEQUENCE_MAX_TERMS);
    expect(ofType(graph, 'text')).toHaveLength(2);
    expect(boardObjectCount(graph)).toBe(87);
    expect(graph.generatedObjectCount).toBe(boardObjectCount(graph));
    // the view is applied exactly: the index and the value axes have different scales, so equal units are not requested
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, false);
    expect(caption(graph)).toEqual(['aₙ = 1/n', 'ε = 0,1, L = 0, N = 5', 'prikazani členi: 1, v pasu: 0', 'certifikat: skrit', 'krogec: člen v pasu; križec: člen izven pasu']);
    // the band is the closed rectangle between L - epsilon and L + epsilon across the view, and the edges and the line sit at those heights
    band(graph).updateDataArray();
    expect(band(graph).dataX).toEqual([BOX[0], BOX[2], BOX[2], BOX[0], BOX[0]]);
    expect(band(graph).dataY).toEqual([-0.1, -0.1, 0.1, 0.1, -0.1]);
    const height = (segment: any) => resolve(segment.parents[0][1]);
    expect([height(segments(graph)[LOWER_EDGE]), height(segments(graph)[UPPER_EDGE]), height(segments(graph)[LIMIT_LINE])]).toEqual([-0.1, 0.1, 0]);
    expect(segments(graph)[LOWER_EDGE].attributes.dash).toBe(segments(graph)[UPPER_EDGE].attributes.dash);
    expect(segments(graph)[LOWER_EDGE].attributes.dash).toBeGreaterThan(0);
    expect(segments(graph)[LIMIT_LINE].attributes.dash).toBeUndefined();
    // the threshold marker is a vertical line at n = N across the view
    const marker = segments(graph)[THRESHOLD_MARKER];
    expect([resolve(marker.parents[0][0]), resolve(marker.parents[1][0]), resolve(marker.parents[0][1]), resolve(marker.parents[1][1])]).toEqual([5, 5, BOX[3], BOX[1]]);
});

test('terms inside and outside the band differ by shape: a filled circle inside, a cross outside, each at the term (n, a_n)', () => {
    const graph = makeGraph({asyncState: false});
    next(graph, 11);
    expect(graph.model.terms).toBe(12);
    // 1/n at epsilon 0.1: the terms n >= 11 are inside the open band, the tenth sits on its edge and is outside
    expect(shownIn(insidePool(graph))).toEqual([11, 12]);
    expect(shownIn(outsidePool(graph))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(insidePool(graph).every((point: any) => point.attributes.face === 'o')).toBe(true);
    expect(outsidePool(graph).every((point: any) => point.attributes.face === 'x')).toBe(true);
    expect(insidePool(graph)[0].attributes.fillColor).toBe(GraphPalette.primaryCurve);
    expect(outsidePool(graph)[0].attributes.strokeColor).toBe(GraphPalette.warningText);
    // a term is drawn at (n, a_n); the terms alternate in sign for (-1)^n / n
    expect([insidePool(graph)[10].X(), insidePool(graph)[10].Y()]).toEqual([11, 1 / 11]);
    apply(graph, choice('alternating-reciprocal'));
    next(graph, 3);
    expect(outsidePool(graph).slice(0, 4).map((point: any) => point.Y())).toEqual([-1, 0.5, -1 / 3, 0.25]);
    // the open band excludes its edge exactly: a_10 = 0.1 with epsilon 0.1 is a cross, and with epsilon 0.11 a circle
    next(graph, 6);
    expect(shownIn(outsidePool(graph))).toContain(10);
    apply(graph, parameter('sequence-epsilon', 0.11));
    expect(shownIn(insidePool(graph))).toContain(10);
    expect(shownIn(outsidePool(graph))).not.toContain(10);
});

test('the board fits every example: the view of each example holds all forty terms, and the caption corner stays clear of them', () => {
    // the views the graph uses per example, read back through the example choice
    const expected: Record<string, number[]> = {
        'reciprocal': [-4.9, 1.5, 43, -1.5], 'alternating-reciprocal': [-4.9, 1.5, 43, -1.5], 'alternating-sign': [-4.9, 1.6, 43, -3.4], 'natural': [-4.9, 54, 43, -36],
    };
    for (const [id, box] of Object.entries(expected)) {
        const graph = makeGraph();
        apply(graph, choice(id));
        expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(box, false);
        // x covers n = 1..40 with margin and y covers the extreme term
        expect(box[0]).toBeLessThan(1);
        expect(box[2]).toBeGreaterThan(SEQUENCE_MAX_TERMS);
        const extreme = id === 'natural' ? SEQUENCE_MAX_TERMS : 1;
        expect(box[1]).toBeGreaterThan(extreme);
        expect(box[3]).toBeLessThan(id === 'natural' ? 0 : -1);
    }
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [choice('alternating-sign'), parameter('sequence-epsilon', 1.5), command('next-step'), command('next-step'), command('next-step'), reveal(true)]) apply(graph, action);
    expect(graph.model).toEqual({example: 'alternating-sign', epsilon: 1.5, limit: 0, threshold: 5, terms: 4, certificateVisible: true});
    expect(graph.state).toMatchObject({example: 'reciprocal', epsilon: 0.1, terms: 1, certificateVisible: false});
    expect(caption(graph)[2]).toBe('prikazani členi: 4, v pasu: 4');
    expect(statusIds(graph)).toEqual(['epsilon-satisfied']);
    // a later action in the same tick sees the earlier one
    apply(graph, choice('natural'));
    apply(graph, parameter('sequence-limit', 2));
    next(graph, 5);
    apply(graph, parameter('sequence-threshold', 7));
    expect(graph.model).toEqual({example: 'natural', epsilon: 0.5, limit: 2, threshold: 7, terms: 6, certificateVisible: false});
    apply(graph, reveal(true));
    expect(statusTexts(graph)[0]).toContain('3');
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('sequence')!;
    expect(lesson.steps).toHaveLength(7);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph();
        // a deliberately different user state, partly advanced, revealed and playing, that the default scene must reset
        apply(graph, choice('natural'));
        apply(graph, parameter('sequence-epsilon', 2));
        apply(graph, parameter('sequence-limit', 1));
        apply(graph, parameter('sequence-threshold', 9));
        next(graph, 6);
        apply(graph, reveal(true));
        apply(graph, command('play'));
        for (const action of step.scene!.actions) apply(graph, action);
        expect(graph.controller.isPlaying()).toBe(false);
        return graph.model;
    });
    expect(finals).toEqual([
        model({terms: 8}),
        model({terms: 12, threshold: 11, certificateVisible: true}),
        model({epsilon: 0.01, terms: 40}),
        model({...SEQUENCE_EXAMPLE_MODELS['alternating-reciprocal'], terms: 12}),
        model({...SEQUENCE_EXAMPLE_MODELS['alternating-sign'], epsilon: 1.5, terms: 12}),
        model({...SEQUENCE_EXAMPLE_MODELS.natural, terms: 12}),
        model({threshold: 11, terms: 12}),
    ]);
});

test('k Next steps and k playback steps reach the same model, and playback stops when all terms are shown', () => {
    for (const k of [1, 3, 7, 20, SEQUENCE_MAX_STEPS]) {
        const manual = makeGraph();
        next(manual, k);
        const played = makeGraph();
        apply(played, command('play'));
        expect(played.controller.isPlaying()).toBe(true);
        playSteps(played, k);
        apply(played, command('pause'));
        expect(played.model).toEqual(manual.model);
        expect(played.model.terms).toBe(1 + k);
    }
    const graph = makeGraph();
    apply(graph, command('play'));
    // a long frame never skips ahead: one term per frame at most
    graph.frames.frame(0);
    graph.frames.frame(SEQUENCE_STEP_INTERVAL_MS * 10);
    expect(graph.model.terms).toBe(2);
    // a frame shorter than the interval does not step
    graph.frames.frame(SEQUENCE_STEP_INTERVAL_MS / 3);
    expect(graph.model.terms).toBe(2);
});

test('playback ends at the last term, the controls then offer no further step, and a further Next step is rejected', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, command('play'));
    for (let guard = 0; guard < 200 && graph.controller.isPlaying(); guard++) graph.frames.frame(guard === 0 ? 0 : SEQUENCE_STEP_INTERVAL_MS);
    expect(graph.controller.isPlaying()).toBe(false);
    expect(graph.model.terms).toBe(SEQUENCE_MAX_TERMS);
    expect(graph.controller.isComplete()).toBe(true);
    expect(graph.frames.callbacks.size).toBe(0);
    expect(statusIds(graph)).toEqual(['hidden', 'complete']);
    expect(controls(graph).next.props['aria-disabled']).toBe(true);
    expect(controls(graph).play.props['aria-disabled']).toBe(true);
    expect(() => next(graph)).toThrow(DomainError);
    apply(graph, command('play'));
    expect(graph.controller.isPlaying()).toBe(false);
    expect(graph.model.terms).toBe(SEQUENCE_MAX_TERMS);
    // Reset returns to one term and makes the iteration usable again
    controls(graph).reset.props.onClick();
    expect(graph.model.terms).toBe(1);
    next(graph, 3);
    expect(graph.model.terms).toBe(4);
});

test('Next step takes over from playback, and Reset returns to one term and stops playback', () => {
    const graph = makeGraph();
    apply(graph, command('play'));
    playSteps(graph, 2);
    expect(graph.controller.isPlaying()).toBe(true);
    next(graph);
    expect(graph.controller.isPlaying()).toBe(false);
    expect(graph.model.terms).toBe(4);
    apply(graph, command('play'));
    apply(graph, command('reset'));
    expect(graph.model).toEqual({example: 'reciprocal', epsilon: 0.1, limit: 0, threshold: 5, terms: 1, certificateVisible: false});
    expect(graph.controller.isPlaying()).toBe(false);
    expect(graph.frames.callbacks.size).toBe(0);
    apply(graph, command('replay'));
    expect(graph.controller.isPlaying()).toBe(true);
    expect(graph.model.terms).toBe(1);
    playSteps(graph, 2);
    expect(graph.model.terms).toBe(3);
    // Reset keeps the epsilon, L, N and the reveal
    apply(graph, parameter('sequence-epsilon', 0.3));
    apply(graph, reveal(true));
    next(graph, 4);
    apply(graph, command('reset'));
    expect(graph.model).toEqual({example: 'reciprocal', epsilon: 0.3, limit: 0, threshold: 5, terms: 1, certificateVisible: true});
});

test('editing epsilon, L, N or the example pauses playback; only the example reloads its model, the other edits keep the terms and the reveal', () => {
    const edits: Array<[string, (graph: any) => void, Partial<SequenceModel>]> = [
        ['epsilon', graph => apply(graph, parameter('sequence-epsilon', 0.2)), {epsilon: 0.2, terms: 4, certificateVisible: true}],
        ['limit', graph => apply(graph, parameter('sequence-limit', 0.5)), {limit: 0.5, terms: 4, certificateVisible: true}],
        ['threshold', graph => apply(graph, parameter('sequence-threshold', 9)), {threshold: 9, terms: 4, certificateVisible: true}],
        ['example', graph => apply(graph, choice('natural')), {...SEQUENCE_EXAMPLE_MODELS.natural}],
        ['the same example', graph => apply(graph, choice('reciprocal')), {...SEQUENCE_EXAMPLE_MODELS.reciprocal}],
        ['epsilon field', graph => controls(graph).inputEpsilon.props.onChange(0.2), {epsilon: 0.2, terms: 4, certificateVisible: true}],
        ['limit field', graph => controls(graph).inputLimit.props.onChange(0.5), {limit: 0.5, terms: 4, certificateVisible: true}],
        ['threshold field', graph => controls(graph).inputThreshold.props.onChange(9), {threshold: 9, terms: 4, certificateVisible: true}],
        ['example select', graph => controls(graph).select.props.onChange('natural'), {...SEQUENCE_EXAMPLE_MODELS.natural}],
    ];
    for (const [name, edit, expected] of edits) {
        const graph = makeGraph({asyncState: false});
        next(graph, 3);
        apply(graph, reveal(true));
        apply(graph, command('play'));
        expect(graph.controller.isPlaying(), name).toBe(true);
        edit(graph);
        expect(graph.model, name).toEqual({...SEQUENCE_EXAMPLE_MODELS.reciprocal, ...expected});
        expect(graph.controller.isPlaying(), name).toBe(false);
        expect(graph.frames.callbacks.size, name).toBe(0);
        expect(graph.state.terms, name).toBe(graph.model.terms);
        // the iteration continues from the revealed terms: the next step adds exactly one
        const before = graph.model.terms;
        next(graph);
        expect(graph.model.terms, name).toBe(before + 1);
    }
    // a repeated value is not an edit and keeps playback
    const graph = makeGraph();
    next(graph, 2);
    apply(graph, command('play'));
    apply(graph, parameter('sequence-epsilon', 0.1));
    apply(graph, parameter('sequence-limit', 0));
    apply(graph, parameter('sequence-threshold', 5));
    expect(graph.controller.isPlaying()).toBe(true);
    expect(graph.model.terms).toBe(3);
    // showing or hiding the certificate does not stop playback
    apply(graph, reveal(true));
    expect(graph.controller.isPlaying()).toBe(true);
});

test('controls and lesson actions give equivalent models', () => {
    const viaActions = makeGraph({asyncState: false});
    apply(viaActions, choice('alternating-sign'));
    apply(viaActions, parameter('sequence-epsilon', 0.75));
    apply(viaActions, parameter('sequence-limit', -0.5));
    apply(viaActions, parameter('sequence-threshold', 20));
    next(viaActions, 6);
    apply(viaActions, reveal(true));

    const viaControls = makeGraph({asyncState: false});
    controls(viaControls).select.props.onChange('alternating-sign');
    controls(viaControls).inputEpsilon.props.onChange(0.75);
    controls(viaControls).inputLimit.props.onChange(-0.5);
    controls(viaControls).inputThreshold.props.onChange(20);
    for (let i = 0; i < 6; i++) controls(viaControls).next.props.onClick();
    controls(viaControls).toggle.props.onClick();

    expect(viaControls.model).toEqual(viaActions.model);
    expect(viaControls.model).toEqual({example: 'alternating-sign', epsilon: 0.75, limit: -0.5, threshold: 20, terms: 7, certificateVisible: true});
    expect(rows(viaControls)).toEqual(rows(viaActions));
    expect(statusTexts(viaControls)).toEqual(statusTexts(viaActions));
    expect(caption(viaControls)).toEqual(caption(viaActions));
    // Play from the control and the lesson command run the same transition
    controls(viaControls).play.props.onClick();
    apply(viaActions, command('play'));
    playSteps(viaControls, 3);
    playSteps(viaActions, 3);
    expect(viaControls.model).toEqual(viaActions.model);
    expect(viaControls.model.terms).toBe(10);
});

test('values outside the domain are rejected without changing the model, never clamped', () => {
    const graph = makeGraph();
    next(graph, 2);
    const before = {...graph.model};
    for (const bad of [0, -0.1, 0.005, 0.015, 0.105, 2.01, 3, NaN, Infinity, -Infinity]) expect(() => apply(graph, parameter('sequence-epsilon', bad)), `epsilon ${bad}`).toThrow(DomainError);
    for (const bad of [-2.01, 2.01, 10, NaN, Infinity, -Infinity, 0.3333, 0.005, 1e-10, -1e-10]) expect(() => apply(graph, parameter('sequence-limit', bad)), `limit ${bad}`).toThrow(DomainError);
    for (const bad of [0, -1, 1001, 2.5, NaN, Infinity]) expect(() => apply(graph, parameter('sequence-threshold', bad)), `threshold ${bad}`).toThrow(DomainError);
    expect(() => apply(graph, choice('harmonic'))).toThrow(DomainError);
    expect(graph.model).toEqual(before);
    // the boundary values are accepted
    for (const good of [0.01, 2, 0.07]) apply(graph, parameter('sequence-epsilon', good));
    for (const good of [-2, 2, 0.33]) apply(graph, parameter('sequence-limit', good));
    for (const good of [1, 1000, 37]) apply(graph, parameter('sequence-threshold', good));
    expect(graph.model).toMatchObject({epsilon: 0.07, limit: 0.33, threshold: 37, terms: 3});
    // the inspector swallows exactly the domain errors and reports the rejection to the input
    const {inputEpsilon, inputLimit, inputThreshold} = controls(graph);
    expect(inputEpsilon.props.onChange(0.015)).toBe(false);
    expect(inputEpsilon.props.onChange(0.5)).toBe(true);
    expect(inputLimit.props.onChange(7)).toBe(false);
    expect(inputThreshold.props.onChange(1.5)).toBe(false);
    expect(graph.model).toMatchObject({epsilon: 0.5, limit: 0.33, threshold: 37});
    expect([inputEpsilon, inputLimit, inputThreshold].map((input: any) => [input.props.min, input.props.max])).toEqual([[0.01, 2], [-2, 2], [1, 1000]]);
});

test('floating-point noise in typed epsilon and L values is cleaned to the grid, and real off-grid digits are rejected, not rounded', () => {
    const graph = makeGraph();
    apply(graph, parameter('sequence-epsilon', 0.07));
    apply(graph, parameter('sequence-epsilon', 0.1 + 0.2 - 0.2));
    expect(graph.model.epsilon).toBe(0.1);
    apply(graph, parameter('sequence-limit', 0.1 + 0.2));
    expect(graph.model.limit).toBe(0.3);
    apply(graph, parameter('sequence-limit', -0));
    expect(Object.is(graph.model.limit, 0)).toBe(true);
});

test('the certificate readout for each kind of verdict, hidden until Show certificate and independent of the shown terms', () => {
    const graph = makeGraph({asyncState: false});
    next(graph, 11);
    // hidden: the readouts say so and the status asks for a prediction
    expect(rows(graph)).toMatchObject({
        terms: '12', epsilon: '0,1', limit: '0', threshold: '5', 'last-term': '0,0833', distance: '0,0833', 'in-band': 'v pasu', 'in-band-count': '2 od 12',
        certificate: 'skrito', 'n-min': 'skrito', bound: 'skrito',
    });
    expect(Object.keys(rows(graph))).toEqual(['terms', 'epsilon', 'limit', 'threshold', 'last-term', 'distance', 'in-band', 'in-band-count', 'certificate', 'n-min', 'bound']);
    expect(statusIds(graph)).toEqual(['hidden']);
    // a hidden certificate is not a refusal: the caption line uses the neutral colour
    expect(graph.captionColors()[3]).toBe(GraphPalette.label);

    // N = 5 does not work for 1/n at epsilon 0.1: the first failing index is 5, the least working N is 11
    apply(graph, reveal(true));
    expect(rows(graph)).toMatchObject({certificate: 'N ne deluje', 'n-min': '11', bound: '1/5 = 0,2'});
    expect(statusIds(graph)).toEqual(['threshold-fails']);
    expect(statusTexts(graph)[0]).toContain('N = 5 ne deluje');
    expect(statusTexts(graph)[0]).toContain('N · ε = 0,5 ≤ 1');
    // N = 10 sits exactly on the edge and does not work, N = 11 does
    apply(graph, parameter('sequence-threshold', 10));
    expect(rows(graph).certificate).toBe('N ne deluje');
    expect(statusTexts(graph)[0]).toContain('N · ε = 1 ≤ 1');
    apply(graph, parameter('sequence-threshold', 11));
    expect(rows(graph)).toMatchObject({certificate: 'N deluje', 'n-min': '11', bound: '1/11 = 0,0909'});
    expect(statusIds(graph)).toEqual(['certified']);
    expect(statusTexts(graph)[0]).toContain('N · ε = 1,1 > 1');
    // the board caption states the verdict in words and in the confirming colour
    expect(caption(graph)[3]).toBe('certifikat: N deluje');
    expect(graph.captionColors()[3]).toBe(GraphPalette.primaryCurve);

    // fewer shown terms than the least working N: the answer does not change, a status says that N_min lies beyond the shown terms
    apply(graph, command('reset'));
    next(graph, 7);
    expect(graph.model.terms).toBe(8);
    expect(rows(graph)).toMatchObject({certificate: 'N deluje', 'n-min': '11', 'in-band-count': '0 od 8'});
    expect(statusIds(graph)).toEqual(['certified', 'beyond-terms', 'n-min-beyond-terms']);
    expect(statusTexts(graph)[1]).toContain('N = 11 je onkraj prikazanih členov (n ≤ 8)');
    expect(caption(graph).some(line => line === 'N je onkraj prikazanih členov')).toBe(true);
    apply(graph, command('reset'));
    expect(rows(graph)).toMatchObject({certificate: 'N deluje', 'n-min': '11', 'in-band-count': '0 od 1'});

    // epsilon 0.01 and N = 101: beyond all forty terms the app can show; the certificate still holds by the formula
    apply(graph, parameter('sequence-epsilon', 0.01));
    apply(graph, parameter('sequence-threshold', 101));
    next(graph, 39);
    expect(graph.model.terms).toBe(SEQUENCE_MAX_TERMS);
    expect(rows(graph)).toMatchObject({certificate: 'N deluje', 'n-min': '101', bound: '1/101 = 0,0099', 'in-band-count': '0 od 40'});
    expect(statusIds(graph)).toEqual(['certified', 'beyond-terms', 'n-min-beyond-terms', 'complete']);
    expect(statusTexts(graph)[1]).toContain('N = 101 je onkraj prikazanih členov (n ≤ 40)');
    expect(statusTexts(graph)[2]).toContain('onkraj vseh 40 členov');
    // a threshold beyond the shown terms is never cut to the window: N = 100 fails at n = 100 whatever is shown
    apply(graph, parameter('sequence-threshold', 100));
    expect(rows(graph).certificate).toBe('N ne deluje');
    expect(statusTexts(graph)[0]).toContain('pri n = 100');
    // hiding the certificate hides the readouts again
    apply(graph, reveal(false));
    expect(rows(graph)).toMatchObject({certificate: 'skrito', 'n-min': 'skrito', bound: 'skrito'});

    // L different from the limit: no certificate, the limit is named
    apply(graph, choice('reciprocal'));
    apply(graph, parameter('sequence-limit', 0.5));
    apply(graph, reveal(true));
    expect(rows(graph)).toMatchObject({certificate: 'L ni limita', 'n-min': '—', bound: '—'});
    expect(statusIds(graph)).toEqual(['not-the-limit']);
    expect(statusTexts(graph)[0]).toContain('limita je 0');
    expect(caption(graph)[3]).toBe('certifikat: L ni limita');
    expect(graph.captionColors()[3]).toBe(GraphPalette.warningText);

    // (-1)^n: the band holds every shown term at epsilon 1.5, which is one epsilon and no certificate; at epsilon <= 1 + |L| no N works
    apply(graph, choice('alternating-sign'));
    apply(graph, parameter('sequence-epsilon', 1.5));
    next(graph, 5);
    apply(graph, reveal(true));
    expect(rows(graph)).toMatchObject({certificate: 'izpolnjen le ta ε', 'n-min': '—', bound: '—', 'in-band-count': '6 od 6'});
    expect(statusIds(graph)).toEqual(['epsilon-satisfied']);
    for (const epsilon of [1, 0.5, 0.01]) {
        apply(graph, parameter('sequence-epsilon', epsilon));
        expect(rows(graph).certificate, `epsilon ${epsilon}`).toBe('ni certifikata (nihanje)');
        expect(statusIds(graph)).toEqual(['oscillating']);
    }
    expect(statusTexts(graph)[0]).toContain('1 + |L| = 1 ≥ ε = 0,01');
    // the boundary of the other candidate: L = 0.5 puts the farther value at distance 1.5, so epsilon 1.5 still fails
    apply(graph, parameter('sequence-limit', 0.5));
    apply(graph, parameter('sequence-epsilon', 1.5));
    expect(statusIds(graph)).toEqual(['oscillating']);
    apply(graph, parameter('sequence-epsilon', 1.6));
    expect(statusIds(graph)).toEqual(['epsilon-satisfied']);
    expect(statusTexts(graph)[0]).toContain('1 + |L| = 1,5 < ε = 1,6');

    // n: the terms leave every band for good; the index is named
    apply(graph, choice('natural'));
    apply(graph, reveal(true));
    expect(rows(graph)).toMatchObject({certificate: 'ni certifikata (neomejeno)', 'n-min': '—', bound: '—'});
    expect(statusIds(graph)).toEqual(['divergent']);
    expect(statusTexts(graph)[0]).toContain('n ≥ 1');
    apply(graph, parameter('sequence-limit', 2));
    expect(statusTexts(graph)[0]).toContain('n ≥ 3');
    next(graph, 39);
    expect(statusIds(graph)).toEqual(['divergent', 'complete']);
});

test('no certificate is ever given for (-1)^n or n, whatever the window, epsilon or L', () => {
    for (const example of ['alternating-sign', 'natural']) {
        for (const terms of [1, 12, 40]) {
            for (const epsilon of [0.01, 0.5, 1, 1.5, 2]) {
                for (const limit of [-2, -0.5, 0, 1, 2]) {
                    const graph = makeGraph({asyncState: false});
                    apply(graph, choice(example));
                    apply(graph, parameter('sequence-epsilon', epsilon));
                    apply(graph, parameter('sequence-limit', limit));
                    next(graph, terms - 1);
                    apply(graph, reveal(true));
                    expect(statusIds(graph)[0]).not.toBe('certified');
                    expect(rows(graph)['n-min']).toBe('—');
                    expect(rows(graph).certificate).not.toBe('N deluje');
                }
            }
        }
    }
});

test('an epsilon that is satisfied is told apart from convergence for L where 1 + |L| < epsilon is false', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('alternating-sign'));
    apply(graph, parameter('sequence-limit', 1));
    apply(graph, parameter('sequence-epsilon', 1.5));
    apply(graph, reveal(true));
    // L = 1: the value -1 is at distance 2, outside the band of half-width 1.5, so this is not "every term is in the band"
    expect(statusIds(graph)).toEqual(['oscillating']);
    expect(rows(graph)['in-band-count']).toBe('0 od 1');
});

test('names, kinds and commands the graph does not own are unsupported, and iteration commands outside the supported set are rejected', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'y1', 'x2', 'y2', 'k', 'n', 'a', 'A', 'omega', 'phi', 'B', 'x0', 'h', 'b', 'bisect-a', 'taylor-x']) {
        expect(() => apply(graph, {kind: 'function-parameter', name, value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'function-choice', name: 'taylor-example', value: 'sine'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-visibility', target: 'taylor-bound', visible: true})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, command('stop'))).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'bisection', command: 'play'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'decasteljau', command: 'play'})).toThrow(UnsupportedLessonActionError);
    for (const supported of ['play', 'pause', 'replay', 'next-step', 'reset']) expect(graph.supportsLessonAction(command(supported))).toBe(true);
    expect(graph.supportsLessonAction(command('stop'))).toBe(false);
    expect(graph.supportsLessonAction(parameter('sequence-epsilon', 0.1))).toBe(true);
    expect(graph.supportsLessonAction(choice('natural'))).toBe(true);
    expect(graph.supportsLessonAction(reveal(true))).toBe(true);
    expect(graph.model).toEqual({example: 'reciprocal', epsilon: 0.1, limit: 0, threshold: 5, terms: 1, certificateVisible: false});
});

test('controls: example select, three number fields, Next step, Play/Pause, Reset and Show certificate with their states', () => {
    const graph = makeGraph({asyncState: false});
    const first = controls(graph);
    expect(first.select.props.options.map((option: any) => option.value)).toEqual(['reciprocal', 'alternating-reciprocal', 'alternating-sign', 'natural']);
    expect(first.select.props.options.map((option: any) => option.text)).toEqual(['aₙ = 1/n', 'aₙ = (−1)ⁿ/n', 'aₙ = (−1)ⁿ', 'aₙ = n']);
    expect(first.found.NumberInput.map((input: any) => input.props.label)).toEqual(['Širina pasu ε', 'Kandidat za limito L', 'Prag N']);
    expect(first.found.NumberInput.map((input: any) => input.props.value)).toEqual([0.1, 0, 5]);
    expect(first.found.button.map((button: any) => button.props['data-action'])).toEqual(['next-step', 'play-pause', 'reset', 'toggle-sequence-certificate']);
    expect(first.next.props['aria-disabled']).toBe(false);
    expect(first.play.props['aria-disabled']).toBe(false);
    expect(first.reset.props['aria-disabled']).toBe(true);
    expect(first.play.props.children).toBe('Predvajaj');
    expect(first.toggle.props['data-revealed']).toBe(false);

    first.next.props.onClick();
    expect(graph.model.terms).toBe(2);
    expect(controls(graph).reset.props['aria-disabled']).toBe(false);
    controls(graph).play.props.onClick();
    expect(graph.controller.isPlaying()).toBe(true);
    const playing = controls(graph);
    expect(playing.play.props.children).toBe('Premor');
    // the label swap is the one state cue: a toggle with a swapped label has no aria-pressed (it would be announced twice)
    expect(playing.play.props['aria-pressed']).toBeUndefined();
    expect(playing.next.props['aria-disabled']).toBe(true);
    playing.play.props.onClick();
    expect(graph.controller.isPlaying()).toBe(false);
    expect(controls(graph).play.props.children).toBe('Predvajaj');
    controls(graph).toggle.props.onClick();
    expect(graph.model.certificateVisible).toBe(true);
    expect(controls(graph).toggle.props.children).toBe('Skrij certifikat');
    expect(controls(graph).toggle.props['data-revealed']).toBe(true);
    controls(graph).reset.props.onClick();
    expect(graph.model.terms).toBe(1);
    setLanguage('en');
    const english = controls(graph);
    expect(english.next.props.children).toBe('Next step');
    expect(english.reset.props.children).toBe('Reset');
    expect(english.play.props.children).toBe('Play');
    expect(english.toggle.props.children).toBe('Hide certificate');
    expect(english.found.NumberInput.map((input: any) => input.props.label)).toEqual(['Band width ε', 'Candidate limit L', 'Threshold N']);
    expect(collect([graph.renderControls(), graph.renderReveals()]).div.some((element: any) => element.props.role === 'group' && element.props['aria-label'] === 'Term controls')).toBe(true);
});

test('presets save the model with the terms and the reveal, reopen paused and never start playback', () => {
    const graph = makeGraph();
    next(graph, 5);
    apply(graph, reveal(true));
    apply(graph, command('play'));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('sequence');
    expect(exported.data).toEqual({example: 'reciprocal', epsilon: 0.1, limit: 0, threshold: 5, terms: 6, certificateVisible: true});
    expect(JSON.stringify(exported)).not.toMatch(/play|running|status/i);

    const reopened = makeGraph({asyncState: false});
    apply(reopened, command('play'));
    expect(reopened.controller.isPlaying()).toBe(true);
    reopened.importPreset({id: 'sequence', boardState: {boundingBox: [-1, 1, 1, -1]}, data: exported.data});
    expect(reopened.model).toEqual(exported.data);
    expect(reopened.controller.isPlaying()).toBe(false);
    expect(reopened.frames.callbacks.size).toBe(0);
    expect(caption(reopened)[2]).toBe('prikazani členi: 6, v pasu: 0');
    // continuing from the loaded terms gives the same state as never having left them
    next(reopened);
    next(graph);
    expect(reopened.model).toEqual(graph.model);

    // a string, a missing optional property and extra properties are sanitized; a full set of terms reopens as a finished iteration
    reopened.importPresetData(JSON.stringify({example: 'natural', epsilon: 1.25, limit: -0.5, threshold: 40, terms: 40, certificateVisible: false, extra: true}));
    expect(reopened.model).toEqual({example: 'natural', epsilon: 1.25, limit: -0.5, threshold: 40, terms: 40, certificateVisible: false});
    expect(reopened.controller.isComplete()).toBe(true);
    expect(controls(reopened).next.props['aria-disabled']).toBe(true);
    expect(() => next(reopened)).toThrow(DomainError);
    reopened.importPresetData({...exported.data, terms: 3});
    expect(reopened.controller.isComplete()).toBe(false);
    next(reopened);
    expect(reopened.model.terms).toBe(4);
});

test('a preset of another example without a view shows that example view, like choosing the example', () => {
    const graph = makeGraph();
    graph.board.setBoundingBox.mockClear();
    graph.importPreset({id: 'sequence', data: {...SEQUENCE_EXAMPLE_MODELS.natural}});
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-4.9, 54, 43, -36], false);
});

test('malformed preset data is rejected to the default model with a warning', () => {
    const graph = makeGraph();
    next(graph, 2);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const valid = {example: 'reciprocal', epsilon: 0.1, limit: 0, threshold: 5, terms: 1, certificateVisible: false};
    const bad = [undefined, null, 'not json', {}, [], {...valid, example: 'harmonic'}, {...valid, epsilon: 0}, {...valid, epsilon: 0.015}, {...valid, epsilon: 2.5}, {...valid, epsilon: '0.1'},
        {...valid, limit: 2.5}, {...valid, limit: '0'}, {...valid, threshold: 0}, {...valid, threshold: 1001}, {...valid, threshold: 1.5}, {...valid, terms: 0}, {...valid, terms: 41},
        {...valid, terms: 1.5}, {...valid, terms: '2'}, {...valid, certificateVisible: 'true'}, {...valid, certificateVisible: undefined}];
    for (const entry of bad) {
        graph.importPresetData(entry);
        expect(graph.model, JSON.stringify(entry)).toEqual(valid);
        expect(graph.controller.isPlaying()).toBe(false);
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
});

test('capture and restore bring back the synchronous model and leave playback paused', () => {
    const graph = makeGraph();
    apply(graph, choice('alternating-reciprocal'));
    apply(graph, parameter('sequence-epsilon', 0.25));
    next(graph, 3);
    apply(graph, reveal(true));
    apply(graph, command('play'));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({example: 'alternating-reciprocal', epsilon: 0.25, limit: 0, threshold: 5, terms: 4, certificateVisible: true});
    expect(checkpoint.value.graphState).toMatchObject({example: 'alternating-reciprocal', epsilon: 0.25, terms: 4, certificateVisible: true});
    apply(graph, defaultScene);
    apply(graph, command('play'));
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual(checkpoint.value.data);
    expect(graph.controller.isPlaying()).toBe(false);
    expect(graph.frames.callbacks.size).toBe(0);
    expect(graph.setState).toHaveBeenLastCalledWith(expect.objectContaining({example: 'alternating-reciprocal', epsilon: 0.25, terms: 4}));
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, false);
    // the iteration continues from the restored terms
    next(graph);
    expect(graph.model.terms).toBe(5);
});

test('lesson lifecycle, figure capture, export and scene replacement pause playback', () => {
    const pauses: Array<[string, (graph: any) => void]> = [
        ['stopLessonAnimations', graph => graph.stopLessonAnimations()],
        ['beforeFigureCapture', graph => graph.beforeFigureCapture()],
        ['initialize (scene replacement)', graph => graph.initialize()],
        ['disposeFigureScene', graph => graph.disposeFigureScene()],
        ['prepared default scene', graph => apply(graph, defaultScene)],
        ['preset import', graph => graph.importPreset({id: 'sequence', data: {example: 'natural', epsilon: 0.5, limit: 0, threshold: 5, terms: 3, certificateVisible: false}})],
        ['explicit pause command', graph => apply(graph, command('pause'))],
    ];
    for (const [name, pause] of pauses) {
        const graph = makeGraph();
        next(graph, 2);
        apply(graph, command('play'));
        expect(graph.controller.isPlaying(), name).toBe(true);
        pause(graph);
        expect(graph.controller.isPlaying(), name).toBe(false);
        expect(graph.frames.callbacks.size, name).toBe(0);
    }
    // the base graph calls the capture hook before a single figure export and before a figure batch
    for (const exportFigure of [(graph: any) => graph.saveAsSVG('figure'), (graph: any) => graph.saveAsPNG2('figure'), (graph: any) => graph.exportPresetFigures([])]) {
        const graph = makeGraph();
        graph.board.containerObj = document.createElement('div');
        graph.board.renderer = {};
        apply(graph, command('play'));
        const hook = vi.spyOn(graph, 'beforeFigureCapture');
        exportFigure(graph);
        expect(hook).toHaveBeenCalledTimes(1);
        expect(graph.controller.isPlaying()).toBe(false);
    }
});

test('a capture in progress blocks Next step and Play so the export shows one settled scene', () => {
    const graph = makeGraph();
    graph.figureBatchActive = true;
    next(graph);
    apply(graph, command('play'));
    expect(graph.model.terms).toBe(1);
    expect(graph.controller.isPlaying()).toBe(false);
    graph.figureBatchActive = false;
    next(graph);
    expect(graph.model.terms).toBe(2);
});

test('unmount disposes the controller: no timer, no callback and no generated object remains', () => {
    const graph = makeGraph();
    next(graph, 2);
    apply(graph, command('play'));
    graph.frames.frame(0);
    expect(graph.frames.callbacks.size).toBe(1);
    const controller = graph.controller;
    graph.unmount();
    expect(graph.frames.callbacks.size).toBe(0);
    expect(controller.isPlaying()).toBe(false);
    expect(graph.generatedObjectCount).toBe(0);
    // a frame, a Next step or a late playback command after unmount changes nothing and throws nothing
    expect(graph.frames.frame(SEQUENCE_STEP_INTERVAL_MS)).toBe(false);
    expect(controller.nextStep()).toBe(false);
    controller.play();
    expect(graph.frames.callbacks.size).toBe(0);
    expect(graph.model).toEqual({example: 'reciprocal', epsilon: 0.1, limit: 0, threshold: 5, terms: 1, certificateVisible: false});
});

test('generated objects are disposed and not duplicated across repeated generation, examples and default scenes', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    expect(baseline).toBe(87);
    for (let i = 0; i < 4; i++) graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    expect(graph.generatedObjectCount).toBe(baseline);
    for (let i = 0; i < 5; i++) {
        apply(graph, choice('natural'));
        next(graph, 12);
        apply(graph, reveal(true));
        apply(graph, defaultScene);
    }
    // whatever the example, the number of terms or the reveal, the pool is the same fixed set of objects
    expect(boardObjectCount(graph)).toBe(baseline);
    next(graph, SEQUENCE_MAX_STEPS);
    expect(boardObjectCount(graph)).toBe(baseline);
    graph.disposeFigureScene();
    expect(boardObjectCount(graph)).toBe(0);
    expect(graph.generatedObjectCount).toBe(0);
    // a model change after disposal must not touch removed objects
    expect(() => apply(graph, command('reset'))).not.toThrow();
    graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
});

test('the caption follows the language and a language change notifies subscribers (the board text is re-evaluated on update)', () => {
    const graph = makeGraph({asyncState: false});
    next(graph, 11);
    apply(graph, reveal(true));
    apply(graph, parameter('sequence-threshold', 11));
    expect(caption(graph)).toEqual(['aₙ = 1/n', 'ε = 0,1, L = 0, N = 11', 'prikazani členi: 12, v pasu: 2', 'certifikat: N deluje', 'krogec: člen v pasu; križec: člen izven pasu']);
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(currentLanguage()).toBe('en');
    expect(caption(graph)).toEqual(['aₙ = 1/n', 'ε = 0.1, L = 0, N = 11', 'shown terms: 12, in the band: 2', 'certificate: N works', 'circle: term inside the band; cross: term outside the band']);
    // the threshold label and the readouts follow as well
    expect(thresholdLabel(graph).parents[2]()).toContain('N = 11');
    expect(rows(graph)).toMatchObject({certificate: 'N works', 'in-band': 'inside the band', 'in-band-count': '2 of 12', 'n-min': '11'});
    expect(statusTexts(graph)[0]).toBe('N = 11 works: for every n ≥ 11, |aₙ − L| = 1/n ≤ 1/11 < ε, because N · ε = 1.1 > 1. The least working N is 11.');
    unsubscribe();
});

test('below 520 px the board uses compact labels: N alone for the marker and fewer caption lines, with no label placed on an axis', () => {
    const graph = makeGraph();
    apply(graph, reveal(true));
    expect(thresholdLabel(graph).parents[2]()).toContain('N = 5');
    // one term is shown and N = 5 lies beyond it, so the revealed certificate adds the line about that
    expect(caption(graph)).toHaveLength(6);
    graph.board.canvasWidth = COMPACT_BOARD_WIDTH - 1;
    expect(thresholdLabel(graph).parents[2]()).toBe('<div>N</div>');
    expect(caption(graph)).toEqual(['aₙ = 1/n', 'ε = 0,1, L = 0, N = 5', 'prikazani členi: 1, v pasu: 0', 'certifikat: N ne deluje']);
    graph.board.canvasWidth = COMPACT_BOARD_WIDTH;
    expect(caption(graph)).toHaveLength(6);
    // the threshold label sits at the top edge of the view, anchored below it, and the caption in the bottom-right corner: neither on an axis
    expect(thresholdLabel(graph).attributes.anchorY).toBe('top');
    expect(resolve(thresholdLabel(graph).parents[1])).toBeGreaterThan(BOX[1] - 0.06 * (BOX[1] - BOX[3]));
    expect(thresholdLabel(graph).attributes.fixed).toBe(true);
    // a threshold beyond the view hides the marker and its label
    apply(graph, parameter('sequence-threshold', 101));
    expect(resolve(thresholdLabel(graph).attributes.visible)).toBe(false);
    expect(resolve(segments(graph)[THRESHOLD_MARKER].attributes.visible)).toBe(false);
    apply(graph, parameter('sequence-threshold', 40));
    expect(resolve(thresholdLabel(graph).attributes.visible)).toBe(true);
    // the long board line about a threshold beyond the shown terms is dropped below 520 px, the status in the inspector keeps it
    graph.board.canvasWidth = COMPACT_BOARD_WIDTH - 1;
    expect(caption(graph).some(line => line.includes('onkraj'))).toBe(false);
    expect(statusIds(graph)).toContain('beyond-terms');
});

test('the legend names the shapes, the band, the line y = L and the marker in words, with the line patterns', () => {
    const graph = makeGraph();
    const items = graph.renderLegend().props.items as { id: string; label: string; kind: string }[];
    expect(items.map(item => [item.id, item.kind])).toEqual([['inside', 'dot'], ['outside', 'cross'], ['band', 'area'], ['limit', 'line'], ['threshold', 'dotted-line']]);
    expect(items[0].label).toMatch(/poln krogec/);
    expect(items[1].label).toMatch(/križec/);
    setLanguage('en');
    expect(graph.renderLegend().props.items.map((item: any) => item.label)).toEqual([
        'Term inside the band: filled circle', 'Term outside the band: cross', 'Band between L − ε and L + ε: shaded region with dashed edges',
        'Candidate limit L: horizontal solid line y = L', 'Threshold N: vertical line at n = N',
    ]);
});

test('no readout, caption, label or status ever shows NaN, Infinity or a raw undefined, in either language', () => {
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        for (const id of ['reciprocal', 'alternating-reciprocal', 'alternating-sign', 'natural']) {
            for (const epsilon of [0.01, 1, 2]) {
                for (const limit of [-2, 0, 2]) {
                    for (const visible of [false, true]) {
                        const graph = makeGraph({asyncState: false});
                        apply(graph, choice(id));
                        apply(graph, parameter('sequence-epsilon', epsilon));
                        apply(graph, parameter('sequence-limit', limit));
                        apply(graph, parameter('sequence-threshold', epsilon === 0.01 ? 1000 : 7));
                        next(graph, 39);
                        apply(graph, reveal(visible));
                        const text = [...caption(graph), ...Object.values(rows(graph)), ...statusTexts(graph)].join(' | ');
                        expect(text, `${language} ${id} ${epsilon} ${limit} ${visible}`).not.toMatch(/NaN|Infinity|undefined|-0\b/);
                    }
                }
            }
        }
    }
});

test('Fit restores the example view instead of a canvas-aspect box, because the axes have different units', () => {
    const graph = makeGraph({asyncState: false});
    graph.board.container = document.createElement('div');
    graph.board.applyZoom = vi.fn();
    for (const [id, view] of [['reciprocal', [-4.9, 1.5, 43, -1.5]], ['alternating-sign', [-4.9, 1.6, 43, -3.4]], ['natural', [-4.9, 54, 43, -36]]] as const) {
        apply(graph, choice(id));
        graph.board.setBoundingBox.mockClear();
        graph.navigateBoard('fit');
        expect(graph.board.setBoundingBox).toHaveBeenCalledTimes(1);
        expect(graph.board.setBoundingBox).toHaveBeenCalledWith(view, false, 'update');
        expect(graph.board.applyZoom).toHaveBeenCalled();
    }
});

test('a scene replaced while playing pauses the iteration and requests a render so Play/Pause updates', () => {
    const graph = makeGraph({asyncState: false});
    controls(graph).play.props.onClick();
    expect(graph.controller.isPlaying()).toBe(true);
    graph.requestRender = vi.fn();
    graph.onSceneRemoved();
    expect(graph.controller.isPlaying()).toBe(false);
    expect(graph.requestRender).toHaveBeenCalled();
});
