import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {
    BAR_BASE, CELL_POOL, HANDLE_TOUCH_RADIUS, HIT_SLACK, LatticePathGraph, triangleRows, triangleX, triangleY, VIEW_BOX,
} from './LatticePathGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** Exposes the board and the protected disposal the scene replacement calls. */
class ObservedGraph extends LatticePathGraph {
    liveBoard() { return this.board; }
    disposeNow() { this.disposeFigureScene(); }
}

function mountGraph(strict = false) {
    const graph = new ObservedGraph();
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

type EventedPoint = JXG.Point & {eventHandlers: Record<string, unknown[]>; triggerEventHandlers(names: string[], args: unknown[]): void};
const handlerCounts = (point: JXG.Point) =>
    (['drag', 'over', 'out'] as const).map(name => (point as EventedPoint).eventHandlers[name]?.length ?? 0);
function dragHandleTo(point: JXG.Point, x: number, y: number) {
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    act(() => { (point as EventedPoint).triggerEventHandlers(['drag'], []); });
}

type Probe = {elType: string; evalVisProp(name: string): unknown; X?: () => number; Y?: () => number; dataX?: number[]; dataY?: number[]};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const shownCaptions = (graph: ObservedGraph) =>
    probes(graph).filter(o => o.elType === 'text' && o.evalVisProp('visible')).map(o => (o as unknown as {plaintext: string}).plaintext);
/** The curves in creation order, with the number of separate polylines in each (NaN breaks plus one; none for empty data). */
const curves = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'curve').map(o => ({
    x: o.dataX ?? [], y: o.dataY ?? [], shown: Boolean(o.evalVisProp('visible')),
    polylines: (o.dataX ?? []).length === 0 ? 0 : (o.dataX ?? []).filter(Number.isNaN).length + 1,
}));
const finite = (values: number[]) => values.filter(Number.isFinite);

const digits = (text: string | null | undefined) => (text ?? '').replace(/\s/g, '');
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const status = () => document.querySelector('[data-combinatorics-status]')!.textContent!;
const lattice = (key: 'a' | 'b' | 'route' | 'n' | 'c') => t(`combinatorics_lattice_${key}_label`);
const choose = (label: string, value: string) => act(() => { fireEvent.change(field(label), {target: {value}}); });
const chooseView = (view: 'paths' | 'triangle' | 'expansion') => choose(t('combinatorics_view_label'), view);
const set = (graph: ObservedGraph, patch: Parameters<ObservedGraph['setState']>[0]) => act(() => { graph.setState(patch); });
const pressKey = (label: string, key: string) => act(() => { fireEvent.keyDown(field(label), {key}); });
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
const D = t('combinatorics_step_right');
const G = t('combinatorics_step_up');
const letters = (route: string) => route.replace(/R/g, D).replace(/U/g, G);

/** An independent count: the cell-by-cell sum of the two cells a route can come from. */
function gridSum(a: number, b: number): bigint[][] {
    const grid = Array.from({length: a + 1}, () => Array<bigint>(b + 1).fill(1n));
    for (let x = 1; x <= a; x++) for (let y = 1; y <= b; y++) grid[x][y] = grid[x - 1][y] + grid[x][y - 1];
    return grid;
}

describe('paths view', () => {
    test('(5, 3): 56 routes, the formula, the last-step split 35 + 21, and the drawn polylines', () => {
        const {graph} = mountGraph();
        expect(graph.drawnView()).toBe('paths');
        expect(readout('count')).toBe('56');
        expect(readout('formula')).toBe('(8 nad 5) = 56'); // C(8, 5) = C(8, 3)
        expect(readout('last-right')).toBe('35');
        expect(readout('last-up')).toBe('21');
        expect(readout('last-sum')).toBe('35 + 21 = 56');
        expect(status()).toBe('Število poti do (5; 3): 56.');
        const [grid, all, right, up, selected] = curves(graph);
        expect(grid.polylines).toBe(6 + 4); // 6 columns and 4 rows of the 5 x 3 grid
        expect(all.polylines).toBe(56);
        expect(right.polylines).toBe(35);
        expect(up.polylines).toBe(21);
        expect(all.shown).toBe(true); // the split is off: one merged curve
        expect(right.shown || up.shown).toBe(false);
        expect(selected.polylines).toBe(1);
        expect(selected.x.length).toBe(9); // eight steps, nine corner points
        noBadText();
    });

    test('the split switch shows the 35 and 21 curves instead of the merged one', () => {
        const {graph} = mountGraph();
        set(graph, {split: true});
        const [, all, right, up] = curves(graph);
        expect([all.shown, right.shown, up.shown]).toEqual([false, true, true]);
        expect(shownCaptions(graph)).toContain(t('combinatorics_lattice_cap_split', {value0: D, value1: G}));
    });

    test('(6, 6): 924 routes, 49 count labels that each add the cell to the left and the cell below', () => {
        const {graph} = mountGraph();
        set(graph, {a: 6, b: 6, showCounts: true});
        expect(readout('count')).toBe('924');
        expect(curves(graph)[1].polylines).toBe(924);
        const sums = gridSum(6, 6);
        expect(sums[6][6]).toBe(924n);
        const cells = graph.cells();
        expect(cells.length).toBe(49);
        expect(CELL_POOL).toBeGreaterThanOrEqual(cells.length);
        for (const cell of cells) {
            expect(cell.value).toBe(sums[cell.x][cell.y]);
            if (cell.x >= 1 && cell.y >= 1) expect(cell.value).toBe(sums[cell.x - 1][cell.y] + sums[cell.x][cell.y - 1]);
        }
        const shown = shownCaptions(graph).map(digits);
        for (const value of ['1', '2', '6', '20', '70', '924']) expect(shown).toContain(value);
        expect(shown.filter(text => /^\d+$/.test(text)).length).toBe(49);
    });

    test('count labels are off until the switch is on', () => {
        const {graph} = mountGraph();
        expect(graph.cells()).toEqual([]);
        expect(shownCaptions(graph).filter(text => /^\d+$/.test(digits(text)))).toEqual([]);
        set(graph, {showCounts: true});
        expect(graph.cells().length).toBe(6 * 4);
    });

    test('paging: 93 pages of 10 routes; the last page holds 4; route 924 is DDDDDDGGGGGG and ends at (6, 6)', () => {
        const {graph} = mountGraph();
        set(graph, {a: 6, b: 6});
        expect(graph.lattice().pages).toBe(93);
        const routes = () => [...document.querySelectorAll('[data-combinatorics-routes] li')];
        expect(routes().length).toBe(10);
        expect(routes()[0].textContent).toBe(letters('UUUUUURRRRRR')); // route 1 starts upward
        enterNumber(screen.getByRole('spinbutton', {name: t('combinatorics_lattice_page_label')}), '93');
        expect(graph.state.route).toBe(920);
        expect(routes().length).toBe(4);
        expect(routes().map(li => li.getAttribute('data-route-index'))).toEqual(['920', '921', '922', '923']);
        expect(document.querySelector('[data-combinatorics-routes] li[aria-current="true"]')!.getAttribute('data-route-index')).toBe('920');
        enterNumber(field(lattice('route')), '924');
        expect(graph.state.route).toBe(923);
        expect(routes()[3].textContent).toBe(letters('RRRRRRUUUUUU'));
        expect(routes()[3].getAttribute('aria-current')).toBe('true');
        const selected = curves(graph)[4];
        expect(selected.x.slice(0, 7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(selected.y.slice(0, 7)).toEqual([0, 0, 0, 0, 0, 0, 0]); // along the bottom first
        expect([selected.x.at(-1), selected.y.at(-1)]).toEqual([6, 6]);
        expect(shownCaptions(graph)).toContain(t('combinatorics_lattice_cap_route', {value0: letters('RRRRRRUUUUUU')}));
        // the page buttons step by one page
        fireEvent.click(screen.getByRole('button', {name: t('decrease_count')}));
        expect(graph.state.route).toBe(910);
    });

    test('above the cap (13 steps) only the count is shown: no labels, no route list, no route or page field', () => {
        const {graph} = mountGraph();
        set(graph, {a: 7, b: 6, showCounts: true, split: true});
        expect(graph.lattice().enumerable).toBe(false);
        expect(digits(readout('count'))).toBe('1716'); // C(13, 6)
        expect(digits(status())).toContain('1716');
        expect(status()).toContain(t('combinatorics_lattice_over_cap', {value0: '12', value1: '13'}));
        expect(graph.cells()).toEqual([]);
        expect(shownCaptions(graph).filter(text => /^\d+$/.test(digits(text)))).toEqual([]);
        expect(shownCaptions(graph)).toContain(t('combinatorics_lattice_over_cap', {value0: '12', value1: '13'}));
        expect(curves(graph)[1].polylines).toBe(0);
        expect(curves(graph)[4].polylines).toBe(0);
        expect(document.querySelector('[data-combinatorics-routes]')).toBeNull();
        expect(screen.queryByLabelText(lattice('route'))).toBeNull();
        expect(screen.queryByRole('spinbutton', {name: t('combinatorics_lattice_page_label')})).toBeNull();
        expect(readout('route')).toBeUndefined();
        for (const key of ['combinatorics_lattice_show_counts', 'combinatorics_lattice_split'] as const) {
            expect(field(t(key)).getAttribute('aria-disabled')).toBe('true');
        }
        noBadText();
    });

    test('(10, 10) shows 184 756 and (20, 20) shows 137 846 528 820 with the language separator', () => {
        const {graph} = mountGraph();
        set(graph, {a: 10, b: 10});
        expect(readout('count')).toMatch(/^184\s756$/);
        expect(digits(readout('count'))).toBe('184756');
        set(graph, {a: 20, b: 20});
        expect(digits(readout('count'))).toBe('137846528820');
        expect(readout('count')).toMatch(/^137\s846\s528\s820$/);
        act(() => { setLanguage('en'); });
        expect(readout('count')).toBe('137,846,528,820');
    });

    test('a changed target resets the selected route to the first', () => {
        const {graph} = mountGraph();
        enterNumber(field(lattice('route')), '17');
        expect(graph.state.route).toBe(16);
        enterNumber(field(lattice('a')), '4');
        expect(graph.state.a).toBe(4);
        expect(graph.state.route).toBe(0);
        expect(readout('count')).toBe('35');
    });
});

describe('triangle view', () => {
    test('(4, 3) is row 7 place 4: 35 = 20 + 15, boxed with its two parents', () => {
        const {graph} = mountGraph();
        chooseView('triangle');
        set(graph, {a: 4, b: 3});
        expect(graph.drawnView()).toBe('triangle');
        expect(readout('position')).toBe(t('combinatorics_lattice_readout_position_value', {value0: '7', value1: '4'}));
        expect(readout('entry')).toBe('(7 nad 4) = 35');
        expect(readout('parent-left')).toBe('20');
        expect(readout('parent-right')).toBe('15');
        expect(readout('parents-sum')).toBe('35');
        expect(readout('row-sum')).toBe('128 = 2⁷');
        expect(status()).toBe('Vrstica 7, mesto 4: 35 = 20 + 15.');
        const [entry, parents] = curves(graph);
        expect(entry.polylines).toBe(1);
        expect(Math.min(...finite(entry.x))).toBeCloseTo(10.05, 9);
        expect(Math.max(...finite(entry.x))).toBeCloseTo(11.55, 9);
        expect((Math.min(...finite(entry.y)) + Math.max(...finite(entry.y))) / 2).toBeCloseTo(9.7, 9);
        expect(triangleX(7, 4)).toBeCloseTo(10.8, 9);
        expect(triangleY(7)).toBeCloseTo(9.7, 9);
        expect(parents.polylines).toBe(2);
        // 20 sits left of and above the entry, 15 right of it
        expect(Math.min(...finite(parents.x))).toBeCloseTo(triangleX(6, 3) - 0.75, 9);
        expect(Math.max(...finite(parents.x))).toBeCloseTo(triangleX(6, 4) + 0.75, 9);
    });

    test('91 entries are drawn and they add up to 2^13 - 1', () => {
        const {graph} = mountGraph();
        chooseView('triangle');
        const entries = shownCaptions(graph).map(digits).filter(text => /^\d+$/.test(text));
        expect(entries.length).toBe(91);
        expect(entries.reduce((total, text) => total + BigInt(text), 0n)).toBe(8191n);
        expect(entries.filter(text => text === '924').length).toBe(1); // only the middle of row 12
    });

    test('an edge entry has one parent; an entry outside the view is named, not boxed', () => {
        const {graph} = mountGraph();
        chooseView('triangle');
        set(graph, {a: 0, b: 5});
        expect(readout('parent-left')).toBe('–');
        expect(readout('parent-right')).toBe('1');
        expect(curves(graph)[1].polylines).toBe(1);
        expect(status()).toContain('rob');
        set(graph, {a: 10, b: 10});
        expect(curves(graph)[0].polylines).toBe(0);
        expect(curves(graph)[1].polylines).toBe(0);
        expect(digits(status())).toContain('184756');
        expect(shownCaptions(graph)).toContain(t('combinatorics_lattice_cap_triangle_off', {value0: '20'}));
        noBadText();
    });
});

describe('expansion view', () => {
    test('(x + 2)^5 has coefficients 1, 10, 40, 80, 80, 32 that add up to 3^5 = 243', () => {
        const {graph} = mountGraph();
        chooseView('expansion');
        expect(graph.drawnView()).toBe('expansion');
        const separator = t('combinatorics_list_separator');
        expect(readout('coefficients')).toBe(['1', '10', '40', '80', '80', '32'].join(separator));
        expect(readout('coefficient-sum')).toBe('3⁵ = 243');
        expect(readout('binomial')).toBe('(x + 2)⁵');
        const shown = shownCaptions(graph);
        for (const value of ['1', '10', '40', '80', '32']) expect(shown).toContain(value);
        expect(shown).toEqual(expect.arrayContaining(['x⁵', 'x⁴', 'x³', 'x²', 'x¹', 'x⁰']));
        expect(shown).not.toContain('x⁶');
        const [axis, bars] = curves(graph);
        expect(axis.polylines).toBe(1);
        expect(bars.polylines).toBe(6);
        expect(Math.max(...finite(bars.y))).toBeCloseTo(BAR_BASE + 7, 9); // the bars of 80 reach the full height 17.5
        expect(Math.max(...finite(bars.y))).toBeCloseTo(17.5, 9);
        expect(Math.min(...finite(bars.y))).toBe(BAR_BASE);
        // the bar of 10 is one eighth of the bar of 80
        const second = bars.y.slice(3, 5);
        expect(second[1] - second[0]).toBeCloseTo(7 * 10 / 80, 9);
    });

    test('n = 3, c = -3: 1, -9, 27, -27 with sum (-2)^3 = -8; the negative bar hangs below the line', () => {
        const {graph} = mountGraph();
        chooseView('expansion');
        set(graph, {n: 3, c: -3});
        const separator = t('combinatorics_list_separator');
        expect(readout('coefficients')).toBe(['1', '−9', '27', '−27'].join(separator));
        expect(readout('coefficient-sum')).toBe('(−2)³ = −8');
        expect(readout('binomial')).toBe('(x − 3)³');
        const bars = curves(graph)[1];
        expect(bars.polylines).toBe(4);
        // bar j = 1 holds -9 of the largest 27: it ends 7 * 9 / 27 below the line
        const tops = bars.y.filter(Number.isFinite).filter((_, i) => i % 2 === 1);
        expect(tops[1]).toBeCloseTo(BAR_BASE - 7 / 3, 9);
        expect(tops[1]).toBeCloseTo(8.1667, 4);
        expect(tops[2]).toBeCloseTo(BAR_BASE + 7, 9);
        expect(tops[3]).toBeCloseTo(BAR_BASE - 7, 9);
        expect(shownCaptions(graph)).toEqual(expect.arrayContaining(['−9', '27', '−27']));
        expect(status()).toContain('−8');
    });

    test('strings of a and b: n = 4 gives groups 1, 4, 6, 4, 1 and 16 strings; n = 6 names the limit instead', () => {
        const {graph} = mountGraph();
        chooseView('expansion');
        set(graph, {n: 4});
        const rows = [...document.querySelectorAll('[data-combinatorics-strings] tbody tr')];
        expect(rows.map(row => row.querySelectorAll('td')[0].textContent)).toEqual(['1', '4', '6', '4', '1']);
        const strings = rows.flatMap(row => row.querySelectorAll('td')[1].textContent!.split(' '));
        expect(strings.length).toBe(16);
        expect(new Set(strings).size).toBe(16);
        expect(strings.every(text => /^[ab]{4}$/.test(text))).toBe(true);
        set(graph, {n: 6});
        expect(document.querySelector('[data-combinatorics-strings]')).toBeNull();
        expect(document.querySelector('[data-combinatorics-strings-off]')!.textContent).toBe(t('combinatorics_lattice_strings_off', {value0: '5'}));
    });
});

describe('rebuild and state change', () => {
    test('a view change really rebuilds the scene; a state change inside a view does not', () => {
        const {graph} = mountGraph();
        const handle = graph.targetHandle()!;
        const owned = graph.ownedObjectCount();
        set(graph, {a: 4, b: 4});
        expect(graph.targetHandle()).toBe(handle);
        expect(graph.ownedObjectCount()).toBe(owned);
        expect([handle.X(), handle.Y()]).toEqual([4, 4]);
        chooseView('triangle');
        expect(graph.drawnView()).toBe('triangle');
        expect(graph.targetHandle()).toBeUndefined();
        expect(graph.ownedObjectCount()).not.toBe(owned);
        chooseView('paths');
        expect(graph.targetHandle()).not.toBe(handle);
        expect(graph.targetHandle()!.X()).toBe(4);
        expect(graph.ownedObjectCount()).toBe(owned);
    });

    test('every drawn object lies inside the view box in every view', () => {
        const {graph} = mountGraph();
        const [left, top, right, bottom] = VIEW_BOX;
        for (const view of ['paths', 'triangle', 'expansion'] as const) {
            chooseView(view);
            for (const o of probes(graph).filter(p => p.elType === 'curve')) {
                for (const x of finite(o.dataX ?? [])) { expect(x).toBeGreaterThanOrEqual(left); expect(x).toBeLessThanOrEqual(right); }
                for (const y of finite(o.dataY ?? [])) { expect(y).toBeGreaterThanOrEqual(bottom); expect(y).toBeLessThanOrEqual(top); }
            }
        }
        const box = graph.liveBoard().getBoundingBox();
        expect(box[0]).toBeLessThanOrEqual(left);
        expect(box[1]).toBeGreaterThanOrEqual(top);
    });
});

describe('target, keyboard and touch', () => {
    test('dragging snaps to the grid and clamps to 0..20; a non-finite position changes nothing', () => {
        const {graph} = mountGraph();
        const handle = graph.targetHandle()!;
        dragHandleTo(handle, 3.4, 2.6);
        expect([graph.state.a, graph.state.b]).toEqual([3, 3]);
        expect(readout('count')).toBe('20');
        expect([handle.X(), handle.Y()]).toEqual([3, 3]);
        dragHandleTo(handle, 25, -3);
        expect([graph.state.a, graph.state.b]).toEqual([20, 0]);
        expect(readout('count')).toBe('1');
        const before = graph.state;
        vi.spyOn(handle, 'X').mockReturnValue(NaN);
        act(() => { (handle as EventedPoint).triggerEventHandlers(['drag'], []); });
        expect(graph.state).toBe(before);
        vi.restoreAllMocks();
        noBadText();
    });

    test('dragging does not change the number of board objects or rebuild the scene', () => {
        const {graph} = mountGraph();
        const owned = graph.ownedObjectCount();
        const handle = graph.targetHandle()!;
        dragHandleTo(handle, 6, 2);
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(graph.targetHandle()).toBe(handle);
    });

    test('typing a number in a, b, the route, n and c snaps; text, out-of-range and fractional values are refused', () => {
        const {graph} = mountGraph();
        enterNumber(field(lattice('a')), '7');
        expect(graph.state.a).toBe(7);
        enterNumber(field(lattice('b')), '21');
        expect(graph.state.b).toBe(3);
        enterNumber(field(lattice('b')), 'tri');
        expect(graph.state.b).toBe(3);
        enterNumber(field(lattice('route')), '0');
        expect(graph.state.route).toBe(0);
        enterNumber(field(lattice('route')), '121');
        expect(graph.state.route).toBe(0); // 7 + 3 = 10 steps: C(10, 3) = 120 routes
        enterNumber(field(lattice('route')), '120');
        expect(graph.state.route).toBe(119);
        chooseView('expansion');
        enterNumber(field(lattice('n')), '4');
        enterNumber(field(lattice('c')), '-3');
        expect([graph.state.n, graph.state.c]).toEqual([4, -3]);
        enterNumber(field(lattice('n')), '13');
        expect(graph.state.n).toBe(4);
        // Out of range or not whole: refused, not clamped (the generic refusal is sharedControlBehaviour); the ranges are this graph's.
        const edits = graph as unknown as {editTarget(field: 'a' | 'b', value: number): boolean; editExpansion(field: 'n' | 'c', value: number): boolean};
        expect([edits.editTarget('a', 21), edits.editTarget('a', -1), edits.editTarget('b', 2.5), edits.editTarget('b', Number.NaN)]).toEqual([false, false, false, false]);
        expect([graph.state.a, graph.state.b]).toEqual([7, 3]);
        expect([edits.editExpansion('n', 21), edits.editExpansion('n', 1.5), edits.editExpansion('c', -10), edits.editExpansion('c', 10)]).toEqual([false, false, false, false]);
        expect([graph.state.n, graph.state.c]).toEqual([4, -3]);
        expect(edits.editTarget('a', 8)).toBe(true);
        expect(graph.state.a).toBe(8);
    });

    test('arrow keys step by 1, Page keys by 5 (the route by 10, n and c by 3)', () => {
        const {graph} = mountGraph();
        pressKey(lattice('a'), 'ArrowUp');
        expect(graph.state.a).toBe(6);
        pressKey(lattice('b'), 'ArrowDown');
        expect(graph.state.b).toBe(2);
        pressKey(lattice('route'), 'ArrowUp');
        expect(graph.state.route).toBe(1);
        pressKey(lattice('route'), 'PageUp');
        expect(graph.state.route).toBe(11);
        pressKey(lattice('a'), 'PageUp');
        expect(graph.state.a).toBe(11);
        chooseView('expansion');
        pressKey(lattice('n'), 'PageUp');
        expect(graph.state.n).toBe(8);
        pressKey(lattice('c'), 'PageDown');
        expect(graph.state.c).toBe(-1);
    });

    test('the target handle has a touch hit zone of at least 44 px across and a narrower mouse zone', () => {
        const {graph} = mountGraph();
        const board = graph.liveBoard() as unknown as {_inputDevice: string};
        const handle = graph.targetHandle()!;
        expect(2 * (HANDLE_TOUCH_RADIUS + HIT_SLACK)).toBeGreaterThanOrEqual(44);
        const [, x, y] = handle.coords.scrCoords;
        board._inputDevice = 'touch';
        expect(handle.hasPoint(x + 25, y)).toBe(true);
        expect(handle.hasPoint(x, y - 25)).toBe(true);
        expect(handle.hasPoint(x + 40, y)).toBe(false);
        board._inputDevice = 'mouse';
        expect(handle.hasPoint(x + 25, y)).toBe(false);
    });
});

describe('controls', () => {
    test('every numeric field and switch is described by the key help, which states the ranges', () => {
        mountGraph();
        const described = (label: string) => expect(field(label).getAttribute('aria-describedby') ?? '').toContain('combinatorics-lattice-input-help');
        for (const label of [lattice('a'), lattice('b'), lattice('route'), t('combinatorics_lattice_show_counts'), t('combinatorics_lattice_split')]) described(label);
        chooseView('triangle');
        for (const label of [lattice('a'), lattice('b')]) described(label);
        chooseView('expansion');
        for (const label of [lattice('n'), lattice('c')]) described(label);
        const help = document.getElementById('combinatorics-lattice-input-help')!.textContent!;
        expect(help).toContain('od 0 do 20');
        expect(help).toContain('od 0 do 12');
        expect(help).toContain('od −9 do 9');
        expect(help).toContain('Page gor');
    });

    test('the page setter names the page of the list; examples are chosen by a select with a custom entry', () => {
        const {graph} = mountGraph();
        expect(document.body.textContent).toContain('Poti na strani 1 od 6');
        expect(field(t('combinatorics_example_label')).value).toBe('5,3');
        choose(t('combinatorics_example_label'), '6,6');
        expect([graph.state.a, graph.state.b]).toEqual([6, 6]);
        enterNumber(field(lattice('a')), '9');
        expect(field(t('combinatorics_example_label')).value).toBe('custom');
        chooseView('expansion');
        choose(t('combinatorics_example_label'), '4,1');
        expect([graph.state.n, graph.state.c]).toEqual([4, 1]);
    });
});

describe('ownership', () => {
    test('mount, state change, view change, rebuild and unmount: objects and listeners are owned and released', () => {
        const {graph, view} = mountGraph();
        const board = graph.liveBoard();
        const owned = graph.ownedObjectCount();
        const base = board.objectsList.length - owned;
        expect(base).toBeGreaterThanOrEqual(0);
        const handle = graph.targetHandle()!;
        expect(graph.ownedListenerCount()).toBe(1);
        expect(handlerCounts(handle)).toEqual([1, 1, 1]);
        set(graph, {a: 4, b: 2, showCounts: true, split: true});
        expect(board.objectsList.length).toBe(base + owned);
        chooseView('triangle');
        expect(graph.ownedListenerCount()).toBe(0);
        expect(handlerCounts(handle)).toEqual([0, 0, 0]);
        expect(board.objectsList.length).toBe(base + graph.ownedObjectCount());
        chooseView('expansion');
        expect(board.objectsList.length).toBe(base + graph.ownedObjectCount());
        chooseView('paths');
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(board.objectsList.length).toBe(base + owned);

        const live = graph.targetHandle()!;
        graph.disposeNow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        expect(handlerCounts(live)).toEqual([0, 0, 0]);
        expect(board.objectsList.length).toBe(base);
        graph.initialize(); // a rebuild builds the same scene again
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(board.objectsList.length).toBe(base + owned);

        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
    });

    test('unmount releases the objects, the listeners and the board label of a live scene', () => {
        const {graph, view} = mountGraph();
        const handle = graph.targetHandle()!;
        expect(document.querySelector(`[aria-label="${t('combinatorics_lattice_board_label')}"]`)).not.toBeNull();
        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        expect(handlerCounts(handle)).toEqual([0, 0, 0]);
    });

    test('StrictMode mounts, unmounts and mounts again with the same number of objects as a plain mount', () => {
        const plain = mountGraph();
        const expected = {owned: plain.graph.ownedObjectCount(), board: plain.graph.liveBoard().objectsList.length};
        plain.view.unmount();
        const strict = mountGraph(true);
        expect(strict.graph.ownedObjectCount()).toBe(expected.owned);
        expect(strict.graph.liveBoard().objectsList.length).toBe(expected.board);
        expect(strict.graph.ownedListenerCount()).toBe(1);
        strict.view.unmount();
        expect(strict.graph.ownedObjectCount()).toBe(0);
    });
});

describe('language', () => {
    test('a language switch retranslates the status, the board label, the captions and the step letters', () => {
        const {graph} = mountGraph();
        set(graph, {a: 2, b: 1});
        expect(shownCaptions(graph)).toContain('cilj (2; 1)');
        expect(shownCaptions(graph)).toContain(`izbrana pot: ${G}${D}${D}`);
        expect([D, G]).toEqual(['D', 'G']);
        act(() => { setLanguage('en'); });
        expect(status()).toBe('Number of routes to (2, 1): 3.');
        expect(shownCaptions(graph)).toContain('target (2, 1)');
        expect(shownCaptions(graph).filter(text => /cilj|začetek/.test(text))).toEqual([]);
        expect(document.querySelector(`[aria-label="${t('combinatorics_lattice_board_label')}"]`)).not.toBeNull();
        expect(readout('route')).toContain('URR'); // the English step letters R and U
        expect(shownCaptions(graph)).toContain('selected route: URR');
    });
});

describe('review repairs', () => {
    const NOTICE = 'Pot in stran sta ponastavljeni na 1.';

    test('changing a or b while a later route is chosen says that the route and the page were reset to 1', () => {
        const {graph} = mountGraph();
        set(graph, {route: 5});
        expect(status()).not.toContain(NOTICE);
        enterNumber(field(lattice('a')), '6');
        expect([graph.state.a, graph.state.route]).toEqual([6, 0]);
        expect(status()).toContain(NOTICE);
        enterNumber(field(lattice('b')), '4'); // the route is already the first: nothing was reset
        expect(graph.state.b).toBe(4);
        expect(status()).not.toContain(NOTICE);
        act(() => { setLanguage('en'); });
        set(graph, {route: 3});
        enterNumber(field(lattice('b')), '5');
        expect(status()).toContain('The route and the page were reset to 1.');
    });

    test('an example and a drag that reset a later route say so; moving the route does not', () => {
        const {graph} = mountGraph();
        set(graph, {route: 2});
        enterNumber(field(lattice('route')), '9');
        expect(graph.state.route).toBe(8);
        expect(status()).not.toContain(NOTICE);
        choose(t('combinatorics_example_label'), '10,10');
        expect([graph.state.a, graph.state.b, graph.state.route]).toEqual([10, 10, 0]);
        expect(status()).toContain(NOTICE);
        set(graph, {route: 4});
        const handle = graph.targetHandle()!;
        dragHandleTo(handle, 3, 3);
        expect([graph.state.a, graph.state.b, graph.state.route]).toEqual([3, 3, 0]);
        expect(status()).toContain(NOTICE);
        expect(graph.statusText()).toContain(NOTICE);
    });

    test('the Pascal rows are one constant; the route cache is dropped with the scene', () => {
        expect(triangleRows()).toBe(triangleRows());
        expect(triangleRows()[6]).toEqual([1n, 6n, 15n, 20n, 15n, 6n, 1n]);
        const {graph, view} = mountGraph();
        expect(graph.hasRouteCache()).toBe(true);
        graph.disposeNow();
        expect(graph.hasRouteCache()).toBe(false);
        view.unmount();
        expect(graph.hasRouteCache()).toBe(false);
    });
});

describe('the opening view frames the grid', () => {
    const boxOf = (graph: ObservedGraph) => graph.liveBoard().getBoundingBox() as [number, number, number, number];
    const share = (graph: ObservedGraph) => {
        const [left, top, right, bottom] = boxOf(graph);
        return {x: graph.state.a / (right - left), y: graph.state.b / (top - bottom)};
    };

    test('the default 5 x 3 grid fills a reasonable part of the board, with its captions inside', () => {
        const {graph} = mountGraph();
        const [left, top, right, bottom] = boxOf(graph);
        expect(share(graph).x).toBeGreaterThan(0.2);
        expect(share(graph).y).toBeGreaterThan(0.2);
        expect(left).toBeLessThanOrEqual(-1);
        expect(right).toBeGreaterThanOrEqual(graph.state.a + 1);
        expect(bottom).toBeLessThanOrEqual(-1);
        expect(top).toBeGreaterThanOrEqual(graph.state.b + 3.4);
    });

    test('a typed larger grid refits, the largest grid fits, and returning to another view restores the fixed box', () => {
        const {graph} = mountGraph();
        const small = boxOf(graph);
        act(() => { graph.setState({a: 20, b: 20}); });
        const [left, top, right, bottom] = boxOf(graph);
        expect(boxOf(graph)).not.toEqual(small);
        expect(left).toBeLessThanOrEqual(0);
        expect(right).toBeGreaterThanOrEqual(20);
        expect(bottom).toBeLessThanOrEqual(0);
        expect(top).toBeGreaterThanOrEqual(23.4);
        chooseView('triangle');
        const fixed = boxOf(graph);
        expect(fixed[0]).toBeLessThanOrEqual(VIEW_BOX[0]);
        expect(fixed[1]).toBeGreaterThanOrEqual(VIEW_BOX[1]);
    });

    test('restoring a checkpoint taken in another view keeps the stored view instead of refitting', () => {
        const {graph} = mountGraph();
        const capabilities = graph.getLessonCapabilities();
        act(() => { graph.liveBoard().setBoundingBox([-4, 9, 12, -3], true); });
        const checkpoint = capabilities.captureState();
        const stored = boxOf(graph);
        chooseView('triangle');
        act(() => { capabilities.restoreState(checkpoint); });
        expect(graph.state.view).toBe('paths');
        expect(boxOf(graph)).toEqual(stored);
    });

    test('dragging the target never moves the view', () => {
        const {graph} = mountGraph();
        const before = boxOf(graph);
        const handle = graph.targetHandle()!;
        dragHandleTo(handle, 6, 4);
        dragHandleTo(handle, 7, 5);
        expect([graph.state.a, graph.state.b]).toEqual([7, 5]);
        expect(boxOf(graph)).toEqual(before);
        act(() => { (handle as EventedPoint).triggerEventHandlers(['up'], []); });
        expect(boxOf(graph)).not.toEqual(before); // (7, 5) leaves the box of 5 x 3: refit once, after the drag
        expect(boxOf(graph)[2]).toBeGreaterThanOrEqual(7);
    });
});
