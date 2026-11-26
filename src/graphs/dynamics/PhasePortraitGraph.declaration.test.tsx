import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {PhasePortraitGraph, type PhasePortraitIds} from './PhasePortraitGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type FormattedValue, type GraphDeclaration, type ReadoutRow} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage, type Message, type MessageNumber} from '../../localization';
import {GraphPalette} from '../styles/GraphPalette';
import {currentWrite} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Write = [key: string, value: unknown];

/** Mounts a real graph on a real (jsdom) board and applies lesson writes, one per step, through the arbiter. */
function setup(...writes: Write[]) {
    const graph = new PhasePortraitGraph();
    const {view} = mountGraph(graph);
    for (const [key, value] of writes) act(() => { graph.parameters!.write(key, value, 'lesson'); });
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<PhasePortraitIds>};
}

const text = (value: MessageNumber | Message | FormattedValue): string =>
    !('kind' in value) ? renderMessage(value) : value.kind === 'formatted' ? value.text : formatNumber(value.value, 'sl', value.maxDecimals);
const readout = (id: string) => normalise(document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? '');
const rowsOf = (declaration: GraphDeclaration<PhasePortraitIds>): ReadoutRow<PhasePortraitIds>[] => (declaration.readouts ?? []).flatMap(group => [...group.rows]);

const states: {name: string; writes: Write[]; system: string}[] = [
    {name: 'default', writes: [], system: 'linear'},
    {name: 'unstable spiral, two seeds', writes: [['phase-a', 1], ['phase-b', -2], ['phase-c', 2], ['phase-d', 1], ['phase-seed-count', 2]], system: 'linear'},
    {name: 'saddle at time 3', writes: [['phase-a', 2], ['phase-b', 0], ['phase-c', 0], ['phase-d', -1], ['phase-time', 3]], system: 'linear'},
    {name: 'pendulum hanging', writes: [['phase-system', 'pendulum']], system: 'pendulum'},
    {name: 'pendulum upright, zoomed, three seeds', writes: [['phase-system', 'pendulum'], ['phase-equilibrium', 1], ['phase-zoom', 3], ['phase-seed-count', 3]], system: 'pendulum'},
    {name: 'weak spiral at time 10', writes: [['phase-system', 'weak-spiral'], ['phase-time', 10]], system: 'weak-spiral'},
];

/** The values the declaration shows for the rows whose sentence moved to the readout help, per state (from the model: H = -cos(1), the view is the centre +- the zoom's half-width, ...). */
const SHORTENED = /^(view|decision|ring|ring-linear|seed-\d|energy-\d)$/;
const EXPECTED_SHORT: Record<string, Record<string, string>> = {
    'default': {view: 'x ∈ [−4; 4], y ∈ [−4; 4]', 'seed-1': '(1; 0): naprej 10 s; nazaj 0,34 s, rob'},
    'unstable spiral, two seeds': {view: 'x ∈ [−4; 4], y ∈ [−4; 4]', 'seed-1': '(1; 0): naprej 1,44 s, rob; nazaj 10 s', 'seed-2': '(0; 1): naprej 1,44 s, rob; nazaj 10 s'},
    'saddle at time 3': {view: 'x ∈ [−4; 4], y ∈ [−4; 4]', 'seed-1': '(1; 0): naprej 0,7 s, rob; nazaj 10 s'},
    'pendulum hanging': {decision: 'ne določa portreta', view: 'x ∈ [−4; 4], y ∈ [−4; 4]', 'seed-1': '(1; 0): naprej 10 s; nazaj 10 s', 'energy-1': 'H = −0,540302: nihanje',
        ring: '12 trajektorij, ustavljenih polovic 20 od 24', 'ring-linear': '12 trajektorij, ustavljenih polovic 0 od 24'},
    'pendulum upright, zoomed, three seeds': {decision: 'določa portret', view: 'x ∈ [2,6416; 3,6416], y ∈ [−0,5; 0,5]',
        'seed-1': '(1; 0): naprej 0 s, rob; nazaj 0 s, rob', 'energy-1': 'H = −0,540302: nihanje', 'seed-2': '(0; 1): naprej 0 s, rob; nazaj 0 s, rob', 'energy-2': 'H = −0,5: nihanje',
        'seed-3': '(−1; 0): naprej 0 s, rob; nazaj 0 s, rob', 'energy-3': 'H = −0,540302: nihanje',
        ring: '12 trajektorij, ustavljenih polovic 24 od 24', 'ring-linear': '12 trajektorij, ustavljenih polovic 24 od 24'},
    'weak spiral at time 10': {decision: 'ne določa portreta', view: 'x ∈ [−4; 4], y ∈ [−4; 4]', 'seed-1': '(1; 0): naprej 10 s; nazaj 0,48 s, rob',
        ring: '12 trajektorij, ustavljenih polovic 12 od 24', 'ring-linear': '12 trajektorij, ustavljenih polovic 0 od 24'},
};

describe('Phase portrait declaration', () => {
    for (const {name, writes, system} of states) {
        test(`${name}: consistent, bound, drawn and equal to the inspector`, () => {
            const {graph, declaration} = setup(...writes);
            const current = declaration();

            expect(checkDeclaration(current, graph.getPreviewGeometry() !== undefined)).toEqual([]);
            for (const parameter of current.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);

            // the legend resolves to drawn objects whose visibility matches the board
            const eigen = rowsOf(current).find(row => row.id === 'eigen')!;
            const hasEigenLines = !/\(dvojna, vse smeri/.test(text(eigen.value)) && !text(eigen.value).includes('±');
            const expectedVisible: Partial<Record<PhasePortraitIds['legend'], boolean>> = {
                trajectories: true, frame: true, equilibrium: true,
                ring: system !== 'linear', 'ring-linear': system !== 'linear', separatrix: system === 'pendulum', columns: system === 'linear', eigen: hasEigenLines,
            };
            for (const entry of current.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                if (entry.id in expectedVisible) expect(drawn!.visible, entry.id).toBe(expectedVisible[entry.id]);
            }
            expect(graph.drawnObject('trajectories')!.color).toBe(GraphPalette.primaryCurve);
            expect(graph.drawnObject('ring')!.color).toBe(GraphPalette.comparisonCurve);
            expect(graph.drawnObject('seeds')!.color).toBe(GraphPalette.controlPoint);
            expect(graph.drawnObject('columns')!.color).toBe(GraphPalette.comparisonCurve);

            // every readout row shows what the inspector shows
            const rows = rowsOf(current);
            expect(rows.length).toBeGreaterThanOrEqual(11);
            // (rows whose sentence the declaration moved to its readout help show a shorter value than the panel's sentence)
            const exact = Object.fromEntries(rows.filter(row => SHORTENED.test(row.id)).map(row => [row.id, normalise(text(row.value))]));
            expect(exact).toEqual(Object.fromEntries(Object.entries(EXPECTED_SHORT[name]).map(([id, value]) => [id, normalise(value)])));
            for (const row of rows) {
                const declared = normalise(`${text(row.value)} ${row.unit ? renderMessage(row.unit) : ''}`);
                if (SHORTENED.test(row.id)) expect(declared.length, row.id).toBeLessThan(readout(row.id).length);
                else expect(declared, row.id).toBe(readout(row.id));
            }
            // and no inspector row is missing from the declaration
            const shown = [...document.querySelectorAll('[data-readout]:not([data-readout-live])')].map(element => element.getAttribute('data-readout'));
            expect(rows.map(row => row.id)).toEqual(shown);

            // the controls the panel hides are absent (no locked puck); the Jacobian stays a readout row
            const byKey = Object.fromEntries((current.parameters ?? []).map(parameter => [parameter.key, parameter]));
            for (const key of ['phase-a', 'phase-b', 'phase-c', 'phase-d']) expect(key in byKey, key).toBe(system === 'linear');
            expect('phase-equilibrium' in byKey).toBe(system === 'pendulum');
            expect((current.parameters ?? []).filter(parameter => 'locked' in parameter && parameter.locked)).toEqual([]);
            expect(rows.map(row => row.id)).toContain('jacobian');
            expect(byKey['phase-seed-count']).toMatchObject({placement: 'tools', section: 'seeds'});
            expect(byKey['phase-time']).toMatchObject({kind: 'range', min: 0, max: 10, placement: 'board'});
        });
    }

    test('reading the declaration and the drawn objects does not recompute or redraw', () => {
        const {graph} = setup(['phase-system', 'pendulum']);
        const internals = graph as unknown as {derivations: number};
        const before = internals.derivations;
        for (let round = 0; round < 3; round++) {
            graph.getDeclaration();
            for (const id of ['trajectories', 'moving', 'ring', 'ring-linear', 'eigen', 'separatrix', 'wrap', 'frame', 'equilibrium', 'seeds', 'columns']) graph.drawnObject(id);
        }
        expect(internals.derivations).toBe(before);
    });

    test('performAction runs playback as the learner and refuses an unknown action', () => {
        const sources: string[] = [];
        class Probe extends PhasePortraitGraph {
            override play() { sources.push(`play:${currentWrite()?.source}`); }
            override resetTime() { sources.push(`reset:${currentWrite()?.source}`); super.resetTime(); }
        }
        const graph = new Probe();
        mountGraph(graph);
        const actions = () => (graph.getDeclaration() as GraphDeclaration<PhasePortraitIds>).actions!;
        expect(actions().find(action => action.id === 'reset-time')!.enabled).toBe(false);
        act(() => { graph.parameters!.write('phase-time', 2, 'lesson'); });
        expect(actions().find(action => action.id === 'reset-time')!.enabled).toBe(true);
        act(() => graph.performAction('play-pause'));
        act(() => graph.performAction('reset-time'));
        expect(readout('time')).toBe('0 s');
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
        expect(sources).toEqual(['play:learner', 'reset:learner']);
    });

    test('the system choice lists the three systems and the equilibrium choice its two points', () => {
        const {declaration} = setup(['phase-system', 'pendulum']);
        const choices = Object.fromEntries(declaration().parameters!.filter(parameter => parameter.kind === 'choice').map(parameter => [parameter.key, parameter.kind === 'choice' ? parameter.options.map(option => option.value) : []]));
        expect(choices).toEqual({'phase-system': ['linear', 'pendulum', 'weak-spiral'], 'phase-equilibrium': ['0', '1']});
    });
});
