/**
 * PointSet on the shared point controls (controls task 2, slice P4): the shared behaviour contracts against the real graph through
 * the real host, then the decisions that PointSet implements (1 explicit coordinates, 3 and 7 silent clamp, 6 view policy).
 * Bare controls: `inputs/sharedControls.behaviour.test.tsx`.
 */
import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PointSetGraph} from './PointSetGraph';
import {PointSetControlActions, PointSetControls} from './PointSetControls';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT, settle} from '../base/realGraphTestHarness';
import {GRID_COORD_LIMIT} from '../../compgeo/grid';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {pointCollectionBehaviour, pointListBehaviour} from '../../inputs/sharedControlBehaviour';
import {setLanguage, t} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends PointSetGraph {
    box() { return this.board.getBoundingBox(); }

    setBox(box: [number, number, number, number]) { this.board.setBoundingBox(box, false); }

    liveBoard() { return this.board; }
}

const mount = (graph: PointSetGraph<string>) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const model = (points: Array<[number, number]>, extra: Partial<PointSetModel> = {}): PointSetModel =>
    ({mode: 'points', closed: false, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y})), ...extra});
const load = (graph: PointSetGraph<string>, next: PointSetModel) => act(() => { graph.loadModel(next); });
const container = (graph: Observed) => graph.liveBoard().containerObj as HTMLElement;
const key = (graph: Observed, init: KeyboardEventInit) => act(() => { fireEvent.keyDown(container(graph), init); });
const drag = (point: unknown) => (point as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(['drag'], []);
const named = (graph: Observed, name: string) => (graph.liveBoard().objectsList as Array<{name?: string; elType?: string}>).filter(o => o.elType === 'point' && o.name === name);
const WIDE: [number, number, number, number] = [-50, 50, 50, -50];

pointListBehaviour('PointSet point list', {
    section: 'edit', min: -GRID_COORD_LIMIT, max: GRID_COORD_LIMIT, step: 1, valid: 7, outOfRange: GRID_COORD_LIMIT + 1, integer: true,
    mount: async () => {
        const graph = new Observed();
        mount(graph);
        const field = () => screen.getByRole('spinbutton', {name: 'P1, x'});
        return {get field() { return field(); }, read: () => Number(field().getAttribute('aria-valuenow')), reset: () => settle(() => graph.reset()),
            rows: () => document.querySelectorAll('.point-list-row').length,
            selectButtons: () => [...document.querySelectorAll<HTMLElement>('.point-list-row .point-list-select')]};
    },
});

pointCollectionBehaviour('PointSet point collection', {
    section: 'edit', min: 0, max: 6,
    entry: {min: -GRID_COORD_LIMIT, max: GRID_COORD_LIMIT, step: 1, valid: 7, outOfRange: GRID_COORD_LIMIT + 1, integer: true},
    mount: async () => {
        const graph = new Observed({pointLimit: 6});
        mount(graph);
        const start = graph.model.points.length;
        const button = (name: string) => screen.getByRole('button', {name});
        return {
            get add() { return button(t('add_point')); }, get remove() { return button(t('point_controls_remove_selected')); },
            get addAt() { return button(t('point_controls_add_at')); },
            // With nothing left to select, the reason of Remove-selected is "no point is selected" (it comes before the count bound).
            refusalText: () => document.querySelector('[data-point-collection-reason]')?.textContent?.trim() || null,
            read: () => graph.model.points.length,
            select: () => { act(() => graph.select(0)); },
            entryFields: () => ['x', 'y'].map(axis => screen.getByRole('spinbutton', {name: t('point_controls_new_axis', {value0: axis})})),
            lastAddedAt: () => graph.model.points.length > start ? [graph.model.points.at(-1)!.x, graph.model.points.at(-1)!.y] : undefined,
            reset: () => settle(() => graph.reset()),
        };
    },
});

describe('PointSet typed add reports its refusal', () => {
    test('a refused typed add keeps the typed values and shows the notice text', () => {
        const addPoint = vi.fn(() => ({kind: 'range' as const}));
        const actions = new Proxy({addPoint}, {get: (target, name) => name in target ? target[name as 'addPoint'] : () => undefined}) as unknown as PointSetControlActions;
        render(<PointSetControls model={model([])} selected={undefined} addMode={false} notice={undefined} pointLimit={6} simplicity={undefined}
                                 coordinateLimit={20} overlays={[]} actions={actions}/>);
        const fields = ['x', 'y'].map(axis => screen.getByRole('spinbutton', {name: t('point_controls_new_axis', {value0: axis})}));
        fields.forEach((field, i) => { fireEvent.change(field, {target: {value: String(5 + i)}}); fireEvent.blur(field); });
        fireEvent.click(screen.getByRole('button', {name: t('point_controls_add_at')}));
        expect(addPoint).toHaveBeenCalledWith({x: 5, y: 6});
        expect(document.querySelector('[data-point-collection-reason]')?.textContent).toBe(t('pointset_out_of_range', {value0: 20}));
        expect(fields.map(field => field.getAttribute('aria-valuenow'))).toEqual(['5', '6']);
    });
});

describe('shared point decisions on PointSet', () => {
    test('decision 1: a default add goes one unit right of the last point; explicit coordinates win exactly', () => {
        const graph = new Observed();
        mount(graph);
        load(graph, model([[0, 0], [3, 2]]));
        act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj točko'})); });
        expect(graph.model.points.at(-1)).toEqual({x: 4, y: 2});
        act(() => { graph.addPointAt({x: -9, y: 5}); });
        expect(graph.model.points.at(-1)).toEqual({x: -9, y: 5});
    });

    test('decision 31: a default add at the coordinate limit never repeats an existing point', () => {
        const graph = new Observed({coordinateLimit: 20});
        mount(graph);
        load(graph, model([[19, 3], [20, 3]]));
        act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj točko'})); });
        expect(graph.model.points).toHaveLength(3);
        expect(graph.model.points.at(-1)).toEqual({x: 18, y: 3});
    });

    test('decision 3: a drag at the coordinate limit stops silently, with no notice', () => {
        const graph = new Observed({coordinateLimit: 20});
        mount(graph);
        load(graph, model([[0, 0], [1, 1], [2, 0]]));
        const p = named(graph, 'P1')[0] as unknown as JXG.Point;
        act(() => { p.moveTo([500, -500], 0); drag(p); });
        expect(graph.model.points[0]).toEqual({x: 20, y: -20});
        expect(graph.notice).toBeUndefined();
        expect(document.querySelector('[data-pointset-notice]')?.textContent).toBe('');
    });

    test('decision 7: an arrow step at the limit behaves like the drag; Shift is the big step', () => {
        const graph = new Observed({coordinateLimit: 20});
        mount(graph);
        load(graph, model([[8, 0], [1, 1], [2, 0]]));
        act(() => graph.select(0));
        key(graph, {key: 'ArrowRight', shiftKey: true});
        expect(graph.model.points[0]).toEqual({x: 18, y: 0});
        key(graph, {key: 'ArrowRight', shiftKey: true});
        expect(graph.model.points[0]).toEqual({x: 20, y: 0});
        key(graph, {key: 'ArrowRight'});
        expect(graph.model.points[0]).toEqual({x: 20, y: 0});
        key(graph, {key: 'ArrowDown'});
        expect(graph.model.points[0]).toEqual({x: 20, y: -1});
        expect(graph.notice).toBeUndefined();
    });

    test('keys: Delete removes the selection, Escape deselects', () => {
        const graph = new Observed();
        mount(graph);
        load(graph, model([[0, 0], [1, 1], [2, 0]]));
        act(() => graph.select(1));
        key(graph, {key: 'Escape'});
        expect(graph.selectedIndex).toBeUndefined();
        act(() => graph.select(1));
        key(graph, {key: 'Delete'});
        expect(graph.model.points).toHaveLength(2);
    });

    test('decision 6: an add or typed edit outside the view refits; inside never moves it; a drag never refits', () => {
        const graph = new Observed();
        mount(graph);
        load(graph, model([[0, 0], [1, 1], [2, 0]]));
        act(() => graph.setBox(WIDE));
        act(() => { graph.addPointAt({x: 5, y: 5}); });
        expect(graph.box()).toEqual(WIDE);
        act(() => { graph.addPointAt({x: 900, y: 900}); });
        expect(graph.box()).not.toEqual(WIDE);
        act(() => graph.setBox(WIDE));
        act(() => { graph.movePointTo(0, {x: 6, y: 6}); });
        expect(graph.box()).toEqual(WIDE);
        act(() => { graph.movePointTo(0, {x: -800, y: 3}); });
        expect(graph.box()).not.toEqual(WIDE);
        act(() => graph.setBox(WIDE));
        const p = named(graph, 'P2')[0] as unknown as JXG.Point;
        act(() => { p.moveTo([700, 700], 0); drag(p); });
        expect(graph.box()).toEqual(WIDE);
    });
});
