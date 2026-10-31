import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CrossRatioGraph} from './CrossRatioGraph';
import {CROSS_RATIO_EXAMPLES} from './crossRatioModel';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends CrossRatioGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; X?: () => number; Y?: () => number; plaintext?: string; visProp?: {visible?: boolean}; visible?: boolean};
const objects = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const handles = (graph: Observed) => ['A', 'B', 'C', 'D', 'O', 'M', 'N'].map(name => objects(graph).find(o => o.elType === 'point' && o.name === name)!);
const coordinates = (graph: Observed) => handles(graph).map(p => [p.X!(), p.Y!()]);
const boardTexts = (graph: Observed) => objects(graph).filter(o => o.elType === 'text').map(o => o.plaintext ?? '');
const container = (graph: Observed) => graph.liveBoard().containerObj as HTMLElement;
const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const line = (name: string) => document.querySelector(`[data-projective-line="${name}"]`)?.textContent ?? '';
type Triggerable = {triggerEventHandlers(names: string[], args: unknown[]): void};
const trigger = (target: object, name: string, args: unknown[]): void => {
    if (!('triggerEventHandlers' in target) || typeof target.triggerEventHandlers !== 'function') throw new Error('Not a JSXGraph element.');
    const handlers: Triggerable['triggerEventHandlers'] = target.triggerEventHandlers.bind(target);
    handlers([name], args);
};

test('the default scene draws the handles at the grid positions and reads 9/8 as text and on the board', () => {
    const graph = new Observed();
    mount(graph);
    expect(coordinates(graph)).toEqual([[0, 0], [1, 0], [3, 0], [4, 0], [0, 5], [0, 1], [2, 2]]);
    expect(line('original-ratio')).toContain('9/8');
    expect(line('original-ratio')).toContain('1,125');
    expect(line('image-ratio')).toContain('9/8');
    expect(line('images')).toContain('B′ = (8/11, 15/11)');
    expect(document.querySelector('[data-projective-status]')?.getAttribute('data-projective-status')).toBe('ok');
    expect(boardTexts(graph).some(text => text.includes('9/8'))).toBe(true);
});

test('an image at infinity is marked in the text and the readout names the limit formula', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadExample('infinity'); });
    expect(document.querySelector('[data-projective-status]')?.getAttribute('data-projective-status')).toBe('ideal');
    expect(line('limit')).toContain('33/20');
    expect(line('images')).toContain('D′: točka v neskončnosti');
    expect(boardTexts(graph).some(text => text.includes('33/20'))).toBe(true);
    // the ideal point is never drawn as a finite point: every board coordinate stays small
    for (const object of objects(graph)) {
        if (object.elType !== 'point' || !object.X) continue;
        expect(Math.abs(object.X())).toBeLessThan(40);
        expect(Math.abs(object.Y!())).toBeLessThan(40);
    }
});

test('a centre on a line states that the projection is undefined and shows no ratio', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.moveHandleTo(4, 2, 0); });
    expect(document.querySelector('[data-projective-status]')?.getAttribute('data-projective-status')).toBe('undefined');
    expect(line('status')).toContain('ni določena');
    expect(document.querySelector('[data-projective-line="original-ratio"]')).toBeNull();
    expect(boardTexts(graph).join(' ')).not.toMatch(/NaN|Infinity/);
});

test('dragging snaps to the grid, keeps A-D on the line and keeps model and board equal', () => {
    const graph = new Observed();
    mount(graph);
    const [, b] = handles(graph) as unknown as JXG.Point[];
    act(() => { b.moveTo([2.6, 3.4], 0); trigger(b, 'drag', []); });
    expect(graph.model.params).toEqual([0, 3, 3, 4]);
    expect([b.X(), b.Y()]).toEqual([3, 0]);
    expect(graph.selectedHandle).toBe(1);
    expect(graph.model.example).toBe('custom');
    const centre = handles(graph)[4] as unknown as JXG.Point;
    act(() => { centre.moveTo([1.4, 6.6], 0); trigger(centre, 'drag', []); });
    expect(graph.model.centre).toEqual({x: 1, y: 7});
    expect([centre.X(), centre.Y()]).toEqual([1, 7]);
});

test('arrow keys step the selected handle one grid step; without a selection they do nothing', () => {
    const graph = new Observed();
    mount(graph);
    const before = graph.model;
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    expect(graph.model).toBe(before);
    act(() => { graph.select(2); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    expect(graph.model.params[2]).toBe(4);
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowUp'}); });
    expect(graph.model.params[2]).toBe(4);
    expect(coordinates(graph)[2]).toEqual([4, 0]);
    act(() => { graph.select(4); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowDown'}); });
    expect(graph.model.centre).toEqual({x: 0, y: 4});
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowDown', ctrlKey: true}); });
    expect(graph.model.centre).toEqual({x: 0, y: 4});
});

test('the example buttons and numeric fields edit the model', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Harmonična četverka'})); });
    expect(graph.model).toEqual(CROSS_RATIO_EXAMPLES.harmonic);
    expect(line('original-ratio')).toContain('−1');
    act(() => { fireEvent.change(screen.getByLabelText('Točka C: x'), {target: {value: '5'}}); });
    expect(graph.model.params[2]).toBe(5);
    expect(graph.model.example).toBe('custom');
});

test('a language switch updates the controls, the aria label and the board text and keeps the model', () => {
    const graph = new Observed();
    mount(graph);
    const model = graph.model;
    expect(container(graph).getAttribute('aria-label')).toContain('Središčna projekcija');
    expect(boardTexts(graph).some(text => text.includes('Dvorazmerje'))).toBe(true);
    act(() => { setLanguage('en'); });
    expect(container(graph).getAttribute('aria-label')).toContain('Central projection');
    expect(boardTexts(graph).some(text => text.includes('Cross-ratio of the original points'))).toBe(true);
    expect(boardTexts(graph).some(text => text.includes('Dvorazmerje'))).toBe(false);
    expect(line('original-ratio')).toContain('1.125');
    expect(graph.model).toBe(model);
});

test('unmount removes the listener and attributes and leaves no scene objects; a StrictMode remount draws the scene once', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    const box = container(graph);
    expect(handles(graph)).toHaveLength(7);
    expect(objects(graph).filter(o => o.elType === 'point' && o.name === 'A')).toHaveLength(1);
    expect(box.getAttribute('tabindex')).toBe('0');
    const board = graph.liveBoard();
    const remove = vi.spyOn(box, 'removeEventListener');
    view.unmount();
    const handlesLeft = (board.objectsList as Shown[]).filter(o => o.elType === 'point' && ['A', 'B', 'C', 'D', 'O', 'M', 'N'].includes(o.name ?? ''));
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.hasAttribute('tabindex')).toBe(false);
    expect(box.hasAttribute('aria-label')).toBe(false);
    expect(() => fireEvent.keyDown(box, {key: 'ArrowRight'})).not.toThrow();
    expect(handlesLeft).toEqual([]);
});

test('an import and Reset replace the model, move the handles, update the readout and clear the selection', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.select(2); });
    expect(graph.selectedHandle).toBe(2);
    act(() => { graph.importPresetData({...CROSS_RATIO_EXAMPLES.harmonic}); });
    expect(graph.model.params).toEqual([0, 6, 2, -6]);
    expect(coordinates(graph).slice(0, 4)).toEqual([[0, 0], [6, 0], [2, 0], [-6, 0]]);
    expect(line('original-ratio')).toContain('−1');
    expect(graph.selectedHandle).toBeUndefined();
    act(() => { graph.select(1); graph.importPresetData(graph.defaultPreset()); });
    expect(graph.model.params).toEqual([0, 1, 3, 4]);
    expect(line('original-ratio')).toContain('9/8');
    expect(graph.selectedHandle).toBeUndefined();
});

test('the live region holds the status and ratios only; an arrow step announces just the handle position', () => {
    const graph = new Observed();
    mount(graph);
    const live = document.querySelector('[data-projective-status]')!;
    expect(live.getAttribute('role')).toBe('status');
    expect(live.querySelector('[data-projective-line="originals"]')).toBeNull();
    expect(live.querySelector('[data-projective-line="images"]')).toBeNull();
    const nudge = () => document.querySelector('[data-projective-nudge]')!.textContent;
    expect(nudge()).toBe('');
    act(() => { graph.select(2); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    expect(nudge()).toBe('C: x = 4');
    act(() => { graph.select(4); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowUp'}); });
    expect(nudge()).toBe('O: x = 0, y = 6');
});

test('selecting a handle from the inspector moves the focus to the board so the arrow keys work', () => {
    const graph = new Observed();
    mount(graph);
    const button = screen.getByRole('button', {name: 'Izberi točko B'});
    button.focus();
    act(() => { fireEvent.click(button); });
    expect(document.activeElement).toBe(container(graph));
});

test('both lines carry a text label on the board', () => {
    const graph = new Observed();
    mount(graph);
    const names = objects(graph).filter(o => o.elType === 'line').map(o => o.name);
    expect(names).toEqual(['p', 'p′']);
});
