import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {DEFAULT_ORIENTATION_MODEL, OrientationGraph} from './OrientationGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {orient} from '../../compgeo/predicates';
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

class Observed extends OrientationGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; plaintext?: string};
const named = (graph: Observed, prefix: string) => (graph.liveBoard().objectsList as Shown[]).filter(o => (o.name ?? '').startsWith(prefix));
const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const withR = (x: number, y: number): PointSetModel => ({...DEFAULT_ORIENTATION_MODEL, points: [{x: 0, y: 0}, {x: 4, y: 0}, {x, y}]});
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
const readout = () => {
    const element = document.querySelector('[data-orientation-readout]');
    if (!element) throw new Error('no readout');
    return element as HTMLElement;
};
const box = (graph: Observed) => graph.liveBoard().containerObj as HTMLElement;
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}

test('the default scene is p=(0,0), q=(4,0), r=(3,2): +8 and a left turn in a live status region', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model.points).toEqual(DEFAULT_ORIENTATION_MODEL.points);
    expect(graph.pointLimit).toBe(3);
    expect(readout().getAttribute('role')).toBe('status');
    expect(readout().textContent).toContain('+8');
    expect(readout().textContent).toContain('levi zavoj');
    expect(readout().dataset.orientationReadout).toBe('left');
});

test('r=(3,-2) shows -8 and a right turn; r=(2,0) is reached by arrow keys alone and shows 0 and collinear', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, withR(3, -2));
    expect(readout().textContent).toContain('−8');
    expect(readout().textContent).toContain('desni zavoj');
    load(graph, DEFAULT_ORIENTATION_MODEL);
    act(() => { graph.select(2); });
    const press = (key: string) => act(() => { fireEvent.keyDown(box(graph), {key}); });
    press('ArrowLeft'); press('ArrowDown'); press('ArrowDown');
    expect(graph.model.points[2]).toEqual({x: 2, y: 0});
    expect(readout().dataset.orientationValue).toBe('0');
    expect(readout().textContent).toContain('(kolinearne točke)');
});

test('swapping any two points negates the displayed value', () => {
    const graph = new Observed();
    mount(graph);
    const value = () => Number(readout().dataset.orientationValue);
    const [p, q, r] = DEFAULT_ORIENTATION_MODEL.points;
    expect(value()).toBe(8);
    for (const order of [[q, p, r], [p, r, q], [r, q, p]]) {
        load(graph, {...DEFAULT_ORIENTATION_MODEL, points: order});
        expect(value()).toBe(-8);
        load(graph, DEFAULT_ORIENTATION_MODEL);
        expect(value()).toBe(8);
    }
});

test('over [-3,7] x [-3,3] the displayed sign and word equal orient', () => {
    const graph = new Observed();
    mount(graph);
    const [p, q] = DEFAULT_ORIENTATION_MODEL.points;
    for (let x = -3; x <= 7; x++) {
        for (let y = -3; y <= 3; y++) {
            load(graph, withR(x, y));
            const sign = orient(p, q, {x, y});
            expect(Math.sign(Number(readout().dataset.orientationValue))).toBe(sign);
            expect(readout().dataset.orientationReadout).toBe(sign > 0 ? 'left' : sign < 0 ? 'right' : 'collinear');
        }
    }
}, 60000);

test('fewer than three points say what is missing; a fourth point is refused', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, {...DEFAULT_ORIENTATION_MODEL, points: [{x: 0, y: 0}, {x: 4, y: 0}]});
    expect(readout().dataset.orientationReadout).toBe('missing');
    expect(readout().textContent).toContain('tri točke');
    expect(readout().textContent).toContain('manjka jih: 1');
    load(graph, DEFAULT_ORIENTATION_MODEL);
    act(() => { expect(graph.addPointAt({x: 9, y: 9})).toBe(false); });
    expect(graph.model.points).toHaveLength(3);
});

test('the readout and the board text follow a language switch and a scene change', async () => {
    const graph = new Observed();
    mount(graph);
    expect(named(graph, 'turn-text')[0].plaintext).toContain('levi zavoj');
    act(() => { setLanguage('en'); });
    expect(readout().textContent).toContain('left turn');
    expect(readout().textContent).toContain('Orientation of p, q, r');
    expect(named(graph, 'turn-text')[0].plaintext).toContain('left turn');
    load(graph, withR(3, -2));
    expect(readout().textContent).toContain('right turn');
    await settle(() => graph.reset());
    expect(graph.model.points).toEqual(DEFAULT_ORIENTATION_MODEL.points);
    expect(readout().textContent).toContain('+8');
    expect(readout().textContent).toContain('left turn');
    expect(named(graph, 'turn-text')).toHaveLength(1);
});

test('the turn overlay owns exact objects: hidden leaves the base scene, shown restores the same count, collinear has no triangle', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    const list = () => graph.liveBoard().objectsList.length;
    expect(graph.overlayShown('turn')).toBe(true);
    const shown = list();
    expect(named(graph, 'turn-line')).toHaveLength(1);
    expect(named(graph, 'turn-triangle')).toHaveLength(1);
    expect(named(graph, 'turn-text')).toHaveLength(1);
    act(() => { graph.setOverlay('turn', false); });
    const hidden = list();
    expect(hidden).toBeLessThan(shown);
    expect(named(graph, 'turn-')).toHaveLength(0);
    for (let i = 0; i < 3; i++) {
        act(() => { graph.setOverlay('turn', true); });
        expect(list()).toBe(shown);
        act(() => { graph.setOverlay('turn', false); });
        expect(list()).toBe(hidden);
    }
    act(() => { graph.setOverlay('turn', true); });
    load(graph, withR(2, 0));
    expect(named(graph, 'turn-triangle')).toHaveLength(0);
    expect(named(graph, 'turn-line')).toHaveLength(1);
    expect(list()).toBeLessThan(shown);
    load(graph, DEFAULT_ORIENTATION_MODEL);
    expect(list()).toBe(shown);
    // The board is freed as a whole on unmount (the base owns the disposal); overlay objects are not removed one by one.
    const box = graph.liveBoard().containerObj as HTMLElement;
    const remove = vi.spyOn(box, 'removeEventListener');
    expect(languageListeners.live).toBeGreaterThan(0);
    view.unmount();
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.hasAttribute('tabindex')).toBe(false);
    // the language listener is released on unmount
    expect(languageListeners.live).toBe(0);
    expect(() => act(() => { setLanguage('en'); })).not.toThrow();
});

test('polygon mode with three points gives the same readout as points mode; p = q is 0 and collinear', () => {
    const graph = new Observed();
    mount(graph);
    const shown = readout().textContent;
    load(graph, {...DEFAULT_ORIENTATION_MODEL, mode: 'polygon', closed: true});
    expect(readout().textContent).toBe(shown);
    expect(readout().dataset.orientationValue).toBe('8');
    load(graph, {...DEFAULT_ORIENTATION_MODEL, points: [{x: 2, y: 1}, {x: 2, y: 1}, {x: 5, y: 7}]});
    expect(readout().dataset.orientationReadout).toBe('collinear');
    expect(readout().dataset.orientationValue).toBe('0');
    expect(readout().textContent).toContain('kolinearne');
    expect(named(graph, 'turn-triangle')).toHaveLength(0);
});

test('a thin or tiny triangle gets no turn label, a normal one does', () => {
    const graph = new Observed();
    mount(graph);
    expect(named(graph, 'turn-text')).toHaveLength(1);
    load(graph, withR(2, 0));
    expect(named(graph, 'turn-text')).toHaveLength(0);
    load(graph, {...DEFAULT_ORIENTATION_MODEL, points: [{x: 0, y: 0}, {x: 8, y: 0}, {x: 4, y: 1}]});
    expect(named(graph, 'turn-text')).toHaveLength(1);
    load(graph, {...DEFAULT_ORIENTATION_MODEL, points: [{x: 0, y: 0}, {x: 10, y: 1}, {x: 21, y: 2}]});
    expect(named(graph, 'turn-text')).toHaveLength(0);
});
