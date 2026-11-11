import React from 'react';
import {readFileSync} from 'node:fs';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {LinearMapGraph, STEP_INTERVAL_MS} from './LinearMapGraph';
import {linearMapPresetCollection} from './linearMapPresetCollection';
import {TRACE_DET_VIEW} from './iterationScene';
import {legendKindFor, TRACE_DET_DRAWING} from './iterationBoard';
import {linearMapBasisLesson, linearMapDeterminantLesson} from '../../learning/content/linearMapsChapterLessons';
import type {LessonAction} from '../../learning/model';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import {enterNumber} from '../../inputs/testEntry';
import {DEFAULT_LINEAR_MAP_STATE, ITERATE_STEP_MAX, LinearMapState} from '../../linear/linearMapModel';
import {LINEAR_MAP_EXAMPLES, type Mat2} from '../../linear/matrix2';
import {en} from '../../localization/en';
import {sl} from '../../localization/sl';
import {setLanguage, t} from '../../localization';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

class FakeClock implements AnimationScheduler {
    private callback?: FrameRequestCallback;
    private handle = 0;
    request(callback: FrameRequestCallback) { this.callback = callback; return ++this.handle; }
    cancel() { this.callback = undefined; }
    pending() { return this.callback !== undefined; }
    tick(time: number) { const run = this.callback; this.callback = undefined; if (run) act(() => run(time)); }
}

/** The real graph through the real host and board, with a fake frame clock and a switchable reduced-motion setting. */
class ObservedGraph extends LinearMapGraph {
    clock = new FakeClock();
    reduced = false;
    protected override animationScheduler() { return this.clock; }
    override reducedMotion() { return this.reduced; }
    liveBoard() { return this.board; }
    modelNow() { return this.model; }
    ownedObjects() { return this.generatedObjectCount; }
    startPoint() { return this.startHandle!; }
    tracePoint() { return this.traceDetHandle!; }
    act(action: object) { this.applyLinearMapAction(action as never); }
    typeStart(axis: 0 | 1, value: number) { return this.setStartFromInput(axis, value); }
    dispose() { this.disposeFigureScene(); }
}

function mountGraph(strict = false, reduced = false) {
    const graph = new ObservedGraph();
    graph.reduced = reduced;
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

type Evented = JXG.Point & {triggerEventHandlers(names: string[], args: unknown[]): void};
function dragTo(point: JXG.Point, x: number, y: number) {
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    act(() => { (point as Evented).triggerEventHandlers(['drag'], []); });
}
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusIds = () => [...document.querySelectorAll('[data-linear-map-status]')].map(element => element.getAttribute('data-linear-map-status'));
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
const selectMode = (mode: string) => act(() => { fireEvent.change(screen.getByLabelText(t('linear_map_mode_label')), {target: {value: mode}}); });
const counter = () => document.querySelector('[data-step-counter]')!.textContent;
const stepsPlayed = (graph: ObservedGraph, ticks: number) => {
    graph.clock.tick(0);
    for (let i = 1; i <= ticks; i++) graph.clock.tick(i * STEP_INTERVAL_MS);
};
const E: Mat2 = [[4, 1], [2, 3]];
const iterate = (graph: ObservedGraph, matrix: Mat2 = E, start: [number, number] = [1, 0]) => act(() => {
    graph.act({kind: 'linear-map', operation: 'set-matrix', matrix});
    graph.act({kind: 'linear-map', operation: 'set-mode', mode: 'iterate'});
    graph.act({kind: 'linear-map', operation: 'set-start', start});
});

describe('Presets stored before Batch D load unchanged', () => {
    // The seven stored keys of a Preset exported before Batch D: every example of the closed list, in both old modes.
    const olds = (Object.entries(LINEAR_MAP_EXAMPLES) as [string, Mat2][]).flatMap(([exampleId, matrix]) =>
        (['basis', 'determinant'] as const).map(mode => ({
            matrix, mode, testAngle: 30, exampleId, probeVisible: mode === 'basis', curveVisible: true, squareVisible: mode === 'determinant',
        })));

    test('every example in both old modes passes the collection check unchanged, imports, and exports the identical data without start or step', () => {
        expect(olds.length).toBeGreaterThanOrEqual(8);
        const {graph} = mountGraph();
        for (const old of olds) {
            const literal = JSON.parse(JSON.stringify(old));
            const checked = linearMapPresetCollection.check(literal);
            expect('data' in checked).toBe(true);
            const data = (checked as {data: LinearMapState}).data;
            expect(data).toEqual(old);
            expect(data).not.toHaveProperty('start');
            expect(data).not.toHaveProperty('step');
            act(() => { graph.importPresetData(data); });
            expect(JSON.parse(JSON.stringify(graph.exportPresetData()))).toEqual(literal);
        }
        const checkGraphState = linearMapPresetCollection.checkGraphState;
        expect(checkGraphState).toBeDefined();
        expect(checkGraphState!({matrix: [[1, 0], [0, 1]]})).toBeUndefined();
        // The scene-state field list names 'start': a valid start is accepted (dropping it from the list makes the array a refused value).
        expect(checkGraphState!({matrix: [[1, 0], [0, 1]], start: [1.25, -2]})).toBeUndefined();
        // An off-grid start is refused by the collection's full check (the grid is a property of the whole Preset, not of the field list).
        const wholePreset = {...DEFAULT_LINEAR_MAP_STATE, mode: 'iterate', start: [0.3, 0]};
        expect('rejection' in linearMapPresetCollection.check(JSON.parse(JSON.stringify(wholePreset)))).toBe(true);
        expect('data' in linearMapPresetCollection.check(JSON.parse(JSON.stringify({...wholePreset, start: [0.25, 0]})))).toBe(true);
    });

    test('the lesson scenes of L1 and L2 produce Preset data without start or step that the collection accepts as it is', () => {
        const {graph} = mountGraph();
        let checkedSteps = 0;
        for (const lesson of [linearMapBasisLesson, linearMapDeterminantLesson]) {
            for (const lessonStep of lesson.steps) {
                const actions = (lessonStep.scene?.actions ?? []).filter((action: LessonAction) => action.kind === 'linear-map');
                act(() => { actions.forEach(action => graph.act(action)); });
                const exported = JSON.parse(JSON.stringify(graph.exportPresetData()));
                expect(Object.keys(exported)).not.toContain('start');
                expect(Object.keys(exported)).not.toContain('step');
                const checked = linearMapPresetCollection.check(exported);
                expect('data' in checked).toBe(true);
                expect((checked as {data: LinearMapState}).data).toEqual(exported);
                checkedSteps++;
            }
        }
        expect(checkedSteps).toBeGreaterThanOrEqual(8);
    });

    test('a stored start and step round-trip through the collection and a fresh graph; a bad one is rejected', () => {
        const stored = {...DEFAULT_LINEAR_MAP_STATE, matrix: E, mode: 'iterate', exampleId: 'custom', start: [-1.25, 2], step: 7};
        const checked = linearMapPresetCollection.check(JSON.parse(JSON.stringify(stored)));
        expect('data' in checked).toBe(true);
        const {graph} = mountGraph();
        act(() => { graph.importPresetData((checked as {data: LinearMapState}).data); });
        expect(JSON.parse(JSON.stringify(graph.exportPresetData()))).toEqual(stored);
        expect(field(t('linear_map_start_x_label')).value).toBe('−1,25');
        expect(counter()).toBe(t('step_counter', {value0: 7, value1: ITERATE_STEP_MAX}));
        expect('rejection' in linearMapPresetCollection.check({...stored, start: [0.3, 0]})).toBe(true);
    });
});

describe('actions, start handle and typed start', () => {
    test('set-matrix, set-mode, set-start and step chain in one synchronous tick, each reading the state the one before wrote', () => {
        const {graph} = mountGraph();
        act(() => {
            graph.act({kind: 'linear-map', operation: 'set-matrix', matrix: E});
            graph.act({kind: 'linear-map', operation: 'set-mode', mode: 'iterate'});
            graph.act({kind: 'linear-map', operation: 'set-start', start: [1, -2]});
            expect(graph.modelNow()).toMatchObject({matrix: E, mode: 'iterate', start: [1, -2]});
            graph.act({kind: 'linear-map', operation: 'step', count: 2});
            expect(graph.modelNow().step).toBe(2);
            graph.act({kind: 'linear-map', operation: 'step'});
            expect(graph.modelNow().step).toBe(3);
            graph.act({kind: 'linear-map', operation: 'set-start', start: [1, 0]});
            expect(graph.modelNow()).toMatchObject({start: [1, 0], step: 3});
            graph.act({kind: 'linear-map', operation: 'step', count: ITERATE_STEP_MAX});
            expect(graph.modelNow().step).toBe(ITERATE_STEP_MAX);
            expect([graph.startPoint().X(), graph.startPoint().Y()]).toEqual([1, 0]);
        });
        expect(readout('step')).toBe(t('linear_map_readout_step_value', {value0: ITERATE_STEP_MAX, value1: ITERATE_STEP_MAX}));
        expect(() => graph.act({kind: 'linear-map', operation: 'set-start', start: [0.3, 0]})).toThrow(/start\[0\]/);
        expect(() => graph.act({kind: 'linear-map', operation: 'step', count: 0})).toThrow(/count/);
        expect(graph.modelNow().start).toEqual([1, 0]);
    });

    test('dragging the start handle snaps to the quarter grid and the handle follows; the fields show the stored start', () => {
        const {graph} = mountGraph();
        iterate(graph);
        dragTo(graph.startPoint(), 2.13, -0.9);
        expect(graph.modelNow().start).toEqual([2.25, -1]);
        expect([graph.startPoint().X(), graph.startPoint().Y()]).toEqual([2.25, -1]);
        expect(field(t('linear_map_start_x_label')).value).toBe('2,25');
        expect(field(t('linear_map_start_y_label')).value).toBe('−1');
        dragTo(graph.startPoint(), 9, -9);
        expect(graph.modelNow().start).toEqual([4, -4]);
    });

    test('a typed start off the grid is refused with the hint and changes nothing; on the grid it is accepted', () => {
        const {graph} = mountGraph();
        iterate(graph);
        act(() => { enterNumber(field(t('linear_map_start_x_label')), '0.3'); });
        expect(graph.modelNow().start).toEqual([1, 0]);
        expect(document.body.textContent).toContain(t('linear_map_start_rejected'));
        act(() => { enterNumber(field(t('linear_map_start_x_label')), '5'); });
        expect(graph.modelNow().start).toEqual([1, 0]);
        act(() => { enterNumber(field(t('linear_map_start_y_label')), '-1,5'); });
        expect(graph.modelNow().start).toEqual([1, -1.5]);
        expect(graph.typeStart(0, 0.3)).toBe(false);
        act(() => { expect(graph.typeStart(0, 2)).toBe(true); });
        expect(graph.modelNow().start).toEqual([2, -1.5]);
        expect(readout('start')).toBe('(2, −1,5)');
    });
});

describe('the trace-determinant plane', () => {
    test('dragging the (tau, delta) handle writes the companion matrix, states it, and shows the exact triangle status', () => {
        const {graph} = mountGraph();
        selectMode('tracedet');
        dragTo(graph.tracePoint(), 1.02, 0.27);
        expect(graph.modelNow()).toMatchObject({matrix: [[0, 1], [-0.25, 1]], exampleId: 'custom', mode: 'tracedet'});
        expect([graph.tracePoint().X(), graph.tracePoint().Y()]).toEqual([1, 0.25]);
        expect(statusIds()).toEqual(['td-inside', 'flow-unstable', 'companion']);
        expect(readout('tau')).toBe('1');
        expect(readout('delta')).toBe('0,25');
        // The companion note goes when another write changes the matrix.
        act(() => { graph.act({kind: 'linear-map', operation: 'set-matrix', matrix: [[-4, -1], [-2, -3]]}); });
        expect(statusIds()).toEqual(['td-outside', 'flow-stable', 'td-range']);
        expect(readout('tau')).toBe('−7');
        expect(readout('delta')).toBe('10');
    });

    test('a change to or from the plane shows that mode\'s default view; the other modes share the plane view', () => {
        const {graph} = mountGraph();
        const box = () => graph.liveBoard().getBoundingBox().map(value => Math.round(value * 1000) / 1000);
        const initial = box();
        selectMode('tracedet');
        // The board keeps equal axis units, so the plane view is at least the asked box.
        const [left, top, right, bottom] = box();
        expect([left <= TRACE_DET_VIEW[0], top >= TRACE_DET_VIEW[1], right >= TRACE_DET_VIEW[2], bottom <= TRACE_DET_VIEW[3]]).toEqual([true, true, true, true]);
        expect(box()).not.toEqual(initial);
        selectMode('iterate');
        expect(box()).toEqual(initial);
        selectMode('tracedet');
        selectMode('basis');
        expect(box()).toEqual(initial);
        selectMode('determinant');
        selectMode('iterate');
        expect(box()).toEqual(initial);
    });
});

describe('the exact statuses and readouts on the board', () => {
    test('statuses follow the exact tests: other eigenvector, dominant, settled, rotating, equal moduli, collapses, zero start', () => {
        const {graph} = mountGraph();
        iterate(graph, E, [1, -2]);
        expect(statusIds()).toEqual(['other-eigenvector']);
        act(() => { graph.act({kind: 'linear-map', operation: 'set-start', start: [1, 0]}); });
        expect(statusIds()).toEqual(['dominant']);
        act(() => { graph.act({kind: 'linear-map', operation: 'step', count: ITERATE_STEP_MAX}); });
        expect(statusIds()).toEqual(['dominant', 'settled']);
        act(() => { graph.act({kind: 'linear-map', operation: 'set-matrix', matrix: [[1, -1], [1, 1]]}); });
        expect(statusIds()).toEqual(['rotating']);
        act(() => { graph.act({kind: 'linear-map', operation: 'set-matrix', matrix: [[0, 3], [3, 0]]}); });
        expect(statusIds()).toEqual(['equal-moduli']);
        act(() => { graph.act({kind: 'linear-map', operation: 'set-matrix', matrix: [[0, 1], [0, 0]]}); });
        expect(statusIds()).toContain('collapses');
        act(() => { graph.act({kind: 'linear-map', operation: 'set-start', start: [0, 0]}); });
        expect(statusIds()).toEqual(['zero-start']);
    });

    test('readouts use the decimal comma and the true minus; the page never shows NaN or a dot decimal', () => {
        const {graph} = mountGraph();
        iterate(graph, [[-1.5, 0], [0, 1]], [1, 0.5]);
        act(() => { graph.act({kind: 'linear-map', operation: 'step'}); });
        expect(readout('iterate')).toBe('(−1,5, 0,5)');
        expect(readout('start')).toBe('(1, 0,5)');
        expect(readout('rayleigh')).toBe('−1,25');
        expect(readout('unit')).toMatch(/^\(−0,9\d+, 0,3\d+\)$/);
        expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
        expect(document.body.textContent).not.toMatch(/\d\.\d/);
        expect(document.body.textContent).not.toMatch(/-\d/);
    });
});

describe('playback', () => {
    test('Next step and Reset move the step and the counter; Reset leaves the matrix alone', () => {
        const {graph} = mountGraph();
        iterate(graph);
        press(t('next_step'));
        expect(graph.modelNow().step).toBe(1);
        expect(counter()).toBe(t('step_counter', {value0: 1, value1: ITERATE_STEP_MAX}));
        expect(readout('iterate')).toBe('(4, 2)');
        press(t('reset'));
        expect(graph.modelNow()).toMatchObject({step: 0, matrix: E});
        expect(counter()).toBe(t('step_counter', {value0: 0, value1: ITERATE_STEP_MAX}));
    });

    test('the matrix Reset and the playback Reset are different buttons in different, labelled groups', () => {
        const {graph} = mountGraph();
        iterate(graph);
        const matrixReset = screen.getByRole('button', {name: t('linear_map_reset')});
        const runReset = screen.getByRole('button', {name: t('reset')});
        expect(matrixReset).not.toBe(runReset);
        expect(matrixReset.closest('[role="group"]')).not.toBe(runReset.closest('[role="group"]'));
        expect(matrixReset.closest('[role="group"]')!.getAttribute('aria-label')).toBe(t('linear_map_actions_label'));
        expect(runReset.closest('[role="group"]')!.getAttribute('aria-label')).toBe(t('linear_map_playback_group'));
        press(t('linear_map_reset'));
        expect(graph.modelNow().matrix).toEqual([[1, 0], [0, 1]]);
    });

    test('play makes one step per interval, a long frame still one, ends at the last step with no frame pending, and Reset restarts', () => {
        const {graph} = mountGraph();
        iterate(graph);
        press(t('play'));
        expect(graph.isPlaying()).toBe(true);
        graph.clock.tick(0);
        graph.clock.tick(STEP_INTERVAL_MS - 1);
        expect(graph.modelNow().step ?? 0).toBe(0);
        graph.clock.tick(STEP_INTERVAL_MS);
        expect(graph.modelNow().step).toBe(1);
        graph.clock.tick(STEP_INTERVAL_MS + 20 * STEP_INTERVAL_MS);
        expect(graph.modelNow().step).toBe(2);
        let time = 22 * STEP_INTERVAL_MS;
        for (let i = 0; i < 200 && graph.clock.pending(); i++) { time += STEP_INTERVAL_MS; graph.clock.tick(time); }
        expect(graph.modelNow().step).toBe(ITERATE_STEP_MAX);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.isPlaying()).toBe(false);
        press(t('reset'));
        expect(graph.modelNow().step).toBe(0);
    });

    test('pause stops at the step and Play resumes from it with no jump', () => {
        const {graph} = mountGraph();
        iterate(graph);
        press(t('play'));
        stepsPlayed(graph, 3);
        expect(graph.modelNow().step).toBe(3);
        press(t('pause'));
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        press(t('play'));
        graph.clock.tick(100000);
        graph.clock.tick(100000 + STEP_INTERVAL_MS);
        expect(graph.modelNow().step).toBe(4);
    });

    test('reduced motion: Play does not run, says why through the rendered button, and Next step still works', () => {
        const {graph} = mountGraph(false, true);
        iterate(graph);
        expect(screen.getByRole('button', {name: t('play')}).getAttribute('aria-disabled')).toBe('true');
        press(t('play'));
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.modelNow().step ?? 0).toBe(0);
        expect(document.body.textContent).toContain(t('playback_block_reduced_motion'));
        press(t('next_step'));
        expect(graph.modelNow().step).toBe(1);
    });

    describe('every change of the stored content pauses a playing run; a write that stores nothing new does not', () => {
        const playing = () => {
            const mounted = mountGraph();
            iterate(mounted.graph);
            press(t('play'));
            stepsPlayed(mounted.graph, 2);
            expect(mounted.graph.isPlaying()).toBe(true);
            expect(mounted.graph.modelNow().step).toBe(2);
            return mounted.graph;
        };
        const paused = (graph: ObservedGraph) => {
            expect(graph.isPlaying()).toBe(false);
            expect(graph.clock.pending()).toBe(false);
        };

        test.each([
            ['a lesson action: start', (g: ObservedGraph) => g.act({kind: 'linear-map', operation: 'set-start', start: [0, 1]})],
            ['a lesson action: matrix', (g: ObservedGraph) => g.act({kind: 'linear-map', operation: 'set-matrix', matrix: [[1, 0], [0, 1]]})],
            ['a lesson action: step', (g: ObservedGraph) => g.act({kind: 'linear-map', operation: 'step'})],
            ['a lesson action: mode', (g: ObservedGraph) => g.act({kind: 'linear-map', operation: 'set-mode', mode: 'tracedet'})],
            ['a direct setState of the step', (g: ObservedGraph) => g.setState({model: {...g.modelNow(), step: 9}})],
            ['a direct setState of the matrix', (g: ObservedGraph) => g.setState({model: {...g.modelNow(), matrix: [[1, 0], [0, 1]]}})],
            ['a dragged start', (g: ObservedGraph) => dragTo(g.startPoint(), 2, 2)],
            ['a typed start', (g: ObservedGraph) => g.typeStart(0, 3)],
            ['an imported Preset', (g: ObservedGraph) => g.importPresetData({...DEFAULT_LINEAR_MAP_STATE, matrix: E, mode: 'iterate'})],
        ])('%s pauses', (_name, write) => {
            const graph = playing();
            act(() => { write(graph); });
            paused(graph);
        });

        test.each([
            ['an empty setState', (g: ObservedGraph) => g.setState({})],
            ['the stored model written again', (g: ObservedGraph) => g.setState({model: {...g.modelNow()}})],
            ['a start typed to its own value', (g: ObservedGraph) => g.typeStart(0, 1)],
            ['a start dragged to its own place', (g: ObservedGraph) => dragTo(g.startPoint(), 1, 0)],
        ])('%s does not', (_name, write) => {
            const graph = playing();
            act(() => { write(graph); });
            expect(graph.isPlaying()).toBe(true);
            expect(graph.clock.pending()).toBe(true);
            graph.clock.tick(10 * STEP_INTERVAL_MS);
            expect(graph.modelNow().step).toBe(3);
        });

        test('the Reset of the matrix pauses; switching language does not', () => {
            const graph = playing();
            act(() => { setLanguage('en'); });
            expect(graph.isPlaying()).toBe(true);
            act(() => { setLanguage('sl'); });
            press(t('linear_map_reset'));
            paused(graph);
        });
    });
});

describe('ownership', () => {
    /** Net listeners added minus removed on window and document while `run` executes. */
    function netListeners(run: () => void): number {
        const spies = [window, document].map(target => [vi.spyOn(target, 'addEventListener'), vi.spyOn(target, 'removeEventListener')] as const);
        try {
            run();
            return spies.reduce((sum, [add, remove]) => sum + add.mock.calls.length - remove.mock.calls.length, 0);
        } finally {
            spies.flat().forEach(spy => spy.mockRestore());
        }
    }

    test('mount, mode switches, a played run and unmount return to the pre-mount listener baseline and leave no timer of their own', () => {
        vi.useFakeTimers();
        mountGraph().view.unmount(); // warm-up: lazy module-level work happens once
        /** The same session with and without Play; JSXGraph leaves a timer of its own for every redraw, so only the difference is the graph's own. */
        const session = (play: boolean) => {
            const timersBefore = vi.getTimerCount();
            let mounted!: ReturnType<typeof mountGraph>;
            let baseline = 0;
            let owned = 0;
            const listeners = netListeners(() => {
                mounted = mountGraph();
                baseline = mounted.graph.liveBoard().objectsList.length;
                owned = mounted.graph.ownedObjects();
                iterate(mounted.graph);
                for (const mode of ['tracedet', 'iterate', 'determinant', 'basis', 'iterate']) selectMode(mode);
                if (play) {
                    press(t('play'));
                    stepsPlayed(mounted.graph, 1);
                    expect(mounted.graph.clock.pending()).toBe(true);
                }
                expect(mounted.graph.liveBoard().objectsList.length).toBe(baseline);
                expect(mounted.graph.ownedObjects()).toBe(owned);
                mounted.view.unmount();
            });
            expect(mounted.graph.clock.pending()).toBe(false);
            expect(mounted.graph.isPlaying()).toBe(false);
            expect(mounted.graph.ownedObjects()).toBe(0);
            return {listeners, timers: vi.getTimerCount() - timersBefore};
        };
        const reference = session(false);
        const played = session(true);
        expect(played.listeners).toBe(reference.listeners);
        expect(played.timers).toBeLessThanOrEqual(reference.timers + 1); // the one redraw of the step the played run made
        expect(() => setLanguage('en')).not.toThrow();
    });

    test('StrictMode owns the same objects as a plain mount, mode switches add none, and unmount releases everything', () => {
        const plain = mountGraph();
        const expected = {owned: plain.graph.ownedObjects(), board: plain.graph.liveBoard().objectsList.length};
        plain.view.unmount();
        const strict = mountGraph(true);
        expect(strict.graph.ownedObjects()).toBe(expected.owned);
        expect(strict.graph.liveBoard().objectsList.length).toBe(expected.board);
        for (const mode of ['iterate', 'tracedet', 'basis']) selectMode(mode);
        expect(strict.graph.liveBoard().objectsList.length).toBe(expected.board);
        strict.view.unmount();
        expect(strict.graph.ownedObjects()).toBe(0);
    });

    test('disposing the scene while playing stops the run and releases the objects; unmount afterwards is safe', () => {
        const {graph, view} = mountGraph();
        iterate(graph);
        press(t('play'));
        expect(graph.isPlaying()).toBe(true);
        graph.dispose();
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.ownedObjects()).toBe(0);
        expect(() => view.unmount()).not.toThrow();
        expect(graph.ownedObjects()).toBe(0);
    });
});

describe('localization', () => {
    const names = (text: string) => Array.from(text.matchAll(/\{(\w+)\}/g), m => m[1]).sort();
    const keys = Object.keys(sl).filter(key => key.startsWith('linear_map_'));

    test('every linear_map key exists in both languages with the same placeholder names', () => {
        expect(keys.length).toBeGreaterThanOrEqual(66);
        for (const key of keys) {
            const enText = en[key as keyof typeof sl];
            expect(typeof enText, key).toBe('string');
            expect(enText.length, key).toBeGreaterThan(0);
            expect(names(enText), key).toEqual(names(sl[key as keyof typeof sl]));
        }
        expect(Object.keys(en).filter(key => key.startsWith('linear_map_')).sort()).toEqual([...keys].sort());
    });

    test('every key the graph and its board use exists, and no linear_map key after linear_map_prompt is unused', () => {
        const source = ['LinearMapGraph.tsx', 'iterationBoard.ts', 'iterationScene.ts', 'linearMapPresetCollection.ts']
            .map(file => readFileSync(`src/graphs/linear/${file}`, 'utf8')).join('\n');
        const used = new Set(Array.from(source.matchAll(/["'](linear_map_\w+)["']/g), m => m[1]));
        for (const key of used) expect(keys, key).toContain(key);
        const batchD = keys.slice(keys.indexOf('linear_map_prompt') + 1);
        expect(batchD.length).toBeGreaterThanOrEqual(60);
        for (const key of batchD) expect(used.has(key), `unused: ${key}`).toBe(true);
    });

    test('a live language switch rewrites the iterate readouts, labels and statuses', () => {
        const {graph} = mountGraph();
        iterate(graph, E, [1, -2]);
        expect(document.querySelector('[data-linear-map-status="other-eigenvector"]')?.textContent).toBe(sl.linear_map_status_other_eigenvector);
        act(() => { setLanguage('en'); });
        expect(document.querySelector('[data-linear-map-status="other-eigenvector"]')?.textContent).toBe(en.linear_map_status_other_eigenvector);
        expect(screen.getByRole('button', {name: en.next_step})).toBeInTheDocument();
        expect(readout('start')).toBe('(1, −2)');
        act(() => { graph.act({kind: 'linear-map', operation: 'set-start', start: [1.5, 0]}); });
        expect(readout('start')).toBe('(1.5, 0)');
    });
});

describe('review repairs (F2a task 11)', () => {
    const label = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent;
    const stepTo = (graph: ObservedGraph, count: number) => act(() => { graph.act({kind: 'linear-map', operation: 'step', count}); });

    test('a start on the eigenvector of eigenvalue 0 is said to be sent to 0, not to stay on the line', () => {
        const {graph} = mountGraph();
        iterate(graph, [[1, 0], [0, 0]], [0, 1]);
        expect(statusIds()).toEqual(['start-to-zero']);
        expect(document.querySelector('[data-linear-map-status="start-to-zero"]')?.textContent).toBe(t('linear_map_status_start_to_zero'));
        stepTo(graph, 1);
        expect(readout('iterate')).toBe('(0, 0)');
        expect(statusIds()).toEqual(['start-to-zero', 'zero-iterate']);
        // A start on the other eigenvector with a nonzero eigenvalue keeps the old statement.
        act(() => { graph.act({kind: 'linear-map', operation: 'set-matrix', matrix: [[0.5, 0], [0, 1]]}); graph.act({kind: 'linear-map', operation: 'set-start', start: [1, 0]}); });
        expect(statusIds()).toContain('other-eigenvector');
        expect(statusIds()).not.toContain('start-to-zero');
    });

    test('the Rayleigh row claims the dominant eigenvalue only for a dominant class with a start off the other eigenvector', () => {
        const {graph} = mountGraph();
        iterate(graph, E, [1, 0]);
        stepTo(graph, 1);
        expect([label('rayleigh'), readout('rayleigh')]).toEqual([t('linear_map_readout_rayleigh'), '5']);
        stepTo(graph, 1);
        expect(readout('rayleigh')).toBe('5,0769');
        const cases: [Mat2, [number, number]][] = [[[[1, -1], [1, 1]], [1, 0]], [[[0, 3], [3, 0]], [1, 0]], [E, [1, -2]]];
        for (const [matrix, start] of cases) {
            act(() => { graph.act({kind: 'linear-map', operation: 'set-matrix', matrix}); graph.act({kind: 'linear-map', operation: 'set-start', start}); });
            expect(label('rayleigh')).toBe(t('linear_map_readout_rayleigh_plain'));
            expect(label('rayleigh')).not.toMatch(/dominant/);
        }
    });

    test('the ratio row speaks of an error factor only for a dominant matrix with a start that approaches it', () => {
        const {graph} = mountGraph();
        iterate(graph, E, [1, 0]);
        expect(label('ratio')).toBe(t('linear_map_readout_ratio'));
        act(() => { graph.act({kind: 'linear-map', operation: 'set-matrix', matrix: [[1, 1], [0, 1]]}); });
        expect(label('ratio')).toBe(t('linear_map_readout_ratio_plain'));
        expect(label('ratio')).not.toMatch(/napake|error/);
    });

    test('the tracedet legend swatches match what the board draws (pale faces, solid or dashed outline)', () => {
        const {graph} = mountGraph();
        selectMode('tracedet');
        const swatch = (id: string) => document.querySelector(`[data-legend="${id}"] .function-legend-swatch`)!.className;
        expect(swatch('parabola')).toContain('function-legend-dashed-line');
        expect(swatch('triangle')).toContain('function-legend-line');
        expect(swatch('flow')).toContain('function-legend-dashed');
        expect(swatch('flow')).not.toContain('function-legend-area');
        expect(swatch('triangle')).not.toContain('function-legend-area');
        // The board's own objects carry the attributes the legend kinds are derived from.
        const visOf = (fillColor: string) => graph.liveBoard().objectsList.map(object => (object as JXG.GeometryElement).visProp as Record<string, unknown>)
            .filter(vis => vis.fillcolor === fillColor)[0];
        expect(visOf(TRACE_DET_DRAWING.flow.fillColor)).toMatchObject({dash: TRACE_DET_DRAWING.flow.dash, fillopacity: TRACE_DET_DRAWING.flow.fillOpacity});
        expect(visOf(TRACE_DET_DRAWING.triangle.fillColor)).toMatchObject({fillopacity: TRACE_DET_DRAWING.triangle.fillOpacity});
        expect(visOf(TRACE_DET_DRAWING.triangle.fillColor).dash).toBeFalsy();
        expect(legendKindFor(TRACE_DET_DRAWING.flow)).toBe('dashed');
        expect(legendKindFor(TRACE_DET_DRAWING.triangle)).toBe('line');
        expect(legendKindFor(TRACE_DET_DRAWING.parabola)).toBe('dashed-line');
    });

    test('outside the iterate mode the start, step and length rows are not shown', () => {
        const {graph} = mountGraph();
        iterate(graph);
        for (const id of ['start', 'step', 'norm']) expect(readout(id)).toBeDefined();
        for (const mode of ['tracedet', 'basis', 'determinant']) {
            selectMode(mode);
            for (const id of ['start', 'step', 'norm']) expect(document.querySelector(`[data-readout="${id}"]`)).toBeNull();
        }
    });

    test('the step counter sits in the playback group and describes the Next step button; the gloss comes before the start controls', () => {
        const {graph} = mountGraph();
        iterate(graph);
        const next = screen.getByRole('button', {name: t('next_step')});
        const counterElement = document.querySelector('[data-step-counter]')!;
        expect(next.getAttribute('aria-describedby')!.split(' ')).toContain(counterElement.id);
        expect(next.closest('[role="group"]')).toBe(counterElement.closest('[role="group"]'));
        stepTo(graph, ITERATE_STEP_MAX);
        expect(screen.getByRole('button', {name: t('next_step')}).getAttribute('aria-describedby')).toContain(counterElement.id);
        const gloss = document.querySelector('[data-linear-map-iterate-gloss]')!;
        expect(gloss.textContent).toBe(t('linear_map_note_iterate'));
        expect(gloss.compareDocumentPosition(field(t('linear_map_start_x_label'))) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    test('the tracedet mode is named for the plane in both languages', () => {
        expect(sl.linear_map_mode_tracedet).toBe('Ravnina sled–determinanta');
        expect(en.linear_map_mode_tracedet).toBe('Trace–determinant plane');
    });
});
