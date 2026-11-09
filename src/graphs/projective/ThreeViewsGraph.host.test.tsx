import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ThreeViewsGraph} from './ThreeViewsGraph';
import {DEFAULT_THREE_VIEWS_MODEL} from './threeViewsModel';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {typeNumber} from './controlsTest';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends ThreeViewsGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; X?: () => number; Y?: () => number; plaintext?: string; visPropCalc?: {visible?: boolean}};
type Curve = Shown & {evalVisProp(name: string): unknown; dataX?: number[]; dataY?: number[]};
const objects = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const named = (graph: Observed, elType: string, name: string) => objects(graph).filter(o => o.elType === elType && o.name === name);
const pointOf = (graph: Observed, name: string) => named(graph, 'point', name)[0] as unknown as JXG.Point;
const visible = (graph: Observed, name: string) => named(graph, 'point', name)[0].visPropCalc?.visible;
const boardTexts = (graph: Observed) => objects(graph).filter(o => o.elType === 'text').map(o => o.plaintext ?? '');
const curves = (graph: Observed) => objects(graph).filter(o => o.elType === 'curve') as Curve[];
const container = (graph: Observed) => graph.liveBoard().containerObj as HTMLElement;
const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const line = (name: string) => document.querySelector(`[data-projective-line="${name}"]`)?.textContent ?? '';
const status = () => document.querySelector('[data-projective-status]');
const slider = () => screen.getByRole('slider', {name: /Višina premice L|Height of the line L/}) as HTMLInputElement;

test('the default scene draws the circle, L, the image ellipse and the status for c = 2', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model).toEqual(DEFAULT_THREE_VIEWS_MODEL);
    expect(status()?.getAttribute('data-projective-status')).toBe('ellipse');
    expect(status()?.getAttribute('data-projective-contact')).toBe('misses');
    // Decision 63: the visible status is plain text; the graph's one live region announces it.
    expect(status()?.getAttribute('role')).toBeNull();
    expect(document.querySelector('[data-projective-status]')!.closest('[role="status"]')).toBeNull();
    expect(document.querySelectorAll('[data-readout-live]')).toHaveLength(1);
    expect(document.querySelector('[data-projective-live]')?.textContent).toContain('ne seka krožnice');
    expect(line('status')).toContain('ne seka krožnice');
    expect(line('equation')).toContain('X² + 3Y² + 4Y + 1 = 0');
    expect(line('discriminant')).toContain('−12');
    expect(line('determinant')).toContain('−1');
    expect(line('infinity')).toContain('nima točk v neskončnosti');
    expect(slider().value).toBe('2');
    expect(visible(graph, 'P')).toBe(false);
    expect(visible(graph, 'Q₁')).toBe(false);
    expect(visible(graph, 'Q₁′')).toBe(false);
    expect(boardTexts(graph).join(' ')).toContain('L: y = 2');
    expect(boardTexts(graph).join(' ')).toContain('elipsa');
    expect(boardTexts(graph).join(' ')).not.toMatch(/NaN|Infinity/);
});

test('c by keyboard on the board: ellipse, parabola, hyperbola; Shift moves a whole unit; Ctrl does nothing', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowDown', shiftKey: true}); });
    expect(graph.model.c).toBe(10);
    expect(status()?.getAttribute('data-projective-status')).toBe('parabola');
    expect(status()?.getAttribute('data-projective-contact')).toBe('touches');
    expect(line('status')).toContain('se dotika krožnice');
    expect(line('infinity')).toContain('edino točko');
    expect(line('infinity')).toContain('premice v neskončnosti');
    expect(line('equation')).toContain('X² + 2Y + 1 = 0');
    expect(visible(graph, 'Q₁')).toBe(true);
    expect(visible(graph, 'Q₂')).toBe(false);
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowDown'}); });
    expect(graph.model.c).toBe(9);
    expect(status()?.getAttribute('data-projective-status')).toBe('hyperbola');
    expect(line('status')).toContain('seka krožnico');
    expect(visible(graph, 'Q₂')).toBe(true);
    expect(visible(graph, 'Q₂′')).toBe(true);
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowDown', shiftKey: true}); });
    expect(graph.model.c).toBe(-1);
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowUp', ctrlKey: true}); });
    expect(graph.model.c).toBe(-1);
    expect(slider().value).toBe('-0.1');
});

test('the slider commits tenths (its value is c) and the type changes ellipse, parabola, hyperbola with the exact c = 1', () => {
    const graph = new Observed();
    mount(graph);
    const types: string[] = [];
    for (const value of ['20', '11', '10', '9', '0', '-10', '-11']) {
        act(() => { fireEvent.change(slider(), {target: {value: String(Number(value) / 10)}}); });
        types.push(String(status()?.getAttribute('data-projective-status')));
        expect(graph.model.c).toBe(Number(value));
    }
    expect(types).toEqual(['ellipse', 'ellipse', 'parabola', 'hyperbola', 'hyperbola', 'parabola', 'ellipse']);
    act(() => { fireEvent.change(slider(), {target: {value: '0'}}); });
    expect(line('infinity')).toContain('(−1, 1)');
    expect(line('infinity')).toContain('(1, 1)');
    expect(line('infinity')).toContain('asimptot');
    expect(line('equation')).toContain('X² − Y² + 1 = 0');
});

test('the hyperbola is drawn as one polyline broken once (two branches, never joined)', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.setCTenths(0); });
    const conic = curves(graph).filter(c => c.evalVisProp('visible') !== false && (c.dataX ?? []).some(Number.isNaN));
    expect(conic).toHaveLength(1);
    expect(conic[0].dataX!.filter(Number.isNaN)).toHaveLength(1);
    act(() => { graph.setCTenths(20); });
    expect(curves(graph).filter(c => (c.dataX ?? []).some(Number.isNaN))).toHaveLength(0);
});

test('the optional point toggle shows P and its image, an angle control moves it, and a point on L maps to infinity', () => {
    const graph = new Observed();
    mount(graph);
    const angle = screen.getByRole('slider', {name: /Kot točke P/}) as HTMLInputElement;
    expect(angle).toHaveAttribute('aria-disabled', 'true');
    act(() => { fireEvent.click(screen.getByLabelText(/Točka P na krožnici/)); });
    expect(graph.model.pointOn).toBe(true);
    expect(angle).not.toHaveAttribute('aria-disabled');
    expect(visible(graph, 'P')).toBe(true);
    expect(visible(graph, 'P′')).toBe(true);
    expect(line('point')).toContain('se preslika v');
    const p = pointOf(graph, 'P');
    expect(p.X()).toBeCloseTo(-6 + 2 * Math.cos(Math.PI / 4), 12);
    act(() => { fireEvent.change(angle, {target: {value: '90'}}); });
    expect(graph.model.angle).toBe(6);
    expect([pointOf(graph, 'P').X(), pointOf(graph, 'P').Y()]).toEqual([-6, 2]);
    // c = 1: the top of the circle lies on L, its image is a point at infinity
    act(() => { graph.setCTenths(10); });
    expect(line('point')).toContain('leži na premici L');
    expect(visible(graph, 'P′')).toBe(true);
    act(() => { fireEvent.click(screen.getByLabelText(/Točka P na krožnici/)); });
    expect(graph.model.pointOn).toBe(false);
    expect(visible(graph, 'P')).toBe(false);
    expect(line('point')).toBe('');
});

test('a language switch updates the controls, the aria label, the readout and the board text and keeps the model', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.setCTenths(5); });
    const model = graph.model;
    expect(container(graph).getAttribute('aria-label')).toContain('Ena stožnica v treh pogledih');
    expect(boardTexts(graph).join(' ')).toContain('Izvirna ravnina');
    expect(boardTexts(graph).join(' ')).toContain('Slika: hiperbola');
    expect(boardTexts(graph).join(' ')).toContain('L: y = 0,5');
    expect(line('status')).toContain('seka krožnico');
    act(() => { setLanguage('en'); });
    expect(container(graph).getAttribute('aria-label')).toContain('One conic in three views');
    expect(boardTexts(graph).join(' ')).toContain('Source plane');
    expect(boardTexts(graph).join(' ')).toContain('Image: hyperbola');
    expect(boardTexts(graph).join(' ')).toContain('L: y = 0.5');
    expect(boardTexts(graph).join(' ')).not.toContain('Izvirna ravnina');
    expect(line('status')).toContain('cuts the circle');
    expect(slider()).toBeTruthy();
    expect(graph.model).toBe(model);
});

test('a Preset import replaces the model and the board; an invalid file is refused and the model stays', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.importPresetData({c: -3, pointOn: true, angle: 9}); });
    expect(graph.model).toEqual({c: -3, pointOn: true, angle: 9});
    expect(slider().value).toBe('-0.3');
    expect(status()?.getAttribute('data-projective-status')).toBe('hyperbola');
    expect(visible(graph, 'P')).toBe(true);
    expect('rejection' in graph.presetCollection().check({c: 26, pointOn: false, angle: 0})).toBe(true);
    expect('rejection' in graph.presetCollection().check({c: 1, pointOn: 'yes', angle: 0})).toBe(true);
    expect(graph.presetCollection().check({c: 1, pointOn: true, angle: 2})).toEqual({data: {c: 1, pointOn: true, angle: 2}});
    const graphState: object = graph.exportPreset().graphState ?? {};
    expect('model' in graphState).toBe(false);
    expect(graph.exportPresetData()).toEqual({c: -3, pointOn: true, angle: 9});
});

test('the app-level Reset restores the default controls and board; there is no second Reset button', async () => {
    const graph = new Observed();
    mount(graph);
    expect(screen.queryByRole('button', {name: /Ponastavi/})).toBeNull();
    act(() => { graph.setCTenths(-7); graph.togglePoint(true); graph.placePoint(11); });
    expect(status()?.getAttribute('data-projective-status')).toBe('hyperbola');
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = graph.reset(); });
    await act(async () => { await pending; });
    expect(graph.model).toEqual(DEFAULT_THREE_VIEWS_MODEL);
    expect(slider().value).toBe('2');
    expect((screen.getByLabelText(/Točka P na krožnici/) as HTMLInputElement).checked).toBe(false);
    expect(status()?.getAttribute('data-projective-status')).toBe('ellipse');
    expect(visible(graph, 'P')).toBe(false);
    expect(visible(graph, 'Q₁')).toBe(false);
});

test('unmount removes the listener, the attributes and every scene object; a StrictMode remount draws the scene once', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    const box = container(graph);
    expect(named(graph, 'point', 'P')).toHaveLength(1);
    expect(box.getAttribute('tabindex')).toBe('0');
    const board = graph.liveBoard();
    const mine = [...graph['drawn']!.all];
    const remove = vi.spyOn(box, 'removeEventListener');
    const removed: unknown[] = [];
    const removeObject = board.removeObject.bind(board);
    vi.spyOn(board, 'removeObject').mockImplementation((...args: Parameters<typeof board.removeObject>) => { removed.push(...[args[0]].flat()); return removeObject(...args); });
    view.unmount();
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.hasAttribute('tabindex')).toBe(false);
    expect(box.hasAttribute('aria-label')).toBe(false);
    expect(() => fireEvent.keyDown(box, {key: 'ArrowRight'})).not.toThrow();
    expect(mine.length).toBeGreaterThan(10);
    // this graph's own removeDrawn took its objects off the board (not just the board teardown)
    expect(mine.filter(object => !removed.includes(object))).toEqual([]);
    expect(mine.filter(object => (board.objectsList as unknown[]).includes(object))).toEqual([]);
});

test('the off-window note shows for c = 0.9, disappears for c = 0.5 and follows the language', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.setCTenths(9); });
    expect(line('clipped')).toContain('zunaj tega pogleda');
    expect(boardTexts(graph).join(' ')).toContain('zunaj tega pogleda');
    act(() => { setLanguage('en'); });
    expect(line('clipped')).toContain('outside this view');
    expect(boardTexts(graph).join(' ')).toContain('outside this view');
    act(() => { graph.setCTenths(5); });
    expect(line('clipped')).toBe('');
    expect(boardTexts(graph).join(' ')).not.toContain('outside this view');
});

test('the angle slider reads its value in degrees', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.togglePoint(true); graph.placePoint(4); });
    const angle = screen.getByRole('slider', {name: /Kot točke P/}) as HTMLInputElement;
    expect(angle.getAttribute('aria-valuetext')).toBe('60°');
});

test('the angle slider says why it is unavailable while the point is off, and typed values off the grid are snapped with a notice', () => {
    const graph = new Observed();
    mount(graph);
    expect(document.body.textContent).toContain('Kot je na voljo, ko je točka P na krožnici vključena.');
    act(() => { graph.togglePoint(true); });
    expect(document.body.textContent).not.toContain('Kot je na voljo');
    const before = graph.model.c;
    typeNumber(/Višina premice L.*vrednost/, '0.26');
    expect(graph.model.c).toBe(3);
    expect(before).not.toBe(3);
    expect(document.body.textContent).toContain('0,3');
    expect(screen.getByRole('slider', {name: /Višina premice L/}).getAttribute('aria-valuetext')).toBe('c = 0,3');
    typeNumber(/Višina premice L.*vrednost/, '0.3');
    expect(graph.model.c).toBe(3);
    typeNumber(/Višina premice L.*vrednost/, '9');
    expect(graph.model.c).toBe(3);
});
