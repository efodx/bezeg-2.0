/**
 * Parity recordings (task 02, slice 4): the sampled states of the graphs whose inspector panels tasks 04 to 08 remove, the
 * checker's seeded failures, and the declaration-against-recording report of every graph that already declares.
 * `BEZEG_PARITY_RECORD=1 just unit src/graphs/base/declare/parity.test.tsx` rewrites the `__parity__` files.
 */
import fs from 'fs';
import path from 'path';
import type {DemonstrationId} from '../../../demonstrations';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../realGraphTestHarness';
import {createGraph} from '../createTestGraph';
import {runAs} from '../writes/writeSource';
import {message, messageNumber} from '../../../localization';
import type {GraphDeclaration} from './graphDeclaration';
import {checkParity, describeDifferences, normalise, type ParityRecording, type ParityState, recordParityWithDeclarations} from './parity';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

/** A learner write of one key; a refused write fails the recording rather than recording a stale state. */
const set = (graph: {parameters?: {write(key: string, value: unknown, source: 'learner'): {status: string}}}, writes: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(writes)) {
        const result = graph.parameters!.write(key, value, 'learner');
        if (result.status !== 'applied') throw new Error(`Write ${key}=${String(value)} was ${JSON.stringify(result)}`);
    }
};
const state = (name: string, writes: Record<string, unknown>): ParityState => ({name, apply: graph => set(graph as never, writes)});

interface Sample {
    readonly file: string;
    readonly demonstration: DemonstrationId;
    readonly states: readonly ParityState[];
}

const SAMPLES: readonly Sample[] = [
    {file: 'functions/__parity__/taylor.json', demonstration: 'taylor', states: [
        state('default', {}),
        state('degree 3, x 1,5', {'taylor-degree': 3, 'taylor-x': 1.5}),
        state('centre 1, degree 6', {'taylor-center': 1, 'taylor-degree': 6}),
        {name: 'bound shown', apply: graph => { runAs('learner', () => (graph as unknown as {setBoundVisible(v: boolean): void}).setBoundVisible(true)); }},
        state('sine, degree 5, x 2', {'taylor-example': 'sine', 'taylor-center': 0, 'taylor-degree': 5, 'taylor-x': 2}),
        state('geometric inside', {'taylor-example': 'geometric', 'taylor-center': 0, 'taylor-degree': 4, 'taylor-x': 0.5}),
        state('geometric outside', {'taylor-center': 0.5, 'taylor-x': -0.5}),
        state('flat', {'taylor-example': 'flat', 'taylor-center': 0, 'taylor-degree': 2, 'taylor-x': 1}),
    ]},
    {file: 'functions/__parity__/function-transformation.json', demonstration: 'function-transformation', states: [
        state('default', {}),
        state('stretch and shift', {'transform-a': 1.5, 'transform-b': 2, 'transform-c': -1, 'transform-d': 0.5}),
        state('point u 1', {'transform-u': 1}),
        state('reflected, compressed', {'transform-a': -1, 'transform-b': 0.5, 'transform-c': 2, 'transform-d': -2}),
        state('sqrt', {'transform-base': 'sqrt', 'transform-u': 4}),
        state('reciprocal', {'transform-base': 'reciprocal', 'transform-u': 2}),
        state('abs', {'transform-base': 'abs', 'transform-u': -3}),
    ]},
    {file: 'curves/bezier/__parity__/decasteljau.json', demonstration: 'decasteljau', states: [
        state('default', {}),
        state('t 0', {'decasteljau-t': 0}),
        state('t 0,25', {'decasteljau-t': 0.25}),
        state('t 0,8', {'decasteljau-t': 0.8}),
        state('t 1', {'decasteljau-t': 1}),
    ]},
    {file: 'linear/__parity__/linear-map-basis.json', demonstration: 'linear-map', states: [
        state('basis default', {'linear-map-mode': 'basis'}),
        state('shear', {'linear-map-example': 'shear'}),
        state('quarter turn', {'linear-map-example': 'quarter-turn'}),
        state('reflection', {'linear-map-example': 'reflection-x'}),
        state('scalar 2', {'linear-map-example': 'scalar-2'}),
        state('entry a12 = 2', {'linear-map-a12': 2}),
        state('entry a21 = -1', {'linear-map-a21': -1}),
        state('singular', {'linear-map-example': 'singular'}),
    ]},
    {file: 'linear/__parity__/linear-map-determinant.json', demonstration: 'linear-map', states: [
        state('determinant identity', {'linear-map-mode': 'determinant', 'linear-map-example': 'identity'}),
        state('scalar 2', {'linear-map-example': 'scalar-2'}),
        state('orientation reversing', {'linear-map-example': 'orientation-reversing'}),
        state('singular', {'linear-map-example': 'singular'}),
        state('shear', {'linear-map-example': 'shear'}),
        state('entry a11 = 3', {'linear-map-a11': 3}),
        state('entry a22 = -2', {'linear-map-a22': -2}),
    ]},
    {file: 'dynamics/__parity__/phase-portrait.json', demonstration: 'phase-portrait', states: [
        state('default', {}),
        state('spiral entries', {'phase-a': 1, 'phase-b': -2, 'phase-c': 2, 'phase-d': 1}),
        state('centre entries', {'phase-a': 0, 'phase-b': 1, 'phase-c': -1, 'phase-d': 0}),
        state('saddle entries', {'phase-a': 2, 'phase-b': 0, 'phase-c': 0, 'phase-d': -1}),
        state('time 3', {'phase-time': 3}),
        state('zoom 2', {'phase-zoom': 2}),
        state('three seeds', {'phase-seed-count': 3}),
        state('pendulum', {'phase-system': 'pendulum'}),
        state('weak spiral', {'phase-system': 'weak-spiral'}),
    ]},
];

const root = path.resolve(__dirname, '../..');
const record = async (sample: Sample) => recordParityWithDeclarations(path.basename(sample.file, '.json'), createGraph(sample.demonstration), sample.states);
const text = (recording: ParityRecording) => `${JSON.stringify(recording, null, 2)}\n`;

describe.each(SAMPLES)('parity recording $file', sample => {
    test('records deterministically and every state changes a shown value', async () => {
        const first = (await record(sample)).recording;
        const second = (await record(sample)).recording;
        expect(text(second)).toBe(text(first));
        const shown = (s: ParityRecording['states'][number]) => JSON.stringify([s.rows, s.notes, s.outputs, s.captions]);
        first.states.slice(1).forEach((s, i) => expect(shown(s), `state ${i + 1} (${s.name}) shows what ${first.states[i].name} showed`).not.toBe(shown(first.states[i])));
        if (process.env.BEZEG_PARITY_RECORD) {
            const target = path.join(root, sample.file);
            fs.mkdirSync(path.dirname(target), {recursive: true});
            fs.writeFileSync(target, text(first));
        }
    });

    test.skipIf(!process.env.BEZEG_PARITY_CHECK && !process.env.BEZEG_PARITY_REPORT)('the graph declaration reproduces the recording (BEZEG_PARITY_CHECK=1; graphs without a declaration are skipped)', async () => {
        const {declarations} = await record(sample);
        if (declarations.every(declaration => declaration === undefined)) return;
        const target = path.join(root, sample.file);
        if (!fs.existsSync(target)) return;
        const report = checkParity(JSON.parse(fs.readFileSync(target, 'utf8')), declarations);
        if (process.env.BEZEG_PARITY_REPORT) fs.writeFileSync(path.join(root, `${sample.file}.report.txt`), `${describeDifferences(report)}\ncaptions not covered: ${report.uncoveredCaptions.length}\n`);
        expect(describeDifferences(report)).toBe('');
    });
});

describe('checker on a fake declaration', () => {
    const recording: ParityRecording = {graph: 'fake', language: 'sl', states: [
        {name: 'one', rows: [{key: 'Napaka#0', label: 'Napaka', value: '0,7183'}, {key: 'Točka#0', label: 'Točka', value: '(2; 4)'}],
            notes: ['Ocena je skrita.'], outputs: [], captions: []},
    ]};
    const declared = (overrides: Partial<{error: number; withPoint: boolean; extra: boolean}> = {}): GraphDeclaration => ({
        readouts: [{id: 'g', rows: [
            {id: 'error', name: message('taylor_readout_signed_error'), value: messageNumber(overrides.error ?? 0.7183, 4)},
            ...(overrides.withPoint === false ? [] : [{id: 'point', name: message('taylor_readout_polynomial'), value: message('taylor_hidden')}]),
            ...(overrides.extra ? [{id: 'more', name: message('taylor_readout_bound'), value: messageNumber(1)}] : []),
        ]}],
        notes: [{id: 'n', text: message('taylor_hidden')}],
    });

    test('a matching declaration has no differences, whitespace and minus aside', () => {
        const rec: ParityRecording = {graph: 'fake', language: 'sl', states: [{name: 's', rows: [{key: 'x#0', label: 'x', value: '-0,5'}], notes: ['skrito'], outputs: [], captions: []}]};
        const declaration: GraphDeclaration = {readouts: [{id: 'g', rows: [{id: 'a', name: message('taylor_readout_signed_error'), symbol: 'x', value: messageNumber(-0.5, 4)}]}], notes: [{id: 'n', text: message('taylor_hidden')}]};
        expect(checkParity(rec, [declaration]).differences).toEqual([]);
        expect(normalise('−0,5  s')).toBe('-0,5 s');
    });

    test('seeded failures: a changed value, a missing row, an extra row, a missing state', () => {
        const changed = checkParity(recording, [declared({error: 0.7184})]);
        const missing = checkParity(recording, [declared({withPoint: false})]);
        const extra = checkParity(recording, [declared({extra: true})]);
        const none = checkParity(recording, []);
        // Observed (see the report): rows are matched by label, so labels that differ from the recording show as missing + extra.
        expect(changed.differences.length).toBeGreaterThan(0);
        expect(missing.differences.some(d => d.kind === 'missing')).toBe(true);
        expect(extra.differences.some(d => d.kind === 'extra')).toBe(true);
        expect(none.differences).toEqual([{state: 0, stateName: 'one', kind: 'missing', where: 'declaration', recorded: 'one'}]);
    });

    test('a changed value is reported as different with both values', () => {
        const rec: ParityRecording = {graph: 'fake', language: 'sl', states: [{name: 's', rows: [{key: 'Napaka f(x) - Tₙ(x)#0', label: 'Napaka f(x) - Tₙ(x)', value: '0,7183'}], notes: [], outputs: [], captions: []}]};
        const declaration = (value: number): GraphDeclaration => ({readouts: [{id: 'g', rows: [{id: 'error', name: message('taylor_readout_signed_error'), value: messageNumber(value, 4)}]}]});
        expect(checkParity(rec, [declaration(0.7183)]).differences).toEqual([]);
        const different = checkParity(rec, [declaration(0.7184)]).differences;
        expect(different).toEqual([{state: 0, stateName: 's', kind: 'different', where: 'row Napaka f(x) - Tₙ(x)#0', recorded: '0,7183', declared: '0,7184'}]);
    });
});
