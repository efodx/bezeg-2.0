import {BisectionGraph, BISECTION_STEP_INTERVAL_MS, formatPrecise, leftLimit, sampleJumpPieces} from './BisectionGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {BISECTION_EXAMPLES, BISECTION_MAX_STEPS, bisectionHistory} from '../../analysis/bisection';
import {onLanguageChange, setLanguage} from '../../localization';
import {GraphPalette} from '../styles/GraphPalette';
import {DomainError} from './BaseFunctionGraph';

// The export itself is not under test: only that it pauses the iteration before it captures the board.
vi.mock('../base/export/FigureCapture', () => ({downloadSVG: vi.fn(() => Promise.resolve()), downloadPNG: vi.fn(() => Promise.resolve())}));
vi.mock('../base/export/PresetFigureBatch', () => ({downloadPresetFigures: vi.fn(() => Promise.resolve())}));

const BOX = [-2.5, 4, 3.5, -3];

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
    const graph = new BisectionGraph(frames.scheduler) as any;
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
        graph.frames.frame(BISECTION_STEP_INTERVAL_MS);
    }
}

const apply = (graph: any, action: LessonAction) => graph.applyLessonAction(action);
const parameter = (name: 'bisect-a' | 'bisect-b', value: number): LessonAction => ({kind: 'function-parameter', name, value});
const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'bisection-example', value});
const command = (value: any): LessonAction => ({kind: 'animation', animationId: 'bisection', command: value});
const defaultScene: LessonAction = {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'};
const next = (graph: any, count = 1) => { for (let i = 0; i < count; i++) apply(graph, command('next-step')); };
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const boardObjectCount = (graph: any) => graph.board.objectsList.length;
const progressText = (graph: any) => graph.captionPlainLines()[1];
const statusIds = (graph: any, language: 'sl' | 'en' = 'sl') => graph.statuses(graph.model, language).map((status: { id: string }) => status.id);

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
    return {found, next: button('next-step'), play: button('play-pause'), reset: button('reset')};
};
const rows = (graph: any) => Object.fromEntries((graph.renderReadout().props.children[0].props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));

beforeEach(() => setLanguage('sl'));

test('initialization draws the function, the bracket, the points and one caption text for x^2 - 2 on [1, 2]', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({example: 'square-minus-two', a: 1, b: 2, step: 0});
    expect(graph.presets()).toBe('bisection');
    expect(ofType(graph, 'functiongraph')).toHaveLength(1);
    expect(ofType(graph, 'curve')).toHaveLength(2);
    expect(ofType(graph, 'segment')).toHaveLength(5);
    expect(ofType(graph, 'point')).toHaveLength(8);
    expect(ofType(graph, 'text')).toHaveLength(1);
    expect(graph.generatedObjectCount).toBe(boardObjectCount(graph));
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    expect(graph.captionPlainLines()).toEqual(['f(x) = x² − 2', 'korak 0, širina 1']);
    // the function curve is the continuous one; the jump pieces and markers are hidden
    expect(ofType(graph, 'functiongraph')[0].parents[0](3)).toBe(7);
    expect(resolve(ofType(graph, 'functiongraph')[0].attributes.visible)).toBe(true);
    for (const piece of ofType(graph, 'curve')) expect(resolve(piece.attributes.visible)).toBe(false);
    // a and b are placed on the axis, m is not revealed before the first step
    const points = ofType(graph, 'point');
    const [a, b, m] = points.slice(2, 5);
    expect([a.X(), a.Y(), b.X(), b.Y()]).toEqual([1, 0, 2, 0]);
    expect(resolve(a.attributes.visible)).toBe(true);
    expect(resolve(m.attributes.visible)).toBe(false);
    const [valueA, valueB] = points.slice(5, 7);
    expect([valueA.X(), valueA.Y(), valueB.X(), valueB.Y()]).toEqual([1, -1, 2, 2]);
});

test('Next step reveals the midpoints 1.5, 1.25, 1.375 with the values 0.25, -0.4375, -0.109375 and halves the width', () => {
    const graph = makeGraph({asyncState: false});
    const expected = [
        {step: '1', mid: '1,5', fMid: '0,25', retained: 'leva [a, m]', interval: '[1; 1,5]', width: '0,5'},
        {step: '2', mid: '1,25', fMid: '−0,4375', retained: 'desna [m, b]', interval: '[1,25; 1,5]', width: '0,25'},
        {step: '3', mid: '1,375', fMid: '−0,109375', retained: 'desna [m, b]', interval: '[1,375; 1,5]', width: '0,125'},
    ];
    expect(rows(graph)).toMatchObject({step: '0', a: '1', b: '2', 'f-a': '−1', 'f-b': '2', mid: '—', 'f-mid': '—', retained: 'še ni razkrita', interval: '[1; 2]', width: '1'});
    expect(Object.keys(rows(graph))).toEqual(['step', 'a', 'b', 'f-a', 'f-b', 'mid', 'f-mid', 'retained', 'interval', 'width']);
    for (const row of expected) {
        next(graph);
        expect(rows(graph)).toMatchObject({step: row.step, mid: row.mid, 'f-mid': row.fMid, retained: row.retained, interval: row.interval, width: row.width});
    }
    // the revealed midpoint m and its function value are drawn at the readout values
    const points = ofType(graph, 'point');
    const m = points[4];
    expect(resolve(m.attributes.visible)).toBe(true);
    expect([m.X(), m.Y()]).toEqual([1.375, 0]);
    expect([points[7].X(), points[7].Y()]).toEqual([1.375, -0.109375]);
    // English readouts use the decimal point
    setLanguage('en');
    expect(rows(graph)).toMatchObject({mid: '1.375', 'f-mid': '−0.109375', interval: '[1.375, 1.5]', retained: 'right [m, b]'});
});

test('a multi-action scene applied in one synchronous tick uses the model even though React state is stale', () => {
    const graph = makeGraph();
    apply(graph, defaultScene);
    for (const action of [choice('sign-step'), command('next-step'), command('next-step'), command('next-step')]) apply(graph, action);
    expect(graph.model).toEqual({example: 'sign-step', a: -1, b: 1, step: 3});
    expect(graph.state).toMatchObject({example: 'square-minus-two', a: 1, b: 2, step: 0});
    expect(progressText(graph)).toBe('korak 3, širina 0,25');
    // a later action in the same tick sees the earlier one
    apply(graph, choice('cubic'));
    apply(graph, parameter('bisect-a', -1.5));
    next(graph);
    expect(graph.model).toEqual({example: 'cubic', a: -1.5, b: 2, step: 1});
    apply(graph, parameter('bisect-b', 3));
    expect(graph.model).toEqual({example: 'cubic', a: -1.5, b: 3, step: 0});
});

test('every lesson scene reproduces the state its expectedState describes', () => {
    const lesson = getLessonForDemonstration('bisection')!;
    expect(lesson.steps).toHaveLength(6);
    const finals = lesson.steps.map(step => {
        const graph = makeGraph();
        // a deliberately different user state, partly advanced and playing, that the default scene must reset
        apply(graph, choice('cubic'));
        apply(graph, parameter('bisect-a', -1.5));
        next(graph, 4);
        apply(graph, command('play'));
        for (const action of step.scene!.actions) apply(graph, action);
        expect(graph.controller.isPlaying()).toBe(false);
        return [graph.model, progressText(graph)];
    });
    expect(finals).toEqual([
        [{example: 'square-minus-two', a: 1, b: 2, step: 0}, 'korak 0, širina 1'],
        [{example: 'square-minus-two', a: 1, b: 2, step: 1}, 'korak 1, širina 0,5'],
        [{example: 'square-minus-two', a: 1, b: 2, step: 3}, 'korak 3, širina 0,125'],
        [{example: 'square-minus-two', a: 1, b: 2, step: 5}, 'korak 5, širina 0,03125'],
        [{example: 'sign-step', a: -1, b: 1, step: 3}, 'korak 3, širina 0,25'],
        [{example: 'cubic', a: -1.5, b: 2, step: 0}, 'korak 0, širina 3,5'],
    ]);
});

test('the lesson values are the independently derived ones', () => {
    const three = bisectionHistory('square-minus-two', 1, 2, 3);
    expect(three.steps.map(step => step.mid)).toEqual([1.5, 1.25, 1.375]);
    expect(three.steps.map(step => step.fMid)).toEqual([0.25, -0.4375, -0.109375]);
    expect([three.currentA, three.currentB, three.currentWidth]).toEqual([1.375, 1.5, 0.125]);
    const five = bisectionHistory('square-minus-two', 1, 2, 5);
    expect([five.currentA, five.currentB, five.currentWidth]).toEqual([1.40625, 1.4375, 0.03125]);
    expect(five.currentA).toBeLessThan(Math.SQRT2);
    expect(five.currentB).toBeGreaterThan(Math.SQRT2);
    const jump = bisectionHistory('sign-step', -1, 1, 3);
    expect(jump.steps.map(step => [step.mid, step.fMid])).toEqual([[0, 1], [-0.5, -1], [-0.25, -1]]);
    expect([jump.currentA, jump.currentB, jump.exactRoot]).toEqual([-0.25, 0, undefined]);
    const cubic = bisectionHistory('cubic', -1.5, 2, 0);
    expect([cubic.fa, cubic.fb, cubic.bracket]).toEqual([-1.875, 6, 'opposite-signs']);
    const converged = bisectionHistory('cubic', -1.5, 2, 40);
    expect(Math.abs((converged.currentA + converged.currentB) / 2 - 1)).toBeLessThan(1e-9);
});

test('k Next steps and k playback steps reach the same model, and playback stops at the limit of the iteration', () => {
    for (const k of [1, 3, 7, 20]) {
        const manual = makeGraph();
        next(manual, k);
        const played = makeGraph();
        apply(played, command('play'));
        expect(played.controller.isPlaying()).toBe(true);
        playSteps(played, k);
        apply(played, command('pause'));
        expect(played.model).toEqual(manual.model);
        expect(played.model.step).toBe(k);
        expect(played.controller.isPlaying()).toBe(false);
    }
    const graph = makeGraph();
    apply(graph, command('play'));
    // a long frame never skips ahead: one step per frame at most
    graph.frames.frame(0);
    graph.frames.frame(BISECTION_STEP_INTERVAL_MS * 10);
    expect(graph.model.step).toBe(1);
    // a frame shorter than the interval does not step
    graph.frames.frame(BISECTION_STEP_INTERVAL_MS / 3);
    expect(graph.model.step).toBe(1);
});

test('playback ends at stagnation for x^2 - 2 and the state never calls the midpoint an exact root', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, command('play'));
    for (let guard = 0; guard < 200 && graph.controller.isPlaying(); guard++) graph.frames.frame(guard === 0 ? 0 : BISECTION_STEP_INTERVAL_MS);
    expect(graph.controller.isPlaying()).toBe(false);
    const history = bisectionHistory('square-minus-two', 1, 2, graph.model.step);
    expect(history.termination).toBe('stagnation');
    expect(graph.model.step).toBe(history.steps.length);
    expect(graph.model.step).toBeGreaterThan(48);
    expect(graph.model.step).toBeLessThan(BISECTION_MAX_STEPS);
    expect(history.exactRoot).toBeUndefined();
    expect(statusIds(graph)).toEqual(['bracket', 'stagnation']);
    const text = graph.statuses(graph.model, 'sl').map((status: { text: string }) => status.text).join(' ') + graph.captionPlainLines().join(' ');
    expect(text).not.toMatch(/Natančna ničla|natančna ničla pri/);
    expect(text).toMatch(/ne natančna ničla/);
    expect(controls(graph).next.props['aria-disabled']).toBe(true);
    expect(controls(graph).play.props['aria-disabled']).toBe(true);
    expect(() => next(graph)).toThrow(DomainError);
    expect(graph.model.step).toBe(history.steps.length);
    // the width is shown in exponent notation, never as 0
    expect(rows(graph).width).toMatch(/^\d,\d+e−?\d+$|^\d,\d+e-\d+$/);
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
    expect(graph.model).toEqual({example: 'square-minus-two', a: 1, b: 2, step: 0});
    expect(graph.controller.isPlaying()).toBe(false);
    expect(graph.frames.callbacks.size).toBe(0);
    apply(graph, command('replay'));
    expect(graph.controller.isPlaying()).toBe(true);
    expect(graph.model.step).toBe(0);
    playSteps(graph, 2);
    expect(graph.model.step).toBe(2);
});

test('editing an endpoint or the example restarts the history at step 0 and pauses playback', () => {
    const edits: Array<(graph: any) => void> = [
        graph => apply(graph, parameter('bisect-a', 0.5)),
        graph => apply(graph, parameter('bisect-b', 3)),
        graph => apply(graph, choice('cubic')),
        graph => apply(graph, choice('square-minus-two')), // the same example: still an edit that loads its bracket
        graph => controls(graph).found.NumberInput[0].props.onChange(0.25),
        graph => controls(graph).found.NumberInput[1].props.onChange(3.5),
        graph => controls(graph).found.ChoiceSelect[0].props.onChange('sign-step'),
    ];
    for (const edit of edits) {
        const graph = makeGraph({asyncState: false});
        next(graph, 3);
        apply(graph, command('play'));
        expect(graph.controller.isPlaying()).toBe(true);
        edit(graph);
        expect(graph.model.step).toBe(0);
        expect(graph.controller.isPlaying()).toBe(false);
        expect(graph.frames.callbacks.size).toBe(0);
        expect(graph.state.step).toBe(0);
        expect(progressText(graph)).toMatch(/^korak 0, /);
        // the next step starts the new history
        next(graph);
        expect(graph.model.step).toBe(1);
        expect(bisectionHistory(graph.model.example, graph.model.a, graph.model.b, 1).steps[0].index).toBe(1);
    }
    // a repeated value is not an edit and keeps the progress
    const graph = makeGraph();
    next(graph, 2);
    apply(graph, parameter('bisect-a', 1));
    expect(graph.model.step).toBe(2);
});

test('endpoints and examples outside the domain are rejected without changing the model', () => {
    const graph = makeGraph();
    next(graph, 2);
    const before = {...graph.model};
    for (const bad of [4.01, -4.01, NaN, Infinity, 2, 2.5]) expect(() => apply(graph, parameter('bisect-a', bad))).toThrow(DomainError);
    for (const bad of [4.01, -4.01, NaN, -Infinity, 1, 0]) expect(() => apply(graph, parameter('bisect-b', bad))).toThrow(DomainError);
    expect(() => apply(graph, choice('quartic'))).toThrow();
    expect(graph.model).toEqual(before);
    // the inspector swallows exactly the domain errors and reports the rejection to the input
    const {found} = controls(graph);
    expect(found.NumberInput[0].props.onChange(7)).toBe(false);
    expect(found.NumberInput[0].props.onChange(1.5)).toBe(true);
    expect(graph.model).toEqual({example: 'square-minus-two', a: 1.5, b: 2, step: 0});
});

test('exact roots, invalid brackets, the step limit and the hypothesis are stated in words and on the board', () => {
    const graph = makeGraph({asyncState: false});
    // same sign: no guarantee, no step possible
    apply(graph, parameter('bisect-b', 3));
    apply(graph, parameter('bisect-a', 2));
    expect(statusIds(graph)).toEqual(['invalid-bracket']);
    expect(graph.captionPlainLines()[2]).toBe('isti predznak: ničla ni zagotovljena');
    expect(controls(graph).next.props['aria-disabled']).toBe(true);
    expect(() => next(graph)).toThrow(DomainError);

    // an exact root at an endpoint stops before the first step
    apply(graph, choice('cubic'));
    apply(graph, parameter('bisect-a', 1));
    expect(statusIds(graph)).toEqual(['endpoint-root']);
    expect(graph.statuses(graph.model, 'sl')[0].text).toContain('Krajišče 1 je natančna ničla');
    expect(controls(graph).next.props['aria-disabled']).toBe(true);

    // an exact midpoint root: the midpoint of [0.5, 1.5] is 1 and f(1) = 0 exactly
    apply(graph, parameter('bisect-a', 0.5));
    apply(graph, parameter('bisect-b', 1.5));
    next(graph);
    expect(statusIds(graph)).toEqual(['bracket', 'exact-midpoint-root']);
    expect(graph.captionPlainLines()[2]).toBe('natančna ničla pri 1');
    expect(rows(graph)).toMatchObject({mid: '1', 'f-mid': '0', retained: 'nobena, m je ničla', interval: '[1; 1]', width: '0'});
    expect(graph.controller.isComplete()).toBe(true);
    expect(controls(graph).next.props['aria-disabled']).toBe(true);

    // the iteration limit: the root 0 of x^3 - x is approached but never reached exactly, and the width stays above the double spacing
    apply(graph, parameter('bisect-a', -0.5));
    apply(graph, parameter('bisect-b', 0.25));
    next(graph, BISECTION_MAX_STEPS);
    expect(graph.model.step).toBe(BISECTION_MAX_STEPS);
    expect(statusIds(graph)).toEqual(['bracket', 'iteration-limit']);
    expect(graph.controller.isComplete()).toBe(true);
    expect(() => next(graph)).toThrow(DomainError);
    expect(graph.model.step).toBe(BISECTION_MAX_STEPS);
    expect(graph.captionPlainLines()[2]).toBe('omejitev korakov dosežena');

    // the sign step: opposite signs, but the hypothesis is not satisfied (in both languages)
    apply(graph, choice('sign-step'));
    expect(statusIds(graph)).toEqual(['hypothesis']);
    expect(graph.captionPlainLines()[2]).toBe('predpostavka izreka ni izpolnjena');
    setLanguage('en');
    expect(graph.captionPlainLines()[2]).toBe('theorem hypothesis not satisfied');
    expect(statusIds(graph, 'en')).toEqual(['hypothesis']);
    expect(graph.statuses(graph.model, 'en')[0].text).toMatch(/^Theorem hypothesis not satisfied/);
    next(graph, 3);
    expect(statusIds(graph, 'en')).toEqual(['hypothesis']);
    expect(rows(graph)['f-mid']).toBe('−1');
});

test('the jump of the sign step is two separate pieces with an open and a filled marker, never a vertical segment', () => {
    const graph = makeGraph();
    apply(graph, choice('sign-step'));
    const [leftPiece, rightPiece] = ofType(graph, 'curve');
    expect(resolve(ofType(graph, 'functiongraph')[0].attributes.visible)).toBe(false);
    for (const piece of [leftPiece, rightPiece]) {
        expect(resolve(piece.attributes.visible)).toBe(true);
        piece.updateDataArray();
    }
    expect(leftPiece.dataX.every((x: number) => x <= 0)).toBe(true);
    expect(leftPiece.dataY.every((y: number) => y === -1)).toBe(true);
    expect(rightPiece.dataX.every((x: number) => x >= 0)).toBe(true);
    expect(rightPiece.dataY.every((y: number) => y === 1)).toBe(true);
    expect([leftPiece.dataX[0], leftPiece.dataX.at(-1), rightPiece.dataX[0], rightPiece.dataX.at(-1)]).toEqual([BOX[0], 0, 0, BOX[2]]);
    // no sample pair of one piece spans the jump, so no vertical connection exists inside a piece
    for (const piece of [leftPiece, rightPiece]) {
        for (let i = 1; i < piece.dataY.length; i++) expect(piece.dataY[i]).toBe(piece.dataY[i - 1]);
    }
    const markers = ofType(graph, 'point').slice(0, 2);
    expect(markers.map((point: any) => [point.X(), point.Y()])).toEqual([[0, -1], [0, 1]]);
    expect(markers.every((point: any) => resolve(point.attributes.visible))).toBe(true);
    // the open ring uses the board surface as its fill, the filled one the curve colour
    expect(markers[0].attributes.fillColor).toBe(GraphPalette.boardSurface);
    expect(markers[1].attributes.fillColor).toBe(GraphPalette.primaryCurve);
    // markers are hidden for a continuous example
    apply(graph, choice('cubic'));
    expect(markers.some((point: any) => resolve(point.attributes.visible))).toBe(false);
});

test('sampleJumpPieces clips the pieces to the view and keeps the value at the jump on the right piece', () => {
    const example = BISECTION_EXAMPLES['sign-step'];
    const both = sampleJumpPieces(example, -2, 3, 4);
    expect(both.left.x).toEqual([-2, -1.5, -1, -0.5, 0]);
    expect(both.left.y).toEqual([-1, -1, -1, -1, -1]);
    expect(both.right.x[0]).toBe(0);
    expect(both.right.y.every(y => y === 1)).toBe(true);
    expect(sampleJumpPieces(example, 1, 3).left).toEqual({x: [], y: []});
    expect(sampleJumpPieces(example, -3, -1).right).toEqual({x: [], y: []});
    expect(sampleJumpPieces(BISECTION_EXAMPLES.cubic, -1, 1)).toEqual({left: {x: [], y: []}, right: {x: [], y: []}});
    expect(leftLimit(example)).toBe(-1);
    expect(leftLimit(BISECTION_EXAMPLES.cubic)).toBeNaN();
});

test('formatPrecise keeps up to twelve decimals, switches to exponent notation for tiny values and never prints Infinity or NaN', () => {
    expect(formatPrecise(-0.109375, 'sl')).toBe('−0,109375');
    expect(formatPrecise(0.03125, 'en')).toBe('0.03125');
    expect(formatPrecise(0, 'sl')).toBe('0');
    expect(formatPrecise(-0, 'sl')).toBe('0');
    expect(formatPrecise(2 ** -30, 'en')).toBe('9.313e-10');
    expect(formatPrecise(-(2 ** -30), 'sl')).toBe('−9,313e-10');
    expect(formatPrecise(2 ** -20, 'en')).toBe('0.000000953674');
    expect(formatPrecise(1.4142135623730951, 'sl')).toBe('1,414213562373');
    expect(formatPrecise(1.25e-12, 'en')).toBe('1.25e-12');
    for (const bad of [NaN, Infinity, -Infinity]) expect(formatPrecise(bad, 'sl')).toBe('—');
});

test('names, kinds and commands the graph does not own are unsupported, and iteration commands outside the supported set are rejected', () => {
    const graph = makeGraph();
    for (const name of ['x1', 'y1', 'x2', 'y2', 'k', 'n', 'a', 'A', 'omega', 'phi', 'B', 'x0', 'h', 'b']) {
        expect(() => apply(graph, {kind: 'function-parameter', name, value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
    }
    expect(() => apply(graph, {kind: 'function-choice', name: 'derivative-function', value: 'sin'})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-visibility', target: 'tangent', visible: true})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, command('stop'))).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'decasteljau', command: 'play'})).toThrow(UnsupportedLessonActionError);
    for (const supported of ['play', 'pause', 'replay', 'next-step', 'reset']) expect(graph.supportsLessonAction(command(supported))).toBe(true);
    expect(graph.supportsLessonAction(command('stop'))).toBe(false);
    expect(graph.supportsLessonAction(parameter('bisect-a', 1))).toBe(true);
    expect(graph.supportsLessonAction(choice('cubic'))).toBe(true);
    expect(graph.model).toEqual({example: 'square-minus-two', a: 1, b: 2, step: 0});
});

test('controls: example select, endpoint inputs, Next step, Play/Pause and Reset with their states', () => {
    const graph = makeGraph({asyncState: false});
    const first = controls(graph);
    expect(first.found.ChoiceSelect[0].props.options.map((option: any) => option.value)).toEqual(['square-minus-two', 'sign-step', 'cubic']);
    expect(first.found.ChoiceSelect[0].props.options.map((option: any) => option.text)).toEqual(['f(x) = x² − 2', 'f(x) = −1 za x < 0, sicer 1', 'f(x) = x³ − x']);
    expect(first.found.NumberInput).toHaveLength(2);
    expect(first.found.NumberInput.map((input: any) => [input.props.min, input.props.max, input.props.value])).toEqual([[-4, 4, 1], [-4, 4, 2]]);
    expect(first.found.NumberInput.map((input: any) => input.props.label)).toEqual(['Levo krajišče a', 'Desno krajišče b']);
    expect(first.found.button.map((button: any) => button.props['data-action'])).toEqual(['next-step', 'play-pause', 'reset']);
    expect(first.next.props['aria-disabled']).toBe(false);
    expect(first.play.props['aria-disabled']).toBe(false);
    expect(first.reset.props['aria-disabled']).toBe(true);
    expect(first.play.props.children).toBe('Predvajaj');

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
    controls(graph).reset.props.onClick();
    expect(graph.model.step).toBe(0);
    setLanguage('en');
    const english = controls(graph);
    expect(english.next.props.children).toBe('Next step');
    expect(english.reset.props.children).toBe('Reset iteration');
    expect(english.play.props.children).toBe('Play');
    expect(collect(graph.renderControls()).div.some((element: any) => element.props.role === 'group' && element.props['aria-label'] === 'Iteration controls')).toBe(true);
});

test('presets save the model with the step, reopen paused at that step and never start playback', () => {
    const graph = makeGraph();
    next(graph, 4);
    apply(graph, command('play'));
    const exported = graph.exportPreset();
    expect(exported.id).toBe('bisection');
    expect(exported.data).toEqual({example: 'square-minus-two', a: 1, b: 2, step: 4});
    expect(JSON.stringify(exported)).not.toMatch(/play|running|status/i);

    const reopened = makeGraph({asyncState: false});
    apply(reopened, command('play'));
    expect(reopened.controller.isPlaying()).toBe(true);
    reopened.importPreset({id: 'bisection', boardState: {boundingBox: [-1, 1, 1, -1]}, data: exported.data});
    expect(reopened.model).toEqual({example: 'square-minus-two', a: 1, b: 2, step: 4});
    expect(reopened.controller.isPlaying()).toBe(false);
    expect(reopened.frames.callbacks.size).toBe(0);
    expect(progressText(reopened)).toBe('korak 4, širina 0,0625');
    // continuing from the loaded step gives the same state as never having left it
    next(reopened);
    next(graph);
    expect(reopened.model).toEqual(graph.model);

    // a string, a missing step and extra properties are sanitized; a stored step beyond an exact root is cut to the steps that exist
    reopened.importPresetData(JSON.stringify({example: 'cubic', a: 0.5, b: 1.5, step: 30, extra: true}));
    expect(reopened.model).toEqual({example: 'cubic', a: 0.5, b: 1.5, step: 1});
    expect(reopened.controller.isComplete()).toBe(false);
    expect(controls(reopened).next.props['aria-disabled']).toBe(true);
    reopened.importPresetData({example: 'sign-step', a: -1, b: 1, step: 2});
    expect(reopened.model).toEqual({example: 'sign-step', a: -1, b: 1, step: 2});
});

test('malformed preset data is rejected to the default model with a warning', () => {
    const graph = makeGraph();
    next(graph, 2);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const valid = {example: 'square-minus-two', a: 1, b: 2, step: 0};
    const bad = [undefined, null, 'not json', {}, [], {...valid, example: 'quartic'}, {...valid, a: 2, b: 1}, {...valid, a: 1, b: 1}, {...valid, a: -5},
        {...valid, b: 4.5}, {...valid, a: '1'}, {...valid, step: -1}, {...valid, step: 1.5}, {...valid, step: BISECTION_MAX_STEPS + 1}, {...valid, step: '2'}];
    for (const entry of bad) {
        graph.importPresetData(entry);
        expect(graph.model).toEqual(valid);
        expect(graph.controller.isPlaying()).toBe(false);
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
});

test('capture and restore bring back the synchronous model and leave playback paused', () => {
    const graph = makeGraph();
    apply(graph, choice('cubic'));
    apply(graph, parameter('bisect-a', -1.5));
    next(graph, 3);
    apply(graph, command('play'));
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual({example: 'cubic', a: -1.5, b: 2, step: 3});
    expect(checkpoint.value.graphState).toMatchObject({example: 'cubic', a: -1.5, b: 2, step: 3});
    apply(graph, defaultScene);
    apply(graph, command('play'));
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual({example: 'cubic', a: -1.5, b: 2, step: 3});
    expect(graph.controller.isPlaying()).toBe(false);
    expect(graph.frames.callbacks.size).toBe(0);
    expect(graph.setState).toHaveBeenLastCalledWith(expect.objectContaining({example: 'cubic', a: -1.5, b: 2, step: 3}));
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
});

test('lesson lifecycle, figure capture, export and scene replacement pause playback', () => {
    const pauses: Array<[string, (graph: any) => void]> = [
        ['stopLessonAnimations', graph => graph.stopLessonAnimations()],
        ['beforeFigureCapture', graph => graph.beforeFigureCapture()],
        ['initialize (scene replacement)', graph => graph.initialize()],
        ['disposeFigureScene', graph => graph.disposeFigureScene()],
        ['prepared default scene', graph => apply(graph, defaultScene)],
        ['preset import', graph => graph.importPreset({id: 'bisection', data: {example: 'cubic', a: 0.5, b: 2, step: 2}})],
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
    expect(graph.frames.frame(BISECTION_STEP_INTERVAL_MS)).toBe(false);
    expect(controller.nextStep()).toBe(false);
    controller.play();
    expect(graph.frames.callbacks.size).toBe(0);
    expect(graph.model).toEqual({example: 'square-minus-two', a: 1, b: 2, step: 0});
});

test('generated objects are disposed and not duplicated across repeated generation and default scenes', () => {
    const graph = makeGraph();
    const baseline = boardObjectCount(graph);
    expect(baseline).toBe(17);
    for (let i = 0; i < 4; i++) graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
    expect(graph.generatedObjectCount).toBe(baseline);
    for (let i = 0; i < 5; i++) {
        apply(graph, choice('sign-step'));
        next(graph, 2);
        apply(graph, defaultScene);
    }
    expect(boardObjectCount(graph)).toBe(baseline);
    graph.disposeFigureScene();
    expect(boardObjectCount(graph)).toBe(0);
    expect(graph.generatedObjectCount).toBe(0);
    // a model change after disposal must not touch removed objects
    expect(() => next(graph)).not.toThrow();
    graph.initialize();
    expect(boardObjectCount(graph)).toBe(baseline);
});

test('the caption follows the language and a language change notifies subscribers', () => {
    const graph = makeGraph();
    next(graph, 3);
    expect(graph.captionPlainLines()).toEqual(['f(x) = x² − 2', 'korak 3, širina 0,125']);
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(graph.captionPlainLines()).toEqual(['f(x) = x² − 2', 'step 3, width 0.125']);
    unsubscribe();
});

test('the legend names the curve, the retained interval and the discarded part in words', () => {
    const graph = makeGraph();
    expect(graph.renderLegend().props.items.map((item: any) => [item.id, item.label])).toEqual([
        ['function', 'Graf funkcije f'], ['retained', 'Zadržani interval (v njem je ničla)'], ['discarded', 'Zavrženi del intervala'],
    ]);
});

test('the retained interval and the discarded half follow the last step', () => {
    const graph = makeGraph();
    const [discarded, retained] = ofType(graph, 'segment');
    const span = (segment: any) => [resolve(segment.parents[0][0]), resolve(segment.parents[1][0])];
    expect(resolve(discarded.attributes.visible)).toBe(false);
    expect(span(retained)).toEqual([1, 2]);
    expect(resolve(retained.attributes.visible)).toBe(true);
    next(graph);
    expect(span(retained)).toEqual([1, 1.5]);
    expect(resolve(discarded.attributes.visible)).toBe(true);
    expect(span(discarded)).toEqual([1.5, 2]);
    next(graph);
    expect(span(retained)).toEqual([1.25, 1.5]);
    expect(span(discarded)).toEqual([1, 1.25]);
    // an invalid bracket has no retained interval to draw
    apply(graph, parameter('bisect-b', 3));
    apply(graph, parameter('bisect-a', 2));
    expect(resolve(retained.attributes.visible)).toBe(false);
});
