import {stepWhile} from './boundedSteps.testing';
import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {EAR_CLIPPING_STEP_INTERVAL_MS, EarClippingGraph} from './EarClippingGraph';
import {
    EAR_CLIPPING_EXAMPLE_1, EAR_CLIPPING_EXAMPLE_2, EAR_CLIPPING_PRESET_KEY,
} from './earClippingPresetCollection';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {guardView} from '../../compgeo/earClipping';
import {PointSetModel} from '../../compgeo/pointSetModel';
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

class Observed extends EarClippingGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; plaintext?: string; vertices?: Array<{X(): number; Y(): number}>};
const objects = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const polygons = (graph: Observed) => objects(graph).filter(o => o.elType === 'polygon');
/** Every polygon as its corner coordinates, in creation order (a JSXG polygon repeats its first vertex at the end). */
const drawnPolygons = (graph: Observed) => polygons(graph).map(o => (o.vertices ?? []).slice(0, -1).map(v => [v.X(), v.Y()]));
const curves = (graph: Observed) => objects(graph).filter(o => o.elType === 'curve');
/** Overlay markers: points that are not the vertex points P1, P2, ... */
const markers = (graph: Observed) => objects(graph).filter(o => o.elType === 'point' && o.name === 'earclip-marker');
const letters = (graph: Observed) => objects(graph).filter(o => o.elType === 'text' && /^[ABC]$/.test(o.plaintext ?? '')).map(o => o.plaintext);
const traceObjects = (graph: Observed) => polygons(graph).length + curves(graph).length + markers(graph).length;

const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const part = (name: string) => document.querySelector(`[data-ear-clipping="${name}"]`)?.textContent;
const result = (name: string) => document.querySelector(`[data-ear-clipping="result"] [data-result="${name}"]`)?.textContent;
const status = () => ['step', 'note', 'detail', 'triangles', 'count'].map(part);
const button = (action: string) => document.querySelector(`button[data-action="${action}"]`) as HTMLButtonElement;
const click = (action: string) => act(() => { fireEvent.click(button(action)); });
const model = (points: Array<[number, number]>): PointSetModel => ({mode: 'polygon', closed: true, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
const toEnd = (graph: Observed) => { stepWhile(() => graph.step < graph.run().length - 1, () => click('next-step')); };
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}
function tick(frames: ReturnType<typeof manualScheduler>, ticks: number) {
    act(() => { frames.frame(0); });
    for (let i = 0; i < ticks; i++) act(() => { frames.frame(EAR_CLIPPING_STEP_INTERVAL_MS); });
}
/** Shows exactly one overlay, so a count of board objects belongs to it. */
const only = (graph: Observed, ...ids: Array<'trace' | 'reflex' | 'triangulation' | 'colouring' | 'guards'>) => act(() => {
    for (const id of ['trace', 'reflex', 'triangulation', 'colouring', 'guards'] as const) graph.setOverlay(id, ids.includes(id));
});
const saveState = (fields: object) => ({initialized: true, ...fields});

test('the default scene is Example 1 at step 0 with the trace and reflex overlays; the reflex vertex (3, 2) is marked', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model).toEqual(EAR_CLIPPING_EXAMPLE_1);
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    expect(part('step')).toBe(`Korak 1 od ${graph.run().length}`);
    expect(graph.run().reflex).toEqual([3]);
    expect(markers(graph)).toHaveLength(1);
    expect(markers(graph)[0].name).toBe('earclip-marker');
    expect(document.querySelector('[data-hull-trace]')).toBeNull();
});

test('Example 1 clips the three listed triangles in order when stepped to the end', () => {
    const graph = new Observed();
    mount(graph);
    only(graph, 'trace');
    const clipped: number[][][] = [];
    let seen = 0;
    stepWhile(() => graph.step < graph.run().length - 1, () => {
        click('next-step');
        const so = graph.run().state(graph.step).triangles;
        if (so.length > seen) { seen = so.length; clipped.push(so.map(t => [...t])); }
    });
    expect(clipped.at(-1)).toEqual([[1, 2, 3], [0, 1, 3], [0, 3, 4]]);
    // (6,0)(6,4)(3,2), then (0,0)(6,0)(3,2), then (0,0)(3,2)(0,4): as input vertices 1,2,3 / 0,1,3 / 0,3,4
    expect(part('triangles')).toBe('Odrezani trikotniki doslej: 3');
    expect(polygons(graph)).toHaveLength(3);
    expect(drawnPolygons(graph)).toEqual([[[6, 0], [6, 4], [3, 2]], [[0, 0], [6, 0], [3, 2]], [[0, 0], [3, 2], [0, 4]]]);
    expect(part('note')).toBe('Konec: večkotnik je razrezan na trikotnike.');
});

test('the current ear test is highlighted: a blocked apex draws its triangle and a cross on the vertex found inside', () => {
    const graph = new Observed();
    mount(graph);
    only(graph, 'trace');
    click('next-step');
    expect(part('note')).toBe('Oglišče je izbočeno, a v trikotniku s sosedama leži drugo oglišče: ni ušesa.');
    expect(part('detail')).toBe('Preizkušeno oglišče P1, trikotnik P5 P1 P2 V trikotniku leži oglišče P4.');
    expect(drawnPolygons(graph)).toEqual([[[0, 4], [0, 0], [6, 0]]]);
    expect(markers(graph)).toHaveLength(1);
    click('next-step');
    click('next-step');
    expect(part('note')).toBe('Oglišče je izbočeno in v trikotniku ni drugih oglišč: to je uho.');
    expect(drawnPolygons(graph)).toEqual([[[6, 0], [6, 4], [3, 2]]]);
    expect(markers(graph)).toHaveLength(0);
});

test('Next step repeated k times and Play advanced k ticks give the same state; Play stops at done', () => {
    const k = 5;
    const byNext = new Observed();
    const first = mount(byNext);
    for (let i = 0; i < k; i++) click('next-step');
    const snapshot = (g: Observed) => ({step: g.step, status: status(), polygons: drawnPolygons(g), objects: objects(g).length});
    const nextSnapshot = snapshot(byNext);
    first.unmount();

    const frames = manualScheduler();
    const byPlay = new Observed({}, frames.scheduler);
    mount(byPlay);
    click('play-pause');
    expect(byPlay.isPlaying).toBe(true);
    expect(button('play-pause').textContent).toBe('Premor');
    tick(frames, k);
    expect(snapshot(byPlay)).toEqual(nextSnapshot);
    expect(nextSnapshot.step).toBe(k);
    expect(nextSnapshot.polygons.length).toBeGreaterThan(0);

    for (let ran = true, i = 0; ran && i < byPlay.run().length + 5; i++) act(() => { ran = frames.frame(EAR_CLIPPING_STEP_INTERVAL_MS); });
    expect(byPlay.step).toBe(byPlay.run().length - 1);
    expect(byPlay.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
    click('reset');
    expect([byPlay.step, byPlay.isPlaying]).toEqual([0, false]);
    expect(part('step')).toBe(`Korak 1 od ${byPlay.run().length}`);
});

test('an edit, a drag, an added vertex or an example returns to step 0, pauses and leaves nothing scheduled', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph);
    click('play-pause');
    tick(frames, 4);
    expect(graph.step).toBe(4);
    act(() => { graph.movePointTo(3, {x: 3, y: 1}); });
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    click('next-step');
    click('next-step');
    act(() => { graph.addPointAt({x: -1, y: 2}); });
    expect(graph.step).toBe(0);
    click('next-step');
    click('play-pause');
    load(graph, model([[0, 0], [4, 0], [2, 3]]));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    click('next-step');
    click('example-2');
    expect([graph.step, graph.model]).toEqual([0, EAR_CLIPPING_EXAMPLE_2]);
    click('play-pause');
    tick(frames, 2);
    expect(graph.step).toBe(2);
});

test('the comb shows colour class sizes 4, 4, 3, nine triangles, eight diagonals and three guards when done', () => {
    const graph = new Observed();
    mount(graph);
    click('example-2');
    expect(document.querySelector('[data-ear-clipping="result"]')).toBeNull();
    toEnd(graph);
    expect(result('classes')).toBe('Barvni razredi (A, B, C): 4, 4, 3');
    expect(result('triangles')).toBe('Trikotnikov: 9 (n − 2, kjer je n = 11 število oglišč)');
    expect(result('diagonals')).toBe('Diagonal: 8 (n − 3)');
    expect(result('guards')).toMatch(/^Stražarjev: 3 \(⌊n\/3⌋\); najmanjši barvni razred jih postavi v oglišča P\d+, P\d+, P\d+\.$/);
    expect(graph.run().summary?.classSizes).toEqual([4, 4, 3]);
    // the colouring overlay: a letter and a marker for every vertex
    only(graph, 'colouring');
    expect(letters(graph).sort().join('')).toBe(graph.run().colours.map(c => 'ABC'[c]).sort().join(''));
    expect(markers(graph)).toHaveLength(11);
    // the triangulation overlay: n - 2 triangles and n - 3 diagonals
    only(graph, 'triangulation');
    expect(polygons(graph)).toHaveLength(9);
    expect(curves(graph)).toHaveLength(8);
    expect(result('diagonals')).toBe('Diagonal: 8 (n − 3)');
    // the same overlays draw nothing before the trace is done
    click('reset');
    expect(traceObjects(graph)).toBe(0);
});

test('the guard view equals the triangles at the guard vertex, for the first guard and for a selected one', () => {
    const graph = new Observed();
    mount(graph);
    click('example-2');
    toEnd(graph);
    only(graph, 'guards');
    const run = graph.run();
    const guards = run.guards.vertices;
    expect(guards).toHaveLength(3);
    const first = graph.guardShown();
    expect(first).toBe(guards[0]);
    expect(polygons(graph)).toHaveLength(guardView(run.triangles, guards[0]).length);
    expect(markers(graph)).toHaveLength(3);
    // guards are hollow rings around the vertex: unlike the filled reflex and colouring markers they hide no shape cue
    const look = (graph: Observed) => markers(graph).map(m => { const v = (m as unknown as {visProp: Record<string, unknown>}).visProp; return {opacity: v.fillopacity, size: Number(v.size)}; });
    expect(look(graph).every(({opacity, size}) => opacity === 0 && size >= 11)).toBe(true);
    only(graph, 'colouring');
    expect(look(graph).every(({opacity, size}) => opacity !== 0 && size <= 8)).toBe(true);
    only(graph, 'reflex');
    expect(look(graph).every(({opacity, size}) => opacity !== 0 && size <= 8)).toBe(true);
    only(graph, 'guards');
    for (const guard of guards) {
        act(() => { graph.select(guard); });
        expect(graph.guardShown()).toBe(guard);
        expect(polygons(graph)).toHaveLength(guardView(run.triangles, guard).length);
        expect(drawnPolygons(graph).every(corners => corners.length === 3)).toBe(true);
    }
    // a selected vertex that is not a guard leaves the first guard shown
    const other = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find(v => !guards.includes(v));
    act(() => { graph.select(other); });
    expect(polygons(graph)).toHaveLength(guardView(run.triangles, guards[0]).length);
    // Example 1: one guard at (3, 2) sees all three triangles
    click('example-1');
    toEnd(graph);
    expect(graph.run().guards.vertices).toEqual([3]);
    expect(polygons(graph)).toHaveLength(3);
});

const REFUSALS: Array<[string, Array<[number, number]>, string]> = [
    ['fewer-than-three', [[0, 0], [4, 0]], 'Večkotnik potrebuje vsaj tri oglišča. Dodajte še oglišča.'],
    ['not-simple', [[0, 0], [4, 4], [4, 0], [0, 4]], 'Stranice večkotnika se sekajo ali dotikajo. Premaknite oglišča, da bo večkotnik enostaven; rezanje ušes zahteva enostaven večkotnik.'],
    ['collinear-vertices', [[0, 0], [2, 0], [4, 0], [4, 4], [0, 4]], 'Tri zaporedna oglišča ležijo na isti premici. Premaknite eno od njih; rezanje ušes tega ne dopušča.'],
];

test.each(REFUSALS)('refusal %s shows an actionable message, draws no trace objects and disables the controls', (reason, points, text) => {
    const graph = new Observed();
    mount(graph);
    act(() => { for (const id of ['grid', 'reflex', 'triangulation', 'colouring', 'guards'] as const) graph.setOverlay(id, id !== 'grid'); });
    load(graph, model(points));
    expect(graph.run().refusal).toBe(reason);
    expect(part('refusal')).toBe(text);
    expect(document.querySelector('[data-ear-clipping="refusal"]')?.getAttribute('role')).toBe('alert');
    expect(part('step')).toBeUndefined();
    expect(traceObjects(graph)).toBe(0);
    expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
    expect(button('play-pause').getAttribute('aria-disabled')).toBe('true');
    click('next-step');
    click('play-pause');
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    act(() => { setLanguage('en'); });
    expect(part('refusal')).not.toBe(text);
    expect(part('refusal')).toMatch(/^(A polygon needs|The polygon's sides|Three consecutive)/);
    // repairing the polygon brings the trace back
    load(graph, EAR_CLIPPING_EXAMPLE_1);
    expect(part('refusal')).toBeUndefined();
    expect(part('step')).toBe(`Step 1 of ${graph.run().length}`);
});

test('the base closed-polygon checkbox is not offered', () => {
    const graph = new Observed();
    mount(graph);
    expect(document.querySelector('.pointset-inspector')).not.toBeNull();
    const labels = Array.from(document.querySelectorAll('.pointset-check')).map(label => label.textContent ?? '');
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.some(text => text.includes('Sklenjen večkotnik'))).toBe(false);
});

test('a clockwise polygon is reversed for the trace, the panel says so and the stored model is unchanged', () => {
    const graph = new Observed();
    mount(graph);
    expect(part('reversed')).toBeUndefined();
    const clockwise = {...EAR_CLIPPING_EXAMPLE_1, points: [...EAR_CLIPPING_EXAMPLE_1.points].reverse()};
    load(graph, clockwise);
    expect(graph.run().reversed).toBe(true);
    expect(part('reversed')).toBe('Večkotnik je v smeri urinega kazalca; za rezanje ušes ga obrnemo v nasprotno smer. Shranjeni večkotnik se ne spremeni.');
    expect(graph.model.points).toEqual(clockwise.points);
    expect(graph.exportPresetData().points).toEqual(clockwise.points);
    expect(graph.run().refusal).toBeUndefined();
    expect(graph.run().reflex).toEqual([1]);
    toEnd(graph);
    expect(result('triangles')).toBe('Trikotnikov: 3 (n − 2, kjer je n = 5 število oglišč)');
    expect(graph.run().triangles).toHaveLength(3);
    load(graph, EAR_CLIPPING_EXAMPLE_1);
    expect(part('reversed')).toBeUndefined();
});

test('the polygon and step survive a Preset round trip; an out-of-range step is clamped; the collection validates', async () => {
    const graph = new Observed();
    mount(graph);
    click('example-2');
    click('next-step');
    click('next-step');
    click('next-step');
    act(() => { graph.saveCurrentPreset('mine'); });
    expect(graph.presets()).toBe(EAR_CLIPPING_PRESET_KEY);
    const saved = graph.exportPreset();
    expect(saved.graphState).toMatchObject({step: 3});
    expect(saved.graphState).not.toHaveProperty('playing');
    expect(saved.graphState).not.toHaveProperty('model');
    load(graph, EAR_CLIPPING_EXAMPLE_1);
    expect(graph.step).toBe(0);
    await settle(() => graph.selectPreset('mine'));
    expect([graph.step, graph.model, graph.isPlaying]).toEqual([3, EAR_CLIPPING_EXAMPLE_2, false]);
    expect(part('step')).toBe(`Korak 4 od ${graph.run().length}`);

    act(() => { graph.importPreset({id: EAR_CLIPPING_PRESET_KEY, graphState: saveState({step: 999999}), data: EAR_CLIPPING_EXAMPLE_1}); });
    expect(graph.step).toBe(graph.run().length - 1);
    act(() => { graph.importPreset({id: EAR_CLIPPING_PRESET_KEY, graphState: saveState({step: -4}), data: EAR_CLIPPING_EXAMPLE_2}); });
    expect(graph.step).toBe(0);
    // a points-mode file is shown as the closed polygon
    act(() => { graph.importPreset({id: EAR_CLIPPING_PRESET_KEY, graphState: saveState({}), data: {...EAR_CLIPPING_EXAMPLE_1, mode: 'points', closed: false}}); });
    expect([graph.model.mode, graph.model.closed]).toEqual(['polygon', true]);

    const collection = graph.presetCollection();
    const checkState = (graphState: unknown) => collection.checkGraphState?.(graphState);
    expect(collection.key).toBe('compgeo-ear-clipping');
    expect(checkState({initialized: true, overlays: {trace: true, guards: false}, step: 7})).toBeUndefined();
    expect(checkState({initialized: true, step: 'first'})?.key).toBe('earclip_invalid_step');
    expect(checkState({initialized: true, algorithm: 'x'})?.key).toBe('invalid_value');
    expect(checkState({initialized: true, overlays: {nope: true}})?.key).toBe('pointset_invalid_overlays');
    expect('data' in collection.check(EAR_CLIPPING_EXAMPLE_2)).toBe(true);
    expect('rejection' in collection.check({...EAR_CLIPPING_EXAMPLE_2, points: Array.from({length: 41}, (_, i) => ({x: i, y: i * i % 7}))})).toBe(true);
    expect('rejection' in collection.check({mode: 'polygon'})).toBe(true);
});

test('a live language switch re-renders the panel and the overlay labels; the board letters stay', () => {
    const graph = new Observed();
    mount(graph);
    click('example-2');
    toEnd(graph);
    only(graph, 'colouring');
    const boardText = letters(graph);
    expect(boardText.length).toBe(11);
    expect(button('next-step').textContent).toBe('Naslednji korak');
    expect(part('note')).toBe('Konec: večkotnik je razrezan na trikotnike.');
    expect(document.body.textContent).toContain('Fiskovo 3-barvanje (po koncu)');
    act(() => { setLanguage('en'); });
    expect(button('next-step').textContent).toBe('Next step');
    expect(part('note')).toBe('Done: the polygon is cut into triangles.');
    expect(result('classes')).toBe('Colour classes (A, B, C): 4, 4, 3');
    expect(document.body.textContent).toContain("Fisk's 3-colouring (when done)");
    expect(letters(graph)).toEqual(boardText);
    expect(button('example-1').textContent).toBe('Example 1: notched pentagon');
    act(() => { setLanguage('sl'); });
    expect(part('note')).toBe('Konec: večkotnik je razrezan na trikotnike.');
});

test('a StrictMode remount gets a working controller and draws the scene once', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph, true);
    expect(markers(graph)).toHaveLength(1);
    expect(objects(graph).filter(o => o.elType === 'point' && /^P\d+$/.test(o.name ?? ''))).toHaveLength(5);
    click('play-pause');
    tick(frames, 2);
    expect(graph.step).toBe(2);
});

test('a scene change and unmount pause playback and leave no board objects, listeners or timers', async () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    const view = mount(graph);
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
    tick(frames, 3);
    expect(frames.callbacks.size).toBe(1);
    expect(languageListeners.live).toBeGreaterThan(0);
    expect((board.objectsList as unknown[]).length).toBeGreaterThan(0);
    view.unmount();
    expect(graph.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(frames.frame(EAR_CLIPPING_STEP_INTERVAL_MS)).toBe(false);
    expect(languageListeners.live).toBe(0);
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.childElementCount).toBe(0);
    expect(() => act(() => { setLanguage('en'); })).not.toThrow();
});
