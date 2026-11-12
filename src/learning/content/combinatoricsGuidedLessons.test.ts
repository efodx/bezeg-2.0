/**
 * CB1 and CB2 (lattice-paths, counting-tree): every scene lands in the state the text states (the real graph, one synchronous sequence of actions from a
 * restored checkpoint, out of order and twice), every number a step quotes is bound to its step against the real readout, and the counts are recomputed
 * here with BigInt arithmetic (Pascal's rule, products and factorials, not the combinatorics kernel). Numbers the text asks the learner to produce are
 * checked by applying that change as an action and reading the readout.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {countingTreeLesson, latticePathsLesson} from './combinatoricsGuidedLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import type {LessonAction} from '../model';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {CountingTreeGraph} from '../../graphs/combinatorics/CountingTreeGraph';
import {LatticePathGraph} from '../../graphs/combinatorics/LatticePathGraph';
import {setLanguage, t} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- exact arithmetic (BigInt) ------------------------------------------------------------------------------------------------------

const fact = (n: number): bigint => (n <= 1 ? 1n : BigInt(n) * fact(n - 1));
const falling = (n: number, k: number): bigint => { let r = 1n; for (let i = 0; i < k; i++) r *= BigInt(n - i); return r; };
/** Pascal's rule, row by row (a different route to the counts than the kernel's own formula). */
function pascal(n: number): bigint[] {
    let row = [1n];
    for (let i = 0; i < n; i++) row = Array.from({length: row.length + 1}, (_, j) => (row[j - 1] ?? 0n) + (row[j] ?? 0n));
    return row;
}
const choose = (n: number, k: number): bigint => pascal(n)[k];
const grouped = (value: bigint, separator: string) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
/** Digits only: drops the language's thousands separator (NBSP in Slovenian, a comma in English) and the spacing around it. */
const norm = (text: string | null | undefined) => (text ?? '').replace(/[\s  ,]/g, '');
const num = (value: bigint | number) => String(value);
/** Prose with the `\,` thin spaces and the whitespace removed, so that `184\,756` reads 184756. */
const prose = (text: string) => text.replace(/\\,/g, '').replace(/\s+/g, '');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9])${value}(?![0-9])`).test(prose(text));
/** The routes to (a, b) as words over D (right) and G (up), in the graph's order: up first. */
function routes(a: number, b: number): string[] {
    const out: string[] = [];
    const walk = (word: string, right: number, up: number) => {
        if (right === 0 && up === 0) out.push(word);
        if (up > 0) walk(`${word}G`, right, up - 1);
        if (right > 0) walk(`${word}D`, right - 1, up);
    };
    walk('', a, b);
    return out;
}

// ---- the graphs ----------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const status = () => document.querySelector('[data-combinatorics-status]')?.textContent ?? null;
const allReadouts = () => [...document.querySelectorAll('[data-readout]')].map(node => node.textContent);

class ObservedCounting extends CountingTreeGraph {
    captions(): string[] {
        const objects = this.board.objectsList as unknown as {elType: string; evalVisProp(name: string): unknown; plaintext?: string}[];
        return objects.filter(o => o.elType === 'text' && o.evalVisProp('visible')).map(o => o.plaintext ?? '');
    }
}

type Scene = (lesson: GuidedLesson, stepId: string, ...extra: LessonAction[]) => void;

function mountOf<G extends LatticePathGraph | CountingTreeGraph>(graph: G) {
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const scene: Scene = (lesson, stepId, ...extra) => act(() => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(lesson.steps.find(step => step.id === stepId)!.scene!)) capabilities.apply(action);
        for (const action of extra) capabilities.apply(action);
    });
    const learner = (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); });
    return {graph, mounted, capabilities, checkpoint, scene, learner};
}
function mountLattice() {
    const graph = createGraph('lattice-paths');
    if (!(graph instanceof LatticePathGraph)) throw new Error('lattice-paths must be the lattice graph.');
    return mountOf(graph);
}
const mountCounting = () => mountOf(new ObservedCounting());

const target = (a: number, b: number): LessonAction => ({kind: 'combinatorics', operation: 'set-target', a, b});
const display = (view: 'paths' | 'triangle', showCounts: boolean): LessonAction => ({kind: 'combinatorics', operation: 'set-lattice-display', view, showCounts});
const choices = (n: number, k: number, ordered: boolean, repetition: boolean): LessonAction =>
    ({kind: 'combinatorics', operation: 'set-counting-mode', view: 'choices', n, k, ordered, repetition});

// ---- the scenes ---------------------------------------------------------------------------------------------------------------------

interface LatticeExpected {
    readonly a: number; readonly b: number; readonly view: 'paths' | 'triangle'; readonly showCounts: boolean;
    /** Readout rows the scene must show (digits, separators dropped). */
    readonly rows: Readonly<Record<string, string>>;
    /** Numbers the step's expected-state text quotes, in both languages. */
    readonly quotes: readonly string[];
}
const pointOf = (a: number, b: number) => t('combinatorics_point_format', {value0: String(a), value1: String(b)});
const binomOf = (n: number, k: number) => t('combinatorics_binom_format', {value0: String(n), value1: String(k)});
const lattice22 = (id: string): [string, LatticeExpected] => [id, {
    a: 2, b: 2, view: 'paths', showCounts: false,
    rows: {count: num(choose(4, 2)), formula: norm(`${binomOf(4, 2)} = ${choose(4, 2)}`), target: pointOf(2, 2)},
    quotes: [num(choose(4, 2))],
}];
const CB1: Record<string, LatticeExpected> = Object.fromEntries([
    lattice22('cb1-predict'),
    lattice22('cb1-list'),
    ['cb1-drag', {a: 5, b: 3, view: 'paths', showCounts: false, rows: {count: num(choose(8, 5)), formula: norm(`${binomOf(8, 5)} = ${choose(8, 5)}`)}, quotes: [num(choose(8, 5))]}],
    ['cb1-counts', {a: 5, b: 3, view: 'paths', showCounts: true, rows: {count: num(choose(8, 5))}, quotes: [num(choose(7, 3)), num(choose(7, 2)), num(choose(8, 5))]}],
    ['cb1-choose', {a: 5, b: 3, view: 'paths', showCounts: false, rows: {count: num(choose(8, 5)), formula: norm(`${binomOf(8, 5)} = ${choose(8, 5)}`)}, quotes: [num(choose(8, 5))]}],
    ['cb1-cap', {a: 10, b: 10, view: 'paths', showCounts: false, rows: {count: num(choose(20, 10))}, quotes: [num(choose(20, 10))]}],
    ['cb1-explore', {a: 5, b: 3, view: 'paths', showCounts: false, rows: {count: num(choose(8, 5))}, quotes: [num(choose(8, 5))]}],
]);

interface CountingExpected {
    readonly state: Readonly<Record<string, unknown>>;
    readonly rows: Readonly<Record<string, string>>;
    readonly quotes: readonly string[];
    /** Numbers quoted by the step's explanation but not by its expected-state text. */
    readonly also?: readonly string[];
    readonly tree: boolean;
}
const CB2: Record<string, CountingExpected> = {
    'cb2-tree': {state: {view: 'choices', n: 3, k: 2, ordered: true, repetition: false}, rows: {count: num(falling(3, 2)), leaves: num(falling(3, 2)), product: '3·2=6'}, quotes: [num(falling(3, 2))], tree: true},
    'cb2-product': {state: {view: 'choices', n: 4, k: 3, ordered: true, repetition: false}, rows: {count: num(falling(4, 3)), product: '4·3·2=24'}, quotes: [num(falling(4, 3))], tree: true},
    'cb2-permutations': {state: {view: 'choices', n: 4, k: 4, ordered: true, repetition: false}, rows: {count: num(fact(4)), product: '4·3·2·1=24'}, quotes: [num(fact(4))], tree: true},
    'cb2-variations': {state: {view: 'choices', n: 6, k: 3, ordered: true, repetition: false}, rows: {count: num(falling(6, 3)), product: '6·5·4=120'}, quotes: [num(falling(6, 3)), num(BigInt(6) ** 3n)], tree: false},
    'cb2-combinations': {state: {view: 'choices', n: 6, k: 3, ordered: false, repetition: false},
        rows: {count: num(choose(6, 3)), leaves: num(falling(6, 3)), orderings: `3!=${fact(3)}`, division: `${falling(6, 3)}/${fact(3)}=${choose(6, 3)}`}, quotes: [num(choose(6, 3)), num(fact(3))], also: [num(falling(6, 3))], tree: false},
    'cb2-repetition': {state: {view: 'multiset', counts: [1, 4, 4, 2]}, rows: {letters: '11', 'all-different': `11!=${fact(11)}`}, quotes: ['11', num(fact(11) / (fact(1) * fact(4) * fact(4) * fact(2)))], also: [num(fact(11)), num(fact(1) * fact(4) * fact(4) * fact(2))], tree: false},
    'cb2-explore': {state: {view: 'choices', n: 6, k: 3, ordered: true, repetition: false}, rows: {count: num(falling(6, 3))}, quotes: [num(falling(6, 3))], tree: false},
};

const lessons = [
    ['CB1', latticePathsLesson, CB1, 'lattice-paths-and-pascal', 7],
    ['CB2', countingTreeLesson, CB2, 'counting-and-choices', 7],
] as const;

describe.each(lessons)('%s', (name, lesson, scenes, section, count) => {
    test('has ordered steps with a scene each, and the chapter owns it', () => {
        expect(lesson.steps.map(step => step.order)).toEqual(Array.from({length: count}, (_, i) => i + 1));
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(scenes));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(count);
        const owned = getChapterOwnedLessons('combinatorics')!.lesson(section)!;
        expect(owned.steps).toHaveLength(count);
        expect(owned.steps.every(step => step.scene)).toBe(true);
    });

    test(`${name}: the numbers each step quotes are those of its scene, in both languages`, () => {
        for (const step of lesson.steps) {
            const expected = scenes[step.id];
            for (const language of ['sl', 'en'] as const) {
                const state = step.scene!.expectedState[language];
                const text = [state, step.explanation[language], ...step.expectedObservations.map(o => o[language])].join(' ');
                for (const quote of expected.quotes) expect({id: step.id, language, quote, found: hasNumber(state, quote)}).toEqual({id: step.id, language, quote, found: true});
                const everything = 'also' in expected ? [...expected.quotes, ...(expected.also ?? [])] : expected.quotes;
                for (const quote of everything) expect({id: step.id, language, quote, inText: hasNumber(text, quote)}).toEqual({id: step.id, language, quote, inText: true});
            }
        }
    });
});

test('CB1: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    const m = mountLattice();
    try {
        const ids = Object.keys(CB1);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const expected = CB1[id];
            m.scene(latticePathsLesson, id);
            m.scene(latticePathsLesson, id);
            expect({id, ...pick(m.graph.state, ['a', 'b', 'view', 'showCounts', 'route'])}).toEqual({id, a: expected.a, b: expected.b, view: expected.view, showCounts: expected.showCounts, route: 0});
            for (const [row, text] of Object.entries(expected.rows)) expect({id, row, text: norm(readout(row))}).toEqual({id, row, text: norm(text)});
        }
    } finally {
        m.mounted.view.unmount();
    }
});

test('CB2: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    const m = mountCounting();
    try {
        const ids = Object.keys(CB2);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const expected = CB2[id];
            m.scene(countingTreeLesson, id);
            m.scene(countingTreeLesson, id);
            expect({id, ...pick(m.graph.state, Object.keys(expected.state))}).toEqual({id, ...expected.state});
            for (const [row, text] of Object.entries(expected.rows)) expect({id, row, text: norm(readout(row))}).toEqual({id, row, text: norm(text)});
            if (expected.state.view === 'choices') expect({id, tree: m.graph.drawnKey() !== 'choices-table'}).toEqual({id, tree: expected.tree});
        }
    } finally {
        m.mounted.view.unmount();
    }
});

function pick(state: object, keys: string[]): Record<string, unknown> {
    const record = state as Record<string, unknown>;
    return Object.fromEntries(keys.map(key => [key, record[key]]));
}

// ---- CB1: recomputed ---------------------------------------------------------------------------------------------------------------

test('CB1 steps 1 and 2: 6 routes to (2, 2), route 1 is GGDD and the list is the six words of two D and two G', () => {
    const m = mountLattice();
    try {
        const words = routes(2, 2);
        expect(words).toEqual(['GGDD', 'GDGD', 'GDDG', 'DGGD', 'DGDG', 'DDGG']);
        expect(BigInt(words.length)).toBe(choose(4, 2));
        m.scene(latticePathsLesson, 'cb1-predict');
        expect(readout('route')).toBe(t('combinatorics_lattice_readout_route_value', {value0: 'GGDD', value1: '1', value2: '6'}));
        expect(readout('count')).toBe('6');
        m.scene(latticePathsLesson, 'cb1-list');
        expect([...document.querySelectorAll('[data-combinatorics-routes] li')].map(li => li.textContent)).toEqual(words);
        expect(readout('formula')).toBe(`${binomOf(4, 2)} = 6`);
        // The prose names the same six words (Slovenian G/D, English U/R).
        const sl = latticePathsLesson.steps[1].explanation.sl;
        const en = latticePathsLesson.steps[1].explanation.en;
        expect(words.every(word => sl.includes(word))).toBe(true);
        expect(words.map(word => word.replace(/G/g, 'U').replace(/D/g, 'R')).every(word => en.includes(word))).toBe(true);
    } finally {
        m.mounted.view.unmount();
    }
});

test('CB1 step 3: 56 routes to (5, 3) and to (3, 5) as C(8, 5) = C(8, 3), and the learner moves the target to (6, 6): 924 routes, all still drawn', () => {
    const m = mountLattice();
    try {
        expect(choose(8, 5)).toBe(56n);
        expect(choose(8, 3)).toBe(56n);
        expect(BigInt(routes(5, 3).length)).toBe(56n);
        expect(BigInt(routes(3, 5).length)).toBe(56n);
        m.scene(latticePathsLesson, 'cb1-drag');
        expect(readout('count')).toBe('56');
        expect(readout('formula')).toBe(`${binomOf(8, 5)} = 56`);
        m.learner(target(6, 6));
        expect(choose(12, 6)).toBe(924n);
        expect(readout('count')).toBe('924');
        expect(m.graph.lattice().enumerable).toBe(true); // 12 steps are still drawn and listed
        expect(status()).toContain('924');
        expect(status()).not.toContain(t('combinatorics_lattice_over_cap', {value0: '12', value1: '12'}));
        expect(readout('count')).not.toBe(readout('formula'));
    } finally {
        m.mounted.view.unmount();
    }
});

test('CB1 step 4: the labels are Pascal rows along the diagonals; (4, 3) = 35, (5, 2) = 21, target 56; the learner switches to the triangle: row 8, place 5, 56 = 35 + 21', () => {
    const m = mountLattice();
    try {
        m.scene(latticePathsLesson, 'cb1-counts');
        const cells = m.graph.cells();
        const at = (x: number, y: number) => cells.find(cell => cell.x === x && cell.y === y)?.value;
        const diagonal = (sum: number) => Array.from({length: sum + 1}, (_, x) => at(x, sum - x));
        expect(diagonal(3)).toEqual(pascal(3)); // 1, 3, 3, 1
        expect(diagonal(2)).toEqual(pascal(2)); // 1, 2, 1
        expect(diagonal(3)).toEqual([1n, 3n, 3n, 1n]);
        expect([at(4, 3), at(5, 2), at(5, 3)]).toEqual([35n, 21n, 56n]);
        expect(at(4, 3)).toBe(choose(7, 3));
        expect(at(5, 2)).toBe(choose(7, 2));
        expect(35n + 21n).toBe(56n);
        m.learner(display('triangle', true));
        expect(m.graph.state.view).toBe('triangle');
        expect(status()).toBe(t('combinatorics_lattice_status_triangle', {value0: '8', value1: '5', value2: '56', value3: '35', value4: '21'}));
        expect(pascal(8)[5]).toBe(pascal(7)[4] + pascal(7)[5]); // row 8, place 5 = the two entries above
        expect([pascal(7)[4], pascal(7)[5]]).toEqual([35n, 21n]);
    } finally {
        m.mounted.view.unmount();
    }
});

test('CB1 step 5: C(8, 3) = 8 7 6 / 3! = 336 / 6 = 56 and the readout shows the same', () => {
    const m = mountLattice();
    try {
        expect(falling(8, 3)).toBe(336n);
        expect(fact(3)).toBe(6n);
        expect(falling(8, 3) / fact(3)).toBe(56n);
        const example = latticePathsLesson.workedExamples.find(item => item.id === 'cb1-choose')!;
        expect(prose(example.calculationLatex)).toContain('\\frac{8\\cdot7\\cdot6}{3\\cdot2\\cdot1}=\\frac{336}{6}');
        expect(prose(example.resultLatex)).toContain('=56');
        m.scene(latticePathsLesson, 'cb1-choose');
        expect(readout('count')).toBe('56');
    } finally {
        m.mounted.view.unmount();
    }
});

test.each(['sl', 'en'] as const)('CB1 step 6 (%s): (10, 10) has 184 756 routes and none is drawn; the learner sets (20, 20): 137 846 528 820', language => {
    setLanguage(language);
    const separator = language === 'sl' ? ' ' : ',';
    const m = mountLattice();
    try {
        expect(choose(20, 10)).toBe(184756n);
        expect(choose(40, 20)).toBe(137846528820n);
        m.scene(latticePathsLesson, 'cb1-cap');
        expect(readout('count')).toBe(grouped(184756n, separator));
        expect(m.graph.lattice().enumerable).toBe(false);
        expect(m.graph.cells()).toEqual([]);
        expect(document.querySelector('[data-combinatorics-routes]')).toBeNull();
        expect(status()).toContain(t('combinatorics_lattice_over_cap', {value0: '12', value1: '20'}));
        m.learner(target(20, 20));
        expect(readout('count')).toBe(grouped(137846528820n, separator));
        expect(norm(readout('formula'))).toContain(norm(`${binomOf(40, 20)}=137846528820`));
    } finally {
        m.mounted.view.unmount();
    }
});

test('CB1 step 7: (3, 5) has 56 routes again, and a or b equal to 0 leaves one route (the learner sets those targets as actions)', () => {
    const m = mountLattice();
    try {
        m.scene(latticePathsLesson, 'cb1-explore');
        m.learner(target(3, 5));
        expect(readout('count')).toBe('56');
        expect(choose(8, 3)).toBe(choose(8, 5));
        for (const [a, b] of [[0, 7], [7, 0], [0, 0], [20, 0]] as const) {
            m.learner(target(a, b));
            expect(choose(a + b, a)).toBe(1n);
            expect({a, b, count: readout('count')}).toEqual({a, b, count: '1'});
        }
    } finally {
        m.mounted.view.unmount();
    }
});

// ---- CB2: recomputed ---------------------------------------------------------------------------------------------------------------

test('CB2 steps 1 and 2: 3 2 = 6 leaves, 4 3 2 = 24 leaves, drawn as a tree', () => {
    const m = mountCounting();
    try {
        expect([falling(3, 2), falling(4, 3)]).toEqual([6n, 24n]);
        m.scene(countingTreeLesson, 'cb2-tree');
        expect(readout('leaves')).toBe('6');
        expect(m.graph.drawnKey()).not.toBe('choices-table');
        m.scene(countingTreeLesson, 'cb2-product');
        expect(readout('leaves')).toBe('24');
        expect(readout('product')).toBe('4 · 3 · 2 = 24');
        expect(m.graph.drawnKey()).not.toBe('choices-table');
    } finally {
        m.mounted.view.unmount();
    }
});

test('CB2 step 3: 4! = 24 leaves; the learner sets n = k = 5: 5! = 120 and the graph shows the table (more than 64 leaves)', () => {
    const m = mountCounting();
    try {
        expect(fact(4)).toBe(24n);
        expect(fact(5)).toBe(120n);
        m.scene(countingTreeLesson, 'cb2-permutations');
        expect(readout('count')).toBe('24');
        expect(m.graph.drawnKey()).not.toBe('choices-table');
        m.learner(choices(5, 5, true, false));
        expect(readout('count')).toBe('120');
        expect(readout('product')).toBe('5 · 4 · 3 · 2 · 1 = 120');
        expect(fact(5)).toBeGreaterThan(64n);
        expect(m.graph.drawnKey()).toBe('choices-table');
        expect(m.graph.captions().join(' ')).toContain(t('combinatorics_counting_table_note', {value0: '64'}));
    } finally {
        m.mounted.view.unmount();
    }
});

test('CB2 step 4: V_6^3 = 120, the table also shows 6^3 = 216; the learner switches repetition on: 216; with n = 4, k = 3 that is 64 leaves, drawn', () => {
    const m = mountCounting();
    try {
        expect(falling(6, 3)).toBe(120n);
        expect(BigInt(6) ** 3n).toBe(216n);
        expect(BigInt(4) ** 3n).toBe(64n);
        m.scene(countingTreeLesson, 'cb2-variations');
        expect(readout('count')).toBe('120');
        expect(m.graph.drawnKey()).toBe('choices-table');
        expect(m.graph.table().map(row => row.count)).toEqual([120n, 216n, choose(6, 3), choose(8, 3)]); // the 216 the scene text promises is in the table
        m.learner(choices(6, 3, true, true));
        expect(readout('count')).toBe('216');
        expect(readout('product')).toBe('6 · 6 · 6 = 216');
        m.learner(choices(4, 3, true, true));
        expect(readout('count')).toBe('64');
        expect(readout('leaves')).toBe('64');
        expect(m.graph.drawnKey()).not.toBe('choices-table');
    } finally {
        m.mounted.view.unmount();
    }
});

test('CB2 step 5: C(6, 3) = 20 = 120 / 3!, 3! = 6 orderings and the caption "x 20 groups = 120 / 6"', () => {
    const m = mountCounting();
    try {
        expect(falling(6, 3) / fact(3)).toBe(20n);
        expect(choose(6, 3)).toBe(20n);
        m.scene(countingTreeLesson, 'cb2-combinations');
        expect(readout('count')).toBe('20');
        expect(readout('orderings')).toBe('3! = 6');
        expect(readout('division')).toBe('120 / 6 = 20');
        expect(m.graph.captions().map(norm)).toContain(norm(t('combinatorics_counting_cap_groups', {value0: '20', value1: '120', value2: '6'})));
        const example = countingTreeLesson.workedExamples.find(item => item.id === 'cb2-combination')!;
        expect(prose(example.resultLatex)).toContain('\\binom63=\\frac{120}{6}=20');
    } finally {
        m.mounted.view.unmount();
    }
});

test.each(['sl', 'en'] as const)('CB2 step 6 (%s): MISSISSIPPI has 11 letters, 11! = 39 916 800 and 11! / (1! 4! 4! 2!) = 34 650', language => {
    setLanguage(language);
    const separator = language === 'sl' ? ' ' : ',';
    const m = mountCounting();
    try {
        const divisor = fact(1) * fact(4) * fact(4) * fact(2);
        expect(divisor).toBe(1152n);
        expect(fact(11)).toBe(39916800n);
        expect(fact(11) / divisor).toBe(34650n);
        expect(fact(11) % divisor).toBe(0n);
        expect(fact(11) / (fact(4) * fact(4) * fact(2) * fact(1))).toBe(falling(11, 1) * choose(10, 4) * choose(6, 4) * choose(2, 2) / 1n); // multinomial by choosing the places
        m.scene(countingTreeLesson, 'cb2-repetition');
        expect(readout('letters')).toBe('11');
        expect(readout('all-different')).toBe(`11! = ${grouped(39916800n, separator)}`);
        expect(norm(readout('arrangements'))).toContain('34650');
        expect(readout('arrangements')).toContain(grouped(34650n, separator));
        expect(m.graph.state.counts).toEqual([1, 4, 4, 2]);
        const example = countingTreeLesson.workedExamples.find(item => item.id === 'cb2-mississippi')!;
        expect(prose(example.calculationLatex)).toContain('\\frac{39\\,916\\,800}{1\\cdot24\\cdot24\\cdot2}'.replace(/\\,/g, ''));
        expect(prose(example.calculationLatex)).toContain('\\frac{39916800}{1152}');
    } finally {
        m.mounted.view.unmount();
    }
});

test('CB2 step 7: the starting case is V_6^3 = 120; the four kinds of the table equal the independent counts', () => {
    const m = mountCounting();
    try {
        m.scene(countingTreeLesson, 'cb2-explore');
        expect(readout('count')).toBe('120');
        // ordered/unordered x repetition: V, V', C, C' = C(n + k - 1, k).
        expect(m.graph.table().map(row => row.count)).toEqual([falling(6, 3), BigInt(6) ** 3n, choose(6, 3), choose(8, 3)]);
    } finally {
        m.mounted.view.unmount();
    }
});

// ---- leaving ------------------------------------------------------------------------------------------------------------------------

test.each([['CB1', latticePathsLesson, 'lattice'], ['CB2', countingTreeLesson, 'counting']] as const)('%s: restoring the checkpoint on leaving returns the free state', (_name, lesson, kind) => {
    const m = kind === 'lattice' ? mountLattice() : mountCounting();
    try {
        const free = JSON.stringify(m.graph.state);
        const freeReadouts = allReadouts();
        for (const step of lesson.steps) m.scene(lesson, step.id);
        m.learner(...(kind === 'lattice' ? [target(20, 20), display('triangle', true)] : [choices(5, 5, true, true)]));
        expect(JSON.stringify(m.graph.state)).not.toEqual(free);
        act(() => { m.capabilities.restoreState(m.checkpoint); });
        expect(JSON.stringify(m.graph.state)).toEqual(free);
        expect(allReadouts()).toEqual(freeReadouts);
    } finally {
        m.mounted.view.unmount();
    }
});
