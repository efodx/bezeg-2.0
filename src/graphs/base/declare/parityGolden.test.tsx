/**
 * Golden panel values (task 08 step 3). For every demonstration in a lane of `08-partition.json`, the default state and each
 * step of each lesson on it (scene applied synchronously) are recorded with the parity recorder's panel walk, identical
 * outputs dropped, at most MAX_STATES kept, into `<graph dir>/__parity__/<id>.golden.json`. A lane's own hand-written
 * `<id>.json` recording is a different file.
 *
 *   BEZEG_PARITY_GOLDEN_RECORD=1 just unit src/graphs/base/declare/parityGolden.test.tsx   (all; BEZEG_PARITY_GOLDEN_ID="<id> <id>" for some)
 *   BEZEG_PARITY_GOLDEN_CHECK=1  just unit src/graphs/base/declare/parityGolden.test.tsx   (compares the panels with the files)
 *
 * Both are skipped by default. Check mode runs the demonstrations that have a golden file.
 */
import fs from 'fs';
import path from 'path';
import type {DemonstrationId} from '../../../demonstrations';
import {installBoardShims} from '../realGraphTestHarness';
import {createGraph} from '../createTestGraph';
import {candidateStates} from './goldenStates';
import {normalise, type ParityRecording, recordParity} from './parity';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: 600_000});

const MAX_STATES = 12;

const recordMode = !!process.env.BEZEG_PARITY_GOLDEN_RECORD;
const checkMode = !!process.env.BEZEG_PARITY_GOLDEN_CHECK;
/** One id, or several separated by spaces. */
const only = process.env.BEZEG_PARITY_GOLDEN_ID?.split(' ').filter(Boolean);

const srcRoot = path.resolve(__dirname, '../../..');
const partition = JSON.parse(fs.readFileSync(path.resolve(srcRoot, '../docs/reviews/ux-picks-app-wide/inventory/08-partition.json'), 'utf8')) as
    {declared?: string[]; lanes: {demonstrations: string[]; graphFiles: string[]}[]; done?: {demonstrations: string[]}[]};

/** The directory (under src) a demonstration's golden file goes to: that of the lane graph file named most like it. */
function goldenDir(id: string, graphFiles: string[]): string {
    const flat = id.replace(/-/g, '').toLowerCase();
    const named = graphFiles.find(file => path.basename(file, '.tsx').toLowerCase().replace(/graph\d*$/, '') === flat)
        ?? graphFiles.find(file => path.basename(file).toLowerCase().includes(flat));
    return path.join(srcRoot, path.dirname(named ?? graphFiles[0]), '__parity__');
}

const goldenFilesOf = (id: string): string[] => (fs.readdirSync(path.join(srcRoot, 'graphs'), {recursive: true}) as string[])
    .map(file => file.replace(/\\/g, '/')).filter(file => file.endsWith(`__parity__/${id}.golden.json`)).map(file => path.join(srcRoot, 'graphs', file));

const shown = (state: ParityRecording['states'][number]) => JSON.stringify([state.rows, state.notes, state.outputs, state.captions]);

/** Records the candidates, drops states whose outputs equal an earlier one, then keeps at most MAX_STATES spread evenly. */
async function recordGolden(id: DemonstrationId): Promise<ParityRecording> {
    const raw = await recordParity(id, createGraph(id), candidateStates(id));
    const seen = new Set<string>();
    const unique = raw.states.filter(state => {
        const key = shown(state);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    const kept = unique.length <= MAX_STATES ? unique
        : Array.from({length: MAX_STATES}, (_, i) => unique[Math.round(i * (unique.length - 1) / (MAX_STATES - 1))]);
    return {...raw, states: kept};
}

const text = (recording: ParityRecording) => `${JSON.stringify(recording, null, 2)}\n`;

/** A readable difference of two recordings: per state and per field, what was recorded and what is shown now. */
function differences(golden: ParityRecording, now: ParityRecording): string {
    const lines: string[] = [];
    const names = golden.states.map(state => state.name);
    for (const state of now.states) if (!names.includes(state.name)) lines.push(`state "${state.name}": new, not in the golden file`);
    for (const state of golden.states) {
        const current = now.states.find(candidate => candidate.name === state.name);
        if (!current) { lines.push(`state "${state.name}": not reached now (identical to an earlier state or lesson changed)`); continue; }
        const note = (what: string, recorded: unknown, shownNow: unknown) => { if (JSON.stringify(recorded) !== JSON.stringify(shownNow)) lines.push(`state "${state.name}" ${what}: golden ${JSON.stringify(recorded)} now ${JSON.stringify(shownNow)}`); };
        for (const row of state.rows) {
            const same = current.rows.find(candidate => candidate.key === row.key);
            if (!same) lines.push(`state "${state.name}" row ${row.key}: golden ${JSON.stringify(row.value)} now missing`);
            else if (normalise(same.value) !== normalise(row.value)) lines.push(`state "${state.name}" row ${row.key}: golden ${JSON.stringify(row.value)} now ${JSON.stringify(same.value)}`);
        }
        for (const row of current.rows) if (!state.rows.some(candidate => candidate.key === row.key)) lines.push(`state "${state.name}" row ${row.key}: new ${JSON.stringify(row.value)}`);
        note('notes', state.notes, current.notes);
        note('outputs', state.outputs, current.outputs);
        note('captions', state.captions, current.captions);
    }
    return lines.join('\n');
}

const ids = partition.lanes.flatMap(lane => lane.demonstrations.map(id => ({id: id as DemonstrationId, graphFiles: lane.graphFiles})))
    .filter(entry => !only || only.includes(entry.id));
/** Lanes already carried out leave `lanes` for `done`: their golden files are still checked (there are no graph files to record from). */
const doneIds = [...(partition.done ?? []).flatMap(lane => lane.demonstrations), ...(partition.declared ?? [])]
    .filter((id, index, all) => all.indexOf(id) === index && !ids.some(entry => entry.id === id))
    .map(id => ({id: id as DemonstrationId}))
    .filter(entry => !only || only.includes(entry.id));

describe.skipIf(!recordMode)('golden record (BEZEG_PARITY_GOLDEN_RECORD=1)', () => {
    test.each(ids.map(entry => [entry.id, entry] as const))('golden recording %s', async (_id, entry) => {
        const first = await recordGolden(entry.id);
        const second = await recordGolden(entry.id);
        expect(text(second), `${entry.id} records deterministically`).toBe(text(first));
        const target = path.join(goldenDir(entry.id, entry.graphFiles), `${entry.id}.golden.json`);
        fs.mkdirSync(path.dirname(target), {recursive: true});
        fs.writeFileSync(target, text(first));
        console.log(`golden ${entry.id}: ${first.states.length} states (${target})`);
    });
});

describe.skipIf(!checkMode)('golden check (BEZEG_PARITY_GOLDEN_CHECK=1)', () => {
    const withFile = [...ids, ...doneIds].filter(entry => goldenFilesOf(entry.id).length > 0);
    test('at least one golden file is checked', () => {
        expect(withFile.length).toBeGreaterThan(0);
    });
    test.each(withFile.map(entry => [entry.id, entry] as const))('golden panels %s', async (_id, entry) => {
        const [file] = goldenFilesOf(entry.id);
        const golden = JSON.parse(fs.readFileSync(file, 'utf8')) as ParityRecording;
        const now = await recordParity(entry.id, createGraph(entry.id), candidateStates(entry.id));
        // Only the states the golden file names are compared: dedupe and the cap chose them from this same candidate list.
        const wanted = new Set(golden.states.map(state => state.name));
        const comparable: ParityRecording = {...now, states: now.states.filter(state => wanted.has(state.name))};
        const difference = differences(golden, comparable);
        if (difference) throw new Error(`${entry.id}: panels differ from ${path.relative(srcRoot, file)}\n${difference}`);
    });
});
