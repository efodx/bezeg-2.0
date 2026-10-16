import {COMPACT_BOARD_WIDTH, FIXED_POINT_STEP_INTERVAL_MS, FixedPointGraph} from './FixedPointGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {FIXED_POINT_MAX_STEPS, fixedPointHistory} from '../../analysis/fixedPoint';
import {defaultFixedPointModel, FixedPointModel} from '../../analysis/fixedPointModel';
import {currentLanguage, onLanguageChange, setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';

// The export itself is not under test: only that it pauses the iteration before it captures the board.
vi.mock('../base/export/FigureCapture', () => ({downloadSVG: vi.fn(() => Promise.resolve()), downloadPNG: vi.fn(() => Promise.resolve())}));
vi.mock('../base/export/PresetFigureBatch', () => ({downloadPresetFigures: vi.fn(() => Promise.resolve())}));

/** The reference fixed point of cos on [0, 1] (the Dottie number), not computed by the app. */
const COS_FIXED_POINT = 0.7390851332151607;
const AFFINE_BOX = [-2.84, 2.9, 4.84, -0.3];
const SMALL_BOX = [-1.72, 1.65, 2.72, -0.2];

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
        getBoundingBox: vi.fn(() => AFFINE_BOX),
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
    const graph = new FixedPointGraph(frames.scheduler) as any;
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
    const target = graph.model.step + steps;
    graph.frames.frame(0);
    for (let guard = 0; guard < steps * 3 && graph.model.step < target && graph.controller.isPlaying(); guard++) {
        graph.frames.frame(FIXED_POINT_STEP_INTERVAL_MS);
    }
}

/** Plays until the controller stops by itself. */
function playToEnd(graph: any) {
    graph.frames.frame(0);
    for (let guard = 0; guard < 200 && graph.controller.isPlaying(); guard++) graph.frames.frame(FIXED_POINT_STEP_INTERVAL_MS);
}

const apply = (graph: any, action: LessonAction) => graph.applyLessonAction(action);
type ParameterName = 'fixed-point-x0' | 'fixed-point-digits';
const parameter = (name: ParameterName, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'fixed-point-example', value});
const reveal = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'fixed-point-bound', visible});
const command = (value: any): LessonAction => ({kind: 'animation', animationId: 'fixed-point', command: value});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const next = (graph: any, count = 1) => { for (let i = 0; i < count; i++) apply(graph, command('next-step')); };
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const boardObjectCount = (graph: any) => graph.board.objectsList.length;
const caption = (graph: any): string[] => graph.captionPlainLines();
const statusIds = (graph: any) => graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: { id: string }) => status.id);
const statusTexts = (graph: any) => graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: { text: string }) => status.text);
const model = (overrides: Partial<FixedPointModel>): FixedPointModel => ({...defaultFixedPointModel('affine'), ...overrides});
const defaultOf = (example: 'affine' | 'cosine' | 'reflection') => defaultFixedPointModel(example);

// Creation order: the interval box and the cobweb (curves), the diagonal, the drop line and the bound bar (segments), the map (functiongraph),
// the pool of iterate points (k = 1..59), then the start ring, the current iterate, the fixed point cross and the x-axis marker, then the x_k label and the caption.
const curves = (graph: any) => ofType(graph, 'curve');
const segments = (graph: any) => ofType(graph, 'segment');
const [BOX, COBWEB] = [0, 1];
const [DIAGONAL, DROP_LINE, BOUND_BAR] = [0, 1, 2];
const ITERATE_POOL = FIXED_POINT_MAX_STEPS - 1;
const iteratePool = (graph: any) => ofType(graph, 'point').slice(0, ITERATE_POOL);
const [START_RING, CURRENT_POINT, FIXED_CROSS, AXIS_MARKER] = [ITERATE_POOL, ITERATE_POOL + 1, ITERATE_POOL + 2, ITERATE_POOL + 3];
const point = (graph: any, index: number) => ofType(graph, 'point')[index];
const at = (object: any): [number, number] => [resolve(object.parents[0]), resolve(object.parents[1])];
const stepLabel = (graph: any) => ofType(graph, 'text')[0];
const shownIterates = (graph: any) => iteratePool(graph).map((object: any, index: number) => resolve(object.attributes.visible) ? index + 1 : 0).filter(Boolean);

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
    const button = (action: string) => found.button.find((element: any) => element.props['data-action'] === action);
    const [inputX0, inputDigits] = found.NumberInput;
    return {
        found, inputX0, inputDigits, select: found.ChoiceSelect[0],
        next: button('next-step'), play: button('play-pause'), reset: button('reset'), toggle: button('toggle-fixed-point-bound'),
    };
};
const rows = (graph: any): Record<string, string> =>
    Object.fromEntries((graph.renderReadout().props.children[0].props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));

beforeEach(() => setLanguage('sl'));

test('initialization draws the box, the diagonal, the map, the cobweb, the markers and one caption from a fixed pool of objects', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({example: 'affine', x0: 0, step: 0, digits: 3, boundVisible: false});
    expect(graph.presets()).toBe('fixed-point');
    expect(curves(graph)).toHaveLength(2);
    expect(segments(graph)).toHaveLength(3);
    expect(ofType(graph, 'functiongraph')).toHaveLength(1);
    expect(ofType(graph, 'point')).toHaveLength(ITERATE_POOL + 4);
    expect(ofType(graph, 'text')).toHaveLength(2);
    expect(boardObjectCount(graph)).toBe(71);
    expect(graph.generatedObjectCount).toBe(boardObjectCount(graph));
    // equal axis units are kept: the cobweb is drawn against the 45 degree diagonal
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(AFFINE_BOX, true);
    expect(caption(graph)).toEqual(['T(x) = (x + 1) / 2', 'korak k = 0, xₖ = 0', 'ocena napake: skrita', 'krogec: približek; križec: fiksna točka']);
    // the box is the closed square [a, b] x [a, b], the diagonal runs through its corners, the map is drawn over the interval only
    curves(graph)[BOX].updateDataArray();
    expect(curves(graph)[BOX].dataX).toEqual([0, 2, 2, 0, 0]);
    expect(curves(graph)[BOX].dataY).toEqual([0, 0, 2, 2, 0]);
    const diagonal = segments(graph)[DIAGONAL];
    expect([resolve(diagonal.parents[0][0]), resolve(diagonal.parents[0][1]), resolve(diagonal.parents[1][0]), resolve(diagonal.parents[1][1])]).toEqual([0, 0, 2, 2]);
    expect(diagonal.attributes.dash).toBeGreaterThan(0);
    const map = ofType(graph, 'functiongraph')[0];
    expect([resolve(map.parents[1]), resolve(map.parents[2])]).toEqual([0, 2]);
    expect(map.parents[0](1.5)).toBe(1.25);
    // the start sits on the diagonal at x0, the fixed point cross at (1, 1)
    expect(at(point(graph, CURRENT_POINT))).toEqual([0, 0]);
    expect(at(point(graph, FIXED_CROSS))).toEqual([1, 1]);
    expect(point(graph, FIXED_CROSS).attributes.face).toBe('x');
    expect(at(point(graph, AXIS_MARKER))).toEqual([0, 0]);
    expect(shownIterates(graph)).toEqual([]);
    expect(resolve(point(graph, START_RING).attributes.visible)).toBe(false);
    expect(resolve(segments(graph)[BOUND_BAR].attributes.visible)).toBe(false);
});

test('the cobweb goes vertically to the curve and horizontally to the diagonal, and the markers follow the iterates', () => {
    const graph = makeGraph({asyncState: false});
    next(graph, 2);
    curves(graph)[COBWEB].updateDataArray();
    // (0, 0) -> (0, 1/2) -> (1/2, 1/2) -> (1/2, 3/4) -> (3/4, 3/4)
    expect(curves(graph)[COBWEB].dataX).toEqual([0, 0, 0, 0.5, 0.5, 0.75]);
    expect(curves(graph)[COBWEB].dataY).toEqual([0, 0, 0.5, 0.5, 0.75, 0.75]);
    expect(at(point(graph, CURRENT_POINT))).toEqual([0.75, 0.75]);
    expect(at(point(graph, AXIS_MARKER))).toEqual([0.75, 0]);
    expect(resolve(point(graph, START_RING).attributes.visible)).toBe(true);
    expect(at(point(graph, START_RING))).toEqual([0, 0]);
    expect(shownIterates(graph)).toEqual([1]);
    expect(at(iteratePool(graph)[0])).toEqual([0.5, 0.5]);
    const drop = segments(graph)[DROP_LINE];
    expect([resolve(drop.parents[0][0]), resolve(drop.parents[0][1]), resolve(drop.parents[1][0]), resolve(drop.parents[1][1])]).toEqual([0.75, 0.75, 0.75, 0]);
    next(graph, 3);
    expect(shownIterates(graph)).toEqual([1, 2, 3, 4]);
    expect(stepLabel(graph).parents[2]()).toBe('<div><i>x</i><sub>5</sub></div>');
    // cosine from 0: (0, 0) -> (0, 1) -> (1, 1) -> (1, cos 1) -> (cos 1, cos 1)
    const cosine = makeGraph({asyncState: false});
    apply(cosine, choice('cosine'));
    next(cosine, 2);
    curves(cosine)[COBWEB].updateDataArray();
    expect(curves(cosine)[COBWEB].dataX).toEqual([0, 0, 0, 1, 1, Math.cos(1)]);
    expect(curves(cosine)[COBWEB].dataY).toEqual([0, 0, 1, 1, Math.cos(1), Math.cos(1)]);
    expect(at(point(cosine, FIXED_CROSS))[0]).toBeCloseTo(COS_FIXED_POINT, 14);
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [choice('cosine'), parameter('fixed-point-x0', 0.5), parameter('fixed-point-digits', 5), command('next-step'), command('next-step'), command('next-step'), reveal(true)]) apply(graph, action);
    expect(graph.model).toEqual({example: 'cosine', x0: 0.5, step: 3, digits: 5, boundVisible: true});
    expect(graph.state).toMatchObject({example: 'affine', x0: 0, step: 0, digits: 3, boundVisible: false});
    expect(caption(graph)[1]).toBe(`korak k = 3, xₖ = ${String(Math.cos(Math.cos(Math.cos(0.5))).toFixed(6)).replace('.', ',').replace(/0+$/, '')}`);
    expect(statusIds(graph)).toEqual(['hypotheses', 'bound-a-priori', 'bound-a-posteriori']);
    // a later action in the same tick sees the earlier one
    apply(graph, choice('reflection'));
    apply(graph, parameter('fixed-point-x0', 0.3));
    next(graph, 5);
    expect(graph.model).toEqual({example: 'reflection', x0: 0.3, step: 5, digits: 5, boundVisible: false});
    apply(graph, reveal(true));
    expect(statusIds(graph)).toEqual(['cycle', 'no-bound']);
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('fixed-point')!;
    expect(lesson.steps).toHaveLength(7);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph();
        // a deliberately different user state, partly advanced, revealed and playing, that the default scene must reset
        apply(graph, choice('reflection'));
        apply(graph, parameter('fixed-point-x0', 0.6));
        apply(graph, parameter('fixed-point-digits', 5));
        next(graph, 6);
        apply(graph, reveal(true));
        apply(graph, command('play'));
        for (const action of step.scene!.actions) apply(graph, action);
        expect(graph.controller.isPlaying()).toBe(false);
        return graph.model;
    });
    expect(finals).toEqual([
        model({}),
        model({step: 1}),
        model({step: 3, boundVisible: true}),
        {...defaultOf('cosine'), step: 8},
        model({digits: 8, step: 27}),
        {...defaultOf('reflection'), step: 4},
        {...defaultOf('cosine'), x0: 1},
    ]);
    // the stated facts: the rounding step has stopped at the threshold, the reflection step shows the two-cycle
    const rounding = makeGraph({asyncState: false});
    for (const action of lesson.steps[4].scene!.actions) apply(rounding, action);
    expect(rounding.viewOf(rounding.model).history.termination).toBe('threshold');
    expect(rows(rounding).current).toBe('1');
    expect(rounding.controller.isComplete()).toBe(true);
    const reflection = makeGraph({asyncState: false});
    for (const action of lesson.steps[5].scene!.actions) apply(reflection, action);
    expect(reflection.viewOf(reflection.model).history.cycle).toEqual({first: 0.2, second: 0.8});
});

test('k Next steps and k playback steps reach the same model, one iterate per interval', () => {
    for (const example of ['affine', 'cosine', 'reflection'] as const) {
        for (const k of [1, 3, 7, 9]) {
            const manual = makeGraph();
            apply(manual, choice(example));
            next(manual, k);
            const played = makeGraph();
            apply(played, choice(example));
            apply(played, command('play'));
            expect(played.controller.isPlaying()).toBe(true);
            playSteps(played, k);
            apply(played, command('pause'));
            expect(played.model).toEqual(manual.model);
            expect(played.model.step).toBe(k);
        }
    }
    const graph = makeGraph();
    apply(graph, command('play'));
    // a long frame never skips ahead: one iterate per frame at most
    graph.frames.frame(0);
    graph.frames.frame(FIXED_POINT_STEP_INTERVAL_MS * 10);
    expect(graph.model.step).toBe(1);
    // a frame shorter than the interval does not step
    graph.frames.frame(FIXED_POINT_STEP_INTERVAL_MS / 3);
    expect(graph.model.step).toBe(1);
});

test('playback stops at the threshold, at a known fixed point and at the iteration limit, each with its reason', () => {
    // threshold: affine from 0 at d = 3 stops at step 10 (the a posteriori bound is 2^-k, 2^-10 < 10^-3 <= 2^-9)
    const affine = makeGraph({asyncState: false});
    apply(affine, command('play'));
    playToEnd(affine);
    expect(affine.controller.isPlaying()).toBe(false);
    expect(affine.controller.isComplete()).toBe(true);
    expect(affine.frames.callbacks.size).toBe(0);
    expect(affine.model.step).toBe(10);
    expect(rows(affine).end).toBe('ocena a posteriori pod pragom');
    expect(statusIds(affine)).toEqual(['threshold', 'bound-hidden']);
    expect(statusTexts(affine)[0]).toBe('Ustavljeno pri koraku 10: ocena a posteriori je pod pragom 10⁻³. To pove, da je napaka pod pragom, ne da je xₖ natančna fiksna točka.');
    expect(caption(affine)).toContain('konec: ocena pod pragom');
    // the same stop for a cosine contraction, where the model agrees with the history
    const cosine = makeGraph({asyncState: false});
    apply(cosine, choice('cosine'));
    apply(cosine, command('play'));
    playToEnd(cosine);
    expect(cosine.model.step).toBe(fixedPointHistory('cosine', 0, FIXED_POINT_MAX_STEPS, 3).step);
    expect(cosine.model.step).toBe(22);
    expect(cosine.viewOf(cosine.model).history.termination).toBe('threshold');
    // a start at an analytically known fixed point does not move, and Play does nothing
    const known = makeGraph({asyncState: false});
    apply(known, parameter('fixed-point-x0', 1));
    expect(statusIds(known)).toEqual(['fixed-point', 'bound-hidden']);
    expect(rows(known).end).toBe('začetek je znana fiksna točka');
    apply(known, command('play'));
    expect(known.controller.isPlaying()).toBe(false);
    expect(() => next(known)).toThrow(DomainError);
    // the iteration limit: 1 - x has no threshold and stops at 60 steps, reporting the two-cycle and not a conclusion about convergence
    const reflection = makeGraph({asyncState: false});
    apply(reflection, choice('reflection'));
    apply(reflection, command('play'));
    playToEnd(reflection);
    expect(reflection.model.step).toBe(FIXED_POINT_MAX_STEPS);
    expect(reflection.controller.isComplete()).toBe(true);
    expect(rows(reflection).end).toBe('meja korakov');
    expect(statusIds(reflection)).toEqual(['iteration-limit', 'cycle', 'bound-hidden']);
    expect(statusTexts(reflection)[0]).toBe('Ustavljeno: dosežena je meja 60 korakov. To ni zaključek o konvergenci.');
    expect(caption(reflection)).toContain('konec: meja korakov');
    expect(() => next(reflection)).toThrow(DomainError);
});

test('the controls offer no further step once the iteration has ended, and Reset makes it usable again', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, command('play'));
    playToEnd(graph);
    expect(controls(graph).next.props['aria-disabled']).toBe(true);
    expect(controls(graph).play.props['aria-disabled']).toBe(true);
    expect(controls(graph).reset.props['aria-disabled']).toBe(false);
    apply(graph, command('play'));
    expect(graph.controller.isPlaying()).toBe(false);
    expect(graph.model.step).toBe(10);
    controls(graph).reset.props.onClick();
    expect(graph.model).toEqual(model({}));
    expect(graph.controller.isComplete()).toBe(false);
    expect(controls(graph).reset.props['aria-disabled']).toBe(true);
    next(graph, 3);
    expect(graph.model.step).toBe(3);
});

test('Next step takes over from playback, and Reset returns to step 0 and stops playback', () => {
    const graph = makeGraph();
    apply(graph, command('play'));
    playSteps(graph, 2);
    expect(graph.controller.isPlaying()).toBe(true);
    next(graph);
    expect(graph.controller.isPlaying()).toBe(false);
    expect(graph.model.step).toBe(3);
    apply(graph, command('play'));
    apply(graph, command('reset'));
    expect(graph.model).toEqual(model({}));
    expect(graph.controller.isPlaying()).toBe(false);
    expect(graph.frames.callbacks.size).toBe(0);
    apply(graph, command('replay'));
    expect(graph.controller.isPlaying()).toBe(true);
    expect(graph.model.step).toBe(0);
    playSteps(graph, 2);
    expect(graph.model.step).toBe(2);
    // Reset keeps the example, x0, the tolerance and the reveal
    apply(graph, parameter('fixed-point-x0', 0.5));
    apply(graph, parameter('fixed-point-digits', 4));
    apply(graph, reveal(true));
    next(graph, 4);
    apply(graph, command('reset'));
    expect(graph.model).toEqual({example: 'affine', x0: 0.5, step: 0, digits: 4, boundVisible: true});
});

test('editing the example, x0 or the tolerance pauses playback and returns to step 0; the bound toggle does not pause', () => {
    const edits: Array<[string, (graph: any) => void, Partial<FixedPointModel>]> = [
        ['x0', graph => apply(graph, parameter('fixed-point-x0', 0.5)), {x0: 0.5}],
        ['digits', graph => apply(graph, parameter('fixed-point-digits', 6)), {digits: 6}],
        ['example', graph => apply(graph, choice('cosine')), {...defaultOf('cosine'), digits: 3}],
        ['the same example', graph => apply(graph, choice('affine')), {}],
        ['x0 field', graph => controls(graph).inputX0.props.onChange(0.5), {x0: 0.5}],
        ['digits field', graph => controls(graph).inputDigits.props.onChange(6), {digits: 6}],
        ['example select', graph => controls(graph).select.props.onChange('reflection'), {...defaultOf('reflection'), digits: 3}],
    ];
    for (const [name, edit, expected] of edits) {
        const graph = makeGraph({asyncState: false});
        next(graph, 3);
        apply(graph, reveal(true));
        apply(graph, command('play'));
        expect(graph.controller.isPlaying(), name).toBe(true);
        edit(graph);
        const keepsReveal = !name.includes('example');
        expect(graph.model, name).toEqual({...defaultFixedPointModel('affine'), boundVisible: keepsReveal, ...expected, step: 0});
        expect(graph.controller.isPlaying(), name).toBe(false);
        expect(graph.frames.callbacks.size, name).toBe(0);
        expect(graph.state.step, name).toBe(0);
        // the iteration continues from step 0: the next step adds exactly one
        next(graph);
        expect(graph.model.step, name).toBe(1);
    }
    // a repeated value is not an edit and keeps playback
    const graph = makeGraph();
    next(graph, 2);
    apply(graph, command('play'));
    apply(graph, parameter('fixed-point-x0', 0));
    apply(graph, parameter('fixed-point-digits', 3));
    expect(graph.controller.isPlaying()).toBe(true);
    expect(graph.model.step).toBe(2);
    // showing or hiding the bound does not stop playback
    apply(graph, reveal(true));
    expect(graph.controller.isPlaying()).toBe(true);
    apply(graph, reveal(false));
    expect(graph.controller.isPlaying()).toBe(true);
});

test('controls and lesson actions give equivalent models', () => {
    const viaActions = makeGraph({asyncState: false});
    apply(viaActions, choice('cosine'));
    apply(viaActions, parameter('fixed-point-x0', 0.75));
    apply(viaActions, parameter('fixed-point-digits', 5));
    next(viaActions, 6);
    apply(viaActions, reveal(true));

    const viaControls = makeGraph({asyncState: false});
    controls(viaControls).select.props.onChange('cosine');
    controls(viaControls).inputX0.props.onChange(0.75);
    controls(viaControls).inputDigits.props.onChange(5);
    for (let i = 0; i < 6; i++) controls(viaControls).next.props.onClick();
    controls(viaControls).toggle.props.onClick();

    expect(viaControls.model).toEqual(viaActions.model);
    expect(viaControls.model).toEqual({example: 'cosine', x0: 0.75, step: 6, digits: 5, boundVisible: true});
    expect(rows(viaControls)).toEqual(rows(viaActions));
    expect(statusTexts(viaControls)).toEqual(statusTexts(viaActions));
    expect(caption(viaControls)).toEqual(caption(viaActions));
    // Play from the control and the lesson command run the same transition
    controls(viaControls).play.props.onClick();
    apply(viaActions, command('play'));
    playSteps(viaControls, 3);
    playSteps(viaActions, 3);
    expect(viaControls.model).toEqual(viaActions.model);
    expect(viaControls.model.step).toBe(9);
});

test('values outside the domain are rejected without changing the model, never clamped', () => {
    const graph = makeGraph({asyncState: false});
    next(graph, 2);
    const before = {...graph.model};
    for (const bad of [-0.01, -1, 2.01, 3, 0.005, 0.075, 0.123, NaN, Infinity, -Infinity]) expect(() => apply(graph, parameter('fixed-point-x0', bad)), `x0 ${bad}`).toThrow(DomainError);
    for (const bad of [0, -1, 9, 2.5, 0.5, NaN, Infinity]) expect(() => apply(graph, parameter('fixed-point-digits', bad)), `digits ${bad}`).toThrow(DomainError);
    expect(() => apply(graph, choice('sine'))).toThrow(DomainError);
    expect(graph.model).toEqual(before);
    // the interval of the example decides: 1.5 is fine for the affine map and not for cosine, whose start is then rejected, not clamped
    apply(graph, parameter('fixed-point-x0', 1.5));
    expect(graph.model.x0).toBe(1.5);
    apply(graph, choice('cosine'));
    expect(() => apply(graph, parameter('fixed-point-x0', 1.5))).toThrow(DomainError);
    expect(() => apply(graph, parameter('fixed-point-x0', 1.01))).toThrow(DomainError);
    expect(graph.model).toEqual(defaultOf('cosine'));
    // the boundary values are accepted
    apply(graph, parameter('fixed-point-x0', 1));
    apply(graph, parameter('fixed-point-x0', 0));
    for (const good of [1, 8, 4]) apply(graph, parameter('fixed-point-digits', good));
    expect(graph.model).toMatchObject({x0: 0, digits: 4});
    // the inspector swallows exactly the domain errors and reports the rejection to the input
    const {inputX0, inputDigits} = controls(graph);
    expect(inputX0.props.onChange(0.075)).toBe(false);
    expect(inputX0.props.onChange(2)).toBe(false);
    expect(inputX0.props.onChange(0.25)).toBe(true);
    expect(inputDigits.props.onChange(9)).toBe(false);
    expect(inputDigits.props.onChange(2.5)).toBe(false);
    expect(graph.model).toMatchObject({x0: 0.25, digits: 4});
    expect([inputX0, inputDigits].map((input: any) => [input.props.min, input.props.max])).toEqual([[0, 1], [1, 8]]);
});

test('x0 reaches the model as exact hundredths: arithmetic noise is snapped, a value off the grid is not rounded', () => {
    const graph = makeGraph();
    apply(graph, parameter('fixed-point-x0', 0.06 + 0.01));
    expect(graph.model.x0).toBe(0.07);
    apply(graph, parameter('fixed-point-x0', 0.1 + 0.2));
    expect(graph.model.x0).toBe(0.3);
    apply(graph, parameter('fixed-point-x0', -0));
    expect(Object.is(graph.model.x0, 0)).toBe(true);
    // the arrow keys of the number field add the 0.01 step through the same rounding
    controls(graph).inputX0.props.onChange(Math.round((0.29 + 0.01) * 1e9) / 1e9);
    expect(graph.model.x0).toBe(0.3);
    expect(() => apply(graph, parameter('fixed-point-x0', 0.3 + 0.004))).toThrow(DomainError);
    expect(graph.model.x0).toBe(0.3);
    // the reflection example is exact on the grid: x0 = 0.07 gives 0.93 and back
    apply(graph, choice('reflection'));
    apply(graph, parameter('fixed-point-x0', 0.07));
    next(graph, 2);
    expect(graph.viewOf(graph.model).history.points.map((entry: { x: number }) => entry.x)).toEqual([0.07, 0.93, 0.07]);
});

test('bound readouts exist only for contractions, are hidden until Show error bound and never use the true fixed point', () => {
    const hidden = 'skrito';
    const graph = makeGraph({asyncState: false});
    next(graph, 3);
    expect(rows(graph)).toMatchObject({step: '3', x0: '0', current: '0,875', delta: '0,125', tolerance: '10⁻³', q: hidden, 'a-priori': hidden, 'a-posteriori': hidden, end: 'se nadaljuje'});
    expect(statusIds(graph)).toEqual(['bound-hidden']);
    expect(caption(graph)[2]).toBe('ocena napake: skrita');
    expect(resolve(segments(graph)[BOUND_BAR].attributes.visible)).toBe(false);
    apply(graph, reveal(true));
    expect(rows(graph)).toMatchObject({q: '0,5', 'a-priori': '0,125', 'a-posteriori': '0,125'});
    expect(statusIds(graph)).toEqual(['hypotheses', 'bound-a-priori', 'bound-a-posteriori']);
    expect(statusTexts(graph)[0]).toContain('zaprt in omejen');
    expect(statusTexts(graph)[0]).toContain('T([0, 2]) = [1/2, 3/2]');
    expect(statusTexts(graph)[0]).toContain('q = 1/2 < 1');
    expect(caption(graph)[2]).toBe('|xₖ − x*| ≤ 0,125');
    // the bound bar on the x-axis is the interval around x_3 clipped to [a, b]
    expect(resolve(segments(graph)[BOUND_BAR].attributes.visible)).toBe(true);
    const bar = segments(graph)[BOUND_BAR];
    expect([resolve(bar.parents[0][0]), resolve(bar.parents[1][0])]).toEqual([0.75, 1]);
    // at step 0 there is no a posteriori bound yet
    apply(graph, command('reset'));
    expect(rows(graph)).toMatchObject({q: '0,5', 'a-priori': '1', 'a-posteriori': '—', delta: '—'});
    expect(statusIds(graph)).toEqual(['hypotheses', 'bound-a-priori', 'bound-pending']);
    expect(caption(graph)[2]).toBe('ocena a posteriori: od koraka 1');
    expect(resolve(segments(graph)[BOUND_BAR].attributes.visible)).toBe(false);

    // cosine: the hypotheses mention the image of [0, 1] and sin 1; both bounds hold at every step against the reference fixed point
    const cosine = makeGraph({asyncState: false});
    apply(cosine, choice('cosine'));
    next(cosine, 8);
    apply(cosine, reveal(true));
    expect(rows(cosine)).toMatchObject({current: '0,722102', q: '0,841471', 'a-priori': '1,586', 'a-posteriori': '0,2222'});
    expect(statusTexts(cosine)[0]).toContain('cos([0, 1]) = [cos 1, 1]');
    expect(statusTexts(cosine)[0]).toContain('sin 1 ≈ 0,8415');
    const history = fixedPointHistory('cosine', 0, 22, 3);
    for (const entry of history.points) {
        const error = Math.abs(entry.x - COS_FIXED_POINT);
        expect(entry.aPriori!, `a priori at ${entry.k}`).toBeGreaterThanOrEqual(error);
        if (entry.aPosteriori !== undefined) expect(entry.aPosteriori, `a posteriori at ${entry.k}`).toBeGreaterThanOrEqual(error);
    }

    // 1 - x: no bound at all, no q, and the reason in words; no claim of divergence
    const reflection = makeGraph({asyncState: false});
    apply(reflection, choice('reflection'));
    next(reflection, 4);
    apply(reflection, reveal(true));
    expect(rows(reflection)).toMatchObject({q: 'ni ocene (ni skrčitve)', 'a-priori': 'ni ocene (ni skrčitve)', 'a-posteriori': 'ni ocene (ni skrčitve)'});
    expect(statusIds(reflection)).toEqual(['cycle', 'no-bound']);
    expect(statusTexts(reflection)[1]).toContain('To še ne pomeni, da iteracija divergira');
    expect(caption(reflection)).toEqual(['T(x) = 1 - x', 'korak k = 4, xₖ = 0,2', 'ni ocene: |T′| = 1, ni skrčitve', 'dvocikel 0,2 ↔ 0,8', 'krogec: približek; križec: fiksna točka']);
    expect(resolve(segments(reflection)[BOUND_BAR].attributes.visible)).toBe(false);
    setLanguage('en');
    expect(statusTexts(reflection)[1]).toContain('That does not mean the iteration diverges');
    expect(statusTexts(reflection)[0]).toBe('Two-cycle: the iterates alternate between 0.2 and 0.8 and do not settle. The reason lies in T: |T′| = 1, so it is not a contraction and the hypothesis of the theorem fails. A failing hypothesis alone does not prove divergence.');
});

test('a rounded readout equal to the fixed point is no proof: the stop is stated as a bound below the threshold', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, parameter('fixed-point-digits', 8));
    next(graph, 27);
    expect(graph.model.step).toBe(27);
    // the six-decimal readout shows 1, but 1 - 2^-27 is not 1 and the bound is positive
    expect(rows(graph).current).toBe('1');
    expect(graph.viewOf(graph.model).history.current.x).not.toBe(1);
    apply(graph, reveal(true));
    expect(rows(graph)['a-posteriori']).toBe('7,451·10⁻⁹');
    expect(statusIds(graph)).toEqual(['threshold', 'hypotheses', 'bound-a-priori', 'bound-a-posteriori']);
    expect(statusTexts(graph)[0]).toContain('ne da je xₖ natančna fiksna točka');
    expect(rows(graph).end).toBe('ocena a posteriori pod pragom');
    expect(() => next(graph)).toThrow(DomainError);
});

test('names, kinds and commands the graph does not own are unsupported, and iteration commands outside the supported set are rejected', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'y1', 'x2', 'y2', 'k', 'n', 'a', 'A', 'omega', 'phi', 'B', 'x0', 'h', 'b', 'bisect-a', 'taylor-x', 'sequence-epsilon']) {
        expect(() => apply(graph, {kind: 'function-parameter', name, value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'function-choice', name: 'sequence-example', value: 'natural'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-visibility', target: 'sequence-certificate', visible: true})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, command('stop'))).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'bisection', command: 'play'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'sequence', command: 'next-step'})).toThrow(UnsupportedLessonActionError);
    for (const supported of ['play', 'pause', 'replay', 'next-step', 'reset']) expect(graph.supportsLessonAction(command(supported))).toBe(true);
    expect(graph.supportsLessonAction(command('stop'))).toBe(false);
    expect(graph.supportsLessonAction(parameter('fixed-point-x0', 0.1))).toBe(true);
    expect(graph.supportsLessonAction(choice('cosine'))).toBe(true);
    expect(graph.supportsLessonAction(reveal(true))).toBe(true);
    expect(graph.model).toEqual(model({}));
});

test('controls: example select, two number fields, Next step, Play/Pause, Reset and Show error bound with their states', () => {
    const graph = makeGraph({asyncState: false});
    const first = controls(graph);
    expect(first.select.props.options.map((option: any) => option.value)).toEqual(['affine', 'cosine', 'reflection']);
    expect(first.select.props.options.map((option: any) => option.text)).toEqual(['T(x) = (x + 1) / 2, x ∈ [0, 2]', 'T(x) = cos x, x ∈ [0, 1]', 'T(x) = 1 - x, x ∈ [0, 1]']);
    expect(first.found.NumberInput.map((input: any) => input.props.label)).toEqual(['Začetek x₀', 'Natančnost d (prag 10⁻ᵈ)']);
    expect(first.found.NumberInput.map((input: any) => input.props.value)).toEqual([0, 3]);
    expect(first.found.NumberInput.map((input: any) => input.props.step)).toEqual([0.01, 1]);
    expect(first.found.button.map((button: any) => button.props['data-action'])).toEqual(['next-step', 'play-pause', 'reset', 'toggle-fixed-point-bound']);
    expect(first.next.props['aria-disabled']).toBe(false);
    expect(first.play.props['aria-disabled']).toBe(false);
    expect(first.reset.props['aria-disabled']).toBe(true);
    expect(first.play.props.children).toBe('Predvajaj');
    expect(first.toggle.props['data-revealed']).toBe(false);

    first.next.props.onClick();
    expect(graph.model.step).toBe(1);
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
    expect(graph.model.boundVisible).toBe(true);
    expect(controls(graph).toggle.props.children).toBe('Skrij oceno napake');
    expect(controls(graph).toggle.props['data-revealed']).toBe(true);
    controls(graph).reset.props.onClick();
    expect(graph.model.step).toBe(0);
    setLanguage('en');
    const english = controls(graph);
    expect(english.next.props.children).toBe('Next step');
    expect(english.reset.props.children).toBe('Reset to x₀');
    expect(english.play.props.children).toBe('Play');
    expect(english.toggle.props.children).toBe('Hide error bound');
    expect(english.found.NumberInput.map((input: any) => input.props.label)).toEqual(['Start x₀', 'Tolerance digits d (threshold 10⁻ᵈ)']);
    expect(collect(graph.renderControls()).div.some((element: any) => element.props.role === 'group' && element.props['aria-label'] === 'Iteration controls')).toBe(true);
    // the interval of the start follows the example
    apply(graph, choice('cosine'));
    expect(controls(graph).inputX0.props.max).toBe(1);
});

test('presets save the model with the step and the reveal, reopen paused and never start playback', () => {
    const graph = makeGraph();
    apply(graph, choice('cosine'));
    apply(graph, parameter('fixed-point-x0', 0.25));
    next(graph, 5);
    apply(graph, reveal(true));
    apply(graph, command('play'));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('fixed-point');
    expect(exported.data).toEqual({example: 'cosine', x0: 0.25, step: 5, digits: 3, boundVisible: true});
    expect(JSON.stringify(exported)).not.toMatch(/play|running|status/i);

    const reopened = makeGraph({asyncState: false});
    apply(reopened, command('play'));
    expect(reopened.controller.isPlaying()).toBe(true);
    reopened.importPreset({id: 'fixed-point', boardState: {boundingBox: [-1, 1, 1, -1]}, data: exported.data});
    expect(reopened.model).toEqual(exported.data);
    expect(reopened.controller.isPlaying()).toBe(false);
    expect(reopened.frames.callbacks.size).toBe(0);
    expect(caption(reopened)[1]).toBe(`korak k = 5, xₖ = ${rows(reopened).current}`);
    // continuing from the loaded step gives the same state as never having left it
    next(reopened);
    next(graph);
    expect(reopened.model).toEqual(graph.model);

    // a string, extra properties and a step beyond the end of the iteration: the step is cut to what the history can take
    reopened.importPresetData(JSON.stringify({example: 'affine', x0: 0, step: 60, digits: 3, boundVisible: false, extra: true}));
    expect(reopened.model).toEqual({example: 'affine', x0: 0, step: 10, digits: 3, boundVisible: false});
    expect(reopened.controller.isPlaying()).toBe(false);
    expect(controls(reopened).next.props['aria-disabled']).toBe(true);
    expect(() => next(reopened)).toThrow(DomainError);
    // a start at a known fixed point has step 0
    reopened.importPresetData({example: 'affine', x0: 1, step: 5, digits: 3, boundVisible: false});
    expect(reopened.model.step).toBe(0);
    // a finished reflection reopens as a finished iteration
    reopened.importPresetData({example: 'reflection', x0: 0.2, step: 60, digits: 3, boundVisible: false});
    expect(reopened.controller.isComplete()).toBe(true);
    reopened.importPresetData({...exported.data, step: 3});
    expect(reopened.controller.isComplete()).toBe(false);
    next(reopened);
    expect(reopened.model.step).toBe(4);
});

test('a preset of another example without a view shows that example view, like choosing the example', () => {
    const graph = makeGraph();
    graph.board.setBoundingBox.mockClear();
    graph.importPreset({id: 'fixed-point', data: {...defaultOf('cosine')}});
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(SMALL_BOX, true);
});

test('malformed preset data is rejected to the default model with a warning', () => {
    const graph = makeGraph();
    next(graph, 2);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const valid = {example: 'affine', x0: 0, step: 0, digits: 3, boundVisible: false};
    const bad = [undefined, null, 'not json', {}, [], {...valid, example: 'sine'}, {...valid, x0: -0.5}, {...valid, x0: 2.5}, {...valid, x0: 0.005}, {...valid, x0: '0'},
        {...valid, example: 'cosine', x0: 1.5}, {...valid, step: -1}, {...valid, step: 61}, {...valid, step: 1.5}, {...valid, step: '1'}, {...valid, digits: 0}, {...valid, digits: 9},
        {...valid, digits: 2.5}, {...valid, boundVisible: 'true'}, {...valid, boundVisible: undefined}];
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
    apply(graph, choice('cosine'));
    apply(graph, parameter('fixed-point-x0', 0.5));
    next(graph, 3);
    apply(graph, reveal(true));
    apply(graph, command('play'));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({example: 'cosine', x0: 0.5, step: 3, digits: 3, boundVisible: true});
    expect(checkpoint.value.graphState).toMatchObject({example: 'cosine', x0: 0.5, step: 3, boundVisible: true});
    apply(graph, defaultScene);
    apply(graph, command('play'));
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual(checkpoint.value.data);
    expect(graph.controller.isPlaying()).toBe(false);
    expect(graph.frames.callbacks.size).toBe(0);
    expect(graph.setState).toHaveBeenLastCalledWith(expect.objectContaining({example: 'cosine', x0: 0.5, step: 3}));
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
    // the iteration continues from the restored step
    next(graph);
    expect(graph.model.step).toBe(4);
});

test('lesson lifecycle, figure capture, export and scene replacement pause playback', () => {
    const pauses: Array<[string, (graph: any) => void]> = [
        ['stopLessonAnimations', graph => graph.stopLessonAnimations()],
        ['beforeFigureCapture', graph => graph.beforeFigureCapture()],
        ['initialize (scene replacement)', graph => graph.initialize()],
        ['disposeFigureScene', graph => graph.disposeFigureScene()],
        ['prepared default scene', graph => apply(graph, defaultScene)],
        ['preset import', graph => graph.importPreset({id: 'fixed-point', data: {example: 'cosine', x0: 0.5, step: 3, digits: 3, boundVisible: false}})],
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
    expect(graph.model.step).toBe(0);
    expect(graph.controller.isPlaying()).toBe(false);
    graph.figureBatchActive = false;
    next(graph);
    expect(graph.model.step).toBe(1);
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
    expect(graph.frames.frame(FIXED_POINT_STEP_INTERVAL_MS)).toBe(false);
    expect(controller.nextStep()).toBe(false);
    controller.play();
    expect(graph.frames.callbacks.size).toBe(0);
    expect(graph.model).toEqual(model({}));
});

test('generated objects are disposed and not duplicated across repeated generation, examples and default scenes', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    expect(baseline).toBe(71);
    for (let i = 0; i < 4; i++) graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    expect(graph.generatedObjectCount).toBe(baseline);
    for (let i = 0; i < 5; i++) {
        apply(graph, choice('reflection'));
        next(graph, 12);
        apply(graph, reveal(true));
        apply(graph, defaultScene);
    }
    // whatever the example, the number of steps or the reveal, the pool is the same fixed set of objects
    expect(boardObjectCount(graph)).toBe(baseline);
    apply(graph, choice('cosine'));
    next(graph, 20);
    expect(boardObjectCount(graph)).toBe(baseline);
    graph.disposeFigureScene();
    expect(boardObjectCount(graph)).toBe(0);
    expect(graph.generatedObjectCount).toBe(0);
    // a model change after disposal must not touch removed objects
    expect(() => apply(graph, command('reset'))).not.toThrow();
    graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
});

test('the board text follows the language and a language change notifies subscribers (the board text is re-evaluated on update)', () => {
    const graph = makeGraph({asyncState: false});
    next(graph, 3);
    apply(graph, reveal(true));
    expect(caption(graph)).toEqual(['T(x) = (x + 1) / 2', 'korak k = 3, xₖ = 0,875', '|xₖ − x*| ≤ 0,125', 'krogec: približek; križec: fiksna točka']);
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(currentLanguage()).toBe('en');
    expect(caption(graph)).toEqual(['T(x) = (x + 1) / 2', 'step k = 3, xₖ = 0.875', '|xₖ − x*| ≤ 0.125', 'circle: iterate; cross: fixed point']);
    // the readouts and the statuses follow as well
    expect(rows(graph)).toMatchObject({current: '0.875', q: '0.5', 'a-posteriori': '0.125', end: 'continues'});
    expect(statusTexts(graph)[0]).toBe('The interval [0, 2] is closed and bounded, hence complete. T is increasing, so T([0, 2]) = [1/2, 3/2], which lies in [0, 2]. |T′(x)| = 1/2 for every x, so by the mean value theorem |T(x) − T(y)| ≤ q |x − y| with q = 1/2 < 1.');
    // the end-of-iteration line follows too
    next(graph, 7);
    expect(caption(graph)).toContain('end: bound below the threshold');
    setLanguage('sl');
    expect(caption(graph)).toContain('konec: ocena pod pragom');
    unsubscribe();
});

test('below 520 px the board uses fewer caption lines, and no label is placed on an axis', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('reflection'));
    next(graph, 4);
    expect(caption(graph)).toHaveLength(5);
    graph.board.canvasWidth = COMPACT_BOARD_WIDTH - 1;
    // the two-cycle line and the key are dropped on narrow boards, the inspector keeps their content
    expect(caption(graph)).toEqual(['T(x) = 1 - x', 'korak k = 4, xₖ = 0,2', 'ocena napake: skrita']);
    expect(statusIds(graph)).toContain('cycle');
    graph.board.canvasWidth = COMPACT_BOARD_WIDTH;
    expect(caption(graph)).toHaveLength(5);
    // the reason the iteration ended stays on narrow boards
    const ended = makeGraph({asyncState: false});
    next(ended, 10);
    ended.board.canvasWidth = COMPACT_BOARD_WIDTH - 1;
    expect(caption(ended)).toEqual(['T(x) = (x + 1) / 2', 'korak k = 10, xₖ = 0,999023', 'ocena napake: skrita', 'konec: ocena pod pragom']);
    // the x_k label sits just above the axis (y > 0) and to the right of the drop line, anchored at its bottom left corner
    const label = stepLabel(ended);
    expect(label.attributes.anchorY).toBe('bottom');
    expect(label.attributes.anchorX).toBe('left');
    expect(resolve(label.parents[1])).toBeGreaterThan(0);
    expect(resolve(label.parents[0])).toBeGreaterThan(resolve(point(ended, AXIS_MARKER).parents[0]));
    expect(label.attributes.fixed).toBe(true);
});

test('the legend names the map, the diagonal, the box, the cobweb, the markers and the bound bar in words, with the line patterns', () => {
    const graph = makeGraph();
    const items = graph.renderLegend().props.items as { id: string; label: string; kind: string }[];
    expect(items.map(item => [item.id, item.kind])).toEqual([
        ['function', 'line'], ['diagonal', 'dashed-line'], ['box', 'dashed'], ['cobweb', 'line'], ['iterate', 'dot'], ['start', 'ring'], ['fixed-point', 'cross'], ['bound', 'line'],
    ]);
    expect(items[1].label).toMatch(/črtkana/);
    expect(items[6].label).toMatch(/križec/);
    setLanguage('en');
    expect(graph.renderLegend().props.items.map((item: any) => item.label)).toEqual([
        'Map y = T(x): solid curve', 'Diagonal y = x: dashed line', 'Interval [a, b] and its square: shaded box with a dashed edge',
        'Cobweb: vertical to the curve, horizontal to the diagonal', 'Iterate xₖ on the diagonal: filled circle (the current one is larger)', 'Start x₀: open circle',
        'Fixed point x*: cross on the diagonal', 'Interval around xₖ that contains x* (after the bound is shown): thick line on the x-axis',
    ]);
});

test('no readout, caption, label or status ever shows NaN, Infinity or a raw undefined, in either language', () => {
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        for (const id of ['affine', 'cosine', 'reflection']) {
            for (const digits of [1, 3, 8]) {
                for (const steps of [0, 1, 2, 10, 60]) {
                    for (const visible of [false, true]) {
                        const graph = makeGraph({asyncState: false});
                        apply(graph, choice(id));
                        apply(graph, parameter('fixed-point-digits', digits));
                        for (let i = 0; i < steps && graph.controller.status !== 'complete'; i++) {
                            try { next(graph); } catch { break; }
                        }
                        apply(graph, reveal(visible));
                        const text = [...caption(graph), ...Object.values(rows(graph)), ...statusTexts(graph), stepLabel(graph).parents[2]()].join(' | ');
                        expect(text, `${language} ${id} ${digits} ${steps} ${visible}`).not.toMatch(/NaN|Infinity|undefined|-0\b/);
                    }
                }
            }
        }
    }
});
