/**
 * CB1 and CB2 (lattice-paths, counting-tree): every scene lands in the state the text states (the real graph, one synchronous sequence of actions from a
 * restored checkpoint, out of order and twice), every number a step quotes is bound to its step against the real readout, and the counts are recomputed
 * here with BigInt arithmetic (Pascal's rule, products and factorials, not the combinatorics kernel). Numbers the text asks the learner to produce are
 * checked by applying that change as an action and reading the readout.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {binomialTheoremLesson, countingTreeLesson, latticePathsLesson, pascalIdentityLesson} from './combinatoricsGuidedLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import type {LessonAction, LocalizedText} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
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

// ======================================================================================================================================
// CB3 (Pascal's identity) and CB4 (the binomial theorem): scenes against the real readouts, an independent BigInt recomputation, and the prediction
// order (the scene opens on a neutral state, the explanation asks, the learner's own entry reveals the answer).
// ======================================================================================================================================

/** (x + c)^n by repeated multiplication of the polynomial, highest power of x first: no binomial formula, no kernel. */
function expand(n: number, c: number): bigint[] {
    let poly = [1n];
    for (let i = 0; i < n; i++) {
        const next: bigint[] = Array(poly.length + 1).fill(0n);
        poly.forEach((value, j) => { next[j] += value; next[j + 1] += value * BigInt(c); });
        poly = next;
    }
    return poly;
}
const sumOf = (values: bigint[]) => values.reduce((a, b) => a + b, 0n);
const expansion = (n: number, c: number): LessonAction => ({kind: 'combinatorics', operation: 'set-expansion', n, c});
const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** The string count and the words of each group of the strings table, from the DOM. */
/** The coefficients readout as digits joined by semicolons (the separator is a semicolon in Slovenian and a comma in English). */
const coefficients = () => tokens(readout('coefficients') ?? '').join(';');
const stringGroups = () => [...document.querySelectorAll('[data-strings-group]')].map(row => ({count: row.children[1].textContent, words: row.children[2].textContent ?? ''}));
/** Everything the learner can read in a state: the readouts, the status and the strings table. */
const visibleText = () => [...allReadouts(), status(), document.querySelector('[data-combinatorics-strings]')?.textContent].join(' | ');
/** Whole numbers of a text (a digit run inside a longer run is not one; superscript digits are not). */
const tokens = (text: string): string[] => text.match(/(?<![0-9])[0-9]+(?![0-9])/g) ?? [];

const parentsOf = (a: number, b: number) => ({
    entry: choose(a + b, a),
    left: a >= 1 ? choose(a + b - 1, a - 1) : undefined,
    right: b >= 1 ? choose(a + b - 1, a) : undefined,
});
const triangleRows = (a: number, b: number): Record<string, string> => {
    const p = parentsOf(a, b);
    return {
        entry: norm(`${binomOf(a + b, a)} = ${p.entry}`), 'parent-left': num(p.left!), 'parent-right': num(p.right!),
        'parents-sum': num(p.left! + p.right!), 'row-sum': norm(`${2n ** BigInt(a + b)} = 2${SUPERSCRIPT[a + b]}`),
    };
};
const pathRows = (a: number, b: number): Record<string, string> => ({
    target: pointOf(a, b), count: num(choose(a + b, a)), formula: norm(`${binomOf(a + b, a)} = ${choose(a + b, a)}`),
    'last-right': num(choose(a + b - 1, a - 1)), 'last-up': num(choose(a + b - 1, a)),
    'last-sum': norm(`${choose(a + b - 1, a - 1)} + ${choose(a + b - 1, a)} = ${choose(a + b, a)}`),
});

interface Cb3Scene { readonly a: number; readonly b: number; readonly view: 'paths' | 'triangle'; readonly split: boolean }
const CB3: Record<string, Cb3Scene> = {
    'cb3-predict': {a: 2, b: 2, view: 'paths', split: false},
    'cb3-partition': {a: 4, b: 3, view: 'paths', split: true},
    'cb3-identity': {a: 4, b: 3, view: 'triangle', split: false},
    'cb3-rows': {a: 2, b: 1, view: 'triangle', split: false},
    'cb3-symmetry': {a: 3, b: 2, view: 'triangle', split: false},
    'cb3-explore': {a: 5, b: 3, view: 'paths', split: false},
};
interface Cb4Scene { readonly n: number; readonly c: number }
const CB4: Record<string, Cb4Scene> = {
    'cb4-square': {n: 1, c: 1}, 'cb4-strings': {n: 2, c: 1}, 'cb4-collect': {n: 1, c: 1}, 'cb4-four': {n: 3, c: 1},
    'cb4-weight': {n: 5, c: 1}, 'cb4-sum': {n: 4, c: 2}, 'cb4-explore': {n: 6, c: 2},
};
const lessonsB = [
    ['CB3', pascalIdentityLesson, CB3, 'pascal-identity', 'lattice-paths-cb3', 6],
    ['CB4', binomialTheoremLesson, CB4, 'binomial-theorem', 'lattice-paths-cb4', 7],
] as const;
const lessonOfStep = (id: string) => (id.startsWith('cb3') ? pascalIdentityLesson : binomialTheoremLesson);

describe.each(lessonsB)('%s: structure and ownership', (_name, lesson, scenes, section, id, count) => {
    test('ordered steps with a scene each, owned by the lattice-paths chapter section', () => {
        expect(lesson.steps.map(step => step.order)).toEqual(Array.from({length: count}, (_, i) => i + 1));
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(scenes));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(count);
        const owned = getChapterOwnedLessons('combinatorics')!.lesson(section)!;
        expect(owned.id).toBe(id);
        expect(owned.steps).toHaveLength(count);
        expect(owned.steps.every(step => step.scene)).toBe(true);
    });
});

/** Every text of a lesson (both languages). */
function allTexts(lesson: GuidedLesson): string[] {
    const out: string[] = [];
    const walk = (value: unknown) => {
        if (typeof value === 'string') out.push(value);
        else if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === 'object') Object.values(value).forEach(walk);
    };
    walk({...lesson, steps: lesson.steps.map(step => ({...step, scene: {...step.scene, actions: undefined}}))});
    return out;
}

describe.each(lessonsB)('%s: text', (_name, lesson) => {
    test('no escape swallowed a LaTeX command (a control character from \\b, \\f, \\t, \\v, \\r) and no doubled backslash survives', () => {
        for (const text of allTexts(lesson)) {
            expect(text).not.toMatch(/[\u0000-\u0008\u000b-\u001f]/);
            expect(text).not.toMatch(/\\\\/);
        }
    });

    test('sl and en quote the same numbers, text by text', () => {
        const digits = (text: string) => tokens(text.replace(/\{,\}|\\,/g, '').replace(/\\[a-zA-Z]+/g, ' ').replace(/from step \d/g, '')).sort().join(',');
        const all: LocalizedText[] = [
            lesson.summary,
            ...lesson.formulaBlocks.flatMap(f => [f.notation, f.explanation]),
            ...lesson.workedExamples.flatMap(e => [e.title, e.check]),
            ...lesson.steps.flatMap(s => [s.title, s.purpose, s.explanation, s.observationPrompt, ...s.expectedObservations, s.scene!.expectedState]),
        ];
        expect(all.length).toBeGreaterThan(40);
        for (const item of all) expect({text: item.en.slice(0, 40), en: digits(item.en)}).toEqual({text: item.en.slice(0, 40), en: digits(item.sl)});
    });

    test('every worked example is attached to a step, and every quoted binomial with a value (\\binom73=35) is the true one', () => {
        const attached = lesson.steps.map(step => step.workedExampleId).filter((id): id is string => Boolean(id));
        expect(attached.length).toBeGreaterThan(0);
        for (const id of attached) expect(lesson.workedExamples.some(example => example.id === id)).toBe(true);
        let checked = 0;
        for (const text of allTexts(lesson)) {
            for (const match of text.matchAll(/\\binom(?:\{(\d+)\}\{(\d+)\}|(\d)(\d))(?:=(\d+)(?![0-9+]))?/g)) {
                const n = Number(match[1] ?? match[3]);
                const k = Number(match[2] ?? match[4]);
                expect(k).toBeLessThanOrEqual(n);
                if (match[5] !== undefined) { expect({n, k, value: match[5]}).toEqual({n, k, value: String(choose(n, k))}); checked++; }
            }
        }
        expect(checked).toBeGreaterThan(0);
    });
});

test('CB3: the quoted binomials, parents and edge, recomputed with Pascal\'s rule', () => {
    expect([choose(7, 3), choose(6, 2) + choose(6, 3)]).toEqual([35n, 35n]);
    expect([choose(6, 2), choose(6, 3), choose(6, 4)]).toEqual([15n, 20n, 15n]);
    expect([choose(7, 4), choose(7, 3)]).toEqual([35n, 35n]); // the readout of (4, 3) and the example's symmetry check
    expect([choose(4, 2), choose(4, 3)]).toEqual([6n, 4n]);
    expect(pascal(3)).toEqual([1n, 3n, 3n, 1n]);
    expect(pascal(4)).toEqual([1n, 4n, 6n, 4n, 1n]);
    expect(choose(5, 3)).toBe(choose(4, 2) + choose(4, 3));
    expect([choose(5, 3), choose(5, 2)]).toEqual([10n, 10n]); // (3, 2) and (2, 3)
    expect(choose(8, 5)).toBe(choose(7, 4) + choose(7, 5)); // (5, 3): 56 = 35 + 21
    expect([choose(7, 4), choose(7, 5)]).toEqual([35n, 21n]);
    expect(parentsOf(3, 3)).toEqual({entry: 20n, left: 10n, right: 10n}); // equal parents at a = b
    expect(parentsOf(6, 0)).toEqual({entry: 1n, left: 1n, right: undefined}); // the edge: one parent
    const example = pascalIdentityLesson.workedExamples[0];
    expect(example.calculationLatex).toBe('\\binom73=\\binom62+\\binom63=15+20');
    expect(example.resultLatex).toBe('\\binom73=35');
    for (const language of ['sl', 'en'] as const) expect(prose(example.check[language])).toContain('35=20+15');
});

test('CB4: the quoted coefficient lists and sums, recomputed as the repeated product of (x + c)', () => {
    expect(expand(2, 1)).toEqual([1n, 2n, 1n]);
    expect(expand(3, 1)).toEqual([1n, 3n, 3n, 1n]);
    expect(expand(4, 1)).toEqual([1n, 4n, 6n, 4n, 1n]);
    expect(expand(5, 1)).toEqual([1n, 5n, 10n, 10n, 5n, 1n]);
    expect(expand(5, 2)).toEqual([1n, 10n, 40n, 80n, 80n, 32n]);
    expect(expand(4, 2)).toEqual([1n, 8n, 24n, 32n, 16n]);
    expect(expand(6, 2)).toEqual([1n, 12n, 60n, 160n, 240n, 192n, 64n]);
    expect(sumOf(expand(5, 2))).toBe(243n);
    expect(sumOf(expand(5, 2))).toBe(3n ** 5n);
    expect(sumOf(expand(6, 2))).toBe(729n);
    expect(sumOf(expand(4, 2))).toBe(81n);
    expect(sumOf(expand(5, -1))).toBe(0n);
    for (const [n, c] of [[3, 1], [5, 1], [5, 2], [6, 2], [7, -3], [12, 9]] as const) {
        expand(n, c).forEach((value, j) => expect(value).toBe(choose(n, j) * BigInt(c) ** BigInt(j)));
        expect(sumOf(expand(n, c))).toBe(BigInt(1 + c) ** BigInt(n));
    }
    expect(choose(5, 1) * 2n).toBe(10n); // x^4 in (x + 2)^5
    expect(choose(5, 2) * 2n ** 2n).toBe(40n); // x^3, the worked example
    expect(choose(3, 2)).toBe(3n);
    expect([2n ** 3n, 2n ** 4n]).toEqual([8n, 16n]);
    const example = binomialTheoremLesson.workedExamples[0];
    expect(example.calculationLatex).toBe('\\binom52\\cdot2^2=10\\cdot4');
    expect(example.resultLatex).toBe('\\binom52\\cdot2^2=40');
});

// ---- the scenes against the real graph -----------------------------------------------------------------------------------------------

test.each(['sl', 'en'] as const)('CB3 (%s): every scene lands in the stated state and readouts, from a restored checkpoint, out of order and twice', language => {
    setLanguage(language);
    const m = mountLattice();
    try {
        const ids = Object.keys(CB3);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const expected = CB3[id];
            m.scene(pascalIdentityLesson, id);
            m.scene(pascalIdentityLesson, id);
            expect({id, ...pick(m.graph.state, ['a', 'b', 'view', 'split', 'showCounts', 'route'])}).toEqual({id, ...expected, showCounts: false, route: 0});
            const rows = expected.view === 'paths' ? pathRows(expected.a, expected.b) : triangleRows(expected.a, expected.b);
            for (const [row, text] of Object.entries(rows)) expect({id, row, text: norm(readout(row))}).toEqual({id, row, text: norm(text)});
        }
    } finally {
        m.mounted.view.unmount();
    }
});

test.each(['sl', 'en'] as const)('CB4 (%s): every scene lands in the stated state, readouts and strings table, from a restored checkpoint, out of order and twice', language => {
    setLanguage(language);
    const m = mountLattice();
    try {
        const ids = Object.keys(CB4);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const {n, c} = CB4[id];
            m.scene(binomialTheoremLesson, id);
            m.scene(binomialTheoremLesson, id);
            expect({id, ...pick(m.graph.state, ['view', 'n', 'c'])}).toEqual({id, view: 'expansion', n, c});
            expect({id, text: coefficients()}).toEqual({id, text: expand(n, c).join(';')});
            expect(norm(readout('coefficient-sum'))).toContain(`=${sumOf(expand(n, c))}`);
            if (n <= 5) {
                const groups = stringGroups();
                expect({id, sizes: groups.map(group => group.count)}).toEqual({id, sizes: pascal(n).map(String)});
                expect({id, total: groups.reduce((total, group) => total + group.words.split(' ').length, 0)}).toEqual({id, total: 2 ** n});
            } else {
                expect({id, off: document.querySelector('[data-combinatorics-strings-off]') !== null}).toEqual({id, off: true});
            }
        }
    } finally {
        m.mounted.view.unmount();
    }
});

test.each(['sl', 'en'] as const)('CB3 and CB4 (%s): every number the expected-state text quotes is read in the opening state or is a coordinate of it', language => {
    setLanguage(language);
    const m = mountLattice();
    try {
        for (const lesson of [pascalIdentityLesson, binomialTheoremLesson]) {
            for (const step of lesson.steps) {
                m.scene(lesson, step.id);
                const state = m.graph.state;
                const readable = new Set([...tokens(visibleText()), String(state.a), String(state.b), String(state.n), String(state.c)]);
                const quoted = tokens(step.scene!.expectedState[language].replace(/\\,|\{,\}/g, '').replace(/\\[a-zA-Z]+/g, ' '));
                expect(quoted.length).toBeGreaterThan(0);
                for (const value of quoted) expect({id: step.id, value, readable: readable.has(value)}).toEqual({id: step.id, value, readable: true});
            }
        }
    } finally {
        m.mounted.view.unmount();
    }
});

// ---- the opening state must not show the step's answer; the learner's own entry reveals it -------------------------------------------------

interface Reveal {
    /** The learner's entry, as real actions after the scene. */
    readonly enter: LessonAction[];
    /** The numbers of the predicted answer: absent from the opening state, read after the entry. */
    readonly answers: readonly string[];
    /** Search only the coefficients readout and the strings table in the opening state (the sum readout shows the base 1 + c). */
    readonly only?: 'coefficients-and-table';
    /** The rows the entry must show (computed after the language is set). */
    readonly rows: () => Readonly<Record<string, string>>;
}
const REVEAL: Record<string, Reveal> = {
    'cb3-predict': {enter: [target(4, 3)], answers: ['20', '15', '35'], rows: () => pathRows(4, 3)},
    'cb3-rows': {enter: [target(3, 2)], answers: ['10', '6', '4'], rows: () => triangleRows(3, 2)},
    'cb4-square': {enter: [expansion(2, 1)], answers: ['2', '4'], only: 'coefficients-and-table', rows: () => ({coefficients: expand(2, 1).join(';'), 'coefficient-sum': norm('2² = 4')})},
    'cb4-strings': {enter: [expansion(3, 1)], answers: ['8'], rows: () => ({coefficients: expand(3, 1).join(';'), 'coefficient-sum': norm('2³ = 8')})},
    'cb4-collect': {enter: [expansion(3, 1)], answers: ['3'], rows: () => ({coefficients: expand(3, 1).join(';')})},
    'cb4-four': {enter: [expansion(4, 1)], answers: ['16', '6'], rows: () => ({coefficients: expand(4, 1).join(';'), 'coefficient-sum': norm('2⁴ = 16')})},
    'cb4-sum': {enter: [expansion(5, 2)], answers: ['243'], rows: () => ({coefficients: expand(5, 2).join(';'), 'coefficient-sum': norm('3⁵ = 243')})},
};

test.each(['sl', 'en'] as const)('CB3 and CB4 (%s): the prediction steps open without their answer, and the learner\'s entry shows it', language => {
    setLanguage(language);
    const m = mountLattice();
    try {
        expect(Object.keys(REVEAL)).toHaveLength(7);
        for (const [id, reveal] of Object.entries(REVEAL)) {
            const lesson = lessonOfStep(id);
            m.scene(lesson, id);
            const opening = reveal.only
                ? [readout('coefficients'), document.querySelector('[data-combinatorics-strings]')?.textContent].join(' | ')
                : visibleText();
            for (const answer of reveal.answers) expect({id, answer, shown: tokens(opening).includes(answer)}).toEqual({id, answer, shown: false});
            m.learner(...reveal.enter);
            for (const [row, text] of Object.entries(reveal.rows())) expect({id, row, text: row === 'coefficients' ? coefficients() : norm(readout(row))}).toEqual({id, row, text: row === 'coefficients' ? text : norm(text)});
            const after = tokens(visibleText());
            for (const answer of reveal.answers) expect({id, answer, shown: after.includes(answer)}).toEqual({id, answer, shown: true});
        }
    } finally {
        m.mounted.view.unmount();
    }
});

test.each(['sl', 'en'] as const)('CB3 and CB4 (%s): the other values the prompts ask the learner to enter are allowed and show what the expected observations state', language => {
    setLanguage(language);
    const m = mountLattice();
    try {
        m.scene(pascalIdentityLesson, 'cb3-partition');
        m.learner(target(3, 3));
        expect(readout('count')).toBe('20');
        m.learner(target(4, 2));
        expect(readout('count')).toBe('15');
        m.scene(pascalIdentityLesson, 'cb3-identity');
        m.learner(target(6, 0));
        expect(status()).toBe(t('combinatorics_lattice_status_triangle_edge', {value0: '6', value1: '6', value2: '1'}));
        expect(readout('parent-right')).toBe('–');
        m.scene(pascalIdentityLesson, 'cb3-symmetry');
        m.learner(target(2, 3));
        expect(norm(readout('entry'))).toBe(norm(`${binomOf(5, 2)} = 10`));
        expect([readout('parent-left'), readout('parent-right')]).toEqual(['4', '6']);
        m.scene(pascalIdentityLesson, 'cb3-explore');
        m.learner(target(3, 3));
        expect(readout('last-right')).toBe(readout('last-up'));
        m.learner(target(5, 0));
        expect([readout('last-right'), readout('last-up')]).toEqual(['1', '0']);
        m.scene(binomialTheoremLesson, 'cb4-weight');
        m.learner(expansion(5, 2));
        expect(coefficients()).toBe('1;10;40;80;80;32');
        m.scene(binomialTheoremLesson, 'cb4-explore');
        m.learner(expansion(6, -1));
        expect(norm(readout('coefficient-sum'))).toContain('=0');
        expect(document.querySelector('[data-combinatorics-strings-off]')).not.toBeNull();
    } finally {
        m.mounted.view.unmount();
    }
});

// ---- the prediction order in the text ------------------------------------------------------------------------------------------------

/** What the step's prediction asks for: numbers (whole) and phrases (without spaces) that must not be in its explanation, title, worked example or formulas. */
const PREDICTED: Record<string, {readonly numbers?: readonly string[]; readonly phrases?: readonly string[]}> = {
    'cb3-predict': {numbers: ['20', '15', '35']},
    'cb3-partition': {numbers: ['20', '15']},
    'cb3-identity': {phrases: ['enegastarša', 'onlyoneparent']},
    'cb3-rows': {numbers: ['10', '6'], phrases: ['1,4,6,4,1']},
    'cb4-square': {numbers: ['4'], phrases: ['1,2,1']},
    'cb4-strings': {numbers: ['8']},
    'cb4-collect': {phrases: ['\\binom32', '1,3,3,1']},
    'cb4-four': {numbers: ['16', '6'], phrases: ['1,4,6,4,1']},
    'cb4-weight': {phrases: ['\\binom51\\cdot2']},
    'cb4-sum': {numbers: ['243'], phrases: ['3^5']},
};

test.each(['sl', 'en'] as const)('CB3 and CB4 (%s): no step\'s explanation, title, worked example or formulas gives the answer its prediction asks for', language => {
    for (const lesson of [pascalIdentityLesson, binomialTheoremLesson]) {
        for (const step of lesson.steps) {
            const predicted = PREDICTED[step.id];
            if (!predicted) continue;
            const formulas = lesson.formulaBlocks.filter(f => step.formulaIds.includes(f.id));
            const example = lesson.workedExamples.find(e => e.id === step.workedExampleId);
            const texts = [
                step.title[language], step.explanation[language],
                ...formulas.flatMap(f => [f.latex, f.notation[language], f.explanation[language]]),
                ...(example ? [example.title[language], example.calculationLatex, example.resultLatex, example.check[language]] : []),
            ];
            for (const text of texts) {
                for (const value of predicted.numbers ?? []) expect({id: step.id, value, found: hasNumber(text, value)}).toEqual({id: step.id, value, found: false});
                for (const phrase of predicted.phrases ?? []) expect({id: step.id, phrase, found: prose(text).includes(phrase)}).toEqual({id: step.id, phrase, found: false});
            }
        }
    }
});

test.each(['sl', 'en'] as const)('CB3 and CB4 (%s): the lesson summary, shown before step 1, gives no step\'s answer', language => {
    for (const lesson of [pascalIdentityLesson, binomialTheoremLesson]) {
        for (const step of lesson.steps) {
            const predicted = PREDICTED[step.id];
            if (!predicted) continue;
            for (const value of predicted.numbers ?? []) expect({id: step.id, value, found: hasNumber(lesson.summary[language], value)}).toEqual({id: step.id, value, found: false});
            for (const phrase of predicted.phrases ?? []) expect({id: step.id, phrase, found: prose(lesson.summary[language]).includes(phrase)}).toEqual({id: step.id, phrase, found: false});
        }
    }
});
