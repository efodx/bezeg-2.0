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

describe('Phase portrait declaration', () => {
    for (const {name, writes, system} of states) {
        test(`${name}: consistent, bound, drawn and equal to the inspector`, () => {
            const {graph, declaration} = setup(...writes);
            const current = declaration();

            expect(checkDeclaration(current)).toEqual([]);
            for (const parameter of current.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);

            // the legend resolves to drawn objects whose visibility matches the board
            const eigen = rowsOf(current).find(row => row.id === 'eigen')!;
            const hasEigenLines = !/\(dvojna; vsaka smer/.test(text(eigen.value)) && !text(eigen.value).includes('±');
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
            for (const row of rows) expect(normalise(`${text(row.value)} ${row.unit ? renderMessage(row.unit) : ''}`), row.id).toBe(readout(row.id));
            // and no inspector row is missing from the declaration
            const shown = [...document.querySelectorAll('[data-readout]:not([data-readout-live])')].map(element => element.getAttribute('data-readout'));
            expect(rows.map(row => row.id)).toEqual(shown);

            // the controls the panel hides are locked, not absent
            const byKey = Object.fromEntries((current.parameters ?? []).map(parameter => [parameter.key, parameter]));
            expect(byKey['phase-a'].locked).toBe(system !== 'linear');
            expect(byKey['phase-equilibrium'].locked).toBe(system !== 'pendulum');
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
        const {declaration} = setup();
        const choices = Object.fromEntries(declaration().parameters!.filter(parameter => parameter.kind === 'choice').map(parameter => [parameter.key, parameter.kind === 'choice' ? parameter.options.map(option => option.value) : []]));
        expect(choices).toEqual({'phase-system': ['linear', 'pendulum', 'weak-spiral'], 'phase-equilibrium': ['0', '1']});
    });
});
