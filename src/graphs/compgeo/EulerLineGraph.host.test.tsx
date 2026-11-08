import React from 'react';
import {writeFileSync} from 'node:fs';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {DEFAULT_EULER_MODEL, EulerLineGraph} from './EulerLineGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {setLanguage} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';

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

class Observed extends EulerLineGraph {
    liveBoard() { return this.board; }
    /** The host Fit button. */
    fit() { this.fitToVisiblePoints(); }
}

type Shown = {elType: string; name?: string; plaintext?: string; X?: () => number; Y?: () => number; coords?: {usrCoords: number[]}; Radius?: () => number};
const all = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const named = (graph: Observed, prefix: string) => all(graph).filter(o => (o.name ?? '').startsWith(prefix));
const exactly = (graph: Observed, name: string, prefixMode: boolean) =>
    all(graph).filter(o => o.name === name || (prefixMode && (o.name ?? '').startsWith(name)));
const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
type Triggerable = {triggerEventHandlers(names: string[], args: unknown[]): void};
const drag = (point: JXG.Point) => {
    const target: Triggerable = point as unknown as Triggerable;
    target.triggerEventHandlers(['drag'], []);
};
const tri = (...p: [number, number][]): PointSetModel => ({...DEFAULT_EULER_MODEL, points: p.map(([x, y]) => ({x, y}))});
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
const ALL = ['triangle', 'centres', 'line', 'circle', 'ninepoints', 'circumcircle'] as const;
const showAllOverlays = (graph: Observed) => act(() => { for (const id of ALL) graph.setOverlay(id, true); });
const hideAllOverlays = (graph: Observed) => act(() => { for (const id of ALL) graph.setOverlay(id, false); });
const text = (selector: string) => (document.querySelector(selector)?.textContent ?? '');
const pointRow = (id: string) => document.querySelector(`[data-euler-point="${id}"]`) as HTMLElement | null;
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}
/** Every scene object has finite coordinates; a missing coordinate list is a failure, not a pass. */
function expectFiniteBoard(graph: Observed): number {
    let checked = 0;
    for (const o of all(graph)) {
        const coords = o.coords?.usrCoords;
        if (coords) { checked++; expect(coords.every(Number.isFinite), `${o.elType} ${o.name}`).toBe(true); }
        if (o.Radius) { checked++; expect(Number.isFinite(o.Radius()), `radius of ${o.name}`).toBe(true); }
    }
    return checked;
}
const noNaN = (graph: Observed) => {
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    for (const o of all(graph)) expect(o.plaintext ?? '').not.toMatch(/NaN|Infinity|undefined/);
};

test('the default scene shows the exact fractions, the exact decision, nine distinct points, the chip and the vertex list', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model.points).toEqual(DEFAULT_EULER_MODEL.points);
    expect(graph.pointLimit).toBe(3);
    expect(graph.exampleId).toBe('default');
    expect(text('[data-euler-point="h"]')).toBe('H = (2, 2)');
    expect(text('[data-euler-point="g"]')).toBe('G = (3, 5/3)');
    expect(text('[data-euler-point="o"]')).toBe('O = (7/2, 3/2)');
    expect(text('[data-euler-point="n"]')).toBe('N = (11/4, 7/4)');
    expect(text('[data-euler-readout="r2-quarter"]')).toBe('R²/4 = 29/8');
    expect(text('[data-euler-readout="hg"]')).toBe('HG ≈ 1,05409');
    expect(text('[data-euler-readout="go"]')).toBe('GO ≈ 0,52705');
    expect(text('[data-euler-relation]')).toContain('HG = 2·GO');
    expect(text('[data-euler-distinct]')).toBe('Različnih točk: 9 od 9');
    expect(text('[data-euler-chip]')).toBe('Eulerjeva premica: O, G in H so kolinearne');
    expect(named(graph, 'euler-chip')[0].plaintext).toBe('Eulerjeva premica: O, G in H so kolinearne');
    expect(document.querySelectorAll('[data-euler-coordinates] li')).toHaveLength(3);
    expect((document.querySelector('[data-euler-example] select') as HTMLSelectElement).value).toBe('default');
    noNaN(graph);
});

test('each overlay draws exactly its own named objects, independent of the others, and hiding it frees them', () => {
    const graph = new Observed();
    mount(graph);
    hideAllOverlays(graph);
    const base = all(graph).length;
    const expected: Record<string, [string, boolean, number][]> = {
        triangle: [['triangle-side-', true, 3]],
        centres: [['H', false, 1], ['G', false, 1], ['O', false, 1]],
        line: [['euler-line', false, 1]],
        circle: [['nine-point-circle', false, 1], ['N', false, 1]],
        ninepoints: [['nine-midpoint-', true, 3], ['nine-foot-', true, 3], ['nine-vertex-midpoint-', true, 3]],
        circumcircle: [['circumcircle', false, 1]],
    };
    for (const [id, parts] of Object.entries(expected)) {
        act(() => { graph.setOverlay(id as typeof ALL[number], true); });
        for (const [name, prefixMode, count] of parts) expect(exactly(graph, name, prefixMode), `${id} ${name}`).toHaveLength(count);
        for (const [other, otherParts] of Object.entries(expected)) {
            if (other === id) continue;
            for (const [name, prefixMode] of otherParts) expect(exactly(graph, name, prefixMode), `${id} leaks ${name}`).toHaveLength(0);
        }
        act(() => { graph.setOverlay(id as typeof ALL[number], false); });
        expect(all(graph).length).toBe(base);
    }
    showAllOverlays(graph);
    expect(expectFiniteBoard(graph)).toBeGreaterThan(10);
    noNaN(graph);
});

test('the Euler line passes through O, G and H on the board', () => {
    const graph = new Observed();
    mount(graph);
    const line = named(graph, 'euler-line')[0] as unknown as {stdform: number[]};
    const [c, a, b] = line.stdform;
    for (const label of ['H', 'G', 'O']) {
        const p = named(graph, label)[0];
        expect(Math.abs(c + a * p.X!() + b * p.Y!())).toBeLessThan(1e-9);
    }
});

test('examples report the checked distinct counts and the near-equilateral H, O; the degenerate one draws nothing and says why', () => {
    const graph = new Observed();
    mount(graph);
    for (const [id, count] of [['right', 5], ['isosceles', 8], ['near-equilateral', 8]] as const) {
        act(() => { graph.loadExample(id); });
        expect(text('[data-euler-distinct]')).toContain(`Različnih točk: ${count} od 9`);
        expect(graph.exampleId).toBe(id);
    }
    expect(text('[data-euler-point="h"]')).toBe('H = (4, 16/7)');
    expect(text('[data-euler-point="o"]')).toBe('O = (4, 33/14)');
    expect(text('[data-euler-readout="ho"]')).toBe('|HO| ≈ 0,07143');
    showAllOverlays(graph);
    act(() => { graph.loadExample('degenerate'); });
    expect(document.querySelector('[data-euler-state="degenerate"]')).not.toBeNull();
    expect(text('[data-euler-degenerate]')).toContain('kolinearne');
    for (const prefix of ['euler-line', 'nine-', 'circumcircle', 'H', 'G', 'O', 'N']) expect(named(graph, prefix), prefix).toHaveLength(0);
    expect(named(graph, 'triangle-side-AB')).toHaveLength(1);
    expect(named(graph, 'euler-chip')[0].plaintext).toBe('Eulerjeva premica ni določena (izrojen trikotnik)');
    noNaN(graph);
});

test('a distant point is reported "outside the view", Fit frames it, and a point beyond the cap is never drawn', () => {
    const graph = new Observed();
    mount(graph);
    showAllOverlays(graph);
    load(graph, tri([0, 0], [40, 1], [80, 3]));
    const o = named(graph, 'O')[0];
    expect(o).toBeDefined();
    expect(Math.hypot(o.X!(), o.Y!())).toBeGreaterThan(500);
    expect(pointRow('o')?.dataset.outsideView).toBe('true');
    expect(pointRow('o')?.textContent).toContain('zunaj pogleda');
    expect(named(graph, 'euler-chip')[0].plaintext).toContain('O: zunaj pogleda');
    const before = graph.liveBoard().getBoundingBox();
    act(() => { graph.fit(); });
    const after = graph.liveBoard().getBoundingBox();
    expect(after).not.toEqual(before);
    expect(o.X!()).toBeGreaterThanOrEqual(after[0]);
    expect(o.X!()).toBeLessThanOrEqual(after[2]);
    expect(pointRow('o')?.dataset.outsideView).toBe('false');
    expect(named(graph, 'euler-chip')[0].plaintext).not.toContain('zunaj pogleda');
    expectFiniteBoard(graph);

    load(graph, tri([0, 0], [1000000, 1], [2000000, 3]));
    expect(named(graph, 'O')).toHaveLength(0);
    // The Euler line is anchored on G, which always has a board place, so it is still drawn (finite, checked below).
    expect(named(graph, 'euler-line')).toHaveLength(1);
    expect(named(graph, 'circumcircle')).toHaveLength(0);
    expect(pointRow('o')?.textContent).toContain('zunaj pogleda');
    expect(text('[data-euler-too-far]')).toContain('predaleč');
    expectFiniteBoard(graph);
    noNaN(graph);
    act(() => { setLanguage('en'); });
    expect(pointRow('o')?.textContent).toContain('outside the view');
    expect(text('[data-euler-too-far]')).toContain('too far away');
});

test('vertices move by the board and the numeric fields; the example becomes custom; fewer than three points say what is missing', () => {
    const graph = new Observed();
    mount(graph);
    const c = named(graph, 'P3')[0] as unknown as JXG.Point;
    act(() => { c.moveTo([2.4, 4.6], 0); drag(c); });
    expect(graph.model.points[2]).toEqual({x: 2, y: 5});
    enterNumber(screen.getByLabelText('P3, x'), '1');
    expect(graph.model.points[2]).toEqual({x: 1, y: 5});
    expect(graph.exampleId).toBeUndefined();
    expect((document.querySelector('[data-euler-example] select') as HTMLSelectElement).value).toBe('custom');
    act(() => { expect(graph.addPointAt({x: 9, y: 9})).toBe(false); });
    load(graph, tri([0, 0], [4, 0]));
    expect(document.querySelector('.euler-panel')).toBeNull();
    expect(text('[data-euler-state="missing"]')).toContain('manjka jih: 1');
    expect(named(graph, 'euler-line')).toHaveLength(0);
    noNaN(graph);
});

test('Presets store vertices, example id and toggles; import validates, accepts collinear, and Reset restores the default', async () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadExample('right'); graph.setOverlay('ninepoints', true); graph.setOverlay('line', false); });
    await settle(() => graph.reset());
    expect(graph.model.points).toEqual(DEFAULT_EULER_MODEL.points);
    expect(graph.exampleId).toBe('default');
    expect(graph.overlayShown('line')).toBe(true);
    expect(graph.overlayShown('ninepoints')).toBe(false);
    expect(named(graph, 'nine-midpoint-')).toHaveLength(0);
    expect(named(graph, 'euler-line')).toHaveLength(1);
    act(() => { graph.loadExample('right'); graph.setOverlay('ninepoints', true); graph.setOverlay('line', false); });
    const exported = graph.exportPresetData();
    expect(exported.points).toEqual([{x: 0, y: 0}, {x: 4, y: 0}, {x: 0, y: 3}]);
    act(() => { graph.saveCurrentPreset('mine'); });
    act(() => { graph.loadExample('degenerate'); graph.setOverlay('ninepoints', false); });
    await settle(() => graph.selectPreset('mine'));
    expect(graph.model.points).toEqual(exported.points);
    expect(graph.exampleId).toBe('right');
    expect(graph.overlayShown('ninepoints')).toBe(true);
    expect(graph.overlayShown('line')).toBe(false);
    expect(named(graph, 'nine-foot-')).toHaveLength(3);
    expect(graph.presets()).toBe('compgeo-euler-line');

    const collection = graph.presetCollection();
    expect('data' in collection.check(tri([0, 0], [1, 1], [3, 3]))).toBe(true);
    const refused = collection.check(tri([0, 0], [1000000000, 1], [3, 3]));
    expect('rejection' in refused && refused.rejection.key).toBe('pointset_invalid_coordinate_out_of_range');
    expect('rejection' in collection.check({mode: 'points', points: [{x: 0.5, y: 0}]})).toBe(true);
});

test('the controls and the board text follow a language switch; unmount releases the language listeners', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    expect(named(graph, 'euler-chip')).toHaveLength(1);
    expect(named(graph, 'euler-chip')[0].plaintext).toBe('Eulerjeva premica: O, G in H so kolinearne');
    act(() => { setLanguage('en'); });
    expect(text('[data-euler-chip]')).toBe('Euler line: O, G and H are collinear');
    expect(named(graph, 'euler-chip')[0].plaintext).toBe('Euler line: O, G and H are collinear');
    expect(text('[data-euler-readout="hg"]')).toBe('HG ≈ 1.05409');
    expect(screen.getByLabelText('Triangle example')).toBeInTheDocument();
    expect(languageListeners.live).toBeGreaterThan(0);
    view.unmount();
    expect(languageListeners.live).toBe(0);
    expect(() => act(() => { setLanguage('sl'); })).not.toThrow();
});

test('the chip stays on the board whatever the overlay switches say', () => {
    const graph = new Observed();
    mount(graph, true);
    hideAllOverlays(graph);
    expect(named(graph, 'euler-chip')).toHaveLength(1);
    expect(named(graph, 'triangle-side-AB')).toHaveLength(0);
    load(graph, tri([0, 0], [6, 0], [3, 5]));
    expect(named(graph, 'euler-chip')).toHaveLength(1);
});

/** Drags vertex C over a path of snapped targets and times the whole drag step and a plain `board.update()` after each. */
function measureDrag(overlays: boolean, runs = 120) {
    const graph = new Observed();
    const view = mount(graph);
    if (overlays) showAllOverlays(graph);
    else hideAllOverlays(graph);
    const c = named(graph, 'P3')[0] as unknown as JXG.Point;
    const board = graph.liveBoard();
    const step: number[] = [];
    const update: number[] = [];
    for (let i = 0; i < runs; i++) {
        const target: [number, number] = [2 + (i % 12) - 6 + 0.2, 5 + ((i * 7) % 9) - 4 + 0.1];
        const started = performance.now();
        act(() => { c.moveTo(target, 0); drag(c); });
        step.push(performance.now() - started);
        const t0 = performance.now();
        board.update();
        update.push(performance.now() - t0);
        const model = graph.model.points[2];
        expect([c.X(), c.Y()]).toEqual([model.x, model.y]);
        if (i % 20 === 0) expectFiniteBoard(graph);
    }
    const objects = all(graph).length;
    view.unmount();
    const q = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(p * values.length))];
    return {overlays, runs, objects, step: [q(step, .5), q(step, .95)], update: [q(update, .5), q(update, .95)]};
}

test('a drag with every overlay on keeps the board in step and every scene object finite; timings go to EULER_DRAG_OUT when set', () => {
    const on = measureDrag(true);
    const off = measureDrag(false);
    expect(on.objects).toBeGreaterThan(off.objects);
    expect(Number.isFinite(on.update[1])).toBe(true);
    // Gross-regression bound only.
    expect(on.update[1]).toBeLessThan(250);
    const out = process.env.EULER_DRAG_OUT;
    if (out) writeFileSync(out, JSON.stringify({on, off}, null, 1));
});

/** What a student sees: every board object's place and size, the framing after Fit, and the inspector text. */
function seen(graph: Observed) {
    act(() => { graph.fit(); });
    // Axis ticks and their labels follow the viewport, not the triangle.
    const objects = all(graph).filter(o => !['label', 'ticks', 'axis'].includes(o.elType)).map(o => ({
        type: o.elType, name: o.name ?? '', coords: o.coords?.usrCoords, radius: o.Radius ? o.Radius() : undefined, text: o.plaintext,
    }));
    return {objects, box: graph.liveBoard().getBoundingBox(), panel: document.querySelector('.euler-panel')?.textContent};
}

test.each([[-2, 4], [-8, 256]])('a triangle on a grid of 2^%i is drawn and worded exactly like the same triangle on the unit grid', (exponent, factor) => {
    const base: [number, number][] = [[0, 0], [7, 0], [2, 5]];
    const graph = new Observed();
    mount(graph);
    showAllOverlays(graph);
    load(graph, tri(...base));
    const unit = seen(graph);
    load(graph, {...tri(...base.map(([x, y]): [number, number] => [x * factor, y * factor])), gridStepExponent: exponent});
    const fine = seen(graph);
    expect(graph.exampleId).toBe('default');
    expect(fine.objects.length).toBe(unit.objects.length);
    expect(unit.panel).toContain('3');
    expect(fine.panel).toBe(unit.panel);
    expect(fine.box).toEqual(unit.box);
    expect(fine.objects).toEqual(unit.objects);
});

test('wiring: the shared example chooser mounts and choosing an example loads it', () => {
    const graph = new Observed();
    mount(graph);
    const chooser = document.querySelector('[data-euler-example] select') as HTMLSelectElement;
    expect(chooser).not.toBeNull();
    fireEvent.change(chooser, {target: {value: 'right'}});
    expect(graph.exampleId).toBe('right');
});
