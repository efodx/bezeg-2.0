import React from 'react';
import {writeFileSync} from 'node:fs';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {DEFAULT_NOTABLE_MODEL, NotablePointsGraph} from './NotablePointsGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {setLanguage} from '../../localization';

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

class Observed extends NotablePointsGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; plaintext?: string; X?: () => number; Y?: () => number; coords?: {usrCoords: number[]}; Radius?: () => number};
const all = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const named = (graph: Observed, prefix: string) => all(graph).filter(o => (o.name ?? '').startsWith(prefix));
const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
type Triggerable = {triggerEventHandlers(names: string[], args: unknown[]): void};
const drag = (point: JXG.Point) => {
    const target: Triggerable = point as unknown as Triggerable;
    target.triggerEventHandlers(['drag'], []);
};
const tri = (...p: [number, number][]): PointSetModel => ({...DEFAULT_NOTABLE_MODEL, points: p.map(([x, y]) => ({x, y}))});
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
const showAllCentres = (graph: Observed) => act(() => {
    for (const id of ['triangle', 'centroid', 'circumcentre', 'incentre', 'orthocentre'] as const) graph.setOverlay(id, true);
});
const text = (selector: string) => (document.querySelector(selector)?.textContent ?? '');
const centreRow = (id: string) => document.querySelector(`[data-notable-centre="${id}"]`) as HTMLElement | null;
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

test('the default scene is the checked acute triangle with exact O and H, chip, readouts and a coordinate list', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model.points).toEqual(DEFAULT_NOTABLE_MODEL.points);
    expect(graph.pointLimit).toBe(3);
    expect(text('[data-notable-chip]')).toBe('Vrsta trikotnika: ostrokotni');
    expect(document.querySelector('[data-notable-chip]')?.getAttribute('role')).toBe('status');
    showAllCentres(graph);
    expect(centreRow('centroid')?.textContent).toBe('G = (3, 5/3), znotraj trikotnika');
    expect(centreRow('circumcentre')?.textContent).toContain('O = (7/2, 3/2)');
    expect(centreRow('orthocentre')?.textContent).toContain('H = (2, 2)');
    expect(centreRow('incentre')?.textContent).toContain('I ≈ (2,65705; 1,79891)');
    expect(text('[data-notable-readout="area"]')).toBe('Ploščina S = 35/2');
    expect(text('[data-notable-readout="R"]')).toBe('Polmer očrtane krožnice R = 3,80789');
    expect(text('[data-notable-readout="r"]')).toBe('Polmer včrtane krožnice r = 1,79891');
    const list = [...document.querySelectorAll('[data-notable-coordinates] li')].map(li => li.textContent);
    expect(list).toEqual(['A (P1) = (0, 0)', 'B (P2) = (7, 0)', 'C (P3) = (2, 5)']);
    expect(graph.exampleId).toBe('default');
    noNaN(graph);
});

test('each centre toggle draws exactly its own named construction, independent of the others, and hiding it frees the objects', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { for (const id of ['centroid', 'circumcentre', 'incentre', 'orthocentre'] as const) graph.setOverlay(id, false); });
    const base = all(graph).length;
    const expected = {
        centroid: {'centroid-median-': 3, G: 1},
        circumcentre: {'circumcentre-bisector-': 3, 'circumcentre-circle': 1, O: 1},
        incentre: {'incentre-bisector-': 3, 'incentre-circle': 1, I: 1},
        orthocentre: {'orthocentre-altitude-': 3, H: 1},
    } as const;
    for (const [id, parts] of Object.entries(expected)) {
        act(() => { graph.setOverlay(id as keyof typeof expected, true); });
        // JSXGraph adds hidden helper points for lines and circles built from coordinates, so the board grows by at least the named parts.
        const added = Object.values(parts).reduce((a, b) => a + b, 0);
        expect(all(graph).length).toBeGreaterThanOrEqual(base + added);
        for (const [prefix, count] of Object.entries(parts)) {
            expect(all(graph).filter(o => o.name === prefix || (prefix.endsWith('-') && (o.name ?? '').startsWith(prefix)))).toHaveLength(count);
        }
        for (const other of Object.keys(expected)) if (other !== id) expect(named(graph, `${other}-`)).toHaveLength(0);
        act(() => { graph.setOverlay(id as keyof typeof expected, false); });
        expect(all(graph).length).toBe(base);
    }
    showAllCentres(graph);
    expect(expectFiniteBoard(graph)).toBeGreaterThan(10);
});

test('the right and obtuse examples report the checked positions and move the construction points on the board', () => {
    const graph = new Observed();
    mount(graph);
    showAllCentres(graph);
    act(() => { graph.loadExample('obtuse'); });
    expect(graph.exampleId).toBe('obtuse');
    expect(text('[data-notable-chip]')).toBe('Vrsta trikotnika: topokotni');
    expect(centreRow('circumcentre')?.textContent).toBe('O = (7/2, −5/2), zunaj trikotnika');
    // H = (1, 6) is above the default view box (y <= 5), so the row also says so.
    expect(centreRow('orthocentre')?.textContent).toBe('H = (1, 6), zunaj trikotnika; zunaj pogleda');
    expect(centreRow('centroid')?.textContent).toBe('G = (8/3, 1/3), znotraj trikotnika');
    const o = named(graph, 'O')[0];
    expect([o.X!(), o.Y!()]).toEqual([3.5, -2.5]);
    act(() => { graph.loadExample('right'); });
    expect(text('[data-notable-chip]')).toBe('Vrsta trikotnika: pravokotni');
    expect(centreRow('circumcentre')?.textContent).toBe('O = (2, 3/2), na robu trikotnika');
    expect(centreRow('orthocentre')?.textContent).toBe('H = (0, 0), na robu trikotnika');
    expect(text('[data-notable-readout="R"]')).toContain('2,5');
    expect(text('[data-notable-readout="r"]')).toContain('= 1');
    const h = named(graph, 'H')[0];
    expect([h.X!(), h.Y!()]).toEqual([0, 0]);
});

test('a collinear or coincident triple is degenerate: no circle, altitude or bisector, the reason is shown, no NaN anywhere', () => {
    const graph = new Observed();
    mount(graph);
    showAllCentres(graph);
    const full = all(graph).length;
    for (const next of [tri([0, 0], [1, 1], [3, 3]), tri([2, 2], [2, 2], [2, 2])]) {
        load(graph, next);
        expect(text('[data-notable-chip]')).toBe('Vrsta trikotnika: izrojen');
        expect(text('[data-notable-degenerate]')).toContain('kolinearne ali sovpadajo');
        expect(document.querySelector('.notable-panel')?.getAttribute('data-notable-state')).toBe('degenerate');
        for (const id of ['circumcentre', 'incentre', 'orthocentre']) expect(centreRow(id)?.textContent).toContain('ni določena');
        expect(centreRow('centroid')?.textContent).toMatch(/^G = \(/);
        expect(named(graph, 'circumcentre-')).toHaveLength(0);
        expect(named(graph, 'incentre-')).toHaveLength(0);
        expect(named(graph, 'orthocentre-')).toHaveLength(0);
        expect(named(graph, 'O')).toHaveLength(0);
        expect(named(graph, 'G')).toHaveLength(1);
        expect(all(graph).length).toBeLessThan(full);
        expectFiniteBoard(graph);
        noNaN(graph);
    }
    act(() => { setLanguage('en'); });
    expect(text('[data-notable-degenerate]')).toContain('collinear or coincide');
    expect(text('[data-notable-chip]')).toBe('Triangle type: degenerate');
    load(graph, DEFAULT_NOTABLE_MODEL);
    expect(all(graph).length).toBe(full);
});

test('a distant circumcentre is reported "outside the view", Show all frames it, and a centre beyond the cap is never drawn', () => {
    const graph = new Observed();
    mount(graph);
    showAllCentres(graph);
    load(graph, tri([0, 0], [40, 1], [80, 3]));
    const o = named(graph, 'O')[0];
    expect(o).toBeDefined();
    expect(Math.hypot(o.X!(), o.Y!())).toBeGreaterThan(500);
    expect(centreRow('circumcentre')?.dataset.outsideView).toBe('true');
    expect(centreRow('circumcentre')?.textContent).toContain('zunaj pogleda');
    expect(named(graph, 'notable-chip')[0].plaintext).toContain('O: zunaj pogleda');
    const before = graph.liveBoard().getBoundingBox();
    expect(before[2]).toBeLessThan(o.X!() + 1e-9 + 1000);
    fireEvent.click(document.querySelector('[data-notable-show-all]')!);
    const after = graph.liveBoard().getBoundingBox();
    expect(after).not.toEqual(before);
    expect(o.X!()).toBeGreaterThanOrEqual(after[0]);
    expect(o.X!()).toBeLessThanOrEqual(after[2]);
    expect(o.Y!()).toBeLessThanOrEqual(after[1]);
    expect(o.Y!()).toBeGreaterThanOrEqual(after[3]);
    expect(centreRow('circumcentre')?.dataset.outsideView).toBe('false');
    expect(named(graph, 'notable-chip')[0].plaintext).not.toContain('zunaj pogleda');
    expectFiniteBoard(graph);

    load(graph, tri([0, 0], [1000000, 1], [2000000, 3]));
    expect(named(graph, 'O')).toHaveLength(0);
    expect(named(graph, 'circumcentre-circle')).toHaveLength(0);
    expect(named(graph, 'circumcentre-bisector-')).toHaveLength(3);
    expect(centreRow('circumcentre')?.textContent).toMatch(/^O = \(.*\/.*\), zunaj trikotnika; zunaj pogleda$|^O = \(.*\), zunaj trikotnika; zunaj pogleda$/);
    expect(text('[data-notable-too-far]')).toContain('predaleč');
    expectFiniteBoard(graph);
    noNaN(graph);
    act(() => { setLanguage('en'); });
    expect(centreRow('circumcentre')?.textContent).toContain('outside the view');
    expect(text('[data-notable-too-far]')).toContain('too far away');
});

test('vertices move by the board, the numeric fields and arrow keys; the example becomes custom, and fewer than three points say what is missing', () => {
    const graph = new Observed();
    mount(graph);
    const c = named(graph, 'P3')[0] as unknown as JXG.Point;
    act(() => { c.moveTo([2.4, 4.6], 0); drag(c); });
    expect(graph.model.points[2]).toEqual({x: 2, y: 5});
    fireEvent.change(screen.getByLabelText('Točka 3: x'), {target: {value: '1'}});
    expect(graph.model.points[2]).toEqual({x: 1, y: 5});
    expect(graph.exampleId).toBeUndefined();
    expect((document.querySelector('[data-notable-example]') as HTMLSelectElement).value).toBe('custom');
    act(() => { graph.select(2); });
    expect(text('[data-notable-chip]')).toBe('Vrsta trikotnika: ostrokotni');
    for (let i = 0; i < 4; i++) act(() => { fireEvent.keyDown(graph.liveBoard().containerObj as HTMLElement, {key: 'ArrowDown'}); });
    expect(graph.model.points[2]).toEqual({x: 1, y: 1});
    expect(text('[data-notable-chip]')).toBe('Vrsta trikotnika: topokotni');
    act(() => { expect(graph.addPointAt({x: 9, y: 9})).toBe(false); });
    load(graph, tri([0, 0], [4, 0]));
    expect(document.querySelector('.notable-panel')).toBeNull();
    expect(text('[data-notable-state="missing"]')).toContain('manjka jih: 1');
    expect(named(graph, 'centroid-')).toHaveLength(0);
    noNaN(graph);
});

test('Presets store vertices, example id and toggles; import validates, accepts collinear, and Reset restores the default', async () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadExample('right'); graph.setOverlay('orthocentre', true); graph.setOverlay('centroid', false); });
    await settle(() => graph.reset());
    expect(graph.model.points).toEqual(DEFAULT_NOTABLE_MODEL.points);
    expect(graph.exampleId).toBe('default');
    expect(graph.overlayShown('centroid')).toBe(true);
    expect(graph.overlayShown('orthocentre')).toBe(false);
    expect(named(graph, 'orthocentre-')).toHaveLength(0);
    expect(named(graph, 'G')).toHaveLength(1);
    act(() => { graph.loadExample('right'); graph.setOverlay('orthocentre', true); graph.setOverlay('centroid', false); });
    const exported = graph.exportPresetData();
    expect(exported.points).toEqual([{x: 0, y: 0}, {x: 4, y: 0}, {x: 0, y: 3}]);
    act(() => { graph.saveCurrentPreset('mine'); });
    act(() => { graph.loadExample('degenerate'); graph.setOverlay('orthocentre', false); });
    await settle(() => graph.selectPreset('mine'));
    expect(graph.model.points).toEqual(exported.points);
    expect(graph.exampleId).toBe('right');
    expect(graph.overlayShown('orthocentre')).toBe(true);
    expect(graph.overlayShown('centroid')).toBe(false);
    expect(named(graph, 'orthocentre-altitude-')).toHaveLength(3);
    expect(graph.presets()).toBe('compgeo-notable-points');

    const collection = graph.presetCollection();
    expect('data' in collection.check(tri([0, 0], [1, 1], [3, 3]))).toBe(true);
    const refused = collection.check(tri([0, 0], [1000000000, 1], [3, 3]));
    expect('rejection' in refused && refused.rejection.key).toBe('pointset_invalid_coordinate_out_of_range');
    expect('rejection' in collection.check({mode: 'points', points: [{x: 0.5, y: 0}]})).toBe(true);

});

test('the controls and the board text follow a language switch; unmount releases the language listeners', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    expect(named(graph, 'notable-chip')).toHaveLength(1);
    expect(named(graph, 'notable-chip')[0].plaintext).toBe('Vrsta trikotnika: ostrokotni');
    act(() => { setLanguage('en'); });
    expect(text('[data-notable-chip]')).toBe('Triangle type: acute');
    expect(named(graph, 'notable-chip')[0].plaintext).toBe('Triangle type: acute');
    expect(screen.getByText('Show all')).toBeInTheDocument();
    expect(text('[data-notable-readout="area"]')).toBe('Area S = 35/2');
    expect(languageListeners.live).toBeGreaterThan(0);
    view.unmount();
    expect(languageListeners.live).toBe(0);
    expect(() => act(() => { setLanguage('sl'); })).not.toThrow();
});

/** Drags vertex C over a path of snapped targets and times the whole drag step and a plain `board.update()` after each. */
function measureDrag(overlays: boolean, runs = 120) {
    const graph = new Observed();
    const view = mount(graph);
    if (overlays) showAllCentres(graph);
    else act(() => { for (const id of ['triangle', 'centroid', 'circumcentre', 'incentre', 'orthocentre'] as const) graph.setOverlay(id, false); });
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

test('a drag with every overlay on keeps the board in step and every scene object finite; timings go to NOTABLE_DRAG_OUT when set', () => {
    const on = measureDrag(true);
    const off = measureDrag(false);
    expect(on.objects).toBeGreaterThan(off.objects);
    expect(Number.isFinite(on.update[1])).toBe(true);
    // Gross-regression bound only; the real numbers are in docs/reviews/triangle-geometry/04a-drag-measurement.md.
    expect(on.update[1]).toBeLessThan(250);
    const out = process.env.NOTABLE_DRAG_OUT;
    if (out) writeFileSync(out, JSON.stringify({on, off}, null, 1));
});

test('the type chip stays on the board whatever the overlay switches say, and survives a change of the points', () => {
    const graph = new Observed();
    mount(graph, true);
    act(() => { for (const id of ['triangle', 'centroid', 'circumcentre', 'incentre', 'orthocentre'] as const) graph.setOverlay(id, false); });
    expect(named(graph, 'notable-chip')).toHaveLength(1);
    expect(named(graph, 'notable-chip')[0].plaintext).toBe('Vrsta trikotnika: ostrokotni');
    expect(named(graph, 'triangle-side-AB')).toHaveLength(0);
    act(() => { graph.setOverlay('triangle', true); });
    expect(named(graph, 'notable-chip')).toHaveLength(1);
});

test('a scene that starts with every overlay off still shows the type chip', () => {
    class AllOff extends Observed {
        override getInitialState() {
            return {...super.getInitialState(), overlays: {triangle: false, centroid: false, circumcentre: false, incentre: false, orthocentre: false}};
        }
    }
    const graph = new AllOff();
    mount(graph);
    expect(named(graph, 'triangle-side-AB')).toHaveLength(0);
    expect(named(graph, 'notable-chip')).toHaveLength(1);
    expect(named(graph, 'notable-chip')[0].plaintext).toBe('Vrsta trikotnika: ostrokotni');
});
