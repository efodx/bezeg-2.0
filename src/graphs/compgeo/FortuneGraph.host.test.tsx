import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {FortuneGraph} from './FortuneGraph';
import {FORTUNE_EXAMPLE_1, FORTUNE_EXAMPLE_2} from './fortunePresetCollection';
import {VoronoiGraph} from './VoronoiGraph';
import {serializePointSetModel} from '../../compgeo/pointSetModel';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';

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
