import {
    combinationsWithRepetition, COUNT_N_RANGE, DEFAULT_COUNTING_STATE, DEFAULT_LATTICE_STATE, deriveCounting, deriveExpansion, deriveLattice, deriveMultiset,
    deriveRow, expansionStrings, formatCount, gridCounts, isEnumerable, keepKValid, parseCountingState, parseLatticeState, routePoints, routeString,
    orderingGroups, selectableRoutes, serializeCountingState, serializeLatticeState, snapInput, TARGET_RANGE, treeLeaves, TREE_LEAF_LIMIT, withTarget,
    type CountingState, type LatticeState,
} from './combinatoricsModel';
import {binomial, variations} from './binomial';
import {ENUMERATION_CAP, pathCount} from './latticePaths';

const lattice = (patch: Partial<LatticeState> = {}): LatticeState => ({...DEFAULT_LATTICE_STATE, ...patch});
const counting = (patch: Partial<CountingState> = {}): CountingState => ({...DEFAULT_COUNTING_STATE, ...patch});
const roundTrip = (state: LatticeState) => parseLatticeState(JSON.parse(JSON.stringify(serializeLatticeState(state))));

describe('lattice state', () => {
    test('the default state parses and survives a JSON Preset round trip unchanged', () => {
        const parsed = roundTrip(DEFAULT_LATTICE_STATE);
        expect(parsed).toEqual({ok: true, value: DEFAULT_LATTICE_STATE});
        const edited = lattice({view: 'expansion', a: 12, b: 0, route: 0, showCounts: true, split: true, n: 12, c: -9});
        expect(roundTrip(edited)).toEqual({ok: true, value: edited});
    });

    test('counts are never read from a Preset: derived fields in the data are dropped and the count is recomputed', () => {
        const poisoned = {...serializeLatticeState(lattice({a: 5, b: 3})), count: '999', digits: '999', masks: [1, 2, 3], lastR: '1'};
        const parsed = parseLatticeState(poisoned);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(Object.keys(parsed.value).sort()).toEqual(['a', 'b', 'c', 'n', 'route', 'showCounts', 'split', 'view']);
        expect(deriveLattice(parsed.value).count).toBe(56n);
    });

    test.each([
        [null, 'state', 'not-an-object'],
        [[], 'state', 'not-an-object'],
        [{...DEFAULT_LATTICE_STATE, view: 'cube'}, 'view', 'unknown-value'],
        [{...DEFAULT_LATTICE_STATE, a: '5'}, 'a', 'not-finite'],
        [{...DEFAULT_LATTICE_STATE, a: Number.NaN}, 'a', 'not-finite'],
        [{...DEFAULT_LATTICE_STATE, b: 2.5}, 'b', 'off-grid'],
        [{...DEFAULT_LATTICE_STATE, a: 21}, 'a', 'out-of-range'],
        [{...DEFAULT_LATTICE_STATE, b: -1}, 'b', 'out-of-range'],
        [{...DEFAULT_LATTICE_STATE, route: 56}, 'route', 'inconsistent'],
        [{...DEFAULT_LATTICE_STATE, a: 8, b: 8, route: 1}, 'route', 'inconsistent'],
        [{...DEFAULT_LATTICE_STATE, split: 1}, 'split', 'not-boolean'],
        [{...DEFAULT_LATTICE_STATE, n: 13}, 'n', 'out-of-range'],
        [{...DEFAULT_LATTICE_STATE, c: 10}, 'c', 'out-of-range'],
        [{...DEFAULT_LATTICE_STATE, c: undefined}, 'c', 'missing'],
    ])('a malformed or out-of-range state %# is rejected naming the field', (data, field, reason) => {
        const parsed = parseLatticeState(data);
        expect(parsed.ok).toBe(false);
        if (parsed.ok) return;
        expect(parsed.error.field).toBe(field);
        expect(parsed.error.reason).toBe(reason);
        expect(parsed.error.message).toContain(field === 'state' ? 'object' : field);
    });

    test('the last allowed route is accepted and the route above the cap must be 0', () => {
        expect(parseLatticeState(lattice({route: 55})).ok).toBe(true);
        expect(parseLatticeState(lattice({a: 8, b: 8, route: 0})).ok).toBe(true);
        expect(parseLatticeState(lattice({a: 6, b: 6, route: 923})).ok).toBe(true);
        expect(parseLatticeState(lattice({a: 6, b: 6, route: 924})).ok).toBe(false);
    });

    test('hand oracle: the checked counts of the spec come from the exact kernel as bigint', () => {
        expect(deriveLattice(lattice({a: 5, b: 3})).count).toBe(56n);
        expect(deriveLattice(lattice({a: 6, b: 6})).count).toBe(924n);
        expect(deriveLattice(lattice({a: 10, b: 10})).count).toBe(184756n);
        expect(deriveLattice(lattice({a: 20, b: 20})).count).toBe(137846528820n);
        expect(typeof deriveLattice(lattice()).count).toBe('bigint');
    });

    test('the cap: 12 steps are enumerated, 13 are only counted, and the state keeps route 0 above it', () => {
        expect(ENUMERATION_CAP).toBe(12);
        expect(isEnumerable(6, 6)).toBe(true);
        expect(isEnumerable(7, 6)).toBe(false);
        expect(deriveLattice(lattice({a: 6, b: 6})).masks).toHaveLength(924);
        const over = deriveLattice(lattice({a: 7, b: 6}));
        expect(over.masks).toHaveLength(0);
        expect(over.enumerable).toBe(false);
        expect(over.count).toBe(1716n);
        expect(selectableRoutes(7, 6)).toBe(1);
    });

    test('hand oracle: Pascal 35 = 15 + 20 splits the routes to (4, 3) by their last step', () => {
        const d = deriveLattice(lattice({a: 4, b: 3}));
        expect(d.count).toBe(35n);
        expect(d.lastR).toBe(20n);
        expect(d.lastU).toBe(15n);
        const onEdge = deriveLattice(lattice({a: 0, b: 4}));
        expect([onEdge.count, onEdge.lastR, onEdge.lastU]).toEqual([1n, 0n, 1n]);
        // the colours counted from the enumerated list equal the parents' counts
        const masks = d.masks;
        expect(masks.filter(mask => mask & 1)).toHaveLength(20);
        expect(masks.filter(mask => !(mask & 1))).toHaveLength(15);
    });

    test('route strings and corner points: step 0 is the most significant bit, 1 is R', () => {
        expect(routeString(0b0011, 4)).toBe('UURR');
        expect(routePoints(0b0011, 4)).toEqual([[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]]);
        const first = deriveLattice(lattice({a: 2, b: 2})).masks;
        expect(first.map(mask => routeString(mask, 4))).toEqual(['UURR', 'URUR', 'URRU', 'RUUR', 'RURU', 'RRUU']);
    });

    test('grid counts are the sum of the point left and the point below, equal to the closed formula', () => {
        const grid = gridCounts(12, 12);
        for (let x = 0; x <= 12; x++) for (let y = 0; y <= 12; y++) expect(grid[x][y]).toBe(pathCount(x, y));
        expect(grid[5][3]).toBe(56n);
        expect(grid[2][2]).toBe(6n);
        expect(grid[0].every(value => value === 1n)).toBe(true);
    });

    test('the new target restarts the route list; the same target keeps the state object', () => {
        const state = lattice({route: 7});
        expect(withTarget(state, 5, 3)).toBe(state);
        expect(withTarget(state, 6, 3)).toEqual({...state, a: 6, route: 0});
    });

    test('hand oracle: (x + 2)^5 has 1, 10, 40, 80, 80, 32 and sums to 3^5; the strings of (a + b)^4 group as 1, 4, 6, 4, 1', () => {
        const d = deriveExpansion(lattice({n: 5, c: 2}));
        expect(d.coefficients).toEqual([1n, 10n, 40n, 80n, 80n, 32n]);
        expect(d.sum).toBe(243n);
        expect(d.groups!.map(group => group.length)).toEqual([1, 5, 10, 10, 5, 1]);
        expect(deriveExpansion(lattice({n: 6, c: 2})).groups).toBeNull();
        const four = deriveExpansion(lattice({n: 4, c: 1}));
        expect(four.groups!.map(group => group.length)).toEqual([1, 4, 6, 4, 1]);
        expect(four.groups![1]).toEqual(['aaab', 'aaba', 'abaa', 'baaa']);
        expect(expansionStrings(5).flat()).toHaveLength(32);
        expect(deriveExpansion(lattice({n: 5, c: -9})).sum).toBe(-32768n);
    });

    test('the one snapping path rounds, clamps, reports the adjustment and rejects NaN and infinity', () => {
        expect(snapInput(3.4, TARGET_RANGE, 'a')).toEqual({ok: true, value: {value: 3, clamped: false, adjusted: true}});
        expect(snapInput(7, TARGET_RANGE, 'a')).toEqual({ok: true, value: {value: 7, clamped: false, adjusted: false}});
        expect(snapInput(25, TARGET_RANGE, 'a')).toEqual({ok: true, value: {value: 20, clamped: true, adjusted: true}});
        expect(snapInput(-0.4, TARGET_RANGE, 'a')).toEqual({ok: true, value: {value: 0, clamped: false, adjusted: true}});
        const nan = snapInput(Number.NaN, TARGET_RANGE, 'a');
        expect(nan.ok).toBe(false);
        expect(snapInput(Number.POSITIVE_INFINITY, TARGET_RANGE, 'b').ok).toBe(false);
        expect(Object.is((snapInput(-0.2, TARGET_RANGE, 'a') as {value: {value: number}}).value.value, -0)).toBe(false);
    });
});

describe('counting state', () => {
    test('the default state round trips and the default example V(6, 3) is 120 with 20 combinations', () => {
        const parsed = parseCountingState(JSON.parse(JSON.stringify(serializeCountingState(DEFAULT_COUNTING_STATE))));
        expect(parsed).toEqual({ok: true, value: DEFAULT_COUNTING_STATE});
        const d = deriveCounting(DEFAULT_COUNTING_STATE);
        expect(d.count).toBe(120n);
        expect(d.treeShown).toBe(false);
        const unordered = deriveCounting(counting({ordered: false}));
        expect(unordered.count).toBe(20n);
        expect(unordered.orderings).toBe(6n);
        expect(unordered.ordered / unordered.orderings).toBe(unordered.count);
    });

    test('hand oracle: 5 books 120, repetition 6^3 = 216, V(5, 3) = 60 has a tree, 4^3 = 64 is the largest tree and 65 is not', () => {
        expect(deriveCounting(counting({n: 5, k: 5})).count).toBe(120n);
        expect(deriveCounting(counting({repetition: true})).count).toBe(216n);
        expect(deriveCounting(counting({n: 5, k: 3})).treeShown).toBe(true);
        expect(deriveCounting(counting({n: 4, k: 3, repetition: true})).treeShown).toBe(true);
        expect(deriveCounting(counting({n: 4, k: 3, repetition: true})).ordered).toBe(64n);
        expect(TREE_LEAF_LIMIT).toBe(64);
        expect(deriveCounting(counting({n: 65, k: 1, repetition: true})).treeShown).toBe(false);
        expect(deriveCounting(counting({n: 5, k: 4, ordered: false})).treeShown).toBe(false);
    });

    test('the tree leaves equal the formula for every n, k up to 7, with and without repetition', () => {
        for (let n = 0; n <= 5; n++) {
            for (let k = 0; k <= 5; k++) {
                expect(BigInt(treeLeaves(n, k, true).length)).toBe(BigInt(n) ** BigInt(k));
                if (k <= n) expect(BigInt(treeLeaves(n, k, false).length)).toBe(variations(n, k));
            }
        }
        expect(treeLeaves(3, 2, false)).toEqual([[1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2]]);
        expect(treeLeaves(2, 0, false)).toEqual([[]]);
    });

    test('orderingGroups lists the first combinations, each with exactly its k! orderings (hand values)', () => {
        const six = orderingGroups(6, 3, 3);
        expect(six.map(group => group.combination)).toEqual([[1, 2, 3], [1, 2, 4], [1, 2, 5]]);
        expect(six[0].orderings).toEqual([[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]);
        expect(six.every(group => group.orderings.length === 6)).toBe(true); // 3! = 6
        expect(six[2].orderings[5]).toEqual([5, 2, 1]);
        const four = orderingGroups(4, 3, 3); // C(4, 3) = 4 combinations, 3 shown
        expect(four.map(group => group.combination)).toEqual([[1, 2, 3], [1, 2, 4], [1, 3, 4]]);
        expect(four.every(group => group.orderings.length === 6)).toBe(true);
        const two = orderingGroups(5, 2, 3);
        expect(two.map(group => group.combination)).toEqual([[1, 2], [1, 3], [1, 4]]);
        expect(two[1].orderings).toEqual([[1, 3], [3, 1]]);
        expect(orderingGroups(3, 3, 3).length).toBe(1); // C(3, 3) = 1
        expect(orderingGroups(5, 5, 3)).toEqual([]); // k above ORDERINGS_GROUP_MAX_K
        expect(orderingGroups(5, 1, 3)).toEqual([]); // k below 2
    });

    test('combinations with repetition are C(n + k - 1, k); n = 0 allows only the empty pick', () => {
        expect(combinationsWithRepetition(3, 2)).toBe(6n);
        expect(combinationsWithRepetition(0, 0)).toBe(1n);
        expect(combinationsWithRepetition(0, 3)).toBe(0n);
        expect(deriveCounting(counting({n: 4, k: 3, ordered: false, repetition: true})).count).toBe(20n);
    });

    test('hand oracle: MISSISSIPPI is 11!/(4! 4! 2!) = 34650 against 39916800 for eleven different letters', () => {
        const d = deriveMultiset(DEFAULT_COUNTING_STATE);
        expect(d.total).toBe(11);
        expect(d.count).toBe(34650n);
        expect(d.allDifferent).toBe(39916800n);
    });

    test('hand oracle: row 10, the sums 1024 and 0, the hockey stick 70, and the weights of n = 5, t = 1/2', () => {
        const d = deriveRow(counting({view: 'row', n: 10, k: 3}));
        expect(d.row).toEqual([1n, 10n, 45n, 120n, 210n, 252n, 210n, 120n, 45n, 10n, 1n]);
        expect(d.sum).toBe(1024n);
        expect(d.alternatingSum).toBe(0n);
        expect(deriveRow(counting({view: 'row', n: 7, k: 3})).hockeyStick).toBe(70n);
        expect(deriveRow(counting({view: 'row', n: 7, k: 3})).hockeyStick).toBe(binomial(8, 4));
        const five = deriveRow(counting({view: 'row', n: 5, t: 50}));
        expect(five.weights[2]).toBeCloseTo(0.3125, 15);
        expect(Math.abs(five.weightSum - 1)).toBeLessThan(1e-15);
        expect(deriveRow(counting({view: 'row', n: 0})).alternatingSum).toBe(1n);
        for (const t of [0, 1, 37, 100]) expect(Math.abs(deriveRow(counting({view: 'row', n: 20, t})).weightSum - 1)).toBeLessThan(1e-12);
    });

    test.each([
        [{n: 3, k: 4, repetition: false}, 'k', 'inconsistent'],
        [{n: 21}, 'n', 'out-of-range'],
        [{k: -1}, 'k', 'out-of-range'],
        [{view: 'tree'}, 'view', 'unknown-value'],
        [{ordered: 'yes'}, 'ordered', 'not-boolean'],
        [{t: 101}, 't', 'out-of-range'],
        [{t: 0.5}, 't', 'off-grid'],
        [{counts: [1, 2, 3]}, 'counts', 'missing'],
        [{counts: [1, 2, 3, 13]}, 'counts[3]', 'out-of-range'],
        [{counts: [1, '2', 3, 4]}, 'counts[1]', 'not-finite'],
    ])('a malformed counting state %# is rejected naming the field', (patch, field, reason) => {
        const parsed = parseCountingState({...serializeCountingState(DEFAULT_COUNTING_STATE), ...patch});
        expect(parsed.ok).toBe(false);
        if (parsed.ok) return;
        expect(parsed.error.field).toBe(field);
        expect(parsed.error.reason).toBe(reason);
    });

    test('k above n is allowed with repetition, and keepKValid lowers k only when it is not', () => {
        expect(parseCountingState(serializeCountingState(counting({n: 2, k: 5, repetition: true}))).ok).toBe(true);
        expect(keepKValid(counting({n: 2, k: 5}))).toEqual(counting({n: 2, k: 2}));
        const same = counting({n: 2, k: 5, repetition: true});
        expect(keepKValid(same)).toBe(same);
        expect(COUNT_N_RANGE.max).toBe(20);
    });
});

describe('count display', () => {
    test('separators appear only in the formatted text: a no-break space in Slovenian, a comma in English; digits stay exact', () => {
        expect(formatCount(137846528820n, 'sl')).toBe('137 846 528 820');
        expect(formatCount(137846528820n, 'en')).toBe('137,846,528,820');
        expect(formatCount(924n, 'sl')).toBe('924');
        expect(formatCount(1000n, 'en')).toBe('1,000');
        expect(formatCount(-32768n, 'en')).toBe('−32,768');
        expect(formatCount(0n, 'sl')).toBe('0');
        expect(formatCount(118264581564861424n, 'sl').replace(/ /g, '')).toBe('118264581564861424');
    });
});
