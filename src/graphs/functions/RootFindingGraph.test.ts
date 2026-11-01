import {RootFindingGraph, ROOT_FINDING_STEP_INTERVAL_MS, ROOT_FINDING_TABLE_ROWS} from './RootFindingGraph';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {ROOT_FINDING_EXAMPLES, ROOT_FINDING_MAX_STEPS, rootFindingExample} from '../../analysis/rootFinding';
import {secantLine, tangentLine} from '../../analysis/derivative';
import {setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';
import {RootFindingModel} from '../../analysis/rootFindingModel';

// The export itself is not under test: only that it pauses the iteration before it captures the board.
vi.mock('../base/export/FigureCapture', () => ({downloadSVG: vi.fn(() => Promise.resolve()), downloadPNG: vi.fn(() => Promise.resolve())}));
vi.mock('../base/export/PresetFigureBatch', () => ({downloadPresetFigures: vi.fn(() => Promise.resolve())}));

const BOX = [-2.5, 4, 3.5, -3];

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        container: document.createElement('div'),
        containerObj: document.createElement('div'),
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
                object.setAttribute = vi.fn((patch: object) => { Object.assign(object.attributes, patch); });
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

/** A graph on a fake board; React state is written synchronously (the scene store), as in the real host. */
function makeGraph(model?: Partial<RootFindingModel>) {
    const frames = manualScheduler();
    const graph = new RootFindingGraph(frames.scheduler) as any;
    graph.board = fakeBoard();
    graph.graphSession = {
        isReady: true, isAlive: true, dispose: vi.fn(), signal: new AbortController().signal,
        waitUntilReady: () => Promise.resolve(), beginTransition: () => () => undefined,
    };
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn((patch: any) => graph.store.setState(patch));
    graph.initialize();
    if (model) graph.importPreset({id: 'stored', data: {...graph.model, ...model}});
    return Object.assign(graph, {frames});
}

const next = (graph: any, count = 1) => { for (let i = 0; i < count; i++) graph.nextStep(); };
const view = (graph: any) => graph.viewOf(graph.model);
const statusId = (graph: any) => graph.status(graph.model, 'sl').id;
const progressText = (graph: any) => graph.captionPlainLines()[1];

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
const rows = (graph: any) => Object.fromEntries((collect(graph.renderReadout()).FunctionReadout[0].props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));
const tableRows = (graph: any) => collect(graph.renderReadout()).tr?.filter((row: any) => row.props['data-iterate-row'] !== undefined) ?? [];

beforeEach(() => setLanguage('sl'));

test('Newton from 1 on x^2 - 2 reveals 3/2, 17/12, 577/408 and the error shrinks to the reference root', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual({method: 'newton', example: 'square-minus-two', x0: 1, x1: 2, step: 0});
    expect(statusId(graph)).toBe('ready');
    expect(view(graph).line).toBeUndefined();
    next(graph, 3);
    expect(graph.model.step).toBe(3);
    const expected = [1, 3 / 2, 17 / 12, 577 / 408];
    expect(view(graph).history.iterates.length).toBe(4);
    view(graph).history.iterates.forEach((x: number, k: number) => expect(x).toBeCloseTo(expected[k], 12));
    expect(rows(graph).iterate).toBe('1,414215686275'); // 577/408 with a decimal comma
    expect(rows(graph).error).toBe('0,000002123901');
    expect(rows(graph).reference).toBe('1,414213562373');
    expect(statusId(graph)).toBe('running');
    expect(tableRows(graph).length).toBe(4);
    expect(progressText(graph)).toBe('korak 3, napaka 0,000002123901');
    setLanguage('en');
    expect(rows(graph).iterate).toBe('1.414215686275');
});

test('the drawn tangent and secant meet the x-axis exactly at the next iterate', () => {
    const newton = makeGraph();
    for (let k = 1; k <= 4; k++) {
        next(newton);
        const {line, history} = view(newton);
        const previous = history.iterates[k - 1];
        const tangent = tangentLine(rootFindingExample('square-minus-two'), previous);
        expect(line.from).toEqual({x: previous, y: rootFindingExample('square-minus-two').value(previous)});
        expect(line.to.y).toBe(0);
        expect(Math.abs(line.to.x - (-tangent.intercept / tangent.slope))).toBeLessThan(1e-12);
        expect(line.to.x).toBe(history.iterates[k]);
    }
    const secant = makeGraph({method: 'secant'});
    // before the first step only the secant through the two starts is shown
    expect(view(secant).line).toEqual({from: {x: 1, y: -1}, to: {x: 2, y: 2}});
    for (let k = 1; k <= 4; k++) {
        next(secant);
        const {line, history} = view(secant);
        const earlier = history.iterates[k - 1];
        const later = history.iterates[k];
        const chord = secantLine(rootFindingExample('square-minus-two'), earlier, later - earlier);
        expect(line.from.x).toBe(earlier);
        expect(Math.abs(line.to.x - (-chord.intercept / chord.slope))).toBeLessThan(1e-12);
        expect(line.to.x).toBe(history.iterates[k + 1]);
    }
});

test('Next step and playback run the same transition and playback stops at the end of the iteration', () => {
    const stepped = makeGraph();
    const played = makeGraph();
    next(stepped, 3);
    played.play();
    played.frames.frame(0);
    for (let guard = 0; guard < 10 && played.model.step < 3; guard++) played.frames.frame(ROOT_FINDING_STEP_INTERVAL_MS);
    expect(played.model).toEqual(stepped.model);
    for (let guard = 0; guard < 80 && played.controller.isPlaying(); guard++) played.frames.frame(ROOT_FINDING_STEP_INTERVAL_MS);
    expect(played.controller.isPlaying()).toBe(false);
    expect(statusId(played)).toBe('root-found');
    expect(played.model.step).toBeLessThan(12);
    expect(() => played.nextStep()).toThrow(DomainError);
});

test('editing the method, the example or a start restarts the history at step 0 and pauses playback', () => {
    const edits: Array<(graph: any) => void> = [
        graph => graph.setMethod('secant'),
        graph => graph.setExample('cubic-three-roots'),
        graph => graph.setExample('square-minus-two'), // the same example: still an edit that loads its starts
        graph => graph.setStart('x0', 0.5),
        graph => graph.setStart('x1', 3),
        graph => controls(graph).found.NumberInput[0].props.onChange(0.25),
        graph => controls(graph).found.ChoiceSelect[0].props.onChange('secant'),
        graph => controls(graph).found.ChoiceSelect[1].props.onChange('cubic-two-cycle'),
        graph => { graph.startPoints.x0.moveTo([0.7, 0]); graph.startPoints.x0.handlers.drag(); },
    ];
    for (const [index, edit] of edits.entries()) {
        const graph = makeGraph();
        next(graph, 2);
        graph.play();
        expect(graph.controller.isPlaying()).toBe(true);
        edit(graph);
        expect(graph.model.step, `edit ${index}`).toBe(0);
        expect(graph.controller.isPlaying(), `edit ${index}`).toBe(false);
        expect(graph.frames.callbacks.size).toBe(0);
        expect(graph.state.step).toBe(0);
        expect(progressText(graph)).toMatch(/^korak 0, /);
        next(graph);
        expect(graph.model.step).toBe(1);
    }
    // a repeated value is not an edit and keeps the progress; so does choosing the same method
    const graph = makeGraph();
    next(graph, 2);
    graph.setStart('x0', 1);
    graph.setMethod('newton');
    expect(graph.model.step).toBe(2);
});

test('a method switch keeps the example and the starts', () => {
    const graph = makeGraph({example: 'cubic-two-cycle', x0: -2, x1: 3});
    next(graph, 2);
    graph.setMethod('secant');
    expect(graph.model).toEqual({method: 'secant', example: 'cubic-two-cycle', x0: -2, x1: 3, step: 0});
    graph.setMethod('newton');
    expect(graph.model).toEqual({method: 'newton', example: 'cubic-two-cycle', x0: -2, x1: 3, step: 0});
});

test('Reset returns to step 0 of the same model and stops playback', () => {
    const graph = makeGraph({x0: 3});
    next(graph, 3);
    graph.play();
    controls(graph).reset.props.onClick();
    expect(graph.model).toEqual({method: 'newton', example: 'square-minus-two', x0: 3, x1: 2, step: 0});
    expect(graph.controller.isPlaying()).toBe(false);
    expect(statusId(graph)).toBe('ready');
});

test('starts outside the range or equal for the secant method are rejected without changing the model', () => {
    const graph = makeGraph({method: 'secant'});
    const before = {...graph.model};
    for (const value of [4.5, -5, NaN, Infinity]) {
        expect(() => graph.setStart('x0', value)).toThrow(DomainError);
    }
    expect(() => graph.setStart('x0', 2)).toThrow(DomainError);
    expect(() => graph.setStart('x1', 1)).toThrow(DomainError);
    expect(() => graph.setExample('quartic')).toThrow(DomainError);
    expect(() => graph.setMethod('halley')).toThrow(DomainError);
    expect(graph.model).toEqual(before);
    // the UI swallows the refusal
    expect(() => controls(graph).found.NumberInput[0].props.onChange(9)).not.toThrow();
    expect(graph.model).toEqual(before);
    setLanguage('en');
    try { graph.setStart('x0', 9); } catch (error) {
        expect((error as DomainError).message).toBe('The start x0 must be a number between −4 and 4.');
    }
    // x1 is not an input for Newton's method
    graph.setMethod('newton');
    expect(controls(graph).found.NumberInput.length).toBe(1);
});

test('every termination is stated in words and on the board', () => {
    const cases: Array<[Partial<RootFindingModel>, number, string, RegExp]> = [
        [{}, 20, 'root-found', /^ustalitev pri 1,41421/],
        [{x0: 0}, 0, 'flat-tangent', /vodoravna tangenta/], // f'(0) = 0 for x^2 - 2
        [{example: 'cubic-two-cycle', x0: 0}, 5, 'repeated-iterate', /ponavljajo/],
        [{method: 'secant', x0: -1, x1: 1}, 0, 'flat-secant', /vodoravna sekanta/], // f(-1) = f(1) = -1
        [{example: 'cubic-three-roots', x0: 0}, 0, 'root-found', /^ustalitev pri 0$/], // f(0) = 0 exactly
    ];
    for (const [model, steps, id, board] of cases) {
        const graph = makeGraph(model);
        for (let i = 0; i < steps && graph.canAdvance(); i++) next(graph);
        expect(statusId(graph), JSON.stringify(model)).toBe(id);
        expect(graph.canAdvance()).toBe(false);
        expect(graph.boardStatus(graph.model, 'sl')?.text).toMatch(board);
        expect(() => graph.nextStep()).toThrow(DomainError);
        expect(controls(graph).next.props['aria-disabled']).toBe(true);
    }
    // the 2-cycle 0, 1, 0 stops with the repeated iterate kept as the last entry, long before the cap
    const cycle = makeGraph({example: 'cubic-two-cycle', x0: 0});
    next(cycle, 2);
    expect(view(cycle).history.iterates).toEqual([0, 1, 0]);
    expect(cycle.model.step).toBe(2);
    expect(cycle.model.step).toBeLessThan(ROOT_FINDING_MAX_STEPS);
});

test('the iterate table lists at most the last rows and notes the cut', () => {
    const graph = makeGraph({method: 'secant', example: 'cubic-three-roots', x0: -4, x1: -3.9});
    for (let i = 0; i < 40 && graph.canAdvance(); i++) next(graph);
    const all = view(graph).history.iterates.length;
    expect(tableRows(graph).length).toBe(Math.min(all, ROOT_FINDING_TABLE_ROWS));
});

test('presets save the model with the step, reopen paused at that step and never start playback', () => {
    const graph = makeGraph({method: 'secant'});
    next(graph, 3);
    graph.play();
    const exported = graph.exportPreset();
    expect(exported.id).toBe('root-finding');
    expect(exported.data).toEqual({method: 'secant', example: 'square-minus-two', x0: 1, x1: 2, step: 3});
    expect(JSON.stringify(exported)).not.toMatch(/play|running|status|iterates/i);

    const reopened = makeGraph();
    reopened.play();
    expect(reopened.controller.isPlaying()).toBe(true);
    reopened.importPreset({id: 'root-finding', boardState: {boundingBox: [-1, 1, 1, -1]}, data: exported.data});
    expect(reopened.model).toEqual(exported.data);
    expect(reopened.controller.isPlaying()).toBe(false);
    expect(reopened.frames.callbacks.size).toBe(0);
    expect(view(reopened).history).toEqual(view(graph).history);
    next(reopened);
    next(graph);
    expect(reopened.model).toEqual(graph.model);

    // a stored step beyond a termination is cut to the steps that exist
    reopened.importPreset({id: 'stored', data: {method: 'newton', example: 'cubic-three-roots', x0: 0, x1: 1, step: 30, extra: true}});
    expect(reopened.model).toEqual({method: 'newton', example: 'cubic-three-roots', x0: 0, x1: 1, step: 0});
});

test('malformed preset data is rejected to the default model with a warning', () => {
    const graph = makeGraph();
    next(graph, 2);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const valid = {method: 'newton', example: 'square-minus-two', x0: 1, x1: 2, step: 0};
    const bad = [{}, [], 'not json', {...valid, method: 'halley'}, {...valid, example: 'quartic'}, {...valid, x0: 5}, {...valid, x1: -5}, {...valid, x0: '1'},
        {...valid, method: 'secant', x0: 2}, {...valid, step: -1}, {...valid, step: 1.5}, {...valid, step: ROOT_FINDING_MAX_STEPS + 1}, {...valid, step: '2'}];
    for (const entry of bad) {
        graph.importPreset({id: 'stored', data: entry});
        expect(graph.model).toEqual(valid);
        expect(graph.controller.isPlaying()).toBe(false);
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
});

test('the reference roots used by the readout are the stored ones', () => {
    for (const example of Object.values(ROOT_FINDING_EXAMPLES)) {
        const graph = makeGraph({example: example.id, x0: example.defaultStart});
        expect(graph.errorOf(graph.model, example.referenceRoot)).toBe(0);
    }
});

test('unmount-level cleanup: removing the scene leaves no start point references', () => {
    const graph = makeGraph();
    expect(Object.keys(graph.startPoints).sort()).toEqual(['x0', 'x1']);
    graph.removeGeneratedObjects?.();
    graph.onSceneRemoved();
    expect(graph.startPoints).toEqual({});
});
