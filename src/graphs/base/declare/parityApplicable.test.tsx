/**
 * Whether parity applies to a graph (used by scripts/graph-check.cjs): a declaration that shows no values has nothing to
 * compare. `BEZEG_PARITY_NA=<demonstration id>` runs the real graph; the rest checks the rule on fake declarations.
 */
import {describe, expect, test} from 'vitest';
import {createGraph} from '../createTestGraph';
import type {GraphDeclaration} from './graphDeclaration';
import {showsNoValues} from './parity';

const id = process.env.BEZEG_PARITY_NA;
const base = {legend: [], actions: []} as unknown as GraphDeclaration;

describe('parity not applicable', () => {
    test('a declaration without readouts, notes, help or status shows no values', () => {
        expect(showsNoValues(base)).toBe(true);
        expect(showsNoValues({...base, readouts: []} as GraphDeclaration)).toBe(true);
        expect(showsNoValues(undefined)).toBe(false);
    });

    test('a declaration with readouts, notes, help or status needs a recording', () => {
        expect(showsNoValues({...base, readouts: [{rows: [{id: 'a'}]}]} as unknown as GraphDeclaration)).toBe(false);
        expect(showsNoValues({...base, notes: [{id: 'n'}]} as unknown as GraphDeclaration)).toBe(false);
        expect(showsNoValues({...base, status: [{id: 's'}]} as unknown as GraphDeclaration)).toBe(false);
    });

    test.skipIf(!id)('the graph under check shows no values (BEZEG_PARITY_NA=<id>)', () => {
        expect(showsNoValues(createGraph(id as never).getDeclaration()), `${id} declares readouts, notes, help or status: record parity`).toBe(true);
    });
});
