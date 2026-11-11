import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {BAR_BASE, BAR_HEIGHT, CountingTreeGraph, LETTER_POOL, TABLE_FIRST_ROW_Y, TREE_BOTTOM, TREE_LEFT, TREE_TOP, TREE_WIDTH, VIEW_BOX} from './CountingTreeGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** Exposes the board and the protected disposal the scene replacement calls. */
class ObservedGraph extends CountingTreeGraph {
    liveBoard() { return this.board; }
    disposeNow() { this.disposeFigureScene(); }
}

function mountGraph(strict = false) {
    const graph = new ObservedGraph();
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

type Probe = {elType: string; evalVisProp(name: string): unknown; X?: () => number; Y?: () => number; dataX?: number[]; dataY?: number[]};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const shown = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'text' && o.evalVisProp('visible'));
const shownCaptions = (graph: ObservedGraph) => shown(graph).map(o => (o as unknown as {plaintext: string}).plaintext);
const curves = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'curve').map(o => ({
    x: o.dataX ?? [], y: o.dataY ?? [], shown: Boolean(o.evalVisProp('visible')),
    polylines: (o.dataX ?? []).length === 0 ? 0 : (o.dataX ?? []).filter(Number.isNaN).length + 1,
}));
const finite = (values: number[]) => values.filter(Number.isFinite);

const digits = (text: string | null | undefined) => (text ?? '').replace(/\s/g, '');
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const status = () => document.querySelector('[data-combinatorics-status]')!.textContent!;
const choose = (label: string, value: string) => act(() => { fireEvent.change(field(label), {target: {value}}); });
const chooseView = (view: 'choices' | 'multiset' | 'row') => choose(t('combinatorics_view_label'), view);
const set = (graph: ObservedGraph, patch: Parameters<ObservedGraph['setState']>[0]) => act(() => { graph.setState(patch); });
const pressKey = (label: string, key: string) => act(() => { fireEvent.keyDown(field(label), {key}); });
const click = (label: string) => act(() => { fireEvent.click(field(label)); });
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
const nLabel = () => t('combinatorics_counting_n_label');
const kLabel = () => t('combinatorics_counting_k_label');
const rowNLabel = () => t('combinatorics_counting_row_n_label');
const rowKLabel = () => t('combinatorics_counting_row_k_label');
const tLabel = () => t('combinatorics_counting_t_label');
const letterLabel = (letter: string) => t('combinatorics_counting_letter_count', {value0: letter});
const exampleLabel = () => t('combinatorics_example_label');

/** An independent count by plain products: the falling factorial and the power. */
const falling = (n: number, k: number) => { let r = 1n; for (let i = 0; i < k; i++) r *= BigInt(n - i); return r; };
const fact = (n: number) => falling(n, n);

describe('choices: the table above the tree limit', () => {
    test('the default V(6, 3) = 120 opens as a table of the four kinds with the marker on the current kind', () => {
        const {graph} = mountGraph();
        expect(graph.drawnKey()).toBe('choices-table');
        expect(falling(6, 3)).toBe(120n);
        expect(digits(readout('count'))).toBe('120');
        expect(readout('kind')).toBe('Variacije');
        expect(digits(readout('leaves'))).toBe('120');
        expect(readout('product')).toBe('6 · 5 · 4 = 120');
        expect(status()).toBe('Variacije pri n = 6, k = 3: 120.');
        expect(graph.table().map(row => row.count)).toEqual([120n, 216n, 20n, 56n]); // 6!/3!, 6^3, C(6, 3), C(8, 3)
        const captions = shownCaptions(graph);
        for (const text of ['120', '216', '20', '56']) expect(captions.some(caption => caption.endsWith(` = ${text}`))).toBe(true);
        const markers = shown(graph).filter(o => (o as unknown as {plaintext: string}).plaintext === '▶');
        expect(markers.length).toBe(1);
        expect(markers[0].Y!()).toBe(TABLE_FIRST_ROW_Y);
        expect(captions.join(' ')).toContain(t('combinatorics_counting_table_note', {value0: '64'})); // wrapped into lines
        expect(curves(graph).length).toBe(0);
        noBadText();
    });

    test('the limit is the leaf count 64: 4^3 = 64 draws the tree, 5^3 = 125 and V(6, 3) = 120 do not', () => {
        const {graph} = mountGraph();
        set(graph, {n: 4, k: 3, repetition: true});
        expect(graph.drawnKey()).toBe('choices-tree');
        expect(4 ** 3).toBe(64);
        expect(shownCaptions(graph).join(' ')).not.toContain(t('combinatorics_counting_table_note', {value0: '64'}));
        set(graph, {n: 5});
        expect(graph.drawnKey()).toBe('choices-table');
        expect(digits(readout('count'))).toBe('125');
        expect(shownCaptions(graph).join(' ')).toContain(t('combinatorics_counting_table_note', {value0: '64'}));
        set(graph, {n: 4});
        expect(graph.drawnKey()).toBe('choices-tree');
        set(graph, {repetition: false, n: 5, k: 3}); // V(5, 3) = 60
        expect(graph.drawnKey()).toBe('choices-tree');
        expect(digits(readout('count'))).toBe('60');
        set(graph, {n: 6}); // V(6, 3) = 120
        expect(graph.drawnKey()).toBe('choices-table');
    });

    test('the books example 5! = 120 is a table; combinations C(6, 3) = 20 show 3! = 6 orderings and 120 / 6', () => {
        const {graph} = mountGraph();
        choose(exampleLabel(), 'books');
        expect([graph.state.n, graph.state.k]).toEqual([5, 5]);
        expect(fact(5)).toBe(120n);
        expect(digits(readout('count'))).toBe('120');
        expect(readout('product')).toBe('5 · 4 · 3 · 2 · 1 = 120');
        choose(exampleLabel(), 'combinations');
        expect(graph.counting().kind).toBe('combinations');
        expect(digits(readout('count'))).toBe('20');
        expect(readout('orderings')).toBe('3! = 6');
        expect(digits(readout('division'))).toBe('120/6=20');
        expect(readout('orderings-list')).toBe('123, 132, 213, 231, 312, 321');
        expect(shown(graph).filter(o => (o as unknown as {plaintext: string}).plaintext === '▶')[0].Y!()).toBe(TABLE_FIRST_ROW_Y - 2 * 3);
    });

    test('combinations with repetition C(8, 3) = 56 have no product and no orderings row; k! rows vanish for k = 0', () => {
        const {graph} = mountGraph();
        set(graph, {ordered: false, repetition: true});
        expect(digits(readout('count'))).toBe('56');
        expect(readout('product')).toBeUndefined();
        expect(readout('orderings')).toBeUndefined();
        set(graph, {ordered: false, repetition: false, k: 0});
        expect(digits(readout('count'))).toBe('1');
        expect(readout('orderings-list')).toBeUndefined();
        expect(readout('product')).toBe('1 = 1');
    });

    test('large values stay exact: V(20, 20) = 20! and 20^20, with the language separator', () => {
        const {graph} = mountGraph();
        set(graph, {n: 20, k: 20});
        expect(fact(20)).toBe(2432902008176640000n);
        expect(digits(readout('count'))).toBe('2432902008176640000');
        set(graph, {repetition: true});
        expect(digits(readout('count'))).toBe('104857600000000000000000000'); // 2^20 * 10^20
        act(() => { setLanguage('en'); });
        expect(readout('count')).toBe('104,857,600,000,000,000,000,000,000');
        noBadText();
    });
});

describe('choices: the tree', () => {
    test('4^3: 64 leaves, 4 + 16 + 64 = 84 edges from the root, the leaf strings 111 .. 444', () => {
        const {graph} = mountGraph();
        set(graph, {n: 4, k: 3, repetition: true});
        const tree = graph.tree();
        expect(tree.leaves.length).toBe(64);
        expect(new Set(tree.leaves.map(leaf => leaf.join(''))).size).toBe(64);
        expect(tree.leaves[0]).toEqual([1, 1, 1]);
        expect(tree.leaves[63]).toEqual([4, 4, 4]);
        const [edges] = curves(graph);
        expect(edges.polylines).toBe(4 + 16 + 64);
        expect(edges.x[0]).toBeCloseTo(TREE_LEFT + TREE_WIDTH / 2, 9); // the first edge starts at the root
        expect(edges.y[0]).toBe(TREE_TOP);
        expect(edges.y[1]).toBeCloseTo(TREE_TOP - (TREE_TOP - TREE_BOTTOM) / 3, 9);
        const leafTexts = shownCaptions(graph).filter(text => /^[1-4]{3}$/.test(text));
        expect(leafTexts.length).toBe(64);
        expect(leafTexts[0]).toBe('111');
        expect(leafTexts[63]).toBe('444');
        expect(digits(readout('leaves'))).toBe('64');
        expect(shownCaptions(graph)).toContain(t('combinatorics_counting_cap_tree'));
    });

    test('V(5, 3) = 60 has 5 + 20 + 60 edges and V(4, 4) = 24 has 4 + 12 + 24 + 24', () => {
        const {graph} = mountGraph();
        set(graph, {n: 5, k: 3});
        expect(graph.tree().leaves.length).toBe(60);
        expect(curves(graph)[0].polylines).toBe(85);
        set(graph, {n: 4, k: 4});
        expect(graph.tree().leaves.length).toBe(24);
        expect(curves(graph)[0].polylines).toBe(64);
        expect(readout('product')).toBe('4 · 3 · 2 · 1 = 24');
    });

    test('a leaf of the tree without repetition never repeats an item and the unordered kinds draw no tree', () => {
        const {graph} = mountGraph();
        set(graph, {n: 4, k: 3});
        for (const leaf of graph.tree().leaves) expect(new Set(leaf).size).toBe(3);
        set(graph, {ordered: false});
        expect(graph.drawnKey()).toBe('choices-table');
        expect(graph.tree().leaves.length).toBe(0);
    });

    test('n = 1, k = 20 with repetition is a single chain and n = 0, k = 0 a single empty leaf; neither draws bad text', () => {
        const {graph} = mountGraph();
        set(graph, {n: 1, k: 20, repetition: true});
        expect(graph.drawnKey()).toBe('choices-tree');
        expect(graph.tree().leaves.length).toBe(1);
        expect(curves(graph)[0].polylines).toBe(20);
        set(graph, {n: 0, k: 0});
        expect(graph.tree().leaves.length).toBe(1);
        expect(digits(readout('count'))).toBe('1');
        set(graph, {n: 0, k: 3});
        expect(graph.tree().leaves.length).toBe(0);
        expect(digits(readout('count'))).toBe('0');
        noBadText();
    });
});

describe('multiset view', () => {
    test('MISSISSIPPI: 11! / (1! 4! 4! 2!) = 34 650 and 11! = 39 916 800 if all letters were different', () => {
        const {graph} = mountGraph();
        choose(t('combinatorics_view_label'), 'multiset');
        expect(graph.drawnKey()).toBe('multiset');
        expect(fact(11) / (fact(1) * fact(4) * fact(4) * fact(2))).toBe(34650n);
        expect(readout('letters')).toBe('11');
        expect(digits(readout('arrangements'))).toBe('11!/(1!·4!·4!·2!)=34650');
        expect(digits(readout('all-different'))).toBe('11!=39916800');
        expect(status()).toContain('Razporeditve 11 črk, med katerimi se nekatere ponavljajo: ');
        expect(digits(status())).toMatch(/34650\.$/);
        const letters = shown(graph).map(o => (o as unknown as {plaintext: string}).plaintext).filter(text => /^[MISP]$/.test(text));
        expect(letters.join('')).toBe('MIIIISSSSPP');
        expect(curves(graph).map(c => c.polylines)).toEqual([1, 1, 1, 1]);
        expect(field(exampleLabel()).value).toBe('mississippi');
    });

    test('changing a letter count redraws: 9 letters give 9! / (1! 4! 4!) = 630; a kind of zero letters has no bar', () => {
        const {graph} = mountGraph();
        chooseView('multiset');
        enterNumber(field(letterLabel('P')), '0');
        expect(graph.state.counts).toEqual([1, 4, 4, 0]);
        expect(362880n / (fact(1) * fact(4) * fact(4))).toBe(630n);
        expect(digits(readout('arrangements'))).toBe('9!/(1!·4!·4!·0!)=630');
        expect(curves(graph).map(c => c.polylines)).toEqual([1, 1, 1, 0]);
        expect(field(exampleLabel()).value).toBe('custom');
    });

    test('the largest case, twelve letters of each kind, fits the letter pool and stays exact', () => {
        const {graph} = mountGraph();
        chooseView('multiset');
        for (const letter of ['M', 'I', 'S', 'P']) enterNumber(field(letterLabel(letter)), '12');
        expect(graph.state.counts).toEqual([12, 12, 12, 12]);
        expect(LETTER_POOL).toBe(48);
        const letters = shown(graph).map(o => (o as unknown as {plaintext: string}).plaintext).filter(text => /^[MISP]$/.test(text));
        expect(letters.length).toBe(48);
        expect(graph.multiset().count).toBe(fact(48) / (fact(12) ** 4n));
        expect(graph.multiset().total).toBe(48);
        noBadText();
    });

    test('no letters at all: 0! = 1 arrangement, no bad text', () => {
        const {graph} = mountGraph();
        set(graph, {view: 'multiset', counts: [0, 0, 0, 0]});
        expect(digits(readout('arrangements'))).toBe('0!/(0!·0!·0!·0!)=1');
        expect(curves(graph).map(c => c.polylines)).toEqual([0, 0, 0, 0]);
        noBadText();
    });
});

describe('row view', () => {
    test('row 10: 1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1 sums to 1024 = 2^10 and alternates to 0', () => {
        const {graph} = mountGraph();
        chooseView('row');
        choose(exampleLabel(), 'row10');
        expect(graph.drawnKey()).toBe('row');
        expect(graph.row().row).toEqual([1n, 10n, 45n, 120n, 210n, 252n, 210n, 120n, 45n, 10n, 1n]);
        expect(digits(readout('row-sum'))).toBe('1024=2¹⁰');
        expect(readout('alternating')).toBe('0');
        expect(digits(status())).toBe('Vrstica10:vsota1024,izmeničnavsota0.');
        const captions = shownCaptions(graph);
        for (const text of ['1', '10', '45', '120', '210', '252']) expect(captions).toContain(text);
        const [, plain, selected] = curves(graph);
        expect(plain.polylines).toBe(10);
        expect(selected.polylines).toBe(1);
        expect(selected.y[0]).toBe(BAR_BASE);
        expect(selected.y[1]).toBeCloseTo(BAR_BASE + BAR_HEIGHT, 9); // k = 5 is the tallest bar at t = 1/2
        expect(plain.y[1]).toBeCloseTo(BAR_BASE + BAR_HEIGHT / 252, 9); // C(10, 0) / C(10, 5)
        expect(shownCaptions(graph)).toContain(t('combinatorics_counting_cap_row', {value0: '10'}));
    });

    test('the hockey stick 1 + 4 + 10 + 20 + 35 = 70 = C(8, 4) for n = 7, k = 3', () => {
        const {graph} = mountGraph();
        chooseView('row');
        choose(exampleLabel(), 'hockey');
        expect([graph.state.n, graph.state.k]).toEqual([7, 3]);
        expect(1 + 4 + 10 + 20 + 35).toBe(70);
        expect(graph.row().hockeyStick).toBe(70n);
        expect(readout('hockey')).toContain('= 70 = ');
        expect(digits(readout('hockey'))).toBe('(3nad3)+(4nad3)+(5nad3)+(6nad3)+(7nad3)=70=(8nad4)');
        set(graph, {n: 12, k: 2}); // C(2,2) + .. + C(12,2) = C(13, 3) = 286
        expect(digits(readout('hockey'))).toContain('(2nad2)+(3nad2)+…+(12nad2)=286=(13nad3)');
    });

    test('weights: n = 5, k = 2, t = 1/2 gives 10/32 = 0,3125; t = 1/4 gives 270/1024; they sum to 1', () => {
        const {graph} = mountGraph();
        set(graph, {view: 'row', n: 5, k: 2, t: 50});
        expect(10 / 32).toBe(0.3125);
        expect(readout('weight')).toBe('0,3125 (izračunano)');
        expect(readout('weight-sum')).toBe('1 (izračunano)');
        enterNumber(field(tLabel()), '0,25');
        expect(graph.state.t).toBe(25);
        expect(270 / 1024).toBeCloseTo(0.263671875, 12);
        expect(readout('weight')).toBe('0,263672 (izračunano)');
        expect(Math.abs(graph.row().weightSum - 1)).toBeLessThan(1e-12);
        expect(shownCaptions(graph)).toContain(t('combinatorics_counting_cap_weights', {value0: '0,25'}));
    });

    test('n = 20, k = 10, t = 1/2: C(20, 10) = 184 756 and the weight 184756 / 2^20 = 0,176197', () => {
        const {graph} = mountGraph();
        set(graph, {view: 'row', n: 20, k: 10, t: 50});
        expect(184756 / 2 ** 20).toBeCloseTo(0.176197, 6);
        expect(readout('weight')).toBe('0,176197 (izračunano)');
        expect(digits(readout('row-sum'))).toBe('1048576=2²⁰');
        expect(shownCaptions(graph).map(digits)).toContain('184756');
        expect(curves(graph)[1].polylines).toBe(20);
    });

    test('t = 0 and t = 1 put all the weight on the first and the last bar; n = 0 is a single entry', () => {
        const {graph} = mountGraph();
        set(graph, {view: 'row', n: 4, k: 0, t: 0});
        expect(graph.row().weights).toEqual([1, 0, 0, 0, 0]);
        expect(readout('weight')).toBe('1 (izračunano)');
        set(graph, {k: 4, t: 100});
        expect(graph.row().weights).toEqual([0, 0, 0, 0, 1]);
        set(graph, {n: 0, k: 0, t: 30});
        expect(readout('alternating')).toBe('1');
        expect(digits(readout('row-sum'))).toBe('1=2⁰');
        noBadText();
    });

    test('a place past the end of the row is shown as the last place and the sums stay exact for n <= 20', () => {
        const {graph} = mountGraph();
        set(graph, {view: 'row', n: 3, k: 9});
        expect(graph.rowPlace()).toBe(3);
        expect(field(rowKLabel()).value).toBe('3');
        for (let n = 0; n <= 20; n++) {
            set(graph, {n, k: 0});
            expect(graph.row().sum).toBe(2n ** BigInt(n));
            expect(graph.row().alternatingSum).toBe(n === 0 ? 1n : 0n);
        }
        noBadText();
    });
});

describe('rebuild and state change', () => {
    test('a change of the kind of scene really rebuilds it; a change inside a scene does not', () => {
        const {graph} = mountGraph();
        const owned = graph.ownedObjectCount();
        const first = probes(graph)[probes(graph).length - 1];
        set(graph, {n: 6, k: 2});
        expect(graph.drawnKey()).toBe('choices-tree'); // V(6, 2) = 30
        expect(graph.liveBoard().objectsList.includes(first as unknown as JXG.GeometryElement)).toBe(false);
        const tree = probes(graph)[probes(graph).length - 1];
        set(graph, {n: 5, k: 2});
        expect(graph.liveBoard().objectsList.includes(tree as unknown as JXG.GeometryElement)).toBe(true);
        chooseView('multiset');
        expect(graph.drawnKey()).toBe('multiset');
        expect(graph.liveBoard().objectsList.includes(tree as unknown as JXG.GeometryElement)).toBe(false);
        chooseView('row');
        expect(graph.drawnKey()).toBe('row');
        chooseView('choices');
        set(graph, {n: 6, k: 3});
        expect(graph.drawnKey()).toBe('choices-table');
        expect(graph.ownedObjectCount()).toBe(owned);
    });

    test('every drawn curve lies inside the view box in every view and size', () => {
        const {graph} = mountGraph();
        const [left, top, right, bottom] = VIEW_BOX;
        const states: Parameters<ObservedGraph['setState']>[0][] = [
            {view: 'choices', n: 4, k: 3, repetition: true}, {view: 'choices', n: 5, k: 3, repetition: false}, {view: 'choices', n: 1, k: 20, repetition: true},
            {view: 'multiset', counts: [12, 12, 12, 12]}, {view: 'multiset', counts: [1, 4, 4, 2]}, {view: 'row', n: 20, k: 10, t: 50},
            {view: 'row', n: 0, k: 0, t: 100}, {view: 'row', n: 7, k: 3, t: 5},
        ];
        for (const state of states) {
            set(graph, state);
            for (const o of probes(graph).filter(p => p.elType === 'curve')) {
                for (const x of finite(o.dataX ?? [])) { expect(x).toBeGreaterThanOrEqual(left); expect(x).toBeLessThanOrEqual(right); }
                for (const y of finite(o.dataY ?? [])) { expect(y).toBeGreaterThanOrEqual(bottom); expect(y).toBeLessThanOrEqual(top); }
            }
            for (const text of shown(graph)) {
                expect(text.X!()).toBeGreaterThanOrEqual(left);
                expect(text.X!()).toBeLessThanOrEqual(right);
                expect(text.Y!()).toBeGreaterThanOrEqual(bottom);
                expect(text.Y!()).toBeLessThanOrEqual(top);
            }
        }
    });

    test('the derived numbers are cached on the state object: the same state does not recompute, a new one does', () => {
        const {graph} = mountGraph();
        const first = graph.counting();
        expect(graph.counting()).toBe(first);
        expect(graph.table()).toBe(graph.table());
        set(graph, {k: 2});
        expect(graph.counting()).not.toBe(first);
    });

    test('there is no draggable handle: every board point is fixed and no listener is owned', () => {
        const {graph} = mountGraph();
        for (const state of [{view: 'choices' as const, n: 4, k: 3, repetition: true}, {view: 'row' as const}, {view: 'multiset' as const}]) {
            set(graph, state);
            for (const point of probes(graph).slice(-graph.ownedObjectCount()).filter(o => o.elType === 'point')) expect(point.evalVisProp('fixed')).toBe(true);
            expect(graph.ownedListenerCount()).toBe(0);
        }
    });
});

describe('numeric input and keyboard', () => {
    test('n and k snap, are refused outside their range or when not whole, and k never exceeds n without repetition', () => {
        const {graph} = mountGraph();
        enterNumber(field(nLabel()), '8');
        expect(graph.state.n).toBe(8);
        enterNumber(field(kLabel()), '9');
        expect(graph.state.k).toBe(3); // k > n without repetition is refused
        enterNumber(field(kLabel()), '8');
        expect(graph.state.k).toBe(8);
        enterNumber(field(nLabel()), '5');
        expect([graph.state.n, graph.state.k]).toEqual([5, 5]); // n below k pulls k down
        enterNumber(field(nLabel()), '21');
        expect(graph.state.n).toBe(5);
        enterNumber(field(nLabel()), 'tri');
        expect(graph.state.n).toBe(5);
        click(t('combinatorics_counting_repetition'));
        expect(graph.state.repetition).toBe(true);
        enterNumber(field(kLabel()), '20');
        expect(graph.state.k).toBe(20); // with repetition k may exceed n
        click(t('combinatorics_counting_repetition'));
        expect([graph.state.repetition, graph.state.k]).toEqual([false, 5]);
        click(t('combinatorics_counting_ordered'));
        expect(graph.state.ordered).toBe(false);
        // Out of range or not whole: refused, not clamped (the generic refusal is sharedControlBehaviour); the ranges are this graph's.
        for (const [label, texts, read] of [[nLabel(), ['21', '-1'], () => graph.state.n], [kLabel(), ['7', '-1'], () => graph.state.k]] as const) {
            for (const text of texts) {
                const before = read();
                enterNumber(field(label), text);
                expect([label, text, read()]).toEqual([label, text, before]);
            }
        }
        // The edit path refuses too (the field already did): a refused value is neither stored nor clamped.
        const edits = graph as unknown as {editN(value: number): boolean; editK(value: number): boolean};
        expect([edits.editN(21), edits.editN(4.5), edits.editN(Number.NaN), edits.editK(7), edits.editK(2.5)]).toEqual([false, false, false, false, false]);
        expect([graph.state.n, graph.state.k]).toEqual([5, 5]);
        expect([edits.editN(8), edits.editK(2)]).toEqual([true, true]);
    });

    test('letter counts, the row n and k and t snap and are refused outside their range', () => {
        const {graph} = mountGraph();
        chooseView('multiset');
        enterNumber(field(letterLabel('S')), '7');
        expect(graph.state.counts).toEqual([1, 4, 7, 2]);
        enterNumber(field(letterLabel('S')), '13');
        expect(graph.state.counts).toEqual([1, 4, 7, 2]);
        enterNumber(field(letterLabel('M')), '-1');
        expect(graph.state.counts[0]).toBe(1);
        chooseView('row');
        enterNumber(field(rowNLabel()), '14');
        enterNumber(field(rowKLabel()), '15');
        expect([graph.state.n, graph.state.k]).toEqual([14, 3]);
        enterNumber(field(rowKLabel()), '14');
        enterNumber(field(rowNLabel()), '9');
        expect([graph.state.n, graph.state.k]).toEqual([9, 9]);
        enterNumber(field(rowNLabel()), '21');
        expect(graph.state.n).toBe(9);
        enterNumber(field(tLabel()), '1,5');
        expect(graph.state.t).toBe(50);
        enterNumber(field(tLabel()), '0,07');
        expect(graph.state.t).toBe(7);
        enterNumber(field(tLabel()), '0,333');
        expect(graph.state.t).toBe(33);
    });

    test('arrow keys step by 1 (t by 0,01) and Page keys by 5 (letter counts by 3, t by 0,05)', () => {
        const {graph} = mountGraph();
        pressKey(nLabel(), 'ArrowUp');
        expect(graph.state.n).toBe(7);
        pressKey(kLabel(), 'ArrowDown');
        expect(graph.state.k).toBe(2);
        pressKey(nLabel(), 'PageUp');
        expect(graph.state.n).toBe(12);
        chooseView('multiset');
        pressKey(letterLabel('I'), 'PageUp');
        expect(graph.state.counts).toEqual([1, 7, 4, 2]);
        pressKey(letterLabel('P'), 'ArrowDown');
        expect(graph.state.counts).toEqual([1, 7, 4, 1]);
        chooseView('row');
        pressKey(tLabel(), 'ArrowUp');
        expect(graph.state.t).toBe(51);
        pressKey(tLabel(), 'PageUp');
        expect(graph.state.t).toBe(56);
        pressKey(rowKLabel(), 'PageUp');
        expect(graph.state.k).toBe(7); // 2 + 5 within the row of 12
    });
});

describe('controls', () => {
    test('every numeric field and switch is described by the key help, which states the ranges', () => {
        mountGraph();
        const described = (label: string) => expect(field(label).getAttribute('aria-describedby') ?? '').toContain('combinatorics-counting-input-help');
        for (const label of [nLabel(), kLabel(), t('combinatorics_counting_ordered'), t('combinatorics_counting_repetition')]) described(label);
        chooseView('multiset');
        for (const letter of ['M', 'I', 'S', 'P']) described(letterLabel(letter));
        chooseView('row');
        for (const label of [rowNLabel(), rowKLabel(), tLabel()]) described(label);
        const help = document.getElementById('combinatorics-counting-input-help')!.textContent!;
        expect(help).toContain('od 0 do 20');
        expect(help).toContain('od 0 do 12');
        expect(help).toContain('od 0 do 1');
        expect(help).toContain('po 0,01');
        expect(help).toContain('Page gor');
    });

    test('examples are a select that lists only the examples of the view and shows custom while none matches', () => {
        const {graph} = mountGraph();
        expect(field(exampleLabel()).value).toBe('variations');
        expect([...field(exampleLabel()).querySelectorAll('option')].map(o => o.value)).toEqual(['books', 'variations', 'variations_repetition', 'combinations']);
        choose(exampleLabel(), 'variations_repetition');
        expect([graph.state.ordered, graph.state.repetition, graph.state.n, graph.state.k]).toEqual([true, true, 6, 3]);
        expect(digits(readout('count'))).toBe('216');
        enterNumber(field(kLabel()), '4');
        expect(field(exampleLabel()).value).toBe('custom');
        expect([...field(exampleLabel()).querySelectorAll('option')][0].value).toBe('custom');
        chooseView('row');
        expect([...field(exampleLabel()).querySelectorAll('option')].map(o => o.value)).toEqual(['custom', 'row10', 'hockey']);
        expect(graph.state.k).toBe(4);
    });

    test('a switch to the row view clamps k to n and the readout names each value once', () => {
        const {graph} = mountGraph();
        set(graph, {repetition: true, n: 3, k: 9});
        chooseView('row');
        expect([graph.state.n, graph.state.k]).toEqual([3, 3]);
        for (const id of ['row-sum', 'alternating', 'hockey', 'weight', 'weight-sum']) expect(document.querySelectorAll(`[data-readout="${id}"]`).length).toBe(1);
    });
});

describe('ownership', () => {
    test('mount, state change, view change, rebuild and unmount: objects are owned and released', () => {
        const {graph, view} = mountGraph();
        const board = graph.liveBoard();
        const owned = graph.ownedObjectCount();
        const base = board.objectsList.length - owned;
        expect(base).toBeGreaterThanOrEqual(0);
        expect(graph.ownedListenerCount()).toBe(0);
        set(graph, {n: 4, k: 3, repetition: true});
        expect(board.objectsList.length).toBe(base + graph.ownedObjectCount());
        chooseView('multiset');
        expect(board.objectsList.length).toBe(base + graph.ownedObjectCount());
        chooseView('row');
        expect(board.objectsList.length).toBe(base + graph.ownedObjectCount());
        chooseView('choices');
        set(graph, {n: 6, k: 3, repetition: false});
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(board.objectsList.length).toBe(base + owned);

        graph.disposeNow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(board.objectsList.length).toBe(base);
        graph.initialize(); // a rebuild builds the same scene again
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(board.objectsList.length).toBe(base + owned);

        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
    });

    test('unmount releases the objects and the board label of a live scene', () => {
        const {graph, view} = mountGraph();
        expect(document.querySelector(`[aria-label="${t('combinatorics_counting_board_label')}"]`)).not.toBeNull();
        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(document.querySelector(`[aria-label="${t('combinatorics_counting_board_label')}"]`)).toBeNull();
    });

    test('StrictMode mounts, unmounts and mounts again with the same number of objects as a plain mount', () => {
        const plain = mountGraph();
        const expected = {owned: plain.graph.ownedObjectCount(), board: plain.graph.liveBoard().objectsList.length};
        plain.view.unmount();
        const strict = mountGraph(true);
        expect(strict.graph.ownedObjectCount()).toBe(expected.owned);
        expect(strict.graph.liveBoard().objectsList.length).toBe(expected.board);
        strict.view.unmount();
        expect(strict.graph.ownedObjectCount()).toBe(0);
    });
});

describe('language', () => {
    test('a language switch retranslates the status, the board label, the captions, the kinds and the formatted numbers', () => {
        const {graph} = mountGraph();
        expect(shownCaptions(graph)).toContain('Variacije');
        act(() => { setLanguage('en'); });
        expect(status()).toBe('Variations for n = 6, k = 3: 120.');
        expect(shownCaptions(graph)).toContain('Variations');
        expect(shownCaptions(graph)).toContain('Combinations with repetition');
        expect(shownCaptions(graph).filter(text => /Variacije|Kombinacije|Vrsta/.test(text))).toEqual([]);
        expect(document.querySelector(`[aria-label="${t('combinatorics_counting_board_label')}"]`)).not.toBeNull();
        expect(readout('kind')).toBe('Variations');
        chooseView('row');
        set(graph, {n: 5, k: 2, t: 50});
        expect(readout('weight')).toBe('0.3125 (computed)');
        act(() => { setLanguage('sl'); });
        expect(readout('weight')).toBe('0,3125 (izračunano)');
        expect(digits(status())).toBe('Vrstica5:vsota32,izmeničnavsota0.');
    });
});

describe('review repairs', () => {
    const textOf = (o: Probe) => (o as unknown as {plaintext: string}).plaintext;
    const orderingTexts = (graph: ObservedGraph, group: number[]) => {
        const perms = (items: number[]): number[][] => (items.length <= 1 ? [items] : items.flatMap((item, i) => perms([...items.slice(0, i), ...items.slice(i + 1)]).map(rest => [item, ...rest])));
        return perms(group).map(order => order.join('')).filter(text => shownCaptions(graph).includes(text));
    };
    const groupLabels = (graph: ObservedGraph) => shownCaptions(graph).filter(text => text.startsWith('Kombinacija '));

    test('combinations C(6, 3) = 20 draw three groups of 3! = 6 orderings and the caption "x 20 groups = 120 / 6"', () => {
        const {graph} = mountGraph();
        set(graph, {ordered: false});
        const captions = shownCaptions(graph);
        expect(groupLabels(graph)).toEqual(['Kombinacija 123', 'Kombinacija 124', 'Kombinacija 125']);
        expect(orderingTexts(graph, [1, 2, 3]).length).toBe(6);
        expect(orderingTexts(graph, [1, 2, 4]).length).toBe(6);
        expect(orderingTexts(graph, [1, 2, 5]).length).toBe(6);
        expect(captions).toContain('521');
        expect(captions).not.toContain('Kombinacija 126');
        expect(falling(6, 3) / fact(3)).toBe(20n);
        expect(captions.map(digits)).toContain('×20skupin=120/6');
        expect(captions).not.toContain(t('combinatorics_counting_cap_groups_range'));
    });

    test('hand values: n = 4, k = 3 gives x 4 groups = 24 / 6; n = 5, k = 2 gives groups of 2 and x 10 = 20 / 2', () => {
        const {graph} = mountGraph();
        set(graph, {ordered: false, n: 4, k: 3});
        expect(groupLabels(graph).length).toBe(3);
        expect(shownCaptions(graph).map(digits)).toContain('×4skupin=24/6');
        expect(orderingTexts(graph, [1, 3, 4]).length).toBe(6);
        set(graph, {n: 5, k: 2});
        expect(shownCaptions(graph).map(digits)).toContain('×10skupin=20/2');
        expect(orderingTexts(graph, [1, 4]).length).toBe(2);
        act(() => { setLanguage('en'); });
        expect(shownCaptions(graph).map(digits)).toContain('×10groups=20/2');
        expect(shownCaptions(graph)).toContain('Combination 12');
    });

    test('k outside 2..4, the ordered kinds and repetition draw no groups; k > 4 and k < 2 say for which k they are drawn', () => {
        const {graph} = mountGraph();
        const rangeNote = t('combinatorics_counting_cap_groups_range');
        for (const k of [1, 5, 0]) {
            set(graph, {ordered: false, repetition: false, n: 6, k});
            expect(groupLabels(graph).length).toBe(0);
            expect(shownCaptions(graph)).toContain(rangeNote);
        }
        set(graph, {ordered: true, k: 3});
        expect(shownCaptions(graph).some(text => text.startsWith('Kombinacija ') || text.startsWith('×'))).toBe(false);
        expect(shownCaptions(graph)).not.toContain(rangeNote);
        set(graph, {ordered: false, repetition: true, k: 3});
        expect(groupLabels(graph).length).toBe(0);
        expect(shownCaptions(graph)).not.toContain(rangeNote);
    });

    test('lowering n below k, or turning repetition off, says that k was lowered', () => {
        const {graph} = mountGraph();
        enterNumber(field(nLabel()), '2');
        expect(graph.state.k).toBe(2);
        expect(status()).toContain('k je znižan na 2.');
        enterNumber(field(nLabel()), '4');
        expect(status()).not.toContain('znižan');
        click(t('combinatorics_counting_repetition'));
        enterNumber(field(kLabel()), '9');
        expect(graph.state.k).toBe(9);
        click(t('combinatorics_counting_repetition'));
        expect(graph.state.k).toBe(4);
        expect(graph.statusText()).toContain('k je znižan na 4.');
        expect(status()).toContain('k je znižan na 4.');
        act(() => { setLanguage('en'); });
        expect(status()).toContain('k was lowered to 4.');
    });

    test('the row view keeps k in 0..n in the state and says so when n drops or the view is entered', () => {
        const {graph} = mountGraph();
        set(graph, {n: 9, k: 8});
        chooseView('row');
        expect([graph.state.n, graph.state.k]).toEqual([9, 8]);
        expect(status()).not.toContain('znižan');
        set(graph, {view: 'choices', n: 5, k: 9, repetition: true});
        chooseView('row');
        expect(graph.state.k).toBe(5);
        expect(status()).toContain('k je znižan na 5.');
        enterNumber(field(rowNLabel()), '3');
        expect([graph.state.n, graph.state.k]).toEqual([3, 3]);
        expect(status()).toContain('k je znižan na 3.');
    });

    test('a nonzero weight that rounds to zero shows "< 0,000001"; the labels say 6 decimals', () => {
        const {graph} = mountGraph();
        set(graph, {view: 'row', n: 20, k: 0, t: 99});
        expect(graph.row().weights[0]).toBeGreaterThan(0);
        expect(readout('weight')).toBe('< 0,000001 (izračunano)');
        expect(document.querySelector('[data-readout="weight"] dt')?.textContent).toContain('6 decimalk');
        set(graph, {k: 1, t: 0});
        expect(readout('weight')).toBe('0 (izračunano)');
        act(() => { setLanguage('en'); });
        set(graph, {k: 0, t: 99});
        expect(readout('weight')).toBe('< 0.000001 (computed)');
        expect(document.querySelector('[data-readout="weight"] dt')?.textContent).toContain('6 decimals');
    });

    test('the captions of the bars name their scale', () => {
        expect(t('combinatorics_counting_cap_weights', {value0: '0,5'})).toContain('merilo: največja utež');
        setLanguage('en');
        expect(t('combinatorics_counting_cap_weights', {value0: '0.5'})).toContain('scale: largest weight');
        expect(t('combinatorics_lattice_cap_expansion')).toContain('scale: largest |coefficient|');
    });

    test('the chosen bar carries the text "k = 5" above its top, not only the accent colour', () => {
        const {graph} = mountGraph();
        chooseView('row');
        choose(exampleLabel(), 'row10');
        const marks = shown(graph).filter(o => textOf(o) === 'k = 5');
        expect(marks.length).toBe(1);
        expect(marks[0].X!()).toBeCloseTo(0.9 + 1.15 * 5, 9);
        const top = BAR_BASE + BAR_HEIGHT;
        const gap = marks[0].Y!() - top;
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeLessThan(1);
        set(graph, {k: 2});
        expect(shown(graph).filter(o => textOf(o) === 'k = 5').length).toBe(0);
        const low = shown(graph).filter(o => textOf(o) === 'k = 2');
        expect(low.length).toBe(1);
        expect(low[0].Y!()).toBeCloseTo(BAR_BASE + (45 / 252) * BAR_HEIGHT + gap, 9); // C(10, 2) / C(10, 5)
    });
});

describe('the table is legible: no text runs into another', () => {
    const PX_PER_UNIT = 9; // the narrowest board (390 px wide): the 27 units of the view box, with the fit margin, are about 250 px tall
    const PX_PER_UNIT_Y = 9;
    const boxes = (graph: ObservedGraph) => shown(graph).map(o => {
        const text = (o as unknown as {plaintext: string}).plaintext;
        const size = Number(o.evalVisProp('fontsize'));
        const x = o.X!();
        const y = o.Y!();
        return {text, left: x, right: x + (text.length * size * 0.6) / PX_PER_UNIT, bottom: y - size / 2 / PX_PER_UNIT_Y, top: y + size / 2 / PX_PER_UNIT_Y};
    });
    const overlaps = (graph: ObservedGraph) => {
        const all = boxes(graph).filter(box => box.text.length > 0);
        const found: string[] = [];
        for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
            const a = all[i];
            const b = all[j];
            if (a.left < b.right && b.left < a.right && a.bottom < b.top && b.bottom < a.top) found.push(`${a.text} | ${b.text}`);
        }
        return found;
    };

    test.each(['sl', 'en'] as const)('the four rows do not overlap each other or the captions in %s', language => {
        setLanguage(language);
        const {graph} = mountGraph();
        expect(graph.drawnKey()).toBe('choices-table');
        expect(overlaps(graph)).toEqual([]);
        for (const text of ['120', '216', '20', '56']) expect(shownCaptions(graph).some(caption => caption.endsWith(` = ${text}`))).toBe(true);
    });

    test('the table fits inside the view box width in both languages', () => {
        for (const language of ['sl', 'en'] as const) {
            setLanguage(language);
            const {graph, view} = mountGraph();
            const widest = Math.max(...boxes(graph).map(box => box.right));
            expect((widest - VIEW_BOX[0]) * PX_PER_UNIT).toBeLessThanOrEqual(330); // the narrowest board is about 340 px wide
            view.unmount();
        }
    });

    test('the axes are off by default: the board is not a coordinate plane', () => {
        const {graph} = mountGraph();
        expect(graph.displaySettings.getAxisSelect()).toBe('none');
    });
});
