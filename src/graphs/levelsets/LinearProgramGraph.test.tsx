import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {READOUT_SETTLE_MS} from '../base/controls/LiveReadout';
import {en} from '../../localization/en';
import {sl} from '../../localization/sl';
import {setLanguage, t} from '../../localization';
import {DEFAULT_LP_STATE, type LpState} from '../../optimization/lpModel';
import LinearProgramGraph from './LinearProgramGraph';
import {lpPresetCollection} from './lpPresetCollection';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

function mountGraph() {
    const graph = new LinearProgramGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

const state = (constraints: LpState['constraints'], p: number, q: number, sweep = 0): LpState => ({constraints, objective: {p, q}, sweep});
const load = (graph: LinearProgramGraph, next: LpState) => act(() => { graph.importPresetData([['LinearProgram', next]]); });
const statusText = () => document.querySelector('[data-lp-status]')?.textContent ?? '';
const live = () => document.querySelector('[data-readout-live]')?.textContent ?? '';
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);

type EventedPoint = JXG.Point & {eventHandlers: Record<string, unknown[]>; triggerEventHandlers(names: string[], args: unknown[]): void};
const handlerCounts = (point: JXG.Point) => (['drag', 'over', 'out'] as const).map(name => (point as EventedPoint).eventHandlers[name]?.length ?? 0);
function dragHandleTo(point: JXG.Point, x: number, y: number) {
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    act(() => { (point as EventedPoint).triggerEventHandlers(['drag'], []); });
}

// Hand-checked instances, one per status (maximize p x + q y over x, y >= 0 and the rows).
const INSTANCES = {
    infeasible: state([{a: 1, b: 0, c: -1}], 1, 1), // x <= -1 and x >= 0
    unbounded: state([{a: -1, b: 1, c: 1}], 1, 1), // y <= x + 1: x + y grows along (1, 1)
    flat: state(DEFAULT_LP_STATE.constraints, 0, 0),
    unique: DEFAULT_LP_STATE, // 12 at (2, 3)
    segment: state(DEFAULT_LP_STATE.constraints, 1, 2), // x + 2y = 8 along (2, 3) - (0, 4)
    ray: state([{a: 1, b: -1, c: 0}], 1, -1), // x - y <= 0 everywhere on the ray x = y, value 0
};

describe('LinearProgramGraph', () => {
    it('shows the LS5 default: unique optimum 12 at (2; 3), four vertices, the walk', () => {
        const {graph} = mountGraph();
        expect(graph.state).toMatchObject({initialized: true, ...DEFAULT_LP_STATE});
        expect(statusText()).toBe('Največja vrednost 12 je v oglišču (2; 3) (točno).');
        expect(readout('status')).toBe(t('levelsets_graph_lp_status_unique'));
        expect(readout('vertex-count')).toBe('4');
        expect(readout('optimum')).toBe('12');
        expect(readout('walk-0')).toContain('(0; 0)');
        expect(readout('walk-2')).toContain('(2; 3)');
        expect(document.querySelector('[data-legend="optimum"]')).not.toBeNull();
        noBadText();
    });

    it.each([
        ['infeasible', 'levelsets_graph_lp_say_infeasible', 'levelsets_graph_lp_status_infeasible'],
        ['unbounded', 'levelsets_graph_lp_say_unbounded', 'levelsets_graph_lp_status_unbounded'],
        ['flat', 'levelsets_graph_lp_say_flat', 'levelsets_graph_lp_status_flat'],
        ['unique', 'levelsets_graph_lp_say_unique', 'levelsets_graph_lp_status_unique'],
        ['segment', 'levelsets_graph_lp_say_segment', 'levelsets_graph_lp_status_segment'],
        ['ray', 'levelsets_graph_lp_say_ray', 'levelsets_graph_lp_status_ray'],
    ] as const)('status %s: the sentence, the readout row and the solver status agree', (name, say, status) => {
        const {graph} = mountGraph();
        load(graph, INSTANCES[name]);
        expect(graph.solution().status).toBe(name);
        expect(readout('status')).toBe(t(status));
        const stem = sl[say].split('{value0}')[0];
        expect(statusText().startsWith(stem)).toBe(true);
        noBadText();
    });

    it('infeasible shows no optimum and no region legend; unbounded names the improving ray and no value', () => {
        const {graph} = mountGraph();
        load(graph, INSTANCES.infeasible);
        expect(readout('optimum')).toBeUndefined();
        expect(readout('vertex-count')).toBe('0');
        expect(document.querySelector('[data-legend="region"]')).toBeNull();
        load(graph, INSTANCES.unbounded);
        expect(readout('optimum')).toBeUndefined();
        expect(readout('ray')).toBe('(1; 1)');
        expect(statusText()).toContain('(1; 1)');
        expect(document.querySelector('[data-legend="clip"]')).not.toBeNull();
    });

    it('flat: every feasible point is optimal, value 0, no sweep line row', () => {
        const {graph} = mountGraph();
        load(graph, INSTANCES.flat);
        expect(readout('optimum')).toBe('0');
        expect(readout('optimal-0')).toBeUndefined();
        expect(readout('sweep')).toBeUndefined();
        expect(document.querySelector('[data-legend="sweep"]')).toBeNull();
    });

    it('segment: both end vertices of x + 2y = 8, value 8; ray: one vertex (0; 0), value 0', () => {
        const {graph} = mountGraph();
        load(graph, INSTANCES.segment);
        expect(readout('optimum')).toBe('8');
        expect([readout('optimal-0'), readout('optimal-1')].sort()).toEqual(['(0; 4)', '(2; 3)']);
        load(graph, INSTANCES.ray);
        expect(readout('optimum')).toBe('0');
        expect(readout('optimal-0')).toBe('(0; 0)');
        expect(readout('optimal-1')).toBeUndefined();
    });

    it('exact fractions with the decimal beside them, decimal comma and true minus', () => {
        const {graph} = mountGraph();
        load(graph, state([{a: 2, b: 1, c: 7}], 1, 0)); // maximize x: 7/2 at (7/2; 0)
        expect(readout('optimum')).toBe('7/2 ≈ 3,5');
        expect(readout('optimal-0')).toBe('(7/2; 0) ≈ (3,5; 0)');
        expect(statusText()).toContain('7/2 ≈ 3,5');
        load(graph, state([{a: -1, b: -1, c: -2}], -1, -1)); // x + y >= 2, maximize -x - y: value -2
        expect(readout('optimum')).toBe('−2');
        expect(readout('row-0')).toBe('−x − y ≤ −2');
        expect(document.body.textContent).not.toMatch(/-\d/);
        act(() => { setLanguage('en'); });
        load(graph, state([{a: 2, b: 1, c: 7}], 1, 0));
        expect(readout('optimum')).toBe('7/2 ≈ 3.5');
        expect(readout('optimal-0')).toBe('(7/2, 0) ≈ (3.5, 0)');
    });

    it('a state change updates the readouts; the solution is computed once per rows and objective', () => {
        const {graph} = mountGraph();
        const before = graph.computationCounts();
        act(() => { graph.setBound(0, 4); });
        expect(graph.state.constraints[0].c).toBe(4);
        expect(readout('row-0')).toBe('x + 2y ≤ 4');
        expect(graph.computationCounts().solution).toBe(before.solution + 1);
        graph.solution();
        graph.solution();
        expect(graph.computationCounts().solution).toBe(before.solution + 1);
        act(() => { graph.setSweep(5); });
        expect(graph.computationCounts().solution).toBe(before.solution + 1); // the sweep does not re-solve
        expect(readout('sweep')).toBe('3x + 2y = 5');
    });

    it('refuses an off-grid, out-of-range and zero-row entry and keeps the state', () => {
        const {graph} = mountGraph();
        const before = graph.state;
        expect(graph.setCoefficient(0, 'a', 1.5)).toBe(false);
        expect(graph.setCoefficient(0, 'a', 10)).toBe(false);
        expect(graph.setCoefficient(0, 'a', Number.NaN)).toBe(false);
        expect(graph.setBound(0, 31)).toBe(false);
        expect(graph.setBound(0, -31)).toBe(false);
        expect(graph.setBound(7, 3)).toBe(false);
        expect(graph.setObjective(0, 9.5)).toBe(false);
        expect(graph.setObjective(1, -10)).toBe(false);
        expect(graph.setSweep(101)).toBe(false);
        expect(graph.setSweep(0.5)).toBe(false);
        expect(graph.setRowCount(0)).toBe(false);
        expect(graph.setRowCount(6)).toBe(false);
        expect(graph.state).toBe(before);
        // Row 1 is x + 2y <= 8: a becomes 0 (allowed), then b = 0 would make the row 0x + 0y and is refused.
        act(() => { expect(graph.setCoefficient(0, 'a', 0)).toBe(true); });
        expect(graph.setCoefficient(0, 'b', 0)).toBe(false);
        expect(graph.state.constraints[0]).toEqual({a: 0, b: 2, c: 8});
    });

    it('refuses a typed value through the input and keeps the state', () => {
        const {graph} = mountGraph();
        const input = screen.getByRole('spinbutton', {name: t('number_field_label', {value0: t('levelsets_graph_lp_sweep')})});
        act(() => { fireEvent.change(input, {target: {value: '500'}}); fireEvent.blur(input); });
        expect(graph.state.sweep).toBe(DEFAULT_LP_STATE.sweep);
    });

    it('the row count adds x + y <= 30 and removes the last row', () => {
        const {graph} = mountGraph();
        act(() => { graph.setRowCount(3); });
        expect(graph.state.constraints[2]).toEqual({a: 1, b: 1, c: 30});
        expect(readout('row-2')).toBe('x + y ≤ 30');
        act(() => { graph.setRowCount(1); });
        expect(graph.state.constraints).toHaveLength(1);
        expect(readout('row-1')).toBeUndefined();
    });

    it('dragging the objective handle snaps to whole numbers; a drag beyond the range stops at the range edge', () => {
        const {graph} = mountGraph();
        const handle = graph.handle()!;
        dragHandleTo(handle, 4.4, -2.6);
        expect(graph.state.objective).toEqual({p: 4, q: -3});
        expect([handle.X(), handle.Y()]).toEqual([4, -3]);
        expect(readout('objective')).toBe(t('levelsets_graph_lp_objective_value', {value0: '4x − 3y'}));
        dragHandleTo(handle, 9.4, 0.2);
        expect(graph.state.objective).toEqual({p: 9, q: 0});
        dragHandleTo(handle, 12, 3);
        expect(graph.state.objective).toEqual({p: 9, q: 3});
        expect([handle.X(), handle.Y()]).toEqual([9, 3]);
        dragHandleTo(handle, -40, -9.4);
        expect(graph.state.objective).toEqual({p: -9, q: -9});
    });

    it('Preset round trip: export, JSON and check, import into a new graph reproduces the state and the sentence', () => {
        const first = mountGraph();
        load(first.graph, state([{a: 2, b: 1, c: 7}, {a: 1, b: 3, c: 12}], -2, 5, -7));
        const text = statusText();
        const json: unknown = JSON.parse(JSON.stringify(first.graph.exportPresetData()));
        const checked = lpPresetCollection.check(json);
        if (!('data' in checked)) throw new Error('rejected');
        first.view.unmount();
        const second = mountGraph();
        act(() => { second.graph.importPresetData(checked.data); });
        expect(second.graph.state).toMatchObject({constraints: [{a: 2, b: 1, c: 7}, {a: 1, b: 3, c: 12}], objective: {p: -2, q: 5}, sweep: -7});
        expect(statusText()).toBe(text);
        expect(second.graph.exportPresetData()).toEqual(checked.data);
        const rejected = lpPresetCollection.check([['LinearProgram', {...DEFAULT_LP_STATE, constraints: [{a: 0, b: 0, c: 1}]}]]);
        expect(rejected).toHaveProperty('rejection');
    });

    it('a language switch re-renders the sentences in English with a decimal point', () => {
        const {graph} = mountGraph();
        load(graph, state([{a: 2, b: 1, c: 7}], 1, 0));
        expect(statusText()).toContain('3,5');
        act(() => { setLanguage('en'); });
        expect(statusText()).toBe('The largest value 7/2 ≈ 3.5 is at the vertex (7/2, 0) ≈ (3.5, 0) (exact).');
        expect(document.body.textContent).not.toMatch(/Največja/);
    });

    it('announces through the one live region, settling after a change', () => {
        vi.useFakeTimers();
        const {graph} = mountGraph();
        expect(document.querySelectorAll('[data-readout-live]')).toHaveLength(1);
        const first = live();
        expect(first).toBe('Največja vrednost 12 je v oglišču (2; 3) (točno).');
        load(graph, INSTANCES.infeasible);
        expect(live()).toBe(first); // not yet: the readout settles first
        act(() => { vi.advanceTimersByTime(READOUT_SETTLE_MS); });
        expect(live()).toBe(statusText());
        expect(live()).toContain('Dopustnega območja ni');
        expect(document.querySelectorAll('[data-readout-live]')).toHaveLength(1);
        act(() => { setLanguage('en'); });
        expect(live()).toBe('There is no feasible region: the constraints exclude each other (exact).');
    });
});

describe('ownership', () => {
    it('unmount leaves no object, listener, handler or timer of this graph', () => {
        vi.useFakeTimers();
        // JSXGraph leaves a timer of its own for every redrawn text (text.js), measured with a state change from outside.
        const before = vi.getTimerCount();
        const reference = mountGraph();
        act(() => { reference.graph.setBound(0, 4); });
        reference.view.unmount();
        const plainDelta = vi.getTimerCount() - before;
        const afterPlain = vi.getTimerCount();

        const {graph, view} = mountGraph();
        const owned = graph.ownedObjectCount();
        expect(owned).toBeGreaterThan(0);
        expect(graph.ownedListenerCount()).toBeGreaterThan(0);
        const handle = graph.handle()!;
        expect(handlerCounts(handle)).toEqual([1, 1, 1]);
        act(() => { graph.setBound(0, 4); });
        expect(graph.ownedObjectCount()).toBe(owned); // a state change creates nothing
        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        expect(handlerCounts(handle)).toEqual([0, 0, 0]);
        expect(vi.getTimerCount() - afterPlain).toBe(plainDelta);
        expect(() => setLanguage('en')).not.toThrow();
    });

    it('changing the row count keeps the object count', () => {
        const {graph} = mountGraph();
        const owned = graph.ownedObjectCount();
        act(() => { graph.setRowCount(5); graph.setRowCount(2); graph.setSweep(4); });
        expect(graph.ownedObjectCount()).toBe(owned);
    });
});

describe('locale', () => {
    const names = (text: string) => (text.match(/\{value\d+\}/g) ?? []).sort().join(',');
    const keysIn = (file: string) => (fs.readFileSync(path.resolve(__dirname, file), 'utf8').match(/levelsets_graph_lp_\w+/g) ?? []);

    it('sl and en carry the same levelsets_graph_lp_ keys with the same placeholders', () => {
        const keys = Object.keys(sl).filter(key => key.startsWith('levelsets_graph_lp_'));
        expect(keys.length).toBeGreaterThan(60);
        for (const key of keys) {
            const enText = (en as Record<string, string>)[key];
            expect(enText, key).toBeDefined();
            expect(names(enText), key).toBe(names((sl as Record<string, string>)[key]));
        }
        expect(Object.keys(en).filter(key => key.startsWith('levelsets_graph_lp_'))).toHaveLength(keys.length);
    });

    it('every lp key used by the graph, its panel, scene and Preset collection exists in both languages', () => {
        const used = new Set(['LinearProgramGraph.tsx', 'LpPanels.tsx', 'lpScene.ts', 'lpPresetCollection.ts'].flatMap(keysIn));
        expect(used.size).toBeGreaterThan(40);
        for (const key of used) {
            expect(key in sl, `sl ${key}`).toBe(true);
            expect(key in en, `en ${key}`).toBe(true);
        }
    });
});
