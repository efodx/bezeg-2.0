/**
 * Whether parity applies to a graph (used by scripts/graph-check.cjs). Parity is not applicable only when the demonstration's
 * golden file shows no rows, notes or outputs in any state AND its declaration shows nothing (no readouts, notes, help or
 * status) in the default state and every lesson scene; otherwise a recording is required. `BEZEG_PARITY_NA=<demonstration id>`
 * runs the real graph; the rest checks the rule on fake declarations and recordings.
 */
import fs from 'fs';
import path from 'path';
import {describe, expect, test} from 'vitest';
import type {DemonstrationId} from '../../../demonstrations';
import {createGraph} from '../createTestGraph';
import {installBoardShims} from '../realGraphTestHarness';
import type {GraphDeclaration} from './graphDeclaration';
import {candidateStates} from './goldenStates';
import {goldenShowsNothing, type ParityRecording, parityNotApplicable, recordParityWithDeclarations, showsNoValues} from './parity';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: 600_000});

const id = process.env.BEZEG_PARITY_NA;
const base = {legend: [], actions: []} as unknown as GraphDeclaration;
const state = (rows: number, notes = 0, outputs = 0, captions = 0) => ({
    name: 's', rows: Array.from({length: rows}, (_, i) => ({key: `k${i}`, label: 'k', value: 'v'})),
    notes: Array.from({length: notes}, () => 'n'), outputs: Array.from({length: outputs}, () => 'o'), captions: Array.from({length: captions}, () => 'c'),
});
const golden = (...states: ReturnType<typeof state>[]): ParityRecording => ({graph: 'x', language: 'sl', states});

const goldenFile = (demonstration: string): ParityRecording | undefined => {
    const graphs = path.resolve(__dirname, '../..');
    const file = (fs.readdirSync(graphs, {recursive: true}) as string[]).map(name => name.replace(/\\/g, '/'))
        .find(name => name.endsWith(`__parity__/${demonstration}.golden.json`));
    return file ? JSON.parse(fs.readFileSync(path.join(graphs, file), 'utf8')) as ParityRecording : undefined;
};

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

    test('a golden file with rows, notes or outputs in any state is not empty; captions alone are', () => {
        expect(goldenShowsNothing(golden(state(0, 0, 0, 3), state(0)))).toBe(true);
        expect(goldenShowsNothing(golden(state(0), state(1)))).toBe(false);
        expect(goldenShowsNothing(golden(state(0), state(0, 1)))).toBe(false);
        expect(goldenShowsNothing(golden(state(0), state(0, 0, 1)))).toBe(false);
        expect(goldenShowsNothing(undefined)).toBe(false);
    });

    test('not applicable needs an empty golden file and an empty declaration in every scene', () => {
        const empty = golden(state(0), state(0, 0, 0, 2));
        const shows = {...base, notes: [{id: 'n'}]} as unknown as GraphDeclaration;
        expect(parityNotApplicable(empty, [base, base])).toBe(true);
        expect(parityNotApplicable(empty, [base, shows]), 'a later scene declares a note').toBe(false);
        expect(parityNotApplicable(golden(state(1)), [base, base]), 'the golden file shows a row').toBe(false);
        expect(parityNotApplicable(undefined, [base]), 'no golden file').toBe(false);
        expect(parityNotApplicable(empty, [undefined]), 'undeclared').toBe(false);
        expect(parityNotApplicable(empty, [])).toBe(false);
    });

    test.skipIf(!id)('the graph under check shows no values (BEZEG_PARITY_NA=<id>)', async () => {
        const recorded = await recordParityWithDeclarations(id as string, createGraph(id as DemonstrationId), candidateStates(id as DemonstrationId));
        expect(parityNotApplicable(goldenFile(id as string), recorded.declarations),
            `${id}: its golden file or a declaration (default or lesson scene) shows values or sentences: record parity`).toBe(true);
    });
});
