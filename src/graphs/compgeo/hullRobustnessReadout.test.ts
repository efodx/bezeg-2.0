import {kettnerSignMap} from '../../compgeo/inexactOrientation';
import {
    chainOutputReadout, clampKettnerCoordinate, DEFAULT_KETTNER_CELL, formatDoubleValue, kettnerCellReadout, kettnerCounts,
    parseDuplicateRule, parseKettnerCoordinate, parseKettnerPanel, parsePopRule, parseRobustnessMode, signSymbol,
} from './hullRobustnessReadout';

describe('parsers', () => {
    test('accept exactly the saved values and reject everything else', () => {
        expect(parseRobustnessMode('chain')).toBe('chain');
        expect(parseRobustnessMode('kettner')).toBe('kettner');
        expect(parseRobustnessMode('other')).toBeUndefined();
        expect(parsePopRule('right')).toBe('right');
        expect(parsePopRule('non-left')).toBe('non-left');
        expect(parsePopRule('<')).toBeUndefined();
        expect(parseDuplicateRule('keep')).toBe('keep');
        expect(parseDuplicateRule('merge')).toBe('merge');
        expect(parseDuplicateRule(1)).toBeUndefined();
        expect(parseKettnerPanel('exact')).toBe('exact');
        expect(parseKettnerPanel('naive')).toBeUndefined();
    });

    test('cell coordinates are whole numbers in 0..63; clamping cuts to the range', () => {
        expect(parseKettnerCoordinate(0)).toBe(0);
        expect(parseKettnerCoordinate(63)).toBe(63);
        expect(parseKettnerCoordinate(64)).toBeUndefined();
        expect(parseKettnerCoordinate(-1)).toBeUndefined();
        expect(parseKettnerCoordinate(1.5)).toBeUndefined();
        expect(parseKettnerCoordinate('3')).toBeUndefined();
        expect(clampKettnerCoordinate(-4)).toBe(0);
        expect(clampKettnerCoordinate(99)).toBe(63);
        expect(clampKettnerCoordinate(12)).toBe(12);
        expect(DEFAULT_KETTNER_CELL).toEqual({i: 41, j: 48});
    });
});

describe('Kettner cell readout', () => {
    test('equals the sign map at (41, 48) and at cells of every kind', () => {
        const map = kettnerSignMap();
        const cell = kettnerCellReadout(41, 48);
        expect(cell).toMatchObject({i: 41, j: 48, exact: 1, naive: -1, kind: 'wrong-sign'});
        expect(cell?.naiveValue).toBeCloseTo(-5.68e-14, 15);
        for (const [i, j] of [[0, 0], [63, 63], [10, 20], [5, 63], [41, 48]]) {
            const expected = map.cells[j * 64 + i];
            const got = kettnerCellReadout(i, j);
            expect(got?.exact).toBe(expected.exact);
            expect(got?.naive).toBe(expected.naive);
            expect(got?.naiveValue).toBe(expected.naiveValue);
        }
        expect(kettnerCellReadout(-1, 0)).toBeUndefined();
        expect(kettnerCellReadout(0, 64)).toBeUndefined();
    });

    test('the kind of each cell follows the signs, and the counts equal the map', () => {
        const kinds = {agree: 0, 'wrong-sign': 0, 'false-zero': 0};
        for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) {
            const cell = kettnerCellReadout(i, j);
            if (!cell) throw new Error(`missing cell ${i},${j}`);
            kinds[cell.kind]++;
            if (cell.kind === 'agree') expect(cell.naive).toBe(cell.exact);
            if (cell.kind === 'false-zero') { expect(cell.naive).toBe(0); expect(cell.exact).not.toBe(0); }
            if (cell.kind === 'wrong-sign') { expect(cell.naive).not.toBe(0); expect(cell.naive).not.toBe(cell.exact); }
        }
        expect(kinds).toEqual({agree: kettnerCounts().agree, 'wrong-sign': 112, 'false-zero': 2052});
        expect(kettnerCounts()).toMatchObject({total: 4096, wrongSign: 112, falseZero: 2052});
    });

    test('signs are drawn as +, a true minus sign and 0', () => {
        expect([signSymbol(1), signSymbol(-1), signSymbol(0)]).toEqual(['+', '−', '0']);
    });
});

describe('double value text', () => {
    test('a tiny nonzero value is shown in exponent form, not as 0', () => {
        expect(formatDoubleValue(-5.68e-14, 'sl')).toBe('−5,68·10⁻¹⁴');
        expect(formatDoubleValue(-5.68e-14, 'en')).toBe('−5.68·10⁻¹⁴');
        expect(formatDoubleValue(2.84e-14, 'en')).toBe('2.84·10⁻¹⁴');
        expect(formatDoubleValue(1e-20, 'en')).toBe('1·10⁻²⁰');
    });

    test('an exact zero reads 0 and an ordinary value is formatted as usual', () => {
        expect(formatDoubleValue(0, 'sl')).toBe('0');
        expect(formatDoubleValue(-0, 'en')).toBe('0');
        expect(formatDoubleValue(0.5, 'sl')).toBe('0,5');
    });

    test('the headline cell shows its nonzero value', () => {
        const cell = kettnerCellReadout(41, 48);
        expect(formatDoubleValue(cell?.naiveValue ?? 0, 'en')).toMatch(/^−5\.\d+·10⁻¹⁴$/);
    });
});

describe('chain output readout', () => {
    const points = [{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2}, {x: 1, y: 1}];

    test('lists entries as 1-based numbers with coordinates and finds repeated locations', () => {
        const out = chainOutputReadout([0, 1, 2, 1], points);
        expect(out.entries.map(e => e.number)).toEqual([1, 2, 3, 2]);
        expect(out.repeated.map(e => e.number)).toEqual([2]);
    });

    test('a hull without repeats has none, and an index outside the points is skipped', () => {
        const out = chainOutputReadout([0, 2, 9], points);
        expect(out.entries.map(e => e.number)).toEqual([1, 3]);
        expect(out.repeated).toEqual([]);
    });

    test('two different input points at one location count as a repeat', () => {
        const out = chainOutputReadout([1, 3, 0], points);
        expect(out.repeated.map(e => e.number)).toEqual([2]);
    });
});
