import {stepWhile} from './boundedSteps.testing';
import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {DELAUNAY_STEP_INTERVAL_MS, DelaunayGraph} from './DelaunayGraph';
import {DELAUNAY_EXAMPLES, DELAUNAY_PRESET_KEY, DELAUNAY_QUAD} from './delaunayPresetCollection';
import {TRIANGULATION_DELAUNAY, TRIANGULATION_T0} from './triangulationPresetCollection';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {setLanguage} from '../../localization';

// Counts the live subscriptions of the language listener, so unmount can be checked to release it.
const languageListeners = vi.hoisted(() => ({live: 0}));
vi.mock('../../localization', async importOriginal => {
    const original = await importOriginal<typeof import('../../localization')>();
    return {
        ...original,
        onLanguageChange: (listener: () => void) => {
            languageListeners.live++;
            const off = original.onLanguageChange(listener);
            let released = false;
            return () => { if (!released) languageListeners.live--; released = true; off(); };
        },
    };
});

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    languageListeners.live = 0;
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

class Observed extends DelaunayGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; plaintext?: string; center?: {X(): number; Y(): number}; Radius?(): number};
const objects = (graph: Observed) => graph.liveBoard().objectsList as unknown as Shown[];
const named = (graph: Observed, name: string) => objects(graph).filter(o => o.name === name);
const circles = (graph: Observed) => named(graph, 'delaunay-circumcircle');
const illegalLabels = (graph: Observed) => named(graph, 'delaunay-illegal-label').map(o => o.plaintext);

const mount = (graph: Observed) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const part = (name: string) => document.querySelector(`[data-delaunay="${name}"]`)?.textContent;
const readout = (name: string) => document.querySelector(`[data-readout="${name}"]`)?.textContent;
const button = (action: string) => document.querySelector(`button[data-action="${action}"]`) as HTMLButtonElement;
const click = (action: string) => act(() => { fireEvent.click(button(action)); });
const saveState = (fields: object) => ({initialized: true, ...fields});
const toEnd = (graph: Observed) => { stepWhile(() => graph.step < graph.run().length - 1, () => click('next-step')); };
const toStep = (graph: Observed, step: number) => { stepWhile(() => graph.step < step, () => click('next-step')); };
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}
function tick(frames: ReturnType<typeof manualScheduler>, ticks: number) {
    act(() => { frames.frame(0); });
    for (let i = 0; i < ticks; i++) act(() => { frames.frame(DELAUNAY_STEP_INTERVAL_MS); });
}
/** A triangle list as a set: every triangle rotated to start at its smallest index, then sorted. */
const triangleSet = (triangles: readonly (readonly number[])[]) => triangles.map(tri => {
    const at = tri.indexOf(Math.min(...tri));
    return [tri[at], tri[(at + 1) % 3], tri[(at + 2) % 3]];
}).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);

test('the default scene is example 1 (the quad with diagonal ac) at step 0, paused, and says so in the panel', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model.points).toEqual(DELAUNAY_QUAD.points);
    expect(graph.triangles).toEqual([[0, 1, 2], [0, 2, 3]]);
    expect([graph.step, graph.isPlaying, graph.run().length]).toEqual([0, false, 5]);
    expect(part('step')).toBe('Korak 1 od 5');
    expect(part('incircle')).toBeUndefined();
    expect(readout('illegal')).toBe('Neustreznih robov: 1');
});

test('example 1: +64 at the first test, a flip to bd, then the trace own -64 test (one value per edge; both-sides -64 is slice 13b), minimum 19,65 to 26,57 and the six sorted angles', () => {
    const graph = new Observed();
    mount(graph);
    expect(readout('min-start')).toBe('Najmanjši kot na začetku (korak 1): 19,65°');
    expect(readout('min-now')).toBe('Najmanjši kot zdaj: 19,65°');
    expect(readout('angles-now')).toBe('Koti zdaj, naraščajoče: 19,65; 30,96; 40,60; 59,04; 101,31; 108,43');
    click('next-step');
    expect(part('incircle')).toBe('Vrednost preizkusa krožnice (incircle) = +64: preizkušana točka je znotraj krožnice');
    expect(part('detail')).toBe('Preizkušeni rob P1–P3; nasprotni točki P2 in P4');
    expect(part('note')).toBe('Rob je neustrezen: preizkušana točka je znotraj očrtane krožnice drugega trikotnika.');
    expect(readout('flips')).toBe('Zamenjav doslej: 0');
    click('next-step');
    expect(graph.run().event(graph.step)?.note).toBe('flip-edge');
    expect(readout('flips')).toBe('Zamenjav doslej: 1');
    expect(readout('illegal')).toBe('Neustreznih robov: 0');
    expect(triangleSet(graph.triangulation()?.triangles ?? [])).toEqual([[0, 1, 3], [1, 2, 3]]);
    click('next-step');
    expect(part('incircle')).toBe('Vrednost preizkusa krožnice (incircle) = -64: preizkušana točka je zunaj krožnice');
    click('next-step');
    expect(part('done')).toBe('Vsi robovi so ustrezni: Delaunayeva triangulacija.');
    expect(part('cocircular')).toBeUndefined();
    expect(readout('min-now')).toBe('Najmanjši kot zdaj: 26,57°');
    expect(readout('min-start')).toBe('Najmanjši kot na začetku (korak 1): 19,65°');
    expect(readout('angles-now')).toBe('Koti zdaj, naraščajoče: 26,57; 37,87; 60,26; 63,43; 81,87; 90,00');
    expect(readout('angles-start')).toBe('Koti na začetku, naraščajoče: 19,65; 30,96; 40,60; 59,04; 101,31; 108,43');
});

test('example 2 makes exactly the flips p1p4, p2p4, p4p6 in order, from 1,91 to 25,35, to the spec Delaunay list', () => {
    const graph = new Observed();
    mount(graph);
    click('example-seven');
    expect([graph.triangles, graph.step]).toEqual([TRIANGULATION_T0, 0]);
    expect(readout('min-now')).toBe('Najmanjši kot zdaj: 1,91°');
    expect(readout('illegal')).toBe('Neustreznih robov: 3');
    // the angle line of a larger set is truncated with its count
    expect(readout('angles-now')).toMatch(/^Najmanjših 6 od 21 kotov, naraščajoče: 1,91; /);
    const removed: Array<readonly number[]> = [];
    toEnd(graph);
    const run = graph.run();
    for (let i = 0; i < run.length; i++) {
        const e = run.event(i);
        if (e?.kind === 'flip' && e.event.payload.edge) removed.push(e.event.payload.edge);
    }
    expect(removed).toEqual([[1, 4], [2, 4], [4, 6]]);
    expect(readout('flips')).toBe('Zamenjav doslej: 3');
    expect(readout('min-now')).toBe('Najmanjši kot zdaj: 25,35°');
    expect(readout('min-start')).toBe('Najmanjši kot na začetku (korak 1): 1,91°');
    expect(readout('illegal')).toBe('Neustreznih robov: 0');
    expect(triangleSet(graph.triangulation()?.triangles ?? [])).toEqual(triangleSet(TRIANGULATION_DELAUNAY));
    expect(part('cocircular')).toBeUndefined();
});

test('illegal edges are dashed and labelled with text at step 0 of example 2, and unmarked at the end', () => {
    const graph = new Observed();
    mount(graph);
    click('example-seven');
    expect(named(graph, 'delaunay-illegal-edge')).toHaveLength(3);
    expect(illegalLabels(graph)).toEqual(['neustrezen rob', 'neustrezen rob', 'neustrezen rob']);
    toEnd(graph);
    expect(named(graph, 'delaunay-illegal-edge')).toHaveLength(0);
    expect(illegalLabels(graph)).toEqual([]);
});

test('the unit square ends with zero flips, both diagonals legal with determinant 0, and the non-unique note', () => {
    const graph = new Observed();
    mount(graph);
    click('example-square');
    expect(readout('illegal')).toBe('Neustreznih robov: 0');
    click('next-step');
    expect(part('incircle')).toBe('Vrednost preizkusa krožnice (incircle) = 0: preizkušana točka je na krožnici');
    expect(part('cocircular')).toBeUndefined();
    toEnd(graph);
    expect(readout('flips')).toBe('Zamenjav doslej: 0');
    expect(part('done')).toBe('Vsi robovi so ustrezni: Delaunayeva triangulacija.');
    expect(part('cocircular')).toBe('Kocirkularne točke: triangulacija ni enolična.');
    expect(graph.triangulation()?.triangles).toEqual(DELAUNAY_EXAMPLES[2].data.triangles);
});

test('the drawn circle at a test is the exact circumcircle of abc: centre (2, 7/3), radius sqrt(85)/3, only at test events', () => {
    const graph = new Observed();
    mount(graph);
    expect(circles(graph)).toHaveLength(0);
    click('next-step');
    const [circle] = circles(graph);
    expect(circles(graph)).toHaveLength(1);
    expect(circle.elType).toBe('circle');
    expect(circle.center?.X()).toBe(2);
    expect(circle.center?.Y()).toBe(7 / 3);
    expect(circle.Radius?.()).toBeCloseTo(Math.sqrt(85) / 3, 12);
    click('next-step');
    expect(circles(graph)).toHaveLength(0);
    click('next-step');
    // the test of the flipped edge bd draws the circle of its first triangle
    expect(circles(graph)).toHaveLength(1);
    click('next-step');
    expect(circles(graph)).toHaveLength(0);
});

test('the test highlights the edge under test with its two triangles', () => {
    const graph = new Observed();
    mount(graph);
    click('next-step');
    expect(named(graph, 'delaunay-test-edge')).toHaveLength(1);
    expect(named(graph, 'delaunay-test-triangle')).toHaveLength(2);
    click('next-step');
    expect(named(graph, 'delaunay-test-edge')).toHaveLength(0);
    expect(named(graph, 'delaunay-test-triangle')).toHaveLength(0);
});

test('Next step k times equals Play for k ticks; Play stops at the end and Reset returns to step 0', () => {
    const k = 4;
    const byNext = new Observed();
    const first = mount(byNext);
    click('example-seven');
    for (let i = 0; i < k; i++) click('next-step');
    const snapshot = (g: Observed) => ({
        step: g.step, status: [part('step'), part('note'), part('detail'), part('incircle'), readout('flips'), readout('illegal'), readout('min-now')],
        objects: objects(g).length, circles: circles(g).length,
    });
    const nextSnapshot = snapshot(byNext);
    first.unmount();

    const frames = manualScheduler();
    const byPlay = new Observed({}, frames.scheduler);
    mount(byPlay);
    click('example-seven');
    click('play-pause');
    expect(byPlay.isPlaying).toBe(true);
    expect(button('play-pause').textContent).toBe('Premor');
    tick(frames, k);
    expect(snapshot(byPlay)).toEqual(nextSnapshot);
    expect(nextSnapshot.step).toBe(k);

    for (let ran = true, i = 0; ran && i < byPlay.run().length + 5; i++) act(() => { ran = frames.frame(DELAUNAY_STEP_INTERVAL_MS); });
    expect(byPlay.step).toBe(byPlay.run().length - 1);
    expect(byPlay.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
    click('reset');
    expect([byPlay.step, byPlay.isPlaying]).toEqual([0, false]);
});

test('an edit while playing (move, add, remove, manual flip, example) returns to step 0, pauses and leaves nothing scheduled', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph);
    click('example-seven');
    click('play-pause');
    tick(frames, 4);
    expect(graph.step).toBe(4);
    act(() => { graph.movePointTo(3, {x: 4, y: 7}); });
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);

    click('play-pause');
    tick(frames, 3);
    expect(graph.step).toBe(3);
    act(() => { graph.addPointAt({x: 3, y: 6}); });
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);

    click('play-pause');
    tick(frames, 2);
    act(() => { graph.select(graph.model.points.length - 1); });
    act(() => { graph.removeSelected(); });
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);

    click('play-pause');
    tick(frames, 2);
    expect(graph.step).toBe(2);
    const before = graph.triangles;
    // a refused flip (not a flippable edge) changes nothing, so the first flippable edge of the displayed triangulation is used
    let flipped = false;
    const n = graph.model.points.length;
    for (let a = 0; a < n && !flipped; a++) {
        for (let b = a + 1; b < n && !flipped; b++) {
            act(() => { graph.selectEdge(a, b); });
            if (graph.selectedEdge()) {
                act(() => { flipped = graph.flipSelected(); });
                if (!flipped) expect([graph.step, graph.isPlaying]).toEqual([2, true]);
            }
        }
    }
    expect(flipped).toBe(true);
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    expect(graph.triangles).not.toEqual(before);

    click('play-pause');
    tick(frames, 2);
    click('example-quad');
    expect([graph.step, graph.isPlaying, frames.callbacks.size, graph.model.points]).toEqual([0, false, 0, DELAUNAY_QUAD.points]);
    click('play-pause');
    tick(frames, 2);
    expect(graph.step).toBe(2);
});

test('the start and the step survive a Preset round trip; a stale step is clamped; the collection validates', async () => {
    const graph = new Observed();
    mount(graph);
    click('example-seven');
    toStep(graph, 3);
    act(() => { graph.saveCurrentPreset('mine'); });
    expect(graph.presets()).toBe(DELAUNAY_PRESET_KEY);
    const saved = graph.exportPreset();
    expect(saved.graphState).toMatchObject({step: 3});
    expect(saved.graphState).not.toHaveProperty('playing');
    expect(saved.graphState).not.toHaveProperty('triangles');
    expect(saved.data).toMatchObject({triangles: TRIANGULATION_T0});
    click('example-quad');
    expect(graph.step).toBe(0);
    await settle(() => graph.selectPreset('mine'));
    expect([graph.step, graph.triangles, graph.isPlaying]).toEqual([3, TRIANGULATION_T0, false]);
    expect(part('step')).toBe(`Korak 4 od ${graph.run().length}`);

    const seven = DELAUNAY_EXAMPLES[1].data;
    act(() => { graph.importPreset({id: DELAUNAY_PRESET_KEY, graphState: saveState({step: 999999}), data: seven}); });
    expect(graph.step).toBe(graph.run().length - 1);
    act(() => { graph.importPreset({id: DELAUNAY_PRESET_KEY, graphState: saveState({step: -4}), data: DELAUNAY_EXAMPLES[0].data}); });
    expect(graph.step).toBe(0);

    const collection = graph.presetCollection();
    const checkState = (graphState: unknown) => collection.checkGraphState?.(graphState);
    expect(collection.key).toBe('compgeo-delaunay');
    expect(checkState({initialized: true, overlays: {triangulation: true}, step: 7})).toBeUndefined();
    expect(checkState({initialized: true, step: 'first'})?.key).toBe('del_invalid_step');
    expect(checkState({initialized: true, overlays: {nope: true}})?.key).toBe('pointset_invalid_overlays');
    expect('data' in collection.check(seven)).toBe(true);
    expect('rejection' in collection.check({...seven, triangles: [[0, 1, 2]]})).toBe(true);
    expect('rejection' in collection.check(DELAUNAY_QUAD)).toBe(true);
});

test('a live language switch re-renders the panel and the board label of an illegal edge', () => {
    const graph = new Observed();
    mount(graph);
    click('example-seven');
    expect(button('next-step').textContent).toBe('Naslednji korak');
    expect(illegalLabels(graph)[0]).toBe('neustrezen rob');
    toEnd(graph);
    expect(part('done')).toBe('Vsi robovi so ustrezni: Delaunayeva triangulacija.');
    click('reset');
    act(() => { setLanguage('en'); });
    expect(button('next-step').textContent).toBe('Next step');
    expect(part('note')).toBe('Starting triangulation: no edge has been tested yet.');
    expect(readout('min-now')).toBe('Smallest angle now: 1.91°');
    expect(illegalLabels(graph)[0]).toBe('illegal edge');
    toEnd(graph);
    expect(part('done')).toBe('Every edge is legal: Delaunay triangulation.');
    act(() => { setLanguage('sl'); });
    expect(part('done')).toBe('Vsi robovi so ustrezni: Delaunayeva triangulacija.');
});

test('points that allow no triangulation show no trace and disable the buttons', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, {mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 1, y: 1}]});
    expect(graph.run().length).toBe(0);
    expect(graph.triangulation()).toBeUndefined();
    expect(part('step')).toBeUndefined();
    expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
    expect(button('play-pause').getAttribute('aria-disabled')).toBe('true');
    click('next-step');
    expect(graph.step).toBe(0);
});

test('a scene change and unmount pause playback and leave no board objects, listeners or timers', async () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    const view = mount(graph);
    click('example-seven');
    const board = graph.liveBoard();
    const box = board.containerObj as HTMLElement;
    const remove = vi.spyOn(box, 'removeEventListener');
    act(() => { graph.saveCurrentPreset('mine'); });
    click('play-pause');
    tick(frames, 4);
    expect(graph.isPlaying).toBe(true);
    await settle(() => graph.selectPreset('mine'));
    expect([graph.isPlaying, frames.callbacks.size, graph.step]).toEqual([false, 0, 0]);

    click('play-pause');
    tick(frames, 1);
    expect(frames.callbacks.size).toBe(1);
    expect(languageListeners.live).toBeGreaterThan(1);
    expect(circles(graph)).toHaveLength(1);
    expect((board.objectsList as unknown[]).length).toBeGreaterThan(0);
    view.unmount();
    expect(graph.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(frames.frame(DELAUNAY_STEP_INTERVAL_MS)).toBe(false);
    expect(languageListeners.live).toBe(0);
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.childElementCount).toBe(0);
    expect(() => act(() => { setLanguage('en'); })).not.toThrow();
});
