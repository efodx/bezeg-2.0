import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {FORTUNE_STEP_INTERVAL_MS, FortuneGraph} from './FortuneGraph';
import {FORTUNE_EXAMPLE_1, FORTUNE_EXAMPLE_2} from './fortunePresetCollection';
import {VoronoiGraph} from './VoronoiGraph';
import {serializePointSetModel} from '../../compgeo/pointSetModel';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {runFortune} from './fortuneRun';
import {commitPresetImport, preflightPresetImport} from '../base/presets/PresetImport';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {appStorage} from '../../storage/appStorage';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve()}));

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends FortuneGraph {
    liveBoard() { return this.board; }
    /** Writes the step like a Preset restore does. */
    goTo(step: number) { this.setState(this['patch']({step})); }
    storedStep() { return 'step' in this.state ? this.state.step : undefined; }
    box() { return this['drawBox'](this.run()); }
    owned() { return {sweep: this['sweep'], final: this['final']}; }
}

type Shown = {elType: string; name?: string; dataX?: number[]; dataY?: number[]; X?: () => number; Y?: () => number};
const everything = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const named = (graph: Observed, ...names: string[]) => everything(graph).filter(o => names.includes(o.name ?? ''));
const beachSamples = (graph: Observed) => (named(graph, 'fortune-beach')[0]?.dataX ?? []).length;
const mount = (graph: Observed | VoronoiGraph) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const part = (name: string) => document.querySelector(`[data-fortune="${name}"]`)?.textContent;
const button = (action: string) => document.querySelector(`button[data-action="${action}"]`) as HTMLButtonElement;
const click = (action: string) => act(() => { fireEvent.click(button(action)); });
const trigger = (target: object, name: string) => (target as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers([name], []);
const sitePoints = (graph: Observed) => everything(graph).filter(o => o.elType === 'point' && /^[A-L]$/.test(o.name ?? ''));
const dragSite = (graph: Observed, index: number, x: number, y: number) => {
    const point = sitePoints(graph)[index] as unknown as JXG.Point;
    act(() => { point.moveTo([x, y], 0); trigger(point, 'drag'); });
};
/** The first step whose beach line contains site `site` (the site's event has been processed). */
const stepOfSite = (graph: Observed, site: number) =>
    Array.from({length: graph.run().length}, (_, k) => k).find(k => graph.run().view(k)?.state.beach.includes(site)) as number;

test('the default scene is the A-D example at step 0, sites named A to D', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model).toEqual(FORTUNE_EXAMPLE_1);
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    expect(part('step')).toBe(`Korak 1 od ${graph.run().length}`);
    expect(sitePoints(graph).map(o => o.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(named(graph, 'fortune-sweep-line')).toHaveLength(1);
});

test('stepping around D: the beach line reads A, B, A, C, A before D and the cancelled circle is dashed after it', () => {
    const graph = new Observed();
    mount(graph);
    const dStep = stepOfSite(graph, 3);
    const beaches: string[] = [];
    for (let step = 0; step < graph.run().length; step++) {
        if (step > 0) click('next-step');
        expect(graph.step).toBe(step);
        beaches.push(part('beach') ?? '(done)');
        if (step === dStep - 1) {
            expect(part('beach')).toBe('Obalna črta (od leve proti desni): A, B, A, C, A');
            // The beach line is drawn as one curve holding the five arcs, and the circle through B, A, C is scheduled and not yet cancelled.
            expect(named(graph, 'fortune-beach')).toHaveLength(1);
            const arcs = graph.run().view(step)!.arcs;
            expect(arcs).toHaveLength(5);
            expect(beachSamples(graph)).toBe(arcs.reduce((n, arc) => n + arc.xs.length, 0));
            expect(named(graph, 'fortune-circle')).toHaveLength(1);
            expect(named(graph, 'fortune-circle-cancelled')).toHaveLength(0);
        }
        if (step === dStep) {
            expect(part('beach')).toContain('D');
            expect(named(graph, 'fortune-circle-cancelled')).toHaveLength(1);
            expect(named(graph, 'fortune-circle-cancelled-mark')).toHaveLength(1);
            expect(document.querySelector('[data-fortune="note"]')?.textContent).toBeTruthy();
            expect(named(graph, 'fortune-circle')).toHaveLength(graph.run().view(step)?.scheduled.length ?? -1);
        }
    }
    expect(beaches.filter(b => b.endsWith('A, B, A, C, A'))).toHaveLength(1);
    // At the last step the sweep objects are gone and the finished diagram is drawn by the Voronoi drawing.
    expect(named(graph, 'fortune-circle', 'fortune-circle-cancelled', 'fortune-breakpoint')).toHaveLength(0);
    expect(beachSamples(graph)).toBe(0);
    expect(named(graph, 'voronoi-edges').length).toBeGreaterThan(0);
});

test('board object count is unchanged after 20 step changes', () => {
    const graph = new Observed();
    mount(graph);
    act(() => graph.goTo(3));
    const before = everything(graph).length;
    const handle = graph.owned().sweep!.handle;
    for (let i = 0; i < 20; i++) act(() => graph.goTo(i % 2 === 0 ? graph.run().length - 1 : (i % 5)));
    act(() => graph.goTo(3));
    expect(graph.step).toBe(3);
    expect(everything(graph).length).toBe(before);
    expect(graph.owned().sweep).toBeDefined();
    expect(graph.owned().sweep!.handle).toBe(handle);
});

test('dragging a site recomputes the trace, keeps the step index and the object count', () => {
    const graph = new Observed();
    mount(graph);
    const step = stepOfSite(graph, 3);
    act(() => graph.goTo(step));
    const before = everything(graph).length;
    const handle = graph.owned().sweep!.handle;
    const runBefore = graph.run();
    dragSite(graph, 3, 1, -3);
    expect(graph.model.points[3]).toEqual({x: 1, y: -3});
    expect(graph.run()).not.toBe(runBefore);
    expect(graph.step).toBe(step);
    expect(graph.storedStep()).toBe(step);
    expect(part('step')).toBe(`Korak ${step + 1} od ${graph.run().length}`);
    expect(part('beach')).toContain('D');
    // Dragging back restores the very same drawing: the owned objects were reused, not added to.
    dragSite(graph, 3, 0, -3);
    dragSite(graph, 3, 1, -3);
    dragSite(graph, 3, 0, -3);
    expect(graph.model).toEqual(FORTUNE_EXAMPLE_1);
    expect(graph.step).toBe(step);
    expect(everything(graph).length).toBe(before);
    expect(graph.owned().sweep!.handle).toBe(handle);
});

test('a smaller trace clamps the kept step; an example returns to step 0', () => {
    const graph = new Observed();
    mount(graph);
    const last = graph.run().length - 1;
    act(() => graph.goTo(last));
    act(() => graph.loadModel(FORTUNE_EXAMPLE_2));
    expect(graph.run().length).toBeLessThan(last + 1);
    expect(graph.step).toBe(graph.run().length - 1);
    expect(graph.storedStep()).toBe(graph.run().length - 1);
    act(() => graph.goTo(2));
    act(() => { fireEvent.click(document.querySelector('button[data-example="example-1"]') as HTMLButtonElement); });
    expect([graph.model, graph.step]).toEqual([FORTUNE_EXAMPLE_1, 0]);
});


const queueEntries = () => [...document.querySelectorAll('[data-fortune="queue"] li')] as HTMLElement[];
const live = () => document.querySelector('[data-fortune-live]')?.textContent ?? '';
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}

test('every step of the default example: beach text, one beach curve with the arcs sampled, circles and queue match the run', () => {
    const graph = new Observed();
    mount(graph);
    for (let step = 0; step < graph.run().length - 1; step++) {
        if (step > 0) click('next-step');
        const view = graph.run().view(step)!;
        expect(part('beach')).toBe(view.state.beach.length ? `Obalna črta (od leve proti desni): ${view.state.beach.map(s => String.fromCharCode(65 + s)).join(', ')}` : 'Obalna črta je še prazna.');
        expect(view.arcs).toHaveLength(view.state.beach.length);
        expect(beachSamples(graph)).toBe(view.arcs.reduce((n, arc) => n + arc.xs.length, 0));
        expect(named(graph, 'fortune-circle')).toHaveLength(view.scheduled.length);
        expect(named(graph, 'fortune-circle-cancelled')).toHaveLength(view.cancelled.length);
        expect(named(graph, 'fortune-breakpoint')).toHaveLength(view.breakpoints.length);
        expect(queueEntries().filter(li => !li.hasAttribute('data-cancelled'))).toHaveLength(view.state.sweep.queue.length);
        expect(queueEntries().filter(li => li.hasAttribute('data-cancelled'))).toHaveLength(view.cancelled.length);
        expect(part('vertices')).toBe(`Oglišča: ${view.state.vertices.length} od ${graph.run().result!.diagram.vertices.length}`);
    }
});

test('the queue shows a cancelled circle event struck through and named so in text, in both languages', () => {
    const graph = new Observed();
    mount(graph);
    const dStep = stepOfSite(graph, 3);
    for (let k = 0; k < dStep - 1; k++) click('next-step');
    expect(queueEntries().filter(li => li.hasAttribute('data-cancelled'))).toHaveLength(0);
    expect(queueEntries()[0].hasAttribute('data-next')).toBe(true);
    click('next-step');
    const cancelled = queueEntries().filter(li => li.hasAttribute('data-cancelled'));
    expect(cancelled).toHaveLength(1);
    expect(cancelled[0].querySelector('s')?.textContent).toMatch(/^krožni dogodek \(/);
    expect(cancelled[0].textContent).toContain('preklican, lažni alarm');
    expect(cancelled[0].hasAttribute('aria-label')).toBe(false);
    act(() => { setLanguage('en'); });
    const english = queueEntries().filter(li => li.hasAttribute('data-cancelled'));
    expect(english[0].textContent).toContain('cancelled, false alarm');
    expect(english[0].querySelector('s')?.textContent).toMatch(/^circle event \(/);
});

test('the live region announces the step, the event and the beach line in Slovenian and English, and is silent while playing', () => {
    const graph = new Observed();
    mount(graph);
    const dStep = stepOfSite(graph, 3);
    for (let k = 0; k < dStep - 1; k++) click('next-step');
    expect(live()).toContain(`Korak ${dStep} od ${graph.run().length}`);
    expect(live()).toContain('Obalna črta (od leve proti desni): A, B, A, C, A');
    act(() => { setLanguage('en'); });
    expect(live()).toContain(`Step ${dStep} of ${graph.run().length}`);
    expect(live()).toContain('Beach line (left to right): A, B, A, C, A');
    click('next-step');
    expect(live()).toContain('False alarm');
    act(() => { graph.play(); });
    expect(live()).toBe('');
    act(() => { graph.pause(); });
});

test('keyboard: Enter on the focused Next step button advances, and at the end the button stays focusable but aria-disabled', () => {
    const graph = new Observed();
    mount(graph);
    const next = button('next-step');
    act(() => { next.focus(); });
    expect(document.activeElement).toBe(next);
    userEvent.keyboard('{enter}');
    expect(graph.step).toBe(1);
    userEvent.keyboard(' ');
    expect(graph.step).toBe(2);
    act(() => graph.goTo(graph.run().length - 1));
    expect(next.getAttribute('aria-disabled')).toBe('true');
    expect(next.hasAttribute('disabled')).toBe(false);
    act(() => { next.focus(); });
    userEvent.keyboard('{enter}');
    expect(graph.step).toBe(graph.run().length - 1);
});

test('the finished drawing equals the Voronoi graph drawing of the same sites (same drawingStats)', () => {
    const voronoi = new VoronoiGraph();
    const first = mount(voronoi);
    act(() => { voronoi.importPresetData(serializePointSetModel(FORTUNE_EXAMPLE_1)); });
    const expected = voronoi.drawingStats();
    first.unmount();
    expect(expected).toBeDefined();
    const graph = new Observed();
    mount(graph);
    expect(graph.drawingStats()).toBeUndefined();
    act(() => graph.goTo(graph.run().length - 1));
    expect(graph.drawingStats()).toEqual(expected);
    expect(named(graph, 'voronoi-edges').length).toBeGreaterThan(0);
    // Back from the end the sweep objects return and the final drawing is gone.
    act(() => graph.goTo(2));
    expect(graph.drawingStats()).toBeUndefined();
    expect(named(graph, 'voronoi-edges')).toHaveLength(0);
});

test('ownership: scene replacement, an example, Reset and 20 step changes with a drag keep the board object count', async () => {
    const graph = new Observed();
    mount(graph);
    act(() => graph.goTo(3));
    const count = () => everything(graph).length;
    const before = count();
    const ours = () => everything(graph).filter(o => /^(fortune|voronoi)-/.test(o.name ?? '')).length;
    const oursBefore = ours();
    act(() => { graph.saveCurrentPreset('mine'); });
    await settle(() => graph.selectPreset('mine'));
    expect(graph.step).toBe(3);
    expect(count()).toBe(before);
    expect(ours()).toBe(oursBefore);
    expect(graph.owned().sweep).toBeDefined();
    for (let i = 0; i < 20; i++) act(() => graph.goTo(i % 7));
    dragSite(graph, 3, 1, -3);
    dragSite(graph, 3, 0, -3);
    act(() => graph.goTo(3));
    expect(count()).toBe(before);
    click('reset');
    act(() => graph.goTo(3));
    act(() => { fireEvent.click(document.querySelector('button[data-example="example-1"]') as HTMLButtonElement); });
    act(() => graph.goTo(3));
    expect(count()).toBe(before);
    // Scene disposal removes the objects and forgets the handles; the next sync creates new ones. No object is left behind.
    const handle = graph.owned().sweep?.handle;
    act(() => { graph['disposeFigureScene'](); });
    expect(graph.owned()).toEqual({sweep: undefined, final: undefined});
    expect(ours()).toBe(0);
    act(() => { graph['syncReplacedScene'](); });
    expect(graph.owned().sweep?.handle).not.toBe(handle);
    expect(ours()).toBe(oursBefore);
});

test('Reset view returns to the run box after a zoom; an example button restores the example sites at step 0', () => {
    const graph = new Observed();
    mount(graph);
    const board = graph.liveBoard();
    const runBox = graph.box()!;
    act(() => { board.setBoundingBox([-40, 50, 60, -50], false); });
    expect(graph.box()).not.toBe(runBox);
    click('reset-view');
    const restored = graph.box()!;
    for (const key of ['minX', 'maxX', 'minY', 'maxY'] as const) expect(restored[key].equals(runBox[key])).toBe(true);
    // The board view itself returns: it contains the run box again and is no longer the zoomed-out view.
    const [left, top, right, bottom] = board.getBoundingBox();
    expect([left, top, right, bottom]).not.toEqual([-40, 50, 60, -50]);
    expect(left).toBeLessThanOrEqual(runBox.minX.toNumber() + 1e-9);
    expect(right).toBeGreaterThanOrEqual(runBox.maxX.toNumber() - 1e-9);
    expect(bottom).toBeLessThanOrEqual(runBox.minY.toNumber() + 1e-9);
    expect(top).toBeGreaterThanOrEqual(runBox.maxY.toNumber() - 1e-9);
    act(() => { fireEvent.click(document.querySelector('button[data-example="random"]') as HTMLButtonElement); });
    expect(graph.model.points).toHaveLength(12);
    act(() => graph.goTo(4));
    act(() => { fireEvent.click(document.querySelector('button[data-example="example-1"]') as HTMLButtonElement); });
    expect([graph.model, graph.step]).toEqual([FORTUNE_EXAMPLE_1, 0]);
});

test('the view is followed: the sweep line spans the visible box and, at the end, every continues marker is inside the view by the pixel inset', () => {
    const graph = new Observed();
    mount(graph);
    const board = graph.liveBoard();
    const insetPx = 16;
    const sweepLine = () => named(graph, 'fortune-sweep-line')[0];
    act(() => graph.goTo(3));
    for (const view of [[-40, 50, 60, -50], [-3, 8, 12, -2], [1.3, 6.2, 9.7, 0.4]] as [number, number, number, number][]) {
        act(() => { board.setBoundingBox(view, false); });
        const [left, top, right, bottom] = board.getBoundingBox();
        const box = graph.box()!;
        const [minX, maxX, minY, maxY] = [box.minX, box.maxX, box.minY, box.maxY].map(v => v.toNumber());
        for (const v of [minX, maxX, minY, maxY]) expect(Number.isInteger(v)).toBe(true);
        const insetX = insetPx * (right - left) / board.canvasWidth, insetY = insetPx * (top - bottom) / board.canvasHeight;
        expect(minX).toBeGreaterThanOrEqual(left + insetX - 1e-9);
        expect(maxX).toBeLessThanOrEqual(right - insetX + 1e-9);
        expect(minY).toBeGreaterThanOrEqual(bottom + insetY - 1e-9);
        expect(maxY).toBeLessThanOrEqual(top - insetY + 1e-9);
        expect(sweepLine().dataX).toEqual([minX, maxX]);
        // the finished diagram inside the same view
        act(() => graph.goTo(graph.run().length - 1));
        const markers = named(graph, 'voronoi-continues');
        expect(markers.length).toBe(graph.drawingStats()!.continuesMarkers);
        expect(markers.length).toBeGreaterThan(0);
        for (const m of markers) {
            expect(m.X!()).toBeGreaterThanOrEqual(left + insetX - 1e-9);
            expect(m.X!()).toBeLessThanOrEqual(right - insetX + 1e-9);
            expect(m.Y!()).toBeGreaterThanOrEqual(bottom + insetY - 1e-9);
            expect(m.Y!()).toBeLessThanOrEqual(top - insetY + 1e-9);
        }
        act(() => graph.goTo(3));
    }
});

const fortuneObjects = (graph: Observed) => everything(graph).filter(o => (o.name ?? '').startsWith('fortune-'));
const refusal = () => document.querySelector('[data-fortune="refusal"]')?.textContent;

test('unmounting disposes the owned drawing handles and the fortune objects; a remount draws again', () => {
    const graph = new Observed();
    const first = mount(graph);
    act(() => graph.goTo(4));
    const board = graph.liveBoard();
    const handle = graph.owned().sweep!.handle;
    const dispose = vi.spyOn(handle, 'dispose');
    expect(fortuneObjects(graph).length).toBeGreaterThan(0);
    first.unmount();
    expect(dispose).toHaveBeenCalled();
    expect(graph.owned()).toEqual({sweep: undefined, final: undefined});
    expect((board.objectsList as Shown[]).filter(o => (o.name ?? '').startsWith('fortune-'))).toHaveLength(0);
    mount(graph);
    act(() => graph.goTo(3));
    expect(graph.owned().sweep).toBeDefined();
    expect(graph.owned().sweep!.handle).not.toBe(handle);
    expect(named(graph, 'fortune-sweep-line')).toHaveLength(1);
    click('next-step');
    expect(graph.step).toBe(4);
});

test('two coinciding sites are refused with a message naming both, in Slovenian and English; the drawing is removed and the step clamped', () => {
    const graph = new Observed();
    mount(graph);
    act(() => graph.goTo(5));
    const a = graph.model.points[0];
    dragSite(graph, 3, a.x, a.y);
    expect(graph.run().refusal?.reason).toBe('duplicate-sites');
    expect(refusal()).toBe('Mesti A in D sta enaki; premakni eno od njiju.');
    act(() => { setLanguage('en'); });
    expect(refusal()).toBe('Sites A and D coincide; move one of them.');
    expect(fortuneObjects(graph)).toHaveLength(0);
    expect(graph.owned()).toEqual({sweep: undefined, final: undefined});
    expect([graph.run().length, graph.step]).toEqual([0, 0]);
    expect(graph.storedStep()).toBe(0);
    expect(part('step')).toBeUndefined();
    // Moving the site away again restores the sweep.
    dragSite(graph, 3, 0, -3);
    expect(refusal()).toBeUndefined();
    expect(named(graph, 'fortune-sweep-line')).toHaveLength(1);
});

test('a site beyond the coordinate limit is refused naming the site and the limit', () => {
    const graph = new Observed();
    mount(graph);
    act(() => graph.loadModel({...FORTUNE_EXAMPLE_1, points: [...FORTUNE_EXAMPLE_1.points.slice(0, 3), {x: 1e9, y: 0}]}));
    expect(graph.run().refusal?.reason).toBe('out-of-range');
    expect(refusal()).toMatch(/^Mesto D ima koordinato zunaj dovoljenega območja/);
    expect(fortuneObjects(graph)).toHaveLength(0);
});

test('the live region exists while empty, and does not change during the frames of a drag', () => {
    const graph = new Observed();
    mount(graph);
    expect(document.querySelector('[data-fortune-live]')).not.toBeNull();
    act(() => graph.goTo(stepOfSite(graph, 3)));
    const heard = live();
    expect(heard).not.toBe('');
    const seen = new Set<string>();
    for (const [x, y] of [[1, -3], [3, -5], [-2, -2], [0, -3]]) {
        dragSite(graph, 3, x, y);
        seen.add(part('beach') ?? '');
        expect(live()).toBe(heard);
    }
    act(() => graph.goTo(2));
    expect(live()).not.toBe(heard);
});


// ---- Sweep S3 F6 gaps (Acc 4, Acc 5, C-1, C-2, C-5): the real controls on the Fortune graph ---------------------------------

/** A scheduler that runs a frame only when told to; `frame(ms)` advances the clock by `ms` and runs the oldest request. */
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
/** Runs the first frame after Play (it starts the clock) and `ticks` timed frames. */
function playTicks(frames: ReturnType<typeof manualScheduler>, ticks: number) {
    act(() => { frames.frame(0); });
    for (let i = 0; i < ticks; i++) act(() => { frames.frame(FORTUNE_STEP_INTERVAL_MS); });
}
const toEnd = (graph: Observed) => {
    while (button('next-step').getAttribute('aria-disabled') !== 'true') click('next-step');
    expect(graph.step).toBe(graph.run().length - 1);
};
const example = (id: string) => act(() => { fireEvent.click(document.querySelector(`button[data-example="${id}"]`) as HTMLButtonElement); });

test.each([
    ['example-1', 4, 2, 'Oglišča: 2 od 2'],
    ['example-2', 3, 1, 'Oglišča: 1 od 1'],
    ['collinear', 4, 0, 'Oglišča: 0 od 0'],
    ['cocircular', 4, 1, 'Oglišča: 1 od 1'],
    ['random', 12, undefined, undefined],
] as const)('the %s example button: step 0 after the click, then Next to the end shows the finished drawing', (id, sites, vertices, readout) => {
    const graph = new Observed();
    mount(graph);
    // Leave a later step behind: the example must return to step 0.
    click('next-step'); click('next-step');
    example(id);
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    expect(graph.model.points).toHaveLength(sites);
    expect(sitePoints(graph)).toHaveLength(sites);
    expect(part('step')).toBe(`Korak 1 od ${graph.run().length}`);
    expect(graph.drawingStats()).toBeUndefined();
    expect(graph.run().length).toBeGreaterThan(2);
    toEnd(graph);
    expect(graph.drawingStats()).toBeDefined();
    expect(named(graph, 'fortune-circle', 'fortune-circle-cancelled', 'fortune-breakpoint')).toHaveLength(0);
    const diagram = graph.run().result!.diagram;
    if (vertices !== undefined) {
        expect(diagram.vertices).toHaveLength(vertices);
        expect(part('vertices')).toBe(readout);
    } else {
        expect(diagram.vertices.length).toBeGreaterThan(0);
        expect(part('vertices')).toBe(`Oglišča: ${diagram.vertices.length} od ${diagram.vertices.length}`);
    }
    const stats = graph.drawingStats()!;
    if (id === 'collinear') {
        // Parallel lines, no vertex: three lines between four sites on one line, no segment and no ray.
        expect([stats.lines, stats.segments, stats.rays, stats.vertexMarkers]).toEqual([3, 0, 0, 0]);
    }
    if (id === 'cocircular') {
        // One Voronoi vertex of degree 4 (the centre), marked as a high-degree vertex; four rays.
        expect([stats.vertexMarkers, stats.highDegreeMarkers, stats.rays]).toEqual([1, 1, 4]);
        expect(diagram.vertices.map(v => `${v.point.x.format()},${v.point.y.format()}`)).toEqual(['0,0']);
    }
    if (id === 'example-1') expect([stats.vertexMarkers, stats.highDegreeMarkers]).toEqual([2, 0]);
});

test('the playback note says the beach line is drawn approximately, in Slovenian and English', () => {
    const graph = new Observed();
    mount(graph);
    const note = () => [...document.querySelectorAll('p.inspector-help')].map(p => p.textContent ?? '')
        .find(text => text.includes('Predvajanje') || text.includes('Playback takes'));
    expect(note()).toContain('obalna črta je narisana približno (loki parabol)');
    expect(note()).toContain('lažni alarm');
    act(() => { setLanguage('en'); });
    expect(note()).toContain('the beach line is drawn approximately (parabola arcs)');
    expect(note()).toContain('a false alarm');
});

test('C-1: dragging a site while Play runs stops playback, recomputes the trace and keeps the step', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph);
    click('play-pause');
    playTicks(frames, 2);
    expect([graph.isPlaying, graph.step]).toEqual([true, 2]);
    const before = graph.run();
    dragSite(graph, 3, 1, -3);
    expect(graph.model.points[3]).toEqual({x: 1, y: -3});
    expect(graph.run()).not.toBe(before);
    expect(graph.isPlaying).toBe(false);
    expect(button('play-pause').textContent).toBe('Predvajaj');
    expect(frames.callbacks.size).toBe(0);
    expect(graph.step).toBe(2);
    // No further tick arrives, however long the scheduler runs.
    act(() => { frames.frame(FORTUNE_STEP_INTERVAL_MS * 3); });
    act(() => { frames.frame(FORTUNE_STEP_INTERVAL_MS * 3); });
    expect([graph.step, graph.isPlaying]).toEqual([2, false]);
    // A smaller trace clamps the kept step: an edit at the last step to a three-site set.
    toEnd(graph);
    act(() => { graph.loadModel(FORTUNE_EXAMPLE_2); });
    expect([graph.isPlaying, graph.step]).toEqual([false, graph.run().length - 1]);
});

test('C-2: Reset after stepping to step 5 returns to step 0, stopped, with the example sites', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph);
    for (let i = 0; i < 5; i++) click('next-step');
    expect(graph.step).toBe(5);
    click('reset');
    expect([graph.step, graph.isPlaying, graph.storedStep()]).toEqual([0, false, 0]);
    expect(graph.model).toEqual(FORTUNE_EXAMPLE_1);
    expect(part('step')).toBe(`Korak 1 od ${graph.run().length}`);
    expect(button('reset').getAttribute('aria-disabled')).toBe('true');
    // Reset while Play runs stops it as well and no tick follows.
    click('play-pause');
    playTicks(frames, 3);
    expect([graph.isPlaying, graph.step]).toEqual([true, 3]);
    click('reset');
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    act(() => { frames.frame(FORTUNE_STEP_INTERVAL_MS); });
    expect(graph.step).toBe(0);
});

test('C-2: a Preset with a stored step beyond the trace, or beyond a shorter trace, is clamped to the last step on import', async () => {
    const graph = new Observed();
    mount(graph);
    const entry = (id: string, model: typeof FORTUNE_EXAMPLE_1, step: number) => ({id, data: serializePointSetModel(model), graphState: {step}});
    const longRun = runFortune(FORTUNE_EXAMPLE_1.points);
    const shortRun = runFortune(FORTUNE_EXAMPLE_2.points);
    expect(shortRun.length).toBeLessThan(longRun.length);
    const file = JSON.stringify({'preset-compgeo-fortune': {data: [
        entry('late', FORTUNE_EXAMPLE_1, 999),
        entry('shorter', FORTUNE_EXAMPLE_2, longRun.length - 1),
    ]}});
    commitPresetImport(preflightPresetImport(file, appStorage), appStorage);
    await settle(() => graph.selectPreset('late'));
    expect(graph.model.points).toHaveLength(4);
    expect([graph.step, graph.storedStep(), graph.isPlaying]).toEqual([longRun.length - 1, longRun.length - 1, false]);
    expect(part('step')).toBe(`Korak ${longRun.length} od ${longRun.length}`);
    expect(graph.drawingStats()).toBeDefined();
    await settle(() => graph.selectPreset('shorter'));
    expect(graph.model.points).toHaveLength(3);
    expect([graph.step, graph.storedStep()]).toEqual([shortRun.length - 1, shortRun.length - 1]);
    expect(part('step')).toBe(`Korak ${shortRun.length} od ${shortRun.length}`);
    expect(graph.isPlaying).toBe(false);
});

test('C-5: an arrow key moves the selected site by one grid step and recomputes the trace; without a selection nothing moves', () => {
    const graph = new Observed();
    mount(graph);
    const box = graph.liveBoard().containerObj as HTMLElement;
    const key = (name: string) => act(() => { fireEvent.keyDown(box, {key: name}); });
    key('ArrowRight');
    expect(graph.model).toEqual(FORTUNE_EXAMPLE_1);
    act(() => graph.select(3));
    act(() => graph.goTo(stepOfSite(graph, 3)));
    const before = graph.run();
    key('ArrowRight');
    expect(graph.model.points[3]).toEqual({x: 1, y: -3});
    expect(graph.run()).not.toBe(before);
    key('ArrowUp');
    key('ArrowUp');
    expect(graph.model.points[3]).toEqual({x: 1, y: -1});
    const fresh = runFortune(graph.model.points);
    expect(graph.run().length).toBe(fresh.length);
    expect(graph.run().result!.diagram.vertices.map(v => `${v.point.x.format()},${v.point.y.format()}`)).toEqual(fresh.result!.diagram.vertices.map(v => `${v.point.x.format()},${v.point.y.format()}`));
    expect(graph.run().result!.diagram.vertices.length).toBeGreaterThan(0);
    expect(sitePoints(graph)[3].X!()).toBe(1);
    expect(sitePoints(graph)[3].Y!()).toBe(-1);
});

test('C-5: Add at twelve sites is refused with a visible notice in both languages and adds nothing', () => {
    const graph = new Observed();
    mount(graph);
    example('random');
    expect(graph.model.points).toHaveLength(12);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj točko'})); });
    expect(graph.model.points).toHaveLength(12);
    expect(sitePoints(graph)).toHaveLength(12);
    expect(document.querySelector('[data-point-collection-reason]')!.textContent).toContain('Doseženo je največje število točk (12)');
    act(() => { setLanguage('en'); });
    expect(document.querySelector('[data-point-collection-reason]')!.textContent).toContain('maximum number of points (12)');
});

test('C-2: importPresetData of a shorter set with a stale step 999 clamps the stored step to the new last step', () => {
    const graph = new Observed();
    mount(graph);
    const shortRun = runFortune(FORTUNE_EXAMPLE_2.points);
    act(() => { graph.goTo(999); });
    act(() => { graph.importPresetData(serializePointSetModel(FORTUNE_EXAMPLE_2)); });
    expect(graph.model.points).toHaveLength(3);
    expect([graph.step, graph.storedStep(), graph.isPlaying]).toEqual([shortRun.length - 1, shortRun.length - 1, false]);
    expect(part('step')).toBe(`Korak ${shortRun.length} od ${shortRun.length}`);
});

describe('C-7: the event processed at a step is highlighted on the board and in the side list', () => {
    const CURRENT = ['fortune-current-site', 'fortune-current-circle', 'fortune-current-vertex'];
    const current = (graph: Observed) => named(graph, ...CURRENT);
    const circleSteps = (graph: Observed) =>
        Array.from({length: graph.run().length}, (_, k) => k).filter(k => graph.run().view(k)?.current?.kind === 'circle');
    const currentMarks = () => [...document.querySelectorAll('[data-fortune="current-event"] li[data-current]')] as HTMLElement[];
    const width = (o: Shown) => Number((o as unknown as JXG.GeometryElement).visProp.strokewidth ?? 0);
    const centreOf = (curve: Shown, scale: number) => {
        const [xs, ys] = [curve.dataX ?? [], curve.dataY ?? []];
        return {x: (Math.min(...xs) + Math.max(...xs)) / 2 / scale, y: (Math.min(...ys) + Math.max(...ys)) / 2 / scale};
    };

    test('step 0 and the done step highlight nothing', () => {
        const graph = new Observed();
        mount(graph);
        expect(current(graph)).toHaveLength(0);
        expect(currentMarks()).toHaveLength(0);
        act(() => graph.goTo(graph.run().length - 1));
        expect(current(graph)).toHaveLength(0);
        expect(currentMarks()).toHaveLength(0);
    });

    test('the first site-event step rings site A, and the next one rings site B', () => {
        const graph = new Observed();
        mount(graph);
        click('next-step');
        expect(graph.run().view(1)?.current).toMatchObject({kind: 'site', site: 0});
        const rings = named(graph, 'fortune-current-site');
        expect(rings).toHaveLength(1);
        expect(named(graph, 'fortune-current-circle', 'fortune-current-vertex')).toHaveLength(0);
        const a = sitePoints(graph)[0];
        expect([rings[0].X!(), rings[0].Y!()]).toEqual([a.X!(), a.Y!()]);
        click('next-step');
        const b = sitePoints(graph)[1];
        const second = named(graph, 'fortune-current-site');
        expect(second).toHaveLength(1);
        expect([second[0].X!(), second[0].Y!()]).toEqual([b.X!(), b.Y!()]);
    });

    test('the two true circle events highlight their circle and vertex, centres (-1/2, 1) then (1/2, 1)', () => {
        const graph = new Observed();
        mount(graph);
        const steps = circleSteps(graph);
        expect(steps).toHaveLength(2);
        const scale = graph.owned().sweep!.scale;
        const found: {x: number; y: number}[] = [];
        steps.forEach(step => {
            act(() => graph.goTo(step));
            const circles = named(graph, 'fortune-current-circle');
            const vertices = named(graph, 'fortune-current-vertex');
            expect([circles.length, vertices.length, named(graph, 'fortune-current-site').length]).toEqual([1, 1, 0]);
            const vertex = {x: vertices[0].X!() / scale, y: vertices[0].Y!() / scale};
            const centre = centreOf(circles[0], scale);
            expect(centre.x).toBeCloseTo(vertex.x, 9);
            expect(centre.y).toBeCloseTo(vertex.y, 9);
            found.push(vertex);
            // The highlighted circle is the thickest object of the drawing; the vertex is one of the vertices found so far.
            expect(width(circles[0])).toBe(Math.max(...everything(graph).map(width).filter(Number.isFinite)));
            expect(named(graph, 'fortune-vertex').some(v => v.X!() === vertices[0].X!() && v.Y!() === vertices[0].Y!())).toBe(true);
        });
        expect(found).toEqual([{x: -0.5, y: 1}, {x: 0.5, y: 1}]);
    });

    test('a cancelled circle keeps its dashed style while a site is ringed', () => {
        const graph = new Observed();
        mount(graph);
        act(() => graph.goTo(stepOfSite(graph, 3)));
        const dashed = named(graph, 'fortune-circle-cancelled')[0];
        expect((dashed as unknown as JXG.GeometryElement).visProp.dash).toBe(3);
        const ring = named(graph, 'fortune-current-site');
        expect(ring).toHaveLength(1);
        expect(width(ring[0])).toBeGreaterThan(width(dashed));
    });

    test('dragging a site at the circle step and back adds no board object, and dispose removes the highlight', () => {
        const graph = new Observed();
        mount(graph);
        const [step] = circleSteps(graph);
        act(() => graph.goTo(step));
        const before = everything(graph).length;
        const moves = [[1, -3], [0, -3], [1, -3], [0, -3]];
        for (const [x, y] of moves) {
            dragSite(graph, 3, x, y);
            expect(named(graph, 'fortune-current-circle').length).toBeLessThanOrEqual(1);
            expect(named(graph, 'fortune-current-vertex').length).toBeLessThanOrEqual(1);
        }
        expect(graph.model).toEqual(FORTUNE_EXAMPLE_1);
        expect(everything(graph).length).toBe(before);
        expect(current(graph)).toHaveLength(2);
        const board = graph.liveBoard();
        graph.owned().sweep!.handle.dispose();
        expect(board.objectsList.filter(o => CURRENT.includes((o as Shown).name ?? ''))).toHaveLength(0);
    });

    test('the side list marks the current event in text and aria, in Slovenian and English, besides the next one', () => {
        const graph = new Observed();
        mount(graph);
        click('next-step');
        expect(currentMarks()).toHaveLength(1);
        expect(currentMarks()[0].getAttribute('aria-current')).toBe('true');
        expect(document.querySelector('[data-fortune="current-event"] p')?.textContent).toBe('Trenutni dogodek (pravkar obdelan)');
        expect(currentMarks()[0].textContent).toContain('mesto A');
        expect(currentMarks()[0].textContent).toContain('trenutni dogodek');
        expect(queueEntries()[0].hasAttribute('data-next')).toBe(true);
        expect(queueEntries().some(li => li.hasAttribute('data-current'))).toBe(false);
        act(() => { setLanguage('en'); });
        expect(document.querySelector('[data-fortune="current-event"] p')?.textContent).toBe('Current event (just processed)');
        expect(currentMarks()[0].textContent).toContain('site A');
        expect(currentMarks()[0].textContent).toContain('current event');
        const [step] = circleSteps(graph);
        act(() => graph.goTo(step));
        expect(currentMarks()[0].textContent).toMatch(/^● circle event \(/);
        act(() => { setLanguage('sl'); });
        expect(currentMarks()[0].textContent).toMatch(/krožni dogodek \(/);
        act(() => graph.goTo(0));
        expect(currentMarks()).toHaveLength(0);
        act(() => graph.goTo(graph.run().length - 1));
        expect(currentMarks()).toHaveLength(0);
    });
});

test('Next step to the end and Play to the end give the same nonempty final drawing and panel', () => {
    const snapshot = (graph: Observed) => ({
        step: graph.step, panel: ['step', 'note', 'vertices', 'queue', 'beach'].map(part),
        drawn: everything(graph).map(o => [o.name, o.elType, o.dataX, o.dataY]),
    });
    const byNext = new Observed();
    const first = mount(byNext);
    toEnd(byNext);
    const expected = snapshot(byNext);
    first.unmount();
    expect(expected.step).toBe(byNext.run().length - 1);
    expect(expected.drawn.filter(d => d[1] === 'curve' || d[1] === 'line').length).toBeGreaterThan(0);
    expect(expected.panel[0]).toBeTruthy();

    const frames = manualScheduler();
    const byPlay = new Observed({}, frames.scheduler);
    mount(byPlay);
    click('play-pause');
    playTicks(frames, byPlay.run().length + 5);
    expect(snapshot(byPlay)).toEqual(expected);
    expect(byPlay.isPlaying).toBe(false);
});
