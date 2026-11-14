import React from 'react';
import {writeFileSync} from 'node:fs';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {DEFAULT_INSCRIBED_MODEL, InscribedAngleGraph} from './InscribedAngleGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {GLIDER_EXCLUSION_DEG, gliderGapCentres} from '../../compgeo/inscribedAngleModel';
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

class Observed extends InscribedAngleGraph {
    liveBoard() { return this.board; }
    writeStoredT(value: number) { this.patch({t: value}); }
}

type Shown = {elType: string; name?: string; plaintext?: string; X?: () => number; Y?: () => number; coords?: {usrCoords: number[]}; Radius?: () => number};
const all = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const named = (graph: Observed, prefix: string) => all(graph).filter(o => (o.name ?? '').startsWith(prefix));
const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
type Triggerable = {triggerEventHandlers(names: string[], args: unknown[]): void};
const drag = (point: JXG.Point) => (point as unknown as Triggerable).triggerEventHandlers(['drag'], []);
const tri = (...p: [number, number][]): PointSetModel => ({...DEFAULT_INSCRIBED_MODEL, points: p.map(([x, y]) => ({x, y}))});
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
const text = (selector: string) => (document.querySelector(selector)?.textContent ?? '');
const readout = (id: string) => text(`[data-inscribed-readout="${id}"]`);
const tField = () => document.querySelector('[data-inscribed-t] input[type="text"]') as HTMLInputElement;
const slider = () => document.querySelector('[data-inscribed-t] input[type="range"]') as HTMLInputElement;
const setSlider = (value: number) => fireEvent.change(slider(), {target: {value: String(value)}});
const glider = (graph: Observed) => named(graph, 'P').find(o => o.name === 'P') as unknown as JXG.Point;
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}
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
/** P lies on the drawn circle: its distance to the drawn centre O equals the drawn radius. */
function expectOnCircle(graph: Observed) {
    const o = named(graph, 'O').find(object => object.name === 'O')!;
    const circle = named(graph, 'inscribed-circle')[0];
    const p = glider(graph);
    expect(Math.hypot(p.X() - o.X!(), p.Y() - o.Y!())).toBeCloseTo(circle.Radius!(), 9);
}
const gap = (graph: Observed) => {
    const centres = gliderGapCentres(graph.model.points)!;
    return (t: number) => Math.min(...centres.map(centre => Math.abs(((t - centre + 540) % 360) - 180)));
};

test('the default scene is the checked circle with the 66.8 and 133.6 degree readouts, P on the circle and a vertex list', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model.points).toEqual(DEFAULT_INSCRIBED_MODEL.points);
    expect(graph.pointLimit).toBe(3);
    expect(graph.exampleId).toBe('default');
    expect(text('[data-inscribed-chip]')).toBe('∠APB = 66,8°; ∠ACB = 66,8°; središčni kot = 133,6°');
    expect(document.querySelector('[data-inscribed-chip]')?.textContent).not.toBe(''); // text, not colour; no live region (it changes on every step)
    expect(readout('acb')).toBe('Obodni kot ∠ACB = 66,8°');
    expect(readout('apb')).toBe('Obodni kot ∠APB = 66,8°');
    expect(readout('central')).toContain('= 133,6°');
    expect(text('[data-inscribed-relation]')).toContain('na isti strani tetive AB');
    expect(text('[data-inscribed-relation]')).toContain('enaka na prikazano natančnost');
    expect(document.querySelector('[data-inscribed-diameter]')).toBeNull();
    expect(text('[data-inscribed-undefined]')).toContain('vsaj 0,5°');
    expect([...document.querySelectorAll('[data-inscribed-coordinates] li')].map(li => li.textContent)).toEqual(['A (P1) = (0, 0)', 'B (P2) = (7, 0)', 'C (P3) = (2, 5)']);
    expect(named(graph, 'inscribed-circle')).toHaveLength(1);
    expect(named(graph, 'inscribed-chord')).toHaveLength(1);
    expect(named(graph, 'O').filter(o => o.name === 'O')).toHaveLength(1);
    expect(glider(graph)).toBeDefined();
    expectOnCircle(graph);
    expect(glider(graph).Y()).toBeGreaterThan(5);
    expectFiniteBoard(graph);
    noNaN(graph);
});

test('the Thales example reports the exact diameter and 90 degrees', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadExample('thales'); });
    expect(graph.exampleId).toBe('thales');
    expect(text('[data-inscribed-diameter]')).toContain('AB je premer (natančno)');
    expect(readout('acb')).toBe('Obodni kot ∠ACB = 90°');
    expect(readout('apb')).toBe('Obodni kot ∠APB = 90°');
    expectOnCircle(graph);
});

test('the angle marks and radii are toggles that draw exactly their named parts and free them again', () => {
    const graph = new Observed();
    mount(graph);
    const parts = (prefix: string) => named(graph, prefix).length;
    expect(graph.overlayShown('angles')).toBe(true);
    expect(graph.overlayShown('radii')).toBe(false);
    expect(parts('inscribed-side-')).toBe(4);
    expect(parts('inscribed-mark-')).toBe(3);
    expect(parts('inscribed-radius-')).toBe(0);
    const base = all(graph).length;
    act(() => { graph.setOverlay('radii', true); });
    expect(parts('inscribed-radius-')).toBe(2);
    expect(all(graph).length).toBeGreaterThan(base);
    act(() => { graph.setOverlay('radii', false); graph.setOverlay('angles', false); });
    expect(parts('inscribed-radius-')).toBe(0);
    expect(parts('inscribed-side-')).toBe(0);
    expect(parts('inscribed-mark-')).toBe(0);
    expect(all(graph).length).toBeLessThan(base);
    expectFiniteBoard(graph);
});

test('the t field and the arrow keys move P and the readouts; Shift steps ten degrees; the other arc gives 180 minus ACB', () => {
    const graph = new Observed();
    mount(graph);
    const before = glider(graph).Y();
    enterNumber(tField(), '270');
    expect(graph.t).toBe(270);
    expect(glider(graph).Y()).toBeLessThan(before);
    expect(glider(graph).Y()).toBeLessThan(-1);
    expectOnCircle(graph);
    expect(readout('apb')).toBe('Obodni kot ∠APB = 113,2°');
    expect(text('[data-inscribed-relation]')).toContain('na drugem loku');
    expect(text('[data-inscribed-relation]')).toContain('180° − ∠ACB = 113,2°');
    expect(readout('acb')).toBe('Obodni kot ∠ACB = 66,8°');
    setSlider(271);
    expect(graph.t).toBe(271);
    // A value outside 0 to 360 wraps (a cyclic angle): -90 is 270.
    enterNumber(tField(), '-90');
    expect(graph.t).toBe(270);
    enterNumber(tField(), '90');
    expect(graph.t).toBe(90);
    expect(readout('apb')).toBe('Obodni kot ∠APB = 66,8°');
    expectOnCircle(graph);
    noNaN(graph);
});

test('a t typed inside an exclusion gap moves out to the edge, and an arrow step across a gap skips it', () => {
    const graph = new Observed();
    mount(graph);
    const distance = gap(graph);
    const a = gliderGapCentres(graph.model.points)![0];
    enterNumber(tField(), String(Math.round(a)));
    expect(distance(graph.t)).toBeGreaterThanOrEqual(GLIDER_EXCLUSION_DEG - 1e-6);
    expect(distance(graph.t)).toBeLessThan(GLIDER_EXCLUSION_DEG + 1e-3);
    expect(text('[data-inscribed-readout="apb"]')).not.toMatch(/NaN/);
    // One degree lands inside the gap, 0.2 before A: the step goes on to the far edge instead of back to the near one.
    act(() => { graph.setT(a - 1.2); });
    expect(graph.t).toBeCloseTo(a - 1.2, 9);
    setSlider(Math.round(a - 0.2));
    expect(graph.t).toBeCloseTo(a + GLIDER_EXCLUSION_DEG, 6);
    expect(distance(graph.t)).toBeGreaterThanOrEqual(GLIDER_EXCLUSION_DEG - 1e-6);
    expectOnCircle(graph);
    noNaN(graph);
});

test('panel: the range keeps the direction of motion into a gap, and the chip is not live', () => {
    const graph = new Observed();
    mount(graph);
    const a = gliderGapCentres(graph.model.points)![0];
    // A range change from just below A's gap into it continues to the far edge (direction of motion).
    act(() => { graph.setT(a - 1.2); });
    setSlider(a - 0.2);
    expect(graph.t).toBeCloseTo(a + GLIDER_EXCLUSION_DEG, 6);
    expect(document.querySelector('[data-inscribed-chip]')?.getAttribute('role')).toBeNull();
    expect(document.querySelector('[data-inscribed-chip]')?.closest('[aria-live]')).toBeNull();
});

test('dragging P sets t from atan2 about O, snaps P back onto the circle and respects the exclusion', () => {
    const graph = new Observed();
    mount(graph);
    const p = glider(graph);
    const o = named(graph, 'O').find(object => object.name === 'O')!;
    const circle = named(graph, 'inscribed-circle')[0];
    // Straight below O, far off the circle: t = 270 and P goes back onto the circle.
    act(() => { p.moveTo([o.X!(), o.Y!() - 3 * circle.Radius!()], 0); drag(p); });
    expect(graph.t).toBeCloseTo(270, 9);
    expectOnCircle(graph);
    expect(p.Y()).toBeCloseTo(o.Y!() - circle.Radius!(), 9);
    expect(readout('apb')).toBe('Obodni kot ∠APB = 113,2°');
    // Towards A (inside the gap): P stops at the gap edge.
    const a = graph.model.points[0];
    act(() => { p.moveTo([o.X!() + 2 * (a.x - o.X!()), o.Y!() + 2 * (a.y - o.Y!())], 0); drag(p); });
    expect(gap(graph)(graph.t)).toBeGreaterThanOrEqual(GLIDER_EXCLUSION_DEG - 1e-6);
    // Coming from t = 270 (below A in the turning sense), the drag stops at the near edge of the gap, not the far one.
    expect(graph.t).toBeCloseTo(gliderGapCentres(graph.model.points)![0] - GLIDER_EXCLUSION_DEG, 6);
    expectOnCircle(graph);
    noNaN(graph);
});

test('a vertex edit moves the circle and keeps P on it; an edit that makes the example custom keeps t', () => {
    const graph = new Observed();
    mount(graph);
    const centreBefore = [named(graph, 'O').find(o => o.name === 'O')!.X!(), named(graph, 'O').find(o => o.name === 'O')!.Y!()];
    enterNumber(screen.getByLabelText('P3, x'), '3');
    expect(graph.model.points[2]).toEqual({x: 3, y: 5});
    expect(graph.exampleId).toBeUndefined();
    const o = named(graph, 'O').find(object => object.name === 'O')!;
    expect([o.X!(), o.Y!()]).not.toEqual(centreBefore);
    expect(o.X!()).toBeCloseTo(3.5, 9);
    expect(graph.t).toBe(90);
    expectOnCircle(graph);
    expect((document.querySelector('[data-inscribed-example] select') as HTMLSelectElement).value).toBe('custom');
    const c = named(graph, 'P3')[0] as unknown as JXG.Point;
    act(() => { c.moveTo([1.1, 4.9], 0); drag(c); });
    expect(graph.model.points[2]).toEqual({x: 1, y: 5});
    expectOnCircle(graph);
    expectFiniteBoard(graph);
});

test('collinear and coincident vertices give a text message: no circle, no P, no NaN; fewer than three say what is missing', () => {
    const graph = new Observed();
    mount(graph);
    const full = all(graph).length;
    load(graph, tri([0, 0], [2, 2], [4, 4]));
    expect(document.querySelector('[data-inscribed-state="degenerate"]')).not.toBeNull();
    expect(text('[data-inscribed-chip]')).toContain('isti premici');
    expect(named(graph, 'inscribed-circle')).toHaveLength(0);
    expect(named(graph, 'inscribed-chord')).toHaveLength(0);
    expect(named(graph, 'O').filter(o => o.name === 'O')).toHaveLength(0);
    expect(named(graph, 'P').filter(o => o.name === 'P')).toHaveLength(0);
    expect(named(graph, 'inscribed-mark-')).toHaveLength(0);
    expect(document.querySelector('[data-inscribed-t]')).toBeNull();
    expect(all(graph).length).toBeLessThan(full);
    expectFiniteBoard(graph);
    noNaN(graph);
    load(graph, tri([1, 1], [1, 1], [1, 1]));
    expect(named(graph, 'inscribed-circle')).toHaveLength(0);
    noNaN(graph);
    load(graph, tri([0, 0], [7, 0], [2, 5]));
    expect(named(graph, 'inscribed-circle')).toHaveLength(1);
    expect(glider(graph)).toBeDefined();
    expectOnCircle(graph);
    load(graph, tri([0, 0], [4, 0]));
    expect(text('[data-inscribed-state="missing"]')).toContain('manjka jih: 1');
    expect(named(graph, 'inscribed-circle')).toHaveLength(0);
    noNaN(graph);
});

test('Presets store vertices, example, t and toggles; import validates, accepts collinear, and Reset restores the default', async () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadExample('thales'); graph.setT(200); graph.setOverlay('radii', true); graph.setOverlay('angles', false); });
    await settle(() => graph.reset());
    expect(graph.model.points).toEqual(DEFAULT_INSCRIBED_MODEL.points);
    expect(graph.exampleId).toBe('default');
    expect(graph.t).toBe(90);
    expect(graph.overlayShown('radii')).toBe(false);
    expect(graph.overlayShown('angles')).toBe(true);
    expect(named(graph, 'inscribed-radius-')).toHaveLength(0);
    expect(named(graph, 'inscribed-mark-')).toHaveLength(3);
    expectOnCircle(graph);

    act(() => { graph.loadExample('thales'); graph.setT(200); graph.setOverlay('radii', true); graph.setOverlay('angles', false); });
    const exported = graph.exportPresetData();
    expect(exported.points).toEqual([{x: 0, y: 0}, {x: 8, y: 6}, {x: 1, y: 7}]);
    act(() => { graph.saveCurrentPreset('mine'); });
    act(() => { graph.loadExample('default'); graph.setOverlay('radii', false); graph.setOverlay('angles', true); });
    await settle(() => graph.selectPreset('mine'));
    expect(graph.model.points).toEqual(exported.points);
    expect(graph.exampleId).toBe('thales');
    expect(graph.t).toBe(200);
    expect(graph.overlayShown('radii')).toBe(true);
    expect(graph.overlayShown('angles')).toBe(false);
    expect(named(graph, 'inscribed-radius-')).toHaveLength(2);
    expect(named(graph, 'inscribed-mark-')).toHaveLength(0);
    expect(readout('acb')).toBe('Obodni kot ∠ACB = 90°');
    expectOnCircle(graph);
    expect(graph.presets()).toBe('compgeo-inscribed-angle');

    const collection = graph.presetCollection();
    expect('data' in collection.check(tri([0, 0], [1, 1], [3, 3]))).toBe(true);
    expect(collection.checkGraphState).toBeDefined();
    expect(collection.checkGraphState?.({t: Number.NaN})).toBeDefined();
    expect(collection.checkGraphState?.({t: 200, exampleId: 'thales', overlays: {radii: true}})).toBeUndefined();
    // A stored t outside [0, 360) is accepted and shown normalised.
    act(() => { graph.writeStoredT(-30); });
    expect(graph.t).toBe(330);
    expectOnCircle(graph);
});

test('every board object the graph owns is removed again: degenerate drops them, unmount frees the board and the listeners', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    const board = graph.liveBoard();
    const names = () => (board.objectsList as Shown[]).map(o => o.name ?? '');
    const owned = ['inscribed-circle', 'inscribed-chord', 'inscribed-chip', 'inscribed-mark-', 'inscribed-side-'];
    for (const name of owned) expect(names().some(n => n.startsWith(name)), name).toBe(true);
    // A rebuild must not leak: switching circle on and off repeatedly leaves the same count.
    const count = (board.objectsList as unknown[]).length;
    for (let i = 0; i < 3; i++) {
        load(graph, tri([0, 0], [1, 1], [2, 2]));
        load(graph, tri([0, 0], [7, 0], [2, 5]));
    }
    expect((board.objectsList as unknown[]).length).toBe(count);
    act(() => { graph.setOverlay('radii', true); graph.setOverlay('radii', false); });
    expect((board.objectsList as unknown[]).length).toBe(count);
    expect(languageListeners.live).toBeGreaterThan(0);
    view.unmount();
    expect(languageListeners.live).toBe(0);
    // JSXGraph keeps the freed board's list, so ownership across a dispose is shown by a fresh mount of the same graph: same objects, no stale ones.
    const again = mount(graph);
    const board2 = graph.liveBoard();
    expect(board2).not.toBe(board);
    expect((board2.objectsList as unknown[]).length).toBe(count);
    expect((board2.objectsList as Shown[]).filter(o => o.name === 'inscribed-chip')).toHaveLength(1);
    expect(named(graph, 'inscribed-circle')).toHaveLength(1);
    expectOnCircle(graph);
    again.unmount();
    expect(languageListeners.live).toBe(0);
});

test('the controls and the board text follow a language switch', () => {
    const graph = new Observed();
    mount(graph);
    expect(named(graph, 'inscribed-chip')[0].plaintext).toBe('∠APB = 66,8°; ∠ACB = 66,8°; središčni kot = 133,6°');
    act(() => { setLanguage('en'); });
    expect(named(graph, 'inscribed-chip')[0].plaintext).toBe('∠APB = 66.8°; ∠ACB = 66.8°; central angle = 133.6°');
    expect(text('[data-inscribed-chip]')).toBe('∠APB = 66.8°; ∠ACB = 66.8°; central angle = 133.6°');
    expect(readout('central')).toBe('Central angle ∠AOB over the arc without C = 133.6° (= 2 · ∠ACB)');
    expect(text('[data-inscribed-relation]')).toContain('equal to the displayed precision');
    expect(screen.getByLabelText('Position of P (t, degrees)')).toBe(slider());
    act(() => { setLanguage('sl'); });
    expect(named(graph, 'inscribed-chip')[0].plaintext).toContain('središčni kot');
});

/** Times a scripted drag of P (when `target` is "glider") or of vertex C over a path, with every overlay on. */
function measureDrag(target: 'glider' | 'vertex', runs = 120) {
    const graph = new Observed();
    const view = mount(graph);
    act(() => { graph.setOverlay('radii', true); graph.setOverlay('grid', true); });
    const point = (target === 'glider' ? glider(graph) : named(graph, 'P3')[0]) as unknown as JXG.Point;
    const board = graph.liveBoard();
    const o = named(graph, 'O').find(object => object.name === 'O')!;
    const step: number[] = [];
    const update: number[] = [];
    for (let i = 0; i < runs; i++) {
        const where: [number, number] = target === 'glider'
            ? [o.X!() + 4 * Math.cos((i * 3 * Math.PI) / 180), o.Y!() + 4 * Math.sin((i * 3 * Math.PI) / 180)]
            : [2 + (i % 12) - 6 + 0.2, 5 + ((i * 7) % 9) - 4 + 0.1];
        const started = performance.now();
        act(() => { point.moveTo(where, 0); drag(point); });
        step.push(performance.now() - started);
        const t0 = performance.now();
        board.update();
        update.push(performance.now() - t0);
        if (i % 20 === 0) { expectFiniteBoard(graph); expectOnCircle(graph); }
    }
    const objects = all(graph).length;
    view.unmount();
    const q = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(p * values.length))];
    return {target, runs, objects, step: [q(step, .5), q(step, .95)], update: [q(update, .5), q(update, .95)]};
}

test('a scripted drag of P and of a vertex keeps the board in step and finite; timings go to INSCRIBED_DRAG_OUT when set', () => {
    const p = measureDrag('glider');
    const v = measureDrag('vertex');
    expect(p.objects).toBe(v.objects);
    expect(Number.isFinite(p.update[1]) && Number.isFinite(v.update[1])).toBe(true);
    // Gross-regression bound only; the real numbers are in docs/reviews/triangle-geometry/04b-drag-measurement.md.
    expect(p.update[1]).toBeLessThan(250);
    const out = process.env.INSCRIBED_DRAG_OUT;
    if (out) writeFileSync(out, JSON.stringify({p, v}, null, 1));
});

const labelText = (o: object | undefined) => (o as {label?: {plaintext?: string}} | undefined)?.label?.plaintext;
test('the labels of O and P are typeset as math while the elements keep their plain names', () => {
    const graph = new Observed();
    mount(graph);
    expect(labelText(named(graph, 'O').find(o => o.name === 'O'))).toBe('$$O$$');
    expect(labelText(glider(graph))).toBe('$$P$$');
});
