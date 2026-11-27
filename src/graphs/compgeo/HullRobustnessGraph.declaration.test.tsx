import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {HullRobustnessGraph, type HullRobustnessIds} from './HullRobustnessGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';
import {KETTNER_SIZE} from './hullRobustnessReadout';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: HullRobustnessGraph) => graph.getDeclaration() as GraphDeclaration<HullRobustnessIds>;
const action = (graph: HullRobustnessGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;
const learner = (change: () => void) => runAs('learner', change);
const toEnd = (graph: HullRobustnessGraph) => { while (graph.step < graph.run().length - 1) learner(() => graph.nextStep()); };

const CHAIN_STATES: readonly {name: string; apply(graph: HullRobustnessGraph): void}[] = [
    {name: 'default', apply: () => {}},
    {name: 'step 4', apply: graph => { for (let i = 0; i < 4; i++) learner(() => graph.nextStep()); }},
    {name: 'end, drop', apply: toEnd},
    {name: 'end, keep collinear', apply: graph => { learner(() => graph.setPopRule('right')); toEnd(graph); }},
    {name: 'end, keep collinear and all copies', apply: graph => { learner(() => { graph.setPopRule('right'); graph.setDuplicateRule('keep'); }); toEnd(graph); }},
];

const KETTNER_STATES: readonly {name: string; apply(graph: HullRobustnessGraph): void}[] = [
    {name: 'inexact, default cell', apply: () => {}},
    {name: 'exact', apply: graph => learner(() => graph.setKettnerPanel('exact'))},
    {name: 'another cell', apply: graph => learner(() => graph.selectKettnerCell(3, 4))},
];

const panelNotes = (container: HTMLElement) => [...container.querySelectorAll('[data-readout-note]')]
    .map(element => normalise(element.textContent ?? '')).filter(text => text !== '');
const declaredNotes = (declaration: GraphDeclaration<HullRobustnessIds>) => declaration.notes!.map(note => normalise(renderMessage(note.text)));

describe('hull robustness declaration, chain view', () => {
    test.each(CHAIN_STATES)('$name: consistent, marks follow the points, notes equal the panel', ({apply}) => {
        const graph = new HullRobustnessGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters).toBeUndefined();
        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})));
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'trace', 'hull']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
        expect(declaredNotes(declaration)).toEqual(panelNotes(view.container));
    });

    test('the rule and the duplicates are choice pucks; the algorithm is not offered', () => {
        const graph = new HullRobustnessGraph();
        mountGraph(graph);
        const ids = declare(graph).actions!.map(candidate => candidate.id);
        expect(ids).toEqual(expect.arrayContaining(['trace', 'hull', 'non-left', 'right', 'merge', 'keep', 'next-step', 'play', 'reset']));
        expect(ids).not.toContain('monotone-chain');
        for (const id of ['non-left', 'right', 'merge', 'keep']) {
            const puck = action(graph, id);
            expect(puck, id).toMatchObject({placement: 'board', puck: {group: {help: expect.anything()}}});
            const short = (puck.puck as {short: Parameters<typeof renderMessage>[0]}).short;
            expect(renderMessage(short).length, id).toBeLessThanOrEqual(16);
        }
        expect([action(graph, 'non-left').pressed, action(graph, 'right').pressed]).toEqual([true, false]);
        expect([action(graph, 'merge').pressed, action(graph, 'keep').pressed]).toEqual([true, false]);

        act(() => graph.performAction('right'));
        expect(graph.popRule).toBe('right');
        expect([action(graph, 'non-left').pressed, action(graph, 'right').pressed]).toEqual([false, true]);
        act(() => graph.performAction('keep'));
        expect(graph.duplicateRule).toBe('keep');
        expect([action(graph, 'merge').pressed, action(graph, 'keep').pressed]).toEqual([false, true]);
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('a rule change returns the trace to its start', () => {
        const graph = new HullRobustnessGraph();
        mountGraph(graph);
        act(() => toEnd(graph));
        expect(graph.step).toBeGreaterThan(0);
        act(() => graph.performAction('right'));
        expect(graph.step).toBe(0);
    });

    test('the hull the collinear rule keeps is called out as a repeat once the copies are all kept', () => {
        const graph = new HullRobustnessGraph();
        mountGraph(graph);
        expect(declare(graph).notes!.map(note => note.id)).toContain('output-pending');
        act(() => { learner(() => { graph.setPopRule('right'); graph.setDuplicateRule('keep'); }); toEnd(graph); });
        const ids = declare(graph).notes!.map(note => note.id);
        expect(ids).toContain('output');
        expect(ids).not.toContain('output-pending');
    });
});

describe('hull robustness declaration, Kettner view', () => {
    const kettner = (graph: HullRobustnessGraph) => learner(() => graph.setRobustnessMode('kettner'));

    test.each(KETTNER_STATES)('$name: the map stays in view, the panel is a two-segment puck, notes equal the panel', ({apply}) => {
        const graph = new HullRobustnessGraph();
        const {view} = mountGraph(graph);
        act(() => { kettner(graph); apply(graph); });
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.marks!.must).toEqual([{kind: 'box', left: 0, top: KETTNER_SIZE, right: KETTNER_SIZE, bottom: 0}]);
        expect(declaration.legend).toBeUndefined();
        expect(declaration.actions!.map(candidate => candidate.id)).toEqual(['inexact', 'exact']);
        expect(declaredNotes(declaration)).toEqual(panelNotes(view.container));
        expect(declaration.notes!.map(note => note.id)).toEqual(['cell-title', 'cell-exact', 'cell-naive-sign', 'cell-naive-value', 'cell-verdict', 'counts-text']);
    });

    test('the pressed segment follows the panel', () => {
        const graph = new HullRobustnessGraph();
        mountGraph(graph);
        act(() => kettner(graph));
        expect([action(graph, 'inexact').pressed, action(graph, 'exact').pressed]).toEqual([true, false]);
        act(() => graph.performAction('exact'));
        expect(graph.kettnerPanel).toBe('exact');
        expect([action(graph, 'inexact').pressed, action(graph, 'exact').pressed]).toEqual([false, true]);
        act(() => graph.performAction('inexact'));
        expect(graph.kettnerPanel).toBe('inexact');
    });
});
