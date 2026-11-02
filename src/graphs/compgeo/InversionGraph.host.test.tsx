import React from 'react';
import {InversionGraph} from './InversionGraph';
import {writeFileSync} from 'node:fs';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
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

class Observed extends InversionGraph {
    liveBoard() { return this.board; }
}
type Shown = {elType: string; name?: string; plaintext?: string; X?: () => number; Y?: () => number; coords?: {usrCoords: number[]}; Radius?: () => number};
const all = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const exact = (graph: Observed, name: string) => all(graph).filter(o => o.name === name);
const count = (graph: Observed) => all(graph).length;
const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
type Triggerable = {triggerEventHandlers(names: string[], args: unknown[]): void};
const dragTo = (point: Shown | JXG.Point, x: number, y: number) => act(() => {
    (point as unknown as JXG.Point).moveTo([x, y], 0);
    (point as unknown as Triggerable).triggerEventHandlers(['drag'], []);
});
const text = (selector: string) => (document.querySelector(selector)?.textContent ?? '');
const readout = (id: string) => text(`[data-inversion-readout="${id}"]`);
const field = (selector: string) => document.querySelector(selector) as HTMLInputElement;
const stateOf = () => document.querySelector('[data-inversion-state]')?.getAttribute('data-inversion-state');
const pick = (graph: Observed, id: Parameters<Observed['loadExample']>[0]) => act(() => { graph.loadExample(id); });
const ids = ['inversion-circle', 'rays', 'image', 'secant', 'tangent', 'angle-tangents'] as const;
const allOn = (graph: Observed) => act(() => { for (const id of ids) graph.setOverlay(id, true); });
const EMPTY = {mode: 'points', closed: false, gridStepExponent: 0, points: []} as const;
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

test('the default scene: centre C at the origin, point focus, the inversion circle, X and its image', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.pointLimit).toBe(1);
    expect(graph.model.points).toEqual([{x: 0, y: 0}]);
    expect(graph.fields).toMatchObject({focus: 'point', radius: 2, x: {x: 3, y: 1}});
    for (const name of ['C', 'X', 'X′', 'inversion-circle', 'inversion-chip', 'ray', 'r']) expect(exact(graph, name), name).toHaveLength(1);
    expect(exact(graph, 'P1')).toHaveLength(0);
    noNaN(graph);
    expectFiniteBoard(graph);
});

test('Reset restores the default scene', async () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadExample('angle'); graph.setRadius(5); graph.setOverlay('rays', false); });
    expect(graph.fields.focus).toBe('angle');
    await settle(() => graph.reset());
    expect(graph.model.points).toEqual([{x: 0, y: 0}]);
    expect(graph.fields).toMatchObject({focus: 'point', radius: 2, x: {x: 3, y: 1}, hasCentre: true});
    expect(graph.exampleId).toBe('point');
    expect(graph.overlayShown('rays')).toBe(true);
    expect(exact(graph, 'X′')).toHaveLength(1);
    expect(stateOf()).toBe('point');
});

test('Presets restore the vertex, r, focus, every focus field, example and overlays', async () => {
    const graph = new Observed();
    mount(graph);
    act(() => {
        graph.loadModel({mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 1, y: -1}]});
        graph.setRadius(5); graph.setX({x: -4, y: 2});
        graph.setSource({kind: 'line', p: {x: -2, y: 1}, q: {x: 3, y: 4}});
        graph.setPowerCircle({centre: {x: -3, y: 2}, radius: 4}); graph.setTheta(33.5);
        graph.setAngleCircle(0, {centre: {x: 2, y: 2}, radius: 3}); graph.setAngleCircle(1, {centre: {x: 4, y: 1}, radius: 2}); graph.setWhich(0);
        graph.setFocus('angle'); graph.setOverlay('rays', false); graph.setOverlay('angle-tangents', false);
    });
    expect(graph.exampleId).toBeUndefined();
    const state = graph.exportPreset().graphState as unknown as Record<string, unknown>;
    expect(state).toMatchObject({focus: 'angle', radius: 5, x: {x: -4, y: 2}, power: {thetaDeg: 33.5}, angle: {which: 0}});
    expect(graph.presetCollection().checkGraphState!(state)).toBeUndefined();
    expect(graph.presets()).toBe('compgeo-inversion');
    act(() => { graph.saveCurrentPreset('mine'); });
    pick(graph, 'power');
    act(() => { graph.setOverlay('rays', true); graph.setOverlay('angle-tangents', true); });
    await settle(() => graph.selectPreset('mine'));
    expect(graph.model.points).toEqual([{x: 1, y: -1}]);
    expect(graph.fields).toMatchObject({
        focus: 'angle', radius: 5, x: {x: -4, y: 2}, hasCentre: true,
        source: {kind: 'line', p: {x: -2, y: 1}, q: {x: 3, y: 4}},
        power: {circle: {centre: {x: -3, y: 2}, radius: 4}, thetaDeg: 33.5},
        angle: {first: {centre: {x: 2, y: 2}, radius: 3}, second: {centre: {x: 4, y: 1}, radius: 2}, which: 0},
    });
    expect(graph.overlayShown('rays')).toBe(false);
    expect(graph.overlayShown('angle-tangents')).toBe(false);
    expect(exact(graph, 'ray')).toHaveLength(0);
    // The example id survives a round trip.
    pick(graph, 'orthogonal');
    act(() => { graph.saveCurrentPreset('ortho'); });
    pick(graph, 'point');
    await settle(() => graph.selectPreset('ortho'));
    expect(graph.exampleId).toBe('orthogonal');
    expect(graph.fields).toMatchObject({focus: 'source', radius: 4});
});

test('every board object is removed again across focus switches, a source kind switch and dispose', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    const board = graph.liveBoard();
    allOn(graph);
    const start = count(graph);
    const perFocus: Record<string, number> = {};
    for (let round = 0; round < 2; round++) {
        for (const focus of ['source', 'power', 'angle', 'point'] as const) {
            act(() => { graph.setFocus(focus); });
            if (round === 0) perFocus[focus] = count(graph);
            else expect(count(graph), `${focus} again`).toBe(perFocus[focus]);
            if (focus === 'source') {
                const circleCount = count(graph);
                act(() => { graph.setSourceKind('line'); });
                act(() => { graph.setSourceKind('circle'); });
                expect(count(graph), 'source kind round trip').toBe(circleCount);
            }
        }
        expect(count(graph), `round ${round} back to point`).toBe(start);
    }
    act(() => { for (const id of ids) graph.setOverlay(id, false); for (const id of ids) graph.setOverlay(id, true); });
    expect(count(graph)).toBe(start);
    expect(languageListeners.live).toBeGreaterThan(0);
    const oldObjects = [...all(graph)];
    const oldBoard = board as unknown as {objectsList: unknown[]; hasMouseHandlers?: boolean; hasPointerHandlers?: boolean; eventHandlers: Record<string, unknown[]>};
    view.unmount();
    expect(languageListeners.live).toBe(0);
    expect(oldObjects.length).toBeGreaterThan(5);
    // The old board's listeners are gone: a view change on it no longer reaches the graph.
    const handlers = Object.entries(oldBoard.eventHandlers).filter(([event]) => event === 'boundingbox' || event === 'up');
    expect(handlers.every(([, list]) => !list || (Array.isArray(list) && list.length === 0))).toBe(true);
    const staleEpoch = (graph as unknown as {epoch: number}).epoch;
    const staleCount = oldBoard.objectsList.length;
    (board as unknown as JXG.Board).setBoundingBox([-50, 50, 50, -50], false);
    (board as unknown as Triggerable).triggerEventHandlers(['up'], []);
    expect((graph as unknown as {epoch: number}).epoch).toBe(staleEpoch);
    expect(oldBoard.objectsList.length).toBe(staleCount);
    const again = mount(graph);
    expect(graph.liveBoard()).not.toBe(board);
    allOn(graph);
    expect(count(graph)).toBe(start);
    again.unmount();
    expect(languageListeners.live).toBe(0);
});

test.each([
    ['inversion-circle', 'point', 'inversion-circle'],
    ['rays', 'point', 'ray'],
    ['image', 'point', 'X′'],
    ['secant', 'power', 'secant'],
    ['tangent', 'power', 'tangent-1'],
    ['angle-tangents', 'angle', 'angle-tangent-before-1'],
] as const)('the %s overlay removes its objects when off and brings them back when on', (id, focus, name) => {
    const graph = new Observed();
    mount(graph);
    allOn(graph);
    act(() => { graph.setFocus(focus); });
    const shown = count(graph);
    expect(exact(graph, name), `${name} on`).toHaveLength(1);
    act(() => { graph.setOverlay(id, false); });
    expect(exact(graph, name), `${name} off`).toHaveLength(0);
    expect(count(graph)).toBeLessThan(shown);
    act(() => { graph.setOverlay(id, true); });
    expect(exact(graph, name), `${name} on again`).toHaveLength(1);
    expect(count(graph)).toBe(shown);
});

test('the focus select, the examples select and the source kind select drive the scene', () => {
    const graph = new Observed();
    mount(graph);
    fireEvent.change(field('[data-inversion-focus]'), {target: {value: 'power'}});
    expect(graph.fields.focus).toBe('power');
    expect(exact(graph, 'P')).toHaveLength(1);
    expect(exact(graph, 'C')).toHaveLength(0);
    expect(exact(graph, 'inversion-circle')).toHaveLength(0);
    fireEvent.change(field('[data-inversion-example]'), {target: {value: 'orthogonal'}});
    expect(graph.exampleId).toBe('orthogonal');
    expect(graph.fields).toMatchObject({focus: 'source', radius: 4});
    fireEvent.change(field('[data-inversion-source-kind]'), {target: {value: 'line'}});
    expect(graph.fields.source.kind).toBe('line');
    expect(graph.exampleId).toBeUndefined();
});

test('point example: X = (3, 1) maps to (6/5, 2/5), outside the circle', () => {
    const graph = new Observed();
    mount(graph);
    pick(graph, 'point');
    expect(readout('image')).toBe('Slika X′ = (6/5, 2/5)');
    expect(readout('position')).toContain('zunaj');
    const image = exact(graph, 'X′')[0];
    expect(image.X!()).toBeCloseTo(1.2, 12);
    expect(image.Y!()).toBeCloseTo(0.4, 12);
    expectFiniteBoard(graph);
});

test('source examples show their spec numbers', () => {
    const graph = new Observed();
    mount(graph);
    pick(graph, 'through-centre');
    expect(stateOf()).toBe('circle-to-line');
    expect(readout('image')).toBe('Slika: premica x = 2');
    expect(exact(graph, 'image-curve')).toHaveLength(1);
    pick(graph, 'not-through-centre');
    expect(stateOf()).toBe('circle-to-circle');
    expect(readout('image')).toBe('Slika: krožnica s središčem (3/2, 0), r² = 1/4');
    pick(graph, 'orthogonal');
    // The circle (5, 0), r = 3 is orthogonal to the inversion circle of radius 4: its image is itself.
    expect(readout('image')).toBe('Slika: krožnica s središčem (5, 0), r² = 9');
    const image = exact(graph, 'image-curve')[0];
    const source = exact(graph, 'source-circle')[0];
    expect(image.Radius!()).toBeCloseTo(source.Radius!(), 12);
    pick(graph, 'line-through-centre');
    expect(stateOf()).toBe('line-to-self');
    expect(readout('image')).toBe('Slika: premica x − y = 0');
    expectFiniteBoard(graph);
});

test('power example: power 16, PA times PB near 16, tangent length 4', () => {
    const graph = new Observed();
    mount(graph);
    pick(graph, 'power');
    allOn(graph);
    expect(readout('power')).toBe('Potenca točke P na krožnico: 16');
    expect(readout('secant')).toBe('PA = 2, PB = 8; PA · PB ≈ 16');
    expect(readout('tangent')).toBe('Dolžina tangentnega odseka: 4');
    for (const name of ['P', 'A', 'B', 'T₁', 'T₂', 'secant', 'tangent-1', 'tangent-2', 'power-circle', 'θ', 'O']) expect(exact(graph, name), name).toHaveLength(1);
    expect(field('[data-inversion-field="radius"]')).toBeNull();
    expectFiniteBoard(graph);
});

test('angle example: 60 degrees before, signed -60 after, the sign flip sentence, and the typed cases', () => {
    const graph = new Observed();
    mount(graph);
    pick(graph, 'angle');
    allOn(graph);
    expect(readout('angle-before')).toBe('Kot pred inverzijo: 60° (s predznakom 60°)');
    expect(readout('angle-after')).toBe('Kot po inverziji: 60° (s predznakom −60°)');
    expect(readout('angle-flip')).toContain('obrne');
    for (const name of ['Q', 'Q′', 'angle-circle-1', 'angle-circle-2', 'image-curve-1', 'image-curve-2']) expect(exact(graph, name), name).toHaveLength(1);
    expect(exact(graph, 'angle-tangent-before-1')).toHaveLength(1);
    fireEvent.click(document.querySelector('[data-inversion-which="0"]')!);
    expect(graph.fields.angle.which).toBe(0);
    // Disjoint circles: a message, no angle, no tangents, no NaN.
    act(() => { graph.setAngleCircle(1, {centre: {x: -8, y: 0}, radius: 1}); });
    expect(document.querySelector('[data-inversion-readout="angle-before"]')).toBeNull();
    expect(exact(graph, 'Q')).toHaveLength(0);
    noNaN(graph);
    // Circles meeting at a right angle show the unsigned angle only.
    act(() => { graph.setAngleCircle(0, {centre: {x: 1, y: 0}, radius: 3}); graph.setAngleCircle(1, {centre: {x: 4, y: 4}, radius: 4}); });
    expect(stateOf()).toBe('right-angle');
    expect(document.querySelector('[data-inversion-readout="angle-before"]')).toBeNull();
    expect(readout('angle-right')).toContain('90°');
    expect(readout('angle-right')).not.toMatch(/predznak|−90/);
    expectFiniteBoard(graph);
});

test('X = C shows the centre message and draws no image; a far image gets an edge marker and "outside the view"', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.setX({x: 0, y: 0}); });
    expect(document.body.textContent).toContain('Točka X je središče inverzije C, zato nima slike.');
    expect(exact(graph, 'X′')).toHaveLength(0);
    expect(exact(graph, 'ray')).toHaveLength(0);
    noNaN(graph);
    act(() => { graph.setRadius(8); graph.setX({x: 1, y: 0}); });
    // The image distance is 64, beyond the draw cap of 30.
    expect(exact(graph, 'X′')).toHaveLength(0);
    expect(exact(graph, 'edge-marker-image')).toHaveLength(1);
    expect(readout('image')).toContain('zunaj pogleda');
    expect(readout('image')).toContain('(64, 0)');
    noNaN(graph);
    expect(expectFiniteBoard(graph)).toBeGreaterThan(5);
    act(() => { setLanguage('en'); });
    expect(readout('image')).toContain('outside the view');
    // Back inside: the marker is gone and the image is drawn.
    act(() => { graph.setRadius(2); });
    expect(exact(graph, 'edge-marker-image')).toHaveLength(0);
    expect(exact(graph, 'X′')).toHaveLength(1);
});

test('the radius field and the radius handle change r; out-of-range values are refused', () => {
    const graph = new Observed();
    mount(graph);
    fireEvent.change(field('[data-inversion-field="radius"]'), {target: {value: '5'}});
    expect(graph.fields.radius).toBe(5);
    expect(exact(graph, 'inversion-circle')[0].Radius!()).toBe(5);
    fireEvent.change(field('[data-inversion-field="radius"]'), {target: {value: '9'}});
    expect(graph.fields.radius).toBe(5);
    fireEvent.change(field('[data-inversion-field="radius"]'), {target: {value: '0'}});
    expect(graph.fields.radius).toBe(5);
    dragTo(exact(graph, 'r')[0], 3.4, 0.2);
    expect(graph.fields.radius).toBe(3);
    expect(exact(graph, 'r')[0].X!()).toBe(3);
    expect(exact(graph, 'r')[0].Y!()).toBe(0);
    dragTo(exact(graph, 'r')[0], 4.6, 0);
    expect(graph.fields.radius).toBe(5);
    dragTo(exact(graph, 'r')[0], 40, 0);
    expect(graph.fields.radius).toBe(8);
    dragTo(exact(graph, 'r')[0], -4, 0);
    expect(graph.fields.radius).toBe(1);
});

test('dragging X and C snaps to the grid', () => {
    const graph = new Observed();
    mount(graph);
    dragTo(exact(graph, 'X')[0], -2.3, 1.6);
    expect(graph.fields.x).toEqual({x: -2, y: 2});
    expect(exact(graph, 'X')[0].X!()).toBe(-2);
    dragTo(exact(graph, 'C')[0], 1.2, -0.7);
    expect(graph.model.points).toEqual([{x: 1, y: -1}]);
});

test('a source line handle dropped on the other handle is refused and reverts', () => {
    const graph = new Observed();
    mount(graph);
    pick(graph, 'line-through-centre');
    dragTo(exact(graph, 'S₁')[0], 3.2, 2.9);
    expect(graph.fields.source).toEqual({kind: 'line', p: {x: -3, y: -3}, q: {x: 3, y: 3}});
    expect(exact(graph, 'S₁')[0].X!()).toBe(-3);
    dragTo(exact(graph, 'S₁')[0], -1.2, 2.2);
    expect(graph.fields.source).toEqual({kind: 'line', p: {x: -1, y: 2}, q: {x: 3, y: 3}});
});

test('the theta field, arrows and the handle move the secant', () => {
    const graph = new Observed();
    mount(graph);
    pick(graph, 'power');
    fireEvent.change(field('[data-inversion-theta]'), {target: {value: '10'}});
    expect(graph.fields.power.thetaDeg).toBe(10);
    const slider = field('[data-inversion-theta-slider]');
    fireEvent.keyDown(slider, {key: 'ArrowRight'});
    expect(graph.fields.power.thetaDeg).toBe(11);
    fireEvent.keyDown(slider, {key: 'ArrowLeft', shiftKey: true});
    expect(graph.fields.power.thetaDeg).toBe(1);
    fireEvent.keyDown(slider, {key: 'ArrowLeft', shiftKey: true});
    expect(graph.fields.power.thetaDeg).toBe(351);
    fireEvent.change(field('[data-inversion-theta]'), {target: {value: '-30'}});
    expect(graph.fields.power.thetaDeg).toBe(330);
    fireEvent.change(field('[data-inversion-theta]'), {target: {value: '20'}});
    const before = readout('secant');
    expect(exact(graph, 'secant')).toHaveLength(1);
    expect(exact(graph, 'θ')[0].X!()).toBeCloseTo(3 * Math.cos(Math.PI / 9), 9);
    dragTo(exact(graph, 'θ')[0], 4, 2);
    expect(graph.fields.power.thetaDeg).toBeCloseTo((Math.atan2(2, 4) * 180) / Math.PI, 9);
    expect(readout('secant')).not.toBe(before);
    expect(exact(graph, 'θ')[0].X!()).toBeCloseTo(3 * Math.cos(Math.atan2(2, 4)), 9);
    noNaN(graph);
    expectFiniteBoard(graph);
});

test('deleting the vertex gives the "no centre" state: a message, no derived objects, no NaN', () => {
    const graph = new Observed();
    mount(graph);
    const full = count(graph);
    for (const focus of ['point', 'source', 'power', 'angle'] as const) {
        act(() => { graph.setFocus(focus); graph.loadModel(EMPTY as never); });
        expect(graph.fields.hasCentre).toBe(false);
        expect(document.body.textContent).toContain('Ni središča inverzije C');
        for (const name of ['X′', 'inversion-circle', 'ray', 'image-curve', 'secant', 'Q']) expect(exact(graph, name), `${focus} ${name}`).toHaveLength(0);
        expect(count(graph)).toBeLessThan(full);
        noNaN(graph);
        expectFiniteBoard(graph);
        act(() => { graph.loadModel({mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}]}); });
    }
    expect(exact(graph, 'C').length + exact(graph, 'P').length).toBe(1);
});

test('a live SL to EN switch updates the panel and the board labels', () => {
    const graph = new Observed();
    mount(graph);
    expect(text('[data-inversion-chip]')).toBe(exact(graph, 'inversion-chip')[0].plaintext);
    const sl = text('[data-inversion-chip]');
    act(() => { setLanguage('en'); });
    const en = text('[data-inversion-chip]');
    expect(en).not.toBe(sl);
    expect(exact(graph, 'inversion-chip')[0].plaintext).toBe(en);
    expect(readout('position')).toMatch(/outside the circle of inversion/i);
    act(() => { setLanguage('sl'); });
    expect(exact(graph, 'inversion-chip')[0].plaintext).toBe(sl);
    noNaN(graph);
});

type Run = {name: string; runs: number; objects: number; step: number[]; update: number[]};
/** Times a scripted drag: `target` positions the dragged object for step i; the whole drag step and a plain `board.update()` are timed. */
function measureDrag(name: string, prepare: (graph: Observed) => Shown, target: (i: number) => [number, number], runs = 120): Run {
    const graph = new Observed();
    const view = mount(graph);
    allOn(graph);
    const point = prepare(graph);
    const board = graph.liveBoard();
    const step: number[] = [];
    const update: number[] = [];
    for (let i = 0; i < runs; i++) {
        const started = performance.now();
        dragTo(point, ...target(i));
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

test('object counts per focus and scripted drags keep the board finite; numbers go to INVERSION_DRAG_OUT when set', () => {
    const counts: Record<string, number> = {};
    const graph = new Observed();
    mount(graph);
    allOn(graph);
    for (const focus of ['point', 'source', 'power', 'angle'] as const) { act(() => { graph.setFocus(focus); }); counts[focus] = count(graph); }
    act(() => { graph.setFocus('source'); graph.setSourceKind('line'); });
    counts['source (line)'] = count(graph);
    const runs = [
        measureDrag('C (point focus)', g => exact(g, 'C')[0], i => [-4 + (i % 4) + 0.2, ((i * 7) % 9) - 4 + 0.1]),
        measureDrag('X', g => exact(g, 'X')[0], i => [(i % 12) - 6 + 0.2, ((i * 7) % 9) - 4 + 0.1]),
        measureDrag('source centre S', g => { act(() => { g.setFocus('source'); }); return exact(g, 'S')[0]; }, i => [(i % 6) + 0.2, ((i * 7) % 9) - 4 + 0.1]),
        measureDrag('theta handle', g => { act(() => { g.setFocus('power'); }); return exact(g, 'θ')[0]; }, i => [4 * Math.cos(i * 3 * Math.PI / 180), 4 * Math.sin(i * 3 * Math.PI / 180)]),
    ];
    for (const run of runs) {
        expect(Number.isFinite(run.update[1])).toBe(true);
        // Gross-regression bound only.
        expect(run.update[1]).toBeLessThan(250);
    }
    const out = process.env.INVERSION_DRAG_OUT;
    if (out) writeFileSync(out, JSON.stringify({counts, runs}, null, 1));
});

test('panning the view flips an image between no marker and an edge marker; a pan that keeps the outside set causes no rebuild', () => {
    const graph = new Observed();
    mount(graph);
    const board = graph.liveBoard();
    const epoch = () => (graph as unknown as {epoch: number}).epoch;
    const show = (box: [number, number, number, number]) => act(() => { board.setBoundingBox(box, false); });
    const release = () => act(() => { (board as unknown as Triggerable).triggerEventHandlers(['up'], []); });
    show([-10, 10, 10, -10]);
    // r = 8, X = (4, 0): the image (16, 0) is within the draw cap, so X' is always drawn; outside the view it also gets a marker.
    act(() => { graph.setRadius(8); graph.setX({x: 4, y: 0}); });
    expect(exact(graph, 'X′')).toHaveLength(1);
    expect(exact(graph, 'edge-marker-image')).toHaveLength(1);
    expect(readout('image')).toContain('zunaj pogleda');
    show([-10, 20, 20, -20]);
    expect(exact(graph, 'X′')).toHaveLength(1);
    expect(exact(graph, 'edge-marker-image')).toHaveLength(0);
    expect(readout('image')).not.toContain('zunaj pogleda');
    show([-30, 10, 10, -10]);
    expect(exact(graph, 'X′')).toHaveLength(1);
    expect(exact(graph, 'edge-marker-image')).toHaveLength(1);
    expect(readout('image')).toContain('zunaj pogleda');
    // Panning with the image still outside does not rebuild; releasing the pointer moves the marker onto the final boundary.
    const before = epoch();
    show([-31, 10, 9, -10]);
    show([-32, 10, 8, -10]);
    expect(epoch()).toBe(before);
    release();
    expect(epoch()).toBe(before + 1);
    release();
    expect(epoch()).toBe(before + 1);
    const marker = exact(graph, 'edge-marker-image')[0] as unknown as {point2: {X: () => number}};
    expect(marker.point2.X()).toBeCloseTo(8, 9);
    show([-10, 20, 20, -20]);
    expect(exact(graph, 'edge-marker-image')).toHaveLength(0);
    noNaN(graph);
    expectFiniteBoard(graph);
});

test('a zoom with no pointer up (wheel or button) settles the edge marker onto the final boundary once the view is still', () => {
    const graph = new Observed();
    mount(graph);
    const board = graph.liveBoard();
    const epoch = () => (graph as unknown as {epoch: number}).epoch;
    act(() => { board.setBoundingBox([-10, 10, 10, -10], false); (board as unknown as Triggerable).triggerEventHandlers(['up'], []); });
    act(() => { graph.setRadius(8); graph.setX({x: 4, y: 0}); });
    vi.useFakeTimers();
    try {
        act(() => { board.setBoundingBox([-12, 12, 12, -12], false); });
        const before = epoch();
        act(() => { vi.advanceTimersByTime(100); });
        expect(epoch()).toBe(before);
        act(() => { vi.advanceTimersByTime(100); });
        expect(epoch()).toBe(before + 1);
        const marker = exact(graph, 'edge-marker-image')[0] as unknown as {point2: {X: () => number}};
        expect(marker.point2.X()).toBeCloseTo(12, 9);
    } finally {
        vi.useRealTimers();
    }
    expectFiniteBoard(graph);
});

test('the base vertex label P1 never appears: after a vertex drag, Reset and an SL to EN switch', async () => {
    const graph = new Observed();
    mount(graph);
    const noP1 = () => {
        expect(exact(graph, 'P1')).toHaveLength(0);
        expect(all(graph).filter(o => (o.plaintext ?? '') === 'P1')).toHaveLength(0);
    };
    noP1();
    dragTo(exact(graph, 'C')[0], 2.2, 1.1);
    noP1();
    expect(exact(graph, 'C')).toHaveLength(1);
    act(() => { setLanguage('en'); });
    noP1();
    act(() => { graph.setFocus('power'); });
    dragTo(exact(graph, 'P')[0], -1.1, 2.2);
    noP1();
    await settle(() => graph.reset());
    noP1();
    expect(exact(graph, 'C')).toHaveLength(1);
    act(() => { setLanguage('sl'); });
    noP1();
});

test('angle tangents scale with the view, and no after-tangent is drawn for an image curve that is not drawn', () => {
    const graph = new Observed();
    mount(graph);
    const board = graph.liveBoard();
    pick(graph, 'angle');
    allOn(graph);
    const length = (name: string) => {
        const segment = exact(graph, name)[0] as unknown as {point1: {X: () => number; Y: () => number}; point2: {X: () => number; Y: () => number}};
        return Math.hypot(segment.point2.X() - segment.point1.X(), segment.point2.Y() - segment.point1.Y());
    };
    const width = () => Math.abs(board.getBoundingBox()[2] - board.getBoundingBox()[0]);
    act(() => { board.setBoundingBox([-10, 10, 10, -10], false); (board as unknown as Triggerable).triggerEventHandlers(['up'], []); });
    const small = length('angle-tangent-before-1');
    const smallWidth = width();
    act(() => { board.setBoundingBox([-40, 40, 40, -40], false); });
    act(() => { (board as unknown as Triggerable).triggerEventHandlers(['up'], []); });
    const large = length('angle-tangent-before-1');
    expect(large / small).toBeCloseTo(width() / smallWidth, 6);
    expect(width() / smallWidth).toBeGreaterThan(2);
    // The first circle's image lies beyond the draw cap: its curve and after-tangent are absent; the second image is drawn.
    act(() => {
        graph.setRadius(8);
        graph.setAngleCircle(0, {centre: {x: 3, y: 0}, radius: 2}); graph.setAngleCircle(1, {centre: {x: 4, y: 1}, radius: 2});
    });
    expect(exact(graph, 'image-curve-1')).toHaveLength(0);
    expect(exact(graph, 'angle-tangent-before-1')).toHaveLength(1);
    expect(exact(graph, 'angle-tangent-after-1')).toHaveLength(0);
    expect(exact(graph, 'image-curve-2')).toHaveLength(1);
    expect(exact(graph, 'angle-tangent-after-2')).toHaveLength(1);
    noNaN(graph);
    expectFiniteBoard(graph);
});

test('Shift+ArrowUp/Down steps the theta number field by 10 (normalised) and the integer fields by 10 within their range', () => {
    const graph = new Observed();
    mount(graph);
    const radius = field('[data-inversion-field="radius"]');
    fireEvent.keyDown(radius, {key: 'ArrowUp', shiftKey: true});
    expect(graph.fields.radius).toBe(8);
    fireEvent.keyDown(radius, {key: 'ArrowDown', shiftKey: true});
    expect(graph.fields.radius).toBe(1);
    fireEvent.keyDown(radius, {key: 'ArrowDown', shiftKey: true});
    expect(graph.fields.radius).toBe(1);
    // A plain arrow is left to the browser (step 1), so the handler does nothing.
    fireEvent.keyDown(radius, {key: 'ArrowUp'});
    expect(graph.fields.radius).toBe(1);
    const x = field('[data-inversion-field="x-x"]');
    fireEvent.keyDown(x, {key: 'ArrowUp', shiftKey: true});
    expect(graph.fields.x.x).toBe(10);
    fireEvent.keyDown(x, {key: 'ArrowDown', shiftKey: true});
    expect(graph.fields.x.x).toBe(0);
    pick(graph, 'power');
    act(() => { graph.setTheta(5); });
    const theta = field('[data-inversion-theta]');
    fireEvent.keyDown(theta, {key: 'ArrowUp', shiftKey: true});
    expect(graph.fields.power.thetaDeg).toBe(15);
    fireEvent.keyDown(theta, {key: 'ArrowDown', shiftKey: true});
    fireEvent.keyDown(theta, {key: 'ArrowDown', shiftKey: true});
    expect(graph.fields.power.thetaDeg).toBe(355);
    fireEvent.keyDown(theta, {key: 'ArrowUp'});
    expect(graph.fields.power.thetaDeg).toBe(355);
});
