import React from 'react';
import {writeFileSync} from 'node:fs';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {DEFAULT_SIMSON_MODEL, SimsonLineGraph} from './SimsonLineGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {SIMSON_OFFSETS} from '../../compgeo/simsonLineModel';
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

class Observed extends SimsonLineGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; plaintext?: string; X?: () => number; Y?: () => number; coords?: {usrCoords: number[]}; Radius?: () => number};
const all = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const named = (graph: Observed, prefix: string) => all(graph).filter(o => (o.name ?? '').startsWith(prefix));
const exact = (graph: Observed, name: string) => all(graph).filter(o => o.name === name);
const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
type Triggerable = {triggerEventHandlers(names: string[], args: unknown[]): void};
const drag = (point: JXG.Point) => {
    const target: Triggerable = point as unknown as Triggerable;
    target.triggerEventHandlers(['drag'], []);
};
const tri = (...p: [number, number][]): PointSetModel => ({...DEFAULT_SIMSON_MODEL, points: p.map(([x, y]) => ({x, y}))});
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
const ALL = ['triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'simson', 'pedal'] as const;
const showAllOverlays = (graph: Observed) => act(() => { for (const id of ALL) graph.setOverlay(id, true); });
const hideAllOverlays = (graph: Observed) => act(() => { for (const id of ALL) graph.setOverlay(id, false); });
const text = (selector: string) => (document.querySelector(selector)?.textContent ?? '');
const field = (selector: string) => document.querySelector(selector) as HTMLInputElement;
const select = (selector: string) => field(`${selector} select`);
const range = (selector: string) => field(`${selector} input[type="range"]`);
const typed = (selector: string) => field(`${selector} input[type="text"]`);
const statusOf = () => document.querySelector('[data-simson-state][data-simson-status]')?.getAttribute('data-simson-status');
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
const pointOf = (graph: Observed, name: string) => exact(graph, name)[0] as unknown as JXG.Point;
const O = {x: 3.5, y: 1.5};
const R = Math.sqrt(14.5);

test('the default scene is the glider on the circle: chip, rows, area tolerance, named objects, the Simson line and no foot triangle', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model.points).toEqual(DEFAULT_SIMSON_MODEL.points);
    expect(graph.pointLimit).toBe(3);
    expect(graph.exampleId).toBe('default');
    expect(graph.settings).toEqual({mode: 'glider', t: 60, epsilon: 0, pPrime: {x: 2, y: -2}});
    expect(text('[data-simson-chip]')).toBe('Nožišča D, E, F: kolinearna');
    expect(exact(graph, 'simson-chip')[0].plaintext).toBe(text('[data-simson-chip]'));
    expect(text('[data-simson-readout="circle"]')).toBe('O = (7/2, 3/2), R² = 29/2');
    expect(text('[data-simson-readout="area"]')).toBe('Ploščina nožiščnega trikotnika / S = 0');
    expect(statusOf()).toBe('collinear-within');
    for (const name of ['P', 'D', 'E', 'F', 'O', 'circumcircle', 'simson-line']) expect(exact(graph, name), name).toHaveLength(1);
    expect(exact(graph, 'pedal-triangle')).toHaveLength(0);
    expect(named(graph, 'sideline-')).toHaveLength(3);
    expect(named(graph, 'perpendicular-')).toHaveLength(3);
    expect(named(graph, 'triangle-side-')).toHaveLength(3);
    for (const language of ['sl', 'en'] as const) {
        act(() => { setLanguage(language); });
        for (const selector of ['[data-simson-chip]', '[data-simson-readout="area"]']) {
            // Owner decision 2026-11-02 (spec T4 acceptance 2): plain "collinear" and area 0, with no tolerance or exactness qualifier.
            expect(text(selector), `${language} ${selector}`).not.toMatch(/10⁻⁹|within|znotraj|exactly|natančno/i);
        }
        expect(text('[data-simson-chip]')).toBe(language === 'sl' ? 'Nožišča D, E, F: kolinearna' : 'Feet D, E, F: collinear');
        expect(text('[data-simson-readout="area"]')).toBe(language === 'sl' ? 'Ploščina nožiščnega trikotnika / S = 0' : 'Area of the foot triangle / S = 0');
    }
    act(() => { setLanguage('sl'); });
    noNaN(graph);
    expectFiniteBoard(graph);
});

test('each overlay draws exactly its own named objects, independent of the others, and hiding it frees them', () => {
    const graph = new Observed();
    mount(graph);
    // Off the circle so that both the foot triangle and (by switching) the line can be shown.
    act(() => { graph.setEpsilon(0.2); });
    hideAllOverlays(graph);
    const base = all(graph).length;
    const expected: Record<string, [string, boolean, number][]> = {
        triangle: [['triangle-side-', true, 3]],
        sidelines: [['sideline-', true, 3]],
        circumcircle: [['circumcircle', false, 1], ['O', false, 1]],
        perpendiculars: [['perpendicular-', true, 3]],
        pedal: [['pedal-triangle', false, 1]],
    };
    for (const [id, parts] of Object.entries(expected)) {
        act(() => { graph.setOverlay(id as typeof ALL[number], true); });
        for (const [name, prefix, count] of parts) {
            const found = prefix ? named(graph, name) : exact(graph, name);
            expect(found, `${id} ${name}`).toHaveLength(count);
        }
        for (const [other, otherParts] of Object.entries(expected)) {
            if (other === id) continue;
            for (const [name, prefix] of otherParts) {
                // O is shared by no other overlay; names are unique per overlay.
                expect(prefix ? named(graph, name) : exact(graph, name), `${id} leaks ${name}`).toHaveLength(0);
            }
        }
        act(() => { graph.setOverlay(id as typeof ALL[number], false); });
        expect(all(graph).length, `${id} hidden`).toBe(base);
    }
    // The Simson line exists only while the feet are collinear.
    act(() => { graph.setOverlay('simson', true); });
    expect(exact(graph, 'simson-line')).toHaveLength(0);
    act(() => { graph.setEpsilon(0); });
    expect(exact(graph, 'simson-line')).toHaveLength(1);
    showAllOverlays(graph);
    expect(exact(graph, 'pedal-triangle')).toHaveLength(0);
    noNaN(graph);
    expectFiniteBoard(graph);
});

test('the foot triangle is drawn exactly when the feet are not collinear, in both modes', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.setEpsilon(0.001); });
    expect(exact(graph, 'pedal-triangle')).toHaveLength(1);
    expect(exact(graph, 'simson-line')).toHaveLength(0);
    act(() => { graph.setMode('exact'); graph.setPPrime({x: 6, y: 4}); });
    expect(exact(graph, 'pedal-triangle')).toHaveLength(1);
    expect(exact(graph, 'simson-line')).toHaveLength(0);
    act(() => { graph.setPPrime({x: 5, y: 5}); });
    expect(exact(graph, 'pedal-triangle')).toHaveLength(0);
    expect(exact(graph, 'simson-line')).toHaveLength(1);
});

test('Reset restores the default scene: glider, t = 60, no offset, default example and every overlay on', async () => {
    const graph = new Observed();
    mount(graph);
    act(() => {
        graph.loadExample('grid-off-circle'); graph.setT(200); graph.setEpsilon(0.05); graph.setOverlay('simson', false); graph.setOverlay('pedal', false);
    });
    expect(graph.settings.mode).toBe('exact');
    await settle(() => graph.reset());
    expect(graph.model.points).toEqual(DEFAULT_SIMSON_MODEL.points);
    expect(graph.settings).toEqual({mode: 'glider', t: 60, epsilon: 0, pPrime: {x: 2, y: -2}});
    expect(graph.exampleId).toBe('default');
    expect(graph.overlayShown('simson')).toBe(true);
    expect(graph.overlayShown('pedal')).toBe(true);
    expect(exact(graph, 'simson-line')).toHaveLength(1);
    expect(text('[data-simson-state]')).not.toBe('');
    expect(statusOf()).toBe('collinear-within');
});

test('Presets restore the vertices, mode, t, epsilon, P-prime, example and overlays; import validates and accepts collinear', async () => {
    const graph = new Observed();
    mount(graph);
    act(() => {
        graph.loadExample('grid-off-circle'); graph.setT(211.5); graph.setEpsilon(-0.05); graph.setOverlay('sidelines', false); graph.setOverlay('perpendiculars', false);
    });
    const exported = graph.exportPresetData();
    expect(exported.points).toEqual(DEFAULT_SIMSON_MODEL.points);
    const state = graph.exportPreset().graphState as unknown as Record<string, unknown>;
    expect(state).toMatchObject({mode: 'exact', t: 211.5, epsilon: -0.05, pPrime: {x: 6, y: 4}, exampleId: 'grid-off-circle'});
    expect('model' in state).toBe(false);
    expect(graph.presetCollection().checkGraphState!(state)).toBeUndefined();
    act(() => { graph.saveCurrentPreset('mine'); });
    act(() => {
        graph.loadModel(tri([0, 0], [4, 0], [0, 3])); graph.setMode('glider'); graph.setT(10); graph.setEpsilon(0); graph.setPPrime({x: 0, y: 0});
        graph.setOverlay('sidelines', true); graph.setOverlay('perpendiculars', true);
    });
    await settle(() => graph.selectPreset('mine'));
    expect(graph.model.points).toEqual(exported.points);
    expect(graph.settings).toEqual({mode: 'exact', t: 211.5, epsilon: -0.05, pPrime: {x: 6, y: 4}});
    expect(graph.exampleId).toBe('grid-off-circle');
    expect(graph.overlayShown('sidelines')).toBe(false);
    expect(graph.overlayShown('perpendiculars')).toBe(false);
    expect(named(graph, 'sideline-')).toHaveLength(0);
    expect(named(graph, 'perpendicular-')).toHaveLength(0);
    expect(statusOf()).toBe('not-collinear');
    expect(graph.presets()).toBe('compgeo-simson-line');
    const collection = graph.presetCollection();
    expect('data' in collection.check(tri([0, 0], [1, 1], [3, 3]))).toBe(true);
    expect('rejection' in collection.check(tri([0, 0], [1000000000, 1], [3, 3]))).toBe(true);
});

test('every board object is removed again: a mode switch and degenerate round trips leave the count, unmount frees the board and the listeners', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    const board = graph.liveBoard();
    const count = () => (board.objectsList as unknown[]).length;
    const start = count();
    expect(start).toBeGreaterThan(15);
    for (const name of ['P', 'D', 'E', 'F', 'simson-chip', 'circumcircle']) expect(exact(graph, name), name).toHaveLength(1);
    for (let i = 0; i < 3; i++) {
        act(() => { graph.setMode('exact'); });
        expect(count(), 'exact').toBe(start);
        expect(exact(graph, 'P′')).toHaveLength(1);
        expect(exact(graph, 'P')).toHaveLength(0);
        act(() => { graph.setMode('glider'); });
        expect(count(), 'glider').toBe(start);
        expect(exact(graph, 'P')).toHaveLength(1);
    }
    for (let i = 0; i < 3; i++) {
        load(graph, tri([0, 0], [1, 1], [2, 2]));
        expect(exact(graph, 'P')).toHaveLength(0);
        expect(exact(graph, 'D')).toHaveLength(0);
        expect(exact(graph, 'simson-chip')).toHaveLength(1);
        load(graph, tri([0, 0], [7, 0], [2, 5]));
    }
    expect(count()).toBe(start);
    act(() => { ALL.forEach(id => graph.setOverlay(id, false)); ALL.forEach(id => graph.setOverlay(id, true)); });
    expect(count()).toBe(start);
    expect(languageListeners.live).toBeGreaterThan(0);
    view.unmount();
    expect(languageListeners.live).toBe(0);
    // JSXGraph keeps the freed board's list, so ownership across a dispose is shown by a fresh mount of the same graph: same objects, no stale ones.
    const again = mount(graph);
    const board2 = graph.liveBoard();
    expect(board2).not.toBe(board);
    expect((board2.objectsList as unknown[]).length).toBe(start);
    expect((board2.objectsList as Shown[]).filter(o => o.name === 'simson-chip')).toHaveLength(1);
    again.unmount();
    expect(languageListeners.live).toBe(0);
});

test('the mode control switches in both directions, with P named P or P-prime and the matching controls', () => {
    const graph = new Observed();
    mount(graph);
    const modeSelect = select('[data-simson-mode]');
    expect(modeSelect.value).toBe('glider');
    expect(field('[data-simson-t]')).not.toBeNull();
    expect(field('[data-simson-epsilon]')).not.toBeNull();
    expect(document.querySelector('[data-simson-readout="power"]')).toBeNull();
    fireEvent.change(modeSelect, {target: {value: 'exact'}});
    expect(graph.settings.mode).toBe('exact');
    expect(text('[data-simson-state]')).toContain('P′ = (2, −2)');
    expect(field('[data-simson-t]')).toBeNull();
    expect(field('[data-simson-epsilon]')).toBeNull();
    expect(screen.getByLabelText('P′: x')).toBeInTheDocument();
    expect(text('[data-simson-readout="power"]')).toBe('Potenca točke P′ na očrtano krožnico = 0');
    expect(statusOf()).toBe('collinear-exact');
    expect(text('[data-simson-chip]')).toBe('Nožišča D, E, F: kolinearna (natančno)');
    expect(graph.exampleId).toBeUndefined();
    fireEvent.change(modeSelect, {target: {value: 'glider'}});
    expect(graph.settings.mode).toBe('glider');
    expect(field('[data-simson-t]')).not.toBeNull();
    expect(graph.exampleId).toBe('default');
    expect(statusOf()).toBe('collinear-within');
    noNaN(graph);
});

test('the t field and the arrow keys move P along the circle and update the readouts', () => {
    const graph = new Observed();
    mount(graph);
    const distance = () => { const p = pointOf(graph, 'P'); return Math.hypot(p.X() - O.x, p.Y() - O.y); };
    const angle = () => { const p = pointOf(graph, 'P'); return (Math.atan2(p.Y() - O.y, p.X() - O.x) * 180 / Math.PI + 360) % 360; };
    expect(angle()).toBeCloseTo(60, 6);
    expect(distance()).toBeCloseTo(R, 9);
    const before = text('[data-simson-point="d"]');
    enterNumber(typed('[data-simson-t]'), '200');
    expect(graph.settings.t).toBe(200);
    expect(angle()).toBeCloseTo(200, 6);
    expect(distance()).toBeCloseTo(R, 9);
    expect(text('[data-simson-point="d"]')).not.toBe(before);
    expect(typed('[data-simson-t]').value).toBe('200');
    const slider = range('[data-simson-t]');
    fireEvent.change(slider, {target: {value: '201'}});
    expect(graph.settings.t).toBe(201);
    fireEvent.keyDown(slider, {key: 'ArrowLeft', shiftKey: true});
    expect(graph.settings.t).toBe(191);
    expect(angle()).toBeCloseTo(191, 6);
    expect(text('[data-simson-point="p"]')).toContain('P ≈ (');
    // A value outside 0 to 360 wraps (a cyclic angle); 360 is the same angle as 0 (t is normalised to [0, 360)).
    enterNumber(typed('[data-simson-t]'), '-5');
    expect(graph.settings.t).toBe(355);
    enterNumber(typed('[data-simson-t]'), '360');
    expect(graph.settings.t).toBe(0);
    expect(statusOf()).toBe('collinear-within');
    noNaN(graph);
});

test('dragging P on the board sets t by the angle about O in glider mode and snaps P-prime to the grid in exact mode', () => {
    const graph = new Observed();
    mount(graph);
    const p = pointOf(graph, 'P');
    act(() => { p.moveTo([O.x - 2 * R, O.y], 0); drag(p); });
    expect(graph.settings.t).toBeCloseTo(180, 6);
    expect(Math.hypot(p.X() - O.x, p.Y() - O.y)).toBeCloseTo(R, 9);
    act(() => { graph.setMode('exact'); });
    const q = pointOf(graph, 'P′');
    act(() => { q.moveTo([3.4, 1.6], 0); drag(q); });
    expect(graph.settings.pPrime).toEqual({x: 3, y: 2});
    expect([q.X(), q.Y()]).toEqual([3, 2]);
    expect(text('[data-simson-readout="power"]')).toBe('Potenca točke P′ na očrtano krožnico = −14');
    expect(statusOf()).toBe('not-collinear');
});

test('every offset stop changes the status as specified: plain collinear at 0, not collinear at every other stop, with the readout', () => {
    const graph = new Observed();
    mount(graph);
    const slider = range('[data-simson-epsilon]');
    expect(slider.value).toBe('4');
    const ratios: Record<string, string> = {'0.001': '5,0·10⁻⁴', '0.01': '5,0·10⁻³', '0.05': '0,02563', '0.2': '0,11'};
    SIMSON_OFFSETS.forEach((epsilon, index) => {
        fireEvent.change(slider, {target: {value: String(index)}});
        expect(graph.settings.epsilon, `stop ${index}`).toBe(epsilon);
        const area = text('[data-simson-readout="area"]');
        if (epsilon === 0) {
            expect(statusOf()).toBe('collinear-within');
            expect(text('[data-simson-chip]')).toContain('kolinearna');
            expect(area).toBe('Ploščina nožiščnega trikotnika / S = 0');
            expect(exact(graph, 'simson-line')).toHaveLength(1);
        } else {
            expect(statusOf(), `ε ${epsilon}`).toBe('not-collinear');
            expect(text('[data-simson-chip]')).toBe('Nožišča D, E, F: ni kolinearna');
            expect(area).not.toContain('≤');
            expect(area).toMatch(/^Ploščina nožiščnega trikotnika \/ S ≈ \d/);
            if (epsilon > 0) expect(area).toContain(ratios[String(epsilon)]);
            expect(exact(graph, 'simson-line')).toHaveLength(0);
            expect(exact(graph, 'pedal-triangle')).toHaveLength(1);
        }
        expect(text('[data-simson-epsilon] output')).toMatch(/\d/);
        const p = pointOf(graph, 'P');
        expect(Math.hypot(p.X() - O.x, p.Y() - O.y)).toBeCloseTo(R * (1 + epsilon), 9);
    });
    expect(text('[data-simson-epsilon-note]')).toContain('odloča odčitek ploščine');
    expect(graph.setEpsilon(0.02)).toBe(false);
    expect(graph.settings.epsilon).toBe(0.2);
    noNaN(graph);
});

test('a P-prime edit updates the exact readouts: power, feet as rationals, area ratio and status', () => {
    const graph = new Observed();
    mount(graph);
    fireEvent.change(select('[data-simson-mode]'), {target: {value: 'exact'}});
    enterNumber(screen.getByLabelText('P′: x'), '0');
    enterNumber(screen.getByLabelText('P′: y'), '3');
    expect(graph.settings.pPrime).toEqual({x: 0, y: 3});
    expect(text('[data-simson-point="d"]')).toBe('D = (2, 5)');
    expect(text('[data-simson-point="e"]')).toBe('E = (30/29, 75/29)');
    expect(text('[data-simson-point="f"]')).toBe('F = (0, 0)');
    expect(text('[data-simson-readout="power"]')).toContain('= 0');
    expect(text('[data-simson-on-circle]')).toContain('natančno na očrtani krožnici');
    enterNumber(screen.getByLabelText('P′: x'), '6');
    enterNumber(screen.getByLabelText('P′: y'), '4');
    expect(text('[data-simson-readout="power"]')).toBe('Potenca točke P′ na očrtano krožnico = −2');
    expect(text('[data-simson-readout="area"]')).toBe('Ploščina nožiščnega trikotnika / S = 1/29 (natančno)');
    expect(text('[data-simson-on-circle]')).toContain('ni na očrtani krožnici');
    expect(statusOf()).toBe('not-collinear');
    // The stored example id (the default one) names a glider scene, so a typed point leaves it.
    expect(graph.exampleId).toBeUndefined();
    // A value outside the grid range or a non-integer is refused and not written.
    enterNumber(screen.getByLabelText('P′: x'), '1.5');
    expect(graph.settings.pPrime).toEqual({x: 6, y: 4});
    enterNumber(screen.getByLabelText('P′: x'), '99999999999');
    expect(graph.settings.pPrime).toEqual({x: 6, y: 4});
    expect(graph.setPPrime({x: 0.5, y: 0})).toBe(false);
    noNaN(graph);
});

test('the vertex example shows the coincidence status, two distinct feet and the line through them', () => {
    const graph = new Observed();
    mount(graph);
    fireEvent.change(select('[data-simson-example]'), {target: {value: 'vertex'}});
    expect(graph.exampleId).toBe('vertex');
    expect(graph.settings).toMatchObject({mode: 'exact', pPrime: {x: 7, y: 0}});
    expect(statusOf()).toBe('coincident');
    expect(text('[data-simson-chip]')).toBe('Nožišča D, E, F: dve nožišči sovpadata; premica poteka skozi različni nožišči');
    expect(text('[data-simson-distinct]')).toBe('Različnih nožišč: 2 od 3');
    expect(exact(graph, 'simson-line')).toHaveLength(1);
    expect(exact(graph, 'pedal-triangle')).toHaveLength(0);
    noNaN(graph);
    expectFiniteBoard(graph);
});

test('the examples set vertices, mode and their point fields; a custom vertex edit leaves the example', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadExample('grid-on-circle'); });
    expect(graph.settings).toMatchObject({mode: 'exact', pPrime: {x: 2, y: -2}});
    expect(text('[data-simson-point="e"]')).toBe('E = (−12/29, −30/29); zunaj pogleda'.replace('; zunaj pogleda', ''));
    expect(statusOf()).toBe('collinear-exact');
    act(() => { graph.loadExample('grid-off-circle'); });
    expect(statusOf()).toBe('not-collinear');
    expect(text('[data-simson-readout="power"]')).toContain('−2');
    enterNumber(screen.getByLabelText('P3, x'), '1');
    expect(graph.model.points[2]).toEqual({x: 1, y: 5});
    expect(graph.exampleId).toBeUndefined();
    expect(select('[data-simson-example]').value).toBe('custom');
    act(() => { expect(graph.addPointAt({x: 9, y: 9})).toBe(false); });
    load(graph, tri([0, 0], [4, 0]));
    expect(text('[data-simson-state="missing"]')).toContain('manjka jih: 1');
    expect(exact(graph, 'P′')).toHaveLength(0);
    noNaN(graph);
});

test('a foot on a side line outside its segment is drawn and reported with no error', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadExample('grid-on-circle'); });
    // E is on line CA beyond A: it has board coordinates and the line is drawn through it.
    expect(exact(graph, 'E')).toHaveLength(1);
    const e = pointOf(graph, 'E');
    expect(e.X()).toBeCloseTo(-12 / 29, 9);
    expect(e.Y()).toBeCloseTo(-30 / 29, 9);
    expect(exact(graph, 'simson-line')).toHaveLength(1);
    expect(document.querySelector('[data-simson-too-far]')).toBeNull();
});

test('a live Slovenian to English switch updates the panel and the board labels', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    expect(exact(graph, 'simson-chip')[0].plaintext).toBe('Nožišča D, E, F: kolinearna');
    act(() => { setLanguage('en'); });
    const english = 'Feet D, E, F: collinear';
    expect(text('[data-simson-chip]')).toBe(english);
    expect(exact(graph, 'simson-chip')[0].plaintext).toBe(english);
    expect(text('[data-simson-readout="area"]')).toBe('Area of the foot triangle / S = 0');
    expect(screen.getByLabelText(/^Offset ε of P from the circle \(relative to the radius\)/)).toBeInTheDocument();
    act(() => { graph.setEpsilon(0.01); });
    expect(text('[data-simson-chip]')).toBe('Feet D, E, F: not collinear');
    expect(exact(graph, 'simson-chip')[0].plaintext).toBe('Feet D, E, F: not collinear');
    expect(text('[data-simson-readout="area"]')).toBe('Area of the foot triangle / S ≈ 5.0·10⁻³');
    expect(document.body.textContent).not.toMatch(/exactly collinear/);
    act(() => { graph.setMode('exact'); });
    expect(text('[data-simson-readout="power"]')).toMatch(/^Power of P′ with respect to the circumcircle = /);
    expect(languageListeners.live).toBeGreaterThan(0);
    view.unmount();
    expect(languageListeners.live).toBe(0);
    expect(() => act(() => { setLanguage('sl'); })).not.toThrow();
});

test('degenerate vertices say why in words, draw no P, feet or line, and put no NaN on the board', () => {
    const graph = new Observed();
    mount(graph);
    for (const mode of ['glider', 'exact'] as const) {
        act(() => { graph.setMode(mode); });
        for (const points of [tri([0, 0], [1, 1], [3, 3]), tri([2, 2], [2, 2], [2, 2])]) {
            load(graph, points);
            expect(text('[data-simson-state="degenerate"] [data-simson-chip]')).toBe('Simsonova premica ni določena (izrojen trikotnik)');
            expect(text('[data-simson-degenerate]')).toContain('kolinearna ali sovpadajo');
            for (const name of ['P', 'P′', 'D', 'E', 'F', 'simson-line', 'pedal-triangle', 'circumcircle']) expect(exact(graph, name), name).toHaveLength(0);
            expect(named(graph, 'perpendicular-')).toHaveLength(0);
            expect(named(graph, 'sideline-')).toHaveLength(0);
            expect(exact(graph, 'simson-chip')[0].plaintext).toBe('Simsonova premica ni določena (izrojen trikotnik)');
            expect(expectFiniteBoard(graph)).toBeGreaterThan(0);
            noNaN(graph);
        }
    }
    load(graph, tri([0, 0], [7, 0], [2, 5]));
    expect(exact(graph, 'P′')).toHaveLength(1);
    expectFiniteBoard(graph);
});

test('a point far outside the view is reported as such, and one beyond the cap is never drawn', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.setMode('exact'); graph.setPPrime({x: 400, y: -300}); });
    expect(document.querySelector('[data-simson-point="p"]')?.getAttribute('data-outside-view')).toBe('true');
    expect(text('[data-simson-point="p"]')).toContain('zunaj pogleda');
    act(() => { graph.setPPrime({x: 2 ** 25, y: -(2 ** 25)}); });
    expectFiniteBoard(graph);
    noNaN(graph);
});

type Run = {name: string; runs: number; objects: number; step: number[]; update: number[]};
/** Times a scripted drag: `move` repositions the dragged point for step i; the whole drag step and a plain `board.update()` are timed. */
function measureDrag(name: string, prepare: (graph: Observed) => JXG.Point, target: (i: number) => [number, number], runs = 120): Run {
    const graph = new Observed();
    const view = mount(graph);
    showAllOverlays(graph);
    const point = prepare(graph);
    const board = graph.liveBoard();
    const step: number[] = [];
    const update: number[] = [];
    for (let i = 0; i < runs; i++) {
        const started = performance.now();
        act(() => { point.moveTo(target(i), 0); drag(point); });
        step.push(performance.now() - started);
        const t0 = performance.now();
        board.update();
        update.push(performance.now() - t0);
        if (i % 20 === 0) expectFiniteBoard(graph);
    }
    const objects = all(graph).length;
    view.unmount();
    const q = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(p * values.length))];
    return {name, runs, objects, step: [q(step, .5), q(step, .95)], update: [q(update, .5), q(update, .95)]};
}

test('a drag of P, of P-prime and of a vertex with every overlay on keeps the board finite; timings go to SIMSON_DRAG_OUT when set', () => {
    const glider = measureDrag('P (glider)', graph => pointOf(graph, 'P'), i => {
        const a = i * 3 * Math.PI / 180;
        return [O.x + 4 * Math.cos(a), O.y + 4 * Math.sin(a)];
    });
    const exactRun = measureDrag("P' (exact)", graph => { act(() => { graph.setMode('exact'); }); return pointOf(graph, 'P′'); },
        i => [(i % 12) - 3 + 0.2, ((i * 7) % 9) - 3 + 0.1]);
    const vertex = measureDrag('Vertex C', graph => named(graph, 'P3')[0] as unknown as JXG.Point,
        i => [2 + (i % 12) - 6 + 0.2, 5 + ((i * 7) % 9) - 4 + 0.1]);
    for (const run of [glider, exactRun, vertex]) {
        expect(Number.isFinite(run.update[1])).toBe(true);
        // Gross-regression bound only.
        expect(run.update[1]).toBeLessThan(250);
    }
    const out = process.env.SIMSON_DRAG_OUT;
    if (out) writeFileSync(out, JSON.stringify({glider, exact: exactRun, vertex}, null, 1));
});
