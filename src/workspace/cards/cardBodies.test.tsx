import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {TaylorGraph} from '../../graphs/functions/TaylorGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {normalise, renderDeclaration} from '../../graphs/base/declare/parity';
import type {GraphDeclaration, LegendEntry, ReadoutGroup} from '../../graphs/base/declare/graphDeclaration';
import {message, setLanguage} from '../../localization';
import {isLegendHidden, LegendBody, shownLegendEntries} from './LegendBody';
import {planGroupFolds, ReadoutsBody} from './ReadoutsBody';
import {SectionBody} from './SectionBody';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

function taylor() {
    const graph = new TaylorGraph();
    const mounted = mountGraph(graph);
    act(() => graph.performAction('show-error'));
    const declaration = graph.getDeclaration() as GraphDeclaration;
    const drawnObject = (id: string) => graph.drawnObject(id);
    // stays mounted (the board draws the objects `drawnObject` reads); testing-library unmounts after the test
    return {graph, declaration, drawnObject, mounted};
}

describe('planGroupFolds', () => {
    test('nothing folds when everything fits', () => expect(planGroupFolds([40, 40, 40], 120)).toEqual([]));
    test('folds later groups last first, never the first', () => {
        expect(planGroupFolds([40, 40, 40], 100, {foldedHeight: 10})).toEqual([2]);
        expect(planGroupFolds([40, 40, 40], 60, {foldedHeight: 10})).toEqual([1, 2]);
        expect(planGroupFolds([100, 40, 40], 10, {foldedHeight: 10})).toEqual([1, 2]);
    });
    test('a kept group does not fold', () => expect(planGroupFolds([40, 40, 40], 60, {foldedHeight: 10, keep: new Set([2])})).toEqual([1]));
    test('an empty list folds nothing', () => expect(planGroupFolds([], 0)).toEqual([]));
});

describe('ReadoutsBody', () => {
    test('shows the declaration rows with the values the panel text has', () => {
        const {declaration, drawnObject} = taylor();
        const {container} = render(<ReadoutsBody formula={declaration.formula} groups={declaration.readouts ?? []} notes={declaration.notes} legend={declaration.legend} drawnObject={drawnObject}/>);
        const expected = renderDeclaration(declaration).rows;
        expect(expected.length).toBeGreaterThan(0);
        for (const row of expected) {
            const cell = container.querySelector(`[data-readout="${row.id}"]`);
            expect(cell, row.id).not.toBeNull();
            expect(normalise(cell!.querySelector('.ws-value')!.textContent!), row.id).toContain(row.value);
        }
        expect(container.querySelectorAll('[data-readout]')).toHaveLength(expected.length);
        expect(container.querySelector('[data-formula]')).not.toBeNull();
        for (const row of container.querySelectorAll('[data-readout]')) expect(row.hasAttribute('data-card-row')).toBe(true);
    });

    test('rows that link a legend entry show a swatch in the drawn colour', () => {
        const {declaration, drawnObject} = taylor();
        const {container} = render(<ReadoutsBody groups={declaration.readouts ?? []} legend={declaration.legend} drawnObject={drawnObject}/>);
        const linked = (declaration.readouts ?? []).flatMap(group => group.rows).filter(row => row.legend !== undefined);
        expect(linked.length).toBeGreaterThan(0);
        for (const row of linked) {
            const entry = declaration.legend!.find(candidate => candidate.id === row.legend)!;
            expect(container.querySelector(`[data-readout="${row.id}"] [data-swatch]`)?.getAttribute('data-color'), row.id).toBe(drawnObject(entry.object)?.color);
        }
    });

    test('highlight marks exactly the named rows', () => {
        const {declaration} = taylor();
        const ids = (declaration.readouts ?? []).flatMap(group => group.rows).map(row => row.id);
        const {container} = render(<ReadoutsBody groups={declaration.readouts ?? []} highlight={[ids[0], ids[1]]}/>);
        const marked = [...container.querySelectorAll('[data-highlight]')].map(element => element.getAttribute('data-readout'));
        expect(marked).toEqual([ids[0], ids[1]]);
    });

    test('notes: the first shows, the rest sit behind "Opombe (n)"', () => {
        const notes = [{id: 'a', text: message('workspace_notes_less')}, {id: 'b', text: message('workspace_group_open', {title: 'B'})}, {id: 'c', text: message('workspace_group_open', {title: 'C'})}];
        const groups: ReadoutGroup[] = [{id: 'g', rows: []}];
        const {container} = render(<ReadoutsBody groups={groups} notes={notes}/>);
        expect(container.querySelectorAll('[data-note]')).toHaveLength(1);
        fireEvent.click(screen.getByRole('button', {name: 'Opombe (2)'}));
        expect(container.querySelectorAll('[data-note]')).toHaveLength(3);
        expect(screen.getByRole('button', {name: 'Skrij opombe'}).getAttribute('aria-expanded')).toBe('true');
    });

    test('a highlighted note among the rest opens the disclosure', () => {
        const notes = [{id: 'a', text: message('workspace_notes_less')}, {id: 'b', text: message('workspace_notes_less')}];
        const {container} = render(<ReadoutsBody groups={[]} notes={notes} highlight={['b']}/>);
        expect(container.querySelector('[data-note="b"][data-highlight]')).not.toBeNull();
    });

    test('later titled groups fold behind their title when the room is short, and open on click', () => {
        const row = (id: string) => ({id, value: {kind: 'formatted' as const, text: '1'}});
        const groups: ReadoutGroup[] = [
            {id: 'one', title: message('workspace_notes_less'), rows: [row('r1')]},
            {id: 'two', title: message('workspace_notes_less'), rows: [row('r2')]},
        ];
        const heights: Record<string, number> = {'ws-group': 50, 'ws-group-title': 10};
        const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {configurable: true, get() { return heights[(this as HTMLElement).className.split(' ')[0]] ?? 0; }});
        try {
            const {container} = render(<ReadoutsBody groups={groups} available={70}/>);
            expect(container.querySelector('[data-readout="r1"]')).not.toBeNull();
            expect(container.querySelector('[data-readout="r2"]')).toBeNull();
            fireEvent.click(within(container.querySelector('[data-group="two"]') as HTMLElement).getByRole('button'));
            expect(container.querySelector('[data-readout="r2"]')).not.toBeNull();
        } finally {
            Object.defineProperty(HTMLElement.prototype, 'offsetHeight', original);
        }
    });
});

describe('LegendBody', () => {
    test('lists the drawn entries with the board colours', () => {
        const {declaration, drawnObject} = taylor();
        const {container} = render(<LegendBody legend={declaration.legend ?? []} drawnObject={drawnObject}/>);
        const shown = shownLegendEntries(declaration.legend ?? [], drawnObject);
        expect(shown.length).toBeGreaterThan(1);
        expect(container.querySelectorAll('[data-legend-entry]')).toHaveLength(shown.length);
        for (const {entry, color} of shown) expect(container.querySelector(`[data-legend-entry="${entry.id}"] [data-swatch]`)?.getAttribute('data-color')).toBe(color);
    });

    test('a single-entry legend renders nothing and reports hidden', () => {
        const legend: LegendEntry[] = [{id: 'a', label: message('workspace_notes_less'), kind: 'line', object: 'a'}];
        const hidden = vi.fn();
        const {container} = render(<LegendBody legend={legend} drawnObject={() => ({color: '#123456', visible: true})} onHiddenChange={hidden}/>);
        expect(container.firstChild).toBeNull();
        expect(hidden).toHaveBeenLastCalledWith(true);
        expect(isLegendHidden(shownLegendEntries(legend, () => ({color: 'red', visible: true})))).toBe(true);
    });

    test('invisible objects and entries linked from a row are dropped', () => {
        const legend: LegendEntry[] = ['a', 'b', 'c'].map(id => ({id, label: message('workspace_notes_less'), kind: 'line', object: id}));
        const shown = shownLegendEntries(legend, id => ({color: 'red', visible: id !== 'b'}), new Set(['c']));
        expect(shown.map(entry => entry.entry.id)).toEqual(['a']);
    });
});

describe('SectionBody', () => {
    test('writes through the prop with the declared key', () => {
        const {declaration} = taylor();
        const parameters = declaration.parameters ?? [];
        const values: Record<string, unknown> = {'taylor-example': 'exp', 'taylor-degree': 3, 'taylor-x': 1, 'taylor-center': 0};
        const write = vi.fn();
        const perform = vi.fn();
        const view = render(<SectionBody parameters={parameters} read={key => values[key]} write={write} perform={perform}
            actions={[{id: 'show-error', label: message('workspace_notes_less'), placement: 'tools', enabled: true, pressed: false}]}/>);
        // a range is a slider, a count a spinbutton, a choice a select
        const slider = within(view.container).getAllByRole('slider')[0];
        const range = parameters.find(parameter => parameter.kind === 'range')!;
        if (range.kind !== 'range') throw new Error('unreachable');
        const target = range.max;
        expect(target).not.toBe(values[range.key]);
        fireEvent.change(slider, {target: {value: String(target)}});
        expect(write).toHaveBeenCalledWith(range.key, target);
        expect(within(view.container).getAllByRole('spinbutton').length).toBeGreaterThan(0);
        fireEvent.click(within(view.container).getByRole('button', {name: /Povečaj|Increase|\+/}));
        expect(write).toHaveBeenCalledWith('taylor-degree', 4);
        fireEvent.change(within(view.container).getByRole('combobox'), {target: {value: 'sine'}});
        expect(write).toHaveBeenCalledWith('taylor-example', 'sine');
        const action = within(view.container).getByRole('button', {name: 'Skrij opombe'});
        expect(action.getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(action);
        expect(perform).toHaveBeenCalledWith('show-error');
    });

    test('an action without pressed carries no aria-pressed', () => {
        render(<SectionBody read={() => undefined} write={vi.fn()} perform={vi.fn()}
            actions={[{id: 'go', label: message('workspace_notes_less'), placement: 'tools', enabled: true}]}/>);
        expect(screen.getByRole('button').hasAttribute('aria-pressed')).toBe(false);
    });
});
