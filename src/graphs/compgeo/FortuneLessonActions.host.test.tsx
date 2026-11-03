import React from 'react';
import {act, cleanup, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {FORTUNE_STEP_INTERVAL_MS, FortuneGraph} from './FortuneGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {LessonAction, LessonAnimationCommand} from '../../learning/model';
import {sceneActions} from '../../learning/runtime/lessonCatalog';
import {compgeoGuidedLessons, FORTUNE_SITES, FORTUNE_TRACE_STEPS, FORTUNE_VIEW} from '../../learning/content/compgeoGuidedLessons';
import {Rational} from '../../compgeo/rational';
import {dualEdges, type VoronoiDiagram, voronoiFromDelaunay} from '../../compgeo/voronoi';
import {setLanguage} from '../../localization';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve()}));

// A classroom board is 1280x720: the shim's 600x400 layout is replaced for this file, so the boards are created at that size.
const BOARD_WIDTH = 1280;
const BOARD_HEIGHT = 720;
beforeAll(() => {
    installBoardShims();
    for (const [name, size] of [['clientWidth', BOARD_WIDTH], ['clientHeight', BOARD_HEIGHT], ['offsetWidth', BOARD_WIDTH], ['offsetHeight', BOARD_HEIGHT]] as const) {
        Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
    }
    HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: BOARD_WIDTH, bottom: BOARD_HEIGHT,
        width: BOARD_WIDTH, height: BOARD_HEIGHT, toJSON: () => ({})}) as DOMRect;
});
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

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

type Shown = {elType: string; name?: string; X?: () => number; Y?: () => number};

class Observed extends FortuneGraph {
    /** The lesson runtime's entry point, exposed for synchronous action sequences. */
    run1(action: LessonAction) { this.applyLessonAction(action); }
    liveBoard() { return this.board; }
    box() { return this['drawBox'](this.run()); }
}

const sitesOf = (graph: Observed) => graph.model.points.map(({x, y}) => [x, y]);
type PointSetAction = Extract<LessonAction, {kind: 'point-set'}>;
const trace = (command: LessonAnimationCommand): LessonAction => ({kind: 'animation', animationId: 'algorithm-trace', command});
const traceStep = (step: number | 'end'): PointSetAction => ({kind: 'point-set', operation: 'set-trace-step', step});
const apply = (graph: Observed, action: LessonAction) => act(() => { graph.run1(action); });
const part = (name: string) => document.querySelector(`[data-fortune="${name}"]`)?.textContent ?? undefined;
const READOUTS = ['step', 'note', 'height', 'beach', 'vertices'] as const;
const readouts = () => READOUTS.map(part);
const queueText = () => [...document.querySelectorAll('[data-fortune="queue"] li')].map(li => li.textContent ?? '');

/** A mounted graph on a manual scheduler; the previous one is unmounted first (one board per document). */
function setup() {
    cleanup();
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, frames};
}
const playOneTick = (graph: Observed, frames: ReturnType<typeof manualScheduler>) => {
    apply(graph, trace('play'));
    act(() => { frames.frame(0); });
    act(() => { frames.frame(FORTUNE_STEP_INTERVAL_MS); });
};

const lesson = () => compgeoGuidedLessons.find(entry => entry.demonstrationId === 'fortune')!;
const sceneOf = (stepId: string) => lesson().steps.find(step => step.id === stepId)!.scene!;
const STEPS = ['fortune-sites', 'fortune-predict', 'fortune-site-events', 'fortune-circle-scheduled', 'fortune-false-alarm', 'fortune-true-events', 'fortune-diagram'];

test('the default scene is the A-D example at step 0, stopped with nothing scheduled, and the trace actions are supported', () => {
    const {graph, frames} = setup();
    expect([graph.step, graph.isPlaying, frames.callbacks.size, graph.run().length]).toEqual([0, false, 0, 8]);
    expect(sitesOf(graph)).toEqual(FORTUNE_SITES);
    for (const command of ['next-step', 'reset', 'play', 'pause', 'replay'] as const) expect(graph.supportsLessonAction(trace(command))).toBe(true);
    expect(graph.supportsLessonAction(traceStep('end'))).toBe(true);
});

test('set-trace-step clamps a number like a stored Preset step, and end is the last step', () => {
    const {graph} = setup();
    const last = graph.run().length - 1;
    const stepAfter = (step: number | 'end') => { apply(graph, traceStep(step)); return graph.step; };
    expect([stepAfter(5), stepAfter(999), stepAfter(-3), stepAfter(2.9), stepAfter(Number.MAX_SAFE_INTEGER)]).toEqual([5, last, 0, 2, last]);
    expect(last).toBe(FORTUNE_TRACE_STEPS.done);
    expect(graph.state).toMatchObject({step: last});
    expect(stepAfter('end')).toBe(7);
    expect(() => graph.run1(traceStep(Number.NaN))).toThrow('set-trace-step');
    expect(() => graph.run1(traceStep('last' as 'end'))).toThrow('set-trace-step');
    expect(graph.step).toBe(7);
});

test('set-trace-step and an edit pause a running playback and leave no scheduler callback', () => {
    const {graph, frames} = setup();
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    apply(graph, traceStep(3));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([3, false, 0]);
    apply(graph, trace('next-step'));
    expect(graph.step).toBe(4);
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    apply(graph, {kind: 'point-set', operation: 'set-points', mode: 'points', points: FORTUNE_SITES.slice(0, 3)});
    expect([graph.isPlaying, frames.callbacks.size]).toEqual([false, 0]);
});

test('Back (stopping the lesson animations), a state restore and unmount pause playback and leave no scheduler callback', () => {
    const {graph, frames} = setup();
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    const stoppedAt = graph.step;
    act(() => { capabilities.stopAnimations?.(); });
    expect([graph.isPlaying, frames.callbacks.size, graph.step]).toEqual([false, 0, stoppedAt]);

    apply(graph, traceStep(3));
    apply(graph, trace('play'));
    expect(frames.callbacks.size).toBe(1);
    act(() => { capabilities.restoreState(checkpoint); });
    expect([graph.isPlaying, frames.callbacks.size, graph.step]).toEqual([false, 0, 0]);

    apply(graph, trace('play'));
    expect(frames.callbacks.size).toBe(1);
    act(() => { graph.unmount(); });
    expect(frames.callbacks.size).toBe(0);
});

test('a scene change after a running playback pauses it and leaves no pending callback', () => {
    const {graph, frames} = setup();
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    act(() => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(sceneOf('fortune-circle-scheduled'))) capabilities.apply(action);
    });
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([FORTUNE_TRACE_STEPS.scheduled, false, 0]);
});

// ---- The lesson scenes ----------------------------------------------------------------------------------------------

const HEIGHT_SURD = '\\(y=1-\\sqrt{\\tfrac{65}{4}}\\approx -3{,}031\\)';
const BEACH = (letters: string) => `Obalna črta (od leve proti desni): ${letters}`;
const EXPECTED: Record<string, {readonly shown: readonly (string | undefined)[]; readonly queue: readonly string[]}> = {
    'fortune-sites': {
        shown: ['Korak 1 od 8', 'Mesta so v vrsti dogodkov; pometalna premica je nad vsemi.', 'Pometalna premica je nad vsemi mesti.', 'Obalna črta je še prazna.', 'Oglišča: 0 od 2'],
        queue: ['▸ mesto Anaslednji dogodek', 'mesto B', 'mesto C', 'mesto D'],
    },
    'fortune-predict': {
        shown: ['Korak 1 od 8', 'Mesta so v vrsti dogodkov; pometalna premica je nad vsemi.', 'Pometalna premica je nad vsemi mesti.', 'Obalna črta je še prazna.', 'Oglišča: 0 od 2'],
        queue: ['▸ mesto Anaslednji dogodek', 'mesto B', 'mesto C', 'mesto D'],
    },
    'fortune-site-events': {
        shown: ['Korak 3 od 8', 'Dogodek mesta B: nov lok obalne črte.', 'Višina pometalne premice: \\(y=3\\)', BEACH('A, B, A'), 'Oglišča: 0 od 2'],
        queue: ['▸ mesto Cnaslednji dogodek', 'mesto D'],
    },
    'fortune-circle-scheduled': {
        shown: ['Korak 4 od 8', 'Dogodek mesta C: nov lok obalne črte.', 'Višina pometalne premice: \\(y=3\\)', BEACH('A, B, A, C, A'), 'Oglišča: 0 od 2'],
        queue: ['▸ mesto Dnaslednji dogodek', 'krožni dogodek (B, A, C)'],
    },
    'fortune-false-alarm': {
        shown: ['Korak 5 od 8', 'Dogodek mesta D: nov lok obalne črte.', 'Višina pometalne premice: \\(y=-3\\)', BEACH('A, B, A, D, A, C, A'), 'Oglišča: 0 od 2'],
        queue: ['▸ krožni dogodek (B, A, D)naslednji dogodek', 'krožni dogodek (D, A, C)', 'krožni dogodek (B, A, C) (preklican, lažni alarm)'],
    },
    'fortune-true-events': {
        shown: ['Korak 7 od 8', 'Krožni dogodek (D, A, C): srednji lok izgine in nastane oglišče.', `Višina pometalne premice: ${HEIGHT_SURD}`, BEACH('A, B, D, C, A'), 'Oglišča: 2 od 2'],
        queue: ['krožni dogodek (B, A, C) (preklican, lažni alarm)'],
    },
    'fortune-diagram': {
        shown: ['Korak 8 od 8', 'Vsi dogodki so obdelani; prikazan je končni Voronojev diagram.', `Višina pometalne premice: ${HEIGHT_SURD}`, undefined, 'Oglišča: 2 od 2'],
        queue: [],
    },
};

test('the seven scenes run in one synchronous sequence, show the readouts the text quotes and never play', () => {
    const {graph, frames} = setup();
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    expect(lesson().steps.map(step => step.id)).toEqual(STEPS);
    for (const stepId of STEPS) {
        act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneActions(sceneOf(stepId))) capabilities.apply(action);
        });
        expect(sitesOf(graph), stepId).toEqual(FORTUNE_SITES);
        expect(readouts(), stepId).toEqual(EXPECTED[stepId].shown);
        if (stepId === 'fortune-false-alarm') {
            expect(document.querySelectorAll('[data-fortune="note"]'), stepId).toHaveLength(2);
            expect([...document.querySelectorAll('[data-fortune="note"]')].map(note => note.textContent)[1],
                stepId).toBe('Lažni alarm: krožni dogodek (B, A, C) je preklican, ker krog ni več prazen.');
        }
        expect(queueText(), stepId).toEqual(EXPECTED[stepId].queue);
        expect([graph.isPlaying, frames.callbacks.size], stepId).toEqual([false, 0]);
    }
});

test('the quoted trace positions are the steps of the real run: the sites, the circles, the cancellation and the heights', () => {
    const {graph} = setup();
    const run = graph.run();
    const result = run.result!;
    const index = (id: string) => STEPS.indexOf(id);
    const stepOf = (id: string) => (sceneOf(id).actions.find((action): action is PointSetAction => action.kind === 'point-set' && action.operation === 'set-trace-step') as PointSetAction & {step: number | 'end'}).step;
    expect(STEPS.map(stepOf)).toEqual([0, 0, 2, 3, 4, 6, 'end']);
    expect(index('fortune-diagram')).toBe(6);
    // The event order A, B, C, D: the four site pops come first, in the order of the sites.
    expect(result.siteEvents.map(event => event.site)).toEqual([0, 1, 2, 3]);
    // Step 2: the beach line after B is A, B, A at y = 3 (a rational height).
    const at = (step: number) => run.view(step)!;
    const sitesOfCircle = (id: number) => result.circles.find(circle => circle.id === id)!.sites.join();
    expect(at(FORTUNE_TRACE_STEPS.twoSites).state.beach).toEqual([0, 1, 0]);
    expect(at(FORTUNE_TRACE_STEPS.twoSites).state.height).toEqual({kind: 'rational', value: Rational.of(3)});
    // Step 3: C is in, the circle (B, A, C) is scheduled: centre (0, 0), R^2 = 25, lowest point y = -5.
    expect(at(FORTUNE_TRACE_STEPS.scheduled).state.beach).toEqual([0, 1, 0, 2, 0]);
    const cancelled = result.circles.find(circle => circle.sites.join() === '1,0,2')!;
    expect([cancelled.centre.x.format(), cancelled.centre.y.format()]).toEqual(['0', '0']);
    expect(cancelled.r2.equals(Rational.of(25))).toBe(true);
    expect(cancelled.fate).toMatchObject({kind: 'cancelled', reason: 'split'});
    expect(at(FORTUNE_TRACE_STEPS.scheduled).scheduled.map(circle => sitesOfCircle(circle.id))).toEqual(['1,0,2']);
    // D = (0, -3) is strictly inside that circle: 3 < 5, and it is the site event that cancels it.
    expect(FORTUNE_SITES[3]).toEqual([0, -3]);
    expect(Math.hypot(FORTUNE_SITES[3][0], FORTUNE_SITES[3][1])).toBe(3);
    expect(at(FORTUNE_TRACE_STEPS.falseAlarm).cancelled.map(circle => sitesOfCircle(circle.id))).toEqual(['1,0,2']);
    expect(at(FORTUNE_TRACE_STEPS.falseAlarm).state.beach).toEqual([0, 1, 0, 3, 0, 2, 0]);
    expect(at(FORTUNE_TRACE_STEPS.falseAlarm).state.height).toEqual({kind: 'rational', value: Rational.of(-3)});
    // Step 6: the two true events, centres (-1/2, 1) and (1/2, 1), R^2 = 65/4, the same height 1 - sqrt(65/4), D, A, C after B, A, D.
    const events = result.circles.filter(circle => circle.fate.kind === 'executed');
    expect(events.map(circle => circle.sites.join())).toEqual(['1,0,3', '3,0,2']);
    expect(events.map(circle => [circle.centre.x.format(), circle.centre.y.format(), circle.r2.format()])).toEqual([['-1/2', '1', '65/4'], ['1/2', '1', '65/4']]);
    const high = at(FORTUNE_TRACE_STEPS.vertices);
    expect(high.state.beach).toEqual([0, 1, 3, 2, 0]);
    expect(high.state.vertices).toHaveLength(2);
    expect(high.state.height).toMatchObject({kind: 'surd', q: Rational.of(1), r: Rational.of(65, 4)});
    const surd = high.state.height as {q: Rational; r: Rational};
    expect(surd.q.toNumber() - Math.sqrt(surd.r.toNumber())).toBeCloseTo(-3.031, 3);
    expect(1 - Math.sqrt(65) / 2).toBeCloseTo(-3.031, 3);
    // The tie of the two true events is broken by the abscissa of the centre: (B, A, D) at x = -1/2 first.
    expect(at(FORTUNE_TRACE_STEPS.vertices - 1).state.vertices).toHaveLength(1);
    expect(result.diagram.vertices[at(FORTUNE_TRACE_STEPS.vertices - 1).state.vertices[0]].point.x.format()).toBe('-1/2');
});

// The kernel's equality of two VoronoiDiagram values (as fortune.test.ts compares Fortune's output with the Delaunay dual).
const key = (p: {x: Rational; y: Rational}): string => `${p.x.format()},${p.y.format()}`;
function sameVoronoiDiagram(a: VoronoiDiagram, b: VoronoiDiagram): string | null {
    const vertices = (d: VoronoiDiagram): string[] => d.vertices.map(v => `${key(v.point)}:${v.sites.join(',')}`).sort();
    if (JSON.stringify(vertices(a)) !== JSON.stringify(vertices(b))) return `vertices ${vertices(a)} vs ${vertices(b)}`;
    if (a.edges.length !== b.edges.length) return `edge count ${a.edges.length} vs ${b.edges.length}`;
    const byPair = (d: VoronoiDiagram) => new Map(d.edges.map(e => [e.sites.join(','), e] as const));
    const [ea, eb] = [byPair(a), byPair(b)];
    for (const [pair, x] of ea) {
        const y = eb.get(pair);
        if (y === undefined) return `edge ${pair} missing`;
        if (x.kind !== y.kind) return `edge ${pair}: ${x.kind} vs ${y.kind}`;
        if (x.kind === 'segment' && y.kind === 'segment') {
            const ends = (d: VoronoiDiagram, e: typeof x): string => [key(d.vertices[e.from].point), key(d.vertices[e.to].point)].sort().join('|');
            if (ends(a, x) !== ends(b, y)) return `segment ${pair}: ${ends(a, x)} vs ${ends(b, y)}`;
        } else if (x.kind === 'ray' && y.kind === 'ray') {
            if (key(a.vertices[x.vertex].point) !== key(b.vertices[y.vertex].point)) return `ray ${pair}: vertex differs`;
            const cross = x.direction.x * y.direction.y - x.direction.y * y.direction.x;
            const dot = x.direction.x * y.direction.x + x.direction.y * y.direction.y;
            if (cross !== 0 || dot <= 0) return `ray ${pair}: direction differs`;
        }
    }
    for (let s = 0; s < a.cells.length; s++) {
        const cell = (d: VoronoiDiagram): string => `${d.cells[s].site}:${d.cells[s].edges.map(e => d.edges[e].sites.join('-')).join(' ')}:${d.cells[s].bounded}`;
        if (cell(a) !== cell(b)) return `cell ${s}: ${cell(a)} vs ${cell(b)}`;
    }
    return null;
}

test('the finished diagram has 2 vertices, 1 finite edge and 4 rays, equals the Delaunay dual, and the counts are 2n-2-h and 3n-3-h', () => {
    const {graph} = setup();
    const diagram = graph.run().result!.diagram;
    const dual = voronoiFromDelaunay(FORTUNE_SITES.map(([x, y]) => ({x, y})));
    if (!dual.ok) throw new Error('the Delaunay dual refused the sites');
    expect(sameVoronoiDiagram(diagram, dual.value)).toBeNull();
    // The comparison is not vacuous: the dual of three of the sites differs from the diagram of four.
    const three = voronoiFromDelaunay(FORTUNE_SITES.slice(0, 3).map(([x, y]) => ({x, y})));
    if (!three.ok) throw new Error('the Delaunay dual refused three sites');
    expect(sameVoronoiDiagram(diagram, three.value)).not.toBeNull();
    const {finite, unbounded} = dualEdges(diagram);
    const [n, h] = [FORTUNE_SITES.length, unbounded.length];
    expect([diagram.vertices.length, finite.length, unbounded.length]).toEqual([2, 1, 4]);
    expect([diagram.vertices.length, diagram.edges.length]).toEqual([2 * n - 2 - h, 3 * n - 3 - h]);
    expect([diagram.vertices.length, diagram.edges.length]).toEqual([2, 5]);
    expect(diagram.vertices.map(v => key(v.point)).sort()).toEqual(['-1/2,1', '1/2,1']);
    apply(graph, traceStep('end'));
    expect(part('vertices')).toBe('Oglišča: 2 od 2');
});

// ---- Item 2: the "continues" markers of the finished diagram under every scene view ---------------------------------------

test('every scene view on a 1280x720 board keeps every "continues" marker inside the board by the pixel inset, with a follow box on exact integers', () => {
    const {graph} = setup();
    const board = graph.liveBoard();
    expect([board.canvasWidth, board.canvasHeight]).toEqual([BOARD_WIDTH, BOARD_HEIGHT]);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const insetPx = 16;
    expect(STEPS.map(stepId => {
        const scene = sceneOf(stepId);
        return scene.basedOn === 'demonstration-default' ? scene.view : undefined;
    })).toEqual(STEPS.map(() => FORTUNE_VIEW));
    for (const stepId of STEPS) {
        const scene = sceneOf(stepId);
        act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneActions(scene)) capabilities.apply(action);
        });
        // The finished diagram under this scene's view (the markers exist only once the diagram is drawn).
        act(() => { graph.run1(traceStep('end')); });
        const [left, top, right, bottom] = board.getBoundingBox();
        // The lesson view is widened around its centre to the canvas aspect, so it lies inside the board.
        expect(left, stepId).toBeLessThanOrEqual(FORTUNE_VIEW[0]);
        expect(top, stepId).toBeGreaterThanOrEqual(FORTUNE_VIEW[1]);
        expect(right, stepId).toBeGreaterThanOrEqual(FORTUNE_VIEW[2]);
        expect(bottom, stepId).toBeLessThanOrEqual(FORTUNE_VIEW[3]);
        expect((right - left) / (top - bottom), stepId).toBeCloseTo(BOARD_WIDTH / BOARD_HEIGHT, 6);
        const box = graph.box()!;
        const [minX, maxX, minY, maxY] = [box.minX, box.maxX, box.minY, box.maxY].map(v => v.toNumber());
        for (const v of [minX, maxX, minY, maxY]) expect(Number.isInteger(v), stepId).toBe(true);
        const insetX = insetPx * (right - left) / board.canvasWidth, insetY = insetPx * (top - bottom) / board.canvasHeight;
        expect(minX, stepId).toBeGreaterThanOrEqual(left + insetX - 1e-9);
        expect(maxX, stepId).toBeLessThanOrEqual(right - insetX + 1e-9);
        expect(minY, stepId).toBeGreaterThanOrEqual(bottom + insetY - 1e-9);
        expect(maxY, stepId).toBeLessThanOrEqual(top - insetY + 1e-9);
        const markers = (board.objectsList as Shown[]).filter(o => o.name === 'voronoi-continues');
        expect(markers.length, stepId).toBe(graph.drawingStats()!.continuesMarkers);
        expect(markers.length, stepId).toBeGreaterThan(0);
        for (const m of markers) {
            expect(m.X!(), stepId).toBeGreaterThanOrEqual(left + insetX - 1e-9);
            expect(m.X!(), stepId).toBeLessThanOrEqual(right - insetX + 1e-9);
            expect(m.Y!(), stepId).toBeGreaterThanOrEqual(bottom + insetY - 1e-9);
            expect(m.Y!(), stepId).toBeLessThanOrEqual(top - insetY + 1e-9);
        }
    }
});

// ---- C-3: Next step and Play yield identical states ---------------------------------------------------------------------

test('Play from step 0 to done passes through exactly the states of the Next step sequence, step by step, then stops', () => {
    const {graph, frames} = setup();
    const last = graph.run().length - 1;
    const snapshot = () => ({step: graph.step, state: graph.state, readouts: readouts(), queue: queueText()});

    const byNext = [snapshot()];
    for (let k = 0; k < last; k++) {
        apply(graph, trace('next-step'));
        byNext.push(snapshot());
    }
    expect(byNext.map(entry => entry.step)).toEqual(Array.from({length: last + 1}, (_, k) => k));
    expect(new Set(byNext.map(entry => entry.readouts.join('|'))).size, 'the readouts differ between steps').toBeGreaterThan(last - 1);

    apply(graph, trace('reset'));
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    expect(snapshot()).toEqual(byNext[0]);

    const byPlay = [] as typeof byNext;
    apply(graph, trace('play'));
    expect([graph.isPlaying, frames.callbacks.size]).toEqual([true, 1]);
    act(() => { frames.frame(0); });
    byPlay.push(snapshot());
    for (let k = 0; k < last; k++) {
        expect(graph.isPlaying, `playing before tick ${k + 1}`).toBe(true);
        act(() => { frames.frame(FORTUNE_STEP_INTERVAL_MS); });
        byPlay.push(snapshot());
    }
    expect(byPlay).toEqual(byNext);
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([last, false, 0]);
    expect(frames.frame(FORTUNE_STEP_INTERVAL_MS)).toBe(false);
    expect(graph.step).toBe(last);
});

// ---- C-4: the seven scenes in English after a live language switch ---------------------------------------------------------

const HEIGHT_SURD_EN = '\\(y=1-\\sqrt{\\tfrac{65}{4}}\\approx -3.031\\)';
const BEACH_EN = (letters: string) => `Beach line (left to right): ${letters}`;
const NO_HEIGHT_EN = 'The sweep line is above all the sites.';
const QUEUED_EN = 'The sites are in the event queue; the sweep line is above all of them.';
const EXPECTED_EN: typeof EXPECTED = {
    'fortune-sites': {
        shown: ['Step 1 of 8', QUEUED_EN, NO_HEIGHT_EN, 'The beach line is still empty.', 'Vertices: 0 of 2'],
        queue: ['▸ site Anext event', 'site B', 'site C', 'site D'],
    },
    'fortune-predict': {
        shown: ['Step 1 of 8', QUEUED_EN, NO_HEIGHT_EN, 'The beach line is still empty.', 'Vertices: 0 of 2'],
        queue: ['▸ site Anext event', 'site B', 'site C', 'site D'],
    },
    'fortune-site-events': {
        shown: ['Step 3 of 8', 'Site event B: a new arc of the beach line.', 'Sweep line height: \\(y=3\\)', BEACH_EN('A, B, A'), 'Vertices: 0 of 2'],
        queue: ['▸ site Cnext event', 'site D'],
    },
    'fortune-circle-scheduled': {
        shown: ['Step 4 of 8', 'Site event C: a new arc of the beach line.', 'Sweep line height: \\(y=3\\)', BEACH_EN('A, B, A, C, A'), 'Vertices: 0 of 2'],
        queue: ['▸ site Dnext event', 'circle event (B, A, C)'],
    },
    'fortune-false-alarm': {
        shown: ['Step 5 of 8', 'Site event D: a new arc of the beach line.', 'Sweep line height: \\(y=-3\\)', BEACH_EN('A, B, A, D, A, C, A'), 'Vertices: 0 of 2'],
        queue: ['▸ circle event (B, A, D)next event', 'circle event (D, A, C)', 'circle event (B, A, C) (cancelled, false alarm)'],
    },
    'fortune-true-events': {
        shown: ['Step 7 of 8', 'Circle event (D, A, C): the middle arc vanishes and a vertex appears.', `Sweep line height: ${HEIGHT_SURD_EN}`, BEACH_EN('A, B, D, C, A'), 'Vertices: 2 of 2'],
        queue: ['circle event (B, A, C) (cancelled, false alarm)'],
    },
    'fortune-diagram': {
        shown: ['Step 8 of 8', 'All events are processed; the finished Voronoi diagram is shown.', `Sweep line height: ${HEIGHT_SURD_EN}`, undefined, 'Vertices: 2 of 2'],
        queue: [],
    },
};

test('the seven scenes in English, after a live language switch, show the English beach line, notes, readouts and queue and never play', () => {
    const {graph, frames} = setup();
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    act(() => { setLanguage('en'); });
    for (const stepId of STEPS) {
        act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneActions(sceneOf(stepId))) capabilities.apply(action);
        });
        expect(sitesOf(graph), stepId).toEqual(FORTUNE_SITES);
        expect(readouts(), stepId).toEqual(EXPECTED_EN[stepId].shown);
        if (stepId === 'fortune-false-alarm') {
            expect([...document.querySelectorAll('[data-fortune="note"]')].map(note => note.textContent)[1],
                stepId).toBe('False alarm: circle event (B, A, C) is cancelled because the circle is no longer empty.');
        }
        expect(queueText(), stepId).toEqual(EXPECTED_EN[stepId].queue);
        expect([graph.isPlaying, frames.callbacks.size], stepId).toEqual([false, 0]);
    }
    // switching back keeps the same state and gives the Slovenian text of the last scene
    act(() => { setLanguage('sl'); });
    expect(readouts()).toEqual(EXPECTED['fortune-diagram'].shown);
});
