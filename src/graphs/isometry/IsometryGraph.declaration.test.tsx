import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {IsometryGraph, type IsometryIds} from './IsometryGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {setLanguage, renderMessage} from '../../localization';
import {CLASSIFY_EXAMPLES, deriveIsometry, K_MAX, PERIOD_MAX, ROSETTE_N_MAX, type IsometryMode} from '../../isometry/isometryModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: IsometryGraph) => void;

function setup(...steps: Step[]) {
    const graph = new IsometryGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => runAs('learner', () => step(graph)));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<IsometryIds>};
}

const inMode = (mode: IsometryMode): Step => graph => graph.setState({mode});
const states: {name: string; mode: IsometryMode; steps: Step[]; params: string[]; actions: string[]}[] = [
    {name: 'mirrors', mode: 'mirrors', steps: [inMode('mirrors')], params: [], actions: []},
    {name: 'classify, three mirrors', mode: 'classify', steps: [graph => graph.setState({mode: 'classify', ...CLASSIFY_EXAMPLES.glide})], params: ['isometry-length'], actions: []},
    {name: 'similarity, k = 2', mode: 'similarity', steps: [graph => graph.setState({mode: 'similarity', dilationK: 2})], params: ['isometry-k'], actions: []},
    {name: 'rosette, cyclic', mode: 'rosette', steps: [graph => graph.setState({mode: 'rosette', rosetteN: 5, rosetteMirrors: false})], params: ['isometry-n'], actions: ['rosette-mirrors']},
    {name: 'rosette, dihedral', mode: 'rosette', steps: [graph => graph.setState({mode: 'rosette', rosetteN: 3, rosetteMirrors: true})], params: ['isometry-n'], actions: ['rosette-mirrors']},
    {
        name: 'frieze, vertical mirror',
        mode: 'frieze',
        steps: [graph => graph.setState({mode: 'frieze', friezeFeatures: {vertical: true, horizontal: false, halfTurn: false, glide: false}})],
        params: ['isometry-period'],
        actions: ['feature-vertical', 'feature-horizontal', 'feature-halfTurn', 'feature-glide'],
    },
];

describe('Isometries declaration', () => {
    for (const {name, mode, steps, params, actions} of states) {
        test(`${name}: consistent, bound, drawn, and the values of the kernel`, () => {
            const {graph, declaration, view} = setup(...steps);
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);
            expect(graph.state.mode).toBe(mode);

            // only this mode's parameters and pucks are declared; every parameter key is bound
            expect((current.parameters ?? []).map(entry => entry.key)).toEqual(params);
            for (const entry of current.parameters ?? []) expect(graph.parameters!.keys()).toContain(entry.key);
            expect((current.actions ?? []).map(action => action.id)).toEqual(actions);
            for (const action of current.actions ?? []) {
                expect(action).toMatchObject({placement: 'board', puck: true, enabled: true});
                expect(renderMessage(action.label).length).toBeLessThanOrEqual(16);
            }

            // the rows are the old panel's rows, and the values come from the kernel
            const derived = deriveIsometry(graph.state);
            const rows = current.readouts![0].rows;
            expect(rows.map(row => row.id)).toEqual(graph.readoutRows().map(row => row.id));
            const valueOf = (id: string) => graph.readoutRows().find(row => row.id === id)?.value;
            if (derived.mode === 'rosette') {
                expect(valueOf('order')).toBe(String(derived.order));
                expect(derived.order).toBe(graph.state.rosetteMirrors ? 2 * graph.state.rosetteN : graph.state.rosetteN);
                expect(valueOf('distinct')).toBe(String(derived.distinct));
            }
            if (derived.mode === 'frieze' && derived.status !== 'reducesPeriod') expect(valueOf('copies')).toBe(String(derived.copiesPerPeriod));
            if (derived.mode === 'similarity') expect(valueOf('isometry')).toBe(derived.isometry ? 'da' : 'ne');
            expect(renderMessage(current.notes!.find(note => note.id === 'status')!.text)).toBe(graph.statusText());

            // the legend resolves to drawn, visible objects
            expect((current.legend ?? []).length).toBeGreaterThan(0);
            for (const entry of current.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                expect(drawn!.visible, entry.id).toBe(true);
            }
            expect(current.marks?.must?.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('bound parameters write, read back and refuse', () => {
        const {graph, view} = setup(inMode('similarity'));
        act(() => { graph.parameters!.write('isometry-k', 2, 'learner'); });
        expect(graph.parameters!.read('isometry-k')).toBe(2);
        expect(graph.state.dilationK).toBe(2);
        // the ratio clamps to its range, as the slider does; the counts refuse a value out of range
        act(() => { graph.parameters!.write('isometry-k', 1000, 'learner'); });
        expect(graph.parameters!.read('isometry-k')).toBe(K_MAX);
        act(() => { graph.parameters!.write('isometry-n', 4, 'learner'); });
        expect(graph.state.rosetteN).toBe(4);
        act(() => { graph.parameters!.write('isometry-n', 99, 'learner'); });
        expect(graph.state.rosetteN).toBe(ROSETTE_N_MAX);
        act(() => { graph.parameters!.write('isometry-n', Number.NaN, 'learner'); });
        expect(graph.state.rosetteN).toBe(ROSETTE_N_MAX);
        act(() => { graph.parameters!.write('isometry-length', 3, 'learner'); });
        expect(graph.state.motionLength).toBe(3);
        act(() => { graph.parameters!.write('isometry-period', 6, 'learner'); });
        expect(graph.parameters!.read('isometry-period')).toBe(6);
        act(() => { graph.parameters!.write('isometry-period', 99, 'learner'); });
        expect(graph.parameters!.read('isometry-period')).toBe(PERIOD_MAX);
        view.unmount();
    });

    test('a switch puck runs as the learner and shows pressed', () => {
        const {graph, declaration, view} = setup(inMode('rosette'));
        const before = graph.state.rosetteMirrors;
        act(() => graph.performAction('rosette-mirrors'));
        expect(graph.state.rosetteMirrors).toBe(!before);
        expect(declaration().actions![0].pressed).toBe(graph.state.rosetteMirrors);
        expect(() => graph.performAction('nothing-here')).toThrow();
        view.unmount();
    });
});
