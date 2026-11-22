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
    {file: 'compgeo/__parity__/triangle-centres.json', demonstration: 'triangle-centres', states: [
        state('default', {}),
        {name: 'obtuse example', apply: graph => { runAs('learner', () => (graph as unknown as {loadExample(id: string): void}).loadExample('obtuse')); }},
        {name: 'right example', apply: graph => { runAs('learner', () => (graph as unknown as {loadExample(id: string): void}).loadExample('right')); }},
        {name: 'degenerate example', apply: graph => { runAs('learner', () => (graph as unknown as {loadExample(id: string): void}).loadExample('degenerate')); }},
        {name: 'scalene acute', apply: graph => { runAs('learner', () => (graph as unknown as {loadModel(model: unknown): void}).loadModel({mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 5, y: 1}, {x: 1, y: 4}]})); }},
        {name: 'two points', apply: graph => { runAs('learner', () => (graph as unknown as {loadModel(model: unknown): void}).loadModel({mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 5, y: 1}]})); }},
        // Centres stay inside the initial view: whether a centre is outside the view is board state, which a declaration cannot hold.
        {name: 'obtuse custom', apply: graph => { runAs('learner', () => (graph as unknown as {loadModel(model: unknown): void}).loadModel({mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 7, y: 0}, {x: 3, y: 3}]})); }},
    ]},
    {file: 'projective/__parity__/projective-cross-ratio.json', demonstration: 'projective-cross-ratio', states: [
        state('default', {}),
        {name: 'harmonic', apply: graph => { runAs('learner', () => (graph as unknown as {loadExample(id: string): void}).loadExample('harmonic')); }},
        {name: 'image at infinity', apply: graph => { runAs('learner', () => (graph as unknown as {loadExample(id: string): void}).loadExample('infinity')); }},
        {name: 'point D moved', apply: graph => { runAs('learner', () => { (graph as unknown as {loadExample(id: string): void}).loadExample('default'); (graph as unknown as {moveHandleTo(h: number, x: number, y: number): void}).moveHandleTo(3, 6, 0); }); }},
        {name: 'centre and N moved', apply: graph => { runAs('learner', () => { const g = graph as unknown as {moveHandleTo(h: number, x: number, y: number): void}; g.moveHandleTo(4, 3, 6); g.moveHandleTo(6, 4, 1); }); }},
        {name: 'centre on the first line', apply: graph => { runAs('learner', () => (graph as unknown as {moveHandleTo(h: number, x: number, y: number): void}).moveHandleTo(4, 2, 0)); }},
        {name: 'two points coincide', apply: graph => { runAs('learner', () => { const g = graph as unknown as {moveHandleTo(h: number, x: number, y: number): void}; g.moveHandleTo(4, 0, 5); g.moveHandleTo(1, 0, 0); }); }},
        {name: 'second line degenerate', apply: graph => { runAs('learner', () => { const g = graph as unknown as {loadExample(id: string): void; moveHandleTo(h: number, x: number, y: number): void}; g.loadExample('harmonic'); g.moveHandleTo(6, 0, 1); }); }},
    ]},
    {file: 'patches/__parity__/patch-coons.json', demonstration: 'patch-coons', states: (() => {
        type Coons = {selectBoundaryPoint(name: string, index: number): void; setSelectedCoordinates(xyz: [number, number, number]): void; setLinkedCorners(linked: boolean): void};
        const move = (name: string, index: number, xyz: [number, number, number]) => (graph: unknown) => runAs('learner', () => {
            (graph as Coons).selectBoundaryPoint(name, index);
            (graph as Coons).setSelectedCoordinates(xyz);
        });
        const step = (name: string, apply: (graph: unknown) => void): ParityState => ({name, apply: graph => apply(graph)});
        return [
            state('default', {}),
            step('inner point raised', move('c0', 1, [1, 0, 1.5])),
            step('linked corner moved', move('c0', 0, [0.2, 0.1, 0.3])),
            step('corners unlinked, one corner apart', graph => { runAs('learner', () => (graph as Coons).setLinkedCorners(false)); move('d0', 0, [-0.5, 0.5, 0.9])(graph); }),
            step('far corner raised, still unlinked', move('d1', 3, [3, 3, 1])),
            step('corners linked again, inner point moved', graph => { runAs('learner', () => (graph as Coons).setLinkedCorners(true)); move('c1', 1, [1.5, 3.4, -1])(graph); }),
        ];
    })()},
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

// Named by the recording's id (not `$file`, which vitest truncates) so `just graph-check <id>` can filter to it.
describe.each(SAMPLES.map(sample => [path.basename(sample.file, '.json'), sample] as const))('parity recording %s', (_id, sample) => {
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

    test("a control's read-off is covered by the declared parameter with that symbol, and missing without it", () => {
        const rec: ParityRecording = {graph: 'fake', language: 'sl', states: [{name: 's', rows: [], notes: [], outputs: ['t = 0,50'], captions: []}]};
        const withT: GraphDeclaration = {parameters: [{key: 't', kind: 'range', label: message('animation_parameter'), symbol: 't', placement: 'board', min: 0, max: 1, step: 0.01}]};
        const withS: GraphDeclaration = {parameters: [{key: 's', kind: 'range', label: message('animation_parameter'), symbol: 's', placement: 'board', min: 0, max: 1, step: 0.01}]};
        expect(checkParity(rec, [withT]).differences).toEqual([]);
        expect(checkParity(rec, [withS]).differences).toEqual([{state: 0, stateName: 's', kind: 'missing', where: 'output', recorded: 't = 0,50'}]);
    });
});
