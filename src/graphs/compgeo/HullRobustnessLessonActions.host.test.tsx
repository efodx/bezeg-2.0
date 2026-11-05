import React from 'react';
import {act, cleanup, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {HullRobustnessGraph} from './HullRobustnessGraph';
import {DegenerateSitesGraph} from './DegenerateSitesGraph';
import {VoronoiGraph} from './VoronoiGraph';
import {PointSetGraph} from './PointSetGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {kettnerSignMap} from '../../compgeo/inexactOrientation';
import {HULL_TRACE_STEP_INTERVAL_MS} from './HullTraceGraph';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {sceneActions} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
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

class Observed extends HullRobustnessGraph {
    /** The lesson runtime's entry point, exposed for synchronous action sequences. */
    run1(action: LessonAction) { this.applyLessonAction(action); }
    boardWidth() { const [left, , right] = this.board.getBoundingBox(); return right - left; }
}

const ps = (operation: string, fields: object = {}) => ({kind: 'point-set', operation, ...fields}) as unknown as Extract<LessonAction, {kind: 'point-set'}>;
const setMode = (mode: string) => ps('set-mode', {mode});
const setPop = (rule: string) => ps('set-pop-rule', {rule});
const setDuplicates = (duplicates: string) => ps('set-duplicates', {duplicates});
const selectCell = (i: unknown, j: unknown) => ps('select-cell', {i, j});
const trace = (command: string): LessonAction => ({kind: 'animation', animationId: 'algorithm-trace', command}) as LessonAction;
const apply = (graph: Observed, action: LessonAction) => act(() => { graph.run1(action); });
const part = (name: string) => document.querySelector(`[data-hull-robustness="${name}"]`)?.textContent;

function setup() {
    cleanup();
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, frames};
}
/** Plays one full tick so that the graph is running, past step 0. */
const playedForward = (graph: Observed, frames: ReturnType<typeof manualScheduler>) => {
    apply(graph, trace('play'));
    act(() => { frames.frame(0); });
    act(() => { frames.frame(HULL_TRACE_STEP_INTERVAL_MS); });
    expect(graph.isPlaying).toBe(true);
    expect(graph.step).toBeGreaterThan(0);
};
const finish = (graph: Observed) => {
    for (let i = 0; i < graph.run().length + 1; i++) if (!graph.run().view(graph.step).done) apply(graph, trace('next-step'));
    return graph.run().view(graph.step).hull ?? [];
};

test('one synchronous sequence: Kettner mode and cell (41, 48), then chain mode and the pop rule drive the real readouts', () => {
    const {graph} = setup();
    const cellMap = kettnerSignMap();
    act(() => {
        graph.run1(setMode('kettner'));
        graph.run1(selectCell(41, 48));
    });
    expect([graph.robustnessMode, graph.kettnerCell, graph.step, graph.isPlaying]).toEqual(['kettner', {i: 41, j: 48}, 0, false]);
    expect(part('cell-title')).toContain('41');
    expect(part('cell-title')).toContain('48');
    expect(cellMap.cells[48 * 64 + 41].exact).toBe(1);
    expect(cellMap.cells[48 * 64 + 41].naive).toBe(-1);
    expect(part('cell-exact')).toContain('+');
    expect(part('cell-naive-sign')).toContain('−');
    expect(part('cell-naive-value')).toMatch(/5[,.]68/);
    expect(cellMap.wrongSign).toBe(112);
    expect(cellMap.falseZero).toBe(2052);

    act(() => {
        graph.run1(setMode('chain'));
        graph.run1(setPop('non-left'));
    });
    expect(graph.robustnessMode).toBe('chain');
    expect(finish(graph)).not.toContain(7);
    expect(part('output')).not.toMatch(/P8/);

    act(() => { graph.run1(setPop('right')); });
    expect([graph.popRule, graph.step]).toEqual(['right', 0]);
    expect(part('rule')).toMatch(/< 0/);
    expect(finish(graph)).toContain(7);
    expect(part('output')).toMatch(/P8/);

    act(() => { graph.run1(setPop('non-left')); });
    expect(finish(graph)).not.toContain(7);
    expect(part('output')).not.toMatch(/P8/);
});

test('select-cell changes the cell the readout shows, edge cells included', () => {
    const {graph} = setup();
    apply(graph, setMode('kettner'));
    for (const [i, j] of [[0, 0], [63, 63], [10, 20]] as const) {
        apply(graph, selectCell(i, j));
        expect(graph.kettnerCell).toEqual({i, j});
        expect(part('cell-title')).toContain(`${i}`);
        expect(part('cell-title')).toContain(`${j}`);
    }
});

describe('every edit action pauses a running playback and returns to step 0', () => {
    const edits: Array<[string, Extract<LessonAction, {kind: 'point-set'}>]> = [
        ['set-pop-rule', setPop('right')],
        ['set-duplicates', setDuplicates('keep')],
        ['set-mode kettner', setMode('kettner')],
        ['select-cell', selectCell(3, 4)],
        ['set-mode chain (already chain)', setMode('chain')],
        ['set-pop-rule (already chosen)', setPop('non-left')],
        ['set-duplicates (already chosen)', setDuplicates('merge')],
    ];
    for (const [name, action] of edits) {
        test(name, () => {
            const {graph, frames} = setup();
            playedForward(graph, frames);
            apply(graph, action);
            expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
        });
    }
});

test('set-duplicates changes the rule and the control shows it', () => {
    const {graph} = setup();
    apply(graph, setDuplicates('keep'));
    expect(graph.duplicateRule).toBe('keep');
    expect((document.querySelectorAll('[data-hull-robustness="rules"] select')[1] as HTMLSelectElement).value).toBe('keep');
    apply(graph, setDuplicates('merge'));
    expect(graph.duplicateRule).toBe('merge');
    expect((document.querySelectorAll('[data-hull-robustness="rules"] select')[1] as HTMLSelectElement).value).toBe('merge');
});

test('Play and Next are refused in Kettner mode, and the view follows the mode exactly as the mode control does', () => {
    const viaControl = setup();
    const chainWidth = viaControl.graph.boardWidth();
    act(() => { viaControl.graph.setRobustnessMode('kettner'); });
    const kettnerWidth = viaControl.graph.boardWidth();
    act(() => { viaControl.graph.setRobustnessMode('chain'); });
    const returnedWidth = viaControl.graph.boardWidth();

    const {graph, frames} = setup();
    expect(graph.boardWidth()).toBeCloseTo(chainWidth, 6);
    apply(graph, setMode('kettner'));
    expect(kettnerWidth).toBeGreaterThan(chainWidth * 4);
    expect(graph.boardWidth()).toBeCloseTo(kettnerWidth, 6);
    apply(graph, trace('play'));
    apply(graph, trace('next-step'));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    apply(graph, setMode('chain'));
    // The saved chain view comes back exactly: a second round trip must not zoom out either.
    expect(returnedWidth).toBeCloseTo(chainWidth, 6);
    expect(graph.boardWidth()).toBeCloseTo(chainWidth, 6);
    apply(graph, setMode('kettner'));
    apply(graph, setMode('chain'));
    expect(graph.boardWidth()).toBeCloseTo(chainWidth, 6);
});

test('a bad value is a lesson-content error that changes nothing', () => {
    const {graph, frames} = setup();
    playedForward(graph, frames);
    const stepBefore = graph.step;
    const stateBefore = graph.state;
    for (const [i, j] of [[-1, 0], [0, 64], [64, 0], [1.5, 2], [2, 0.5], [Number.NaN, 0], ['3', 4], [undefined, 4], [Infinity, 1]]) {
        expect(() => graph.run1(selectCell(i, j))).toThrow('select-cell');
    }
    expect(() => graph.run1(setPop('left'))).toThrow('set-pop-rule');
    expect(() => graph.run1(setDuplicates('drop'))).toThrow('set-duplicates');
    for (const mode of ['both', 'sites', 'four-point']) expect(() => graph.run1(setMode(mode))).toThrow('set-mode');
    expect([graph.step, graph.isPlaying, graph.state]).toEqual([stepBefore, true, stateBefore]);
    expect(graph.kettnerCell).toEqual({i: 41, j: 48});
});

test('set-algorithm other than the monotone chain is still refused, and the new actions are supported', () => {
    const {graph} = setup();
    for (const algorithm of ['gift-wrapping', 'slow-edge-test']) {
        expect(() => graph.run1(ps('set-algorithm', {algorithm}))).toThrow(UnsupportedLessonActionError);
    }
    expect(() => graph.run1(ps('set-algorithm', {algorithm: 'monotone-chain'}))).not.toThrow();
    for (const action of [setMode('kettner'), setPop('right'), setDuplicates('keep'), selectCell(1, 2)]) expect(graph.supportsLessonAction(action)).toBe(true);
});

test('the Voronoi graphs reject the hull modes, and other point-set graphs reject the new operations', () => {
    for (const graph of [new VoronoiGraph(), new DegenerateSitesGraph()]) {
        for (const mode of ['chain', 'kettner']) expect(() => graph.applyPointSetAction(setMode(mode))).toThrow('set-mode');
        for (const action of [setPop('right'), setDuplicates('keep'), selectCell(1, 1)]) {
            expect(() => graph.applyPointSetAction(action)).toThrow(UnsupportedLessonActionError);
        }
    }
    for (const action of [setMode('kettner'), setPop('right'), setDuplicates('keep'), selectCell(1, 1)]) {
        expect(() => new PointSetGraph().applyPointSetAction(action)).toThrow(UnsupportedLessonActionError);
    }
});

test('the catalog checks the shape of the new actions and passes the good ones through unchanged', () => {
    const scene = (actions: LessonAction[]): Parameters<typeof sceneActions>[0] =>
        ({id: 'hull-robustness', basedOn: 'demonstration-default', actions, expectedState: {sl: 's', en: 'e'}});
    const good = [setMode('kettner'), setMode('chain'), setPop('right'), setDuplicates('keep'), selectCell(41, 48)];
    expect(sceneActions(scene(good)).slice(1)).toEqual(good);
    for (const bad of [setMode('both'), setPop('left'), setDuplicates('drop'), selectCell(1.5, 2), selectCell(0, 64), selectCell(-1, 0)]) {
        expect(() => sceneActions(scene([bad]))).toThrow();
    }
});
